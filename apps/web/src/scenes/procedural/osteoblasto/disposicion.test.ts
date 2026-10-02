/**
 * Pruebas de la disposición de las piezas repetidas de la escena del osteoblasto: deterministas, dentro de la
 * célula o del bloque y coherentes con las constantes del estado.
 */
import { describe, expect, it } from 'vitest';
import {
  NUCLEO,
  canaliculosDeLaguna,
  cisternasDelReticulo,
  fragmentosApoptoticos,
  laminillasDelHueso,
  mitocondrias,
  puntoDeVesicula,
  saculosDelGolgi,
  vesiculasDeSecrecion,
} from './disposicion';
import type { Pieza } from './disposicion';
import { BLOQUE, FORMA, LAGUNA, N_FRAGMENTOS, N_VESICULAS } from './estado';

/** ¿La pieza (girada `giro` alrededor de Z) cabe dentro de la célula cúbica (semiejes `FORMA.cubico`)? */
function dentroDeLaCelula(p: Pieza): boolean {
  const [sx, sy, sz] = FORMA.cubico;
  const c = Math.abs(Math.cos(p.giro));
  const s = Math.abs(Math.sin(p.giro));
  return (
    Math.abs(p.x) + p.sx * c + p.sy * s <= sx + 1e-9 &&
    Math.abs(p.y) + p.sx * s + p.sy * c <= sy + 1e-9 &&
    Math.abs(p.z) + p.sz <= sz + 1e-9
  );
}

describe('orgánulos de la célula protagonista', () => {
  it('el núcleo es excéntrico (hacia el polo opuesto al hueso) y cabe en la célula', () => {
    expect(NUCLEO.y).toBeGreaterThan(0.1);
    expect(NUCLEO.y + NUCLEO.semiejes[1]).toBeLessThanOrEqual(FORMA.cubico[1]);
  });

  it('las cisternas del retículo son láminas finas, apiladas y deterministas', () => {
    const a = cisternasDelReticulo();
    expect(cisternasDelReticulo()).toEqual(a);
    expect(a.length).toBeGreaterThanOrEqual(6);
    for (const c of a) {
      expect(Math.min(c.sx, c.sy)).toBeLessThan(0.02);
      expect(dentroDeLaCelula(c)).toBe(true);
    }
  });

  it('los sáculos del Golgi están del lado del hueso respecto al núcleo', () => {
    for (const s of saculosDelGolgi()) {
      expect(s.y).toBeLessThan(NUCLEO.y - NUCLEO.semiejes[1]);
      expect(dentroDeLaCelula(s)).toBe(true);
    }
  });

  it('las mitocondrias son elipsoides alargados dentro de la célula y no chocan con el núcleo', () => {
    for (const m of mitocondrias()) {
      expect(m.sx).toBeGreaterThan(m.sy);
      expect(dentroDeLaCelula(m)).toBe(true);
      const d = Math.hypot(m.x / NUCLEO.semiejes[0], (m.y - NUCLEO.y) / NUCLEO.semiejes[1]);
      expect(d).toBeGreaterThan(1);
    }
  });
});

describe('vesículas de secreción', () => {
  it('hay N_VESICULAS, con desfases distintos en [0, 1) y carriles dentro de la célula', () => {
    const v = vesiculasDeSecrecion();
    expect(v).toHaveLength(N_VESICULAS);
    expect(vesiculasDeSecrecion()).toEqual(v);
    const desfases = new Set(v.map((x) => x.desfase.toFixed(4)));
    expect(desfases.size).toBe(N_VESICULAS);
    for (const x of v) {
      expect(x.desfase).toBeGreaterThanOrEqual(0);
      expect(x.desfase).toBeLessThan(1);
      expect(Math.abs(x.x) + 0.05).toBeLessThanOrEqual(FORMA.cubico[0]);
      expect(Math.abs(x.z) + 0.05).toBeLessThanOrEqual(FORMA.cubico[2]);
    }
  });

  it('el camino baja del Golgi al polo que mira al hueso y el radio nace y se apaga', () => {
    const inicio = puntoDeVesicula(0);
    const medio = puntoDeVesicula(0.5);
    const fin = puntoDeVesicula(1);
    expect(inicio.y).toBeGreaterThan(medio.y);
    expect(medio.y).toBeGreaterThan(fin.y);
    expect(fin.y).toBeGreaterThan(-FORMA.cubico[1]);
    expect(inicio.radio).toBe(0);
    expect(fin.radio).toBe(0);
    expect(medio.radio).toBeGreaterThan(0.03);
  });
});

describe('fragmentos apoptóticos', () => {
  it('hay N_FRAGMENTOS con dirección unitaria hacia arriba o de lado, deterministas', () => {
    const f = fragmentosApoptoticos();
    expect(f).toHaveLength(N_FRAGMENTOS);
    expect(fragmentosApoptoticos()).toEqual(f);
    for (const x of f) {
      expect(Math.hypot(x.dx, x.dy, x.dz)).toBeCloseTo(1, 6);
      expect(x.dy).toBeGreaterThan(0);
      expect(x.alcance).toBeGreaterThan(0.3);
      expect(x.radio).toBeGreaterThan(0.05);
    }
  });
});

describe('laguna y canalículos en la cara de corte', () => {
  it('la laguna queda dentro del hueso nuevo (por encima del hueso viejo) y sus canalículos también', () => {
    expect(LAGUNA.y - LAGUNA.ry).toBeGreaterThan(0);
    const c = canaliculosDeLaguna();
    expect(canaliculosDeLaguna()).toEqual(c);
    expect(c.length).toBeGreaterThanOrEqual(12);
    for (const [x0, y0, x1, y1] of c) {
      for (const y of [y0, y1]) {
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(1);
      }
      expect(Math.hypot(x1 - x0, y1 - y0)).toBeGreaterThan(0.04);
      expect(Math.abs(x0 - LAGUNA.x)).toBeLessThan(1);
    }
  });

  it('las laminillas del hueso viejo quedan dentro de la cara de corte', () => {
    const l = laminillasDelHueso(BLOQUE.ancho, BLOQUE.alto);
    expect(l.length).toBeGreaterThan(20);
    for (const [x0, y0, x1, y1] of l) {
      for (const x of [x0, x1]) expect(Math.abs(x)).toBeLessThanOrEqual(BLOQUE.ancho / 2 + 1e-9);
      for (const y of [y0, y1]) {
        expect(y).toBeLessThan(0);
        expect(y).toBeGreaterThan(-BLOQUE.alto);
      }
    }
  });
});
