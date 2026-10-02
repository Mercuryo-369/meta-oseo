"""Genera el corpus del mentor (F3-01) a partir del contenido de los módulos y de sus guiones.

Uso (desde services/api):

    uv run python -m app.scripts.build_corpus
    uv run python -m app.scripts.build_corpus --comprobar

Lee `apps/web/src/modules/m{n}_{slug}/content.json` (objetivos, glosario y el texto visible de los
bloques `texto`, `callout` y `tabla`, más los pasos de las actividades `video-texto`, que son
explicaciones) y, de `docs/guion-por-modulo/m{n}_*.md`, las secciones «Banco de preguntas para el
mentor» y «Ganchos para el mentor». Escribe `services/api/app/data/corpus.jsonl` (formato en
`app/rag/corpus.py`). Hay que volver a ejecutarlo, y versionar el resultado, cada vez que cambie el
contenido o el guion.

Lo que NO entra, a propósito: los enunciados, opciones, explicaciones y respuestas de las
actividades calificadas (quiz, relación de columnas, arrastre, capas, exploración 3D). El mentor
guía; si esos textos estuvieran en su corpus podría filtrar las respuestas. El banco de preguntas
del mentor sí entra, con el tipo `banco` (preguntas distintas de las del módulo, pensadas para él).

Códigos de salida: 0 = listo, 1 = corpus desactualizado (`--comprobar`), 2 = contenido inválido.
"""

import argparse
import json
import re
import sys
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path

from app.core.constants import MODULE_COUNT
from app.core.settings import DEFAULT_CORPUS_PATH, REPO_ROOT
from app.rag.corpus import (
    NIVEL_POSGRADO,
    NIVEL_TODOS,
    TIPO_BANCO,
    TIPO_CONTENIDO,
    TIPO_GANCHO,
    TIPO_GLOSARIO,
    TIPO_OBJETIVOS,
    Fragmento,
    serializar,
)
from app.rag.texto import contar_palabras
from app.scripts.build_manifest import MODULES_DIR, discover_content_files

GUION_DIR = REPO_ROOT / "docs" / "guion-por-modulo"

EXIT_OK = 0
EXIT_OUTDATED = 1
EXIT_INVALID = 2

# Tamaño de los fragmentos, en palabras. Se empaquetan bloques enteros hasta `MAX_PALABRAS`; un
# bloque más largo se parte por párrafos y oraciones. Un fragmento corto se une al siguiente si el
# resultado no pasa de `TOPE_PALABRAS`.
MIN_PALABRAS = 80
MAX_PALABRAS = 200
TOPE_PALABRAS = 260
# Un bloque con título abre fragmento nuevo si el actual ya tiene al menos estas palabras.
MIN_CUERPO_TEMA = 50

ETIQUETA_CALLOUT = {
    "clinico": "Nota clínica",
    "atencion": "Atención",
    "dato": "Dato",
    "recuerda": "Recuerda",
}


class CorpusBuildError(ValueError):
    """El contenido o el guion no tienen la forma esperada."""


# --- Limpieza de Markdown --------------------------------------------------------------------

_ENLACE = re.compile(r"\[([^\]]+)\]\([^)]*\)")
_NEGRITA = re.compile(r"\*\*(.+?)\*\*")
_CURSIVA = re.compile(r"(?<![\*\w])\*(?!\s)(.+?)(?<!\s)\*(?![\*\w])")
_VERIFICAR = re.compile(r"\s*\[verificar\]", re.IGNORECASE)
_ESPACIOS = re.compile(r"[ \t]+")


def limpiar_markdown(texto: str) -> str:
    """Texto plano: sin enlaces (queda el texto), negritas, cursivas ni marcas `[verificar]`."""
    texto = _VERIFICAR.sub("", texto)
    texto = _ENLACE.sub(r"\1", texto)
    texto = _NEGRITA.sub(r"\1", texto)
    texto = _CURSIVA.sub(r"\1", texto)
    texto = texto.replace("`", "")
    lineas = [_ESPACIOS.sub(" ", linea).strip() for linea in texto.splitlines()]
    return "\n".join(lineas).strip()


# --- Fragmentos de contenido -----------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Unidad:
    """Un trozo de texto atómico (un bloque o parte de uno) que se empaqueta en fragmentos."""

    ref: str  # id del bloque (o de la actividad) de donde sale
    texto: str
    nivel: str = NIVEL_TODOS
    # Abre un tema nuevo (bloque de texto con título): si el fragmento en curso ya tiene cuerpo,
    # el corte cae aquí y no en medio de un tema. Las notas y tablas se quedan con su tema.
    abre_tema: bool = False
    # Título del tema (del bloque con título o de la actividad de video-texto): distingue las
    # fuentes de una misma sección en la lista de citas.
    subtitulo: str = ""


def _texto_tabla(bloque: dict) -> str:
    encabezado = [limpiar_markdown(str(bloque.get("encabezado_criterio", "")))]
    encabezado += [limpiar_markdown(str(c)) for c in bloque.get("columnas", [])]
    lineas = []
    for fila in bloque.get("filas", []):
        celdas = [limpiar_markdown(str(c)) for c in fila.get("celdas", [])]
        partes = [
            f"{nombre}: {celda}"
            for nombre, celda in zip(encabezado[1:], celdas, strict=False)
            if celda
        ]
        criterio = limpiar_markdown(str(fila.get("criterio", "")))
        lineas.append(f"{criterio} — " + "; ".join(partes) if partes else criterio)
    titulo = "Comparación (" + ", ".join(e for e in encabezado if e) + ")"
    return titulo + "\n" + "\n".join(f"- {linea}" for linea in lineas)


def _texto_bloque(bloque: dict) -> str | None:
    tipo = bloque.get("tipo")
    if tipo == "texto":
        cuerpo = limpiar_markdown(str(bloque.get("markdown", "")))
        titulo = limpiar_markdown(str(bloque.get("titulo", "")))
        return f"{titulo}\n{cuerpo}" if titulo else cuerpo
    if tipo == "callout":
        cuerpo = limpiar_markdown(str(bloque.get("markdown", "")))
        titulo = limpiar_markdown(str(bloque.get("titulo", "")))
        etiqueta = titulo or ETIQUETA_CALLOUT.get(str(bloque.get("variante")), "Nota")
        return f"{etiqueta}: {cuerpo}"
    if tipo == "tabla":
        return _texto_tabla(bloque)
    if tipo == "actividad":
        actividad = bloque.get("actividad", {})
        if actividad.get("tipo") != "video-texto":
            return None  # las demás actividades son calificadas: sus textos no se indexan
        pasos = actividad.get("config", {}).get("pasos", [])
        partes = [
            f"{limpiar_markdown(str(p.get('titulo', '')))}: "
            f"{limpiar_markdown(str(p.get('texto', '')))}"
            for p in pasos
        ]
        return "\n".join(p for p in partes if p.strip(": "))
    return None  # imágenes y demás: sin texto que indexar


def _partir_en_oraciones(texto: str, maximo: int) -> list[str]:
    """Parte un texto largo por párrafos y, si hace falta, por oraciones (cada trozo ≤ maximo)."""
    trozos: list[str] = []
    actual: list[str] = []
    palabras_actuales = 0
    for parrafo in re.split(r"\n+", texto):
        oraciones = (
            re.split(r"(?<=[.;:!?])\s+", parrafo)
            if contar_palabras(parrafo) > maximo
            else [parrafo]
        )
        for oracion in oraciones:
            n = contar_palabras(oracion)
            if actual and palabras_actuales + n > maximo:
                trozos.append("\n".join(actual))
                actual, palabras_actuales = [], 0
            actual.append(oracion)
            palabras_actuales += n
    if actual:
        trozos.append("\n".join(actual))
    return trozos


def _subtitulo_de_bloque(bloque: dict) -> str:
    """Título del tema de un bloque: el del texto, el de la actividad de video o el de la nota."""
    if bloque.get("tipo") == "actividad":
        return limpiar_markdown(str(bloque.get("actividad", {}).get("titulo", "")))
    if bloque.get("tipo") in ("texto", "callout"):
        return limpiar_markdown(str(bloque.get("titulo", "")))
    return ""


def _unidades_de_seccion(seccion: dict) -> list[Unidad]:
    unidades: list[Unidad] = []
    for bloque in seccion.get("bloques", []):
        texto = _texto_bloque(bloque)
        if not texto or not texto.strip():
            continue
        nivel = NIVEL_POSGRADO if bloque.get("nivel") == "posgrado" else NIVEL_TODOS
        ref = str(bloque.get("id") or bloque.get("actividad", {}).get("id"))
        abre_tema = bloque.get("tipo") == "texto" and bool(bloque.get("titulo"))
        subtitulo = _subtitulo_de_bloque(bloque)
        if contar_palabras(texto) > MAX_PALABRAS:
            trozos = _partir_en_oraciones(texto, MAX_PALABRAS)
            unidades += [
                Unidad(ref, trozo, nivel, abre_tema and i == 0, subtitulo if i == 0 else "")
                for i, trozo in enumerate(trozos)
            ]
        else:
            unidades.append(Unidad(ref, texto, nivel, abre_tema, subtitulo))
    return unidades


def empaquetar(unidades: Sequence[Unidad]) -> list[list[Unidad]]:
    """Agrupa unidades consecutivas del mismo nivel en fragmentos de ~80 a ~200 palabras."""
    grupos: list[list[Unidad]] = []
    actual: list[Unidad] = []
    palabras = 0
    for unidad in unidades:
        n = contar_palabras(unidad.texto)
        cambia_nivel = bool(actual) and actual[0].nivel != unidad.nivel
        desborda = palabras + n > MAX_PALABRAS
        cambia_tema = unidad.abre_tema and palabras >= MIN_CUERPO_TEMA
        if actual and (
            cambia_nivel
            or cambia_tema
            or (desborda and (palabras >= MIN_PALABRAS or palabras + n > TOPE_PALABRAS))
        ):
            grupos.append(actual)
            actual, palabras = [], 0
        actual.append(unidad)
        palabras += n
    if actual:
        grupos.append(actual)
    # Un último fragmento muy corto se une al anterior si no se pasa del tope.
    if len(grupos) > 1:
        ultimo, previo = grupos[-1], grupos[-2]
        n_ultimo = sum(contar_palabras(u.texto) for u in ultimo)
        n_previo = sum(contar_palabras(u.texto) for u in previo)
        if (
            n_ultimo < MIN_PALABRAS // 2
            and n_previo + n_ultimo <= TOPE_PALABRAS
            and previo[0].nivel == ultimo[0].nivel
        ):
            grupos[-2] = previo + ultimo
            grupos.pop()
    return grupos


def fragmentos_de_modulo(contenido: dict) -> list[Fragmento]:
    numero = int(contenido["numero"])
    modulo = f"m{numero}"
    fragmentos: list[Fragmento] = []

    objetivos = [f"- {limpiar_markdown(str(o))}" for o in contenido.get("objetivos", [])]
    titulo_modulo = limpiar_markdown(str(contenido.get("titulo", "")))
    resumen = limpiar_markdown(str(contenido.get("resumen", "")))
    if objetivos:
        fragmentos.append(
            Fragmento(
                id=f"{modulo}:objetivos",
                modulo=numero,
                seccion_id=None,
                seccion_titulo=f"Objetivos del módulo {numero}: {titulo_modulo}",
                tipo=TIPO_OBJETIVOS,
                texto=f"{resumen}\nObjetivos de aprendizaje:\n" + "\n".join(objetivos),
                url=f"/modulo/{numero}",
                refs=(f"{modulo}:objetivos",),
            )
        )

    for seccion in contenido.get("secciones", []):
        seccion_id = str(seccion["id"])
        titulo = limpiar_markdown(str(seccion.get("titulo", seccion_id)))
        usados: dict[str, int] = {}
        for grupo in empaquetar(_unidades_de_seccion(seccion)):
            primero = grupo[0].ref
            usados[primero] = usados.get(primero, 0) + 1
            sufijo = "" if usados[primero] == 1 else f"~{usados[primero]}"
            refs: list[str] = []
            for unidad in grupo:
                ref = f"{modulo}:{unidad.ref}"
                if ref not in refs:
                    refs.append(ref)
            fragmentos.append(
                Fragmento(
                    id=f"{modulo}:{seccion_id}:{primero}{sufijo}",
                    modulo=numero,
                    seccion_id=seccion_id,
                    seccion_titulo=titulo,
                    tipo=TIPO_CONTENIDO,
                    texto="\n\n".join(u.texto for u in grupo),
                    url=f"/modulo/{numero}?s={seccion_id}",
                    nivel=grupo[0].nivel,
                    subtitulo=next((u.subtitulo for u in grupo if u.subtitulo), ""),
                    refs=tuple(refs),
                )
            )

    for termino in contenido.get("glosario", []):
        clave = str(termino["id"])
        fragmentos.append(
            Fragmento(
                id=f"{modulo}:glosario:{clave}",
                modulo=numero,
                seccion_id=None,
                seccion_titulo="Glosario",
                tipo=TIPO_GLOSARIO,
                texto=f"{limpiar_markdown(str(termino['termino']))}: "
                f"{limpiar_markdown(str(termino['definicion']))}",
                url=f"/modulo/{numero}",
                refs=(f"{modulo}:glosario:{clave}",),
            )
        )
    return fragmentos


# --- Secciones del mentor en el guion --------------------------------------------------------

_H2 = re.compile(r"^##\s+(.+?)\s*$")
_CAMPO = re.compile(r"^[-*]?\s*(Respuesta|Dificultad|Concepto)\s*:\s*(.*)$", re.IGNORECASE)
_INICIO_ITEM = re.compile(r"^(?:\d+\.|B\d+\.)\s*(?:Pregunta\s*:)?\s*(.+)$", re.IGNORECASE)
_SUBTITULO_NEGRITA = re.compile(r"^\*\*([^*]+)\*\*\s*(?:\(.*\))?\s*:?\s*$")
_SUBTITULO_H3 = re.compile(r"^###\s+(.+?)\s*$")


def seccion_del_guion(lineas: Sequence[str], titulo: str) -> list[str]:
    """Líneas de la sección `## titulo` (sin el encabezado) hasta el siguiente `## `."""
    dentro = False
    resultado: list[str] = []
    for linea in lineas:
        coincide = _H2.match(linea)
        if coincide:
            if dentro:
                break
            dentro = coincide.group(1).strip().lower().startswith(titulo.lower())
            continue
        if dentro:
            resultado.append(linea)
    return resultado


def _celdas(linea: str) -> list[str]:
    return [c.strip() for c in linea.strip().strip("|").split("|")]


def _es_separador(linea: str) -> bool:
    return bool(re.fullmatch(r"\s*\|?[\s:\-|]+\|?\s*", linea)) and "-" in linea


@dataclass(slots=True)
class PreguntaBanco:
    pregunta: str
    respuesta: str = ""
    dificultad: str = ""
    concepto: str = ""


def parsear_banco(lineas: Sequence[str]) -> list[PreguntaBanco]:
    """Preguntas del banco. Acepta las tres formas que usan los guiones: tabla, lista numerada
    (`1. Pregunta: ...`, con o sin negritas) y `**B1.** ...` con sus campos como viñetas."""
    items: list[PreguntaBanco] = []
    encabezado: list[str] = []
    actual: PreguntaBanco | None = None
    campo_actual = ""
    for cruda in lineas:
        linea = cruda.strip()
        if not linea:
            continue
        if linea.startswith("|"):
            if _es_separador(linea):
                continue
            celdas = _celdas(linea)
            minusculas = [c.lower() for c in celdas]
            if not encabezado and "pregunta" in minusculas:
                encabezado = minusculas
                continue
            if encabezado and len(celdas) >= len(encabezado):
                fila = dict(zip(encabezado, celdas, strict=False))
                items.append(
                    PreguntaBanco(
                        pregunta=limpiar_markdown(fila.get("pregunta", "")),
                        respuesta=limpiar_markdown(fila.get("respuesta", "")),
                        dificultad=limpiar_markdown(fila.get("dificultad", "")),
                        concepto=limpiar_markdown(fila.get("concepto", "")),
                    )
                )
            continue
        sin_negritas = linea.replace("**", "")
        campo = _CAMPO.match(sin_negritas)
        if campo and actual is not None:
            campo_actual = campo.group(1).lower()
            setattr(actual, campo_actual, limpiar_markdown(campo.group(2)))
            continue
        item = _INICIO_ITEM.match(sin_negritas) if not cruda.startswith(("  ", "\t")) else None
        if item:
            actual = PreguntaBanco(pregunta=limpiar_markdown(item.group(1)))
            items.append(actual)
            campo_actual = "pregunta"
            continue
        if actual is not None and campo_actual:  # continuación de un campo en varias líneas
            previo = getattr(actual, campo_actual)
            setattr(actual, campo_actual, f"{previo} {limpiar_markdown(linea)}".strip())
    return items


def unidades_de_ganchos(lineas: Sequence[str]) -> list[tuple[str, str]]:
    """`(subtítulo, texto)` de cada viñeta, fila de tabla o párrafo de la sección de ganchos."""
    unidades: list[tuple[str, str]] = []
    subtitulo = "Ganchos para el mentor"
    encabezado: list[str] = []
    pendiente: list[str] = []

    def cerrar_pendiente() -> None:
        if pendiente:
            unidades.append((subtitulo, limpiar_markdown(" ".join(pendiente))))
            pendiente.clear()

    for cruda in lineas:
        linea = cruda.rstrip()
        if not linea.strip():
            cerrar_pendiente()
            encabezado = []
            continue
        texto = linea.strip()
        titulo = _SUBTITULO_H3.match(texto) or _SUBTITULO_NEGRITA.match(texto)
        if titulo:
            cerrar_pendiente()
            subtitulo = limpiar_markdown(titulo.group(1)).rstrip(":")
            encabezado = []
            continue
        if texto.startswith("|"):
            cerrar_pendiente()
            if _es_separador(texto):
                continue
            celdas = _celdas(texto)
            if not encabezado:
                encabezado = [limpiar_markdown(c) for c in celdas]
                continue
            partes = [
                f"{nombre}: {limpiar_markdown(celda)}"
                for nombre, celda in zip(encabezado, celdas, strict=False)
                if celda.strip()
            ]
            unidades.append((subtitulo, ". ".join(partes)))
            continue
        if re.match(r"^(?:[-*]|\d+\.)\s+", texto) and not cruda.startswith((" ", "\t")):
            cerrar_pendiente()
            pendiente.append(re.sub(r"^(?:[-*]|\d+\.)\s+", "", texto))
            continue
        pendiente.append(texto)
    cerrar_pendiente()
    return [(s, t) for s, t in unidades if t.strip()]


def fragmentos_del_guion(numero: int, texto_guion: str) -> list[Fragmento]:
    lineas = texto_guion.splitlines()
    modulo = f"m{numero}"
    fragmentos: list[Fragmento] = []

    banco = parsear_banco(seccion_del_guion(lineas, "Banco de preguntas para el mentor"))
    if not banco:
        raise CorpusBuildError(f"El guion del módulo {numero} no tiene banco de preguntas.")
    for indice, item in enumerate(banco, start=1):
        if not item.pregunta or not item.respuesta:
            raise CorpusBuildError(
                f"Módulo {numero}, pregunta {indice} del banco sin pregunta o sin respuesta."
            )
        detalle = f" (dificultad {item.dificultad})" if item.dificultad else ""
        concepto = f"\nConcepto que refuerza: {item.concepto}" if item.concepto else ""
        fragmentos.append(
            Fragmento(
                id=f"{modulo}:banco:{indice}",
                modulo=numero,
                seccion_id=None,
                seccion_titulo="Banco de preguntas de refuerzo",
                tipo=TIPO_BANCO,
                texto=(
                    f"Pregunta{detalle}: {item.pregunta}\n"
                    f"Respuesta esperada: {item.respuesta}{concepto}"
                ),
                url=f"/modulo/{numero}",
                refs=(f"{modulo}:banco:{indice}",),
            )
        )

    ganchos = unidades_de_ganchos(seccion_del_guion(lineas, "Ganchos para el mentor"))
    if not ganchos:
        raise CorpusBuildError(f"El guion del módulo {numero} no tiene ganchos para el mentor.")
    # Se empaquetan viñetas/filas consecutivas del mismo subtítulo.
    grupos: list[tuple[str, list[str]]] = []
    palabras = 0
    for subtitulo, texto in ganchos:
        n = contar_palabras(texto)
        if grupos and grupos[-1][0] == subtitulo and palabras + n <= MAX_PALABRAS:
            grupos[-1][1].append(texto)
            palabras += n
        else:
            grupos.append((subtitulo, [texto]))
            palabras = n
    for indice, (subtitulo, textos) in enumerate(grupos, start=1):
        fragmentos.append(
            Fragmento(
                id=f"{modulo}:gancho:{indice}",
                modulo=numero,
                seccion_id=None,
                seccion_titulo=f"Guía del docente: {subtitulo}",
                tipo=TIPO_GANCHO,
                texto="\n".join(f"- {t}" for t in textos),
                url=f"/modulo/{numero}",
                refs=(f"{modulo}:gancho:{indice}",),
            )
        )
    return fragmentos


# --- Ensamblado ------------------------------------------------------------------------------


def descubrir_guiones(guion_dir: Path | None = None) -> dict[int, Path]:
    guion_dir = guion_dir or GUION_DIR
    encontrados: dict[int, Path] = {}
    if guion_dir.is_dir():
        for ruta in sorted(guion_dir.glob("m[1-6]_*.md")):
            encontrados[int(ruta.name[1])] = ruta
    return encontrados


def construir(contenidos: Iterable[dict], guiones: dict[int, Path]) -> list[Fragmento]:
    fragmentos: list[Fragmento] = []
    for contenido in sorted(contenidos, key=lambda c: int(c["numero"])):
        numero = int(contenido["numero"])
        fragmentos += fragmentos_de_modulo(contenido)
        ruta = guiones.get(numero)
        if ruta is None:
            raise CorpusBuildError(f"No hay guion para el módulo {numero} en {GUION_DIR}.")
        fragmentos += fragmentos_del_guion(numero, ruta.read_text(encoding="utf-8"))
    ids = [f.id for f in fragmentos]
    repetidos = sorted({i for i in ids if ids.count(i) > 1})
    if repetidos:
        raise CorpusBuildError("Ids de fragmento repetidos: " + ", ".join(repetidos[:5]))
    return fragmentos


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m app.scripts.build_corpus",
        description="Genera el corpus del mentor (app/data/corpus.jsonl).",
    )
    parser.add_argument(
        "--contenido",
        action="append",
        type=Path,
        metavar="ARCHIVO",
        help="content.json de un módulo (repetible). Por defecto, los de apps/web/src/modules.",
    )
    parser.add_argument(
        "--guion-dir",
        type=Path,
        default=GUION_DIR,
        help=f"Carpeta de los guiones (por defecto {GUION_DIR}).",
    )
    parser.add_argument(
        "--salida",
        type=Path,
        default=DEFAULT_CORPUS_PATH,
        help=f"Archivo de destino (por defecto {DEFAULT_CORPUS_PATH}).",
    )
    parser.add_argument(
        "--comprobar",
        action="store_true",
        help="No escribe: falla si el archivo de destino no está al día.",
    )
    return parser


def _use_utf8_output() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            reconfigure(encoding="utf-8")


def resumen(fragmentos: Sequence[Fragmento]) -> str:
    por_tipo: dict[str, int] = {}
    for f in fragmentos:
        por_tipo[f.tipo] = por_tipo.get(f.tipo, 0) + 1
    detalle = ", ".join(f"{n} {tipo}" for tipo, n in sorted(por_tipo.items()))
    return f"{len(fragmentos)} fragmentos ({detalle})"


def main(argv: Sequence[str] | None = None) -> int:
    _use_utf8_output()
    args = _build_parser().parse_args(argv)
    rutas = args.contenido or discover_content_files()
    if not rutas:
        print(f"No hay content.json en {MODULES_DIR}.", file=sys.stderr)
        return EXIT_INVALID
    try:
        contenidos = [json.loads(ruta.read_text(encoding="utf-8")) for ruta in rutas]
        fragmentos = construir(contenidos, descubrir_guiones(args.guion_dir))
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(
            f"Error: {error!r}" if isinstance(error, KeyError) else f"Error: {error}",
            file=sys.stderr,
        )
        return EXIT_INVALID

    faltan = [n for n in range(1, MODULE_COUNT + 1) if not any(f.modulo == n for f in fragmentos)]
    if faltan:
        print(
            "Aviso: el corpus no incluye los módulos " + ", ".join(map(str, faltan)) + ".",
            file=sys.stderr,
        )

    texto = serializar(fragmentos)
    if args.comprobar:
        actual = args.salida.read_text(encoding="utf-8") if args.salida.is_file() else None
        if actual != texto:
            print(f"{args.salida} no está al día: ejecuta build_corpus sin --comprobar.")
            return EXIT_OUTDATED
        print(f"{args.salida} está al día ({resumen(fragmentos)}).")
        return EXIT_OK

    args.salida.parent.mkdir(parents=True, exist_ok=True)
    with args.salida.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(texto)
    print(f"Corpus escrito en {args.salida}: {resumen(fragmentos)}.")
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
