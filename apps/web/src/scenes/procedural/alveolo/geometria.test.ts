/**
 * Pruebas de las formas de la escena del alvéolo tras la extracción sin WebGL (three crea las geometrías en
 * memoria): cintas y abanicos de topología fija bien escritos, sin NaN en todo el recorrido del tiempo, presupuesto
 * de polígonos y de llamadas de dibujo, determinismo, liberación de recursos, qué se ve en cada fase y encuadre de
 * las vistas frente a la caja envolvente de lo visible (no hubo comprobación visual en navegador).
 */
import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import type { BufferGeometry, Group, Mesh, Object3D } from 'three';
import { FOV_GRADOS } from '../bmu/vistas';
import { PUNTOS_ENCIA, carrilesEncia, contornoExterior, contornoInterior } from './disposicion';
import { HITOS_ALVEOLO, estadoAlveolo } from './estado';
import { abanico, cinta, escribirAbanico, escribirCinta } from './geometria';
import { Alveolo, Conducto, Diente, Encia, Reborde } from './mallas';
import type { PiezaAlveolo } from './mallas';
import { estadoDeVistaAlveolo } from './vistas';

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

function triangulosDe(g: BufferGeometry): number {
  return (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
}

/** ¿El objeto y todos sus padres son visibles? */
function visibleDeVerdad(o: Object3D): boolean {
  for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

/** Triángulos dibujados (una instancia cuenta tantas veces como instancias tiene; lo oculto no cuenta). */
function triangulos(grupo: Group): number {
  let suma = 0;
  grupo.traverse((o) => {
    const malla = o as Mesh & { isInstancedMesh?: boolean; count?: number };
    if (!malla.geometry || !visibleDeVerdad(o)) return;
    suma += triangulosDe(malla.geometry) * (malla.isInstancedMesh ? (malla.count ?? 1) : 1);
  });
  return suma;
}

/** Objetos con geometría que se dibujan: cada uno (y cada grupo de material) es una llamada de dibujo. */
function llamadasDeDibujo(grupo: Group): number {
  let n = 0;
  grupo.traverse((o) => {
    const malla = o as Mesh;
    if (!malla.geometry || !visibleDeVerdad(o)) return;
    n += Array.isArray(malla.material) ? malla.material.length : 1;
  });
  return n;
}

/** Caja envolvente de lo visible (con las matrices del mundo al día). */
function cajaVisible(grupos: Group[]): Box3 {
  const caja = new Box3();
  for (const g of grupos) {
    g.updateMatrixWorld(true);
    g.traverse((o) => {
      const malla = o as Mesh & { isInstancedMesh?: boolean };
      if (!malla.geometry || !visibleDeVerdad(o) || malla.isInstancedMesh) return;
      malla.geometry.computeBoundingBox();
      const b = malla.geometry.boundingBox!.clone().applyMatrix4(malla.matrixWorld);
      caja.union(b);
    });
  }
  return caja;
}

describe('cinta y abanico', () => {
  it('la cinta cerrada del cuerpo tiene 8n vértices, dos grupos de material y ocupa de 0 a −largo sin NaN', () => {
    const n = contornoExterior(0).length;
    const g = cinta(n, true);
    escribirCinta(g, contornoExterior(0), contornoInterior(0), 3);
    expect(g.getAttribute('position').count).toBe(8 * n);
    expect(g.groups).toHaveLength(2);
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    expect(sinNaN(g.getAttribute('normal').array)).toBe(true);
    g.computeBoundingBox();
    expect(g.boundingBox!.max.x).toBeCloseTo(0, 6);
    expect(g.boundingBox!.min.x).toBeCloseTo(-3, 6);
    expect(g.boundingBox!.max.y).toBeCloseTo(2, 6);
    expect(triangulosDe(g)).toBe(8 * n);
  });

  it('la cinta abierta de la encía cierra sus dos extremos', () => {
    const { interior, exterior } = carrilesEncia('vestibular', 0, 0);
    const g = cinta(PUNTOS_ENCIA, false);
    escribirCinta(g, exterior, interior, 3);
    expect(triangulosDe(g)).toBe(8 * (PUNTOS_ENCIA - 1) + 4);
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
  });

  it('reescribir la misma cinta con otro contorno cambia las posiciones sin cambiar el índice', () => {
    const n = contornoExterior(0).length;
    const g = cinta(n, true);
    escribirCinta(g, contornoExterior(0), contornoInterior(0), 3);
    const indice = g.getIndex()!.array.slice();
    const antes = g.getAttribute('position').array.slice();
    escribirCinta(g, contornoExterior(1), contornoInterior(1), 3);
    expect(g.getIndex()!.array).toEqual(indice);
    expect(g.getAttribute('position').array).not.toEqual(antes);
    g.computeBoundingBox();
    expect(g.boundingBox!.max.y).toBeCloseTo(-0.4, 6);
  });

  it('el abanico lleva el polígono al plano de corte a la profundidad pedida, con el centro como último vértice', () => {
    const puntos = contornoInterior(0);
    const g = abanico(puntos.length);
    escribirAbanico(g, puntos, -0.16, [0, -1.25]);
    const pos = g.getAttribute('position');
    expect(pos.count).toBe(puntos.length + 1);
    expect(triangulosDe(g)).toBe(puntos.length);
    for (let i = 0; i < pos.count; i++) expect(pos.getX(i)).toBeCloseTo(-0.16, 6);
    expect(pos.getY(pos.count - 1)).toBeCloseTo(-1.25, 6);
    expect(pos.getZ(pos.count - 1)).toBeCloseTo(0, 6);
    expect(sinNaN(pos.array)).toBe(true);
  });
});

describe.each<[string, () => PiezaAlveolo, number, number]>([
  ['Reborde', () => new Reborde(), 5_500, 7],
  ['Encia', () => new Encia(), 700, 4],
  ['Diente', () => new Diente(), 1_200, 4],
  ['Alveolo', () => new Alveolo(), 3_000, 10],
  ['Conducto', () => new Conducto(), 500, 5],
])('%s', (_, crear, presupuesto, llamadas) => {
  it('cabe en el presupuesto de polígonos y de llamadas de dibujo en todo instante', () => {
    const pieza = crear();
    let peorTri = 0;
    let peorLlam = 0;
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoAlveolo(t));
      peorTri = Math.max(peorTri, triangulos(pieza.grupo));
      peorLlam = Math.max(peorLlam, llamadasDeDibujo(pieza.grupo));
    }
    expect(peorTri).toBeGreaterThan(20);
    expect(peorTri).toBeLessThan(presupuesto);
    expect(peorLlam).toBeLessThanOrEqual(llamadas);
    pieza.liberar();
  });

  it('no produce NaN en ningún instante ni deja posiciones o escalas inválidas', () => {
    const pieza = crear();
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoAlveolo(t));
      for (const v of [pieza.grupo.position.x, pieza.grupo.position.y, pieza.grupo.scale.x]) {
        expect(Number.isFinite(v), `t = ${t}`).toBe(true);
      }
      for (const g of geometriasDe(pieza.grupo)) {
        expect(sinNaN(g.getAttribute('position').array), `t = ${t}`).toBe(true);
        const normal = g.getAttribute('normal');
        if (normal) expect(sinNaN(normal.array), `t = ${t}`).toBe(true);
      }
      pieza.grupo.traverse((o) => {
        const im = o as Mesh & {
          isInstancedMesh?: boolean;
          instanceMatrix?: { array: ArrayLike<number> };
        };
        if (im.isInstancedMesh && im.instanceMatrix)
          expect(sinNaN(im.instanceMatrix.array)).toBe(true);
      });
    }
    pieza.liberar();
  });

  it('actualizar es determinista: la misma t da lo mismo, vaya lo que vaya antes', () => {
    const pieza = crear();
    const foto = (): unknown[] => {
      const lista: unknown[] = [pieza.grupo.visible, pieza.grupo.position.y];
      pieza.grupo.traverse((o) => {
        const m = o as Mesh & { instanceMatrix?: { array: ArrayLike<number> } };
        const mat = m.material as
          | { opacity?: number; color?: { getHex: () => number } }
          | { opacity?: number }[]
          | undefined;
        if (mat) {
          lista.push(o.visible, o.position.x, o.position.y, o.position.z);
          if (!Array.isArray(mat)) lista.push(mat.opacity, mat.color?.getHex());
        }
        if (m.geometry) lista.push(Array.from(m.geometry.getAttribute('position').array));
        if (m.instanceMatrix) lista.push(Array.from(m.instanceMatrix.array));
      });
      return lista;
    };
    pieza.actualizar(estadoAlveolo(0.61));
    const antes = foto();
    pieza.actualizar(estadoAlveolo(0.05));
    pieza.actualizar(estadoAlveolo(0.97));
    pieza.actualizar(estadoAlveolo(0.61));
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

function todas(): PiezaAlveolo[] {
  return [new Reborde(), new Encia(), new Diente(), new Alveolo(), new Conducto()];
}

describe('la escena completa', () => {
  it('cabe en el presupuesto total: menos de 40 000 triángulos y de 40 llamadas de dibujo', () => {
    const piezas = todas();
    let peorTriangulos = 0;
    let peorLlamadas = 0;
    for (const t of TIEMPOS) {
      let tri = 0;
      let llam = 0;
      for (const p of piezas) {
        p.actualizar(estadoAlveolo(t));
        tri += triangulos(p.grupo);
        llam += llamadasDeDibujo(p.grupo);
      }
      peorTriangulos = Math.max(peorTriangulos, tri);
      peorLlamadas = Math.max(peorLlamadas, llam);
    }
    console.info(
      `[alveolo] peor instante: ${peorTriangulos} triángulos, ${peorLlamadas} llamadas de dibujo`,
    );
    expect(peorTriangulos).toBeLessThan(40_000);
    expect(peorLlamadas).toBeLessThan(40);
    for (const p of piezas) p.liberar();
  });

  it('el diente está al principio, sube y deja de dibujarse desde la extracción', () => {
    const diente = new Diente();
    diente.actualizar(estadoAlveolo(0));
    expect(diente.grupo.visible).toBe(true);
    expect(diente.grupo.position.y).toBe(0);
    diente.actualizar(estadoAlveolo(0.11));
    expect(diente.grupo.visible).toBe(true);
    expect(diente.grupo.position.y).toBeGreaterThan(0.5);
    for (const t of [0.14, 0.5, 1]) {
      diente.actualizar(estadoAlveolo(t));
      expect(diente.grupo.visible, `t = ${t}`).toBe(false);
    }
    diente.liberar();
  });

  it('en el alvéolo cada relleno se dibuja solo en su fase', () => {
    const alveolo = new Alveolo();
    const ver = (nombre: string): boolean => alveolo.grupo.getObjectByName(nombre)!.visible;
    const en = (t: number): Record<string, boolean> => {
      alveolo.actualizar(estadoAlveolo(t));
      return {
        ligamento: ver('ligamento_periodontal'),
        lamina: ver('hueso_alveolar_propio'),
        cavidad: ver('cavidad'),
        sangrado: ver('sangrado'),
        coagulo: ver('coagulo'),
        granulacion: ver('tejido_granulacion'),
        vasos: ver('vasos'),
        huesoNuevo: ver('hueso_nuevo'),
        tapa: ver('tapa_cortical'),
        osteoclastos: ver('osteoclastos'),
      };
    };
    expect(en(HITOS_ALVEOLO.diente)).toMatchObject({
      ligamento: true,
      lamina: true,
      sangrado: false,
      coagulo: false,
      granulacion: false,
      huesoNuevo: false,
      osteoclastos: false,
    });
    expect(en(HITOS_ALVEOLO.extraccion)).toMatchObject({
      ligamento: true,
      sangrado: true,
      coagulo: false,
    });
    expect(en(HITOS_ALVEOLO.coagulo)).toMatchObject({
      ligamento: false,
      sangrado: false,
      coagulo: true,
      granulacion: false,
    });
    expect(en(HITOS_ALVEOLO.granulacion)).toMatchObject({
      coagulo: true,
      granulacion: true,
      vasos: true,
    });
    expect(en(HITOS_ALVEOLO.hueso_entretejido)).toMatchObject({
      coagulo: false,
      granulacion: true,
      huesoNuevo: true,
      osteoclastos: true,
    });
    // En la maduración la placa de hueso nuevo ya se fundió con el trabecular vecino (no se dibuja aparte).
    expect(en(HITOS_ALVEOLO.maduracion)).toMatchObject({
      granulacion: false,
      lamina: false,
      huesoNuevo: false,
      tapa: true,
      osteoclastos: false,
    });
    expect(en(HITOS_ALVEOLO.reabsorcion_reborde)).toMatchObject({
      huesoNuevo: false,
      cavidad: false,
      tapa: false,
      osteoclastos: true,
    });
    expect(en(HITOS_ALVEOLO.reborde_final)).toMatchObject({
      huesoNuevo: false,
      osteoclastos: false,
    });
    alveolo.liberar();
  });

  it('el reborde baja: la caja del cuerpo pierde altura y las trabéculas de arriba dejan de dibujarse', () => {
    const reborde = new Reborde();
    reborde.actualizar(estadoAlveolo(0));
    const antes = cajaVisible([reborde.grupo]);
    reborde.actualizar(estadoAlveolo(1));
    const despues = cajaVisible([reborde.grupo]);
    expect(antes.max.y).toBeCloseTo(2, 3);
    expect(despues.max.y).toBeCloseTo(-0.4, 3);
    expect(despues.min.y).toBeCloseTo(antes.min.y, 3);
    const barras = reborde.grupo.getObjectByName('trabeculas') as Mesh & {
      instanceMatrix: { array: Float32Array };
      count: number;
    };
    let visibles = 0;
    for (let i = 0; i < barras.count; i++) {
      // La escala X es el primer elemento de cada matriz 4 × 4.
      if (barras.instanceMatrix.array[i * 16]! > 0.01) visibles++;
    }
    expect(visibles).toBeGreaterThan(10);
    expect(visibles).toBeLessThan(barras.count / 2);
    reborde.liberar();
  });
});

describe('encuadre de las vistas (sin navegador: caja envolvente frente al cono de la cámara)', () => {
  /** Vista con que el contenido muestra cada hito (la actividad definitiva, `.verify/alveolo/actividad.json`). */
  const VISTA_DE_HITO: Record<keyof typeof HITOS_ALVEOLO, string> = {
    diente: 'general',
    extraccion: 'alveolo',
    coagulo: 'alveolo',
    granulacion: 'alveolo',
    hueso_entretejido: 'alveolo',
    maduracion: 'corte',
    reabsorcion_reborde: 'reborde',
    reborde_final: 'reborde',
  };

  /** Mayor ángulo (grados) entre el eje de la cámara y las esquinas de la caja. */
  function anguloMaximo(caja: Box3, vista: string): number {
    const c = estadoDeVistaAlveolo(vista, 1);
    const posicion = new Vector3(...c.posicion);
    const eje = new Vector3(...c.objetivo).sub(posicion).normalize();
    let peor = 0;
    for (const sx of [0, 1]) {
      for (const sy of [0, 1]) {
        for (const sz of [0, 1]) {
          const esquina = new Vector3(
            sx ? caja.max.x : caja.min.x,
            sy ? caja.max.y : caja.min.y,
            sz ? caja.max.z : caja.min.z,
          );
          const dir = esquina.sub(posicion).normalize();
          peor = Math.max(peor, (Math.acos(Math.min(1, eje.dot(dir))) * 180) / Math.PI);
        }
      }
    }
    return peor;
  }

  it.each(Object.entries(HITOS_ALVEOLO))(
    'en el hito %s la escena entera cabe en las vistas generales y el alvéolo en la suya',
    (fase, t) => {
      const piezas = todas();
      for (const p of piezas) p.actualizar(estadoAlveolo(t));
      const vista = VISTA_DE_HITO[fase as keyof typeof HITOS_ALVEOLO];
      const todo = cajaVisible(piezas.map((p) => p.grupo));
      // En un lienzo cuadrado el cono vertical y el horizontal miden lo mismo; se deja un 8 % de margen.
      const medioCono = FOV_GRADOS / 2 - 1.4;
      if (vista === 'alveolo') {
        const alveolo = cajaVisible([piezas[3]!.grupo, piezas[2]!.grupo]);
        expect(anguloMaximo(alveolo, vista), `hito ${fase}`).toBeLessThan(medioCono);
      } else {
        expect(anguloMaximo(todo, vista), `hito ${fase}`).toBeLessThan(medioCono);
      }
      // Las vistas general y corte encuadran todo en cualquier hito.
      for (const v of ['general', 'corte'])
        expect(anguloMaximo(todo, v), `hito ${fase}, vista ${v}`).toBeLessThan(medioCono);
      for (const p of piezas) p.liberar();
    },
  );
});
