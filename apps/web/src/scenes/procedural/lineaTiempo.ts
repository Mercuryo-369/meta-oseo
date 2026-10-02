/**
 * Lógica pura de la línea de tiempo de una escena procedural (sin Vue, three ni DOM): qué paso corresponde a
 * un instante, a dónde saltan "paso anterior" y "paso siguiente" y qué pasos se visitan al mover el
 * tiempo. La usan la interfaz (`activities/exploracion-3d/PanelLineaTiempo.vue`) y sus pruebas.
 *
 * "Visitar un paso" es DETENER la línea de tiempo en él (a menos de `TOLERANCIA_PARADA`) o PASAR por él
 * reproduciendo o arrastrando el deslizador. Un salto con los botones de paso o con la lista aterriza en
 * el hito, así que también lo visita, pero no visita los intermedios.
 */

export interface PasoTiempo {
  id: string;
  /** Instante del hito, de 0 a 1. */
  t: number;
}

/** Distancia (en `t`) a la que detenerse cuenta como estar en el hito: 1,5 % de la línea de tiempo. */
export const TOLERANCIA_PARADA = 0.015;

/** Margen para comparar instantes al pasar por un hito (evita perder un hito por redondeo). */
const EPSILON = 1e-9;

/** Los pasos ordenados por `t` (sin tocar el original). */
export function ordenarPasos<T extends PasoTiempo>(pasos: readonly T[]): T[] {
  return [...pasos].sort((a, b) => a.t - b.t);
}

/**
 * Índice del paso que "manda" en `t`: el hito más cercano. Equivale a que cada paso abarque desde el punto
 * medio con el anterior hasta el punto medio con el siguiente (la misma regla que `LIMITES_FASES_BMU`).
 * En un empate exacto gana el siguiente. `-1` si no hay pasos. Requiere `pasos` ordenados.
 */
export function pasoDeTiempo(pasos: readonly PasoTiempo[], t: number): number {
  if (pasos.length === 0) return -1;
  let mejor = 0;
  let distancia = Infinity;
  for (let i = 0; i < pasos.length; i++) {
    const d = Math.abs(pasos[i]!.t - t);
    // `<=`: con la misma distancia gana el posterior.
    if (d <= distancia + EPSILON) {
      distancia = d;
      mejor = i;
    }
  }
  return mejor;
}

/** Instante del paso anterior a `t` (el hito estrictamente anterior), o `null` si ya se está en el primero. */
export function tiempoPasoAnterior(pasos: readonly PasoTiempo[], t: number): number | null {
  let anterior: number | null = null;
  for (const paso of pasos) {
    if (paso.t < t - EPSILON && (anterior === null || paso.t > anterior)) anterior = paso.t;
  }
  return anterior;
}

/** Instante del paso siguiente a `t` (el hito estrictamente posterior), o `null` si ya se está en el último. */
export function tiempoPasoSiguiente(pasos: readonly PasoTiempo[], t: number): number | null {
  let siguiente: number | null = null;
  for (const paso of pasos) {
    if (paso.t > t + EPSILON && (siguiente === null || paso.t < siguiente)) siguiente = paso.t;
  }
  return siguiente;
}

/** Ids de los pasos cuyo hito está entre `desde` y `hasta` (ambos incluidos), en cualquier sentido. */
export function pasosCruzados(
  pasos: readonly PasoTiempo[],
  desde: number,
  hasta: number,
): string[] {
  const menor = Math.min(desde, hasta);
  const mayor = Math.max(desde, hasta);
  return pasos.filter((p) => p.t >= menor - EPSILON && p.t <= mayor + EPSILON).map((p) => p.id);
}

/** Ids de los pasos en los que se está detenido en `t` (a menos de `TOLERANCIA_PARADA`). */
export function pasosEnParada(
  pasos: readonly PasoTiempo[],
  t: number,
  tolerancia = TOLERANCIA_PARADA,
): string[] {
  return pasos.filter((p) => Math.abs(p.t - t) <= tolerancia + EPSILON).map((p) => p.id);
}

/** Acota `t` a [0, 1] y descarta valores no numéricos. */
export function acotarTiempo(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Porcentaje entero (0 a 100) de la línea de tiempo, para el texto del deslizador. */
export function porcentajeDeTiempo(t: number): number {
  return Math.round(acotarTiempo(t) * 100);
}
