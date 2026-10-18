/**
 * Osteocito y su red lacuno-canalicular en hueso cortical: el modelo `red_lacuno_canalicular` de la exploración 3D
 * (actividad m3_multicapa_osteocito, «Explora la red lacuno-canalicular»; hasta 2026-10-18 era un dibujo SVG con una
 * ilustración hecha con IA debajo, que tenía errores: células de revestimiento como rebanadas y capilar como diana).
 *
 * Es un bloque de matriz mineralizada (con sus láminas, paralelas al conducto de Havers) cortado por un plano
 * (z = 0, la cara de corte, mira a la cámara). La matriz se ha quitado por delante del plano y las partes blandas se
 * dejan enteras, como en las ilustraciones de microscopía electrónica de barrido:
 *  - el osteocito, estrellado, entero en su laguna (un hueco detrás del plano, algo mayor que la célula: el líquido
 *    pericelular de la laguna), con el cilio primario hacia el hueco de la laguna;
 *  - sus procesos dendríticos: los que corren por el plano van dentro de su canalículo (un manguito de líquido
 *    translúcido, medio hundido en la matriz como en un surco); los que van hacia atrás se meten en la pared de la
 *    laguna. Llegan a la superficie, al conducto de Havers (más densos hacia él y hacia la superficie) y a dos
 *    osteocitos vecinos, con los que se tocan por uniones comunicantes;
 *  - dentro de cada canalículo, las fibras de anclaje cruzan el espacio pericelular y, en los puntos de unión, las
 *    integrinas fijan el proceso a la pared; en la membrana, canales Piezo1 (tres aspas) y conexina 43 (anillos de
 *    seis subunidades: hemicanales en la célula y uniones comunicantes entre procesos vecinos);
 *  - abajo, el conducto de Havers abierto a lo largo, con un capilar cortado a lo largo y sus eritrocitos;
 *  - arriba, la superficie ósea con células de revestimiento planas y osteoblastos de superficie;
 *  - flechas del flujo de líquido (el sentido durante una compresión) y partículas de PGE2 y óxido nítrico.
 *
 * Esquema fuera de escala (1 unidad ≈ 15 µm): el espacio pericelular, las fibras, las integrinas y los canales están
 * muy exagerados para que se vean (un canalículo mide menos de 1 µm y un canal, unos nanómetros).
 *
 * Cada región de la actividad es un grupo con el id de su nodo (`content/nodos3d.ts`) y sus propios materiales; los
 * cuerpos de los osteocitos vecinos son decoración. El dibujo tenía 15 capas y la exploración admite 12 nodos: el
 * espacio pericelular va con los canalículos, las integrinas con las fibras de anclaje y Piezo1 con la conexina 43.
 */
import type { BufferGeometry } from 'three';
import { CatmullRomCurve3, CylinderGeometry, Group, Quaternion, Vector3 } from 'three';
import type { OpcionesCuenco, OpcionesEsferoide, Punto2, Vec3 } from '../histologia/piezas';
import {
  aleatorio,
  banda,
  cara,
  caraTrasera,
  cono,
  contornoCuenco,
  cuenco,
  eritrocito,
  esferoide,
  grupo,
  malla,
  material,
  mediaCana,
  muestras,
  plano,
  puntoEsferoide,
  texturaLaminas,
  tubo,
  unir,
  varilla,
} from '../histologia/piezas';

/** Regiones del modelo: los ids de los nodos del catálogo `red_lacuno_canalicular`. */
export const REGIONES_RED = [
  'matriz_mineralizada',
  'laguna_osteocitica',
  'cuerpo_osteocito',
  'procesos_dendriticos',
  'canaliculos',
  'fibras_de_anclaje',
  'cilio_primario',
  'canales_de_membrana',
  'capilar_conducto_haversiano',
  'celulas_revestimiento',
  'flechas_flujo_liquido',
  'mensajeros_pge2_no',
] as const;
export type RegionRed = (typeof REGIONES_RED)[number];

/* ----- Medidas (unidades del modelo) ----- */

export const X_MIN = -2.6;
export const X_MAX = 2.6;
export const Y_FONDO = -1.95;
/** Superficie ósea (cara de arriba del bloque), con las células de revestimiento. */
export const Y_SUPERFICIE = 1.45;
export const PROFUNDIDAD = 0.9;

/** Conducto de Havers: a lo largo de X, abierto por la cara de corte. */
export const Y_CONDUCTO = -1.2;
export const R_CONDUCTO = 0.45;
export const R_CAPILAR = 0.17;
const R_LUZ = 0.145;
export function yCapilar(x: number): number {
  return -1.3 + 0.03 * Math.sin(0.9 * x + 0.5);
}

/** Radio del proceso dendrítico y del canalículo (su luz: el espacio pericelular, exagerado). */
export const R_PROCESO = 0.024;
export const R_CANALICULO = 0.062;
/** Los extremos de los canalículos: en la superficie y en el borde del conducto. */
export const Y_FIN_ARRIBA = Y_SUPERFICIE - 0.006;
export const Y_FIN_ABAJO = Y_CONDUCTO + R_CONDUCTO - 0.01;

/** Láminas: paralelas al conducto (horizontales en la cara de corte); una línea interlaminar pasa por la laguna. */
const PERIODO_LAMINAS = 0.44;

/** Las flechas del flujo van por delante de la cara de corte, como rótulos. */
export const Z_FLECHAS = 0.13;

const COLORES = {
  matriz: '#e6d8bc',
  laguna: '#8c7466',
  osteocito: '#8a9ad2',
  vecino: '#8f9fd4',
  proceso: '#8796cf',
  canaliculo: '#cfe8f2',
  fibra: '#e6cf7e',
  integrina: '#4fa77f',
  cilio: '#5e72bd',
  piezo: '#2b9a9a',
  conexina: '#e0893a',
  conducto: '#d6c2a2',
  capilar: '#d39a92',
  eritrocito: '#b3302b',
  endotelio: '#5c4b8c',
  fibraConducto: '#efd9cf',
  revestimiento: '#b7a5d4',
  osteoblasto: '#8d86c6',
  nucleo: '#40357c',
  flecha: '#3f8fcb',
  pge2: '#e3a03a',
  oxidoNitrico: '#9ccf63',
} as const;

const grados = (g: number): number => (g * Math.PI) / 180;

/* ----- Lagunas y cuerpos ----- */

/** Irregularidad suave del contorno de una laguna. */
function irregular(azar: () => number, amplitud: number): (angulo: number) => number {
  const f1 = azar() * Math.PI * 2;
  const f2 = azar() * Math.PI * 2;
  return (t) => 1 + amplitud * (0.6 * Math.sin(2 * t + f1) + 0.4 * Math.sin(3 * t + f2));
}

/** Laguna del osteocito central: alargada a lo largo de las láminas, algo mayor que la célula. */
export const LAGUNA: OpcionesCuenco = {
  centro: [0.1, 0.12],
  semiejes: [0.7, 0.33, 0.3],
  giro: 0.03,
  modulacion: irregular(aleatorio(31), 0.05),
  angulos: 32,
  anillos: 8,
};

export const LAGUNAS_VECINAS: readonly [OpcionesCuenco, OpcionesCuenco] = [
  {
    centro: [-2.0, 0.32],
    semiejes: [0.48, 0.24, 0.24],
    giro: -0.05,
    modulacion: irregular(aleatorio(37), 0.06),
    angulos: 24,
    anillos: 6,
  },
  {
    centro: [2.0, -0.05],
    semiejes: [0.46, 0.23, 0.24],
    giro: 0.06,
    modulacion: irregular(aleatorio(41), 0.06),
    angulos: 24,
    anillos: 6,
  },
];

/** Cuerpo del osteocito central: desplazado a la izquierda, deja un hueco a la derecha para el cilio. */
export const CENTRO_CELULA: Vec3 = [0, 0.12, -0.03];
export const SEMIEJES_CELULA: Vec3 = [0.54, 0.24, 0.22];
const SEMIEJES_VECINO: Vec3 = [0.4, 0.18, 0.18];
const centroVecino = (l: OpcionesCuenco, lado: 1 | -1): Vec3 => [
  l.centro[0] + lado * 0.03,
  l.centro[1],
  -0.02,
];

/* ----- Procesos y canalículos ----- */

export interface Proceso {
  /** Recorrido del proceso, del interior del cuerpo a su final. */
  puntos: Vec3[];
  /** Desde qué punto va dentro de su canalículo (el borde de la laguna); −1 si va hacia atrás, por la matriz. */
  desdeCanaliculo: number;
}

/** Punto del borde de la laguna en la dirección `angulo` (desde su centro), en el plano de corte. */
function bordeLaguna(l: OpcionesCuenco, angulo: number): Vec3 {
  const borde = contornoCuenco(l);
  const vuelta = (((angulo - (l.giro ?? 0)) / (Math.PI * 2)) % 1) + 1;
  const [x, y] = borde[Math.round((vuelta % 1) * borde.length) % borde.length]!;
  return [x, y, 0];
}

/** Proceso por el plano: del interior del cuerpo al borde de su laguna y de ahí a `fin` por unos puntos. */
function procesoEnPlano(
  centro: Vec3,
  semiejes: Vec3,
  laguna: OpcionesCuenco,
  angulo: number,
  intermedios: readonly Punto2[],
  fin: Punto2,
): Proceso {
  const dentro: Vec3 = [
    centro[0] + semiejes[0] * 0.55 * Math.cos(angulo),
    centro[1] + semiejes[1] * 0.55 * Math.sin(angulo),
    0,
  ];
  return {
    puntos: [
      dentro,
      bordeLaguna(laguna, angulo),
      ...intermedios.map(([x, y]): Vec3 => [x, y, 0]),
      [fin[0], fin[1], 0],
    ],
    desdeCanaliculo: 1,
  };
}

/** Uniones comunicantes con los osteocitos vecinos: donde se tocan los procesos. */
export const UNIONES: readonly [Vec3, Vec3] = [
  [-1.22, 0.27, 0],
  [1.3, -0.03, 0],
];

/** Ángulos (desde el centro de la laguna) de los procesos centrales que van por el plano. */
const ANGULOS_CENTRALES = [62, 82, 100, 125, 152, -28, -52, -75, -95, -115, -138, 176, -14];

/** Procesos del osteocito central por el plano: más densos hacia el conducto y hacia la superficie. */
export function procesosCentrales(): Proceso[] {
  const p = (angulo: number, intermedios: Punto2[], fin: Punto2): Proceso =>
    procesoEnPlano(CENTRO_CELULA, SEMIEJES_CELULA, LAGUNA, grados(angulo), intermedios, fin);
  const [u0, u1] = UNIONES;
  return [
    // Hacia la superficie.
    p(62, [[0.5, 0.8]], [0.6, Y_FIN_ARRIBA]),
    p(82, [[0.2, 0.85]], [0.25, Y_FIN_ARRIBA]),
    p(100, [[-0.16, 0.8]], [-0.25, Y_FIN_ARRIBA]),
    p(125, [[-0.55, 0.85]], [-0.85, Y_FIN_ARRIBA]),
    p(152, [[-0.95, 0.75]], [-1.55, Y_FIN_ARRIBA]),
    // Hacia el conducto de Havers.
    p(-28, [[1.15, -0.45]], [1.5, Y_FIN_ABAJO]),
    p(-52, [[0.6, -0.4]], [0.75, Y_FIN_ABAJO]),
    p(-75, [[0.3, -0.42]], [0.35, Y_FIN_ABAJO]),
    p(-95, [[-0.08, -0.4]], [-0.05, Y_FIN_ABAJO]),
    p(-115, [[-0.4, -0.42]], [-0.45, Y_FIN_ABAJO]),
    p(-138, [[-0.75, -0.38]], [-0.95, Y_FIN_ABAJO]),
    // Hacia los vecinos, hasta las uniones comunicantes.
    p(176, [[-0.9, 0.2]], [u0[0] + 0.02, u0[1]]),
    p(-14, [[1.05, 0.0]], [u1[0] - 0.02, u1[1]]),
  ];
}

/** Ramas de algunos procesos centrales: salen de un punto del canalículo y terminan en otro sitio. */
export function ramasCentrales(): Proceso[] {
  const procesos = procesosCentrales();
  const rama = (i: number, t: number, intermedio: Punto2, fin: Punto2): Proceso => {
    const o = curvaDe(procesos[i]!).getPointAt(t);
    return {
      puntos: [
        [o.x, o.y, 0],
        [intermedio[0], intermedio[1], 0],
        [fin[0], fin[1], 0],
      ],
      desdeCanaliculo: 0,
    };
  };
  return [
    rama(0, 0.62, [0.85, 1.15], [0.98, Y_FIN_ARRIBA]),
    rama(3, 0.6, [-0.95, 1.2], [-1.15, Y_FIN_ARRIBA]),
    rama(8, 0.62, [-0.22, -0.62], [-0.27, Y_FIN_ABAJO]),
  ];
}

/** Procesos de los vecinos por el plano: hacia la unión con el central, hacia arriba y hacia el conducto. */
export function procesosVecinos(): Proceso[] {
  const [izq, der] = LAGUNAS_VECINAS;
  const ci = centroVecino(izq, -1);
  const cd = centroVecino(der, 1);
  const s = SEMIEJES_VECINO;
  const [u0, u1] = UNIONES;
  return [
    procesoEnPlano(ci, s, izq, grados(-6), [[-1.4, 0.3]], [u0[0] - 0.02, u0[1]]),
    procesoEnPlano(ci, s, izq, grados(70), [[-1.9, 0.95]], [-1.95, Y_FIN_ARRIBA]),
    procesoEnPlano(ci, s, izq, grados(-80), [[-2.0, -0.35]], [-1.95, Y_FIN_ABAJO]),
    procesoEnPlano(ci, s, izq, grados(-120), [[-2.3, -0.3]], [-2.35, Y_FIN_ABAJO]),
    procesoEnPlano(cd, s, der, grados(178), [[1.5, -0.03]], [u1[0] + 0.02, u1[1]]),
    procesoEnPlano(cd, s, der, grados(80), [[2.05, 0.7]], [2.2, Y_FIN_ARRIBA]),
    procesoEnPlano(cd, s, der, grados(110), [[1.75, 0.75]], [1.68, Y_FIN_ARRIBA]),
    procesoEnPlano(cd, s, der, grados(-100), [[1.95, -0.45]], [2.0, Y_FIN_ABAJO]),
  ];
}

/** Direcciones (en los ejes del cuerpo) de los procesos que van hacia atrás, a la pared de la laguna. */
const ATRAS = [20, 70, 135, 200, 245, 300, 335].map((g) =>
  new Vector3(Math.cos(grados(g)) * 0.75, Math.sin(grados(g)) * 0.75, -0.66).normalize(),
);

/** Procesos que van hacia atrás desde el cuerpo y se meten en la pared de la laguna (siguen por la matriz). */
function procesosHaciaAtras(): Proceso[] {
  const [cx, cy, cz] = CENTRO_CELULA;
  const [a, b, c] = SEMIEJES_CELULA;
  return ATRAS.map((d) => {
    const punto = (k: number): Vec3 => [cx + d.x * a * k, cy + d.y * b * k, cz + d.z * c * k];
    return { puntos: [punto(0.5), punto(1.1), punto(1.6), punto(2.1)], desdeCanaliculo: -1 };
  });
}

function curvaDe(p: Proceso, desde = 0): CatmullRomCurve3 {
  return new CatmullRomCurve3(p.puntos.slice(desde).map((q) => new Vector3(...q)));
}

/** Tramo del canalículo de un proceso (del borde de la laguna al final), como curva. */
function curvaCanaliculo(p: Proceso): CatmullRomCurve3 {
  return curvaDe(p, Math.max(0, p.desdeCanaliculo));
}

/** Todos los procesos que van por el plano dentro de su canalículo. */
export function procesosEnCanaliculo(): Proceso[] {
  return [...procesosCentrales(), ...ramasCentrales(), ...procesosVecinos()];
}

/** Bases cónicas de los procesos en el cuerpo: el osteocito es estrellado, no un óvalo liso. */
function formaEstrellada(direcciones: readonly Vector3[]): (d: Vector3) => number {
  return (d) => {
    let f = 1;
    for (const e of direcciones) f += 0.28 * Math.exp(-(1 - d.dot(e)) / 0.025);
    return f;
  };
}

/** Dirección, en los ejes del cuerpo (antes de escalar), de un proceso que sale por el plano con ese ángulo. */
function direccionEnPlano(angulo: number, semiejes: Vec3): Vector3 {
  return new Vector3(Math.cos(angulo) / semiejes[0], Math.sin(angulo) / semiejes[1], 0).normalize();
}

export const CUERPO: OpcionesEsferoide = {
  centro: CENTRO_CELULA,
  semiejes: SEMIEJES_CELULA,
  forma: formaEstrellada([
    ...ANGULOS_CENTRALES.map((g) => direccionEnPlano(grados(g), SEMIEJES_CELULA)),
    ...ATRAS,
  ]),
  detalle: 3,
};

/** Punto de la membrana del cuerpo central en una dirección de sus ejes, y su normal (aproximada). */
function enMembrana(d: Vec3): { punto: Vec3; normal: Vec3 } {
  const u = new Vector3(...d).normalize();
  const punto = puntoEsferoide(CUERPO, u);
  const [a, b, c] = SEMIEJES_CELULA;
  const n = new Vector3(u.x / a, u.y / b, u.z / c).normalize();
  return { punto, normal: [n.x, n.y, n.z] };
}

/* ----- Glifos moleculares (exagerados) ----- */

/** Orienta una pieza hecha alrededor de +Y para que su eje sea `normal` y su base quede en `base`. */
function colocar(g: BufferGeometry, base: Vec3, normal: Vec3): BufferGeometry {
  const n = new Vector3(...normal).normalize();
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), n));
  g.translate(...base);
  return g;
}

/** Piezo1: tres aspas curvadas, como una hélice, alrededor de un poro central. */
function piezo1(base: Vec3, normal: Vec3): BufferGeometry {
  const piezas: BufferGeometry[] = [
    new CylinderGeometry(0.014, 0.017, 0.024, 8).translate(0, 0.012, 0),
  ];
  for (let k = 0; k < 3; k++) {
    const aspa = esferoide({ centro: [0.042, 0, 0], semiejes: [0.042, 0.007, 0.014], detalle: 1 });
    aspa.rotateX(0.45);
    aspa.rotateZ(-0.25);
    aspa.translate(0, 0.016, 0);
    aspa.rotateY((k * 2 * Math.PI) / 3 + 0.3);
    piezas.push(aspa);
  }
  return colocar(unir(piezas), base, normal);
}

/** Conexón de conexina 43: seis subunidades en anillo alrededor de un poro (un hemicanal). */
function conexon(base: Vec3, eje: Vec3, alto = 0.03): BufferGeometry {
  const piezas = Array.from({ length: 6 }, (_, k) => {
    const a = (k * Math.PI) / 3;
    return new CylinderGeometry(0.0085, 0.0085, alto, 6).translate(
      0.02 * Math.cos(a),
      alto / 2,
      0.02 * Math.sin(a),
    );
  });
  return colocar(unir(piezas), base, eje);
}

/* ----- Fibras e integrinas ----- */

const FRENTE = new Vector3(0, 0, 1);

/** Normal en el plano a la curva (la tangente girada 90°). */
function lateral(tangente: Vector3): Vector3 {
  return new Vector3(-tangente.y, tangente.x, 0).normalize();
}

/**
 * Fibras de anclaje a lo largo de un canalículo: cruzan el espacio pericelular de la membrana del proceso a la pared,
 * en la mitad visible (por delante del plano). Cada 0,085 unidades, dos fibras a 50° y 130° del plano.
 */
function fibrasDe(p: Proceso): BufferGeometry[] {
  const curva = curvaCanaliculo(p);
  const n = Math.max(3, Math.floor(curva.getLength() / 0.085));
  const fibras: BufferGeometry[] = [];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const o = curva.getPointAt(t);
    const lado = lateral(curva.getTangentAt(t));
    for (const angulo of [grados(50), grados(130)]) {
      const d = lado
        .clone()
        .multiplyScalar(Math.cos(angulo))
        .addScaledVector(FRENTE, Math.sin(angulo));
      const a = o.clone().addScaledVector(d, R_PROCESO * 0.95);
      const b = o.clone().addScaledVector(d, R_CANALICULO - 0.004);
      fibras.push(varilla([a.x, a.y, a.z], [b.x, b.y, b.z], 0.0035, 3));
    }
  }
  return fibras;
}

/**
 * Integrinas en los puntos de unión: un heterodímero (dos varillas, α y β, con su cabeza globular junto a la pared)
 * que fija el proceso a la pared del canalículo. Cada 0,3 unidades, arriba del proceso.
 */
function integrinasDe(p: Proceso): BufferGeometry[] {
  const curva = curvaCanaliculo(p);
  const n = Math.max(2, Math.round(curva.getLength() / 0.3));
  const piezas: BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const o = curva.getPointAt(t);
    const tangente = curva.getTangentAt(t);
    for (const s of [-1, 1]) {
      const pie = o.clone().addScaledVector(tangente, 0.008 * s);
      const a: Vec3 = [pie.x, pie.y, pie.z + R_PROCESO * 0.95];
      const b: Vec3 = [pie.x, pie.y, pie.z + R_CANALICULO - 0.016];
      piezas.push(
        varilla(a, b, 0.0045, 5),
        esferoide({
          centro: [b[0], b[1], b[2] + 0.006],
          semiejes: [0.009, 0.009, 0.009],
          detalle: 1,
        }),
      );
    }
  }
  return piezas;
}

/* ----- Superficie ósea ----- */

interface CelulaSuperficie {
  centro: Vec3;
  semiejes: Vec3;
  osteoblasto: boolean;
  delante: boolean;
}

/** Células de la superficie: revestimiento plano a la izquierda y osteoblastos de superficie a la derecha. */
export function celulasSuperficie(): CelulaSuperficie[] {
  const lista: CelulaSuperficie[] = [];
  const revestimiento = (x: number, z: number, delante: boolean): CelulaSuperficie => ({
    centro: [x, Y_SUPERFICIE + 0.025, z],
    semiejes: [0.55, 0.045, delante ? 0.3 : 0.2],
    osteoblasto: false,
    delante,
  });
  // Cúbicos y voluminosos, cada uno de un tamaño.
  const osteoblasto = (x: number, z: number, delante: boolean): CelulaSuperficie => {
    const alto = 0.19 + 0.025 * Math.sin(7 * x + z);
    return {
      centro: [x, Y_SUPERFICIE + alto * 0.95, z],
      semiejes: [0.2 + 0.012 * Math.cos(5 * x), alto, 0.19],
      osteoblasto: true,
      delante,
    };
  };
  for (const x of [-2.05, -0.95, 0.15]) lista.push(revestimiento(x, -0.27, true));
  for (const x of [-1.55, -0.45, 0.6]) lista.push(revestimiento(x, -0.72, false));
  for (const x of [0.92, 1.34, 1.76, 2.18]) lista.push(osteoblasto(x, -0.16, true));
  for (const x of [1.38, 1.8, 2.22]) lista.push(osteoblasto(x, -0.55, false));
  return lista;
}

/* ----- Contornos de la matriz ----- */

function caraLateral(lado: 1 | -1): BufferGeometry {
  // En el plano lateral: s = profundidad (de 0 a PROFUNDIDAD), y = altura; con la muesca del conducto.
  const arco = muestras(0, Math.PI, 24).map((fi): Punto2 => [
    R_CONDUCTO * Math.sin(fi),
    Y_CONDUCTO - R_CONDUCTO * Math.cos(fi),
  ]);
  const contorno: Punto2[] = [
    [0, Y_SUPERFICIE],
    [PROFUNDIDAD, Y_SUPERFICIE],
    [PROFUNDIDAD, Y_FONDO],
    [0, Y_FONDO],
    ...arco,
  ];
  const g = cara(
    contorno.map(([s, y]): Punto2 => [lado * s, y]),
    [],
    0,
  );
  g.rotateY((lado * Math.PI) / 2);
  g.translate(lado === 1 ? X_MAX : X_MIN, 0, 0);
  return g;
}

/* ----- Modelo ----- */

/** Construye el osteocito y su red: un grupo con un subgrupo por región. */
export function crearRedLacunoCanalicular(): Group {
  const modelo = new Group();
  modelo.name = 'red_lacuno_canalicular';
  const azar = aleatorio(53);
  const enCanaliculo = procesosEnCanaliculo();
  const centrales = procesosCentrales();

  /* Matriz mineralizada: cara de corte con las láminas y el resto del bloque */
  const laminas = texturaLaminas('v');
  laminas.repeat.set(1, 1 / PERIODO_LAMINAS);
  laminas.offset.set(0, (((-LAGUNA.centro[1] / PERIODO_LAMINAS) % 1) + 1) % 1);
  const arribaConducto = Y_CONDUCTO + R_CONDUCTO;
  const abajoConducto = Y_CONDUCTO - R_CONDUCTO;
  const rectangulo: Punto2[] = [
    [X_MIN, Y_FONDO],
    [X_MAX, Y_FONDO],
    [X_MAX, Y_SUPERFICIE],
    [X_MIN, Y_SUPERFICIE],
  ];
  modelo.add(
    grupo(
      'matriz_mineralizada',
      malla(
        unir([
          cara(
            [
              [X_MIN, arribaConducto],
              [X_MAX, arribaConducto],
              [X_MAX, Y_SUPERFICIE],
              [X_MIN, Y_SUPERFICIE],
            ],
            [contornoCuenco(LAGUNA), ...LAGUNAS_VECINAS.map((l) => contornoCuenco(l))],
            0,
          ),
          cara(
            [
              [X_MIN, Y_FONDO],
              [X_MAX, Y_FONDO],
              [X_MAX, abajoConducto],
              [X_MIN, abajoConducto],
            ],
            [],
            0,
          ),
        ]),
        material(COLORES.matriz, 'hueso', 2.5, { map: laminas }),
        'matriz_corte',
      ),
      malla(
        unir([
          plano([X_MIN, Y_SUPERFICIE, 0], [X_MAX - X_MIN, 0, 0], [0, 0, -PROFUNDIDAD], (p) => [
            p.x,
            p.z,
          ]),
          plano([X_MIN, Y_FONDO, -PROFUNDIDAD], [X_MAX - X_MIN, 0, 0], [0, 0, PROFUNDIDAD], (p) => [
            p.x,
            p.z,
          ]),
          caraLateral(1),
          caraLateral(-1),
          caraTrasera(rectangulo, -PROFUNDIDAD),
        ]),
        material(COLORES.matriz, 'hueso', 2.5),
        'matriz_bloque',
      ),
    ),
  );

  /* Lagunas: los huecos de la matriz (la central y las de los vecinos) */
  modelo.add(
    grupo(
      'laguna_osteocitica',
      malla(
        unir([cuenco(LAGUNA), ...LAGUNAS_VECINAS.map((l) => cuenco(l))]),
        material(COLORES.laguna, 'cavidad', 4),
        'lagunas',
      ),
    ),
  );

  /* Cuerpo del osteocito central, estrellado */
  modelo.add(
    grupo(
      'cuerpo_osteocito',
      malla(esferoide(CUERPO), material(COLORES.osteocito, 'celula', 5), 'cuerpo'),
    ),
  );

  /* Procesos dendríticos: por el plano, hacia atrás y los de los vecinos */
  const tuboDe = (p: Proceso, radio: number, radiales: number, desde = 0): BufferGeometry => {
    const segmentos = Math.max(8, Math.round(curvaDe(p, desde).getLength() * 26));
    return tubo(p.puntos.slice(desde), radio, segmentos, radiales);
  };
  modelo.add(
    grupo(
      'procesos_dendriticos',
      malla(
        unir([...enCanaliculo, ...procesosHaciaAtras()].map((p) => tuboDe(p, R_PROCESO, 5))),
        material(COLORES.proceso, 'celula', 6),
        'procesos',
      ),
    ),
  );

  /* Canalículos: manguitos de líquido translúcido alrededor de los procesos (el espacio pericelular) */
  modelo.add(
    grupo(
      'canaliculos',
      malla(
        unir(enCanaliculo.map((p) => tuboDe(p, R_CANALICULO, 8, Math.max(0, p.desdeCanaliculo)))),
        material(COLORES.canaliculo, 'liquido', 1, {
          transparent: true,
          opacity: 0.36,
          depthWrite: false,
        }),
        'canaliculos_liquido',
      ),
    ),
  );

  /* Fibras de anclaje e integrinas */
  modelo.add(
    grupo(
      'fibras_de_anclaje',
      malla(unir(enCanaliculo.flatMap(fibrasDe)), material(COLORES.fibra, 'fibra', 1), 'fibras'),
      malla(
        unir(enCanaliculo.flatMap(integrinasDe)),
        material(COLORES.integrina, 'molecula', 1),
        'integrinas',
      ),
    ),
  );

  /* Cilio primario: desde el polo derecho del cuerpo hacia el hueco de la laguna */
  const baseCilio = enMembrana([1, 0.08, -0.1]).punto;
  const recorridoCilio: Vec3[] = [
    [-0.012, -0.002, 0.001],
    [0, 0, 0],
    [0.06, 0.015, -0.006],
    [0.12, 0.03, -0.012],
    [0.17, 0.035, -0.015],
  ].map(([x, y, z]): Vec3 => [baseCilio[0] + x!, baseCilio[1] + y!, baseCilio[2] + z!]);
  const punta = recorridoCilio.at(-1)!;
  modelo.add(
    grupo(
      'cilio_primario',
      malla(
        unir([
          tubo(recorridoCilio, 0.011, 16, 6),
          esferoide({ centro: punta, semiejes: [0.011, 0.011, 0.011], detalle: 1 }),
          varilla(
            [baseCilio[0] - 0.03, baseCilio[1] - 0.004, baseCilio[2] + 0.003],
            [baseCilio[0] + 0.004, baseCilio[1], baseCilio[2]],
            0.017,
            8,
          ),
        ]),
        material(COLORES.cilio, 'celula', 1),
        'cilio',
      ),
    ),
  );

  /* Canales de membrana: Piezo1 y conexina 43 (hemicanales en el cuerpo, uniones entre procesos vecinos) */
  const piezos: BufferGeometry[] = [];
  for (const d of [
    [0.3, 0.5, 0.8],
    [-0.45, 0.3, 0.85],
    [0.5, -0.4, 0.75],
    [-0.2, -0.55, 0.8],
    [0.72, 0.15, 0.65],
    [-0.75, -0.05, 0.6],
  ] as const) {
    const m = enMembrana([...d]);
    piezos.push(piezo1(m.punto, m.normal));
  }
  for (const [i, t] of [
    [2, 0.45],
    [7, 0.4],
    [12, 0.55],
  ] as const) {
    const o = curvaCanaliculo(centrales[i]!).getPointAt(t);
    piezos.push(piezo1([o.x, o.y, o.z + R_PROCESO * 0.9], [0, 0, 1]));
  }
  const conexinas: BufferGeometry[] = [];
  for (const d of [
    [0.1, 0.65, 0.75],
    [-0.6, -0.15, 0.78],
    [0.35, -0.7, 0.62],
  ] as const) {
    const m = enMembrana([...d]);
    conexinas.push(conexon(m.punto, m.normal, 0.022));
  }
  for (const u of UNIONES) {
    // Dos conexones acoplados, uno en la membrana de cada proceso, a lo largo del recorrido.
    conexinas.push(conexon([u[0] - 0.03, u[1], u[2]], [1, 0, 0]), conexon(u, [1, 0, 0]));
  }
  modelo.add(
    grupo(
      'canales_de_membrana',
      malla(unir(piezos), material(COLORES.piezo, 'molecula', 1), 'piezo1'),
      malla(unir(conexinas), material(COLORES.conexina, 'molecula', 1), 'conexina_43'),
    ),
  );

  /* Conducto de Havers con su capilar cortado a lo largo y los eritrocitos */
  const xs = muestras(X_MIN, X_MAX, 90);
  const eritrocitos: BufferGeometry[] = [
    [-2.2, 0.1, 0.12],
    [-1.6, -0.15, 0.05],
    [-0.75, 0.2, -0.1],
    [-0.1, -0.05, 0.15],
    [0.55, 0.12, 0.08],
    [1.35, -0.18, -0.06],
    [2.05, 0.05, 0.18],
  ].map(([x, ny, nx]) => eritrocito([x!, yCapilar(x!), -0.06], 0.1, [nx!, ny!, 1]));
  for (const x of [-1.15, 0.95]) {
    const g = eritrocito([x, yCapilar(x), -0.045], 0.09, [1, 0.1, 0]);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.min(pos.getZ(i), -0.003));
    g.computeVertexNormals();
    eritrocitos.push(g);
  }
  modelo.add(
    grupo(
      'capilar_conducto_haversiano',
      malla(
        mediaCana({
          x0: X_MIN,
          x1: X_MAX,
          y: () => Y_CONDUCTO,
          radio: R_CONDUCTO,
          haciaDentro: true,
          tramos: 40,
          angulos: 16,
        }),
        material(COLORES.conducto, 'hueso', 3),
        'conducto_pared',
      ),
      malla(
        unir([
          mediaCana({
            x0: X_MIN,
            x1: X_MAX,
            y: yCapilar,
            radio: R_CAPILAR,
            haciaDentro: false,
            tramos: 60,
          }),
          mediaCana({
            x0: X_MIN,
            x1: X_MAX,
            y: yCapilar,
            radio: R_LUZ,
            haciaDentro: true,
            tramos: 60,
          }),
          cara(
            banda(
              xs,
              (x) => yCapilar(x) + R_CAPILAR,
              (x) => yCapilar(x) + R_LUZ,
            ),
            [],
            0,
          ),
          cara(
            banda(
              xs,
              (x) => yCapilar(x) - R_LUZ,
              (x) => yCapilar(x) - R_CAPILAR,
            ),
            [],
            0,
          ),
        ]),
        material(COLORES.capilar, 'vaso', 1),
        'capilar_pared',
      ),
      malla(
        unir(
          [-1.8, 0.3, 1.9].map((x) =>
            esferoide({
              centro: [x, yCapilar(x) + 0.01, -R_LUZ + 0.006],
              semiejes: [0.11, 0.035, 0.014],
              detalle: 1,
            }),
          ),
        ),
        material(COLORES.endotelio, 'nucleo', 10),
        'capilar_endotelio',
      ),
      malla(unir(eritrocitos), material(COLORES.eritrocito, 'celula', 3), 'eritrocitos'),
      malla(
        unir(
          [
            [Y_CONDUCTO + 0.22, -0.25, 0.4],
            [Y_CONDUCTO - 0.05, -0.36, 1.9],
          ].map(([y, z, fase]) =>
            tubo(
              muestras(X_MIN, X_MAX, 8).map((x): Vec3 => [
                x,
                y! + 0.03 * Math.sin(2 * x + fase!),
                z! + 0.03 * Math.cos(1.6 * x + fase!),
              ]),
              0.012,
              40,
              4,
            ),
          ),
        ),
        material(COLORES.fibraConducto, 'fibra', 6),
        'conducto_fibras',
      ),
    ),
  );

  /* Células de revestimiento y osteoblastos de superficie */
  const superficie = celulasSuperficie();
  // Bultos suaves y distintos en cada célula: ninguna es una caja ni un disco perfecto.
  const lobulos = (): ((d: Vector3) => number) => {
    const f = [azar(), azar(), azar()].map((v) => v * Math.PI * 2);
    return (d) =>
      1 +
      0.05 * Math.sin(3 * d.x + f[0]!) * Math.sin(2 * d.z + f[1]!) +
      0.04 * Math.cos(2.5 * d.y + f[2]!);
  };
  const nucleosSuperficie: BufferGeometry[] = [];
  const cuerposRevestimiento: BufferGeometry[] = [];
  const cuerposOsteoblastos: BufferGeometry[] = [];
  for (const c of superficie) {
    const corte = c.delante ? { zMax: 0 } : {};
    if (c.osteoblasto) {
      cuerposOsteoblastos.push(
        esferoide({
          centro: c.centro,
          semiejes: c.semiejes,
          exponente: 2.3,
          forma: lobulos(),
          detalle: 2,
          yMin: Y_SUPERFICIE,
          ...corte,
        }),
      );
      if (c.delante) {
        nucleosSuperficie.push(
          esferoide({
            centro: [
              c.centro[0] + (azar() - 0.5) * 0.06,
              Y_SUPERFICIE + c.semiejes[1] * 1.3,
              -0.03,
            ],
            semiejes: [0.08, 0.075, 0.07],
            detalle: 2,
            zMax: 0.003,
          }),
        );
      }
    } else {
      cuerposRevestimiento.push(
        esferoide({
          centro: c.centro,
          semiejes: c.semiejes,
          exponente: 2.8,
          forma: lobulos(),
          detalle: 2,
          yMin: Y_SUPERFICIE,
          ...corte,
        }),
      );
      nucleosSuperficie.push(
        esferoide({
          centro: [c.centro[0] + 0.05, Y_SUPERFICIE + 0.045, c.delante ? -0.03 : c.centro[2]],
          semiejes: [0.16, 0.03, 0.08],
          detalle: 1,
          yMin: Y_SUPERFICIE,
          ...(c.delante ? { zMax: 0.002 } : {}),
        }),
      );
    }
  }
  // Prolongaciones de las células de superficie que bajan a los canalículos que llegan a ella.
  const prolongaciones = enCanaliculo
    .map((p) => p.puntos.at(-1)!)
    .filter((f) => f[1] > 0)
    .map((f) => varilla([f[0], Y_SUPERFICIE + 0.012, 0], [f[0], Y_SUPERFICIE - 0.05, 0], 0.02, 6));
  modelo.add(
    grupo(
      'celulas_revestimiento',
      malla(
        unir([...cuerposRevestimiento, ...prolongaciones]),
        material(COLORES.revestimiento, 'celula', 5),
        'revestimiento',
      ),
      malla(
        unir(cuerposOsteoblastos),
        material(COLORES.osteoblasto, 'celula', 6),
        'osteoblastos_superficie',
      ),
      malla(unir(nucleosSuperficie), material(COLORES.nucleo, 'nucleo', 10), 'nucleos_superficie'),
    ),
  );

  /* Flechas del flujo de líquido: durante una compresión, de la laguna hacia el conducto y la superficie */
  const flechas: BufferGeometry[] = [];
  for (const [a, b] of FLECHAS) {
    const k = (t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Z_FLECHAS];
    flechas.push(varilla(k(0), k(0.76), 0.018, 8), cono(k(0.72), k(1), 0.046, 12));
  }
  modelo.add(
    grupo(
      'flechas_flujo_liquido',
      malla(unir(flechas), material(COLORES.flecha, 'molecula', 1), 'flechas'),
    ),
  );

  /* Mensajeros: PGE2 y óxido nítrico en el líquido de los canalículos y de la laguna */
  const pge2: BufferGeometry[] = [];
  const no: BufferGeometry[] = [];
  const particula = (lista: BufferGeometry[], centro: Vec3, r: number) =>
    lista.push(esferoide({ centro, semiejes: [r, r, r], detalle: 0 }));
  for (const p of [...centrales.slice(0, 5), ...ramasCentrales().slice(0, 2)]) {
    const curva = curvaCanaliculo(p);
    for (let k = 0; k < 4; k++) {
      const o = curva.getPointAt(0.15 + 0.8 * azar());
      const lado = lateral(curva.getTangentAt(0.5)).multiplyScalar((azar() - 0.5) * 0.05);
      particula(pge2, [o.x + lado.x, o.y + lado.y, 0.03 + 0.012 * azar()], 0.017);
    }
    for (let k = 0; k < 3; k++) {
      const o = curva.getPointAt(0.1 + 0.85 * azar());
      const lado = lateral(curva.getTangentAt(0.5)).multiplyScalar((azar() - 0.5) * 0.06);
      particula(no, [o.x + lado.x, o.y + lado.y, 0.034 + 0.01 * azar()], 0.011);
    }
  }
  for (const p of centrales.slice(5, 11)) {
    const curva = curvaCanaliculo(p);
    for (let k = 0; k < 2; k++) {
      const o = curva.getPointAt(0.2 + 0.7 * azar());
      particula(no, [o.x, o.y, 0.036], 0.011);
    }
  }
  // En el hueco de la laguna, junto al cuerpo.
  for (let k = 0; k < 6; k++) {
    const angulo = azar() * Math.PI * 2;
    particula(
      k % 2 === 0 ? pge2 : no,
      [0.62 + 0.08 * Math.cos(angulo), 0.12 + 0.07 * Math.sin(angulo), -0.05 - 0.04 * azar()],
      k % 2 === 0 ? 0.017 : 0.011,
    );
  }
  modelo.add(
    grupo(
      'mensajeros_pge2_no',
      malla(unir(pge2), material(COLORES.pge2, 'molecula', 1), 'pge2'),
      malla(unir(no), material(COLORES.oxidoNitrico, 'molecula', 1), 'oxido_nitrico'),
    ),
  );

  /* Decoración: los cuerpos de los dos osteocitos vecinos */
  modelo.add(
    grupo(
      'osteocitos_vecinos',
      malla(
        unir(
          LAGUNAS_VECINAS.map((l, i) => {
            const lado = i === 0 ? -1 : 1;
            const angulos = i === 0 ? [-6, 70, -80, -120] : [178, 80, 110, -100];
            return esferoide({
              centro: centroVecino(l, lado),
              semiejes: SEMIEJES_VECINO,
              giro: l.giro ?? 0,
              forma: formaEstrellada(
                angulos.map((g) => direccionEnPlano(grados(g), SEMIEJES_VECINO)),
              ),
              detalle: 2,
            });
          }),
        ),
        material(COLORES.vecino, 'celula', 5),
        'osteocitos_vecinos_cuerpos',
      ),
    ),
  );

  return modelo;
}

/** Flechas del flujo (de dónde a dónde), en el plano de las flechas. */
export const FLECHAS: readonly (readonly [Punto2, Punto2])[] = [
  [
    [0.47, -0.2],
    [0.68, -0.6],
  ],
  [
    [-0.42, -0.22],
    [-0.62, -0.6],
  ],
  [
    [0.38, 0.5],
    [0.55, 0.92],
  ],
  [
    [-0.5, 0.52],
    [-0.75, 0.95],
  ],
];

/* ----- Puntos de las etiquetas ----- */

export interface PuntoRegion {
  /** Punto de la etiqueta, en unidades del modelo (antes de normalizar). */
  punto: Vec3;
  /** Normal hacia fuera (la cara de corte mira a +Z). */
  normal: Vec3;
  /** Radio de la zona que encuadra la cámara, en unidades del modelo. */
  radio: number;
}

function sobreProceso(i: number, t: number, alto: number): Vec3 {
  const o = curvaCanaliculo(procesosCentrales()[i]!).getPointAt(t);
  return [o.x, o.y, o.z + alto];
}

/** Punto de la etiqueta de cada región: sobre la pieza, visto de frente. */
export function puntoDeRegion(id: RegionRed): PuntoRegion {
  const frente: Vec3 = [0, 0, 1];
  switch (id) {
    case 'matriz_mineralizada':
      return { punto: [1.55, 0.8, 0.001], normal: frente, radio: 1 };
    case 'laguna_osteocitica':
      return { punto: [0.67, 0.11, -0.17], normal: frente, radio: 0.55 };
    case 'cuerpo_osteocito':
      return { punto: [-0.15, 0.2, 0.17], normal: frente, radio: 0.5 };
    case 'procesos_dendriticos':
      return { punto: sobreProceso(2, 0.55, R_PROCESO), normal: frente, radio: 0.4 };
    case 'canaliculos':
      return { punto: sobreProceso(7, 0.6, R_CANALICULO), normal: frente, radio: 0.3 };
    case 'fibras_de_anclaje':
      return { punto: sobreProceso(9, 0.5, R_CANALICULO * 0.75), normal: frente, radio: 0.15 };
    case 'cilio_primario': {
      const base = enMembrana([1, 0.08, -0.1]).punto;
      return {
        punto: [base[0] + 0.1, base[1] + 0.025, base[2] - 0.01],
        normal: frente,
        radio: 0.2,
      };
    }
    case 'canales_de_membrana': {
      const m = enMembrana([0.3, 0.5, 0.8]);
      return { punto: m.punto, normal: frente, radio: 0.2 };
    }
    case 'capilar_conducto_haversiano':
      return { punto: [-0.1, yCapilar(-0.1), -0.03], normal: frente, radio: 0.6 };
    case 'celulas_revestimiento':
      return { punto: [-0.95, Y_SUPERFICIE + 0.02, 0.001], normal: frente, radio: 0.6 };
    case 'flechas_flujo_liquido': {
      const [a, b] = FLECHAS[0]!;
      return {
        punto: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Z_FLECHAS + 0.018],
        normal: frente,
        radio: 0.45,
      };
    }
    case 'mensajeros_pge2_no':
      return { punto: sobreProceso(1, 0.6, 0.03), normal: frente, radio: 0.35 };
  }
}

export function esRegionRedLacunoCanalicular(id: string): id is RegionRed {
  return (REGIONES_RED as readonly string[]).includes(id);
}
