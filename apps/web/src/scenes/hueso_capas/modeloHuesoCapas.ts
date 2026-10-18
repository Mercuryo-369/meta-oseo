/**
 * Extremo de un hueso largo serrado a lo largo, de la superficie al interior: el modelo `hueso_capas` de la
 * exploración 3D (actividad m1_4_corte_capas, «Del periostio a la médula»; hasta 2026-10-18 era un dibujo SVG con
 * una ilustración hecha por IA debajo, que pintaba la cortical pardo rojiza, como un músculo).
 *
 * Como el hueso largo de m1_1 (`hueso_largo/modeloHuesoLargo.ts`), la mitad de atrás es un sólido (el periostio que
 * envuelve el hueso y el cartílago articular) y la cara de corte, plana, mira a la cámara (+Z). De izquierda a
 * derecha: el final de la diáfisis (cortical gruesa y cavidad medular con médula amarilla), la metáfisis que se
 * ensancha (la cortical se adelgaza y empieza el hueso trabecular) y la epífisis (una cáscara fina de cortical, la
 * placa subcondral, llena de trabéculas en arcadas, con médula roja entre ellas). A la izquierda, el corte
 * transversal de la diáfisis enseña los mismos anillos de frente.
 *
 * Fidelidad (guion, notas de precisión de `m1_corte_hueso_capas`):
 *  - el periostio tiene dos capas, la fibrosa externa y la celular interna, y NO cubre la superficie articular:
 *    termina en el borde del cartílago;
 *  - la cortical es marfil, compacta, más gruesa en la diáfisis que en la epífisis;
 *  - el endostio es una capa muy fina (no una capa gruesa) que tapiza la cara interna de la cortical, la cavidad
 *    medular y cada trabécula;
 *  - las trabéculas siguen las líneas de carga: unas bajan desde la placa subcondral, perpendiculares a la
 *    superficie articular, y se abren hacia la cortical de la metáfisis; otras forman arcos apuntados que unen las
 *    dos corticales y cruzan a las primeras; entre ellas, barras y placas cortas que las conectan;
 *  - la médula ocupa la cavidad y los espacios entre trabéculas (no es una capa aparte): amarilla en la cavidad de
 *    la diáfisis y roja entre las trabéculas;
 *  - la línea epifisaria del adulto cruza el hueso trabecular como una placa fina de hueso más denso.
 * Grosores exagerados para que se vean: el periostio y el endostio miden aquí unas diez veces lo que miden en un
 * hueso real, y las trabéculas algo más del doble.
 *
 * Cada región es un grupo con el id de su nodo (`content/nodos3d.ts`) y sus propios materiales; `puntoDeRegion`
 * da el punto de su etiqueta, sobre la cara de corte. El hueso va a lo largo de X, de −1,7 a 1,5.
 */
import type { BufferGeometry, Group } from 'three';
import { BufferAttribute, BufferGeometry as Geometria, Color } from 'three';
import { medioTorno } from '../hueso_largo/modeloHuesoLargo';
import type { PuntoRegion, Vec3 } from '../modelosPorCodigo';
import type { Vec2 } from '../piezasPorCodigo';
import {
  aleatorio,
  anilloPlano,
  cara,
  enCara,
  esHorario,
  malla,
  marcoCara,
  masCercano,
  material,
  mezclar,
  muestras,
  paredes,
  prisma,
  region,
  suave,
  trazo,
  tubo,
  unir,
} from '../piezasPorCodigo';

/** Regiones del modelo: los ids de los nodos del catálogo `hueso_capas`. */
export const REGIONES_HUESO_CAPAS = [
  'periostio',
  'hueso_cortical',
  'endostio',
  'hueso_trabecular',
  'medula_osea',
] as const;
export type RegionHuesoCapas = (typeof REGIONES_HUESO_CAPAS)[number];

/* ----- Medidas (unidades del modelo) ----- */

/** Corte transversal de la diáfisis (extremo izquierdo del modelo). */
export const X_IZQ = -1.7;
const X_DIAFISIS = -0.6;
/** Centro de la elipse del extremo articular. */
const X_CENTRO = 0.7;
/** Punta del hueso (sin el cartílago). */
export const X_FIN = 1.45;
const R_DIAFISIS = 0.4;
const R_EPIFISIS = 0.8;
const A_EPIFISIS = X_FIN - X_CENTRO;
export const CORTICAL_DIAFISIS = 0.15;
/** Placa subcondral y cortical de la epífisis. */
export const CORTICAL_EPIFISIS = 0.028;
/** Hasta aquí se adelgaza la cortical de la metáfisis. */
const X_FIN_ADELGAZA = 0.25;
/** Fin redondeado de la cavidad medular, dentro de la metáfisis. */
export const X_CAVIDAD = -0.15;
/** Línea epifisaria (vestigio de la placa de crecimiento). */
export const X_LINEA = 0.42;
/** Borde del cartílago articular: aquí termina el periostio. */
export const X_CARTILAGO = 1.0;
const GROSOR_CARTILAGO = 0.045;
export const PERIOSTIO_CELULAR = 0.012;
export const PERIOSTIO_TOTAL = 0.034;
export const ENDOSTIO = 0.012;

/** Alturas de las capas de la cara de corte: la médula, blanda, queda algo hundida bajo el hueso serrado. */
const H_CORTE = 0;
const H_LINEA = 0.0008;
export const H_ENDOSTIO = -0.005;
export const H_MEDULA = -0.012;
const H_FONDO_TRABECULA = -0.018;

const COLORES = {
  cortical: '#eadfc8',
  trabecula: '#e6d8bc',
  linea: '#efe5d0',
  periostioFibroso: '#e6cfc4',
  periostioCelular: '#d9ae9f',
  // El endostio real es una capa de células planas que no se distingue a simple vista: un tono rosado claro lo
  // separa del marfil del hueso y de la médula.
  endostio: '#ebc1b0',
  medulaAmarilla: '#e8c561',
  medulaRoja: '#9e3f33',
  cartilago: '#d9e8ef',
  vaso: '#c9473e',
} as const;

/* ----- Perfil ----- */

/** Radio exterior del hueso (sin periostio) a la altura `x`. */
export function radioExterior(x: number): number {
  if (x <= X_DIAFISIS) return R_DIAFISIS + 0.012 * ((x - X_IZQ) / (X_DIAFISIS - X_IZQ)) ** 2;
  if (x <= X_CENTRO) {
    const k = suave((x - X_DIAFISIS) / (X_CENTRO - X_DIAFISIS));
    return mezclar(R_DIAFISIS + 0.012, R_EPIFISIS, k);
  }
  const e = (x - X_CENTRO) / A_EPIFISIS;
  return R_EPIFISIS * Math.sqrt(Math.max(0, 1 - e * e));
}

/** Grosor de la cortical: gruesa en la diáfisis, se adelgaza en la metáfisis y es fina en la epífisis. */
export function grosorCortical(x: number): number {
  if (x <= X_DIAFISIS) return CORTICAL_DIAFISIS;
  if (x >= X_FIN_ADELGAZA) return CORTICAL_EPIFISIS;
  const k = suave((x - X_DIAFISIS) / (X_FIN_ADELGAZA - X_DIAFISIS));
  return mezclar(CORTICAL_DIAFISIS, CORTICAL_EPIFISIS, k);
}

const A_INTERIOR = A_EPIFISIS - CORTICAL_EPIFISIS;
const B_INTERIOR = R_EPIFISIS - CORTICAL_EPIFISIS;
/** Fin del interior (bajo la placa subcondral de la punta). */
export const X_FIN_INTERIOR = X_CENTRO + A_INTERIOR;

/** Radio interior de la cortical (borde de la cavidad o del hueso trabecular). */
export function radioInterior(x: number): number {
  if (x <= X_CENTRO) return radioExterior(x) - grosorCortical(x);
  const e = (x - X_CENTRO) / A_INTERIOR;
  return B_INTERIOR * Math.sqrt(Math.max(0, 1 - e * e));
}

/** Semialtura de la cavidad medular en la diáfisis. */
const H_CAVIDAD = R_DIAFISIS + 0.012 - CORTICAL_DIAFISIS;

/**
 * Campo de la cavidad medular: menor que 1 dentro. En la diáfisis la cavidad llena el interior; en la metáfisis
 * termina en una cúpula, rodeada ya de trabéculas.
 */
export function campoCavidad(x: number, y: number): number {
  if (x <= X_DIAFISIS) return Math.abs(y) / radioInterior(x);
  const ex = (x - X_DIAFISIS) / (X_CAVIDAD - X_DIAFISIS);
  return Math.hypot(ex, y / H_CAVIDAD);
}

/** Semialtura de la cavidad (0 donde ya no hay). */
export function semialturaCavidad(x: number): number {
  if (x <= X_DIAFISIS) return radioInterior(x);
  const ex = (x - X_DIAFISIS) / (X_CAVIDAD - X_DIAFISIS);
  return ex >= 1 ? 0 : H_CAVIDAD * Math.sqrt(1 - ex * ex);
}

/** Mitad superior de un contorno (de izquierda a derecha, hasta la punta), con la elipse muestreada por ángulo. */
function contorno(radio: (x: number) => number, a: number, b: number, n = 70): Vec2[] {
  const recto = muestras(X_IZQ, X_CENTRO, n).map((x): Vec2 => [x, radio(x)]);
  const elipse = muestras(Math.PI / 2, 0, 40)
    .slice(1)
    .map((t): Vec2 => [X_CENTRO + a * Math.cos(t), b * Math.sin(t)]);
  return [...recto, ...elipse];
}
const espejo = (puntos: readonly Vec2[]): Vec2[] => puntos.map(([x, y]): Vec2 => [x, -y]);

/** Contorno exterior del hueso (mitad superior). */
export const contornoExterior = (): Vec2[] => contorno(radioExterior, A_EPIFISIS, R_EPIFISIS);
/** Contorno interior de la cortical (mitad superior). */
export const contornoInterior = (): Vec2[] => contorno(radioInterior, A_INTERIOR, B_INTERIOR);

/** Contorno completo (arriba de izquierda a derecha, la punta y abajo de vuelta): el interior queda a la derecha. */
function completo(mitad: readonly Vec2[]): Vec2[] {
  return [...mitad, ...espejo(mitad).reverse().slice(1)];
}

/**
 * Desplaza una curva a lo largo de su normal izquierda (hacia fuera en un contorno recorrido con el interior a la
 * derecha); `d` negativo, hacia dentro.
 */
export function desplazar(curva: readonly Vec2[], d: number): Vec2[] {
  const n = curva.length;
  return curva.map((p, i): Vec2 => {
    const a = curva[Math.max(0, i - 1)]!;
    const b = curva[Math.min(n - 1, i + 1)]!;
    const largo = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [p[0] - ((b[1] - a[1]) / largo) * d, p[1] + ((b[0] - a[0]) / largo) * d];
  });
}

/** Banda entre dos desplazamientos de una curva. */
function banda(curva: readonly Vec2[], d1: number, d2: number): Vec2[] {
  return [...desplazar(curva, d1), ...desplazar(curva, d2).reverse()];
}

/** Tramo de la mitad superior del contorno exterior hasta el borde del cartílago (lo que cubre el periostio). */
function tramoPeriostio(): Vec2[] {
  return contornoExterior().filter(([x]) => x <= X_CARTILAGO + 1e-9);
}
/** Superficie articular (mitad superior): del borde del cartílago a la punta. */
function tramoArticular(): Vec2[] {
  const c = contornoExterior();
  const desde = c.findIndex(([x]) => x > X_CARTILAGO);
  return [[X_CARTILAGO, radioExterior(X_CARTILAGO)], ...c.slice(desde)];
}

/* ----- Hueso trabecular ----- */

/** Separación mínima entre dos espacios medulares: el grosor de las trabéculas que los separan. */
export const GROSOR_TRABECULA = 0.02;
/** Media anchura de la línea epifisaria. */
const MEDIO_LINEA = 0.011;

/** Línea epifisaria: x de su eje a la altura `y` (algo ondulada, como la placa de crecimiento que dejó). */
export function xLinea(y: number): number {
  return X_LINEA + 0.012 * Math.sin(y * 13 + 0.6);
}

/** Inicio del hueso trabecular, junto a la cúpula de la cavidad. */
const X_TRABECULAR = X_DIAFISIS + 0.08;

/**
 * ¿Cabe el punto en el hueso trabecular, a `margen` de la cortical, de la cavidad y de la línea epifisaria? (Un
 * espacio medular debe quedar entero dentro: la línea epifisaria queda como una placa continua de hueso.)
 */
export function dentroDelTrabecular([x, y]: Vec2, margen = 0): boolean {
  if (x < X_TRABECULAR || x > X_FIN_INTERIOR - margen) return false;
  if (x <= X_CENTRO) {
    if (Math.abs(y) > radioInterior(x) - margen) return false;
  } else {
    const ex = (x - X_CENTRO) / (A_INTERIOR - margen);
    const ey = y / (B_INTERIOR - margen);
    if (ex * ex + ey * ey > 1) return false;
  }
  if (campoCavidad(x, y) < 1 + margen / 0.3) return false;
  return Math.abs(x - xLinea(y)) > MEDIO_LINEA + margen;
}

const unitario = ([x, y]: Vec2): Vec2 => {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};

/**
 * Dirección de las trabéculas (la del eje largo de los espacios medulares): en la epífisis, un abanico
 * perpendicular a la superficie articular; en la metáfisis, a lo largo del hueso y paralela a la cortical cerca de
 * ella. Las trabéculas siguen las líneas de carga.
 */
export function direccionTrabecular([x, y]: Vec2): Vec2 {
  const xm = Math.min(x, X_CENTRO - 0.01);
  const ri = Math.max(0.05, radioInterior(xm));
  const pendiente = (radioInterior(xm + 0.01) - radioInterior(xm - 0.01)) / 0.02;
  const meta = unitario([1, pendiente * (y / ri)]);
  const epi = unitario([x - (X_LINEA - 0.35), y * 1.1]);
  const k = suave((x - X_LINEA + 0.12) / 0.24);
  return unitario([mezclar(meta[0], epi[0], k), mezclar(meta[1], epi[1], k)]);
}

export interface EspacioMedular {
  centro: Vec2;
  /** Contorno del espacio, en sentido antihorario. */
  contorno: Vec2[];
  /** Radio de la circunferencia que lo envuelve. */
  radio: number;
}

/** Elongación de los espacios medulares a lo largo de las trabéculas. */
const ELONGACION = 1.9;

/** Separación entre semillas vecinas (en la métrica alargada): espacios más finos bajo la articulación. */
function separacionSemillas([x]: Vec2): number {
  return mezclar(0.058, 0.092, suave((X_FIN_INTERIOR - x) / 1.1));
}

/** Distancia en la métrica alargada en la dirección de las trabéculas del punto medio. */
function distanciaAlargada(p: Vec2, q: Vec2): number {
  const [dx, dy] = direccionTrabecular([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
  const ax = q[0] - p[0];
  const ay = q[1] - p[1];
  const largo = (ax * dx + ay * dy) / ELONGACION;
  const ancho = -ax * dy + ay * dx;
  return Math.hypot(largo, ancho);
}

/** Recorta un polígono convexo por el semiplano n · p ≤ c (Sutherland–Hodgman). */
function recortarSemiplano(poligono: readonly Vec2[], n: Vec2, c: number): Vec2[] {
  const fuera = (p: Vec2) => n[0] * p[0] + n[1] * p[1] - c;
  const salida: Vec2[] = [];
  for (let i = 0; i < poligono.length; i++) {
    const a = poligono[i]!;
    const b = poligono[(i + 1) % poligono.length]!;
    const fa = fuera(a);
    const fb = fuera(b);
    if (fa <= 0) salida.push(a);
    if (fa <= 0 !== fb <= 0) {
      const t = fa / (fa - fb);
      salida.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return salida;
}

/** Esquinas redondeadas (Chaikin, una pasada): el borde de una trabécula no es un ángulo vivo. */
function redondear(poligono: readonly Vec2[]): Vec2[] {
  const salida: Vec2[] = [];
  for (let i = 0; i < poligono.length; i++) {
    const a = poligono[i]!;
    const b = poligono[(i + 1) % poligono.length]!;
    salida.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
    salida.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
  }
  return salida;
}

/**
 * Semiplanos que mantienen un espacio medular de centro `c` dentro del hueso trabecular, a `m` de la cortical, de
 * la cúpula de la cavidad y de la línea epifisaria (aproximados por sus tangentes, a la escala de un espacio).
 */
function limitesLocales([x, y]: Vec2, m: number): [Vec2, number][] {
  const limites: [Vec2, number][] = [];
  const s = y >= 0 ? 1 : -1;
  if (x <= X_CENTRO) {
    const r = radioInterior(x) - m;
    const pendiente = (radioInterior(x + 0.01) - radioInterior(x - 0.01)) / 0.02;
    // s · y ≤ r + pendiente · (x' − x), es decir (−pendiente, s) · (x', y) ≤ r − pendiente · x.
    const l = Math.hypot(pendiente, 1);
    limites.push([[-pendiente / l, s / l], (r - pendiente * x) / l]);
  } else {
    const fi = Math.atan2(y / B_INTERIOR, (x - X_CENTRO) / A_INTERIOR);
    const p: Vec2 = [X_CENTRO + (A_INTERIOR - m) * Math.cos(fi), (B_INTERIOR - m) * Math.sin(fi)];
    const n0: Vec2 = [Math.cos(fi) / A_INTERIOR, Math.sin(fi) / B_INTERIOR];
    const l = Math.hypot(...n0);
    const n: Vec2 = [n0[0] / l, n0[1] / l];
    limites.push([n, n[0] * p[0] + n[1] * p[1]]);
  }
  // Fuera de la cúpula de la cavidad.
  const largo = X_CAVIDAD - X_DIAFISIS;
  const t = Math.atan2(y / H_CAVIDAD, (x - X_DIAFISIS) / largo);
  if (Math.abs(t) < Math.PI / 2 + 0.3) {
    const p: Vec2 = [X_DIAFISIS + largo * Math.cos(t), H_CAVIDAD * Math.sin(t)];
    const n0: Vec2 = [Math.cos(t) / largo, Math.sin(t) / H_CAVIDAD];
    const l = Math.hypot(...n0);
    const n: Vec2 = [-n0[0] / l, -n0[1] / l];
    limites.push([n, n[0] * p[0] + n[1] * p[1] - m]);
  }
  // A un lado de la línea epifisaria.
  const xl = xLinea(y);
  if (x < xl) limites.push([[1, 0], xl - MEDIO_LINEA - m]);
  else limites.push([[-1, 0], -(xl + MEDIO_LINEA + m)]);
  return limites;
}

let espaciosEnCache: EspacioMedular[] | null = null;

/**
 * Los espacios medulares del hueso trabecular en la cara de corte: las celdas de un diagrama de Voronoi alargado en
 * la dirección de las trabéculas, encogidas medio grosor de trabécula por cada lado. Lo que queda entre ellas es una
 * red de trabéculas finas que se unen en nudos, como en un hueso serrado; junto a la cortical, las celdas se cortan
 * por su tangente y la red se suelda a ella. Más finos bajo la superficie articular (hueso trabecular más denso) y
 * más amplios hacia la cavidad. Siempre los mismos (semilla fija).
 */
export function espaciosMedulares(): EspacioMedular[] {
  if (espaciosEnCache) return espaciosEnCache;
  const azar = aleatorio(17);
  // Semillas: muestreo de disco de Poisson en la métrica alargada.
  const semillas: Vec2[] = [];
  for (let intento = 0; intento < 12000; intento++) {
    const c: Vec2 = [
      mezclar(X_TRABECULAR, X_FIN_INTERIOR, azar()),
      mezclar(-B_INTERIOR, B_INTERIOR, azar()),
    ];
    if (!dentroDelTrabecular(c, GROSOR_TRABECULA)) continue;
    const r = separacionSemillas(c);
    if (semillas.some((s) => Math.abs(s[0] - c[0]) < 0.25 && distanciaAlargada(s, c) < r)) continue;
    semillas.push(c);
  }
  const lista: EspacioMedular[] = [];
  semillas.forEach((p, i) => {
    let celda: Vec2[] = [
      [p[0] - 0.3, p[1] - 0.3],
      [p[0] + 0.3, p[1] - 0.3],
      [p[0] + 0.3, p[1] + 0.3],
      [p[0] - 0.3, p[1] + 0.3],
    ];
    semillas.forEach((q, j) => {
      if (i === j || Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.32 || celda.length === 0) return;
      const medio: Vec2 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      // Bisectriz en la métrica M = R · diag(1/α², 1) · Rᵀ del punto medio (la misma vista desde las dos celdas, así
      // la trabécula entre ellas tiene el grosor pedido): normal M (q − p).
      const [dx, dy] = direccionTrabecular(medio);
      const ax = q[0] - p[0];
      const ay = q[1] - p[1];
      const largo = (ax * dx + ay * dy) / (ELONGACION * ELONGACION);
      const ancho = -ax * dy + ay * dx;
      const n0: Vec2 = [largo * dx - ancho * dy, largo * dy + ancho * dx];
      const l = Math.hypot(...n0);
      const n: Vec2 = [n0[0] / l, n0[1] / l];
      // Grosor de esta trabécula: algo distinto en cada una (el mismo desde las dos celdas).
      const azarPar = Math.abs(Math.sin(Math.min(i, j) * 12.9898 + Math.max(i, j) * 78.233));
      const g = GROSOR_TRABECULA * (0.8 + 0.5 * azarPar);
      celda = recortarSemiplano(celda, n, n[0] * medio[0] + n[1] * medio[1] - g / 2);
    });
    for (const [n, c] of limitesLocales(p, GROSOR_TRABECULA * 0.6)) {
      celda = recortarSemiplano(celda, n, c);
    }
    if (celda.length < 3) return;
    const contorno = redondear(celda);
    if (!contorno.every((v) => dentroDelTrabecular(v, GROSOR_TRABECULA * 0.3))) return;
    const area = Math.abs(
      contorno.reduce((s, a, k) => {
        const b = contorno[(k + 1) % contorno.length]!;
        return s + a[0] * b[1] - b[0] * a[1];
      }, 0) / 2,
    );
    if (area < 0.0006) return;
    const radio = Math.max(...contorno.map((v) => Math.hypot(v[0] - p[0], v[1] - p[1])));
    lista.push({ centro: p, contorno: esHorario(contorno) ? contorno.reverse() : contorno, radio });
  });
  espaciosEnCache = lista;
  return lista;
}

/**
 * El contorno de un espacio medular (convexo) acercado `d` a su centro: el borde interior del endostio que lo
 * tapiza. Radial y no paralelo: en un espacio muy estrecho, un desplazamiento paralelo daría la vuelta al contorno.
 */
function encoger(contorno: readonly Vec2[], centro: Vec2, d: number): Vec2[] {
  return contorno.map(([x, y]): Vec2 => {
    const r = Math.hypot(x - centro[0], y - centro[1]);
    const k = Math.max(0.2, 1 - d / r);
    return [centro[0] + (x - centro[0]) * k, centro[1] + (y - centro[1]) * k];
  });
}

/** Cúpula de la cavidad (de abajo arriba): el borde del hueso trabecular que mira a la cavidad. */
function cupulaCavidad(): Vec2[] {
  const largo = X_CAVIDAD - X_DIAFISIS;
  const t0 = Math.acos((X_TRABECULAR - X_DIAFISIS) / largo);
  return muestras(-t0, t0, 40).map((t): Vec2 => [
    X_DIAFISIS + largo * Math.cos(t),
    H_CAVIDAD * Math.sin(t),
  ]);
}

/**
 * Contorno del hueso trabecular en la cara de corte: por dentro de la cortical, desde la cúpula de la cavidad hasta
 * la placa subcondral (arriba de izquierda a derecha, la punta, abajo de vuelta y la cúpula de abajo arriba).
 */
export function contornoTrabecular(): Vec2[] {
  const x0 = X_TRABECULAR;
  const arriba = contornoInterior().filter(([x]) => x > x0);
  return [...completo([[x0, radioInterior(x0)], ...arriba]), ...cupulaCavidad()];
}

/** Línea epifisaria: eje de la banda que cruza el hueso trabecular. */
function ejeLinea(): Vec2[] {
  const alto = radioInterior(X_LINEA) + 0.008;
  return muestras(-alto, alto, 30).map((y): Vec2 => [xLinea(y), y]);
}

/* ----- Médula ----- */

const AMARILLA = new Color(COLORES.medulaAmarilla);
const ROJA = new Color(COLORES.medulaRoja);

/** Cuánto de médula roja hay en un punto (0, amarilla; 1, roja): roja entre trabéculas, amarilla en la cavidad. */
export function fraccionRoja(x: number, y: number): number {
  const ruido = 0.06 * Math.sin(x * 23 + y * 7) * Math.sin(y * 19 - x * 5);
  return suave((campoCavidad(x, y) - 0.9 + ruido) / 0.3);
}

/** Malla de la médula sobre el interior de la cara de corte, con color por vértice (amarilla o roja). */
function mallaMedula(): BufferGeometry {
  const xs = muestras(X_IZQ, X_FIN_INTERIOR, 110);
  const filas = 30;
  const columnas = xs.length;
  const posiciones = new Float32Array(columnas * (filas + 1) * 3);
  const colores = new Float32Array(columnas * (filas + 1) * 3);
  const normales = new Float32Array(columnas * (filas + 1) * 3);
  const uv = new Float32Array(columnas * (filas + 1) * 2);
  const c = new Color();
  xs.forEach((x, i) => {
    const alto = Math.max(0, radioInterior(x) - ENDOSTIO * 0.5);
    for (let j = 0; j <= filas; j++) {
      const y = -alto + (2 * alto * j) / filas;
      const k = i * (filas + 1) + j;
      posiciones.set([x, y, H_MEDULA], k * 3);
      normales.set([0, 0, 1], k * 3);
      uv.set([x, y], k * 2);
      c.copy(AMARILLA).lerp(ROJA, fraccionRoja(x, y));
      colores.set([c.r, c.g, c.b], k * 3);
    }
  });
  const indices: number[] = [];
  for (let i = 0; i < columnas - 1; i++) {
    for (let j = 0; j < filas; j++) {
      const a = i * (filas + 1) + j;
      const b = a + filas + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new Geometria();
  g.setAttribute('position', new BufferAttribute(posiciones, 3));
  g.setAttribute('normal', new BufferAttribute(normales, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setAttribute('color', new BufferAttribute(colores, 3));
  g.setIndex(indices);
  return g;
}

/* ----- Corte transversal de la izquierda ----- */

/** Marco del corte transversal de la diáfisis: plano x = X_IZQ, mirando a −X; la mitad de atrás (z ≤ 0). */
const MARCO_IZQ = marcoCara([X_IZQ, 0, 0], [0, 0, 1], [0, 1, 0]);

/** Media corona del corte transversal (de `r1` a `r2`), del lado z ≤ 0. */
function coronaIzq(r1: number, r2: number): BufferGeometry {
  return enCara(anilloPlano(0, 0, r1, r2, 0, Math.PI / 2, Math.PI, 48), MARCO_IZQ);
}

/* ----- Vasos del periostio ----- */

/** Vasos que recorren el periostio por la cara de atrás del hueso (el periostio irriga la parte externa de la cortical). */
function vasosPeriostio(): BufferGeometry[] {
  // Radio de la superficie del periostio (desplazada por la normal; en la epífisis no es radioExterior + grosor).
  const perfil = desplazar(tramoPeriostio(), PERIOSTIO_TOTAL);
  const r = (x: number): number => {
    const i = Math.max(
      1,
      perfil.findIndex(([px]) => px >= x),
    );
    const [x0, r0] = perfil[i - 1]!;
    const [x1, r1] = perfil[Math.min(i, perfil.length - 1)]!;
    return mezclar(r0, r1, x1 > x0 ? (x - x0) / (x1 - x0) : 0) + 0.003;
  };
  const sobre = (x: number, fi: number): Vec3 => [x, r(x) * Math.cos(fi), -r(x) * Math.sin(fi)];
  const tubos: BufferGeometry[] = [];
  for (const [fi0, fase] of [
    [0.55, 0],
    [1.5, 1.7],
    [2.45, 3.1],
  ] as const) {
    const xs = muestras(X_IZQ + 0.05, X_CARTILAGO - 0.08, 12);
    tubos.push(
      tubo(
        xs.map((x) => sobre(x, fi0 + 0.12 * Math.sin(x * 3 + fase))),
        0.009,
        60,
        6,
      ),
    );
    // Una rama que se separa hacia la epífisis.
    const xr = muestras(0.0, X_CARTILAGO - 0.15, 6);
    tubos.push(
      tubo(
        xr.map((x, i) => sobre(x, fi0 + 0.05 * Math.sin(fase) + 0.07 * i)),
        0.006,
        24,
        5,
      ),
    );
  }
  return tubos;
}

/* ----- Modelo ----- */

/** La banda de arriba y su espejo de abajo, en la cara de corte (el espejo se triangula de nuevo: sin invertir caras). */
function arribaYAbajo(contornoArriba: readonly Vec2[]): BufferGeometry[] {
  return [cara(contornoArriba, H_CORTE), cara(espejo(contornoArriba), H_CORTE)];
}

/** Construye el extremo del hueso largo serrado: un grupo con un subgrupo por región. */
export function crearHuesoCapas(): Group {
  const modelo = region('hueso_capas');
  const exterior = contornoExterior();
  const interior = contornoInterior();
  const rIzq = radioExterior(X_IZQ);
  const riIzq = radioInterior(X_IZQ);

  // Periostio: superficie de atrás, sus dos capas en la cara de corte y en el corte transversal, y sus vasos.
  const periostio = tramoPeriostio();
  const exteriorPeriostio = desplazar(periostio, PERIOSTIO_TOTAL);
  const fibroso = material(COLORES.periostioFibroso, 'membrana', [3, 8]);
  const celular = material(COLORES.periostioCelular, 'membrana', [3, 8]);
  const vaso = material(COLORES.vaso, 'vaso');
  const puntosVasoCorte = desplazar(periostio, (PERIOSTIO_CELULAR + PERIOSTIO_TOTAL) / 2).filter(
    (_, i) => i % 9 === 4,
  );
  modelo.add(
    region(
      'periostio',
      malla(
        unir([
          medioTorno(exteriorPeriostio.map(([x, r]) => [x, r])),
          ...arribaYAbajo(banda(periostio, PERIOSTIO_CELULAR, PERIOSTIO_TOTAL)),
          coronaIzq(rIzq + PERIOSTIO_CELULAR, rIzq + PERIOSTIO_TOTAL),
        ]),
        fibroso,
        'periostio_fibroso',
      ),
      malla(
        unir([
          ...arribaYAbajo(banda(periostio, 0, PERIOSTIO_CELULAR)),
          coronaIzq(rIzq, rIzq + PERIOSTIO_CELULAR),
        ]),
        celular,
        'periostio_celular',
      ),
      malla(
        unir([
          ...vasosPeriostio(),
          // Vasos de la capa fibrosa cortados en la cara de corte: puntos rojos.
          ...puntosVasoCorte.flatMap(([x, y]) => [
            anilloPlano(x, y, 0, 0.0055, H_CORTE + 0.0006, 0, Math.PI * 2, 12),
            anilloPlano(x, -y, 0, 0.0055, H_CORTE + 0.0006, 0, Math.PI * 2, 12),
          ]),
        ]),
        vaso,
        'periostio_vasos',
      ),
    ),
  );

  // Cortical: la banda en U de la cara de corte (gruesa en la diáfisis, fina en la epífisis) y su anillo transversal.
  const corteCortical = [...completo(exterior), ...completo(interior).reverse()];
  modelo.add(
    region(
      'hueso_cortical',
      malla(
        unir([
          cara(corteCortical, H_CORTE),
          // Canto interior de la cortical, hasta la médula hundida.
          paredes(completo(interior), H_CORTE, H_MEDULA - 0.002),
          coronaIzq(riIzq, rIzq),
        ]),
        material(COLORES.cortical, 'hueso', 3),
        'hueso_cortical_corte',
      ),
    ),
  );

  // Hueso trabecular: hueso que llena el interior de la epífisis y la metáfisis, perforado por los espacios
  // medulares (lo que queda entre ellos son las trabéculas, en arcadas), y la línea epifisaria.
  const espacios = espaciosMedulares();
  const linea = ejeLinea();
  modelo.add(
    region(
      'hueso_trabecular',
      malla(
        prisma(
          contornoTrabecular(),
          H_CORTE,
          H_FONDO_TRABECULA,
          espacios.map((e) => e.contorno),
        ),
        material(COLORES.trabecula, 'hueso', 4),
        'hueso_trabecular_trabeculas',
      ),
      malla(
        cara(trazo(linea, 2 * MEDIO_LINEA), H_LINEA),
        material(COLORES.linea, 'hueso', 4),
        'linea_epifisaria',
      ),
    ),
  );

  // Endostio: tapiza la cara interna de la cortical, la cúpula de la cavidad y cada trabécula (el borde de cada
  // espacio medular).
  modelo.add(
    region(
      'endostio',
      malla(
        unir([
          cara(banda(completo(interior), -ENDOSTIO, 0), H_ENDOSTIO),
          cara(banda(cupulaCavidad(), 0, ENDOSTIO), H_ENDOSTIO),
          ...espacios.map((e) =>
            cara(e.contorno, H_ENDOSTIO, [encoger(e.contorno, e.centro, ENDOSTIO * 0.75)]),
          ),
          coronaIzq(riIzq - ENDOSTIO, riIzq),
        ]),
        material(COLORES.endostio, 'membrana', [4, 10]),
        'endostio_capa',
      ),
    ),
  );

  // Médula ósea: amarilla en la cavidad y roja entre las trabéculas; de frente, en el corte transversal.
  modelo.add(
    region(
      'medula_osea',
      malla(
        mallaMedula(),
        material('#ffffff', 'medula', 3, { vertexColors: true }),
        'medula_osea_corte',
      ),
      malla(
        coronaIzq(0, riIzq - ENDOSTIO),
        material(COLORES.medulaAmarilla, 'medula', 3),
        'medula_osea_transversal',
      ),
    ),
  );

  // Cartílago articular (no es una región de la actividad): cubre la superficie articular, sin periostio.
  const articular = tramoArticular();
  modelo.add(
    region(
      'cartilago_articular',
      malla(
        unir([
          medioTorno(desplazar(articular, GROSOR_CARTILAGO).map(([x, r]) => [x, Math.max(0, r)])),
          cara(banda(completo(articular), 0, GROSOR_CARTILAGO), H_CORTE),
        ]),
        material(COLORES.cartilago, 'cartilago', 2),
        'cartilago_articular',
      ),
    ),
  );
  return modelo;
}

/* ----- Puntos de las etiquetas ----- */

const FRENTE: Vec3 = [0, 0, 1];

/** Punto de la etiqueta de cada región, sobre la cara de corte (de izquierda a derecha, sin amontonarse). */
export function puntoDeRegion(id: RegionHuesoCapas): PuntoRegion {
  switch (id) {
    case 'endostio': {
      const x = -1.3;
      return {
        punto: [x, radioInterior(x) - ENDOSTIO / 2, H_ENDOSTIO + 0.0005],
        normal: FRENTE,
        radio: 0.25,
      };
    }
    case 'hueso_cortical': {
      const x = -0.95;
      return {
        punto: [x, -(radioExterior(x) - CORTICAL_DIAFISIS / 2), H_CORTE + 0.0005],
        normal: FRENTE,
        radio: 0.45,
      };
    }
    case 'medula_osea':
      return { punto: [-0.5, -0.03, H_MEDULA + 0.0005], normal: FRENTE, radio: 0.5 };
    case 'periostio': {
      const [x, y] = masCercano(
        desplazar(tramoPeriostio(), (PERIOSTIO_CELULAR + PERIOSTIO_TOTAL) / 2),
        (p) => p,
        [0.05, 1],
      );
      return { punto: [x, y, H_CORTE + 0.0005], normal: FRENTE, radio: 0.35 };
    }
    case 'hueso_trabecular': {
      // En la pared de hueso junto a un espacio medular de la epífisis: en medio de una trabécula.
      const e = masCercano(espaciosMedulares(), (x) => x.centro, [0.85, 0.3]);
      const borde = e.contorno.reduce((m, p) => (p[1] > m[1] ? p : m));
      const dx = borde[0] - e.centro[0];
      const dy = borde[1] - e.centro[1];
      const k = 1 + GROSOR_TRABECULA / 2 / Math.hypot(dx, dy);
      return {
        punto: [e.centro[0] + dx * k, e.centro[1] + dy * k, H_CORTE + 0.0005],
        normal: FRENTE,
        radio: 0.5,
      };
    }
  }
}

export function esRegionHuesoCapas(id: string): id is RegionHuesoCapas {
  return (REGIONES_HUESO_CAPAS as readonly string[]).includes(id);
}
