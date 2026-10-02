"""Contexto pedagógico que el frontend envía con cada mensaje al mentor.

Es el tipo `ContextoPedagogico` de PLAN §3 y de docs/api-contract.md, congelado desde F1-09. El
mismo tipo vive en `apps/web/src/stores/contextoPedagogico.ts`: cambiarlo exige actualizar
PLAN.md, la store Pinia y este esquema a la vez.

Viaja en `camelCase` (única excepción a `snake_case` de la API). Se valida aquí y desde F3-04 se
SERIALIZA: orienta la recuperación del material del curso (`app/rag/consulta.py`) y entra al prompt
como DATOS no fiables (`app/ai/prompt.py`), con las cadenas escapadas.
"""

from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.core.constants import MODULE_COUNT
from app.core.text import ensure_storable
from app.models.enums import Nivel, TipoActividad

# Longitud máxima de las cadenas del contexto y de la lista de interacciones (contrato).
MAX_CONTEXT_STRING_LENGTH = 64
MAX_RECENT_INTERACTIONS = 10
# Tope defensivo de la lista de logros (el catálogo actual tiene 6; los transversales de F5-04
# no llegarán ni a la mitad de esto). Evita que un cliente envíe listas enormes.
MAX_CONTEXT_ACHIEVEMENTS = 100

# Cadena corta sin caracteres que la base de datos o un JSON posterior no puedan manejar.
ShortText = Annotated[
    str, Field(max_length=MAX_CONTEXT_STRING_LENGTH), AfterValidator(ensure_storable)
]
ModuleNumber = Annotated[int, Field(ge=1, le=MODULE_COUNT)]


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ActividadActual(_CamelModel):
    id: ShortText
    tipo: TipoActividad
    intentos: int = Field(ge=0)
    completada: bool


class ProgresoContexto(_CamelModel):
    modulos_completados: list[ModuleNumber] = Field(max_length=MODULE_COUNT)
    puntaje_total: int = Field(ge=0)
    logros: list[ShortText] = Field(max_length=MAX_CONTEXT_ACHIEVEMENTS)


class ContextoPedagogico(_CamelModel):
    modulo: ModuleNumber
    seccion: ShortText
    actividad_actual: ActividadActual | None = None
    estructura_seleccionada: ShortText | None = None
    molecula_seleccionada: ShortText | None = None
    nivel: Nivel
    tiempo_en_seccion_seg: int = Field(ge=0)
    interacciones_recientes: list[ShortText] = Field(max_length=MAX_RECENT_INTERACTIONS)
    progreso: ProgresoContexto
