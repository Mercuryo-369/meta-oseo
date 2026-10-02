/**
 * Paleta de la escena del hueso alveolar: los colores del dibujo `m1_proceso_alveolar_corte.svg` (la actividad
 * multicapa `m1_5_proceso_alveolar` cuenta la misma historia en 2D) y de la escena de la BMU (`bmu/paleta.ts`),
 * para que cada estructura se reconozca del dibujo a la escena. Hex sRGB.
 */
import { HEX as HEX_BMU } from '../bmu/paleta';

export const HEX = {
  /** Superficie del hueso cortical (el rosa de los SVG). */
  cortical: HEX_BMU.hueso,
  /** Cara de corte de las tablas corticales, un punto más clara que la superficie. */
  corteCortical: HEX_BMU.huesoIntersticial,
  /** Médula ósea entre las trabéculas (`hueso_trabecular_alveolar` del SVG). */
  medula: '#f3e6b3',
  /** Las trabéculas, en el rosa de las láminas del hueso. */
  trabecula: HEX_BMU.huesoLamina,
  /** Hueso alveolar propio o lámina cribiforme (`hueso_alveolar_propio` del SVG). */
  laminaCribiforme: '#c0648a',
  /** Perforaciones de la lámina (por donde pasan vasos y nervios). */
  perforacion: HEX_BMU.cemento,
  /** Ligamento periodontal y sus fibras (`ligamento_periodontal` del SVG). */
  ligamento: '#b9cf8f',
  fibra: '#5f7d3c',
  /** Dentina de la raíz y esmalte de la corona (`raiz_dentaria` del SVG). */
  dentina: '#f2e5b6',
  esmalte: '#fffaf0',
  /** Cemento radicular (borde de la raíz). */
  cemento: '#d9b26a',
  pulpa: '#f0a9a0',
  /** Conducto mandibular: pared, borde y contenido (`conducto_mandibular` del SVG). */
  conducto: '#f6e9c0',
  bordeConducto: '#7d6fd0',
  nervio: '#e7c84f',
  arteria: '#d9574a',
  vena: '#5b7fb3',
  /**
   * Resaltes: el color emisivo con que se destaca cada estructura en su fase. Es una versión más viva de su
   * propio color (no un amarillo común), para que la médula amarilla no se trague a las trabéculas.
   */
  resalteCortical: '#ff8fb0',
  resalteMedula: '#ffd166',
  resalteTrabecula: '#d8367a',
  resalteLamina: '#ff3d8f',
  resalteLigamento: '#8fd42e',
  resalteConducto: '#8f7dff',
} as const;
