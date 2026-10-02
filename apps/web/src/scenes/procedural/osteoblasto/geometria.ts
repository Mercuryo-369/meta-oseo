/**
 * Formas de la escena del osteoblasto (aquí sí se usa three). Son funciones de construcción: reciben números y
 * devuelven geometrías; no tienen estado ni dibujan nada. Las fuentes de los números están en `estado.ts` y
 * `disposicion.ts`, que son puros.
 */
import type { BufferGeometry } from 'three';
import { BoxGeometry, CircleGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Caja de lado 1 centrada en el origen: cada instancia la escala a su tamaño. */
export function caja(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}

/**
 * Cuerpo celular: una caja de lado 2 (semiejes 1) con aristas muy redondeadas. Escalada a lo ancho y bajo se lee
 * como una célula fusiforme; con los tres semiejes parecidos, como un osteoblasto cúbico o poligonal; aplastada,
 * como una célula de revestimiento.
 */
export function cuerpoCelular(radio = 0.42, segmentos = 5): BufferGeometry {
  return new RoundedBoxGeometry(2, 2, 2, segmentos, radio);
}

/** Esfera unidad (núcleos, nucléolos, mitocondrias, vesículas, fragmentos). */
export function esfera(segmentos = 14, anillos = 10): BufferGeometry {
  return new SphereGeometry(1, segmentos, anillos);
}

/** Cilindro de largo `largo` tumbado a lo largo de X (el capilar). */
export function tubo(radio: number, largo: number, segmentos = 18): BufferGeometry {
  const g = new CylinderGeometry(radio, radio, largo, segmentos, 1);
  g.rotateZ(Math.PI / 2);
  return g;
}

/** Disco unidad en el plano XY (mira a +Z): la laguna y el osteocito cortados en la cara. */
export function disco(segmentos = 28): BufferGeometry {
  return new CircleGeometry(1, segmentos);
}
