"""Persistencia del mentor: conversaciones, mensajes, valoraciones y límite diario (F3-09 a F3-11).

Todas las funciones son SÍNCRONAS y abren su propia sesión sobre el motor: desde código asíncrono
se llaman con `asyncio.to_thread` (la sesión de la petición se cierra antes de abrir el stream).

Aislamiento entre usuarios: TODA consulta lleva el `user_id` del token. Una sesión o un mensaje
ajeno responde igual que uno inexistente (`None`), para no revelar que existe.
"""

import json
import math
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete, func
from sqlalchemy.engine import Engine
from sqlmodel import Session, col, select

from app.ai.usage import USAGE_KIND_CHAT, Usage
from app.core.clock import utcnow
from app.models.chat import ChatMessage, ChatSession
from app.models.usage import UsageEvent

ROLE_USER = "user"
ROLE_ASSISTANT = "assistant"


# --- Límite diario -----------------------------------------------------------------------------


def day_start_utc(now: datetime, offset_hours: int) -> datetime:
    """Inicio (en UTC) del día local de `now`; `offset_hours` es la zona (Colombia: -5)."""
    offset = timedelta(hours=offset_hours)
    local = now.astimezone(UTC) + offset
    return local.replace(hour=0, minute=0, second=0, microsecond=0) - offset


def seconds_until_next_day(now: datetime, offset_hours: int) -> int:
    """Segundos que faltan para que empiece el siguiente día local (para `Retry-After`)."""
    siguiente = day_start_utc(now, offset_hours) + timedelta(days=1)
    return max(1, math.ceil((siguiente - now.astimezone(UTC)).total_seconds()))


def count_usage_today(
    engine: Engine, user_id: int, kind: str, now: datetime, offset_hours: int
) -> int:
    """Consultas del usuario de esa clase (`chat`, `quiz`) que hoy consumieron al modelo.

    Se cuentan las filas de `usage_events` (una por petición que Anthropic empezó a atender) y no
    los mensajes guardados: así borrar una conversación no devuelve el cupo, y las peticiones que
    fallaron antes de llegar al modelo tampoco lo gastan.
    """
    with Session(engine) as session:
        total = session.exec(
            select(func.count())
            .select_from(UsageEvent)
            .where(
                UsageEvent.user_id == user_id,
                UsageEvent.kind == kind,
                UsageEvent.created_at >= day_start_utc(now, offset_hours),
            )
        ).one()
    return int(total)


def count_messages_today(engine: Engine, user_id: int, now: datetime, offset_hours: int) -> int:
    """Mensajes del usuario al mentor que hoy consumieron al modelo (límite diario del chat)."""
    return count_usage_today(engine, user_id, USAGE_KIND_CHAT, now, offset_hours)


# --- Conversación ------------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Turn:
    """La conversación y el mensaje del estudiante ya guardados para esta petición."""

    session_id: int
    user_message_id: int


def prepare_turn(
    engine: Engine,
    user_id: int,
    session_id: int | None,
    modulo: int | None,
    user_text: str,
) -> Turn | None:
    """Guarda el mensaje del estudiante (abriendo la conversación si hace falta).

    Devuelve `None` si `session_id` no existe o no es del usuario.

    Un reintento (el mismo texto, sin respuesta del mentor en medio) reutiliza el mensaje ya
    guardado en lugar de duplicarlo.
    """
    with Session(engine) as session:
        if session_id is None:
            chat_session = ChatSession(user_id=user_id, modulo=modulo)
            session.add(chat_session)
            session.flush()
        else:
            chat_session = session.exec(
                select(ChatSession).where(
                    ChatSession.id == session_id, ChatSession.user_id == user_id
                )
            ).first()
            if chat_session is None:
                return None
        assert chat_session.id is not None

        last = session.exec(
            select(ChatMessage)
            .where(ChatMessage.session_id == chat_session.id)
            .order_by(col(ChatMessage.id).desc())
            .limit(1)
        ).first()
        if last is not None and last.role == ROLE_USER and last.content == user_text:
            assert last.id is not None
            message_id = last.id
        else:
            message = ChatMessage(session_id=chat_session.id, role=ROLE_USER, content=user_text)
            session.add(message)
            session.flush()
            assert message.id is not None
            message_id = message.id
        chat_session.updated_at = utcnow()
        if modulo is not None:
            chat_session.modulo = modulo
        session.add(chat_session)
        session.commit()
        return Turn(session_id=chat_session.id, user_message_id=message_id)


def save_reply(
    engine: Engine,
    session_id: int,
    text: str,
    *,
    model: str,
    usage: Usage,
    citas: list[dict[str, Any]],
) -> int:
    """Guarda la respuesta del mentor con su modelo, sus tokens y sus citas. Devuelve su id."""
    with Session(engine) as session:
        message = ChatMessage(
            session_id=session_id,
            role=ROLE_ASSISTANT,
            content=text,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            model=model[:64],
            citas=json.dumps(citas, ensure_ascii=False) if citas else None,
        )
        session.add(message)
        chat_session = session.get(ChatSession, session_id)
        if chat_session is not None:  # la conversación pudo borrarse mientras se generaba
            chat_session.updated_at = utcnow()
            session.add(chat_session)
        session.commit()
        assert message.id is not None
        return message.id


# --- Historial, borrado y valoración -----------------------------------------------------------


def latest_session_id(session: Session, user_id: int) -> int | None:
    return session.exec(
        select(ChatSession.id)
        .where(ChatSession.user_id == user_id)
        .order_by(col(ChatSession.updated_at).desc(), col(ChatSession.id).desc())
        .limit(1)
    ).first()


def history(
    session: Session, user_id: int, session_id: int, limit: int
) -> tuple[ChatSession, list[ChatMessage]] | None:
    """Últimos `limit` mensajes (en orden cronológico) de una conversación del usuario."""
    chat_session = session.exec(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
    ).first()
    if chat_session is None:
        return None
    rows = session.exec(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(col(ChatMessage.id).desc())
        .limit(limit)
    ).all()
    return chat_session, list(reversed(rows))


def delete_session(session: Session, user_id: int, session_id: int) -> bool:
    """Borra la conversación y sus mensajes. `False` si no existe o no es del usuario."""
    chat_session = session.exec(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
    ).first()
    if chat_session is None:
        return False
    # Se borran los mensajes de forma explícita: no dependemos de que el motor aplique el CASCADE.
    session.exec(delete(ChatMessage).where(col(ChatMessage.session_id) == session_id))
    session.delete(chat_session)
    session.commit()
    return True


def set_feedback(session: Session, user_id: int, message_id: int, valor: int) -> bool:
    """Guarda (1, -1) o retira (0) la valoración de una respuesta del mentor del propio usuario."""
    message = session.exec(
        select(ChatMessage)
        .join(ChatSession, col(ChatSession.id) == col(ChatMessage.session_id))
        .where(
            ChatMessage.id == message_id,
            ChatMessage.role == ROLE_ASSISTANT,
            ChatSession.user_id == user_id,
        )
    ).first()
    if message is None:
        return False
    message.valoracion = valor or None
    session.add(message)
    session.commit()
    return True


def parse_citas(raw: str | None) -> list[dict[str, Any]]:
    """Citas guardadas con un mensaje (lista vacía si no hay o el JSON no sirve)."""
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except ValueError:
        return []
    return data if isinstance(data, list) else []
