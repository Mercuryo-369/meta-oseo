/**
 * Pruebas del estado puro de la escena "dos rutas para construir hueso": `estadoDosRutas(t)` es una función pura
 * del tiempo (misma `t`, mismo estado), continua, con los valores esperados en el hito de cada fase y reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  FASES_DOS_RUTAS,
  HITOS_DOS_RUTAS,
  LIMITES_FASES_DOS_RUTAS,
  estadoDosRutas,
  faseDosRutasEnTiempo,
} from './estado';
import type { EstadoDosRutas } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoDosRutas) => number): number[] {
  return muestras.map((t) => f(estadoDosRutas(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoDosRutas: fases e hitos', () => {
  it('conserva los hitos que usa el contenido del módulo 3', () => {
    expect(HITOS_DOS_RUTAS).toEqual({
      mesenquima: 0,
      condensacion: 0.15,
      diferenciacion: 0.3,
      crecimiento: 0.45,
      vascularizacion: 0.6,
      hueso_primario: 0.8,
      remodelado: 1,
    });
  });

  it('cada hito está en su fase y los hitos van en orden estricto de 0 a 1', () => {
    FASES_DOS_RUTAS.forEach((fase, i) => {
      expect(faseDosRutasEnTiempo(HITOS_DOS_RUTAS[fase])).toBe(fase);
      if (i > 0)
        expect(HITOS_DOS_RUTAS[fase]).toBeGreaterThan(HITOS_DOS_RUTAS[FASES_DOS_RUTAS[i - 1]!]);
    });
    expect(LIMITES_FASES_DOS_RUTAS).toHaveLength(FASES_DOS_RUTAS.length - 1);
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_DOS_RUTAS.indexOf(estadoDosRutas(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });
});

describe('estadoDosRutas: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoDosRutas(0.63);
    estadoDosRutas(0.1);
    estadoDosRutas(0.99);
    expect(estadoDosRutas(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoDosRutas(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoDosRutas(t);
    expect(estadoDosRutas(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1]', () => {
    expect(estadoDosRutas(-3)).toEqual(estadoDosRutas(0));
    expect(estadoDosRutas(7)).toEqual(estadoDosRutas(1));
  });
});

describe('estadoDosRutas: continuidad y rangos', () => {
  const magnitudes: [string, (e: EstadoDosRutas) => number][] = [
    ['mesenquima', (e) => e.mesenquima],
    ['condensacion', (e) => e.condensacion],
    ['diferenciacion', (e) => e.diferenciacion],
    ['im.osteoide', (e) => e.intramembranosa.osteoide],
    ['im.espiculas', (e) => e.intramembranosa.espiculas],
    ['im.grosor', (e) => e.intramembranosa.grosor],
    ['im.enBorde', (e) => e.intramembranosa.enBorde],
    ['im.atrapados', (e) => e.intramembranosa.atrapados],
    ['im.vasos', (e) => e.intramembranosa.vasos],
    ['im.medula', (e) => e.intramembranosa.medula],
    ['im.placas', (e) => e.intramembranosa.placas],
    ['im.revestimiento', (e) => e.intramembranosa.revestimiento],
    ['im.laminar', (e) => e.intramembranosa.laminar],
    ['ec.molde', (e) => e.endocondral.molde],
    ['ec.hipertrofia', (e) => e.endocondral.hipertrofia],
    ['ec.calcificado', (e) => e.endocondral.calcificado],
    ['ec.collar', (e) => e.endocondral.collar],
    ['ec.cortical', (e) => e.endocondral.cortical],
    ['ec.yema', (e) => e.endocondral.yema],
    ['ec.frente', (e) => e.endocondral.frente],
    ['ec.celulasFrente', (e) => e.endocondral.celulasFrente],
    ['ec.secundario', (e) => e.endocondral.secundario],
    ['ec.cavidad', (e) => e.endocondral.cavidad],
    ['ec.laminar', (e) => e.endocondral.laminar],
  ];

  it.each(magnitudes)('%s no da saltos bruscos entre dos instantes cercanos', (_, f) => {
    expect(saltoMaximo(serie(f))).toBeLessThan(0.08);
  });

  it.each(magnitudes)('%s es un número finito en todo el recorrido', (_, f) => {
    for (const v of serie(f)) expect(Number.isFinite(v)).toBe(true);
  });

  it('las fracciones están entre 0 y 1; el grosor no baja de 1; la zona calcificada nunca queda detrás del frente', () => {
    for (const t of muestras) {
      const e = estadoDosRutas(t);
      const im = e.intramembranosa;
      const ec = e.endocondral;
      for (const v of [
        e.mesenquima,
        e.condensacion,
        e.diferenciacion,
        im.osteoide,
        im.espiculas,
        im.enBorde,
        im.atrapados,
        im.vasos,
        im.medula,
        im.placas,
        im.revestimiento,
        im.laminar,
        ec.molde,
        ec.hipertrofia,
        ec.collar,
        ec.cortical,
        ec.yema,
        ec.celulasFrente,
        ec.secundario,
        ec.cavidad,
        ec.laminar,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(im.grosor).toBeGreaterThanOrEqual(1);
      expect(ec.frente).toBeGreaterThanOrEqual(0);
      expect(ec.calcificado).toBeGreaterThanOrEqual(ec.frente);
    }
  });

  it('lo que se construye no se deshace: espículas, collar, frente y placas solo crecen', () => {
    for (const f of [
      (e: EstadoDosRutas) => e.intramembranosa.espiculas,
      (e: EstadoDosRutas) => e.intramembranosa.placas,
      (e: EstadoDosRutas) => e.endocondral.collar,
      (e: EstadoDosRutas) => e.endocondral.frente,
      (e: EstadoDosRutas) => e.endocondral.secundario,
    ]) {
      const valores = serie(f);
      for (let i = 1; i < valores.length; i++) {
        expect(valores[i]!).toBeGreaterThanOrEqual(valores[i - 1]! - 1e-9);
      }
    }
  });
});

describe('estadoDosRutas: qué se ve en cada fase', () => {
  it('mesenquima: células dispersas y sin diferenciar, mesénquima a la vista, nada de hueso ni cartílago', () => {
    const e = estadoDosRutas(HITOS_DOS_RUTAS.mesenquima);
    expect(e.mesenquima).toBe(1);
    expect(e.condensacion).toBe(0);
    expect(e.diferenciacion).toBe(0);
    expect(e.intramembranosa.osteoide).toBe(0);
    expect(e.intramembranosa.espiculas).toBe(0);
    expect(e.endocondral.molde).toBe(0);
  });

  it('condensacion: las células ya agrupadas, todavía sin diferenciar ni molde', () => {
    const e = estadoDosRutas(HITOS_DOS_RUTAS.condensacion);
    expect(e.condensacion).toBe(1);
    expect(e.diferenciacion).toBe(0);
    expect(e.endocondral.molde).toBe(0);
    expect(e.intramembranosa.osteoide).toBe(0);
  });

  it('diferenciacion: osteoblastos con su osteoide a la izquierda; condrocitos en el molde a la derecha', () => {
    const e = estadoDosRutas(HITOS_DOS_RUTAS.diferenciacion);
    expect(e.diferenciacion).toBe(1);
    expect(e.intramembranosa.osteoide).toBe(1);
    expect(e.intramembranosa.espiculas).toBe(0);
    expect(e.endocondral.molde).toBe(1);
    expect(e.endocondral.hipertrofia).toBe(0);
    expect(e.endocondral.collar).toBe(0);
  });

  it('crecimiento: espículas con osteoblastos al borde; hipertrofia, calcificación y collar a la derecha', () => {
    const e = estadoDosRutas(HITOS_DOS_RUTAS.crecimiento);
    expect(e.intramembranosa.espiculas).toBeGreaterThan(0.6);
    expect(e.intramembranosa.enBorde).toBe(1);
    expect(e.intramembranosa.vasos).toBe(0);
    expect(e.endocondral.hipertrofia).toBe(1);
    expect(e.endocondral.calcificado).toBeGreaterThan(0.4);
    expect(e.endocondral.collar).toBe(1);
    expect(e.endocondral.yema).toBe(0);
    expect(e.endocondral.frente).toBe(0);
  });

  it('vascularizacion: vasos y médula a la izquierda; yema, frente abierto y osteoclastos a la derecha', () => {
    const e = estadoDosRutas(HITOS_DOS_RUTAS.vascularizacion);
    expect(e.intramembranosa.vasos).toBe(1);
    expect(e.intramembranosa.medula).toBe(1);
    expect(e.intramembranosa.espiculas).toBe(1);
    expect(e.intramembranosa.placas).toBe(0);
    expect(e.endocondral.yema).toBe(1);
    expect(e.endocondral.frente).toBeGreaterThan(0.3);
    expect(e.endocondral.celulasFrente).toBe(1);
    expect(e.endocondral.secundario).toBe(0);
  });

  it('hueso_primario: tablas compactas a la izquierda; frente avanzado y centros secundarios a la derecha', () => {
    const e = estadoDosRutas(HITOS_DOS_RUTAS.hueso_primario);
    expect(e.intramembranosa.placas).toBe(1);
    expect(e.intramembranosa.laminar).toBe(0);
    expect(e.endocondral.frente).toBeGreaterThan(1.1);
    expect(e.endocondral.secundario).toBeGreaterThan(0.5);
    expect(e.endocondral.cavidad).toBe(0);
    expect(e.mesenquima).toBeLessThan(0.2);
  });

  it('remodelado: hueso laminar en los dos lados, cavidad medular y placa de crecimiento fina', () => {
    const e = estadoDosRutas(HITOS_DOS_RUTAS.remodelado);
    expect(e.intramembranosa.laminar).toBe(1);
    expect(e.intramembranosa.revestimiento).toBe(1);
    expect(e.endocondral.laminar).toBe(1);
    expect(e.endocondral.cavidad).toBe(1);
    expect(e.endocondral.cortical).toBe(1);
    expect(e.endocondral.celulasFrente).toBe(0);
    expect(e.endocondral.secundario).toBe(1);
    expect(e.mesenquima).toBe(0);
  });
});
