/**
 * Disposición de las piezas repetidas de la escena de la matriz ósea (fibras de cada laminilla, moléculas de
 * tropocolágeno de la fibrilla, huecos, cristales de hidroxiapatita, proteínas no colágenas, fibrillas vecinas
 * y flechas de carga). Lógica PURA: solo números, deterministas (misma semilla, misma disposición), sin three
 * ni Vue, para poder probarla y para que el dibujo no cambie entre cargas. `mallas.ts` convierte estos números
 * en mallas.
 *
 * Convención de ejes: la fibrilla y las fibras "de referencia" van a lo largo de X; la cámara mira desde +Z.
 * La fibrilla se dibuja ABIERTA: solo su mitad trasera (z <= 0), así el plano z = 0 queda de frente a la cámara
 * y en él se lee el escalonado de las moléculas y sus huecos como en el dibujo `m1_matriz_composicion.svg`.
 */
import { generadorDeterminista } from '../interpolacion';
import {
  ANGULOS_FIBRAS,
  LAMINILLA,
  LARGO_FIBRILLA,
  LARGO_HUECO,
  LARGO_MOLECULA,
  N_FIBRILLAS_VECINAS,
  PASO_FILA,
  PERIODO_D,
  R_FIBRILLA,
  SEPARACION_FIBRAS,
  SEPARACION_MOLECULAS,
  SEPARACION_VECINAS,
  Z_FIBRILLAS_VECINAS,
} from './estado';

export function grados(g: number): number {
  return (g * Math.PI) / 180;
}

/* -------------------------------------------------------------------------------------------
 * Fibras de colágeno de cada laminilla ampliada
 * ----------------------------------------------------------------------------------------- */

export interface FibraLaminilla {
  /** Centro del segmento en el plano de la laminilla (X, Z). */
  x: number;
  z: number;
  /** Largo del segmento, ya recortado a la huella de la laminilla. */
  largo: number;
  /** Ángulo (radianes) respecto a X. */
  angulo: number;
  /** Distancia perpendicular al centro de la laminilla (0 en la fibra central). */
  desvio: number;
}

/**
 * Fibras paralelas que llenan la huella rectangular de una laminilla (`ancho` por `fondo`, centrada en el
 * origen) con la dirección `anguloGrados`. Cada fibra es la recta `n · desvío + d · s` recortada al rectángulo
 * (Liang-Barsky), de modo que ninguna sobresale. Deterministas y sin azar.
 */
export function fibrasDeLaminilla(
  anguloGrados: number,
  ancho: number = LAMINILLA.ancho,
  fondo: number = LAMINILLA.fondo,
  separacion = SEPARACION_FIBRAS,
): FibraLaminilla[] {
  const angulo = grados(anguloGrados);
  const dx = Math.cos(angulo);
  const dz = Math.sin(angulo);
  const nx = -dz;
  const nz = dx;
  const alcance = Math.hypot(ancho, fondo) / 2;
  const resultado: FibraLaminilla[] = [];
  const pasos = Math.floor(alcance / separacion);
  for (let k = -pasos; k <= pasos; k++) {
    const desvio = k * separacion;
    const px = nx * desvio;
    const pz = nz * desvio;
    // Parámetros s de entrada y salida del rectángulo.
    let s0 = -Infinity;
    let s1 = Infinity;
    for (const [p, d, medio] of [
      [px, dx, ancho / 2],
      [pz, dz, fondo / 2],
    ] as const) {
      if (Math.abs(d) < 1e-9) {
        if (Math.abs(p) > medio) {
          s0 = Infinity;
        }
        continue;
      }
      const a = (-medio - p) / d;
      const b = (medio - p) / d;
      s0 = Math.max(s0, Math.min(a, b));
      s1 = Math.min(s1, Math.max(a, b));
    }
    const largo = s1 - s0;
    if (!Number.isFinite(largo) || largo < 0.35) continue;
    const s = (s0 + s1) / 2;
    resultado.push({ x: px + dx * s, z: pz + dz * s, largo, angulo, desvio });
  }
  return resultado;
}

/**
 * Huella de la laminilla `i` (0 = la de abajo) en el corte "en escalera": cada laminilla de encima se queda solo
 * con la parte trasera, así las de abajo asoman como peldaños y se ve la dirección de las fibras de cada una.
 */
export function huellaDeLaminilla(i: number): { fondo: number; zCentro: number } {
  const fondo = LAMINILLA.fondo * (1 - 0.3 * i);
  return { fondo, zCentro: -(LAMINILLA.fondo - fondo) / 2 };
}

/** Las fibras de las `ANGULOS_FIBRAS.length` laminillas ampliadas, con el índice de su laminilla y su huella en escalera. */
export function fibrasDeLaminillas(): (FibraLaminilla & { laminilla: number })[] {
  return ANGULOS_FIBRAS.flatMap((angulo, laminilla) => {
    const { fondo, zCentro } = huellaDeLaminilla(laminilla);
    return fibrasDeLaminilla(angulo, LAMINILLA.ancho, fondo).map((f) => ({
      ...f,
      z: f.z + zCentro,
      laminilla,
    }));
  });
}

/* -------------------------------------------------------------------------------------------
 * Moléculas de tropocolágeno de la fibrilla (modelo de Hodge-Petruska)
 * ----------------------------------------------------------------------------------------- */

export interface PosicionReticula {
  y: number;
  z: number;
  /** Fila (índice en Y) de la retícula: decide el desfase de sus moléculas. */
  fila: number;
  /** Está en el plano de corte (z = 0), de frente a la cámara. */
  frente: boolean;
}

/**
 * Posiciones (Y, Z) de las moléculas en la sección de la fibrilla: retícula hexagonal de paso
 * `SEPARACION_MOLECULAS` dentro del círculo de radio `R_FIBRILLA`, solo la mitad trasera (z <= 0). Las filas
 * pares e impares van desplazadas medio paso en Y, como en un empaquetamiento compacto.
 */
export function posicionesDeReticula(): PosicionReticula[] {
  const s = SEPARACION_MOLECULAS;
  const pasoZ = (s * Math.sqrt(3)) / 2;
  const resultado: PosicionReticula[] = [];
  const filasZ = Math.floor(R_FIBRILLA / pasoZ);
  for (let iz = 0; iz <= filasZ; iz++) {
    const z = -iz * pasoZ;
    const desfaseY = iz % 2 === 0 ? 0 : s / 2;
    const filasY = Math.ceil(R_FIBRILLA / s) + 1;
    for (let iy = -filasY; iy <= filasY; iy++) {
      const y = iy * s + desfaseY;
      if (Math.hypot(y, z) > R_FIBRILLA - s * 0.35) continue;
      resultado.push({ y, z, fila: iy, frente: iz === 0 });
    }
  }
  return resultado;
}

/** Desfase axial de la fila `fila`: cada fila va un periodo D por delante de la anterior (escalonado en cuarto de periodo). */
export function desfaseDeFila(fila: number): number {
  return ((((fila % 5) + 5) % 5) * PERIODO_D) % PASO_FILA;
}

export interface Molecula {
  /** Centro del bastón (a lo largo de X) y su largo, ya recortado a la fibrilla. */
  x: number;
  y: number;
  z: number;
  largo: number;
  fila: number;
  frente: boolean;
}

/** Recorta el intervalo [a, b] al largo de la fibrilla; `null` si queda demasiado corto. */
function recortar(a: number, b: number, minimo: number): { x: number; largo: number } | null {
  const medio = LARGO_FIBRILLA / 2;
  const a2 = Math.max(a, -medio);
  const b2 = Math.min(b, medio);
  const largo = b2 - a2;
  if (largo < minimo) return null;
  return { x: (a2 + b2) / 2, largo };
}

/**
 * Todas las moléculas de la fibrilla: en cada posición de la retícula, bastones de largo `LARGO_MOLECULA`
 * separados por un hueco de `LARGO_HUECO`, con el desfase de su fila. Deterministas.
 */
export function moleculasDeFibrilla(): Molecula[] {
  const resultado: Molecula[] = [];
  const medio = LARGO_FIBRILLA / 2;
  for (const p of posicionesDeReticula()) {
    const desfase = desfaseDeFila(p.fila);
    for (let inicio = -medio - PASO_FILA + desfase; inicio < medio; inicio += PASO_FILA) {
      const tramo = recortar(inicio, inicio + LARGO_MOLECULA, 0.22);
      if (!tramo) continue;
      resultado.push({
        x: tramo.x,
        y: p.y,
        z: p.z,
        largo: tramo.largo,
        fila: p.fila,
        frente: p.frente,
      });
    }
  }
  return resultado;
}

export interface Hueco {
  x: number;
  y: number;
  z: number;
}

/**
 * Los huecos a la vista: en cada fila del plano de corte (z = 0), el espacio entre el final de una molécula y
 * el principio de la siguiente, siempre que quepa entero dentro de la fibrilla.
 */
export function huecosDeFibrilla(): Hueco[] {
  const resultado: Hueco[] = [];
  const medio = LARGO_FIBRILLA / 2;
  for (const p of posicionesDeReticula()) {
    if (!p.frente) continue;
    const desfase = desfaseDeFila(p.fila);
    for (let inicio = -medio - PASO_FILA + desfase; inicio < medio; inicio += PASO_FILA) {
      const a = inicio + LARGO_MOLECULA;
      const b = a + LARGO_HUECO;
      if (a < -medio + 0.05 || b > medio - 0.05) continue;
      resultado.push({ x: (a + b) / 2, y: p.y, z: 0 });
    }
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Cristales de hidroxiapatita
 * ----------------------------------------------------------------------------------------- */

export interface Cristal {
  x: number;
  y: number;
  z: number;
  /** Giro alrededor de X (radianes): la cara ancha de la placa mira hacia fuera de la fibrilla. */
  giro: number;
  /** Escala relativa (0,8 a 1,15). */
  escala: number;
  /** Nació en un hueco del plano de corte (los demás recubren la superficie de la fibrilla). */
  enHueco: boolean;
}

/** Tamaño de una placa de hidroxiapatita, en unidades de escena (largo en X, alto, grosor). Proporción real ~50 x 25 x 3 nm. */
export const PLACA = { largo: 0.46, alto: 0.2, grosor: 0.035 } as const;

/**
 * Cristales: uno por cada hueco a la vista (centrado en él, con la cara hacia la cámara) y otros repartidos
 * por la superficie trasera de la fibrilla, tangentes a ella y alineados con su eje, "a lo largo de la
 * fibrilla". Deterministas.
 */
export function cristalesDeFibrilla(): Cristal[] {
  const azar = generadorDeterminista(6701);
  const resultado: Cristal[] = huecosDeFibrilla().map((h) => ({
    x: h.x + (azar() - 0.5) * 0.04,
    y: h.y,
    z: h.z + PLACA.grosor * 0.6,
    giro: 0,
    escala: 0.9 + azar() * 0.2,
    enHueco: true,
  }));
  // Sobre la superficie curva de la mitad trasera: ángulos entre 190° y 350° (medidos desde +Y hacia -Z).
  const medio = LARGO_FIBRILLA / 2;
  const columnas = 11;
  const anillos = 7;
  for (let i = 0; i < anillos; i++) {
    const theta = grados(196 + (i / (anillos - 1)) * 148);
    // Centro de cada placa ligeramente por fuera de la superficie.
    const r = R_FIBRILLA + PLACA.grosor * 0.4;
    const y = r * Math.cos(theta);
    const z = r * Math.sin(theta);
    // Las columnas siguen el escalonado: un cuarto de paso más adelante en cada anillo.
    const desfase = (i % 4) * (PASO_FILA / 4);
    for (let j = 0; j < columnas; j++) {
      const x = -medio + 0.45 + desfase + j * (PASO_FILA / 2) + (azar() - 0.5) * 0.08;
      if (x < -medio + 0.3 || x > medio - 0.3) continue;
      if (azar() < 0.22) continue;
      resultado.push({
        x,
        y,
        z,
        // La placa se construye con la cara ancha mirando a +Z; girada -θ + 90° mira en dirección radial.
        giro: theta - Math.PI / 2,
        escala: 0.8 + azar() * 0.35,
        enHueco: false,
      });
    }
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Proteínas no colágenas
 * ----------------------------------------------------------------------------------------- */

export interface Proteina {
  x: number;
  y: number;
  z: number;
  /** 0 osteocalcina, 1 osteopontina, 2 osteonectina (solo cambia el color). */
  tipo: 0 | 1 | 2;
  radio: number;
}

/** Cuántas proteínas se dibujan (son pocas: regulan, no forman la masa de la matriz). */
export const N_PROTEINAS = 18;

/**
 * Proteínas no colágenas pegadas a cristales: se elige un cristal cada tantos y la proteína se apoya sobre su
 * cara externa (hacia la cámara en el plano de corte; radial en la superficie). Deterministas.
 */
export function proteinasDeFibrilla(
  cristales: readonly Cristal[] = cristalesDeFibrilla(),
): Proteina[] {
  const azar = generadorDeterminista(9109);
  const resultado: Proteina[] = [];
  if (cristales.length === 0) return resultado;
  const paso = Math.max(1, Math.floor(cristales.length / N_PROTEINAS));
  for (let i = 0; i < cristales.length && resultado.length < N_PROTEINAS; i += paso) {
    const c =
      cristales[Math.min(cristales.length - 1, i + Math.floor(azar() * Math.min(paso, 3)))]!;
    const radio = 0.075 + azar() * 0.03;
    const saliente = PLACA.grosor / 2 + radio * 0.85;
    // Dirección de la cara externa de la placa: +Z girado `giro` alrededor de X.
    const ny = -Math.sin(c.giro);
    const nz = Math.cos(c.giro);
    resultado.push({
      x: c.x + (azar() - 0.5) * PLACA.largo * 0.5,
      y: c.y + ny * saliente,
      z: c.z + nz * saliente,
      tipo: (resultado.length % 3) as 0 | 1 | 2,
      radio,
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Fibrillas vecinas (la fibra abierta)
 * ----------------------------------------------------------------------------------------- */

export interface FibrillaVecina {
  y: number;
  z: number;
}

/**
 * Fibrillas sin detalle, en fila en un plano por detrás de la abierta (z = `Z_FIBRILLAS_VECINAS`): el resto de
 * la fibra, de la que la fibrilla del frente se ha "sacado" para abrirla. Ninguna tapa el plano de corte.
 */
export function fibrillasVecinas(): FibrillaVecina[] {
  const resultado: FibrillaVecina[] = [];
  for (let i = 0; i < N_FIBRILLAS_VECINAS; i++) {
    resultado.push({
      y: (i - (N_FIBRILLAS_VECINAS - 1) / 2) * SEPARACION_VECINAS,
      z: Z_FIBRILLAS_VECINAS,
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------------------------
 * Flechas de carga
 * ----------------------------------------------------------------------------------------- */

export interface Flecha {
  /** Punto de partida (la cola). */
  x: number;
  y: number;
  z: number;
  /** Dirección unitaria hacia la punta. */
  dx: number;
  dy: number;
  dz: number;
  largo: number;
  tipo: 'traccion' | 'compresion';
}

/** Largo de cada flecha. */
export const LARGO_FLECHA = 1.25;

/**
 * Flechas como en el dibujo `m1_matriz_composicion.svg`: dos de TRACCIÓN en los extremos del eje, hacia fuera
 * (el colágeno se tensa), y seis de COMPRESIÓN transversales, tres por arriba y tres por abajo, hacia dentro (el
 * mineral resiste). Con `estiramiento` (0 a 1) las de tracción se apartan un poco más de la fibrilla.
 */
export function flechasDeCarga(estiramiento = 0): Flecha[] {
  const medio = LARGO_FIBRILLA / 2;
  const holgura = 0.45 + 0.35 * estiramiento;
  const resultado: Flecha[] = [
    { x: medio + holgura, y: 0, z: 0, dx: 1, dy: 0, dz: 0, largo: LARGO_FLECHA, tipo: 'traccion' },
    {
      x: -medio - holgura,
      y: 0,
      z: 0,
      dx: -1,
      dy: 0,
      dz: 0,
      largo: LARGO_FLECHA,
      tipo: 'traccion',
    },
  ];
  const alto = R_FIBRILLA + 0.4 + LARGO_FLECHA;
  for (const x of [-2.1, 0, 2.1]) {
    resultado.push({
      x,
      y: alto,
      z: 0,
      dx: 0,
      dy: -1,
      dz: 0,
      largo: LARGO_FLECHA,
      tipo: 'compresion',
    });
    resultado.push({
      x,
      y: -alto,
      z: 0,
      dx: 0,
      dy: 1,
      dz: 0,
      largo: LARGO_FLECHA,
      tipo: 'compresion',
    });
  }
  return resultado;
}
