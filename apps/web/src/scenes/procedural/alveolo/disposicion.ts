/**
 * Disposición de la escena del alvéolo tras la extracción: los PERFILES en 2D de la sección vestibulolingual que
 * CAMBIAN con el tiempo (el contorno del cuerpo y su interior según la pérdida del reborde, la encía que cierra, el
 * relleno del alvéolo que crece desde el fondo o se encoge desde las paredes) y las piezas repetidas (trabéculas,
 * osteoclastos, vasos, sangrado). Lógica PURA: solo números, deterministas, sin three ni Vue.
 *
 * Los perfiles fijos (raíz, corona, pulpa, bandas del ligamento y de la lámina) se importan de la escena
 * `hueso_alveolar` (`../alveolar/disposicion.ts`), que dibuja el mismo segmento de mandíbula.
 *
 * Convención: cada punto es `[z, y]` en el plano de corte (x = 0). +Z es vestibular, −Z lingual; +Y hacia la
 * cresta. Los polígonos que se MORFAN tienen SIEMPRE el mismo número de puntos y el mismo orden para cualquier
 * parámetro (no se quitan repetidos): `geometria.ts` escribe sus posiciones sobre una malla de topología fija.
 */
import { acotar, generadorDeterminista, mezclar } from '../interpolacion';
import {
  DESPLAZAMIENTO_LAMINA,
  Y_FONDO_INTERIOR,
  dentroDePoligono,
  semianchoInterior,
  semianchoRaiz,
  siluetaRaiz,
  signoDeLado,
} from '../alveolar/disposicion';
import type { Lado, Punto2 } from '../alveolar/disposicion';
import {
  CONDUCTO,
  GROSOR_CORTICAL,
  GROSOR_LIGAMENTO,
  PROFUNDIDAD_TRABECULAR,
  SEMIANCHO_CRESTA,
  SEMIANCHO_MAXIMO,
  SEMIANCHO_RAIZ,
  Y_APICE,
  Y_BASE,
  Y_CRESTA,
  Y_MAS_ANCHO,
  Z_ALVEOLO,
} from '../alveolar/estado';
import {
  DESPLAZAMIENTO_LINGUAL,
  ENCIA,
  ESTRECHAMIENTO,
  EXPONENTE_ESTRECHAMIENTO,
  FORAMEN,
  GROSOR_CRESTA,
  N_OSTEOCLASTOS_REBORDE,
  N_TRABECULAS_ALVEOLO,
  RADIO_CRESTA,
  REDONDEO_EXTRA,
  SEMIANCHO_MINIMO,
  yCresta,
} from './estado';

export type { Lado, Punto2 };

/** Pasos de muestreo del contorno del cuerpo (cada contorno tiene `2 * (pasos + 1)` puntos). */
export const PASOS_CONTORNO = 48;
/** Pasos de muestreo de los polígonos del relleno del alvéolo (`2 * (pasos + 1)` puntos). */
export const PASOS_RELLENO = 24;
/** Puntos de cada carril de la encía: por la cara del cuerpo, la esquina y sobre la cresta. */
export const PASOS_ENCIA = { lado: 8, techo: 6 } as const;
export const PUNTOS_ENCIA = PASOS_ENCIA.lado + 1 + 1 + PASOS_ENCIA.techo + 1;

/** Alturas entre `desde` y `hasta` con paso más fino en los extremos (coseno); siempre `pasos + 1` valores. */
export function alturasMuestreadas(desde: number, hasta: number, pasos: number): number[] {
  const lista: number[] = [];
  for (let i = 0; i <= pasos; i++) {
    const k = (1 - Math.cos((Math.PI * i) / pasos)) / 2;
    lista.push(desde + (hasta - desde) * k);
  }
  return lista;
}

/* -------------------------------------------------------------------------------------------
 * Contorno del cuerpo según la pérdida del reborde
 * ----------------------------------------------------------------------------------------- */

/**
 * Semiancho del cuerpo intacto a la altura `y` SIN el redondeo de la cresta: la misma forma que
 * `semianchoCuerpo` de la escena `hueso_alveolar` (se estrecha hacia la cresta, elipse por la base).
 */
export function semianchoBase(y: number): number {
  const yy = Math.min(Y_CRESTA, Math.max(Y_BASE, y));
  if (yy >= Y_MAS_ANCHO) {
    const k = (Y_CRESTA - yy) / (Y_CRESTA - Y_MAS_ANCHO);
    return SEMIANCHO_CRESTA + (SEMIANCHO_MAXIMO - SEMIANCHO_CRESTA) * Math.pow(k, 0.8);
  }
  const k = (yy - Y_MAS_ANCHO) / (Y_BASE - Y_MAS_ANCHO);
  return SEMIANCHO_MAXIMO * Math.sqrt(Math.max(0, 1 - k * k));
}

/** Radio del redondeo de la cresta: crece con la pérdida hasta dejarla en filo de cuchillo. */
export function radioCresta(reborde: number): number {
  return RADIO_CRESTA + acotar(reborde) * REDONDEO_EXTRA;
}

/** Fracción de altura dentro del reborde (0 en `Y_MAS_ANCHO`, 1 en la cresta actual). */
function alturaRelativa(y: number, reborde: number): number {
  return acotar((y - Y_MAS_ANCHO) / (yCresta(reborde) - Y_MAS_ANCHO));
}

/** Cuánto se ha desplazado hacia lingual (−Z) el reborde a la altura `y`: más arriba y con más pérdida, más. */
export function desplazamientoLingual(y: number, reborde: number): number {
  return acotar(reborde) * DESPLAZAMIENTO_LINGUAL * Math.pow(alturaRelativa(y, reborde), 1.5);
}

/**
 * Semiancho (sin el desplazamiento lingual) de la tabla `lado` a la altura `y` con una pérdida `reborde`:
 * el perfil del cuerpo intacto por encima de `Y_MAS_ANCHO` se comprime hasta la cresta actual, se estrecha
 * (más la tabla vestibular) y la cresta se redondea con un radio que crece hasta el filo. Con `reborde` = 0
 * coincide con `semianchoCuerpo` de la escena `hueso_alveolar`.
 */
export function semianchoReborde(y: number, lado: Lado, reborde: number): number {
  const r = acotar(reborde);
  const yC = yCresta(r);
  const yy = Math.min(yC, Math.max(Y_BASE, y));
  let w: number;
  if (yy <= Y_MAS_ANCHO) {
    w = semianchoBase(yy);
  } else {
    const u = (yy - Y_MAS_ANCHO) / (yC - Y_MAS_ANCHO);
    const yEquivalente = Y_MAS_ANCHO + u * (Y_CRESTA - Y_MAS_ANCHO);
    w =
      semianchoBase(yEquivalente) *
      (1 - r * ESTRECHAMIENTO[lado] * Math.pow(u, EXPONENTE_ESTRECHAMIENTO));
  }
  const rho = radioCresta(r);
  const dy = yy - (yC - rho);
  if (dy > 0) w = w - rho + Math.sqrt(Math.max(0, rho * rho - dy * dy));
  return Math.max(SEMIANCHO_MINIMO, w);
}

/** Altura de la cara interna de la cortical en la cresta (techo del hueso trabecular). */
export function yCrestaInterior(reborde: number): number {
  return yCresta(reborde) - GROSOR_CRESTA;
}

/** Semiancho interior (cara interna de la tabla `lado`) a la altura `y` con una pérdida `reborde`. */
export function semianchoInteriorReborde(y: number, lado: Lado, reborde: number): number {
  if (y < Y_MAS_ANCHO) return semianchoInterior(y, lado);
  return Math.max(SEMIANCHO_MINIMO, semianchoReborde(y, lado, reborde) - GROSOR_CORTICAL[lado]);
}

/** Z de la superficie de la tabla `lado` a la altura `y` (con el desplazamiento lingual). */
export function zSuperficie(y: number, lado: Lado, reborde: number): number {
  return signoDeLado(lado) * semianchoReborde(y, lado, reborde) - desplazamientoLingual(y, reborde);
}

/**
 * Contorno exterior del cuerpo con una pérdida `reborde`: lado vestibular de la cresta a la base y lingual de la
 * base a la cresta. Topología fija (`2 * (pasos + 1)` puntos), apto para morfar.
 */
export function contornoExterior(reborde: number, pasos = PASOS_CONTORNO): Punto2[] {
  const alturas = alturasMuestreadas(Y_BASE, yCresta(reborde), pasos);
  const puntos: Punto2[] = [];
  for (let i = alturas.length - 1; i >= 0; i--) {
    const y = alturas[i]!;
    puntos.push([zSuperficie(y, 'vestibular', reborde), y]);
  }
  for (const y of alturas) puntos.push([zSuperficie(y, 'lingual', reborde), y]);
  return puntos;
}

/** Contorno interior (cara interna de la cortical): el hueso trabecular. Misma topología que el exterior. */
export function contornoInterior(reborde: number, pasos = PASOS_CONTORNO): Punto2[] {
  const alturas = alturasMuestreadas(Y_FONDO_INTERIOR, yCrestaInterior(reborde), pasos);
  const puntos: Punto2[] = [];
  for (let i = alturas.length - 1; i >= 0; i--) {
    const y = alturas[i]!;
    puntos.push([
      semianchoInteriorReborde(y, 'vestibular', reborde) - desplazamientoLingual(y, reborde),
      y,
    ]);
  }
  for (const y of alturas) {
    puntos.push([
      -semianchoInteriorReborde(y, 'lingual', reborde) - desplazamientoLingual(y, reborde),
      y,
    ]);
  }
  return puntos;
}

/** ¿El punto (z, y) queda dentro del hueso trabecular actual, con un margen? Sin polígonos: es analítico. */
export function dentroDelTrabecular(z: number, y: number, reborde: number, margen = 0.1): boolean {
  if (y > yCrestaInterior(reborde) - margen || y < Y_FONDO_INTERIOR + margen) return false;
  const zz = z + desplazamientoLingual(y, reborde);
  const lado: Lado = zz >= 0 ? 'vestibular' : 'lingual';
  return Math.abs(zz) < semianchoInteriorReborde(y, lado, reborde) - margen;
}

/** Centro del abanico con que se triangula la cara de la médula: dentro del interior en toda pérdida. */
export const CENTRO_MEDULA: Punto2 = [0, -1.25];

/* -------------------------------------------------------------------------------------------
 * Encía
 * ----------------------------------------------------------------------------------------- */

/** Z del punto medio de la cresta actual (hacia él cierra la encía). */
export function zCentroCresta(reborde: number): number {
  const yC = yCresta(reborde);
  return (zSuperficie(yC, 'vestibular', reborde) + zSuperficie(yC, 'lingual', reborde)) / 2;
}

/** Z del borde libre de la encía del lado `lado` sobre la cresta: junto al cuello del diente o cerrada. */
export function bordeEncia(lado: Lado, cierre: number, reborde: number): number {
  const signo = signoDeLado(lado);
  const abierto = Z_ALVEOLO + signo * (SEMIANCHO_RAIZ + 0.015);
  const cerrado = zCentroCresta(reborde) + signo * ENCIA.solape;
  return mezclar(abierto, cerrado, acotar(cierre));
}

export interface CarrilesEncia {
  /** Carril pegado al hueso. */
  interior: Punto2[];
  /** Carril libre (superficie de la encía), `ENCIA.grosor` más afuera. */
  exterior: Punto2[];
}

/**
 * Carriles de la encía de un lado: bajan por la cara del cuerpo desde `ENCIA.caida` bajo la cresta, doblan la
 * esquina y siguen sobre la cresta hasta su borde libre. `PUNTOS_ENCIA` puntos cada uno, siempre.
 */
export function carrilesEncia(lado: Lado, cierre: number, reborde: number): CarrilesEncia {
  const signo = signoDeLado(lado);
  const yC = yCresta(reborde);
  const g = ENCIA.grosor;
  const interior: Punto2[] = [];
  const exterior: Punto2[] = [];
  const alturas = alturasMuestreadas(yC - ENCIA.caida, yC, PASOS_ENCIA.lado);
  for (const y of alturas) {
    const z = zSuperficie(y, lado, reborde);
    interior.push([z, y]);
    exterior.push([z + signo * g, y]);
  }
  const zEsquina = zSuperficie(yC, lado, reborde);
  interior.push([zEsquina, yC]);
  exterior.push([zEsquina + signo * g * Math.SQRT1_2, yC + g * Math.SQRT1_2]);
  const zBorde = bordeEncia(lado, cierre, reborde);
  for (let i = 0; i <= PASOS_ENCIA.techo; i++) {
    const z = mezclar(zEsquina, zBorde, i / PASOS_ENCIA.techo);
    interior.push([z, yC]);
    exterior.push([z, yC + g]);
  }
  return { interior, exterior };
}

/* -------------------------------------------------------------------------------------------
 * Relleno del alvéolo
 * ----------------------------------------------------------------------------------------- */

/** Fondo de la cavidad del alvéolo (el ápice más el espacio del ligamento). */
export const Y_FONDO_CAVIDAD = Y_APICE - GROSOR_LIGAMENTO;

/** Semiancho de la cavidad (raíz más ligamento) a la altura `y`; redondeado bajo el ápice. */
export function semianchoCavidad(y: number): number {
  if (y >= Y_APICE) return semianchoRaiz(y) + GROSOR_LIGAMENTO;
  const d = Y_APICE - y;
  return Math.sqrt(Math.max(0, GROSOR_LIGAMENTO * GROSOR_LIGAMENTO - d * d));
}

/**
 * Polígono de la cavidad entre dos alturas, con el ancho multiplicado por `factor`: lado vestibular de arriba
 * abajo y lingual de abajo arriba. Topología fija (`2 * (pasos + 1)` puntos); si `yTecho` ≤ `yFondo` es
 * degenerado (área cero) y quien lo dibuja lo oculta.
 */
export function poligonoCavidad(
  yFondo: number,
  yTecho: number,
  factor: number,
  pasos = PASOS_RELLENO,
): Punto2[] {
  const techo = Math.max(yFondo, yTecho);
  const alturas = alturasMuestreadas(yFondo, techo, pasos);
  const puntos: Punto2[] = [];
  for (let i = alturas.length - 1; i >= 0; i--) {
    const y = alturas[i]!;
    puntos.push([Z_ALVEOLO + semianchoCavidad(y) * factor, y]);
  }
  for (const y of alturas) puntos.push([Z_ALVEOLO - semianchoCavidad(y) * factor, y]);
  return puntos;
}

/** Techo del alvéolo: la cresta original o, si el reborde ya bajó, la cresta actual. */
export function techoAlveolo(reborde: number): number {
  return Math.min(Y_CRESTA, yCresta(reborde));
}

/**
 * Polígono de un tejido que rellena el alvéolo: `nivel` (0 a 1) es cuánto ha subido desde el fondo y `encogido`
 * (0 a 1) cuánto lo ha sustituido el tejido siguiente desde las paredes y el fondo.
 */
export function poligonoRelleno(encogido: number, nivel: number, techo: number): Punto2[] {
  const e = acotar(encogido);
  const yFondo = Y_FONDO_CAVIDAD + e * (techo - Y_FONDO_CAVIDAD);
  const yTecho = yFondo + acotar(nivel) * (techo - yFondo);
  return poligonoCavidad(yFondo, yTecho, 1 - e);
}

/** Tapa cortical sobre el alvéolo cicatrizado: una banda del ancho del alvéolo bajo el techo. */
export function poligonoTapa(k: number, techo: number): Punto2[] {
  return poligonoCavidad(techo - acotar(k) * GROSOR_CRESTA, techo, 1);
}

/** Puntos de sangrado sobre las paredes del alvéolo vacío. */
export function puntosSangrado(): Punto2[] {
  const puntos: Punto2[] = [];
  [1.6, 1.15, 0.7, 0.25].forEach((y, i) => {
    const signo = i % 2 === 0 ? 1 : -1;
    puntos.push([Z_ALVEOLO + signo * (semianchoRaiz(y) + GROSOR_LIGAMENTO * 0.4), y]);
    puntos.push([Z_ALVEOLO - signo * (semianchoRaiz(y - 0.2) + GROSOR_LIGAMENTO * 0.4), y - 0.2]);
  });
  return puntos;
}

/** Vasos del tejido de granulación: dentro de la cavidad, hacia las paredes y en el fondo. */
export function puntosVasos(): Punto2[] {
  const puntos: Punto2[] = [];
  for (const y of [1.65, 1.25, 0.85, 0.45]) {
    puntos.push([Z_ALVEOLO + semianchoRaiz(y) * 0.55, y]);
    puntos.push([Z_ALVEOLO - semianchoRaiz(y) * 0.55, y - 0.18]);
  }
  puntos.push([Z_ALVEOLO, Y_APICE + 0.28]);
  return puntos;
}

/* -------------------------------------------------------------------------------------------
 * Trabéculas, osteoclastos y foramen
 * ----------------------------------------------------------------------------------------- */

export interface TrabeculaAlveolo {
  /** Centro en el plano de corte y profundidad (x, negativa: dentro del hueco de la médula). */
  z: number;
  y: number;
  x: number;
  /** Ángulo en el plano ZY (0 = a lo largo de +Z, PI/2 = vertical). */
  angulo: number;
  largo: number;
  /** Dentro del alvéolo original (lámina, ligamento y raíz): aparece cuando el alvéolo cicatriza. */
  enAlveolo: boolean;
}

/**
 * `N_TRABECULAS_ALVEOLO` barras dentro del interior del cuerpo intacto y fuera del conducto, en abanico desde el
 * alvéolo hacia las tablas. Las que caen en el alvéolo original se marcan para aparecer al madurar. Deterministas.
 */
export function trabeculasReborde(semilla = 4141): TrabeculaAlveolo[] {
  const azar = generadorDeterminista(semilla);
  const region = contornoInterior(0);
  const alveolo = siluetaRaiz(DESPLAZAMIENTO_LAMINA);
  const resultado: TrabeculaAlveolo[] = [];
  let intentos = 0;
  while (resultado.length < N_TRABECULAS_ALVEOLO && intentos < N_TRABECULAS_ALVEOLO * 80) {
    intentos++;
    const z = -SEMIANCHO_MAXIMO + 2 * SEMIANCHO_MAXIMO * azar();
    const y = Y_FONDO_INTERIOR + (yCrestaInterior(0) - Y_FONDO_INTERIOR) * azar();
    if (!dentroDelTrabecular(z, y, 0, 0.08)) continue;
    if (!dentroDePoligono([z, y], region)) continue;
    if (Math.hypot(z - CONDUCTO.z, y - CONDUCTO.y) < CONDUCTO.radio + 0.12) continue;
    const radial = Math.atan2(y - 0.6, z - Z_ALVEOLO);
    const vertical = y < Y_APICE ? 0.5 : 0;
    const angulo = radial * (1 - vertical) + (Math.PI / 2) * vertical + (azar() - 0.5) * 0.9;
    resultado.push({
      z,
      y,
      x: -0.03 - (PROFUNDIDAD_TRABECULAR - 0.06) * azar(),
      angulo,
      largo: 0.3 + azar() * 0.34,
      enAlveolo: dentroDePoligono([z, y], alveolo),
    });
  }
  return resultado;
}

export interface Punto3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Osteoclastos sobre la superficie del reborde mientras se reabsorbe: cerca de la cresta, repartidos a lo largo
 * de la mitad del segmento que se dibuja (`largo`, de x = 0 a −largo) y más por vestibular (dos de cada tres).
 * Siguen a la superficie según la pérdida.
 */
export function osteoclastosReborde(reborde: number, largo: number): Punto3[] {
  const yC = yCresta(reborde);
  const puntos: Punto3[] = [];
  for (let j = 0; j < N_OSTEOCLASTOS_REBORDE; j++) {
    const lado: Lado = j % 3 === 2 ? 'lingual' : 'vestibular';
    const y = yC - 0.08 - 0.14 * (j % 4);
    const z = zSuperficie(y, lado, reborde) + signoDeLado(lado) * 0.04;
    const x = -0.3 - ((largo - 0.6) * (j + 0.5)) / N_OSTEOCLASTOS_REBORDE;
    puntos.push({ x, y, z });
  }
  return puntos;
}

/** Posición del foramen mentoniano sobre la cara vestibular (sigue a la superficie según la pérdida). */
export function posicionForamen(reborde: number): Punto3 {
  return {
    x: FORAMEN.x,
    y: FORAMEN.y,
    z: zSuperficie(FORAMEN.y, 'vestibular', reborde) + 0.006,
  };
}

/** Caja envolvente de un polígono. */
export function cajaDe(poligono: readonly Punto2[]): {
  zMin: number;
  zMax: number;
  yMin: number;
  yMax: number;
} {
  let zMin = Infinity;
  let zMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const [z, y] of poligono) {
    zMin = Math.min(zMin, z);
    zMax = Math.max(zMax, z);
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  }
  return { zMin, zMax, yMin, yMax };
}
