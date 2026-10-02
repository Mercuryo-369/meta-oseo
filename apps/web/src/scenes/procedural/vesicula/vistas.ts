/**
 * Vistas de cámara con nombre de la escena de la vesícula de matriz (lógica pura). Cada vista es una posición
 * esférica alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la escena
 * de la BMU (`../bmu/vistas.ts`). Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.vesicula_matriz`.
 *
 *  - `general`: la membrana del osteoblasto arriba y el osteoide con sus fibrillas abajo, en tres cuartos.
 *  - `vesicula`: cerca de la vesícula, apoyada en su fibrilla, con la membrana del osteoblasto asomando arriba.
 *  - `interior`: de frente y muy cerca: la vesícula cortada muestra la cara interna con los iones y el núcleo.
 *  - `cristal`: baja y cerca de la fibrilla anfitriona, para ver los cristales sobre el bandeo y el pirofosfato.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';
import { Y_VESICULA_FINAL, Z_VESICULA } from './estado';

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 24, elevacion: 8, distancia: 8.6, objetivo: [0, 0.7, 0.3] },
  vesicula: {
    azimut: 16,
    elevacion: 10,
    distancia: 5,
    objetivo: [0, Y_VESICULA_FINAL + 0.3, Z_VESICULA],
  },
  interior: {
    azimut: 0,
    elevacion: 6,
    distancia: 3.5,
    objetivo: [0, Y_VESICULA_FINAL - 0.05, Z_VESICULA],
  },
  cristal: { azimut: 10, elevacion: 14, distancia: 6.5, objetivo: [0.5, 0.6, Z_VESICULA] },
};

export function vistaVesicula(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaVesicula(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaVesicula(nombre), aspecto);
}
