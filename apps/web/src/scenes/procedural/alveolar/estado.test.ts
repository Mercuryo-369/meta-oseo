/**
 * Pruebas del estado puro de la escena "el hueso alveolar por dentro": `estadoAlveolar(t)` es una función pura del
 * tiempo (misma `t`, mismo estado), continua, con los valores esperados en el hito de cada fase y reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  FASES_ALVEOLAR,
  HITOS_ALVEOLAR,
  LIMITES_FASES_ALVEOLAR,
  estadoAlveolar,
  faseAlveolarEnTiempo,
} from './estado';
import type { EstadoAlveolar } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoAlveolar) => number): number[] {
  return muestras.map((t) => f(estadoAlveolar(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoAlveolar: fases e hitos', () => {
  it('los hitos son los que usa el contenido del módulo 1 y van en orden estricto de 0 a 1', () => {
    expect(HITOS_ALVEOLAR).toEqual({
      cuerpo: 0,
      corte: 0.18,
      tablas: 0.34,
      trabecular: 0.5,
      alveolar_propio: 0.66,
      ligamento: 0.82,
      conducto: 1,
    });
    FASES_ALVEOLAR.forEach((fase, i) => {
      expect(faseAlveolarEnTiempo(HITOS_ALVEOLAR[fase])).toBe(fase);
      if (i > 0)
        expect(HITOS_ALVEOLAR[fase]).toBeGreaterThan(HITOS_ALVEOLAR[FASES_ALVEOLAR[i - 1]!]);
    });
    expect(LIMITES_FASES_ALVEOLAR).toHaveLength(FASES_ALVEOLAR.length - 1);
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_ALVEOLAR.indexOf(estadoAlveolar(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });
});

describe('estadoAlveolar: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoAlveolar(0.63);
    estadoAlveolar(0.1);
    estadoAlveolar(0.99);
    expect(estadoAlveolar(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoAlveolar(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoAlveolar(t);
    expect(estadoAlveolar(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1]', () => {
    expect(estadoAlveolar(-3)).toEqual(estadoAlveolar(0));
    expect(estadoAlveolar(7)).toEqual(estadoAlveolar(1));
  });
});

describe('estadoAlveolar: continuidad y rangos', () => {
  const magnitudes: [string, (e: EstadoAlveolar) => number][] = [
    ['mitad.desplazamiento', (e) => e.mitad.desplazamiento],
    ['mitad.opacidad', (e) => e.mitad.opacidad],
    ['resalte.tablas', (e) => e.resalte.tablas],
    ['resalte.trabecular', (e) => e.resalte.trabecular],
    ['resalte.alveolar', (e) => e.resalte.alveolar],
    ['resalte.ligamento', (e) => e.resalte.ligamento],
    ['resalte.conducto', (e) => e.resalte.conducto],
    ['perforaciones', (e) => e.perforaciones],
    ['fibras', (e) => e.fibras],
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

  it('nunca se destacan dos estructuras a la vez con fuerza', () => {
    for (const t of muestras) {
      const r = estadoAlveolar(t).resalte;
      const fuertes = Object.values(r).filter((v) => v > 0.5).length;
      expect(fuertes, `t = ${t}`).toBeLessThanOrEqual(1);
    }
  });
});

describe('estadoAlveolar: qué se ve en cada fase', () => {
  const sinResalte = { tablas: 0, trabecular: 0, alveolar: 0, ligamento: 0, conducto: 0 };

  it('cuerpo: el bloque entero y opaco, nada destacado', () => {
    const e = estadoAlveolar(HITOS_ALVEOLAR.cuerpo);
    expect(e.mitad).toEqual({ desplazamiento: 0, opacidad: 1 });
    expect(e.resalte).toEqual(sinResalte);
    expect(e.perforaciones).toBe(0);
    expect(e.fibras).toBe(0);
  });

  it('corte: la mitad anterior apartada del todo y desvanecida; la sección a la vista sin resaltes', () => {
    const e = estadoAlveolar(HITOS_ALVEOLAR.corte);
    expect(e.mitad).toEqual({ desplazamiento: 1, opacidad: 0 });
    expect(e.resalte).toEqual(sinResalte);
  });

  it('tablas: solo las tablas corticales destacadas', () => {
    const e = estadoAlveolar(HITOS_ALVEOLAR.tablas);
    expect(e.resalte.tablas).toBe(1);
    expect(e.resalte.trabecular).toBe(0);
  });

  it('trabecular: solo el hueso trabecular destacado', () => {
    const e = estadoAlveolar(HITOS_ALVEOLAR.trabecular);
    expect(e.resalte.trabecular).toBe(1);
    expect(e.resalte.tablas).toBe(0);
    expect(e.resalte.alveolar).toBe(0);
  });

  it('alveolar propio: la lámina destacada y sus perforaciones a la vista', () => {
    const e = estadoAlveolar(HITOS_ALVEOLAR.alveolar_propio);
    expect(e.resalte.alveolar).toBe(1);
    expect(e.perforaciones).toBe(1);
    expect(e.fibras).toBe(0);
  });

  it('ligamento: el ligamento destacado, con fibras, y las perforaciones siguen', () => {
    const e = estadoAlveolar(HITOS_ALVEOLAR.ligamento);
    expect(e.resalte.ligamento).toBe(1);
    expect(e.fibras).toBe(1);
    expect(e.perforaciones).toBe(1);
    expect(e.resalte.alveolar).toBe(0);
  });

  it('conducto: el conducto destacado y todo lo demás en reposo', () => {
    const e = estadoAlveolar(HITOS_ALVEOLAR.conducto);
    expect(e.resalte.conducto).toBe(1);
    expect(e.resalte.ligamento).toBe(0);
    expect(e.mitad.opacidad).toBe(0);
  });
});
