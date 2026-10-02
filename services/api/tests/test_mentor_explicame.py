"""«Explícame esto» (F3-06): el nivel y la estructura seleccionada llegan al mentor y se respetan.

El servidor no cambia para esta función: el chip del frontend envía una pregunta fija junto con el
contexto pedagógico. Aquí se comprueba que el contexto (nivel, estructura y molécula) llega al
modelo como DATOS, que orienta la recuperación y que el prompt estable pide adaptar la analogía al
nivel sin que ese bloque cambie entre estudiantes (prompt caching).
"""

import pytest
from fastapi.testclient import TestClient

from app.ai.prompt import MENTOR_SYSTEM_PROMPT
from tests import test_mentor_fakes as fakes
from tests.test_mentor_fakes import chat_body, post_chat

fake = fakes.fake_fixture
mentor_client = fakes.mentor_client_fixture

CONTEXTO = {
    "modulo": 2,
    "seccion": "inicio",
    "estructuraSeleccionada": "histo_osteoclasto",
    "nivel": "pregrado",
    "tiempoEnSeccionSeg": 12,
    "interaccionesRecientes": [],
    "progreso": {"modulosCompletados": [], "puntajeTotal": 0, "logros": []},
}
PREGUNTA = "Explícame el osteoclasto: qué es, qué hace y por qué importa."


def datos_enviados(fake) -> str:
    return fake.last_body["messages"][-1]["content"][0]["text"]


def test_el_prompt_estable_pide_adaptar_la_analogia_al_nivel():
    assert "adaptada al nivel" in MENTOR_SYSTEM_PROMPT
    assert "pregrado" in MENTOR_SYSTEM_PROMPT and "posgrado" in MENTOR_SYSTEM_PROMPT
    assert "dónde falla" in MENTOR_SYSTEM_PROMPT
    assert "explícame esto" in MENTOR_SYSTEM_PROMPT.lower()


@pytest.mark.parametrize("nivel", ["pregrado", "posgrado"])
def test_el_nivel_y_la_estructura_seleccionada_llegan_al_modelo(
    mentor_client: TestClient, fake, auth, nivel
):
    contexto = {**CONTEXTO, "nivel": nivel, "moleculaSeleccionada": "mol_rankl"}
    post_chat(mentor_client, auth["headers"], chat_body(PREGUNTA, contexto=contexto))
    datos = datos_enviados(fake)
    assert f"- nivel: {nivel}" in datos
    assert "- estructura seleccionada: histo_osteoclasto" in datos
    assert "- molécula seleccionada: mol_rankl" in datos


def test_lo_seleccionado_orienta_la_recuperacion_aunque_la_pregunta_sea_vaga(
    mentor_client: TestClient, fake, auth
):
    post_chat(mentor_client, auth["headers"], chat_body("Explícame esto", contexto=CONTEXTO))
    material = datos_enviados(fake).split("<material_del_curso>")[1].lower()
    assert "osteoclasto" in material


def test_el_bloque_estable_no_cambia_con_el_nivel(mentor_client: TestClient, fake, auth):
    sistemas = []
    for nivel in ("pregrado", "posgrado"):
        post_chat(
            mentor_client,
            auth["headers"],
            chat_body(PREGUNTA, contexto={**CONTEXTO, "nivel": nivel}),
        )
        sistemas.append(fake.last_body["system"])
    assert sistemas[0] == sistemas[1]
