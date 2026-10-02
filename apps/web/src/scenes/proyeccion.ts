/**
 * Proyección de los puntos de interés (hotspots) sobre el lienzo (lógica pura, sin three ni Vue).
 *
 * La escena proyecta cada punto 3D con la cámara y entrega coordenadas de PÍXEL dentro del lienzo;
 * la interfaz coloca los botones HTML (objetivos táctiles de 44 px) en esas coordenadas. Aquí solo
 * están las cuentas que se pueden probar sin WebGL.
 */
import type { Vec3 } from './vistas';

/** Dónde dibujar un punto de interés. */
export interface PosicionPunto {
  id: string;
  /** Píxeles CSS desde la esquina superior izquierda del lienzo. */
  x: number;
  y: number;
  /** ¿Cae dentro del lienzo y delante de la cámara? Fuera, no se dibuja. */
  enPantalla: boolean;
  /** ¿Queda en la cara del modelo opuesta a la cámara? Se dibuja atenuado, no oculto. */
  detras: boolean;
}

/** Coordenadas normalizadas del dispositivo (-1 a 1, `y` hacia arriba) a píxeles del lienzo. */
export function ndcAPixeles(
  ndcX: number,
  ndcY: number,
  ancho: number,
  alto: number,
): { x: number; y: number } {
  return { x: (ndcX * 0.5 + 0.5) * ancho, y: (-ndcY * 0.5 + 0.5) * alto };
}

/**
 * ¿Está el punto delante de la cámara y dentro del cubo de recorte (con `margen` de holgura, en
 * unidades NDC, para que un botón medio cortado por el borde aún se pueda tocar)?
 */
export function enPantalla(ndc: Vec3, margen = 0.12): boolean {
  const [x, y, z] = ndc;
  if (![x, y, z].every(Number.isFinite)) return false;
  const limite = 1 + margen;
  return z >= -1 && z <= 1 && Math.abs(x) <= limite && Math.abs(y) <= limite;
}

/**
 * ¿Mira el punto hacia la cámara? Sin trazado de rayos, para atenuar los puntos que quedan "detrás" del
 * hueso sin ocultarlos:
 *  - con la `normal` de la superficie en el punto (hacia fuera del hueso), mira a la cámara si la normal
 *    apunta hacia ella (producto escalar con la dirección punto-cámara no negativo, con un margen para los
 *    puntos de borde). Es lo exacto para una superficie convexa y no considera lo que otra parte del hueso
 *    tape;
 *  - sin normal, compara el lado del centro del modelo en que está el punto con el lado en que está la
 *    cámara (el cóndilo derecho visto desde la izquierda).
 */
export function miraALaCamara(
  punto: Vec3,
  centro: Vec3,
  camara: Vec3,
  tolerancia = 0.15,
  normal?: Vec3,
): boolean {
  if (normal) {
    const haciaCamara: Vec3 = [camara[0] - punto[0], camara[1] - punto[1], camara[2] - punto[2]];
    const distancia = Math.hypot(haciaCamara[0], haciaCamara[1], haciaCamara[2]);
    const coseno =
      (normal[0] * haciaCamara[0] + normal[1] * haciaCamara[1] + normal[2] * haciaCamara[2]) /
      distancia;
    if (Number.isFinite(coseno)) return coseno >= -0.15;
  }
  const producto =
    (punto[0] - centro[0]) * (camara[0] - centro[0]) +
    (punto[1] - centro[1]) * (camara[1] - centro[1]) +
    (punto[2] - centro[2]) * (camara[2] - centro[2]);
  const normaCamara = Math.hypot(
    camara[0] - centro[0],
    camara[1] - centro[1],
    camara[2] - centro[2],
  );
  if (!(normaCamara > 1e-9) || !Number.isFinite(producto)) return true;
  // Componente del punto en la dirección de la cámara, en unidades del modelo.
  return producto / normaCamara >= -tolerancia;
}

/**
 * ¿Cambió alguna posición lo bastante como para actualizar la interfaz? Evita reescribir el DOM
 * 60 veces por segundo con diferencias de una fracción de píxel.
 */
export function cambioSignificativo(
  anteriores: readonly PosicionPunto[],
  nuevas: readonly PosicionPunto[],
  umbralPx = 0.5,
): boolean {
  if (anteriores.length !== nuevas.length) return true;
  return nuevas.some((nueva, i) => {
    const previa = anteriores[i];
    if (!previa) return true;
    return (
      previa.id !== nueva.id ||
      previa.enPantalla !== nueva.enPantalla ||
      previa.detras !== nueva.detras ||
      Math.abs(previa.x - nueva.x) > umbralPx ||
      Math.abs(previa.y - nueva.y) > umbralPx
    );
  });
}
