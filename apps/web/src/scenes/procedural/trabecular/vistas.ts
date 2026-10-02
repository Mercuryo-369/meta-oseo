/**
 * Vistas de cámara con nombre de la escena del hueso trabecular (lógica pura). Cada vista es una posición
 * esférica alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la
 * escena de la BMU (`../bmu/vistas.ts`). Los nombres son los de
 * `VISTAS_ESCENA_PROCEDURAL.hueso_trabecular_tiempo`.
 *
 *  - `general`: el cubo entero en tres cuartos, un poco elevada para ver la cortical superior.
 *  - `detalle`: cerca de la cara frontal, donde trabajan las BMU trabeculares.
 *  - `corte`: de frente a la cara frontal y casi sin elevación: la red se lee como un corte histológico o una
 *    radiografía, con las placas de normal Z de cara y las de normal X de canto.
 *  - `comparacion`: más lejos y centrada entre los dos cubos, para ver el joven (fantasma, a la izquierda) junto
 *    al envejecido.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';
import { X_FANTASMA } from './estado';

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 28, elevacion: 24, distancia: 9.6, objetivo: [0, 0.1, 0] },
  detalle: { azimut: 14, elevacion: 10, distancia: 4.4, objetivo: [0.1, 0.35, 1.1] },
  corte: { azimut: 2, elevacion: 5, distancia: 8.4, objetivo: [0, 0, 0] },
  comparacion: { azimut: 10, elevacion: 16, distancia: 12.6, objetivo: [X_FANTASMA / 2, 0.1, 0] },
};

export function vistaTrabecular(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaTrabecular(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaTrabecular(nombre), aspecto);
}
