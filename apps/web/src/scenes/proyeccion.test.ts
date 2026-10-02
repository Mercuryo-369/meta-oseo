/** Pruebas de la proyección de los puntos de interés (proyeccion.ts). */
import { describe, expect, it } from 'vitest';
import { cambioSignificativo, enPantalla, miraALaCamara, ndcAPixeles } from './proyeccion';
import type { PosicionPunto } from './proyeccion';

const punto = (sobrescribir: Partial<PosicionPunto> = {}): PosicionPunto => ({
  id: 'a',
  x: 10,
  y: 20,
  enPantalla: true,
  detras: false,
  ...sobrescribir,
});

describe('ndcAPixeles', () => {
  it('el centro del cubo es el centro del lienzo y `y` crece hacia abajo', () => {
    expect(ndcAPixeles(0, 0, 400, 300)).toEqual({ x: 200, y: 150 });
    expect(ndcAPixeles(-1, 1, 400, 300)).toEqual({ x: 0, y: 0 });
    expect(ndcAPixeles(1, -1, 400, 300)).toEqual({ x: 400, y: 300 });
  });
});

describe('enPantalla', () => {
  it('acepta lo que está dentro del cubo de recorte y rechaza lo de fuera', () => {
    expect(enPantalla([0, 0, 0.5])).toBe(true);
    expect(enPantalla([1, -1, 0.9])).toBe(true);
    expect(enPantalla([2, 0, 0.5])).toBe(false);
    expect(enPantalla([0, -3, 0.5])).toBe(false);
  });

  it('un punto detrás de la cámara (z > 1) no se dibuja', () => {
    expect(enPantalla([0, 0, 1.2])).toBe(false);
    expect(enPantalla([0, 0, -1.2])).toBe(false);
  });

  it('el margen deja tocar un botón medio cortado por el borde', () => {
    expect(enPantalla([1.1, 0, 0])).toBe(true);
    expect(enPantalla([1.1, 0, 0], 0)).toBe(false);
  });

  it('NaN e Infinity nunca se dibujan', () => {
    expect(enPantalla([NaN, 0, 0])).toBe(false);
    expect(enPantalla([0, Infinity, 0])).toBe(false);
  });
});

describe('miraALaCamara', () => {
  const centro = [0, 0, 0] as const;

  it('un punto del lado de la cámara mira hacia ella y uno del lado opuesto no', () => {
    expect(miraALaCamara([0, 0, 0.6], centro, [0, 0, 4])).toBe(true);
    expect(miraALaCamara([0, 0, -0.6], centro, [0, 0, 4])).toBe(false);
  });

  it('un punto de canto (en el plano de silueta) cuenta como visible: la tolerancia evita parpadeos', () => {
    expect(miraALaCamara([0.9, 0, -0.1], centro, [0, 0, 4])).toBe(true);
  });

  it('el cóndilo derecho (-X) se ve desde la derecha y no desde la izquierda', () => {
    const condiloDerecho = [-0.6, 0.8, 0] as const;
    expect(miraALaCamara(condiloDerecho, centro, [-4, 0, 0])).toBe(true);
    expect(miraALaCamara(condiloDerecho, centro, [4, 0, 0])).toBe(false);
  });

  it('con la cámara sobre el centro o valores no finitos no descarta el punto', () => {
    expect(miraALaCamara([0, 0, -1], centro, [0, 0, 0])).toBe(true);
    expect(miraALaCamara([NaN, 0, 0], centro, [0, 0, 4])).toBe(true);
  });
});

describe('miraALaCamara con la normal de la superficie', () => {
  const centro = [0, 0, 0] as const;
  const camara = [0, 0, 4] as const;

  it('la normal que apunta a la cámara mira; la que le da la espalda, no', () => {
    expect(miraALaCamara([0, 0, 0.5], centro, camara, undefined, [0, 0, 1])).toBe(true);
    // El mismo punto, con la superficie mirando hacia atrás (una cara interna del hueso).
    expect(miraALaCamara([0, 0, 0.5], centro, camara, undefined, [0, 0, -1])).toBe(false);
  });

  it('manda la normal y no el lado del centro: un punto de la cara trasera con normal hacia delante se ve', () => {
    expect(miraALaCamara([0, 0, -0.6], centro, camara, undefined, [0, 0, 1])).toBe(true);
    expect(miraALaCamara([0, 0, 0.6], centro, camara, undefined, [0, 0, -1])).toBe(false);
  });

  it('un punto de canto (normal casi perpendicular a la cámara) sigue viéndose con la tolerancia', () => {
    // Coseno -0,1: la normal mira apenas de espaldas, como la punta del cóndilo vista de frente.
    expect(miraALaCamara([0, 0, 0], centro, camara, undefined, [0, -0.1, 0.0])).toBe(true);
    expect(miraALaCamara([0, 0, 0], centro, camara, undefined, [0.1, 0, -0.995])).toBe(false);
  });

  it('una normal no finita o una cámara sobre el punto vuelven al criterio del lado del centro', () => {
    expect(miraALaCamara([0, 0, -0.6], centro, camara, undefined, [NaN, 0, 0])).toBe(false);
    expect(miraALaCamara([0, 0, 0.6], centro, [0, 0, 0.6], undefined, [0, 0, -1])).toBe(true);
  });
});

describe('cambioSignificativo', () => {
  it('sin cambios o con cambios de menos del umbral no hay que reescribir la interfaz', () => {
    expect(cambioSignificativo([punto()], [punto()])).toBe(false);
    expect(cambioSignificativo([punto()], [punto({ x: 10.4, y: 19.7 })])).toBe(false);
  });

  it('un desplazamiento mayor, un cambio de visibilidad o de lado sí', () => {
    expect(cambioSignificativo([punto()], [punto({ x: 11 })])).toBe(true);
    expect(cambioSignificativo([punto()], [punto({ y: 25 })])).toBe(true);
    expect(cambioSignificativo([punto()], [punto({ enPantalla: false })])).toBe(true);
    expect(cambioSignificativo([punto()], [punto({ detras: true })])).toBe(true);
  });

  it('cambiar la cantidad o el id de los puntos sí', () => {
    expect(cambioSignificativo([], [punto()])).toBe(true);
    expect(cambioSignificativo([punto()], [])).toBe(true);
    expect(cambioSignificativo([punto()], [punto({ id: 'b' })])).toBe(true);
  });
});
