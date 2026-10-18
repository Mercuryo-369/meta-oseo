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

/**
 * Paleta NATURAL de esta escena (2026-10-14, mejora de realismo): la usa SOLO esta escena (`HEX` no cambia). El
 * hueso cortical fresco es marfil (no el rosa de la tinción) y el muerto de los bordes, un gris pardo apagado (sin
 * riego); la médula, amarilla y grasa; el periostio, la vaina fibrosa de la escena del hueso; el coágulo, rojo
 * oscuro, y el tejido de granulación, rojo carne; el tejido fibroso del callo, blanquecino.
 *
 * Se mantienen los colores que nombran los textos de los pasos (`m5_6_fractura_3d`), algo más sobrios: el
 * fibrocartílago CELESTE (blanco azulado), el callo duro ROSADO (el hueso reticular es muy vascular: es más rosado
 * que el laminar, que al final vuelve al marfil de la cortical), el cartílago calcificado GRIS, los osteoclastos
 * LILA y el hueso de los bordes que SE OSCURECE al morir. Las células inflamatorias conservan sus colores
 * didácticos (neutrófilos amarillo pálido, macrófagos azul grisáceo, células madre lila pálido, osteoblastos
 * violeta).
 *
 * Revisión de diseño (2026-10-17): la paleta unificada entre escenas (el mismo tejido, el mismo color). Cortical
 * #eadfc8 (la del hueso y la BMU), hueso laminar nuevo #f2e9d8, cartílago hialino #d9e8ef y calcificado #a2aaae;
 * periostio blanco rosado (#e6cfc4, como en la escena del hueso: el tostado se leía como cuero); osteoblasto
 * #8d86c6 y célula madre, la versión pálida del precursor de la BMU (#cbb7da). `vaso` (nuevo, solo en `NATURAL`):
 * la pared de los vasos nuevos, #c9473e; la sangre de los rotos y de las gotas sigue #a9271f.
 */
export const NATURAL: Record<keyof typeof HEX | 'vaso', string> = {
  cortical: '#eadfc8',
  // Sin riego el hueso muere: queda pálido, de un blanco de tiza, y no sangra (no se oscurece).
  huesoNecrotico: '#f3eee4',
  huesoNuevo: '#e2b4a2',
  laminar: '#f2e9d8',
  periostio: '#e6cfc4',
  medula: '#e8c561',
  coagulo: '#7e1e1b',
  granulacion: '#c45f54',
  sangre: '#a9271f',
  vaso: '#c9473e',
  fibroso: '#e6d7cb',
  cartilago: '#d9e8ef',
  cartilagoCalcificado: '#a2aaae',
  neutrofilo: '#ebe0ae',
  macrofago: '#8eaac6',
  celulaMadre: '#cbb7da',
  osteoblasto: '#8d86c6',
  osteoclasto: '#b893cf',
};
