import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh, Material, Mesh, Object3D } from 'three';
import { CATALOGO_NODOS } from '@/content/nodos3d';
import { ConfigExploracion3dSchema } from '@/content/schema';
import { montarModeloPorCodigo } from '../utilesModeloPrueba';
import { distanciaASegmento } from '../piezasPorCodigo';
import {
  GROSOR_CEMENTO,
  OSTEONAS,
  REGIONES_OSTEONA,
  VOLKMANN_FRENTE,
  X_MAX,
  X_MIN,
  Y_MIN,
  Y_OSTEONAS,
  arcosIntersticiales,
  crearOsteona,
  enIntersticial,
  lagunasDelFrente,
  puntoDeRegion,
  salidaLaminilla,
} from './modeloOsteona';

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

/** Dirección hacia la cámara de la vista frontal (elevada 12°). */
const HACIA_CAMARA = new Vector3(0, Math.sin((12 * Math.PI) / 180), Math.cos((12 * Math.PI) / 180));

describe('histología del bloque', () => {
  it('las osteonas caben en la zona de osteonas y no se solapan; el conducto mide en torno a la quinta parte', () => {
    OSTEONAS.forEach((o, i) => {
      // Unas 50 µm de 200 a 250 µm (algo más en la osteona pequeña, que tiene un conducto mínimo).
      expect(o.havers / o.radio).toBeGreaterThanOrEqual(0.19);
      expect(o.havers / o.radio).toBeLessThanOrEqual(0.26);
      expect(o.cy - o.radio).toBeGreaterThanOrEqual(Y_MIN);
      expect(o.cy + o.radio).toBeLessThanOrEqual(Y_OSTEONAS);
      if (o.arco >= Math.PI * 2 - 1e-9) expect(o.cx - o.radio).toBeGreaterThanOrEqual(X_MIN);
      // Entre 5 y 9 laminillas, del conducto a la línea cementante.
      const n = o.limites.length - 1;
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(9);
      expect(o.limites[0]!).toBeGreaterThan(o.havers);
      expect(o.limites[n]!).toBeCloseTo(o.radio - GROSOR_CEMENTO, 6);
      for (const p of OSTEONAS.slice(i + 1)) {
        expect(Math.hypot(o.cx - p.cx, o.cy - p.cy)).toBeGreaterThan(o.radio + p.radio);
      }
    });
    // Una osteona cortada por su eje en la cara longitudinal.
    expect(OSTEONAS.some((o) => o.cx === X_MAX && o.arco < Math.PI * 2)).toBe(true);
  });

  it('la osteona de primer plano tiene las laminillas escalonadas: la más interna sale más', () => {
    const n = OSTEONAS[0]!.limites.length - 1;
    for (let k = 1; k < n; k++) expect(salidaLaminilla(k)).toBeLessThan(salidaLaminilla(k - 1));
    expect(salidaLaminilla(n - 1)).toBeGreaterThan(0);
  });

  it('las lagunas están entre laminillas y los canalículos no cruzan la línea cementante ni entran en el Volkmann', () => {
    const { lagunas, canaliculos } = lagunasDelFrente();
    expect(lagunas.length).toBeGreaterThan(80);
    expect(canaliculos.length).toBeGreaterThan(3 * 80);
    for (const l of lagunas) {
      const o = OSTEONAS.find((x) => Math.hypot(l.centro[0] - x.cx, l.centro[1] - x.cy) < x.radio);
      if (!o) continue; // intersticial o circunferencial
      const r = Math.hypot(l.centro[0] - o.cx, l.centro[1] - o.cy);
      expect(
        o.limites.some((b) => Math.abs(b - r) < 1e-9),
        `laguna a r = ${r}`,
      ).toBe(true);
    }
    for (const c of canaliculos) {
      for (const p of c) {
        const o = OSTEONAS.find((x) => Math.hypot(p[0] - x.cx, p[1] - x.cy) < x.radio + 0.002);
        if (o) {
          const r = Math.hypot(p[0] - o.cx, p[1] - o.cy);
          expect(r).toBeLessThan(o.radio - GROSOR_CEMENTO);
          expect(r).toBeGreaterThan(o.havers - 1e-9);
        }
        expect(distanciaASegmento(p, VOLKMANN_FRENTE[0], VOLKMANN_FRENTE[1])).toBeGreaterThan(
          0.025,
        );
      }
    }
  });

  it('el conducto de Volkmann une los conductos de Havers de dos osteonas', () => {
    const centros = OSTEONAS.map((o) => `${o.cx},${o.cy}`);
    for (const extremo of VOLKMANN_FRENTE) expect(centros).toContain(`${extremo[0]},${extremo[1]}`);
  });

  it('las laminillas intersticiales quedan entre las osteonas, sin entrar en ninguna', () => {
    const arcos = arcosIntersticiales();
    expect(arcos.length).toBeGreaterThan(10);
    for (const a of arcos) for (const p of a.puntos) expect(enIntersticial(p)).toBe(true);
  });
});

describe('modelo', () => {
  const modelo = crearOsteona();

  it('tiene una pieza con nombre por cada región del catálogo, con materiales propios', () => {
    expect([...REGIONES_OSTEONA].sort()).toEqual(CATALOGO_NODOS.osteona.map((n) => n.id).sort());
    const vistos = new Map<Material, string>();
    for (const m of mallas(modelo)) {
      let o: Object3D | null = m;
      while (o && !REGIONES_OSTEONA.includes(o.name as never) && o !== modelo) o = o.parent;
      const id = o && o !== modelo ? o.name : `contexto:${m.name}`;
      const mat = m.material as Material;
      expect(vistos.get(mat) ?? id, `material compartido entre ${vistos.get(mat)} y ${id}`).toBe(
        id,
      );
      vistos.set(mat, id);
    }
    for (const id of REGIONES_OSTEONA) {
      const r = modelo.getObjectByName(id);
      expect(r, id).toBeDefined();
      expect(mallas(r!).length, id).toBeGreaterThan(0);
    }
  });

  it('cabe en el presupuesto del móvil: menos de 90 000 triángulos y de 28 llamadas de dibujo', () => {
    const lista = mallas(modelo);
    expect(lista.length).toBeLessThan(28);
    expect(lista.reduce((t, m) => t + triangulos(m), 0)).toBeLessThan(90_000);
  });

  it('el punto de cada etiqueta cae dentro del bloque y su normal mira a la cámara', () => {
    const caja = new Box3().setFromObject(modelo).expandByScalar(1e-3);
    for (const id of REGIONES_OSTEONA) {
      const { punto, radio, normal } = puntoDeRegion(id);
      expect(caja.containsPoint(new Vector3(...punto)), id).toBe(true);
      expect(new Vector3(...normal).dot(HACIA_CAMARA), id).toBeGreaterThan(0.5);
      expect(radio, id).toBeGreaterThan(0);
    }
  });
});

describe('carga en la exploración', () => {
  it('se construye sin descarga, queda normalizado y ubica cada región', async () => {
    const modelo = montarModeloPorCodigo('osteona');
    await modelo.cargar();
    expect(modelo.estado.value).toBe('listo');
    const caja = modelo.caja.value!;
    const radio =
      Math.hypot(caja.max[0] - caja.min[0], caja.max[1] - caja.min[1], caja.max[2] - caja.min[2]) /
      2;
    expect(radio).toBeLessThan(1.1);
    for (const id of REGIONES_OSTEONA) {
      expect(modelo.ubicar({ id, camara: { vista: 'frontal' } }), id).not.toBeNull();
    }
    expect(modelo.ubicar({ id: 'periostio', camara: { vista: 'frontal' } })).toBeNull();
  });
});

describe('contenido', () => {
  it('admite los nodos del catálogo, en modo identificar con pista, y rechaza los de otro modelo', () => {
    const base = {
      modelo: 'osteona',
      modo: 'identificar',
      alt: 'Bloque de hueso cortical con sus osteonas.',
      nodos: [
        {
          id: 'conducto_de_havers',
          etiqueta: 'Conducto de Havers',
          descripcion: 'Canal en el centro de la osteona.',
          pista: 'Busca el canal del centro de las laminillas.',
        },
        {
          id: 'canaliculos',
          etiqueta: 'Canalículos',
          descripcion: 'Canales finos que salen de cada laguna.',
        },
      ],
      requeridos: ['conducto_de_havers'],
    };
    expect(ConfigExploracion3dSchema.safeParse(base).success).toBe(true);
    expect(
      ConfigExploracion3dSchema.safeParse({
        ...base,
        nodos: [
          ...base.nodos,
          { id: 'osteoide', etiqueta: 'Osteoide', descripcion: 'De otro modelo.' },
        ],
      }).success,
    ).toBe(false);
  });
});
