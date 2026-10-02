#!/usr/bin/env python3
"""Comprueba los documentos de entrega: enlaces internos, cifras y ortografía básica.

Uso (desde la raíz del repositorio; solo necesita Python):

    python tools/guiones/comprobar_docs.py                 # las tres comprobaciones
    python tools/guiones/comprobar_docs.py --solo enlaces  # o `cifras`, o `ortografia`

1. **Enlaces.** Todo enlace Markdown `[texto](destino)` que no sea externo debe apuntar a un archivo o carpeta
   que exista y, si trae `#ancla`, a un encabezado que exista en el destino (con las mismas reglas de ancla
   que GitHub). No se miran los bloques de código ni el código en línea. Se revisan `README.md`, `PLAN.md`,
   `TODO.md`, `CLAUDE.md`, `docs/*.md` y `docs/guion-por-modulo/README.md`; los guiones de módulo (`m*.md`)
   quedan fuera porque usan la sintaxis de imagen `![alt](id_svg)` para describir dibujos, no enlaces.
2. **Cifras.** Un número que un documento afirma sobre el sistema se escribe con una marca invisible,
   `<!--c:actividades-->113<!--/c-->`, y esta herramienta lo compara con lo que cuenta **leyendo los archivos**
   del repositorio (los `content.json`, el manifiesto, el corpus, el código). Si el número cambia en la realidad
   y el documento no, falla. Las claves válidas están en `cifras_reales`.
3. **Ortografía básica.** No hay diccionario: solo detecta palabras que casi siempre son un error (sin tilde
   donde la lleva, como «informacion» o «tambien») y palabras repetidas («de de»), en los documentos que redactó
   el equipo de entrega (`DOCUMENTOS_REDACTADOS`). No sustituye una revisión humana.

Códigos de salida: 0 todo bien; 1 hay problemas; 2 error de uso o de lectura.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

import pendientes as pend  # noqa: E402

# Documentos con enlaces que se comprueban.
DOCUMENTOS_RAIZ = ("README.md", "PLAN.md", "TODO.md", "CLAUDE.md")
# Documentos que redactó el equipo de entrega: se les aplica la revisión de ortografía y de cifras.
DOCUMENTOS_REDACTADOS = (
    "README.md",
    "docs/guia-instalacion.md",
    "docs/guia-docente.md",
    "docs/guia-estudiante.md",
    "docs/arquitectura.md",
    "docs/entrega.md",
    "docs/revisiones.md",
)

# --- Lectura de Markdown ---------------------------------------------------------------------------

CERCA = re.compile(r"^\s*(```|~~~)")
CODIGO_EN_LINEA = re.compile(r"`[^`\n]*`")
ENLACE = re.compile(r"(?<!\!)\[(?P<texto>[^\]\n]*)\]\((?P<destino>[^)\s]+)(?:\s+\"[^\"]*\")?\)")
ENCABEZADO = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
MARCA_CIFRA = re.compile(r"<!--c:(?P<clave>[a-z0-9_-]+)-->(?P<valor>.*?)<!--/c-->")


def lineas_de_prosa(texto: str) -> list[tuple[int, str]]:
    """(número de línea, línea) de todo lo que no está dentro de un bloque de código cercado."""
    resultado: list[tuple[int, str]] = []
    dentro = False
    for numero, linea in enumerate(texto.splitlines(), start=1):
        if CERCA.match(linea):
            dentro = not dentro
            continue
        if not dentro:
            resultado.append((numero, linea))
    return resultado


def anclas_de(texto: str) -> set[str]:
    """Anclas de los encabezados, como las genera GitHub (con sufijo -1, -2 si se repiten)."""
    vistas: Counter[str] = Counter()
    anclas: set[str] = set()
    for _, linea in lineas_de_prosa(texto):
        m = ENCABEZADO.match(linea)
        if not m:
            continue
        base = pend.slug_github(re.sub(r"<[^>]+>", "", m.group(2)))
        veces = vistas[base]
        anclas.add(base if veces == 0 else f"{base}-{veces}")
        vistas[base] += 1
    return anclas


def documentos_con_enlaces(raiz: Path) -> list[Path]:
    encontrados = [raiz / nombre for nombre in DOCUMENTOS_RAIZ if (raiz / nombre).is_file()]
    encontrados += sorted((raiz / "docs").glob("*.md"))
    readme_guiones = raiz / "docs" / "guion-por-modulo" / "README.md"
    if readme_guiones.is_file():
        encontrados.append(readme_guiones)
    return encontrados


def comprobar_enlaces(raiz: Path, documentos: list[Path] | None = None) -> list[str]:
    """Problemas de enlaces internos, uno por línea: `archivo:línea: mensaje`."""
    problemas: list[str] = []
    cache_anclas: dict[Path, set[str]] = {}

    def anclas_del_archivo(ruta: Path) -> set[str]:
        if ruta not in cache_anclas:
            cache_anclas[ruta] = anclas_de(ruta.read_text(encoding="utf-8"))
        return cache_anclas[ruta]

    for documento in documentos if documentos is not None else documentos_con_enlaces(raiz):
        relativo = documento.relative_to(raiz).as_posix()
        for numero, linea in lineas_de_prosa(documento.read_text(encoding="utf-8")):
            sin_codigo = CODIGO_EN_LINEA.sub("", linea)
            for m in ENLACE.finditer(sin_codigo):
                destino = m.group("destino").strip("<>")
                if re.match(r"^[a-z][a-z0-9+.-]*:", destino, re.IGNORECASE):
                    continue  # http:, https:, mailto:...
                ruta_txt, _, ancla = destino.partition("#")
                if ruta_txt:
                    objetivo = (documento.parent / ruta_txt).resolve()
                    if not objetivo.exists():
                        problemas.append(f"{relativo}:{numero}: el archivo «{ruta_txt}» no existe")
                        continue
                else:
                    objetivo = documento
                if ancla:
                    if objetivo.suffix.lower() != ".md" or not objetivo.is_file():
                        problemas.append(f"{relativo}:{numero}: «{destino}» apunta a un ancla de algo que no es un .md")
                    elif ancla.lower() not in anclas_del_archivo(objetivo):
                        problemas.append(f"{relativo}:{numero}: el encabezado «#{ancla}» no existe en {objetivo.name}")
    return problemas


# --- Cifras ----------------------------------------------------------------------------------------


def _actividades(modulo: dict) -> list[dict]:
    actividades: list[dict] = []
    for seccion in modulo.get("secciones", []):
        for bloque in seccion.get("bloques", []):
            if bloque.get("tipo") == "actividad":
                actividades.append(bloque["actividad"])
    return actividades


def cifras_reales(raiz: Path) -> dict[str, int]:
    """Cifras del sistema, contadas leyendo los archivos del repositorio."""
    modulos = pend.cargar_modulos(raiz / "apps" / "web" / "src" / "modules", raiz / "docs" / "guion-por-modulo")
    constantes = pend.leer_constantes(raiz)
    cifras: dict[str, int] = {"modulos": len(modulos)}
    tipos: Counter[str] = Counter()
    totales: Counter[str] = Counter()
    for m in modulos:
        actividades = _actividades(m.datos)
        obligatorias = [a for a in actividades if a.get("obligatoria", True)]
        prefijo = f"m{m.numero}_"
        cifras[prefijo + "actividades"] = len(actividades)
        cifras[prefijo + "obligatorias"] = len(obligatorias)
        cifras[prefijo + "puntos"] = sum(int(a.get("puntaje_max", 0)) for a in actividades)
        cifras[prefijo + "puntos_obligatorios"] = sum(int(a.get("puntaje_max", 0)) for a in obligatorias)
        cifras[prefijo + "duracion"] = int(m.datos.get("duracion_estimada_min", 0))
        cifras[prefijo + "secciones"] = len(m.datos.get("secciones", []))
        cifras[prefijo + "pendientes"] = len(m.pendientes)
        cifras[prefijo + "referencias"] = len(m.referencias)
        for a in actividades:
            tipos[str(a.get("tipo"))] += 1
        for clave in ("actividades", "obligatorias", "puntos", "puntos_obligatorios", "secciones"):
            totales[clave] += cifras[prefijo + clave]
        totales["bloques_posgrado"] += sum(
            1 for s in m.datos.get("secciones", []) for b in s.get("bloques", []) if b.get("nivel") == "posgrado"
        )
        totales["videos_reales"] += sum(1 for a in actividades if a.get("config", {}).get("medio") == "video")
        totales["pendientes"] += len(m.pendientes)
        totales["referencias"] += len(m.referencias)
        if m.guion is not None:
            totales["notas"] += len(pend.parsear_notas(m.guion.read_text(encoding="utf-8")))
    cifras.update(totales)
    for tipo, cantidad in tipos.items():
        cifras[f"tipo_{tipo}"] = cantidad
    cifras["cert_min"] = constantes.cert_min_porcentaje
    cifras["puntos_umbral"] = -(-constantes.cert_min_porcentaje * totales["puntos_obligatorios"] // 100)
    cifras["logros"] = constantes.cantidad_logros
    cifras["tipos_identificacion"] = len(constantes.tipos_identificacion)
    cifras["decisiones"] = len(pend.decisiones(modulos, constantes))
    corpus = raiz / "services" / "api" / "app" / "data" / "corpus.jsonl"
    if corpus.is_file():
        cifras["fragmentos_corpus"] = sum(
            1 for linea in corpus.read_text(encoding="utf-8").splitlines() if linea.strip()
        )
    return cifras


def comprobar_cifras(raiz: Path, documentos: list[Path] | None = None) -> list[str]:
    """Compara cada marca `<!--c:clave-->N<!--/c-->` con la cifra real; también el manifiesto contra el contenido."""
    reales = cifras_reales(raiz)
    problemas: list[str] = []
    manifiesto = raiz / "services" / "api" / "app" / "data" / "actividades_manifest.json"
    if manifiesto.is_file():
        totales = json.loads(manifiesto.read_text(encoding="utf-8")).get("totales", {})
        for clave_manifiesto, clave in (
            ("actividades", "actividades"),
            ("obligatorias", "obligatorias"),
            ("puntaje_max", "puntos"),
            ("puntaje_max_obligatorias", "puntos_obligatorios"),
        ):
            if totales.get(clave_manifiesto) != reales[clave]:
                problemas.append(
                    f"actividades_manifest.json: {clave_manifiesto} = {totales.get(clave_manifiesto)} "
                    f"pero el contenido suma {reales[clave]} (regenerar con build_manifest)"
                )
    lista = documentos if documentos is not None else [raiz / d for d in DOCUMENTOS_REDACTADOS if (raiz / d).is_file()]
    for documento in lista:
        relativo = documento.relative_to(raiz).as_posix()
        for numero, linea in enumerate(documento.read_text(encoding="utf-8").splitlines(), start=1):
            for m in MARCA_CIFRA.finditer(linea):
                clave = m.group("clave")
                if clave not in reales:
                    problemas.append(
                        f"{relativo}:{numero}: la cifra «{clave}» no existe (claves válidas: cifras_reales)"
                    )
                    continue
                digitos = re.sub(r"\D", "", m.group("valor"))
                if not digitos:
                    problemas.append(f"{relativo}:{numero}: la cifra «{clave}» no trae un número")
                elif int(digitos) != reales[clave]:
                    problemas.append(
                        f"{relativo}:{numero}: «{clave}» dice {int(digitos)} pero el repositorio tiene {reales[clave]}"
                    )
    return problemas


# --- Ortografía básica -----------------------------------------------------------------------------

# Palabras que casi nunca se escriben sin tilde en español (o se escribe con tilde). Es una lista corta y
# deliberada: cada entrada debe ser un error en cualquier prosa, para no dar falsas alarmas.
SIN_TILDE_SOSPECHOSAS = {
    "informacion": "información",
    "configuracion": "configuración",
    "instalacion": "instalación",
    "documentacion": "documentación",
    "actualizacion": "actualización",
    "descripcion": "descripción",
    "evaluacion": "evaluación",
    "validacion": "validación",
    "verificacion": "verificación",
    "ejecucion": "ejecución",
    "seccion": "sección",
    "conexion": "conexión",
    "version": "versión",
    "codigo": "código",
    "pagina": "página",
    "numero": "número",
    "tambien": "también",
    "despues": "después",
    "aqui": "aquí",
    "facil": "fácil",
    "telefono": "teléfono",
    "movil": "móvil",
    "maquina": "máquina",
    "ademas": "además",
    "asi": "así",
    "util": "útil",
    "traves": "través",
    "minimo": "mínimo",
    "maximo": "máximo",
    "basico": "básico",
    "tecnico": "técnico",
    "unico": "único",
    "ultimo": "último",
    "dia": "día",
    "dias": "días",
    "sesion": "sesión",
    "atencion": "atención",
    "opcion": "opción",
    "funcion": "función",
    "accion": "acción",
    "decision": "decisión",
    "revision": "revisión",
    "produccion": "producción",
    "creacion": "creación",
    "aplicacion": "aplicación",
    "explicacion": "explicación",
    "calculo": "cálculo",
    "analisis": "análisis",
    "pedagogico": "pedagógico",
    "academico": "académico",
    "clinico": "clínico",
    "mecanico": "mecánico",
    "biologico": "biológico",
}
PALABRA = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+")
REPETIDA = re.compile(r"\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,})\s+\1\b", re.IGNORECASE)
# Repeticiones legítimas en español o en nombres propios.
REPETICIONES_PERMITIDAS = {"ja", "no", "sí", "si", "muy", "bye", "che"}


NOMBRE_DE_ARCHIVO = re.compile(
    r"[\w./-]+\.(?:md|json|jsonl|py|ts|mjs|vue|yml|yaml|svg|csv|env|sql|toml|lock|txt|pdf|vtt|mp4|webm)\b"
)


def _sin_marcas(linea: str) -> str:
    """Quita lo que no es prosa: código en línea, destinos de enlaces, nombres de archivo, direcciones y marcas."""
    limpia = CODIGO_EN_LINEA.sub(" · ", linea)
    limpia = MARCA_CIFRA.sub(lambda m: " " + m.group("valor") + " ", limpia)
    limpia = re.sub(r"\]\([^)]*\)", "]", limpia)
    limpia = re.sub(r"<[^>]*>", " ", limpia)
    limpia = re.sub(r"https?://\S+", " · ", limpia)
    return NOMBRE_DE_ARCHIVO.sub(" · ", limpia)


def comprobar_ortografia(raiz: Path, documentos: list[Path] | None = None) -> list[str]:
    problemas: list[str] = []
    lista = documentos if documentos is not None else [raiz / d for d in DOCUMENTOS_REDACTADOS if (raiz / d).is_file()]
    for documento in lista:
        relativo = documento.relative_to(raiz).as_posix()
        for numero, linea in lineas_de_prosa(documento.read_text(encoding="utf-8")):
            prosa = _sin_marcas(linea)
            for m in PALABRA.finditer(prosa):
                palabra = m.group(0)
                correcta = SIN_TILDE_SOSPECHOSAS.get(palabra.lower())
                if correcta and palabra == palabra.lower():
                    problemas.append(f"{relativo}:{numero}: «{palabra}» debería llevar tilde: «{correcta}»")
            for m in REPETIDA.finditer(prosa):
                if m.group(1).lower() not in REPETICIONES_PERMITIDAS:
                    problemas.append(f"{relativo}:{numero}: palabra repetida «{m.group(0)}»")
    return problemas


# --- Línea de comandos -----------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Comprueba enlaces, cifras y ortografía básica de los documentos.")
    parser.add_argument("--solo", choices=("enlaces", "cifras", "ortografia"), help="una sola comprobación")
    parser.add_argument("--raiz", type=Path, default=RAIZ, help="raíz del repositorio (pruebas)")
    args = parser.parse_args(argv)

    comprobaciones = {
        "enlaces": comprobar_enlaces,
        "cifras": comprobar_cifras,
        "ortografia": comprobar_ortografia,
    }
    elegidas = [args.solo] if args.solo else list(comprobaciones)
    total = 0
    try:
        for nombre in elegidas:
            problemas = comprobaciones[nombre](args.raiz)
            print(f"[{nombre}] {'sin problemas' if not problemas else plural(len(problemas))}")
            for problema in problemas:
                print(f"  - {problema}")
            total += len(problemas)
    except (pend.ErrorDeLectura, OSError, json.JSONDecodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2
    return 0 if total == 0 else 1


def plural(n: int) -> str:
    return f"{n} problema" + ("" if n == 1 else "s")


if __name__ == "__main__":
    sys.exit(main())
