/**
 * Disposición de las piezas repetidas de la escena del hueso (osteonas del corte, lagunas de los osteocitos,
 * trabéculas de las epífisis, láminas de la osteona ampliada). Lógica PURA: solo números, deterministas (misma
 * semilla, misma disposición), sin three ni Vue, para poder probarla y para que el dibujo no cambie entre
 * cargas. La escena (`ContenidoHueso.vue`) convierte estos números en mallas.
 *
 * Convención de ángulos: la de `CylinderGeometry` de three, alrededor del eje Y local: x = sen θ, z = cos θ.
 */
import { generadorDeterminista } from '../interpolacion';
import {
  CUNA,
  EPIFISIS_LARGO,
  EPIFISIS_RADIO,
  LARGO_OSTEONA,
  N_LAMINAS,
  N_OSTEOCITOS,
  N_OSTEONAS_CORTE,
  R_HAVERS,
  R_OSTEONA,
} from './estado';

const DOS_PI = Math.PI * 2;

export function grados(g: number): number {
  return (g * Math.PI) / 180;
}

/** Ángulo (radianes) del centro de la cuña del hueso largo. */
export const THETA_CUNA_CENTRO = grados(CUNA.inicio + CUNA.arco / 2);

/** Diferencia angular más corta entre dos ángulos (0 a PI). */
export function distanciaAngular(a: number, b: number): number {
  let d = Math.abs(a - b) % DOS_PI;
  if (d > Math.PI) d = DOS_PI - d;
  return d;
}

/* -------------------------------------------------------------------------------------------
 * Osteonas del corte transversal
 * ----------------------------------------------------------------------------------------- */

export interface OsteonaCorte {
  /** Posición en el plano del corte (la cortical tiene radio 1). */
  x: number;
  y: number;
  /** Escala relativa de la osteona (0,85 a 1,08). */
  escala: number;
}

/**
 * Osteonas repartidas en dos coronas dentro de la cortical (radio 0,62 a 1). Sin solaparse entre sí.
 * Deterministas.
 */
export function osteonasDelCorte(): OsteonaCorte[] {
  const azar = generadorDeterminista(1701);
  const resultado: OsteonaCorte[] = [];
  const exterior = Math.ceil(N_OSTEONAS_CORTE / 2);
  for (let i = 0; i < N_OSTEONAS_CORTE; i++) {
    const enExterior = i < exterior;
    const n = enExterior ? exterior : N_OSTEONAS_CORTE - exterior;
    const k = enExterior ? i : i - exterior;
    const angulo = ((k + (enExterior ? 0.15 : 0.65)) / n) * DOS_PI + (azar() - 0.5) * 0.16;
    // Entre el endostio (0,65) y la lámina circunferencial externa (0,95), sin tocarlos.
    const radio = (enExterior ? 0.85 : 0.76) + (azar() - 0.5) * 0.02;
    resultado.push({
      x: radio * Math.cos(angulo),
      y: radio * Math.sin(angulo),
      escala: 0.85 + azar() * 0.23,
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Trabéculas del hueso esponjoso de las epífisis
 * ----------------------------------------------------------------------------------------- */

export interface Trabecula {
  /** Centro, en coordenadas locales del hueso (eje Y = eje del hueso). */
  x: number;
  y: number;
  z: number;
  /** Dirección unitaria. */
  dx: number;
  dy: number;
  dz: number;
  largo: number;
  /** Ángulo (θ) alrededor del eje del hueso: decide si cae en la cuña que se abre. */
  theta: number;
}

/**
 * `n` trabéculas dentro de una epífisis (elipsoide de radio `EPIFISIS_RADIO` y semieje `EPIFISIS_LARGO`), con
 * dirección sesgada hacia el eje del hueso y las diagonales (las trabéculas siguen las líneas de carga:
 * ley de Wolff). `signo` = +1 para la epífisis de arriba y -1 para la de abajo.
 */
export function trabeculasDeEpifisis(
  n: number,
  semilla: number,
  signo: 1 | -1,
  yCentro: number,
): Trabecula[] {
  const azar = generadorDeterminista(semilla);
  const resultado: Trabecula[] = [];
  while (resultado.length < n) {
    const x = (azar() * 2 - 1) * 0.86 * EPIFISIS_RADIO;
    const z = (azar() * 2 - 1) * 0.86 * EPIFISIS_RADIO;
    const y = (azar() * 2 - 1) * 0.86 * EPIFISIS_LARGO;
    if ((x / EPIFISIS_RADIO) ** 2 + (z / EPIFISIS_RADIO) ** 2 + (y / EPIFISIS_LARGO) ** 2 > 0.74)
      continue;
    // Dirección: casi vertical (a lo largo del hueso) con una inclinación que crece hacia los lados.
    const lado = Math.hypot(x, z) / EPIFISIS_RADIO;
    const inclinacion = (0.15 + 0.9 * lado) * (0.6 + azar() * 0.8);
    const azimut = Math.atan2(x, z);
    const dx =
      Math.sin(inclinacion) * Math.sin(azimut) * -Math.sign(y || 1) * 0.9 + (azar() - 0.5) * 0.35;
    const dz =
      Math.sin(inclinacion) * Math.cos(azimut) * -Math.sign(y || 1) * 0.9 + (azar() - 0.5) * 0.35;
    const dy = Math.cos(inclinacion) * signo;
    const norma = Math.hypot(dx, dy, dz) || 1;
    resultado.push({
      x,
      y: yCentro + y,
      z,
      dx: dx / norma,
      dy: dy / norma,
      dz: dz / norma,
      largo: 0.32 + azar() * 0.34,
      theta: Math.atan2(x, z),
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Osteona ampliada
 * ----------------------------------------------------------------------------------------- */

/** Radio interior de la primera lámina (justo fuera de la pared del conducto de Havers). */
export const R_INTERIOR_LAMINAS = R_HAVERS + 0.07;
/** Grosor de cada lámina. */
export const GROSOR_LAMINA = (R_OSTEONA - R_INTERIOR_LAMINAS) / N_LAMINAS;

/** Radio interior y exterior de la lámina `i` (0 = la más cercana al conducto). Sin holgura entre láminas. */
export function radiosDeLamina(i: number): { interior: number; exterior: number } {
  return {
    interior: R_INTERIOR_LAMINAS + i * GROSOR_LAMINA,
    exterior: R_INTERIOR_LAMINAS + (i + 1) * GROSOR_LAMINA,
  };
}

/**
 * Amplitud angular (radianes) de lo que se retira de cada lámina para ver el interior: las exteriores pierden
 * más, así las interiores quedan a la vista como peldaños (corte "en escalera").
 */
export function arcoRetiradoDeLamina(i: number): number {
  return grados(46 + i * 30);
}

/** Ángulo (θ) del centro de lo que se retira de la osteona. Mira hacia +Z (la cámara) y un poco hacia arriba (el grupo se tumba con -X hacia arriba). */
export const THETA_RETIRO = grados(-20);

/** Rango angular (θ0 y amplitud) que SE CONSERVA de la lámina `i`. */
export function arcoConservadoDeLamina(i: number): { theta0: number; arco: number } {
  const retirado = arcoRetiradoDeLamina(i);
  return { theta0: THETA_RETIRO + retirado / 2, arco: DOS_PI - retirado };
}

export interface LagunaOsteocito {
  /** Lámina en la que vive (0 a N_LAMINAS - 1). */
  lamina: number;
  /** Ángulo θ y altura sobre el eje (y, a lo largo de la osteona). */
  theta: number;
  y: number;
  /** Radio al que se apoya: la cara exterior de la lámina, ligeramente por dentro. */
  radio: number;
  /** Giro de la laguna sobre su superficie (radianes). */
  giro: number;
}

/**
 * Lagunas de osteocitos: se reparten por las láminas y se colocan en la parte de su cara exterior que queda a
 * la vista (el "peldaño" que deja el corte en escalera). Las láminas del centro tienen menos superficie
 * expuesta, así que llevan menos células.
 */
export function lagunasDeOsteocitos(): LagunaOsteocito[] {
  const azar = generadorDeterminista(4242);
  const resultado: LagunaOsteocito[] = [];
  // Cuántos osteocitos por lámina (de dentro a fuera): suman N_OSTEOCITOS.
  const reparto = [2, 2, 3, 3, 3, 3];
  for (let i = 0; i < N_LAMINAS; i++) {
    const { exterior } = radiosDeLamina(i);
    const propio = arcoRetiradoDeLamina(i);
    // La cara exterior de la lámina i está a la vista donde la lámina i + 1 (la de fuera) ya no existe y la i sí:
    // entre el borde de su propio retiro y el de la siguiente.
    const siguiente = i + 1 < N_LAMINAS ? arcoRetiradoDeLamina(i + 1) : propio + grados(30);
    for (let j = 0; j < (reparto[i] ?? 0); j++) {
      const lado = j % 2 === 0 ? 1 : -1;
      const desde = propio / 2 + 0.12;
      const hasta = Math.max(desde + 0.05, siguiente / 2 - 0.12);
      const separacion = desde + (hasta - desde) * (0.2 + 0.6 * azar());
      resultado.push({
        lamina: i,
        theta: THETA_RETIRO + lado * separacion,
        y: (azar() - 0.5) * (LARGO_OSTEONA - 1.0),
        radio: exterior - 0.004,
        giro: (azar() - 0.5) * 1.2,
      });
    }
  }
  // Por si el reparto cambiara: nunca más de N_OSTEOCITOS.
  return resultado.slice(0, N_OSTEOCITOS);
}
