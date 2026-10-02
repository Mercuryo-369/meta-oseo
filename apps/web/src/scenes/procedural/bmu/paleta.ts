/**
 * Paleta de la escena de la BMU: los mismos colores de los SVG del proyecto (`public/images/m2` y `m5`) y de
 * los tokens de `src/style.css` (hematoxilina y eosina). Los hex son sRGB; `lineal` los convierte al espacio
 * de trabajo de three para los atributos de color de vértice y de instancia.
 */
import { Color } from 'three';

export const HEX = {
  /** Hueso cortical previo (el mismo #d98aa2 de los SVG). */
  hueso: '#d98aa2',
  /** Segunda tinta de las láminas del hueso viejo, para que se lean las capas. */
  huesoLamina: '#c0678a',
  /** Hueso intersticial, entre las osteonas viejas. */
  huesoIntersticial: '#e39db2',
  /** Osteoide, matriz orgánica aún sin mineralizar. */
  osteoide: '#f7dbe4',
  /** Hueso nuevo ya mineralizado (relleno de `osteona_nueva` en el SVG de la BMU). */
  huesoNuevo: '#ecadc0',
  /** Línea de cemento. */
  cemento: '#5a2f6e',
  /** Hueso recién resorbido: la pared festoneada del túnel, más oscura que el hueso intacto. */
  huesoResorbido: '#8e4470',
  osteoblasto: '#8b7bdc',
  osteocito: '#6f93e2',
  /** Halo claro de la laguna del osteocito. */
  lagunaOsteocito: '#f8e3ea',
  nucleo: '#4f42b0',
  brilloNucleo: '#8f86e0',
  osteoclasto: '#c9a0dc',
  /** Borde festoneado del osteoclasto (un poco más saturado que el cuerpo). */
  bordeFestoneado: '#a97cc8',
  precursor: '#d5b3e6',
  celulaInversion: '#d5b3e6',
  revestimiento: '#f2c7d6',
  capilar: '#d9574a',
  contornoOscuro: '#2b2350',
} as const;

const auxiliar = new Color();

/** `[r, g, b]` (0 a 1) en el espacio lineal de three para un color sRGB `#rrggbb`. */
export function lineal(hex: string): [number, number, number] {
  auxiliar.set(hex);
  return [auxiliar.r, auxiliar.g, auxiliar.b];
}

export type Rgb = [number, number, number];

/** Mezcla dos colores lineales (k = 0 da `a`, k = 1 da `b`) y escribe el resultado en `salida`. */
export function mezclarRgb(a: Rgb, b: Rgb, k: number, salida: Rgb = [0, 0, 0]): Rgb {
  salida[0] = a[0] + (b[0] - a[0]) * k;
  salida[1] = a[1] + (b[1] - a[1]) * k;
  salida[2] = a[2] + (b[2] - a[2]) * k;
  return salida;
}

export const RGB = {
  hueso: lineal(HEX.hueso),
  huesoLamina: lineal(HEX.huesoLamina),
  huesoIntersticial: lineal(HEX.huesoIntersticial),
  osteoide: lineal(HEX.osteoide),
  huesoNuevo: lineal(HEX.huesoNuevo),
  cemento: lineal(HEX.cemento),
  huesoResorbido: lineal(HEX.huesoResorbido),
} as const;
