"""Mentor de IA (docs/api-contract.md, "Mentor de IA").

- `POST /api/chat`: respuesta en streaming SSE, con recuperación del material del curso (F3-01 a
  F3-05), conversación guardada (F3-09) y límites por minuto y por día (F3-10).
- `GET /api/chat/history`, `DELETE /api/chat/session`: la conversación propia.
- `POST /api/chat/feedback`: valoración (pulgar arriba o abajo) de una respuesta (F3-11).
- `GET /api/mentor/refuerzo`: conceptos a repasar según el progreso, sin llamar al modelo (F3-07).
- `POST /api/mentor/quiz`: quiz de práctica de 3 preguntas con salida estructurada (F4-03).
"""

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import APIRouter, FastAPI, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.engine import Engine

from app.ai import sse, store
from app.ai.client import build_request, get_client
from app.ai.errors import (
    daily_limit_reached,
    ia_not_configured,
    message_not_found,
    quiz_daily_limit_reached,
    quiz_failed,
    quiz_without_material,
    session_not_found,
)
from app.ai.mentor import MentorChat, stream_chat
from app.ai.prompt import citas_de, etiquetar
from app.ai.quiz import (
    QuizFallido,
    build_quiz_request,
    etiquetar_material,
    generar_quiz,
    mezclar_opciones,
    seleccionar_material,
)
from app.ai.usage import USAGE_KIND_QUIZ, Usage, record_usage
from app.core.clock import utcnow
from app.core.constants import (
    CHAT_DAY_UTC_OFFSET_HOURS,
    CHAT_HISTORY_DEFAULT_LIMIT,
    CHAT_HISTORY_MAX_LIMIT,
    MODULE_COUNT,
)
from app.core.db import SessionDep
from app.core.errors import ErrorResponse
from app.core.rate_limit import enforce_limit
from app.core.security import CurrentUser
from app.core.settings import Settings, SettingsDep
from app.models.enums import Nivel
from app.rag.carga import construir_retriever, obtener_retriever
from app.rag.consulta import consulta_desde_conversacion
from app.schemas.chat import (
    ChatRequest,
    Cita,
    FeedbackRequest,
    FeedbackResponse,
    HistoryMessage,
    HistoryResponse,
)
from app.schemas.mentor import QuizRequest, QuizResponse, RefuerzoResponse
from app.services import progress as progress_service
from app.services import refuerzo
from app.services.manifest import ManifestDep

logger = logging.getLogger("ova.mentor")


@asynccontextmanager
async def _mentor_lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Al arrancar carga el corpus del mentor (una vez); al apagar cierra el cliente de IA."""
    if getattr(app.state, "retriever", None) is None:
        app.state.retriever = construir_retriever(app.state.settings)
    try:
        yield
    finally:
        client = getattr(app.state, "anthropic_client", None)
        if client is not None:
            await client.close()


# FastAPI encadena el `lifespan` de un router incluido con el de la app.
router = APIRouter(prefix="/api", tags=["mentor"], lifespan=_mentor_lifespan)

_SSE_RESPONSE = {
    200: {
        "description": (
            "Stream SSE. Eventos `sesion`, `text`, `citas`, `mensaje`, `usage` y un único evento "
            "terminal `done` o `error` (ver docs/api-contract.md)."
        ),
        "content": {"text/event-stream": {"schema": {"type": "string"}}},
    },
    401: {"model": ErrorResponse, "description": "`token_invalido`"},
    404: {"model": ErrorResponse, "description": "`sesion_no_encontrada`"},
    429: {"model": ErrorResponse, "description": "`demasiados_intentos` o `limite_diario`"},
    503: {"model": ErrorResponse, "description": "`ia_no_configurada`"},
}


async def _enforce_daily_limit(engine: Engine, settings: Settings, user_id: int) -> None:
    """429 `limite_diario` si el estudiante ya agotó `MENTOR_MAX_MENSAJES_DIA` (0 = sin límite)."""
    limit = settings.mentor_max_mensajes_dia
    if limit <= 0:
        return
    now = utcnow()
    used = await asyncio.to_thread(
        store.count_messages_today, engine, user_id, now, CHAT_DAY_UTC_OFFSET_HOURS
    )
    if used >= limit:
        raise daily_limit_reached(
            limit, store.seconds_until_next_day(now, CHAT_DAY_UTC_OFFSET_HOURS)
        )


@router.post(
    "/chat",
    response_class=StreamingResponse,
    responses=_SSE_RESPONSE,
    summary="Conversar con el mentor de IA (streaming SSE)",
)
async def chat(
    body: ChatRequest,
    request: Request,
    user: CurrentUser,
    session: SessionDep,
    settings: SettingsDep,
) -> StreamingResponse:
    assert user.id is not None
    user_id = user.id
    engine = request.app.state.engine

    # Estas comprobaciones van ANTES de abrir el stream: así son un 503/429/404 normales. El límite
    # diario va antes que el de por minuto para que un día agotado no gaste cupo por minuto.
    if not settings.anthropic_configured:
        raise ia_not_configured()
    await _enforce_daily_limit(engine, settings, user_id)
    enforce_limit(request.app.state.chat_limiter, f"user:{user_id}")

    contexto = body.contexto
    turn = await asyncio.to_thread(
        store.prepare_turn,
        engine,
        user_id,
        body.session_id,
        contexto.modulo if contexto else None,
        body.messages[-1].content,
    )
    if turn is None:
        raise session_not_found()

    # Recuperación del material del curso (BM25 en memoria, pocos milisegundos).
    consulta = consulta_desde_conversacion(
        [m.content for m in body.messages if m.role == "user"],
        k=settings.mentor_rag_top_k,
        modulo=contexto.modulo if contexto else None,
        seccion=contexto.seccion if contexto else None,
        estructura=contexto.estructura_seleccionada if contexto else None,
        molecula=contexto.molecula_seleccionada if contexto else None,
    )
    resultados = obtener_retriever(request.app).buscar(consulta)
    material = etiquetar([r.fragmento for r in resultados])

    client = get_client(request)
    chat_run = MentorChat(
        client=client,
        request=build_request(settings, body.messages, contexto=contexto, material=material),
        engine=engine,
        user_id=user_id,
        session_id=turn.session_id,
        citas=citas_de(material),
    )

    # `get_current_user` dejó una transacción abierta en `session`. Sin esto, una conexión del
    # pool quedaría ocupada (idle in transaction en PostgreSQL) durante todo el stream.
    await asyncio.to_thread(session.close)

    return StreamingResponse(
        stream_chat(chat_run, ping_interval=sse.PING_INTERVAL_SECONDS),
        media_type=sse.SSE_MEDIA_TYPE,
        headers=sse.SSE_HEADERS,
    )


@router.get(
    "/chat/history",
    response_model=HistoryResponse,
    summary="Últimos mensajes de una conversación propia",
    responses={
        401: {"model": ErrorResponse, "description": "`token_invalido`"},
        404: {"model": ErrorResponse, "description": "`sesion_no_encontrada`"},
    },
)
def chat_history(
    user: CurrentUser,
    session: SessionDep,
    session_id: Annotated[int | None, Query(ge=1)] = None,
    limit: Annotated[int, Query(ge=1, le=CHAT_HISTORY_MAX_LIMIT)] = CHAT_HISTORY_DEFAULT_LIMIT,
) -> HistoryResponse:
    """Sin `session_id` devuelve la conversación más reciente del usuario (o una lista vacía)."""
    assert user.id is not None
    if session_id is None:
        session_id = store.latest_session_id(session, user.id)
        if session_id is None:
            return HistoryResponse(session_id=None, messages=[])
    found = store.history(session, user.id, session_id, limit)
    if found is None:
        raise session_not_found()
    chat_session, rows = found
    return HistoryResponse(
        session_id=chat_session.id,
        messages=[
            HistoryMessage(
                id=row.id,
                role=row.role,
                content=row.content,
                citas=[Cita.model_validate(c) for c in store.parse_citas(row.citas)],
                valoracion=row.valoracion,
                created_at=row.created_at,
            )
            for row in rows
        ],
    )


def _delete_session(user: CurrentUser, session: SessionDep, session_id: int) -> Response:
    assert user.id is not None
    if not store.delete_session(session, user.id, session_id):
        raise session_not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/chat/session",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Borrar una conversación propia",
    responses={404: {"model": ErrorResponse, "description": "`sesion_no_encontrada`"}},
)
def delete_chat_session(
    user: CurrentUser, session: SessionDep, session_id: Annotated[int, Query(ge=1)]
) -> Response:
    return _delete_session(user, session, session_id)


@router.delete(
    "/chat/session/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Borrar una conversación propia (id en la ruta)",
    responses={404: {"model": ErrorResponse, "description": "`sesion_no_encontrada`"}},
)
def delete_chat_session_by_path(
    user: CurrentUser, session: SessionDep, session_id: int
) -> Response:
    return _delete_session(user, session, session_id)


@router.post(
    "/chat/feedback",
    response_model=FeedbackResponse,
    summary="Valorar una respuesta del mentor (1 = útil, -1 = no útil, 0 la retira)",
    responses={
        401: {"model": ErrorResponse, "description": "`token_invalido`"},
        404: {"model": ErrorResponse, "description": "`mensaje_no_encontrado`"},
    },
)
def chat_feedback(
    body: FeedbackRequest, user: CurrentUser, session: SessionDep
) -> FeedbackResponse:
    assert user.id is not None
    if not store.set_feedback(session, user.id, body.message_id, body.valor):
        raise message_not_found()
    return FeedbackResponse(message_id=body.message_id, valor=body.valor or None)


# --- Sugerencias de refuerzo (F3-07) -----------------------------------------------------------


@router.get(
    "/mentor/refuerzo",
    response_model=RefuerzoResponse,
    summary="Conceptos que conviene repasar, según el progreso (sin llamar al modelo)",
    responses={401: {"model": ErrorResponse, "description": "`token_invalido`"}},
)
def mentor_refuerzo(
    user: CurrentUser,
    session: SessionDep,
    manifest: ManifestDep,
    modulo: Annotated[int | None, Query(ge=1, le=MODULE_COUNT)] = None,
    limite: Annotated[int, Query(ge=1, le=refuerzo.LIMITE_MAXIMO)] = refuerzo.LIMITE_POR_DEFECTO,
) -> RefuerzoResponse:
    """Lista priorizada (vacía si no hay señal o si el servidor no tiene el contenido)."""
    assert user.id is not None
    if manifest is None:
        return RefuerzoResponse(sugerencias=[])
    resultados = progress_service.list_activity_results(session, user.id)
    iniciados, completados = refuerzo.modulos_del_estudiante(session, user.id, resultados)
    return RefuerzoResponse(
        sugerencias=refuerzo.calcular_sugerencias(
            manifest,
            resultados,
            modulos_iniciados=iniciados,
            modulos_completados=completados,
            modulo=modulo,
            limite=limite,
        )
    )


# --- Quiz de práctica (F4-03) ------------------------------------------------------------------

_QUIZ_RESPONSES = {
    401: {"model": ErrorResponse, "description": "`token_invalido`"},
    422: {
        "model": ErrorResponse,
        "description": "Validación (formato de FastAPI) o `material_insuficiente`.",
    },
    429: {"model": ErrorResponse, "description": "`demasiados_intentos` o `limite_diario_quiz`"},
    502: {"model": ErrorResponse, "description": "`quiz_invalido` o `ia_error`"},
    503: {"model": ErrorResponse, "description": "`ia_no_configurada`"},
}


async def _enforce_quiz_daily_limit(engine: Engine, settings: Settings, user_id: int) -> None:
    """429 `limite_diario_quiz` si ya agotó `MENTOR_MAX_QUIZ_DIA` (0 = sin límite)."""
    limit = settings.mentor_max_quiz_dia
    if limit <= 0:
        return
    now = utcnow()
    used = await asyncio.to_thread(
        store.count_usage_today, engine, user_id, USAGE_KIND_QUIZ, now, CHAT_DAY_UTC_OFFSET_HOURS
    )
    if used >= limit:
        raise quiz_daily_limit_reached(
            limit, store.seconds_until_next_day(now, CHAT_DAY_UTC_OFFSET_HOURS)
        )


async def _record_quiz_usage(engine: Engine, user_id: int, model: str, usage: Usage) -> None:
    """UNA fila `quiz` por petición (suma de sus llamadas): es lo que cuenta la cuota diaria."""
    try:
        await asyncio.shield(
            asyncio.to_thread(record_usage, engine, user_id, model, usage, USAGE_KIND_QUIZ)
        )
    except Exception:
        logger.exception("No se pudo registrar el consumo del quiz en usage_events")


@router.post(
    "/mentor/quiz",
    response_model=QuizResponse,
    responses=_QUIZ_RESPONSES,
    summary="Quiz de práctica de 3 preguntas sobre la sección o el concepto actual",
)
async def mentor_quiz(
    body: QuizRequest,
    request: Request,
    user: CurrentUser,
    session: SessionDep,
    settings: SettingsDep,
) -> QuizResponse:
    assert user.id is not None
    user_id = user.id
    engine = request.app.state.engine

    # Antes de gastar nada: 503 sin clave, cuota diaria propia y límite por minuto (el mismo que
    # el del chat, así que preguntar y practicar comparten ese cupo).
    if not settings.anthropic_configured:
        raise ia_not_configured()
    await _enforce_quiz_daily_limit(engine, settings, user_id)
    enforce_limit(request.app.state.chat_limiter, f"user:{user_id}")

    contexto = body.contexto
    modulo = body.modulo if body.modulo is not None else (contexto.modulo if contexto else None)
    if body.seccion is not None:
        seccion: str | None = body.seccion
    elif contexto is not None and body.modulo in (None, contexto.modulo):
        seccion = contexto.seccion if contexto.seccion != "inicio" else None
    else:
        seccion = None
    nivel = contexto.nivel if contexto else Nivel.pregrado
    material = seleccionar_material(
        obtener_retriever(request.app),
        modulo=modulo,
        seccion=seccion,
        tema=body.tema,
        nivel=nivel,
        estructura=contexto.estructura_seleccionada if contexto else None,
        molecula=contexto.molecula_seleccionada if contexto else None,
    )
    if not material.fragmentos:
        raise quiz_without_material()
    etiquetados, etiquetas, citas = etiquetar_material(material.fragmentos)

    quiz_request = build_quiz_request(settings, contexto, etiquetados, body.tema)
    # `get_current_user` dejó una transacción abierta: se cierra antes de la espera larga.
    await asyncio.to_thread(session.close)

    try:
        generado = await generar_quiz(get_client(request), quiz_request, etiquetas)
    except QuizFallido as fallo:
        if fallo.model is not None:
            await _record_quiz_usage(engine, user_id, fallo.model, fallo.usage)
        raise quiz_failed(status.HTTP_502_BAD_GATEWAY, fallo.code, fallo.message) from fallo
    await _record_quiz_usage(engine, user_id, generado.model, generado.usage)

    return QuizResponse(
        modulo=modulo,
        seccion=seccion,
        tema=material.tema,
        preguntas=mezclar_opciones(generado.preguntas),
        fuentes=[Cita.model_validate(c) for c in citas],
    )
