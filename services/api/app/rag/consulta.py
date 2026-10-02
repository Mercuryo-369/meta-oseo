"""Arma la consulta de recuperación a partir de la conversación y del contexto pedagógico (F3-02).

- La pregunta es el último mensaje del estudiante. Si es un seguimiento sin contenido propio («¿y
  eso por qué?»), se le suma el mensaje anterior para que la búsqueda tenga de qué agarrarse.
- El módulo y la sección que tiene abiertos refuerzan (no filtran) los resultados.
- La estructura y la molécula seleccionadas (`histo_osteoclasto`, `mol_rankl`) y las palabras del id
  de la sección abierta entran como texto de menor peso: si dice «¿qué hace esto?» con el
  osteoclasto marcado, se busca «osteoclasto».
"""

import re
from collections.abc import Sequence

from app.rag.retriever import Consulta
from app.rag.texto import normalizar, tokenizar

# Palabras que remiten a lo dicho antes («¿y eso por qué pasa?»): con una sola palabra de contenido
# más una de estas, la pregunta se completa con la anterior. Sin ninguna palabra de contenido
# («¿y por qué?») se completa siempre.
_ANAFORAS = frozenset(
    {"eso", "esto", "esa", "ese", "esas", "esos", "ello", "aquello", "anterior", "mismo", "tambien"}
)
# Prefijos de ids de capas, moléculas, pasos... que no aportan a la búsqueda.
_PREFIJOS_ID = re.compile(r"^(?:mol|rec|par|histo|ident|capa|paso|ea|eb)_|^m\d+_(?:\d+_)?")
# Tope del texto que se busca (un mensaje puede tener hasta 8000 caracteres).
MAX_CARACTERES_CONSULTA = 1500


def _legible(identificador: str | None) -> str:
    if not identificador:
        return ""
    return _PREFIJOS_ID.sub("", identificador).replace("_", " ")


def _es_seguimiento(pregunta: str) -> bool:
    terminos = len(tokenizar(pregunta))
    if terminos == 0:
        return True
    return terminos == 1 and any(p in _ANAFORAS for p in normalizar(pregunta).split())


def consulta_desde_conversacion(
    mensajes_estudiante: Sequence[str],
    *,
    k: int = 5,
    modulo: int | None = None,
    seccion: str | None = None,
    estructura: str | None = None,
    molecula: str | None = None,
) -> Consulta:
    """`mensajes_estudiante`: lo que escribió el estudiante, en orden (el último es la pregunta)."""
    pregunta = mensajes_estudiante[-1] if mensajes_estudiante else ""
    texto = pregunta[:MAX_CARACTERES_CONSULTA]
    if len(mensajes_estudiante) > 1 and _es_seguimiento(texto):
        texto = f"{mensajes_estudiante[-2][:MAX_CARACTERES_CONSULTA]} {texto}"
    return Consulta(
        texto=texto,
        k=k,
        modulo_actual=modulo,
        seccion_actual=seccion,
        texto_contexto=(
            f"{_legible(estructura)} {_legible(molecula)} "
            f"{_legible(seccion) if seccion != 'inicio' else ''}"
        ).strip(),
    )
