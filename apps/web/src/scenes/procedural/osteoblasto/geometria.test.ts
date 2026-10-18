/**
 * Pruebas de las formas de la escena del osteoblasto sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo, presupuesto de polígonos y de llamadas de dibujo, liberación
 * de recursos y visibilidad por fase.
 */
import { describe, expect, it } from 'vitest';
import { DoubleSide } from 'three';
import type { BufferGeometry, Group, InstancedMesh, Material, Mesh, Object3D } from 'three';
import { HITOS_OSTEOBLASTO, DESTINOS, CELULA_FOCO, estadoOsteoblasto } from './estado';
import {
  caja,
  cajaEnEscala,
  cisterna,
  cuerpoCelular,
  disco,
  esfera,
  ribosoma,
  tubo,
} from './geometria';
import { FilaCelular, SuperficieOsea, formaDeCelula } from './mallas';
import type { PiezaOsteoblasto } from './mallas';

const TIEMPOS = Array.from({ length: 41 }, (_, i) => i / 40);
/** Presupuesto de la escena completa en el peor instante (pase principal y pase de sombras). */
const PRESUPUESTO = {
  triangulos: 40_000,
  llamadas: 40,
  triangulosSombra: 40_000,
  llamadasSombra: 40,
} as const;

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

interface Dibujo {
  llamadas: number;
  triangulos: number;
  llamadasSombra: number;
  triangulosSombra: number;
}

/**
 * Lo que se dibuja de verdad (revisión de diseño, 2026-10-17): una llamada por objeto visible (mallas y líneas) y
 * dos si su material es transparente y de doble cara sin `forceSinglePass` (three lo parte en dos pasadas, cara
 * de atrás y cara de delante); los triángulos de cada malla por TODAS sus instancias (las ocultas, de matriz
 * nula, también pasan por la GPU) y por sus pasadas. Las líneas no suman triángulos. Aparte, el pase de sombras:
 * las mallas que las proyectan según la regla de `EntornoRealista` (opacas o con opacidad > 0,9 y sin
 * `userData.sinSombra`).
 */
function medir(grupos: readonly Group[]): Dibujo {
  const d: Dibujo = { llamadas: 0, triangulos: 0, llamadasSombra: 0, triangulosSombra: 0 };
  for (const grupo of grupos) {
    grupo.traverse((o) => {
      const g = (o as Mesh).geometry as BufferGeometry | undefined;
      if (!g || !esVisible(o)) return;
      const m = (o as Mesh).material as Material;
      const pasadas = m.transparent && m.side === DoubleSide && !m.forceSinglePass ? 2 : 1;
      d.llamadas += pasadas;
      if (!(o as Mesh).isMesh) return;
      const porInstancia = (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
      const instancias = (o as InstancedMesh).isInstancedMesh ? (o as InstancedMesh).count : 1;
      d.triangulos += porInstancia * instancias * pasadas;
      if (!o.userData.sinSombra && (!m.transparent || m.opacity > 0.9)) {
        d.llamadasSombra++;
        d.triangulosSombra += porInstancia * instancias;
      }
    });
  }
  return d;
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
    ['cajaEnEscala', () => cajaEnEscala([8, 1.5, 3], true)],
    ['cisterna', () => cisterna()],
    ['ribosoma', () => ribosoma()],
  ])('%s es válida, sin NaN, con UV y con índices dentro de rango', (_, crear) => {
    const g = crear();
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    // El relieve de los materiales orgánicos necesita UV.
    expect(g.getAttribute('uv')?.count).toBe(g.getAttribute('position').count);
    expect(sinNaN(g.getAttribute('uv').array)).toBe(true);
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

  it('las UV de cajaEnEscala van en unidades de escena: la cara de 8 de ancho recorre 8 en U', () => {
    const g = cajaEnEscala([8, 1.5, 3]);
    const uv = g.getAttribute('uv');
    const normal = g.getAttribute('normal');
    let minU = Infinity;
    let maxU = -Infinity;
    for (let i = 0; i < uv.count; i++) {
      if (normal.getZ(i) < 0.9) continue; // cara de corte (+Z)
      minU = Math.min(minU, uv.getX(i));
      maxU = Math.max(maxU, uv.getX(i));
    }
    expect(maxU - minU).toBeCloseTo(8, 5);
    // Girada, la U recorre el alto y la V el ancho (vetas a lo largo de X).
    const girada = cajaEnEscala([8, 1.5, 3], true).getAttribute('uv');
    let maxV = -Infinity;
    for (let i = 0; i < girada.count; i++) maxV = Math.max(maxV, girada.getY(i));
    expect(maxV).toBeCloseTo(4, 5);
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
  it('cabe en el presupuesto de triángulos y de llamadas de dibujo en el peor instante (con sombras)', () => {
    const superficie = new SuperficieOsea();
    const fila = new FilaCelular();
    const peor: Dibujo = { llamadas: 0, triangulos: 0, llamadasSombra: 0, triangulosSombra: 0 };
    // Más fino que TIEMPOS: los desvanecidos duran poco.
    for (let i = 0; i <= 200; i++) {
      const e = estadoOsteoblasto(i / 200);
      superficie.actualizar(e);
      fila.actualizar(e);
      const m = medir([superficie.grupo, fila.grupo]);
      for (const k of Object.keys(peor) as (keyof Dibujo)[]) peor[k] = Math.max(peor[k], m[k]);
    }
    expect(peor.triangulos).toBeGreaterThan(1000);
    for (const k of Object.keys(peor) as (keyof Dibujo)[]) {
      expect(peor[k], k).toBeLessThan(PRESUPUESTO[k]);
    }
    superficie.liberar();
    fila.liberar();
  });

  it('nada se dibuja en dos pasadas: las piezas que se desvanecen son de una cara', () => {
    const superficie = new SuperficieOsea();
    const fila = new FilaCelular();
    for (let i = 0; i <= 200; i++) {
      const e = estadoOsteoblasto(i / 200);
      superficie.actualizar(e);
      fila.actualizar(e);
      for (const grupo of [superficie.grupo, fila.grupo]) {
        grupo.traverse((o) => {
          const m = (o as Mesh).material as Material | undefined;
          if (!m || !esVisible(o)) return;
          expect(m.transparent && m.side === DoubleSide, `t = ${i / 200}, ${o.name}`).toBe(false);
        });
      }
    }
    superficie.liberar();
    fila.liberar();
  });

  it('nada emite luz propia (el frente de mineralización es la línea oscura)', () => {
    const superficie = new SuperficieOsea();
    const fila = new FilaCelular();
    for (const t of TIEMPOS) {
      const e = estadoOsteoblasto(t);
      superficie.actualizar(e);
      fila.actualizar(e);
      for (const grupo of [superficie.grupo, fila.grupo]) {
        grupo.traverse((o) => {
          const m = (o as Mesh).material as {
            emissiveIntensity?: number;
            emissive?: { getHex(): number };
          };
          if (!m?.emissive) return;
          expect(m.emissive.getHex() === 0 || m.emissiveIntensity === 0, o.name).toBe(true);
        });
      }
    }
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
    expect(buscar(fila.grupo, 'ribosomas').visible).toBe(false);
    expect(buscar(fila.grupo, 'cuerpos_apoptoticos').visible).toBe(false);
  });

  it('organulos: retículo con ribosomas, Golgi y mitocondrias a la vista dentro de la protagonista', () => {
    poner(HITOS_OSTEOBLASTO.organulos);
    expect(buscar(fila.grupo, 'reticulo_y_golgi').visible).toBe(true);
    expect(buscar(fila.grupo, 'ribosomas').visible).toBe(true);
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
