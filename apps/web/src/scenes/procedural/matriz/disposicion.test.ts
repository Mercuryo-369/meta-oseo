/**
 * Pruebas de la disposición de las piezas repetidas de la escena de la matriz: deterministas, dentro de sus
 * límites y coherentes con el estado (escalonado de las moléculas, huecos en el plano de corte, cristales
 * en los huecos, proteínas pegadas a cristales, flechas hacia fuera y hacia dentro).
 */
import { describe, expect, it } from 'vitest';
import {
  LARGO_FLECHA,
  N_PROTEINAS,
  PLACA,
  cristalesDeFibrilla,
  desfaseDeFila,
  fibrasDeLaminilla,
  fibrasDeLaminillas,
  fibrillasVecinas,
  flechasDeCarga,
  huecosDeFibrilla,
  huellaDeLaminilla,
  moleculasDeFibrilla,
  posicionesDeReticula,
  proteinasDeFibrilla,
} from './disposicion';
import {
  ANGULOS_FIBRAS,
  LAMINILLA,
  LARGO_FIBRILLA,
  LARGO_HUECO,
  LARGO_MOLECULA,
  N_FIBRILLAS_VECINAS,
  PASO_FILA,
  PERIODO_D,
  R_FIBRILLA,
  R_FIBRILLA_VECINA,
} from './estado';

describe('fibrasDeLaminilla', () => {
  it.each(ANGULOS_FIBRAS)(
    'con %s° todas las fibras caben en la huella y son paralelas',
    (angulo) => {
      const fibras = fibrasDeLaminilla(angulo);
      expect(fibras.length).toBeGreaterThan(8);
      expect(fibrasDeLaminilla(angulo)).toEqual(fibras);
      for (const f of fibras) {
        expect(f.angulo).toBeCloseTo((angulo * Math.PI) / 180, 9);
        // Los dos extremos del segmento están dentro del rectángulo.
        const dx = (Math.cos(f.angulo) * f.largo) / 2;
        const dz = (Math.sin(f.angulo) * f.largo) / 2;
        for (const [x, z] of [
          [f.x - dx, f.z - dz],
          [f.x + dx, f.z + dz],
        ]) {
          expect(Math.abs(x)).toBeLessThanOrEqual(LAMINILLA.ancho / 2 + 1e-6);
          expect(Math.abs(z)).toBeLessThanOrEqual(LAMINILLA.fondo / 2 + 1e-6);
        }
      }
    },
  );

  it('la fibra central (desvío 0) existe y, con ángulo 0, recorre todo el ancho', () => {
    const central = fibrasDeLaminilla(0).find((f) => Math.abs(f.desvio) < 1e-9);
    expect(central).toBeDefined();
    expect(central!.largo).toBeCloseTo(LAMINILLA.ancho, 6);
  });

  it('las tres laminillas llevan su índice, alternan la dirección y se recortan en escalera', () => {
    const todas = fibrasDeLaminillas();
    const indices = new Set(todas.map((f) => f.laminilla));
    expect([...indices].sort()).toEqual([0, 1, 2]);
    expect(Math.sign(ANGULOS_FIBRAS[0]!)).not.toBe(Math.sign(ANGULOS_FIBRAS[2]!));
    for (let i = 1; i < 3; i++) {
      expect(huellaDeLaminilla(i).fondo).toBeLessThan(huellaDeLaminilla(i - 1).fondo);
      // La laminilla de encima nunca llega más adelante (hacia +Z) que la de abajo.
      const frente = (k: number) => huellaDeLaminilla(k).zCentro + huellaDeLaminilla(k).fondo / 2;
      expect(frente(i)).toBeLessThan(frente(i - 1));
    }
    for (const f of todas) {
      const { fondo, zCentro } = huellaDeLaminilla(f.laminilla);
      expect(Math.abs(f.z - zCentro)).toBeLessThanOrEqual(fondo / 2 + 1e-6);
    }
  });
});

describe('retícula y moléculas de la fibrilla', () => {
  it('la retícula queda dentro de la fibrilla y solo en su mitad trasera (z <= 0)', () => {
    const posiciones = posicionesDeReticula();
    expect(posiciones.length).toBeGreaterThan(40);
    for (const p of posiciones) {
      expect(Math.hypot(p.y, p.z)).toBeLessThan(R_FIBRILLA);
      expect(p.z).toBeLessThanOrEqual(1e-9);
      expect(p.frente).toBe(Math.abs(p.z) < 1e-9);
    }
    expect(posiciones.some((p) => p.frente)).toBe(true);
  });

  it('el desfase entre filas vecinas es un periodo D y se repite cada cinco filas', () => {
    for (let fila = -7; fila < 7; fila++) {
      const d = desfaseDeFila(fila + 1) - desfaseDeFila(fila);
      // Un periodo hacia delante, o la vuelta al principio (-4 D).
      expect(Math.abs(d - PERIODO_D) < 1e-9 || Math.abs(d + 4 * PERIODO_D) < 1e-9).toBe(true);
      expect(desfaseDeFila(fila)).toBeCloseTo(desfaseDeFila(fila + 5), 9);
    }
  });

  it('las moléculas son deterministas, miden 4,4 D salvo las recortadas y no salen de la fibrilla', () => {
    const moleculas = moleculasDeFibrilla();
    expect(moleculasDeFibrilla()).toEqual(moleculas);
    expect(moleculas.length).toBeGreaterThan(100);
    for (const m of moleculas) {
      expect(m.largo).toBeLessThanOrEqual(LARGO_MOLECULA + 1e-9);
      expect(m.x - m.largo / 2).toBeGreaterThanOrEqual(-LARGO_FIBRILLA / 2 - 1e-9);
      expect(m.x + m.largo / 2).toBeLessThanOrEqual(LARGO_FIBRILLA / 2 + 1e-9);
    }
    const enteras = moleculas.filter((m) => Math.abs(m.largo - LARGO_MOLECULA) < 1e-9);
    expect(enteras.length).toBeGreaterThan(moleculas.length / 3);
  });

  it('en una misma fila las moléculas vecinas dejan exactamente un hueco de 0,6 D', () => {
    const moleculas = moleculasDeFibrilla().filter((m) => m.frente);
    const porFila = new Map<number, number[]>();
    for (const m of moleculas) {
      const lista = porFila.get(m.fila) ?? [];
      lista.push(m.x);
      porFila.set(m.fila, lista);
    }
    for (const xs of porFila.values()) {
      xs.sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) {
        // Entre dos moléculas enteras consecutivas la distancia entre centros es 5 D.
        const enteras = xs.slice(1, -1);
        if (enteras.includes(xs[i]!) && enteras.includes(xs[i - 1]!)) {
          expect(xs[i]! - xs[i - 1]!).toBeCloseTo(PASO_FILA, 9);
        }
      }
    }
  });
});

describe('huecosDeFibrilla', () => {
  it('están en el plano de corte, dentro de la fibrilla y sobre el hueco real entre dos moléculas', () => {
    const huecos = huecosDeFibrilla();
    const moleculas = moleculasDeFibrilla().filter((m) => m.frente);
    expect(huecos.length).toBeGreaterThan(10);
    for (const h of huecos) {
      expect(h.z).toBe(0);
      expect(Math.abs(h.x) + LARGO_HUECO / 2).toBeLessThanOrEqual(LARGO_FIBRILLA / 2);
      // Ninguna molécula de su fila ocupa el centro del hueco.
      const ocupado = moleculas.some(
        (m) => Math.abs(m.y - h.y) < 1e-9 && Math.abs(m.x - h.x) < m.largo / 2 - 1e-6,
      );
      expect(ocupado).toBe(false);
    }
  });
});

describe('cristalesDeFibrilla y proteinasDeFibrilla', () => {
  const cristales = cristalesDeFibrilla();

  it('hay un cristal por hueco a la vista, y más a lo largo de la superficie; deterministas', () => {
    expect(cristalesDeFibrilla()).toEqual(cristales);
    const huecos = huecosDeFibrilla();
    expect(cristales.filter((c) => c.enHueco)).toHaveLength(huecos.length);
    expect(cristales.filter((c) => !c.enHueco).length).toBeGreaterThan(20);
    for (const c of cristales) {
      expect(Math.abs(c.x)).toBeLessThan(LARGO_FIBRILLA / 2);
      expect(c.escala).toBeGreaterThan(0.7);
      expect(Number.isFinite(c.giro)).toBe(true);
    }
    expect(PLACA.grosor).toBeLessThan(PLACA.alto);
    expect(PLACA.alto).toBeLessThan(PLACA.largo);
  });

  it('los cristales de la superficie quedan por detrás del plano de corte, pegados a la fibrilla', () => {
    for (const c of cristales.filter((x) => !x.enHueco)) {
      expect(c.z).toBeLessThan(0);
      expect(Math.hypot(c.y, c.z)).toBeCloseTo(R_FIBRILLA, 1);
    }
  });

  it('las proteínas son pocas, de tres tipos y están cerca de un cristal', () => {
    const proteinas = proteinasDeFibrilla(cristales);
    expect(proteinas).toHaveLength(N_PROTEINAS);
    expect(proteinasDeFibrilla(cristales)).toEqual(proteinas);
    expect(new Set(proteinas.map((p) => p.tipo))).toEqual(new Set([0, 1, 2]));
    for (const p of proteinas) {
      const distancia = Math.min(
        ...cristales.map((c) => Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z)),
      );
      expect(distancia).toBeLessThan(PLACA.largo / 2 + p.radio + 0.05);
    }
  });

  it('sin cristales no hay proteínas', () => {
    expect(proteinasDeFibrilla([])).toEqual([]);
  });
});

describe('fibrillasVecinas', () => {
  it('quedan todas por detrás de la abierta, sin tocarla ni tocarse entre sí', () => {
    const vecinas = fibrillasVecinas();
    expect(vecinas).toHaveLength(N_FIBRILLAS_VECINAS);
    for (const v of vecinas) {
      expect(v.z).toBeLessThan(-(R_FIBRILLA + R_FIBRILLA_VECINA));
    }
    for (let i = 1; i < vecinas.length; i++) {
      expect(vecinas[i]!.y - vecinas[i - 1]!.y).toBeGreaterThan(2 * R_FIBRILLA_VECINA);
    }
  });
});

describe('flechasDeCarga', () => {
  it('dos de tracción hacia fuera en el eje y seis de compresión hacia dentro, unitarias', () => {
    const flechas = flechasDeCarga();
    const traccion = flechas.filter((f) => f.tipo === 'traccion');
    const compresion = flechas.filter((f) => f.tipo === 'compresion');
    expect(traccion).toHaveLength(2);
    expect(compresion).toHaveLength(6);
    for (const f of flechas) {
      expect(Math.hypot(f.dx, f.dy, f.dz)).toBeCloseTo(1, 9);
      expect(f.largo).toBe(LARGO_FLECHA);
    }
    for (const f of traccion) {
      // Apunta hacia fuera: la dirección tiene el signo de la posición.
      expect(Math.sign(f.dx)).toBe(Math.sign(f.x));
      expect(Math.abs(f.x)).toBeGreaterThan(LARGO_FIBRILLA / 2);
    }
    for (const f of compresion) {
      // Apunta hacia el eje y no llega a tocar la fibrilla.
      expect(Math.sign(f.dy)).toBe(-Math.sign(f.y));
      expect(Math.abs(f.y) - f.largo).toBeGreaterThan(R_FIBRILLA);
    }
  });

  it('con estiramiento las flechas de tracción se apartan más', () => {
    const quietas = flechasDeCarga(0).filter((f) => f.tipo === 'traccion');
    const estiradas = flechasDeCarga(1).filter((f) => f.tipo === 'traccion');
    quietas.forEach((f, i) => expect(Math.abs(estiradas[i]!.x)).toBeGreaterThan(Math.abs(f.x)));
  });
});
