/**
 * Pruebas del estado puro de la escena de la fractura: `estadoFractura(t)` es una función pura del tiempo (misma
 * `t`, mismo estado), continua, acotada, con los valores esperados en el hito de cada fase y reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  CALLO,
  ESCALA_CALLO_FINAL,
  ESCALA_CALLO_OCULTO,
  FASES_FRACTURA,
  HITOS_FRACTURA,
  LIMITES_FASES_FRACTURA,
  R_CORTICAL,
  estadoFractura,
  faseFracturaEnTiempo,
} from './estado';
import type { EstadoFractura } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoFractura) => number): number[] {
  return muestras.map((t) => f(estadoFractura(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

const MAGNITUDES: [string, (e: EstadoFractura) => number][] = [
  ['sangrado', (e) => e.sangrado],
  ['hematoma', (e) => e.hematoma],
  ['granulacion', (e) => e.granulacion],
  ['inflamacion', (e) => e.inflamacion],
  ['celulasMadre', (e) => e.celulasMadre],
  ['periostio', (e) => e.periostio],
  ['vasosNuevos', (e) => e.vasosNuevos],
  ['callo', (e) => e.callo],
  ['huesoPeriferico', (e) => e.huesoPeriferico],
  ['calcificacion', (e) => e.calcificacion],
  ['huesoCentral', (e) => e.huesoCentral],
  ['laminar', (e) => e.laminar],
  ['necrosis', (e) => e.necrosis],
  ['osteoblastos', (e) => e.osteoblastos],
  ['osteoclastos', (e) => e.osteoclastos],
  ['medula', (e) => e.medula],
];

describe('estadoFractura: fases e hitos', () => {
  it('cada hito está en su fase y los hitos van en orden estricto de 0 a 1', () => {
    expect(HITOS_FRACTURA.fractura).toBe(0);
    expect(HITOS_FRACTURA.consolidado).toBe(1);
    FASES_FRACTURA.forEach((fase, i) => {
      expect(faseFracturaEnTiempo(HITOS_FRACTURA[fase])).toBe(fase);
      if (i > 0)
        expect(HITOS_FRACTURA[fase]).toBeGreaterThan(HITOS_FRACTURA[FASES_FRACTURA[i - 1]!]);
    });
    expect(LIMITES_FASES_FRACTURA).toHaveLength(FASES_FRACTURA.length - 1);
  });

  it('conserva los hitos que usa el contenido del módulo 5', () => {
    expect(HITOS_FRACTURA).toEqual({
      fractura: 0,
      hematoma: 0.15,
      inflamacion: 0.3,
      callo_blando: 0.45,
      callo_duro: 0.6,
      remodelado: 0.8,
      consolidado: 1,
    });
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_FRACTURA.indexOf(estadoFractura(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });
});

describe('estadoFractura: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoFractura(0.63);
    estadoFractura(0.1);
    estadoFractura(0.99);
    expect(estadoFractura(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoFractura(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoFractura(t);
    expect(estadoFractura(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1]', () => {
    expect(estadoFractura(-3)).toEqual(estadoFractura(0));
    expect(estadoFractura(7)).toEqual(estadoFractura(1));
  });
});

describe('estadoFractura: continuidad y rangos', () => {
  it.each(MAGNITUDES)('%s no da saltos bruscos entre dos instantes cercanos', (_, f) => {
    expect(saltoMaximo(serie(f))).toBeLessThan(0.03);
  });

  it.each(MAGNITUDES)('%s es un número finito entre 0 y 1 en todo el recorrido', (_, f) => {
    for (const v of serie(f)) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('el callo nunca baja de la escala en la que queda escondido dentro de la cortical, y al final apenas sobresale', () => {
    for (const t of muestras) expect(estadoFractura(t).callo).toBeGreaterThanOrEqual(0.5);
    expect(ESCALA_CALLO_FINAL * CALLO.radioMax).toBeGreaterThan(R_CORTICAL);
    expect(ESCALA_CALLO_FINAL * CALLO.radioMax).toBeLessThan(R_CORTICAL * 1.08);
    expect(ESCALA_CALLO_OCULTO * CALLO.radioMax).toBeGreaterThanOrEqual(R_CORTICAL);
  });
});

describe('estadoFractura: qué se ve en cada fase', () => {
  it('fractura: sangrado, sin hematoma, sin callo a la vista, periostio fino', () => {
    const e = estadoFractura(HITOS_FRACTURA.fractura);
    expect(e.sangrado).toBe(1);
    expect(e.hematoma).toBe(0);
    expect(e.callo).toBeLessThan(ESCALA_CALLO_OCULTO);
    expect(e.periostio).toBe(0);
    expect(e.inflamacion).toBe(0);
  });

  it('hematoma: el coágulo llena la brecha y los vasos rotos ya no se ven', () => {
    const e = estadoFractura(HITOS_FRACTURA.hematoma);
    expect(e.hematoma).toBe(1);
    expect(e.sangrado).toBe(0);
    expect(e.granulacion).toBe(0);
    expect(e.necrosis).toBe(1);
    expect(e.callo).toBeLessThan(ESCALA_CALLO_OCULTO);
  });

  it('inflamación: células inflamatorias, células madre, periostio engrosado y vasos nuevos creciendo', () => {
    const e = estadoFractura(HITOS_FRACTURA.inflamacion);
    expect(e.inflamacion).toBe(1);
    expect(e.celulasMadre).toBe(1);
    expect(e.periostio).toBe(1);
    expect(e.granulacion).toBe(1);
    expect(e.hematoma).toBeGreaterThan(0.9);
    expect(e.vasosNuevos).toBeGreaterThan(0.5);
    expect(e.callo).toBeLessThan(ESCALA_CALLO_OCULTO);
  });

  it('callo blando: manguito completo de cartílago y tejido fibroso, sin hematoma ni inflamación', () => {
    const e = estadoFractura(HITOS_FRACTURA.callo_blando);
    expect(e.callo).toBe(1);
    expect(e.hematoma).toBe(0);
    expect(e.inflamacion).toBe(0);
    expect(e.calcificacion).toBe(0);
    expect(e.huesoCentral).toBe(0);
    expect(e.huesoPeriferico).toBe(0);
    expect(e.vasosNuevos).toBe(1);
  });

  it('callo duro: el callo es hueso (centro calcificado y sustituido, periferia directa) con osteoblastos', () => {
    const e = estadoFractura(HITOS_FRACTURA.callo_duro);
    expect(e.callo).toBe(1);
    expect(e.calcificacion).toBe(1);
    // A medio camino: aún se ve el cartílago calcificado (gris) mientras lo sustituye el hueso.
    expect(e.huesoCentral).toBeGreaterThan(0.2);
    expect(e.huesoCentral).toBeLessThan(0.7);
    expect(e.huesoPeriferico).toBe(1);
    expect(e.osteoblastos).toBe(1);
    expect(e.osteoclastos).toBe(0);
    expect(e.laminar).toBe(0);
  });

  it('remodelado: osteoclastos sobre un callo que encoge, médula recanalizándose', () => {
    const e = estadoFractura(HITOS_FRACTURA.remodelado);
    expect(e.osteoclastos).toBe(1);
    expect(e.osteoblastos).toBe(1);
    expect(e.callo).toBeLessThan(0.8);
    expect(e.callo).toBeGreaterThan(ESCALA_CALLO_FINAL);
    expect(e.medula).toBeGreaterThan(0.2);
    expect(e.necrosis).toBe(0);
    expect(e.huesoCentral).toBe(1);
  });

  it('consolidado: forma casi original, hueso laminar, médula continua, sin células', () => {
    const e = estadoFractura(HITOS_FRACTURA.consolidado);
    expect(e.callo).toBe(ESCALA_CALLO_FINAL);
    expect(e.laminar).toBe(1);
    expect(e.medula).toBe(1);
    expect(e.osteoclastos).toBe(0);
    expect(e.osteoblastos).toBe(0);
    expect(e.vasosNuevos).toBe(0);
  });
});
