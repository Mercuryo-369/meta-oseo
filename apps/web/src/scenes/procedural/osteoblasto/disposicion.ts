/**
 * Disposición de las piezas repetidas de la escena del osteoblasto: orgánulos dentro de la célula protagonista
 * (cisternas del retículo, sáculos del Golgi, mitocondrias), vesículas de secreción, fragmentos de la célula
 * apoptótica, canalículos de la laguna y laminillas del hueso viejo. Lógica PURA: solo números, deterministas
 * (misma semilla, misma disposición), sin three ni Vue. Las mallas (`mallas.ts`) convierten estos números en
 * instancias.
 *
 * Todas las posiciones de los orgánulos van en coordenadas LOCALES de la célula cúbica (centro en 0, semiejes
 * `FORMA.cubico`): la malla las escala y las traslada con la célula.
 */
import { generadorDeterminista } from '../interpolacion';
import { FORMA, LAGUNA, N_FRAGMENTOS, N_VESICULAS } from './estado';

const DOS_PI = Math.PI * 2;

export function grados(g: number): number {
  return (g * Math.PI) / 180;
}

/* -------------------------------------------------------------------------------------------
 * Orgánulos de la célula protagonista (locales a la célula cúbica)
 * ----------------------------------------------------------------------------------------- */

/** Centro y semiejes del núcleo: excéntrico, en el polo opuesto al hueso (arriba). */
export const NUCLEO = { y: 0.22, semiejes: [0.3, 0.2, 0.26] as const } as const;

export interface Pieza {
  /** Centro local. */
  x: number;
  y: number;
  z: number;
  /** Semiejes locales (X, Y, Z). */
  sx: number;
  sy: number;
  sz: number;
  /** Giro alrededor de Z (radianes). */
  giro: number;
}

/**
 * Cisternas del retículo endoplásmico rugoso: láminas apiladas, ligeramente onduladas (el giro alterna), que
 * llenan el citoplasma bajo el núcleo y a un lado. Abundantes: es lo que hace basófilo al osteoblasto.
 */
export function cisternasDelReticulo(): Pieza[] {
  const resultado: Pieza[] = [];
  // Pila principal bajo el núcleo, a la derecha.
  for (let i = 0; i < 5; i++) {
    resultado.push({
      x: 0.17,
      y: -0.04 - i * 0.075,
      z: 0.05,
      sx: 0.26,
      sy: 0.012,
      sz: 0.2,
      giro: grados(i % 2 === 0 ? 4 : -4),
    });
  }
  // Pila corta a la izquierda del núcleo, casi vertical.
  for (let i = 0; i < 3; i++) {
    resultado.push({
      x: -0.4 + i * 0.05,
      y: 0.2,
      z: 0.02,
      sx: 0.012,
      sy: 0.2,
      sz: 0.16,
      giro: grados(-8),
    });
  }
  return resultado;
}

/** Sáculos del aparato de Golgi: pila de láminas curvas cortas junto al núcleo, del lado del hueso. */
export function saculosDelGolgi(): Pieza[] {
  const resultado: Pieza[] = [];
  for (let i = 0; i < 4; i++) {
    resultado.push({
      x: -0.2,
      y: -0.1 - i * 0.06,
      z: 0.12,
      sx: 0.15 - i * 0.012,
      sy: 0.014,
      sz: 0.14,
      giro: grados(-6),
    });
  }
  return resultado;
}

/** Mitocondrias: elipsoides alargados repartidos por el citoplasma, deterministas. */
export function mitocondrias(): Pieza[] {
  const azar = generadorDeterminista(2026);
  const candidatas: readonly [number, number, number][] = [
    [-0.36, -0.28, 0.22],
    [0.38, 0.26, 0.2],
    [-0.1, -0.4, -0.2],
    [0.36, -0.32, -0.24],
    [-0.38, 0.0, -0.28],
  ];
  return candidatas.map(([x, y, z]) => ({
    x,
    y,
    z,
    sx: 0.09 + azar() * 0.03,
    sy: 0.04,
    sz: 0.04,
    giro: (azar() - 0.5) * grados(80),
  }));
}

/* -------------------------------------------------------------------------------------------
 * Vesículas de secreción
 * ----------------------------------------------------------------------------------------- */

export interface Vesicula {
  /** Desfase del ciclo (0 a 1): cada vesícula va en un punto distinto del camino. */
  desfase: number;
  /** Posición lateral (X, Z locales) del carril por el que baja. */
  x: number;
  z: number;
}

/** Carriles y desfases deterministas de las vesículas: nacen junto al Golgi y bajan al polo que mira al hueso. */
export function vesiculasDeSecrecion(): Vesicula[] {
  const azar = generadorDeterminista(4812);
  return Array.from({ length: N_VESICULAS }, (_, i) => ({
    desfase: (i + azar() * 0.6) / N_VESICULAS,
    x: -0.34 + (i % 4) * 0.2 + (azar() - 0.5) * 0.06,
    z: 0.16 - Math.floor(i / 4) * 0.14 + (azar() - 0.5) * 0.04,
  }));
}

/**
 * Punto del camino de una vesícula para la fracción `u` (0 nace en el Golgi, 1 se libera en la base). En Y local
 * baja desde el Golgi (-0.12) hasta justo bajo la membrana basal; el radio crece al nacer y se apaga al fundirse.
 */
export function puntoDeVesicula(u: number): { y: number; radio: number } {
  const yGolgi = -0.12;
  const yBase = -FORMA.cubico[1] + 0.05;
  const nacer = Math.min(1, u / 0.15);
  const fundir = Math.min(1, (1 - u) / 0.15);
  return { y: yGolgi + (yBase - yGolgi) * u, radio: 0.065 * Math.min(nacer, fundir) };
}

/* -------------------------------------------------------------------------------------------
 * Fragmentos de la célula apoptótica
 * ----------------------------------------------------------------------------------------- */

export interface Fragmento {
  /** Dirección unitaria en la que se aleja del centro de la célula. */
  dx: number;
  dy: number;
  dz: number;
  /** Hasta dónde llega (unidades de escena) y su radio. */
  alcance: number;
  radio: number;
}

/** Cuerpos apoptóticos: bolitas que se separan del centro en direcciones repartidas, deterministas. */
export function fragmentosApoptoticos(): Fragmento[] {
  const azar = generadorDeterminista(911);
  return Array.from({ length: N_FRAGMENTOS }, (_, i) => {
    const a = (i / N_FRAGMENTOS) * DOS_PI + (azar() - 0.5) * 0.5;
    const dy = 0.25 + azar() * 0.5;
    const dx = Math.cos(a);
    const dz = Math.sin(a) * 0.6;
    const norma = Math.hypot(dx, dy, dz);
    return {
      dx: dx / norma,
      dy: dy / norma,
      dz: dz / norma,
      alcance: 0.45 + azar() * 0.3,
      radio: 0.07 + azar() * 0.05,
    };
  });
}

/* -------------------------------------------------------------------------------------------
 * Laguna del osteocito y canalículos (sobre la cara de corte, coordenadas X, Y)
 * ----------------------------------------------------------------------------------------- */

export type Segmento2d = readonly [x0: number, y0: number, x1: number, y1: number];

/**
 * Canalículos que salen de la laguna: ramas radiales con un quiebro, más largas hacia los lados que hacia la
 * superficie (no salen por encima de la laguna hacia el osteoide más de lo que mide la matriz). Deterministas.
 */
export function canaliculosDeLaguna(): Segmento2d[] {
  const azar = generadorDeterminista(333);
  const resultado: Segmento2d[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * DOS_PI + (azar() - 0.5) * 0.3;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const x0 = LAGUNA.x + dx * LAGUNA.rx * 0.98;
    const y0 = LAGUNA.y + dy * LAGUNA.ry * 0.98;
    // Ni sobresalir por arriba del hueso nuevo (el frente sube hasta 0,97) ni entrar en el hueso viejo (y < 0).
    let largo = (0.32 + azar() * 0.22) * (dy > 0.4 ? 0.7 : 1);
    if (dy < 0) largo = Math.min(largo, (y0 - 0.06) / -dy);
    const xm = x0 + dx * largo * 0.55 + (azar() - 0.5) * 0.08;
    const ym = y0 + dy * largo * 0.55 + (azar() - 0.5) * 0.08;
    const x1 = xm + dx * largo * 0.45 + (azar() - 0.5) * 0.1;
    const y1 = ym + dy * largo * 0.45 + (azar() - 0.5) * 0.1;
    resultado.push([x0, y0, xm, ym], [xm, ym, x1, y1]);
  }
  return resultado;
}

/**
 * Laminillas del hueso viejo en la cara de corte: líneas casi horizontales, suavemente onduladas, a varias
 * profundidades (como las tres curvas del SVG). Cada línea es una polilínea de `puntos` tramos.
 */
export function laminillasDelHueso(ancho: number, alto: number, puntos = 16): Segmento2d[] {
  const resultado: Segmento2d[] = [];
  const profundidades = [0.3, 0.6, 0.86];
  profundidades.forEach((p, i) => {
    const y = -alto * p;
    for (let k = 0; k < puntos; k++) {
      const x0 = -ancho / 2 + (ancho * k) / puntos;
      const x1 = -ancho / 2 + (ancho * (k + 1)) / puntos;
      const onda = (x: number): number =>
        y + 0.035 * Math.sin((x / ancho) * DOS_PI * 1.5 + i * 1.7);
      resultado.push([x0, onda(x0), x1, onda(x1)]);
    }
  });
  return resultado;
}
