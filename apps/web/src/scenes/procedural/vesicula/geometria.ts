/**
 * Formas de la escena de la vesícula de matriz (aquí sí se usa three). Son funciones de construcción: reciben
 * números y devuelven geometrías; no tienen estado ni dibujan nada. Las fuentes de los números (posiciones,
 * direcciones, largos) están en `estado.ts` y `disposicion.ts`, que son puros.
 *
 * Convención: las piezas alargadas se construyen de largo 1 para que las instancias solo tengan que escalarse:
 * las placas a lo largo de X; el cuello y las proteínas de membrana a lo largo de Y.
 */
import type { BufferGeometry } from 'three';
import { BoxGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías de la escena de la vesícula.');
  return unida;
}

/** Caja de lado 1 centrada en el origen: cada instancia la escala a su tamaño (enzimas de membrana). */
export function caja(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}

/** Esfera de radio 1 (vesículas, iones, núcleo amorfo). */
export function esfera(segmentos = 24, anillos = 16): BufferGeometry {
  return new SphereGeometry(1, segmentos, anillos);
}

/**
 * Media esfera de radio 1: solo la mitad trasera (z <= 0), de modo que la cámara, que mira desde +Z, ve el
 * interior por la cara abierta. En `SphereGeometry` el acimut `phi` arranca en -X y pasa por +Z en pi / 2, así que
 * la mitad con z <= 0 va de pi a 2 pi.
 */
export function hemisferio(segmentos = 24, anillos = 16): BufferGeometry {
  return new SphereGeometry(1, segmentos, anillos, Math.PI, Math.PI);
}

/** Placa (caja) de `largo` en X, `alto` en Y y `grosor` en Z, centrada en el origen: un cristal de hidroxiapatita. */
export function placa(largo: number, alto: number, grosor: number): BufferGeometry {
  return new BoxGeometry(largo, alto, grosor);
}

/**
 * Placa de largo 1 a lo largo de +X con un extremo en el origen: los cristales que crecen desde un punto de
 * anclaje solo se escalan en X. `alto` y `grosor` son relativos a la unidad.
 */
export function placaDesdeOrigen(alto: number, grosor: number): BufferGeometry {
  const g = new BoxGeometry(1, alto, grosor);
  g.translate(0.5, 0, 0);
  return g;
}

/** Cilindro con tapas de radio `radio` y largo `largo` tumbado a lo largo de X (segmentos del bandeo de una fibrilla). */
export function tubo(radio: number, largo: number, segmentos = 10): BufferGeometry {
  const g = new CylinderGeometry(radio, radio, largo, segmentos, 1, false);
  g.rotateZ(Math.PI / 2);
  return g;
}

/** Cilindro de radio 1 y alto 1 a lo largo de Y, centrado: canales, transportadores y enzimas de la vesícula. */
export function cilindro(segmentos = 10): BufferGeometry {
  return new CylinderGeometry(1, 1, 1, segmentos, 1, false);
}

/**
 * Cuello de gemación: un tronco de cono a lo largo de Y entre y = 0 (radio 0,55, el lado de la vesícula) y
 * y = 1 (radio 1, el lado de la membrana), abierto por los dos extremos.
 */
export function cuello(segmentos = 14): BufferGeometry {
  const g = new CylinderGeometry(1, 0.55, 1, segmentos, 1, true);
  g.translate(0, 0.5, 0);
  return g;
}

/** Mancuerna de largo 1 a lo largo de X: dos esferas de radio `radio` unidas, una molécula de pirofosfato. */
export function mancuerna(radio = 0.28, segmentos = 8, anillos = 6): BufferGeometry {
  const a = new SphereGeometry(radio, segmentos, anillos);
  a.translate(-0.5 + radio, 0, 0);
  const b = new SphereGeometry(radio, segmentos, anillos);
  b.translate(0.5 - radio, 0, 0);
  const puente = new CylinderGeometry(radio * 0.45, radio * 0.45, 1 - 2 * radio, 6, 1, true);
  puente.rotateZ(Math.PI / 2);
  return unir([a, b, puente]);
}

/** Función de altura de una superficie ondulada: desplazamiento en Y para cada (x, z). */
export type Onda = (x: number, z: number) => number;

/**
 * Lámina ondulada de `ancho` (X) por `fondo` (Z) centrada en el origen del plano XZ, con la altura `onda(x, z)`
 * sumada a cada vértice: la membrana basal del osteoblasto.
 */
export function laminaOndulada(
  ancho: number,
  fondo: number,
  nx: number,
  nz: number,
  onda: Onda,
): BufferGeometry {
  const g = new PlaneGeometry(ancho, fondo, nx, nz);
  // El plano nace en XY mirando a +Z; tumbado queda en XZ mirando a +Y.
  g.rotateX(-Math.PI / 2);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, onda(pos.getX(i), pos.getZ(i)));
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/**
 * Losa de `ancho` (X) por `fondo` (Z) y `grosor` (Y), apoyada sobre y = 0 (va de 0 a `grosor`), cuya cara inferior
 * sigue la onda `onda(x, z)`: el citoplasma que queda sobre la membrana. Solo se desplazan los vértices de abajo,
 * de modo que la losa sigue cerrada.
 */
export function losaOndulada(
  ancho: number,
  fondo: number,
  grosor: number,
  nx: number,
  nz: number,
  onda: Onda,
): BufferGeometry {
  const g = new BoxGeometry(ancho, grosor, fondo, nx, 1, nz);
  g.translate(0, grosor / 2, 0);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < grosor * 0.25) {
      pos.setY(i, onda(pos.getX(i), pos.getZ(i)));
    }
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}
