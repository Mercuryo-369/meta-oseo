/**
 * Pruebas de las formas de la escena de la vesícula sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo, presupuesto de polígonos y de llamadas de dibujo, y liberación
 * de recursos.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, InstancedMesh, Mesh, Object3D } from 'three';
import { HITOS_VESICULA, estadoVesicula } from './estado';
import {
  cuello,
  esfera,
  hemisferio,
  laminaOndulada,
  losaOndulada,
  mancuerna,
  placaDesdeOrigen,
  tubo,
} from './geometria';
import { Osteoblasto, Osteoide, VesiculaMatriz } from './mallas';
import type { PiezaVesicula } from './mallas';

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

/** ¿Está el objeto a la vista? (él y todos sus antecesores visibles). */
function aLaVista(o: Object3D): boolean {
  let actual: Object3D | null = o;
  while (actual) {
    if (!actual.visible) return false;
    actual = actual.parent;
  }
  return true;
}

/** Triángulos que se dibujan de verdad: por malla, sus triángulos por el número de instancias. */
function triangulosDibujados(grupo: Group): number {
  return mallasDe(grupo).reduce((suma, malla) => {
    if (!aLaVista(malla)) return suma;
    const g = malla.geometry as BufferGeometry;
    const porInstancia = (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
    const instancias = (malla as InstancedMesh).isInstancedMesh
      ? (malla as InstancedMesh).count
      : 1;
    return suma + porInstancia * instancias;
  }, 0);
}

function llamadasDeDibujo(grupo: Group): number {
  return mallasDe(grupo).filter(aLaVista).length;
}

describe('formas básicas', () => {
  it('el hemisferio es la mitad trasera de la esfera (z <= 0) y la esfera es válida', () => {
    const h = hemisferio(12, 8);
    h.computeBoundingBox();
    expect(h.boundingBox!.max.z).toBeLessThan(1e-6);
    expect(h.boundingBox!.min.z).toBeCloseTo(-1, 6);
    expect(h.boundingBox!.max.x).toBeCloseTo(1, 6);
    expect(h.boundingBox!.min.x).toBeCloseTo(-1, 6);
    expect(sinNaN(esfera(8, 6).getAttribute('position').array)).toBe(true);
  });

  it('el cuello va de y = 0 (estrecho) a y = 1 (ancho)', () => {
    const g = cuello(8);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeCloseTo(0, 6);
    expect(g.boundingBox!.max.y).toBeCloseTo(1, 6);
    expect(g.boundingBox!.max.x).toBeCloseTo(1, 6);
  });

  it('la placa desde el origen mide 1 en +X y arranca en 0; el tubo va a lo largo de X; la mancuerna mide 1', () => {
    const p = placaDesdeOrigen(0.2, 0.05);
    p.computeBoundingBox();
    expect(p.boundingBox!.min.x).toBeCloseTo(0, 6);
    expect(p.boundingBox!.max.x).toBeCloseTo(1, 6);
    expect(p.boundingBox!.max.y).toBeCloseTo(0.1, 6);
    const t = tubo(0.3, 2);
    t.computeBoundingBox();
    expect(t.boundingBox!.max.x).toBeCloseTo(1, 6);
    expect(t.boundingBox!.max.y).toBeCloseTo(0.3, 1);
    const m = mancuerna();
    m.computeBoundingBox();
    expect(m.boundingBox!.min.x).toBeCloseTo(-0.5, 6);
    expect(m.boundingBox!.max.x).toBeCloseTo(0.5, 6);
    expect(sinNaN(m.getAttribute('normal').array)).toBe(true);
  });

  it('la lámina y la losa onduladas siguen la onda y quedan cerradas', () => {
    const onda = (x: number, z: number) => 0.2 * Math.sin(x) * Math.cos(z);
    const lamina = laminaOndulada(4, 2, 8, 4, onda);
    const pos = lamina.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      expect(pos.getY(i)).toBeCloseTo(onda(pos.getX(i), pos.getZ(i)), 5);
    }
    expect(sinNaN(lamina.getAttribute('normal').array)).toBe(true);
    const losa = losaOndulada(4, 2, 1, 8, 4, onda);
    losa.computeBoundingBox();
    expect(losa.boundingBox!.max.y).toBeCloseTo(1, 6);
    expect(losa.boundingBox!.min.y).toBeGreaterThanOrEqual(-0.2 - 1e-6);
    const posLosa = losa.getAttribute('position');
    let abajo = 0;
    for (let i = 0; i < posLosa.count; i++) {
      if (posLosa.getY(i) < 0.5) {
        abajo++;
        expect(posLosa.getY(i)).toBeCloseTo(onda(posLosa.getX(i), posLosa.getZ(i)), 5);
      }
    }
    expect(abajo).toBeGreaterThan(8);
    expect(sinNaN(losa.getAttribute('normal').array)).toBe(true);
  });
});

describe.each<[string, () => PiezaVesicula, number]>([
  ['Osteoblasto', () => new Osteoblasto(), 8_000],
  ['Osteoide', () => new Osteoide(), 22_000],
  ['VesiculaMatriz', () => new VesiculaMatriz(), 9_000],
])('%s', (_, crear, presupuesto) => {
  it('cabe en el presupuesto de triángulos en todos los instantes', () => {
    const pieza = crear();
    let maximo = 0;
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoVesicula(t));
      maximo = Math.max(maximo, triangulosDibujados(pieza.grupo));
    }
    expect(maximo).toBeGreaterThan(10);
    expect(maximo).toBeLessThan(presupuesto);
    pieza.liberar();
  });

  it('no produce NaN en ningún instante ni deja posiciones o escalas inválidas', () => {
    const pieza = crear();
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoVesicula(t));
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
        const inst = o as InstancedMesh;
        if (inst.isInstancedMesh) expect(sinNaN(inst.instanceMatrix.array), `t = ${t}`).toBe(true);
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
      pieza.grupo.traverse((o) => {
        lista.push(o.visible, o.position.toArray(), o.scale.toArray());
        const inst = o as InstancedMesh;
        if (inst.isInstancedMesh) lista.push(Array.from(inst.instanceMatrix.array));
        const malla = o as Mesh;
        if (malla.material && !Array.isArray(malla.material)) lista.push(malla.material.opacity);
      });
      return lista;
    };
    pieza.actualizar(estadoVesicula(0.61));
    const antes = foto();
    pieza.actualizar(estadoVesicula(0.05));
    pieza.actualizar(estadoVesicula(0.97));
    pieza.actualizar(estadoVesicula(0.61));
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
  const crearTodas = () => [new Osteoblasto(), new Osteoide(), new VesiculaMatriz()];

  it('en el peor instante dibuja menos de 40 000 triángulos y menos de 40 llamadas', () => {
    const piezas = crearTodas();
    let triangulos = 0;
    let llamadas = 0;
    for (const t of TIEMPOS) {
      for (const p of piezas) p.actualizar(estadoVesicula(t));
      triangulos = Math.max(
        triangulos,
        piezas.reduce((s, p) => s + triangulosDibujados(p.grupo), 0),
      );
      llamadas = Math.max(
        llamadas,
        piezas.reduce((s, p) => s + llamadasDeDibujo(p.grupo), 0),
      );
    }
    expect(triangulos).toBeLessThan(40_000);
    expect(llamadas).toBeLessThan(40);
    for (const p of piezas) p.liberar();
  });

  it('visibilidad por fase: cada pieza aparece en su hito y se va cuando toca', () => {
    const [osteoblasto, osteoide, vesicula] = crearTodas() as [
      Osteoblasto,
      Osteoide,
      VesiculaMatriz,
    ];
    const todas = [osteoblasto, osteoide, vesicula];
    const pieza = (nombre: string): Object3D => {
      for (const p of todas) {
        const encontrada = p.grupo.getObjectByName(nombre);
        if (encontrada) return encontrada;
      }
      throw new Error(`No existe la pieza ${nombre}`);
    };
    const ir = (t: number) => {
      for (const p of todas) p.actualizar(estadoVesicula(t));
    };

    ir(HITOS_VESICULA.osteoblasto);
    expect(aLaVista(pieza('membrana_osteoblasto'))).toBe(true);
    expect(aLaVista(pieza('enzimas_membrana'))).toBe(true);
    expect(aLaVista(pieza('fibrillas_zona_hueco'))).toBe(true);
    expect(vesicula.grupo.visible).toBe(false);
    expect(aLaVista(pieza('cristales_fibrillas'))).toBe(false);
    expect(aLaVista(pieza('ppi_cristales'))).toBe(false);

    // Un poco antes del hito la vesícula aún cuelga de su cuello.
    ir(0.11);
    expect(aLaVista(pieza('cuello_gemacion'))).toBe(true);
    expect(pieza('cuello_gemacion').scale.y).toBeGreaterThan(0.05);
    ir(HITOS_VESICULA.gemacion);
    expect(aLaVista(pieza('membrana_vesicula'))).toBe(true);
    expect(aLaVista(pieza('membrana_vesicula_cortada'))).toBe(false);
    expect(aLaVista(pieza('cuello_gemacion'))).toBe(false);
    expect(aLaVista(pieza('iones'))).toBe(false);
    ir(0.11);
    expect(pieza('cuello_gemacion').position.y).toBeGreaterThan(
      pieza('vesicula_cuerpo').position.y,
    );

    ir(HITOS_VESICULA.acumulacion);
    expect(aLaVista(pieza('cuello_gemacion'))).toBe(false);
    expect(aLaVista(pieza('iones'))).toBe(true);
    expect(aLaVista(pieza('nucleo_acp'))).toBe(false);
    expect(aLaVista(pieza('racimo_cristales'))).toBe(false);

    ir(HITOS_VESICULA.nucleacion);
    expect(aLaVista(pieza('membrana_vesicula'))).toBe(false);
    expect(aLaVista(pieza('membrana_vesicula_cortada'))).toBe(true);
    expect(aLaVista(pieza('proteinas_vesicula_frente'))).toBe(false);
    expect(aLaVista(pieza('proteinas_vesicula_atras'))).toBe(true);
    expect(aLaVista(pieza('nucleo_acp'))).toBe(true);
    expect(aLaVista(pieza('racimo_cristales'))).toBe(true);

    ir(HITOS_VESICULA.ruptura);
    expect(aLaVista(pieza('membrana_vesicula'))).toBe(true);
    expect(aLaVista(pieza('iones'))).toBe(false);
    expect(aLaVista(pieza('nucleo_acp'))).toBe(false);
    expect(aLaVista(pieza('racimo_cristales'))).toBe(true);
    expect(aLaVista(pieza('cristales_fibrillas'))).toBe(false);
    // La vesícula rota se hunde un poco.
    expect(pieza('vesicula_cuerpo').scale.y).toBeLessThan(pieza('vesicula_cuerpo').scale.x);

    ir(HITOS_VESICULA.propagacion);
    expect(aLaVista(pieza('cristales_fibrillas'))).toBe(true);
    expect(aLaVista(pieza('vesiculas_vecinas'))).toBe(true);
    expect(aLaVista(pieza('cristales_vecinas'))).toBe(true);
    expect(aLaVista(pieza('ppi_cristales'))).toBe(false);
    expect(aLaVista(pieza('hidrolisis_ppi'))).toBe(false);

    ir(HITOS_VESICULA.regulacion);
    expect(aLaVista(pieza('ppi_cristales'))).toBe(true);
    expect(aLaVista(pieza('ppi_racimo'))).toBe(true);
    expect(aLaVista(pieza('hidrolisis_ppi'))).toBe(true);
    expect(aLaVista(pieza('ppi_enpp1'))).toBe(true);
    for (const p of todas) p.liberar();
  });

  it('la vista interior fuerza el corte: con corte 1 la esfera entera desaparece en cualquier fase', () => {
    const vesicula = new VesiculaMatriz();
    const estado = estadoVesicula(HITOS_VESICULA.gemacion);
    vesicula.actualizar({ ...estado, vesicula: { ...estado.vesicula, corte: 1 } });
    expect(vesicula.grupo.getObjectByName('membrana_vesicula')!.visible).toBe(false);
    expect(vesicula.grupo.getObjectByName('membrana_vesicula_cortada')!.visible).toBe(true);
    vesicula.liberar();
  });
});
