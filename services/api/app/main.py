"""Punto de entrada de la API del OVA.

Arranque: `uv run uvicorn app.main:app --reload` (antes, `uv run alembic upgrade head`).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.engine import Engine
from sqlmodel import Session

from app import __version__
from app.core.constants import (
    AUTH_RATE_LIMIT_ATTEMPTS,
    AUTH_RATE_LIMIT_WINDOW_SECONDS,
    CHAT_RATE_LIMIT_REQUESTS,
    CHAT_RATE_LIMIT_WINDOW_SECONDS,
    PDF_RATE_LIMIT_REQUESTS,
    PDF_RATE_LIMIT_WINDOW_SECONDS,
    VERIFY_RATE_LIMIT_ATTEMPTS,
    VERIFY_RATE_LIMIT_WINDOW_SECONDS,
)
from app.core.db import build_engine, ensure_schema
from app.core.errors import validation_error_handler
from app.core.rate_limit import SlidingWindowLimiter
from app.core.settings import Settings, get_settings
from app.routers import auth, certificate, gamification, health, mentor, progress, teacher
from app.services.achievements import seed_achievements
from app.services.manifest import load_configured_manifest

# Routers de la API, en una lista explícita: sumar uno nuevo es agregar UNA línea aquí.
ROUTERS: list[APIRouter] = [
    health.router,
    auth.router,
    progress.router,
    gamification.router,
    mentor.router,
    teacher.router,
    certificate.router,
]


def create_app(settings: Settings | None = None, engine: Engine | None = None) -> FastAPI:
    """Fábrica de la aplicación. En pruebas se pasan `settings` y `engine` propios.

    Si `engine` viene de fuera, la app no lo cierra al apagarse (lo gestiona quien lo creó).
    """
    settings = settings or get_settings()
    owns_engine = engine is None
    engine = engine or build_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        ensure_schema(engine)
        with Session(engine) as session:
            seed_achievements(session)
        try:
            yield
        finally:
            if owns_engine:
                engine.dispose()

    # La documentación interactiva no se expone en producción.
    docs_enabled = not settings.is_prod
    app = FastAPI(
        title="OVA Metabolismo óseo — API",
        version=__version__,
        lifespan=lifespan,
        docs_url="/api/docs" if docs_enabled else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if docs_enabled else None,
    )

    app.state.settings = settings
    app.state.engine = engine
    # Manifiesto de actividades: si existe, los resultados y el progreso se validan contra él.
    app.state.manifest = load_configured_manifest(settings)
    app.state.auth_limiter = SlidingWindowLimiter(
        AUTH_RATE_LIMIT_ATTEMPTS, AUTH_RATE_LIMIT_WINDOW_SECONDS
    )
    # Cupo del mentor por usuario (lo usa el router de /api/chat, F1-07).
    app.state.chat_limiter = SlidingWindowLimiter(
        CHAT_RATE_LIMIT_REQUESTS, CHAT_RATE_LIMIT_WINDOW_SECONDS
    )
    # Certificado (F5-05): verificación pública por IP y descarga del PDF por usuario.
    app.state.verify_limiter = SlidingWindowLimiter(
        VERIFY_RATE_LIMIT_ATTEMPTS, VERIFY_RATE_LIMIT_WINDOW_SECONDS
    )
    app.state.pdf_limiter = SlidingWindowLimiter(
        PDF_RATE_LIMIT_REQUESTS, PDF_RATE_LIMIT_WINDOW_SECONDS
    )

    # La autenticación va por cabecera Authorization (sin cookies): no hacen falta credenciales.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.add_exception_handler(RequestValidationError, validation_error_handler)

    for router in ROUTERS:
        app.include_router(router)
    return app


app = create_app()
