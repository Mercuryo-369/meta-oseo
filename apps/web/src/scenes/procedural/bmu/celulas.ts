/**
 * Células de la escena de la BMU: todas dibujadas con UN InstancedMesh de esferas de pocos polígonos (una
 * llamada de dibujo, color por instancia). Cada instancia es una esfera escalada y orientada sobre la
 * superficie del túnel: aplanada y clara para una célula de revestimiento, alta y violeta para un
 * osteoblasto, achatada con núcleos y un borde festoneado para un osteoclasto multinucleado.
 *
 * Reparto de las instancias (`INICIO_*`):
 *  - precursores de osteoclastos (mononucleares) que llegan del capilar y se fusionan;
 *  - osteoclastos: cuerpo, 3 núcleos y 8 lóbulos del borde festoneado cada uno;
 *  - células de la pared (revestimiento, inversión y osteoblastos) en una rejilla fija: cada celda mezcla
 *    el aspecto de los tres tipos según el estado, y aparece o desaparece según su "rango" (un número
 *    determinista de 0 a 1), de modo que la cobertura crece o decrece de forma continua y reversible.
 *
 * Todo sale del `EstadoBmu`: no hay animaciones acumuladas ni relojes. La "vibración" de los osteoclastos
 * viene ya calculada en el estado.
 */
import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import { acotar, generadorDeterminista, mezclar, suave } from '../interpolacion';
import { LARGO, N_OSTEOCLASTOS, N_PRECURSORES, R_CANAL, X_INICIO, radioExcavado } from './estado';
import type { EstadoBmu } from './estado';
import type { MallaHueso } from './malla';
import { HEX, lineal, mezclarRgb } from './paleta';
import type { Rgb } from './paleta';
import { SECTOR_FIN, SECTOR_INICIO, anguloDeFraccion } from './sector';

/** Celdas de la rejilla de la pared. */
const CELDAS_X = 20;
const CELDAS_FI = 9;
const NUCLEOS_POR_OSTEOCLASTO = 3;
const LOBULOS_POR_OSTEOCLASTO = 8;

const INICIO_PRECURSORES = 0;
const INICIO_CUERPOS = INICIO_PRECURSORES + N_PRECURSORES;
const INICIO_NUCLEOS = INICIO_CUERPOS + N_OSTEOCLASTOS;
const INICIO_LOBULOS = INICIO_NUCLEOS + N_OSTEOCLASTOS * NUCLEOS_POR_OSTEOCLASTO;
const INICIO_PARED = INICIO_LOBULOS + N_OSTEOCLASTOS * LOBULOS_POR_OSTEOCLASTO;
export const TOTAL_INSTANCIAS = INICIO_PARED + CELDAS_X * CELDAS_FI;

const COLOR = {
  precursor: lineal(HEX.precursor),
  cuerpoOc: lineal(HEX.osteoclasto),
  nucleo: lineal(HEX.nucleo),
  borde: lineal(HEX.bordeFestoneado),
  revestimiento: lineal(HEX.revestimiento),
  inversion: lineal(HEX.celulaInversion),
  osteoblasto: lineal(HEX.osteoblasto),
} as const;

/** Semiejes (tangente x, tangente fi, altura) de cada tipo de célula de la pared. */
const DIMENSIONES = {
  revestimiento: [0.24, 0.27, 0.05],
  inversion: [0.2, 0.2, 0.09],
  osteoblasto: [0.25, 0.27, 0.17],
} as const;

type V3 = [number, number, number];

/** Marco local sobre el perfil del túnel en (x, fi). */
interface Marco {
  /** Punto de la superficie. */
  p: V3;
  /** Tangente al perfil (sigue el eje X y la pendiente del radio). */
  t: V3;
  /** Tangente circunferencial. */
  f: V3;
  /** Normal que sale hacia el hueso (lejos del eje). */
  n: V3;
}

function marco(x: number, fi: number, radio: (x: number) => number): Marco {
  const d = 0.05;
  const pendiente = (radio(x + d) - radio(x - d)) / (2 * d);
  const r = radio(x);
  const c = Math.cos(fi);
  const s = Math.sin(fi);
  const norma = Math.hypot(1, pendiente);
  return {
    p: [x, r * c, r * s],
    t: [1 / norma, (pendiente * c) / norma, (pendiente * s) / norma],
    f: [0, -s, c],
    n: [-pendiente / norma, c / norma, s / norma],
  };
}

/** Rango determinista (0 a 0,75) de cada celda de la pared: decide en qué orden se cubre. */
const RANGOS = (() => {
  const azar = generadorDeterminista(20260924);
  return Array.from({ length: CELDAS_X * CELDAS_FI }, () => azar() * 0.75);
})();
const AZAR_CELDA = (() => {
  const azar = generadorDeterminista(7);
  return Array.from({ length: CELDAS_X * CELDAS_FI }, () => [azar(), azar(), azar()] as V3);
})();

const AUX_COLOR: Rgb = [0, 0, 0];
const AUX_COLOR_2: Rgb = [0, 0, 0];

export class CelulasBmu {
  readonly malla: InstancedMesh;
  private readonly geometria: SphereGeometry;
  private readonly material: MeshStandardMaterial;
  private readonly matrices: Float32Array;
  private readonly colores: Float32Array;

  constructor(private readonly hueso: MallaHueso) {
    this.geometria = new SphereGeometry(1, 9, 6);
    this.material = new MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0,
      emissive: '#3a3266',
      emissiveIntensity: 0.55,
    });
    this.malla = new InstancedMesh(this.geometria, this.material, TOTAL_INSTANCIAS);
    this.malla.instanceMatrix.setUsage(DynamicDrawUsage);
    this.colores = new Float32Array(TOTAL_INSTANCIAS * 3);
    this.malla.instanceColor = new InstancedBufferAttribute(this.colores, 3);
    this.malla.instanceColor.setUsage(DynamicDrawUsage);
    this.matrices = this.malla.instanceMatrix.array as Float32Array;
    // Las instancias se mueven por toda la escena: sin recorte por caja envolvente.
    this.malla.frustumCulled = false;
    this.malla.name = 'celulas_bmu';
  }

  /** Escribe la matriz (posición, ejes y semiejes) y el color de la instancia `i`. */
  private poner(
    i: number,
    p: V3,
    ex: V3,
    ey: V3,
    ez: V3,
    sx: number,
    sy: number,
    sz: number,
    color: Rgb,
  ): void {
    const m = this.matrices;
    const o = 16 * i;
    m[o] = ex[0] * sx;
    m[o + 1] = ex[1] * sx;
    m[o + 2] = ex[2] * sx;
    m[o + 3] = 0;
    m[o + 4] = ey[0] * sy;
    m[o + 5] = ey[1] * sy;
    m[o + 6] = ey[2] * sy;
    m[o + 7] = 0;
    m[o + 8] = ez[0] * sz;
    m[o + 9] = ez[1] * sz;
    m[o + 10] = ez[2] * sz;
    m[o + 11] = 0;
    m[o + 12] = p[0];
    m[o + 13] = p[1];
    m[o + 14] = p[2];
    m[o + 15] = 1;
    const c = 3 * i;
    this.colores[c] = color[0];
    this.colores[c + 1] = color[1];
    this.colores[c + 2] = color[2];
  }

  private ocultar(i: number): void {
    const o = 16 * i;
    for (let k = 0; k < 16; k++) this.matrices[o + k] = 0;
  }

  actualizar(estado: EstadoBmu): void {
    this.precursores(estado);
    this.osteoclastos(estado);
    this.pared(estado);
    this.malla.instanceMatrix.needsUpdate = true;
    if (this.malla.instanceColor) this.malla.instanceColor.needsUpdate = true;
  }

  private posicionOsteoclasto(estado: EstadoBmu, k: number): { x: number; fi: number } | null {
    const c = estado.osteoclastos.celulas[k];
    return c ? { x: c.x, fi: anguloDeFraccion(c.u) } : null;
  }

  private precursores(estado: EstadoBmu): void {
    const { cantidad, llegada, fusion } = estado.precursores;
    for (let i = 0; i < N_PRECURSORES; i++) {
      const indice = INICIO_PRECURSORES + i;
      if (cantidad === 0) {
        this.ocultar(indice);
        continue;
      }
      // Origen: junto al capilar (eje). Destino: la pared donde se abrirá el túnel. Después de la fusión,
      // cada pareja de precursores converge en el osteoclasto que forma.
      const par = Math.floor(i / 2);
      const orden = (i * 0.618034) % 1;
      const origen: V3 = [
        X_INICIO - 1.9 + 0.35 * i,
        0.2 * Math.cos(2.4 * i),
        0.2 * Math.sin(2.4 * i),
      ];
      const fi = anguloDeFraccion((par + 0.5) / (N_PRECURSORES / 2));
      const xDestino = X_INICIO - 0.55 - 0.42 * (i % 2) - 0.12 * par;
      const rDestino = R_CANAL - 0.02;
      const destino: V3 = [xDestino, rDestino * Math.cos(fi), rDestino * Math.sin(fi)];
      // Cada precursor sale en su momento (escalonados) sin salirse de [0, 1].
      const marcha = suave(acotar(llegada * 1.5 - orden * 0.5));
      const p: V3 = [
        mezclar(origen[0], destino[0], marcha),
        mezclar(origen[1], destino[1], marcha),
        mezclar(origen[2], destino[2], marcha),
      ];
      const oc = this.posicionOsteoclasto(estado, par);
      const f = suave(fusion);
      if (oc && f > 0) {
        const r = radioExcavado(oc.x, estado);
        p[0] = mezclar(p[0], oc.x, f);
        p[1] = mezclar(p[1], (r - 0.1) * Math.cos(oc.fi), f);
        p[2] = mezclar(p[2], (r - 0.1) * Math.sin(oc.fi), f);
      }
      const tamano = 0.13 * suave(llegada * 4) * (1 - suave(fusion));
      if (tamano < 0.005) {
        this.ocultar(indice);
        continue;
      }
      this.poner(
        indice,
        p,
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        tamano,
        tamano,
        tamano,
        COLOR.precursor,
      );
    }
  }

  private osteoclastos(estado: EstadoBmu): void {
    for (let k = 0; k < N_OSTEOCLASTOS; k++) {
      const c = estado.osteoclastos.celulas[k];
      const cuerpo = INICIO_CUERPOS + k;
      const nucleos = INICIO_NUCLEOS + k * NUCLEOS_POR_OSTEOCLASTO;
      const lobulos = INICIO_LOBULOS + k * LOBULOS_POR_OSTEOCLASTO;
      if (!c || c.escala < 0.02) {
        this.ocultar(cuerpo);
        for (let j = 0; j < NUCLEOS_POR_OSTEOCLASTO; j++) this.ocultar(nucleos + j);
        for (let j = 0; j < LOBULOS_POR_OSTEOCLASTO; j++) this.ocultar(lobulos + j);
        continue;
      }
      const fi = anguloDeFraccion(c.u);
      const radio = (x: number): number => radioExcavado(x, estado);
      const m = marco(c.x, fi, radio);
      // Al principio la cavidad es estrecha: la célula se ajusta a su tamaño para no salirse del conducto.
      const cavidad = suave((radio(c.x) - R_CANAL) / 0.6);
      const e = c.escala * (0.42 + 0.58 * cavidad);
      const semi: V3 = [0.64 * e, 0.6 * e, 0.36 * e];
      const centro: V3 = [
        m.p[0] - m.n[0] * semi[2] * 0.85,
        m.p[1] - m.n[1] * semi[2] * 0.85,
        m.p[2] - m.n[2] * semi[2] * 0.85,
      ];
      this.poner(cuerpo, centro, m.t, m.f, m.n, semi[0], semi[1], semi[2], COLOR.cuerpoOc);

      // Núcleos: esferas oscuras que asoman por la cara que mira a la luz del túnel.
      const desfases: readonly [number, number][] = [
        [-0.17, 0.02],
        [0.13, 0.19],
        [0.11, -0.2],
      ];
      for (let j = 0; j < NUCLEOS_POR_OSTEOCLASTO; j++) {
        const [dt, df] = desfases[j]!;
        const alto = -semi[2] * 0.72;
        const p: V3 = [
          centro[0] + m.t[0] * dt * e * 2 + m.f[0] * df * e * 2 + m.n[0] * alto,
          centro[1] + m.t[1] * dt * e * 2 + m.f[1] * df * e * 2 + m.n[1] * alto,
          centro[2] + m.t[2] * dt * e * 2 + m.f[2] * df * e * 2 + m.n[2] * alto,
        ];
        const nr = 0.115 * e;
        this.poner(nucleos + j, p, m.t, m.f, m.n, nr, nr, nr * 0.8, COLOR.nucleo);
      }

      // Borde festoneado: anillo de lóbulos en el lado que toca el hueso.
      for (let j = 0; j < LOBULOS_POR_OSTEOCLASTO; j++) {
        const a = (2 * Math.PI * j) / LOBULOS_POR_OSTEOCLASTO;
        const ct = Math.cos(a) * semi[0] * 0.92;
        const cf = Math.sin(a) * semi[1] * 0.92;
        const p: V3 = [
          centro[0] + m.t[0] * ct + m.f[0] * cf + m.n[0] * semi[2] * 0.72,
          centro[1] + m.t[1] * ct + m.f[1] * cf + m.n[1] * semi[2] * 0.72,
          centro[2] + m.t[2] * ct + m.f[2] * cf + m.n[2] * semi[2] * 0.72,
        ];
        const lr = 0.1 * e;
        this.poner(lobulos + j, p, m.t, m.f, m.n, lr, lr, lr * 0.6, COLOR.borde);
      }
    }
  }

  private pared(estado: EstadoBmu): void {
    const x0 = -LARGO / 2 + 0.25;
    const dx = (LARGO - 0.5) / CELDAS_X;
    const radio = (x: number): number => this.hueso.radioLuzEn(x);
    const cubiertaRevestimiento = estado.revestimiento * 0.62;
    const cubiertaInversion = estado.inversion * 0.9;
    const cubiertaOsteoblastos = estado.osteoblastos.cobertura;

    for (let ix = 0; ix < CELDAS_X; ix++) {
      for (let ifi = 0; ifi < CELDAS_FI; ifi++) {
        const celda = ix * CELDAS_FI + ifi;
        const indice = INICIO_PARED + celda;
        const rango = RANGOS[celda]!;
        const azar = AZAR_CELDA[celda]!;
        const x = x0 + (ix + 0.5 + (ifi % 2 === 0 ? 0 : 0.5) + 0.3 * (azar[0] - 0.5)) * dx;
        const u = (ifi + 0.5 + 0.3 * (azar[1] - 0.5)) / CELDAS_FI;
        const fi = SECTOR_INICIO + (SECTOR_FIN - SECTOR_INICIO) * u;
        // Solo hay células de inversión y osteoblastos donde el conducto se ensanchó por la resorción.
        const excavado = radioExcavado(x, estado);
        const enCavidad = suave((excavado - R_CANAL - 0.06) / 0.25);

        const sr = cubiertaRevestimiento > 0 ? suave((cubiertaRevestimiento - rango) * 5) : 0;
        const si = cubiertaInversion > 0 ? suave((cubiertaInversion - rango) * 5) * enCavidad : 0;
        const so =
          cubiertaOsteoblastos > 0 ? suave((cubiertaOsteoblastos - rango) * 5) * enCavidad : 0;
        const total = sr + si + so;
        const escala = Math.max(sr, si, so);
        if (escala < 0.02) {
          this.ocultar(indice);
          continue;
        }
        // Mezcla de aspecto ponderada por lo visible de cada tipo.
        const wr = sr / total;
        const wi = si / total;
        const wo = so / total;
        const semiT =
          wr * DIMENSIONES.revestimiento[0] +
          wi * DIMENSIONES.inversion[0] +
          wo * DIMENSIONES.osteoblasto[0];
        const semiF =
          wr * DIMENSIONES.revestimiento[1] +
          wi * DIMENSIONES.inversion[1] +
          wo * DIMENSIONES.osteoblasto[1];
        const semiH =
          wr * DIMENSIONES.revestimiento[2] +
          wi * DIMENSIONES.inversion[2] +
          wo * DIMENSIONES.osteoblasto[2];
        mezclarRgb(COLOR.revestimiento, COLOR.inversion, wi / Math.max(1e-6, wr + wi), AUX_COLOR);
        mezclarRgb(AUX_COLOR, COLOR.osteoblasto, wo, AUX_COLOR_2);

        const m = marco(x, fi, radio);
        // En un conducto estrecho caben menos células por vuelta: se ajusta el ancho al perímetro.
        const perimetro = Math.max(0.05, (radio(x) * (SECTOR_FIN - SECTOR_INICIO)) / CELDAS_FI);
        const f = Math.min(semiF, perimetro * 0.5) * escala;
        const t = semiT * escala;
        const h = semiH * escala * (0.85 + 0.3 * azar[2]);
        const p: V3 = [
          m.p[0] - m.n[0] * h * 0.55,
          m.p[1] - m.n[1] * h * 0.55,
          m.p[2] - m.n[2] * h * 0.55,
        ];
        this.poner(indice, p, m.t, m.f, m.n, t, f, h, AUX_COLOR_2);
      }
    }
  }

  liberar(): void {
    this.malla.dispose();
    this.geometria.dispose();
    this.material.dispose();
  }
}
