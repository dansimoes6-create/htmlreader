"""Transcrição com faster-whisper (timestamps por palavra). Sem whisper, devolve vazio."""
from __future__ import annotations

import subprocess
import threading

import numpy as np

from . import db

_model = None
_model_name = None
_lock = threading.Lock()


def load_audio(path: str, sr: int = 16000) -> np.ndarray:
    p = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-i", str(path), "-vn", "-ac", "1", "-ar", str(sr),
                        "-f", "s16le", "-"], capture_output=True, timeout=1800)
    if p.returncode != 0 and not p.stdout:
        return np.zeros(0, dtype=np.float32)
    return np.frombuffer(p.stdout, dtype=np.int16).astype(np.float32) / 32768.0


def _get_model(name: str):
    global _model, _model_name
    from faster_whisper import WhisperModel  # import tardio: é pesado
    if _model is None or _model_name != name:
        db.log(f"Carregando modelo de transcrição '{name}' (primeira vez pode demorar)…")
        _model = WhisperModel(name, device="auto", compute_type="int8")
        _model_name = name
    return _model


def transcribe(audio: np.ndarray, model_name: str = "small", language: str = "pt") -> dict:
    """Retorna {'segments': [{start,end,text}], 'words': [{start,end,word,prob}]}."""
    if audio.size == 0:
        return {"segments": [], "words": []}
    try:
        with _lock:
            model = _get_model(model_name)
            segs, _info = model.transcribe(audio, language=language or None, word_timestamps=True,
                                           vad_filter=True, beam_size=1,
                                           vad_parameters={"min_silence_duration_ms": 400})
            segments, words = [], []
            for s in segs:
                segments.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
                for w in s.words or []:
                    t = w.word.strip()
                    if t:
                        words.append({"start": round(w.start, 2), "end": round(w.end, 2), "word": t,
                                      "prob": round(w.probability, 3)})
        return {"segments": segments, "words": words}
    except ImportError:
        db.log("faster-whisper não instalado: seguindo sem transcrição (legenda desligada).", "warn")
    except Exception as e:  # noqa: BLE001
        db.log(f"Falha na transcrição: {e}", "error")
    return {"segments": [], "words": []}
