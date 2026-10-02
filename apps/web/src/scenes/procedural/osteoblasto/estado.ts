/**
 * Estado de la escena "el osteoblasto activo, de precursor a osteocito" como FUNCIÓN PURA del tiempo `t` (0 a 1).
 * Sin three, sin Vue y sin estado acumulado: `estadoOsteoblasto(t)` da siempre lo mismo para el mismo `t`, así
 * que adelantar, atrasar y saltar de una fase a otra es exacto y reversible. Las mallas (`mallas.ts`) y la
 * escena (`EscenaOsteoblasto.vue`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * Aquí `t` SÍ es tiempo: la vida de una célula de la línea osteoblástica sobre una superficie de hueso. Una
 * célula osteoprogenitora fusiforme se diferencia en osteoblasto cúbico, forma fila con sus vecinas, muestra sus
 * orgánulos, secreta osteoide, ve cómo el osteoide se mineraliza bajo ella y, al terminar, cada célula de la fila
 * sigue uno de los tres destinos (osteocito, célula de revestimiento o apoptosis). La escala de tiempo es
 * pedagógica, no proporcional (la diferenciación dura días y la formación de hueso, meses).
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_OSTEOBLASTO`, el instante que mejor la muestra). Una fase abarca desde
 * el punto medio con el hito anterior hasta el punto medio con el siguiente (`LIMITES_FASES_OSTEOBLASTO`), la
 * misma regla que usa la interfaz para saber qué texto mostrar (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Esquemáticas: la célula mide alrededor de 1 unidad y el bloque de hueso, 8. Ni la célula ni sus orgánulos
 * guardan proporción real (el osteoblasto real mide unos 20 µm y su retículo, décimas de micra); el contenido lo
 * dice en el texto.
 */
import { acotar, evaluarPista, fraccion, mezclar, suave } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena). Ejes: X a lo largo de la superficie, Y hacia arriba (lejos del
 * hueso), Z hacia la cámara. La superficie del hueso viejo está en y = 0 y su cara de corte mira a +Z.
 * ----------------------------------------------------------------------------------------- */

/** Bloque de hueso mineralizado viejo: ancho (X), alto (Y, hacia abajo desde y = 0) y fondo (Z). */
export const BLOQUE = { ancho: 8, alto: 1.5, fondo: 3 } as const;
/** Cara de corte del bloque (plano z = constante) que mira a la cámara. */
export const Z_CARA = BLOQUE.fondo / 2;
/** Número de células de la fila (la del centro es la que se sigue de cerca). */
export const N_CELULAS = 5;
/** Índice de la célula protagonista (la que primero llega y cuyos orgánulos se ven). */
export const CELULA_FOCO = 2;
/** Separación entre los centros de las células de la fila. */
export const PASO_CELULAS = 1.2;
/** Centro (Z) de las células: pegadas a la cara de corte para que la sección las muestre. */
export const Z_CELULAS = 0.92;
/** Semiejes (X, Y, Z) de cada forma de la célula. */
export const FORMA = {
  /** Célula osteoprogenitora: fusiforme y aplanada. */
  fusiforme: [0.95, 0.15, 0.42] as const,
  /** Osteoblasto activo: cúbico o poligonal, alto. */
  cubico: [0.52, 0.55, 0.5] as const,
  /** Célula de revestimiento: plana y alargada. */
  revestimiento: [0.6, 0.075, 0.42] as const,
  /** Osteocito ya atrapado (cuerpo pequeño; las prolongaciones van aparte). */
  osteocito: [0.28, 0.2, 0.22] as const,
} as const;
/** Capilar junto a la fila, paralelo a la superficie (X): radio, holgura sobre la superficie y posición Z. */
export const CAPILAR = { radio: 0.17, sobreSuperficie: 0.05, z: -0.7 } as const;
/** Índices de la fila según su destino en la fase `destino`. */
export const DESTINOS = { osteocito: 1, revestimiento: 2, apoptosis: 3 } as const;
/** Centro del corte de la laguna del osteocito en la cara de corte (X, Y): dentro del hueso nuevo. */
export const LAGUNA = {
  x: (DESTINOS.osteocito - CELULA_FOCO) * PASO_CELULAS,
  y: 0.42,
  rx: 0.34,
  ry: 0.22,
} as const;
/** Número de vesículas de secreción que viajan dentro de la célula protagonista. */
export const N_VESICULAS = 12;
/** Número de fragmentos de la célula apoptótica. */
export const N_FRAGMENTOS = 8;
/** Vueltas completas del ciclo de las vesículas a lo largo de toda la línea de tiempo. */
export const CICLOS_VESICULAS = 9;

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_OSTEOBLASTO = [
  'precursor',
  'diferenciacion',
  'organulos',
  'secrecion',
  'mineralizacion',
  'destino',
  'reposo',
] as const;
export type FaseOsteoblasto = (typeof FASES_OSTEOBLASTO)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 2 usa estos `t`. */
export const HITOS_OSTEOBLASTO: Readonly<Record<FaseOsteoblasto, number>> = {
  precursor: 0,
  diferenciacion: 0.16,
  organulos: 0.32,
  secrecion: 0.48,
  mineralizacion: 0.64,
  destino: 0.8,
  reposo: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_OSTEOBLASTO[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_OSTEOBLASTO: readonly number[] = FASES_OSTEOBLASTO.slice(1).map(
  (fase, i) => mezclar(HITOS_OSTEOBLASTO[FASES_OSTEOBLASTO[i]!], HITOS_OSTEOBLASTO[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseOsteoblastoEnTiempo(t: number): FaseOsteoblasto {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_OSTEOBLASTO.length && x >= LIMITES_FASES_OSTEOBLASTO[indice]!)
    indice++;
  return FASES_OSTEOBLASTO[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

/** Llegada de las vecinas a la fila (0 ninguna, 1 todas): las dos más cercanas primero. */
const PISTA_LLEGADA: readonly Fotograma[] = [
  [0.04, 0],
  [0.16, 1],
];
/** De fusiforme (0) a cúbico (1) y de pálida a basófila: la diferenciación. */
const PISTA_CUBICO: readonly Fotograma[] = [
  [0.05, 0],
  [0.16, 1],
];
/** Transparencia de la célula protagonista para ver sus orgánulos (0 opaca, 1 transparente). */
const PISTA_TRANSPARENCIA: readonly Fotograma[] = [
  [0.22, 0],
  [0.31, 1],
  [0.54, 1],
  [0.61, 0],
];
/** Intensidad de la secreción: cuántas vesículas viajan y cuánto se ven (0 a 1). */
const PISTA_SECRECION: readonly Fotograma[] = [
  [0.36, 0],
  [0.46, 1],
  [0.6, 1],
  [0.7, 0],
];
/** Altura (Y) de la superficie sobre la que se apoyan las células: osteoide + hueso nuevo depositado. */
const PISTA_DEPOSITO: readonly Fotograma[] = [
  [0.36, 0.01],
  [0.5, 0.55],
  [0.64, 0.82],
  [0.8, 0.98],
  [1, 1],
];
/** Altura (Y) del frente de mineralización (tope del hueso nuevo). Por debajo, hueso nuevo; encima, osteoide. */
const PISTA_MINERAL: readonly Fotograma[] = [
  [0.52, 0],
  [0.64, 0.58],
  [0.8, 0.84],
  [1, 0.97],
];
/** Cuánto se destaca el frente de mineralización (0 a 1). */
const PISTA_FRENTE: readonly Fotograma[] = [
  [0.56, 0],
  [0.64, 1],
  [0.74, 1],
  [0.82, 0.25],
];
/** Destinos: la célula 1 se hunde en la matriz (osteocito). */
const PISTA_HUNDIDO: readonly Fotograma[] = [
  [0.7, 0],
  [0.8, 1],
];
/** La célula 2 se aplana (célula de revestimiento). */
const PISTA_APLANADO_CENTRO: readonly Fotograma[] = [
  [0.7, 0],
  [0.8, 1],
];
/** Las células de los extremos se aplanan después, camino del reposo. */
const PISTA_APLANADO_EXTREMOS: readonly Fotograma[] = [
  [0.82, 0],
  [0.95, 1],
];
/** La célula 3 se encoge (apoptosis) y sus fragmentos se dispersan y desaparecen. */
const PISTA_ENCOGIDO: readonly Fotograma[] = [
  [0.7, 0],
  [0.8, 0.8],
  [0.9, 1],
];
const PISTA_FRAGMENTOS: readonly Fotograma[] = [
  [0.72, 0],
  [0.8, 1],
  [0.88, 0.7],
  [0.96, 0],
];
/** Las células de revestimiento se estiran y cubren los huecos que dejan el osteocito y la apoptosis. */
const PISTA_COBERTURA: readonly Fotograma[] = [
  [0.84, 0],
  [1, 1],
];

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface EstadoCelula {
  /** Presencia en la fila (0 no está, 1 del todo); las vecinas llegan en la diferenciación. */
  presencia: number;
  /** 0 fusiforme y pálida, 1 cúbica y basófila. */
  cubico: number;
  /** 0 osteoblasto, 1 célula de revestimiento plana. */
  aplanado: number;
  /** 0 en la superficie, 1 atrapada en la matriz como osteocito. */
  hundido: number;
  /** 0 intacta, 1 encogida del todo (apoptosis). */
  encogido: number;
  /** Posición X del centro y factor de ancho: las de revestimiento se corren y se estiran para cubrir. */
  x: number;
  ancho: number;
}

export interface EstadoOsteoblasto {
  fase: FaseOsteoblasto;
  celulas: readonly EstadoCelula[];
  /** Transparencia de la célula protagonista (0 opaca, 1 se ven los orgánulos). */
  transparencia: number;
  /** Cuánto se ven los orgánulos (0 a 1). */
  organulos: number;
  secrecion: number;
  /** Altura de la superficie de apoyo de las células (tope del osteoide). */
  deposito: number;
  /** Altura del frente de mineralización (tope del hueso nuevo). */
  mineral: number;
  /** Grosor del osteoide (deposito - mineral). */
  osteoide: number;
  /** Cuánto se destaca el frente de mineralización (0 a 1). */
  frente: number;
  /** Escala de los fragmentos apoptóticos (0 a 1). */
  fragmentos: number;
  /** Fracción del ciclo de viaje de las vesículas (0 a 1, cíclica): sale de `t`, no de un reloj. */
  cicloVesiculas: number;
  /** Cuánto se ven la laguna del osteocito y sus canalículos en la cara de corte (0 a 1). */
  laguna: number;
  cobertura: number;
}

/** Posición X de la célula `k` en la fila (la protagonista queda en 0). */
export function xDeCelula(k: number): number {
  return (k - CELULA_FOCO) * PASO_CELULAS;
}

/** Cuántas veces el paso de la fila mide, de ancho, cada célula de revestimiento con la cobertura completa. */
const ANCHO_REVESTIMIENTO_FINAL: readonly number[] = [1.32, 1, 2.3, 1, 1.32];
/** Hacia dónde se corren (en pasos de la fila) las de revestimiento para cubrir los huecos. */
const CORRIMIENTO_FINAL: readonly number[] = [0.17, 0, 0, 0, -0.17];

function estadoCelula(k: number, x: number): EstadoCelula {
  const llegada = evaluarPista(PISTA_LLEGADA, x);
  const orden = k === CELULA_FOCO ? -1 : Math.abs(k - CELULA_FOCO) === 1 ? 0 : 1;
  const presencia = orden < 0 ? 1 : suave(acotar(llegada * 1.4 - orden * 0.4));
  const esExtremo = Math.abs(k - CELULA_FOCO) === 2;
  const aplanado =
    k === DESTINOS.revestimiento
      ? evaluarPista(PISTA_APLANADO_CENTRO, x)
      : esExtremo
        ? evaluarPista(PISTA_APLANADO_EXTREMOS, x)
        : 0;
  const cobertura = evaluarPista(PISTA_COBERTURA, x) * aplanado;
  return {
    presencia,
    cubico: evaluarPista(PISTA_CUBICO, x),
    aplanado,
    hundido: k === DESTINOS.osteocito ? evaluarPista(PISTA_HUNDIDO, x) : 0,
    encogido: k === DESTINOS.apoptosis ? evaluarPista(PISTA_ENCOGIDO, x) : 0,
    x: xDeCelula(k) + (CORRIMIENTO_FINAL[k] ?? 0) * PASO_CELULAS * cobertura,
    ancho: mezclar(1, ANCHO_REVESTIMIENTO_FINAL[k] ?? 1, cobertura),
  };
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoOsteoblasto(t: number): EstadoOsteoblasto {
  const x = acotar(t);
  const transparencia = evaluarPista(PISTA_TRANSPARENCIA, x);
  const deposito = evaluarPista(PISTA_DEPOSITO, x);
  const mineral = Math.min(deposito, evaluarPista(PISTA_MINERAL, x));
  const celulas: EstadoCelula[] = [];
  for (let k = 0; k < N_CELULAS; k++) celulas.push(estadoCelula(k, x));
  return {
    fase: faseOsteoblastoEnTiempo(x),
    celulas,
    transparencia,
    organulos: transparencia,
    secrecion: evaluarPista(PISTA_SECRECION, x),
    deposito,
    mineral,
    osteoide: deposito - mineral,
    frente: evaluarPista(PISTA_FRENTE, x),
    fragmentos: evaluarPista(PISTA_FRAGMENTOS, x),
    cicloVesiculas: (x * CICLOS_VESICULAS) % 1,
    laguna: suave(fraccion(celulas[DESTINOS.osteocito]!.hundido, 0.55, 1)),
    cobertura: evaluarPista(PISTA_COBERTURA, x),
  };
}
