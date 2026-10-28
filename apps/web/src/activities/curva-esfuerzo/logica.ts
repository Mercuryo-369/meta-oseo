/**
 * Lógica pura de la actividad `curva-esfuerzo` (sin Vue): forma de la curva, zona de una posición, barajado de las
 * opciones e instantánea del intento a medias.
 *
 * La curva es la típica del hueso cortical (docente, 1.4 Imagen #6): un tramo lineal (región elástica: el esfuerzo es
 * proporcional a la deformación) hasta el límite elástico, una región plástica creciente y cada vez más plana, y el
 * punto de fallo al final, tras el cual el esfuerzo cae. El eje horizontal (deformación) y el vertical (esfuerzo) van
 * de 0 a 100 (unidades relativas: la actividad enseña la forma, no valores).
 *
 * Instantánea (`progreso.instantanea`), pequeña y validada contra el contenido:
 *
 *     { v: 1, semilla: 123, i: 2, x: 47, e: [[0, 1, 1], [2, -1, 0], …] }
 *
 * `i` es el escenario en curso; `x`, la posición del marcador; `e[k]` = [errores de zona, índice (en el contenido) de
 * la opción elegida o -1, zona ya acertada 1/0].
 */
import type { JsonObjeto } from '@/activities/types';
import type { ActividadCurvaEsfuerzo, ZonaCurva } from '@/content/schema';
import { barajar, crearAzar, derivarSemilla } from '@/activities/quiz/logica';

export const VERSION_INSTANTANEA = 1;
const SEMILLA_MAX = 2 ** 32;

/* -------------------------------------------------------------------------------------------
 * Curva
 * ----------------------------------------------------------------------------------------- */

/** Fin del tramo lineal (límite elástico) y punto de fallo, en el eje de deformación (0 a 100). */
export const X_LIMITE_ELASTICO = 30;
export const X_FALLO = 94;
const PENDIENTE_ELASTICA = 2.2;
const Y_LIMITE = X_LIMITE_ELASTICO * PENDIENTE_ELASTICA;
const SUBIDA_PLASTICA = 24;
const ESCALA_PLASTICA = 25;

/** Esfuerzo (0 a 100) en cada deformación (0 a 100). Tras el fallo, el esfuerzo cae. */
export function esfuerzoEn(x: number): number {
  const d = acotar(x, 0, 100);
  if (d <= X_LIMITE_ELASTICO) return d * PENDIENTE_ELASTICA;
  const yPlastica = (v: number): number =>
    Y_LIMITE + SUBIDA_PLASTICA * (1 - Math.exp(-(v - X_LIMITE_ELASTICO) / ESCALA_PLASTICA));
  if (d <= X_FALLO) return yPlastica(d);
  const yFallo = yPlastica(X_FALLO);
  return Math.max(0, yFallo * (1 - (d - X_FALLO) / (100 - X_FALLO)));
}

/** Puntos de la curva (para dibujarla), con `n` muestras hasta el fallo y la caída final. */
export function puntosCurva(n = 60): Array<[number, number]> {
  const puntos: Array<[number, number]> = [];
  for (let k = 0; k <= n; k++) {
    const x = (X_FALLO * k) / n;
    puntos.push([x, esfuerzoEn(x)]);
  }
  return puntos;
}

export function acotar(v: number, min: number, max: number): number {
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;
}

/** Zona de una posición: la que la contiene (los límites pertenecen a la zona que empieza en ellos). */
export function zonaEn(zonas: readonly ZonaCurva[], x: number): ZonaCurva | null {
  const d = acotar(x, 0, 100);
  const ordenadas = [...zonas].sort((a, b) => a.desde - b.desde);
  for (let k = ordenadas.length - 1; k >= 0; k--) {
    const z = ordenadas[k]!;
    if (d >= z.desde && d <= z.hasta) return z;
  }
  return null;
}

/** Centro de una zona (para los botones de zona, la alternativa al arrastre). */
export function centroDeZona(z: ZonaCurva): number {
  return Math.round(((z.desde + z.hasta) / 2) * 10) / 10;
}

/* -------------------------------------------------------------------------------------------
 * Opciones
 * ----------------------------------------------------------------------------------------- */

/** Orden en que se muestran las opciones de cada escenario (índices del contenido). Determinista por la semilla. */
export function ordenOpciones(actividad: ActividadCurvaEsfuerzo, semilla: number): number[][] {
  return actividad.config.escenarios.map((e, k) => {
    const indices = e.opciones.map((_, j) => j);
    if (actividad.config.barajar_opciones === false) return indices;
    return barajar(indices, crearAzar(derivarSemilla(semilla, 100 + k)));
  });
}

/* -------------------------------------------------------------------------------------------
 * Estado del intento e instantánea
 * ----------------------------------------------------------------------------------------- */

export interface EstadoEscenario {
  /** Veces que confirmó el marcador fuera de la zona pedida. */
  erroresZona: number;
  /** El marcador ya quedó en la zona pedida. */
  zonaOk: boolean;
  /** Índice (en el contenido) de la opción elegida, o `null` si aún no responde. */
  respuesta: number | null;
}

export interface EstadoIntento {
  semilla: number;
  actual: number;
  x: number;
  escenarios: EstadoEscenario[];
}

export function estadoVacio(n: number, semilla: number): EstadoIntento {
  return {
    semilla,
    actual: 0,
    x: 0,
    escenarios: Array.from({ length: n }, () => ({
      erroresZona: 0,
      zonaOk: false,
      respuesta: null,
    })),
  };
}

export function armarInstantanea(estado: EstadoIntento): JsonObjeto {
  return {
    v: VERSION_INSTANTANEA,
    semilla: estado.semilla,
    i: estado.actual,
    x: Math.round(estado.x * 10) / 10,
    e: estado.escenarios.map((s) => [s.erroresZona, s.respuesta ?? -1, s.zonaOk ? 1 : 0]),
  };
}

function esEnteroEn(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/** Lee una instantánea guardada; `null` si no es de este formato o no cuadra con el contenido (se ignora entera). */
export function leerInstantanea(
  actividad: ActividadCurvaEsfuerzo,
  instantanea: unknown,
): EstadoIntento | null {
  if (typeof instantanea !== 'object' || instantanea === null || Array.isArray(instantanea))
    return null;
  const o = instantanea as Record<string, unknown>;
  if (o.v !== VERSION_INSTANTANEA) return null;
  const escenarios = actividad.config.escenarios;
  if (!esEnteroEn(o.semilla, 0, SEMILLA_MAX - 1)) return null;
  if (!esEnteroEn(o.i, 0, escenarios.length - 1)) return null;
  if (typeof o.x !== 'number' || !Number.isFinite(o.x) || o.x < 0 || o.x > 100) return null;
  if (!Array.isArray(o.e) || o.e.length !== escenarios.length) return null;
  const leidos: EstadoEscenario[] = [];
  for (const [k, fila] of o.e.entries()) {
    if (!Array.isArray(fila) || fila.length !== 3) return null;
    const [err, resp, ok] = fila as unknown[];
    const nOpciones = escenarios[k]!.opciones.length;
    if (
      !esEnteroEn(err, 0, 1000) ||
      !esEnteroEn(resp, -1, nOpciones - 1) ||
      !esEnteroEn(ok, 0, 1)
    ) {
      return null;
    }
    if (resp !== -1 && ok !== 1) return null; // no se responde sin haber ubicado el marcador
    leidos.push({ erroresZona: err, zonaOk: ok === 1, respuesta: resp === -1 ? null : resp });
  }
  return { semilla: o.semilla, actual: o.i, x: o.x, escenarios: leidos };
}

/* -------------------------------------------------------------------------------------------
 * Resultado
 * ----------------------------------------------------------------------------------------- */

export interface Conteo {
  aciertos: number;
  errores: number;
  erroresPorEscenario: Record<string, number>;
}

/**
 * Cada escenario aporta dos aciertos posibles: ubicar el marcador en la zona pedida (cada intento fuera de ella es un
 * error) y responder bien (una sola oportunidad).
 */
export function contar(actividad: ActividadCurvaEsfuerzo, estado: EstadoIntento): Conteo {
  let aciertos = 0;
  let errores = 0;
  const erroresPorEscenario: Record<string, number> = {};
  actividad.config.escenarios.forEach((e, k) => {
    const s = estado.escenarios[k];
    if (!s) return;
    let errEsc = s.erroresZona;
    if (s.zonaOk) aciertos++;
    if (s.respuesta !== null) {
      const correcta = e.opciones[s.respuesta]?.id === e.correcta;
      if (correcta) aciertos++;
      else errEsc++;
    }
    errores += errEsc;
    if (errEsc > 0) erroresPorEscenario[e.id] = errEsc;
  });
  return { aciertos, errores, erroresPorEscenario };
}

/** Escenarios ya respondidos. */
export function terminados(estado: EstadoIntento): number {
  return estado.escenarios.filter((s) => s.respuesta !== null).length;
}
