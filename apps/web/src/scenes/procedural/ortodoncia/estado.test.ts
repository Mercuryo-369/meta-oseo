/**
 * Pruebas del estado puro de la escena del movimiento ortodóntico: `estadoOrtodoncia(t)` es una función pura del
 * tiempo (misma `t`, mismo estado), continua, con los valores esperados en el hito de cada fase y reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  FASES_ORTODONCIA,
  HITOS_ORTODONCIA,
  LIMITES_FASES_ORTODONCIA,
  estadoOrtodoncia,
  faseOrtodonciaEnTiempo,
} from './estado';
import type { EstadoOrtodoncia } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoOrtodoncia) => number): number[] {
  return muestras.map((t) => f(estadoOrtodoncia(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoOrtodoncia: fases e hitos', () => {
  it('los hitos son los que usa el contenido del módulo 5 y van en orden estricto de 0 a 1', () => {
    expect(HITOS_ORTODONCIA).toEqual({
      reposo: 0,
      fuerza: 0.16,
      ligamento: 0.32,
      resorcion: 0.5,
      aposicion: 0.66,
      desplazamiento: 0.83,
      retencion: 1,
    });
    FASES_ORTODONCIA.forEach((fase, i) => {
      expect(faseOrtodonciaEnTiempo(HITOS_ORTODONCIA[fase])).toBe(fase);
      if (i > 0)
        expect(HITOS_ORTODONCIA[fase]).toBeGreaterThan(HITOS_ORTODONCIA[FASES_ORTODONCIA[i - 1]!]);
    });
    expect(LIMITES_FASES_ORTODONCIA).toHaveLength(FASES_ORTODONCIA.length - 1);
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_ORTODONCIA.indexOf(estadoOrtodoncia(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });
});

describe('estadoOrtodoncia: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoOrtodoncia(0.63);
    estadoOrtodoncia(0.1);
    estadoOrtodoncia(0.99);
    expect(estadoOrtodoncia(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoOrtodoncia(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoOrtodoncia(t);
    expect(estadoOrtodoncia(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1]', () => {
    expect(estadoOrtodoncia(-3)).toEqual(estadoOrtodoncia(0));
    expect(estadoOrtodoncia(7)).toEqual(estadoOrtodoncia(1));
  });
});

describe('estadoOrtodoncia: continuidad y rangos', () => {
  const magnitudes: [string, (e: EstadoOrtodoncia) => number][] = [
    ['fuerza', (e) => e.fuerza],
    ['diente.desplazamiento', (e) => e.diente.desplazamiento],
    ['diente.inclinacion', (e) => e.diente.inclinacion],
    ['ligamento.compresion', (e) => e.ligamento.compresion],
    ['ligamento.tension', (e) => e.ligamento.tension],
    ['ligamento.hialinizacion', (e) => e.ligamento.hialinizacion],
    ['compresion.osteoclastos', (e) => e.compresion.osteoclastos],
    ['compresion.resorcion', (e) => e.compresion.resorcion],
    ['tension.osteoblastos', (e) => e.tension.osteoblastos],
    ['tension.osteoide', (e) => e.tension.osteoide],
    ['tension.revestimiento', (e) => e.tension.revestimiento],
    ['tension.maduracion', (e) => e.tension.maduracion],
    ['referencia', (e) => e.referencia],
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

  it('el diente nunca retrocede mientras dura la fuerza', () => {
    const avance = serie((e) => e.diente.desplazamiento);
    for (let i = 1; i < avance.length; i++)
      expect(avance[i]).toBeGreaterThanOrEqual(avance[i - 1]!);
  });

  it('los osteoclastos y los osteoblastos no llegan a la vez con fuerza', () => {
    for (const t of muestras) {
      const e = estadoOrtodoncia(t);
      expect(Math.min(e.compresion.osteoclastos, e.tension.osteoblastos), `t = ${t}`).toBeLessThan(
        0.5,
      );
    }
  });
});

describe('estadoOrtodoncia: qué se ve en cada fase', () => {
  it('reposo: sin fuerza, diente en su sitio, ligamento simétrico y sin células', () => {
    const e = estadoOrtodoncia(HITOS_ORTODONCIA.reposo);
    expect(e.fuerza).toBe(0);
    expect(e.diente).toEqual({ desplazamiento: 0, inclinacion: 0 });
    expect(e.ligamento).toEqual({ compresion: 0, tension: 0, hialinizacion: 0 });
    expect(e.compresion).toEqual({ osteoclastos: 0, resorcion: 0 });
    expect(e.tension.osteoblastos).toBe(0);
    expect(e.tension.osteoide).toBe(0);
    expect(e.referencia).toBe(0);
  });

  it('fuerza: el bracket y la flecha a la vista; el ligamento aún sin deformar', () => {
    const e = estadoOrtodoncia(HITOS_ORTODONCIA.fuerza);
    expect(e.fuerza).toBe(1);
    expect(e.ligamento.compresion).toBe(0);
    expect(e.diente.desplazamiento).toBe(0);
  });

  it('ligamento: comprimido a la derecha y estirado a la izquierda, con zona hialinizada; sin células aún', () => {
    const e = estadoOrtodoncia(HITOS_ORTODONCIA.ligamento);
    expect(e.ligamento.compresion).toBe(1);
    expect(e.ligamento.tension).toBe(1);
    expect(e.ligamento.hialinizacion).toBe(1);
    expect(e.diente.inclinacion).toBe(1);
    expect(e.compresion.osteoclastos).toBe(0);
    expect(e.diente.desplazamiento).toBe(0);
  });

  it('resorción: osteoclastos sobre la pared de compresión, pared festoneada, diente empezando a avanzar', () => {
    const e = estadoOrtodoncia(HITOS_ORTODONCIA.resorcion);
    expect(e.compresion.osteoclastos).toBe(1);
    expect(e.compresion.resorcion).toBe(1);
    expect(e.tension.osteoblastos).toBe(0);
    expect(e.diente.desplazamiento).toBeGreaterThan(0.05);
    expect(e.diente.desplazamiento).toBeLessThan(0.5);
  });

  it('aposición: osteoblastos y osteoide sobre la pared de tensión; los osteoclastos ya se fueron', () => {
    const e = estadoOrtodoncia(HITOS_ORTODONCIA.aposicion);
    expect(e.tension.osteoblastos).toBe(1);
    expect(e.tension.osteoide).toBe(1);
    expect(e.compresion.osteoclastos).toBe(0);
    expect(e.ligamento.hialinizacion).toBe(0);
    expect(e.diente.desplazamiento).toBeGreaterThan(0.5);
    expect(e.diente.desplazamiento).toBeLessThan(1);
  });

  it('desplazamiento: el diente en su posición final, con la marca de la inicial y la fuerza aún puesta', () => {
    const e = estadoOrtodoncia(HITOS_ORTODONCIA.desplazamiento);
    expect(e.diente.desplazamiento).toBe(1);
    expect(e.referencia).toBe(1);
    expect(e.fuerza).toBe(1);
    expect(e.compresion.resorcion).toBe(1);
  });

  it('retención: sin fuerza, ligamento recuperado, pared lisa, hueso maduro y células de revestimiento', () => {
    const e = estadoOrtodoncia(HITOS_ORTODONCIA.retencion);
    expect(e.fuerza).toBe(0);
    expect(e.ligamento.compresion).toBe(0);
    expect(e.ligamento.tension).toBe(0);
    expect(e.compresion.resorcion).toBe(0);
    expect(e.tension.osteoide).toBe(0);
    expect(e.tension.maduracion).toBe(1);
    expect(e.tension.revestimiento).toBe(1);
    expect(e.tension.osteoblastos).toBe(1);
    expect(e.diente.desplazamiento).toBe(1);
    expect(e.referencia).toBe(1);
  });
});
