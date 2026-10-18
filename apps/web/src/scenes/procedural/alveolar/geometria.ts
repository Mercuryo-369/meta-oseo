/**
 * Formas de la escena del hueso alveolar (aquí sí se usa three). Son funciones de construcción: reciben
 * polígonos y números y devuelven geometrías; no tienen estado ni dibujan nada. Los polígonos salen de
 * `disposicion.ts` (puro).
 *
 * Convención: los polígonos viven en el plano de corte con coordenadas `[z, y]`. Las formas planas
 * (`placa`) y los bloques extruidos (`bloque`) se giran para que ese plano sea el YZ del mundo: un punto
 * `[z, y]` va a `(x, y, z)`, y la extrusión avanza hacia −X (la mitad fija del cuerpo ocupa x de −largo a 0).
 * Los cilindros y tornos siguen la convención de three alrededor del eje Y (x = sen θ, z = cos θ): la mitad
 * x < 0 es θ de PI a 2·PI.
 *
 * Realismo (2026-10-14): las placas y los bloques llevan UV EN UNIDADES DE LA ESCENA (las placas, la posición
 * en el plano de corte; las paredes de los bloques, el recorrido a lo largo del contorno y la profundidad). Los
 * materiales (`mallas.ts`) fijan cuántas repeticiones del relieve de superficie caben en una unidad.
 */
import type { BufferGeometry, UVGenerator } from 'three';
import {
  BufferGeometry as Geometria,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Path,
  Shape,
  ShapeGeometry,
  Vector2,
} from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Punto2 } from './disposicion';
import { Y_CUELLO, meridianoCorona } from './disposicion';
import { ALTO_CORONA, SEMIANCHO_RAIZ, Y_CRESTA, Z_ALVEOLO } from './estado';
import { ESMALTE } from './paleta';

export const DOS_PI = Math.PI * 2;

/**
 * Ángulo máximo entre dos caras vecinas de la pared de un bloque para sombrearlas como una superficie continua.
 * Las aristas entre las paredes y las tapas (90°) quedan vivas, como en un corte de sierra.
 */
const PLIEGUE = Math.PI / 5;

function trazo(puntos: readonly Punto2[]): Path {
  const camino = new Path();
  puntos.forEach(([z, y], i) => (i === 0 ? camino.moveTo(z, y) : camino.lineTo(z, y)));
  camino.closePath();
  return camino;
}

/** Forma cerrada de three a partir de un polígono y sus agujeros. */
export function forma(
  contorno: readonly Punto2[],
  agujeros: readonly (readonly Punto2[])[] = [],
): Shape {
  const s = new Shape();
  contorno.forEach(([z, y], i) => (i === 0 ? s.moveTo(z, y) : s.lineTo(z, y)));
  s.closePath();
  for (const agujero of agujeros) s.holes.push(trazo(agujero));
  return s;
}

/** Lleva una geometría construida en el plano XY (x = z del corte, y = y) al plano YZ del mundo, en x = `x`. */
function alPlanoDeCorte(g: BufferGeometry, x: number): BufferGeometry {
  g.rotateY(-Math.PI / 2);
  if (x !== 0) g.translate(x, 0, 0);
  return g;
}

/**
 * Placa plana (sin grosor) con la forma del polígono, en el plano de corte a la profundidad `x`, con la cara
 * delantera hacia +X, hacia la cámara (como la tapa x = 0 de `bloque`). Sus UV son la posición `[z, y]` en el plano
 * (unidades de la escena).
 *
 * Revisión de diseño (2026-10-17, render-02): el giro de `alPlanoDeCorte` deja la cara delantera de un
 * `ShapeGeometry` (+Z) mirando a −X, y todas las capas del corte se veían por detrás: el sesgo de las sombras metía
 * la consulta detrás de la placa y de la tapa del bloque, y la cara de corte quedaba en sombra (55-75 %). Se invierte
 * el orden de cada triángulo y la normal pasa a +X. `alPlanoDeCorte` no cambia: `bloque` sí queda bien con él.
 */
export function placa(
  contorno: readonly Punto2[],
  agujeros: readonly (readonly Punto2[])[] = [],
  x = 0,
): BufferGeometry {
  const g = alPlanoDeCorte(new ShapeGeometry(forma(contorno, agujeros)), x);
  const indice = g.getIndex()!;
  for (let i = 0; i < indice.count; i += 3) {
    const b = indice.getX(i + 1);
    indice.setX(i + 1, indice.getX(i + 2));
    indice.setX(i + 2, b);
  }
  const normal = g.getAttribute('normal');
  for (let i = 0; i < normal.count; i++) normal.setXYZ(i, 1, 0, 0);
  return g;
}

/* -------------------------------------------------------------------------------------------
 * Color del esmalte por vértice (revisión de diseño, 2026-10-17, realismo-10)
 * ----------------------------------------------------------------------------------------- */

const _cuello = new Color(ESMALTE.cuello);
const _medio = new Color(ESMALTE.medio);
const _cuspide = new Color(ESMALTE.cuspide);
const _color = new Color();

/**
 * Escribe en `g` un atributo `color` con el degradado del esmalte (`ESMALTE` de `paleta.ts`) según la altura de cada
 * vértice sobre el cuello, de `yCuello` (0) a `yCuello + alto` (1): amarillento en el cuello, blanco cálido en el
 * medio, gris azulado en la cúspide. Los colores van en el espacio lineal de trabajo (`Color` convierte el hex sRGB),
 * que es el que three espera en un atributo de color. Lo usa el material del esmalte con `vertexColors`. Las tres
 * escenas dentales usan la misma regla (la altura, no la fila de la malla): el mismo diente.
 */
export function pintarEsmalte(g: BufferGeometry, yCuello: number, alto: number): BufferGeometry {
  const posicion = g.getAttribute('position');
  const colores = new Float32Array(posicion.count * 3);
  for (let i = 0; i < posicion.count; i++) {
    const k = Math.max(0, Math.min(1, (posicion.getY(i) - yCuello) / alto));
    if (k < 0.5) _color.lerpColors(_cuello, _medio, k / 0.5);
    else _color.lerpColors(_medio, _cuspide, (k - 0.5) / 0.5);
    colores.set([_color.r, _color.g, _color.b], i * 3);
  }
  g.setAttribute('color', new Float32BufferAttribute(colores, 3));
  return g;
}

/**
 * Escribe en `g` un atributo `color` uniforme (hex sRGB): para las piezas que comparten el material del esmalte con
 * color por vértice, como la cara de corte del esmalte (el esmalte cortado, sin la dentina que transparenta por
 * fuera, es de un blanco uniforme).
 */
export function pintarUniforme(g: BufferGeometry, hex: string): BufferGeometry {
  const c = new Color(hex);
  const posicion = g.getAttribute('position');
  const colores = new Float32Array(posicion.count * 3);
  for (let i = 0; i < posicion.count; i++) colores.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(colores, 3));
  return g;
}

/** Clave exacta de un punto del contorno (ExtrudeGeometry conserva las coordenadas de la forma). */
function clave(z: number, y: number): string {
  return `${Math.round(z * 1e6)},${Math.round(y * 1e6)}`;
}

/**
 * Generador de UV EN UNIDADES DE LA ESCENA para `ExtrudeGeometry` (el de three usa en cada pared un eje distinto
 * y deja costuras): en las tapas, la posición en el plano de corte; en las paredes, el recorrido a lo largo de su
 * contorno (en espejo: crece hasta la mitad del contorno y vuelve, así que no hay costura donde se cierra) y la
 * profundidad.
 */
function uvEnUnidades(contornos: readonly (readonly Punto2[])[]): UVGenerator {
  const recorrido = new Map<string, number>();
  const lista: (readonly [z: number, y: number, s: number])[] = [];
  for (const c of contornos) {
    let total = 0;
    for (let i = 0; i < c.length; i++) {
      const a = c[i]!;
      const b = c[(i + 1) % c.length]!;
      total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    let s = 0;
    c.forEach((p, i) => {
      if (i > 0) s += Math.hypot(p[0] - c[i - 1]![0], p[1] - c[i - 1]![1]);
      const espejo = total / 2 - Math.abs(s - total / 2);
      recorrido.set(clave(p[0], p[1]), espejo);
      lista.push([p[0], p[1], espejo]);
    });
  }
  const buscar = (z: number, y: number): number => {
    const exacto = recorrido.get(clave(z, y));
    if (exacto !== undefined) return exacto;
    // Por si three hubiera tocado algún punto: el más cercano del contorno.
    let mejor = 0;
    let distancia = Infinity;
    for (const [pz, py, s] of lista) {
      const d = (pz - z) ** 2 + (py - y) ** 2;
      if (d < distancia) {
        distancia = d;
        mejor = s;
      }
    }
    return mejor;
  };
  return {
    generateTopUV: (_g, v, a, b, c) => [a, b, c].map((i) => new Vector2(v[i * 3]!, v[i * 3 + 1]!)),
    generateSideWallUV: (_g, v, a, b, c, d) =>
      [a, b, c, d].map((i) => new Vector2(buscar(v[i * 3]!, v[i * 3 + 1]!), v[i * 3 + 2]!)),
  };
}

/**
 * Bloque extruido a lo largo del cuerpo: el polígono (con sus agujeros, que quedan como túneles) se extiende
 * `largo` unidades desde x = 0 hacia −X, con tapas en ambos extremos. Las paredes se sombrean suaves (sin las
 * facetas de la extrusión) y las aristas con las tapas quedan vivas.
 */
export function bloque(
  contorno: readonly Punto2[],
  agujeros: readonly (readonly Punto2[])[],
  largo: number,
): BufferGeometry {
  const g = new ExtrudeGeometry(forma(contorno, agujeros), {
    depth: largo,
    bevelEnabled: false,
    curveSegments: 1,
    UVGenerator: uvEnUnidades([contorno, ...agujeros]),
  });
  // ExtrudeGeometry no comparte vértices: cada triángulo tiene su normal y la pared se ve facetada.
  return alPlanoDeCorte(toCreasedNormals(g, PLIEGUE), 0);
}

/**
 * Media corona del premolar, la mitad que queda en x < 0 (`lado` −1) o en x > 0 (`lado` +1), centrada en el eje
 * del alvéolo. No es un torno de un solo perfil: cada meridiano (`meridianoCorona`) tiene la cara que le toca
 * según su ángulo y la superficie oclusal en relieve, así que la corona tiene la cúspide vestibular con sus
 * aristas, la lingual más baja, el surco central entre ambas y los rebordes marginales; su borde en el plano de
 * corte (x = 0) coincide con `siluetaCorona`. Normales suaves, UV de 0 a 1 y el degradado del esmalte por vértice
 * (`pintarEsmalte`, según la altura sobre el cuello).
 */
export function mediaCorona(lado: 1 | -1, segmentos = 18): BufferGeometry {
  const inicio = lado === -1 ? Math.PI : 0;
  const meridianos = Array.from({ length: segmentos + 1 }, (_, j) => {
    const theta = inicio + (Math.PI * j) / segmentos;
    return { theta, puntos: meridianoCorona(theta) };
  });
  const filas = meridianos[0]!.puntos.length;
  const ancho = segmentos + 1;
  const posiciones: number[] = [];
  const uv: number[] = [];
  for (let i = 0; i < filas; i++) {
    meridianos.forEach(({ theta, puntos }, j) => {
      const [r, y] = puntos[i]!;
      posiciones.push(r * Math.sin(theta), y, Z_ALVEOLO + r * Math.cos(theta));
      uv.push(j / segmentos, i / (filas - 1));
    });
  }
  const indices: number[] = [];
  for (let i = 0; i < filas - 1; i++) {
    for (let j = 0; j < segmentos; j++) {
      const a = i * ancho + j;
      const b = a + 1;
      const c = a + ancho + 1;
      const d = a + ancho;
      indices.push(a, b, c);
      // La última fila llega a la punta (radio 0): ese triángulo no tendría área.
      if (i < filas - 2) indices.push(a, c, d);
    }
  }
  const g = new Geometria();
  g.setAttribute('position', new Float32BufferAttribute(posiciones, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  // La punta es un solo punto repetido en cada meridiano: una sola normal para todos (sin facetas).
  const normal = g.getAttribute('normal');
  const primeraPunta = (filas - 1) * ancho;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let j = 0; j < ancho; j++) {
    nx += normal.getX(primeraPunta + j);
    ny += normal.getY(primeraPunta + j);
    nz += normal.getZ(primeraPunta + j);
  }
  const largo = Math.hypot(nx, ny, nz) || 1;
  for (let j = 0; j < ancho; j++) {
    normal.setXYZ(primeraPunta + j, nx / largo, ny / largo, nz / largo);
  }
  return pintarEsmalte(g, Y_CUELLO, ALTO_CORONA);
}

/** Cuánto se hunde en el hueso la raíz cervical en relieve (para que no quede una rendija con la cresta). */
const HUNDIDO_RAIZ = 0.03;

/**
 * Media raíz cervical en relieve, del lado `lado` como `mediaCorona`: la superficie de la raíz entre la cresta
 * alveolar (algo por debajo, hundida en el hueso) y el cuello, donde empieza la corona; un medio cilindro abierto
 * del ancho de la raíz. Sin ella la corona flotaría sobre el hueso desde que la cresta queda por debajo del cuello
 * (fidelidad-02). UV en unidades de la escena (el recorrido alrededor y la altura), como las placas.
 */
export function mediaRaizCervical(lado: 1 | -1, segmentos = 18): BufferGeometry {
  const desde = Y_CRESTA - HUNDIDO_RAIZ;
  const alto = Y_CUELLO - desde;
  const g = new CylinderGeometry(
    SEMIANCHO_RAIZ,
    SEMIANCHO_RAIZ,
    alto,
    segmentos,
    1,
    true,
    lado === -1 ? Math.PI : 0,
    Math.PI,
  );
  g.translate(0, desde + alto / 2, Z_ALVEOLO);
  const uv = g.getAttribute('uv');
  const posicion = g.getAttribute('position');
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * Math.PI * SEMIANCHO_RAIZ, posicion.getY(i));
  }
  return g;
}
