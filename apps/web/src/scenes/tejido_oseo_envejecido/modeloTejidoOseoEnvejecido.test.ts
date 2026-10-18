import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { Box3, Vector3 } from 'three';
import type { BufferGeometry, Material, Mesh, Object3D } from 'three';
import { CATALOGO_NODOS } from '@/content/nodos3d';
import { useModeloExploracion } from '../useModeloExploracion';
import type { ModeloExploracion } from '../useModeloExploracion';
import {
  ADIPOCITOS,
  CANALICULOS,
  CENTRO_LUPA,
  CENTRO_OSTEONA,
  FISURA,
  LAGUNAS_MINERALIZADAS,
  LAGUNAS_VACIAS,
  OSTEOCITOS_SENESCENTES,
  OSTEOCITOS_VIABLES,
  REGIONES_TEJIDO_ENVEJECIDO,
  R_LUPA,
  R_OSTEONA,
  X_BLOQUE,
  Y_BLOQUE,
  crearTejidoOseoEnvejecido,
  esRegionTejidoEnvejecido,
  puntoDeRegion,
  yEndostio,
} from './modeloTejidoOseoEnvejecido';

function mallas(raiz: Object3D): Mesh[] {
  const lista: Mesh[] = [];
  raiz.traverse((o) => {
    if ((o as Mesh).isMesh) lista.push(o as Mesh);
  });
  return lista;
}

const triangulos = (g: BufferGeometry): number =>
  (g.index ? g.index.count : g.getAttribute('position').count) / 3;

const distancia = (x: number, y: number, c: readonly [number, number]): number =>
  Math.hypot(x - c[0], y - c[1]);

describe('histología del hueso envejecido', () => {
  it('las lagunas quedan en la cortical (sobre el endostio) y con su eje tangente a las laminillas de la osteona', () => {
    const todas = [
      ...OSTEOCITOS_VIABLES,
      ...OSTEOCITOS_SENESCENTES,
      ...LAGUNAS_VACIAS,
      ...LAGUNAS_MINERALIZADAS,
    ];
    for (const l of todas) {
      expect(Math.abs(l.x)).toBeLessThan(X_BLOQUE);
      expect(l.y).toBeLessThan(Y_BLOQUE);
      expect(l.y, `laguna en (${l.x}, ${l.y})`).toBeGreaterThan(yEndostio(l.x) + 0.05);
      const d = distancia(l.x, l.y, CENTRO_OSTEONA);
      if (d < R_OSTEONA) {
        // Laminillas concéntricas: el eje largo de la laguna es perpendicular al radio.
        const radial = Math.atan2(l.y - CENTRO_OSTEONA[1], l.x - CENTRO_OSTEONA[0]);
        expect(Math.abs(Math.cos(l.angulo - radial))).toBeLessThan(1e-9);
      }
    }
    // Los osteocitos viables son escasos frente a los senescentes, vacíos y mineralizados juntos.
    expect(OSTEOCITOS_VIABLES.length).toBeLessThan(
      OSTEOCITOS_SENESCENTES.length + LAGUNAS_VACIAS.length + LAGUNAS_MINERALIZADAS.length,
    );
  });

  it('la red canalicular es escasa: a lo sumo cuatro tramos por osteocito con célula', () => {
    expect(CANALICULOS.length).toBeLessThanOrEqual(
      4 * (OSTEOCITOS_VIABLES.length + OSTEOCITOS_SENESCENTES.length),
    );
    for (const c of CANALICULOS) {
      const largo = c
        .slice(1)
        .reduce((s, p, i) => s + Math.hypot(p[0] - c[i]![0], p[1] - c[i]![1]), 0);
      expect(largo).toBeLessThan(0.15);
    }
  });

  it('la microfisura está en el hueso intersticial y se detiene en la línea cementante', () => {
    const inicio = FISURA[0]!;
    const fin = FISURA.at(-1)!;
    expect(distancia(...inicio, CENTRO_OSTEONA)).toBeGreaterThan(R_OSTEONA + 0.2);
    for (const p of FISURA)
      expect(distancia(...p, CENTRO_OSTEONA)).toBeGreaterThanOrEqual(R_OSTEONA - 0.03);
    expect(distancia(...fin, CENTRO_OSTEONA)).toBeLessThan(R_OSTEONA + 0.02);
  });

  it('la médula está llena de adipocitos grandes que no se solapan ni invaden la cortical', () => {
    expect(ADIPOCITOS.length).toBeGreaterThanOrEqual(20);
    for (const [i, a] of ADIPOCITOS.entries()) {
      expect(a.r).toBeGreaterThan(0.1);
      expect(a.y + a.r).toBeLessThan(yEndostio(a.x));
      expect(a.y - a.r).toBeGreaterThan(-Y_BLOQUE);
      for (const b of ADIPOCITOS.slice(i + 1)) {
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
      }
    }
  });
});

describe('modelo', () => {
  const bloque = crearTejidoOseoEnvejecido();

  it('tiene una pieza con nombre por cada región del catálogo, con materiales propios', () => {
    expect([...REGIONES_TEJIDO_ENVEJECIDO].sort()).toEqual(
      CATALOGO_NODOS.tejido_oseo_envejecido.map((n) => n.id).sort(),
    );
    const vistos = new Map<Material, string>();
    for (const m of mallas(bloque)) {
      const mat = m.material as Material;
      expect(vistos.has(mat), `material compartido por ${m.name}`).toBe(false);
      vistos.set(mat, m.name);
    }
    for (const id of REGIONES_TEJIDO_ENVEJECIDO) {
      const region = bloque.getObjectByName(id);
      expect(region, id).toBeDefined();
      expect(mallas(region!).length, id).toBeGreaterThan(0);
    }
    expect(esRegionTejidoEnvejecido('microfisura')).toBe(true);
    expect(esRegionTejidoEnvejecido('osteona')).toBe(false);
  });

  it('las piezas planas de la cara de corte miran a la cámara (+Z)', () => {
    const planas = mallas(bloque).filter((m) => {
      const z = m.geometry.getAttribute('position');
      let [min, max] = [Infinity, -Infinity];
      for (let i = 0; i < z.count; i++)
        [min, max] = [Math.min(min, z.getZ(i)), Math.max(max, z.getZ(i))];
      return max - min < 1e-6;
    });
    expect(planas.length).toBeGreaterThan(5);
    for (const m of planas) {
      const n = m.geometry.getAttribute('normal');
      for (let i = 0; i < n.count; i++) expect(n.getZ(i), m.name).toBeGreaterThan(0.99);
    }
  });

  it('solo la lupa del colágeno sobresale de la cara de corte', () => {
    const lupa = new Set(mallas(bloque.getObjectByName('matriz_colageno_age')!));
    for (const m of mallas(bloque)) {
      const pos = m.geometry.getAttribute('position');
      const tope = lupa.has(m) ? CENTRO_LUPA[2] + 0.1 : 0.03;
      for (let i = 0; i < pos.count; i++) expect(pos.getZ(i), m.name).toBeLessThanOrEqual(tope);
    }
  });

  it('cabe en el presupuesto del móvil: menos de 40 000 triángulos y de 32 llamadas de dibujo', () => {
    const lista = mallas(bloque);
    expect(lista.length).toBeLessThan(32);
    expect(lista.reduce((t, m) => t + triangulos(m.geometry), 0)).toBeLessThan(40_000);
  });

  it('el punto de cada etiqueta cae dentro del modelo y delante de su región', () => {
    const caja = new Box3().setFromObject(bloque);
    for (const id of REGIONES_TEJIDO_ENVEJECIDO) {
      const { punto, radio, normal } = puntoDeRegion(id);
      expect(caja.containsPoint(new Vector3(...punto)), id).toBe(true);
      expect(radio, id).toBeGreaterThan(0);
      expect(normal).toEqual([0, 0, 1]);
      const region = new Box3().setFromObject(bloque.getObjectByName(id)!);
      region.expandByScalar(0.03);
      expect(region.containsPoint(new Vector3(...punto)), `${id} fuera de su región`).toBe(true);
    }
    // La lupa no tapa a las demás etiquetas: todas quedan fuera de su círculo salvo la suya.
    for (const id of REGIONES_TEJIDO_ENVEJECIDO.filter((x) => x !== 'matriz_colageno_age')) {
      const [x, y] = puntoDeRegion(id).punto;
      expect(Math.hypot(x - CENTRO_LUPA[0], y - CENTRO_LUPA[1]), id).toBeGreaterThan(R_LUPA);
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
            modelo: 'tejido_oseo_envejecido',
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
    expect(m.porcentaje.value).toBeNull();
    const caja = m.caja.value!;
    const radio =
      Math.hypot(caja.max[0] - caja.min[0], caja.max[1] - caja.min[1], caja.max[2] - caja.min[2]) /
      2;
    expect(radio).toBeLessThan(1.1);
    for (const id of REGIONES_TEJIDO_ENVEJECIDO) {
      const u = m.ubicar({ id, camara: { vista: 'frontal' } });
      expect(u, id).not.toBeNull();
      expect(u!.normal).toEqual([0, 0, 1]);
    }
    expect(m.ubicar({ id: 'condilo', camara: { vista: 'frontal' } })).toBeNull();
  });
});
