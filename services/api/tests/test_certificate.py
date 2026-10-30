"""Certificado (F5-05): elegibilidad, emisión idempotente, verificación pública y PDF."""

import io
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader
from sqlalchemy import delete, func
from sqlmodel import select

from app.core.constants import OVA_TITLE
from app.models.certificate import Certificate
from app.models.progress import ProgressModulo
from app.models.user import User
from app.services.certificate import (
    CODE_ALPHABET,
    generate_code,
    mask_identification,
    normalize_code,
    percentage,
)
from app.services.certificate_pdf import (
    DIPLOMAS_DIR,
    NIVELES_DIPLOMA,
    format_spanish_date,
    nivel_de_diploma,
    render_certificate_pdf,
)
from tests.conftest import ANA
from tests.manifest_support import (
    MAX_OBLIGATORIAS_TOTAL,
    complete_module,
    post_required,
    result_body,
    write_manifest,
)

CODE_RE = re.compile(rf"^OVA-[{CODE_ALPHABET}]{{4}}-[{CODE_ALPHABET}]{{4}}$")
ISO_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


# ------------------------------------------------------------------------------ ayudas


def complete_all(client, headers, modulos=range(1, 7)):
    """Marca los módulos como completados (sin manifiesto no se exigen actividades)."""
    for modulo in modulos:
        response = client.put(f"/api/progress/{modulo}", headers=headers, json={"completado": True})
        assert response.status_code == 200, response.text


def status_of(client, headers):
    response = client.get("/api/certificate/status", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def issue(client, headers):
    return client.post("/api/certificate", headers=headers)


def new_user(client, **overrides):
    body = {**ANA, **overrides}
    response = client.post("/api/auth/register", json=body)
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def mclient(make_app, tmp_path):
    """App con el manifiesto de prueba (6 módulos, 480 puntos obligatorios)."""
    # Umbral fijo en 70 %: las pruebas de borde no dependen del valor por defecto (60 %).
    app = make_app(
        activities_manifest_path=write_manifest(tmp_path / "manifiesto.json"),
        cert_min_porcentaje=70,
    )
    with TestClient(app) as test_client:
        yield test_client


def make_client(make_app, tmp_path, **settings):
    """Cliente con manifiesto y ajustes propios (umbral, URL pública...)."""
    ruta = write_manifest(tmp_path / "manifiesto.json")
    return TestClient(make_app(activities_manifest_path=ruta, **settings))


def score_modules(client, headers, quiz_by_module, multi_by_module=None):
    """Completa los 6 módulos con los puntajes indicados (quiz de 0..50, multicapa de 0..30)."""
    multi_by_module = multi_by_module or [30] * 6
    for modulo in range(1, 7):
        for sufijo, tipo, puntaje in (
            ("quiz", "quiz", quiz_by_module[modulo - 1]),
            ("multicapa", "multicapa", multi_by_module[modulo - 1]),
        ):
            response = client.post(
                f"/api/activities/m{modulo}_{sufijo}/result",
                headers=headers,
                json=result_body(modulo, tipo, puntaje),
            )
            assert response.status_code == 200, response.text
        response = client.put(f"/api/progress/{modulo}", headers=headers, json={"completado": True})
        assert response.status_code == 200, response.text


# ------------------------------------------------------------------------ autenticación


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/certificate/status"),
        ("post", "/api/certificate"),
        ("get", "/api/certificate/pdf"),
    ],
)
def test_endpoints_privados_exigen_token(client, method, path):
    response = getattr(client, method)(path)
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "token_invalido"


def test_verificar_es_publico(client):
    """Sin token no hay 401: solo 404 si el código no existe."""
    assert client.get("/api/verify/OVA-2222-3333").status_code == 404


# ----------------------------------------------------------- elegibilidad sin manifiesto


def test_estado_inicial_sin_manifiesto(client, auth):
    estado = status_of(client, auth["headers"])
    assert estado == {
        "elegible": False,
        "emitido": False,
        "modulos_completados": [],
        "modulos_pendientes": [1, 2, 3, 4, 5, 6],
        "puntaje_total": 0,
        "puntaje_obligatorias": None,
        "puntaje_maximo": None,
        "porcentaje": None,
        "umbral": None,
        "puntos_faltantes": None,
        "motivos": ["Faltan por completar los módulos 1, 2, 3, 4, 5 y 6."],
        "certificado": None,
    }


def test_cinco_modulos_no_alcanzan(client, auth):
    complete_all(client, auth["headers"], range(1, 6))
    estado = status_of(client, auth["headers"])
    assert estado["elegible"] is False
    assert estado["modulos_completados"] == [1, 2, 3, 4, 5]
    assert estado["modulos_pendientes"] == [6]
    assert estado["motivos"] == ["Falta completar el módulo 6."]
    respuesta = issue(client, auth["headers"])
    assert respuesta.status_code == 409
    detalle = respuesta.json()["detail"]
    assert detalle["code"] == "certificado_no_elegible"
    assert detalle["motivos"] == ["Falta completar el módulo 6."]
    assert status_of(client, auth["headers"])["emitido"] is False  # nada se emitió


def test_los_modulos_pendientes_salteados_se_listan(client, auth):
    complete_all(client, auth["headers"], [1, 3, 6])
    estado = status_of(client, auth["headers"])
    assert estado["modulos_pendientes"] == [2, 4, 5]
    assert estado["motivos"] == ["Faltan por completar los módulos 2, 4 y 5."]


def test_seis_modulos_bastan_sin_manifiesto_aun_con_cero_puntos(client, auth):
    complete_all(client, auth["headers"])
    estado = status_of(client, auth["headers"])
    assert estado["elegible"] is True
    assert estado["motivos"] == []
    assert estado["puntaje_total"] == 0
    assert estado["umbral"] is None and estado["porcentaje"] is None


def test_actividades_sueltas_sin_modulos_completos_no_bastan(client, auth):
    for modulo in range(1, 7):
        client.post(
            f"/api/activities/m{modulo}_x/result",
            headers=auth["headers"],
            json=result_body(modulo, "quiz", 100),
        )
    assert status_of(client, auth["headers"])["elegible"] is False


# ------------------------------------------------------------ elegibilidad con manifiesto


def test_con_manifiesto_el_estado_informa_umbral_y_maximo(mclient):
    headers = new_user(mclient)
    estado = status_of(mclient, headers)
    assert estado["umbral"] == 70
    assert estado["puntaje_maximo"] == MAX_OBLIGATORIAS_TOTAL == 480
    assert estado["puntaje_obligatorias"] == 0
    assert estado["porcentaje"] == 0.0
    assert estado["puntos_faltantes"] == 336
    assert len(estado["motivos"]) == 2  # módulos y puntaje


def test_puntaje_perfecto_es_elegible(mclient):
    headers = new_user(mclient)
    for modulo in range(1, 7):
        complete_module(mclient, headers, modulo)
    estado = status_of(mclient, headers)
    assert estado["elegible"] is True
    assert estado["puntaje_obligatorias"] == 480
    assert estado["porcentaje"] == 100.0
    assert estado["puntos_faltantes"] == 0
    assert estado["motivos"] == []


def test_borde_exacto_del_umbral_336_de_480_es_elegible(mclient):
    headers = new_user(mclient)
    # 4 módulos perfectos (320) + 16 en el quinto + 0 en el sexto = 336 = 70 %.
    score_modules(mclient, headers, [50, 50, 50, 50, 16, 0], [30, 30, 30, 30, 0, 0])
    estado = status_of(mclient, headers)
    assert estado["puntaje_obligatorias"] == 336
    assert estado["porcentaje"] == 70.0
    assert estado["elegible"] is True
    assert issue(mclient, headers).status_code == 201


def test_un_punto_por_debajo_del_umbral_no_es_elegible(mclient):
    headers = new_user(mclient)
    score_modules(mclient, headers, [50, 50, 50, 50, 15, 0], [30, 30, 30, 30, 0, 0])  # 335
    estado = status_of(mclient, headers)
    assert estado["puntaje_obligatorias"] == 335
    assert estado["porcentaje"] == 69.7  # truncado, no 69.8 ni 70.0
    assert estado["elegible"] is False
    assert estado["puntos_faltantes"] == 1
    assert estado["modulos_pendientes"] == []
    assert len(estado["motivos"]) == 1
    assert "69,7 %" in estado["motivos"][0] and "70 %" in estado["motivos"][0]
    assert "1 puntos" in estado["motivos"][0]
    respuesta = issue(mclient, headers)
    assert respuesta.status_code == 409
    assert respuesta.json()["detail"]["code"] == "certificado_no_elegible"


def test_las_opcionales_no_compensan_las_obligatorias(mclient):
    headers = new_user(mclient)
    score_modules(mclient, headers, [50, 50, 50, 50, 15, 0], [30, 30, 30, 30, 0, 0])  # 335
    for modulo in range(1, 7):  # el video opcional al máximo en todos los módulos
        respuesta = mclient.post(
            f"/api/activities/m{modulo}_video/result",
            headers=headers,
            json=result_body(modulo, "video-texto", 20),
        )
        assert respuesta.status_code == 200
    estado = status_of(mclient, headers)
    assert estado["puntaje_total"] == 335 + 120  # el total del HUD sí las suma
    assert estado["puntaje_obligatorias"] == 335  # el certificado no
    assert estado["elegible"] is False


def test_un_reintento_peor_no_baja_el_puntaje(mclient):
    headers = new_user(mclient)
    for modulo in range(1, 7):
        complete_module(mclient, headers, modulo)
    mclient.post(
        "/api/activities/m1_quiz/result",
        headers=headers,
        json=result_body(1, "quiz", 0, intentos=2),
    )
    assert status_of(mclient, headers)["puntaje_obligatorias"] == 480


def test_modulos_completos_con_poco_puntaje_no_es_elegible(mclient):
    headers = new_user(mclient)
    for modulo in range(1, 7):
        complete_module(mclient, headers, modulo, fraction=0.5)  # 240 de 480 = 50 %
    estado = status_of(mclient, headers)
    assert estado["modulos_pendientes"] == []
    assert estado["porcentaje"] == 50.0
    assert estado["elegible"] is False
    assert estado["puntos_faltantes"] == 96


def test_buen_puntaje_pero_falta_un_modulo_no_es_elegible(mclient):
    headers = new_user(mclient)
    for modulo in range(1, 6):
        complete_module(mclient, headers, modulo)
    post_required(mclient, headers, 6)  # actividades hechas, módulo sin marcar
    estado = status_of(mclient, headers)
    assert estado["porcentaje"] == 100.0
    assert estado["elegible"] is False
    assert estado["motivos"] == ["Falta completar el módulo 6."]


def test_el_umbral_es_configurable(make_app, tmp_path):
    with make_client(make_app, tmp_path, cert_min_porcentaje=100) as estricto:
        headers = new_user(estricto)
        score_modules(estricto, headers, [50, 50, 50, 50, 50, 49])
        estado = status_of(estricto, headers)
        assert estado["umbral"] == 100
        assert estado["elegible"] is False and estado["puntos_faltantes"] == 1
        estricto.post(
            "/api/activities/m6_quiz/result",
            headers=headers,
            json=result_body(6, "quiz", 50, intentos=2),
        )
        assert status_of(estricto, headers)["elegible"] is True
    with make_client(make_app, tmp_path, cert_min_porcentaje=0) as laxo:
        headers = new_user(laxo, numero_identificacion="5566778899")
        score_modules(laxo, headers, [0] * 6, [0] * 6)
        assert status_of(laxo, headers)["elegible"] is True


def test_manifiesto_sin_obligatorias_no_divide_por_cero():
    assert percentage(0, 0) == 100.0
    assert percentage(None, 10) is None
    assert percentage(1, 3) == 33.3
    assert percentage(2, 3) == 66.6  # truncado


# ---------------------------------------------------------------------- emisión


def test_emitir_crea_el_certificado_con_la_forma_del_contrato(client, auth):
    complete_all(client, auth["headers"])
    respuesta = issue(client, auth["headers"])
    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["nuevo"] is True
    certificado = cuerpo["certificado"]
    assert set(certificado) == {
        "codigo",
        "emitido_en",
        "puntaje_total",
        "puntaje_obligatorias",
        "puntaje_maximo",
        "porcentaje",
    }
    assert CODE_RE.match(certificado["codigo"])
    assert ISO_UTC.match(certificado["emitido_en"])
    assert certificado["puntaje_obligatorias"] is None  # sin manifiesto
    estado = status_of(client, auth["headers"])
    assert estado["emitido"] is True
    assert estado["certificado"] == certificado


def test_emitir_es_idempotente(client, auth, db_session):
    complete_all(client, auth["headers"])
    primero = issue(client, auth["headers"])
    segundo = issue(client, auth["headers"])
    tercero = issue(client, auth["headers"])
    assert primero.status_code == 201
    assert segundo.status_code == tercero.status_code == 200
    assert segundo.json()["nuevo"] is False
    assert (
        segundo.json()["certificado"]
        == primero.json()["certificado"]
        == tercero.json()["certificado"]
    )
    assert db_session.exec(select(func.count()).select_from(Certificate)).one() == 1


def test_un_certificado_ya_emitido_no_se_revoca(client, auth, db_session):
    complete_all(client, auth["headers"])
    codigo = issue(client, auth["headers"]).json()["certificado"]["codigo"]
    # Aunque hoy dejara de cumplir (p. ej. cambia el contenido), el emitido se conserva.
    db_session.exec(delete(ProgressModulo))
    db_session.commit()
    assert status_of(client, auth["headers"])["elegible"] is False
    de_nuevo = issue(client, auth["headers"])
    assert de_nuevo.status_code == 200
    assert de_nuevo.json()["certificado"]["codigo"] == codigo


def test_con_manifiesto_guarda_puntaje_obligatorias_y_maximo(mclient, db_session):
    headers = new_user(mclient)
    for modulo in range(1, 7):
        complete_module(mclient, headers, modulo)
    certificado = issue(mclient, headers).json()["certificado"]
    assert certificado["puntaje_total"] == 480
    assert certificado["puntaje_obligatorias"] == 480
    assert certificado["puntaje_maximo"] == 480
    assert certificado["porcentaje"] == 100.0


def test_instantanea_de_los_datos_del_usuario(client, auth, db_session):
    complete_all(client, auth["headers"])
    issue(client, auth["headers"])
    fila = db_session.exec(select(Certificate)).one()
    assert (fila.nombre, fila.apellido) == ("Ana", "Pérez")
    assert (fila.tipo_identificacion, fila.numero_identificacion) == ("CC", "1023456789")
    # Si el perfil cambia después, el certificado no.
    usuario = db_session.get(User, fila.user_id)
    usuario.nombre = "Otra"
    db_session.add(usuario)
    db_session.commit()
    codigo = fila.codigo
    verificacion = client.get(f"/api/verify/{codigo}").json()
    assert verificacion["nombre"] == "Ana"


def test_cada_usuario_tiene_su_propio_certificado(client, register):
    ana = register()
    luis = register(nombre="Luis", numero_identificacion="5566778899")
    complete_all(client, ana["headers"])
    assert status_of(client, luis["headers"])["elegible"] is False
    assert issue(client, luis["headers"]).status_code == 409
    codigo_ana = issue(client, ana["headers"]).json()["certificado"]["codigo"]
    complete_all(client, luis["headers"])
    codigo_luis = issue(client, luis["headers"]).json()["certificado"]["codigo"]
    assert codigo_ana != codigo_luis
    assert status_of(client, luis["headers"])["certificado"]["codigo"] == codigo_luis


def test_dos_emisiones_simultaneas_generan_un_solo_certificado(client, auth, db_session):
    complete_all(client, auth["headers"])
    with ThreadPoolExecutor(max_workers=8) as pool:
        respuestas = list(pool.map(lambda _: issue(client, auth["headers"]), range(8)))
    estados = sorted(r.status_code for r in respuestas)
    assert estados == [200] * 7 + [201]  # exactamente una creó el certificado
    codigos = {r.json()["certificado"]["codigo"] for r in respuestas}
    assert len(codigos) == 1
    assert sum(r.json()["nuevo"] for r in respuestas) == 1
    assert db_session.exec(select(func.count()).select_from(Certificate)).one() == 1


def test_emisiones_simultaneas_de_usuarios_distintos_no_chocan(client, register, db_session):
    usuarios = [register(nombre=f"U{i}", numero_identificacion=f"90000000{i}") for i in range(5)]
    for usuario in usuarios:
        complete_all(client, usuario["headers"])
    with ThreadPoolExecutor(max_workers=5) as pool:
        respuestas = list(pool.map(lambda u: issue(client, u["headers"]), usuarios))
    assert [r.status_code for r in respuestas] == [201] * 5
    assert len({r.json()["certificado"]["codigo"] for r in respuestas}) == 5
    assert db_session.exec(select(func.count()).select_from(Certificate)).one() == 5


def test_colision_de_codigo_se_reintenta(client, auth, monkeypatch, db_session):
    """Si el primer código generado ya existe, se genera otro en vez de fallar."""
    otra = new_user(client, nombre="Luis", numero_identificacion="5566778899")
    complete_all(client, otra)
    ocupado = issue(client, otra).json()["certificado"]["codigo"]
    complete_all(client, auth["headers"])
    codigos = iter([ocupado, ocupado, "OVA-ABCD-EFGH"])
    monkeypatch.setattr("app.services.certificate.generate_code", lambda: next(codigos))
    respuesta = issue(client, auth["headers"])
    assert respuesta.status_code == 201
    assert respuesta.json()["certificado"]["codigo"] == "OVA-ABCD-EFGH"


# ---------------------------------------------------------------- código y máscara


def test_codigos_legibles_sin_caracteres_ambiguos():
    codigos = {generate_code() for _ in range(3000)}
    assert len(codigos) == 3000  # ~40 bits: sin colisiones en la práctica
    for codigo in codigos:
        assert CODE_RE.match(codigo), codigo
        assert not set(codigo.replace("OVA-", "")) & set("01ILO"), codigo


def test_el_alfabeto_no_tiene_ambiguos():
    assert not set(CODE_ALPHABET) & set("0O1IL")
    assert len(CODE_ALPHABET) == len(set(CODE_ALPHABET)) == 31


def test_normalizar_codigo():
    assert normalize_code(" ova-7k3m-9qxa ") == "OVA-7K3M-9QXA"
    assert normalize_code("OVA-7K3M-9QXA") == "OVA-7K3M-9QXA"
    for malo in (
        "",
        "OVA",
        "OVA-7K3M",
        "OVA-7K3M-9QXAA",
        "OVA-0K3M-9QXA",
        "XYZ-7K3M-9QXA",
        "OVA-7K3M9QXA",
    ):
        assert normalize_code(malo) is None, malo


@pytest.mark.parametrize(
    ("numero", "esperado"),
    [
        ("1023456789", "*******789"),
        ("1234", "*234"),
        ("123", "***"),
        ("ab", "**"),
        ("", ""),
        ("PA98765", "****765"),
    ],
)
def test_enmascarado_de_la_identificacion(numero, esperado):
    assert mask_identification(numero) == esperado


# ---------------------------------------------------------------- verificación pública


def issue_for(client, **overrides):
    headers = new_user(client, **overrides)
    complete_all(client, headers)
    return headers, issue(client, headers).json()["certificado"]["codigo"]


def test_verificar_devuelve_lo_minimo_y_enmascara(client):
    _, codigo = issue_for(client)
    respuesta = client.get(f"/api/verify/{codigo}")  # sin token
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert set(cuerpo) == {
        "valido",
        "codigo",
        "nombre",
        "apellido",
        "tipo_identificacion",
        "identificacion_enmascarada",
        "emitido_en",
        "puntaje_total",
        "porcentaje",
    }
    assert cuerpo["valido"] is True
    assert cuerpo["codigo"] == codigo
    assert (cuerpo["nombre"], cuerpo["apellido"]) == ("Ana", "Pérez")
    assert cuerpo["tipo_identificacion"] == "CC"
    assert cuerpo["identificacion_enmascarada"] == "*******789"
    assert ISO_UTC.match(cuerpo["emitido_en"])
    assert cuerpo["puntaje_total"] == 0
    # El número completo no aparece en ninguna parte de la respuesta.
    assert "1023456789" not in respuesta.text
    assert "1023456" not in respuesta.text


def test_verificar_tolera_minusculas_y_espacios(client):
    _, codigo = issue_for(client)
    assert client.get(f"/api/verify/{codigo.lower()}").status_code == 200
    assert client.get(f"/api/verify/%20{codigo}%20").status_code == 200


def test_codigos_inexistentes_o_malformados_dan_el_mismo_404(client):
    issue_for(client)
    candidatos = [
        "OVA-2222-3333",  # bien formado pero inexistente
        "OVA-2222",
        "x",
        "OVA-2222-333O",
        "a" * 500,
        "OVA-2222-3333%00",
        "%C3%B1%C3%B1",
        "1",
    ]
    cuerpos = set()
    for candidato in candidatos:
        respuesta = client.get(f"/api/verify/{candidato}")
        assert respuesta.status_code == 404, candidato
        assert respuesta.json()["detail"]["code"] == "certificado_no_encontrado"
        cuerpos.add(respuesta.text)
    assert len(cuerpos) == 1  # ni una pista distinta según el motivo
    assert "Ana" not in next(iter(cuerpos))


def test_verificar_tiene_limite_de_intentos_por_ip(client):
    codigos = [f"OVA-2222-33{i:02d}"[:13] for i in range(30)]
    respuestas = [client.get(f"/api/verify/{codigo}") for codigo in codigos]
    assert [r.status_code for r in respuestas[:20]] == [404] * 20
    limitada = respuestas[20]
    assert limitada.status_code == 429
    assert limitada.json()["detail"]["code"] == "demasiados_intentos"
    assert int(limitada.headers["Retry-After"]) >= 1


def test_el_limite_de_verificacion_tambien_cuenta_los_aciertos(client):
    _, codigo = issue_for(client)
    estados = [client.get(f"/api/verify/{codigo}").status_code for _ in range(22)]
    assert estados == [200] * 20 + [429, 429]


def test_el_limite_de_verificacion_es_por_ip_con_proxy_de_confianza(make_app):
    with TestClient(make_app(trust_proxy=True)) as cliente:
        for _ in range(20):
            cliente.get("/api/verify/OVA-2222-3333", headers={"X-Forwarded-For": "10.0.0.1"})
        bloqueada = cliente.get(
            "/api/verify/OVA-2222-3333", headers={"X-Forwarded-For": "10.0.0.1"}
        )
        otra = cliente.get("/api/verify/OVA-2222-3333", headers={"X-Forwarded-For": "10.0.0.2"})
        assert bloqueada.status_code == 429
        assert otra.status_code == 404


# ---------------------------------------------------------------------------- PDF


def pdf_text(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    assert len(reader.pages) == 1
    return " ".join(reader.pages[0].extract_text().split())  # espacios y saltos normalizados


def download(client, headers):
    return client.get("/api/certificate/pdf", headers=headers)


def test_pdf_sin_certificado_es_404(client, auth):
    respuesta = download(client, auth["headers"])
    assert respuesta.status_code == 404
    assert respuesta.json()["detail"]["code"] == "certificado_no_emitido"


def test_pdf_es_valido_y_trae_los_datos(client):
    headers, codigo = issue_for(client, nombre="María José", apellido="Núñez Peña")
    respuesta = download(client, headers)
    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"] == "application/pdf"
    assert respuesta.headers["content-disposition"] == (
        f'attachment; filename="certificado_{codigo}.pdf"'
    )
    assert "no-store" in respuesta.headers["cache-control"]
    contenido = respuesta.content
    assert contenido.startswith(b"%PDF-") and contenido.rstrip().endswith(b"%%EOF")

    lector = PdfReader(io.BytesIO(contenido))
    assert len(lector.pages) == 1
    pagina = lector.pages[0]
    assert pagina.mediabox.width > pagina.mediabox.height  # A4 apaisada
    # Sin manifiesto no hay porcentaje: diploma de cumplimiento.
    assert lector.metadata.title == "Diploma de Cumplimiento - María José Núñez Peña"

    texto = pdf_text(contenido)
    assert "Diploma de Cumplimiento" in texto  # capa de texto invisible sobre el fondo
    assert "María José Núñez Peña" in texto  # acentos y ñ
    assert OVA_TITLE in texto
    assert codigo in texto
    assert "http://localhost:5173" in texto and f"/verify/{codigo}" in texto
    assert "identificado(a) con Cédula de ciudadanía" in texto
    assert "1023456789" in texto
    assert re.search(r"\d{1,2} de [a-z]+ de \d{4}", texto)


def test_pdf_incluye_el_enlace_de_verificacion_clicable(client):
    headers, codigo = issue_for(client)
    lector = PdfReader(io.BytesIO(download(client, headers).content))
    enlaces = [
        anotacion.get_object().get("/A", {}).get("/URI")
        for anotacion in lector.pages[0].get("/Annots", [])
    ]
    assert f"http://localhost:5173/verify/{codigo}" in enlaces


@pytest.mark.parametrize(
    ("nombre", "apellido"),
    [
        ("Łukasz", "Žáček"),
        ("Søren", "Ødegård-Ibáñez"),
        ("Sinéad", "O'Brien"),
        ("Zoë", "Müller-Straße"),
        ("Ελένη", "Παπαδοπούλου"),
        ("Дмитрий", "Иванов"),
        ("João", "d'Ávila Çelik"),
    ],
)
def test_pdf_conserva_los_caracteres_unicode_de_los_nombres(client, nombre, apellido):
    headers, _ = issue_for(client, nombre=nombre, apellido=apellido)
    texto = pdf_text(download(client, headers).content)
    assert f"{nombre} {apellido}" in texto


def test_pdf_con_nombre_muy_largo_cabe_en_una_pagina(client):
    nombre = "María de los Ángeles Guadalupe Concepción Fernández Villaverde Ñáñez Quinte"
    apellido = "de la Santísima Trinidad Rodríguez-Echeverría y Montoya de Alcázar Bermúdez Nuñe"
    assert len(nombre) <= 80 and len(apellido) <= 80
    headers, _ = issue_for(client, nombre=nombre, apellido=apellido)
    texto = pdf_text(download(client, headers).content)  # 1 sola página (lo comprueba pdf_text)
    assert nombre in texto and apellido in texto


def test_pdf_es_identico_en_cada_descarga(client):
    headers, _ = issue_for(client)
    assert download(client, headers).content == download(client, headers).content


def test_pdf_usa_la_url_publica_configurada_sin_barras_dobles(make_app):
    with TestClient(make_app(public_base_url="https://ova.example.edu.co/")) as cliente:
        headers, codigo = issue_for(cliente)
        texto = pdf_text(download(cliente, headers).content)
        assert f"https://ova.example.edu.co/verify/{codigo}" in texto
        assert "co//verify" not in texto


def test_pdf_solo_se_descarga_el_propio(client, register):
    _, codigo = issue_for(client)
    otro = register(nombre="Luis", numero_identificacion="5566778899")
    respuesta = download(client, otro["headers"])
    assert respuesta.status_code == 404  # Luis no tiene certificado y no puede pedir el de Ana
    assert (
        client.get(f"/api/certificate/pdf?codigo={codigo}", headers=otro["headers"]).status_code
        == 404
    )


def test_pdf_con_puntaje_de_actividades_obligatorias(mclient):
    headers = new_user(mclient)
    for modulo in range(1, 7):
        complete_module(mclient, headers, modulo)
    issue(mclient, headers)
    texto = pdf_text(download(mclient, headers).content)
    assert "480" in texto
    assert "100,0 % de las actividades obligatorias" in texto


def test_pdf_tiene_limite_de_descargas_por_usuario(client):
    headers, _ = issue_for(client)
    estados = [download(client, headers).status_code for _ in range(12)]
    assert estados == [200] * 10 + [429, 429]


def test_render_directo_no_falla_con_caracteres_que_la_fuente_no_trae():
    certificado = Certificate(
        user_id=1,
        codigo="OVA-7K3M-9QXA",
        nombre="李小龍",
        apellido="山田",
        tipo_identificacion="ZZ",  # fuera del catálogo: se imprime tal cual
        numero_identificacion="X1",
        puntaje_total=10,
        created_at=datetime(2026, 9, 24, 15, 0, tzinfo=UTC),
    )
    contenido = render_certificate_pdf(certificado, "https://ova.example")
    assert contenido.startswith(b"%PDF-")
    assert "identificado(a) con ZZ" in pdf_text(contenido)


def test_fecha_en_espanol_en_hora_de_colombia():
    assert (
        format_spanish_date(datetime(2026, 9, 25, 3, 30, tzinfo=UTC)) == "24 de septiembre de 2026"
    )
    assert format_spanish_date(datetime(2026, 1, 1, 12, 0, tzinfo=UTC)) == "1 de enero de 2026"
    assert format_spanish_date(datetime(2026, 1, 1, 3, 0, tzinfo=UTC)) == "31 de diciembre de 2025"


@pytest.mark.parametrize(
    ("porcentaje", "clave"),
    [
        (None, "cumplimiento"),
        (59.9, "cumplimiento"),
        (60.0, "cumplimiento"),
        (70.0, "satisfactorio"),
        (84.9, "satisfactorio"),
        (85.0, "sobresaliente"),
        (95.0, "excelencia"),
        (100.0, "excelencia"),
    ],
)
def test_nivel_de_diploma_segun_porcentaje(porcentaje, clave):
    assert nivel_de_diploma(porcentaje).clave == clave


def test_cada_nivel_tiene_su_fondo():
    for nivel in NIVELES_DIPLOMA:
        assert (DIPLOMAS_DIR / f"diploma_{nivel.clave}.jpg").is_file()
