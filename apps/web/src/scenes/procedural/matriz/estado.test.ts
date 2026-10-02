/**
 * Pruebas del estado puro de la escena "dentro de la matriz ósea": `estadoMatriz(t)` es una función pura del
 * tiempo (misma `t`, mismo estado), continua, con los valores esperados en el hito de cada fase y reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  FASES_MATRIZ,
  HITOS_MATRIZ,
  LARGO_HUECO,
  LARGO_MOLECULA,
  LIMITES_FASES_MATRIZ,
  PASO_FILA,
  PERIODO_D,
  estadoMatriz,
  faseMatrizEnTiempo,
} from './estado';
import type { EstadoMatriz } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoMatriz) => number): number[] {
  return muestras.map((t) => f(estadoMatriz(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoMatriz: fases e hitos', () => {
  it('conserva los hitos que usa el contenido del módulo 1', () => {
    expect(HITOS_MATRIZ).toEqual({
      fragmento: 0,
      fibras: 0.17,
      fibrilla: 0.34,
      huecos: 0.5,
      mineral: 0.64,
      proteinas: 0.78,
      carga: 1,
    });
  });

  it('cada hito está en su fase y los hitos van en orden estricto de 0 a 1', () => {
    FASES_MATRIZ.forEach((fase, i) => {
      expect(faseMatrizEnTiempo(HITOS_MATRIZ[fase])).toBe(fase);
      if (i > 0) expect(HITOS_MATRIZ[fase]).toBeGreaterThan(HITOS_MATRIZ[FASES_MATRIZ[i - 1]!]);
    });
    expect(LIMITES_FASES_MATRIZ).toHaveLength(FASES_MATRIZ.length - 1);
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_MATRIZ.indexOf(estadoMatriz(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });

  it('el modelo de Hodge-Petruska: molécula de 4,4 D, hueco de 0,6 D, periodo de fila de 5 D', () => {
    expect(LARGO_MOLECULA).toBeCloseTo(4.4 * PERIODO_D, 9);
    expect(LARGO_HUECO).toBeCloseTo(0.6 * PERIODO_D, 9);
    expect(PASO_FILA).toBeCloseTo(5 * PERIODO_D, 9);
  });
});

describe('estadoMatriz: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoMatriz(0.63);
    estadoMatriz(0.1);
    estadoMatriz(0.99);
    expect(estadoMatriz(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoMatriz(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoMatriz(t);
    expect(estadoMatriz(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1]', () => {
    expect(estadoMatriz(-3)).toEqual(estadoMatriz(0));
    expect(estadoMatriz(7)).toEqual(estadoMatriz(1));
  });
});

describe('estadoMatriz: continuidad y rangos', () => {
  const magnitudes: [string, (e: EstadoMatriz) => number][] = [
    ['fragmento.opacidad', (e) => e.fragmento.opacidad],
    ['fragmento.escala', (e) => e.fragmento.escala],
    ['laminillas.opacidad', (e) => e.laminillas.opacidad],
    ['laminillas.escala', (e) => e.laminillas.escala],
    ['resalteFibra', (e) => e.resalteFibra],
    ['fibrilla.opacidad', (e) => e.fibrilla.opacidad],
    ['fibrilla.escala', (e) => e.fibrilla.escala],
    ['vecinas', (e) => e.vecinas],
    ['huecos', (e) => e.huecos],
    ['mineral', (e) => e.mineral],
    ['proteinas', (e) => e.proteinas],
    ['flechas', (e) => e.flechas],
    ['estiramiento', (e) => e.estiramiento],
  ];

  it.each(magnitudes)('%s no da saltos bruscos entre dos instantes cercanos', (_, f) => {
    expect(saltoMaximo(serie(f))).toBeLessThan(0.08);
  });

  it.each(magnitudes)('%s es un número finito en todo el recorrido', (_, f) => {
    for (const v of serie(f)) expect(Number.isFinite(v)).toBe(true);
  });

  it('las opacidades y los énfasis están entre 0 y 1', () => {
    for (const t of muestras) {
      const e = estadoMatriz(t);
      for (const v of [
        e.fragmento.opacidad,
        e.laminillas.opacidad,
        e.resalteFibra,
        e.fibrilla.opacidad,
        e.vecinas,
        e.huecos,
        e.mineral,
        e.proteinas,
        e.flechas,
        e.estiramiento,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('en todo instante hay al menos una escala a la vista', () => {
    for (const t of muestras) {
      const e = estadoMatriz(t);
      const maxima = Math.max(e.fragmento.opacidad, e.laminillas.opacidad, e.fibrilla.opacidad);
      expect(maxima, `t = ${t}`).toBeGreaterThan(0.3);
    }
  });
});

describe('estadoMatriz: qué se ve en cada fase', () => {
  it('fragmento: solo el bloque de hueso laminar, opaco y a tamaño natural', () => {
    const e = estadoMatriz(HITOS_MATRIZ.fragmento);
    expect(e.fragmento.opacidad).toBe(1);
    expect(e.fragmento.escala).toBe(1);
    expect(e.laminillas.opacidad).toBe(0);
    expect(e.fibrilla.opacidad).toBe(0);
  });

  it('fibras: las laminillas ampliadas, sin el fragmento, con la fibra aún sin destacar', () => {
    const e = estadoMatriz(HITOS_MATRIZ.fibras);
    expect(e.fragmento.opacidad).toBe(0);
    expect(e.laminillas.opacidad).toBe(1);
    expect(e.laminillas.escala).toBe(1);
    expect(e.resalteFibra).toBe(0);
    expect(e.fibrilla.opacidad).toBe(0);
  });

  it('fibrilla: la fibrilla abierta con sus vecinas, sin huecos ni mineral', () => {
    const e = estadoMatriz(HITOS_MATRIZ.fibrilla);
    expect(e.laminillas.opacidad).toBe(0);
    expect(e.fibrilla.opacidad).toBe(1);
    expect(e.vecinas).toBe(1);
    expect(e.huecos).toBe(0);
    expect(e.mineral).toBe(0);
  });

  it('huecos: los huecos destacados, las vecinas atenuadas y aún sin mineral', () => {
    const e = estadoMatriz(HITOS_MATRIZ.huecos);
    expect(e.huecos).toBe(1);
    expect(e.vecinas).toBeLessThan(0.5);
    expect(e.mineral).toBe(0);
    expect(e.proteinas).toBe(0);
  });

  it('mineral: los cristales crecidos del todo, los huecos en segundo plano, sin proteínas', () => {
    const e = estadoMatriz(HITOS_MATRIZ.mineral);
    expect(e.mineral).toBe(1);
    expect(e.huecos).toBeGreaterThan(0);
    expect(e.huecos).toBeLessThan(1);
    expect(e.proteinas).toBe(0);
  });

  it('proteinas: proteínas a la vista, sin flechas todavía', () => {
    const e = estadoMatriz(HITOS_MATRIZ.proteinas);
    expect(e.proteinas).toBe(1);
    expect(e.mineral).toBe(1);
    expect(e.flechas).toBe(0);
    expect(e.estiramiento).toBe(0);
  });

  it('carga: flechas completas, fibrilla estirada, huecos ya sin destacar', () => {
    const e = estadoMatriz(HITOS_MATRIZ.carga);
    expect(e.flechas).toBe(1);
    expect(e.estiramiento).toBe(1);
    expect(e.huecos).toBe(0);
    expect(e.vecinas).toBe(0);
    expect(e.mineral).toBe(1);
    expect(e.proteinas).toBe(1);
  });
});
