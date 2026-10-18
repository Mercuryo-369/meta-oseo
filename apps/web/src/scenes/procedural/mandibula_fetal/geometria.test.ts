/**
 * Pruebas de las formas de la escena de la mandíbula fetal sin WebGL (three crea las geometrías en memoria):
 * barridos válidos y orientados hacia fuera en las dos mitades, sin NaN en todo el recorrido del tiempo,
 * presupuesto de lo que se dibuja de verdad (doble pasada y sombras incluidas), grano del relieve, germen en
 * campana, determinismo, liberación de recursos y visibilidad de cada pieza por fase.
 */
import { describe, expect, it } from 'vitest';
import type {
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedMesh,
  InterleavedBufferAttribute,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
} from 'three';
import { DoubleSide, Matrix4, Quaternion, Vector3 } from 'three';
import { perfilCuerpo } from './disposicion';
import { HITOS_MANDIBULA_FETAL, N_GERMENES, estadoMandibulaFetal } from './estado';
import { Barrido, PERFIL_CAMPANA, campanaEsmalte, perfilCirculo, placaExtruida } from './geometria';
import {
  CartilagoMeckel,
  Condensacion,
  HuesoMandibular,
  Mesenquima,
  NervioAlveolar,
} from './mallas';
import type { PiezaMandibulaFetal } from './mallas';

const TIEMPOS = Array.from({ length: 41 }, (_, i) => i / 40);

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

/** Triángulos de una pieza (las instancias cuentan tantas veces como instancias tienen). */
function triangulos(grupo: Group): number {
  let suma = 0;
  grupo.traverse((o) => {
    const malla = o as Mesh & { count?: number; isInstancedMesh?: boolean };
    const g = malla.geometry as BufferGeometry | undefined;
    if (!g) return;
    const tris = (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
    suma += tris * (malla.isInstancedMesh ? (malla.count ?? 1) : 1);
  });
  return suma;
}

function esVisible(o: Object3D): boolean {
  for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

/**
 * Lo que se dibuja de verdad en un instante. Pase principal: una llamada por malla visible y por grupo si tiene
 * varios materiales; un material transparente de doble cara sin `forceSinglePass` cuenta dos veces (three lo dibuja
 * en dos pasadas, primero las caras de atrás y luego las de delante). Pase de sombras: las mallas que proyectan
 * con la regla de `EntornoRealista` (opacas u opacidad > 0,9, sin `userData.sinSombra`).
 */
function medirDibujo(raices: readonly Object3D[]): {
  llamadas: number;
  triangulos: number;
  llamadasSombra: number;
  triangulosSombra: number;
} {
  const d = { llamadas: 0, triangulos: 0, llamadasSombra: 0, triangulosSombra: 0 };
  for (const raiz of raices) {
    raiz.traverse((o) => {
      const malla = o as Mesh;
      if (!malla.isMesh || !esVisible(o)) return;
      const g = malla.geometry;
      const instancias = (malla as InstancedMesh).isInstancedMesh
        ? (malla as InstancedMesh).count
        : 1;
      const total = g.index ? g.index.count : g.getAttribute('position').count;
      const materiales = (
        Array.isArray(malla.material) ? malla.material : [malla.material]
      ) as Material[];
      const partes =
        Array.isArray(malla.material) && g.groups.length > 0
          ? g.groups.map((gr) => ({ m: materiales[gr.materialIndex ?? 0], cuenta: gr.count }))
          : [{ m: materiales[0], cuenta: total }];
      const primero = materiales[0]!;
      const proyecta = !malla.userData.sinSombra && (!primero.transparent || primero.opacity > 0.9);
      for (const { m, cuenta } of partes) {
        if (!m) continue;
        const tris = (Math.min(cuenta, total) / 3) * instancias;
        const pasadas = m.transparent && m.side === DoubleSide && !m.forceSinglePass ? 2 : 1;
        d.llamadas += pasadas;
        d.triangulos += pasadas * tris;
        if (proyecta) {
          d.llamadasSombra++;
          d.triangulosSombra += tris;
        }
      }
    });
  }
  return d;
}

type Atributo = BufferAttribute | InterleavedBufferAttribute;

function vertice(pos: Atributo, i: number): Vector3 {
  return new Vector3().fromBufferAttribute(pos, i);
}

/** Centro (media de los vértices) de un anillo de `n` vértices que empieza en `primero`. */
function centroAnillo(pos: Atributo, primero: number, n: number): Vector3 {
  const c = new Vector3();
  for (let j = 0; j < n; j++) c.add(vertice(pos, primero + j));
  return c.divideScalar(n);
}

/** Volumen con signo de un abanico que cierra un anillo y mira hacia `fuera`. */
function tapaVirtual(pos: Atributo, primero: number, n: number, fuera: Vector3): number {
  const c = centroAnillo(pos, primero, n);
  let v = 0;
  for (let j = 0; j < n; j++) {
    let b = vertice(pos, primero + j);
    let d = vertice(pos, primero + ((j + 1) % n));
    if (b.clone().sub(c).cross(d.clone().sub(c)).dot(fuera) < 0) [b, d] = [d, b];
    v += c.dot(b.clone().cross(d)) / 6;
  }
  return v;
}

/**
 * Orientación de cada tramo de un barrido: su volumen con signo, cerrado con sus tapas o, si no las tiene, con
 * tapas virtuales que miran hacia fuera a lo largo del barrido (positivo solo si las paredes miran hacia fuera), y
 * la fracción de triángulos de tapa que miran hacia fuera (la del inicio hacia atrás y la del fin hacia delante).
 */
function orientacion(b: Barrido): { volumen: number; tapasFuera: number }[] {
  const pos = b.geometria.getAttribute('position');
  const indices = b.geometria.getIndex()!;
  const n = b.nPerfil;
  return Array.from({ length: b.numeroTramos }, (_, k) => {
    const t = b.datosTramo(k);
    const ultimo = t.primerVertice + t.segmentos * n;
    const atras = centroAnillo(pos, t.primerVertice, n).sub(
      centroAnillo(pos, t.primerVertice + n, n),
    );
    const delante = centroAnillo(pos, ultimo, n).sub(centroAnillo(pos, ultimo - n, n));
    const fin = t.tapas ? t.primerVerticeTapas + 2 * n : ultimo + n;
    let volumen = 0;
    let tapas = 0;
    let fuera = 0;
    for (let i = 0; i < indices.count; i += 3) {
      const ia = indices.getX(i);
      if (ia < t.primerVertice || ia >= fin) continue;
      const a = vertice(pos, ia);
      const bb = vertice(pos, indices.getX(i + 1));
      const c = vertice(pos, indices.getX(i + 2));
      volumen += a.dot(bb.clone().cross(c)) / 6;
      if (t.tapas && ia >= t.primerVerticeTapas) {
        const normal = bb.clone().sub(a).cross(c.clone().sub(a));
        if (normal.lengthSq() < 1e-14) continue;
        tapas++;
        if (normal.dot(ia < t.primerVerticeTapas + n ? atras : delante) > 0) fuera++;
      }
    }
    if (!t.tapas) {
      volumen += tapaVirtual(pos, t.primerVertice, n, atras) + tapaVirtual(pos, ultimo, n, delante);
    }
    return { volumen, tapasFuera: tapas > 0 ? fuera / tapas : 1 };
  });
}

/**
 * Fracción de normales de vértice de las paredes que se alejan del centro de su anillo, en la mitad +X y en la
 * mitad -X (para perfiles convexos: círculo, elipse).
 */
function normalesHaciaFuera(b: Barrido): { masX: number; menosX: number } {
  const pos = b.geometria.getAttribute('position');
  const normal = b.geometria.getAttribute('normal');
  const n = b.nPerfil;
  const masX = [0, 0];
  const menosX = [0, 0];
  for (let k = 0; k < b.numeroTramos; k++) {
    const t = b.datosTramo(k);
    for (let i = 0; i <= t.segmentos; i++) {
      const primero = t.primerVertice + i * n;
      const c = centroAnillo(pos, primero, n);
      for (let j = 0; j < n; j++) {
        const p = vertice(pos, primero + j);
        const lado = p.x >= 0 ? masX : menosX;
        lado[1]!++;
        if (vertice(normal, primero + j).dot(p.sub(c)) > 0) lado[0]!++;
      }
    }
  }
  return { masX: masX[0]! / masX[1]!, menosX: menosX[0]! / menosX[1]! };
}

/**
 * Grano del relieve: repeticiones de la textura por unidad de escena en los dos sentidos de la UV (media por área
 * de los triángulos de los índices `desde` a `desde + cuantos`), con la repetición del material y la escala de la
 * malla.
 */
function grano(
  g: BufferGeometry,
  repetir: { x: number; y: number },
  desde = 0,
  cuantos = Infinity,
  escala = new Vector3(1, 1, 1),
): { u: number; v: number } {
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  const indices = g.getIndex();
  const fin = Math.min(indices ? indices.count : pos.count, desde + cuantos);
  let area = 0;
  let gu = 0;
  let gv = 0;
  for (let i = desde; i + 2 < fin; i += 3) {
    const v = [0, 1, 2].map((k) => (indices ? indices.getX(i + k) : i + k));
    const [a, b, c] = v.map((k) => vertice(pos, k).multiply(escala)) as [Vector3, Vector3, Vector3];
    const e1 = b.clone().sub(a);
    const e2 = c.clone().sub(a);
    const l1 = e1.length();
    if (l1 < 1e-9) continue;
    const x2 = e2.dot(e1) / l1;
    const y2 = e2
      .clone()
      .sub(e1.clone().multiplyScalar(x2 / l1))
      .length();
    if (y2 < 1e-9) continue;
    const d = (k: number, eje: 0 | 1): number =>
      eje === 0
        ? (uv.getX(v[k]!) - uv.getX(v[0]!)) * repetir.x
        : (uv.getY(v[k]!) - uv.getY(v[0]!)) * repetir.y;
    const gradiente = (eje: 0 | 1): number =>
      Math.hypot(d(1, eje) / l1, (d(2, eje) - d(1, eje) * (x2 / l1)) / y2);
    const s = 0.5 * l1 * y2;
    area += s;
    gu += s * gradiente(0);
    gv += s * gradiente(1);
  }
  return { u: gu / area, v: gv / area };
}

describe('Barrido', () => {
  it('reserva anillos y tapas por tramo, con índices válidos y sin NaN una vez escrito', () => {
    const perfil = perfilCirculo(0.5, 8);
    const b = new Barrido(
      8,
      [
        { segmentos: 10, tapas: true },
        { segmentos: 4, tapas: false },
      ],
      perfil,
    );
    expect(b.numeroTramos).toBe(2);
    const vertices = b.geometria.getAttribute('position').count;
    expect(vertices).toBe(11 * 8 + 2 * 8 + 5 * 8);
    const indices = b.geometria.getIndex()!.array;
    for (let i = 0; i < indices.length; i++) expect(indices[i]!).toBeLessThan(vertices);
    b.escribirTramo(0, (i) => ({ centro: [i, 0, 0], n: [0, 0, 1], perfil }));
    b.escribirTramo(1, (i) => ({ centro: [0, i, 5], n: [1, 0, 0], perfil }));
    b.terminar();
    expect(sinNaN(b.geometria.getAttribute('position').array)).toBe(true);
    expect(sinNaN(b.geometria.getAttribute('normal').array)).toBe(true);
    b.liberar();
  });

  it('un tramo con tapas tiene más triángulos que uno sin ellas', () => {
    const con = new Barrido(8, [{ segmentos: 6, tapas: true }]);
    const sin = new Barrido(8, [{ segmentos: 6, tapas: false }]);
    expect(con.geometria.getIndex()!.count).toBeGreaterThan(sin.geometria.getIndex()!.count);
    con.liberar();
    sin.liberar();
  });

  it('triangula la tapa del perfil en U del cuerpo', () => {
    const perfil = perfilCuerpo(1);
    const b = new Barrido(perfil.length, [{ segmentos: 2, tapas: true }], perfil);
    // Un polígono simple de n lados se triangula en n - 2 triángulos, por dos tapas.
    const trisTapas = (b.geometria.getIndex()!.count - 2 * perfil.length * 6) / 3;
    expect(trisTapas).toBe(2 * (perfil.length - 2));
    b.liberar();
  });

  it('escribir un tramo que no existe falla con claridad', () => {
    const b = new Barrido(6, [{ segmentos: 2, tapas: false }]);
    expect(() =>
      b.escribirTramo(3, () => ({ centro: [0, 0, 0], n: [1, 0, 0], perfil: [] })),
    ).toThrow(/tramo/);
    expect(() => b.datosTramo(3)).toThrow(/tramo/);
    b.liberar();
  });

  it('`invertir` da la vuelta a paredes y tapas: con marco zurdo o diestro, todo mira hacia fuera', () => {
    const perfil = perfilCirculo(0.3, 10);
    // Mismo recorrido (a lo largo de +Z) con la normal lateral en +X (marco diestro: X, Y, Z) y en -X (zurdo).
    for (const [n, invertir] of [
      [[1, 0, 0], true],
      [[-1, 0, 0], false],
    ] as const) {
      const b = new Barrido(10, [{ segmentos: 6, tapas: true, invertir }], perfil);
      b.escribirTramo(0, (i) => ({ centro: [0, 0, i * 0.2], n: [n[0], n[1], n[2]], perfil }));
      b.terminar();
      const [o] = orientacion(b);
      expect(o!.volumen).toBeGreaterThan(0);
      expect(o!.tapasFuera).toBe(1);
      b.liberar();
    }
  });

  it('las UV alrededor del perfil van por longitud de arco, en espejo y sin costura', () => {
    // Un rectángulo de 3 × 1 con un punto por esquina y uno a mitad de cada lado largo.
    const perfil = [
      [-1.5, -0.5],
      [0, -0.5],
      [1.5, -0.5],
      [1.5, 0.5],
      [0, 0.5],
      [-1.5, 0.5],
    ] as const;
    const b = new Barrido(perfil.length, [{ segmentos: 1, tapas: false }], perfil);
    const uv = b.geometria.getAttribute('uv');
    // Perímetro 8: los puntos están a 0; 1,5; 3; 4; 5,5 y 7 de longitud.
    expect([0, 1, 2, 3, 4, 5].map((j) => +uv.getX(j).toFixed(4))).toEqual([
      0, 0.375, 0.75, 1, 0.625, 0.25,
    ]);
    b.liberar();
  });
});

describe('orientación de los barridos de la escena (render-07)', () => {
  it.each<[string, () => PiezaMandibulaFetal & { barrido: Barrido }, number, boolean]>([
    ['el mesénquima', () => new Mesenquima(), 0, true],
    ['el cartílago de Meckel', () => new CartilagoMeckel(), 0, true],
    ['el nervio alveolar inferior', () => new NervioAlveolar(), 0, true],
    ['el cuerpo óseo con el hueso completo', () => new HuesoMandibular(), 0.66, false],
    ['el cuerpo óseo al nacer', () => new HuesoMandibular(), 1, false],
  ])('%s: paredes y tapas hacia fuera en las dos mitades', (_, crear, t, perfilConvexo) => {
    const pieza = crear();
    pieza.actualizar(estadoMandibulaFetal(t));
    for (const o of orientacion(pieza.barrido)) {
      expect(o.volumen).toBeGreaterThan(0);
      expect(o.tapasFuera).toBe(1);
    }
    if (perfilConvexo) {
      // Antes, en la mitad +X: 0 de 630 normales hacia fuera en el Meckel y 0 de 590 en el nervio.
      const f = normalesHaciaFuera(pieza.barrido);
      expect(f.masX).toBe(1);
      expect(f.menosX).toBe(1);
    }
    pieza.liberar();
  });

  it('el cuerpo óseo tiene un tramo en la mitad -X y dos (los de la ventana de corte) en la +X', () => {
    const hueso = new HuesoMandibular();
    hueso.actualizar(estadoMandibulaFetal(1));
    const pos = hueso.barrido.geometria.getAttribute('position');
    const lados = Array.from({ length: hueso.barrido.numeroTramos }, (_, k) =>
      Math.sign(vertice(pos, hueso.barrido.datosTramo(k).primerVertice).x),
    );
    expect(lados.filter((x) => x > 0)).toHaveLength(2);
    expect(lados.filter((x) => x < 0)).toHaveLength(1);
    hueso.liberar();
  });
});

describe('placaExtruida', () => {
  it('extruye la silueta a lo largo de X, centrada, con la forma en el plano (z, y)', () => {
    const g = placaExtruida(
      [
        [0, 0],
        [1, 0],
        [1, 2],
        [0, 2],
      ],
      0.4,
    );
    g.computeBoundingBox();
    const caja = g.boundingBox!;
    expect(caja.min.x).toBeCloseTo(-0.2, 6);
    expect(caja.max.x).toBeCloseTo(0.2, 6);
    expect(caja.min.z).toBeCloseTo(0, 6);
    expect(caja.max.z).toBeCloseTo(1, 6);
    expect(caja.max.y).toBeCloseTo(2, 6);
    g.dispose();
  });

  it('escala sus UV (que vienen en unidades de escena)', () => {
    const silueta = [
      [0, 0],
      [1, 0],
      [1, 2],
      [0, 2],
    ] as const;
    const normal = placaExtruida(silueta, 0.4).getAttribute('uv');
    const escalada = placaExtruida(silueta, 0.4, { escalaUv: [0.5, 0.25] }).getAttribute('uv');
    for (let i = 0; i < normal.count; i++) {
      expect(escalada.getX(i)).toBeCloseTo(normal.getX(i) * 0.5, 6);
      expect(escalada.getY(i)).toBeCloseTo(normal.getY(i) * 0.25, 6);
    }
  });
});

describe.each<[string, () => PiezaMandibulaFetal, number]>([
  ['Mesenquima', () => new Mesenquima(), 12_000],
  ['CartilagoMeckel', () => new CartilagoMeckel(), 3_500],
  ['NervioAlveolar', () => new NervioAlveolar(), 2_500],
  ['Condensacion', () => new Condensacion(), 4_000],
  // 15 000 (antes 14 000): la campana en torno (+48 triángulos por germen) y el segundo nódulo sinfisario (+396).
  ['HuesoMandibular', () => new HuesoMandibular(), 15_000],
])('%s', (_, crear, presupuesto) => {
  it('cabe en el presupuesto de polígonos', () => {
    const pieza = crear();
    expect(triangulos(pieza.grupo)).toBeGreaterThan(50);
    expect(triangulos(pieza.grupo)).toBeLessThan(presupuesto);
    pieza.liberar();
  });

  it('no produce NaN en ningún instante ni deja posiciones o escalas inválidas', () => {
    const pieza = crear();
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoMandibulaFetal(t));
      pieza.grupo.traverse((o) => {
        for (const v of [
          o.position.x,
          o.position.y,
          o.position.z,
          o.scale.x,
          o.scale.y,
          o.scale.z,
        ]) {
          expect(Number.isFinite(v), `t = ${t}`).toBe(true);
        }
      });
      for (const g of geometriasDe(pieza.grupo)) {
        expect(sinNaN(g.getAttribute('position').array), `t = ${t}`).toBe(true);
      }
    }
    pieza.liberar();
  });

  it('actualizar es determinista: la misma t da lo mismo, vaya lo que vaya antes', () => {
    const pieza = crear();
    const foto = (): number[] => {
      const datos: number[] = [];
      pieza.grupo.traverse((o) => {
        datos.push(o.visible ? 1 : 0, o.scale.x, o.scale.y, o.position.y);
        const m = o as Mesh & { instanceMatrix?: { array: ArrayLike<number> } };
        if (m.instanceMatrix) datos.push(...Array.from(m.instanceMatrix.array));
      });
      for (const g of geometriasDe(pieza.grupo))
        datos.push(...Array.from(g.getAttribute('position').array));
      return datos;
    };
    pieza.actualizar(estadoMandibulaFetal(0.61));
    const antes = foto();
    pieza.actualizar(estadoMandibulaFetal(0.05));
    pieza.actualizar(estadoMandibulaFetal(0.97));
    pieza.actualizar(estadoMandibulaFetal(0.61));
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
});

describe('la escena completa', () => {
  const crearTodas = () => [
    new Mesenquima(),
    new CartilagoMeckel(),
    new NervioAlveolar(),
    new Condensacion(),
    new HuesoMandibular(),
  ];

  it('en el peor instante cabe en 40 000 triángulos y 40 llamadas (con la doble pasada) y 40 de sombras', () => {
    const piezas = crearTodas();
    const peor = { llamadas: 0, triangulos: 0, llamadasSombra: 0, triangulosSombra: 0 };
    for (let i = 0; i <= 200; i++) {
      for (const p of piezas) p.actualizar(estadoMandibulaFetal(i / 200));
      const d = medirDibujo(piezas.map((p) => p.grupo));
      for (const k of Object.keys(peor) as (keyof typeof peor)[]) peor[k] = Math.max(peor[k], d[k]);
    }
    expect(peor.triangulos).toBeGreaterThan(10_000);
    expect(peor.triangulos).toBeLessThan(40_000);
    expect(peor.llamadas).toBeLessThan(40);
    expect(peor.llamadasSombra).toBeLessThan(40);
    for (const p of piezas) p.liberar();
  });

  it('las células translúcidas escriben profundidad cuando se ven y van en una pasada (render-06)', () => {
    const mesenquima = new Mesenquima();
    const condensacion = new Condensacion();
    const material = (grupo: Group, nombre: string): Material =>
      (grupo.getObjectByName(nombre) as Mesh).material as Material;
    const celulas = material(mesenquima.grupo, 'celulas_mesenquima');
    const masa = material(mesenquima.grupo, 'masa_mesenquima');
    const apretadas = material(condensacion.grupo, 'celulas_condensacion');
    mesenquima.actualizar(estadoMandibulaFetal(HITOS_MANDIBULA_FETAL.mesenquima));
    condensacion.actualizar(estadoMandibulaFetal(HITOS_MANDIBULA_FETAL.condensacion));
    expect(celulas.depthWrite).toBe(true);
    expect(apretadas.depthWrite).toBe(true);
    // La masa sigue sin escribirla: lo de dentro se ve a través.
    expect(masa.depthWrite).toBe(false);
    expect(celulas.forceSinglePass).toBe(true);
    expect(apretadas.forceSinglePass).toBe(true);
    // Mientras aparecen, casi invisibles, no la escriben (no abren huecos en la masa).
    condensacion.actualizar(estadoMandibulaFetal(0.09));
    expect(apretadas.opacity).toBeLessThan(0.5);
    expect(apretadas.depthWrite).toBe(false);
    mesenquima.liberar();
    condensacion.liberar();
  });

  it('visibilidad por fase: mesénquima y Meckel al principio; hueso, rama y cartílagos al final', () => {
    const [mesenquima, meckel, nervio, condensacion, hueso] = crearTodas();
    const todas = [mesenquima!, meckel!, nervio!, condensacion!, hueso!];
    const visibles = (t: number) => {
      for (const p of todas) p.actualizar(estadoMandibulaFetal(t));
      return todas.map((p) => p.grupo.visible);
    };
    expect(visibles(HITOS_MANDIBULA_FETAL.mesenquima)).toEqual([true, true, true, false, false]);
    expect(visibles(HITOS_MANDIBULA_FETAL.condensacion)).toEqual([true, true, true, true, false]);
    expect(visibles(HITOS_MANDIBULA_FETAL.centro)).toEqual([true, true, true, true, true]);
    expect(visibles(HITOS_MANDIBULA_FETAL.extension)).toEqual([true, true, true, false, true]);
    expect(visibles(HITOS_MANDIBULA_FETAL.nacimiento)).toEqual([false, true, true, false, true]);
    for (const p of todas) p.liberar();
  });

  it('el grano del hueso es el mismo en el cuerpo y en la rama, y redondo en la cara de corte y el Meckel', () => {
    const hueso = new HuesoMandibular();
    hueso.actualizar(estadoMandibulaFetal(1));
    const cuerpo = hueso.grupo.getObjectByName('cuerpo_oseo') as Mesh;
    const [matHueso, matCorte] = cuerpo.material as MeshPhysicalMaterial[];
    const [paredes, tapas] = cuerpo.geometry.groups;
    const repetir = matHueso!.bumpMap!.repeat;
    const enCuerpo = grano(cuerpo.geometry, repetir, paredes!.start, paredes!.count);
    const rama = hueso.grupo.getObjectByName('placa_rama') as Mesh;
    rama.updateWorldMatrix(true, false);
    const enRama = grano(rama.geometry, repetir, 0, Infinity, rama.getWorldScale(new Vector3()));
    const enCorte = grano(cuerpo.geometry, matCorte!.bumpMap!.repeat, tapas!.start, tapas!.count);
    // Antes, la rama iba a 4-6 repeticiones por unidad y el cuerpo, a 1,5-2,7, con el mismo material.
    for (const g of [enCuerpo, enRama]) {
      for (const sentido of [g.u, g.v]) {
        expect(sentido).toBeGreaterThan(1.5);
        expect(sentido).toBeLessThan(2.1);
      }
    }
    expect(enCorte.u / enCorte.v).toBeCloseTo(1, 1);
    const meckel = new CartilagoMeckel();
    meckel.actualizar(estadoMandibulaFetal(0));
    const varilla = meckel.grupo.getObjectByName('varilla_meckel') as Mesh;
    const enMeckel = grano(
      varilla.geometry,
      (varilla.material as MeshPhysicalMaterial).bumpMap!.repeat,
    );
    // Antes, 8,8 alrededor frente a 0,9-1,4 a lo largo: vetas en un cartílago hialino.
    expect(Math.max(enMeckel.u, enMeckel.v) / Math.min(enMeckel.u, enMeckel.v)).toBeLessThan(1.6);
    hueso.liberar();
    meckel.liberar();
  });

  it('cartílagos secundarios: el condilar nace en cono y acaba en capa; dos nódulos sinfisarios', () => {
    const hueso = new HuesoMandibular();
    const cartilagos = hueso.grupo.getObjectByName('cartilagos_secundarios') as InstancedMesh;
    expect(cartilagos.count).toBe(6);
    const instancia = (i: number) => {
      const m = new Matrix4();
      cartilagos.getMatrixAt(i, m);
      const p = new Vector3();
      const e = new Vector3();
      m.decompose(p, new Quaternion(), e);
      return { p, e };
    };
    hueso.actualizar(estadoMandibulaFetal(HITOS_MANDIBULA_FETAL.cartilagos_secundarios));
    const cono = instancia(0).e;
    expect(cono.y).toBeGreaterThan(1.4 * cono.x);
    expect(instancia(4).p.x).toBeGreaterThan(0.05);
    expect(instancia(5).p.x).toBeLessThan(-0.05);
    hueso.actualizar(estadoMandibulaFetal(HITOS_MANDIBULA_FETAL.nacimiento));
    const capa = instancia(0).e;
    expect(capa.y).toBeLessThan(capa.x);
    hueso.liberar();
  });

  it('el cuerpo óseo crece: cuanto más tarde, más extenso en el espacio', () => {
    const hueso = new HuesoMandibular();
    const extension = (t: number): number => {
      hueso.actualizar(estadoMandibulaFetal(t));
      const g = geometriasDe(hueso.grupo)[0]!;
      g.computeBoundingBox();
      return g.boundingBox!.max.z - g.boundingBox!.min.z;
    };
    const centro = extension(HITOS_MANDIBULA_FETAL.centro);
    const medio = extension(HITOS_MANDIBULA_FETAL.extension);
    const completo = extension(HITOS_MANDIBULA_FETAL.nacimiento);
    expect(centro).toBeLessThan(medio);
    expect(medio).toBeLessThan(completo);
    expect(completo).toBeGreaterThan(4);
    hueso.liberar();
  });
});

describe('germen dentario en campana (realismo-18)', () => {
  /** Radio de la cara interior (cóncava) de la campana a la altura `y` del torno; null fuera de ella. */
  function radioInterior(y: number): number | null {
    const dentro = PERFIL_CAMPANA.slice(5);
    for (let i = 0; i + 1 < dentro.length; i++) {
      const [r0, y0] = dentro[i]!;
      const [r1, y1] = dentro[i + 1]!;
      if (y <= y0 && y >= y1) return r0 + ((r1 - r0) * (y0 - y)) / (y0 - y1 || 1);
    }
    return null;
  }

  it('el órgano del esmalte es convexo por fuera, hueco por dentro y abierto abajo', () => {
    const g = campanaEsmalte(16);
    expect(g.getIndex()!.count / 3).toBe(288);
    const pos = g.getAttribute('position');
    let cuspide = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      if (r < 0.01) cuspide = Math.max(cuspide, pos.getY(i));
      // Abajo solo queda el borde del asa cervical: abierto.
      if (pos.getY(i) < -0.32) expect(r).toBeGreaterThan(0.85);
    }
    expect(cuspide).toBeCloseTo(1, 6);
    // El hueco de la papila: la cara interior baja desde 0,72, por debajo de la cúspide.
    expect(radioInterior(0.3)).toBeCloseTo(0.72, 6);
    g.dispose();
  });

  it('la papila queda dentro de la campana sin atravesarla y asoma por el asa cervical', () => {
    const hueso = new HuesoMandibular();
    hueso.actualizar(estadoMandibulaFetal(HITOS_MANDIBULA_FETAL.nacimiento));
    const papilas = hueso.grupo.getObjectByName('germenes_dentarios') as InstancedMesh;
    const campanas = hueso.grupo.getObjectByName('campanas_esmalte') as InstancedMesh;
    const m = new Matrix4();
    const pieza = (malla: InstancedMesh, i: number) => {
      malla.getMatrixAt(i, m);
      const p = new Vector3();
      const e = new Vector3();
      m.decompose(p, new Quaternion(), e);
      return { p, e };
    };
    for (let i = 0; i < 2 * N_GERMENES; i++) {
      const papila = pieza(papilas, i);
      const campana = pieza(campanas, i);
      let asoma = false;
      // Meridiano de la papila, en las coordenadas del torno de la campana.
      for (let a = 0; a <= 24; a++) {
        const fi = (a / 24) * Math.PI;
        const y = (papila.p.y + papila.e.y * Math.cos(fi) - campana.p.y) / campana.e.y;
        const r = (papila.e.x * Math.sin(fi)) / campana.e.x;
        expect(y).toBeLessThan(0.72);
        const limite = radioInterior(y);
        if (limite === null) asoma ||= y < -0.38;
        else expect(r).toBeLessThan(limite);
      }
      expect(asoma).toBe(true);
    }
    hueso.liberar();
  });
});
