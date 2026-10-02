/**
 * Disposición de las piezas repetidas de la escena del osteoclasto (precursores, núcleos, pliegues del borde
 * festoneado, partículas, células de inversión, cuerpos apoptóticos). Lógica PURA: solo números, deterministas
 * (misma semilla, misma disposición), sin three ni Vue, para poder probarla y para que el dibujo no cambie entre
 * cargas. Las mallas (`mallas.ts`) convierten estos números en instancias.
 *
 * Convención: la superficie del hueso es el plano y = 0, la célula está centrada en x = z = 0 y la mitad que se
 * aparta al cortar la escena es la de z > 0 (la cámara mira desde +Z).
 */
import { generadorDeterminista } from '../interpolacion';
import {
  CAPILAR,
  N_FRAGMENTOS,
  N_INVERSION,
  N_NUCLEOS,
  N_PARTICULAS_ACIDO,
  N_PARTICULAS_PRODUCTOS,
  N_PLIEGUES,
  N_PRECURSORES,
  R_LAGUNA,
  R_PRECURSOR,
  R_SELLADO,
} from './estado';

const DOS_PI = Math.PI * 2;

export type Punto3 = readonly [x: number, y: number, z: number];

/* -------------------------------------------------------------------------------------------
 * Precursores mononucleares
 * ----------------------------------------------------------------------------------------- */

export interface Precursor {
  /** Punto de salida, bajo el capilar. */
  origen: Punto3;
  /** Punto de llegada, sobre el hueso, alrededor de donde se formará la célula. */
  destino: Punto3;
  /** Desfase (0 a 1) con el que cada uno arranca: no llegan todos a la vez. */
  orden: number;
  radio: number;
}

/** Los precursores salen del capilar escalonados a lo largo de X y se colocan en anillo sobre el hueso. */
export function precursores(): Precursor[] {
  const azar = generadorDeterminista(2026_02);
  const resultado: Precursor[] = [];
  for (let i = 0; i < N_PRECURSORES; i++) {
    const radio = R_PRECURSOR * (0.9 + 0.2 * azar());
    const xOrigen = -1.6 + (3.2 * (i + 0.5)) / N_PRECURSORES + (azar() - 0.5) * 0.3;
    const angulo = (i / N_PRECURSORES) * DOS_PI + 0.4 + (azar() - 0.5) * 0.4;
    const rDestino = 0.55 + (azar() - 0.5) * 0.1;
    resultado.push({
      origen: [xOrigen, CAPILAR.y - CAPILAR.radio - radio * 0.6, CAPILAR.z + 0.05],
      destino: [rDestino * Math.cos(angulo), radio, rDestino * Math.sin(angulo)],
      orden: i / N_PRECURSORES,
      radio,
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Núcleos de la célula multinucleada
 * ----------------------------------------------------------------------------------------- */

export interface Nucleo {
  /** Posición en coordenadas de la esfera unidad de la célula (se escala con sus semiejes). */
  local: Punto3;
  /** Radio relativo al semieje horizontal de la célula. */
  radio: number;
}

/** Seis núcleos repartidos en la mitad superior de la célula, tres en cada mitad (delante y detrás del corte). */
export function nucleos(): Nucleo[] {
  const azar = generadorDeterminista(4433);
  const resultado: Nucleo[] = [];
  for (let i = 0; i < N_NUCLEOS; i++) {
    const angulo = (i / N_NUCLEOS) * DOS_PI + 0.25 + (azar() - 0.5) * 0.3;
    const r = 0.4 + azar() * 0.14;
    // Alternan delante (z > 0) y detrás (z < 0) del plano de corte.
    const lado = i % 2 === 0 ? -1 : 1;
    const z = (Math.abs(r * Math.sin(angulo)) + 0.08) * lado;
    resultado.push({
      local: [r * Math.cos(angulo), 0.12 + azar() * 0.2, z],
      radio: 0.12 + azar() * 0.025,
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Pliegues del borde festoneado
 * ----------------------------------------------------------------------------------------- */

export interface Pliegue {
  x: number;
  z: number;
  /** Radio del pliegue. */
  radio: number;
  /** Factor de altura (0,7 a 1,15), para que no sean todos iguales. */
  altura: number;
}

/** Pliegues en coronas concéntricas dentro de la zona de sellado (hasta 0,86 del radio de la laguna). */
export function pliegues(): Pliegue[] {
  const azar = generadorDeterminista(9091);
  const resultado: Pliegue[] = [];
  const coronas: [radio: number, cuantos: number][] = [
    [0.22, 6],
    [0.5, 12],
    [0.8, 18],
  ];
  for (const [fraccion, cuantos] of coronas) {
    for (let j = 0; j < cuantos; j++) {
      const angulo = (j / cuantos) * DOS_PI + fraccion * 3 + (azar() - 0.5) * 0.12;
      const r = fraccion * R_LAGUNA * 0.86 + (azar() - 0.5) * 0.05;
      resultado.push({
        x: r * Math.cos(angulo),
        z: r * Math.sin(angulo),
        radio: 0.055 + azar() * 0.025,
        altura: 0.7 + azar() * 0.45,
      });
    }
  }
  return resultado.slice(0, N_PLIEGUES);
}

/* -------------------------------------------------------------------------------------------
 * Partículas
 * ----------------------------------------------------------------------------------------- */

/** Tipos de partícula que salen hacia el hueso: protones, cloruro y catepsina K. */
export type TipoAcido = 'proton' | 'cloruro' | 'catepsina';
/** Tipos de producto que atraviesan la célula: calcio, fosfato y fragmentos de colágeno. */
export type TipoProducto = 'calcio' | 'fosfato' | 'colageno';

export interface ParticulaAcido {
  x: number;
  z: number;
  /** Desfase (0 a 1) del ciclo de la partícula. */
  desfase: number;
  tipo: TipoAcido;
}

/**
 * Partículas ácidas: en la mitad trasera (z < 0), que es la que queda tras el corte, dentro de 0,8 del radio de la
 * laguna. La mitad son protones; el resto, cloruro y catepsina K.
 */
export function particulasAcido(): ParticulaAcido[] {
  const azar = generadorDeterminista(1717);
  const tipos: TipoAcido[] = ['proton', 'proton', 'cloruro', 'catepsina'];
  const resultado: ParticulaAcido[] = [];
  for (let i = 0; i < N_PARTICULAS_ACIDO; i++) {
    const r = Math.sqrt(azar()) * R_LAGUNA * 0.8;
    const angulo = Math.PI + azar() * Math.PI;
    resultado.push({
      x: r * Math.cos(angulo),
      z: Math.min(-0.05, r * Math.sin(angulo)),
      desfase: azar(),
      tipo: tipos[i % tipos.length]!,
    });
  }
  return resultado;
}

export interface ParticulaProducto {
  /** Punto de partida en la laguna (x, z); la altura la pone la superficie excavada. */
  x: number;
  z: number;
  /** Punto de llegada bajo el capilar. */
  destino: Punto3;
  desfase: number;
  tipo: TipoProducto;
}

/** Productos de la resorción: del fondo de la laguna (mitad trasera) al capilar. */
export function particulasProductos(): ParticulaProducto[] {
  const azar = generadorDeterminista(2525);
  const tipos: TipoProducto[] = ['calcio', 'calcio', 'fosfato', 'colageno'];
  const resultado: ParticulaProducto[] = [];
  for (let i = 0; i < N_PARTICULAS_PRODUCTOS; i++) {
    const r = Math.sqrt(azar()) * R_LAGUNA * 0.75;
    const angulo = Math.PI + azar() * Math.PI;
    const x = r * Math.cos(angulo);
    resultado.push({
      x,
      z: Math.min(-0.05, r * Math.sin(angulo)),
      destino: [x * 0.6 + (azar() - 0.5) * 1.2, CAPILAR.y - CAPILAR.radio - 0.04, CAPILAR.z + 0.12],
      desfase: azar(),
      tipo: tipos[i % tipos.length]!,
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Células de inversión y cuerpos apoptóticos
 * ----------------------------------------------------------------------------------------- */

export interface CelulaInversion {
  origen: Punto3;
  destino: Punto3;
  radio: number;
  orden: number;
}

/** Células mononucleares que llegan desde los lados del bloque hasta el borde de la laguna vacía. */
export function celulasInversion(): CelulaInversion[] {
  const azar = generadorDeterminista(6060);
  const resultado: CelulaInversion[] = [];
  for (let i = 0; i < N_INVERSION; i++) {
    const radio = R_PRECURSOR * (0.85 + 0.25 * azar());
    const lado = i % 2 === 0 ? 1 : -1;
    // Ángulos de la mitad trasera (z < 0): del lado +X entre 3π/2 y 2π, del lado -X entre π y 3π/2.
    const angulo =
      lado > 0
        ? 1.5 * Math.PI + 0.1 + azar() * 0.35 * Math.PI
        : Math.PI + 0.15 + azar() * 0.35 * Math.PI;
    const rDestino = R_SELLADO * (1.05 + 0.2 * azar());
    resultado.push({
      origen: [lado * (2.9 + azar() * 0.2), radio, -0.4 - azar() * 1.3],
      destino: [rDestino * Math.cos(angulo), radio, rDestino * Math.sin(angulo)],
      radio,
      orden: i / N_INVERSION,
    });
  }
  return resultado;
}

export interface Fragmento {
  /** Dirección unitaria en la que se desprende del centro de la célula. */
  direccion: Punto3;
  radio: number;
}

/** Cuerpos apoptóticos: se desprenden hacia arriba y hacia los lados. */
export function fragmentos(): Fragmento[] {
  const azar = generadorDeterminista(8080);
  const resultado: Fragmento[] = [];
  for (let i = 0; i < N_FRAGMENTOS; i++) {
    const angulo = (i / N_FRAGMENTOS) * DOS_PI + azar() * 0.5;
    const elevacion = 0.15 + azar() * 0.6;
    const dx = Math.cos(angulo) * Math.cos(elevacion);
    const dz = Math.sin(angulo) * Math.cos(elevacion);
    const dy = Math.sin(elevacion);
    resultado.push({ direccion: [dx, dy, dz], radio: 0.07 + azar() * 0.06 });
  }
  return resultado;
}
