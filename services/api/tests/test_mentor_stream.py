"""Desenlaces del stream del mentor: rechazos, cortes, fallos y desconexión (F1-07)."""

import asyncio
import logging
from typing import Any

import anthropic
import anyio
import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.ai import errors, sse
from app.ai.client import build_request
from app.ai.mentor import MentorChat, stream_chat
from app.models.usage import UsageEvent
from app.schemas.chat import ChatMessage
from tests import test_mentor_fakes as fakes
from tests.test_mentor_fakes import (
    API_KEY,
    LEAK_CANARY,
    error_response,
    event_names,
    message_end,
    message_start,
    parse_sse,
    post_chat,
    text_block,
    without_informative,
)

fake = fakes.fake_fixture
mentor_client = fakes.mentor_client_fixture

# Nada de esto debe llegar jamás al estudiante.
FORBIDDEN_IN_RESPONSE = (
    LEAK_CANARY,
    "req_prueba",  # request-id del proveedor
    "x-detalle-interno",
    API_KEY,
    "Traceback",
    "anthropic",
    "httpx",
)


def usage_rows(db_session: Session) -> list[UsageEvent]:
    db_session.expire_all()
    return list(db_session.exec(select(UsageEvent).order_by(UsageEvent.id)))


def assert_single_terminal(events: list[tuple[str, Any]], expected: str) -> None:
    """Exactamente un evento terminal (`done` o `error`) y es el último."""
    names = event_names(events)
    assert [n for n in names if n in ("done", "error")] == [expected]
    assert names[-1] == expected


def assert_no_leak(raw: str) -> None:
    for forbidden in FORBIDDEN_IN_RESPONSE:
        assert forbidden not in raw, f"se filtró {forbidden!r} al cliente"


# --- Rechazo de seguridad (refusal) ---------------------------------------------------------------


def test_refusal_emite_usage_y_error_refusal_con_mensaje_amable(
    mentor_client: TestClient, fake, auth, db_session
):
    fake.respond_with(
        [
            message_start(input_tokens=90),
            *text_block(0, "Voy a expl"),
            *message_end(
                "refusal",
                output_tokens=4,
                stop_details={
                    "type": "refusal",
                    "category": "cyber",
                    "explanation": "EXPLICACION-INTERNA-DEL-CLASIFICADOR",
                },
            ),
        ]
    )
    response = post_chat(mentor_client, auth["headers"])
    assert response.status_code == 200  # el rechazo llega como evento, no como HTTP de error
    events = without_informative(parse_sse(response.text))

    assert event_names(events) == ["text", "usage", "error"]
    assert_single_terminal(events, "error")
    assert events[-1][1] == {"code": "refusal", "message": errors.MESSAGE_REFUSAL}
    assert "Lo siento" in errors.MESSAGE_REFUSAL  # mensaje amable, en español
    # Ni la explicación del clasificador ni su categoría se le cuentan al estudiante.
    assert "EXPLICACION-INTERNA" not in response.text
    assert "cyber" not in response.text
    # El consumo del intento rechazado se registra igual.
    (row,) = usage_rows(db_session)
    assert (row.input_tokens, row.output_tokens) == (90, 4)


def test_refusal_antes_de_generar_texto(mentor_client: TestClient, fake, auth):
    fake.respond_with(
        [
            message_start(),
            *message_end("refusal", output_tokens=0, stop_details={"type": "refusal"}),
        ]
    )
    events = without_informative(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert event_names(events) == ["usage", "error"]
    assert events[-1][1]["code"] == "refusal"


def test_refusal_sin_stop_details_tambien_se_reconoce(mentor_client: TestClient, fake, auth):
    # `stop_details` puede ser null incluso en un rechazo: manda `stop_reason`.
    fake.respond_with([message_start(), *message_end("refusal", output_tokens=0)])
    events = without_informative(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert events[-1][1]["code"] == "refusal"


def test_el_fallback_del_servidor_a_mitad_de_respuesta_es_transparente(
    mentor_client: TestClient, fake, auth, db_session
):
    # Un clasificador rechaza a mitad del stream y el servidor continúa en otro modelo: el texto
    # ya entregado sigue valiendo, el bloque `fallback` no llega al cliente y el consumo se
    # registra contra el modelo que terminó la respuesta.
    fallback_block = (
        "content_block_start",
        {
            "type": "content_block_start",
            "index": 1,
            "content_block": {
                "type": "fallback",
                "from": {"model": "claude-opus-5"},
                "to": {"model": "claude-opus-4-8"},
                "trigger": {"type": "refusal", "category": "cyber"},
            },
        },
    )
    fake.respond_with(
        [
            message_start(model="claude-opus-5"),
            *text_block(0, "Primera parte. "),
            fallback_block,
            ("content_block_stop", {"type": "content_block_stop", "index": 1}),
            *text_block(2, "Segunda parte."),
            *message_end("end_turn", output_tokens=30),
        ]
    )
    response = post_chat(mentor_client, auth["headers"])
    events = without_informative(parse_sse(response.text))
    assert [d["delta"] for n, d in events if n == "text"] == ["Primera parte. ", "Segunda parte."]
    assert_single_terminal(events, "done")
    assert "fallback" not in response.text
    assert usage_rows(db_session)[0].model == "claude-opus-4-8"


# --- max_tokens ----------------------------------------------------------------------------------


def test_max_tokens_conserva_el_texto_y_termina_con_error_max_tokens(
    mentor_client: TestClient, fake, auth, db_session
):
    fake.respond_with(
        [
            message_start(input_tokens=10),
            *text_block(0, "Texto largo que se corta"),
            *message_end("max_tokens", output_tokens=16000),
        ]
    )
    events = without_informative(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert event_names(events) == ["text", "usage", "error"]
    assert_single_terminal(events, "error")
    assert events[-1][1] == {"code": "max_tokens", "message": errors.MESSAGE_MAX_TOKENS}
    assert dict(events)["usage"]["output_tokens"] == 16000
    assert usage_rows(db_session)[0].output_tokens == 16000


@pytest.mark.parametrize("stop_reason", ["pause_turn", "tool_use", "compaction"])
def test_stop_reason_inesperado_es_upstream_error(
    mentor_client: TestClient, fake, auth, stop_reason
):
    fake.respond_with([message_start(), *text_block(0, "x"), *message_end(stop_reason)])
    events = without_informative(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert_single_terminal(events, "error")
    assert events[-1][1]["code"] == "upstream_error"


def test_stop_sequence_cuenta_como_fin_normal(mentor_client: TestClient, fake, auth):
    fake.respond_with([message_start(), *text_block(0, "x"), *message_end("stop_sequence")])
    events = without_informative(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert events[-1] == ("done", {"stop_reason": "stop_sequence"})


# --- Errores HTTP del proveedor (antes de abrirse el stream) --------------------------------------

UPSTREAM_HTTP_ERRORS = [
    (429, "rate_limit_error", "rate_limited", errors.MESSAGE_RATE_LIMITED),
    (500, "api_error", "upstream_error", errors.MESSAGE_UPSTREAM),
    (503, "api_error", "upstream_error", errors.MESSAGE_UPSTREAM),
    (504, "timeout_error", "upstream_error", errors.MESSAGE_TIMEOUT),
    (529, "overloaded_error", "upstream_error", errors.MESSAGE_OVERLOADED),
    (401, "authentication_error", "upstream_error", errors.MESSAGE_UPSTREAM),
    (403, "permission_error", "upstream_error", errors.MESSAGE_UPSTREAM),
    (404, "not_found_error", "upstream_error", errors.MESSAGE_UPSTREAM),
    (400, "invalid_request_error", "upstream_error", errors.MESSAGE_UPSTREAM),
    (402, "billing_error", "upstream_error", errors.MESSAGE_UPSTREAM),
    (413, "request_too_large", "upstream_error", errors.MESSAGE_UPSTREAM),
]


@pytest.mark.parametrize(
    ("status", "error_type", "code", "message"),
    UPSTREAM_HTTP_ERRORS,
    ids=[f"{status}-{error_type}" for status, error_type, _, _ in UPSTREAM_HTTP_ERRORS],
)
def test_error_http_del_proveedor_se_traduce_al_codigo_del_contrato(
    mentor_client: TestClient, fake, auth, db_session, status, error_type, code, message
):
    fake.respond_raw(error_response(status, error_type))
    response = post_chat(mentor_client, auth["headers"])

    assert response.status_code == 200  # ya se abrió el stream: el fallo viaja como evento
    events = without_informative(parse_sse(response.text))
    assert event_names(events) == ["error"]  # sin texto ni usage
    assert events[0][1] == {"code": code, "message": message}
    assert_no_leak(response.text)
    assert usage_rows(db_session) == []  # sin respuesta no hubo consumo que registrar


def test_el_estudiante_puede_reintentar_tras_un_error_del_proveedor(
    mentor_client: TestClient, fake, auth
):
    fake.respond_raw(error_response(500, "api_error"))
    assert event_names(parse_sse(post_chat(mentor_client, auth["headers"]).text)) == ["error"]
    fake.respond_with(fakes.reply("Ya funciona."))
    assert event_names(parse_sse(post_chat(mentor_client, auth["headers"]).text))[-1] == "done"


NETWORK_FAILURES = [
    (httpx2.ConnectTimeout("no conecta"), errors.MESSAGE_TIMEOUT),
    (httpx2.ReadTimeout("no responde"), errors.MESSAGE_TIMEOUT),
    (httpx2.ConnectError("sin red"), errors.MESSAGE_CONNECTION),
    (httpx2.RemoteProtocolError("corte"), errors.MESSAGE_CONNECTION),
]


@pytest.mark.parametrize(
    ("failure", "message"), NETWORK_FAILURES, ids=[type(f).__name__ for f, _ in NETWORK_FAILURES]
)
def test_fallo_de_red_al_abrir_la_conexion(mentor_client: TestClient, fake, auth, failure, message):
    fake.raise_on_request(failure)
    response = post_chat(mentor_client, auth["headers"])
    events = without_informative(parse_sse(response.text))
    assert event_names(events) == ["error"]
    assert events[0][1] == {"code": "upstream_error", "message": message}
    assert_no_leak(response.text)
    assert "no conecta" not in response.text
    assert "sin red" not in response.text


def test_un_error_inesperado_dentro_del_generador_no_filtra_detalles(
    mentor_client: TestClient, fake, auth, caplog
):
    # (Un fallo al abrir la conexión lo envuelve el SDK en APIConnectionError; uno con el stream
    # abierto llega tal cual, y es el caso de un error inesperado nuestro o de una librería.)
    stream = fakes.ScriptedStream(
        fakes.chunks_of([message_start()]),
        fail_with=RuntimeError(f"fallo interno {LEAK_CANARY} {API_KEY}"),
    )
    fake.respond_raw(fakes.streamed_response(stream))
    with caplog.at_level(logging.WARNING, logger="ova.mentor"):
        response = post_chat(mentor_client, auth["headers"])
    events = without_informative(parse_sse(response.text))
    assert events == [("error", {"code": "upstream_error", "message": errors.MESSAGE_UPSTREAM})]
    assert_no_leak(response.text)
    # Un error nuestro se registra como ERROR (con traza) en el servidor.
    assert any(record.levelno == logging.ERROR for record in caplog.records)


def test_un_rate_limit_del_proveedor_se_registra_como_aviso_no_como_error(
    mentor_client: TestClient, fake, auth, caplog
):
    fake.respond_raw(error_response(429, "rate_limit_error"))
    with caplog.at_level(logging.INFO, logger="ova.mentor"):
        post_chat(mentor_client, auth["headers"])
    assert [r.levelno for r in caplog.records if r.name == "ova.mentor"] == [logging.WARNING]
    assert "req_prueba" in caplog.text  # el request_id sí queda en el log del servidor
    assert API_KEY not in caplog.text


# --- Fallos con el stream ya abierto --------------------------------------------------------------


@pytest.mark.parametrize(
    ("error_type", "code", "message"),
    [
        ("overloaded_error", "upstream_error", errors.MESSAGE_OVERLOADED),
        ("rate_limit_error", "rate_limited", errors.MESSAGE_RATE_LIMITED),
        ("api_error", "upstream_error", errors.MESSAGE_UPSTREAM),
    ],
)
def test_evento_error_del_proveedor_a_mitad_del_stream(
    mentor_client: TestClient, fake, auth, db_session, error_type, code, message
):
    fake.respond_with(
        [
            message_start(input_tokens=64),
            *text_block(0, "Empecé a respon"),
            ("error", {"type": "error", "error": {"type": error_type, "message": LEAK_CANARY}}),
        ]
    )
    response = post_chat(mentor_client, auth["headers"])
    events = without_informative(parse_sse(response.text))

    assert event_names(events) == ["text", "error"]  # sin `usage`: el proveedor no informó el final
    assert_single_terminal(events, "error")
    assert events[-1][1] == {"code": code, "message": message}
    assert_no_leak(response.text)
    # Aunque falló, ya había uso conocido (tokens de entrada de message_start): se registra.
    (row,) = usage_rows(db_session)
    assert row.input_tokens == 64


def test_corte_de_red_a_mitad_del_stream(mentor_client: TestClient, fake, auth, db_session):
    events = [message_start(input_tokens=33), *text_block(0, "Parte inicial")]
    stream = fakes.ScriptedStream(
        fakes.chunks_of(events[:-1]), fail_with=httpx2.ReadError(f"conexión rota {LEAK_CANARY}")
    )
    fake.respond_raw(fakes.streamed_response(stream))
    response = post_chat(mentor_client, auth["headers"])
    parsed = without_informative(parse_sse(response.text))

    assert event_names(parsed) == ["text", "error"]
    assert parsed[-1][1] == {"code": "upstream_error", "message": errors.MESSAGE_CONNECTION}
    assert_no_leak(response.text)
    assert usage_rows(db_session)[0].input_tokens == 33
    assert stream.closed  # la conexión con el proveedor se liberó


def test_timeout_de_lectura_a_mitad_del_stream(mentor_client: TestClient, fake, auth):
    stream = fakes.ScriptedStream(
        fakes.chunks_of([message_start(), *text_block(0, "x")][:-1]),
        fail_with=httpx2.ReadTimeout("lectura"),
    )
    fake.respond_raw(fakes.streamed_response(stream))
    parsed = without_informative(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert parsed[-1][1] == {"code": "upstream_error", "message": errors.MESSAGE_TIMEOUT}


def test_stream_cortado_sin_mensaje_final_es_upstream_error(
    mentor_client: TestClient, fake, auth, db_session
):
    # Anthropic cerró la conexión sin `message_delta` ni `message_stop`.
    fake.respond_with([message_start(input_tokens=12), *text_block(0, "Se corta")])
    events = without_informative(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert event_names(events) == ["text", "error"]  # sin `usage`: no hubo cifra final
    assert events[-1][1] == {"code": "upstream_error", "message": errors.MESSAGE_INCOMPLETE}
    assert usage_rows(db_session)[0].input_tokens == 12


def test_respuesta_vacia_del_proveedor_es_upstream_error(
    mentor_client: TestClient, fake, auth, db_session
):
    fake.respond_with([])
    events = without_informative(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert events == [("error", {"code": "upstream_error", "message": errors.MESSAGE_INCOMPLETE})]
    assert usage_rows(db_session) == []


# --- Clasificación de excepciones ----------------------------------------------------------------

_REQUEST = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")


def _status_error(cls: type[anthropic.APIStatusError], status: int, error_type: str | None):
    response = httpx2.Response(status, request=_REQUEST)
    body = {"type": "error", "error": {"type": error_type, "message": "m"}} if error_type else None
    return cls("m", response=response, body=body)


CLASSIFICATION = [
    (_status_error(anthropic.RateLimitError, 429, "rate_limit_error"), errors.RATE_LIMITED),
    (_status_error(anthropic.OverloadedError, 529, "overloaded_error"), errors.OVERLOADED),
    (_status_error(anthropic.InternalServerError, 500, "api_error"), errors.UPSTREAM),
    (_status_error(anthropic.InternalServerError, 502, None), errors.UPSTREAM),
    (_status_error(anthropic.ServiceUnavailableError, 503, None), errors.UPSTREAM),
    (
        _status_error(anthropic.AuthenticationError, 401, "authentication_error"),
        errors.UPSTREAM_MISCONFIGURED,
    ),
    (_status_error(anthropic.PermissionDeniedError, 403, None), errors.UPSTREAM_MISCONFIGURED),
    (_status_error(anthropic.NotFoundError, 404, "not_found_error"), errors.UPSTREAM_MISCONFIGURED),
    (
        _status_error(anthropic.BadRequestError, 400, "invalid_request_error"),
        errors.UPSTREAM_MISCONFIGURED,
    ),
    # Error dentro de un stream ya abierto: HTTP 200, manda el tipo del cuerpo.
    (_status_error(anthropic.APIStatusError, 200, "overloaded_error"), errors.OVERLOADED),
    (_status_error(anthropic.APIStatusError, 200, "rate_limit_error"), errors.RATE_LIMITED),
    (_status_error(anthropic.APIStatusError, 200, "api_error"), errors.UPSTREAM),
    (_status_error(anthropic.APIStatusError, 200, None), errors.UPSTREAM_MISCONFIGURED),
    (anthropic.APITimeoutError(_REQUEST), errors.TIMEOUT),
    (anthropic.APIConnectionError(request=_REQUEST), errors.CONNECTION),
    (anthropic.APIError("m", _REQUEST, body=None), errors.UPSTREAM_MISCONFIGURED),
    (httpx2.ReadTimeout("t"), errors.TIMEOUT),
    (httpx2.ConnectError("c"), errors.CONNECTION),
    (httpx2.ReadError("r"), errors.CONNECTION),
    (errors.IncompleteResponseError("x"), errors.INCOMPLETE),
    (anthropic.AnthropicError("x"), errors.UPSTREAM_MISCONFIGURED),
    (ValueError("cualquier otra cosa"), errors.UPSTREAM_MISCONFIGURED),
    (KeyError("k"), errors.UPSTREAM_MISCONFIGURED),
]


@pytest.mark.parametrize(
    ("exc", "expected"),
    CLASSIFICATION,
    ids=[f"{type(e).__name__}-{i}" for i, (e, _) in enumerate(CLASSIFICATION)],
)
def test_clasificacion_de_excepciones(exc, expected):
    assert errors.classify_upstream_error(exc) == expected


def test_la_cadena_va_de_lo_especifico_a_lo_general():
    # APITimeoutError es un APIConnectionError: la regla específica debe ganar.
    assert issubclass(anthropic.APITimeoutError, anthropic.APIConnectionError)
    assert errors.classify_upstream_error(anthropic.APITimeoutError(_REQUEST)) is errors.TIMEOUT
    # RateLimitError es un APIStatusError: gana el 429.
    error = _status_error(anthropic.RateLimitError, 429, None)
    assert errors.classify_upstream_error(error) is errors.RATE_LIMITED


def test_solo_se_usan_los_codigos_del_contrato():
    allowed = {"refusal", "max_tokens", "upstream_error", "rate_limited"}
    codes = {failure.code for _, failure in CLASSIFICATION}
    assert codes <= allowed
    assert {errors.CODE_REFUSAL, errors.CODE_MAX_TOKENS} <= allowed


def test_los_mensajes_al_cliente_son_texto_fijo_en_espanol_sin_detalles():
    for message in (
        errors.MESSAGE_REFUSAL,
        errors.MESSAGE_MAX_TOKENS,
        errors.MESSAGE_UPSTREAM,
        errors.MESSAGE_OVERLOADED,
        errors.MESSAGE_TIMEOUT,
        errors.MESSAGE_CONNECTION,
        errors.MESSAGE_INCOMPLETE,
        errors.MESSAGE_RATE_LIMITED,
    ):
        assert message and message[0].isupper() and message.endswith(".")
        assert "anthropic" not in message.lower()
        assert "claude" not in message.lower()


# --- Unidad: ping y desconexión del cliente -------------------------------------------------------


def _chat(fake, settings, engine, user_id: int) -> tuple[MentorChat, Any]:
    settings = settings.model_copy(update={"anthropic_api_key": API_KEY})
    client = fake.client(settings)
    chat = MentorChat(
        client=client,
        request=build_request(settings, [ChatMessage(role="user", content="Hola")]),
        engine=engine,
        user_id=user_id,
    )
    return chat, client


def test_stream_chat_intercala_ping_mientras_el_modelo_calla(fake, settings, engine, auth):
    upstream = fakes.ScriptedStream(fakes.chunks_of([message_start()]), hang=True)
    fake.respond_raw(fakes.streamed_response(upstream))

    async def scenario() -> list[bytes]:
        chat, client = _chat(fake, settings, engine, auth["user"]["id"])
        frames = stream_chat(chat, ping_interval=0.02)
        try:
            return [await asyncio.wait_for(anext(frames), 5) for _ in range(3)]
        finally:
            await frames.aclose()
            await client.close()

    assert asyncio.run(scenario()) == [sse.PING_FRAME] * 3
    assert upstream.closed


def test_al_desconectarse_el_cliente_se_cancela_la_peticion_a_anthropic(
    fake, settings, engine, auth, db_session
):
    events = [message_start(input_tokens=25), *text_block(0, "Empieza")]
    upstream = fakes.ScriptedStream(fakes.chunks_of(events[:-1]), hang=True)  # nunca termina
    fake.respond_raw(fakes.streamed_response(upstream))

    async def scenario() -> None:
        chat, client = _chat(fake, settings, engine, auth["user"]["id"])
        frames = stream_chat(chat, ping_interval=30)
        try:
            first = await asyncio.wait_for(anext(frames), 5)
            assert first.startswith(b"event: text")
            assert not upstream.closed  # el proveedor sigue generando
            await frames.aclose()  # el cliente se desconectó
            assert upstream.closed  # la respuesta HTTP a Anthropic se cerró
        finally:
            await client.close()

    asyncio.run(scenario())
    # Lo consumido hasta la desconexión se registra igual.
    (row,) = usage_rows(db_session)
    assert row.input_tokens == 25


def test_cancelar_la_tarea_que_sirve_la_respuesta_tambien_cancela_la_peticion(
    fake, settings, engine, auth, db_session
):
    # Así reacciona Starlette ante una desconexión: cancela la tarea que envía la respuesta.
    events = [message_start(input_tokens=25), *text_block(0, "Empieza")]
    upstream = fakes.ScriptedStream(fakes.chunks_of(events[:-1]), hang=True)
    fake.respond_raw(fakes.streamed_response(upstream))

    async def scenario() -> None:
        chat, client = _chat(fake, settings, engine, auth["user"]["id"])
        got_text = asyncio.Event()

        async def serve() -> None:
            async for frame in stream_chat(chat, ping_interval=30):
                if frame.startswith(b"event: text"):
                    got_text.set()

        task = asyncio.create_task(serve())
        try:
            await asyncio.wait_for(got_text.wait(), 5)
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task
            assert upstream.closed
        finally:
            await client.close()

    asyncio.run(scenario())
    assert usage_rows(db_session)[0].input_tokens == 25


def test_desconexion_con_un_ambito_de_cancelacion_de_anyio_como_el_de_starlette(
    fake, settings, engine, auth, db_session
):
    # Starlette sirve la respuesta dentro de un grupo de tareas de anyio y, al detectar la
    # desconexión, cancela su ámbito. Ese ámbito sigue cancelado (cualquier `await` posterior de la
    # tarea vuelve a lanzar CancelledError), y una tarea cancelada arrastra a la que espera: la
    # bomba se cancelaría por segunda vez a mitad de guardar el consumo. Esto lo reproduce.
    events = [message_start(input_tokens=25), *text_block(0, "Empieza")]
    upstream = fakes.ScriptedStream(fakes.chunks_of(events[:-1]), hang=True)
    fake.respond_raw(fakes.streamed_response(upstream))

    async def scenario() -> None:
        chat, client = _chat(fake, settings, engine, auth["user"]["id"])
        try:
            with anyio.CancelScope() as scope:
                async for frame in stream_chat(chat, ping_interval=30):
                    if frame.startswith(b"event: text"):
                        scope.cancel()  # el cliente se desconectó
            assert scope.cancelled_caught
            # La bomba termina por su cuenta: libera la conexión y guarda el consumo parcial.
            for _ in range(200):
                if upstream.closed and usage_rows(db_session):
                    break
                await asyncio.sleep(0.025)
            assert upstream.closed
        finally:
            await client.close()

    asyncio.run(scenario())
    (row,) = usage_rows(db_session)
    assert row.input_tokens == 25


def test_el_uso_se_registra_una_sola_vez_aunque_haya_desconexion_tras_el_final(
    fake, settings, engine, auth, db_session
):
    fake.respond_with(fakes.reply("Listo."))

    async def scenario() -> None:
        chat, client = _chat(fake, settings, engine, auth["user"]["id"])
        frames = stream_chat(chat, ping_interval=30)
        try:
            names = []
            async for frame in frames:
                names.append(frame.split(b"\n", 1)[0])
            assert names[-1] == b"event: done"
        finally:
            await client.close()

    asyncio.run(scenario())
    assert len(usage_rows(db_session)) == 1


def test_sin_uso_conocido_no_se_registra_nada(fake, settings, engine, auth, db_session):
    fake.raise_on_request(httpx2.ConnectError("sin red"))

    async def scenario() -> list[bytes]:
        chat, client = _chat(fake, settings, engine, auth["user"]["id"])
        try:
            return [frame async for frame in stream_chat(chat, ping_interval=30)]
        finally:
            await client.close()

    frames = asyncio.run(scenario())
    assert len(frames) == 1 and frames[0].startswith(b"event: error")
    assert usage_rows(db_session) == []
