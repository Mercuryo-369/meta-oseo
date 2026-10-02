/**
 * Estado de la escena "la vesícula de matriz y el primer cristal" como FUNCIÓN PURA del tiempo `t` (0 a 1). Sin
 * three, sin Vue y sin estado acumulado: `estadoVesicula(t)` da siempre lo mismo para el mismo `t`, así que
 * adelantar, atrasar y saltar de una fase a otra es exacto y reversible. Las mallas (`mallas.ts`) y la escena
 * (`EscenaVesicula.vue`) solo DIBUJAN este estado.
 *
 * ── Qué representa el tiempo ──────────────────────────────────────────────────────────────────
 * Aquí `t` SÍ es tiempo: la vida de una vesícula de matriz. Brota de la membrana basal de un osteoblasto, cae al
 * osteoide junto a una fibrilla de colágeno, concentra calcio y fosfato, forma un núcleo de fosfato de calcio
 * amorfo que se ordena en el primer cristal de hidroxiapatita, el cristal rompe la membrana, el mineral se
 * propaga por las fibrillas vecinas (y otras vesículas hacen lo mismo) y, al final, el pirofosfato frena el
 * crecimiento mientras la TNAP lo hidroliza. La escala de tiempo es pedagógica, no proporcional.
 *
 * ── Fases y tiempo ────────────────────────────────────────────────────────────────────────────
 * Siete fases con un hito cada una (`HITOS_VESICULA`, el instante que mejor la muestra). Una fase abarca desde el
 * punto medio con el hito anterior hasta el punto medio con el siguiente (`LIMITES_FASES_VESICULA`), la misma
 * regla que usa la interfaz para saber qué texto mostrar (`pasoDeTiempo` en `lineaTiempo.ts`).
 *
 * ── Unidades ──────────────────────────────────────────────────────────────────────────────────
 * Esquemáticas: la vesícula mide 0,85 unidades de radio (unos 100 nm reales) y las fibrillas de colágeno, 0,3 de
 * radio con un periodo D de 0,6 (67 nm reales), así que vesícula y fibrillas guardan entre sí una proporción
 * verosímil; los iones, las enzimas, los canales y las moléculas de PPi están MUY exagerados para que se lean en
 * un móvil (un ion real es mil veces más pequeño que la vesícula). El contenido lo dice en el texto.
 */
import { acotar, evaluarPista, mezclar } from '../interpolacion';
import type { Fotograma } from '../interpolacion';

/* -------------------------------------------------------------------------------------------
 * Constantes geométricas (unidades de escena). Ejes: X a lo largo de las fibrillas, Y hacia arriba (hacia el
 * osteoblasto), Z hacia la cámara.
 * ----------------------------------------------------------------------------------------- */

/** Membrana basal del osteoblasto: altura media (Y), extensión en X y en Z, amplitud de su ondulación. */
export const MEMBRANA = { y: 2.3, ancho: 11, fondo: 6.4, amplitud: 0.22 } as const;
/** Grosor del citoplasma que se dibuja sobre la membrana. */
export const GROSOR_CITOPLASMA = 1.1;
/** Radio de la vesícula de matriz (unos 100 nm reales) y su posición en X y en Z (fija: solo baja en Y). */
export const R_VESICULA = 0.85;
export const X_VESICULA = 0;
export const Z_VESICULA = 0.5;
/** Fibrillas de colágeno del osteoide: radio, largo (X) y periodo D del bandeo (67 nm reales). */
export const R_FIBRILLA = 0.3;
export const LARGO_FIBRILLA = 11;
export const PERIODO_D = 0.6;
/** Fracción del periodo D que ocupa la zona de hueco (el resto es la zona de solapamiento). */
export const FRACCION_HUECO = 0.6;
/** Fibrilla anfitriona (la que toca la vesícula): posición de su eje en Y y en Z. */
export const FIBRILLA_ANFITRIONA = { y: -0.75, z: Z_VESICULA } as const;
/** Altura final del centro de la vesícula: apoyada sobre la fibrilla anfitriona. */
export const Y_VESICULA_FINAL = FIBRILLA_ANFITRIONA.y + R_FIBRILLA + R_VESICULA;
/** Número de fibrillas del osteoide (la primera es la anfitriona). */
export const N_FIBRILLAS = 9;
/** Número de iones que se dibujan entrando en la vesícula (calcio y fosfato). */
export const N_IONES = { calcio: 40, fosfato: 32 } as const;
/** Número de cristales del racimo que crece dentro de la vesícula y sale al osteoide (el primero es el primer cristal). */
export const N_CRISTALES_VESICULA = 7;
/** Otras vesículas de matriz que mineralizan alrededor en la fase de propagación. */
export const N_VESICULAS_VECINAS = 4;
/** Tamaño de una placa de hidroxiapatita sobre las fibrillas (largo en X, alto, grosor). */
export const PLACA = { largo: 0.34, alto: 0.15, grosor: 0.03 } as const;
/**
 * Dirección (unitaria) del sitio de nucleación en la cara interna de la membrana de la vesícula: hacia atrás y
 * un poco abajo, para que se vea en la vista `interior` (la mitad delantera se corta) sin que la fibrilla
 * anfitriona lo tape, y para que el racimo salga al osteoide entre las fibrillas.
 */
export const DIRECCION_NUCLEACION: readonly [number, number, number] = normalizar([
  0.25, -0.55, -0.8,
]);

function normalizar(v: readonly [number, number, number]): [number, number, number] {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

/* -------------------------------------------------------------------------------------------
 * Fases
 * ----------------------------------------------------------------------------------------- */

export const FASES_VESICULA = [
  'osteoblasto',
  'gemacion',
  'acumulacion',
  'nucleacion',
  'ruptura',
  'propagacion',
  'regulacion',
] as const;
export type FaseVesicula = (typeof FASES_VESICULA)[number];

/** Hito de cada fase: el instante en que la escena la muestra mejor. El contenido del módulo 4 usa estos `t`. */
export const HITOS_VESICULA: Readonly<Record<FaseVesicula, number>> = {
  osteoblasto: 0,
  gemacion: 0.17,
  acumulacion: 0.34,
  nucleacion: 0.5,
  ruptura: 0.66,
  propagacion: 0.83,
  regulacion: 1,
};

/** Puntos medios entre hitos consecutivos: `LIMITES_FASES_VESICULA[i]` separa la fase i de la i + 1. */
export const LIMITES_FASES_VESICULA: readonly number[] = FASES_VESICULA.slice(1).map((fase, i) =>
  mezclar(HITOS_VESICULA[FASES_VESICULA[i]!], HITOS_VESICULA[fase], 0.5),
);

/** Fase en la que cae `t`. */
export function faseVesiculaEnTiempo(t: number): FaseVesicula {
  const x = acotar(t);
  let indice = 0;
  while (indice < LIMITES_FASES_VESICULA.length && x >= LIMITES_FASES_VESICULA[indice]!) indice++;
  return FASES_VESICULA[indice]!;
}

/* -------------------------------------------------------------------------------------------
 * Pistas de fotogramas clave
 * ----------------------------------------------------------------------------------------- */

/** La vesícula aparece como un abultamiento de la membrana. */
const PISTA_VESICULA_OPACIDAD: readonly Fotograma[] = [
  [0.06, 0],
  [0.12, 1],
];
/** Crece de un brote pequeño a su tamaño completo mientras cuelga de la membrana. */
const PISTA_VESICULA_ESCALA: readonly Fotograma[] = [
  [0.06, 0.2],
  [0.17, 1],
];
/** Altura del centro: dentro de la membrana, colgando de ella, y después cae hasta apoyarse en la fibrilla. */
const PISTA_VESICULA_Y: readonly Fotograma[] = [
  [0.06, MEMBRANA.y + 0.3],
  [0.12, MEMBRANA.y - 0.95],
  [0.14, MEMBRANA.y - 1.05],
  [0.24, Y_VESICULA_FINAL],
];
/** Cuello de gemación entre la membrana y la vesícula; se estrangula y desaparece cuando se desprende. */
const PISTA_CUELLO: readonly Fotograma[] = [
  [0.06, 0],
  [0.1, 1],
  [0.12, 1],
  [0.15, 0],
];
/** Corte de la vesícula (se quita la mitad que mira a la cámara) para ver la nucleación en la cara interna. */
const PISTA_CORTE: readonly Fotograma[] = [
  [0.41, 0],
  [0.47, 1],
  [0.57, 1],
  [0.62, 0],
];
/** Ruptura de la membrana de la vesícula: se aclara y se hunde cuando los cristales la atraviesan. */
const PISTA_ROTA: readonly Fotograma[] = [
  [0.6, 0],
  [0.68, 1],
];
/** Entrada de iones: calcio por las anexinas, fosfato por PiT-1 y generado dentro por PHOSPHO1. */
const PISTA_ENTRADA: readonly Fotograma[] = [
  [0.26, 0],
  [0.4, 1],
];
/** Los iones acumulados se juntan en el sitio de nucleación. */
const PISTA_CUMULO: readonly Fotograma[] = [
  [0.41, 0],
  [0.49, 1],
];
/** Los iones, ya en el núcleo, dejan de dibujarse sueltos. */
const PISTA_IONES_OPACIDAD: readonly Fotograma[] = [
  [0.49, 1],
  [0.55, 0],
];
/** Núcleo de fosfato de calcio amorfo: crece y después se ordena como cristal. */
const PISTA_NUCLEO: readonly Fotograma[] = [
  [0.43, 0],
  [0.49, 1],
  [0.56, 0],
];
/** El primer cristal de hidroxiapatita, en la cara interna de la membrana. */
const PISTA_CRISTAL: readonly Fotograma[] = [
  [0.44, 0],
  [0.52, 1],
];
/** El racimo de cristales crece, atraviesa la membrana y sale al osteoide. */
const PISTA_RUPTURA: readonly Fotograma[] = [
  [0.57, 0],
  [0.68, 1],
];
/** El mineral se deposita en los huecos del bandeo de las fibrillas y avanza desde la vesícula hacia fuera. */
const PISTA_PROPAGACION: readonly Fotograma[] = [
  [0.7, 0],
  [0.86, 1],
];
/** Otras vesículas alrededor hacen lo mismo. */
const PISTA_VECINAS: readonly Fotograma[] = [
  [0.72, 0],
  [0.83, 1],
];
/** El pirofosfato se pega a las caras de los cristales. */
const PISTA_PPI: readonly Fotograma[] = [
  [0.87, 0],
  [0.95, 1],
];
/** La TNAP de la membrana corta PPi en dos Pi. */
const PISTA_HIDROLISIS: readonly Fotograma[] = [
  [0.9, 0],
  [1, 1],
];

/* -------------------------------------------------------------------------------------------
 * Estado
 * ----------------------------------------------------------------------------------------- */

export interface EstadoVesicula {
  fase: FaseVesicula;
  vesicula: {
    /** Altura del centro (Y). X y Z son fijas (`X_VESICULA`, `Z_VESICULA`). */
    y: number;
    /** Tamaño relativo (1 = `R_VESICULA`). */
    escala: number;
    opacidad: number;
    /** Cuello de gemación (0 no hay, 1 completo). */
    cuello: number;
    /** Corte de la mitad delantera (0 entera, 1 cortada). */
    corte: number;
    /** Membrana rota (0 intacta, 1 rota del todo). */
    rota: number;
  };
  iones: {
    /** Avance de la entrada de iones (0 ninguno ha llegado, 1 todos dentro). */
    entrada: number;
    /** Cuánto se han juntado en el sitio de nucleación (0 repartidos, 1 apretados). */
    cumulo: number;
    opacidad: number;
  };
  /** Tamaño del núcleo de fosfato de calcio amorfo (0 a 1). */
  nucleo: number;
  /** Crecimiento del primer cristal (0 a 1). */
  cristal: number;
  /** Crecimiento del racimo que rompe la membrana (0 a 1). */
  ruptura: number;
  /** Avance del mineral por las fibrillas (0 a 1). */
  propagacion: number;
  /** Aparición de las vesículas vecinas (0 a 1). */
  vecinas: number;
  /** Aparición del pirofosfato sobre los cristales (0 a 1). */
  ppi: number;
  /** Hidrólisis de PPi a Pi por la TNAP de la membrana (0 a 1). */
  hidrolisis: number;
}

/** El estado completo de la escena en el instante `t` (de 0 a 1). Función pura. */
export function estadoVesicula(t: number): EstadoVesicula {
  const x = acotar(t);
  return {
    fase: faseVesiculaEnTiempo(x),
    vesicula: {
      y: evaluarPista(PISTA_VESICULA_Y, x),
      escala: evaluarPista(PISTA_VESICULA_ESCALA, x),
      opacidad: evaluarPista(PISTA_VESICULA_OPACIDAD, x),
      cuello: evaluarPista(PISTA_CUELLO, x),
      corte: evaluarPista(PISTA_CORTE, x),
      rota: evaluarPista(PISTA_ROTA, x),
    },
    iones: {
      entrada: evaluarPista(PISTA_ENTRADA, x),
      cumulo: evaluarPista(PISTA_CUMULO, x),
      opacidad: evaluarPista(PISTA_IONES_OPACIDAD, x),
    },
    nucleo: evaluarPista(PISTA_NUCLEO, x),
    cristal: evaluarPista(PISTA_CRISTAL, x),
    ruptura: evaluarPista(PISTA_RUPTURA, x),
    propagacion: evaluarPista(PISTA_PROPAGACION, x),
    vecinas: evaluarPista(PISTA_VECINAS, x),
    ppi: evaluarPista(PISTA_PPI, x),
    hidrolisis: evaluarPista(PISTA_HIDROLISIS, x),
  };
}
