import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { Box3, Vector3 } from 'three';
import type { BufferGeometry, Material, Mesh, MeshPhysicalMaterial, Object3D } from 'three';
import { CATALOGO_NODOS } from '@/content/nodos3d';
import { contornoCuenco, dentroDePoligono } from '../histologia/piezas';
import { useModeloExploracion } from '../useModeloExploracion';
import type { ModeloExploracion } from '../useModeloExploracion';
import {
  CENTRO_CELULA,
  LAGUNA,
  LAGUNAS_VECINAS,
  PROFUNDIDAD,
  REGIONES_RED,
  R_CANALICULO,
  R_CONDUCTO,
  SEMIEJES_CELULA,
  UNIONES,
  X_MAX,
  X_MIN,
  Y_CONDUCTO,
  Y_FIN_ABAJO,
  Y_FIN_ARRIBA,
  Y_SUPERFICIE,
  Z_FLECHAS,
  celulasSuperficie,
  crearRedLacunoCanalicular,
  procesosCentrales,
  procesosEnCanaliculo,
  procesosVecinos,
  puntoDeRegion,
  yCapilar,
} from './modeloRedLacunoCanalicular';

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

describe('disposición de la red', () => {
  it('la célula cabe en su laguna, que es algo mayor, y deja hueco para el cilio a la derecha', () => {
    const [a, b] = LAGUNA.semiejes;
    expect(SEMIEJES_CELULA[0]).toBeLessThan(a);
    expect(SEMIEJES_CELULA[1]).toBeLessThan(b);
    const huecoDerecha = LAGUNA.centro[0] + a - (CENTRO_CELULA[0] + SEMIEJES_CELULA[0]);
    expect(huecoDerecha).toBeGreaterThan(0.2);
    // Alargada a lo largo de las láminas (paralelas al conducto de Havers, que va a lo largo de X).
    expect(a / b).toBeGreaterThan(1.8);
  });

  it('los canalículos son más densos hacia el conducto y hacia la superficie que hacia los lados', () => {
    const finales = procesosCentrales().map((p) => p.puntos.at(-1)!);
    const alConducto = finales.filter((f) => f[1] === Y_FIN_ABAJO).length;
    const aLaSuperficie = finales.filter((f) => f[1] === Y_FIN_ARRIBA).length;
    expect(alConducto).toBeGreaterThanOrEqual(5);
    expect(aLaSuperficie).toBeGreaterThanOrEqual(4);
    expect(finales.length - alConducto - aLaSuperficie).toBe(2);
  });

  it('cada proceso hacia un vecino termina en su unión comunicante, enfrente del proceso del vecino', () => {
    const centrales = procesosCentrales().map((p) => p.puntos.at(-1)!);
    const vecinos = procesosVecinos().map((p) => p.puntos.at(-1)!);
    for (const u of UNIONES) {
      const cerca = (f: number[]) => Math.hypot(f[0]! - u[0], f[1]! - u[1]) < 0.03;
      expect(centrales.some(cerca)).toBe(true);
      expect(vecinos.some(cerca)).toBe(true);
    }
  });

  it('los canalículos llegan a la superficie y al conducto sin salirse del bloque', () => {
    expect(Y_FIN_ARRIBA).toBeLessThan(Y_SUPERFICIE);
    expect(Y_FIN_ABAJO).toBeLessThan(Y_CONDUCTO + R_CONDUCTO);
    for (const p of procesosEnCanaliculo()) {
      for (const [x, y] of p.puntos) {
        expect(x).toBeGreaterThan(X_MIN);
        expect(x).toBeLessThan(X_MAX);
        expect(y).toBeLessThanOrEqual(Y_SUPERFICIE);
        expect(y).toBeGreaterThan(Y_CONDUCTO);
      }
    }
  });

  it('las lagunas vecinas no tocan a la central ni a los bordes del bloque', () => {
    const central = contornoCuenco(LAGUNA);
    for (const l of LAGUNAS_VECINAS) {
      for (const [x, y] of contornoCuenco(l)) {
        expect(dentroDePoligono([x, y], central)).toBe(false);
        expect(x).toBeGreaterThan(X_MIN + 0.05);
        expect(x).toBeLessThan(X_MAX - 0.05);
        expect(y).toBeGreaterThan(Y_CONDUCTO + R_CONDUCTO + 0.05);
      }
    }
  });

  it('en la superficie hay células de revestimiento planas y osteoblastos de superficie cúbicos', () => {
    const celulas = celulasSuperficie();
    const planas = celulas.filter((c) => !c.osteoblasto);
    const cubicas = celulas.filter((c) => c.osteoblasto);
    expect(planas.length).toBeGreaterThanOrEqual(3);
    expect(cubicas.length).toBeGreaterThanOrEqual(3);
    for (const c of planas) expect(c.semiejes[0] / c.semiejes[1]).toBeGreaterThan(8);
    for (const c of cubicas) expect(c.semiejes[0] / c.semiejes[1]).toBeLessThan(1.5);
  });
});

describe('modelo', () => {
  const modelo = crearRedLacunoCanalicular();

  it('tiene una pieza con nombre por cada región del catálogo, con materiales propios', () => {
    expect([...REGIONES_RED].sort()).toEqual(
      CATALOGO_NODOS.red_lacuno_canalicular.map((n) => n.id).sort(),
    );
    expect(REGIONES_RED.length).toBeLessThanOrEqual(12);
    const vistos = new Map<Material, string>();
    for (const m of mallas(modelo)) {
      let region: Object3D | null = m;
      while (region && region.parent !== modelo) region = region.parent;
      const id = region!.name;
      const mat = m.material as Material;
      expect(vistos.get(mat) ?? id, `material compartido entre ${vistos.get(mat)} y ${id}`).toBe(
        id,
      );
      vistos.set(mat, id);
    }
    for (const id of REGIONES_RED) {
      const region = modelo.getObjectByName(id);
      expect(region, id).toBeDefined();
      expect(mallas(region!).length, id).toBeGreaterThan(0);
    }
  });

  it('el canalículo es líquido translúcido y deja ver el proceso, las fibras y los mensajeros', () => {
    const m = (modelo.getObjectByName('canaliculos_liquido') as Mesh)
      .material as MeshPhysicalMaterial;
    expect(m.transparent).toBe(true);
    expect(m.opacity).toBeLessThan(0.5);
    expect(m.depthWrite).toBe(false);
    const pos = (modelo.getObjectByName('pge2') as Mesh).geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      expect(pos.getZ(i)).toBeLessThan(R_CANALICULO);
    }
  });

  it('la matriz no pasa de la cara de corte; por delante solo quedan las partes blandas y las flechas', () => {
    for (const nombre of [
      'matriz_corte',
      'matriz_bloque',
      'lagunas',
      'conducto_pared',
      'capilar_pared',
    ]) {
      const pos = (modelo.getObjectByName(nombre) as Mesh).geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        expect(pos.getZ(i), nombre).toBeLessThanOrEqual(1e-6);
        expect(pos.getZ(i), nombre).toBeGreaterThanOrEqual(-PROFUNDIDAD - 1e-6);
      }
    }
    const caja = new Box3().setFromObject(modelo);
    expect(caja.max.z).toBeLessThan(Z_FLECHAS + 0.06);
  });

  it('las lagunas y el conducto son huecos: sus caras miran a la abertura', () => {
    for (const nombre of ['lagunas', 'conducto_pared']) {
      const g = (modelo.getObjectByName(nombre) as Mesh).geometry;
      const pos = g.getAttribute('position');
      const nor = g.getAttribute('normal');
      let hacia = 0;
      for (let i = 0; i < pos.count; i++) if (nor.getZ(i) > -1e-6) hacia++;
      expect(hacia / pos.count, nombre).toBeGreaterThan(0.95);
    }
  });

  it('los eritrocitos van dentro de la luz del capilar, y el capilar dentro del conducto', () => {
    const eritrocitos = new Box3().setFromObject(modelo.getObjectByName('eritrocitos')!);
    const capilar = new Box3().setFromObject(modelo.getObjectByName('capilar_pared')!);
    const conducto = new Box3().setFromObject(modelo.getObjectByName('conducto_pared')!);
    expect(capilar.containsBox(eritrocitos)).toBe(true);
    expect(conducto.containsBox(capilar)).toBe(true);
    expect(eritrocitos.max.z).toBeLessThanOrEqual(0);
    expect(Math.abs(yCapilar(0) - Y_CONDUCTO)).toBeLessThan(R_CONDUCTO);
  });

  it('cabe en el presupuesto del móvil: menos de 60 000 triángulos y de 40 llamadas de dibujo', () => {
    const lista = mallas(modelo);
    expect(lista.length).toBeLessThan(40);
    expect(lista.reduce((t, m) => t + triangulos(m.geometry), 0)).toBeLessThan(60_000);
  });

  it('el punto de cada etiqueta cae dentro del modelo y mira a la cámara', () => {
    const caja = new Box3().setFromObject(modelo);
    for (const id of REGIONES_RED) {
      const { punto, radio, normal } = puntoDeRegion(id);
      expect(caja.containsPoint(new Vector3(...punto)), id).toBe(true);
      expect(normal).toEqual([0, 0, 1]);
      expect(radio, id).toBeGreaterThan(0);
    }
    // La etiqueta de la laguna va al hueco, fuera del cuerpo de la célula.
    const [x, y] = puntoDeRegion('laguna_osteocitica').punto;
    const [cx, cy] = CENTRO_CELULA;
    const [a, b] = SEMIEJES_CELULA;
    expect(((x - cx) / a) ** 2 + ((y - cy) / b) ** 2).toBeGreaterThan(1);
    expect(dentroDePoligono([x, y], contornoCuenco(LAGUNA))).toBe(true);
  });
});

describe('carga en la exploración', () => {
  function montar(): ModeloExploracion {
    let modelo: ModeloExploracion | null = null;
    mount(
      defineComponent({
        setup() {
          modelo = useModeloExploracion({
            modelo: 'red_lacuno_canalicular',
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
    const caja = modelo.caja.value!;
    const radio =
      Math.hypot(caja.max[0] - caja.min[0], caja.max[1] - caja.min[1], caja.max[2] - caja.min[2]) /
      2;
    expect(radio).toBeLessThan(1.1);
    for (const id of REGIONES_RED) {
      const u = modelo.ubicar({ id, camara: { vista: 'frontal' } });
      expect(u, id).not.toBeNull();
    }
    expect(modelo.ubicar({ id: 'osteoide', camara: { vista: 'frontal' } })).toBeNull();
  });
});
