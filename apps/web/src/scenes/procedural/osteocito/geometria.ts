/**
 * Formas de la escena del osteocito (aquí sí se usa three). Son funciones de construcción: reciben números y
 * devuelven geometrías; no tienen estado ni dibujan nada. Las fuentes de los números (posiciones, rutas) están
 * en `estado.ts` y `disposicion.ts`, que son puros.
 *
 * Convención: las piezas repetidas se construyen con tamaño UNITARIO (tramo de largo 1 a lo largo de Y, esfera
 * de radio 1) para que cada instancia solo tenga que colocarse, girarse y escalarse.
 */
import type { BufferGeometry } from 'three';
import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const DOS_PI = Math.PI * 2;

function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías de la escena del osteocito.');
  return unida;
}

/**
 * Tramo de dendrita o de canalículo: cilindro abierto de radio 1 y largo 1 a lo largo de Y, con la base en el
 * origen (crece hacia +Y), para que una instancia escalada en Y "se alargue" desde su punto de partida.
 */
export function tramo(segmentos = 6): BufferGeometry {
  const g = new CylinderGeometry(1, 1, 1, segmentos, 1, true);
  g.translate(0, 0.5, 0);
  return g;
}

/** Esfera unitaria de pocos polígonos: cuerpos celulares, núcleos, uniones, partículas. */
export function esfera(ancho = 12, alto = 9): BufferGeometry {
  return new SphereGeometry(1, ancho, alto);
}

/** Caja unitaria con la base en y = 0: una célula de la superficie que crece hacia arriba al activarse. */
export function cajaDesdeBase(): BufferGeometry {
  const g = new BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return g;
}

/**
 * Flecha de largo 1 a lo largo de −Y con la punta en el origen (apunta hacia abajo, hacia lo que empuja): un asta
 * cilíndrica y una punta cónica. `radio` es el del asta.
 */
export function flecha(radio = 0.09, puntaFraccion = 0.36): BufferGeometry {
  const largoPunta = puntaFraccion;
  const largoAsta = 1 - largoPunta;
  const asta = new CylinderGeometry(radio, radio, largoAsta, 12, 1, false);
  asta.translate(0, largoPunta + largoAsta / 2, 0);
  const punta = new ConeGeometry(radio * 2.6, largoPunta, 14, 1, false);
  punta.rotateX(Math.PI);
  punta.translate(0, largoPunta / 2, 0);
  return unir([asta, punta]);
}

/** Tubo abierto de radio `radio` y largo `largo` a lo largo de Z, centrado: el conducto de Havers y su capilar. */
export function tuboEnZ(
  radio: number,
  largo: number,
  segmentos = 28,
  abierto = true,
): BufferGeometry {
  const g = new CylinderGeometry(radio, radio, largo, segmentos, 1, abierto);
  g.rotateX(Math.PI / 2);
  return g;
}
