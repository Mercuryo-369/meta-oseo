/**
 * Vistas de cámara con nombre de la escena del alvéolo tras la extracción (lógica pura). Cada vista es una posición
 * esférica alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la escena
 * de la BMU (`../bmu/vistas.ts`). Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.alveolo_postextraccion`.
 *
 * La cara de corte mira hacia +X, así que las vistas que la muestran tienen un azimut grande (la cámara se coloca
 * del lado +X, algo hacia vestibular, +Z).
 *  - `general`: el segmento entero con el diente y la encía, en tres cuartos desde vestibular.
 *  - `corte`: de frente a la sección, algo oblicua para que se vea que es un bloque.
 *  - `alveolo`: cerca del alvéolo: el diente, el ligamento y después el coágulo, la granulación y el hueso nuevo.
 *  - `reborde`: algo más baja y alejada: el reborde que baja hacia el conducto y el foramen mentoniano.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';
import { Z_ALVEOLO } from '../alveolar/estado';

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 38, elevacion: 20, distancia: 12.5, objetivo: [0, 0.2, 0] },
  corte: { azimut: 62, elevacion: 12, distancia: 10, objetivo: [-0.5, 0.2, 0] },
  alveolo: { azimut: 60, elevacion: 8, distancia: 6.6, objetivo: [-0.1, 0.9, Z_ALVEOLO] },
  reborde: { azimut: 52, elevacion: 16, distancia: 8.8, objetivo: [-0.6, -0.5, 0] },
};

export function vistaAlveolo(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaAlveolo(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaAlveolo(nombre), aspecto);
}
