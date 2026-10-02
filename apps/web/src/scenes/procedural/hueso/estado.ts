/**
 * Estado de la escena "del hueso largo a la osteona" como FUNCIÓN PURA del tiempo `t` (0 a 1). Sin three, sin
 * Vue y sin estado acumulado: `estadoHueso(t)` da siempre lo mismo para el mismo `t`, así que adelantar,
 * atrasar y saltar de una fase a otra es exacto y reversible. La geometría (`geometria.ts`) y la escena
 * (`EscenaHueso.vue`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * Aquí el "tiempo" no es el paso de los días: es la PROFUNDIDAD de la mirada. El deslizador baja de la
 * escala del órgano (un hueso largo entero) a la del tejido (un corte de la diáfisis), a la de la unidad
 * estructural (una osteona) y a la de la célula (los osteocitos y sus canalículos). Cada tramo del
 * deslizador es un "acercamiento", y el estudiante puede subir y bajar por él cuando quiera.
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_HUESO`, el instante que mejor la muestra). Una fase abarca desde el
 * punto medio con el hito anterior hasta el punto medio con el siguiente (`LIMITES_FASES_HUESO`), la misma
 * regla que usa la interfaz para saber qué texto mostrar (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Esquemáticas y NO a escala real entre pantallas: cada escala (hueso, corte, osteona) se dibuja del tamaño
 * que cabe en la pantalla. El contenido lo dice en el texto.
 */
import { acotar, evaluarPista, mezclar } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena)
 * ----------------------------------------------------------------------------------------- */

/** Largo de la diáfisis del hueso largo (a lo largo del eje X). */
export const LARGO_DIAFISIS = 7;
/** Radio exterior de la cortical de la diáfisis. */
export const R_CORTICAL = 1;
/** Radio de la cavidad medular (cara interna de la cortical, donde está el endostio). */
export const R_MEDULAR = 0.62;
/** Radio de la vaina de periostio que envuelve la diáfisis. */
export const R_PERIOSTIO = 1.07;
/** Semieje mayor de cada epífisis, a lo largo del eje X. */
export const EPIFISIS_LARGO = 1.25;
/** Radio de cada epífisis. */
export const EPIFISIS_RADIO = 1.65;
/** Cuánto sobresale del centro de la diáfisis el centro de cada epífisis. */
export const X_EPIFISIS = LARGO_DIAFISIS / 2 + 0.55;

/** Ángulo (grados) donde empieza la cuña que se abre en el hueso largo, y su amplitud. Su centro (-90°) queda arriba una vez tumbado el hueso: la tapa sube y el interior se ve desde la cámara. */
export const CUNA = { inicio: -160, arco: 140 } as const;

/** Número de osteonas dibujadas en la cortical del corte transversal. */
export const N_OSTEONAS_CORTE = 16;
/** Radio de cada osteona en el corte (con la cortical de radio 1). */
export const R_OSTEONA_CORTE = 0.092;

/** Radio del conducto de Havers en la osteona ampliada. */
export const R_HAVERS = 0.3;
/** Radio exterior de la osteona ampliada. */
export const R_OSTEONA = 1.7;
/** Número de láminas concéntricas de la osteona ampliada. */
export const N_LAMINAS = 6;
/** Largo de la osteona ampliada (a lo largo del eje X). */
export const LARGO_OSTEONA = 4.2;
/** Número de osteocitos dibujados en la osteona ampliada. */
export const N_OSTEOCITOS = 16;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_HUESO = [
  'entero',
  'abierto',
  'corte',
  'capas',
  'osteonas',
  'osteona',
  'osteocitos',
] as const;
export type FaseHueso = (typeof FASES_HUESO)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 1 usa estos `t`. */
export const HITOS_HUESO: Readonly<Record<FaseHueso, number>> = {
  entero: 0,
  abierto: 0.2,
  corte: 0.42,
  capas: 0.58,
  osteonas: 0.74,
  osteona: 0.88,
  osteocitos: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_HUESO[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_HUESO: readonly number[] = FASES_HUESO.slice(1).map((fase, i) =>
  mezclar(HITOS_HUESO[FASES_HUESO[i]!], HITOS_HUESO[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseHuesoEnTiempo(t: number): FaseHueso {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_HUESO.length && x >= LIMITES_FASES_HUESO[indice]!) indice++;
  return FASES_HUESO[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

/** Cuánto se abre la cuña del hueso largo (0 cerrada, 1 apartada del todo). */
const PISTA_APERTURA: readonly Fotograma[] = [
  [0.05, 0],
  [0.19, 1],
];
/** Opacidad de la vaina de periostio que envuelve el hueso entero. */
const PISTA_PERIOSTIO: readonly Fotograma[] = [
  [0.06, 0.55],
  [0.17, 0],
];
/** Opacidad del hueso largo (se aleja al pasar al corte). */
const PISTA_HUESO_OPACIDAD: readonly Fotograma[] = [
  [0.3, 1],
  [0.41, 0],
];
const PISTA_HUESO_ESCALA: readonly Fotograma[] = [
  [0.3, 1],
  [0.41, 0.55],
];
/** Opacidad y escala del corte transversal. */
const PISTA_LOSA_OPACIDAD: readonly Fotograma[] = [
  [0.33, 0],
  [0.42, 1],
];
const PISTA_LOSA_ESCALA: readonly Fotograma[] = [
  [0.33, 0.5],
  [0.42, 1],
  [0.8, 1],
  [0.88, 0.27],
];
/** Dónde queda el corte cuando la osteona pasa al centro (x, y). */
const PISTA_LOSA_X: readonly Fotograma[] = [
  [0.8, 0],
  [0.88, -2.35],
];
const PISTA_LOSA_Y: readonly Fotograma[] = [
  [0.8, 0],
  [0.88, 2.05],
];
/** Cuánto se separan las capas del corte (0 juntas, 1 separadas). */
const PISTA_EXPLOSION: readonly Fotograma[] = [
  [0.5, 0],
  [0.58, 1],
  [0.66, 1],
  [0.72, 0],
];
/** Cuánto se destacan las osteonas en el corte (0 a 1). */
const PISTA_RESALTE: readonly Fotograma[] = [
  [0.66, 0],
  [0.74, 1],
  [0.82, 1],
  [0.9, 0.25],
];
/** Opacidad y escala de la osteona ampliada. */
const PISTA_OSTEONA_OPACIDAD: readonly Fotograma[] = [
  [0.76, 0],
  [0.85, 1],
];
const PISTA_OSTEONA_ESCALA: readonly Fotograma[] = [
  [0.76, 0.3],
  [0.86, 1],
];
/** Énfasis de los osteocitos y sus canalículos (0 a 1). */
const PISTA_OSTEOCITOS: readonly Fotograma[] = [
  [0.86, 0],
  [0.96, 1],
];

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface EstadoHueso {
  fase: FaseHueso;
  /** Cuña del hueso largo: 0 cerrada, 1 apartada. */
  apertura: number;
  periostio: number;
  hueso: { opacidad: number; escala: number };
  losa: { opacidad: number; escala: number; x: number; y: number };
  /** Separación de las capas del corte (0 a 1). */
  explosion: number;
  /** Cuánto se destacan las osteonas del corte (0 a 1). */
  resalte: number;
  osteona: { opacidad: number; escala: number };
  /** Énfasis de los osteocitos (0 a 1): crecen las lagunas y se ven los canalículos. */
  osteocitos: number;
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoHueso(t: number): EstadoHueso {
  const x = acotar(t);
  return {
    fase: faseHuesoEnTiempo(x),
    apertura: evaluarPista(PISTA_APERTURA, x),
    periostio: evaluarPista(PISTA_PERIOSTIO, x),
    hueso: {
      opacidad: evaluarPista(PISTA_HUESO_OPACIDAD, x),
      escala: evaluarPista(PISTA_HUESO_ESCALA, x),
    },
    losa: {
      opacidad: evaluarPista(PISTA_LOSA_OPACIDAD, x),
      escala: evaluarPista(PISTA_LOSA_ESCALA, x),
      x: evaluarPista(PISTA_LOSA_X, x),
      y: evaluarPista(PISTA_LOSA_Y, x),
    },
    explosion: evaluarPista(PISTA_EXPLOSION, x),
    resalte: evaluarPista(PISTA_RESALTE, x),
    osteona: {
      opacidad: evaluarPista(PISTA_OSTEONA_OPACIDAD, x),
      escala: evaluarPista(PISTA_OSTEONA_ESCALA, x),
    },
    osteocitos: evaluarPista(PISTA_OSTEOCITOS, x),
  };
}
