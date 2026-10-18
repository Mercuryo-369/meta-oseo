import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { Box3, Vector3 } from 'three';
import type { BufferGeometry, Material, Mesh, Object3D } from 'three';
import { CATALOGO_NODOS } from '@/content/nodos3d';
import { ConfigExploracion3dSchema } from '@/content/schema';
import { contornoCuenco, dentroDePoligono } from '../histologia/piezas';
import { useModeloExploracion } from '../useModeloExploracion';
import type { ModeloExploracion } from '../useModeloExploracion';
import {
  BOLSA_INCLUIDO,
  PROFUNDIDAD,
  REGIONES_OSTEOIDE,
  X_INCLUIDO,
  X_MAX,
  X_MIN,
  Y_FONDO,
  Y_SUPERFICIE,
  crearOsteoide,
  lagunasInmaduro,
  lagunasLaminar,
  osteoblastos,
  puntoDeRegion,
  xCemento,
  yFrente,
} from './modeloOsteoide';

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

describe('disposición del tejido', () => {
  it('el osteoide es un ribete fino sobre el hueso inmaduro y baja solo alrededor del osteocito incluido', () => {
    expect(yFrente(X_MIN)).toBeCloseTo(0, 6);
    expect(yFrente(xCemento(0))).toBeCloseTo(0, 6);
    expect(yFrente(X_INCLUIDO)).toBeLessThan(-0.15);
    // Grosor del ribete lejos del osteocito: una fracción de la altura de un osteoblasto.
    const altoOsteoblasto = 2 * osteoblastos()[0]!.semiejes[1];
    expect(Y_SUPERFICIE - yFrente(-1.8)).toBeLessThan(altoOsteoblasto * 0.5);
  });

  it('la línea cementante es festoneada, con los festones hacia el hueso inmaduro', () => {
    const xs = Array.from({ length: 200 }, (_, i) =>
      xCemento(Y_FONDO + (i * (Y_SUPERFICIE - Y_FONDO)) / 199),
    );
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.05);
    for (const x of xs) expect(x).toBeLessThanOrEqual(0.62 + 1e-9);
  });

  it('el hueso inmaduro tiene más osteocitos que el laminar, más grandes y redondeados', () => {
    const inmaduro = lagunasInmaduro();
    const laminar = lagunasLaminar();
    expect(inmaduro.length).toBeGreaterThanOrEqual(10);
    expect(inmaduro.length).toBeGreaterThan(laminar.length);
    const redondez = (l: (typeof inmaduro)[number]) =>
      Math.min(l.cuenco.semiejes[0], l.cuenco.semiejes[1]) /
      Math.max(l.cuenco.semiejes[0], l.cuenco.semiejes[1]);
    const media = (ls: typeof inmaduro, f: (l: (typeof inmaduro)[number]) => number) =>
      ls.reduce((s, l) => s + f(l), 0) / ls.length;
    expect(media(inmaduro, redondez)).toBeGreaterThan(0.6);
    expect(media(laminar, redondez)).toBeLessThan(0.35);
    // Las del laminar van alargadas a lo largo de las láminas (paralelas a la línea cementante: verticales).
    for (const l of laminar) expect(Math.abs(l.cuenco.giro ?? 0)).toBeLessThan(0.1);
  });

  it('cada laguna queda dentro de su hueso, sin tocar a otra ni a los bordes', () => {
    const todas = [
      ...lagunasInmaduro().map((l) => ({ l, enInmaduro: true })),
      ...lagunasLaminar().map((l) => ({ l, enInmaduro: false })),
    ];
    for (const { l, enInmaduro } of todas) {
      for (const [x, y] of contornoCuenco(l.cuenco)) {
        expect(y).toBeGreaterThan(Y_FONDO + 0.05);
        if (enInmaduro) {
          expect(x).toBeGreaterThan(X_MIN + 0.05);
          expect(x).toBeLessThan(xCemento(y) - 0.05);
          expect(y).toBeLessThan(yFrente(x) - 0.05);
        } else {
          expect(x).toBeGreaterThan(xCemento(y) + 0.05);
          expect(x).toBeLessThan(X_MAX - 0.05);
          expect(y).toBeLessThan(Y_SUPERFICIE - 0.02);
        }
      }
    }
    for (let i = 0; i < todas.length; i++) {
      for (let j = i + 1; j < todas.length; j++) {
        const a = todas[i]!.l;
        const b = todas[j]!.l;
        const d = Math.hypot(
          a.cuenco.centro[0] - b.cuenco.centro[0],
          a.cuenco.centro[1] - b.cuenco.centro[1],
        );
        expect(d).toBeGreaterThan(a.radio + b.radio);
      }
    }
  });

  it('la bolsa del osteocito incluido queda dentro del osteoide, por debajo de los osteoblastos', () => {
    const contorno = contornoCuenco(BOLSA_INCLUIDO);
    for (const [x, y] of contorno) {
      expect(y, `(${x}, ${y})`).toBeGreaterThan(yFrente(x) + 0.005);
      expect(y).toBeLessThan(Y_SUPERFICIE - 0.05);
    }
    expect(dentroDePoligono(BOLSA_INCLUIDO.centro, contorno)).toBe(true);
  });
});

describe('modelo', () => {
  const modelo = crearOsteoide();

  it('tiene una pieza con nombre por cada región del catálogo, con materiales propios', () => {
    expect([...REGIONES_OSTEOIDE].sort()).toEqual(CATALOGO_NODOS.osteoide.map((n) => n.id).sort());
    const vistos = new Map<Material, string>();
    for (const m of mallas(modelo)) {
      let region: Object3D | null = m;
      while (region && region.parent !== modelo) region = region.parent;
      const id = region!.name;
      const mat = m.material as Material;
      // Resaltar una región no debe encender otra.
      expect(vistos.get(mat) ?? id, `material compartido entre ${vistos.get(mat)} y ${id}`).toBe(
        id,
      );
      vistos.set(mat, id);
    }
    for (const id of REGIONES_OSTEOIDE) {
      const region = modelo.getObjectByName(id);
      expect(region, id).toBeDefined();
      expect(mallas(region!).length, id).toBeGreaterThan(0);
    }
  });

  it('nada sobresale de la cara de corte (z = 0) salvo las líneas dibujadas sobre ella', () => {
    for (const m of mallas(modelo)) {
      const pos = m.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        expect(pos.getZ(i), m.name).toBeLessThanOrEqual(0.015);
        expect(pos.getZ(i), m.name).toBeGreaterThanOrEqual(-PROFUNDIDAD - 0.01);
      }
    }
  });

  it('las caras de corte son planas y miran a la cámara', () => {
    for (const nombre of ['hueso_inmaduro_corte', 'osteoide_corte', 'hueso_laminar_corte']) {
      const m = modelo.getObjectByName(nombre) as Mesh;
      const pos = m.geometry.getAttribute('position');
      const nor = m.geometry.getAttribute('normal');
      let delante = 0;
      for (let i = 0; i < pos.count; i++) {
        // En la cara de corte la normal mira a +Z; en el canto, las caras de arriba o de los lados la tienen en el plano.
        if (Math.abs(pos.getZ(i)) < 1e-6 && Math.abs(nor.getZ(i)) > 1e-6) {
          expect(nor.getZ(i), nombre).toBeGreaterThan(0.99);
          delante++;
        }
      }
      expect(delante, nombre).toBeGreaterThan(10);
    }
  });

  it('las lagunas son huecas: sus cuencos miran a la abertura', () => {
    for (const nombre of [
      'hueso_inmaduro_lagunas',
      'hueso_laminar_lagunas',
      'osteocito_incluido_bolsa',
    ]) {
      const g = (modelo.getObjectByName(nombre) as Mesh).geometry;
      const pos = g.getAttribute('position');
      const nor = g.getAttribute('normal');
      let hacia = 0;
      for (let i = 0; i < pos.count; i++) if (nor.getZ(i) > -1e-6) hacia++;
      expect(hacia / pos.count, nombre).toBeGreaterThan(0.95);
    }
  });

  it('los osteoblastos de delante están cortados y enseñan núcleo y Golgi en la cara de corte', () => {
    const delante = osteoblastos().filter((o) => o.delante).length;
    expect(delante).toBeGreaterThanOrEqual(8);
    for (const nombre of ['osteoblastos_nucleos', 'osteoblastos_golgi']) {
      const pos = (modelo.getObjectByName(nombre) as Mesh).geometry.getAttribute('position');
      let maxZ = -Infinity;
      for (let i = 0; i < pos.count; i++) maxZ = Math.max(maxZ, pos.getZ(i));
      expect(maxZ, nombre).toBeGreaterThan(0);
    }
    // Ninguno se mete en el osteoide: apoyan la base en la superficie.
    const pos = (modelo.getObjectByName('osteoblastos_citoplasma') as Mesh).geometry.getAttribute(
      'position',
    );
    for (let i = 0; i < pos.count; i++)
      expect(pos.getY(i)).toBeGreaterThanOrEqual(Y_SUPERFICIE - 1e-6);
  });

  it('los eritrocitos van dentro de la luz del capilar', () => {
    const caja = new Box3().setFromObject(modelo.getObjectByName('capilar_eritrocitos')!);
    const pared = new Box3().setFromObject(modelo.getObjectByName('capilar_pared')!);
    expect(pared.containsBox(caja)).toBe(true);
    expect(caja.max.z).toBeLessThanOrEqual(0);
  });

  it('cabe en el presupuesto del móvil: menos de 60 000 triángulos y de 40 llamadas de dibujo', () => {
    const lista = mallas(modelo);
    expect(lista.length).toBeLessThan(40);
    expect(lista.reduce((t, m) => t + triangulos(m.geometry), 0)).toBeLessThan(60_000);
  });

  it('el punto de cada etiqueta cae dentro del modelo y mira a la cámara', () => {
    const caja = new Box3().setFromObject(modelo);
    for (const id of REGIONES_OSTEOIDE) {
      const { punto, radio, normal } = puntoDeRegion(id);
      expect(caja.containsPoint(new Vector3(...punto)), id).toBe(true);
      expect(normal).toEqual([0, 0, 1]);
      expect(radio, id).toBeGreaterThan(0);
    }
    // El punto de cada región cae sobre su propia pieza (no sobre la vecina).
    const enInmaduro = puntoDeRegion('hueso_inmaduro').punto;
    expect(enInmaduro[0]).toBeLessThan(xCemento(enInmaduro[1]));
    const enLaminar = puntoDeRegion('hueso_laminar').punto;
    expect(enLaminar[0]).toBeGreaterThan(xCemento(enLaminar[1]));
    const enOsteoide = puntoDeRegion('osteoide').punto;
    expect(enOsteoide[1]).toBeGreaterThan(yFrente(enOsteoide[0]));
    expect(enOsteoide[1]).toBeLessThan(Y_SUPERFICIE);
  });
});

describe('carga en la exploración', () => {
  function montar(): ModeloExploracion {
    let modelo: ModeloExploracion | null = null;
    mount(
      defineComponent({
        setup() {
          modelo = useModeloExploracion({
            modelo: 'osteoide',
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
    expect(modelo.porcentaje.value).toBeNull();
    const caja = modelo.caja.value!;
    const radio =
      Math.hypot(caja.max[0] - caja.min[0], caja.max[1] - caja.min[1], caja.max[2] - caja.min[2]) /
      2;
    expect(radio).toBeLessThan(1.1);
    for (const id of REGIONES_OSTEOIDE) {
      const u = modelo.ubicar({ id, camara: { vista: 'frontal' } });
      expect(u, id).not.toBeNull();
      expect(u!.normal).toEqual([0, 0, 1]);
    }
    expect(modelo.ubicar({ id: 'epifisis', camara: { vista: 'frontal' } })).toBeNull();
  });
});

describe('contenido', () => {
  it('admite los nodos del catálogo y rechaza los demás y el ancla', () => {
    const base = {
      modelo: 'osteoide',
      alt: 'Superficie de formación ósea con osteoblastos y osteoide.',
      nodos: [
        { id: 'osteoide', etiqueta: 'Osteoide', descripcion: 'Matriz orgánica sin mineralizar.' },
        {
          id: 'hueso_laminar',
          etiqueta: 'Hueso laminar',
          descripcion: 'Hueso organizado en láminas.',
        },
      ],
      requeridos: ['osteoide'],
    };
    expect(ConfigExploracion3dSchema.safeParse(base).success).toBe(true);
    expect(
      ConfigExploracion3dSchema.safeParse({
        ...base,
        nodos: [
          ...base.nodos,
          { id: 'diafisis', etiqueta: 'Diáfisis', descripcion: 'No es de este modelo.' },
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

describe('nombre del grupo raíz', () => {
  it('no coincide con ninguna región: resaltar una región no enciende el modelo entero', () => {
    const modelo = crearOsteoide();
    for (const id of ['osteoide', 'osteoblastos_activos', 'hueso_inmaduro']) {
      expect(modelo.getObjectByName(id), id).not.toBe(modelo);
    }
  });
});
