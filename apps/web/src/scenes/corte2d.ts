/**
 * Piezas comunes de los modelos construidos por código que muestran un CORTE de tejido (`modelosPorCodigo.ts`): la
 * cara de corte es el plano z = 0 y mira a la cámara (+Z); lo que se dibuja sobre ella va un poco por delante, en
 * capas planas, y el volumen queda detrás (z < 0).
 *
 * Todo es determinista: las posiciones «al azar» salen de `azar(semilla)`, así el modelo es siempre el mismo y las
 * pruebas pueden fijarlo.
 */
import type { BufferGeometry, Material, Side } from 'three';
import {
  BackSide,
  BufferAttribute,
  BufferGeometry as Geometria,
  CylinderGeometry,
  ExtrudeGeometry,
  FrontSide,
  Group,
  Mesh,
  Path,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { TipoTejido } from './procedural/realismo';
import { materialOrganico } from './procedural/realismo';

export type Punto2 = readonly [number, number];

/** Generador pseudoaleatorio con semilla (mulberry32): números en [0, 1). */
export function azar(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Contorno cerrado alrededor de (cx, cy) con radio `r(θ)`, en sentido antihorario. */
export function contornoPolar(
  cx: number,
  cy: number,
  r: (theta: number) => number,
  segmentos = 48,
): Punto2[] {
  return Array.from({ length: segmentos }, (_, i) => {
    const t = (2 * Math.PI * i) / segmentos;
    const radio = r(t);
    return [cx + radio * Math.cos(t), cy + radio * Math.sin(t)] as const;
  });
}

/** Elipse de semiejes `a` (a lo largo de `angulo`) y `b`. */
export function contornoElipse(
  cx: number,
  cy: number,
  a: number,
  b: number,
  angulo = 0,
  segmentos = 18,
): Punto2[] {
  const [c, s] = [Math.cos(angulo), Math.sin(angulo)];
  return Array.from({ length: segmentos }, (_, i) => {
    const t = (2 * Math.PI * i) / segmentos;
    const [x, y] = [a * Math.cos(t), b * Math.sin(t)];
    return [cx + x * c - y * s, cy + x * s + y * c] as const;
  });
}

function aForma(puntos: readonly Punto2[], huecos: readonly (readonly Punto2[])[] = []): Shape {
  const forma = new Shape(puntos.map(([x, y]) => new Vector2(x, y)));
  for (const h of huecos) forma.holes.push(new Path(h.map(([x, y]) => new Vector2(x, y))));
  return forma;
}

/** Polígono plano (con huecos opcionales) a la altura `z`, mirando a +Z. UV = (x, y). */
export function plano(
  puntos: readonly Punto2[],
  z: number,
  huecos: readonly (readonly Punto2[])[] = [],
): BufferGeometry {
  const g = new ShapeGeometry(aForma(puntos, huecos), 1);
  g.translate(0, 0, z);
  return g;
}

/**
 * Prisma de `profundidad` hacia atrás: su cara delantera queda en z = 0 y mira a +Z. Con huecos, sus paredes
 * interiores también se ven desde delante.
 */
export function prisma(
  puntos: readonly Punto2[],
  profundidad: number,
  huecos: readonly (readonly Punto2[])[] = [],
): BufferGeometry {
  const g = new ExtrudeGeometry(aForma(puntos, huecos), {
    depth: profundidad,
    bevelEnabled: false,
    curveSegments: 1,
  });
  g.translate(0, 0, -profundidad);
  return g;
}

/** Contorno agrandado `margen` desde su centroide (el hueco del tejido alrededor de una cavidad). */
export function agrandar(puntos: readonly Punto2[], margen: number): Punto2[] {
  const cx = puntos.reduce((s, p) => s + p[0], 0) / puntos.length;
  const cy = puntos.reduce((s, p) => s + p[1], 0) / puntos.length;
  return puntos.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [x + ((x - cx) / d) * margen, y + ((y - cy) / d) * margen] as const;
  });
}

/**
 * Banda plana entre dos líneas (`izquierda` y `derecha`, con el mismo número de puntos) a la altura `z`, mirando a
 * +Z. Sirve para anillos, arcos, trazos y bandas que siguen una curva.
 */
export function tira(
  izquierda: readonly Punto2[],
  derecha: readonly Punto2[],
  z: number,
): BufferGeometry {
  const n = Math.min(izquierda.length, derecha.length);
  const posiciones: number[] = [];
  const triangulo = (a: Punto2, b: Punto2, c: Punto2): void => {
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const [p, q] = area >= 0 ? [b, c] : [c, b];
    posiciones.push(a[0], a[1], z, p[0], p[1], z, q[0], q[1], z);
  };
  for (let i = 0; i < n - 1; i++) {
    const [l0, l1, r0, r1] = [izquierda[i]!, izquierda[i + 1]!, derecha[i]!, derecha[i + 1]!];
    triangulo(l0, r0, r1);
    triangulo(l0, r1, l1);
  }
  const g = new Geometria();
  const pos = new Float32Array(posiciones);
  g.setAttribute('position', new BufferAttribute(pos, 3));
  const normales = new Float32Array(pos.length);
  const uv = new Float32Array((pos.length / 3) * 2);
  for (let i = 0; i < pos.length / 3; i++) {
    normales[i * 3 + 2] = 1;
    uv[i * 2] = pos[i * 3]!;
    uv[i * 2 + 1] = pos[i * 3 + 1]!;
  }
  g.setAttribute('normal', new BufferAttribute(normales, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  return g;
}

/** Anillo plano entre dos contornos cerrados con el mismo número de puntos. */
export function anillo(
  interior: readonly Punto2[],
  exterior: readonly Punto2[],
  z: number,
): BufferGeometry {
  return tira([...interior, interior[0]!], [...exterior, exterior[0]!], z);
}

/** Trazo de una polilínea con un ancho (constante o por punto), a la altura `z`. */
export function trazo(
  puntos: readonly Punto2[],
  ancho: number | ((i: number) => number),
  z: number,
): BufferGeometry {
  const izquierda: Punto2[] = [];
  const derecha: Punto2[] = [];
  puntos.forEach((p, i) => {
    const a = puntos[Math.max(0, i - 1)]!;
    const b = puntos[Math.min(puntos.length - 1, i + 1)]!;
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const largo = Math.hypot(dx, dy) || 1;
    const medio = (typeof ancho === 'number' ? ancho : ancho(i)) / 2;
    const [nx, ny] = [(-dy / largo) * medio, (dx / largo) * medio];
    izquierda.push([p[0] + nx, p[1] + ny]);
    derecha.push([p[0] - nx, p[1] - ny]);
  });
  return tira(izquierda, derecha, z);
}

/**
 * Media célula o media gota cortada por el plano: un semielipsoide de semiejes `a` (a lo largo de `angulo`), `b` y
 * alto `alto`, con la base en z = `z` y la cúpula hacia +Z.
 */
export function cupula(
  cx: number,
  cy: number,
  a: number,
  b: number,
  alto: number,
  z: number,
  angulo = 0,
  segmentos: readonly [number, number] = [12, 5],
): BufferGeometry {
  const g = new SphereGeometry(1, segmentos[0], segmentos[1], 0, Math.PI * 2, 0, Math.PI / 2);
  g.rotateX(Math.PI / 2);
  g.scale(a, b, alto);
  g.rotateZ(angulo);
  g.translate(cx, cy, z);
  return g;
}

/** Cilindro de radio `radio` (o `[inicio, fin]`) entre dos puntos del espacio. */
export function varilla(
  desde: readonly [number, number, number],
  hasta: readonly [number, number, number],
  radio: number | readonly [number, number],
  lados = 6,
): BufferGeometry {
  const a = new Vector3(...desde);
  const b = new Vector3(...hasta);
  const eje = b.clone().sub(a);
  const largo = eje.length();
  const [r0, r1] = typeof radio === 'number' ? [radio, radio] : radio;
  // CylinderGeometry va a lo largo de +Y: radiusTop es el extremo `hasta`.
  const g = new CylinderGeometry(r1, r0, largo, lados, 1, true);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), eje.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

/** Une geometrías (todas con o todas sin índice) en una sola y libera las piezas. */
export function unir(geos: BufferGeometry[]): BufferGeometry {
  const conIndice = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const g = mergeGeometries(conIndice);
  for (const x of geos) x.dispose();
  for (const x of conIndice) x.dispose();
  if (!g) throw new Error('No se pudieron unir las piezas del modelo.');
  return g;
}

/**
 * Material de un tejido con el relieve a `repetir` veces por unidad del modelo (las UV de las caras planas van en
 * unidades del modelo). Una sola cara por defecto.
 */
export function material(
  color: string,
  tipo: TipoTejido,
  repetir = 1,
  lado: Side = FrontSide,
): Material {
  const m = materialOrganico(color, tipo, { side: lado });
  m.bumpMap?.repeat.set(repetir, repetir);
  return m;
}

/**
 * Material del interior de un conducto o de una cavidad que se abre en la cara de corte: se pone a un `prisma` de su
 * contorno y se dibujan sus caras de dentro (`BackSide`), así se ven sus paredes y su fondo. El tejido que lo rodea
 * lleva un hueco algo más ancho (`agrandar`), para que las dos paredes no coincidan.
 */
export function materialInterior(color: string, tipo: TipoTejido = 'cavidad'): Material {
  return material(color, tipo, 1, BackSide);
}

export function malla(geometria: BufferGeometry, mat: Material, nombre: string): Mesh {
  const m = new Mesh(geometria, mat);
  m.name = nombre;
  return m;
}

/** Grupo con nombre (una región del catálogo o una pieza de fondo) con sus mallas. */
export function grupo(nombre: string, ...mallas: Mesh[]): Group {
  const g = new Group();
  g.name = nombre;
  if (mallas.length > 0) g.add(...mallas);
  return g;
}
