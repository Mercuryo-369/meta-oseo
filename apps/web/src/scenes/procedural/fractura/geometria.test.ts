/**
 * Pruebas de las formas de la escena de la fractura sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo (con la cuña cerrada y abierta), presupuesto de polígonos y
 * de llamadas de dibujo, liberación de recursos, determinismo y visibilidad por fase.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, Mesh, Object3D } from 'three';
import { HITOS_FRACTURA, estadoFractura } from './estado';
import { perfilSolido, radioCallo, radioHematoma } from './disposicion';
import { anillo, arcoDeCuerpo, arcoDeCuna, esfera, fusiforme, tramo } from './geometria';
import { HuesoFracturado, Reparacion, presenciaCon } from './mallas';
import type { PiezaFractura } from './mallas';

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
    ['tramo', () => tramo()],
    ['anillo', () => anillo(0.62, 1, 2, 0.3, 4)],
    ['fusiforme completo', () => fusiforme(perfilSolido(radioHematoma, -1.45, 1.45))],
    [
      'fusiforme partido',
      () =>
        fusiforme(
          perfilSolido(radioCallo, -0.95, 0.95),
          arcoDeCuerpo(4).theta0,
          arcoDeCuerpo(4).arco,
        ),
    ],
  ])('%s es válida, sin NaN y con índices dentro de rango', (_, crear) => {
    const g = crear();
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    expect(sinNaN(g.getAttribute('normal').array)).toBe(true);
    const indices = g.getIndex()?.array;
    if (indices) {
      const vertices = g.getAttribute('position').count;
      for (let i = 0; i < indices.length; i++) expect(indices[i]!).toBeLessThan(vertices);
    }
    g.dispose();
  });

  it('un fusiforme partido lleva las dos caras de corte que uno completo no tiene y respeta su perfil', () => {
    const perfil = perfilSolido(radioHematoma, -1.45, 1.45);
    const completo = fusiforme(perfil);
    const partido = fusiforme(perfil, arcoDeCuerpo().theta0, arcoDeCuerpo().arco);
    completo.computeBoundingBox();
    expect(completo.boundingBox!.max.y).toBeCloseTo(1.45, 5);
    expect(completo.boundingBox!.max.x).toBeCloseTo(1.42, 1);
    // El partido tiene menos segmentos de revolución pero añade dos caras planas.
    const cuenta = (g: BufferGeometry) => g.getAttribute('position').count;
    expect(cuenta(partido)).toBeLessThan(cuenta(completo));
    expect(cuenta(partido)).toBeGreaterThan(cuenta(completo) * 0.5);
    completo.dispose();
    partido.dispose();
  });

  it('la cuña y el cuerpo se complementan y el retiro agranda la cuña', () => {
    const cuna = arcoDeCuna();
    const cuerpo = arcoDeCuerpo();
    expect(cuna.arco + cuerpo.arco).toBeCloseTo(Math.PI * 2, 9);
    expect(cuerpo.theta0).toBeCloseTo(cuna.theta0 + cuna.arco, 9);
    expect(arcoDeCuna(4).arco).toBeGreaterThan(cuna.arco);
    expect(arcoDeCuerpo(4).arco).toBeLessThan(cuerpo.arco);
  });

  it('el tramo nace en el origen y crece hacia +Y', () => {
    const t = tramo();
    t.computeBoundingBox();
    expect(t.boundingBox!.min.y).toBeCloseTo(0, 5);
    expect(t.boundingBox!.max.y).toBeCloseTo(1, 5);
  });
});

describe('presenciaCon', () => {
  it('las células con más retraso aparecen más tarde y todas están al final', () => {
    expect(presenciaCon(0, 0)).toBe(0);
    expect(presenciaCon(0, 1)).toBe(0);
    expect(presenciaCon(1, 0)).toBe(1);
    expect(presenciaCon(1, 1)).toBe(1);
    expect(presenciaCon(0.4, 0)).toBeGreaterThan(presenciaCon(0.4, 1));
  });
});

describe.each<[string, () => PiezaFractura]>([
  ['HuesoFracturado', () => new HuesoFracturado()],
  ['Reparacion', () => new Reparacion()],
])('%s', (_, crear) => {
  it('no produce NaN en ningún instante, con la cuña cerrada ni abierta', () => {
    const pieza = crear();
    for (const abierta of [false, true]) {
      for (const t of TIEMPOS) {
        pieza.actualizar(estadoFractura(t), abierta);
        pieza.grupo.traverse((o) => {
          for (const v of [...o.position.toArray(), ...o.scale.toArray()]) {
            expect(Number.isFinite(v), `t = ${t}, ${o.name}`).toBe(true);
          }
          const im = (o as { instanceMatrix?: { array: ArrayLike<number> } }).instanceMatrix;
          if (im) expect(sinNaN(im.array), `t = ${t}, ${o.name}`).toBe(true);
        });
      }
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
    pieza.actualizar(estadoFractura(0.61), false);
    const antes = foto();
    pieza.actualizar(estadoFractura(0.05), true);
    pieza.actualizar(estadoFractura(0.97), false);
    pieza.actualizar(estadoFractura(0.61), false);
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

  it('con la cuña abierta se ocultan las tapas', () => {
    const pieza = crear();
    pieza.actualizar(estadoFractura(0.6), false);
    const tapas: Object3D[] = [];
    pieza.grupo.traverse((o) => {
      if (o.name.endsWith('_tapa') && (o as Mesh).geometry) tapas.push(o);
    });
    expect(tapas.length).toBeGreaterThan(0);
    expect(tapas.some(esVisible)).toBe(true);
    pieza.actualizar(estadoFractura(0.6), true);
    expect(tapas.some(esVisible)).toBe(false);
    pieza.liberar();
  });
});

describe('presupuesto de la escena completa', () => {
  it('cabe en el presupuesto de triángulos y de llamadas de dibujo en el peor instante', () => {
    const hueso = new HuesoFracturado();
    const reparacion = new Reparacion();
    let peor = { triangulos: 0, llamadas: 0 };
    for (const abierta of [false, true]) {
      for (const t of TIEMPOS) {
        const e = estadoFractura(t);
        hueso.actualizar(e, abierta);
        reparacion.actualizar(e, abierta);
        const m = medir([hueso.grupo, reparacion.grupo]);
        if (m.triangulos > peor.triangulos) peor = { ...peor, triangulos: m.triangulos };
        if (m.llamadas > peor.llamadas) peor = { ...peor, llamadas: m.llamadas };
      }
    }
    expect(peor.triangulos).toBeGreaterThan(1_000);
    expect(peor.triangulos).toBeLessThan(PRESUPUESTO.triangulos);
    expect(peor.llamadas).toBeLessThan(PRESUPUESTO.llamadas);
    hueso.liberar();
    reparacion.liberar();
  });
});

describe('visibilidad por fase', () => {
  const hueso = new HuesoFracturado();
  const reparacion = new Reparacion();
  const en = (t: number, abierta = false) => {
    const e = estadoFractura(t);
    hueso.actualizar(e, abierta);
    reparacion.actualizar(e, abierta);
  };
  const visible = (nombre: string) => esVisible(buscar(reparacion.grupo, nombre));

  it('fractura: sangrado a la vista; ni hematoma ni callo', () => {
    en(HITOS_FRACTURA.fractura);
    expect(visible('vasos_rotos')).toBe(true);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'gotas_de_sangre'))).toBeGreaterThan(10);
    expect(visible('hematoma')).toBe(false);
    expect(visible('callo')).toBe(false);
    expect(esVisible(buscar(hueso.grupo, 'medula_central'))).toBe(false);
  });

  it('hematoma: el coágulo tapa la brecha; el sangrado ya no se ve', () => {
    en(HITOS_FRACTURA.hematoma);
    expect(visible('hematoma')).toBe(true);
    expect(buscar(reparacion.grupo, 'hematoma').scale.x).toBeCloseTo(1, 5);
    expect(visible('vasos_rotos')).toBe(false);
    expect(visible('callo')).toBe(false);
  });

  it('inflamación: células inflamatorias, células madre y vasos nuevos', () => {
    en(HITOS_FRACTURA.inflamacion);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'neutrofilos'))).toBeGreaterThan(5);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'macrofagos'))).toBeGreaterThan(3);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'celulas_madre'))).toBeGreaterThan(5);
    expect(visible('vasos_nuevos')).toBe(true);
    expect(visible('callo')).toBe(false);
  });

  it('con la cuña abierta desaparecen las células que caerían en el sector abierto', () => {
    en(HITOS_FRACTURA.inflamacion, false);
    const cerrada = instanciasVisibles(buscar(reparacion.grupo, 'neutrofilos'));
    en(HITOS_FRACTURA.inflamacion, true);
    const abierta = instanciasVisibles(buscar(reparacion.grupo, 'neutrofilos'));
    expect(abierta).toBeLessThan(cerrada);
    expect(abierta).toBeGreaterThan(0);
  });

  it('callo blando y duro: el manguito completo; después encoge con osteoclastos encima', () => {
    en(HITOS_FRACTURA.callo_blando);
    expect(visible('callo')).toBe(true);
    expect(buscar(reparacion.grupo, 'callo').scale.x).toBeCloseTo(1, 5);
    expect(visible('hematoma')).toBe(false);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'osteoclastos'))).toBe(0);
    en(HITOS_FRACTURA.callo_duro);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'osteoblastos'))).toBeGreaterThan(8);
    en(HITOS_FRACTURA.remodelado);
    expect(buscar(reparacion.grupo, 'callo').scale.x).toBeLessThan(0.8);
    expect(instanciasVisibles(buscar(reparacion.grupo, 'osteoclastos'))).toBeGreaterThan(4);
  });

  it('consolidado: callo mínimo, médula continua, sin células ni vasos nuevos', () => {
    en(HITOS_FRACTURA.consolidado);
    expect(visible('callo')).toBe(true);
    expect(buscar(reparacion.grupo, 'callo').scale.x).toBeLessThan(0.6);
    expect(esVisible(buscar(hueso.grupo, 'medula_central'))).toBe(true);
    expect(buscar(hueso.grupo, 'medula_central').scale.y).toBeCloseTo(1, 5);
    expect(visible('vasos_nuevos')).toBe(false);
    expect(visible('osteoclastos')).toBe(false);
    expect(visible('osteoblastos')).toBe(false);
    hueso.liberar();
    reparacion.liberar();
  });
});
