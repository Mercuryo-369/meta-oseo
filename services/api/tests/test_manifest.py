"""Manifiesto de actividades: generador, carga y validación de resultados y progreso."""

import json
from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from sqlmodel import select

from app.core.settings import API_DIR, DEFAULT_MANIFEST_PATH, REPO_ROOT, Settings
from app.models.activity import ActivityResult
from app.models.progress import ProgressModulo
from app.scripts import build_manifest as script
from app.services.manifest import (
    ManifestError,
    build_manifest,
    load_configured_manifest,
    load_manifest,
    parse_manifest,
    render_manifest,
)
from tests.conftest import ANA
from tests.manifest_support import (
    build_test_manifest,
    content_for,
    post_required,
    result_body,
    write_manifest,
)

MUESTRA = REPO_ROOT / "apps" / "web" / "src" / "content" / "__fixtures__" / "modulo_muestra.json"


# --------------------------------------------------------------------------- generador


@pytest.mark.skipif(not MUESTRA.is_file(), reason="falta el módulo de muestra del frontend")
def test_el_generador_lee_el_modulo_de_muestra(tmp_path, capsys):
    salida = tmp_path / "manifiesto.json"
    assert script.main(["--contenido", str(MUESTRA), "--salida", str(salida)]) == 0
    data = json.loads(salida.read_text(encoding="utf-8"))
    assert data["version"] == 1
    assert len(data["actividades"]) == 9
    assert data["actividades"]["m1_capas_hueso"] == {
        "modulo": 1,
        "tipo": "multicapa",
        "puntaje_max": 30,
        "obligatoria": True,
        "seccion": "tejido_dinamico",
        "seccion_titulo": "El hueso, un tejido dinámico",
        "concepto": "Estructura en capas del hueso largo",
    }
    assert data["actividades"]["m1_explora_celulas"]["obligatoria"] is False
    assert data["modulos"]["1"]["slug"] == "conociendo_el_hueso"
    assert data["modulos"]["1"]["puntaje_max"] == 280
    assert data["modulos"]["1"]["puntaje_max_obligatorias"] == 240
    assert data["totales"] == {
        "actividades": 9,
        "obligatorias": 7,
        "puntaje_max": 280,
        "puntaje_max_obligatorias": 240,
    }
    assert "módulos 2, 3, 4, 5, 6" in capsys.readouterr().err  # aviso de módulos ausentes
    assert load_manifest(salida).max_required_score() == 240


@pytest.mark.skipif(not MUESTRA.is_file(), reason="falta el módulo de muestra del frontend")
def test_la_salida_es_determinista_y_comprobar_detecta_cambios(tmp_path, capsys):
    salida = tmp_path / "manifiesto.json"
    args = ["--contenido", str(MUESTRA), "--salida", str(salida)]
    assert script.main(args) == 0
    primero = salida.read_bytes()
    assert script.main(args) == 0
    assert salida.read_bytes() == primero
    assert b"\r\n" not in primero and primero.endswith(b"\n")

    assert script.main([*args, "--comprobar"]) == 0
    salida.write_text(
        primero.decode("utf-8").replace('"puntaje_max": 30', '"puntaje_max": 31'),
        encoding="utf-8",
    )
    assert script.main([*args, "--comprobar"]) == 1
    assert "no está al día" in capsys.readouterr().out
    salida.unlink()
    assert script.main([*args, "--comprobar"]) == 1  # ausente también cuenta como desactualizado


def test_sin_contenido_falla_con_mensaje(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(script, "MODULES_DIR", tmp_path / "no_existe")
    assert script.main(["--salida", str(tmp_path / "x.json")]) == 2
    assert "No hay content.json" in capsys.readouterr().err
    assert not (tmp_path / "x.json").exists()


def test_descubre_los_content_json_por_carpeta(tmp_path, monkeypatch):
    modulos = tmp_path / "modules"
    for numero in (2, 1):
        carpeta = modulos / f"m{numero}_slug_{numero}"
        carpeta.mkdir(parents=True)
        (carpeta / "content.json").write_text(json.dumps(content_for(numero)), encoding="utf-8")
    (modulos / "otra_carpeta").mkdir()
    (modulos / "otra_carpeta" / "content.json").write_text("{}", encoding="utf-8")
    (modulos / "m3_sin_archivo").mkdir()
    monkeypatch.setattr(script, "MODULES_DIR", modulos)

    encontrados = script.discover_content_files(modulos)
    assert [p.parent.name for p in encontrados] == ["m1_slug_1", "m2_slug_2"]
    salida = tmp_path / "m.json"
    assert script.main(["--salida", str(salida)]) == 0
    assert load_manifest(salida).modules == [1, 2]


def test_carpeta_y_numero_del_json_deben_coincidir(tmp_path, capsys):
    carpeta = tmp_path / "m3_algo"
    carpeta.mkdir()
    (carpeta / "content.json").write_text(json.dumps(content_for(2)), encoding="utf-8")
    assert script.main(["--contenido", str(carpeta / "content.json")]) == 2
    assert "dice módulo 3" in capsys.readouterr().err


def test_json_ilegible_da_error_claro(tmp_path, capsys):
    malo = tmp_path / "content.json"
    malo.write_text("{no es json", encoding="utf-8")
    assert script.main(["--contenido", str(malo), "--salida", str(tmp_path / "x.json")]) == 2
    assert "No se pudo leer" in capsys.readouterr().err


def test_ruta_por_defecto_del_script_es_la_del_repositorio():
    assert script.MODULES_DIR == REPO_ROOT / "apps" / "web" / "src" / "modules"
    assert DEFAULT_MANIFEST_PATH == API_DIR / "app" / "data" / "actividades_manifest.json"


def _con(cambios):
    contenido = deepcopy(content_for(1))
    cambios(contenido)
    return contenido


@pytest.mark.parametrize(
    ("cambio", "mensaje"),
    [
        (lambda c: c["secciones"][0]["bloques"][1]["actividad"].update(id="m2_quiz"), "m1_"),
        (lambda c: c["secciones"][0]["bloques"][1]["actividad"].update(id="M1_Quiz"), "cumple"),
        (lambda c: c["secciones"][0]["bloques"][1]["actividad"].update(tipo="inventado"), "válida"),
        (lambda c: c["secciones"][0]["bloques"][1]["actividad"].update(puntaje_max=0), "válida"),
        (lambda c: c["secciones"][0]["bloques"][1]["actividad"].update(puntaje_max=1001), "válida"),
        (lambda c: c["secciones"][0]["bloques"][1]["actividad"].pop("puntaje_max"), "válida"),
        (lambda c: c.update(numero=7), "inválido"),
        (lambda c: c.update(numero="1"), "inválido"),
    ],
)
def test_contenido_invalido_falla(cambio, mensaje):
    with pytest.raises(ManifestError, match=mensaje):
        build_manifest([_con(cambio)])


def test_id_repetido_o_modulo_repetido_falla():
    repetido = _con(lambda c: c["secciones"][1]["bloques"][0]["actividad"].update(id="m1_quiz"))
    with pytest.raises(ManifestError, match="repetido"):
        build_manifest([repetido])
    with pytest.raises(ManifestError, match="más de una vez"):
        build_manifest([content_for(1), content_for(1)])


def test_obligatoria_es_true_por_omision():
    contenido = _con(lambda c: c["secciones"][0]["bloques"][1]["actividad"].pop("obligatoria"))
    assert build_manifest([contenido]).activities["m1_quiz"].obligatoria is True


def test_ida_y_vuelta_y_rechazo_de_archivos_editados():
    manifiesto = build_test_manifest()
    datos = json.loads(render_manifest(manifiesto))
    assert parse_manifest(datos).activities == manifiesto.activities
    assert manifiesto.required_ids(3) == ["m3_quiz", "m3_multicapa"]
    assert manifiesto.max_required_score() == 480
    assert manifiesto.modules == [1, 2, 3, 4, 5, 6]

    editado = deepcopy(datos)
    editado["actividades"]["m1_quiz"]["puntaje_max"] = 999  # sin actualizar los totales
    with pytest.raises(ManifestError, match="totales"):
        parse_manifest(editado)
    with pytest.raises(ManifestError, match="Versión"):
        parse_manifest({**datos, "version": 2})
    with pytest.raises(ManifestError, match="no tiene actividades"):
        parse_manifest({"version": 1, "actividades": {}})
    campo_extra = deepcopy(datos)
    campo_extra["actividades"]["m1_quiz"]["extra"] = 1
    with pytest.raises(ManifestError):
        parse_manifest(campo_extra)


# ------------------------------------------------------------------- carga por configuración


def _settings(**cambios) -> Settings:
    return Settings(_env_file=None, **cambios)


def test_ruta_por_defecto_inexistente_no_activa_la_validacion():
    settings = _settings(activities_manifest_path=DEFAULT_MANIFEST_PATH)
    assert not settings.manifest_is_explicit
    if not DEFAULT_MANIFEST_PATH.exists():
        assert load_configured_manifest(settings) is None


def test_ruta_vacia_desactiva_y_ruta_explicita_inexistente_falla(tmp_path):
    assert _settings(activities_manifest_path="").activities_manifest_path is None
    assert load_configured_manifest(_settings(activities_manifest_path=None)) is None
    with pytest.raises(ManifestError, match="no existe"):
        load_configured_manifest(_settings(activities_manifest_path=tmp_path / "falta.json"))


def test_ruta_explicita_valida_se_carga(tmp_path):
    ruta = write_manifest(tmp_path / "m.json")
    manifiesto = load_configured_manifest(_settings(activities_manifest_path=ruta))
    assert manifiesto is not None and len(manifiesto.activities) == 18


def test_la_app_no_arranca_con_un_manifiesto_invalido(make_app, tmp_path):
    ruta = tmp_path / "roto.json"
    ruta.write_text("[1, 2]", encoding="utf-8")
    with pytest.raises(ManifestError, match="objeto JSON"):
        make_app(activities_manifest_path=ruta)
    with pytest.raises(ManifestError, match="no existe"):
        make_app(activities_manifest_path=tmp_path / "otra.json")


def test_variable_de_entorno_activities_manifest_path(tmp_path, monkeypatch):
    ruta = write_manifest(tmp_path / "m.json")
    monkeypatch.setenv("ACTIVITIES_MANIFEST_PATH", str(ruta))
    assert Settings(_env_file=None).activities_manifest_path == ruta
    monkeypatch.setenv("ACTIVITIES_MANIFEST_PATH", "")
    assert Settings(_env_file=None).activities_manifest_path is None


# ----------------------------------------------------------------- sin manifiesto (Fase 1)


def test_sin_manifiesto_no_se_valida_nada(client, auth):
    """Comportamiento actual: ids inventados, puntajes grandes y módulos sin actividades."""
    headers = auth["headers"]
    response = client.post(
        "/api/activities/id_inventado/result",
        headers=headers,
        json=result_body(4, "quiz", 1000),
    )
    assert response.status_code == 200
    response = client.put("/api/progress/2", headers=headers, json={"completado": True})
    assert response.status_code == 200
    assert response.json()["modulo"]["completado"] is True


# ------------------------------------------------------------------------ con manifiesto


@pytest.fixture
def mclient(make_app, tmp_path):
    app = make_app(activities_manifest_path=write_manifest(tmp_path / "manifiesto.json"))
    with TestClient(app) as test_client:
        yield test_client


def _register(client, **overrides):
    response = client.post("/api/auth/register", json={**ANA, **overrides})
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def mh(mclient):
    return _register(mclient)


def post(client, headers, activity_id, modulo, tipo, puntaje, **extra):
    return client.post(
        f"/api/activities/{activity_id}/result",
        headers=headers,
        json=result_body(modulo, tipo, puntaje, **extra),
    )


def test_resultado_valido_se_acepta(mclient, mh):
    response = post(mclient, mh, "m1_quiz", 1, "quiz", 50)
    assert response.status_code == 200
    assert response.json()["puntaje_total"] == 50


@pytest.mark.parametrize(
    ("activity_id", "modulo", "tipo"),
    [
        ("m1_no_existe", 1, "quiz"),  # id inexistente
        ("m1_quiz", 2, "quiz"),  # módulo distinto
        ("m1_quiz", 1, "multicapa"),  # tipo distinto
        ("m7_quiz", 6, "quiz"),  # id de un módulo que no existe
        ("m2_quiz", 1, "quiz"),  # id de otro módulo
    ],
)
def test_actividad_desconocida_es_422(mclient, mh, activity_id, modulo, tipo):
    response = post(mclient, mh, activity_id, modulo, tipo, 10)
    assert response.status_code == 422
    detalle = response.json()["detail"]
    assert detalle["code"] == "actividad_desconocida"
    assert "actividad" in detalle["message"].lower()
    # y no se guardó nada
    filas = mclient.get("/api/activities/results", headers=mh).json()["resultados"]
    assert filas == []


def test_puntaje_mayor_al_maximo_es_422_y_el_maximo_se_acepta(mclient, mh):
    response = post(mclient, mh, "m1_quiz", 1, "quiz", 51)
    assert response.status_code == 422
    detalle = response.json()["detail"]
    assert detalle["code"] == "puntaje_invalido"
    assert detalle["puntaje_max"] == 50
    assert post(mclient, mh, "m1_quiz", 1, "quiz", 50).status_code == 200
    assert post(mclient, mh, "m1_quiz", 1, "quiz", 0).status_code == 200
    total = mclient.get("/api/progress", headers=mh).json()["puntaje_total"]
    assert total == 50  # el intento rechazado no puntuó


def test_puntaje_mayor_tambien_se_rechaza_si_no_esta_completada(mclient, mh):
    response = post(mclient, mh, "m1_quiz", 1, "quiz", 500, completada=False)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "puntaje_invalido"


def test_la_validacion_de_forma_sigue_antes(mclient, mh):
    """Un cuerpo mal formado sigue dando el 422 estándar (detail es lista), no el de contenido."""
    response = post(mclient, mh, "m1_quiz", 1, "quiz", -5)
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)


def test_completar_sin_actividades_es_409_con_la_lista_de_faltantes(mclient, mh):
    response = mclient.put(
        "/api/progress/1", headers=mh, json={"completado": True, "tiempo_delta_seg": 30}
    )
    assert response.status_code == 409
    detalle = response.json()["detail"]
    assert detalle["code"] == "modulo_incompleto"
    assert detalle["faltantes"] == ["m1_quiz", "m1_multicapa"]  # el video opcional no cuenta
    # No se aplicó ningún cambio (ni el tiempo).
    progreso = mclient.get("/api/progress", headers=mh).json()["modulos"][0]
    assert progreso["completado"] is False
    assert progreso["tiempo_total_seg"] == 0


def test_faltan_solo_las_no_completadas(mclient, mh):
    post(mclient, mh, "m1_quiz", 1, "quiz", 40)
    post(mclient, mh, "m1_multicapa", 1, "multicapa", 30, completada=False)  # incompleta
    response = mclient.put("/api/progress/1", headers=mh, json={"completado": True})
    assert response.status_code == 409
    assert response.json()["detail"]["faltantes"] == ["m1_multicapa"]


def test_las_opcionales_no_bloquean_y_completar_funciona(mclient, mh):
    post_required(mclient, mh, 1)
    response = mclient.put("/api/progress/1", headers=mh, json={"completado": True})
    assert response.status_code == 200
    cuerpo = response.json()
    assert cuerpo["modulo"]["completado"] is True
    assert cuerpo["logros_nuevos"] == ["primer_hueso"]


def test_completar_es_monotono_y_no_se_revalida(mclient, mh):
    post_required(mclient, mh, 1)
    assert mclient.put("/api/progress/1", headers=mh, json={"completado": True}).status_code == 200
    assert mclient.put("/api/progress/1", headers=mh, json={"completado": True}).status_code == 200
    respuesta = mclient.put("/api/progress/1", headers=mh, json={"completado": False})
    assert respuesta.json()["modulo"]["completado"] is True


def test_sin_pedir_completar_el_progreso_no_se_valida(mclient, mh):
    assert mclient.put("/api/progress/1", headers=mh, json={"completado": False}).status_code == 200
    respuesta = mclient.put(
        "/api/progress/1", headers=mh, json={"seccion_actual": "inicio", "tiempo_delta_seg": 5}
    )
    assert respuesta.status_code == 200
    assert respuesta.json()["modulo"]["tiempo_total_seg"] == 5


def test_lo_completado_por_otro_usuario_no_cuenta(mclient, mh):
    otro = _register(mclient, numero_identificacion="5566778899", nombre="Luis")
    post_required(mclient, otro, 1)
    assert mclient.put("/api/progress/1", headers=mh, json={"completado": True}).status_code == 409


def test_cada_modulo_se_valida_por_separado(mclient, mh):
    post_required(mclient, mh, 1)
    assert mclient.put("/api/progress/2", headers=mh, json={"completado": True}).status_code == 409
    faltantes = mclient.put("/api/progress/2", headers=mh, json={"completado": True})
    assert faltantes.json()["detail"]["faltantes"] == ["m2_quiz", "m2_multicapa"]


def test_modulo_completado_antes_del_manifiesto_no_se_rechaza(mclient, mh, db_session):
    usuario_id = mclient.get("/api/me", headers=mh).json()["id"]
    db_session.add(ProgressModulo(user_id=usuario_id, modulo=3, completado=True))
    db_session.commit()
    respuesta = mclient.put("/api/progress/3", headers=mh, json={"completado": True})
    assert respuesta.status_code == 200
    assert respuesta.json()["modulo"]["completado"] is True


def test_manifiesto_parcial_rechaza_lo_que_no_conoce(make_app, tmp_path):
    ruta = write_manifest(tmp_path / "parcial.json", modules=[1])
    with TestClient(make_app(activities_manifest_path=ruta)) as parcial:
        headers = _register(parcial)
        assert post(parcial, headers, "m2_quiz", 2, "quiz", 10).status_code == 422
        respuesta = parcial.put("/api/progress/2", headers=headers, json={"completado": True})
        assert respuesta.status_code == 409
        detalle = respuesta.json()["detail"]
        assert detalle["code"] == "modulo_incompleto"
        assert detalle["faltantes"] == []
        assert "contenido" in detalle["message"]
        assert post(parcial, headers, "m1_quiz", 1, "quiz", 10).status_code == 200


def test_la_app_con_manifiesto_y_la_de_por_defecto_conviven(client, mclient, auth):
    """`client` (sin manifiesto) sigue aceptando lo que `mclient` rechaza."""
    respuesta = client.post(
        "/api/activities/m1_no_existe/result",
        headers=auth["headers"],
        json=result_body(1, "quiz", 10),
    )
    assert respuesta.status_code == 200


def test_un_resultado_rechazado_no_deja_filas(mclient, mh, db_session):
    post(mclient, mh, "m1_desconocida", 1, "quiz", 10)
    post(mclient, mh, "m1_quiz", 1, "quiz", 999)
    assert db_session.exec(select(ActivityResult)).all() == []
    post(mclient, mh, "m1_quiz", 1, "quiz", 10)
    assert len(db_session.exec(select(ActivityResult)).all()) == 1
