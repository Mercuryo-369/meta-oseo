"""Consumo de tokens del mentor: lectura desde Anthropic y registro en `usage_events`."""

from dataclasses import dataclass
from typing import Any

from sqlalchemy.engine import Engine
from sqlmodel import Session

from app.models.usage import UsageEvent

USAGE_KIND_CHAT = "chat"
USAGE_KIND_QUIZ = "quiz"
_MODEL_MAX_LENGTH = 64  # columna `usage_events.model`


@dataclass(frozen=True, slots=True)
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_input_tokens: int = 0
    cache_creation_input_tokens: int = 0

    @classmethod
    def from_message(cls, message: Any) -> "Usage":
        """Lee el uso del mensaje acumulado por el SDK. Los contadores ausentes valen 0."""
        usage = message.usage
        return cls(
            input_tokens=usage.input_tokens or 0,
            output_tokens=usage.output_tokens or 0,
            cache_read_input_tokens=usage.cache_read_input_tokens or 0,
            cache_creation_input_tokens=usage.cache_creation_input_tokens or 0,
        )

    def __add__(self, other: "Usage") -> "Usage":
        """Suma de consumos (un quiz puede necesitar más de una llamada al modelo)."""
        return Usage(
            input_tokens=self.input_tokens + other.input_tokens,
            output_tokens=self.output_tokens + other.output_tokens,
            cache_read_input_tokens=self.cache_read_input_tokens + other.cache_read_input_tokens,
            cache_creation_input_tokens=(
                self.cache_creation_input_tokens + other.cache_creation_input_tokens
            ),
        )

    def as_payload(self) -> dict[str, int]:
        """Carga del evento SSE `usage` (nombres del contrato)."""
        return {
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cache_read_input_tokens": self.cache_read_input_tokens,
            "cache_creation_input_tokens": self.cache_creation_input_tokens,
        }


def record_usage(
    engine: Engine, user_id: int, model: str, usage: Usage, kind: str = USAGE_KIND_CHAT
) -> None:
    """Guarda una fila de `usage_events` (control de costo). Es síncrona: se llama en un hilo."""
    with Session(engine) as session:
        session.add(
            UsageEvent(
                user_id=user_id,
                kind=kind,
                model=model[:_MODEL_MAX_LENGTH],
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                cache_read_tokens=usage.cache_read_input_tokens,
                cache_creation_tokens=usage.cache_creation_input_tokens,
            )
        )
        session.commit()
