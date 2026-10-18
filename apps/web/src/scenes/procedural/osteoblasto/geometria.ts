/**
 * Formas de la escena del osteoblasto (aquí sí se usa three). Son funciones de construcción: reciben números y
 * devuelven geometrías; no tienen estado ni dibujan nada. Las fuentes de los números están en `estado.ts` y
 * `disposicion.ts`, que son puros.
 *
 * Realismo (2026-10-14): todas llevan UV (el relieve de los materiales de `realismo.ts` las necesita). Las cajas
 * de las capas de hueso llevan UV en unidades de escena (`cajaEnEscala`) para que el relieve no se estire en sus
 * caras alargadas.
 */
import type { BufferGeometry } from 'three';
import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  SphereGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Caja de lado 1 centrada en el origen: cada instancia la escala a su tamaño. */
export function caja(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}

/**
 * Sustituye las UV de una forma de caras planas alineadas con los ejes (una caja) por UV en unidades de escena:
 * cada vértice toma las dos coordenadas del plano de su cara, multiplicadas por `medidas` (el tamaño al que la
 * malla escala una caja de lado 1). Así una repetición del relieve mide lo mismo en todas las caras. Con
 * `girar` se intercambian las dos coordenadas: las vetas del patrón `fibras` (que corren a lo largo de la V)
 * quedan a lo largo de X en la cara de corte y en la de arriba.
 */
export function uvPorCaras(
  geometria: BufferGeometry,
  medidas: readonly [number, number, number] = [1, 1, 1],
  girar = false,
): BufferGeometry {
  const posicion = geometria.getAttribute('position');
  const normal = geometria.getAttribute('normal');
  const uv = new Float32Array(posicion.count * 2);
  for (let i = 0; i < posicion.count; i++) {
    const x = posicion.getX(i) * medidas[0];
    const y = posicion.getY(i) * medidas[1];
    const z = posicion.getZ(i) * medidas[2];
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));
    // Caras ±X: (z, y); caras ±Y: (x, z); caras ±Z: (x, y).
    let u = x;
    let v = y;
    if (nx >= ny && nx >= nz) u = z;
    else if (ny >= nz) v = z;
    if (girar) [u, v] = [v, u];
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geometria.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return geometria;
}

/** Caja de lado 1 con UV en unidades de escena para las `medidas` a las que la malla la escala. */
export function cajaEnEscala(
  medidas: readonly [number, number, number],
  girar = false,
): BufferGeometry {
  return uvPorCaras(new BoxGeometry(1, 1, 1), medidas, girar);
}

/**
 * Cuerpo celular: una caja de lado 2 (semiejes 1) con aristas muy redondeadas. Escalada a lo ancho y bajo se lee
 * como una célula fusiforme; con los tres semiejes parecidos, como un osteoblasto cúbico o poligonal; aplastada,
 * como una célula de revestimiento. Radio 0,5 (antes 0,42): bordes más blandos, sin dejar de leerse cúbica.
 */
export function cuerpoCelular(radio = 0.5, segmentos = 5): BufferGeometry {
  return new RoundedBoxGeometry(2, 2, 2, segmentos, radio);
}

/**
 * Esfera unidad (núcleos, nucléolos, mitocondrias, vesículas, fragmentos). 16 × 12 (antes 14 × 10): silueta lisa
 * también en la vista de los orgánulos, la más cercana.
 */
export function esfera(segmentos = 16, anillos = 12): BufferGeometry {
  return new SphereGeometry(1, segmentos, anillos);
}

/**
 * Radio de la cisterna: con 0,56 la planta del elipsoide ocupa lo mismo que la caja de lado 1 que la dibujaba
 * antes (cada instancia la escala con los semiejes de su pieza).
 */
export const R_CISTERNA = 0.56;

/**
 * Cisterna del retículo o sáculo del Golgi: un elipsoide que cada instancia aplasta, con el borde redondeado de
 * un saco membranoso (antes era una caja de aristas vivas).
 */
export function cisterna(segmentos = 16, anillos = 10): BufferGeometry {
  return new SphereGeometry(R_CISTERNA, segmentos, anillos);
}

/** Ribosoma: icosaedro de radio 1 (20 triángulos). A su tamaño en pantalla, unos píxeles, se lee como un grano. */
export function ribosoma(): BufferGeometry {
  return new IcosahedronGeometry(1, 0);
}

/** Cilindro de largo `largo` tumbado a lo largo de X (el capilar). */
export function tubo(radio: number, largo: number, segmentos = 24): BufferGeometry {
  const g = new CylinderGeometry(radio, radio, largo, segmentos, 1);
  g.rotateZ(Math.PI / 2);
  return g;
}

/** Disco unidad en el plano XY (mira a +Z): la laguna del osteocito cortada en la cara. */
export function disco(segmentos = 28): BufferGeometry {
  return new CircleGeometry(1, segmentos);
}
