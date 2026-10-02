/**
 * Paleta de la escena del alvéolo tras la extracción: los colores de la escena `hueso_alveolar` (`../alveolar/paleta.ts`,
 * el mismo segmento de mandíbula), de la BMU (`../bmu/paleta.ts`) y de los dibujos del proyecto
 * `m5_cicatrizacion_alveolo_fases.svg` (coágulo, granulación, encía) y `m6_reborde_alveolar_cascada.svg`, para que
 * cada tejido se reconozca del dibujo a la escena. Hex sRGB.
 */
import { HEX as HEX_ALVEOLAR } from '../alveolar/paleta';
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
