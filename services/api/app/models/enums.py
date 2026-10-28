"""Enumeraciones de dominio (fuente única; ver docs/api-contract.md).

Las columnas de la base de datos son `VARCHAR` (no `ENUM` nativo): así agregar o quitar un
valor no exige migrar tipos en PostgreSQL. La validación ocurre en los esquemas Pydantic.
"""

from enum import StrEnum


class TipoIdentificacion(StrEnum):
    """Tipos de identificación (supuesto: contexto colombiano, por confirmar con el docente)."""

    CC = "CC"
    TI = "TI"
    CE = "CE"
    PA = "PA"
    RC = "RC"
    PEP = "PEP"
    PPT = "PPT"


# Etiquetas legibles, en el mismo orden que el contrato.
TIPO_IDENTIFICACION_ETIQUETAS: dict[TipoIdentificacion, str] = {
    TipoIdentificacion.CC: "Cédula de ciudadanía",
    TipoIdentificacion.TI: "Tarjeta de identidad",
    TipoIdentificacion.CE: "Cédula de extranjería",
    TipoIdentificacion.PA: "Pasaporte",
    TipoIdentificacion.RC: "Registro civil",
    TipoIdentificacion.PEP: "Permiso especial de permanencia",
    TipoIdentificacion.PPT: "Permiso por protección temporal",
}


class Nivel(StrEnum):
    """Nivel académico: ajusta la profundidad de las explicaciones del mentor."""

    pregrado = "pregrado"
    posgrado = "posgrado"


class Rol(StrEnum):
    """`docente` no se autoasigna: se promueve por línea de comandos.

    Ver `app.scripts.promote_docente`.
    """

    estudiante = "estudiante"
    docente = "docente"


class TipoActividad(StrEnum):
    """Tipos de actividad del motor de actividades (PLAN §4)."""

    multicapa = "multicapa"
    arrastre_molecular = "arrastre-molecular"
    relacion_columnas = "relacion-columnas"
    quiz = "quiz"
    video_texto = "video-texto"
    exploracion_3d = "exploracion-3d"
    clasificacion = "clasificacion"
    curva_esfuerzo = "curva-esfuerzo"
