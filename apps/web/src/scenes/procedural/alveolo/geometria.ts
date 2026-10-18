/**
 * Formas de la escena del alvéolo tras la extracción (aquí sí se usa three). Son funciones de construcción y de
 * ESCRITURA: como el contorno del cuerpo, la encía y el relleno del alvéolo cambian con el tiempo, sus mallas
 * tienen una topología FIJA (índice calculado una vez) y en cada instante solo se reescriben las posiciones de los
 * vértices a partir de los polígonos de `disposicion.ts` (puro), que siempre traen el mismo número de puntos.
 *
 * Convención: los polígonos viven en el plano de corte con coordenadas `[z, y]`; un punto `[z, y]` va a
 * `(x, y, z)` del mundo. La cara de corte está en x = 0 y las extrusiones avanzan hacia −X. Las placas fijas se
 * hacen con `placa` de la escena `hueso_alveolar` (`../alveolar/geometria.ts`).
 *
 * Realismo (2026-10-14): las cintas y los abanicos llevan UV EN UNIDADES DE LA ESCENA, como las placas de
 * `../alveolar/geometria.ts` (en las tapas y los abanicos, la posición en el plano de corte; en las paredes, el
 * recorrido a lo largo del carril y la profundidad). Se reescriben con las posiciones; los materiales
 * (`mallas.ts`) fijan cuántas repeticiones del relieve de superficie caben en una unidad.
 */
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Punto2 } from './disposicion';

/**
 * Cinta extruida entre dos carriles de `n` puntos (exterior e interior): las dos tapas (x = 0 y x = −largo), la
 * pared exterior y la pared interior; con carriles abiertos, además los dos extremos, que tienen sus propios
 * vértices (así sus normales y su relieve no se mezclan con los de las tapas). Cada cara tiene sus propios
 * vértices (normales sin suavizar entre caras; a lo largo de cada pared, sí). Grupos de material: 0 las tapas,
 * 1 las paredes y los extremos.
 */
export function cinta(n: number, cerrada: boolean): BufferGeometry {
  const vertices = 8 * n + (cerrada ? 0 : 8);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array(vertices * 3), 3));
  g.setAttribute('uv', new Float32BufferAttribute(new Float32Array(vertices * 2), 2));
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
    // Extremos: 8n.. el del principio y 8n + 4.. el del final, cada uno con exterior e interior delante e
    // interior y exterior detrás.
    const e = 8 * n;
    quad(e, e + 1, e + 2, e + 3);
    quad(e + 4, e + 7, e + 6, e + 5);
  }
  g.setIndex(indices);
  g.addGroup(0, finTapas, 0);
  g.addGroup(finTapas, indices.length - finTapas, 1);
  return g;
}

/**
 * Recorrido acumulado a lo largo de un carril (unidades de la escena). En un carril cerrado va en espejo (crece
 * hasta la mitad y vuelve), para que no haya costura en el relieve donde se cierra.
 */
function recorridos(carril: readonly Punto2[], cerrado: boolean): number[] {
  const s: number[] = [0];
  for (let i = 1; i < carril.length; i++) {
    const a = carril[i - 1]!;
    const b = carril[i]!;
    s.push(s[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  if (!cerrado) return s;
  const primero = carril[0]!;
  const ultimo = carril[carril.length - 1]!;
  const total = s[s.length - 1]! + Math.hypot(primero[0] - ultimo[0], primero[1] - ultimo[1]);
  return s.map((v) => total / 2 - Math.abs(v - total / 2));
}

/**
 * Escribe las posiciones y las UV de una cinta (misma `n` con que se creó; abierta o cerrada según cuántos
 * vértices tenga) y recalcula las normales.
 */
export function escribirCinta(
  g: BufferGeometry,
  exterior: readonly Punto2[],
  interior: readonly Punto2[],
  largo: number,
): void {
  const n = exterior.length;
  const pos = g.getAttribute('position') as Float32BufferAttribute;
  const a = pos.array as Float32Array;
  const atributoUv = g.getAttribute('uv') as Float32BufferAttribute | undefined;
  const uv = atributoUv?.array as Float32Array | undefined;
  const cerrada = pos.count === 8 * n;
  const poner = (indice: number, x: number, p: Punto2, u: number, v: number): void => {
    a[indice * 3] = x;
    a[indice * 3 + 1] = p[1];
    a[indice * 3 + 2] = p[0];
    if (uv) {
      uv[indice * 2] = u;
      uv[indice * 2 + 1] = v;
    }
  };
  const sExterior = recorridos(exterior, cerrada);
  const sInterior = recorridos(interior, cerrada);
  for (let i = 0; i < n; i++) {
    const e = exterior[i]!;
    const d = interior[i]!;
    // Tapas: la posición en el plano de corte.
    poner(i, 0, e, e[0], e[1]);
    poner(n + i, 0, d, d[0], d[1]);
    poner(2 * n + i, -largo, e, e[0], e[1]);
    poner(3 * n + i, -largo, d, d[0], d[1]);
    // Paredes: el recorrido a lo largo de su carril y la profundidad.
    poner(4 * n + i, 0, e, sExterior[i]!, 0);
    poner(5 * n + i, -largo, e, sExterior[i]!, largo);
    poner(6 * n + i, 0, d, sInterior[i]!, 0);
    poner(7 * n + i, -largo, d, sInterior[i]!, largo);
  }
  if (!cerrada) {
    for (const [desde, i] of [
      [8 * n, 0],
      [8 * n + 4, n - 1],
    ] as const) {
      const e = exterior[i]!;
      const d = interior[i]!;
      const ancho = Math.hypot(e[0] - d[0], e[1] - d[1]);
      poner(desde, 0, e, 0, 0);
      poner(desde + 1, 0, d, ancho, 0);
      poner(desde + 2, -largo, d, ancho, largo);
      poner(desde + 3, -largo, e, 0, largo);
    }
  }
  pos.needsUpdate = true;
  if (atributoUv) atributoUv.needsUpdate = true;
  g.computeVertexNormals();
}

/** Placa plana en abanico desde un centro para un polígono de `n` puntos (estrellado respecto del centro). */
export function abanico(n: number): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array((n + 1) * 3), 3));
  g.setAttribute('uv', new Float32BufferAttribute(new Float32Array((n + 1) * 2), 2));
  const indices: number[] = [];
  for (let i = 0; i < n; i++) indices.push(n, i, (i + 1) % n);
  g.setIndex(indices);
  return g;
}

/**
 * Escribe un abanico: los `n` puntos del polígono y el centro (por defecto, la media), a la profundidad `x`. Las
 * UV son la posición `[z, y]` en el plano de corte.
 */
export function escribirAbanico(
  g: BufferGeometry,
  puntos: readonly Punto2[],
  x: number,
  centro?: Punto2,
): void {
  const n = puntos.length;
  const pos = g.getAttribute('position') as Float32BufferAttribute;
  const a = pos.array as Float32Array;
  const atributoUv = g.getAttribute('uv') as Float32BufferAttribute | undefined;
  const uv = atributoUv?.array as Float32Array | undefined;
  let cz = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const [z, y] = puntos[i]!;
    a[i * 3] = x;
    a[i * 3 + 1] = y;
    a[i * 3 + 2] = z;
    if (uv) {
      uv[i * 2] = z;
      uv[i * 2 + 1] = y;
    }
    cz += z;
    cy += y;
  }
  const [zc, yc] = centro ?? [cz / n, cy / n];
  a[n * 3] = x;
  a[n * 3 + 1] = yc;
  a[n * 3 + 2] = zc;
  if (uv) {
    uv[n * 2] = zc;
    uv[n * 2 + 1] = yc;
  }
  pos.needsUpdate = true;
  if (atributoUv) atributoUv.needsUpdate = true;
  g.computeVertexNormals();
}
