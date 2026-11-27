"""Utilidades de mídia: ffprobe, execução de comandos, detecção de ferramentas."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path


class CommandError(RuntimeError):
    pass


def run(cmd: list[str], timeout: float | None = None, check: bool = True) -> subprocess.CompletedProcess:
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if check and p.returncode != 0:
        tail = (p.stderr or p.stdout or "").strip().splitlines()[-6:]
        raise CommandError(f"{Path(cmd[0]).name} falhou ({p.returncode}): " + " | ".join(tail))
    return p


def probe(path: str | Path) -> dict:
    p = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
            timeout=60)
    data = json.loads(p.stdout or "{}")
    v = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)
    dur = float(data.get("format", {}).get("duration") or 0)
    w = int(v.get("width", 0)) if v else 0
    h = int(v.get("height", 0)) if v else 0
    rot = 0
    if v:
        for sd in v.get("side_data_list", []) or []:
            if "rotation" in sd:
                rot = int(sd["rotation"])
        rot = int((v.get("tags") or {}).get("rotate", rot))
    if abs(rot) in (90, 270):
        w, h = h, w
    return {"duration": dur, "width": w, "height": h, "has_video": v is not None, "has_audio": a is not None}


def tools_status() -> dict:
    def has_py(mod: str) -> bool:
        try:
            __import__(mod)
            return True
        except Exception:
            return False
    return {
        "ffmpeg": bool(shutil.which("ffmpeg")),
        "ffprobe": bool(shutil.which("ffprobe")),
        "yt_dlp": bool(shutil.which("yt-dlp")) or has_py("yt_dlp"),
        "streamlink": bool(shutil.which("streamlink")),
        "whisper": has_py("faster_whisper"),
        "anthropic": has_py("anthropic"),
    }


def cookies_file() -> Path | None:
    """cookies.txt opcional (YouTube às vezes pede login em servidores)."""
    from . import config
    p = config.DATA_DIR / "cookies.txt"
    return p if p.exists() and p.stat().st_size > 0 else None


def ytdlp_cmd() -> list[str]:
    exe = shutil.which("yt-dlp")
    cmd = [exe] if exe else ["python3", "-m", "yt_dlp"]
    ck = cookies_file()
    if ck:
        cmd += ["--cookies", str(ck)]
    return cmd


def safe_name(text: str, maxlen: int = 60) -> str:
    text = re.sub(r"[^\w\-]+", "_", text or "", flags=re.UNICODE).strip("_")
    return (text or "x")[:maxlen]


def fmt_time(sec: float) -> str:
    sec = max(0, int(sec))
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"
