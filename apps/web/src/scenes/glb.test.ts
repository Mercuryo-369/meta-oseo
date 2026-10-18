/**
 * Pruebas de la carga de GLB sin red ni WebGL: la escena se arma con three directamente y se comprueba
 * la normalización, la búsqueda de nodos por nombre y la liberación de recursos. `parsearGlb` se prueba
 * con bytes inválidos (no hay GLB definitivo aún).
 */
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { RUTA_GLB } from '@/content/nodos3d';
import {
  RADIO_MIN_NODO,
  liberarEscena,
  normalizarEscena,
  parsearGlb,
  ubicarNodoGlb,
  urlGlb,
} from './glb';
import { ErrorModelo } from './stl';

function escenaDePrueba(): Group {
  const escena = new Group();
  const a = new Mesh(new BoxGeometry(2, 2, 2), new MeshStandardMaterial());
  a.name = 'osteoblasto';
  a.position.set(10, 0, 0);
  const b = new Mesh(new BoxGeometry(2, 2, 2), new MeshStandardMaterial());
  b.name = 'osteocito';
  b.position.set(-10, 0, 0);
  const vacio = new Group();
  vacio.name = 'sin_volumen';
  escena.add(a, b, vacio);
  return escena;
}

describe('urlGlb', () => {
  it('cuelga la ruta del modelo de la base de la aplicación, sin barras dobles', () => {
    expect(urlGlb('celulas')).toBe(
      `${import.meta.env.BASE_URL}${RUTA_GLB.celulas!.replace(/^\/+/, '')}`,
    );
    expect(urlGlb('celulas')).not.toMatch(/(^|[^:])\/\//);
  });

  it('el hueso largo no se descarga: se construye por código', () => {
    expect(() => urlGlb('hueso_largo')).toThrow();
  });
});

describe('normalizarEscena', () => {
  it('centra el modelo en el origen y lo escala a una esfera envolvente de radio 1', () => {
    const { raiz, caja } = normalizarEscena(escenaDePrueba());
    expect(raiz.name).toBe('raiz_exploracion');
    const centro = caja.min.map((m, i) => (m + caja.max[i]!) / 2);
    centro.forEach((c) => expect(c).toBeCloseTo(0, 5));
    const diagonal = Math.hypot(...caja.max.map((m, i) => m - caja.min[i]!));
    // La caja de una esfera de radio 1 tiene diagonal <= 2 sqrt(3); el radio de la esfera es 1.
    expect(diagonal / 2).toBeLessThanOrEqual(Math.sqrt(3) + 1e-6);
    expect(diagonal / 2).toBeGreaterThan(0.9);
  });

  it('una escena vacía es un error de modelo, no un NaN', () => {
    expect(() => normalizarEscena(new Group())).toThrow(ErrorModelo);
  });
});

describe('ubicarNodoGlb', () => {
  it('encuentra un nodo por su nombre: centro de su caja y un radio con mínimo', () => {
    const { raiz } = normalizarEscena(escenaDePrueba());
    const u = ubicarNodoGlb(raiz, 'osteoblasto')!;
    expect(u.origen).toBe('nodo_glb');
    expect(u.punto[0]).toBeGreaterThan(0);
    expect(ubicarNodoGlb(raiz, 'osteocito')!.punto[0]).toBeLessThan(0);
    expect(u.radio).toBeGreaterThanOrEqual(RADIO_MIN_NODO);
  });

  it('un nodo minúsculo no baja del radio mínimo', () => {
    const escena = escenaDePrueba();
    const diminuto = new Mesh(new BoxGeometry(0.0001, 0.0001, 0.0001), new MeshStandardMaterial());
    diminuto.name = 'diminuto';
    escena.add(diminuto);
    const { raiz } = normalizarEscena(escena);
    expect(ubicarNodoGlb(raiz, 'diminuto')!.radio).toBe(RADIO_MIN_NODO);
  });

  it('un nombre inexistente o un nodo sin volumen no se ubica (null)', () => {
    const { raiz } = normalizarEscena(escenaDePrueba());
    expect(ubicarNodoGlb(raiz, 'fantasma')).toBeNull();
    expect(ubicarNodoGlb(raiz, 'sin_volumen')).toBeNull();
    expect(ubicarNodoGlb(raiz, '')).toBeNull();
  });
});

describe('parsearGlb', () => {
  it('bytes que no son un GLB rechazan con ErrorModelo en español', async () => {
    const bytes = new TextEncoder().encode('esto no es un glb').buffer as ArrayBuffer;
    const error = await parsearGlb(bytes).then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ErrorModelo);
    expect((error as ErrorModelo).message).toContain('no es válido');
  });

  it('un buffer vacío también rechaza', async () => {
    await expect(parsearGlb(new ArrayBuffer(0))).rejects.toBeInstanceOf(ErrorModelo);
  });
});

describe('liberarEscena', () => {
  it('libera geometrías, materiales y texturas de todas las mallas', () => {
    const escena = escenaDePrueba();
    const textura = new Texture();
    escena.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: textura })));
    const mallas = escena.children.filter((o): o is Mesh => o instanceof Mesh);
    const geometrias = mallas.map((m) => vi.spyOn(m.geometry, 'dispose'));
    const materiales = mallas.map((m) => vi.spyOn(m.material as MeshStandardMaterial, 'dispose'));
    const t = vi.spyOn(textura, 'dispose');
    liberarEscena(escena);
    for (const g of geometrias) expect(g).toHaveBeenCalledTimes(1);
    for (const m of materiales) expect(m).toHaveBeenCalledTimes(1);
    expect(t).toHaveBeenCalledTimes(1);
  });

  it('admite mallas con varios materiales', () => {
    const m1 = new MeshStandardMaterial();
    const m2 = new MeshStandardMaterial();
    const malla = new Mesh(new BoxGeometry(), [m1, m2]);
    const d1 = vi.spyOn(m1, 'dispose');
    const d2 = vi.spyOn(m2, 'dispose');
    liberarEscena(malla);
    expect(d1).toHaveBeenCalledTimes(1);
    expect(d2).toHaveBeenCalledTimes(1);
  });
});
