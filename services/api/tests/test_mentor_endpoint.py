"""`POST /api/chat`: auth, validación, límites, 503 y secuencia de eventos SSE (F1-07)."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.ai import sse
from app.models.usage import UsageEvent
from tests import test_mentor_fakes as fakes
from tests.test_mentor_fakes import (
    API_KEY,
    chat_body,
    event_names,
    message_end,
    message_start,
    parse_sse,
    post_chat,
    reply,
    text_block,
    thinking_block,
    without_informative,
)

fake = fakes.fake_fixture
mentor_client = fakes.mentor_client_fixture


def usage_rows(db_session: Session) -> list[UsageEvent]:
    db_session.expire_all()
    return list(db_session.exec(select(UsageEvent).order_by(UsageEvent.id)))


# --- Autenticación y validación ------------------------------------------------------------------


def test_sin_token_401(mentor_client: TestClient, fake):
    response = mentor_client.post("/api/chat", json=chat_body())
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "token_invalido"
    assert not fake.requests


@pytest.mark.parametrize("header", ["Bearer no-es-un-jwt", "Basic abc", "Bearer "])
def test_token_invalido_401(mentor_client: TestClient, fake, header):
    response = mentor_client.post("/api/chat", json=chat_body(), headers={"Authorization": header})
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "token_invalido"
    assert not fake.requests


def test_token_de_usuario_borrado_401(mentor_client: TestClient, fake, auth, db_session):
    from app.models.user import User

    db_session.delete(db_session.get(User, auth["user"]["id"]))
    db_session.commit()
    assert post_chat(mentor_client, auth["headers"]).status_code == 401
    assert not fake.requests


def _too_many(count: int) -> dict[str, Any]:
    roles = ["user" if (count - i) % 2 == 1 else "assistant" for i in range(count)]
    return {"messages": [{"role": role, "content": "x"} for role in roles]}


INVALID_BODIES = {
    "ultimo_mensaje_del_asistente": {
        "messages": [
            {"role": "user", "content": "Hola"},
            {"role": "assistant", "content": "Hola"},
        ]
    },
    "cuarenta_y_un_mensajes": _too_many(41),
    "sin_mensajes": {"messages": []},
    "sin_campo_messages": {},
    "contenido_vacio": {"messages": [{"role": "user", "content": ""}]},
    "contenido_de_8001_caracteres": {"messages": [{"role": "user", "content": "x" * 8001}]},
    "contenido_solo_espacios": {"messages": [{"role": "user", "content": "   "}]},
    "rol_invalido": {"messages": [{"role": "system", "content": "hola"}]},
    "contexto_con_modulo_9": chat_body(
        contexto={
            "modulo": 9,
            "seccion": "x",
            "nivel": "pregrado",
            "tiempoEnSeccionSeg": 0,
            "interaccionesRecientes": [],
            "progreso": {"modulosCompletados": [], "puntajeTotal": 0, "logros": []},
        }
    ),
    "contexto_no_es_un_objeto": chat_body(contexto="hola"),
}


@pytest.mark.parametrize("name", INVALID_BODIES)
def test_cuerpo_invalido_422_sin_llamar_a_anthropic(mentor_client: TestClient, fake, auth, name):
    response = post_chat(mentor_client, auth["headers"], INVALID_BODIES[name])
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)  # formato por defecto de FastAPI
    assert not fake.requests


def test_cuerpo_al_limite_es_valido(mentor_client: TestClient, auth):
    messages = _too_many(40)["messages"]
    body = {"messages": [*messages[:-1], {"role": "user", "content": "x" * 8000}]}
    assert post_chat(mentor_client, auth["headers"], body).status_code == 200


def test_json_mal_formado_422(mentor_client: TestClient, auth, fake):
    response = mentor_client.post(
        "/api/chat",
        content="{no es json",
        headers={**auth["headers"], "Content-Type": "application/json"},
    )
    assert response.status_code == 422
    assert not fake.requests


# --- 503 sin clave -------------------------------------------------------------------------------


def test_sin_clave_503_ia_no_configurada_antes_de_abrir_el_stream(make_app, fake, auth):
    app = make_app(anthropic_api_key="")
    app.state.anthropic_client = fake.client(app.state.settings)
    with TestClient(app) as client:
        response = post_chat(client, auth["headers"])
    assert response.status_code == 503
    assert response.headers["content-type"] == "application/json"  # no es un stream
    assert response.json()["detail"]["code"] == "ia_no_configurada"
    assert response.json()["detail"]["message"]
    assert not fake.requests


def test_clave_solo_con_espacios_tambien_es_503(make_app, fake, auth):
    app = make_app(anthropic_api_key="   ")
    with TestClient(app) as client:
        assert post_chat(client, auth["headers"]).status_code == 503


def test_sin_clave_y_sin_token_gana_el_401(make_app, auth):
    app = make_app(anthropic_api_key="")
    with TestClient(app) as client:
        assert client.post("/api/chat", json=chat_body()).status_code == 401


def test_el_503_no_consume_cupo_del_limite(make_app, fake, auth):
    app = make_app(anthropic_api_key="")
    with TestClient(app) as client:
        for _ in range(25):
            assert post_chat(client, auth["headers"]).status_code == 503


# --- 429 por usuario -----------------------------------------------------------------------------


def test_limite_de_20_por_minuto_y_por_usuario(mentor_client: TestClient, fake, auth, register):
    for _ in range(20):
        assert post_chat(mentor_client, auth["headers"]).status_code == 200
    blocked = post_chat(mentor_client, auth["headers"])
    assert blocked.status_code == 429
    assert blocked.json()["detail"]["code"] == "demasiados_intentos"
    assert 1 <= int(blocked.headers["retry-after"]) <= 60
    assert len(fake.requests) == 20  # la petición 21 no llegó a Anthropic

    # Otro estudiante tiene su propio cupo.
    other = register(numero_identificacion="5550001111")
    assert post_chat(mentor_client, other["headers"]).status_code == 200


def test_las_peticiones_invalidas_no_consumen_cupo(mentor_client: TestClient, fake, auth):
    for _ in range(30):
        assert post_chat(mentor_client, auth["headers"], {"messages": []}).status_code == 422
    assert post_chat(mentor_client, auth["headers"]).status_code == 200


def test_el_cupo_del_chat_no_se_comparte_con_login(mentor_client: TestClient, fake, auth):
    for _ in range(20):
        assert post_chat(mentor_client, auth["headers"]).status_code == 200
    # login/register usan el limitador por IP: un cubo distinto.
    assert mentor_client.get("/api/me", headers=auth["headers"]).status_code == 200


# --- Respuesta SSE -------------------------------------------------------------------------------


def test_cabeceras_de_la_respuesta_sse(mentor_client: TestClient, fake, auth):
    response = post_chat(mentor_client, auth["headers"])
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["x-accel-buffering"] == "no"


def test_secuencia_de_eventos_varios_text_usage_y_done(mentor_client: TestClient, fake, auth):
    fake.respond_with(
        [
            message_start(input_tokens=120, cache_read=80, cache_creation=30),
            *text_block(0, "Los osteoclastos ", "son células ", "gigantes ", "multinucleadas."),
            *message_end("end_turn", output_tokens=42),
        ]
    )
    response = post_chat(mentor_client, auth["headers"])
    events = without_informative(parse_sse(response.text))

    assert event_names(events) == ["text", "text", "text", "text", "usage", "done"]
    assert [data["delta"] for name, data in events if name == "text"] == [
        "Los osteoclastos ",
        "son células ",
        "gigantes ",
        "multinucleadas.",
    ]
    assert dict(events)["usage"] == {
        "input_tokens": 120,
        "output_tokens": 42,
        "cache_read_input_tokens": 80,
        "cache_creation_input_tokens": 30,
    }
    assert dict(events)["done"] == {"stop_reason": "end_turn"}


def test_el_formato_de_cada_trama_es_event_data_y_linea_en_blanco(
    mentor_client: TestClient, fake, auth
):
    raw = post_chat(mentor_client, auth["headers"]).text
    assert raw.startswith("event: sesion\ndata: {")  # el primero, con la conversación
    assert 'event: text\ndata: {"delta":"Los osteoclastos "}\n\n' in raw
    assert raw.endswith('event: done\ndata: {"stop_reason":"end_turn"}\n\n')
    assert "\r" not in raw


def test_termina_con_exactamente_un_evento_terminal(mentor_client: TestClient, fake, auth):
    names = event_names(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert [n for n in names if n in ("done", "error")] == ["done"]
    assert names[-1] == "done"
    assert names.count("usage") == 1
    assert names.index("usage") < names.index("done")


def test_los_acentos_y_emojis_viajan_en_utf8(mentor_client: TestClient, fake, auth):
    fake.respond_with(
        [message_start(), *text_block(0, "Osteocitos: ñ, á, ü ", "🦴 ok"), *message_end()]
    )
    response = post_chat(mentor_client, auth["headers"])
    deltas = [
        data["delta"] for name, data in parse_sse(response.content.decode()) if name == "text"
    ]
    assert deltas == ["Osteocitos: ñ, á, ü ", "🦴 ok"]


def test_saltos_de_linea_en_el_texto_no_rompen_las_tramas(mentor_client: TestClient, fake, auth):
    fake.respond_with(
        [message_start(), *text_block(0, "linea 1\n\nlinea 2\r\nlinea 3"), *message_end()]
    )
    events = without_informative(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert events[0] == ("text", {"delta": "linea 1\n\nlinea 2\r\nlinea 3"})


def test_el_pensamiento_no_se_transmite_al_cliente(mentor_client: TestClient, fake, auth):
    # Opus 5 lo devuelve omitido (vacío); aunque llegara un resumen, no debe salir del backend.
    fake.respond_with(
        [
            message_start(),
            *thinking_block(0, "PENSAMIENTO-INTERNO-SECRETO"),
            *text_block(1, "Respuesta visible."),
            *message_end(),
        ]
    )
    response = post_chat(mentor_client, auth["headers"])
    assert "PENSAMIENTO-INTERNO-SECRETO" not in response.text
    assert "firma-de-prueba" not in response.text
    assert "thinking" not in response.text
    assert event_names(parse_sse(response.text)) == ["text", "usage", "done"]


def test_pensamiento_omitido_vacio_no_genera_eventos(mentor_client: TestClient, fake, auth):
    fake.respond_with(reply("Solo texto.", thinking=""))
    events = without_informative(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert event_names(events) == ["text", "usage", "done"]


def test_los_ping_del_proveedor_no_se_reenvian(mentor_client: TestClient, fake, auth):
    fake.respond_with(reply("hola"))  # `reply` incluye un evento ping de Anthropic
    raw = post_chat(mentor_client, auth["headers"]).text
    assert "ping" not in raw


def test_respuesta_sin_texto_termina_bien(mentor_client: TestClient, fake, auth):
    fake.respond_with([message_start(), *message_end("end_turn", output_tokens=3)])
    events = without_informative(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert event_names(events) == ["usage", "done"]


def test_fragmentos_de_texto_vacios_se_omiten(mentor_client: TestClient, fake, auth):
    fake.respond_with([message_start(), *text_block(0, "", "hola", ""), *message_end()])
    events = without_informative(parse_sse(post_chat(mentor_client, auth["headers"]).text))
    assert [d["delta"] for n, d in events if n == "text"] == ["hola"]


def test_el_uso_final_de_message_delta_reemplaza_al_inicial(mentor_client: TestClient, fake, auth):
    # Los contadores de message_delta son acumulados: sustituyen a los de message_start.
    fake.respond_with(
        [
            message_start(input_tokens=10, cache_read=0),
            *text_block(0, "hola"),
            *message_end(
                output_tokens=9, usage_extra={"input_tokens": 77, "cache_read_input_tokens": 5}
            ),
        ]
    )
    usage = dict(parse_sse(post_chat(mentor_client, auth["headers"]).text))["usage"]
    assert usage["input_tokens"] == 77
    assert usage["cache_read_input_tokens"] == 5
    assert usage["output_tokens"] == 9


def test_contexto_valido_se_acepta(mentor_client: TestClient, fake, auth):
    contexto = {
        "modulo": 1,
        "seccion": "inicio",
        "nivel": "pregrado",
        "tiempoEnSeccionSeg": 0,
        "interaccionesRecientes": [],
        "progreso": {"modulosCompletados": [], "puntajeTotal": 0, "logros": []},
    }
    response = post_chat(mentor_client, auth["headers"], chat_body(contexto=contexto))
    assert response.status_code == 200
    assert event_names(parse_sse(response.text))[-1] == "done"


def test_contexto_null_se_acepta(mentor_client: TestClient, fake, auth):
    assert post_chat(mentor_client, auth["headers"], chat_body(contexto=None)).status_code == 200


# --- usage_events --------------------------------------------------------------------------------


def test_usage_events_registra_los_tokens_correctos(
    mentor_client: TestClient, fake, auth, db_session
):
    fake.respond_with(
        [
            message_start(
                model="claude-opus-5", input_tokens=120, cache_read=80, cache_creation=30
            ),
            *text_block(0, "hola"),
            *message_end("end_turn", output_tokens=42),
        ]
    )
    assert post_chat(mentor_client, auth["headers"]).status_code == 200

    (row,) = usage_rows(db_session)
    assert row.user_id == auth["user"]["id"]
    assert row.kind == "chat"
    assert row.model == "claude-opus-5"
    assert row.input_tokens == 120
    assert row.output_tokens == 42
    assert row.cache_read_tokens == 80
    assert row.cache_creation_tokens == 30
    assert row.created_at is not None


def test_una_fila_de_usage_events_por_peticion(mentor_client: TestClient, fake, auth, db_session):
    for _ in range(3):
        post_chat(mentor_client, auth["headers"])
    assert len(usage_rows(db_session)) == 3


def test_usage_events_registra_el_modelo_que_sirvio_la_respuesta(
    mentor_client: TestClient, fake, auth, db_session
):
    # Con el fallback del servidor, `message_start` nombra al modelo que atendió la petición.
    fake.respond_with(reply("hola", model="claude-opus-4-8"))
    post_chat(mentor_client, auth["headers"])
    assert usage_rows(db_session)[0].model == "claude-opus-4-8"


def test_usage_events_es_por_usuario(mentor_client: TestClient, fake, auth, register, db_session):
    other = register(numero_identificacion="5550001111")
    post_chat(mentor_client, auth["headers"])
    post_chat(mentor_client, other["headers"])
    assert sorted(row.user_id for row in usage_rows(db_session)) == sorted(
        [auth["user"]["id"], other["user"]["id"]]
    )


def test_peticiones_rechazadas_antes_del_stream_no_registran_uso(
    mentor_client: TestClient, fake, auth, db_session
):
    post_chat(mentor_client, auth["headers"], {"messages": []})
    mentor_client.post("/api/chat", json=chat_body())
    assert usage_rows(db_session) == []


def test_un_fallo_al_guardar_el_uso_no_rompe_la_respuesta(
    mentor_client: TestClient, fake, auth, monkeypatch, caplog
):
    def broken(*args: Any, **kwargs: Any) -> None:
        raise RuntimeError("base de datos caída")

    monkeypatch.setattr("app.ai.mentor.record_usage", broken)
    response = post_chat(mentor_client, auth["headers"])
    assert event_names(parse_sse(response.text))[-1] == "done"
    assert "No se pudo registrar el consumo" in caplog.text


# --- Ping ----------------------------------------------------------------------------------------


def test_ping_cada_15_segundos_por_contrato():
    assert sse.PING_INTERVAL_SECONDS == 15
    assert sse.PING_FRAME == b": ping\n\n"


def test_si_el_modelo_tarda_se_emite_un_comentario_ping(
    mentor_client: TestClient, fake, auth, monkeypatch
):
    monkeypatch.setattr(sse, "PING_INTERVAL_SECONDS", 0.05)
    events = [message_start(), *text_block(0, "tarde"), *message_end()]
    stream = fakes.ScriptedStream(fakes.chunks_of(events), pause_seconds=0.2)
    fake.respond_raw(fakes.streamed_response(stream))

    raw = post_chat(mentor_client, auth["headers"]).text
    parsed = without_informative(parse_sse(raw))
    assert ("comment", ": ping") in parsed
    # Los ping no alteran la secuencia de eventos ni el evento terminal.
    assert event_names(parsed)[-2:] == ["usage", "done"]
    assert event_names(parsed).count("done") == 1


# --- Documentación -------------------------------------------------------------------------------


def test_el_endpoint_figura_en_openapi(mentor_client: TestClient):
    schema = mentor_client.get("/api/openapi.json").json()
    operation = schema["paths"]["/api/chat"]["post"]
    assert set(operation["responses"]) >= {"200", "401", "422", "429", "503"}
    assert "text/event-stream" in operation["responses"]["200"]["content"]


def test_no_hay_clave_en_las_respuestas_ni_en_openapi(mentor_client: TestClient, fake, auth):
    assert API_KEY not in post_chat(mentor_client, auth["headers"]).text
    assert API_KEY not in mentor_client.get("/api/openapi.json").text
    assert API_KEY not in mentor_client.get("/api/health").text
