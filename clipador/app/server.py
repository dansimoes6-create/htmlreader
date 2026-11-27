"""API HTTP + painel web."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from . import config, db, engine, pipeline, publisher, scorer, sources, util

NO_AUTH = os.environ.get("CLIPADOR_NO_AUTH") == "1"
COOKIE = "clipador_session"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init()
    if os.environ.get("CLIPADOR_NO_ENGINE") != "1":
        engine.start()
    yield
    engine.stop()


app = FastAPI(title="Clipador", lifespan=lifespan)


# ------------------------------------------------------------------ auth
def _hash(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()


def _user_from(request: Request) -> dict | None:
    if NO_AUTH:
        return {"id": 0, "username": "admin"}
    tok = request.cookies.get(COOKIE) or request.headers.get("x-session", "")
    if not tok:
        return None
    return db.one("SELECT u.id, u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?", (tok,))


PUBLIC = ("/api/auth/", "/api/health")


@app.middleware("http")
async def auth_mw(request: Request, call_next):
    path = request.url.path
    needs = path.startswith("/api/") or path.startswith("/media/")
    if needs and not path.startswith(PUBLIC) and not _user_from(request):
        return JSONResponse({"detail": "não autenticado"}, status_code=401)
    return await call_next(request)


class Credentials(BaseModel):
    username: str
    password: str


def _login_response(user_id: int) -> JSONResponse:
    tok = secrets.token_urlsafe(32)
    db.insert("sessions", token=tok, user_id=user_id, created_at=time.time())
    resp = JSONResponse({"ok": True})
    resp.set_cookie(COOKIE, tok, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 60)
    return resp


@app.get("/api/auth/state")
def auth_state(request: Request):
    has_users = bool(db.one("SELECT id FROM users LIMIT 1"))
    user = _user_from(request)
    return {"has_account": has_users or NO_AUTH, "user": user["username"] if user else None}


@app.post("/api/auth/register")
def register(c: Credentials):
    if db.one("SELECT id FROM users LIMIT 1"):
        raise HTTPException(403, "a conta já foi criada; faça login")
    if len(c.username.strip()) < 3 or len(c.password) < 6:
        raise HTTPException(400, "usuário com 3+ letras e senha com 6+ caracteres")
    salt = secrets.token_hex(16)
    uid = db.insert("users", username=c.username.strip(), password_hash=_hash(c.password, salt), salt=salt,
                    created_at=time.time())
    return _login_response(uid)


@app.post("/api/auth/login")
def login(c: Credentials):
    u = db.one("SELECT * FROM users WHERE username=?", (c.username.strip(),))
    if not u or not hmac.compare_digest(u["password_hash"], _hash(c.password, u["salt"])):
        time.sleep(0.5)
        raise HTTPException(401, "usuário ou senha incorretos")
    return _login_response(u["id"])


@app.post("/api/auth/logout")
def logout(request: Request):
    db.run("DELETE FROM sessions WHERE token=?", (request.cookies.get(COOKIE, ""),))
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(COOKIE)
    return resp


# ------------------------------------------------------------------ helpers
def _media_url(path: str | None) -> str | None:
    if not path:
        return None
    try:
        rel = Path(path).resolve().relative_to(config.DATA_DIR)
    except ValueError:
        return None
    return f"/media/{rel.as_posix()}"


def _clip_out(c: dict) -> dict:
    c = dict(c)
    c["video_url"] = _media_url(c.pop("path", None)) if c.get("status") != "rendering" else None
    c["thumb_url"] = _media_url(c.pop("thumb", None))
    c["reasons"] = json.loads(c["reasons"]) if c.get("reasons") else []
    c["posts"] = db.q("SELECT platform, status, url, error, created_at FROM posts WHERE clip_id=? ORDER BY id",
                      (c["id"],))
    c["duration"] = round(c["end"] - c["start"], 1)
    return c


def _bg(fn, *args, **kwargs):
    def wrap():
        try:
            fn(*args, **kwargs)
        except Exception as e:  # noqa: BLE001
            db.log(f"Erro em tarefa: {e}", "error")
    threading.Thread(target=wrap, daemon=True).start()


# ------------------------------------------------------------------ status
@app.get("/api/health")
def health():
    s = db.get_settings()
    return {"ok": True, "tools": util.tools_status(), "ai": scorer.ai_available(s),
            "platforms": publisher.platforms_enabled(s)}


@app.get("/api/stats")
def stats():
    day = time.time() - 86400
    g = lambda sql, a=(): (db.one(sql, a) or {}).get("n") or 0  # noqa: E731
    return {
        "channels": g("SELECT COUNT(*) n FROM channels"),
        "live_now": g("SELECT COUNT(*) n FROM channels WHERE is_live=1"),
        "blocks_pending": g("SELECT COUNT(*) n FROM blocks WHERE status IN ('pending','processing')"),
        "blocks_done": g("SELECT COUNT(*) n FROM blocks WHERE status='done'"),
        "clips_total": g("SELECT COUNT(*) n FROM clips"),
        "clips_24h": g("SELECT COUNT(*) n FROM clips WHERE created_at>?", (day,)),
        "clips_ready": g("SELECT COUNT(*) n FROM clips WHERE status IN ('ready','approved')"),
        "posted_24h": g("SELECT COUNT(*) n FROM posts WHERE status='done' AND created_at>?", (day,)),
        "hours_watched": round((db.one("SELECT SUM(duration) n FROM blocks WHERE status='done'") or {}).get("n") or 0) / 3600,
        "dead_skipped_hours": round(((db.one("SELECT SUM(duration*dead_ratio) n FROM blocks WHERE status='done'")
                                      or {}).get("n") or 0) / 3600, 2),
        "avg_score": round((db.one("SELECT AVG(score) n FROM clips WHERE score IS NOT NULL") or {}).get("n") or 0, 1),
        "recording": engine.recording_channels(),
    }


@app.get("/api/logs")
def logs(limit: int = 100):
    return db.q("SELECT * FROM logs ORDER BY id DESC LIMIT ?", (min(limit, 500),))


# ------------------------------------------------------------------ canais
class ChannelIn(BaseModel):
    url: str
    name: str | None = None
    min_score: float | None = None
    layout: str | None = None
    auto_post: bool | None = None


class ChannelPatch(BaseModel):
    name: str | None = None
    enabled: bool | None = None
    min_score: float | None = None
    layout: str | None = None
    auto_post: bool | None = None
    clear_min_score: bool = False
    clear_layout: bool = False
    clear_auto_post: bool = False


@app.get("/api/channels")
def list_channels():
    rows = db.q("SELECT * FROM channels ORDER BY id DESC")
    rec = set(engine.recording_channels())
    for r in rows:
        r["recording"] = r["id"] in rec
        r["clips"] = db.one("SELECT COUNT(*) n FROM clips WHERE channel_id=?", (r["id"],))["n"]
        r["posted"] = db.one("SELECT COUNT(DISTINCT p.clip_id) n FROM posts p JOIN clips c ON c.id=p.clip_id "
                             "WHERE c.channel_id=? AND p.status='done'", (r["id"],))["n"]
    return rows


@app.post("/api/channels")
def add_channel(c: ChannelIn):
    platform = sources.detect_platform(c.url)
    if platform == "other":
        raise HTTPException(400, "por enquanto só canais do YouTube, Twitch ou Kick")
    if not sources.is_channel_url(c.url):
        raise HTTPException(400, "isso parece link de um vídeo — use “Cortar um link” para vídeos avulsos")
    url = sources.normalize_channel_url(c.url)
    if db.one("SELECT id FROM channels WHERE url=?", (url,)):
        raise HTTPException(409, "esse canal já está sendo monitorado")
    cid = db.insert("channels", platform=platform, url=url, name=c.name or sources.channel_display_name(url),
                    min_score=c.min_score, layout=c.layout,
                    auto_post=None if c.auto_post is None else int(c.auto_post), created_at=time.time())
    db.log(f"Canal adicionado: {url} ({platform}).")
    ch = db.one("SELECT * FROM channels WHERE id=?", (cid,))
    _bg(engine.check_channel, ch, db.get_settings(), True)
    return ch


@app.patch("/api/channels/{cid}")
def patch_channel(cid: int, p: ChannelPatch):
    fields = {}
    for k in ("name", "min_score", "layout"):
        v = getattr(p, k)
        if v is not None:
            fields[k] = v
    if p.enabled is not None:
        fields["enabled"] = int(p.enabled)
        if not p.enabled:
            engine.stop_recording(cid)
    if p.auto_post is not None:
        fields["auto_post"] = int(p.auto_post)
    if p.clear_min_score:
        fields["min_score"] = None
    if p.clear_layout:
        fields["layout"] = None
    if p.clear_auto_post:
        fields["auto_post"] = None
    db.update("channels", cid, **fields)
    return db.one("SELECT * FROM channels WHERE id=?", (cid,))


@app.delete("/api/channels/{cid}")
def delete_channel(cid: int):
    engine.stop_recording(cid)
    db.run("DELETE FROM seen_videos WHERE channel_id=?", (cid,))
    db.run("DELETE FROM channels WHERE id=?", (cid,))
    return {"ok": True}


@app.post("/api/channels/{cid}/check")
def check_now(cid: int):
    ch = db.one("SELECT * FROM channels WHERE id=?", (cid,))
    if not ch:
        raise HTTPException(404)
    _bg(engine.check_channel, ch, db.get_settings(), True)
    return {"ok": True}


@app.post("/api/channels/{cid}/stop")
def stop_rec(cid: int):
    """Para a gravação e pausa o monitor do canal (senão ele voltaria a gravar na próxima conferida)."""
    db.update("channels", cid, enabled=0)
    return {"ok": engine.stop_recording(cid)}


@app.get("/api/frame")
def frame():
    """Quadro recente de algum bloco — usado para marcar a facecam na tela."""
    for b in db.q("SELECT id, path, duration FROM blocks WHERE path != '' ORDER BY id DESC LIMIT 20"):
        if b["path"] and Path(b["path"]).exists():
            out = config.WORK_DIR / "frame.jpg"
            util.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{min(30, (b['duration'] or 2) / 2):.1f}", "-i", b["path"],
                      "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "4", str(out)], timeout=60, check=False)
            if out.exists():
                return FileResponse(out, headers={"Cache-Control": "no-store"})
    raise HTTPException(404, "ainda não há nenhum vídeo gravado para tirar um quadro")


# ------------------------------------------------------------------ fontes (links avulsos / uploads)
class LinkIn(BaseModel):
    url: str


@app.get("/api/sources")
def list_sources(limit: int = 50):
    rows = db.q("SELECT s.*, c.name AS channel_name FROM sources s LEFT JOIN channels c ON c.id=s.channel_id "
                "ORDER BY s.id DESC LIMIT ?", (limit,))
    for r in rows:
        counts = db.q("SELECT status, COUNT(*) n FROM blocks WHERE source_id=? GROUP BY status", (r["id"],))
        r["blocks"] = {x["status"]: x["n"] for x in counts}
        r["clips"] = db.one("SELECT COUNT(*) n FROM clips WHERE source_id=?", (r["id"],))["n"]
        r.pop("path", None)
    return rows


@app.post("/api/sources")
def add_link(l: LinkIn):
    url = sources.normalize_url(l.url)
    if sources.detect_platform(url) in ("youtube", "twitch", "kick") and sources.is_channel_url(url):
        return {"channel": add_channel(ChannelIn(url=url))}
    sid = db.insert("sources", kind="link", url=url, title=url, status="queued", created_at=time.time(),
                    updated_at=time.time())
    db.log(f"Link na fila: {url}")
    engine.wake()
    return {"source_id": sid}


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    ext = Path(file.filename or "video.mp4").suffix.lower() or ".mp4"
    if ext not in (".mp4", ".mov", ".mkv", ".webm", ".ts", ".flv", ".avi", ".m4v"):
        raise HTTPException(400, "formato de vídeo não suportado")
    sid = db.insert("sources", kind="upload", url=file.filename or "upload", title=file.filename,
                    status="uploading", created_at=time.time(), updated_at=time.time())
    dest = config.RAW_DIR / f"src_{sid}" / f"upload{ext}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        while chunk := await file.read(8 * 1024 * 1024):
            f.write(chunk)
    db.update("sources", sid, path=str(dest), status="queued", updated_at=time.time())
    engine.wake()
    return {"source_id": sid}


@app.delete("/api/sources/{sid}")
def delete_source(sid: int):
    src = db.one("SELECT * FROM sources WHERE id=?", (sid,))
    if not src:
        raise HTTPException(404)
    if src["status"] == "recording" and src.get("channel_id"):
        engine.stop_recording(src["channel_id"])
    engine.cancel_source(sid)
    db.run("UPDATE blocks SET status='skipped' WHERE source_id=? AND status='pending'", (sid,))
    db.update("sources", sid, status="cancelled" if src["status"] in ("queued", "recording", "downloading")
              else src["status"])
    return {"ok": True}


@app.post("/api/sources/{sid}/retry")
def retry_source(sid: int):
    db.update("sources", sid, status="queued", error=None)
    engine.wake()
    return {"ok": True}


# ------------------------------------------------------------------ blocos
@app.get("/api/blocks")
def list_blocks(source_id: int | None = None, limit: int = 100):
    if source_id:
        rows = db.q("SELECT * FROM blocks WHERE source_id=? ORDER BY idx", (source_id,))
    else:
        rows = db.q("SELECT b.*, s.title AS source_title FROM blocks b JOIN sources s ON s.id=b.source_id "
                    "ORDER BY b.id DESC LIMIT ?", (limit,))
    for r in rows:
        r["clips"] = db.one("SELECT COUNT(*) n FROM clips WHERE block_id=?", (r["id"],))["n"]
        r["has_analysis"] = pipeline.analysis_path(r["id"]).exists()
        r.pop("path", None)
    return rows


@app.get("/api/blocks/{bid}/analysis")
def block_analysis(bid: int):
    p = pipeline.analysis_path(bid)
    if not p.exists():
        raise HTTPException(404, "bloco ainda não analisado")
    data = json.loads(p.read_text())
    data["clips"] = db.q("SELECT id, start, end, score, title, status FROM clips WHERE block_id=?", (bid,))
    return data


@app.post("/api/blocks/{bid}/retry")
def retry_block(bid: int):
    db.update("blocks", bid, status="pending", error=None)
    engine.wake()
    return {"ok": True}


# ------------------------------------------------------------------ cortes
class ClipPatch(BaseModel):
    title: str | None = None
    caption: str | None = None
    hashtags: str | None = None


class Rerender(BaseModel):
    start: float | None = None
    end: float | None = None
    layout: str | None = None
    title: str | None = None


class PostIn(BaseModel):
    platforms: list[str] | None = None


@app.get("/api/clips")
def list_clips(status: str | None = None, channel_id: int | None = None, min_score: float | None = None,
               sort: str = "new", limit: int = 60, offset: int = 0):
    where, args = [], []
    if status:
        where.append(f"status IN ({','.join('?' for _ in status.split(','))})")
        args += status.split(",")
    if channel_id:
        where.append("channel_id=?")
        args.append(channel_id)
    if min_score is not None:
        where.append("score>=?")
        args.append(min_score)
    order = "score DESC, id DESC" if sort == "score" else "id DESC"
    sql = "SELECT * FROM clips" + (" WHERE " + " AND ".join(where) if where else "") + \
          f" ORDER BY {order} LIMIT ? OFFSET ?"
    return [_clip_out(c) for c in db.q(sql, (*args, min(limit, 200), offset))]


@app.get("/api/clips/{cid}")
def get_clip(cid: int):
    c = db.one("SELECT * FROM clips WHERE id=?", (cid,))
    if not c:
        raise HTTPException(404)
    out = _clip_out(c)
    b = db.one("SELECT start_offset, duration, path FROM blocks WHERE id=?", (c["block_id"],)) or {}
    out["block_duration"] = b.get("duration")
    out["block_offset"] = b.get("start_offset")
    out["can_rerender"] = bool(b.get("path")) and Path(b["path"]).exists()
    src = db.one("SELECT title, url, kind FROM sources WHERE id=?", (c["source_id"],)) or {}
    out["source"] = src
    return out


@app.patch("/api/clips/{cid}")
def patch_clip(cid: int, p: ClipPatch):
    fields = {k: v for k, v in p.model_dump().items() if v is not None}
    fields["updated_at"] = time.time()
    db.update("clips", cid, **fields)
    return get_clip(cid)


@app.post("/api/clips/{cid}/post")
def post_clip(cid: int, p: PostIn):
    settings = db.get_settings()
    plats = p.platforms or publisher.platforms_enabled(settings)
    if not plats:
        raise HTTPException(400, "nenhuma rede social conectada — configure em Configurações › Postagem")
    db.update("clips", cid, status="approved")
    _bg(publisher.publish, cid, plats)
    return {"ok": True, "platforms": plats}


@app.post("/api/clips/{cid}/reject")
def reject_clip(cid: int):
    db.update("clips", cid, status="rejected", updated_at=time.time())
    return {"ok": True}


@app.post("/api/clips/{cid}/restore")
def restore_clip(cid: int):
    db.update("clips", cid, status="ready", updated_at=time.time())
    return {"ok": True}


@app.post("/api/clips/{cid}/rerender")
def rerender_clip(cid: int, r: Rerender):
    _bg(pipeline.rerender, cid, r.start, r.end, r.layout, r.title)
    return {"ok": True}


@app.delete("/api/clips/{cid}")
def delete_clip(cid: int):
    c = db.one("SELECT * FROM clips WHERE id=?", (cid,))
    if c:
        for p in (c.get("path"), c.get("thumb")):
            if p:
                Path(p).unlink(missing_ok=True)
                Path(p).with_suffix(".ass").unlink(missing_ok=True)
        db.run("DELETE FROM posts WHERE clip_id=?", (cid,))
        db.run("DELETE FROM clips WHERE id=?", (cid,))
    return {"ok": True}


# ------------------------------------------------------------------ configurações
@app.get("/api/settings")
def get_settings():
    s = db.get_settings()
    for k in config.SECRET_KEYS:
        s[k] = "••••••••" if s.get(k) else ""
    s["_env_anthropic"] = bool(os.environ.get("ANTHROPIC_API_KEY"))
    s["_has_cookies"] = util.cookies_file() is not None
    return s


@app.put("/api/settings")
def put_settings(values: dict):
    clean = {}
    for k, v in values.items():
        if k not in config.DEFAULTS:
            continue
        if k in config.SECRET_KEYS and isinstance(v, str) and v.startswith("••"):
            continue  # campo secreto não alterado
        try:
            clean[k] = config.coerce(k, v)
        except (ValueError, TypeError) as e:
            raise HTTPException(400, f"valor inválido para {k}: {e}") from e
    db.save_settings(clean)
    return get_settings()


@app.post("/api/cookies")
async def upload_cookies(file: UploadFile = File(...)):
    data = await file.read()
    if b"# Netscape HTTP Cookie File" not in data[:200] and b"\t" not in data:
        raise HTTPException(400, "envie um cookies.txt no formato Netscape (exportado do navegador)")
    (config.DATA_DIR / "cookies.txt").write_bytes(data)
    return {"ok": True}


@app.delete("/api/cookies")
def delete_cookies():
    (config.DATA_DIR / "cookies.txt").unlink(missing_ok=True)
    return {"ok": True}


@app.post("/api/test-notify")
def test_notify():
    publisher.notify("🔔 Teste do Clipador: notificações funcionando.")
    return {"ok": True}


# ------------------------------------------------------------------ arquivos
@app.get("/media/{path:path}")
def media(path: str):
    full = (config.DATA_DIR / path).resolve()
    if config.DATA_DIR not in full.parents or not full.is_file():
        raise HTTPException(404)
    if full.suffix not in (".mp4", ".jpg"):
        raise HTTPException(404)
    return FileResponse(full)


@app.get("/")
def index():
    return FileResponse(config.WEB_DIR / "index.html")


@app.get("/{name}")
def static_file(name: str):
    p = (config.WEB_DIR / name).resolve()
    if p.parent != config.WEB_DIR or not p.is_file():
        raise HTTPException(404)
    return FileResponse(p)
