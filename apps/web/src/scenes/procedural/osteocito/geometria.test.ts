/**
 * Pruebas de las formas de la escena del osteocito sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo, presupuesto de lo que se dibuja de verdad (todas las
 * instancias, la doble pasada de los transparentes de doble cara y el pase de sombras), liberación de recursos,
 * visibilidad por fase y sombras y orden de dibujo.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, Material, Mesh, Object3D } from 'three';
import { DoubleSide, InstancedMesh, Matrix4, Vector3 } from 'three';
import { HITOS_OSTEOCITO, estadoOsteocito } from './estado';
import { cajaEnEscala, celulaDesdeBase, esfera, flecha, tramo, tuboEnZ } from './geometria';
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

function esVisible(o: Object3D): boolean {
  for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
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
 * dos si su material es transparente y de doble cara sin `forceSinglePass` (three lo parte en dos pasadas); los
 * triángulos de cada malla por TODAS sus instancias (las ocultas, de matriz nula, también pasan por la GPU) y por
 * sus pasadas. Antes se contaban solo las instancias a la vista y una pasada (35 987 en el peor instante; con
 * este criterio eran 41 682). Las líneas no suman triángulos. Aparte, el pase de sombras: las mallas que las
 * proyectan según la regla de `EntornoRealista` (opacas o con opacidad > 0,9 y sin `userData.sinSombra`).
 */
function medirDibujo(grupos: readonly Group[]): Dibujo {
  const d: Dibujo = { llamadas: 0, triangulos: 0, llamadasSombra: 0, triangulosSombra: 0 };
  for (const grupo of grupos) {
    grupo.traverse((o) => {
      const g = (o as Mesh).geometry as BufferGeometry | undefined;
      if (!g || !esVisible(o)) return;
      const m = (o as Mesh).material as Material;
      const pasadas = m.transparent && m.side === DoubleSide && !m.forceSinglePass ? 2 : 1;
      d.llamadas += pasadas;
      if (!(o as Mesh).isMesh) return;
      const tri = triangulosDe(g) * (o instanceof InstancedMesh ? o.count : 1);
      d.triangulos += tri * pasadas;
      if (!o.userData.sinSombra && (!m.transparent || m.opacity > 0.9)) {
        d.llamadasSombra++;
        d.triangulosSombra += tri;
      }
    });
  }
  return d;
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

  it('la célula de la superficie crece desde su base, de y = 0 a y = 1, con aristas redondeadas', () => {
    const g = celulaDesdeBase();
    g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeCloseTo(0, 6);
    expect(g.boundingBox!.max.y).toBeCloseTo(1, 6);
    expect(g.boundingBox!.max.x).toBeCloseTo(0.5, 6);
    // Redondeada: más vértices que una caja de 24.
    expect(g.getAttribute('position').count).toBeGreaterThan(24);
  });

  it('todas las formas llevan UV (el relieve de los materiales la necesita) y sin NaN', () => {
    for (const g of [
      tramo(),
      esfera(),
      celulaDesdeBase(),
      flecha(),
      tuboEnZ(0.4, 2),
      cajaEnEscala(7.4, 5, 2.2),
    ]) {
      expect(g.getAttribute('uv')?.count).toBe(g.getAttribute('position').count);
      expect(sinNaN(g.getAttribute('uv').array)).toBe(true);
    }
  });

  it('las UV de cajaEnEscala van en unidades de escena: la cara de 7,4 de ancho recorre 7,4 en U', () => {
    const uv = cajaEnEscala(7.4, 5, 2.2).getAttribute('uv');
    let minU = Infinity;
    let maxU = -Infinity;
    for (let i = 0; i < uv.count; i++) {
      minU = Math.min(minU, uv.getX(i));
      maxU = Math.max(maxU, uv.getX(i));
    }
    expect(maxU - minU).toBeCloseTo(7.4, 5);
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
  it('menos de 40 000 triángulos y de 40 llamadas en el peor instante, también en las sombras', () => {
    const piezas = crearPiezas();
    const peor: Dibujo = { llamadas: 0, triangulos: 0, llamadasSombra: 0, triangulosSombra: 0 };
    for (let i = 0; i <= 200; i++) {
      const e = estadoOsteocito(i / 200);
      for (const p of piezas) p.actualizar(e);
      const m = medirDibujo(piezas.map((p) => p.grupo));
      for (const k of Object.keys(peor) as (keyof Dibujo)[]) peor[k] = Math.max(peor[k], m[k]);
    }
    expect(peor.triangulos).toBeGreaterThan(1000);
    expect(peor.triangulos).toBeLessThan(40_000);
    expect(peor.llamadas).toBeLessThan(40);
    expect(peor.triangulosSombra).toBeLessThan(40_000);
    expect(peor.llamadasSombra).toBeLessThan(40);
    for (const p of piezas) p.liberar();
  });

  it('una pieza instanciada sin nada a la vista no se dibuja', () => {
    const piezas = crearPiezas();
    for (const t of TIEMPOS) {
      const e = estadoOsteocito(t);
      for (const p of piezas) p.actualizar(e);
      for (const p of piezas) {
        for (const m of mallasDe(p.grupo)) {
          if (m instanceof InstancedMesh && m.visible) {
            expect(instanciasVisibles(m), `t = ${t}, ${m.name}`).toBeGreaterThan(0);
          }
        }
      }
    }
    for (const p of piezas) p.liberar();
  });
});

describe('sombras, orden de dibujo y materiales', () => {
  it('el borde de osteoide no proyecta sombra sobre el interior del bloque', () => {
    const bloque = new BloqueMatriz();
    const osteoide = mallasDe(bloque.grupo).find((m) => m.name === 'osteoide_superficie')!;
    expect(osteoide.userData.sinSombra).toBe(true);
    bloque.liberar();
  });

  it('el líquido y los pulsos se dibujan después de los canalículos', () => {
    const red = new RedCelular();
    const dinamica = new Dinamica(red.red);
    const canaliculos = mallasDe(red.grupo).find((m) => m.name === 'canaliculos')!;
    const matCanaliculos = canaliculos.material as Material;
    expect(matCanaliculos.transparent).toBe(true);
    // Una sola pasada (tubos finos sin escribir profundidad) y un velo que cambia con el ángulo.
    expect(matCanaliculos.forceSinglePass).toBe(true);
    expect(matCanaliculos.userData.velo).toBeDefined();
    for (const nombre of ['liquido_intersticial', 'pulsos_senal']) {
      const m = mallasDe(dinamica.grupo).find((x) => x.name === nombre)!;
      const mat = m.material as Material;
      // three dibuja lo opaco antes que lo transparente: solo así cuenta el renderOrder frente a los canalículos.
      expect(mat.transparent, nombre).toBe(true);
      expect(mat.opacity, nombre).toBe(1);
      expect(mat.depthWrite, nombre).toBe(true);
      expect(mat.side, nombre).not.toBe(DoubleSide);
      expect(m.renderOrder, nombre).toBeGreaterThan(canaliculos.renderOrder);
    }
    red.liberar();
    dinamica.liberar();
  });

  it('solo emiten luz las señales (líquido, sensores y pulsos), no el capilar ni las uniones', () => {
    const piezas = crearPiezas();
    for (const p of piezas) p.actualizar(estadoOsteocito(HITOS_OSTEOCITO.senal));
    const emisivas = piezas
      .flatMap((p) => mallasDe(p.grupo))
      .filter((m) => {
        const mat = m.material as { emissive?: { getHex(): number }; emissiveIntensity?: number };
        return !!mat.emissive && mat.emissive.getHex() !== 0 && (mat.emissiveIntensity ?? 0) > 0;
      })
      .map((m) => m.name)
      .sort();
    expect(emisivas).toEqual([
      'cilio_primario',
      'integrinas',
      'liquido_intersticial',
      'pulsos_senal',
    ]);
    for (const p of piezas) p.liberar();
  });

  it('las instancias ocultas no dejan la esfera envolvente en NaN', () => {
    const red = new RedCelular();
    red.actualizar(estadoOsteocito(HITOS_OSTEOCITO.laguna));
    for (const m of mallasDe(red.grupo)) {
      if (!(m instanceof InstancedMesh)) continue;
      m.computeBoundingSphere();
      const c = m.boundingSphere!.center;
      expect(Number.isFinite(c.x + c.y + c.z), m.name).toBe(true);
    }
    red.liberar();
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
