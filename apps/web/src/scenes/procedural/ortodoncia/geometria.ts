/**
 * Formas de la escena del movimiento ortodóntico (aquí sí se usa three). Son funciones y clases de construcción:
 * reciben polígonos y números y devuelven geometrías; no tienen estado propio de la anatomía ni dibujan nada.
 * Los polígonos salen de `disposicion.ts` (puro).
 *
 * Convención: los polígonos viven en el plano de corte `[x, y]`, que es el plano XY del mundo (z = 0, mirando
 * a +Z). Las placas (`placa`) se colocan a una profundidad `z`; los bloques (`bloque`) se extruyen desde z = 0
 * hacia −Z. Las BANDAS (`Banda`) y los ABANICOS (`Abanico`) son mallas de topología fija cuyos vértices se
 * recolocan en cada fotograma: así el alvéolo se deforma sin crear geometría nueva.
 *
 * Realismo (2026-10-14): todas las formas traen coordenadas UV (las necesita el relieve de superficie de los
 * materiales de `realismo.ts`), EN UNIDADES DE ESCENA: las placas y los bloques, las de three (x, y); las bandas,
 * a lo largo y a través de la banda; los abanicos, relativas a su centro (la textura viaja con el diente). Los
 * bloques pueden llevar un bisel redondeado y la corona es un torno de perfil suavizado.
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Path,
  Shape,
  ShapeGeometry,
  SplineCurve,
  Vector2,
} from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { pintarEsmalte } from '../alveolar/geometria';
import type { Punto2 } from './disposicion';
import { perfilCorona, siluetaRaiz } from './disposicion';
import { Y_CRESTA } from './estado';

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
 *
 * Con `bisel` (> 0) los cantos se redondean (dos segmentos, normales suavizadas): ni un hueso ni la encía tienen
 * aristas vivas. La tapa delantera sigue en z = 0 con el contorno exacto (ahí se apoyan las capas de la cara de
 * corte) y el fondo en −`profundidad`; detrás del bisel el sólido crece `bisel` hacia fuera (y los túneles
 * encogen otro tanto).
 */
export function bloque(
  contorno: readonly Punto2[],
  agujeros: readonly (readonly Punto2[])[],
  profundidad: number,
  bisel = 0,
): BufferGeometry {
  const b = Math.max(0, Math.min(bisel, profundidad * 0.45));
  if (b === 0) {
    const g = new ExtrudeGeometry(forma(contorno, agujeros), {
      depth: profundidad,
      bevelEnabled: false,
      curveSegments: 1,
    });
    g.translate(0, 0, -profundidad);
    return g;
  }
  const g = new ExtrudeGeometry(forma(contorno, agujeros), {
    depth: profundidad - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments: 1,
  });
  // Con bisel la extrusión va de z = −b a z = profundidad − b: se lleva la tapa del final a z = 0.
  g.translate(0, 0, -(profundidad - b));
  // ExtrudeGeometry no comparte vértices (normales planas por triángulo): se suavizan entre caras que forman
  // menos de ~70°, así el bisel queda redondo y las aristas vivas del contorno siguen nítidas.
  return toCreasedNormals(g, Math.PI * 0.39);
}

/**
 * Perfil de la corona suavizado: la curva que pasa por los puntos de `perfilCorona` (dos tramos por cada lado
 * del polígono original), `[radio, y]` del cuello a la cúspide. Sin aristas de polígono en el torno ni en la
 * cara de corte.
 */
export function perfilCoronaSuave(): readonly (readonly [radio: number, y: number])[] {
  const control = perfilCorona();
  const curva = new SplineCurve(control.map(([r, y]) => new Vector2(r, y)));
  const puntos = curva.getPoints(2 * (control.length - 1));
  // Solo la cúspide queda sobre el eje (radio 0): un radio nulo antes daría triángulos degenerados.
  return puntos.map((p, i) => [i === puntos.length - 1 ? 0 : Math.max(0.004, p.x), p.y] as const);
}

/** Silueta de la corona en el plano de corte con el perfil suavizado (el perfil y su reflejo), antihoraria. */
export function siluetaCoronaSuave(): Punto2[] {
  const perfil = perfilCoronaSuave();
  const puntos: Punto2[] = perfil.map(([r, y]) => [r, y] as const);
  for (let i = perfil.length - 2; i >= 0; i--) puntos.push([-perfil[i]![0], perfil[i]![1]]);
  return puntos;
}

/** Fracción de la altura de la corona hasta la que llega la dentina (el resto es la cúspide de esmalte). */
const ALTURA_DENTINA = 0.8;
/** Cuánto encoge la dentina a lo ancho respecto de la corona por encima del tercio cervical (esmalte lateral). */
const ESMALTE_LATERAL = 0.2;

/** Radio de un perfil `[radio, y]` (y creciente) a la altura `y`, interpolado; 0 fuera de él. */
function radioEnAltura(perfil: readonly (readonly [number, number])[], y: number): number {
  for (let i = 0; i < perfil.length - 1; i++) {
    const [r0, y0] = perfil[i]!;
    const [r1, y1] = perfil[i + 1]!;
    if (y < y0 || y > y1) continue;
    return y1 > y0 ? r0 + ((r1 - r0) * (y - y0)) / (y1 - y0) : Math.max(r0, r1);
  }
  return 0;
}

/**
 * Perfil de la dentina coronal, `[radio, y]` del cuello a su cúspide: la unión amelodentinaria. Es el perfil de la
 * corona encogido hacia el cuello, así que el esmalte la cubre como un casquete que se afina hasta desaparecer en
 * el cuello (la unión amelocementaria) y es más grueso en la cúspide (un 20 % de la altura de la corona). Nunca se
 * sale de la corona a su misma altura: en el tercio cervical la corona se ensancha hacia arriba y el perfil
 * encogido asomaría por fuera del esmalte.
 */
export function perfilDentinaCoronal(): readonly (readonly [radio: number, y: number])[] {
  const corona = perfilCoronaSuave();
  const y0 = corona[0]![1];
  const alto = corona[corona.length - 1]![1] - y0;
  const ancho = (y: number): number => {
    const k = Math.min(1, (y - y0) / alto / 0.4);
    return 1 - ESMALTE_LATERAL * k * k * (3 - 2 * k);
  };
  return corona.map(([r, y], i) => {
    const yd = y0 + (y - y0) * ALTURA_DENTINA;
    if (i === corona.length - 1) return [0, yd] as const;
    return [Math.min(r * ancho(y), radioEnAltura(corona, yd) * ancho(yd)), yd] as const;
  });
}

/**
 * Centro desde el que se rellena en abanico la silueta de la dentina (en el marco del diente): en el eje, por
 * debajo de la cresta. Desde ahí la silueta es estrellada (cada lado gira en el mismo sentido); más abajo, el
 * ensanche de la dentina coronal junto al cuello plegaría el abanico.
 */
export const CENTRO_DENTINA: Punto2 = [0, Y_CRESTA - 0.7];

/**
 * Silueta de TODA la dentina del diente en el plano de corte, antihoraria: la de la raíz (`siluetaRaiz`, de la
 * cresta izquierda al ápice y a la cresta derecha) y, encima, la coronal, que empieza en el cuello (sube por la
 * derecha hasta su cúspide y baja por la izquierda); entre la cresta y el cuello, el lado recto es la raíz cervical.
 * Raíz y corona son una sola dentina, sin escalón en el cuello. Se rellena con un `Abanico` desde `CENTRO_DENTINA`.
 */
export function siluetaDentina(): Punto2[] {
  const coronal = perfilDentinaCoronal().filter(([, y]) => y > Y_CRESTA + 1e-6);
  const puntos: Punto2[] = [...siluetaRaiz()];
  for (const [r, y] of coronal) puntos.push([r, y]);
  for (let i = coronal.length - 2; i >= 0; i--) puntos.push([-coronal[i]![0], coronal[i]![1]]);
  return puntos;
}

/**
 * Media corona del diente (torno del perfil suavizado de `perfilCorona`): la mitad trasera, en z < 0, con el eje
 * en x = 0. Lleva el degradado del esmalte por vértice (realismo-10), el mismo de las otras escenas dentales: del
 * cuello (amarillento) a la cúspide (gris azulado), según la altura.
 */
export function mediaCorona(segmentos = 24): BufferGeometry {
  const perfil = perfilCoronaSuave();
  const puntos = perfil.map(([r, y]) => new Vector2(r, y));
  const yMin = perfil[0]![1];
  const yMax = perfil[perfil.length - 1]![1];
  return pintarEsmalte(
    new LatheGeometry(puntos, segmentos, Math.PI / 2, Math.PI),
    yMin,
    yMax - yMin,
  );
}

/**
 * Bracket esquemático en una sola geometría, centrado en el origen: la base que se pega a la corona (hacia −Z) y
 * el cuerpo con sus dos aletas, arriba y abajo de la ranura horizontal por la que pasaría el arco.
 */
export function bracket(): BufferGeometry {
  // RoundedBoxGeometry no es indexada: las aletas tampoco (mergeGeometries exige que todas lo sean o ninguna).
  const base = new RoundedBoxGeometry(0.3, 0.27, 0.035, 1, 0.012);
  base.translate(0, 0, -0.045);
  const partes: BufferGeometry[] = [base];
  for (const y of [0.072, -0.072]) {
    const caja = new BoxGeometry(0.24, 0.085, 0.085);
    const aleta = caja.toNonIndexed();
    caja.dispose();
    aleta.translate(0, y, 0.015);
    partes.push(aleta);
  }
  const unida = mergeGeometries(partes, false);
  for (const p of partes) p.dispose();
  if (!unida) throw new Error('No se pudo unir la geometría del bracket.');
  return unida;
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
  private readonly uv: Float32Array;

  constructor(readonly n: number) {
    this.posiciones = new Float32Array(n * 2 * 3);
    this.uv = new Float32Array(n * 2 * 2);
    // `BufferAttribute` (no `Float32BufferAttribute`): usa el mismo arreglo en vez de copiarlo.
    this.geometria.setAttribute('position', new BufferAttribute(this.posiciones, 3));
    this.geometria.setAttribute('uv', new BufferAttribute(this.uv, 2));
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
   *
   * UV en unidades de escena: `u` es lo recorrido a lo largo del borde `a` y `v` la distancia de `a` a `b` (0 en
   * `a`). La textura sigue a la banda y no se estira al ensancharse; con un patrón de vetas (ligamento), las
   * vetas cruzan la banda de un borde al otro, como las fibras.
   */
  poner(a: readonly Punto2[], b: readonly Punto2[], z: number, desde = 0): void {
    let area = 0;
    for (let i = 0; i < this.n - 1; i++) {
      const pa = a[desde + i]!;
      const pb = b[desde + i]!;
      const pc = a[desde + i + 1]!;
      area += (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
    }
    const aPrimero = area >= 0;
    const [interior, exterior] = aPrimero ? [a, b] : [b, a];
    let u = 0;
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
      if (i > 0) {
        const actual = a[desde + i]!;
        const previa = a[desde + i - 1]!;
        u += Math.hypot(actual[0] - previa[0], actual[1] - previa[1]);
      }
      const ancho = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
      const q = i * 4;
      this.uv[q] = u;
      this.uv[q + 1] = aPrimero ? 0 : ancho;
      this.uv[q + 2] = u;
      this.uv[q + 3] = aPrimero ? ancho : 0;
    }
    this.geometria.getAttribute('position').needsUpdate = true;
    this.geometria.getAttribute('uv').needsUpdate = true;
    this.geometria.computeBoundingSphere();
  }
}

/**
 * Abanico: un polígono cerrado (estrellado respecto de `centro`) relleno con `n` triángulos desde el centro.
 * Sirve para la raíz, la corona y la pulpa, que se mueven con el diente. Sus UV son la posición respecto del
 * centro (en unidades de escena): la textura de relieve viaja con el diente.
 */
export class Abanico {
  readonly geometria = new BufferGeometry();
  private readonly posiciones: Float32Array;
  private readonly uv: Float32Array;

  constructor(readonly n: number) {
    this.posiciones = new Float32Array((n + 1) * 3);
    this.uv = new Float32Array((n + 1) * 2);
    // `BufferAttribute` (no `Float32BufferAttribute`): usa el mismo arreglo en vez de copiarlo.
    this.geometria.setAttribute('position', new BufferAttribute(this.posiciones, 3));
    this.geometria.setAttribute('uv', new BufferAttribute(this.uv, 2));
    normalesHaciaCamara(this.geometria, n + 1);
    const indices: number[] = [];
    for (let i = 0; i < n; i++) indices.push(0, 1 + i, 1 + ((i + 1) % n));
    this.geometria.setIndex(indices);
  }

  poner(contorno: readonly Punto2[], centro: Punto2, z: number): void {
    this.posiciones[0] = centro[0];
    this.posiciones[1] = centro[1];
    this.posiciones[2] = z;
    this.uv[0] = 0;
    this.uv[1] = 0;
    for (let i = 0; i < this.n; i++) {
      const p = contorno[i]!;
      const k = (i + 1) * 3;
      this.posiciones[k] = p[0];
      this.posiciones[k + 1] = p[1];
      this.posiciones[k + 2] = z;
      this.uv[(i + 1) * 2] = p[0] - centro[0];
      this.uv[(i + 1) * 2 + 1] = p[1] - centro[1];
    }
    this.geometria.getAttribute('position').needsUpdate = true;
    this.geometria.getAttribute('uv').needsUpdate = true;
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
