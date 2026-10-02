/**
 * Vistas de cámara con nombre de la escena de la matriz ósea (lógica pura). Cada vista es una posición esférica
 * alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la escena de la
 * BMU (`../bmu/vistas.ts`). Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.matriz_osea`.
 *
 *  - `general`: el fragmento de hueso laminar, en tres cuartos.
 *  - `fibra`: desde arriba y en diagonal, para ver las laminillas ampliadas y cómo cambian de dirección sus fibras.
 *  - `fibrilla`: de frente a la fibrilla abierta, entera, con el escalonado de sus moléculas.
 *  - `detalle`: cerca del plano de corte, para ver los huecos, los cristales y las proteínas.
 *  - `carga`: un poco más lejos, para que quepan las flechas de tracción y de compresión.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 26, elevacion: 22, distancia: 11.5, objetivo: [0, 0, 0] },
  fibra: { azimut: 16, elevacion: 40, distancia: 11, objetivo: [0, 0, 0] },
  fibrilla: { azimut: 10, elevacion: 16, distancia: 10.2, objetivo: [0, 0, 0] },
  detalle: { azimut: 6, elevacion: 12, distancia: 6.2, objetivo: [0.5, 0.05, 0] },
  carga: { azimut: 12, elevacion: 18, distancia: 12.8, objetivo: [0, 0, 0] },
};

export function vistaMatriz(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaMatriz(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaMatriz(nombre), aspecto);
}
