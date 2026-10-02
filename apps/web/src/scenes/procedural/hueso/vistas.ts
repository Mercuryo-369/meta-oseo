/**
 * Vistas de cámara con nombre de la escena del hueso (lógica pura). Cada vista es una posición esférica
 * alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la escena de la
 * BMU (`../bmu/vistas.ts`). Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.hueso_largo_a_osteona`.
 *
 *  - `general`: el hueso largo entero, en tres cuartos.
 *  - `interior`: más cerca del hueso abierto, para ver la cortical, la médula y el hueso esponjoso.
 *  - `corte`: de frente al corte transversal.
 *  - `capas`: en diagonal, para ver las capas del corte separadas.
 *  - `osteona`: la osteona ampliada, con su corte en escalera.
 *  - `detalle`: cerca de la pared expuesta, para ver los osteocitos y sus canalículos.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 22, elevacion: 22, distancia: 13, objetivo: [0, 0, 0] },
  interior: { azimut: 12, elevacion: 44, distancia: 14.5, objetivo: [0, 0.9, 0.2] },
  corte: { azimut: 6, elevacion: 8, distancia: 8.6, objetivo: [0, 0, 0] },
  capas: { azimut: 42, elevacion: 20, distancia: 10.5, objetivo: [0, 0, 0] },
  osteona: { azimut: 14, elevacion: 24, distancia: 7.6, objetivo: [0.2, -0.3, 0] },
  detalle: { azimut: 10, elevacion: 20, distancia: 4, objetivo: [0.1, 0.1, 1.15] },
};

export function vistaHueso(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaHueso(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaHueso(nombre), aspecto);
}
