/**
 * Disposición de la red trabecular: dónde está cada placa y cada barra, con qué grosor nace y qué "vida" tiene.
 * Lógica PURA: solo números, deterministas (misma semilla, misma red), sin three ni Vue, para poder probarla y
 * para que el dibujo no cambie entre cargas. Las mallas (`mallas.ts`) convierten estos números en instancias.
 *
 * ── La red ────────────────────────────────────────────────────────────────────────────────────
 * Un cubo de lado `LADO` dividido en `N_CELDAS` celdas por eje. Las PLACAS son caras verticales de celda (hay
 * dos familias: con la normal en Z y con la normal en X), orientadas a la carga vertical como en el hueso real.
 * Las BARRAS son aristas horizontales de celda (a lo largo de X o de Z) que arriostran las placas. Solo existe
 * una fracción de las caras y de las aristas posibles (`PRESENCIA`), con un pequeño desorden en posición,
 * inclinación y tamaño, para que la red parezca hueso y no un panal. Nada cae fuera del cubo ni en sus paredes.
 *
 * ── La vida ───────────────────────────────────────────────────────────────────────────────────
 * Cada trabécula lleva `vida` (0 a 1). Los factores globales del estado (`FactoresRed`) se comparan con ella:
 *  - `grosorDe*`: cuanto menor la vida, más se adelgaza cuando cae el grosor global;
 *  - `agujeroDePlaca`: una placa se perfora cuando la fracción global de perforación supera su vida;
 *  - `presenciaDeBarra`: una barra se corta y desaparece cuando la fracción global de barras presentes baja de
 *    (1 - vida): las de menor vida se pierden antes.
 * Las placas que llevan una BMU o una microfractura nacen con vida alta: siguen enteras hasta el final.
 */
import { acotar, generadorDeterminista } from '../interpolacion';
import { GROSOR_PLACA, LADO, N_BMU, N_CELDAS, N_MICROFRACTURAS, PASO, RADIO_BARRA } from './estado';
import type { FactoresRed } from './estado';

/** Fracción de caras y de aristas de la retícula que existen como trabéculas. */
export const PRESENCIA = { placas: 0.56, barras: 0.66 } as const;
/** Semilla de la red (cambiarla cambia toda la disposición). */
export const SEMILLA_RED = 6031;
/** Fracción máxima del ancho y del alto de una placa que ocupa su agujero al perforarse del todo. */
export const AGUJERO_MAXIMO = 0.64;

export function grados(g: number): number {
  return (g * Math.PI) / 180;
}

/** Eje de la normal de una placa o de la dirección de una barra. */
export type Eje = 'x' | 'z';

export interface Placa {
  /** Centro. */
  x: number;
  y: number;
  z: number;
  /** Eje de la normal: `z` mira a la cámara en la vista general; `x` se ve de canto. */
  normal: Eje;
  /** Ancho (horizontal, en su plano) y alto. */
  ancho: number;
  alto: number;
  /** Grosor base relativo a `GROSOR_PLACA` (0,85 a 1,2). */
  grosor: number;
  /** Giro alrededor del eje vertical y cabeceo alrededor del eje horizontal de su plano (radianes, pequeños). */
  giro: number;
  cabeceo: number;
  /** Umbral de envejecimiento (0 a 1): menor vida, antes se adelgaza y se perfora. */
  vida: number;
  /** BMU trabecular que lleva en su cara frontal, si la lleva. */
  bmu: 'resorcion' | 'formacion' | null;
  /** Se rompe bajo la carga final. */
  microfractura: boolean;
}

export interface Barra {
  /** Centro. */
  x: number;
  y: number;
  z: number;
  /** Dirección (horizontal). */
  eje: Eje;
  largo: number;
  /** Radio base relativo a `RADIO_BARRA` (0,8 a 1,25). */
  grosor: number;
  /** Inclinación pequeña respecto de la horizontal (radianes). */
  inclinacion: number;
  vida: number;
  /** Extremo por el que se conserva el muñón al cortarse: +1 o -1 a lo largo de su eje. */
  extremo: 1 | -1;
}

export interface RedTrabecularDatos {
  placas: Placa[];
  barras: Barra[];
}

const MITAD = LADO / 2;

/** Coordenada del plano interior `i` (1 a N_CELDAS - 1) de la retícula. */
function plano(i: number): number {
  return -MITAD + i * PASO;
}

/** Centro de la celda `k` (0 a N_CELDAS - 1). */
function centroCelda(k: number): number {
  return -MITAD + (k + 0.5) * PASO;
}

/**
 * Genera la red completa. Determinista: la misma semilla da siempre las mismas trabéculas, en el mismo orden.
 * Las placas de las BMU se eligen en el plano frontal (normal Z, el más cercano a la cámara) y cerca del centro;
 * las microfracturas, en placas del interior a media altura que no llevan BMU.
 */
export function redTrabecular(semilla: number = SEMILLA_RED): RedTrabecularDatos {
  const azar = generadorDeterminista(semilla);
  const placas: Placa[] = [];
  const barras: Barra[] = [];

  // Placas: caras verticales interiores. Para cada familia, planos 1..N-1 de su normal y celdas en los otros ejes.
  for (const normal of ['z', 'x'] as const) {
    for (let i = 1; i < N_CELDAS; i++) {
      for (let fila = 0; fila < N_CELDAS; fila++) {
        for (let columna = 0; columna < N_CELDAS; columna++) {
          const presente = azar() < PRESENCIA.placas;
          const a = centroCelda(columna) + (azar() - 0.5) * 0.08;
          const y = centroCelda(fila) + (azar() - 0.5) * 0.06;
          const p = plano(i) + (azar() - 0.5) * 0.1;
          const escala = 0.9 + azar() * 0.22;
          const giro = (azar() - 0.5) * grados(14);
          const cabeceo = (azar() - 0.5) * grados(10);
          const grosor = 0.85 + azar() * 0.35;
          const vida = azar();
          if (!presente) continue;
          placas.push({
            x: normal === 'z' ? a : p,
            y,
            z: normal === 'z' ? p : a,
            normal,
            ancho: PASO * escala,
            alto: PASO * (0.92 + azar() * 0.2),
            grosor,
            giro,
            cabeceo,
            vida,
            bmu: null,
            microfractura: false,
          });
        }
      }
    }
  }

  // Barras: aristas horizontales interiores (niveles 1..N-1, planos 1..N-1, una celda de largo).
  for (const eje of ['x', 'z'] as const) {
    for (let nivel = 1; nivel < N_CELDAS; nivel++) {
      for (let i = 1; i < N_CELDAS; i++) {
        for (let k = 0; k < N_CELDAS; k++) {
          const presente = azar() < PRESENCIA.barras;
          const a = centroCelda(k) + (azar() - 0.5) * 0.06;
          const y = plano(nivel) + (azar() - 0.5) * 0.08;
          const p = plano(i) + (azar() - 0.5) * 0.08;
          const largo = PASO * (0.98 + azar() * 0.14);
          const grosor = 0.8 + azar() * 0.45;
          const inclinacion = (azar() - 0.5) * grados(12);
          const vida = azar();
          const extremo = azar() < 0.5 ? 1 : -1;
          if (!presente) continue;
          barras.push({
            x: eje === 'x' ? a : p,
            y,
            z: eje === 'x' ? p : a,
            eje,
            largo,
            grosor,
            inclinacion,
            vida,
            extremo,
          });
        }
      }
    }
  }

  // BMU: en el plano frontal de normal Z, las tres placas más cercanas a un punto algo por encima del centro.
  const zFrontal = plano(N_CELDAS - 1);
  const frontales = placas
    .filter((p) => p.normal === 'z' && Math.abs(p.z - zFrontal) < PASO / 2)
    .sort((p, q) => Math.hypot(p.x - 0.1, p.y - 0.35) - Math.hypot(q.x - 0.1, q.y - 0.35));
  const tiposBmu = ['resorcion', 'formacion', 'formacion'] as const;
  frontales.slice(0, N_BMU).forEach((p, i) => {
    p.bmu = tiposBmu[i % tiposBmu.length]!;
    p.vida = 0.96 + 0.01 * i;
    // La BMU se apoya en la cara: la placa queda plana y paralela a la cara frontal.
    p.cabeceo = 0;
    p.giro = 0;
  });

  // Delante de cada BMU se despeja una ventana (placas de canto y barras de la capa frontal) para poder verla.
  const sitios = placas.filter((p) => p.bmu !== null);
  const enVentana = (x: number, y: number, z: number): boolean =>
    z > zFrontal - 0.15 &&
    sitios.some((s) => Math.abs(x - s.x) < PASO * 0.9 && Math.abs(y - s.y) < PASO * 0.7);
  const placasVisibles = placas.filter((p) => !(p.normal === 'x' && enVentana(p.x, p.y, p.z)));
  const barrasVisibles = barras.filter((b) => !enVentana(b.x, b.y, b.z));

  // Microfracturas: placas interiores a media altura, sin BMU, repartidas por las dos familias.
  const candidatas = placasVisibles
    .filter(
      (p) => p.bmu === null && Math.abs(p.y) < PASO * 1.2 && Math.abs(p.z - zFrontal) > PASO / 2,
    )
    // Cuanto más adelante (z alto) y más centradas (x pequeño), mejor se ven al romperse.
    .sort((p, q) => Math.abs(p.x) - p.z - (Math.abs(q.x) - q.z));
  const primeraZ = candidatas.find((p) => p.normal === 'z');
  const primeraX = candidatas.find((p) => p.normal === 'x');
  const elegidas = new Set<Placa>();
  for (const p of [primeraZ, primeraX, ...candidatas]) {
    if (elegidas.size >= N_MICROFRACTURAS) break;
    if (p) elegidas.add(p);
  }
  [...elegidas].forEach((p, i) => {
    p.microfractura = true;
    p.vida = 0.9 + 0.02 * i;
  });

  return { placas: placasVisibles, barras: barrasVisibles };
}

/* -------------------------------------------------------------------------------------------
 * Cómo envejece cada trabécula (puro)
 * ----------------------------------------------------------------------------------------- */

/** Factor de adelgazamiento de una trabécula de `vida` dada cuando el grosor global es `grosor` (0,3 a 1). */
export function factorGrosor(vida: number, grosor: number): number {
  const perdida = (1 - acotar(grosor)) * (0.75 + 0.5 * (1 - acotar(vida)));
  return Math.max(0.3, 1 - perdida);
}

/** Grosor actual de una placa (unidades de escena). */
export function grosorDePlaca(placa: Placa, red: FactoresRed): number {
  return GROSOR_PLACA * placa.grosor * factorGrosor(placa.vida, red.grosor);
}

/** Radio actual de una barra (unidades de escena). */
export function radioDeBarra(barra: Barra, red: FactoresRed): number {
  return RADIO_BARRA * barra.grosor * factorGrosor(barra.vida, red.grosor);
}

/**
 * Tamaño del agujero de una placa (0 intacta, 1 perforada del todo): se abre cuando la fracción global de
 * perforación supera su vida, y tarda 0,2 de esa fracción en abrirse del todo. Las placas con BMU o microfractura
 * tienen vida alta y no se perforan mientras la perforación global no llega a ellas.
 */
export function agujeroDePlaca(placa: Placa, red: FactoresRed): number {
  return acotar((red.perforacion - placa.vida) / 0.2);
}

/**
 * Presencia de una barra (1 entera, 0 desaparecida): empieza a cortarse (queda un muñón cada vez más corto) cuando
 * la fracción global de barras presentes baja de (1 - vida) y desaparece 0,1 después; con todas las barras
 * presentes (`barras` = 1) ninguna se corta, sea cual sea su vida.
 */
export function presenciaDeBarra(barra: Barra, red: FactoresRed): number {
  return acotar((barra.vida - (1 - red.barras)) / 0.1 + 1);
}

/**
 * Posiciones (x, z) de los poros de la cortical superior, dentro de la cara (con margen), deterministas.
 */
export function porosDeCortical(n = 16, semilla = 7071): { x: number; z: number; radio: number }[] {
  const azar = generadorDeterminista(semilla);
  const poros: { x: number; z: number; radio: number }[] = [];
  const margen = 0.25;
  while (poros.length < n) {
    const x = (azar() * 2 - 1) * (MITAD - margen);
    const z = (azar() * 2 - 1) * (MITAD - margen);
    const radio = 0.05 + azar() * 0.05;
    if (poros.some((p) => Math.hypot(p.x - x, p.z - z) < 0.32)) continue;
    poros.push({ x, z, radio });
  }
  return poros;
}
