import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { Box3, Vector3 } from 'three';
import type { BufferGeometry, Material, Mesh, Object3D } from 'three';
import { CATALOGO_NODOS } from '@/content/nodos3d';
import { useModeloExploracion } from '../useModeloExploracion';
import type { ModeloExploracion } from '../useModeloExploracion';
import {
  DIAFISIS_NORMAL,
  DIAFISIS_OSTEOPOROTICA,
  POROS_NORMALES,
  POROS_OSTEOPOROTICOS,
  REGIONES_HUESO_OSTEOPOROTICO,
  VERTEBRA_NORMAL,
  VERTEBRA_OSTEOPOROTICA,
  bordeInferior,
  bordeSuperior,
  conservaVertical,
  contornoVertebra,
  crearHuesoOsteoporotico,
  esRegionHuesoOsteoporotico,
  puntoDeRegion,
} from './modeloHuesoOsteoporotico';

function mallas(raiz: Object3D): Mesh[] {
  const lista: Mesh[] = [];
  raiz.traverse((o) => {
    if ((o as Mesh).isMesh) lista.push(o as Mesh);
  });
  return lista;
}

const triangulos = (g: BufferGeometry): number =>
  (g.index ? g.index.count : g.getAttribute('position').count) / 3;

const muestrasAngulo = Array.from({ length: 72 }, (_, i) => (2 * Math.PI * i) / 72);
const media = (f: (t: number) => number): number =>
  muestrasAngulo.reduce((s, t) => s + f(t), 0) / muestrasAngulo.length;

describe('anatomía de la comparación', () => {
  it('la cortical osteoporótica es MÁS DELGADA y su cavidad medular MÁS ANCHA (no al revés)', () => {
    const grosor = (d: typeof DIAFISIS_NORMAL) => media((t) => d.exterior(t) - d.interior(t));
    expect(grosor(DIAFISIS_OSTEOPOROTICA)).toBeLessThan(0.6 * grosor(DIAFISIS_NORMAL));
    expect(media(DIAFISIS_OSTEOPOROTICA.interior)).toBeGreaterThan(
      1.4 * media(DIAFISIS_NORMAL.interior),
    );
    // Aposición perióstica parcial: el contorno externo es algo mayor, no menor.
    expect(media(DIAFISIS_OSTEOPOROTICA.exterior)).toBeGreaterThan(media(DIAFISIS_NORMAL.exterior));
    expect(media(DIAFISIS_OSTEOPOROTICA.exterior)).toBeLessThan(
      1.15 * media(DIAFISIS_NORMAL.exterior),
    );
    for (const t of muestrasAngulo) {
      for (const d of [DIAFISIS_NORMAL, DIAFISIS_OSTEOPOROTICA]) {
        expect(d.exterior(t) - d.interior(t)).toBeGreaterThan(0.06);
      }
    }
  });

  it('los poros osteoporóticos son más y mayores, y todos quedan dentro de la cortical', () => {
    expect(POROS_OSTEOPOROTICOS.length).toBeGreaterThan(POROS_NORMALES.length);
    const area = (lista: typeof POROS_NORMALES) => lista.reduce((s, p) => s + p.r * p.r, 0);
    expect(area(POROS_OSTEOPOROTICOS)).toBeGreaterThan(5 * area(POROS_NORMALES));
    for (const [lista, d] of [
      [POROS_NORMALES, DIAFISIS_NORMAL],
      [POROS_OSTEOPOROTICOS, DIAFISIS_OSTEOPOROTICA],
    ] as const) {
      for (const p of lista) {
        const t = Math.atan2(p.y + 0.68, p.x - d.cx);
        const r = Math.hypot(p.y + 0.68, p.x - d.cx);
        expect(r - p.r).toBeGreaterThan(d.interior(t));
        expect(r + p.r).toBeLessThan(d.exterior(t));
      }
    }
  });

  it('la vértebra fracturada es una cuña: pierde más altura por delante que por detrás', () => {
    const altura = (v: typeof VERTEBRA_NORMAL, u: number) =>
      bordeSuperior(v, u) - bordeInferior(v, u);
    const delante = -0.6;
    const detras = 0.6;
    expect(altura(VERTEBRA_NORMAL, delante) / altura(VERTEBRA_NORMAL, detras)).toBeGreaterThan(
      0.95,
    );
    const cuna = altura(VERTEBRA_OSTEOPOROTICA, delante) / altura(VERTEBRA_OSTEOPOROTICA, detras);
    expect(cuna).toBeLessThan(0.8);
    expect(cuna).toBeGreaterThan(0.5);
    // La cortical vertebral también se adelgaza.
    expect(VERTEBRA_OSTEOPOROTICA.cortical).toBeLessThan(VERTEBRA_NORMAL.cortical);
    // El contorno interior queda dentro del exterior.
    for (const v of [VERTEBRA_NORMAL, VERTEBRA_OSTEOPOROTICA]) {
      const fuera = contornoVertebra(v);
      const dentro = contornoVertebra(v, v.cortical);
      const xs = fuera.map((p) => p[0]);
      const ys = fuera.map((p) => p[1]);
      for (const [x, y] of dentro) {
        expect(x).toBeGreaterThan(Math.min(...xs));
        expect(x).toBeLessThan(Math.max(...xs));
        expect(y).toBeGreaterThan(Math.min(...ys));
        expect(y).toBeLessThan(Math.max(...ys));
      }
    }
  });

  it('la red osteoporótica pierde varillas verticales y casi todas las horizontales', () => {
    const modelo = crearHuesoOsteoporotico();
    const tri = (id: string) =>
      mallas(modelo.getObjectByName(id)!).reduce((t, m) => t + triangulos(m.geometry), 0);
    // Menos trabéculas (y más finas): la red osteoporótica, con sus perforaciones, pesa mucho menos.
    expect(tri('trabeculas_osteoporoticas') + tri('perforacion_trabecular')).toBeLessThan(
      0.75 * tri('trabeculas_normales'),
    );
    let quedan = 0;
    for (let i = 0; i < 10; i++) for (let k = 0; k < 3; k++) if (conservaVertical(i, k)) quedan++;
    expect(quedan).toBeLessThan(0.75 * 30);
    expect(quedan).toBeGreaterThan(0.4 * 30);
  });
});

describe('modelo', () => {
  const modelo = crearHuesoOsteoporotico();

  it('tiene una pieza con nombre por cada región del catálogo, con materiales propios', () => {
    expect([...REGIONES_HUESO_OSTEOPOROTICO].sort()).toEqual(
      CATALOGO_NODOS.hueso_osteoporotico.map((n) => n.id).sort(),
    );
    const vistos = new Set<Material>();
    for (const m of mallas(modelo)) {
      const mat = m.material as Material;
      expect(vistos.has(mat), `material compartido por ${m.name}`).toBe(false);
      vistos.add(mat);
    }
    for (const id of REGIONES_HUESO_OSTEOPOROTICO) {
      const region = modelo.getObjectByName(id);
      expect(region, id).toBeDefined();
      expect(mallas(region!).length, id).toBeGreaterThan(0);
    }
    expect(esRegionHuesoOsteoporotico('colapso_vertebral')).toBe(true);
    expect(esRegionHuesoOsteoporotico('vertebra_normal')).toBe(false);
  });

  it('es la mitad de atrás: nada sobresale de la cara de corte', () => {
    for (const m of mallas(modelo)) {
      const pos = m.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) expect(pos.getZ(i), m.name).toBeLessThanOrEqual(1e-6);
    }
  });

  it('las dos vértebras y las dos diáfisis están a la misma escala y alineadas', () => {
    const caja = (id: string) => new Box3().setFromObject(modelo.getObjectByName(id)!);
    const [vn, vo] = [caja('vertebra_normal'), caja('colapso_vertebral')];
    expect(vo.max.x - vo.min.x).toBeCloseTo(vn.max.x - vn.min.x, 1);
    expect(vo.min.y).toBeCloseTo(vn.min.y, 2);
    const [cn, co] = [caja('cortical_normal'), caja('cortical_adelgazada')];
    expect(co.min.y).toBeLessThan(cn.min.y + 0.05);
    expect(vn.min.y).toBeGreaterThan(cn.max.y);
    // Normal a la izquierda, osteoporótico a la derecha.
    expect(vn.max.x).toBeLessThan(vo.min.x);
    expect(cn.max.x).toBeLessThan(co.min.x);
  });

  it('cabe en el presupuesto del móvil: menos de 40 000 triángulos y de 20 llamadas de dibujo', () => {
    const lista = mallas(modelo);
    expect(lista.length).toBeLessThan(20);
    expect(lista.reduce((t, m) => t + triangulos(m.geometry), 0)).toBeLessThan(40_000);
  });

  it('el punto de cada etiqueta cae dentro de su región y mira a la cámara', () => {
    for (const id of REGIONES_HUESO_OSTEOPOROTICO) {
      const { punto, radio, normal } = puntoDeRegion(id);
      const region = new Box3().setFromObject(modelo.getObjectByName(id)!);
      region.expandByScalar(0.03);
      expect(region.containsPoint(new Vector3(...punto)), id).toBe(true);
      expect(radio, id).toBeGreaterThan(0);
      expect(normal).toEqual([0, 0, 1]);
    }
  });
});

describe('carga en la exploración', () => {
  it('se construye sin descarga, queda normalizado y ubica cada región', async () => {
    let modelo: ModeloExploracion | null = null;
    mount(
      defineComponent({
        setup() {
          modelo = useModeloExploracion({
            modelo: 'hueso_osteoporotico',
            nombre: 'prueba',
            aspecto: () => 1.5,
          });
          return () => h('div');
        },
      }),
    );
    const m = modelo! as ModeloExploracion;
    await m.cargar();
    expect(m.estado.value).toBe('listo');
    const caja = m.caja.value!;
    const radio =
      Math.hypot(caja.max[0] - caja.min[0], caja.max[1] - caja.min[1], caja.max[2] - caja.min[2]) /
      2;
    expect(radio).toBeLessThan(1.1);
    for (const id of REGIONES_HUESO_OSTEOPOROTICO) {
      const u = m.ubicar({ id, camara: { vista: 'frontal' } });
      expect(u, id).not.toBeNull();
    }
    expect(m.ubicar({ id: 'epifisis', camara: { vista: 'frontal' } })).toBeNull();
  });
});
