/**
 * Pruebas del estado puro de la escena "del hueso largo a la osteona": `estadoHueso(t)` es una función pura del
 * tiempo (misma `t`, mismo estado), continua, con los valores esperados en el hito de cada fase y reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  FASES_HUESO,
  HITOS_HUESO,
  LIMITES_FASES_HUESO,
  estadoHueso,
  faseHuesoEnTiempo,
} from './estado';
import type { EstadoHueso } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoHueso) => number): number[] {
  return muestras.map((t) => f(estadoHueso(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoHueso: fases e hitos', () => {
  it('cada hito está en su fase y los hitos van en orden estricto de 0 a 1', () => {
    expect(HITOS_HUESO.entero).toBe(0);
    expect(HITOS_HUESO.osteocitos).toBe(1);
    FASES_HUESO.forEach((fase, i) => {
      expect(faseHuesoEnTiempo(HITOS_HUESO[fase])).toBe(fase);
      if (i > 0) expect(HITOS_HUESO[fase]).toBeGreaterThan(HITOS_HUESO[FASES_HUESO[i - 1]!]);
    });
    expect(LIMITES_FASES_HUESO).toHaveLength(FASES_HUESO.length - 1);
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_HUESO.indexOf(estadoHueso(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });
});

describe('estadoHueso: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoHueso(0.63);
    estadoHueso(0.1);
    estadoHueso(0.99);
    expect(estadoHueso(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoHueso(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoHueso(t);
    expect(estadoHueso(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1]', () => {
    expect(estadoHueso(-3)).toEqual(estadoHueso(0));
    expect(estadoHueso(7)).toEqual(estadoHueso(1));
  });
});

describe('estadoHueso: continuidad y rangos', () => {
  const magnitudes: [string, (e: EstadoHueso) => number][] = [
    ['apertura', (e) => e.apertura],
    ['periostio', (e) => e.periostio],
    ['hueso.opacidad', (e) => e.hueso.opacidad],
    ['hueso.escala', (e) => e.hueso.escala],
    ['losa.opacidad', (e) => e.losa.opacidad],
    ['losa.escala', (e) => e.losa.escala],
    ['losa.x', (e) => e.losa.x],
    ['losa.y', (e) => e.losa.y],
    ['explosion', (e) => e.explosion],
    ['resalte', (e) => e.resalte],
    ['osteona.opacidad', (e) => e.osteona.opacidad],
    ['osteona.escala', (e) => e.osteona.escala],
    ['osteocitos', (e) => e.osteocitos],
  ];

  it.each(magnitudes)('%s no da saltos bruscos entre dos instantes cercanos', (_, f) => {
    expect(saltoMaximo(serie(f))).toBeLessThan(0.08);
  });

  it.each(magnitudes)('%s es un número finito en todo el recorrido', (_, f) => {
    for (const v of serie(f)) expect(Number.isFinite(v)).toBe(true);
  });

  it('las opacidades y los énfasis están entre 0 y 1', () => {
    for (const t of muestras) {
      const e = estadoHueso(t);
      for (const v of [
        e.apertura,
        e.periostio,
        e.hueso.opacidad,
        e.losa.opacidad,
        e.explosion,
        e.resalte,
        e.osteona.opacidad,
        e.osteocitos,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('estadoHueso: qué se ve en cada fase', () => {
  it('entero: hueso cerrado y opaco, con periostio, sin corte ni osteona', () => {
    const e = estadoHueso(HITOS_HUESO.entero);
    expect(e.apertura).toBe(0);
    expect(e.hueso.opacidad).toBe(1);
    expect(e.periostio).toBeGreaterThan(0.4);
    expect(e.losa.opacidad).toBe(0);
    expect(e.osteona.opacidad).toBe(0);
  });

  it('abierto: la cuña apartada del todo y el periostio ya quitado', () => {
    const e = estadoHueso(HITOS_HUESO.abierto);
    expect(e.apertura).toBe(1);
    expect(e.periostio).toBe(0);
    expect(e.hueso.opacidad).toBe(1);
  });

  it('corte: el hueso entero ya no se ve y el corte sí, con las capas juntas', () => {
    const e = estadoHueso(HITOS_HUESO.corte);
    expect(e.hueso.opacidad).toBe(0);
    expect(e.losa.opacidad).toBe(1);
    expect(e.explosion).toBe(0);
  });

  it('capas: las capas del corte, separadas', () => {
    const e = estadoHueso(HITOS_HUESO.capas);
    expect(e.losa.opacidad).toBe(1);
    expect(e.explosion).toBe(1);
  });

  it('osteonas: capas juntas otra vez y las osteonas destacadas', () => {
    const e = estadoHueso(HITOS_HUESO.osteonas);
    expect(e.explosion).toBe(0);
    expect(e.resalte).toBe(1);
    expect(e.osteona.opacidad).toBe(0);
  });

  it('osteona: la osteona ampliada a la vista y el corte apartado y pequeño', () => {
    const e = estadoHueso(HITOS_HUESO.osteona);
    expect(e.osteona.opacidad).toBe(1);
    expect(e.osteona.escala).toBeCloseTo(1, 2);
    expect(e.losa.escala).toBeLessThan(0.5);
    expect(e.osteocitos).toBeLessThan(0.3);
  });

  it('osteocitos: los osteocitos resaltados', () => {
    const e = estadoHueso(HITOS_HUESO.osteocitos);
    expect(e.osteona.opacidad).toBe(1);
    expect(e.osteocitos).toBe(1);
  });
});
