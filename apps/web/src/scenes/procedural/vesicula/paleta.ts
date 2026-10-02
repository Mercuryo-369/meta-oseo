/**
 * Paleta de la escena de la vesícula de matriz: los colores del dibujo `public/images/m4/m4_vesicula_matriz.svg`
 * (grupos `osteoblasto`, `fibrilla_colageno`, `membrana_vesicula`, `canal_anexina`, `transportador_fosfato`,
 * `tnap_membrana`, `enpp1_ankh`, `iones_calcio`, `iones_fosfato` y `pirofosfato`), el crema de los cristales de
 * la escena de la matriz (`../matriz/paleta`) y el osteoblasto de la BMU (`../bmu/paleta`), para que la escena 3D
 * cuente la misma historia que el dibujo con los mismos colores. Hex sRGB.
 */
import { HEX as HEX_BMU } from '../bmu/paleta';
import { HEX as HEX_MATRIZ } from '../matriz/paleta';

export const HEX = {
  /** Membrana del osteoblasto (el mismo violeta de la célula en los SVG y en la BMU). */
  membranaCelula: HEX_BMU.osteoblasto,
  /** Citoplasma del osteoblasto, más claro y translúcido. */
  citoplasma: '#b3a7ea',
  /** Fibrillas de colágeno del osteoide: zona de solapamiento (clara) y zona de hueco (oscura), del SVG. */
  fibrillaClara: '#f0c26b',
  fibrillaOscura: '#d9993a',
  /** Membrana de la vesícula de matriz (rosa de `membrana_vesicula`). */
  membranaVesicula: '#f6c6d6',
  /** Brillo propio de la membrana para que no se ensucie sobre el fondo oscuro (el rosa medio del SVG). */
  brilloMembrana: '#e58fab',
  /** Cuello de gemación, un poco más saturado que la membrana. */
  cuello: '#c2417c',
  /** Canales de anexina (violeta de `canal_anexina`). */
  anexina: '#6a5ad8',
  /** Transportador de fosfato PiT-1 (verde agua de `transportador_fosfato`). */
  pit: '#8ed0c4',
  /** TNAP anclada por GPI a la cara externa (naranja de `tnap_membrana`). */
  tnap: '#e39a62',
  /** PHOSPHO1, dentro de la vesícula (el tono oscuro del mismo grupo del SVG). */
  phospho1: '#7a3a12',
  /** ENPP1 y ANK en la membrana del osteoblasto (los dos colores de `enpp1_ankh`). */
  enpp1: '#c98bd6',
  ank: '#7ac7c0',
  /** Iones de calcio (amarillo de `iones_calcio`) y de fosfato (verde de `iones_fosfato`). */
  calcio: '#f2b62c',
  fosfato: '#2fa37f',
  /** Núcleo de fosfato de calcio amorfo: todavía sin brillo cristalino. */
  acp: '#e6d8bd',
  /** Cristales de hidroxiapatita (el crema de la escena de la matriz). */
  cristal: HEX_MATRIZ.cristal,
  /** Pirofosfato (rojo de `pirofosfato`). */
  ppi: '#dd5a4c',
} as const;
