/**
 * Bloque de hueso cortical con sus osteonas, el esquema clásico de los atlas de histología en 3D: el modelo `osteona`
 * de la exploración 3D (actividad m1_4_osteona, «Localiza las partes de la osteona»; hasta 2026-10-18 era un dibujo
 * SVG con una ilustración hecha por IA debajo, en la que no se veían las lagunas ni los canalículos).
 *
 * El bloque está cortado de la cortical de la diáfisis: las osteonas corren a lo largo del hueso, aquí a lo largo de
 * Z, hacia la cámara. La cara de delante es un corte TRANSVERSAL (cada osteona, una diana de laminillas alrededor de
 * su conducto de Havers); la de la derecha, uno LONGITUDINAL que pasa por el eje de una osteona (sus laminillas son
 * bandas paralelas y su conducto, un canal con sus vasos); arriba, el periostio, con las laminillas circunferenciales
 * externas debajo. Una osteona, la de primer plano, sale del bloque con sus laminillas escalonadas: cada una enseña
 * sus fibras de colágeno, que van en hélice y cambian de sentido de una laminilla a la siguiente.
 *
 * Fidelidad (guion, notas de precisión de `m1_osteona_detalle`, y textos de las capas):
 *  - conducto de Havers en el centro de cada osteona, con un capilar, una vénula y (en la de primer plano) una fibra
 *    nerviosa; mide la quinta parte del diámetro de la osteona (unos 50 µm de 200 a 250 µm);
 *  - laminillas concéntricas alrededor del conducto (de 6 a 9 por osteona en el modelo);
 *  - lagunas con su osteocito ENTRE laminillas, alargadas a lo largo de ellas, y canalículos finos que salen de cada
 *    laguna en dirección radial, unen lagunas vecinas y llegan al conducto; no cruzan la línea cementante;
 *  - línea cementante festoneada (los festones son las bahías que dejó la resorción) alrededor de cada osteona;
 *  - laminillas intersticiales: arcos de osteonas antiguas, truncados por las osteonas nuevas, entre ellas;
 *  - conducto de Volkmann transversal u oblicuo, SIN laminillas concéntricas propias (atraviesa las de las osteonas),
 *    con su vaso: uno une los conductos de Havers de dos osteonas y otro baja desde el periostio a un conducto de
 *    Havers.
 * Lagunas, canalículos y conductos se ven oscuros, como en un corte por desgaste; los osteocitos, con el color de la
 * paleta común de las escenas (docs/realismo-3d.md). Los canalículos están engrosados para que se vean.
 *
 * Cada región es un grupo con el id de su nodo (`content/nodos3d.ts`) y sus propios materiales; `puntoDeRegion` da
 * el punto de su etiqueta. El bloque va algo girado (se ven el corte transversal, el longitudinal y el periostio):
 * los puntos y las normales de las etiquetas llevan el mismo giro.
 */
import type { BufferGeometry, Group } from 'three';
import { CircleGeometry, CylinderGeometry, Euler, Matrix4, SphereGeometry, Vector3 } from 'three';
import type { PuntoRegion, Vec3 } from '../modelosPorCodigo';
import type { Vec2 } from '../piezasPorCodigo';
import {
  aleatorio,
  anilloPlano,
  caja,
  cara,
  cilindroZ,
  cinta,
  distanciaASegmento,
  enCara,
  girar,
  girarRelieve,
  instancias,
  malla,
  marcoCara,
  masCercano,
  material,
  mezclar,
  muestras,
  recortar,
  region,
  trazo,
  tubo,
  unir,
} from '../piezasPorCodigo';

/** Regiones del modelo: los ids de los nodos del catálogo `osteona`. */
export const REGIONES_OSTEONA = [
  'conducto_de_havers',
  'laminillas_concentricas',
  'osteocito_en_laguna',
  'canaliculos',
  'linea_cementante',
  'conducto_de_volkmann',
  'laminillas_intersticiales',
] as const;
export type RegionOsteona = (typeof REGIONES_OSTEONA)[number];

/* ----- Medidas (unidades del modelo) ----- */

export const X_MIN = -1.2;
export const X_MAX = 1.2;
export const Y_MIN = -0.75;
/** Límite entre las osteonas y las laminillas circunferenciales externas. */
export const Y_OSTEONAS = 0.55;
/** Superficie del hueso, bajo el periostio. */
export const Y_HUESO = 0.75;
export const GROSOR_PERIOSTIO = 0.06;
const PERIOSTIO_CELULAR = 0.018;
export const Z_FRENTE = 0.6;
export const Z_FONDO = -0.6;

/** Alturas sobre las caras del bloque (de abajo arriba). */
const H_INTERSTICIAL = 0.0006;
const H_LAMINILLA = 0.0012;
const H_CEMENTO = 0.0016;
const H_CANALICULO = 0.0022;
const H_LAGUNA = 0.0026;
const H_VOLKMANN = 0.003;
/** Altura de la cúpula del osteocito sobre la cara. */
const ALTO_CELULA = 0.006;

const GROSOR_CEMENTO = 0.012;
const FORRO_CONDUCTO = 0.008;
const ANCHO_CANALICULO = 0.0034;
const ANCHO_VOLKMANN = 0.05;
/** Semiejes de una laguna (largo a lo largo de la laminilla y grosor). */
const LAGUNA: Vec2 = [0.024, 0.009];

const COLORES = {
  matriz: '#e6d8bc',
  laminaClara: '#eee4cf',
  laminaOscura: '#d4c09b',
  intersticial: '#cdb894',
  cemento: '#8c6b45',
  conducto: '#3b2c22',
  forro: '#e9d2bf',
  laguna: '#2f231b',
  canaliculo: '#4a3526',
  osteocito: '#8a9ad2',
  arteriola: '#c9473e',
  venula: '#5b6fb5',
  nervio: '#efe3c0',
  periostio: '#e6cfc4',
  periostioCelular: '#d9ae9f',
} as const;

/** Giro del bloque: inclinado hacia la cámara y algo vuelto, para ver el corte transversal, el longitudinal y el periostio. */
export const GIRO = new Euler(0.42, -0.4, 0);

/* ----- Osteonas ----- */

export interface Osteona {
  cx: number;
  cy: number;
  /** Radio de la línea cementante (borde de la osteona). */
  radio: number;
  /** Radio del conducto de Havers. */
  havers: number;
  /** Radios de los límites entre laminillas, del conducto (con su forro) a la línea cementante. */
  limites: number[];
  /** Arco que se ve en la cara de delante (la osteona de la derecha está cortada por su eje). */
  theta0: number;
  arco: number;
}

function osteona(cx: number, cy: number, radio: number, mitad = false): Osteona {
  const havers = Math.max(0.035, radio * 0.2);
  const desde = havers + FORRO_CONDUCTO;
  const hasta = radio - GROSOR_CEMENTO;
  const n = Math.max(5, Math.round((hasta - desde) / 0.032));
  return {
    cx,
    cy,
    radio,
    havers,
    limites: muestras(desde, hasta, n),
    theta0: mitad ? Math.PI / 2 : 0,
    arco: mitad ? Math.PI : Math.PI * 2,
  };
}

/**
 * Las osteonas del bloque. La primera es la de primer plano (sale del bloque); la de la derecha está cortada por su
 * eje en la cara longitudinal. Ninguna se solapa con otra.
 */
export const OSTEONAS: readonly Osteona[] = [
  osteona(-0.3, -0.12, 0.36),
  osteona(0.42, 0.12, 0.3),
  osteona(-0.88, 0.22, 0.28),
  osteona(-0.85, -0.5, 0.24),
  osteona(0.3, -0.52, 0.22),
  osteona(X_MAX, -0.15, 0.3, true),
  osteona(-0.35, 0.4, 0.14),
];
const PRIMER_PLANO = OSTEONAS[0]!;
const DERECHA = OSTEONAS[5]!;

/** Cuánto sale del bloque cada laminilla de la osteona de primer plano (la más interna, la que más). */
export function salidaLaminilla(k: number): number {
  const n = PRIMER_PLANO.limites.length - 1;
  return 0.07 + 0.045 * (n - 1 - k);
}
const SALIDA_CEMENTO = 0.04;

/** Festones de la línea cementante: bahías de resorción, convexas hacia fuera, con las puntas hacia dentro. */
function festones(o: Osteona): (theta: number) => number {
  const n = Math.max(8, Math.round((Math.PI * 2 * o.radio) / 0.07));
  const fase = (o.cx * 7.1 + o.cy * 3.3) % 1;
  return (theta: number) => {
    const f = (((theta * n) / (Math.PI * 2) + fase) % 1 + 1) % 1;
    return 0.009 * (1 - (2 * f - 1) ** 2);
  };
}

/* ----- Sistemas intersticiales ----- */

interface SistemaAntiguo {
  cx: number;
  cy: number;
  desde: number;
  hasta: number;
}

/**
 * Osteonas antiguas de las que solo quedan arcos (las laminillas intersticiales): su centro cae dentro de una osteona
 * nueva o fuera del bloque, así no se ve su conducto. Las primeras de la lista son más recientes y truncan a las
 * siguientes.
 */
const SISTEMAS_ANTIGUOS: readonly SistemaAntiguo[] = [
  { cx: 0.05, cy: 0.78, desde: 0.2, hasta: 0.62 },
  { cx: 0.55, cy: -0.05, desde: 0.32, hasta: 0.62 },
  { cx: -0.3, cy: -0.45, desde: 0.4, hasta: 0.62 },
  { cx: -1.35, cy: -0.12, desde: 0.15, hasta: 0.5 },
  { cx: 1.35, cy: 0.45, desde: 0.15, hasta: 0.55 },
];
const PERIODO_INTERSTICIAL = 0.032;

/** ¿Está el punto en el hueso intersticial (en la zona de osteonas, fuera de todas)? */
export function enIntersticial([x, y]: Vec2, margen = 0.004): boolean {
  if (x < X_MIN + 0.004 || x > X_MAX - 0.004 || y < Y_MIN + 0.004 || y > Y_OSTEONAS) return false;
  return OSTEONAS.every((o) => Math.hypot(x - o.cx, y - o.cy) > o.radio + margen);
}

export interface ArcoIntersticial {
  /** Puntos del arco (en la cara de delante). */
  puntos: Vec2[];
  radio: number;
  sistema: number;
}

/** Arcos de laminillas intersticiales que quedan visibles en la cara de delante. */
export function arcosIntersticiales(): ArcoIntersticial[] {
  const arcos: ArcoIntersticial[] = [];
  SISTEMAS_ANTIGUOS.forEach((s, i) => {
    const libre = (p: Vec2): boolean =>
      enIntersticial(p, 0.01) &&
      SISTEMAS_ANTIGUOS.slice(0, i).every(
        (t) => Math.hypot(p[0] - t.cx, p[1] - t.cy) > t.hasta + 0.012,
      );
    for (let r = s.desde; r <= s.hasta; r += PERIODO_INTERSTICIAL) {
      const n = Math.ceil((Math.PI * 2 * r) / 0.02);
      const puntos = muestras(0, Math.PI * 2, n).map((t): Vec2 => [
        s.cx + r * Math.cos(t),
        s.cy + r * Math.sin(t),
      ]);
      for (const tramo of recortar(puntos, (p) => libre(p) && libre(exterior(p, s, 0.016)))) {
        if (tramo.length >= 3) arcos.push({ puntos: tramo, radio: r, sistema: i });
      }
    }
  });
  return arcos;
}

function exterior(p: Vec2, s: { cx: number; cy: number }, d: number): Vec2 {
  const dx = p[0] - s.cx;
  const dy = p[1] - s.cy;
  const l = Math.hypot(dx, dy) || 1;
  return [p[0] + (dx / l) * d, p[1] + (dy / l) * d];
}

/* ----- Conductos de Volkmann ----- */

/** Conducto de Volkmann de la cara de delante: une el conducto de Havers de dos osteonas. */
export const VOLKMANN_FRENTE: readonly [Vec2, Vec2] = [
  [OSTEONAS[1]!.cx, OSTEONAS[1]!.cy],
  [OSTEONAS[4]!.cx, OSTEONAS[4]!.cy],
];
/**
 * Conducto de Volkmann de la cara de la derecha (en sus coordenadas u, de delante hacia atrás, y v = y): baja,
 * algo oblicuo, del periostio al conducto de Havers de la osteona cortada por su eje.
 */
export const VOLKMANN_DERECHA: readonly [Vec2, Vec2] = [
  [0.62, Y_HUESO],
  [0.5, DERECHA.cy],
];

/** ¿Pasa el punto por el surco de un conducto de Volkmann de la cara? */
function enVolkmann(p: Vec2, conducto: readonly [Vec2, Vec2], margen = 0.008): boolean {
  return distanciaASegmento(p, conducto[0], conducto[1]) < ANCHO_VOLKMANN / 2 + margen;
}

/* ----- Lagunas y canalículos ----- */

export interface Laguna {
  /** Centro, en la cara. */
  centro: Vec2;
  /** Dirección del eje largo. */
  angulo: number;
  /** Escala (1 = tamaño normal). */
  escala: number;
}

interface LagunasDeCara {
  lagunas: Laguna[];
  canaliculos: Vec2[][];
}

/** Canalículo ondulado de `desde` en la dirección `angulo`, de largo `largo`. */
function canaliculo(desde: Vec2, angulo: number, largo: number, azar: () => number): Vec2[] {
  const n = 4;
  const fase = azar() * 6.28;
  return muestras(0, 1, n).map((t): Vec2 => {
    const o = 0.004 * Math.sin(t * 7 + fase) * Math.sin(t * Math.PI);
    return [
      desde[0] + Math.cos(angulo) * largo * t - Math.sin(angulo) * o,
      desde[1] + Math.sin(angulo) * largo * t + Math.cos(angulo) * o,
    ];
  });
}

/**
 * Lagunas de la cara de delante: entre las laminillas de cada osteona (menos la de primer plano, cuya cara está
 * tapada por sus laminillas escalonadas), alargadas a lo largo de ellas, en el hueso intersticial y en las laminillas
 * circunferenciales. De cada una salen canalículos en dirección radial (a las lagunas vecinas y al conducto); no
 * cruzan la línea cementante ni el conducto de Volkmann.
 */
export function lagunasDelFrente(): LagunasDeCara {
  const azar = aleatorio(29);
  const lagunas: Laguna[] = [];
  const canaliculos: Vec2[][] = [];
  const libreDeVolkmann = (p: Vec2): boolean => !enVolkmann(p, VOLKMANN_FRENTE, 0.012);
  OSTEONAS.forEach((o, i) => {
    if (i === 0) return;
    const enOsteona = (p: Vec2): boolean => {
      const r = Math.hypot(p[0] - o.cx, p[1] - o.cy);
      return (
        r > o.havers && r < o.radio - GROSOR_CEMENTO - 0.002 && p[0] < X_MAX - 0.004 && libreDeVolkmann(p)
      );
    };
    // Una corona de lagunas cada dos límites entre laminillas.
    for (let k = 1; k < o.limites.length - 1; k += 2) {
      const r = o.limites[k]!;
      const n = Math.max(3, Math.floor((o.arco * r) / 0.1));
      const fase = azar() * 6.28;
      for (let j = 0; j < n; j++) {
        const t = o.theta0 + ((j + 0.5 + (azar() - 0.5) * 0.5) * o.arco) / n + (o.arco < 6 ? 0 : fase);
        const c: Vec2 = [o.cx + r * Math.cos(t), o.cy + r * Math.sin(t)];
        if (!enOsteona([c[0] + 0.03 * Math.cos(t + 1.57), c[1]]) || !enOsteona(c)) continue;
        if (c[0] > X_MAX - LAGUNA[0]) continue;
        lagunas.push({ centro: c, angulo: t + Math.PI / 2, escala: mezclar(0.85, 1.15, azar()) });
        // Canalículos: hacia dentro y hacia fuera (radiales), y alguno a lo largo de la laminilla.
        for (const sentido of [-1, 1]) {
          for (let q = 0; q < 2; q++) {
            const desvio = (q - 0.5) * 0.5 + (azar() - 0.5) * 0.3;
            const ang = sentido > 0 ? t + desvio : t + Math.PI + desvio;
            const inicio: Vec2 = [
              c[0] + Math.cos(ang) * LAGUNA[1],
              c[1] + Math.sin(ang) * LAGUNA[1],
            ];
            const largo = mezclar(0.045, 0.07, azar());
            for (const tramo of recortar(canaliculo(inicio, ang, largo, azar), enOsteona)) {
              canaliculos.push(tramo);
            }
          }
        }
        if (azar() < 0.3) {
          const ang = t + Math.PI / 2 + (azar() < 0.5 ? 0 : Math.PI);
          const inicio: Vec2 = [
            c[0] + Math.cos(ang) * LAGUNA[0],
            c[1] + Math.sin(ang) * LAGUNA[0],
          ];
          for (const tramo of recortar(canaliculo(inicio, ang, 0.03, azar), enOsteona)) {
            canaliculos.push(tramo);
          }
        }
      }
    }
  });
  // Hueso intersticial: lagunas entre los arcos antiguos, con canalículos cortos que no entran en las osteonas.
  const libre = (p: Vec2): boolean => enIntersticial(p, 0.008) && libreDeVolkmann(p);
  for (const arco of arcosIntersticiales()) {
    const s = SISTEMAS_ANTIGUOS[arco.sistema]!;
    for (let j = 2; j < arco.puntos.length - 2; j += 5) {
      if (azar() < 0.6) continue;
      const p = exterior(arco.puntos[j]!, s, PERIODO_INTERSTICIAL / 2 + 0.003);
      if (!libre(p) || !libre(exterior(p, s, 0.02)) || !libre(exterior(p, s, -0.02))) continue;
      const t = Math.atan2(p[1] - s.cy, p[0] - s.cx);
      lagunas.push({ centro: p, angulo: t + Math.PI / 2, escala: mezclar(0.85, 1.1, azar()) });
      for (const ang of [t, t + Math.PI, t + 0.4, t + Math.PI - 0.4]) {
        const inicio: Vec2 = [p[0] + Math.cos(ang) * LAGUNA[1], p[1] + Math.sin(ang) * LAGUNA[1]];
        for (const tramo of recortar(canaliculo(inicio, ang, 0.03, azar), libre)) canaliculos.push(tramo);
      }
    }
  }
  // Laminillas circunferenciales externas: lagunas alargadas a lo largo de X entre sus bandas.
  for (const y of muestras(Y_OSTEONAS + 0.035, Y_HUESO - 0.04, 2)) {
    for (let x = X_MIN + 0.08 + azar() * 0.1; x < X_MAX - 0.05; x += mezclar(0.22, 0.34, azar())) {
      const c: Vec2 = [x, y + 0.005 * Math.sin(x * 9)];
      lagunas.push({ centro: c, angulo: 0, escala: mezclar(0.85, 1.1, azar()) });
      for (const ang of [Math.PI / 2, -Math.PI / 2]) {
        const inicio: Vec2 = [c[0], c[1] + Math.sin(ang) * LAGUNA[1]];
        const dentro = (p: Vec2) => p[1] > Y_OSTEONAS + 0.004 && p[1] < Y_HUESO - 0.004;
        for (const tramo of recortar(canaliculo(inicio, ang + (azar() - 0.5) * 0.4, 0.028, azar), dentro))
          canaliculos.push(tramo);
      }
    }
  }
  return { lagunas, canaliculos };
}

/**
 * Lagunas de la cara longitudinal (la de la derecha, en sus coordenadas u, v): entre las bandas de las laminillas de
 * la osteona cortada por su eje, alargadas a lo largo del eje (u), con canalículos que cruzan las bandas.
 */
export function lagunasDeLaDerecha(): LagunasDeCara {
  const azar = aleatorio(41);
  const lagunas: Laguna[] = [];
  const canaliculos: Vec2[][] = [];
  const o = DERECHA;
  const enOsteona = (p: Vec2): boolean => {
    const d = Math.abs(p[1] - o.cy);
    return (
      d > o.havers && d < o.radio - GROSOR_CEMENTO - 0.002 && p[0] > 0.004 && p[0] < Z_FRENTE - Z_FONDO - 0.004 &&
      !enVolkmann(p, VOLKMANN_DERECHA, 0.012)
    );
  };
  for (let k = 1; k < o.limites.length - 1; k += 2) {
    for (const lado of [1, -1]) {
      const v = o.cy + lado * o.limites[k]!;
      for (let u = 0.05 + azar() * 0.08; u < Z_FRENTE - Z_FONDO - 0.05; u += mezclar(0.14, 0.22, azar())) {
        const c: Vec2 = [u, v];
        if (!enOsteona(c)) continue;
        lagunas.push({ centro: c, angulo: 0, escala: mezclar(0.9, 1.2, azar()) });
        for (const sentido of [1, -1]) {
          for (let q = 0; q < 2; q++) {
            const ang = sentido * Math.PI / 2 + (azar() - 0.5) * 0.5;
            const inicio: Vec2 = [c[0] + (q - 0.5) * 0.02, c[1] + Math.sin(ang) * LAGUNA[1]];
            for (const tramo of recortar(canaliculo(inicio, ang, mezclar(0.03, 0.05, azar()), azar), enOsteona))
              canaliculos.push(tramo);
          }
        }
      }
    }
  }
  return { lagunas, canaliculos };
}

/* ----- Caras ----- */

const MARCO_FRENTE = marcoCara([0, 0, Z_FRENTE], [1, 0, 0], [0, 1, 0]);
/** Cara de la derecha: u de delante (z = Z_FRENTE) hacia atrás, v = y. */
const MARCO_DERECHA = marcoCara([X_MAX, 0, Z_FRENTE], [0, 0, -1], [0, 1, 0]);

/** Bandas onduladas de las laminillas circunferenciales externas en una cara (de `desde` a `hasta` en u). */
function bandasCircunferenciales(desde: number, hasta: number, h: number): BufferGeometry[] {
  return muestras(Y_OSTEONAS + 0.012, Y_HUESO - 0.016, 6).map((y) =>
    cara(
      trazo(
        muestras(desde, hasta, 60).map((u): Vec2 => [u, y + 0.005 * Math.sin(u * 9 + y * 30)]),
        0.013,
        1,
      ),
      h,
    ),
  );
}

/** Matrices de las lagunas (discos oscuros) y de los osteocitos (cúpulas) de una cara. */
function matricesLagunas(lagunas: readonly Laguna[], marco: Matrix4): { lagunas: Matrix4[]; celulas: Matrix4[] } {
  const m = new Matrix4();
  const lista = { lagunas: [] as Matrix4[], celulas: [] as Matrix4[] };
  for (const l of lagunas) {
    const giro = new Matrix4().makeRotationZ(l.angulo);
    m.makeTranslation(l.centro[0], l.centro[1], H_LAGUNA).multiply(giro);
    lista.lagunas.push(
      marco.clone().multiply(m).multiply(new Matrix4().makeScale(LAGUNA[0] * l.escala, LAGUNA[1] * l.escala, 1)),
    );
    lista.celulas.push(
      marco
        .clone()
        .multiply(m)
        .multiply(new Matrix4().makeScale(LAGUNA[0] * l.escala * 0.64, LAGUNA[1] * l.escala * 0.52, ALTO_CELULA)),
    );
  }
  return lista;
}

/** Lagunas sobre la superficie de las laminillas de la osteona de primer plano, alargadas a lo largo de sus fibras. */
function matricesLagunasPrimerPlano(): { lagunas: Matrix4[]; celulas: Matrix4[] } {
  const azar = aleatorio(53);
  const o = PRIMER_PLANO;
  const lista = { lagunas: [] as Matrix4[], celulas: [] as Matrix4[] };
  const n = o.limites.length - 1;
  for (let k = 0; k < n - 1; k++) {
    const r = o.limites[k + 1]!;
    const z0 = Z_FRENTE + salidaLaminilla(k + 1);
    const z1 = Z_FRENTE + salidaLaminilla(k);
    const fibra = (k % 2 === 0 ? 1 : -1) * 0.6;
    const cuantas = Math.round((Math.PI * 2 * r * (z1 - z0)) / 0.0065);
    for (let j = 0; j < cuantas; j++) {
      const t = azar() * Math.PI * 2;
      const z = mezclar(z0 + 0.012, z1 - 0.012, azar());
      const normal = new Vector3(Math.cos(t), Math.sin(t), 0);
      const tangente = new Vector3(-Math.sin(t), Math.cos(t), 0);
      const largo = new Vector3(0, 0, 1).multiplyScalar(Math.cos(fibra)).addScaledVector(tangente, Math.sin(fibra));
      const ancho = new Vector3().crossVectors(normal, largo);
      const base = new Matrix4()
        .makeBasis(largo, ancho, normal)
        .setPosition(o.cx + (r + 0.0012) * Math.cos(t), o.cy + (r + 0.0012) * Math.sin(t), z);
      const e = mezclar(0.85, 1.15, azar());
      lista.lagunas.push(base.clone().multiply(new Matrix4().makeScale(LAGUNA[0] * e, LAGUNA[1] * e, 1)));
      lista.celulas.push(
        base.clone().multiply(new Matrix4().makeScale(LAGUNA[0] * e * 0.64, LAGUNA[1] * e * 0.52, ALTO_CELULA)),
      );
    }
  }
  return lista;
}

/* ----- Modelo ----- */

/** Vasos de un conducto de Havers (capilar o arteriola y vénula; fibra nerviosa en la de primer plano). */
function vasosDeHavers(o: Osteona, hasta: number): { rojo: BufferGeometry; azul: BufferGeometry } {
  const cilindro = (dx: number, dy: number, r: number): BufferGeometry => {
    const g = new CylinderGeometry(r, r, hasta - Z_FONDO, 16);
    g.rotateX(Math.PI / 2);
    g.translate(o.cx + dx, o.cy + dy, (hasta + Z_FONDO) / 2);
    return g;
  };
  return {
    rojo: cilindro(o.havers * 0.32, o.havers * 0.16, o.havers * 0.3),
    azul: cilindro(-o.havers * 0.36, -o.havers * 0.12, o.havers * 0.24),
  };
}

/** Construye el bloque de hueso cortical: un grupo (girado) con un subgrupo por región. */
export function crearOsteona(): Group {
  const modelo = region('osteona');
  const bloque = region('bloque');
  bloque.rotation.copy(GIRO);
  modelo.add(bloque);
  const enFrente = (g: BufferGeometry): BufferGeometry => enCara(g, MARCO_FRENTE);
  const enDerecha = (g: BufferGeometry): BufferGeometry => enCara(g, MARCO_DERECHA);
  const largoDerecha = Z_FRENTE - Z_FONDO;

  // Matriz del bloque y periostio (contexto, sin nodo): hueso compacto entre las osteonas y la vaina de arriba.
  const periostioArriba = Y_HUESO + GROSOR_PERIOSTIO;
  const vasoPeriostio: Vec3[] = [
    [X_MAX + 0.004, Y_HUESO + 0.02, Z_FRENTE - VOLKMANN_DERECHA[0][0]],
    [X_MAX - 0.03, periostioArriba + 0.012, Z_FRENTE - 0.6],
    [0.7, periostioArriba + 0.011, Z_FRENTE - 0.5],
    [0.1, periostioArriba + 0.012, Z_FRENTE - 0.62],
    [-0.6, periostioArriba + 0.011, Z_FRENTE - 0.45],
    [-1.15, periostioArriba + 0.012, Z_FRENTE - 0.55],
  ];
  bloque.add(
    region(
      'hueso_compacto',
      malla(
        caja([X_MIN, Y_MIN, Z_FONDO], [X_MAX, Y_HUESO, Z_FRENTE]),
        material(COLORES.matriz, 'hueso', 6),
        'matriz',
      ),
      malla(
        unir([
          ...bandasCircunferenciales(X_MIN, X_MAX, H_INTERSTICIAL).map(enFrente),
          ...bandasCircunferenciales(0, largoDerecha, H_INTERSTICIAL).map(enDerecha),
        ]),
        material(COLORES.laminaOscura, 'hueso', 6),
        'laminillas_circunferenciales',
      ),
    ),
    region(
      'periostio',
      malla(
        caja([X_MIN, Y_HUESO, Z_FONDO], [X_MAX, periostioArriba, Z_FRENTE]),
        material(COLORES.periostio, 'membrana', [6, 3]),
        'periostio_vaina',
      ),
      malla(
        unir([
          enFrente(
            cara(
              [
                [X_MIN, Y_HUESO],
                [X_MAX, Y_HUESO],
                [X_MAX, Y_HUESO + PERIOSTIO_CELULAR],
                [X_MIN, Y_HUESO + PERIOSTIO_CELULAR],
              ],
              H_INTERSTICIAL,
            ),
          ),
          enDerecha(
            cara(
              [
                [0, Y_HUESO],
                [largoDerecha, Y_HUESO],
                [largoDerecha, Y_HUESO + PERIOSTIO_CELULAR],
                [0, Y_HUESO + PERIOSTIO_CELULAR],
              ],
              H_INTERSTICIAL,
            ),
          ),
        ]),
        material(COLORES.periostioCelular, 'membrana', [6, 3]),
        'periostio_celular',
      ),
      malla(tubo(vasoPeriostio, 0.013, 60, 8, 0.04), material(COLORES.arteriola, 'vaso'), 'vaso_periostico'),
    ),
  );

  // Laminillas concéntricas: dianas en la cara de delante, bandas en la longitudinal y las laminillas escalonadas de
  // la osteona de primer plano, con sus fibras en hélice que cambian de sentido.
  const discosClaros: BufferGeometry[] = [];
  const discosOscuros: BufferGeometry[] = [];
  const ladosClaros: BufferGeometry[] = [];
  const ladosOscuros: BufferGeometry[] = [];
  OSTEONAS.forEach((o, i) => {
    const n = o.limites.length - 1;
    for (let k = 0; k < n; k++) {
      const r1 = o.limites[k]!;
      const r2 = o.limites[k + 1]!;
      const discos = k % 2 === 0 ? discosClaros : discosOscuros;
      const ultima = k === n - 1;
      if (i === 0) {
        const z = Z_FRENTE + salidaLaminilla(k);
        (k % 2 === 0 ? ladosClaros : ladosOscuros).push(cilindroZ(o.cx, o.cy, r2, Z_FRENTE, z, 64));
        const tapa = anilloPlano(o.cx, o.cy, r1, r2, 0, 0, Math.PI * 2, 64);
        tapa.translate(0, 0, z);
        discos.push(tapa);
      } else {
        // La última laminilla llega hasta los festones de la línea cementante; las demás son anillos regulares.
        const borde = ultima ? festones(o) : () => 0;
        discos.push(
          enFrente(anilloPlano(o.cx, o.cy, r1, r2, H_LAMINILLA, o.theta0, o.arco, 72, borde, false)),
        );
      }
      if (o === DERECHA) {
        for (const lado of [1, -1]) {
          const a = o.cy + lado * r1;
          const b = o.cy + lado * r2;
          discos.push(
            enDerecha(
              cara(
                [
                  [0, Math.min(a, b)],
                  [largoDerecha, Math.min(a, b)],
                  [largoDerecha, Math.max(a, b)],
                  [0, Math.max(a, b)],
                ],
                H_LAMINILLA,
              ),
            ),
          );
        }
      }
    }
  });
  bloque.add(
    region(
      'laminillas_concentricas',
      malla(unir(discosClaros), material(COLORES.laminaClara, 'hueso', 8), 'laminillas_claras'),
      malla(unir(discosOscuros), material(COLORES.laminaOscura, 'hueso', 8), 'laminillas_oscuras'),
      malla(
        unir(ladosClaros),
        girarRelieve(material(COLORES.laminaClara, 'fibra', [14, 5]), 0.6),
        'laminillas_claras_fibras',
      ),
      malla(
        unir(ladosOscuros),
        girarRelieve(material(COLORES.laminaOscura, 'fibra', [14, 5]), -0.6),
        'laminillas_oscuras_fibras',
      ),
    ),
  );

  // Línea cementante: contorno festoneado de cada osteona (y su collar en la de primer plano, y sus dos líneas en el
  // corte longitudinal).
  const cemento: BufferGeometry[] = [];
  OSTEONAS.forEach((o, i) => {
    if (i === 0) {
      cemento.push(cilindroZ(o.cx, o.cy, o.radio, Z_FRENTE, Z_FRENTE + SALIDA_CEMENTO, 72));
      const tapa = anilloPlano(o.cx, o.cy, o.radio - GROSOR_CEMENTO, o.radio, 0, 0, Math.PI * 2, 72);
      tapa.translate(0, 0, Z_FRENTE + SALIDA_CEMENTO);
      cemento.push(tapa);
      return;
    }
    cemento.push(
      enFrente(
        anilloPlano(
          o.cx,
          o.cy,
          o.radio - GROSOR_CEMENTO * 0.4,
          o.radio,
          H_CEMENTO,
          o.theta0,
          o.arco,
          140,
          festones(o),
        ),
      ),
    );
  });
  for (const lado of [1, -1]) {
    const a = DERECHA.cy + lado * (DERECHA.radio - GROSOR_CEMENTO * 0.4);
    const b = DERECHA.cy + lado * (DERECHA.radio + 0.004);
    cemento.push(
      enDerecha(
        cara(
          muestras(0, largoDerecha, 40)
            .map((u): Vec2 => [u, Math.min(a, b) + 0.004 * Math.sin(u * 40)])
            .concat(
              muestras(largoDerecha, 0, 40).map((u): Vec2 => [u, Math.max(a, b) + 0.004 * Math.sin(u * 40)]),
            ),
          H_CEMENTO,
        ),
      ),
    );
  }
  bloque.add(
    region('linea_cementante', malla(unir(cemento), material(COLORES.cemento, 'hueso', 10), 'linea_cementante')),
  );

  // Conducto de Havers: la luz oscura en cada osteona, su forro, los vasos (y el nervio de la de primer plano), y el
  // canal abierto de la osteona cortada por su eje.
  const luz: BufferGeometry[] = [];
  const forro: BufferGeometry[] = [];
  const rojos: BufferGeometry[] = [];
  const azules: BufferGeometry[] = [];
  OSTEONAS.forEach((o, i) => {
    if (i === 0) {
      const boca = Z_FRENTE + salidaLaminilla(0);
      forro.push(cilindroZ(o.cx, o.cy, o.havers, Z_FRENTE - 0.05, boca + 0.012, 40));
      const anillo = anilloPlano(o.cx, o.cy, o.havers, o.havers + FORRO_CONDUCTO, 0, 0, Math.PI * 2, 40);
      anillo.translate(0, 0, boca + 0.012);
      forro.push(anillo);
      const fondo = anilloPlano(o.cx, o.cy, 0, o.havers, 0, 0, Math.PI * 2, 40);
      fondo.translate(0, 0, Z_FRENTE - 0.05);
      luz.push(fondo);
      const v = vasosDeHavers(o, boca + 0.13);
      rojos.push(v.rojo);
      azules.push(v.azul);
      return;
    }
    luz.push(enFrente(anilloPlano(o.cx, o.cy, 0, o.havers, H_CEMENTO, o.theta0, o.arco, 40)));
    forro.push(
      enFrente(anilloPlano(o.cx, o.cy, o.havers, o.havers + FORRO_CONDUCTO, H_CEMENTO, o.theta0, o.arco, 40)),
    );
    const v = vasosDeHavers(o, Z_FRENTE + 0.008);
    rojos.push(v.rojo);
    azules.push(v.azul);
  });
  luz.push(
    enDerecha(
      cara(
        [
          [0, DERECHA.cy - DERECHA.havers],
          [largoDerecha, DERECHA.cy - DERECHA.havers],
          [largoDerecha, DERECHA.cy + DERECHA.havers],
          [0, DERECHA.cy + DERECHA.havers],
        ],
        H_CEMENTO,
      ),
    ),
  );
  const nervio = new CylinderGeometry(0.009, 0.009, Z_FRENTE + salidaLaminilla(0) + 0.09 - Z_FONDO, 10);
  nervio.rotateX(Math.PI / 2);
  nervio.translate(
    PRIMER_PLANO.cx + 0.004,
    PRIMER_PLANO.cy - PRIMER_PLANO.havers * 0.55,
    (Z_FRENTE + salidaLaminilla(0) + 0.09 + Z_FONDO) / 2,
  );
  bloque.add(
    region(
      'conducto_de_havers',
      malla(unir(luz), material(COLORES.conducto, 'cavidad'), 'conducto_luz'),
      malla(unir(forro), material(COLORES.forro, 'membrana', 20), 'conducto_forro'),
      malla(unir(rojos), material(COLORES.arteriola, 'vaso'), 'conducto_capilares'),
      malla(unir(azules), material(COLORES.venula, 'vaso'), 'conducto_venulas'),
      malla(nervio, material(COLORES.nervio, 'nervio', [6, 20]), 'conducto_nervio'),
    ),
  );

  // Laminillas intersticiales: arcos de osteonas antiguas entre las nuevas.
  bloque.add(
    region(
      'laminillas_intersticiales',
      malla(
        unir(arcosIntersticiales().map((a) => enFrente(cara(trazo(a.puntos, 0.014, 1), H_INTERSTICIAL)))),
        material(COLORES.intersticial, 'hueso', 8),
        'laminillas_intersticiales',
      ),
    ),
  );

  // Osteocitos en sus lagunas: un disco oscuro (la laguna) con la cúpula del osteocito dentro.
  const frente = lagunasDelFrente();
  const derecha = lagunasDeLaDerecha();
  const deFrente = matricesLagunas(frente.lagunas, MARCO_FRENTE);
  const deDerecha = matricesLagunas(derecha.lagunas, MARCO_DERECHA);
  const dePrimerPlano = matricesLagunasPrimerPlano();
  const disco = new CircleGeometry(1, 14);
  const cupula = new SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  cupula.rotateX(Math.PI / 2);
  bloque.add(
    region(
      'osteocito_en_laguna',
      instancias(
        disco,
        material(COLORES.laguna, 'cavidad'),
        [...deFrente.lagunas, ...deDerecha.lagunas, ...dePrimerPlano.lagunas],
        'lagunas',
      ),
      instancias(
        cupula,
        material(COLORES.osteocito, 'celula', 40),
        [...deFrente.celulas, ...deDerecha.celulas, ...dePrimerPlano.celulas],
        'osteocitos',
      ),
    ),
  );

  // Canalículos: cintas finas y oscuras que salen de cada laguna.
  bloque.add(
    region(
      'canaliculos',
      malla(
        unir([
          ...frente.canaliculos.map((c) => enFrente(cinta(c, ANCHO_CANALICULO, H_CANALICULO))),
          ...derecha.canaliculos.map((c) => enDerecha(cinta(c, ANCHO_CANALICULO, H_CANALICULO))),
        ]),
        material(COLORES.canaliculo, 'cavidad'),
        'canaliculos',
      ),
    ),
  );

  // Conductos de Volkmann: un surco abierto en cada cara de corte (sin laminillas propias: cruza las de las osteonas)
  // con su vaso, que une los vasos de los conductos de Havers (y, el de la derecha, con el periostio).
  const [a, b] = VOLKMANN_FRENTE;
  const [c, d] = VOLKMANN_DERECHA;
  const surco = (p: Vec2, q: Vec2): Vec2[] => trazo([p, q], ANCHO_VOLKMANN, 6);
  const vasoFrente: Vec3[] = muestras(0, 1, 6).map((t): Vec3 => {
    const p = new Vector3(mezclar(a[0], b[0], t), mezclar(a[1], b[1], t), 0.002 * Math.sin(t * 9));
    p.applyMatrix4(MARCO_FRENTE);
    return [p.x, p.y, p.z];
  });
  const vasoDerecha: Vec3[] = [
    ...muestras(0, 1, 6).map((t): Vec3 => {
      const p = new Vector3(mezclar(d[0], c[0], t), mezclar(d[1], c[1], t), 0.002 * Math.sin(t * 7));
      p.applyMatrix4(MARCO_DERECHA);
      return [p.x, p.y, p.z];
    }),
    vasoPeriostio[0]!,
  ];
  bloque.add(
    region(
      'conducto_de_volkmann',
      malla(
        unir([enFrente(cara(surco(a, b), H_VOLKMANN)), enDerecha(cara(surco(c, [d[0], d[1] + DERECHA.havers]), H_VOLKMANN))]),
        material(COLORES.conducto, 'cavidad'),
        'volkmann_luz',
      ),
      malla(
        unir([tubo(vasoFrente, 0.014, 40, 8), tubo(vasoDerecha, 0.014, 40, 8)]),
        material(COLORES.arteriola, 'vaso'),
        'volkmann_vaso',
      ),
    ),
  );

  return modelo;
}

/* ----- Puntos de las etiquetas ----- */

/** Punto y normal en el bloque sin girar, llevados al modelo girado. */
function girado(punto: Vec3, normal: Vec3, radio: number): PuntoRegion {
  return { punto: girar(punto, GIRO), normal: girar(normal, GIRO), radio };
}

const FRENTE: Vec3 = [0, 0, 1];

/** Punto de la etiqueta de cada región (sobre la cara de delante o sobre la osteona de primer plano). */
export function puntoDeRegion(id: RegionOsteona): PuntoRegion {
  const o = PRIMER_PLANO;
  switch (id) {
    case 'conducto_de_havers':
      return girado([o.cx, o.cy, Z_FRENTE + salidaLaminilla(0) + 0.012], FRENTE, 0.35);
    case 'laminillas_concentricas': {
      const k = 3;
      const r = (o.limites[k]! + o.limites[k + 1]!) / 2;
      const t = (140 * Math.PI) / 180;
      return girado([o.cx + r * Math.cos(t), o.cy + r * Math.sin(t), Z_FRENTE + salidaLaminilla(k)], FRENTE, 0.4);
    }
    case 'osteocito_en_laguna': {
      const o1 = OSTEONAS[1]!;
      const l = masCercano(lagunasDelFrente().lagunas, (x) => x.centro, [
        o1.cx + 0.2 * Math.cos(0.5),
        o1.cy + 0.2 * Math.sin(0.5),
      ]);
      return girado([l.centro[0], l.centro[1], Z_FRENTE + H_LAGUNA + ALTO_CELULA * 0.5], FRENTE, 0.16);
    }
    case 'canaliculos': {
      const o4 = OSTEONAS[4]!;
      const puntos = lagunasDelFrente().canaliculos.map((c) => c[Math.floor(c.length / 2)]!);
      const p = masCercano(puntos, (x) => x, [o4.cx - 0.12, o4.cy + 0.06]);
      return girado([p[0], p[1], Z_FRENTE + H_CANALICULO], FRENTE, 0.16);
    }
    case 'linea_cementante': {
      const o2 = OSTEONAS[2]!;
      const t = (-40 * Math.PI) / 180;
      const r = o2.radio - GROSOR_CEMENTO * 0.2;
      return girado([o2.cx + r * Math.cos(t), o2.cy + r * Math.sin(t), Z_FRENTE + H_CEMENTO], FRENTE, 0.3);
    }
    case 'conducto_de_volkmann': {
      const [a, b] = VOLKMANN_FRENTE;
      return girado([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Z_FRENTE + 0.012], FRENTE, 0.4);
    }
    case 'laminillas_intersticiales': {
      const puntos = arcosIntersticiales().flatMap((a) => a.puntos);
      const p = masCercano(puntos, (x) => x, [0.02, 0.3]);
      return girado([p[0], p[1], Z_FRENTE + H_INTERSTICIAL], FRENTE, 0.35);
    }
  }
}

export function esRegionOsteona(id: string): id is RegionOsteona {
  return (REGIONES_OSTEONA as readonly string[]).includes(id);
}
