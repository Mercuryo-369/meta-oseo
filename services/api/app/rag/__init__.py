"""Recuperación del material del curso para el mentor (RAG, F3-01 a F3-05).

- `texto`: normalización del español y stemming ligero.
- `corpus`: los fragmentos (`app/data/corpus.jsonl`, lo genera `app/scripts/build_corpus.py`).
- `retriever`: la interfaz `Retriever`, el motor BM25 propio y el esqueleto de pgvector.
- `consulta`: cómo se arma la consulta desde la conversación y el contexto pedagógico.
- `carga`: carga única del corpus al arrancar.
- `evaluar`: mide hit@1 y hit@3 con las preguntas de `docs/mentor-eval.md`.
"""
