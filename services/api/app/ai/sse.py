"""Formato de los eventos SSE del mentor (docs/api-contract.md, "Mentor de IA").

Cada evento es `event: <nombre>\\ndata: <json>\\n\\n`. El comentario `: ping` mantiene viva la
conexión cuando el modelo tarda (p. ej. mientras piensa) para que los proxies no la corten.
"""

import json
from dataclasses import dataclass
from typing import Any

from app.ai.usage import Usage

# El contrato fija un ping cada 15 s. Es una variable de módulo (no una constante congelada en el
# valor por defecto de una función) para poder acortarla en pruebas.
PING_INTERVAL_SECONDS = 15.0
PING_FRAME = b": ping\n\n"

# Cabeceras de la respuesta: sin caché y sin buffering en nginx (cada evento llega al instante).
SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
SSE_MEDIA_TYPE = "text/event-stream"


@dataclass(frozen=True, slots=True)
class SSEEvent:
    name: str
    data: dict[str, Any]

    def encode(self) -> bytes:
        """Trama SSE en UTF-8. El JSON va en una sola línea (los saltos de línea se escapan).

        `errors="replace"` evita una excepción si el texto trajera un sustituto Unicode suelto:
        un carácter dañado es preferible a cortar el stream a la mitad.
        """
        payload = json.dumps(self.data, ensure_ascii=False, separators=(",", ":"))
        return f"event: {self.name}\ndata: {payload}\n\n".encode(errors="replace")


def session_event(session_id: int) -> SSEEvent:
    """Primer evento de la respuesta: la conversación a la que pertenece el mensaje (F3-09)."""
    return SSEEvent("sesion", {"session_id": session_id})


def citations_event(citas: list[dict[str, Any]]) -> SSEEvent:
    """Fuentes del curso que se consultaron para responder (F3-05). Antes de `usage` y `done`."""
    return SSEEvent("citas", {"citas": citas})


def message_event(message_id: int) -> SSEEvent:
    """Id de la respuesta guardada, para valorarla con `POST /api/chat/feedback` (F3-11)."""
    return SSEEvent("mensaje", {"message_id": message_id})


def text_event(delta: str) -> SSEEvent:
    return SSEEvent("text", {"delta": delta})


def usage_event(usage: Usage) -> SSEEvent:
    return SSEEvent("usage", usage.as_payload())


def done_event(stop_reason: str) -> SSEEvent:
    return SSEEvent("done", {"stop_reason": stop_reason})


def error_event(code: str, message: str) -> SSEEvent:
    return SSEEvent("error", {"code": code, "message": message})
