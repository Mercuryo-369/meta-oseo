/**
 * Esquema de luz común de las escenas 3D (revisión de diseño, 2026-10-15): valores y cálculos puros que usa
 * `EntornoRealista.vue`. Es el único sitio donde se ajusta la luz de las 16 escenas.
 *
 * Es el esquema de un estudio de ilustración médica:
 *  - Luz principal (clave), casi neutra, desde arriba a la izquierda de lo que se ve y a unos 45° de la dirección
 *    de la vista. Es la convención de la ilustración: el ojo lee el relieve suponiendo luz de arriba a la
 *    izquierda. Modela las formas, y sus sombras caen a la vista, abajo a la derecha, en vez de esconderse detrás
 *    de las piezas. Es la única que proyecta sombras.
 *  - Contraluz fría, desde detrás del objeto, arriba a la derecha: perfila los contornos y separa las piezas del
 *    fondo.
 *  - Relleno: hemisferio (cielo cálido, suelo pardo) y entorno de estudio, suaves. El lado en sombra recibe unas
 *    2/5 partes de la luz del iluminado: hay volumen sin negros.
 *
 * Las direcciones dependen solo de la orientación de la cámara, no de su distancia: el esquema es el mismo con
 * cualquier zoom y desde cualquier lado de la órbita.
 *
 * Antes (2026-10-14) cada escena llevaba sus luces unidas a la cámara (principal casi en el eje de la vista, como
 * un flash), y el entorno a 0,75, más la luz ambiental y el hemisferio, sumaba casi el doble de la luz que admite
 * un tejido claro: el marfil salía casi blanco y se perdían el relieve y las sombras.
 */
import type { Box3, Matrix4 } from 'three';
import { Vector3 } from 'three';

/**
 * Intensidades medidas para que un tejido claro (marfil) quede a ≈1,05 veces su albedo en la cara que mira a la
 * cámara y a ≈1/3 de eso en el lado en sombra. El RoomEnvironment de three no es uniforme: integrado sobre el
 * hemisferio da E/π ≈ 1,9 hacia delante y arriba y ≈ 0,5-0,6 hacia abajo y hacia atrás (con intensidad 1), así
 * que su intensidad va baja y gira con la cámara (ver EntornoRealista).
 */
export const ILUMINACION = {
  clave: { color: '#fff7ee', intensidad: 2.2 },
  contraluz: { color: '#d6e4ff', intensidad: 0.7 },
  hemisferio: { cielo: '#fff6e8', suelo: '#8d7a66', intensidad: 0.35 },
  /** Intensidad del mapa de entorno de estudio (`scene.environmentIntensity`). */
  entorno: 0.25,
} as const;

/** Dirección hacia cada luz en la base de la cámara: (derecha, arriba, hacia la cámara). */
type Componentes = readonly [number, number, number];
/** Arriba a la izquierda y del lado de la cámara: unos 45° de la dirección de la vista. */
export const HACIA_CLAVE: Componentes = [-0.45, 0.55, 0.7];
/** Arriba a la derecha y por detrás del objeto. */
export const HACIA_CONTRALUZ: Componentes = [0.5, 0.45, -0.74];

const _derecha = new Vector3();
const _arriba = new Vector3();
const _atras = new Vector3();

function combinar(c: Componentes, salida: Vector3): Vector3 {
  return salida
    .set(0, 0, 0)
    .addScaledVector(_derecha, c[0])
    .addScaledVector(_arriba, c[1])
    .addScaledVector(_atras, c[2])
    .normalize();
}

/**
 * Direcciones (unitarias, en el mundo) hacia la luz principal y hacia la contraluz para una cámara con la matriz
 * de mundo `matrizCamara`. Escribe en `clave` y `contraluz` (sin crear objetos: se llama en cada dibujo).
 */
export function direccionesLuces(matrizCamara: Matrix4, clave: Vector3, contraluz: Vector3): void {
  _derecha.setFromMatrixColumn(matrizCamara, 0).normalize();
  _arriba.setFromMatrixColumn(matrizCamara, 1).normalize();
  _atras.setFromMatrixColumn(matrizCamara, 2).normalize();
  combinar(HACIA_CLAVE, clave);
  combinar(HACIA_CONTRALUZ, contraluz);
}

/**
 * Radio de la escena alrededor del origen (donde las escenas centran su contenido), a partir de su caja
 * envolvente: redondeado hacia arriba a medias unidades para que no cambie en cada fotograma (la cámara de
 * sombras no «nada»), y acotado a [0,5, 12]. Con una caja vacía o no finita, 6.
 */
export function radioEscena(caja: Box3): number {
  if (caja.isEmpty()) return 6;
  const ejes = (['x', 'y', 'z'] as const).map((e) =>
    Math.max(Math.abs(caja.min[e]), Math.abs(caja.max[e])),
  );
  const r = Math.hypot(...ejes);
  if (!Number.isFinite(r)) return 6;
  return Math.min(12, Math.max(0.5, Math.ceil(r * 2) / 2));
}

export interface AjusteSombras {
  /** Semilado de la caja ortográfica de la cámara de sombras. */
  extension: number;
  /** Distancia de la luz principal al origen. */
  distancia: number;
  cerca: number;
  lejos: number;
  /** Desplazamiento en la normal: un texel y medio del mapa. */
  sesgoNormal: number;
  /** Sesgo de profundidad (en la profundidad normalizada de la cámara de sombras). */
  sesgo: number;
}

/**
 * Cámara de sombras de la luz principal ajustada a una escena de radio `radio` y a un mapa de `lado` píxeles: la
 * caja abarca justo la escena (toda la resolución se aprovecha: sombras nítidas) y los sesgos se miden en texels
 * (sombras pegadas a las piezas, sin acné). Antes era una caja fija de ±8 con un desplazamiento de 0,035
 * unidades: en la mandíbula (radio 1) se perdía casi toda la resolución, y en las células las sombras se
 * despegaban.
 */
export function ajusteSombras(radio: number, lado: number): AjusteSombras {
  const extension = radio * 1.1;
  const distancia = radio * 3;
  return {
    extension,
    distancia,
    cerca: distancia - radio * 1.25,
    lejos: distancia + radio * 1.25,
    sesgoNormal: ((2 * extension) / lado) * 1.5,
    sesgo: -0.0004,
  };
}
