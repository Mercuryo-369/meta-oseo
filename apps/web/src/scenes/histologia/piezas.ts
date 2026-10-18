/**
 * Piezas de los modelos histológicos que se construyen por código para la exploración 3D (`modelosPorCodigo.ts`):
 * un bloque de tejido cortado por un plano (la cara de corte, z = 0, mira a la cámara) con su profundidad detrás.
 * Las usan `osteoide` (m3_multicapa_osteoide) y `red_lacuno_canalicular` (m3_multicapa_osteocito), que sustituyen a
 * las ilustraciones de esas multicapa.
 *
 *  - Células: esferoides deformados (`esferoide`), de elipsoide a superelipsoide (cúbico redondeado), con una forma
 *    irregular y, si la célula queda cortada por el plano, aplanados contra él (se ve su cara de corte: citoplasma y
 *    núcleo, como en un corte histológico).
 *  - Cavidades (lagunas, bolsas, conductos): cuencos detrás del plano (`cuenco`) cuyo borde coincide con el agujero
 *    de la cara de corte (`contornoCuenco`), así que la cavidad se ve hueca.
 *  - Caras planas con agujeros (`cara`, `caraTrasera`, `plano`), tubos (procesos, fibras, canalículos), varillas,
 *    conos, medias cañas (vasos y conductos abiertos a lo largo) y eritrocitos bicóncavos.
 *  - Texturas de color por código: las láminas del hueso laminar (`texturaLaminas`) y los haces irregulares del hueso
 *    inmaduro (`texturaEntretejida`). Van en `map`, que multiplica el color; el relieve sigue en `bumpMap`.
 *
 * Todo es determinista (generador congruencial con semilla) y sin descargas. Las UV van en unidades del modelo:
 * cada material fija la repetición de su relieve (`material`).
 */
import type { BufferGeometry, MeshPhysicalMaterialParameters, MeshPhysicalMaterial } from 'three';
import {
  BufferAttribute,
  BufferGeometry as Geometria,
  CatmullRomCurve3,
  CylinderGeometry,
  DataTexture,
  FrontSide,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  Path,
  Quaternion,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  UnsignedByteType,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { TipoTejido } from '../procedural/realismo';
import { materialOrganico, ruidoFractal } from '../procedural/realismo';

export type Vec3 = [number, number, number];
export type Punto2 = [number, number];

/* ----- Azar y muestras ----- */

/** Generador congruencial: el mismo modelo en todas las cargas y en las pruebas. */
export function aleatorio(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** `n + 1` valores repartidos de `desde` a `hasta`, ambos incluidos. */
export function muestras(desde: number, hasta: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => desde + ((hasta - desde) * i) / n);
}

/** Banda entre dos curvas `arriba(x)` y `abajo(x)` sobre unas muestras de x. */
export function banda(
  xs: readonly number[],
  arriba: (x: number) => number,
  abajo: (x: number) => number,
): Punto2[] {
  return [
    ...xs.map((x): Punto2 => [x, arriba(x)]),
    ...[...xs].reverse().map((x): Punto2 => [x, abajo(x)]),
  ];
}

/** ¿El punto está dentro del polígono? (Regla par-impar.) */
export function dentroDePoligono(p: Punto2, poligono: readonly Punto2[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i]!;
    const [xj, yj] = poligono[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      dentro = !dentro;
    }
  }
  return dentro;
}

/* ----- Materiales, mallas y regiones ----- */

/**
 * Material de un tejido: físico, de una cara (salvo que `extra` diga otra) y con el relieve a `repetir` veces por
 * unidad del modelo (las UV de estas piezas van en unidades del modelo).
 */
export function material(
  color: string,
  tipo: TipoTejido,
  repetir: number,
  extra: MeshPhysicalMaterialParameters = {},
): MeshPhysicalMaterial {
  const m = materialOrganico(color, tipo, { side: FrontSide, ...extra });
  m.bumpMap?.repeat.set(repetir, repetir);
  return m;
}

export function malla(geometria: BufferGeometry, mat: MeshPhysicalMaterial, nombre: string): Mesh {
  const m = new Mesh(geometria, mat);
  m.name = nombre;
  return m;
}

/** Grupo con nombre: una región del modelo (el id de su nodo del catálogo) o una decoración. */
export function grupo(nombre: string, ...hijos: Mesh[]): Group {
  const g = new Group();
  g.name = nombre;
  g.add(...hijos);
  return g;
}

/** Une geometrías indexadas con posición, normal y UV en una sola (una llamada de dibujo) y libera las piezas. */
export function unir(geos: BufferGeometry[]): BufferGeometry {
  for (const g of geos) {
    for (const nombre of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(nombre)) g.deleteAttribute(nombre);
    }
    if (!g.index) {
      g.setIndex(Array.from({ length: g.getAttribute('position').count }, (_, i) => i));
    }
  }
  const unida = mergeGeometries(geos);
  for (const g of geos) g.dispose();
  if (!unida) throw new Error('No se pudieron unir las piezas del modelo.');
  return unida;
}

/** UV planas en unidades del modelo: (x, y) de cada vértice. */
function uvPlanas(g: BufferGeometry): void {
  const pos = g.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) uv.set([pos.getX(i), pos.getY(i)], i * 2);
  g.setAttribute('uv', new BufferAttribute(uv, 2));
}

/* ----- Células: esferoides deformados ----- */

export interface OpcionesEsferoide {
  centro: Vec3;
  /** Semiejes en x, y, z antes de girar. */
  semiejes: Vec3;
  /** Giro alrededor de Z (radianes). */
  giro?: number;
  /** 2 = elipsoide; de 2,5 a 3, cúbico redondeado (células apretadas en una hilera). */
  exponente?: number;
  /** Factor radial según la dirección (unitaria, en ejes propios): irregularidades, lóbulos, bases de procesos. */
  forma?: (d: Vector3) => number;
  /** Subdivisión del icosaedro: 1 (80 triángulos), 2 (320), 3 (1280). */
  detalle?: number;
  /** Plano de corte: nada queda por delante de este z (la célula muestra su cara de corte). */
  zMax?: number;
  /** Apoyo: nada queda por debajo de este y (la base de una célula sobre una superficie). */
  yMin?: number;
}

/** Punto de la superficie del esferoide en la dirección `d` (unitaria, en sus ejes propios), sin recortes. */
export function puntoEsferoide(op: OpcionesEsferoide, d: Vector3): Vec3 {
  const n = op.exponente ?? 2;
  const [a, b, c] = op.semiejes;
  const [cx, cy, cz] = op.centro;
  const giro = op.giro ?? 0;
  const s =
    n === 2 ? 1 : (Math.abs(d.x) ** n + Math.abs(d.y) ** n + Math.abs(d.z) ** n) ** (-1 / n);
  const f = s * (op.forma?.(d) ?? 1);
  const x = d.x * f * a;
  const y = d.y * f * b;
  return [
    cx + x * Math.cos(giro) - y * Math.sin(giro),
    cy + x * Math.sin(giro) + y * Math.cos(giro),
    cz + d.z * f * c,
  ];
}

/** Esferoide deformado, suave (vértices compartidos), con UV planas. */
export function esferoide(op: OpcionesEsferoide): BufferGeometry {
  const base = new IcosahedronGeometry(1, op.detalle ?? 2);
  base.deleteAttribute('normal');
  base.deleteAttribute('uv');
  const g = mergeVertices(base);
  base.dispose();
  const pos = g.getAttribute('position');
  const d = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    const [px, py, pz] = puntoEsferoide(op, d);
    pos.setXYZ(
      i,
      px,
      op.yMin === undefined ? py : Math.max(py, op.yMin),
      op.zMax === undefined ? pz : Math.min(pz, op.zMax),
    );
  }
  g.computeVertexNormals();
  uvPlanas(g);
  return g;
}

/* ----- Cavidades: cuencos detrás del plano de corte ----- */

export interface OpcionesCuenco {
  /** Centro del borde, en el plano de corte. */
  centro: Punto2;
  /** Semiejes del borde (a, b) y hondura (c). */
  semiejes: Vec3;
  giro?: number;
  /** Factor del radio del borde según el ángulo (irregularidad del contorno). */
  modulacion?: (angulo: number) => number;
  /** Plano del borde (por defecto 0). */
  z?: number;
  angulos?: number;
  anillos?: number;
}

function puntoCuenco(op: OpcionesCuenco, angulo: number, fi: number): Vec3 {
  const [a, b, c] = op.semiejes;
  const r = (op.modulacion?.(angulo) ?? 1) * Math.cos(fi);
  const x = a * r * Math.cos(angulo);
  const y = b * r * Math.sin(angulo);
  const g = op.giro ?? 0;
  return [
    op.centro[0] + x * Math.cos(g) - y * Math.sin(g),
    op.centro[1] + x * Math.sin(g) + y * Math.cos(g),
    (op.z ?? 0) - c * Math.sin(fi),
  ];
}

/** Borde del cuenco en el plano de corte, en sentido antihorario: es el agujero de la cara. */
export function contornoCuenco(op: OpcionesCuenco): Punto2[] {
  const n = op.angulos ?? 24;
  return Array.from({ length: n }, (_, i) => {
    const p = puntoCuenco(op, (2 * Math.PI * i) / n, 0);
    return [p[0], p[1]];
  });
}

/** Cavidad hueca detrás del plano: media elipsoide con las caras hacia dentro (hacia la abertura). */
export function cuenco(op: OpcionesCuenco): BufferGeometry {
  const n = op.angulos ?? 24;
  const anillos = op.anillos ?? 5;
  const posiciones: number[] = [];
  for (let j = 0; j < anillos; j++) {
    const fi = ((Math.PI / 2) * j) / anillos;
    for (let i = 0; i < n; i++) posiciones.push(...puntoCuenco(op, (2 * Math.PI * i) / n, fi));
  }
  const fondo = anillos * n;
  posiciones.push(...puntoCuenco(op, 0, Math.PI / 2));
  const indices: number[] = [];
  for (let j = 0; j < anillos; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * n + i;
      const b = j * n + ((i + 1) % n);
      if (j === anillos - 1) {
        indices.push(a, b, fondo);
      } else {
        const c = (j + 1) * n + i;
        const d = (j + 1) * n + ((i + 1) % n);
        indices.push(a, b, c, b, d, c);
      }
    }
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(new Float32Array(posiciones), 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  uvPlanas(g);
  return g;
}

/* ----- Caras planas ----- */

/** Polígono plano a la altura `z`, con agujeros, mirando a +Z. UV = (x, y). */
export function cara(
  contorno: readonly Punto2[],
  agujeros: readonly (readonly Punto2[])[] = [],
  z = 0,
): BufferGeometry {
  const forma = new Shape(contorno.map(([x, y]) => new Vector2(x, y)));
  for (const a of agujeros) forma.holes.push(new Path(a.map(([x, y]) => new Vector2(x, y))));
  const g = new ShapeGeometry(forma, 1);
  g.translate(0, 0, z);
  return g;
}

/** El mismo polígono mirando a −Z (la cara de atrás del bloque). */
export function caraTrasera(contorno: readonly Punto2[], z: number): BufferGeometry {
  const g = cara(contorno, [], z);
  const indice = g.index!;
  for (let i = 0; i < indice.count; i += 3) {
    const b = indice.getX(i + 1);
    indice.setX(i + 1, indice.getX(i + 2));
    indice.setX(i + 2, b);
  }
  const normal = g.getAttribute('normal');
  for (let i = 0; i < normal.count; i++) normal.setXYZ(i, 0, 0, -1);
  return g;
}

/**
 * Cuadrilátero plano de `origen` a `origen + u + v`, mirando a `u × v`, en una rejilla de `nu × nv`. Las UV son las
 * que dé `uv` (por defecto, la posición a lo largo de u y de v).
 */
export function plano(
  origen: Vec3,
  u: Vec3,
  v: Vec3,
  uv?: (p: Vector3) => Punto2,
  nu = 1,
  nv = 1,
): BufferGeometry {
  const o = new Vector3(...origen);
  const eu = new Vector3(...u);
  const ev = new Vector3(...v);
  const normal = eu.clone().cross(ev).normalize();
  const posiciones: number[] = [];
  const normales: number[] = [];
  const uvs: number[] = [];
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const p = o
        .clone()
        .addScaledVector(eu, i / nu)
        .addScaledVector(ev, j / nv);
      posiciones.push(p.x, p.y, p.z);
      normales.push(normal.x, normal.y, normal.z);
      uvs.push(...(uv ? uv(p) : [(eu.length() * i) / nu, (ev.length() * j) / nv]));
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + 1;
      const c = a + nu + 1;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(new Float32Array(posiciones), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(normales), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  g.setIndex(indices);
  return g;
}

/* ----- Tubos, varillas, conos ----- */

/** Tubo suave por unos puntos (proceso, fibra, canalículo). */
export function tubo(
  puntos: readonly Vec3[],
  radio: number,
  segmentos = 24,
  radiales = 6,
): BufferGeometry {
  const curva = new CatmullRomCurve3(puntos.map((p) => new Vector3(...p)));
  return new TubeGeometry(curva, segmentos, radio, radiales, false);
}

/** Orienta una geometría hecha a lo largo de +Y para que vaya de `a` a `b`. */
function orientar(g: BufferGeometry, a: Vec3, b: Vec3): BufferGeometry {
  const va = new Vector3(...a);
  const dir = new Vector3(...b).sub(va);
  const largo = dir.length();
  g.translate(0, largo / 2, 0);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()));
  g.translate(va.x, va.y, va.z);
  return g;
}

/** Cilindro abierto de `a` a `b` (fibra, subunidad, eje de una flecha). */
export function varilla(a: Vec3, b: Vec3, radio: number, radiales = 4): BufferGeometry {
  const largo = new Vector3(...b).distanceTo(new Vector3(...a));
  return orientar(new CylinderGeometry(radio, radio, largo, radiales, 1, true), a, b);
}

/** Cono con la base en `a` y la punta en `b` (punta de una flecha). */
export function cono(a: Vec3, b: Vec3, radio: number, radiales = 10): BufferGeometry {
  const largo = new Vector3(...b).distanceTo(new Vector3(...a));
  return orientar(new CylinderGeometry(0, radio, largo, radiales, 1, false), a, b);
}

/* ----- Vasos y conductos abiertos a lo largo ----- */

export interface OpcionesMediaCana {
  /** Tramo del eje (a lo largo de X). */
  x0: number;
  x1: number;
  /** Altura del eje a lo largo de x. */
  y: (x: number) => number;
  radio: number;
  /** Caras hacia el eje (el interior de un conducto o de la luz de un vaso) o hacia fuera. */
  haciaDentro: boolean;
  /** Plano de corte del eje (por defecto 0): la media caña queda detrás. */
  z?: number;
  tramos?: number;
  angulos?: number;
}

/** Mitad de atrás de un tubo a lo largo de X, abierto por el plano de corte (vaso o conducto cortado a lo largo). */
export function mediaCana(op: OpcionesMediaCana): BufferGeometry {
  const tramos = op.tramos ?? 48;
  const angulos = op.angulos ?? 12;
  const z0 = op.z ?? 0;
  const posiciones: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i <= tramos; i++) {
    const x = op.x0 + ((op.x1 - op.x0) * i) / tramos;
    const yc = op.y(x);
    for (let j = 0; j <= angulos; j++) {
      const fi = (Math.PI * j) / angulos;
      posiciones.push(x, yc + op.radio * Math.cos(fi), z0 - op.radio * Math.sin(fi));
      uvs.push(x, fi * op.radio);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < tramos; i++) {
    for (let j = 0; j < angulos; j++) {
      const a = i * (angulos + 1) + j;
      const b = a + 1;
      const c = a + angulos + 1;
      const d = c + 1;
      // (a, b, c) mira hacia el eje; (a, c, b), hacia fuera.
      if (op.haciaDentro) indices.push(a, b, c, b, d, c);
      else indices.push(a, c, b, b, c, d);
    }
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(new Float32Array(posiciones), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/* ----- Eritrocito ----- */

/**
 * Eritrocito bicóncavo de radio `radio`: medio grosor de 0,12 radios en el centro y unos 0,3 cerca del borde (el
 * disco de 7,5 µm, 2,5 µm de grosor en el reborde y 1 µm en el centro). `normal` es el eje del disco.
 */
export function eritrocito(centro: Vec3, radio: number, normal: Vec3): BufferGeometry {
  const grosor = (rho: number): number =>
    radio * Math.sqrt(Math.max(0, 1 - rho * rho)) * (0.12 + 0.55 * rho * rho);
  const rhos = muestras(0, 1, 9);
  const perfil = [
    ...rhos.map((rho) => new Vector2(Math.max(rho * radio, 1e-4), grosor(rho))),
    ...[...rhos]
      .reverse()
      .slice(1)
      .map((rho) => new Vector2(Math.max(rho * radio, 1e-4), -grosor(rho))),
  ];
  // El torno de three genera la superficie con las caras hacia dentro si el perfil baja; se invierte el perfil.
  const g = new LatheGeometry(perfil.reverse(), 16);
  g.applyQuaternion(
    new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...normal).normalize()),
  );
  g.translate(...centro);
  return g;
}

/* ----- Texturas de color ----- */

function aTexturaGris(
  valores: Float32Array,
  ancho: number,
  alto: number,
  nombre: string,
): DataTexture {
  const datos = new Uint8Array(ancho * alto * 4);
  for (let k = 0; k < ancho * alto; k++) {
    const v = Math.round(Math.max(0, Math.min(1, valores[k]!)) * 255);
    datos.set([v, v, v, 255], k * 4);
  }
  const t = new DataTexture(datos, ancho, alto, RGBAFormat, UnsignedByteType);
  t.name = nombre;
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/**
 * Láminas del hueso laminar: un periodo tiene dos láminas (con la orientación del colágeno alternada, una algo más
 * clara que la otra) separadas por una línea interlaminar fina y más oscura. `direccion` dice en qué coordenada de las
 * UV cambian (`u`: láminas verticales; `v`: horizontales). La repetición la fija quien la usa (1 / periodo).
 */
export function texturaLaminas(direccion: 'u' | 'v'): DataTexture {
  const n = 128;
  const valores = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const base = t < 0.5 ? 1 : 0.94;
    const borde = Math.min(Math.abs(t), Math.abs(t - 0.5), Math.abs(t - 1));
    valores[i] = base * (1 - 0.13 * Math.exp(-((borde / 0.03) ** 2)));
  }
  return direccion === 'u'
    ? aTexturaGris(valores, n, 1, 'laminas_u')
    : aTexturaGris(valores, 1, n, 'laminas_v');
}

let entretejida: Float32Array | null = null;

/**
 * Hueso inmaduro (entretejido): haces de colágeno cortos en direcciones distintas. Dos ruidos de vetas alargadas,
 * uno en cada dirección, mezclados por manchas de otro ruido: cada mancha tiene sus haces orientados a su manera.
 */
export function texturaEntretejida(): DataTexture {
  if (!entretejida) {
    const horizontal = ruidoFractal(41, 3, 16, 3);
    const vertical = ruidoFractal(43, 16, 3, 3);
    const manchas = ruidoFractal(47, 4, 4, 2);
    entretejida = new Float32Array(horizontal.length);
    for (let k = 0; k < entretejida.length; k++) {
      const m = Math.max(0, Math.min(1, (manchas[k]! - 0.35) / 0.3));
      const vetas = horizontal[k]! * (1 - m) + vertical[k]! * m;
      entretejida[k] = 0.84 + 0.2 * vetas;
    }
  }
  return aTexturaGris(entretejida, 256, 256, 'entretejida');
}
