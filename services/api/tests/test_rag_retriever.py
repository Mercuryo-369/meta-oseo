"""Recuperación BM25: comportamiento, carga única, velocidad y calidad medida (F3-02)."""

import logging
import time
from pathlib import Path

import pytest

from app.core.settings import DEFAULT_CORPUS_PATH, Settings
from app.rag import carga
from app.rag.carga import construir_retriever, obtener_retriever
from app.rag.consulta import consulta_desde_conversacion
from app.rag.corpus import (
    TIPO_BANCO,
    TIPO_CONTENIDO,
    TIPO_GANCHO,
    TIPO_GLOSARIO,
    CorpusError,
    Fragmento,
    cargar,
    serializar,
)
from app.rag.evaluar import EVAL_PATH, evaluar, informe, leer_preguntas
from app.rag.retriever import BM25Retriever, Consulta, PgVectorRetriever, Retriever


@pytest.fixture(scope="module")
def corpus() -> list[Fragmento]:
    return cargar(DEFAULT_CORPUS_PATH)


@pytest.fixture(scope="module")
def retriever(corpus: list[Fragmento]) -> BM25Retriever:
    return BM25Retriever(corpus)


def ids(resultados) -> list[str]:
    return [r.fragmento.id for r in resultados]


# --- Comportamiento ----------------------------------------------------------------------------


def test_es_insensible_a_tildes_y_mayusculas(retriever: BM25Retriever):
    a = retriever.buscar(Consulta("¿Qué hacen los OSTEOCLÁSTOS?"))
    b = retriever.buscar(Consulta("que hacen los osteoclastos"))
    assert ids(a) and ids(a) == ids(b)


def test_encuentra_el_fragmento_correcto_de_una_pregunta_concreta(retriever: BM25Retriever):
    resultados = retriever.buscar(Consulta("¿Qué es el romosozumab?"))
    assert "romosozumab" in resultados[0].fragmento.texto.lower()


def test_los_resultados_vienen_ordenados_y_son_a_lo_mas_k(retriever: BM25Retriever):
    for k in (1, 3, 5):
        resultados = retriever.buscar(Consulta("osteoclastos y RANKL", k=k))
        assert 1 <= len(resultados) <= k
        puntajes = [r.puntaje for r in resultados]
        assert puntajes == sorted(puntajes, reverse=True)


def test_filtra_por_modulo(retriever: BM25Retriever):
    resultados = retriever.buscar(Consulta("hormona paratiroidea PTH", modulos=frozenset({5})))
    assert resultados and {r.fragmento.modulo for r in resultados} == {5}
    dos = retriever.buscar(Consulta("hormona paratiroidea PTH", modulos=frozenset({3, 4})))
    assert {r.fragmento.modulo for r in dos} <= {3, 4}


def test_el_modulo_actual_refuerza_sin_filtrar(retriever: BM25Retriever):
    pregunta = "¿Qué hace la PTH?"
    en_5 = retriever.buscar(Consulta(pregunta, modulo_actual=5))
    en_4 = retriever.buscar(
        Consulta(pregunta, modulo_actual=4, seccion_actual="m4_7_homeostasis_ca_pi")
    )
    assert en_5[0].fragmento.modulo == 5
    assert en_4[0].fragmento.modulo == 4
    # No filtra: en ambos casos siguen apareciendo fragmentos de otros módulos.
    assert len({r.fragmento.modulo for r in en_5}) > 1


def test_la_seccion_actual_refuerza_a_igualdad_de_coincidencias(retriever: BM25Retriever):
    pregunta = "hueso y carga"
    base = retriever.buscar(Consulta(pregunta, k=10, modulo_actual=3))
    con_seccion = retriever.buscar(
        Consulta(pregunta, k=10, modulo_actual=3, seccion_actual="m3_7_mecanostato_mandibula")
    )

    def posicion(resultados):
        return next(
            (
                i
                for i, r in enumerate(resultados)
                if r.fragmento.seccion_id == "m3_7_mecanostato_mandibula"
            ),
            99,
        )

    assert posicion(con_seccion) <= posicion(base)
    puntaje_base = {r.fragmento.id: r.puntaje for r in base}
    for r in con_seccion:
        if (
            r.fragmento.seccion_id == "m3_7_mecanostato_mandibula"
            and r.fragmento.id in puntaje_base
        ):
            assert r.puntaje > puntaje_base[r.fragmento.id]


@pytest.mark.parametrize(
    "pregunta",
    [
        "¿Cuál es la capital de Francia?",
        "dame una receta de arepas con queso",
        "cómo hago un bucle for en Python",
        "",
        "¿? ¡! ...",
    ],
)
def test_lo_que_el_curso_no_cubre_no_devuelve_nada(retriever: BM25Retriever, pregunta: str):
    assert retriever.buscar(Consulta(pregunta)) == []


def test_no_repite_el_mismo_termino_del_glosario_ni_lo_llena_de_definiciones(
    retriever: BM25Retriever,
):
    resultados = retriever.buscar(Consulta("¿Qué es la OPG osteoprotegerina?", k=10))
    glosario = [r.fragmento for r in resultados if r.fragmento.tipo == TIPO_GLOSARIO]
    terminos = [f.texto.split(":", 1)[0] for f in glosario]
    assert len(terminos) == len(set(terminos)) and len(glosario) <= 2


def test_limita_el_material_de_apoyo_del_docente(retriever: BM25Retriever):
    resultados = retriever.buscar(Consulta("diferencia osteoide matriz mineralizada", k=10))
    apoyo = [r for r in resultados if r.fragmento.tipo in (TIPO_BANCO, TIPO_GANCHO)]
    assert len(apoyo) <= 2


def test_sin_palabras_con_contenido_se_busca_por_el_contexto(retriever: BM25Retriever):
    consulta = consulta_desde_conversacion(
        ["explícame esto"], modulo=3, seccion="m3_4_osteocito_sensor"
    )
    resultados = retriever.buscar(consulta)
    assert resultados
    assert {r.fragmento.seccion_id for r in resultados[:3]} == {"m3_4_osteocito_sensor"}


def test_la_estructura_seleccionada_orienta_una_pregunta_vaga(retriever: BM25Retriever):
    sin = consulta_desde_conversacion(["¿qué hace esto?"])
    con = consulta_desde_conversacion(["¿qué hace esto?"], estructura="histo_osteoclasto")
    assert retriever.buscar(sin) == []
    assert "osteoclasto" in retriever.buscar(con)[0].fragmento.texto.lower()


def test_una_pregunta_de_seguimiento_se_completa_con_la_anterior(retriever: BM25Retriever):
    consulta = consulta_desde_conversacion(["¿Qué es la esclerostina?", "¿y qué hace?"])
    assert "esclerostina" in consulta.texto
    resultados = retriever.buscar(consulta)
    assert "esclerostina" in resultados[0].fragmento.texto.lower()
    # Una pregunta larga no se mezcla con la anterior.
    larga = consulta_desde_conversacion(
        ["¿Qué es la esclerostina?", "¿Qué hacen los osteoclastos?"]
    )
    assert "esclerostina" not in larga.texto


def test_un_corpus_vacio_no_devuelve_nada_ni_falla():
    assert BM25Retriever([]).buscar(Consulta("osteoclastos")) == []
    assert len(BM25Retriever([])) == 0


def test_es_deterministico(retriever: BM25Retriever):
    consulta = Consulta("resorción ósea y formación acopladas", k=8, modulo_actual=5)
    assert ids(retriever.buscar(consulta)) == ids(retriever.buscar(consulta))


# --- Interfaz y motor vectorial futuro ---------------------------------------------------------


def test_bm25_cumple_la_interfaz_retriever(retriever: BM25Retriever):
    motor: Retriever = retriever  # verificado por el tipo; en ejecución, por uso
    assert len(motor) > 400
    assert callable(motor.buscar)


def test_la_busqueda_vectorial_esta_reservada_pero_no_implementada(corpus):
    with pytest.raises(NotImplementedError, match="pgvector"):
        PgVectorRetriever(corpus)
    settings = Settings(_env_file=None, rag_backend="pgvector")
    with pytest.raises(NotImplementedError):
        construir_retriever(settings)


# --- Carga -------------------------------------------------------------------------------------


def test_construir_retriever_lee_el_corpus_por_defecto():
    motor = construir_retriever(Settings(_env_file=None))
    assert len(motor) == len(cargar(DEFAULT_CORPUS_PATH))


def test_ruta_vacia_desactiva_la_recuperacion(caplog):
    with caplog.at_level(logging.WARNING, logger="ova.rag"):
        motor = construir_retriever(Settings(_env_file=None, rag_corpus_path=""))
    assert len(motor) == 0
    assert "sin material del curso" in caplog.text


def test_una_ruta_explicita_inexistente_es_un_error_de_arranque(tmp_path: Path):
    with pytest.raises(CorpusError, match="no existe"):
        construir_retriever(Settings(_env_file=None, rag_corpus_path=tmp_path / "no.jsonl"))


def test_un_corpus_explicito_invalido_es_un_error_de_arranque(tmp_path: Path):
    roto = tmp_path / "roto.jsonl"
    roto.write_text("{no es json", encoding="utf-8")
    with pytest.raises(CorpusError):
        construir_retriever(Settings(_env_file=None, rag_corpus_path=roto))


def test_la_ruta_por_defecto_ausente_no_tumba_la_api(monkeypatch, tmp_path: Path, caplog):
    monkeypatch.setattr("app.core.settings.DEFAULT_CORPUS_PATH", tmp_path / "no.jsonl")
    monkeypatch.setattr("app.rag.carga.Settings", Settings, raising=False)
    ajustes = Settings(_env_file=None, rag_corpus_path=tmp_path / "no.jsonl")
    # Se simula «ruta por defecto que no existe»: no es explícita.
    monkeypatch.setattr(Settings, "corpus_is_explicit", property(lambda self: False))
    with caplog.at_level(logging.WARNING, logger="ova.rag"):
        assert len(construir_retriever(ajustes)) == 0
    assert "No existe el corpus" in caplog.text


def test_obtener_retriever_construye_una_sola_vez(monkeypatch, corpus):
    llamadas = []

    def falso(settings):
        llamadas.append(settings)
        return BM25Retriever(corpus[:5])

    monkeypatch.setattr(carga, "construir_retriever", falso)

    class App:
        class state:
            settings = object()

    assert obtener_retriever(App) is obtener_retriever(App)  # type: ignore[arg-type]
    assert len(llamadas) == 1


def test_carga_con_un_corpus_propio(tmp_path: Path, corpus):
    ruta = tmp_path / "mini.jsonl"
    ruta.write_text(serializar(corpus[:30]), encoding="utf-8")
    assert len(construir_retriever(Settings(_env_file=None, rag_corpus_path=ruta))) == 30


# --- Velocidad ---------------------------------------------------------------------------------


def test_responde_en_pocos_milisegundos(retriever: BM25Retriever):
    consultas = [
        Consulta("¿Qué hacen los osteoclastos y cómo se activan?", modulo_actual=5),
        Consulta("mecanotransducción del osteocito y esclerostina", k=8),
        Consulta("pirofosfato fosfatasa alcalina mineralización", modulo_actual=4),
        Consulta("cómo afecta la menopausia a la densidad mineral ósea"),
    ]
    inicio = time.perf_counter()
    repeticiones = 50
    for _ in range(repeticiones):
        for consulta in consultas:
            retriever.buscar(consulta)
    promedio_ms = (time.perf_counter() - inicio) * 1000 / (repeticiones * len(consultas))
    assert promedio_ms < 20, f"{promedio_ms:.2f} ms por consulta"  # medido: ~0,3 ms


def test_cargar_e_indexar_el_corpus_es_rapido(corpus):
    inicio = time.perf_counter()
    BM25Retriever(corpus)
    assert time.perf_counter() - inicio < 2.0  # medido: ~0,1 s


# --- Calidad medida con docs/mentor-eval.md ----------------------------------------------------


@pytest.fixture(scope="module")
def evaluacion(retriever: BM25Retriever):
    preguntas = leer_preguntas()
    por_conjunto, fallos = evaluar(retriever, preguntas)
    return preguntas, por_conjunto, fallos


def test_el_documento_de_evaluacion_tiene_al_menos_30_preguntas_con_fragmento_esperado(
    evaluacion, corpus
):
    preguntas, _, _ = evaluacion
    con_esperado = [p for p in preguntas if p.esperado]
    assert len(con_esperado) >= 30
    refs_del_corpus = {ref for f in corpus for ref in f.refs}
    for p in con_esperado:
        assert set(p.esperado) <= refs_del_corpus, f"#{p.numero}: ref inexistente"
    assert {p.conjunto for p in preguntas} == {
        "conjunto de ajuste",
        "conjunto reservado",
        "conjunto ciego",
        "fuera de tema",
    }
    assert EVAL_PATH.is_file()


def test_calidad_de_la_recuperacion_no_retrocede(evaluacion):
    """Umbrales por debajo de lo medido (ver docs/mentor-eval.md): detectan regresiones reales."""
    _, por_conjunto, _ = evaluacion
    for nombre, hit1, hit3 in (
        ("conjunto de ajuste", 0.45, 0.88),
        ("conjunto reservado", 0.60, 0.88),
        ("conjunto ciego", 0.50, 0.80),
    ):
        m = por_conjunto[nombre]
        assert m.hit(1) >= hit1, f"{nombre}: hit@1 {m.hit(1):.1%}"
        assert m.hit(3) >= hit3, f"{nombre}: hit@3 {m.hit(3):.1%}"
        assert m.hit(5) >= 0.90, f"{nombre}: hit@5 {m.hit(5):.1%}"
    fuera = por_conjunto["fuera de tema"]
    assert fuera.rechazos_correctos >= fuera.fuera_de_tema - 1
    assert "hit@3" in informe(por_conjunto)


def test_los_fragmentos_de_apoyo_no_se_citan_pero_si_se_recuperan(retriever: BM25Retriever):
    resultados = retriever.buscar(Consulta("¿Por qué duele una fractura?", k=10))
    tipos = {r.fragmento.tipo for r in resultados}
    assert TIPO_CONTENIDO in tipos or TIPO_BANCO in tipos
    assert all(
        r.fragmento.citable == (r.fragmento.tipo != TIPO_BANCO and r.fragmento.tipo != TIPO_GANCHO)
        for r in resultados
    )
