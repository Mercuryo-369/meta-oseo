/**
 * Estado de la escena "el hueso alveolar por dentro" como FUNCIÓN PURA del tiempo `t` (0 a 1). Sin three, sin
 * Vue y sin estado acumulado: `estadoAlveolar(t)` da siempre lo mismo para el mismo `t`, así que adelantar,
 * atrasar y saltar de una fase a otra es exacto y reversible. Las mallas (`mallas.ts`) y la escena
 * (`EscenaAlveolar.vue`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * Como en la escena del hueso largo, aquí `t` no es tiempo biológico: es un RECORRIDO por el cuerpo de la
 * mandíbula. Primero un segmento del cuerpo con un premolar en su alvéolo; después se corta de vestibular a
 * lingual por el eje de la raíz (la mitad anterior se aparta) y sobre la sección se destacan, una a una, las
 * tablas corticales, el hueso trabecular, el hueso alveolar propio, el ligamento periodontal y el conducto
 * mandibular.
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_ALVEOLAR`, el instante que mejor la muestra). Una fase abarca desde
 * el punto medio con el hito anterior hasta el punto medio con el siguiente (`LIMITES_FASES_ALVEOLAR`), la misma
 * regla que usa la interfaz para saber qué texto mostrar (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Esquemáticas. El cuerpo mide 4,5 unidades de alto y unas 2,9 de ancho; el ligamento y la lámina van más
 * gruesos de lo real para que se vean en un teléfono. El contenido lo dice en el texto.
 */
import { acotar, evaluarPista, mezclar } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena). Eje X = mesiodistal (largo del segmento), Y = vertical,
 * Z = vestibulolingual (+Z vestibular, hacia la mejilla). El plano de corte es x = 0.
 * ----------------------------------------------------------------------------------------- */

/** Largo del segmento del cuerpo mandibular (eje X); cada mitad mide la mitad. */
export const LARGO_SEGMENTO = 6;
/** Altura de la cresta alveolar y del borde basal (eje Y). */
export const Y_CRESTA = 2;
export const Y_BASE = -2.5;
/** Semiancho del cuerpo en la cresta y en su parte más ancha (`Y_MAS_ANCHO`). */
export const SEMIANCHO_CRESTA = 0.92;
export const SEMIANCHO_MAXIMO = 1.45;
export const Y_MAS_ANCHO = -1.5;

/** Grosor de la cortical: la tabla lingual y la base son más gruesas que la vestibular. */
export const GROSOR_CORTICAL = {
  vestibular: 0.24,
  lingual: 0.36,
  base: 0.5,
  cresta: 0.22,
} as const;

/** Centro del alvéolo en Z (algo hacia vestibular: la tabla vestibular queda más delgada). */
export const Z_ALVEOLO = 0.18;
/** Semiancho de la raíz en la cresta y altura de su ápice. */
export const SEMIANCHO_RAIZ = 0.4;
export const Y_APICE = -0.45;
/** Grosor del ligamento periodontal y del hueso alveolar propio (lámina cribiforme). Exagerados a propósito. */
export const GROSOR_LIGAMENTO = 0.06;
export const GROSOR_LAMINA = 0.1;
/** Altura de la corona sobre la cresta y su radio máximo. */
export const ALTO_CORONA = 1;
export const RADIO_CORONA = 0.48;

/** Conducto mandibular: centro (z, y) y radio; corre a lo largo de X bajo el ápice. */
export const CONDUCTO = { z: -0.02, y: -1.08, radio: 0.3 } as const;

/** Profundidad del hueco entre la cara de corte y la cara del hueso trabecular (allí van las trabéculas). */
export const PROFUNDIDAD_TRABECULAR = 0.16;
/** Número de trabéculas instanciadas en la sección. */
export const N_TRABECULAS = 110;
/** Cuánto se aparta la mitad anterior del bloque (unidades, a lo largo de +X). */
export const DESPLAZAMIENTO_MITAD = 3.4;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_ALVEOLAR = [
  'cuerpo',
  'corte',
  'tablas',
  'trabecular',
  'alveolar_propio',
  'ligamento',
  'conducto',
] as const;
export type FaseAlveolar = (typeof FASES_ALVEOLAR)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 1 usa estos `t`. */
export const HITOS_ALVEOLAR: Readonly<Record<FaseAlveolar, number>> = {
  cuerpo: 0,
  corte: 0.18,
  tablas: 0.34,
  trabecular: 0.5,
  alveolar_propio: 0.66,
  ligamento: 0.82,
  conducto: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_ALVEOLAR[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_ALVEOLAR: readonly number[] = FASES_ALVEOLAR.slice(1).map((fase, i) =>
  mezclar(HITOS_ALVEOLAR[FASES_ALVEOLAR[i]!], HITOS_ALVEOLAR[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseAlveolarEnTiempo(t: number): FaseAlveolar {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_ALVEOLAR.length && x >= LIMITES_FASES_ALVEOLAR[indice]!) indice++;
  return FASES_ALVEOLAR[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

/** Cuánto se aparta la mitad anterior (0 en su sitio, 1 apartada del todo). */
const PISTA_DESPLAZAMIENTO: readonly Fotograma[] = [
  [0.05, 0],
  [0.17, 1],
];
/** Opacidad de la mitad apartada: se desvanece mientras se aleja para no tapar la sección. */
const PISTA_MITAD_OPACIDAD: readonly Fotograma[] = [
  [0.09, 1],
  [0.17, 0],
];

/** Resalte de cada estructura: sube hasta su hito, se mantiene un poco y se apaga antes del hito siguiente. */
function pistaResalte(hito: number, final = false): readonly Fotograma[] {
  return final
    ? [
        [hito - 0.09, 0],
        [hito, 1],
      ]
    : [
        [hito - 0.09, 0],
        [hito, 1],
        [hito + 0.04, 1],
        [hito + 0.1, 0],
      ];
}
const PISTA_TABLAS = pistaResalte(HITOS_ALVEOLAR.tablas);
const PISTA_TRABECULAR = pistaResalte(HITOS_ALVEOLAR.trabecular);
const PISTA_ALVEOLAR = pistaResalte(HITOS_ALVEOLAR.alveolar_propio);
const PISTA_LIGAMENTO = pistaResalte(HITOS_ALVEOLAR.ligamento);
const PISTA_CONDUCTO = pistaResalte(HITOS_ALVEOLAR.conducto, true);

/** Las perforaciones de la lámina cribiforme aparecen con su fase y se quedan. */
const PISTA_PERFORACIONES: readonly Fotograma[] = [
  [0.58, 0],
  [0.66, 1],
];
/** Las fibras del ligamento aparecen con su fase y se quedan. */
const PISTA_FIBRAS: readonly Fotograma[] = [
  [0.74, 0],
  [0.82, 1],
];

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface EstadoAlveolar {
  fase: FaseAlveolar;
  /** La mitad anterior del bloque: cuánto se aparta (0 a 1) y su opacidad. */
  mitad: { desplazamiento: number; opacidad: number };
  /** Cuánto se destaca cada estructura de la sección (0 a 1). */
  resalte: {
    tablas: number;
    trabecular: number;
    alveolar: number;
    ligamento: number;
    conducto: number;
  };
  /** Perforaciones de la lámina cribiforme (0 ocultas, 1 a la vista). */
  perforaciones: number;
  /** Fibras del ligamento periodontal (0 ocultas, 1 a la vista). */
  fibras: number;
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoAlveolar(t: number): EstadoAlveolar {
  const x = acotar(t);
  return {
    fase: faseAlveolarEnTiempo(x),
    mitad: {
      desplazamiento: evaluarPista(PISTA_DESPLAZAMIENTO, x),
      opacidad: evaluarPista(PISTA_MITAD_OPACIDAD, x),
    },
    resalte: {
      tablas: evaluarPista(PISTA_TABLAS, x),
      trabecular: evaluarPista(PISTA_TRABECULAR, x),
      alveolar: evaluarPista(PISTA_ALVEOLAR, x),
      ligamento: evaluarPista(PISTA_LIGAMENTO, x),
      conducto: evaluarPista(PISTA_CONDUCTO, x),
    },
    perforaciones: evaluarPista(PISTA_PERFORACIONES, x),
    fibras: evaluarPista(PISTA_FIBRAS, x),
  };
}
