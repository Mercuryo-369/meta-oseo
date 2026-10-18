/**
 * Vistas de cámara con nombre de la escena de la mandíbula fetal (lógica pura). Cada vista es una posición
 * esférica alrededor de un objetivo (azimut, elevación y distancia); la matemática de la cámara es la de la
 * escena de la BMU (`../bmu/vistas.ts`). Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.mandibula_fetal`.
 *
 * El arco mira hacia +Z (la línea media queda delante) y la ventana de corte está en la mitad +X.
 *  - `general`: las dos mitades desde delante y arriba: la herradura entera.
 *  - `lateral`: desde el lado +X, casi a la altura del arco: la rama, el cóndilo y el ángulo abierto.
 *  - `corte`: cerca de la ventana de corte de la mitad +X, mirando la cara de la sección: Meckel medial, el
 *    hueso alrededor del nervio y el germen dentario.
 *  - `detalle`: cerca del centro de osificación (la bifurcación del nervio), en la mitad +X.
 *
 * Las de `corte` y `detalle` se orientan respecto al arco en su objetivo (2026-10-17): su azimut es el rumbo de la
 * tangente más un ángulo fijo, el mismo que tenían antes de mover el centro de osificación y la ventana de corte
 * (fidelidad-05), para que encuadren igual: la tapa del tramo de atrás de la ventana, vista por fuera del tramo de
 * delante, y el centro visto de lado y desde arriba.
 */
import { estadoDeEsferica } from '../bmu/vistas';
import type { EstadoCamara, VistaEsferica } from '../bmu/vistas';
import { VENTANA_CORTE, centroCuerpo, tangenteArco } from './disposicion';
import { U_CENTRO } from './estado';

const U_VENTANA = (VENTANA_CORTE.u0 + VENTANA_CORTE.u1) / 2;
const corte = centroCuerpo(VENTANA_CORTE.lado, U_VENTANA);
const centro = centroCuerpo(1, U_CENTRO);

/** Rumbo (grados, desde +Z hacia +X) de la tangente del arco de la mitad +1 en `u`. */
export function rumboArco(u: number): number {
  const [tx, , tz] = tangenteArco(1, u);
  return (Math.atan2(tx, tz) * 180) / Math.PI;
}

/** Ángulo de cada vista cercana con la tangente del arco en su objetivo (hacia fuera del arco). */
export const ANGULO_CON_ARCO = { corte: 47, detalle: 86 } as const;

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 24, elevacion: 40, distancia: 11, objetivo: [0, 0.55, 0.1] },
  lateral: { azimut: 72, elevacion: 16, distancia: 9.5, objetivo: [0.8, 0.55, -0.2] },
  corte: {
    azimut: rumboArco(U_VENTANA) + ANGULO_CON_ARCO.corte,
    elevacion: 28,
    distancia: 3.4,
    objetivo: [corte[0], corte[1], corte[2]],
  },
  detalle: {
    azimut: rumboArco(U_CENTRO) + ANGULO_CON_ARCO.detalle,
    elevacion: 40,
    distancia: 3.2,
    objetivo: [centro[0], centro[1], centro[2]],
  },
};

export function vistaMandibulaFetal(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/** Estado de la cámara para una vista (en un lienzo estrecho la cámara se aleja, como en la BMU). */
export function estadoDeVistaMandibulaFetal(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaMandibulaFetal(nombre), aspecto);
}
