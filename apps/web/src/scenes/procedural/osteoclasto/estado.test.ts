/**
 * Pruebas del estado puro de la escena del osteoclasto: `estadoOsteoclasto(t)` es una función pura del tiempo
 * (misma `t`, mismo estado), continua, acotada, con los valores esperados en el hito de cada fase y reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  BASE_CUPULA,
  CELULA_APLANADA,
  FASES_OSTEOCLASTO,
  HITOS_OSTEOCLASTO,
  LIMITES_FASES_OSTEOCLASTO,
  PROFUNDIDAD_LAGUNA,
  R_CELULA_REDONDA,
  R_LAGUNA,
  dimensionesCelula,
  estadoOsteoclasto,
  faseOsteoclastoEnTiempo,
  profundidadLaguna,
} from './estado';
import type { EstadoOsteoclasto } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoOsteoclasto) => number): number[] {
  return muestras.map((t) => f(estadoOsteoclasto(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoOsteoclasto: fases e hitos', () => {
  it('conserva los hitos que usa el contenido del módulo 2', () => {
    expect(HITOS_OSTEOCLASTO).toEqual({
      precursores: 0,
      fusion: 0.16,
      adhesion: 0.32,
      borde_rugoso: 0.48,
      resorcion: 0.64,
      liberacion: 0.8,
      apoptosis: 1,
    });
  });

  it('cada hito está en su fase y los hitos van en orden estricto de 0 a 1', () => {
    FASES_OSTEOCLASTO.forEach((fase, i) => {
      expect(faseOsteoclastoEnTiempo(HITOS_OSTEOCLASTO[fase])).toBe(fase);
      if (i > 0) {
        expect(HITOS_OSTEOCLASTO[fase]).toBeGreaterThan(
          HITOS_OSTEOCLASTO[FASES_OSTEOCLASTO[i - 1]!],
        );
      }
    });
    expect(LIMITES_FASES_OSTEOCLASTO).toHaveLength(FASES_OSTEOCLASTO.length - 1);
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_OSTEOCLASTO.indexOf(estadoOsteoclasto(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });
});

describe('estadoOsteoclasto: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoOsteoclasto(0.63);
    estadoOsteoclasto(0.1);
    estadoOsteoclasto(0.99);
    expect(estadoOsteoclasto(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoOsteoclasto(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoOsteoclasto(t);
    expect(estadoOsteoclasto(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1] y lo devuelve acotado', () => {
    expect(estadoOsteoclasto(-3)).toEqual(estadoOsteoclasto(0));
    expect(estadoOsteoclasto(7)).toEqual(estadoOsteoclasto(1));
    expect(estadoOsteoclasto(7).t).toBe(1);
  });
});

describe('estadoOsteoclasto: continuidad y rangos', () => {
  const magnitudes: [string, (e: EstadoOsteoclasto) => number][] = [
    ['precursores.llegada', (e) => e.precursores.llegada],
    ['precursores.fusion', (e) => e.precursores.fusion],
    ['celula.escala', (e) => e.celula.escala],
    ['celula.aplanamiento', (e) => e.celula.aplanamiento],
    ['celula.encogimiento', (e) => e.celula.encogimiento],
    ['celula.opacidad', (e) => e.celula.opacidad],
    ['sellado', (e) => e.sellado],
    ['corte', (e) => e.corte],
    ['pliegues', (e) => e.pliegues],
    ['bombeo', (e) => e.bombeo],
    ['excavacion', (e) => e.excavacion],
    ['liberacion', (e) => e.liberacion],
    ['fragmentacion', (e) => e.fragmentacion],
    ['inversion', (e) => e.inversion],
    ['dimensiones.rx', (e) => dimensionesCelula(e).rx],
    ['dimensiones.ry', (e) => dimensionesCelula(e).ry],
    ['dimensiones.centroY', (e) => dimensionesCelula(e).centroY],
  ];

  it.each(magnitudes)('%s no da saltos bruscos entre dos instantes cercanos', (_, f) => {
    expect(saltoMaximo(serie(f))).toBeLessThan(0.08);
  });

  it.each(magnitudes)('%s es un número finito en todo el recorrido', (_, f) => {
    for (const v of serie(f)) expect(Number.isFinite(v)).toBe(true);
  });

  it('las fracciones están entre 0 y 1', () => {
    for (const t of muestras) {
      const e = estadoOsteoclasto(t);
      for (const v of [
        e.precursores.llegada,
        e.precursores.fusion,
        e.celula.escala,
        e.celula.aplanamiento,
        e.celula.encogimiento,
        e.celula.opacidad,
        e.sellado,
        e.corte,
        e.pliegues,
        e.bombeo,
        e.excavacion,
        e.liberacion,
        e.fragmentacion,
        e.inversion,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('la excavación y el corte no retroceden: la laguna y la sección se quedan', () => {
    for (const f of [(e: EstadoOsteoclasto) => e.excavacion, (e: EstadoOsteoclasto) => e.corte]) {
      const valores = serie(f);
      for (let i = 1; i < valores.length; i++) {
        expect(valores[i]!).toBeGreaterThanOrEqual(valores[i - 1]! - 1e-9);
      }
    }
  });
});

describe('estadoOsteoclasto: qué se ve en cada fase', () => {
  it('precursores: células sueltas saliendo del capilar, sin célula grande ni laguna', () => {
    const e = estadoOsteoclasto(HITOS_OSTEOCLASTO.precursores);
    expect(e.precursores.llegada).toBe(0);
    expect(e.precursores.fusion).toBe(0);
    expect(e.celula.escala).toBe(0);
    expect(e.sellado).toBe(0);
    expect(e.corte).toBe(0);
    expect(e.excavacion).toBe(0);
  });

  it('fusion: los precursores ya llegaron y se están fundiendo en una célula redonda', () => {
    const e = estadoOsteoclasto(HITOS_OSTEOCLASTO.fusion);
    expect(e.precursores.llegada).toBe(1);
    expect(e.precursores.fusion).toBeGreaterThan(0.5);
    expect(e.celula.escala).toBeGreaterThan(0.5);
    expect(e.celula.aplanamiento).toBe(0);
    expect(e.sellado).toBe(0);
    const d = dimensionesCelula(e);
    expect(d.rx).toBeCloseTo(d.ry, 6);
  });

  it('adhesion: célula aplanada, con anillo de sellado, aún sin corte ni pliegues', () => {
    const e = estadoOsteoclasto(HITOS_OSTEOCLASTO.adhesion);
    expect(e.celula.escala).toBe(1);
    expect(e.celula.aplanamiento).toBe(1);
    expect(e.sellado).toBe(1);
    expect(e.corte).toBe(0);
    expect(e.pliegues).toBe(0);
    expect(e.excavacion).toBe(0);
    const d = dimensionesCelula(e);
    expect(d.rx).toBeCloseTo(CELULA_APLANADA.rx, 6);
    expect(d.ry).toBeCloseTo(CELULA_APLANADA.ry, 6);
    // El borde inferior de la cúpula apoya justo en la superficie.
    expect(d.centroY + BASE_CUPULA * d.ry).toBeCloseTo(0, 6);
  });

  it('borde_rugoso: escena cortada, pliegues completos y salida ácida, laguna todavía lisa', () => {
    const e = estadoOsteoclasto(HITOS_OSTEOCLASTO.borde_rugoso);
    expect(e.corte).toBe(1);
    expect(e.pliegues).toBe(1);
    expect(e.bombeo).toBeGreaterThan(0.7);
    expect(e.excavacion).toBe(0);
    expect(e.liberacion).toBe(0);
  });

  it('resorcion: la laguna se excava mientras sigue el bombeo', () => {
    const e = estadoOsteoclasto(HITOS_OSTEOCLASTO.resorcion);
    expect(e.excavacion).toBe(1);
    expect(e.bombeo).toBe(1);
    expect(e.liberacion).toBe(0);
    expect(e.sellado).toBe(1);
  });

  it('liberacion: productos hacia el capilar, bombeo terminado, laguna completa', () => {
    const e = estadoOsteoclasto(HITOS_OSTEOCLASTO.liberacion);
    expect(e.liberacion).toBe(1);
    expect(e.bombeo).toBe(0);
    expect(e.excavacion).toBe(1);
    expect(e.fragmentacion).toBe(0);
    expect(e.celula.encogimiento).toBe(1);
  });

  it('apoptosis: célula encogida y casi transparente, fragmentos, sin sellado ni pliegues, y células de inversión', () => {
    const e = estadoOsteoclasto(HITOS_OSTEOCLASTO.apoptosis);
    expect(e.celula.encogimiento).toBeLessThan(0.35);
    expect(e.celula.opacidad).toBeLessThan(0.15);
    expect(e.fragmentacion).toBe(1);
    expect(e.inversion).toBe(1);
    expect(e.sellado).toBe(0);
    expect(e.pliegues).toBe(0);
    expect(e.liberacion).toBe(0);
    expect(e.excavacion).toBe(1);
  });
});

describe('dimensionesCelula y profundidadLaguna', () => {
  it('la célula recién fusionada es una esfera del radio previsto', () => {
    const d = dimensionesCelula(estadoOsteoclasto(0.21));
    expect(d.rx).toBeCloseTo(R_CELULA_REDONDA, 6);
    expect(d.ry).toBeCloseTo(R_CELULA_REDONDA, 6);
  });

  it('la laguna es nula sin excavación y fuera de su radio, y máxima en el centro', () => {
    expect(profundidadLaguna(0, 0, 0)).toBe(0);
    expect(profundidadLaguna(R_LAGUNA * 1.1, 0, 1)).toBe(0);
    expect(profundidadLaguna(0, 0, 1)).toBeCloseTo(PROFUNDIDAD_LAGUNA, 6);
    expect(profundidadLaguna(0, 0, 0.5)).toBeCloseTo(PROFUNDIDAD_LAGUNA / 2, 6);
  });

  it('la laguna nunca es negativa ni pasa de su profundidad máxima ampliada por las ondas', () => {
    for (let x = -1.5; x <= 1.5; x += 0.05) {
      for (let z = -1.5; z <= 1.5; z += 0.05) {
        const p = profundidadLaguna(x, z, 1);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(PROFUNDIDAD_LAGUNA * 1.13);
      }
    }
  });

  it('la laguna cabe dentro del anillo de sellado (radio festoneado menor que 1,08 · R_LAGUNA)', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.01) {
      const r = R_LAGUNA * 1.08;
      expect(profundidadLaguna(r * Math.cos(a), r * Math.sin(a), 1)).toBe(0);
    }
  });
});
