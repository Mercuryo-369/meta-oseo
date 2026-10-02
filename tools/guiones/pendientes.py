#!/usr/bin/env python3
"""Genera docs/revision-docente.md: la lista de revisión que se le entrega al docente.

Uso (desde la raíz del repositorio; solo necesita Python, sin dependencias):

    python tools/guiones/pendientes.py              # escribe docs/revision-docente.md
    python tools/guiones/pendientes.py --comprobar  # no escribe; sale con 1 si el archivo no está al día

Qué recoge, módulo por módulo:

- las cifras y afirmaciones pendientes que el contenido declara en `estado_revision.pendientes`
  (`apps/web/src/modules/m{n}_{slug}/content.json`), con su ubicación (sección y bloque);
- las «Notas de verificación para el docente» de cada guion (`docs/guion-por-modulo/m{n}_*.md`),
  con la fuente consultada cuando el texto la cita;
- las referencias bibliográficas que nadie ha verificado (`referencias[].verificada`);
- las decisiones de diseño que el docente debe acordar. Las cifras de esa parte (umbral del certificado,
  `aprobacion_min`, penalización, tipos de identificación, duraciones, puntajes...) se leen del propio
  repositorio, así que la lista no contradice al sistema.

Es determinista (mismos archivos, mismos bytes, sin fechas) y no cambia nada más que su salida.

Códigos de salida: 0 todo bien (o al día con --comprobar); 1 el archivo no está al día (--comprobar);
2 error de uso o un archivo del repositorio que no se pudo leer.
"""

from __future__ import annotations

import argparse
import ast
import json
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]

CASILLA = "☐"
DECISION_PENDIENTE = f"{CASILLA} confirmado<br>{CASILLA} corregir a: ________<br>{CASILLA} retirar"
DECISION_DISENO = f"{CASILLA} de acuerdo<br>{CASILLA} cambiar a: ________"
SIN_FUENTE = "Sin fuente registrada en el guion"


class ErrorDeLectura(Exception):
    """Un archivo del repositorio no tiene la forma esperada."""


# --- Lectura de constantes del repositorio ---------------------------------------------------------


@dataclass(frozen=True)
class Constantes:
    """Valores que la lista cita y que viven en el código: se leen, no se copian."""

    cert_min_porcentaje: int
    penalizacion_por_intento: float
    piso_penalizacion: float
    mentor_max_mensajes_dia: int
    modelo_mentor: str
    tipos_identificacion: tuple[tuple[str, str], ...]
    cantidad_logros: int


def _leer(ruta: Path) -> str:
    try:
        return ruta.read_text(encoding="utf-8")
    except OSError as error:
        raise ErrorDeLectura(f"No se pudo leer {ruta}: {error}") from error


def _buscar(patron: str, texto: str, ruta: Path, que: str) -> re.Match[str]:
    encontrado = re.search(patron, texto, re.MULTILINE)
    if encontrado is None:
        raise ErrorDeLectura(f"No se encontró {que} en {ruta}; ¿cambió el archivo?")
    return encontrado


def _tipos_identificacion(ruta: Path) -> tuple[tuple[str, str], ...]:
    """Lee `TipoIdentificacion` y `TIPO_IDENTIFICACION_ETIQUETAS` de app/models/enums.py con `ast`."""
    arbol = ast.parse(_leer(ruta))
    codigos: dict[str, str] = {}
    etiquetas: dict[str, str] = {}
    for nodo in arbol.body:
        if isinstance(nodo, ast.ClassDef) and nodo.name == "TipoIdentificacion":
            for item in nodo.body:
                if (
                    isinstance(item, ast.Assign)
                    and isinstance(item.targets[0], ast.Name)
                    and isinstance(item.value, ast.Constant)
                ):
                    codigos[item.targets[0].id] = str(item.value.value)
        objetivo = None
        if isinstance(nodo, ast.AnnAssign) and isinstance(nodo.target, ast.Name):
            objetivo = nodo.target.id
        if objetivo == "TIPO_IDENTIFICACION_ETIQUETAS" and isinstance(nodo.value, ast.Dict):  # type: ignore[union-attr]
            for clave, valor in zip(nodo.value.keys, nodo.value.values, strict=False):  # type: ignore[union-attr]
                if isinstance(clave, ast.Attribute) and isinstance(valor, ast.Constant):
                    etiquetas[clave.attr] = str(valor.value)
    if not codigos:
        raise ErrorDeLectura(f"No se encontró TipoIdentificacion en {ruta}.")
    return tuple((codigo, etiquetas.get(nombre, codigo)) for nombre, codigo in codigos.items())


def leer_constantes(raiz: Path) -> Constantes:
    settings = raiz / "services" / "api" / "app" / "core" / "settings.py"
    texto = _leer(settings)
    cert = _buscar(r"^\s*cert_min_porcentaje:\s*int\s*=\s*Field\(default=(\d+)", texto, settings, "cert_min_porcentaje")
    mensajes = _buscar(
        r"^\s*mentor_max_mensajes_dia:\s*int\s*=\s*Field\(default=(\d+)", texto, settings, "mentor_max_mensajes_dia"
    )
    modelo = _buscar(r'^\s*anthropic_model:\s*str\s*=\s*"([^"]+)"', texto, settings, "anthropic_model")

    constantes_ts = raiz / "apps" / "web" / "src" / "content" / "constantes.ts"
    texto_ts = _leer(constantes_ts)
    por_intento = _buscar(
        r"export const PENALIZACION_POR_INTENTO_DEFECTO\s*=\s*([\d.]+)",
        texto_ts,
        constantes_ts,
        "la penalización por intento",
    )
    piso = _buscar(
        r"export const PISO_PENALIZACION_DEFECTO\s*=\s*([\d.]+)", texto_ts, constantes_ts, "el piso de la penalización"
    )

    logros = raiz / "services" / "api" / "app" / "services" / "achievements.py"
    # La definición de la clase no lleva comillas tras el paréntesis: solo cuentan las entradas del catálogo.
    cantidad_logros = len(re.findall(r'AchievementDef\("', _leer(logros)))

    return Constantes(
        cert_min_porcentaje=int(cert.group(1)),
        penalizacion_por_intento=float(por_intento.group(1)),
        piso_penalizacion=float(piso.group(1)),
        mentor_max_mensajes_dia=int(mensajes.group(1)),
        modelo_mentor=modelo.group(1),
        tipos_identificacion=_tipos_identificacion(raiz / "services" / "api" / "app" / "models" / "enums.py"),
        cantidad_logros=cantidad_logros,
    )


# --- Utilidades de texto ---------------------------------------------------------------------------


def celda(texto: str) -> str:
    """Deja un texto listo para una celda de tabla Markdown (sin saltos de línea ni `|` sueltos)."""
    plano = re.sub(r"\s*\n\s*", " ", texto.strip())
    return plano.replace("|", "\\|")


def coma(valor: float) -> str:
    """Número con coma decimal: 0.1 → «0,1»; 70.0 → «70»."""
    entero = int(valor)
    return str(entero) if entero == valor else str(valor).replace(".", ",")


def plural(n: int, singular: str, plural_: str) -> str:
    return f"{n} {singular if n == 1 else plural_}"


def texto_plano_markdown(markdown: str, maximo: int = 60) -> str:
    """Primeras palabras de un texto Markdown, sin marcas, para describir un bloque."""
    limpio = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", markdown)
    limpio = re.sub(r"[*_`#>]", "", limpio)
    limpio = re.sub(r"\s+", " ", limpio).strip()
    if len(limpio) <= maximo:
        return limpio
    corte = limpio.rfind(" ", 0, maximo)
    return limpio[: corte if corte > 20 else maximo].rstrip(" ,;:.") + "…"


def slug_github(titulo: str) -> str:
    """Ancla que GitHub y VS Code generan para un encabezado (para comprobar enlaces)."""
    minusculas = titulo.strip().lower()
    minusculas = re.sub(r"[`*_~]", "", minusculas)
    minusculas = re.sub(r"[^\w\s-]", "", minusculas)
    return re.sub(r"\s", "-", minusculas)


# --- Módulos: ubicación de cada id -------------------------------------------------------------------


@dataclass(frozen=True)
class Lugar:
    orden: tuple[int, int]
    seccion: str | None
    seccion_titulo: str
    bloque_id: str | None
    bloque_desc: str
    detalle: str = ""

    def describir(self) -> str:
        if self.seccion is None:
            return self.bloque_desc
        partes = [f"Sección {self.seccion} «{self.seccion_titulo}»"]
        if self.bloque_id is not None:
            partes.append(f"{self.bloque_desc} `{self.bloque_id}`")
        if self.detalle:
            partes.append(self.detalle)
        return "<br>".join(partes)


@dataclass
class Modulo:
    numero: int
    carpeta: str
    datos: dict
    guion: Path | None
    lugares: dict[str, Lugar] = field(default_factory=dict)
    secciones: dict[str, str] = field(default_factory=dict)  # "1.2" → título

    @property
    def titulo(self) -> str:
        return str(self.datos.get("titulo", self.carpeta))

    @property
    def estado(self) -> str:
        return str(self.datos.get("estado_revision", {}).get("estado", "borrador"))

    @property
    def pendientes(self) -> list[dict]:
        return list(self.datos.get("estado_revision", {}).get("pendientes", []))

    @property
    def referencias(self) -> list[dict]:
        return list(self.datos.get("referencias", []))


def numero_de_seccion(modulo: int, posicion: int, id_seccion: str) -> str:
    """`m4_3_vesiculas_ppi` → «4.3»; sin ese patrón, la posición dentro del módulo."""
    encontrado = re.match(r"^m\d+_(\d+)_", id_seccion)
    return f"{modulo}.{encontrado.group(1) if encontrado else posicion + 1}"


def _describir_bloque(bloque: dict) -> tuple[str | None, str]:
    """(id, descripción corta) de un bloque de sección."""
    tipo = bloque.get("tipo")
    if tipo == "actividad":
        actividad = bloque.get("actividad", {})
        titulo = actividad.get("titulo", "")
        return actividad.get("id"), f"Actividad {actividad.get('tipo', '')} «{titulo}»"
    titulo = bloque.get("titulo") or texto_plano_markdown(str(bloque.get("markdown", bloque.get("pie", ""))))
    etiqueta = {"texto": "Texto", "callout": "Aviso", "tabla": "Tabla", "imagen": "Imagen"}.get(str(tipo), "Bloque")
    return bloque.get("id"), f"{etiqueta} «{titulo}»" if titulo else etiqueta


def indexar(datos: dict, numero: int) -> tuple[dict[str, Lugar], dict[str, str]]:
    """Ubicación de cada id del módulo. Si un id se repite, gana el de la sección o el bloque."""
    lugares: dict[str, Lugar] = {}
    secciones: dict[str, str] = {}

    def registrar(id_: object, lugar: Lugar) -> None:
        if isinstance(id_, str) and id_ not in lugares:
            lugares[id_] = lugar

    def recorrer(objeto: object, base: Lugar) -> None:
        if isinstance(objeto, dict):
            for valor in objeto.values():
                recorrer(valor, base)
            id_ = objeto.get("id")
            if isinstance(id_, str) and id_ != base.bloque_id:
                detalle = f"Elemento `{id_}`"
                registrar(
                    id_,
                    Lugar(base.orden, base.seccion, base.seccion_titulo, base.bloque_id, base.bloque_desc, detalle),
                )
        elif isinstance(objeto, list):
            for elemento in objeto:
                recorrer(elemento, base)

    ficha = Lugar((-1, 0), None, "", None, "Ficha del módulo (título, duración, objetivos)")
    registrar(datos.get("id"), ficha)
    registrar(f"m{numero}", ficha)

    for posicion, seccion in enumerate(datos.get("secciones", [])):
        numero_seccion = numero_de_seccion(numero, posicion, str(seccion.get("id", "")))
        titulo = str(seccion.get("titulo", ""))
        secciones[numero_seccion] = titulo
        registrar(seccion.get("id"), Lugar((posicion, -1), numero_seccion, titulo, None, ""))
    for posicion, seccion in enumerate(datos.get("secciones", [])):
        numero_seccion = numero_de_seccion(numero, posicion, str(seccion.get("id", "")))
        titulo = str(seccion.get("titulo", ""))
        for orden, bloque in enumerate(seccion.get("bloques", [])):
            id_bloque, descripcion = _describir_bloque(bloque)
            base = Lugar((posicion, orden), numero_seccion, titulo, id_bloque, descripcion)
            registrar(id_bloque, base)
    for posicion, seccion in enumerate(datos.get("secciones", [])):
        numero_seccion = numero_de_seccion(numero, posicion, str(seccion.get("id", "")))
        titulo = str(seccion.get("titulo", ""))
        for orden, bloque in enumerate(seccion.get("bloques", [])):
            id_bloque, descripcion = _describir_bloque(bloque)
            base = Lugar((posicion, orden), numero_seccion, titulo, id_bloque, descripcion)
            recorrer(bloque, base)
    for termino in datos.get("glosario", []):
        registrar(
            termino.get("id"),
            Lugar((900, 0), None, "", None, f"Glosario: término «{termino.get('termino', termino.get('id'))}»"),
        )
    for referencia in datos.get("referencias", []):
        registrar(
            referencia.get("id"), Lugar((901, 0), None, "", None, f"Referencia bibliográfica `{referencia.get('id')}`")
        )
    return lugares, secciones


def cargar_modulos(carpeta_modulos: Path, carpeta_guiones: Path) -> list[Modulo]:
    modulos: list[Modulo] = []
    for carpeta in sorted(carpeta_modulos.glob("m[1-6]_*")):
        ruta = carpeta / "content.json"
        if not ruta.is_file():
            continue
        try:
            datos = json.loads(ruta.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise ErrorDeLectura(f"No se pudo leer {ruta}: {error}") from error
        numero = int(carpeta.name[1])
        guiones = sorted(carpeta_guiones.glob(f"m{numero}_*.md"))
        modulo = Modulo(numero, carpeta.name, datos, guiones[0] if guiones else None)
        modulo.lugares, modulo.secciones = indexar(datos, numero)
        modulos.append(modulo)
    if not modulos:
        raise ErrorDeLectura(f"No hay módulos m1_* a m6_* con content.json en {carpeta_modulos}.")
    return modulos


# --- Notas de verificación de los guiones -----------------------------------------------------------


@dataclass
class Nota:
    numero_guion: str | None  # el número con el que aparece en el guion, si lo trae
    grupo: str
    texto: str
    tipo: str  # lista, viñeta, tabla, párrafo


ITEM_NUMERADO = re.compile(r"^\s*(\d+)\.\s+(.*\S)\s*$")
ITEM_VINIETA = re.compile(r"^\s*[-*]\s+(.*\S)\s*$")
ENCABEZADO = re.compile(r"^#{3,6}\s+(.*\S)\s*$")
NEGRITA_SOLA = re.compile(r"^\*\*([^*]+)\*\*\s*$")
FILA_TABLA = re.compile(r"^\s*\|(.+)\|\s*$")
SEPARADOR_TABLA = re.compile(r"^\s*\|?\s*:?-{3,}")


def _celdas(linea: str) -> list[str]:
    interior = linea.strip()
    interior = interior[1:] if interior.startswith("|") else interior
    interior = interior[:-1] if interior.endswith("|") and not interior.endswith("\\|") else interior
    return [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", interior)]


def _limpiar_grupo(texto: str) -> str:
    return re.sub(r"\s+", " ", texto.replace("**", "").strip().rstrip(":"))


def seccion_de_notas(texto: str) -> list[str]:
    """Líneas de «## Notas de verificación…» hasta el siguiente encabezado de nivel 2."""
    lineas = texto.splitlines()
    inicio = next((i for i, linea in enumerate(lineas) if re.match(r"^##\s+Notas de verificaci[oó]n", linea)), None)
    if inicio is None:
        return []
    fin = next((i for i in range(inicio + 1, len(lineas)) if re.match(r"^##\s+\S", lineas[i])), len(lineas))
    return lineas[inicio + 1 : fin]


# Notas del guion que hablan de cómo se escribió el archivo, no de contenido que el docente deba confirmar.
NOTAS_TECNICAS = ("Convenciones de este archivo",)


def registro_de_revision(texto: str) -> str:
    """Párrafo introductorio de «## Registro de revisión»: qué contrastó la revisión científica y con qué fuentes."""
    lineas = texto.splitlines()
    inicio = next((i for i, linea in enumerate(lineas) if re.match(r"^##\s+Registro de revisi[oó]n", linea)), None)
    if inicio is None:
        return ""
    parrafo: list[str] = []
    for linea in lineas[inicio + 1 :]:
        if re.match(r"^##\s+\S", linea) or FILA_TABLA.match(linea):
            break
        if not linea.strip():
            if parrafo:
                break
            continue
        parrafo.append(linea.strip())
    return re.sub(r"\s+", " ", " ".join(parrafo))


def parsear_notas(texto: str) -> list[Nota]:
    """Extrae cada nota del guion: lista numerada, viñeta, fila de tabla o párrafo suelto.

    Un párrafo que termina en «:» se toma como encabezado del grupo que sigue. Lo que aparece antes
    del primer encabezado o elemento es la introducción y no se recoge.
    """
    notas: list[Nota] = []
    grupo = ""
    actual: Nota | None = None
    visto_estructura = False
    encabezados_tabla: list[str] | None = None

    def cerrar() -> None:
        nonlocal actual
        if actual is not None:
            actual.texto = re.sub(r"\s+", " ", actual.texto).strip()
            if not actual.texto.startswith(NOTAS_TECNICAS):
                notas.append(actual)
            actual = None

    for linea in seccion_de_notas(texto):
        if not linea.strip():
            cerrar()
            encabezados_tabla = None if not FILA_TABLA.match(linea) else encabezados_tabla
            continue
        encabezado = ENCABEZADO.match(linea) or NEGRITA_SOLA.match(linea)
        if encabezado:
            cerrar()
            grupo = _limpiar_grupo(encabezado.group(1))
            visto_estructura = True
            encabezados_tabla = None
            continue
        fila = FILA_TABLA.match(linea)
        if fila:
            cerrar()
            celdas = _celdas(linea)
            if SEPARADOR_TABLA.match(linea):
                continue
            if encabezados_tabla is None:
                encabezados_tabla = celdas
                visto_estructura = True
                continue
            visto_estructura = True
            numero = celdas[0] if celdas and re.fullmatch(r"\d+", celdas[0]) else None
            cuerpo = celdas[1:] if numero else celdas
            nombres = encabezados_tabla[1:] if numero else encabezados_tabla
            piezas = []
            for i, valor in enumerate(cuerpo):
                if not valor:
                    continue
                if i == 0:
                    piezas.append(valor)
                else:
                    nombre = nombres[i] if i < len(nombres) else ""
                    piezas.append(f"**{nombre}:** {valor}" if nombre else valor)
            notas.append(Nota(numero, grupo, " ".join(piezas), "tabla"))
            continue
        item = ITEM_NUMERADO.match(linea)
        if item:
            cerrar()
            visto_estructura = True
            actual = Nota(item.group(1), grupo, item.group(2), "lista")
            continue
        vineta = ITEM_VINIETA.match(linea)
        if vineta:
            cerrar()
            visto_estructura = True
            actual = Nota(None, grupo, vineta.group(1), "viñeta")
            continue
        if actual is not None:
            actual.texto += " " + linea.strip()
            continue
        if not visto_estructura:
            continue  # introducción
        if linea.strip().endswith(":") and len(linea.strip()) < 160:
            grupo = _limpiar_grupo(linea)
            continue
        actual = Nota(None, grupo, linea.strip(), "párrafo")
    cerrar()
    return notas


# --- Fuentes consultadas ---------------------------------------------------------------------------

_NOMBRE = r"[A-ZÁÉÍÓÚÑ][\wáéíóúñü'’-]+"
_AUTORES = rf"{_NOMBRE}(?:\s+(?:y|e|et al\.?)\s+(?:colaboradores|{_NOMBRE}|al\.?))?(?:\s+y\s+{_NOMBRE})?"
_ANIO = r"(?:19[5-9]\d|20[0-4]\d)"
FUENTES = [
    re.compile(rf"\b({_AUTORES}),?\s+\(?({_ANIO})\)?(?:\s+\(([A-Za-z][\w .&-]{{1,40}})\))?"),
    re.compile(rf"\b([A-Z]{{3,6}})\s+\(({_ANIO})\)"),
    re.compile(rf"\b(consenso d\w+ [A-Z]{{2,6}}) de ({_ANIO})"),
]
# «Diegel et al. y Moriishi et al., PLoS Genetics»: autores y revista, sin año en el texto.
FUENTE_CON_REVISTA = re.compile(rf"\b({_NOMBRE} et al\.(?: y {_NOMBRE} et al\.)?),\s+([A-Z]\w+(?: [A-Z]\w+)?)")
PALABRAS_NO_AUTOR = {"Se", "En", "El", "La", "Los", "Las", "Un", "Una", "Desde", "Hasta", "Entre", "Hoy", "Mayo"}


def fuentes_citadas(texto: str) -> list[str]:
    """Citas del estilo «Schropp 2003», «Araújo y Lindhe (2005)» o «consenso del NIH de 2000»."""
    halladas: list[str] = []
    for patron in FUENTES:
        for m in patron.finditer(texto):
            autor = m.group(1)
            if autor.split()[0] in PALABRAS_NO_AUTOR:
                continue
            cita = f"{autor} ({m.group(2)})"
            if m.lastindex and m.lastindex >= 3 and m.group(3):
                cita += f", {m.group(3)}"
            if cita not in halladas:
                halladas.append(cita)
    for m in FUENTE_CON_REVISTA.finditer(texto):
        cita = f"{m.group(1)}, {m.group(2)}"
        if cita not in halladas:
            halladas.append(cita)
    return halladas


def texto_de_fuente(citas: list[str]) -> str:
    return "; ".join(citas) if citas else SIN_FUENTE


# --- Ubicación de las notas del guion --------------------------------------------------------------

SECCION_EN_TEXTO = re.compile(r"[Ss]ecci[oó]n(?:es)?\s+(\d\.\d(?:\s*(?:,|y|a|e|–|-)\s*\d\.\d)*)")
NUMERO_SECCION = re.compile(r"\d\.\d")


def secciones_mencionadas(texto: str, grupo: str) -> list[str]:
    for fuente in (texto, grupo):
        for m in SECCION_EN_TEXTO.finditer(fuente):
            numeros: list[str] = []
            for n in NUMERO_SECCION.findall(m.group(1)):
                if n not in numeros:
                    numeros.append(n)
            if numeros:
                return numeros
    return []


def ubicar_nota(nota: Nota, modulo: Modulo) -> str:
    secciones = secciones_mencionadas(nota.texto, nota.grupo)
    partes: list[str] = []
    for numero in secciones[:4]:
        titulo = modulo.secciones.get(numero)
        partes.append(f"Sección {numero} «{titulo}»" if titulo else f"Sección {numero}")
    ids: list[str] = []
    for id_ in re.findall(r"`([a-z][a-z0-9_]{2,63})`", nota.texto):
        if id_ in modulo.lugares and id_ not in ids:
            ids.append(id_)
    if ids:
        partes.append("Elementos: " + ", ".join(f"`{i}`" for i in ids[:5]))
    if not partes:
        if "(Ficha" in nota.texto or "Ficha)" in nota.texto or nota.texto.lower().startswith("duración"):
            return "Ficha del módulo"
        return f"General: {nota.grupo}" if nota.grupo else "General del módulo"
    return "<br>".join(partes)


# --- Filas ---------------------------------------------------------------------------------------------


def _resumen_de_pendiente(nota: str) -> str:
    """«Confirmar: «dato»» → el dato tal como aparece; otra nota se deja entera.

    Un dato que era una fila de tabla (`| Fase mineral | Cristales… |`) se muestra separado por « · »;
    una viñeta pierde su guion.
    """
    m = re.match(r"^Confirmar:\s*[«\"“](.*)[»\"”]\s*$", nota.strip(), re.DOTALL)
    dato = m.group(1).strip() if m else nota.strip()
    if "|" in dato:
        dato = " · ".join(c.strip() for c in dato.split("|") if c.strip())
    dato = re.sub(r"^[-*]\s+", "", dato)
    return f"«{dato}»" if m else dato


PALABRAS_VACIAS = frozenset(
    [
        "aproximadamente",
        "confirmar",
        "segun",
        "textos",
        "fuentes",
        "varian",
        "cifra",
        "sigue",
        "discute",
        "mientras",
        "porque",
        "tambien",
        "cuando",
        "puede",
        "pueden",
        "estudios",
        "evidencia",
        "algunas",
        "algunos",
        "ademas",
        "durante",
        "desde",
        "hasta",
        "entre",
        "sobre",
    ]
)


def _palabras(texto: str) -> set[str]:
    sin_tildes = unicodedata.normalize("NFD", texto.lower())
    sin_tildes = "".join(c for c in sin_tildes if unicodedata.category(c) != "Mn")
    return {p for p in re.findall(r"[a-z0-9]{6,}", sin_tildes) if p not in PALABRAS_VACIAS}


def notas_de_contexto(pendiente: dict, lugar: Lugar, notas: list[tuple[str, Nota]], modulo: Modulo) -> list[str]:
    """Referencias (`M1-N09`) de las notas del guion que dan contexto a un pendiente.

    Cuenta una nota si nombra el id del pendiente entre comillas invertidas, o si trata la misma sección y
    comparte al menos dos palabras significativas con el dato.
    """
    id_ = str(pendiente.get("id"))
    palabras = _palabras(str(pendiente.get("nota", "")))
    candidatas: list[tuple[int, int, str]] = []
    for posicion, (referencia, nota) in enumerate(notas):
        if f"`{id_}`" in nota.texto:
            candidatas.append((-100, posicion, referencia))
            continue
        if lugar.seccion is not None and lugar.seccion in secciones_mencionadas(nota.texto, nota.grupo):
            comunes = len(palabras & _palabras(nota.texto))
            if comunes >= 2:
                candidatas.append((-comunes, posicion, referencia))
    candidatas.sort()
    return [referencia for _, _, referencia in candidatas[:2]]


def filas_pendientes(modulo: Modulo, notas_guion: list[Nota]) -> list[tuple[Lugar, dict, str]]:
    """Pendientes del contenido, en el orden en que aparecen (sección, bloque, orden original)."""
    desconocido = Lugar((999, 0), None, "", None, "Sin ubicación (el id ya no existe en el módulo)")
    con_referencia = [(f"M{modulo.numero}-N{i:02d}", nota) for i, nota in enumerate(notas_guion, start=1)]
    orden: list[tuple[tuple[int, int, int], Lugar, dict]] = []
    for indice, pendiente in enumerate(modulo.pendientes):
        lugar = modulo.lugares.get(str(pendiente.get("id")), desconocido)
        orden.append(((*lugar.orden, indice), lugar, pendiente))
    orden.sort(key=lambda t: t[0])
    resultado: list[tuple[Lugar, dict, str]] = []
    for _, lugar, pendiente in orden:
        id_ = str(pendiente.get("id"))
        citas = fuentes_citadas(str(pendiente.get("nota", "")))
        for nota in notas_guion:
            if f"`{id_}`" in nota.texto:
                for cita in fuentes_citadas(nota.texto):
                    if cita not in citas:
                        citas.append(cita)
        fuente = texto_de_fuente(citas)
        contexto = notas_de_contexto(pendiente, lugar, con_referencia, modulo)
        if contexto:
            fuente += "<br>Contexto en " + ", ".join(contexto)
        resultado.append((lugar, pendiente, fuente))
    return resultado


# --- Decisiones de diseño ------------------------------------------------------------------------------


@dataclass(frozen=True)
class Decision:
    codigo: str
    tema: str
    situacion: str
    donde: str


def _suma(modulos: list[Modulo], clave: str) -> int:
    return sum(len(m.datos.get(clave, [])) for m in modulos)


def _actividades(modulo: Modulo) -> list[dict]:
    actividades: list[dict] = []
    for seccion in modulo.datos.get("secciones", []):
        for bloque in seccion.get("bloques", []):
            if bloque.get("tipo") == "actividad":
                actividades.append(bloque["actividad"])
    return actividades


def _contar_niveles(modulo: Modulo) -> int:
    total = 0
    for seccion in modulo.datos.get("secciones", []):
        total += sum(1 for b in seccion.get("bloques", []) if b.get("nivel") == "posgrado")
    return total


def decisiones(modulos: list[Modulo], c: Constantes) -> list[Decision]:
    """Decisiones que el docente debe acordar. Lo que cambia con el repositorio se lee de él."""
    todas = [(m, a) for m in modulos for a in _actividades(m)]
    obligatorias = [(m, a) for m, a in todas if a.get("obligatoria", True)]
    aprobacion = [(m, a) for m, a in todas if a.get("aprobacion_min") is not None]
    con_penalizacion = [a["id"] for _, a in todas if "penalizacion" in a]
    videos = [a for _, a in todas if a.get("config", {}).get("medio") == "video"]
    factor4 = 1 - c.penalizacion_por_intento * 3
    intento_piso = int((1 - c.piso_penalizacion) / c.penalizacion_por_intento + 1e-9) + 1
    referencias = sum(len(m.referencias) for m in modulos)
    sin_verificar = sum(1 for m in modulos for r in m.referencias if not r.get("verificada"))
    por_modulo_aprobacion = {m.numero: [] for m in modulos}
    for m, a in aprobacion:
        por_modulo_aprobacion[m.numero].append(f"{a['id']} ({coma(float(a['aprobacion_min']) * 100)} %)")
    lineas_aprobacion = "; ".join(
        f"M{n}: " + (", ".join(v) if v else "sin umbral") for n, v in sorted(por_modulo_aprobacion.items())
    )
    sin_umbral = sorted(n for n, v in por_modulo_aprobacion.items() if not v)
    nota_sin_umbral = (
        f"Los módulos sin umbral ({', '.join(f'M{n}' for n in sin_umbral)}) no exigen acierto en su evaluación final. "
        if sin_umbral
        else "Los seis módulos tienen umbral. "
    )
    duraciones = "; ".join(f"M{m.numero}: {m.datos.get('duracion_estimada_min', '?')} min" for m in modulos)
    puntos = "; ".join(
        f"M{m.numero}: {sum(int(a.get('puntaje_max', 0)) for a in _actividades(m))} puntos "
        f"({sum(1 for a in _actividades(m) if a.get('obligatoria', True))} de {len(_actividades(m))} actividades obligatorias)"
        for m in modulos
    )
    niveles = "; ".join(f"M{m.numero}: {_contar_niveles(m)}" for m in modulos)
    tipos = ", ".join(f"{codigo} ({etiqueta})" for codigo, etiqueta in c.tipos_identificacion)

    return [
        Decision(
            "D01",
            "Umbral del certificado",
            f"El certificado se emite con los 6 módulos completados y al menos el {c.cert_min_porcentaje} % del puntaje máximo "
            f"de las actividades **obligatorias** ({len(obligatorias)} actividades). Con la penalización actual, "
            f"{c.cert_min_porcentaje} % equivale a acertar todo en el 4.º intento (factor {coma(factor4)}): quien necesite más "
            f"intentos por actividad no llega. Las respuestas viajan en el navegador, así que el puntaje mide participación "
            f"y estudio, no es una evaluación segura. Propuesta nuestra, no requisito del briefing. ¿Se mantiene, se sube o se baja?",
            "Variable `CERT_MIN_PORCENTAJE` (`.env`, valor por defecto en `services/api/app/core/settings.py`)",
        ),
        Decision(
            "D02",
            "Umbral de aprobación de las evaluaciones finales (`aprobacion_min`)",
            f"Mínimo de acierto (precisión, no puntaje) para dar por superada una actividad obligatoria; sin él basta con "
            f"terminarla. Hoy: {lineas_aprobacion}. Los guiones proponían 60 % (módulo 1) o 70 %. {nota_sin_umbral}"
            "¿Un umbral único para los seis? ¿Cuál?",
            '`"aprobacion_min"` en la evaluación final de cada `content.json` (0,5 a 1)',
        ),
        Decision(
            "D03",
            "Penalización por intento y piso de puntaje",
            f"Cada intento adicional resta el {coma(c.penalizacion_por_intento * 100)} % del puntaje, hasta un piso del "
            f"{coma(c.piso_penalizacion * 100)} % (se alcanza desde el intento {intento_piso}). Repetir una actividad no "
            f"acumula puntos: cuenta el mejor intento. "
            + (
                "Ninguna actividad cambia estos valores. "
                if not con_penalizacion
                else f"Actividades con valores propios: {', '.join(con_penalizacion)}. "
            )
            + "¿Se acepta, se suaviza (menos castigo) o se elimina?",
            "`PENALIZACION_POR_INTENTO_DEFECTO` y `PISO_PENALIZACION_DEFECTO` en `apps/web/src/content/constantes.ts`; "
            'por actividad, `"penalizacion"` en el `content.json`',
        ),
        Decision(
            "D04",
            "Tipos de identificación (Colombia)",
            f"El registro ofrece: {tipos}. Es un supuesto de contexto colombiano que nadie ha confirmado. ¿Falta alguno "
            "(por ejemplo, otro documento de estudiantes extranjeros) o sobra alguno?",
            "`services/api/app/models/enums.py` y `apps/web/src/lib/identificacion.ts` (cambiar ambos)",
        ),
        Decision(
            "D05",
            "Acceso sin contraseña",
            "Hoy se entra con tipo y número de documento, sin contraseña ni código: quien conozca el documento de otra "
            "persona puede entrar como ella. Se aceptó para el piloto. Antes de abrirlo al público hay que decidir si se "
            "exige una contraseña o un código enviado al correo (tarea F6-08).",
            "Tarea F6-08 del `TODO.md` (requiere desarrollo)",
        ),
        Decision(
            "D06",
            "Hormonas óseas controvertidas (módulo 1)",
            "FGF23 es un mecanismo establecido. Osteocalcina y lipocalina 2 como hormonas provienen sobre todo de un grupo "
            "de investigación, y en 2020 dos grupos independientes no reprodujeron el efecto metabólico de la osteocalcina. "
            "Se presentan como «hipótesis en estudio», pero la actividad de arrastre las incluye y puntúa. ¿Se mantienen así, "
            "se reducen a FGF23 o se retiran? (ver la nota de verificación del guion sobre las hormonas óseas del módulo 1)",
            "`m1_2_hormonas_oseas` y bloques de 1.2 en `m1_conociendo_el_hueso/content.json`",
        ),
        Decision(
            "D07",
            "Hipótesis en disputa presentadas como tales",
            "Varios puntos se enseñan como «se propone» o «se discute» porque la literatura no cierra el debate: destino de los "
            "condrocitos hipertróficos, contribución del cartílago de Meckel a la sínfisis, RANKL del osteocito en humanos, "
            "fosfato de calcio amorfo como precursor del mineral, papel de ANKH y del pirofosfato, mecanismo del cilio primario, "
            "senescencia celular y AGE (productos de glicación) como causa o marcador del envejecimiento óseo. Cada uno está "
            "en las tablas de este documento. ¿Se enseñan como hipótesis, se simplifican a la versión clásica o se retiran?",
            "Textos y explicaciones de los módulos 2, 3, 4 y 6 (`content.json`)",
        ),
        Decision(
            "D08",
            "Ley de Wolff y ortodoncia; «mecanostato»",
            "El módulo 1 presenta la ortodoncia como remodelado dirigido por el ligamento periodontal (resorción del lado "
            "comprimido, formación del traccionado), no como «más carga, más hueso». El módulo 6 usa el término «adaptación a "
            "la carga (mecanostato)». ¿El docente comparte el enfoque y el término?",
            "Módulos 1, 3 y 6",
        ),
        Decision(
            "D09",
            "Profundidad para pregrado y bloques «para profundizar»",
            f"Bloques marcados solo para posgrado (plegables y fuera de la evaluación): {niveles}. El módulo 4 no tiene ninguno y "
            "su guion pide decidir si los detalles de ENPP1, ANKH, PiT-1 y la tabla de proteínas no colágenas pasan a "
            "profundización, aunque hoy están en el camino obligatorio porque el arrastre y la evaluación los usan.",
            'Campo `"nivel": "posgrado"` de cada bloque; en el módulo 4 requiere rehacer actividades',
        ),
        Decision(
            "D10",
            "Terminología",
            "Nombres que el borrador eligió y el docente debe confirmar: «resorción» (con «reabsorción» como sinónimo) frente a "
            "«remodelación»; ONM frente a MRONJ; «osteopenia» frente a «baja masa ósea»; «fosfatasa alcalina» frente a TNAP; "
            "«hueso alveolar propio», «hueso fasciculado» y «bundle bone» como sinónimos; nomenclatura de los linajes "
            "(preosteoblasto, célula osteoprogenitora, CFU-GM).",
            "Glosario y textos de cada `content.json`",
        ),
        Decision(
            "D11",
            "Duración de cada módulo y sesiones",
            f"Tiempos estimados por cálculo (palabras y actividades), no medidos con estudiantes: {duraciones}. Los guiones "
            "recomiendan repartir los módulos densos en dos o tres sesiones. ¿Se acepta el reparto o se recorta contenido? "
            "Conviene una prueba con 5 a 10 estudiantes (tarea F6-04).",
            "`duracion_estimada_min` de cada `content.json`",
        ),
        Decision(
            "D12",
            "Puntajes, actividades obligatorias y logros",
            f"Puntaje máximo por módulo y cuántas actividades son obligatorias: {puntos}. Todo el reparto es propuesta nuestra. "
            f"Hoy hay {c.cantidad_logros} logros, uno por módulo completado; los logros transversales que menciona el plan "
            "(«sin errores en un módulo», «preguntó al mentor 10 veces») no existen todavía. Cada logro se otorga al "
            "completar el módulo: todas las obligatorias superadas y, donde hay `aprobacion_min` (D02), con ese acierto mínimo. "
            "El servidor solo comprueba que estén completadas, no el acierto. "
            "¿Se aprueba el reparto? ¿Se quieren logros transversales?",
            "`puntaje_max` y `obligatoria` de cada actividad; catálogo en `services/api/app/services/achievements.py`",
        ),
        Decision(
            "D13",
            "Bloqueo por secuencia",
            "Por defecto, un módulo se abre cuando el anterior está completo y, dentro de un módulo, una sección se abre al "
            "completar las actividades obligatorias de la anterior (requisito del briefing: el estudiante actúa para avanzar). "
            "Para revisar el contenido sin completarlo, el docente puede desactivarlo (ver la guía del docente). ¿Se mantiene "
            "activo en producción?",
            "`VITE_BLOQUEO_SECUENCIAL=false` al compilar (`apps/web/src/config.ts`)",
        ),
        Decision(
            "D14",
            "Modelo 3D de la mandíbula",
            "El modelo provisional es BodyParts3D (FJ6399), licencia CC BY-SA 2.1 Japón: exige atribución y que los derivados "
            "se compartan igual. Los puntos de interés de cada estructura están colocados por aproximación sobre una sola malla. "
            "¿El docente tiene un modelo propio o prefiere este? No hay modelos 3D de células: las células se ven en dibujos SVG y "
            "el único otro 3D es una escena del remodelado (BMU) generada por programa, un prototipo cuya forma de las células "
            "también debe revisar el docente.",
            "`apps/web/public/models/`, `docs/atribuciones.md`",
        ),
        Decision(
            "D15",
            "Videos reales",
            f"Hoy hay {len(videos)} videos reales: las explicaciones son animaciones SVG paso a paso con transcripción. Si el "
            "docente aporta videos, cada uno necesita subtítulos y transcripción (requisito de accesibilidad). ¿Los habrá? "
            "¿En qué módulos?",
            'Actividades `video-texto` con `"medio": "video"` (ver la guía del docente)',
        ),
        Decision(
            "D16",
            "Referencias bibliográficas",
            f"Los módulos citan {referencias} referencias y {sin_verificar} siguen marcadas como no verificadas. Algunas no traen "
            "volumen, páginas ni DOI porque no se pudieron confirmar. ¿El docente las verifica o las reemplaza por las del curso?",
            "`referencias[].verificada` de cada `content.json`; tabla de referencias de cada módulo en este documento",
        ),
        Decision(
            "D17",
            "Alcance clínico y ejemplos",
            "El módulo 6 incluye farmacología básica (mecanismos, sin dosis ni nombres comerciales) y osteonecrosis de los "
            "maxilares con prudencia clínica. Los síndromes usados como ejemplo (Treacher Collins, displasia cleidocraneal, "
            "esclerosteosis, osteopetrosis, Paget...) son de libros de texto. ¿Nivel de detalle clínico adecuado? ¿Casos propios?",
            "Módulos 2, 3, 5 y 6",
        ),
        Decision(
            "D18",
            "Mentor de IA: límites y alcance",
            f"El mentor usa el modelo `{c.modelo_mentor}`, responde solo con el material del curso, no resuelve actividades ni da "
            f"indicaciones clínicas, y cada estudiante tiene un tope de {c.mentor_max_mensajes_dia} mensajes por día "
            "(costo estimado en el panel del docente). Está sin probar con una clave real. ¿Los límites y el tono son "
            "los que quiere el docente?",
            "`MENTOR_MAX_MENSAJES_DIA` en `.env`; reglas del mentor en `services/api/app/ai/prompts/mentor_v1.md`",
        ),
        Decision(
            "D19",
            "Datos personales de los estudiantes",
            "El sistema guarda nombre, apellido, tipo y número de documento. El panel del docente muestra el documento "
            "enmascarado (solo los últimos 3 caracteres) y el CSV lo enmascara salvo confirmación expresa; el certificado "
            "público también lo enmascara. ¿La institución exige un aviso de privacidad o autorización de tratamiento de datos "
            "(en Colombia, la Ley 1581 de 2012)? Debe confirmarlo la institución.",
            "Aviso en la pantalla de acceso (requiere desarrollo si se pide)",
        ),
        Decision(
            "D20",
            "Estado de revisión y nota «Contenido en revisión»",
            "Mientras un módulo no esté en estado `aprobado`, la cabecera muestra la nota «Contenido en revisión». Al "
            "aprobarlo, el docente (o quien registre su respuesta) cambia el estado en el `content.json` y se anota el ciclo "
            "en `docs/revisiones.md`. ¿Se aprueba por módulos o todo junto?",
            "`estado_revision` de cada `content.json` (ver la guía del docente)",
        ),
    ]


# --- Documento ---------------------------------------------------------------------------------------


def _tabla(encabezados: list[str], filas: list[list[str]]) -> list[str]:
    salida = ["| " + " | ".join(encabezados) + " |", "|" + "|".join("---" for _ in encabezados) + "|"]
    salida.extend("| " + " | ".join(fila) + " |" for fila in filas)
    return salida


def generar(raiz: Path, carpeta_modulos: Path, carpeta_guiones: Path) -> str:
    modulos = cargar_modulos(carpeta_modulos, carpeta_guiones)
    constantes = leer_constantes(raiz)

    notas_por_modulo: dict[int, list[Nota]] = {}
    for modulo in modulos:
        notas_por_modulo[modulo.numero] = (
            parsear_notas(modulo.guion.read_text(encoding="utf-8")) if modulo.guion is not None else []
        )

    total_pendientes = sum(len(m.pendientes) for m in modulos)
    total_notas = sum(len(n) for n in notas_por_modulo.values())
    total_referencias = sum(len(m.referencias) for m in modulos)
    lista_decisiones = decisiones(modulos, constantes)

    o: list[str] = []
    o.append("# Lista de revisión para el docente")
    o.append("")
    o.append(
        "> Documento generado con `python tools/guiones/pendientes.py` a partir de los `content.json` y de los guiones. "
        "No se edita a mano: si el contenido cambia, se regenera. Trabaja sobre una **copia** al marcar tus respuestas."
    )
    o.append("")
    o.append("## Cómo usar esta lista")
    o.append("")
    o.append(
        "Todo el contenido del OVA lo redactamos nosotros a partir del briefing y sigue en estado **borrador**: "
        "nada ha sido validado por un experto. Esta lista reúne lo que necesitamos que confirmes, corrijas o retires antes "
        "de aprobarlo. Tiene cuatro partes:"
    )
    o.append("")
    o.append(
        f"1. **Decisiones de diseño** ({len(lista_decisiones)}): acuerdos que no son cifras, como el umbral del certificado."
    )
    o.append(
        f"2. **Cifras y afirmaciones pendientes en el contenido** ({total_pendientes} en total): cada una lleva su sección y "
        "su bloque para que la encuentres en la aplicación. Son las marcas `[verificar]` de los guiones."
    )
    o.append(
        f"3. **Notas de verificación de los guiones** ({total_notas} en total): el contexto de esas dudas (por qué varía la cifra, "
        "qué fuentes se contrastaron) y otras decisiones de alcance."
    )
    o.append(f"4. **Referencias bibliográficas** ({total_referencias} en total): ninguna está verificada todavía.")
    o.append("")
    o.append(
        "Las partes 2 y 3 se solapan a propósito: la 2 dice **dónde** está cada dato en el módulo; la 3 explica **por qué** "
        "hay duda. Si respondes una nota de la parte 3, basta con eso para las cifras que trata."
    )
    o.append("")
    o.append("**Cómo responder.** En cada fila marca una casilla:")
    o.append("")
    o.append("- **confirmado**: la cifra o afirmación es correcta como está escrita.")
    o.append("- **corregir a**: escribe el valor o la redacción correcta (y, si puedes, la fuente).")
    o.append("- **retirar**: quitar la afirmación del contenido.")
    o.append("")
    o.append(
        "Puedes devolver el documento marcado o una lista corta con la referencia de cada fila (por ejemplo, "
        "«M3-P17: corregir a 92 %; M5-N04: confirmado»). Lo que respondas se registra en "
        "[docs/revisiones.md](revisiones.md) y se aplica siguiendo la [guía del docente](guia-docente.md)."
    )
    o.append("")
    o.append(
        "La columna **Fuente consultada** solo se llena cuando el guion cita autor y año; la mayoría de las cifras vienen "
        "de textos de referencia que no dejamos anotados. Donde dice «Sin fuente registrada en el guion», la comprobación "
        "contra un texto del curso es tuya."
    )
    o.append("")
    o.append("## Resumen")
    o.append("")
    filas_resumen = []
    for m in modulos:
        filas_resumen.append(
            [
                f"[Módulo {m.numero}: {m.titulo}](#{slug_github(f'Módulo {m.numero}: {m.titulo}')})",
                f"`{m.estado}`",
                str(len(m.pendientes)),
                str(len(notas_por_modulo[m.numero])),
                str(len(m.referencias)),
            ]
        )
    filas_resumen.append(["**Total**", "", f"**{total_pendientes}**", f"**{total_notas}**", f"**{total_referencias}**"])
    o.extend(
        _tabla(["Módulo", "Estado", "Pendientes en el contenido", "Notas del guion", "Referencias"], filas_resumen)
    )
    o.append("")
    o.append(f"Ir a: [Decisiones de diseño](#{slug_github('Decisiones de diseño por acordar')})")
    o.append("")

    o.append("## Decisiones de diseño por acordar")
    o.append("")
    o.append(
        "Las cifras de esta tabla se leen del sistema tal como está hoy. Escribe tu respuesta en la última columna."
    )
    o.append("")
    filas = [
        [d.codigo, f"**{celda(d.tema)}**", celda(d.situacion), celda(d.donde), DECISION_DISENO]
        for d in lista_decisiones
    ]
    o.extend(_tabla(["Ref.", "Tema", "Situación actual y pregunta", "Dónde se cambia", "Respuesta"], filas))
    o.append("")

    for m in modulos:
        notas = notas_por_modulo[m.numero]
        prefijo = f"M{m.numero}"
        o.append(f"## Módulo {m.numero}: {m.titulo}")
        o.append("")
        o.append(
            f"Estado: `{m.estado}`. Guion: "
            + (f"[{m.guion.name}](guion-por-modulo/{m.guion.name})" if m.guion is not None else "no encontrado")
            + f". Duración estimada: {m.datos.get('duracion_estimada_min', '?')} min."
        )
        o.append("")
        notas_generales = str(m.datos.get("estado_revision", {}).get("notas", "")).strip()
        if notas_generales:
            o.append("**Notas generales del módulo** (ajustes hechos a mano y supuestos):")
            o.append("")
            o.append(f"> {notas_generales}")
            o.append("")

        o.append(f"### {prefijo} · Cifras y afirmaciones pendientes en el contenido")
        o.append("")
        if not m.pendientes:
            o.append("Este módulo no declara pendientes.")
            o.append("")
        else:
            o.append(
                f"{plural(len(m.pendientes), 'cifra o afirmación', 'cifras y afirmaciones')}, en el orden en que "
                "aparecen en el módulo."
            )
            o.append("")
            filas = []
            for i, (lugar, pendiente, fuente) in enumerate(filas_pendientes(m, notas), start=1):
                filas.append(
                    [
                        CASILLA,
                        f"{prefijo}-P{i:02d}",
                        celda(lugar.describir()),
                        celda(_resumen_de_pendiente(str(pendiente.get("nota", "")))),
                        celda(fuente),
                        DECISION_PENDIENTE,
                    ]
                )
            o.extend(_tabla(["", "Ref.", "Ubicación", "Dato tal como aparece", "Fuente consultada", "Decisión"], filas))
            o.append("")

        o.append(f"### {prefijo} · Notas de verificación del guion")
        o.append("")
        if not notas:
            o.append("El guion no trae notas de verificación.")
            o.append("")
        else:
            o.append(
                f"{plural(len(notas), 'nota', 'notas')} copiadas del guion. «Guion n.º» es el número que la nota tiene "
                "allí."
            )
            o.append("")
            filas = []
            for i, nota in enumerate(notas, start=1):
                filas.append(
                    [
                        CASILLA,
                        f"{prefijo}-N{i:02d}",
                        celda(ubicar_nota(nota, m)),
                        celda((f"*(guion n.º {nota.numero_guion})* " if nota.numero_guion else "") + nota.texto),
                        celda(texto_de_fuente(fuentes_citadas(nota.texto))),
                        DECISION_PENDIENTE,
                    ]
                )
            o.extend(_tabla(["", "Ref.", "Ubicación", "Nota del guion", "Fuente consultada", "Decisión"], filas))
            o.append("")
        registro = registro_de_revision(m.guion.read_text(encoding="utf-8")) if m.guion is not None else ""
        if registro:
            o.append("**Qué contrastó la revisión científica independiente del guion** (texto tomado del guion):")
            o.append("")
            o.append(f"> {registro}")
            o.append("")

        o.append(f"### {prefijo} · Referencias bibliográficas")
        o.append("")
        if not m.referencias:
            o.append("El módulo no declara referencias.")
            o.append("")
        else:
            filas = []
            for i, ref in enumerate(m.referencias, start=1):
                estado = "verificada" if ref.get("verificada") else "sin verificar"
                filas.append(
                    [
                        CASILLA,
                        f"{prefijo}-R{i:02d}",
                        celda(str(ref.get("cita", ""))),
                        estado,
                        f"{CASILLA} correcta<br>{CASILLA} corregir a: ________<br>{CASILLA} retirar",
                    ]
                )
            o.extend(_tabla(["", "Ref.", "Cita", "Estado", "Decisión"], filas))
            o.append("")

    contenido = "\n".join(o).rstrip("\n") + "\n"
    return contenido


# --- Línea de comandos -------------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Genera docs/revision-docente.md (lista de revisión del docente).")
    parser.add_argument("--comprobar", action="store_true", help="no escribe; sale con 1 si el archivo no está al día")
    parser.add_argument("--raiz", type=Path, default=RAIZ, help="raíz del repositorio (pruebas)")
    parser.add_argument("--modulos", type=Path, default=None, help="carpeta apps/web/src/modules")
    parser.add_argument("--guiones", type=Path, default=None, help="carpeta docs/guion-por-modulo")
    parser.add_argument("--salida", type=Path, default=None, help="archivo de salida (docs/revision-docente.md)")
    args = parser.parse_args(argv)

    raiz = args.raiz
    modulos = args.modulos or raiz / "apps" / "web" / "src" / "modules"
    guiones = args.guiones or raiz / "docs" / "guion-por-modulo"
    salida = args.salida or raiz / "docs" / "revision-docente.md"

    try:
        contenido = generar(raiz, modulos, guiones)
    except ErrorDeLectura as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    # Con `core.autocrlf` (Git en Windows) el archivo puede estar en el disco con CRLF: no cuenta como cambio.
    actual = salida.read_bytes().decode("utf-8").replace("\r\n", "\n") if salida.is_file() else None
    if args.comprobar:
        if actual == contenido:
            print(f"{salida.name} está al día.")
            return 0
        motivo = "no existe" if actual is None else "difiere de lo que se generaría"
        print(f"{salida} {motivo}. Ejecuta: python tools/guiones/pendientes.py", file=sys.stderr)
        return 1

    if actual != contenido:
        salida.parent.mkdir(parents=True, exist_ok=True)
        salida.write_bytes(contenido.encode("utf-8"))
        print(f"Escrito {salida} ({len(contenido.splitlines())} líneas).")
    else:
        print(f"{salida.name} ya estaba al día.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
