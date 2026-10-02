"""Errores del mentor: del SDK de Anthropic a los códigos del contrato.

Al cliente NUNCA llega texto crudo de una excepción, ni cabeceras, ni la clave: solo un código del
contrato (`refusal`, `max_tokens`, `upstream_error`, `rate_limited`) y un mensaje amable en
español. El detalle técnico va únicamente al log del servidor.
"""

from dataclasses import dataclass

import anthropic
import httpx2
from fastapi import HTTPException, status

from app.core.errors import api_error

# Códigos de error dentro del stream (docs/api-contract.md).
CODE_REFUSAL = "refusal"
CODE_MAX_TOKENS = "max_tokens"
CODE_UPSTREAM_ERROR = "upstream_error"
CODE_RATE_LIMITED = "rate_limited"

MESSAGE_REFUSAL = (
    "Lo siento, no puedo responder a esa consulta. "
    "Prueba con otras palabras o pregúntame algo más sobre el tema."
)
MESSAGE_MAX_TOKENS = (
    "La respuesta se cortó por su longitud. Pídeme que continúe o hazme una pregunta más concreta."
)
MESSAGE_UPSTREAM = "El mentor no está disponible en este momento. Intenta de nuevo en unos minutos."
MESSAGE_OVERLOADED = (
    "El mentor tiene mucha demanda en este momento. Intenta de nuevo en unos minutos."
)
MESSAGE_TIMEOUT = "El mentor tardó demasiado en responder. Intenta de nuevo."
MESSAGE_CONNECTION = (
    "No se pudo conectar con el mentor. Revisa tu conexión e intenta de nuevo en un momento."
)
MESSAGE_INCOMPLETE = "La respuesta se interrumpió antes de terminar. Intenta de nuevo."
MESSAGE_RATE_LIMITED = (
    "El mentor recibió demasiadas consultas. Espera un momento antes de volver a preguntar."
)


class IncompleteResponseError(Exception):
    """El stream de Anthropic terminó sin entregar un mensaje completo (sin `stop_reason`)."""


@dataclass(frozen=True, slots=True)
class StreamFailure:
    """Cómo se le cuenta un fallo al cliente y con qué severidad se registra en el servidor."""

    code: str
    message: str
    # False si el fallo indica un problema nuestro (clave inválida, petición mal formada, error
    # inesperado): merece un ERROR en el log. True si es transitorio y esperable (límite, red).
    transient: bool = True


RATE_LIMITED = StreamFailure(CODE_RATE_LIMITED, MESSAGE_RATE_LIMITED)
OVERLOADED = StreamFailure(CODE_UPSTREAM_ERROR, MESSAGE_OVERLOADED)
TIMEOUT = StreamFailure(CODE_UPSTREAM_ERROR, MESSAGE_TIMEOUT)
CONNECTION = StreamFailure(CODE_UPSTREAM_ERROR, MESSAGE_CONNECTION)
INCOMPLETE = StreamFailure(CODE_UPSTREAM_ERROR, MESSAGE_INCOMPLETE)
UPSTREAM = StreamFailure(CODE_UPSTREAM_ERROR, MESSAGE_UPSTREAM)
# Fallos que no se arreglan reintentando: clave sin permiso o inválida, petición rechazada, modelo
# inexistente, saldo agotado, o un error nuestro. El cliente ve el mensaje genérico.
UPSTREAM_MISCONFIGURED = StreamFailure(CODE_UPSTREAM_ERROR, MESSAGE_UPSTREAM, transient=False)

# Mientras la respuesta ya fluye, Anthropic avisa un fallo con un evento `error` y el SDK lo
# convierte en `APIStatusError` con el HTTP 200 del stream: ahí el estado no sirve y manda `.type`.
_BY_API_ERROR_TYPE: dict[str, StreamFailure] = {
    "rate_limit_error": RATE_LIMITED,
    "overloaded_error": OVERLOADED,
    "timeout_error": TIMEOUT,
    "api_error": UPSTREAM,
    "invalid_request_error": UPSTREAM_MISCONFIGURED,
    "authentication_error": UPSTREAM_MISCONFIGURED,
    "permission_error": UPSTREAM_MISCONFIGURED,
    "not_found_error": UPSTREAM_MISCONFIGURED,
    "billing_error": UPSTREAM_MISCONFIGURED,
}


def _classify_status_error(exc: BaseException) -> StreamFailure:
    """`APIStatusError` genérico: primero el tipo de error de la API y, si falta, el estado HTTP."""
    assert isinstance(exc, anthropic.APIStatusError)
    if exc.type in _BY_API_ERROR_TYPE:
        return _BY_API_ERROR_TYPE[exc.type]
    if exc.status_code >= 500:
        return UPSTREAM
    return UPSTREAM_MISCONFIGURED


# Cadena de la excepción MÁS ESPECÍFICA a la MÁS GENERAL: gana la primera coincidencia. El orden
# importa: `APITimeoutError` es subclase de `APIConnectionError`, y todas las `*Error` de estado
# HTTP lo son de `APIStatusError`.
_RULES: tuple[tuple[type[BaseException], StreamFailure | None], ...] = (
    (anthropic.RateLimitError, RATE_LIMITED),
    (anthropic.OverloadedError, OVERLOADED),
    (anthropic.APITimeoutError, TIMEOUT),
    (anthropic.APIConnectionError, CONNECTION),
    (anthropic.APIStatusError, None),  # None: decide `_classify_status_error`
    (anthropic.APIError, UPSTREAM_MISCONFIGURED),
    # Errores de red que el SDK no envuelve cuando ocurren con el stream ya abierto.
    (httpx2.TimeoutException, TIMEOUT),
    (httpx2.TransportError, CONNECTION),
    (IncompleteResponseError, INCOMPLETE),
    (anthropic.AnthropicError, UPSTREAM_MISCONFIGURED),
)


def classify_upstream_error(exc: BaseException) -> StreamFailure:
    """Traduce una excepción del SDK (o de la red) al fallo que se informa en el stream."""
    for exception_type, failure in _RULES:
        if isinstance(exc, exception_type):
            return failure if failure is not None else _classify_status_error(exc)
    return UPSTREAM_MISCONFIGURED  # error inesperado: mensaje genérico, ERROR en el log


def ia_not_configured() -> HTTPException:
    """503 `ia_no_configurada`: se responde ANTES de abrir el stream."""
    return api_error(
        status.HTTP_503_SERVICE_UNAVAILABLE,
        "ia_no_configurada",
        "El mentor de IA no está disponible en este momento.",
    )


def daily_limit_reached(limit: int, retry_after_seconds: int) -> HTTPException:
    """429 `limite_diario`: el estudiante agotó sus mensajes de hoy (F3-10)."""
    return api_error(
        status.HTTP_429_TOO_MANY_REQUESTS,
        "limite_diario",
        f"Hoy ya usaste tus {limit} mensajes con el mentor. "
        "Puedes seguir estudiando los módulos y volver a preguntarle mañana.",
        headers={"Retry-After": str(max(1, retry_after_seconds))},
    )


def quiz_daily_limit_reached(limit: int, retry_after_seconds: int) -> HTTPException:
    """429 `limite_diario_quiz`: el estudiante agotó sus quizzes de práctica de hoy (F4-03)."""
    return api_error(
        status.HTTP_429_TOO_MANY_REQUESTS,
        "limite_diario_quiz",
        f"Hoy ya hiciste tus {limit} quizzes de práctica con el mentor. "
        "Puedes seguir con las actividades del módulo y volver a practicar mañana.",
        headers={"Retry-After": str(max(1, retry_after_seconds))},
    )


def quiz_without_material() -> HTTPException:
    """422 `material_insuficiente`: no hay material del curso sobre lo pedido."""
    return api_error(
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "material_insuficiente",
        "No encontré material del curso sobre ese tema para preparar preguntas. "
        "Prueba con un concepto de los módulos.",
    )


def quiz_failed(status_code: int, code: str, message: str) -> HTTPException:
    """502 `quiz_invalido` o `ia_error`: el modelo no entregó un quiz utilizable."""
    return api_error(status_code, code, message)


def session_not_found() -> HTTPException:
    """404 `sesion_no_encontrada`: no existe o no es del usuario (no se distingue a propósito)."""
    return api_error(
        status.HTTP_404_NOT_FOUND,
        "sesion_no_encontrada",
        "No se encontró esa conversación.",
    )


def message_not_found() -> HTTPException:
    """404 `mensaje_no_encontrado`: no existe, no es del mentor o no es del usuario."""
    return api_error(
        status.HTTP_404_NOT_FOUND,
        "mensaje_no_encontrado",
        "No se encontró esa respuesta del mentor.",
    )
