/**
 * Pruebas de la ubicación de nodos sobre el modelo (lógica pura): anclas, piezas provisionales y
 * casos que no se pueden ubicar.
 */
import { describe, expect, it } from 'vitest';
import { CATALOGO_NODOS, ESTRUCTURAS_MANDIBULA } from '@/content/nodos3d';
import { ANCLAS_PROVISIONALES, centroDeCaja, puntoDeAncla, ubicarNodoMandibula } from './anclas';
import type { CajaModelo } from './anclas';
import { RADIO_ZONA_ANCLA } from './vistas';

const CAJA: CajaModelo = { min: [-1, -0.5, -2], max: [1, 0.5, 2] };

describe('puntoDeAncla', () => {
  it('recorre la caja envolvente: 0 es el mínimo y 1 el máximo de cada eje', () => {
    expect(puntoDeAncla({ x: 0, y: 0, z: 0 }, CAJA)).toEqual([-1, -0.5, -2]);
    expect(puntoDeAncla({ x: 1, y: 1, z: 1 }, CAJA)).toEqual([1, 0.5, 2]);
    expect(puntoDeAncla({ x: 0.5, y: 0.5, z: 0.5 }, CAJA)).toEqual([0, 0, 0]);
  });

  it('acota lo que se sale de 0 a 1 y trata lo que no es número como el centro', () => {
    expect(puntoDeAncla({ x: -5, y: 9, z: 0.25 }, CAJA)).toEqual([-1, 0.5, -1]);
    expect(puntoDeAncla({ x: NaN, y: NaN, z: NaN }, CAJA)).toEqual([0, 0, 0]);
  });
});

describe('ubicarNodoMandibula', () => {
  const camara = { vista: 'frontal' as const };

  it('con ancla usa el ancla y el radio de zona por defecto', () => {
    const u = ubicarNodoMandibula(
      { id: 'lo_que_sea', ancla: { x: 1, y: 0, z: 0.5 }, camara },
      CAJA,
    )!;
    expect(u).toEqual({ punto: [1, -0.5, 0], radio: RADIO_ZONA_ANCLA, origen: 'ancla' });
  });

  it('el ancla manda aunque el id sea el de una pieza del catálogo', () => {
    const u = ubicarNodoMandibula({ id: 'condilo', ancla: { x: 0, y: 0, z: 0 }, camara }, CAJA)!;
    expect(u.origen).toBe('ancla');
    expect(u.punto).toEqual([-1, -0.5, -2]);
  });

  it('con el ancla calculada de su estructura, el nodo trae la normal de la superficie', () => {
    const condilo = ESTRUCTURAS_MANDIBULA.condilo!;
    const u = ubicarNodoMandibula({ id: 'condilo', ancla: condilo.ancla, camara }, CAJA)!;
    expect(u.origen).toBe('ancla');
    expect(u.normal).toEqual(condilo.normal);
  });

  it('con otra ancla (puesta a mano) no hereda la normal', () => {
    const u = ubicarNodoMandibula(
      { id: 'condilo', ancla: { x: 0.5, y: 0.5, z: 0.5 }, camara },
      CAJA,
    )!;
    expect(u.normal).toBeUndefined();
  });

  it('"mandibula" es el hueso completo: su centro y radio 1', () => {
    const u = ubicarNodoMandibula({ id: 'mandibula', camara }, CAJA)!;
    expect(u).toEqual({ punto: centroDeCaja(CAJA), radio: 1, origen: 'modelo_completo' });
  });

  it('cada pieza del catálogo de la mandíbula tiene posición provisional (salvo la mandíbula entera)', () => {
    for (const { id } of CATALOGO_NODOS.mandibula) {
      if (id === 'mandibula') continue;
      const u = ubicarNodoMandibula({ id, camara }, CAJA);
      expect(u, id).not.toBeNull();
      expect(u!.origen).toBe('provisional');
      expect(u!.radio).toBeGreaterThan(0);
    }
  });

  it('las piezas de los dos lados se reflejan con la vista lateral izquierda', () => {
    const der = ubicarNodoMandibula({ id: 'condilo', camara: { vista: 'lateral_derecha' } }, CAJA)!;
    const izq = ubicarNodoMandibula(
      { id: 'condilo', camara: { vista: 'lateral_izquierda' } },
      CAJA,
    )!;
    expect(izq.punto[0]).toBeCloseTo(-der.punto[0], 10);
    expect(izq.punto[1]).toBeCloseTo(der.punto[1], 10);
    expect(izq.punto[2]).toBeCloseTo(der.punto[2], 10);
  });

  it('con la vista medial izquierda también se toma la pieza del lado izquierdo', () => {
    const der = ubicarNodoMandibula({ id: 'rama', camara: { vista: 'medial_derecha' } }, CAJA)!;
    const izq = ubicarNodoMandibula({ id: 'rama', camara: { vista: 'medial_izquierda' } }, CAJA)!;
    expect(izq.punto[0]).toBeCloseTo(-der.punto[0], 10);
    expect(izq.punto[1]).toBeCloseTo(der.punto[1], 10);
  });

  it('un id desconocido no se puede ubicar (null), tampoco los que coinciden con propiedades de Object', () => {
    for (const id of ['fantasma', 'constructor', 'toString', '__proto__', 'hasOwnProperty', '']) {
      expect(ubicarNodoMandibula({ id, camara }, CAJA), id).toBeNull();
    }
  });

  it('las anclas provisionales están dentro de 0 a 1 y su radio es positivo', () => {
    for (const [id, { ancla, radio }] of Object.entries(ANCLAS_PROVISIONALES)) {
      for (const eje of [ancla.x, ancla.y, ancla.z]) {
        expect(eje, id).toBeGreaterThanOrEqual(0);
        expect(eje, id).toBeLessThanOrEqual(1);
      }
      expect(radio, id).toBeGreaterThan(0);
    }
  });
});
