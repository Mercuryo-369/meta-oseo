/**
 * Hueso entretejido frente a hueso laminar, dos bloques a la misma escala: el modelo `hueso_entretejido_laminar` de
 * la exploración 3D (actividad m1_3_entretejido_laminar, «Entretejido frente a laminar»; hasta 2026-10-18 era un
 * dibujo SVG con una ilustración hecha por IA debajo, que pintaba el hueso laminar como bandas con cavidades).
 *
 * Izquierda, hueso ENTRETEJIDO (inmaduro, de formación rápida: feto, callo de fractura, alvéolo en reparación):
 * haces de colágeno gruesos entrecruzados al azar, que se hunden y vuelven a salir en la matriz, y osteocitos
 * numerosos, grandes, redondeados y sin orden, con pocos canalículos y desordenados. Matriz algo rosada (menos
 * mineralizada y más vascular; el color de la paleta común de las escenas).
 *
 * Derecha, hueso LAMINAR: laminillas paralelas finas, todas de matriz maciza (sin cavidades: los únicos huecos son
 * las lagunas). En cada laminilla las fibras van en una dirección y en la siguiente, en otra (aquí, a 90°: a lo largo
 * del bloque y hacia el fondo), como un contrachapado: en la cara de delante unas laminillas enseñan sus fibras de
 * lado y las otras, cortadas. Las tres de arriba están escalonadas para que se vean las fibras de cuatro laminillas
 * seguidas. Osteocitos menos numerosos, más pequeños y aplanados, alineados ENTRE laminillas y unidos por canalículos
 * que cruzan las laminillas.
 *
 * Cada región es un grupo con el id de su nodo (`content/nodos3d.ts`) y sus propios materiales; `puntoDeRegion` da el
 * punto de su etiqueta, sobre la cara de delante. Los dos bloques van algo girados (se ven de frente, por arriba y
 * por un lado): los puntos y las normales de las etiquetas llevan el mismo giro.
 */
import type { BufferGeometry, Group, Matrix4 } from 'three';
import { CircleGeometry, CylinderGeometry, Euler, Matrix4 as Matriz, SphereGeometry } from 'three';
import type { PuntoRegion, Vec3 } from '../modelosPorCodigo';
import type { Vec2 } from '../piezasPorCodigo';
import {
  aleatorio,
  cara,
  cinta,
  enCara,
  girar,
  instancias,
  malla,
  marcoCara,
  masCercano,
  material,
  mezclar,
  muestras,
  puntoEnCara,
  recortar,
  region,
  tubo,
  unir,
} from '../piezasPorCodigo';

/** Regiones del modelo: los ids de los nodos del catálogo `hueso_entretejido_laminar`. */
export const REGIONES_ENTRETEJIDO_LAMINAR = [
  'fibras_entretejidas',
  'osteocitos_entretejido',
  'laminillas_paralelas',
  'osteocitos_laminares',
] as const;
export type RegionEntretejidoLaminar = (typeof REGIONES_ENTRETEJIDO_LAMINAR)[number];

/* ----- Medidas (unidades del modelo; los dos bloques, iguales) ----- */

export const ANCHO = 1.2;
export const ALTO = 0.9;
export const FONDO = 0.7;
/** Centro en X de cada bloque. */
export const X_ENTRETEJIDO = -0.78;
export const X_LAMINAR = 0.78;
const Y0 = -ALTO / 2;
const Y1 = ALTO / 2;
const Z0 = -FONDO / 2;
export const Z_FRENTE = FONDO / 2;

/** Laminillas del hueso laminar (de abajo arriba) y su grosor. */
export const N_LAMINILLAS = 12;
export const GROSOR_LAMINILLA = ALTO / N_LAMINILLAS;
/** Las tres laminillas de arriba están escalonadas: su borde de delante retrocede este tanto cada una. */
const PELDANO = 0.13;

/** Semiejes de las lagunas: grandes y redondeadas en el entretejido; aplanadas en el laminar. */
export const LAGUNA_ENTRETEJIDO: Vec2 = [0.046, 0.033];
export const LAGUNA_LAMINAR: Vec2 = [0.046, 0.013];

const H_CANALICULO = 0.0012;
const H_LAGUNA = 0.0018;
const ALTO_CELULA = 0.008;
const ANCHO_CANALICULO = 0.0042;

const COLORES = {
  matrizEntretejido: '#e2b4a2',
  haz: '#efd2c2',
  laminillaA: '#ece2cc',
  laminillaB: '#d9c7a4',
  fibraLaminar: '#f2ead8',
  laguna: '#2f231b',
  canaliculo: '#4a3526',
  osteocito: '#8a9ad2',
} as const;

/** Giro de los dos bloques: inclinados hacia la cámara y algo vueltos. */
export const GIRO = new Euler(0.36, -0.26, 0);

/* ----- Caras de los bloques ----- */

function marcoFrente(xc: number): Matrix4 {
  return marcoCara([xc, 0, Z_FRENTE], [1, 0, 0], [0, 1, 0]);
}
function marcoArriba(xc: number, y = Y1): Matrix4 {
  // u = x, v hacia el fondo (−z), normal +Y.
  return marcoCara([xc, y, 0], [1, 0, 0], [0, 0, -1]);
}
function marcoDerecha(xc: number): Matrix4 {
  // u hacia el fondo (−z), v = y, normal +X.
  return marcoCara([xc + ANCHO / 2, 0, 0], [0, 0, -1], [0, 1, 0]);
}

/** Rectángulo de una cara (u, v) centrado en su origen. */
interface Rect {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}
const FRENTE_RECT: Rect = { u0: -ANCHO / 2, u1: ANCHO / 2, v0: Y0, v1: Y1 };
const ARRIBA_RECT: Rect = { u0: -ANCHO / 2, u1: ANCHO / 2, v0: -FONDO / 2, v1: FONDO / 2 };
const DERECHA_RECT: Rect = { u0: -FONDO / 2, u1: FONDO / 2, v0: Y0, v1: Y1 };
const dentro =
  (r: Rect, m: number) =>
  ([u, v]: Vec2): boolean =>
    u > r.u0 + m && u < r.u1 - m && v > r.v0 + m && v < r.v1 - m;

/* ----- Hueso entretejido ----- */

export interface Haz {
  /** Eje del haz en la cara (u, v). */
  eje: Vec2[];
  radio: number;
}

/**
 * Haces de colágeno de una cara del bloque entretejido: gruesos, curvos, en cualquier dirección y tan apretados que
 * forman un fieltro. Rodean las lagunas (los osteocitos quedan entre los haces, no debajo).
 */
export function hacesDeCara(r: Rect, cuantos: number, semilla: number, lagunas: readonly Laguna[] = []): Haz[] {
  const azar = aleatorio(semilla);
  const haces: Haz[] = [];
  for (let i = 0; i < cuantos; i++) {
    const radio = mezclar(0.015, 0.025, azar());
    const c: Vec2 = [mezclar(r.u0, r.u1, azar()), mezclar(r.v0, r.v1, azar())];
    const ang = azar() * Math.PI;
    const largo = mezclar(0.5, 1.1, azar());
    const curva1 = (azar() - 0.5) * 0.5;
    const curva2 = (azar() - 0.5) * 0.5;
    const eje = muestras(-0.5, 0.5, 16).map((t): Vec2 => {
      const a = ang + curva1 * t + curva2 * t * t * 2;
      return [c[0] + Math.cos(a) * largo * t, c[1] + Math.sin(a) * largo * t];
    });
    const libre = (p: Vec2): boolean =>
      dentro(r, radio + 0.008)(p) &&
      lagunas.every(
        (l) =>
          Math.hypot(p[0] - l.centro[0], p[1] - l.centro[1]) >
          LAGUNA_ENTRETEJIDO[0] * Math.max(...l.escala) + radio,
      );
    for (const tramo of recortar(eje, libre)) {
      if (tramo.length >= 4) haces.push({ eje: tramo, radio });
    }
  }
  return haces;
}

/** El haz llevado a 3D sobre su cara: se hunde y vuelve a salir de la matriz (entrecruzado). */
function tuboDeHaz(h: Haz, marco: Matrix4, fase: number): BufferGeometry {
  const puntos = h.eje.map(([u, v], i): Vec3 => {
    const t = i / (h.eje.length - 1);
    const altura = h.radio * (0.1 * Math.sin(t * Math.PI * 3.1 + fase) - 0.05);
    return puntoEnCara(marco, u, v, altura);
  });
  return tubo(puntos, h.radio, 24, 6, 0.1);
}

export interface Laguna {
  centro: Vec2;
  angulo: number;
  escala: Vec2;
}

/**
 * Lagunas de una cara del entretejido: numerosas, grandes, redondeadas, de tamaño desigual y sin orden (ángulo al
 * azar), con pocos canalículos cortos en cualquier dirección.
 */
export function lagunasEntretejido(
  r: Rect,
  cuantas: number,
  semilla: number,
): { lagunas: Laguna[]; canaliculos: Vec2[][] } {
  const azar = aleatorio(semilla);
  const lagunas: Laguna[] = [];
  const canaliculos: Vec2[][] = [];
  const cabe = dentro(r, LAGUNA_ENTRETEJIDO[0] + 0.01);
  for (let intento = 0; lagunas.length < cuantas && intento < 4000; intento++) {
    const c: Vec2 = [mezclar(r.u0, r.u1, azar()), mezclar(r.v0, r.v1, azar())];
    if (!cabe(c) || lagunas.some((l) => Math.hypot(l.centro[0] - c[0], l.centro[1] - c[1]) < 0.12))
      continue;
    const e = mezclar(0.8, 1.25, azar());
    const l: Laguna = { centro: c, angulo: azar() * Math.PI, escala: [e, e * mezclar(0.85, 1.15, azar())] };
    lagunas.push(l);
    const n = 3 + Math.floor(azar() * 3);
    for (let k = 0; k < n; k++) {
      const ang = azar() * Math.PI * 2;
      const inicio: Vec2 = [
        c[0] + Math.cos(ang) * LAGUNA_ENTRETEJIDO[1] * e,
        c[1] + Math.sin(ang) * LAGUNA_ENTRETEJIDO[1] * e,
      ];
      const largo = mezclar(0.03, 0.055, azar());
      const fase = azar() * 6;
      const linea = muestras(0, 1, 4).map((t): Vec2 => [
        inicio[0] + Math.cos(ang) * largo * t - Math.sin(ang) * 0.006 * Math.sin(t * 6 + fase),
        inicio[1] + Math.sin(ang) * largo * t + Math.cos(ang) * 0.006 * Math.sin(t * 6 + fase),
      ]);
      for (const tramo of recortar(linea, dentro(r, 0.006))) canaliculos.push(tramo);
    }
  }
  return { lagunas, canaliculos };
}

/* ----- Hueso laminar ----- */

/** Dirección de las fibras de la laminilla i (de abajo arriba): a lo largo del bloque (X) o hacia el fondo (Z). */
export function fibrasDeLaminilla(i: number): 'x' | 'z' {
  return i % 2 === 0 ? 'x' : 'z';
}

/** Borde de delante de la laminilla i: las tres de arriba, escalonadas. */
export function frenteDeLaminilla(i: number): number {
  const desde = N_LAMINILLAS - 3;
  return i < desde ? Z_FRENTE : Z_FRENTE - PELDANO * (i - desde + 1);
}

/**
 * Lagunas del laminar en la cara de delante: en filas ENTRE laminillas, una fila cada dos límites, aplanadas y con el
 * eje largo a lo largo de las laminillas; filas alternadas al tresbolillo. Canalículos que cruzan las laminillas
 * (arriba y abajo) hacia las lagunas de las filas vecinas, y alguno a lo largo de la fila.
 */
export function lagunasLaminares(): { lagunas: Laguna[]; canaliculos: Vec2[][] } {
  const azar = aleatorio(61);
  const lagunas: Laguna[] = [];
  const canaliculos: Vec2[][] = [];
  // Solo la parte de la cara de delante que no está escalonada.
  const r: Rect = { ...FRENTE_RECT, v1: Y0 + GROSOR_LAMINILLA * (N_LAMINILLAS - 3) };
  const filas = [1, 3, 5, 7].map((i) => Y0 + GROSOR_LAMINILLA * (i + 1));
  filas.forEach((v, fila) => {
    const paso = 0.27;
    for (let u = r.u0 + 0.12 + (fila % 2) * paso * 0.5; u < r.u1 - 0.08; u += paso) {
      const c: Vec2 = [u + (azar() - 0.5) * 0.04, v];
      const e = mezclar(0.9, 1.1, azar());
      lagunas.push({ centro: c, angulo: 0, escala: [e, e] });
      for (const sentido of [1, -1]) {
        for (let k = 0; k < 3; k++) {
          const x0 = c[0] + (k - 1) * 0.025;
          const ang = (sentido * Math.PI) / 2 + (azar() - 0.5) * 0.35;
          const largo = mezclar(0.09, 0.14, azar());
          const linea = muestras(0, 1, 5).map((t): Vec2 => [
            x0 + Math.cos(ang) * largo * t + 0.004 * Math.sin(t * 8 + k),
            c[1] + sentido * LAGUNA_LAMINAR[1] * 0.8 + Math.sin(ang) * largo * t,
          ]);
          for (const tramo of recortar(linea, dentro(r, 0.006))) canaliculos.push(tramo);
        }
      }
      for (const lado of [1, -1]) {
        const linea = muestras(0, 1, 3).map((t): Vec2 => [
          c[0] + lado * (LAGUNA_LAMINAR[0] + 0.035 * t),
          c[1] + 0.004 * Math.sin(t * 5),
        ]);
        canaliculos.push(linea);
      }
    }
  });
  return { lagunas, canaliculos };
}

/** Una cara de una caja con las UV en unidades; `girarUv` pone la V a lo largo de la U de la cara. */
function plano(ancho: number, alto: number, marco: Matrix4, girarUv: boolean): BufferGeometry {
  const g = cara(
    [
      [0, 0],
      [ancho, 0],
      [ancho, alto],
      [0, alto],
    ],
    0,
  );
  if (girarUv) {
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
  }
  return enCara(g, marco);
}

/**
 * Las seis caras de la laminilla i, repartidas en «vetas» (caras que contienen la dirección de sus fibras: se ven de
 * lado, con la V de las UV a lo largo de ellas) y «cortes» (caras perpendiculares a las fibras: se ven sus extremos).
 */
function carasDeLaminilla(i: number): { vetas: BufferGeometry[]; cortes: BufferGeometry[] } {
  const x0 = X_LAMINAR - ANCHO / 2;
  const x1 = X_LAMINAR + ANCHO / 2;
  const y0 = Y0 + GROSOR_LAMINILLA * i;
  const y1 = y0 + GROSOR_LAMINILLA;
  const z1 = frenteDeLaminilla(i);
  const a = x1 - x0;
  const b = y1 - y0;
  const c = z1 - Z0;
  const enX = fibrasDeLaminilla(i) === 'x';
  // Caras normales a Z (delante, detrás): contienen X. Normales a X (derecha, izquierda): contienen Z. Normales a Y
  // (arriba, abajo): contienen las dos.
  const delante = plano(a, b, marcoCara([x0, y0, z1], [1, 0, 0], [0, 1, 0]), true);
  const detras = plano(a, b, marcoCara([x1, y0, Z0], [-1, 0, 0], [0, 1, 0]), true);
  const derecha = plano(c, b, marcoCara([x1, y0, z1], [0, 0, -1], [0, 1, 0]), true);
  const izquierda = plano(c, b, marcoCara([x0, y0, Z0], [0, 0, 1], [0, 1, 0]), true);
  const arriba = plano(a, c, marcoCara([x0, y1, z1], [1, 0, 0], [0, 0, -1]), enX);
  const abajo = plano(a, c, marcoCara([x0, y0, Z0], [1, 0, 0], [0, 0, 1]), enX);
  return enX
    ? { vetas: [delante, detras, arriba, abajo], cortes: [derecha, izquierda] }
    : { vetas: [derecha, izquierda, arriba, abajo], cortes: [delante, detras] };
}

/** Fibras sueltas sobre los peldaños de las laminillas escalonadas: se ve hacia dónde van en cada una. */
function fibrasDePeldanos(): BufferGeometry[] {
  const fibras: BufferGeometry[] = [];
  const r = 0.0055;
  const x0 = X_LAMINAR - ANCHO / 2;
  for (let i = N_LAMINILLAS - 4; i < N_LAMINILLAS; i++) {
    const y = Y0 + GROSOR_LAMINILLA * (i + 1);
    const zDelante = frenteDeLaminilla(i);
    const zDetras = i + 1 < N_LAMINILLAS ? frenteDeLaminilla(i + 1) : Z0;
    if (fibrasDeLaminilla(i) === 'x') {
      for (let z = zDetras + 0.012; z < zDelante - 0.008; z += 0.021) {
        const g = new CylinderGeometry(r, r, ANCHO - 0.02, 6, 1, true);
        g.rotateZ(Math.PI / 2);
        g.translate(X_LAMINAR, y + r * 0.2, z);
        fibras.push(g);
      }
    } else {
      for (let x = x0 + 0.012; x < x0 + ANCHO - 0.008; x += 0.021) {
        const g = new CylinderGeometry(r, r, zDelante - zDetras - 0.01, 6, 1, true);
        g.rotateX(Math.PI / 2);
        g.translate(x, y + r * 0.2, (zDelante + zDetras) / 2);
        fibras.push(g);
      }
    }
  }
  return fibras;
}

/* ----- Modelo ----- */

function matrices(
  lagunas: readonly Laguna[],
  marco: Matrix4,
  semiejes: Vec2,
): { lagunas: Matriz[]; celulas: Matriz[] } {
  const salida = { lagunas: [] as Matriz[], celulas: [] as Matriz[] };
  for (const l of lagunas) {
    const base = marco
      .clone()
      .multiply(new Matriz().makeTranslation(l.centro[0], l.centro[1], H_LAGUNA))
      .multiply(new Matriz().makeRotationZ(l.angulo));
    const a = semiejes[0] * l.escala[0];
    const b = semiejes[1] * l.escala[1];
    salida.lagunas.push(base.clone().multiply(new Matriz().makeScale(a, b, 1)));
    salida.celulas.push(base.clone().multiply(new Matriz().makeScale(a * 0.66, b * 0.6, ALTO_CELULA)));
  }
  return salida;
}

const CARAS_ENTRETEJIDO = [
  { marco: marcoFrente(X_ENTRETEJIDO), rect: FRENTE_RECT, haces: 70, lagunas: 24, semilla: 3 },
  { marco: marcoArriba(X_ENTRETEJIDO), rect: ARRIBA_RECT, haces: 50, lagunas: 16, semilla: 5 },
  { marco: marcoDerecha(X_ENTRETEJIDO), rect: DERECHA_RECT, haces: 36, lagunas: 12, semilla: 7 },
] as const;

/** Construye los dos bloques: un grupo (girado) con un subgrupo por región. */
export function crearEntretejidoLaminar(): Group {
  const modelo = region('hueso_entretejido_laminar');
  const bloques = region('bloques');
  bloques.rotation.copy(GIRO);
  modelo.add(bloques);
  const disco = (): BufferGeometry => new CircleGeometry(1, 16);
  const cupula = (): BufferGeometry => {
    const g = new SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    g.rotateX(Math.PI / 2);
    return g;
  };

  // Hueso entretejido: la matriz y los haces de colágeno entrecruzados al azar en sus tres caras visibles.
  const x0 = X_ENTRETEJIDO - ANCHO / 2;
  const matriz = unir(carasCaja([x0, Y0, Z0], [x0 + ANCHO, Y1, Z_FRENTE]));
  const delEntretejido = CARAS_ENTRETEJIDO.map((c) => ({
    ...lagunasEntretejido(c.rect, c.lagunas, c.semilla * 11),
    marco: c.marco,
  }));
  const haces = CARAS_ENTRETEJIDO.flatMap((c, k) =>
    hacesDeCara(c.rect, c.haces, c.semilla, delEntretejido[k]!.lagunas).map((h, i) =>
      tuboDeHaz(h, c.marco, i * 1.7),
    ),
  );
  bloques.add(
    region(
      'fibras_entretejidas',
      malla(matriz, material(COLORES.matrizEntretejido, 'hueso_inmaduro', 5), 'matriz_entretejido'),
      malla(unir(haces), material(COLORES.haz, 'fibra', [40, 6]), 'haces_colageno'),
    ),
  );

  const mEntretejido = delEntretejido.map((c) => matrices(c.lagunas, c.marco, LAGUNA_ENTRETEJIDO));
  bloques.add(
    region(
      'osteocitos_entretejido',
      instancias(
        disco(),
        material(COLORES.laguna, 'cavidad'),
        mEntretejido.flatMap((m) => m.lagunas),
        'lagunas_entretejido',
      ),
      instancias(
        cupula(),
        material(COLORES.osteocito, 'celula', 30),
        mEntretejido.flatMap((m) => m.celulas),
        'osteocitos_entretejido',
      ),
      malla(
        unir(
          delEntretejido.flatMap((c) =>
            c.canaliculos.map((l) => enCara(cinta(l, ANCHO_CANALICULO, H_CANALICULO), c.marco)),
          ),
        ),
        material(COLORES.canaliculo, 'cavidad'),
        'canaliculos_entretejido',
      ),
    ),
  );

  // Hueso laminar: laminillas macizas apiladas; las fibras cambian de dirección de una a la siguiente.
  const vetasA: BufferGeometry[] = [];
  const cortesA: BufferGeometry[] = [];
  const vetasB: BufferGeometry[] = [];
  const cortesB: BufferGeometry[] = [];
  for (let i = 0; i < N_LAMINILLAS; i++) {
    const { vetas, cortes } = carasDeLaminilla(i);
    if (fibrasDeLaminilla(i) === 'x') {
      vetasA.push(...vetas);
      cortesA.push(...cortes);
    } else {
      vetasB.push(...vetas);
      cortesB.push(...cortes);
    }
  }
  bloques.add(
    region(
      'laminillas_paralelas',
      malla(unir(vetasA), material(COLORES.laminillaA, 'fibra', [60, 6]), 'laminillas_a_vetas'),
      malla(unir(cortesA), material(COLORES.laminillaA, 'hueso', 30), 'laminillas_a_cortes'),
      malla(unir(vetasB), material(COLORES.laminillaB, 'fibra', [60, 6]), 'laminillas_b_vetas'),
      malla(unir(cortesB), material(COLORES.laminillaB, 'hueso', 30), 'laminillas_b_cortes'),
      malla(unir(fibrasDePeldanos()), material(COLORES.fibraLaminar, 'fibra', [1, 8]), 'fibras_peldanos'),
    ),
  );

  const laminar = lagunasLaminares();
  const mLaminar = matrices(laminar.lagunas, marcoFrente(X_LAMINAR), LAGUNA_LAMINAR);
  // Algunas lagunas en la cara de la derecha (alargadas hacia el fondo) y sobre los peldaños, entre laminillas.
  const azar = aleatorio(67);
  const deLado: Laguna[] = [];
  for (const i of [1, 3, 5, 7]) {
    for (let u = -FONDO / 2 + 0.1 + azar() * 0.1; u < FONDO / 2 - 0.08; u += 0.24) {
      deLado.push({ centro: [u, Y0 + GROSOR_LAMINILLA * (i + 1)], angulo: 0, escala: [1, 1] });
    }
  }
  const mLado = matrices(deLado, marcoDerecha(X_LAMINAR), LAGUNA_LAMINAR);
  // Sobre cada peldaño (el límite entre dos laminillas) se ven las lagunas de plano, alargadas como sus fibras.
  const mPeldanos = [N_LAMINILLAS - 4, N_LAMINILLAS - 3, N_LAMINILLAS - 2].map((i) => {
    const zm = (frenteDeLaminilla(i) + frenteDeLaminilla(i + 1)) / 2;
    const ls: Laguna[] = [-0.3, 0.15].map((dx) => ({
      centro: [dx + i * 0.05, -zm],
      angulo: fibrasDeLaminilla(i) === 'x' ? 0 : Math.PI / 2,
      escala: [1, 2.2],
    }));
    return matrices(ls, marcoArriba(X_LAMINAR, Y0 + GROSOR_LAMINILLA * (i + 1)), LAGUNA_LAMINAR);
  });
  bloques.add(
    region(
      'osteocitos_laminares',
      instancias(
        disco(),
        material(COLORES.laguna, 'cavidad'),
        [...mLaminar.lagunas, ...mLado.lagunas, ...mPeldanos.flatMap((m) => m.lagunas)],
        'lagunas_laminares',
      ),
      instancias(
        cupula(),
        material(COLORES.osteocito, 'celula', 30),
        [...mLaminar.celulas, ...mLado.celulas, ...mPeldanos.flatMap((m) => m.celulas)],
        'osteocitos_laminares',
      ),
      malla(
        unir(laminar.canaliculos.map((l) => enCara(cinta(l, ANCHO_CANALICULO, H_CANALICULO), marcoFrente(X_LAMINAR)))),
        material(COLORES.canaliculo, 'cavidad'),
        'canaliculos_laminares',
      ),
    ),
  );

  return modelo;
}

/** Las seis caras de una caja, con las UV en unidades. */
function carasCaja(desde: Vec3, hasta: Vec3): BufferGeometry[] {
  const [x0, y0, z0] = desde;
  const [x1, y1, z1] = hasta;
  return [
    plano(x1 - x0, y1 - y0, marcoCara([x0, y0, z1], [1, 0, 0], [0, 1, 0]), false),
    plano(x1 - x0, y1 - y0, marcoCara([x1, y0, z0], [-1, 0, 0], [0, 1, 0]), false),
    plano(z1 - z0, y1 - y0, marcoCara([x1, y0, z1], [0, 0, -1], [0, 1, 0]), false),
    plano(z1 - z0, y1 - y0, marcoCara([x0, y0, z0], [0, 0, 1], [0, 1, 0]), false),
    plano(x1 - x0, z1 - z0, marcoCara([x0, y1, z1], [1, 0, 0], [0, 0, -1]), false),
    plano(x1 - x0, z1 - z0, marcoCara([x0, y0, z0], [1, 0, 0], [0, 0, 1]), false),
  ];
}

/* ----- Puntos de las etiquetas ----- */

const FRENTE: Vec3 = [0, 0, 1];

function girado(punto: Vec3, radio: number): PuntoRegion {
  return { punto: girar(punto, GIRO), normal: girar(FRENTE, GIRO), radio };
}

/** Punto de la etiqueta de cada región, sobre la cara de delante de su bloque. */
export function puntoDeRegion(id: RegionEntretejidoLaminar): PuntoRegion {
  switch (id) {
    case 'fibras_entretejidas': {
      const c = CARAS_ENTRETEJIDO[0];
      const { lagunas } = lagunasEntretejido(c.rect, c.lagunas, c.semilla * 11);
      const h = masCercano(
        hacesDeCara(c.rect, c.haces, c.semilla, lagunas).flatMap((x) =>
          x.eje.map((p) => ({ p, r: x.radio })),
        ),
        (x) => x.p,
        [-0.2, 0.15],
      );
      return girado([X_ENTRETEJIDO + h.p[0], h.p[1], Z_FRENTE + h.r * 0.9], 0.5);
    }
    case 'osteocitos_entretejido': {
      const { lagunas } = lagunasEntretejido(
        FRENTE_RECT,
        CARAS_ENTRETEJIDO[0].lagunas,
        CARAS_ENTRETEJIDO[0].semilla * 11,
      );
      const l = masCercano(lagunas, (x) => x.centro, [0.25, -0.2]);
      return girado([X_ENTRETEJIDO + l.centro[0], l.centro[1], Z_FRENTE + H_LAGUNA + ALTO_CELULA], 0.25);
    }
    case 'laminillas_paralelas': {
      const v = Y0 + GROSOR_LAMINILLA * 4.5;
      return girado([X_LAMINAR - 0.2, v, Z_FRENTE + 0.0005], 0.5);
    }
    case 'osteocitos_laminares': {
      const l = masCercano(lagunasLaminares().lagunas, (x) => x.centro, [0.3, -0.2]);
      return girado([X_LAMINAR + l.centro[0], l.centro[1], Z_FRENTE + H_LAGUNA + ALTO_CELULA], 0.25);
    }
  }
}

export function esRegionEntretejidoLaminar(id: string): id is RegionEntretejidoLaminar {
  return (REGIONES_ENTRETEJIDO_LAMINAR as readonly string[]).includes(id);
}
