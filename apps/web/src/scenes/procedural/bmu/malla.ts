/**
 * Malla del hueso de la escena de la BMU: UNA sola geometría con color por vértice (una llamada de dibujo)
 * que reúne el cilindro de hueso cortical con su cuña quitada, la pared del túnel y las capas que se
 * depositan en él. Todo se recalcula a partir del `EstadoBmu` (función pura del tiempo): la geometría no
 * guarda historia, así que retroceder en la línea de tiempo la deshace exactamente.
 *
 * Piezas (todas comparten los mismos vértices y el mismo material):
 *  - superficie exterior del cilindro (estática);
 *  - tapas de los dos extremos: la izquierda con las láminas de la osteona vieja como anillos concéntricos
 *    (estática) y la derecha, por donde entra la BMU, con el túnel abierto: en corte transversal se ven la
 *    línea de cemento y las capas de osteoide que van estrechando el conducto;
 *  - caras de corte (las dos de la cuña): el hueso viejo en bandas (recortado por la cavidad), la línea de
 *    cemento y las láminas del hueso nuevo, que aparecen una a una desde fuera hacia dentro;
 *  - la LUZ del conducto: la superficie interior, lisa donde ya hay osteoide, festoneada (lagunas de
 *    Howship) donde solo hay hueso resorbido, y de color según su estado (hueso, línea de cemento, osteoide,
 *    hueso mineralizado).
 *
 * Presupuesto: unos 13 000 triángulos.
 */
import { BufferAttribute, BufferGeometry, DynamicDrawUsage } from 'three';
import { acotar, mezclar, suave } from '../interpolacion';
import {
  LARGO,
  R_CANAL,
  R_EXTERIOR,
  R_LUMEN_FINAL,
  avanceLocalFormacion,
  radioExcavado,
} from './estado';
import type { EstadoBmu } from './estado';
import { RGB, mezclarRgb } from './paleta';
import type { Rgb } from './paleta';
import { SECTOR_FIN, SECTOR_INICIO } from './sector';

/** Columnas a lo largo del eje X y del ángulo. */
const NX = 80;
const NFI = 40;
/** Láminas concéntricas del hueso nuevo. */
export const N_LAMINAS = 6;
/** Ancho máximo de la línea de cemento. */
const ANCHO_CEMENTO = 0.055;
/** Cuánto antes se mineralizan las láminas externas que las internas (0 = todas a la vez). */
const DESFASE_MINERAL = 0.75;

/** Límites radiales de las bandas del hueso viejo: osteona previa dentro de 1,08 e intersticial fuera. */
const LIMITES_VIEJO = [R_CANAL, 0.52, 0.72, 0.9, 1.08, 1.32, 1.56, 1.78, R_EXTERIOR] as const;
const COLORES_VIEJO: readonly Rgb[] = [
  RGB.hueso,
  RGB.huesoLamina,
  RGB.hueso,
  RGB.huesoLamina,
  RGB.huesoIntersticial,
  RGB.hueso,
  RGB.huesoIntersticial,
  RGB.hueso,
];

/** Escribe vértices, normales y colores en los arreglos compartidos. */
class Escritor {
  readonly pos: Float32Array;
  readonly nor: Float32Array;
  readonly col: Float32Array;
  readonly indices: number[] = [];
  private siguiente = 0;

  constructor(capacidad: number) {
    this.pos = new Float32Array(capacidad * 3);
    this.nor = new Float32Array(capacidad * 3);
    this.col = new Float32Array(capacidad * 3);
  }

  get vertices(): number {
    return this.siguiente;
  }

  /** Reserva `n` vértices y devuelve el índice del primero. */
  reservar(n: number): number {
    const base = this.siguiente;
    this.siguiente += n;
    return base;
  }

  /**
   * Índices de una cinta de `columnas + 1` pares de vértices (columna i: `2i` = borde bajo, `2i + 1` = alto).
   * Con `invertir` = false la normal geométrica es (alto - bajo) x (avance); con `true`, la contraria.
   */
  cinta(base: number, columnas: number, invertir: boolean): void {
    for (let i = 0; i < columnas; i++) {
      const a = base + 2 * i;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      if (invertir) this.indices.push(a, c, b, b, c, d);
      else this.indices.push(a, b, c, b, d, c);
    }
  }

  vertice(i: number, x: number, y: number, z: number): void {
    this.pos[3 * i] = x;
    this.pos[3 * i + 1] = y;
    this.pos[3 * i + 2] = z;
  }

  normal(i: number, x: number, y: number, z: number): void {
    this.nor[3 * i] = x;
    this.nor[3 * i + 1] = y;
    this.nor[3 * i + 2] = z;
  }

  color(i: number, c: Rgb): void {
    this.col[3 * i] = c[0];
    this.col[3 * i + 1] = c[1];
    this.col[3 * i + 2] = c[2];
  }
}

/** Perfil por columna de x (se recalcula en cada `actualizar`). */
interface Perfil {
  x: Float64Array;
  excavado: Float64Array;
  cemento: Float64Array;
  espesorMax: Float64Array;
  espesor: Float64Array;
  luz: Float64Array;
  avance: Float64Array;
}

function crearPerfil(): Perfil {
  const n = NX + 1;
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = -LARGO / 2 + (LARGO * i) / NX;
  return {
    x,
    excavado: new Float64Array(n),
    cemento: new Float64Array(n),
    espesorMax: new Float64Array(n),
    espesor: new Float64Array(n),
    luz: new Float64Array(n),
    avance: new Float64Array(n),
  };
}

const AUX_A: Rgb = [0, 0, 0];
const AUX_B: Rgb = [0, 0, 0];
const AUX_C: Rgb = [0, 0, 0];

export class MallaHueso {
  readonly geometria = new BufferGeometry();
  private readonly e: Escritor;
  private readonly perfil = crearPerfil();
  /** Ángulo de cada cara de corte de la cuña. */
  private readonly caras: number[] = [SECTOR_INICIO, SECTOR_FIN];
  /** `viejo[cara][banda]`, `cemento[cara]`, `laminas[cara][lamina]`. */
  private readonly viejo: number[][] = [[], []];
  private readonly cementos: number[] = [];
  private readonly laminas: number[][] = [[], []];
  /** Tapa izquierda, con las bandas del hueso viejo (estática). */
  private readonly tapaIzquierda: number[] = [];
  /** Tapa derecha (por donde entra la BMU): bandas del hueso viejo, cemento y láminas nuevas. */
  private readonly tapaDerecha = { viejo: [] as number[], cemento: 0, laminas: [] as number[] };
  private baseLuz = 0;
  private baseExterior = 0;

  constructor() {
    const bandas = LIMITES_VIEJO.length - 1;
    const columnasCorte = (NX + 1) * 2;
    const columnasTapa = (NFI + 1) * 2;
    const capacidad =
      2 * (NFI + 1) + // exterior
      bandas * columnasTapa + // tapa izquierda (estática)
      (bandas + 1 + N_LAMINAS) * columnasTapa + // tapa derecha (abierta: muestra las capas en corte)
      2 * (bandas + 1 + N_LAMINAS) * columnasCorte + // caras: viejo, cemento y láminas
      (NX + 1) * (NFI + 1); // luz
    this.e = new Escritor(capacidad);
    const e = this.e;

    // Superficie exterior: dos filas de vértices (una por extremo) a lo largo de x.
    this.baseExterior = e.reservar(2 * (NFI + 1));
    for (let j = 0; j < NFI; j++) {
      const a = this.baseExterior + j;
      const b = a + (NFI + 1);
      // Normal saliente: (a, c, b), (b, c, d) con c = siguiente en fi.
      e.indices.push(a, a + 1, b, b, a + 1, b + 1);
    }

    this.caras.forEach((_fi, cara) => {
      // Hueso viejo en bandas.
      for (let k = 0; k < bandas; k++) {
        const base = e.reservar(columnasCorte);
        e.cinta(base, NX, cara === 1);
        this.viejo[cara]!.push(base);
      }
      // Línea de cemento.
      const cementoBase = e.reservar(columnasCorte);
      e.cinta(cementoBase, NX, cara === 1);
      this.cementos.push(cementoBase);
      // Láminas nuevas.
      for (let j = 0; j < N_LAMINAS; j++) {
        const base = e.reservar(columnasCorte);
        e.cinta(base, NX, cara === 1);
        this.laminas[cara]!.push(base);
      }
    });

    // Tapa izquierda: bandas del hueso viejo (la cavidad no llega a ese extremo).
    for (let k = 0; k < bandas; k++) {
      const base = e.reservar(columnasTapa);
      e.cinta(base, NFI, true);
      this.tapaIzquierda.push(base);
    }
    // Tapa derecha: la cavidad está abierta, así que se ven en corte las capas que se depositan.
    for (let k = 0; k < bandas; k++) {
      const base = e.reservar(columnasTapa);
      e.cinta(base, NFI, false);
      this.tapaDerecha.viejo.push(base);
    }
    this.tapaDerecha.cemento = e.reservar(columnasTapa);
    e.cinta(this.tapaDerecha.cemento, NFI, false);
    for (let j = 0; j < N_LAMINAS; j++) {
      const base = e.reservar(columnasTapa);
      e.cinta(base, NFI, false);
      this.tapaDerecha.laminas.push(base);
    }

    // Luz del conducto: rejilla (x, fi) con la normal hacia el eje.
    this.baseLuz = e.reservar((NX + 1) * (NFI + 1));
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NFI; j++) {
        const a = this.baseLuz + i * (NFI + 1) + j;
        const b = a + (NFI + 1);
        e.indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }

    this.iniciarEstaticas();

    const posAttr = new BufferAttribute(e.pos, 3).setUsage(DynamicDrawUsage);
    const norAttr = new BufferAttribute(e.nor, 3).setUsage(DynamicDrawUsage);
    const colAttr = new BufferAttribute(e.col, 3).setUsage(DynamicDrawUsage);
    this.geometria.setAttribute('position', posAttr);
    this.geometria.setAttribute('normal', norAttr);
    this.geometria.setAttribute('color', colAttr);
    this.geometria.setIndex(e.indices);
    // Caja fija: el cilindro exterior no cambia, y así no hay que recalcularla en cada fotograma.
    this.geometria.boundingSphere = null;
    this.geometria.computeBoundingSphere();
  }

  /** Piezas que no dependen del tiempo: exterior y tapas. */
  private iniciarEstaticas(): void {
    const e = this.e;
    // Exterior
    for (let lado = 0; lado < 2; lado++) {
      const x = lado === 0 ? -LARGO / 2 : LARGO / 2;
      for (let j = 0; j <= NFI; j++) {
        const fi = SECTOR_INICIO + ((SECTOR_FIN - SECTOR_INICIO) * j) / NFI;
        const i = this.baseExterior + lado * (NFI + 1) + j;
        e.vertice(i, x, R_EXTERIOR * Math.cos(fi), R_EXTERIOR * Math.sin(fi));
        e.normal(i, 0, Math.cos(fi), Math.sin(fi));
        e.color(i, RGB.hueso);
      }
    }
    // Tapa izquierda
    this.tapaIzquierda.forEach((base, k) => {
      this.escribirAnillo(
        base,
        LARGO / -2,
        -1,
        () => LIMITES_VIEJO[k]!,
        () => LIMITES_VIEJO[k + 1]!,
        COLORES_VIEJO[k]!,
      );
    });
  }

  /** Escribe un anillo (sector circular entre dos radios) en una tapa perpendicular al eje X. */
  private escribirAnillo(
    base: number,
    x: number,
    normalX: number,
    bajo: () => number,
    alto: () => number,
    color: Rgb,
  ): void {
    const e = this.e;
    const rb = bajo();
    const ra = alto();
    for (let j = 0; j <= NFI; j++) {
      const fi = SECTOR_INICIO + ((SECTOR_FIN - SECTOR_INICIO) * j) / NFI;
      const c = Math.cos(fi);
      const s = Math.sin(fi);
      const vb = base + 2 * j;
      e.vertice(vb, x, rb * c, rb * s);
      e.vertice(vb + 1, x, ra * c, ra * s);
      e.normal(vb, normalX, 0, 0);
      e.normal(vb + 1, normalX, 0, 0);
      e.color(vb, color);
      e.color(vb + 1, color);
    }
  }

  /** Recalcula el perfil del túnel para el estado dado. */
  private calcularPerfil(estado: EstadoBmu): void {
    const p = this.perfil;
    for (let i = 0; i <= NX; i++) {
      const x = p.x[i]!;
      const excavado = radioExcavado(x, estado);
      const cavidad = suave((excavado - R_CANAL) / 0.2);
      const maximo = Math.max(0, excavado - R_LUMEN_FINAL);
      const avance = avanceLocalFormacion(x, estado.avanceFormacion);
      p.excavado[i] = excavado;
      p.cemento[i] = ANCHO_CEMENTO * estado.lineaCemento * cavidad;
      p.espesorMax[i] = maximo;
      p.avance[i] = avance;
      p.espesor[i] = maximo * avance;
      p.luz[i] = excavado - p.espesor[i]!;
    }
  }

  /** Mineralización (0 a 1) de la lámina cuyo centro está a la fracción `posicion` (0 fuera, 1 dentro). */
  private mineralDeLamina(estado: EstadoBmu, posicion: number): number {
    const m = estado.fraccionMineralizada;
    return acotar(m * (1 + DESFASE_MINERAL) - DESFASE_MINERAL * posicion);
  }

  /** Vuelca el estado en la geometría. Barato: ~10 000 vértices, sin reservar memoria. */
  actualizar(estado: EstadoBmu): void {
    this.calcularPerfil(estado);
    this.escribirCaras(estado);
    this.escribirTapaDerecha(estado);
    this.escribirLuz(estado);
    for (const nombre of ['position', 'normal', 'color'] as const) {
      this.geometria.getAttribute(nombre).needsUpdate = true;
    }
  }

  private escribirCaras(estado: EstadoBmu): void {
    const e = this.e;
    const p = this.perfil;
    this.caras.forEach((fiCara, indice) => {
      const c = Math.cos(fiCara);
      const s = Math.sin(fiCara);
      // Normal de la cara hacia la cuña quitada.
      const signo = indice === 0 ? -1 : 1;
      const nx = 0;
      const ny = -signo * s;
      const nz = signo * c;
      const escribirBanda = (
        base: number,
        bajo: (i: number) => number,
        alto: (i: number) => number,
        color: Rgb,
      ) => {
        for (let i = 0; i <= NX; i++) {
          const x = p.x[i]!;
          const vb = base + 2 * i;
          const rb = bajo(i);
          const ra = alto(i);
          e.vertice(vb, x, rb * c, rb * s);
          e.vertice(vb + 1, x, ra * c, ra * s);
          e.normal(vb, nx, ny, nz);
          e.normal(vb + 1, nx, ny, nz);
          e.color(vb, color);
          e.color(vb + 1, color);
        }
      };

      // Hueso viejo: cada banda queda por encima de la cavidad y de la línea de cemento.
      this.viejo[indice]!.forEach((base, k) => {
        const lo = LIMITES_VIEJO[k]!;
        const hi = LIMITES_VIEJO[k + 1]!;
        escribirBanda(
          base,
          (i) => Math.max(p.excavado[i]! + p.cemento[i]!, lo),
          (i) => Math.max(p.excavado[i]! + p.cemento[i]!, hi),
          COLORES_VIEJO[k]!,
        );
      });

      // Línea de cemento: justo por fuera de la cavidad.
      escribirBanda(
        this.cementos[indice]!,
        (i) => p.excavado[i]!,
        (i) => p.excavado[i]! + p.cemento[i]!,
        RGB.cemento,
      );

      // Láminas del hueso nuevo, de fuera hacia dentro.
      this.laminas[indice]!.forEach((base, j) => {
        const desde = j / N_LAMINAS;
        const hasta = (j + 1) / N_LAMINAS;
        const color = this.colorLamina(estado, j);
        escribirBanda(
          base,
          (i) => p.excavado[i]! - Math.min(p.espesor[i]!, p.espesorMax[i]! * hasta),
          (i) => p.excavado[i]! - Math.min(p.espesor[i]!, p.espesorMax[i]! * desde),
          color,
        );
      });
    });
  }

  /** Color de la lámina `j` (0 = la más externa, la primera que se depositó) según su mineralización. */
  private colorLamina(estado: EstadoBmu, j: number): Rgb {
    const mineral = this.mineralDeLamina(estado, (j + 0.5) / N_LAMINAS);
    mezclarRgb(RGB.osteoide, RGB.huesoNuevo, mineral, AUX_A);
    // Alternancia de tinta: las láminas pares algo más oscuras, para que se lean como capas.
    const tinte = j % 2 === 0 ? 0.93 : 1;
    return [AUX_A[0] * tinte, AUX_A[1] * tinte, AUX_A[2] * tinte];
  }

  /** Tapa derecha: la cavidad está abierta y el corte transversal muestra las capas concéntricas. */
  private escribirTapaDerecha(estado: EstadoBmu): void {
    const p = this.perfil;
    const i = NX;
    const x = LARGO / 2;
    const excavado = p.excavado[i]!;
    const cemento = p.cemento[i]!;
    const espesor = p.espesor[i]!;
    const maximo = p.espesorMax[i]!;
    this.tapaDerecha.viejo.forEach((base, k) => {
      const lo = LIMITES_VIEJO[k]!;
      const hi = LIMITES_VIEJO[k + 1]!;
      this.escribirAnillo(
        base,
        x,
        1,
        () => Math.max(excavado + cemento, lo),
        () => Math.max(excavado + cemento, hi),
        COLORES_VIEJO[k]!,
      );
    });
    this.escribirAnillo(
      this.tapaDerecha.cemento,
      x,
      1,
      () => excavado,
      () => excavado + cemento,
      RGB.cemento,
    );
    this.tapaDerecha.laminas.forEach((base, j) => {
      const desde = j / N_LAMINAS;
      const hasta = (j + 1) / N_LAMINAS;
      this.escribirAnillo(
        base,
        x,
        1,
        () => excavado - Math.min(espesor, maximo * hasta),
        () => excavado - Math.min(espesor, maximo * desde),
        this.colorLamina(estado, j),
      );
    });
  }

  private escribirLuz(estado: EstadoBmu): void {
    const e = this.e;
    const p = this.perfil;
    const base = this.baseLuz;
    const columnas = NFI + 1;
    const amplitudBase = 0.07 * estado.festoneado;

    // Posiciones (con las lagunas festoneadas) y color de cada columna de x.
    for (let i = 0; i <= NX; i++) {
      const x = p.x[i]!;
      const espesor = p.espesor[i]!;
      const lisura = suave(espesor / 0.05);
      const cavidad = suave((p.excavado[i]! - R_CANAL) / 0.25);
      const detras = suave((x - estado.frenteX - 0.9) / 1);
      const amplitud = amplitudBase * cavidad * detras * (1 - lisura);

      // Color: hueso resorbido, línea de cemento y, sobre el osteoide, su mineralización.
      // El hueso resorbido es más oscuro que el intacto; el canal previo, sin excavar, conserva su color.
      mezclarRgb(RGB.hueso, RGB.huesoResorbido, cavidad, AUX_A);
      mezclarRgb(AUX_A, RGB.cemento, 0.55 * estado.lineaCemento * cavidad * (1 - lisura), AUX_B);
      const mineral = this.mineralDeLamina(estado, p.avance[i]!);
      mezclarRgb(RGB.osteoide, RGB.huesoNuevo, mineral, AUX_C);
      mezclarRgb(AUX_B, AUX_C, lisura, AUX_A);

      for (let j = 0; j <= NFI; j++) {
        const u = j / NFI;
        const fi = SECTOR_INICIO + (SECTOR_FIN - SECTOR_INICIO) * u;
        // Sin lagunas junto a las caras de corte, para que la luz encaje con ellas.
        const borde = suave(Math.min(u, 1 - u) / 0.12);
        const laguna = 0.5 * (1 + Math.sin(4.3 * x + 0.7) * Math.sin(11 * fi + 0.4));
        const r = p.luz[i]! + amplitud * borde * laguna;
        const v = base + i * columnas + j;
        e.vertice(v, x, r * Math.cos(fi), r * Math.sin(fi));
        // Las depresiones (más radio) un poco más oscuras.
        const sombra = 1 - 0.14 * (amplitud > 0 ? laguna * borde : 0);
        e.color(v, [AUX_A[0] * sombra, AUX_A[1] * sombra, AUX_A[2] * sombra]);
      }
    }

    // Normales por diferencias finitas, hacia el eje.
    for (let i = 0; i <= NX; i++) {
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(NX, i + 1);
      for (let j = 0; j <= NFI; j++) {
        const j0 = Math.max(0, j - 1);
        const j1 = Math.min(NFI, j + 1);
        const a = base + i1 * columnas + j;
        const b = base + i0 * columnas + j;
        const c = base + i * columnas + j1;
        const d = base + i * columnas + j0;
        // dP/dx x dP/dfi es la normal que mira hacia el eje (la luz se ve desde dentro).
        const dxX = e.pos[3 * a]! - e.pos[3 * b]!;
        const dxY = e.pos[3 * a + 1]! - e.pos[3 * b + 1]!;
        const dxZ = e.pos[3 * a + 2]! - e.pos[3 * b + 2]!;
        const dfX = e.pos[3 * c]! - e.pos[3 * d]!;
        const dfY = e.pos[3 * c + 1]! - e.pos[3 * d + 1]!;
        const dfZ = e.pos[3 * c + 2]! - e.pos[3 * d + 2]!;
        let nx = dxY * dfZ - dxZ * dfY;
        let ny = dxZ * dfX - dxX * dfZ;
        let nz = dxX * dfY - dxY * dfX;
        const largo = Math.hypot(nx, ny, nz) || 1;
        nx /= largo;
        ny /= largo;
        nz /= largo;
        e.normal(base + i * columnas + j, nx, ny, nz);
      }
    }
  }

  /** Radio de la luz en `x` (para colocar células), según el último estado dibujado. */
  radioLuzEn(x: number): number {
    const p = this.perfil;
    const k = acotar((x + LARGO / 2) / LARGO) * NX;
    const i = Math.min(NX - 1, Math.floor(k));
    return mezclar(p.luz[i]!, p.luz[i + 1]!, k - i);
  }

  liberar(): void {
    this.geometria.dispose();
  }
}
