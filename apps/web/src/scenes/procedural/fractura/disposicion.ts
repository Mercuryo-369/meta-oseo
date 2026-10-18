/**
 * Disposición de las piezas repetidas de la escena de la fractura: los vasos rotos y las gotas de sangre de la
 * brecha, las células inflamatorias sobre el hematoma, las células madre del periostio, los vasos nuevos, y los
 * osteoclastos y osteoblastos sobre el callo. También los perfiles de revolución del hematoma y del callo.
 * Lógica PURA: solo números, deterministas (misma semilla, misma disposición), sin three ni Vue. Las mallas
 * (`mallas.ts`) convierten estos números en instancias.
 *
 * Convención: eje del hueso en Y; ángulos θ como en `CylinderGeometry` (x = sen θ, z = cos θ). El fragmento
 * proximal ocupa y < 0 y el distal y > 0; la brecha está centrada en el origen.
 */
import { generadorDeterminista } from '../interpolacion';
import {
  BRECHA,
  CALLO,
  CUNA,
  DESPLAZAMIENTO,
  HEMATOMA,
  N_CELULAS_INFLAMATORIAS,
  N_CELULAS_MADRE,
  N_GOTAS,
  N_OSTEOBLASTOS,
  N_OSTEOCLASTOS,
  N_VASOS_NUEVOS,
  N_VASOS_ROTOS,
  PERIOSTIO,
  RETIRO_PERIOSTIO,
  R_CORTICAL,
  R_MEDULAR,
} from './estado';

export type Punto3 = readonly [number, number, number];

const DOS_PI = Math.PI * 2;

export function grados(g: number): number {
  return (g * Math.PI) / 180;
}

/** Ángulo (radianes) del centro de la cuña que se abre. */
export const THETA_CUNA_CENTRO = grados(CUNA.inicio + CUNA.arco / 2);

/** Diferencia angular más corta entre dos ángulos (0 a PI). */
export function distanciaAngular(a: number, b: number): number {
  let d = Math.abs(a - b) % DOS_PI;
  if (d > Math.PI) d = DOS_PI - d;
  return d;
}

/** Con la cuña abierta, lo que cae en su sector (más un margen) no se dibuja: quedaría flotando en el aire. */
export function enCuna(theta: number, margenGrados = 6): boolean {
  return distanciaAngular(theta, THETA_CUNA_CENTRO) < grados(CUNA.arco / 2 + margenGrados);
}

/** Desplazamiento lateral (en x local) del fragmento en el que cae `y`: solo el distal está desplazado. */
export function desplazamientoEn(y: number): number {
  return y > 0 ? DESPLAZAMIENTO : 0;
}

/** Punto en coordenadas cilíndricas (radio, θ, y) alrededor del eje del fragmento en el que cae (el distal, desplazado). */
function cilindrico(radio: number, theta: number, y: number): Punto3 {
  return [radio * Math.sin(theta) + desplazamientoEn(y), y, radio * Math.cos(theta)];
}

/**
 * Punto en coordenadas cilíndricas alrededor del eje x = 0, sin el desplazamiento del fragmento distal: el del
 * hematoma y el callo, que son tornos centrados en el eje del proximal. Lo que se apoya en ellos va aquí (antes iba
 * con `cilindrico` y, en y > 0, quedaba 0,12 apartado de la superficie: flotaba).
 */
export function cilindricoCentrado(radio: number, theta: number, y: number): Punto3 {
  return [radio * Math.sin(theta), y, radio * Math.cos(theta)];
}

/**
 * Relieve suave (entre −1 y 1) de la superficie de un sólido de revolución según el ángulo θ y la altura `y`:
 * suma de ondas con frecuencias ENTERAS en θ (la vuelta cierra sin costura). Determinista; `semilla` da otro
 * dibujo. Lo usan `abollar` (geometría del hematoma y del callo) y la colocación de las células sobre ellos.
 */
export function grumo(theta: number, y: number, semilla = 0): number {
  return (
    0.5 * Math.sin(3 * theta + 2.3 * y + semilla) * Math.cos(theta - 1.7 * y + 1.1 * semilla) +
    0.3 * Math.sin(5 * theta - 3.1 * y + 2 * semilla) +
    0.2 * Math.sin(9 * theta + 5.3 * y + 0.5 * semilla)
  );
}

/**
 * Irregularidad de la superficie del hematoma y del callo (fracción del radio; ver `abollar`) y la semilla de su
 * dibujo. Las células que se apoyan en ellos se colocan sobre esa misma superficie irregular.
 */
export const IRREGULAR = {
  hematoma: { amplitud: 0.045, semilla: 0.4 },
  callo: { amplitud: 0.03, semilla: 2.1 },
} as const;

/* -------------------------------------------------------------------------------------------
 * Perfiles de revolución (radio en función de y)
 * ----------------------------------------------------------------------------------------- */

/** Radio del hematoma a la altura `y` (0 fuera de su medio largo). Fusiforme sólido. */
export function radioHematoma(y: number): number {
  const k = Math.abs(y) / HEMATOMA.medioLargo;
  return k >= 1 ? 0 : HEMATOMA.radio * Math.pow(1 - k * k, 0.7);
}

/**
 * Radio del callo a la altura `y` a escala 1 (0 fuera de su medio largo). Manguito fusiforme: en los extremos
 * baja hasta un poco menos que la cortical, para que se funda con ella.
 */
export function radioCallo(y: number): number {
  const k = Math.abs(y) / CALLO.medioLargo;
  if (k >= 1) return 0;
  const base = R_CORTICAL - 0.03;
  return base + (CALLO.radioMax - base) * Math.pow(1 - k * k, 1.4);
}

/**
 * Perfil `[radio, y]` de un sólido de revolución entre `y0` y `y1`, cerrado sobre el eje en los dos extremos,
 * con `n` puntos intermedios de la función `radio(y)`.
 */
export function perfilSolido(
  radio: (y: number) => number,
  y0: number,
  y1: number,
  n = 18,
): [number, number][] {
  const puntos: [number, number][] = [[0, y0]];
  for (let i = 0; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    puntos.push([Math.max(0.001, radio(y)), y]);
  }
  puntos.push([0, y1]);
  return puntos;
}

/* -------------------------------------------------------------------------------------------
 * Sangrado: vasos rotos y gotas
 * ----------------------------------------------------------------------------------------- */

export interface Tramo {
  a: Punto3;
  b: Punto3;
  /** Ángulo θ alrededor del eje (decide si cae en la cuña abierta). */
  theta: number;
}

/**
 * Vasos rotos: salen de la cara de fractura de cada fragmento (de la cortical y del periostio) hacia la brecha,
 * cortos y torcidos.
 */
export function vasosRotos(): Tramo[] {
  const azar = generadorDeterminista(501);
  const resultado: Tramo[] = [];
  for (let i = 0; i < N_VASOS_ROTOS; i++) {
    const signo = i % 2 === 0 ? -1 : 1;
    const theta = azar() * DOS_PI;
    const desdePeriostio = i % 3 === 0;
    const radio = desdePeriostio
      ? PERIOSTIO.exterior + 0.02
      : R_MEDULAR + (R_CORTICAL - R_MEDULAR) * (0.25 + azar() * 0.5);
    const y0 = signo * (BRECHA / 2 + (desdePeriostio ? RETIRO_PERIOSTIO : 0));
    const a = cilindrico(radio, theta, y0);
    const largo = 0.15 + azar() * 0.2;
    const b: Punto3 = [
      a[0] + (azar() - 0.5) * 0.2,
      a[1] - signo * largo,
      a[2] + (azar() - 0.5) * 0.2,
    ];
    resultado.push({ a, b, theta });
  }
  return resultado;
}

export interface Gota {
  p: Punto3;
  radio: number;
  theta: number;
}

/** Gotas de sangre repartidas por la brecha y alrededor de los extremos. */
export function gotasDeSangre(): Gota[] {
  const azar = generadorDeterminista(777);
  const resultado: Gota[] = [];
  for (let i = 0; i < N_GOTAS; i++) {
    const theta = azar() * DOS_PI;
    const y = (azar() * 2 - 1) * 0.7;
    const dentro = Math.abs(y) < BRECHA / 2;
    // En la brecha caben a cualquier radio; fuera de ella, solo por fuera del periostio o dentro del canal.
    let radio: number;
    if (dentro) radio = azar() * 1.15;
    else if (azar() < 0.5) radio = PERIOSTIO.exterior + 0.05 + azar() * 0.2;
    else radio = azar() * (R_MEDULAR - 0.08);
    resultado.push({ p: cilindrico(radio, theta, y), radio: 0.035 + azar() * 0.035, theta });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Inflamación: células sobre el hematoma y células madre del periostio
 * ----------------------------------------------------------------------------------------- */

export interface Celula {
  /** Posición (las que se apoyan en el hematoma: con el hematoma a escala 1; ver `puntoSobreHematoma`). */
  p: Punto3;
  radio: number;
  theta: number;
  /** Retraso relativo (0 a 1) con el que aparece. */
  retraso: number;
  /** Se apoya en la superficie del hematoma: se coloca en cada fotograma, a la escala que tenga el hematoma. */
  superficie?: boolean;
}

/**
 * Posición de una célula apoyada en el hematoma cuando este está a la escala `s`: sobre su superficie IRREGULAR (la
 * de `abollar`, la misma que se dibuja), asomando el 65 % de su diámetro. Así no flota ni se hunde, y lo acompaña
 * cuando el hematoma encoge. `presencia` (0 a 1) es la fracción de su radio con que se dibuja mientras aparece: la
 * separación de la superficie va con ella (una célula que empieza a crecer no queda en el aire).
 */
export function puntoSobreHematoma(
  c: Pick<Celula, 'p' | 'radio' | 'theta'>,
  s: number,
  presencia = 1,
): Punto3 {
  const y = c.p[1];
  const { amplitud, semilla } = IRREGULAR.hematoma;
  const superficie = s * radioHematoma(y) * (1 + amplitud * grumo(c.theta, y, semilla));
  return cilindricoCentrado(superficie + 0.3 * c.radio * presencia, c.theta, s * y);
}

/**
 * Células inflamatorias (neutrófilos, pequeños) y macrófagos (más grandes): sobre la superficie del hematoma y
 * dentro de la brecha. Se devuelven como dos listas.
 */
export function celulasInflamatorias(): { neutrofilos: Celula[]; macrofagos: Celula[] } {
  const azar = generadorDeterminista(1313);
  const neutrofilos: Celula[] = [];
  const macrofagos: Celula[] = [];
  for (let i = 0; i < N_CELULAS_INFLAMATORIAS; i++) {
    const theta = azar() * DOS_PI;
    const macrofago = i % 3 === 0;
    const enBrecha = i % 4 === 1;
    // Dentro de la brecha, entre los extremos, o sobre la superficie del hematoma (se coloca en cada fotograma).
    const y = enBrecha
      ? (azar() * 2 - 1) * (BRECHA / 2 - 0.06)
      : (azar() * 2 - 1) * HEMATOMA.medioLargo * 0.85;
    const radioBrecha = enBrecha ? 0.15 + azar() * 0.9 : 0;
    const radio = macrofago ? 0.1 + azar() * 0.03 : 0.06 + azar() * 0.02;
    const celula: Celula = enBrecha
      ? { p: cilindrico(radioBrecha, theta, y), radio, theta, retraso: azar() }
      : { p: [0, y, 0], radio, theta, retraso: azar(), superficie: true };
    if (celula.superficie) celula.p = puntoSobreHematoma(celula, 1);
    (macrofago ? macrofagos : neutrofilos).push(celula);
  }
  return { neutrofilos, macrofagos };
}

/** Células madre del periostio (y algunas de la médula), cerca de la fractura. */
export function celulasMadre(): Celula[] {
  const azar = generadorDeterminista(2024);
  const resultado: Celula[] = [];
  for (let i = 0; i < N_CELULAS_MADRE; i++) {
    const signo = i % 2 === 0 ? -1 : 1;
    const theta = azar() * DOS_PI;
    const deMedula = i % 4 === 3;
    const y = signo * (BRECHA / 2 + RETIRO_PERIOSTIO + 0.1 + azar() * 1.1);
    const radio = deMedula ? 0.2 + azar() * 0.3 : PERIOSTIO.exterior + 0.07;
    resultado.push({
      p: cilindrico(radio, theta, y),
      radio: 0.07 + azar() * 0.02,
      theta,
      retraso: azar(),
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Vasos nuevos
 * ----------------------------------------------------------------------------------------- */

/** Vasos nuevos: desde el periostio hacia el callo y desde la médula hacia la brecha. Crecen de `a` a `b`. */
export function vasosNuevos(): Tramo[] {
  const azar = generadorDeterminista(4040);
  const resultado: Tramo[] = [];
  for (let i = 0; i < N_VASOS_NUEVOS; i++) {
    const signo = i % 2 === 0 ? -1 : 1;
    const theta = azar() * DOS_PI;
    const deMedula = i % 4 === 3;
    if (deMedula) {
      const y0 = signo * (BRECHA / 2 + 0.9 + azar() * 0.4);
      const a = cilindrico(0.1 + azar() * 0.3, theta, y0);
      const b: Punto3 = [a[0], signo * (azar() * 0.1), a[2]];
      resultado.push({ a, b, theta });
    } else {
      const y0 = signo * (BRECHA / 2 + RETIRO_PERIOSTIO + 0.2 + azar() * 1.2);
      const a = cilindrico(PERIOSTIO.exterior, theta, y0);
      // Sube hacia fuera y hacia la brecha, por dentro del manguito del callo.
      const y1 = y0 - signo * (0.5 + azar() * 0.5);
      const radio1 = Math.min(radioCallo(y1) - 0.12, PERIOSTIO.exterior + 0.45);
      const b = cilindrico(radio1, theta + (azar() - 0.5) * 0.25, y1);
      resultado.push({ a, b, theta });
    }
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Células sobre el callo: se colocan en tiempo de dibujo sobre la superficie del callo A LA ESCALA ACTUAL
 * ----------------------------------------------------------------------------------------- */

export interface CelulaEnCallo {
  /** Altura (a escala 1 del callo) y ángulo de la célula sobre la superficie. */
  y: number;
  theta: number;
  radio: number;
  retraso: number;
}

/** Osteoclastos: sobre el manguito, donde sobra callo (lejos de la brecha y en el centro por igual). */
export function osteoclastosDelCallo(): CelulaEnCallo[] {
  const azar = generadorDeterminista(9090);
  const resultado: CelulaEnCallo[] = [];
  for (let i = 0; i < N_OSTEOCLASTOS; i++) {
    resultado.push({
      y: (azar() * 2 - 1) * CALLO.medioLargo * 0.75,
      theta: azar() * DOS_PI,
      radio: 0.11 + azar() * 0.03,
      retraso: azar(),
    });
  }
  return resultado;
}

/** Osteoblastos: pequeños, sobre el manguito y concentrados hacia el centro. */
export function osteoblastosDelCallo(): CelulaEnCallo[] {
  const azar = generadorDeterminista(6060);
  const resultado: CelulaEnCallo[] = [];
  for (let i = 0; i < N_OSTEOBLASTOS; i++) {
    resultado.push({
      y: (azar() * 2 - 1) * CALLO.medioLargo * 0.6,
      theta: azar() * DOS_PI,
      radio: 0.055 + azar() * 0.015,
      retraso: azar(),
    });
  }
  return resultado;
}

/**
 * Posición de una célula sobre la superficie del callo cuando este está a la escala `escala`: sobre su superficie
 * IRREGULAR (la de `abollar`, la misma que se dibuja), con el centro a 0,2 radios por fuera. Aplanada contra la
 * superficie (`normalSobreCallo`, 0,6 radios de grosor), asoma unos dos tercios y se apoya en toda su base.
 * `presencia`, como en `puntoSobreHematoma`. Antes asomaban del 48 al 99 % (esferas sobre el perfil liso: canicas).
 */
export function puntoSobreCallo(c: CelulaEnCallo, escala: number, presencia = 1): Punto3 {
  const { amplitud, semilla } = IRREGULAR.callo;
  const superficie = escala * radioCallo(c.y) * (1 + amplitud * grumo(c.theta, c.y, semilla));
  return cilindricoCentrado(superficie + 0.2 * c.radio * presencia, c.theta, escala * c.y);
}

/**
 * Normal (unitaria) de la superficie lisa del callo bajo una célula: hacia fuera y tumbada según la pendiente del
 * perfil (en los extremos del manguito, hasta unos 30°). No depende de la escala (el callo escala por igual en
 * todas las direcciones). Las células del callo se aplanan a lo largo de ella.
 */
export function normalSobreCallo(c: CelulaEnCallo): Punto3 {
  const h = 1e-3;
  const pendiente = (radioCallo(c.y + h) - radioCallo(c.y - h)) / (2 * h);
  const n = Math.hypot(1, pendiente);
  return [Math.sin(c.theta) / n, -pendiente / n, Math.cos(c.theta) / n];
}
