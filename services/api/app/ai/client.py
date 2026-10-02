"""Cliente de Anthropic y armado de la petición al mentor (F1-07).

Reglas de `claude-opus-5` que se respetan aquí (guía oficial del SDK):

- Modelo sin sufijo de fecha; pensamiento adaptativo (`thinking={"type": "adaptive"}`) y el
  esfuerzo en `output_config={"effort": ...}` (no en el nivel superior).
- NUNCA se envían `temperature`, `top_p`, `top_k`, `budget_tokens`, un prefill del asistente ni un
  `tool_choice` forzado: en este modelo devuelven 400.
- El pensamiento llega omitido por defecto y no se reenvía al cliente (ver `mentor.py`).
- Los clasificadores de seguridad pueden rechazar con HTTP 200 y `stop_reason: "refusal"`: se
  activa por defecto el fallback del lado del servidor (`fallbacks="default"` con la cabecera beta
  `server-side-fallback-2026-07-01`), que reintenta la petición rechazada en otro modelo dentro de
  la misma llamada.
"""

from collections.abc import Sequence
from typing import Any

import anthropic
import httpx2
from fastapi import Request

from app.ai.errors import ia_not_configured
from app.ai.prompt import FragmentoEtiquetado, render_datos, system_blocks
from app.core.settings import Settings
from app.schemas.chat import ChatMessage
from app.schemas.contexto import ContextoPedagogico

# Fallback del lado del servidor. El SDK instalado (anthropic 1.8) ya tipa el parámetro
# `fallbacks` (acepta el literal "default") y la cabecera beta en `client.beta.messages.stream`,
# así que NO hace falta `extra_body` ni `extra_headers`. La forma "default" usa esta cabecera, no
# `server-side-fallback-2026-06-01` (esa es para la forma con arreglo `[{"model": ...}]`; mezclar
# cabecera y forma da un 400). Con "default" Anthropic elige el sustituto según la categoría del
# rechazo (los de ciberseguridad van a Claude Opus 4.8).
FALLBACK_BETA = "server-side-fallback-2026-07-01"
FALLBACK_MODE = "default"
# Modelos para los que se activa por defecto. En cualquier otro se omite (no se garantiza que
# acepten el parámetro) y un rechazo llega tal cual como evento `error` `refusal`.
FALLBACK_MODELS = frozenset({"claude-opus-5"})

# La conexión debe abrirse rápido; entre fragmentos del stream se tolera hasta 120 s porque el
# modelo puede pensar un buen rato antes de escribir. Sin límite total: max_tokens acota la salida.
UPSTREAM_TIMEOUT = anthropic.Timeout(connect=10.0, read=120.0, write=30.0, pool=10.0)
# Reintentos del SDK (429, 5xx y errores de conexión) ANTES de que empiece el stream.
UPSTREAM_MAX_RETRIES = 2


def uses_server_side_fallback(model: str) -> bool:
    return model in FALLBACK_MODELS


def build_client(
    settings: Settings,
    *,
    http_client: httpx2.AsyncClient | None = None,
    max_retries: int = UPSTREAM_MAX_RETRIES,
) -> anthropic.AsyncAnthropic:
    """Cliente asíncrono oficial. `http_client` permite inyectar un transporte simulado en pruebas.

    El SDK 1.x usa `httpx2`, no `httpx`: un cliente de `httpx` se rechaza.
    """
    return anthropic.AsyncAnthropic(
        api_key=settings.anthropic_api_key.strip(),
        timeout=UPSTREAM_TIMEOUT,
        max_retries=max_retries,
        http_client=http_client,
    )


def get_client(request: Request) -> anthropic.AsyncAnthropic:
    """Cliente compartido de la app (uno por proceso; pool de conexiones reutilizable).

    Se crea en la primera petición, cuando ya se comprobó que hay clave. Las pruebas pueden
    asignar su propio cliente en `app.state.anthropic_client` antes de llamar.
    """
    client = getattr(request.app.state, "anthropic_client", None)
    if client is None:
        settings: Settings = request.app.state.settings
        if not settings.anthropic_configured:
            raise ia_not_configured()
        client = build_client(settings)
        request.app.state.anthropic_client = client
    return client


def to_upstream_messages(messages: Sequence[ChatMessage]) -> list[dict[str, str]]:
    """Historial en el formato de la API de mensajes.

    La API exige que la conversación abra con un turno del usuario, y el contrato solo exige que
    el ÚLTIMO mensaje sea del usuario. Un saludo inicial del asistente que el frontend muestre en
    pantalla e incluya en el historial se descarta aquí en lugar de provocar un 400.
    """
    turns = list(messages)
    while turns and turns[0].role != "user":
        turns.pop(0)
    return [{"role": turn.role, "content": turn.content} for turn in turns]


def with_course_data(
    turns: list[dict[str, Any]],
    contexto: ContextoPedagogico | None,
    material: Sequence[FragmentoEtiquetado],
) -> list[dict[str, Any]]:
    """Antepone el bloque `datos_del_curso` a la pregunta del estudiante (el último turno).

    El historial anterior queda idéntico al que el cliente envió (sin datos), de modo que el prefijo
    de la conversación no cambia de una petición a la siguiente. El texto del estudiante va en su
    propio bloque, intacto.
    """
    *history, last = turns
    return [
        *history,
        {
            "role": "user",
            "content": [
                {"type": "text", "text": render_datos(contexto, material)},
                {"type": "text", "text": last["content"]},
            ],
        },
    ]


def build_request(
    settings: Settings,
    messages: Sequence[ChatMessage],
    *,
    contexto: ContextoPedagogico | None = None,
    material: Sequence[FragmentoEtiquetado] = (),
) -> dict[str, Any]:
    """Argumentos de `client.beta.messages.stream(...)` para una consulta al mentor.

    Orden pensado para el prompt caching: `system` con el bloque estable y su `cache_control`; lo
    variable (contexto pedagógico y fragmentos) va al final, en el último turno del estudiante.
    """
    request: dict[str, Any] = {
        "model": settings.anthropic_model,
        "max_tokens": settings.mentor_max_tokens,
        "system": system_blocks(),
        "messages": with_course_data(to_upstream_messages(messages), contexto, material),
        "thinking": {"type": "adaptive"},
        "output_config": {"effort": settings.mentor_effort},
    }
    if settings.mentor_server_fallback and uses_server_side_fallback(settings.anthropic_model):
        request["betas"] = [FALLBACK_BETA]
        request["fallbacks"] = FALLBACK_MODE
    return request
