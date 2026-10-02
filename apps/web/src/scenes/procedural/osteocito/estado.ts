/**
 * Estado de la escena "el osteocito y su red lacuno-canalicular" como FUNCIÓN PURA del tiempo `t` (0 a 1).
 * Sin three, sin Vue y sin estado acumulado: `estadoOsteocito(t)` da siempre lo mismo para el mismo `t`, así
 * que adelantar, atrasar y saltar de una fase a otra es exacto y reversible. Las mallas (`mallas.ts`) y la
 * escena (`EscenaOsteocito.vue`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * Un relato en siete pasos dentro de un bloque de matriz mineralizada: primero se CONSTRUYE la red (la célula
 * en su laguna, sus dendritas dentro de los canalículos, los vecinos y las uniones comunicantes) y después se
 * la ve TRABAJAR (una carga comprime el bloque, el líquido fluye por los canalículos, los sensores de la célula
 * responden, la señal viaja a la superficie y los osteoblastos se activan) hasta volver al reposo. No es
 * tiempo real: la red tarda semanas en formarse y la respuesta a la carga es de segundos a horas.
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_OSTEOCITO`, el instante que mejor la muestra). Una fase abarca desde
 * el punto medio con el hito anterior hasta el punto medio con el siguiente (`LIMITES_FASES_OSTEOCITO`), la
 * misma regla que usa la interfaz para saber qué texto mostrar (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Esquemáticas y NO a escala: la laguna real mide unos 10 a 20 µm y los canalículos unos 0,3 µm; aquí las
 * dendritas se dibujan mucho más gruesas de lo real para que se vean en un móvil. El contenido lo dice.
 */
import { acotar, evaluarPista, mezclar } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena)
 * ----------------------------------------------------------------------------------------- */

/** Bloque de matriz mineralizada: medidas y centro. La cara frontal mira a +Z (la cámara). */
export const BLOQUE = {
  ancho: 7.4,
  alto: 5,
  fondo: 2.2,
  /** Centro del bloque. */
  centro: [-0.2, 0, 0] as const,
} as const;
/** Altura (y) de la superficie del hueso: la cara de arriba del bloque. */
export const Y_SUPERFICIE = BLOQUE.centro[1] + BLOQUE.alto / 2;
/** Conducto de Havers: corre a lo largo de Z en el lado izquierdo del bloque. */
export const CONDUCTO = { x: -3.05, y: -0.55, radio: 0.4 } as const;
export const R_CAPILAR = 0.17;
/** Osteocito central: posición del centro de su laguna. */
export const CENTRO_CELULA = [0.2, -0.35, 0] as const;
/** Semiejes del cuerpo del osteocito central (x, y, z) y de su laguna. */
export const CUERPO = { x: 0.44, y: 0.3, z: 0.26 } as const;
export const LAGUNA = { x: 0.56, y: 0.4, z: 0.3 } as const;
/** Número de osteocitos vecinos y de dendritas por célula. */
export const N_VECINOS = 8;
export const N_DENDRITAS_CENTRAL = 28;
export const N_DENDRITAS_VECINO = 10;
/** Segmentos por dendrita (la línea quebrada que la dibuja). */
export const SEGMENTOS_DENDRITA = 4;
/** Radios de la dendrita y del canalículo que la envuelve (exagerados para que se vean en móvil). */
export const R_DENDRITA = 0.028;
export const R_CANALICULO = 0.062;
/** Células de la superficie (revestimiento u osteoblastos) a lo largo de X. */
export const N_CELULAS_SUPERFICIE = 9;
/** Partículas del líquido intersticial que fluyen por los canalículos. */
export const N_PARTICULAS = 96;
/** Moléculas de esclerostina que salen de la célula central. */
export const N_ESCLEROSTINA = 14;
/** Cuánto se acorta el bloque (en Y) con la carga máxima: 4 % (exagerado; lo real es del orden de 0,1 %). */
export const COMPRESION_MAXIMA = 0.04;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_OSTEOCITO = [
  'laguna',
  'dendritas',
  'red',
  'carga',
  'senal',
  'mensaje',
  'reposo',
] as const;
export type FaseOsteocito = (typeof FASES_OSTEOCITO)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 2 usa estos `t`. */
export const HITOS_OSTEOCITO: Readonly<Record<FaseOsteocito, number>> = {
  laguna: 0,
  dendritas: 0.17,
  red: 0.34,
  carga: 0.5,
  senal: 0.66,
  mensaje: 0.83,
  reposo: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_OSTEOCITO[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_OSTEOCITO: readonly number[] = FASES_OSTEOCITO.slice(1).map((fase, i) =>
  mezclar(HITOS_OSTEOCITO[FASES_OSTEOCITO[i]!], HITOS_OSTEOCITO[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseOsteocitoEnTiempo(t: number): FaseOsteocito {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_OSTEOCITO.length && x >= LIMITES_FASES_OSTEOCITO[indice]!) indice++;
  return FASES_OSTEOCITO[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

/** Crecimiento de las dendritas de la célula central (0 ninguna, 1 todas completas). */
const PISTA_DENDRITAS: readonly Fotograma[] = [
  [0.04, 0],
  [0.17, 1],
];
/** Aparición de los osteocitos vecinos (0 a 1: opacidad y tamaño). */
const PISTA_VECINOS: readonly Fotograma[] = [
  [0.2, 0],
  [0.27, 1],
];
/** Crecimiento de las dendritas de los vecinos. */
const PISTA_DENDRITAS_VECINOS: readonly Fotograma[] = [
  [0.22, 0],
  [0.33, 1],
];
/** Uniones comunicantes: aparecen cuando las dendritas se encuentran. */
const PISTA_UNIONES: readonly Fotograma[] = [
  [0.28, 0],
  [0.34, 1],
];
/** Compresión del bloque (0 sin carga, 1 carga máxima) y flechas de carga. */
const PISTA_COMPRESION: readonly Fotograma[] = [
  [0.4, 0],
  [0.48, 1],
  [0.66, 1],
  [0.72, 0],
];
/** Intensidad del flujo de líquido en los canalículos (cuántas partículas se ven). */
const PISTA_FLUJO: readonly Fotograma[] = [
  [0.41, 0],
  [0.47, 1],
  [0.68, 1],
  [0.75, 0],
];
/** Énfasis de los sensores de la célula central (cilio primario, integrinas). */
const PISTA_SENSORES: readonly Fotograma[] = [
  [0.57, 0],
  [0.65, 1],
  [0.74, 1],
  [0.82, 0],
];
/** Esclerostina que sale de la célula: cae con la carga y vuelve en el reposo. */
const PISTA_ESCLEROSTINA: readonly Fotograma[] = [
  [0.02, 0],
  [0.1, 1],
  [0.58, 1],
  [0.7, 0],
  [0.92, 0],
  [1, 0.7],
];
/** Pulsos de la señal que viajan por las dendritas hacia la superficie: avance (0 en la célula, 1 en la superficie). */
const PISTA_MENSAJE_AVANCE: readonly Fotograma[] = [
  [0.74, 0],
  [0.86, 1],
];
const PISTA_MENSAJE_OPACIDAD: readonly Fotograma[] = [
  [0.73, 0],
  [0.76, 1],
  [0.86, 1],
  [0.91, 0],
];
/** Activación de los osteoblastos de la superficie (0 aplanados, 1 cúbicos). */
const PISTA_ACTIVACION: readonly Fotograma[] = [
  [0.76, 0],
  [0.83, 1],
  [0.93, 1],
  [1, 0.15],
];

/** Frecuencia del latido de los sensores y del avance de las partículas (radianes y vueltas por unidad de t). */
const FRECUENCIA_PULSO = 70;
const VUELTAS_FLUJO = 9;

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface EstadoOsteocito {
  fase: FaseOsteocito;
  /** Crecimiento de las dendritas de la célula central (0 a 1). */
  dendritas: number;
  /** Osteocitos vecinos: aparición (0 a 1) y crecimiento de sus dendritas (0 a 1). */
  vecinos: { aparicion: number; dendritas: number };
  /** Uniones comunicantes (0 a 1). */
  uniones: number;
  /** Compresión del bloque y flechas de carga (0 a 1). */
  compresion: number;
  /** Líquido intersticial: cuánto se ve (0 a 1) y cuánto ha avanzado (vueltas, crece con t). */
  flujo: { intensidad: number; avance: number };
  /** Sensores de la célula central: énfasis (0 a 1) y latido (0 a 1, oscila). */
  sensores: { enfasis: number; pulso: number };
  /** Esclerostina que sale de la célula (0 nada, 1 producción plena). */
  esclerostina: number;
  /** Señal que viaja hacia la superficie: avance (0 a 1) y opacidad (0 a 1). */
  mensaje: { avance: number; opacidad: number };
  /** Activación de los osteoblastos de la superficie (0 aplanados, 1 cúbicos). */
  activacion: number;
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoOsteocito(t: number): EstadoOsteocito {
  const x = acotar(t);
  const enfasis = evaluarPista(PISTA_SENSORES, x);
  return {
    fase: faseOsteocitoEnTiempo(x),
    dendritas: evaluarPista(PISTA_DENDRITAS, x),
    vecinos: {
      aparicion: evaluarPista(PISTA_VECINOS, x),
      dendritas: evaluarPista(PISTA_DENDRITAS_VECINOS, x),
    },
    uniones: evaluarPista(PISTA_UNIONES, x),
    compresion: evaluarPista(PISTA_COMPRESION, x),
    flujo: {
      intensidad: evaluarPista(PISTA_FLUJO, x),
      avance: x * VUELTAS_FLUJO,
    },
    sensores: {
      enfasis,
      pulso: enfasis * (0.5 + 0.5 * Math.sin(x * FRECUENCIA_PULSO)),
    },
    esclerostina: evaluarPista(PISTA_ESCLEROSTINA, x),
    mensaje: {
      avance: evaluarPista(PISTA_MENSAJE_AVANCE, x),
      opacidad: evaluarPista(PISTA_MENSAJE_OPACIDAD, x),
    },
    activacion: evaluarPista(PISTA_ACTIVACION, x),
  };
}
