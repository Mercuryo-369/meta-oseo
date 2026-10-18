/**
 * Pruebas de las formas y las mallas de la escena trabecular sin WebGL (three crea las geometrías en memoria):
 * geometrías válidas, presupuesto de lo que se dibuja CONTANDO las instancias, la doble pasada de los transparentes
 * y las sombras, oclusión ambiental por instancia, sin NaN en 41 instantes, determinismo, liberación de recursos y
 * visibilidad por fase.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, InstancedBufferAttribute, InstancedMesh, Mesh } from 'three';
import { Color, DoubleSide, MeshPhysicalMaterial, SRGBColorSpace, Vector3 } from 'three';
import { GROSOR_CORTICAL, HITOS_TRABECULAR, LADO, estadoTrabecular } from './estado';
import {
  barraUnidad,
  cajaBiselada,
  cajaUnidad,
  cilindroUnidad,
  discoUnidad,
  esferaUnidad,
  flecha,
  losa,
} from './geometria';
import { CuboTrabecular, oclusionTrabecula } from './mallas';
import type { PiezaTrabecular } from './mallas';
import { HEX, NATURAL } from './paleta';

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

/** Pasadas con que three dibuja una malla: dos si es transparente de doble cara sin `forceSinglePass`. */
function pasadas(m: Mesh): number {
  const mat = m.material as MeshPhysicalMaterial;
  return mat.transparent && mat.side === DoubleSide && !mat.forceSinglePass ? 2 : 1;
}

/** Proyecta sombra con la regla de `EntornoRealista` (opaca u opacidad > 0,9, sin `userData.sinSombra`). */
function proyecta(m: Mesh): boolean {
  const mat = m.material as MeshPhysicalMaterial;
  return !m.userData.sinSombra && (!mat.transparent || mat.opacity > 0.9);
}

/**
 * Triángulos y llamadas de dibujo del pase principal (mallas visibles, con sus instancias y la doble pasada) y
 * llamadas del pase de sombras.
 */
function coste(grupo: Group): { triangulos: number; llamadas: number; sombras: number } {
  const visibles = mallasDe(grupo, true);
  return {
    triangulos: visibles.reduce((s, m) => s + pasadas(m) * triangulosDe(m), 0),
    llamadas: visibles.reduce((s, m) => s + pasadas(m), 0),
    sombras: visibles.filter(proyecta).length,
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

/** Triángulos de una geometría indexada como tríos de vértices. */
function triangulos(g: BufferGeometry): [Vector3, Vector3, Vector3][] {
  const pos = g.getAttribute('position');
  const indices = g.getIndex()!;
  const lista: [Vector3, Vector3, Vector3][] = [];
  for (let i = 0; i < indices.count; i += 3) {
    lista.push(
      [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(pos, indices.getX(i + k))) as [
        Vector3,
        Vector3,
        Vector3,
      ],
    );
  }
  return lista;
}

/** Cada arista (por posición) la comparten exactamente dos triángulos: el sólido está cerrado. */
function cerrada(g: BufferGeometry): boolean {
  const clave = (v: Vector3): string =>
    v
      .toArray()
      .map((x) => Math.round(x * 1e5) + 0)
      .join(',');
  const aristas = new Map<string, number>();
  for (const t of triangulos(g)) {
    for (let k = 0; k < 3; k++) {
      const a = clave(t[k]!);
      const b = clave(t[(k + 1) % 3]!);
      if (a === b) continue;
      const arista = a < b ? `${a}|${b}` : `${b}|${a}`;
      aristas.set(arista, (aristas.get(arista) ?? 0) + 1);
    }
  }
  return [...aristas.values()].every((n) => n === 2);
}

describe('formas biseladas (realismo)', () => {
  it.each<[string, () => BufferGeometry, number]>([
    ['losa', () => losa(0.06, 0.08), 20],
    ['cajaBiselada', () => cajaBiselada(0.016, 0.3, 0.016), 44],
    ['barraUnidad', () => barraUnidad(10), 60],
  ])(
    '%s: cerrada, con UV, normales unitarias y todos sus triángulos hacia fuera',
    (_, crear, n) => {
      const g = crear();
      expect(g.getIndex()!.count / 3).toBe(n);
      expect(g.getAttribute('uv')).toBeDefined();
      expect(sinNaN(g.getAttribute('position').array)).toBe(true);
      const normales = g.getAttribute('normal');
      for (let i = 0; i < normales.count; i++) {
        expect(new Vector3().fromBufferAttribute(normales, i).length()).toBeCloseTo(1, 4);
      }
      for (const [a, b, c] of triangulos(g)) {
        const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
        const centro = new Vector3().add(a).add(b).add(c);
        expect(normal.dot(centro)).toBeGreaterThan(0);
      }
      expect(cerrada(g)).toBe(true);
      g.computeBoundingBox();
      expect(g.boundingBox!.min.y).toBeCloseTo(-0.5, 6);
      expect(g.boundingBox!.max.y).toBeCloseTo(0.5, 6);
      g.dispose();
    },
  );

  it('la losa ocupa su caja de lado 1 y su canto es una arista a media altura', () => {
    const g = losa(0.06, 0.08);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.toArray()).toEqual([-0.5, -0.5, -0.5]);
    expect(g.boundingBox!.max.toArray()).toEqual([0.5, 0.5, 0.5]);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      // En el borde exterior (|x| o |y| = 0,5) solo hay vértices de la arista, a z = 0.
      if (Math.abs(pos.getX(i)) > 0.499 || Math.abs(pos.getY(i)) > 0.499) {
        expect(pos.getZ(i)).toBe(0);
      }
    }
    g.dispose();
  });

  it('la barra es más fina en el centro que cerca de los extremos', () => {
    const g = barraUnidad(10);
    const pos = g.getAttribute('position');
    let centro = 0;
    let extremo = 0;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      if (Math.abs(pos.getY(i)) < 1e-6) centro = Math.max(centro, r);
      else if (Math.abs(Math.abs(pos.getY(i)) - 0.43) < 1e-6) extremo = Math.max(extremo, r);
    }
    expect(centro).toBeGreaterThan(0.5);
    expect(centro).toBeLessThan(extremo);
    g.dispose();
  });
});

describe('materiales y paleta natural (realismo)', () => {
  it('todas las mallas del cubo llevan UV (el relieve las necesita) y material físico', () => {
    for (const fantasma of [false, true]) {
      const cubo = new CuboTrabecular({ fantasma });
      for (const m of mallasDe(cubo.grupo)) {
        expect((m.geometry as BufferGeometry).getAttribute('uv'), m.name).toBeDefined();
        expect(m.material, m.name).toBeInstanceOf(MeshPhysicalMaterial);
      }
      cubo.liberar();
    }
  });

  it('el hueso es marfil (no rosa) y la microfractura sigue roja, como dice el texto del paso de la carga', () => {
    const hsl = { h: 0, s: 0, l: 0 };
    for (const clave of ['placa', 'barra', 'cortical'] as const) {
      new Color(NATURAL[clave]).getHSL(hsl, SRGBColorSpace);
      // Tono amarillento (35° a 55°), poco saturado y claro.
      expect(hsl.h * 360, clave).toBeGreaterThan(30);
      expect(hsl.h * 360, clave).toBeLessThan(55);
      expect(hsl.l, clave).toBeGreaterThan(0.7);
    }
    new Color(NATURAL.microfractura).getHSL(hsl, SRGBColorSpace);
    expect(hsl.h < 0.03 || hsl.h > 0.97).toBe(true);
    expect(hsl.s).toBeGreaterThan(0.5);
    // Mismas claves que la paleta de los dibujos (que no cambia).
    expect(Object.keys(NATURAL).sort()).toEqual(Object.keys(HEX).sort());
  });
});

describe('revisión de diseño (2026-10-17)', () => {
  it('oclusión ambiental: 1 en las caras abiertas del cubo y menos en el centro y bajo la cortical (realismo-06)', () => {
    const m = LADO / 2;
    expect(oclusionTrabecula(m, 0, 0)).toBeCloseTo(1, 6);
    expect(oclusionTrabecula(0, 0, m)).toBeCloseTo(1, 6);
    expect(oclusionTrabecula(0, -m, 0)).toBeCloseTo(1, 6);
    expect(oclusionTrabecula(0, 0, 0)).toBeCloseTo(0.4, 6);
    // Arriba está la cortical: no es una cara abierta.
    expect(oclusionTrabecula(0, m, 0)).toBeCloseTo(0.4, 6);
    expect(oclusionTrabecula(0, 0, 0.8 * m)).toBeGreaterThan(oclusionTrabecula(0, 0, 0));
  });

  it('las placas y las barras del cubo que envejece llevan un atributo `ao` por instancia; el fantasma, no', () => {
    const cubo = new CuboTrabecular({ fantasma: false });
    const fantasma = new CuboTrabecular({ fantasma: true });
    for (const nombre of ['placas', 'barras']) {
      const malla = cubo.grupo.getObjectByName(nombre) as InstancedMesh;
      const ao = malla.geometry.getAttribute('ao') as InstancedBufferAttribute;
      expect(ao.isInstancedBufferAttribute, nombre).toBe(true);
      expect(ao.count, nombre).toBe(malla.count);
      const valores = Array.from(ao.array);
      expect(Math.min(...valores), nombre).toBeGreaterThanOrEqual(0.4);
      expect(Math.max(...valores), nombre).toBeLessThanOrEqual(1);
      expect(Math.max(...valores) - Math.min(...valores), nombre).toBeGreaterThan(0.3);
      const material = malla.material as MeshPhysicalMaterial;
      const inyecciones = material.userData.inyecciones as { nombre: string }[];
      expect(inyecciones.map((i) => i.nombre)).toContain('ao');
      const enFantasma = fantasma.grupo.getObjectByName(nombre) as InstancedMesh;
      expect(enFantasma.geometry.getAttribute('ao')).toBeUndefined();
    }
    cubo.liberar();
    fantasma.liberar();
  });

  it('la lámina cortical no sombrea la red y lleva UV en unidades: el mismo grano arriba y en los cantos', () => {
    const cubo = new CuboTrabecular({ fantasma: false });
    const lamina = cubo.grupo.getObjectByName('lamina_cortical') as Mesh;
    expect(lamina.userData.sinSombra).toBe(true);
    const g = lamina.geometry as BufferGeometry;
    const pos = g.getAttribute('position');
    const normal = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    const rango = (filtro: (i: number) => boolean, eje: 0 | 1): number => {
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        if (!filtro(i)) continue;
        const v = eje === 0 ? uv.getX(i) : uv.getY(i);
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
      return max - min;
    };
    const arriba = (i: number) => normal.getY(i) > 0.99;
    const canto = (i: number) => normal.getZ(i) > 0.99;
    // La cara de arriba mide en UV lo que mide la lámina (menos el bisel); el canto, su grosor (menos el bisel).
    expect(rango(arriba, 0)).toBeCloseTo((LADO + 0.02) * (1 - 2 * 0.016), 4);
    expect(rango(canto, 1)).toBeCloseTo(GROSOR_CORTICAL * (1 - 2 * 0.3), 4);
    cubo.liberar();
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
  it('menos de 40 000 triángulos y de 40 llamadas (con la doble pasada) y de 40 de sombras en el peor instante', () => {
    const cubo = new CuboTrabecular({ fantasma: false });
    const fantasma = new CuboTrabecular({ fantasma: true });
    let peorTriangulos = 0;
    let peorLlamadas = 0;
    let peorSombras = 0;
    for (let i = 0; i <= 200; i++) {
      const e = estadoTrabecular(i / 200);
      cubo.actualizar(e);
      fantasma.actualizar(e);
      const a = coste(cubo.grupo);
      const b = coste(fantasma.grupo);
      peorTriangulos = Math.max(peorTriangulos, a.triangulos + b.triangulos);
      peorLlamadas = Math.max(peorLlamadas, a.llamadas + b.llamadas);
      peorSombras = Math.max(peorSombras, a.sombras + b.sombras);
    }
    expect(peorTriangulos).toBeGreaterThan(5_000);
    expect(peorTriangulos).toBeLessThan(40_000);
    expect(peorLlamadas).toBeLessThan(40);
    expect(peorSombras).toBeLessThan(40);
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
