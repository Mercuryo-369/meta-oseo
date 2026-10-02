/**
 * Pruebas de las formas de la escena del osteocito sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo, presupuesto de triángulos (CONTANDO las instancias) y de
 * llamadas de dibujo, liberación de recursos y visibilidad por fase.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, Mesh } from 'three';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { HITOS_OSTEOCITO, estadoOsteocito } from './estado';
import { esfera, flecha, tramo, tuboEnZ } from './geometria';
import { BloqueMatriz, Dinamica, RedCelular, Superficie, crearPiezas } from './mallas';
import type { PiezaOsteocito } from './mallas';

const TIEMPOS = Array.from({ length: 41 }, (_, i) => i / 40);

function sinNaN(datos: ArrayLike<number>): boolean {
  for (let i = 0; i < datos.length; i++) if (!Number.isFinite(datos[i]!)) return false;
  return true;
}

function mallasDe(grupo: Group): Mesh[] {
  const lista: Mesh[] = [];
  grupo.traverse((o) => {
    if ((o as Mesh).geometry) lista.push(o as Mesh);
  });
  return lista;
}

function geometriasDe(grupo: Group): BufferGeometry[] {
  return mallasDe(grupo).map((m) => m.geometry as BufferGeometry);
}

function triangulosDe(g: BufferGeometry): number {
  return (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
}

/** Triángulos dibujados en el estado actual: los de cada malla, por el número de instancias visibles. */
function triangulos(grupo: Group): number {
  return mallasDe(grupo).reduce((suma, m) => {
    const base = triangulosDe(m.geometry as BufferGeometry);
    if (m instanceof InstancedMesh) return suma + base * instanciasVisibles(m);
    return suma + base;
  }, 0);
}

const aux = new Matrix4();
const escala = new Vector3();
function instanciasVisibles(m: InstancedMesh): number {
  let n = 0;
  for (let i = 0; i < m.count; i++) {
    m.getMatrixAt(i, aux);
    escala.setFromMatrixScale(aux);
    if (escala.x > 1e-6 || escala.y > 1e-6 || escala.z > 1e-6) n++;
  }
  return n;
}

function llamadasDeDibujo(grupo: Group): number {
  return mallasDe(grupo).filter((m) => {
    if (m instanceof InstancedMesh) return instanciasVisibles(m) > 0;
    return true;
  }).length;
}

describe('formas básicas', () => {
  it('el tramo crece desde el origen hacia +Y', () => {
    const g = tramo();
    g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeCloseTo(0, 6);
    expect(g.boundingBox!.max.y).toBeCloseTo(1, 6);
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
  });

  it('la flecha apunta a −Y con la punta en el origen y el tubo corre a lo largo de Z', () => {
    const f = flecha();
    f.computeBoundingBox();
    expect(f.boundingBox!.min.y).toBeCloseTo(0, 6);
    expect(f.boundingBox!.max.y).toBeCloseTo(1, 6);
    const t = tuboEnZ(0.4, 2);
    t.computeBoundingBox();
    expect(t.boundingBox!.max.z).toBeCloseTo(1, 6);
    expect(t.boundingBox!.max.x).toBeCloseTo(0.4, 6);
    for (const g of [f, t, esfera()]) expect(sinNaN(g.getAttribute('position').array)).toBe(true);
  });
});

describe.each<[string, () => PiezaOsteocito]>([
  ['BloqueMatriz', () => new BloqueMatriz()],
  ['RedCelular', () => new RedCelular()],
  ['Dinamica', () => new Dinamica(new RedCelular().red)],
  ['Superficie', () => new Superficie()],
])('%s', (_, crear) => {
  it('no produce NaN en ningún instante', () => {
    const pieza = crear();
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoOsteocito(t));
      for (const m of mallasDe(pieza.grupo)) {
        if (m instanceof InstancedMesh) {
          expect(sinNaN(m.instanceMatrix.array), `t = ${t}, ${m.name}`).toBe(true);
        }
      }
    }
    for (const g of geometriasDe(pieza.grupo)) {
      expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    }
    pieza.liberar();
  });

  it('actualizar es determinista: la misma t da lo mismo, vaya lo que vaya antes', () => {
    const pieza = crear();
    const foto = (): number[] =>
      mallasDe(pieza.grupo).flatMap((m) =>
        m instanceof InstancedMesh ? Array.from(m.instanceMatrix.array) : [m.visible ? 1 : 0],
      );
    pieza.actualizar(estadoOsteocito(0.61));
    const antes = foto();
    pieza.actualizar(estadoOsteocito(0.05));
    pieza.actualizar(estadoOsteocito(0.97));
    pieza.actualizar(estadoOsteocito(0.61));
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
  it('menos de 40 000 triángulos y de 40 llamadas de dibujo en el peor instante', () => {
    const piezas = crearPiezas();
    let peorTriangulos = 0;
    let peorLlamadas = 0;
    for (const t of TIEMPOS) {
      const e = estadoOsteocito(t);
      for (const p of piezas) p.actualizar(e);
      const tri = piezas.reduce((s, p) => s + triangulos(p.grupo), 0);
      const llamadas = piezas.reduce((s, p) => s + llamadasDeDibujo(p.grupo), 0);
      peorTriangulos = Math.max(peorTriangulos, tri);
      peorLlamadas = Math.max(peorLlamadas, llamadas);
    }
    expect(peorTriangulos).toBeGreaterThan(1000);
    expect(peorTriangulos).toBeLessThan(40_000);
    expect(peorLlamadas).toBeLessThan(40);
    for (const p of piezas) p.liberar();
  });
});

describe('visibilidad por fase', () => {
  function instancias(pieza: PiezaOsteocito, nombre: string): number {
    const m = mallasDe(pieza.grupo).find((x) => x.name === nombre);
    expect(m, nombre).toBeDefined();
    return instanciasVisibles(m as InstancedMesh);
  }

  it('la red aparece por partes: célula, dendritas, vecinos y uniones', () => {
    const red = new RedCelular();
    const n = red.red.dendritas.length;
    red.actualizar(estadoOsteocito(HITOS_OSTEOCITO.laguna));
    expect(instancias(red, 'osteocitos')).toBe(1);
    expect(instancias(red, 'dendritas')).toBe(0);
    expect(instancias(red, 'uniones_comunicantes')).toBe(0);
    red.actualizar(estadoOsteocito(HITOS_OSTEOCITO.dendritas));
    expect(instancias(red, 'osteocitos')).toBe(1);
    const tramosCentral = instancias(red, 'dendritas');
    expect(tramosCentral).toBeGreaterThan(0);
    expect(tramosCentral).toBeLessThan(n * 4);
    expect(instancias(red, 'canaliculos')).toBe(tramosCentral);
    red.actualizar(estadoOsteocito(HITOS_OSTEOCITO.red));
    expect(instancias(red, 'osteocitos')).toBe(red.red.celulas.length);
    expect(instancias(red, 'dendritas')).toBe(n * 4);
    expect(instancias(red, 'uniones_comunicantes')).toBe(red.red.uniones.length);
    red.liberar();
  });

  it('la carga trae flechas y líquido; la señal, integrinas y pulsos; el reposo los apaga', () => {
    const bloque = new BloqueMatriz();
    const redCelular = new RedCelular();
    const dinamica = new Dinamica(redCelular.red);
    const ver = (t: number) => {
      const e = estadoOsteocito(t);
      bloque.actualizar(e);
      dinamica.actualizar(e);
    };
    ver(HITOS_OSTEOCITO.red);
    expect(instancias(bloque, 'flechas_carga')).toBe(0);
    expect(instancias(dinamica, 'liquido_intersticial')).toBe(0);
    expect(instancias(dinamica, 'esclerostina')).toBeGreaterThan(0);
    ver(HITOS_OSTEOCITO.carga);
    expect(instancias(bloque, 'flechas_carga')).toBe(2);
    expect(instancias(dinamica, 'liquido_intersticial')).toBeGreaterThan(50);
    expect(instancias(dinamica, 'integrinas')).toBe(0);
    ver(HITOS_OSTEOCITO.senal);
    expect(instancias(dinamica, 'integrinas')).toBeGreaterThan(10);
    expect(instancias(dinamica, 'cilio_primario')).toBe(1);
    expect(instancias(dinamica, 'pulsos_senal')).toBe(0);
    ver(HITOS_OSTEOCITO.mensaje);
    expect(instancias(dinamica, 'pulsos_senal')).toBeGreaterThan(0);
    expect(instancias(dinamica, 'esclerostina')).toBe(0);
    ver(HITOS_OSTEOCITO.reposo);
    expect(instancias(bloque, 'flechas_carga')).toBe(0);
    expect(instancias(dinamica, 'liquido_intersticial')).toBe(0);
    expect(instancias(dinamica, 'pulsos_senal')).toBe(0);
    expect(instancias(dinamica, 'esclerostina')).toBeGreaterThan(0);
    bloque.liberar();
    redCelular.liberar();
    dinamica.liberar();
  });

  it('las células de la superficie se alzan al activarse y vuelven a aplanarse', () => {
    const sup = new Superficie();
    const alturaEn = (t: number): number => {
      sup.actualizar(estadoOsteocito(t));
      const m = mallasDe(sup.grupo).find((x) => x.name === 'celulas_superficie') as InstancedMesh;
      m.getMatrixAt(0, aux);
      return escala.setFromMatrixScale(aux).y;
    };
    const plana = alturaEn(HITOS_OSTEOCITO.red);
    const activa = alturaEn(0.9);
    const reposo = alturaEn(HITOS_OSTEOCITO.reposo);
    expect(activa).toBeGreaterThan(plana * 2.5);
    expect(reposo).toBeLessThan(activa);
    sup.liberar();
  });
});
