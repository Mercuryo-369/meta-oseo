/**
 * Hueso normal frente a hueso osteoporótico, en dos pares a la misma escala: el modelo `hueso_osteoporotico` de la
 * exploración 3D (actividad m6_3_multicapa_normal_osteoporotico, «Hueso normal frente a hueso osteoporótico»; hasta
 * 2026-10-18 era una ilustración hecha con IA sobre el SVG m6_hueso_normal_osteoporotico, con aspecto de piedra
 * tallada y la cortical osteoporótica gruesa, al revés de lo que se enseña).
 *
 * Arriba, un cuerpo vertebral serrado en corte sagital (lo anterior a la izquierda), con la mitad de atrás como una
 * caja: la cáscara cortical y las placas terminales por fuera y, dentro, la red trabecular en tres dimensiones sobre
 * la médula del fondo.
 *  - Normal (izquierda): cortical más gruesa y una red densa y conectada de trabéculas verticales (varillas y placas)
 *    unidas por trabéculas horizontales; médula roja.
 *  - Osteoporótico (derecha): cortical fina y un aplastamiento en cuña (fractura por fragilidad: pierde más altura por
 *    delante, con la placa terminal superior hundida, la pared anterior abombada y trabéculas compactadas bajo ella).
 *    Las trabéculas son más finas y escasas, casi sin horizontales (se pierden primero), con varillas verticales
 *    largas sin apoyo, dos varillas rotas y una placa perforada; médula con más grasa.
 *
 * Abajo, la diáfisis de un hueso largo en corte transversal (un tramo corto que sigue hacia atrás):
 *  - Normal: cortical gruesa con pocos poros pequeños (conductos de Havers) y cavidad medular estrecha.
 *  - Osteoporótico: cortical ADELGAZADA, con poros grandes sobre todo cerca del endostio y el borde interno
 *    festoneado, y cavidad medular AMPLIADA; el contorno externo es algo mayor (aposición perióstica parcial).
 *
 * Cada región de la actividad es un grupo con el id de su nodo del catálogo (`content/nodos3d.ts`) y sus propios
 * materiales; las piezas de fondo (cáscara de la vértebra normal, médulas que no se piden) no se resaltan.
 *
 * Medidas: un cuerpo vertebral lumbar mide unos 35 mm de delante atrás y la diáfisis femoral unos 28 mm de diámetro;
 * aquí 1,3 y 1 unidades (1 unidad ≈ 27 mm).
 */
import type { BufferGeometry, Group } from 'three';
import {
  CatmullRomCurve3,
  ExtrudeGeometry,
  Path,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { PuntoRegion, Vec3 } from '../modelosPorCodigo';
import type { Punto2 } from '../corte2d';
import {
  agrandar,
  azar,
  contornoElipse,
  contornoPolar,
  grupo,
  malla,
  material,
  materialInterior,
  plano,
  prisma,
  unir,
  varilla,
} from '../corte2d';

/** Regiones del modelo: los ids de los nodos del catálogo `hueso_osteoporotico`. */
export const REGIONES_HUESO_OSTEOPOROTICO = [
  'trabeculas_normales',
  'trabeculas_osteoporoticas',
  'perforacion_trabecular',
  'cortical_normal',
  'cortical_adelgazada',
  'porosidad_cortical',
  'cavidad_medular_ampliada',
  'colapso_vertebral',
] as const;
export type RegionHuesoOsteoporotico = (typeof REGIONES_HUESO_OSTEOPOROTICO)[number];

const COLORES = {
  cortical: '#eadfc8',
  trabecula: '#e6d8bc',
  medula_roja: '#9e3f33',
  medula_grasa: '#cf9c55',
  medula_amarilla: '#e8c561',
  poro: '#6e4a3d',
} as const;

/* ----- Cuerpos vertebrales (corte sagital) ----- */

/** Profundidad de la mitad de atrás de la vértebra. */
const FONDO_VERTEBRA = 0.4;
/** Base de las dos vértebras (borde inferior) y su ancho de delante atrás. */
const Y_BASE_VERTEBRA = 0.12;
const ANCHO_VERTEBRA = 1.3;

export interface Vertebra {
  /** Centro de delante atrás. */
  cx: number;
  alturaAnterior: number;
  alturaPosterior: number;
  /** Grosor de la cáscara cortical y de las placas terminales. */
  cortical: number;
  /** Hundimiento del centro de cada placa terminal (concavidad). */
  concavidadInferior: number;
  concavidadSuperior: number;
  /** Abombamiento hacia fuera de la pared anterior, cerca de arriba (0 si no está fracturada). */
  abombamiento: number;
}

export const VERTEBRA_NORMAL: Vertebra = {
  cx: -1,
  alturaAnterior: 0.98,
  alturaPosterior: 1,
  cortical: 0.035,
  concavidadInferior: 0.025,
  concavidadSuperior: 0.025,
  abombamiento: 0,
};

/** Fractura por aplastamiento en cuña: delante queda a dos tercios de la altura de atrás. */
export const VERTEBRA_OSTEOPOROTICA: Vertebra = {
  cx: 1,
  alturaAnterior: 0.62,
  alturaPosterior: 0.95,
  cortical: 0.02,
  concavidadInferior: 0.025,
  concavidadSuperior: 0.055,
  abombamiento: 0.05,
};

/** Fracción de 0 (delante) a 1 (detrás) del ancho de la vértebra en la abscisa local `u`. */
const fraccion = (u: number): number => u / ANCHO_VERTEBRA + 0.5;

/** Placa terminal inferior: cóncava (el centro sube). */
export function bordeInferior(v: Vertebra, u: number): number {
  const k = (2 * u) / ANCHO_VERTEBRA;
  return Y_BASE_VERTEBRA + v.concavidadInferior * (1 - k * k);
}

/** Placa terminal superior: la altura pasa de la anterior a la posterior y el centro se hunde. */
export function bordeSuperior(v: Vertebra, u: number): number {
  const k = (2 * u) / ANCHO_VERTEBRA;
  const altura = v.alturaAnterior + (v.alturaPosterior - v.alturaAnterior) * fraccion(u);
  return Y_BASE_VERTEBRA + altura - v.concavidadSuperior * (1 - k * k);
}

/** Pared anterior (s de 0, abajo, a 1, arriba): cintura cóncava y, si está fracturada, abombada arriba. */
function paredAnterior(v: Vertebra, s: number): number {
  return (
    v.cx -
    ANCHO_VERTEBRA / 2 +
    0.04 * Math.sin(Math.PI * s) -
    v.abombamiento * Math.exp(-(((s - 0.78) / 0.13) ** 2))
  );
}
function paredPosterior(v: Vertebra, s: number): number {
  return v.cx + ANCHO_VERTEBRA / 2 - 0.02 * Math.sin(Math.PI * s);
}

function muestras(desde: number, hasta: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => desde + ((hasta - desde) * i) / n);
}

/** Contorno del cuerpo vertebral en la cara de corte, metido `dentro` hacia el interior (0: el borde de fuera). */
export function contornoVertebra(v: Vertebra, dentro = 0): Punto2[] {
  const medio = ANCHO_VERTEBRA / 2 - dentro;
  const us = muestras(-medio, medio, 28);
  const abajo = (u: number) => bordeInferior(v, u) + dentro;
  const arriba = (u: number) => bordeSuperior(v, u) - dentro;
  const ss = muestras(0, 1, 16).slice(1, -1);
  return [
    ...us.map((u): Punto2 => [v.cx + u, abajo(u)]),
    ...ss.map((s): Punto2 => [
      paredPosterior(v, s) - dentro,
      abajo(medio) + (arriba(medio) - abajo(medio)) * s,
    ]),
    ...[...us].reverse().map((u): Punto2 => [v.cx + u, arriba(u)]),
    ...[...ss]
      .reverse()
      .map((s): Punto2 => [
        paredAnterior(v, s) + dentro,
        abajo(-medio) + (arriba(-medio) - abajo(-medio)) * s,
      ]),
  ];
}

/* ----- Red trabecular ----- */

const COLUMNAS = 10;
const NIVELES = 7;
const FILAS_Z = [-0.06, -0.19, -0.32] as const;

/** Nudos de la red: [columna][nivel][fila], con algo de desorden (siempre el mismo). */
export type Nudos = Vec3[][][];

/** Altura de la zona compactada bajo la placa superior de la vértebra fracturada. */
const ALTO_COMPACTADO = 0.13;
/** La zona compactada abarca la mitad anterior. */
const U_FIN_COMPACTADO = -0.05;

function techoRed(v: Vertebra, u: number): number {
  const techo = bordeSuperior(v, u) - v.cortical;
  return v.abombamiento > 0 && u < U_FIN_COMPACTADO ? techo - ALTO_COMPACTADO : techo;
}

function calcularNudos(v: Vertebra, semilla: number): Nudos {
  const r = azar(semilla);
  const margen = 0.07;
  const medio = ANCHO_VERTEBRA / 2 - v.cortical - margen;
  return Array.from({ length: COLUMNAS }, (_, i) => {
    const u = -medio + (2 * medio * i) / (COLUMNAS - 1);
    const suelo = bordeInferior(v, u) + v.cortical + 0.05;
    const techo = techoRed(v, u) - 0.05;
    return Array.from({ length: NIVELES }, (_, j) => {
      // Las paredes (cóncavas) a esta altura: ningún nudo se sale de la cáscara.
      const s = j / (NIVELES - 1);
      const minimo = paredAnterior(v, s) + v.cortical + 0.03;
      const maximo = paredPosterior(v, s) - v.cortical - 0.03;
      return FILAS_Z.map((z, k): Vec3 => {
        // Cada fila va algo desplazada respecto a la de delante, y los nudos con bastante desorden: la red no es
        // una rejilla.
        const x = v.cx + u + (k - 1) * 0.04 + (r() - 0.5) * 0.1;
        return [
          Math.min(maximo, Math.max(minimo, x)),
          suelo + ((techo - suelo) * j) / (NIVELES - 1) + (r() - 0.5) * 0.09,
          z + (r() - 0.5) * 0.05,
        ];
      });
    });
  });
}

export const NUDOS_NORMAL: Nudos = calcularNudos(VERTEBRA_NORMAL, 3);
export const NUDOS_OSTEOPOROTICO: Nudos = calcularNudos(VERTEBRA_OSTEOPOROTICA, 17);

/** Columnas de la vértebra normal donde la trabécula vertical es una placa (de delante atrás en z). */
const COLUMNAS_PLACA = [2, 5, 8] as const;
/** Varillas verticales rotas de la vértebra osteoporótica: columna (en la fila de delante) y nivel del hueco. */
export const VARILLAS_ROTAS = [
  { columna: 3, nivel: 3 },
  { columna: 7, nivel: 2 },
] as const;
/** Placa perforada de la vértebra osteoporótica: columna y filas que abarca. */
const PLACA_PERFORADA = { columna: 5, filas: [1, 2] } as const;
/** Varilla vertical que rotula la red osteoporótica (siempre se conserva). */
export const VARILLA_ROTULO = { columna: 8, fila: 0 } as const;

/** Trabécula vertical que sigue sus nudos de abajo arriba, apoyada en las dos placas terminales. */
function vertical(
  v: Vertebra,
  nudos: Nudos,
  i: number,
  k: number,
  radio: number,
  desde = 0,
  hasta = NIVELES - 1,
): BufferGeometry {
  const puntos = nudos[i]!.slice(desde, hasta + 1).map((nivel) => new Vector3(...nivel[k]!));
  const u = nudos[i]![0]![k]![0] - v.cx;
  if (desde === 0) {
    const p = puntos[0]!;
    puntos.unshift(new Vector3(p.x, bordeInferior(v, u) + v.cortical - 0.01, p.z));
  }
  if (hasta === NIVELES - 1) {
    const p = puntos.at(-1)!;
    puntos.push(new Vector3(p.x, techoRed(v, u) + 0.01, p.z));
  }
  return new TubeGeometry(new CatmullRomCurve3(puntos), 4 * (puntos.length - 1), radio, 6, false);
}

/** Placa vertical en el plano y-z (de canto a la cámara) en la columna `i`, entre las filas `filas`. */
function placa(
  v: Vertebra,
  nudos: Nudos,
  i: number,
  filas: readonly [number, number],
  grosor: number,
  hueco?: { nivel: number; alto: number; ancho: number },
): BufferGeometry {
  const columna = nudos[i]!;
  const x =
    columna.reduce((s, nivel) => s + nivel[filas[0]]![0] + nivel[filas[1]]![0], 0) / (2 * NIVELES);
  const u = x - v.cx;
  // La forma va en (a = −z, b = y): al girarla queda en el plano y-z con su grosor a lo largo de X.
  const delante = -FILAS_Z[filas[0]] - 0.03;
  const detras = -FILAS_Z[filas[1]] + 0.03;
  const abajo = bordeInferior(v, u) + v.cortical - 0.01;
  const arriba = techoRed(v, u) + 0.01;
  const ys = muestras(abajo, arriba, 10);
  const borde = (a: number, y: number, i2: number): Vector2 =>
    new Vector2(a + 0.012 * Math.sin(y * 17 + i2 + i), y);
  const forma = new Shape([
    ...ys.map((y) => borde(delante, y, 0)),
    ...[...ys].reverse().map((y) => borde(detras, y, 2)),
  ]);
  if (hueco) {
    const centro = columna[hueco.nivel]![filas[0]]![1];
    const medio = (delante + detras) / 2;
    forma.holes.push(
      new Path(
        contornoElipse(medio, centro, hueco.ancho / 2, hueco.alto / 2, 0, 20).map(
          ([a, b]) => new Vector2(a, b),
        ),
      ),
    );
  }
  const g = new ExtrudeGeometry(forma, { depth: grosor, bevelEnabled: false, curveSegments: 1 });
  g.rotateY(Math.PI / 2);
  g.translate(x - grosor / 2, 0, 0);
  return g;
}

/** Trabéculas horizontales entre nudos vecinos (a lo largo de X y de Z) que se conservan. */
function horizontales(
  nudos: Nudos,
  radio: () => number,
  conservar: (i: number, j: number, k: number, eje: 'x' | 'z') => boolean,
): BufferGeometry[] {
  const salida: BufferGeometry[] = [];
  for (let i = 0; i < COLUMNAS; i++) {
    for (let j = 0; j < NIVELES; j++) {
      for (let k = 0; k < FILAS_Z.length; k++) {
        const n = nudos[i]![j]![k]!;
        if (i + 1 < COLUMNAS && conservar(i, j, k, 'x')) {
          salida.push(varilla(n, nudos[i + 1]![j]![k]!, radio()));
        }
        if (k + 1 < FILAS_Z.length && conservar(i, j, k, 'z')) {
          salida.push(varilla(n, nudos[i]![j]![k + 1]!, radio()));
        }
      }
    }
  }
  return salida;
}

function redNormal(): BufferGeometry {
  const v = VERTEBRA_NORMAL;
  const r = azar(23);
  const piezas: BufferGeometry[] = [];
  for (let i = 0; i < COLUMNAS; i++) {
    if ((COLUMNAS_PLACA as readonly number[]).includes(i)) {
      piezas.push(placa(v, NUDOS_NORMAL, i, [0, 2], 0.026));
      continue;
    }
    for (let k = 0; k < FILAS_Z.length; k++) {
      piezas.push(vertical(v, NUDOS_NORMAL, i, k, 0.019 * (0.85 + r() * 0.3)));
    }
  }
  // Casi todas las horizontales: la red queda conectada en las tres direcciones.
  piezas.push(
    ...horizontales(
      NUDOS_NORMAL,
      () => 0.009 + r() * 0.006,
      () => r() > 0.12,
    ),
  );
  // Y algunas oblicuas, que cierran la red.
  for (let i = 0; i + 1 < COLUMNAS; i++) {
    for (let j = 0; j + 1 < NIVELES; j++) {
      for (let k = 0; k < FILAS_Z.length; k++) {
        if (r() < 0.12) {
          const [a, b] = r() < 0.5 ? [j, j + 1] : [j + 1, j];
          piezas.push(varilla(NUDOS_NORMAL[i]![a]![k]!, NUDOS_NORMAL[i + 1]![b]![k]!, 0.011));
        }
      }
    }
  }
  return unir(piezas);
}

/** ¿Se conserva la varilla vertical (columna, fila) de la vértebra osteoporótica? */
export function conservaVertical(i: number, k: number): boolean {
  if (VARILLAS_ROTAS.some((x) => x.columna === i) && k === 0) return false;
  if (i === PLACA_PERFORADA.columna && (PLACA_PERFORADA.filas as readonly number[]).includes(k)) {
    return false;
  }
  if (i === VARILLA_ROTULO.columna && k === VARILLA_ROTULO.fila) return true;
  // Se pierde una de cada tres, siempre las mismas.
  return (i * 7 + k * 5) % 3 !== 0;
}

function redOsteoporotica(): BufferGeometry {
  const v = VERTEBRA_OSTEOPOROTICA;
  const r = azar(31);
  const piezas: BufferGeometry[] = [];
  for (let i = 0; i < COLUMNAS; i++) {
    for (let k = 0; k < FILAS_Z.length; k++) {
      if (conservaVertical(i, k)) {
        piezas.push(vertical(v, NUDOS_OSTEOPOROTICO, i, k, 0.0105 * (0.8 + r() * 0.4)));
      }
    }
  }
  // Pocas horizontales y finas: son las primeras que se pierden. Solo quedan entre varillas que siguen en pie.
  piezas.push(
    ...horizontales(
      NUDOS_OSTEOPOROTICO,
      () => 0.006 + r() * 0.002,
      (i, _j, k, eje) => {
        const queda = r() < 0.09;
        return eje === 'x'
          ? queda && conservaVertical(i, k) && conservaVertical(i + 1, k)
          : queda && conservaVertical(i, k) && conservaVertical(i, k + 1);
      },
    ),
  );
  return unir(piezas);
}

/** Las dos varillas rotas (dos tramos que acaban afilados, con el hueco entre ellos) y la placa perforada. */
function perforaciones(): BufferGeometry {
  const v = VERTEBRA_OSTEOPOROTICA;
  const radio = 0.0105;
  const piezas: BufferGeometry[] = [];
  for (const { columna, nivel } of VARILLAS_ROTAS) {
    const nudos = NUDOS_OSTEOPOROTICO[columna]!;
    piezas.push(vertical(v, NUDOS_OSTEOPOROTICO, columna, 0, radio, 0, nivel - 1));
    piezas.push(vertical(v, NUDOS_OSTEOPOROTICO, columna, 0, radio, nivel + 1));
    const abajo = nudos[nivel - 1]![0]!;
    const arriba = nudos[nivel + 1]![0]!;
    const medio = (a: number, b: number, t: number) => a + (b - a) * t;
    const punta = (t: number): Vec3 => [
      medio(abajo[0], arriba[0], t),
      medio(abajo[1], arriba[1], t),
      medio(abajo[2], arriba[2], t),
    ];
    piezas.push(varilla(abajo, punta(0.36), [radio, 0.003]));
    piezas.push(varilla(arriba, punta(0.66), [radio, 0.003]));
  }
  piezas.push(
    placa(v, NUDOS_OSTEOPOROTICO, PLACA_PERFORADA.columna, PLACA_PERFORADA.filas, 0.014, {
      nivel: 3,
      alto: 0.16,
      ancho: 0.1,
    }),
  );
  return unir(piezas);
}

/** Trabéculas compactadas bajo la placa superior hundida (la zona aplastada de la fractura). */
function compactadas(): BufferGeometry[] {
  const v = VERTEBRA_OSTEOPOROTICA;
  const r = azar(37);
  const desde = -ANCHO_VERTEBRA / 2 + v.cortical + 0.02;
  return Array.from({ length: 110 }, () => {
    const u = desde + r() * (U_FIN_COMPACTADO - desde);
    const techo = bordeSuperior(v, u) - v.cortical - 0.01;
    const centro: Vec3 = [v.cx + u, techo - r() * (ALTO_COMPACTADO - 0.02), -0.06 - r() * 0.28];
    const [a, b] = [r() * Math.PI * 2, (r() - 0.5) * 0.5];
    const largo = 0.012 + r() * 0.022;
    const d: Vec3 = [
      Math.cos(a) * Math.cos(b) * largo,
      Math.sin(b) * largo,
      Math.sin(a) * Math.cos(b) * largo,
    ];
    return varilla(
      [centro[0] - d[0], centro[1] - d[1], centro[2] - d[2]],
      [centro[0] + d[0], centro[1] + d[1], centro[2] + d[2]],
      0.008 + r() * 0.004,
      5,
    );
  });
}

/* ----- Diáfisis (corte transversal) ----- */

const FONDO_DIAFISIS = 0.45;
const Y_DIAFISIS = -0.68;

export interface Diafisis {
  cx: number;
  exterior: (t: number) => number;
  interior: (t: number) => number;
}

/** Línea áspera: la cresta de la cara posterior del fémur (abajo en la cara de corte). */
function lineaAspera(t: number, alto: number): number {
  const d = Math.atan2(Math.sin(t + Math.PI / 2), Math.cos(t + Math.PI / 2));
  return alto * Math.exp(-((d / 0.3) ** 2));
}

export const DIAFISIS_NORMAL: Diafisis = {
  cx: -1,
  exterior: (t) => 0.5 * (1 + 0.03 * Math.cos(2 * t)) + lineaAspera(t, 0.05),
  interior: (t) => 0.27 * (1 + 0.04 * Math.cos(2 * t) + 0.015 * Math.sin(5 * t)),
};

/** Contorno externo algo mayor y el interno mucho más amplio y festoneado (reabsorción endocortical). */
export const DIAFISIS_OSTEOPOROTICA: Diafisis = {
  cx: 1,
  exterior: (t) => 0.54 * (1 + 0.03 * Math.cos(2 * t)) + lineaAspera(t, 0.045),
  interior: (t) =>
    0.42 * (1 + 0.035 * Math.cos(2 * t) + 0.03 * Math.sin(7 * t) + 0.02 * Math.sin(11 * t)),
};

export interface Poro {
  x: number;
  y: number;
  r: number;
}

/** Poros repartidos por la cortical sin tocarse ni salirse de ella. */
function calcularPoros(
  d: Diafisis,
  cuantos: number,
  radio: readonly [number, number],
  hondura: readonly [number, number],
  semilla: number,
  evitar: number,
): Poro[] {
  const r = azar(semilla);
  const lista: Poro[] = [];
  for (let intento = 0; intento < 3000 && lista.length < cuantos; intento++) {
    const t = r() * Math.PI * 2;
    const dist = Math.atan2(Math.sin(t - evitar), Math.cos(t - evitar));
    if (Math.abs(dist) < 0.35) continue;
    const [ri, re] = [d.interior(t), d.exterior(t)];
    const grosor = re - ri;
    const pr = Math.min(radio[0] + r() * (radio[1] - radio[0]), grosor * 0.32);
    const rr = ri + grosor * (hondura[0] + r() * (hondura[1] - hondura[0]));
    if (rr - pr < ri + 0.012 || rr + pr > re - 0.012) continue;
    const p = { x: d.cx + rr * Math.cos(t), y: Y_DIAFISIS + rr * Math.sin(t), r: pr };
    if (lista.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < o.r + p.r + 0.012)) continue;
    lista.push(p);
  }
  return lista;
}

/** Ángulo de la cortical donde van las etiquetas (sin poros encima). */
const T_ROTULO_NORMAL = Math.PI / 4;
const T_ROTULO_OSTEOPOROTICA = (3 * Math.PI) / 4;

export const POROS_NORMALES: readonly Poro[] = calcularPoros(
  DIAFISIS_NORMAL,
  12,
  [0.008, 0.012],
  [0.2, 0.8],
  43,
  T_ROTULO_NORMAL,
);
/** Más y mayores, sobre todo en la mitad interna de la cortical. */
export const POROS_OSTEOPOROTICOS: readonly Poro[] = calcularPoros(
  DIAFISIS_OSTEOPOROTICA,
  16,
  [0.014, 0.038],
  [0.25, 0.6],
  47,
  T_ROTULO_OSTEOPOROTICA,
);

const contornoPoro = (p: Poro): Punto2[] => contornoPolar(p.x, p.y, () => p.r, 16);

function contornoDiafisis(d: Diafisis, lado: 'exterior' | 'interior'): Punto2[] {
  return contornoPolar(d.cx, Y_DIAFISIS, d[lado], 120);
}

/** Cortical de la diáfisis: cara de corte y superficies perióstica y endóstica, con los huecos de los poros. */
function cortical(d: Diafisis, poros: readonly Poro[]): BufferGeometry {
  return prisma(contornoDiafisis(d, 'exterior'), FONDO_DIAFISIS, [
    contornoDiafisis(d, 'interior'),
    ...poros.map((p) => agrandar(contornoPoro(p), 0.003)),
  ]);
}

const interiorPoros = (poros: readonly Poro[]): BufferGeometry =>
  unir(poros.map((p) => prisma(contornoPoro(p), 0.12)));

/** Médula amarilla que llena la cavidad, algo hundida respecto a la cara de corte. */
const Z_MEDULA_DIAFISIS = -0.015;
const medulaDiafisis = (d: Diafisis): BufferGeometry =>
  plano(contornoDiafisis(d, 'interior'), Z_MEDULA_DIAFISIS);

/* ----- Modelo ----- */

/** Construye los dos pares (vértebra y diáfisis, normal y osteoporótica): un grupo con un subgrupo por región. */
export function crearHuesoOsteoporotico(): Group {
  const modelo = grupo('hueso_osteoporotico');
  const cascara = (v: Vertebra): BufferGeometry =>
    prisma(contornoVertebra(v), FONDO_VERTEBRA, [contornoVertebra(v, v.cortical)]);
  const medula = (v: Vertebra): BufferGeometry =>
    plano(contornoVertebra(v, v.cortical), -FONDO_VERTEBRA + 0.001);

  // Vértebra normal: cáscara y médula roja de fondo; su red trabecular es una región.
  modelo.add(
    grupo(
      'vertebra_normal',
      malla(
        cascara(VERTEBRA_NORMAL),
        material(COLORES.cortical, 'hueso', 3),
        'vertebra_normal_cortical',
      ),
      malla(
        medula(VERTEBRA_NORMAL),
        material(COLORES.medula_roja, 'medula', 3),
        'vertebra_normal_medula',
      ),
    ),
    grupo(
      'trabeculas_normales',
      malla(redNormal(), material(COLORES.trabecula, 'hueso_esponjoso'), 'trabeculas_normales_red'),
    ),
  );

  // Vértebra osteoporótica: la cáscara en cuña y las trabéculas compactadas son el aplastamiento.
  modelo.add(
    grupo(
      'vertebra_osteoporotica',
      malla(
        medula(VERTEBRA_OSTEOPOROTICA),
        material(COLORES.medula_grasa, 'medula', 3),
        'vertebra_osteoporotica_medula',
      ),
    ),
    grupo(
      'colapso_vertebral',
      malla(
        unir([cascara(VERTEBRA_OSTEOPOROTICA), ...compactadas()]),
        material(COLORES.cortical, 'hueso', 3),
        'colapso_vertebral_cuna',
      ),
    ),
    grupo(
      'trabeculas_osteoporoticas',
      malla(
        redOsteoporotica(),
        material(COLORES.trabecula, 'hueso_esponjoso'),
        'trabeculas_osteoporoticas_red',
      ),
    ),
    grupo(
      'perforacion_trabecular',
      malla(
        perforaciones(),
        material(COLORES.trabecula, 'hueso_esponjoso'),
        'perforacion_trabecular_rotas',
      ),
    ),
  );

  // Diáfisis normal: cortical gruesa con poros pequeños; la cavidad estrecha es de fondo.
  modelo.add(
    grupo(
      'cortical_normal',
      malla(
        cortical(DIAFISIS_NORMAL, POROS_NORMALES),
        material(COLORES.cortical, 'hueso', 3),
        'cortical_normal_anillo',
      ),
      malla(
        interiorPoros(POROS_NORMALES),
        materialInterior(COLORES.poro),
        'cortical_normal_conductos',
      ),
    ),
    grupo(
      'cavidad_medular_normal',
      malla(
        medulaDiafisis(DIAFISIS_NORMAL),
        material(COLORES.medula_amarilla, 'medula', 3),
        'cavidad_normal_medula',
      ),
    ),
  );

  // Diáfisis osteoporótica: cortical adelgazada, sus poros y la cavidad ampliada, cada uno una región.
  modelo.add(
    grupo(
      'cortical_adelgazada',
      malla(
        cortical(DIAFISIS_OSTEOPOROTICA, POROS_OSTEOPOROTICOS),
        material(COLORES.cortical, 'hueso', 3),
        'cortical_adelgazada_anillo',
      ),
    ),
    grupo(
      'porosidad_cortical',
      malla(
        interiorPoros(POROS_OSTEOPOROTICOS),
        materialInterior(COLORES.poro),
        'porosidad_cortical_poros',
      ),
    ),
    grupo(
      'cavidad_medular_ampliada',
      malla(
        medulaDiafisis(DIAFISIS_OSTEOPOROTICA),
        material(COLORES.medula_amarilla, 'medula', 3),
        'cavidad_medular_ampliada_medula',
      ),
    ),
  );
  return modelo;
}

/* ----- Puntos de las etiquetas ----- */

const FRENTE: Vec3 = [0, 0, 1];

/** Punto sobre la cara de corte de la cortical de una diáfisis, a media pared. */
function enCortical(d: Diafisis, t: number): Vec3 {
  const r = (d.interior(t) + d.exterior(t)) / 2;
  return [d.cx + r * Math.cos(t), Y_DIAFISIS + r * Math.sin(t), 0.001];
}

/** Delante de un nudo de la red (la etiqueta queda sobre la trabécula de la fila de delante). */
const delanteDe = (n: Vec3, radio: number): Vec3 => [n[0], n[1], n[2] + radio];

/** Punto de la etiqueta de cada región y tamaño de la zona que encuadra la cámara. */
export function puntoDeRegion(id: RegionHuesoOsteoporotico): PuntoRegion {
  switch (id) {
    case 'trabeculas_normales':
      return { punto: delanteDe(NUDOS_NORMAL[4]![3]![0]!, 0.02), normal: FRENTE, radio: 0.6 };
    case 'trabeculas_osteoporoticas': {
      const n = NUDOS_OSTEOPOROTICO[VARILLA_ROTULO.columna]![3]![VARILLA_ROTULO.fila]!;
      return { punto: delanteDe(n, 0.011), normal: FRENTE, radio: 0.6 };
    }
    case 'perforacion_trabecular': {
      const { columna, nivel } = VARILLAS_ROTAS[0];
      return {
        punto: delanteDe(NUDOS_OSTEOPOROTICO[columna]![nivel]![0]!, 0.011),
        normal: FRENTE,
        radio: 0.35,
      };
    }
    case 'colapso_vertebral': {
      const v = VERTEBRA_OSTEOPOROTICA;
      const u = -ANCHO_VERTEBRA / 2 + 0.12;
      return {
        punto: [v.cx + u, bordeSuperior(v, u) - v.cortical / 2, 0.001],
        normal: FRENTE,
        radio: 0.6,
      };
    }
    case 'cortical_normal':
      return { punto: enCortical(DIAFISIS_NORMAL, T_ROTULO_NORMAL), normal: FRENTE, radio: 0.55 };
    case 'cortical_adelgazada':
      return {
        punto: enCortical(DIAFISIS_OSTEOPOROTICA, T_ROTULO_OSTEOPOROTICA),
        normal: FRENTE,
        radio: 0.55,
      };
    case 'porosidad_cortical': {
      const p = POROS_OSTEOPOROTICOS.reduce((m, x) => (x.r > m.r ? x : m));
      return { punto: [p.x, p.y, 0.001], normal: FRENTE, radio: 0.35 };
    }
    case 'cavidad_medular_ampliada':
      return {
        punto: [DIAFISIS_OSTEOPOROTICA.cx, Y_DIAFISIS, Z_MEDULA_DIAFISIS + 0.001],
        normal: FRENTE,
        radio: 0.55,
      };
  }
}

export function esRegionHuesoOsteoporotico(id: string): id is RegionHuesoOsteoporotico {
  return (REGIONES_HUESO_OSTEOPOROTICO as readonly string[]).includes(id);
}
