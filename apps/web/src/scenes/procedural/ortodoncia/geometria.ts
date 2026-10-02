/**
 * Formas de la escena del movimiento ortodóntico (aquí sí se usa three). Son funciones y clases de construcción:
 * reciben polígonos y números y devuelven geometrías; no tienen estado propio de la anatomía ni dibujan nada.
 * Los polígonos salen de `disposicion.ts` (puro).
 *
 * Convención: los polígonos viven en el plano de corte `[x, y]`, que es el plano XY del mundo (z = 0, mirando
 * a +Z). Las placas (`placa`) se colocan a una profundidad `z`; los bloques (`bloque`) se extruyen desde z = 0
 * hacia −Z. Las BANDAS (`Banda`) y los ABANICOS (`Abanico`) son mallas de topología fija cuyos vértices se
 * recolocan en cada fotograma: así el alvéolo se deforma sin crear geometría nueva.
 */
import {
  BufferAttribute,
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Path,
  Shape,
  ShapeGeometry,
  Vector2,
} from 'three';
import type { Punto2 } from './disposicion';
import { perfilCorona } from './disposicion';

export const DOS_PI = Math.PI * 2;

function trazo(puntos: readonly Punto2[]): Path {
  const camino = new Path();
  puntos.forEach(([x, y], i) => (i === 0 ? camino.moveTo(x, y) : camino.lineTo(x, y)));
  camino.closePath();
  return camino;
}

/** Forma cerrada de three a partir de un polígono y sus agujeros. */
export function forma(
  contorno: readonly Punto2[],
  agujeros: readonly (readonly Punto2[])[] = [],
): Shape {
  const s = new Shape();
  contorno.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  for (const agujero of agujeros) s.holes.push(trazo(agujero));
  return s;
}

/** Placa plana (sin grosor) con la forma del polígono, en el plano de corte a la profundidad `z`. */
export function placa(
  contorno: readonly Punto2[],
  agujeros: readonly (readonly Punto2[])[] = [],
  z = 0,
): BufferGeometry {
  const g = new ShapeGeometry(forma(contorno, agujeros));
  if (z !== 0) g.translate(0, 0, z);
  return g;
}

/**
 * Bloque extruido hacia el fondo: el polígono (con sus agujeros, que quedan como túneles) se extiende
 * `profundidad` unidades desde z = 0 hacia −Z, con tapas en ambos extremos.
 */
export function bloque(
  contorno: readonly Punto2[],
  agujeros: readonly (readonly Punto2[])[],
  profundidad: number,
): BufferGeometry {
  const g = new ExtrudeGeometry(forma(contorno, agujeros), {
    depth: profundidad,
    bevelEnabled: false,
    curveSegments: 1,
  });
  g.translate(0, 0, -profundidad);
  return g;
}

/** Media corona del diente (torno del perfil de `perfilCorona`): la mitad trasera, en z < 0, con el eje en x = 0. */
export function mediaCorona(segmentos = 24): BufferGeometry {
  const puntos = perfilCorona().map(([r, y]) => new Vector2(r, y));
  return new LatheGeometry(puntos, segmentos, Math.PI / 2, Math.PI);
}

/** Escribe la normal (0, 0, 1) en todos los vértices: las placas miran a la cámara. */
function normalesHaciaCamara(g: BufferGeometry, n: number): void {
  const normales = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) normales[i * 3 + 2] = 1;
  g.setAttribute('normal', new Float32BufferAttribute(normales, 3));
}

/**
 * Banda entre dos contornos abiertos con el mismo número de muestras (`n`): una tira de 2·(n − 1) triángulos
 * cuyos vértices se recolocan con `poner`. Sirve para el ligamento, la lámina, el hueso nuevo y el osteoide.
 */
export class Banda {
  readonly geometria = new BufferGeometry();
  private readonly posiciones: Float32Array;

  constructor(readonly n: number) {
    this.posiciones = new Float32Array(n * 2 * 3);
    // `BufferAttribute` (no `Float32BufferAttribute`): usa el mismo arreglo en vez de copiarlo.
    this.geometria.setAttribute('position', new BufferAttribute(this.posiciones, 3));
    normalesHaciaCamara(this.geometria, n * 2);
    const indices: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.geometria.setIndex(indices);
  }

  /**
   * Coloca la banda entre `a` y `b`, desde la muestra `desde`, en `z`. Si la banda quedara con los triángulos en
   * sentido horario (visto desde +Z), three invertiría su normal y se vería oscura: se comprueba el área con
   * signo y, si hace falta, se intercambian los dos bordes.
   */
  poner(a: readonly Punto2[], b: readonly Punto2[], z: number, desde = 0): void {
    let area = 0;
    for (let i = 0; i < this.n - 1; i++) {
      const pa = a[desde + i]!;
      const pb = b[desde + i]!;
      const pc = a[desde + i + 1]!;
      area += (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
    }
    const [interior, exterior] = area >= 0 ? [a, b] : [b, a];
    for (let i = 0; i < this.n; i++) {
      const pa = interior[desde + i]!;
      const pb = exterior[desde + i]!;
      const k = i * 6;
      this.posiciones[k] = pa[0];
      this.posiciones[k + 1] = pa[1];
      this.posiciones[k + 2] = z;
      this.posiciones[k + 3] = pb[0];
      this.posiciones[k + 4] = pb[1];
      this.posiciones[k + 5] = z;
    }
    this.geometria.getAttribute('position').needsUpdate = true;
    this.geometria.computeBoundingSphere();
  }
}

/**
 * Abanico: un polígono cerrado (estrellado respecto de `centro`) relleno con `n` triángulos desde el centro.
 * Sirve para la raíz, la corona y la pulpa, que se mueven con el diente.
 */
export class Abanico {
  readonly geometria = new BufferGeometry();
  private readonly posiciones: Float32Array;

  constructor(readonly n: number) {
    this.posiciones = new Float32Array((n + 1) * 3);
    // `BufferAttribute` (no `Float32BufferAttribute`): usa el mismo arreglo en vez de copiarlo.
    this.geometria.setAttribute('position', new BufferAttribute(this.posiciones, 3));
    normalesHaciaCamara(this.geometria, n + 1);
    const indices: number[] = [];
    for (let i = 0; i < n; i++) indices.push(0, 1 + i, 1 + ((i + 1) % n));
    this.geometria.setIndex(indices);
  }

  poner(contorno: readonly Punto2[], centro: Punto2, z: number): void {
    this.posiciones[0] = centro[0];
    this.posiciones[1] = centro[1];
    this.posiciones[2] = z;
    for (let i = 0; i < this.n; i++) {
      const p = contorno[i]!;
      const k = (i + 1) * 3;
      this.posiciones[k] = p[0];
      this.posiciones[k + 1] = p[1];
      this.posiciones[k + 2] = z;
    }
    this.geometria.getAttribute('position').needsUpdate = true;
    this.geometria.computeBoundingSphere();
  }
}

/**
 * Polilíneas para `LineSegments`: `cantidad` polilíneas de `puntosPorLinea` puntos cada una, recolocables.
 * Sirve para las fibras del ligamento.
 */
export class Polilineas {
  readonly geometria = new BufferGeometry();
  private readonly posiciones: Float32Array;

  constructor(
    readonly cantidad: number,
    readonly puntosPorLinea: number,
  ) {
    this.posiciones = new Float32Array(cantidad * (puntosPorLinea - 1) * 2 * 3);
    // `BufferAttribute` (no `Float32BufferAttribute`): usa el mismo arreglo en vez de copiarlo.
    this.geometria.setAttribute('position', new BufferAttribute(this.posiciones, 3));
  }

  poner(lineas: readonly (readonly Punto2[])[], z: number): void {
    let k = 0;
    for (const linea of lineas) {
      for (let i = 0; i < this.puntosPorLinea - 1; i++) {
        const a = linea[i]!;
        const b = linea[i + 1]!;
        this.posiciones[k++] = a[0];
        this.posiciones[k++] = a[1];
        this.posiciones[k++] = z;
        this.posiciones[k++] = b[0];
        this.posiciones[k++] = b[1];
        this.posiciones[k++] = z;
      }
    }
    this.geometria.getAttribute('position').needsUpdate = true;
    this.geometria.computeBoundingSphere();
  }
}

/** Contorno cerrado como geometría de línea (para `LineLoop`) a la profundidad `z`. */
export function lineaCerrada(puntos: readonly Punto2[], z: number): BufferGeometry {
  const posiciones: number[] = [];
  for (const [x, y] of puntos) posiciones.push(x, y, z);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(posiciones, 3));
  return g;
}
