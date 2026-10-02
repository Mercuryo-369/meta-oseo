/**
 * Pruebas de la disposición de la red lacuno-canalicular: determinista, dentro del bloque, con el número previsto
 * de células, dendritas y uniones, y coherente (cada media dendrita termina en su unión, las rutas de la señal
 * van de la célula central a la superficie).
 */
import { describe, expect, it } from 'vitest';
import {
  celulasDeLaRed,
  celulasDeSuperficie,
  distancia,
  integrinasDeLaCentral,
  largoDe,
  moleculasDeEsclerostina,
  particulasDeFlujo,
  puntoEn,
  redLacunoCanalicular,
  rutasDeMensaje,
} from './disposicion';
import type { Punto3 } from './disposicion';
import {
  BLOQUE,
  CENTRO_CELULA,
  CONDUCTO,
  N_CELULAS_SUPERFICIE,
  N_DENDRITAS_CENTRAL,
  N_DENDRITAS_VECINO,
  N_ESCLEROSTINA,
  N_PARTICULAS,
  N_VECINOS,
  SEGMENTOS_DENDRITA,
  Y_SUPERFICIE,
} from './estado';

const red = redLacunoCanalicular();

function dentroDelBloque(p: Punto3): boolean {
  const [cx, cy] = BLOQUE.centro;
  return (
    p[0] >= cx - BLOQUE.ancho / 2 &&
    p[0] <= cx + BLOQUE.ancho / 2 &&
    p[1] >= cy - BLOQUE.alto / 2 &&
    p[1] <= Y_SUPERFICIE + 1e-9 &&
    Math.abs(p[2]) <= BLOQUE.fondo / 2
  );
}

describe('celulasDeLaRed', () => {
  it('da la central y sus vecinas, siempre las mismas, dentro del bloque y sin tocar el conducto', () => {
    const celulas = celulasDeLaRed();
    expect(celulas).toHaveLength(N_VECINOS + 1);
    expect(celulasDeLaRed()).toEqual(celulas);
    expect(celulas[0]!.centro).toEqual(CENTRO_CELULA);
    for (const c of celulas) {
      expect(dentroDelBloque(c.centro)).toBe(true);
      expect(Math.hypot(c.centro[0] - CONDUCTO.x, c.centro[1] - CONDUCTO.y)).toBeGreaterThan(
        CONDUCTO.radio + 0.5,
      );
      expect(c.centro[1]).toBeLessThan(Y_SUPERFICIE - 0.5);
    }
    celulas.forEach((a, i) =>
      celulas
        .slice(i + 1)
        .forEach((b) => expect(distancia(a.centro, b.centro)).toBeGreaterThan(1.1)),
    );
  });
});

describe('redLacunoCanalicular', () => {
  it('es determinista', () => {
    expect(redLacunoCanalicular()).toEqual(red);
  });

  it('cada célula emite su cuota de dendritas (20 a 40 la central) y todas tienen los tramos previstos', () => {
    const porCelula = red.celulas.map(
      (c) => red.dendritas.filter((d) => d.celula === c.indice).length,
    );
    expect(porCelula[0]).toBe(N_DENDRITAS_CENTRAL);
    expect(porCelula[0]).toBeGreaterThanOrEqual(20);
    expect(porCelula[0]).toBeLessThanOrEqual(40);
    for (const n of porCelula.slice(1)) expect(n).toBe(N_DENDRITAS_VECINO);
    for (const d of red.dendritas) expect(d.puntos).toHaveLength(SEGMENTOS_DENDRITA + 1);
  });

  it('ninguna dendrita sale del bloque ni de la matriz (todas por debajo de la superficie)', () => {
    for (const d of red.dendritas) {
      for (const p of d.puntos) {
        expect(dentroDelBloque(p)).toBe(true);
        expect(p[1]).toBeLessThanOrEqual(Y_SUPERFICIE);
      }
    }
  });

  it('las medias dendritas terminan en su unión y cada unión recibe exactamente dos, una de cada célula', () => {
    red.uniones.forEach((u, j) => {
      const llegan = red.dendritas.filter((d) => d.union === j);
      expect(llegan).toHaveLength(2);
      expect(llegan.map((d) => d.celula).sort()).toEqual([...u.celulas].sort());
      for (const d of llegan)
        expect(distancia(d.puntos[SEGMENTOS_DENDRITA]!, u.punto)).toBeLessThan(1e-9);
    });
    // La central se comunica con todas sus vecinas.
    for (let i = 1; i <= N_VECINOS; i++) {
      expect(red.uniones.some((u) => u.celulas[0] === 0 && u.celulas[1] === i)).toBe(true);
    }
  });

  it('hay dendritas que llegan a la superficie y al conducto de Havers', () => {
    const aSuperficie = red.dendritas.filter((d) => d.destino === 'superficie');
    const aCapilar = red.dendritas.filter((d) => d.destino === 'capilar');
    expect(aSuperficie.length).toBeGreaterThanOrEqual(4);
    expect(aCapilar.length).toBeGreaterThanOrEqual(4);
    for (const d of aSuperficie)
      expect(d.puntos[SEGMENTOS_DENDRITA]![1]).toBeGreaterThan(Y_SUPERFICIE - 0.1);
    for (const d of aCapilar) {
      const fin = d.puntos[SEGMENTOS_DENDRITA]!;
      expect(Math.hypot(fin[0] - CONDUCTO.x, fin[1] - CONDUCTO.y)).toBeCloseTo(CONDUCTO.radio, 6);
    }
  });

  it('las dendritas libres no entran en el conducto ni en otra célula', () => {
    for (const d of red.dendritas.filter((x) => x.destino === 'libre')) {
      const fin = d.puntos[SEGMENTOS_DENDRITA]!;
      expect(Math.hypot(fin[0] - CONDUCTO.x, fin[1] - CONDUCTO.y)).toBeGreaterThan(
        CONDUCTO.radio + 0.1,
      );
      for (const c of red.celulas) {
        if (c.indice !== d.celula) expect(distancia(c.centro, fin)).toBeGreaterThan(0.5);
      }
    }
  });
});

describe('rutasDeMensaje', () => {
  it('cada ruta empieza junto a la célula central y termina en la superficie', () => {
    const rutas = rutasDeMensaje(red);
    expect(rutas.length).toBeGreaterThanOrEqual(4);
    for (const r of rutas) {
      expect(distancia(r[0]!, CENTRO_CELULA)).toBeLessThan(0.7);
      expect(r[r.length - 1]![1]).toBeGreaterThan(Y_SUPERFICIE - 0.1);
      // Sin saltos: los puntos consecutivos están cerca.
      for (let i = 1; i < r.length; i++) expect(distancia(r[i - 1]!, r[i]!)).toBeLessThan(1.2);
    }
  });
});

describe('puntoEn y largoDe', () => {
  const linea: Punto3[] = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 2, 0],
  ];
  it('recorre la línea por longitud de arco', () => {
    expect(largoDe(linea)).toBeCloseTo(3, 9);
    expect(puntoEn(linea, 0)).toEqual([0, 0, 0]);
    expect(puntoEn(linea, 1 / 3)).toEqual([1, 0, 0]);
    expect(puntoEn(linea, 2 / 3)[1]).toBeCloseTo(1, 9);
    expect(puntoEn(linea, 1)).toEqual([1, 2, 0]);
    expect(puntoEn(linea, 5)).toEqual([1, 2, 0]);
  });
});

describe('partículas, esclerostina, integrinas y superficie', () => {
  it('las partículas apuntan a dendritas existentes y fluyen hacia el conducto (−X)', () => {
    const particulas = particulasDeFlujo(red);
    expect(particulas).toHaveLength(N_PARTICULAS);
    for (const p of particulas) {
      const d = red.dendritas[p.dendrita]!;
      expect(d).toBeDefined();
      const inicio = d.puntos[0]!;
      const fin = d.puntos[SEGMENTOS_DENDRITA]!;
      const destino = p.sentido === 1 ? fin : inicio;
      const origen = p.sentido === 1 ? inicio : fin;
      expect(destino[0]).toBeLessThanOrEqual(origen[0] + 1e-9);
      expect(p.desfase).toBeGreaterThanOrEqual(0);
      expect(p.desfase).toBeLessThan(1);
    }
  });

  it('la esclerostina sale hacia arriba (hacia la superficie) con direcciones unitarias', () => {
    const moleculas = moleculasDeEsclerostina();
    expect(moleculas).toHaveLength(N_ESCLEROSTINA);
    for (const m of moleculas) {
      expect(Math.hypot(...m.direccion)).toBeCloseTo(1, 6);
      expect(m.direccion[1]).toBeGreaterThan(0.3);
    }
  });

  it('las integrinas están sobre dendritas de la célula central', () => {
    const puntos = integrinasDeLaCentral(red);
    expect(puntos.length).toBeGreaterThan(10);
    for (const p of puntos) expect(dentroDelBloque(p)).toBe(true);
  });

  it('las células de la superficie se reparten a lo ancho del bloque, sin salirse', () => {
    const celulas = celulasDeSuperficie();
    expect(celulas).toHaveLength(N_CELULAS_SUPERFICIE);
    const [cx] = BLOQUE.centro;
    for (const c of celulas) {
      expect(c.x - c.ancho / 2).toBeGreaterThanOrEqual(cx - BLOQUE.ancho / 2);
      expect(c.x + c.ancho / 2).toBeLessThanOrEqual(cx + BLOQUE.ancho / 2);
    }
    for (let i = 1; i < celulas.length; i++)
      expect(celulas[i]!.x).toBeGreaterThan(celulas[i - 1]!.x);
  });
});
