/**
 * Formas de la escena del hueso trabecular (aquí sí se usa three). Son funciones de construcción: reciben
 * números y devuelven geometrías; no tienen estado ni dibujan nada. Casi todo se instancia: una caja unidad para
 * las tiras de las placas y la cortical, un cilindro unidad para las barras y los poros, una esfera para las
 * células y un disco para los hoyos. Las mallas (`mallas.ts`) las escalan con matrices de instancia.
 */
import type { BufferGeometry } from 'three';
import { BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías de la escena trabecular.');
  return unida;
}

/** Caja de lado 1 centrada en el origen (12 triángulos). */
export function cajaUnidad(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}

/** Cilindro de radio 1 y alto 1 a lo largo de Y, con tapas. */
export function cilindroUnidad(segmentos = 7): BufferGeometry {
  return new CylinderGeometry(1, 1, 1, segmentos, 1, false);
}

/** Esfera de radio 1, de pocos polígonos. */
export function esferaUnidad(): BufferGeometry {
  return new SphereGeometry(1, 10, 7);
}

/** Disco de radio 1 en el plano XY, mirando a +Z. */
export function discoUnidad(segmentos = 18): BufferGeometry {
  return new CircleGeometry(1, segmentos);
}

/**
 * Flecha que apunta hacia -Y (hacia abajo): un vástago y una punta. La punta queda en el origen y el vástago
 * sube desde ella `largo` unidades, así la flecha se apoya donde se coloca.
 */
export function flecha(largo: number, radio: number): BufferGeometry {
  const largoPunta = radio * 3.2;
  const punta = new ConeGeometry(radio * 2.1, largoPunta, 14);
  // ConeGeometry apunta a +Y: se invierte para que la punta mire hacia abajo y se apoye en el origen.
  punta.rotateZ(Math.PI);
  punta.translate(0, largoPunta / 2, 0);
  const vastago = new CylinderGeometry(radio, radio, largo - largoPunta, 12);
  vastago.translate(0, largoPunta + (largo - largoPunta) / 2, 0);
  return unir([punta, vastago]);
}
