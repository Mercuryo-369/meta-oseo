/**
 * Paleta de la escena del movimiento ortodóntico: los colores del dibujo `m5_movimiento_ortodontico_pdl.svg`
 * (la actividad multicapa `m5_ortodoncia_multicapa` cuenta la misma historia en 2D), del corte alveolar del
 * módulo 1 (`alveolar/paleta.ts`) y de la BMU (`bmu/paleta.ts`), para que cada estructura y cada célula se
 * reconozcan de un dibujo al otro. Hex sRGB.
 */
import { HEX as HEX_ALVEOLAR } from '../alveolar/paleta';
import { HEX as HEX_BMU } from '../bmu/paleta';

export const HEX = {
  /** Superficie del hueso cortical y su cara de corte (el rosa de los SVG). */
  cortical: HEX_BMU.hueso,
  corteCortical: HEX_BMU.huesoIntersticial,
  /** Médula ósea entre las trabéculas y las trabéculas, como en el corte alveolar del módulo 1. */
  medula: HEX_ALVEOLAR.medula,
  trabecula: HEX_ALVEOLAR.trabecula,
  /** Encía (no está en los SVG del módulo: un rosa mucoso claro). */
  encia: '#e07f8e',
  /** Hueso alveolar propio (lámina) en reposo, y la pared recién reabsorbida (más oscura). */
  laminaCribiforme: HEX_ALVEOLAR.laminaCribiforme,
  huesoResorbido: HEX_BMU.huesoResorbido,
  /** Osteoide y hueso nuevo (los mismos de la BMU); el hueso nuevo madura al color de la cortical. */
  osteoide: HEX_BMU.osteoide,
  huesoNuevo: HEX_BMU.huesoNuevo,
  huesoMaduro: HEX_BMU.hueso,
  /** Ligamento periodontal (`tension_lpd` y `compresion_lpd` del SVG) y sus fibras. */
  ligamento: '#b9cf8f',
  fibra: '#5f7d3c',
  /** Zona hialinizada: el ligamento comprimido sin células, de aspecto vítreo (`compresion_hialinizacion`). */
  hialinizado: '#efe4f6',
  /** Vasos del ligamento (el rojo de los capilares del proyecto). */
  vaso: HEX_BMU.capilar,
  /** Diente: dentina, esmalte, cemento y pulpa (`raiz_cemento` del SVG). */
  dentina: '#f2e5b6',
  esmalte: '#fffaf0',
  cemento: '#d9b26a',
  pulpa: '#f8b9ad',
  /** Osteoclastos (`compresion_osteoclastos`) y osteoblastos (`tension_osteoblastos`), con sus núcleos. */
  osteoclasto: HEX_BMU.osteoclasto,
  osteoblasto: HEX_BMU.osteoblasto,
  nucleo: '#3b2f86',
  /** Fuerza ortodóntica (`fuerza_ortodontica`, naranja) y bracket (gris metálico del SVG). */
  fuerza: '#e8622b',
  bracket: '#8fa9c4',
  /** Marca punteada de la posición inicial (el contorno oscuro de los SVG). */
  referencia: '#2b2350',
} as const;
