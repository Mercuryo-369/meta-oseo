/**
 * Estado de la escena "dos rutas para construir hueso, lado a lado" como FUNCIÓN PURA del tiempo `t` (0 a 1).
 * Sin three, sin Vue y sin estado acumulado: `estadoDosRutas(t)` da siempre lo mismo para el mismo `t`, así que
 * adelantar, atrasar y saltar de una fase a otra es exacto y reversible. Las mallas (`mallas.ts`) y la escena
 * (`EscenaDosRutas.vue`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * Aquí `t` SÍ es tiempo: el desarrollo de dos huesos a la vez, uno a cada lado de la pantalla. A la IZQUIERDA
 * (x < 0) un hueso plano se forma por osificación intramembranosa: el mesénquima se condensa, sus células se
 * vuelven osteoblastos, secretan osteoide y levantan espículas de hueso entretejido que se ramifican, se
 * vascularizan, se funden en dos tablas compactas y al final se remodelan a hueso laminar con osteonas. A la
 * DERECHA (x > 0) un hueso largo se forma por osificación endocondral: la condensación se vuelve un molde de
 * cartílago hialino con pericondrio, sus condrocitos centrales se hipertrofian y su matriz se calcifica, aparece el
 * collar perióstico, una yema vascular perfora el collar y funda el centro primario, el cartílago del centro se
 * sustituye por trabéculas, quedan las placas de crecimiento y aparecen los centros secundarios; al final, hueso
 * laminar con cartílago articular y una placa fina. Las dos rutas avanzan A LA VEZ: cada fase describe ambas.
 * La escala de tiempo es pedagógica, no proporcional (el proceso real dura semanas en el embrión y años en la
 * placa de crecimiento).
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_DOS_RUTAS`, el instante que mejor la muestra). Una fase abarca desde el
 * punto medio con el hito anterior hasta el punto medio con el siguiente (`LIMITES_FASES_DOS_RUTAS`), la misma
 * regla que usa la interfaz para saber qué texto mostrar (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Esquemáticas: cada lado ocupa un panel de unas 3,6 × 4,8 unidades y las células miden alrededor de 0,2. Ni las
 * células ni las estructuras guardan proporción real entre sí (una célula mide unos 20 µm y un molde
 * cartilaginoso, milímetros); el contenido lo dice en el texto.
 */
import { acotar, evaluarPista, mezclar } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena). Ejes: X de un lado al otro (izquierda intramembranosa, derecha
 * endocondral), Y hacia arriba, Z hacia la cámara. Cada lado tiene su propio origen local en (±X_LADO, 0, 0).
 * ----------------------------------------------------------------------------------------- */

/** Distancia del centro de cada panel al centro de la escena (el hueco entre paneles es el doble menos su ancho). */
export const X_LADO = 2.5;
/** Panel de mesénquima translúcido de cada lado: ancho (X), alto (Y) y fondo (Z). */
export const PANEL = { ancho: 3.6, alto: 4.8, fondo: 1.4 } as const;

/** Lado intramembranoso: número de células que se siguen. */
export const N_CELULAS_IM = 64;
/** Cada cuántas células de la izquierda una queda atrapada como osteocito. */
export const CADA_OSTEOCITO = 4;
/** Elipsoide (semiejes) que ocupa la red de espículas del hueso plano. */
export const RED_ESPICULAS = { x: 1.5, y: 0.62, z: 0.52 } as const;
/** Tablas compactas del hueso plano: altura del centro de cada una (±y), grosor, ancho y fondo. */
export const PLACA = { y: 0.52, grosor: 0.16, ancho: 3.1, fondo: 1.15 } as const;
/** Radio base de una espícula (crece con `grosor`). */
export const R_ESPICULA = 0.06;
/** Número de osteonas dibujadas en la cara de la tabla superior al final. */
export const N_OSTEONAS_PLACA = 8;

/** Lado endocondral: número de células que se siguen. */
export const N_CELULAS_EC = 72;
/** Molde cartilaginoso: medio largo de la diáfisis, su radio, centro de cada epífisis (±y), su radio y su semieje. */
export const MOLDE = {
  medioLargo: 1.35,
  radio: 0.42,
  yEpifisis: 1.75,
  rEpifisis: 0.75,
  semiejeEpifisis: 0.55,
} as const;
/** Los condrocitos con |y| menor que esto son los "centrales": se hipertrofian primero. */
export const Y_CENTRAL = 0.65;
/** Collar perióstico: radios interior y exterior y medio largo final. Y la cortical que lo engruesa al final. */
export const COLLAR = { interior: 0.43, exterior: 0.54, medioLargo: 1.25 } as const;
export const CORTICAL = { interior: 0.54, exterior: 0.62 } as const;
/** Apertura (grados) del collar y del pericondrio hacia la cámara, para ver el interior. */
export const APERTURA_COLLAR = 120;
/** Centro secundario de osificación de cada epífisis: altura (±y) y semiejes finales. */
export const SECUNDARIO = { y: 1.85, semiejes: [0.5, 0.3, 0.5] as const } as const;
/** Radio del cilindro en el que caben las trabéculas del centro primario y de la cavidad medular. */
export const R_INTERIOR_DIAFISIS = 0.34;
/** Yema perióstica: altura a la que entra el vaso, desde qué x sale y su radio. */
export const YEMA = { y: 0.12, x0: 1.6, radio: 0.06 } as const;
/** Número de osteoclastos y de osteoblastos que acompañan al frente del centro primario. */
export const N_OSTEOCLASTOS = 4;
export const N_OSTEOBLASTOS_CENTRO = 6;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_DOS_RUTAS = [
  'mesenquima',
  'condensacion',
  'diferenciacion',
  'crecimiento',
  'vascularizacion',
  'hueso_primario',
  'remodelado',
] as const;
export type FaseDosRutas = (typeof FASES_DOS_RUTAS)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 3 usa estos `t`. */
export const HITOS_DOS_RUTAS: Readonly<Record<FaseDosRutas, number>> = {
  mesenquima: 0,
  condensacion: 0.15,
  diferenciacion: 0.3,
  crecimiento: 0.45,
  vascularizacion: 0.6,
  hueso_primario: 0.8,
  remodelado: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_DOS_RUTAS[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_DOS_RUTAS: readonly number[] = FASES_DOS_RUTAS.slice(1).map((fase, i) =>
  mezclar(HITOS_DOS_RUTAS[FASES_DOS_RUTAS[i]!], HITOS_DOS_RUTAS[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseDosRutasEnTiempo(t: number): FaseDosRutas {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_DOS_RUTAS.length && x >= LIMITES_FASES_DOS_RUTAS[indice]!) indice++;
  return FASES_DOS_RUTAS[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave (comunes a los dos lados)
 * ----------------------------------------------------------------------------------------- */

/** Opacidad del mesénquima translúcido (relativa a su máximo): se retira cuando el hueso ya se sostiene solo. */
const PISTA_MESENQUIMA: readonly Fotograma[] = [
  [0.3, 1],
  [0.45, 0.35],
  [0.62, 0.35],
  [0.78, 0],
];
/** Las células dispersas se agrupan en una masa densa (0 dispersas, 1 condensadas). */
const PISTA_CONDENSACION: readonly Fotograma[] = [
  [0.03, 0],
  [0.15, 1],
];
/** De célula mesenquimal fusiforme y pálida a osteoblasto cúbico (izquierda) o condrocito redondo (derecha). */
const PISTA_DIFERENCIACION: readonly Fotograma[] = [
  [0.18, 0],
  [0.3, 1],
];

/* Lado intramembranoso */

/** Tamaño del primer islote de osteoide en el centro de la condensación; se funde con las espículas después. */
const PISTA_OSTEOIDE: readonly Fotograma[] = [
  [0.22, 0],
  [0.3, 1],
  [0.38, 1],
  [0.5, 0],
];
/** Progreso de la red de espículas (cada espícula aparece cuando el progreso pasa su `orden`). */
const PISTA_ESPICULAS: readonly Fotograma[] = [
  [0.33, 0],
  [0.45, 0.8],
  [0.6, 1],
];
/** Factor del radio de las espículas: se engruesan hasta ser trabéculas. */
const PISTA_GROSOR: readonly Fotograma[] = [
  [0.45, 1],
  [0.8, 1.6],
  [1, 1.9],
];
/** Los osteoblastos pasan de la masa condensada a los bordes de las espículas. */
const PISTA_EN_BORDE: readonly Fotograma[] = [
  [0.35, 0],
  [0.45, 1],
];
/** Algunos osteoblastos quedan atrapados en la matriz y se vuelven osteocitos. */
const PISTA_ATRAPADOS: readonly Fotograma[] = [
  [0.4, 0],
  [0.52, 1],
];
/** Los vasos entran desde los bordes entre las trabéculas. */
const PISTA_VASOS_IM: readonly Fotograma[] = [
  [0.5, 0],
  [0.6, 1],
];
/** Médula entre las trabéculas. */
const PISTA_MEDULA_IM: readonly Fotograma[] = [
  [0.51, 0],
  [0.6, 1],
];
/** Las trabéculas de la periferia se funden en dos tablas compactas. */
const PISTA_PLACAS: readonly Fotograma[] = [
  [0.68, 0],
  [0.8, 1],
];
/** Los osteoblastos se aplanan y se vuelven células de revestimiento. */
const PISTA_REVESTIMIENTO: readonly Fotograma[] = [
  [0.74, 0],
  [0.86, 1],
];
/** Hueso laminar: osteonas y laminillas en las tablas (izquierda) y en la cortical (derecha). */
const PISTA_LAMINAR: readonly Fotograma[] = [
  [0.86, 0],
  [1, 1],
];

/* Lado endocondral */

/** Escala del molde cartilaginoso (crece alrededor de la condensación). */
const PISTA_MOLDE: readonly Fotograma[] = [
  [0.19, 0],
  [0.3, 1],
];
/** Hipertrofia de los condrocitos centrales (0 a 1). */
const PISTA_HIPERTROFIA: readonly Fotograma[] = [
  [0.35, 0],
  [0.45, 1],
];
/** Medio largo (unidades) de la zona de cartílago calcificado, desde el centro hacia los extremos. */
const PISTA_CALCIFICADO: readonly Fotograma[] = [
  [0.36, 0],
  [0.45, 0.55],
  [0.6, 0.85],
  [0.8, 1.3],
  [1, 1.35],
];
/** Largo del collar perióstico (fracción de `COLLAR.medioLargo`). */
const PISTA_COLLAR: readonly Fotograma[] = [
  [0.37, 0],
  [0.45, 1],
];
/** Cortical que engruesa el collar al remodelarse (0 a 1). */
const PISTA_CORTICAL: readonly Fotograma[] = [
  [0.82, 0],
  [1, 1],
];
/** Avance de la yema perióstica: el vaso que perfora el collar (0 fuera, 1 en el centro). */
const PISTA_YEMA: readonly Fotograma[] = [
  [0.5, 0],
  [0.58, 1],
];
/** Medio largo (unidades) del centro primario: hasta dónde el cartílago ya fue sustituido por hueso. */
const PISTA_FRENTE: readonly Fotograma[] = [
  [0.55, 0],
  [0.6, 0.35],
  [0.8, 1.2],
  [1, 1.36],
];
/** Presencia de los osteoclastos y osteoblastos que acompañan al frente. */
const PISTA_CELULAS_FRENTE: readonly Fotograma[] = [
  [0.54, 0],
  [0.6, 1],
  [0.86, 1],
  [0.96, 0],
];
/** Escala de los centros secundarios en las epífisis. */
const PISTA_SECUNDARIO: readonly Fotograma[] = [
  [0.66, 0],
  [0.8, 0.6],
  [1, 1],
];
/** La cavidad medular sustituye a las trabéculas del centro de la diáfisis. */
const PISTA_CAVIDAD: readonly Fotograma[] = [
  [0.86, 0],
  [1, 1],
];

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface EstadoIntramembranosa {
  /** Tamaño del primer islote de osteoide (0 a 1). */
  osteoide: number;
  /** Progreso de la red de espículas (0 a 1). */
  espiculas: number;
  /** Factor del radio de las espículas (1 en adelante). */
  grosor: number;
  /** Osteoblastos en los bordes de las espículas (0 a 1). */
  enBorde: number;
  /** Osteocitos atrapados (0 a 1). */
  atrapados: number;
  vasos: number;
  medula: number;
  /** Tablas compactas (0 a 1). */
  placas: number;
  /** Osteoblastos convertidos en células de revestimiento (0 a 1). */
  revestimiento: number;
  laminar: number;
}

export interface EstadoEndocondral {
  /** Escala del molde cartilaginoso (0 a 1). */
  molde: number;
  hipertrofia: number;
  /** Medio largo de la zona calcificada (unidades; siempre ≥ `frente`). */
  calcificado: number;
  /** Largo del collar (fracción de `COLLAR.medioLargo`). */
  collar: number;
  cortical: number;
  yema: number;
  /** Medio largo del centro primario (unidades). */
  frente: number;
  /** Presencia de las células del frente (osteoclastos y osteoblastos). */
  celulasFrente: number;
  /** Escala de los centros secundarios (0 a 1). */
  secundario: number;
  cavidad: number;
  laminar: number;
}

export interface EstadoDosRutas {
  fase: FaseDosRutas;
  /** Opacidad relativa del mesénquima translúcido (0 a 1). */
  mesenquima: number;
  condensacion: number;
  diferenciacion: number;
  intramembranosa: EstadoIntramembranosa;
  endocondral: EstadoEndocondral;
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoDosRutas(t: number): EstadoDosRutas {
  const x = acotar(t);
  const frente = evaluarPista(PISTA_FRENTE, x);
  return {
    fase: faseDosRutasEnTiempo(x),
    mesenquima: evaluarPista(PISTA_MESENQUIMA, x),
    condensacion: evaluarPista(PISTA_CONDENSACION, x),
    diferenciacion: evaluarPista(PISTA_DIFERENCIACION, x),
    intramembranosa: {
      osteoide: evaluarPista(PISTA_OSTEOIDE, x),
      espiculas: evaluarPista(PISTA_ESPICULAS, x),
      grosor: evaluarPista(PISTA_GROSOR, x),
      enBorde: evaluarPista(PISTA_EN_BORDE, x),
      atrapados: evaluarPista(PISTA_ATRAPADOS, x),
      vasos: evaluarPista(PISTA_VASOS_IM, x),
      medula: evaluarPista(PISTA_MEDULA_IM, x),
      placas: evaluarPista(PISTA_PLACAS, x),
      revestimiento: evaluarPista(PISTA_REVESTIMIENTO, x),
      laminar: evaluarPista(PISTA_LAMINAR, x),
    },
    endocondral: {
      molde: evaluarPista(PISTA_MOLDE, x),
      hipertrofia: evaluarPista(PISTA_HIPERTROFIA, x),
      calcificado: Math.max(frente, evaluarPista(PISTA_CALCIFICADO, x)),
      collar: evaluarPista(PISTA_COLLAR, x),
      cortical: evaluarPista(PISTA_CORTICAL, x),
      yema: evaluarPista(PISTA_YEMA, x),
      frente,
      celulasFrente: evaluarPista(PISTA_CELULAS_FRENTE, x),
      secundario: evaluarPista(PISTA_SECUNDARIO, x),
      cavidad: evaluarPista(PISTA_CAVIDAD, x),
      laminar: evaluarPista(PISTA_LAMINAR, x),
    },
  };
}
