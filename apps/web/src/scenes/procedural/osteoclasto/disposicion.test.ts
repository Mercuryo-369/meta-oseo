/**
 * Pruebas de la disposición de las piezas repetidas de la escena del osteoclasto: deterministas, dentro de sus
 * límites y coherentes con las constantes del estado (número de piezas, radios, mitad trasera del corte).
 */
import { describe, expect, it } from 'vitest';
import {
  celulasInversion,
  fragmentos,
  nucleos,
  particulasAcido,
  particulasProductos,
  pliegues,
  precursores,
} from './disposicion';
import {
  BLOQUE,
  CAPILAR,
  N_FRAGMENTOS,
  N_INVERSION,
  N_NUCLEOS,
  N_PARTICULAS_ACIDO,
  N_PARTICULAS_PRODUCTOS,
  N_PLIEGUES,
  N_PRECURSORES,
  R_LAGUNA,
  R_PRECURSOR,
  R_SELLADO,
} from './estado';

describe('precursores', () => {
  const lista = precursores();

  it('son los previstos y siempre los mismos', () => {
    expect(lista).toHaveLength(N_PRECURSORES);
    expect(precursores()).toEqual(lista);
  });

  it('salen de debajo del capilar y llegan en anillo sobre el hueso, sin pisar el centro', () => {
    for (const p of lista) {
      expect(p.origen[1]).toBeLessThan(CAPILAR.y);
      expect(p.origen[1]).toBeGreaterThan(CAPILAR.y - CAPILAR.radio - 2 * R_PRECURSOR);
      expect(Math.abs(p.origen[0])).toBeLessThan(BLOQUE.ancho / 2);
      expect(p.destino[1]).toBeCloseTo(p.radio, 9);
      const r = Math.hypot(p.destino[0], p.destino[2]);
      expect(r).toBeGreaterThan(0.4);
      expect(r).toBeLessThan(0.7);
      expect(p.orden).toBeGreaterThanOrEqual(0);
      expect(p.orden).toBeLessThan(1);
    }
  });
});

describe('nucleos', () => {
  const lista = nucleos();

  it('son los previstos, deterministas, en la mitad superior de la célula y caben en la cúpula', () => {
    expect(lista).toHaveLength(N_NUCLEOS);
    expect(nucleos()).toEqual(lista);
    for (const n of lista) {
      expect(n.local[1]).toBeGreaterThan(0.1);
      // Con la célula aplanada (ry = 0,43 · rx) el núcleo queda dentro de la esfera unidad.
      const rNucleoEnY = n.radio / 0.43;
      const norma = Math.hypot(n.local[0], n.local[2]) + n.radio;
      const alto = n.local[1] + rNucleoEnY;
      expect(Math.hypot(norma, alto)).toBeLessThan(1.05);
    }
  });

  it('se reparten entre las dos mitades del corte', () => {
    expect(lista.filter((n) => n.local[2] > 0)).toHaveLength(N_NUCLEOS / 2);
    expect(lista.filter((n) => n.local[2] < 0)).toHaveLength(N_NUCLEOS / 2);
  });
});

describe('pliegues', () => {
  const lista = pliegues();

  it('son los previstos, deterministas y caen dentro de la laguna', () => {
    expect(lista).toHaveLength(N_PLIEGUES);
    expect(pliegues()).toEqual(lista);
    for (const p of lista) {
      expect(Math.hypot(p.x, p.z)).toBeLessThan(R_LAGUNA * 0.92);
      expect(p.radio).toBeGreaterThan(0.04);
      expect(p.altura).toBeGreaterThan(0.6);
    }
  });

  it('no se solapan entre sí', () => {
    lista.forEach((a, i) =>
      lista.slice(i + 1).forEach((b) => {
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(a.radio + b.radio);
      }),
    );
  });
});

describe('partículas', () => {
  it('las ácidas son las previstas, deterministas, en la mitad trasera y dentro de la laguna', () => {
    const lista = particulasAcido();
    expect(lista).toHaveLength(N_PARTICULAS_ACIDO);
    expect(particulasAcido()).toEqual(lista);
    for (const p of lista) {
      expect(p.z).toBeLessThan(0);
      expect(Math.hypot(p.x, p.z)).toBeLessThan(R_LAGUNA * 0.85);
      expect(p.desfase).toBeGreaterThanOrEqual(0);
      expect(p.desfase).toBeLessThan(1);
    }
    expect(lista.filter((p) => p.tipo === 'proton').length).toBeGreaterThan(lista.length / 3);
    expect(lista.some((p) => p.tipo === 'catepsina')).toBe(true);
    expect(lista.some((p) => p.tipo === 'cloruro')).toBe(true);
  });

  it('los productos salen de la laguna trasera y terminan bajo el capilar', () => {
    const lista = particulasProductos();
    expect(lista).toHaveLength(N_PARTICULAS_PRODUCTOS);
    expect(particulasProductos()).toEqual(lista);
    for (const p of lista) {
      expect(p.z).toBeLessThan(0);
      expect(Math.hypot(p.x, p.z)).toBeLessThan(R_LAGUNA * 0.8);
      expect(p.destino[1]).toBeLessThan(CAPILAR.y);
      expect(p.destino[1]).toBeGreaterThan(CAPILAR.y - CAPILAR.radio - 0.1);
      expect(Math.abs(p.destino[0])).toBeLessThan(CAPILAR.largo / 2);
    }
    expect(new Set(lista.map((p) => p.tipo)).size).toBe(3);
  });
});

describe('células de inversión y fragmentos', () => {
  it('las células de inversión vienen de los bordes del bloque y se detienen fuera del anillo, en la mitad trasera', () => {
    const lista = celulasInversion();
    expect(lista).toHaveLength(N_INVERSION);
    expect(celulasInversion()).toEqual(lista);
    for (const c of lista) {
      expect(Math.abs(c.origen[0])).toBeGreaterThan(BLOQUE.ancho / 2 - 0.4);
      expect(c.origen[2]).toBeLessThan(0);
      expect(c.destino[2]).toBeLessThan(0);
      expect(Math.hypot(c.destino[0], c.destino[2])).toBeGreaterThan(R_SELLADO);
      expect(c.destino[1]).toBeCloseTo(c.radio, 9);
    }
  });

  it('los fragmentos son unitarios y se desprenden hacia arriba', () => {
    const lista = fragmentos();
    expect(lista).toHaveLength(N_FRAGMENTOS);
    expect(fragmentos()).toEqual(lista);
    for (const f of lista) {
      expect(Math.hypot(...f.direccion)).toBeCloseTo(1, 6);
      expect(f.direccion[1]).toBeGreaterThan(0);
      expect(f.radio).toBeGreaterThan(0.05);
    }
  });
});
