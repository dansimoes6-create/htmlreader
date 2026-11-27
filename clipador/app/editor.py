"""Editor: corta em pé (9:16), põe legenda palavra a palavra e título no topo."""
from __future__ import annotations

from pathlib import Path

from . import util

W, H = 1080, 1920
FONT = "Inter"


def _ass_color(hex_color: str) -> str:
    h = (hex_color or "#FF6B2C").lstrip("#")
    if len(h) != 6:
        h = "FF6B2C"
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H00{b}{g}{r}".upper()


def _ass_time(t: float) -> str:
    t = max(0.0, t)
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def _esc(text: str) -> str:
    return text.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", " ")


def build_ass(words: list[dict], clip_start: float, clip_end: float, settings: dict, title: str = "",
              layout: str = "blur") -> str:
    """Legenda estilo shorts: blocos de N palavras, palavra falada em destaque."""
    per = max(1, int(settings.get("subtitle_words", 3)))
    hi = _ass_color(settings.get("subtitle_color", "#FF6B2C"))
    pos = float(settings.get("subtitle_position", 0.72))
    if layout == "split":
        pos = 640 / H  # na emenda entre facecam e jogo
    margin_v = int(H * (1 - pos))
    lines = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "WrapStyle: 0",
        "ScaledBorderAndShadow: yes", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, "
        "Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, "
        "MarginL, MarginR, MarginV, Encoding",
        f"Style: Cap,{FONT} Black,92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,7,3,2,"
        f"60,60,{margin_v},1",
        f"Style: Title,{FONT} Black,66,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,3,18,0,8,"
        "70,70,170,1",
        "", "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    if title and settings.get("title_overlay", True):
        lines.append(f"Dialogue: 1,{_ass_time(0.1)},{_ass_time(min(4.0, clip_end - clip_start))},Title,,0,0,0,,"
                     f"{{\\fad(150,250)\\3c&H00000000&\\1c&H00FFFFFF&}}{_esc(title.upper())}")
    ws = [w for w in words if w["end"] > clip_start and w["start"] < clip_end]
    groups = [ws[i:i + per] for i in range(0, len(ws), per)]
    for gi, g in enumerate(groups):
        g_end = groups[gi + 1][0]["start"] if gi + 1 < len(groups) else g[-1]["end"] + 0.3
        g_end = min(g_end, g[-1]["end"] + 0.8)
        for wi, w in enumerate(g):
            a = w["start"] - clip_start
            b = (g[wi + 1]["start"] if wi + 1 < len(g) else g_end) - clip_start
            if b <= a:
                b = a + 0.05
            parts = []
            for wj, x in enumerate(g):
                t = _esc(x["word"].upper())
                if wj == wi:
                    parts.append(f"{{\\1c{hi}\\fscx108\\fscy108}}{t}{{\\1c&H00FFFFFF&\\fscx100\\fscy100}}")
                else:
                    parts.append(t)
            pop = "{\\fscx92\\fscy92\\t(0,80,\\fscx100\\fscy100)}" if wi == 0 else ""
            lines.append(f"Dialogue: 0,{_ass_time(a)},{_ass_time(b)},Cap,,0,0,0,,{pop}{' '.join(parts)}")
    return "\n".join(lines) + "\n"


def _filter_for(layout: str, src_w: int, src_h: int, facecam: dict) -> str:
    vertical = src_h > src_w
    if vertical or layout == "fit":
        return (f"[0:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
                f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[v]")
    if layout == "crop":
        return f"[0:v]scale=-2:{H},crop={W}:{H},setsar=1[v]"
    if layout == "split":
        fx, fy = float(facecam.get("x", 0)), float(facecam.get("y", 0))
        fw, fh = float(facecam.get("w", 0.28)), float(facecam.get("h", 0.3))
        top_h, bot_h = 640, H - 640
        return (f"[0:v]split[c][g];"
                f"[c]crop=iw*{fw:.4f}:ih*{fh:.4f}:iw*{fx:.4f}:ih*{fy:.4f},"
                f"scale={W}:{top_h}:force_original_aspect_ratio=increase,crop={W}:{top_h}[cam];"
                f"[g]scale=-2:{bot_h},crop={W}:{bot_h}[game];"
                f"[cam][game]vstack,setsar=1[v]")
    # blur (padrão): vídeo inteiro no meio com fundo desfocado
    return (f"[0:v]split[a][b];"
            f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
            f"scale=270:480,gblur=sigma=12,scale={W}:{H},eq=brightness=-0.12[bg];"
            f"[b]scale={W}:-2[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]")


def render(src: str, start: float, end: float, out_path: Path, layout: str, settings: dict,
           words: list[dict] | None = None, title: str = "") -> dict:
    """Renderiza o corte vertical. `words` usa tempos relativos ao arquivo `src`."""
    info = util.probe(src)
    if not info["has_video"]:
        raise util.CommandError("arquivo sem vídeo")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    dur = max(1.0, end - start)
    vf = _filter_for(layout, info["width"], info["height"], settings.get("facecam") or {})
    ass_path = out_path.with_suffix(".ass")
    sub_words = (words or []) if settings.get("subtitles", True) else []
    show_title = title if settings.get("title_overlay", True) else ""
    if sub_words or show_title:
        ass_path.write_text(build_ass(sub_words, start, end, settings, show_title, layout), encoding="utf-8")
        esc = str(ass_path).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
        vf = vf.replace("[v]", "[pre]") + f";[pre]ass='{esc}'[v]"
    cmd = ["ffmpeg", "-v", "error", "-y", "-nostdin", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", src,
           "-filter_complex", vf, "-map", "[v]"]
    if info["has_audio"]:
        cmd += ["-map", "0:a:0", "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=11"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", str(int(settings.get("video_crf", 21))),
            "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", str(out_path)]
    util.run(cmd, timeout=1800)
    thumb = out_path.with_suffix(".jpg")
    util.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{min(dur / 2, 3):.2f}", "-i", str(out_path),
              "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "4", str(thumb)], timeout=120, check=False)
    return {"path": out_path, "thumb": thumb if thumb.exists() else None, "duration": dur}

