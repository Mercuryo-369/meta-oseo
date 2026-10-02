/**
 * Carga la malla de la mandíbula con LA MISMA transformación que la escena (apps/web/src/scenes/stl.ts):
 * rotar -90º sobre X (Z anatómico -> Y), centrar la caja envolvente en el origen y escalar para que la
 * esfera envolvente tenga radio 1. Sin dependencias: lee el STL binario a mano.
 */
import { readFileSync } from 'node:fs';

export function cargarMalla(ruta) {
  const b = readFileSync(ruta);
  const n = b.readUInt32LE(80);
  if (84 + n * 50 !== b.length) throw new Error('STL binario inesperado');
  const soltos = new Float64Array(n * 9);
  for (let i = 0; i < n; i++) {
    for (let v = 0; v < 3; v++) {
      const o = 84 + i * 50 + 12 + v * 12;
      const x = b.readFloatLE(o);
      const y = b.readFloatLE(o + 4);
      const z = b.readFloatLE(o + 8);
      // rotateX(-PI/2): y' = z, z' = -y
      soltos[i * 9 + v * 3] = x;
      soltos[i * 9 + v * 3 + 1] = z;
      soltos[i * 9 + v * 3 + 2] = -y;
    }
  }
  // Soldar vértices (tolerancia 1e-3 como mergeVertices)
  const mapa = new Map();
  const pos = [];
  const idx = new Uint32Array(n * 3);
  const q = (v) => Math.round(v * 1e3);
  for (let i = 0; i < n * 3; i++) {
    const x = soltos[i * 3], y = soltos[i * 3 + 1], z = soltos[i * 3 + 2];
    const k = `${q(x)},${q(y)},${q(z)}`;
    let id = mapa.get(k);
    if (id === undefined) {
      id = pos.length / 3;
      mapa.set(k, id);
      pos.push(x, y, z);
    }
    idx[i] = id;
  }
  const P = Float64Array.from(pos);
  const nv = P.length / 3;
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < nv; i++) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], P[i*3+a]); mx[a] = Math.max(mx[a], P[i*3+a]); }
  const c = [0, 1, 2].map((a) => (mn[a] + mx[a]) / 2);
  for (let i = 0; i < nv; i++) for (let a = 0; a < 3; a++) P[i*3+a] -= c[a];
  let r = 0;
  for (let i = 0; i < nv; i++) r = Math.max(r, Math.hypot(P[i*3], P[i*3+1], P[i*3+2]));
  for (let i = 0; i < P.length; i++) P[i] /= r;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < nv; i++) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], P[i*3+a]); max[a] = Math.max(max[a], P[i*3+a]); }
  return { P, idx, nv, nt: n, caja: { min, max }, radioOriginal: r };
}

/** Componentes conexas: devuelve, por triángulo, el id de componente (0 = la más grande = el hueso). */
export function componentes(m) {
  const par = new Int32Array(m.nv).map((_, i) => i);
  const f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let t = 0; t < m.nt; t++) { const a = f(m.idx[t*3]), b = f(m.idx[t*3+1]), c = f(m.idx[t*3+2]); par[f(b)] = a; par[f(c)] = a; }
  const cnt = new Map();
  for (let t = 0; t < m.nt; t++) { const r = f(m.idx[t*3]); cnt.set(r, (cnt.get(r) ?? 0) + 1); }
  const orden = [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map((e) => e[0]);
  const rango = new Map(orden.map((r, i) => [r, i]));
  const porTri = new Uint8Array(m.nt);
  for (let t = 0; t < m.nt; t++) porTri[t] = rango.get(f(m.idx[t*3]));
  return { porTri, n: orden.length };
}
