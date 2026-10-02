/**
 * Pruebas del estado puro de la escena de la mandíbula fetal: `estadoMandibulaFetal(t)` es una función pura del
 * tiempo (misma `t`, mismo estado), continua, con los valores esperados en el hito de cada fase y reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  ALCANCE_COMPLETO,
  FASES_MANDIBULA_FETAL,
  HITOS_MANDIBULA_FETAL,
  LIMITES_FASES_MANDIBULA_FETAL,
  estadoMandibulaFetal,
  faseMandibulaFetalEnTiempo,
} from './estado';
import type { EstadoMandibulaFetal } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoMandibulaFetal) => number): number[] {
  return muestras.map((t) => f(estadoMandibulaFetal(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoMandibulaFetal: fases e hitos', () => {
  it('los hitos son los que usa el contenido del módulo 2', () => {
    expect(HITOS_MANDIBULA_FETAL).toEqual({
      mesenquima: 0,
      condensacion: 0.17,
      centro: 0.34,
      extension: 0.5,
      cartilagos_secundarios: 0.66,
      meckel_regresion: 0.83,
      nacimiento: 1,
    });
  });

  it('cada hito está en su fase y los hitos van en orden estricto de 0 a 1', () => {
    FASES_MANDIBULA_FETAL.forEach((fase, i) => {
      expect(faseMandibulaFetalEnTiempo(HITOS_MANDIBULA_FETAL[fase])).toBe(fase);
      if (i > 0) {
        expect(HITOS_MANDIBULA_FETAL[fase]).toBeGreaterThan(
          HITOS_MANDIBULA_FETAL[FASES_MANDIBULA_FETAL[i - 1]!],
        );
      }
    });
    expect(LIMITES_FASES_MANDIBULA_FETAL).toHaveLength(FASES_MANDIBULA_FETAL.length - 1);
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_MANDIBULA_FETAL.indexOf(estadoMandibulaFetal(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });
});

describe('estadoMandibulaFetal: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoMandibulaFetal(0.63);
    estadoMandibulaFetal(0.1);
    estadoMandibulaFetal(0.99);
    expect(estadoMandibulaFetal(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoMandibulaFetal(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoMandibulaFetal(t);
    expect(estadoMandibulaFetal(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1]', () => {
    expect(estadoMandibulaFetal(-3)).toEqual(estadoMandibulaFetal(0));
    expect(estadoMandibulaFetal(7)).toEqual(estadoMandibulaFetal(1));
  });
});

describe('estadoMandibulaFetal: continuidad y rangos', () => {
  const magnitudes: [string, (e: EstadoMandibulaFetal) => number][] = [
    ['mesenquima', (e) => e.mesenquima],
    ['condensacion', (e) => e.condensacion],
    ['hueso.alcance', (e) => e.hueso.alcance],
    ['hueso.tamano', (e) => e.hueso.tamano],
    ['hueso.alveolar', (e) => e.hueso.alveolar],
    ['hueso.resalteCentro', (e) => e.hueso.resalteCentro],
    ['hueso.rama', (e) => e.hueso.rama],
    ['germenes', (e) => e.germenes],
    ['cartilagos.condilar', (e) => e.cartilagos.condilar],
    ['cartilagos.coronoideo', (e) => e.cartilagos.coronoideo],
    ['cartilagos.sinfisario', (e) => e.cartilagos.sinfisario],
    ['cartilagos.osificacionCondilo', (e) => e.cartilagos.osificacionCondilo],
    ['meckel.regresion', (e) => e.meckel.regresion],
    ['meckel.osiculos', (e) => e.meckel.osiculos],
  ];

  it.each(magnitudes)('%s no da saltos bruscos entre dos instantes cercanos', (_, f) => {
    expect(saltoMaximo(serie(f))).toBeLessThan(0.05);
  });

  it.each(magnitudes)('%s es un número finito en todo el recorrido', (_, f) => {
    for (const v of serie(f)) expect(Number.isFinite(v)).toBe(true);
  });

  it('las opacidades, los tamaños relativos y los énfasis están entre 0 y 1', () => {
    for (const t of muestras) {
      const e = estadoMandibulaFetal(t);
      for (const v of [
        e.mesenquima,
        e.condensacion,
        e.hueso.alveolar,
        e.hueso.resalteCentro,
        e.hueso.rama,
        e.germenes,
        e.cartilagos.condilar,
        e.cartilagos.coronoideo,
        e.cartilagos.sinfisario,
        e.cartilagos.osificacionCondilo,
        e.meckel.regresion,
        e.meckel.osiculos,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(e.hueso.alcance).toBeGreaterThanOrEqual(0);
      expect(e.hueso.alcance).toBeLessThanOrEqual(ALCANCE_COMPLETO);
      expect(e.hueso.tamano).toBeGreaterThan(0);
    }
  });

  it('el hueso solo crece: alcance, tamaño y rama nunca retroceden', () => {
    for (const f of [
      (e: EstadoMandibulaFetal) => e.hueso.alcance,
      (e: EstadoMandibulaFetal) => e.hueso.tamano,
      (e: EstadoMandibulaFetal) => e.hueso.rama,
      (e: EstadoMandibulaFetal) => e.meckel.regresion,
    ]) {
      const valores = serie(f);
      for (let i = 1; i < valores.length; i++) {
        expect(valores[i]).toBeGreaterThanOrEqual(valores[i - 1]! - 1e-9);
      }
    }
  });
});

describe('estadoMandibulaFetal: qué se ve en cada fase', () => {
  it('mesenquima: solo la masa de mesénquima y el cartílago de Meckel entero; nada de hueso', () => {
    const e = estadoMandibulaFetal(HITOS_MANDIBULA_FETAL.mesenquima);
    expect(e.mesenquima).toBeGreaterThan(0.3);
    expect(e.condensacion).toBe(0);
    expect(e.hueso.alcance).toBe(0);
    expect(e.germenes).toBe(0);
    expect(e.hueso.rama).toBe(0);
    expect(e.meckel.regresion).toBe(0);
    expect(e.meckel.osiculos).toBe(0);
  });

  it('condensacion: la mancha condensada a la vista, todavía sin hueso', () => {
    const e = estadoMandibulaFetal(HITOS_MANDIBULA_FETAL.condensacion);
    expect(e.condensacion).toBe(1);
    expect(e.hueso.alcance).toBe(0);
    expect(e.mesenquima).toBeGreaterThan(0.3);
  });

  it('centro: una placa pequeña de hueso destacada, con la condensación ya casi ida', () => {
    const e = estadoMandibulaFetal(HITOS_MANDIBULA_FETAL.centro);
    expect(e.hueso.alcance).toBeGreaterThan(0.03);
    expect(e.hueso.alcance).toBeLessThan(0.15);
    expect(e.hueso.tamano).toBeLessThan(0.5);
    expect(e.hueso.alveolar).toBe(0);
    expect(e.hueso.resalteCentro).toBe(1);
    expect(e.condensacion).toBeLessThan(0.1);
    expect(e.germenes).toBe(0);
  });

  it('extension: el hueso llega lejos, con láminas alveolares y gérmenes, sin cartílagos secundarios', () => {
    const e = estadoMandibulaFetal(HITOS_MANDIBULA_FETAL.extension);
    expect(e.hueso.alcance).toBeGreaterThan(0.35);
    expect(e.hueso.alveolar).toBe(1);
    expect(e.germenes).toBe(1);
    expect(e.hueso.rama).toBeGreaterThan(0.1);
    expect(e.cartilagos.condilar).toBe(0);
    expect(e.cartilagos.sinfisario).toBe(0);
    expect(e.meckel.regresion).toBe(0);
  });

  it('cartilagos_secundarios: los tres cartílagos, el cuerpo completo y Meckel todavía entero', () => {
    const e = estadoMandibulaFetal(HITOS_MANDIBULA_FETAL.cartilagos_secundarios);
    expect(e.cartilagos.condilar).toBe(1);
    expect(e.cartilagos.coronoideo).toBe(1);
    expect(e.cartilagos.sinfisario).toBeGreaterThan(0.6);
    expect(e.hueso.alcance).toBe(ALCANCE_COMPLETO);
    expect(e.meckel.regresion).toBe(0);
    expect(e.cartilagos.osificacionCondilo).toBe(0);
  });

  it('meckel_regresion: Meckel reabsorbido, martillo y yunque a la vista', () => {
    const e = estadoMandibulaFetal(HITOS_MANDIBULA_FETAL.meckel_regresion);
    expect(e.meckel.regresion).toBe(1);
    expect(e.meckel.osiculos).toBe(1);
    expect(e.mesenquima).toBeLessThan(0.1);
  });

  it('nacimiento: mandíbula completa, sin mesénquima, con cóndilo osificado y sin cartílago coronoideo', () => {
    const e = estadoMandibulaFetal(HITOS_MANDIBULA_FETAL.nacimiento);
    expect(e.mesenquima).toBe(0);
    expect(e.hueso.rama).toBe(1);
    expect(e.hueso.tamano).toBeGreaterThanOrEqual(1);
    expect(e.cartilagos.osificacionCondilo).toBe(1);
    expect(e.cartilagos.coronoideo).toBe(0);
    expect(e.cartilagos.sinfisario).toBe(1);
    expect(e.germenes).toBe(1);
  });
});
