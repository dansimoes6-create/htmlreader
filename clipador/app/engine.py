"""Motor em segundo plano: monitor de canais, gravador de lives, downloads e fila de processamento."""
from __future__ import annotations

import csv
import shutil
import subprocess
import threading
import time
import traceback
from pathlib import Path

from . import config, db, pipeline, sources, util

_stop = threading.Event()
_recorders: dict[int, "Recorder"] = {}
_rec_lock = threading.Lock()
_wake = threading.Event()


# =================================================================== segmentador
class Segmenter:
    """Recebe um fluxo de vídeo (live ou VOD) e solta um bloco na fila a cada N minutos."""

    def __init__(self, source_id: int, out_dir: Path, block_seconds: int):
        self.source_id = source_id
        self.dir = out_dir
        self.dir.mkdir(parents=True, exist_ok=True)
        self.block_s = block_seconds
        self.seen: set[str] = set()
        self.offset = 0.0
        self.idx = 0

    def run(self, src: subprocess.Popen, stop_event: threading.Event) -> str:
        """Bloqueia até o fluxo acabar (ou ser parado). Devolve o fim do stderr da origem."""
        seg_list = self.dir / "segments.csv"
        ff = subprocess.Popen(
            ["ffmpeg", "-v", "error", "-nostdin", "-i", "pipe:0", "-map", "0:v:0?", "-map", "0:a:0?", "-c", "copy",
             "-f", "segment", "-segment_time", str(self.block_s), "-reset_timestamps", "1",
             "-segment_format", "mpegts", "-segment_list", str(seg_list), "-segment_list_type", "csv",
             str(self.dir / "seg_%04d.ts")],
            stdin=src.stdout, stderr=subprocess.PIPE)
        src.stdout.close()
        try:
            while ff.poll() is None:
                if stop_event.wait(3) or _stop.is_set():
                    src.terminate()
                    try:
                        ff.wait(timeout=30)
                    except subprocess.TimeoutExpired:
                        ff.kill()
                    break
                self.collect(seg_list)
            ff.wait()
            try:
                src.wait(timeout=10)
            except subprocess.TimeoutExpired:
                src.kill()
        finally:
            self.collect(seg_list)
        return (src.stderr.read().decode(errors="ignore") if src.stderr else "")[-300:].strip()

    def collect(self, seg_list: Path) -> None:
        if not seg_list.exists():
            return
        with open(seg_list, newline="") as f:
            rows = list(csv.reader(f))
        for row in rows:
            if not row or row[0] in self.seen:
                continue
            self.seen.add(row[0])
            path = self.dir / row[0]
            try:
                dur = float(row[2]) - float(row[1])
            except (IndexError, ValueError):
                dur = util.probe(path)["duration"] if path.exists() else 0
            if dur < 5 or not path.exists():
                path.unlink(missing_ok=True)
                continue
            db.insert("blocks", source_id=self.source_id, idx=self.idx, path=str(path), start_offset=self.offset,
                      duration=dur, status="pending", created_at=time.time(), updated_at=time.time())
            self.idx += 1
            self.offset += dur
            db.update("sources", self.source_id, duration=self.offset, updated_at=time.time())
            _wake.set()


# =================================================================== gravador de live
class Recorder(threading.Thread):
    """Grava uma live e solta um bloco na fila a cada N minutos, com ela ainda no ar."""

    def __init__(self, channel: dict, live: dict, settings: dict):
        super().__init__(daemon=True, name=f"rec-{channel['id']}")
        self.channel = channel
        self.live = live
        self.settings = settings
        self.stop_event = threading.Event()
        self.source_id = db.insert("sources", channel_id=channel["id"], kind="live", url=live["url"],
                                   title=live.get("title") or channel.get("name"), status="recording",
                                   created_at=time.time(), updated_at=time.time())

    def run(self) -> None:
        ch = self.channel
        block_s = int(self.settings.get("block_minutes", 10)) * 60
        seg = Segmenter(self.source_id, config.RAW_DIR / f"live_{self.source_id}", block_s)
        db.update("channels", ch["id"], status="recording", is_live=1, last_error=None)
        db.log(f"🔴 {ch['name']} está AO VIVO — gravando em blocos de {block_s // 60} min.")
        err = ""
        try:
            src = sources.open_live_stream(self.live["url"], self.settings.get("record_quality", "best"))
            err = seg.run(src, self.stop_event)
        except Exception as e:  # noqa: BLE001
            db.log(f"Erro na gravação de {ch['name']}: {e}", "error")
        finally:
            db.update("sources", self.source_id, status="done", duration=seg.offset, updated_at=time.time())
            db.update("channels", ch["id"], status="idle", is_live=0, last_error=None if seg.idx else (err or None))
            db.log(f"⏹ Gravação de {ch['name']} terminou ({util.fmt_time(seg.offset)}, {seg.idx} bloco(s)).")
            with _rec_lock:
                _recorders.pop(ch["id"], None)
            _wake.set()


def recording_channels() -> list[int]:
    with _rec_lock:
        return list(_recorders)


def stop_recording(channel_id: int) -> bool:
    with _rec_lock:
        rec = _recorders.get(channel_id)
    if rec:
        rec.stop_event.set()
        return True
    return False


# =================================================================== monitor
def check_channel(ch: dict, settings: dict, force: bool = False) -> None:
    now = time.time()
    platform = ch["platform"]
    try:
        if platform == "youtube" and (force or not ch["last_check"]
                                      or now - ch["last_check"] >= settings["youtube_poll_minutes"] * 60):
            db.update("channels", ch["id"], last_check=now)
            videos = sources.youtube_latest_videos(ch["url"], limit=5)
            first = db.one("SELECT COUNT(*) AS n FROM seen_videos WHERE channel_id=?", (ch["id"],))["n"] == 0
            for v in reversed(videos):
                if db.one("SELECT 1 AS x FROM seen_videos WHERE channel_id=? AND video_id=?", (ch["id"], v["id"])):
                    continue
                db.run("INSERT OR IGNORE INTO seen_videos(channel_id, video_id) VALUES(?,?)", (ch["id"], v["id"]))
                if first and v is not videos[0]:
                    continue  # na primeira conferida só o vídeo mais recente entra
                db.insert("sources", channel_id=ch["id"], kind="video", url=v["url"], title=v["title"],
                          external_id=v["id"], status="queued", created_at=now, updated_at=now)
                db.log(f"📺 Vídeo novo em {ch['name']}: “{v['title']}” — na fila.")
                _wake.set()
        wants_live = platform in ("twitch", "kick") or (platform == "youtube" and settings.get("youtube_lives"))
        with _rec_lock:
            recording = ch["id"] in _recorders
        if wants_live and not recording and (force or not ch["last_live_check"]
                                            or now - ch["last_live_check"] >= settings["live_check_minutes"] * 60):
            db.update("channels", ch["id"], last_live_check=now)
            if platform != "youtube":
                db.update("channels", ch["id"], last_check=now)
            live = sources.live_info(ch["url"], platform)
            if live:
                rec = Recorder(ch, live, settings)
                with _rec_lock:
                    _recorders[ch["id"]] = rec
                rec.start()
            else:
                db.update("channels", ch["id"], is_live=0, status="idle")
        db.update("channels", ch["id"], last_error=None)
    except Exception as e:  # noqa: BLE001
        db.update("channels", ch["id"], last_error=str(e)[:300])
        db.log(f"Erro ao conferir {ch['name']}: {e}", "error")


def monitor_loop() -> None:
    last_cleanup = 0.0
    while not _stop.is_set():
        settings = db.get_settings()
        for ch in db.q("SELECT * FROM channels WHERE enabled=1"):
            if _stop.is_set():
                break
            check_channel(ch, settings)
        if time.time() - last_cleanup > 3600:
            cleanup(settings)
            last_cleanup = time.time()
        _stop.wait(15)


def cleanup(settings: dict) -> None:
    hours = float(settings.get("keep_raw_hours", 48))
    if hours <= 0:
        return
    limit = time.time() - hours * 3600
    old = db.q("SELECT id, path FROM blocks WHERE status IN ('done','skipped','error') AND updated_at < ? "
               "AND path != ''", (limit,))
    freed = 0
    for b in old:
        p = Path(b["path"])
        if p.exists():
            freed += p.stat().st_size
            p.unlink(missing_ok=True)
        db.update("blocks", b["id"], path="")
    if freed:
        db.log(f"Limpeza: {freed / 1e9:.2f} GB de blocos brutos antigos apagados.")


# =================================================================== downloads
def download_loop() -> None:
    while not _stop.is_set():
        src = db.one("SELECT * FROM sources WHERE status='queued' ORDER BY id LIMIT 1")
        if not src:
            _stop.wait(5)
            continue
        prepare_source(src)


_streams: dict[int, threading.Event] = {}


def stream_vod(src: dict, settings: dict) -> None:
    """VOD (Twitch/Kick costumam ter horas): baixa em fluxo e cada bloco já entra na fila."""
    sid = src["id"]
    stop = threading.Event()
    _streams[sid] = stop
    try:
        if not src.get("title") or src["title"] == src["url"]:
            db.update("sources", sid, title=sources.fetch_title(src["url"]))
        db.update("sources", sid, status="downloading", updated_at=time.time())
        db.log(f"⬇ Baixando em fluxo “{src.get('title') or src['url']}” — os blocos já vão sendo cortados.")
        block_s = int(settings.get("block_minutes", 10)) * 60
        seg = Segmenter(sid, config.RAW_DIR / f"src_{sid}", block_s)
        proc = sources.open_vod_stream(src["url"], settings.get("record_quality", "best"))
        err = seg.run(proc, stop)
        if stop.is_set():
            db.update("sources", sid, status="cancelled", updated_at=time.time())
        elif seg.idx == 0:
            raise util.CommandError(err or "nenhum vídeo recebido")
        else:
            db.update("sources", sid, status="ready", updated_at=time.time())
            db.log(f"“{src.get('title') or src['url']}” baixado: {seg.idx} bloco(s), {util.fmt_time(seg.offset)}.")
    except Exception as e:  # noqa: BLE001
        db.update("sources", sid, status="error", error=str(e)[:500], updated_at=time.time())
        db.log(f"Falha ao baixar fonte #{sid}: {e}", "error")
    finally:
        _streams.pop(sid, None)


def cancel_source(sid: int) -> None:
    ev = _streams.get(sid)
    if ev:
        ev.set()


def prepare_source(src: dict) -> None:
    settings = db.get_settings()
    sid = src["id"]
    out = config.RAW_DIR / f"src_{sid}"
    if not src.get("path") and sources.detect_platform(src["url"]) in ("twitch", "kick"):
        db.update("sources", sid, status="downloading", updated_at=time.time())
        threading.Thread(target=stream_vod, args=(src, settings), daemon=True, name=f"vod-{sid}").start()
        return
    try:
        if src.get("path") and Path(src["path"]).exists():
            video = Path(src["path"])  # upload
        else:
            db.update("sources", sid, status="downloading", updated_at=time.time())
            db.log(f"⬇ Baixando “{src.get('title') or src['url']}”…")
            if not src.get("title") or src["title"] == src["url"]:
                db.update("sources", sid, title=sources.fetch_title(src["url"]))
            video = sources.download_video(src["url"], out)
        db.update("sources", sid, status="splitting", path=str(video), updated_at=time.time())
        info = util.probe(video)
        block_s = int(settings.get("block_minutes", 10)) * 60
        parts = sources.split_into_blocks(video, out / "blocks", block_s)
        offset = 0.0
        for i, part in enumerate(parts):
            d = util.probe(part)["duration"]
            db.insert("blocks", source_id=sid, idx=i, path=str(part), start_offset=offset, duration=d,
                      status="pending", created_at=time.time(), updated_at=time.time())
            offset += d
        if parts:
            video.unlink(missing_ok=True)  # os blocos já têm tudo
        db.update("sources", sid, status="ready", duration=info["duration"], updated_at=time.time())
        db.log(f"“{db.one('SELECT title FROM sources WHERE id=?', (sid,))['title']}” dividido em {len(parts)} bloco(s).")
        _wake.set()
    except Exception as e:  # noqa: BLE001
        db.update("sources", sid, status="error", error=str(e)[:500], updated_at=time.time())
        db.log(f"Falha ao preparar fonte #{sid}: {e}", "error")
        shutil.rmtree(out / "blocks", ignore_errors=True)


# =================================================================== processamento
def claim_block() -> dict | None:
    with db.transaction() as c:
        row = c.execute("SELECT * FROM blocks WHERE status='pending' ORDER BY created_at, idx LIMIT 1").fetchone()
        if not row:
            return None
        c.execute("UPDATE blocks SET status='processing', updated_at=? WHERE id=?", (time.time(), row["id"]))
        return dict(row)


def worker_loop() -> None:
    while not _stop.is_set():
        block = claim_block()
        if not block:
            _wake.wait(5)
            _wake.clear()
            continue
        try:
            pipeline.process_block(block["id"])
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            db.update("blocks", block["id"], status="error", error=str(e)[:500], updated_at=time.time())
            db.log(f"Falha no bloco #{block['id']}: {e}", "error")


# =================================================================== ciclo de vida
def recover() -> None:
    db.run("DELETE FROM clips WHERE status='rendering' AND block_id IN (SELECT id FROM blocks WHERE status='processing')")
    db.run("UPDATE blocks SET status='pending' WHERE status='processing'")
    # downloads interrompidos: sem blocos volta para a fila; com blocos vira erro (evita duplicar)
    db.run("UPDATE sources SET status='error', error='interrompido por reinício — adicione o link de novo' "
           "WHERE status IN ('downloading','splitting') AND id IN (SELECT DISTINCT source_id FROM blocks)")
    db.run("UPDATE sources SET status='queued' WHERE status IN ('downloading','splitting')")
    db.run("UPDATE sources SET status='done' WHERE status='recording'")
    db.run("UPDATE channels SET status='idle', is_live=0")
    db.run("UPDATE clips SET status='error', error='interrompido' WHERE status='rendering'")


def start() -> None:
    recover()
    workers = max(1, int(db.get_settings().get("workers", 1)))
    threads = [threading.Thread(target=monitor_loop, daemon=True, name="monitor"),
               threading.Thread(target=download_loop, daemon=True, name="download")]
    threads += [threading.Thread(target=worker_loop, daemon=True, name=f"worker-{i}") for i in range(workers)]
    for t in threads:
        t.start()
    db.log(f"Motor iniciado ({workers} processador(es)). Ferramentas: "
           + ", ".join(f"{k}={'ok' if v else 'FALTA'}" for k, v in util.tools_status().items()))


def stop() -> None:
    _stop.set()
    _wake.set()
    with _rec_lock:
        recs = list(_recorders.values())
    for r in recs:
        r.stop_event.set()
    for ev in list(_streams.values()):
        ev.set()
    for r in recs:
        r.join(timeout=40)


def wake() -> None:
    _wake.set()
