/**
 * Hueso largo serrado a lo largo, como una pieza de un atlas de anatomía: el modelo `hueso_largo` de la exploración
 * 3D (actividad m1_1_hueso_largo, «Recorre un hueso largo»; hasta 2026-10-17 era un dibujo SVG).
 *
 * La mitad de atrás es un sólido (la superficie del hueso y el cartílago articular). La cara de corte, plana (z = 0),
 * mira a la cámara (+Z) y enseña el interior: la cortical, el hueso esponjoso de epífisis y metáfisis (una red de
 * trabéculas), la cavidad medular con médula amarilla, la línea epifisaria y la arteria nutricia, que entra por el
 * conducto nutricio y se ramifica sobre la médula.
 *
 * Cada región de la actividad es un grupo con el id de su nodo del catálogo (`content/nodos3d.ts`): la exploración lo
 * encuentra por nombre, lo resalta y le pone su etiqueta. Cada región lleva sus propios materiales para poder
 * resaltarla sola. `puntoDeRegion` da el punto de su etiqueta (sobre la cara de corte) y el tamaño de la zona que la
 * cámara encuadra.
 *
 * Medidas: el hueso va a lo largo de X, de −2 a 2 (un fémur acortado: el texto lo dice); la exploración lo
 * normaliza a radio 1. El extremo izquierdo es algo más grueso que el derecho, como en un hueso real.
 */
import type { BufferGeometry, Material } from 'three';
import {
  BufferAttribute,
  BufferGeometry as Geometria,
  CatmullRomCurve3,
  FrontSide,
  Group,
  Mesh,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { TipoTejido } from '../procedural/realismo';
import { materialOrganico } from '../procedural/realismo';

export type Vec3 = [number, number, number];

/** Regiones del modelo: los ids de los nodos del catálogo `hueso_largo`. */
export const REGIONES_HUESO_LARGO = [
  'cartilago_articular',
  'epifisis',
  'linea_epifisaria',
  'metafisis',
  'diafisis',
  'cavidad_medular',
  'arteria_nutricia',
] as const;
export type RegionHuesoLargo = (typeof REGIONES_HUESO_LARGO)[number];

/* ----- Medidas (unidades del modelo) ----- */

export const X_FIN = 2;
const X_DIAFISIS = 0.85;
export const X_LINEA = 1.38;
const MEDIO_LINEA = 0.0125;
/** Centro de la elipse de cada epífisis, a lo largo del eje. */
const X_CENTRO_EPIFISIS = 1.44;
/** El cartílago articular cubre desde aquí hasta la punta. */
const X_CARTILAGO = 1.7;
const GROSOR_CARTILAGO = 0.035;
const R_DIAFISIS = 0.3;
export const R_MEDULA = 0.185;
/** Fin redondeado de la cavidad medular, ya dentro de la metáfisis. */
export const X_CAVIDAD = 1.02;
const CORTICAL_EPIFISIS = 0.028;
const CORTICAL_METAFISIS = 0.035;

/** Capas de la cara de corte, un poco por delante unas de otras (sin parpadeo entre planos iguales). */
const Z_CORTICAL = 0;
const Z_ESPONJOSO = 0.002;
const Z_LINEA = 0.003;
const Z_CAVIDAD = 0.004;
const Z_CONDUCTO = 0.001;
/** Las arterias de la médula van apoyadas sobre ella. */
const Z_ARTERIA = 0.014;

/** Segmentos de media vuelta del sólido de atrás. */
const SEGMENTOS = 36;

const COLORES = {
  superficie: '#e3d3b6',
  cortical: '#ece2cc',
  esponjoso: '#e9dcc0',
  medula: '#e8c561',
  cartilago: '#d9e8ef',
  linea: '#f4ecdc',
  arteria: '#c9473e',
  conducto: '#6b4a3a',
} as const;

const suave = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};
const mezclar = (a: number, b: number, k: number): number => a + (b - a) * k;

/** Radio de la epífisis de cada extremo (lado −1, izquierdo; +1, derecho). */
function radioEpifisis(x: number): number {
  return x < 0 ? 0.64 : 0.6;
}

/** Radio exterior del hueso a la altura `x` (perfil de revolución). */
export function radioExterior(x: number): number {
  const u = Math.abs(x);
  const rEpi = radioEpifisis(x);
  const rFinDiafisis = R_DIAFISIS + 0.012;
  if (u <= X_DIAFISIS) return R_DIAFISIS + 0.012 * (u / X_DIAFISIS) ** 2;
  if (u <= X_LINEA) {
    return mezclar(rFinDiafisis, rEpi * 0.93, suave((u - X_DIAFISIS) / (X_LINEA - X_DIAFISIS)));
  }
  if (u <= X_CENTRO_EPIFISIS) {
    return mezclar(rEpi * 0.93, rEpi, suave((u - X_LINEA) / (X_CENTRO_EPIFISIS - X_LINEA)));
  }
  const e = (u - X_CENTRO_EPIFISIS) / (X_FIN - X_CENTRO_EPIFISIS);
  return rEpi * Math.sqrt(Math.max(0, 1 - e * e));
}

/** Radio interior de la cortical (borde del hueso esponjoso o de la cavidad). */
export function radioInterior(x: number): number {
  const u = Math.abs(x);
  const r = radioExterior(x);
  if (u <= X_DIAFISIS) return R_MEDULA;
  if (u <= X_LINEA) {
    const grosorInicial = R_DIAFISIS + 0.012 - R_MEDULA;
    const k = suave((u - X_DIAFISIS) / (X_LINEA - X_DIAFISIS));
    return r - mezclar(grosorInicial, CORTICAL_METAFISIS, k);
  }
  return Math.max(0, r - CORTICAL_EPIFISIS);
}

/** Semialtura de la cavidad medular (0 fuera de ella): un tubo que termina redondeado en cada metáfisis. */
export function semialturaCavidad(x: number): number {
  const u = Math.abs(x);
  if (u <= X_DIAFISIS) return R_MEDULA;
  if (u >= X_CAVIDAD) return 0;
  const e = (u - X_DIAFISIS) / (X_CAVIDAD - X_DIAFISIS);
  return R_MEDULA * Math.sqrt(Math.max(0, 1 - e * e));
}

/** Semiejes de la elipse de la epífisis de un lado (a lo largo y radial). */
function elipse(lado: 1 | -1): { a: number; b: number } {
  return { a: X_FIN - X_CENTRO_EPIFISIS, b: radioEpifisis(lado) };
}
/** Ángulo de la elipse donde empieza el cartílago (desde la punta, t = 0). */
function anguloCartilago(lado: 1 | -1): number {
  const { a } = elipse(lado);
  return Math.acos((X_CARTILAGO - X_CENTRO_EPIFISIS) / a);
}

function muestras(desde: number, hasta: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => desde + ((hasta - desde) * i) / n);
}

/* ----- Geometría ----- */

/**
 * Media vuelta de un perfil [x, r] alrededor del eje X, solo la mitad de atrás (z ≤ 0): de arriba (y = r) a abajo
 * (y = −r). Caras hacia fuera. UV en unidades del modelo: u, el arco recorrido; v, la posición a lo largo.
 */
export function medioTorno(
  perfil: readonly (readonly [number, number])[],
  segmentos = SEGMENTOS,
): BufferGeometry {
  const filas = perfil.length;
  const columnas = segmentos + 1;
  const posiciones = new Float32Array(filas * columnas * 3);
  const uv = new Float32Array(filas * columnas * 2);
  perfil.forEach(([x, r], i) => {
    for (let j = 0; j < columnas; j++) {
      const fi = (Math.PI * j) / segmentos;
      const k = i * columnas + j;
      posiciones.set([x, r * Math.cos(fi), -r * Math.sin(fi)], k * 3);
      uv.set([fi * r, x], k * 2);
    }
  });
  const indices: number[] = [];
  for (let i = 0; i < filas - 1; i++) {
    for (let j = 0; j < segmentos; j++) {
      const a = i * columnas + j;
      const b = (i + 1) * columnas + j;
      // Con x creciente a lo largo del perfil, (a, b, a + 1) gira hacia fuera; con x decreciente, al revés.
      if (perfil[i + 1]![0] >= perfil[i]![0]) indices.push(a, b, a + 1, b, b + 1, a + 1);
      else indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(posiciones, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Polígono plano de la cara de corte, a la altura `z`. UV = (x, y). */
function cara(puntos: readonly (readonly [number, number])[], z: number): BufferGeometry {
  const forma = new Shape(puntos.map(([x, y]) => new Vector2(x, y)));
  const g = new ShapeGeometry(forma, 1);
  g.translate(0, 0, z);
  return g;
}

/** Banda entre dos curvas `arriba(x)` y `abajo(x)` sobre unas muestras de x. */
function banda(
  xs: readonly number[],
  arriba: (x: number) => number,
  abajo: (x: number) => number,
): [number, number][] {
  return [
    ...xs.map((x) => [x, arriba(x)] as [number, number]),
    ...[...xs].reverse().map((x) => [x, abajo(x)] as [number, number]),
  ];
}

/** Tramo de x de un lado, de |x| = desde a |x| = hasta (en orden de x creciente). */
function tramo(lado: 1 | -1, desde: number, hasta: number, n: number): number[] {
  const xs = muestras(desde, hasta, n).map((u) => lado * u);
  return lado === 1 ? xs : xs.reverse();
}

function unir(geos: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(geos);
  for (const x of geos) x.dispose();
  if (!g) throw new Error('No se pudieron unir las piezas del hueso largo.');
  return g;
}

/** Perfil exterior [x, r] de un tramo (de |x| = desde a hasta) de un lado. */
function perfilExterior(lado: 1 | -1, desde: number, hasta: number, n: number): [number, number][] {
  return tramo(lado, desde, hasta, n).map((x) => [x, radioExterior(x)]);
}

/** Puntos [u, r] (u = |x| creciente) pasados al lado `lado`, en orden de x creciente. */
function aLado(lado: 1 | -1, enU: readonly (readonly [number, number])[]): [number, number][] {
  const puntos = enU.map(([u, r]): [number, number] => [lado * u, r]);
  return lado === 1 ? puntos : puntos.reverse();
}

/** Perfil del hueso de una epífisis, de la línea epifisaria al borde del cartílago (por la elipse). */
function perfilEpifisis(lado: 1 | -1): [number, number][] {
  const { a, b } = elipse(lado);
  const t0 = anguloCartilago(lado);
  const cuello = muestras(X_LINEA, X_CENTRO_EPIFISIS, 8).map((u): [number, number] => [
    u,
    radioExterior(lado * u),
  ]);
  const arco = muestras(Math.PI / 2, t0, 18).map((t): [number, number] => [
    X_CENTRO_EPIFISIS + a * Math.cos(t),
    b * Math.sin(t),
  ]);
  return aLado(lado, [...cuello, ...arco.slice(1)]);
}

/** Perfil del cartílago articular: de su borde a la punta, por fuera del hueso. */
function perfilCartilago(lado: 1 | -1): [number, number][] {
  const { a, b } = elipse(lado);
  const t0 = anguloCartilago(lado);
  const borde: [number, number] = [X_CENTRO_EPIFISIS + a * Math.cos(t0), b * Math.sin(t0)];
  const arco = muestras(t0, 0, 20).map((t): [number, number] => [
    X_CENTRO_EPIFISIS + (a + GROSOR_CARTILAGO) * Math.cos(t),
    (b + GROSOR_CARTILAGO) * Math.sin(t),
  ]);
  return aLado(lado, [borde, ...arco]);
}

/**
 * Borde del hueso esponjoso: por dentro de la cortical en la metáfisis y, en la epífisis, una elipse paralela a la
 * de fuera (la cortical tiene el mismo grosor también en la punta).
 */
export function radioEsponjoso(x: number): number {
  const u = Math.abs(x);
  if (u <= X_CENTRO_EPIFISIS) return radioInterior(x);
  const { a, b } = elipse(x < 0 ? -1 : 1);
  const e = (u - X_CENTRO_EPIFISIS) / (a - CORTICAL_EPIFISIS);
  return (b - CORTICAL_EPIFISIS) * Math.sqrt(Math.max(0, 1 - e * e));
}

/** Media luna del cartílago en la cara de corte: entre la elipse del hueso y la del cartílago. */
function corteCartilago(lado: 1 | -1): [number, number][] {
  const { a, b } = elipse(lado);
  const t0 = anguloCartilago(lado);
  const exterior = muestras(t0, -t0, 40).map((t): [number, number] => [
    lado * (X_CENTRO_EPIFISIS + (a + GROSOR_CARTILAGO) * Math.cos(t)),
    (b + GROSOR_CARTILAGO) * Math.sin(t),
  ]);
  const interior = muestras(-t0, t0, 40).map((t): [number, number] => [
    lado * (X_CENTRO_EPIFISIS + a * Math.cos(t)),
    b * Math.sin(t),
  ]);
  return [...exterior, ...interior];
}

/** Línea epifisaria en la cara de corte: una banda fina y algo ondulada que cruza el hueso esponjoso. */
function corteLinea(lado: 1 | -1): [number, number][] {
  const alto = radioInterior(lado * X_LINEA);
  const ys = muestras(-alto, alto, 24);
  const onda = (y: number): number => 0.01 * Math.sin(y * 11 + (lado === 1 ? 0.8 : 0));
  const x0 = lado * X_LINEA;
  return [
    ...ys.map((y): [number, number] => [x0 - MEDIO_LINEA + onda(y), y]),
    ...[...ys].reverse().map((y): [number, number] => [x0 + MEDIO_LINEA + onda(y), y]),
  ];
}

/* ----- Arteria nutricia ----- */

/** Recorridos de la arteria nutricia: tronco (de fuera a la médula), ramas ascendente y descendente, ramitas. */
const RECORRIDOS: readonly { puntos: readonly Vec3[]; radio: number }[] = [
  // Tronco: llega por debajo y por detrás del hueso, entra por el agujero nutricio y cruza la cortical.
  {
    puntos: [
      [0.8, -0.82, -0.24],
      [0.67, -0.55, -0.07],
      [0.55, -0.34, Z_ARTERIA],
      [0.47, -0.25, Z_ARTERIA],
      [0.4, -0.16, Z_ARTERIA],
    ],
    radio: 0.024,
  },
  // Rama ascendente (hacia el extremo izquierdo) y descendente, sobre la médula.
  {
    puntos: [
      [0.4, -0.16, Z_ARTERIA],
      [0.2, -0.1, Z_ARTERIA],
      [-0.15, -0.05, Z_ARTERIA],
      [-0.5, -0.02, Z_ARTERIA],
      [-0.88, 0.03, Z_ARTERIA],
    ],
    radio: 0.015,
  },
  {
    puntos: [
      [0.4, -0.16, Z_ARTERIA],
      [0.62, -0.08, Z_ARTERIA],
      [0.84, -0.03, Z_ARTERIA],
      [0.95, 0.0, Z_ARTERIA],
    ],
    radio: 0.015,
  },
  // Ramitas hacia la cortical (irrigan su parte interna).
  {
    puntos: [
      [0.2, -0.1, Z_ARTERIA],
      [0.14, 0.02, Z_ARTERIA],
      [0.1, 0.15, Z_ARTERIA],
    ],
    radio: 0.007,
  },
  {
    puntos: [
      [-0.15, -0.05, Z_ARTERIA],
      [-0.24, 0.06, Z_ARTERIA],
      [-0.3, 0.16, Z_ARTERIA],
    ],
    radio: 0.007,
  },
  {
    puntos: [
      [-0.5, -0.02, Z_ARTERIA],
      [-0.6, -0.1, Z_ARTERIA],
      [-0.66, -0.17, Z_ARTERIA],
    ],
    radio: 0.007,
  },
  {
    puntos: [
      [0.62, -0.08, Z_ARTERIA],
      [0.7, 0.04, Z_ARTERIA],
      [0.74, 0.15, Z_ARTERIA],
    ],
    radio: 0.007,
  },
];

/** Conducto nutricio en la cara de corte: la franja oscura por la que el tronco cruza la cortical. */
function corteConducto(): [number, number][] {
  const [a, b] = [new Vector2(0.56, -0.33), new Vector2(0.43, -0.17)];
  const d = b.clone().sub(a).normalize();
  const n = new Vector2(-d.y, d.x).multiplyScalar(0.022);
  return [
    [a.x + n.x, a.y + n.y],
    [b.x + n.x, b.y + n.y],
    [b.x - n.x, b.y - n.y],
    [a.x - n.x, a.y - n.y],
  ];
}

/* ----- Modelo ----- */

/** Material de una región: físico, de una cara y con el relieve a `repetir` veces por unidad del modelo. */
function material(color: string, tipo: TipoTejido, repetir: number): Material {
  const m = materialOrganico(color, tipo, { side: FrontSide });
  m.bumpMap?.repeat.set(repetir, repetir);
  return m;
}

function malla(geometria: BufferGeometry, mat: Material, nombre: string): Mesh {
  const m = new Mesh(geometria, mat);
  m.name = nombre;
  return m;
}

function region(nombre: RegionHuesoLargo, ...mallas: Mesh[]): Group {
  const g = new Group();
  g.name = nombre;
  g.add(...mallas);
  return g;
}

const LADOS = [-1, 1] as const;

/** Construye el hueso largo serrado: un grupo con una subgrupo por región. */
export function crearHuesoLargo(): Group {
  const hueso = new Group();
  hueso.name = 'hueso_largo';

  // Diáfisis: superficie de atrás y banda de cortical en la cara de corte.
  const xsDiafisis = muestras(-X_DIAFISIS, X_DIAFISIS, 30);
  hueso.add(
    region(
      'diafisis',
      malla(
        medioTorno(xsDiafisis.map((x) => [x, radioExterior(x)])),
        material(COLORES.superficie, 'hueso', 1.6),
        'diafisis_superficie',
      ),
      malla(
        cara(
          banda(xsDiafisis, radioExterior, (x) => -radioExterior(x)),
          Z_CORTICAL,
        ),
        material(COLORES.cortical, 'hueso', 2),
        'diafisis_corte',
      ),
    ),
  );

  // Metáfisis: se ensancha hacia cada epífisis; su cortical se adelgaza y por dentro empieza el hueso esponjoso.
  hueso.add(
    region(
      'metafisis',
      malla(
        unir(LADOS.map((lado) => medioTorno(perfilExterior(lado, X_DIAFISIS, X_LINEA, 24)))),
        material(COLORES.superficie, 'hueso', 1.6),
        'metafisis_superficie',
      ),
      malla(
        unir(
          LADOS.map((lado) =>
            cara(
              banda(tramo(lado, X_DIAFISIS, X_LINEA, 24), radioExterior, (x) => -radioExterior(x)),
              Z_CORTICAL,
            ),
          ),
        ),
        material(COLORES.cortical, 'hueso', 2),
        'metafisis_corte',
      ),
      malla(
        unir(
          LADOS.map((lado) =>
            cara(
              banda(
                tramo(lado, X_DIAFISIS - 0.05, X_LINEA - MEDIO_LINEA, 24),
                radioInterior,
                (x) => -radioInterior(x),
              ),
              Z_ESPONJOSO,
            ),
          ),
        ),
        material(COLORES.esponjoso, 'hueso_trabecular', 2.2),
        'metafisis_esponjoso',
      ),
    ),
  );

  // Epífisis: extremo ensanchado; cáscara fina de cortical llena de hueso esponjoso.
  hueso.add(
    region(
      'epifisis',
      malla(
        unir(LADOS.map((lado) => medioTorno(perfilEpifisis(lado)))),
        material(COLORES.superficie, 'hueso', 1.6),
        'epifisis_superficie',
      ),
      malla(
        unir(
          LADOS.map((lado) => {
            const xs = tramo(lado, X_LINEA, X_FIN, 40);
            return cara(
              banda(xs, radioExterior, (x) => -radioExterior(x)),
              Z_CORTICAL,
            );
          }),
        ),
        material(COLORES.cortical, 'hueso', 2),
        'epifisis_corte',
      ),
      malla(
        unir(
          LADOS.map((lado) => {
            const xs = tramo(lado, X_LINEA + MEDIO_LINEA, X_FIN - CORTICAL_EPIFISIS, 40);
            return cara(
              banda(xs, radioEsponjoso, (x) => -radioEsponjoso(x)),
              Z_ESPONJOSO,
            );
          }),
        ),
        material(COLORES.esponjoso, 'hueso_trabecular', 2.2),
        'epifisis_esponjoso',
      ),
    ),
  );

  // Línea epifisaria: vestigio de la placa de crecimiento, hueso más denso entre metáfisis y epífisis.
  hueso.add(
    region(
      'linea_epifisaria',
      malla(
        unir(LADOS.map((lado) => cara(corteLinea(lado), Z_LINEA))),
        material(COLORES.linea, 'hueso', 3),
        'linea_epifisaria_corte',
      ),
    ),
  );

  // Cartílago articular: casquete liso sobre la superficie articular de cada epífisis.
  hueso.add(
    region(
      'cartilago_articular',
      malla(
        unir(LADOS.map((lado) => medioTorno(perfilCartilago(lado)))),
        material(COLORES.cartilago, 'cartilago', 1.2),
        'cartilago_superficie',
      ),
      malla(
        unir(LADOS.map((lado) => cara(corteCartilago(lado), Z_CORTICAL))),
        material(COLORES.cartilago, 'cartilago', 1.2),
        'cartilago_corte',
      ),
    ),
  );

  // Cavidad medular, llena de médula amarilla.
  const xsCavidad = muestras(-X_CAVIDAD, X_CAVIDAD, 60);
  hueso.add(
    region(
      'cavidad_medular',
      malla(
        cara(
          banda(xsCavidad, semialturaCavidad, (x) => -semialturaCavidad(x)),
          Z_CAVIDAD,
        ),
        material(COLORES.medula, 'medula', 2.5),
        'cavidad_medular_corte',
      ),
    ),
  );

  // Arteria nutricia: tronco por el conducto nutricio y ramas sobre la médula.
  const tubos = RECORRIDOS.map(
    (r) =>
      new TubeGeometry(
        new CatmullRomCurve3(r.puntos.map((p) => new Vector3(...p))),
        40,
        r.radio,
        8,
        false,
      ),
  );
  hueso.add(
    region(
      'arteria_nutricia',
      malla(unir(tubos), material(COLORES.arteria, 'vaso', 1), 'arteria_nutricia_vaso'),
      malla(
        cara(corteConducto(), Z_CONDUCTO),
        material(COLORES.conducto, 'cavidad', 1),
        'conducto_nutricio',
      ),
    ),
  );

  return hueso;
}

/* ----- Puntos de las etiquetas ----- */

export interface PuntoRegion {
  /** Punto de la etiqueta, en unidades del modelo (antes de normalizar). */
  punto: Vec3;
  /** Normal hacia fuera (la cara de corte mira a +Z). */
  normal: Vec3;
  /** Radio de la zona que encuadra la cámara, en unidades del modelo. */
  radio: number;
}

/** Punto de la etiqueta de cada región: sobre la cara de corte, en el lado izquierdo para las de los extremos. */
export function puntoDeRegion(id: RegionHuesoLargo): PuntoRegion {
  const frente: Vec3 = [0, 0, 1];
  switch (id) {
    case 'cartilago_articular': {
      const { a, b } = elipse(-1);
      const t = 0.55;
      const m = GROSOR_CARTILAGO / 2;
      return {
        punto: [
          -(X_CENTRO_EPIFISIS + (a + m) * Math.cos(t)),
          (b + m) * Math.sin(t),
          Z_CORTICAL + 0.001,
        ],
        normal: frente,
        radio: 0.35,
      };
    }
    case 'epifisis':
      return { punto: [-1.66, 0.12, Z_ESPONJOSO + 0.001], normal: frente, radio: 0.55 };
    case 'linea_epifisaria':
      return { punto: [-X_LINEA, 0.2, Z_LINEA + 0.001], normal: frente, radio: 0.4 };
    case 'metafisis':
      return { punto: [-1.15, 0.22, Z_ESPONJOSO + 0.001], normal: frente, radio: 0.45 };
    case 'diafisis':
      return {
        punto: [-0.35, (R_MEDULA + radioExterior(-0.35)) / 2, Z_CORTICAL + 0.001],
        normal: frente,
        radio: 0.8,
      };
    case 'cavidad_medular':
      return { punto: [0.05, 0.08, Z_CAVIDAD + 0.001], normal: frente, radio: 0.8 };
    case 'arteria_nutricia':
      return { punto: [0.47, -0.25, Z_ARTERIA + 0.024], normal: frente, radio: 0.45 };
  }
}

export function esRegionHuesoLargo(id: string): id is RegionHuesoLargo {
  return (REGIONES_HUESO_LARGO as readonly string[]).includes(id);
}
