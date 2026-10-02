/**
 * Pruebas del estado puro de la escena "el osteocito y su red": `estadoOsteocito(t)` es una función pura del
 * tiempo (misma `t`, mismo estado), continua, con los valores esperados en el hito de cada fase y reversible.
 */
import { describe, expect, it } from 'vitest';
import {
  FASES_OSTEOCITO,
  HITOS_OSTEOCITO,
  LIMITES_FASES_OSTEOCITO,
  estadoOsteocito,
  faseOsteocitoEnTiempo,
} from './estado';
import type { EstadoOsteocito } from './estado';

const PASO = 0.001;
const muestras = Array.from({ length: Math.round(1 / PASO) + 1 }, (_, i) => i * PASO);

function serie(f: (e: EstadoOsteocito) => number): number[] {
  return muestras.map((t) => f(estadoOsteocito(t)));
}

function saltoMaximo(valores: number[]): number {
  let m = 0;
  for (let i = 1; i < valores.length; i++) m = Math.max(m, Math.abs(valores[i]! - valores[i - 1]!));
  return m;
}

describe('estadoOsteocito: fases e hitos', () => {
  it('conserva los hitos que usa el contenido del módulo 2', () => {
    expect(HITOS_OSTEOCITO).toEqual({
      laguna: 0,
      dendritas: 0.17,
      red: 0.34,
      carga: 0.5,
      senal: 0.66,
      mensaje: 0.83,
      reposo: 1,
    });
  });

  it('cada hito está en su fase y los hitos van en orden estricto de 0 a 1', () => {
    FASES_OSTEOCITO.forEach((fase, i) => {
      expect(faseOsteocitoEnTiempo(HITOS_OSTEOCITO[fase])).toBe(fase);
      if (i > 0)
        expect(HITOS_OSTEOCITO[fase]).toBeGreaterThan(HITOS_OSTEOCITO[FASES_OSTEOCITO[i - 1]!]);
    });
    expect(LIMITES_FASES_OSTEOCITO).toHaveLength(FASES_OSTEOCITO.length - 1);
  });

  it('la fase avanza con el tiempo sin retroceder', () => {
    let anterior = -1;
    for (const t of muestras) {
      const indice = FASES_OSTEOCITO.indexOf(estadoOsteocito(t).fase);
      expect(indice).toBeGreaterThanOrEqual(anterior);
      anterior = indice;
    }
  });
});

describe('estadoOsteocito: pureza y reversibilidad', () => {
  it('la misma t da siempre el mismo estado, vaya lo que vaya antes', () => {
    const a = estadoOsteocito(0.63);
    estadoOsteocito(0.1);
    estadoOsteocito(0.99);
    expect(estadoOsteocito(0.63)).toEqual(a);
  });

  it('ir y volver no deja huella', () => {
    const inicio = estadoOsteocito(0);
    for (const t of [0.3, 0.9, 0.5, 1, 0.2]) estadoOsteocito(t);
    expect(estadoOsteocito(0)).toEqual(inicio);
  });

  it('acota t fuera de [0, 1]', () => {
    expect(estadoOsteocito(-3)).toEqual(estadoOsteocito(0));
    expect(estadoOsteocito(7)).toEqual(estadoOsteocito(1));
  });
});

describe('estadoOsteocito: continuidad y rangos', () => {
  const magnitudes: [string, (e: EstadoOsteocito) => number][] = [
    ['dendritas', (e) => e.dendritas],
    ['vecinos.aparicion', (e) => e.vecinos.aparicion],
    ['vecinos.dendritas', (e) => e.vecinos.dendritas],
    ['uniones', (e) => e.uniones],
    ['compresion', (e) => e.compresion],
    ['flujo.intensidad', (e) => e.flujo.intensidad],
    ['flujo.avance', (e) => e.flujo.avance],
    ['sensores.enfasis', (e) => e.sensores.enfasis],
    ['sensores.pulso', (e) => e.sensores.pulso],
    ['esclerostina', (e) => e.esclerostina],
    ['mensaje.avance', (e) => e.mensaje.avance],
    ['mensaje.opacidad', (e) => e.mensaje.opacidad],
    ['activacion', (e) => e.activacion],
  ];

  it.each(magnitudes)('%s no da saltos bruscos entre dos instantes cercanos', (_, f) => {
    expect(saltoMaximo(serie(f))).toBeLessThan(0.08);
  });

  it.each(magnitudes)('%s es un número finito en todo el recorrido', (_, f) => {
    for (const v of serie(f)) expect(Number.isFinite(v)).toBe(true);
  });

  it('todo salvo el avance del flujo está entre 0 y 1; el avance solo crece', () => {
    let avanceAnterior = -1;
    for (const t of muestras) {
      const e = estadoOsteocito(t);
      for (const v of [
        e.dendritas,
        e.vecinos.aparicion,
        e.vecinos.dendritas,
        e.uniones,
        e.compresion,
        e.flujo.intensidad,
        e.sensores.enfasis,
        e.sensores.pulso,
        e.esclerostina,
        e.mensaje.avance,
        e.mensaje.opacidad,
        e.activacion,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(e.flujo.avance).toBeGreaterThanOrEqual(avanceAnterior);
      avanceAnterior = e.flujo.avance;
    }
  });

  it('la red, una vez construida, no se deshace', () => {
    for (const t of muestras.filter((t) => t >= HITOS_OSTEOCITO.red)) {
      const e = estadoOsteocito(t);
      expect(e.dendritas).toBe(1);
      expect(e.vecinos.aparicion).toBe(1);
      expect(e.vecinos.dendritas).toBe(1);
      expect(e.uniones).toBe(1);
    }
  });
});

describe('estadoOsteocito: qué se ve en cada fase', () => {
  it('laguna: solo la célula en su laguna, sin dendritas ni vecinos, y con esclerostina saliendo', () => {
    const e = estadoOsteocito(HITOS_OSTEOCITO.laguna);
    expect(e.dendritas).toBe(0);
    expect(e.vecinos.aparicion).toBe(0);
    expect(e.uniones).toBe(0);
    expect(e.compresion).toBe(0);
    expect(estadoOsteocito(0.12).esclerostina).toBe(1);
  });

  it('dendritas: las de la central completas; los vecinos aún no', () => {
    const e = estadoOsteocito(HITOS_OSTEOCITO.dendritas);
    expect(e.dendritas).toBe(1);
    expect(e.vecinos.aparicion).toBe(0);
    expect(e.vecinos.dendritas).toBe(0);
  });

  it('red: vecinos, sus dendritas y las uniones, sin carga', () => {
    const e = estadoOsteocito(HITOS_OSTEOCITO.red);
    expect(e.vecinos.aparicion).toBe(1);
    expect(e.vecinos.dendritas).toBe(1);
    expect(e.uniones).toBe(1);
    expect(e.compresion).toBe(0);
    expect(e.flujo.intensidad).toBe(0);
  });

  it('carga: compresión máxima y líquido fluyendo; sensores todavía en calma', () => {
    const e = estadoOsteocito(HITOS_OSTEOCITO.carga);
    expect(e.compresion).toBe(1);
    expect(e.flujo.intensidad).toBe(1);
    expect(e.sensores.enfasis).toBe(0);
    expect(e.esclerostina).toBe(1);
  });

  it('senal: sensores destacados, la esclerostina ya casi no sale y la señal aún no viaja', () => {
    const e = estadoOsteocito(HITOS_OSTEOCITO.senal);
    expect(e.sensores.enfasis).toBe(1);
    expect(e.esclerostina).toBeLessThan(0.3);
    expect(e.mensaje.opacidad).toBe(0);
    expect(e.activacion).toBe(0);
  });

  it('mensaje: los pulsos llegan a la superficie y los osteoblastos se activan', () => {
    const e = estadoOsteocito(HITOS_OSTEOCITO.mensaje);
    expect(e.mensaje.opacidad).toBe(1);
    expect(e.mensaje.avance).toBeGreaterThan(0.6);
    expect(e.activacion).toBeGreaterThan(0.6);
    expect(e.esclerostina).toBe(0);
  });

  it('reposo: sin carga, sin flujo, sin pulsos; la esclerostina vuelve', () => {
    const e = estadoOsteocito(HITOS_OSTEOCITO.reposo);
    expect(e.compresion).toBe(0);
    expect(e.flujo.intensidad).toBe(0);
    expect(e.mensaje.opacidad).toBe(0);
    expect(e.sensores.enfasis).toBe(0);
    expect(e.esclerostina).toBeGreaterThan(0.5);
    expect(e.activacion).toBeLessThan(0.3);
  });
});
