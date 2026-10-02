/**
 * Estado de la escena "la mandíbula fetal: de Meckel al nacimiento" como FUNCIÓN PURA del tiempo `t` (0 a 1).
 * Sin three, sin Vue y sin estado acumulado: `estadoMandibulaFetal(t)` da siempre lo mismo para el mismo `t`,
 * así que adelantar, atrasar y saltar de una fase a otra es exacto y reversible. Las mallas (`mallas.ts`) y la
 * escena (`EscenaMandibulaFetal.vue`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * `t` es el desarrollo prenatal, de la sexta semana (el arco mandibular lleno de ectomesénquima, con el
 * cartílago de Meckel ya formado) al nacimiento. La escala es PEDAGÓGICA, no proporcional a las semanas: cada
 * fase ocupa el tramo que necesita para verse, y el texto de la actividad pone las semanas aproximadas.
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_MANDIBULA_FETAL`, el instante que mejor la muestra). Una fase abarca
 * desde el punto medio con el hito anterior hasta el punto medio con el siguiente
 * (`LIMITES_FASES_MANDIBULA_FETAL`), la misma regla que usa la interfaz para saber qué texto mostrar
 * (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Esquemáticas: el arco mide unas 5 unidades de lado a lado. Las formas son didácticas (una herradura, una
 * varilla, un canal), no una reconstrucción anatómica; el contenido lo dice en el texto.
 */
import { acotar, evaluarPista, mezclar } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena)
 * ----------------------------------------------------------------------------------------- */

/** Radio del cartílago de Meckel antes de reabsorberse. */
export const R_MECKEL = 0.11;
/** Radio del ligamento esfenomandibular (lo que queda de la porción media-posterior de Meckel). */
export const R_LIGAMENTO = 0.022;
/** Radio del nervio alveolar inferior y de sus ramas. */
export const R_NERVIO = 0.045;
/** Semiejes de la masa de mesénquima alrededor del arco (lateral y vertical). */
export const MESENQUIMA = { ancho: 0.95, alto: 0.72 } as const;
/** Parámetro `u` del arco (0 = oído, 1 = línea media) donde aparece el primer centro de osificación. */
export const U_CENTRO = 0.7;
/** Tramo del arco que ocupa el cuerpo óseo (más atrás está la rama, que es otra pieza). */
export const U_CUERPO = { inicio: 0.14, fin: 0.985 } as const;
/** Parámetro `u` donde se inserta la rama en el cuerpo. */
export const U_RAMA = 0.16;
/** Cuántos gérmenes dentarios hay por lado. */
export const N_GERMENES = 5;
/** Ancho del cuerpo óseo a tamaño 1 (unidades de escena); el perfil se define para este ancho. */
export const ANCHO_CUERPO = 0.76;
/** Cuánto se separa del cartílago de Meckel el centro del cuerpo óseo (hacia lateral). */
export const N_CUERPO = 0.42;
/** Alcance del hueso (en `u`) desde el centro con el que llega a los dos extremos del cuerpo. */
export const ALCANCE_COMPLETO = 0.62;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_MANDIBULA_FETAL = [
  'mesenquima',
  'condensacion',
  'centro',
  'extension',
  'cartilagos_secundarios',
  'meckel_regresion',
  'nacimiento',
] as const;
export type FaseMandibulaFetal = (typeof FASES_MANDIBULA_FETAL)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 2 usa estos `t`. */
export const HITOS_MANDIBULA_FETAL: Readonly<Record<FaseMandibulaFetal, number>> = {
  mesenquima: 0,
  condensacion: 0.17,
  centro: 0.34,
  extension: 0.5,
  cartilagos_secundarios: 0.66,
  meckel_regresion: 0.83,
  nacimiento: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_MANDIBULA_FETAL[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_MANDIBULA_FETAL: readonly number[] = FASES_MANDIBULA_FETAL.slice(1).map(
  (fase, i) =>
    mezclar(HITOS_MANDIBULA_FETAL[FASES_MANDIBULA_FETAL[i]!], HITOS_MANDIBULA_FETAL[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseMandibulaFetalEnTiempo(t: number): FaseMandibulaFetal {
  const x = acotar(t);
  let indice = 0;
  while (
    indice < LIMITES_FASES_MANDIBULA_FETAL.length &&
    x >= LIMITES_FASES_MANDIBULA_FETAL[indice]!
  )
    indice++;
  return FASES_MANDIBULA_FETAL[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

/** Opacidad de la masa de ectomesénquima: se aclara a medida que el hueso la ocupa y desaparece al final. */
const PISTA_MESENQUIMA: readonly Fotograma[] = [
  [0.17, 0.42],
  [0.34, 0.34],
  [0.5, 0.2],
  [0.66, 0.12],
  [0.83, 0.06],
  [0.93, 0],
];
/** Opacidad de la mancha de mesénquima condensado: aparece, se ve entera en su hito y cede al hueso. */
const PISTA_CONDENSACION: readonly Fotograma[] = [
  [0.08, 0],
  [0.17, 1],
  [0.26, 1],
  [0.35, 0],
];
/** Alcance del hueso (en `u`) a cada lado del centro de osificación. */
const PISTA_ALCANCE: readonly Fotograma[] = [
  [0.28, 0],
  [0.34, 0.12],
  [0.5, 0.42],
  [0.62, ALCANCE_COMPLETO],
];
/** Tamaño de la sección del cuerpo óseo (1 = la de la mandíbula neonatal). */
const PISTA_TAMANO: readonly Fotograma[] = [
  [0.28, 0.3],
  [0.34, 0.48],
  [0.5, 0.78],
  [0.66, 0.92],
  [1, 1.05],
];
/** Altura de las láminas alveolares (0 solo el canal del nervio; 1 láminas alrededor de los gérmenes). */
const PISTA_ALVEOLAR: readonly Fotograma[] = [
  [0.37, 0],
  [0.5, 1],
];
/** Destello del primer centro de osificación. */
const PISTA_RESALTE_CENTRO: readonly Fotograma[] = [
  [0.28, 0],
  [0.34, 1],
  [0.44, 0],
];
/** Tamaño de los gérmenes dentarios. */
const PISTA_GERMENES: readonly Fotograma[] = [
  [0.38, 0],
  [0.5, 1],
];
/** Tamaño de la rama (crece desde el cuerpo hacia el cóndilo). */
const PISTA_RAMA: readonly Fotograma[] = [
  [0.4, 0],
  [0.66, 0.72],
  [1, 1],
];
/** Cartílagos secundarios: condilar, coronoideo (transitorio) y sinfisario. */
const PISTA_CONDILAR: readonly Fotograma[] = [
  [0.56, 0],
  [0.66, 1],
];
const PISTA_CORONOIDEO: readonly Fotograma[] = [
  [0.58, 0],
  [0.66, 1],
  [0.86, 1],
  [0.98, 0],
];
const PISTA_SINFISARIO: readonly Fotograma[] = [
  [0.6, 0],
  [0.68, 1],
];
/** Osificación endocondral del cóndilo: el cartílago condilar se reduce a una capa sobre la cabeza. */
const PISTA_OSIFICACION_CONDILO: readonly Fotograma[] = [
  [0.72, 0],
  [1, 1],
];
/** Regresión del cartílago de Meckel: su porción media se reabsorbe y la posterior queda como ligamento. */
const PISTA_REGRESION: readonly Fotograma[] = [
  [0.7, 0],
  [0.83, 1],
];
/** Martillo y yunque: el extremo posterior de Meckel que queda en el oído medio. */
const PISTA_OSICULOS: readonly Fotograma[] = [
  [0.72, 0],
  [0.83, 1],
];

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface EstadoMandibulaFetal {
  fase: FaseMandibulaFetal;
  /** Opacidad de la masa de ectomesénquima (0 a 0,42). */
  mesenquima: number;
  /** Opacidad de la mancha de mesénquima condensado (0 a 1). */
  condensacion: number;
  hueso: {
    /** Alcance del hueso en `u` a cada lado de `U_CENTRO` (0 nada; `ALCANCE_COMPLETO` todo el cuerpo). */
    alcance: number;
    /** Tamaño de la sección (0,3 placa inicial; 1 neonatal). */
    tamano: number;
    /** Altura de las láminas alveolares (0 a 1). */
    alveolar: number;
    /** Destello del centro de osificación (0 a 1). */
    resalteCentro: number;
    /** Tamaño de la rama (0 a 1). */
    rama: number;
  };
  /** Tamaño de los gérmenes dentarios (0 a 1). */
  germenes: number;
  cartilagos: {
    condilar: number;
    coronoideo: number;
    sinfisario: number;
    /** Cuánto del cartílago condilar ya es hueso (0 a 1). */
    osificacionCondilo: number;
  };
  meckel: {
    /** Regresión (0 varilla entera; 1 solo ligamento y huesecillos). */
    regresion: number;
    /** Tamaño del martillo y el yunque (0 a 1). */
    osiculos: number;
  };
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoMandibulaFetal(t: number): EstadoMandibulaFetal {
  const x = acotar(t);
  return {
    fase: faseMandibulaFetalEnTiempo(x),
    mesenquima: evaluarPista(PISTA_MESENQUIMA, x),
    condensacion: evaluarPista(PISTA_CONDENSACION, x),
    hueso: {
      alcance: evaluarPista(PISTA_ALCANCE, x),
      tamano: evaluarPista(PISTA_TAMANO, x),
      alveolar: evaluarPista(PISTA_ALVEOLAR, x),
      resalteCentro: evaluarPista(PISTA_RESALTE_CENTRO, x),
      rama: evaluarPista(PISTA_RAMA, x),
    },
    germenes: evaluarPista(PISTA_GERMENES, x),
    cartilagos: {
      condilar: evaluarPista(PISTA_CONDILAR, x),
      coronoideo: evaluarPista(PISTA_CORONOIDEO, x),
      sinfisario: evaluarPista(PISTA_SINFISARIO, x),
      osificacionCondilo: evaluarPista(PISTA_OSIFICACION_CONDILO, x),
    },
    meckel: {
      regresion: evaluarPista(PISTA_REGRESION, x),
      osiculos: evaluarPista(PISTA_OSICULOS, x),
    },
  };
}
