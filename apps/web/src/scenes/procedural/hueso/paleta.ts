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
  /** Médula roja (en el adulto, en las metáfisis proximales del fémur y del húmero; no en las epífisis). */
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

/**
 * Paleta NATURAL de esta escena (2026-10-14, mejora de realismo paso a paso): el hueso fresco es marfil, no
 * rosa. Las otras escenas que importan `HEX` (osificación, fractura, mandíbula fetal, osteocito, trabecular)
 * no cambian hasta que les toque. Mismas claves que `HEX`; se mantienen los colores que nombran los textos
 * (médula amarilla, conducto de Havers rojo).
 *
 * Revisión de diseño (2026-10-17): la paleta unificada entre escenas (el mismo tejido, el mismo color). Hueso maduro
 * marfil (#e6d8bc a #eadfc8), con las dos tintas de las láminas y la línea de cemento ocre de la BMU; médula amarilla
 * #e8c561 y roja #9e3f33; cartílago hialino #d9e8ef; vaso #c9473e; osteocito #8a9ad2 (azul: antes era el violeta de
 * los osteoblastos). El periostio pasa del tostado (se leía como cuero) a un blanco rosado: en fresco es una
 * membrana fibrosa blanquecina y brillante, algo rosada por sus vasos.
 */
export const NATURAL: Record<keyof typeof HEX, string> = {
  cortical: '#eadfc8',
  laminaClara: '#eadfc8',
  laminaOscura: '#d8c6a3',
  intersticial: '#e6d8bc',
  esponjoso: '#e6d8bc',
  cemento: '#8c6b45',
  periostio: '#e6cfc4',
  endostio: '#f1e3cf',
  medulaAmarilla: '#e8c561',
  medulaRoja: '#9e3f33',
  cartilago: '#d9e8ef',
  vaso: '#c9473e',
  osteocito: '#8a9ad2',
  laguna: '#3b2c22',
  canaliculo: '#6e4c2f',
  resalte: HEX.resalte,
};
