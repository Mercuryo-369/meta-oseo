/**
 * Formas de la escena de la matriz ósea (aquí sí se usa three). Son funciones de construcción: reciben números
 * y devuelven geometrías; no tienen estado ni dibujan nada. Las fuentes de los números (posiciones, largos,
 * ángulos) están en `estado.ts` y `disposicion.ts`, que son puros.
 *
 * Convención: todas las piezas alargadas (bastones, fibras, flechas) se construyen A LO LARGO DE X, de largo 1,
 * para que las instancias solo tengan que escalarse en X y girarse alrededor de Y o Z.
 */
import type { BufferGeometry } from 'three';
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Une varias geometrías en una (mismo material) y libera las partes. */
export function unir(partes: BufferGeometry[]): BufferGeometry {
  const unida = mergeGeometries(partes, false);
  for (const parte of partes) parte.dispose();
  if (!unida) throw new Error('No se pudieron unir las geometrías de la escena de la matriz.');
  return unida;
}

/** Bastón (cilindro con tapas) de radio `radio` y largo 1 a lo largo de X, centrado en el origen. */
export function baston(radio: number, segmentos = 6): BufferGeometry {
  const g = new CylinderGeometry(radio, radio, 1, segmentos, 1, false);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Placa (caja) de `largo` en X, `alto` en Y y `grosor` en Z, centrada en el origen: un cristal de hidroxiapatita. */
export function placa(largo: number, alto: number, grosor: number): BufferGeometry {
  return new BoxGeometry(largo, alto, grosor);
}

/** Esfera de radio 1 y pocos polígonos: una proteína globular. */
export function globulo(): BufferGeometry {
  return new SphereGeometry(1, 10, 8);
}

/**
 * Flecha de largo 1 a lo largo de +X, con la cola en el origen: un asta cilíndrica y una punta cónica. `radio`
 * es el del asta; la punta mide `puntaFraccion` del largo total y el doble y medio del radio del asta.
 */
export function flecha(radio = 0.09, puntaFraccion = 0.34): BufferGeometry {
  const largoPunta = puntaFraccion;
  const largoAsta = 1 - largoPunta;
  const asta = new CylinderGeometry(radio, radio, largoAsta, 12, 1, false);
  asta.translate(0, largoAsta / 2, 0);
  const punta = new ConeGeometry(radio * 2.5, largoPunta, 14, 1, false);
  punta.translate(0, largoAsta + largoPunta / 2, 0);
  const g = unir([asta, punta]);
  // Construida a lo largo de +Y; se tumba para que apunte a +X.
  g.rotateZ(-Math.PI / 2);
  return g;
}

/**
 * Sustituye las UV de una forma de caras planas alineadas con los ejes (cajas, ya colocadas) por UV en unidades de
 * escena: cada vértice toma las dos coordenadas del plano de su cara (caras ±X: (z, y); ±Y: (x, z); ±Z: (x, y)).
 * Así una repetición del relieve mide lo mismo en todas las caras, y dos cajas en sitios distintos muestran partes
 * distintas de la textura. Es la de `osteocito/geometria.ts` (pendiente de pasar a un módulo común).
 */
export function uvPorCaras(geometria: BufferGeometry): BufferGeometry {
  const posicion = geometria.getAttribute('position');
  const normal = geometria.getAttribute('normal');
  const uv = new Float32Array(posicion.count * 2);
  for (let i = 0; i < posicion.count; i++) {
    const x = posicion.getX(i);
    const y = posicion.getY(i);
    const z = posicion.getZ(i);
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));
    let u = x;
    let v = y;
    if (nx >= ny && nx >= nz) u = z;
    else if (ny >= nz) v = z;
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geometria.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return geometria;
}
