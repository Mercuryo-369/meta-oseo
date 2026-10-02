/**
 * Estado de la escena "cómo cicatriza una fractura" como FUNCIÓN PURA del tiempo `t` (0 a 1). Sin three, sin
 * Vue y sin estado acumulado: `estadoFractura(t)` da siempre lo mismo para el mismo `t`, así que adelantar,
 * atrasar y saltar de una fase a otra es exacto y reversible. Las mallas (`mallas.ts`) y la escena
 * (`EscenaFractura.vue`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * Aquí `t` SÍ es tiempo, de las primeras horas a los meses (escala pedagógica, no proporcional): la
 * cicatrización SECUNDARIA (indirecta, con callo) de una fractura transversal de la diáfisis de un hueso
 * largo. Se rompen el hueso, el periostio y los vasos (fractura, sangrado); la sangre forma un hematoma que
 * llena la brecha y rodea los extremos; llegan células inflamatorias, el periostio se engruesa y brotan vasos
 * nuevos; el hematoma se sustituye por tejido de granulación y fibrocartílago, que forman un manguito
 * fusiforme por fuera (callo externo) y tapan la brecha por dentro (callo interno); el cartílago del centro se
 * calcifica y se sustituye por hueso entretejido (osificación endocondral) mientras bajo el periostio, lejos
 * de la brecha, se forma hueso directo (intramembranosa); los osteoclastos reabsorben el exceso del callo, los
 * osteoblastos rellenan la cortical con hueso laminar y la médula se recanaliza; al final la forma es casi la
 * original, con la cortical continua.
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_FRACTURA`, el instante que mejor la muestra). Una fase abarca desde
 * el punto medio con el hito anterior hasta el punto medio con el siguiente (`LIMITES_FASES_FRACTURA`), la
 * misma regla que usa la interfaz para saber qué texto mostrar (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Esquemáticas: la cortical de la diáfisis tiene radio 1 y cada fragmento mide unas 3 unidades. Las células
 * (esferas de 0,06 a 0,12) están muy exageradas respecto al hueso; el contenido lo dice en el texto.
 */
import { acotar, evaluarPista, mezclar } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena). Todo se construye con el eje del hueso en Y (convención de los
 * cilindros de three) y el grupo se tumba después para que quede a lo largo de X. El centro de la brecha es el
 * origen: el fragmento "proximal" ocupa y < 0 y el "distal", y > 0.
 * ----------------------------------------------------------------------------------------- */

/** Radio exterior de la cortical de la diáfisis. */
export const R_CORTICAL = 1;
/** Radio de la cavidad medular (cara interna de la cortical). */
export const R_MEDULAR = 0.62;
/** Periostio: vaina fina que envuelve la cortical (radios interior y exterior). */
export const PERIOSTIO = { interior: 1.02, exterior: 1.06 } as const;
/** Largo de cada fragmento a lo largo del eje (sin contar la brecha). */
export const LARGO_FRAGMENTO = 3.1;
/** Separación entre los dos extremos de la fractura. */
export const BRECHA = 0.4;
/** Desplazamiento lateral del fragmento distal respecto del proximal (fractura "ligeramente desplazada"). */
export const DESPLAZAMIENTO = 0.12;
/** Tramo de cortical de cada extremo que muere por falta de riego (hueso necrótico). */
export const LARGO_NECROSIS = 0.35;
/** Cuánto se retira la médula del extremo de cada fragmento (ahí hay sangrado, hematoma y callo interno). */
export const RETIRO_MEDULA = 0.6;
/** Cuánto se retira el periostio roto del extremo de cada fragmento. */
export const RETIRO_PERIOSTIO = 0.45;

/**
 * Cuña que se abre a lo largo de la diáfisis para ver dentro (vistas `corte` y `detalle`). Su centro (-90°)
 * queda arriba una vez tumbado el hueso: la tapa se oculta y el interior se ve desde una cámara elevada.
 */
export const CUNA = { inicio: -160, arco: 140 } as const;
/**
 * Los tejidos blandos (hematoma, callo) se cortan con una cuña un poco MAYOR que la del hueso, para que sus
 * caras de corte queden retiradas detrás de las del hueso y no compitan con ellas en el mismo plano.
 */
export const RETIRO_CUNA = { callo: 4, hematoma: 7 } as const;

/** Hematoma fracturario: fusiforme sólido, centrado en la brecha (radio máximo y medio largo). */
export const HEMATOMA = { radio: 1.42, medioLargo: 1.45 } as const;
/**
 * Callo: manguito fusiforme sólido alrededor de la brecha (radio máximo y medio largo, a escala 1). La parte
 * central (|y| < `medioLargoCentro`) es el callo endocondral (cartílago → hueso); el resto, el callo
 * intramembranoso bajo el periostio.
 */
export const CALLO = { radioMax: 1.85, medioLargo: 2.3, medioLargoCentro: 0.95 } as const;
/** Escala del callo al consolidar: su radio máximo queda apenas por encima de la cortical (1,85 × 0,565 ≈ 1,05). */
export const ESCALA_CALLO_FINAL = 0.565;
/** Escala del callo por debajo de la cual no se dibuja: cabe entero dentro de la cortical (1,85 × 0,56 ≈ 1,04 solo en el centro). */
export const ESCALA_CALLO_OCULTO = 0.56;

/** Número de piezas repetidas. */
export const N_VASOS_ROTOS = 12;
export const N_GOTAS = 24;
export const N_CELULAS_INFLAMATORIAS = 34;
export const N_CELULAS_MADRE = 14;
export const N_VASOS_NUEVOS = 16;
export const N_OSTEOCLASTOS = 9;
export const N_OSTEOBLASTOS = 18;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_FRACTURA = [
  'fractura',
  'hematoma',
  'inflamacion',
  'callo_blando',
  'callo_duro',
  'remodelado',
  'consolidado',
] as const;
export type FaseFractura = (typeof FASES_FRACTURA)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 5 usa estos `t`. */
export const HITOS_FRACTURA: Readonly<Record<FaseFractura, number>> = {
  fractura: 0,
  hematoma: 0.15,
  inflamacion: 0.3,
  callo_blando: 0.45,
  callo_duro: 0.6,
  remodelado: 0.8,
  consolidado: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_FRACTURA[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_FRACTURA: readonly number[] = FASES_FRACTURA.slice(1).map((fase, i) =>
  mezclar(HITOS_FRACTURA[FASES_FRACTURA[i]!], HITOS_FRACTURA[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseFracturaEnTiempo(t: number): FaseFractura {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_FRACTURA.length && x >= LIMITES_FASES_FRACTURA[indice]!) indice++;
  return FASES_FRACTURA[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

/** Sangrado: vasos rotos y gotas de sangre en la brecha (se ocultan cuando el hematoma los cubre). */
const PISTA_SANGRADO: readonly Fotograma[] = [
  [0.04, 1],
  [0.13, 0],
];
/** Escala del hematoma (0 nada, 1 llena la brecha y rodea los extremos); lo sustituye el callo blando. */
const PISTA_HEMATOMA: readonly Fotograma[] = [
  [0.02, 0],
  [0.15, 1],
  [0.3, 0.95],
  [0.44, 0],
];
/** El coágulo se organiza en tejido de granulación (0 coágulo rojo oscuro, 1 granulación rosada). */
const PISTA_GRANULACION: readonly Fotograma[] = [
  [0.18, 0],
  [0.3, 1],
];
/** Presencia de las células inflamatorias y los macrófagos. */
const PISTA_INFLAMACION: readonly Fotograma[] = [
  [0.17, 0],
  [0.3, 1],
  [0.36, 1],
  [0.45, 0],
];
/** Presencia de las células madre del periostio (y de la médula). */
const PISTA_CELULAS_MADRE: readonly Fotograma[] = [
  [0.2, 0],
  [0.3, 1],
  [0.42, 1],
  [0.5, 0],
];
/** Engrosamiento del periostio (0 fino, 1 engrosado por la respuesta perióstica). */
const PISTA_PERIOSTIO: readonly Fotograma[] = [
  [0.18, 0],
  [0.3, 1],
  [0.7, 1],
  [0.95, 0.15],
];
/** Vasos nuevos desde el periostio y la médula (0 nada, 1 largos del todo). */
const PISTA_VASOS_NUEVOS: readonly Fotograma[] = [
  [0.22, 0],
  [0.33, 1],
  [0.7, 1],
  [0.88, 0],
];
/**
 * Escala del callo. A 0,5 queda escondido dentro de la cortical (1,85 × 0,5 < 1); a 1 es el manguito completo;
 * al remodelarse baja hasta `ESCALA_CALLO_FINAL`.
 */
const PISTA_CALLO: readonly Fotograma[] = [
  [0.33, 0.5],
  [0.45, 1],
  [0.66, 1],
  [0.8, 0.74],
  [1, ESCALA_CALLO_FINAL],
];
/** Callo externo periférico: de tejido fibroso a hueso entretejido directo (intramembranoso). */
const PISTA_HUESO_PERIFERICO: readonly Fotograma[] = [
  [0.46, 0],
  [0.56, 1],
];
/** Callo central: el cartílago se calcifica (0 hialino, 1 calcificado). */
const PISTA_CALCIFICACION: readonly Fotograma[] = [
  [0.47, 0],
  [0.55, 1],
];
/** Callo central: el cartílago calcificado se sustituye por hueso entretejido (endocondral). */
const PISTA_HUESO_CENTRAL: readonly Fotograma[] = [
  [0.56, 0],
  [0.66, 1],
];
/** Hueso entretejido → hueso laminar (color y textura de la cortical). */
const PISTA_LAMINAR: readonly Fotograma[] = [
  [0.78, 0],
  [1, 1],
];
/** Hueso necrótico de los extremos (1 muerto, oscuro; 0 sustituido). */
const PISTA_NECROSIS: readonly Fotograma[] = [
  [0.02, 0],
  [0.12, 1],
  [0.56, 1],
  [0.74, 0],
];
/** Presencia de los osteoblastos sobre el callo y en la brecha. */
const PISTA_OSTEOBLASTOS: readonly Fotograma[] = [
  [0.5, 0],
  [0.6, 1],
  [0.86, 1],
  [0.96, 0],
];
/** Presencia de los osteoclastos que reabsorben el exceso de callo. */
const PISTA_OSTEOCLASTOS: readonly Fotograma[] = [
  [0.66, 0],
  [0.78, 1],
  [0.9, 1],
  [0.98, 0],
];
/** Recanalización de la médula a través de la brecha (0 nada, 1 continua). */
const PISTA_MEDULA: readonly Fotograma[] = [
  [0.66, 0],
  [0.84, 1],
];

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface EstadoFractura {
  fase: FaseFractura;
  /** Sangrado en la brecha (0 a 1). */
  sangrado: number;
  /** Escala del hematoma (0 a 1). */
  hematoma: number;
  /** Coágulo → tejido de granulación (0 a 1). */
  granulacion: number;
  /** Presencia de células inflamatorias y macrófagos (0 a 1). */
  inflamacion: number;
  /** Presencia de células madre del periostio (0 a 1). */
  celulasMadre: number;
  /** Engrosamiento del periostio (0 a 1). */
  periostio: number;
  /** Vasos nuevos (0 a 1). */
  vasosNuevos: number;
  /** Escala del callo (0,5 escondido a 1 completo; baja al remodelarse). */
  callo: number;
  /** Callo periférico: tejido fibroso → hueso (0 a 1). */
  huesoPeriferico: number;
  /** Callo central: cartílago → calcificado (0 a 1). */
  calcificacion: number;
  /** Callo central: calcificado → hueso (0 a 1). */
  huesoCentral: number;
  /** Hueso entretejido → laminar (0 a 1). */
  laminar: number;
  /** Hueso necrótico de los extremos (0 a 1). */
  necrosis: number;
  osteoblastos: number;
  osteoclastos: number;
  /** Médula recanalizada a través de la brecha (0 a 1). */
  medula: number;
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoFractura(t: number): EstadoFractura {
  const x = acotar(t);
  return {
    fase: faseFracturaEnTiempo(x),
    sangrado: evaluarPista(PISTA_SANGRADO, x),
    hematoma: evaluarPista(PISTA_HEMATOMA, x),
    granulacion: evaluarPista(PISTA_GRANULACION, x),
    inflamacion: evaluarPista(PISTA_INFLAMACION, x),
    celulasMadre: evaluarPista(PISTA_CELULAS_MADRE, x),
    periostio: evaluarPista(PISTA_PERIOSTIO, x),
    vasosNuevos: evaluarPista(PISTA_VASOS_NUEVOS, x),
    callo: evaluarPista(PISTA_CALLO, x),
    huesoPeriferico: evaluarPista(PISTA_HUESO_PERIFERICO, x),
    calcificacion: evaluarPista(PISTA_CALCIFICACION, x),
    huesoCentral: evaluarPista(PISTA_HUESO_CENTRAL, x),
    laminar: evaluarPista(PISTA_LAMINAR, x),
    necrosis: evaluarPista(PISTA_NECROSIS, x),
    osteoblastos: evaluarPista(PISTA_OSTEOBLASTOS, x),
    osteoclastos: evaluarPista(PISTA_OSTEOCLASTOS, x),
    medula: evaluarPista(PISTA_MEDULA, x),
  };
}
