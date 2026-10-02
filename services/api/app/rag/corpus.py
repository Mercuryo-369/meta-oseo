"""Corpus del mentor: los fragmentos del material del curso sobre los que se recupera (F3-01).

`app/data/corpus.jsonl` lo genera `python -m app.scripts.build_corpus` a partir de los
`content.json` de los módulos y de las secciones del mentor de `docs/guion-por-modulo/`. Se
versiona (la imagen de la API no trae `apps/` ni `docs/`). Una línea por fragmento:

    {"id": "m3:m3_4_osteocito_sensor:t_flujo", "modulo": 3, "seccion_id": "m3_4_osteocito_sensor",
     "seccion_titulo": "El osteocito, un sensor", "tipo": "contenido", "nivel": "todos",
     "subtitulo": "Flujo de líquido", "texto": "...",
     "url": "/modulo/3?s=m3_4_osteocito_sensor", "refs": ["m3:t_flujo"]}

Tipos:

- `contenido`, `glosario`, `objetivos`: texto que el estudiante puede leer en el OVA. Se pueden
  citar con un enlace.
- `banco`, `gancho`: material del docente PARA el mentor (preguntas de refuerzo con su respuesta,
  conceptos clave, errores frecuentes). Informan la respuesta, pero el estudiante no las ve: no se
  citan. Ninguna pregunta ni respuesta de las actividades calificadas entra al corpus.
"""

import json
import logging
from collections.abc import Iterable
from dataclasses import asdict, dataclass, field
from pathlib import Path

logger = logging.getLogger("ova.rag")

TIPO_CONTENIDO = "contenido"
TIPO_GLOSARIO = "glosario"
TIPO_OBJETIVOS = "objetivos"
TIPO_BANCO = "banco"
TIPO_GANCHO = "gancho"
TIPOS = (TIPO_CONTENIDO, TIPO_GLOSARIO, TIPO_OBJETIVOS, TIPO_BANCO, TIPO_GANCHO)
# Lo que el estudiante puede leer en el OVA (y por lo tanto se cita con un enlace).
TIPOS_CITABLES = frozenset({TIPO_CONTENIDO, TIPO_GLOSARIO, TIPO_OBJETIVOS})

NIVEL_TODOS = "todos"
NIVEL_POSGRADO = "posgrado"


class CorpusError(ValueError):
    """El corpus no se puede leer o tiene un fragmento mal formado."""


@dataclass(frozen=True, slots=True)
class Fragmento:
    id: str
    modulo: int
    seccion_id: str | None
    seccion_titulo: str
    tipo: str
    texto: str
    url: str
    nivel: str = NIVEL_TODOS
    # Título del tema del fragmento (p. ej. «La balanza RANKL/OPG»), si lo tiene. Distingue las
    # fuentes de una misma sección en la lista de citas.
    subtitulo: str = ""
    # Identificadores de lo que cubre el fragmento (`m3:t_flujo` para un bloque, `m3:glosario:x`,
    # `m3:banco:4`...). Sirven para evaluar la recuperación sin depender de dónde caiga el corte.
    refs: tuple[str, ...] = field(default_factory=tuple)

    @property
    def citable(self) -> bool:
        return self.tipo in TIPOS_CITABLES

    def to_json(self) -> dict:
        data = asdict(self)
        data["refs"] = list(self.refs)
        return data

    @classmethod
    def from_json(cls, data: dict) -> "Fragmento":
        try:
            fragmento = cls(
                id=str(data["id"]),
                modulo=int(data["modulo"]),
                seccion_id=data["seccion_id"],
                seccion_titulo=str(data["seccion_titulo"]),
                tipo=str(data["tipo"]),
                texto=str(data["texto"]),
                url=str(data["url"]),
                nivel=str(data.get("nivel", NIVEL_TODOS)),
                subtitulo=str(data.get("subtitulo", "")),
                refs=tuple(str(ref) for ref in data.get("refs", ())),
            )
        except (KeyError, TypeError, ValueError) as error:
            raise CorpusError(f"Fragmento mal formado: {error!r}") from error
        if fragmento.tipo not in TIPOS:
            raise CorpusError(f"Tipo de fragmento desconocido: {fragmento.tipo!r}")
        if not fragmento.texto.strip():
            raise CorpusError(f"El fragmento {fragmento.id!r} no tiene texto.")
        return fragmento


def serializar(fragmentos: Iterable[Fragmento]) -> str:
    """Texto del archivo JSONL: una línea por fragmento, determinista (se versiona)."""
    lineas = [json.dumps(f.to_json(), ensure_ascii=False) for f in fragmentos]
    return "\n".join(lineas) + "\n" if lineas else ""


def cargar(ruta: Path) -> list[Fragmento]:
    """Lee el corpus. Lanza `CorpusError` si falta el archivo o una línea no es válida."""
    try:
        contenido = ruta.read_text(encoding="utf-8")
    except OSError as error:
        raise CorpusError(f"No se pudo leer el corpus {ruta}: {error}") from error
    fragmentos: list[Fragmento] = []
    vistos: set[str] = set()
    for numero, linea in enumerate(contenido.splitlines(), start=1):
        if not linea.strip():
            continue
        try:
            datos = json.loads(linea)
        except ValueError as error:
            raise CorpusError(f"{ruta}, línea {numero}: JSON inválido ({error})") from error
        fragmento = Fragmento.from_json(datos)
        if fragmento.id in vistos:
            raise CorpusError(f"{ruta}, línea {numero}: id repetido {fragmento.id!r}")
        vistos.add(fragmento.id)
        fragmentos.append(fragmento)
    return fragmentos
