import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { Box3, Vector3 } from 'three';
import type { BufferGeometry, Material, Mesh, Object3D } from 'three';
import { CATALOGO_NODOS } from '@/content/nodos3d';
import { ConfigExploracion3dSchema } from '@/content/schema';
import { useModeloExploracion } from '../useModeloExploracion';
import type { ModeloExploracion } from '../useModeloExploracion';
import {
  REGIONES_HUESO_LARGO,
  R_MEDULA,
  X_CAVIDAD,
  X_FIN,
  X_LINEA,
  crearHuesoLargo,
  medioTorno,
  puntoDeRegion,
  radioEsponjoso,
  radioExterior,
  radioInterior,
  semialturaCavidad,
} from './modeloHuesoLargo';

function mallas(raiz: Object3D): Mesh[] {
  const lista: Mesh[] = [];
  raiz.traverse((o) => {
    if ((o as Mesh).isMesh) lista.push(o as Mesh);
  });
  return lista;
}

function triangulos(g: BufferGeometry): number {
  return (g.index ? g.index.count : g.getAttribute('position').count) / 3;
}

describe('perfil del hueso largo', () => {
  it('es continuo, se ensancha en los extremos y la cortical y la cavidad quedan por dentro', () => {
    // Lejos de la punta (allí la elipse tiene la tangente vertical y el radio crece de golpe, como debe).
    let anterior = radioExterior(-X_FIN + 0.02);
    for (let x = -X_FIN + 0.021; x <= X_FIN - 0.02; x += 0.001) {
      const r = radioExterior(x);
      expect(Math.abs(r - anterior), `salto en x = ${x.toFixed(3)}`).toBeLessThan(0.02);
      expect(radioInterior(x)).toBeLessThanOrEqual(r);
      expect(radioEsponjoso(x)).toBeLessThanOrEqual(r);
      expect(semialturaCavidad(x)).toBeLessThanOrEqual(radioInterior(x) + 1e-9);
      anterior = r;
    }
    // Diáfisis estrecha, epífisis ancha, punta cerrada.
    expect(radioExterior(0)).toBeCloseTo(0.3, 2);
    expect(radioExterior(-1.5)).toBeGreaterThan(2 * radioExterior(0));
    expect(radioExterior(X_FIN)).toBeCloseTo(0, 6);
    // La cortical de la diáfisis es gruesa y la cavidad termina dentro de la metáfisis, antes de la línea.
    expect(radioExterior(0) - R_MEDULA).toBeGreaterThan(0.1);
    expect(X_CAVIDAD).toBeLessThan(X_LINEA);
    expect(semialturaCavidad(X_CAVIDAD + 0.01)).toBe(0);
  });
});

describe('modelo', () => {
  const hueso = crearHuesoLargo();

  it('tiene una pieza con nombre por cada región del catálogo, con materiales propios', () => {
    expect([...REGIONES_HUESO_LARGO].sort()).toEqual(
      CATALOGO_NODOS.hueso_largo.map((n) => n.id).sort(),
    );
    const vistos = new Map<Material, string>();
    for (const id of REGIONES_HUESO_LARGO) {
      const region = hueso.getObjectByName(id);
      expect(region, id).toBeDefined();
      const suyas = mallas(region!);
      expect(suyas.length, id).toBeGreaterThan(0);
      for (const m of suyas) {
        const mat = m.material as Material;
        // Resaltar una región no debe encender otra.
        expect(vistos.get(mat) ?? id, `material compartido entre ${vistos.get(mat)} y ${id}`).toBe(
          id,
        );
        vistos.set(mat, id);
      }
    }
  });

  it('es la mitad de atrás: nada sobresale de la cara de corte salvo las arterias apoyadas en la médula', () => {
    for (const m of mallas(hueso)) {
      const pos = m.geometry.getAttribute('position');
      const tope = m.name === 'arteria_nutricia_vaso' ? 0.045 : 0.005;
      for (let i = 0; i < pos.count; i++) expect(pos.getZ(i), m.name).toBeLessThanOrEqual(tope);
    }
  });

  it('las caras de corte son planas y miran a la cámara (+Z)', () => {
    for (const m of mallas(hueso).filter((x) => /_corte$|_esponjoso$|conducto/.test(x.name))) {
      const normales = m.geometry.getAttribute('normal');
      for (let i = 0; i < normales.count; i++)
        expect(normales.getZ(i), m.name).toBeGreaterThan(0.99);
    }
  });

  it('la superficie de atrás tiene las normales hacia fuera', () => {
    const g = medioTorno([
      [-1, 0.3],
      [0, 0.32],
      [1, 0.3],
    ]);
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    for (let i = 0; i < pos.count; i++) {
      const radial = new Vector3(0, pos.getY(i), pos.getZ(i));
      expect(radial.dot(new Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)))).toBeGreaterThan(0);
    }
    for (const m of mallas(hueso).filter((x) => x.name.endsWith('_superficie'))) {
      const p = m.geometry.getAttribute('position');
      const n = m.geometry.getAttribute('normal');
      let haciaFuera = 0;
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) * n.getY(i) + p.getZ(i) * n.getZ(i) + p.getX(i) * n.getX(i) * 0.05 >= -1e-6)
          haciaFuera++;
      }
      expect(haciaFuera / p.count, m.name).toBeGreaterThan(0.98);
    }
  });

  it('cabe en el presupuesto del móvil: menos de 30 000 triángulos y de 16 llamadas de dibujo', () => {
    const lista = mallas(hueso);
    expect(lista.length).toBeLessThan(16);
    expect(lista.reduce((t, m) => t + triangulos(m.geometry), 0)).toBeLessThan(30_000);
  });

  it('el punto de cada etiqueta cae dentro del hueso y sobre la cara de corte', () => {
    const caja = new Box3().setFromObject(hueso);
    for (const id of REGIONES_HUESO_LARGO) {
      const { punto, radio } = puntoDeRegion(id);
      expect(caja.containsPoint(new Vector3(...punto)), id).toBe(true);
      expect(punto[2], id).toBeGreaterThanOrEqual(0);
      expect(radio, id).toBeGreaterThan(0);
    }
    // Las regiones de los extremos se rotulan en el lado izquierdo; las del cuerpo, más a la derecha.
    expect(puntoDeRegion('cartilago_articular').punto[0]).toBeLessThan(
      puntoDeRegion('epifisis').punto[0],
    );
    expect(puntoDeRegion('arteria_nutricia').punto[0]).toBeGreaterThan(0);
  });
});

describe('carga en la exploración', () => {
  function montar(): ModeloExploracion {
    let modelo: ModeloExploracion | null = null;
    mount(
      defineComponent({
        setup() {
          modelo = useModeloExploracion({
            modelo: 'hueso_largo',
            nombre: 'prueba',
            aspecto: () => 1.5,
          });
          return () => h('div');
        },
      }),
    );
    return modelo!;
  }

  it('se construye sin descarga, queda normalizado y ubica cada región', async () => {
    const modelo = montar();
    await modelo.cargar();
    expect(modelo.estado.value).toBe('listo');
    expect(modelo.raiz.value).not.toBeNull();
    expect(modelo.porcentaje.value).toBeNull();
    const caja = modelo.caja.value!;
    const radio =
      Math.hypot(caja.max[0] - caja.min[0], caja.max[1] - caja.min[1], caja.max[2] - caja.min[2]) /
      2;
    expect(radio).toBeLessThan(1.1);
    for (const id of REGIONES_HUESO_LARGO) {
      const u = modelo.ubicar({ id, camara: { vista: 'frontal' } });
      expect(u, id).not.toBeNull();
      expect(u!.normal).toEqual([0, 0, 1]);
    }
    expect(modelo.ubicar({ id: 'condilo', camara: { vista: 'frontal' } })).toBeNull();
  });
});

describe('contenido', () => {
  const base = {
    modelo: 'hueso_largo',
    alt: 'Hueso largo serrado a lo largo, con sus regiones.',
    nodos: [
      { id: 'epifisis', etiqueta: 'Epífisis', descripcion: 'Extremo ensanchado del hueso.' },
      {
        id: 'diafisis',
        etiqueta: 'Diáfisis',
        descripcion: 'Cuerpo del hueso, un tubo de cortical.',
      },
    ],
    requeridos: ['epifisis'],
  };

  it('admite los nodos del catálogo y rechaza los demás y el ancla', () => {
    expect(ConfigExploracion3dSchema.safeParse(base).success).toBe(true);
    expect(
      ConfigExploracion3dSchema.safeParse({
        ...base,
        nodos: [
          ...base.nodos,
          { id: 'condilo', etiqueta: 'Cóndilo', descripcion: 'No es de este modelo.' },
        ],
      }).success,
    ).toBe(false);
    expect(
      ConfigExploracion3dSchema.safeParse({
        ...base,
        nodos: [{ ...base.nodos[0]!, ancla: { x: 0.5, y: 0.5, z: 0.5 } }, base.nodos[1]!],
      }).success,
    ).toBe(false);
  });
});
