/**
 * Hueso cortical envejecido en corte transversal, a escala de microscopio: el modelo `tejido_oseo_envejecido` de la
 * exploración 3D (actividad m6_2_multicapa_tejido_envejecido, «Explora un hueso que envejece»; hasta 2026-10-18 era
 * una ilustración hecha con IA sobre el SVG m6_tejido_oseo_envejecido, que dibujaba la osteona con radios en vez de
 * laminillas y los adipocitos rellenos).
 *
 * Es un bloque de tejido cortado: la cara de corte (z = 0) mira a la cámara y el bloque sigue hacia atrás. Arriba, la
 * cortical: una osteona con sus laminillas CONCÉNTRICAS alrededor del conducto de Havers (con un capilar) y su línea
 * cementante festoneada, rodeada de laminillas intersticiales (restos de osteonas antiguas). En las laminillas, pocos
 * osteocitos viables, osteocitos senescentes (dorados, con gránulos de lipofuscina), lagunas vacías (osteocitos
 * muertos por apoptosis) y lagunas rellenas de mineral (micropetrosis); una red canalicular escasa y cortada; una
 * microfisura en el hueso intersticial que se detiene en la línea cementante, y un poro cortical ampliado cerca del
 * endostio. Abajo, la superficie endostal con pocos osteoblastos aplanados y la médula, ocupada sobre todo por
 * adipocitos grandes de una sola gota (vacíos, blanco amarillentos, con el núcleo aplastado contra el borde) y algo
 * de tejido hematopoyético entre ellos. El colágeno con productos de glicación (AGE) va en una lupa sobre la esquina:
 * fibrillas con su bandeo y puentes anormales entre ellas, sin escala.
 *
 * Cada región de la actividad es un grupo con el id de su nodo del catálogo (`content/nodos3d.ts`) y sus propios
 * materiales; lo demás (la matriz, la osteona, los osteocitos viables) son grupos de fondo que no se resaltan.
 * `puntoDeRegion` da el punto de su etiqueta y el tamaño de la zona que encuadra la cámara.
 *
 * Medidas: el bloque va de −2 a 2 en X y de −1,4 a 1,4 en Y (1 unidad ≈ 0,2 mm: una laguna mide unos 15 µm de largo y
 * un adipocito, unos 70 µm); los tamaños de las células no son proporcionales entre sí.
 */
import type { BufferGeometry } from 'three';
import { SphereGeometry, TorusGeometry } from 'three';
import type { Group } from 'three';
import type { PuntoRegion, Vec3 } from '../modelosPorCodigo';
import type { Punto2 } from '../corte2d';
import {
  agrandar,
  anillo,
  azar,
  contornoElipse,
  contornoPolar,
  cupula,
  grupo,
  malla,
  material,
  materialInterior,
  plano,
  prisma,
  tira,
  trazo,
  unir,
  varilla,
} from '../corte2d';

/** Regiones del modelo: los ids de los nodos del catálogo `tejido_oseo_envejecido`. */
export const REGIONES_TEJIDO_ENVEJECIDO = [
  'osteocito_senescente',
  'red_canalicular_reducida',
  'laguna_mineralizada',
  'microfisura',
  'poro_cortical',
  'medula_adiposa',
  'matriz_colageno_age',
  'superficie_osteoblastos_escasos',
] as const;
export type RegionTejidoEnvejecido = (typeof REGIONES_TEJIDO_ENVEJECIDO)[number];

/* ----- Medidas (unidades del modelo) ----- */

export const X_BLOQUE = 2;
export const Y_BLOQUE = 1.4;
const PROFUNDIDAD = 0.5;

/** Centro de la osteona, radio de su conducto de Havers y número de laminillas. */
export const CENTRO_OSTEONA: Punto2 = [-0.6, 0.6];
const LAMINILLAS = 8;
/** La línea cementante festoneada: radio medio, festones y ancho. */
const R_CEMENTANTE = 0.6;
const FESTONES = 14;
const ANCHO_CEMENTANTE = 0.014;
/** Radio de la osteona por fuera de su línea cementante (lo que no puede invadir otra estructura). */
export const R_OSTEONA = R_CEMENTANTE + 0.022 + ANCHO_CEMENTANTE;

/** Poro cortical ampliado, cerca del endostio. */
export const CENTRO_PORO: Punto2 = [0.95, 0.1];

/** Lupa del colágeno con AGE (flota delante de la esquina superior derecha) y la zona de la cara que amplía. */
export const CENTRO_LUPA: Vec3 = [1.42, 0.93, 0.24];
export const R_LUPA = 0.43;
const ZONA_AMPLIADA: Punto2 = [0.78, 0.95];

/** Capas sobre la cara de corte, un poco por delante unas de otras. */
const Z = {
  laminillas: 0.002,
  cementante: 0.003,
  canaliculo: 0.004,
  fisura: 0.004,
  laguna: 0.005,
  endostio: 0.002,
  adipocito: 0.002,
  borde_adipocito: 0.003,
  nucleo: 0.004,
} as const;

const COLORES = {
  matriz: '#e4d5b8',
  laminilla_clara: '#ebe0c9',
  laminilla_oscura: '#dccdae',
  cementante: '#c4ad84',
  conducto: '#8a5a4a',
  capilar: '#b2453d',
  laguna: '#5b4337',
  osteocito: '#8a9ad2',
  senescente: '#c49a55',
  lipofuscina: '#86552a',
  mineral: '#a89c86',
  canaliculo: '#7a5a45',
  fisura: '#3f312b',
  poro: '#7a5143',
  endostio: '#d7b49e',
  osteoblasto: '#8d86c6',
  nucleo: '#4f437e',
  estroma: '#b4604c',
  adipocito: '#f3ead0',
  borde_adipocito: '#e2cd98',
  nucleo_adipocito: '#6b5b94',
  eritroide: '#7e2f2c',
  mieloide: '#6d5a9c',
  fondo_lupa: '#5e4b3e',
  marco_lupa: '#d9d2c3',
  fibrilla_clara: '#efe3c8',
  fibrilla_oscura: '#cdb790',
  age: '#a8691f',
} as const;

/* ----- Formas ----- */

/** Superficie endostal (borde inferior de la cortical) a la altura `x`: ondulada, con una bahía de reabsorción. */
export function yEndostio(x: number): number {
  return (
    -0.3 +
    0.035 * Math.sin(2.1 * x + 0.4) +
    0.02 * Math.sin(5.3 * x) -
    0.06 * Math.exp(-(((x - 0.3) / 0.18) ** 2))
  );
}

/** Radio del conducto de Havers (algo ampliado e irregular). */
function radioConducto(t: number): number {
  return 0.11 * (1 + 0.05 * Math.sin(3 * t));
}

/** Radio interior de la línea cementante: festones con la convexidad hacia fuera (las bahías de la reabsorción). */
function radioCementante(t: number): number {
  return R_CEMENTANTE + 0.022 * Math.abs(Math.sin((FESTONES * t) / 2));
}

/** Contorno del poro cortical: lobulado, como varios conductos fundidos por la reabsorción. */
function radioPoro(t: number): number {
  return 0.17 + 0.035 * Math.sin(3 * t + 0.5) + 0.02 * Math.cos(5 * t);
}

const contornoConducto = (): Punto2[] =>
  contornoPolar(CENTRO_OSTEONA[0], CENTRO_OSTEONA[1], radioConducto, 40);
const contornoPoro = (): Punto2[] => contornoPolar(CENTRO_PORO[0], CENTRO_PORO[1], radioPoro, 56);

function muestras(desde: number, hasta: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => desde + ((hasta - desde) * i) / n);
}

const XS = muestras(-X_BLOQUE, X_BLOQUE, 80);

/* ----- Células y lagunas (datos fijos: los usan el modelo y las etiquetas) ----- */

/** Laguna con su eje largo (tangente a las laminillas). */
export interface Laguna {
  x: number;
  y: number;
  angulo: number;
}

function enOsteona(r: number, grados: number): Laguna {
  const t = (grados * Math.PI) / 180;
  return {
    x: CENTRO_OSTEONA[0] + r * Math.cos(t),
    y: CENTRO_OSTEONA[1] + r * Math.sin(t),
    angulo: t + Math.PI / 2,
  };
}
const suelta = (x: number, y: number, grados: number): Laguna => ({
  x,
  y,
  angulo: (grados * Math.PI) / 180,
});

export const OSTEOCITOS_VIABLES: readonly Laguna[] = [
  enOsteona(0.22, 40),
  enOsteona(0.34, 160),
  enOsteona(0.46, 280),
  enOsteona(0.28, 225),
  enOsteona(0.52, 95),
  suelta(0.32, 0.8, 30),
  suelta(-1.5, 0.6, 100),
  suelta(1.5, 0.36, 10),
  suelta(-1.15, -0.1, 5),
];
export const OSTEOCITOS_SENESCENTES: readonly Laguna[] = [
  enOsteona(0.4, 20),
  enOsteona(0.24, 125),
  enOsteona(0.52, 200),
  suelta(-1.62, -0.1, 160),
  suelta(0.6, 0.7, 75),
];
/** Lagunas vacías: el osteocito murió por apoptosis (forman parte de la región del osteocito senescente). */
export const LAGUNAS_VACIAS: readonly Laguna[] = [
  enOsteona(0.34, 70),
  enOsteona(0.46, 330),
  suelta(-1.25, 0.95, 20),
  suelta(1.3, 0.3, 120),
];
export const LAGUNAS_MINERALIZADAS: readonly Laguna[] = [
  enOsteona(0.4, 250),
  enOsteona(0.28, 300),
  suelta(-1.1, 1.22, 160),
  suelta(0.45, -0.08, 0),
  suelta(-0.4, -0.12, 10),
];

const LAGUNA = { a: 0.042, b: 0.017 } as const;

/** Canalículos que quedan: pocos y cortos por célula, alguno interrumpido. */
function calcularCanaliculos(): Punto2[][] {
  const r = azar(41);
  const salida: Punto2[][] = [];
  const brotes = (l: Laguna, cuantos: number): void => {
    for (let k = 0; k < cuantos; k++) {
      // Perpendiculares al eje largo, hacia un lado y el otro, con algo de desvío.
      const lado = k % 2 === 0 ? 1 : -1;
      const desvio = (r() - 0.5) * 1.1;
      const t = l.angulo + lado * (Math.PI / 2) + desvio;
      const [dx, dy] = [Math.cos(t), Math.sin(t)];
      const inicio = LAGUNA.b + 0.004;
      const largo = 0.05 + r() * 0.07;
      const ondula = (r() - 0.5) * 0.02;
      const tramo = (desde: number, hasta: number): Punto2[] =>
        muestras(desde, hasta, 4).map((s) => {
          const o = ondula * Math.sin((s / (inicio + largo)) * Math.PI * 2);
          return [l.x + dx * s - dy * o, l.y + dy * s + dx * o] as const;
        });
      // Uno de cada tres queda cortado a la mitad (la red se interrumpe).
      if (k === 2) {
        salida.push(
          tramo(inicio, inicio + largo * 0.4),
          tramo(inicio + largo * 0.6, inicio + largo),
        );
      } else salida.push(tramo(inicio, inicio + largo));
    }
  };
  for (const l of OSTEOCITOS_VIABLES) brotes(l, 3);
  for (const l of OSTEOCITOS_SENESCENTES) brotes(l, 1);
  return salida;
}
export const CANALICULOS: readonly (readonly Punto2[])[] = calcularCanaliculos();

/** Microfisura: del hueso intersticial hasta la línea cementante, donde se detiene. */
function calcularFisura(): Punto2[] {
  const inicio: Punto2 = [0.44, 0.4];
  const t = Math.atan2(inicio[1] - CENTRO_OSTEONA[1], inicio[0] - CENTRO_OSTEONA[0]);
  const rf = radioCementante(t) + ANCHO_CEMENTANTE + 0.006;
  const fin: Punto2 = [CENTRO_OSTEONA[0] + rf * Math.cos(t), CENTRO_OSTEONA[1] + rf * Math.sin(t)];
  const r = azar(5);
  const n = 14;
  const [dx, dy] = [fin[0] - inicio[0], fin[1] - inicio[1]];
  const largo = Math.hypot(dx, dy);
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = i / n;
    const quiebre = i === 0 || i === n ? 0 : (r() - 0.5) * 0.018;
    return [
      inicio[0] + dx * s - (dy / largo) * quiebre,
      inicio[1] + dy * s + (dx / largo) * quiebre,
    ] as const;
  });
}
export const FISURA: readonly Punto2[] = calcularFisura();

/** Adipocito de la médula: centro, radio y ángulo de su núcleo aplastado. */
export interface Adipocito {
  x: number;
  y: number;
  r: number;
  nucleo: number;
}

/** Adipocitos repartidos sin solaparse por la médula (siempre los mismos). */
function calcularAdipocitos(): Adipocito[] {
  const r = azar(7);
  const lista: Adipocito[] = [];
  for (let intento = 0; intento < 4000; intento++) {
    const radio = 0.11 + r() * 0.08;
    const x = -X_BLOQUE + radio + 0.03 + r() * (2 * X_BLOQUE - 2 * radio - 0.06);
    const techo = Math.min(yEndostio(x - radio), yEndostio(x), yEndostio(x + radio)) - 0.05;
    const y = -Y_BLOQUE + radio + 0.03 + r() * (techo - radio - (-Y_BLOQUE + radio + 0.03));
    if (y + radio > techo) continue;
    if (lista.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + radio + 0.018)) continue;
    lista.push({ x, y, r: radio, nucleo: r() * Math.PI * 2 });
  }
  return lista;
}
export const ADIPOCITOS: readonly Adipocito[] = calcularAdipocitos();

/** Células hematopoyéticas sueltas en los tabiques entre adipocitos. */
function calcularHematopoyeticas(): { x: number; y: number; r: number; serie: 0 | 1 }[] {
  const r = azar(13);
  const lista: { x: number; y: number; r: number; serie: 0 | 1 }[] = [];
  for (let intento = 0; intento < 3000 && lista.length < 70; intento++) {
    const x = -X_BLOQUE + 0.04 + r() * (2 * X_BLOQUE - 0.08);
    const y = -Y_BLOQUE + 0.04 + r() * (yEndostio(x) - 0.06 + Y_BLOQUE - 0.04);
    const radio = 0.013 + r() * 0.007;
    if (y > yEndostio(x) - 0.04) continue;
    if (ADIPOCITOS.some((a) => Math.hypot(a.x - x, a.y - y) < a.r + radio + 0.006)) continue;
    if (lista.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + radio + 0.004)) continue;
    lista.push({ x, y, r: radio, serie: r() < 0.55 ? 0 : 1 });
  }
  return lista;
}

/** Células de la superficie endostal: dos de revestimiento aplanadas y un osteoblasto. */
export const CELULAS_ENDOSTIO: readonly { x: number; a: number; b: number }[] = [
  { x: -1.35, a: 0.07, b: 0.012 },
  { x: -0.25, a: 0.04, b: 0.022 },
  { x: 1.45, a: 0.075, b: 0.012 },
];
const ANCHO_ENDOSTIO = 0.016;

/* ----- Piezas ----- */

/** ¿El punto queda en el hueso intersticial (ni en la osteona, ni en el poro, ni fuera de la cortical)? */
function enIntersticial(x: number, y: number, margen = 0.01): boolean {
  if (Math.abs(x) > X_BLOQUE - margen || y > Y_BLOQUE - margen) return false;
  if (y < yEndostio(x) + 0.015) return false;
  if (Math.hypot(x - CENTRO_OSTEONA[0], y - CENTRO_OSTEONA[1]) < R_OSTEONA + margen) return false;
  return Math.hypot(x - CENTRO_PORO[0], y - CENTRO_PORO[1]) > 0.24;
}

/** Restos de osteonas antiguas: centro y radios de sus laminillas (las más recientes recortan a las anteriores). */
const RESTOS: readonly {
  centro: Punto2;
  desde: number;
  hasta: number;
  bandas: number;
  /** Tramo de arco que sobrevivió (grados): del resto solo queda un fragmento. */
  arco: readonly [number, number];
}[] = [
  { centro: [-1.55, 1.25], desde: 0.12, hasta: 0.38, bandas: 4, arco: [195, 345] },
  { centro: [0.12, 1.08], desde: 0.18, hasta: 0.5, bandas: 5, arco: [-75, 120] },
  { centro: [-1.72, 0.1], desde: 0.16, hasta: 0.46, bandas: 5, arco: [-70, 95] },
  { centro: [1.62, 0.12], desde: 0.14, hasta: 0.44, bandas: 4, arco: [110, 290] },
];

/** Arcos de las laminillas intersticiales, por paridad (clara, oscura). */
function laminillasIntersticiales(): [BufferGeometry[], BufferGeometry[]] {
  const salida: [BufferGeometry[], BufferGeometry[]] = [[], []];
  const pasos = 140;
  RESTOS.forEach((resto, i) => {
    const libre = (x: number, y: number): boolean =>
      enIntersticial(x, y) &&
      RESTOS.slice(i + 1).every((o) => Math.hypot(x - o.centro[0], y - o.centro[1]) > o.hasta);
    for (let k = 0; k < resto.bandas; k++) {
      const r0 = resto.desde + ((resto.hasta - resto.desde) * k) / resto.bandas;
      const r1 = resto.desde + ((resto.hasta - resto.desde) * (k + 1)) / resto.bandas;
      const punto = (r: number, t: number): Punto2 => {
        const rr = r * (1 + 0.012 * Math.sin(4 * t + k + i));
        return [resto.centro[0] + rr * Math.cos(t), resto.centro[1] + rr * Math.sin(t)];
      };
      let dentro: Punto2[] = [];
      let fuera: Punto2[] = [];
      const cerrar = (): void => {
        if (dentro.length > 1) salida[k % 2]!.push(tira(dentro, fuera, Z.laminillas));
        dentro = [];
        fuera = [];
      };
      for (let j = 0; j <= pasos; j++) {
        const t = (2 * Math.PI * j) / pasos;
        const [a, b] = [punto(r0, t), punto(r1, t)];
        const grados = (t * 180) / Math.PI;
        const enArco = [grados, grados - 360].some((g) => g >= resto.arco[0] && g <= resto.arco[1]);
        if (enArco && libre(a[0], a[1]) && libre(b[0], b[1])) {
          dentro.push(a);
          fuera.push(b);
        } else cerrar();
      }
      cerrar();
    }
  });
  return salida;
}

/** Anillos de la osteona: laminillas concéntricas del conducto a la línea cementante, por paridad. */
function laminillasOsteona(): [BufferGeometry[], BufferGeometry[]] {
  const [cx, cy] = CENTRO_OSTEONA;
  const n = 120;
  const borde = (k: number): Punto2[] =>
    Array.from({ length: n }, (_, j) => {
      const t = (2 * Math.PI * j) / n;
      const r0 = radioConducto(t) + 0.004;
      const r = r0 + ((radioCementante(t) - r0) * k) / LAMINILLAS;
      const onda = k === 0 || k === LAMINILLAS ? 0 : 0.004 * Math.sin(5 * t + k);
      return [cx + (r + onda) * Math.cos(t), cy + (r + onda) * Math.sin(t)] as const;
    });
  const salida: [BufferGeometry[], BufferGeometry[]] = [[], []];
  for (let k = 0; k < LAMINILLAS; k++)
    salida[k % 2]!.push(anillo(borde(k), borde(k + 1), Z.laminillas));
  return salida;
}

function lineaCementante(): BufferGeometry {
  const [cx, cy] = CENTRO_OSTEONA;
  const n = 168;
  const contorno = (extra: number): Punto2[] =>
    Array.from({ length: n }, (_, j) => {
      const t = (2 * Math.PI * j) / n;
      const r = radioCementante(t) + extra;
      return [cx + r * Math.cos(t), cy + r * Math.sin(t)] as const;
    });
  return anillo(contorno(0), contorno(ANCHO_CEMENTANTE), Z.cementante);
}

const lagunas = (
  lista: readonly Laguna[],
  a: number = LAGUNA.a,
  b: number = LAGUNA.b,
  z: number = Z.laguna,
) => lista.map((l) => plano(contornoElipse(l.x, l.y, a, b, l.angulo), z));
const celulas = (lista: readonly Laguna[], a: number, b: number, alto: number) =>
  lista.map((l) => cupula(l.x, l.y, a, b, alto, Z.laguna, l.angulo));

/** Capilar de un conducto: un tubo que entra en el bloque y su sección roja en la cara. */
function capilar(cx: number, cy: number, radio: number): BufferGeometry {
  return unir([
    varilla([cx, cy, -0.34], [cx, cy, -0.006], radio, 10),
    plano(
      contornoPolar(cx, cy, () => radio, 16),
      -0.006,
    ),
  ]);
}

/* ----- Modelo ----- */

/** Construye el bloque de hueso cortical envejecido: un grupo con un subgrupo por región. */
export function crearTejidoOseoEnvejecido(): Group {
  const bloque = grupo('tejido_oseo_envejecido');
  const contornoCortical: Punto2[] = [
    ...XS.map((x): Punto2 => [x, yEndostio(x)]),
    [X_BLOQUE, Y_BLOQUE],
    [-X_BLOQUE, Y_BLOQUE],
  ];

  // Fondo: la matriz cortical (con los huecos del conducto y del poro) y sus laminillas: las concéntricas de la
  // osteona y las intersticiales (restos de osteonas antiguas), en dos tonos alternos.
  const [intClaras, intOscuras] = laminillasIntersticiales();
  const [claras, oscuras] = laminillasOsteona();
  bloque.add(
    grupo(
      'matriz_cortical',
      malla(
        prisma(contornoCortical, PROFUNDIDAD, [
          agrandar(contornoConducto(), 0.004),
          agrandar(contornoPoro(), 0.004),
        ]),
        material(COLORES.matriz, 'hueso', 3),
        'matriz_cortical_bloque',
      ),
      malla(
        unir([...claras, ...intClaras]),
        material(COLORES.laminilla_clara, 'hueso', 3),
        'laminillas_claras',
      ),
      malla(
        unir([...oscuras, ...intOscuras]),
        material(COLORES.laminilla_oscura, 'hueso', 3),
        'laminillas_oscuras',
      ),
    ),
  );

  // Fondo: la osteona (línea cementante y conducto de Havers con su capilar).
  bloque.add(
    grupo(
      'osteona',
      malla(
        lineaCementante(),
        material(COLORES.cementante, 'hueso', 3),
        'osteona_linea_cementante',
      ),
      malla(
        prisma(contornoConducto(), 0.36),
        materialInterior(COLORES.conducto),
        'osteona_conducto',
      ),
      malla(
        capilar(CENTRO_OSTEONA[0] + 0.03, CENTRO_OSTEONA[1] - 0.02, 0.032),
        material(COLORES.capilar, 'vaso'),
        'osteona_capilar',
      ),
    ),
  );

  // Fondo: los pocos osteocitos viables que quedan.
  bloque.add(
    grupo(
      'osteocitos_viables',
      malla(
        unir(lagunas(OSTEOCITOS_VIABLES)),
        material(COLORES.laguna, 'cavidad'),
        'osteocitos_lagunas',
      ),
      malla(
        unir(celulas(OSTEOCITOS_VIABLES, 0.034, 0.012, 0.012)),
        material(COLORES.osteocito, 'celula', 20),
        'osteocitos_celulas',
      ),
    ),
  );

  // Osteocito senescente: dorado, con gránulos de lipofuscina; y las lagunas que quedaron vacías por apoptosis.
  const granulos = OSTEOCITOS_SENESCENTES.flatMap((l) =>
    [-0.016, 0, 0.016].map((s, i) =>
      cupula(
        l.x + Math.cos(l.angulo) * s,
        l.y + Math.sin(l.angulo) * s + (i - 1) * 0.002,
        0.006,
        0.006,
        0.016,
        Z.laguna,
        0,
        [6, 3],
      ),
    ),
  );
  bloque.add(
    grupo(
      'osteocito_senescente',
      malla(
        unir([...lagunas(OSTEOCITOS_SENESCENTES), ...lagunas(LAGUNAS_VACIAS)]),
        material(COLORES.laguna, 'cavidad'),
        'osteocito_senescente_lagunas',
      ),
      malla(
        unir(celulas(OSTEOCITOS_SENESCENTES, 0.036, 0.014, 0.013)),
        material(COLORES.senescente, 'celula', 20),
        'osteocito_senescente_celulas',
      ),
      malla(
        unir(granulos),
        material(COLORES.lipofuscina, 'organulo'),
        'osteocito_senescente_lipofuscina',
      ),
    ),
  );

  // Red canalicular empobrecida: pocos canalículos, cortos y alguno interrumpido.
  bloque.add(
    grupo(
      'red_canalicular_reducida',
      malla(
        unir(CANALICULOS.map((c) => trazo(c, 0.008, Z.canaliculo))),
        material(COLORES.canaliculo, 'cavidad'),
        'red_canalicular_trazos',
      ),
    ),
  );

  // Micropetrosis: lagunas rellenas de mineral, sin célula, con su borde algo más oscuro.
  bloque.add(
    grupo(
      'laguna_mineralizada',
      malla(
        unir(lagunas(LAGUNAS_MINERALIZADAS, LAGUNA.a + 0.004, LAGUNA.b + 0.004)),
        material(COLORES.laguna, 'cavidad'),
        'laguna_mineralizada_borde',
      ),
      malla(
        unir(lagunas(LAGUNAS_MINERALIZADAS, LAGUNA.a, LAGUNA.b, Z.laguna + 0.001)),
        material(COLORES.mineral, 'cristal'),
        'laguna_mineralizada_relleno',
      ),
    ),
  );

  // Microfisura: grieta fina y quebrada, más ancha en el medio.
  bloque.add(
    grupo(
      'microfisura',
      malla(
        trazo(
          FISURA,
          (i) => 0.004 + 0.012 * Math.sin((Math.PI * i) / (FISURA.length - 1)),
          Z.fisura,
        ),
        material(COLORES.fisura, 'cavidad'),
        'microfisura_grieta',
      ),
    ),
  );

  // Poro cortical ampliado: cavidad que entra en el bloque, con su capilar.
  bloque.add(
    grupo(
      'poro_cortical',
      malla(prisma(contornoPoro(), 0.3), materialInterior(COLORES.poro), 'poro_cortical_cavidad'),
      malla(
        capilar(CENTRO_PORO[0] - 0.05, CENTRO_PORO[1] - 0.04, 0.036),
        material(COLORES.capilar, 'vaso'),
        'poro_cortical_capilar',
      ),
    ),
  );

  // Superficie endostal: el endostio y pocos osteoblastos (dos de revestimiento aplanados y uno activo).
  const celulasEndostio = CELULAS_ENDOSTIO.map((c) => {
    const pendiente = Math.atan((yEndostio(c.x + 0.01) - yEndostio(c.x - 0.01)) / 0.02);
    const y = yEndostio(c.x) - ANCHO_ENDOSTIO / 2 - c.b * 0.6;
    return { ...c, y, pendiente };
  });
  bloque.add(
    grupo(
      'superficie_osteoblastos_escasos',
      malla(
        tira(
          XS.map((x): Punto2 => [x, yEndostio(x)]),
          XS.map((x): Punto2 => [x, yEndostio(x) - ANCHO_ENDOSTIO]),
          Z.endostio,
        ),
        material(COLORES.endostio, 'membrana', 6),
        'endostio',
      ),
      malla(
        unir(
          celulasEndostio.map((c) => cupula(c.x, c.y, c.a, c.b, 0.016, Z.endostio, c.pendiente)),
        ),
        material(COLORES.osteoblasto, 'celula', 20),
        'osteoblastos_celulas',
      ),
      malla(
        unir(
          celulasEndostio.map((c) =>
            cupula(c.x, c.y, c.a * 0.4, c.b * 0.6, 0.02, Z.endostio, c.pendiente, [8, 3]),
          ),
        ),
        material(COLORES.nucleo, 'nucleo', 20),
        'osteoblastos_nucleos',
      ),
    ),
  );

  // Médula con más grasa: tabiques con algo de tejido hematopoyético y adipocitos grandes de una sola gota.
  const contornoMedula: Punto2[] = [
    ...[...XS].reverse().map((x): Punto2 => [x, yEndostio(x)]),
    [-X_BLOQUE, -Y_BLOQUE],
    [X_BLOQUE, -Y_BLOQUE],
  ];
  const formaAdipocito = (a: Adipocito, escala = 1): Punto2[] =>
    contornoPolar(a.x, a.y, (t) => a.r * escala * (1 + 0.04 * Math.sin(5 * t + a.nucleo)), 24);
  const hematopoyeticas = calcularHematopoyeticas();
  const serie = (s: 0 | 1) =>
    hematopoyeticas
      .filter((h) => h.serie === s)
      .map((h) => cupula(h.x, h.y, h.r, h.r, h.r * 0.8, 0, 0, [8, 3]));
  bloque.add(
    grupo(
      'medula_adiposa',
      malla(
        prisma(contornoMedula, PROFUNDIDAD),
        material(COLORES.estroma, 'medula', 3),
        'medula_estroma',
      ),
      malla(
        unir(ADIPOCITOS.map((a) => plano(formaAdipocito(a, 0.94), Z.adipocito))),
        material(COLORES.adipocito, 'medula', 4),
        'medula_adipocitos',
      ),
      malla(
        unir(
          ADIPOCITOS.map((a) =>
            anillo(formaAdipocito(a, 0.94), formaAdipocito(a), Z.borde_adipocito),
          ),
        ),
        material(COLORES.borde_adipocito, 'membrana', 6),
        'medula_adipocitos_borde',
      ),
      malla(
        unir(
          ADIPOCITOS.map((a) =>
            plano(
              contornoElipse(
                a.x + Math.cos(a.nucleo) * a.r * 0.9,
                a.y + Math.sin(a.nucleo) * a.r * 0.9,
                0.035,
                0.011,
                a.nucleo + Math.PI / 2,
              ),
              Z.nucleo,
            ),
          ),
        ),
        material(COLORES.nucleo_adipocito, 'nucleo', 20),
        'medula_adipocitos_nucleos',
      ),
      malla(unir(serie(0)), material(COLORES.eritroide, 'celula', 20), 'medula_serie_roja'),
      malla(unir(serie(1)), material(COLORES.mieloide, 'celula', 20), 'medula_serie_blanca'),
    ),
  );

  bloque.add(lupaColageno());
  return bloque;
}

/**
 * Lupa del colágeno con AGE: fibrillas con su bandeo (zonas de hueco y de solapamiento) y puentes anormales entre
 * fibrillas vecinas (entrecruzamientos de glicación, como la pentosidina) y aductos sueltos, de color pardo
 * amarillento. Un anillo en la cara marca la zona ampliada y dos líneas la unen a la lupa.
 */
function lupaColageno(): Group {
  const [qx, qy, qz] = CENTRO_LUPA;
  const angulo = 0.35;
  const [dx, dy] = [Math.cos(angulo), Math.sin(angulo)];
  const [nx, ny] = [-dy, dx];
  const zf = qz + 0.05;
  const rf = 0.042;
  const desplazamientos = [-0.26, -0.13, 0, 0.13, 0.26];
  const claras: BufferGeometry[] = [];
  const oscuras: BufferGeometry[] = [];
  const puntas: BufferGeometry[] = [];
  const largos = desplazamientos.map((s) => Math.sqrt(R_LUPA ** 2 - s ** 2) - 0.07);
  const enFibrilla = (s: number, l: number, extra = 0): Vec3 => [
    qx + dx * l + nx * (s + extra),
    qy + dy * l + ny * (s + extra),
    zf,
  ];
  desplazamientos.forEach((s, i) => {
    const largo = largos[i]!;
    // Periodo D: banda de solapamiento (clara, 40 %) y de hueco (oscura, 60 %).
    const periodo = 0.075;
    let k = 0;
    for (let l = -largo; l < largo - 1e-6; k++) {
      const tramo = Math.min(k % 2 === 0 ? periodo * 0.4 : periodo * 0.6, largo - l);
      (k % 2 === 0 ? claras : oscuras).push(
        varilla(enFibrilla(s, l), enFibrilla(s, l + tramo), rf, 10),
      );
      l += tramo;
    }
    for (const l of [-largo, largo]) {
      const p = new SphereGeometry(rf, 10, 6);
      p.translate(...enFibrilla(s, l));
      puntas.push(p);
    }
  });
  const r = azar(29);
  const puentes: BufferGeometry[] = [];
  const nudos: BufferGeometry[] = [];
  const nudo = (p: Vec3, radio: number): void => {
    const g = new SphereGeometry(radio, 8, 6);
    g.translate(...p);
    nudos.push(g);
  };
  for (let i = 0; i < desplazamientos.length - 1; i++) {
    const tope = Math.min(largos[i]!, largos[i + 1]!) - 0.04;
    for (let k = 0; k < 3; k++) {
      const l = -tope + ((k + 0.5 + (r() - 0.5) * 0.6) / 3) * 2 * tope;
      const a = enFibrilla(desplazamientos[i]!, l, rf * 0.8);
      const b = enFibrilla(desplazamientos[i + 1]!, l + (r() - 0.5) * 0.03, -rf * 0.8);
      puentes.push(varilla(a, b, 0.011, 6));
      nudo(a, 0.016);
      nudo(b, 0.016);
    }
  }
  for (let k = 0; k < 6; k++) {
    const i = Math.floor(r() * desplazamientos.length);
    const l = (r() - 0.5) * 1.6 * largos[i]!;
    nudo(enFibrilla(desplazamientos[i]!, l, (r() < 0.5 ? 1 : -1) * rf), 0.017);
  }
  // Marca de la zona ampliada en la cara de corte y líneas hasta el borde de la lupa.
  const [mx, my] = ZONA_AMPLIADA;
  const marca = 0.055;
  const [ux, uy] = [qx - mx, qy - my];
  const d = Math.hypot(ux, uy);
  const [px, py] = [-uy / d, ux / d];
  const lineas = [1, -1].map((lado) =>
    varilla(
      [mx + px * marca * lado, my + py * marca * lado, 0.006],
      [qx + px * R_LUPA * lado, qy + py * R_LUPA * lado, qz],
      0.004,
      5,
    ),
  );
  const aro = new TorusGeometry(R_LUPA, 0.012, 6, 72);
  aro.translate(qx, qy, qz);
  const marcaAro = anillo(
    contornoPolar(mx, my, () => marca - 0.006, 32),
    contornoPolar(mx, my, () => marca + 0.004, 32),
    0.006,
  );
  return grupo(
    'matriz_colageno_age',
    malla(
      plano(
        contornoPolar(qx, qy, () => R_LUPA, 72),
        qz,
      ),
      material(COLORES.fondo_lupa, 'cavidad'),
      'lupa_fondo',
    ),
    malla(unir([aro, marcaAro, ...lineas]), material(COLORES.marco_lupa, 'molecula'), 'lupa_marco'),
    malla(
      unir([...claras, ...puntas]),
      material(COLORES.fibrilla_clara, 'fibra'),
      'lupa_fibrillas_claras',
    ),
    malla(unir(oscuras), material(COLORES.fibrilla_oscura, 'fibra'), 'lupa_fibrillas_oscuras'),
    malla(unir([...puentes, ...nudos]), material(COLORES.age, 'molecula'), 'lupa_puentes_age'),
  );
}

/* ----- Puntos de las etiquetas ----- */

const FRENTE: Vec3 = [0, 0, 1];

/** Punto de la etiqueta de cada región, sobre la cara de corte (o sobre la lupa). */
export function puntoDeRegion(id: RegionTejidoEnvejecido): PuntoRegion {
  switch (id) {
    case 'osteocito_senescente': {
      const l = OSTEOCITOS_SENESCENTES[0]!;
      return { punto: [l.x, l.y, Z.laguna + 0.013], normal: FRENTE, radio: 0.3 };
    }
    case 'red_canalicular_reducida': {
      const c = CANALICULOS[0]!;
      const p = c[Math.floor(c.length / 2)]!;
      return { punto: [p[0], p[1], Z.canaliculo + 0.001], normal: FRENTE, radio: 0.3 };
    }
    case 'laguna_mineralizada': {
      const l = LAGUNAS_MINERALIZADAS[0]!;
      return { punto: [l.x, l.y, Z.laguna + 0.002], normal: FRENTE, radio: 0.3 };
    }
    case 'microfisura': {
      const p = FISURA[Math.floor(FISURA.length / 2)]!;
      return { punto: [p[0], p[1], Z.fisura + 0.001], normal: FRENTE, radio: 0.35 };
    }
    case 'poro_cortical':
      return {
        punto: [CENTRO_PORO[0], CENTRO_PORO[1] + radioPoro(Math.PI / 2), 0.001],
        normal: FRENTE,
        radio: 0.4,
      };
    case 'medula_adiposa': {
      // El adipocito más cercano al centro de la médula.
      const lejania = (x: Adipocito): number => Math.hypot(x.x, x.y + 0.85);
      const a = ADIPOCITOS.reduce((m, x) => (lejania(x) < lejania(m) ? x : m));
      return { punto: [a.x, a.y, Z.adipocito + 0.001], normal: FRENTE, radio: 0.6 };
    }
    case 'matriz_colageno_age':
      return {
        punto: [CENTRO_LUPA[0], CENTRO_LUPA[1], CENTRO_LUPA[2] + 0.08],
        normal: FRENTE,
        radio: 0.5,
      };
    case 'superficie_osteoblastos_escasos': {
      const c = CELULAS_ENDOSTIO[1]!;
      return {
        punto: [c.x, yEndostio(c.x) - ANCHO_ENDOSTIO / 2, Z.endostio + 0.02],
        normal: FRENTE,
        radio: 0.45,
      };
    }
  }
}

export function esRegionTejidoEnvejecido(id: string): id is RegionTejidoEnvejecido {
  return (REGIONES_TEJIDO_ENVEJECIDO as readonly string[]).includes(id);
}
