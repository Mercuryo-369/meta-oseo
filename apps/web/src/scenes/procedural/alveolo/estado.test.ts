/**
 * Pruebas del estado puro de la escena del alvéolo tras la extracción: `estadoAlveolo(t)` es una función pura del
 * tiempo (misma `t`, mismo estado), continua, acotada, con lo que debe verse en el hito de cada fase y reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  FASES_ALVEOLO,
  HITOS_ALVEOLO,
  LIMITES_FASES_ALVEOLO,
  Y_CRESTA_FINAL,
  estadoAlveolo,
  faseAlveoloEnTiempo,
  yCresta,
} from './estado';
import type { EstadoAlveolo } from './estado';
import { Y_APICE, Y_CRESTA } from '../alveolar/estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoAlveolo) => number): number[] {
  return muestras.map((t) => f(estadoAlveolo(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoAlveolo: fases e hitos', () => {
  it('los hitos son los que usa el contenido del módulo 6 y van en orden estricto de 0 a 1', () => {
    expect(HITOS_ALVEOLO).toEqual({
      diente: 0,
      extraccion: 0.14,
      coagulo: 0.28,
      granulacion: 0.42,
      hueso_entretejido: 0.56,
      maduracion: 0.7,
      reabsorcion_reborde: 0.85,
      reborde_final: 1,
    });
    FASES_ALVEOLO.forEach((fase, i) => {
      expect(faseAlveoloEnTiempo(HITOS_ALVEOLO[fase])).toBe(fase);
      if (i > 0) expect(HITOS_ALVEOLO[fase]).toBeGreaterThan(HITOS_ALVEOLO[FASES_ALVEOLO[i - 1]!]);
    });
    expect(LIMITES_FASES_ALVEOLO).toHaveLength(FASES_ALVEOLO.length - 1);
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_ALVEOLO.indexOf(estadoAlveolo(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });
});

describe('estadoAlveolo: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoAlveolo(0.63);
    estadoAlveolo(0.1);
    estadoAlveolo(0.99);
    expect(estadoAlveolo(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoAlveolo(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoAlveolo(t);
    expect(estadoAlveolo(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1]', () => {
    expect(estadoAlveolo(-3)).toEqual(estadoAlveolo(0));
    expect(estadoAlveolo(7)).toEqual(estadoAlveolo(1));
  });
});

describe('estadoAlveolo: continuidad y rangos', () => {
  const magnitudes: [string, (e: EstadoAlveolo) => number][] = [
    ['diente.elevacion', (e) => e.diente.elevacion],
    ['diente.opacidad', (e) => e.diente.opacidad],
    ['ligamento', (e) => e.ligamento],
    ['sangrado', (e) => e.sangrado],
    ['coagulo.nivel', (e) => e.coagulo.nivel],
    ['coagulo.encogido', (e) => e.coagulo.encogido],
    ['granulacion.presencia', (e) => e.granulacion.presencia],
    ['granulacion.encogido', (e) => e.granulacion.encogido],
    ['vasos', (e) => e.vasos],
    ['cierreEncia', (e) => e.cierreEncia],
    ['huesoNuevo.presencia', (e) => e.huesoNuevo.presencia],
    ['huesoNuevo.maduracion', (e) => e.huesoNuevo.maduracion],
    ['huesoNuevo.fundido', (e) => e.huesoNuevo.fundido],
    ['laminaResorbida', (e) => e.laminaResorbida],
    ['osteoclastos.alveolo', (e) => e.osteoclastos.alveolo],
    ['osteoclastos.reborde', (e) => e.osteoclastos.reborde],
    ['trabeculasAlveolo', (e) => e.trabeculasAlveolo],
    ['tapaCortical', (e) => e.tapaCortical],
    ['reborde', (e) => e.reborde],
  ];

  it.each(magnitudes)('%s no da saltos bruscos entre dos instantes cercanos', (_, f) => {
    expect(saltoMaximo(serie(f))).toBeLessThan(0.08);
  });

  it.each(magnitudes)('%s es un número finito entre 0 y 1 en todo el recorrido', (_, f) => {
    for (const v of serie(f)) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('la pérdida del reborde y la maduración no retroceden nunca', () => {
    for (const f of [
      (e: EstadoAlveolo) => e.reborde,
      (e: EstadoAlveolo) => e.huesoNuevo.maduracion,
    ]) {
      const valores = serie(f);
      for (let i = 1; i < valores.length; i++) {
        expect(valores[i]).toBeGreaterThanOrEqual(valores[i - 1]! - 1e-12);
      }
    }
  });

  it('el diente ya no está cuando empieza a llenarse el coágulo, y el coágulo no se encoge antes de llenarse', () => {
    for (const t of muestras) {
      const e = estadoAlveolo(t);
      if (e.coagulo.nivel > 0) expect(e.diente.opacidad, `t = ${t}`).toBe(0);
      if (e.coagulo.encogido > 0) expect(e.coagulo.nivel, `t = ${t}`).toBe(1);
      if (e.granulacion.encogido > 0) expect(e.huesoNuevo.presencia, `t = ${t}`).toBe(1);
      if (e.huesoNuevo.fundido > 0) expect(e.trabeculasAlveolo, `t = ${t}`).toBe(1);
    }
  });

  it('la cresta baja de la altura original a la final', () => {
    expect(yCresta(0)).toBe(Y_CRESTA);
    expect(yCresta(1)).toBeCloseTo(Y_CRESTA_FINAL, 12);
    expect(Y_CRESTA_FINAL).toBeLessThan(Y_APICE + 0.1);
    expect(yCresta(0.5)).toBeLessThan(Y_CRESTA);
    expect(yCresta(0.5)).toBeGreaterThan(Y_CRESTA_FINAL);
  });
});

describe('estadoAlveolo: qué se ve en cada fase', () => {
  it('diente: en su alvéolo, con ligamento, sin coágulo y el reborde intacto', () => {
    const e = estadoAlveolo(HITOS_ALVEOLO.diente);
    expect(e.diente).toEqual({ elevacion: 0, opacidad: 1 });
    expect(e.ligamento).toBe(1);
    expect(e.sangrado).toBe(0);
    expect(e.coagulo).toEqual({ nivel: 0, encogido: 0 });
    expect(e.cierreEncia).toBe(0);
    expect(e.reborde).toBe(0);
  });

  it('extracción: el diente fuera y desvanecido; restos de ligamento y sangrado; aún sin coágulo', () => {
    const e = estadoAlveolo(HITOS_ALVEOLO.extraccion);
    expect(e.diente).toEqual({ elevacion: 1, opacidad: 0 });
    expect(e.sangrado).toBe(1);
    expect(e.ligamento).toBeGreaterThan(0.2);
    expect(e.ligamento).toBeLessThan(0.7);
    expect(e.coagulo.nivel).toBe(0);
  });

  it('coágulo: el alvéolo lleno de coágulo entero, sin sangrado ni ligamento ni granulación', () => {
    const e = estadoAlveolo(HITOS_ALVEOLO.coagulo);
    expect(e.coagulo).toEqual({ nivel: 1, encogido: 0 });
    expect(e.sangrado).toBe(0);
    expect(e.ligamento).toBe(0);
    expect(e.granulacion.presencia).toBe(0);
  });

  it('granulación: el tejido de granulación con vasos sustituye casi todo el coágulo; la encía empieza a cerrar', () => {
    const e = estadoAlveolo(HITOS_ALVEOLO.granulacion);
    expect(e.granulacion.presencia).toBe(1);
    expect(e.granulacion.encogido).toBe(0);
    expect(e.coagulo.encogido).toBeGreaterThan(0.7);
    expect(e.vasos).toBe(1);
    expect(e.cierreEncia).toBeGreaterThan(0.2);
    expect(e.cierreEncia).toBeLessThan(0.8);
    expect(e.huesoNuevo.presencia).toBe(0);
  });

  it('hueso entretejido: hueso nuevo inmaduro casi en todo el alvéolo, osteoclastos en las paredes y la lámina reabsorbida', () => {
    const e = estadoAlveolo(HITOS_ALVEOLO.hueso_entretejido);
    expect(e.huesoNuevo.presencia).toBe(1);
    expect(e.huesoNuevo.maduracion).toBe(0);
    expect(e.granulacion.encogido).toBeGreaterThan(0.85);
    expect(e.osteoclastos.alveolo).toBe(1);
    expect(e.laminaResorbida).toBeGreaterThan(0.6);
    expect(e.reborde).toBe(0);
  });

  it('maduración: hueso laminar, tapa cortical y encía cerrada; el reborde apenas ha cambiado', () => {
    const e = estadoAlveolo(HITOS_ALVEOLO.maduracion);
    expect(e.huesoNuevo.maduracion).toBe(1);
    // La placa de hueso nuevo ya se funde con el trabecular vecino: el alvéolo deja de distinguirse.
    expect(e.huesoNuevo.fundido).toBe(1);
    expect(e.trabeculasAlveolo).toBe(1);
    expect(e.tapaCortical).toBe(1);
    expect(e.cierreEncia).toBe(1);
    expect(e.laminaResorbida).toBe(1);
    expect(e.osteoclastos.alveolo).toBe(0);
    expect(e.trabeculasAlveolo).toBe(1);
    expect(e.reborde).toBeLessThan(0.1);
  });

  it('reabsorción del reborde: el hueso nuevo fundido con el trabecular, osteoclastos en la superficie y más de la mitad de la pérdida', () => {
    const e = estadoAlveolo(HITOS_ALVEOLO.reabsorcion_reborde);
    expect(e.huesoNuevo.fundido).toBe(1);
    expect(e.tapaCortical).toBe(0);
    expect(e.osteoclastos.reborde).toBe(1);
    expect(e.reborde).toBeGreaterThan(0.45);
    expect(e.reborde).toBeLessThan(0.75);
  });

  it('reborde final: la pérdida completa y todo en reposo', () => {
    const e = estadoAlveolo(HITOS_ALVEOLO.reborde_final);
    expect(e.reborde).toBe(1);
    expect(e.osteoclastos).toEqual({ alveolo: 0, reborde: 0 });
    expect(e.diente.opacidad).toBe(0);
    expect(e.cierreEncia).toBe(1);
  });
});
