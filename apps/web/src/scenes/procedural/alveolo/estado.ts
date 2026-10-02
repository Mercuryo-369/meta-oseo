/**
 * Estado de la escena "el alvéolo tras la extracción y el reborde con los años" como FUNCIÓN PURA del tiempo `t`
 * (0 a 1). Sin three, sin Vue y sin estado acumulado: `estadoAlveolo(t)` da siempre lo mismo para el mismo `t`,
 * así que adelantar, atrasar y saltar de una fase a otra es exacto y reversible. Las mallas (`mallas.ts`) y la
 * escena (`EscenaAlveolo.vue`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * Aquí `t` SÍ es tiempo, aunque no proporcional: de la extracción de un premolar (horas, días, semanas, meses) a
 * los años siguientes. El escenario es el mismo segmento de cuerpo mandibular de la escena `hueso_alveolar`
 * (módulo 1), ya cortado en sentido vestibulolingual por el eje de la raíz: la mitad que queda ocupa x de
 * −LARGO_SEGMENTO/2 a 0 y la cara de corte mira a +X. Primero el diente en su alvéolo; sale hacia arriba y queda el
 * alvéolo vacío con restos de ligamento y sangrado; se llena de coágulo; el tejido de granulación lo sustituye
 * desde las paredes y el fondo mientras la encía cierra por arriba; crece hueso entretejido y el hueso alveolar
 * propio (fasciculado) de las paredes se reabsorbe; el relleno madura a hueso laminar bajo una cortical y la encía;
 * después el reborde pierde altura y grosor, más por vestibular (se desplaza hacia lingual), y el conducto
 * mandibular y el foramen mentoniano quedan cerca de la superficie.
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Ocho fases con un hito cada una (`HITOS_ALVEOLO`, el instante que mejor la muestra). Una fase abarca desde el
 * punto medio con el hito anterior hasta el punto medio con el siguiente (`LIMITES_FASES_ALVEOLO`), la misma regla
 * que usa la interfaz para saber qué texto mostrar (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Las de la escena `hueso_alveolar` (`../alveolar/estado.ts`): el cuerpo mide 4,5 unidades de alto y unas 2,9 de
 * ancho; el ligamento y la lámina van más gruesos de lo real para que se vean en un teléfono.
 */
import { acotar, evaluarPista, mezclar } from '../interpolacion';
import type { Fotograma } from '../interpolacion';
import { GROSOR_CORTICAL, Y_CRESTA } from '../alveolar/estado';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas propias (unidades de escena). Eje X = mesiodistal, Y = vertical, Z = vestibulolingual
 * (+Z vestibular). El resto de medidas (cuerpo, raíz, conducto...) se importan de `../alveolar/estado`.
 * ----------------------------------------------------------------------------------------- */

/** Altura de la cresta al final (años después): a la altura del ápice de la raíz que había. */
export const Y_CRESTA_FINAL = -0.4;
/** Cuánto se estrecha cada tabla en la cresta con la pérdida completa (fracción del semiancho). */
export const ESTRECHAMIENTO = { vestibular: 1, lingual: 0.55 } as const;
/** Exponente con que la pérdida se concentra cerca de la cresta (la base del cuerpo no cambia). */
export const EXPONENTE_ESTRECHAMIENTO = 3;
/** Cuánto se desplaza la cresta hacia lingual (−Z) con la pérdida completa. */
export const DESPLAZAMIENTO_LINGUAL = 0.2;
/** Radio con que se redondea la cresta al principio y cuánto crece con la pérdida (filo de cuchillo). */
export const RADIO_CRESTA = 0.16;
export const REDONDEO_EXTRA = 0.55;
/** Semiancho mínimo de cualquier contorno (evita polígonos degenerados en la cresta en filo). */
export const SEMIANCHO_MINIMO = 0.01;
/** Grosor de la cortical en la cresta (la del reborde cicatrizado). */
export const GROSOR_CRESTA = GROSOR_CORTICAL.cresta;
/** Encía: grosor y cuánto baja por las caras del cuerpo desde la cresta. */
export const ENCIA = { grosor: 0.15, caida: 0.55, solape: 0.02 } as const;
/** Cuánto sube el diente al extraerse (unidades). */
export const ELEVACION_DIENTE = 3.2;
/** Foramen mentoniano: altura, posición a lo largo del segmento y radio. Va sobre la cara vestibular. */
export const FORAMEN = { y: -0.85, x: -1.7, radio: 0.12 } as const;
/** Número de trabéculas instanciadas (incluye las del antiguo alvéolo, que aparecen al madurar). */
export const N_TRABECULAS_ALVEOLO = 150;
/** Osteoclastos sobre la superficie del reborde durante su reabsorción. */
export const N_OSTEOCLASTOS_REBORDE = 9;
/** Profundidad (x, negativa) de la cara de la médula respecto de la cara de corte. */
export const PROFUNDIDAD_MEDULA = 0.16;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_ALVEOLO = [
  'diente',
  'extraccion',
  'coagulo',
  'granulacion',
  'hueso_entretejido',
  'maduracion',
  'reabsorcion_reborde',
  'reborde_final',
] as const;
export type FaseAlveolo = (typeof FASES_ALVEOLO)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 6 usa estos `t`. */
export const HITOS_ALVEOLO: Readonly<Record<FaseAlveolo, number>> = {
  diente: 0,
  extraccion: 0.14,
  coagulo: 0.28,
  granulacion: 0.42,
  hueso_entretejido: 0.56,
  maduracion: 0.7,
  reabsorcion_reborde: 0.85,
  reborde_final: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_ALVEOLO[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_ALVEOLO: readonly number[] = FASES_ALVEOLO.slice(1).map((fase, i) =>
  mezclar(HITOS_ALVEOLO[FASES_ALVEOLO[i]!], HITOS_ALVEOLO[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseAlveoloEnTiempo(t: number): FaseAlveolo {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_ALVEOLO.length && x >= LIMITES_FASES_ALVEOLO[indice]!) indice++;
  return FASES_ALVEOLO[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

/** El diente sube y se desvanece al extraerse; al hito de la extracción ya no está. */
const PISTA_ELEVACION_DIENTE: readonly Fotograma[] = [
  [0.06, 0],
  [0.14, 1],
];
const PISTA_OPACIDAD_DIENTE: readonly Fotograma[] = [
  [0.09, 1],
  [0.14, 0],
];
/** El ligamento se rompe con la extracción: quedan restos en las paredes que desaparecen con el coágulo. */
const PISTA_LIGAMENTO: readonly Fotograma[] = [
  [0.08, 1],
  [0.14, 0.45],
  [0.26, 0],
];
/** Sangrado de las paredes del alvéolo vacío. */
const PISTA_SANGRADO: readonly Fotograma[] = [
  [0.08, 0],
  [0.14, 1],
  [0.2, 1],
  [0.27, 0],
];
/** El coágulo llena el alvéolo desde el fondo (horas) y luego lo sustituye la granulación desde las paredes. */
const PISTA_COAGULO_NIVEL: readonly Fotograma[] = [
  [0.15, 0],
  [0.28, 1],
];
const PISTA_COAGULO_ENCOGIDO: readonly Fotograma[] = [
  [0.32, 0],
  [0.45, 1],
];
/** El tejido de granulación aparece detrás del coágulo y después lo sustituye el hueso entretejido. */
const PISTA_GRANULACION: readonly Fotograma[] = [
  [0.3, 0],
  [0.36, 1],
];
const PISTA_GRANULACION_ENCOGIDO: readonly Fotograma[] = [
  [0.46, 0],
  [0.58, 1],
];
/** Vasos del tejido de granulación. */
const PISTA_VASOS: readonly Fotograma[] = [
  [0.34, 0],
  [0.42, 1],
  [0.5, 1],
  [0.58, 0],
];
/** El epitelio de la encía cierra el alvéolo por arriba (días). */
const PISTA_CIERRE_ENCIA: readonly Fotograma[] = [
  [0.36, 0],
  [0.54, 1],
];
/** Hueso nuevo: aparece entretejido detrás de la granulación, madura a laminar y se funde con el trabecular. */
const PISTA_HUESO_NUEVO: readonly Fotograma[] = [
  [0.42, 0],
  [0.46, 1],
];
const PISTA_MADURACION: readonly Fotograma[] = [
  [0.6, 0],
  [0.7, 1],
];
const PISTA_FUNDIDO: readonly Fotograma[] = [
  [0.62, 0],
  [0.7, 1],
];
/** El hueso alveolar propio (fasciculado) de las paredes se reabsorbe con el hueso entretejido. */
const PISTA_LAMINA_RESORBIDA: readonly Fotograma[] = [
  [0.48, 0],
  [0.6, 1],
];
const PISTA_OSTEOCLASTOS_ALVEOLO: readonly Fotograma[] = [
  [0.47, 0],
  [0.53, 1],
  [0.6, 1],
  [0.66, 0],
];
/** Trabéculas del antiguo alvéolo: aparecen al madurar, antes de que se funda la placa de hueso nuevo. */
const PISTA_TRABECULAS_ALVEOLO: readonly Fotograma[] = [
  [0.52, 0],
  [0.62, 1],
];
/** Tapa cortical sobre el alvéolo cicatrizado (después la cortical del reborde la sustituye). */
const PISTA_TAPA: readonly Fotograma[] = [
  [0.62, 0],
  [0.7, 1],
  [0.74, 1],
  [0.82, 0],
];
const PISTA_OSTEOCLASTOS_REBORDE: readonly Fotograma[] = [
  [0.76, 0],
  [0.85, 1],
  [0.9, 1],
  [0.97, 0],
];
/** Pérdida del reborde: poca en los primeros meses, la mayor parte en el primer año, el resto despacio. */
const PISTA_REBORDE: readonly Fotograma[] = [
  [0.56, 0],
  [0.7, 0.06],
  [0.85, 0.6],
  [1, 1],
];

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface EstadoAlveolo {
  fase: FaseAlveolo;
  /** El diente: cuánto ha subido (0 en su alvéolo, 1 fuera) y su opacidad. */
  diente: { elevacion: number; opacidad: number };
  /** Opacidad del ligamento periodontal (1 íntegro, 0 desaparecido). */
  ligamento: number;
  /** Sangrado de las paredes (0 a 1). */
  sangrado: number;
  /** Coágulo: nivel de llenado desde el fondo y cuánto lo ha sustituido la granulación desde las paredes. */
  coagulo: { nivel: number; encogido: number };
  /** Tejido de granulación: presencia y cuánto lo ha sustituido el hueso entretejido. */
  granulacion: { presencia: number; encogido: number };
  /** Vasos del tejido de granulación (0 a 1). */
  vasos: number;
  /** Cierre del alvéolo por la encía (0 abierto alrededor del diente, 1 cerrado). */
  cierreEncia: number;
  /** Hueso nuevo del alvéolo: presencia, maduración (entretejido → laminar) y fundido con el trabecular. */
  huesoNuevo: { presencia: number; maduracion: number; fundido: number };
  /** Hueso alveolar propio de las paredes (0 íntegro, 1 reabsorbido). */
  laminaResorbida: number;
  /** Osteoclastos sobre las paredes del alvéolo y sobre la superficie del reborde (0 a 1). */
  osteoclastos: { alveolo: number; reborde: number };
  /** Trabéculas del antiguo alvéolo (0 ocultas, 1 a la vista). */
  trabeculasAlveolo: number;
  /** Tapa cortical sobre el alvéolo cicatrizado (0 a 1). */
  tapaCortical: number;
  /** Pérdida del reborde (0 intacto, 1 la de años después). */
  reborde: number;
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoAlveolo(t: number): EstadoAlveolo {
  const x = acotar(t);
  return {
    fase: faseAlveoloEnTiempo(x),
    diente: {
      elevacion: evaluarPista(PISTA_ELEVACION_DIENTE, x),
      opacidad: evaluarPista(PISTA_OPACIDAD_DIENTE, x),
    },
    ligamento: evaluarPista(PISTA_LIGAMENTO, x),
    sangrado: evaluarPista(PISTA_SANGRADO, x),
    coagulo: {
      nivel: evaluarPista(PISTA_COAGULO_NIVEL, x),
      encogido: evaluarPista(PISTA_COAGULO_ENCOGIDO, x),
    },
    granulacion: {
      presencia: evaluarPista(PISTA_GRANULACION, x),
      encogido: evaluarPista(PISTA_GRANULACION_ENCOGIDO, x),
    },
    vasos: evaluarPista(PISTA_VASOS, x),
    cierreEncia: evaluarPista(PISTA_CIERRE_ENCIA, x),
    huesoNuevo: {
      presencia: evaluarPista(PISTA_HUESO_NUEVO, x),
      maduracion: evaluarPista(PISTA_MADURACION, x),
      fundido: evaluarPista(PISTA_FUNDIDO, x),
    },
    laminaResorbida: evaluarPista(PISTA_LAMINA_RESORBIDA, x),
    osteoclastos: {
      alveolo: evaluarPista(PISTA_OSTEOCLASTOS_ALVEOLO, x),
      reborde: evaluarPista(PISTA_OSTEOCLASTOS_REBORDE, x),
    },
    trabeculasAlveolo: evaluarPista(PISTA_TRABECULAS_ALVEOLO, x),
    tapaCortical: evaluarPista(PISTA_TAPA, x),
    reborde: evaluarPista(PISTA_REBORDE, x),
  };
}

/** Altura de la cresta con una pérdida `reborde` (0 a 1). */
export function yCresta(reborde: number): number {
  return mezclar(Y_CRESTA, Y_CRESTA_FINAL, acotar(reborde));
}
