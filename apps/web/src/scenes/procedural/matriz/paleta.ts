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
