"""Quiz de práctica del mentor (F4-03): 3 preguntas de opción múltiple con salida estructurada.

Flujo de `POST /api/mentor/quiz` (ver `app/routers/mentor.py`):

    material del curso (RAG) --> petición con `output_config.format` --> Claude --> validación
    estricta --> (reintento acotado si el resultado no sirve) --> opciones mezcladas --> respuesta

- El material sale SOLO de lo citable del corpus (contenido, glosario y objetivos: lo que el
  estudiante puede leer en el OVA). El corpus no trae preguntas ni respuestas de las actividades
  calificadas, y aquí además se descarta el material del docente para el mentor (`banco`,
  `gancho`), que sí trae preguntas de refuerzo con su respuesta.
- La salida estructurada (`output_config.format` con un JSON schema) garantiza la FORMA, pero el
  esquema de la API no admite límites de longitud ni de cantidad: todo eso, más lo que un esquema
  no puede decir (una sola opción correcta, opciones distintas, fuentes que existen), se valida
  aquí en Python. Un resultado inválido se reintenta como máximo `QUIZ_MAX_INTENTOS` veces.
- Es práctica libre: no se guarda, no da puntos ni logros. Solo se registra el consumo en
  `usage_events` (`kind = "quiz"`, UNA fila por quiz aunque haya habido un reintento), que además
  es lo que cuenta la cuota diaria propia (`MENTOR_MAX_QUIZ_DIA`).
"""

import json
import logging
import random
import re
import unicodedata
from collections.abc import Sequence
from dataclasses import dataclass
from functools import cache
from typing import Any

import anthropic

from app.ai import errors
from app.ai.client import FALLBACK_BETA, FALLBACK_MODE, uses_server_side_fallback
from app.ai.prompt import (
    AVISO_DATOS,
    PROMPTS_DIR,
    FragmentoEtiquetado,
    _linea,
    citas_de,
    etiquetar,
    render_contexto,
    render_material,
)
from app.ai.usage import Usage
from app.core.constants import MODULE_TITLES
from app.core.settings import Settings
from app.models.enums import Nivel
from app.rag.corpus import NIVEL_POSGRADO, TIPO_CONTENIDO, TIPO_GLOSARIO, TIPO_OBJETIVOS, Fragmento
from app.rag.retriever import Consulta, Retriever
from app.schemas.contexto import ContextoPedagogico
from app.schemas.mentor import (
    DIFICULTADES,
    QUIZ_OPTIONS,
    QUIZ_QUESTIONS,
    QuizOpcion,
    QuizPregunta,
)

logger = logging.getLogger("ova.mentor.quiz")

QUIZ_PROMPT_VERSION = 1
QUIZ_PROMPT_FILE = PROMPTS_DIR / f"quiz_v{QUIZ_PROMPT_VERSION}.md"

# Llamadas al modelo por quiz: la primera y UN reintento si lo devuelto no pasa la validación.
QUIZ_MAX_INTENTOS = 2
# Tope de salida de cada llamada (3 preguntas con explicación caben de sobra; el pensamiento
# adaptativo también cuenta). Se mantiene bajo para poder usar la API sin streaming.
QUIZ_MAX_TOKENS = 8000

# Material: lo que el estudiante puede leer. El del docente para el mentor NO entra al quiz.
TIPOS_DEL_QUIZ = frozenset({TIPO_CONTENIDO, TIPO_GLOSARIO, TIPO_OBJETIVOS})
MAX_FRAGMENTOS = 8
MAX_CARACTERES_MATERIAL = 9000
# Fragmentos de refuerzo que se piden a la búsqueda cuando hay tema o estructura seleccionada.
_K_BUSQUEDA = 6

# Longitudes válidas (en caracteres) de cada texto que devuelve el modelo.
ENUNCIADO_LARGO = (15, 300)
OPCION_LARGO = (1, 200)
EXPLICACION_LARGO = (20, 700)
MAX_FUENTES_POR_PREGUNTA = 3

_ESPACIOS = re.compile(r"\s+")
# Opciones que dejan de tener sentido al mezclar el orden.
_OPCION_DEPENDIENTE = re.compile(
    r"\b(todas|ninguna|ambas|cualquiera)\s+(de\s+)?(las|los)\s+(anteriores|opciones|respuestas)\b"
    r"|\b(a|b|c|d)\s+y\s+(a|b|c|d)\b",
    re.IGNORECASE,
)


@cache
def load_quiz_prompt() -> str:
    """Prompt estable del quiz (mismo tratamiento que el del mentor: LF y sin bordes)."""
    text = QUIZ_PROMPT_FILE.read_text(encoding="utf-8").replace("\r\n", "\n").strip()
    if not text:
        raise RuntimeError(f"El prompt del quiz está vacío: {QUIZ_PROMPT_FILE}")
    return text


QUIZ_SYSTEM_PROMPT = load_quiz_prompt()


def quiz_system_blocks() -> list[dict[str, Any]]:
    """`system` de la petición: el bloque estable con su punto de caché. Sin nada variable."""
    return [{"type": "text", "text": QUIZ_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}]


# --- Esquema de la salida estructurada ---------------------------------------------------------


def _quiz_schema() -> dict[str, Any]:
    """JSON schema de `output_config.format`.

    Solo lo que la API admite: tipos, `enum`, `required` y `additionalProperties: false`. Nada de
    `minLength`, `minItems` ni `maxItems` (la API los rechaza): esos límites se validan abajo.
    """
    return {
        "type": "object",
        "properties": {
            "preguntas": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "enunciado": {"type": "string"},
                        "opciones": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "texto": {"type": "string"},
                                    "correcta": {"type": "boolean"},
                                },
                                "required": ["texto", "correcta"],
                                "additionalProperties": False,
                            },
                        },
                        "explicacion": {"type": "string"},
                        "dificultad": {"type": "string", "enum": list(DIFICULTADES)},
                        "fuentes": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["enunciado", "opciones", "explicacion", "dificultad", "fuentes"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["preguntas"],
        "additionalProperties": False,
    }


QUIZ_SCHEMA = _quiz_schema()


# --- Material ----------------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class MaterialDelQuiz:
    """Lo que se le da al modelo y cómo se titula el quiz."""

    fragmentos: list[Fragmento]
    tema: str


def _es_del_quiz(fragmento: Fragmento, nivel: Nivel) -> bool:
    if fragmento.tipo not in TIPOS_DEL_QUIZ:
        return False
    return not (fragmento.nivel == NIVEL_POSGRADO and nivel is not Nivel.posgrado)


def _recortar(fragmentos: Sequence[Fragmento]) -> list[Fragmento]:
    """Primeros fragmentos que caben en el tope de cantidad y de caracteres."""
    elegidos: list[Fragmento] = []
    total = 0
    for fragmento in fragmentos:
        if len(elegidos) >= MAX_FRAGMENTOS:
            break
        # Siempre entra el primero, aunque sea largo; los demás, mientras quepan.
        if elegidos and total + len(fragmento.texto) > MAX_CARACTERES_MATERIAL:
            continue
        elegidos.append(fragmento)
        total += len(fragmento.texto)
    return elegidos


def _nombre_legible(identificador: str) -> str:
    return re.sub(r"^(?:mol|rec|par|histo|ident|capa|paso|ea|eb)_", "", identificador).replace(
        "_", " "
    )


def seleccionar_material(
    retriever: Retriever,
    *,
    modulo: int | None,
    seccion: str | None,
    tema: str | None,
    nivel: Nivel,
    estructura: str | None = None,
    molecula: str | None = None,
) -> MaterialDelQuiz:
    """Fragmentos del curso sobre los que se pregunta (vacío si no hay nada que preguntar).

    1. La sección indicada (todo su contenido, en orden), si existe.
    2. Lo que la búsqueda halla para el tema escrito o para la estructura o molécula seleccionada.
    3. Sin lo anterior, el comienzo del módulo (objetivos y primeras secciones).
    """
    fragmentos: list[Fragmento] = []
    vistos: set[str] = set()

    def agregar(candidatos: Sequence[Fragmento]) -> None:
        for fragmento in candidatos:
            if fragmento.id not in vistos and _es_del_quiz(fragmento, nivel):
                vistos.add(fragmento.id)
                fragmentos.append(fragmento)

    titulo_seccion = ""
    if modulo is not None and seccion:
        de_la_seccion = retriever.fragmentos_de(modulo, seccion)
        agregar(de_la_seccion)
        titulo_seccion = next((f.seccion_titulo for f in de_la_seccion), "")

    texto_busqueda = tema or ""
    texto_contexto = " ".join(_nombre_legible(x) for x in (estructura, molecula) if x).strip()
    if texto_busqueda or texto_contexto:
        resultados = retriever.buscar(
            Consulta(
                texto=texto_busqueda,
                k=_K_BUSQUEDA,
                modulo_actual=modulo,
                seccion_actual=seccion,
                texto_contexto=texto_contexto,
            )
        )
        agregar([r.fragmento for r in resultados])

    if not fragmentos and modulo is not None:
        del_modulo = retriever.fragmentos_de(modulo)
        agregar(sorted(del_modulo, key=lambda f: f.tipo != TIPO_OBJETIVOS)[:MAX_FRAGMENTOS])

    titulo = (
        tema
        or titulo_seccion
        or (f"Módulo {modulo}: {MODULE_TITLES.get(modulo, '')}".strip(": ") if modulo else "")
    )
    return MaterialDelQuiz(fragmentos=_recortar(fragmentos), tema=titulo)


# --- Petición ----------------------------------------------------------------------------------


def render_pedido(
    contexto: ContextoPedagogico | None,
    material: Sequence[FragmentoEtiquetado],
    tema: str | None,
) -> str:
    """Mensaje del usuario: el bloque de DATOS (contexto, tema y material) y el pedido fijo."""
    partes = ["<datos_del_curso>", AVISO_DATOS, "", render_contexto(contexto)]
    if tema:
        partes += ["", f"<tema_solicitado>{_linea(tema)}</tema_solicitado>"]
    partes += ["", render_material(material), "</datos_del_curso>"]
    return (
        "\n".join(partes)
        + f"\n\nPrepara {QUIZ_QUESTIONS} preguntas de opción múltiple de práctica sobre este "
        "material, siguiendo las reglas del sistema."
    )


def build_quiz_request(
    settings: Settings,
    contexto: ContextoPedagogico | None,
    material: Sequence[FragmentoEtiquetado],
    tema: str | None,
) -> dict[str, Any]:
    """Argumentos de `client.beta.messages.create(...)`.

    Mismos parámetros del modelo que el chat (`app/ai/client.py`): pensamiento adaptativo y
    esfuerzo en `output_config`, y nada de `temperature`, `top_p`, `top_k`, `budget_tokens`, prefill
    ni `tool_choice` forzado. La salida estructurada va en `output_config.format`.
    """
    request: dict[str, Any] = {
        "model": settings.anthropic_model,
        "max_tokens": min(settings.mentor_max_tokens, QUIZ_MAX_TOKENS),
        "system": quiz_system_blocks(),
        "messages": [{"role": "user", "content": render_pedido(contexto, material, tema)}],
        "thinking": {"type": "adaptive"},
        "output_config": {
            "effort": settings.mentor_effort,
            "format": {"type": "json_schema", "schema": QUIZ_SCHEMA},
        },
    }
    if settings.mentor_server_fallback and uses_server_side_fallback(settings.anthropic_model):
        request["betas"] = [FALLBACK_BETA]
        request["fallbacks"] = FALLBACK_MODE
    return request


# --- Validación --------------------------------------------------------------------------------


class QuizInvalido(ValueError):
    """Lo que devolvió el modelo no cumple el formato del quiz. `errores` lista los motivos."""

    def __init__(self, errores: list[str]) -> None:
        super().__init__("; ".join(errores))
        self.errores = errores


def _normalizar(texto: str) -> str:
    """Forma comparable de un texto: sin acentos, en minúsculas y con espacios simples."""
    sin_acentos = "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )
    return _ESPACIOS.sub(" ", sin_acentos).strip().casefold().rstrip(".")


def _texto(valor: Any, largo: tuple[int, int], nombre: str, errores: list[str]) -> str:
    if not isinstance(valor, str):
        errores.append(f"{nombre} no es texto")
        return ""
    limpio = _ESPACIOS.sub(" ", valor).strip()
    if not largo[0] <= len(limpio) <= largo[1]:
        errores.append(
            f"{nombre} mide {len(limpio)} caracteres (debe estar entre {largo[0]} y {largo[1]})"
        )
    if "\x00" in limpio:
        errores.append(f"{nombre} tiene caracteres no válidos")
    return limpio


def _validar_pregunta(
    numero: int, bruta: Any, etiquetas: frozenset[str]
) -> tuple[QuizPregunta | None, list[str]]:
    """`(pregunta, errores)`; con errores no hay pregunta."""
    errores: list[str] = []
    prefijo = f"pregunta {numero}"
    if not isinstance(bruta, dict):
        return None, [f"{prefijo} no es un objeto"]
    enunciado = _texto(bruta.get("enunciado"), ENUNCIADO_LARGO, f"{prefijo}: enunciado", errores)
    explicacion = _texto(
        bruta.get("explicacion"), EXPLICACION_LARGO, f"{prefijo}: explicación", errores
    )

    dificultad = bruta.get("dificultad")
    if dificultad not in DIFICULTADES:
        errores.append(f"{prefijo}: dificultad {dificultad!r} no es válida")

    opciones: list[QuizOpcion] = []
    correcta = -1
    brutas = bruta.get("opciones")
    if not isinstance(brutas, list) or len(brutas) != QUIZ_OPTIONS:
        cantidad = len(brutas) if isinstance(brutas, list) else "ninguna"
        errores.append(f"{prefijo}: debe tener {QUIZ_OPTIONS} opciones (tiene {cantidad})")
    else:
        marcadas = 0
        vistas: set[str] = set()
        for posicion, opcion in enumerate(brutas):
            if not isinstance(opcion, dict) or not isinstance(opcion.get("correcta"), bool):
                errores.append(f"{prefijo}: la opción {posicion + 1} está mal formada")
                continue
            texto = _texto(
                opcion.get("texto"), OPCION_LARGO, f"{prefijo}: opción {posicion + 1}", errores
            )
            clave = _normalizar(texto)
            if clave in vistas:
                errores.append(f"{prefijo}: hay opciones repetidas")
            vistas.add(clave)
            if _OPCION_DEPENDIENTE.search(texto):
                errores.append(
                    f"{prefijo}: la opción {posicion + 1} depende del orden de las demás"
                )
            if opcion["correcta"]:
                marcadas += 1
                correcta = posicion
            opciones.append(QuizOpcion(texto=texto))
        if marcadas != 1:
            errores.append(f"{prefijo}: debe haber una sola opción correcta (hay {marcadas})")
        if _normalizar(enunciado) in vistas:
            errores.append(f"{prefijo}: una opción repite el enunciado")

    fuentes: list[str] = []
    brutas_fuentes = bruta.get("fuentes")
    if not isinstance(brutas_fuentes, list) or not brutas_fuentes:
        errores.append(f"{prefijo}: falta indicar la fuente")
    else:
        for etiqueta in brutas_fuentes:
            if not isinstance(etiqueta, str) or etiqueta.strip() not in etiquetas:
                errores.append(f"{prefijo}: la fuente {etiqueta!r} no existe en el material")
            elif etiqueta.strip() not in fuentes:
                fuentes.append(etiqueta.strip())
        if len(fuentes) > MAX_FUENTES_POR_PREGUNTA:
            errores.append(f"{prefijo}: cita más de {MAX_FUENTES_POR_PREGUNTA} fuentes")

    if errores:
        return None, errores
    return (
        QuizPregunta(
            id=numero,
            enunciado=enunciado,
            opciones=opciones,
            correcta=correcta,
            explicacion=explicacion,
            dificultad=dificultad,
            fuentes=fuentes,
        ),
        [],
    )


def validar_quiz(texto: str, etiquetas: frozenset[str]) -> list[QuizPregunta]:
    """Convierte el texto del modelo en preguntas válidas o lanza `QuizInvalido`.

    Exige JSON, exactamente `QUIZ_QUESTIONS` preguntas distintas y, en cada una, lo que
    `_validar_pregunta` comprueba. Las opciones quedan en el orden en que las dio el modelo
    (`mezclar_opciones` las revuelve después).
    """
    try:
        datos = json.loads(texto)
    except ValueError as error:
        raise QuizInvalido(["la respuesta no es JSON válido"]) from error
    brutas = datos.get("preguntas") if isinstance(datos, dict) else None
    if not isinstance(brutas, list):
        raise QuizInvalido(["falta la lista `preguntas`"])
    if len(brutas) != QUIZ_QUESTIONS:
        raise QuizInvalido([f"debe haber {QUIZ_QUESTIONS} preguntas (hay {len(brutas)})"])
    preguntas: list[QuizPregunta] = []
    errores: list[str] = []
    for numero, bruta in enumerate(brutas, start=1):
        pregunta, fallos = _validar_pregunta(numero, bruta, etiquetas)
        errores += fallos
        if pregunta is not None:
            preguntas.append(pregunta)
    if not errores:
        enunciados = [_normalizar(p.enunciado) for p in preguntas]
        if len(set(enunciados)) != len(enunciados):
            errores.append("hay preguntas repetidas")
    if errores:
        raise QuizInvalido(errores)
    return preguntas


def mezclar_opciones(
    preguntas: Sequence[QuizPregunta], rng: random.Random | None = None
) -> list[QuizPregunta]:
    """Revuelve el orden de las opciones de cada pregunta y ajusta la posición de la correcta."""
    rng = rng or random.SystemRandom()
    mezcladas: list[QuizPregunta] = []
    for pregunta in preguntas:
        orden = list(range(len(pregunta.opciones)))
        rng.shuffle(orden)
        mezcladas.append(
            pregunta.model_copy(
                update={
                    "opciones": [pregunta.opciones[i] for i in orden],
                    "correcta": orden.index(pregunta.correcta),
                }
            )
        )
    return mezcladas


# --- Llamada al modelo -------------------------------------------------------------------------


class QuizFallido(Exception):
    """No se pudo preparar el quiz. `code` es el código de error de la API y `usage` lo gastado."""

    def __init__(self, code: str, message: str, usage: Usage, model: str | None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.usage = usage
        self.model = model


@dataclass(frozen=True, slots=True)
class QuizGenerado:
    preguntas: list[QuizPregunta]
    usage: Usage
    model: str
    intentos: int


CODE_QUIZ_INVALIDO = "quiz_invalido"
CODE_IA_ERROR = "ia_error"
MESSAGE_QUIZ_INVALIDO = "No se pudo preparar el quiz esta vez. Inténtalo de nuevo en un momento."
MESSAGE_IA_ERROR = (
    "El mentor no puede preparar el quiz en este momento. Intenta de nuevo en unos minutos."
)
MESSAGE_RECHAZO = "No se pudo preparar un quiz sobre ese tema. Prueba con otro concepto."


def _texto_del_mensaje(message: Any) -> str:
    return "".join(block.text for block in message.content if block.type == "text")


async def generar_quiz(
    client: anthropic.AsyncAnthropic,
    request: dict[str, Any],
    etiquetas: frozenset[str],
    *,
    max_intentos: int = QUIZ_MAX_INTENTOS,
) -> QuizGenerado:
    """Pide el quiz a Claude y lo valida; reintenta si lo devuelto no sirve.

    Lanza `QuizFallido` si el modelo rechaza la consulta, si el servicio falla o si tras
    `max_intentos` llamadas el resultado sigue siendo inválido. El consumo de las llamadas que sí
    respondieron viaja en la excepción, para registrarlo igual.
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
            # Solo tipo y estado: sin cabeceras ni cuerpo (llevan datos del estudiante).
            log(
                "Fallo al preparar el quiz (%s, estado=%s, request_id=%s)",
                type(exc).__name__,
                getattr(exc, "status_code", None),
                getattr(exc, "request_id", None),
                exc_info=None if failure.transient else exc,
            )
            raise QuizFallido(CODE_IA_ERROR, MESSAGE_IA_ERROR, usage, model) from exc

        usage = usage + Usage.from_message(message)
        model = str(message.model or request["model"])
        if message.stop_reason == "refusal":
            details = message.stop_details
            logger.info("El quiz fue rechazado (categoría: %s)", details and details.category)
            raise QuizFallido(CODE_IA_ERROR, MESSAGE_RECHAZO, usage, model)
        if message.stop_reason == "max_tokens":
            ultimo_error = "la respuesta se cortó por su longitud"
        else:
            try:
                preguntas = validar_quiz(_texto_del_mensaje(message), etiquetas)
            except QuizInvalido as invalido:
                ultimo_error = "; ".join(invalido.errores)
            else:
                return QuizGenerado(preguntas, usage, model, intento)
        logger.warning("Quiz inválido (intento %d de %d): %s", intento, max_intentos, ultimo_error)
    raise QuizFallido(CODE_QUIZ_INVALIDO, MESSAGE_QUIZ_INVALIDO, usage, model)


def etiquetar_material(
    fragmentos: Sequence[Fragmento],
) -> tuple[list[FragmentoEtiquetado], frozenset[str], list[dict[str, Any]]]:
    """Fragmentos con etiqueta, etiquetas válidas y las fuentes que ve el estudiante."""
    material = etiquetar(fragmentos)
    citas = citas_de(material)
    etiquetas = frozenset(str(n) for n in range(1, len(citas) + 1))
    return material, etiquetas, citas
