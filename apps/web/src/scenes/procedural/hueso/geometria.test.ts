/**
 * Pruebas de las formas de la escena del hueso sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo, presupuesto de polígonos y liberación de recursos.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, Mesh } from 'three';
import { estadoHueso } from './estado';
import { anillo, cascaraElipsoide } from './geometria';
import { CorteTransversal, HuesoLargo, OsteonaAmpliada } from './mallas';
import type { EscalaHueso } from './mallas';

const TIEMPOS = Array.from({ length: 41 }, (_, i) => i / 40);

function sinNaN(datos: ArrayLike<number>): boolean {
  for (let i = 0; i < datos.length; i++) if (!Number.isFinite(datos[i]!)) return false;
  return true;
}

function geometriasDe(grupo: Group): BufferGeometry[] {
  const lista: BufferGeometry[] = [];
  grupo.traverse((o) => {
    const g = (o as Mesh).geometry as BufferGeometry | undefined;
    if (g) lista.push(g);
  });
  return lista;
}

function triangulos(grupo: Group): number {
  return geometriasDe(grupo).reduce(
    (suma, g) => suma + (g.getIndex()?.count ?? g.getAttribute('position').count) / 3,
    0,
  );
}

describe('anillo', () => {
  it('un anillo parcial lleva las dos caras de corte que uno completo no tiene', () => {
    const cuenta = (g: BufferGeometry) => g.getAttribute('position').count;
    const completo = anillo(0.5, 1, 1, 0, Math.PI * 2, 56);
    const parcial = anillo(0.5, 1, 1, 0, Math.PI, 56);
    // Dos planos de 4 vértices cada uno, además de la mitad de los segmentos del anillo completo.
    expect(cuenta(parcial)).toBeLessThan(cuenta(completo));
    expect(sinNaN(completo.getAttribute('position').array)).toBe(true);
    expect(sinNaN(parcial.getAttribute('normal').array)).toBe(true);
  });

  it('los índices apuntan a vértices que existen', () => {
    const g = anillo(0.3, 1, 2, 0.4, 2.2);
    const vertices = g.getAttribute('position').count;
    const indices = g.getIndex()!.array;
    for (let i = 0; i < indices.length; i++) expect(indices[i]!).toBeLessThan(vertices);
  });

  it('un disco (radio interior 0) es válido', () => {
    const g = anillo(0, 0.6, 0.3);
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
  });
});

describe('cascaraElipsoide', () => {
  it('queda centrada en su altura y acotada por su radio y su semieje', () => {
    const g = cascaraElipsoide(1.6, 1.2, 4, 0, Math.PI * 2);
    g.computeBoundingBox();
    const caja = g.boundingBox!;
    expect(caja.max.y).toBeCloseTo(4 + 1.2, 2);
    expect(caja.min.y).toBeCloseTo(4 - 1.2, 2);
    expect(caja.max.x).toBeCloseTo(1.6, 1);
  });
});

describe.each<[string, () => EscalaHueso, number]>([
  ['HuesoLargo', () => new HuesoLargo(), 12_000],
  ['CorteTransversal', () => new CorteTransversal(), 4_000],
  ['OsteonaAmpliada', () => new OsteonaAmpliada(), 7_000],
])('%s', (_, crear, presupuesto) => {
  it('cabe en el presupuesto de polígonos', () => {
    const escala = crear();
    expect(triangulos(escala.grupo)).toBeGreaterThan(100);
    expect(triangulos(escala.grupo)).toBeLessThan(presupuesto);
    escala.liberar();
  });

  it('no produce NaN en ningún instante ni deja posiciones o escalas inválidas', () => {
    const escala = crear();
    for (const t of TIEMPOS) {
      escala.actualizar(estadoHueso(t));
      for (const v of [escala.grupo.position.x, escala.grupo.position.y, escala.grupo.scale.x]) {
        expect(Number.isFinite(v), `t = ${t}`).toBe(true);
      }
    }
    for (const g of geometriasDe(escala.grupo)) {
      expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    }
    escala.liberar();
  });

  it('actualizar es determinista: la misma t da lo mismo, vaya lo que vaya antes', () => {
    const escala = crear();
    escala.actualizar(estadoHueso(0.61));
    const antes = [escala.grupo.visible, escala.grupo.scale.x, escala.grupo.position.x];
    escala.actualizar(estadoHueso(0.05));
    escala.actualizar(estadoHueso(0.97));
    escala.actualizar(estadoHueso(0.61));
    expect([escala.grupo.visible, escala.grupo.scale.x, escala.grupo.position.x]).toEqual(antes);
    escala.liberar();
  });

  it('libera las geometrías al terminar', () => {
    const escala = crear();
    let liberadas = 0;
    for (const g of geometriasDe(escala.grupo)) g.addEventListener('dispose', () => liberadas++);
    escala.liberar();
    expect(liberadas).toBeGreaterThan(0);
  });
});

describe('visibilidad por escala', () => {
  it('al principio solo el hueso entero; al final la osteona y el corte pequeño', () => {
    const hueso = new HuesoLargo();
    const corte = new CorteTransversal();
    const osteona = new OsteonaAmpliada();
    for (const e of [hueso, corte, osteona]) e.actualizar(estadoHueso(0));
    expect([hueso.grupo.visible, corte.grupo.visible, osteona.grupo.visible]).toEqual([
      true,
      false,
      false,
    ]);
    for (const e of [hueso, corte, osteona]) e.actualizar(estadoHueso(1));
    expect([hueso.grupo.visible, corte.grupo.visible, osteona.grupo.visible]).toEqual([
      false,
      true,
      true,
    ]);
    hueso.liberar();
    corte.liberar();
    osteona.liberar();
  });
});
