/**
 * Superficie de formación ósea de una trabécula: el modelo `osteoide` de la exploración 3D (actividad
 * m3_multicapa_osteoide, «Dentro de una trabécula en formación»; hasta 2026-10-18 era un dibujo SVG con una
 * ilustración hecha con IA debajo, que tenía errores: osteoblastos como cajas y osteocitos como dianas).
 *
 * Es un bloque de tejido cortado por un plano (z = 0, la cara de corte, mira a la cámara) con su profundidad detrás:
 *  - a la izquierda, hueso inmaduro (entretejido) en formación: haces de colágeno irregulares y muchos osteocitos
 *    grandes y redondeados en sus lagunas; encima, el ribete pálido de osteoide, el frente de mineralización entre
 *    los dos (con calcosferitas) y la hilera de osteoblastos activos, cúbicos y voluminosos, con el núcleo en el polo
 *    alejado del hueso, el citoplasma basófilo y la zona pálida del Golgi entre el núcleo y la matriz. La hilera es
 *    una lámina que cubre la superficie: la fila de delante está cortada y enseña núcleo y Golgi;
 *  - un osteocito recién incluido, todavía voluminoso, rodeado de osteoide en una bolsa por debajo de la hilera, con
 *    procesos que suben hasta los osteoblastos y bajan hacia el hueso;
 *  - a la derecha, tras la línea cementante (festoneada: el borde de la resorción previa, basófilo), hueso laminar
 *    con láminas paralelas a ella y osteocitos aplanados y alineados entre las láminas, menos numerosos, con los
 *    canalículos perpendiculares a las láminas; en su superficie, células de revestimiento planas;
 *  - encima, tejido conectivo laxo (fibras de colágeno y fibroblastos) con un capilar cortado a lo largo y sus
 *    eritrocitos.
 *
 * Proporciones aproximadas (esquema fuera de escala, 1 unidad ≈ 50 µm): osteoblastos de unos 20 µm de alto, ribete
 * de osteoide de unos 9 µm, lagunas de 10 a 13 µm, láminas de unos 4 µm y capilar de unos 10 µm de luz.
 *
 * Cada región de la actividad es un grupo con el id de su nodo (`content/nodos3d.ts`) y sus propios materiales; el
 * tejido conectivo y las células de revestimiento son decoración (un grupo sin nodo). `puntoDeRegion` da el punto
 * de la etiqueta (sobre la cara de corte) y el tamaño de la zona que encuadra la cámara.
 */
import type { BufferGeometry, Vector3 } from 'three';
import { Group } from 'three';
import type { Punto2, Vec3 } from '../histologia/piezas';
import {
  aleatorio,
  banda,
  cara,
  caraTrasera,
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
  texturaEntretejida,
  texturaLaminas,
  tubo,
  unir,
} from '../histologia/piezas';
import type { OpcionesCuenco } from '../histologia/piezas';

/** Regiones del modelo: los ids de los nodos del catálogo `osteoide`. */
export const REGIONES_OSTEOIDE = [
  'osteoblastos_activos',
  'osteoide',
  'frente_mineralizacion',
  'hueso_inmaduro',
  'osteocito_incluido',
  'capilar',
  'linea_cementante',
  'hueso_laminar',
] as const;
export type RegionOsteoide = (typeof REGIONES_OSTEOIDE)[number];

/* ----- Medidas (unidades del modelo) ----- */

export const X_MIN = -2.4;
export const X_MAX = 2.4;
/** Fondo del bloque de hueso. */
export const Y_FONDO = -1.3;
/** Superficie ósea: la cara de arriba del osteoide y del hueso laminar. */
export const Y_SUPERFICIE = 0.18;
/** Profundidad del bloque: de la cara de corte (z = 0) a z = −PROFUNDIDAD. */
export const PROFUNDIDAD = 0.8;

/** Línea cementante: festones (las lagunas de la resorción previa) cóncavos hacia el hueso inmaduro. */
const X_CEMENTO = 0.62;
const FESTON = 0.07;
const PASO_FESTON = 0.4;
export function xCemento(y: number): number {
  const t = (y - Y_FONDO) / PASO_FESTON;
  return X_CEMENTO - FESTON * Math.abs(Math.sin(Math.PI * t)) ** 0.7;
}
const MEDIO_CEMENTO = 0.012;

/** Osteocito recién incluido: el osteoide baja a su alrededor (bolsa) y el frente pasa por debajo. */
export const X_INCLUIDO = -0.55;
export const Y_INCLUIDO = -0.03;
const HONDURA_BOLSA = 0.19;
const ANCHO_BOLSA = 0.24;
/** Frente de mineralización: el borde de abajo del osteoide (el de arriba del hueso inmaduro). */
export function yFrente(x: number): number {
  return -HONDURA_BOLSA * Math.exp(-(((x - X_INCLUIDO) / ANCHO_BOLSA) ** 2));
}

/** Capilar del tejido conectivo, cortado a lo largo por la cara de corte. */
const R_CAPILAR = 0.12;
const R_LUZ = 0.1;
export function yCapilar(x: number): number {
  return 0.96 + 0.03 * Math.sin(1.3 * x + 0.4);
}

/** Láminas: periodo de dos láminas, con una línea interlaminar en x = X_LAMINA + k · PERIODO / 2. */
const PERIODO_LAMINAS = 0.16;
const X_LAMINA = 0.98;

/** Capas de la cara de corte, un poco por delante unas de otras (sin parpadeo entre planos iguales). */
const Z_LINEAS = 0.0025;
const Z_CANALICULO = 0.002;

const COLORES = {
  osteoblasto: '#8d86c6',
  nucleoOsteoblasto: '#40357c',
  golgi: '#cbc5e8',
  osteoide: '#eed4c9',
  frente: '#b98476',
  calcosferita: '#c9a294',
  inmaduro: '#e2b4a2',
  laminar: '#efe4cf',
  cemento: '#76659a',
  laguna: '#6e5246',
  osteocito: '#8a9ad2',
  nucleoOsteocito: '#353a78',
  canaliculo: '#7a5a4c',
  incluido: '#8d90cf',
  capilar: '#d6a199',
  eritrocito: '#b8322c',
  endotelio: '#5c4b8c',
  fibra: '#efd9cf',
  fibroblasto: '#c7a9bd',
  nucleoFibroblasto: '#5a4a86',
  revestimiento: '#b9a8d0',
} as const;

/* ----- Contornos de la cara de corte ----- */

function contornoInmaduro(): Punto2[] {
  const derecha = muestras(Y_FONDO, 0, 60).map((y): Punto2 => [xCemento(y), y]);
  const arriba = muestras(xCemento(0), X_MIN, 90)
    .slice(1)
    .map((x): Punto2 => [x, yFrente(x)]);
  return [[X_MIN, Y_FONDO], ...derecha, ...arriba];
}

function contornoOsteoide(): Punto2[] {
  const abajo = muestras(X_MIN, xCemento(0), 90).map((x): Punto2 => [x, yFrente(x)]);
  const derecha = muestras(0, Y_SUPERFICIE, 8)
    .slice(1)
    .map((y): Punto2 => [xCemento(y), y]);
  return [...abajo, ...derecha, [X_MIN, Y_SUPERFICIE]];
}

function contornoLaminar(): Punto2[] {
  const izquierda = muestras(Y_SUPERFICIE, Y_FONDO, 60).map((y): Punto2 => [xCemento(y), y]);
  return [[X_MAX, Y_FONDO], [X_MAX, Y_SUPERFICIE], ...izquierda];
}

/* ----- Osteocitos y lagunas ----- */

export interface Laguna {
  cuenco: OpcionesCuenco;
  /** Radio máximo del borde (para separar unas de otras). */
  radio: number;
}

/** Irregularidad suave del contorno de una laguna: el borde no es una elipse perfecta. */
function irregular(azar: () => number, amplitud: number): (angulo: number) => number {
  const f1 = azar() * Math.PI * 2;
  const f2 = azar() * Math.PI * 2;
  const k = amplitud;
  return (t) => 1 + k * Math.sin(2 * t + f1) * 0.6 + k * Math.sin(3 * t + f2) * 0.4;
}

/**
 * Lagunas del hueso inmaduro: muchas, grandes, redondeadas y sin orden (se reparten al azar con semilla, separadas y
 * lejos de los bordes, de la bolsa del osteocito incluido y del frente).
 */
export function lagunasInmaduro(): Laguna[] {
  const azar = aleatorio(7);
  const lagunas: Laguna[] = [];
  for (let intento = 0; intento < 600 && lagunas.length < 13; intento++) {
    const a = 0.095 + 0.035 * azar();
    const b = 0.075 + 0.03 * azar();
    const radio = Math.max(a, b) * 1.12;
    const x = X_MIN + 0.2 + azar() * (xCemento(-0.6) - X_MIN - 0.3);
    const y = Y_FONDO + 0.17 + azar() * (yFrente(x) - Y_FONDO - 0.42);
    if (x + radio > xCemento(y) - 0.1 || y + radio > yFrente(x) - 0.12) continue;
    if (Math.hypot(x - X_INCLUIDO, y - Y_INCLUIDO) < 0.45) continue;
    if (
      lagunas.some(
        (l) => Math.hypot(x - l.cuenco.centro[0], y - l.cuenco.centro[1]) < radio + l.radio + 0.1,
      )
    ) {
      continue;
    }
    lagunas.push({
      cuenco: {
        centro: [x, y],
        semiejes: [a, b, 0.09],
        giro: azar() * Math.PI,
        modulacion: irregular(azar, 0.1),
        angulos: 20,
        anillos: 5,
      },
      radio,
    });
  }
  return lagunas;
}

/** Lagunas del hueso laminar: aplanadas, alargadas a lo largo de las láminas y alineadas entre ellas. */
export function lagunasLaminar(): Laguna[] {
  const azar = aleatorio(13);
  const sitios: Punto2[] = [
    [X_LAMINA, -0.95],
    [X_LAMINA, -0.3],
    [X_LAMINA + 6 * (PERIODO_LAMINAS / 2), -0.62],
    [X_LAMINA + 6 * (PERIODO_LAMINAS / 2), -0.04],
    [X_LAMINA + 12 * (PERIODO_LAMINAS / 2), -1.0],
    [X_LAMINA + 12 * (PERIODO_LAMINAS / 2), -0.36],
  ];
  return sitios.map(([x, y]) => ({
    cuenco: {
      centro: [x, y],
      semiejes: [0.04, 0.14, 0.06],
      giro: (azar() - 0.5) * 0.12,
      modulacion: irregular(azar, 0.06),
      angulos: 20,
      anillos: 5,
    },
    radio: 0.16,
  }));
}

/** Bolsa de osteoide alrededor del osteocito recién incluido. */
export const BOLSA_INCLUIDO: OpcionesCuenco = {
  centro: [X_INCLUIDO, Y_INCLUIDO],
  semiejes: [0.155, 0.122, 0.13],
  giro: 0.08,
  modulacion: irregular(aleatorio(5), 0.05),
  angulos: 24,
  anillos: 5,
};

/** Osteocito dentro de su laguna, cortado algo por detrás de la cara: citoplasma y núcleo excéntrico. */
function osteocitoEnLaguna(
  l: OpcionesCuenco,
  azar: () => number,
): { celula: BufferGeometry; nucleo: BufferGeometry } {
  const [a, b] = l.semiejes;
  const giro = l.giro ?? 0;
  const forma = (d: Vector3): number => l.modulacion?.(Math.atan2(d.y, d.x)) ?? 1;
  const celula = esferoide({
    centro: [l.centro[0], l.centro[1], -0.045],
    semiejes: [a * 0.85, b * 0.85, 0.075],
    giro,
    forma,
    detalle: 2,
    zMax: -0.016,
  });
  const angulo = azar() * Math.PI * 2;
  const nucleo = esferoide({
    centro: [
      l.centro[0] + 0.22 * a * Math.cos(angulo + giro),
      l.centro[1] + 0.22 * b * Math.sin(angulo + giro),
      -0.03,
    ],
    semiejes: [a * 0.55, b * 0.55, 0.05],
    giro: giro + (azar() - 0.5) * 0.6,
    forma: lobulos(azar),
    detalle: 2,
    zMax: -0.0135,
  });
  return { celula, nucleo };
}

/**
 * Canalículos de una laguna vistos en el corte: líneas finas y oscuras que salen del borde. En el hueso inmaduro van
 * en todas direcciones y son irregulares; en el laminar, perpendiculares a las láminas (aquí, horizontales).
 */
function canaliculos(l: OpcionesCuenco, azar: () => number, laminar: boolean): BufferGeometry[] {
  const borde = contornoCuenco(l);
  const n = laminar ? 6 : 4 + Math.floor(azar() * 2);
  const tubos: BufferGeometry[] = [];
  for (let k = 0; k < n; k++) {
    let angulo: number;
    if (laminar) angulo = (k % 2 === 0 ? 0 : Math.PI) + (Math.floor(k / 2) - 1) * 0.5;
    else angulo = ((k + azar() * 0.6) / n) * Math.PI * 2;
    // Punto del borde más cercano a esa dirección (el contorno empieza en el ángulo 0 y gira con la laguna).
    const i =
      Math.round((((((angulo - (l.giro ?? 0)) / (Math.PI * 2)) % 1) + 1) % 1) * borde.length) %
      borde.length;
    const [x0, y0] = borde[i]!;
    const dx = laminar ? Math.sign(Math.cos(angulo)) : Math.cos(angulo);
    const dy = laminar ? (azar() - 0.5) * 0.3 : Math.sin(angulo);
    const largo = laminar ? 0.12 + 0.08 * azar() : 0.08 + 0.1 * azar();
    const giro = (azar() - 0.5) * (laminar ? 0.04 : 0.09);
    const puntos: Vec3[] = [0, 0.33, 0.66, 1].map((t) => [
      x0 + dx * largo * t - dy * giro * Math.sin(t * Math.PI * 2),
      y0 + dy * largo * t + dx * giro * Math.sin(t * Math.PI * 2),
      Z_CANALICULO,
    ]);
    tubos.push(tubo(puntos, 0.0055, 10, 3));
  }
  return tubos;
}

/* ----- Osteoblastos ----- */

export interface Osteoblasto {
  centro: Vec3;
  semiejes: Vec3;
  giro: number;
  exponente: number;
  delante: boolean;
}

/**
 * Hilera de osteoblastos activos sobre el osteoide: tres filas en profundidad, apretadas (cúbicos redondeados,
 * cada uno de un tamaño), la de delante cortada por la cara de corte.
 */
export function osteoblastos(): Osteoblasto[] {
  const azar = aleatorio(3);
  const lista: Osteoblasto[] = [];
  const filas = [-0.075, -0.345, -0.615];
  const x1 = xCemento(Y_SUPERFICIE) - 0.17;
  filas.forEach((z, fila) => {
    const desfase = fila % 2 === 0 ? 0 : 0.155;
    for (let x = X_MIN + 0.155 + desfase; x <= x1; x += 0.31) {
      const semiY = 0.2 + 0.05 * azar();
      lista.push({
        centro: [x + (azar() - 0.5) * 0.03, Y_SUPERFICIE + semiY * 0.93, z],
        semiejes: [0.158 + 0.02 * azar(), semiY, 0.138 + 0.012 * azar()],
        giro: (azar() - 0.5) * 0.12,
        exponente: 2.45 + 0.35 * azar(),
        delante: fila === 0,
      });
    }
  });
  return lista;
}

/** Bultos suaves y distintos en cada célula: ninguna es una caja. */
function lobulos(azar: () => number): (d: Vector3) => number {
  const f = [azar(), azar(), azar()].map((v) => v * Math.PI * 2);
  return (d) =>
    1 +
    0.05 * Math.sin(3 * d.x + f[0]!) * Math.sin(2 * d.y + f[1]!) +
    0.04 * Math.cos(2.5 * d.z + f[2]!);
}

/* ----- Modelo ----- */

/** Construye la superficie de formación ósea: un grupo con un subgrupo por región. */
export function crearOsteoide(): Group {
  const modelo = new Group();
  modelo.name = 'osteoide';
  const azar = aleatorio(21);

  /* Hueso inmaduro */
  const inmaduras = lagunasInmaduro();
  const matInmaduro = material(COLORES.inmaduro, 'hueso_inmaduro', 3.2, {
    map: texturaEntretejida(),
  });
  matInmaduro.map!.repeat.set(0.55, 0.55);
  const celulasInm = inmaduras.map((l) => osteocitoEnLaguna(l.cuenco, azar));
  const yArribaIzq = yFrente(X_MIN);
  const contornoInm = contornoInmaduro();
  modelo.add(
    grupo(
      'hueso_inmaduro',
      malla(
        cara(
          contornoInm,
          inmaduras.map((l) => contornoCuenco(l.cuenco)),
          0,
        ),
        matInmaduro,
        'hueso_inmaduro_corte',
      ),
      malla(
        unir([
          plano([X_MIN, Y_FONDO, -PROFUNDIDAD], [0, 0, PROFUNDIDAD], [0, yArribaIzq - Y_FONDO, 0]),
          plano(
            [X_MIN, Y_FONDO, -PROFUNDIDAD],
            [xCemento(Y_FONDO) - X_MIN, 0, 0],
            [0, 0, PROFUNDIDAD],
          ),
          caraTrasera(contornoInm, -PROFUNDIDAD),
        ]),
        material(COLORES.inmaduro, 'hueso_inmaduro', 3.2),
        'hueso_inmaduro_superficie',
      ),
      malla(
        unir(inmaduras.map((l) => cuenco(l.cuenco))),
        material(COLORES.laguna, 'cavidad', 4),
        'hueso_inmaduro_lagunas',
      ),
      malla(
        unir(celulasInm.map((c) => c.celula)),
        material(COLORES.osteocito, 'celula', 8),
        'hueso_inmaduro_osteocitos',
      ),
      malla(
        unir(celulasInm.map((c) => c.nucleo)),
        material(COLORES.nucleoOsteocito, 'nucleo', 10),
        'hueso_inmaduro_nucleos',
      ),
      malla(
        unir(inmaduras.flatMap((l) => canaliculos(l.cuenco, azar, false))),
        material(COLORES.canaliculo, 'cavidad', 1),
        'hueso_inmaduro_canaliculos',
      ),
    ),
  );

  /* Osteoide: ribete pálido sobre el hueso inmaduro, con la bolsa del osteocito incluido */
  const contornoOst = contornoOsteoide();
  const matOsteoide = material(COLORES.osteoide, 'fibra', 3);
  if (matOsteoide.bumpMap) matOsteoide.bumpMap.rotation = Math.PI / 2;
  modelo.add(
    grupo(
      'osteoide',
      malla(
        unir([
          cara(contornoOst, [contornoCuenco(BOLSA_INCLUIDO)], 0),
          plano(
            [X_MIN, Y_SUPERFICIE, 0],
            [xCemento(Y_SUPERFICIE) - X_MIN, 0, 0],
            [0, 0, -PROFUNDIDAD],
            (p) => [p.x, p.z],
          ),
          plano(
            [X_MIN, yArribaIzq, -PROFUNDIDAD],
            [0, 0, PROFUNDIDAD],
            [0, Y_SUPERFICIE - yArribaIzq, 0],
          ),
          caraTrasera(contornoOst, -PROFUNDIDAD),
        ]),
        matOsteoide,
        'osteoide_corte',
      ),
    ),
  );

  /* Frente de mineralización: banda granulosa y oscura entre osteoide y hueso, con calcosferitas */
  const xsFrente = muestras(X_MIN, xCemento(0) - 0.01, 90);
  const calcosferitas: BufferGeometry[] = [];
  for (let k = 0; k < 46; k++) {
    const x = X_MIN + 0.04 + azar() * (xCemento(0) - X_MIN - 0.1);
    const y = yFrente(x) - 0.004 + azar() * 0.05;
    if (Math.hypot(x - X_INCLUIDO, y - Y_INCLUIDO) < 0.2) continue;
    const r = 0.007 + 0.009 * azar();
    calcosferitas.push(esferoide({ centro: [x, y, -r * 0.4], semiejes: [r, r, r], detalle: 1 }));
  }
  modelo.add(
    grupo(
      'frente_mineralizacion',
      malla(
        unir([
          cara(
            banda(
              xsFrente,
              (x) => yFrente(x) + 0.008,
              (x) => yFrente(x) - 0.02,
            ),
            [],
            Z_LINEAS,
          ),
          plano(
            [X_MIN - 0.002, yArribaIzq - 0.02, -PROFUNDIDAD],
            [0, 0, PROFUNDIDAD],
            [0, 0.028, 0],
          ),
        ]),
        material(COLORES.frente, 'hueso_inmaduro', 6),
        'frente_mineralizacion_banda',
      ),
      malla(unir(calcosferitas), material(COLORES.calcosferita, 'cristal', 1), 'calcosferitas'),
    ),
  );

  /* Osteocito recién incluido: voluminoso, en su bolsa de osteoide, con procesos hacia arriba y hacia abajo */
  const [xi, yi] = BOLSA_INCLUIDO.centro;
  const procesosIncluido: Vec3[][] = [
    [
      [xi - 0.06, yi + 0.06, -0.02],
      [xi - 0.09, yi + 0.13, 0.002],
      [xi - 0.13, Y_SUPERFICIE - 0.02, 0.003],
      [xi - 0.16, Y_SUPERFICIE + 0.02, -0.01],
    ],
    [
      [xi + 0.01, yi + 0.07, -0.02],
      [xi + 0.02, yi + 0.13, 0.002],
      [xi + 0.05, Y_SUPERFICIE - 0.01, 0.003],
      [xi + 0.06, Y_SUPERFICIE + 0.03, -0.01],
    ],
    [
      [xi + 0.08, yi + 0.04, -0.02],
      [xi + 0.15, yi + 0.1, 0.002],
      [xi + 0.24, Y_SUPERFICIE - 0.03, 0.003],
      [xi + 0.28, Y_SUPERFICIE + 0.02, -0.01],
    ],
    [
      [xi - 0.05, yi - 0.06, -0.02],
      [xi - 0.09, yi - 0.13, 0.002],
      [xi - 0.15, yi - 0.25, 0.003],
      [xi - 0.2, yi - 0.36, 0.003],
    ],
    [
      [xi + 0.06, yi - 0.05, -0.02],
      [xi + 0.11, yi - 0.13, 0.002],
      [xi + 0.16, yi - 0.24, 0.003],
      [xi + 0.19, yi - 0.33, 0.003],
    ],
  ];
  modelo.add(
    grupo(
      'osteocito_incluido',
      malla(
        esferoide({
          centro: [xi, yi, -0.05],
          semiejes: [0.125, 0.097, 0.1],
          giro: 0.08,
          exponente: 2.2,
          forma: lobulos(azar),
          detalle: 2,
          zMax: -0.012,
        }),
        material(COLORES.incluido, 'celula', 8),
        'osteocito_incluido_celula',
      ),
      malla(
        esferoide({
          centro: [xi - 0.035, yi + 0.024, -0.035],
          semiejes: [0.072, 0.058, 0.055],
          giro: 0.2,
          detalle: 2,
          zMax: -0.0095,
        }),
        material(COLORES.nucleoOsteoblasto, 'nucleo', 10),
        'osteocito_incluido_nucleo',
      ),
      malla(
        unir(procesosIncluido.map((p) => tubo(p, 0.0085, 16, 5))),
        material(COLORES.incluido, 'celula', 8),
        'osteocito_incluido_procesos',
      ),
      malla(
        cuenco(BOLSA_INCLUIDO),
        material(COLORES.osteoide, 'fibra', 6),
        'osteocito_incluido_bolsa',
      ),
    ),
  );

  /* Osteoblastos activos */
  const hilera = osteoblastos();
  const nucleos: BufferGeometry[] = [];
  const golgis: BufferGeometry[] = [];
  const celulas = hilera.map((o) => {
    const alto = o.semiejes[1] * 2 * 0.93;
    const base = Y_SUPERFICIE;
    if (o.delante) {
      // Núcleo en el polo alejado del hueso, desplazado a un lado; Golgi pálido entre el núcleo y la matriz.
      const lado = (azar() - 0.5) * 0.07;
      nucleos.push(
        esferoide({
          centro: [o.centro[0] + lado, base + alto * 0.7, -0.03],
          semiejes: [0.074, 0.082, 0.07],
          giro: o.giro,
          forma: lobulos(azar),
          detalle: 2,
          zMax: 0.003,
        }),
      );
      golgis.push(
        esferoide({
          centro: [o.centro[0] + lado * 0.4, base + alto * 0.4, -0.03],
          semiejes: [0.07, 0.045, 0.06],
          giro: o.giro,
          detalle: 2,
          zMax: 0.0015,
        }),
      );
    }
    return esferoide({
      centro: o.centro,
      semiejes: o.semiejes,
      giro: o.giro,
      exponente: o.exponente,
      forma: lobulos(azar),
      detalle: 2,
      yMin: Y_SUPERFICIE,
      ...(o.delante ? { zMax: 0 } : {}),
    });
  });
  modelo.add(
    grupo(
      'osteoblastos_activos',
      malla(unir(celulas), material(COLORES.osteoblasto, 'celula', 7), 'osteoblastos_citoplasma'),
      malla(
        unir(nucleos),
        material(COLORES.nucleoOsteoblasto, 'nucleo', 10),
        'osteoblastos_nucleos',
      ),
      malla(unir(golgis), material(COLORES.golgi, 'organulo', 1), 'osteoblastos_golgi'),
    ),
  );

  /* Línea cementante */
  const ysCemento = muestras(Y_FONDO, Y_SUPERFICIE, 80);
  const xc = xCemento(Y_SUPERFICIE);
  modelo.add(
    grupo(
      'linea_cementante',
      malla(
        unir([
          cara(
            [
              ...ysCemento.map((y): Punto2 => [xCemento(y) - MEDIO_CEMENTO, y]),
              ...[...ysCemento].reverse().map((y): Punto2 => [xCemento(y) + MEDIO_CEMENTO, y]),
            ],
            [],
            Z_LINEAS,
          ),
          plano(
            [xc - MEDIO_CEMENTO, Y_SUPERFICIE + 0.0025, 0],
            [2 * MEDIO_CEMENTO, 0, 0],
            [0, 0, -PROFUNDIDAD],
            (p) => [p.x, p.z],
          ),
        ]),
        material(COLORES.cemento, 'hueso', 6),
        'linea_cementante_banda',
      ),
    ),
  );

  /* Hueso laminar */
  const laminares = lagunasLaminar();
  const celulasLam = laminares.map((l) => osteocitoEnLaguna(l.cuenco, azar));
  const laminas = texturaLaminas('u');
  laminas.repeat.set(1 / PERIODO_LAMINAS, 1);
  laminas.offset.set((((-X_LAMINA / PERIODO_LAMINAS) % 1) + 1) % 1, 0);
  const contornoLam = contornoLaminar();
  modelo.add(
    grupo(
      'hueso_laminar',
      malla(
        unir([
          cara(
            contornoLam,
            laminares.map((l) => contornoCuenco(l.cuenco)),
            0,
          ),
          plano([xc, Y_SUPERFICIE, 0], [X_MAX - xc, 0, 0], [0, 0, -PROFUNDIDAD], (p) => [p.x, p.z]),
        ]),
        material(COLORES.laminar, 'hueso', 4, { map: laminas }),
        'hueso_laminar_corte',
      ),
      malla(
        unir([
          plano([X_MAX, Y_FONDO, 0], [0, 0, -PROFUNDIDAD], [0, Y_SUPERFICIE - Y_FONDO, 0]),
          plano(
            [xCemento(Y_FONDO), Y_FONDO, -PROFUNDIDAD],
            [X_MAX - xCemento(Y_FONDO), 0, 0],
            [0, 0, PROFUNDIDAD],
          ),
          caraTrasera(contornoLam, -PROFUNDIDAD),
        ]),
        material(COLORES.laminar, 'hueso', 4),
        'hueso_laminar_superficie',
      ),
      malla(
        unir(laminares.map((l) => cuenco(l.cuenco))),
        material(COLORES.laguna, 'cavidad', 4),
        'hueso_laminar_lagunas',
      ),
      malla(
        unir(celulasLam.map((c) => c.celula)),
        material(COLORES.osteocito, 'celula', 8),
        'hueso_laminar_osteocitos',
      ),
      malla(
        unir(celulasLam.map((c) => c.nucleo)),
        material(COLORES.nucleoOsteocito, 'nucleo', 10),
        'hueso_laminar_nucleos',
      ),
      malla(
        unir(laminares.flatMap((l) => canaliculos(l.cuenco, azar, true))),
        material(COLORES.canaliculo, 'cavidad', 1),
        'hueso_laminar_canaliculos',
      ),
    ),
  );

  /* Capilar: pared abierta a lo largo, núcleos del endotelio y eritrocitos en la luz */
  const xsCap = muestras(X_MIN, X_MAX, 90);
  const eritrocitos: BufferGeometry[] = [
    [-1.95, 0.1, 0.12],
    [-1.5, -0.15, 0.05],
    [-0.95, 0.2, -0.1],
    [-0.3, -0.05, 0.15],
    [0.35, 0.12, 0.08],
    [1.05, -0.18, -0.06],
    [1.7, 0.05, 0.18],
  ].map(([x, ny, nx]) => eritrocito([x!, yCapilar(x!), -0.045], 0.068, [nx!, ny!, 1]));
  // Dos de canto, como pasan por un capilar estrecho, cortados por el plano.
  for (const x of [-0.62, 1.38]) {
    const g = eritrocito([x, yCapilar(x), -0.035], 0.06, [1, 0.15, 0]);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.min(pos.getZ(i), -0.003));
    g.computeVertexNormals();
    eritrocitos.push(g);
  }
  modelo.add(
    grupo(
      'capilar',
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
              xsCap,
              (x) => yCapilar(x) + R_CAPILAR,
              (x) => yCapilar(x) + R_LUZ,
            ),
            [],
            0,
          ),
          cara(
            banda(
              xsCap,
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
          [-1.2, 0.8].map((x) =>
            esferoide({
              centro: [x, yCapilar(x) + 0.01, -R_LUZ + 0.004],
              semiejes: [0.085, 0.03, 0.013],
              detalle: 1,
            }),
          ),
        ),
        material(COLORES.endotelio, 'nucleo', 10),
        'capilar_endotelio',
      ),
      malla(unir(eritrocitos), material(COLORES.eritrocito, 'celula', 4), 'capilar_eritrocitos'),
    ),
  );

  /* Decoración: tejido conectivo laxo encima y células de revestimiento sobre el hueso laminar */
  const fibras: BufferGeometry[] = [];
  for (const [y, z, fase] of [
    [0.7, -0.25, 0.3],
    [0.74, -0.6, 1.4],
    [0.78, -0.08, 2.2],
    [1.13, -0.2, 0.9],
    [1.17, -0.5, 2.8],
    [1.21, -0.1, 1.9],
    [1.24, -0.68, 0.1],
    [0.95, -0.4, 1.1],
    [0.88, -0.66, 2.5],
  ] as const) {
    fibras.push(
      tubo(
        muestras(X_MIN, X_MAX, 8).map((x): Vec3 => [
          x,
          y + 0.035 * Math.sin(2.1 * x + fase),
          Math.min(-0.02, z + 0.06 * Math.cos(1.7 * x + fase)),
        ]),
        0.009,
        40,
        4,
      ),
    );
  }
  const fibroblastos: [Vec3, Vec3, number][] = [
    [[-1.6, 0.78, -0.02], [0.3, 0.04, 0.06], 0.05],
    [[0.2, 1.16, -0.3], [0.33, 0.045, 0.07], -0.06],
    [[1.6, 0.76, -0.45], [0.3, 0.04, 0.06], 0.08],
    [[-0.7, 1.18, -0.55], [0.28, 0.04, 0.06], -0.03],
  ];
  const revestimiento: BufferGeometry[] = [];
  const nucleosRevestimiento: BufferGeometry[] = [];
  for (const [z, fila] of [
    [-0.2, 0],
    [-0.6, 1],
  ] as const) {
    for (let x = xc + 0.33 + fila * 0.2; x < X_MAX - 0.2; x += 0.62) {
      revestimiento.push(
        esferoide({
          centro: [x, Y_SUPERFICIE + 0.012, z],
          semiejes: [0.31, 0.03, 0.2],
          exponente: 2.8,
          forma: lobulos(azar),
          detalle: 2,
          yMin: Y_SUPERFICIE,
          ...(fila === 0 ? { zMax: 0 } : {}),
        }),
      );
      nucleosRevestimiento.push(
        esferoide({
          centro: [x + 0.04, Y_SUPERFICIE + 0.022, fila === 0 ? -0.03 : z],
          semiejes: [0.11, 0.024, 0.06],
          detalle: 1,
          yMin: Y_SUPERFICIE,
          ...(fila === 0 ? { zMax: 0.002 } : {}),
        }),
      );
    }
  }
  modelo.add(
    grupo(
      'tejido_conectivo',
      malla(unir(fibras), material(COLORES.fibra, 'fibra', 6), 'tejido_conectivo_fibras'),
      malla(
        unir(
          fibroblastos.map(([centro, semiejes, giro]) =>
            esferoide({ centro, semiejes, giro, detalle: 2, zMax: 0 }),
          ),
        ),
        material(COLORES.fibroblasto, 'celula', 6),
        'fibroblastos',
      ),
      malla(
        unir(
          // Solo el fibroblasto cortado por el plano enseña su núcleo; los de detrás lo tienen dentro.
          fibroblastos.slice(0, 1).map(([centro, semiejes, giro]) =>
            esferoide({
              centro,
              semiejes: [semiejes[0] * 0.38, semiejes[1] * 0.6, semiejes[2] * 0.6],
              giro,
              detalle: 1,
              zMax: 0.002,
            }),
          ),
        ),
        material(COLORES.nucleoFibroblasto, 'nucleo', 10),
        'fibroblastos_nucleos',
      ),
      malla(
        unir(revestimiento),
        material(COLORES.revestimiento, 'celula', 6),
        'celulas_revestimiento',
      ),
      malla(
        unir(nucleosRevestimiento),
        material(COLORES.nucleoFibroblasto, 'nucleo', 10),
        'celulas_revestimiento_nucleos',
      ),
    ),
  );

  return modelo;
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

/** Punto de la etiqueta de cada región, sobre la cara de corte. */
export function puntoDeRegion(id: RegionOsteoide): PuntoRegion {
  const frente: Vec3 = [0, 0, 1];
  switch (id) {
    case 'osteoblastos_activos':
      return { punto: [-1.55, Y_SUPERFICIE + 0.2, 0.001], normal: frente, radio: 0.55 };
    case 'osteoide':
      return { punto: [-1.9, 0.09, 0.001], normal: frente, radio: 0.45 };
    case 'frente_mineralizacion':
      return { punto: [-1.2, yFrente(-1.2) - 0.006, Z_LINEAS + 0.001], normal: frente, radio: 0.4 };
    case 'hueso_inmaduro':
      return { punto: [-1.25, -0.75, 0.001], normal: frente, radio: 0.85 };
    case 'osteocito_incluido':
      return { punto: [X_INCLUIDO + 0.03, Y_INCLUIDO - 0.03, -0.009], normal: frente, radio: 0.3 };
    case 'capilar':
      return { punto: [-0.3, yCapilar(-0.3), -0.03], normal: frente, radio: 0.5 };
    case 'linea_cementante':
      return { punto: [xCemento(-0.6), -0.6, Z_LINEAS + 0.001], normal: frente, radio: 0.5 };
    case 'hueso_laminar':
      return { punto: [1.7, -0.7, 0.001], normal: frente, radio: 0.8 };
  }
}

export function esRegionOsteoide(id: string): id is RegionOsteoide {
  return (REGIONES_OSTEOIDE as readonly string[]).includes(id);
}
