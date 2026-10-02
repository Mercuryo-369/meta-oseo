"""Recuperación de fragmentos del curso (F3-02): interfaz y motor BM25 en Python puro.

La interfaz (`Retriever`) es lo único que conoce el resto de la API. Hoy la implementa
`BM25Retriever`, sin dependencias: se carga una vez al arrancar y responde en pocos milisegundos.
Cuando se monte Docker con la imagen `pgvector/pgvector` (F6-10) bastará escribir otra clase con la
misma interfaz (`PgVectorRetriever`, hoy un esqueleto que no está implementado) y elegirla con
`RAG_BACKEND=pgvector`.

BM25 (Okapi): para cada término de la consulta,

    idf(t) * tf * (k1 + 1) / (tf + k1 * (1 - b + b * longitud / longitud_media))

con `idf(t) = ln(1 + (N - n_t + 0.5) / (n_t + 0.5))`. Los términos de la consulta se ponderan (los
del contexto del estudiante pesan menos que su pregunta) y el puntaje final se refuerza si el
fragmento es del módulo o de la sección que el estudiante tiene abierta.
"""

import math
from collections import Counter
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from typing import Protocol

from app.rag.corpus import (
    TIPO_BANCO,
    TIPO_CONTENIDO,
    TIPO_GANCHO,
    TIPO_GLOSARIO,
    Fragmento,
)
from app.rag.texto import tokenizar

# Parámetros de BM25 (valores clásicos; se ajustaron con `docs/mentor-eval.md`).
K1 = 0.9
B = 0.4
# Las palabras del título de la sección pesan como si se repitieran.
PESO_TITULO = 2
# Peso de los términos que vienen del contexto (estructura o molécula seleccionada) frente a los
# de la pregunta del estudiante.
PESO_CONTEXTO = 0.35
# Refuerzos multiplicativos por estar en el módulo o la sección que el estudiante tiene abiertos.
REFUERZO_MODULO = 0.25
REFUERZO_SECCION = 0.20
# Las definiciones del glosario son muy cortas y por eso puntúan alto con solo nombrar el término;
# el material del docente para el mentor es un apoyo, no la fuente primaria. Ambos se prefieren un
# poco menos que el texto del curso a igualdad de coincidencias.
FACTOR_POR_TIPO = {TIPO_GLOSARIO: 0.7, TIPO_BANCO: 0.9, TIPO_GANCHO: 0.85}
# Tope por resultado: el mismo término aparece en el glosario de varios módulos (se deja uno) y no
# se quiere llenar la lista con definiciones ni con material de apoyo.
MAX_GLOSARIO = 2
MAX_APOYO = 2
# Umbrales para poder decir «el material no cubre esto»: puntaje mínimo del mejor resultado,
# cobertura mínima (fracción del peso informativo de la consulta que el mejor fragmento contiene;
# una palabra que no existe en todo el corpus cuenta como no cubierta) y fracción del mejor puntaje
# por debajo de la cual se descartan los demás.
PUNTAJE_MINIMO = 2.0
COBERTURA_MINIMA = 0.3
FRACCION_DEL_MEJOR = 0.4


@dataclass(frozen=True, slots=True)
class Consulta:
    """Lo que se busca y cómo se refuerza."""

    texto: str
    k: int = 5
    # Solo fragmentos de estos módulos (`None`: todos).
    modulos: frozenset[int] | None = None
    # Refuerzo de lo que el estudiante tiene abierto (no filtra, solo sube el puntaje).
    modulo_actual: int | None = None
    seccion_actual: str | None = None
    # Texto adicional de menor peso (estructura o molécula seleccionadas).
    texto_contexto: str = ""


@dataclass(frozen=True, slots=True)
class Resultado:
    fragmento: Fragmento
    puntaje: float


class Retriever(Protocol):
    """Interfaz de recuperación. Una implementación vectorial debe cumplir exactamente esto."""

    def buscar(self, consulta: Consulta) -> list[Resultado]: ...

    def fragmentos_de(self, modulo: int, seccion_id: str | None = None) -> list[Fragmento]: ...

    def __len__(self) -> int: ...


def texto_indexable(fragmento: Fragmento) -> list[str]:
    """Raíces que se indexan de un fragmento: su título (repetido) y su texto."""
    if fragmento.tipo == TIPO_CONTENIDO:
        titulo = fragmento.seccion_titulo
    elif fragmento.tipo == TIPO_GLOSARIO:
        titulo = fragmento.texto.split(":", 1)[0]  # el término definido
    elif fragmento.tipo in (TIPO_BANCO, TIPO_GANCHO):
        titulo = ""
    else:
        titulo = fragmento.seccion_titulo
    return tokenizar(titulo) * PESO_TITULO + tokenizar(fragmento.texto)


@dataclass(slots=True)
class _Indice:
    postings: dict[str, list[tuple[int, int]]] = field(default_factory=dict)
    longitudes: list[int] = field(default_factory=list)
    media: float = 0.0


class BM25Retriever:
    """BM25 en memoria sobre el corpus. Inmutable tras construirse: seguro entre hilos."""

    def __init__(self, fragmentos: Iterable[Fragmento], *, k1: float = K1, b: float = B) -> None:
        self._fragmentos: tuple[Fragmento, ...] = tuple(fragmentos)
        self._k1 = k1
        self._b = b
        self._indice = _Indice()
        self._numero: dict[str, int] = {}
        self._clave_glosario: dict[str, str] = {}
        self._construir()

    def __len__(self) -> int:
        return len(self._fragmentos)

    def fragmentos_de(self, modulo: int, seccion_id: str | None = None) -> list[Fragmento]:
        """Fragmentos de un módulo (o de una de sus secciones), en el orden del corpus.

        No puntúa nada: sirve para armar el material de un quiz sobre una sección concreta.
        """
        return [
            f
            for f in self._fragmentos
            if f.modulo == modulo and (seccion_id is None or f.seccion_id == seccion_id)
        ]

    def _construir(self) -> None:
        indice = self._indice
        for numero, fragmento in enumerate(self._fragmentos):
            self._numero[fragmento.id] = numero
            if fragmento.tipo == TIPO_GLOSARIO:
                self._clave_glosario[fragmento.id] = " ".join(
                    tokenizar(fragmento.texto.split(":", 1)[0])
                )
            frecuencias = Counter(texto_indexable(fragmento))
            indice.longitudes.append(sum(frecuencias.values()))
            for termino, tf in frecuencias.items():
                indice.postings.setdefault(termino, []).append((numero, tf))
        total = sum(indice.longitudes)
        indice.media = total / len(indice.longitudes) if indice.longitudes else 0.0

    def _idf(self, termino: str) -> float:
        n = len(self._indice.postings.get(termino, ()))
        total = len(self._fragmentos)
        return math.log(1.0 + (total - n + 0.5) / (n + 0.5))

    def _ponderar_consulta(self, consulta: Consulta) -> tuple[dict[str, float], frozenset[str]]:
        """Peso de cada término de la búsqueda y cuáles vienen de la pregunta (no del contexto)."""
        pesos: dict[str, float] = {}
        principales = tokenizar(consulta.texto)
        for termino in principales:
            pesos[termino] = 1.0
        # Sin palabras con contenido («explícame esto»), el contexto es todo lo que hay.
        peso_contexto = PESO_CONTEXTO if principales else 1.0
        for termino in tokenizar(consulta.texto_contexto):
            pesos.setdefault(termino, peso_contexto)
        return pesos, frozenset(principales)

    def _idf_maximo(self) -> float:
        return math.log(1.0 + (len(self._fragmentos) + 0.5) / 0.5)

    def buscar(self, consulta: Consulta) -> list[Resultado]:
        indice = self._indice
        if not self._fragmentos or indice.media == 0:
            return []
        pesos, principales = self._ponderar_consulta(consulta)
        puntajes: dict[int, float] = {}
        # Peso informativo de las palabras de la PREGUNTA (no del contexto) y cuánto de él contiene
        # cada fragmento: una palabra que no aparece en todo el corpus pesa como la más rara.
        masa: dict[int, float] = {}
        masa_total = 0.0
        for termino, peso in pesos.items():
            postings = indice.postings.get(termino)
            if not postings:
                if termino in principales:
                    masa_total += self._idf_maximo()
                continue
            idf = self._idf(termino) * peso
            if termino in principales:
                masa_total += idf
            for numero, tf in postings:
                if termino in principales:
                    masa[numero] = masa.get(numero, 0.0) + idf
                largo = indice.longitudes[numero]
                norma = self._k1 * (1.0 - self._b + self._b * largo / indice.media)
                puntajes[numero] = puntajes.get(numero, 0.0) + idf * tf * (self._k1 + 1.0) / (
                    tf + norma
                )

        candidatos: list[Resultado] = []
        for numero, puntaje in puntajes.items():
            fragmento = self._fragmentos[numero]
            if consulta.modulos is not None and fragmento.modulo not in consulta.modulos:
                continue
            puntaje *= FACTOR_POR_TIPO.get(fragmento.tipo, 1.0)
            if consulta.modulo_actual is not None and fragmento.modulo == consulta.modulo_actual:
                puntaje *= 1.0 + REFUERZO_MODULO
                if consulta.seccion_actual and fragmento.seccion_id == consulta.seccion_actual:
                    puntaje *= 1.0 + REFUERZO_SECCION
            candidatos.append(Resultado(fragmento, puntaje))

        candidatos.sort(key=lambda r: (-r.puntaje, r.fragmento.id))
        if not candidatos or candidatos[0].puntaje < PUNTAJE_MINIMO:
            return []
        mejor = self._numero[candidatos[0].fragmento.id]
        if principales and masa.get(mejor, 0.0) / masa_total < COBERTURA_MINIMA:
            return []
        limite = candidatos[0].puntaje * FRACCION_DEL_MEJOR
        return self._diversificar(
            [r for r in candidatos if r.puntaje >= limite], consulta.k, consulta.modulo_actual
        )

    def _diversificar(
        self, candidatos: list[Resultado], k: int, modulo_actual: int | None
    ) -> list[Resultado]:
        """Primeros `k` sin repetir términos del glosario y con tope de glosario y de apoyo.

        De varias definiciones del mismo término (una por módulo) se deja la del módulo actual o,
        si no hay, la de mejor puntaje.
        """
        elegidos: list[Resultado] = []
        terminos: dict[str, int] = {}  # clave del término -> posición en `elegidos`
        glosario = apoyo = 0
        for resultado in candidatos:
            fragmento = resultado.fragmento
            if fragmento.tipo == TIPO_GLOSARIO:
                clave = self._clave_glosario[fragmento.id]
                if clave in terminos:
                    previo = elegidos[terminos[clave]]
                    if (
                        fragmento.modulo == modulo_actual
                        and previo.fragmento.modulo != modulo_actual
                    ):
                        elegidos[terminos[clave]] = resultado
                    continue
                if glosario >= MAX_GLOSARIO:
                    continue
                terminos[clave] = len(elegidos)
                glosario += 1
            elif fragmento.tipo in (TIPO_BANCO, TIPO_GANCHO):
                if apoyo >= MAX_APOYO:
                    continue
                apoyo += 1
            elegidos.append(resultado)
            if len(elegidos) >= k:
                break
        return elegidos


class PgVectorRetriever:
    """Esqueleto para la búsqueda vectorial en PostgreSQL con pgvector (F6-10). NO implementado.

    Debe cumplir `Retriever`: `buscar(consulta)` con el mismo significado de `modulos`,
    `modulo_actual` y `seccion_actual`, y `__len__`. Se activa con `RAG_BACKEND=pgvector` cuando
    el despliegue use la imagen `pgvector/pgvector:pg16` y `CREATE EXTENSION vector;`. Hasta
    entonces la API se niega a arrancar con ese valor en lugar de degradarse en silencio.
    """

    def __init__(self, fragmentos: Sequence[Fragmento]) -> None:
        raise NotImplementedError(
            "La recuperación con pgvector aún no está implementada (pendiente de F6-10). "
            "Usa RAG_BACKEND=bm25."
        )

    def buscar(self, consulta: Consulta) -> list[Resultado]:  # pragma: no cover
        raise NotImplementedError

    def fragmentos_de(  # pragma: no cover
        self, modulo: int, seccion_id: str | None = None
    ) -> list[Fragmento]:
        raise NotImplementedError

    def __len__(self) -> int:  # pragma: no cover
        raise NotImplementedError
