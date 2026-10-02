/**
 * SVG de la explicación animada (video-texto, medio "animacion").
 *
 * Descarga el dibujo con `fetch`, lo valida, lo sanea (defensa en profundidad: el archivo ya pasó
 * la auditoría de `content/svg.ts`, pero aquí se inyecta en la página) y aplica el estado de cada
 * paso: `visibles` se muestran, el resto se oculta, y `resaltadas` llevan un contorno más grueso
 * (no solo color). Solo controla los `<g id>` HIJOS DIRECTOS de la raíz `<svg>`.
 *
 * Son funciones sobre el DOM, sin estado propio: el componente decide cuándo llamarlas.
 */
import { SVG_MAX_BYTES } from '@/content/constantes';
import { prefijarIdsRestantes } from '@/activities/idsUnicos';

export type MotivoErrorSvg = 'red' | 'tamano' | 'formato';

/** Fallo al obtener o validar el SVG. El componente lo muestra con un texto genérico en español. */
export class ErrorSvg extends Error {
  readonly motivo: MotivoErrorSvg;
  constructor(motivo: MotivoErrorSvg, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorSvg';
    this.motivo = motivo;
  }
}

export interface SvgListo {
  raiz: SVGSVGElement;
  /** `<g id>` hijos directos de la raíz, por su id ORIGINAL (antes de prefijar los referenciados). */
  grupos: Map<string, SVGElement>;
}

/** Elementos que nunca deben quedar en el DOM de la página. */
const ELEMENTOS_PROHIBIDOS: ReadonlySet<string> = new Set([
  'script',
  'foreignobject',
  'style',
  'image',
  'animate',
  'animatetransform',
  'animatemotion',
  'set',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
]);

const REFERENCIA_URL = /url\(\s*(['"]?)([^)'"]*?)\1\s*\)/gi;

function esHref(nombre: string): boolean {
  return nombre === 'href' || nombre === 'xlink:href';
}

/** ¿El valor del atributo tiene un `url(...)` que no apunta a un `#id` local? */
function tieneUrlExterna(valor: string): boolean {
  for (const m of valor.matchAll(REFERENCIA_URL)) {
    if (!(m[2] ?? '').trim().startsWith('#')) return true;
  }
  return false;
}

/**
 * Elimina de `raiz` lo que no debe inyectarse: elementos activos, atributos `on*`, `href` que no
 * sean `#id`, `url()` externos y `javascript:`. Luego prefija con `prefijo` los ids referenciados
 * (`url(#id)`, `href="#id"`) y reescribe esas referencias, para que el mismo dibujo pueda estar
 * dos veces en la página sin colisiones.
 */
export function sanearSvg(raiz: Element, prefijo: string): void {
  for (const el of Array.from(raiz.querySelectorAll('*'))) {
    if (ELEMENTOS_PROHIBIDOS.has(el.localName.toLowerCase())) el.remove();
  }
  const elementos = [raiz, ...Array.from(raiz.querySelectorAll('*'))];

  const definidos = new Set<string>();
  for (const el of elementos) {
    const id = el.getAttribute('id');
    if (id) definidos.add(id);
  }

  // Pasada 1: quitar lo peligroso y anotar qué ids se referencian.
  const referenciados = new Set<string>();
  for (const el of elementos) {
    for (const atributo of Array.from(el.attributes)) {
      const nombre = atributo.name.toLowerCase();
      const valor = atributo.value;
      if (
        nombre.startsWith('on') ||
        nombre === 'tabindex' ||
        /javascript:/i.test(valor) ||
        (esHref(nombre) && !valor.trim().startsWith('#')) ||
        tieneUrlExterna(valor)
      ) {
        el.removeAttribute(atributo.name);
        continue;
      }
      if (esHref(nombre)) referenciados.add(valor.trim().slice(1));
      for (const m of valor.matchAll(REFERENCIA_URL)) {
        referenciados.add((m[2] ?? '').trim().slice(1));
      }
    }
  }

  const aPrefijar = new Set([...referenciados].filter((id) => definidos.has(id)));
  if (aPrefijar.size === 0) return;

  // Pasada 2: prefijar los ids referenciados y reescribir las referencias.
  for (const el of elementos) {
    const id = el.getAttribute('id');
    if (id !== null && aPrefijar.has(id)) el.setAttribute('id', `${prefijo}${id}`);
    for (const atributo of Array.from(el.attributes)) {
      const valor = atributo.value;
      if (esHref(atributo.name.toLowerCase())) {
        const destino = valor.trim().slice(1);
        if (aPrefijar.has(destino)) el.setAttribute(atributo.name, `#${prefijo}${destino}`);
      } else if (valor.includes('url(')) {
        el.setAttribute(
          atributo.name,
          valor.replace(REFERENCIA_URL, (todo, _comilla: string, destino: string) => {
            const id = destino.trim().slice(1);
            return aPrefijar.has(id) ? `url(#${prefijo}${id})` : todo;
          }),
        );
      }
    }
  }
}

/**
 * Interpreta el texto como SVG y devuelve la raíz saneada más los grupos controlables. Lanza
 * `ErrorSvg('formato' | 'tamano')`.
 */
export function prepararSvg(texto: string, prefijo: string, viewBox: string): SvgListo {
  if (new TextEncoder().encode(texto).length > SVG_MAX_BYTES) {
    throw new ErrorSvg('tamano', `El SVG pesa más de ${SVG_MAX_BYTES} bytes.`);
  }
  // Un DOCTYPE con entidades permite ataques de expansión: el contenido válido no los lleva.
  if (/<!DOCTYPE|<!ENTITY/i.test(texto)) {
    throw new ErrorSvg('formato', 'El SVG contiene DOCTYPE o ENTITY.');
  }
  if (typeof DOMParser === 'undefined') throw new ErrorSvg('formato', 'Sin DOMParser.');
  const documento = new DOMParser().parseFromString(texto, 'image/svg+xml');
  const origen = documento.documentElement;
  if (
    !origen ||
    origen.localName.toLowerCase() !== 'svg' ||
    documento.querySelector('parsererror') !== null
  ) {
    throw new ErrorSvg('formato', 'El archivo no es un SVG válido.');
  }

  // Los grupos se buscan ANTES de reescribir ids: `fondo_hueso` puede quedar prefijado.
  const raiz = document.importNode(origen, true) as unknown as SVGSVGElement;
  const grupos = new Map<string, SVGElement>();
  for (const hijo of Array.from(raiz.children)) {
    const id = hijo.getAttribute('id');
    if (hijo.localName.toLowerCase() === 'g' && id && !grupos.has(id)) {
      grupos.set(id, hijo as SVGElement);
    }
  }

  sanearSvg(raiz, prefijo);
  // Los ids que nadie referencia también se prefijan: dos dibujos con el mismo `fondo_escena` no repiten ids.
  // Los grupos ya están guardados por elemento (arriba), con su id original como clave.
  prefijarIdsRestantes(raiz, prefijo);

  // El dibujo escala al ancho de la pantalla: sin tamaño fijo y con el viewBox del contenido.
  raiz.removeAttribute('width');
  raiz.removeAttribute('height');
  raiz.setAttribute('viewBox', viewBox);
  raiz.setAttribute('focusable', 'false');
  raiz.setAttribute('aria-hidden', 'true');
  raiz.style.display = 'block';
  raiz.style.width = '100%';
  raiz.style.height = 'auto';
  raiz.style.color = 'var(--foreground)';
  return { raiz, grupos };
}

/** Descarga el SVG (`fetch`) y lo prepara. Lanza `ErrorSvg`; un aborto se propaga como `AbortError`. */
export async function cargarSvg(
  url: string,
  prefijo: string,
  viewBox: string,
  signal?: AbortSignal,
): Promise<SvgListo> {
  let texto: string;
  try {
    const respuesta = await fetch(url, { signal });
    if (!respuesta.ok) throw new ErrorSvg('red', `HTTP ${respuesta.status}`);
    texto = await respuesta.text();
  } catch (error) {
    if (error instanceof ErrorSvg) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ErrorSvg('red', error instanceof Error ? error.message : 'Sin conexión.');
  }
  return prepararSvg(texto, prefijo, viewBox);
}

/* -------------------------------------------------------------------------------------------
 * Estado de un paso
 * ----------------------------------------------------------------------------------------- */

const FORMAS = 'path, rect, circle, ellipse, line, polyline, polygon';
const DURACION_TRANSICION_MS = 350;

interface ContornoOriginal {
  trazo: string | null;
  grosor: string | null;
}
const originales = new WeakMap<Element, ContornoOriginal>();

/** Contorno más grueso en todas las formas del grupo (y restaura el original al quitarlo). */
function resaltarGrupo(grupo: SVGElement, activa: boolean): void {
  if (activa) grupo.setAttribute('data-resaltada', 'true');
  else grupo.removeAttribute('data-resaltada');
  for (const forma of Array.from(grupo.querySelectorAll(FORMAS))) {
    if (activa) {
      if (!originales.has(forma)) {
        originales.set(forma, {
          trazo: forma.getAttribute('stroke'),
          grosor: forma.getAttribute('stroke-width'),
        });
      }
      const original = originales.get(forma)!;
      const grosor = Number.parseFloat(original.grosor ?? '');
      const base = Number.isFinite(grosor) && grosor > 0 ? grosor : 1;
      forma.setAttribute('stroke-width', String(Math.max(base * 2, base + 3)));
      if (original.trazo === null || original.trazo === 'none') {
        forma.setAttribute('stroke', 'currentColor');
      }
    } else {
      const original = originales.get(forma);
      if (!original) continue;
      if (original.grosor === null) forma.removeAttribute('stroke-width');
      else forma.setAttribute('stroke-width', original.grosor);
      if (original.trazo === null) forma.removeAttribute('stroke');
      else forma.setAttribute('stroke', original.trazo);
      originales.delete(forma);
    }
  }
}

export interface EstadoPaso {
  visibles: readonly string[];
  resaltadas: readonly string[];
}

/**
 * Muestra solo los grupos de `visibles`, oculta los demás y resalta `resaltadas`. Con `animar` los
 * grupos aparecen y desaparecen con un fundido; sin él (reduced-motion, primera pintura) el cambio
 * es inmediato. Un id que no existe en el SVG se ignora.
 */
export function aplicarPaso(
  grupos: ReadonlyMap<string, SVGElement>,
  paso: EstadoPaso,
  animar: boolean,
): void {
  const visibles = new Set(paso.visibles);
  const resaltadas = new Set(paso.resaltadas);
  for (const [id, grupo] of grupos) {
    const visible = visibles.has(id);
    grupo.style.transition = animar
      ? `opacity ${DURACION_TRANSICION_MS}ms ease, visibility 0s linear ${visible ? 0 : DURACION_TRANSICION_MS}ms`
      : 'none';
    grupo.style.opacity = visible ? '1' : '0';
    grupo.style.visibility = visible ? 'visible' : 'hidden';
    grupo.setAttribute('data-estado', visible ? 'visible' : 'oculta');
    resaltarGrupo(grupo, visible && resaltadas.has(id));
  }
}
