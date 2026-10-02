/**
 * Sector angular que se conserva del cilindro de hueso. Se quita una cuña de 90° (la que mira a la cámara
 * por defecto) para ver el interior del túnel y las láminas en sección. Los ángulos se miden en el plano
 * YZ desde +Y hacia +Z: un punto a distancia `r` del eje X y ángulo `fi` es `(x, r cos fi, r sen fi)`.
 * Sin three: lo usan la geometría, las células y las pruebas.
 */

const GRADOS = Math.PI / 180;

/** Inicio del sector conservado. La cara de corte de este lado mira hacia +Y. */
export const SECTOR_INICIO = 100 * GRADOS;
/** Fin del sector conservado (270° después). La cara de corte de este lado mira hacia +Z. */
export const SECTOR_FIN = 370 * GRADOS;

/** Ángulo del sector para una fracción `u` (0 a 1). */
export function anguloDeFraccion(u: number): number {
  return SECTOR_INICIO + u * (SECTOR_FIN - SECTOR_INICIO);
}

/** Punto (x, y, z) en coordenadas cilíndricas (x, r, fi). */
export function puntoCilindrico(x: number, r: number, fi: number): [number, number, number] {
  return [x, r * Math.cos(fi), r * Math.sin(fi)];
}
