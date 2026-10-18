/**
 * Paleta de la escena del hueso alveolar: los colores del dibujo `m1_proceso_alveolar_corte.svg` (la actividad
 * multicapa `m1_5_proceso_alveolar` cuenta la misma historia en 2D) y de la escena de la BMU (`bmu/paleta.ts`),
 * para que cada estructura se reconozca del dibujo a la escena. Hex sRGB.
 */
import { HEX as HEX_BMU } from '../bmu/paleta';

export const HEX = {
  /** Superficie del hueso cortical (el rosa de los SVG). */
  cortical: HEX_BMU.hueso,
  /** Cara de corte de las tablas corticales, un punto más clara que la superficie. */
  corteCortical: HEX_BMU.huesoIntersticial,
  /** Médula ósea entre las trabéculas (`hueso_trabecular_alveolar` del SVG). */
  medula: '#f3e6b3',
  /** Las trabéculas, en el rosa de las láminas del hueso. */
  trabecula: HEX_BMU.huesoLamina,
  /** Hueso alveolar propio o lámina cribiforme (`hueso_alveolar_propio` del SVG). */
  laminaCribiforme: '#c0648a',
  /** Perforaciones de la lámina (por donde pasan vasos y nervios). */
  perforacion: HEX_BMU.cemento,
  /** Ligamento periodontal y sus fibras (`ligamento_periodontal` del SVG). */
  ligamento: '#b9cf8f',
  fibra: '#5f7d3c',
  /** Dentina de la raíz y esmalte de la corona (`raiz_dentaria` del SVG). */
  dentina: '#f2e5b6',
  esmalte: '#fffaf0',
  /** Cemento radicular (borde de la raíz). */
  cemento: '#d9b26a',
  pulpa: '#f0a9a0',
  /** Conducto mandibular: pared, borde y contenido (`conducto_mandibular` del SVG). */
  conducto: '#f6e9c0',
  bordeConducto: '#7d6fd0',
  nervio: '#e7c84f',
  arteria: '#d9574a',
  vena: '#5b7fb3',
  /**
   * Resaltes: el color emisivo con que se destaca cada estructura en su fase. Es una versión más viva de su
   * propio color (no un amarillo común), para que la médula amarilla no se trague a las trabéculas.
   */
  resalteCortical: '#ff8fb0',
  resalteMedula: '#ffd166',
  resalteTrabecula: '#d8367a',
  resalteLamina: '#ff3d8f',
  resalteLigamento: '#8fd42e',
  resalteConducto: '#8f7dff',
} as const;

/**
 * Paleta NATURAL de esta escena (2026-10-14, mejora de realismo; unificada el 2026-10-17 con la paleta común de las
 * escenas: el mismo tejido, el mismo color): los tejidos como se ven en un corte fresco de mandíbula. Hueso maduro
 * marfil (la cara de corte del hueso compacto, un punto más clara que la superficie; las trabéculas, el marfil de la
 * superficie; el hueso alveolar propio, la lámina dura, la banda más clara), médula mixta roja y grasa (ámbar
 * rojizo, como la de un adulto), ligamento periodontal rosado con fibras blanquecinas, dentina amarillo pálido,
 * cemento algo más oscuro y mate, pulpa rojiza, nervio blanco amarillento, arteria roja y vena azulada. El esmalte de
 * la corona en relieve lleva un degradado por vértice (`ESMALTE`); `esmalte` es el de su cara de corte. Los resaltes
 * son una versión más viva y cálida de cada color: sobre la médula oscura las trabéculas encendidas se ven sin
 * esfuerzo. Mismas claves que `HEX`, que NO cambia: la importan otras escenas (mandíbula fetal, ortodoncia). Las
 * escenas del alvéolo (`../alveolo/paleta.ts`) y de la ortodoncia (`../ortodoncia/paleta.ts`) toman de aquí el
 * diente, el ligamento y la lámina: los tres cortes dentales pintan igual los mismos tejidos. Los textos de los pasos
 * de esta escena no nombran colores.
 */
export const NATURAL: Record<keyof typeof HEX, string> = {
  cortical: '#e6d8bc',
  corteCortical: '#eadfc8',
  medula: '#b86a45',
  trabecula: '#e6d8bc',
  laminaCribiforme: '#f4ecdc',
  perforacion: '#6a2c27',
  ligamento: '#d4948b',
  fibra: '#f7ece4',
  dentina: '#ecd9aa',
  esmalte: '#eef1ef',
  cemento: '#d2b984',
  pulpa: '#c65f5b',
  conducto: '#d9c9a6',
  bordeConducto: '#f4ecdc',
  nervio: '#e8d390',
  arteria: '#c9473e',
  vena: '#4e5b8c',
  resalteCortical: '#ffcf87',
  resalteMedula: '#ff9550',
  resalteTrabecula: '#fff1c4',
  resalteLamina: '#ffe2a0',
  resalteLigamento: '#ff7d73',
  resalteConducto: '#ffd98a',
};

/**
 * Degradado del esmalte de la corona en relieve (realismo-10), del cuello a la cúspide: amarillento en el tercio
 * cervical, donde el esmalte es fino y deja ver la dentina; blanco cálido en el medio; gris azulado y translúcido en
 * la cúspide, donde es más grueso. Lo usan las tres escenas dentales (`pintarEsmalte` en `geometria.ts`). Un solo
 * blanco con brillo de espejo parecía porcelana.
 */
export const ESMALTE = { cuello: '#e6d9b8', medio: '#f0ede4', cuspide: '#dde3e7' } as const;
