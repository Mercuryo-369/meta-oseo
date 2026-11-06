"""Retroalimentación con IA de las preguntas abiertas (bloques `pregunta`).

Pedido de la docente para las preguntas de «detecta y corrige el error» de 4.1, extendido a todos
los bloques `pregunta`: «conviene mucho usar la IA para que detecte las posibles respuestas
correctas o incorrectas y le explique al estudiante por qué».

Flujo de `POST /api/mentor/retroalimentacion` (ver `app/routers/mentor.py`):

    id de la pregunta --> enunciado y respuesta del docente (del servidor, no del cliente) -->
    petición con `output_config.format` --> Claude --> validación --> (un reintento si no sirve)

- El modelo compara la respuesta del estudiante SOLO con la respuesta de referencia del docente y
  el enunciado: no recibe material del curso ni inventa contenido.
- La respuesta del estudiante viaja dentro del bloque de DATOS, escapada y con el aviso de que no
  es una instrucción (mismo tratamiento que el contexto y el material del chat).
- Es retroalimentación, no calificación: no se guarda la respuesta del estudiante, no da puntos ni
  logros. Solo se registra el consumo en `usage_events` con `kind = "quiz"` (comparte la cuota
  diaria del quiz de práctica, `MENTOR_MAX_QUIZ_DIA`).
"""

import json
import logging
import re
from dataclasses import dataclass
from functools import cache
from typing import Any

import anthropic

from app.ai import errors
from app.ai.client import FALLBACK_BETA, FALLBACK_MODE, uses_server_side_fallback
from app.ai.prompt import AVISO_DATOS, PROMPTS_DIR, _atributo, _escapar, render_contexto
from app.ai.usage import Usage
from app.core.settings import Settings
from app.schemas.contexto import ContextoPedagogico
from app.schemas.mentor import VALORACIONES
from app.services.preguntas_abiertas import PreguntaAbierta

logger = logging.getLogger("ova.mentor.retroalimentacion")

RETRO_PROMPT_VERSION = 1
RETRO_PROMPT_FILE = PROMPTS_DIR / f"retroalimentacion_v{RETRO_PROMPT_VERSION}.md"

# Llamadas al modelo por pedido: la primera y UN reintento si lo devuelto no pasa la validación.
RETRO_MAX_INTENTOS = 2
# Tope de salida de cada llamada (el texto es corto; el pensamiento adaptativo también cuenta).
RETRO_MAX_TOKENS = 6000

# El prompt pide 80 a 180 palabras; se tolera un margen para no gastar reintentos por poco.
RETRO_PALABRAS = (50, 240)
RETRO_MAX_CHARS = 1800

_ESPACIOS = re.compile(r"[ \t\r\f\v]+")
_PARRAFOS = re.compile(r"\n\s*\n")


@cache
def load_retro_prompt() -> str:
    """Prompt estable de la retroalimentación (LF y sin bordes, como el del mentor)."""
    text = RETRO_PROMPT_FILE.read_text(encoding="utf-8").replace("\r\n", "\n").strip()
    if not text:
        raise RuntimeError(f"El prompt de la retroalimentación está vacío: {RETRO_PROMPT_FILE}")
    return text


RETRO_SYSTEM_PROMPT = load_retro_prompt()


def retro_system_blocks() -> list[dict[str, Any]]:
    """`system` de la petición: el bloque estable con su punto de caché. Sin nada variable."""
    return [{"type": "text", "text": RETRO_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}]


# Solo lo que admite la API: tipos, `enum`, `required` y `additionalProperties: false`.
RETRO_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "valoracion": {"type": "string", "enum": list(VALORACIONES)},
        "retroalimentacion": {"type": "string"},
    },
    "required": ["valoracion", "retroalimentacion"],
    "additionalProperties": False,
}


# --- Petición ----------------------------------------------------------------------------------


def _bloque(texto: str) -> str:
    """Texto de varias líneas escapado: conserva los saltos, no puede abrir ni cerrar etiquetas."""
    return _escapar(texto.replace("\r\n", "\n").strip())


def render_pedido(
    pregunta: PreguntaAbierta, respuesta_estudiante: str, contexto: ContextoPedagogico | None
) -> str:
    """Mensaje del usuario: el bloque de DATOS (contexto, pregunta, referencia y respuesta del
    estudiante) y el pedido fijo."""
    partes = [
        "<datos_de_la_pregunta>",
        AVISO_DATOS,
        "",
        render_contexto(contexto),
        "",
        f'<pregunta modulo="{pregunta.modulo}" titulo="{_atributo(pregunta.titulo)}">',
        _bloque(pregunta.enunciado),
        "</pregunta>",
        "",
        "<respuesta_del_docente>",
        _bloque(pregunta.respuesta),
        "</respuesta_del_docente>",
        "",
        "<respuesta_del_estudiante>",
        _bloque(respuesta_estudiante),
        "</respuesta_del_estudiante>",
        "</datos_de_la_pregunta>",
    ]
    return (
        "\n".join(partes)
        + "\n\nCompara la respuesta del estudiante con la respuesta del docente y escribe la "
        "retroalimentación, siguiendo las reglas del sistema."
    )


def build_retro_request(
    settings: Settings,
    pregunta: PreguntaAbierta,
    respuesta_estudiante: str,
    contexto: ContextoPedagogico | None,
) -> dict[str, Any]:
    """Argumentos de `client.beta.messages.create(...)`, con los mismos parámetros del modelo que
    el quiz (`app/ai/quiz.py`): pensamiento adaptativo, esfuerzo y salida estructurada en
    `output_config`, sin `temperature`, prefill ni `tool_choice` forzado."""
    request: dict[str, Any] = {
        "model": settings.anthropic_model,
        "max_tokens": min(settings.mentor_max_tokens, RETRO_MAX_TOKENS),
        "system": retro_system_blocks(),
        "messages": [
            {"role": "user", "content": render_pedido(pregunta, respuesta_estudiante, contexto)}
        ],
        "thinking": {"type": "adaptive"},
        "output_config": {
            "effort": settings.mentor_effort,
            "format": {"type": "json_schema", "schema": RETRO_SCHEMA},
        },
    }
    if settings.mentor_server_fallback and uses_server_side_fallback(settings.anthropic_model):
        request["betas"] = [FALLBACK_BETA]
        request["fallbacks"] = FALLBACK_MODE
    return request


# --- Validación --------------------------------------------------------------------------------


class RetroalimentacionInvalida(ValueError):
    """Lo que devolvió el modelo no cumple el formato. `errores` lista los motivos."""

    def __init__(self, errores: list[str]) -> None:
        super().__init__("; ".join(errores))
        self.errores = errores


def _limpiar(texto: str) -> str:
    """Espacios simples dentro de cada párrafo y una línea en blanco entre párrafos."""
    parrafos = (
        " ".join(_ESPACIOS.sub(" ", linea).strip() for linea in p.splitlines() if linea.strip())
        for p in _PARRAFOS.split(texto.replace("\r\n", "\n"))
    )
    return "\n\n".join(p for p in parrafos if p)


def validar_retroalimentacion(texto: str) -> tuple[str, str]:
    """`(valoracion, retroalimentacion)` o `RetroalimentacionInvalida`."""
    try:
        datos = json.loads(texto)
    except ValueError as error:
        raise RetroalimentacionInvalida(["la respuesta no es JSON válido"]) from error
    if not isinstance(datos, dict):
        raise RetroalimentacionInvalida(["la respuesta no es un objeto"])
    errores: list[str] = []
    valoracion = datos.get("valoracion")
    if valoracion not in VALORACIONES:
        errores.append(f"valoración {valoracion!r} no es válida")
    bruto = datos.get("retroalimentacion")
    limpio = ""
    if not isinstance(bruto, str):
        errores.append("la retroalimentación no es texto")
    else:
        limpio = _limpiar(bruto)
        palabras = len(limpio.split())
        if not RETRO_PALABRAS[0] <= palabras <= RETRO_PALABRAS[1]:
            errores.append(
                f"la retroalimentación tiene {palabras} palabras "
                f"(debe estar entre {RETRO_PALABRAS[0]} y {RETRO_PALABRAS[1]})"
            )
        if len(limpio) > RETRO_MAX_CHARS:
            errores.append(f"la retroalimentación pasa de {RETRO_MAX_CHARS} caracteres")
        if "\x00" in limpio:
            errores.append("la retroalimentación tiene caracteres no válidos")
    if errores:
        raise RetroalimentacionInvalida(errores)
    return str(valoracion), limpio


# --- Llamada al modelo -------------------------------------------------------------------------


class RetroalimentacionFallida(Exception):
    """No se pudo preparar la retroalimentación. `code` es el código de error de la API y `usage`
    lo gastado."""

    def __init__(self, code: str, message: str, usage: Usage, model: str | None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.usage = usage
        self.model = model


@dataclass(frozen=True, slots=True)
class RetroalimentacionGenerada:
    valoracion: str
    retroalimentacion: str
    usage: Usage
    model: str
    intentos: int


CODE_RETRO_INVALIDA = "retroalimentacion_invalida"
CODE_IA_ERROR = "ia_error"
MESSAGE_RETRO_INVALIDA = (
    "No se pudo preparar la retroalimentación esta vez. Inténtalo de nuevo en un momento."
)
MESSAGE_IA_ERROR = (
    "El mentor no puede revisar tu respuesta en este momento. Intenta de nuevo en unos minutos."
)
MESSAGE_RECHAZO = "El mentor no pudo revisar esa respuesta. Reformúlala e inténtalo de nuevo."


def _texto_del_mensaje(message: Any) -> str:
    return "".join(block.text for block in message.content if block.type == "text")


async def generar_retroalimentacion(
    client: anthropic.AsyncAnthropic,
    request: dict[str, Any],
    *,
    max_intentos: int = RETRO_MAX_INTENTOS,
) -> RetroalimentacionGenerada:
    """Pide la retroalimentación a Claude y la valida; reintenta si lo devuelto no sirve.

    Lanza `RetroalimentacionFallida` si el modelo rechaza la consulta, si el servicio falla o si
    tras `max_intentos` llamadas el resultado sigue siendo inválido. El consumo de las llamadas que
    sí respondieron viaja en la excepción, para registrarlo igual.
    """
    usage = Usage()
    model: str | None = None
    ultimo_error = ""
    for intento in range(1, max_intentos + 1):
        try:
            message = await client.beta.messages.create(**request)
        except Exception as exc:
            failure = errors.classify_upstream_error(exc)
            log = logger.warning if failure.transient else logger.error
            # Solo tipo y estado: sin cabeceras ni cuerpo (llevan la respuesta del estudiante).
            log(
                "Fallo al preparar la retroalimentación (%s, estado=%s, request_id=%s)",
                type(exc).__name__,
                getattr(exc, "status_code", None),
                getattr(exc, "request_id", None),
                exc_info=None if failure.transient else exc,
            )
            raise RetroalimentacionFallida(CODE_IA_ERROR, MESSAGE_IA_ERROR, usage, model) from exc

        usage = usage + Usage.from_message(message)
        model = str(message.model or request["model"])
        if message.stop_reason == "refusal":
            details = message.stop_details
            logger.info(
                "La retroalimentación fue rechazada (categoría: %s)", details and details.category
            )
            raise RetroalimentacionFallida(CODE_IA_ERROR, MESSAGE_RECHAZO, usage, model)
        if message.stop_reason == "max_tokens":
            ultimo_error = "la respuesta se cortó por su longitud"
        else:
            try:
                valoracion, texto = validar_retroalimentacion(_texto_del_mensaje(message))
            except RetroalimentacionInvalida as invalida:
                ultimo_error = "; ".join(invalida.errores)
            else:
                return RetroalimentacionGenerada(valoracion, texto, usage, model, intento)
        logger.warning(
            "Retroalimentación inválida (intento %d de %d): %s", intento, max_intentos, ultimo_error
        )
    raise RetroalimentacionFallida(CODE_RETRO_INVALIDA, MESSAGE_RETRO_INVALIDA, usage, model)
