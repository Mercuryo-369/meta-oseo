"""Sugerencias de refuerzo (F3-07): qué conceptos conviene repasar, SIN llamar al modelo.

Reglas puras sobre lo que el servidor ya sabe de un estudiante (su mejor resultado por actividad
y los módulos que ya inició) y sobre el manifiesto de actividades (concepto, sección y puntaje
máximo de cada una). No hay datos ajenos ni estado: la misma entrada da siempre la misma salida.

Una sugerencia por actividad, con UN motivo (el de más peso):

- `atascada` (90 + extra): sin completar y con `INTENTOS_ATASCADA` o más intentos.
- `precision_baja` (60 a 88): completada, pero con menos del 70 % del puntaje máximo.
- `en_curso` (50): obligatoria, sin completar, con 1 o 2 intentos.
- `varios_intentos` (40 + extra): completada con buen puntaje, pero con 3 o más intentos.
- `pendiente` (30): obligatoria, sin ningún intento, de un módulo ya iniciado.

Prioridad: `alta` desde 80 puntos, `media` desde 50, `baja` el resto. Si varias actividades
comparten concepto dentro de un módulo, queda la de más puntaje (así la lista habla de conceptos,
no de actividades repetidas). Sin señal alguna la lista es vacía: la interfaz no muestra nada.
"""

from collections.abc import Iterable, Mapping
from dataclasses import dataclass

from sqlmodel import Session, select

from app.models.progress import ProgressModulo
from app.schemas.activity import ActivityBestResult
from app.schemas.mentor import RefuerzoSugerencia
from app.services.manifest import ActivitySpec, Manifest

# Desde cuántos intentos se considera que una actividad cuesta trabajo.
INTENTOS_ATASCADA = 3
# Por debajo de esta fracción del puntaje máximo, la actividad completada se considera floja.
PRECISION_MINIMA = 0.7
# Cuántas sugerencias se devuelven por defecto y como máximo.
LIMITE_POR_DEFECTO = 5
LIMITE_MAXIMO = 10

PRIORIDAD_ALTA = "alta"
PRIORIDAD_MEDIA = "media"
PRIORIDAD_BAJA = "baja"

MOTIVO_ATASCADA = "atascada"
MOTIVO_PRECISION_BAJA = "precision_baja"
MOTIVO_EN_CURSO = "en_curso"
MOTIVO_VARIOS_INTENTOS = "varios_intentos"
MOTIVO_PENDIENTE = "pendiente"

_UMBRAL_ALTA = 80
_UMBRAL_MEDIA = 50
_TOPE_EXTRA_INTENTOS = 9


@dataclass(frozen=True, slots=True)
class _Candidata:
    puntaje: int
    motivo: str
    texto: str
    actividad_id: str
    spec: ActivitySpec
    orden: int  # posición en el manifiesto: desempata de forma estable


def prioridad_de(puntaje: int) -> str:
    if puntaje >= _UMBRAL_ALTA:
        return PRIORIDAD_ALTA
    if puntaje >= _UMBRAL_MEDIA:
        return PRIORIDAD_MEDIA
    return PRIORIDAD_BAJA


def _intentos_texto(intentos: int) -> str:
    return "1 intento" if intentos == 1 else f"{intentos} intentos"


def evaluar_actividad(
    spec: ActivitySpec, resultado: ActivityBestResult | None, *, modulo_iniciado: bool
) -> tuple[int, str, str] | None:
    """`(puntaje, motivo, texto)` de una actividad, o `None` si no hay nada que reforzar."""
    if resultado is None or (resultado.intentos == 0 and not resultado.completada):
        if spec.obligatoria and modulo_iniciado:
            return 30, MOTIVO_PENDIENTE, "Es una actividad obligatoria que aún no has hecho"
        return None

    intentos = resultado.intentos
    extra = min(max(intentos - INTENTOS_ATASCADA, 0), _TOPE_EXTRA_INTENTOS)
    if not resultado.completada:
        if intentos >= INTENTOS_ATASCADA:
            return (
                90 + extra,
                MOTIVO_ATASCADA,
                f"Llevas {_intentos_texto(intentos)} y aún no la completas",
            )
        if spec.obligatoria:
            return (
                50,
                MOTIVO_EN_CURSO,
                "Empezaste esta actividad obligatoria y aún no la completas",
            )
        return None

    precision = min(resultado.mejor_puntaje / spec.puntaje_max, 1.0)
    if precision < PRECISION_MINIMA:
        puntaje = 60 + round((PRECISION_MINIMA - precision) / PRECISION_MINIMA * 28)
        return (
            puntaje,
            MOTIVO_PRECISION_BAJA,
            f"Tu mejor resultado fue {resultado.mejor_puntaje} de {spec.puntaje_max} puntos",
        )
    if intentos >= INTENTOS_ATASCADA:
        return (
            40 + extra,
            MOTIVO_VARIOS_INTENTOS,
            f"Necesitaste {_intentos_texto(intentos)} para completarla",
        )
    return None


def modulos_del_estudiante(
    session: Session, user_id: int, resultados: Iterable[ActivityBestResult]
) -> tuple[set[int], set[int]]:
    """`(iniciados, completados)`: módulos en los que el estudiante ya hizo algo y los que cerró.

    Un módulo está iniciado si tiene un resultado de actividad, tiempo de estudio o una sección
    abierta. Solo lee filas del propio usuario.
    """
    iniciados = {r.modulo for r in resultados}
    completados: set[int] = set()
    for fila in session.exec(select(ProgressModulo).where(ProgressModulo.user_id == user_id)):
        if fila.completado:
            completados.add(fila.modulo)
        if fila.completado or fila.tiempo_total_seg > 0 or fila.seccion_actual is not None:
            iniciados.add(fila.modulo)
    return iniciados, completados


def calcular_sugerencias(
    manifest: Manifest,
    resultados: Iterable[ActivityBestResult],
    *,
    modulos_iniciados: Iterable[int] = (),
    modulos_completados: Iterable[int] = (),
    modulo: int | None = None,
    limite: int = LIMITE_POR_DEFECTO,
) -> list[RefuerzoSugerencia]:
    """Lista priorizada de conceptos a reforzar, la más urgente primero. Vacía si no hay señal.

    `modulos_iniciados` son los módulos en los que el estudiante ya hizo algo (una actividad o
    tiempo de estudio): solo en ellos una actividad obligatoria sin hacer cuenta como pendiente.
    Un módulo completado no genera pendientes. Con `modulo`, solo se consideran sus actividades.
    """
    por_actividad: Mapping[str, ActivityBestResult] = {r.activity_id: r for r in resultados}
    iniciados = set(modulos_iniciados)
    completados = set(modulos_completados)

    mejores: dict[tuple[int, str], _Candidata] = {}
    for orden, (actividad_id, spec) in enumerate(manifest.activities.items()):
        if modulo is not None and spec.modulo != modulo:
            continue
        evaluada = evaluar_actividad(
            spec,
            por_actividad.get(actividad_id),
            modulo_iniciado=spec.modulo in iniciados and spec.modulo not in completados,
        )
        if evaluada is None:
            continue
        puntaje, motivo, texto = evaluada
        candidata = _Candidata(puntaje, motivo, texto, actividad_id, spec, orden)
        concepto = spec.concepto or spec.seccion_titulo or spec.seccion
        clave = (spec.modulo, concepto.casefold())
        previa = mejores.get(clave)
        if previa is None or (candidata.puntaje, -candidata.orden) > (
            previa.puntaje,
            -previa.orden,
        ):
            mejores[clave] = candidata

    ordenadas = sorted(
        mejores.items(), key=lambda par: (-par[1].puntaje, par[1].spec.modulo, par[1].orden)
    )
    limite = max(1, min(limite, LIMITE_MAXIMO))
    return [
        RefuerzoSugerencia(
            actividad_id=c.actividad_id,
            concepto=c.spec.concepto or c.spec.seccion_titulo or c.spec.seccion,
            modulo=c.spec.modulo,
            seccion=c.spec.seccion,
            seccion_titulo=c.spec.seccion_titulo,
            url=f"/modulo/{c.spec.modulo}?s={c.spec.seccion}",
            motivo_tipo=c.motivo,
            motivo=c.texto,
            prioridad=prioridad_de(c.puntaje),
            puntaje=c.puntaje,
        )
        for _, c in ordenadas[:limite]
    ]
