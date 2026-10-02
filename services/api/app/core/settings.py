"""Configuración de la API (pydantic-settings).

Lee variables de entorno y, si existe, el `.env` de la raíz del repositorio (la ruta se
calcula respecto a `services/api`, así funciona desde cualquier directorio de trabajo).
Las variables de entorno tienen prioridad sobre el `.env`. Ver `.env.example`.
"""

import ipaddress
import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal
from urllib.parse import urlsplit

from fastapi import Depends, Request
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# services/api (raíz del proyecto uv) y raíz del monorepo.
API_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = API_DIR.parents[1]

# Manifiesto de actividades por defecto (lo genera `python -m app.scripts.build_manifest`).
DEFAULT_MANIFEST_PATH = API_DIR / "app" / "data" / "actividades_manifest.json"

# Corpus del mentor (lo genera `python -m app.scripts.build_corpus`, F3-01).
DEFAULT_CORPUS_PATH = API_DIR / "app" / "data" / "corpus.jsonl"

# Valor por defecto de SECRET_KEY: solo sirve en desarrollo. Mide más de 32 bytes para que
# PyJWT no avise de clave HMAC corta (RFC 7518 §3.2).
DEFAULT_SECRET_KEY = "cambiar-en-produccion-clave-solo-para-desarrollo"
# Valores de ejemplo conocidos que nunca deben usarse en producción.
INSECURE_SECRET_KEYS = frozenset({DEFAULT_SECRET_KEY, "cambiar-en-produccion"})
MIN_PROD_SECRET_LENGTH = 32


def is_local_url(value: str) -> bool:
    """`True` si la URL apunta a esta misma máquina: `localhost` (y `*.localhost`), 127.0.0.0/8,
    `::1` o `0.0.0.0`. Tolera una URL sin esquema (`localhost:8080`)."""
    text = value.strip()
    try:
        host = urlsplit(text if "://" in text else f"//{text}").hostname
    except ValueError:
        return False
    if not host:
        return False
    if host == "localhost" or host.endswith(".localhost"):
        return True
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return False
    return address.is_loopback or address.is_unspecified


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",  # el .env compartido trae variables de docker-compose, etc.
    )

    env: Literal["dev", "prod"] = "dev"
    secret_key: str = Field(default=DEFAULT_SECRET_KEY, repr=False)
    access_token_expire_minutes: int = Field(default=10080, gt=0)  # 7 días

    # SQLite en desarrollo, PostgreSQL (psycopg) en producción. Una ruta SQLite relativa
    # se resuelve respecto a `services/api`, no al directorio de trabajo.
    database_url: str = "sqlite:///./data/ova.db"

    # Orígenes CORS separados por coma (o una lista JSON).
    allowed_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    # Detrás de un proxy inverso, tomar la IP del cliente de X-Forwarded-For. Activar solo si
    # el proxy SOBRESCRIBE esa cabecera (ver app/core/rate_limit.py).
    trust_proxy: bool = False

    # Mentor de IA (F1-07). Sin clave, /api/chat responde 503 `ia_no_configurada`.
    anthropic_api_key: str = Field(default="", repr=False)
    anthropic_model: str = "claude-opus-5"
    mentor_effort: Literal["low", "medium", "high", "xhigh", "max"] = "medium"
    mentor_max_tokens: int = Field(default=16000, gt=0)
    # Fallback del lado del servidor (beta de Anthropic): reintenta en otro modelo si un
    # clasificador de seguridad rechaza la consulta. Activo por defecto con `claude-opus-5`. Si la
    # organización no tiene habilitada esa beta, cada consulta da error: ponerlo en `false`.
    mentor_server_fallback: bool = True
    # Límite diario de mensajes del estudiante al mentor (F3-10), además del límite por minuto.
    # El día es el calendario de Colombia (UTC-5). 0 desactiva el límite.
    mentor_max_mensajes_dia: int = Field(default=60, ge=0)
    # Cuota diaria propia de los quizzes de práctica del mentor (F4-03), por estudiante y además del
    # límite por minuto. Mismo día que el límite de mensajes. 0 la desactiva.
    mentor_max_quiz_dia: int = Field(default=20, ge=0)

    # Recuperación del material del curso (RAG, F3-01/F3-02). `RAG_BACKEND=bm25` es la única
    # implementación hoy; `pgvector` queda reservada para cuando se monte Docker (F6-10).
    # `RAG_CORPUS_PATH` vacía desactiva la recuperación (el mentor responde sin material del
    # curso); una ruta explícita que no existe es un error de arranque.
    rag_backend: Literal["bm25", "pgvector"] = "bm25"
    rag_corpus_path: Path | None = DEFAULT_CORPUS_PATH
    mentor_rag_top_k: int = Field(default=5, ge=1, le=10)

    # Precios para ESTIMAR el costo del mentor en el panel docente (F6-03), en USD por millón de
    # tokens. Por defecto, las tarifas de `claude-opus-5` (5 USD entrada, 25 USD salida). Son una
    # estimación: la factura real la emite Anthropic. Si cambia el modelo o la tarifa, se ajustan
    # aquí sin tocar código.
    precio_entrada_usd_por_mtok: float = Field(default=5.0, ge=0)
    precio_salida_usd_por_mtok: float = Field(default=25.0, ge=0)

    # Validación de resultados contra el contenido (F5-05 / F2). Ruta del manifiesto de
    # actividades. Por defecto `app/data/actividades_manifest.json`: si existe se valida, si no,
    # la API se comporta como en Fase 1. Una ruta explícita que no existe es un error de arranque;
    # `ACTIVITIES_MANIFEST_PATH=` (vacía) desactiva la validación.
    activities_manifest_path: Path | None = DEFAULT_MANIFEST_PATH

    # Certificado (F5-05): porcentaje mínimo del puntaje máximo de las actividades obligatorias
    # (solo se exige si hay manifiesto) y URL pública del sitio para el enlace de verificación
    # impreso en el PDF (`{PUBLIC_BASE_URL}/verify/{codigo}`).
    cert_min_porcentaje: int = Field(default=70, ge=0, le=100)
    public_base_url: str = "http://localhost:5173"

    @field_validator("activities_manifest_path", mode="before")
    @classmethod
    def _empty_manifest_path_disables(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("rag_corpus_path", mode="before")
    @classmethod
    def _empty_corpus_path_disables(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("public_base_url")
    @classmethod
    def _clean_public_base_url(cls, value: str) -> str:
        return value.strip().rstrip("/")

    @property
    def manifest_is_explicit(self) -> bool:
        """`True` si la ruta del manifiesto no es la de por defecto (entonces debe existir)."""
        return (
            self.activities_manifest_path is not None
            and self.activities_manifest_path != DEFAULT_MANIFEST_PATH
        )

    @property
    def corpus_is_explicit(self) -> bool:
        """`True` si la ruta del corpus no es la de por defecto (entonces debe existir)."""
        return self.rag_corpus_path is not None and self.rag_corpus_path != DEFAULT_CORPUS_PATH

    @field_validator("database_url")
    @classmethod
    def _use_psycopg_driver(cls, value: str) -> str:
        """`postgresql://` y `postgres://` usarían psycopg2 (no instalado): forzar psycopg 3."""
        for prefix in ("postgresql://", "postgres://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix) :]
        return value

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            text = value.strip()
            items = json.loads(text) if text.startswith("[") else text.split(",")
            return [str(item).strip().rstrip("/") for item in items if str(item).strip()]
        return value

    @model_validator(mode="after")
    def _guard_production_secret(self) -> "Settings":
        if self.env == "prod":
            if self.secret_key in INSECURE_SECRET_KEYS:
                raise ValueError(
                    "SECRET_KEY tiene el valor por defecto: define una clave propia "
                    "para ENV=prod (por ejemplo: python -c 'import secrets; "
                    "print(secrets.token_urlsafe(48))')."
                )
            if len(self.secret_key) < MIN_PROD_SECRET_LENGTH:
                raise ValueError(
                    f"SECRET_KEY debe tener al menos {MIN_PROD_SECRET_LENGTH} caracteres "
                    "cuando ENV=prod."
                )
            if is_local_url(self.public_base_url):
                raise ValueError(
                    "PUBLIC_BASE_URL apunta a localhost o 127.0.0.1: el certificado saldría con "
                    "un enlace de verificación falso. Define la dirección pública del sitio para "
                    "ENV=prod (por ejemplo: https://ova.midominio.edu)."
                )
        return self

    @property
    def is_prod(self) -> bool:
        return self.env == "prod"

    @property
    def anthropic_configured(self) -> bool:
        return bool(self.anthropic_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    """Configuración del proceso (se lee una sola vez)."""
    return Settings()


def get_request_settings(request: Request) -> Settings:
    """Dependencia FastAPI: la configuración de la app que atiende la petición."""
    return request.app.state.settings


SettingsDep = Annotated[Settings, Depends(get_request_settings)]
