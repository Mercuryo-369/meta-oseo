"""Carga única del motor de recuperación (al arrancar la API)."""

import logging
import time

from fastapi import FastAPI

from app.core.settings import Settings
from app.rag.corpus import CorpusError, cargar
from app.rag.retriever import BM25Retriever, PgVectorRetriever, Retriever

logger = logging.getLogger("ova.rag")


def construir_retriever(settings: Settings) -> Retriever:
    """Lee el corpus y arma el motor de `RAG_BACKEND`.

    - `RAG_CORPUS_PATH` vacía: motor vacío (el mentor responde sin material del curso).
    - Ruta por defecto que no existe: aviso y motor vacío (la API sigue funcionando).
    - Ruta explícita que no existe, o corpus inválido: `CorpusError` (error de arranque).
    """
    ruta = settings.rag_corpus_path
    if ruta is None:
        logger.warning("RAG_CORPUS_PATH vacía: el mentor responderá sin material del curso.")
        return BM25Retriever(())
    if not ruta.is_file():
        if settings.corpus_is_explicit:
            raise CorpusError(f"RAG_CORPUS_PATH apunta a un archivo que no existe: {ruta}")
        logger.warning(
            "No existe el corpus %s (ejecuta `python -m app.scripts.build_corpus`): "
            "el mentor responderá sin material del curso.",
            ruta,
        )
        return BM25Retriever(())
    inicio = time.perf_counter()
    fragmentos = cargar(ruta)
    if settings.rag_backend == "pgvector":
        retriever: Retriever = PgVectorRetriever(fragmentos)
    else:
        retriever = BM25Retriever(fragmentos)
    logger.info(
        "Corpus del mentor cargado: %d fragmentos en %.0f ms (%s).",
        len(fragmentos),
        (time.perf_counter() - inicio) * 1000,
        settings.rag_backend,
    )
    return retriever


def obtener_retriever(app: FastAPI) -> Retriever:
    """El motor de la app. Se crea en el arranque; si no, en la primera consulta."""
    retriever = getattr(app.state, "retriever", None)
    if retriever is None:
        retriever = construir_retriever(app.state.settings)
        app.state.retriever = retriever
    return retriever
