/**
 * Paleta de la escena de la matriz ósea: los colores del dibujo `public/images/m1/m1_matriz_composicion.svg`
 * (grupos `fragmento_hueso`, `fibrilla_colageno`, `zonas_hueco`, `cristales_hidroxiapatita`,
 * `proteinas_no_colagenas`, `fuerza_traccion` y `fuerza_compresion`) y de la escena de la BMU, para que la
 * escena 3D cuente la misma historia con los mismos colores. Hex sRGB.
 */
import { HEX as HEX_BMU } from '../bmu/paleta';

export const HEX = {
  /** Laminillas alternas del fragmento de hueso (los dos rosas del SVG). */
  laminillaClara: '#e9b3c4',
  laminillaOscura: HEX_BMU.hueso,
  /** Contorno de las laminillas y rayas de la dirección de sus fibras. */
  contornoHueso: '#b0607d',
  /** Fibras de colágeno de las laminillas ampliadas (dos tonos, uno por laminilla alterna). */
  fibraClara: '#e39db2',
  fibraOscura: '#c97a97',
  /** Destello con el que se destaca la fibra que se abre. */
  resalte: '#ffd166',
  /** Moléculas de tropocolágeno (relleno de `fibrilla_colageno`) y su segundo tono para alternar filas. */
  molecula: '#a8748c',
  moleculaClara: '#c497ab',
  /** Fibrillas vecinas de la fibra abierta, sin detalle. */
  fibrillaVecina: '#d9bccb',
  /** Zonas de hueco (celeste de `zonas_hueco`). */
  hueco: '#7fd0e0',
  /** Cristales de hidroxiapatita (crema casi blanco de `cristales_hidroxiapatita`). */
  cristal: '#fff3d6',
  /** Proteínas no colágenas: osteocalcina, osteopontina, osteonectina (los tres colores del SVG). */
  proteinas: ['#8b5fc0', '#2fa8a0', '#e0892c'] as const,
  /** Flechas de tracción (naranja) y de compresión (azul). */
  traccion: '#e9862f',
  compresion: '#3d8fd1',
} as const;

/**
 * Paleta NATURAL de esta escena (2026-10-14, mejora de realismo): hueso marfil, colágeno blanquecino y
 * cristal casi blanco, como en el tejido real. Los colores didácticos (huecos, las tres proteínas y las
 * flechas de tracción y compresión) se mantienen, algo más sobrios. Los textos no nombran colores.
 */
export const NATURAL = {
  // Revisión de diseño (2026-10-17): las dos tintas de marfil de las láminas de la escena del hueso y de la BMU (el
  // mismo tejido, el mismo color). `cristal` lo usa también la escena de la vesícula: no cambia.
  laminillaClara: '#eadfc8',
  laminillaOscura: '#d8c6a3',
  contornoHueso: '#a88b5f',
  fibraClara: '#f3ead8',
  fibraOscura: '#e0cfae',
  resalte: HEX.resalte,
  molecula: '#d9c39e',
  moleculaClara: '#ece0c6',
  fibrillaVecina: '#e7dbc2',
  hueco: '#6fbfcc',
  cristal: '#f8f6ef',
  proteinas: ['#7b5ea7', '#2c8f88', '#c98a3a'],
  traccion: '#d9822b',
  compresion: '#3a7cc0',
} as const satisfies Record<keyof typeof HEX, unknown>;
