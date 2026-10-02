/** Utilidades geométricas puras sobre la malla de `malla.mjs`: normales, vecindad, rayos y distancia a la superficie. */

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norma = (a) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a) => mul(a, 1 / (norma(a) || 1));
export const vert = (m, i) => [m.P[i * 3], m.P[i * 3 + 1], m.P[i * 3 + 2]];

/** Normales por vértice (media ponderada por área) y vecinos, para los triángulos de `tris`. */
export function preparar(m, tris) {
  const N = new Float64Array(m.nv * 3);
  const vecinos = Array.from({ length: m.nv }, () => new Set());
  for (const t of tris) {
    const [a, b, c] = [m.idx[t * 3], m.idx[t * 3 + 1], m.idx[t * 3 + 2]];
    const n = cross(sub(vert(m, b), vert(m, a)), sub(vert(m, c), vert(m, a)));
    for (const i of [a, b, c]) for (let k = 0; k < 3; k++) N[i * 3 + k] += n[k];
    vecinos[a].add(b).add(c); vecinos[b].add(a).add(c); vecinos[c].add(a).add(b);
  }
  for (let i = 0; i < m.nv; i++) { const l = Math.hypot(N[i*3], N[i*3+1], N[i*3+2]); if (l > 0) for (let k = 0; k < 3; k++) N[i*3+k] /= l; }
  return { N, vecinos, tris };
}

/** Primer impacto de un rayo (Möller-Trumbore, ambos sentidos de cara) contra los triángulos `tris`. */
export function rayo(m, tris, o, d, tMax = Infinity) {
  let mejor = null;
  for (const t of tris) {
    const A = vert(m, m.idx[t * 3]), B = vert(m, m.idx[t * 3 + 1]), C = vert(m, m.idx[t * 3 + 2]);
    const e1 = sub(B, A), e2 = sub(C, A), h = cross(d, e2), a = dot(e1, h);
    if (Math.abs(a) < 1e-12) continue;
    const f = 1 / a, s = sub(o, A), u = f * dot(s, h);
    if (u < 0 || u > 1) continue;
    const q = cross(s, e1), v = f * dot(d, q);
    if (v < 0 || u + v > 1) continue;
    const tt = f * dot(e2, q);
    if (tt > 1e-9 && tt < tMax && (!mejor || tt < mejor.t)) {
      let n = unit(cross(e1, e2)); if (dot(n, d) > 0) n = mul(n, -1);
      mejor = { t: tt, p: add(o, mul(d, tt)), n, tri: t };
    }
  }
  return mejor;
}

/** Punto más cercano de un triángulo a `p` (Ericson, Real-Time Collision Detection). */
export function cercanoEnTriangulo(p, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(a, mul(ab, d1 / (d1 - d3)));
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(a, mul(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(b, mul(sub(c, b), (d4 - d3) / (d4 - d3 + d5 - d6)));
  const den = 1 / (va + vb + vc);
  return add(a, add(mul(ab, vb * den), mul(ac, vc * den)));
}

/** Distancia de `p` a la superficie de los triángulos `tris`, con el punto y la normal (de cara) del más cercano. */
export function distanciaASuperficie(m, tris, p) {
  let mejor = { d: Infinity, q: null, tri: -1 };
  for (const t of tris) {
    const A = vert(m, m.idx[t * 3]), B = vert(m, m.idx[t * 3 + 1]), C = vert(m, m.idx[t * 3 + 2]);
    const q = cercanoEnTriangulo(p, A, B, C);
    const d = norma(sub(p, q));
    if (d < mejor.d) mejor = { d, q, tri: t };
  }
  return mejor;
}
