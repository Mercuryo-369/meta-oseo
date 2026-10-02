"""Petición saliente a Anthropic: cuerpo exacto, cabeceras y parámetros prohibidos (F1-07)."""

import json
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.ai.client import (
    FALLBACK_BETA,
    build_client,
    build_request,
    get_client,
    to_upstream_messages,
    uses_server_side_fallback,
)
from app.ai.prompt import (
    MENTOR_PROMPT_FILE,
    MENTOR_SYSTEM_PROMPT,
    citas_de,
    etiquetar,
    load_mentor_prompt,
    titulo_de_cita,
)
from app.core.settings import Settings
from app.rag.corpus import Fragmento
from app.schemas.chat import ChatMessage
from tests import test_mentor_fakes as fakes
from tests.test_mentor_fakes import API_KEY, chat_body, post_chat

fake = fakes.fake_fixture
mentor_client = fakes.mentor_client_fixture

# Parámetros que dan 400 en claude-opus-5 y no deben enviarse jamás.
PROHIBITED = ("temperature", "top_p", "top_k", "budget_tokens", "tool_choice", "tools")


def _keys(value) -> set[str]:
    """Todas las claves de un JSON anidado (para buscar parámetros prohibidos a cualquier nivel)."""
    if isinstance(value, dict):
        return set(value) | {key for item in value.values() for key in _keys(item)}
    if isinstance(value, list):
        return {key for item in value for key in _keys(item)}
    return set()


def _ultimo_turno(body: dict) -> list[dict]:
    """Bloques del último mensaje del estudiante: [datos del curso, pregunta]."""
    contenido = body["messages"][-1]["content"]
    assert isinstance(contenido, list)
    return contenido


def test_cuerpo_exacto_de_la_peticion_a_anthropic(mentor_client: TestClient, fake, auth):
    history = ["Hola", "Hola, ¿en qué te ayudo?", "¿Qué hacen los osteoclastos?"]
    response = post_chat(mentor_client, auth["headers"], chat_body(*history))
    assert response.status_code == 200

    datos = _ultimo_turno(fake.last_body)[0]["text"]
    assert fake.last_body == {
        "model": "claude-opus-5",
        "max_tokens": 16000,
        "stream": True,
        # Bloque estable con su punto de caché; lo variable NO va aquí.
        "system": [
            {
                "type": "text",
                "text": MENTOR_SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        "messages": [
            {"role": "user", "content": "Hola"},
            {"role": "assistant", "content": "Hola, ¿en qué te ayudo?"},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": datos},
                    {"type": "text", "text": "¿Qué hacen los osteoclastos?"},
                ],
            },
        ],
        "thinking": {"type": "adaptive"},
        "output_config": {"effort": "medium"},
        "fallbacks": "default",
    }
    assert datos.startswith("<datos_del_curso>") and datos.endswith("</datos_del_curso>")


def test_la_peticion_va_al_endpoint_beta_de_mensajes_con_la_clave_del_servidor(
    mentor_client: TestClient, fake, auth
):
    post_chat(mentor_client, auth["headers"])
    request = fake.last_request
    assert request.method == "POST"
    assert request.url.path == "/v1/messages"
    assert request.url.params["beta"] == "true"
    assert request.headers["x-api-key"] == API_KEY
    assert request.headers["content-type"] == "application/json"


def test_no_se_reenvia_el_token_jwt_del_estudiante_a_anthropic(
    mentor_client: TestClient, fake, auth
):
    post_chat(mentor_client, auth["headers"])
    assert auth["token"] not in str(fake.last_request.headers)
    assert "authorization" not in fake.last_request.headers


def test_fallback_del_servidor_forma_default_con_su_cabecera_beta(
    mentor_client: TestClient, fake, auth
):
    post_chat(mentor_client, auth["headers"])
    assert fake.last_body["fallbacks"] == "default"
    # La forma "default" usa la cabecera de 2026-07-01, no la de 2026-06-01 (forma con arreglo).
    assert FALLBACK_BETA == "server-side-fallback-2026-07-01"
    assert fake.last_request.headers["anthropic-beta"] == "server-side-fallback-2026-07-01"


def test_nunca_se_envian_parametros_prohibidos_en_opus_5(mentor_client: TestClient, fake, auth):
    post_chat(mentor_client, auth["headers"])
    assert not (_keys(fake.last_body) & set(PROHIBITED))
    # Sin prefill del asistente: el último turno es siempre del usuario.
    assert fake.last_body["messages"][-1]["role"] == "user"


def test_thinking_adaptativo_y_esfuerzo_dentro_de_output_config(
    mentor_client: TestClient, fake, auth
):
    post_chat(mentor_client, auth["headers"])
    body = fake.last_body
    assert body["thinking"] == {"type": "adaptive"}
    assert body["output_config"] == {"effort": "medium"}
    assert "effort" not in body  # el esfuerzo NO va en el nivel superior


def test_modelo_esfuerzo_y_max_tokens_salen_de_la_configuracion(make_app, fake, auth):
    app = make_app(
        anthropic_api_key=API_KEY,
        anthropic_model="claude-opus-5",
        mentor_effort="high",
        mentor_max_tokens=4321,
    )
    app.state.anthropic_client = fake.client(app.state.settings)
    with TestClient(app) as client:
        assert post_chat(client, auth["headers"]).status_code == 200
    assert fake.last_body["output_config"] == {"effort": "high"}
    assert fake.last_body["max_tokens"] == 4321


def test_el_fallback_del_servidor_se_apaga_por_configuracion(make_app, fake, auth):
    """Sin la beta en la organización, `MENTOR_SERVER_FALLBACK=false` evita el 400 por consulta."""
    app = make_app(
        anthropic_api_key=API_KEY,
        anthropic_model="claude-opus-5",
        mentor_server_fallback=False,
    )
    app.state.anthropic_client = fake.client(app.state.settings)
    with TestClient(app) as client:
        assert post_chat(client, auth["headers"]).status_code == 200
    assert fake.last_body["model"] == "claude-opus-5"
    assert "fallbacks" not in fake.last_body
    assert "anthropic-beta" not in fake.last_request.headers


def test_otro_modelo_no_activa_el_fallback_del_servidor(make_app, fake, auth):
    app = make_app(anthropic_api_key=API_KEY, anthropic_model="claude-sonnet-5")
    app.state.anthropic_client = fake.client(app.state.settings)
    with TestClient(app) as client:
        assert post_chat(client, auth["headers"]).status_code == 200
    assert fake.last_body["model"] == "claude-sonnet-5"
    assert "fallbacks" not in fake.last_body
    assert "anthropic-beta" not in fake.last_request.headers
    assert not uses_server_side_fallback("claude-sonnet-5")
    assert uses_server_side_fallback("claude-opus-5")


def test_el_contexto_pedagogico_va_como_datos_en_el_ultimo_turno(
    mentor_client: TestClient, fake, auth
):
    contexto = {
        "modulo": 2,
        "seccion": "SECCION-CANARIO",
        "actividadActual": {
            "id": "m2_quiz_origen",
            "tipo": "quiz",
            "intentos": 3,
            "completada": False,
        },
        "estructuraSeleccionada": "histo_osteoclasto",
        "moleculaSeleccionada": "mol_rankl",
        "nivel": "posgrado",
        "tiempoEnSeccionSeg": 7,
        "interaccionesRecientes": ["INTERACCION-CANARIO"],
        "progreso": {"modulosCompletados": [1], "puntajeTotal": 50, "logros": ["primer_hueso"]},
    }
    response = post_chat(mentor_client, auth["headers"], chat_body(contexto=contexto))
    assert response.status_code == 200

    body = fake.last_body
    datos = _ultimo_turno(body)[0]["text"]
    for esperado in (
        "nivel: posgrado",
        "módulo actual: 2 (Descubriendo sus células)",
        "sección actual: SECCION-CANARIO",
        "actividad actual: m2_quiz_origen (tipo quiz), intentos: 3, completada: no",
        "estructura seleccionada: histo_osteoclasto",
        "molécula seleccionada: mol_rankl",
        "interacciones recientes (de la más antigua a la más nueva): INTERACCION-CANARIO",
        "módulos completados: 1",
        "puntaje total: 50",
        "logros: primer_hueso",
    ):
        assert esperado in datos
    # Lo variable NUNCA va en el bloque estable ni en el historial anterior.
    assert "SECCION-CANARIO" not in json.dumps(body["system"])
    assert "contexto" not in body  # no se reenvía el objeto del cliente
    assert _ultimo_turno(body)[1] == {"type": "text", "text": "¿Qué hacen los osteoclastos?"}


def test_sin_contexto_el_bloque_de_datos_lo_dice(mentor_client: TestClient, fake, auth):
    post_chat(mentor_client, auth["headers"])
    datos = _ultimo_turno(fake.last_body)[0]["text"]
    assert "<contexto_del_estudiante>\nNo disponible." in datos


def test_un_saludo_inicial_del_asistente_no_llega_a_anthropic():
    # La API exige abrir con el usuario; el contrato solo exige que el ÚLTIMO mensaje lo sea.
    messages = [
        ChatMessage(role="assistant", content="¡Hola! Soy tu mentor."),
        ChatMessage(role="user", content="Hola"),
        ChatMessage(role="assistant", content="¿Qué quieres repasar?"),
        ChatMessage(role="user", content="Los osteocitos"),
    ]
    assert to_upstream_messages(messages) == [
        {"role": "user", "content": "Hola"},
        {"role": "assistant", "content": "¿Qué quieres repasar?"},
        {"role": "user", "content": "Los osteocitos"},
    ]


def test_el_contenido_va_intacto_sin_recortes():
    messages = [ChatMessage(role="user", content="  ¿Qué es RANKL?\n\n")]
    assert to_upstream_messages(messages) == [{"role": "user", "content": "  ¿Qué es RANKL?\n\n"}]


def test_build_request_es_puro_y_no_muta_la_configuracion():
    settings = Settings(_env_file=None, anthropic_api_key=API_KEY)
    messages = [ChatMessage(role="user", content="Hola")]
    assert build_request(settings, messages) == build_request(settings, messages)


# --- Prompt de sistema ---------------------------------------------------------------------------


def test_el_prompt_del_mentor_se_carga_una_sola_vez():
    assert load_mentor_prompt() is load_mentor_prompt()
    assert MENTOR_SYSTEM_PROMPT is load_mentor_prompt()


def test_el_prompt_es_un_prefijo_estable_sin_datos_variables():
    prompt = MENTOR_SYSTEM_PROMPT
    assert "\r" not in prompt  # mismos bytes en Windows, Linux y Docker
    assert prompt == prompt.strip()
    assert MENTOR_PROMPT_FILE.read_text(encoding="utf-8").replace("\r\n", "\n").strip() == prompt
    assert "{" not in prompt and "}" not in prompt  # sin plantillas sin resolver


@pytest.mark.parametrize(
    "fragmento",
    [
        "histología",
        "fisiología",
        "español",
        "nivel",
        "no resuelves",  # guía sin resolver las actividades
        "incertidumbre",
        "No inventes bibliografía",
        "No diagnosticas",
        "profesional de la salud",
    ],
)
def test_el_prompt_contiene_las_reglas_del_mentor(fragmento):
    assert fragmento.lower() in MENTOR_SYSTEM_PROMPT.lower()


# --- Cliente -------------------------------------------------------------------------------------


def _request_with(settings: Settings, **state):
    return SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(settings=settings, **state)))


def test_get_client_crea_un_cliente_asincrono_oficial_y_lo_reutiliza():
    settings = Settings(_env_file=None, anthropic_api_key=f"  {API_KEY}  ")
    request = _request_with(settings)
    client = get_client(request)
    assert type(client).__name__ == "AsyncAnthropic"
    assert client.api_key == API_KEY  # sin espacios sobrantes
    assert client.max_retries == 2
    assert get_client(request) is client  # uno por proceso


def test_get_client_sin_clave_responde_503_ia_no_configurada():
    with pytest.raises(HTTPException) as info:
        get_client(_request_with(Settings(_env_file=None, anthropic_api_key="")))
    assert info.value.status_code == 503
    assert info.value.detail["code"] == "ia_no_configurada"


def test_build_client_usa_los_tiempos_de_espera_del_mentor():
    client = build_client(Settings(_env_file=None, anthropic_api_key=API_KEY))
    assert client.timeout.connect == 10.0
    assert client.timeout.read == 120.0


def test_el_cliente_se_cierra_al_apagar_la_api(make_app, fake):
    app = make_app(anthropic_api_key=API_KEY)
    client = fake.client(app.state.settings)
    app.state.anthropic_client = client
    with TestClient(app):
        assert not client.is_closed()
    assert client.is_closed()


# --- Citas ---------------------------------------------------------------------------------------


def _fragmento(**cambios) -> Fragmento:
    base = {
        "id": "m5:m5_2_eje:t_x",
        "modulo": 5,
        "seccion_id": "m5_2_eje",
        "seccion_titulo": "El eje RANKL",
        "tipo": "contenido",
        "texto": "texto",
        "url": "/modulo/5?s=m5_2_eje",
    }
    return Fragmento(**{**base, **cambios})


def test_el_titulo_de_una_cita_distingue_el_tema_dentro_de_la_seccion():
    assert titulo_de_cita(_fragmento()) == "Módulo 5 · El eje RANKL"
    assert (
        titulo_de_cita(_fragmento(subtitulo="La balanza RANKL/OPG"))
        == "Módulo 5 · El eje RANKL — La balanza RANKL/OPG"
    )
    assert titulo_de_cita(_fragmento(subtitulo="El eje RANKL")) == "Módulo 5 · El eje RANKL"
    glosario = _fragmento(tipo="glosario", texto="Osteoide: matriz sin mineral.", seccion_id=None)
    assert titulo_de_cita(glosario) == "Módulo 5 · Glosario: Osteoide"
    objetivos = _fragmento(tipo="objetivos", seccion_id=None)
    assert titulo_de_cita(objetivos) == "Módulo 5 · Objetivos del módulo"


def test_etiquetar_numera_lo_citable_y_deja_el_apoyo_al_final_sin_numero():
    apoyo = _fragmento(id="m5:banco:1", tipo="banco", seccion_id=None)
    citables = [_fragmento(id=f"m5:x:{i}") for i in range(2)]
    etiquetados = etiquetar([apoyo, *citables])
    assert [e.etiqueta for e in etiquetados] == ["1", "2", "apoyo"]
    assert [c["id"] for c in citas_de(etiquetados)] == ["m5:x:0", "m5:x:1"]
