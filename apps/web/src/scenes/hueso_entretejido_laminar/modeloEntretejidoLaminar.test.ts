import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh, Material, Mesh, Object3D } from 'three';
import { CATALOGO_NODOS } from '@/content/nodos3d';
import { ConfigExploracion3dSchema } from '@/content/schema';
import { montarModeloPorCodigo } from '../utilesModeloPrueba';
import {
  ANCHO,
  FRENTE_RECT,
  GROSOR_LAMINILLA,
  LAGUNA_ENTRETEJIDO,
  LAGUNA_LAMINAR,
  N_LAMINILLAS,
  REGIONES_ENTRETEJIDO_LAMINAR,
  X_ENTRETEJIDO,
  X_LAMINAR,
  Z_FRENTE,
  crearEntretejidoLaminar,
  fibrasDeLaminilla,
  frenteDeLaminilla,
  hacesDeCara,
  lagunasEntretejido,
  lagunasLaminares,
  puntoDeRegion,
} from './modeloEntretejidoLaminar';

function mallas(raiz: Object3D): Mesh[] {
  const lista: Mesh[] = [];
  raiz.traverse((o) => {
    if ((o as Mesh).isMesh) lista.push(o as Mesh);
  });
  return lista;
}

function triangulos(m: Mesh): number {
  const g = m.geometry as BufferGeometry;
  const n = (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  return n * ((m as InstancedMesh).isInstancedMesh ? (m as InstancedMesh).count : 1);
}

const HACIA_CAMARA = new Vector3(0, Math.sin((12 * Math.PI) / 180), Math.cos((12 * Math.PI) / 180));

describe('histología de los dos bloques', () => {
  const modelo = crearEntretejidoLaminar();

  it('los dos bloques miden lo mismo (misma escala)', () => {
    const tam = (id: string) =>
      new Box3().setFromObject(modelo.getObjectByName(id)!).getSize(new Vector3());
    // Medidas del hueso de cada bloque (sin lo que sobresale: haces y fibras).
    const entretejido = new Box3().setFromObject(modelo.getObjectByName('matriz_entretejido')!);
    expect(entretejido.max.x - entretejido.min.x).toBeCloseTo(ANCHO, 3);
    const laminar = tam('laminillas_paralelas');
    expect(laminar.x).toBeCloseTo(ANCHO, 2);
    expect(Math.abs(X_ENTRETEJIDO)).toBeCloseTo(Math.abs(X_LAMINAR), 6);
  });

  it('entretejido: osteocitos más numerosos y más grandes que en el laminar, y desordenados', () => {
    const entre = lagunasEntretejido(FRENTE_RECT, 24, 33).lagunas;
    const lam = lagunasLaminares().lagunas;
    expect(entre.length).toBeGreaterThan(lam.length);
    const area = ([a, b]: readonly [number, number]) => a * b;
    expect(area(LAGUNA_ENTRETEJIDO)).toBeGreaterThan(2 * area(LAGUNA_LAMINAR));
    // Aplanadas en el laminar, redondeadas en el entretejido.
    expect(LAGUNA_LAMINAR[0] / LAGUNA_LAMINAR[1]).toBeGreaterThan(3);
    expect(LAGUNA_ENTRETEJIDO[0] / LAGUNA_ENTRETEJIDO[1]).toBeLessThan(1.6);
    const angulos = new Set(entre.map((l) => Math.round(l.angulo * 4)));
    expect(angulos.size).toBeGreaterThan(5);
  });

  it('entretejido: muchos haces gruesos en todas las direcciones', () => {
    const haces = hacesDeCara(FRENTE_RECT, 110, 3);
    expect(haces.length).toBeGreaterThan(80);
    const direcciones = haces.map((h) => {
      const a = h.eje[0]!;
      const b = h.eje[h.eje.length - 1]!;
      return ((Math.atan2(b[1] - a[1], b[0] - a[0]) % Math.PI) + Math.PI) % Math.PI;
    });
    // Repartidos en los cuatro cuadrantes de dirección.
    const cuadrantes = new Set(direcciones.map((d) => Math.floor(d / (Math.PI / 4))));
    expect(cuadrantes.size).toBe(4);
  });

  it('laminar: las fibras alternan de dirección de una laminilla a la siguiente; las de arriba, escalonadas', () => {
    for (let i = 1; i < N_LAMINILLAS; i++) {
      expect(fibrasDeLaminilla(i)).not.toBe(fibrasDeLaminilla(i - 1));
    }
    for (let i = 0; i < N_LAMINILLAS - 3; i++) expect(frenteDeLaminilla(i)).toBe(Z_FRENTE);
    for (let i = N_LAMINILLAS - 3; i < N_LAMINILLAS; i++) {
      expect(frenteDeLaminilla(i)).toBeLessThan(frenteDeLaminilla(i - 1));
    }
  });

  it('laminar: los osteocitos están entre laminillas, alineados con ellas', () => {
    for (const l of lagunasLaminares().lagunas) {
      const k = (l.centro[1] - FRENTE_RECT.v0) / GROSOR_LAMINILLA;
      expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-9);
      expect(l.angulo).toBe(0);
    }
  });
});

describe('modelo', () => {
  const modelo = crearEntretejidoLaminar();

  it('tiene una pieza con nombre por cada región del catálogo, con materiales propios', () => {
    expect([...REGIONES_ENTRETEJIDO_LAMINAR].sort()).toEqual(
      CATALOGO_NODOS.hueso_entretejido_laminar.map((n) => n.id).sort(),
    );
    const vistos = new Map<Material, string>();
    for (const m of mallas(modelo)) {
      let o: Object3D | null = m;
      while (o && !REGIONES_ENTRETEJIDO_LAMINAR.includes(o.name as never) && o !== modelo)
        o = o.parent;
      const id = o && o !== modelo ? o.name : `contexto:${m.name}`;
      const mat = m.material as Material;
      expect(vistos.get(mat) ?? id, `material compartido entre ${vistos.get(mat)} y ${id}`).toBe(
        id,
      );
      vistos.set(mat, id);
    }
    for (const id of REGIONES_ENTRETEJIDO_LAMINAR) {
      expect(mallas(modelo.getObjectByName(id)!).length, id).toBeGreaterThan(0);
    }
  });

  it('cabe en el presupuesto del móvil: menos de 90 000 triángulos y de 20 llamadas de dibujo', () => {
    const lista = mallas(modelo);
    expect(lista.length).toBeLessThan(20);
    expect(lista.reduce((t, m) => t + triangulos(m), 0)).toBeLessThan(90_000);
  });

  it('el punto de cada etiqueta cae en su bloque y su normal mira a la cámara', () => {
    const caja = new Box3().setFromObject(modelo).expandByScalar(1e-3);
    for (const id of REGIONES_ENTRETEJIDO_LAMINAR) {
      const { punto, radio, normal } = puntoDeRegion(id);
      expect(caja.containsPoint(new Vector3(...punto)), id).toBe(true);
      expect(new Vector3(...normal).dot(HACIA_CAMARA), id).toBeGreaterThan(0.5);
      expect(radio).toBeGreaterThan(0);
    }
    // Las del entretejido, a la izquierda; las del laminar, a la derecha.
    expect(puntoDeRegion('fibras_entretejidas').punto[0]).toBeLessThan(0);
    expect(puntoDeRegion('osteocitos_entretejido').punto[0]).toBeLessThan(0);
    expect(puntoDeRegion('laminillas_paralelas').punto[0]).toBeGreaterThan(0);
    expect(puntoDeRegion('osteocitos_laminares').punto[0]).toBeGreaterThan(0);
  });
});

describe('carga en la exploración', () => {
  it('se construye sin descarga, queda normalizado y ubica cada región', async () => {
    const modelo = montarModeloPorCodigo('hueso_entretejido_laminar');
    await modelo.cargar();
    expect(modelo.estado.value).toBe('listo');
    for (const id of REGIONES_ENTRETEJIDO_LAMINAR) {
      expect(modelo.ubicar({ id, camara: { vista: 'frontal' } }), id).not.toBeNull();
    }
    expect(modelo.ubicar({ id: 'osteona', camara: { vista: 'frontal' } })).toBeNull();
  });
});

describe('contenido', () => {
  it('admite los nodos del catálogo y rechaza los de otro modelo', () => {
    const base = {
      modelo: 'hueso_entretejido_laminar',
      alt: 'Hueso entretejido frente a laminar.',
      nodos: [
        {
          id: 'fibras_entretejidas',
          etiqueta: 'Fibras',
          descripcion: 'Haces de colágeno al azar.',
        },
        { id: 'laminillas_paralelas', etiqueta: 'Laminillas', descripcion: 'Capas paralelas.' },
      ],
      requeridos: ['fibras_entretejidas'],
    };
    expect(ConfigExploracion3dSchema.safeParse(base).success).toBe(true);
    expect(
      ConfigExploracion3dSchema.safeParse({
        ...base,
        nodos: [
          ...base.nodos,
          { id: 'periostio', etiqueta: 'Periostio', descripcion: 'De otro modelo.' },
        ],
      }).success,
    ).toBe(false);
  });
});
