/**
 * Pruebas de las formas de la escena de las dos rutas sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo, presupuesto de polígonos y de llamadas de dibujo, liberación
 * de recursos, determinismo y visibilidad por fase.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, Mesh, Object3D } from 'three';
import { HITOS_DOS_RUTAS, estadoDosRutas } from './estado';
import { anilloAbierto, aro, caja, cilindro, esfera, tramo } from './geometria';
import { FORMA, LadoEndocondral, LadoIntramembranoso, llegada } from './mallas';
import type { LadoDosRutas } from './mallas';

const TIEMPOS = Array.from({ length: 41 }, (_, i) => i / 40);
/** Presupuesto de la escena completa en el peor instante. */
const PRESUPUESTO = { triangulos: 40_000, llamadas: 40 } as const;

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

function esVisible(o: Object3D): boolean {
  let p: Object3D | null = o;
  while (p) {
    if (!p.visible) return false;
    p = p.parent;
  }
  return true;
}

/** Triángulos dibujados y llamadas de dibujo (objetos con geometría visibles; las instancias cuentan todas). */
function medir(grupos: readonly Group[]): { triangulos: number; llamadas: number } {
  let triangulos = 0;
  let llamadas = 0;
  for (const grupo of grupos) {
    grupo.traverse((o) => {
      const g = (o as Mesh).geometry as BufferGeometry | undefined;
      if (!g || !esVisible(o)) return;
      llamadas++;
      const porInstancia = (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
      const instancias = (o as { isInstancedMesh?: boolean; count?: number }).isInstancedMesh
        ? ((o as { count?: number }).count ?? 1)
        : 1;
      triangulos += porInstancia * instancias;
    });
  }
  return { triangulos, llamadas };
}

function buscar(grupo: Group, nombre: string): Object3D {
  const o = grupo.getObjectByName(nombre);
  if (!o) throw new Error(`No existe el objeto ${nombre}`);
  return o;
}

/** Cuántas instancias de una malla instanciada están a la vista (matriz no nula). */
function instanciasVisibles(o: Object3D): number {
  const im = (o as { instanceMatrix?: { array: ArrayLike<number> } }).instanceMatrix;
  if (!im) return 0;
  let n = 0;
  for (let i = 0; i + 15 < im.array.length; i += 16) {
    if (im.array[i] !== 0 || im.array[i + 5] !== 0 || im.array[i + 10] !== 0) n++;
  }
  return n;
}

describe('formas básicas', () => {
  it.each<[string, () => BufferGeometry]>([
    ['esfera', () => esfera()],
    ['caja', caja],
    ['tramo', () => tramo()],
    ['cilindro', () => cilindro()],
    ['anilloAbierto', () => anilloAbierto(0.43, 0.54)],
    ['aro', () => aro(0.06, 0.1)],
  ])('%s es válida, sin NaN y con índices dentro de rango', (_, crear) => {
    const g = crear();
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    const indices = g.getIndex()?.array;
    if (indices) {
      const vertices = g.getAttribute('position').count;
      for (let i = 0; i < indices.length; i++) expect(indices[i]!).toBeLessThan(vertices);
    }
    g.dispose();
  });

  it('el tramo nace en el origen y crece hacia +Y; el anillo abierto deja libre la cara que mira a la cámara', () => {
    const t = tramo();
    t.computeBoundingBox();
    expect(t.boundingBox!.min.y).toBeCloseTo(0, 5);
    expect(t.boundingBox!.max.y).toBeCloseTo(1, 5);
    const a = anilloAbierto(0.43, 0.54);
    const pos = a.getAttribute('position');
    // Ningún vértice del anillo queda en el sector abierto (z > 0 y |x| pequeño, mirando a +Z).
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (z > 0.3) expect(Math.abs(x)).toBeGreaterThan(0.2);
    }
  });
});

describe('llegada y formas celulares', () => {
  it('las células con más retraso empiezan a condensarse más tarde y todas llegan al final', () => {
    expect(llegada(0, 0)).toBe(0);
    expect(llegada(0, 1)).toBe(0);
    expect(llegada(1, 0)).toBe(1);
    expect(llegada(1, 1)).toBe(1);
    expect(llegada(0.3, 0)).toBeGreaterThan(llegada(0.3, 1));
  });

  it('la célula fusiforme es más larga que alta; osteoblasto y condrocito, redondeados; osteocito, pequeño', () => {
    expect(FORMA.fusiforme[0]).toBeGreaterThan(FORMA.fusiforme[1] * 3);
    expect(Math.abs(FORMA.osteoblasto[0] - FORMA.osteoblasto[1])).toBeLessThan(0.02);
    expect(FORMA.condrocito[0]).toBe(FORMA.condrocito[1]);
    expect(FORMA.osteocito[1]).toBeLessThan(FORMA.osteoblasto[1]);
    expect(FORMA.revestimiento[1]).toBeLessThan(FORMA.osteoblasto[1] / 2);
  });
});

describe.each<[string, () => LadoDosRutas]>([
  ['LadoIntramembranoso', () => new LadoIntramembranoso()],
  ['LadoEndocondral', () => new LadoEndocondral()],
])('%s', (_, crear) => {
  it('no produce NaN en ningún instante ni deja posiciones o escalas inválidas', () => {
    const lado = crear();
    for (const t of TIEMPOS) {
      lado.actualizar(estadoDosRutas(t));
      lado.grupo.traverse((o) => {
        for (const v of [
          o.position.x,
          o.position.y,
          o.position.z,
          o.scale.x,
          o.scale.y,
          o.scale.z,
        ]) {
          expect(Number.isFinite(v), `t = ${t}, ${o.name}`).toBe(true);
        }
        const im = (o as { instanceMatrix?: { array: ArrayLike<number> } }).instanceMatrix;
        if (im) expect(sinNaN(im.array), `t = ${t}, ${o.name}`).toBe(true);
        const ic = (o as { instanceColor?: { array: ArrayLike<number> } | null }).instanceColor;
        if (ic) expect(sinNaN(ic.array), `t = ${t}, ${o.name}`).toBe(true);
      });
    }
    for (const g of geometriasDe(lado.grupo)) {
      expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    }
    lado.liberar();
  });

  it('actualizar es determinista: la misma t da lo mismo, vaya lo que vaya antes', () => {
    const lado = crear();
    const foto = (): unknown[] => {
      const lista: unknown[] = [];
      lado.grupo.traverse((o) =>
        lista.push(
          o.visible,
          o.position.toArray(),
          o.scale.toArray(),
          Array.from(
            (o as { instanceMatrix?: { array: ArrayLike<number> } }).instanceMatrix?.array ?? [],
          ),
        ),
      );
      return lista;
    };
    lado.actualizar(estadoDosRutas(0.61));
    const antes = foto();
    lado.actualizar(estadoDosRutas(0.05));
    lado.actualizar(estadoDosRutas(0.97));
    lado.actualizar(estadoDosRutas(0.61));
    expect(foto()).toEqual(antes);
    lado.liberar();
  });

  it('libera las geometrías al terminar', () => {
    const lado = crear();
    let liberadas = 0;
    for (const g of geometriasDe(lado.grupo)) g.addEventListener('dispose', () => liberadas++);
    lado.liberar();
    expect(liberadas).toBeGreaterThan(0);
  });
});

describe('presupuesto de la escena completa', () => {
  it('cabe en el presupuesto de triángulos y de llamadas de dibujo en el peor instante', () => {
    const izquierda = new LadoIntramembranoso();
    const derecha = new LadoEndocondral();
    let peor = { triangulos: 0, llamadas: 0 };
    for (const t of TIEMPOS) {
      const e = estadoDosRutas(t);
      izquierda.actualizar(e);
      derecha.actualizar(e);
      const m = medir([izquierda.grupo, derecha.grupo]);
      peor = {
        triangulos: Math.max(peor.triangulos, m.triangulos),
        llamadas: Math.max(peor.llamadas, m.llamadas),
      };
    }
    expect(peor.triangulos).toBeGreaterThan(1000);
    expect(peor.triangulos).toBeLessThan(PRESUPUESTO.triangulos);
    expect(peor.llamadas).toBeLessThan(PRESUPUESTO.llamadas);
    izquierda.liberar();
    derecha.liberar();
  });

  it('los dos lados quedan uno a cada lado del centro, con un hueco entre ellos', () => {
    const izquierda = new LadoIntramembranoso();
    const derecha = new LadoEndocondral();
    expect(izquierda.grupo.position.x).toBeLessThan(-1);
    expect(derecha.grupo.position.x).toBeGreaterThan(1);
    expect(derecha.grupo.position.x - izquierda.grupo.position.x).toBeGreaterThan(3.6);
    izquierda.liberar();
    derecha.liberar();
  });
});

describe('visibilidad por fase', () => {
  const izquierda = new LadoIntramembranoso();
  const derecha = new LadoEndocondral();
  const poner = (t: number): void => {
    const e = estadoDosRutas(t);
    izquierda.actualizar(e);
    derecha.actualizar(e);
  };

  it('mesenquima: solo mesénquima y células; sin osteoide, espículas, molde ni collar', () => {
    poner(HITOS_DOS_RUTAS.mesenquima);
    expect(buscar(izquierda.grupo, 'mesenquima').visible).toBe(true);
    expect(instanciasVisibles(buscar(izquierda.grupo, 'celulas'))).toBe(64);
    expect(buscar(izquierda.grupo, 'osteoide').visible).toBe(false);
    expect(buscar(izquierda.grupo, 'espiculas').visible).toBe(false);
    expect(buscar(izquierda.grupo, 'vasos').visible).toBe(false);
    expect(buscar(izquierda.grupo, 'tabla_superior').visible).toBe(false);
    expect(buscar(derecha.grupo, 'cartilago_superior').visible).toBe(false);
    expect(buscar(derecha.grupo, 'epifisis_superior').visible).toBe(false);
    expect(buscar(derecha.grupo, 'lagunas').visible).toBe(false);
    expect(buscar(derecha.grupo, 'collar_periostico').visible).toBe(false);
  });

  it('diferenciacion: osteoide a la izquierda; molde, lagunas y pericondrio a la derecha, sin calcificar', () => {
    poner(HITOS_DOS_RUTAS.diferenciacion);
    expect(buscar(izquierda.grupo, 'osteoide').visible).toBe(true);
    expect(buscar(izquierda.grupo, 'espiculas').visible).toBe(false);
    expect(buscar(derecha.grupo, 'cartilago_superior').visible).toBe(true);
    expect(buscar(derecha.grupo, 'epifisis_inferior').visible).toBe(true);
    expect(buscar(derecha.grupo, 'pericondrio').visible).toBe(true);
    expect(buscar(derecha.grupo, 'lagunas').visible).toBe(true);
    expect(buscar(derecha.grupo, 'cartilago_calcificado_superior').visible).toBe(false);
    expect(buscar(derecha.grupo, 'collar_periostico').visible).toBe(false);
  });

  it('crecimiento: espículas a la izquierda; calcificado y collar a la derecha, sin yema ni trabéculas', () => {
    poner(HITOS_DOS_RUTAS.crecimiento);
    expect(buscar(izquierda.grupo, 'espiculas').visible).toBe(true);
    expect(instanciasVisibles(buscar(izquierda.grupo, 'espiculas'))).toBeGreaterThan(10);
    expect(buscar(izquierda.grupo, 'vasos').visible).toBe(false);
    expect(buscar(derecha.grupo, 'cartilago_calcificado_superior').visible).toBe(true);
    expect(buscar(derecha.grupo, 'collar_periostico').visible).toBe(true);
    expect(buscar(derecha.grupo, 'yema_periostica').visible).toBe(false);
    expect(buscar(derecha.grupo, 'trabeculas_centro').visible).toBe(false);
  });

  it('vascularizacion: vasos y médula a la izquierda; yema, vaso medular, trabéculas y osteoclastos a la derecha', () => {
    poner(HITOS_DOS_RUTAS.vascularizacion);
    expect(buscar(izquierda.grupo, 'vasos').visible).toBe(true);
    expect(buscar(izquierda.grupo, 'medula').visible).toBe(true);
    expect(buscar(izquierda.grupo, 'tabla_superior').visible).toBe(false);
    expect(buscar(derecha.grupo, 'yema_periostica').visible).toBe(true);
    expect(buscar(derecha.grupo, 'vaso_medular').visible).toBe(true);
    expect(buscar(derecha.grupo, 'trabeculas_centro').visible).toBe(true);
    expect(buscar(derecha.grupo, 'osteoclastos').visible).toBe(true);
    expect(buscar(derecha.grupo, 'centro_secundario_superior').visible).toBe(false);
    // Los condrocitos del centro ya no están; los de los extremos sí.
    const visibles = instanciasVisibles(buscar(derecha.grupo, 'celulas'));
    expect(visibles).toBeGreaterThan(30);
    expect(visibles).toBeLessThan(72);
  });

  it('hueso_primario: tablas a la izquierda; centros secundarios a la derecha; el mesénquima ya no se ve', () => {
    poner(HITOS_DOS_RUTAS.hueso_primario);
    expect(buscar(izquierda.grupo, 'tabla_superior').visible).toBe(true);
    expect(buscar(izquierda.grupo, 'tabla_inferior').visible).toBe(true);
    expect(buscar(izquierda.grupo, 'osteonas').visible).toBe(false);
    expect(buscar(izquierda.grupo, 'mesenquima').visible).toBe(false);
    expect(buscar(derecha.grupo, 'centro_secundario_superior').visible).toBe(true);
    expect(buscar(derecha.grupo, 'cavidad_medular').visible).toBe(false);
  });

  it('remodelado: osteonas y laminillas; cortical, cavidad medular y sin osteoclastos', () => {
    poner(HITOS_DOS_RUTAS.remodelado);
    expect(buscar(izquierda.grupo, 'osteonas').visible).toBe(true);
    expect(buscar(izquierda.grupo, 'laminillas').visible).toBe(true);
    expect(buscar(derecha.grupo, 'cortical').visible).toBe(true);
    expect(buscar(derecha.grupo, 'cavidad_medular').visible).toBe(true);
    expect(buscar(derecha.grupo, 'osteoclastos').visible).toBe(false);
    // Queda cartílago en los extremos (placa de crecimiento y cartílago articular): aún hay condrocitos.
    expect(instanciasVisibles(buscar(derecha.grupo, 'celulas'))).toBeGreaterThan(5);
    izquierda.liberar();
    derecha.liberar();
  });
});
