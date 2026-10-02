/**
 * Estado de la escena "ciclo de remodelado de una BMU cortical" como FUNCIÓN PURA del tiempo `t` (0 a 1).
 * Sin three, sin Vue y sin estado acumulado: `estadoBmu(t)` da siempre lo mismo para el mismo `t`, así
 * que adelantar, atrasar y saltar de una fase a otra es exacto y reversible. La geometría (`geometria.ts`)
 * y la escena (`EscenaBmu.vue`) solo DIBUJAN este estado.
 *
 * ── El modelo ─────────────────────────────────────────────────────────────────────────────────
 * Un fragmento de hueso cortical (cilindro de radio `R_EXTERIOR`) recorrido a lo largo del eje X por un
 * conducto de Havers estrecho (`R_CANAL`) con su capilar. Unidades: 1 unidad = 100 µm, así que el túnel de
 * resorción (`R_CAVIDAD` = 1,05) mide unos 200 µm de diámetro, como dice el texto del módulo. La BMU
 * avanza de derecha a izquierda (-X), igual que en el dibujo `m5_bmu_cortical_longitudinal.svg`.
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_BMU`, el instante más representativo de la fase). Una fase
 * abarca desde el punto medio con el hito anterior hasta el punto medio con el siguiente
 * (`LIMITES_FASES_BMU`), que es la misma regla que usa la interfaz para saber qué texto mostrar
 * (`pasoDeTiempo` en `lineaTiempo.ts`). La escala de tiempo es PEDAGÓGICA, no proporcional: la formación
 * dura en realidad varios meses y la resorción unas semanas.
 *
 * ── Fotogramas clave ──────────────────────────────────────────────────────────────────────────
 * Cada magnitud es una pista de fotogramas clave (`interpolacion.ts`): dentro de un tramo entre dos
 * valores distintos es monótona, y entre tramos es continua. Las pruebas (`estado.test.ts`) comprueban
 * monotonía y continuidad, los valores en cada hito, t = 0 y t = 1 y la reversibilidad.
 */
import { acotar, evaluarPista, fraccion, mezclar, suave } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena; 1 unidad = 100 µm)
 * ----------------------------------------------------------------------------------------- */

/** Largo del fragmento de hueso: x va de -LARGO / 2 a +LARGO / 2. */
export const LARGO = 9.6;
/** Radio del cilindro de hueso cortical circundante. */
export const R_EXTERIOR = 2.0;
/** Radio del conducto de Havers previo (unos 30 µm). */
export const R_CANAL = 0.3;
/** Radio del túnel excavado por los osteoclastos (unos 100 µm: el túnel mide ~200 µm de diámetro). */
export const R_CAVIDAD = 1.05;
/** Radio del conducto de Havers de la osteona nueva (el túnel queda estrechado). */
export const R_LUMEN_FINAL = 0.3;
/** Radio del capilar que recorre el conducto. */
export const R_CAPILAR = 0.09;
/**
 * Donde está el extremo del cono de corte al empezar la resorción: el extremo derecho del fragmento. La
 * BMU entra por ahí (el túnel sigue más allá del fragmento, hacia la derecha) y avanza hacia la izquierda;
 * la tapa derecha muestra así, en corte transversal, las capas concéntricas que se depositan.
 */
export const X_INICIO = LARGO / 2;
/** Donde se ve a los osteoclastos (ya activados) antes de que la resorción avance. */
export const X_ACTIVACION = LARGO / 2 - 0.5;
/** Posición del extremo del cono de corte al terminar la resorción (a la izquierda). */
export const X_FRENTE_FINAL = -3.3;
/** Largo del cono de corte: del extremo (radio del canal) al radio pleno de la cavidad. */
export const LARGO_CONO = 2.1;

export const N_OSTEOCLASTOS = 4;
export const N_PRECURSORES = 8;
export const N_OSTEOCITOS = 12;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_BMU = [
  'quiescencia',
  'activacion',
  'resorcion',
  'inversion',
  'formacion',
  'mineralizacion',
  'reposo',
] as const;
export type FaseBmu = (typeof FASES_BMU)[number];

/**
 * Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 5
 * (`m5_bmu_3d_tiempo`) usa estos mismos `t` en su línea de tiempo; una prueba lo comprueba.
 */
export const HITOS_BMU: Readonly<Record<FaseBmu, number>> = {
  quiescencia: 0,
  activacion: 0.14,
  resorcion: 0.32,
  inversion: 0.5,
  formacion: 0.66,
  mineralizacion: 0.84,
  reposo: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_BMU[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_BMU: readonly number[] = FASES_BMU.slice(1).map((fase, i) =>
  mezclar(HITOS_BMU[FASES_BMU[i]!], HITOS_BMU[fase], 0.5),
);

/** Fase en la que cae `t` y qué fracción (0 a 1) de ella ha transcurrido. */
export function faseEnTiempo(t: number): { fase: FaseBmu; progreso: number } {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_BMU.length && x >= LIMITES_FASES_BMU[indice]!) indice++;
  const inicio = indice === 0 ? 0 : LIMITES_FASES_BMU[indice - 1]!;
  const fin = indice === LIMITES_FASES_BMU.length ? 1 : LIMITES_FASES_BMU[indice]!;
  return { fase: FASES_BMU[indice]!, progreso: fraccion(x, inicio, fin) };
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

const [L1, L2, L3, L4, L5, L6] = LIMITES_FASES_BMU as [
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Cobertura de células de revestimiento sobre la pared del conducto (0 a 1). */
const PISTA_REVESTIMIENTO: readonly Fotograma[] = [
  [L1 + 0.005, 1],
  [L1 + 0.09, 0],
  [L6 - 0.03, 0],
  [1, 1],
];
/** Llegada de los precursores de osteoclastos desde el capilar (0 a 1). */
const PISTA_LLEGADA: readonly Fotograma[] = [
  [L1 + 0.015, 0],
  [L1 + 0.085, 1],
];
/** Fusión de los precursores en osteoclastos multinucleados (0 a 1). */
const PISTA_FUSION: readonly Fotograma[] = [
  [L1 + 0.075, 0],
  [L2 + 0.005, 1],
];
/** Tamaño de los osteoclastos: crecen al fusionarse y se encogen al morir (apoptosis) en la inversión. */
const PISTA_ESCALA_OSTEOCLASTOS: readonly Fotograma[] = [
  [L1 + 0.09, 0],
  [L2 + 0.01, 1],
  [L3 - 0.01, 1],
  [L3 + 0.07, 0],
];
/** Posición del extremo del cono de corte (x). */
const PISTA_FRENTE: readonly Fotograma[] = [
  [L2 - 0.005, X_INICIO],
  [L3 - 0.005, X_FRENTE_FINAL],
];
/** Rugosidad festoneada (lagunas de Howship) de la pared excavada (0 a 1). */
const PISTA_FESTONEADO: readonly Fotograma[] = [
  [L2, 0],
  [L3, 1],
];
/** Células de inversión mononucleares sobre la pared festoneada (0 a 1). */
const PISTA_INVERSION: readonly Fotograma[] = [
  [L3, 0],
  [HITOS_BMU.inversion, 1],
  [L4 + 0.02, 1],
  [L4 + 0.09, 0],
];
/** Línea de cemento (0 a 1: aparece en la inversión). */
const PISTA_CEMENTO: readonly Fotograma[] = [
  [L3 + 0.03, 0],
  [L4 - 0.01, 1],
];
/** Cobertura de osteoblastos sobre el osteoide (0 a 1). */
const PISTA_OSTEOBLASTOS: readonly Fotograma[] = [
  [L4 - 0.02, 0],
  [L4 + 0.05, 1],
  [L5 + 0.03, 1],
  [L6 - 0.02, 0.12],
];
/** Avance de la formación (0 a 1): el osteoide rellena el túnel en capas concéntricas. */
const PISTA_FORMACION: readonly Fotograma[] = [
  [L4 + 0.01, 0],
  [L5, 1],
];
/** Fracción mineralizada del osteoide nuevo (0 a 1). */
const PISTA_MINERAL: readonly Fotograma[] = [
  [L5 + 0.01, 0],
  [L6, 1],
];
/** Osteocitos incluidos en la matriz (0 a N_OSTEOCITOS, continuo; el conteo entero es su parte entera). */
const PISTA_OSTEOCITOS: readonly Fotograma[] = [
  [L5 + 0.02, 0],
  [L6 - 0.02, N_OSTEOCITOS],
];

/**
 * Cuánto se retrasa el cierre a lo largo del túnel: 0 = todo se rellena a la vez; con valores mayores el
 * relleno empieza por la cabecera (derecha) y avanza detrás de la BMU, formando el cono de cierre.
 */
export const RETRASO_CIERRE = 0.9;

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface OsteoclastoBmu {
  /** Posición (x) del centro de la célula sobre el flanco del cono de corte. */
  x: number;
  /** Posición angular entre 0 y 1 dentro del sector visible de la pared (la escena la traduce a ángulo). */
  u: number;
  /** Tamaño relativo (0 a 1) de esta célula. */
  escala: number;
}

export interface EstadoBmu {
  t: number;
  fase: FaseBmu;
  /** Fracción (0 a 1) de la fase actual que ha transcurrido. */
  progresoFase: number;

  /** Extremo del cono de corte (x). Vale `X_INICIO` hasta que empieza la resorción. */
  frenteX: number;
  /** Longitud excavada del túnel (0 al inicio, hasta `X_INICIO - X_FRENTE_FINAL`). */
  longitudTunel: number;
  /** Radio máximo del túnel de resorción (constante; el radio real varía con x, ver `radioExcavado`). */
  radioTunel: number;
  /** Amplitud de la rugosidad festoneada de la pared excavada (0 a 1). */
  festoneado: number;

  /** Cobertura (0 a 1) de células de revestimiento sobre la pared del conducto. */
  revestimiento: number;
  precursores: {
    /** Cuántos precursores hay dibujados (0 o `N_PRECURSORES`). */
    cantidad: number;
    /** Llegada desde el capilar (0 a 1). */
    llegada: number;
    /** Fusión en osteoclastos (0 a 1). */
    fusion: number;
  };
  osteoclastos: {
    /** Número de osteoclastos presentes (0 a `N_OSTEOCLASTOS`). */
    cantidad: number;
    /** Tamaño común (0 a 1): crece al fusionarse y se encoge al morir. */
    escala: number;
    /** Uno por célula, en el orden de las células. */
    celulas: readonly OsteoclastoBmu[];
  };
  /** Cobertura (0 a 1) de células de inversión sobre la pared. */
  inversion: number;
  /** Línea de cemento (0 a 1). */
  lineaCemento: number;
  osteoblastos: {
    /** Cobertura (0 a 1) de osteoblastos sobre la superficie del osteoide. */
    cobertura: number;
  };
  /** Avance (0 a 1) de la formación de osteoide. */
  avanceFormacion: number;
  /** Grosor máximo del osteoide depositado (en la parte más ancha del túnel). */
  espesorOsteoide: number;
  /** Fracción (0 a 1) del osteoide ya mineralizado. */
  fraccionMineralizada: number;
  osteocitos: {
    /** Número de osteocitos ya incluidos en la matriz. */
    cantidad: number;
    /** Valor continuo (0 a `N_OSTEOCITOS`), para que aparezcan de forma gradual. */
    progreso: number;
  };
  /** Radio del conducto de Havers en la parte más ancha del túnel (baja de `R_CAVIDAD` a `R_LUMEN_FINAL`). */
  radioLumen: number;
}

/** Desfases y reparto angular de los osteoclastos (deterministas, no aleatorios). */
const DESFASE_X_OSTEOCLASTO = [-0.3, 0.15, 0.3, -0.1] as const;
const U_OSTEOCLASTO = [0.16, 0.39, 0.61, 0.84] as const;
/** Cuánto sobre el flanco del cono se coloca el centro de los osteoclastos. */
const POSICION_EN_CONO = 0.4;

/**
 * Estado completo en el tiempo `t`. `t` se acota a [0, 1]. Función pura: no lee nada externo.
 */
export function estadoBmu(tEntrada: number): EstadoBmu {
  const t = acotar(Number.isFinite(tEntrada) ? tEntrada : 0);
  const { fase, progreso } = faseEnTiempo(t);

  const frenteX = evaluarPista(PISTA_FRENTE, t);
  const escalaOc = evaluarPista(PISTA_ESCALA_OSTEOCLASTOS, t);
  const llegada = evaluarPista(PISTA_LLEGADA, t);
  const fusion = evaluarPista(PISTA_FUSION, t);
  const formacion = evaluarPista(PISTA_FORMACION, t);
  const progresoOsteocitos = evaluarPista(PISTA_OSTEOCITOS, t);
  const cantidadOc = escalaOc > 0 ? N_OSTEOCLASTOS : 0;

  const celulas: OsteoclastoBmu[] = [];
  if (cantidadOc > 0) {
    for (let k = 0; k < N_OSTEOCLASTOS; k++) {
      // Se colocan sobre el flanco del cono (sin salirse de la cabecera del túnel) y "vibran" un poco
      // mientras excavan: el movimiento sale de `t`, no de un reloj, así que es reversible.
      const vibracion = fraccion(t, L2, L3) * (1 - fraccion(t, L3, L3 + 0.05)) * 0.05;
      const deseada =
        frenteX +
        LARGO_CONO * POSICION_EN_CONO +
        DESFASE_X_OSTEOCLASTO[k]! +
        vibracion * Math.sin(2 * Math.PI * (38 * t + k / N_OSTEOCLASTOS));
      celulas.push({
        x: Math.min(deseada, X_ACTIVACION),
        u: U_OSTEOCLASTO[k]!,
        // Cada célula se completa un poco antes o después que la vecina para que no crezcan al unísono.
        escala: acotar(escalaOc * 1.15 - k * 0.04),
      });
    }
  }

  return {
    t,
    fase,
    progresoFase: progreso,
    frenteX,
    longitudTunel: X_INICIO - frenteX,
    radioTunel: R_CAVIDAD,
    festoneado: evaluarPista(PISTA_FESTONEADO, t),
    revestimiento: evaluarPista(PISTA_REVESTIMIENTO, t),
    precursores: {
      cantidad: llegada > 0 && fusion < 1 ? N_PRECURSORES : 0,
      llegada,
      fusion,
    },
    osteoclastos: { cantidad: cantidadOc, escala: escalaOc, celulas },
    inversion: evaluarPista(PISTA_INVERSION, t),
    lineaCemento: evaluarPista(PISTA_CEMENTO, t),
    osteoblastos: { cobertura: evaluarPista(PISTA_OSTEOBLASTOS, t) },
    avanceFormacion: formacion,
    espesorOsteoide: (R_CAVIDAD - R_LUMEN_FINAL) * formacion,
    fraccionMineralizada: evaluarPista(PISTA_MINERAL, t),
    osteocitos: { cantidad: Math.floor(progresoOsteocitos + 1e-9), progreso: progresoOsteocitos },
    radioLumen: R_CAVIDAD - (R_CAVIDAD - R_LUMEN_FINAL) * formacion,
  };
}

/* -------------------------------------------------------------------------------------------
 * Perfil del túnel a lo largo de x (lo usa la geometría y lo prueban las pruebas)
 * ----------------------------------------------------------------------------------------- */

/**
 * Radio de la cavidad excavada en `x`: `R_CANAL` donde aún no se ha excavado (a la izquierda del cono) y
 * `R_CAVIDAD` en el cuerpo del túnel; entre ambos, el CONO DE CORTE (lineal: un cono con la punta algo
 * roma). Depende solo de `frenteX`, así que el túnel crece con la resorción y queda fijo después.
 */
export function radioExcavado(x: number, estado: Pick<EstadoBmu, 'frenteX'>): number {
  const delante = acotar((x - estado.frenteX) / LARGO_CONO);
  return R_CANAL + (R_CAVIDAD - R_CANAL) * Math.pow(delante, 0.85);
}

/** Posición (0 a 1) a lo largo del túnel: 0 en el extremo derecho (por donde entró la BMU), 1 en el extremo del cono. */
export function posicionEnTunel(x: number): number {
  return fraccion(X_INICIO - x, 0, X_INICIO - X_FRENTE_FINAL);
}

/**
 * Avance local (0 a 1) del relleno de osteoide en `x`. Con `RETRASO_CIERRE` > 0 el relleno llega antes a la
 * cabecera y después al extremo, de modo que en mitad de la formación el conducto tiene forma de cono
 * (el CONO DE CIERRE, que sigue a la BMU).
 */
export function avanceLocalFormacion(x: number, avanceFormacion: number): number {
  const lag = RETRASO_CIERRE;
  return suave(acotar(avanceFormacion * (1 + lag) - lag * posicionEnTunel(x)));
}

/** Grosor del osteoide depositado en `x` (0 donde no hay cavidad más ancha que el conducto final). */
export function espesorEn(
  x: number,
  estado: Pick<EstadoBmu, 'frenteX' | 'avanceFormacion'>,
): number {
  const maximo = Math.max(0, radioExcavado(x, estado) - R_LUMEN_FINAL);
  return maximo * avanceLocalFormacion(x, estado.avanceFormacion);
}

/** Radio libre del conducto (la luz) en `x`: cavidad menos osteoide. */
export function radioLumenEn(
  x: number,
  estado: Pick<EstadoBmu, 'frenteX' | 'avanceFormacion'>,
): number {
  return radioExcavado(x, estado) - espesorEn(x, estado);
}
