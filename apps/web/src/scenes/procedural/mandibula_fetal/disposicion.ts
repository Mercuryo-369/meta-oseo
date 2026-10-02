/**
 * Disposición de la escena de la mandíbula fetal: el arco en herradura que siguen el cartílago de Meckel, el
 * nervio y el hueso; el perfil del cuerpo óseo; la silueta de la rama; los gérmenes dentarios y las células del
 * mesénquima. Lógica PURA: solo números, deterministas (misma semilla, misma disposición), sin three ni Vue,
 * para poder probarla y para que el dibujo no cambie entre cargas. Las mallas (`mallas.ts`) convierten estos
 * números en geometría.
 *
 * Convención de ejes: +Y arriba, +Z hacia delante (la línea media, el futuro mentón), X lateral. `lado` = +1 es
 * la mitad que queda a la derecha de la pantalla en la vista general (la izquierda del sujeto) y -1 la otra.
 * El arco de cada mitad se recorre con `u`: 0 en el oído (atrás y arriba) y 1 en la línea media (delante).
 */
import { generadorDeterminista, mezclar, suave } from '../interpolacion';
import {
  ALCANCE_COMPLETO,
  MESENQUIMA,
  N_CUERPO,
  N_GERMENES,
  R_LIGAMENTO,
  R_MECKEL,
  U_CENTRO,
  U_CUERPO,
} from './estado';

export type Lado = 1 | -1;
export type Vec3 = [number, number, number];
export type Punto2 = readonly [n: number, y: number];

/* -------------------------------------------------------------------------------------------
 * El arco (curva de Bézier cuadrática por mitad)
 * ----------------------------------------------------------------------------------------- */

/**
 * Extremo posterior del arco en el plano del cuerpo, punto de control (el ángulo de la herradura) y la línea media.
 * El control queda casi a la altura de la línea media para que el arco llegue a ella tangente al plano frontal:
 * así el mentón es redondeado y no una punta, y las dos mitades se encuentran sin quiebro.
 */
const P0: Vec3 = [2.5, 0.45, -2.6];
const P1: Vec3 = [2.65, 0.1, 2.45];
const P2: Vec3 = [0, -0.1, 2.75];

/** Tramo posterior del arco (u < 0) por el que el cartílago de Meckel sube desde el cuerpo hasta el oído medio. */
export const U_OIDO = -0.3;
/** Cuánto sube y cuánto retrocede el arco entre u = 0 y `U_OIDO`. */
const SUBIDA_OIDO = { y: 1.2, z: -0.95, x: -0.1 } as const;

/**
 * Punto del arco de la mitad `lado` en `u`: de 0 (donde el cuerpo se une a la rama) a 1 (línea media) es una
 * curva de Bézier cuadrática; de `U_OIDO` a 0 es la subida hacia el oído (solo la recorre el cartílago de
 * Meckel, y el nervio en su primer tramo).
 */
export function puntoArco(lado: Lado, u: number): Vec3 {
  if (u < 0) {
    const s = Math.min(1, -u / -U_OIDO);
    const [x0, y0, z0] = puntoArco(lado, 0);
    // Arranca horizontal (derivada nula en y) y va subiendo cada vez más: el hueso no lo sigue.
    return [
      x0 + lado * SUBIDA_OIDO.x * s,
      y0 + SUBIDA_OIDO.y * s * s * (2 - s),
      z0 + SUBIDA_OIDO.z * s,
    ];
  }
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  const c = u * u;
  return [
    lado * (a * P0[0] + b * P1[0] + c * P2[0]),
    a * P0[1] + b * P1[1] + c * P2[1],
    a * P0[2] + b * P1[2] + c * P2[2],
  ];
}

const PASO_DERIVADA = 1e-3;

/** Tangente unitaria del arco en `u`, en el sentido de `u` creciente (del oído hacia delante). */
export function tangenteArco(lado: Lado, u: number): Vec3 {
  const a = puntoArco(lado, u - PASO_DERIVADA);
  const b = puntoArco(lado, u + PASO_DERIVADA);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const norma = Math.hypot(dx, dy, dz) || 1;
  return [dx / norma, dy / norma, dz / norma];
}

/** Normal HORIZONTAL unitaria del arco en `u` que apunta hacia fuera (lateral, lejos de la línea media). */
export function normalLateral(lado: Lado, u: number): Vec3 {
  const [tx, , tz] = tangenteArco(lado, u);
  const norma = Math.hypot(tx, tz) || 1;
  return [(lado * tz) / norma, 0, (-lado * tx) / norma];
}

/** Un punto del espacio dado por su `u` en el arco y un desplazamiento lateral `n` (hacia fuera) y vertical `y`. */
export function posicionEnArco(lado: Lado, u: number, n: number, y: number): Vec3 {
  const p = puntoArco(lado, u);
  const nl = normalLateral(lado, u);
  return [p[0] + nl[0] * n, p[1] + y, p[2] + nl[2] * n];
}

/** Tramo del arco que ocupa la masa de mesénquima. */
export const U_MESENQUIMA = { inicio: -0.12, fin: 1 } as const;

/** `k` valores de `u` repartidos uniformemente entre `u0` y `u1` (ambos incluidos). */
export function muestrasDeArco(u0: number, u1: number, k: number): number[] {
  return Array.from({ length: k }, (_, i) => mezclar(u0, u1, k > 1 ? i / (k - 1) : 0));
}

/* -------------------------------------------------------------------------------------------
 * Nervio alveolar inferior
 * ----------------------------------------------------------------------------------------- */

/** Desplazamiento (lateral, vertical) del nervio respecto al cartílago de Meckel. */
export const NERVIO = {
  n: 0.34,
  y: 0.05,
  uInicio: -0.12,
  uBifurcacion: 0.72,
  uFinIncisivo: 0.97,
} as const;

/** Punto del nervio alveolar inferior (o de su rama incisiva) en `u`. */
export function puntoNervio(lado: Lado, u: number): Vec3 {
  return posicionEnArco(lado, u, NERVIO.n, NERVIO.y);
}

/** Puntos del nervio mentoniano: sale de la bifurcación hacia fuera, arriba y algo adelante. */
export function puntosMentoniano(lado: Lado, k: number): Vec3[] {
  const origen = puntoNervio(lado, NERVIO.uBifurcacion);
  const nl = normalLateral(lado, NERVIO.uBifurcacion);
  const t = tangenteArco(lado, NERVIO.uBifurcacion);
  return Array.from({ length: k }, (_, i) => {
    const s = i / (k - 1);
    // Arranca siguiendo el tronco y se curva hacia fuera y arriba (el foramen mentoniano).
    const lateral = 0.52 * suave(s);
    const arriba = 0.4 * s * s;
    const adelante = 0.28 * s;
    return [
      origen[0] + nl[0] * lateral + t[0] * adelante,
      origen[1] + arriba + t[1] * adelante,
      origen[2] + nl[2] * lateral + t[2] * adelante,
    ];
  });
}

/* -------------------------------------------------------------------------------------------
 * Cartílago de Meckel
 * ----------------------------------------------------------------------------------------- */

/**
 * Radio del cartílago de Meckel en `u` con una regresión dada (0 varilla entera; 1 solo queda el ligamento
 * esfenomandibular, del oído a la cara medial de la rama, y nada en la porción media y anterior, que se
 * reabsorben). El extremo del oído se dibuja aparte como martillo y yunque, así que aquí también se apaga.
 */
export function radioMeckel(u: number, regresion: number): number {
  const ligamento = R_LIGAMENTO * suave((u - U_OIDO - 0.03) / 0.05) * (1 - suave((u - 0.1) / 0.1));
  return mezclar(R_MECKEL, ligamento, suave(regresion));
}

/** Martillo y yunque: dos piezas pequeñas en el extremo posterior del arco (semiejes en unidades de escena). */
export function osiculos(lado: Lado): { centro: Vec3; semiejes: Vec3 }[] {
  const p = puntoArco(lado, U_OIDO);
  return [
    // Martillo: continúa la varilla, algo hacia arriba.
    { centro: [p[0], p[1] + 0.08, p[2] - 0.06], semiejes: [0.09, 0.15, 0.09] },
    // Yunque: detrás y por fuera del martillo.
    { centro: [p[0] + lado * 0.12, p[1] + 0.2, p[2] - 0.3], semiejes: [0.11, 0.1, 0.12] },
  ];
}

/* -------------------------------------------------------------------------------------------
 * Cuerpo óseo: perfil, tamaño a lo largo del arco y ventana de corte
 * ----------------------------------------------------------------------------------------- */

/**
 * Perfil transversal del cuerpo óseo a tamaño 1, en coordenadas (lateral, vertical) respecto a su centro: un
 * canal en U con el suelo alrededor del nervio y dos láminas (vestibular y lingual) cuya altura da `alveolar`
 * (0 canal bajo; 1 láminas que envuelven al germen dentario). Polígono cerrado, sentido antihorario, primero el
 * contorno exterior y después el interior (la canaleta). Su topología no cambia con `alveolar`.
 */
export function perfilCuerpo(alveolar: number): Punto2[] {
  const cresta = mezclar(0.1, 0.62, alveolar);
  const pared = mezclar(-0.02, 0.25, alveolar);
  const crestaInterior = cresta - 0.04;
  // Antihorario en el plano (lateral, vertical): desde la cresta vestibular baja por la canaleta, sube por la
  // cara interior de la lámina lingual, baja por su cara exterior, recorre el suelo y vuelve por fuera.
  return [
    [0.36, cresta],
    [0.23, crestaInterior],
    [0.24, -0.08],
    [0.18, -0.22],
    [0, -0.28],
    [-0.18, -0.22],
    [-0.24, -0.08],
    [-0.23, crestaInterior],
    [-0.36, cresta],
    [-0.38, pared],
    [-0.36, -0.1],
    [-0.28, -0.32],
    [-0.12, -0.42],
    [0.12, -0.42],
    [0.28, -0.32],
    [0.36, -0.1],
    [0.38, pared],
  ];
}

/** Ancho (en `u`) de la punta afilada con que termina el hueso en crecimiento. */
const PUNTA = 0.1;

/**
 * Tamaño de la sección del cuerpo óseo en `u`: `tamano` en la zona ya osificada y una punta que se afila hasta
 * cero al llegar al `alcance` desde el centro. Cero fuera del alcance.
 */
export function escalaCuerpoEn(u: number, alcance: number, tamano: number): number {
  const distancia = Math.abs(u - U_CENTRO);
  if (distancia >= alcance) return 0;
  // Con el hueso completo la punta no se afila (los extremos son la rama y la sínfisis).
  const completo = suave((alcance - ALCANCE_COMPLETO * 0.8) / (ALCANCE_COMPLETO * 0.2));
  const afilado = suave((alcance - distancia) / PUNTA);
  return tamano * mezclar(afilado, 1, completo);
}

/** Ventana de corte del cuerpo: el tramo de `u` que falta en la mitad `lado` para ver la sección. */
export const VENTANA_CORTE = { lado: 1 as Lado, u0: 0.485, u1: 0.555 } as const;

/** Tramos (`u0`, `u1`) que dibuja el cuerpo óseo de cada mitad: la mitad con ventana va en dos. */
export function tramosCuerpo(lado: Lado): { u0: number; u1: number }[] {
  if (lado !== VENTANA_CORTE.lado) return [{ u0: U_CUERPO.inicio, u1: U_CUERPO.fin }];
  return [
    { u0: U_CUERPO.inicio, u1: VENTANA_CORTE.u0 },
    { u0: VENTANA_CORTE.u1, u1: U_CUERPO.fin },
  ];
}

/** Centro de la sección del cuerpo óseo en `u`: lateral al cartílago de Meckel, a su misma altura. */
export function centroCuerpo(lado: Lado, u: number): Vec3 {
  return posicionEnArco(lado, u, N_CUERPO, 0);
}

/* -------------------------------------------------------------------------------------------
 * Gérmenes dentarios
 * ----------------------------------------------------------------------------------------- */

/** `u` de los cinco gérmenes de cada lado (dos molares, canino y dos incisivos, de atrás adelante). */
export const U_GERMENES: readonly number[] = [0.4, 0.52, 0.64, 0.76, 0.88];
/** Radio del germen a tamaño 1 y altura de su centro sobre el centro del cuerpo. */
export const GERMEN = { radio: 0.19, y: 0.3 } as const;

export function posicionGermen(lado: Lado, indice: number): Vec3 {
  const u = U_GERMENES[indice] ?? U_GERMENES[0]!;
  return posicionEnArco(lado, u, N_CUERPO, GERMEN.y);
}

/* -------------------------------------------------------------------------------------------
 * Rama (silueta en el plano sagital, relativa a su anclaje en el cuerpo)
 * ----------------------------------------------------------------------------------------- */

/**
 * Silueta de la rama en el plano (z, y), relativa al punto del arco `U_RAMA`: la base se apoya en el cuerpo, la
 * apófisis coronoides delante, la escotadura y el cóndilo detrás y arriba, el ángulo muy abierto (mandíbula
 * neonatal: rama corta). Antihoraria vista desde +X.
 */
export function siluetaRama(): readonly Punto2[] {
  return [
    [0.55, -0.32],
    [0.5, 0.35],
    [0.35, 1.22],
    [0.15, 1.0],
    [-0.15, 0.92],
    [-0.5, 1.28],
    [-0.72, 1.62],
    [-0.98, 1.6],
    [-1.1, 1.3],
    [-1.02, 0.6],
    [-0.88, -0.36],
  ];
}

/** Grosor (en X) de la placa de la rama. */
export const GROSOR_RAMA = 0.26;
/** Cabeza del cóndilo y punta de la coronoides, en el mismo plano (z, y) relativo de la silueta. */
export const CONDILO = { z: -0.86, y: 1.58, semiejes: [0.26, 0.2, 0.24] as Vec3 } as const;
export const CORONOIDES = { z: 0.33, y: 1.2, radio: 0.13 } as const;

/** Sínfisis: donde se juntan las dos mitades, en la línea media. */
export function centroSinfisis(): Vec3 {
  const p = puntoArco(1, 1);
  return [0, p[1] + 0.08, p[2] + N_CUERPO * 0.35];
}

/* -------------------------------------------------------------------------------------------
 * Células del ectomesénquima
 * ----------------------------------------------------------------------------------------- */

export interface CelulaMesenquima {
  posicion: Vec3;
  /** Escala relativa (0,7 a 1,3). */
  escala: number;
}

/**
 * `n` células repartidas dentro de la masa de mesénquima de las dos mitades (elipse de semiejes `MESENQUIMA`
 * alrededor del arco, algo más denso hacia el lado lateral, que es donde va a formarse el hueso).
 */
export function celulasMesenquima(n: number, semilla: number): CelulaMesenquima[] {
  const azar = generadorDeterminista(semilla);
  const resultado: CelulaMesenquima[] = [];
  while (resultado.length < n) {
    const lado: Lado = azar() < 0.5 ? 1 : -1;
    const u = U_MESENQUIMA.inicio + 0.02 + azar() * (U_MESENQUIMA.fin - U_MESENQUIMA.inicio - 0.04);
    const a = (azar() * 2 - 1) * 0.9;
    const b = (azar() * 2 - 1) * 0.9;
    if (a * a + b * b > 0.85) continue;
    resultado.push({
      posicion: posicionEnArco(lado, u, a * MESENQUIMA.ancho + 0.15, b * MESENQUIMA.alto),
      escala: 0.7 + azar() * 0.6,
    });
  }
  return resultado;
}

/** Mancha de condensación: centro y semiejes (lateral al Meckel, en el ángulo del nervio y el mentoniano). */
export const CONDENSACION = {
  n: N_CUERPO + 0.02,
  y: 0.04,
  semiejes: [0.5, 0.32, 0.62] as Vec3,
} as const;

export function centroCondensacion(lado: Lado): Vec3 {
  return posicionEnArco(lado, U_CENTRO, CONDENSACION.n, CONDENSACION.y);
}

/** `n` células apretadas dentro de la mancha de condensación de cada lado. */
export function celulasCondensacion(n: number, semilla: number): CelulaMesenquima[] {
  const azar = generadorDeterminista(semilla);
  const resultado: CelulaMesenquima[] = [];
  const [sa, sb, sc] = CONDENSACION.semiejes;
  for (const lado of [1, -1] as const) {
    const centro = centroCondensacion(lado);
    const nl = normalLateral(lado, U_CENTRO);
    const t = tangenteArco(lado, U_CENTRO);
    let k = 0;
    while (k < n) {
      const a = azar() * 2 - 1;
      const b = azar() * 2 - 1;
      const c = azar() * 2 - 1;
      if (a * a + b * b + c * c > 0.8) continue;
      k++;
      resultado.push({
        posicion: [
          centro[0] + nl[0] * a * sa * 0.85 + t[0] * c * sc * 0.85,
          centro[1] + b * sb * 0.85,
          centro[2] + nl[2] * a * sa * 0.85 + t[2] * c * sc * 0.85,
        ],
        escala: 0.75 + azar() * 0.5,
      });
    }
  }
  return resultado;
}

/** Número de gérmenes por lado, reexportado para las pruebas. */
export const GERMENES_POR_LADO = N_GERMENES;
