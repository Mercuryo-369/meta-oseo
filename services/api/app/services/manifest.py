"""Manifiesto de actividades: lo que el servidor sabe del contenido de los módulos.

El contenido vive en `apps/web/src/modules/m{n}_{slug}/content.json`. La imagen de la API no lo
trae (su contexto de construcción es `services/api`), así que el script
`python -m app.scripts.build_manifest` extrae de allí lo que la API necesita para validar y lo
escribe en `app/data/actividades_manifest.json`, que sí se versiona y viaja en la imagen.

Formato del archivo (versión 1):

    {
      "version": 1,
      "actividades": {"m1_capas_hueso": {"modulo": 1, "tipo": "multicapa", "puntaje_max": 30,
                                          "obligatoria": true, "seccion": "tejido_dinamico",
                                          "seccion_titulo": "Un tejido vivo",
                                          "concepto": "Organización del hueso largo"}},
      "modulos": {"1": {"slug": "...", "actividades": 9, "obligatorias": 7,
                         "puntaje_max": 270, "puntaje_max_obligatorias": 220}},
      "totales": {"actividades": 9, "obligatorias": 7, "puntaje_max": 270,
                  "puntaje_max_obligatorias": 220}
    }

Los totales son informativos: al cargar, la API los recalcula y rechaza un archivo cuyos totales no
coincidan con sus actividades (señal de una edición a mano o de un archivo desactualizado).
"""

import json
import logging
import re
from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Annotated, Any

from fastapi import Depends, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.constants import ACTIVITY_ID_PATTERN, MAX_ACTIVITY_SCORE, MODULE_COUNT
from app.core.settings import Settings
from app.models.enums import TipoActividad

logger = logging.getLogger(__name__)

MANIFEST_VERSION = 1
_ACTIVITY_ID = re.compile(ACTIVITY_ID_PATTERN)


class ManifestError(ValueError):
    """El manifiesto o el contenido del que sale no es válido."""


class ActivitySpec(BaseModel):
    """Lo que la API necesita saber de una actividad del contenido."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    modulo: int = Field(ge=1, le=MODULE_COUNT)
    tipo: TipoActividad
    puntaje_max: int = Field(ge=1, le=MAX_ACTIVITY_SCORE)
    obligatoria: bool
    seccion: str
    # Título de la sección donde está la actividad y concepto que refuerza (F3-07): con ellos el
    # servidor arma las sugerencias de refuerzo sin abrir el contenido. Vacíos si el contenido no
    # los trae (los manifiestos anteriores a F3-07 no los tienen).
    seccion_titulo: str = ""
    concepto: str = ""


class Manifest:
    """Manifiesto ya cargado y validado, con las consultas que usa la API."""

    def __init__(
        self, activities: Mapping[str, ActivitySpec], slugs: Mapping[int, str] | None = None
    ):
        self.activities: dict[str, ActivitySpec] = dict(activities)
        self.slugs: dict[int, str] = dict(slugs or {})

    @property
    def modules(self) -> list[int]:
        """Números de módulo con al menos una actividad, en orden."""
        return sorted({spec.modulo for spec in self.activities.values()})

    def required_ids(self, modulo: int) -> list[str]:
        """Ids de las actividades obligatorias del módulo, en el orden del contenido."""
        return [
            activity_id
            for activity_id, spec in self.activities.items()
            if spec.modulo == modulo and spec.obligatoria
        ]

    def max_required_score(self) -> int:
        """Suma de `puntaje_max` de todas las actividades obligatorias del OVA."""
        return sum(spec.puntaje_max for spec in self.activities.values() if spec.obligatoria)

    def module_totals(self) -> dict[str, dict[str, Any]]:
        totals: dict[str, dict[str, Any]] = {}
        for modulo in self.modules:
            specs = [spec for spec in self.activities.values() if spec.modulo == modulo]
            required = [spec for spec in specs if spec.obligatoria]
            entry: dict[str, Any] = {}
            if modulo in self.slugs:
                entry["slug"] = self.slugs[modulo]
            entry.update(
                actividades=len(specs),
                obligatorias=len(required),
                puntaje_max=sum(spec.puntaje_max for spec in specs),
                puntaje_max_obligatorias=sum(spec.puntaje_max for spec in required),
            )
            totals[str(modulo)] = entry
        return totals

    def overall_totals(self) -> dict[str, int]:
        required = [spec for spec in self.activities.values() if spec.obligatoria]
        return {
            "actividades": len(self.activities),
            "obligatorias": len(required),
            "puntaje_max": sum(spec.puntaje_max for spec in self.activities.values()),
            "puntaje_max_obligatorias": sum(spec.puntaje_max for spec in required),
        }

    def to_dict(self) -> dict[str, Any]:
        """Representación exacta del archivo (determinista: sin fechas ni rutas)."""
        return {
            "version": MANIFEST_VERSION,
            "actividades": {
                activity_id: spec.model_dump(mode="json")
                for activity_id, spec in self.activities.items()
            },
            "modulos": self.module_totals(),
            "totales": self.overall_totals(),
        }


def build_manifest(contents: Iterable[Mapping[str, Any]]) -> Manifest:
    """Arma el manifiesto a partir de módulos ya leídos (los `content.json` como diccionarios).

    Falla con `ManifestError` si un módulo repite un número, un id de actividad se repite o no
    cumple el formato o el prefijo `m{n}_`, o falta algún campo.
    """
    activities: dict[str, ActivitySpec] = {}
    slugs: dict[int, str] = {}
    for content in contents:
        numero = content.get("numero")
        if not isinstance(numero, int) or not 1 <= numero <= MODULE_COUNT:
            raise ManifestError(f"Módulo con número inválido: {numero!r} (debe ser 1 a 6).")
        if numero in slugs:
            raise ManifestError(f"El módulo {numero} aparece más de una vez.")
        slugs[numero] = str(content.get("slug", ""))
        for seccion in content.get("secciones", []):
            seccion_id = str(seccion.get("id", ""))
            for bloque in seccion.get("bloques", []):
                if bloque.get("tipo") != "actividad":
                    continue
                activity = bloque["actividad"]
                activity_id = str(activity.get("id", ""))
                _check_id(activity_id, numero)
                if activity_id in activities:
                    raise ManifestError(f"El id de actividad {activity_id!r} está repetido.")
                try:
                    activities[activity_id] = ActivitySpec(
                        modulo=numero,
                        tipo=activity.get("tipo"),
                        puntaje_max=activity.get("puntaje_max"),
                        obligatoria=activity.get("obligatoria", True),
                        seccion=seccion_id,
                        seccion_titulo=str(seccion.get("titulo", "")).strip(),
                        concepto=str(activity.get("concepto", "")).strip(),
                    )
                except ValidationError as error:
                    raise ManifestError(
                        f"La actividad {activity_id!r} no es válida: {error}"
                    ) from error
    return Manifest(activities, slugs)


def _check_id(activity_id: str, modulo: int) -> None:
    if not _ACTIVITY_ID.match(activity_id):
        raise ManifestError(f"El id de actividad {activity_id!r} no cumple {ACTIVITY_ID_PATTERN}.")
    if not activity_id.startswith(f"m{modulo}_"):
        raise ManifestError(f"El id de actividad {activity_id!r} debe empezar por 'm{modulo}_'.")


def parse_manifest(data: Mapping[str, Any]) -> Manifest:
    """Valida el JSON del manifiesto y devuelve el objeto. `ManifestError` si algo no cuadra."""
    if data.get("version") != MANIFEST_VERSION:
        raise ManifestError(
            f"Versión de manifiesto no soportada: {data.get('version')!r} "
            f"(se esperaba {MANIFEST_VERSION})."
        )
    raw = data.get("actividades")
    if not isinstance(raw, dict) or not raw:
        raise ManifestError("El manifiesto no tiene actividades.")
    activities: dict[str, ActivitySpec] = {}
    for activity_id, spec in raw.items():
        try:
            parsed = ActivitySpec.model_validate(spec)
        except ValidationError as error:
            raise ManifestError(f"La actividad {activity_id!r} no es válida: {error}") from error
        _check_id(activity_id, parsed.modulo)
        activities[activity_id] = parsed
    slugs = {
        int(numero): entry["slug"]
        for numero, entry in (data.get("modulos") or {}).items()
        if isinstance(entry, dict) and "slug" in entry and numero.isdigit()
    }
    manifest = Manifest(activities, slugs)
    if data.get("modulos") != manifest.module_totals() or data.get("totales") != (
        manifest.overall_totals()
    ):
        raise ManifestError(
            "Los totales del manifiesto no coinciden con sus actividades: regenéralo con "
            "`python -m app.scripts.build_manifest`."
        )
    return manifest


def load_manifest(path: Path) -> Manifest:
    """Lee y valida el archivo del manifiesto."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise ManifestError(f"No se pudo leer el manifiesto {path}: {error}") from error
    if not isinstance(data, dict):
        raise ManifestError(f"El manifiesto {path} debe ser un objeto JSON.")
    return parse_manifest(data)


def render_manifest(manifest: Manifest) -> str:
    """Texto exacto que se escribe en disco: JSON con sangría, UTF-8 sin escapar, LF final."""
    return json.dumps(manifest.to_dict(), ensure_ascii=False, indent=2) + "\n"


def load_configured_manifest(settings: Settings) -> Manifest | None:
    """Manifiesto según la configuración, o `None` si no hay (la API no valida contra contenido).

    - `ACTIVITIES_MANIFEST_PATH` vacía: desactivado.
    - Ruta por defecto que no existe: sin manifiesto (desarrollo, antes de que haya contenido).
    - Ruta explícita que no existe, o archivo inválido: `ManifestError` (la API no arranca; un
      error de configuración no debe dejar la validación apagada en silencio).
    """
    path = settings.activities_manifest_path
    if path is None:
        return None
    if not path.is_file():
        if settings.manifest_is_explicit:
            raise ManifestError(
                f"ACTIVITIES_MANIFEST_PATH apunta a un archivo que no existe: {path}"
            )
        if settings.is_prod:
            logger.warning(
                "No hay manifiesto de actividades en %s: los resultados no se validan contra el "
                "contenido. Generarlo con `python -m app.scripts.build_manifest`.",
                path,
            )
        return None
    manifest = load_manifest(path)
    missing = [n for n in range(1, MODULE_COUNT + 1) if n not in manifest.modules]
    if missing:
        logger.warning("El manifiesto no incluye los módulos %s.", missing)
    return manifest


def get_manifest(request: Request) -> Manifest | None:
    """Dependencia FastAPI: el manifiesto de la app (`None` si no hay)."""
    return request.app.state.manifest


ManifestDep = Annotated[Manifest | None, Depends(get_manifest)]
