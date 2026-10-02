/**
 * Pruebas del estado puro de la escena "hueso trabecular que envejece": `estadoTrabecular(t)` es una función pura
 * del tiempo (misma `t`, mismo estado), continua, acotada, con los valores esperados en el hito de cada fase y
 * reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  EDADES,
  FASES_TRABECULAR,
  HITOS_TRABECULAR,
  LIMITES_FASES_TRABECULAR,
  RED_JOVEN,
  estadoTrabecular,
  faseTrabecularEnTiempo,
} from './estado';
import type { EstadoTrabecular } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoTrabecular) => number): number[] {
  return muestras.map((t) => f(estadoTrabecular(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoTrabecular: fases e hitos', () => {
  it('conserva los hitos que usa el contenido del módulo 6', () => {
    expect(HITOS_TRABECULAR).toEqual({
      joven: 0,
      equilibrio: 0.17,
      adelgazamiento: 0.34,
      perforacion: 0.5,
      desconexion: 0.66,
      osteoporosis: 0.83,
      carga: 1,
    });
  });

  it('cada hito está en su fase y los hitos van en orden estricto de 0 a 1', () => {
    FASES_TRABECULAR.forEach((fase, i) => {
      expect(faseTrabecularEnTiempo(HITOS_TRABECULAR[fase])).toBe(fase);
      if (i > 0)
        expect(HITOS_TRABECULAR[fase]).toBeGreaterThan(HITOS_TRABECULAR[FASES_TRABECULAR[i - 1]!]);
    });
    expect(LIMITES_FASES_TRABECULAR).toHaveLength(FASES_TRABECULAR.length - 1);
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_TRABECULAR.indexOf(estadoTrabecular(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });

  it('la edad va de los 30 a los 80 años y se queda ahí durante la carga', () => {
    expect(estadoTrabecular(0).edad).toBe(EDADES.inicio);
    expect(estadoTrabecular(HITOS_TRABECULAR.osteoporosis).edad).toBeCloseTo(
      EDADES.osteoporosis,
      6,
    );
    expect(estadoTrabecular(1).edad).toBeCloseTo(EDADES.osteoporosis, 6);
    expect(saltoMaximo(serie((e) => e.edad))).toBeLessThan(0.1);
  });
});

describe('estadoTrabecular: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoTrabecular(0.63);
    estadoTrabecular(0.1);
    estadoTrabecular(0.99);
    expect(estadoTrabecular(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoTrabecular(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoTrabecular(t);
    expect(estadoTrabecular(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1]', () => {
    expect(estadoTrabecular(-3)).toEqual(estadoTrabecular(0));
    expect(estadoTrabecular(7)).toEqual(estadoTrabecular(1));
  });
});

describe('estadoTrabecular: continuidad y rangos', () => {
  const magnitudes: [string, (e: EstadoTrabecular) => number][] = [
    ['red.grosor', (e) => e.red.grosor],
    ['red.barras', (e) => e.red.barras],
    ['red.perforacion', (e) => e.red.perforacion],
    ['bmu.opacidad', (e) => e.bmu.opacidad],
    ['bmu.relleno', (e) => e.bmu.relleno],
    ['bmu.excavacion', (e) => e.bmu.excavacion],
    ['cortical.grosor', (e) => e.cortical.grosor],
    ['cortical.porosidad', (e) => e.cortical.porosidad],
    ['medula.adiposidad', (e) => e.medula.adiposidad],
    ['fantasma.opacidad', (e) => e.fantasma.opacidad],
    ['carga.flecha', (e) => e.carga.flecha],
    ['carga.compresion', (e) => e.carga.compresion],
    ['carga.rotura', (e) => e.carga.rotura],
  ];

  it.each(magnitudes)('%s no da saltos bruscos entre dos instantes cercanos', (_, f) => {
    expect(saltoMaximo(serie(f))).toBeLessThan(0.08);
  });

  it.each(magnitudes)('%s es un número finito en todo el recorrido', (_, f) => {
    for (const v of serie(f)) expect(Number.isFinite(v)).toBe(true);
  });

  it('las fracciones y opacidades están entre 0 y 1; los grosores nunca llegan a 0', () => {
    for (const t of muestras) {
      const e = estadoTrabecular(t);
      for (const v of [
        e.red.barras,
        e.red.perforacion,
        e.bmu.opacidad,
        e.bmu.relleno,
        e.cortical.porosidad,
        e.medula.adiposidad,
        e.fantasma.opacidad,
        e.carga.flecha,
        e.carga.compresion,
        e.carga.rotura,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(e.red.grosor).toBeGreaterThan(0.4);
      expect(e.red.grosor).toBeLessThanOrEqual(1);
      expect(e.cortical.grosor).toBeGreaterThan(0.4);
      expect(e.bmu.excavacion).toBeGreaterThanOrEqual(1);
    }
  });

  it('el envejecimiento es monótono: grosor y barras no vuelven a crecer, la perforación no retrocede', () => {
    const grosor = serie((e) => e.red.grosor);
    const barras = serie((e) => e.red.barras);
    const perforacion = serie((e) => e.red.perforacion);
    for (let i = 1; i < muestras.length; i++) {
      expect(grosor[i]!).toBeLessThanOrEqual(grosor[i - 1]! + 1e-9);
      expect(barras[i]!).toBeLessThanOrEqual(barras[i - 1]! + 1e-9);
      expect(perforacion[i]!).toBeGreaterThanOrEqual(perforacion[i - 1]! - 1e-9);
    }
  });
});

describe('estadoTrabecular: qué se ve en cada fase', () => {
  it('joven: red intacta, BMU activas con el hoyo relleno, sin fantasma ni carga', () => {
    const e = estadoTrabecular(HITOS_TRABECULAR.joven);
    expect(e.red).toEqual(RED_JOVEN);
    expect(e.bmu.opacidad).toBe(1);
    expect(e.bmu.relleno).toBe(1);
    expect(e.cortical).toEqual({ grosor: 1, porosidad: 0 });
    expect(e.fantasma.opacidad).toBe(0);
    expect(e.carga).toEqual({ flecha: 0, compresion: 0, rotura: 0 });
  });

  it('equilibrio: la red sigue igual que la joven (lo que se excava se rellena)', () => {
    const e = estadoTrabecular(HITOS_TRABECULAR.equilibrio);
    expect(e.red).toEqual(RED_JOVEN);
    expect(e.bmu.opacidad).toBe(1);
    expect(e.bmu.relleno).toBe(1);
  });

  it('adelgazamiento: trabéculas más finas, aún sin perforar ni cortar; los hoyos quedan a medio rellenar', () => {
    const e = estadoTrabecular(HITOS_TRABECULAR.adelgazamiento);
    expect(e.red.grosor).toBeLessThan(0.85);
    expect(e.red.barras).toBe(1);
    expect(e.red.perforacion).toBe(0);
    expect(e.bmu.opacidad).toBe(1);
    expect(e.bmu.relleno).toBeLessThan(0.6);
    expect(e.bmu.excavacion).toBeGreaterThan(1.2);
  });

  it('perforacion: algunas placas agujereadas y algunas barras cortadas; las BMU ya no se ven', () => {
    const e = estadoTrabecular(HITOS_TRABECULAR.perforacion);
    expect(e.red.perforacion).toBeGreaterThan(0.25);
    expect(e.red.perforacion).toBeLessThan(0.5);
    expect(e.red.barras).toBeLessThan(0.95);
    expect(e.red.barras).toBeGreaterThan(0.7);
    expect(e.bmu.opacidad).toBe(0);
    expect(e.fantasma.opacidad).toBe(0);
  });

  it('desconexion: se ha perdido más de la mitad de las barras horizontales', () => {
    const e = estadoTrabecular(HITOS_TRABECULAR.desconexion);
    expect(e.red.barras).toBeLessThan(0.5);
    expect(e.red.perforacion).toBeGreaterThan(0.5);
    expect(e.fantasma.opacidad).toBe(0);
  });

  it('osteoporosis: red rala y fina, cortical fina y porosa, médula grasa y el cubo joven al lado', () => {
    const e = estadoTrabecular(HITOS_TRABECULAR.osteoporosis);
    expect(e.red.grosor).toBeLessThan(0.55);
    expect(e.red.barras).toBeLessThanOrEqual(0.3);
    expect(e.red.perforacion).toBeGreaterThan(0.7);
    expect(e.cortical.grosor).toBeLessThan(0.5);
    expect(e.cortical.porosidad).toBe(1);
    expect(e.medula.adiposidad).toBe(1);
    expect(e.fantasma.opacidad).toBeGreaterThan(0.3);
    expect(e.carga).toEqual({ flecha: 0, compresion: 0, rotura: 0 });
  });

  it('carga: la flecha apoyada, los cubos aplastados y las microfracturas rotas; la red no cambia más', () => {
    const e = estadoTrabecular(HITOS_TRABECULAR.carga);
    expect(e.carga).toEqual({ flecha: 1, compresion: 1, rotura: 1 });
    expect(e.fantasma.opacidad).toBeGreaterThan(0.3);
    expect(e.red).toEqual(estadoTrabecular(HITOS_TRABECULAR.osteoporosis).red);
  });
});
