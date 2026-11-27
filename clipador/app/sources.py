"""De onde vêm os vídeos: YouTube (vídeos novos e lives), Twitch e Kick (lives), links avulsos."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from . import util


def detect_platform(url: str) -> str:
    host = urlparse(normalize_url(url)).netloc.lower()
    if "youtube.com" in host or "youtu.be" in host:
        return "youtube"
    if "twitch.tv" in host:
        return "twitch"
    if "kick.com" in host:
        return "kick"
    return "other"


def normalize_url(url: str) -> str:
    url = (url or "").strip()
    if url.startswith("@"):
        return f"https://www.youtube.com/{url}"
    if not re.match(r"^https?://", url):
        url = "https://" + url
    return url.rstrip("/")


def normalize_channel_url(url: str) -> str:
    """Reduz o link à raiz do canal (tira /videos, /live, /streams...)."""
    url = normalize_url(url)
    p = urlparse(url)
    platform = detect_platform(url)
    parts = [x for x in p.path.split("/") if x]
    if platform == "youtube":
        if parts and (parts[0].startswith("@") or parts[0] in ("channel", "c", "user")):
            keep = parts[:1] if parts[0].startswith("@") else parts[:2]
            return f"https://www.youtube.com/{'/'.join(keep)}"
        return url
    if platform in ("twitch", "kick") and parts:
        return f"https://{'www.twitch.tv' if platform == 'twitch' else 'kick.com'}/{parts[0].lower()}"
    return url


def is_channel_url(url: str) -> bool:
    """True para link de canal; False para link de um vídeo específico."""
    url = normalize_url(url)
    platform = detect_platform(url)
    parts = [x for x in urlparse(url).path.split("/") if x]
    if platform == "youtube":
        if "watch" in url or "youtu.be" in url or "/shorts/" in url:
            return False
        return bool(parts) and (parts[0].startswith("@") or parts[0] in ("channel", "c", "user"))
    if platform == "twitch":
        return len(parts) == 1 and parts[0] not in ("videos",)
    if platform == "kick":
        return len(parts) == 1
    return False


def channel_display_name(url: str) -> str:
    parts = [x for x in urlparse(normalize_url(url)).path.split("/") if x]
    return parts[-1].lstrip("@") if parts else url


# ---------------------------------------------------------------- YouTube
def youtube_latest_videos(channel_url: str, limit: int = 5) -> list[dict]:
    """Últimos vídeos publicados (id, título, url). Ignora lives em andamento e agendadas."""
    p = util.run([*util.ytdlp_cmd(), "--flat-playlist", "--playlist-end", str(limit), "-J",
                  channel_url.rstrip("/") + "/videos"], timeout=120)
    data = json.loads(p.stdout or "{}")
    out = []
    for e in data.get("entries") or []:
        if not e or not e.get("id"):
            continue
        if e.get("live_status") in ("is_live", "is_upcoming"):
            continue
        out.append({"id": e["id"], "title": e.get("title") or e["id"],
                    "url": f"https://www.youtube.com/watch?v={e['id']}"})
    return out


# ---------------------------------------------------------------- lives
def live_info(channel_url: str, platform: str) -> dict | None:
    """Retorna {'title', 'url'} se o canal estiver ao vivo agora; senão None."""
    target = channel_url.rstrip("/") + "/live" if platform == "youtube" else channel_url
    if shutil.which("streamlink"):
        p = util.run(["streamlink", "--json", target], timeout=60, check=False)
        try:
            data = json.loads(p.stdout or "{}")
        except json.JSONDecodeError:
            data = {}
        if data.get("streams"):
            meta = data.get("metadata") or {}
            title = meta.get("title") or ""
            if platform == "twitch" and title.upper().startswith("RERUN"):
                return None  # reprise não é live
            return {"title": title or channel_display_name(channel_url), "url": target}
        if platform != "youtube":
            return None
    p = util.run([*util.ytdlp_cmd(), "-J", "--no-warnings", "--skip-download", target], timeout=90, check=False)
    if p.returncode != 0:
        return None
    try:
        data = json.loads(p.stdout)
    except json.JSONDecodeError:
        return None
    if data.get("is_live") or data.get("live_status") == "is_live":
        return {"title": data.get("title") or channel_display_name(channel_url),
                "url": data.get("webpage_url") or target}
    return None


def open_live_stream(url: str, quality: str = "best") -> subprocess.Popen:
    """Abre o fluxo ao vivo e devolve um processo que escreve MPEG-TS no stdout."""
    if shutil.which("streamlink"):
        q = quality if quality == "best" else f"{quality},best"
        cmd = ["streamlink", "--stdout", "--loglevel", "warning",
               "--hls-live-restart", url, q]
    else:
        fmt = "best" if quality == "best" else f"best[height<={re.sub(r'[^0-9]', '', quality) or 1080}]/best"
        cmd = [*util.ytdlp_cmd(), "-q", "-f", fmt, "-o", "-", url]
    return subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def open_vod_stream(url: str, quality: str = "best") -> subprocess.Popen:
    """VOD em fluxo contínuo (MPEG-TS no stdout) para cortar enquanto baixa."""
    h = re.sub(r"[^0-9]", "", quality) if quality != "best" else ""
    fmt = f"best[height<={h}]/best" if h else "best"
    cmd = [*util.ytdlp_cmd(), "-q", "--no-warnings", "--no-playlist", "-f", fmt, "-o", "-", url]
    return subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


# ---------------------------------------------------------------- downloads
def fetch_title(url: str) -> str:
    p = util.run([*util.ytdlp_cmd(), "--no-warnings", "--skip-download", "--print", "%(title)s", url],
                 timeout=90, check=False)
    return (p.stdout or "").strip().splitlines()[0] if p.returncode == 0 and p.stdout.strip() else url


def download_video(url: str, out_dir: Path, max_height: int = 1080) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    fmt = (f"bv*[height<={max_height}][vcodec^=avc1]+ba[acodec^=mp4a]/"
           f"bv*[height<={max_height}]+ba/b[height<={max_height}]/b")
    util.run([*util.ytdlp_cmd(), "--no-warnings", "--no-playlist", "-f", fmt, "--merge-output-format", "mp4",
              "-o", str(out_dir / "video.%(ext)s"), url], timeout=6 * 3600)
    files = sorted(out_dir.glob("video.*"), key=lambda f: f.stat().st_size, reverse=True)
    files = [f for f in files if f.suffix not in (".part", ".ytdl")]
    if not files:
        raise util.CommandError("download terminou sem arquivo")
    return files[0]


def split_into_blocks(path: Path, out_dir: Path, block_seconds: int) -> list[Path]:
    """Divide um vídeo em blocos de N segundos sem reencodar."""
    out_dir.mkdir(parents=True, exist_ok=True)
    util.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-map", "0:v:0?", "-map", "0:a:0?", "-c", "copy",
              "-f", "segment", "-segment_time", str(block_seconds), "-reset_timestamps", "1",
              "-segment_format", "mpegts", str(out_dir / "block_%04d.ts")], timeout=3600)
    return sorted(out_dir.glob("block_*.ts"))
