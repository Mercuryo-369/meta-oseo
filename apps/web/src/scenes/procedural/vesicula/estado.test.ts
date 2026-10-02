/**
 * Pruebas del estado puro de la escena de la vesícula de matriz: `estadoVesicula(t)` es una función pura del
 * tiempo (misma `t`, mismo estado), continua, con los valores esperados en el hito de cada fase y reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  FASES_VESICULA,
  FIBRILLA_ANFITRIONA,
  HITOS_VESICULA,
  LIMITES_FASES_VESICULA,
  MEMBRANA,
  R_FIBRILLA,
  R_VESICULA,
  Y_VESICULA_FINAL,
  estadoVesicula,
  faseVesiculaEnTiempo,
} from './estado';
import type { EstadoVesicula } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoVesicula) => number): number[] {
  return muestras.map((t) => f(estadoVesicula(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoVesicula: fases e hitos', () => {
  it('conserva los hitos que usa el contenido del módulo 4', () => {
    expect(HITOS_VESICULA).toEqual({
      osteoblasto: 0,
      gemacion: 0.17,
      acumulacion: 0.34,
      nucleacion: 0.5,
      ruptura: 0.66,
      propagacion: 0.83,
      regulacion: 1,
    });
  });

  it('cada hito está en su fase y los hitos van en orden estricto de 0 a 1', () => {
    FASES_VESICULA.forEach((fase, i) => {
      expect(faseVesiculaEnTiempo(HITOS_VESICULA[fase])).toBe(fase);
      if (i > 0)
        expect(HITOS_VESICULA[fase]).toBeGreaterThan(HITOS_VESICULA[FASES_VESICULA[i - 1]!]);
    });
    expect(LIMITES_FASES_VESICULA).toHaveLength(FASES_VESICULA.length - 1);
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_VESICULA.indexOf(estadoVesicula(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });

  it('la vesícula termina apoyada sobre la fibrilla anfitriona, por debajo de la membrana', () => {
    expect(Y_VESICULA_FINAL).toBeCloseTo(FIBRILLA_ANFITRIONA.y + R_FIBRILLA + R_VESICULA, 9);
    expect(Y_VESICULA_FINAL + R_VESICULA).toBeLessThan(MEMBRANA.y - MEMBRANA.amplitud);
  });
});

describe('estadoVesicula: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoVesicula(0.63);
    estadoVesicula(0.1);
    estadoVesicula(0.99);
    expect(estadoVesicula(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoVesicula(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoVesicula(t);
    expect(estadoVesicula(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1]', () => {
    expect(estadoVesicula(-3)).toEqual(estadoVesicula(0));
    expect(estadoVesicula(7)).toEqual(estadoVesicula(1));
  });
});

describe('estadoVesicula: continuidad y rangos', () => {
  const magnitudes: [string, (e: EstadoVesicula) => number][] = [
    ['vesicula.y', (e) => e.vesicula.y],
    ['vesicula.escala', (e) => e.vesicula.escala],
    ['vesicula.opacidad', (e) => e.vesicula.opacidad],
    ['vesicula.cuello', (e) => e.vesicula.cuello],
    ['vesicula.corte', (e) => e.vesicula.corte],
    ['vesicula.rota', (e) => e.vesicula.rota],
    ['iones.entrada', (e) => e.iones.entrada],
    ['iones.cumulo', (e) => e.iones.cumulo],
    ['iones.opacidad', (e) => e.iones.opacidad],
    ['nucleo', (e) => e.nucleo],
    ['cristal', (e) => e.cristal],
    ['ruptura', (e) => e.ruptura],
    ['propagacion', (e) => e.propagacion],
    ['vecinas', (e) => e.vecinas],
    ['ppi', (e) => e.ppi],
    ['hidrolisis', (e) => e.hidrolisis],
  ];

  it.each(magnitudes)('%s no da saltos bruscos entre dos instantes cercanos', (_, f) => {
    expect(saltoMaximo(serie(f))).toBeLessThan(0.08);
  });

  it.each(magnitudes)('%s es un número finito en todo el recorrido', (_, f) => {
    for (const v of serie(f)) expect(Number.isFinite(v)).toBe(true);
  });

  it('las opacidades y los énfasis están entre 0 y 1', () => {
    for (const t of muestras) {
      const e = estadoVesicula(t);
      for (const v of [
        e.vesicula.escala,
        e.vesicula.opacidad,
        e.vesicula.cuello,
        e.vesicula.corte,
        e.vesicula.rota,
        e.iones.entrada,
        e.iones.cumulo,
        e.iones.opacidad,
        e.nucleo,
        e.cristal,
        e.ruptura,
        e.propagacion,
        e.vecinas,
        e.ppi,
        e.hidrolisis,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('la vesícula solo baja: nunca vuelve a subir, y acaba en su altura final', () => {
    let anterior = Infinity;
    for (const t of muestras) {
      const y = estadoVesicula(t).vesicula.y;
      expect(y).toBeLessThanOrEqual(anterior + 1e-9);
      anterior = y;
    }
    expect(estadoVesicula(1).vesicula.y).toBe(Y_VESICULA_FINAL);
  });

  it('el cuello solo existe mientras la vesícula está cerca de la membrana', () => {
    for (const t of muestras) {
      const e = estadoVesicula(t);
      if (e.vesicula.cuello > 0.01) {
        expect(e.vesicula.y).toBeGreaterThan(MEMBRANA.y - 2 * R_VESICULA - 0.4);
      }
    }
  });
});

describe('estadoVesicula: qué se ve en cada fase', () => {
  it('osteoblasto: solo la membrana y el osteoide; la vesícula aún no existe', () => {
    const e = estadoVesicula(HITOS_VESICULA.osteoblasto);
    expect(e.vesicula.opacidad).toBe(0);
    expect(e.vesicula.cuello).toBe(0);
    expect(e.iones.entrada).toBe(0);
    expect(e.propagacion).toBe(0);
  });

  it('gemacion: la vesícula ya se desprendió y va cayendo hacia la fibrilla, sin iones', () => {
    const e = estadoVesicula(HITOS_VESICULA.gemacion);
    expect(e.vesicula.opacidad).toBe(1);
    expect(e.vesicula.escala).toBe(1);
    expect(e.vesicula.cuello).toBe(0);
    expect(e.vesicula.y).toBeGreaterThan(Y_VESICULA_FINAL);
    expect(e.vesicula.y + R_VESICULA).toBeLessThan(MEMBRANA.y + MEMBRANA.amplitud);
    // Antes del hito sí colgaba de su cuello.
    expect(estadoVesicula(0.11).vesicula.cuello).toBe(1);
    expect(e.iones.entrada).toBe(0);
    expect(e.vesicula.corte).toBe(0);
  });

  it('acumulacion: apoyada en la fibrilla, con los iones entrando (ni todos fuera ni todos dentro)', () => {
    const e = estadoVesicula(HITOS_VESICULA.acumulacion);
    expect(e.vesicula.y).toBe(Y_VESICULA_FINAL);
    expect(e.vesicula.cuello).toBe(0);
    expect(e.iones.entrada).toBeGreaterThan(0.3);
    expect(e.iones.entrada).toBeLessThan(1);
    expect(e.iones.cumulo).toBe(0);
    expect(e.nucleo).toBe(0);
    expect(e.cristal).toBe(0);
  });

  it('nucleacion: cortada, con el cúmulo apretado, el núcleo amorfo y el primer cristal asomando', () => {
    const e = estadoVesicula(HITOS_VESICULA.nucleacion);
    expect(e.vesicula.corte).toBe(1);
    expect(e.iones.entrada).toBe(1);
    expect(e.iones.cumulo).toBe(1);
    expect(e.nucleo).toBeGreaterThan(0.9);
    expect(e.cristal).toBeGreaterThan(0.5);
    expect(e.cristal).toBeLessThanOrEqual(1);
    expect(e.ruptura).toBe(0);
    expect(e.vesicula.rota).toBe(0);
  });

  it('ruptura: el racimo casi crecido del todo y la membrana rota; sin corte ni iones sueltos', () => {
    const e = estadoVesicula(HITOS_VESICULA.ruptura);
    expect(e.cristal).toBe(1);
    expect(e.ruptura).toBeGreaterThan(0.7);
    expect(e.vesicula.rota).toBeGreaterThan(0.6);
    expect(e.vesicula.corte).toBe(0);
    expect(e.iones.opacidad).toBe(0);
    expect(e.nucleo).toBe(0);
    expect(e.propagacion).toBe(0);
  });

  it('propagacion: el mineral avanza por las fibrillas y las vecinas ya están; sin pirofosfato', () => {
    const e = estadoVesicula(HITOS_VESICULA.propagacion);
    expect(e.ruptura).toBe(1);
    expect(e.propagacion).toBeGreaterThan(0.7);
    expect(e.vecinas).toBe(1);
    expect(e.ppi).toBe(0);
    expect(e.hidrolisis).toBe(0);
  });

  it('regulacion: pirofosfato sobre los cristales y la TNAP cortándolo', () => {
    const e = estadoVesicula(HITOS_VESICULA.regulacion);
    expect(e.propagacion).toBe(1);
    expect(e.ppi).toBe(1);
    expect(e.hidrolisis).toBe(1);
    expect(e.vesicula.rota).toBe(1);
  });
});
