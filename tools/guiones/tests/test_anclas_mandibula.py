"""La tabla ANCLAS_MANDIBULA del convertidor es la misma que calcula tools/anclas/calcular_anclas.mjs.

La fuente es el bloque generado de apps/web/src/content/nodos3d.ts (`ESTRUCTURAS_MANDIBULA`); el script la
escribe también en recursos.py. Si alguien toca una de las dos a mano, esta prueba lo avisa.
"""

from __future__ import annotations

import re

from conftest import RAIZ
from conversor.recursos import ANCLAS_MANDIBULA

NODOS_3D = RAIZ / "apps" / "web" / "src" / "content" / "nodos3d.ts"

_ESTRUCTURA = re.compile(
    r"^  (?P<id>[a-z_0-9]+): \{\n    ancla: \{ x: (?P<x>[0-9.]+), y: (?P<y>[0-9.]+), z: (?P<z>[0-9.]+) \},$",
    re.MULTILINE,
)


def _tabla_de_nodos3d() -> dict[str, tuple[float, float, float]]:
    texto = NODOS_3D.read_text(encoding="utf-8")
    bloque = texto.split("export const ESTRUCTURAS_MANDIBULA", 1)[1].split("};", 1)[0]
    return {m["id"]: (float(m["x"]), float(m["y"]), float(m["z"])) for m in _ESTRUCTURA.finditer(bloque)}


def test_la_tabla_del_convertidor_coincide_con_la_de_nodos3d():
    fuente = _tabla_de_nodos3d()
    assert len(fuente) >= 20, "no se pudo leer ESTRUCTURAS_MANDIBULA de nodos3d.ts"
    assert fuente == ANCLAS_MANDIBULA


def test_cada_ancla_esta_entre_0_y_1():
    for ident, punto in ANCLAS_MANDIBULA.items():
        assert len(punto) == 3, ident
        assert all(0 <= v <= 1 for v in punto), f"{ident}: {punto}"


def test_las_estructuras_del_mismo_punto_son_alias_exactos():
    # El foramen y el agujero mentoniano son la misma estructura; la apófisis y el proceso alveolar, también.
    assert ANCLAS_MANDIBULA["foramen_mentoniano"] == ANCLAS_MANDIBULA["agujero_mentoniano"]
    assert ANCLAS_MANDIBULA["proceso_alveolar"] == ANCLAS_MANDIBULA["apofisis_alveolar"]
