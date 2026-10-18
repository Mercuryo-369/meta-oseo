import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { Box3, Raycaster, Vector3 } from 'three';
import type { BufferGeometry, Material, Mesh, Object3D } from 'three';
import { CATALOGO_NODOS } from '@/content/nodos3d';
import { ConfigExploracion3dSchema } from '@/content/schema';
import { useModeloExploracion } from '../useModeloExploracion';
import type { ModeloExploracion } from '../useModeloExploracion';
import {
  ANCHO_MARCA,
  FONDO,
  GROSOR_FRENTE,
  GROSOR_OSTEOIDE,
  LAGUNAS,
  MEDIO_ANCHO,
  MUESTRAS_X,
  NOMBRE_MODELO,
  RADIO_CANALICULO,
  REGIONES_FRENTE,
  SEPARACION_MARCAS,
  Y_BASE,
  altoOsteoblasto,
  canaliculos,
  cortesOsteoblastos,
  crearFrenteMineralizacion,
  dentroDeLaguna,
  esRegionFrente,
  nodulosFrente,
  osteoblastos,
  puntoDeRegion,
  vesiculasMatriz,
  yFrente,
  yMarca,
} from './modeloFrenteMineralizacion';
import type { RegionFrente } from './modeloFrenteMineralizacion';

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

/** Región (grupo con id del catálogo) a la que pertenece un objeto del modelo. */
function regionDe(o: Object3D | null): string | null {
  for (let x = o; x; x = x.parent) if (esRegionFrente(x.name)) return x.name;
  return null;
}

describe('capas del bloque, de la superficie al interior', () => {
  it('la costura de osteoide mide unas 10 µm y el frente es una interfase de algo más de 1 µm', () => {
    const grosores = MUESTRAS_X.map((x) => -yFrente(x));
    const medio = grosores.reduce((s, g) => s + g, 0) / grosores.length;
    expect(medio).toBeCloseTo(GROSOR_OSTEOIDE, 0);
    for (const g of grosores) {
      expect(g).toBeGreaterThan(9);
      expect(g).toBeLessThan(11);
    }
    expect(GROSOR_FRENTE).toBeGreaterThanOrEqual(1);
    expect(GROSOR_FRENTE).toBeLessThanOrEqual(2);
  });

  it('las marcas de tetraciclina son dos líneas paralelas separadas 8 µm, dentro del hueso mineralizado', () => {
    for (const x of MUESTRAS_X) {
      expect(yMarca(0, x) - yMarca(1, x)).toBeCloseTo(SEPARACION_MARCAS, 9);
      // La reciente, bajo la interfase del frente; la anterior, más al interior; ninguna toca una laguna.
      expect(yMarca(0, x) + ANCHO_MARCA / 2).toBeLessThan(yFrente(x) - GROSOR_FRENTE);
      for (const i of [0, 1] as const) {
        for (const dy of [-ANCHO_MARCA / 2, ANCHO_MARCA / 2]) {
          for (const l of LAGUNAS) expect(dentroDeLaguna(l, [x, yMarca(i, x) + dy], 1)).toBe(false);
        }
      }
    }
    expect(SEPARACION_MARCAS).toBe(8);
  });

  it('los osteocitos están en sus lagunas, dentro del hueso mineralizado y lejos del frente', () => {
    for (const l of LAGUNAS) {
      const [x, y] = l.centro;
      const extension = Math.max(l.a, l.b);
      expect(x - extension).toBeGreaterThan(-MEDIO_ANCHO);
      expect(x + extension).toBeLessThan(MEDIO_ANCHO);
      expect(y - extension).toBeGreaterThan(Y_BASE);
      expect(y + l.b + Math.abs(Math.sin(l.giro)) * l.a).toBeLessThan(
        yMarca(1, x) - ANCHO_MARCA / 2,
      );
      // Lagunas alargadas, más largas que anchas (de unas 10 a 15 µm de largo).
      expect(l.a / l.b).toBeGreaterThan(1.8);
      expect(2 * l.a).toBeGreaterThanOrEqual(10);
      expect(2 * l.a).toBeLessThanOrEqual(16);
    }
  });

  it('los canalículos son finos y salen de las lagunas hacia el frente, la superficie y la otra laguna', () => {
    expect(2 * RADIO_CANALICULO).toBeLessThanOrEqual(0.5);
    const recorridos = canaliculos();
    expect(recorridos.length).toBeGreaterThanOrEqual(8);
    // Alguno llega al frente o a la superficie (la base de los osteoblastos).
    const finales = recorridos.map((r) => r.at(-1)!);
    expect(finales.some((p) => p.y >= -0.01)).toBe(true);
    expect(finales.some((p) => Math.abs(p.y - (yFrente(p.x) - 0.6)) < 0.01)).toBe(true);
    for (const r of recorridos) {
      for (const p of r) {
        expect(Math.abs(p.x)).toBeLessThan(MEDIO_ANCHO);
        expect(p.y).toBeGreaterThan(Y_BASE);
        expect(p.y).toBeLessThanOrEqual(0.01);
      }
    }
  });

  it('las vesículas de matriz son diminutas (0,12 a 0,22 µm) y están en el osteoide', () => {
    const vesiculas = vesiculasMatriz();
    expect(vesiculas.length).toBeGreaterThan(100);
    for (const { centro, radio } of vesiculas) {
      expect(2 * radio).toBeGreaterThanOrEqual(0.12);
      expect(2 * radio).toBeLessThanOrEqual(0.22);
      const [x, y] = centro;
      expect(y - radio).toBeGreaterThan(yFrente(x));
      expect(y + radio).toBeLessThan(0);
    }
    // Más abundantes en la mitad del osteoide cercana al frente.
    const cerca = vesiculas.filter(({ centro: [x, y] }) => y < yFrente(x) / 2).length;
    expect(cerca / vesiculas.length).toBeGreaterThan(0.6);
  });

  it('el frente es granular: nódulos de mineral de 0,5 a 1,2 µm a ambos lados del límite', () => {
    const nodulos = nodulosFrente();
    expect(nodulos.length).toBeGreaterThan(60);
    let encima = 0;
    for (const { centro, radio } of nodulos) {
      expect(2 * radio).toBeGreaterThanOrEqual(0.5);
      expect(2 * radio).toBeLessThanOrEqual(1.2);
      const d = centro[1] - yFrente(centro[0]);
      expect(Math.abs(d + 0.5)).toBeLessThanOrEqual(0.71);
      if (d > 0) encima++;
    }
    expect(encima).toBeGreaterThan(0);
  });
});

describe('osteoblastos', () => {
  const celulas = osteoblastos();

  it('forman una hilera continua de células poligonales que cubren la superficie del bloque', () => {
    expect(celulas.length).toBeGreaterThanOrEqual(10);
    const areaBloque = 2 * MEDIO_ANCHO * FONDO;
    let area = 0;
    for (const c of celulas) {
      expect(c.contorno.length).toBeGreaterThanOrEqual(3);
      let s = 0;
      c.contorno.forEach(([x0, z0], i) => {
        const [x1, z1] = c.contorno[(i + 1) % c.contorno.length]!;
        s += x0 * z1 - x1 * z0;
      });
      area += Math.abs(s) / 2;
    }
    // Solo quedan los pequeños espacios entre células vecinas.
    expect(area / areaBloque).toBeGreaterThan(0.93);
    expect(area / areaBloque).toBeLessThan(1);
    // Las células enteras (no recortadas por el borde del bloque) son polígonos de 5 a 8 lados, no cajas.
    const enteras = celulas.filter((c) =>
      c.contorno.every(
        ([x, z]) => Math.abs(Math.abs(x) - MEDIO_ANCHO) > 1e-6 && z < -1e-6 && z > -FONDO + 1e-6,
      ),
    );
    expect(enteras.length).toBeGreaterThanOrEqual(2);
    for (const c of enteras) {
      expect(c.contorno.length).toBeGreaterThanOrEqual(5);
      expect(c.contorno.length).toBeLessThanOrEqual(8);
    }
  });

  it('son voluminosas, de 15 a 18 µm de alto, con el polo libre abombado', () => {
    for (const c of celulas) {
      expect(c.alto).toBeGreaterThanOrEqual(15);
      expect(c.alto).toBeLessThanOrEqual(18);
      const centro = altoOsteoblasto(c, c.sitio);
      expect(centro).toBeCloseTo(c.alto, 1);
      // En el borde de contacto con sus vecinas (no en los bordes del bloque, donde están cortadas), bastante más
      // bajas que en el centro.
      const enBorde = ([x, z]: [number, number]) =>
        Math.abs(Math.abs(x) - MEDIO_ANCHO) < 1e-6 ||
        Math.abs(z) < 1e-6 ||
        Math.abs(z + FONDO) < 1e-6;
      for (const p of c.contorno.filter((q) => !enBorde(q))) {
        expect(altoOsteoblasto(c, p)).toBeLessThan(0.95 * centro);
      }
    }
  });

  it('en la fila cortada se ve el núcleo excéntrico, en el polo alejado del hueso, y el Golgi bajo él', () => {
    const cortes = cortesOsteoblastos();
    expect(cortes.length).toBeGreaterThanOrEqual(4);
    for (const { x0, x1, nucleo, golgi } of cortes) {
      expect(nucleo.x - nucleo.rx).toBeGreaterThan(x0);
      expect(nucleo.x + nucleo.rx).toBeLessThan(x1);
      const celula = celulas.find(
        (c) =>
          c.contorno.some(([x, z]) => Math.abs(z) < 1e-6 && Math.abs(x - x0) < 1e-6) &&
          c.contorno.some(([x, z]) => Math.abs(z) < 1e-6 && Math.abs(x - x1) < 1e-6),
      )!;
      const alto = altoOsteoblasto(celula, [nucleo.x, 0]);
      expect(nucleo.y + nucleo.ry).toBeLessThan(alto);
      // Excéntrico: el centro del núcleo, en la mitad de la célula alejada del osteoide.
      expect(nucleo.y).toBeGreaterThan(alto / 2);
      expect(golgi.y + golgi.ry).toBeLessThan(nucleo.y - nucleo.ry);
      expect(golgi.y - golgi.ry).toBeGreaterThan(0);
    }
  });
});

describe('modelo', () => {
  const bloque = crearFrenteMineralizacion();
  bloque.updateMatrixWorld(true);

  it('tiene una pieza con nombre por cada región del catálogo, con materiales propios', () => {
    expect(bloque.name).toBe(NOMBRE_MODELO);
    expect(esRegionFrente(bloque.name)).toBe(false);
    expect([...REGIONES_FRENTE].sort()).toEqual(
      CATALOGO_NODOS.frente_mineralizacion.map((n) => n.id).sort(),
    );
    const vistos = new Map<Material, string>();
    for (const id of REGIONES_FRENTE) {
      const region = bloque.getObjectByName(id);
      expect(region, id).toBeDefined();
      expect(region!.parent, id).toBe(bloque);
      const suyas = mallas(region!);
      expect(suyas.length, id).toBeGreaterThan(0);
      for (const m of suyas) {
        // Ninguna malla se llama como una región: la exploración busca las regiones por nombre.
        expect(esRegionFrente(m.name), m.name).toBe(false);
        const mat = m.material as Material;
        expect(vistos.get(mat) ?? id, `material compartido entre ${vistos.get(mat)} y ${id}`).toBe(
          id,
        );
        vistos.set(mat, id);
      }
    }
  });

  it('es un bloque de 64 × 24 µm de base, con la cara de corte en z = 0 y casi nada por delante', () => {
    const caja = new Box3().setFromObject(bloque);
    expect(caja.min.x).toBeCloseTo(-MEDIO_ANCHO, 0);
    expect(caja.max.x).toBeCloseTo(MEDIO_ANCHO, 0);
    expect(caja.min.y).toBeCloseTo(Y_BASE, 3);
    expect(caja.min.z).toBeCloseTo(-FONDO, 0);
    // Por delante de la cara solo asoman medio tubo de los canalículos y las prolongaciones y algo de las vesículas
    // y de los nódulos del frente (menos de 0,4 µm).
    expect(caja.max.z).toBeGreaterThanOrEqual(0);
    expect(caja.max.z).toBeLessThan(0.4);
    // Los osteoblastos quedan sobre el osteoide (y ≥ 0) y no pasan de 18 µm.
    const celulas = new Box3().setFromObject(bloque.getObjectByName('osteoblastos')!);
    expect(celulas.min.y).toBeGreaterThanOrEqual(-1e-6);
    expect(celulas.max.y).toBeLessThanOrEqual(18 + 1e-6);
  });

  it('las caras de corte planas miran a la cámara (+Z), no hacia dentro del bloque', () => {
    let vistos = 0;
    for (const m of mallas(bloque)) {
      // Sin tubos ni esferas: sus vértices de la cara miran a todos lados.
      if (/vesiculas|nodulos|canaliculos|laguna|cuerpo/.test(m.name)) continue;
      const pos = m.geometry.getAttribute('position');
      const nor = m.geometry.getAttribute('normal');
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getZ(i)) > 0.1 || Math.abs(nor.getZ(i)) < 0.9) continue;
        expect(nor.getZ(i), m.name).toBeGreaterThan(0.99);
        vistos++;
      }
    }
    expect(vistos).toBeGreaterThan(500);
  });

  it('los osteoblastos tienen las normales hacia fuera', () => {
    const m = bloque.getObjectByName('osteoblastos_celulas') as Mesh;
    const pos = m.geometry.getAttribute('position');
    const nor = m.geometry.getAttribute('normal');
    let arriba = 0;
    let total = 0;
    for (let i = 0; i < pos.count; i++) {
      // Los vértices de la base solo están en los lados (verticales); los del polo libre miran hacia arriba.
      if (pos.getY(i) < 1e-6) continue;
      if (Math.abs(nor.getY(i)) < 0.2) continue;
      total++;
      if (nor.getY(i) > 0) arriba++;
    }
    expect(arriba / total).toBeGreaterThan(0.99);
  });

  it('cabe en el presupuesto del móvil: menos de 60 000 triángulos y de 20 llamadas de dibujo', () => {
    const lista = mallas(bloque);
    expect(lista.length).toBeLessThan(20);
    expect(lista.reduce((t, m) => t + triangulos(m.geometry), 0)).toBeLessThan(60_000);
  });

  it('el punto de cada etiqueta cae sobre su región, en la cara de corte', () => {
    const caja = new Box3().setFromObject(bloque);
    const rayo = new Raycaster();
    for (const id of REGIONES_FRENTE) {
      const { punto, radio, normal } = puntoDeRegion(id);
      expect(caja.containsPoint(new Vector3(...punto)), id).toBe(true);
      expect(punto[2], id).toBeGreaterThanOrEqual(0);
      expect(normal).toEqual([0, 0, 1]);
      expect(radio, id).toBeGreaterThan(0);
      // Lo primero que se ve desde delante en ese punto es la propia región.
      rayo.set(new Vector3(punto[0], punto[1], 5), new Vector3(0, 0, -1));
      const [primero] = rayo.intersectObject(bloque, true);
      expect(regionDe(primero?.object ?? null), id).toBe(id);
    }
  });

  it('las etiquetas quedan separadas entre sí (al menos 9 µm en la vista frontal)', () => {
    const puntos = REGIONES_FRENTE.map((id) => [id, puntoDeRegion(id).punto] as const);
    for (const [i, [a, pa]] of puntos.entries()) {
      for (const [b, pb] of puntos.slice(i + 1)) {
        expect(Math.hypot(pa[0] - pb[0], pa[1] - pb[1]), `${a} y ${b}`).toBeGreaterThanOrEqual(9);
      }
    }
  });
});

describe('carga en la exploración', () => {
  function montar(): ModeloExploracion {
    let modelo: ModeloExploracion | null = null;
    mount(
      defineComponent({
        setup() {
          modelo = useModeloExploracion({
            modelo: 'frente_mineralizacion',
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
    for (const id of REGIONES_FRENTE) {
      const u = modelo.ubicar({ id, camara: { vista: 'frontal' } });
      expect(u, id).not.toBeNull();
      expect(u!.normal).toEqual([0, 0, 1]);
    }
    expect(modelo.ubicar({ id: 'epifisis', camara: { vista: 'frontal' } })).toBeNull();
  });
});

describe('contenido', () => {
  const base = {
    modelo: 'frente_mineralizacion',
    alt: 'Bloque de una superficie ósea en formación, cortado.',
    nodos: [
      {
        id: 'osteoide',
        etiqueta: 'Osteoide',
        descripcion: 'Matriz recién secretada, sin mineral.',
      },
      {
        id: 'osteocito',
        etiqueta: 'Osteocito',
        descripcion: 'Osteoblasto incluido en la matriz, en su laguna.',
      },
    ],
    requeridos: ['osteoide'] satisfies RegionFrente[],
  };

  it('admite los nodos del catálogo y rechaza los demás y el ancla', () => {
    expect(ConfigExploracion3dSchema.safeParse(base).success).toBe(true);
    expect(
      ConfigExploracion3dSchema.safeParse({
        ...base,
        nodos: [
          ...base.nodos,
          { id: 'epifisis', etiqueta: 'Epífisis', descripcion: 'No es de este modelo.' },
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
