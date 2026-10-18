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
<g id="adorno"><circle cx="10" cy="10" r="5" fill="#fff"/></g>
<g id="nucleo"><ellipse cx="500" cy="300" rx="60" ry="40" fill="#5b3a8c"/>
<g data-zona-toque="" fill="transparent"><ellipse cx="500" cy="300" rx="80" ry="60"/></g></g>
<g id="bomba"><rect x="400" y="480" width="20" height="30" fill="#2a9db5"/><text x="0" y="0">H+</text></g>
<defs><linearGradient id="d"><stop offset="0"/></linearGradient></defs>
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
    texto = svg_fondo.svg_como_zonas(SVG, ["bomba"], ["hueso", "nucleo", "bomba"], "/images/m2/x.webp")
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
    assert len(formas) == 1  # solo el path con relleno; la línea de solo contorno no
    assert formas[0].get("fill") is None and formas[0].get("stroke") is None


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
