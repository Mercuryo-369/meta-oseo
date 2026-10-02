/**
 * Las anclas de la mandíbula contra la MALLA REAL (public/models/mandibula_bodyparts3d.stl), cargada con la
 * misma transformación que la escena (`crearGeometriaMandibula`): cada punto de interés tiene que estar sobre
 * el hueso (ni dentro ni flotando), en el lado que dice su tabla, y la vista que se le recomienda tiene que
 * verlo sin que otra parte del hueso o un diente lo tape.
 *
 * Los números los produce tools/anclas/calcular_anclas.mjs (docs/anclas-mandibula.md). Si esta prueba falla
 * tras tocar la malla, las vistas o el contenido: `node tools/anclas/calcular_anclas.mjs --escribir`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  ANCLAS_PIEZAS_DERECHA,
  ESTRUCTURAS_MANDIBULA,
  VISTAS_CAMARA,
  estructuraDeNodo,
} from '@/content/nodos3d';
import type { AnclaNodo } from '@/content/nodos3d';
import { prepararExploracion } from '@/activities/exploracion-3d/logica';
import type { ConfigExploracion3d } from '@/content/schema';
import { puntoDeAncla } from './anclas';
import type { CajaModelo } from './anclas';
import { crearGeometriaMandibula } from './stl';
import {
  RADIO_ZONA_ANCLA,
  calcularEncuadre,
  estadoDeEncuadre,
  limitesZoomExploracion,
} from './vistas';
import type { Vec3 } from './vistas';
import { distanciaParaEncajar } from './encuadre';

/* ----- La malla real ----- */

const nodo = (
  globalThis as unknown as {
    process: {
      cwd(): string;
      getBuiltinModule(nombre: string): { readFileSync(ruta: string): Uint8Array };
    };
  }
).process;

interface Malla {
  posiciones: Float32Array;
  indices: Uint32Array | Uint16Array;
  caja: CajaModelo;
}
let malla: Malla;

beforeAll(() => {
  // Vitest corre desde la carpeta del paquete (apps/web).
  const bytes = nodo
    .getBuiltinModule('node:fs')
    .readFileSync(`${nodo.cwd()}/public/models/mandibula_bodyparts3d.stl`);
  const copia = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const { geometria } = crearGeometriaMandibula(copia as ArrayBuffer);
  const caja = geometria.boundingBox!;
  malla = {
    posiciones: geometria.getAttribute('position').array as Float32Array,
    indices: geometria.index!.array as Uint32Array,
    caja: {
      min: [caja.min.x, caja.min.y, caja.min.z],
      max: [caja.max.x, caja.max.y, caja.max.z],
    },
  };
});

/* ----- Geometría mínima: rayo-triángulo y distancia punto-triángulo ----- */

const restar = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const punto = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norma = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

function vertice(i: number): Vec3 {
  const p = malla.posiciones;
  return [p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!];
}

function triangulo(t: number): [Vec3, Vec3, Vec3] {
  const ix = malla.indices;
  return [vertice(ix[t * 3]!), vertice(ix[t * 3 + 1]!), vertice(ix[t * 3 + 2]!)];
}

/** Distancia del punto al triángulo más cercano y la normal de esa cara (Ericson, Real-Time Collision Detection). */
function distanciaASuperficie(p: Vec3): { distancia: number; normal: Vec3; cerca: Vec3 } {
  let mejor = { distancia: Infinity, normal: [0, 0, 0] as Vec3, cerca: [0, 0, 0] as Vec3 };
  const n = malla.indices.length / 3;
  for (let t = 0; t < n; t++) {
    const [a, b, c] = triangulo(t);
    const q = puntoMasCercano(p, a, b, c);
    const d = norma(restar(p, q));
    if (d < mejor.distancia) {
      const nf = cruz(restar(b, a), restar(c, a));
      const l = norma(nf) || 1;
      mejor = { distancia: d, normal: [nf[0] / l, nf[1] / l, nf[2] / l], cerca: q };
    }
  }
  return mejor;
}

function puntoMasCercano(p: Vec3, a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ab = restar(b, a);
  const ac = restar(c, a);
  const ap = restar(p, a);
  const d1 = punto(ab, ap);
  const d2 = punto(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = restar(p, b);
  const d3 = punto(ab, bp);
  const d4 = punto(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v];
  }
  const cp = restar(p, c);
  const d5 = punto(ab, cp);
  const d6 = punto(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w];
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w];
  }
  const den = 1 / (va + vb + vc);
  const v = vb * den;
  const w = vc * den;
  return [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
}

/** Distancia a la que un rayo (dirección unitaria) toca la malla, o `Infinity` (Möller-Trumbore). */
function primerImpacto(origen: Vec3, dir: Vec3): number {
  let mejor = Infinity;
  const n = malla.indices.length / 3;
  for (let t = 0; t < n; t++) {
    const [a, b, c] = triangulo(t);
    const e1 = restar(b, a);
    const e2 = restar(c, a);
    const h = cruz(dir, e2);
    const det = punto(e1, h);
    if (Math.abs(det) < 1e-12) continue;
    const f = 1 / det;
    const s = restar(origen, a);
    const u = f * punto(s, h);
    if (u < 0 || u > 1) continue;
    const q = cruz(s, e1);
    const v = f * punto(dir, q);
    if (v < 0 || u + v > 1) continue;
    const dist = f * punto(e2, q);
    if (dist > 1e-6 && dist < mejor) mejor = dist;
  }
  return mejor;
}

/* ----- Datos ----- */

const ids = Object.keys(ESTRUCTURAS_MANDIBULA);
const puntoDe = (ancla: AnclaNodo): Vec3 => puntoDeAncla(ancla, malla.caja);

/** Los content.json de los seis módulos, con sus actividades de la mandíbula. */
const contenidos = import.meta.glob('/src/modules/*/content.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

interface NodoContenido {
  id: string;
  ancla?: AnclaNodo;
  camara?: { vista: string };
}
interface ConfigMandibula {
  modelo: string;
  nodos: NodoContenido[];
}

function actividadesDeMandibula(): { modulo: string; config: ConfigMandibula }[] {
  const salida: { modulo: string; config: ConfigMandibula }[] = [];
  const recorrer = (valor: unknown, modulo: string): void => {
    if (Array.isArray(valor)) valor.forEach((v) => recorrer(v, modulo));
    else if (valor && typeof valor === 'object') {
      const o = valor as Record<string, unknown>;
      if (o.modelo === 'mandibula' && Array.isArray(o.nodos)) {
        salida.push({ modulo, config: o as unknown as ConfigMandibula });
      }
      Object.values(o).forEach((v) => recorrer(v, modulo));
    }
  };
  for (const [ruta, json] of Object.entries(contenidos)) recorrer(json, ruta.split('/')[3] ?? ruta);
  return salida;
}

/* ----- Pruebas ----- */

describe('anclas de la mandíbula sobre la malla real', () => {
  it('la tabla generada no está vacía y cubre las piezas del catálogo', () => {
    expect(ids.length).toBeGreaterThanOrEqual(20);
    for (const id of ['condilo', 'apofisis_coronoides', 'rama', 'angulo', 'cuerpo', 'sinfisis']) {
      expect(ESTRUCTURAS_MANDIBULA[id], id).toBeDefined();
    }
  });

  it('cada ancla está sobre la superficie del hueso: a menos de 0,02 y no dentro', () => {
    // 1 unidad = el radio de la mandíbula (75,5 mm): 0,02 son unos 1,5 mm. El cálculo las deja a 0,008 (0,6 mm).
    const fallos: string[] = [];
    for (const id of ids) {
      const e = ESTRUCTURAS_MANDIBULA[id]!;
      const p = puntoDe(e.ancla);
      const { distancia, cerca } = distanciaASuperficie(p);
      const fuera = punto(restar(p, cerca), e.normal); // > 0: del lado exterior de la superficie
      if (distancia > 0.02)
        fallos.push(`${id}: a ${distancia.toFixed(3)} de la superficie (flota)`);
      else if (distancia > 0.004 && fuera < 0)
        fallos.push(`${id}: dentro del hueso (${distancia.toFixed(3)})`);
    }
    expect(fallos).toEqual([]);
  });

  it('las anclas de las piezas del catálogo (lado derecho) también están sobre la superficie', () => {
    for (const [id, ancla] of Object.entries(ANCLAS_PIEZAS_DERECHA)) {
      const { distancia } = distanciaASuperficie(puntoDe(ancla));
      expect(distancia, id).toBeLessThan(0.02);
      expect(ancla.x, `${id} en el lado derecho`).toBeLessThanOrEqual(0.5);
    }
  });

  it('cada ancla está en el lado que dice su tabla (x < 0,5 = derecha del sujeto)', () => {
    for (const id of ids) {
      const { lado, ancla } = ESTRUCTURAS_MANDIBULA[id]!;
      if (lado === 'derecha') expect(ancla.x, id).toBeLessThan(0.5);
      else if (lado === 'izquierda') expect(ancla.x, id).toBeGreaterThan(0.5);
      else expect(ancla.x, id).toBeCloseTo(0.5, 2);
    }
  });

  it('la normal de cada punto es unitaria y su vista es una vista con nombre', () => {
    for (const id of ids) {
      const { normal, vista } = ESTRUCTURAS_MANDIBULA[id]!;
      expect(norma(normal), id).toBeCloseTo(1, 1);
      expect(VISTAS_CAMARA, id).toContain(vista);
    }
  });

  it('la vista recomendada enfoca el punto sin que nada lo tape (móvil y escritorio)', () => {
    const tapados: string[] = [];
    for (const id of ids) {
      const e = ESTRUCTURAS_MANDIBULA[id]!;
      const objetivo = puntoDe(e.ancla);
      for (const aspecto of [0.8, 1.6]) {
        const limites = limitesZoomExploracion(distanciaParaEncajar(1, aspecto));
        const encuadre = calcularEncuadre(
          { centro: objetivo, radio: RADIO_ZONA_ANCLA, vista: e.vista, zoom: 1, aspecto },
          limites,
        );
        const { posicion } = estadoDeEncuadre(encuadre);
        expect(encuadre.objetivo).toEqual(objetivo); // la cámara mira al punto
        const haciaPunto = restar(objetivo, posicion);
        const dist = norma(haciaPunto);
        const dir: Vec3 = [haciaPunto[0] / dist, haciaPunto[1] / dist, haciaPunto[2] / dist];
        const impacto = primerImpacto(posicion, dir);
        if (impacto < dist - 0.03) tapados.push(`${id} desde ${e.vista} (aspecto ${aspecto})`);
      }
    }
    expect(tapados).toEqual([]);
  });

  it('cada estructura se ve desde alguna de las vistas con nombre', () => {
    const invisibles: string[] = [];
    for (const id of ids) {
      const objetivo = puntoDe(ESTRUCTURAS_MANDIBULA[id]!.ancla);
      const visibleDesde = VISTAS_CAMARA.filter((vista) => {
        const { posicion } = estadoDeEncuadre(
          calcularEncuadre({
            centro: objetivo,
            radio: RADIO_ZONA_ANCLA,
            vista,
            zoom: 1,
            aspecto: 1,
          }),
        );
        const h = restar(objetivo, posicion);
        const dist = norma(h);
        return primerImpacto(posicion, [h[0] / dist, h[1] / dist, h[2] / dist]) >= dist - 0.03;
      });
      if (visibleDesde.length === 0) invisibles.push(id);
    }
    expect(invisibles).toEqual([]);
  });
});

describe('vistas mediales: la cara interna de la rama', () => {
  /** Estado de cámara de una vista sobre un punto, con el encuadre real de la escena (nodo por ancla). */
  const camaraDe = (
    objetivo: Vec3,
    vista: 'medial_derecha' | 'medial_izquierda',
    aspecto: number,
  ) =>
    estadoDeEncuadre(
      calcularEncuadre(
        { centro: objetivo, radio: RADIO_ZONA_ANCLA, vista, zoom: 1, aspecto },
        limitesZoomExploracion(distanciaParaEncajar(1, aspecto)),
      ),
    ).posicion;

  const ve = (objetivo: Vec3, posicion: Vec3): boolean => {
    const h = restar(objetivo, posicion);
    const dist = norma(h);
    return primerImpacto(posicion, [h[0] / dist, h[1] / dist, h[2] / dist]) >= dist - 0.03;
  };

  it('el foramen mandibular (cara medial de la rama derecha) recomienda la vista medial derecha', () => {
    expect(ESTRUCTURAS_MANDIBULA.foramen_mandibular!.vista).toBe('medial_derecha');
  });

  it('medial derecha ve el foramen mandibular de frente y la cámara queda dentro del arco (móvil y escritorio)', () => {
    const { ancla, normal } = ESTRUCTURAS_MANDIBULA.foramen_mandibular!;
    const objetivo = puntoDe(ancla);
    for (const aspecto of [0.6, 0.8, 1.6]) {
      const posicion = camaraDe(objetivo, 'medial_derecha', aspecto);
      expect(ve(objetivo, posicion), `aspecto ${aspecto}`).toBe(true);
      // Entre las dos ramas: la caja de la mandíbula mide ±0,7 en X y las caras mediales están hacia ±0,5.
      expect(Math.abs(posicion[0]), `aspecto ${aspecto}`).toBeLessThan(0.45);
      const h = restar(posicion, objetivo);
      const cara = punto(normal, [h[0] / norma(h), h[1] / norma(h), h[2] / norma(h)]);
      expect(cara, `aspecto ${aspecto}`).toBeGreaterThan(0.85);
    }
  });

  it('medial izquierda ve la cara interna de la rama izquierda (el punto simétrico del foramen)', () => {
    const { ancla } = ESTRUCTURAS_MANDIBULA.foramen_mandibular!;
    const objetivo = puntoDe({ ...ancla, x: 1 - ancla.x });
    for (const aspecto of [0.6, 0.8, 1.6]) {
      const posicion = camaraDe(objetivo, 'medial_izquierda', aspecto);
      expect(ve(objetivo, posicion), `aspecto ${aspecto}`).toBe(true);
      expect(Math.abs(posicion[0]), `aspecto ${aspecto}`).toBeLessThan(0.45);
    }
  });

  it('desde fuera (lateral izquierda) el foramen mandibular de la rama derecha queda tapado por la otra rama', () => {
    // Es la razón de ser de las vistas mediales: por eso antes solo lo veía la vista superior.
    const objetivo = puntoDe(ESTRUCTURAS_MANDIBULA.foramen_mandibular!.ancla);
    const { posicion } = estadoDeEncuadre(
      calcularEncuadre({
        centro: objetivo,
        radio: RADIO_ZONA_ANCLA,
        vista: 'lateral_izquierda',
        zoom: 1,
        aspecto: 1,
      }),
    );
    expect(ve(objetivo, posicion)).toBe(false);
  });
});

describe('las anclas del contenido son las calculadas', () => {
  const actividades = actividadesDeMandibula();

  it('hay actividades de la mandíbula en los seis módulos', () => {
    expect(new Set(actividades.map((a) => a.modulo.slice(0, 2))).size).toBe(6);
  });

  it('todo id de mandíbula que usa el contenido tiene su ancla calculada y coincide con la tabla', () => {
    const distintas: string[] = [];
    for (const { modulo, config } of actividades) {
      for (const nodoContenido of config.nodos) {
        const esperado = ESTRUCTURAS_MANDIBULA[nodoContenido.id];
        if (!esperado) {
          distintas.push(`${modulo}/${nodoContenido.id}: sin estructura calculada`);
          continue;
        }
        expect(nodoContenido.ancla, `${modulo}/${nodoContenido.id}`).toEqual(esperado.ancla);
        expect(estructuraDeNodo(nodoContenido.id, nodoContenido.ancla)).toBe(esperado);
      }
    }
    expect(distintas).toEqual([]);
  });

  it('un nodo con otra ancla no hereda la normal ni la vista de la tabla', () => {
    expect(estructuraDeNodo('condilo', { x: 0.5, y: 0.5, z: 0.5 })).toBeNull();
    expect(estructuraDeNodo('condilo', undefined)).toBeNull();
    expect(estructuraDeNodo('constructor', { x: 0, y: 0, z: 0 })).toBeNull();
  });

  it('sin cámara en el contenido, la actividad enfoca cada nodo desde su vista recomendada', () => {
    for (const { modulo, config } of actividades) {
      const { nodos } = prepararExploracion({
        ...config,
        requeridos: [],
      } as unknown as ConfigExploracion3d);
      for (const n of nodos) {
        const original = config.nodos.find((c) => c.id === n.id)!;
        const esperada = original.camara?.vista ?? ESTRUCTURAS_MANDIBULA[n.id]?.vista;
        expect(n.vista, `${modulo}/${n.id}`).toBe(esperada);
      }
    }
  });
});
