/**
 * Disposición de las piezas repetidas de la escena de las dos rutas: las células de cada lado (dónde están
 * dispersas, dónde se condensan y dónde acaban), la red de espículas del hueso plano, los vasos que entran entre
 * ellas, las osteonas de la tabla superior, las lagunas de los condrocitos dentro del molde y las trabéculas del
 * centro primario. Lógica PURA: solo números, deterministas (misma semilla, misma disposición), sin three ni Vue.
 * Las mallas (`mallas.ts`) convierten estos números en instancias.
 *
 * Todas las coordenadas son LOCALES a su lado (el origen de cada lado está en (±X_LADO, 0, 0) en la escena).
 */
import { generadorDeterminista } from '../interpolacion';
import {
  CADA_OSTEOCITO,
  MOLDE,
  N_CELULAS_EC,
  N_CELULAS_IM,
  N_OSTEONAS_PLACA,
  PANEL,
  PLACA,
  RED_ESPICULAS,
  R_INTERIOR_DIAFISIS,
  Y_CENTRAL,
} from './estado';

export type Punto3 = readonly [number, number, number];

const DOS_PI = Math.PI * 2;

export function grados(g: number): number {
  return (g * Math.PI) / 180;
}

function normalizar(v: Punto3): Punto3 {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

/** Un punto al azar dentro del panel de mesénquima, sin pegarse a sus bordes. */
function puntoDisperso(azar: () => number): Punto3 {
  return [
    (azar() * 2 - 1) * PANEL.ancho * 0.42,
    (azar() * 2 - 1) * PANEL.alto * 0.42,
    (azar() * 2 - 1) * PANEL.fondo * 0.36,
  ];
}

/** Un punto al azar dentro de un elipsoide de semiejes `sx`, `sy`, `sz` (repartido por volumen). */
function puntoEnElipsoide(azar: () => number, sx: number, sy: number, sz: number): Punto3 {
  for (;;) {
    const x = azar() * 2 - 1;
    const y = azar() * 2 - 1;
    const z = azar() * 2 - 1;
    if (x * x + y * y + z * z <= 1) return [x * sx, y * sy, z * sz];
  }
}

/* -------------------------------------------------------------------------------------------
 * Espículas del hueso plano (izquierda)
 * ----------------------------------------------------------------------------------------- */

export interface Espicula {
  a: Punto3;
  b: Punto3;
  /** Cuándo aparece (0 la primera, 1 la última) según el progreso `espiculas` del estado. */
  orden: number;
  /** Cerca de la periferia (arriba o abajo): se funde con las tablas compactas. */
  externa: boolean;
}

/** Cuántas generaciones de ramas tiene la red y el tope de espículas. */
const GENERACIONES = 5;
const MAX_ESPICULAS = 84;

/**
 * Red de espículas que se ramifica desde el centro de la condensación: unos brotes iniciales, y de la punta de
 * cada uno salen una o dos ramas con un giro al azar, hasta llenar el elipsoide `RED_ESPICULAS`. Las ramas se
 * mantienen más tumbadas que verticales (el hueso plano crece a lo ancho). Deterministas.
 */
export function espiculasIntramembranosas(): Espicula[] {
  const azar = generadorDeterminista(707);
  const resultado: Espicula[] = [];
  let puntas: { p: Punto3; dir: Punto3 }[] = [];
  const brotes = 6;
  for (let i = 0; i < brotes; i++) {
    const a = (i / brotes) * DOS_PI + azar() * 0.5;
    puntas.push({
      p: [0, 0, 0],
      dir: normalizar([Math.cos(a), (azar() - 0.5) * 1.1, Math.sin(a) * 0.6]),
    });
  }
  const dentro = (p: Punto3): number =>
    (p[0] / RED_ESPICULAS.x) ** 2 + (p[1] / RED_ESPICULAS.y) ** 2 + (p[2] / RED_ESPICULAS.z) ** 2;
  for (let gen = 0; gen < GENERACIONES && resultado.length < MAX_ESPICULAS; gen++) {
    const siguientes: { p: Punto3; dir: Punto3 }[] = [];
    for (const punta of puntas) {
      if (resultado.length >= MAX_ESPICULAS) break;
      const largo = 0.3 + azar() * 0.22;
      let dir = punta.dir;
      let b: Punto3 = [
        punta.p[0] + dir[0] * largo,
        punta.p[1] + dir[1] * largo,
        punta.p[2] + dir[2] * largo,
      ];
      if (dentro(b) > 1) {
        // Al llegar al borde de la red la rama rebota hacia dentro (se invierte lo que se sale).
        const semiejes = [RED_ESPICULAS.x, RED_ESPICULAS.y, RED_ESPICULAS.z];
        dir = normalizar(
          dir.map((d, i) => (Math.abs(b[i]! / semiejes[i]!) > 0.7 ? -d : d)) as unknown as Punto3,
        );
        b = [punta.p[0] + dir[0] * largo, punta.p[1] + dir[1] * largo, punta.p[2] + dir[2] * largo];
      }
      let sigue = true;
      if (dentro(b) > 1) {
        // Si aun así se sale, la rama se acorta hasta el borde (bisección) y termina ahí.
        let f0 = 0;
        let f1 = 1;
        const en = (f: number): Punto3 => [
          punta.p[0] + dir[0] * largo * f,
          punta.p[1] + dir[1] * largo * f,
          punta.p[2] + dir[2] * largo * f,
        ];
        for (let k = 0; k < 12; k++) {
          const fm = (f0 + f1) / 2;
          if (dentro(en(fm)) <= 0.98) f0 = fm;
          else f1 = fm;
        }
        b = en(Math.max(0.25, f0));
        sigue = false;
      }
      const medioY = (punta.p[1] + b[1]) / 2;
      resultado.push({
        a: punta.p,
        b,
        orden: Math.min(1, (gen + azar() * 0.7) / GENERACIONES),
        externa: Math.abs(medioY) > PLACA.y - PLACA.grosor,
      });
      if (!sigue) continue;
      const hijas = azar() < 0.7 ? 2 : 1;
      for (let h = 0; h < hijas; h++) {
        const giro: Punto3 = [(azar() - 0.5) * 0.9, (azar() - 0.5) * 0.8, (azar() - 0.5) * 0.9];
        siguientes.push({
          p: b,
          dir: normalizar([dir[0] + giro[0], dir[1] + giro[1], dir[2] + giro[2]]),
        });
      }
    }
    puntas = siguientes;
  }
  return resultado;
}

/** Punto medio de una espícula. */
export function medio(e: { a: Punto3; b: Punto3 }): Punto3 {
  return [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2, (e.a[2] + e.b[2]) / 2];
}

/* -------------------------------------------------------------------------------------------
 * Células del lado intramembranoso
 * ----------------------------------------------------------------------------------------- */

export interface CelulaIm {
  /** Dónde está en el mesénquima disperso. */
  dispersa: Punto3;
  /** Dónde queda en la condensación. */
  condensada: Punto3;
  /** Dónde acaba: al borde de una espícula (osteoblasto) o dentro de ella (osteocito). */
  destino: Punto3;
  /** Retraso relativo (0 a 1) con el que se condensa: no llegan todas a la vez. */
  retraso: number;
  papel: 'osteoblasto' | 'osteocito';
  /** Giro alrededor de Z (radianes) del cuerpo fusiforme. */
  giro: number;
}

/**
 * Células de la izquierda: dispersas por el panel, condensadas en un elipsoide aplanado en el centro y, al final,
 * repartidas por la red de espículas: una de cada `CADA_OSTEOCITO` queda dentro de una espícula interior (osteocito)
 * y las demás se apoyan en la superficie de una espícula (osteoblastos). Deterministas.
 */
export function celulasIntramembranosas(
  espiculas: readonly Espicula[] = espiculasIntramembranosas(),
): CelulaIm[] {
  const azar = generadorDeterminista(1201);
  const interiores = espiculas.filter((e) => !e.externa && e.orden < 0.7);
  const resultado: CelulaIm[] = [];
  for (let i = 0; i < N_CELULAS_IM; i++) {
    const papel = i % CADA_OSTEOCITO === 0 ? 'osteocito' : 'osteoblasto';
    const lista = papel === 'osteocito' && interiores.length > 0 ? interiores : espiculas;
    const espicula = lista[Math.floor(azar() * lista.length) % lista.length]!;
    const m = medio(espicula);
    let destino: Punto3 = m;
    if (papel === 'osteoblasto') {
      // Perpendicular a la espícula, hacia la cámara o hacia arriba (que se vea).
      const dir = normalizar([
        espicula.b[0] - espicula.a[0],
        espicula.b[1] - espicula.a[1],
        espicula.b[2] - espicula.a[2],
      ]);
      const preferida: Punto3 = azar() < 0.6 ? [0, 0, 1] : [0, azar() < 0.5 ? 1 : -1, 0];
      const proyeccion = dir[0] * preferida[0] + dir[1] * preferida[1] + dir[2] * preferida[2];
      const perpendicular = normalizar([
        preferida[0] - dir[0] * proyeccion + (azar() - 0.5) * 0.3,
        preferida[1] - dir[1] * proyeccion + (azar() - 0.5) * 0.3,
        preferida[2] - dir[2] * proyeccion + (azar() - 0.5) * 0.3,
      ]);
      const sobre = (azar() - 0.5) * 0.5;
      const separacion = 0.14;
      destino = [
        m[0] + perpendicular[0] * separacion + dir[0] * sobre,
        m[1] + perpendicular[1] * separacion + dir[1] * sobre,
        m[2] + perpendicular[2] * separacion + dir[2] * sobre,
      ];
    }
    resultado.push({
      dispersa: puntoDisperso(azar),
      condensada: puntoEnElipsoide(azar, 1.15, 0.5, 0.45),
      destino,
      retraso: azar(),
      papel,
      giro: (azar() - 0.5) * grados(70),
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Vasos que entran entre las espículas (izquierda)
 * ----------------------------------------------------------------------------------------- */

/** Un vaso: polilínea de `puntos` (del borde del panel hacia el centro). */
export interface Vaso {
  puntos: readonly Punto3[];
}

/** Número de vasos y tramos por vaso. */
export const N_VASOS_IM = 6;
export const TRAMOS_VASO = 3;

/** Vasos que entran desde la periferia del elipsoide de la red hacia el centro, con algún quiebro. Deterministas. */
export function vasosIntramembranosos(): Vaso[] {
  const azar = generadorDeterminista(2311);
  const resultado: Vaso[] = [];
  for (let i = 0; i < N_VASOS_IM; i++) {
    const a = (i / N_VASOS_IM) * DOS_PI + (azar() - 0.5) * 0.5;
    const inicio: Punto3 = [
      Math.cos(a) * RED_ESPICULAS.x * 0.96,
      (azar() - 0.5) * 0.7,
      Math.sin(a) * RED_ESPICULAS.z * 0.96,
    ];
    const fin: Punto3 = [(azar() - 0.5) * 0.6, (azar() - 0.5) * 0.3, (azar() - 0.5) * 0.4];
    const puntos: Punto3[] = [inicio];
    for (let k = 1; k < TRAMOS_VASO; k++) {
      const u = k / TRAMOS_VASO;
      puntos.push([
        inicio[0] + (fin[0] - inicio[0]) * u + (azar() - 0.5) * 0.25,
        inicio[1] + (fin[1] - inicio[1]) * u + (azar() - 0.5) * 0.2,
        inicio[2] + (fin[2] - inicio[2]) * u + (azar() - 0.5) * 0.2,
      ]);
    }
    puntos.push(fin);
    resultado.push({ puntos });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Osteonas de la tabla superior (izquierda)
 * ----------------------------------------------------------------------------------------- */

export interface OsteonaPlaca {
  x: number;
  z: number;
  escala: number;
}

/** Osteonas repartidas en dos filas sobre la cara superior de la tabla de arriba, sin salirse de ella. */
export function osteonasDePlaca(): OsteonaPlaca[] {
  const azar = generadorDeterminista(808);
  const resultado: OsteonaPlaca[] = [];
  const porFila = Math.ceil(N_OSTEONAS_PLACA / 2);
  for (let i = 0; i < N_OSTEONAS_PLACA; i++) {
    const fila = i < porFila ? 0 : 1;
    const k = fila === 0 ? i : i - porFila;
    const n = fila === 0 ? porFila : N_OSTEONAS_PLACA - porFila;
    resultado.push({
      x: (-0.5 + (k + 0.5) / n) * PLACA.ancho * 0.84 + (azar() - 0.5) * 0.1,
      z: (fila === 0 ? -0.25 : 0.25) * PLACA.fondo + (azar() - 0.5) * 0.08,
      escala: 0.85 + azar() * 0.3,
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Células del lado endocondral
 * ----------------------------------------------------------------------------------------- */

export interface CelulaEc {
  dispersa: Punto3;
  condensada: Punto3;
  /** Laguna dentro del molde cartilaginoso. */
  laguna: Punto3;
  retraso: number;
  /** En el centro de la diáfisis: se hipertrofia primero. */
  central: boolean;
}

/** Radio del molde cartilaginoso a la altura `y` (0 fuera del molde). */
export function radioDelMolde(y: number): number {
  const ay = Math.abs(y);
  let r = ay <= MOLDE.medioLargo ? MOLDE.radio : 0;
  const dy = (ay - MOLDE.yEpifisis) / MOLDE.semiejeEpifisis;
  if (Math.abs(dy) < 1) r = Math.max(r, MOLDE.rEpifisis * Math.sqrt(1 - dy * dy));
  return r;
}

/**
 * Células de la derecha: dispersas por el panel, condensadas en una masa alargada y, al final, cada una en su
 * laguna dentro del molde (repartidas a lo largo de todo el molde, más juntas hacia el eje). Deterministas.
 */
export function celulasEndocondrales(): CelulaEc[] {
  const azar = generadorDeterminista(1789);
  const resultado: CelulaEc[] = [];
  const tope = MOLDE.yEpifisis + MOLDE.semiejeEpifisis * 0.85;
  while (resultado.length < N_CELULAS_EC) {
    const y = (azar() * 2 - 1) * tope;
    const rMax = radioDelMolde(y) * 0.78;
    if (rMax <= 0.05) continue;
    const a = azar() * DOS_PI;
    const r = rMax * Math.sqrt(azar());
    const laguna: Punto3 = [Math.cos(a) * r, y, Math.sin(a) * r];
    resultado.push({
      dispersa: puntoDisperso(azar),
      condensada: [laguna[0] * 0.8, laguna[1] * 0.8, laguna[2] * 0.8],
      laguna,
      retraso: azar(),
      central: Math.abs(y) < Y_CENTRAL,
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Trabéculas del centro primario (derecha)
 * ----------------------------------------------------------------------------------------- */

export interface TrabeculaCentro {
  a: Punto3;
  b: Punto3;
  /** |y| del punto medio: decide cuándo el frente la alcanza. */
  altura: number;
}

export const N_TRABECULAS_CENTRO = 44;

/** Trabéculas cortas dentro del cilindro interior de la diáfisis, con dirección al azar sesgada al eje. */
export function trabeculasDelCentro(): TrabeculaCentro[] {
  const azar = generadorDeterminista(3103);
  const resultado: TrabeculaCentro[] = [];
  const r = R_INTERIOR_DIAFISIS * 0.85;
  for (let i = 0; i < N_TRABECULAS_CENTRO; i++) {
    const y = (azar() * 2 - 1) * (MOLDE.medioLargo - 0.1);
    const ang = azar() * DOS_PI;
    const rad = r * Math.sqrt(azar());
    const a: Punto3 = [Math.cos(ang) * rad, y, Math.sin(ang) * rad];
    const dir = normalizar([
      (azar() - 0.5) * 0.9,
      azar() - 0.5 + (azar() < 0.5 ? -0.5 : 0.5),
      (azar() - 0.5) * 0.9,
    ]);
    const largo = 0.22 + azar() * 0.18;
    const b: Punto3 = [a[0] + dir[0] * largo, a[1] + dir[1] * largo, a[2] + dir[2] * largo];
    resultado.push({ a, b, altura: Math.abs((a[1] + b[1]) / 2) });
  }
  return resultado;
}
