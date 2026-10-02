/**
 * Vistas de cámara con nombre de la escena del hueso alveolar (lógica pura). Cada vista es una posición esférica
 * alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la escena de la
 * BMU (`../bmu/vistas.ts`). Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.hueso_alveolar`.
 *
 * La cara de corte mira hacia +X, así que las vistas que la muestran tienen un azimut grande (la cámara se
 * coloca del lado +X, algo hacia vestibular, +Z).
 *  - `general`: el segmento entero con el diente, en tres cuartos desde vestibular.
 *  - `corte`: de frente a la sección, algo oblicua para que se vea que es un bloque.
 *  - `raiz`: cerca del alvéolo: hueso alveolar propio y ligamento alrededor de la raíz.
 *  - `conducto`: cerca del conducto mandibular, mirando algo hacia dentro del túnel.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';
import { CONDUCTO, Z_ALVEOLO } from './estado';

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 38, elevacion: 20, distancia: 12.5, objetivo: [0, 0, 0] },
  corte: { azimut: 62, elevacion: 12, distancia: 10, objetivo: [-0.5, 0.2, 0] },
  raiz: { azimut: 60, elevacion: 8, distancia: 6.6, objetivo: [-0.1, 1, Z_ALVEOLO] },
  conducto: { azimut: 70, elevacion: 6, distancia: 3.6, objetivo: [-0.3, CONDUCTO.y, CONDUCTO.z] },
};

export function vistaAlveolar(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaAlveolar(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaAlveolar(nombre), aspecto);
}
