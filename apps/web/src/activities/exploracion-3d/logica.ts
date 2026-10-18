/**
 * Lógica pura de la actividad `exploracion-3d` (sin Vue, three ni WebGL): qué nodos hay, cuáles son
 * requeridos, cómo se guarda y se restaura una exploración a medias y cuánto se ha avanzado.
 *
 * La configuración es de solo lectura y puede venir imperfecta (el componente no debe romperse con
 * ids repetidos ni con `requeridos` que no existen: el esquema los rechaza, pero un contenido viejo o
 * escrito a mano no pasa por el esquema en las pruebas), así que se sanea aquí.
 */
import type { DetalleExploracion3d, JsonObjeto } from '@/activities/types';
import { MODELO_PROCEDURAL, estructuraDeNodo } from '@/content/nodos3d';
import type { ConfigExploracion3d } from '@/content/schema';
import type { NodoEscena } from '@/scenes/nodosEscena';

/** Un nodo del contenido, ya con la cámara resuelta y listo para mostrar. */
export interface NodoExploracion extends NodoEscena {
  /** Markdown restringido de una línea (se muestra con `renderizarLinea`). */
  descripcion: string;
  requerido: boolean;
}

/** Un paso de la línea de tiempo de una escena procedural, listo para mostrar. */
export interface PasoExploracion {
  id: string;
  /** Instante del hito, de 0 a 1. */
  t: number;
  titulo: string;
  /** Markdown restringido de una línea. */
  texto: string;
  /** Vista de cámara con nombre de la escena procedural. */
  vista: string;
}

export interface Exploracion {
  nodos: NodoExploracion[];
  /** Ids requeridos, en el orden del contenido y solo los que existen. */
  requeridos: string[];
  /**
   * Solo en una escena procedural: sus pasos ordenados por `t` (sin ids repetidos). Cada paso es también
   * un nodo de `nodos` (la lista de fases que sirve de alternativa sin WebGL).
   */
  pasos: PasoExploracion[];
}

/** ¿Es una escena procedural (con línea de tiempo) en lugar de un modelo con nodos? */
export function esExploracionProcedural(config: Pick<ConfigExploracion3d, 'modelo'>): boolean {
  return config.modelo === MODELO_PROCEDURAL;
}

/** Pasos de la línea de tiempo, ordenados por `t` y sin ids repetidos (gana el primero). */
export function pasosDeConfig(config: ConfigExploracion3d): PasoExploracion[] {
  const vistos = new Set<string>();
  return (config.linea_de_tiempo?.pasos ?? [])
    .filter((paso) => {
      if (vistos.has(paso.id)) return false;
      vistos.add(paso.id);
      return true;
    })
    .map((paso) => ({
      id: paso.id,
      t: paso.t,
      titulo: paso.titulo,
      texto: paso.texto,
      vista: paso.vista,
    }))
    .sort((a, b) => a.t - b.t);
}

/**
 * Nodos y requeridos saneados. Con ids repetidos gana el primero; los `requeridos` que no existen se
 * ignoran, y si ninguno queda se exigen todos los nodos (una exploración sin requeridos no se podría
 * completar nunca o se completaría sin haber explorado nada).
 */
export function prepararExploracion(config: ConfigExploracion3d): Exploracion {
  const pasos = esExploracionProcedural(config) ? pasosDeConfig(config) : [];
  // En una escena procedural las partes son los pasos de la línea de tiempo.
  const fuente: ConfigExploracion3d['nodos'] = esExploracionProcedural(config)
    ? pasos.map((paso) => ({ id: paso.id, etiqueta: paso.titulo, descripcion: paso.texto }))
    : config.nodos;
  const vistos = new Set<string>();
  const unicos = fuente.filter((nodo) => {
    if (vistos.has(nodo.id)) return false;
    vistos.add(nodo.id);
    return true;
  });
  const validos = [...new Set(config.requeridos.filter((id) => vistos.has(id)))];
  const requeridos = validos.length > 0 ? validos : unicos.map((n) => n.id);
  const marcados = new Set(requeridos);
  return {
    requeridos,
    pasos,
    nodos: unicos.map((nodo) => ({
      id: nodo.id,
      etiqueta: nodo.etiqueta,
      descripcion: nodo.descripcion,
      ancla: nodo.ancla,
      // Sin cámara en el contenido, un nodo de la mandíbula con el ancla calculada usa la vista desde la que
      // se ve su estructura (nodos3d.ts); el resto, la frontal.
      vista:
        nodo.camara?.vista ??
        (config.modelo === 'mandibula'
          ? estructuraDeNodo(nodo.id, nodo.ancla)?.vista
          : undefined) ??
        'frontal',
      zoom: nodo.camara?.zoom ?? 1,
      requerido: marcados.has(nodo.id),
    })),
  };
}

/** Cuántos de los nodos requeridos ya se visitaron. */
export function requeridosVisitados(
  requeridos: readonly string[],
  visitados: readonly string[],
): number {
  const conjunto = new Set(visitados);
  return requeridos.filter((id) => conjunto.has(id)).length;
}

/** ¿Se visitaron todos los requeridos? */
export function exploracionCompleta(
  requeridos: readonly string[],
  visitados: readonly string[],
): boolean {
  return requeridos.length > 0 && requeridosVisitados(requeridos, visitados) === requeridos.length;
}

/** Fracción del recorrido (0 a 1): requeridos visitados entre requeridos. */
export function avanceDeExploracion(
  requeridos: readonly string[],
  visitados: readonly string[],
): number {
  if (requeridos.length === 0) return 0;
  return requeridosVisitados(requeridos, visitados) / requeridos.length;
}

/**
 * Instantánea de un intento a medias: los nodos visitados como ÍNDICES en `nodos` (no como ids, para
 * ocupar poco y para que un id cambiado en el contenido no deje basura), en el orden en que se
 * visitaron.
 */
export function crearInstantanea(
  visitados: readonly string[],
  nodos: readonly Pick<NodoExploracion, 'id'>[],
): JsonObjeto {
  const indices = visitados
    .map((id) => nodos.findIndex((n) => n.id === id))
    .filter((indice) => indice >= 0);
  return { visitados: indices };
}

/**
 * Ids visitados que recupera una instantánea. Todo lo que no cuadre con el contenido actual (índices
 * fuera de rango, repetidos, no enteros, tipos raros, una forma distinta) se ignora: una instantánea
 * corrupta o de otra versión del contenido nunca rompe la actividad, solo empieza de cero.
 */
export function restaurarVisitados(
  instantanea: unknown,
  nodos: readonly Pick<NodoExploracion, 'id'>[],
): string[] {
  if (typeof instantanea !== 'object' || instantanea === null || Array.isArray(instantanea)) {
    return [];
  }
  const indices = (instantanea as Record<string, unknown>).visitados;
  if (!Array.isArray(indices)) return [];
  const ids: string[] = [];
  for (const indice of indices) {
    if (typeof indice !== 'number' || !Number.isInteger(indice)) continue;
    const nodo = nodos[indice];
    if (nodo && !ids.includes(nodo.id)) ids.push(nodo.id);
  }
  return ids;
}

/* -------------------------------------------------------------------------------------------
 * Modo identificar (`config.modo === 'identificar'`): la misma mecánica que la multicapa
 * ----------------------------------------------------------------------------------------- */

/** Techo de fallos por nodo que se guarda: evita números absurdos en una instantánea manipulada. */
const MAX_ERRORES_POR_NODO = 999;

export interface ConsignaNodo {
  /** Id del nodo que hay que tocar. */
  nodo: string;
  /** Texto de la consigna (Markdown de una línea). */
  texto: string;
}

/** ¿Se juega a identificar? Una escena procedural siempre se explora. */
export function esModoIdentificar(config: Pick<ConfigExploracion3d, 'modelo' | 'modo'>): boolean {
  return config.modo === 'identificar' && !esExploracionProcedural(config);
}

/**
 * Consignas en el orden de los requeridos (ya saneados): por cada uno, su `pista` y luego sus `pistas_extra`.
 * Un requerido sin `pista` (el esquema lo rechaza) se pide por su nombre, para no dejar la actividad sin salida.
 */
export function consignasDeIdentificar(
  config: ConfigExploracion3d,
  exploracion: Exploracion,
): ConsignaNodo[] {
  const porId = new Map(config.nodos.map((n) => [n.id, n] as const));
  const consignas: ConsignaNodo[] = [];
  for (const id of exploracion.requeridos) {
    const nodo = porId.get(id);
    if (!nodo) continue;
    const textos = [nodo.pista, ...(nodo.pistas_extra ?? [])].filter(
      (t): t is string => typeof t === 'string' && t.trim() !== '',
    );
    if (textos.length === 0) textos.push(`Toca «${nodo.etiqueta}» en el modelo.`);
    for (const texto of textos) consignas.push({ nodo: id, texto });
  }
  return consignas;
}

export type VeredictoNodo = 'correcta' | 'incorrecta' | 'repetida';

/** `correcta` si es el pedido; `repetida` si ya se identificó antes (no es fallo); si no, `incorrecta`. */
export function veredictoDeNodo(
  tocado: string,
  pedido: string,
  identificados: ReadonlySet<string>,
): VeredictoNodo {
  if (tocado === pedido) return 'correcta';
  return identificados.has(tocado) ? 'repetida' : 'incorrecta';
}

/** Nodos ya identificados cuando se han resuelto las primeras `paso` consignas, en orden y sin repetir. */
export function nodosIdentificados(consignas: readonly ConsignaNodo[], paso: number): string[] {
  return [...new Set(consignas.slice(0, Math.max(0, paso)).map((c) => c.nodo))];
}

function limpiarErrores(errores: Record<string, number>): Record<string, number> {
  const limpio: Record<string, number> = {};
  for (const [id, n] of Object.entries(errores)) {
    if (Number.isFinite(n) && n > 0) limpio[id] = Math.min(MAX_ERRORES_POR_NODO, Math.floor(n));
  }
  return limpio;
}

/** Suma de fallos de todos los nodos. */
export function totalErrores(errores: Record<string, number>): number {
  return Object.values(limpiarErrores(errores)).reduce((suma, n) => suma + n, 0);
}

/** Instantánea de un intento de identificar a medias: consigna actual y fallos por nodo pedido. */
export function crearInstantaneaIdentificar(
  paso: number,
  errores: Record<string, number>,
): JsonObjeto {
  return { modo: 'identificar', paso, errores_por_nodo: { ...limpiarErrores(errores) } };
}

/**
 * Estado que recupera una instantánea de identificar, validado contra las consignas actuales; `null` si no
 * sirve (otro modo, forma rara o ya resuelta entera) y se empieza de cero.
 */
export function restaurarIdentificar(
  instantanea: unknown,
  consignas: readonly ConsignaNodo[],
): { paso: number; errores: Record<string, number> } | null {
  if (typeof instantanea !== 'object' || instantanea === null || Array.isArray(instantanea)) {
    return null;
  }
  const bruta = instantanea as Record<string, unknown>;
  if (bruta.modo !== 'identificar') return null;
  const { paso } = bruta;
  if (typeof paso !== 'number' || !Number.isInteger(paso) || paso < 0 || paso >= consignas.length) {
    return null;
  }
  const pedidos = new Set(consignas.map((c) => c.nodo));
  const errores: Record<string, number> = {};
  const brutos = bruta.errores_por_nodo;
  if (typeof brutos === 'object' && brutos !== null && !Array.isArray(brutos)) {
    for (const [id, n] of Object.entries(brutos)) {
      if (pedidos.has(id) && typeof n === 'number' && Number.isFinite(n) && n > 0) {
        errores[id] = Math.min(MAX_ERRORES_POR_NODO, Math.floor(n));
      }
    }
  }
  return { paso, errores };
}

/** `detalle` del resultado en modo identificar. */
export function detalleDeIdentificar(
  consignas: readonly ConsignaNodo[],
  errores: Record<string, number>,
): DetalleExploracion3d {
  return {
    modo: 'identificar',
    visitados: nodosIdentificados(consignas, consignas.length),
    aciertos: consignas.length,
    errores: totalErrores(errores),
    errores_por_nodo: limpiarErrores(errores),
  };
}
