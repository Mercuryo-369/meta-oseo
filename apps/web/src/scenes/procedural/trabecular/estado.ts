/**
 * Estado de la escena "hueso trabecular que envejece" como FUNCIÓN PURA del tiempo `t` (0 a 1). Sin three, sin
 * Vue y sin estado acumulado: `estadoTrabecular(t)` da siempre lo mismo para el mismo `t`, así que adelantar,
 * atrasar y saltar de una fase a otra es exacto y reversible. Las mallas (`mallas.ts`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * Décadas de vida, de los 30 a los 80 años, en escala PEDAGÓGICA (no proporcional): el pico de masa ósea, el
 * recambio equilibrado, el balance negativo que adelgaza las trabéculas, la perforación de las placas, la
 * pérdida de las barras horizontales (desconexión), la osteoporosis establecida y, al final, una carga que
 * aplasta el cubo envejecido y apenas deforma el joven.
 *
 * ── Cómo se anima sin simular ─────────────────────────────────────────────────────────────────
 * La red de trabéculas es fija y determinista (`disposicion.ts`): cada placa y cada barra nace con un grosor
 * base y una "vida" (0 a 1). El estado da FACTORES GLOBALES por fase (`FactoresRed`): grosor relativo, fracción de
 * barras horizontales presentes y fracción de placas perforadas. Cada trabécula compara su vida con esos
 * factores y decide si se adelgaza, se agujerea, se corta o desaparece. Así cualquier `t` se dibuja al instante.
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_TRABECULAR`, el instante que mejor la muestra). Una fase abarca desde
 * el punto medio con el hito anterior hasta el punto medio con el siguiente (`LIMITES_FASES_TRABECULAR`), la misma
 * regla que usa la interfaz para saber qué texto mostrar (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Esquemáticas: el cubo mide 3 unidades de lado (una biopsia de cresta ilíaca o de cuerpo vertebral de unos
 * 6 a 8 mm); las trabéculas son placas y barras rectas, no las láminas curvas del hueso real.
 */
import { acotar, evaluarPista, mezclar } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena)
 * ----------------------------------------------------------------------------------------- */

/** Lado del cubo de hueso trabecular. */
export const LADO = 3;
/** Celdas de la retícula en cada eje: las placas son caras de celda y las barras, aristas horizontales. */
export const N_CELDAS = 5;
/** Paso de la retícula. */
export const PASO = LADO / N_CELDAS;
/** Grosor base de una placa joven. */
export const GROSOR_PLACA = 0.11;
/** Radio base de una barra joven. */
export const RADIO_BARRA = 0.05;
/** Grosor de la cortical superior joven. */
export const GROSOR_CORTICAL = 0.2;
/** Cuánto se aplasta cada cubo bajo la carga máxima (fracción de su altura). */
export const APLASTAMIENTO = { joven: 0.04, envejecido: 0.22 } as const;
/** Posición en X del cubo joven "fantasma" respecto del cubo que envejece. */
export const X_FANTASMA = -3.9;
/** Número de BMU trabeculares en la cara frontal (una en resorción, dos en formación). */
export const N_BMU = 3;
/** Número de placas que se rompen bajo la carga (microfracturas). */
export const N_MICROFRACTURAS = 3;
/** Edad (años) que representan t = 0 y el hito de la osteoporosis. */
export const EDADES = { inicio: 30, osteoporosis: 80 } as const;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_TRABECULAR = [
  'joven',
  'equilibrio',
  'adelgazamiento',
  'perforacion',
  'desconexion',
  'osteoporosis',
  'carga',
] as const;
export type FaseTrabecular = (typeof FASES_TRABECULAR)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 6 usa estos `t`. */
export const HITOS_TRABECULAR: Readonly<Record<FaseTrabecular, number>> = {
  joven: 0,
  equilibrio: 0.17,
  adelgazamiento: 0.34,
  perforacion: 0.5,
  desconexion: 0.66,
  osteoporosis: 0.83,
  carga: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_TRABECULAR[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_TRABECULAR: readonly number[] = FASES_TRABECULAR.slice(1).map(
  (fase, i) => mezclar(HITOS_TRABECULAR[FASES_TRABECULAR[i]!], HITOS_TRABECULAR[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseTrabecularEnTiempo(t: number): FaseTrabecular {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_TRABECULAR.length && x >= LIMITES_FASES_TRABECULAR[indice]!)
    indice++;
  return FASES_TRABECULAR[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

/** Grosor relativo de todas las trabéculas (1 = joven). Empieza a caer tras el pico de masa ósea. */
const PISTA_GROSOR: readonly Fotograma[] = [
  [0.24, 1],
  [0.34, 0.8],
  [0.5, 0.68],
  [0.66, 0.58],
  [0.83, 0.48],
];
/** Fracción de barras horizontales presentes. Caen sobre todo entre la perforación y la desconexión. */
const PISTA_BARRAS: readonly Fotograma[] = [
  [0.42, 1],
  [0.5, 0.82],
  [0.66, 0.45],
  [0.83, 0.3],
];
/** Fracción de placas perforadas (con un agujero que las convierte en marcos de barras). */
const PISTA_PERFORACION: readonly Fotograma[] = [
  [0.42, 0],
  [0.5, 0.35],
  [0.66, 0.6],
  [0.83, 0.78],
];
/** Opacidad de las BMU trabeculares: se ven mientras la historia es el recambio; luego el foco es la arquitectura. */
const PISTA_BMU_OPACIDAD: readonly Fotograma[] = [
  [0.38, 1],
  [0.46, 0],
];
/** Cuánto rellena el osteoide el hoyo en formación (1 = del todo: balance equilibrado; menos = balance negativo). */
const PISTA_BMU_RELLENO: readonly Fotograma[] = [
  [0.2, 1],
  [0.34, 0.45],
];
/** Tamaño relativo del hoyo de resorción (crece cuando el balance se vuelve negativo). */
const PISTA_BMU_EXCAVACION: readonly Fotograma[] = [
  [0.22, 1],
  [0.34, 1.35],
];
/** Grosor relativo de la cortical superior. */
const PISTA_CORTICAL_GROSOR: readonly Fotograma[] = [
  [0.42, 1],
  [0.83, 0.45],
];
/** Porosidad de la cortical superior (0 a 1). */
const PISTA_CORTICAL_POROSIDAD: readonly Fotograma[] = [
  [0.5, 0],
  [0.83, 1],
];
/** Adiposidad de la médula (0 roja/lavanda, 1 grasa amarilla). */
const PISTA_ADIPOSIDAD: readonly Fotograma[] = [
  [0.34, 0],
  [0.83, 1],
];
/** Opacidad del cubo joven fantasma que se muestra al lado para comparar. */
const PISTA_FANTASMA: readonly Fotograma[] = [
  [0.72, 0],
  [0.83, 0.42],
];
/** La flecha de la carga aparece y baja hasta tocar la cortical. */
const PISTA_FLECHA: readonly Fotograma[] = [
  [0.87, 0],
  [0.95, 1],
];
/** Cuánto se aplasta cada cubo (0 a 1; la fracción real la fija `APLASTAMIENTO`). */
const PISTA_COMPRESION: readonly Fotograma[] = [
  [0.9, 0],
  [1, 1],
];
/** Rotura de las placas marcadas como microfractura (0 intactas, 1 rotas y resaltadas). */
const PISTA_ROTURA: readonly Fotograma[] = [
  [0.93, 0],
  [1, 1],
];

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

/** Factores globales que cada trabécula compara con su "vida" para decidir cómo se dibuja. */
export interface FactoresRed {
  /** Grosor relativo (1 = joven). */
  grosor: number;
  /** Fracción de barras horizontales presentes (1 = todas). */
  barras: number;
  /** Fracción de placas perforadas (0 = ninguna). */
  perforacion: number;
}

/** La red tal como nace: es lo que dibuja el cubo fantasma. */
export const RED_JOVEN: Readonly<FactoresRed> = { grosor: 1, barras: 1, perforacion: 0 };

export interface EstadoTrabecular {
  fase: FaseTrabecular;
  /** Edad representada (años), solo para orientar: la escala es pedagógica. */
  edad: number;
  /** La red del cubo que envejece. */
  red: FactoresRed;
  bmu: {
    opacidad: number;
    /** Relleno del hoyo en formación (1 = completo). */
    relleno: number;
    /** Tamaño relativo del hoyo en resorción. */
    excavacion: number;
  };
  cortical: { grosor: number; porosidad: number };
  medula: { adiposidad: number };
  fantasma: { opacidad: number };
  carga: {
    /** Presencia y descenso de la flecha (0 a 1). */
    flecha: number;
    /** Aplastamiento (0 a 1). */
    compresion: number;
    /** Rotura de las microfracturas (0 a 1). */
    rotura: number;
  };
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoTrabecular(t: number): EstadoTrabecular {
  const x = acotar(t);
  return {
    fase: faseTrabecularEnTiempo(x),
    edad: mezclar(EDADES.inicio, EDADES.osteoporosis, acotar(x / HITOS_TRABECULAR.osteoporosis)),
    red: {
      grosor: evaluarPista(PISTA_GROSOR, x),
      barras: evaluarPista(PISTA_BARRAS, x),
      perforacion: evaluarPista(PISTA_PERFORACION, x),
    },
    bmu: {
      opacidad: evaluarPista(PISTA_BMU_OPACIDAD, x),
      relleno: evaluarPista(PISTA_BMU_RELLENO, x),
      excavacion: evaluarPista(PISTA_BMU_EXCAVACION, x),
    },
    cortical: {
      grosor: evaluarPista(PISTA_CORTICAL_GROSOR, x),
      porosidad: evaluarPista(PISTA_CORTICAL_POROSIDAD, x),
    },
    medula: { adiposidad: evaluarPista(PISTA_ADIPOSIDAD, x) },
    fantasma: { opacidad: evaluarPista(PISTA_FANTASMA, x) },
    carga: {
      flecha: evaluarPista(PISTA_FLECHA, x),
      compresion: evaluarPista(PISTA_COMPRESION, x),
      rotura: evaluarPista(PISTA_ROTURA, x),
    },
  };
}
