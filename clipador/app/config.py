"""Configuração: caminhos, valores padrão e leitura/gravação das configurações."""
from __future__ import annotations

import copy
import os
from pathlib import Path

DATA_DIR = Path(os.environ.get("CLIPADOR_DATA", Path(__file__).resolve().parent.parent / "data")).resolve()
DB_PATH = DATA_DIR / "clipador.db"
RAW_DIR = DATA_DIR / "raw"        # gravações / downloads / blocos brutos
CLIPS_DIR = DATA_DIR / "clips"    # cortes renderizados
WORK_DIR = DATA_DIR / "work"      # análises, legendas, temporários
WEB_DIR = Path(__file__).resolve().parent.parent / "web"

for d in (DATA_DIR, RAW_DIR, CLIPS_DIR, WORK_DIR):
    d.mkdir(parents=True, exist_ok=True)

# Campos que nunca voltam para o navegador em texto puro.
SECRET_KEYS = {
    "anthropic_api_key",
    "youtube_client_secret", "youtube_refresh_token",
    "tiktok_client_secret", "tiktok_refresh_token", "tiktok_access_token",
    "instagram_access_token",
    "discord_webhook",
}

DEFAULTS: dict = {
    # --- Monitor ---
    "block_minutes": 10,            # tamanho de cada bloco da live
    "youtube_poll_minutes": 15,     # de quanto em quanto tempo confere vídeo novo no YouTube
    "live_check_minutes": 2,        # de quanto em quanto tempo confere se o canal entrou ao vivo
    "youtube_lives": True,          # também grava lives do YouTube
    "record_quality": "best",       # qualidade da gravação (best, 720p, 480p...)
    "keep_raw_hours": 48,           # apaga blocos brutos depois de X horas (0 = nunca)
    # --- Detector ---
    "weight_volume": 1.0,
    "weight_movement": 1.0,
    "weight_speech": 1.0,
    "clip_min_seconds": 20,
    "clip_max_seconds": 60,
    "max_clips_per_block": 3,
    "min_candidate_score": 4.0,     # abaixo disso nem renderiza
    "hype_keywords": "caraca, caralho, meu deus, nossa, não acredito, olha isso, que isso, absurdo, "
                     "insano, kkkk, hahaha, socorro, mano, vai vai, gol, ganhei, morreu, clip, clipa, que lance",
    # --- Transcrição / legenda ---
    "whisper_model": "small",
    "language": "pt",
    "subtitles": True,
    "subtitle_words": 3,            # palavras por legenda
    "subtitle_color": "#FF6B2C",    # cor da palavra em destaque
    "subtitle_position": 0.72,      # altura (0 = topo, 1 = base)
    "title_overlay": True,          # título no topo nos primeiros segundos
    # --- Edição ---
    "layout": "blur",               # blur | crop | split | fit
    "facecam": {"x": 0.0, "y": 0.0, "w": 0.28, "h": 0.30},  # posição da facecam (fração do quadro)
    "video_crf": 21,
    # --- Nota / IA ---
    "ai_scoring": True,
    "ai_model": "claude-opus-5-5",
    "anthropic_api_key": "",
    "ai_weight": 0.5,               # quanto a nota da IA pesa na nota final
    # --- Postagem ---
    "min_score": 7.5,               # passou dessa nota, posta sozinho
    "auto_post": True,
    "post_tiktok": False,
    "post_instagram": False,
    "post_youtube": False,
    "max_posts_per_day": 20,
    "default_hashtags": "#cortes #live #clips",
    "youtube_client_id": "",
    "youtube_client_secret": "",
    "youtube_refresh_token": "",
    "youtube_privacy": "public",
    "tiktok_client_key": "",
    "tiktok_client_secret": "",
    "tiktok_refresh_token": "",
    "tiktok_access_token": "",
    "tiktok_privacy": "SELF_ONLY",
    "instagram_user_id": "",
    "instagram_access_token": "",
    "discord_webhook": "",
    # --- Processamento ---
    "workers": 1,
}


def defaults() -> dict:
    return copy.deepcopy(DEFAULTS)


def coerce(key: str, value):
    """Converte o valor vindo do formulário para o tipo do padrão."""
    if key not in DEFAULTS:
        raise KeyError(key)
    base = DEFAULTS[key]
    if isinstance(base, bool):
        if isinstance(value, str):
            return value.strip().lower() in ("1", "true", "sim", "on", "yes")
        return bool(value)
    if isinstance(base, int) and not isinstance(base, bool):
        return int(float(value))
    if isinstance(base, float):
        return float(value)
    if isinstance(base, dict):
        if not isinstance(value, dict):
            raise ValueError(f"{key} precisa ser um objeto")
        out = dict(base)
        out.update({k: float(v) for k, v in value.items() if k in base})
        return out
    return "" if value is None else str(value)
