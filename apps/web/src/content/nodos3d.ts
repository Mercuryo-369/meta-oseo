/**
 * Catálogo de las escenas 3D del contenido (docs/content-schema.md, "Actividad exploracion-3d").
 *
 * El 3D se reserva para la mandíbula y las células (CLAUDE.md). Hay DOS maneras de que un nodo
 * del contenido apunte al modelo:
 *  - por PIEZA: su `id` es el nombre de un nodo del GLB. Solo valen los del catálogo de este
 *    archivo, que es exactamente lo que F0-08 (mandíbula) y F0-10 (células) planean separar en
 *    Blender. Cada nodo del GLB debe llamarse igual que su id, en snake_case en español.
 *  - por ANCLA (solo mandíbula): el nodo lleva `ancla: { x, y, z }`, un punto en la caja
 *    envolvente del modelo. Sirve para zonas que no son una pieza separable (una cresta, un
 *    foramen, una zona de compresión, una lámina) y funciona con el modelo provisional de una sola
 *    malla. El `id` de un nodo con ancla es libre (snake_case) y no se comprueba contra el
 *    catálogo.
 * Los GLB definitivos aún no existen: mientras tanto el catálogo es la propuesta que esos GLB
 * deben respetar. Si el modelador cambia un nombre, se cambia aquí y en el contenido.
 */

export const MODELOS_3D = ['mandibula', 'celulas'] as const;
export type Modelo3d = (typeof MODELOS_3D)[number];

export interface NodoCatalogo {
  /** Nombre del nodo en el GLB y `id` en content.json. */
  id: string;
  /** Nombre de la estructura, para mostrarlo tal cual si el contenido no da otra etiqueta. */
  etiqueta: string;
}

/**
 * `mandibula` es el nodo que abarca todo el hueso: es el único nodo del modelo provisional
 * (STL de BodyParts3D, F1-12), así que la escena funciona hoy con ese nodo. Los otros siete son
 * los que F0-08 separa en Blender. Foramen, escotadura o línea oblicua NO son volúmenes
 * separables: son huecos, muescas o crestas, y se piden por ancla.
 */
const NODOS_MANDIBULA: readonly NodoCatalogo[] = [
  { id: 'mandibula', etiqueta: 'Mandíbula' },
  { id: 'condilo', etiqueta: 'Cóndilo mandibular' },
  { id: 'apofisis_coronoides', etiqueta: 'Apófisis coronoides' },
  { id: 'rama', etiqueta: 'Rama mandibular' },
  { id: 'angulo', etiqueta: 'Ángulo mandibular' },
  { id: 'cuerpo', etiqueta: 'Cuerpo mandibular' },
  { id: 'sinfisis', etiqueta: 'Sínfisis mentoniana' },
  { id: 'foramen_mentoniano', etiqueta: 'Foramen mentoniano' },
];

/** Los cuatro modelos low-poly que planea F0-10. */
const NODOS_CELULAS: readonly NodoCatalogo[] = [
  { id: 'celula_osteoprogenitora', etiqueta: 'Célula osteoprogenitora' },
  { id: 'osteoblasto', etiqueta: 'Osteoblasto' },
  { id: 'osteocito', etiqueta: 'Osteocito' },
  { id: 'osteoclasto', etiqueta: 'Osteoclasto' },
];

export const CATALOGO_NODOS: Readonly<Record<Modelo3d, readonly NodoCatalogo[]>> = {
  mandibula: NODOS_MANDIBULA,
  celulas: NODOS_CELULAS,
};

/**
 * Ruta pública del GLB de cada modelo (F0-09 y F0-10 lo producen; aún no existen). Mientras no
 * existan, la mandíbula se muestra con el STL provisional de `scenes/` (F1-12) y sus nodos con
 * `ancla`; la escena que cargue el modelo decide qué hacer si el archivo falta (ver la sección
 * "3D" de la cabecera de activities/types.ts).
 */
export const RUTA_GLB: Readonly<Record<Modelo3d, string>> = {
  mandibula: '/models/mandibula.glb',
  celulas: '/models/celulas.glb',
};

/** Modelos cuyos nodos admiten `ancla` (el 3D de las células es de piezas separadas). */
export const MODELOS_CON_ANCLA: readonly Modelo3d[] = ['mandibula'];

/** ¿`id` es un nodo del catálogo del modelo? (Un nodo con `ancla` no necesita estarlo.) */
export function esNodoDelModelo(modelo: Modelo3d, id: string): boolean {
  return CATALOGO_NODOS[modelo].some((n) => n.id === id);
}

/**
 * Punto de un nodo por ancla, en coordenadas normalizadas (0 a 1) de la caja envolvente del
 * modelo, con los ejes del SUJETO (la persona a la que pertenece la mandíbula), no de la pantalla:
 *  - `x`: 0 = su lado derecho, 1 = su lado izquierdo (la cámara frontal ve el lado derecho del
 *    sujeto a la izquierda de la pantalla).
 *  - `y`: 0 = abajo (borde inferior del hueso), 1 = arriba (punta del cóndilo y de la coronoides).
 *  - `z`: 0 = posterior (atrás), 1 = anterior (adelante: el mentón).
 * El GLB definitivo debe respetar la misma convención (`+Y` arriba, `+Z` hacia delante).
 */
export interface AnclaNodo {
  x: number;
  y: number;
  z: number;
}

/**
 * Vistas de cámara con nombre. El contenido no lleva coordenadas (quien lo escribe no puede
 * previsualizar el 3D): elige una vista y la escena calcula la posición a partir de la caja
 * envolvente del nodo. Las direcciones son relativas al modelo, no a la pantalla:
 *  - `frontal`: vista anterior, la que trae la escena por defecto.
 *  - `posterior`: vista desde atrás.
 *  - `lateral_derecha` y `lateral_izquierda`: la cámara se coloca del lado derecho o izquierdo
 *    DEL SUJETO y mira hacia el modelo (en `lateral_derecha` se ve la cara externa del lado derecho).
 *  - `superior` e `inferior`: desde arriba y desde abajo.
 *  - `oblicua`: tres cuartos, ligeramente elevada; es la que mejor muestra el volumen.
 *  - `medial_derecha` y `medial_izquierda`: la cámara entra en el arco de la mandíbula y mira hacia fuera la cara
 *    MEDIAL (interna) de la rama de ese lado: `medial_derecha` muestra la cara interna de la rama derecha del
 *    sujeto, donde están el foramen mandibular y la língula. Solo tiene sentido al enfocar un nodo de la rama.
 */
export const VISTAS_CAMARA = [
  'frontal',
  'posterior',
  'lateral_derecha',
  'lateral_izquierda',
  'superior',
  'inferior',
  'oblicua',
  'medial_derecha',
  'medial_izquierda',
] as const;
export type VistaCamara = (typeof VISTAS_CAMARA)[number];

// <anclas-mandibula:inicio>
// GENERADO por tools/anclas/calcular_anclas.mjs a partir de la malla real. No editar a mano: se vuelve a
// generar con `node tools/anclas/calcular_anclas.mjs --escribir` (método en docs/anclas-mandibula.md).

/**
 * Cada estructura de la mandíbula que el contenido pide por ancla, con su punto SOBRE la superficie del hueso
 * (unos 0,6 mm por fuera), en coordenadas de ancla (ver `AnclaNodo`).
 *  - `lado`: en qué hemimandíbula está el punto. Las estructuras pares se reparten entre las dos para que los
 *    números no se amontonen en la vista inicial; `medio` es la línea media.
 *  - `normal`: la normal de la superficie en el punto (hacia fuera del hueso), para saber si mira a la cámara.
 *  - `vista`: la vista con nombre desde la que se ve el punto sin que otra parte del hueso o un diente lo tape.
 *    La escena la usa al enfocar el nodo cuando el contenido no fija una `camara`.
 */
export interface EstructuraMandibula {
  ancla: AnclaNodo;
  lado: 'derecha' | 'izquierda' | 'medio';
  normal: readonly [number, number, number];
  vista: VistaCamara;
}

export const ESTRUCTURAS_MANDIBULA: Readonly<Record<string, EstructuraMandibula>> = {
  agujero_mentoniano: {
    ancla: { x: 0.292, y: 0.176, z: 0.768 },
    lado: 'derecha',
    normal: [-0.68, 0.1, 0.73],
    vista: 'frontal',
  },
  angulo: {
    ancla: { x: 0.135, y: 0.334, z: 0.138 },
    lado: 'derecha',
    normal: [0.2, -0.72, -0.66],
    vista: 'posterior',
  },
  apofisis_alveolar: {
    ancla: { x: 0.796, y: 0.282, z: 0.665 },
    lado: 'izquierda',
    normal: [0.79, 0.07, 0.61],
    vista: 'frontal',
  },
  apofisis_coronoides: {
    ancla: { x: 0.086, y: 0.868, z: 0.508 },
    lado: 'derecha',
    normal: [0.08, 0.99, 0.12],
    vista: 'frontal',
  },
  borde_basal: {
    ancla: { x: 0.317, y: 0.065, z: 0.778 },
    lado: 'derecha',
    normal: [-0.71, -0.37, 0.6],
    vista: 'frontal',
  },
  canino_zona_compresion: {
    ancla: { x: 0.663, y: 0.226, z: 0.859 },
    lado: 'izquierda',
    normal: [0.6, -0.3, 0.74],
    vista: 'frontal',
  },
  canino_zona_tension: {
    ancla: { x: 0.403, y: 0.21, z: 0.898 },
    lado: 'derecha',
    normal: [-0.05, -0.55, 0.83],
    vista: 'frontal',
  },
  condilo: {
    ancla: { x: 0.915, y: 1, z: 0.052 },
    lado: 'izquierda',
    normal: [-0.02, 0.99, -0.13],
    vista: 'frontal',
  },
  cortical_basal: {
    ancla: { x: 0.434, y: 0.06, z: 0.898 },
    lado: 'derecha',
    normal: [-0.51, -0.07, 0.86],
    vista: 'frontal',
  },
  cresta_alveolar: {
    ancla: { x: 0.36, y: 0.325, z: 0.821 },
    lado: 'derecha',
    normal: [-0.24, 0.97, 0.06],
    vista: 'medial_derecha',
  },
  cuello_condilo: {
    ancla: { x: 0.967, y: 0.782, z: 0.081 },
    lado: 'izquierda',
    normal: [0.9, -0.41, -0.17],
    vista: 'lateral_izquierda',
  },
  cuerpo: {
    ancla: { x: 0.159, y: 0.242, z: 0.576 },
    lado: 'derecha',
    normal: [-0.9, -0.15, 0.41],
    vista: 'oblicua',
  },
  cuerpo_mandibular_basal: {
    ancla: { x: 0.614, y: 0.061, z: 0.86 },
    lado: 'izquierda',
    normal: [0.64, -0.06, 0.77],
    vista: 'frontal',
  },
  cuerpo_molares: {
    ancla: { x: 0.163, y: 0.211, z: 0.576 },
    lado: 'derecha',
    normal: [-0.89, -0.19, 0.41],
    vista: 'oblicua',
  },
  escotadura_mandibular: {
    ancla: { x: 0.916, y: 0.756, z: 0.37 },
    lado: 'izquierda',
    normal: [-0.33, 0.93, -0.15],
    vista: 'oblicua',
  },
  foramen_mandibular: {
    ancla: { x: 0.136, y: 0.586, z: 0.207 },
    lado: 'derecha',
    normal: [0.92, 0.33, 0.23],
    vista: 'medial_derecha',
  },
  foramen_mentoniano: {
    ancla: { x: 0.292, y: 0.176, z: 0.768 },
    lado: 'derecha',
    normal: [-0.68, 0.1, 0.73],
    vista: 'frontal',
  },
  hueso_trabecular_cuerpo: {
    ancla: { x: 0.739, y: 0.144, z: 0.731 },
    lado: 'izquierda',
    normal: [0.78, -0.35, 0.51],
    vista: 'frontal',
  },
  lamina_dura: {
    ancla: { x: 0.211, y: 0.325, z: 0.661 },
    lado: 'derecha',
    normal: [-0.74, 0.42, 0.53],
    vista: 'frontal',
  },
  linea_milohioidea: {
    ancla: { x: 0.628, y: 0.21, z: 0.677 },
    lado: 'izquierda',
    normal: [-0.86, -0.02, -0.51],
    vista: 'posterior',
  },
  proceso_alveolar: {
    ancla: { x: 0.796, y: 0.282, z: 0.665 },
    lado: 'izquierda',
    normal: [0.79, 0.07, 0.61],
    vista: 'frontal',
  },
  rama: {
    ancla: { x: 0.902, y: 0.37, z: 0.278 },
    lado: 'izquierda',
    normal: [1, 0.06, 0.03],
    vista: 'lateral_izquierda',
  },
  septo_interdental: {
    ancla: { x: 0.237, y: 0.32, z: 0.709 },
    lado: 'derecha',
    normal: [-0.71, 0.16, 0.68],
    vista: 'frontal',
  },
  sinfisis: {
    ancla: { x: 0.5, y: 0.083, z: 0.938 },
    lado: 'medio',
    normal: [-0.05, 0.05, 1],
    vista: 'frontal',
  },
  tabla_cortical_lingual: {
    ancla: { x: 0.675, y: 0.339, z: 0.615 },
    lado: 'izquierda',
    normal: [-0.86, 0.5, -0.11],
    vista: 'oblicua',
  },
  tabla_cortical_vestibular: {
    ancla: { x: 0.525, y: 0.284, z: 0.944 },
    lado: 'izquierda',
    normal: [0.19, 0.47, 0.86],
    vista: 'frontal',
  },
};

/** Ancla del lado DERECHO de las piezas del catálogo (las usa la escena si el nodo del contenido no lleva ancla). */
export const ANCLAS_PIEZAS_DERECHA: Readonly<Record<string, AnclaNodo>> = {
  condilo: { x: 0.092, y: 1, z: 0.053 },
  apofisis_coronoides: { x: 0.086, y: 0.868, z: 0.508 },
  rama: { x: 0.072, y: 0.547, z: 0.28 },
  angulo: { x: 0.135, y: 0.334, z: 0.138 },
  cuerpo: { x: 0.19, y: 0.209, z: 0.636 },
  sinfisis: { x: 0.5, y: 0.083, z: 0.938 },
  foramen_mentoniano: { x: 0.292, y: 0.176, z: 0.768 },
};
// <anclas-mandibula:fin>

/**
 * La estructura calculada de un nodo, si es la que dice su id: un nodo cuyo ancla coincide con la de
 * `ESTRUCTURAS_MANDIBULA` (el contenido la copia de ahí) hereda su normal y su vista recomendada. Un nodo
 * con un ancla distinta (puesta a mano por quien escribe el contenido) no hereda nada: sus datos ya no
 * describen ese punto.
 */
export function estructuraDeNodo(
  id: string,
  ancla: AnclaNodo | undefined,
): EstructuraMandibula | null {
  if (!ancla || !Object.hasOwn(ESTRUCTURAS_MANDIBULA, id)) return null;
  const estructura = ESTRUCTURAS_MANDIBULA[id];
  if (!estructura) return null;
  const { x, y, z } = estructura.ancla;
  const coincide =
    Math.abs(ancla.x - x) < 1e-3 && Math.abs(ancla.y - y) < 1e-3 && Math.abs(ancla.z - z) < 1e-3;
  return coincide ? estructura : null;
}

/* -------------------------------------------------------------------------------------------
 * Escenas PROCEDURALES con línea de tiempo (prototipo BMU, docs/escena-3d-bmu.md)
 * ----------------------------------------------------------------------------------------- */

/**
 * Valor de `config.modelo` para una escena hecha por código (no hay GLB): sus formas son
 * esquemáticas y su estado es una función pura del tiempo `t` (0 a 1). No entra en `MODELOS_3D`
 * porque no tiene catálogo de nodos, ni ruta de GLB, ni anclas: en su lugar lleva una
 * `linea_de_tiempo` de pasos.
 */
export const MODELO_PROCEDURAL = 'procedural';

/** Escenas procedurales disponibles y las vistas de cámara con nombre de cada una. */
export const VISTAS_ESCENA_PROCEDURAL = {
  bmu_remodelado: ['general', 'perfil', 'extremo', 'detalle'],
  hueso_largo_a_osteona: ['general', 'interior', 'corte', 'capas', 'osteona', 'detalle'],
  matriz_osea: ['general', 'fibra', 'fibrilla', 'detalle', 'carga'],
  hueso_alveolar: ['general', 'corte', 'raiz', 'conducto'],
  alveolo_postextraccion: ['general', 'corte', 'alveolo', 'reborde'],
  hueso_trabecular_tiempo: ['general', 'detalle', 'corte', 'comparacion'],
  reparacion_fractura: ['general', 'corte', 'callo', 'detalle'],
  movimiento_ortodontico: ['general', 'corte', 'compresion', 'tension'],
  vesicula_matriz: ['general', 'vesicula', 'interior', 'cristal'],
  dos_rutas_osificacion: ['general', 'intramembranosa', 'endocondral', 'detalle'],
  mandibula_fetal: ['general', 'lateral', 'corte', 'detalle'],
  osteoclasto_resorcion: ['general', 'celula', 'borde', 'laguna'],
  osteocito_red: ['general', 'laguna', 'canaliculos', 'red', 'superficie'],
  osteoblasto_celula: ['general', 'celula', 'organulos', 'matriz', 'detalle'],
} as const;

export const ESCENAS_PROCEDURALES = [
  'bmu_remodelado',
  'hueso_largo_a_osteona',
  'matriz_osea',
  'hueso_alveolar',
  'osteoblasto_celula',
  'osteocito_red',
  'osteoclasto_resorcion',
  'mandibula_fetal',
  'dos_rutas_osificacion',
  'vesicula_matriz',
  'movimiento_ortodontico',
  'reparacion_fractura',
  'hueso_trabecular_tiempo',
  'alveolo_postextraccion',
] as const;
export type EscenaProcedural = (typeof ESCENAS_PROCEDURALES)[number];

/** Vistas de cámara con nombre de una escena procedural (la primera es la general). */
export function vistasDeEscenaProcedural(escena: EscenaProcedural): readonly string[] {
  return VISTAS_ESCENA_PROCEDURAL[escena];
}
