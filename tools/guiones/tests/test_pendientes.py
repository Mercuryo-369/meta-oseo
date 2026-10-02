"""Pruebas del generador de la lista de revisión del docente (`tools/guiones/pendientes.py`)."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

import pendientes as pend
from conftest import RAIZ

GUION = """\
# Módulo 1

## Notas de verificacion para el docente

Introducción que no debe recogerse.

### A. Cifras aproximadas

1. **Calcio del cuerpo (sección 1.1).** Cerca del 99 %. Schropp 2003 da otra cifra. Confirmar
   con el texto del curso.
2. **Elemento `mol_uno` (secciones 1.1 y 1.2).** Se discute.

**Sección 1.2**

- Ejemplos clínicos que conviene revisar.

| N.º | Afirmación | Situación | Qué confirmar |
|---|---|---|---|
| 7 | Vida de la BMU de 6 a 9 meses | Otras fuentes dan 6 a 12 | Cifra única |

Otras decisiones que conviene confirmar:

- Uso de «resorción» como término principal.

Cifras sin etiqueta que también conviene confirmar: 85 % del fósforo.

Convenciones de este archivo: títulos sin tildes.

## Registro de revision

Revisión independiente. Se contrastó Nakashima 2002 y Dominici (2006).

| Hallazgo | Decisión |
|---|---|
| uno | Aceptado |
"""

CONTENIDO = {
    "id": "m1_prueba",
    "numero": 1,
    "slug": "prueba",
    "titulo": "Módulo de prueba",
    "duracion_estimada_min": 30,
    "glosario": [{"id": "hueso", "termino": "Hueso", "definicion": "Órgano"}],
    "referencias": [
        {"id": "ref_1", "cita": "Autor A. Libro. 2020", "verificada": False},
        {"id": "ref_2", "cita": "Autor B. Libro. 2021", "verificada": True},
    ],
    "estado_revision": {
        "estado": "borrador",
        "notas": "Notas generales del módulo.",
        "pendientes": [
            {"id": "m1_2_arrastre", "nota": "Confirmar: «Actividad de arrastre»"},
            {"id": "t_calcio", "nota": "Confirmar: «Aproximadamente el 99 % del calcio (Schropp 2003)»"},
            {"id": "mol_uno", "nota": "Confirmar: «| Fase mineral | 50 % | 70 %»"},
            {"id": "m1", "nota": "Confirmar: «La duración»"},
            {"id": "no_existe", "nota": "Confirmar: «Huérfano»"},
        ],
    },
    "secciones": [
        {
            "id": "m1_1_inicio",
            "titulo": "Inicio",
            "bloques": [
                {"id": "t_calcio", "tipo": "texto", "titulo": "Calcio", "markdown": "Texto"},
                {"id": "c_aviso", "tipo": "callout", "variante": "Dato", "markdown": "Un aviso largo del módulo"},
            ],
        },
        {
            "id": "m1_2_arrastre_seccion",
            "titulo": "Arrastre",
            "bloques": [
                {
                    "tipo": "actividad",
                    "actividad": {
                        "id": "m1_2_arrastre",
                        "tipo": "arrastre-molecular",
                        "titulo": "Moléculas",
                        "puntaje_max": 40,
                        "aprobacion_min": 0.6,
                        "config": {"moleculas": [{"id": "mol_uno", "etiqueta": "Uno"}]},
                    },
                },
                {
                    "tipo": "actividad",
                    "actividad": {
                        "id": "m1_2_quiz",
                        "tipo": "quiz",
                        "titulo": "Quiz",
                        "puntaje_max": 10,
                        "obligatoria": False,
                        "config": {},
                    },
                },
            ],
        },
    ],
}

SETTINGS = """\
class Settings:
    cert_min_porcentaje: int = Field(default=85, ge=0, le=100)
    mentor_max_mensajes_dia: int = Field(default=33, ge=0)
    anthropic_model: str = "modelo-de-prueba"
"""
ENUMS = """\
class TipoIdentificacion(StrEnum):
    CC = "CC"
    XX = "XX"


TIPO_IDENTIFICACION_ETIQUETAS: dict[TipoIdentificacion, str] = {
    TipoIdentificacion.CC: "Cédula de ciudadanía",
    TipoIdentificacion.XX: "Otro documento",
}
"""
CONSTANTES = "export const PENALIZACION_POR_INTENTO_DEFECTO = 0.25;\nexport const PISO_PENALIZACION_DEFECTO = 0.5;\n"
LOGROS = 'ACHIEVEMENT_CATALOG = (\n    AchievementDef("a", "A", "x", 1),\n    AchievementDef("b", "B", "y", 2),\n)\n'


def _escribir(ruta: Path, texto: str) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(texto, encoding="utf-8", newline="\n")


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    """Repositorio mínimo: un módulo, su guion y los tres archivos de código que la lista lee."""
    _escribir(
        tmp_path / "apps/web/src/modules/m1_prueba/content.json",
        json.dumps(CONTENIDO, ensure_ascii=False, indent=2),
    )
    _escribir(tmp_path / "docs/guion-por-modulo/m1_prueba.md", GUION)
    _escribir(tmp_path / "services/api/app/core/settings.py", SETTINGS)
    _escribir(tmp_path / "services/api/app/models/enums.py", ENUMS)
    _escribir(tmp_path / "services/api/app/services/achievements.py", LOGROS)
    _escribir(tmp_path / "apps/web/src/content/constantes.ts", CONSTANTES)
    return tmp_path


def _documento(repo: Path) -> str:
    return pend.generar(repo, repo / "apps/web/src/modules", repo / "docs/guion-por-modulo")


# --- Notas del guion -----------------------------------------------------------------------------


def test_notas_recoge_cada_forma_y_omite_lo_que_no_es_del_docente():
    notas = pend.parsear_notas(GUION)
    textos = [n.texto for n in notas]
    assert not any("Introducción que no debe recogerse" in t for t in textos)
    assert not any(t.startswith("Convenciones de este archivo") for t in textos)
    assert [n.tipo for n in notas] == ["lista", "lista", "viñeta", "tabla", "viñeta", "párrafo"]
    assert notas[0].numero_guion == "1"
    # La línea de continuación se une a su nota.
    assert "Confirmar con el texto del curso." in notas[0].texto
    assert notas[0].grupo == "A. Cifras aproximadas"


def test_notas_grupos_por_negrita_y_parrafo_con_dos_puntos():
    notas = pend.parsear_notas(GUION)
    assert notas[2].grupo == "Sección 1.2"
    # «Otras decisiones…:» abre un grupo y no es una nota por sí mismo.
    assert notas[4].grupo == "Otras decisiones que conviene confirmar"
    assert notas[4].texto.startswith("Uso de")


def test_notas_de_tabla_conservan_columnas_y_numero():
    tabla = next(n for n in pend.parsear_notas(GUION) if n.tipo == "tabla")
    assert tabla.numero_guion == "7"
    assert tabla.texto.startswith("Vida de la BMU de 6 a 9 meses")
    assert "**Situación:** Otras fuentes dan 6 a 12" in tabla.texto
    assert "**Qué confirmar:** Cifra única" in tabla.texto


def test_notas_sin_seccion_de_verificacion():
    assert pend.parsear_notas("# Guion\n\n## Otra cosa\n\ntexto\n") == []


def test_registro_de_revision_toma_solo_el_primer_parrafo():
    assert pend.registro_de_revision(GUION) == "Revisión independiente. Se contrastó Nakashima 2002 y Dominici (2006)."
    assert pend.registro_de_revision("sin registro") == ""


# --- Fuentes, secciones y ubicación ------------------------------------------------------------------


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("Schropp 2003 describe la pérdida", ["Schropp (2003)"]),
        (
            "Araújo y Lindhe (2005) y Schropp y colaboradores, 2003",
            ["Araújo y Lindhe (2005)", "Schropp y colaboradores (2003)"],
        ),
        ("según el consenso del NIH de 2000", ["consenso del NIH (2000)"]),
        ("la AAOMS (2022) da 0,02", ["AAOMS (2022)"]),
        (
            "Diegel et al. y Moriishi et al., PLoS Genetics crearon ratones",
            ["Diegel et al. y Moriishi et al., PLoS Genetics"],
        ),
        ("Aproximadamente 10 µm; algunas fuentes dan 8 a 12", []),
        ("Se 2003 no es un autor", []),
    ],
)
def test_fuentes_citadas(texto, esperado):
    assert pend.fuentes_citadas(texto) == esperado


def test_texto_de_fuente_sin_citas_lo_dice():
    assert pend.texto_de_fuente([]) == pend.SIN_FUENTE
    assert pend.texto_de_fuente(["A (2001)", "B (2002)"]) == "A (2001); B (2002)"


@pytest.mark.parametrize(
    ("texto", "grupo", "esperado"),
    [
        ("Calcio (sección 1.2).", "", ["1.2"]),
        ("Tamaño (secciones 4.1 y 4.6).", "", ["4.1", "4.6"]),
        ("Rango (secciones 5.2 a 5.4).", "", ["5.2", "5.4"]),
        ("Sin sección en el texto", "Ciclo de remodelado (sección 5.1)", ["5.1"]),
        ("Nada", "Nada", []),
    ],
)
def test_secciones_mencionadas(texto, grupo, esperado):
    assert pend.secciones_mencionadas(texto, grupo) == esperado


def test_ubicar_nota_con_seccion_e_id(repo: Path):
    modulo = pend.cargar_modulos(repo / "apps/web/src/modules", repo / "docs/guion-por-modulo")[0]
    nota = pend.parsear_notas(GUION)[1]  # «secciones 1.1 y 1.2» y `mol_uno`
    ubicacion = pend.ubicar_nota(nota, modulo)
    assert "Sección 1.1 «Inicio»" in ubicacion
    assert "Sección 1.2 «Arrastre»" in ubicacion
    assert "`mol_uno`" in ubicacion


# --- Ubicación de los pendientes -----------------------------------------------------------------------


def test_indexar_ubica_secciones_bloques_actividades_y_elementos(repo: Path):
    modulo = pend.cargar_modulos(repo / "apps/web/src/modules", repo / "docs/guion-por-modulo")[0]
    lugares = modulo.lugares
    assert modulo.secciones == {"1.1": "Inicio", "1.2": "Arrastre"}
    assert lugares["t_calcio"].seccion == "1.1"
    assert lugares["t_calcio"].bloque_desc == "Texto «Calcio»"
    assert lugares["c_aviso"].bloque_desc.startswith("Aviso «")
    assert lugares["m1_2_arrastre"].bloque_desc == "Actividad arrastre-molecular «Moléculas»"
    # Un elemento interno se ubica en su actividad y se nombra.
    assert lugares["mol_uno"].bloque_id == "m1_2_arrastre"
    assert lugares["mol_uno"].detalle == "Elemento `mol_uno`"
    assert lugares["m1"].seccion is None
    assert lugares["hueso"].bloque_desc == "Glosario: término «Hueso»"


def test_pendientes_salen_en_el_orden_del_modulo_y_con_su_ubicacion(repo: Path):
    modulo = pend.cargar_modulos(repo / "apps/web/src/modules", repo / "docs/guion-por-modulo")[0]
    filas = pend.filas_pendientes(modulo, pend.parsear_notas(GUION))
    ids = [p["id"] for _, p, _ in filas]
    assert ids == ["m1", "t_calcio", "m1_2_arrastre", "mol_uno", "no_existe"]
    assert filas[-1][0].describir().startswith("Sin ubicación")
    assert filas[1][0].describir() == "Sección 1.1 «Inicio»<br>Texto «Calcio» `t_calcio`"


def test_pendiente_toma_la_fuente_de_su_nota_y_enlaza_el_contexto(repo: Path):
    modulo = pend.cargar_modulos(repo / "apps/web/src/modules", repo / "docs/guion-por-modulo")[0]
    notas = pend.parsear_notas(GUION)
    filas = {p["id"]: fuente for _, p, fuente in pend.filas_pendientes(modulo, notas)}
    assert filas["t_calcio"].startswith("Schropp (2003)")
    # `mol_uno` está nombrado entre comillas invertidas en la nota 2.
    assert "Contexto en M1-N02" in filas["mol_uno"]
    assert filas["m1"] == pend.SIN_FUENTE


def test_dato_de_fila_de_tabla_se_muestra_legible():
    assert pend._resumen_de_pendiente("Confirmar: «| Fase mineral | 50 % | 70 %»") == "«Fase mineral · 50 % · 70 %»"
    assert pend._resumen_de_pendiente("Confirmar: «- Un conducto de Havers»") == "«Un conducto de Havers»"
    assert pend._resumen_de_pendiente("Revisar la dificultad") == "Revisar la dificultad"


# --- Constantes leídas del repositorio -----------------------------------------------------------------


def test_leer_constantes_del_repositorio_de_prueba(repo: Path):
    c = pend.leer_constantes(repo)
    assert c.cert_min_porcentaje == 85
    assert c.mentor_max_mensajes_dia == 33
    assert c.modelo_mentor == "modelo-de-prueba"
    assert c.penalizacion_por_intento == 0.25
    assert c.piso_penalizacion == 0.5
    assert c.tipos_identificacion == (("CC", "Cédula de ciudadanía"), ("XX", "Otro documento"))
    assert c.cantidad_logros == 2


def test_leer_constantes_falla_con_mensaje_claro_si_cambia_el_codigo(repo: Path):
    _escribir(repo / "services/api/app/core/settings.py", "class Settings:\n    otra_cosa = 1\n")
    with pytest.raises(pend.ErrorDeLectura, match="cert_min_porcentaje"):
        pend.leer_constantes(repo)


def test_leer_constantes_de_este_repositorio():
    c = pend.leer_constantes(RAIZ)
    assert 0 < c.cert_min_porcentaje <= 100
    assert c.penalizacion_por_intento > 0
    assert {codigo for codigo, _ in c.tipos_identificacion} >= {"CC", "PA"}
    assert c.cantidad_logros >= 6


# --- Documento ---------------------------------------------------------------------------------------------


def test_documento_de_prueba_trae_las_partes_y_los_valores_del_repositorio(repo: Path):
    doc = _documento(repo)
    assert doc.startswith("# Lista de revisión para el docente\n")
    assert doc.endswith("\n") and not doc.endswith("\n\n")
    # Decisiones con los valores leídos del código de prueba, no de memoria.
    assert "al menos el 85 % del puntaje máximo" in doc
    assert "tope de 33 mensajes por día" in doc
    assert "`modelo-de-prueba`" in doc
    assert "Cada intento adicional resta el 25 %" in doc
    assert "piso del 50 %" in doc
    assert "XX (Otro documento)" in doc
    assert "M1: m1_2_arrastre (60 %)" in doc
    assert "Hoy hay 0 videos reales" in doc
    assert "Los módulos citan 2 referencias y 1 siguen marcadas como no verificadas" in doc
    # Pendientes, notas y referencias con su referencia para responder.
    assert "M1-P01" in doc and "M1-P05" in doc and "M1-P06" not in doc
    assert "M1-N01" in doc and "M1-N06" in doc
    assert "M1-R01" in doc and "M1-R02" in doc
    assert "> Notas generales del módulo." in doc
    assert "Revisión independiente. Se contrastó Nakashima 2002" in doc
    # Cada fila lleva casilla y columna de decisión.
    assert doc.count(pend.DECISION_PENDIENTE) == 5 + 6
    assert doc.count("| ☐ | M1-") == 5 + 6 + 2


def test_documento_es_determinista(repo: Path):
    assert _documento(repo) == _documento(repo)


def test_documento_no_tiene_saltos_de_linea_dentro_de_las_filas(repo: Path):
    doc = _documento(repo)
    for linea in doc.splitlines():
        if linea.startswith("| ☐ |"):
            assert linea.endswith("|")
            # El número de columnas de una fila (contando los `|` sin escapar) es el de su encabezado.
            assert len(re.findall(r"(?<!\\)\|", linea)) == 7 or linea.startswith("| ☐ | M1-R")


def test_una_nota_con_barra_vertical_no_rompe_la_tabla():
    assert pend.celda("a | b\nc") == "a \\| b c"


def test_sin_modulos_es_un_error_de_lectura(tmp_path: Path):
    with pytest.raises(pend.ErrorDeLectura):
        pend.cargar_modulos(tmp_path, tmp_path)


def test_main_escribe_comprueba_y_detecta_desactualizado(repo: Path, capsys):
    salida = repo / "docs" / "revision-docente.md"
    args = ["--raiz", str(repo)]
    assert pend.main([*args, "--comprobar"]) == 1  # no existe
    assert pend.main(args) == 0
    assert salida.is_file()
    assert pend.main([*args, "--comprobar"]) == 0
    # Cambia el contenido: el documento queda desactualizado y --comprobar no lo escribe.
    datos = json.loads((repo / "apps/web/src/modules/m1_prueba/content.json").read_text(encoding="utf-8"))
    datos["estado_revision"]["pendientes"].append({"id": "c_aviso", "nota": "Confirmar: «Otro dato»"})
    _escribir(repo / "apps/web/src/modules/m1_prueba/content.json", json.dumps(datos, ensure_ascii=False))
    antes = salida.read_bytes()
    assert pend.main([*args, "--comprobar"]) == 1
    assert salida.read_bytes() == antes
    assert pend.main(args) == 0
    assert "M1-P06" in salida.read_text(encoding="utf-8")
    capsys.readouterr()


def test_un_archivo_con_saltos_crlf_sigue_al_dia(repo: Path):
    """Con `core.autocrlf` el checkout en Windows cambia los saltos de línea: no debe contar como desactualizado."""
    salida = repo / "docs" / "revision-docente.md"
    assert pend.main(["--raiz", str(repo)]) == 0
    salida.write_bytes(salida.read_bytes().replace(b"\n", b"\r\n"))
    assert b"\r\n" in salida.read_bytes()
    assert pend.main(["--raiz", str(repo), "--comprobar"]) == 0


def test_main_sale_con_2_si_falta_un_archivo_de_codigo(repo: Path, capsys):
    (repo / "apps/web/src/content/constantes.ts").unlink()
    assert pend.main(["--raiz", str(repo)]) == 2
    assert "constantes.ts" in capsys.readouterr().err


# --- El repositorio real -----------------------------------------------------------------------------------


@pytest.fixture(scope="module")
def modulos_reales() -> list[pend.Modulo]:
    return pend.cargar_modulos(RAIZ / "apps/web/src/modules", RAIZ / "docs/guion-por-modulo")


def test_los_seis_modulos_tienen_guion_y_notas(modulos_reales):
    assert [m.numero for m in modulos_reales] == [1, 2, 3, 4, 5, 6]
    for m in modulos_reales:
        assert m.guion is not None, m.carpeta
        assert len(pend.parsear_notas(m.guion.read_text(encoding="utf-8"))) >= 10, m.carpeta
        assert pend.registro_de_revision(m.guion.read_text(encoding="utf-8")), m.carpeta


def test_cada_pendiente_real_tiene_ubicacion_en_su_modulo(modulos_reales):
    for m in modulos_reales:
        for pendiente in m.pendientes:
            assert str(pendiente["id"]) in m.lugares, f"{m.carpeta}: {pendiente['id']} no está en el módulo"


def test_las_secciones_reales_se_numeran_como_en_los_guiones(modulos_reales):
    for m in modulos_reales:
        assert list(m.secciones) == [f"{m.numero}.{i}" for i in range(1, len(m.secciones) + 1)], m.carpeta


def test_el_documento_real_esta_completo(modulos_reales):
    doc = pend.generar(RAIZ, RAIZ / "apps/web/src/modules", RAIZ / "docs/guion-por-modulo")
    for m in modulos_reales:
        prefijo = f"M{m.numero}"
        # Una fila por pendiente, una por nota y una por referencia; ninguna se pierde ni se duplica.
        assert len(re.findall(rf"^\| ☐ \| {prefijo}-P\d+ ", doc, re.MULTILINE)) == len(m.pendientes)
        notas = pend.parsear_notas(m.guion.read_text(encoding="utf-8"))
        assert len(re.findall(rf"^\| ☐ \| {prefijo}-N\d+ ", doc, re.MULTILINE)) == len(notas)
        assert len(re.findall(rf"^\| ☐ \| {prefijo}-R\d+ ", doc, re.MULTILINE)) == len(m.referencias)
    assert len(re.findall(r"^\| D\d\d \|", doc, re.MULTILINE)) >= 15
    # Ninguna marca [verificar] suelta como texto del estudiante, ni ubicaciones perdidas.
    assert "Sin ubicación" not in doc
    # Todas las tablas mantienen sus columnas: ninguna fila queda cortada por un `|` sin escapar.
    for linea in doc.splitlines():
        if linea.startswith("| ☐ | M") and "-R" not in linea[:14]:
            assert len(re.findall(r"(?<!\\)\|", linea)) == 7, linea[:120]


def test_el_documento_del_repositorio_esta_al_dia():
    """Si falla: `python tools/guiones/pendientes.py` y volver a versionar docs/revision-docente.md."""
    assert pend.main(["--comprobar"]) == 0
