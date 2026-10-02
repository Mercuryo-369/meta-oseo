/**
 * Paleta de la escena del hueso: los colores de los SVG del módulo 1 (`public/images/m1`) y de la escena de la
 * BMU (`bmu/paleta.ts`), para que la mirada reconozca cada capa de un dibujo al otro. Hex sRGB.
 */
import { HEX as HEX_BMU } from '../bmu/paleta';

export const HEX = {
  /** Hueso cortical (el mismo rosa de los SVG). */
  cortical: HEX_BMU.hueso,
  /** Láminas alternas de la osteona. */
  laminaClara: '#e7a7bc',
  laminaOscura: HEX_BMU.huesoLamina,
  /** Hueso intersticial, entre osteonas. */
  intersticial: HEX_BMU.huesoIntersticial,
  /** Hueso esponjoso (trabéculas). */
  esponjoso: '#efb5c6',
  /** Línea de cemento que rodea la osteona. */
  cemento: HEX_BMU.cemento,
  /** Periostio: vaina fibrosa. */
  periostio: '#d2b48c',
  /** Endostio: capa fina de revestimiento. */
  endostio: '#f6d8e2',
  /** Médula amarilla (grasa) de la diáfisis. */
  medulaAmarilla: '#f0d067',
  /** Médula roja de las epífisis. */
  medulaRoja: '#c7605a',
  /** Cartílago articular hialino. */
  cartilago: '#cfe6ef',
  /** Vasos: capilar del conducto de Havers, conducto de Volkmann. */
  vaso: HEX_BMU.capilar,
  osteocito: HEX_BMU.osteocito,
  /** La laguna se ve oscura: es una cavidad en la matriz (como en un corte teñido). */
  laguna: '#4a2f66',
  canaliculo: '#fff1a8',
  /** Destello con el que se destacan las osteonas del corte. */
  resalte: '#ffd166',
} as const;
