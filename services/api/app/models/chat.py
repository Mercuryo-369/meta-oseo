from datetime import datetime

from sqlalchemy import SmallInteger, String, Text
from sqlmodel import Field, SQLModel

from app.core.clock import utcnow
from app.models.types import UTCDateTime


class ChatSession(SQLModel, table=True):
    """Conversación con el mentor (F3-09): una por cada «nueva conversación» del estudiante."""

    __tablename__ = "chat_sessions"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    modulo: int | None = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
    updated_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)


class ChatMessage(SQLModel, table=True):
    """Mensaje de una sesión (F3-09). Los del mentor llevan modelo, tokens, citas y valoración.

    - `input_tokens` y `output_tokens`: los de la petición que produjo la respuesta, tal como los
      informa Anthropic (`input_tokens` no incluye lo leído ni lo escrito en el caché de prompt;
      eso está en `usage_events`).
    - `citas`: JSON con las citas mostradas al estudiante (`[{id, modulo, seccion_id, titulo,
      url}]`), para volver a mostrarlas al recuperar el historial.
    - `valoracion` (F3-11): 1 (me sirvió) o -1 (no me sirvió); nulo si no votó.
    """

    __tablename__ = "chat_messages"

    id: int | None = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="chat_sessions.id", ondelete="CASCADE", index=True)
    role: str = Field(sa_type=String(16))  # user | assistant
    content: str = Field(sa_type=Text)
    input_tokens: int | None = Field(default=None)
    output_tokens: int | None = Field(default=None)
    model: str | None = Field(default=None, sa_type=String(64))
    citas: str | None = Field(default=None, sa_type=Text)
    valoracion: int | None = Field(default=None, sa_type=SmallInteger)
    created_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
