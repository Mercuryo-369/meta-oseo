/**
 * Estado de la escena "el osteoclasto: de precursores a laguna de resorción" como FUNCIÓN PURA del tiempo `t`
 * (0 a 1). Sin three, sin Vue y sin estado acumulado: `estadoOsteoclasto(t)` da siempre lo mismo para el mismo
 * `t`, así que adelantar, atrasar y saltar de una fase a otra es exacto y reversible. Las mallas (`mallas.ts`) y
 * la escena (`EscenaOsteoclasto.vue`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * Aquí `t` sí es tiempo: la vida de un osteoclasto, desde que sus precursores mononucleares salen del capilar
 * hasta que muere por apoptosis y deja la laguna de Howship vacía. La escala es PEDAGÓGICA, no proporcional
 * (la resorción de una laguna dura unos días; la fusión, horas).
 *
 * ── El modelo ─────────────────────────────────────────────────────────────────────────────────
 * Un bloque de hueso mineralizado con la superficie en y = 0 y un capilar por encima, detrás. Los precursores
 * bajan del capilar, se fusionan en una célula redonda que se aplana sobre el hueso y forma la zona de
 * sellado. Desde la fase del borde festoneado el bloque y la célula se CORTAN por el plano z = 0: la mitad
 * delantera se aparta y se desvanece, para ver en sección los pliegues, la laguna que se excava y las
 * partículas que salen hacia el hueso o atraviesan la célula hacia el capilar.
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_OSTEOCLASTO`, el instante que mejor la muestra). Una fase abarca
 * desde el punto medio con el hito anterior hasta el punto medio con el siguiente (`LIMITES_FASES_OSTEOCLASTO`),
 * la misma regla que usa la interfaz para elegir el texto (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Esquemáticas: la célula mide unas 2,5 unidades de ancho y el bloque 6,4; nada guarda la escala real (un
 * osteoclasto mide de 50 a 100 µm y un precursor unos 15). El contenido lo dice en el texto.
 */
import { acotar, evaluarPista, mezclar } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena)
 * ----------------------------------------------------------------------------------------- */

/** Bloque de hueso: ancho en X, fondo en Z (de -fondo/2 a +fondo/2) y alto hacia -Y desde la superficie. */
export const BLOQUE = { ancho: 6.4, fondo: 4.4, alto: 1.3 } as const;
/** Capilar: tubo a lo largo de X, por encima y detrás de la célula. */
export const CAPILAR = { y: 1.95, z: -1.15, radio: 0.17, largo: 7.2 } as const;

export const N_PRECURSORES = 6;
export const N_NUCLEOS = 6;
export const N_INVERSION = 5;
export const N_FRAGMENTOS = 8;
export const N_PLIEGUES = 36;
export const N_PARTICULAS_ACIDO = 36;
export const N_PARTICULAS_PRODUCTOS = 30;

/** Radio de un precursor mononuclear (y de una célula de inversión). */
export const R_PRECURSOR = 0.17;
/** Radio de la célula recién fusionada, aún redonda. */
export const R_CELULA_REDONDA = 0.78;
/** Semiejes de la célula aplanada sobre el hueso (rx = rz, ry). */
export const CELULA_APLANADA = { rx: 1.3, ry: 0.56 } as const;
/**
 * La célula es una cúpula: una esfera cortada por debajo del ecuador (ángulo polar hasta 0,6·π). `BASE_CUPULA`
 * es la altura (en la esfera unidad) de su borde inferior, negativa: el centro queda por encima del hueso.
 */
export const FRACCION_POLAR_CUPULA = 0.6;
export const BASE_CUPULA = Math.cos(Math.PI * FRACCION_POLAR_CUPULA);
/** Radio del anillo de sellado (zona clara) y de la laguna de Howship. */
export const R_SELLADO = 1.2;
export const R_LAGUNA = 1.12;
/** Profundidad máxima de la laguna. */
export const PROFUNDIDAD_LAGUNA = 0.42;
/** Cuánto se aparta la mitad delantera del bloque y de la célula al cortar la escena. */
export const DESPLAZAMIENTO_CORTE = 1.5;
/** Altura de los pliegues del borde festoneado dentro del citoplasma. */
export const ALTURA_PLIEGUES = 0.36;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_OSTEOCLASTO = [
  'precursores',
  'fusion',
  'adhesion',
  'borde_rugoso',
  'resorcion',
  'liberacion',
  'apoptosis',
] as const;
export type FaseOsteoclasto = (typeof FASES_OSTEOCLASTO)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 2 usa estos `t`. */
export const HITOS_OSTEOCLASTO: Readonly<Record<FaseOsteoclasto, number>> = {
  precursores: 0,
  fusion: 0.16,
  adhesion: 0.32,
  borde_rugoso: 0.48,
  resorcion: 0.64,
  liberacion: 0.8,
  apoptosis: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_OSTEOCLASTO[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_OSTEOCLASTO: readonly number[] = FASES_OSTEOCLASTO.slice(1).map(
  (fase, i) => mezclar(HITOS_OSTEOCLASTO[FASES_OSTEOCLASTO[i]!], HITOS_OSTEOCLASTO[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseOsteoclastoEnTiempo(t: number): FaseOsteoclasto {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_OSTEOCLASTO.length && x >= LIMITES_FASES_OSTEOCLASTO[indice]!)
    indice++;
  return FASES_OSTEOCLASTO[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

/** Marcha de los precursores del capilar a la superficie (0 en el capilar, 1 sobre el hueso). */
const PISTA_LLEGADA: readonly Fotograma[] = [
  [0, 0],
  [0.11, 1],
];
/** Fusión: los precursores convergen y desaparecen mientras crece la célula multinucleada. */
const PISTA_FUSION: readonly Fotograma[] = [
  [0.11, 0],
  [0.2, 1],
];
/** De redonda (0) a aplanada sobre el hueso (1). */
const PISTA_APLANAMIENTO: readonly Fotograma[] = [
  [0.22, 0],
  [0.31, 1],
];
/** Anillo de sellado (zona clara): aparece al adherirse y se deshace al morir la célula. */
const PISTA_SELLADO: readonly Fotograma[] = [
  [0.25, 0],
  [0.32, 1],
  [0.86, 1],
  [0.94, 0],
];
/** Corte de la escena por z = 0: la mitad delantera se aparta para ver la sección. */
const PISTA_CORTE: readonly Fotograma[] = [
  [0.37, 0],
  [0.45, 1],
];
/** Pliegues del borde festoneado. */
const PISTA_PLIEGUES: readonly Fotograma[] = [
  [0.38, 0],
  [0.47, 1],
  [0.86, 1],
  [0.94, 0],
];
/** Salida de protones, cloruro y enzimas hacia el hueso. */
const PISTA_BOMBEO: readonly Fotograma[] = [
  [0.42, 0],
  [0.5, 1],
  [0.7, 1],
  [0.78, 0],
];
/** Excavación de la laguna de Howship (0 superficie lisa, 1 laguna completa); la laguna queda. */
const PISTA_EXCAVACION: readonly Fotograma[] = [
  [0.5, 0],
  [0.64, 1],
];
/** Productos de la resorción atravesando la célula hacia el capilar. */
const PISTA_LIBERACION: readonly Fotograma[] = [
  [0.68, 0],
  [0.78, 1],
  [0.86, 1],
  [0.93, 0],
];
/** Encogimiento de la célula en la apoptosis (factor de escala). */
const PISTA_ENCOGIMIENTO: readonly Fotograma[] = [
  [0.86, 1],
  [0.98, 0.3],
];
/** Opacidad del cuerpo celular (se desvanece al fragmentarse). */
const PISTA_OPACIDAD_CELULA: readonly Fotograma[] = [
  [0.88, 1],
  [1, 0.1],
];
/** Cuerpos apoptóticos que se desprenden. */
const PISTA_FRAGMENTACION: readonly Fotograma[] = [
  [0.9, 0],
  [1, 1],
];
/** Llegada de las células mononucleares de inversión a la laguna vacía. */
const PISTA_INVERSION: readonly Fotograma[] = [
  [0.9, 0],
  [1, 1],
];

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface EstadoOsteoclasto {
  fase: FaseOsteoclasto;
  /** El tiempo acotado: las partículas lo usan para avanzar de forma determinista (sin relojes propios). */
  t: number;
  precursores: {
    /** 0 en el capilar, 1 sobre el hueso. */
    llegada: number;
    /** 0 separados, 1 fusionados en la célula multinucleada. */
    fusion: number;
  };
  celula: {
    /** Tamaño del cuerpo multinucleado (0 no existe, 1 completo). */
    escala: number;
    /** 0 redonda, 1 aplanada. */
    aplanamiento: number;
    /** Encogimiento apoptótico (1 normal, 0,3 encogida). */
    encogimiento: number;
    opacidad: number;
  };
  /** Anillo de sellado (0 a 1). */
  sellado: number;
  /** Corte por z = 0 (0 escena entera, 1 mitad delantera apartada). */
  corte: number;
  /** Pliegues del borde festoneado (0 a 1). */
  pliegues: number;
  /** Salida de H+, Cl- y enzimas (0 a 1). */
  bombeo: number;
  /** Excavación de la laguna (0 a 1). */
  excavacion: number;
  /** Productos que atraviesan la célula hacia el capilar (0 a 1). */
  liberacion: number;
  /** Cuerpos apoptóticos (0 a 1). */
  fragmentacion: number;
  /** Células de inversión llegando (0 a 1). */
  inversion: number;
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoOsteoclasto(t: number): EstadoOsteoclasto {
  const x = acotar(t);
  return {
    fase: faseOsteoclastoEnTiempo(x),
    t: x,
    precursores: {
      llegada: evaluarPista(PISTA_LLEGADA, x),
      fusion: evaluarPista(PISTA_FUSION, x),
    },
    celula: {
      escala: evaluarPista(PISTA_FUSION, x),
      aplanamiento: evaluarPista(PISTA_APLANAMIENTO, x),
      encogimiento: evaluarPista(PISTA_ENCOGIMIENTO, x),
      opacidad: evaluarPista(PISTA_OPACIDAD_CELULA, x),
    },
    sellado: evaluarPista(PISTA_SELLADO, x),
    corte: evaluarPista(PISTA_CORTE, x),
    pliegues: evaluarPista(PISTA_PLIEGUES, x),
    bombeo: evaluarPista(PISTA_BOMBEO, x),
    excavacion: evaluarPista(PISTA_EXCAVACION, x),
    liberacion: evaluarPista(PISTA_LIBERACION, x),
    fragmentacion: evaluarPista(PISTA_FRAGMENTACION, x),
    inversion: evaluarPista(PISTA_INVERSION, x),
  };
}

/* -------------------------------------------------------------------------------------------
 * Magnitudes derivadas (puras) que comparten las mallas y las pruebas
 * ----------------------------------------------------------------------------------------- */

export interface DimensionesCelula {
  /** Semiejes horizontales (rx = rz) y vertical de la cúpula. */
  rx: number;
  ry: number;
  /** Altura del centro de la cúpula sobre la superficie (y). */
  centroY: number;
}

/** Semiejes y centro de la célula multinucleada en un estado dado. */
export function dimensionesCelula(e: EstadoOsteoclasto): DimensionesCelula {
  const k = e.celula.escala * e.celula.encogimiento;
  const rx = mezclar(R_CELULA_REDONDA, CELULA_APLANADA.rx, e.celula.aplanamiento) * k;
  const ry = mezclar(R_CELULA_REDONDA, CELULA_APLANADA.ry, e.celula.aplanamiento) * k;
  // El borde inferior de la cúpula apoya en la superficie y se hunde un poco al excavarse la laguna.
  const hundimiento = 0.1 * PROFUNDIDAD_LAGUNA * e.excavacion;
  return { rx, ry, centroY: -BASE_CUPULA * ry - hundimiento };
}

/**
 * Profundidad de la laguna de Howship en el punto (x, z) de la superficie (0 fuera de la laguna). Un cuenco
 * de borde festoneado (el radio ondula con el ángulo) y fondo con ligeras ondulaciones, como las lagunas de
 * los cortes histológicos.
 */
export function profundidadLaguna(x: number, z: number, excavacion: number): number {
  if (excavacion <= 0) return 0;
  const angulo = Math.atan2(z, x);
  const radioBorde = R_LAGUNA * (1 + 0.07 * Math.sin(7 * angulo));
  const r = Math.hypot(x, z) / radioBorde;
  if (r >= 1) return 0;
  const cuenco = Math.pow(1 - r * r, 1.4);
  const ondas = 1 + 0.12 * Math.sin(9 * x) * Math.sin(9 * z);
  return PROFUNDIDAD_LAGUNA * excavacion * cuenco * ondas;
}
