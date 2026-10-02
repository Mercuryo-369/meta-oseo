/**
 * Vistas de cámara con nombre de la escena del osteoblasto (lógica pura). Cada vista es una posición esférica
 * alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la escena de la
 * BMU (`../bmu/vistas.ts`). Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.osteoblasto_celula`.
 *
 *  - `general`: la superficie de hueso en tres cuartos, con la fila de células y el capilar.
 *  - `celula`: más cerca de la fila, de frente a la cara de corte.
 *  - `organulos`: dentro de la célula protagonista, para ver el núcleo, el retículo, el Golgi y las vesículas.
 *  - `matriz`: baja y de frente a la cara de corte: el osteoide, el frente de mineralización y el hueso nuevo.
 *  - `detalle`: cerca de las tres células del centro, para ver los tres destinos.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 20, elevacion: 22, distancia: 8.6, objetivo: [0, 0.35, 0.3] },
  celula: { azimut: 10, elevacion: 14, distancia: 7, objetivo: [0, 0.8, 0.7] },
  organulos: { azimut: 4, elevacion: 8, distancia: 3.4, objetivo: [0, 0.85, 0.9] },
  matriz: { azimut: 8, elevacion: 6, distancia: 5.4, objetivo: [0, 0.75, 1] },
  detalle: { azimut: 12, elevacion: 18, distancia: 5.6, objetivo: [0, 0.6, 0.8] },
};

export function vistaOsteoblasto(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaOsteoblasto(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaOsteoblasto(nombre), aspecto);
}
