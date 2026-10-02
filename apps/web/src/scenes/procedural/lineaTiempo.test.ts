/** Pruebas de la lógica pura de la línea de tiempo (qué paso manda, saltos y qué se visita). */
import { describe, expect, it } from 'vitest';
import {
  TOLERANCIA_PARADA,
  acotarTiempo,
  ordenarPasos,
  pasoDeTiempo,
  pasosCruzados,
  pasosEnParada,
  porcentajeDeTiempo,
  tiempoPasoAnterior,
  tiempoPasoSiguiente,
} from './lineaTiempo';

const PASOS = [
  { id: 'a', t: 0 },
  { id: 'b', t: 0.2 },
  { id: 'c', t: 0.5 },
  { id: 'd', t: 1 },
];

describe('pasoDeTiempo', () => {
  it('devuelve el paso cuyo hito está más cerca (cada paso abarca hasta el punto medio con el vecino)', () => {
    expect(pasoDeTiempo(PASOS, 0)).toBe(0);
    expect(pasoDeTiempo(PASOS, 0.09)).toBe(0);
    expect(pasoDeTiempo(PASOS, 0.11)).toBe(1);
    expect(pasoDeTiempo(PASOS, 0.34)).toBe(1);
    expect(pasoDeTiempo(PASOS, 0.36)).toBe(2);
    expect(pasoDeTiempo(PASOS, 0.74)).toBe(2);
    expect(pasoDeTiempo(PASOS, 0.76)).toBe(3);
    expect(pasoDeTiempo(PASOS, 1)).toBe(3);
  });

  it('en un empate exacto gana el siguiente y sin pasos devuelve -1', () => {
    expect(pasoDeTiempo(PASOS, 0.35)).toBe(2);
    expect(pasoDeTiempo([], 0.5)).toBe(-1);
  });

  it('el índice solo crece con t', () => {
    let previo = 0;
    for (let t = 0; t <= 1; t += 0.001) {
      const i = pasoDeTiempo(PASOS, t);
      expect(i).toBeGreaterThanOrEqual(previo);
      previo = i;
    }
  });
});

describe('paso anterior y siguiente', () => {
  it('saltan al hito estrictamente anterior o posterior', () => {
    expect(tiempoPasoSiguiente(PASOS, 0)).toBe(0.2);
    expect(tiempoPasoSiguiente(PASOS, 0.2)).toBe(0.5);
    expect(tiempoPasoSiguiente(PASOS, 0.3)).toBe(0.5);
    expect(tiempoPasoSiguiente(PASOS, 1)).toBeNull();
    expect(tiempoPasoAnterior(PASOS, 1)).toBe(0.5);
    expect(tiempoPasoAnterior(PASOS, 0.5)).toBe(0.2);
    expect(tiempoPasoAnterior(PASOS, 0.3)).toBe(0.2);
    expect(tiempoPasoAnterior(PASOS, 0)).toBeNull();
  });

  it('desde el interior de una fase, "anterior" vuelve al inicio de ella', () => {
    expect(tiempoPasoAnterior(PASOS, 0.45)).toBe(0.2);
    expect(tiempoPasoAnterior(PASOS, 0.51)).toBe(0.5);
  });
});

describe('qué pasos se visitan', () => {
  it('pasar por un hito, hacia delante o hacia atrás, lo visita (extremos incluidos)', () => {
    expect(pasosCruzados(PASOS, 0.1, 0.3)).toEqual(['b']);
    expect(pasosCruzados(PASOS, 0.3, 0.1)).toEqual(['b']);
    expect(pasosCruzados(PASOS, 0.1, 0.9)).toEqual(['b', 'c']);
    expect(pasosCruzados(PASOS, 0, 0.05)).toEqual(['a']);
    expect(pasosCruzados(PASOS, 0.9, 1)).toEqual(['d']);
    expect(pasosCruzados(PASOS, 0.21, 0.4)).toEqual([]);
  });

  it('detenerse a menos de la tolerancia de un hito lo visita; más lejos, no', () => {
    expect(pasosEnParada(PASOS, 0.2)).toEqual(['b']);
    expect(pasosEnParada(PASOS, 0.2 + TOLERANCIA_PARADA)).toEqual(['b']);
    expect(pasosEnParada(PASOS, 0.2 + TOLERANCIA_PARADA * 2)).toEqual([]);
    expect(pasosEnParada(PASOS, 0.35)).toEqual([]);
  });
});

describe('utilidades', () => {
  it('ordena sin tocar el original', () => {
    const desordenados = [PASOS[2]!, PASOS[0]!, PASOS[3]!, PASOS[1]!];
    expect(ordenarPasos(desordenados).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(desordenados[0]!.id).toBe('c');
  });

  it('acota t y redondea el porcentaje', () => {
    expect(acotarTiempo(-1)).toBe(0);
    expect(acotarTiempo(2)).toBe(1);
    expect(acotarTiempo(Number.NaN)).toBe(0);
    expect(porcentajeDeTiempo(0.326)).toBe(33);
    expect(porcentajeDeTiempo(5)).toBe(100);
  });
});
