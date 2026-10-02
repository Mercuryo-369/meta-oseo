/**
 * Pruebas de las formas y las mallas de la escena trabecular sin WebGL (three crea las geometrías en memoria):
 * geometrías válidas, presupuesto de triángulos CONTANDO las instancias, sin NaN en 41 instantes, determinismo,
 * liberación de recursos y visibilidad por fase.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, InstancedMesh, Mesh } from 'three';
import { HITOS_TRABECULAR, estadoTrabecular } from './estado';
import { cajaUnidad, cilindroUnidad, discoUnidad, esferaUnidad, flecha } from './geometria';
import { CuboTrabecular } from './mallas';
import type { PiezaTrabecular } from './mallas';

const TIEMPOS = Array.from({ length: 41 }, (_, i) => i / 40);

function sinNaN(datos: ArrayLike<number>): boolean {
  for (let i = 0; i < datos.length; i++) if (!Number.isFinite(datos[i]!)) return false;
  return true;
}

function mallasDe(grupo: Group, soloVisibles = false): Mesh[] {
  const lista: Mesh[] = [];
  grupo.traverse((o) => {
    if ((o as Mesh).isMesh) lista.push(o as Mesh);
  });
  return soloVisibles ? lista.filter((m) => visibleHasta(m, grupo)) : lista;
}

function visibleHasta(objeto: Mesh, raiz: Group): boolean {
  let actual: typeof objeto.parent | Mesh = objeto;
  while (actual && actual !== raiz) {
    if (!actual.visible) return false;
    actual = actual.parent;
  }
  return raiz.visible;
}

function triangulosDe(malla: Mesh): number {
  const g = malla.geometry as BufferGeometry;
  const porInstancia = (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
  const instancias = (malla as InstancedMesh).isInstancedMesh ? (malla as InstancedMesh).count : 1;
  return porInstancia * instancias;
}

/** Triángulos que se dibujan (mallas visibles, con sus instancias) y llamadas de dibujo. */
function coste(grupo: Group): { triangulos: number; llamadas: number } {
  const visibles = mallasDe(grupo, true);
  return {
    triangulos: visibles.reduce((s, m) => s + triangulosDe(m), 0),
    llamadas: visibles.length,
  };
}

describe('formas unidad', () => {
  it.each([
    ['caja', cajaUnidad()],
    ['cilindro', cilindroUnidad()],
    ['esfera', esferaUnidad()],
    ['disco', discoUnidad()],
    ['flecha', flecha(1.3, 0.075)],
  ])('%s: válida, sin NaN y pequeña', (_, g) => {
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    expect(sinNaN(g.getAttribute('normal').array)).toBe(true);
    const vertices = g.getAttribute('position').count;
    const indices = g.getIndex();
    if (indices)
      for (let i = 0; i < indices.count; i++) expect(indices.array[i]!).toBeLessThan(vertices);
    expect((indices?.count ?? vertices) / 3).toBeLessThan(200);
    g.dispose();
  });

  it('la flecha apunta hacia abajo con la punta en el origen', () => {
    const g = flecha(1.3, 0.075);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeCloseTo(0, 5);
    expect(g.boundingBox!.max.y).toBeCloseTo(1.3, 5);
    g.dispose();
  });
});

describe.each<[string, () => PiezaTrabecular]>([
  ['CuboTrabecular', () => new CuboTrabecular({ fantasma: false })],
  ['CuboTrabecular fantasma', () => new CuboTrabecular({ fantasma: true })],
])('%s', (_, crear) => {
  it('no produce NaN en ningún instante ni deja posiciones o escalas inválidas', () => {
    const pieza = crear();
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoTrabecular(t));
      pieza.grupo.updateMatrixWorld(true);
      pieza.grupo.traverse((o) => {
        expect(sinNaN(o.matrixWorld.elements), `t = ${t}, ${o.name}`).toBe(true);
        const im = o as InstancedMesh;
        if (im.isInstancedMesh) {
          expect(sinNaN(im.instanceMatrix.array), `t = ${t}, ${o.name}`).toBe(true);
          if (im.instanceColor) expect(sinNaN(im.instanceColor.array)).toBe(true);
        }
      });
    }
    for (const m of mallasDe(pieza.grupo)) {
      expect(sinNaN((m.geometry as BufferGeometry).getAttribute('position').array)).toBe(true);
    }
    pieza.liberar();
  });

  it('actualizar es determinista: la misma t da lo mismo, vaya lo que vaya antes', () => {
    const pieza = crear();
    const foto = (): number[] => {
      const datos: number[] = [];
      pieza.grupo.updateMatrixWorld(true);
      pieza.grupo.traverse((o) => {
        datos.push(o.visible ? 1 : 0, ...o.matrixWorld.elements);
        const im = o as InstancedMesh;
        if (im.isInstancedMesh) datos.push(...im.instanceMatrix.array);
      });
      return datos;
    };
    pieza.actualizar(estadoTrabecular(0.61));
    const antes = foto();
    pieza.actualizar(estadoTrabecular(0.05));
    pieza.actualizar(estadoTrabecular(0.97));
    pieza.actualizar(estadoTrabecular(0.61));
    expect(foto()).toEqual(antes);
    pieza.liberar();
  });

  it('libera las geometrías al terminar', () => {
    const pieza = crear();
    let liberadas = 0;
    const vistas = new Set<BufferGeometry>();
    for (const m of mallasDe(pieza.grupo)) {
      const g = m.geometry as BufferGeometry;
      if (vistas.has(g)) continue;
      vistas.add(g);
      g.addEventListener('dispose', () => liberadas++);
    }
    pieza.liberar();
    expect(liberadas).toBe(vistas.size);
  });
});

describe('presupuesto de la escena completa', () => {
  it('menos de 40 000 triángulos y de 40 llamadas de dibujo en el peor instante', () => {
    const cubo = new CuboTrabecular({ fantasma: false });
    const fantasma = new CuboTrabecular({ fantasma: true });
    let peorTriangulos = 0;
    let peorLlamadas = 0;
    for (const t of TIEMPOS) {
      const e = estadoTrabecular(t);
      cubo.actualizar(e);
      fantasma.actualizar(e);
      const a = coste(cubo.grupo);
      const b = coste(fantasma.grupo);
      peorTriangulos = Math.max(peorTriangulos, a.triangulos + b.triangulos);
      peorLlamadas = Math.max(peorLlamadas, a.llamadas + b.llamadas);
    }
    expect(peorTriangulos).toBeGreaterThan(5_000);
    expect(peorTriangulos).toBeLessThan(40_000);
    expect(peorLlamadas).toBeLessThan(40);
    cubo.liberar();
    fantasma.liberar();
  });
});

describe('visibilidad por fase', () => {
  it('el fantasma y la flecha solo aparecen al final; las BMU solo al principio', () => {
    const cubo = new CuboTrabecular({ fantasma: false });
    const fantasma = new CuboTrabecular({ fantasma: true });
    const buscar = (g: Group, nombre: string) => g.getObjectByName(nombre)!;
    const visible = (g: Group, nombre: string) => visibleHasta(buscar(g, nombre) as Mesh, g);

    const enHito = (fase: keyof typeof HITOS_TRABECULAR) => {
      const e = estadoTrabecular(HITOS_TRABECULAR[fase]);
      cubo.actualizar(e);
      fantasma.actualizar(e);
    };

    enHito('joven');
    expect(fantasma.grupo.visible).toBe(false);
    expect(visible(cubo.grupo, 'bmu_trabeculares')).toBe(true);
    expect(visible(cubo.grupo, 'flecha_carga')).toBe(false);
    expect(visible(cubo.grupo, 'poros_corticales')).toBe(false);

    enHito('perforacion');
    expect(visible(cubo.grupo, 'bmu_trabeculares')).toBe(false);
    expect(fantasma.grupo.visible).toBe(false);

    enHito('osteoporosis');
    expect(fantasma.grupo.visible).toBe(true);
    expect(visible(cubo.grupo, 'poros_corticales')).toBe(true);
    expect(visible(cubo.grupo, 'flecha_carga')).toBe(false);
    expect(cubo.grupo.getObjectByName('cubo_trabecular')!.children[0]!.scale.y).toBeCloseTo(1, 6);

    enHito('carga');
    expect(visible(cubo.grupo, 'flecha_carga')).toBe(true);
    expect(visible(fantasma.grupo, 'flecha_carga')).toBe(true);
    // El cubo envejecido se aplasta mucho más que el joven.
    const cuerpo = (g: Group) => g.children[0]!;
    expect(cuerpo(cubo.grupo).scale.y).toBeLessThan(0.8);
    expect(cuerpo(fantasma.grupo).scale.y).toBeGreaterThan(0.95);

    cubo.liberar();
    fantasma.liberar();
  });
});
