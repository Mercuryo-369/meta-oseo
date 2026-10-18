import { beforeEach, describe, expect, it, vi } from 'vitest';

// Cada prueba parte de módulos nuevos: el estado de "GSAP ya cargado" vive en el módulo.
beforeEach(() => {
  vi.resetModules();
});

describe('gsapPerezoso', () => {
  it('antes de cargar no hay GSAP y después sí', async () => {
    const cargador = await import('./gsapPerezoso');
    expect(cargador.obtenerGsap()).toBeNull();
    await cargador.precargarGsap();
    expect(typeof cargador.obtenerGsap()?.to).toBe('function');
  });

  it('las llamadas repetidas comparten una sola carga', async () => {
    const cargador = await import('./gsapPerezoso');
    const a = cargador.precargarGsap();
    const b = cargador.precargarGsap();
    expect(a).toBe(b);
    await a;
    await expect(cargador.precargarGsap()).resolves.toBeUndefined();
  });

  it('si la descarga falla no rechaza, deja GSAP en null y permite reintentar', async () => {
    vi.doMock('gsap', () => {
      throw new Error('sin red');
    });
    const cargador = await import('./gsapPerezoso');
    const primera = cargador.precargarGsap();
    await expect(primera).resolves.toBeUndefined();
    expect(cargador.obtenerGsap()).toBeNull();
    // Un nuevo intento no reutiliza la promesa fallida.
    expect(cargador.precargarGsap()).not.toBe(primera);
    vi.doUnmock('gsap');
  });
});
