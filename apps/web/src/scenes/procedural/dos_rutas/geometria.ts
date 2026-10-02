/**
 * Formas de la escena de las dos rutas (aquí sí se usa three). Son funciones de construcción: reciben números y
 * devuelven geometrías; no tienen estado ni dibujan nada. Las fuentes de los números están en `estado.ts` y
 * `disposicion.ts`, que son puros.
 *
 * Convención: las piezas repetidas o que cambian de tamaño se construyen con tamaño UNITARIO (esfera de radio 1,
 * caja de lado 1, cilindro de radio 1 y alto 1, tramo de largo 1 a lo largo de +Y) para que cada instancia o cada
 * malla solo tenga que colocarse, girarse y escalarse.
 */
import type { BufferGeometry } from 'three';
import { BoxGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { anillo } from '../hueso/geometria';
import { grados } from './disposicion';
import { APERTURA_COLLAR } from './estado';

export const DOS_PI = Math.PI * 2;

/** Esfera unitaria de pocos polígonos: células, núcleos, lagunas, osteoclastos. */
export function esfera(ancho = 8, alto = 6): BufferGeometry {
  return new SphereGeometry(1, ancho, alto);
}

/** Caja de lado 1 centrada en el origen: el panel de mesénquima y las tablas compactas. */
export function caja(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}

/**
 * Tramo: cilindro de radio 1 y largo 1 a lo largo de +Y con la base en el origen, para que una instancia escalada
 * en Y "se alargue" desde su punto de partida (espículas, trabéculas y vasos).
 */
export function tramo(segmentos = 6): BufferGeometry {
  const g = new CylinderGeometry(1, 1, 1, segmentos, 1, false);
  g.translate(0, 0.5, 0);
  return g;
}

/** Cilindro cerrado de radio 1 y alto 1 centrado en el origen (cartílago, calcificado, cavidad medular, vasos). */
export function cilindro(segmentos = 24): BufferGeometry {
  return new CylinderGeometry(1, 1, 1, segmentos, 1, false);
}

/**
 * Anillo alrededor de Y, de alto 1, abierto hacia la cámara (+Z) en `APERTURA_COLLAR` grados para ver el interior:
 * el collar perióstico, la cortical y el pericondrio. Con las caras de corte (lo da `anillo` del hueso).
 */
export function anilloAbierto(interior: number, exterior: number, segmentos = 40): BufferGeometry {
  const apertura = grados(APERTURA_COLLAR);
  return anillo(interior, exterior, 1, apertura / 2, DOS_PI - apertura, segmentos);
}

/** Aro fino y plano (en el plano XZ) para las osteonas de la tabla superior. */
export function aro(interior: number, exterior: number, segmentos = 18): BufferGeometry {
  return anillo(interior, exterior, 0.012, 0, DOS_PI, segmentos);
}
