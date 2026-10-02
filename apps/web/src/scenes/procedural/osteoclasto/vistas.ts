/**
 * Vistas de cámara con nombre de la escena del osteoclasto (lógica pura). Cada vista es una posición esférica
 * alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la escena de la
 * BMU (`../bmu/vistas.ts`). Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.osteoclasto_resorcion`.
 *
 * La escena se corta por el plano z = 0 y la mitad que se aparta es la de +Z, así que todas las vistas miran
 * desde +Z (azimut pequeño): la sección queda de frente.
 *
 *  - `general`: tres cuartos, elevada: el bloque, el capilar y la célula enteros.
 *  - `celula`: más cerca de la célula, para ver los núcleos y el anillo de sellado.
 *  - `borde`: baja y cerca del plano de corte, para ver los pliegues del borde festoneado y las partículas.
 *  - `laguna`: desde arriba y de frente, mirando dentro de la laguna de Howship.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 26, elevacion: 26, distancia: 8.2, objetivo: [0, 0.6, -0.2] },
  celula: { azimut: 16, elevacion: 22, distancia: 5.6, objetivo: [0, 0.4, 0] },
  borde: { azimut: 6, elevacion: 10, distancia: 3.7, objetivo: [0, 0.4, -0.2] },
  laguna: { azimut: 18, elevacion: 42, distancia: 4.8, objetivo: [0, -0.1, -0.35] },
};

export function vistaOsteoclasto(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaOsteoclasto(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaOsteoclasto(nombre), aspecto);
}
