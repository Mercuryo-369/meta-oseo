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

/**
 * Paleta NATURAL de esta escena (2026-10-14, mejora de realismo): los colores del tejido fresco en vez de los de la
 * tinción. Mesénquima gelatinoso rosado pálido; vasos y médula roja de sangre. Las células conservan sus tonos
 * didácticos (mesenquimal pálida, osteoblasto violeta, osteocito azul, condrocito lila), algo más sobrios. El
 * cartílago calcificado sigue gris porque el texto del paso `crecimiento` lo nombra («su matriz se calcifica
 * (gris)»). `HEX` no cambia: lo usa la escena de la fractura.
 *
 * Paleta unificada entre escenas (2026-10-17: el mismo tejido, el mismo color en todas):
 *  - Osteoide `#eed4c9` (pálido y algo rosado) → hueso inmaduro o entretejido `#e2b4a2` (rosado: muy vascular; las
 *    espículas, el collar, las trabéculas del centro primario y los centros secundarios, todo hueso fetal) → hueso
 *    laminar maduro, marfil `#eadfc8`. Antes el entretejido era marfil cálido (`#e5d3b0`), aunque es la misma
 *    osificación intramembranosa fetal que la de la mandíbula.
 *  - Cartílago hialino `#d9e8ef` y calcificado `#a2aaae`; médula roja `#9e3f33` (también la de la cavidad medular,
 *    antes amarilla) y amarilla `#e8c561`; vaso `#c9473e`.
 *  - Osteoblasto `#8d86c6`, osteocito `#8a9ad2`, osteoclasto `#b893cf`, núcleos `#4b408f`; las células de
 *    revestimiento, un osteoblasto más pálido.
 *  - Pericondrio: membrana fibrosa fina, blanco rosada `#e6cfc4` (antes caramelo, `#d8ae8c`: con el brillo de
 *    terciopelo se leía como cuero).
 */
export const NATURAL: Record<keyof typeof HEX, string> = {
  mesenquima: '#ead9d1',
  precursor: '#cfb9dc',
  osteoblasto: '#8d86c6',
  osteocito: '#8a9ad2',
  revestimiento: '#cdcae9',
  nucleo: '#4b408f',
  osteoide: '#eed4c9',
  hueso: '#e2b4a2',
  huesoNuevo: '#e2b4a2',
  laminaClara: '#eadfc8',
  laminaOscura: '#c3a97f',
  cartilago: '#d9e8ef',
  cartilagoCalcificado: '#a2aaae',
  condrocito: '#b6addb',
  condrocitoHipertrofico: '#d9d2e8',
  lagunaCondrocito: '#eaf0f3',
  pericondrio: '#e6cfc4',
  vaso: '#c9473e',
  medulaRoja: '#9e3f33',
  medulaAmarilla: '#e8c561',
  osteoclasto: '#b893cf',
};
