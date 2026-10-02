/**
 * Paleta de la escena del hueso trabecular que envejece: los colores del dibujo
 * `m6_hueso_normal_osteoporotico.svg` (la actividad multicapa vecina de la sección 6.3), de la escena del hueso
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
