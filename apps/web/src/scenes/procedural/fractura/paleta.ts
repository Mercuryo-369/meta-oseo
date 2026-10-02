/**
 * Paleta de la escena de la fractura: los colores del dibujo `public/images/m5/m5_reparacion_fractura_fases.svg`
 * (la actividad `m5_reparacion_fractura_video` cuenta la misma historia en 2D) y de las escenas del hueso
 * (`hueso/paleta.ts`), de la BMU (`bmu/paleta.ts`) y de las dos rutas (`dos_rutas/paleta.ts`), para que cada
 * tejido y cada célula se reconozcan de un dibujo al otro. Hex sRGB.
 */
import { HEX as HEX_BMU } from '../bmu/paleta';
import { HEX as HEX_DOS_RUTAS } from '../dos_rutas/paleta';
import { HEX as HEX_HUESO } from '../hueso/paleta';

export const HEX = {
  /** Hueso cortical (el mismo rosa de los SVG). */
  cortical: HEX_HUESO.cortical,
  /** Hueso necrótico de los extremos: más oscuro y apagado. */
  huesoNecrotico: '#a0607a',
  /** Hueso entretejido nuevo del callo duro. */
  huesoNuevo: HEX_BMU.huesoNuevo,
  /** Hueso laminar maduro, ya remodelado. */
  laminar: HEX_HUESO.laminaClara,
  /** Periostio: vaina fibrosa. */
  periostio: HEX_HUESO.periostio,
  /** Médula amarilla de la diáfisis. */
  medula: HEX_HUESO.medulaAmarilla,
  /** Coágulo (el rojo oscuro del hematoma del SVG). */
  coagulo: '#b4413a',
  /** Tejido de granulación: rosado, muy vascular. */
  granulacion: '#d8877f',
  /** Sangre fresca y vasos (capilar de la BMU). */
  sangre: HEX_BMU.capilar,
  /** Tejido fibroso del callo periférico blando. */
  fibroso: '#e9d9c4',
  /** Fibrocartílago del callo blando (el celeste del cartílago del hueso largo). */
  cartilago: HEX_HUESO.cartilago,
  /** Cartílago calcificado, gris azulado. */
  cartilagoCalcificado: HEX_DOS_RUTAS.cartilagoCalcificado,
  /** Neutrófilos y otras células inflamatorias (el amarillo pálido del SVG). */
  neutrofilo: '#f3e39a',
  /** Macrófagos (el azul medio del SVG). */
  macrofago: '#86b3da',
  /** Células madre mesenquimales del periostio (precursores de la BMU). */
  celulaMadre: HEX_BMU.precursor,
  osteoblasto: HEX_BMU.osteoblasto,
  osteoclasto: HEX_BMU.osteoclasto,
} as const;
