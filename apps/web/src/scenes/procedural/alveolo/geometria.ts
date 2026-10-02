/**
 * Formas de la escena del alvéolo tras la extracción (aquí sí se usa three). Son funciones de construcción y de
 * ESCRITURA: como el contorno del cuerpo, la encía y el relleno del alvéolo cambian con el tiempo, sus mallas
 * tienen una topología FIJA (índice calculado una vez) y en cada instante solo se reescriben las posiciones de los
 * vértices a partir de los polígonos de `disposicion.ts` (puro), que siempre traen el mismo número de puntos.
 *
 * Convención: los polígonos viven en el plano de corte con coordenadas `[z, y]`; un punto `[z, y]` va a
 * `(x, y, z)` del mundo. La cara de corte está en x = 0 y las extrusiones avanzan hacia −X. Las placas fijas se
 * hacen con `placa` de la escena `hueso_alveolar` (`../alveolar/geometria.ts`).
 */
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Punto2 } from './disposicion';

/**
 * Cinta extruida entre dos carriles de `n` puntos (exterior e interior): las dos tapas (x = 0 y x = −largo), la
 * pared exterior y la pared interior; con carriles abiertos, además los dos extremos. Cada cara tiene sus propios
 * vértices (normales sin suavizar entre caras). Grupos de material: 0 las tapas, 1 las paredes.
 */
export function cinta(n: number, cerrada: boolean): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array(8 * n * 3), 3));
  const indices: number[] = [];
  const quad = (a: number, b: number, c: number, d: number): void => {
    indices.push(a, b, c, a, c, d);
  };
  const m = cerrada ? n : n - 1;
  // Tapas: exterior_i (0..n-1) e interior_i (n..2n-1); la de atrás desde 2n.
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % n;
    quad(i, j, n + j, n + i);
  }
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % n;
    quad(2 * n + j, 2 * n + i, 3 * n + i, 3 * n + j);
  }
  const finTapas = indices.length;
  // Pared exterior: 4n..5n-1 en x = 0, 5n..6n-1 en x = −largo. Pared interior: 6n.. y 7n..
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % n;
    quad(4 * n + i, 5 * n + i, 5 * n + j, 4 * n + j);
    quad(6 * n + j, 7 * n + j, 7 * n + i, 6 * n + i);
  }
  if (!cerrada) {
    quad(0, n, 3 * n, 2 * n);
    quad(n - 1, 3 * n - 1, 4 * n - 1, 2 * n - 1);
  }
  g.setIndex(indices);
  g.addGroup(0, finTapas, 0);
  g.addGroup(finTapas, indices.length - finTapas, 1);
  return g;
}

/** Escribe las posiciones de una cinta (misma `n` con que se creó) y recalcula las normales. */
export function escribirCinta(
  g: BufferGeometry,
  exterior: readonly Punto2[],
  interior: readonly Punto2[],
  largo: number,
): void {
  const n = exterior.length;
  const pos = g.getAttribute('position') as Float32BufferAttribute;
  const a = pos.array as Float32Array;
  const poner = (indice: number, x: number, p: Punto2): void => {
    a[indice * 3] = x;
    a[indice * 3 + 1] = p[1];
    a[indice * 3 + 2] = p[0];
  };
  for (let i = 0; i < n; i++) {
    const e = exterior[i]!;
    const d = interior[i]!;
    poner(i, 0, e);
    poner(n + i, 0, d);
    poner(2 * n + i, -largo, e);
    poner(3 * n + i, -largo, d);
    poner(4 * n + i, 0, e);
    poner(5 * n + i, -largo, e);
    poner(6 * n + i, 0, d);
    poner(7 * n + i, -largo, d);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
}

/** Placa plana en abanico desde un centro para un polígono de `n` puntos (estrellado respecto del centro). */
export function abanico(n: number): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array((n + 1) * 3), 3));
  const indices: number[] = [];
  for (let i = 0; i < n; i++) indices.push(n, i, (i + 1) % n);
  g.setIndex(indices);
  return g;
}

/** Escribe un abanico: los `n` puntos del polígono y el centro (por defecto, la media), a la profundidad `x`. */
export function escribirAbanico(
  g: BufferGeometry,
  puntos: readonly Punto2[],
  x: number,
  centro?: Punto2,
): void {
  const n = puntos.length;
  const pos = g.getAttribute('position') as Float32BufferAttribute;
  const a = pos.array as Float32Array;
  let cz = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const [z, y] = puntos[i]!;
    a[i * 3] = x;
    a[i * 3 + 1] = y;
    a[i * 3 + 2] = z;
    cz += z;
    cy += y;
  }
  a[n * 3] = x;
  a[n * 3 + 1] = centro ? centro[1] : cy / n;
  a[n * 3 + 2] = centro ? centro[0] : cz / n;
  pos.needsUpdate = true;
  g.computeVertexNormals();
}
