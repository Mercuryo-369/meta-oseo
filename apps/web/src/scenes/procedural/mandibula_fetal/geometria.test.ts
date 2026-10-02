/**
 * Pruebas de las formas de la escena de la mandíbula fetal sin WebGL (three crea las geometrías en memoria):
 * barridos válidos, sin NaN en todo el recorrido del tiempo, presupuesto de polígonos, determinismo, liberación
 * de recursos y visibilidad de cada pieza por fase.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, Mesh } from 'three';
import { perfilCuerpo } from './disposicion';
import { HITOS_MANDIBULA_FETAL, estadoMandibulaFetal } from './estado';
import { Barrido, perfilCirculo, placaExtruida } from './geometria';
import {
  CartilagoMeckel,
  Condensacion,
  HuesoMandibular,
  Mesenquima,
  NervioAlveolar,
} from './mallas';
import type { PiezaMandibulaFetal } from './mallas';

const TIEMPOS = Array.from({ length: 41 }, (_, i) => i / 40);

function sinNaN(datos: ArrayLike<number>): boolean {
  for (let i = 0; i < datos.length; i++) if (!Number.isFinite(datos[i]!)) return false;
  return true;
}

function geometriasDe(grupo: Group): BufferGeometry[] {
  const lista: BufferGeometry[] = [];
  grupo.traverse((o) => {
    const g = (o as Mesh).geometry as BufferGeometry | undefined;
    if (g && !lista.includes(g)) lista.push(g);
  });
  return lista;
}

/** Triángulos dibujados (las instancias cuentan tantas veces como instancias tienen). */
function triangulos(grupo: Group): number {
  let suma = 0;
  grupo.traverse((o) => {
    const malla = o as Mesh & { count?: number; isInstancedMesh?: boolean };
    const g = malla.geometry as BufferGeometry | undefined;
    if (!g) return;
    const tris = (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
    suma += tris * (malla.isInstancedMesh ? (malla.count ?? 1) : 1);
  });
  return suma;
}

/** Mallas que se dibujan (visibles, con todos sus ancestros visibles): una llamada de dibujo cada una. */
function llamadasDeDibujo(grupos: Group[]): number {
  let n = 0;
  for (const raiz of grupos) {
    raiz.traverse((o) => {
      if (!(o as Mesh).isMesh) return;
      let visible = true;
      for (let p: typeof o | null = o; p; p = p.parent) visible &&= p.visible;
      if (visible) n++;
    });
  }
  return n;
}

describe('Barrido', () => {
  it('reserva anillos y tapas por tramo, con índices válidos y sin NaN una vez escrito', () => {
    const perfil = perfilCirculo(0.5, 8);
    const b = new Barrido(
      8,
      [
        { segmentos: 10, tapas: true },
        { segmentos: 4, tapas: false },
      ],
      perfil,
    );
    expect(b.numeroTramos).toBe(2);
    const vertices = b.geometria.getAttribute('position').count;
    expect(vertices).toBe(11 * 8 + 2 * 8 + 5 * 8);
    const indices = b.geometria.getIndex()!.array;
    for (let i = 0; i < indices.length; i++) expect(indices[i]!).toBeLessThan(vertices);
    b.escribirTramo(0, (i) => ({ centro: [i, 0, 0], n: [0, 0, 1], perfil }));
    b.escribirTramo(1, (i) => ({ centro: [0, i, 5], n: [1, 0, 0], perfil }));
    b.terminar();
    expect(sinNaN(b.geometria.getAttribute('position').array)).toBe(true);
    expect(sinNaN(b.geometria.getAttribute('normal').array)).toBe(true);
    b.liberar();
  });

  it('un tramo con tapas tiene más triángulos que uno sin ellas', () => {
    const con = new Barrido(8, [{ segmentos: 6, tapas: true }]);
    const sin = new Barrido(8, [{ segmentos: 6, tapas: false }]);
    expect(con.geometria.getIndex()!.count).toBeGreaterThan(sin.geometria.getIndex()!.count);
    con.liberar();
    sin.liberar();
  });

  it('triangula la tapa del perfil en U del cuerpo', () => {
    const perfil = perfilCuerpo(1);
    const b = new Barrido(perfil.length, [{ segmentos: 2, tapas: true }], perfil);
    // Un polígono simple de n lados se triangula en n - 2 triángulos, por dos tapas.
    const trisTapas = (b.geometria.getIndex()!.count - 2 * perfil.length * 6) / 3;
    expect(trisTapas).toBe(2 * (perfil.length - 2));
    b.liberar();
  });

  it('escribir un tramo que no existe falla con claridad', () => {
    const b = new Barrido(6, [{ segmentos: 2, tapas: false }]);
    expect(() =>
      b.escribirTramo(3, () => ({ centro: [0, 0, 0], n: [1, 0, 0], perfil: [] })),
    ).toThrow(/tramo/);
    b.liberar();
  });
});

describe('placaExtruida', () => {
  it('extruye la silueta a lo largo de X, centrada, con la forma en el plano (z, y)', () => {
    const g = placaExtruida(
      [
        [0, 0],
        [1, 0],
        [1, 2],
        [0, 2],
      ],
      0.4,
    );
    g.computeBoundingBox();
    const caja = g.boundingBox!;
    expect(caja.min.x).toBeCloseTo(-0.2, 6);
    expect(caja.max.x).toBeCloseTo(0.2, 6);
    expect(caja.min.z).toBeCloseTo(0, 6);
    expect(caja.max.z).toBeCloseTo(1, 6);
    expect(caja.max.y).toBeCloseTo(2, 6);
    g.dispose();
  });
});

describe.each<[string, () => PiezaMandibulaFetal, number]>([
  ['Mesenquima', () => new Mesenquima(), 12_000],
  ['CartilagoMeckel', () => new CartilagoMeckel(), 3_500],
  ['NervioAlveolar', () => new NervioAlveolar(), 2_500],
  ['Condensacion', () => new Condensacion(), 4_000],
  ['HuesoMandibular', () => new HuesoMandibular(), 14_000],
])('%s', (_, crear, presupuesto) => {
  it('cabe en el presupuesto de polígonos', () => {
    const pieza = crear();
    expect(triangulos(pieza.grupo)).toBeGreaterThan(50);
    expect(triangulos(pieza.grupo)).toBeLessThan(presupuesto);
    pieza.liberar();
  });

  it('no produce NaN en ningún instante ni deja posiciones o escalas inválidas', () => {
    const pieza = crear();
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoMandibulaFetal(t));
      pieza.grupo.traverse((o) => {
        for (const v of [
          o.position.x,
          o.position.y,
          o.position.z,
          o.scale.x,
          o.scale.y,
          o.scale.z,
        ]) {
          expect(Number.isFinite(v), `t = ${t}`).toBe(true);
        }
      });
      for (const g of geometriasDe(pieza.grupo)) {
        expect(sinNaN(g.getAttribute('position').array), `t = ${t}`).toBe(true);
      }
    }
    pieza.liberar();
  });

  it('actualizar es determinista: la misma t da lo mismo, vaya lo que vaya antes', () => {
    const pieza = crear();
    const foto = (): number[] => {
      const datos: number[] = [];
      pieza.grupo.traverse((o) => {
        datos.push(o.visible ? 1 : 0, o.scale.x, o.scale.y, o.position.y);
        const m = o as Mesh & { instanceMatrix?: { array: ArrayLike<number> } };
        if (m.instanceMatrix) datos.push(...Array.from(m.instanceMatrix.array));
      });
      for (const g of geometriasDe(pieza.grupo))
        datos.push(...Array.from(g.getAttribute('position').array));
      return datos;
    };
    pieza.actualizar(estadoMandibulaFetal(0.61));
    const antes = foto();
    pieza.actualizar(estadoMandibulaFetal(0.05));
    pieza.actualizar(estadoMandibulaFetal(0.97));
    pieza.actualizar(estadoMandibulaFetal(0.61));
    expect(foto()).toEqual(antes);
    pieza.liberar();
  });

  it('libera las geometrías al terminar', () => {
    const pieza = crear();
    let liberadas = 0;
    for (const g of geometriasDe(pieza.grupo)) g.addEventListener('dispose', () => liberadas++);
    pieza.liberar();
    expect(liberadas).toBeGreaterThan(0);
  });
});

describe('la escena completa', () => {
  const crearTodas = () => [
    new Mesenquima(),
    new CartilagoMeckel(),
    new NervioAlveolar(),
    new Condensacion(),
    new HuesoMandibular(),
  ];

  it('en el peor instante cabe en 40 000 triángulos y 40 llamadas de dibujo', () => {
    const piezas = crearTodas();
    for (const t of TIEMPOS) {
      for (const p of piezas) p.actualizar(estadoMandibulaFetal(t));
      const visibles = piezas.filter((p) => p.grupo.visible);
      expect(visibles.reduce((s, p) => s + triangulos(p.grupo), 0)).toBeLessThan(40_000);
      expect(llamadasDeDibujo(piezas.map((p) => p.grupo))).toBeLessThan(40);
    }
    for (const p of piezas) p.liberar();
  });

  it('visibilidad por fase: mesénquima y Meckel al principio; hueso, rama y cartílagos al final', () => {
    const [mesenquima, meckel, nervio, condensacion, hueso] = crearTodas();
    const todas = [mesenquima!, meckel!, nervio!, condensacion!, hueso!];
    const visibles = (t: number) => {
      for (const p of todas) p.actualizar(estadoMandibulaFetal(t));
      return todas.map((p) => p.grupo.visible);
    };
    expect(visibles(HITOS_MANDIBULA_FETAL.mesenquima)).toEqual([true, true, true, false, false]);
    expect(visibles(HITOS_MANDIBULA_FETAL.condensacion)).toEqual([true, true, true, true, false]);
    expect(visibles(HITOS_MANDIBULA_FETAL.centro)).toEqual([true, true, true, true, true]);
    expect(visibles(HITOS_MANDIBULA_FETAL.extension)).toEqual([true, true, true, false, true]);
    expect(visibles(HITOS_MANDIBULA_FETAL.nacimiento)).toEqual([false, true, true, false, true]);
    for (const p of todas) p.liberar();
  });

  it('el cuerpo óseo crece: cuanto más tarde, más extenso en el espacio', () => {
    const hueso = new HuesoMandibular();
    const extension = (t: number): number => {
      hueso.actualizar(estadoMandibulaFetal(t));
      const g = geometriasDe(hueso.grupo)[0]!;
      g.computeBoundingBox();
      return g.boundingBox!.max.z - g.boundingBox!.min.z;
    };
    const centro = extension(HITOS_MANDIBULA_FETAL.centro);
    const medio = extension(HITOS_MANDIBULA_FETAL.extension);
    const completo = extension(HITOS_MANDIBULA_FETAL.nacimiento);
    expect(centro).toBeLessThan(medio);
    expect(medio).toBeLessThan(completo);
    expect(completo).toBeGreaterThan(4);
    hueso.liberar();
  });
});
