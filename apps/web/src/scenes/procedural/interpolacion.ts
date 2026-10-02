/**
 * Utilidades matemáticas puras (sin three ni Vue) para escenas con línea de tiempo.
 *
 * El estado de una escena procedural es una FUNCIÓN PURA del tiempo `t` (0 a 1): cada magnitud (longitud
 * del túnel, número de osteoclastos, grosor del osteoide...) es una PISTA de fotogramas clave, y el
 * estado en `t` se obtiene interpolando entre ellos. Sin acumular nada entre fotogramas: adelantar y
 * atrasar es exacto y determinista, y la misma `t` da siempre el mismo estado.
 */

/** Limita `x` al intervalo [min, max]. */
export function acotar(x: number, min = 0, max = 1): number {
  return x < min ? min : x > max ? max : x;
}

/** Interpolación lineal. */
export function mezclar(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

/** Suavizado cúbico (0 a 1) con derivada nula en los extremos; monótono. */
export function suave(x: number): number {
  const k = acotar(x);
  return k * k * (3 - 2 * k);
}

/** Suavizado más marcado (quintico de Perlin): arranque y frenado más largos. */
export function suaveFuerte(x: number): number {
  const k = acotar(x);
  return k * k * k * (k * (k * 6 - 15) + 10);
}

/** Fracción (0 a 1, acotada) de `x` dentro del intervalo [a, b]. */
export function fraccion(x: number, a: number, b: number): number {
  return b === a ? (x >= b ? 1 : 0) : acotar((x - a) / (b - a));
}

/** Fotograma clave: `[t, valor]`. */
export type Fotograma = readonly [t: number, valor: number];

/** Cómo se pasa de un fotograma al siguiente. */
export type Curva = 'lineal' | 'suave';

/**
 * Pista de fotogramas clave ordenados por `t` (estrictamente crecientes). Antes del primero vale el primero
 * y después del último, el último (se "mantiene"). Con `suave` cada tramo arranca y frena con derivada nula,
 * de modo que un tramo entre dos valores distintos es MONÓTONO por construcción.
 */
export function evaluarPista(
  pista: readonly Fotograma[],
  t: number,
  curva: Curva = 'suave',
): number {
  const primero = pista[0];
  const ultimo = pista[pista.length - 1];
  if (!primero || !ultimo) return 0;
  if (t <= primero[0]) return primero[1];
  if (t >= ultimo[0]) return ultimo[1];
  for (let i = 1; i < pista.length; i++) {
    const b = pista[i]!;
    if (t <= b[0]) {
      const a = pista[i - 1]!;
      const k = (t - a[0]) / (b[0] - a[0]);
      return mezclar(a[1], b[1], curva === 'suave' ? suave(k) : k);
    }
  }
  return ultimo[1];
}

/** Generador pseudoaleatorio determinista (mulberry32): mismas semillas, mismos números. */
export function generadorDeterminista(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
