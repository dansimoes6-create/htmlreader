"""Pipeline de um bloco: transcreve → detecta → dá nota → corta em pé com legenda → posta."""
from __future__ import annotations

import json
import time
from pathlib import Path

from . import config, db, detector, editor, publisher, scorer, transcribe, util


def _effective(settings: dict, channel: dict | None) -> dict:
    s = dict(settings)
    if channel:
        if channel.get("min_score") is not None:
            s["min_score"] = channel["min_score"]
        if channel.get("layout"):
            s["layout"] = channel["layout"]
        if channel.get("auto_post") is not None:
            s["auto_post"] = bool(channel["auto_post"])
    return s


def transcript_path(block_id: int) -> Path:
    return config.WORK_DIR / f"block_{block_id}_transcript.json"


def analysis_path(block_id: int) -> Path:
    return config.WORK_DIR / f"block_{block_id}_analysis.json"


def process_block(block_id: int) -> None:
    block = db.one("SELECT * FROM blocks WHERE id=?", (block_id,))
    if not block:
        return
    source = db.one("SELECT * FROM sources WHERE id=?", (block["source_id"],)) or {}
    channel = db.one("SELECT * FROM channels WHERE id=?", (source.get("channel_id"),)) if source.get("channel_id") else None
    settings = _effective(db.get_settings(), channel)
    chan_name = (channel or {}).get("name") or source.get("title") or ""
    path = block["path"]
    t0 = time.time()

    if not Path(path).exists():
        raise util.CommandError("arquivo do bloco não existe mais")
    info = util.probe(path)
    duration = info["duration"]
    db.update("blocks", block_id, duration=duration)
    if duration < 5 or not info["has_video"]:
        db.update("blocks", block_id, status="skipped", error="bloco curto demais ou sem vídeo", updated_at=time.time())
        return

    label = f"bloco #{block['idx'] + 1} de “{source.get('title') or chan_name}”"
    db.log(f"Analisando {label} ({util.fmt_time(duration)})…")

    audio = transcribe.load_audio(path)
    tp = transcript_path(block_id)
    if tp.exists():
        transcript = json.loads(tp.read_text())
    else:
        transcript = transcribe.transcribe(audio, settings.get("whisper_model", "small"), settings.get("language", "pt"))
        tp.write_text(json.dumps(transcript, ensure_ascii=False))

    an = detector.analyze(path, audio, duration, transcript, settings)
    cands = detector.find_candidates(an, transcript, settings)
    dead_ratio = float(an["dead"].mean())
    chart = detector.summary_for_chart(an)
    chart["candidates"] = cands
    analysis_path(block_id).write_text(json.dumps(chart, ensure_ascii=False))
    db.update("blocks", block_id, dead_ratio=round(dead_ratio, 3))
    db.log(f"{label}: {dead_ratio * 100:.0f}% parado, {len(cands)} lance(s) candidato(s).")

    existing = db.q("SELECT start, end FROM clips WHERE block_id=?", (block_id,))
    min_cand = float(settings.get("min_candidate_score", 4))
    for cand in cands:
        if any(min(cand["end"], e["end"]) - max(cand["start"], e["start"]) > 3 for e in existing):
            continue  # já cortado (reprocessamento)
        if cand["heuristic_score"] < min_cand:
            continue
        make_clip(block, source, channel, cand, transcript, settings, chan_name)

    db.update("blocks", block_id, status="done", updated_at=time.time())
    db.log(f"{label} pronto em {time.time() - t0:.0f}s.")


def make_clip(block: dict, source: dict, channel: dict | None, cand: dict, transcript: dict, settings: dict,
              chan_name: str) -> int:
    now = time.time()
    clip_id = db.insert("clips", block_id=block["id"], source_id=block["source_id"],
                        channel_id=(channel or {}).get("id"), start=cand["start"], end=cand["end"],
                        heuristic_score=cand["heuristic_score"], transcript=cand.get("text", ""),
                        reasons=json.dumps(cand.get("reasons", []), ensure_ascii=False),
                        layout=settings.get("layout", "blur"), status="rendering", created_at=now, updated_at=now)
    try:
        review = scorer.ai_review(cand, chan_name, settings)
        ai = review["nota"] if review else None
        score = scorer.final_score(cand["heuristic_score"], ai, settings)
        title = (review or {}).get("titulo") or scorer.fallback_title(cand, chan_name)
        caption = (review or {}).get("legenda") or title
        hashtags = " ".join((review or {}).get("hashtags") or [])
        reasons = cand.get("reasons", []) + ([f"IA: {review['motivo']}"] if review and review.get("motivo") else [])
        db.update("clips", clip_id, ai_score=ai, score=score, title=title, caption=caption, hashtags=hashtags,
                  reasons=json.dumps(reasons, ensure_ascii=False))
        out = config.CLIPS_DIR / f"clip_{clip_id:06d}.mp4"
        res = editor.render(block["path"], cand["start"], cand["end"], out, settings.get("layout", "blur"),
                            settings, transcript.get("words"), title)
        db.update("clips", clip_id, path=str(res["path"]), thumb=str(res["thumb"] or ""), status="ready",
                  updated_at=time.time())
        db.log(f"Corte #{clip_id} pronto — nota {score} — “{title}”.")
        maybe_autopost(clip_id, score, settings)
    except Exception as e:  # noqa: BLE001
        db.update("clips", clip_id, status="error", error=str(e)[:500], updated_at=time.time())
        db.log(f"Falha ao gerar corte #{clip_id}: {e}", "error")
    return clip_id


def maybe_autopost(clip_id: int, score: float, settings: dict) -> None:
    min_score = float(settings.get("min_score", 7.5))
    if score < min_score:
        return
    if not settings.get("auto_post", True):
        db.update("clips", clip_id, status="approved")
        publisher.notify(f"🎬 Corte #{clip_id} com nota {score} aguardando sua aprovação.", settings)
        return
    plats = publisher.platforms_enabled(settings)
    if not plats:
        db.update("clips", clip_id, status="approved")
        db.log(f"Corte #{clip_id} passou da nota ({score} ≥ {min_score}) mas nenhuma rede está conectada.", "warn")
        return
    publisher.publish(clip_id, plats)


def rerender(clip_id: int, start: float | None = None, end: float | None = None, layout: str | None = None,
             title: str | None = None) -> None:
    clip = db.one("SELECT * FROM clips WHERE id=?", (clip_id,))
    if not clip:
        return
    block = db.one("SELECT * FROM blocks WHERE id=?", (clip["block_id"],))
    if not block or not Path(block["path"]).exists():
        raise util.CommandError("o bloco original já foi apagado; não dá para refazer este corte")
    settings = db.get_settings()
    s = float(clip["start"] if start is None else start)
    e = float(clip["end"] if end is None else end)
    if e - s < 3:
        raise ValueError("corte precisa ter pelo menos 3 segundos")
    lay = layout or clip.get("layout") or settings.get("layout", "blur")
    ttl = clip.get("title") if title is None else title
    tp = transcript_path(block["id"])
    transcript = json.loads(tp.read_text()) if tp.exists() else {"words": []}
    db.update("clips", clip_id, status="rendering", updated_at=time.time())
    version = int(time.time())
    out = config.CLIPS_DIR / f"clip_{clip_id:06d}_v{version}.mp4"
    try:
        res = editor.render(block["path"], s, e, out, lay, settings, transcript.get("words"), ttl or "")
    except Exception as ex:  # noqa: BLE001
        db.update("clips", clip_id, status="error", error=str(ex)[:500])
        raise
    for old in (clip.get("path"), clip.get("thumb")):
        if old and Path(old).exists() and Path(old) != res["path"]:
            Path(old).unlink(missing_ok=True)
            Path(old).with_suffix(".ass").unlink(missing_ok=True)
    text = " ".join(w["word"] for w in transcript.get("words", []) if s <= w["start"] < e)
    db.update("clips", clip_id, start=s, end=e, layout=lay, title=ttl, path=str(res["path"]),
              thumb=str(res["thumb"] or ""), transcript=text, error=None,
              status="posted" if clip["status"] == "posted" else "ready", updated_at=time.time())
    db.log(f"Corte #{clip_id} refeito ({util.fmt_time(s)}–{util.fmt_time(e)}, layout {lay}).")
