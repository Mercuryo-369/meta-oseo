/**
 * Paleta de la escena del osteoblasto: los colores del dibujo `public/images/m2/m2_osteoblasto_activo.svg` y de la
 * escena de la BMU (`bmu/paleta.ts`), para que cada célula y cada capa se reconozcan de un dibujo al otro. Hex sRGB.
 */
import { HEX as HEX_BMU } from '../bmu/paleta';

export const HEX = {
  /** Hueso mineralizado viejo (el mismo rosa de los SVG). */
  hueso: HEX_BMU.hueso,
  /** Líneas de las laminillas en la cara de corte del hueso viejo (`#a8748c` en el SVG). */
  laminilla: '#a8748c',
  /** Osteoide: matriz orgánica aún sin mineralizar. */
  osteoide: HEX_BMU.osteoide,
  /** Hueso nuevo ya mineralizado. */
  huesoNuevo: HEX_BMU.huesoNuevo,
  /** Frente de mineralización destacado (el tono oscuro del hueso de la BMU). */
  frente: HEX_BMU.huesoResorbido,
  /** Célula osteoprogenitora, pálida. */
  precursor: HEX_BMU.precursor,
  /** Osteoblasto activo, basófilo. */
  osteoblasto: HEX_BMU.osteoblasto,
  /** Célula de revestimiento, plana y clara. */
  revestimiento: HEX_BMU.revestimiento,
  osteocito: HEX_BMU.osteocito,
  /** Halo claro de la laguna del osteocito en la cara de corte. */
  laguna: HEX_BMU.lagunaOsteocito,
  canaliculo: '#fff1a8',
  /** Célula en apoptosis: se oscurece y pierde color. */
  apoptosis: '#7d6f9c',
  nucleo: '#3b2f86',
  nucleolo: HEX_BMU.brilloNucleo,
  /** Retículo endoplásmico rugoso (cisternas), como en el SVG. */
  reticulo: '#5a4bb8',
  /** Aparato de Golgi (sáculos), como en el SVG. */
  golgi: '#e9c46a',
  /** Mitocondrias: naranja suave (no está en el SVG del osteoblasto). */
  mitocondria: '#e8956d',
  /** Vesículas de secreción, como en el SVG. */
  vesicula: '#fbf1f6',
  capilar: HEX_BMU.capilar,
} as const;

/**
 * Paleta NATURAL de esta escena (2026-10-14, mejora de realismo): colores del tejido vivo, no de la tinción.
 * Mismas claves que `HEX` (que no cambia). Se mantienen, algo más sobrios, los colores que nombran los textos
 * del módulo 2: el frente de mineralización «la línea oscura», el retículo rugoso azul, el Golgi amarillo y las
 * mitocondrias naranjas. Las células van en tonos suaves que siguen distinguiendo cada estado (precursor pálido,
 * osteoblasto basófilo violeta azulado, revestimiento pálido, apoptosis grisácea).
 *
 * Revisión de diseño (2026-10-17): la paleta unificada entre escenas (el mismo tejido, el mismo color; la de
 * `bmu/paleta.ts`). El hueso viejo deja de ser el «bloque rosado» y pasa al marfil del hueso maduro de las demás
 * escenas del módulo (osteocito y osteoclasto); el hueso nuevo, el marfil más claro del hueso recién formado; y el
 * osteoide, la franja pálida y algo rosada del colágeno sin mineral (antes era más claro que el hueso nuevo: al
 * mineralizarse parecía oscurecerse, al revés que en la BMU). De abajo arriba, en la cara de corte: hueso viejo
 * marfil, hueso nuevo más blanco, la línea oscura del frente y el osteoide rosado pálido. Revestimiento y
 * precursor, versiones pálidas del osteoblasto; núcleos del violeta común.
 */
export const NATURAL: Record<keyof typeof HEX, string> = {
  hueso: '#e8dbc3',
  laminilla: '#c0a582',
  osteoide: '#eed4c9',
  huesoNuevo: '#f2e9d8',
  frente: '#6b4a4f',
  /** Pálidas y frías: se distinguen del osteoide rosado y del hueso marfil, cálidos, sobre los que se apoyan. */
  precursor: '#cbb7da',
  osteoblasto: '#8d86c6',
  revestimiento: '#c6c2e2',
  osteocito: '#8a9ad2',
  /** La laguna cortada se ve oscura: es una cavidad (como en la escena del hueso). */
  laguna: '#4a3830',
  /** Canalículos: hilos oscuros en la cara de corte. */
  canaliculo: '#5f4637',
  apoptosis: '#7b7189',
  nucleo: '#4b408f',
  nucleolo: '#a297d6',
  reticulo: '#5866b8',
  golgi: '#e0bd68',
  mitocondria: '#da8a5e',
  vesicula: '#f2ebe4',
  capilar: '#c9473e',
};
