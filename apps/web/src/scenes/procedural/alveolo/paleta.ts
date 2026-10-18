/**
 * Paleta de la escena del alvéolo tras la extracción: los colores de la escena `hueso_alveolar` (`../alveolar/paleta.ts`,
 * el mismo segmento de mandíbula), de la BMU (`../bmu/paleta.ts`) y de los dibujos del proyecto
 * `m5_cicatrizacion_alveolo_fases.svg` (coágulo, granulación, encía) y `m6_reborde_alveolar_cascada.svg`, para que
 * cada tejido se reconozca del dibujo a la escena. Hex sRGB.
 */
import { HEX as HEX_ALVEOLAR, NATURAL as NATURAL_ALVEOLAR } from '../alveolar/paleta';
import { HEX as HEX_BMU } from '../bmu/paleta';

export const HEX = {
  /** Superficie del hueso cortical y su cara de corte (la del reborde también). */
  cortical: HEX_ALVEOLAR.cortical,
  corteCortical: HEX_ALVEOLAR.corteCortical,
  /** Médula entre las trabéculas y las trabéculas. */
  medula: HEX_ALVEOLAR.medula,
  trabecula: HEX_ALVEOLAR.trabecula,
  /** Hueso alveolar propio (fasciculado) y ligamento periodontal. */
  laminaCribiforme: HEX_ALVEOLAR.laminaCribiforme,
  ligamento: HEX_ALVEOLAR.ligamento,
  /** El diente. */
  dentina: HEX_ALVEOLAR.dentina,
  esmalte: HEX_ALVEOLAR.esmalte,
  pulpa: HEX_ALVEOLAR.pulpa,
  /** Encía (`tejido_blando_encia` del SVG del módulo 5). */
  encia: '#f5d0cf',
  /** Fondo oscuro del alvéolo vacío (la pared lejana en sombra). */
  cavidad: '#5a2f4e',
  /** Sangrado de las paredes y coágulo (`coagulo` del SVG). */
  sangre: '#c2384f',
  coagulo: '#8e2530',
  /** Tejido de granulación (rosado) y sus vasos. */
  granulacion: '#f3b8b0',
  vaso: HEX_BMU.capilar,
  /** Hueso entretejido nuevo (claro) que madura al rosa del hueso laminar. */
  huesoEntretejido: '#f2c4d3',
  huesoLaminar: HEX_BMU.hueso,
  /** Osteoclastos (los mismos de la BMU). */
  osteoclasto: HEX_BMU.osteoclasto,
  /** Conducto mandibular: luz, borde, nervio y vasos. */
  conducto: HEX_ALVEOLAR.conducto,
  bordeConducto: HEX_ALVEOLAR.bordeConducto,
  nervio: HEX_ALVEOLAR.nervio,
  arteria: HEX_ALVEOLAR.arteria,
  vena: HEX_ALVEOLAR.vena,
  /** Foramen mentoniano: el agujero, oscuro, con el nervio mentoniano asomando. */
  foramen: '#4a2f66',
} as const;

/**
 * Paleta NATURAL de esta escena (2026-10-14, mejora de realismo; unificada el 2026-10-17 con la paleta común de las
 * escenas: el mismo tejido, el mismo color): el hueso, el diente, el ligamento periodontal, el hueso alveolar propio,
 * la médula, el conducto y sus vasos son los de la escena `hueso_alveolar` (`NATURAL` de `../alveolar/paleta.ts`, el
 * mismo segmento de mandíbula): el ligamento, rosado (antes un verde salvia, que no tiene base histológica:
 * fidelidad-01), y la lámina dura, la banda más clara (antes rosa viejo: fidelidad-03). La encía es rosa coral; la
 * sangre, roja, y el coágulo, rojo muy oscuro; el alvéolo vacío, en sombra rojiza; el tejido de granulación, rosado y
 * vivo; el hueso entretejido, rosado (muy vascular, como el callo de una fractura: fidelidad-08), que madura al marfil
 * del hueso laminar; los osteoclastos, lila, los de la BMU y la ortodoncia (fidelidad-06). Los textos de los pasos que
 * nombraban los colores antiguos («verde», «banda rosa oscuro», «claro», «violeta claro») tienen una propuesta de
 * cambio en `docs/escena-3d-alveolo.md`. Mismas claves que `HEX` más el cemento radicular, que la paleta original no
 * tenía.
 */
export const NATURAL: Record<keyof typeof HEX | 'cemento', string> = {
  cortical: NATURAL_ALVEOLAR.cortical,
  corteCortical: NATURAL_ALVEOLAR.corteCortical,
  medula: NATURAL_ALVEOLAR.medula,
  trabecula: NATURAL_ALVEOLAR.trabecula,
  laminaCribiforme: NATURAL_ALVEOLAR.laminaCribiforme,
  ligamento: NATURAL_ALVEOLAR.ligamento,
  dentina: NATURAL_ALVEOLAR.dentina,
  esmalte: NATURAL_ALVEOLAR.esmalte,
  pulpa: NATURAL_ALVEOLAR.pulpa,
  cemento: NATURAL_ALVEOLAR.cemento,
  encia: '#dc958c',
  cavidad: '#2a1416',
  sangre: '#a9271f',
  coagulo: '#7e1e1b',
  granulacion: '#d9877f',
  vaso: '#c9473e',
  huesoEntretejido: '#e2b4a2',
  huesoLaminar: NATURAL_ALVEOLAR.trabecula,
  osteoclasto: '#b893cf',
  conducto: '#e3cf9a',
  bordeConducto: NATURAL_ALVEOLAR.bordeConducto,
  nervio: NATURAL_ALVEOLAR.nervio,
  arteria: NATURAL_ALVEOLAR.arteria,
  vena: NATURAL_ALVEOLAR.vena,
  foramen: '#2b1b17',
};
