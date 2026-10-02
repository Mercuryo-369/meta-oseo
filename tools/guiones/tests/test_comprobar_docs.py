"""Pruebas de la comprobación de documentos (`tools/guiones/comprobar_docs.py`)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from test_pendientes import CONSTANTES, CONTENIDO, ENUMS, GUION, LOGROS, SETTINGS, _escribir

import comprobar_docs as cd
from conftest import RAIZ

# --- Enlaces --------------------------------------------------------------------------------------


def _md(carpeta: Path, ruta: str, texto: str) -> Path:
    destino = carpeta / ruta
    _escribir(destino, texto)
    return destino


def test_anclas_siguen_las_reglas_de_github():
    texto = "# Título uno\n\n## 3. Decisiones: qué y por qué\n\n## Repetido\n\n## Repetido\n\n```\n## En código\n```\n"
    assert cd.anclas_de(texto) == {"título-uno", "3-decisiones-qué-y-por-qué", "repetido", "repetido-1"}


def test_enlaces_correctos_no_dan_problemas(tmp_path: Path):
    _md(tmp_path, "docs/otro.md", "# Otro\n\n## Sección dos\n")
    _md(tmp_path, "docs/datos.json", "{}")
    doc = _md(
        tmp_path,
        "docs/uno.md",
        "# Uno\n\n## Parte\n\n[a](otro.md) [b](otro.md#sección-dos) [c](#parte) [d](datos.json) "
        '[e](https://ejemplo.org/x) [f](mailto:a@b.co) [g](../docs) [h](otro.md "con título")\n',
    )
    assert cd.comprobar_enlaces(tmp_path, [doc]) == []


def test_enlace_a_archivo_que_no_existe(tmp_path: Path):
    doc = _md(tmp_path, "docs/uno.md", "# Uno\n\nVer [otro](no_existe.md).\n")
    assert cd.comprobar_enlaces(tmp_path, [doc]) == ["docs/uno.md:3: el archivo «no_existe.md» no existe"]


def test_enlace_a_ancla_que_no_existe_en_el_mismo_o_en_otro_archivo(tmp_path: Path):
    _md(tmp_path, "docs/otro.md", "# Otro\n")
    doc = _md(tmp_path, "docs/uno.md", "# Uno\n\n[a](#falta) y [b](otro.md#falta)\n")
    problemas = cd.comprobar_enlaces(tmp_path, [doc])
    assert len(problemas) == 2
    assert "«#falta» no existe en uno.md" in problemas[0]
    assert "«#falta» no existe en otro.md" in problemas[1]


def test_ancla_en_un_archivo_que_no_es_markdown(tmp_path: Path):
    _md(tmp_path, "docs/datos.json", "{}")
    doc = _md(tmp_path, "docs/uno.md", "# Uno\n\n[a](datos.json#algo)\n")
    assert "no es un .md" in cd.comprobar_enlaces(tmp_path, [doc])[0]


def test_enlaces_en_codigo_e_imagenes_se_ignoran(tmp_path: Path):
    doc = _md(
        tmp_path,
        "docs/uno.md",
        "# Uno\n\n```markdown\n[roto](no_existe.md)\n```\n\nY `[roto](no_existe.md)` en línea, o ![figura](m1_hueso_svg).\n",
    )
    assert cd.comprobar_enlaces(tmp_path, [doc]) == []


def test_documentos_con_enlaces_incluye_los_de_la_raiz_y_docs_pero_no_los_guiones(tmp_path: Path):
    for ruta in (
        "README.md",
        "TODO.md",
        "docs/a.md",
        "docs/guion-por-modulo/README.md",
        "docs/guion-por-modulo/m1_x.md",
    ):
        _md(tmp_path, ruta, "# T\n")
    nombres = [d.relative_to(tmp_path).as_posix() for d in cd.documentos_con_enlaces(tmp_path)]
    assert nombres == ["README.md", "TODO.md", "docs/a.md", "docs/guion-por-modulo/README.md"]


# --- Cifras ---------------------------------------------------------------------------------------


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    _escribir(tmp_path / "apps/web/src/modules/m1_prueba/content.json", json.dumps(CONTENIDO, ensure_ascii=False))
    _escribir(tmp_path / "docs/guion-por-modulo/m1_prueba.md", GUION)
    _escribir(tmp_path / "services/api/app/core/settings.py", SETTINGS)
    _escribir(tmp_path / "services/api/app/models/enums.py", ENUMS)
    _escribir(tmp_path / "services/api/app/services/achievements.py", LOGROS)
    _escribir(tmp_path / "apps/web/src/content/constantes.ts", CONSTANTES)
    _escribir(tmp_path / "services/api/app/data/corpus.jsonl", '{"a": 1}\n{"a": 2}\n\n{"a": 3}\n')
    return tmp_path


def test_cifras_reales_se_cuentan_de_los_archivos(repo: Path):
    c = cd.cifras_reales(repo)
    assert c["modulos"] == 1
    assert (c["actividades"], c["obligatorias"]) == (2, 1)
    assert (c["puntos"], c["puntos_obligatorios"]) == (50, 40)
    assert (c["m1_puntos"], c["m1_puntos_obligatorios"], c["m1_duracion"], c["m1_secciones"]) == (50, 40, 30, 2)
    assert c["tipo_quiz"] == 1 and c["tipo_arrastre-molecular"] == 1
    assert (c["pendientes"], c["referencias"], c["notas"]) == (5, 2, 6)
    assert c["cert_min"] == 85
    assert c["puntos_umbral"] == 34  # 85 % de 40
    assert c["fragmentos_corpus"] == 3  # las líneas en blanco no cuentan
    assert (c["logros"], c["tipos_identificacion"], c["decisiones"]) == (2, 2, 20)
    assert (c["bloques_posgrado"], c["videos_reales"]) == (0, 0)


def test_marcas_de_cifra_que_coinciden(repo: Path):
    doc = _md(
        repo,
        "docs/uno.md",
        "Hay <!--c:actividades-->2<!--/c--> actividades y <!--c:puntos-->50<!--/c--> puntos; "
        "el umbral es <!--c:puntos_umbral-->3 4<!--/c-->.\n",
    )
    assert cd.comprobar_cifras(repo, [doc]) == []


def test_marca_que_no_coincide_clave_desconocida_y_sin_numero(repo: Path):
    doc = _md(
        repo,
        "docs/uno.md",
        "<!--c:actividades-->9<!--/c-->\n<!--c:inventada-->1<!--/c-->\n<!--c:puntos-->muchos<!--/c-->\n",
    )
    problemas = cd.comprobar_cifras(repo, [doc])
    assert "«actividades» dice 9 pero el repositorio tiene 2" in problemas[0]
    assert "la cifra «inventada» no existe" in problemas[1]
    assert "no trae un número" in problemas[2]


def test_manifiesto_desactualizado_se_detecta(repo: Path):
    manifiesto = {"totales": {"actividades": 2, "obligatorias": 1, "puntaje_max": 50, "puntaje_max_obligatorias": 40}}
    _escribir(repo / "services/api/app/data/actividades_manifest.json", json.dumps(manifiesto))
    assert cd.comprobar_cifras(repo, []) == []
    manifiesto["totales"]["puntaje_max"] = 60
    _escribir(repo / "services/api/app/data/actividades_manifest.json", json.dumps(manifiesto))
    problemas = cd.comprobar_cifras(repo, [])
    assert len(problemas) == 1 and "puntaje_max = 60 pero el contenido suma 50" in problemas[0]


# --- Ortografía --------------------------------------------------------------------------------------


def test_ortografia_detecta_palabras_sin_tilde_y_repetidas(tmp_path: Path):
    doc = _md(tmp_path, "docs/uno.md", "# Uno\n\nLa informacion de la la pagina, tambien.\n")
    problemas = cd.comprobar_ortografia(tmp_path, [doc])
    assert len(problemas) == 4
    assert any("«informacion» debería llevar tilde: «información»" in p for p in problemas)
    assert any("palabra repetida «la la»" in p for p in problemas)
    assert any("«pagina»" in p for p in problemas) and any("«tambien»" in p for p in problemas)


def test_ortografia_no_mira_codigo_archivos_ni_direcciones(tmp_path: Path):
    doc = _md(
        tmp_path,
        "docs/uno.md",
        "# Uno\n\nEl campo `numero_identificacion` y `version` van en [revision-docente.md](revision-docente.md); "
        'ver https://ejemplo.org/pagina y el archivo revision.md.\n\n```json\n{"version": 1, "la la": 2}\n```\n',
    )
    assert cd.comprobar_ortografia(tmp_path, [doc]) == []


def test_ortografia_deja_pasar_repeticiones_legitimas_y_palabras_con_tilde(tmp_path: Path):
    doc = _md(tmp_path, "docs/uno.md", "# Uno\n\nLa versión, el código y la sección. Dijo «ja ja» y muy muy bien.\n")
    assert cd.comprobar_ortografia(tmp_path, [doc]) == []


def test_una_repeticion_con_codigo_en_medio_no_es_repeticion(tmp_path: Path):
    doc = _md(tmp_path, "docs/uno.md", "# Uno\n\nEl bloque del `id` del módulo.\n")
    assert cd.comprobar_ortografia(tmp_path, [doc]) == []


# --- La línea de comandos --------------------------------------------------------------------------


def test_main_devuelve_1_si_hay_problemas_y_0_si_no(repo: Path, capsys):
    _md(repo, "README.md", "# T\n\n[roto](nada.md)\n")
    assert cd.main(["--raiz", str(repo), "--solo", "enlaces"]) == 1
    assert "el archivo «nada.md» no existe" in capsys.readouterr().out
    _md(repo, "README.md", "# T\n\nTodo bien.\n")
    assert cd.main(["--raiz", str(repo), "--solo", "enlaces"]) == 0


def test_main_devuelve_2_si_falta_un_archivo_de_codigo(repo: Path, capsys):
    (repo / "apps/web/src/content/constantes.ts").unlink()
    assert cd.main(["--raiz", str(repo), "--solo", "cifras"]) == 2
    assert "constantes.ts" in capsys.readouterr().err


# --- Los documentos reales ---------------------------------------------------------------------------


def test_las_cifras_de_los_documentos_reales_coinciden_con_el_repositorio():
    assert cd.comprobar_cifras(RAIZ) == []


def test_la_ortografia_de_los_documentos_reales_no_tiene_problemas():
    assert cd.comprobar_ortografia(RAIZ) == []


def test_los_enlaces_de_los_documentos_de_entrega_no_estan_rotos():
    entrega = [RAIZ / d for d in (*cd.DOCUMENTOS_REDACTADOS, "docs/revision-docente.md") if (RAIZ / d).is_file()]
    assert cd.comprobar_enlaces(RAIZ, entrega) == []


def test_los_documentos_de_entrega_existen():
    for documento in (*cd.DOCUMENTOS_REDACTADOS, "docs/revision-docente.md"):
        assert (RAIZ / documento).is_file(), documento
