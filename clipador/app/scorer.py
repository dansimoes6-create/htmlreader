"""Nota do corte: heurística do detector + (opcional) avaliação do Claude com título e legenda."""
from __future__ import annotations

import json
import os

from . import db

SYSTEM = (
    "Você é editor-chefe de um canal de cortes de lives no Brasil (TikTok, Reels e Shorts). "
    "Recebe a transcrição de um trecho candidato a corte e os sinais do detector automático "
    "(volume, movimento e fala). Dê uma nota de 0 a 10 para o potencial viral do corte sozinho, "
    "fora de contexto, para quem nunca viu a live: 9-10 = lance absurdo/engraçadíssimo que viraliza; "
    "7-8 = bom corte, vale postar; 5-6 = mediano; 0-4 = sem graça, confuso ou só barulho. "
    "Seja exigente: a maioria dos trechos não passa de 6. Escreva título curto (até 60 caracteres) "
    "que gere curiosidade sem mentir, legenda de post curta em português brasileiro e até 5 hashtags."
)

SCHEMA = {
    "type": "object",
    "properties": {
        "nota": {"type": "number", "description": "0 a 10"},
        "titulo": {"type": "string"},
        "legenda": {"type": "string"},
        "hashtags": {"type": "array", "items": {"type": "string"}},
        "motivo": {"type": "string", "description": "uma frase explicando a nota"},
    },
    "required": ["nota", "titulo", "legenda", "hashtags", "motivo"],
    "additionalProperties": False,
}


def _api_key(settings: dict) -> str:
    return (settings.get("anthropic_api_key") or os.environ.get("ANTHROPIC_API_KEY") or "").strip()


def ai_available(settings: dict) -> bool:
    if not settings.get("ai_scoring", True) or not _api_key(settings):
        return False
    try:
        import anthropic  # noqa: F401
        return True
    except ImportError:
        return False


def ai_review(candidate: dict, channel_name: str, settings: dict) -> dict | None:
    """Pede ao Claude nota, título, legenda e hashtags. Devolve None se indisponível/falhar."""
    if not ai_available(settings):
        return None
    import anthropic

    text = candidate.get("text") or "(sem fala detectada)"
    feats = candidate.get("features", {})
    user = (
        f"Canal: {channel_name or 'desconhecido'}\n"
        f"Duração do corte: {candidate['end'] - candidate['start']:.0f} s\n"
        f"Sinais do detector: {json.dumps(feats, ensure_ascii=False)}\n"
        f"Motivos do detector: {', '.join(candidate.get('reasons', [])) or 'nenhum'}\n"
        f"Nota da heurística: {candidate.get('heuristic_score')}\n\n"
        f"Transcrição do trecho:\n<transcricao>\n{text[:6000]}\n</transcricao>"
    )
    client = anthropic.Anthropic(api_key=_api_key(settings), max_retries=3)
    try:
        resp = client.beta.messages.create(
            model=settings.get("ai_model") or "claude-opus-5-5",
            max_tokens=4000,
            system=SYSTEM,
            messages=[{"role": "user", "content": user}],
            output_config={"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError:
        db.log("Chave da Anthropic inválida — nota por IA desligada até corrigir.", "error")
        return None
    except anthropic.RateLimitError:
        db.log("Limite de uso da API do Claude atingido; usando só a nota do detector.", "warn")
        return None
    except anthropic.APIStatusError as e:
        db.log(f"Erro da API do Claude ({e.status_code}): {e.message}", "error")
        return None
    except anthropic.APIConnectionError:
        db.log("Sem conexão com a API do Claude; usando só a nota do detector.", "warn")
        return None
    if resp.stop_reason == "refusal":
        db.log("Claude recusou avaliar um trecho; usando só a nota do detector.", "warn")
        return None
    raw = next((b.text for b in resp.content if b.type == "text"), "")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        db.log("Resposta da IA veio incompleta; usando só a nota do detector.", "warn")
        return None
    data["nota"] = max(0.0, min(10.0, float(data.get("nota", 0))))
    data["hashtags"] = [h if h.startswith("#") else f"#{h}" for h in (data.get("hashtags") or [])][:5]
    return data


def fallback_title(candidate: dict, channel_name: str) -> str:
    text = (candidate.get("text") or "").strip()
    if text:
        words = text.split()
        t = " ".join(words[:8])
        return (t[:57] + "…") if len(t) > 58 else t
    return f"Lance da live de {channel_name}" if channel_name else "Lance da live"


def final_score(heuristic: float, ai: float | None, settings: dict) -> float:
    if ai is None:
        return round(heuristic, 1)
    w = max(0.0, min(1.0, float(settings.get("ai_weight", 0.5))))
    return round((1 - w) * heuristic + w * ai, 1)
