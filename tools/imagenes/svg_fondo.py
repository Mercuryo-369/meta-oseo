"""Parte sin GPU del flujo de ilustraciones realistas (tools/imagenes/README.md): medidas, bocetos y zonas.

- `tamano_generacion`: medidas de trabajo de SDXL (múltiplos de 64, ~1 MP) más cercanas a la proporción del viewBox.
- `svg_sin_capas`: el SVG sin las capas que no debe pintar la IA (moléculas, receptores: van dibujadas encima).
- `svg_como_zonas`: el SVG que va ENCIMA de la ilustración: las estructuras se vuelven invisibles pero tocables
  (con su zona táctil explícita) y siguen recibiendo el contorno de selección; las capas «glifo» quedan dibujadas.
- `poner_fondo`: añade `fondo` a la config de las actividades multicapa que usan ese SVG.
"""

from __future__ import annotations

import copy
import itertools
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

NS = "http://www.w3.org/2000/svg"
MARCA = "Zonas sobre la ilustración"  # comentario que deja svg_como_zonas: el SVG ya está transformado
ET.register_namespace("", NS)
ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")

FORMAS = {"path", "rect", "circle", "ellipse", "line", "polyline", "polygon"}
NO_RENDERIZADOS = {"defs", "clipPath", "mask", "marker", "pattern", "symbol", "linearGradient", "radialGradient"}


def _local(tag) -> str:
    # Los comentarios conservados tienen por etiqueta la función ET.Comment, no un texto.
    return tag.rsplit("}", 1)[-1] if isinstance(tag, str) else ""


def leer(texto: str) -> ET.Element:
    """Interpreta el SVG conservando los comentarios (la cabecera de cada SVG explica su convención)."""
    return ET.fromstring(texto, parser=ET.XMLParser(target=ET.TreeBuilder(insert_comments=True)))


def escribir(raiz: ET.Element) -> str:
    return ET.tostring(raiz, encoding="unicode") + "\n"


def viewbox(raiz: ET.Element) -> tuple[float, float]:
    _, _, ancho, alto = (float(v) for v in raiz.attrib["viewBox"].replace(",", " ").split())
    return ancho, alto


def tamano_generacion(ancho: float, alto: float, area: int = 1024 * 1024, paso: int = 64) -> tuple[int, int]:
    """Medidas de generación: múltiplos de `paso`, área cercana a `area` y la proporción más parecida al viewBox.

    La ilustración se genera con estas medidas y luego se reescala a la proporción exacta del viewBox; como el boceto
    de bordes sufre la misma deformación, la correspondencia con las zonas táctiles es exacta.
    """
    proporcion = ancho / alto
    mejor, puntos = (1024, 1024), float("inf")
    for w in range(512, 2048 + paso, paso):
        h = max(paso, round(w / proporcion / paso) * paso)
        p = abs(w * h - area) / area + 4 * abs(w / h - proporcion) / proporcion
        if p < puntos:
            mejor, puntos = (w, h), p
    return mejor


def _padres(raiz: ET.Element) -> dict[ET.Element, ET.Element]:
    return {hijo: padre for padre in raiz.iter() for hijo in padre}


def _grupos_por_id(raiz: ET.Element, ids: set[str]) -> list[ET.Element]:
    return [e for e in raiz.iter() if e.get("id") in ids]


def _hijos_dibujados(e: ET.Element) -> list[ET.Element]:
    return [c for c in e if _local(c.tag) not in {"", "title", "desc"}]


def _es_anotacion(e: ET.Element) -> bool:
    """Grupo sin id con un texto directo: un rótulo con sus líneas guía (no es una estructura)."""
    return _local(e.tag) == "g" and not e.get("id") and any(_local(c.tag) == "text" for c in e)


def _area(e: ET.Element) -> float | None:
    """Área de un rect, círculo o elipse en unidades del viewBox (None para otras formas)."""
    try:
        if _local(e.tag) == "rect":
            return float(e.get("width", 0)) * float(e.get("height", 0))
        if _local(e.tag) == "circle":
            return 3.1416 * float(e.get("r", 0)) ** 2
        if _local(e.tag) == "ellipse":
            return 3.1416 * float(e.get("rx", 0)) * float(e.get("ry", 0))
    except ValueError:
        return None
    return None


def _pastillas(raiz: ET.Element) -> set[ET.Element]:
    """Rect, círculo o elipse PEQUEÑO (menos del 3 % del dibujo) justo antes de un texto en el mismo grupo: el fondo
    del rótulo («Vestibular», «Tiempo»). Un panel grande seguido de su título no lo es."""
    ancho, alto = viewbox(raiz)
    pastillas = set()
    for padre in raiz.iter():
        hijos = _hijos_dibujados(padre)
        for anterior, actual in itertools.pairwise(hijos):
            area = _area(anterior)
            if _local(actual.tag) == "text" and area is not None and area <= 0.03 * ancho * alto:
                pastillas.add(anterior)
    return pastillas


def svg_sin_capas(texto: str, quitar: list[str], colores: list[str] = ()) -> str:
    """Copia del SVG sin las capas `quitar`, las zonas táctiles ni los rótulos: el boceto que guía a la IA (con texto,
    la IA pinta letras inventadas)."""
    raiz = leer(texto)
    padres = _padres(raiz)
    fuera = _grupos_por_id(raiz, set(quitar)) + [e for e in raiz.iter() if "data-zona-toque" in e.attrib]
    fuera += [e for e in raiz.iter() if _local(e.tag) == "text" or _es_anotacion(e)] + list(_pastillas(raiz))
    fuera += [e for e in raiz.iter() if _de_color(e, colores)]
    for e in fuera:
        if e in padres and e in list(padres[e]):
            padres[e].remove(e)
    return escribir(raiz)


def _dentro_de(e: ET.Element, padres: dict, condicion) -> bool:
    nodo = padres.get(e)
    while nodo is not None:
        if condicion(nodo):
            return True
        nodo = padres.get(nodo)
    return False


ATRIBUTOS_NO_CLONADOS = (
    "id",
    "fill",
    "fill-opacity",
    "stroke",
    "stroke-opacity",
    "stroke-width",
    "opacity",
    "filter",
    "class",
    "style",
)


def _heredado(e: ET.Element, atributo: str, padres: dict, defecto: str) -> str:
    nodo = e
    while nodo is not None:
        if atributo in nodo.attrib:
            return nodo.attrib[atributo].strip()
        nodo = padres.get(nodo)
    return defecto


def _pinta_relleno(e: ET.Element, padres: dict) -> bool:
    nodo = e
    while nodo is not None:
        if "fill" in nodo.attrib:
            return nodo.attrib["fill"].strip().lower() not in {"none", "transparent"}
        nodo = padres.get(nodo)
    return True  # relleno por defecto de SVG: negro


def svg_solo_capas(texto: str, capas: list[str]) -> str:
    """Copia del SVG con solo las formas de las capas `capas` (para las máscaras de corrección): el resto se quita."""
    raiz = leer(texto)
    padres = _padres(raiz)
    ids = set(capas)
    for e in list(raiz.iter()):
        if _local(e.tag) not in FORMAS and _local(e.tag) != "text":
            continue
        if e.get("id") in ids or _dentro_de(e, padres, lambda n: n.get("id") in ids):
            continue
        if e in padres:
            padres[e].remove(e)
    return escribir(raiz)


def _de_color(e: ET.Element, colores) -> bool:
    """Forma pintada con uno de `colores` (flechas o marcas sueltas dentro de un grupo de fondo)."""
    return _local(e.tag) in FORMAS and (e.get("fill") or "").lower() in {c.lower() for c in colores}


def svg_como_zonas(texto: str, glifos: list[str], capas: list[str], fondo: str, colores: list[str] = ()) -> str:
    """SVG para poner encima de la ilustración `fondo`.

    - Las formas fuera de las capas `glifos` se vuelven invisibles: `fill-opacity="0"` y `stroke="none"`. El CSS de
      la actividad pone el contorno de selección con la propiedad `stroke`, que gana al atributo: al elegir una capa,
      su contorno se dibuja sobre la ilustración.
    - A cada capa de `capas` sin zona propia se le añade un `<g data-zona-toque>` con copias transparentes de sus
      formas con relleno (el componente solo clona formas visibles y estas ya no lo son).
    - Los rótulos se conservan dibujados (textos, sus grupos sin id con líneas guía y la forma de fondo que los
      precede) y cada texto recibe un halo blanco para leerse sobre la ilustración. También las formas de `colores`.
    """
    raiz = leer(texto)
    padres = _padres(raiz)
    ids_glifo = set(glifos)
    ancho_tactil = round(44 * viewbox(raiz)[0] / 320, 1)

    for capa in _grupos_por_id(raiz, set(capas) - ids_glifo):
        if (
            capa.find(".//*[@data-zona-toque]") is not None
            or capa.find(f".//*[@id='{capa.get('id')}_toque']") is not None
        ):
            continue
        zona = ET.Element(f"{{{NS}}}g", {"data-zona-toque": "", "fill": "transparent", "stroke": "none"})
        for forma in capa.iter():
            if _local(forma.tag) not in FORMAS or _dentro_de(forma, padres, lambda n: _local(n.tag) in NO_RENDERIZADOS):
                continue
            relleno = _pinta_relleno(forma, padres)
            if not relleno and _heredado(forma, "stroke", padres, "none").lower() in {"none", "transparent"}:
                continue
            clon = copy.deepcopy(forma)
            for atributo in ATRIBUTOS_NO_CLONADOS:
                clon.attrib.pop(atributo, None)
            if not relleno:
                # Solo contorno (fibras, láminas): trazo transparente con el ancho táctil mínimo, como hace el
                # componente con las zonas automáticas (44 px sobre el ancho de referencia de 320 px).
                ancho = float(_heredado(forma, "stroke-width", padres, "1") or 1)
                clon.attrib.update(
                    {"fill": "none", "stroke": "transparent", "stroke-width": f"{max(ancho, ancho_tactil):g}"}
                )
            zona.append(clon)
        if len(zona):
            capa.append(zona)

    padres = _padres(raiz)
    pastillas = _pastillas(raiz)
    for forma in list(raiz.iter()):
        if _local(forma.tag) == "text" and "stroke" not in forma.attrib:
            forma.attrib.update(
                {"stroke": "#ffffff", "stroke-width": "4", "stroke-linejoin": "round", "paint-order": "stroke"}
            )
        if _local(forma.tag) not in FORMAS or forma in pastillas or _de_color(forma, colores):
            continue
        if _dentro_de(forma, padres, lambda n: "data-zona-toque" in n.attrib or _local(n.tag) in NO_RENDERIZADOS):
            continue
        if forma.get("id") in ids_glifo or _dentro_de(
            forma, padres, lambda n: n.get("id") in ids_glifo or _es_anotacion(n)
        ):
            continue
        forma.set("fill-opacity", "0")
        forma.set("stroke", "none")

    nota = ET.Comment(
        f" {MARCA} {fondo} (tools/imagenes): las estructuras son invisibles y tocables; "
        f"quedan dibujadas solo las capas {', '.join(glifos) or '(ninguna)'}. "
    )
    nota.tail = "\n"
    raiz.insert(0, nota)
    return escribir(raiz)


def poner_fondo(content_json: Path, svg: str, fondo: str, svg_nuevo: str | None = None) -> list[str]:
    """Añade `fondo` (tras `viewBox`) a la config de cada multicapa con ese `svg`; devuelve los ids tocados."""
    datos = json.loads(content_json.read_text(encoding="utf-8"))
    tocadas: list[str] = []

    def recorrer(nodo, actividad=None):
        if isinstance(nodo, list):
            for x in nodo:
                recorrer(x, actividad)
        elif isinstance(nodo, dict):
            if nodo.get("tipo") == "multicapa" and isinstance(nodo.get("config"), dict):
                config = nodo["config"]
                if config.get("svg") == svg:
                    nueva = {}
                    for k, v in config.items():
                        if k == "fondo":
                            continue
                        nueva[k] = svg_nuevo if (k == "svg" and svg_nuevo) else v
                        if k == "viewBox":
                            nueva["fondo"] = fondo
                    nodo["config"] = nueva
                    tocadas.append(nodo.get("id", "?"))
            for v in nodo.values():
                recorrer(v)

    recorrer(datos)
    if tocadas:
        content_json.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    return tocadas


def capas_de(content_json: Path, svg: str) -> list[str]:
    """Ids de las capas que declaran las multicapa con ese `svg` (las que el estudiante toca)."""
    ids: list[str] = []

    def recorrer(nodo):
        if isinstance(nodo, list):
            for x in nodo:
                recorrer(x)
        elif isinstance(nodo, dict):
            config = nodo.get("config")
            if nodo.get("tipo") == "multicapa" and isinstance(config, dict) and config.get("svg") == svg:
                ids.extend(c["id"] for c in config.get("capas", []) if c.get("id") not in ids)
            for v in nodo.values():
                recorrer(v)

    recorrer(json.loads(content_json.read_text(encoding="utf-8")))
    return ids


def usos_del_svg(raiz_repo: Path, svg: str) -> list[tuple[str, str]]:
    """(id de actividad o bloque, tipo) de todo lo que usa ese SVG en los content.json."""
    usos = []
    for p in sorted((raiz_repo / "apps/web/src/modules").glob("*/content.json")):
        texto = p.read_text(encoding="utf-8")
        for m in re.finditer(re.escape(f'"{svg}"'), texto):
            antes = texto[: m.start()]
            ids = re.findall(r'"id":\s*"([^"]+)"', antes)
            tipos = re.findall(r'"tipo":\s*"([^"]+)"', antes)
            usos.append((ids[-1] if ids else "?", tipos[-1] if tipos else "?"))
    return usos


def usar_figura(content_json: Path, svg: str, figura: str, ancho: int, alto: int) -> list[str]:
    """Añade la `figura` (raster con rótulos) donde el dibujo es solo una imagen: `figura` en los bloques `imagen`
    con ese `src` y `fondo` en las escenas de `arrastre-molecular` con ese `fondo_svg`. El SVG se conserva como
    dibujo validado. Devuelve qué tocó."""
    datos = json.loads(content_json.read_text(encoding="utf-8"))
    tocadas: list[str] = []

    def recorrer(nodo):
        if isinstance(nodo, list):
            for x in nodo:
                recorrer(x)
        elif isinstance(nodo, dict):
            if nodo.get("tipo") == "imagen" and nodo.get("src") == svg:
                nuevo = {}
                for k, v in nodo.items():
                    if k == "figura":
                        continue
                    nuevo[k] = v
                    if k == "src":
                        nuevo["figura"] = figura
                nodo.clear()
                nodo.update(nuevo)
                tocadas.append(f"{nodo.get('id', '?')} (imagen)")
            escena = nodo.get("escena") if isinstance(nodo.get("escena"), dict) else None
            if escena and escena.get("fondo_svg") == svg:
                escena["fondo"] = figura
                tocadas.append("escena de arrastre")
            for v in nodo.values():
                recorrer(v)

    recorrer(datos)
    if tocadas:
        content_json.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    return tocadas
