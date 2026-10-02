/**
 * Estado de la escena "dentro de la matriz ósea" como FUNCIÓN PURA del tiempo `t` (0 a 1). Sin three, sin
 * Vue y sin estado acumulado: `estadoMatriz(t)` da siempre lo mismo para el mismo `t`, así que adelantar,
 * atrasar y saltar de una fase a otra es exacto y reversible. Las mallas (`mallas.ts`) y la escena
 * (`EscenaMatriz.vue`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * Como en la escena del hueso, el "tiempo" es la PROFUNDIDAD de la mirada: del fragmento de hueso laminar a
 * sus laminillas hechas de fibras de colágeno, a una fibrilla con sus moléculas de tropocolágeno escalonadas,
 * a los huecos entre moléculas, al mineral que crece en ellos, a las proteínas no colágenas y, al final, a
 * cómo responde el conjunto a la carga.
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_MATRIZ`, el instante que mejor la muestra). Una fase abarca desde el
 * punto medio con el hito anterior hasta el punto medio con el siguiente (`LIMITES_FASES_MATRIZ`), la misma
 * regla que usa la interfaz para saber qué texto mostrar (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Esquemáticas y NO a escala real entre pantallas: cada escala (fragmento, laminillas, fibrilla) se dibuja del
 * tamaño que cabe en la pantalla. Dentro de la fibrilla sí se respeta la PROPORCIÓN del modelo de
 * Hodge-Petruska: periodo D (67 nm), molécula de 4,4 D y hueco de 0,6 D. El contenido lo dice en el texto.
 */
import { acotar, evaluarPista, mezclar } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena)
 * ----------------------------------------------------------------------------------------- */

/** Fragmento de hueso laminar: ancho (X), alto (Y) y fondo (Z) del bloque. */
export const FRAGMENTO = { ancho: 6.4, alto: 3.2, fondo: 2.4 } as const;
/** Grosor de cada laminilla del fragmento (apiladas a lo largo de Y). */
export const GROSOR_LAMINILLA = 0.4;
/** Número de laminillas del fragmento. */
export const N_LAMINILLAS_FRAGMENTO = Math.round(FRAGMENTO.alto / GROSOR_LAMINILLA);

/** Escala de las laminillas ampliadas: cuántas se ven y su separación en Y. */
export const N_LAMINILLAS_AMPLIADAS = 3;
export const SEPARACION_LAMINILLAS = 0.8;
/** Huella (X por Z) de cada laminilla ampliada. */
export const LAMINILLA = { ancho: 6.4, fondo: 2.6 } as const;
/** Radio de cada fibra de colágeno y separación entre fibras vecinas de una laminilla. */
export const R_FIBRA = 0.11;
export const SEPARACION_FIBRAS = 0.3;
/** Ángulo (grados, respecto a X) de las fibras de cada laminilla ampliada: alternan de una a la siguiente. */
export const ANGULOS_FIBRAS: readonly number[] = [-52, 0, 52];

/** Periodo D del bandeo del colágeno (67 nm reales), en unidades de escena. */
export const PERIODO_D = 0.6;
/** Largo de una molécula de tropocolágeno: 4,4 D (unos 300 nm). */
export const LARGO_MOLECULA = 4.4 * PERIODO_D;
/** Hueco entre el final de una molécula y el principio de la siguiente de su misma fila: 0,6 D. */
export const LARGO_HUECO = 0.6 * PERIODO_D;
/** Cada fila de moléculas se repite cada 5 D (molécula + hueco). */
export const PASO_FILA = LARGO_MOLECULA + LARGO_HUECO;
/** Radio de la fibrilla y su largo a lo largo de X. */
export const R_FIBRILLA = 0.95;
export const LARGO_FIBRILLA = 7.2;
/** Separación entre moléculas vecinas de la retícula y radio de cada bastón. */
export const SEPARACION_MOLECULAS = 0.17;
export const R_MOLECULA = 0.062;
/** Número de fibrillas vecinas (sin detalle) que quedan detrás de la fibrilla abierta: el resto de la fibra. */
export const N_FIBRILLAS_VECINAS = 7;
/** Plano (Z) en el que se alinean las fibrillas vecinas y separación entre ellas (en Y). */
export const Z_FIBRILLAS_VECINAS = -1.55;
export const SEPARACION_VECINAS = 0.8;
/** Radio de cada fibrilla vecina (más finas que la abierta, que está ampliada). */
export const R_FIBRILLA_VECINA = 0.36;
/** Cuánto se estira la fibrilla, como máximo, cuando el colágeno trabaja a tracción (fracción). */
export const ESTIRAMIENTO_MAXIMO = 0.05;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_MATRIZ = [
  'fragmento',
  'fibras',
  'fibrilla',
  'huecos',
  'mineral',
  'proteinas',
  'carga',
] as const;
export type FaseMatriz = (typeof FASES_MATRIZ)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 1 usa estos `t`. */
export const HITOS_MATRIZ: Readonly<Record<FaseMatriz, number>> = {
  fragmento: 0,
  fibras: 0.17,
  fibrilla: 0.34,
  huecos: 0.5,
  mineral: 0.64,
  proteinas: 0.78,
  carga: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_MATRIZ[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_MATRIZ: readonly number[] = FASES_MATRIZ.slice(1).map((fase, i) =>
  mezclar(HITOS_MATRIZ[FASES_MATRIZ[i]!], HITOS_MATRIZ[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseMatrizEnTiempo(t: number): FaseMatriz {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_MATRIZ.length && x >= LIMITES_FASES_MATRIZ[indice]!) indice++;
  return FASES_MATRIZ[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

/** El fragmento se aleja y desvanece al pasar a las laminillas. */
const PISTA_FRAGMENTO_OPACIDAD: readonly Fotograma[] = [
  [0.07, 1],
  [0.16, 0],
];
const PISTA_FRAGMENTO_ESCALA: readonly Fotograma[] = [
  [0.07, 1],
  [0.16, 0.5],
];
/** Las laminillas ampliadas crecen y aparecen; luego se alejan y desvanecen al pasar a la fibrilla. */
const PISTA_LAMINILLAS_OPACIDAD: readonly Fotograma[] = [
  [0.08, 0],
  [0.17, 1],
  [0.25, 1],
  [0.33, 0],
];
const PISTA_LAMINILLAS_ESCALA: readonly Fotograma[] = [
  [0.08, 0.45],
  [0.17, 1],
  [0.25, 1],
  [0.33, 0.5],
];
/** Cuánto se destaca la fibra central de la laminilla del medio (la que se abre después). */
const PISTA_RESALTE_FIBRA: readonly Fotograma[] = [
  [0.19, 0],
  [0.26, 1],
];
/** La fibrilla abierta crece y aparece. */
const PISTA_FIBRILLA_OPACIDAD: readonly Fotograma[] = [
  [0.25, 0],
  [0.34, 1],
];
const PISTA_FIBRILLA_ESCALA: readonly Fotograma[] = [
  [0.25, 0.3],
  [0.35, 1],
];
/** Las fibrillas vecinas de la fibra abierta se atenúan cuando la mirada baja al detalle y se van con la carga. */
const PISTA_VECINAS: readonly Fotograma[] = [
  [0.4, 1],
  [0.5, 0.4],
  [0.85, 0.4],
  [0.95, 0],
];
/** Los huecos se destacan; ceden protagonismo cuando el mineral los ocupa y desaparecen con la carga. */
const PISTA_HUECOS: readonly Fotograma[] = [
  [0.41, 0],
  [0.5, 1],
  [0.57, 1],
  [0.66, 0.35],
  [0.86, 0.35],
  [0.94, 0],
];
/** Los cristales de hidroxiapatita crecen en los huecos y a lo largo de la fibrilla. */
const PISTA_MINERAL: readonly Fotograma[] = [
  [0.55, 0],
  [0.64, 1],
];
/** Las proteínas no colágenas aparecen sobre fibrillas y cristales. */
const PISTA_PROTEINAS: readonly Fotograma[] = [
  [0.7, 0],
  [0.78, 1],
];
/** Flechas de tracción y de compresión. */
const PISTA_FLECHAS: readonly Fotograma[] = [
  [0.87, 0],
  [0.96, 1],
];
/** La fibrilla se estira ligeramente: el colágeno trabaja a tracción. */
const PISTA_ESTIRAMIENTO: readonly Fotograma[] = [
  [0.88, 0],
  [1, 1],
];

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface EstadoMatriz {
  fase: FaseMatriz;
  /** Fragmento de hueso laminar. */
  fragmento: { opacidad: number; escala: number };
  /** Laminillas ampliadas, hechas de fibras de colágeno. */
  laminillas: { opacidad: number; escala: number };
  /** Cuánto se destaca la fibra que se abre a continuación (0 a 1). */
  resalteFibra: number;
  /** Fibrilla abierta (con todo lo que crece en ella). */
  fibrilla: { opacidad: number; escala: number };
  /** Opacidad relativa de las fibrillas vecinas de la fibra abierta (0 a 1). */
  vecinas: number;
  /** Énfasis de los huecos (0 a 1). */
  huecos: number;
  /** Crecimiento de los cristales de hidroxiapatita (0 a 1). */
  mineral: number;
  /** Aparición de las proteínas no colágenas (0 a 1). */
  proteinas: number;
  /** Aparición de las flechas de tracción y de compresión (0 a 1). */
  flechas: number;
  /** Estiramiento de la fibrilla bajo tracción (0 a 1; la fracción real es `ESTIRAMIENTO_MAXIMO`). */
  estiramiento: number;
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoMatriz(t: number): EstadoMatriz {
  const x = acotar(t);
  return {
    fase: faseMatrizEnTiempo(x),
    fragmento: {
      opacidad: evaluarPista(PISTA_FRAGMENTO_OPACIDAD, x),
      escala: evaluarPista(PISTA_FRAGMENTO_ESCALA, x),
    },
    laminillas: {
      opacidad: evaluarPista(PISTA_LAMINILLAS_OPACIDAD, x),
      escala: evaluarPista(PISTA_LAMINILLAS_ESCALA, x),
    },
    resalteFibra: evaluarPista(PISTA_RESALTE_FIBRA, x),
    fibrilla: {
      opacidad: evaluarPista(PISTA_FIBRILLA_OPACIDAD, x),
      escala: evaluarPista(PISTA_FIBRILLA_ESCALA, x),
    },
    vecinas: evaluarPista(PISTA_VECINAS, x),
    huecos: evaluarPista(PISTA_HUECOS, x),
    mineral: evaluarPista(PISTA_MINERAL, x),
    proteinas: evaluarPista(PISTA_PROTEINAS, x),
    flechas: evaluarPista(PISTA_FLECHAS, x),
    estiramiento: evaluarPista(PISTA_ESTIRAMIENTO, x),
  };
}
