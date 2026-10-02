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
