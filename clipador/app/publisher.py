"""Postagem automática: TikTok, Instagram Reels e YouTube Shorts (+ aviso no Discord)."""
from __future__ import annotations

import os
import time
from pathlib import Path

import requests

from . import db

TIMEOUT = 60
GRAPH = "https://graph.facebook.com/v21.0"


class PublishError(RuntimeError):
    pass


def _check(r: requests.Response, what: str) -> dict:
    try:
        data = r.json()
    except ValueError:
        data = {}
    if r.status_code >= 400:
        msg = data.get("error") if isinstance(data, dict) else None
        if isinstance(msg, dict):
            msg = msg.get("message") or msg.get("code")
        raise PublishError(f"{what}: HTTP {r.status_code} {msg or r.text[:200]}")
    return data


def platforms_enabled(settings: dict) -> list[str]:
    out = []
    if settings.get("post_tiktok") and (settings.get("tiktok_access_token") or settings.get("tiktok_refresh_token")):
        out.append("tiktok")
    if settings.get("post_instagram") and settings.get("instagram_user_id") and settings.get("instagram_access_token"):
        out.append("instagram")
    if settings.get("post_youtube") and settings.get("youtube_refresh_token"):
        out.append("youtube")
    return out


def caption_for(clip: dict, settings: dict) -> str:
    tags = (clip.get("hashtags") or "").strip()
    default = (settings.get("default_hashtags") or "").strip()
    parts = [clip.get("caption") or clip.get("title") or "", tags, default]
    seen, words = set(), []
    for w in " ".join(p for p in parts if p).split():
        key = w.lower()
        if w.startswith("#") and key in seen:
            continue
        seen.add(key)
        words.append(w)
    return " ".join(words)[:2100]


# ------------------------------------------------------------------ YouTube
def post_youtube(path: Path, clip: dict, settings: dict) -> dict:
    tok = _check(requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": settings["youtube_client_id"], "client_secret": settings["youtube_client_secret"],
        "refresh_token": settings["youtube_refresh_token"], "grant_type": "refresh_token"}, timeout=TIMEOUT),
        "YouTube token")
    access = tok["access_token"]
    size = path.stat().st_size
    title = (clip.get("title") or "Corte")[:90]
    if "#shorts" not in title.lower():
        title = f"{title} #Shorts"[:100]
    meta = {
        "snippet": {"title": title, "description": caption_for(clip, settings),
                    "tags": [t.lstrip("#") for t in (clip.get("hashtags") or "").split() if t][:15],
                    "categoryId": "20"},
        "status": {"privacyStatus": settings.get("youtube_privacy") or "public", "selfDeclaredMadeForKids": False},
    }
    r = requests.post("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
                      json=meta, timeout=TIMEOUT, headers={
                          "Authorization": f"Bearer {access}", "X-Upload-Content-Length": str(size),
                          "X-Upload-Content-Type": "video/mp4"})
    _check(r, "YouTube início do upload")
    loc = r.headers.get("Location")
    if not loc:
        raise PublishError("YouTube não devolveu URL de upload")
    with open(path, "rb") as f:
        r = requests.put(loc, data=f, timeout=600, headers={
            "Authorization": f"Bearer {access}", "Content-Type": "video/mp4", "Content-Length": str(size)})
    data = _check(r, "YouTube upload")
    vid = data.get("id")
    return {"external_id": vid, "url": f"https://youtube.com/shorts/{vid}" if vid else None}


# ------------------------------------------------------------------ TikTok
def _tiktok_token(settings: dict) -> str:
    if settings.get("tiktok_refresh_token") and settings.get("tiktok_client_key"):
        data = _check(requests.post("https://open.tiktokapis.com/v2/oauth/token/", data={
            "client_key": settings["tiktok_client_key"], "client_secret": settings.get("tiktok_client_secret", ""),
            "grant_type": "refresh_token", "refresh_token": settings["tiktok_refresh_token"]},
            headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=TIMEOUT), "TikTok token")
        if data.get("access_token"):
            db.save_settings({"tiktok_access_token": data["access_token"],
                              "tiktok_refresh_token": data.get("refresh_token") or settings["tiktok_refresh_token"]})
            return data["access_token"]
    if settings.get("tiktok_access_token"):
        return settings["tiktok_access_token"]
    raise PublishError("TikTok sem token configurado")


def post_tiktok(path: Path, clip: dict, settings: dict) -> dict:
    token = _tiktok_token(settings)
    size = path.stat().st_size
    if size <= 64 * 1024 * 1024:
        chunk, count = size, 1
    else:
        chunk = 10 * 1024 * 1024
        count = size // chunk
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=UTF-8"}
    body = {
        "post_info": {"title": caption_for(clip, settings)[:2200],
                      "privacy_level": settings.get("tiktok_privacy") or "SELF_ONLY",
                      "disable_duet": False, "disable_comment": False, "disable_stitch": False},
        "source_info": {"source": "FILE_UPLOAD", "video_size": size, "chunk_size": chunk,
                        "total_chunk_count": count},
    }
    data = _check(requests.post("https://open.tiktokapis.com/v2/post/publish/video/init/", json=body,
                                headers=headers, timeout=TIMEOUT), "TikTok início")
    err = (data.get("error") or {})
    if err.get("code") not in (None, "ok"):
        raise PublishError(f"TikTok: {err.get('code')} {err.get('message')}")
    publish_id = data["data"]["publish_id"]
    upload_url = data["data"]["upload_url"]
    with open(path, "rb") as f:
        for i in range(count):
            a = i * chunk
            b = size - 1 if i == count - 1 else a + chunk - 1
            f.seek(a)
            part = f.read(b - a + 1)
            r = requests.put(upload_url, data=part, timeout=600, headers={
                "Content-Type": "video/mp4", "Content-Length": str(len(part)),
                "Content-Range": f"bytes {a}-{b}/{size}"})
            if r.status_code >= 400:
                raise PublishError(f"TikTok upload: HTTP {r.status_code} {r.text[:200]}")
    for _ in range(40):
        time.sleep(6)
        st = _check(requests.post("https://open.tiktokapis.com/v2/post/publish/status/fetch/",
                                  json={"publish_id": publish_id}, headers=headers, timeout=TIMEOUT),
                    "TikTok status")
        status = (st.get("data") or {}).get("status")
        if status == "PUBLISH_COMPLETE":
            ids = (st["data"].get("publicaly_available_post_id") or [])
            return {"external_id": str(ids[0]) if ids else publish_id, "url": None}
        if status == "FAILED":
            raise PublishError(f"TikTok recusou: {(st.get('data') or {}).get('fail_reason')}")
    return {"external_id": publish_id, "url": None}  # ainda processando no TikTok


# ------------------------------------------------------------------ Instagram
def post_instagram(path: Path, clip: dict, settings: dict) -> dict:
    uid, token = settings["instagram_user_id"], settings["instagram_access_token"]
    data = _check(requests.post(f"{GRAPH}/{uid}/media", data={
        "media_type": "REELS", "upload_type": "resumable", "caption": caption_for(clip, settings),
        "share_to_feed": "true", "access_token": token}, timeout=TIMEOUT), "Instagram container")
    cid = data["id"]
    size = path.stat().st_size
    with open(path, "rb") as f:
        r = requests.post(f"https://rupload.facebook.com/ig-api-upload/v21.0/{cid}", data=f, timeout=600,
                          headers={"Authorization": f"OAuth {token}", "offset": "0", "file_size": str(size)})
    _check(r, "Instagram upload")
    for _ in range(60):
        time.sleep(5)
        st = _check(requests.get(f"{GRAPH}/{cid}", params={"fields": "status_code,status", "access_token": token},
                                 timeout=TIMEOUT), "Instagram status")
        if st.get("status_code") == "FINISHED":
            break
        if st.get("status_code") in ("ERROR", "EXPIRED"):
            raise PublishError(f"Instagram falhou ao processar: {st.get('status')}")
    else:
        raise PublishError("Instagram demorou demais para processar o vídeo")
    pub = _check(requests.post(f"{GRAPH}/{uid}/media_publish", data={"creation_id": cid, "access_token": token},
                               timeout=TIMEOUT), "Instagram publicar")
    media_id = pub.get("id")
    link = None
    try:
        link = requests.get(f"{GRAPH}/{media_id}", params={"fields": "permalink", "access_token": token},
                            timeout=TIMEOUT).json().get("permalink")
    except (requests.RequestException, ValueError):
        pass
    return {"external_id": media_id, "url": link}


POSTERS = {"tiktok": post_tiktok, "instagram": post_instagram, "youtube": post_youtube}


def posts_last_24h(platform: str) -> int:
    row = db.one("SELECT COUNT(*) AS n FROM posts WHERE platform=? AND status='done' AND created_at>?",
                 (platform, time.time() - 86400))
    return row["n"] if row else 0


def publish(clip_id: int, platforms: list[str] | None = None) -> list[dict]:
    settings = db.get_settings()
    clip = db.one("SELECT * FROM clips WHERE id=?", (clip_id,))
    if not clip or not clip.get("path") or not Path(clip["path"]).exists():
        raise PublishError("corte sem arquivo renderizado")
    targets = platforms or platforms_enabled(settings)
    results = []
    for plat in targets:
        if plat not in POSTERS:
            continue
        if db.one("SELECT id FROM posts WHERE clip_id=? AND platform=? AND status='done'", (clip_id, plat)):
            continue
        if posts_last_24h(plat) >= int(settings.get("max_posts_per_day", 20)):
            db.log(f"Limite diário de posts no {plat} atingido; corte #{clip_id} ficou na fila.", "warn")
            continue
        post_id = db.insert("posts", clip_id=clip_id, platform=plat, status="sending", created_at=time.time())
        try:
            res = POSTERS[plat](Path(clip["path"]), clip, settings)
            db.update("posts", post_id, status="done", external_id=res.get("external_id"), url=res.get("url"))
            db.log(f"Corte #{clip_id} postado no {plat}.")
            results.append({"platform": plat, "ok": True, **res})
        except (PublishError, requests.RequestException, KeyError) as e:
            db.update("posts", post_id, status="error", error=str(e)[:500])
            db.log(f"Falha ao postar corte #{clip_id} no {plat}: {e}", "error")
            results.append({"platform": plat, "ok": False, "error": str(e)})
    if any(r["ok"] for r in results):
        db.update("clips", clip_id, status="posted", updated_at=time.time())
        notify(f"✅ Corte postado: **{clip.get('title')}** (nota {clip.get('score')}) → "
               + ", ".join(r["platform"] for r in results if r["ok"]), settings)
    return results


def notify(text: str, settings: dict | None = None) -> None:
    settings = settings or db.get_settings()
    hook = (settings.get("discord_webhook") or os.environ.get("DISCORD_WEBHOOK") or "").strip()
    if not hook:
        return
    try:
        requests.post(hook, json={"content": text[:1900]}, timeout=15)
    except requests.RequestException:
        pass
