/**
 * Preparación del SVG de una actividad multicapa (docs/content-schema.md, secciones 8 y 16, y
 * cabecera de `activities/types.ts`, "Multicapa: zonas táctiles").
 *
 * El componente descarga el archivo con `fetch` y lo pasa por aquí ANTES de inyectarlo:
 *  1. Se interpreta como XML (no como HTML) y se rechaza lo que no sea un `<svg>` bien formado.
 *  2. Se sanea por defensa en profundidad (el archivo ya cumple las reglas de la sección 8): fuera
 *     `<script>`, `<foreignObject>`, `<style>`, `<image>` y la animación SMIL; fuera los atributos
 *     `on*`, los `href` que no sean `#id` y las referencias `url(...)` externas.
 *  3. Las capas se buscan DENTRO de este SVG (no en `document`) y se marcan con `data-capa`.
 *  4. Se construyen las zonas táctiles de cada capa, en su misma posición del orden de dibujo:
 *       a. si la capa trae una zona propia (`data-zona-toque` o un elemento con id `{capa}_toque`),
 *          esa es el objetivo táctil (transparente) y no se clona nada más;
 *       b. si no, cada forma visible se clona como transparente justo detrás de la original:
 *          con relleno, `pointer-events="all"`; solo con contorno, `stroke="transparent"`,
 *          `pointer-events="stroke"` y `stroke-width` de al menos `44 / escala` unidades.
 *  5. Los ids que aparecen en `url(#..)` o `href="#.."` (y esas referencias) reciben el prefijo
 *     `{actividad.id}__`, así el mismo dibujo puede estar dos veces en la página. Los demás ids también
 *     (`idsUnicos.ts`): ningún id del dibujo se repite con otro de la página. Las capas conservan su id
 *     original en `data-capa`.
 *
 * Todo es manipulación de DOM estándar: no se usa `innerHTML` con texto del archivo.
 */
import { TAMANO_TACTIL_MIN_PX } from '@/activities/types';
import { ANCHO_REFERENCIA_PX, SVG_MAX_BYTES } from '@/content/constantes';
import { prefijarIdsRestantes, prefijoDeIds } from '@/activities/idsUnicos';

const NS_SVG = 'http://www.w3.org/2000/svg';

export type CodigoErrorSvg = 'demasiado_grande' | 'invalido' | 'peligroso';

/** Error al interpretar el archivo: el componente lo traduce a un mensaje para el estudiante. */
export class ErrorSvg extends Error {
  readonly codigo: CodigoErrorSvg;
  constructor(codigo: CodigoErrorSvg, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorSvg';
    this.codigo = codigo;
  }
}

/** Elementos que nunca se inyectan (nombres en minúsculas). */
const ELEMENTOS_PROHIBIDOS = new Set([
  'script',
  'foreignobject',
  'style',
  'iframe',
  'object',
  'embed',
  'image',
  'animate',
  'set',
  'animatetransform',
  'animatemotion',
]);

/** Formas con geometría propia: candidatas a zona táctil. */
const FORMAS = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);

/** Contenedores cuyo contenido no se dibuja directamente: sus formas no reciben zona táctil. */
const NO_RENDERIZADOS = new Set([
  'defs',
  'clippath',
  'mask',
  'pattern',
  'marker',
  'symbol',
  'lineargradient',
  'radialgradient',
  'filter',
]);

/** Propiedades de pintura que un clon táctil no debe heredar del original. */
const PROPIEDADES_PINTURA = new Set([
  'fill',
  'stroke',
  'stroke-width',
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'filter',
  'mask',
  'marker-start',
  'marker-mid',
  'marker-end',
  'stroke-dasharray',
  'paint-order',
  'vector-effect',
]);

/** Atributos que no se copian a un clon táctil (id repetido, estilos, marcas propias). */
const ATRIBUTOS_NO_CLONADOS = new Set([
  'id',
  'class',
  'fill',
  'stroke',
  'stroke-width',
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'filter',
  'mask',
  'marker-start',
  'marker-mid',
  'marker-end',
  'stroke-dasharray',
  'paint-order',
  'vector-effect',
  'data-capa',
  'data-zona-toque',
]);

const URL_CUALQUIERA = /url\(\s*(['"]?)([^)]*?)\1\s*\)/gi;
const URL_LOCAL = /url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g;

/* -------------------------------------------------------------------------------------------
 * Estilos y atributos
 * ----------------------------------------------------------------------------------------- */

/** Valor de una propiedad dentro del atributo `style` de un elemento, o `null`. */
function valorDeEstilo(el: Element, propiedad: string): string | null {
  const estilo = el.getAttribute('style');
  if (!estilo) return null;
  for (const declaracion of estilo.split(';')) {
    const corte = declaracion.indexOf(':');
    if (corte < 0) continue;
    if (declaracion.slice(0, corte).trim().toLowerCase() === propiedad) {
      return declaracion.slice(corte + 1).trim();
    }
  }
  return null;
}

/** Quita del atributo `style` las propiedades de pintura (deja, por ejemplo, `transform`). */
function estiloSinPintura(estilo: string): string {
  return estilo
    .split(';')
    .filter((declaracion) => {
      const corte = declaracion.indexOf(':');
      if (corte < 0) return false;
      return !PROPIEDADES_PINTURA.has(declaracion.slice(0, corte).trim().toLowerCase());
    })
    .join(';');
}

/** Valor efectivo de una propiedad de pintura: el del elemento o el heredado del ancestro más cercano. */
function valorHeredado(el: Element, propiedad: string, porDefecto: string): string {
  for (let nodo: Element | null = el; nodo; nodo = nodo.parentElement) {
    const valor = valorDeEstilo(nodo, propiedad) ?? nodo.getAttribute(propiedad);
    if (valor !== null && valor.trim() !== '' && valor.trim().toLowerCase() !== 'inherit') {
      return valor.trim();
    }
  }
  return porDefecto;
}

function pinturaVisible(valor: string): boolean {
  const v = valor.trim().toLowerCase();
  if (v === 'none' || v === 'transparent') return false;
  // rgba(..., 0) y #rrggbb00: transparentes.
  if (/^rgba?\([^)]*[,/]\s*0(?:\.0+)?%?\s*\)$/.test(v)) return false;
  return true;
}

function opacidadNula(valor: string): boolean {
  const n = Number.parseFloat(valor);
  return Number.isFinite(n) && n <= 0;
}

/** ¿El elemento (o un ancestro) está oculto con `display:none` o `visibility:hidden`? */
function estaOculto(el: Element): boolean {
  for (let nodo: Element | null = el; nodo; nodo = nodo.parentElement) {
    const display = (valorDeEstilo(nodo, 'display') ?? nodo.getAttribute('display') ?? '').trim();
    if (display.toLowerCase() === 'none') return true;
  }
  const visibilidad = valorHeredado(el, 'visibility', 'visible').toLowerCase();
  return visibilidad === 'hidden' || visibilidad === 'collapse';
}

/** Grosor del contorno de una forma en unidades del viewBox (por defecto 1). */
function anchoDeTrazo(el: Element): number {
  const n = Number.parseFloat(valorHeredado(el, 'stroke-width', '1'));
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

/* -------------------------------------------------------------------------------------------
 * 1. Interpretación
 * ----------------------------------------------------------------------------------------- */

/**
 * Interpreta el texto como XML y devuelve el `<svg>` ya adoptado por `document`, sin sanear.
 * Lanza `ErrorSvg` si no es un SVG bien formado (por ejemplo, si el servidor devolvió una página
 * HTML de error con estado 200).
 */
export function interpretarSvg(texto: string): SVGSVGElement {
  if (typeof texto !== 'string' || texto.trim() === '') {
    throw new ErrorSvg('invalido', 'El archivo del dibujo está vacío.');
  }
  if (texto.length > SVG_MAX_BYTES * 2) {
    throw new ErrorSvg('demasiado_grande', 'El archivo del dibujo es demasiado grande.');
  }
  const limpio = texto.replace(/^\uFEFF/, '');
  // Sin DOCTYPE ni ENTITY: son la vía de la expansión de entidades y la sección 8 los prohíbe.
  if (/<!DOCTYPE|<!ENTITY/i.test(limpio)) {
    throw new ErrorSvg('peligroso', 'El archivo del dibujo trae declaraciones no permitidas.');
  }
  const doc = new DOMParser().parseFromString(limpio, 'image/svg+xml');
  const raiz = doc.documentElement;
  if (
    doc.querySelector('parsererror') ||
    !raiz ||
    raiz.localName !== 'svg' ||
    raiz.namespaceURI !== NS_SVG
  ) {
    throw new ErrorSvg('invalido', 'El archivo del dibujo no es un SVG válido.');
  }
  return document.importNode(raiz, true) as unknown as SVGSVGElement;
}

/* -------------------------------------------------------------------------------------------
 * 2. Saneamiento
 * ----------------------------------------------------------------------------------------- */

/** ¿El valor contiene una referencia `url(...)` que no sea a un `#id` del propio documento? */
function tieneUrlExterna(valor: string): boolean {
  for (const m of valor.matchAll(URL_CUALQUIERA)) {
    if (!(m[2] ?? '').trim().startsWith('#')) return true;
  }
  return false;
}

/**
 * Elimina lo que no debe inyectarse. Idempotente. Devuelve cuántos elementos y atributos quitó
 * (lo usan las pruebas).
 */
export function sanearSvg(raiz: Element): { elementos: number; atributos: number } {
  let elementos = 0;
  let atributos = 0;

  for (const el of Array.from(raiz.querySelectorAll('*'))) {
    if (ELEMENTOS_PROHIBIDOS.has(el.localName.toLowerCase())) {
      el.remove();
      elementos++;
    }
  }

  for (const el of [raiz, ...Array.from(raiz.querySelectorAll('*'))]) {
    for (const atributo of Array.from(el.attributes)) {
      const nombre = atributo.name.toLowerCase();
      const valor = atributo.value;
      const quitar =
        nombre.startsWith('on') ||
        // Las marcas propias del componente no pueden venir del archivo.
        nombre === 'data-capa' ||
        nombre === 'data-zona-auto' ||
        nombre === 'data-zona-sw' ||
        (atributo.localName.toLowerCase() === 'href' && !valor.trim().startsWith('#')) ||
        /^\s*(?:javascript|data|vbscript):/i.test(valor) ||
        tieneUrlExterna(valor) ||
        (nombre === 'style' && /expression\(|@import|javascript:/i.test(valor));
      if (quitar) {
        el.removeAttributeNode(atributo);
        atributos++;
      }
    }
  }
  return { elementos, atributos };
}

/* -------------------------------------------------------------------------------------------
 * 3. Capas
 * ----------------------------------------------------------------------------------------- */

/**
 * Busca cada capa por id DENTRO del SVG y la marca con `data-capa`. Compara por atributo, sin
 * construir selectores: un id con comillas, espacios o Unicode no rompe nada. Si el id se repite
 * en el archivo gana el primero.
 */
export function marcarCapas(raiz: Element, ids: readonly string[]): Map<string, Element> {
  const porId = new Map<string, Element>();
  for (const el of Array.from(raiz.querySelectorAll('[id]'))) {
    const id = el.getAttribute('id');
    if (id !== null && !porId.has(id)) porId.set(id, el);
  }
  const capas = new Map<string, Element>();
  for (const id of ids) {
    const el = porId.get(id);
    if (el && !capas.has(id)) {
      el.setAttribute('data-capa', id);
      capas.set(id, el);
    }
  }
  return capas;
}

/* -------------------------------------------------------------------------------------------
 * 4. Zonas táctiles
 * ----------------------------------------------------------------------------------------- */

/** Zona táctil propia de una capa: `data-zona-toque` o un elemento con id `{capa}_toque`. */
function buscarZonaPropia(capa: Element, id: string): Element | null {
  const porAtributo = capa.querySelector('[data-zona-toque]');
  if (porAtributo) return porAtributo;
  const idZona = `${id}_toque`;
  for (const el of Array.from(capa.querySelectorAll('[id]'))) {
    if (el.getAttribute('id') === idZona) return el;
  }
  return null;
}

/** Vuelve transparente y tocable la zona que dibujó el autor. */
function prepararZonaPropia(zona: Element): void {
  zona.setAttribute('data-zona-toque', '');
  for (const el of [zona, ...Array.from(zona.querySelectorAll('*'))]) {
    if (!FORMAS.has(el.localName.toLowerCase()) && el !== zona) continue;
    el.setAttribute('fill', 'transparent');
    el.setAttribute('stroke', 'transparent');
    el.setAttribute('pointer-events', 'all');
    el.removeAttribute('opacity');
    el.removeAttribute('filter');
    const estilo = el.getAttribute('style');
    if (estilo !== null) el.setAttribute('style', estiloSinPintura(estilo));
  }
}

/** Clon transparente de una forma, listo para ponerse justo detrás de la original. */
function clonarComoZona(forma: Element, relleno: boolean, escala: number): Element {
  const clon = forma.cloneNode(false) as Element;
  for (const atributo of Array.from(clon.attributes)) {
    if (ATRIBUTOS_NO_CLONADOS.has(atributo.name.toLowerCase())) clon.removeAttribute(atributo.name);
  }
  const estilo = clon.getAttribute('style');
  if (estilo !== null) clon.setAttribute('style', estiloSinPintura(estilo));

  const original = anchoDeTrazo(forma);
  clon.setAttribute('fill', 'transparent');
  clon.setAttribute('stroke', 'transparent');
  clon.setAttribute('data-zona-auto', '');
  clon.setAttribute('aria-hidden', 'true');
  if (relleno) {
    clon.setAttribute('pointer-events', 'all');
    clon.setAttribute('stroke-width', String(original));
  } else {
    clon.setAttribute('pointer-events', 'stroke');
    clon.setAttribute('data-zona-sw', String(original));
    clon.setAttribute('stroke-width', String(anchoTactil(original, escala)));
  }
  return clon;
}

/** Grosor de una zona de solo contorno: `max(original, 44 / escala)` (unidades del viewBox). */
export function anchoTactil(original: number, escala: number): number {
  const e = Number.isFinite(escala) && escala > 0 ? escala : ANCHO_REFERENCIA_PX / 800;
  const minimo = TAMANO_TACTIL_MIN_PX / e;
  // Tres decimales bastan y evitan atributos con 15 dígitos.
  return Math.round(Math.max(original, minimo) * 1000) / 1000;
}

/**
 * Construye las zonas táctiles de todas las capas. Devuelve cuántas capas usaron zona propia y
 * cuántos clones se crearon. `escala` son píxeles CSS por unidad del viewBox.
 */
export function construirZonasTactiles(
  capas: ReadonlyMap<string, Element>,
  escala: number,
): { propias: number; clones: number } {
  let propias = 0;
  let clones = 0;
  for (const [id, capa] of capas) {
    const zona = buscarZonaPropia(capa, id);
    if (zona) {
      prepararZonaPropia(zona);
      propias++;
      continue;
    }
    for (const forma of Array.from(capa.querySelectorAll('*'))) {
      if (!FORMAS.has(forma.localName.toLowerCase())) continue;
      // Formas de una capa anidada: las clona la capa anidada (así quedan bajo el id correcto).
      if (forma.closest('[data-capa]') !== capa) continue;
      if (estaEnContenedorNoRenderizado(forma, capa) || estaOculto(forma)) continue;
      const esLinea = ['line', 'polyline'].includes(forma.localName.toLowerCase());
      const fill = valorHeredado(forma, 'fill', 'black');
      const relleno =
        !esLinea &&
        pinturaVisible(fill) &&
        !opacidadNula(valorHeredado(forma, 'fill-opacity', '1'));
      const contorno =
        pinturaVisible(valorHeredado(forma, 'stroke', 'none')) &&
        !opacidadNula(valorHeredado(forma, 'stroke-opacity', '1'));
      if (!relleno && !contorno) continue;
      forma.after(clonarComoZona(forma, relleno, escala));
      clones++;
    }
  }
  return { propias, clones };
}

function estaEnContenedorNoRenderizado(forma: Element, limite: Element): boolean {
  for (let nodo = forma.parentElement; nodo && nodo !== limite; nodo = nodo.parentElement) {
    if (NO_RENDERIZADOS.has(nodo.localName.toLowerCase())) return true;
  }
  return false;
}

/** Recalcula el grosor de las zonas de solo contorno cuando cambia la escala del dibujo. */
export function actualizarEscala(raiz: Element, escala: number): void {
  for (const clon of Array.from(raiz.querySelectorAll('[data-zona-sw]'))) {
    const original = Number.parseFloat(clon.getAttribute('data-zona-sw') ?? '1');
    clon.setAttribute(
      'stroke-width',
      String(anchoTactil(Number.isFinite(original) ? original : 1, escala)),
    );
  }
}

/* -------------------------------------------------------------------------------------------
 * 5. Ids referenciados
 * ----------------------------------------------------------------------------------------- */

/**
 * Antepone `prefijo` a los ids que aparecen en `url(#..)` o `href="#.."`, y reescribe esas
 * referencias. Los ids que nadie referencia (las capas, por ejemplo) no se tocan. Devuelve los
 * ids reescritos (viejo -> nuevo).
 */
export function prefijarIdsReferenciados(raiz: Element, prefijo: string): Map<string, string> {
  const todos = [raiz, ...Array.from(raiz.querySelectorAll('*'))];
  const existentes = new Set<string>();
  for (const el of todos) {
    const id = el.getAttribute('id');
    if (id !== null) existentes.add(id);
  }

  const referenciados = new Set<string>();
  for (const el of todos) {
    for (const atributo of Array.from(el.attributes)) {
      const valor = atributo.value;
      if (atributo.localName.toLowerCase() === 'href' && valor.trim().startsWith('#')) {
        referenciados.add(valor.trim().slice(1));
      }
      for (const m of valor.matchAll(URL_LOCAL)) referenciados.add(m[2] ?? '');
    }
  }

  const nuevos = new Map<string, string>();
  for (const id of referenciados) {
    if (existentes.has(id)) nuevos.set(id, `${prefijo}${id}`);
  }
  if (nuevos.size === 0) return nuevos;

  for (const el of todos) {
    const id = el.getAttribute('id');
    if (id !== null && nuevos.has(id)) el.setAttribute('id', nuevos.get(id) as string);
    for (const atributo of Array.from(el.attributes)) {
      const valor = atributo.value;
      if (atributo.localName.toLowerCase() === 'href' && valor.trim().startsWith('#')) {
        const nuevo = nuevos.get(valor.trim().slice(1));
        if (nuevo !== undefined) atributo.value = `#${nuevo}`;
      } else if (valor.includes('url(')) {
        atributo.value = valor.replace(URL_LOCAL, (completo, comilla: string, id: string) => {
          const nuevo = nuevos.get(id);
          return nuevo === undefined ? completo : `url(${comilla}#${nuevo}${comilla})`;
        });
      }
    }
  }
  return nuevos;
}

export { prefijoDeIds };

/* -------------------------------------------------------------------------------------------
 * Todo junto
 * ----------------------------------------------------------------------------------------- */

const VIEWBOX_VALIDO =
  /^\s*-?\d+(?:\.\d+)?[\s,]+-?\d+(?:\.\d+)?[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)\s*$/;

/** Ancho y alto del viewBox (`"0 0 800 600"`), o `null` si no es válido. */
export function medidasDeViewBox(viewBox: string | null | undefined): [number, number] | null {
  const m = viewBox ? VIEWBOX_VALIDO.exec(viewBox) : null;
  if (!m) return null;
  const ancho = Number(m[1]);
  const alto = Number(m[2]);
  return ancho > 0 && alto > 0 ? [ancho, alto] : null;
}

export interface OpcionesPreparacion {
  /** Ids de las capas de la configuración. */
  idsCapas: readonly string[];
  /** Prefijo de los ids referenciados (`prefijoDeIds(actividad.id)`). */
  prefijoId: string;
  /** viewBox de la configuración: se usa si el archivo no trae uno válido. */
  viewBox: string;
  /** Píxeles CSS por unidad del viewBox cuando ya se conoce; si no, se supone un móvil de 320 px. */
  escala?: number;
}

export interface SvgPreparado {
  raiz: SVGSVGElement;
  /** Capas encontradas en el dibujo (las que falten siguen disponibles en la lista). */
  capas: Map<string, Element>;
  /** Ancho y alto reales del viewBox. */
  medidas: [number, number];
}

/** Interpreta, sanea y prepara el SVG. Lanza `ErrorSvg` si el archivo no sirve. */
export function prepararSvg(texto: string, opciones: OpcionesPreparacion): SvgPreparado {
  const raiz = interpretarSvg(texto);
  sanearSvg(raiz);

  // Un viewBox propio válido manda (es el que dibuja el archivo); si no, el de la configuración.
  let medidas = medidasDeViewBox(raiz.getAttribute('viewBox'));
  if (!medidas) {
    medidas = medidasDeViewBox(opciones.viewBox) ?? [800, 600];
    raiz.setAttribute('viewBox', `0 0 ${medidas[0]} ${medidas[1]}`);
  }

  const escala =
    opciones.escala !== undefined && opciones.escala > 0
      ? opciones.escala
      : ANCHO_REFERENCIA_PX / medidas[0];

  // Las capas se buscan y se marcan antes de reescribir ids.
  const capas = marcarCapas(raiz, opciones.idsCapas);
  construirZonasTactiles(capas, escala);
  prefijarIdsReferenciados(raiz, opciones.prefijoId);
  // Y el resto de ids (los no referenciados): dos dibujos con el mismo `fondo_escena` en una página no repiten ids.
  // Las capas siguen ubicadas por su elemento y por `data-capa`, que conserva el id original.
  prefijarIdsRestantes(raiz, opciones.prefijoId);

  // El tamaño lo da el CSS (ancho completo); nada del archivo debe posicionarlo ni fijarle medidas.
  for (const nombre of ['width', 'height', 'style', 'class', 'role', 'tabindex']) {
    raiz.removeAttribute(nombre);
  }
  raiz.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  raiz.setAttribute('aria-hidden', 'true');
  raiz.setAttribute('focusable', 'false');
  raiz.setAttribute('class', 'multicapa-svg');
  return { raiz, capas, medidas };
}
