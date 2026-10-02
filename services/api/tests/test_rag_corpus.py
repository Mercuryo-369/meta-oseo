"""Corpus del mentor: generación, formato, tamaño y sin actividades calificadas (F3-01)."""

import copy
import json
from collections import Counter
from pathlib import Path

import pytest

from app.core.constants import MODULE_COUNT
from app.core.settings import DEFAULT_CORPUS_PATH
from app.rag import corpus as corpus_module
from app.rag.corpus import (
    TIPO_BANCO,
    TIPO_CONTENIDO,
    TIPO_GANCHO,
    TIPO_GLOSARIO,
    TIPO_OBJETIVOS,
    TIPOS_CITABLES,
    CorpusError,
    Fragmento,
    cargar,
    serializar,
)
from app.rag.texto import contar_palabras, normalizar
from app.scripts import build_corpus
from app.scripts.build_corpus import (
    CorpusBuildError,
    empaquetar,
    fragmentos_del_guion,
    limpiar_markdown,
    parsear_banco,
    unidades_de_ganchos,
)
from app.scripts.build_manifest import discover_content_files


@pytest.fixture(scope="module")
def fragmentos() -> list[Fragmento]:
    return cargar(DEFAULT_CORPUS_PATH)


@pytest.fixture(scope="module")
def contenidos() -> list[dict]:
    rutas = discover_content_files()
    assert len(rutas) == MODULE_COUNT
    return [json.loads(ruta.read_text(encoding="utf-8")) for ruta in rutas]


# --- El archivo versionado ---------------------------------------------------------------------


def test_el_corpus_versionado_esta_al_dia_con_el_contenido_y_los_guiones(capsys):
    """La comprobación de CI: `build_corpus --comprobar` sale con 0."""
    assert build_corpus.main(["--comprobar"]) == build_corpus.EXIT_OK
    assert "al día" in capsys.readouterr().out


def test_comprobar_detecta_un_corpus_desactualizado(tmp_path: Path, capsys):
    viejo = tmp_path / "corpus.jsonl"
    viejo.write_text("", encoding="utf-8")
    assert build_corpus.main(["--comprobar", "--salida", str(viejo)]) == build_corpus.EXIT_OUTDATED
    assert "no está al día" in capsys.readouterr().out
    assert viejo.read_text(encoding="utf-8") == ""  # --comprobar no escribe


def test_generar_es_determinista(tmp_path: Path):
    a, b = tmp_path / "a.jsonl", tmp_path / "b.jsonl"
    assert build_corpus.main(["--salida", str(a)]) == build_corpus.EXIT_OK
    assert build_corpus.main(["--salida", str(b)]) == build_corpus.EXIT_OK
    assert a.read_bytes() == b.read_bytes() == DEFAULT_CORPUS_PATH.read_bytes()
    assert b"\r" not in a.read_bytes()  # LF también en Windows: se versiona


def test_falta_un_guion_es_un_error_de_contenido(tmp_path: Path, capsys):
    assert (
        build_corpus.main(["--guion-dir", str(tmp_path), "--salida", str(tmp_path / "c.jsonl")])
        == build_corpus.EXIT_INVALID
    )
    assert "No hay guion" in capsys.readouterr().err


# --- Forma del corpus --------------------------------------------------------------------------


def test_hay_fragmentos_de_todos_los_modulos_y_de_todos_los_tipos(fragmentos):
    assert {f.modulo for f in fragmentos} == set(range(1, MODULE_COUNT + 1))
    assert {f.tipo for f in fragmentos} == {
        TIPO_CONTENIDO,
        TIPO_GLOSARIO,
        TIPO_OBJETIVOS,
        TIPO_BANCO,
        TIPO_GANCHO,
    }
    assert len(fragmentos) > 400


def test_los_ids_son_unicos_y_estables(fragmentos):
    ids = [f.id for f in fragmentos]
    assert len(ids) == len(set(ids))
    for f in fragmentos:
        assert f.id.startswith(f"m{f.modulo}:")


def test_cada_fragmento_tiene_texto_titulo_y_url_interna(fragmentos):
    for f in fragmentos:
        assert f.texto.strip() and f.seccion_titulo.strip()
        assert f.url == f"/modulo/{f.modulo}" or f.url == f"/modulo/{f.modulo}?s={f.seccion_id}"
        assert f.refs, f.id
        if f.tipo == TIPO_CONTENIDO:
            assert f.seccion_id and f.url.endswith(f"?s={f.seccion_id}")
            assert f.seccion_id.startswith(f"m{f.modulo}_")


def test_las_secciones_de_las_urls_existen_en_el_contenido(fragmentos, contenidos):
    secciones = {(int(c["numero"]), s["id"]) for c in contenidos for s in c["secciones"]}
    for f in fragmentos:
        if f.seccion_id:
            assert (f.modulo, f.seccion_id) in secciones, f.id


def test_solo_lo_que_el_estudiante_lee_es_citable(fragmentos):
    for f in fragmentos:
        assert f.citable == (f.tipo in TIPOS_CITABLES)
    assert {f.tipo for f in fragmentos if not f.citable} == {TIPO_BANCO, TIPO_GANCHO}


def test_tamano_sensato_de_los_fragmentos_de_contenido(fragmentos):
    """Por la construcción, ninguno pasa de ~260 palabras; casi todos están entre 80 y 220."""
    tamanos = [contar_palabras(f.texto) for f in fragmentos if f.tipo == TIPO_CONTENIDO]
    assert max(tamanos) <= 260
    en_rango = sum(1 for n in tamanos if 60 <= n <= 240)
    assert en_rango / len(tamanos) >= 0.75


def test_los_fragmentos_con_tema_llevan_su_subtitulo(fragmentos):
    con_tema = [f for f in fragmentos if f.subtitulo]
    assert len(con_tema) > 100 and all(f.tipo == TIPO_CONTENIDO for f in con_tema)
    balanza = next(f for f in fragmentos if f.id.endswith(":t_la_balanza_rankl_opg"))
    assert balanza.subtitulo == "La balanza RANKL/OPG"
    video = next(f for f in fragmentos if f.id.endswith(":m5_osteoclastogenesis_video"))
    assert video.subtitulo  # el título de la actividad de video-texto


def test_el_banco_del_mentor_esta_completo_y_con_su_respuesta(fragmentos):
    banco = [f for f in fragmentos if f.tipo == TIPO_BANCO]
    por_modulo = Counter(f.modulo for f in banco)
    assert set(por_modulo) == set(range(1, MODULE_COUNT + 1))
    assert all(n >= 10 for n in por_modulo.values())
    for f in banco:
        assert f.texto.startswith("Pregunta")
        assert "Respuesta esperada:" in f.texto


def test_los_ganchos_traen_conceptos_errores_y_pistas(fragmentos):
    titulos = " ".join(f.seccion_titulo for f in fragmentos if f.tipo == TIPO_GANCHO).lower()
    assert "errores frecuentes" in titulos
    assert "conceptos clave" in titulos


def test_el_texto_no_lleva_markdown_ni_marcas_de_verificacion(fragmentos):
    for f in fragmentos:
        assert "[verificar]" not in f.texto.lower()
        assert "](glosario:" not in f.texto and "**" not in f.texto


def test_el_contenido_de_posgrado_se_marca_y_no_se_mezcla(fragmentos):
    posgrado = [f for f in fragmentos if f.nivel == "posgrado"]
    assert posgrado  # hay bloques «Para profundizar»
    assert all(f.tipo == TIPO_CONTENIDO for f in posgrado)


# --- Lo que NO debe estar: actividades calificadas ---------------------------------------------


CANARIO = "CANARIO-DE-ACTIVIDAD-CALIFICADA"


def _con_actividades_calificadas_marcadas(contenido: dict) -> dict:
    """Copia del contenido donde TODO texto de una actividad calificada es un canario."""

    def marcar(valor: object) -> object:
        if isinstance(valor, str):
            return CANARIO
        if isinstance(valor, list):
            return [marcar(item) for item in valor]
        if isinstance(valor, dict):
            fijos = {"id", "tipo", "formato"}
            return {k: v if k in fijos else marcar(v) for k, v in valor.items()}
        return valor

    copia = copy.deepcopy(contenido)
    for seccion in copia["secciones"]:
        for bloque in seccion["bloques"]:
            if bloque["tipo"] == "actividad" and bloque["actividad"]["tipo"] != "video-texto":
                actividad = bloque["actividad"]
                for clave in ("titulo", "instrucciones", "config", "retroalimentacion", "concepto"):
                    if clave in actividad:
                        actividad[clave] = marcar(actividad[clave])
    return copia


def test_las_actividades_calificadas_no_aportan_nada_al_corpus(contenidos):
    """Si cambia el texto de una actividad calificada (aquí, a un canario), el corpus no cambia."""
    for contenido in contenidos:
        original = build_corpus.fragmentos_de_modulo(contenido)
        marcado = build_corpus.fragmentos_de_modulo(
            _con_actividades_calificadas_marcadas(contenido)
        )
        assert marcado == original
        assert all(CANARIO not in f.texto for f in marcado)


def test_ningun_enunciado_ni_explicacion_de_quiz_esta_en_el_corpus(fragmentos, contenidos):
    corpus_normalizado = "\n".join(normalizar(limpiar_markdown(f.texto)) for f in fragmentos)
    revisados = 0
    for contenido in contenidos:
        for seccion in contenido["secciones"]:
            for bloque in seccion["bloques"]:
                if bloque["tipo"] != "actividad" or bloque["actividad"]["tipo"] != "quiz":
                    continue
                for pregunta in bloque["actividad"]["config"]["preguntas"]:
                    for texto in (pregunta["enunciado"], pregunta.get("explicacion", "")):
                        limpio = normalizar(limpiar_markdown(texto)).strip()
                        if len(limpio) < 45:  # las preguntas cortas y genéricas coinciden por azar
                            continue
                        revisados += 1
                        assert limpio not in corpus_normalizado, pregunta["id"]
    assert revisados > 80  # se recorrieron de verdad los quizzes de los seis módulos


def test_ningun_id_de_actividad_calificada_es_una_referencia_del_corpus(fragmentos, contenidos):
    ids_actividades = {
        b["actividad"]["id"]
        for c in contenidos
        for s in c["secciones"]
        for b in s["bloques"]
        if b["tipo"] == "actividad" and b["actividad"]["tipo"] != "video-texto"
    }
    refs = {ref.split(":", 1)[1] for f in fragmentos for ref in f.refs if ":" in ref}
    assert not (ids_actividades & refs)


# --- Lectura y escritura del formato -----------------------------------------------------------


def test_serializar_y_cargar_son_inversas(tmp_path: Path, fragmentos):
    ruta = tmp_path / "c.jsonl"
    ruta.write_text(serializar(fragmentos[:20]), encoding="utf-8")
    assert cargar(ruta) == fragmentos[:20]


def test_cargar_rechaza_un_corpus_invalido(tmp_path: Path):
    ruta = tmp_path / "c.jsonl"
    base = {
        "id": "m1:x",
        "modulo": 1,
        "seccion_id": None,
        "seccion_titulo": "T",
        "tipo": "contenido",
        "texto": "hola",
        "url": "/modulo/1",
    }
    casos = {
        "json roto": "{no",
        "falta un campo": json.dumps({k: v for k, v in base.items() if k != "url"}),
        "tipo desconocido": json.dumps({**base, "tipo": "otro"}),
        "sin texto": json.dumps({**base, "texto": "  "}),
        "id repetido": json.dumps(base) + "\n" + json.dumps(base),
    }
    for nombre, contenido in casos.items():
        ruta.write_text(contenido, encoding="utf-8")
        with pytest.raises(CorpusError):
            cargar(ruta)
        assert nombre  # (documenta el caso en el reporte de pytest)
    with pytest.raises(CorpusError):
        cargar(tmp_path / "no_existe.jsonl")


# --- Análisis de los guiones (tres formatos distintos) -----------------------------------------

BANCO_LISTA = """Preguntas extra.

1. Pregunta: ¿Qué es el osteoide?
   - Respuesta: matriz orgánica sin mineral.
   - Dificultad: 1
   - Concepto: Osteoide
2. **Pregunta:** ¿Qué hace la OPG?
   - **Respuesta:** captura a RANKL
     y evita que active a RANK.
   - **Dificultad:** 2
   - **Concepto:** Eje RANKL/OPG
"""

BANCO_B = """**B1.** ¿De qué se forma el martillo?
- Respuesta: del cartílago de Meckel.
- Dificultad: 2
- Concepto: meckel

**B2.** ¿Qué es RUNX2?
- Respuesta: un factor de transcripción.
- Dificultad: 1
- Concepto: runx2
"""

BANCO_TABLA = """| # | Pregunta | Respuesta | Dificultad | Concepto |
|---|---|---|---|---|
| 1 | ¿Qué es el ectomesénquima? | Mesénquima de la cresta neural. | 1 | origen |
| 2 | ¿Qué es M-CSF? | Mantiene vivo al precursor. | 2 | senales |
"""


@pytest.mark.parametrize(
    ("texto", "preguntas"),
    [
        (BANCO_LISTA, ["¿Qué es el osteoide?", "¿Qué hace la OPG?"]),
        (BANCO_B, ["¿De qué se forma el martillo?", "¿Qué es RUNX2?"]),
        (BANCO_TABLA, ["¿Qué es el ectomesénquima?", "¿Qué es M-CSF?"]),
    ],
)
def test_parsear_banco_acepta_los_tres_formatos_de_los_guiones(texto, preguntas):
    items = parsear_banco(texto.splitlines())
    assert [i.pregunta for i in items] == preguntas
    assert all(i.respuesta and i.dificultad and i.concepto for i in items)


def test_parsear_banco_une_las_respuestas_de_varias_lineas():
    items = parsear_banco(BANCO_LISTA.splitlines())
    assert items[1].respuesta == "captura a RANKL y evita que active a RANK."


GUION = f"""# Módulo 9

## Banco de preguntas para el mentor

{BANCO_LISTA}
## Ganchos para el mentor

**Conceptos clave**

- El hueso es dinámico.
- La matriz es un compuesto.

**Errores frecuentes y cómo aclararlos**

| Error | Cómo aclararlo |
|---|---|
| «El hueso es inerte» | Pensar en una fractura que cicatriza |

## Notas de verificacion
No debe entrar.
"""


def test_fragmentos_del_guion_arma_banco_y_ganchos():
    fragmentos = fragmentos_del_guion(9, GUION)
    banco = [f for f in fragmentos if f.tipo == TIPO_BANCO]
    ganchos = [f for f in fragmentos if f.tipo == TIPO_GANCHO]
    assert [f.id for f in banco] == ["m9:banco:1", "m9:banco:2"]
    assert "Respuesta esperada: matriz orgánica sin mineral." in banco[0].texto
    assert [f.seccion_titulo for f in ganchos] == [
        "Guía del docente: Conceptos clave",
        "Guía del docente: Errores frecuentes y cómo aclararlos",
    ]
    assert "Error: «El hueso es inerte». Cómo aclararlo: Pensar en una fractura" in ganchos[1].texto
    assert all("No debe entrar" not in f.texto for f in fragmentos)


def test_un_guion_sin_banco_o_sin_ganchos_falla():
    with pytest.raises(CorpusBuildError, match="banco"):
        fragmentos_del_guion(9, "## Ganchos para el mentor\n- algo\n")
    with pytest.raises(CorpusBuildError, match="ganchos"):
        fragmentos_del_guion(
            9, "## Banco de preguntas para el mentor\n1. Pregunta: a\n - Respuesta: b\n"
        )


def test_ganchos_de_tabla_usan_el_encabezado_como_etiqueta():
    unidades = unidades_de_ganchos(["| A | B |", "|---|---|", "| uno | dos |"])
    assert unidades == [("Ganchos para el mentor", "A: uno. B: dos")]


def test_limpiar_markdown():
    assert (
        limpiar_markdown("El **[hueso](glosario:hueso)** es *vivo* [verificar] y `raro`.")
        == "El hueso es vivo y raro."
    )


def test_empaquetar_no_mezcla_niveles_ni_supera_el_tope():
    unidad = build_corpus.Unidad
    unidades = [unidad(f"b{i}", "palabra " * 90, "todos") for i in range(4)]
    unidades.insert(2, unidad("pos", "profundiza " * 30, "posgrado"))
    grupos = empaquetar(unidades)
    for grupo in grupos:
        assert len({u.nivel for u in grupo}) == 1
        assert sum(contar_palabras(u.texto) for u in grupo) <= build_corpus.TOPE_PALABRAS
    assert any(g[0].nivel == "posgrado" for g in grupos)


def test_el_modulo_de_corpus_expone_los_tipos_documentados():
    assert set(corpus_module.TIPOS) == {"contenido", "glosario", "objetivos", "banco", "gancho"}
