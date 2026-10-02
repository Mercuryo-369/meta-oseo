import { describe, expect, it } from 'vitest';
import { estadoDelModulo, moduloDeLaRuta } from './estados';

const base = { moduloActual: null, completados: [] as number[], bloqueoSecuencial: false };

describe('estadoDelModulo', () => {
  it('sin bloqueo secuencial ningún módulo está bloqueado', () => {
    for (let n = 1; n <= 6; n++) {
      expect(estadoDelModulo(n, base)).toEqual({
        activo: false,
        completado: false,
        bloqueado: false,
      });
    }
  });

  it('marca como activo el módulo de la ruta y como completados los que dice el store', () => {
    const opciones = { ...base, moduloActual: 3, completados: [1, 2] };
    expect(estadoDelModulo(3, opciones).activo).toBe(true);
    expect(estadoDelModulo(2, opciones).activo).toBe(false);
    expect(estadoDelModulo(1, opciones).completado).toBe(true);
    expect(estadoDelModulo(2, opciones).completado).toBe(true);
    expect(estadoDelModulo(3, opciones).completado).toBe(false);
  });

  describe('con bloqueo secuencial', () => {
    const con = (completados: number[], moduloActual: number | null = null) => ({
      moduloActual,
      completados,
      bloqueoSecuencial: true,
    });

    it('el módulo 1 nunca está bloqueado', () => {
      expect(estadoDelModulo(1, con([])).bloqueado).toBe(false);
    });

    it('un módulo se abre cuando el anterior está completado', () => {
      expect(estadoDelModulo(2, con([])).bloqueado).toBe(true);
      expect(estadoDelModulo(2, con([1])).bloqueado).toBe(false);
      expect(estadoDelModulo(3, con([1])).bloqueado).toBe(true);
      expect(estadoDelModulo(3, con([1, 2])).bloqueado).toBe(false);
    });

    it('completar el 1 no abre el 3', () => {
      const estados = [1, 2, 3, 4, 5, 6].map((n) => estadoDelModulo(n, con([1])).bloqueado);
      expect(estados).toEqual([false, false, true, true, true, true]);
    });

    it('un módulo bloqueado que está abierto por URL se muestra activo Y bloqueado (la página lo explica en su sitio)', () => {
      expect(estadoDelModulo(5, con([], 5))).toEqual({
        activo: true,
        completado: false,
        bloqueado: true,
      });
    });

    it('un módulo ya completado no se muestra bloqueado', () => {
      // El backend no exige orden: se puede tener el 4 completo sin el 3.
      expect(estadoDelModulo(4, con([4]))).toEqual({
        activo: false,
        completado: true,
        bloqueado: false,
      });
    });
  });
});

describe('moduloDeLaRuta', () => {
  it('devuelve el número si la ruta es /modulo/:n', () => {
    expect(moduloDeLaRuta({ name: 'modulo', params: { n: '4' } })).toBe(4);
    expect(moduloDeLaRuta({ name: 'modulo', params: { n: ['2'] } })).toBe(2);
  });

  it('devuelve null en otras rutas o con un número fuera de rango', () => {
    expect(moduloDeLaRuta({ name: 'inicio', params: {} })).toBeNull();
    expect(moduloDeLaRuta({ name: 'demo_mandibula', params: {} })).toBeNull();
    expect(moduloDeLaRuta({ name: undefined, params: {} })).toBeNull();
    expect(moduloDeLaRuta({ name: 'modulo', params: { n: '7' } })).toBeNull();
    expect(moduloDeLaRuta({ name: 'modulo', params: { n: '0' } })).toBeNull();
    expect(moduloDeLaRuta({ name: 'modulo', params: { n: 'x' } })).toBeNull();
  });
});
