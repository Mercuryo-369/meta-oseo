/**
 * Piezas comunes de los modelos de la exploración 3D construidos por código que sustituyen a las ilustraciones de
 * las multicapa (`hueso_capas`, `osteona`, `hueso_entretejido_laminar`; registro en `modelosPorCodigo.ts`).
 *
 * Todo trabaja en unidades del modelo y con UV en unidades (no de 0 a 1 por pieza): la repetición del relieve de
 * cada material se fija POR UNIDAD y el grano mide lo mismo en todas las piezas (docs/realismo-3d.md, "Escala del
 * relieve"). Las piezas planas se construyen en el plano XY local, mirando a +Z (`h` es la altura sobre ese plano), y
 * `marcoCara` las lleva a cualquier cara de un bloque.
 */
import type {
  BufferGeometry,
  Material,
  MeshPhysicalMaterialParameters,
  Object3D,
  Euler,
  MeshPhysicalMaterial,
} from 'three';
import {
  BufferAttribute,
  BufferGeometry as Geometria,
  CatmullRomCurve3,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Path,
  Shape,
  ShapeGeometry,
  ShapeUtils,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { TipoTejido } from './procedural/realismo';
import { materialOrganico } from './procedural/realismo';
import type { Vec3 } from './modelosPorCodigo';

export type Vec2 = [number, number];

/* ----- Números ----- */

export const suave = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};
export const mezclar = (a: number, b: number, k: number): number => a + (b - a) * k;

export function muestras(desde: number, hasta: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => desde + ((hasta - desde) * i) / n);
}

/** Generador pseudoaleatorio con semilla (mulberry32): el modelo sale igual en cada carga y en las pruebas. */
export function aleatorio(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Curva de Bézier cuadrática muestreada en `n` tramos. */
export function bezier(p0: Vec2, p1: Vec2, p2: Vec2, n: number): Vec2[] {
  return muestras(0, 1, n).map((t) => {
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]];
  });
}

/**
 * Parte una polilínea en los tramos que cumplen `dentro` (los puntos de fuera se descartan). Sirve para recortar
 * trabéculas, laminillas antiguas y canalículos contra las estructuras que no deben cruzar.
 */
export function recortar(puntos: readonly Vec2[], dentro: (p: Vec2) => boolean): Vec2[][] {
  const tramos: Vec2[][] = [];
  let actual: Vec2[] = [];
  for (const p of puntos) {
    if (dentro(p)) actual.push(p);
    else {
      if (actual.length > 1) tramos.push(actual);
      actual = [];
    }
  }
  if (actual.length > 1) tramos.push(actual);
  return tramos;
}

/** Distancia de un punto a un segmento. */
export function distanciaASegmento(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const largo2 = dx * dx + dy * dy;
  const t =
    largo2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / largo2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Punto de una lista más cercano a `objetivo` (para poner una etiqueta sobre una pieza generada). */
export function masCercano<T>(lista: readonly T[], posicion: (x: T) => Vec2, objetivo: Vec2): T {
  if (lista.length === 0) throw new Error('No hay piezas entre las que elegir.');
  let mejor: T = lista[0] as T;
  let distancia = Infinity;
  for (const x of lista) {
    const [px, py] = posicion(x);
    const d = Math.hypot(px - objetivo[0], py - objetivo[1]);
    if (d < distancia) {
      distancia = d;
      mejor = x;
    }
  }
  return mejor;
}

/* ----- Materiales y piezas con nombre ----- */

/**
 * Material de un tejido (`materialOrganico`) con el relieve a `repetir` veces por unidad del modelo (las UV van en
 * unidades) y filtrado anisótropo (las caras que se ven de lado no se emborronan). Doble cara salvo que `extra`
 * diga otra cosa: three invierte la normal de la cara de atrás, así que la luz es correcta por los dos lados.
 */
export function material(
  color: string,
  tipo: TipoTejido,
  repetir: number | Vec2 = 1,
  extra: MeshPhysicalMaterialParameters = {},
): MeshPhysicalMaterial {
  const m = materialOrganico(color, tipo, extra);
  if (m.bumpMap) {
    const [u, v] = typeof repetir === 'number' ? [repetir, repetir] : repetir;
    m.bumpMap.repeat.set(u, v);
    m.bumpMap.anisotropy = 4;
  }
  return m;
}

/** Gira el relieve del material (en radianes): las vetas de las fibras dejan de ir a lo largo de la V. */
export function girarRelieve(m: MeshPhysicalMaterial, angulo: number): MeshPhysicalMaterial {
  if (m.bumpMap) m.bumpMap.rotation = angulo;
  return m;
}

export function malla(geometria: BufferGeometry, mat: Material, nombre: string): Mesh {
  const m = new Mesh(geometria, mat);
  m.name = nombre;
  return m;
}

/** Varias copias de una geometría (lagunas, células): una sola llamada de dibujo. */
export function instancias(
  geometria: BufferGeometry,
  mat: Material,
  matrices: readonly Matrix4[],
  nombre: string,
): InstancedMesh {
  const m = new InstancedMesh(geometria, mat, Math.max(1, matrices.length));
  m.name = nombre;
  matrices.forEach((x, i) => m.setMatrixAt(i, x));
  m.count = matrices.length;
  m.instanceMatrix.needsUpdate = true;
  m.computeBoundingBox();
  m.computeBoundingSphere();
  return m;
}

/** Región del modelo: un grupo con el id de su nodo del catálogo (o una pieza de contexto sin nodo). */
export function region(nombre: string, ...hijos: Object3D[]): Group {
  const g = new Group();
  g.name = nombre;
  if (hijos.length > 0) g.add(...hijos);
  return g;
}

/* ----- Geometría ----- */

/**
 * Une geometrías del mismo material y libera las partes. Todas quedan con posición, normal y UV (y color si todas
 * lo traen); si alguna no está indexada, ninguna lo queda (`mergeGeometries` exige lo mismo en todas).
 */
export function unir(geos: BufferGeometry[]): BufferGeometry {
  if (geos.length === 0) throw new Error('No hay piezas que unir.');
  if (geos.length === 1) return geos[0]!;
  const conColor = geos.every((g) => g.getAttribute('color'));
  const indexadas = geos.every((g) => g.index);
  const lista = geos.map((g) => {
    const x = indexadas || !g.index ? g : g.toNonIndexed();
    for (const nombre of Object.keys(x.attributes)) {
      if (!['position', 'normal', 'uv', ...(conColor ? ['color'] : [])].includes(nombre))
        x.deleteAttribute(nombre);
    }
    if (!x.getAttribute('normal')) x.computeVertexNormals();
    return x;
  });
  const unida = mergeGeometries(lista, false);
  for (const g of new Set([...geos, ...lista])) g.dispose();
  if (!unida) throw new Error('No se pudieron unir las piezas del modelo.');
  return unida;
}

/** UV de una geometría a partir de dos coordenadas de su posición (en unidades). */
export function uvDesde(
  g: BufferGeometry,
  u: 'x' | 'y' | 'z',
  v: 'x' | 'y' | 'z',
  escalaU = 1,
): BufferGeometry {
  const pos = g.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  const leer = { x: pos.getX.bind(pos), y: pos.getY.bind(pos), z: pos.getZ.bind(pos) };
  for (let i = 0; i < pos.count; i++) uv.set([leer[u](i) * escalaU, leer[v](i)], i * 2);
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  return g;
}

function forma(contorno: readonly Vec2[]): Shape {
  return new Shape(contorno.map(([x, y]) => new Vector2(x, y)));
}

/** Polígono plano (con agujeros opcionales) a la altura `h`, mirando a +Z. UV = (x, y). */
export function cara(
  contorno: readonly Vec2[],
  h = 0,
  agujeros: readonly (readonly Vec2[])[] = [],
): BufferGeometry {
  const s = forma(contorno);
  for (const a of agujeros) s.holes.push(new Path(a.map(([x, y]) => new Vector2(x, y))));
  const g = new ShapeGeometry(s, 1);
  g.translate(0, 0, h);
  return g;
}

/** ¿Va el contorno en sentido horario? (Área negativa, con Y hacia arriba.) */
export function esHorario(contorno: readonly Vec2[]): boolean {
  return ShapeUtils.isClockWise(contorno.map(([x, y]) => new Vector2(x, y)));
}

/**
 * Paredes verticales de un contorno cerrado, de `hArriba` a `hAbajo`. La normal es (dy, −dx) de cada lado: hacia
 * fuera si el contorno va en sentido antihorario y hacia dentro si va en sentido horario (las paredes de un hueco
 * miran al hueco). Normales promediadas entre lados vecinos: un contorno curvo no se ve facetado. UV: (recorrido
 * del contorno, altura).
 */
export function paredes(puntos: readonly Vec2[], hArriba: number, hAbajo: number): BufferGeometry {
  const n = puntos.length;
  const normalLado = (i: number): Vec2 => {
    const a = puntos[i]!;
    const b = puntos[(i + 1) % n]!;
    const largo = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[1] - a[1]) / largo, -(b[0] - a[0]) / largo];
  };
  const posiciones: number[] = [];
  const normales: number[] = [];
  const uv: number[] = [];
  let recorrido = 0;
  for (let i = 0; i <= n; i++) {
    const k = i % n;
    const p = puntos[k]!;
    if (i > 0) {
      const q = puntos[i - 1]!;
      recorrido += Math.hypot(p[0] - q[0], p[1] - q[1]);
    }
    const [ax, ay] = normalLado((k - 1 + n) % n);
    const [bx, by] = normalLado(k);
    const largo = Math.hypot(ax + bx, ay + by) || 1;
    const nx = (ax + bx) / largo;
    const ny = (ay + by) / largo;
    posiciones.push(p[0], p[1], hArriba, p[0], p[1], hAbajo);
    normales.push(nx, ny, 0, nx, ny, 0);
    uv.push(recorrido, hArriba, recorrido, hAbajo);
  }
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    const b = a + 2;
    // Con la normal (dy, −dx), el triángulo (arriba, abajo, siguiente arriba) mira hacia ella.
    indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(new Float32Array(posiciones), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(normales), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(indices);
  return g;
}

/**
 * Prisma recto de un contorno (con huecos opcionales): la tapa a la altura `hArriba` (mira a +Z) y las paredes
 * hasta `hAbajo`, las de fuera hacia fuera y las de los huecos hacia el hueco. Sin fondo: el prisma se apoya en
 * otra pieza.
 */
export function prisma(
  contorno: readonly Vec2[],
  hArriba: number,
  hAbajo: number,
  huecos: readonly (readonly Vec2[])[] = [],
): BufferGeometry {
  const fuera = esHorario(contorno) ? [...contorno].reverse() : [...contorno];
  const dentro = huecos.map((h) => (esHorario(h) ? [...h] : [...h].reverse()));
  return unir([
    cara(fuera, hArriba, huecos),
    paredes(fuera, hArriba, hAbajo),
    ...dentro.map((h) => paredes(h, hArriba, hAbajo)),
  ]);
}

/**
 * Desplaza un contorno CERRADO a lo largo de su normal izquierda: hacia dentro si va en sentido antihorario (con
 * `d` positivo). Para la capa que tapiza un hueco por dentro.
 */
export function desplazarCerrado(contorno: readonly Vec2[], d: number): Vec2[] {
  const n = contorno.length;
  return contorno.map((p, i): Vec2 => {
    const a = contorno[(i - 1 + n) % n]!;
    const b = contorno[(i + 1) % n]!;
    const largo = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [p[0] - ((b[1] - a[1]) / largo) * d, p[1] + ((b[0] - a[0]) / largo) * d];
  });
}

/** ¿Está el punto dentro del polígono? (Regla par-impar.) */
export function dentroDePoligono([x, y]: Vec2, poligono: readonly Vec2[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i]!;
    const [xj, yj] = poligono[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/** Distancia mínima entre dos polígonos que no se cortan (de vértice a lado, en los dos sentidos). */
export function distanciaEntrePoligonos(a: readonly Vec2[], b: readonly Vec2[]): number {
  let minimo = Infinity;
  const recorrer = (p: readonly Vec2[], q: readonly Vec2[]) => {
    for (const v of p) {
      for (let i = 0; i < q.length; i++) {
        const d = distanciaASegmento(v, q[i]!, q[(i + 1) % q.length]!);
        if (d < minimo) minimo = d;
      }
    }
  };
  recorrer(a, b);
  recorrer(b, a);
  return minimo;
}

/**
 * Contorno de un trazo de ancho `ancho` (fijo o en función de t, de 0 a 1) a lo largo de una polilínea, con los
 * extremos redondeados.
 */
export function trazo(
  puntos: readonly Vec2[],
  ancho: number | ((t: number) => number),
  extremos = 4,
): Vec2[] {
  const n = puntos.length;
  const w = (i: number): number => (typeof ancho === 'number' ? ancho : ancho(i / (n - 1))) / 2;
  const tangente = (i: number): Vec2 => {
    const a = puntos[Math.max(0, i - 1)]!;
    const b = puntos[Math.min(n - 1, i + 1)]!;
    const largo = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / largo, (b[1] - a[1]) / largo];
  };
  const izquierda: Vec2[] = [];
  const derecha: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const [tx, ty] = tangente(i);
    const p = puntos[i]!;
    izquierda.push([p[0] - ty * w(i), p[1] + tx * w(i)]);
    derecha.push([p[0] + ty * w(i), p[1] - tx * w(i)]);
  }
  const tapa = (i: number, signo: 1 | -1): Vec2[] => {
    const [tx, ty] = tangente(i);
    const p = puntos[i]!;
    const base = Math.atan2(-tx, ty); // dirección de la normal derecha (ty, −tx)
    return muestras(0, Math.PI, extremos)
      .slice(1, -1)
      .map((a) => {
        const ang = base + signo * a;
        return [p[0] + Math.cos(ang) * w(i), p[1] + Math.sin(ang) * w(i)] as Vec2;
      });
  };
  // Derecha → izquierda por el final (giro por delante) y vuelta por el principio (giro por detrás).
  return [...derecha, ...tapa(n - 1, 1), ...izquierda.reverse(), ...tapa(0, -1).reverse()];
}

/** Cinta plana (canalículo, fibra fina) de ancho fijo a lo largo de una polilínea, a la altura `h`, mirando a +Z. */
export function cinta(puntos: readonly Vec2[], ancho: number, h: number): BufferGeometry {
  const n = puntos.length;
  const posiciones = new Float32Array(n * 2 * 3);
  const normales = new Float32Array(n * 2 * 3);
  const uv = new Float32Array(n * 2 * 2);
  let recorrido = 0;
  for (let i = 0; i < n; i++) {
    const a = puntos[Math.max(0, i - 1)]!;
    const b = puntos[Math.min(n - 1, i + 1)]!;
    const largo = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (-(b[1] - a[1]) / largo) * (ancho / 2);
    const ny = ((b[0] - a[0]) / largo) * (ancho / 2);
    const p = puntos[i]!;
    if (i > 0) recorrido += Math.hypot(p[0] - puntos[i - 1]![0], p[1] - puntos[i - 1]![1]);
    posiciones.set([p[0] + nx, p[1] + ny, h, p[0] - nx, p[1] - ny, h], i * 6);
    normales.set([0, 0, 1, 0, 0, 1], i * 6);
    uv.set([recorrido, 0, recorrido, ancho], i * 4);
  }
  const indices: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(posiciones, 3));
  g.setAttribute('normal', new BufferAttribute(normales, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(indices);
  return g;
}

/**
 * Anillo plano alrededor de (cx, cy), entre `r1` y `r2`, en el arco `theta0` + `arco` (desde +X, en sentido
 * antihorario), a la altura `h`, mirando a +Z. UV = (x, y). `desplazamiento(θ)` se suma a los dos radios (o solo al
 * exterior, sin `desplazarInterior`): un contorno festoneado.
 */
export function anilloPlano(
  cx: number,
  cy: number,
  r1: number,
  r2: number,
  h: number,
  theta0 = 0,
  arco = Math.PI * 2,
  segmentos = 64,
  desplazamiento: (theta: number) => number = () => 0,
  desplazarInterior = true,
): BufferGeometry {
  const n = Math.max(3, Math.ceil((segmentos * arco) / (Math.PI * 2)));
  const posiciones = new Float32Array((n + 1) * 2 * 3);
  const normales = new Float32Array((n + 1) * 2 * 3);
  const uv = new Float32Array((n + 1) * 2 * 2);
  for (let i = 0; i <= n; i++) {
    const t = theta0 + (arco * i) / n;
    const d = desplazamiento(t);
    const c = Math.cos(t);
    const s = Math.sin(t);
    const d1 = desplazarInterior ? d : 0;
    const x1 = cx + (r1 + d1) * c;
    const y1 = cy + (r1 + d1) * s;
    const x2 = cx + (r2 + d) * c;
    const y2 = cy + (r2 + d) * s;
    posiciones.set([x1, y1, h, x2, y2, h], i * 6);
    normales.set([0, 0, 1, 0, 0, 1], i * 6);
    uv.set([x1, y1, x2, y2], i * 4);
  }
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(posiciones, 3));
  g.setAttribute('normal', new BufferAttribute(normales, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(indices);
  return g;
}

/**
 * Tubo a lo largo de una curva suave por `puntos`, de radio `radio` y afinado en los extremos (`afinar` es la
 * fracción del largo en la que el radio crece desde casi cero): un haz de fibras o un vaso que termina sin boca
 * abierta.
 */
export function tubo(
  puntos: readonly Vec3[],
  radio: number,
  segmentos = 24,
  radiales = 8,
  afinar = 0,
): BufferGeometry {
  const curva = new CatmullRomCurve3(puntos.map((p) => new Vector3(...p)));
  const g = new TubeGeometry(curva, segmentos, radio, radiales, false);
  if (afinar > 0) {
    const pos = g.getAttribute('position');
    const centro = new Vector3();
    const v = new Vector3();
    for (let i = 0; i <= segmentos; i++) {
      const t = i / segmentos;
      const k = Math.max(0.12, suave(Math.min(t, 1 - t) / afinar));
      curva.getPointAt(t, centro);
      for (let j = 0; j <= radiales; j++) {
        const idx = i * (radiales + 1) + j;
        v.fromBufferAttribute(pos, idx).sub(centro).multiplyScalar(k).add(centro);
        pos.setXYZ(idx, v.x, v.y, v.z);
      }
    }
    pos.needsUpdate = true;
  }
  return g;
}

/**
 * Pared de un cilindro de eje Z (abierto), de radio `r` alrededor de (cx, cy), de `z0` a `z1`, con las normales
 * hacia fuera. UV en unidades: (arco, z).
 */
export function cilindroZ(
  cx: number,
  cy: number,
  r: number,
  z0: number,
  z1: number,
  segmentos = 48,
  theta0 = 0,
  arco = Math.PI * 2,
): BufferGeometry {
  const n = Math.max(3, Math.ceil((segmentos * arco) / (Math.PI * 2)));
  const posiciones = new Float32Array((n + 1) * 2 * 3);
  const normales = new Float32Array((n + 1) * 2 * 3);
  const uv = new Float32Array((n + 1) * 2 * 2);
  for (let i = 0; i <= n; i++) {
    const t = theta0 + (arco * i) / n;
    const c = Math.cos(t);
    const s = Math.sin(t);
    posiciones.set([cx + r * c, cy + r * s, z0, cx + r * c, cy + r * s, z1], i * 6);
    normales.set([c, s, 0, c, s, 0], i * 6);
    uv.set([t * r, z0, t * r, z1], i * 4);
  }
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    // (abajo, siguiente abajo, arriba): con θ creciente y z hacia arriba, mira hacia fuera.
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(posiciones, 3));
  g.setAttribute('normal', new BufferAttribute(normales, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(indices);
  return g;
}

/** Caja alineada con los ejes (sus seis caras, mirando hacia fuera), con UV en unidades en cada cara. */
export function caja([x0, y0, z0]: Vec3, [x1, y1, z1]: Vec3): BufferGeometry {
  const plano = (ancho: number, alto: number, marco: Matrix4): BufferGeometry => {
    const g = cara(
      [
        [0, 0],
        [ancho, 0],
        [ancho, alto],
        [0, alto],
      ],
      0,
    );
    return enCara(g, marco);
  };
  return unir([
    plano(x1 - x0, y1 - y0, marcoCara([x0, y0, z1], [1, 0, 0], [0, 1, 0])), // delante (+Z)
    plano(x1 - x0, y1 - y0, marcoCara([x1, y0, z0], [-1, 0, 0], [0, 1, 0])), // detrás (−Z)
    plano(z1 - z0, y1 - y0, marcoCara([x1, y0, z1], [0, 0, -1], [0, 1, 0])), // derecha (+X)
    plano(z1 - z0, y1 - y0, marcoCara([x0, y0, z0], [0, 0, 1], [0, 1, 0])), // izquierda (−X)
    plano(x1 - x0, z1 - z0, marcoCara([x0, y1, z1], [1, 0, 0], [0, 0, -1])), // arriba (+Y)
    plano(x1 - x0, z1 - z0, marcoCara([x0, y0, z0], [1, 0, 0], [0, 0, 1])), // abajo (−Y)
  ]);
}

/* ----- Caras de un bloque y giro del modelo ----- */

/**
 * Matriz que lleva el plano XY local (con su +Z, la altura `h`) a una cara: `u` y `v` son los ejes de la cara y
 * su normal es u × v. Por ejemplo, la cara derecha de un bloque (normal +X) es u = (0, 0, −1), v = (0, 1, 0).
 */
export function marcoCara(origen: Vec3, u: Vec3, v: Vec3): Matrix4 {
  const eu = new Vector3(...u);
  const ev = new Vector3(...v);
  const n = new Vector3().crossVectors(eu, ev);
  return new Matrix4().makeBasis(eu, ev, n).setPosition(...origen);
}

/** Aplica un marco a una geometría hecha en el plano XY local. */
export function enCara(g: BufferGeometry, marco: Matrix4): BufferGeometry {
  g.applyMatrix4(marco);
  return g;
}

/** Punto (u, v, h) de una cara, en unidades del modelo. */
export function puntoEnCara(marco: Matrix4, u: number, v: number, h = 0): Vec3 {
  const p = new Vector3(u, v, h).applyMatrix4(marco);
  return [p.x, p.y, p.z];
}

/** Normal de una cara (el +Z local llevado por el marco). */
export function normalDeCara(marco: Matrix4): Vec3 {
  const n = new Vector3(0, 0, 1).transformDirection(marco);
  return [n.x, n.y, n.z];
}

/** Gira un punto o una dirección con el mismo giro que el grupo del modelo (orden XYZ de three). */
export function girar(p: Vec3, giro: Euler): Vec3 {
  const v = new Vector3(...p).applyEuler(giro);
  return [v.x, v.y, v.z];
}
