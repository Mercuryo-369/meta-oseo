/** Escritor PNG mínimo (RGB de 8 bits) y rasterizador ortográfico para inspeccionar la malla sin navegador. */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(tipo, datos) {
  const l = Buffer.alloc(4); l.writeUInt32BE(datos.length);
  const td = Buffer.concat([Buffer.from(tipo), datos]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td));
  return Buffer.concat([l, td, c]);
}
export function escribirPng(ruta, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(ruta, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

/**
 * Dibuja la malla desde una dirección (vector desde el objeto hacia la cámara), ortográfico.
 * `arriba` es el vector "arriba" de la imagen. `color(t)` da el color de cada triángulo. `puntos`: [{p:[x,y,z], color}].
 */
export function renderizar(m, { dir, arriba = [0, 1, 0], w = 600, h = 600, escala = 0.85, color = () => [200, 200, 205], puntos = [], centro = [0, 0, 0] }) {
  const norm = (v) => { const l = Math.hypot(...v); return v.map((a) => a / l); };
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const d = norm(dir);
  const der = norm(cross(arriba, d)); // derecha de la imagen
  const up = cross(d, der);
  const px = (p) => { const q = [p[0]-centro[0], p[1]-centro[1], p[2]-centro[2]]; return [q[0]*der[0]+q[1]*der[1]+q[2]*der[2], q[0]*up[0]+q[1]*up[1]+q[2]*up[2], q[0]*d[0]+q[1]*d[1]+q[2]*d[2]]; };
  const S = (Math.min(w, h) * escala) / 2 / 1.0;
  const buf = Buffer.alloc(w * h * 3, 245);
  const zb = new Float64Array(w * h).fill(-Infinity);
  const proj = new Float64Array(m.nv * 3);
  for (let i = 0; i < m.nv; i++) { const r = px([m.P[i*3], m.P[i*3+1], m.P[i*3+2]]); proj[i*3] = w/2 + r[0]*S; proj[i*3+1] = h/2 - r[1]*S; proj[i*3+2] = r[2]; }
  for (let t = 0; t < m.nt; t++) {
    const a = m.idx[t*3], b = m.idx[t*3+1], c = m.idx[t*3+2];
    const x0 = proj[a*3], y0 = proj[a*3+1], z0 = proj[a*3+2], x1 = proj[b*3], y1 = proj[b*3+1], z1 = proj[b*3+2], x2 = proj[c*3], y2 = proj[c*3+1], z2 = proj[c*3+2];
    // normal en espacio mundo para sombreado
    const u = [m.P[b*3]-m.P[a*3], m.P[b*3+1]-m.P[a*3+1], m.P[b*3+2]-m.P[a*3+2]], v = [m.P[c*3]-m.P[a*3], m.P[c*3+1]-m.P[a*3+1], m.P[c*3+2]-m.P[a*3+2]];
    let n = norm(cross(u, v)); let lam = n[0]*d[0]+n[1]*d[1]+n[2]*d[2]; lam = Math.abs(lam);
    const col = color(t); if (!col) continue; const sh = 0.35 + 0.65 * lam;
    const minx = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxx = Math.min(w-1, Math.ceil(Math.max(x0, x1, x2)));
    const miny = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxy = Math.min(h-1, Math.ceil(Math.max(y0, y1, y2)));
    const den = (y1-y2)*(x0-x2) + (x2-x1)*(y0-y2); if (Math.abs(den) < 1e-12) continue;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const l0 = ((y1-y2)*(x+0.5-x2) + (x2-x1)*(y+0.5-y2)) / den, l1 = ((y2-y0)*(x+0.5-x2) + (x0-x2)*(y+0.5-y2)) / den, l2 = 1 - l0 - l1;
      if (l0 < 0 || l1 < 0 || l2 < 0) continue;
      const z = l0*z0 + l1*z1 + l2*z2; const k = y*w+x;
      if (z > zb[k]) { zb[k] = z; buf[k*3] = col[0]*sh; buf[k*3+1] = col[1]*sh; buf[k*3+2] = col[2]*sh; }
    }
  }
  for (const pt of puntos) {
    const r = px(pt.p); const cx = w/2 + r[0]*S, cy = h/2 - r[1]*S; const rad = pt.r ?? 5;
    // visible si no hay superficie claramente delante
    const kx = Math.round(cx), ky = Math.round(cy);
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
      if (x*x + y*y > rad*rad) continue; const X = kx+x, Y = ky+y; if (X<0||Y<0||X>=w||Y>=h) continue;
      const k = Y*w+X; const oculto = kx>=0&&ky>=0&&kx<w&&ky<h&&zb[ky*w+kx] > r[2] + 0.02;
      const cc = oculto ? pt.color.map((q) => Math.round(q*0.35+160)) : pt.color; buf[k*3]=cc[0]; buf[k*3+1]=cc[1]; buf[k*3+2]=cc[2];
    }
  }
  return { w, h, buf };
}

const FUENTE = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111' };
/** Dibuja un número (0-99) con una fuente de 3x5 píxeles ampliada `k` veces, con la esquina superior izquierda en (x, y). */
export function dibujarNumero(buf, w, h, x, y, n, color, k = 3) {
  const s = String(n);
  for (let c = 0; c < s.length; c++) {
    const g = FUENTE[s[c]];
    for (let f = 0; f < 5; f++) for (let q = 0; q < 3; q++) if (g[f * 3 + q] === '1')
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) { const X = x + c * 4 * k + q * k + dx, Y = y + f * k + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) { const o = (Y * w + X) * 3; buf[o] = color[0]; buf[o+1] = color[1]; buf[o+2] = color[2]; } }
  }
}
