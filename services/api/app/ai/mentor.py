"""Conversación con el mentor: consume el stream de Anthropic y lo convierte en eventos SSE.

Flujo de una petición a `POST /api/chat`:

    Anthropic (stream) --> MentorChat.run --> cola --> stream_chat --> cliente (SSE)

- `MentorChat.run` corre en una tarea propia (la "bomba"). Abre con `sesion`, lee los eventos del
  SDK, reenvía SOLO el texto (el pensamiento llega omitido y no se transmite) y termina siempre con
  EXACTAMENTE un evento terminal: `done` o `error`. Si la respuesta fue completa, la guarda y emite
  `citas` (las fuentes recuperadas) y `mensaje` (su id) justo antes de `usage` y `done`.
- `stream_chat` vacía la cola hacia el cliente y, si el modelo tarda, intercala `: ping` cada 15 s.
  Si el cliente se desconecta, cancela la bomba: el SDK cierra la respuesta y se libera la conexión
  con Anthropic (deja de generar y de cobrar tokens).
- El consumo de tokens se guarda en `usage_events` UNA vez por petición y en cualquier desenlace
  (éxito, error o desconexión), siempre que Anthropic ya haya informado algún uso.
"""

import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator, Callable
from typing import Any

import anthropic
from sqlalchemy.engine import Engine

from app.ai import errors, sse, store
from app.ai.usage import Usage, record_usage

logger = logging.getLogger("ova.mentor")

# Tareas de conversación en curso (referencias fuertes; ver `stream_chat`).
_RUNNING_PUMPS: set["asyncio.Task[None]"] = set()

# `stop_reason` que se informan como `done` (el modelo terminó bien su turno).
_SUCCESS_STOP_REASONS = frozenset({"end_turn", "stop_sequence"})


class MentorChat:
    """Una consulta al mentor. Se crea por petición y se ejecuta una sola vez con `run`."""

    def __init__(
        self,
        *,
        client: anthropic.AsyncAnthropic,
        request: dict[str, Any],
        engine: Engine,
        user_id: int,
        session_id: int | None = None,
        citas: list[dict[str, Any]] | None = None,
    ) -> None:
        self._client = client
        self._request = request
        self._engine = engine
        self._user_id = user_id
        # Conversación en la que se guarda la respuesta (`None`: no se guarda ni se anuncia).
        self._session_id = session_id
        self._citas = citas or []
        self._text: list[str] = []
        # Mensaje que el SDK va acumulando (se modifica en su sitio): da el uso y el modelo que
        # sirvió la respuesta aunque el stream se corte a la mitad.
        self._snapshot: Any = None
        self._usage_saved = False

    async def run(self, emit: Callable[[sse.SSEEvent], None]) -> None:
        """Emite `text`*, un `usage` si Anthropic informó el uso final y UN evento terminal.

        No lanza excepciones (salvo la cancelación por desconexión del cliente): todo fallo se
        traduce a un evento `error` del contrato.
        """
        if self._session_id is not None:
            emit(sse.session_event(self._session_id))
        try:
            message = await self._stream_text(emit)
            terminal = self._terminal_event(message)
            # Se guarda el consumo ANTES de avisar al cliente: al ver `usage`/`done` la fila existe.
            await self.persist_usage()
            if terminal.name == "done":
                await self._announce_reply(message, emit)
            if message.stop_reason is not None:
                emit(sse.usage_event(Usage.from_message(message)))
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            terminal = self._failure_event(exc)
            await self.persist_usage()  # si ya hubo uso, se registra aunque el stream falle
        emit(terminal)

    async def _announce_reply(self, message: Any, emit: Callable[[sse.SSEEvent], None]) -> None:
        """Guarda la respuesta completa y avisa de sus fuentes y de su id (antes de `usage`)."""
        if self._citas:
            emit(sse.citations_event(self._citas))
        text = "".join(self._text)
        if self._session_id is None or not text.strip():
            return
        try:
            message_id = await asyncio.shield(
                asyncio.to_thread(
                    store.save_reply,
                    self._engine,
                    self._session_id,
                    text,
                    model=str(message.model or self._request["model"]),
                    usage=Usage.from_message(message),
                    citas=self._citas,
                )
            )
        except Exception:
            # No guardar el historial no debe tumbar la respuesta que el estudiante ya leyó.
            logger.exception("No se pudo guardar la respuesta del mentor en chat_messages")
            return
        emit(sse.message_event(message_id))

    async def persist_usage(self) -> None:
        """Registra el consumo conocido en `usage_events` (una vez; no hace nada si no hubo uso)."""
        if self._usage_saved or self._snapshot is None:
            return
        self._usage_saved = True
        usage = Usage.from_message(self._snapshot)
        model = str(self._snapshot.model or self._request["model"])
        # `shield`: si cancelan esta tarea a mitad de la escritura (p. ej. una segunda cancelación
        # al desconectarse el cliente), el guardado sigue en segundo plano en lugar de perderse.
        await asyncio.shield(self._write_usage(model, usage))

    async def _write_usage(self, model: str, usage: Usage) -> None:
        try:
            await asyncio.to_thread(record_usage, self._engine, self._user_id, model, usage)
        except Exception:
            # Un fallo de contabilidad no debe tumbar la respuesta que el estudiante ya recibió.
            logger.exception("No se pudo registrar el consumo del mentor en usage_events")

    async def _stream_text(self, emit: Callable[[sse.SSEEvent], None]) -> Any:
        """Lee el stream de Anthropic reenviando el texto. Devuelve el mensaje acumulado."""
        async with self._client.beta.messages.stream(**self._request) as stream:
            async for event in stream:
                if event.type == "message_start":
                    self._snapshot = stream.current_message_snapshot
                elif event.type == "content_block_delta":
                    # Solo texto: los bloques de pensamiento (vacíos por defecto) no se reenvían.
                    if event.delta.type == "text_delta" and event.delta.text:
                        self._text.append(event.delta.text)
                        emit(sse.text_event(event.delta.text))
                elif event.type == "content_block_start" and event.content_block.type == "fallback":
                    logger.info(
                        "Rechazo de seguridad: el fallback del servidor siguió la respuesta en %s",
                        event.content_block.to.model,
                    )
        if self._snapshot is None:  # el stream se cerró sin mensaje alguno
            raise errors.IncompleteResponseError("El stream terminó sin message_start")
        return self._snapshot

    def _terminal_event(self, message: Any) -> sse.SSEEvent:
        """`done` si el modelo terminó su turno; `error` en cualquier otro desenlace."""
        stop_reason = message.stop_reason
        if stop_reason in _SUCCESS_STOP_REASONS:
            return sse.done_event(stop_reason)
        if stop_reason == "refusal":
            # Solo se registra la categoría; la explicación no se envía al estudiante.
            details = message.stop_details
            logger.info(
                "El mentor rechazó una consulta (categoría: %s)", details and details.category
            )
            return sse.error_event(errors.CODE_REFUSAL, errors.MESSAGE_REFUSAL)
        if stop_reason == "max_tokens":
            logger.warning("Respuesta del mentor cortada por max_tokens (%s)", message.model)
            return sse.error_event(errors.CODE_MAX_TOKENS, errors.MESSAGE_MAX_TOKENS)
        if stop_reason is None:  # el proveedor cerró la conexión sin `message_delta`
            logger.warning("El stream de Anthropic se cortó antes de informar el stop_reason")
        else:  # `tool_use`, `pause_turn`, ...: no deberían ocurrir sin herramientas
            logger.error("El mentor terminó con un stop_reason inesperado: %r", stop_reason)
        return sse.error_event(errors.CODE_UPSTREAM_ERROR, errors.MESSAGE_INCOMPLETE)

    def _failure_event(self, exc: Exception) -> sse.SSEEvent:
        failure = errors.classify_upstream_error(exc)
        request_id = getattr(exc, "request_id", None)
        log = logger.warning if failure.transient else logger.error
        # Solo tipo y estado: sin cabeceras ni cuerpo de la petición (llevan datos del estudiante).
        log(
            "Fallo del mentor (%s, estado=%s, request_id=%s) -> %s",
            type(exc).__name__,
            getattr(exc, "status_code", None),
            request_id,
            failure.code,
            exc_info=None if failure.transient else exc,
        )
        return sse.error_event(failure.code, failure.message)


async def _pump(chat: MentorChat, queue: "asyncio.Queue[sse.SSEEvent | None]") -> None:
    """Ejecuta la conversación volcando sus eventos a la cola. `None` marca el final."""
    try:
        await chat.run(queue.put_nowait)
    finally:
        # También si la cancelaron: el consumo parcial se registra igual (idempotente).
        await chat.persist_usage()
        queue.put_nowait(None)


async def stream_chat(chat: MentorChat, *, ping_interval: float) -> AsyncIterator[bytes]:
    """Tramas SSE de la respuesta: los eventos de `chat` y un `: ping` tras cada silencio largo."""
    queue: asyncio.Queue[sse.SSEEvent | None] = asyncio.Queue()
    pump = asyncio.create_task(_pump(chat, queue), name="mentor-chat")
    # El bucle de eventos solo guarda referencias débiles a las tareas: se retiene la bomba hasta
    # que termine, aunque este generador ya haya salido (p. ej. tras una desconexión).
    _RUNNING_PUMPS.add(pump)
    pump.add_done_callback(_RUNNING_PUMPS.discard)
    try:
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=ping_interval)
            except TimeoutError:
                yield sse.PING_FRAME
                continue
            if item is None:
                return
            yield item.encode()
    finally:
        # Desconexión del cliente (o fin normal): si la bomba sigue viva, se cancela, y con ella la
        # petición a Anthropic. Se espera con `shield` por una razón concreta: Starlette sirve la
        # respuesta dentro de un ámbito de cancelación de anyio que, tras una desconexión, sigue
        # cancelado y hace fallar CUALQUIER `await` de esta tarea; y una tarea cancelada cancela
        # también a la que está esperando. Sin `shield` la bomba recibiría una segunda cancelación
        # justo mientras guarda el consumo y lo perdería. Con `shield` la bomba termina sola.
        pump.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await asyncio.shield(pump)
