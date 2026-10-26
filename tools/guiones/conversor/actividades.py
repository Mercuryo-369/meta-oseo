"""Convierte las actividades (bloques yaml de los guiones) a la configuración de su tipo.

Los guiones usan una estructura común acordada que difiere del esquema en los nombres de los
campos: `acierto/error` pasan a `correcta/incorrecta`, `ordenar_pasos` a `ordenar`, `izquierda/
derecha` a `columna_a/columna_b`, `nombre` a `etiqueta`, `hotspots` a `nodos`, etc. Este módulo
hace ese mapeo y, donde el esquema exige algo que el guion no trae (posición de un receptor,
viewBox, texto alternativo, título de una columna...), lo deduce con una regla explícita y lo
deja anotado en el informe.

Regla de oro: no se inventa ni se resume contenido pedagógico. Un texto que excede el límite del
esquema NO se recorta: se emite tal cual y se anota en el informe con su ubicación en el guion.
"""

from __future__ import annotations

import math
import re
from typing import Any

from .contexto import Contexto
from .lector import ActividadGuion
from .recursos import (
    ALT_MODELO_3D,
    ANCLAS_MANDIBULA,
    inferir_animacion,
    viewbox_de_svg,
)
from .util import (
    a_linea,
    a_plano,
    dividir_oraciones,
    normalizar_id,
    quitar_acentos,
    recortar_numeracion,
)

FORMAS = ("circulo", "hexagono", "triangulo", "rombo", "cuadrado")
ANIMACIONES = (
    "activacion",
    "inhibicion",
    "cascada",
    "union",
    "crecimiento",
    "transformacion",
    "liberacion",
    "mineralizacion",
    "reabsorcion",
)
DIRECCIONES = ("aumenta", "disminuye", "sin_cambio")

# Geometría del arrastre (constantes.ts): teléfono de 320 px, 52 px entre receptores, 22 px al borde.
ANCHO_PX = 320
SEPARACION_PX = 52
MARGEN_PX = 22

# Campos del guion que no tienen lugar en el esquema (se anotan en el informe, agrupados).
CAMPOS_OMITIDOS_ACTIVIDAD = {"interaccion", "nota"}


class _Actividad:
    """Convierte UNA actividad. Guarda el contexto y facilita leer y limpiar los campos."""

    def __init__(self, ag: ActividadGuion, ctx: Contexto) -> None:
        self.ag = ag
        self.ctx = ctx
        self.d = ag.datos
        # Oraciones de las instrucciones que no caben y pasan a un bloque de texto previo.
        self.texto_previo: str | None = None
        raw = str(ag.id)
        self.id = normalizar_id(raw)
        if self.id != raw:
            ctx.informe.corregido(self.donde(), f"id de actividad «{raw}» normalizado a «{self.id}»")

    # -- utilidades --
    def donde(self, *partes: str) -> str:
        return self.ctx.donde(self.ag.linea, f"actividad {self.ag.id}", *partes)

    def texto(
        self,
        valor: Any,
        campo: str,
        *,
        plano: bool = False,
        minimo: int = 1,
        maximo: int = 10_000,
        marca_en: str | None = None,
        quitar_num: bool = False,
    ) -> str:
        """Texto limpio de un campo del guion. Quita marcas [verificar] (que quedan anotadas),
        marcadores de lista y saltos de línea; comprueba el límite del esquema y, si se pasa,
        lo anota SIN recortar."""
        if valor is None:
            self.ctx.informe.revisar(self.donde(campo), "falta el campo")
            return ""
        if not isinstance(valor, str):
            self.ctx.informe.revisar(self.donde(campo), f"se esperaba texto y hay {type(valor).__name__}: {valor!r}")
            valor = str(valor)
        limpio, marcas = self.ctx.extraer(valor)
        self.ctx.marcar(marca_en or self.id, marcas)
        if quitar_num:
            limpio = recortar_numeracion(limpio)
        if plano:
            resultado = a_plano(limpio)
        else:
            resultado, correcciones = a_linea(limpio)
            for c in correcciones:
                self.ctx.informe.corregido(self.donde(campo), c)
        if len(resultado) > maximo:
            self.ctx.informe.revisar(
                self.donde(campo),
                f"{len(resultado)} caracteres; el máximo del esquema es {maximo}: «{resultado[:60]}…»",
            )
        elif len(resultado) < minimo:
            self.ctx.informe.revisar(
                self.donde(campo), f"{len(resultado)} caracteres; el mínimo del esquema es {minimo}: «{resultado}»"
            )
        return resultado

    def omitir(self, campo: str, donde: str | None = None) -> None:
        self.ctx.informe.omitido(donde or self.donde(), campo)

    def lista(self, campo: str, requerido: bool = True) -> list:
        valor = self.d.get(campo)
        if valor is None:
            if requerido:
                self.ctx.informe.revisar(self.donde(campo), "falta la lista")
            return []
        if not isinstance(valor, list):
            self.ctx.informe.revisar(self.donde(campo), "se esperaba una lista")
            return []
        return valor

    # -- comunes --
    def instrucciones(self) -> str:
        """Instrucciones (10 a 400 caracteres). Si el guion se pasa, sin perder nada de contenido:
        1) se quitan las indicaciones de teclado, dedo o ratón entre paréntesis (las dan los
        componentes); 2) se quitan las oraciones que solo explican el teclado o la alternativa
        sin 3D; 3) las oraciones de contexto del medio pasan a un bloque de texto justo antes de
        la actividad (docs/content-schema.md: «el contexto va en un bloque texto anterior»). La
        primera oración (qué hacer) y la última (cuándo se termina) se quedan."""
        texto = self.texto(self.d.get("instrucciones"), "instrucciones", minimo=10)
        if len(texto) <= 400:
            return texto
        original = len(texto)
        pasos: list[str] = []

        sin_parentesis = re.sub(
            r"\s*\((?:[^()]*\b(?:teclado|Tab|Enter|dedo|rat[oó]n|t[aá]ctil|pantalla|toque|Espacio|flechas|lista de|lista bajo|desplázate|arrastra(?:r)?)\b[^()]*)\)",
            "",
            texto,
            flags=re.IGNORECASE,
        )
        sin_parentesis = re.sub(r"\s+", " ", sin_parentesis).strip()
        if sin_parentesis != texto:
            texto = sin_parentesis
            pasos.append("se quitaron las indicaciones de teclado, dedo o ratón entre paréntesis")

        if len(texto) > 400:
            solo_interfaz = re.compile(
                r"^(?:con (?:el )?teclado|sin arrastrar|en (?:pantalla )?t[aá]ctil|en escritorio|con lector|si no hay 3d|con rat[oó]n)\b"
                r"|\b(?:teclado|Tab|Enter|dispositivo no muestra|no muestra 3d|lista de zonas|lista de estructuras)\b",
                flags=re.IGNORECASE,
            )
            oraciones = dividir_oraciones(texto)
            utiles = [o for o in oraciones if not solo_interfaz.search(o)]
            if utiles and len(utiles) < len(oraciones):
                texto = " ".join(utiles)
                pasos.append("se quitaron las oraciones que solo explican el teclado o la alternativa sin 3D")

        if len(texto) > 400:
            oraciones = dividir_oraciones(texto)
            if len(oraciones) >= 3:
                medio = list(range(1, len(oraciones) - 1))
                movidas: list[int] = []
                for k in reversed(medio):
                    restante = [o for j, o in enumerate(oraciones) if j not in movidas]
                    if len(" ".join(restante)) <= 400:
                        break
                    movidas.append(k)
                restante = [o for j, o in enumerate(oraciones) if j not in movidas]
                if movidas and len(" ".join(restante)) <= 400:
                    self.texto_previo = " ".join(oraciones[j] for j in sorted(movidas))
                    texto = " ".join(restante)
                    pasos.append(
                        f"{len(movidas)} oración(es) de contexto pasaron a un bloque de texto antes de la actividad"
                    )

        if len(texto) <= 400:
            self.ctx.informe.corregido(
                self.donde("instrucciones"),
                f"instrucciones de {original} caracteres acortadas a {len(texto)} sin perder contenido: "
                + "; ".join(pasos),
            )
        else:
            self.ctx.informe.revisar(
                self.donde("instrucciones"),
                f"{original} caracteres ({len(texto)} tras quitar lo de teclado y toque); el máximo del esquema es 400: "
                "hay que acortarlas con el docente o pasar contexto a un bloque de texto previo",
            )
        return texto

    def retro(self) -> dict[str, str]:
        r = self.d.get("retroalimentacion")
        if not isinstance(r, dict):
            self.ctx.informe.revisar(self.donde("retroalimentacion"), "falta la retroalimentación")
            return {"correcta": ""}
        salida: dict[str, str] = {}
        for origen, destino in (("acierto", "correcta"), ("parcial", "parcial"), ("error", "incorrecta")):
            if origen in r:
                salida[destino] = self.texto(r[origen], f"retroalimentacion.{origen}", minimo=10, maximo=400)
        for extra in sorted(set(r) - {"acierto", "parcial", "error"}):
            self.omitir(f"retroalimentacion.{extra}")
        return salida

    def concepto(self) -> str:
        return self.concepto_de(self.d.get("concepto"), "concepto", None)

    def concepto_de(self, valor: Any, campo: str, marca_en: str | None) -> str:
        """Concepto (plano, 3 a 120). Si el guion lo escribe como id («osificacion_mandibular») se
        pasa a texto, recuperando las tildes de las palabras tal como las escribe el propio guion."""
        if isinstance(valor, str) and re.fullmatch(r"[a-z0-9_]+", valor.strip()):
            palabras = [self.ctx.con_tildes(w) for w in valor.strip().split("_")]
            humano = " ".join(palabras)
            humano = humano[:1].upper() + humano[1:]
            self.ctx.informe.corregido(
                self.donde(campo),
                f"concepto escrito como id «{valor}» convertido a texto «{humano}» (tildes tomadas del propio guion)",
            )
            valor = humano
        return self.texto(valor, campo, plano=True, minimo=3, maximo=120, marca_en=marca_en)

    def alt_de_ilustracion(self, id_svg: str, campo: str = "alt") -> str:
        """Texto alternativo de una figura: el «texto alternativo sugerido» del guion o su
        descripción en la tabla de ilustraciones («Qué muestra»)."""
        ilu = self.ctx.guion.ilustraciones.get(id_svg)
        if ilu is None:
            self.ctx.informe.revisar(
                self.donde(campo), f"la ilustración «{id_svg}» no está en la tabla «Ilustraciones y modelos requeridos»"
            )
            return a_plano(self.d.get("titulo", id_svg))
        fuente = ilu.alt_sugerido or ilu.que_muestra
        limpio, marcas = self.ctx.extraer(fuente)
        self.ctx.marcar(self.id, marcas)
        return self.recortar_alt(a_plano(limpio), campo, 300)

    def recortar_alt(self, texto: str, campo: str, maximo: int) -> str:
        """Los textos alternativos son descripciones derivadas: si pasan del máximo se cortan en
        el límite de una oración (y se anota). Los textos que escribió el guion nunca se cortan."""
        if len(texto) <= maximo:
            return texto if texto.endswith((".", "!", "?")) else texto + "."
        oraciones = dividir_oraciones(texto)
        acumulado = ""
        for o in oraciones:
            if len(f"{acumulado} {o}".strip()) > maximo:
                break
            acumulado = f"{acumulado} {o}".strip()
        if len(acumulado) >= 10:
            self.ctx.informe.corregido(
                self.donde(campo),
                f"texto alternativo derivado de {len(texto)} caracteres acortado a {len(acumulado)} (oraciones completas)",
            )
            return acumulado
        # Ni la primera oración cabe: corte por la última coma o espacio anterior al límite.
        corte = texto.rfind(", ", 0, maximo - 1)
        corte = corte if corte > 40 else texto.rfind(" ", 0, maximo - 1)
        recorte = texto[:corte].rstrip(",;: ") + "."
        self.ctx.informe.revisar(
            self.donde(campo),
            f"texto alternativo derivado demasiado largo ({len(texto)}); acortado a mano a {len(recorte)} caracteres",
        )
        return recorte

    def base(self, config: dict) -> dict:
        actividad: dict[str, Any] = {
            "id": self.id,
            "tipo": self.d.get("tipo"),
            "titulo": self.texto(self.d.get("titulo"), "titulo", plano=True, minimo=3, maximo=100),
            "instrucciones": self.instrucciones(),
            "obligatoria": bool(self.d.get("obligatoria", True)),
            "puntaje_max": self._puntaje(),
            "retroalimentacion": self.retro(),
            "concepto": self.concepto(),
            "config": config,
        }
        for campo in CAMPOS_OMITIDOS_ACTIVIDAD:
            if campo in self.d:
                self.omitir(campo)
        return actividad

    def _puntaje(self) -> int:
        valor = self.d.get("puntaje_max")
        if isinstance(valor, bool) or not isinstance(valor, int):
            self.ctx.informe.revisar(self.donde("puntaje_max"), f"debe ser un entero y hay {valor!r}")
            return 0
        return valor

    def id_de_lista(self, valor: Any, donde: str) -> str:
        raw = str(valor)
        ident = normalizar_id(raw)
        if ident != raw:
            self.ctx.informe.corregido(donde, f"id «{raw}» normalizado a «{ident}»")
        return ident


# --- quiz ----------------------------------------------------------------------------------------


def _quiz(a: _Actividad) -> dict:
    preguntas: list[dict] = []
    for i, p in enumerate(a.lista("preguntas")):
        if not isinstance(p, dict):
            a.ctx.informe.revisar(a.donde(f"preguntas[{i}]"), "la pregunta no es un mapa")
            continue
        qid = a.id_de_lista(p.get("id"), a.donde(f"preguntas[{i}].id"))
        a.ctx.declarar(qid, a.donde(f"pregunta {qid}"), "pregunta")
        formato = str(p.get("formato", "")).strip()
        formato = "ordenar" if formato == "ordenar_pasos" else formato
        pregunta: dict[str, Any] = {"id": qid, "formato": formato}
        dnd = f"pregunta {qid}"
        pregunta["enunciado"] = a.texto(p.get("enunciado"), f"{dnd}.enunciado", minimo=10, maximo=500, marca_en=qid)
        if formato == "opcion_multiple":
            mapa: dict[str, str] = {}
            opciones = []
            for o in p.get("opciones") or []:
                raw = normalizar_id(o.get("id"))
                nuevo = f"{qid}_{raw}"[:64]
                mapa[raw] = nuevo
                opcion = {
                    "id": nuevo,
                    "texto": a.texto(
                        o.get("texto"), f"{dnd}.opciones[{raw}].texto", minimo=1, maximo=200, marca_en=qid
                    ),
                }
                if o.get("explicacion"):
                    opcion["explicacion"] = a.texto(
                        o["explicacion"], f"{dnd}.opciones[{raw}].explicacion", minimo=10, maximo=300, marca_en=qid
                    )
                opciones.append(opcion)
            if not 3 <= len(opciones) <= 6:
                a.ctx.informe.revisar(a.donde(dnd), f"{len(opciones)} opciones; el esquema admite de 3 a 6")
            correcta = p.get("correcta")
            lista = correcta if isinstance(correcta, list) else [correcta]
            correctas = []
            for c in lista:
                clave = normalizar_id(c)
                if clave in mapa:
                    correctas.append(mapa[clave])
                else:
                    a.ctx.informe.revisar(a.donde(dnd), f"la opción correcta «{c}» no está entre las opciones")
            pregunta["opciones"] = opciones
            pregunta["correctas"] = correctas
        elif formato == "verdadero_falso":
            pregunta["correcta"] = _booleano(p.get("correcta"), a, dnd)
        elif formato == "ordenar":
            pasos_raw = [x for x in (p.get("pasos") or []) if isinstance(x, dict)]
            por_id = {normalizar_id(x.get("id")): x for x in pasos_raw}
            orden = p.get("correcta")
            if isinstance(orden, list) and orden:
                claves = [normalizar_id(c) for c in orden]
                faltan = [c for c in claves if c not in por_id]
                sobran = [c for c in por_id if c not in claves]
                if faltan or sobran:
                    a.ctx.informe.revisar(
                        a.donde(dnd), f"`correcta` y `pasos` no coinciden (faltan {faltan}, sobran {sobran})"
                    )
                pasos_ordenados = [por_id[c] for c in claves if c in por_id]
            else:
                a.ctx.informe.revisar(
                    a.donde(dnd), "pregunta de ordenar sin la lista `correcta`: se toma el orden de `pasos`"
                )
                pasos_ordenados = pasos_raw
            pregunta["pasos"] = [
                {
                    "id": f"{qid}_{normalizar_id(x.get('id'))}"[:64],
                    "texto": a.texto(
                        x.get("texto"),
                        f"{dnd}.pasos[{normalizar_id(x.get('id'))}].texto",
                        minimo=2,
                        maximo=200,
                        marca_en=qid,
                        quitar_num=True,
                    ),
                }
                for x in pasos_ordenados
            ]
            if not 3 <= len(pregunta["pasos"]) <= 7:
                a.ctx.informe.revisar(a.donde(dnd), f"{len(pregunta['pasos'])} pasos; el esquema admite de 3 a 7")
        else:
            a.ctx.informe.revisar(a.donde(dnd), f"formato de pregunta desconocido: «{formato}»")
        pregunta["explicacion"] = a.texto(
            p.get("explicacion"), f"{dnd}.explicacion", minimo=10, maximo=600, marca_en=qid
        )
        if p.get("concepto"):
            pregunta["concepto"] = a.concepto_de(p["concepto"], f"{dnd}.concepto", qid)
        if "dificultad" in p:
            dif = p["dificultad"]
            if isinstance(dif, int) and not isinstance(dif, bool) and 1 <= dif <= 3:
                pregunta["dificultad"] = dif
            else:
                a.ctx.informe.revisar(a.donde(dnd), f"dificultad {dif!r} fuera de 1 a 3")
        for extra in sorted(
            set(p)
            - {"id", "formato", "enunciado", "opciones", "correcta", "pasos", "explicacion", "concepto", "dificultad"}
        ):
            a.omitir(extra, a.donde(dnd))
        preguntas.append(pregunta)
    if not 1 <= len(preguntas) <= 20:
        a.ctx.informe.revisar(a.donde(), f"{len(preguntas)} preguntas; el esquema admite de 1 a 20")
    return {"preguntas": preguntas}


def _booleano(valor: Any, a: _Actividad, donde: str) -> bool:
    if isinstance(valor, bool):
        return valor
    texto = quitar_acentos(str(valor)).strip().lower()
    if texto in ("verdadero", "true", "v", "si"):
        return True
    if texto in ("falso", "false", "f", "no"):
        return False
    a.ctx.informe.revisar(a.donde(donde), f"valor de verdadero/falso no reconocido: {valor!r}")
    return False


# --- relación de columnas --------------------------------------------------------------------------


def _columnas(a: _Actividad) -> dict:
    def elementos(campo: str, prefijo: str) -> list[dict]:
        salida = []
        for i, e in enumerate(a.lista(campo)):
            ident = a.id_de_lista(e.get("id"), a.donde(f"{campo}[{i}].id"))
            salida.append(
                {"id": ident, "texto": a.texto(e.get("texto"), f"{campo}[{ident}].texto", minimo=2, maximo=200)}
            )
        return salida

    izquierda = elementos("izquierda", "ea")
    derecha = elementos("derecha", "eb")
    textos_derecha = {e["id"]: e["texto"] for e in derecha}
    pares = []
    for i, p in enumerate(a.lista("pares")):
        izq = normalizar_id(p.get("izquierda"))
        der = normalizar_id(p.get("derecha"))
        explicacion = p.get("explicacion")
        if explicacion:
            texto = a.texto(explicacion, f"pares[{i}].explicacion", minimo=10, maximo=300)
        else:
            # El guion lo dice: la explicación se construye a partir del texto de la derecha.
            texto = textos_derecha.get(der, "")
            if len(texto) > 300:
                a.ctx.informe.revisar(
                    a.donde(f"pares[{i}]"),
                    f"la explicación construida desde el texto de la derecha tiene {len(texto)} caracteres (máximo 300)",
                )
        pares.append({"id": f"par_{izq}"[:64], "a": izq, "b": der, "explicacion": texto})
    if not 3 <= len(izquierda) <= 8:
        a.ctx.informe.revisar(
            a.donde("izquierda"), f"{len(izquierda)} elementos en la columna A; el esquema admite de 3 a 8"
        )
    if not 3 <= len(derecha) <= 11:
        a.ctx.informe.revisar(
            a.donde("derecha"), f"{len(derecha)} elementos en la columna B; el esquema admite de 3 a 11"
        )
    if not 3 <= len(pares) <= 8:
        a.ctx.informe.revisar(a.donde("pares"), f"{len(pares)} pares; el esquema admite de 3 a 8")
    for extra in sorted(set(a.d.get("distractores") or []) if isinstance(a.d.get("distractores"), list) else []):
        if normalizar_id(extra) in {p["b"] for p in pares}:
            a.ctx.informe.revisar(a.donde("distractores"), f"«{extra}» figura como distractor pero tiene pareja")
    if "distractores" in a.d:
        a.omitir("distractores")  # se deduce solo: son los elementos de la derecha sin pareja
    a.ctx.informe.corregido(
        a.donde("columna_a.titulo"), "títulos de columna genéricos «Concepto» y «Descripción»: el guion no los trae"
    )
    return {
        "columna_a": {"titulo": "Concepto", "elementos": izquierda},
        "columna_b": {"titulo": "Descripción", "elementos": derecha},
        "pares": pares,
        "barajar": True,
    }


# --- multicapa -----------------------------------------------------------------------------------


def _svg_de(a: _Actividad) -> str:
    for clave in ("svg", "ilustracion"):
        if a.d.get(clave):
            return str(a.d[clave]).strip()
    a.ctx.informe.revisar(a.donde(), "la actividad no indica su ilustración (`svg`)")
    return ""


def _multicapa(a: _Actividad) -> dict:
    id_svg = _svg_de(a)
    viewbox, real = viewbox_de_svg(a.ctx.raiz_web, a.ctx.numero, id_svg)
    modo = str(a.d.get("modo", "")).strip()
    consignas: dict[str, list[str]] = {}
    for c in a.d.get("consignas") or []:
        capa = normalizar_id(c.get("capa_correcta"))
        consignas.setdefault(capa, []).append(
            a.texto(c.get("enunciado"), f"consignas[{c.get('id')}]", minimo=10, maximo=200, marca_en=capa)
        )
    if "consignas" in a.d and modo != "identificar":
        a.ctx.informe.revisar(a.donde("consignas"), "hay `consignas` en una actividad que no es de modo identificar")
    capas = []
    raws: list[str] = []
    renombres: dict[str, str] = {}
    for i, c in enumerate(a.lista("capas")):
        raw = a.id_de_lista(c.get("id"), a.donde(f"capas[{i}].id"))
        raws.append(raw)
        ident = raw
        propietaria = a.ctx.propietario_capa.get(raw)
        if propietaria is not None and propietaria != id_svg:
            ident = _id_capa_unico(a, raw, id_svg, propietaria)
            renombres[raw] = ident
        a.ctx.declarar(ident, a.donde(f"capa {ident}"), "capa")
        capa: dict[str, Any] = {
            "id": ident,
            "etiqueta": a.texto(
                c.get("etiqueta"), f"capa {ident}.etiqueta", plano=True, minimo=2, maximo=60, marca_en=ident
            ),
            "descripcion": a.texto(
                c.get("descripcion"), f"capa {ident}.descripcion", minimo=10, maximo=500, marca_en=ident
            ),
        }
        pistas: list[str] = []
        if c.get("pista"):
            pistas.append(a.texto(c["pista"], f"capa {ident}.pista", minimo=10, maximo=200, marca_en=ident))
        pistas.extend(consignas.pop(raw, []))
        if pistas:
            capa["pista"] = pistas[0]
            if len(pistas) > 1:
                capa["pistas_extra"] = pistas[1:]
            if len(pistas) > 3:
                a.ctx.informe.revisar(
                    a.donde(f"capa {ident}"),
                    f"{len(pistas)} consignas sobre la misma capa; el esquema admite 3 (pista y 2 extra)",
                )
        capas.append(capa)
    requeridas_raw = [a.id_de_lista(x, a.donde("requeridas")) for x in a.lista("requeridas")]
    requeridas = [renombres.get(x, x) for x in requeridas_raw]
    if modo == "identificar":
        for capa in capas:
            if capa["id"] in requeridas and "pista" not in capa:
                capa["pista"] = f"Toca la estructura: {capa['etiqueta']}."
                a.ctx.informe.corregido(
                    a.donde(f"capa {capa['id']}.pista"),
                    "modo identificar sin pista en el guion: se pide tocar la estructura por su nombre, como describe el guion",
                )
    for capa_suelta in consignas:
        a.ctx.informe.revisar(
            a.donde("consignas"), f"una consigna apunta a la capa «{capa_suelta}», que no existe en `capas`"
        )
    if not 2 <= len(capas) <= 15:
        a.ctx.informe.revisar(a.donde("capas"), f"{len(capas)} capas; el esquema admite de 2 a 15")
    _cruzar_capas_con_tabla(a, id_svg, raws)
    if not real:
        a.ctx.informe.corregido(a.donde("viewBox"), f"viewBox provisional {viewbox} (el SVG «{id_svg}» aún no existe)")
    return {
        "svg": f"/images/m{a.ctx.numero}/{id_svg}.svg",
        "viewBox": viewbox,
        "alt": a.alt_de_ilustracion(id_svg),
        "modo": modo,
        "capas": capas,
        "requeridas": requeridas,
    }


def _id_capa_unico(a: _Actividad, raw: str, id_svg: str, propietaria: str) -> str:
    """Las capas son únicas en el módulo: la que repite el id de otra ilustración toma el prefijo de
    su figura, como manda la convención. El `<g id>` del SVG debe llamarse igual."""
    prefijo = re.sub(r"^m\d+_", "", id_svg)
    nuevo = normalizar_id(f"{prefijo}_{raw}")[:64]
    if nuevo in a.ctx.declarados:
        nuevo = a.ctx.nuevo_id(nuevo)
    a.ctx.informe.corregido(
        a.donde(f"capa {raw}"),
        f"id de capa «{raw}» repetido en el módulo (lo conserva «{propietaria}»): renombrado a «{nuevo}»; "
        f"en el SVG «{id_svg}» el grupo <g id> debe llamarse «{nuevo}»",
    )
    return nuevo


def _cruzar_capas_con_tabla(a: _Actividad, id_svg: str, ids: list[str]) -> None:
    """Las capas de la actividad deben ser las que la tabla de ilustraciones le pide dibujar."""
    ilu = a.ctx.guion.ilustraciones.get(id_svg)
    if ilu is None or not ilu.capas:
        return
    tabla = {c for c, _ in ilu.capas}
    faltan = [i for i in ids if i not in tabla]
    if faltan:
        a.ctx.informe.revisar(
            a.donde("capas"),
            f"capas que la tabla de ilustraciones de «{id_svg}» no pide dibujar: {', '.join(faltan)}",
        )


# --- arrastre molecular ----------------------------------------------------------------------------


def _partir_etiqueta(etiqueta: str) -> tuple[str, str]:
    """Etiqueta de más de 40 caracteres: se acorta SIN perder texto, porque el nombre completo pasa al
    inicio de la descripción. Dos reglas, en este orden:
      1. Una explicación o sigla entre paréntesis al final: la etiqueta queda con lo que va antes (o con
         la sigla) y la explicación pasa a la descripción («Fosfatasa ácida (TRAP)» -> «TRAP»).
      2. Se corta ANTES de la última preposición o conjunción que deje la etiqueta en 40 caracteres o
         menos («RANKL anclado en la membrana de la célula» -> «RANKL anclado en la membrana»).
    Devuelve (etiqueta, texto que se antepone a la descripción); ("", "") si no aplica."""
    if len(etiqueta) <= 40:
        return "", ""
    m = re.match(r"^(.+?)\s*\((.+)\)\s*$", etiqueta)
    if m:
        base, dentro = m.group(1).strip(), m.group(2).strip()
        if re.fullmatch(r"[A-Za-z0-9α-ωΑ-Ω\-/]{2,12}", dentro):  # el paréntesis es una sigla: TRAP
            return dentro, f"{base[:1].upper()}{base[1:]}."
        if len(base) <= 40:
            return base, f"{dentro[:1].upper()}{dentro[1:]}."
    cortes = [
        p.start()
        for p in re.finditer(r"\s(?:de la|de los|de las|del|de|sin|con|en la|en el|en|para|y|que)\s", etiqueta)
        if 8 <= p.start() <= 40
    ]
    if cortes:
        return etiqueta[: max(cortes)].rstrip(",;: "), etiqueta.rstrip(".") + "."
    return "", ""


def _etiqueta_descripcion(
    a: _Actividad, ident: str, dnd: str, nombre: Any, descripcion: Any, marca_en: str | None
) -> tuple[str, str]:
    """Etiqueta (plana, 1 a 40) y descripción (línea, 10 a 300) de una molécula o un receptor."""
    etiqueta = a.texto(nombre, f"{dnd}.nombre", plano=True, minimo=1, maximo=10_000, marca_en=marca_en)
    nueva, prefijo = _partir_etiqueta(etiqueta)
    if nueva:
        a.ctx.informe.corregido(
            a.donde(dnd),
            f"nombre de {len(etiqueta)} caracteres («{etiqueta}») partido: la etiqueta queda «{nueva}» y «{prefijo}» pasa al inicio de la descripción",
        )
        etiqueta = nueva
        descripcion = f"{prefijo} {descripcion}" if isinstance(descripcion, str) else descripcion
    if len(etiqueta) > 40:
        a.ctx.informe.revisar(
            a.donde(dnd),
            f"etiqueta de {len(etiqueta)} caracteres; el máximo del esquema es 40: «{etiqueta}» (hay que acortarla con el docente)",
        )
    return etiqueta, a.texto(descripcion, f"{dnd}.descripcion", minimo=10, maximo=300, marca_en=marca_en)


def _prefijado(ident: str, prefijo: str) -> str:
    return ident if ident.startswith(prefijo) else f"{prefijo}{ident}"[:64]


def _posiciones(n: int, viewbox: str) -> list[dict[str, float]] | None:
    """Reparte `n` receptores con las reglas de tamaño táctil del esquema. `None` si no caben."""
    m = re.fullmatch(r"0 0 (\d+) (\d+)", viewbox)
    ancho_px = float(ANCHO_PX)
    alto_px = ANCHO_PX * (int(m.group(2)) / int(m.group(1))) if m else 240.0
    for filas in (1, 2, 3) if n <= 3 else (2, 3):
        columnas = math.ceil(n / filas)
        puntos: list[tuple[float, float]] = []
        for k in range(n):
            fila, col = divmod(k, columnas)
            en_fila = min(columnas, n - fila * columnas)
            x = (col + 0.5) / en_fila * 100 if filas > 1 else (k + 0.5) / n * 100
            y = (fila + 0.5) / filas * 100
            puntos.append((round(min(max(x, 10), 90), 1), round(min(max(y, 12), 88), 1)))
        ok = all(
            MARGEN_PX <= x / 100 * ancho_px <= ancho_px - MARGEN_PX
            and MARGEN_PX <= y / 100 * alto_px <= alto_px - MARGEN_PX
            for x, y in puntos
        ) and all(
            math.hypot((p[0] - q[0]) / 100 * ancho_px, (p[1] - q[1]) / 100 * alto_px) >= SEPARACION_PX
            for i, p in enumerate(puntos)
            for q in puntos[i + 1 :]
        )
        if ok:
            return [{"x": x, "y": y} for x, y in puntos]
    return None


def _arrastre(a: _Actividad) -> dict:
    escena_raw = a.d.get("escena")
    id_svg = str(a.d.get("svg") or a.d.get("ilustracion") or "").strip()
    if isinstance(escena_raw, dict):
        id_svg = str(escena_raw.get("svg") or id_svg).strip()
        descripcion = escena_raw.get("descripcion", "")
    else:
        descripcion = escena_raw or ""
    if not id_svg:
        a.ctx.informe.revisar(a.donde(), "la escena de arrastre no indica su ilustración de fondo (`svg`)")
    viewbox, real = viewbox_de_svg(a.ctx.raiz_web, a.ctx.numero, id_svg) if id_svg else ("0 0 800 600", True)
    if id_svg and not real:
        a.ctx.informe.corregido(a.donde("viewBox"), f"viewBox provisional {viewbox} (el SVG «{id_svg}» aún no existe)")
    limpio, marcas = a.ctx.extraer(str(descripcion))
    a.ctx.marcar(a.id, marcas)
    alt = (
        a.recortar_alt(a_plano(limpio), "escena.alt", 300)
        if limpio.strip()
        else a.alt_de_ilustracion(id_svg, "escena.alt")
    )
    escena: dict[str, Any] = {"viewBox": viewbox}
    if id_svg:
        escena["fondo_svg"] = f"/images/m{a.ctx.numero}/{id_svg}.svg"
    escena["alt"] = alt

    # Moléculas: las de `moleculas` más las que solo aparecen definidas dentro de `distractores`.
    moleculas: dict[str, dict] = {}
    for m in a.lista("moleculas"):
        moleculas[a.id_de_lista(m.get("id"), a.donde("moleculas"))] = m
    rechazos: dict[str, str] = {}
    distractores: list[str] = []
    for i, dt in enumerate(a.lista("distractores", requerido=False)):
        if isinstance(dt, str):
            raw, cuerpo = dt, {}
        else:
            raw = dt.get("molecula") or dt.get("id")
            cuerpo = dt if isinstance(dt, dict) else {}
        ident = a.id_de_lista(raw, a.donde(f"distractores[{i}]"))
        distractores.append(ident)
        if ident not in moleculas:
            moleculas[ident] = cuerpo
        motivo = next((cuerpo[k] for k in ("por_que", "motivo", "por_que_no_encaja", "rechazo") if cuerpo.get(k)), None)
        if motivo:
            rechazos[ident] = motivo
    out_moleculas = []
    ids_mol: dict[str, str] = {}
    for indice, (ident, m) in enumerate(moleculas.items()):
        nuevo = _prefijado(ident, "mol_")
        if nuevo in a.ctx.declarados:
            previo = a.ctx.declarados[nuevo]
            nuevo = a.ctx.nuevo_id(nuevo)
            a.ctx.informe.corregido(
                a.donde(f"molécula {ident}"),
                f"id de molécula repetido en el módulo ({previo}): renombrado a «{nuevo}»",
            )
        elif nuevo != ident:
            a.ctx.informe.corregido(
                a.donde(f"molécula {ident}"), f"id de molécula «{ident}» prefijado a «{nuevo}» (convención `mol_`)"
            )
        ids_mol[ident] = nuevo
        a.ctx.declarar(nuevo, a.donde(f"molécula {ident}"), "molécula")
        etiqueta, descripcion_mol = _etiqueta_descripcion(
            a, ident, f"molécula {ident}", m.get("nombre") or m.get("etiqueta"), m.get("descripcion"), nuevo
        )
        item: dict[str, Any] = {
            "id": nuevo,
            "etiqueta": etiqueta,
            "descripcion": descripcion_mol,
            "forma": FORMAS[indice % len(FORMAS)],
        }
        motivo = rechazos.get(ident) or m.get("rechazo")
        if motivo:
            item["rechazo"] = a.texto(motivo, f"molécula {ident}.rechazo", minimo=10, maximo=300, marca_en=nuevo)
        elif ident in distractores:
            a.ctx.informe.revisar(a.donde(f"molécula {ident}"), "distractor sin texto de rechazo (por_que, motivo...)")
        out_moleculas.append(item)
        for extra in sorted(
            set(m)
            - {
                "id",
                "nombre",
                "etiqueta",
                "descripcion",
                "rechazo",
                "molecula",
                "por_que",
                "motivo",
                "por_que_no_encaja",
            }
        ):
            a.omitir(extra, a.donde(f"molécula {ident}"))
    if len(distractores) or out_moleculas:
        a.ctx.informe.corregido(
            a.donde("moleculas.forma"), "forma de las moléculas asignada por orden (el guion no la indica)"
        )

    receptores_raw = a.lista("receptores")
    faltan_posicion = any("posicion" not in r for r in receptores_raw)
    automaticas = _posiciones(len(receptores_raw), viewbox) if faltan_posicion else None
    if faltan_posicion and automaticas is None:
        a.ctx.informe.revisar(
            a.donde("receptores"),
            f"no se pudieron repartir {len(receptores_raw)} receptores respetando 52 px de separación",
        )
    out_receptores = []
    ids_rec: dict[str, str] = {}
    for k, r in enumerate(receptores_raw):
        ident = a.id_de_lista(r.get("id"), a.donde(f"receptores[{k}]"))
        nuevo = _prefijado(ident, "rec_")
        ids_rec[ident] = nuevo
        if nuevo != ident:
            a.ctx.informe.corregido(
                a.donde(f"receptor {ident}"), f"id de receptor «{ident}» prefijado a «{nuevo}» (convención `rec_`)"
            )
        if isinstance(r.get("posicion"), dict):
            posicion = {"x": r["posicion"].get("x"), "y": r["posicion"].get("y")}
        else:
            posicion = automaticas[k] if automaticas else {"x": 50, "y": 50}
        etiqueta_rec, descripcion_rec = _etiqueta_descripcion(
            a, ident, f"receptor {ident}", r.get("nombre") or r.get("etiqueta"), r.get("descripcion"), None
        )
        out_receptores.append(
            {"id": nuevo, "etiqueta": etiqueta_rec, "descripcion": descripcion_rec, "posicion": posicion}
        )
        for extra in sorted(set(r) - {"id", "nombre", "etiqueta", "descripcion", "posicion"}):
            a.omitir(extra, a.donde(f"receptor {ident}"))
    if faltan_posicion:
        a.ctx.informe.corregido(
            a.donde("receptores.posicion"),
            "posición de los receptores repartida en rejilla (el guion no la trae); alinear con las zonas del SVG cuando exista",
        )

    pares = []
    for p in a.lista("pares"):
        mol = normalizar_id(p.get("molecula"))
        rec = normalizar_id(p.get("receptor"))
        e = p.get("efecto") or {}
        marca = ids_mol.get(mol, a.id)
        animacion = e.get("animacion")
        if animacion is None:
            animacion = inferir_animacion(str(e.get("que_se_anima") or e.get("anima") or ""), str(e.get("titulo", "")))
            if animacion == "union" and not (e.get("que_se_anima") or e.get("anima")):
                animacion = inferir_animacion(str(e.get("descripcion", "")))
            a.ctx.informe.corregido(
                a.donde(f"par {mol}"), f"animación «{animacion}» deducida del texto del efecto (el guion no la indica)"
            )
        elif animacion not in ANIMACIONES:
            a.ctx.informe.revisar(a.donde(f"par {mol}"), f"animación «{animacion}» fuera del vocabulario cerrado")
        efecto: dict[str, Any] = {
            "titulo": a.texto(
                e.get("titulo"), f"par {mol}.efecto.titulo", plano=True, minimo=3, maximo=80, marca_en=marca
            ),
            "descripcion": a.texto(
                e.get("descripcion"), f"par {mol}.efecto.descripcion", minimo=10, maximo=450, marca_en=marca
            ),
            "animacion": animacion,
        }
        indicadores = []
        for ind in e.get("indicadores") or []:
            direccion = str(ind.get("direccion", ""))
            if direccion not in DIRECCIONES:
                a.ctx.informe.revisar(
                    a.donde(f"par {mol}"), f"dirección de indicador «{direccion}» fuera de {DIRECCIONES}"
                )
            indicadores.append(
                {
                    "etiqueta": a.texto(
                        ind.get("etiqueta"), f"par {mol}.indicador", plano=True, minimo=3, maximo=60, marca_en=marca
                    ),
                    "direccion": direccion,
                }
            )
        if indicadores:
            efecto["indicadores"] = indicadores
        for extra in sorted(set(e) - {"titulo", "descripcion", "animacion", "indicadores"}):
            a.omitir(extra, a.donde(f"par {mol}"))
        pares.append(
            {
                "id": f"par_{re.sub(r'^mol_', '', ids_mol.get(mol, mol))}_{re.sub(r'^rec_', '', ids_rec.get(rec, rec))}"[
                    :64
                ],
                "molecula": ids_mol.get(mol, mol),
                "receptor": ids_rec.get(rec, rec),
                "efecto": efecto,
            }
        )
    if len(out_moleculas) > 8 or len(pares) > 6 or len(out_receptores) > 6 or len(distractores) > 4:
        a.ctx.informe.revisar(
            a.donde(),
            f"{len(out_moleculas)} moléculas, {len(out_receptores)} receptores, {len(pares)} pares y {len(distractores)} "
            "distractores; el esquema admite 8, 6, 6 y 4",
        )
    return {
        "escena": escena,
        "moleculas": out_moleculas,
        "receptores": out_receptores,
        "pares": pares,
        "distractores": [ids_mol.get(d, d) for d in distractores],
    }


# --- video + texto (animación) ---------------------------------------------------------------------


def _video_texto(a: _Actividad) -> dict:
    id_svg = _svg_de(a)
    viewbox, real = viewbox_de_svg(a.ctx.raiz_web, a.ctx.numero, id_svg)
    if not real:
        a.ctx.informe.corregido(a.donde("viewBox"), f"viewBox provisional {viewbox} (el SVG «{id_svg}» aún no existe)")
    ilu = a.ctx.guion.ilustraciones.get(id_svg)
    capas_tabla = [c for c, _ in ilu.capas] if ilu else []
    pasos = []
    for i, p in enumerate(a.lista("pasos")):
        raw = a.id_de_lista(p.get("id"), a.donde(f"pasos[{i}].id"))
        ident = _prefijado(raw, "paso_")
        if ident != raw:
            a.ctx.informe.corregido(
                a.donde(f"paso {raw}"), f"id de paso «{raw}» prefijado a «{ident}» (convención `paso_`)"
            )
        dnd = f"paso {raw}"
        cambia = p.get("cambia_escena") if isinstance(p.get("cambia_escena"), dict) else {}
        visibles: list[str]
        if p.get("capas_visibles"):
            visibles = [normalizar_id(x) for x in p["capas_visibles"]]
        elif cambia.get("mostrar"):
            visibles = [normalizar_id(x) for x in cambia["mostrar"]]
        else:
            texto_escena = str(p.get("escena") or p.get("cambia_en_escena") or "")
            visibles = [
                c for c in capas_tabla if re.search(rf"(?<![a-z0-9_]){re.escape(c)}(?![a-z0-9_])", texto_escena)
            ]
            if visibles:
                a.ctx.informe.corregido(
                    a.donde(dnd),
                    f"capas visibles deducidas de las capas nombradas en el texto de la escena: {', '.join(visibles)}",
                )
            else:
                visibles = list(capas_tabla)
                a.ctx.informe.revisar(
                    a.donde(dnd),
                    "el guion no dice qué capas se muestran en este paso: se pusieron todas las de la ilustración; hay que decidirlo",
                )
        resaltadas = [normalizar_id(x) for x in (cambia.get("resaltar") or [])]
        for r in resaltadas:
            if r not in visibles:
                visibles.append(r)
                a.ctx.informe.corregido(
                    a.donde(dnd), f"capa «{r}» resaltada pero no listada como visible: se añadió a las visibles"
                )
        fuera = [v for v in visibles if capas_tabla and v not in capas_tabla]
        if fuera:
            a.ctx.informe.revisar(
                a.donde(dnd), f"capas que la tabla de ilustraciones de «{id_svg}» no pide dibujar: {', '.join(fuera)}"
            )
        paso = {
            "id": ident,
            "titulo": a.texto(p.get("titulo"), f"{dnd}.titulo", plano=True, minimo=3, maximo=80),
            "texto": a.texto(p.get("texto_narrado") or p.get("texto"), f"{dnd}.texto", minimo=10, maximo=500),
            "visibles": visibles,
            "resaltadas": resaltadas,
        }
        for extra in sorted(
            set(p)
            - {
                "id",
                "titulo",
                "texto",
                "texto_narrado",
                "capas_visibles",
                "cambia_escena",
                "cambia_en_escena",
                "escena",
            }
        ):
            a.omitir(extra, a.donde(dnd))
        for descartado in ("cambia_en_escena", "escena"):
            if descartado in p:
                a.omitir(descartado, a.donde(dnd))
        if cambia.get("animacion"):
            a.omitir("cambia_escena.animacion", a.donde(dnd))
        pasos.append(paso)
    if not 2 <= len(pasos) <= 10:
        a.ctx.informe.revisar(a.donde("pasos"), f"{len(pasos)} pasos; el esquema admite de 2 a 10")
    return {
        "medio": "animacion",
        "svg": f"/images/m{a.ctx.numero}/{id_svg}.svg",
        "viewBox": viewbox,
        "alt": a.alt_de_ilustracion(id_svg),
        "pasos": pasos,
    }


# --- exploración 3D ------------------------------------------------------------------------------


def _exploracion_3d(a: _Actividad) -> dict:
    modelo = str(a.d.get("modelo", "")).strip()
    modo = str(a.d.get("modo", "explorar")).strip()
    nodos = []
    for i, h in enumerate(a.lista("hotspots")):
        ident = a.id_de_lista(h.get("id"), a.donde(f"hotspots[{i}].id"))
        nodo: dict[str, Any] = {
            "id": ident,
            "etiqueta": a.texto(h.get("etiqueta"), f"nodo {ident}.etiqueta", plano=True, minimo=2, maximo=60),
            "descripcion": a.texto(h.get("descripcion"), f"nodo {ident}.descripcion", minimo=10, maximo=500),
        }
        if "pista" in h:
            nodo["pista"] = a.texto(h.get("pista"), f"nodo {ident}.pista", minimo=10, maximo=200)
        if "pistas_extra" in h:
            nodo["pistas_extra"] = [
                a.texto(x, f"nodo {ident}.pistas_extra", minimo=10, maximo=200) for x in h.get("pistas_extra") or []
            ]
        if modelo == "mandibula":
            ancla = ANCLAS_MANDIBULA.get(ident)
            if ancla is None:
                a.ctx.informe.revisar(
                    a.donde(f"nodo {ident}"),
                    f"no hay ancla en tools/guiones/conversor/recursos.py para el hotspot «{ident}»",
                )
            else:
                nodo["ancla"] = {"x": ancla[0], "y": ancla[1], "z": ancla[2]}
        for campo in ("zona_anatomica", "zona"):
            if campo in h:
                a.omitir(campo, a.donde(f"nodo {ident}"))
        for extra in sorted(
            set(h) - {"id", "etiqueta", "descripcion", "zona_anatomica", "zona", "pista", "pistas_extra"}
        ):
            a.omitir(extra, a.donde(f"nodo {ident}"))
        nodos.append(nodo)
    if modelo == "mandibula" and nodos:
        a.ctx.informe.corregido(
            a.donde("nodos.ancla"),
            "ancla de los hotspots tomada de la tabla provisional (tools/guiones/conversor/recursos.py): ajustar al inspeccionar el modelo",
        )
    requeridos = [
        a.id_de_lista(x, a.donde("requeridos")) for x in (a.d.get("requeridos") or a.d.get("requeridas") or [])
    ]
    if not 2 <= len(nodos) <= 12:
        a.ctx.informe.revisar(a.donde("hotspots"), f"{len(nodos)} nodos; el esquema admite de 2 a 12")
    config: dict[str, Any] = {"modelo": modelo}
    if modo == "identificar":
        config["modo"] = "identificar"
    elif modo != "explorar":
        a.ctx.informe.revisar(a.donde("modo"), f"modo «{modo}»; la exploración 3D admite explorar o identificar")
    config.update(
        {
            "alt": ALT_MODELO_3D.get(modelo, ALT_MODELO_3D["mandibula"]),
            "nodos": nodos,
            "requeridos": requeridos,
        }
    )
    return config


# --- punto de entrada ----------------------------------------------------------------------------

_CONVERSORES = {
    "quiz": _quiz,
    "relacion-columnas": _columnas,
    "multicapa": _multicapa,
    "arrastre-molecular": _arrastre,
    "video-texto": _video_texto,
    "exploracion-3d": _exploracion_3d,
}


def convertir_actividad(ag: ActividadGuion, ctx: Contexto) -> dict | None:
    tipo = ag.datos.get("tipo")
    a = _Actividad(ag, ctx)
    ctx.declarar(a.id, a.donde(), "actividad")
    if tipo not in _CONVERSORES:
        ctx.informe.revisar(a.donde(), f"tipo de actividad desconocido: «{tipo}»")
        return None
    config = _CONVERSORES[tipo](a)
    actividad = a.base(config)
    if a.texto_previo:
        ctx.texto_previo[a.id] = a.texto_previo
    return actividad
