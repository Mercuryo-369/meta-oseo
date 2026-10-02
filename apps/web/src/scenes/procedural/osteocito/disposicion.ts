/**
 * Disposición de la red lacuno-canalicular: dónde está cada osteocito, por dónde va cada dendrita (una línea
 * quebrada de `SEGMENTOS_DENDRITA` tramos), dónde se encuentran dos dendritas (unión comunicante), qué rutas
 * sigue la señal hacia la superficie, dónde flotan las partículas del líquido y las moléculas de esclerostina.
 * Lógica PURA: solo números, deterministas (misma semilla, misma disposición), sin three ni Vue, para poder
 * probarla y para que el dibujo no cambie entre cargas. `mallas.ts` convierte estos números en instancias.
 *
 * Convención: la célula 0 es la central; las demás son sus vecinas. Cada conexión entre dos células son DOS
 * medias dendritas (una desde cada célula) que se tocan en la unión comunicante, como en el dibujo del módulo.
 */
import { generadorDeterminista } from '../interpolacion';
import {
  BLOQUE,
  CENTRO_CELULA,
  CONDUCTO,
  CUERPO,
  N_CELULAS_SUPERFICIE,
  N_DENDRITAS_CENTRAL,
  N_DENDRITAS_VECINO,
  N_ESCLEROSTINA,
  N_PARTICULAS,
  N_VECINOS,
  SEGMENTOS_DENDRITA,
  Y_SUPERFICIE,
} from './estado';

export type Punto3 = readonly [number, number, number];

export interface Celula {
  /** 0 es la central. */
  indice: number;
  centro: Punto3;
  /** Tamaño relativo al cuerpo de la célula central. */
  escala: number;
  /** Giro del cuerpo alrededor de Z (radianes): el eje mayor sigue las laminillas, un poco inclinado. */
  giro: number;
}

export type DestinoDendrita = 'union' | 'capilar' | 'superficie' | 'libre';

export interface Dendrita {
  /** Célula de la que sale. */
  celula: number;
  /** `SEGMENTOS_DENDRITA + 1` puntos, del cuerpo de la célula hacia fuera. */
  puntos: readonly Punto3[];
  destino: DestinoDendrita;
  /** Índice de la unión comunicante en la que termina (solo con destino `union`). */
  union?: number;
}

export interface Union {
  punto: Punto3;
  /** Las dos células que se comunican. */
  celulas: readonly [number, number];
}

export interface RedLacunoCanalicular {
  celulas: readonly Celula[];
  dendritas: readonly Dendrita[];
  uniones: readonly Union[];
}

/** Partícula del líquido intersticial: viaja por una dendrita, con un desfase propio, hacia el conducto. */
export interface Particula {
  dendrita: number;
  /** Desfase (0 a 1) del recorrido. */
  desfase: number;
  /** +1 recorre la dendrita del cuerpo hacia fuera; -1 al revés. Siempre hacia el conducto (−X). */
  sentido: 1 | -1;
}

/** Molécula de esclerostina que sale de la célula central en una dirección fija, con su desfase. */
export interface Molecula {
  direccion: Punto3;
  desfase: number;
}

const DOS_PI = Math.PI * 2;

/** Límites interiores del bloque (con un margen) para que ninguna dendrita salga de la matriz. */
const LIMITES = {
  xMin: BLOQUE.centro[0] - BLOQUE.ancho / 2 + 0.15,
  xMax: BLOQUE.centro[0] + BLOQUE.ancho / 2 - 0.15,
  yMin: BLOQUE.centro[1] - BLOQUE.alto / 2 + 0.15,
  yMax: Y_SUPERFICIE - 0.05,
  zMin: -0.75,
  zMax: 0.55,
} as const;

/** Vecinos de la célula central: posiciones fijas dentro del bloque, lejos del conducto y de la superficie. */
const CENTROS_VECINOS: readonly Punto3[] = [
  [-1.7, 0.9, -0.2],
  [-1.5, -1.65, 0.15],
  [1.9, 0.75, -0.3],
  [2.2, -1.5, 0.1],
  [0.45, 1.4, -0.45],
  [-0.05, -1.95, -0.25],
  [-2.1, -0.3, -0.35],
  [2.8, -0.3, -0.4],
];

/** Pares de vecinos (índices 1 a N_VECINOS) que se comunican entre sí, además de con la central. */
const PARES_VECINOS: readonly (readonly [number, number])[] = [
  [1, 5],
  [5, 3],
  [1, 7],
  [7, 2],
  [2, 6],
  [6, 4],
  [4, 3],
  [3, 8],
  [8, 4],
];

/** Cuántas dendritas llegan a la superficie y al capilar desde cada célula (las demás no llegan). */
const A_SUPERFICIE: Readonly<Record<number, number>> = { 0: 2, 5: 2, 1: 1, 3: 1 };
const A_CAPILAR: Readonly<Record<number, number>> = { 0: 2, 7: 2, 2: 1, 1: 1 };

export function mezclarPunto(a: Punto3, b: Punto3, k: number): Punto3 {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function distancia(a: Punto3, b: Punto3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function normalizar(v: Punto3): Punto3 {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

/** Un vector perpendicular a `d`, unitario (para curvar las dendritas). */
function perpendicular(d: Punto3, azar: () => number): Punto3 {
  const ayuda: Punto3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  // Producto vectorial d × ayuda.
  const p: Punto3 = normalizar([
    d[1] * ayuda[2] - d[2] * ayuda[1],
    d[2] * ayuda[0] - d[0] * ayuda[2],
    d[0] * ayuda[1] - d[1] * ayuda[0],
  ]);
  // Y otro perpendicular a ambos, para girar la curvatura alrededor del eje.
  const q: Punto3 = [
    d[1] * p[2] - d[2] * p[1],
    d[2] * p[0] - d[0] * p[2],
    d[0] * p[1] - d[1] * p[0],
  ];
  const ang = azar() * DOS_PI;
  return normalizar([
    p[0] * Math.cos(ang) + q[0] * Math.sin(ang),
    p[1] * Math.cos(ang) + q[1] * Math.sin(ang),
    p[2] * Math.cos(ang) + q[2] * Math.sin(ang),
  ]);
}

function dentro(p: Punto3): Punto3 {
  return [
    Math.min(LIMITES.xMax, Math.max(LIMITES.xMin, p[0])),
    Math.min(LIMITES.yMax, Math.max(LIMITES.yMin, p[1])),
    Math.min(LIMITES.zMax, Math.max(LIMITES.zMin, p[2])),
  ];
}

/** Punto de la superficie del cuerpo de `celula` en la dirección `d` (elipsoide con los semiejes de CUERPO). */
export function puntoDeSalida(celula: Celula, d: Punto3): Punto3 {
  const u = normalizar(d);
  const k = celula.escala * 0.92;
  const denominador =
    Math.sqrt((u[0] / CUERPO.x) ** 2 + (u[1] / CUERPO.y) ** 2 + (u[2] / CUERPO.z) ** 2) || 1;
  const r = k / denominador;
  return [celula.centro[0] + u[0] * r, celula.centro[1] + u[1] * r, celula.centro[2] + u[2] * r];
}

/**
 * Línea quebrada de `SEGMENTOS_DENDRITA` tramos desde `desde` hasta `hasta`, curvada con una comba lateral de
 * amplitud `comba` (máxima a mitad de camino) para que no sea una recta perfecta.
 */
export function trazarDendrita(
  desde: Punto3,
  hasta: Punto3,
  comba: number,
  azar: () => number,
): Punto3[] {
  const d = normalizar([hasta[0] - desde[0], hasta[1] - desde[1], hasta[2] - desde[2]]);
  const lateral = perpendicular(d, azar);
  const puntos: Punto3[] = [];
  for (let k = 0; k <= SEGMENTOS_DENDRITA; k++) {
    const s = k / SEGMENTOS_DENDRITA;
    const base = mezclarPunto(desde, hasta, s);
    const c = comba * Math.sin(Math.PI * s);
    puntos.push(
      k === 0 || k === SEGMENTOS_DENDRITA
        ? base
        : dentro([base[0] + lateral[0] * c, base[1] + lateral[1] * c, base[2] + lateral[2] * c]),
    );
  }
  return puntos;
}

/** Punto de la pared del conducto de Havers más cercano a `p` (a la misma profundidad z, acotada). */
export function puntoDelConducto(p: Punto3): Punto3 {
  const ang = Math.atan2(p[1] - CONDUCTO.y, p[0] - CONDUCTO.x);
  const z = Math.min(LIMITES.zMax, Math.max(LIMITES.zMin, p[2]));
  return [
    CONDUCTO.x + CONDUCTO.radio * Math.cos(ang),
    CONDUCTO.y + CONDUCTO.radio * Math.sin(ang),
    z,
  ];
}

/** Las células de la red: la central y sus vecinas. */
export function celulasDeLaRed(): Celula[] {
  const azar = generadorDeterminista(2024);
  const celulas: Celula[] = [{ indice: 0, centro: CENTRO_CELULA, escala: 1, giro: 0.12 }];
  for (let i = 0; i < N_VECINOS; i++) {
    celulas.push({
      indice: i + 1,
      centro: CENTROS_VECINOS[i]!,
      escala: 0.78 + azar() * 0.14,
      giro: (azar() - 0.5) * 0.7,
    });
  }
  return celulas;
}

/**
 * La red completa. Cada conexión célula-célula genera una unión comunicante a medio camino (con un pequeño
 * desvío) y una media dendrita desde cada célula hasta ella; a la superficie y al conducto llegan dendritas
 * enteras; el resto de las dendritas de cada célula (hasta su cuota) son ramas libres, más cortas.
 */
export function redLacunoCanalicular(): RedLacunoCanalicular {
  const azar = generadorDeterminista(7331);
  const celulas = celulasDeLaRed();
  const dendritas: Dendrita[] = [];
  const uniones: Union[] = [];
  const cuota = (i: number) => (i === 0 ? N_DENDRITAS_CENTRAL : N_DENDRITAS_VECINO);
  const emitidas = celulas.map(() => 0);

  const conectar = (a: number, b: number): void => {
    const ca = celulas[a]!;
    const cb = celulas[b]!;
    const medio = mezclarPunto(ca.centro, cb.centro, 0.42 + azar() * 0.16);
    const union: Punto3 = dentro([
      medio[0] + (azar() - 0.5) * 0.3,
      medio[1] + (azar() - 0.5) * 0.3,
      medio[2] + (azar() - 0.5) * 0.2,
    ]);
    const indice = uniones.push({ punto: union, celulas: [a, b] }) - 1;
    for (const c of [ca, cb]) {
      const salida = puntoDeSalida(c, [
        union[0] - c.centro[0],
        union[1] - c.centro[1],
        union[2] - c.centro[2],
      ]);
      dendritas.push({
        celula: c.indice,
        puntos: trazarDendrita(salida, union, 0.05 + azar() * 0.1, azar),
        destino: 'union',
        union: indice,
      });
      emitidas[c.indice]!++;
    }
  };

  for (let i = 1; i <= N_VECINOS; i++) conectar(0, i);
  for (const [a, b] of PARES_VECINOS) conectar(a, b);

  for (const c of celulas) {
    for (let k = 0; k < (A_SUPERFICIE[c.indice] ?? 0); k++) {
      const destino: Punto3 = [
        c.centro[0] + (k - 0.5) * 0.9 + (azar() - 0.5) * 0.3,
        Y_SUPERFICIE - 0.04,
        Math.min(LIMITES.zMax, Math.max(LIMITES.zMin, c.centro[2] + (azar() - 0.5) * 0.3)),
      ];
      const salida = puntoDeSalida(c, [destino[0] - c.centro[0], destino[1] - c.centro[1], 0]);
      dendritas.push({
        celula: c.indice,
        puntos: trazarDendrita(salida, destino, 0.08 + azar() * 0.12, azar),
        destino: 'superficie',
      });
      emitidas[c.indice]!++;
    }
    for (let k = 0; k < (A_CAPILAR[c.indice] ?? 0); k++) {
      const objetivo: Punto3 = [
        CONDUCTO.x,
        CONDUCTO.y + (k - 0.5) * 0.5 + (azar() - 0.5) * 0.3,
        c.centro[2] + (azar() - 0.5) * 0.3,
      ];
      const destino = puntoDelConducto(objetivo);
      const salida = puntoDeSalida(c, [
        destino[0] - c.centro[0],
        destino[1] - c.centro[1],
        destino[2] - c.centro[2],
      ]);
      dendritas.push({
        celula: c.indice,
        puntos: trazarDendrita(salida, destino, 0.08 + azar() * 0.12, azar),
        destino: 'capilar',
      });
      emitidas[c.indice]!++;
    }
  }

  // Ramas libres hasta completar la cuota de cada célula: estrelladas, más cortas, dentro del bloque.
  for (const c of celulas) {
    const n = cuota(c.indice);
    let intentos = 0;
    while (emitidas[c.indice]! < n && intentos < 200) {
      intentos++;
      const ang = azar() * DOS_PI;
      const inclinacion = (azar() - 0.5) * 0.8;
      const d: Punto3 = normalizar([Math.cos(ang), Math.sin(ang), inclinacion]);
      const largo = (0.55 + azar() * 0.55) * (c.indice === 0 ? 1 : 0.8);
      const salida = puntoDeSalida(c, d);
      const fin = dentro([
        salida[0] + d[0] * largo,
        salida[1] + d[1] * largo,
        salida[2] + d[2] * largo,
      ]);
      // Que no se meta en el conducto ni en el cuerpo de otra célula.
      if (Math.hypot(fin[0] - CONDUCTO.x, fin[1] - CONDUCTO.y) < CONDUCTO.radio + 0.15) continue;
      if (celulas.some((o) => o.indice !== c.indice && distancia(o.centro, fin) < 0.55)) continue;
      if (distancia(salida, fin) < 0.3) continue;
      dendritas.push({
        celula: c.indice,
        puntos: trazarDendrita(salida, fin, 0.04 + azar() * 0.1, azar),
        destino: 'libre',
      });
      emitidas[c.indice]!++;
    }
  }

  return { celulas, dendritas, uniones };
}

/** Largo total de una línea quebrada. */
export function largoDe(puntos: readonly Punto3[]): number {
  let l = 0;
  for (let i = 1; i < puntos.length; i++) l += distancia(puntos[i - 1]!, puntos[i]!);
  return l;
}

/** Punto a la fracción `s` (0 a 1) del recorrido de una línea quebrada, por longitud de arco. */
export function puntoEn(puntos: readonly Punto3[], s: number): Punto3 {
  const total = largoDe(puntos);
  if (total <= 0 || puntos.length < 2) return puntos[0] ?? [0, 0, 0];
  let restante = Math.min(1, Math.max(0, s)) * total;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]!;
    const b = puntos[i]!;
    const l = distancia(a, b);
    if (restante <= l || i === puntos.length - 1)
      return mezclarPunto(a, b, l > 0 ? restante / l : 0);
    restante -= l;
  }
  return puntos[puntos.length - 1]!;
}

/**
 * Rutas de la señal hacia la superficie: desde la célula central, por una dendrita propia que llega a la
 * superficie, o por la unión con una vecina y la dendrita de esa vecina que sube a la superficie. Cada ruta es
 * una sola línea quebrada, de la célula central a la superficie.
 */
export function rutasDeMensaje(red: RedLacunoCanalicular): Punto3[][] {
  const rutas: Punto3[][] = [];
  for (const d of red.dendritas) {
    if (d.destino !== 'superficie') continue;
    if (d.celula === 0) {
      rutas.push([...d.puntos]);
      continue;
    }
    const indiceUnion = red.uniones.findIndex(
      (u) => u.celulas[0] === 0 && u.celulas[1] === d.celula,
    );
    if (indiceUnion < 0) continue;
    const ida = red.dendritas.find((x) => x.union === indiceUnion && x.celula === 0);
    const vuelta = red.dendritas.find((x) => x.union === indiceUnion && x.celula === d.celula);
    if (!ida || !vuelta) continue;
    rutas.push([...ida.puntos, ...[...vuelta.puntos].reverse().slice(1), ...d.puntos.slice(1)]);
  }
  return rutas;
}

/** Partículas del líquido repartidas por las dendritas; todas fluyen hacia el conducto (−X). */
export function particulasDeFlujo(red: RedLacunoCanalicular): Particula[] {
  const azar = generadorDeterminista(99);
  const lista: Particula[] = [];
  const n = red.dendritas.length;
  for (let i = 0; i < N_PARTICULAS; i++) {
    const dendrita = i % n;
    const p = red.dendritas[dendrita]!.puntos;
    const inicio = p[0]!;
    const fin = p[p.length - 1]!;
    lista.push({ dendrita, desfase: azar(), sentido: fin[0] <= inicio[0] ? 1 : -1 });
  }
  return lista;
}

/** Moléculas de esclerostina: salen de la célula central hacia arriba y a los lados, hacia la superficie. */
export function moleculasDeEsclerostina(): Molecula[] {
  const azar = generadorDeterminista(555);
  const lista: Molecula[] = [];
  for (let i = 0; i < N_ESCLEROSTINA; i++) {
    const ang = (i / N_ESCLEROSTINA) * Math.PI + (azar() - 0.5) * 0.4;
    lista.push({
      direccion: normalizar([
        Math.cos(ang) * 0.9,
        0.45 + Math.abs(Math.sin(ang)) * 0.8,
        (azar() - 0.5) * 0.6,
      ]),
      desfase: azar(),
    });
  }
  return lista;
}

/** Puntos de las integrinas sobre las dendritas de la célula central (dos por dendrita, en las pares). */
export function integrinasDeLaCentral(red: RedLacunoCanalicular): Punto3[] {
  const puntos: Punto3[] = [];
  red.dendritas.forEach((d, i) => {
    if (d.celula !== 0 || i % 2 === 1) return;
    puntos.push(puntoEn(d.puntos, 0.45), puntoEn(d.puntos, 0.82));
  });
  return puntos;
}

/** Posición x y z de las células de la superficie, repartidas a lo largo del bloque. */
export function celulasDeSuperficie(): { x: number; z: number; ancho: number }[] {
  const azar = generadorDeterminista(31);
  const lista: { x: number; z: number; ancho: number }[] = [];
  const desde = BLOQUE.centro[0] - BLOQUE.ancho / 2 + 0.45;
  const hasta = BLOQUE.centro[0] + BLOQUE.ancho / 2 - 0.45;
  for (let i = 0; i < N_CELULAS_SUPERFICIE; i++) {
    const x = desde + ((hasta - desde) * i) / (N_CELULAS_SUPERFICIE - 1);
    lista.push({ x, z: (azar() - 0.5) * 0.25, ancho: 0.62 + azar() * 0.1 });
  }
  return lista;
}
