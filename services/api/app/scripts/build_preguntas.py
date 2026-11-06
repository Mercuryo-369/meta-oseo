"""Genera las preguntas abiertas (bloques `pregunta`) que usa la retroalimentación del mentor.

Uso (desde services/api):

    uv run python -m app.scripts.build_preguntas
    uv run python -m app.scripts.build_preguntas --contenido ruta/modulo.json --salida /tmp/p.json
    uv run python -m app.scripts.build_preguntas --comprobar

Sin argumentos lee `apps/web/src/modules/m{n}_{slug}/content.json` (ruta relativa a la raíz del
repositorio) y escribe `services/api/app/data/preguntas_abiertas.json`, que la API lee para
`POST /api/mentor/retroalimentacion` (ver `app/services/preguntas_abiertas.py`). Hay que volver a
ejecutarlo, y versionar el resultado, cada vez que cambie un bloque `pregunta` de los módulos.

- `--contenido` (repetible) usa esos archivos en lugar de la carpeta de módulos.
- `--salida` cambia el archivo de destino.
- `--comprobar` no escribe: sale con código 1 si el archivo de destino no coincide con el contenido
  (pensado para CI).

Códigos de salida: 0 = listo, 1 = el archivo está desactualizado (`--comprobar`),
2 = contenido inválido o no encontrado.
"""

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

from app.scripts.build_manifest import (
    EXIT_INVALID,
    EXIT_OK,
    EXIT_OUTDATED,
    MODULES_DIR,
    _use_utf8_output,
    discover_content_files,
    read_content,
)
from app.services.manifest import ManifestError
from app.services.preguntas_abiertas import (
    DEFAULT_PREGUNTAS_PATH,
    PreguntasError,
    build_preguntas,
    render_preguntas,
)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m app.scripts.build_preguntas",
        description="Genera las preguntas abiertas que usa la retroalimentación del mentor.",
    )
    parser.add_argument(
        "--contenido",
        action="append",
        type=Path,
        metavar="ARCHIVO",
        help="content.json de un módulo (repetible). Por defecto, los de apps/web/src/modules.",
    )
    parser.add_argument(
        "--salida",
        type=Path,
        default=DEFAULT_PREGUNTAS_PATH,
        help=f"Archivo de destino (por defecto {DEFAULT_PREGUNTAS_PATH}).",
    )
    parser.add_argument(
        "--comprobar",
        action="store_true",
        help="No escribe: falla si el archivo de destino no está al día.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    paths = args.contenido or discover_content_files()
    if not paths:
        print(
            f"No hay content.json en {MODULES_DIR} (se esperan carpetas m1_..., m6_...). "
            "Para probar con otro archivo usa --contenido.",
            file=sys.stderr,
        )
        return EXIT_INVALID
    try:
        preguntas = build_preguntas(read_content(path) for path in paths)
    except (ManifestError, PreguntasError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return EXIT_INVALID

    text = render_preguntas(preguntas)

    if args.comprobar:
        current = args.salida.read_text(encoding="utf-8") if args.salida.is_file() else None
        if current != text:
            print(f"{args.salida} no está al día: ejecuta build_preguntas sin --comprobar.")
            return EXIT_OUTDATED
        print(f"{args.salida} está al día.")
        return EXIT_OK

    args.salida.parent.mkdir(parents=True, exist_ok=True)
    # newline="\n": el archivo se versiona y debe ser idéntico en Windows y en Linux.
    with args.salida.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    modulos = sorted({p.modulo for p in preguntas.values()})
    print(
        f"Preguntas abiertas escritas en {args.salida}: {len(preguntas)} pregunta(s) "
        f"en {len(modulos)} módulo(s)" + (f" ({', '.join(map(str, modulos))})." if modulos else ".")
    )
    return EXIT_OK


if __name__ == "__main__":
    _use_utf8_output()
    sys.exit(main())
