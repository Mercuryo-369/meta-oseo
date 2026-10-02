/**
 * Pruebas del estado puro de la escena del osteoblasto: `estadoOsteoblasto(t)` es una función pura del tiempo
 * (misma `t`, mismo estado), continua, con los valores esperados en el hito de cada fase y reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  CELULA_FOCO,
  DESTINOS,
  FASES_OSTEOBLASTO,
  HITOS_OSTEOBLASTO,
  LIMITES_FASES_OSTEOBLASTO,
  N_CELULAS,
  estadoOsteoblasto,
  faseOsteoblastoEnTiempo,
  xDeCelula,
} from './estado';
import type { EstadoOsteoblasto } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoOsteoblasto) => number): number[] {
  return muestras.map((t) => f(estadoOsteoblasto(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoOsteoblasto: fases e hitos', () => {
  it('cada hito está en su fase y los hitos van en orden estricto de 0 a 1', () => {
    expect(HITOS_OSTEOBLASTO.precursor).toBe(0);
    expect(HITOS_OSTEOBLASTO.reposo).toBe(1);
    FASES_OSTEOBLASTO.forEach((fase, i) => {
      expect(faseOsteoblastoEnTiempo(HITOS_OSTEOBLASTO[fase])).toBe(fase);
      if (i > 0)
        expect(HITOS_OSTEOBLASTO[fase]).toBeGreaterThan(
          HITOS_OSTEOBLASTO[FASES_OSTEOBLASTO[i - 1]!],
        );
    });
    expect(LIMITES_FASES_OSTEOBLASTO).toHaveLength(FASES_OSTEOBLASTO.length - 1);
  });

  it('los hitos son los que usa el contenido del módulo 2', () => {
    expect(HITOS_OSTEOBLASTO).toEqual({
      precursor: 0,
      diferenciacion: 0.16,
      organulos: 0.32,
      secrecion: 0.48,
      mineralizacion: 0.64,
      destino: 0.8,
      reposo: 1,
    });
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_OSTEOBLASTO.indexOf(estadoOsteoblasto(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });
});

describe('estadoOsteoblasto: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoOsteoblasto(0.63);
    estadoOsteoblasto(0.1);
    estadoOsteoblasto(0.99);
    expect(estadoOsteoblasto(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoOsteoblasto(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoOsteoblasto(t);
    expect(estadoOsteoblasto(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1]', () => {
    expect(estadoOsteoblasto(-3)).toEqual(estadoOsteoblasto(0));
    expect(estadoOsteoblasto(7)).toEqual(estadoOsteoblasto(1));
  });

  it('siempre hay N_CELULAS células en la fila, con la protagonista en x = 0', () => {
    for (const t of [0, 0.3, 0.7, 1]) {
      const e = estadoOsteoblasto(t);
      expect(e.celulas).toHaveLength(N_CELULAS);
      expect(e.celulas[CELULA_FOCO]!.x).toBe(0);
    }
    expect(xDeCelula(CELULA_FOCO)).toBe(0);
  });
});

describe('estadoOsteoblasto: continuidad y rangos', () => {
  const magnitudes: [string, (e: EstadoOsteoblasto) => number][] = [
    ['transparencia', (e) => e.transparencia],
    ['organulos', (e) => e.organulos],
    ['secrecion', (e) => e.secrecion],
    ['deposito', (e) => e.deposito],
    ['mineral', (e) => e.mineral],
    ['osteoide', (e) => e.osteoide],
    ['frente', (e) => e.frente],
    ['fragmentos', (e) => e.fragmentos],
    ['laguna', (e) => e.laguna],
    ['cobertura', (e) => e.cobertura],
    ...Array.from({ length: N_CELULAS }, (_, k): [string, (e: EstadoOsteoblasto) => number][] => [
      [`celulas[${k}].presencia`, (e) => e.celulas[k]!.presencia],
      [`celulas[${k}].cubico`, (e) => e.celulas[k]!.cubico],
      [`celulas[${k}].aplanado`, (e) => e.celulas[k]!.aplanado],
      [`celulas[${k}].hundido`, (e) => e.celulas[k]!.hundido],
      [`celulas[${k}].encogido`, (e) => e.celulas[k]!.encogido],
      [`celulas[${k}].x`, (e) => e.celulas[k]!.x],
      [`celulas[${k}].ancho`, (e) => e.celulas[k]!.ancho],
    ]).flat(),
  ];

  it.each(magnitudes)('%s no da saltos bruscos entre dos instantes cercanos', (_, f) => {
    expect(saltoMaximo(serie(f))).toBeLessThan(0.08);
  });

  it.each(magnitudes)('%s es un número finito en todo el recorrido', (_, f) => {
    for (const v of serie(f)) expect(Number.isFinite(v)).toBe(true);
  });

  it('las fracciones están entre 0 y 1 y el ciclo de las vesículas también', () => {
    for (const t of muestras) {
      const e = estadoOsteoblasto(t);
      const fracciones = [
        e.transparencia,
        e.organulos,
        e.secrecion,
        e.frente,
        e.fragmentos,
        e.laguna,
        e.cobertura,
        e.cicloVesiculas,
        ...e.celulas.flatMap((c) => [c.presencia, c.cubico, c.aplanado, c.hundido, c.encogido]),
      ];
      for (const v of fracciones) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('el frente de mineralización nunca supera la superficie: el osteoide no es negativo', () => {
    for (const t of muestras) {
      const e = estadoOsteoblasto(t);
      expect(e.mineral).toBeLessThanOrEqual(e.deposito + 1e-9);
      expect(e.osteoide).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('el depósito y el frente de mineralización solo crecen', () => {
    for (const f of [(e: EstadoOsteoblasto) => e.deposito, (e: EstadoOsteoblasto) => e.mineral]) {
      const valores = serie(f);
      for (let i = 1; i < valores.length; i++)
        expect(valores[i]).toBeGreaterThanOrEqual(valores[i - 1]! - 1e-9);
    }
  });
});

describe('estadoOsteoblasto: qué se ve en cada fase', () => {
  it('precursor: una sola célula, fusiforme y pálida, sin hueso nuevo', () => {
    const e = estadoOsteoblasto(HITOS_OSTEOBLASTO.precursor);
    expect(e.celulas[CELULA_FOCO]!.presencia).toBe(1);
    expect(e.celulas[CELULA_FOCO]!.cubico).toBe(0);
    e.celulas.forEach((c, k) => {
      if (k !== CELULA_FOCO) expect(c.presencia).toBe(0);
    });
    expect(e.mineral).toBe(0);
    expect(e.osteoide).toBeGreaterThan(0);
    expect(e.osteoide).toBeLessThan(0.1);
    expect(e.transparencia).toBe(0);
  });

  it('diferenciacion: toda la fila presente y cúbica, todavía opaca', () => {
    const e = estadoOsteoblasto(HITOS_OSTEOBLASTO.diferenciacion);
    for (const c of e.celulas) {
      expect(c.presencia).toBeCloseTo(1, 6);
      expect(c.cubico).toBe(1);
      expect(c.aplanado).toBe(0);
    }
    expect(e.transparencia).toBe(0);
    expect(e.secrecion).toBe(0);
  });

  it('organulos: la protagonista transparente y los orgánulos a la vista, sin secreción aún', () => {
    const e = estadoOsteoblasto(HITOS_OSTEOBLASTO.organulos);
    expect(e.transparencia).toBe(1);
    expect(e.organulos).toBe(1);
    expect(e.secrecion).toBe(0);
    expect(e.deposito).toBeLessThan(0.1);
  });

  it('secrecion: vesículas en marcha y osteoide grueso sin mineralizar', () => {
    const e = estadoOsteoblasto(HITOS_OSTEOBLASTO.secrecion);
    expect(e.secrecion).toBe(1);
    expect(e.transparencia).toBe(1);
    expect(e.mineral).toBe(0);
    expect(e.osteoide).toBeGreaterThan(0.4);
  });

  it('mineralizacion: hueso nuevo bajo un osteoide fino y frente destacado; célula opaca', () => {
    const e = estadoOsteoblasto(HITOS_OSTEOBLASTO.mineralizacion);
    expect(e.mineral).toBeGreaterThan(0.5);
    expect(e.osteoide).toBeGreaterThan(0.1);
    expect(e.osteoide).toBeLessThan(0.35);
    expect(e.frente).toBe(1);
    expect(e.transparencia).toBe(0);
    for (const c of e.celulas) {
      expect(c.hundido).toBe(0);
      expect(c.aplanado).toBe(0);
      expect(c.encogido).toBe(0);
    }
  });

  it('destino: tres destinos a la vez, uno por célula, y la laguna a la vista', () => {
    const e = estadoOsteoblasto(HITOS_OSTEOBLASTO.destino);
    expect(e.celulas[DESTINOS.osteocito]!.hundido).toBe(1);
    expect(e.celulas[DESTINOS.revestimiento]!.aplanado).toBe(1);
    expect(e.celulas[DESTINOS.apoptosis]!.encogido).toBeGreaterThan(0.7);
    expect(e.celulas[DESTINOS.apoptosis]!.encogido).toBeLessThan(1);
    expect(e.fragmentos).toBe(1);
    expect(e.laguna).toBe(1);
    // Las de los extremos siguen siendo osteoblastos.
    expect(e.celulas[0]!.aplanado).toBe(0);
    expect(e.celulas[N_CELULAS - 1]!.aplanado).toBe(0);
  });

  it('reposo: superficie tapizada por células planas que cubren los huecos, sin fragmentos ni osteoide', () => {
    const e = estadoOsteoblasto(HITOS_OSTEOBLASTO.reposo);
    expect(e.celulas[DESTINOS.apoptosis]!.encogido).toBe(1);
    expect(e.fragmentos).toBe(0);
    expect(e.celulas[DESTINOS.osteocito]!.hundido).toBe(1);
    expect(e.laguna).toBe(1);
    for (const k of [0, DESTINOS.revestimiento, N_CELULAS - 1]) {
      expect(e.celulas[k]!.aplanado).toBe(1);
      expect(e.celulas[k]!.ancho).toBeGreaterThan(1);
    }
    expect(e.cobertura).toBe(1);
    expect(e.osteoide).toBeLessThan(0.05);
    expect(e.mineral).toBeGreaterThan(0.9);
  });
});
