/**
 * Paleta de la escena de la mandíbula fetal: los colores de los dibujos del módulo 2 (`m2_origen_mandibula.svg`)
 * y del módulo 3 (`m3_mandibula_desarrollo.svg`), y los de las escenas del hueso (`hueso/paleta.ts`), de la BMU
 * (`bmu/paleta.ts`) y del hueso alveolar (`alveolar/paleta.ts`), para que cada estructura se reconozca del dibujo
 * a la escena. Hex sRGB.
 */
import { HEX as HEX_ALVEOLAR } from '../alveolar/paleta';
import { HEX as HEX_BMU } from '../bmu/paleta';
import { HEX as HEX_HUESO } from '../hueso/paleta';

export const HEX = {
  /** Ectomesénquima del primer arco (`ectomesenquima` del SVG del módulo 2): masa translúcida. */
  mesenquima: '#d5cbef',
  /** Células del ectomesénquima, puntos algo más oscuros que la masa. */
  celulaMesenquimal: '#b3a3e3',
  /** Mesénquima condensado: la mancha densa donde va a aparecer el hueso. */
  condensacion: '#9a86d6',
  /** Cartílago (Meckel, condilar, coronoideo, sinfisario): el mismo azul hielo del cartílago articular. */
  cartilago: HEX_HUESO.cartilago,
  /** Segunda tinta del cartílago, para el martillo y el yunque. */
  cartilagoOscuro: '#9fc4d6',
  /** Ligamento esfenomandibular: resto fibroso del cartílago de Meckel. */
  ligamento: '#c9bfa6',
  /** Hueso intramembranoso (el rosa de todos los SVG). */
  hueso: HEX_BMU.hueso,
  /** Cara de corte del hueso, un punto más clara. */
  corteHueso: HEX_BMU.huesoIntersticial,
  /** Sitio del primer centro de osificación (`sitio_primer_osificacion` del SVG del módulo 3). */
  centroOsificacion: '#b0607d',
  /** Nervio alveolar inferior y sus ramas (`nervio_alveolar_inferior` del SVG). */
  nervio: HEX_ALVEOLAR.nervio,
  /** Germen dentario (`germen_dental` del SVG del módulo 3). */
  germen: HEX_ALVEOLAR.dentina,
  /** Órgano del esmalte que cubre el germen: campana azulada. */
  campana: '#d3e6f5',
} as const;

/**
 * Paleta NATURAL de esta escena (2026-10-14, mejora de realismo): los tejidos como se ven en un embrión real.
 * El ectomesénquima es una masa gelatinosa translúcida (no violeta de tinción) y la condensación, una zona más
 * densa y opaca; el hueso fetal, muy vascular, es rosado; el cartílago, blanco azulado; el nervio, amarillento;
 * los gérmenes, cremosos bajo una campana azulada (los textos de los pasos nombran estos colores).
 *
 * Paleta unificada entre escenas (2026-10-17): el hueso fetal es hueso inmaduro (entretejido), el mismo rosado
 * `#e2b4a2` de las espículas de las dos rutas y del callo de la fractura; el cartílago hialino, `#d9e8ef`.
 */
export const NATURAL: Record<keyof typeof HEX, string> = {
  mesenquima: '#ddd5e3',
  celulaMesenquimal: '#c4b6cf',
  condensacion: '#b3a2c2',
  cartilago: '#d9e8ef',
  cartilagoOscuro: '#c3d7e2',
  ligamento: '#dccfb3',
  hueso: '#e2b4a2',
  corteHueso: '#d79d8f',
  centroOsificacion: '#c46a55',
  nervio: '#f0dc9a',
  germen: '#f2e3c9',
  campana: '#d4e6f2',
};
