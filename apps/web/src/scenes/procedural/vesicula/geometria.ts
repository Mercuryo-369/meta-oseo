/**
 * Formas de la escena de la vesícula de matriz (aquí sí se usa three). Son funciones de construcción: reciben
 * números y devuelven geometrías; no tienen estado ni dibujan nada. Las fuentes de los números (posiciones,
 * direcciones, largos) están en `estado.ts` y `disposicion.ts`, que son puros.
 *
 * Convención: las piezas alargadas se construyen de largo 1 para que las instancias solo tengan que escalarse:
 * las placas a lo largo de X; el cuello y las proteínas de membrana a lo largo de Y.
 */
import type { BufferGeometry } from 'three';
import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías de la escena de la vesícula.');
  return unida;
}

/**
 * Glóbulo de diámetro 1 centrado en el origen (ocupa el cubo de lado 1 de las cajas que sustituye; con un número
 * par de anillos pasa por el ecuador): cada instancia lo escala a su tamaño. Las enzimas de la membrana son
 * proteínas globulares, no cajas. Pocos lados: son piezas pequeñas.
 */
export function globulo(segmentos = 8, anillos = 6): BufferGeometry {
  return new SphereGeometry(0.5, segmentos, anillos);
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

/**
 * Tramo del bandeo de una fibrilla: cilindro de radio `radio` y largo 1 a lo largo de X, centrado, ABIERTO por los
 * extremos, porque los tramos se tocan y sus tapas quedarían dentro de la fibrilla. Con `tapa` lleva un disco
 * solo en el extremo -X: el primer tramo de la fibrilla cierra así su punta y el último, girado media vuelta, la
 * otra. Sin las tapas ocultas caben más lados en el mismo presupuesto de triángulos.
 */
export function tramoFibrilla(radio: number, segmentos = 14, tapa = false): BufferGeometry {
  const lado = new CylinderGeometry(radio, radio, 1, segmentos, 1, true);
  // El eje Y pasa a X (el extremo +Y queda en -X).
  lado.rotateZ(Math.PI / 2);
  if (!tapa) return lado;
  const disco = new CircleGeometry(radio, segmentos);
  // El disco nace mirando a +Z; girado -90° alrededor de Y mira a -X.
  disco.rotateY(-Math.PI / 2);
  disco.translate(-0.5, 0, 0);
  return unir([lado, disco]);
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
 * sumada a cada vértice: la membrana del polo secretor del osteoblasto.
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
 * de modo que la losa sigue cerrada. Seis caras: la inferior con `nx` × `nz` celdas (sigue la onda), la superior
 * plana de una sola celda (antes tenía tantas como la inferior sin necesitarlas) y cuatro laterales de una fila
 * cuyo borde de abajo sigue la onda.
 */
export function losaOndulada(
  ancho: number,
  fondo: number,
  grosor: number,
  nx: number,
  nz: number,
  onda: Onda,
): BufferGeometry {
  const mx = ancho / 2;
  const mz = fondo / 2;
  // Los planos nacen en XY mirando a +Z: girados alrededor de X miran abajo o arriba, alrededor de Y a los lados.
  const abajo = new PlaneGeometry(ancho, fondo, nx, nz);
  abajo.rotateX(Math.PI / 2);
  const arriba = new PlaneGeometry(ancho, fondo, 1, 1);
  arriba.rotateX(-Math.PI / 2);
  arriba.translate(0, grosor, 0);
  const delante = new PlaneGeometry(ancho, grosor, nx, 1);
  delante.translate(0, grosor / 2, mz);
  const detras = new PlaneGeometry(ancho, grosor, nx, 1);
  detras.rotateY(Math.PI);
  detras.translate(0, grosor / 2, -mz);
  const derecha = new PlaneGeometry(fondo, grosor, nz, 1);
  derecha.rotateY(Math.PI / 2);
  derecha.translate(mx, grosor / 2, 0);
  const izquierda = new PlaneGeometry(fondo, grosor, nz, 1);
  izquierda.rotateY(-Math.PI / 2);
  izquierda.translate(-mx, grosor / 2, 0);
  const g = unir([abajo, arriba, delante, detras, derecha, izquierda]);
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
