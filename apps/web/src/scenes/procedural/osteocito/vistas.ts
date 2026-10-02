/**
 * Vistas de cámara con nombre de la escena del osteocito (lógica pura). Cada vista es una posición esférica
 * alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la escena de la
 * BMU (`../bmu/vistas.ts`). Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.osteocito_red`.
 *
 *  - `general`: el bloque entero, casi de frente y un poco elevado: conducto a la izquierda, superficie arriba.
 *  - `laguna`: cerca de la célula central, para ver el cuerpo, el núcleo y la laguna.
 *  - `canaliculos`: un poco más lejos, para ver las dendritas de la central dentro de sus canalículos.
 *  - `red`: la red completa con los vecinos, el conducto y la superficie.
 *  - `superficie`: mirando a la superficie del hueso y a sus células, con las dendritas que llegan a ella.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 16, elevacion: 14, distancia: 11.5, objetivo: [-0.2, 0.1, 0] },
  laguna: { azimut: 12, elevacion: 12, distancia: 4.2, objetivo: [0.2, -0.3, 0] },
  canaliculos: { azimut: 18, elevacion: 16, distancia: 6.6, objetivo: [0.2, -0.2, 0] },
  red: { azimut: 12, elevacion: 12, distancia: 10.2, objetivo: [-0.2, 0, 0] },
  superficie: { azimut: 8, elevacion: 20, distancia: 7.4, objetivo: [0.2, 1.15, 0] },
};

export function vistaOsteocito(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaOsteocito(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaOsteocito(nombre), aspecto);
}
