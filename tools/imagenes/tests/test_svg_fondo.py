"""Pruebas de la parte sin GPU del flujo de ilustraciones (tools/imagenes/svg_fondo.py)."""

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import svg_fondo

NS = {"s": "http://www.w3.org/2000/svg"}

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 900" fill="none">
<!-- cabecera original -->
<g id="hueso"><path d="M0,500 L1000,500 L1000,900 L0,900 Z" fill="#d98aa2" stroke="currentColor"/>
<path d="M0,800 L1000,800" fill="none" stroke="#a8748c"/></g>
<g id="fibras"><path d="M0,100 L900,100" fill="none" stroke="#a8748c" stroke-width="3"/></g>
<g id="adorno"><circle cx="10" cy="10" r="5" fill="#fff"/></g>
<g id="nucleo"><ellipse cx="500" cy="300" rx="60" ry="40" fill="#5b3a8c"/>
<g data-zona-toque="" fill="transparent"><ellipse cx="500" cy="300" rx="80" ry="60"/></g></g>
<g id="bomba"><rect x="400" y="480" width="20" height="30" fill="#2a9db5"/><text x="0" y="0">H+</text></g>
<defs><linearGradient id="d"><stop offset="0"/></linearGradient></defs>
<g id="fondo"><rect x="10" y="10" width="80" height="20" fill="#fff"/><text x="12" y="25">Vestibular</text>
<path d="M0,0 L5,5" stroke="#000"/></g>
<g id="panel"><rect x="0" y="0" width="900" height="800" fill="#fff"/><text x="5" y="5">Normal</text></g>
<g><line x1="0" y1="0" x2="50" y2="50" stroke="#333"/><text x="60" y="60">Cortical</text></g>
</svg>"""


def test_tamano_generacion_multiplos_de_64_y_proporcion():
    w, h = svg_fondo.tamano_generacion(1000, 900)
    assert w % 64 == 0 and h % 64 == 0
    assert abs(w * h - 1024 * 1024) / (1024 * 1024) < 0.1
    assert abs(w / h - 1000 / 900) < 0.05
    w, h = svg_fondo.tamano_generacion(1600, 900)
    assert w > h and w % 64 == 0 and h % 64 == 0


def test_svg_sin_capas_quita_glifos_y_zonas():
    raiz = svg_fondo.leer(svg_fondo.svg_sin_capas(SVG, ["bomba"]))
    assert raiz.find(".//*[@id='bomba']") is None
    assert raiz.find(".//*[@data-zona-toque]") is None
    assert raiz.find(".//*[@id='hueso']") is not None


def _como_zonas():
    texto = svg_fondo.svg_como_zonas(SVG, ["bomba"], ["hueso", "nucleo", "bomba", "fibras"], "/images/m2/x.webp")
    return texto, svg_fondo.leer(texto)


def test_estructuras_invisibles_y_glifos_intactos():
    _, raiz = _como_zonas()
    for forma in raiz.find(".//*[@id='hueso']"):
        if svg_fondo._local(forma.tag) == "path":
            assert forma.get("fill-opacity") == "0" and forma.get("stroke") == "none"
    assert raiz.find(".//*[@id='adorno']/s:circle", NS).get("fill-opacity") == "0"
    rect = raiz.find(".//*[@id='bomba']/s:rect", NS)
    assert rect.get("fill-opacity") is None and rect.get("fill") == "#2a9db5"
    assert raiz.find(".//*[@id='bomba']/s:text", NS).text == "H+"


def test_zona_propia_se_conserva_y_no_se_duplica():
    _, raiz = _como_zonas()
    zonas = raiz.findall(".//*[@id='nucleo']//*[@data-zona-toque]")
    assert len(zonas) == 1
    assert zonas[0].find("s:ellipse", NS).get("fill-opacity") is None  # la zona no se toca


def test_capa_sin_zona_recibe_zona_con_sus_formas_rellenas():
    _, raiz = _como_zonas()
    zona = raiz.find(".//*[@id='hueso']/*[@data-zona-toque]")
    assert zona is not None and zona.get("fill") == "transparent" and zona.get("stroke") == "none"
    formas = list(zona)
    assert len(formas) == 2  # el path con relleno y la línea de solo contorno, cada uno a su manera
    assert formas[0].get("fill") is None and formas[0].get("stroke") is None
    assert formas[1].get("fill") == "none" and formas[1].get("stroke") == "transparent"
    assert float(formas[1].get("stroke-width")) >= 44 * 1000 / 320 - 0.1


def test_capas_no_declaradas_no_reciben_zona_y_comentarios_se_conservan():
    texto, raiz = _como_zonas()
    assert raiz.find(".//*[@id='adorno']/*[@data-zona-toque]") is None
    assert "cabecera original" in texto and "/images/m2/x.webp" in texto
    ET.fromstring(texto)  # bien formado


def test_poner_fondo_tras_viewbox_e_idempotente(tmp_path):
    p = tmp_path / "content.json"
    actividad = {
        "id": "m2_x",
        "tipo": "multicapa",
        "config": {"svg": "/images/m2/x.svg", "viewBox": "0 0 1000 900", "alt": "a", "capas": [{"id": "hueso"}]},
    }
    otra = {"id": "m2_y", "tipo": "imagen", "config": {"svg": "/images/m2/x.svg"}}
    p.write_text(json.dumps({"secciones": [{"actividades": [actividad, otra]}]}), encoding="utf-8")
    for _ in range(2):
        assert svg_fondo.poner_fondo(p, "/images/m2/x.svg", "/images/m2/x.webp") == ["m2_x"]
    config = json.loads(p.read_text(encoding="utf-8"))["secciones"][0]["actividades"][0]["config"]
    assert list(config) == ["svg", "viewBox", "fondo", "alt", "capas"]
    assert svg_fondo.capas_de(p, "/images/m2/x.svg") == ["hueso"]

    svg_fondo.poner_fondo(p, "/images/m2/x.svg", "/images/m2/x.webp", "/images/m2/x_zonas.svg")
    config = json.loads(p.read_text(encoding="utf-8"))["secciones"][0]["actividades"][0]["config"]
    assert config["svg"] == "/images/m2/x_zonas.svg"


def test_rotulos_fuera_del_boceto():
    raiz = svg_fondo.leer(svg_fondo.svg_sin_capas(SVG, []))
    assert not raiz.findall(".//s:text", NS)
    assert raiz.find(".//s:line", NS) is None  # línea guía del rótulo
    assert raiz.find(".//*[@id='fondo']/s:rect", NS) is None  # pastilla
    assert raiz.find(".//*[@id='fondo']/s:path", NS) is not None


def test_rotulos_dibujados_con_halo_sobre_la_ilustracion():
    _, raiz = _como_zonas()
    pastilla = raiz.find(".//*[@id='fondo']/s:rect", NS)
    assert pastilla.get("fill-opacity") is None
    assert raiz.find(".//*[@id='fondo']/s:path", NS).get("fill-opacity") == "0"
    assert raiz.find(".//s:line", NS).get("stroke") == "#333"
    for texto in raiz.findall(".//s:text", NS):
        if texto.text != "H+":
            assert texto.get("stroke") == "#ffffff" and texto.get("paint-order") == "stroke"


def test_panel_grande_antes_de_un_titulo_no_es_pastilla():
    _, raiz = _como_zonas()
    assert raiz.find(".//*[@id='panel']/s:rect", NS).get("fill-opacity") == "0"


def test_capa_de_solo_contorno_recibe_zona_tactil_ancha():
    _, raiz = _como_zonas()
    linea = raiz.find(".//*[@id='fibras']/*[@data-zona-toque]/s:path", NS)
    assert linea.get("stroke") == "transparent" and float(linea.get("stroke-width")) >= 137


def test_svg_solo_capas_deja_solo_las_formas_pedidas():
    raiz = svg_fondo.leer(svg_fondo.svg_solo_capas(SVG, ["nucleo"]))
    assert raiz.find(".//*[@id='nucleo']/s:ellipse", NS) is not None
    assert raiz.find(".//*[@id='hueso']/s:path", NS) is None
    assert not raiz.findall(".//s:text", NS)


PANEL = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
<g transform="translate(10,10)"><path d="M0,0 L300,0 L300,200 L0,200 Z" fill="#d98aa2"/><text x="5" y="20">Etapa 1</text></g>
<g id="celula"><circle cx="500" cy="300" r="6" fill="#8b7bdc"/><text x="600" y="400">Núcleo</text></g>
</svg>"""


def test_un_panel_con_su_titulo_dentro_no_es_anotacion():
    raiz = svg_fondo.leer(svg_fondo.svg_sin_capas(PANEL, []))
    assert raiz.find(".//s:path", NS) is not None  # el panel sigue
    assert not raiz.findall(".//s:text", NS)  # su título se quita


def test_una_forma_pequena_antes_de_un_texto_lejano_no_es_pastilla():
    raiz = svg_fondo.leer(svg_fondo.svg_sin_capas(PANEL, []))
    assert raiz.find(".//*[@id='celula']/s:circle", NS) is not None
