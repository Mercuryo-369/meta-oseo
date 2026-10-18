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

/**
 * Paleta NATURAL de la escena de la BMU (2026-10-14, mejora de realismo): la usa SOLO esta escena. `HEX` y `RGB`
 * no cambian: casi todas las demás escenas construyen sus paletas con `HEX`.
 *
 * El hueso fresco es marfil (no el rosa de la tinción H&E), con las láminas viejas en dos tonos de marfil, como en
 * la escena del hueso (`hueso/paleta.ts`). El osteoide es una franja pálida y algo rosada (colágeno sin
 * mineralizar) que al mineralizarse se vuelve el marfil claro del hueso nuevo; la línea de cemento, una línea
 * ocre oscura; la pared recién reabsorbida, un marfil tostado más oscuro que el hueso intacto. Las lagunas de los
 * osteocitos, oscuras (son huecos). Las células conservan sus colores didácticos, algo más sobrios. El capilar
 * sigue rojo. Los textos de los pasos no nombran colores.
 *
 * Revisión de diseño (2026-10-17): la paleta unificada entre escenas (el mismo tejido, el mismo color). Hueso
 * maduro marfil (#e6d8bc a #eadfc8; la segunda tinta de las láminas queda más oscura para que se lean), hueso
 * nuevo #f2e9d8, osteoide #eed4c9; osteoblasto #8d86c6 (violeta), osteocito #8a9ad2 (azul: antes casi igual que
 * el osteoblasto), osteoclasto #b893cf (lila) y núcleos #4b408f; precursores y revestimiento, versiones pálidas de
 * su célula (el revestimiento, un osteoblasto en reposo, pasa de rosa grisáceo a lavanda pálido); vaso #c9473e.
 */
export const NATURAL: Record<keyof typeof HEX, string> = {
  hueso: '#eadfc8',
  huesoLamina: '#d8c6a3',
  huesoIntersticial: '#e6d8bc',
  osteoide: '#eed4c9',
  huesoNuevo: '#f2e9d8',
  cemento: '#8c6b45',
  huesoResorbido: '#b4956f',
  osteoblasto: '#8d86c6',
  osteocito: '#8a9ad2',
  lagunaOsteocito: '#4d3b2c',
  nucleo: '#4b408f',
  brilloNucleo: '#8f86e0',
  osteoclasto: '#b893cf',
  bordeFestoneado: '#9a72b8',
  precursor: '#cbb7da',
  celulaInversion: '#c9b8d3',
  // Osteoblasto en reposo: su violeta a medio camino del blanco (L* 80 frente a 89 del hueso, y frío frente al
  // marfil cálido), para que la capa de revestimiento se vea sobre él.
  revestimiento: '#c6c2e2',
  capilar: '#c9473e',
  contornoOscuro: HEX.contornoOscuro,
};

/** `RGB` de la paleta natural (espacio lineal de three): el color por vértice del hueso de esta escena. */
export const RGB_NATURAL = {
  hueso: lineal(NATURAL.hueso),
  huesoLamina: lineal(NATURAL.huesoLamina),
  huesoIntersticial: lineal(NATURAL.huesoIntersticial),
  osteoide: lineal(NATURAL.osteoide),
  huesoNuevo: lineal(NATURAL.huesoNuevo),
  cemento: lineal(NATURAL.cemento),
  huesoResorbido: lineal(NATURAL.huesoResorbido),
} as const satisfies Record<keyof typeof RGB, Rgb>;
