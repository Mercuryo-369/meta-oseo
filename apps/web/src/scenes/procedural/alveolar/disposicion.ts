/**
 * Disposición de la escena del hueso alveolar: los PERFILES en 2D de la sección vestibulolingual (contorno del
 * cuerpo, región trabecular, raíz, corona, dentina, cemento, pulpa), los meridianos de la corona en 3D y las
 * piezas repetidas (trabéculas, perforaciones de la lámina cribiforme, fibras del ligamento). Lógica PURA: solo
 * números, deterministas (misma semilla, misma disposición), sin three ni Vue, para poder probarla y para que el
 * dibujo no cambie entre cargas. `geometria.ts` convierte estos polígonos en formas de three.
 *
 * Convención: cada punto es `[z, y]` en el plano de corte (x = 0). +Z es vestibular (hacia la mejilla), −Z
 * lingual; +Y hacia la cresta alveolar. El polígono del cuerpo se recorre en sentido antihorario visto desde +X.
 */
import { acotar, generadorDeterminista } from '../interpolacion';
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

/** Semiancho de la raíz a la altura `y` (0 en el ápice, `SEMIANCHO_RAIZ` en la cresta y de ahí al cuello). */
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

/* -------------------------------------------------------------------------------------------
 * Corona del premolar: esmalte y dentina (realismo, 2026-10-14)
 * ----------------------------------------------------------------------------------------- */

/** Punto de un perfil de la corona: radio desde el eje del diente y altura. */
type PuntoPerfil = readonly [radio: number, y: number];

/**
 * Distancia de la cresta alveolar al límite amelocementario (revisión de diseño, 2026-10-17, fidelidad-02): en un
 * periodonto sano la cresta queda 1,5 a 2 mm por debajo del cuello del diente, el espacio de la inserción
 * supracrestal (epitelio de unión e inserción conectiva). Con la escala de la corona (1 unidad ≈ 7,8 mm), 0,2
 * unidades son unos 1,6 mm. La misma distancia en las tres escenas dentales.
 */
export const CRESTA_A_CUELLO = 0.2;

/**
 * Altura del cuello del diente (límite amelocementario): donde acaba el esmalte y empieza el cemento. Por encima de
 * la cresta: entre ambos queda una franja de raíz cubierta de cemento (en la boca la cubre la encía). Antes estaba
 * 0,04 unidades por DEBAJO de la cresta y el hueso tocaba el esmalte.
 */
export const Y_CUELLO = Y_CRESTA + CRESTA_A_CUELLO;

/** Puntos que se intercalan en cada tramo entre dos puntos de control de un perfil (curva suave). */
const PUNTOS_POR_TRAMO = 2;

/*
 * La corona es la de un primer premolar inferior. En el corte vestibulolingual la corona se inclina hacia
 * lingual, así que la cúspide vestibular, alta, cae sobre el eje de la raíz; la lingual es baja (unos dos tercios
 * de la altura) y entre ambas corre el surco central, de mesial a distal. El contorno vestibular es más
 * prominente en el tercio cervical y el lingual en el medio.
 *
 * Se construye por meridianos (`meridianoCorona`), del cuello al eje: primero la CARA del diente (la mezcla,
 * según el ángulo, de una plantilla vestibular y otra lingual) hasta el borde de la superficie oclusal, y después
 * la SUPERFICIE OCLUSAL, que es un relieve: el perfil del corte (`PERFIL_OCLUSAL`) prolongado de mesial a distal,
 * que sube hacia los rebordes marginales. Así la cúspide vestibular tiene sus aristas mesial y distal, el surco es
 * recto y queda cerrado por los rebordes, y el borde de la corona en el plano de corte es, por construcción, la
 * silueta del corte. Todas las medidas, en fracciones: radio / RADIO_CORONA y altura sobre el cuello /
 * ALTO_CORONA.
 */

/**
 * Plantillas de la cara de la corona, del cuello al borde de la superficie oclusal: en vestibular, la vertiente
 * de la cúspide vestibular; en lingual, la punta de la cúspide lingual. El primer punto (el cuello) se sustituye
 * por el ancho exacto de la raíz a esa altura. Mismo número de puntos: se mezclan según el ángulo.
 */
const CONTROL_CARA: Readonly<Record<Lado, readonly PuntoPerfil[]>> = {
  vestibular: [
    [0, 0],
    [0.906, 0.09],
    [0.979, 0.19],
    [1, 0.29],
    [0.983, 0.41],
    [0.9375, 0.54],
    [0.854, 0.66],
    [0.729, 0.77],
    [0.542, 0.88],
  ],
  lingual: [
    [0, 0],
    [0.885, 0.12],
    [0.958, 0.26],
    [1, 0.4],
    [0.979, 0.51],
    [0.93, 0.58],
    [0.85, 0.64],
    [0.74, 0.68],
    [0.625, 0.695],
  ],
};

/**
 * Perfil de la superficie oclusal en el corte: `[posición vestibulolingual / RADIO_CORONA (+ vestibular),
 * altura]`, de la punta de la cúspide lingual al borde vestibular, pasando por el surco central y por la punta de
 * la cúspide vestibular, sobre el eje.
 */
const PERFIL_OCLUSAL: readonly PuntoPerfil[] = [
  [-0.625, 0.695],
  [-0.4375, 0.625],
  [-0.208, 0.76],
  [0, 1],
  [0.292, 0.965],
  [0.542, 0.88],
];

/** Altura de los rebordes marginales (mesial y distal), que cierran el surco y reciben las aristas de las cúspides. */
const ALTURA_REBORDES = 0.78;

/** Pasos de la superficie oclusal en cada meridiano, del borde al eje. */
const PASOS_OCLUSAL = 8;

/**
 * La dentina de la corona, bajo el esmalte: el esmalte es nulo en el cuello y más grueso en las cúspides; la
 * dentina hace un cuerno bajo cada cúspide.
 */
const CONTROL_DENTINA: Readonly<Record<Lado, readonly PuntoPerfil[]>> = {
  vestibular: [
    [0, 0],
    [0.833, 0.09],
    [0.823, 0.19],
    [0.802, 0.29],
    [0.771, 0.41],
    [0.719, 0.53],
    [0.635, 0.63],
    [0.521, 0.71],
    [0.375, 0.78],
    [0.1875, 0.82],
    [0, 0.84],
  ],
  lingual: [
    [0, 0],
    [0.833, 0.12],
    [0.823, 0.24],
    [0.802, 0.37],
    [0.771, 0.47],
    [0.71, 0.53],
    [0.63, 0.57],
    [0.54, 0.585],
    [0.42, 0.55],
    [0.2, 0.64],
    [0, 0.84],
  ],
};

/**
 * Curva de Catmull-Rom uniforme que pasa por los puntos de control, con `porTramo` puntos por tramo. Incluye
 * exactamente cada punto de control (también el primero y el último); en los extremos se repiten.
 */
function curvaSuave(control: readonly PuntoPerfil[], porTramo: number): PuntoPerfil[] {
  const salida: PuntoPerfil[] = [];
  const n = control.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = control[Math.max(0, i - 1)]!;
    const p1 = control[i]!;
    const p2 = control[i + 1]!;
    const p3 = control[Math.min(n - 1, i + 2)]!;
    salida.push(p1);
    for (let k = 1; k < porTramo; k++) {
      const t = k / porTramo;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      salida.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  salida.push(control[n - 1]!);
  return salida;
}

/** Perfil `[radio, y]` (del cuello a la punta) a partir de puntos de control en fracciones de la corona. */
function perfilDeControl(control: readonly PuntoPerfil[]): PuntoPerfil[] {
  const absolutos: PuntoPerfil[] = control.map(([r, y], i) => [
    i === 0 ? semianchoRaiz(Y_CUELLO) : RADIO_CORONA * r,
    Y_CUELLO + ALTO_CORONA * y,
  ]);
  // Sin pasarse del radio de la corona ni del eje: la curva puede desbordar un poco entre puntos de control.
  return curvaSuave(absolutos, PUNTOS_POR_TRAMO).map(([r, y]) => [
    Math.max(0, Math.min(RADIO_CORONA, r)),
    y,
  ]);
}

/**
 * Interpolación cúbica monótona (Fritsch-Carlson) por puntos ordenados en x: no crea máximos ni mínimos entre
 * ellos, así que la punta de la cúspide y el fondo del surco quedan exactamente en sus puntos. Fuera del tramo
 * devuelve el extremo.
 */
function interpolarMonotona(puntos: readonly PuntoPerfil[], x: number): number {
  const n = puntos.length;
  if (x <= puntos[0]![0]) return puntos[0]![1];
  if (x >= puntos[n - 1]![0]) return puntos[n - 1]![1];
  const pendiente = (i: number): number =>
    (puntos[i + 1]![1] - puntos[i]![1]) / (puntos[i + 1]![0] - puntos[i]![0]);
  const tangente = (i: number): number => {
    if (i === 0) return pendiente(0);
    if (i === n - 1) return pendiente(n - 2);
    const a = pendiente(i - 1);
    const b = pendiente(i);
    if (a * b <= 0) return 0;
    // Media armónica ponderada: monótona sin desbordes.
    return (3 * a * b) / (2 * Math.max(a, b) + Math.min(a, b));
  };
  let k = 0;
  while (x > puntos[k + 1]![0]) k++;
  const [x0, y0] = puntos[k]!;
  const [x1, y1] = puntos[k + 1]!;
  const h = x1 - x0;
  const t = (x - x0) / h;
  if (t === 0) return y0;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 +
    (t3 - 2 * t2 + t) * h * tangente(k) +
    (-2 * t3 + 3 * t2) * y1 +
    (t3 - t2) * h * tangente(k + 1)
  );
}

/** Caras de la corona ya en `[radio, y]`, con los puntos intermedios de la curva suave. */
const CARA: Readonly<Record<Lado, readonly PuntoPerfil[]>> = {
  vestibular: perfilDeControl(CONTROL_CARA.vestibular),
  lingual: perfilDeControl(CONTROL_CARA.lingual),
};

/** Mezcla `a` (peso 0) y `b` (peso 1); exacta en los extremos. */
function entre(a: number, b: number, peso: number): number {
  if (peso <= 0) return a;
  if (peso >= 1) return b;
  return a + (b - a) * peso;
}

/**
 * Altura de la superficie oclusal en un punto a `u` (mesiodistal) y `v` (vestibulolingual, + vestibular) del eje
 * del diente, en un meridiano cuyo borde oclusal está a `radioBorde`: el perfil del corte, que sube hacia los
 * rebordes marginales al alejarse de él hacia mesial o distal.
 */
function alturaOclusal(u: number, v: number, radioBorde: number): number {
  const corte = interpolarMonotona(PERFIL_OCLUSAL, v / RADIO_CORONA);
  const haciaReborde = Math.min(1, (u / radioBorde) ** 2);
  return Y_CUELLO + ALTO_CORONA * (corte + (ALTURA_REBORDES - corte) * haciaReborde);
}

/**
 * Meridiano de la corona en el ángulo `theta` (convención de three: x = sen θ, z = cos θ; 0 mira a vestibular,
 * PI a lingual): puntos `[radio, y]` del cuello al eje, siempre el mismo número. La cara se ajusta suavemente
 * (nada en el cuello) para llegar a la altura del relieve oclusal en el borde.
 */
export function meridianoCorona(theta: number): PuntoPerfil[] {
  const peso = (1 + Math.cos(theta)) / 2;
  const seno = Math.sin(theta);
  const coseno = Math.cos(theta);
  const vestibular = CARA.vestibular;
  const lingual = CARA.lingual;
  const n = Math.min(vestibular.length, lingual.length);
  const radioBorde = entre(lingual[n - 1]![0], vestibular[n - 1]![0], peso);
  const alturaBorde = alturaOclusal(radioBorde * seno, radioBorde * coseno, radioBorde);
  const ajuste = alturaBorde - entre(lingual[n - 1]![1], vestibular[n - 1]![1], peso);
  const puntos: PuntoPerfil[] = [];
  for (let k = 0; k < n; k++) {
    const f = k / (n - 1);
    puntos.push([
      entre(lingual[k]![0], vestibular[k]![0], peso),
      entre(lingual[k]![1], vestibular[k]![1], peso) + ajuste * f * f,
    ]);
  }
  for (let j = 1; j <= PASOS_OCLUSAL; j++) {
    const r = radioBorde * (1 - j / PASOS_OCLUSAL);
    puntos.push([r, alturaOclusal(r * seno, r * coseno, radioBorde)]);
  }
  return puntos;
}

/**
 * Perfil VESTIBULAR de la corona: `[radio, y]` desde el cuello, en la cresta, hasta la punta de la cúspide
 * vestibular, sobre el eje. Es el meridiano de la corona que mira a +Z y el borde vestibular de su silueta.
 */
export function perfilCorona(): PuntoPerfil[] {
  return meridianoCorona(0);
}

/**
 * Perfil LINGUAL de la corona: del cuello sube por la cara lingual hasta la cúspide lingual, baja al surco
 * central y vuelve a subir por la vertiente lingual de la cúspide vestibular hasta su punta. Mismo número de
 * puntos que `perfilCorona`.
 */
export function perfilCoronaLingual(): PuntoPerfil[] {
  return meridianoCorona(Math.PI);
}

/** Perfil de la dentina de la corona de un lado (del cuello al techo, bajo la punta de la cúspide vestibular). */
export function perfilDentina(lado: Lado): PuntoPerfil[] {
  return perfilDeControl(CONTROL_DENTINA[lado]);
}

/** Polígono cerrado de un par de perfiles: el vestibular hacia +Z, de abajo arriba, y el lingual de vuelta. */
function siluetaDePerfiles(
  vestibular: readonly PuntoPerfil[],
  lingual: readonly PuntoPerfil[],
): Punto2[] {
  const puntos: Punto2[] = [];
  for (const [r, y] of vestibular) puntos.push([Z_ALVEOLO + r, y]);
  for (let i = lingual.length - 2; i >= 0; i--) {
    puntos.push([Z_ALVEOLO - lingual[i]![0], lingual[i]![1]]);
  }
  return puntos;
}

/**
 * Silueta de la corona (el esmalte) en el plano de corte: perfil vestibular hacia +Z y lingual hacia −Z, con
 * sus dos cúspides y el surco central. Coincide con el borde de las medias coronas en 3D (`mediaCorona`).
 */
export function siluetaCorona(): Punto2[] {
  return sinRepetidos(siluetaDePerfiles(perfilCorona(), perfilCoronaLingual()));
}

/**
 * Silueta de la DENTINA en el plano de corte, en un solo polígono: la de la corona (bajo el esmalte, con un
 * cuerno bajo cada cúspide) y la de la raíz, del cuello al ápice.
 */
export function siluetaDentina(pasos = 24): Punto2[] {
  const puntos = siluetaDePerfiles(perfilDentina('vestibular'), perfilDentina('lingual'));
  // Raíz: lado lingual del cuello al ápice y vestibular del ápice al cuello (el cuello ya está en la corona).
  const alturas = alturasMuestreadas(Y_APICE, Y_CUELLO, pasos);
  for (let i = alturas.length - 2; i >= 0; i--) {
    puntos.push([Z_ALVEOLO - semianchoRaiz(alturas[i]!), alturas[i]!]);
  }
  for (let i = 1; i < alturas.length - 1; i++) {
    puntos.push([Z_ALVEOLO + semianchoRaiz(alturas[i]!), alturas[i]!]);
  }
  return sinRepetidos(puntos);
}

/** Grosor del cemento radicular a la altura `y`: fino en el cuello y más grueso hacia el ápice (cemento celular). */
export function grosorCemento(y: number): number {
  const k = acotar((y - Y_APICE) / (Y_CUELLO - Y_APICE));
  return 0.022 + 0.05 * (1 - k) * (1 - k);
}

/**
 * Cemento radicular: banda que reviste la raíz por dentro de su silueta, del cuello al ápice, donde es tan
 * grueso que llena la punta (el conducto de la pulpa, que se dibuja delante, la atraviesa hasta el foramen). Polígono
 * en U sin agujeros: la superficie de la raíz (vestibular del cuello al ápice y lingual de vuelta) y el borde
 * interior, que se cierra en el eje donde el cemento ocupa toda la raíz. Va EXAGERADO para que se vea: unos 0,17 mm
 * en el cuello (el real, 0,02 a 0,05: de 4 a 8 veces más) y 0,56 mm en el ápice (el real, 0,15 a 0,2).
 */
export function bandaCemento(pasos = 24): Punto2[] {
  const alturas = alturasMuestreadas(Y_APICE, Y_CUELLO, pasos);
  const puntos: Punto2[] = [];
  for (let i = alturas.length - 1; i >= 0; i--) {
    puntos.push([Z_ALVEOLO + semianchoRaiz(alturas[i]!), alturas[i]!]);
  }
  for (let i = 1; i < alturas.length; i++) {
    puntos.push([Z_ALVEOLO - semianchoRaiz(alturas[i]!), alturas[i]!]);
  }
  // Borde interior: lingual del cuello hacia el ápice, el punto donde se cierra y vestibular de vuelta.
  const minimo = 0.003;
  const vestibular: Punto2[] = [];
  let anterior: { y: number; w: number } | null = null;
  for (let i = alturas.length - 1; i >= 0; i--) {
    const y = alturas[i]!;
    const w = semianchoRaiz(y) - grosorCemento(y);
    if (w <= minimo) {
      const yCierre = anterior
        ? y + ((anterior.y - y) * (minimo - w)) / (anterior.w - w)
        : Y_CUELLO;
      puntos.push([Z_ALVEOLO, yCierre]);
      break;
    }
    puntos.push([Z_ALVEOLO - w, y]);
    vestibular.push([Z_ALVEOLO + w, y]);
    anterior = { y, w };
  }
  puntos.push(...vestibular.reverse());
  return sinRepetidos(puntos);
}

/** Fondo del conducto radicular: el foramen apical, a unos 0,08 mm del ápice (fidelidad-12). */
export const Y_FORAMEN = Y_APICE + 0.01;

/**
 * Silueta de la pulpa: conducto radicular estrecho, que llega al ápice (el foramen apical, por donde entran los vasos
 * y los nervios del ligamento; antes se cerraba 1,7 mm antes, en cemento macizo), y cámara pulpar en la corona, a la
 * altura del cuello.
 */
export function siluetaPulpa(): Punto2[] {
  const derecha: Punto2[] = [];
  const alturas = alturasMuestreadas(Y_APICE + 0.06, Y_CUELLO, 16);
  for (const y of alturas) derecha.push([Z_ALVEOLO + 0.3 * semianchoRaiz(y), y]);
  derecha.push([Z_ALVEOLO + 0.16, Y_CUELLO + 0.24], [Z_ALVEOLO + 0.09, Y_CUELLO + 0.46]);
  const puntos: Punto2[] = [[Z_ALVEOLO, Y_FORAMEN], ...derecha, [Z_ALVEOLO, Y_CUELLO + 0.51]];
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
