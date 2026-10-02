/**
 * Vistas de cámara con nombre de la escena de la fractura (lógica pura). Cada vista es una posición esférica
 * alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la escena de la
 * BMU (`../bmu/vistas.ts`). Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.reparacion_fractura`.
 *
 * El hueso está tumbado a lo largo de X con la brecha en el origen; la cuña que se abre en las vistas de corte
 * mira hacia +Y (arriba), así que esas vistas son elevadas.
 *
 *  - `general`: la diáfisis fracturada entera, en tres cuartos: se ve el manguito del callo por fuera.
 *  - `corte`: elevada y más cerca, mirando dentro de la cuña abierta: cortical, médula, brecha y callo interno.
 *  - `callo`: baja y cerca del centro, para ver el manguito del callo y las células sobre su superficie.
 *  - `detalle`: muy cerca de la brecha, desde arriba, con la cuña abierta: vasos, células y hueso nuevo.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 24, elevacion: 22, distancia: 11.5, objetivo: [0, 0, 0] },
  corte: { azimut: 10, elevacion: 54, distancia: 9, objetivo: [0, 0.1, 0] },
  callo: { azimut: 30, elevacion: 16, distancia: 7.4, objetivo: [0, 0.1, 0] },
  detalle: { azimut: 8, elevacion: 50, distancia: 5.2, objetivo: [0, 0.3, 0] },
};

export function vistaFractura(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaFractura(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaFractura(nombre), aspecto);
}

/** Vistas en las que la cuña del hueso se abre para ver dentro. */
export function vistaAbierta(nombre: string): boolean {
  return nombre === 'corte' || nombre === 'detalle';
}
