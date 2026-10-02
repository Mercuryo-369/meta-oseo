/**
 * Vistas de cámara con nombre de la escena del movimiento ortodóntico (lógica pura). Cada vista es una posición
 * esférica alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la
 * escena de la BMU (`../bmu/vistas.ts`). Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.movimiento_ortodontico`.
 *
 * La cara de corte está en z = 0 y mira a +Z, así que las vistas tienen azimut pequeño (la cámara delante del
 * bloque). El diente avanza hacia +X con el tiempo y la cámara no lo sigue: cada vista de detalle apunta a
 * donde está la pared que interesa en la fase que la usa.
 *  - `general`: el bloque entero con el diente, algo en tres cuartos para que se vea que es un bloque.
 *  - `corte`: de frente al alvéolo, más cerca.
 *  - `compresion`: la pared derecha (hacia donde va el diente), donde el ligamento se comprime y se reabsorbe.
 *  - `tension`: la pared izquierda, donde el ligamento se estira y se deposita hueso.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 22, elevacion: 14, distancia: 9.6, objetivo: [-0.05, 0.25, 0] },
  corte: { azimut: 4, elevacion: 5, distancia: 6.4, objetivo: [-0.05, 0.2, 0] },
  compresion: { azimut: 12, elevacion: 4, distancia: 4.4, objetivo: [0.5, 0.1, 0] },
  tension: { azimut: -12, elevacion: 4, distancia: 4.4, objetivo: [-0.75, 0.1, 0] },
};

export function vistaOrtodoncia(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaOrtodoncia(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaOrtodoncia(nombre), aspecto);
}
