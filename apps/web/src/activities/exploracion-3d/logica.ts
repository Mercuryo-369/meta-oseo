/**
 * Lógica pura de la actividad `exploracion-3d` (sin Vue, three ni WebGL): qué nodos hay, cuáles son
 * requeridos, cómo se guarda y se restaura una exploración a medias y cuánto se ha avanzado.
 *
 * La configuración es de solo lectura y puede venir imperfecta (el componente no debe romperse con
 * ids repetidos ni con `requeridos` que no existen: el esquema los rechaza, pero un contenido viejo o
 * escrito a mano no pasa por el esquema en las pruebas), así que se sanea aquí.
 */
import type { JsonObjeto } from '@/activities/types';
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
