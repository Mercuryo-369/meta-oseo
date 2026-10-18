/**
 * Pruebas de las formas de la escena de la fractura sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo (con la cuña cerrada y abierta), presupuesto de polígonos y
 * de llamadas de dibujo, liberación de recursos, determinismo y visibilidad por fase.
 */
import { describe, expect, it } from 'vitest';
import type {
  BufferGeometry,
  Group,
  InstancedMesh,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
} from 'three';
import { DoubleSide, Matrix4, Quaternion, Vector3 } from 'three';
import { BRECHA, DESPLAZAMIENTO, HITOS_FRACTURA, estadoFractura } from './estado';
import {
  IRREGULAR,
  celulasInflamatorias,
  normalSobreCallo,
  osteoblastosDelCallo,
  perfilSolido,
  radioCallo,
  radioHematoma,
} from './disposicion';
import {
  abollar,
  anillo,
  arcoDeCuerpo,
  arcoDeCuna,
  dentado,
  esfera,
  fracturar,
  fusiforme,
  grumo,
  tramo,
} from './geometria';
import { HuesoFracturado, Reparacion, presenciaCon } from './mallas';
import type { PiezaFractura } from './mallas';

const TIEMPOS = Array.from({ length: 41 }, (_, i) => i / 40);
/** Presupuesto de la escena completa en el peor instante. */
const PRESUPUESTO = { triangulos: 40_000, llamadas: 40 } as const;

function sinNaN(datos: ArrayLike<number>): boolean {
  for (let i = 0; i < datos.length; i++) if (!Number.isFinite(datos[i]!)) return false;
  return true;
}

function geometriasDe(grupo: Group): BufferGeometry[] {
  const lista: BufferGeometry[] = [];
  grupo.traverse((o) => {
    const g = (o as Mesh).geometry as BufferGeometry | undefined;
    if (g && !lista.includes(g)) lista.push(g);
  });
  return lista;
}

function esVisible(o: Object3D): boolean {
  let p: Object3D | null = o;
  while (p) {
    if (!p.visible) return false;
    p = p.parent;
  }
  return true;
}

interface Dibujo {
  triangulos: number;
  llamadas: number;
  /** Contando dos veces lo que three dibuja en dos pasadas (transparente de doble cara sin `forceSinglePass`). */
  triangulosConPasadas: number;
  llamadasConPasadas: number;
  /** Pase de sombras: las mallas opacas (o con opacidad > 0,9) que proyectan sombra (`EntornoRealista`). */
  llamadasSombra: number;
}

/** Lo que se dibuja: objetos con geometría visibles (las instancias cuentan todas), doble pasada y sombras. */
function medir(grupos: readonly Group[]): Dibujo {
  const d: Dibujo = {
    triangulos: 0,
    llamadas: 0,
    triangulosConPasadas: 0,
    llamadasConPasadas: 0,
    llamadasSombra: 0,
  };
  for (const grupo of grupos) {
    grupo.traverse((o) => {
      const g = (o as Mesh).geometry as BufferGeometry | undefined;
      if (!g || !esVisible(o)) return;
      const porInstancia = (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
      const instancias = (o as { isInstancedMesh?: boolean; count?: number }).isInstancedMesh
        ? ((o as { count?: number }).count ?? 1)
        : 1;
      const m = (o as Mesh).material as Material;
      const pasadas = m.transparent && m.side === DoubleSide && !m.forceSinglePass ? 2 : 1;
      d.llamadas++;
      d.triangulos += porInstancia * instancias;
      d.llamadasConPasadas += pasadas;
      d.triangulosConPasadas += porInstancia * instancias * pasadas;
      if (!o.userData.sinSombra && (!m.transparent || m.opacity > 0.9)) d.llamadasSombra++;
    });
  }
  return d;
}

/** Escala de una matriz de instancia (largo de sus columnas): 0 en una instancia oculta. */
function escalaDe(m: Matrix4): Vector3 {
  const e = m.elements;
  return new Vector3(
    Math.hypot(e[0]!, e[1]!, e[2]!),
    Math.hypot(e[4]!, e[5]!, e[6]!),
    Math.hypot(e[8]!, e[9]!, e[10]!),
  );
}

/** Repeticiones de la textura por unidad en un triángulo: raíz de (área UV / área real). */
function densidadUv(g: BufferGeometry, tri: number): number {
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  const idx = g.getIndex();
  const [a, b, c] = [0, 1, 2].map((k) => idx?.getX(3 * tri + k) ?? 3 * tri + k) as [
    number,
    number,
    number,
  ];
  const p = (i: number) => new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
  const area =
    p(b)
      .sub(p(a))
      .cross(p(c).sub(p(a)))
      .length() / 2;
  const du1 = uv.getX(b) - uv.getX(a);
  const dv1 = uv.getY(b) - uv.getY(a);
  const du2 = uv.getX(c) - uv.getX(a);
  const dv2 = uv.getY(c) - uv.getY(a);
  return area < 1e-6 ? 1 : Math.sqrt(Math.abs(du1 * dv2 - du2 * dv1) / 2 / area);
}

function buscar(grupo: Group, nombre: string): Object3D {
  const o = grupo.getObjectByName(nombre);
  if (!o) throw new Error(`No existe el objeto ${nombre}`);
  return o;
}

/** Cuántas instancias de una malla instanciada están a la vista (matriz no nula). */
function instanciasVisibles(o: Object3D): number {
  const im = (o as { instanceMatrix?: { array: ArrayLike<number> } }).instanceMatrix;
  if (!im) return 0;
  let n = 0;
  for (let i = 0; i + 15 < im.array.length; i += 16) {
    if (im.array[i] !== 0 || im.array[i + 5] !== 0 || im.array[i + 10] !== 0) n++;
  }
  return n;
}

describe('formas básicas', () => {
  it.each<[string, () => BufferGeometry]>([
    ['esfera', () => esfera()],
    ['tramo', () => tramo()],
    ['anillo', () => anillo(0.62, 1, 2, 0.3, 4)],
    ['fusiforme completo', () => fusiforme(perfilSolido(radioHematoma, -1.45, 1.45))],
    [
      'fusiforme partido',
      () =>
        fusiforme(
          perfilSolido(radioCallo, -0.95, 0.95),
          arcoDeCuerpo(4).theta0,
          arcoDeCuerpo(4).arco,
        ),
    ],
  ])('%s es válida, sin NaN y con índices dentro de rango', (_, crear) => {
    const g = crear();
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    expect(sinNaN(g.getAttribute('normal').array)).toBe(true);
    const indices = g.getIndex()?.array;
    if (indices) {
      const vertices = g.getAttribute('position').count;
      for (let i = 0; i < indices.length; i++) expect(indices[i]!).toBeLessThan(vertices);
    }
    g.dispose();
  });

  it('un fusiforme partido lleva las dos caras de corte que uno completo no tiene y respeta su perfil', () => {
    const perfil = perfilSolido(radioHematoma, -1.45, 1.45);
    const completo = fusiforme(perfil);
    const partido = fusiforme(perfil, arcoDeCuerpo().theta0, arcoDeCuerpo().arco);
    completo.computeBoundingBox();
    expect(completo.boundingBox!.max.y).toBeCloseTo(1.45, 5);
    expect(completo.boundingBox!.max.x).toBeCloseTo(1.42, 1);
    // El partido tiene menos segmentos de revolución pero añade dos caras planas.
    const cuenta = (g: BufferGeometry) => g.getAttribute('position').count;
    expect(cuenta(partido)).toBeLessThan(cuenta(completo));
    expect(cuenta(partido)).toBeGreaterThan(cuenta(completo) * 0.5);
    completo.dispose();
    partido.dispose();
  });

  it('la cuña y el cuerpo se complementan y el retiro agranda la cuña', () => {
    const cuna = arcoDeCuna();
    const cuerpo = arcoDeCuerpo();
    expect(cuna.arco + cuerpo.arco).toBeCloseTo(Math.PI * 2, 9);
    expect(cuerpo.theta0).toBeCloseTo(cuna.theta0 + cuna.arco, 9);
    expect(arcoDeCuna(4).arco).toBeGreaterThan(cuna.arco);
    expect(arcoDeCuerpo(4).arco).toBeLessThan(cuerpo.arco);
  });

  it('el tramo nace en el origen y crece hacia +Y', () => {
    const t = tramo();
    t.computeBoundingBox();
    expect(t.boundingBox!.min.y).toBeCloseTo(0, 5);
    expect(t.boundingBox!.max.y).toBeCloseTo(1, 5);
  });
});

describe('borde de fractura dentado', () => {
  it('el dentado cierra la vuelta, está acotado y no es plano', () => {
    const valores: number[] = [];
    for (let k = 0; k < 64; k++) {
      const theta = (k / 64) * Math.PI * 2;
      expect(dentado(theta)).toBeCloseTo(dentado(theta + Math.PI * 2), 9);
      expect(Math.abs(dentado(theta))).toBeLessThanOrEqual(1);
      valores.push(dentado(theta));
    }
    expect(Math.max(...valores) - Math.min(...valores)).toBeGreaterThan(1);
  });

  it('fracturar mueve solo los vértices del borde, según su ángulo, y deja la geometría válida', () => {
    const g = anillo(0.62, 1, 0.35, 0.3, 4);
    const antes = Float32Array.from(g.getAttribute('position').array);
    fracturar(g, -0.175, 0.06);
    const pos = g.getAttribute('position');
    let movidos = 0;
    for (let i = 0; i < pos.count; i++) {
      const y0 = antes[3 * i + 1]!;
      if (Math.abs(y0 + 0.175) < 1e-5) {
        const theta = Math.atan2(pos.getX(i), pos.getZ(i));
        expect(pos.getY(i)).toBeCloseTo(-0.175 + 0.06 * dentado(theta), 5);
        movidos++;
      } else {
        expect(pos.getY(i)).toBe(y0);
      }
    }
    expect(movidos).toBeGreaterThan(20);
    expect(sinNaN(g.getAttribute('normal').array)).toBe(true);
    g.dispose();
  });

  it('abollar solo cambia la distancia al eje (ni el ángulo ni la altura), con un relieve que cierra la vuelta', () => {
    for (let k = 0; k < 32; k++) {
      const theta = (k / 32) * Math.PI * 2;
      expect(grumo(theta, 0.37, 2.1)).toBeCloseTo(grumo(theta + Math.PI * 2, 0.37, 2.1), 9);
      expect(Math.abs(grumo(theta, 0.37, 2.1))).toBeLessThanOrEqual(1);
    }
    const g = fusiforme(
      perfilSolido(radioCallo, -0.95, 0.95),
      arcoDeCuerpo(4).theta0,
      arcoDeCuerpo(4).arco,
    );
    const antes = Float32Array.from(g.getAttribute('position').array);
    abollar(g, 0.03, 2.1);
    const pos = g.getAttribute('position');
    let cambiados = 0;
    for (let i = 0; i < pos.count; i++) {
      const x0 = antes[3 * i]!;
      const z0 = antes[3 * i + 2]!;
      const r0 = Math.hypot(x0, z0);
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      expect(pos.getY(i)).toBe(antes[3 * i + 1]!);
      expect(Math.abs(r - r0)).toBeLessThanOrEqual(0.03 * r0 + 1e-6);
      // Mismo ángulo: la dirección (x, z) no gira.
      expect(Math.abs(x0 * pos.getZ(i) - z0 * pos.getX(i))).toBeLessThan(1e-5);
      if (Math.abs(r - r0) > 1e-4) cambiados++;
    }
    expect(cambiados).toBeGreaterThan(50);
    expect(sinNaN(g.getAttribute('normal').array)).toBe(true);
    g.dispose();
  });

  it('los bordes de los dos fragmentos encajan: la brecha mide lo mismo en cada ángulo', () => {
    const hueso = new HuesoFracturado();
    for (const nombre of ['hueso_necrotico', 'hueso_necrotico_tapa']) {
      const pos = (buscar(hueso.grupo, nombre) as Mesh).geometry.getAttribute('position');
      let proximales = 0;
      let distales = 0;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (Math.abs(y) > BRECHA / 2 + 0.07) continue;
        // Mismo dibujo en los dos bordes (el distal está desplazado en x): la brecha es constante.
        const distal = y > 0;
        const x = pos.getX(i) - (distal ? DESPLAZAMIENTO : 0);
        const esperado =
          (distal ? 1 : -1) * (BRECHA / 2) + 0.06 * dentado(Math.atan2(x, pos.getZ(i)));
        expect(y, `${nombre}, vértice ${i}`).toBeCloseTo(esperado, 4);
        if (distal) distales++;
        else proximales++;
      }
      expect(proximales).toBeGreaterThan(10);
      expect(distales).toBeGreaterThan(10);
    }
    hueso.liberar();
  });

  it('el callo cambia de acabado con su tejido: liso y húmedo de cartílago, mate y poroso de hueso', () => {
    const reparacion = new Reparacion();
    const centro = () =>
      (buscar(reparacion.grupo, 'callo_central') as Mesh).material as MeshPhysicalMaterial;
    reparacion.actualizar(estadoFractura(HITOS_FRACTURA.callo_blando), false);
    const rBlando = centro().roughness;
    const ccBlando = centro().clearcoat;
    const relieveBlando = centro().bumpScale;
    reparacion.actualizar(estadoFractura(HITOS_FRACTURA.callo_duro), false);
    expect(centro().roughness).toBeGreaterThan(rBlando);
    expect(centro().clearcoat).toBeLessThan(ccBlando);
    expect(centro().bumpScale).toBeGreaterThan(relieveBlando);
    // El barniz nunca llega a 0: cambiarlo de 0 a más obligaría a recompilar el sombreador.
    for (const t of TIEMPOS) {
      reparacion.actualizar(estadoFractura(t), false);
      expect(centro().clearcoat, `t = ${t}`).toBeGreaterThan(0);
    }
    reparacion.liberar();
  });
});

describe('presenciaCon', () => {
  it('las células con más retraso aparecen más tarde y todas están al final', () => {
    expect(presenciaCon(0, 0)).toBe(0);
    expect(presenciaCon(0, 1)).toBe(0);
    expect(presenciaCon(1, 0)).toBe(1);
    expect(presenciaCon(1, 1)).toBe(1);
    expect(presenciaCon(0.4, 0)).toBeGreaterThan(presenciaCon(0.4, 1));
  });
});

describe.each<[string, () => PiezaFractura]>([
  ['HuesoFracturado', () => new HuesoFracturado()],
  ['Reparacion', () => new Reparacion()],
])('%s', (_, crear) => {
  it('no produce NaN en ningún instante, con la cuña cerrada ni abierta', () => {
    const pieza = crear();
    for (const abierta of [false, true]) {
      for (const t of TIEMPOS) {
        pieza.actualizar(estadoFractura(t), abierta);
        pieza.grupo.traverse((o) => {
          for (const v of [...o.position.toArray(), ...o.scale.toArray()]) {
            expect(Number.isFinite(v), `t = ${t}, ${o.name}`).toBe(true);
          }
          const im = (o as { instanceMatrix?: { array: ArrayLike<number> } }).instanceMatrix;
          if (im) expect(sinNaN(im.array), `t = ${t}, ${o.name}`).toBe(true);
        });
      }
    }
    for (const g of geometriasDe(pieza.grupo)) {
      expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    }
    pieza.liberar();
  });

  it('actualizar es determinista: la misma t da lo mismo, vaya lo que vaya antes', () => {
    const pieza = crear();
    const foto = (): unknown[] => {
      const lista: unknown[] = [];
      pieza.grupo.traverse((o) =>
        lista.push(
          o.visible,
          o.position.toArray(),
          o.scale.toArray(),
          Array.from(
            (o as { instanceMatrix?: { array: ArrayLike<number> } }).instanceMatrix?.array ?? [],
          ),
        ),
      );
      return lista;
    };
    pieza.actualizar(estadoFractura(0.61), false);
    const antes = foto();
    pieza.actualizar(estadoFractura(0.05), true);
    pieza.actualizar(estadoFractura(0.97), false);
    pieza.actualizar(estadoFractura(0.61), false);
    expect(foto()).toEqual(antes);
    pieza.liberar();
  });

  it('libera las geometrías al terminar', () => {
    const pieza = crear();
    let liberadas = 0;
    for (const g of geometriasDe(pieza.grupo)) g.addEventListener('dispose', () => liberadas++);
    pieza.liberar();
    expect(liberadas).toBeGreaterThan(0);
  });

  it('con la cuña abierta se ocultan las tapas', () => {
    const pieza = crear();
    pieza.actualizar(estadoFractura(0.6), false);
    const tapas: Object3D[] = [];
    pieza.grupo.traverse((o) => {
      if (o.name.endsWith('_tapa') && (o as Mesh).geometry) tapas.push(o);
    });
    expect(tapas.length).toBeGreaterThan(0);
    expect(tapas.some(esVisible)).toBe(true);
    pieza.actualizar(estadoFractura(0.6), true);
    expect(tapas.some(esVisible)).toBe(false);
    pieza.liberar();
  });
});

describe('presupuesto de la escena completa', () => {
  it('cabe en el presupuesto en el peor instante, también con la doble pasada y el pase de sombras', () => {
    const hueso = new HuesoFracturado();
    const reparacion = new Reparacion();
    const peor: Dibujo = {
      triangulos: 0,
      llamadas: 0,
      triangulosConPasadas: 0,
      llamadasConPasadas: 0,
      llamadasSombra: 0,
    };
    for (const abierta of [false, true]) {
      for (const t of TIEMPOS) {
        const e = estadoFractura(t);
        hueso.actualizar(e, abierta);
        reparacion.actualizar(e, abierta);
        const m = medir([hueso.grupo, reparacion.grupo]);
        for (const k of Object.keys(peor) as (keyof Dibujo)[]) peor[k] = Math.max(peor[k], m[k]);
      }
    }
    // Hoy: unos 19 400 triángulos y 18 llamadas; 19 con la doble pasada (el periostio fino); 18 de sombra.
    expect(peor.triangulos).toBeGreaterThan(1_000);
    expect(peor.triangulos).toBeLessThan(PRESUPUESTO.triangulos);
    expect(peor.llamadas).toBeLessThan(PRESUPUESTO.llamadas);
    expect(peor.triangulosConPasadas).toBeLessThan(PRESUPUESTO.triangulos);
    expect(peor.llamadasConPasadas).toBeLessThan(PRESUPUESTO.llamadas);
    expect(peor.llamadasSombra).toBeLessThan(PRESUPUESTO.llamadas);
    hueso.liberar();
    reparacion.liberar();
  });
});

describe('revisión de diseño (2026-10-17)', () => {
  it('UV en unidades: el tramo necrótico (0,35 de largo) tiene el grano de la cortical sana, y el callo y el coágulo también', () => {
    const hueso = new HuesoFracturado();
    const reparacion = new Reparacion();
    for (const [grupo, nombre] of [
      [hueso.grupo, 'cortical'],
      [hueso.grupo, 'hueso_necrotico'],
      [reparacion.grupo, 'coagulo'],
      [reparacion.grupo, 'callo_central'],
      [reparacion.grupo, 'callo_periferico'],
    ] as const) {
      const g = (buscar(grupo, nombre) as Mesh).geometry;
      const n = g.getIndex()!.count / 3;
      let dentro = 0;
      for (let t = 0; t < n; t++) {
        const d = densidadUv(g, t);
        if (d > 0.75 && d < 1.3) dentro++;
      }
      // Casi todos los triángulos: quedan fuera los que tocan el eje (las puntas del torno).
      expect(dentro / n, nombre).toBeGreaterThan(0.85);
    }
    hueso.liberar();
    reparacion.liberar();
  });

  it('el periostio es opaco (una sola pasada) mientras está engrosado y translúcido cuando es fino', () => {
    const hueso = new HuesoFracturado();
    const mat = (buscar(hueso.grupo, 'periostio') as Mesh).material as Material;
    for (const t of [0.3, 0.45, 0.6, 0.7]) {
      hueso.actualizar(estadoFractura(t), false);
      expect(mat.transparent, `t = ${t}`).toBe(false);
    }
    hueso.actualizar(estadoFractura(0), false);
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBeCloseTo(0.7, 6);
    hueso.liberar();
  });

  it('las instancias ocultas no estropean la esfera envolvente de su malla (escala 0, no matriz nula)', () => {
    const reparacion = new Reparacion();
    for (const t of [0, 0.3, 0.6, 1]) {
      reparacion.actualizar(estadoFractura(t), true);
      reparacion.grupo.traverse((o) => {
        const im = o as InstancedMesh;
        if (!im.isInstancedMesh) return;
        im.boundingSphere = null;
        im.computeBoundingSphere();
        const c = im.boundingSphere!.center;
        expect(Number.isFinite(c.x + c.y + c.z), `t = ${t}, ${o.name}`).toBe(true);
      });
    }
    reparacion.liberar();
  });

  it('la superficie que se dibuja del callo es la que usan sus células (mismo relieve irregular)', () => {
    const reparacion = new Reparacion();
    const geo = (buscar(reparacion.grupo, 'callo_central') as Mesh).geometry;
    const pos = geo.getAttribute('position');
    const { amplitud, semilla } = IRREGULAR.callo;
    let comprobados = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const esperado = radioCallo(y) * (1 + amplitud * grumo(Math.atan2(x, z), y, semilla));
      if (Math.abs(Math.hypot(x, z) - esperado) < 1e-4) comprobados++;
    }
    // Los vértices del torno (las caras de corte tienen vértices a cualquier radio).
    expect(comprobados).toBeGreaterThan(200);
    reparacion.liberar();
  });

  it('los osteoblastos del callo se dibujan aplanados contra su superficie (no como canicas)', () => {
    const reparacion = new Reparacion();
    reparacion.actualizar(estadoFractura(HITOS_FRACTURA.callo_duro), false);
    const malla = buscar(reparacion.grupo, 'osteoblastos') as InstancedMesh;
    const m = new Matrix4();
    const p = new Vector3();
    const q = new Quaternion();
    const e = new Vector3();
    let vistos = 0;
    osteoblastosDelCallo().forEach((c, i) => {
      malla.getMatrixAt(i, m);
      // `decompose` da escala 1 en una matriz de determinante 0 (la de una instancia oculta).
      if (escalaDe(m).y < 1e-4) return;
      m.decompose(p, q, e);
      vistos++;
      expect(e.y / e.x).toBeCloseTo(0.6 / 1.15, 4);
      const eje = new Vector3(0, 1, 0).applyQuaternion(q);
      expect(eje.dot(new Vector3(...normalSobreCallo(c)))).toBeGreaterThan(0.999);
    });
    expect(vistos).toBeGreaterThan(8);
    reparacion.liberar();
  });

  it('las células de la superficie del hematoma lo acompañan al encoger y desaparecen con él', () => {
    const reparacion = new Reparacion();
    const malla = buscar(reparacion.grupo, 'neutrofilos') as InstancedMesh;
    const datos = celulasInflamatorias().neutrofilos;
    const m = new Matrix4();
    const p = new Vector3();
    const q = new Quaternion();
    const e = new Vector3();
    for (const t of [0.3, 0.36, 0.4]) {
      reparacion.actualizar(estadoFractura(t), false);
      const s = buscar(reparacion.grupo, 'hematoma').scale.x;
      let sobre = 0;
      for (let i = 0; i < malla.count; i++) {
        malla.getMatrixAt(i, m);
        // Las de la brecha (dentro) no se apoyan en el hematoma.
        if (escalaDe(m).x < 1e-4 || !datos[i]!.superficie) continue;
        m.decompose(p, q, e);
        const r = Math.hypot(p.x, p.z);
        const yEscala1 = p.y / s;
        sobre++;
        const liso = s * radioHematoma(yEscala1);
        // El centro, fuera de la superficie irregular; el borde de dentro de la célula, dentro (no flota).
        expect(r, `t = ${t}`).toBeGreaterThan(liso * (1 - IRREGULAR.hematoma.amplitud) - 1e-6);
        expect(r - e.x, `t = ${t}`).toBeLessThan(liso * (1 + IRREGULAR.hematoma.amplitud) + 1e-6);
      }
      if (t === 0.3) expect(sobre).toBeGreaterThan(5);
    }
    reparacion.actualizar(estadoFractura(0.44), false);
    expect(esVisible(buscar(reparacion.grupo, 'hematoma'))).toBe(false);
    reparacion.liberar();
  });
});

describe('visibilidad por fase', () => {
  const hueso = new HuesoFracturado();
  const reparacion = new Reparacion();
  const en = (t: number, abierta = false) => {
    const e = estadoFractura(t);
    hueso.actualizar(e, abierta);
    reparacion.actualizar(e, abierta);
  };
  const visible = (nombre: string) => esVisible(buscar(reparacion.grupo, nombre));

  it('fractura: sangrado a la vista; ni hematoma ni callo', () => {
    en(HITOS_FRACTURA.fractura);
    expect(visible('vasos_rotos')).toBe(true);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'gotas_de_sangre'))).toBeGreaterThan(10);
    expect(visible('hematoma')).toBe(false);
    expect(visible('callo')).toBe(false);
    expect(esVisible(buscar(hueso.grupo, 'medula_central'))).toBe(false);
  });

  it('hematoma: el coágulo tapa la brecha; el sangrado ya no se ve', () => {
    en(HITOS_FRACTURA.hematoma);
    expect(visible('hematoma')).toBe(true);
    expect(buscar(reparacion.grupo, 'hematoma').scale.x).toBeCloseTo(1, 5);
    expect(visible('vasos_rotos')).toBe(false);
    expect(visible('callo')).toBe(false);
  });

  it('inflamación: células inflamatorias, células madre y vasos nuevos', () => {
    en(HITOS_FRACTURA.inflamacion);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'neutrofilos'))).toBeGreaterThan(5);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'macrofagos'))).toBeGreaterThan(3);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'celulas_madre'))).toBeGreaterThan(5);
    expect(visible('vasos_nuevos')).toBe(true);
    expect(visible('callo')).toBe(false);
  });

  it('con la cuña abierta desaparecen las células que caerían en el sector abierto', () => {
    en(HITOS_FRACTURA.inflamacion, false);
    const cerrada = instanciasVisibles(buscar(reparacion.grupo, 'neutrofilos'));
    en(HITOS_FRACTURA.inflamacion, true);
    const abierta = instanciasVisibles(buscar(reparacion.grupo, 'neutrofilos'));
    expect(abierta).toBeLessThan(cerrada);
    expect(abierta).toBeGreaterThan(0);
  });

  it('callo blando y duro: el manguito completo; después encoge con osteoclastos encima', () => {
    en(HITOS_FRACTURA.callo_blando);
    expect(visible('callo')).toBe(true);
    expect(buscar(reparacion.grupo, 'callo').scale.x).toBeCloseTo(1, 5);
    expect(visible('hematoma')).toBe(false);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'osteoclastos'))).toBe(0);
    en(HITOS_FRACTURA.callo_duro);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'osteoblastos'))).toBeGreaterThan(8);
    en(HITOS_FRACTURA.remodelado);
    expect(buscar(reparacion.grupo, 'callo').scale.x).toBeLessThan(0.8);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'osteoclastos'))).toBeGreaterThan(4);
  });

  it('consolidado: callo mínimo, médula continua, sin células ni vasos nuevos', () => {
    en(HITOS_FRACTURA.consolidado);
    expect(visible('callo')).toBe(true);
    expect(buscar(reparacion.grupo, 'callo').scale.x).toBeLessThan(0.6);
    expect(esVisible(buscar(hueso.grupo, 'medula_central'))).toBe(true);
    expect(buscar(hueso.grupo, 'medula_central').scale.y).toBeCloseTo(1, 5);
    expect(visible('vasos_nuevos')).toBe(false);
    expect(visible('osteoclastos')).toBe(false);
    expect(visible('osteoblastos')).toBe(false);
    hueso.liberar();
    reparacion.liberar();
  });
});
