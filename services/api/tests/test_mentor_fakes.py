"""Anthropic simulado para las pruebas del mentor (F1-07). No contiene pruebas.

Ninguna prueba llama a la API real: el SDK oficial (`AsyncAnthropic`) recibe un cliente HTTP con un
`httpx2.MockTransport` que devuelve un stream SSE con el formato real de la API de mensajes. (El
SDK 1.x está construido sobre `httpx2`, no `httpx`.)
"""

import asyncio
import json
from collections.abc import Callable, Iterable, Iterator
from typing import Any

import httpx2
import pytest
from anthropic import DefaultAsyncHttpxClient
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.ai.client import build_client

API_KEY = "sk-ant-api03-clave-solo-para-pruebas"
# Textos que NUNCA deben llegar al cliente aunque el proveedor los incluya en un error.
LEAK_CANARY = "DETALLE-INTERNO-DEL-PROVEEDOR"

SseEvent = tuple[str, dict[str, Any]]


# --- Stream de Anthropic (formato real de la API) -----------------------------------------------


def encode_upstream(events: Iterable[SseEvent]) -> bytes:
    """Serializa eventos en el formato SSE de Anthropic: `event: <tipo>\\ndata: <json>\\n\\n`."""
    return "".join(
        f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n" for name, data in events
    ).encode()


def message_start(
    *,
    model: str = "claude-opus-5",
    input_tokens: int = 25,
    cache_read: int = 0,
    cache_creation: int = 0,
) -> SseEvent:
    return (
        "message_start",
        {
            "type": "message_start",
            "message": {
                "id": "msg_01FakeMessageId",
                "type": "message",
                "role": "assistant",
                "content": [],
                "model": model,
                "stop_reason": None,
                "stop_sequence": None,
                "usage": {
                    "input_tokens": input_tokens,
                    "cache_creation_input_tokens": cache_creation,
                    "cache_read_input_tokens": cache_read,
                    "output_tokens": 1,
                },
            },
        },
    )


def text_block(index: int, *deltas: str) -> list[SseEvent]:
    """Un bloque de texto completo: inicio, un `text_delta` por fragmento y cierre."""
    events: list[SseEvent] = [
        (
            "content_block_start",
            {
                "type": "content_block_start",
                "index": index,
                "content_block": {"type": "text", "text": ""},
            },
        )
    ]
    events += [
        (
            "content_block_delta",
            {
                "type": "content_block_delta",
                "index": index,
                "delta": {"type": "text_delta", "text": delta},
            },
        )
        for delta in deltas
    ]
    events.append(("content_block_stop", {"type": "content_block_stop", "index": index}))
    return events


def thinking_block(index: int, thinking: str = "") -> list[SseEvent]:
    """Bloque de pensamiento. Con Opus 5 llega vacío (omitido); con texto simula un resumen."""
    events: list[SseEvent] = [
        (
            "content_block_start",
            {
                "type": "content_block_start",
                "index": index,
                "content_block": {"type": "thinking", "thinking": "", "signature": ""},
            },
        )
    ]
    if thinking:
        events.append(
            (
                "content_block_delta",
                {
                    "type": "content_block_delta",
                    "index": index,
                    "delta": {"type": "thinking_delta", "thinking": thinking},
                },
            )
        )
    events.append(
        (
            "content_block_delta",
            {
                "type": "content_block_delta",
                "index": index,
                "delta": {"type": "signature_delta", "signature": "firma-de-prueba"},
            },
        )
    )
    events.append(("content_block_stop", {"type": "content_block_stop", "index": index}))
    return events


def message_end(
    stop_reason: str | None = "end_turn",
    *,
    output_tokens: int = 15,
    stop_details: dict[str, Any] | None = None,
    usage_extra: dict[str, int] | None = None,
) -> list[SseEvent]:
    """`message_delta` (con `stop_reason` y uso final acumulado) y `message_stop`."""
    return [
        (
            "message_delta",
            {
                "type": "message_delta",
                "delta": {
                    "stop_reason": stop_reason,
                    "stop_sequence": None,
                    **({"stop_details": stop_details} if stop_details else {}),
                },
                "usage": {"output_tokens": output_tokens, **(usage_extra or {})},
            },
        ),
        ("message_stop", {"type": "message_stop"}),
    ]


PING: SseEvent = ("ping", {"type": "ping"})


def reply(
    *deltas: str,
    stop_reason: str | None = "end_turn",
    thinking: str | None = None,
    **start: Any,
) -> list[SseEvent]:
    """Respuesta típica: [pensamiento] + texto en varios fragmentos + cierre."""
    events = [message_start(**start), PING]
    index = 0
    if thinking is not None:
        events += thinking_block(index, thinking)
        index += 1
    events += text_block(index, *(deltas or ("Los osteoclastos ", "reabsorben hueso.")))
    events += message_end(stop_reason)
    return events


def sse_response(events: Iterable[SseEvent], *, status: int = 200) -> httpx2.Response:
    return httpx2.Response(
        status,
        headers={"content-type": "text/event-stream", "request-id": "req_prueba"},
        content=encode_upstream(events),
    )


def error_response(status: int, error_type: str, message: str = "error") -> httpx2.Response:
    """Error HTTP de la API (antes de abrirse el stream), con un texto que no debe filtrarse."""
    return httpx2.Response(
        status,
        headers={"request-id": "req_prueba", "x-detalle-interno": LEAK_CANARY},
        json={
            "type": "error",
            "error": {"type": error_type, "message": f"{message} {LEAK_CANARY}"},
        },
    )


class ScriptedStream(httpx2.AsyncByteStream):
    """Cuerpo de respuesta por trozos, con una pausa o un fallo opcional al final."""

    def __init__(
        self,
        chunks: list[bytes],
        *,
        pause_seconds: float = 0.0,
        hang: bool = False,
        fail_with: Exception | None = None,
    ) -> None:
        self._chunks = chunks
        self._pause_seconds = pause_seconds
        self._hang = hang
        self._fail_with = fail_with
        self.started = asyncio.Event()
        self.closed = False

    async def __aiter__(self):
        for chunk in self._chunks:
            yield chunk
            self.started.set()
            if self._pause_seconds:
                await asyncio.sleep(self._pause_seconds)
        if self._fail_with is not None:
            raise self._fail_with
        if self._hang:
            await asyncio.Event().wait()  # nunca termina: el stream queda abierto

    async def aclose(self) -> None:
        self.closed = True


def streamed_response(stream: ScriptedStream) -> httpx2.Response:
    return httpx2.Response(
        200,
        headers={"content-type": "text/event-stream", "request-id": "req_prueba"},
        stream=stream,
    )


def chunks_of(events: Iterable[SseEvent]) -> list[bytes]:
    """Un trozo de red por evento (más realista que entregar todo el cuerpo junto)."""
    return [encode_upstream([event]) for event in events]


# --- Anthropic simulado --------------------------------------------------------------------------


class FakeAnthropic:
    """Registra las peticiones salientes y las responde con `responder`."""

    def __init__(self) -> None:
        self.requests: list[httpx2.Request] = []
        self.responder: Callable[[httpx2.Request], httpx2.Response] = lambda request: sse_response(
            reply()
        )

    def handler(self, request: httpx2.Request) -> httpx2.Response:
        self.requests.append(request)
        return self.responder(request)

    def respond_with(self, events: Iterable[SseEvent]) -> None:
        events = list(events)
        self.responder = lambda request: sse_response(events)

    def respond_raw(self, response: httpx2.Response | Callable[[httpx2.Request], Any]) -> None:
        self.responder = response if callable(response) else lambda request: response

    def raise_on_request(self, error: Exception) -> None:
        def responder(request: httpx2.Request) -> httpx2.Response:
            raise error

        self.responder = responder

    def client(self, settings: Any):
        """`AsyncAnthropic` real, con el transporte simulado y SIN reintentos (pruebas rápidas)."""
        http_client = DefaultAsyncHttpxClient(transport=httpx2.MockTransport(self.handler))
        return build_client(settings, http_client=http_client, max_retries=0)

    @property
    def last_request(self) -> httpx2.Request:
        return self.requests[-1]

    @property
    def last_body(self) -> dict[str, Any]:
        return json.loads(self.last_request.content)


def _fake_anthropic() -> FakeAnthropic:
    return FakeAnthropic()


def _mentor_client(make_app: Callable[..., FastAPI], fake: FakeAnthropic) -> Iterator[TestClient]:
    """App con clave configurada y el cliente de Anthropic apuntando al simulacro."""
    app = make_app(anthropic_api_key=API_KEY)
    app.state.anthropic_client = fake.client(app.state.settings)
    with TestClient(app) as test_client:
        yield test_client


# Se registran como fixtures en cada módulo de pruebas con `fake = fake_fixture` (asignarlas en
# lugar de importarlas evita el F811 de ruff al usarlas como parámetros).
fake_fixture = pytest.fixture(name="fake")(_fake_anthropic)
mentor_client_fixture = pytest.fixture(name="mentor_client")(_mentor_client)


# --- Lectura de la respuesta SSE del backend -----------------------------------------------------


def parse_sse(raw: str) -> list[tuple[str, Any]]:
    """Divide una respuesta SSE en `(evento, datos)`; un comentario sale como `("comment", txt)`."""
    parsed: list[tuple[str, Any]] = []
    for frame in raw.split("\n\n"):
        if not frame.strip():
            continue
        if frame.startswith(":"):
            parsed.append(("comment", frame))
            continue
        name = data = None
        for line in frame.split("\n"):
            if line.startswith("event: "):
                name = line.removeprefix("event: ")
            elif line.startswith("data: "):
                data = json.loads(line.removeprefix("data: "))
        assert name is not None and data is not None, f"trama SSE mal formada: {frame!r}"
        parsed.append((name, data))
    return parsed


# Eventos informativos que abren o preceden al cierre (F3-05, F3-09, F3-11): no forman parte de la
# secuencia de texto y cierre que prueban los tests de streaming; se prueban en
# `test_mentor_sesion.py`. `event_names` los omite y `event_names_all` los conserva.
INFORMATIVE_EVENTS = frozenset({"sesion", "citas", "mensaje"})


def event_names_all(events: list[tuple[str, Any]]) -> list[str]:
    return [name for name, _ in events if name != "comment"]


def event_names(events: list[tuple[str, Any]]) -> list[str]:
    return [name for name in event_names_all(events) if name not in INFORMATIVE_EVENTS]


def without_informative(events: list[tuple[str, Any]]) -> list[tuple[str, Any]]:
    return [(name, data) for name, data in events if name not in INFORMATIVE_EVENTS]


def chat_body(*contents: str, **extra: Any) -> dict[str, Any]:
    """Cuerpo mínimo de `POST /api/chat` (alterna user/assistant y termina en user)."""
    if not contents:
        contents = ("¿Qué hacen los osteoclastos?",)
    roles = ["user" if (len(contents) - i) % 2 == 1 else "assistant" for i in range(len(contents))]
    return {
        "messages": [{"role": r, "content": c} for r, c in zip(roles, contents, strict=True)]
    } | extra


def post_chat(client: TestClient, headers: dict[str, str], body: dict[str, Any] | None = None):
    return client.post("/api/chat", json=chat_body() if body is None else body, headers=headers)
