"""Sugerencias de refuerzo (F3-07): reglas puras y `GET /api/mentor/refuerzo`.

Los datos sembrados están calculados a mano (ver el comentario de `MANIFIESTO`); ninguna prueba
llama al modelo: el endpoint no lo usa.
"""

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.schemas.activity import ActivityBestResult
from app.services import refuerzo
from app.services.manifest import build_manifest, render_manifest

AHORA = datetime(2026, 9, 25, 12, 0, tzinfo=UTC)


def _act(
    sufijo: str,
    tipo: str,
    puntaje_max: int,
    concepto: str,
    obligatoria: bool = True,
) -> dict[str, Any]:
    return {
        "tipo": "actividad",
        "actividad": {
            "id": sufijo,
            "tipo": tipo,
            "puntaje_max": puntaje_max,
            "obligatoria": obligatoria,
            "concepto": concepto,
        },
    }


# Manifiesto de la prueba. Módulo 1, sección `m1_a` («Sección A»): m1_quiz (50, oblig.),
# m1_capas (30, oblig.). Sección `m1_b` («Sección B»): m1_video (20, opcional), m1_rel (40, oblig.).
# Módulo 2, sección `m2_a`: m2_quiz (50, oblig.).
CONTENIDOS = [
    {
        "numero": 1,
        "slug": "uno",
        "secciones": [
            {
                "id": "m1_a",
                "titulo": "Sección A",
                "bloques": [
                    _act("m1_quiz", "quiz", 50, "Concepto A"),
                    _act("m1_capas", "multicapa", 30, "Concepto B"),
                ],
            },
            {
                "id": "m1_b",
                "titulo": "Sección B",
                "bloques": [
                    _act("m1_video", "video-texto", 20, "Concepto C", obligatoria=False),
                    _act("m1_rel", "relacion-columnas", 40, "Concepto D"),
                ],
            },
        ],
    },
    {
        "numero": 2,
        "slug": "dos",
        "secciones": [
            {
                "id": "m2_a",
                "titulo": "Sección M2",
                "bloques": [_act("m2_quiz", "quiz", 50, "Concepto E")],
            }
        ],
    },
]
MANIFEST = build_manifest(CONTENIDOS)


def resultado(
    activity_id: str, *, mejor: int, intentos: int, completada: bool, modulo: int = 1
) -> ActivityBestResult:
    return ActivityBestResult(
        activity_id=activity_id,
        modulo=modulo,
        tipo="quiz",
        mejor_puntaje=mejor,
        intentos=intentos,
        completada=completada,
        ultimo_intento_en=AHORA,
    )


def sugerir(resultados, **kwargs):
    return refuerzo.calcular_sugerencias(MANIFEST, resultados, **kwargs)


# --- Reglas puras -------------------------------------------------------------------------------


def test_sin_senal_no_hay_sugerencias():
    assert sugerir([]) == []
    assert sugerir([], modulos_iniciados={1, 2}) != []  # con módulo iniciado, lo obligatorio pesa


def test_actividad_atascada_es_alta_y_dice_cuantos_intentos():
    # 4 intentos sin completar: 90 + (4 - 3) = 91 puntos -> alta.
    [s] = sugerir(
        [resultado("m1_capas", mejor=0, intentos=4, completada=False)], modulo=1, limite=1
    )
    assert (s.actividad_id, s.puntaje, s.prioridad, s.motivo_tipo) == (
        "m1_capas",
        91,
        "alta",
        "atascada",
    )
    assert s.motivo == "Llevas 4 intentos y aún no la completas"
    assert s.concepto == "Concepto B"
    assert (s.modulo, s.seccion, s.seccion_titulo) == (1, "m1_a", "Sección A")
    assert s.url == "/modulo/1?s=m1_a"


def test_completada_con_precision_baja_es_media():
    # 20 de 50 = 0.4: 60 + round((0.7 - 0.4) / 0.7 * 28) = 60 + 12 = 72 -> media.
    [s] = sugerir([resultado("m1_quiz", mejor=20, intentos=2, completada=True)], modulo=1)
    assert (s.puntaje, s.prioridad, s.motivo_tipo) == (72, "media", "precision_baja")
    assert s.motivo == "Tu mejor resultado fue 20 de 50 puntos"


def test_precision_muy_baja_llega_a_alta():
    # 0 de 50: 60 + 28 = 88 -> alta.
    [s] = sugerir([resultado("m1_quiz", mejor=0, intentos=1, completada=True)], modulo=1)
    assert (s.puntaje, s.prioridad) == (88, "alta")


def test_el_umbral_de_precision_es_estricto():
    # 35 de 50 = 0.70 exacto: no es baja. Con pocos intentos no hay nada que reforzar.
    assert sugerir([resultado("m1_quiz", mejor=35, intentos=2, completada=True)]) == []
    # 34 de 50 = 0.68 sí lo es: 60 + round(0.02 / 0.7 * 28) = 60 + 1 = 61.
    [s] = sugerir([resultado("m1_quiz", mejor=34, intentos=2, completada=True)])
    assert s.puntaje == 61


def test_completada_con_buen_puntaje_pero_muchos_intentos_es_baja():
    # 20 de 20 en 5 intentos: 40 + 2 = 42 -> baja. Una actividad OPCIONAL también cuenta.
    [s] = sugerir([resultado("m1_video", mejor=20, intentos=5, completada=True)])
    assert (s.puntaje, s.prioridad, s.motivo_tipo) == (42, "baja", "varios_intentos")
    assert s.motivo == "Necesitaste 5 intentos para completarla"


def test_completada_a_la_primera_no_genera_nada():
    assert sugerir([resultado("m1_quiz", mejor=50, intentos=1, completada=True)]) == []
    assert sugerir([resultado("m1_quiz", mejor=50, intentos=2, completada=True)]) == []


def test_obligatoria_empezada_pero_sin_completar_es_media():
    [s] = sugerir([resultado("m1_rel", mejor=0, intentos=2, completada=False)], modulo=1)
    assert (s.puntaje, s.prioridad, s.motivo_tipo) == (50, "media", "en_curso")


def test_opcional_sin_completar_y_con_pocos_intentos_no_cuenta():
    assert sugerir([resultado("m1_video", mejor=0, intentos=2, completada=False)]) == []


def test_pendiente_solo_en_modulos_iniciados_y_no_completados():
    # Nada iniciado: silencio. Con el módulo 1 iniciado: sus 3 obligatorias sin hacer, 30 puntos.
    assert sugerir([]) == []
    pendientes = sugerir([], modulos_iniciados={1})
    assert [s.actividad_id for s in pendientes] == ["m1_quiz", "m1_capas", "m1_rel"]
    assert {(s.puntaje, s.prioridad, s.motivo_tipo) for s in pendientes} == {
        (30, "baja", "pendiente")
    }
    assert pendientes[0].motivo == "Es una actividad obligatoria que aún no has hecho"
    # El módulo 2 no se inició: no aparece. Y uno completado no genera pendientes.
    assert all(s.modulo == 1 for s in pendientes)
    assert sugerir([], modulos_iniciados={1}, modulos_completados={1}) == []


def test_orden_por_puntaje_y_luego_modulo_y_manifiesto():
    resultados = [
        resultado("m1_quiz", mejor=20, intentos=2, completada=True),  # 72
        resultado("m1_capas", mejor=0, intentos=4, completada=False),  # 91
        resultado("m1_video", mejor=20, intentos=5, completada=True),  # 42
        resultado("m2_quiz", mejor=0, intentos=3, completada=False, modulo=2),  # 90 + 0 = 90
    ]
    orden = sugerir(resultados, modulos_iniciados={1, 2})
    assert [(s.actividad_id, s.puntaje) for s in orden] == [
        ("m1_capas", 91),
        ("m2_quiz", 90),
        ("m1_quiz", 72),
        ("m1_video", 42),
        ("m1_rel", 30),  # pendiente del módulo 1
    ]


def test_el_limite_recorta_y_se_acota():
    resultados = [
        resultado("m1_quiz", mejor=20, intentos=2, completada=True),
        resultado("m1_capas", mejor=0, intentos=4, completada=False),
        resultado("m1_video", mejor=20, intentos=5, completada=True),
    ]
    assert [s.actividad_id for s in sugerir(resultados, limite=2)] == ["m1_capas", "m1_quiz"]
    assert len(sugerir(resultados, limite=0)) == 1  # mínimo 1
    assert len(sugerir(resultados, limite=999)) == 3  # máximo LIMITE_MAXIMO, hay solo 3


def test_dos_actividades_del_mismo_concepto_dejan_la_mas_urgente():
    contenido = [
        {
            "numero": 1,
            "slug": "uno",
            "secciones": [
                {
                    "id": "s",
                    "titulo": "S",
                    "bloques": [
                        _act("m1_a", "quiz", 50, "Mismo concepto"),
                        _act("m1_b", "quiz", 50, "mismo CONCEPTO"),
                    ],
                }
            ],
        }
    ]
    manifest = build_manifest(contenido)
    resultados = [
        resultado("m1_a", mejor=0, intentos=1, completada=True),  # 88
        resultado("m1_b", mejor=0, intentos=5, completada=False),  # 92
    ]
    sugerencias = refuerzo.calcular_sugerencias(manifest, resultados)
    assert [(s.actividad_id, s.puntaje) for s in sugerencias] == [("m1_b", 92)]


def test_sin_concepto_se_usa_el_titulo_de_la_seccion():
    contenido = [
        {
            "numero": 1,
            "slug": "uno",
            "secciones": [
                {
                    "id": "s",
                    "titulo": "Título de la sección",
                    "bloques": [
                        {
                            "tipo": "actividad",
                            "actividad": {
                                "id": "m1_x",
                                "tipo": "quiz",
                                "puntaje_max": 10,
                                "obligatoria": True,
                            },
                        }
                    ],
                }
            ],
        }
    ]
    manifest = build_manifest(contenido)
    [s] = refuerzo.calcular_sugerencias(
        manifest, [resultado("m1_x", mejor=0, intentos=3, completada=False)]
    )
    assert s.concepto == "Título de la sección"


def test_un_manifiesto_anterior_sin_concepto_ni_titulo_sigue_cargando():
    from app.services.manifest import ActivitySpec, Manifest, parse_manifest

    spec = {"modulo": 1, "tipo": "quiz", "puntaje_max": 10, "obligatoria": True, "seccion": "s"}
    referencia = Manifest({"m1_x": ActivitySpec.model_validate(spec)})
    manifest = parse_manifest(
        {
            "version": 1,
            "actividades": {"m1_x": spec},
            "modulos": referencia.module_totals(),
            "totales": referencia.overall_totals(),
        }
    )
    assert manifest.activities["m1_x"].concepto == ""
    assert manifest.activities["m1_x"].seccion_titulo == ""


# --- Endpoint -----------------------------------------------------------------------------------


@pytest.fixture
def client_refuerzo(make_app, tmp_path: Path):
    ruta = tmp_path / "manifiesto.json"
    ruta.write_text(render_manifest(MANIFEST), encoding="utf-8")
    with TestClient(make_app(activities_manifest_path=ruta)) as client:
        yield client


def publicar(client: TestClient, headers, activity_id, tipo, modulo, puntaje, intentos, completada):
    response = client.post(
        f"/api/activities/{activity_id}/result",
        headers=headers,
        json={
            "modulo": modulo,
            "tipo": tipo,
            "puntaje": puntaje,
            "intentos": intentos,
            "completada": completada,
        },
    )
    assert response.status_code in (200, 201), response.text


def test_sin_token_es_401(client_refuerzo: TestClient):
    response = client_refuerzo.get("/api/mentor/refuerzo")
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "token_invalido"


def test_un_estudiante_nuevo_no_recibe_sugerencias(client_refuerzo: TestClient, register):
    ana = register()
    response = client_refuerzo.get("/api/mentor/refuerzo", headers=ana["headers"])
    assert response.status_code == 200
    assert response.json() == {"sugerencias": []}


def test_endpoint_con_datos_sembrados(client_refuerzo: TestClient, register):
    ana = register()
    h = ana["headers"]
    publicar(client_refuerzo, h, "m1_quiz", "quiz", 1, 20, 2, True)  # 20/50 -> 72, media
    publicar(client_refuerzo, h, "m1_capas", "multicapa", 1, 0, 3, False)
    publicar(client_refuerzo, h, "m1_capas", "multicapa", 1, 0, 4, False)  # 4 intentos -> 91
    publicar(client_refuerzo, h, "m1_video", "video-texto", 1, 20, 5, True)  # 42, baja
    # m1_rel sin hacer, módulo 1 iniciado -> pendiente (30).

    body = client_refuerzo.get("/api/mentor/refuerzo", headers=h).json()
    assert [(s["actividad_id"], s["puntaje"], s["prioridad"]) for s in body["sugerencias"]] == [
        ("m1_capas", 91, "alta"),
        ("m1_quiz", 72, "media"),
        ("m1_video", 42, "baja"),
        ("m1_rel", 30, "baja"),
    ]
    primera = body["sugerencias"][0]
    assert primera == {
        "actividad_id": "m1_capas",
        "concepto": "Concepto B",
        "modulo": 1,
        "seccion": "m1_a",
        "seccion_titulo": "Sección A",
        "url": "/modulo/1?s=m1_a",
        "motivo_tipo": "atascada",
        "motivo": "Llevas 4 intentos y aún no la completas",
        "prioridad": "alta",
        "puntaje": 91,
    }


def test_filtro_por_modulo_y_limite(client_refuerzo: TestClient, register):
    ana = register()
    h = ana["headers"]
    publicar(client_refuerzo, h, "m1_capas", "multicapa", 1, 0, 4, False)
    publicar(client_refuerzo, h, "m2_quiz", "quiz", 2, 0, 3, False)
    todos = client_refuerzo.get("/api/mentor/refuerzo", headers=h).json()["sugerencias"]
    # capas (91), m2_quiz (90) y las dos obligatorias pendientes del módulo 1 (30 cada una).
    assert [s["actividad_id"] for s in todos] == ["m1_capas", "m2_quiz", "m1_quiz", "m1_rel"]
    solo2 = client_refuerzo.get("/api/mentor/refuerzo?modulo=2", headers=h).json()["sugerencias"]
    assert [s["actividad_id"] for s in solo2] == ["m2_quiz"]
    uno = client_refuerzo.get("/api/mentor/refuerzo?limite=1", headers=h).json()["sugerencias"]
    assert [s["actividad_id"] for s in uno] == ["m1_capas"]


@pytest.mark.parametrize("query", ["modulo=0", "modulo=7", "limite=0", "limite=11", "modulo=x"])
def test_parametros_invalidos_son_422(client_refuerzo: TestClient, register, query):
    ana = register()
    assert (
        client_refuerzo.get(f"/api/mentor/refuerzo?{query}", headers=ana["headers"]).status_code
        == 422
    )


def test_un_modulo_solo_visitado_hace_pendientes_sus_obligatorias(
    client_refuerzo: TestClient, register
):
    ana = register()
    h = ana["headers"]
    response = client_refuerzo.put(
        "/api/progress/2", headers=h, json={"seccion_actual": "m2_a", "tiempo_delta_seg": 30}
    )
    assert response.status_code == 200
    [s] = client_refuerzo.get("/api/mentor/refuerzo", headers=h).json()["sugerencias"]
    assert (s["actividad_id"], s["motivo_tipo"], s["url"]) == (
        "m2_quiz",
        "pendiente",
        "/modulo/2?s=m2_a",
    )


def test_cada_estudiante_ve_solo_lo_suyo(client_refuerzo: TestClient, register):
    ana = register()
    luis = register(numero_identificacion="5550001111", nombre="Luis")
    publicar(client_refuerzo, ana["headers"], "m1_capas", "multicapa", 1, 0, 4, False)
    assert client_refuerzo.get("/api/mentor/refuerzo", headers=luis["headers"]).json() == {
        "sugerencias": []
    }
    assert (
        len(
            client_refuerzo.get("/api/mentor/refuerzo", headers=ana["headers"]).json()[
                "sugerencias"
            ]
        )
        == 3
    )  # atascada + las dos obligatorias pendientes del módulo iniciado


def test_sin_manifiesto_la_lista_es_vacia(client: TestClient, auth):
    """El cliente del `conftest` no tiene manifiesto: no hay contenido con el cual comparar."""
    response = client.get("/api/mentor/refuerzo", headers=auth["headers"])
    assert response.status_code == 200
    assert response.json() == {"sugerencias": []}


def test_no_llama_al_modelo_ni_registra_uso(client_refuerzo: TestClient, register, db_session):
    from sqlmodel import select

    from app.models.usage import UsageEvent

    ana = register()
    client_refuerzo.get("/api/mentor/refuerzo", headers=ana["headers"])
    assert list(db_session.exec(select(UsageEvent))) == []
