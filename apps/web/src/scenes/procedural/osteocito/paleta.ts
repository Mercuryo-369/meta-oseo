/**
 * Paleta de la escena del osteocito: los colores del dibujo `public/images/m2/m2_osteocito_lagunar.svg`
 * (grupos `cuerpo_osteocito`, `laguna_osteocitica`, `dendritas`, `liquido_lacunocanalicular`,
 * `osteocito_lagunar_uniones_comunicantes`, `esclerostina`, `celulas_superficie`, `vaso_sanguineo`), de la
 * escena de la BMU (`bmu/paleta.ts`) y de la del hueso (`hueso/paleta.ts`), para que la escena 3D cuente la
 * misma historia con los mismos colores. Hex sRGB.
 */
import { HEX as HEX_BMU } from '../bmu/paleta';
import { HEX as HEX_HUESO } from '../hueso/paleta';

export const HEX = {
  /** Matriz mineralizada (el rosa del hueso de los SVG). */
  matriz: HEX_BMU.hueso,
  /** Pared de fondo del bloque y sus laminillas. */
  matrizFondo: HEX_BMU.huesoIntersticial,
  laminilla: HEX_BMU.huesoLamina,
  /** Pared del conducto de Havers (hueso más oscuro, como el hueso resorbido de la BMU). */
  paredConducto: HEX_BMU.huesoResorbido,
  capilar: HEX_BMU.capilar,
  /** Cuerpo del osteocito y de sus dendritas (el azul #6f93e2 del SVG). */
  osteocito: HEX_BMU.osteocito,
  dendrita: HEX_BMU.osteocito,
  nucleo: HEX_BMU.nucleo,
  /** La laguna es una cavidad: se ve oscura, como en la escena del hueso. */
  laguna: HEX_HUESO.laguna,
  /** Halo claro del canalículo alrededor de la dendrita (el "líquido" celeste del SVG). */
  canaliculo: '#bfe3f2',
  /** Partículas del líquido en movimiento: un celeste más vivo, para que se distingan del canalículo. */
  liquido: '#1e8ff0',
  /** Uniones comunicantes (verde del SVG). */
  union: '#4fae6a',
  /** Esclerostina (naranja del SVG). */
  esclerostina: '#e46b3a',
  /** Sensores destacados (cilio primario, integrinas) y pulsos de la señal. */
  sensor: '#ffd166',
  senal: '#ffd166',
  /** Células de revestimiento (aplanadas) y osteoblastos activos (cúbicos) de la superficie. */
  revestimiento: HEX_BMU.revestimiento,
  osteoblasto: HEX_BMU.osteoblasto,
  /** Superficie del hueso: borde de osteoide sobre el que se sientan las células. */
  osteoide: HEX_BMU.osteoide,
  /** Flechas de compresión (el azul de la escena de la matriz). */
  compresion: '#3d8fd1',
} as const;

/**
 * Paleta NATURAL de esta escena (2026-10-14, mejora de realismo): matriz mineralizada marfil (no el rosa de la
 * tinción), laguna oscura (una cavidad), pared del conducto de tono tostado, canalículo como una vaina de
 * líquido casi incolora y células en tonos suaves. Mismas claves que `HEX` (que no cambia: otras escenas importan
 * paletas, y esta importa la del hueso). Se mantienen, algo más sobrios, los colores que nombran los textos del
 * módulo 2: cilio primario e integrinas amarillos, esclerostina naranja, uniones comunicantes verdes y líquido
 * azul; los pulsos de la señal siguen en el amarillo vivo de `HEX`.
 *
 * Revisión de diseño (2026-10-17): la paleta unificada entre escenas (el mismo tejido, el mismo color; la de
 * `bmu/paleta.ts`). Matriz y pared del fondo en los dos extremos del marfil del hueso maduro; el borde de osteoide,
 * la franja pálida y algo rosada del colágeno sin mineral (antes, más claro que la matriz); las células de
 * revestimiento, una versión pálida del osteoblasto (lavanda, no rosa grisáceo); núcleos del violeta común.
 */
export const NATURAL: Record<keyof typeof HEX, string> = {
  matriz: '#eadfc8',
  matrizFondo: '#e6d8bc',
  laminilla: '#c0a582',
  paredConducto: '#a3826c',
  capilar: '#c9473e',
  osteocito: '#8a9ad2',
  dendrita: '#8a9ad2',
  nucleo: '#4b408f',
  laguna: '#45342b',
  canaliculo: '#d4e2e8',
  liquido: '#2a88dc',
  union: '#4f9f68',
  esclerostina: '#dd7240',
  /** Amarillo dorado: el de `HEX` tenía casi la misma luminosidad que la matriz marfil y el cilio se perdía. */
  sensor: '#e3b23c',
  senal: HEX.senal,
  revestimiento: '#c6c2e2',
  osteoblasto: '#8d86c6',
  osteoide: '#eed4c9',
  compresion: '#3a7cc0',
};
