/**
 * Pruebas de la reproducción: el reloj se inyecta (sin temporizadores reales), así que cada fotograma
 * avanza un tiempo exacto y los resultados son deterministas.
 */
import { effectScope } from 'vue';
import { describe, expect, it } from 'vitest';
import { useLineaTiempo } from './useLineaTiempo';
import type { LineaTiempo } from './useLineaTiempo';

const PASOS = [
  { id: 'a', t: 0 },
  { id: 'b', t: 0.25 },
  { id: 'c', t: 0.5 },
  { id: 'd', t: 1 },
];

function crear(duracion = 10) {
  let ahora = 0;
  let pendiente: (() => void) | null = null;
  const visitas: string[][] = [];
  let cancelados = 0;
  const scope = effectScope();
  const linea: LineaTiempo = scope.run(() =>
    useLineaTiempo({
      pasos: () => PASOS,
      duracionSeg: () => duracion,
      alVisitar: (ids) => visitas.push(ids),
      ahora: () => ahora,
      pedirCuadro: (f) => {
        pendiente = f;
        return 1;
      },
      cancelarCuadro: () => {
        cancelados += 1;
        pendiente = null;
      },
    }),
  )!;
  /** Avanza el reloj `ms` y ejecuta un cuadro. */
  const cuadro = (ms: number) => {
    ahora += ms;
    const f = pendiente;
    pendiente = null;
    f?.();
  };
  return {
    linea,
    cuadro,
    visitas,
    cancelados: () => cancelados,
    hayCuadro: () => pendiente !== null,
  };
}

describe('useLineaTiempo', () => {
  it('empieza detenida en t = 0 y no arranca sola', () => {
    const { linea, hayCuadro } = crear();
    expect(linea.t.value).toBe(0);
    expect(linea.reproduciendo.value).toBe(false);
    expect(hayCuadro()).toBe(false);
  });

  it('reproducir avanza t con el reloj: 1 s de 10 s es el 10 %; a doble velocidad, el 20 %', () => {
    const a = crear();
    a.linea.reproducir();
    for (let i = 0; i < 10; i++) a.cuadro(100);
    expect(a.linea.t.value).toBeCloseTo(0.1, 9);
    const b = crear();
    b.linea.cambiarVelocidad(2);
    b.linea.reproducir();
    for (let i = 0; i < 10; i++) b.cuadro(100);
    expect(b.linea.t.value).toBeCloseTo(0.2, 9);
  });

  it('un cuadro muy largo (pestaña en segundo plano) se recorta a 100 ms', () => {
    const { linea, cuadro } = crear();
    linea.reproducir();
    cuadro(60_000);
    expect(linea.t.value).toBeCloseTo(0.01, 9);
  });

  it('visita los hitos por los que pasa, en orden, sin repetirlos, y se detiene al llegar al final', () => {
    const { linea, cuadro, visitas } = crear();
    linea.reproducir();
    for (let i = 0; i < 110; i++) cuadro(100);
    expect(visitas.flat()).toEqual(['a', 'b', 'c', 'd']);
    expect(linea.t.value).toBe(1);
    expect(linea.reproduciendo.value).toBe(false);
  });

  it('pausar visita el hito si se detiene en él y si no, no visita nada', () => {
    const a = crear();
    a.linea.reproducir();
    for (let i = 0; i < 25; i++) a.cuadro(100); // t = 0,25: el hito b
    a.visitas.length = 0;
    a.linea.pausar();
    expect(a.visitas).toEqual([['b']]);
    const b = crear();
    b.linea.reproducir();
    for (let i = 0; i < 15; i++) b.cuadro(100); // t = 0,15
    b.visitas.length = 0;
    b.linea.pausar();
    expect(b.visitas).toEqual([]);
    expect(b.hayCuadro()).toBe(false);
  });

  it('reproducir al final empieza de nuevo sin visitar nada por el salto', () => {
    const { linea, visitas } = crear();
    linea.saltar(1);
    visitas.length = 0;
    linea.reproducir();
    expect(linea.t.value).toBe(0);
    expect(visitas).toEqual([]);
  });

  it('adelantar y atrasar es exacto: arrastrar a un valor lo fija tal cual, vaya donde vaya', () => {
    const { linea } = crear();
    for (const v of [0.4, 0.9, 0.05, 0.6, 0.6, 1, 0]) {
      linea.arrastrar(v);
      expect(linea.t.value).toBe(v);
    }
    linea.arrastrar(3);
    expect(linea.t.value).toBe(1);
    linea.arrastrar(-3);
    expect(linea.t.value).toBe(0);
  });

  it('arrastrar pasa por los hitos de en medio (y hacia atrás también)', () => {
    const { linea, visitas } = crear();
    linea.arrastrar(0.6);
    expect(visitas.flat()).toEqual(['a', 'b', 'c']);
    visitas.length = 0;
    linea.arrastrar(0.1);
    expect(visitas.flat()).toEqual(['b', 'c']);
  });

  it('soltar el deslizador en un hito lo visita; fuera de un hito, no', () => {
    const { linea, visitas } = crear();
    linea.arrastrar(0.7);
    visitas.length = 0;
    linea.soltar();
    expect(visitas).toEqual([]);
    linea.arrastrar(1);
    visitas.length = 0;
    linea.soltar();
    expect(visitas).toEqual([['d']]);
  });

  it('paso siguiente y anterior aterrizan en el hito y solo visitan ese', () => {
    const { linea, visitas } = crear();
    linea.siguiente();
    expect(linea.t.value).toBe(0.25);
    expect(visitas).toEqual([['b']]);
    linea.siguiente();
    linea.siguiente();
    expect(linea.t.value).toBe(1);
    expect(visitas.flat()).toEqual(['b', 'c', 'd']);
    linea.siguiente(); // no hay más
    expect(linea.t.value).toBe(1);
    visitas.length = 0;
    linea.anterior();
    expect(linea.t.value).toBe(0.5);
    expect(visitas).toEqual([['c']]);
  });

  it('reiniciar vuelve a t = 0, detiene la reproducción y no visita nada', () => {
    const { linea, cuadro, visitas, hayCuadro } = crear();
    linea.reproducir();
    for (let i = 0; i < 30; i++) cuadro(100);
    visitas.length = 0;
    linea.reiniciar();
    expect(linea.t.value).toBe(0);
    expect(linea.reproduciendo.value).toBe(false);
    expect(hayCuadro()).toBe(false);
    expect(visitas).toEqual([]);
  });

  it('pausar cancela el cuadro pendiente', () => {
    const { linea, cancelados } = crear();
    linea.reproducir();
    linea.pausar();
    expect(cancelados()).toBe(1);
  });
});
