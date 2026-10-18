import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh, Material, Mesh, Object3D } from 'three';
import { CATALOGO_NODOS } from '@/content/nodos3d';
import { ConfigExploracion3dSchema } from '@/content/schema';
import { montarModeloPorCodigo } from '../utilesModeloPrueba';
import {
  CORTICAL_DIAFISIS,
  CORTICAL_EPIFISIS,
  ENDOSTIO,
  H_MEDULA,
  PERIOSTIO_TOTAL,
  REGIONES_HUESO_CAPAS,
  X_CARTILAGO,
  X_CAVIDAD,
  X_FIN,
  X_FIN_INTERIOR,
  X_IZQ,
  X_LINEA,
  GROSOR_TRABECULA,
  crearHuesoCapas,
  dentroDelTrabecular,
  espaciosMedulares,
  fraccionRoja,
  grosorCortical,
  puntoDeRegion,
  radioExterior,
  radioInterior,
  semialturaCavidad,
  xLinea,
} from './modeloHuesoCapas';
import { distanciaEntrePoligonos } from '../piezasPorCodigo';

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

describe('perfil del extremo del hueso largo', () => {
  it('es continuo; la cortical, gruesa en la diáfisis, se adelgaza hacia la epífisis', () => {
    let anterior = radioExterior(X_IZQ);
    for (let x = X_IZQ; x <= X_FIN - 0.03; x += 0.002) {
      const r = radioExterior(x);
      expect(Math.abs(r - anterior), `salto en x = ${x.toFixed(3)}`).toBeLessThan(0.02);
      expect(radioInterior(x)).toBeLessThan(r);
      expect(semialturaCavidad(x)).toBeLessThanOrEqual(radioInterior(x) + 1e-9);
      anterior = r;
    }
    expect(grosorCortical(-1)).toBe(CORTICAL_DIAFISIS);
    expect(grosorCortical(1)).toBe(CORTICAL_EPIFISIS);
    expect(CORTICAL_DIAFISIS).toBeGreaterThan(4 * CORTICAL_EPIFISIS);
    // La epífisis es mucho más ancha que la diáfisis y la punta se cierra.
    expect(radioExterior(0.7)).toBeGreaterThan(1.8 * radioExterior(-1));
    expect(radioExterior(X_FIN)).toBeCloseTo(0, 6);
    // La cavidad termina en la metáfisis, antes de la línea epifisaria y del cartílago.
    expect(X_CAVIDAD).toBeLessThan(X_LINEA);
    expect(semialturaCavidad(X_CAVIDAD + 0.01)).toBe(0);
    expect(X_LINEA).toBeLessThan(X_CARTILAGO);
    expect(X_FIN_INTERIOR).toBeLessThan(X_FIN);
  });

  it('la médula es amarilla en la cavidad de la diáfisis y roja entre las trabéculas', () => {
    expect(fraccionRoja(-1.2, 0)).toBeLessThan(0.05);
    expect(fraccionRoja(0.9, 0.2)).toBeGreaterThan(0.95);
  });

  it('los espacios medulares del hueso trabecular no se tocan, quedan dentro y fuera de la cavidad', () => {
    const espacios = espaciosMedulares();
    expect(espacios.length).toBeGreaterThan(80);
    for (const e of espacios) {
      for (const p of e.contorno) expect(dentroDelTrabecular(p), `${p}`).toBe(true);
    }
    for (let i = 0; i < espacios.length; i++) {
      for (let j = i + 1; j < espacios.length; j++) {
        const a = espacios[i]!;
        const b = espacios[j]!;
        if (Math.hypot(a.centro[0] - b.centro[0], a.centro[1] - b.centro[1]) > a.radio + b.radio + 0.1)
          continue;
        expect(distanciaEntrePoligonos(a.contorno, b.contorno)).toBeGreaterThanOrEqual(
          GROSOR_TRABECULA * 0.79,
        );
      }
    }
    // Ninguno en la cavidad de la diáfisis; la mayoría en la epífisis y más pequeños bajo la articulación.
    expect(espacios.filter((e) => e.centro[0] < X_CAVIDAD - 0.3)).toHaveLength(0);
    const epifisis = espacios.filter((e) => e.centro[0] > X_LINEA);
    expect(epifisis.length).toBeGreaterThan(espacios.length / 3);
    const media = (l: typeof espacios) => l.reduce((s, e) => s + e.radio, 0) / l.length;
    expect(media(espacios.filter((e) => e.centro[0] > 1.1))).toBeLessThan(
      media(espacios.filter((e) => e.centro[0] < 0.3)),
    );
    // La línea epifisaria queda como una placa continua: ningún espacio la cruza.
    for (const e of espacios) {
      const lados = new Set(e.contorno.map(([x, y]) => Math.sign(x - xLinea(y))));
      expect(lados.size).toBe(1);
    }
  });
});

describe('modelo', () => {
  const modelo = crearHuesoCapas();

  it('tiene una pieza con nombre por cada región del catálogo, con materiales propios', () => {
    expect([...REGIONES_HUESO_CAPAS].sort()).toEqual(
      CATALOGO_NODOS.hueso_capas.map((n) => n.id).sort(),
    );
    const vistos = new Map<Material, string>();
    for (const m of mallas(modelo)) {
      let o: Object3D | null = m;
      while (o && !REGIONES_HUESO_CAPAS.includes(o.name as never) && o !== modelo) o = o.parent;
      const id = o && o !== modelo ? o.name : `contexto:${m.name}`;
      const mat = m.material as Material;
      expect(vistos.get(mat) ?? id, `material compartido entre ${vistos.get(mat)} y ${id}`).toBe(id);
      vistos.set(mat, id);
    }
    for (const id of REGIONES_HUESO_CAPAS) {
      const r = modelo.getObjectByName(id);
      expect(r, id).toBeDefined();
      expect(mallas(r!).length, id).toBeGreaterThan(0);
    }
  });

  it('es la mitad de atrás: nada sobresale de la cara de corte', () => {
    for (const m of mallas(modelo)) {
      const pos = m.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) expect(pos.getZ(i), m.name).toBeLessThanOrEqual(0.002);
    }
  });

  it('las capas de la cara de corte son planas y miran a la cámara', () => {
    for (const nombre of ['hueso_cortical_corte', 'endostio_capa', 'medula_osea_corte']) {
      const m = modelo.getObjectByName(nombre) as Mesh;
      const pos = m.geometry.getAttribute('position');
      const nor = m.geometry.getAttribute('normal');
      for (let i = 0; i < pos.count; i++) {
        // El corte transversal de la izquierda mira a −X.
        if (Math.abs(pos.getX(i) - X_IZQ) < 1e-6 && Math.abs(nor.getX(i) + 1) < 1e-3) continue;
        expect(nor.getZ(i), nombre).toBeGreaterThan(0.99);
      }
    }
  });

  it('el periostio no cubre la superficie articular (la cubre el cartílago)', () => {
    const p = modelo.getObjectByName('periostio')!;
    const caja = new Box3().setFromObject(p);
    expect(caja.max.x).toBeLessThanOrEqual(X_CARTILAGO + PERIOSTIO_TOTAL + 1e-3);
    const c = new Box3().setFromObject(modelo.getObjectByName('cartilago_articular')!);
    expect(c.min.x).toBeGreaterThanOrEqual(X_CARTILAGO - 1e-3);
    expect(c.max.x).toBeGreaterThan(X_FIN);
  });

  it('el endostio es una capa fina, mucho más que la cortical', () => {
    expect(ENDOSTIO).toBeLessThan(CORTICAL_DIAFISIS / 8);
  });

  it('cabe en el presupuesto del móvil: menos de 40 000 triángulos y de 16 llamadas de dibujo', () => {
    const lista = mallas(modelo);
    expect(lista.length).toBeLessThan(16);
    expect(lista.reduce((t, m) => t + triangulos(m), 0)).toBeLessThan(40_000);
  });

  it('el punto de cada etiqueta cae dentro del modelo, sobre la cara de corte', () => {
    const caja = new Box3().setFromObject(modelo);
    for (const id of REGIONES_HUESO_CAPAS) {
      const { punto, radio, normal } = puntoDeRegion(id);
      expect(caja.containsPoint(new Vector3(...punto)), id).toBe(true);
      expect(punto[2], id).toBeGreaterThanOrEqual(H_MEDULA);
      expect(normal).toEqual([0, 0, 1]);
      expect(radio, id).toBeGreaterThan(0);
    }
    // El endostio se rotula junto a la cortical, por dentro; la médula, en la cavidad.
    const e = puntoDeRegion('endostio').punto;
    expect(e[1]).toBeLessThan(radioInterior(e[0]));
    expect(e[1]).toBeGreaterThan(radioInterior(e[0]) - ENDOSTIO);
    const m = puntoDeRegion('medula_osea').punto;
    expect(Math.abs(m[1])).toBeLessThan(semialturaCavidad(m[0]));
  });
});

describe('carga en la exploración', () => {
  it('se construye sin descarga, queda normalizado y ubica cada región', async () => {
    const modelo = montarModeloPorCodigo('hueso_capas');
    await modelo.cargar();
    expect(modelo.estado.value).toBe('listo');
    const caja = modelo.caja.value!;
    const radio =
      Math.hypot(caja.max[0] - caja.min[0], caja.max[1] - caja.min[1], caja.max[2] - caja.min[2]) /
      2;
    expect(radio).toBeLessThan(1.1);
    for (const id of REGIONES_HUESO_CAPAS) {
      expect(modelo.ubicar({ id, camara: { vista: 'frontal' } }), id).not.toBeNull();
    }
    expect(modelo.ubicar({ id: 'diafisis', camara: { vista: 'frontal' } })).toBeNull();
  });
});

describe('contenido', () => {
  it('admite los nodos del catálogo y rechaza los de otro modelo', () => {
    const base = {
      modelo: 'hueso_capas',
      alt: 'Extremo de un hueso largo serrado a lo largo.',
      nodos: [
        { id: 'periostio', etiqueta: 'Periostio', descripcion: 'Membrana que cubre el hueso.' },
        { id: 'endostio', etiqueta: 'Endostio', descripcion: 'Capa fina que lo tapiza por dentro.' },
      ],
      requeridos: ['periostio'],
    };
    expect(ConfigExploracion3dSchema.safeParse(base).success).toBe(true);
    expect(
      ConfigExploracion3dSchema.safeParse({
        ...base,
        nodos: [...base.nodos, { id: 'diafisis', etiqueta: 'Diáfisis', descripcion: 'Del otro modelo.' }],
      }).success,
    ).toBe(false);
  });
});
