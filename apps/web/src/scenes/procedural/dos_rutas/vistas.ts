/**
 * Vistas de cámara con nombre de la escena de las dos rutas (lógica pura). Cada vista es una posición esférica
 * alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la escena de la
 * BMU (`../bmu/vistas.ts`). Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.dos_rutas_osificacion`.
 *
 *  - `general`: los dos paneles juntos, de frente y algo elevada: se comparan las dos rutas.
 *  - `intramembranosa`: cerca del panel izquierdo (el hueso plano), un poco elevada para ver la red de espículas
 *    y, al final, la cara de la tabla superior con sus osteonas.
 *  - `endocondral`: cerca del panel derecho (el hueso largo), de frente a la apertura del collar.
 *  - `detalle`: muy cerca del centro de la diáfisis del molde: la yema perióstica, los osteoclastos y el centro
 *    primario de osificación.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';
import { X_LADO } from './estado';

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 0, elevacion: 16, distancia: 10, objetivo: [0, 0.1, 0] },
  intramembranosa: { azimut: -8, elevacion: 28, distancia: 6.2, objetivo: [-X_LADO, 0, 0] },
  endocondral: { azimut: 10, elevacion: 14, distancia: 7.4, objetivo: [X_LADO, 0.1, 0] },
  detalle: { azimut: 16, elevacion: 18, distancia: 6.5, objetivo: [X_LADO * 0.35, 0.15, 0.1] },
};

export function vistaDosRutas(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaDosRutas(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaDosRutas(nombre), aspecto);
}
