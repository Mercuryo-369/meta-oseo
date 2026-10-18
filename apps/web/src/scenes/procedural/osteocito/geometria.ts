/**
 * Formas de la escena del osteocito (aquí sí se usa three). Son funciones de construcción: reciben números y
 * devuelven geometrías; no tienen estado ni dibujan nada. Las fuentes de los números (posiciones, rutas) están
 * en `estado.ts` y `disposicion.ts`, que son puros.
 *
 * Convención: las piezas repetidas se construyen con tamaño UNITARIO (tramo de largo 1 a lo largo de Y, esfera
 * de radio 1) para que cada instancia solo tenga que colocarse, girarse y escalarse.
 *
 * Realismo (2026-10-14): todas llevan UV (el relieve de los materiales de `realismo.ts` las necesita); las cajas
 * grandes (paredes del bloque, osteoide) las llevan en unidades de escena (`uvPorCaras`) para que el relieve no
 * se estire en sus caras alargadas.
 */
import type { BufferGeometry } from 'three';
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  SphereGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const DOS_PI = Math.PI * 2;

function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías de la escena del osteocito.');
  return unida;
}

/**
 * Sustituye las UV de una forma de caras planas alineadas con los ejes (una caja o un plano) por UV en unidades
 * de escena: cada vértice toma las dos coordenadas del plano de su cara, multiplicadas por `medidas` (para una
 * caja de lado 1 que la malla escala). Así una repetición del relieve mide lo mismo en todas las caras. Con
 * `girar` se intercambian las dos coordenadas: las vetas del patrón `fibras` (que corren a lo largo de la V)
 * quedan a lo largo de X en las caras de arriba y de delante.
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

/**
 * Tramo de dendrita o de canalículo: cilindro abierto de radio 1 y largo 1 a lo largo de Y, con la base en el
 * origen (crece hacia +Y), para que una instancia escalada en Y "se alargue" desde su punto de partida.
 */
export function tramo(segmentos = 6): BufferGeometry {
  const g = new CylinderGeometry(1, 1, 1, segmentos, 1, true);
  g.translate(0, 0.5, 0);
  return g;
}

/** Esfera unitaria: cuerpos celulares, núcleos, uniones, partículas (cada pieza elige su resolución). */
export function esfera(ancho = 12, alto = 9): BufferGeometry {
  return new SphereGeometry(1, ancho, alto);
}

/**
 * Célula de la superficie: caja unidad de aristas redondeadas con la base en y = 0, que crece hacia arriba al
 * activarse. Escalada baja se lee como una célula de revestimiento (un almohadón plano); alta, como un
 * osteoblasto cúbico. Antes era una caja de aristas vivas.
 */
export function celulaDesdeBase(radio = 0.32, segmentos = 2): BufferGeometry {
  const g = new RoundedBoxGeometry(1, 1, 1, segmentos, radio);
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

/** Caja de medidas reales con UV en unidades de escena (paredes del bloque, osteoide de la superficie). */
export function cajaEnEscala(
  ancho: number,
  alto: number,
  fondo: number,
  girar = false,
): BufferGeometry {
  return uvPorCaras(new BoxGeometry(ancho, alto, fondo), [1, 1, 1], girar);
}
