/**
 * Pruebas de las formas de la escena de la matriz sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo, presupuesto de polígonos y de llamadas de dibujo, y
 * liberación de recursos.
 */
import { describe, expect, it } from 'vitest';
import type {
  BufferGeometry,
  Group,
  InstancedMesh,
  Material,
  Mesh,
  Object3D,
  MeshPhysicalMaterial,
} from 'three';
import { DoubleSide } from 'three';
import { FRAGMENTO, HITOS_MATRIZ, N_LAMINILLAS_FRAGMENTO, estadoMatriz } from './estado';
import { baston, flecha, globulo, placa, uvPorCaras } from './geometria';
import { FibrillaAbierta, FragmentoLaminar, LaminillasAmpliadas } from './mallas';
import type { EscalaMatriz } from './mallas';

const TIEMPOS = Array.from({ length: 41 }, (_, i) => i / 40);

function sinNaN(datos: ArrayLike<number>): boolean {
  for (let i = 0; i < datos.length; i++) if (!Number.isFinite(datos[i]!)) return false;
  return true;
}

function mallasDe(grupo: Group): Mesh[] {
  const lista: Mesh[] = [];
  grupo.traverse((o) => {
    if ((o as Mesh).geometry) lista.push(o as Mesh);
  });
  return lista;
}

function geometriasDe(grupo: Group): BufferGeometry[] {
  return mallasDe(grupo).map((m) => m.geometry as BufferGeometry);
}

/** ¿Está el objeto a la vista? (él y todos sus antecesores visibles). */
function aLaVista(o: Object3D): boolean {
  let actual: Object3D | null = o;
  while (actual) {
    if (!actual.visible) return false;
    actual = actual.parent;
  }
  return true;
}

/** Triángulos que se dibujan de verdad: por malla, sus triángulos por el número de instancias. */
function triangulosDibujados(grupo: Group): number {
  return mallasDe(grupo).reduce((suma, malla) => {
    if (!aLaVista(malla)) return suma;
    const g = malla.geometry as BufferGeometry;
    const porInstancia = (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
    const instancias = (malla as InstancedMesh).isInstancedMesh
      ? (malla as InstancedMesh).count
      : 1;
    return suma + porInstancia * instancias;
  }, 0);
}

function llamadasDeDibujo(grupo: Group): number {
  return mallasDe(grupo).filter(aLaVista).length;
}

/** Pasadas con que three dibuja una malla: dos si es transparente de doble cara sin `forceSinglePass`. */
function pasadas(malla: Mesh): number {
  const m = malla.material as Material;
  return m.transparent && m.side === DoubleSide && !m.forceSinglePass ? 2 : 1;
}

/** Triángulos y llamadas contando la doble pasada de las transparencias de doble cara. */
function conPasadas(grupo: Group): { triangulos: number; llamadas: number } {
  let triangulos = 0;
  let llamadas = 0;
  for (const malla of mallasDe(grupo)) {
    if (!aLaVista(malla)) continue;
    const g = malla.geometry as BufferGeometry;
    const n = (malla as InstancedMesh).isInstancedMesh ? (malla as InstancedMesh).count : 1;
    const t = ((g.getIndex()?.count ?? g.getAttribute('position').count) / 3) * n;
    // Las líneas no tienen triángulos (cuentan su llamada).
    triangulos += (malla as Mesh).isMesh ? t * pasadas(malla) : 0;
    llamadas += pasadas(malla);
  }
  return { triangulos, llamadas };
}

describe('formas básicas', () => {
  it('el bastón mide 1 a lo largo de X y su radio en Y y Z', () => {
    const g = baston(0.2);
    g.computeBoundingBox();
    expect(g.boundingBox!.max.x).toBeCloseTo(0.5, 6);
    expect(g.boundingBox!.min.x).toBeCloseTo(-0.5, 6);
    // Con pocos segmentos la caja envolvente queda un poco por dentro del radio.
    expect(g.boundingBox!.max.y).toBeCloseTo(0.2, 1);
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
  });

  it('la flecha mide 1, arranca en el origen y apunta a +X', () => {
    const g = flecha();
    g.computeBoundingBox();
    expect(g.boundingBox!.min.x).toBeCloseTo(0, 6);
    expect(g.boundingBox!.max.x).toBeCloseTo(1, 6);
    expect(sinNaN(g.getAttribute('normal').array)).toBe(true);
    const vertices = g.getAttribute('position').count;
    const indices = g.getIndex()!.array;
    for (let i = 0; i < indices.length; i++) expect(indices[i]!).toBeLessThan(vertices);
  });

  it('la placa y el glóbulo son válidos', () => {
    const p = placa(0.5, 0.2, 0.03);
    p.computeBoundingBox();
    expect(p.boundingBox!.max.z).toBeCloseTo(0.015, 6);
    expect(sinNaN(globulo().getAttribute('position').array)).toBe(true);
  });
});

describe.each<[string, () => EscalaMatriz, number]>([
  ['FragmentoLaminar', () => new FragmentoLaminar(), 1_000],
  ['LaminillasAmpliadas', () => new LaminillasAmpliadas(), 6_000],
  ['FibrillaAbierta', () => new FibrillaAbierta(), 30_000],
])('%s', (_, crear, presupuesto) => {
  it('cabe en el presupuesto de triángulos en todos los instantes', () => {
    const escala = crear();
    let maximo = 0;
    for (const t of TIEMPOS) {
      escala.actualizar(estadoMatriz(t));
      maximo = Math.max(maximo, triangulosDibujados(escala.grupo));
    }
    expect(maximo).toBeGreaterThan(10);
    expect(maximo).toBeLessThan(presupuesto);
    escala.liberar();
  });

  it('no produce NaN en ningún instante ni deja posiciones o escalas inválidas', () => {
    const escala = crear();
    for (const t of TIEMPOS) {
      escala.actualizar(estadoMatriz(t));
      for (const v of [escala.grupo.position.x, escala.grupo.position.y, escala.grupo.scale.x]) {
        expect(Number.isFinite(v), `t = ${t}`).toBe(true);
      }
      for (const malla of mallasDe(escala.grupo)) {
        const inst = malla as InstancedMesh;
        if (inst.isInstancedMesh) expect(sinNaN(inst.instanceMatrix.array), `t = ${t}`).toBe(true);
      }
    }
    for (const g of geometriasDe(escala.grupo)) {
      expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    }
    escala.liberar();
  });

  it('actualizar es determinista: la misma t da lo mismo, vaya lo que vaya antes', () => {
    const escala = crear();
    const foto = (): unknown[] => [
      escala.grupo.visible,
      escala.grupo.scale.x,
      ...mallasDe(escala.grupo).map((m) => {
        const inst = m as InstancedMesh;
        return inst.isInstancedMesh ? Array.from(inst.instanceMatrix.array) : m.visible;
      }),
    ];
    escala.actualizar(estadoMatriz(0.61));
    const antes = foto();
    escala.actualizar(estadoMatriz(0.05));
    escala.actualizar(estadoMatriz(0.97));
    escala.actualizar(estadoMatriz(0.61));
    expect(foto()).toEqual(antes);
    escala.liberar();
  });

  it('cada material sube de versión como mucho una vez por fotograma (la opacidad se aplica una sola vez)', () => {
    const escala = crear();
    const materiales = new Set<Material>();
    for (const m of mallasDe(escala.grupo)) materiales.add(m.material as Material);
    for (let k = 0; k <= 200; k++) {
      const antes = new Map([...materiales].map((m) => [m, m.version]));
      escala.actualizar(estadoMatriz(k / 200));
      for (const m of materiales) {
        expect(m.version - antes.get(m)!, `t = ${k / 200}`).toBeLessThanOrEqual(1);
      }
    }
    escala.liberar();
  });

  it('libera las geometrías al terminar', () => {
    const escala = crear();
    let liberadas = 0;
    for (const g of geometriasDe(escala.grupo)) g.addEventListener('dispose', () => liberadas++);
    escala.liberar();
    expect(liberadas).toBeGreaterThan(0);
  });
});

describe('laminillas del fragmento', () => {
  it('uvPorCaras da UV en unidades: la misma densidad en las seis caras de una caja', () => {
    const g = uvPorCaras(placa(6.4, 0.394, 2.4));
    const pos = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    const idx = g.getIndex()!;
    for (let t = 0; t < idx.count / 3; t++) {
      const [a, b, c] = [0, 1, 2].map((k) => idx.getX(3 * t + k)) as [number, number, number];
      const lado = (i: number, j: number) =>
        Math.hypot(pos.getX(i) - pos.getX(j), pos.getY(i) - pos.getY(j), pos.getZ(i) - pos.getZ(j));
      const ladoUv = (i: number, j: number) =>
        Math.hypot(uv.getX(i) - uv.getX(j), uv.getY(i) - uv.getY(j));
      for (const [i, j] of [
        [a, b],
        [b, c],
        [a, c],
      ] as const) {
        expect(ladoUv(i, j)).toBeCloseTo(lado(i, j), 6);
      }
    }
  });

  it('son dos mallas (una por tono) con las ocho laminillas, cada una con su parte de la textura', () => {
    const fragmento = new FragmentoLaminar();
    const claras = fragmento.grupo.getObjectByName('laminillas_claras') as Mesh;
    const oscuras = fragmento.grupo.getObjectByName('laminillas_oscuras') as Mesh;
    expect((claras as unknown as InstancedMesh).isInstancedMesh).toBeFalsy();
    const cajas = (m: Mesh) => m.geometry.getIndex()!.count / 36;
    expect(cajas(claras) + cajas(oscuras)).toBe(N_LAMINILLAS_FRAGMENTO);
    // La V de la cara frontal es la altura de la laminilla: dos laminillas no comparten dibujo.
    const uv = claras.geometry.getAttribute('uv');
    let minV = Infinity;
    let maxV = -Infinity;
    for (let i = 0; i < uv.count; i++) {
      minV = Math.min(minV, uv.getY(i));
      maxV = Math.max(maxV, uv.getY(i));
    }
    expect(maxV - minV).toBeGreaterThan(FRAGMENTO.alto * 0.7);
    const mat = claras.material as MeshPhysicalMaterial;
    expect(mat.bumpMap!.repeat.x).toBe(1);
    expect(mat.bumpMap!.anisotropy).toBe(4);
    fragmento.liberar();
  });
});

describe('la escena completa', () => {
  const crearTodas = () => [
    new FragmentoLaminar(),
    new LaminillasAmpliadas(),
    new FibrillaAbierta(),
  ];

  it('en el peor instante dibuja menos de 40 000 triángulos y menos de 40 llamadas', () => {
    const escalas = crearTodas();
    let triangulos = 0;
    let llamadas = 0;
    const doble = { triangulos: 0, llamadas: 0 };
    for (const t of TIEMPOS) {
      for (const e of escalas) e.actualizar(estadoMatriz(t));
      triangulos = Math.max(
        triangulos,
        escalas.reduce((s, e) => s + triangulosDibujados(e.grupo), 0),
      );
      llamadas = Math.max(
        llamadas,
        escalas.reduce((s, e) => s + llamadasDeDibujo(e.grupo), 0),
      );
      const d = escalas.map((e) => conPasadas(e.grupo));
      doble.triangulos = Math.max(
        doble.triangulos,
        d.reduce((s, x) => s + x.triangulos, 0),
      );
      doble.llamadas = Math.max(
        doble.llamadas,
        d.reduce((s, x) => s + x.llamadas, 0),
      );
    }
    expect(triangulos).toBeLessThan(40_000);
    expect(llamadas).toBeLessThan(40);
    // También con la doble pasada de las transparencias de doble cara (hoy: unos 12 900 y 9).
    expect(doble.triangulos).toBeLessThan(40_000);
    expect(doble.llamadas).toBeLessThan(40);
    for (const e of escalas) e.liberar();
  });

  it('visibilidad por fase: fragmento, laminillas y fibrilla se turnan; las piezas aparecen en su hito', () => {
    const [fragmento, laminillas, fibrilla] = crearTodas() as [
      FragmentoLaminar,
      LaminillasAmpliadas,
      FibrillaAbierta,
    ];
    const todas = [fragmento, laminillas, fibrilla];
    const visibles = () => todas.map((e) => e.grupo.visible);
    const pieza = (nombre: string) =>
      fibrilla.grupo.getObjectByName(nombre) as Object3D | undefined;

    for (const e of todas) e.actualizar(estadoMatriz(HITOS_MATRIZ.fragmento));
    expect(visibles()).toEqual([true, false, false]);

    for (const e of todas) e.actualizar(estadoMatriz(HITOS_MATRIZ.fibras));
    expect(visibles()).toEqual([false, true, false]);

    for (const e of todas) e.actualizar(estadoMatriz(HITOS_MATRIZ.fibrilla));
    expect(visibles()).toEqual([false, false, true]);
    expect(aLaVista(pieza('zonas_hueco')!)).toBe(false);
    expect(aLaVista(pieza('cristales_hidroxiapatita')!)).toBe(false);
    expect(aLaVista(pieza('fibrillas_vecinas')!)).toBe(true);

    for (const e of todas) e.actualizar(estadoMatriz(HITOS_MATRIZ.huecos));
    expect(aLaVista(pieza('zonas_hueco')!)).toBe(true);
    expect(aLaVista(pieza('cristales_hidroxiapatita')!)).toBe(false);

    for (const e of todas) e.actualizar(estadoMatriz(HITOS_MATRIZ.mineral));
    expect(aLaVista(pieza('cristales_hidroxiapatita')!)).toBe(true);
    expect(aLaVista(pieza('proteinas_no_colagenas')!)).toBe(false);

    for (const e of todas) e.actualizar(estadoMatriz(HITOS_MATRIZ.proteinas));
    expect(aLaVista(pieza('proteinas_no_colagenas')!)).toBe(true);
    expect(aLaVista(pieza('flechas_carga')!)).toBe(false);

    for (const e of todas) e.actualizar(estadoMatriz(HITOS_MATRIZ.carga));
    expect(aLaVista(pieza('flechas_carga')!)).toBe(true);
    expect(aLaVista(pieza('zonas_hueco')!)).toBe(false);
    // La fibrilla se estira un poco bajo la carga.
    expect(pieza('fibrilla_cuerpo')!.scale.x).toBeGreaterThan(1.01);
    for (const e of todas) e.liberar();
  });
});
