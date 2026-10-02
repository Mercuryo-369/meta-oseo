/**
 * Pruebas de las formas de la escena del osteoblasto sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo, presupuesto de polígonos y de llamadas de dibujo, liberación
 * de recursos y visibilidad por fase.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, Mesh, Object3D } from 'three';
import { HITOS_OSTEOBLASTO, DESTINOS, CELULA_FOCO, estadoOsteoblasto } from './estado';
import { caja, cuerpoCelular, disco, esfera, tubo } from './geometria';
import { FilaCelular, SuperficieOsea, formaDeCelula } from './mallas';
import type { PiezaOsteoblasto } from './mallas';

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
    if (g) lista.push(g);
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

describe('formas básicas', () => {
  it.each<[string, () => BufferGeometry]>([
    ['caja', caja],
    ['cuerpoCelular', () => cuerpoCelular()],
    ['esfera', () => esfera()],
    ['tubo', () => tubo(0.2, 8)],
    ['disco', () => disco()],
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

  it('el cuerpo celular tiene semiejes 1 y el tubo va tumbado a lo largo de X', () => {
    const c = cuerpoCelular();
    c.computeBoundingBox();
    expect(c.boundingBox!.max.x).toBeCloseTo(1, 5);
    expect(c.boundingBox!.min.y).toBeCloseTo(-1, 5);
    const t = tubo(0.2, 8);
    t.computeBoundingBox();
    expect(t.boundingBox!.max.x).toBeCloseTo(4, 5);
    expect(t.boundingBox!.max.y).toBeCloseTo(0.2, 1);
  });
});

describe('formaDeCelula', () => {
  const base = { presencia: 1, cubico: 0, aplanado: 0, hundido: 0, encogido: 0, x: 0, ancho: 1 };

  it('fusiforme: más ancha que alta; cúbica: semiejes parecidos; revestimiento: plana; osteocito: pequeño', () => {
    const fusiforme = formaDeCelula(base).semiejes;
    expect(fusiforme[0]).toBeGreaterThan(fusiforme[1] * 4);
    const cubica = formaDeCelula({ ...base, cubico: 1 }).semiejes;
    expect(Math.abs(cubica[0] - cubica[1])).toBeLessThan(0.1);
    const plana = formaDeCelula({ ...base, cubico: 1, aplanado: 1 }).semiejes;
    expect(plana[1]).toBeLessThan(0.1);
    const osteocito = formaDeCelula({ ...base, cubico: 1, hundido: 1 }).semiejes;
    expect(osteocito[1]).toBeLessThan(cubica[1] / 2);
  });

  it('el núcleo del osteoblasto es excéntrico hacia arriba y cabe en el cuerpo', () => {
    const { semiejes, nucleo } = formaDeCelula({ ...base, cubico: 1 });
    expect(nucleo.y).toBeGreaterThan(0.1);
    expect(nucleo.y + nucleo.semiejes[1]).toBeLessThanOrEqual(semiejes[1]);
  });

  it('la apoptosis encoge cuerpo y núcleo', () => {
    const intacta = formaDeCelula({ ...base, cubico: 1 });
    const encogida = formaDeCelula({ ...base, cubico: 1, encogido: 1 });
    expect(encogida.semiejes[0]).toBeLessThan(intacta.semiejes[0] * 0.3);
    expect(encogida.nucleo.semiejes[0]).toBeLessThan(intacta.nucleo.semiejes[0]);
  });
});

describe.each<[string, () => PiezaOsteoblasto]>([
  ['SuperficieOsea', () => new SuperficieOsea()],
  ['FilaCelular', () => new FilaCelular()],
])('%s', (_, crear) => {
  it('no produce NaN en ningún instante ni deja posiciones o escalas inválidas', () => {
    const pieza = crear();
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoOsteoblasto(t));
      pieza.grupo.traverse((o) => {
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
      });
    }
    for (const g of geometriasDe(pieza.grupo)) {
      expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    }
    pieza.liberar();
  });

  it('actualizar es determinista: la misma t da lo mismo, vaya lo que vaya antes', () => {
    const pieza = crear();
    const foto = (): unknown[] => {
      const lista: unknown[] = [];
      pieza.grupo.traverse((o) =>
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
    pieza.actualizar(estadoOsteoblasto(0.61));
    const antes = foto();
    pieza.actualizar(estadoOsteoblasto(0.05));
    pieza.actualizar(estadoOsteoblasto(0.97));
    pieza.actualizar(estadoOsteoblasto(0.61));
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

describe('presupuesto de la escena completa', () => {
  it('cabe en el presupuesto de triángulos y de llamadas de dibujo en el peor instante', () => {
    const superficie = new SuperficieOsea();
    const fila = new FilaCelular();
    let peor = { triangulos: 0, llamadas: 0 };
    for (const t of TIEMPOS) {
      const e = estadoOsteoblasto(t);
      superficie.actualizar(e);
      fila.actualizar(e);
      const m = medir([superficie.grupo, fila.grupo]);
      peor = {
        triangulos: Math.max(peor.triangulos, m.triangulos),
        llamadas: Math.max(peor.llamadas, m.llamadas),
      };
    }
    expect(peor.triangulos).toBeGreaterThan(1000);
    expect(peor.triangulos).toBeLessThan(PRESUPUESTO.triangulos);
    expect(peor.llamadas).toBeLessThan(PRESUPUESTO.llamadas);
    superficie.liberar();
    fila.liberar();
  });
});

describe('visibilidad por fase', () => {
  const superficie = new SuperficieOsea();
  const fila = new FilaCelular();
  const poner = (t: number): void => {
    const e = estadoOsteoblasto(t);
    superficie.actualizar(e);
    fila.actualizar(e);
  };

  it('precursor: solo la protagonista; sin hueso nuevo, orgánulos, laguna ni fragmentos', () => {
    poner(HITOS_OSTEOBLASTO.precursor);
    for (let k = 0; k < 5; k++) {
      expect(buscar(fila.grupo, `celula_${k}`).visible).toBe(k === CELULA_FOCO);
    }
    expect(buscar(superficie.grupo, 'hueso_nuevo').visible).toBe(false);
    expect(buscar(superficie.grupo, 'osteoide').visible).toBe(true);
    expect(buscar(superficie.grupo, 'corte_laguna').visible).toBe(false);
    expect(buscar(fila.grupo, 'reticulo_y_golgi').visible).toBe(false);
    expect(buscar(fila.grupo, 'cuerpos_apoptoticos').visible).toBe(false);
  });

  it('organulos: retículo, Golgi y mitocondrias a la vista dentro de la protagonista', () => {
    poner(HITOS_OSTEOBLASTO.organulos);
    expect(buscar(fila.grupo, 'reticulo_y_golgi').visible).toBe(true);
    expect(buscar(fila.grupo, 'mitocondrias_y_vesiculas').visible).toBe(true);
    for (let k = 0; k < 5; k++) expect(buscar(fila.grupo, `celula_${k}`).visible).toBe(true);
  });

  it('mineralizacion: hueso nuevo y frente visibles; orgánulos ya no', () => {
    poner(HITOS_OSTEOBLASTO.mineralizacion);
    expect(buscar(superficie.grupo, 'hueso_nuevo').visible).toBe(true);
    expect(buscar(superficie.grupo, 'frente_mineralizacion').visible).toBe(true);
    expect(buscar(fila.grupo, 'reticulo_y_golgi').visible).toBe(false);
  });

  it('destino: laguna en la cara y fragmentos; reposo: la célula apoptótica ya no está', () => {
    poner(HITOS_OSTEOBLASTO.destino);
    expect(buscar(superficie.grupo, 'corte_laguna').visible).toBe(true);
    expect(buscar(fila.grupo, 'cuerpos_apoptoticos').visible).toBe(true);
    poner(HITOS_OSTEOBLASTO.reposo);
    expect(buscar(fila.grupo, `celula_${DESTINOS.apoptosis}`).visible).toBe(false);
    expect(buscar(fila.grupo, 'cuerpos_apoptoticos').visible).toBe(false);
    expect(buscar(superficie.grupo, 'corte_laguna').visible).toBe(true);
    expect(buscar(superficie.grupo, 'frente_mineralizacion').visible).toBe(true);
    // La célula osteocito sigue "presente" (hundida en la matriz) y las de revestimiento son planas.
    expect(buscar(fila.grupo, `celula_${DESTINOS.osteocito}`).visible).toBe(true);
    const plana = buscar(fila.grupo, `celula_${DESTINOS.revestimiento}`);
    expect(plana.scale.y).toBeLessThan(0.1);
    superficie.liberar();
    fila.liberar();
  });
});
