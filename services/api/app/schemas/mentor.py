"""Esquemas de las funciones del mentor: sugerencias de refuerzo y quiz de práctica (F3-07 y F4-03).

Ambos endpoints viven en `app/routers/mentor.py` (docs/api-contract.md, "Mentor de IA").
"""

from typing import Annotated, Literal, Self

from pydantic import AfterValidator, BaseModel, Field, model_validator

from app.core.text import ensure_storable
from app.schemas.chat import Cita
from app.schemas.contexto import MAX_CONTEXT_STRING_LENGTH, ContextoPedagogico, ModuleNumber

# --- Refuerzo ----------------------------------------------------------------------------------

Prioridad = Literal["alta", "media", "baja"]
MotivoTipo = Literal["atascada", "precision_baja", "en_curso", "varios_intentos", "pendiente"]


class RefuerzoSugerencia(BaseModel):
    """Un concepto que conviene repasar, con el porqué y dónde verlo."""

    actividad_id: str
    concepto: str
    modulo: int
    seccion: str
    seccion_titulo: str
    # Enlace interno del frontend (`/modulo/3?s=m3_4_osteocito_sensor`).
    url: str
    motivo_tipo: MotivoTipo
    # Frase en lenguaje claro para el estudiante ("Necesitaste 4 intentos para completarla").
    motivo: str
    prioridad: Prioridad
    # Puntaje interno con el que se ordenó (0 a 100; mayor = más urgente).
    puntaje: int


class RefuerzoResponse(BaseModel):
    """Vacía cuando no hay nada que reforzar (la interfaz no muestra la tarjeta)."""

    sugerencias: list[RefuerzoSugerencia]


# --- Quiz de práctica --------------------------------------------------------------------------

MAX_TEMA_CHARS = 120
QUIZ_QUESTIONS = 3
QUIZ_OPTIONS = 4

Dificultad = Literal["basica", "intermedia", "avanzada"]
DIFICULTADES: tuple[str, ...] = ("basica", "intermedia", "avanzada")

PlainText = Annotated[str, AfterValidator(ensure_storable)]


class QuizRequest(BaseModel):
    """Qué evaluar: el tema escrito o, si no, la sección y la estructura del contexto."""

    # Concepto o tema libre (por ejemplo el `concepto` de una sugerencia de refuerzo).
    tema: PlainText | None = Field(default=None, max_length=MAX_TEMA_CHARS)
    # Módulo y sección sobre los que preguntar, si no son los del contexto (por ejemplo los de una
    # sugerencia de refuerzo). Sin ellos se usan los del contexto pedagógico.
    modulo: ModuleNumber | None = None
    seccion: (
        Annotated[PlainText, Field(min_length=1, max_length=MAX_CONTEXT_STRING_LENGTH)] | None
    ) = None
    contexto: ContextoPedagogico | None = None

    @model_validator(mode="after")
    def _has_something_to_ask_about(self) -> Self:
        if self.tema is not None:
            self.tema = " ".join(self.tema.split()) or None
        if self.tema is None and self.contexto is None and self.modulo is None:
            raise ValueError("Indica un tema, un módulo o el contexto pedagógico para el quiz.")
        if self.seccion is not None and self.modulo is None and self.contexto is None:
            raise ValueError("Para indicar una sección hace falta el módulo o el contexto.")
        return self


class QuizOpcion(BaseModel):
    texto: str


class QuizPregunta(BaseModel):
    id: int
    enunciado: str
    opciones: list[QuizOpcion]
    # Posición (empezando en 0) de la opción correcta. El quiz es práctica libre: no puntúa.
    correcta: int
    explicacion: str
    dificultad: Dificultad
    # Etiquetas ("1", "2"...) de las fuentes de `QuizResponse.fuentes` en las que se apoya.
    fuentes: list[str]


class QuizResponse(BaseModel):
    modulo: int | None
    seccion: str | None
    tema: str
    preguntas: list[QuizPregunta]
    # Fuentes del curso (mismo formato que las citas del chat); la de etiqueta `n` es la posición n.
    fuentes: list[Cita]
    # Siempre `false`: el quiz de práctica no otorga puntos ni logros.
    otorga_puntos: bool = False
