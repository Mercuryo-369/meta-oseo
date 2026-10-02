/**
 * Disposición de la escena del movimiento ortodóntico: los PERFILES en 2D del corte mesiodistal (bloque, región
 * trabecular, encía, diente, pulpa) y, para cada estado, los contornos del alvéolo que se deforman con el tiempo
 * (raíz, pared del alvéolo, lámina, hueso nuevo, ribete de osteoide) más las piezas repetidas (trabéculas,
 * fibras, vasos, células). Lógica PURA: solo números, deterministas, sin three ni Vue, para poder probarla y
 * para que el dibujo no cambie entre cargas. `geometria.ts` y `mallas.ts` convierten estos polígonos en formas.
 *
 * Convención: cada punto es `[x, y]` en el plano de corte (z = 0). −X es mesial (izquierda de la pantalla), +X
 * distal (derecha, hacia donde se mueve el diente); +Y hacia la cresta. Los contornos del alvéolo se recorren
 * de la cresta izquierda, por el ápice, a la cresta derecha, con el MISMO número de muestras
 * (`N_MUESTRAS_RAIZ`) sea cual sea el estado: así las bandas entre dos contornos son mallas de topología fija
 * que solo cambian de posición.
 */
import { generadorDeterminista } from '../interpolacion';
import {
  ALTO_CORONA,
  ALTO_ENCIA,
  DESPLAZAMIENTO_MAXIMO,
  ESTRECHAMIENTO_COMPRESION,
  GROSOR_CORTICAL,
  GROSOR_LAMINA,
  GROSOR_LIGAMENTO,
  INCLINACION_MAXIMA,
  N_TRABECULAS,
  PROFUNDIDAD_LAGUNAS,
  PROFUNDIDAD_TRABECULAR,
  RADIO_APICE,
  SEMIANCHO_BLOQUE,
  SEMIANCHO_CORONA,
  SEMIANCHO_RAIZ,
  X_DIENTE_INICIAL,
  Y_APICE,
  Y_BASE,
  Y_CENTRO_ROTACION,
  Y_CRESTA,
} from './estado';
import type { EstadoOrtodoncia } from './estado';

export type Punto2 = readonly [x: number, y: number];

/** Muestras del contorno de la raíz (impar: la muestra central es el fondo del ápice). */
export const N_MUESTRAS_RAIZ = 97;
/** Índice de la muestra del fondo del ápice; las muestras 0..centro son el lado izquierdo (mesial). */
export const INDICE_APICE = (N_MUESTRAS_RAIZ - 1) / 2;
/** Muestras que forman el casquete redondeado del ápice. */
const N_CASQUETE = 13;
/** Centro del casquete apical (Y). */
export const Y_CENTRO_APICE = Y_APICE + RADIO_APICE;
/** Grosor del ribete de osteoide sobre la pared de tensión, en pleno depósito. */
export const GROSOR_OSTEOIDE = 0.045;
/** Muestras por laguna de Howship en la pared de compresión. */
const PERIODO_LAGUNAS = 5;

/* -------------------------------------------------------------------------------------------
 * Utilidades de polígonos
 * ----------------------------------------------------------------------------------------- */

/** Alturas entre `desde` y `hasta` con paso más fino en los extremos (coseno). */
export function alturasMuestreadas(desde: number, hasta: number, pasos: number): number[] {
  const lista: number[] = [];
  for (let i = 0; i <= pasos; i++) {
    const k = (1 - Math.cos((Math.PI * i) / pasos)) / 2;
    lista.push(desde + (hasta - desde) * k);
  }
  return lista;
}

/**
 * Rectángulo con las esquinas redondeadas (radios distintos arriba y abajo), antihorario, empezando por la
 * esquina inferior izquierda.
 */
export function rectanguloRedondeado(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  radios: { arriba: number; abajo: number },
  pasosEsquina = 8,
): Punto2[] {
  const puntos: Punto2[] = [];
  const esquina = (cx: number, cy: number, r: number, desde: number): void => {
    for (let i = 0; i <= pasosEsquina; i++) {
      const a = desde + (Math.PI / 2) * (i / pasosEsquina);
      puntos.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  esquina(x0 + radios.abajo, y0 + radios.abajo, radios.abajo, Math.PI);
  esquina(x1 - radios.abajo, y0 + radios.abajo, radios.abajo, 1.5 * Math.PI);
  esquina(x1 - radios.arriba, y1 - radios.arriba, radios.arriba, 0);
  esquina(x0 + radios.arriba, y1 - radios.arriba, radios.arriba, 0.5 * Math.PI);
  return sinRepetidos(puntos);
}

function sinRepetidos(puntos: readonly Punto2[]): Punto2[] {
  const salida: Punto2[] = [];
  for (const p of puntos) {
    const u = salida[salida.length - 1];
    if (u && Math.abs(u[0] - p[0]) < 1e-6 && Math.abs(u[1] - p[1]) < 1e-6) continue;
    salida.push(p);
  }
  const primero = salida[0];
  const ultimo = salida[salida.length - 1];
  if (
    salida.length > 1 &&
    primero &&
    ultimo &&
    Math.abs(primero[0] - ultimo[0]) < 1e-6 &&
    Math.abs(primero[1] - ultimo[1]) < 1e-6
  ) {
    salida.pop();
  }
  return salida;
}

/** ¿El punto cae dentro del polígono? (regla par-impar). */
export function dentroDePoligono(p: Punto2, poligono: readonly Punto2[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i]!;
    const [xj, yj] = poligono[j]!;
    const cruza = yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

/** Caja envolvente de un polígono. */
export function cajaDe(poligono: readonly Punto2[]): {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
} {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const [x, y] of poligono) {
    xMin = Math.min(xMin, x);
    xMax = Math.max(xMax, x);
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  }
  return { xMin, xMax, yMin, yMax };
}

/* -------------------------------------------------------------------------------------------
 * Bloque, región trabecular y encía (estáticos)
 * ----------------------------------------------------------------------------------------- */

/** Contorno del bloque de proceso alveolar: base redondeada, cresta casi recta. */
export function perfilBloque(): Punto2[] {
  return rectanguloRedondeado(-SEMIANCHO_BLOQUE, SEMIANCHO_BLOQUE, Y_BASE, Y_CRESTA, {
    arriba: 0.1,
    abajo: 0.7,
  });
}

/** Región del hueso trabecular: el interior de la cortical (tablas de los extremos, base y cresta). */
export function regionTrabecular(): Punto2[] {
  return rectanguloRedondeado(
    -SEMIANCHO_BLOQUE + GROSOR_CORTICAL.lados,
    SEMIANCHO_BLOQUE - GROSOR_CORTICAL.lados,
    Y_BASE + GROSOR_CORTICAL.base,
    Y_CRESTA - GROSOR_CORTICAL.cresta,
    { arriba: 0.3, abajo: 0.45 },
  );
}

/** La encía: una banda sobre la cresta, con los bordes superiores redondeados. */
export function perfilEncia(): Punto2[] {
  return rectanguloRedondeado(
    -SEMIANCHO_BLOQUE,
    SEMIANCHO_BLOQUE,
    Y_CRESTA - 0.02,
    Y_CRESTA + ALTO_ENCIA,
    { arriba: 0.14, abajo: 0.02 },
  );
}

/* -------------------------------------------------------------------------------------------
 * El diente en su propio marco (eje en x = 0, sin inclinar): raíz, corona, pulpa
 * ----------------------------------------------------------------------------------------- */

/** Semiancho de la raíz a la altura `y`: `RADIO_APICE` en el centro del casquete, `SEMIANCHO_RAIZ` en la cresta. */
export function semianchoRaiz(y: number): number {
  const k = Math.max(0, Math.min(1, (y - Y_CENTRO_APICE) / (Y_CRESTA - Y_CENTRO_APICE)));
  return RADIO_APICE + (SEMIANCHO_RAIZ - RADIO_APICE) * Math.pow(k, 0.75);
}

export interface ContornoRaiz {
  puntos: Punto2[];
  /** Normal exterior unitaria en cada muestra. */
  normales: Punto2[];
}

/**
 * Contorno de la raíz con `N_MUESTRAS_RAIZ` muestras: lado izquierdo de la cresta al ápice, casquete redondeado
 * y lado derecho del ápice a la cresta. Las normales salen de las diferencias centrales del propio contorno.
 */
export function contornoRaiz(): ContornoRaiz {
  const nLado = (N_MUESTRAS_RAIZ - N_CASQUETE) / 2;
  const alturas = alturasMuestreadas(Y_CRESTA, Y_CENTRO_APICE, nLado);
  const puntos: Punto2[] = [];
  for (let i = 0; i < nLado; i++) puntos.push([-semianchoRaiz(alturas[i]!), alturas[i]!]);
  for (let i = 0; i < N_CASQUETE; i++) {
    const a = Math.PI + (Math.PI * i) / (N_CASQUETE - 1);
    puntos.push([RADIO_APICE * Math.cos(a), Y_CENTRO_APICE + RADIO_APICE * Math.sin(a)]);
  }
  for (let i = nLado - 1; i >= 0; i--) puntos.push([semianchoRaiz(alturas[i]!), alturas[i]!]);

  const normales: Punto2[] = puntos.map((_, i) => {
    const a = puntos[Math.max(0, i - 1)]!;
    const b = puntos[Math.min(puntos.length - 1, i + 1)]!;
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const largo = Math.hypot(tx, ty) || 1;
    // Perpendicular a la tangente, hacia fuera (el contorno se recorre en sentido antihorario).
    return [ty / largo, -tx / largo];
  });
  return { puntos, normales };
}

/** Silueta cerrada de la raíz (el contorno cerrado por el cuello), para el abanico de la dentina. */
export function siluetaRaiz(): Punto2[] {
  return contornoRaiz().puntos;
}

/**
 * Perfil de la corona para un torno (`LatheGeometry`): `[radio, y]` desde el cuello hasta la cúspide. Canino
 * esquemático: un bulbo bajo y una cúspide puntiaguda.
 */
export function perfilCorona(): readonly (readonly [radio: number, y: number])[] {
  const y0 = Y_CRESTA - 0.05;
  const h = ALTO_CORONA;
  return [
    [SEMIANCHO_RAIZ - 0.02, y0],
    [SEMIANCHO_RAIZ + 0.02, y0 + 0.12],
    [SEMIANCHO_CORONA, y0 + h * 0.38],
    [SEMIANCHO_CORONA * 0.92, y0 + h * 0.6],
    [SEMIANCHO_CORONA * 0.66, y0 + h * 0.8],
    [SEMIANCHO_CORONA * 0.3, y0 + h * 0.94],
    [0.04, y0 + h * 0.995],
    [0, y0 + h],
  ];
}

/** Silueta de la corona en el plano de corte (el perfil del torno y su reflejo), antihoraria. */
export function siluetaCorona(): Punto2[] {
  const perfil = perfilCorona();
  const puntos: Punto2[] = [];
  for (const [r, y] of perfil) puntos.push([r, y]);
  for (let i = perfil.length - 2; i >= 0; i--) puntos.push([-perfil[i]![0], perfil[i]![1]]);
  return sinRepetidos(puntos);
}

/** Silueta de la pulpa: conducto radicular estrecho y cámara pulpar en la corona. Antihoraria. */
export function siluetaPulpa(): Punto2[] {
  const derecha: Punto2[] = [];
  for (const y of alturasMuestreadas(Y_CENTRO_APICE + 0.2, Y_CRESTA, 12)) {
    derecha.push([0.3 * semianchoRaiz(y), y]);
  }
  derecha.push([0.15, Y_CRESTA + 0.3], [0.08, Y_CRESTA + 0.58]);
  const puntos: Punto2[] = [[0, Y_CENTRO_APICE + 0.12], ...derecha, [0, Y_CRESTA + 0.72]];
  for (let i = derecha.length - 1; i >= 0; i--) puntos.push([-derecha[i]![0], derecha[i]![1]]);
  return sinRepetidos(puntos);
}

/* -------------------------------------------------------------------------------------------
 * Transformación del diente y contornos del alvéolo según el estado
 * ----------------------------------------------------------------------------------------- */

export interface PoseDiente {
  /** Avance del eje del diente en X (unidades). */
  x: number;
  /** Inclinación de la corona hacia distal (radianes, positiva = horaria). */
  angulo: number;
}

/** Pose del diente en un estado: posición del eje e inclinación. */
export function poseDiente(estado: EstadoOrtodoncia): PoseDiente {
  return {
    x: X_DIENTE_INICIAL + DESPLAZAMIENTO_MAXIMO * estado.diente.desplazamiento,
    angulo: INCLINACION_MAXIMA * estado.diente.inclinacion,
  };
}

/** Lleva un punto del marco del diente al plano de corte: giro horario alrededor del centro de rotación y avance. */
export function transformarPunto(p: Punto2, pose: PoseDiente): Punto2 {
  const c = Math.cos(pose.angulo);
  const s = Math.sin(pose.angulo);
  const dy = p[1] - Y_CENTRO_ROTACION;
  return [pose.x + p[0] * c + dy * s, Y_CENTRO_ROTACION - p[0] * s + dy * c];
}

/** Gira un vector (una normal) con la pose, sin trasladarlo. */
export function girarVector(v: Punto2, pose: PoseDiente): Punto2 {
  const c = Math.cos(pose.angulo);
  const s = Math.sin(pose.angulo);
  return [v[0] * c + v[1] * s, -v[0] * s + v[1] * c];
}

export function transformarContorno(puntos: readonly Punto2[], pose: PoseDiente): Punto2[] {
  return puntos.map((p) => transformarPunto(p, pose));
}

/**
 * Cuánto se corre la raíz DENTRO de su alvéolo hacia distal cuando la fuerza comprime el ligamento: el ligamento
 * del lado derecho se estrecha esa distancia y el del izquierdo se ensancha otro tanto. La pared del alvéolo no
 * se mueve con esto (es hueso): solo con `diente.desplazamiento`, que es el remodelado.
 */
export function corrimientoEnAlveolo(estado: EstadoOrtodoncia): number {
  return GROSOR_LIGAMENTO * ESTRECHAMIENTO_COMPRESION * estado.ligamento.compresion;
}

/** Lleva un punto del marco del diente (raíz, corona, pulpa) al plano de corte, con su corrimiento en el alvéolo. */
export function puntoDiente(p: Punto2, estado: EstadoOrtodoncia): Punto2 {
  return transformarPunto([p[0] + corrimientoEnAlveolo(estado), p[1]], poseDiente(estado));
}

export function contornoDiente(puntos: readonly Punto2[], estado: EstadoOrtodoncia): Punto2[] {
  return puntos.map((p) => puntoDiente(p, estado));
}

/** Grosor de la lámina: la pared de compresión se adelgaza a medida que se reabsorbe. */
export function grosorLamina(nx: number, estado: EstadoOrtodoncia): number {
  return GROSOR_LAMINA * (1 - 0.45 * estado.compresion.resorcion * Math.max(0, nx));
}

/** Profundidad de la laguna de Howship en la muestra `i` de la pared de compresión (festón periódico). */
export function profundidadLaguna(i: number, nx: number, estado: EstadoOrtodoncia): number {
  const feston = 0.5 * (1 - Math.cos((2 * Math.PI * i) / PERIODO_LAGUNAS));
  return PROFUNDIDAD_LAGUNAS * estado.compresion.resorcion * Math.max(0, nx) * feston;
}

export interface PerfilesAlveolo {
  /** Contorno de la raíz en el plano de corte (cemento). */
  raiz: Punto2[];
  /** Pared del alvéolo: borde interno del hueso alveolar propio (con las lagunas de Howship, si las hay). */
  pared: Punto2[];
  /** Borde externo del hueso alveolar propio (la lámina). */
  lamina: Punto2[];
  /** Borde del ribete de osteoide hacia el ligamento (solo tiene grosor del lado de tensión). */
  osteoide: Punto2[];
  /** Normales exteriores en el plano de corte. */
  normales: Punto2[];
}

/** Contorno base de la raíz, calculado una vez. */
const BASE = contornoRaiz();

/**
 * Los contornos del alvéolo en un estado. El ALVÉOLO (pared y lámina) sigue la pose del diente (avance por
 * remodelado e inclinación); la RAÍZ, además, se corre dentro de él hacia el lado de compresión.
 */
export function perfilesAlveolo(estado: EstadoOrtodoncia): PerfilesAlveolo {
  const pose = poseDiente(estado);
  const raiz = contornoDiente(BASE.puntos, estado);
  const normales = BASE.normales.map((n) => girarVector(n, pose));
  const pared: Punto2[] = [];
  const lamina: Punto2[] = [];
  const osteoide: Punto2[] = [];
  for (let i = 0; i < BASE.puntos.length; i++) {
    const [nx, ny] = normales[i]!;
    const base = BASE.puntos[i]!;
    const g = GROSOR_LIGAMENTO + profundidadLaguna(i, nx, estado);
    const l = grosorLamina(nx, estado);
    const ribete = GROSOR_OSTEOIDE * estado.tension.osteoide * Math.max(0, -nx);
    const [x, y] = transformarPunto(base, pose);
    pared.push([x + nx * g, y + ny * g]);
    lamina.push([x + nx * (g + l), y + ny * (g + l)]);
    osteoide.push([x + nx * (g - ribete), y + ny * (g - ribete)]);
  }
  return { raiz, pared, lamina, osteoide, normales };
}

/** Pared del alvéolo en reposo (antes de la fuerza): de ahí a la pared actual va el hueso nuevo. */
export function paredInicial(): Punto2[] {
  const pose: PoseDiente = { x: X_DIENTE_INICIAL, angulo: 0 };
  return BASE.puntos.map((p, i) => {
    const n = BASE.normales[i]!;
    return transformarPunto([p[0] + n[0] * GROSOR_LIGAMENTO, p[1] + n[1] * GROSOR_LIGAMENTO], pose);
  });
}

/** Silueta del diente entero (raíz y corona) en reposo, para la marca punteada de la posición inicial. */
export function siluetaDienteInicial(): Punto2[] {
  const pose: PoseDiente = { x: X_DIENTE_INICIAL, angulo: 0 };
  // La raíz termina en el cuello derecho y la corona empieza ahí, sube por la derecha y baja por la izquierda
  // hasta el cuello izquierdo, donde empezó la raíz: un solo contorno antihorario.
  return transformarContorno([...BASE.puntos, ...siluetaCorona()], pose);
}

/* -------------------------------------------------------------------------------------------
 * Trabéculas
 * ----------------------------------------------------------------------------------------- */

export interface TrabeculaOrtodoncia {
  x: number;
  y: number;
  /** Profundidad (z, negativa: dentro del hueco). */
  z: number;
  /** Ángulo en el plano XY (0 = a lo largo de +X, PI/2 = vertical). */
  angulo: number;
  largo: number;
}

/**
 * ¿El punto cae en la huella que barre el diente (raíz ensanchada `margen`) en todo su recorrido? Sirve para no
 * poner trabéculas donde luego se pintan el alvéolo y su hueso nuevo.
 */
export function dentroDeHuellaDiente(p: Punto2, margen: number): boolean {
  const [x, y] = p;
  if (y > Y_CRESTA + 0.01 || y < Y_APICE - margen) return false;
  // El barrido en X es un intervalo: basta comparar con el eje más cercano dentro de él.
  const xMin = X_DIENTE_INICIAL;
  const xMax = X_DIENTE_INICIAL + DESPLAZAMIENTO_MAXIMO;
  const eje = Math.max(xMin, Math.min(xMax, x));
  const dx = Math.abs(x - eje);
  if (y >= Y_CENTRO_APICE) return dx < semianchoRaiz(y) + margen;
  return Math.hypot(dx, y - Y_CENTRO_APICE) < RADIO_APICE + margen;
}

/** Margen alrededor de la raíz que ocupan el ligamento, las lagunas y la lámina, más un poco de aire. */
export const MARGEN_HUELLA = GROSOR_LIGAMENTO + PROFUNDIDAD_LAGUNAS + GROSOR_LAMINA + 0.1;

/**
 * `N_TRABECULAS` barras dentro de la región trabecular y fuera de la huella del diente, con orientación
 * variada y algo más vertical cerca de la base (líneas de carga esquemáticas). Deterministas.
 */
export function trabeculasOrtodoncia(semilla = 505): TrabeculaOrtodoncia[] {
  const azar = generadorDeterminista(semilla);
  const region = regionTrabecular();
  const caja = cajaDe(region);
  const resultado: TrabeculaOrtodoncia[] = [];
  let intentos = 0;
  while (resultado.length < N_TRABECULAS && intentos < N_TRABECULAS * 60) {
    intentos++;
    const x = caja.xMin + (caja.xMax - caja.xMin) * azar();
    const y = caja.yMin + (caja.yMax - caja.yMin) * azar();
    if (!dentroDePoligono([x, y], region)) continue;
    if (dentroDeHuellaDiente([x, y], MARGEN_HUELLA)) continue;
    // Cerca del diente, en abanico desde la raíz; lejos, más vertical.
    const radial = Math.atan2(y - 0.2, x - X_DIENTE_INICIAL - DESPLAZAMIENTO_MAXIMO / 2);
    const lejania = Math.min(1, Math.abs(x - X_DIENTE_INICIAL) / 2.2);
    const angulo = radial * (1 - lejania) + (Math.PI / 2) * lejania + (azar() - 0.5) * 1.1;
    resultado.push({
      x,
      y,
      z: -0.03 - (PROFUNDIDAD_TRABECULAR - 0.06) * azar(),
      angulo,
      largo: 0.28 + azar() * 0.34,
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Fibras, vasos y células: posiciones como ÍNDICES de muestra del contorno (siguen al diente solas)
 * ----------------------------------------------------------------------------------------- */

export interface FibraLigamento {
  /** Muestra de la pared donde nace la fibra. */
  pared: number;
  /** Muestra de la raíz donde termina (más abajo que la de la pared: fibras oblicuas). */
  raiz: number;
}

/**
 * Fibras del ligamento: oblicuas a ambos lados (del hueso, más arriba, al cemento, más abajo) y radiales en el
 * ápice. Cada fibra se dibuja como una polilínea de cuatro puntos para poder arrugarla.
 */
export function fibrasLigamento(): FibraLigamento[] {
  const fibras: FibraLigamento[] = [];
  const nLado = (N_MUESTRAS_RAIZ - N_CASQUETE) / 2;
  const caida = 2;
  for (let i = 2; i + caida < nLado; i += 3) fibras.push({ pared: i, raiz: i + caida });
  for (let i = N_MUESTRAS_RAIZ - 3; i - caida >= N_MUESTRAS_RAIZ - nLado; i -= 3) {
    fibras.push({ pared: i, raiz: i - caida });
  }
  for (let i = nLado + 1; i < nLado + N_CASQUETE - 1; i += 2) fibras.push({ pared: i, raiz: i });
  return fibras;
}

/**
 * Los cuatro puntos de una fibra en un estado: recta y tensa del lado de tensión, arrugada (zigzag) del lado
 * de compresión; en reposo, algo ondulada en ambos lados.
 */
export function puntosFibra(
  perfiles: PerfilesAlveolo,
  fibra: FibraLigamento,
  estado: EstadoOrtodoncia,
): Punto2[] {
  const a = perfiles.osteoide[fibra.pared]!;
  const b = perfiles.raiz[fibra.raiz]!;
  const nx = perfiles.normales[fibra.pared]![0];
  const lado = nx > 0.3 ? 'compresion' : nx < -0.3 ? 'tension' : 'apice';
  let amplitud = 0.22;
  if (lado === 'compresion') amplitud = 0.22 + 0.55 * estado.ligamento.compresion;
  if (lado === 'tension') amplitud = 0.22 * (1 - estado.ligamento.tension);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const largo = Math.hypot(dx, dy) || 1;
  const px = (-dy / largo) * amplitud * largo * 0.5;
  const py = (dx / largo) * amplitud * largo * 0.5;
  return [
    a,
    [a[0] + dx / 3 + px, a[1] + dy / 3 + py],
    [a[0] + (2 * dx) / 3 - px, a[1] + (2 * dy) / 3 - py],
    b,
  ];
}

/** Muestras del contorno donde hay un vaso del ligamento, a ambos lados. */
export function indicesVasos(): number[] {
  const izquierda = [6, 15, 24, 33];
  return [...izquierda, ...izquierda.map((i) => N_MUESTRAS_RAIZ - 1 - i)];
}

/** Muestras de la pared de compresión (derecha) donde se posan los osteoclastos. */
export function indicesOsteoclastos(): number[] {
  return [61, 69, 77, 85];
}

/** Muestras de la pared de tensión (izquierda) donde se alinean los osteoblastos. */
export function indicesOsteoblastos(): number[] {
  return [3, 7, 11, 15, 19, 23, 27, 31, 35, 39];
}

/** Tramo de muestras de la pared de compresión que ocupa la zona hialinizada. */
export const TRAMO_HIALINIZADO = { desde: 62, hasta: 80 } as const;
