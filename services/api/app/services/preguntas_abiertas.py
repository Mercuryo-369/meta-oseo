"""Preguntas abiertas (bloques `pregunta`) que el servidor conoce para la retroalimentación con IA.

El contenido vive en `apps/web/src/modules/m{n}_{slug}/content.json`, que la imagen de la API no
trae. El script `python -m app.scripts.build_preguntas` extrae de allí los bloques `pregunta`
(enunciado y respuesta del docente) y los escribe en `app/data/preguntas_abiertas.json`, que sí se
versiona y viaja en la imagen. Así el cliente solo envía el id de la pregunta: el enunciado y la
respuesta de referencia que llegan al modelo salen siempre del servidor.

Formato del archivo (versión 1):

    {
      "version": 1,
      "preguntas": {"preg_m4_1_ppi": {"modulo": 4, "seccion": "m4_1_mineralizacion_primaria",
                                      "titulo": "...", "enunciado": "...", "respuesta": "..."}}
    }

La carga es tolerante: si el archivo falta o no es válido se registra un aviso y no hay preguntas
(el endpoint responde `404 pregunta_no_encontrada`); la API arranca igual.
"""

import json
import logging
from collections.abc import Iterable, Mapping
from functools import cache
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.constants import MODULE_COUNT
from app.core.settings import API_DIR

logger = logging.getLogger(__name__)

PREGUNTAS_VERSION = 1
DEFAULT_PREGUNTAS_PATH = API_DIR / "app" / "data" / "preguntas_abiertas.json"


class PreguntasError(ValueError):
    """El contenido del que salen las preguntas, o el archivo generado, no es válido."""


class PreguntaAbierta(BaseModel):
    """Lo que el servidor necesita de un bloque `pregunta` para pedir la retroalimentación."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    modulo: int = Field(ge=1, le=MODULE_COUNT)
    seccion: str = Field(min_length=1)
    titulo: str = Field(min_length=1)
    enunciado: str = Field(min_length=1)
    respuesta: str = Field(min_length=1)


def build_preguntas(contents: Iterable[Mapping[str, Any]]) -> dict[str, PreguntaAbierta]:
    """Bloques `pregunta` de los módulos ya leídos, en el orden del contenido.

    Falla con `PreguntasError` si un id se repite entre módulos o si a un bloque le falta un campo.
    """
    preguntas: dict[str, PreguntaAbierta] = {}
    for content in contents:
        numero = content.get("numero")
        if not isinstance(numero, int) or not 1 <= numero <= MODULE_COUNT:
            raise PreguntasError(f"Módulo con número inválido: {numero!r} (debe ser 1 a 6).")
        for seccion in content.get("secciones", []):
            seccion_id = str(seccion.get("id", ""))
            for bloque in seccion.get("bloques", []):
                if bloque.get("tipo") != "pregunta":
                    continue
                bloque_id = str(bloque.get("id", ""))
                if not bloque_id:
                    raise PreguntasError(f"Un bloque `pregunta` de {seccion_id!r} no tiene id.")
                if bloque_id in preguntas:
                    raise PreguntasError(f"El id de pregunta {bloque_id!r} está repetido.")
                try:
                    preguntas[bloque_id] = PreguntaAbierta(
                        modulo=numero,
                        seccion=seccion_id,
                        titulo=str(bloque.get("titulo", "")).strip(),
                        enunciado=str(bloque.get("enunciado", "")).strip(),
                        respuesta=str(bloque.get("respuesta", "")).strip(),
                    )
                except ValidationError as error:
                    raise PreguntasError(
                        f"La pregunta {bloque_id!r} no es válida: {error}"
                    ) from error
    return preguntas


def render_preguntas(preguntas: Mapping[str, PreguntaAbierta]) -> str:
    """Texto exacto que se escribe en disco: JSON con sangría, UTF-8 sin escapar, LF final."""
    datos = {
        "version": PREGUNTAS_VERSION,
        "preguntas": {
            pregunta_id: pregunta.model_dump(mode="json")
            for pregunta_id, pregunta in preguntas.items()
        },
    }
    return json.dumps(datos, ensure_ascii=False, indent=2) + "\n"


def parse_preguntas(data: Mapping[str, Any]) -> dict[str, PreguntaAbierta]:
    """Valida el JSON generado. `PreguntasError` si algo no cuadra."""
    if data.get("version") != PREGUNTAS_VERSION:
        raise PreguntasError(
            f"Versión no soportada: {data.get('version')!r} (se esperaba {PREGUNTAS_VERSION})."
        )
    crudas = data.get("preguntas")
    if not isinstance(crudas, dict):
        raise PreguntasError("Falta el objeto `preguntas`.")
    preguntas: dict[str, PreguntaAbierta] = {}
    for pregunta_id, cruda in crudas.items():
        try:
            preguntas[pregunta_id] = PreguntaAbierta.model_validate(cruda)
        except ValidationError as error:
            raise PreguntasError(f"La pregunta {pregunta_id!r} no es válida: {error}") from error
    return preguntas


@cache
def cargar_preguntas(path: Path = DEFAULT_PREGUNTAS_PATH) -> dict[str, PreguntaAbierta]:
    """Preguntas del archivo generado (se lee una sola vez por ruta). Vacío si falta o no sirve."""
    if not path.is_file():
        logger.warning(
            "No hay preguntas abiertas en %s: la retroalimentación con IA no está disponible. "
            "Generarlas con `python -m app.scripts.build_preguntas`.",
            path,
        )
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise PreguntasError("El archivo debe ser un objeto JSON.")
        return parse_preguntas(data)
    except (OSError, ValueError) as error:
        logger.warning("No se pudieron cargar las preguntas abiertas de %s: %s", path, error)
        return {}


def obtener_pregunta(pregunta_id: str) -> PreguntaAbierta | None:
    """La pregunta con ese id, o `None` si el servidor no la conoce."""
    return cargar_preguntas().get(pregunta_id)
