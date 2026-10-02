/**
 * Vistas de cámara con nombre de la escena de la BMU (lógica pura, sin three ni Vue). Cada vista es una
 * posición esférica alrededor de un objetivo: azimut (giro alrededor de Y; 0 = mirando desde +Z, positivo
 * hacia +X), elevación y distancia. Los nombres son los de `VISTAS_ESCENA_PROCEDURAL.bmu_remodelado`.
 *
 *  - `general`: tres cuartos, elevada, desde el lado por donde entra la BMU: se ven el túnel abierto, las
 *    caras de corte y la tapa derecha con las capas en sección.
 *  - `perfil`: de frente a la cara de corte que mira a +Z: el túnel en corte longitudinal, con el cono de
 *    corte, la línea de cemento y las láminas como bandas paralelas.
 *  - `extremo`: mirando por el eje desde +X, hacia dentro del túnel: las capas concéntricas y la luz.
 *  - `detalle`: cerca de la parte central del túnel, para ver las células sobre la pared.
 */
import { acotar, mezclar, suaveFuerte } from '../interpolacion';

export type Vec3 = readonly [number, number, number];

export interface VistaEsferica {
  /** Grados. */
  azimut: number;
  /** Grados. */
  elevacion: number;
  distancia: number;
  objetivo: Vec3;
}

export interface EstadoCamara {
  posicion: Vec3;
  objetivo: Vec3;
}

export const FOV_GRADOS = 34;

const VISTAS: Readonly<Record<string, VistaEsferica>> = {
  general: { azimut: 32, elevacion: 30, distancia: 12.5, objetivo: [0.2, -0.1, 0] },
  perfil: { azimut: -6, elevacion: 36, distancia: 12.2, objetivo: [0, -0.2, 0.1] },
  extremo: { azimut: 58, elevacion: 30, distancia: 9, objetivo: [2.4, -0.2, 0.2] },
  detalle: { azimut: 22, elevacion: 34, distancia: 6, objetivo: [0.4, -0.3, 0.2] },
};

/** Distancia mínima y máxima del zoom (con dos dedos o la rueda). */
export const LIMITES_DISTANCIA = { minima: 3.2, maxima: 30 } as const;

export function vistaBmu(nombre: string): VistaEsferica {
  return VISTAS[nombre] ?? VISTAS.general!;
}

/**
 * Estado de la cámara para una vista. En un lienzo estrecho (móvil en vertical) la distancia crece para que
 * el fragmento quepa a lo ancho: con aspecto 1 o más, la distancia de la vista.
 */
export function estadoDeVista(nombre: string, aspecto: number): EstadoCamara {
  return estadoDeEsferica(vistaBmu(nombre), aspecto);
}

export function estadoDeEsferica(vista: VistaEsferica, aspecto: number): EstadoCamara {
  const az = (vista.azimut * Math.PI) / 180;
  const el = (vista.elevacion * Math.PI) / 180;
  const ajuste = aspecto > 0 && aspecto < 1.5 ? Math.pow(1.5 / Math.max(0.5, aspecto), 0.9) : 1;
  const d = Math.min(LIMITES_DISTANCIA.maxima * 0.9, vista.distancia * ajuste);
  const [ox, oy, oz] = vista.objetivo;
  return {
    objetivo: vista.objetivo,
    posicion: [
      ox + d * Math.sin(az) * Math.cos(el),
      oy + d * Math.sin(el),
      oz + d * Math.cos(az) * Math.cos(el),
    ],
  };
}

interface Esferica {
  azimut: number;
  elevacion: number;
  distancia: number;
}

function aEsferica(e: EstadoCamara): Esferica {
  const dx = e.posicion[0] - e.objetivo[0];
  const dy = e.posicion[1] - e.objetivo[1];
  const dz = e.posicion[2] - e.objetivo[2];
  const distancia = Math.hypot(dx, dy, dz) || 1e-6;
  return {
    azimut: Math.atan2(dx, dz),
    elevacion: Math.asin(acotar(dy / distancia, -1, 1)),
    distancia,
  };
}

/** Diferencia angular más corta de `a` a `b` (radianes, entre -PI y PI). */
function difAngular(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * Interpola entre dos estados de cámara en coordenadas esféricas (el azimut por el camino corto) con un
 * suavizado de arranque y frenado. `k` de 0 a 1.
 */
export function mezclarCamara(desde: EstadoCamara, hasta: EstadoCamara, k: number): EstadoCamara {
  const s = suaveFuerte(k);
  const a = aEsferica(desde);
  const b = aEsferica(hasta);
  const objetivo: [number, number, number] = [
    mezclar(desde.objetivo[0], hasta.objetivo[0], s),
    mezclar(desde.objetivo[1], hasta.objetivo[1], s),
    mezclar(desde.objetivo[2], hasta.objetivo[2], s),
  ];
  const azimut = a.azimut + difAngular(a.azimut, b.azimut) * s;
  const elevacion = mezclar(a.elevacion, b.elevacion, s);
  const distancia = mezclar(a.distancia, b.distancia, s);
  return {
    objetivo,
    posicion: [
      objetivo[0] + distancia * Math.sin(azimut) * Math.cos(elevacion),
      objetivo[1] + distancia * Math.sin(elevacion),
      objetivo[2] + distancia * Math.cos(azimut) * Math.cos(elevacion),
    ],
  };
}

/** El mismo objetivo, con la cámara `factor` veces más cerca (< 1) o más lejos (> 1), dentro de los límites. */
export function estadoConZoom(estado: EstadoCamara, factor: number): EstadoCamara {
  const dx = estado.posicion[0] - estado.objetivo[0];
  const dy = estado.posicion[1] - estado.objetivo[1];
  const dz = estado.posicion[2] - estado.objetivo[2];
  const actual = Math.hypot(dx, dy, dz) || 1e-6;
  const nueva = acotar(actual * factor, LIMITES_DISTANCIA.minima, LIMITES_DISTANCIA.maxima);
  const k = nueva / actual;
  return {
    objetivo: estado.objetivo,
    posicion: [
      estado.objetivo[0] + dx * k,
      estado.objetivo[1] + dy * k,
      estado.objetivo[2] + dz * k,
    ],
  };
}
