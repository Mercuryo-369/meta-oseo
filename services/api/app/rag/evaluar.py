"""Evalúa la recuperación con las preguntas de `docs/mentor-eval.md` (F3-02).

Uso (desde services/api):

    uv run python -m app.rag.evaluar
    uv run python -m app.rag.evaluar --detalle      # muestra cada pregunta fallida

Lee las tablas de `docs/mentor-eval.md`. Cada fila es `| # | Pregunta | Contexto | Esperado |`:

- `Contexto`: `-` (sin contexto), `m5` (el estudiante está en el módulo 5) o `m5:m5_4_hormonas`
  (módulo y sección).
- `Esperado`: uno o varios `refs` de fragmentos (separados por coma). Hay acierto si algún
  fragmento recuperado cubre alguno. `-` significa «fuera de tema»: acierta si NO se recupera nada.

Se informa hit@1, hit@3 y hit@5 por conjunto (ajuste, reservado, fuera de tema). El conjunto
reservado no se usó para ajustar los parámetros del motor.
"""

import argparse
import re
import sys
import time
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path

from app.core.settings import DEFAULT_CORPUS_PATH, REPO_ROOT
from app.rag.consulta import consulta_desde_conversacion
from app.rag.corpus import cargar
from app.rag.retriever import BM25Retriever, Retriever

EVAL_PATH = REPO_ROOT / "docs" / "mentor-eval.md"
KS = (1, 3, 5)


@dataclass(frozen=True, slots=True)
class Pregunta:
    numero: int
    conjunto: str
    texto: str
    modulo: int | None
    seccion: str | None
    esperado: tuple[str, ...]  # vacío: fuera de tema


@dataclass(slots=True)
class Metricas:
    total: int = 0
    aciertos: dict[int, int] = field(default_factory=lambda: dict.fromkeys(KS, 0))
    rechazos_correctos: int = 0
    fuera_de_tema: int = 0
    mrr: float = 0.0

    def hit(self, k: int) -> float:
        return self.aciertos[k] / self.total if self.total else 0.0


_ENCABEZADO = re.compile(r"^##\s+(.+?)\s*$")
_CELDA_CODIGO = re.compile(r"^`?([^`]*)`?$")


def _celdas(linea: str) -> list[str]:
    return [c.strip() for c in linea.strip().strip("|").split("|")]


def leer_preguntas(ruta: Path = EVAL_PATH) -> list[Pregunta]:
    """Preguntas de las tablas del documento (el encabezado `##` previo da el conjunto)."""
    conjunto = ""
    preguntas: list[Pregunta] = []
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        encabezado = _ENCABEZADO.match(linea)
        if encabezado:
            conjunto = encabezado.group(1).strip().lower()
            continue
        if not linea.startswith("|"):
            continue
        celdas = _celdas(linea)
        if len(celdas) < 4 or not celdas[0].isdigit():
            continue
        contexto = _CELDA_CODIGO.sub(r"\1", celdas[2]).strip()
        modulo = seccion = None
        if contexto and contexto != "-":
            parte_modulo, _, parte_seccion = contexto.partition(":")
            modulo = int(parte_modulo.removeprefix("m"))
            seccion = parte_seccion or None
        esperado_crudo = _CELDA_CODIGO.sub(r"\1", celdas[3]).strip()
        esperado = (
            ()
            if esperado_crudo == "-"
            else tuple(r.strip().strip("`") for r in esperado_crudo.split(",") if r.strip())
        )
        preguntas.append(Pregunta(int(celdas[0]), conjunto, celdas[1], modulo, seccion, esperado))
    return preguntas


def evaluar(
    retriever: Retriever, preguntas: Sequence[Pregunta], k: int = 5
) -> tuple[dict[str, Metricas], list[tuple[Pregunta, list[str]]]]:
    """Métricas por conjunto y la lista de preguntas falladas (con lo que se recuperó)."""
    por_conjunto: dict[str, Metricas] = {}
    fallos: list[tuple[Pregunta, list[str]]] = []
    for pregunta in preguntas:
        metricas = por_conjunto.setdefault(pregunta.conjunto, Metricas())
        consulta = consulta_desde_conversacion(
            [pregunta.texto], k=k, modulo=pregunta.modulo, seccion=pregunta.seccion
        )
        resultados = retriever.buscar(consulta)
        recuperados = [r.fragmento.id for r in resultados]
        if not pregunta.esperado:
            metricas.fuera_de_tema += 1
            if not resultados:
                metricas.rechazos_correctos += 1
            else:
                fallos.append((pregunta, recuperados))
            continue
        metricas.total += 1
        posicion = next(
            (
                i
                for i, r in enumerate(resultados, start=1)
                if set(r.fragmento.refs) & set(pregunta.esperado)
            ),
            None,
        )
        for corte in KS:
            if posicion is not None and posicion <= corte:
                metricas.aciertos[corte] += 1
        if posicion is not None:
            metricas.mrr += 1.0 / posicion
        if posicion is None or posicion > 3:
            fallos.append((pregunta, recuperados))
    return por_conjunto, fallos


def informe(por_conjunto: dict[str, Metricas]) -> str:
    lineas = []
    for nombre, m in por_conjunto.items():
        if m.total:
            hits = "  ".join(f"hit@{k}={m.hit(k):.1%}" for k in KS)
            lineas.append(f"{nombre}: {m.total} preguntas  {hits}  MRR={m.mrr / m.total:.3f}")
        if m.fuera_de_tema:
            lineas.append(
                f"{nombre}: {m.rechazos_correctos}/{m.fuera_de_tema} sin resultados "
                "(rechazo correcto)"
            )
    return "\n".join(lineas)


def main(argv: Sequence[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(prog="python -m app.rag.evaluar")
    parser.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS_PATH)
    parser.add_argument("--preguntas", type=Path, default=EVAL_PATH)
    parser.add_argument("--detalle", action="store_true", help="Lista las preguntas falladas.")
    args = parser.parse_args(argv)

    retriever = BM25Retriever(cargar(args.corpus))
    preguntas = leer_preguntas(args.preguntas)
    inicio = time.perf_counter()
    por_conjunto, fallos = evaluar(retriever, preguntas)
    milisegundos = (time.perf_counter() - inicio) * 1000 / max(len(preguntas), 1)
    print(informe(por_conjunto))
    print(f"{len(retriever)} fragmentos; {milisegundos:.2f} ms por consulta.")
    if args.detalle:
        for pregunta, recuperados in fallos:
            print(f"\n[{pregunta.conjunto} #{pregunta.numero}] {pregunta.texto}")
            print(f"  esperado: {', '.join(pregunta.esperado) or '(nada)'}")
            print(f"  recuperado: {', '.join(recuperados[:5]) or '(nada)'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
