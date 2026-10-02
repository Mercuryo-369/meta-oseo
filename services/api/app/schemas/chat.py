"""Esquemas del mentor: `POST /api/chat`, historial y valoración (docs/api-contract.md)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.core.text import ensure_storable
from app.schemas.contexto import ContextoPedagogico

MIN_MESSAGES = 1
MAX_MESSAGES = 40
MAX_MESSAGE_CHARS = 8000


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)

    @field_validator("content")
    @classmethod
    def _content_is_usable(cls, value: str) -> str:
        # U+0000 y sustitutos Unicode sueltos harían fallar la serialización hacia Anthropic
        # (500 en lugar de 422). Un mensaje solo de espacios lo rechazaría Anthropic con un 400.
        ensure_storable(value)
        if not value.strip():
            raise ValueError("El mensaje no puede estar vacío.")
        return value


class ChatRequest(BaseModel):
    """Historial de la conversación (el último mensaje es del usuario) y contexto pedagógico."""

    messages: list[ChatMessage] = Field(min_length=MIN_MESSAGES, max_length=MAX_MESSAGES)
    # Opcional. Se valida, se usa para recuperar el material del curso y va al prompt como DATOS.
    contexto: ContextoPedagogico | None = None
    # Conversación a la que pertenece el mensaje (la devuelve el evento SSE `sesion`). Sin ella se
    # abre una conversación nueva. Debe ser del propio usuario (si no, 404).
    session_id: int | None = Field(default=None, ge=1)

    @field_validator("messages")
    @classmethod
    def _last_message_is_from_user(cls, value: list[ChatMessage]) -> list[ChatMessage]:
        if value and value[-1].role != "user":
            raise ValueError("El último mensaje debe ser del usuario.")
        return value


class Cita(BaseModel):
    """Fuente que el mentor consultó y que el estudiante puede abrir (enlace interno)."""

    id: str
    modulo: int
    seccion_id: str | None = None
    titulo: str
    url: str


class HistoryMessage(BaseModel):
    id: int
    role: Literal["user", "assistant"]
    content: str
    citas: list[Cita] = []
    valoracion: Literal[-1, 1] | None = None
    created_at: datetime


class HistoryResponse(BaseModel):
    """Últimos mensajes de una conversación, en orden cronológico."""

    session_id: int | None
    messages: list[HistoryMessage]


class FeedbackRequest(BaseModel):
    """Valoración de una respuesta del mentor: 1 (👍), -1 (👎) o 0 para retirarla."""

    message_id: int = Field(ge=1)
    valor: Literal[-1, 0, 1]


class FeedbackResponse(BaseModel):
    message_id: int
    valor: Literal[-1, 1] | None
