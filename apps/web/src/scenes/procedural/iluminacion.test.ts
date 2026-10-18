import { describe, expect, it } from 'vitest';
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import {
  HACIA_CLAVE,
  ILUMINACION,
  ajusteSombras,
  direccionesLuces,
  radioEscena,
} from './iluminacion';

/** Cámara en `posicion` mirando al origen, con su matriz de mundo al día. */
function camaraMirandoAlOrigen(posicion: [number, number, number]): PerspectiveCamera {
  const c = new PerspectiveCamera();
  c.position.set(...posicion);
  c.lookAt(0, 0, 0);
  c.updateMatrixWorld();
  return c;
}

/** Ángulo (grados) entre dos vectores. */
function grados(a: Vector3, b: Vector3): number {
  return (a.angleTo(b) * 180) / Math.PI;
}

describe('direccionesLuces', () => {
  it('la principal llega de arriba a la izquierda de lo que se ve, a unos 45° de la vista', () => {
    const camara = camaraMirandoAlOrigen([0, 0, 8]);
    const clave = new Vector3();
    const contraluz = new Vector3();
    direccionesLuces(camara.matrixWorld, clave, contraluz);
    const haciaCamara = new Vector3(0, 0, 1);
    expect(grados(clave, haciaCamara)).toBeGreaterThan(40);
    expect(grados(clave, haciaCamara)).toBeLessThan(50);
    expect(clave.x).toBeLessThan(0); // izquierda
    expect(clave.y).toBeGreaterThan(0); // arriba
    expect(clave.length()).toBeCloseTo(1);
    // La contraluz llega desde detrás del objeto (del lado opuesto a la cámara) y desde arriba a la derecha.
    expect(contraluz.z).toBeLessThan(0);
    expect(contraluz.x).toBeGreaterThan(0);
    expect(contraluz.y).toBeGreaterThan(0);
  });

  it('no depende de la distancia ni del lado de la órbita: es la misma respecto de la cámara', () => {
    const cerca = camaraMirandoAlOrigen([0, 0, 2]);
    const lejos = camaraMirandoAlOrigen([0, 0, 20]);
    const a = new Vector3();
    const b = new Vector3();
    const tmp = new Vector3();
    direccionesLuces(cerca.matrixWorld, a, tmp);
    direccionesLuces(lejos.matrixWorld, b, tmp);
    expect(a.distanceTo(b)).toBeLessThan(1e-9);

    // Desde el otro lado (la cámara mira desde -X): la luz principal sigue a 45° de la vista y por la izquierda.
    const lado = camaraMirandoAlOrigen([-8, 0, 0]);
    const c = new Vector3();
    direccionesLuces(lado.matrixWorld, c, tmp);
    const haciaCamara = new Vector3(-1, 0, 0);
    expect(grados(c, haciaCamara)).toBeCloseTo(grados(a, new Vector3(0, 0, 1)), 6);
    const izquierdaPantalla = new Vector3().setFromMatrixColumn(lado.matrixWorld, 0).negate();
    expect(c.dot(izquierdaPantalla)).toBeCloseTo(-HACIA_CLAVE[0] / Math.hypot(...HACIA_CLAVE), 6);
  });
});

describe('radioEscena', () => {
  it('mide desde el origen, redondea a medias unidades y se acota', () => {
    expect(radioEscena(new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1)))).toBe(2); // √3 ≈ 1,73 → 2
    expect(radioEscena(new Box3(new Vector3(0, 0, 0), new Vector3(3, 0, 0)))).toBe(3);
    expect(radioEscena(new Box3(new Vector3(-0.1, 0, 0), new Vector3(0.1, 0, 0)))).toBe(0.5);
    expect(radioEscena(new Box3(new Vector3(-100, 0, 0), new Vector3(0, 0, 0)))).toBe(12);
    expect(radioEscena(new Box3())).toBe(6);
  });
});

describe('ajusteSombras', () => {
  it('la caja abarca la escena, la profundidad la contiene y los sesgos son de un texel y medio', () => {
    const a = ajusteSombras(2, 2048);
    expect(a.extension).toBeGreaterThanOrEqual(2);
    expect(a.cerca).toBeGreaterThan(0);
    expect(a.cerca).toBeLessThan(a.distancia - 2);
    expect(a.lejos).toBeGreaterThan(a.distancia + 2);
    expect(a.sesgoNormal).toBeCloseTo(((2 * a.extension) / 2048) * 1.5);
    // Con menos resolución (pantallas táctiles), más desplazamiento en la normal.
    expect(ajusteSombras(2, 1024).sesgoNormal).toBeCloseTo(a.sesgoNormal * 2);
  });

  it('en la mandíbula (radio ~1) la caja es mucho más ajustada que la antigua de ±8', () => {
    expect(ajusteSombras(1, 2048).extension).toBeLessThan(2);
  });
});

describe('ILUMINACION', () => {
  it('el relleno queda por debajo de la luz principal: hay volumen (el lado en sombra no se aplana)', () => {
    const relleno = ILUMINACION.entorno + ILUMINACION.hemisferio.intensidad / Math.PI;
    const directa = (ILUMINACION.clave.intensidad * Math.cos(Math.PI / 4)) / Math.PI;
    expect(directa / relleno).toBeGreaterThan(1.1);
    expect(directa / relleno).toBeLessThan(2.5);
  });
});
