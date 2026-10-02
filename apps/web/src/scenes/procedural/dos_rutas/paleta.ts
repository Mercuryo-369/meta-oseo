/**
 * Paleta de la escena de las dos rutas: los colores del dibujo `public/images/m3/m3_rutas_formacion_osea.svg` y de
 * las escenas del hueso (`hueso/paleta.ts`), de la BMU (`bmu/paleta.ts`) y del osteoblasto, para que cada célula y
 * cada tejido se reconozcan de un dibujo al otro. Hex sRGB.
 */
import { HEX as HEX_BMU } from '../bmu/paleta';
import { HEX as HEX_HUESO } from '../hueso/paleta';

export const HEX = {
  /** Mesénquima translúcido (el lavanda claro del SVG). */
  mesenquima: '#e2dbf4',
  /** Célula mesenquimal, pálida. */
  precursor: HEX_BMU.precursor,
  osteoblasto: HEX_BMU.osteoblasto,
  osteocito: HEX_BMU.osteocito,
  revestimiento: HEX_BMU.revestimiento,
  nucleo: '#3b2f86',
  /** Osteoide: matriz orgánica aún sin mineralizar. */
  osteoide: HEX_BMU.osteoide,
  /** Hueso entretejido (el mismo rosa de los SVG). */
  hueso: HEX_BMU.hueso,
  /** Hueso nuevo ya mineralizado, un poco más claro. */
  huesoNuevo: HEX_BMU.huesoNuevo,
  /** Hueso laminar maduro y sus laminillas. */
  laminaClara: HEX_HUESO.laminaClara,
  laminaOscura: HEX_HUESO.laminaOscura,
  /** Cartílago hialino (el mismo celeste del hueso largo del módulo 1). */
  cartilago: HEX_HUESO.cartilago,
  /** Cartílago calcificado: más oscuro y gris. */
  cartilagoCalcificado: '#8fa9b8',
  /** Condrocito (el lila del SVG de las rutas) y condrocito hipertrófico, más pálido y grande. */
  condrocito: '#b8adf0',
  condrocitoHipertrofico: '#d5cbef',
  /** Laguna del condrocito: halo claro alrededor de la célula. */
  lagunaCondrocito: '#e3ecf3',
  /** Pericondrio y periostio: vaina fibrosa. */
  pericondrio: HEX_HUESO.periostio,
  vaso: HEX_BMU.capilar,
  medulaRoja: HEX_HUESO.medulaRoja,
  medulaAmarilla: HEX_HUESO.medulaAmarilla,
  osteoclasto: HEX_BMU.osteoclasto,
} as const;
