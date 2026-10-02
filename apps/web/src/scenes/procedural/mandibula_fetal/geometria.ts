/**
 * Formas de la escena de la mandíbula fetal (aquí sí se usa three). Casi todo lo que se ve es un BARRIDO: un
 * perfil plano (un círculo para el cartílago y el nervio, una elipse para el mesénquima, el canal en U del
 * cuerpo óseo) que recorre el arco de la mandíbula. `Barrido` reserva la topología una vez (anillos, tapas,
 * índices) y deja que las mallas escriban las posiciones tantas veces como haga falta: así el hueso crece y el
 * cartílago de Meckel se adelgaza sin crear geometría nueva en cada fotograma.
 *
 * Los números (puntos del arco, perfiles, siluetas) vienen de `disposicion.ts`, que es puro.
 */
import type { BufferGeometry as TipoBufferGeometry } from 'three';
import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
  ShapeUtils,
  SphereGeometry,
  Vector2,
} from 'three';
import type { Punto2, Vec3 } from './disposicion';

export const DOS_PI = Math.PI * 2;

/** Perfil circular de `n` puntos y radio `r` (antihorario), en coordenadas (lateral, vertical). */
export function perfilCirculo(r: number, n: number, rVertical = r): Punto2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * DOS_PI;
    return [r * Math.cos(a), rVertical * Math.sin(a)] as const;
  });
}

/** Un anillo del barrido: su centro, su normal lateral (horizontal, unitaria) y el perfil ya escalado. */
export interface Anillo {
  centro: Vec3;
  n: Vec3;
  perfil: readonly Punto2[];
}

export interface TramoBarrido {
  /** Número de segmentos (anillos - 1). */
  segmentos: number;
  /** Con tapas planas en los dos extremos (para ver la sección del cuerpo óseo). */
  tapas: boolean;
}

interface TramoInterno extends TramoBarrido {
  primerVertice: number;
  primerVerticeTapas: number;
}

/**
 * Barrido de un perfil cerrado de `nPerfil` puntos a lo largo de uno o más tramos. Cada tramo es una tira
 * independiente de anillos (con o sin tapas); todos comparten una sola geometría, así que un objeto con varios
 * tramos es una sola llamada de dibujo. Las posiciones se escriben con `escribirTramo` y se cierran con
 * `terminar`, que recalcula las normales.
 */
export class Barrido {
  readonly geometria = new BufferGeometry();
  readonly nPerfil: number;
  private readonly tramos: TramoInterno[] = [];
  private readonly posiciones: Float32BufferAttribute;

  /**
   * `triangulacionTapa`: triángulos (índices en el perfil) que rellenan una tapa; si falta, se calcula del
   * `perfilTipo` (un polígono simple con la misma topología que los perfiles que se escribirán después).
   */
  constructor(nPerfil: number, tramos: readonly TramoBarrido[], perfilTipo?: readonly Punto2[]) {
    this.nPerfil = nPerfil;
    let vertices = 0;
    for (const t of tramos) {
      const interno: TramoInterno = {
        ...t,
        primerVertice: vertices,
        primerVerticeTapas: vertices + (t.segmentos + 1) * nPerfil,
      };
      vertices += (t.segmentos + 1) * nPerfil + (t.tapas ? 2 * nPerfil : 0);
      this.tramos.push(interno);
    }
    this.posiciones = new Float32BufferAttribute(new Float32Array(vertices * 3), 3);
    this.geometria.setAttribute('position', this.posiciones);

    const indices: number[] = [];
    const tapa = tramos.some((t) => t.tapas)
      ? ShapeUtils.triangulateShape(
          (perfilTipo ?? perfilCirculo(1, nPerfil)).map(([a, b]) => new Vector2(a, b)),
          [],
        )
      : [];
    for (const t of this.tramos) {
      for (let i = 0; i < t.segmentos; i++) {
        const a0 = t.primerVertice + i * nPerfil;
        const a1 = a0 + nPerfil;
        for (let j = 0; j < nPerfil; j++) {
          const k = (j + 1) % nPerfil;
          indices.push(a0 + j, a1 + j, a1 + k, a0 + j, a1 + k, a0 + k);
        }
      }
      if (t.tapas) {
        const inicio = t.primerVerticeTapas;
        const fin = inicio + nPerfil;
        for (const [a, b, c] of tapa) {
          // La tapa del inicio mira hacia atrás y la del fin hacia delante (el material es de doble cara).
          indices.push(inicio + a!, inicio + c!, inicio + b!, fin + a!, fin + b!, fin + c!);
        }
      }
    }
    this.geometria.setIndex(indices);
  }

  get numeroTramos(): number {
    return this.tramos.length;
  }

  /** Escribe las posiciones del tramo `indice`: `anillo(i)` da el anillo i de 0 a `segmentos`. */
  escribirTramo(indice: number, anillo: (i: number, nAnillos: number) => Anillo): void {
    const t = this.tramos[indice];
    if (!t) throw new Error(`El barrido no tiene el tramo ${indice}.`);
    const datos = this.posiciones.array as Float32Array;
    const nAnillos = t.segmentos + 1;
    for (let i = 0; i < nAnillos; i++) {
      const a = anillo(i, nAnillos);
      this.escribirAnillo(datos, t.primerVertice + i * this.nPerfil, a);
      if (t.tapas && i === 0) this.escribirAnillo(datos, t.primerVerticeTapas, a);
      if (t.tapas && i === nAnillos - 1)
        this.escribirAnillo(datos, t.primerVerticeTapas + this.nPerfil, a);
    }
  }

  private escribirAnillo(datos: Float32Array, primero: number, a: Anillo): void {
    const [cx, cy, cz] = a.centro;
    const [nx, , nz] = a.n;
    for (let j = 0; j < this.nPerfil; j++) {
      const [pn, py] = a.perfil[j] ?? [0, 0];
      const k = (primero + j) * 3;
      datos[k] = cx + nx * pn;
      datos[k + 1] = cy + py;
      datos[k + 2] = cz + nz * pn;
    }
  }

  /** Tras escribir los tramos: sube las posiciones a la GPU y recalcula normales y caja envolvente. */
  terminar(): void {
    this.posiciones.needsUpdate = true;
    this.geometria.computeVertexNormals();
    this.geometria.computeBoundingSphere();
  }

  liberar(): void {
    this.geometria.dispose();
  }
}

/** Esfera unitaria para las piezas instanciadas (gérmenes, cartílagos, células); se escala por instancia. */
export function esferaUnitaria(segmentos = 14, anillos = 10): TipoBufferGeometry {
  return new SphereGeometry(1, segmentos, anillos);
}

/**
 * Placa extruida a partir de una silueta en el plano (z, y): la silueta se extruye `grosor` a lo largo de X,
 * centrada en x = 0. Sirve para la rama.
 */
export function placaExtruida(silueta: readonly Punto2[], grosor: number): TipoBufferGeometry {
  const forma = new Shape(silueta.map(([z, y]) => new Vector2(z, y)));
  const geo = new ExtrudeGeometry(forma, { depth: grosor, bevelEnabled: false, curveSegments: 4 });
  // La forma vive en XY y se extruye hacia +Z; girada -90° sobre Y, su X pasa a ser Z y la extrusión va a -X.
  geo.rotateY(-Math.PI / 2);
  geo.translate(grosor / 2, 0, 0);
  return geo;
}
