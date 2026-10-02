/**
 * Disposición de las piezas repetidas de la escena de la vesícula de matriz: la ondulación de la membrana del
 * osteoblasto y sus enzimas, las fibrillas de colágeno del osteoide con su bandeo, las placas de mineral sobre
 * ellas, las proteínas de la membrana de la vesícula, los iones con su camino de entrada, el racimo de cristales,
 * las vesículas vecinas y las moléculas de pirofosfato. Lógica PURA: solo números, deterministas (misma semilla,
 * misma disposición), sin three ni Vue, para poder probarla y para que el dibujo no cambie entre cargas.
 * `mallas.ts` convierte estos números en instancias.
 *
 * Convención de ejes: las fibrillas van a lo largo de X, Y apunta hacia el osteoblasto y la cámara mira desde +Z.
 * Todo lo que va DENTRO del grupo de la vesícula (proteínas, iones, racimo) está en coordenadas locales con la
 * vesícula centrada en el origen y radio 1: la malla lo escala a `R_VESICULA`.
 */
import { fraccion, generadorDeterminista, mezclar, suave } from '../interpolacion';
import {
  DIRECCION_NUCLEACION,
  FIBRILLA_ANFITRIONA,
  FRACCION_HUECO,
  LARGO_FIBRILLA,
  MEMBRANA,
  N_CRISTALES_VESICULA,
  N_FIBRILLAS,
  N_IONES,
  N_VESICULAS_VECINAS,
  PERIODO_D,
  PLACA,
  R_FIBRILLA,
  R_VESICULA,
  X_VESICULA,
  Y_VESICULA_FINAL,
  Z_VESICULA,
} from './estado';

export type Vec3 = readonly [number, number, number];

export function grados(g: number): number {
  return (g * Math.PI) / 180;
}

function normalizar(v: Vec3): [number, number, number] {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

/** Dirección unitaria a partir de una elevación y un acimut en grados (acimut 0 mira a +Z, positivo hacia +X). */
export function direccion(elevacion: number, acimut: number): [number, number, number] {
  const el = grados(elevacion);
  const az = grados(acimut);
  return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
}

/** Gira `v` alrededor de Y el ángulo `yaw` (radianes). */
export function girarY(v: Vec3, yaw: number): [number, number, number] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

/* -------------------------------------------------------------------------------------------
 * Membrana del osteoblasto y sus enzimas
 * ----------------------------------------------------------------------------------------- */

/** Altura (Y, absoluta) de la membrana basal del osteoblasto en (x, z): una ondulación suave de dos frecuencias. */
export function alturaMembrana(x: number, z: number): number {
  const a = MEMBRANA.amplitud;
  return (
    MEMBRANA.y +
    a * 0.7 * Math.sin(x * 0.85 + 0.6) * Math.cos(z * 0.75 + 0.2) +
    a * 0.3 * Math.sin(x * 2.3 + z * 1.4 + 1.1)
  );
}

/** Punto de la membrana del que brota la vesícula. */
export function puntoDeGemacion(): [number, number, number] {
  return [X_VESICULA, alturaMembrana(X_VESICULA, Z_VESICULA), Z_VESICULA];
}

export type TipoEnzima = 'tnap' | 'enpp1' | 'ank';

export interface EnzimaMembrana {
  tipo: TipoEnzima;
  /** Centro (absoluto): colgando de la cara externa (inferior) de la membrana. */
  x: number;
  y: number;
  z: number;
  /** Tamaño (X, Y, Z). */
  sx: number;
  sy: number;
  sz: number;
}

/** Cuántas piezas de cada enzima se dibujan en la membrana del osteoblasto. */
export const N_ENZIMAS: Readonly<Record<TipoEnzima, number>> = { tnap: 30, enpp1: 6, ank: 5 };

/**
 * Enzimas ancladas a la cara externa de la membrana del osteoblasto, repartidas al azar (determinista) y lejos del
 * punto de gemación para no tapar la vesícula que brota. La TNAP es la más abundante; ENPP1 y ANK, pocas.
 */
export function enzimasDeMembrana(): EnzimaMembrana[] {
  const azar = generadorDeterminista(4101);
  const resultado: EnzimaMembrana[] = [];
  const tamano: Record<TipoEnzima, [number, number, number]> = {
    tnap: [0.26, 0.13, 0.2],
    enpp1: [0.3, 0.2, 0.24],
    ank: [0.18, 0.28, 0.18],
  };
  for (const tipo of ['tnap', 'enpp1', 'ank'] as const) {
    let puestas = 0;
    let intentos = 0;
    while (puestas < N_ENZIMAS[tipo] && intentos < 400) {
      intentos++;
      const x = (azar() - 0.5) * (MEMBRANA.ancho - 0.6);
      const z = (azar() - 0.5) * (MEMBRANA.fondo - 0.6);
      if (Math.hypot(x - X_VESICULA, z - Z_VESICULA) < 1.1) continue;
      const [sx, sy, sz] = tamano[tipo];
      resultado.push({ tipo, x, y: alturaMembrana(x, z) - sy / 2 - 0.02, z, sx, sy, sz });
      puestas++;
    }
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Fibrillas de colágeno del osteoide
 * ----------------------------------------------------------------------------------------- */

export interface Fibrilla {
  /** Centro del eje (absoluto). */
  x: number;
  y: number;
  z: number;
  /** Giro alrededor de Y (radianes): las fibrillas no son exactamente paralelas. */
  yaw: number;
  /** La que toca la vesícula. */
  anfitriona: boolean;
}

/** Las fibrillas del osteoide: la anfitriona bajo la vesícula y las demás en dos planos más abajo. Deterministas. */
export function fibrillasDelOsteoide(): Fibrilla[] {
  const base: readonly [number, number, number, number][] = [
    // [x, y, z, yaw en grados]
    [0, FIBRILLA_ANFITRIONA.y, FIBRILLA_ANFITRIONA.z, 0],
    [0.3, -0.75, -0.9, 6],
    [-0.2, -0.75, -2.4, -5],
    [0.2, -1.2, 2.3, 4],
    [-0.3, -1.7, -0.2, -7],
    [0.25, -1.7, -1.7, 5],
    [-0.15, -1.7, 1.3, 3],
    [0.1, -2.6, 0.6, -4],
    [-0.25, -2.6, -1.2, 6],
  ];
  return base.slice(0, N_FIBRILLAS).map(([x, y, z, yaw], i) => ({
    x,
    y,
    z,
    yaw: grados(yaw),
    anfitriona: i === 0,
  }));
}

export interface SegmentoBandeo {
  /** Centro del segmento a lo largo del eje de la fibrilla (local, 0 en el centro). */
  s: number;
  largo: number;
  /** Zona de hueco (más oscura y ligeramente más fina) o de solapamiento. */
  hueco: boolean;
}

/**
 * Bandeo de una fibrilla: periodos D consecutivos, cada uno con una zona de hueco (`FRACCION_HUECO` del periodo)
 * y una de solapamiento, recortados al largo de la fibrilla.
 */
export function segmentosDeBandeo(largo = LARGO_FIBRILLA): SegmentoBandeo[] {
  const resultado: SegmentoBandeo[] = [];
  const medio = largo / 2;
  const largoHueco = PERIODO_D * FRACCION_HUECO;
  for (let inicio = -medio; inicio < medio - 1e-9; inicio += PERIODO_D) {
    const tramos: [number, number, boolean][] = [
      [inicio, Math.min(medio, inicio + largoHueco), true],
      [Math.min(medio, inicio + largoHueco), Math.min(medio, inicio + PERIODO_D), false],
    ];
    for (const [a, b, hueco] of tramos) {
      if (b - a < 1e-6) continue;
      resultado.push({ s: (a + b) / 2, largo: b - a, hueco });
    }
  }
  return resultado;
}

/** Punto absoluto de la superficie de una fibrilla: `s` a lo largo del eje y `theta` alrededor de él (0 = arriba, hacia +Z positivo). */
export function puntoDeFibrilla(
  f: Fibrilla,
  s: number,
  theta: number,
  radio = R_FIBRILLA,
): [number, number, number] {
  const local: Vec3 = [s, radio * Math.cos(theta), radio * Math.sin(theta)];
  const [dx, dy, dz] = girarY(local, f.yaw);
  return [f.x + dx, f.y + dy, f.z + dz];
}

/* -------------------------------------------------------------------------------------------
 * Cristales sobre las fibrillas
 * ----------------------------------------------------------------------------------------- */

export interface CristalFibrilla {
  x: number;
  y: number;
  z: number;
  /** Giro de la fibrilla alrededor de Y (la placa sigue su eje). */
  yaw: number;
  /** Ángulo alrededor del eje de la fibrilla (0 arriba). */
  theta: number;
  /** Escala relativa. */
  escala: number;
  /** Distancia al punto de contacto entre la vesícula y su fibrilla: decide cuándo crece. */
  distancia: number;
}

/** Punto de contacto entre la vesícula y la fibrilla anfitriona: de ahí arranca la propagación. */
export function puntoDeContacto(): [number, number, number] {
  return [X_VESICULA, FIBRILLA_ANFITRIONA.y + R_FIBRILLA, Z_VESICULA];
}

/** Ángulos (grados, alrededor del eje) en los que se apoyan las placas: la mitad de arriba y de delante, la que se ve. */
const ANGULOS_PLACAS: readonly number[] = [-40, 12, 62];

/**
 * Placas de hidroxiapatita sobre las fibrillas: una en cada zona de hueco del bandeo, en tres ángulos, tangentes
 * a la superficie y alineadas con el eje. Algunas se saltan al azar para que el depósito se vea irregular.
 */
export function cristalesDeFibrillas(
  fibrillas: readonly Fibrilla[] = fibrillasDelOsteoide(),
): CristalFibrilla[] {
  const azar = generadorDeterminista(7307);
  const [cx, cy, cz] = puntoDeContacto();
  const resultado: CristalFibrilla[] = [];
  const medio = LARGO_FIBRILLA / 2;
  for (const f of fibrillas) {
    for (const seg of segmentosDeBandeo()) {
      if (!seg.hueco || Math.abs(seg.s) > medio - 0.3) continue;
      for (const anguloGrados of ANGULOS_PLACAS) {
        if (azar() < 0.28) continue;
        const theta = grados(anguloGrados + (azar() - 0.5) * 14);
        const [x, y, z] = puntoDeFibrilla(f, seg.s, theta, R_FIBRILLA + PLACA.grosor * 0.45);
        resultado.push({
          x,
          y,
          z,
          yaw: f.yaw,
          theta,
          escala: 0.8 + azar() * 0.35,
          distancia: Math.hypot(x - cx, y - cy, z - cz),
        });
      }
    }
  }
  return resultado;
}

/** Distancia a partir de la cual la propagación ya no llega (las placas más lejanas crecen al final). */
export const ALCANCE_PROPAGACION = 7;

/** Crecimiento (0 a 1) de una placa a la distancia `distancia` cuando la propagación vale `propagacion`. */
export function crecimientoDePlaca(distancia: number, propagacion: number): number {
  const inicio = 0.72 * Math.min(1, distancia / ALCANCE_PROPAGACION);
  return suave(fraccion(propagacion, inicio, inicio + 0.28));
}

/* -------------------------------------------------------------------------------------------
 * Proteínas de la membrana de la vesícula (coordenadas locales, radio 1)
 * ----------------------------------------------------------------------------------------- */

export type TipoProteinaVesicula = 'anexina' | 'pit' | 'tnap' | 'phospho1';

export interface ProteinaVesicula {
  tipo: TipoProteinaVesicula;
  /** Dirección unitaria desde el centro de la vesícula. */
  dir: [number, number, number];
  /** Distancia del centro al centro de la pieza (en radios). */
  radio: number;
  /** Radio y alto de la pieza (cilindro a lo largo de la dirección radial), en radios de la vesícula. */
  grosor: number;
  alto: number;
  /** Está en la mitad delantera (z > 0), la que se quita con el corte. */
  frente: boolean;
}

/** Elevación y acimut (grados) de cada proteína: lejos del sitio de nucleación (abajo y atrás), para que los iones crucen el lumen. */
const PROTEINAS: readonly [TipoProteinaVesicula, number, number][] = [
  ['anexina', 58, 35],
  ['anexina', 42, 150],
  ['anexina', 68, 250],
  ['anexina', 18, 205],
  ['anexina', 8, 75],
  ['anexina', 36, 320],
  ['pit', -2, 120],
  ['pit', -22, 45],
  ['pit', 24, 275],
  ['tnap', 30, 100],
  ['tnap', 74, 140],
  ['tnap', 12, 170],
  ['tnap', -30, 300],
  ['tnap', 48, 220],
  ['tnap', -12, 10],
  ['phospho1', 20, 60],
  ['phospho1', -10, 230],
  ['phospho1', 40, 290],
];

export function proteinasDeVesicula(): ProteinaVesicula[] {
  return PROTEINAS.map(([tipo, el, az]) => {
    const dir = direccion(el, az);
    const forma: Record<TipoProteinaVesicula, [radio: number, grosor: number, alto: number]> = {
      anexina: [1, 0.11, 0.24],
      pit: [1, 0.1, 0.22],
      tnap: [1.06, 0.13, 0.08],
      phospho1: [0.5, 0.1, 0.12],
    };
    const [radio, grosor, alto] = forma[tipo];
    return { tipo, dir, radio, grosor, alto, frente: dir[2] > 0 };
  });
}

/* -------------------------------------------------------------------------------------------
 * Iones y su camino de entrada (coordenadas locales, radio 1)
 * ----------------------------------------------------------------------------------------- */

export interface Ion {
  tipo: 'calcio' | 'fosfato';
  /** Punto de partida (fuera de la vesícula; para el fosfato de PHOSPHO1, junto a la enzima). */
  origen: [number, number, number];
  /** Punto de paso: el canal o el transportador en la membrana (o la propia PHOSPHO1). */
  paso: [number, number, number];
  /** Donde se acumula: la cara interna de la membrana, cerca del sitio de nucleación. */
  destino: [number, number, number];
  /** Cuánto tarda en arrancar (0 a 0,55 del avance de la entrada). */
  retardo: number;
}

/** Radio (en radios de la vesícula) al que se acumulan los iones y al que se forma el núcleo. */
export const R_ACUMULACION = 0.82;
export const R_NUCLEACION = 0.74;

/**
 * Iones que entran en la vesícula: el calcio por los canales de anexina; el fosfato, la mitad por PiT-1 desde
 * fuera y la otra mitad generado dentro por PHOSPHO1. Cada ion tiene su origen, su punto de paso y su destino
 * en la cara interna, sesgado hacia el sitio de nucleación. Deterministas.
 */
export function ionesDeVesicula(
  proteinas: readonly ProteinaVesicula[] = proteinasDeVesicula(),
): Ion[] {
  const azar = generadorDeterminista(5501);
  const anexinas = proteinas.filter((p) => p.tipo === 'anexina');
  const pits = proteinas.filter((p) => p.tipo === 'pit');
  const phospho = proteinas.filter((p) => p.tipo === 'phospho1');
  const d0 = DIRECCION_NUCLEACION;
  const resultado: Ion[] = [];

  const destino = (): [number, number, number] => {
    const v = normalizar([
      d0[0] + (azar() - 0.5) * 1.3,
      d0[1] + (azar() - 0.5) * 1.3,
      d0[2] + (azar() - 0.5) * 1.3,
    ]);
    return [v[0] * R_ACUMULACION, v[1] * R_ACUMULACION, v[2] * R_ACUMULACION];
  };
  const desdeFuera = (tipo: Ion['tipo'], p: ProteinaVesicula): Ion => {
    const [dx, dy, dz] = p.dir;
    const dispersion = () => (azar() - 0.5) * 0.5;
    return {
      tipo,
      origen: [dx * 1.9 + dispersion(), dy * 1.9 + dispersion(), dz * 1.9 + dispersion()],
      paso: [dx * 1.0, dy * 1.0, dz * 1.0],
      destino: destino(),
      retardo: azar() * 0.55,
    };
  };

  for (let i = 0; i < N_IONES.calcio; i++) {
    resultado.push(desdeFuera('calcio', anexinas[i % anexinas.length]!));
  }
  for (let i = 0; i < N_IONES.fosfato; i++) {
    if (i % 2 === 0) {
      resultado.push(desdeFuera('fosfato', pits[(i / 2) % pits.length]!));
    } else {
      const p = phospho[((i - 1) / 2) % phospho.length]!;
      const centro: [number, number, number] = [
        p.dir[0] * p.radio,
        p.dir[1] * p.radio,
        p.dir[2] * p.radio,
      ];
      const junto: [number, number, number] = [
        centro[0] + (azar() - 0.5) * 0.16,
        centro[1] + (azar() - 0.5) * 0.16,
        centro[2] + (azar() - 0.5) * 0.16,
      ];
      resultado.push({
        tipo: 'fosfato',
        origen: junto,
        paso: junto,
        destino: destino(),
        retardo: azar() * 0.55,
      });
    }
  }
  return resultado;
}

/**
 * Posición (local) de un ion para un avance de la entrada `entrada` (0 a 1) y un apretado del cúmulo `cumulo`
 * (0 a 1). Del origen al punto de paso y de ahí al destino, con arranque y frenado suaves; después, el cúmulo lo
 * lleva hacia el sitio de nucleación. Función pura; escribe en `salida`.
 */
export function posicionDeIon(
  ion: Ion,
  entrada: number,
  cumulo: number,
  salida: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  const p = fraccion(entrada, ion.retardo, ion.retardo + 0.45);
  const d0 = DIRECCION_NUCLEACION;
  for (let k = 0; k < 3; k++) {
    const libre =
      p < 0.5
        ? mezclar(ion.origen[k]!, ion.paso[k]!, suave(p * 2))
        : mezclar(ion.paso[k]!, ion.destino[k]!, suave((p - 0.5) * 2));
    // El sitio de nucleación comprime el destino hacia la dirección de nucleación.
    const sitio = d0[k]! * R_NUCLEACION + (ion.destino[k]! - d0[k]! * R_ACUMULACION) * 0.22;
    salida[k] = mezclar(libre, sitio, cumulo);
  }
  return salida;
}

/* -------------------------------------------------------------------------------------------
 * Racimo de cristales de la vesícula (coordenadas locales, radio 1)
 * ----------------------------------------------------------------------------------------- */

export interface CristalVesicula {
  /** Punto de anclaje en la cara interna de la membrana. */
  anclaje: [number, number, number];
  /** Dirección unitaria de crecimiento (hacia fuera). */
  dir: [number, number, number];
  /** Normal unitaria de la cara ancha de la placa (perpendicular a `dir`). */
  normal: [number, number, number];
  /** Alto y grosor de la placa (en radios de la vesícula). */
  alto: number;
  grosor: number;
}

/** Largo máximo (en radios) del primer cristal y del resto del racimo: sobresalen de la membrana (radio 1). */
export const LARGO_CRISTAL = { primero: 0.9, resto: 0.95 } as const;

/**
 * El racimo: el primer cristal sigue la dirección de nucleación desde la cara interna; los demás salen del mismo
 * sitio abiertos en abanico. Cada placa gira alrededor de su eje un ángulo distinto. Deterministas.
 */
export function cristalesDeVesicula(): CristalVesicula[] {
  const azar = generadorDeterminista(8803);
  const d0 = DIRECCION_NUCLEACION;
  const resultado: CristalVesicula[] = [];
  for (let i = 0; i < N_CRISTALES_VESICULA; i++) {
    const apertura = i === 0 ? 0 : 0.5;
    const dir = normalizar([
      d0[0] + (azar() - 0.5) * apertura,
      d0[1] + (azar() - 0.5) * apertura,
      d0[2] + (azar() - 0.5) * apertura,
    ]);
    // Una perpendicular cualquiera a `dir`, girada un ángulo al azar alrededor de él.
    const auxiliar: Vec3 = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = normalizar(cruz(auxiliar, dir));
    const v = cruz(dir, u);
    const rodadura = azar() * Math.PI;
    const normal = normalizar([
      u[0] * Math.cos(rodadura) + v[0] * Math.sin(rodadura),
      u[1] * Math.cos(rodadura) + v[1] * Math.sin(rodadura),
      u[2] * Math.cos(rodadura) + v[2] * Math.sin(rodadura),
    ]);
    const desvio = i === 0 ? 0 : 0.08;
    resultado.push({
      anclaje: [
        d0[0] * R_NUCLEACION + (azar() - 0.5) * desvio,
        d0[1] * R_NUCLEACION + (azar() - 0.5) * desvio,
        d0[2] * R_NUCLEACION + (azar() - 0.5) * desvio,
      ],
      dir,
      normal,
      alto: i === 0 ? 0.3 : 0.18 + azar() * 0.08,
      grosor: 0.04,
    });
  }
  return resultado;
}

function cruz(a: Vec3, b: Vec3): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Largo (en radios) de la placa `i` del racimo para un primer cristal `cristal` y una ruptura `ruptura` (0 a 1). */
export function largoDeCristal(i: number, cristal: number, ruptura: number): number {
  if (i === 0) return LARGO_CRISTAL.primero * (0.3 * cristal + 0.7 * ruptura);
  const arranque = fraccion(cristal, 0.6, 1);
  return LARGO_CRISTAL.resto * (0.35 * arranque + 0.65 * ruptura);
}

/* -------------------------------------------------------------------------------------------
 * Vesículas vecinas (coordenadas absolutas)
 * ----------------------------------------------------------------------------------------- */

export interface VesiculaVecina {
  x: number;
  y: number;
  z: number;
  radio: number;
}

/** Otras vesículas apoyadas sobre otras fibrillas, a distintas alturas del eje X. Deterministas. */
export function vesiculasVecinas(
  fibrillas: readonly Fibrilla[] = fibrillasDelOsteoide(),
): VesiculaVecina[] {
  const sitios: readonly [fibrilla: number, s: number, radio: number][] = [
    [2, -3.3, 0.55],
    [4, 2.7, 0.5],
    [6, -1.8, 0.48],
    [8, 3.5, 0.52],
  ];
  return sitios.slice(0, N_VESICULAS_VECINAS).map(([indice, s, radio]) => {
    const f = fibrillas[Math.min(indice, fibrillas.length - 1)]!;
    const [x, y, z] = puntoDeFibrilla(f, s, 0, R_FIBRILLA + radio);
    return { x, y, z, radio };
  });
}

export interface CristalVecina {
  /** Índice de la vesícula vecina. */
  vesicula: number;
  /** Anclaje (absoluto) y dirección unitaria de crecimiento. */
  anclaje: [number, number, number];
  dir: [number, number, number];
  /** Largo final (absoluto). */
  largo: number;
}

/** Cuatro cristales por vesícula vecina, saliendo hacia abajo y a los lados, hacia su fibrilla. */
export function cristalesDeVecinas(
  vecinas: readonly VesiculaVecina[] = vesiculasVecinas(),
): CristalVecina[] {
  const azar = generadorDeterminista(9901);
  const resultado: CristalVecina[] = [];
  vecinas.forEach((v, indice) => {
    for (let k = 0; k < 4; k++) {
      const dir = normalizar([(azar() - 0.5) * 1.2, -0.6 - azar() * 0.5, (azar() - 0.5) * 1.2]);
      resultado.push({
        vesicula: indice,
        anclaje: [
          v.x + dir[0] * v.radio * 0.6,
          v.y + dir[1] * v.radio * 0.6,
          v.z + dir[2] * v.radio * 0.6,
        ],
        dir,
        largo: v.radio * (0.75 + azar() * 0.3),
      });
    }
  });
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Pirofosfato
 * ----------------------------------------------------------------------------------------- */

export interface PpiSobreCristal {
  x: number;
  y: number;
  z: number;
  /** Giro alrededor de Y: la molécula se tumba a lo largo de la placa. */
  yaw: number;
}

/** Cuántas moléculas de PPi se pegan a los cristales de las fibrillas cerca de la vesícula. */
export const N_PPI_CRISTALES = 16;

/** Moléculas de PPi adsorbidas a la cara externa de las placas más cercanas a la vesícula. Deterministas. */
export function ppiSobreCristales(
  cristales: readonly CristalFibrilla[] = cristalesDeFibrillas(),
): PpiSobreCristal[] {
  const cercanos = cristales
    .filter((c) => c.distancia < 2.6)
    .sort((a, b) => a.distancia - b.distancia);
  const resultado: PpiSobreCristal[] = [];
  const paso = Math.max(1, Math.floor(cercanos.length / N_PPI_CRISTALES));
  for (let i = 0; i < cercanos.length && resultado.length < N_PPI_CRISTALES; i += paso) {
    const c = cercanos[i]!;
    // Normal de la cara externa: radial a la fibrilla, girada con ella.
    const [nx, ny, nz] = girarY([0, Math.cos(c.theta), Math.sin(c.theta)], c.yaw);
    const saliente = PLACA.grosor / 2 + 0.035;
    resultado.push({
      x: c.x + nx * saliente,
      y: c.y + ny * saliente,
      z: c.z + nz * saliente,
      yaw: c.yaw,
    });
  }
  return resultado;
}

/** PPi pegadas a las caras de las placas del racimo de la vesícula (coordenadas locales, radio 1). */
export function ppiSobreRacimo(
  cristales: readonly CristalVesicula[] = cristalesDeVesicula(),
): { x: number; y: number; z: number; dir: [number, number, number] }[] {
  const azar = generadorDeterminista(1213);
  return cristales.slice(0, 5).map((c, i) => {
    const largo = largoDeCristal(i, 1, 1);
    const a = 0.55 + azar() * 0.35;
    const lado = azar() < 0.5 ? 1 : -1;
    const saliente = c.grosor / 2 + 0.05;
    return {
      x: c.anclaje[0] + c.dir[0] * largo * a + c.normal[0] * saliente * lado,
      y: c.anclaje[1] + c.dir[1] * largo * a + c.normal[1] * saliente * lado,
      z: c.anclaje[2] + c.dir[2] * largo * a + c.normal[2] * saliente * lado,
      dir: c.dir,
    };
  });
}

export interface SitioHidrolisis {
  /** Centro de la molécula de PPi bajo una TNAP de la membrana del osteoblasto (absoluto). */
  x: number;
  y: number;
  z: number;
}

/** Cuántas TNAP de la membrana se ven cortando PPi, y cuántas PPi esperan junto a ENPP1. */
export const N_HIDROLISIS = 4;
export const N_PPI_ENPP1 = 3;

/** Sitios de hidrólisis: bajo cuatro TNAP de la membrana del osteoblasto, repartidas por el ancho. */
export function sitiosDeHidrolisis(
  enzimas: readonly EnzimaMembrana[] = enzimasDeMembrana(),
): SitioHidrolisis[] {
  const tnap = enzimas.filter((e) => e.tipo === 'tnap').sort((a, b) => a.x - b.x);
  const resultado: SitioHidrolisis[] = [];
  for (let k = 0; k < N_HIDROLISIS && tnap.length > 0; k++) {
    const e = tnap[Math.floor(((k + 0.5) / N_HIDROLISIS) * tnap.length)]!;
    resultado.push({ x: e.x, y: e.y - e.sy / 2 - 0.12, z: e.z });
  }
  return resultado;
}

/** PPi recién formadas junto a las ENPP1 de la membrana (absolutas). */
export function ppiJuntoAEnpp1(
  enzimas: readonly EnzimaMembrana[] = enzimasDeMembrana(),
): SitioHidrolisis[] {
  return enzimas
    .filter((e) => e.tipo === 'enpp1')
    .slice(0, N_PPI_ENPP1)
    .map((e) => ({ x: e.x + 0.05, y: e.y - e.sy / 2 - 0.14, z: e.z + 0.05 }));
}

/**
 * Separación (absoluta) entre los dos fosfatos de una PPi que la TNAP está cortando, y cuánto se han vuelto ya
 * fosfato libre (0 a 1), para una hidrólisis `hidrolisis` (0 a 1).
 */
export function corteDePpi(hidrolisis: number): { separacion: number; libre: number } {
  const k = suave(hidrolisis);
  return { separacion: mezclar(0.05, 0.3, k), libre: suave(fraccion(hidrolisis, 0.35, 0.8)) };
}

/** Posición final (absoluta) del centro de la vesícula, útil para las pruebas de contacto con la fibrilla. */
export function centroFinalDeVesicula(): [number, number, number] {
  return [X_VESICULA, Y_VESICULA_FINAL, Z_VESICULA];
}

/** Radio efectivo del hueco de la escena para las pruebas: nada del racimo sobresale más de `R_VESICULA` * (1 + largo). */
export function alcanceDelRacimo(): number {
  return R_VESICULA * (R_NUCLEACION + Math.max(LARGO_CRISTAL.primero, LARGO_CRISTAL.resto));
}
