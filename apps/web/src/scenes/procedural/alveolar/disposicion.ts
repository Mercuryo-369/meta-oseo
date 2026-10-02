/**
 * Disposición de la escena del hueso alveolar: los PERFILES en 2D de la sección vestibulolingual (contorno del
 * cuerpo, región trabecular, raíz, corona, pulpa) y las piezas repetidas (trabéculas, perforaciones de la
 * lámina cribiforme, fibras del ligamento). Lógica PURA: solo números, deterministas (misma semilla, misma
 * disposición), sin three ni Vue, para poder probarla y para que el dibujo no cambie entre cargas.
 * `geometria.ts` convierte estos polígonos en formas de three.
 *
 * Convención: cada punto es `[z, y]` en el plano de corte (x = 0). +Z es vestibular (hacia la mejilla), −Z
 * lingual; +Y hacia la cresta alveolar. El polígono del cuerpo se recorre en sentido antihorario visto desde +X.
 */
import { generadorDeterminista } from '../interpolacion';
import {
  ALTO_CORONA,
  CONDUCTO,
  GROSOR_CORTICAL,
  GROSOR_LAMINA,
  GROSOR_LIGAMENTO,
  N_TRABECULAS,
  PROFUNDIDAD_TRABECULAR,
  RADIO_CORONA,
  SEMIANCHO_CRESTA,
  SEMIANCHO_MAXIMO,
  SEMIANCHO_RAIZ,
  Y_APICE,
  Y_BASE,
  Y_CRESTA,
  Y_MAS_ANCHO,
  Z_ALVEOLO,
} from './estado';

export type Punto2 = readonly [z: number, y: number];
export type Lado = 'vestibular' | 'lingual';

/** +1 hacia vestibular (+Z), −1 hacia lingual (−Z). */
export function signoDeLado(lado: Lado): 1 | -1 {
  return lado === 'vestibular' ? 1 : -1;
}

/** Radio con que se redondean las esquinas de la cresta alveolar. */
const RADIO_ESQUINA_CRESTA = 0.16;
/** Hueco mínimo entre la cortical y la lámina para que haya hueso trabecular entre ambas. */
const HUECO_MINIMO_TRABECULAR = 0.09;
/** Altura del fondo interior del cuerpo (cara interna de la cortical basal). */
export const Y_FONDO_INTERIOR = Y_BASE + GROSOR_CORTICAL.base;

/* -------------------------------------------------------------------------------------------
 * Contorno del cuerpo mandibular
 * ----------------------------------------------------------------------------------------- */

/**
 * Semiancho del cuerpo a la altura `y`: se estrecha hacia la cresta (apófisis alveolar) y se redondea por la
 * base (una elipse por debajo de `Y_MAS_ANCHO`). Las esquinas de la cresta van redondeadas.
 */
export function semianchoCuerpo(y: number): number {
  const yy = Math.min(Y_CRESTA, Math.max(Y_BASE, y));
  let w: number;
  if (yy >= Y_MAS_ANCHO) {
    const k = (Y_CRESTA - yy) / (Y_CRESTA - Y_MAS_ANCHO);
    w = SEMIANCHO_CRESTA + (SEMIANCHO_MAXIMO - SEMIANCHO_CRESTA) * Math.pow(k, 0.8);
  } else {
    const k = (yy - Y_MAS_ANCHO) / (Y_BASE - Y_MAS_ANCHO);
    w = SEMIANCHO_MAXIMO * Math.sqrt(Math.max(0, 1 - k * k));
  }
  const dy = yy - (Y_CRESTA - RADIO_ESQUINA_CRESTA);
  if (dy > 0) {
    w = w - RADIO_ESQUINA_CRESTA + Math.sqrt(Math.max(0, RADIO_ESQUINA_CRESTA ** 2 - dy * dy));
  }
  return w;
}

/**
 * Semiancho interior (cara interna de la cortical) del lado dado: el contorno menos el grosor de esa tabla;
 * por debajo de `Y_MAS_ANCHO`, una elipse interior que termina en `Y_FONDO_INTERIOR`.
 */
export function semianchoInterior(y: number, lado: Lado): number {
  const grosor = GROSOR_CORTICAL[lado];
  if (y >= Y_MAS_ANCHO) return Math.max(0, semianchoCuerpo(y) - grosor);
  const k = (y - Y_MAS_ANCHO) / (Y_FONDO_INTERIOR - Y_MAS_ANCHO);
  return (SEMIANCHO_MAXIMO - grosor) * Math.sqrt(Math.max(0, 1 - k * k));
}

/** Contorno exterior del cuerpo (polígono cerrado, antihorario visto desde +X). */
export function perfilCuerpo(pasos = 64): Punto2[] {
  const puntos: Punto2[] = [];
  // Lado vestibular de arriba abajo, luego el lingual de abajo arriba. Más muestras cerca de la base y de la
  // cresta, donde el contorno se curva.
  const alturas = alturasMuestreadas(Y_BASE, Y_CRESTA, pasos);
  for (let i = alturas.length - 1; i >= 0; i--) {
    puntos.push([semianchoCuerpo(alturas[i]!), alturas[i]!]);
  }
  for (const y of alturas) puntos.push([-semianchoCuerpo(y), y]);
  return sinRepetidos(puntos);
}

/** Alturas entre `desde` y `hasta` con paso más fino en los extremos (coseno). */
function alturasMuestreadas(desde: number, hasta: number, pasos: number): number[] {
  const lista: number[] = [];
  for (let i = 0; i <= pasos; i++) {
    const k = (1 - Math.cos((Math.PI * i) / pasos)) / 2;
    lista.push(desde + (hasta - desde) * k);
  }
  return lista;
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

/* -------------------------------------------------------------------------------------------
 * Raíz, corona y pulpa
 * ----------------------------------------------------------------------------------------- */

/** Semiancho de la raíz a la altura `y` (0 en el ápice, `SEMIANCHO_RAIZ` en la cresta). */
export function semianchoRaiz(y: number): number {
  const k = (Math.min(Y_CRESTA, y) - Y_APICE) / (Y_CRESTA - Y_APICE);
  return k <= 0 ? 0 : SEMIANCHO_RAIZ * Math.pow(k, 0.65);
}

/**
 * Silueta ABIERTA de la raíz ensanchada `desplazamiento` unidades hacia fuera (0 = la raíz; el grosor del
 * ligamento = borde exterior del ligamento; ligamento + lámina = borde exterior del hueso alveolar propio).
 * Empieza en la cresta del lado vestibular, baja, rodea el ápice y termina en la cresta del lado lingual.
 */
export function siluetaRaizAbierta(desplazamiento = 0, pasos = 40): Punto2[] {
  const puntos: Punto2[] = [];
  const alturas = alturasMuestreadas(Y_APICE, Y_CRESTA, pasos);
  for (let i = alturas.length - 1; i >= 0; i--) {
    const y = alturas[i]!;
    puntos.push([Z_ALVEOLO + semianchoRaiz(y) + desplazamiento, y]);
  }
  if (desplazamiento > 0) {
    for (let i = 1; i < 12; i++) {
      const a = (-Math.PI * i) / 12;
      puntos.push([
        Z_ALVEOLO + desplazamiento * Math.cos(a),
        Y_APICE + desplazamiento * Math.sin(a),
      ]);
    }
  }
  for (const y of alturas) puntos.push([Z_ALVEOLO - semianchoRaiz(y) - desplazamiento, y]);
  return sinRepetidos(puntos);
}

/** Silueta cerrada (por la cresta) de la raíz ensanchada `desplazamiento` unidades. */
export function siluetaRaiz(desplazamiento = 0, pasos = 40): Punto2[] {
  return siluetaRaizAbierta(desplazamiento, pasos);
}

/**
 * Banda alrededor de la raíz entre dos ensanchamientos (`interior` < `exterior`), como un solo polígono en U:
 * el borde exterior de la cresta vestibular a la lingual y el interior de vuelta. Sin agujeros, porque ambos
 * bordes llegan a la cresta y un agujero que toca el contorno no se triangula bien.
 */
export function bandaAlrededorDeRaiz(interior: number, exterior: number): Punto2[] {
  const fuera = siluetaRaizAbierta(exterior);
  const dentro = siluetaRaizAbierta(interior).reverse();
  return sinRepetidos([...fuera, ...dentro]);
}

/**
 * Perfil de la corona para un torno (`LatheGeometry`): `[radio, y]` desde el cuello, en la cresta, hasta la
 * cúspide. Premolar esquemático: un bulbo con una cúspide redondeada.
 */
export function perfilCorona(): readonly (readonly [radio: number, y: number])[] {
  const y0 = Y_CRESTA - 0.04;
  const h = ALTO_CORONA;
  return [
    [SEMIANCHO_RAIZ - 0.02, y0],
    [SEMIANCHO_RAIZ, y0 + 0.08],
    [RADIO_CORONA, y0 + h * 0.34],
    [RADIO_CORONA * 0.97, y0 + h * 0.6],
    [RADIO_CORONA * 0.78, y0 + h * 0.8],
    [RADIO_CORONA * 0.48, y0 + h * 0.93],
    [RADIO_CORONA * 0.18, y0 + h * 0.99],
    [0, y0 + h],
  ];
}

/** Silueta de la corona en el plano de corte (el perfil del torno y su reflejo). */
export function siluetaCorona(): Punto2[] {
  const perfil = perfilCorona();
  const puntos: Punto2[] = [];
  for (const [r, y] of perfil) puntos.push([Z_ALVEOLO + r, y]);
  for (let i = perfil.length - 2; i >= 0; i--)
    puntos.push([Z_ALVEOLO - perfil[i]![0], perfil[i]![1]]);
  return sinRepetidos(puntos);
}

/** Silueta de la pulpa: conducto radicular estrecho y cámara pulpar en la corona. */
export function siluetaPulpa(): Punto2[] {
  const derecha: Punto2[] = [];
  const alturas = alturasMuestreadas(Y_APICE + 0.3, Y_CRESTA, 16);
  for (const y of alturas) derecha.push([Z_ALVEOLO + 0.3 * semianchoRaiz(y), y]);
  derecha.push([Z_ALVEOLO + 0.16, Y_CRESTA + 0.2], [Z_ALVEOLO + 0.09, Y_CRESTA + 0.42]);
  const puntos: Punto2[] = [[Z_ALVEOLO, Y_APICE + 0.22], ...derecha, [Z_ALVEOLO, Y_CRESTA + 0.47]];
  for (let i = derecha.length - 1; i >= 0; i--) {
    const [z, y] = derecha[i]!;
    puntos.push([2 * Z_ALVEOLO - z, y]);
  }
  return sinRepetidos(puntos);
}

/* -------------------------------------------------------------------------------------------
 * Región del hueso trabecular
 * ----------------------------------------------------------------------------------------- */

/** Borde exterior del hueso alveolar propio (la lámina) medido desde el eje de la raíz. */
export const DESPLAZAMIENTO_LAMINA = GROSOR_LIGAMENTO + GROSOR_LAMINA;

/**
 * Altura a la que empieza el hueso trabecular de un lado: bajando desde la cresta, el primer punto donde entre
 * la cara interna de la tabla y el borde exterior de la lámina hay sitio. Por encima, la tabla y la lámina
 * están fundidas en la cresta (por eso la tabla vestibular, más fina, se funde durante más trecho).
 */
export function alturaInicioTrabecular(lado: Lado): number {
  for (let y = Y_CRESTA - GROSOR_CORTICAL.cresta; y > Y_APICE; y -= 0.01) {
    const interior = semianchoInterior(y, lado);
    const lamina = signoDeLado(lado) * Z_ALVEOLO + semianchoRaiz(y) + DESPLAZAMIENTO_LAMINA;
    if (interior - lamina >= HUECO_MINIMO_TRABECULAR) return Math.round(y * 100) / 100;
  }
  return Y_APICE;
}

/**
 * Región del hueso trabecular: una herradura entre la cara interna de las tablas y el borde exterior del hueso
 * alveolar propio, cerrada por debajo del ápice por la cortical basal. Polígono cerrado sin agujeros (el conducto
 * se resta aparte).
 */
export function regionTrabecular(pasos = 48): Punto2[] {
  const topeV = alturaInicioTrabecular('vestibular');
  const topeL = alturaInicioTrabecular('lingual');
  const puntos: Punto2[] = [];
  // Cara interna vestibular, de arriba abajo.
  for (const y of alturasMuestreadas(Y_FONDO_INTERIOR, topeV, pasos).reverse()) {
    puntos.push([semianchoInterior(y, 'vestibular'), y]);
  }
  // Cara interna lingual, de abajo arriba.
  for (const y of alturasMuestreadas(Y_FONDO_INTERIOR, topeL, pasos)) {
    puntos.push([-semianchoInterior(y, 'lingual'), y]);
  }
  // Borde exterior de la lámina, del tope lingual al tope vestibular pasando por el ápice.
  const lamina = siluetaRaiz(DESPLAZAMIENTO_LAMINA, 40);
  // `siluetaRaiz` empieza en la cresta vestibular, baja, rodea el ápice y sube por el lingual: se recorre al
  // revés (lingual de arriba abajo, ápice, vestibular de abajo arriba) quedándose con lo que está bajo los topes.
  for (let i = lamina.length - 1; i >= 0; i--) {
    const [z, y] = lamina[i]!;
    const lado: Lado = z >= Z_ALVEOLO ? 'vestibular' : 'lingual';
    const tope = lado === 'vestibular' ? topeV : topeL;
    if (y <= tope) puntos.push([z, y]);
  }
  return sinRepetidos(puntos);
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

/* -------------------------------------------------------------------------------------------
 * Trabéculas
 * ----------------------------------------------------------------------------------------- */

export interface TrabeculaAlveolar {
  /** Centro en el plano de corte y profundidad (x, negativa: dentro del hueco). */
  z: number;
  y: number;
  x: number;
  /** Ángulo en el plano ZY (0 = a lo largo de +Z, PI/2 = vertical). */
  angulo: number;
  largo: number;
}

/**
 * `N_TRABECULAS` barras dentro de la región trabecular y fuera del conducto mandibular, orientadas en abanico
 * desde el alvéolo hacia las tablas (las trabéculas siguen las líneas de carga del diente) con algo de azar.
 * Deterministas.
 */
export function trabeculasAlveolares(semilla = 707): TrabeculaAlveolar[] {
  const azar = generadorDeterminista(semilla);
  const region = regionTrabecular();
  const caja = cajaDe(region);
  const resultado: TrabeculaAlveolar[] = [];
  let intentos = 0;
  while (resultado.length < N_TRABECULAS && intentos < N_TRABECULAS * 60) {
    intentos++;
    const z = caja.zMin + (caja.zMax - caja.zMin) * azar();
    const y = caja.yMin + (caja.yMax - caja.yMin) * azar();
    if (!dentroDePoligono([z, y], region)) continue;
    if (Math.hypot(z - CONDUCTO.z, y - CONDUCTO.y) < CONDUCTO.radio + 0.12) continue;
    // Abanico desde el tercio medio de la raíz; por debajo del ápice, más vertical.
    const radial = Math.atan2(y - 0.6, z - Z_ALVEOLO);
    const vertical = y < Y_APICE ? 0.5 : 0;
    const angulo = radial * (1 - vertical) + (Math.PI / 2) * vertical + (azar() - 0.5) * 0.9;
    resultado.push({
      z,
      y,
      x: -0.03 - (PROFUNDIDAD_TRABECULAR - 0.06) * azar(),
      angulo,
      largo: 0.3 + azar() * 0.34,
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Perforaciones de la lámina cribiforme y fibras del ligamento
 * ----------------------------------------------------------------------------------------- */

/** Centros de las perforaciones, sobre la línea media de la lámina, a ambos lados y en el ápice. */
export function perforacionesLamina(): Punto2[] {
  const medio = GROSOR_LIGAMENTO + GROSOR_LAMINA / 2;
  const puntos: Punto2[] = [];
  for (const lado of ['vestibular', 'lingual'] as const) {
    const signo = signoDeLado(lado);
    for (let y = Y_CRESTA - 0.32; y > Y_APICE + 0.12; y -= 0.31) {
      const yy = y + (lado === 'lingual' ? 0.15 : 0);
      if (yy > Y_CRESTA - 0.2) continue;
      puntos.push([Z_ALVEOLO + signo * (semianchoRaiz(yy) + medio), yy]);
    }
  }
  for (const a of [-Math.PI / 3, (-2 * Math.PI) / 3]) {
    puntos.push([Z_ALVEOLO + medio * Math.cos(a), Y_APICE + medio * Math.sin(a)]);
  }
  return puntos;
}

/**
 * Fibras del ligamento periodontal: segmentos oblicuos que van del hueso alveolar propio (más arriba) al
 * cemento de la raíz (más abajo), como las fibras oblicuas reales; en el ápice, radiales.
 */
export function fibrasLigamento(): (readonly [Punto2, Punto2])[] {
  const fibras: (readonly [Punto2, Punto2])[] = [];
  const caida = 0.08;
  for (const lado of ['vestibular', 'lingual'] as const) {
    const signo = signoDeLado(lado);
    for (let y = Y_CRESTA - 0.1; y - caida > Y_APICE + 0.1; y -= 0.11) {
      const hueso: Punto2 = [Z_ALVEOLO + signo * (semianchoRaiz(y) + GROSOR_LIGAMENTO), y];
      const raiz: Punto2 = [Z_ALVEOLO + signo * semianchoRaiz(y - caida), y - caida];
      fibras.push([hueso, raiz]);
    }
  }
  for (let i = 1; i < 6; i++) {
    const a = (-Math.PI * i) / 6;
    fibras.push([
      [Z_ALVEOLO + GROSOR_LIGAMENTO * Math.cos(a), Y_APICE + GROSOR_LIGAMENTO * Math.sin(a)],
      [Z_ALVEOLO + 0.01 * Math.cos(a), Y_APICE + 0.01 * Math.sin(a)],
    ]);
  }
  return fibras;
}
