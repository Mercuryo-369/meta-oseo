/**
 * Paleta de la escena del movimiento ortodóntico: los colores del dibujo `m5_movimiento_ortodontico_pdl.svg`
 * (la actividad multicapa `m5_ortodoncia_multicapa` cuenta la misma historia en 2D), del corte alveolar del
 * módulo 1 (`alveolar/paleta.ts`) y de la BMU (`bmu/paleta.ts`), para que cada estructura y cada célula se
 * reconozcan de un dibujo al otro. Hex sRGB.
 */
import { HEX as HEX_ALVEOLAR, NATURAL as NATURAL_ALVEOLAR } from '../alveolar/paleta';
import { HEX as HEX_BMU } from '../bmu/paleta';

export const HEX = {
  /** Superficie del hueso cortical y su cara de corte (el rosa de los SVG). */
  cortical: HEX_BMU.hueso,
  corteCortical: HEX_BMU.huesoIntersticial,
  /** Médula ósea entre las trabéculas y las trabéculas, como en el corte alveolar del módulo 1. */
  medula: HEX_ALVEOLAR.medula,
  trabecula: HEX_ALVEOLAR.trabecula,
  /** Encía (no está en los SVG del módulo: un rosa mucoso claro). */
  encia: '#e07f8e',
  /** Hueso alveolar propio (lámina) en reposo, y la pared recién reabsorbida (más oscura). */
  laminaCribiforme: HEX_ALVEOLAR.laminaCribiforme,
  huesoResorbido: HEX_BMU.huesoResorbido,
  /** Osteoide y hueso nuevo (los mismos de la BMU); el hueso nuevo madura al color de la cortical. */
  osteoide: HEX_BMU.osteoide,
  huesoNuevo: HEX_BMU.huesoNuevo,
  huesoMaduro: HEX_BMU.hueso,
  /** Ligamento periodontal (`tension_lpd` y `compresion_lpd` del SVG) y sus fibras. */
  ligamento: '#b9cf8f',
  fibra: '#5f7d3c',
  /** Zona hialinizada: el ligamento comprimido sin células, de aspecto vítreo (`compresion_hialinizacion`). */
  hialinizado: '#efe4f6',
  /** Vasos del ligamento (el rojo de los capilares del proyecto). */
  vaso: HEX_BMU.capilar,
  /** Diente: dentina, esmalte, cemento y pulpa (`raiz_cemento` del SVG). */
  dentina: '#f2e5b6',
  esmalte: '#fffaf0',
  cemento: '#d9b26a',
  pulpa: '#f8b9ad',
  /** Osteoclastos (`compresion_osteoclastos`) y osteoblastos (`tension_osteoblastos`), con sus núcleos. */
  osteoclasto: HEX_BMU.osteoclasto,
  osteoblasto: HEX_BMU.osteoblasto,
  nucleo: '#3b2f86',
  /** Fuerza ortodóntica (`fuerza_ortodontica`, naranja) y bracket (gris metálico del SVG). */
  fuerza: '#e8622b',
  bracket: '#8fa9c4',
  /** Marca punteada de la posición inicial (el contorno oscuro de los SVG). */
  referencia: '#2b2350',
} as const;

/**
 * Paleta NATURAL de esta escena (2026-10-14, mejora de realismo; unificada el 2026-10-17 con la paleta común de las
 * escenas: el mismo tejido, el mismo color): la usa SOLO esta escena (`HEX` no cambia). El hueso fresco es marfil
 * (no el rosa de la tinción): cortical, cara de corte y trabéculas en el marfil del hueso maduro; el hueso alveolar
 * propio (la lámina dura), la banda más clara (antes, un marfil más oscuro que las trabéculas: fidelidad-03); la
 * pared recién reabsorbida, más oscura y tostada; el osteoide, una franja pálida algo rosada; el hueso nuevo, un
 * marfil más claro que el maduro (el de la BMU), que con la lámina forma la BANDA CLARA del lado izquierdo, y madura
 * al marfil del hueso vecino; la médula, mixta (la del corte alveolar del módulo 1: fidelidad-16). El diente, el
 * ligamento periodontal (rosado, con fibras blanquecinas: antes verde, el color del dibujo, sin base histológica:
 * fidelidad-01), la lámina y la médula son los de `../alveolar/paleta.ts`: los tres cortes dentales pintan igual los
 * mismos tejidos. Los osteoclastos, lila, y los osteoblastos, violeta, como en las demás escenas (antes azules, el
 * color del osteocito: fidelidad-06). La encía, rosa coral; el bracket, de acero. Sin cambios: la flecha naranja de la
 * fuerza y la línea punteada oscura. Los textos de los pasos que nombraban los colores antiguos («verde», «azules»)
 * tienen una propuesta de cambio en `docs/escena-3d-ortodoncia.md`.
 */
export const NATURAL: Record<keyof typeof HEX, string> = {
  cortical: NATURAL_ALVEOLAR.cortical,
  corteCortical: NATURAL_ALVEOLAR.corteCortical,
  medula: NATURAL_ALVEOLAR.medula,
  trabecula: NATURAL_ALVEOLAR.trabecula,
  encia: '#dc958c',
  laminaCribiforme: NATURAL_ALVEOLAR.laminaCribiforme,
  huesoResorbido: '#b29270',
  osteoide: '#eed4c9',
  huesoNuevo: '#f2e9d8',
  huesoMaduro: NATURAL_ALVEOLAR.cortical,
  ligamento: NATURAL_ALVEOLAR.ligamento,
  fibra: NATURAL_ALVEOLAR.fibra,
  hialinizado: '#ecebe4',
  vaso: '#c9473e',
  dentina: NATURAL_ALVEOLAR.dentina,
  esmalte: NATURAL_ALVEOLAR.esmalte,
  cemento: NATURAL_ALVEOLAR.cemento,
  pulpa: NATURAL_ALVEOLAR.pulpa,
  osteoclasto: '#b893cf',
  osteoblasto: '#8d86c6',
  nucleo: '#4b408f',
  fuerza: HEX.fuerza,
  bracket: '#c9ced4',
  referencia: HEX.referencia,
};
