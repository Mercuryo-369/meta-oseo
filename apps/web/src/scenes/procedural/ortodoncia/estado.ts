/**
 * Estado de la escena "un movimiento ortodóntico, lado a lado" como FUNCIÓN PURA del tiempo `t` (0 a 1). Sin
 * three, sin Vue y sin estado acumulado: `estadoOrtodoncia(t)` da siempre lo mismo para el mismo `t`, así que
 * adelantar, atrasar y saltar de una fase a otra es exacto y reversible. Las mallas (`mallas.ts`) y la escena
 * (`EscenaOrtodoncia.vue`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * Aquí `t` SÍ es tiempo biológico, comprimido y no proporcional: de la aplicación de la fuerza (horas) a la
 * retención (meses). Un corte MESIODISTAL del proceso alveolar (a lo largo de la arcada) con un canino de una
 * raíz: se aplica una fuerza hacia distal (+X, la derecha de la pantalla), el ligamento se comprime del lado
 * hacia el que va el diente y se estira del opuesto, los osteoclastos reabsorben la pared de compresión, los
 * osteoblastos depositan hueso en la de tensión, el diente y su alvéolo migran y, sin fuerza, el hueso nuevo
 * madura y el ligamento se reorganiza.
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_ORTODONCIA`, el instante que mejor la muestra). Una fase abarca desde
 * el punto medio con el hito anterior hasta el punto medio con el siguiente (`LIMITES_FASES_ORTODONCIA`), la
 * misma regla que usa la interfaz para saber qué texto mostrar (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Esquemáticas. El bloque mide 4,8 unidades de ancho y 4,2 de alto; el ligamento (0,1) y la lámina (0,12) van
 * mucho más gruesos que en la realidad, y el diente recorre 0,7 unidades (más de lo proporcional) para que el
 * movimiento se vea en un teléfono. El contenido lo dice en el texto.
 */
import { acotar, evaluarPista, mezclar } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena). Eje X = mesiodistal (−X mesial, izquierda; +X distal, derecha,
 * hacia donde se mueve el diente), Y = vertical, Z = vestibulolingual. El plano de corte es z = 0 y mira a la
 * cámara (+Z); el bloque se extiende hacia −Z.
 * ----------------------------------------------------------------------------------------- */

/** Semiancho del bloque de proceso alveolar (eje X) y su profundidad (eje Z, hacia −Z). */
export const SEMIANCHO_BLOQUE = 2.4;
export const PROFUNDIDAD_BLOQUE = 2.4;
/** Altura de la cresta alveolar y del borde basal del bloque (eje Y). */
export const Y_CRESTA = 1.6;
export const Y_BASE = -2.6;
/** Grosor de la cortical (tablas de los extremos, base y cresta). */
export const GROSOR_CORTICAL = { lados: 0.32, base: 0.45, cresta: 0.16 } as const;
/** Altura de la encía sobre la cresta. */
export const ALTO_ENCIA = 0.3;

/** Posición inicial del eje del diente (algo a la izquierda: le queda sitio para avanzar hacia la derecha). */
export const X_DIENTE_INICIAL = -0.35;
/** Cuánto avanza el diente en total (unidades, hacia +X). Exagerado a propósito. */
export const DESPLAZAMIENTO_MAXIMO = 0.7;
/** Inclinación máxima de la corona hacia distal (radianes) y altura del centro de rotación (Y). */
export const INCLINACION_MAXIMA = 0.05;
export const Y_CENTRO_ROTACION = -0.15;
/** Raíz: semiancho en el cuello, altura del ápice y radio con que se redondea. */
export const SEMIANCHO_RAIZ = 0.42;
export const Y_APICE = -1.3;
export const RADIO_APICE = 0.12;
/** Corona del canino: altura sobre la cresta y semiancho máximo. */
export const ALTO_CORONA = 1.3;
export const SEMIANCHO_CORONA = 0.5;

/** Grosor del ligamento periodontal en reposo y del hueso alveolar propio (lámina). Exagerados. */
export const GROSOR_LIGAMENTO = 0.1;
export const GROSOR_LAMINA = 0.12;
/**
 * Fracción del grosor del ligamento que la raíz se corre dentro del alvéolo con la fuerza: el ligamento de
 * compresión queda en 1 − esta fracción y el de tensión en 1 + esta fracción.
 */
export const ESTRECHAMIENTO_COMPRESION = 0.55;
/** Profundidad de las lagunas de Howship en la pared de compresión. */
export const PROFUNDIDAD_LAGUNAS = 0.05;

/** Profundidad del hueco entre la cara de corte y la cara del hueso trabecular (allí van las trabéculas). */
export const PROFUNDIDAD_TRABECULAR = 0.16;
/** Número de trabéculas instanciadas en la sección. */
export const N_TRABECULAS = 130;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_ORTODONCIA = [
  'reposo',
  'fuerza',
  'ligamento',
  'resorcion',
  'aposicion',
  'desplazamiento',
  'retencion',
] as const;
export type FaseOrtodoncia = (typeof FASES_ORTODONCIA)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 5 usa estos `t`. */
export const HITOS_ORTODONCIA: Readonly<Record<FaseOrtodoncia, number>> = {
  reposo: 0,
  fuerza: 0.16,
  ligamento: 0.32,
  resorcion: 0.5,
  aposicion: 0.66,
  desplazamiento: 0.83,
  retencion: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_ORTODONCIA[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_ORTODONCIA: readonly number[] = FASES_ORTODONCIA.slice(1).map(
  (fase, i) => mezclar(HITOS_ORTODONCIA[FASES_ORTODONCIA[i]!], HITOS_ORTODONCIA[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseOrtodonciaEnTiempo(t: number): FaseOrtodoncia {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_ORTODONCIA.length && x >= LIMITES_FASES_ORTODONCIA[indice]!)
    indice++;
  return FASES_ORTODONCIA[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

/** La fuerza (bracket y flecha) aparece con su fase y se retira en la retención. */
const PISTA_FUERZA: readonly Fotograma[] = [
  [0.08, 0],
  [0.16, 1],
  [0.9, 1],
  [0.98, 0],
];
/**
 * Avance del diente y de su alvéolo por remodelado (resorción delante, aposición detrás). El primer corrimiento,
 * el de la raíz dentro del ligamento, va aparte (`ligamento.compresion`).
 */
const PISTA_DESPLAZAMIENTO: readonly Fotograma[] = [
  [0.44, 0],
  [0.83, 1],
];
/** La corona se inclina hacia distal al recibir la fuerza; en la retención se endereza en parte. */
const PISTA_INCLINACION: readonly Fotograma[] = [
  [0.2, 0],
  [0.32, 1],
  [0.88, 1],
  [1, 0.35],
];
/** Compresión del ligamento del lado derecho y estiramiento del izquierdo: mientras dura la fuerza. */
const PISTA_LADOS: readonly Fotograma[] = [
  [0.2, 0],
  [0.32, 1],
  [0.86, 1],
  [1, 0],
];
/** Zona hialinizada del lado de compresión: aparece pronto y los osteoclastos la retiran. */
const PISTA_HIALINIZACION: readonly Fotograma[] = [
  [0.24, 0],
  [0.32, 1],
  [0.5, 1],
  [0.6, 0],
];
const PISTA_OSTEOCLASTOS: readonly Fotograma[] = [
  [0.38, 0],
  [0.5, 1],
  [0.56, 1],
  [0.64, 0],
];
/** Pared de compresión festoneada (lagunas de Howship) y adelgazada; se alisa en la retención. */
const PISTA_RESORCION: readonly Fotograma[] = [
  [0.4, 0],
  [0.5, 1],
  [0.83, 1],
  [0.95, 0],
];
/** Los osteoblastos llegan en la aposición y se quedan (al final, como células de revestimiento). */
const PISTA_OSTEOBLASTOS: readonly Fotograma[] = [
  [0.56, 0],
  [0.66, 1],
];
const PISTA_REVESTIMIENTO: readonly Fotograma[] = [
  [0.88, 0],
  [1, 1],
];
/** Ribete de osteoide sobre la pared de tensión: mientras se deposita hueso. */
const PISTA_OSTEOIDE: readonly Fotograma[] = [
  [0.56, 0],
  [0.66, 1],
  [0.86, 1],
  [0.98, 0],
];
/** El hueso nuevo toma el color del hueso maduro en la retención. */
const PISTA_MADURACION: readonly Fotograma[] = [
  [0.86, 0],
  [1, 1],
];
/** Marca punteada de la posición inicial del diente: aparece con el desplazamiento y se queda. */
const PISTA_REFERENCIA: readonly Fotograma[] = [
  [0.72, 0],
  [0.83, 1],
];

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface EstadoOrtodoncia {
  fase: FaseOrtodoncia;
  /** Fuerza ortodóntica aplicada (0 sin fuerza, 1 bracket y flecha a la vista). */
  fuerza: number;
  /** El diente: avance hacia distal (fracción de `DESPLAZAMIENTO_MAXIMO`) e inclinación de la corona. */
  diente: { desplazamiento: number; inclinacion: number };
  /** El ligamento: compresión del lado derecho, estiramiento del izquierdo y zona hialinizada. */
  ligamento: { compresion: number; tension: number; hialinizacion: number };
  /** Lado de compresión (derecha): osteoclastos sobre la pared y pared reabsorbida (lagunas). */
  compresion: { osteoclastos: number; resorcion: number };
  /** Lado de tensión (izquierda): fila de osteoblastos, ribete de osteoide, aplanamiento y maduración. */
  tension: { osteoblastos: number; osteoide: number; revestimiento: number; maduracion: number };
  /** Marca punteada de la posición inicial (0 oculta, 1 a la vista). */
  referencia: number;
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoOrtodoncia(t: number): EstadoOrtodoncia {
  const x = acotar(t);
  const lados = evaluarPista(PISTA_LADOS, x);
  return {
    fase: faseOrtodonciaEnTiempo(x),
    fuerza: evaluarPista(PISTA_FUERZA, x),
    diente: {
      desplazamiento: evaluarPista(PISTA_DESPLAZAMIENTO, x),
      inclinacion: evaluarPista(PISTA_INCLINACION, x),
    },
    ligamento: {
      compresion: lados,
      tension: lados,
      hialinizacion: evaluarPista(PISTA_HIALINIZACION, x),
    },
    compresion: {
      osteoclastos: evaluarPista(PISTA_OSTEOCLASTOS, x),
      resorcion: evaluarPista(PISTA_RESORCION, x),
    },
    tension: {
      osteoblastos: evaluarPista(PISTA_OSTEOBLASTOS, x),
      osteoide: evaluarPista(PISTA_OSTEOIDE, x),
      revestimiento: evaluarPista(PISTA_REVESTIMIENTO, x),
      maduracion: evaluarPista(PISTA_MADURACION, x),
    },
    referencia: evaluarPista(PISTA_REFERENCIA, x),
  };
}
