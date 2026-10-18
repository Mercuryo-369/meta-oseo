/**
 * Bloque de una superficie ósea en formación, cortado como una pieza de histología: el modelo `frente_mineralizacion`
 * de la exploración 3D (actividad m4_multicapa_frente, «El frente de mineralización, capa por capa»; hasta
 * 2026-10-18 era una multicapa sobre el dibujo m4_frente_mineralizacion con una ilustración hecha con IA debajo, que
 * tenía errores: osteoblastos como cajas y vesículas de matriz gigantes).
 *
 * De la superficie (arriba, +Y) hacia el interior (−Y):
 *  - una hilera de OSTEOBLASTOS activos: células poligonales y voluminosas (unas 13 µm de ancho y 15 a 18 µm de
 *    alto) que se tocan por sus lados (un teselado de Voronoi) y tienen el polo libre abombado. La fila de delante
 *    está cortada: en su cara se ven el citoplasma basófilo, el núcleo excéntrico en el polo alejado del hueso y,
 *    entre el núcleo y el osteoide, la imagen negativa del Golgi;
 *  - el OSTEOIDE, una costura pálida de unas 10 µm, con VESÍCULAS DE MATRIZ diminutas (0,12 a 0,22 µm de diámetro,
 *    el tamaño real; solo se distinguen al acercar la cámara), más abundantes cerca del frente;
 *  - el FRENTE DE MINERALIZACIÓN, una interfase granular de algo más de 1 µm con nódulos de mineral (glóbulos de
 *    0,5 a 1,2 µm) a ambos lados del límite;
 *  - el HUESO MINERALIZADO, laminar (láminas de unas 4 µm paralelas a la superficie), con dos OSTEOCITOS en sus
 *    LAGUNAS (huecos abiertos por el corte) y CANALÍCULOS finos (0,4 µm de diámetro) que van hacia el frente, hacia
 *    la superficie, a la otra laguna o salen del plano del corte;
 *  - dos MARCAS DE TETRACICLINA, líneas fluorescentes paralelas al frente y separadas 8 µm (la tasa de aposición
 *    mineral es esa distancia entre los días del intervalo). Se ven como bajo luz ultravioleta.
 *
 * La cara de corte (z = 0) mira a la cámara (+Z); el bloque tiene 24 µm de fondo. Unidades: 1 unidad = 1 µm (la
 * exploración lo normaliza a radio 1). Cada región de la actividad es un grupo con el id de su nodo del catálogo
 * (`content/nodos3d.ts`) y sus propios materiales; `puntoDeRegion` da el punto de su etiqueta, sobre la cara de corte.
 * Todo es determinista (semillas fijas): el mismo modelo en cada carga.
 */
import type { BufferGeometry, Material, MeshPhysicalMaterialParameters } from 'three';
import {
  BufferAttribute,
  BufferGeometry as Geometria,
  CatmullRomCurve3,
  CircleGeometry,
  ExtrudeGeometry,
  FrontSide,
  Group,
  Mesh,
  Path,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PuntoRegion, Vec3 } from '../modelosPorCodigo';
import { generadorDeterminista } from '../procedural/interpolacion';
import type { TipoTejido } from '../procedural/realismo';
import { materialOrganico } from '../procedural/realismo';

/** Regiones del modelo: los ids de los nodos del catálogo `frente_mineralizacion`, de la superficie al interior. */
export const REGIONES_FRENTE = [
  'osteoblastos',
  'osteoide',
  'vesiculas_matriz',
  'frente_mineralizacion',
  'hueso_mineralizado',
  'osteocito',
  'canaliculos',
  'marcas_tetraciclina',
] as const;
export type RegionFrente = (typeof REGIONES_FRENTE)[number];

/** Nombre del grupo raíz: distinto de cualquier región (la exploración busca las regiones por nombre). */
export const NOMBRE_MODELO = 'bloque_superficie_osea';

/* ----- Medidas (µm) ----- */

/** El bloque va de x = −32 a 32. */
export const MEDIO_ANCHO = 32;
/** Fondo del bloque: de z = −24 a la cara de corte, z = 0. */
export const FONDO = 24;
/** Base del bloque (el hueso mineralizado llega hasta aquí). */
export const Y_BASE = -46;
/** Grosor medio de la costura de osteoide (de la superficie, y = 0, al frente). */
export const GROSOR_OSTEOIDE = 10;
/** Grosor de la interfase granular del frente, por debajo del límite con el osteoide. */
export const GROSOR_FRENTE = 1.2;
/** Profundidad bajo el frente del centro de la marca más reciente (la segunda dosis). */
export const PROFUNDIDAD_MARCA_RECIENTE = 3.2;
/** Distancia entre los centros de las dos marcas de tetraciclina. */
export const SEPARACION_MARCAS = 8;
/** Ancho de cada marca de tetraciclina. */
export const ANCHO_MARCA = 1.4;
/** Radio de un canalículo (0,4 µm de diámetro). */
export const RADIO_CANALICULO = 0.2;
/** Radio de una prolongación del osteocito al salir de su laguna. */
const RADIO_PROLONGACION = 0.24;
/** Tramo de cada canalículo que dejan ver las prolongaciones del osteocito. */
const LARGO_PROLONGACION = 1.4;
/** Fondo del tramo delantero del hueso, el que lleva los huecos de las lagunas (más que la mitad de una laguna). */
const FONDO_LAGUNAS = 4;
/** Espacio entre osteoblastos vecinos. */
const HUECO_CELULAS = 0.35;
/** Espacio pericelular: lo que el cuerpo del osteocito deja libre en su laguna. */
const ESPACIO_PERICELULAR = 0.55;

/** Capas de la cara de corte, un poco por delante unas de otras (sin parpadeo entre planos iguales). */
const Z_LAMINA = 0.02;
const Z_MARCA = 0.05;
const Z_GOLGI = 0.03;
const Z_NUCLEO = 0.06;
const Z_NUCLEOLO = 0.09;
const Z_NUCLEO_OSTEOCITO = 0.04;

const COLORES = {
  osteoblasto: '#8d86c6',
  golgi: '#c7c2e4',
  nucleo: '#4b408f',
  nucleolo: '#2f2766',
  osteoide: '#eed4c9',
  vesicula: '#f8f2ea',
  frente: '#dcc7a9',
  nodulo: '#f1e7d3',
  hueso: '#ebe0c9',
  lamina: '#dccdb0',
  laguna: '#4d3b2c',
  osteocito: '#8a9ad2',
  canaliculo: '#5a4535',
  tetraciclina: '#e6d33c',
  fluorescencia: '#c9b52a',
} as const;

type P2 = [number, number];

/* ----- Contornos ----- */

/** Altura del frente de mineralización (límite osteoide / hueso) a lo largo del bloque: unas 10 µm bajo la superficie. */
export function yFrente(x: number): number {
  return -GROSOR_OSTEOIDE + 0.45 * Math.sin(0.16 * x + 0.4) + 0.25 * Math.sin(0.41 * x + 1.3);
}

/** Centro de cada marca de tetraciclina a la altura `x`: la reciente (0) y la anterior (1), paralelas al frente. */
export function yMarca(indice: 0 | 1, x: number): number {
  return yFrente(x) - PROFUNDIDAD_MARCA_RECIENTE - indice * SEPARACION_MARCAS;
}

function muestras(desde: number, hasta: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => desde + ((hasta - desde) * i) / n);
}

/** Muestras de x de un borde a otro del bloque (una por micra). */
const XS = muestras(-MEDIO_ANCHO, MEDIO_ANCHO, 2 * MEDIO_ANCHO);

/** Banda entre dos curvas `arriba(x)` y `abajo(x)`, de x0 a x1, como contorno cerrado. */
function banda(
  arriba: (x: number) => number,
  abajo: (x: number) => number,
  x0 = -MEDIO_ANCHO,
  x1 = MEDIO_ANCHO,
): P2[] {
  const xs = muestras(x0, x1, Math.round(x1 - x0));
  return [...xs.map((x): P2 => [x, arriba(x)]), ...[...xs].reverse().map((x): P2 => [x, abajo(x)])];
}

function forma(contorno: readonly P2[], huecos: readonly (readonly P2[])[] = []): Shape {
  const s = new Shape(contorno.map(([x, y]) => new Vector2(x, y)));
  for (const h of huecos) s.holes.push(new Path(h.map(([x, y]) => new Vector2(x, y))));
  return s;
}

/** Prisma de un contorno, de z = `desde` a z = `hasta` (la cara de delante en `hasta`). UV en micras. */
function prisma(s: Shape, desde: number, hasta: number): BufferGeometry {
  const g = new ExtrudeGeometry(s, { depth: hasta - desde, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, desde);
  return g;
}

/* ----- Lagunas de los osteocitos ----- */

export interface Laguna {
  centro: P2;
  /** Semiejes: a lo largo (casi paralelo a la superficie), de canto y en profundidad. */
  a: number;
  b: number;
  c: number;
  /** Giro del eje mayor en el plano del corte (radianes). */
  giro: number;
}

/** La laguna del osteocito principal y la de un vecino más profundo, unidas por un canalículo. */
export const LAGUNAS: readonly Laguna[] = [
  { centro: [3, -29.5], a: 7.5, b: 3.1, c: 3.6, giro: 0.07 },
  { centro: [21.5, -39.5], a: 6, b: 2.7, c: 3, giro: -0.12 },
];

/**
 * Punto del contorno de la laguna en el ángulo `alfa` (grados). Con `margen` > 0, el de la elipse más pequeña por ese
 * margen (el cuerpo del osteocito); con `margen` < 0, el de una más grande.
 */
export function puntoLaguna(l: Laguna, alfa: number, margen = 0): P2 {
  const t = (alfa * Math.PI) / 180;
  const [u, v] = [(l.a - margen) * Math.cos(t), (l.b - margen) * Math.sin(t)];
  const [c, s] = [Math.cos(l.giro), Math.sin(l.giro)];
  return [l.centro[0] + u * c - v * s, l.centro[1] + u * s + v * c];
}

/** ¿Cae el punto dentro de la laguna, agrandada en `margen` por cada lado? */
export function dentroDeLaguna(l: Laguna, [x, y]: P2, margen = 0): boolean {
  const [dx, dy] = [x - l.centro[0], y - l.centro[1]];
  const [c, s] = [Math.cos(l.giro), Math.sin(l.giro)];
  const u = dx * c + dy * s;
  const v = -dx * s + dy * c;
  return (u / (l.a + margen)) ** 2 + (v / (l.b + margen)) ** 2 <= 1;
}

function contornoLaguna(l: Laguna, n = 48): P2[] {
  return muestras(0, 360, n)
    .slice(0, n)
    .map((a) => puntoLaguna(l, a));
}

/** Media elipsoide hacia atrás (z ≤ 0) de una laguna, más pequeña en `margen` por cada lado. */
function mediaElipsoide(l: Laguna, margen: number): BufferGeometry {
  // Con phi de π a 2π, la esfera de three queda en z ≤ 0.
  const g = new SphereGeometry(1, 28, 14, Math.PI, Math.PI);
  g.scale(l.a - margen, l.b - margen, l.c - margen);
  g.rotateZ(l.giro);
  g.translate(l.centro[0], l.centro[1], 0);
  return g;
}

/** Elipse plana en la cara de corte, mirando a +Z. */
function elipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  z: number,
  giro = 0,
): BufferGeometry {
  const g = new CircleGeometry(1, 36);
  g.scale(rx, ry, 1);
  g.rotateZ(giro);
  g.translate(cx, cy, z);
  return g;
}

/* ----- Osteoblastos: teselado de Voronoi con el polo libre abombado ----- */

/** Semiplano a·p ≤ b en el plano (x, z). */
interface Semiplano {
  a: P2;
  b: number;
}

function recortar(poligono: readonly P2[], { a, b }: Semiplano): P2[] {
  const dentro = (p: P2) => a[0] * p[0] + a[1] * p[1] <= b + 1e-9;
  const salida: P2[] = [];
  poligono.forEach((p, i) => {
    const q = poligono[(i + 1) % poligono.length]!;
    const [ep, eq] = [dentro(p), dentro(q)];
    if (ep) salida.push(p);
    if (ep !== eq) {
      const fp = a[0] * p[0] + a[1] * p[1] - b;
      const fq = a[0] * q[0] + a[1] * q[1] - b;
      const t = fp / (fp - fq);
      salida.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  });
  // Sin vértices repetidos (un vértice justo sobre la recta de corte se añadiría dos veces).
  return salida.filter((p, i) => {
    const q = salida[(i + 1) % salida.length]!;
    return salida.length < 2 || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-7;
  });
}

/** Área con signo en el plano (x, −z): positiva si el polígono gira en el sentido que da normales hacia +Y. */
function areaConSigno(p: readonly P2[]): number {
  let s = 0;
  p.forEach(([x0, z0], i) => {
    const [x1, z1] = p[(i + 1) % p.length]!;
    s += x0 * -z1 - x1 * -z0;
  });
  return s / 2;
}

function centroide(p: readonly P2[]): P2 {
  const area = areaConSigno(p);
  let [cx, cz] = [0, 0];
  p.forEach(([x0, z0], i) => {
    const [x1, z1] = p[(i + 1) % p.length]!;
    const f = x0 * -z1 - x1 * -z0;
    cx += (x0 + x1) * f;
    cz += (z0 + z1) * f;
  });
  return [cx / (6 * area), cz / (6 * area)];
}

export interface Osteoblasto {
  /** Centro de la célula (el sitio de Voronoi), en (x, z). */
  sitio: P2;
  /** Altura del polo libre sobre el osteoide. */
  alto: number;
  /** Contorno de la base, ya recortado por los bordes del bloque, en (x, z). */
  contorno: P2[];
  /** La célula completa, sin recortar (para la forma del abombado). */
  semiplanos: Semiplano[];
}

/** Fracción de la altura que tiene la célula donde toca a sus vecinas. */
const HOMBRO = 0.62;

/** Distancia relativa (0 en el centro, 1 en el borde de la célula completa) del punto (x, z). */
function rho(c: Osteoblasto, [x, z]: P2): number {
  const d: P2 = [x - c.sitio[0], z - c.sitio[1]];
  if (Math.hypot(d[0], d[1]) < 1e-9) return 0;
  let t = Infinity;
  for (const { a, b } of c.semiplanos) {
    const ad = a[0] * d[0] + a[1] * d[1];
    if (ad > 1e-12) t = Math.min(t, (b - (a[0] * c.sitio[0] + a[1] * c.sitio[1])) / ad);
  }
  return Math.min(1, 1 / t);
}

/** Altura de la superficie de la célula en (x, z): plana en el borde de contacto y abombada en el centro. */
export function altoOsteoblasto(c: Osteoblasto, p: P2): number {
  const r = rho(c, p);
  return c.alto * (HOMBRO + (1 - HOMBRO) * Math.sqrt(Math.max(0, 1 - r ** 2.4)));
}

let osteoblastosCache: Osteoblasto[] | null = null;

/** La hilera de osteoblastos (determinista): un teselado de Voronoi de sitios en una red hexagonal con ruido. */
export function osteoblastos(): Osteoblasto[] {
  if (osteoblastosCache) return osteoblastosCache;
  const azar = generadorDeterminista(4611);
  const paso = 13;
  const filas = [12.06, 0.8, -10.46, -21.72, -32.98];
  const sitios: { s: P2; alto: number }[] = [];
  filas.forEach((z, fila) => {
    for (let i = 0; i <= 8; i++) {
      const x = -52 + paso * i + (fila % 2 ? paso / 2 : 0);
      sitios.push({
        s: [x + (azar() - 0.5) * 3.2, z + (azar() - 0.5) * 2.4],
        alto: 15 + azar() * 3,
      });
    }
  });
  const bloque: Semiplano[] = [
    { a: [1, 0], b: MEDIO_ANCHO },
    { a: [-1, 0], b: MEDIO_ANCHO },
    { a: [0, 1], b: 0 },
    { a: [0, -1], b: FONDO },
  ];
  const lista: Osteoblasto[] = [];
  for (const [i, { s, alto }] of sitios.entries()) {
    const semiplanos: Semiplano[] = [];
    for (const [j, otro] of sitios.entries()) {
      if (i === j) continue;
      const a: P2 = [otro.s[0] - s[0], otro.s[1] - s[1]];
      const largo = Math.hypot(a[0], a[1]);
      const b = (otro.s[0] ** 2 + otro.s[1] ** 2 - s[0] ** 2 - s[1] ** 2) / 2;
      semiplanos.push({ a, b: b - (HUECO_CELULAS / 2) * largo });
    }
    let p: P2[] = [
      [-90, -70],
      [90, -70],
      [90, 40],
      [-90, 40],
    ];
    for (const sp of [...semiplanos, ...bloque]) p = recortar(p, sp);
    if (p.length < 3 || Math.abs(areaConSigno(p)) < 12) continue;
    if (areaConSigno(p) < 0) p.reverse();
    lista.push({ sitio: s, alto, contorno: p, semiplanos });
  }
  osteoblastosCache = lista;
  return lista;
}

/** Contorno con los lados partidos en tramos de 1,5 µm como mucho. */
function subdividir(p: readonly P2[], tramo = 1.5): P2[] {
  const salida: P2[] = [];
  p.forEach((a, i) => {
    const b = p[(i + 1) % p.length]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / tramo));
    for (let k = 0; k < n; k++) {
      salida.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
  });
  return salida;
}

/** Malla de un osteoblasto: el polo libre abombado (en anillos desde el centro) y los lados verticales. */
function geometriaOsteoblasto(c: Osteoblasto): BufferGeometry {
  const borde = subdividir(c.contorno);
  const centro = centroide(c.contorno);
  const anillos = 6;
  const pos: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  const vertice = (x: number, y: number, z: number, u: number, v: number): number => {
    pos.push(x, y, z);
    uv.push(u, v);
    return pos.length / 3 - 1;
  };
  // Polo libre.
  const iCentro = vertice(centro[0], altoOsteoblasto(c, centro), centro[1], centro[0], centro[1]);
  const filas: number[][] = [];
  for (let k = 1; k <= anillos; k++) {
    const t = k / anillos;
    filas.push(
      borde.map(([bx, bz]) => {
        const p: P2 = [centro[0] + (bx - centro[0]) * t, centro[1] + (bz - centro[1]) * t];
        return vertice(p[0], altoOsteoblasto(c, p), p[1], p[0], p[1]);
      }),
    );
  }
  const n = borde.length;
  for (let j = 0; j < n; j++) indices.push(iCentro, filas[0]![j]!, filas[0]![(j + 1) % n]!);
  for (let k = 0; k < anillos - 1; k++) {
    for (let j = 0; j < n; j++) {
      const [a, b] = [filas[k]![j]!, filas[k]![(j + 1) % n]!];
      const [d, e] = [filas[k + 1]![j]!, filas[k + 1]![(j + 1) % n]!];
      indices.push(a, d, e, a, e, b);
    }
  }
  // Lados: de la base (y = 0) a la altura del borde; vértices propios para que la arista quede viva.
  let recorrido = 0;
  for (let j = 0; j < n; j++) {
    const p = borde[j]!;
    const q = borde[(j + 1) % n]!;
    const largo = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const a = vertice(p[0], 0, p[1], recorrido, 0);
    const b = vertice(q[0], 0, q[1], recorrido + largo, 0);
    const hq = altoOsteoblasto(c, q);
    const hp = altoOsteoblasto(c, p);
    const d = vertice(q[0], hq, q[1], recorrido + largo, hq);
    const e = vertice(p[0], hp, p[1], recorrido, hp);
    indices.push(a, b, d, a, d, e);
    recorrido += largo;
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export interface CorteOsteoblasto {
  /** Tramo de la cara de corte (z = 0) que ocupa la célula. */
  x0: number;
  x1: number;
  /** Centro y semiejes del núcleo, en la cara de corte. */
  nucleo: { x: number; y: number; rx: number; ry: number };
  /** Imagen negativa del Golgi, entre el núcleo y el osteoide. */
  golgi: { x: number; y: number; rx: number; ry: number };
}

/** Las células de la fila de delante, cortadas por la cara z = 0, con su núcleo y su Golgi. */
export function cortesOsteoblastos(): CorteOsteoblasto[] {
  const azar = generadorDeterminista(907);
  const cortes: CorteOsteoblasto[] = [];
  for (const c of osteoblastos()) {
    const enCara = c.contorno.filter(([, z]) => Math.abs(z) < 1e-6).map(([x]) => x);
    if (enCara.length < 2) continue;
    const [x0, x1] = [Math.min(...enCara), Math.max(...enCara)];
    if (x1 - x0 < 7) continue;
    const x = (x0 + x1) / 2 + (azar() - 0.5) * 1.2;
    const alto = altoOsteoblasto(c, [x, 0]);
    const rx = Math.min(3.1, (x1 - x0) / 2 - 1.6);
    const ry = 3.5 + azar() * 0.5;
    const y = alto - ry - 1.4;
    cortes.push({
      x0,
      x1,
      nucleo: { x, y, rx, ry },
      golgi: { x: x + (azar() - 0.5) * 0.8, y: y - ry - 1.5, rx: rx * 0.85, ry: 1.3 },
    });
  }
  return cortes;
}

/* ----- Vesículas de matriz y nódulos del frente ----- */

export interface Esfera {
  centro: Vec3;
  radio: number;
}

/** Centro del grupo de vesículas sobre el que se pone su etiqueta (cerca del frente, a la derecha). */
const GRUPO_VESICULAS: P2 = [21, yFrente(21) + 1.3];

let vesiculasCache: Esfera[] | null = null;

/** Vesículas de matriz en la cara del osteoide (0,12 a 0,22 µm de diámetro), más densas cerca del frente. */
export function vesiculasMatriz(): Esfera[] {
  if (vesiculasCache) return vesiculasCache;
  const azar = generadorDeterminista(2203);
  const lista: Esfera[] = [];
  const poner = (x: number, y: number) => {
    const radio = 0.06 + azar() * 0.05;
    lista.push({ centro: [x, y, -radio * 0.3], radio });
  };
  for (let i = 0; i < 150; i++) {
    const x = -MEDIO_ANCHO + 0.5 + azar() * (2 * MEDIO_ANCHO - 1);
    const techo = -yFrente(x) - 0.9;
    poner(x, yFrente(x) + 0.35 + techo * azar() ** 2);
  }
  // Un grupo más denso donde va la etiqueta: al acercar la cámara se ven varias juntas.
  for (let i = 0; i < 28; i++) {
    poner(GRUPO_VESICULAS[0] + (azar() - 0.5) * 6, GRUPO_VESICULAS[1] + (azar() - 0.5) * 2);
  }
  vesiculasCache = lista;
  return lista;
}

let nodulosCache: Esfera[] | null = null;

/** Nódulos de mineral (0,5 a 1,2 µm) a ambos lados del límite osteoide / hueso: la interfase granular. */
export function nodulosFrente(): Esfera[] {
  if (nodulosCache) return nodulosCache;
  const azar = generadorDeterminista(5119);
  const lista: Esfera[] = [];
  for (let i = 0; i < 120; i++) {
    const x = -MEDIO_ANCHO + 0.6 + azar() * (2 * MEDIO_ANCHO - 1.2);
    const radio = 0.25 + azar() * 0.35;
    const y = yFrente(x) - 0.5 + (azar() - 0.5) * 1.4;
    lista.push({ centro: [x, y, -radio * 0.4], radio });
  }
  nodulosCache = lista;
  return lista;
}

function esferas(
  lista: readonly Esfera[],
  segmentos: number,
  anillos: number,
  aplastar = 1,
): BufferGeometry {
  return unir(
    lista.map(({ centro, radio }) => {
      const g = new SphereGeometry(radio, segmentos, anillos);
      g.scale(1, aplastar, 1);
      g.translate(...centro);
      return g;
    }),
  );
}

/* ----- Canalículos ----- */

/** Un extremo de canalículo: la pared de una laguna en un ángulo (grados) o un punto libre del corte. */
type Extremo = { laguna: number; alfa: number } | { punto: P2 };

interface Canaliculo {
  desde: Extremo;
  hasta: Extremo;
  /** Sale del plano del corte al final (se hunde en el hueso, hacia otro osteocito fuera del corte). */
  seHunde: boolean;
  semilla: number;
}

/** Punto del frente (dentro de la interfase) a la altura `x`. */
const enFrente = (x: number): P2 => [x, yFrente(x) - 0.6];

const CANALICULOS: readonly Canaliculo[] = [
  // Hacia el frente y, a través del osteoide, hasta la base de los osteoblastos.
  { desde: { laguna: 0, alfa: 100 }, hasta: { punto: enFrente(1.5) }, seHunde: false, semilla: 11 },
  { desde: { laguna: 0, alfa: 70 }, hasta: { punto: [12, 0] }, seHunde: false, semilla: 12 },
  { desde: { laguna: 0, alfa: 125 }, hasta: { punto: [-11, 0] }, seHunde: false, semilla: 13 },
  // Por el hueso, a osteocitos que quedan fuera del corte.
  { desde: { laguna: 0, alfa: 160 }, hasta: { punto: [-15, -23.5] }, seHunde: true, semilla: 14 },
  { desde: { laguna: 0, alfa: 195 }, hasta: { punto: [-23, -31] }, seHunde: true, semilla: 15 },
  { desde: { laguna: 0, alfa: 240 }, hasta: { punto: [-7, -45] }, seHunde: true, semilla: 16 },
  { desde: { laguna: 0, alfa: 290 }, hasta: { punto: [6.5, -45.3] }, seHunde: true, semilla: 17 },
  { desde: { laguna: 0, alfa: 20 }, hasta: { punto: [17.5, -25] }, seHunde: true, semilla: 18 },
  // Entre los dos osteocitos del corte.
  { desde: { laguna: 0, alfa: 335 }, hasta: { laguna: 1, alfa: 160 }, seHunde: false, semilla: 19 },
  { desde: { laguna: 1, alfa: 70 }, hasta: { punto: [27, -26] }, seHunde: true, semilla: 20 },
  { desde: { laguna: 1, alfa: 10 }, hasta: { punto: [31, -36.5] }, seHunde: true, semilla: 21 },
  { desde: { laguna: 1, alfa: 250 }, hasta: { punto: [19, -45.3] }, seHunde: true, semilla: 22 },
  { desde: { laguna: 1, alfa: 205 }, hasta: { punto: [10, -43.5] }, seHunde: true, semilla: 23 },
];

function extremo(e: Extremo): P2 {
  return 'laguna' in e ? puntoLaguna(LAGUNAS[e.laguna]!, e.alfa) : e.punto;
}

/** Recorrido de un canalículo: algo ondulado, sobre la cara de corte (z = 0) salvo el final si se hunde. */
export function recorridoCanaliculo(c: Canaliculo): Vector3[] {
  const azar = generadorDeterminista(c.semilla);
  const [a, b] = [extremo(c.desde), extremo(c.hasta)];
  const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.ceil(largo / 2.5));
  const normal: P2 = [-(b[1] - a[1]) / largo, (b[0] - a[0]) / largo];
  return muestras(0, 1, n).map((t, i) => {
    const desvio = i === 0 || i === n ? 0 : 0.7 * Math.sin(Math.PI * t) * (azar() * 2 - 1);
    const z = c.seHunde && i === n ? -0.8 : 0;
    return new Vector3(
      a[0] + (b[0] - a[0]) * t + normal[0] * desvio,
      a[1] + (b[1] - a[1]) * t + normal[1] * desvio,
      z,
    );
  });
}

/** Los recorridos de todos los canalículos del corte. */
export function canaliculos(): Vector3[][] {
  return CANALICULOS.map(recorridoCanaliculo);
}

function tubo(puntos: readonly Vector3[], radio: number): BufferGeometry {
  const curva = new CatmullRomCurve3([...puntos]);
  return new TubeGeometry(curva, Math.max(8, Math.ceil(curva.getLength() / 0.4)), radio, 6, false);
}

/** Prolongaciones del osteocito: del cuerpo de la célula a los primeros 1,4 µm de cada canalículo que sale de él. */
function prolongaciones(): BufferGeometry {
  const tramos: BufferGeometry[] = [];
  for (const c of CANALICULOS) {
    for (const [e, otro] of [
      [c.desde, c.hasta],
      [c.hasta, c.desde],
    ] as const) {
      if (!('laguna' in e)) continue;
      const l = LAGUNAS[e.laguna]!;
      const inicio = puntoLaguna(l, e.alfa, ESPACIO_PERICELULAR + 0.15);
      const pared = puntoLaguna(l, e.alfa);
      const lejos = extremo(otro);
      const d = Math.hypot(lejos[0] - pared[0], lejos[1] - pared[1]);
      const fin: P2 = [
        pared[0] + ((lejos[0] - pared[0]) / d) * LARGO_PROLONGACION,
        pared[1] + ((lejos[1] - pared[1]) / d) * LARGO_PROLONGACION,
      ];
      tramos.push(
        new TubeGeometry(
          new CatmullRomCurve3([
            new Vector3(inicio[0], inicio[1], 0),
            new Vector3(pared[0], pared[1], 0),
            new Vector3(fin[0], fin[1], 0),
          ]),
          8,
          RADIO_PROLONGACION,
          6,
          false,
        ),
      );
    }
  }
  return unir(tramos);
}

/* ----- Láminas del hueso ----- */

/** Profundidades bajo el frente de las líneas entre láminas (unas 4,4 µm de lámina). */
const LAMINAS = [7.2, 15.3, 19.6, 24, 28.4, 32.6];

/** Línea fina entre láminas, paralela al frente, interrumpida donde hay una laguna. */
function lineaLamina(profundidad: number): BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const medio = 0.15;
  const xs = muestras(-MEDIO_ANCHO, MEDIO_ANCHO, 4 * MEDIO_ANCHO);
  for (let i = 0; i < xs.length - 1; i++) {
    const [x0, x1] = [xs[i]!, xs[i + 1]!];
    const xm = (x0 + x1) / 2;
    const y = (x: number) => yFrente(x) - GROSOR_FRENTE - profundidad;
    if (LAGUNAS.some((l) => dentroDeLaguna(l, [xm, y(xm)], 0.8))) continue;
    const quad = [
      [x0, y(x0) - medio],
      [x1, y(x1) - medio],
      [x1, y(x1) + medio],
      [x0, y(x0) - medio],
      [x1, y(x1) + medio],
      [x0, y(x0) + medio],
    ];
    for (const [x, yy] of quad) {
      pos.push(x!, yy!, Z_LAMINA);
      uv.push(x!, yy!);
    }
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.computeVertexNormals();
  return g;
}

/* ----- Modelo ----- */

function unir(geos: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(geos);
  for (const x of geos) x.dispose();
  if (!g) throw new Error('No se pudieron unir las piezas del frente de mineralización.');
  return g;
}

/** Material de una región: físico, con el relieve a `repetir` veces por unidad de UV. */
function material(
  color: string,
  tipo: TipoTejido,
  repetir: number,
  extra: MeshPhysicalMaterialParameters = {},
): Material {
  const m = materialOrganico(color, tipo, { side: FrontSide, ...extra });
  m.bumpMap?.repeat.set(repetir, repetir);
  return m;
}

function malla(geometria: BufferGeometry, mat: Material, nombre: string): Mesh {
  const m = new Mesh(geometria, mat);
  m.name = nombre;
  return m;
}

function region(nombre: RegionFrente, ...mallas: Mesh[]): Group {
  const g = new Group();
  g.name = nombre;
  g.add(...mallas);
  return g;
}

/** Contorno del hueso mineralizado: de la base del bloque al borde inferior de la interfase del frente. */
function contornoHueso(): P2[] {
  return banda(
    (x) => yFrente(x) - GROSOR_FRENTE,
    () => Y_BASE,
  );
}

/** Construye el bloque: un grupo con un subgrupo por región. */
export function crearFrenteMineralizacion(): Group {
  const bloque = new Group();
  bloque.name = NOMBRE_MODELO;

  // Osteoblastos: la hilera de células, y en la fila cortada, el Golgi, el núcleo y el nucléolo.
  const cortes = cortesOsteoblastos();
  bloque.add(
    region(
      'osteoblastos',
      malla(
        unir(osteoblastos().map(geometriaOsteoblasto)),
        material(COLORES.osteoblasto, 'celula', 1 / 6),
        'osteoblastos_celulas',
      ),
      malla(
        unir(cortes.map(({ golgi: g }) => elipse(g.x, g.y, g.rx, g.ry, Z_GOLGI))),
        material(COLORES.golgi, 'organulo', 1),
        'osteoblastos_golgi',
      ),
      malla(
        unir(cortes.map(({ nucleo: n }) => elipse(n.x, n.y, n.rx, n.ry, Z_NUCLEO))),
        material(COLORES.nucleo, 'nucleo', 1 / 3),
        'osteoblastos_nucleos',
      ),
      malla(
        unir(
          cortes.map(({ nucleo: n }) =>
            elipse(n.x + n.rx * 0.25, n.y + n.ry * 0.2, 0.75, 0.7, Z_NUCLEOLO),
          ),
        ),
        material(COLORES.nucleolo, 'nucleo', 1),
        'osteoblastos_nucleolos',
      ),
    ),
  );

  // Osteoide: la costura de matriz sin mineral, de la superficie al frente.
  bloque.add(
    region(
      'osteoide',
      malla(
        prisma(forma(banda(() => 0, yFrente)), -FONDO, 0),
        material(COLORES.osteoide, 'fibra', 1 / 10, { bumpScale: 0.3 }),
        'osteoide_costura',
      ),
    ),
  );

  bloque.add(
    region(
      'vesiculas_matriz',
      malla(
        esferas(vesiculasMatriz(), 6, 4),
        material(COLORES.vesicula, 'liquido', 1),
        'vesiculas_matriz_esferas',
      ),
    ),
  );

  // Frente de mineralización: la interfase granular con sus nódulos de mineral.
  bloque.add(
    region(
      'frente_mineralizacion',
      malla(
        prisma(forma(banda(yFrente, (x) => yFrente(x) - GROSOR_FRENTE)), -FONDO, 0),
        material(COLORES.frente, 'hueso_inmaduro', 1 / 4, { bumpScale: 0.5 }),
        'frente_interfase',
      ),
      malla(
        esferas(nodulosFrente(), 7, 5, 0.85),
        material(COLORES.nodulo, 'hueso', 1),
        'frente_nodulos',
      ),
    ),
  );

  // Hueso mineralizado: el tramo de delante lleva los huecos de las lagunas abiertas por el corte.
  bloque.add(
    region(
      'hueso_mineralizado',
      malla(
        prisma(forma(contornoHueso()), -FONDO, -FONDO_LAGUNAS),
        material(COLORES.hueso, 'hueso', 1 / 9, { bumpScale: 0.35 }),
        'hueso_mineralizado_bloque',
      ),
      malla(
        prisma(
          forma(
            contornoHueso(),
            LAGUNAS.map((l) => contornoLaguna(l)),
          ),
          -FONDO_LAGUNAS,
          0,
        ),
        material(COLORES.hueso, 'hueso', 1 / 9, { bumpScale: 0.35 }),
        'hueso_mineralizado_corte',
      ),
      malla(
        unir(LAMINAS.map(lineaLamina)),
        material(COLORES.lamina, 'hueso', 1 / 9, { bumpScale: 0.2 }),
        'hueso_mineralizado_laminas',
      ),
    ),
  );

  // Osteocitos: la pared de la laguna, el cuerpo (cortado) y el núcleo, y el arranque de sus prolongaciones.
  bloque.add(
    region(
      'osteocito',
      malla(
        unir(LAGUNAS.map((l) => mediaElipsoide(l, 0))),
        // La pared se ve por dentro: doble cara.
        materialOrganico(COLORES.laguna, 'cavidad'),
        'osteocito_laguna',
      ),
      malla(
        unir([
          ...LAGUNAS.map((l) => mediaElipsoide(l, ESPACIO_PERICELULAR)),
          ...LAGUNAS.map((l) =>
            elipse(
              l.centro[0],
              l.centro[1],
              l.a - ESPACIO_PERICELULAR,
              l.b - ESPACIO_PERICELULAR,
              0.001,
              l.giro,
            ),
          ),
          prolongaciones(),
        ]),
        material(COLORES.osteocito, 'celula', 1),
        'osteocito_cuerpo',
      ),
      malla(
        unir(
          LAGUNAS.map((l) =>
            elipse(l.centro[0], l.centro[1], l.a * 0.42, l.b * 0.48, Z_NUCLEO_OSTEOCITO, l.giro),
          ),
        ),
        material(COLORES.nucleo, 'nucleo', 1),
        'osteocito_nucleo',
      ),
    ),
  );

  bloque.add(
    region(
      'canaliculos',
      malla(
        unir(canaliculos().map((p) => tubo(p, RADIO_CANALICULO))),
        material(COLORES.canaliculo, 'cavidad', 1),
        'canaliculos_conductos',
      ),
    ),
  );

  // Marcas de tetraciclina: dos láminas fluorescentes que atraviesan el bloque, paralelas al frente.
  bloque.add(
    region(
      'marcas_tetraciclina',
      malla(
        unir(
          ([0, 1] as const).map((i) =>
            prisma(
              forma(
                banda(
                  (x) => yMarca(i, x) + ANCHO_MARCA / 2,
                  (x) => yMarca(i, x) - ANCHO_MARCA / 2,
                  -MEDIO_ANCHO - 0.05,
                  MEDIO_ANCHO + 0.05,
                ),
              ),
              -FONDO - 0.05,
              Z_MARCA,
            ),
          ),
        ),
        material(COLORES.tetraciclina, 'hueso', 1 / 9, {
          bumpScale: 0.2,
          emissive: COLORES.fluorescencia,
          emissiveIntensity: 0.55,
        }),
        'marcas_tetraciclina_lineas',
      ),
    ),
  );

  return bloque;
}

/* ----- Puntos de las etiquetas ----- */

const FRENTE: Vec3 = [0, 0, 1];

/** La célula cortada más cercana a `x` (la etiqueta de los osteoblastos va en su citoplasma, bajo el Golgi). */
function corteCercano(x: number): CorteOsteoblasto {
  const cortes = cortesOsteoblastos();
  return cortes.reduce((mejor, c) =>
    Math.abs(c.nucleo.x - x) < Math.abs(mejor.nucleo.x - x) ? c : mejor,
  );
}

/** La vesícula más cercana al centro de su grupo (la etiqueta va sobre ella). */
function vesiculaDelGrupo(): Esfera {
  const [gx, gy] = GRUPO_VESICULAS;
  return vesiculasMatriz().reduce((mejor, v) =>
    Math.hypot(v.centro[0] - gx, v.centro[1] - gy) <
    Math.hypot(mejor.centro[0] - gx, mejor.centro[1] - gy)
      ? v
      : mejor,
  );
}

/** Punto de la etiqueta de cada región, sobre la cara de corte, y tamaño de la zona que encuadra la cámara. */
export function puntoDeRegion(id: RegionFrente): PuntoRegion {
  switch (id) {
    case 'osteoblastos': {
      const c = corteCercano(-22);
      return { punto: [c.nucleo.x, c.golgi.y - 2.2, 0.001], normal: FRENTE, radio: 12 };
    }
    case 'osteoide':
      return { punto: [-12, -4.5, 0.001], normal: FRENTE, radio: 9 };
    case 'vesiculas_matriz': {
      const v = vesiculaDelGrupo();
      return {
        punto: [v.centro[0], v.centro[1], v.centro[2] + v.radio],
        normal: FRENTE,
        radio: 2.5,
      };
    }
    case 'frente_mineralizacion':
      return { punto: [-3, yFrente(-3) - 0.55, 0.001], normal: FRENTE, radio: 6 };
    case 'hueso_mineralizado':
      return { punto: [-17, -37, 0.001], normal: FRENTE, radio: 16 };
    case 'osteocito': {
      const [x, y] = LAGUNAS[0]!.centro;
      return { punto: [x, y, Z_NUCLEO_OSTEOCITO], normal: FRENTE, radio: 7 };
    }
    case 'canaliculos': {
      // A media distancia entre los dos osteocitos, sobre el canalículo que los une.
      const curva = new CatmullRomCurve3(recorridoCanaliculo(CANALICULOS[8]!));
      const p = curva.getPoint(0.5);
      return { punto: [p.x, p.y, p.z + RADIO_CANALICULO], normal: FRENTE, radio: 6 };
    }
    case 'marcas_tetraciclina':
      return { punto: [-26, yMarca(0, -26), Z_MARCA], normal: FRENTE, radio: 9 };
  }
}

export function esRegionFrente(id: string): id is RegionFrente {
  return (REGIONES_FRENTE as readonly string[]).includes(id);
}

/** Muestras de x del bloque (una por micra), para las pruebas. */
export const MUESTRAS_X: readonly number[] = XS;
