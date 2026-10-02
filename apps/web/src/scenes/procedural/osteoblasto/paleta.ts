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
