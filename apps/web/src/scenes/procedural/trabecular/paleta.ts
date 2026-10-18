/**
 * Paleta de la escena del hueso trabecular que envejece: los colores del dibujo
 * `m6_hueso_normal_osteoporotico.svg` (la figura de la sección 6.3), de la escena del hueso
 * largo (`hueso/paleta.ts`) y de la BMU (`bmu/paleta.ts`), para que cada estructura se reconozca del dibujo a la
 * escena. Hex sRGB.
 */
import { HEX as HEX_BMU } from '../bmu/paleta';
import { HEX as HEX_HUESO } from '../hueso/paleta';

export const HEX = {
  /** Placas trabeculares (el rosa claro del hueso esponjoso del módulo 1). */
  placa: HEX_HUESO.esponjoso,
  /** Barras trabeculares y cortical (el rosa de los SVG). */
  barra: HEX_BMU.hueso,
  cortical: HEX_BMU.hueso,
  /** Cara de corte y segunda tinta de la cortical. */
  corticalOscura: HEX_BMU.huesoLamina,
  /** Poros de la cortical envejecida: se ve la médula a través. */
  poro: '#c9bde6',
  /** Médula joven (el lavanda de `m6_hueso_normal_osteoporotico.svg`). */
  medula: '#e2d9f5',
  /** Médula envejecida, más grasa (adipogénesis medular: el amarillo del mismo SVG). */
  medulaGrasa: '#f3e39a',
  /** El cubo joven "fantasma" que se sobreimprime para comparar. */
  fantasma: HEX_BMU.hueso,
  /** Fondo de un hoyo de resorción (laguna de Howship), más oscuro que el hueso intacto. */
  hoyo: HEX_BMU.huesoResorbido,
  /** Osteoide recién depositado que rellena un hoyo. */
  osteoide: HEX_BMU.osteoide,
  osteoclasto: HEX_BMU.osteoclasto,
  nucleo: HEX_BMU.nucleo,
  osteoblasto: HEX_BMU.osteoblasto,
  /** Trabécula que se rompe bajo la carga (microfractura): el rojo del SVG del colapso vertebral. */
  microfractura: '#b8302f',
  /** Flecha de la carga (el naranja de las flechas del SVG). */
  flecha: '#e58c3c',
} as const;

/**
 * Paleta NATURAL de esta escena (2026-10-14, mejora de realismo): la de una pieza anatómica o una micro-TC de hueso
 * esponjoso. Trabéculas y cortical de color marfil (las de menos vida, algo más amarillentas), poros oscuros, médula
 * roja (hematopoyética) que con los años se vuelve amarilla (grasa). El cubo joven fantasma es de un marfil más
 * tostado: translúcido (opacidad 0,42) sobre el fondo casi blanco del tema claro, un marfil claro no se vería. Se
 * mantienen los colores didácticos de las células de la BMU, el osteoide y la flecha naranja; la microfractura sigue
 * roja porque el texto del paso `carga` la nombra («en rojo»). `HEX` (los colores del dibujo) no cambia.
 *
 * Paleta unificada entre escenas (2026-10-17: el mismo tejido, el mismo color en todas): hueso maduro marfil entre
 * `#e6d8bc` y `#eadfc8` (las placas, las barras y la cortical); osteoide `#eed4c9`; médula roja `#9e3f33` y
 * amarilla `#e8c561`; osteoblasto `#8d86c6`, osteoclasto `#b893cf` y núcleos `#4b408f`.
 */
export const NATURAL: Record<keyof typeof HEX, string> = {
  placa: '#eadfc8',
  barra: '#e6d8bc',
  cortical: '#e8dcc2',
  corticalOscura: '#d4c3a1',
  poro: '#4e2f27',
  medula: '#9e3f33',
  medulaGrasa: '#e8c561',
  fantasma: '#d3c29f',
  hoyo: '#a3876a',
  osteoide: '#eed4c9',
  osteoclasto: '#b893cf',
  nucleo: '#4b408f',
  osteoblasto: '#8d86c6',
  microfractura: HEX.microfractura,
  flecha: '#d9822b',
};
