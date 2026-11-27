"""Detector: cruza volume, movimento e fala para achar os lances e pular trecho parado.

Cada bloco vira três curvas (resolução de 0,5 s):
  volume    – energia do áudio (RMS em dB)
  movimento – diferença média entre quadros consecutivos
  fala      – densidade de palavras da transcrição + palavras de empolgação (sem
              transcrição, usa a energia na faixa de voz)
As curvas são normalizadas por posto dentro do bloco, combinadas com pesos e
suavizadas. Os picos que mais se destacam viram candidatos a corte, com começo e
fim ajustados para não cortar frase no meio.
"""
from __future__ import annotations

import re
import subprocess
import unicodedata

import numpy as np

HOP = 0.5           # segundos por amostra
SR = 16000
MOTION_FPS = 4
MOTION_W, MOTION_H = 96, 54


# ------------------------------------------------------------------ sinais
def audio_features(audio: np.ndarray, n_hops: int) -> tuple[np.ndarray, np.ndarray]:
    """RMS em dB e fração de energia na faixa de voz (300–3400 Hz) por hop."""
    hop = int(SR * HOP)
    vol = np.full(n_hops, -90.0)
    voice = np.zeros(n_hops)
    if audio.size == 0:
        return vol, voice
    freqs = np.fft.rfftfreq(hop, 1 / SR)
    band = (freqs >= 300) & (freqs <= 3400)
    win = np.hanning(hop)
    for i in range(n_hops):
        seg = audio[i * hop:(i + 1) * hop]
        if seg.size < hop // 4:
            break
        rms = float(np.sqrt(np.mean(seg ** 2)) + 1e-9)
        vol[i] = 20 * np.log10(rms)
        if seg.size == hop:
            spec = np.abs(np.fft.rfft(seg * win)) ** 2
            tot = spec.sum() + 1e-12
            voice[i] = spec[band].sum() / tot
    return vol, voice


def motion_feature(path: str, n_hops: int) -> np.ndarray:
    """Diferença média absoluta entre quadros (0–255) por hop."""
    cmd = ["ffmpeg", "-v", "error", "-nostdin", "-i", str(path), "-an",
           "-vf", f"fps={MOTION_FPS},scale={MOTION_W}:{MOTION_H},format=gray",
           "-f", "rawvideo", "-"]
    p = subprocess.run(cmd, capture_output=True, timeout=3600)
    frame_size = MOTION_W * MOTION_H
    n = len(p.stdout) // frame_size
    out = np.zeros(n_hops)
    if n < 2:
        return out
    frames = np.frombuffer(p.stdout[: n * frame_size], dtype=np.uint8).reshape(n, frame_size).astype(np.int16)
    diffs = np.abs(np.diff(frames, axis=0)).mean(axis=1)
    diffs = np.concatenate([[diffs[0]], diffs])
    # corta picos de troca de cena para não dominarem
    cap = np.percentile(diffs, 99) if diffs.size > 10 else diffs.max()
    diffs = np.minimum(diffs, cap)
    per_hop = int(MOTION_FPS * HOP) or 1
    for i in range(n_hops):
        chunk = diffs[i * per_hop:(i + 1) * per_hop]
        if chunk.size:
            out[i] = chunk.mean()
    return out


def _norm_text(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    return "".join(c for c in s if not unicodedata.combining(c))


def keyword_patterns(keywords: str) -> list[re.Pattern]:
    pats = []
    for kw in (k.strip() for k in (keywords or "").split(",")):
        if not kw:
            continue
        k = _norm_text(kw)
        if re.fullmatch(r"k+", k):
            pats.append(re.compile(r"\bk{3,}\b"))
        elif re.fullmatch(r"(ha)+", k):
            pats.append(re.compile(r"\b(ha){2,}h?\b"))
        else:
            pats.append(re.compile(r"\b" + re.escape(k) + r"\b"))
    pats.append(re.compile(r"!{2,}"))
    return pats


def speech_feature(words: list[dict], n_hops: int, patterns: list[re.Pattern]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Densidade de fala, presença de fala e acertos de palavras-chave por hop."""
    density = np.zeros(n_hops)
    present = np.zeros(n_hops)
    kw = np.zeros(n_hops)
    for w in words:
        a = int(w["start"] / HOP)
        b = max(a + 1, int(np.ceil(w["end"] / HOP)))
        a, b = max(0, a), min(n_hops, b)
        if a >= n_hops:
            continue
        present[a:b] = 1
        density[a] += 1
    # palavras-chave olhando a janela de texto em volta de cada palavra
    for i, w in enumerate(words):
        ctx = _norm_text(" ".join(x["word"] for x in words[max(0, i - 2): i + 3]))
        token = _norm_text(w["word"])
        if any(p.search(token) or (" " in p.pattern and p.search(ctx)) for p in patterns):
            h = int(w["start"] / HOP)
            if 0 <= h < n_hops:
                kw[h] = 1
    # palavras por segundo numa janela de 3 s
    k = int(3 / HOP)
    rate = np.convolve(density, np.ones(k) / (k * HOP), mode="same")
    return rate, present, kw


# ------------------------------------------------------------------ helpers
def rank01(x: np.ndarray) -> np.ndarray:
    """Posto percentual (0..1) com empates pela média."""
    if x.size == 0:
        return x
    order = x.argsort(kind="mergesort")
    ranks = np.empty(x.size)
    ranks[order] = np.arange(x.size)
    # média dos empates
    _, inv, counts = np.unique(x, return_inverse=True, return_counts=True)
    sums = np.bincount(inv, weights=ranks)
    ranks = sums[inv] / counts[inv]
    return ranks / max(1, x.size - 1)


def smooth(x: np.ndarray, seconds: float) -> np.ndarray:
    k = max(1, int(seconds / HOP))
    if k <= 1 or x.size < k:
        return x.copy()
    return np.convolve(x, np.ones(k) / k, mode="same")


def robust_z(x: np.ndarray) -> np.ndarray:
    med = np.median(x)
    mad = np.median(np.abs(x - med)) * 1.4826
    return (x - med) / (mad + 1e-3)


# ------------------------------------------------------------------ análise
def analyze(video_path: str, audio: np.ndarray, duration: float, transcript: dict, settings: dict) -> dict:
    n = max(1, int(np.ceil(duration / HOP)))
    vol_db, voice = audio_features(audio, n)
    motion = motion_feature(video_path, n)
    patterns = keyword_patterns(settings.get("hype_keywords", ""))
    words = transcript.get("words", [])
    rate, present, kw = speech_feature(words, n, patterns)

    has_transcript = len(words) > 0
    if not has_transcript:
        # sem transcrição: fala ≈ voz alta na faixa de voz
        rate = voice * np.clip((vol_db + 50) / 30, 0, 1)
        present = (rate > 0.35).astype(float)

    vol_r = rank01(vol_db)
    mov_r = rank01(motion)
    sp_r = rank01(rate + 2.0 * smooth(kw, 2.0))
    sp_r[(rate <= 0) & (kw <= 0)] = 0

    wv, wm, ws = (float(settings.get("weight_volume", 1)), float(settings.get("weight_movement", 1)),
                  float(settings.get("weight_speech", 1)))
    wsum = max(1e-6, wv + wm + ws)
    combined = (wv * vol_r + wm * mov_r + ws * sp_r) / wsum
    # bônus quando os sinais concordam (dois ou mais lá em cima ao mesmo tempo)
    agree = ((vol_r > 0.7).astype(int) + (mov_r > 0.7).astype(int) + (sp_r > 0.7).astype(int)) >= 2
    combined = np.clip(combined + 0.15 * agree, 0, 1.2)
    comb_s = smooth(combined, 4.0)

    silent = vol_db < -50
    still = motion < 0.8                     # tela praticamente parada (valor absoluto)
    quiet = vol_db < -38                     # quase sem som (valor absoluto)
    dead = (((vol_r < 0.35) & (mov_r < 0.35) & (present == 0))
            | (still & quiet & (present == 0))
            | (silent & (mov_r < 0.5)))
    dead = smooth(dead.astype(float), 6.0) > 0.6

    return {
        "hop": HOP, "n": n, "duration": duration, "has_transcript": has_transcript,
        "vol_db": vol_db, "motion_abs": motion, "vol": vol_r, "mov": mov_r, "speech": sp_r, "kw": kw, "present": present,
        "combined": comb_s, "agree": agree, "dead": dead,
    }


def find_candidates(an: dict, transcript: dict, settings: dict) -> list[dict]:
    hop = an["hop"]
    n = an["n"]
    comb = an["combined"].copy()
    z = robust_z(comb)
    dur = an["duration"]
    min_len = float(settings.get("clip_min_seconds", 20))
    max_len = float(settings.get("clip_max_seconds", 60))
    max_clips = int(settings.get("max_clips_per_block", 3))
    thr = np.percentile(comb, 70)
    segments = transcript.get("segments", [])

    used = np.zeros(n, dtype=bool)
    used[an["dead"]] = True
    out: list[dict] = []
    for _ in range(max_clips * 3):
        if len(out) >= max_clips:
            break
        avail = np.where(~used, comb, -1)
        peak = int(avail.argmax())
        if avail[peak] < 0:
            break
        if z[peak] < 0.8 and out:
            break
        # cresce enquanto a empolgação estiver acima do limiar (tolera quedas de até 3 s)
        gap = int(3 / hop)
        a = peak
        miss = 0
        while a > 0 and miss <= gap:
            a -= 1
            miss = miss + 1 if comb[a] < thr else 0
        a += miss
        b = peak
        miss = 0
        while b < n - 1 and miss <= gap:
            b += 1
            miss = miss + 1 if comb[b] < thr else 0
        b -= miss
        start = a * hop - 4.0     # contexto antes do lance
        end = (b + 1) * hop + 1.5
        length = end - start
        if length < min_len:
            extra = min_len - length
            start -= extra * 0.6
            end += extra * 0.4
        elif length > max_len:
            # janela de max_len com maior soma dentro da região
            k = int(max_len / hop)
            lo, hi = max(0, int(start / hop)), min(n, int(end / hop))
            seg = comb[lo:hi]
            if seg.size > k:
                sums = np.convolve(seg, np.ones(k), mode="valid")
                off = int(sums.argmax())
                start, end = (lo + off) * hop, (lo + off + k) * hop
            else:
                start, end = lo * hop, hi * hop
        start, end = _snap_to_speech(start, end, segments, max_len, min_len)
        start = max(0.0, start)
        end = min(dur, end)
        if end - start < min(min_len, dur) * 0.6:
            used[max(0, peak - 4): peak + 5] = True
            continue
        i0, i1 = int(start / hop), max(int(start / hop) + 1, int(end / hop))
        if used[i0:i1].mean() > 0.5:
            used[peak] = True
            continue
        used[max(0, i0 - int(5 / hop)): min(n, i1 + int(5 / hop))] = True
        out.append(_describe(an, z, start, end, peak, transcript))
    out.sort(key=lambda c: c["start"])
    return out


def _snap_to_speech(start: float, end: float, segments: list[dict], max_len: float, min_len: float):
    for s in segments:
        if s["start"] < start < s["end"] and (end - s["start"]) <= max_len + 5:
            start = s["start"] - 0.2
            break
    for s in segments:
        if s["start"] < end < s["end"] and (s["end"] - start) <= max_len + 5:
            end = s["end"] + 0.4
            break
    if end - start < min_len * 0.9:
        end = start + min_len
    return start, end


def _describe(an: dict, z: np.ndarray, start: float, end: float, peak: int, transcript: dict) -> dict:
    hop = an["hop"]
    i0, i1 = int(start / hop), max(int(start / hop) + 1, int(np.ceil(end / hop)))
    sl = slice(i0, i1)
    peak_z = float(z[peak])
    mean_comb = float(an["combined"][sl].mean())
    speech_cov = float(an["present"][sl].mean())
    kw_hits = int(an["kw"][sl].sum())
    agree = float(an["agree"][sl].mean())
    loud = float(np.percentile(an["vol_db"][sl], 90))
    text = " ".join(w["word"] for w in transcript.get("words", []) if start <= w["start"] < end).strip()

    a = np.clip(peak_z, 0, 4) / 4 * 4.0
    b = np.clip((mean_comb - 0.5) / 0.4, 0, 1) * 2.5
    c = speech_cov * 1.5
    d = min(kw_hits, 3) / 3 * 1.5
    e = agree * 0.5
    score = a + b + c + d + e
    if loud < -40:
        score *= 0.6
    if float(an["motion_abs"][sl].mean()) < 0.8 and speech_cov < 0.1:
        score *= 0.5  # nada acontecendo de verdade
    reasons = []
    if peak_z > 2:
        reasons.append("pico forte de empolgação")
    if float(an["vol"][sl].max()) > 0.95:
        reasons.append("grito/volume alto")
    if float(an["mov"][sl].mean()) > 0.65:
        reasons.append("muito movimento na tela")
    if speech_cov > 0.5:
        reasons.append("fala contínua")
    if kw_hits:
        reasons.append(f"{kw_hits} reação(ões) de hype")
    return {
        "start": round(start, 2), "end": round(end, 2), "peak": round(peak * hop, 2),
        "heuristic_score": round(float(np.clip(score, 0, 10)), 2),
        "features": {"peak_z": round(peak_z, 2), "mean_combined": round(mean_comb, 3),
                     "speech_coverage": round(speech_cov, 2), "keyword_hits": kw_hits,
                     "agreement": round(agree, 2), "loud_db": round(loud, 1)},
        "reasons": reasons, "text": text,
    }


def summary_for_chart(an: dict) -> dict:
    """Reduz as curvas para 1 ponto por segundo (gráfico do painel)."""
    step = max(1, int(1 / an["hop"]))

    def red(x, fn=np.mean):
        x = np.asarray(x, dtype=float)
        m = x.size // step * step
        if m == 0:
            return []
        return [round(float(v), 3) for v in fn(x[:m].reshape(-1, step), axis=1)]

    return {"hop": 1.0, "volume": red(an["vol"]), "movimento": red(an["mov"]), "fala": red(an["speech"]),
            "empolgacao": red(an["combined"]), "parado": red(an["dead"], np.max)}
