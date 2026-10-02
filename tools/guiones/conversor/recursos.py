"""Datos de apoyo del convertidor: ancla de los hotspots 3D, viewBox de los SVG y animaciones.

Ninguno de estos datos está en los guiones (los guiones describen QUÉ se muestra, no dónde ni con
qué geometría), así que aquí viven como tablas explícitas y revisables. Todo lo que se deduce de
ellos queda marcado en el informe del convertidor para que el docente o quien dibuja lo confirme.
"""

from __future__ import annotations

import re
from pathlib import Path

from .util import quitar_acentos

# --- viewBox -------------------------------------------------------------------------------------

# Cuando el SVG todavía no existe se usa este viewBox provisional (el de los SVG ya entregados);
# al regenerar con el SVG presente, el convertidor lee el viewBox real del archivo.
VIEWBOX_PROVISIONAL = {
    1: "0 0 800 600",
    2: "0 0 1000 900",
    3: "0 0 800 600",
    4: "0 0 800 600",
    5: "0 0 800 600",
    6: "0 0 800 600",
}

_VIEWBOX = re.compile(r'<svg\b[^>]*?\bviewBox\s*=\s*"([^"]+)"', re.IGNORECASE | re.DOTALL)


def viewbox_de_svg(raiz_web: Path, numero: int, id_svg: str) -> tuple[str, bool]:
    """(viewBox, es_real): el del archivo si existe y es entero, o el provisional del módulo."""
    archivo = raiz_web / "public" / "images" / f"m{numero}" / f"{id_svg}.svg"
    if archivo.is_file():
        m = _VIEWBOX.search(archivo.read_text(encoding="utf-8", errors="replace")[:4000])
        if m:
            partes = m.group(1).replace(",", " ").split()
            if len(partes) == 4 and all(re.fullmatch(r"\d+", p) for p in partes):
                return " ".join(partes), True
    return VIEWBOX_PROVISIONAL.get(numero, "0 0 800 600"), False


# --- Ancla de los hotspots de la mandíbula ---------------------------------------------------------

# La mandíbula del proyecto es UNA sola malla (BodyParts3D): sus zonas se marcan con `ancla`
# {x, y, z} en la caja envolvente (docs/content-schema.md, sección 9). Ejes del SUJETO: x 0 = su
# lado derecho y 1 = el izquierdo; y 0 = borde inferior y 1 = punta del cóndilo; z 0 = atrás y 1 =
# el mentón. Los guiones dicen «la posición exacta la fija quien modele la malla»: la fija
# tools/anclas/calcular_anclas.mjs midiendo la propia malla (docs/anclas-mandibula.md), y reparte las
# estructuras pares entre los dos lados para que los números no se amontonen. La tabla se genera:
# no se edita a mano (la prueba tests/test_anclas_mandibula.py la compara con nodos3d.ts).
# <anclas-mandibula:inicio>
# GENERADO por tools/anclas/calcular_anclas.mjs desde la malla real; no editar a mano (docs/anclas-mandibula.md).
# Cada punto está sobre la superficie del hueso; las estructuras pares se reparten entre los dos lados.
ANCLAS_MANDIBULA: dict[str, tuple[float, float, float]] = {
    "agujero_mentoniano": (0.292, 0.176, 0.768),
    "angulo": (0.135, 0.334, 0.138),
    "apofisis_alveolar": (0.796, 0.282, 0.665),
    "apofisis_coronoides": (0.086, 0.868, 0.508),
    "borde_basal": (0.317, 0.065, 0.778),
    "canino_zona_compresion": (0.663, 0.226, 0.859),
    "canino_zona_tension": (0.403, 0.21, 0.898),
    "condilo": (0.915, 1, 0.052),
    "cortical_basal": (0.434, 0.06, 0.898),
    "cresta_alveolar": (0.36, 0.325, 0.821),
    "cuello_condilo": (0.967, 0.782, 0.081),
    "cuerpo": (0.159, 0.242, 0.576),
    "cuerpo_mandibular_basal": (0.614, 0.061, 0.86),
    "cuerpo_molares": (0.163, 0.211, 0.576),
    "escotadura_mandibular": (0.916, 0.756, 0.37),
    "foramen_mandibular": (0.136, 0.586, 0.207),
    "foramen_mentoniano": (0.292, 0.176, 0.768),
    "hueso_trabecular_cuerpo": (0.739, 0.144, 0.731),
    "lamina_dura": (0.211, 0.325, 0.661),
    "linea_milohioidea": (0.628, 0.21, 0.677),
    "proceso_alveolar": (0.796, 0.282, 0.665),
    "rama": (0.902, 0.37, 0.278),
    "septo_interdental": (0.237, 0.32, 0.709),
    "sinfisis": (0.5, 0.083, 0.938),
    "tabla_cortical_lingual": (0.675, 0.339, 0.615),
    "tabla_cortical_vestibular": (0.525, 0.284, 0.944),
}
# <anclas-mandibula:fin>

# Texto alternativo genérico del modelo (el guion no trae uno).
ALT_MODELO_3D = {
    "mandibula": "Modelo tridimensional de la mandíbula que se puede girar y acercar; sus zonas se tocan para leer su ficha.",
    "celulas": "Modelo tridimensional de las células óseas que se puede girar y acercar; cada célula se toca para leer su ficha.",
}

# --- Animación del efecto (arrastre molecular) -----------------------------------------------------

# Vocabulario cerrado del esquema. Cuando el guion no la da, se deduce del texto del efecto con
# estas reglas, en este orden; la primera que coincide gana. Se avisa en el informe.
_REGLAS_ANIMACION: list[tuple[str, tuple[str, ...]]] = [
    (
        "inhibicion",
        ("inhib", "frena", "neutraliza", "bloque", "impide", "captura", "secuestr", "sin llegar", "no llega"),
    ),
    ("mineralizacion", ("mineraliz", "cristal", "hidroxiapatita", "nucleacion")),
    ("reabsorcion", ("reabsor", "resorc", "disuelv", "digier", "degrada")),
    ("liberacion", ("libera", "secret", "expulsa", "exocitosis", "gránulos", "granulos")),
    (
        "transformacion",
        (
            "diferenci",
            "se fusion",
            "se convierte",
            "transforma",
            "madura",
            "compromete",
            "fundido",
            "cambia de",
            "pasa de",
        ),
    ),
    ("crecimiento", ("prolifera", "se divide", "crece", "aumenta el n", "multiplica")),
    ("cascada", ("cascada", "núcleo", "nucleo", "fosforila", "vía", "via ", "señal avanza")),
    ("activacion", ("activa", "estimula", "enciende", "se ilumina", "pulso")),
]


def inferir_animacion(*textos: str) -> str:
    plano = quitar_acentos(" ".join(textos)).lower()
    for animacion, claves in _REGLAS_ANIMACION:
        if any(quitar_acentos(c).lower() in plano for c in claves):
            return animacion
    return "union"
