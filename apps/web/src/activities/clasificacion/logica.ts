/**
 * Lógica pura de la actividad `clasificacion` (sin Vue): orden de la bandeja, celdas de la tabla, instantánea del
 * intento a medias y detalle del resultado. El puntaje NO se calcula aquí (`@/content/scoring`).
 *
 * Instantánea (`progreso.instantanea`), con índices y no ids para que quepa siempre:
 *
 *     { v: 1, semilla: 123456, colocados: [0, 3, 4], errores: [0, 2, 0, 1, 0] }
 *
 * `colocados` son índices de `config.elementos` ya puestos en su categoría (siempre la correcta: una suelta
 * incorrecta devuelve el elemento a la bandeja). `errores[i]` cuenta las sueltas equivocadas del elemento `i`.
 * Una instantánea de otra versión del contenido (longitudes o índices fuera de rango) se descarta entera.
 */
import type { JsonObjeto } from '@/activities/types';
import type { ActividadClasificacion, CategoriaClasificacion } from '@/content/schema';

export const VERSION_INSTANTANEA = 1;
const SEMILLA_MAX = 2 ** 32;

/** Generador mulberry32: misma semilla, misma secuencia, números en [0, 1). */
export function crearAzar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashTexto(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Semilla estable por actividad e intento (el mismo intento se ve igual tras recargar). */
export function derivarSemilla(idActividad: string, intento: number): number {
  return hashTexto(`${idActividad}#${intento}`) % SEMILLA_MAX;
}

/**
 * Orden de la bandeja: índices de los elementos. Con `barajar`, sale de la semilla y nunca deja el orden del
 * contenido (que suele seguir el de las categorías y regalaría la respuesta) si hay dos o más elementos.
 */
export function ordenBandeja(total: number, barajar: boolean, semilla: number): number[] {
  const base = Array.from({ length: total }, (_, i) => i);
  if (!barajar || total < 2) return base;
  for (let intento = 0; intento < 8; intento++) {
    const azar = crearAzar(intento === 0 ? semilla : hashTexto(`${semilla}:${intento}`));
    const copia = [...base];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(azar() * (i + 1)));
      [copia[i], copia[j]] = [copia[j] as number, copia[i] as number];
    }
    if (copia.some((v, i) => v !== i)) return copia;
  }
  return [...base.slice(1), 0];
}

export interface Tabla {
  columnas: string[];
  filas: { etiqueta: string; celdas: (CategoriaClasificacion | null)[] }[];
}

/** Tabla de la disposición `tabla`: filas y columnas en el orden en que aparecen en las categorías. */
export function armarTabla(categorias: readonly CategoriaClasificacion[]): Tabla {
  const columnas: string[] = [];
  const filas: string[] = [];
  for (const c of categorias) {
    if (c.columna && !columnas.includes(c.columna)) columnas.push(c.columna);
    if (c.fila && !filas.includes(c.fila)) filas.push(c.fila);
  }
  return {
    columnas,
    filas: filas.map((f) => ({
      etiqueta: f,
      celdas: columnas.map(
        (col) => categorias.find((c) => c.fila === f && c.columna === col) ?? null,
      ),
    })),
  };
}

export interface EstadoIntento {
  semilla: number;
  colocados: number[];
  errores: number[];
}

export function crearInstantanea(estado: EstadoIntento): JsonObjeto {
  return {
    v: VERSION_INSTANTANEA,
    semilla: estado.semilla,
    colocados: [...estado.colocados],
    errores: [...estado.errores],
  };
}

function esEnteroEn(valor: unknown, max: number): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor < max;
}

/** Lee una instantánea guardada, o `null` si no vale para esta actividad. */
export function leerInstantanea(
  actividad: ActividadClasificacion,
  instantanea: unknown,
): EstadoIntento | null {
  if (typeof instantanea !== 'object' || instantanea === null || Array.isArray(instantanea))
    return null;
  const o = instantanea as Record<string, unknown>;
  if (o.v !== VERSION_INSTANTANEA || !esEnteroEn(o.semilla, SEMILLA_MAX)) return null;
  const total = actividad.config.elementos.length;
  const { colocados, errores } = o;
  if (!Array.isArray(colocados) || !Array.isArray(errores) || errores.length !== total) return null;
  if (!colocados.every((i) => esEnteroEn(i, total))) return null;
  if (new Set(colocados).size !== colocados.length) return null;
  if (!errores.every((e) => esEnteroEn(e, 1000))) return null;
  return { semilla: o.semilla, colocados: colocados as number[], errores: errores as number[] };
}

/** Detalle del resultado (claves comunes a todos los módulos, para las estadísticas del docente). */
export function construirDetalle(
  actividad: ActividadClasificacion,
  errores: readonly number[],
): { aciertos: number; errores: number; errores_por_elemento: Record<string, number> } {
  const porElemento: Record<string, number> = {};
  actividad.config.elementos.forEach((e, i) => {
    const n = errores[i] ?? 0;
    if (n > 0) porElemento[e.id] = n;
  });
  return {
    aciertos: actividad.config.elementos.length,
    errores: errores.reduce((a, b) => a + b, 0),
    errores_por_elemento: porElemento,
  };
}
