/**
 * Raíz de un diente en su alvéolo, en corte longitudinal: el modelo `ligamento_periodontal` de la exploración 3D
 * (actividad m2_multicapa_ligamento_periodontal, «Identifica las partes del ligamento periodontal»; hasta 2026-10-18
 * era un dibujo SVG con una ilustración hecha con IA debajo, que dibujaba una raíz irreal y células como anillos).
 *
 * Es un bloque de hueso alveolar serrado por el eje de una raíz única. La cara de corte, plana (z = 0), mira a la
 * cámara (+Z): la raíz cónica (dentina, conducto pulpar central y estrecho, capa fina de cemento, más gruesa hacia el
 * ápice), el ligamento periodontal con sus haces de colágeno, sus vasos y sus células, el hueso alveolar propio
 * (lámina cribiforme, perforada por conductos vasculares) y, por fuera, el hueso esponjoso y las corticales. Por
 * detrás el bloque es macizo; arriba asoma la raíz, cortada por debajo del cuello (la corona no se muestra).
 *
 * Una fuerza lateral (flecha roja) empuja la raíz hacia la derecha: el ligamento queda ancho y estirado a la
 * izquierda (lado de tensión: haces rectos y tensos, osteoblastos sobre una capa de osteoide) y estrecho y
 * comprimido a la derecha (lado de presión: haces ondulados, osteoclastos multinucleados en lagunas de Howship).
 *
 * Escala: la raíz mide 13 mm y tiene las proporciones de una raíz real (unidades del modelo = mm). El ligamento real
 * mide 0,15 a 0,38 mm; aquí mide 0,85 mm en reposo (0,4 mm en el lado de presión y 1,3 mm en el de tensión), y las
 * células están ampliadas unas diez veces para que se vean: FUERA DE ESCALA, y así lo dice el texto alternativo.
 *
 * Cada región de la actividad es un grupo con el id de su nodo del catálogo (`content/nodos3d.ts`), con sus propios
 * materiales para poder resaltarla sola. `puntoDeRegion` da el punto de su etiqueta y el tamaño de la zona que la
 * cámara encuadra. Lo que no es una región (dentina, pulpa, hueso esponjoso, corticales, la flecha de la fuerza) va
 * en el grupo `contexto`. La disposición (dónde va cada haz y cada célula) es una función pura y determinista
 * (`disposicion`), que también usan las pruebas.
 */
import type { BufferGeometry, Material, MeshPhysicalMaterial } from 'three';
import {
  BufferAttribute,
  BufferGeometry as Geometria,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  FrontSide,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  Quaternion,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TubeGeometry,
  UnsignedByteType,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PuntoRegion, Vec3 } from '../modelosPorCodigo';
import { NATURAL as PALETA_ALVEOLAR } from '../procedural/alveolar/paleta';
import type { TipoTejido } from '../procedural/realismo';
import { materialOrganico, texturaRelieve } from '../procedural/realismo';

/** Regiones del modelo: los ids de los nodos del catálogo `ligamento_periodontal`. */
export const REGIONES_LIGAMENTO = [
  'cemento_radicular',
  'ligamento_periodontal',
  'fibras_sharpey',
  'hueso_alveolar_propio',
  'fibroblastos_periodontales',
  'celulas_progenitoras_perivasculares',
  'cementoblastos',
  'osteoblastos_alveolares',
  'osteoclastos_alveolares',
  'restos_epiteliales_malassez',
  'lado_presion',
  'lado_tension',
] as const;
export type RegionLigamento = (typeof REGIONES_LIGAMENTO)[number];

/** −1: izquierda, el lado de tensión; +1: derecha, el lado de presión (la fuerza empuja la raíz hacia +X). */
export type Lado = -1 | 1;
export const LADO_TENSION: Lado = -1;
export const LADO_PRESION: Lado = 1;

/* ----- Medidas (mm) ----- */

/** Del ápice (y = 0) al cuello de la raíz, que queda por encima del modelo. */
export const LARGO_RAIZ = 13;
/** Semiancho de la raíz en el cuello (unos 5,8 mm de ancho). */
export const R_CUELLO = 2.9;
/** Cresta alveolar: el borde de arriba del hueso y del ligamento. */
export const Y_CRESTA = 10.8;
/** Corte de la raíz por encima de la cresta (la raíz sigue hacia la corona, que no se muestra). */
export const Y_CORTE = 12.2;
/** Borde de abajo del bloque (un corte a través del hueso esponjoso). */
export const Y_BASE = -2.2;
/** Ancho del ligamento con la raíz en reposo (fuera de escala: el real mide 0,15 a 0,38 mm). */
export const ANCHO_LPD = 0.85;
/** Desplazamiento de la raíz por la fuerza lateral, hacia +X. */
export const DESPLAZAMIENTO = 0.45;
/** Grosor del hueso alveolar propio (lámina cribiforme). */
export const GROSOR_LAMINA = 0.35;
/** Profundidad del bloque, hacia −Z. */
const PROFUNDIDAD = 5;
/** Semiancho del bloque abajo y en la cresta. */
const X_BLOQUE = 6.6;
const X_BLOQUE_CRESTA = 4.47;
const GROSOR_OSTEOIDE = 0.05;

/** Lagunas de Howship del lado de presión (altura del centro), con su profundidad y su semialtura. */
export const LAGUNAS_HOWSHIP = [5.5, 6.7, 7.9] as const;
const PROFUNDIDAD_LAGUNA = 0.2;
const MEDIA_LAGUNA = 0.3;

/** Capas de la cara de corte, un poco por delante unas de otras (sin parpadeo entre planos iguales). */
const E = 0.012;
const Z_CORTICAL = 0;
const Z_ESPONJOSO = E;
const Z_LAMINA = 2 * E;
const Z_PERFORACION = 3 * E;
/** Superficie del ligamento: las células se apoyan en ella. */
export const Z_LIGAMENTO = 4 * E;
const Z_OSTEOIDE = 4.5 * E;
const Z_CEMENTO = 5 * E;
const Z_DENTINA = 6 * E;
const Z_PULPA = 7 * E;
const Z_FIBRA = Z_LIGAMENTO + 0.02;
const Z_VASO = Z_LIGAMENTO + 0.035;
/** Las flechas de los lados flotan por delante del tejido. */
const Z_MARCA = 0.32;

/** Colores naturales: la paleta común de las escenas dentales (`procedural/alveolar/paleta.ts`) y de las células. */
const COLORES = {
  superficie: PALETA_ALVEOLAR.cortical,
  cortical: PALETA_ALVEOLAR.corteCortical,
  trabecula: PALETA_ALVEOLAR.trabecula,
  medula: PALETA_ALVEOLAR.medula,
  lamina: PALETA_ALVEOLAR.laminaCribiforme,
  perforacion: PALETA_ALVEOLAR.perforacion,
  ligamento: PALETA_ALVEOLAR.ligamento,
  fibra: PALETA_ALVEOLAR.fibra,
  sharpey: '#b98a74',
  vaso: PALETA_ALVEOLAR.arteria,
  dentina: PALETA_ALVEOLAR.dentina,
  cemento: PALETA_ALVEOLAR.cemento,
  pulpa: PALETA_ALVEOLAR.pulpa,
  osteoide: '#eed4c9',
  osteoblasto: '#8d86c6',
  osteoclasto: '#b893cf',
  cementoblasto: '#a394c9',
  fibroblasto: '#ebc6b8',
  progenitora: '#efe2d8',
  epitelio: '#e8c9a6',
  nucleo: '#4b408f',
  nucleoEpitelio: '#3d3373',
  marca: '#2f3e57',
  fuerza: '#b8433a',
} as const;

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
const suave = (t: number): number => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};
const mezclar = (a: number, b: number, k: number): number => a + (b - a) * k;

/* ----- Perfiles ----- */

/** Semiancho de la raíz a la altura `y` (0 en el ápice): cónica, algo convexa y con la punta redondeada. */
export function radioRaiz(y: number): number {
  if (y <= 0) return 0;
  const t = clamp01(y / LARGO_RAIZ);
  return R_CUELLO * (1 - (1 - t) ** 1.3) ** 0.6;
}

/** Grosor del cemento: fino en el cuello (0,08 mm) y más grueso en el ápice (0,23 mm), como el real. */
export function grosorCemento(y: number): number {
  const t = clamp01(y / LARGO_RAIZ);
  return 0.08 + 0.15 * (1 - t) ** 1.5;
}

/** Semiancho del conducto pulpar: estrecho y central, se afina hasta el foramen apical (unos 0,15 mm). */
export function radioConducto(y: number): number {
  const t = clamp01(y / LARGO_RAIZ);
  return 0.07 + 0.38 * t ** 0.8;
}

/**
 * Semiancho, a la altura `y`, de la raíz en reposo engrosada `d` en todas direcciones (la envolvente de los círculos
 * de radio `d` centrados en su contorno): una banda de ancho constante medido en perpendicular, que bajo el ápice
 * se cierra en un fondo redondeado sin escalones.
 */
function envolvente(y: number, d: number): number {
  const y0 = Math.max(0, y - d);
  const y1 = y + d;
  if (y1 < 0) return 0;
  let m = 0;
  for (let k = 0; k <= 80; k++) {
    const yy = y0 + ((y1 - y0) * k) / 80;
    const q = d * d - (y - yy) ** 2;
    if (q >= 0) m = Math.max(m, radioRaiz(yy) + Math.sqrt(q));
  }
  return m;
}

const PASO_TABLA = 0.005;
const tablas = new Map<number, { desde: number; valores: Float64Array }>();

/** `envolvente` tabulada (se calcula una vez por grosor e interpola). */
function envolventeTabulada(y: number, d: number): number {
  let t = tablas.get(d);
  if (!t) {
    const desde = -d;
    const n = Math.ceil((Y_CORTE + 1 - desde) / PASO_TABLA) + 1;
    const valores = new Float64Array(n);
    for (let i = 0; i < n; i++) valores[i] = envolvente(desde + i * PASO_TABLA, d);
    t = { desde, valores };
    tablas.set(d, t);
  }
  const u = (y - t.desde) / PASO_TABLA;
  if (u <= 0) return 0;
  const i = Math.min(Math.floor(u), t.valores.length - 2);
  const k = Math.min(1, u - i);
  return mezclar(t.valores[i]!, t.valores[i + 1]!, k);
}

/** Semiancho del alvéolo: la raíz en reposo rodeada por el ligamento, que la envuelve también bajo el ápice. */
export function radioAlveolo(y: number): number {
  return envolventeTabulada(y, ANCHO_LPD);
}

/** Semiancho del borde exterior del hueso alveolar propio (la lámina tiene grosor constante). */
export function radioLamina(y: number): number {
  return envolventeTabulada(y, ANCHO_LPD + GROSOR_LAMINA);
}

/** Cuánto se hunden las lagunas de Howship en el hueso a la altura `y` (solo en el lado de presión). */
export function profundidadLagunas(y: number): number {
  let p = 0;
  for (const yk of LAGUNAS_HOWSHIP) {
    const e = (y - yk) / MEDIA_LAGUNA;
    if (Math.abs(e) < 1) p += PROFUNDIDAD_LAGUNA * Math.sqrt(1 - e * e);
  }
  return p;
}

/** X de la pared del alvéolo (la superficie del hueso) en un lado; en el de presión, con las lagunas. */
export function paredAlveolo(lado: Lado, y: number): number {
  return lado === 1 ? radioAlveolo(y) + profundidadLagunas(y) : -radioAlveolo(y);
}

/** X de la superficie de la raíz (por fuera del cemento) en un lado, ya desplazada por la fuerza. */
export function superficieRaiz(lado: Lado, y: number): number {
  return DESPLAZAMIENTO + lado * radioRaiz(y);
}

/** Ancho horizontal del ligamento en un lado: ancho en el de tensión y estrecho en el de presión. */
export function anchoLigamento(lado: Lado, y: number): number {
  return lado * (paredAlveolo(lado, y) - superficieRaiz(lado, y));
}

/** Semiancho exterior del bloque: la apófisis alveolar se estrecha hacia la cresta. */
export function radioExterior(y: number): number {
  return mezclar(X_BLOQUE, X_BLOQUE_CRESTA, suave((y - 4) / (Y_CRESTA - 4)));
}

/** Grosor de las corticales vestibular y lingual: más finas hacia la cresta. */
function grosorCortical(y: number): number {
  return mezclar(1.2, 0.55, suave((y - Y_BASE) / (Y_CRESTA - Y_BASE)));
}

/** ¿El punto (x, y) de la cara de corte está dentro de la raíz? */
export function dentroDeLaRaiz(x: number, y: number): boolean {
  return y >= 0 && y <= Y_CORTE && Math.abs(x - DESPLAZAMIENTO) < radioRaiz(y);
}

/** ¿El punto está dentro del alvéolo (raíz o ligamento), por debajo de la cresta? */
export function dentroDelAlveolo(x: number, y: number): boolean {
  if (y > Y_CRESTA || y < -ANCHO_LPD) return false;
  return x > paredAlveolo(-1, y) && x < paredAlveolo(1, y);
}

/** ¿El punto está en el ligamento (entre la raíz y el hueso)? */
export function enLigamento(x: number, y: number): boolean {
  return dentroDelAlveolo(x, y) && !dentroDeLaRaiz(x, y);
}

/** Pendiente del semiancho de la raíz (diferencia centrada). */
function pendienteRaiz(y: number): number {
  const h = 0.01;
  return (radioRaiz(y + h) - radioRaiz(Math.max(0, y - h))) / (y + h - Math.max(0, y - h));
}

/** Normal hacia fuera de la superficie de la raíz en un lado (apunta algo hacia el ápice: la raíz se afina). */
function normalRaiz(lado: Lado, y: number): Vector2 {
  return new Vector2(lado, -pendienteRaiz(y)).normalize();
}

/* ----- Disposición: haces, vasos y células (datos puros) ----- */

type P2 = [number, number];

export interface Haz {
  lado: Lado;
  /** Inserción en el cemento y en el hueso. */
  raiz: P2;
  hueso: P2;
  /** Recorrido por el ligamento (ondulado en el lado de presión, recto en el de tensión). */
  recorrido: P2[];
  /** Amplitud de la ondulación (0: haz tenso). */
  onda: number;
  /** Fibras de Sharpey: el tramo incluido en el cemento y el incluido en el hueso alveolar propio. */
  sharpeyCemento: [P2, P2];
  sharpeyHueso: [P2, P2];
}

export interface Celula {
  centro: P2;
  /** Ángulo del eje largo en el plano de corte. */
  angulo: number;
  /** Semiejes: a lo largo, a lo ancho y alto (hacia +Z). */
  ejes: Vec3;
}

export interface Vaso {
  lado: Lado;
  puntos: P2[];
  radio: number;
}

export interface Disposicion {
  haces: Haz[];
  vasos: Vaso[];
  /** Conductos vasculares que cruzan la lámina (centro en la pared y lado). */
  perforaciones: { lado: Lado; y: number }[];
  fibroblastos: (Celula & { lado: Lado })[];
  progenitoras: (Celula & { lado: Lado })[];
  cementoblastos: (Celula & { lado: Lado })[];
  osteoblastos: Celula[];
  osteoclastos: (Celula & { nucleos: P2[] })[];
  /** Nidos de restos epiteliales de Malassez: su centro y sus células. */
  nidos: { lado: Lado; centro: P2; celulas: Celula[] }[];
  /** Flechas de los lados: [desde, hasta] en el plano. */
  marcaTension: [P2, P2][];
  marcaPresion: [P2, P2][];
}

const ALTURA_MARCA_TENSION = 6.5;
const ALTURA_MARCA_PRESION = 4.7;
const PERFORACIONES: readonly { lado: Lado; y: number }[] = [
  { lado: -1, y: 3.2 },
  { lado: -1, y: 7.6 },
  { lado: 1, y: 3.0 },
];

const v2 = (p: P2): Vector2 => new Vector2(p[0], p[1]);
const aP2 = (v: Vector2): P2 => [v.x, v.y];

/** Haz con inserciones `raiz` y `hueso`: su recorrido por el ligamento y sus extremos incluidos (Sharpey). */
function haz(
  lado: Lado,
  raiz: Vector2,
  hueso: Vector2,
  normal: Vector2,
  yRaiz: number,
  onda: number,
): Haz {
  const d = hueso.clone().sub(raiz).normalize();
  const perp = new Vector2(-d.y, d.x);
  const n = 16;
  const recorrido: P2[] = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    // Tres ondas: el seno se anula en los dos extremos, y la primera y la última se apartan de la raíz y del hueso.
    const p = raiz
      .clone()
      .lerp(hueso, u)
      .addScaledVector(perp, -onda * Math.sin(2 * Math.PI * 3 * u));
    recorrido.push(aP2(p));
  }
  // Los extremos entran en el tejido mineralizado: más de la mitad del grosor del cemento y 0,22 mm en el hueso.
  const penetracionCemento = Math.min(
    0.3,
    (0.6 * grosorCemento(yRaiz)) / Math.max(0.5, d.dot(normal)),
  );
  return {
    lado,
    raiz: aP2(raiz),
    hueso: aP2(hueso),
    recorrido,
    onda,
    sharpeyCemento: [aP2(raiz), aP2(raiz.clone().addScaledVector(d, -penetracionCemento))],
    sharpeyHueso: [aP2(hueso), aP2(hueso.clone().addScaledVector(d, 0.22))],
  };
}

/** Avanza desde `p` en la dirección `d` hasta salir del alvéolo: el punto de la pared del hueso. */
function hastaLaPared(p: Vector2, d: Vector2): Vector2 {
  const q = p.clone();
  for (let i = 0; i < 400 && dentroDelAlveolo(q.x, q.y); i++) q.addScaledVector(d, 0.005);
  return q;
}

/** Puntos de una curva x = f(y) entre y0 e y1, cada `paso` de longitud, con su tangente (en el sentido de y0 a y1). */
function porLongitud(
  f: (y: number) => number,
  y0: number,
  y1: number,
  paso: number,
): { p: Vector2; t: Vector2 }[] {
  const n = Math.ceil(Math.abs(y1 - y0) / 0.005);
  const salida: { p: Vector2; t: Vector2 }[] = [];
  let acumulado = paso / 2;
  let anterior = new Vector2(f(y0), y0);
  for (let i = 1; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    const actual = new Vector2(f(y), y);
    const tramo = actual.distanceTo(anterior);
    acumulado += tramo;
    if (acumulado >= paso) {
      acumulado -= paso;
      salida.push({ p: actual.clone(), t: actual.clone().sub(anterior).normalize() });
    }
    anterior = actual;
  }
  return salida;
}

function distanciaAPolilinea(p: Vector2, puntos: readonly P2[]): number {
  let minimo = Infinity;
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = v2(puntos[i]!);
    const b = v2(puntos[i + 1]!);
    const ab = b.clone().sub(a);
    const k = clamp01(p.clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq()));
    minimo = Math.min(minimo, p.distanceTo(a.addScaledVector(ab, k)));
  }
  return minimo;
}

function construirDisposicion(): Disposicion {
  /* Haces principales. Laterales: oblicuos (la inserción en el hueso queda más arriba que la del cemento) y, junto
   * a la cresta, horizontales. En el lado de presión no hay inserciones donde el hueso se está reabsorbiendo. */
  const laterales: Haz[] = [];
  for (const lado of [LADO_TENSION, LADO_PRESION]) {
    for (let k = 0, yc = 1.2; yc <= 10.46; k++, yc = 1.2 + 0.3 * k) {
      const subida = lado === LADO_TENSION ? (yc <= 9.3 ? 1.1 : 0.08) : yc <= 9.3 ? 0.34 : 0.05;
      const yb = Math.min(yc + subida, Y_CRESTA - 0.12);
      // Donde el hueso se está reabsorbiendo (una laguna), el haz ha perdido su inserción.
      if (
        lado === LADO_PRESION &&
        LAGUNAS_HOWSHIP.some((yk) => Math.abs(yb - yk) < MEDIA_LAGUNA + 0.06)
      ) {
        continue;
      }
      const raiz = new Vector2(superficieRaiz(lado, yc), yc);
      const hueso = new Vector2(paredAlveolo(lado, yb), yb);
      laterales.push(
        haz(lado, raiz, hueso, normalRaiz(lado, yc), yc, lado === LADO_PRESION ? 0.026 : 0),
      );
    }
  }
  /* Haces apicales: salen en abanico del ápice hacia el fondo del alvéolo. */
  const apicales: Haz[] = [];
  const puntosApice: { lado: Lado; y: number }[] = [
    { lado: -1, y: 0.6 },
    { lado: -1, y: 0.2 },
    { lado: 1, y: 0 },
    { lado: 1, y: 0.2 },
    { lado: 1, y: 0.6 },
  ];
  for (const { lado, y } of puntosApice) {
    const raiz = new Vector2(y === 0 ? DESPLAZAMIENTO : superficieRaiz(lado, y), y);
    const normal = y === 0 ? new Vector2(0, -1) : normalRaiz(lado, y);
    const hueso = hastaLaPared(raiz.clone().addScaledVector(normal, 0.01), normal);
    apicales.push(
      haz(lado, raiz, hueso, normal, y, lado === LADO_PRESION && y > 0 ? 0.035 : 0.015),
    );
  }
  const haces = [...apicales, ...laterales];

  /* Vasos: junto al hueso, a lo largo de la raíz; una rama entra en cada conducto vascular de la lámina. */
  const vasoLongitudinal = (
    lado: Lado,
    separacion: number,
    y0: number,
    y1: number,
    radio: number,
  ): Vaso => {
    const puntos: P2[] = [];
    for (let y = y0, k = 0; y <= y1 + 1e-9; y += 0.6, k++) {
      puntos.push([paredAlveolo(lado, y) - lado * (separacion + 0.03 * Math.sin(k * 1.7)), y]);
    }
    return { lado, puntos, radio };
  };
  const vasoA = vasoLongitudinal(-1, 0.32, 1.3, 10.3, 0.045);
  const vasoB = vasoLongitudinal(-1, 0.8, 2.5, 9.7, 0.04);
  const vasoC = vasoLongitudinal(1, 0.1, 1.2, 4.8, 0.036);
  const ramas: Vaso[] = PERFORACIONES.map(({ lado, y }) => {
    const pared = paredAlveolo(lado, y);
    const separacion = lado === -1 ? 0.32 : 0.1;
    return {
      lado,
      radio: 0.032,
      puntos: [
        [pared - lado * separacion, y + 0.3],
        [pared - lado * 0.05, y + 0.06],
        [pared + lado * (GROSOR_LAMINA * 0.5), y - 0.02],
        [pared + lado * (GROSOR_LAMINA + 0.08), y - 0.1],
        [pared + lado * (GROSOR_LAMINA + 0.5), y - 0.3],
      ],
    };
  });
  const vasos = [vasoA, vasoB, vasoC, ...ramas];
  const vasosLigamento = [vasoA, vasoB, vasoC];

  /* Células progenitoras perivasculares: pegadas a los vasos, alargadas a lo largo de ellos. */
  const progenitoras: (Celula & { lado: Lado })[] = [];
  /** X del vaso a la altura `y` (interpolada entre sus puntos). */
  const xDelVaso = (vaso: Vaso, y: number): number => {
    const ps = vaso.puntos;
    for (let i = 0; i < ps.length - 1; i++) {
      const [xa, ya] = ps[i]!;
      const [xb, yb] = ps[i + 1]!;
      if (y >= ya && y <= yb) return mezclar(xa, xb, (y - ya) / (yb - ya));
    }
    return ps[0]![0];
  };
  const junto = (vaso: Vaso, ys: number[], haciaRaiz: boolean): void => {
    for (const y of ys) {
      const lateral = (haciaRaiz ? -vaso.lado : vaso.lado) * (vaso.radio + 0.05);
      progenitoras.push({
        lado: vaso.lado,
        centro: [xDelVaso(vaso, y) + lateral, y],
        angulo: Math.PI / 2,
        ejes: [0.08, 0.045, 0.05],
      });
    }
  };
  junto(vasoA, [2.0, 3.7, 5.4, 7.0, 8.7, 10.0], true);
  junto(vasoB, [3.1, 5.0, 7.7, 9.3], false);
  junto(vasoC, [2.0, 4.2], true);

  /* Restos epiteliales de Malassez: nidos de seis células entre dos haces, cerca del cemento. */
  const nidos: Disposicion['nidos'] = [];
  const delLado = (lado: Lado): Haz[] =>
    laterales.filter((h) => h.lado === lado).sort((a, b) => a.raiz[1] - b.raiz[1]);
  const entreHaces = (a: Haz, b: Haz, distancia: number): { p: Vector2; d: Vector2 } => {
    const da = v2(a.hueso).sub(v2(a.raiz));
    const db = v2(b.hueso).sub(v2(b.raiz));
    const pa = v2(a.raiz).addScaledVector(da.clone().normalize(), distancia);
    const pb = v2(b.raiz).addScaledVector(db.clone().normalize(), distancia);
    return { p: pa.add(pb).multiplyScalar(0.5), d: da.add(db).normalize() };
  };
  const nido = (lado: Lado, a: Haz, b: Haz): void => {
    const { p } = entreHaces(a, b, 0.17);
    // La superficie de la raíz sube abriéndose hacia fuera: x = DESPLAZAMIENTO + lado · radioRaiz(y).
    const tangente = new Vector2(lado * pendienteRaiz(p.y), 1).normalize();
    const travesia = new Vector2(tangente.y, -tangente.x);
    const angulo = Math.atan2(tangente.y, tangente.x);
    const celulas: Celula[] = [];
    for (const a2 of [-0.075, 0, 0.075]) {
      for (const b2 of [-0.036, 0.036]) {
        const c = p.clone().addScaledVector(tangente, a2).addScaledVector(travesia, b2);
        // Células que se tocan: el nido se ve como un cúmulo compacto, no como células sueltas.
        celulas.push({ centro: aP2(c), angulo, ejes: [0.048, 0.044, 0.042] });
      }
    }
    nidos.push({ lado, centro: aP2(p), celulas });
  };
  const izquierda = delLado(LADO_TENSION);
  const derecha = delLado(LADO_PRESION);
  const huecoEn = (lista: Haz[], y: number): [Haz, Haz] => {
    const i = lista.findIndex((h) => h.raiz[1] > y);
    return [lista[i - 1]!, lista[i]!];
  };
  nido(-1, ...huecoEn(izquierda, 3.6));
  nido(-1, ...huecoEn(izquierda, 8.0));
  nido(1, ...huecoEn(derecha, 2.6));
  nido(-1, apicales[0]!, izquierda[0]!);

  /* Fibroblastos: fusiformes, entre los haces y alineados con ellos; donde no tapan vasos, nidos ni las filas de
   * células de las superficies. */
  const fibroblastos: (Celula & { lado: Lado })[] = [];
  const libre = (p: Vector2, lado: Lado, holgura: number): boolean => {
    if (!enLigamento(p.x, p.y)) return false;
    const yRef = Math.max(0.05, p.y);
    if (p.y > 0.4 && lado * (p.x - superficieRaiz(lado, yRef)) < 0.11) return false;
    if (
      p.y > 0.4 &&
      lado * (paredAlveolo(lado, yRef) - p.x) < (lado === LADO_TENSION ? 0.2 : 0.09)
    ) {
      return false;
    }
    if (vasosLigamento.some((v) => distanciaAPolilinea(p, v.puntos) < v.radio + holgura))
      return false;
    if (progenitoras.some((c) => p.distanceTo(v2(c.centro)) < 0.16)) return false;
    if (nidos.some((n) => p.distanceTo(v2(n.centro)) < 0.24)) return false;
    return true;
  };
  // Dónde van, a lo largo del haz, en huecos alternos (para que no formen una cuadrícula).
  for (const [lado, lista, patrones, ejes] of [
    [
      LADO_TENSION,
      izquierda,
      [
        [0.3, 0.72],
        [0.5, 0.88],
      ],
      [0.17, 0.032, 0.04],
    ],
    [LADO_PRESION, derecha, [[0.5], []], [0.13, 0.026, 0.035]],
  ] as const) {
    for (let i = 0; i < lista.length - 1; i++) {
      const a = lista[i]!;
      const b = lista[i + 1]!;
      const largoA = v2(a.hueso).distanceTo(v2(a.raiz));
      for (const u of patrones[i % 2]!) {
        const { p, d } = entreHaces(a, b, u * largoA);
        if (!libre(p, lado, 0.06)) continue;
        fibroblastos.push({
          lado,
          centro: aP2(p),
          angulo: Math.atan2(d.y, d.x),
          ejes: [ejes[0], ejes[1], ejes[2]],
        });
      }
    }
  }
  // También entre los haces del ápice.
  const abanico = [izquierda[0]!, ...apicales, derecha[0]!];
  for (let i = 0; i < abanico.length - 1; i++) {
    const a = abanico[i]!;
    const b = abanico[i + 1]!;
    const largo = v2(a.hueso).distanceTo(v2(a.raiz));
    const { p, d } = entreHaces(a, b, 0.5 * largo);
    const lado: Lado = p.x < DESPLAZAMIENTO ? -1 : 1;
    if (!libre(p, lado, 0.06)) continue;
    fibroblastos.push({
      lado,
      centro: aP2(p),
      angulo: Math.atan2(d.y, d.x),
      ejes: [0.13, 0.03, 0.038],
    });
  }

  /* Cementoblastos: una fila de células cúbicas sobre el cemento, entre las inserciones de los haces. */
  const cementoblastos: (Celula & { lado: Lado })[] = [];
  const insercionesRaiz = haces.map((h) => v2(h.raiz));
  for (const lado of [LADO_TENSION, LADO_PRESION]) {
    for (const { p, t } of porLongitud((y) => superficieRaiz(lado, y), 10.5, 0.06, 0.19)) {
      if (insercionesRaiz.some((q) => q.distanceTo(p) < 0.06)) continue;
      const n = normalRaiz(lado, p.y);
      const c = p.clone().addScaledVector(n, 0.043);
      cementoblastos.push({
        lado,
        centro: aP2(c),
        angulo: Math.atan2(t.y, t.x),
        ejes: [0.065, 0.04, 0.045],
      });
    }
  }

  /* Osteoblastos: fila de células cúbicas sobre el osteoide del lado de tensión. */
  const osteoblastos: Celula[] = [];
  const insercionesHueso = haces.filter((h) => h.lado === LADO_TENSION).map((h) => v2(h.hueso));
  for (const { p, t } of porLongitud((y) => paredAlveolo(-1, y), 10.45, 1.1, 0.17)) {
    if (insercionesHueso.some((q) => q.distanceTo(p) < 0.06)) continue;
    if (PERFORACIONES.some((q) => q.lado === -1 && Math.abs(q.y - p.y) < 0.16)) continue;
    const haciaLigamento = new Vector2(-t.y, t.x);
    if (haciaLigamento.x < 0) haciaLigamento.negate();
    const c = p.clone().addScaledVector(haciaLigamento, GROSOR_OSTEOIDE + 0.06);
    osteoblastos.push({ centro: aP2(c), angulo: Math.atan2(t.y, t.x), ejes: [0.075, 0.06, 0.06] });
  }

  /* Osteoclastos: una célula gigante en cada laguna de Howship, con cuatro núcleos. */
  const osteoclastos = LAGUNAS_HOWSHIP.map((yk) => {
    const x = radioAlveolo(yk) + 0.07;
    const nucleos: P2[] = [-0.18, -0.06, 0.06, 0.18].map((dy, i) => [
      x + (i % 2 ? 0.02 : -0.015),
      yk + dy,
    ]);
    return {
      centro: [x, yk] as P2,
      angulo: Math.PI / 2,
      ejes: [MEDIA_LAGUNA - 0.01, 0.13, 0.11] as Vec3,
      nucleos,
    };
  });

  /* Marcas de los lados: en el de tensión, dos flechas que se alejan; en el de presión, dos que se acercan. */
  const yt = ALTURA_MARCA_TENSION;
  const huesoT = paredAlveolo(-1, yt) + GROSOR_OSTEOIDE;
  const raizT = superficieRaiz(-1, yt);
  const medioT = (huesoT + raizT) / 2;
  const marcaTension: [P2, P2][] = [
    [
      [medioT - 0.06, yt],
      [huesoT + 0.04, yt],
    ],
    [
      [medioT + 0.06, yt],
      [raizT - 0.04, yt],
    ],
  ];
  const yp = ALTURA_MARCA_PRESION;
  const raizP = superficieRaiz(1, yp);
  const huesoP = paredAlveolo(1, yp);
  const marcaPresion: [P2, P2][] = [
    [
      [raizP - 0.6, yp],
      [raizP - 0.03, yp],
    ],
    [
      [huesoP + 0.6, yp],
      [huesoP + 0.03, yp],
    ],
  ];

  return {
    haces,
    vasos,
    perforaciones: [...PERFORACIONES],
    fibroblastos,
    progenitoras,
    cementoblastos,
    osteoblastos,
    osteoclastos,
    nidos,
    marcaTension,
    marcaPresion,
  };
}

let disposicionCalculada: Disposicion | null = null;

/** Dónde va cada haz, vaso y célula. Determinista: la misma disposición en cada carga y en las pruebas. */
export function disposicion(): Disposicion {
  disposicionCalculada ??= construirDisposicion();
  return disposicionCalculada;
}

/* ----- Geometría ----- */

function muestras(desde: number, hasta: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => desde + ((hasta - desde) * i) / n);
}

/** Alturas de 0 a `hasta`, más densas cerca del ápice (y = 0), donde la raíz se curva. */
function alturasDesdeApice(hasta: number, n: number): number[] {
  return muestras(0, 1, n).map((u) => hasta * u * u);
}

/** Polígono plano de la cara de corte, a la altura `z`. UV = (x, y) en mm. */
function caraFrontal(puntos: readonly P2[], z: number): BufferGeometry {
  const g = new ShapeGeometry(new Shape(puntos.map(([x, y]) => new Vector2(x, y))), 1);
  g.translate(0, 0, z);
  return g;
}

/** Polígono plano horizontal (puntos en [x, z]) a la altura `y`, mirando hacia arriba o hacia abajo. UV en mm. */
function caraHorizontal(puntosXZ: readonly P2[], y: number, haciaArriba: boolean): BufferGeometry {
  const forma = new Shape(puntosXZ.map(([x, z]) => new Vector2(x, haciaArriba ? -z : z)));
  const g = new ShapeGeometry(forma, 1);
  // (u, v, 0) pasa a (u, 0, −v) mirando a +Y, o a (u, 0, v) mirando a −Y.
  g.rotateX(haciaArriba ? -Math.PI / 2 : Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** Media corona (z ≤ 0) entre dos circunferencias del plano XZ; sin radio interior, medio disco. */
function semicorona(cxExt: number, rExt: number, cxInt: number, rInt: number, n = 32): P2[] {
  const exterior = muestras(0, Math.PI, n).map((f): P2 => [
    cxExt + rExt * Math.cos(f),
    -rExt * Math.sin(f),
  ]);
  if (rInt <= 0) return exterior;
  const interior = muestras(Math.PI, 0, n).map((f): P2 => [
    cxInt + rInt * Math.cos(f),
    -rInt * Math.sin(f),
  ]);
  return [...exterior, ...interior];
}

/**
 * Media vuelta de un perfil [y, r] alrededor de un eje vertical en x = `cx`, solo la mitad de atrás (z ≤ 0). Caras
 * hacia fuera. UV en mm: u, el arco recorrido; v, la altura.
 */
export function medioTornoVertical(
  perfil: readonly (readonly [number, number])[],
  cx: number,
  segmentos = 32,
): BufferGeometry {
  const columnas = segmentos + 1;
  const posiciones = new Float32Array(perfil.length * columnas * 3);
  const uv = new Float32Array(perfil.length * columnas * 2);
  perfil.forEach(([y, r], i) => {
    for (let j = 0; j < columnas; j++) {
      const f = (Math.PI * j) / segmentos;
      const k = i * columnas + j;
      posiciones.set([cx + r * Math.cos(f), y, -r * Math.sin(f)], k * 3);
      uv.set([f * r, y], k * 2);
    }
  });
  const indices: number[] = [];
  for (let i = 0; i < perfil.length - 1; i++) {
    for (let j = 0; j < segmentos; j++) {
      const a = i * columnas + j;
      const c = (i + 1) * columnas + j;
      // (a, a + 1, c): el arco por la primera arista y la altura por la segunda, normal hacia fuera.
      indices.push(a, a + 1, c, a + 1, c + 1, c);
    }
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(posiciones, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Pared lateral del bloque (la superficie vestibular o lingual del hueso), de z = 0 a z = −PROFUNDIDAD. */
export function paredLateral(lado: Lado): BufferGeometry {
  const ys = muestras(Y_BASE, Y_CRESTA, 40);
  const posiciones = new Float32Array(ys.length * 2 * 3);
  const uv = new Float32Array(ys.length * 2 * 2);
  ys.forEach((y, i) => {
    const x = lado * radioExterior(y);
    posiciones.set([x, y, 0, x, y, -PROFUNDIDAD], i * 6);
    uv.set([0, y, PROFUNDIDAD, y], i * 4);
  });
  const indices: number[] = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const a = 2 * i;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    // Con la altura por una arista y la profundidad por la otra, el orden decide hacia qué lado mira.
    if (lado === 1) indices.push(a, b, c, b, d, c);
    else indices.push(a, c, b, b, c, d);
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(posiciones, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function unir(geos: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(geos);
  for (const x of geos) x.dispose();
  if (!g) throw new Error('No se pudieron unir las piezas del ligamento periodontal.');
  return g;
}

/* Contornos de la cara de corte. */

function contornoBloque(): P2[] {
  const ys = muestras(Y_BASE, Y_CRESTA, 40);
  return [
    ...ys.map((y): P2 => [-radioExterior(y), y]),
    ...[...ys].reverse().map((y): P2 => [radioExterior(y), y]),
  ];
}

function contornoEsponjoso(): P2[] {
  const yTope = Y_CRESTA - 0.5;
  const ys = muestras(Y_BASE, yTope, 36);
  const borde = (y: number): number => radioExterior(y) - grosorCortical(y);
  return [...ys.map((y): P2 => [-borde(y), y]), ...[...ys].reverse().map((y): P2 => [borde(y), y])];
}

/** Contorno en U del alvéolo agrandado `extra` (0: la pared del hueso; con lagunas solo si `conLagunas`). */
function contornoAlveolo(lamina: boolean): P2[] {
  const fondo = -(ANCHO_LPD + (lamina ? GROSOR_LAMINA : 0));
  // Más puntos cerca del fondo, donde el contorno se curva.
  const ys = [
    ...muestras(0, 1, 60).map((u) => fondo + (1 - fondo) * u * u),
    ...muestras(1, Y_CRESTA, 220).slice(1),
  ];
  const semiancho = lamina ? radioLamina : radioAlveolo;
  const derecha = (y: number): number =>
    lamina ? radioLamina(y) : radioAlveolo(y) + profundidadLagunas(y);
  return [
    ...[...ys].reverse().map((y): P2 => [-semiancho(y), y]),
    ...ys.slice(1).map((y): P2 => [derecha(y), y]),
  ];
}

/** Contorno de la raíz con semiancho `semiancho(y)`, de `yTope` al ápice y de vuelta. */
function contornoRaiz(semiancho: (y: number) => number, yFin: number, yTope = Y_CORTE): P2[] {
  const ys = alturasDesdeApice(yTope - yFin, 140).map((h) => yFin + h);
  return [
    ...[...ys].reverse().map((y): P2 => [DESPLAZAMIENTO - semiancho(y), y]),
    ...ys.slice(1).map((y): P2 => [DESPLAZAMIENTO + semiancho(y), y]),
  ];
}

/** Altura donde termina la dentina (por debajo, la raíz es solo cemento, salvo el foramen). */
export function finDentina(): number {
  let a = 0;
  let b = 2;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    if (radioRaiz(m) - grosorCemento(m) > 0) b = m;
    else a = m;
  }
  return b;
}

/** Semiancho de la pulpa: el conducto, que llega al ápice por el foramen apical. */
export function radioPulpa(y: number): number {
  return Math.min(radioConducto(y), 0.5 * radioRaiz(y));
}

function contornoOsteoide(): P2[] {
  const ys = muestras(1.0, 10.55, 120);
  return [
    ...[...ys].reverse().map((y): P2 => [-radioAlveolo(y), y]),
    ...ys.map((y): P2 => [-radioAlveolo(y) + GROSOR_OSTEOIDE, y]),
  ];
}

/** Conducto vascular que cruza la lámina: una rendija algo oblicua. */
function contornoPerforacion(lado: Lado, y: number): P2[] {
  const x0 = paredAlveolo(lado, y);
  const x1 = x0 + lado * (GROSOR_LAMINA + 0.03);
  const m = 0.045;
  return [
    [x0, y + m],
    [x1, y - 0.1 + m],
    [x1, y - 0.1 - m],
    [x0, y - m],
  ];
}

/* Piezas con volumen. */

function tubo(
  puntos: readonly (P2 | Vec3)[],
  radio: number,
  z: number,
  segmentos: number,
): BufferGeometry {
  const curva = new CatmullRomCurve3(
    puntos.map((p) => new Vector3(p[0], p[1], p.length === 3 ? p[2] : z)),
  );
  return new TubeGeometry(curva, segmentos, radio, 5, false);
}

/** Cúpula unidad (media esfera hacia +Z, base en z = 0). Con `cubica`, de bordes rectos (células cúbicas). */
function cupula(cubica: boolean): BufferGeometry {
  const g = new SphereGeometry(1, cubica ? 8 : 10, cubica ? 3 : 4, 0, Math.PI * 2, 0, Math.PI / 2);
  g.rotateX(Math.PI / 2);
  if (cubica) {
    const pos = g.getAttribute('position');
    const forma = (v: number, e: number): number => Math.sign(v) * Math.abs(v) ** e;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, forma(pos.getX(i), 0.45), forma(pos.getY(i), 0.45), forma(pos.getZ(i), 0.6));
    }
    g.computeVertexNormals();
  }
  return g;
}

/** Células: una cúpula por célula (base en `z0`), orientada y escalada; el núcleo es otra cúpula más alta. */
function celulas(
  lista: readonly Celula[],
  base: BufferGeometry,
  z0: number,
  escalaNucleo: Vec3 | null,
  desplazamientoNucleo: P2 = [0, 0],
): BufferGeometry {
  const geos = lista.map((c) => {
    const [a, b, h] = escalaNucleo
      ? [c.ejes[0] * escalaNucleo[0], c.ejes[1] * escalaNucleo[1], c.ejes[2] * escalaNucleo[2]]
      : c.ejes;
    const cos = Math.cos(c.angulo);
    const sin = Math.sin(c.angulo);
    const [du, dv] = desplazamientoNucleo;
    const centro = new Vector3(
      c.centro[0] + du * cos - dv * sin,
      c.centro[1] + du * sin + dv * cos,
      z0,
    );
    const m = new Matrix4().compose(
      centro,
      new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), c.angulo),
      new Vector3(a, b, h),
    );
    return base.clone().applyMatrix4(m);
  });
  return unir(geos);
}

function flecha(
  desde: P2,
  hasta: P2,
  z: number,
  asta: number,
  punta: number,
  largoPunta: number,
): BufferGeometry {
  const a = new Vector3(desde[0], desde[1], z);
  const d = new Vector3(hasta[0], hasta[1], z).sub(a);
  const largo = d.length();
  const cuerpo = new CylinderGeometry(asta, asta, largo - largoPunta, 10, 1);
  cuerpo.translate(0, (largo - largoPunta) / 2, 0);
  const cabeza = new ConeGeometry(punta, largoPunta, 14, 1);
  cabeza.translate(0, largo - largoPunta / 2, 0);
  const g = unir([cuerpo, cabeza]);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}

/* ----- Materiales ----- */

/** Material de una pieza: físico y de una cara; con `repetir`, el relieve se repite esas veces por mm. */
function material(color: string, tipo: TipoTejido, repetir?: number): MeshPhysicalMaterial {
  const m = materialOrganico(color, tipo, { side: FrontSide });
  if (repetir !== undefined) m.bumpMap?.repeat.set(repetir, repetir);
  return m;
}

const hexARgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

let texturaEsponjosaBase: DataTexture | null = null;

/**
 * Color del hueso esponjoso serrado: las trabéculas marfil y, entre ellas, la médula (mixta, roja y grasa, como la
 * de un adulto). Sale del mismo patrón de celdas que su relieve, así que tabiques y huecos coinciden.
 */
function texturaEsponjosa(repetir: number): DataTexture {
  if (!texturaEsponjosaBase) {
    const relieve = texturaRelieve('celdas');
    const { data, width, height } = relieve.image as {
      data: Uint8Array;
      width: number;
      height: number;
    };
    const medula = hexARgb(COLORES.medula);
    const trabecula = hexARgb(COLORES.trabecula);
    const datos = new Uint8Array(width * height * 4);
    for (let k = 0; k < width * height; k++) {
      const m = suave((data[k * 4]! / 255 - 0.3) / 0.35);
      for (let c = 0; c < 3; c++)
        datos[k * 4 + c] = Math.round(mezclar(medula[c]!, trabecula[c]!, m));
      datos[k * 4 + 3] = 255;
    }
    const t = new DataTexture(datos, width, height, RGBAFormat, UnsignedByteType);
    t.name = 'color_esponjoso';
    t.colorSpace = SRGBColorSpace;
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.magFilter = LinearFilter;
    t.minFilter = LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 4;
    t.needsUpdate = true;
    texturaEsponjosaBase = t;
  }
  const clon = texturaEsponjosaBase.clone();
  clon.repeat.set(repetir, repetir);
  clon.needsUpdate = true;
  return clon;
}

function materialEsponjoso(): MeshPhysicalMaterial {
  // El patrón se repite cada 6 mm: huecos medulares de algo más de medio milímetro, como los del hueso alveolar.
  const repetir = 1 / 6;
  const m = materialOrganico('#ffffff', 'hueso_trabecular', {
    side: FrontSide,
    map: texturaEsponjosa(repetir),
  });
  m.bumpMap?.repeat.set(repetir, repetir);
  return m;
}

function malla(geometria: BufferGeometry, mat: Material, nombre: string): Mesh {
  const m = new Mesh(geometria, mat);
  m.name = nombre;
  return m;
}

function grupo(nombre: RegionLigamento | 'contexto', ...mallas: Mesh[]): Group {
  const g = new Group();
  g.name = nombre;
  g.add(...mallas);
  return g;
}

/* ----- Modelo ----- */

/** Construye el bloque: un grupo con un subgrupo por región y uno de contexto. */
export function crearLigamentoPeriodontal(): Group {
  const d = disposicion();
  const modelo = new Group();
  modelo.name = 'ligamento_periodontal_modelo';

  const rCresta = radioAlveolo(Y_CRESTA);
  const rLamina = radioLamina(Y_CRESTA);
  const xCresta = radioExterior(Y_CRESTA);
  const rRaizCresta = radioRaiz(Y_CRESTA);
  const rRaizCorte = radioRaiz(Y_CORTE);
  const cemCorte = grosorCemento(Y_CORTE);

  // Contexto: el hueso que rodea al alvéolo, la dentina y la pulpa de la raíz y la fuerza lateral.
  const perfilRaizVisible = muestras(Y_CRESTA, Y_CORTE, 8).map((y): [number, number] => [
    y,
    radioRaiz(y),
  ]);
  const yFuerza = 11.6;
  const xRaizFuerza = superficieRaiz(-1, yFuerza);
  modelo.add(
    grupo(
      'contexto',
      malla(
        unir([
          paredLateral(-1),
          paredLateral(1),
          caraHorizontal(
            [
              [xCresta, 0],
              [xCresta, -PROFUNDIDAD],
              [-xCresta, -PROFUNDIDAD],
              [-xCresta, 0],
              ...semicorona(0, rLamina, 0, 0).reverse(),
            ],
            Y_CRESTA,
            true,
          ),
        ]),
        material(COLORES.superficie, 'hueso', 0.6),
        'hueso_superficie',
      ),
      malla(
        caraFrontal(contornoBloque(), Z_CORTICAL),
        material(COLORES.cortical, 'hueso', 0.7),
        'cortical_corte',
      ),
      malla(
        unir([
          caraFrontal(contornoEsponjoso(), Z_ESPONJOSO),
          (() => {
            const g = caraFrontal(contornoBloque(), 0);
            g.rotateY(Math.PI);
            g.translate(0, 0, -PROFUNDIDAD);
            return g;
          })(),
          caraHorizontal(
            [
              [-X_BLOQUE, 0],
              [X_BLOQUE, 0],
              [X_BLOQUE, -PROFUNDIDAD],
              [-X_BLOQUE, -PROFUNDIDAD],
            ],
            Y_BASE,
            false,
          ),
        ]),
        materialEsponjoso(),
        'esponjoso_corte',
      ),
      malla(
        unir([
          caraFrontal(
            contornoRaiz((y) => radioRaiz(y) - grosorCemento(y), finDentina()),
            Z_DENTINA,
          ),
          caraHorizontal(
            semicorona(
              DESPLAZAMIENTO,
              rRaizCorte - cemCorte,
              DESPLAZAMIENTO,
              radioConducto(Y_CORTE),
            ),
            Y_CORTE,
            true,
          ),
        ]),
        material(COLORES.dentina, 'dentina', 1),
        'dentina',
      ),
      malla(
        unir([
          caraFrontal(contornoRaiz(radioPulpa, 0.03), Z_PULPA),
          caraHorizontal(
            semicorona(DESPLAZAMIENTO, radioConducto(Y_CORTE), 0, 0),
            Y_CORTE + 0.001,
            true,
          ),
        ]),
        material(COLORES.pulpa, 'encia', 2),
        'pulpa',
      ),
      malla(
        flecha(
          [xRaizFuerza - 2.6, yFuerza],
          [xRaizFuerza - 0.12, yFuerza],
          Z_MARCA,
          0.07,
          0.2,
          0.5,
        ),
        material(COLORES.fuerza, 'molecula'),
        'fuerza_lateral',
      ),
    ),
  );

  // Cemento radicular: la banda de la cara de corte, la superficie de la raíz que asoma y su anillo en el corte.
  modelo.add(
    grupo(
      'cemento_radicular',
      malla(
        unir([
          caraFrontal(contornoRaiz(radioRaiz, 0), Z_CEMENTO),
          medioTornoVertical(perfilRaizVisible, DESPLAZAMIENTO),
          caraHorizontal(
            semicorona(DESPLAZAMIENTO, rRaizCorte, DESPLAZAMIENTO, rRaizCorte - cemCorte),
            Y_CORTE,
            true,
          ),
        ]),
        material(COLORES.cemento, 'hueso', 1.2),
        'cemento',
      ),
    ),
  );

  // Ligamento periodontal: el tejido fibroso, sus haces principales y sus vasos.
  // Un haz ondulado necesita más segmentos que uno recto.
  const recorridos = d.haces.map((h) => tubo(h.recorrido, 0.026, Z_FIBRA, h.onda > 0 ? 30 : 6));
  modelo.add(
    grupo(
      'ligamento_periodontal',
      malla(
        unir([
          caraFrontal(contornoAlveolo(false), Z_LIGAMENTO),
          caraHorizontal(semicorona(0, rCresta, DESPLAZAMIENTO, rRaizCresta), Y_CRESTA, true),
        ]),
        material(COLORES.ligamento, 'membrana', 1.2),
        'ligamento',
      ),
      malla(unir(recorridos), material(COLORES.fibra, 'fibra'), 'haces_principales'),
      malla(
        unir(d.vasos.map((v) => tubo(v.puntos, v.radio, Z_VASO, Math.max(8, v.puntos.length * 6)))),
        material(COLORES.vaso, 'vaso'),
        'vasos',
      ),
    ),
  );

  // Fibras de Sharpey: los extremos de los haces incluidos en el cemento y en el hueso alveolar propio.
  const extremos = d.haces.flatMap((h) => [
    tubo(
      [
        [...h.sharpeyCemento[0], Z_FIBRA],
        [...h.sharpeyCemento[1], Z_CEMENTO - 0.006],
      ],
      0.024,
      0,
      2,
    ),
    tubo(
      [
        [...h.sharpeyHueso[0], Z_FIBRA],
        [...h.sharpeyHueso[1], Z_LAMINA + 0.006],
      ],
      0.024,
      0,
      2,
    ),
  ]);
  modelo.add(
    grupo('fibras_sharpey', malla(unir(extremos), material(COLORES.sharpey, 'fibra'), 'sharpey')),
  );

  // Hueso alveolar propio: la lámina que reviste el alvéolo, su borde en la cresta y sus conductos vasculares.
  modelo.add(
    grupo(
      'hueso_alveolar_propio',
      malla(
        unir([
          caraFrontal(contornoAlveolo(true), Z_LAMINA),
          caraHorizontal(semicorona(0, rLamina, 0, rCresta), Y_CRESTA, true),
        ]),
        material(COLORES.lamina, 'hueso', 0.8),
        'lamina',
      ),
      malla(
        unir(
          d.perforaciones.map(({ lado, y }) =>
            caraFrontal(contornoPerforacion(lado, y), Z_PERFORACION),
          ),
        ),
        material(COLORES.perforacion, 'cavidad'),
        'conductos_vasculares',
      ),
    ),
  );

  const redonda = cupula(false);
  const cubica = cupula(true);
  const conNucleo = (
    nombre: RegionLigamento,
    lista: readonly Celula[],
    base: BufferGeometry,
    color: string,
    nucleo: Vec3,
    colorNucleo: string = COLORES.nucleo,
    desplazamiento: P2 = [0, 0],
  ): Group =>
    grupo(
      nombre,
      malla(
        celulas(lista, base, Z_LIGAMENTO, null),
        material(color, 'celula'),
        `${nombre}_citoplasma`,
      ),
      malla(
        celulas(lista, redonda, Z_LIGAMENTO, nucleo, desplazamiento),
        material(colorNucleo, 'nucleo'),
        `${nombre}_nucleos`,
      ),
    );

  modelo.add(
    conNucleo(
      'fibroblastos_periodontales',
      d.fibroblastos,
      redonda,
      COLORES.fibroblasto,
      [0.5, 0.68, 1.25],
    ),
  );
  modelo.add(
    conNucleo(
      'celulas_progenitoras_perivasculares',
      d.progenitoras,
      redonda,
      COLORES.progenitora,
      [0.68, 0.72, 1.2],
      '#6b5d9e',
    ),
  );
  modelo.add(
    conNucleo('cementoblastos', d.cementoblastos, cubica, COLORES.cementoblasto, [0.48, 0.62, 1.2]),
  );

  // Osteoblastos alveolares: la fila sobre el osteoide del lado de tensión, con el núcleo lejos del hueso.
  const osteoblastos = conNucleo(
    'osteoblastos_alveolares',
    d.osteoblastos,
    cubica,
    COLORES.osteoblasto,
    [0.52, 0.55, 1.15],
    COLORES.nucleo,
    [0, 0.022],
  );
  osteoblastos.add(
    malla(
      caraFrontal(contornoOsteoide(), Z_OSTEOIDE),
      material(COLORES.osteoide, 'membrana', 2),
      'osteoide',
    ),
  );
  modelo.add(osteoblastos);

  // Osteoclastos alveolares: células gigantes multinucleadas en las lagunas del lado de presión.
  const nucleosOsteoclasto: Celula[] = d.osteoclastos.flatMap((o) =>
    o.nucleos.map((c) => ({ centro: c, angulo: o.angulo, ejes: [0.045, 0.036, 0.115] as Vec3 })),
  );
  modelo.add(
    grupo(
      'osteoclastos_alveolares',
      malla(
        celulas(d.osteoclastos, redonda, Z_LIGAMENTO, null),
        material(COLORES.osteoclasto, 'celula'),
        'osteoclastos_citoplasma',
      ),
      malla(
        celulas(nucleosOsteoclasto, redonda, Z_LIGAMENTO, null),
        material(COLORES.nucleo, 'nucleo'),
        'osteoclastos_nucleos',
      ),
    ),
  );

  // Restos epiteliales de Malassez: nidos de células pequeñas de núcleo oscuro y poco citoplasma.
  modelo.add(
    conNucleo(
      'restos_epiteliales_malassez',
      d.nidos.flatMap((n) => n.celulas),
      redonda,
      COLORES.epitelio,
      [0.6, 0.62, 1.3],
      COLORES.nucleoEpitelio,
    ),
  );

  // Lados de presión y de tensión: flechas por delante del ligamento.
  const marcas = (lista: [P2, P2][]): BufferGeometry =>
    unir(lista.map(([a, b]) => flecha(a, b, Z_MARCA, 0.022, 0.065, 0.17)));
  modelo.add(
    grupo(
      'lado_tension',
      malla(marcas(d.marcaTension), material(COLORES.marca, 'molecula'), 'marca_tension'),
    ),
  );
  modelo.add(
    grupo(
      'lado_presion',
      malla(marcas(d.marcaPresion), material(COLORES.marca, 'molecula'), 'marca_presion'),
    ),
  );

  redonda.dispose();
  cubica.dispose();
  return modelo;
}

/* ----- Puntos de las etiquetas ----- */

const FRENTE: Vec3 = [0, 0, 1];

function masCercana<T extends { centro: P2 }>(
  lista: readonly T[],
  y: number,
  filtro: (c: T) => boolean = () => true,
): T {
  let mejor: T | null = null;
  for (const c of lista) {
    if (!filtro(c)) continue;
    if (!mejor || Math.abs(c.centro[1] - y) < Math.abs(mejor.centro[1] - y)) mejor = c;
  }
  if (!mejor) throw new Error('No hay ninguna célula para la etiqueta.');
  return mejor;
}

const sobreCelula = (c: Celula, radio: number): PuntoRegion => ({
  punto: [c.centro[0], c.centro[1], Z_LIGAMENTO + c.ejes[2]],
  normal: FRENTE,
  radio,
});

/**
 * Punto de la etiqueta de cada región. Las seis del lado de tensión quedan a la izquierda del eje de la raíz y las
 * seis del de presión a la derecha (así se reparten las etiquetas laterales), a alturas distintas.
 */
export function puntoDeRegion(id: RegionLigamento): PuntoRegion {
  const d = disposicion();
  switch (id) {
    case 'celulas_progenitoras_perivasculares':
      return sobreCelula(
        masCercana(d.progenitoras, 10, (c) => c.lado === -1),
        1.1,
      );
    case 'hueso_alveolar_propio': {
      const y = 8.3;
      return {
        punto: [-(radioAlveolo(y) + GROSOR_LAMINA / 2), y, Z_LAMINA + 0.001],
        normal: FRENTE,
        radio: 1.8,
      };
    }
    case 'lado_tension': {
      // Entre las colas de las dos flechas, en el centro del ligamento.
      const a = d.marcaTension[0]![0][0];
      const b = d.marcaTension[1]![0][0];
      return { punto: [(a + b) / 2, ALTURA_MARCA_TENSION, Z_MARCA], normal: FRENTE, radio: 2.2 };
    }
    case 'osteoblastos_alveolares':
      return sobreCelula(masCercana(d.osteoblastos, 4.6), 1.1);
    case 'fibroblastos_periodontales':
      return sobreCelula(
        masCercana(d.fibroblastos, 2.6, (c) => c.lado === -1 && c.centro[1] > 1.5),
        1.1,
      );
    case 'ligamento_periodontal':
      return { punto: [-0.3, -0.42, Z_LIGAMENTO + 0.001], normal: FRENTE, radio: 2.6 };
    case 'cementoblastos':
      return sobreCelula(
        masCercana(d.cementoblastos, 10.3, (c) => c.lado === 1),
        1.1,
      );
    case 'fibras_sharpey': {
      const h = d.haces
        .filter((x) => x.lado === 1 && x.raiz[1] > 1)
        .reduce((m, x) => (Math.abs(x.hueso[1] - 8.8) < Math.abs(m.hueso[1] - 8.8) ? x : m));
      const [a, b] = h.sharpeyHueso;
      return { punto: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Z_FIBRA], normal: FRENTE, radio: 1 };
    }
    case 'osteoclastos_alveolares':
      return sobreCelula(d.osteoclastos[1]!, 1.3);
    case 'lado_presion': {
      // Entre las puntas de las dos flechas, en el centro del ligamento.
      const a = d.marcaPresion[0]![1][0];
      const b = d.marcaPresion[1]![1][0];
      return { punto: [(a + b) / 2, ALTURA_MARCA_PRESION, Z_MARCA], normal: FRENTE, radio: 2.2 };
    }
    case 'restos_epiteliales_malassez': {
      const n = d.nidos.find((x) => x.lado === 1)!;
      return { punto: [n.centro[0], n.centro[1], Z_LIGAMENTO + 0.05], normal: FRENTE, radio: 1 };
    }
    case 'cemento_radicular': {
      const y = 1.0;
      return {
        punto: [superficieRaiz(1, y) - grosorCemento(y) / 2, y, Z_CEMENTO + 0.001],
        normal: FRENTE,
        radio: 1.6,
      };
    }
  }
}

export function esRegionLigamento(id: string): id is RegionLigamento {
  return (REGIONES_LIGAMENTO as readonly string[]).includes(id);
}
