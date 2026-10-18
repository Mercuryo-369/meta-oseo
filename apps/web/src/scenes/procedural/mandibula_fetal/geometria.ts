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
  LatheGeometry,
  Shape,
  ShapeUtils,
  SphereGeometry,
  Vector2,
} from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Punto2, Vec3 } from './disposicion';

export const DOS_PI = Math.PI * 2;

/**
 * Suaviza un contorno CERRADO cortando sus esquinas (algoritmo de Chaikin): cada iteración cambia cada lado por
 * dos puntos a 1/4 y 3/4 de su largo, así que duplica los puntos y redondea los vértices sin cambiar la forma
 * general. Sirve para que el perfil del cuerpo y la silueta de la rama no tengan aristas de polígono.
 */
export function suavizarContorno(puntos: readonly Punto2[], iteraciones = 1): Punto2[] {
  let actual: Punto2[] = [...puntos];
  for (let k = 0; k < iteraciones; k++) {
    const siguiente: Punto2[] = [];
    for (let i = 0; i < actual.length; i++) {
      const [ax, ay] = actual[i]!;
      const [bx, by] = actual[(i + 1) % actual.length]!;
      siguiente.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by] as const);
      siguiente.push([0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by] as const);
    }
    actual = siguiente;
  }
  return actual;
}

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
  /**
   * El marco del tramo (normal lateral, +Y, avance) es DIESTRO: con el orden base las paredes mirarían hacia dentro,
   * así que se invierten (y las tapas, que con ese marco ya miran hacia fuera, se dejan). Pasa en la mitad +1 del
   * arco, porque `normalLateral` se refleja de una mitad a la otra, y en un tramo que recorre las dos mitades del oído
   * +1 al oído -1 (el mesénquima). Sin esto, la mitad +X tenía todas las normales hacia dentro.
   */
  invertir?: boolean;
}

/** Disposición de los vértices de un tramo dentro de la geometría (las pruebas de orientación la usan). */
export interface DatosTramo extends TramoBarrido {
  primerVertice: number;
  primerVerticeTapas: number;
}

/** Anillos del barrido por cada repetición de la textura de relieve a lo largo. */
const ANILLOS_POR_UV = 12;

/**
 * Coordenada alrededor del perfil, en espejo (0 → 1 → 0): continua también entre el último punto y el primero. Va
 * por longitud de arco del contorno (antes, por índice de punto): en el perfil en U del cuerpo, con lados cortos en
 * las crestas y largos en las láminas, el grano salía comprimido en unos y estirado en otros.
 */
function coordenadasAlrededor(contorno: readonly Punto2[]): number[] {
  const n = contorno.length;
  const acumulado = [0];
  for (let j = 1; j <= n; j++) {
    const [a0, b0] = contorno[j - 1]!;
    const [a1, b1] = contorno[j % n]!;
    acumulado.push(acumulado[j - 1]! + Math.hypot(a1 - a0, b1 - b0));
  }
  const total = acumulado[n]! || 1;
  return Array.from({ length: n }, (_, j) => 1 - Math.abs((2 * acumulado[j]!) / total - 1));
}

/**
 * Barrido de un perfil cerrado de `nPerfil` puntos a lo largo de uno o más tramos. Cada tramo es una tira
 * independiente de anillos (con o sin tapas); todos comparten una sola geometría, así que un objeto con varios
 * tramos es una sola llamada de dibujo. Las posiciones se escriben con `escribirTramo` y se cierran con
 * `terminar`, que recalcula las normales.
 *
 * Realismo (2026-10-14): trae coordenadas UV fijas para el relieve de superficie de los materiales (alrededor
 * del perfil, en espejo para que no haya costura; a lo largo, una repetición cada `ANILLOS_POR_UV` anillos) y
 * dos grupos de índices: 0 = paredes, 1 = tapas. Una malla con DOS materiales pinta las tapas (la cara de
 * corte) con el segundo; con uno solo, los grupos se ignoran.
 *
 * Orientación (2026-10-17): las paredes y las tapas de todos los tramos miran hacia fuera en las dos mitades del
 * arco (ver `invertir`). Antes la mitad +X, la que muestran las vistas de corte, lateral y detalle, tenía todas
 * las normales hacia dentro: con doble cara la luz se corregía, pero fallaban la sombra propia y la doble pasada de
 * los transparentes.
 */
export class Barrido {
  readonly geometria = new BufferGeometry();
  readonly nPerfil: number;
  private readonly tramos: DatosTramo[] = [];
  private readonly posiciones: Float32BufferAttribute;

  /**
   * `triangulacionTapa`: triángulos (índices en el perfil) que rellenan una tapa; si falta, se calcula del
   * `perfilTipo` (un polígono simple con la misma topología que los perfiles que se escribirán después).
   */
  constructor(nPerfil: number, tramos: readonly TramoBarrido[], perfilTipo?: readonly Punto2[]) {
    this.nPerfil = nPerfil;
    let vertices = 0;
    for (const t of tramos) {
      const interno: DatosTramo = {
        ...t,
        primerVertice: vertices,
        primerVerticeTapas: vertices + (t.segmentos + 1) * nPerfil,
      };
      vertices += (t.segmentos + 1) * nPerfil + (t.tapas ? 2 * nPerfil : 0);
      this.tramos.push(interno);
    }
    this.posiciones = new Float32BufferAttribute(new Float32Array(vertices * 3), 3);
    this.geometria.setAttribute('position', this.posiciones);

    const contornoTapa = perfilTipo ?? perfilCirculo(1, nPerfil);
    const tapa = tramos.some((t) => t.tapas)
      ? ShapeUtils.triangulateShape(
          contornoTapa.map(([a, b]) => new Vector2(a, b)),
          [],
        )
      : [];
    // Primero todas las paredes y después todas las tapas: así cada parte es un grupo de índices contiguo.
    const paredes: number[] = [];
    const tapas: number[] = [];
    for (const t of this.tramos) {
      for (let i = 0; i < t.segmentos; i++) {
        const a0 = t.primerVertice + i * nPerfil;
        const a1 = a0 + nPerfil;
        for (let j = 0; j < nPerfil; j++) {
          const k = (j + 1) % nPerfil;
          if (t.invertir) paredes.push(a0 + j, a1 + k, a1 + j, a0 + j, a0 + k, a1 + k);
          else paredes.push(a0 + j, a1 + j, a1 + k, a0 + j, a1 + k, a0 + k);
        }
      }
      if (t.tapas) {
        const inicio = t.primerVerticeTapas;
        const fin = inicio + nPerfil;
        for (const [a, b, c] of tapa) {
          // La tapa del inicio mira hacia atrás y la del fin hacia delante: con el marco diestro (`invertir`) el
          // orden base ya lo cumple; con el zurdo, al revés.
          if (t.invertir)
            tapas.push(inicio + a!, inicio + c!, inicio + b!, fin + a!, fin + b!, fin + c!);
          else tapas.push(inicio + a!, inicio + b!, inicio + c!, fin + a!, fin + c!, fin + b!);
        }
      }
    }
    this.geometria.setIndex([...paredes, ...tapas]);
    this.geometria.addGroup(0, paredes.length, 0);
    if (tapas.length > 0) this.geometria.addGroup(paredes.length, tapas.length, 1);

    // UV fijas (la topología no cambia aunque las posiciones se reescriban).
    const uv = new Float32Array(vertices * 2);
    let minA = Infinity;
    let maxA = -Infinity;
    let minB = Infinity;
    let maxB = -Infinity;
    for (const [a, b] of contornoTapa) {
      minA = Math.min(minA, a);
      maxA = Math.max(maxA, a);
      minB = Math.min(minB, b);
      maxB = Math.max(maxB, b);
    }
    // Tapas: la misma escala en los dos ejes (el lado mayor de la caja del perfil mide 1), para que los poros de la
    // cara de corte salgan redondos y no aplastados.
    const lado = Math.max(maxA - minA, maxB - minB) || 1;
    const alrededor = coordenadasAlrededor(contornoTapa);
    for (const t of this.tramos) {
      for (let i = 0; i <= t.segmentos; i++) {
        for (let j = 0; j < nPerfil; j++) {
          const k = (t.primerVertice + i * nPerfil + j) * 2;
          uv[k] = alrededor[j] ?? 0;
          uv[k + 1] = i / ANILLOS_POR_UV;
        }
      }
      if (t.tapas) {
        for (let extremo = 0; extremo < 2; extremo++) {
          for (let j = 0; j < nPerfil; j++) {
            const [a, b] = contornoTapa[j] ?? [0, 0];
            const k = (t.primerVerticeTapas + extremo * nPerfil + j) * 2;
            uv[k] = (a - minA) / lado;
            uv[k + 1] = (b - minB) / lado;
          }
        }
      }
    }
    this.geometria.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  }

  get numeroTramos(): number {
    return this.tramos.length;
  }

  /** Dónde están los vértices del tramo `indice` (anillos y tapas): para comprobar su orientación en las pruebas. */
  datosTramo(indice: number): Readonly<DatosTramo> {
    const t = this.tramos[indice];
    if (!t) throw new Error(`El barrido no tiene el tramo ${indice}.`);
    return t;
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
 * Perfil (radio, altura) del órgano del esmalte en estadio de campana, de radio ~1: por fuera sube convexo desde el
 * asa cervical hasta la cúspide y por dentro baja cóncavo, dejando el hueco donde va la papila dental; abajo queda
 * abierto (el asa cervical). El radio 0,001 en el eje evita triángulos degenerados en la cúspide.
 */
export const PERFIL_CAMPANA: readonly Punto2[] = [
  [1.0, -0.35],
  [1.05, 0],
  [0.9, 0.55],
  [0.5, 0.9],
  [0.001, 1.0],
  [0.001, 0.72],
  [0.42, 0.62],
  [0.72, 0.3],
  [0.8, -0.3],
  [0.9, -0.38],
];

/**
 * Órgano del esmalte en campana (torno de `PERFIL_CAMPANA`): una cáscara convexa por fuera y cóncava por dentro
 * que envuelve la papila. Antes era una media esfera encima de una esfera (una bola con tapa), que un odontólogo
 * no reconoce como germen en campana. 288 triángulos con 16 segmentos.
 */
export function campanaEsmalte(segmentos = 16): TipoBufferGeometry {
  return new LatheGeometry(
    PERFIL_CAMPANA.map(([r, y]) => new Vector2(r, y)),
    segmentos,
  );
}

/**
 * Placa extruida a partir de una silueta en el plano (z, y): la silueta se extruye `grosor` a lo largo de X,
 * centrada en x = 0. Sirve para la rama. Con `bisel` (> 0) los cantos se redondean (el grosor total sigue siendo
 * `grosor`; el contorno crece `bisel` hacia fuera): un hueso no tiene aristas vivas. `escalaUv` multiplica las UV
 * (que ExtrudeGeometry da en unidades de escena).
 */
export function placaExtruida(
  silueta: readonly Punto2[],
  grosor: number,
  opciones: { bisel?: number; escalaUv?: readonly [number, number] } = {},
): TipoBufferGeometry {
  const bisel = Math.max(0, Math.min(opciones.bisel ?? 0, grosor * 0.45));
  const forma = new Shape(silueta.map(([z, y]) => new Vector2(z, y)));
  const geo = new ExtrudeGeometry(
    forma,
    bisel > 0
      ? {
          depth: grosor - 2 * bisel,
          bevelEnabled: true,
          bevelThickness: bisel,
          bevelSize: bisel,
          bevelSegments: 3,
          curveSegments: 4,
        }
      : { depth: grosor, bevelEnabled: false, curveSegments: 4 },
  );
  // La forma vive en XY y se extruye hacia +Z; girada -90° sobre Y, su X pasa a ser Z y la extrusión va a -X.
  geo.rotateY(-Math.PI / 2);
  // Centrada en X (con bisel la extrusión empieza en -bisel, así que se centra con la caja).
  geo.computeBoundingBox();
  const caja = geo.boundingBox!;
  geo.translate(-(caja.min.x + caja.max.x) / 2, 0, 0);
  const [eu, ev] = opciones.escalaUv ?? [1, 1];
  if (eu !== 1 || ev !== 1) {
    // Las UV de ExtrudeGeometry van en unidades de escena; esta escala las iguala con el grano de otras piezas
    // del mismo material que traen UV normalizadas (el cuerpo óseo).
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * eu, uv.getY(i) * ev);
  }
  if (bisel === 0) return geo;
  // ExtrudeGeometry no comparte vértices: sus normales son planas por triángulo. Se suavizan entre caras que
  // forman menos de ~70° (el bisel queda redondo; solo las aristas muy marcadas siguen nítidas).
  const suave = toCreasedNormals(geo, Math.PI * 0.39);
  geo.dispose();
  return suave;
}
