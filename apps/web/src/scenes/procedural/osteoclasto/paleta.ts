/**
 * Paleta de la escena del osteoclasto: los colores del dibujo `m2_osteoclasto_resorcion.svg` (la actividad
 * multicapa `m2_multicapa_osteoclasto` cuenta la misma historia en corte 2D) y de la escena de la BMU
 * (`bmu/paleta.ts`), para que cada estructura se reconozca del dibujo a la escena. Hex sRGB.
 */
import { HEX as HEX_BMU } from '../bmu/paleta';

export const HEX = {
  /** Superficie del hueso mineralizado (el rosa de los SVG). */
  hueso: HEX_BMU.hueso,
  /** Fondo de la laguna de Howship recién excavada, más oscuro que el hueso intacto. */
  huesoResorbido: HEX_BMU.huesoResorbido,
  /** Cara de corte del bloque, un punto más clara que la superficie. */
  corteHueso: HEX_BMU.huesoIntersticial,
  capilar: HEX_BMU.capilar,
  /** Precursores mononucleares y células de inversión. */
  precursor: HEX_BMU.precursor,
  /** Citoplasma del osteoclasto (`fondo_citoplasma_osteoclasto` del SVG). */
  osteoclasto: HEX_BMU.osteoclasto,
  /** Pliegues del borde festoneado: más saturados que el citoplasma para que se lean a través de él. */
  bordeFestoneado: '#8e5fb8',
  /** Núcleos (`nucleos_multiples` del SVG). */
  nucleo: '#3b2f86',
  /** Zona clara o de sellado: el rodete claro del contorno de contacto (`zona_clara` del SVG). */
  zonaClara: '#f1ecfb',
  /** Cuerpos apoptóticos: el citoplasma que se fragmenta, algo más oscuro. */
  cuerpoApoptotico: '#b48ccc',
  /** Protones (H+) que salen por la bomba (`bomba_protones` del SVG). */
  proton: '#f2745e',
  /** Iones cloruro (`canal_cloruro` del SVG). */
  cloruro: '#2fa88c',
  /** Catepsina K (`catepsina_k` del SVG). */
  catepsina: '#e2a12e',
  /** Calcio liberado: el tono de los cristales de la matriz del SVG. */
  calcio: '#fbe6ec',
  /** Fosfato liberado. */
  fosfato: '#38b6cb',
  /** Fragmentos de colágeno (CTX): el trazo del hueso en el SVG. */
  colageno: '#a8748c',
} as const;

/**
 * Paleta NATURAL de esta escena (2026-10-14, mejora de realismo): el hueso fresco es marfil, no el rosa de la
 * tinción, y el fondo de la laguna de Howship, pardo (más oscuro, como pide el texto); las células, en tonos
 * suaves. Se mantienen, algo más sobrias, las familias de color que nombran los textos: H+ naranja, Cl- verde,
 * catepsina K ámbar, calcio claro, fosfato azul, colágeno (CTX) rosa, capilar rojo, precursores lila (pálidos) y
 * anillo de sellado claro. Mismas claves que `HEX` (que no cambia).
 *
 * Revisión de diseño (2026-10-17): la paleta unificada entre escenas (el mismo tejido, el mismo color). Hueso maduro
 * marfil (#e6d8bc la superficie y #eadfc8, un punto más clara, la cara de corte), pared reabsorbida como en la BMU,
 * osteoclasto #b893cf (lila), núcleos #4b408f, vaso #c9473e y precursores en la versión pálida del osteoclasto (la
 * misma de la BMU; antes eran más oscuros que la célula que forman).
 */
export const NATURAL: Record<keyof typeof HEX, string> = {
  hueso: '#e6d8bc',
  huesoResorbido: '#b4956f',
  corteHueso: '#eadfc8',
  capilar: '#c9473e',
  precursor: '#cbb7da',
  osteoclasto: '#b893cf',
  bordeFestoneado: '#8a66aa',
  nucleo: '#4b408f',
  zonaClara: '#efe9f1',
  cuerpoApoptotico: '#a78cb8',
  proton: '#e4733f',
  cloruro: '#37a07b',
  catepsina: '#d99b35',
  calcio: '#f3eee4',
  fosfato: '#4a8fc8',
  colageno: '#c97f99',
};
