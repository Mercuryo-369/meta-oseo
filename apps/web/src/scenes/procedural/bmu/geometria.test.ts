/**
 * Pruebas de la geometría de la escena de la BMU sin WebGL (three crea las geometrías en memoria): presupuesto
 * de polígonos y de llamadas de dibujo, ausencia de NaN en todo el recorrido del tiempo, determinismo (la
 * misma `t` da los mismos vértices, vaya lo que vaya antes) y liberación de recursos. Desde la revisión de diseño
 * (2026-10-17), también la orientación de las instancias (bases directas: si no, three las ilumina al revés), la
 * esfera envolvente de las mallas instanciadas y la oclusión ambiental del túnel.
 */
import { describe, expect, it, vi } from 'vitest';
import type { InstancedMesh } from 'three';
import { Matrix4 } from 'three';
import { CelulasBmu, TOTAL_INSTANCIAS } from './celulas';
import { LARGO, N_OSTEOCITOS, estadoBmu } from './estado';
import { MallaHueso, materialHuesoBmu, oclusionLuz } from './malla';
import { OsteocitosBmu } from './osteocitos';
import { LIMITES_DISTANCIA, estadoConZoom, estadoDeVista, mezclarCamara, vistaBmu } from './vistas';
import { VISTAS_ESCENA_PROCEDURAL } from '@/content/nodos3d';

const TIEMPOS = Array.from({ length: 41 }, (_, i) => i / 40);

function sinNaN(datos: ArrayLike<number>): boolean {
  for (let i = 0; i < datos.length; i++) if (!Number.isFinite(datos[i]!)) return false;
  return true;
}

/** Una instancia oculta tiene escala cero: las 15 primeras componentes de su matriz a cero (m[15] = 1). */
function esVisible(matrices: ArrayLike<number>, i: number): boolean {
  for (let k = 0; k < 15; k++) if (matrices[16 * i + k] !== 0) return true;
  return false;
}

/** Determinantes de las instancias visibles de una malla. */
function determinantes(malla: InstancedMesh): number[] {
  const m = new Matrix4();
  const lista: number[] = [];
  for (let i = 0; i < malla.count; i++) {
    if (!esVisible(malla.instanceMatrix.array, i)) continue;
    malla.getMatrixAt(i, m);
    lista.push(m.determinant());
  }
  return lista;
}

/** Triángulos de una geometría indexada. */
function triangulosDe(malla: InstancedMesh): number {
  return malla.geometry.getIndex()!.count / 3;
}

describe('MallaHueso', () => {
  it('es una sola malla de pocos triángulos', () => {
    const malla = new MallaHueso();
    const triangulos = (malla.geometria.getIndex()?.count ?? 0) / 3;
    expect(triangulos).toBeGreaterThan(5_000);
    expect(triangulos).toBeLessThan(20_000);
    malla.liberar();
  });

  it('no produce NaN en ningún instante y los índices apuntan a vértices que existen', () => {
    const malla = new MallaHueso();
    const vertices = malla.geometria.getAttribute('position').count;
    const indices = malla.geometria.getIndex()!.array;
    for (let i = 0; i < indices.length; i++) expect(indices[i]!).toBeLessThan(vertices);
    for (const t of TIEMPOS) {
      malla.actualizar(estadoBmu(t));
      for (const nombre of ['position', 'normal', 'color', 'uv'] as const) {
        expect(sinNaN(malla.geometria.getAttribute(nombre).array), `${nombre} en t = ${t}`).toBe(
          true,
        );
      }
    }
    malla.liberar();
  });

  it('lleva oclusión ambiental: 1 fuera, menos en la luz del conducto y 1 en los extremos del túnel', () => {
    const malla = new MallaHueso();
    const ao = malla.geometria.getAttribute('ao');
    expect(ao.count).toBe(malla.geometria.getAttribute('position').count);
    let minimo = Infinity;
    let unos = 0;
    for (let i = 0; i < ao.count; i++) {
      const v = ao.getX(i);
      expect(v).toBeGreaterThanOrEqual(0.4);
      expect(v).toBeLessThanOrEqual(1);
      minimo = Math.min(minimo, v);
      if (v === 1) unos++;
    }
    // Las piezas exteriores (más de la mitad de los vértices) quedan a 1; el fondo del túnel, por debajo de 0,8.
    expect(unos).toBeGreaterThan(ao.count / 2);
    expect(minimo).toBeLessThan(0.45);
    // Frente a la ventana más luz que junto a las caras de corte; en los extremos, al aire libre.
    expect(oclusionLuz(0, 0.5)).toBeCloseTo(0.75, 6);
    expect(oclusionLuz(0, 0)).toBeCloseTo(0.4, 6);
    expect(oclusionLuz(LARGO / 2, 0.5)).toBe(1);
    expect(oclusionLuz(-LARGO / 2, 0)).toBe(1);
    // El material la usa (y comparte programa con los demás materiales con motas y oclusión).
    const material = materialHuesoBmu();
    expect(material.customProgramCacheKey()).toContain('ao');
    material.dispose();
    malla.liberar();
  });

  it('las normales de la luz están normalizadas', () => {
    const malla = new MallaHueso();
    malla.actualizar(estadoBmu(0.66));
    const n = malla.geometria.getAttribute('normal').array;
    for (let i = 0; i < n.length; i += 3) {
      const largo = Math.hypot(n[i]!, n[i + 1]!, n[i + 2]!);
      expect(Math.abs(largo - 1)).toBeLessThan(1e-3);
    }
    malla.liberar();
  });

  it('la misma t da los mismos vértices, aunque antes se haya recorrido el tiempo en cualquier orden', () => {
    const malla = new MallaHueso();
    malla.actualizar(estadoBmu(0.6));
    const primera = Array.from(malla.geometria.getAttribute('position').array);
    for (const t of [1, 0.2, 0.9, 0, 0.45]) malla.actualizar(estadoBmu(t));
    malla.actualizar(estadoBmu(0.6));
    expect(Array.from(malla.geometria.getAttribute('position').array)).toEqual(primera);
    malla.liberar();
  });

  it('el radio de la luz baja de la cavidad al conducto final y libera la geometría al terminar', () => {
    const malla = new MallaHueso();
    malla.actualizar(estadoBmu(0.5));
    const ancha = malla.radioLuzEn(0);
    malla.actualizar(estadoBmu(1));
    const estrecha = malla.radioLuzEn(0);
    expect(estrecha).toBeLessThan(ancha);
    const liberar = vi.fn();
    malla.geometria.addEventListener('dispose', liberar);
    malla.liberar();
    expect(liberar).toHaveBeenCalledTimes(1);
  });
});

describe('CelulasBmu y OsteocitosBmu', () => {
  it('usan una instancia de malla cada una y un presupuesto de instancias pequeño', () => {
    const hueso = new MallaHueso();
    const celulas = new CelulasBmu(hueso);
    const osteocitos = new OsteocitosBmu();
    expect(celulas.malla.count).toBe(TOTAL_INSTANCIAS);
    expect(TOTAL_INSTANCIAS).toBeLessThan(400);
    expect(osteocitos.discos.count).toBe(N_OSTEOCITOS * 3);
    // Triángulos totales de la escena por debajo de 60 000: todas las instancias se dibujan (las ocultas, con
    // escala cero). Los triángulos de cada pieza salen de su geometría (antes, 16 fijos por disco, que ya tiene
    // 24). Sin doble pasada: ningún material es transparente (el pase de sombras dibuja lo mismo otra vez, en
    // las mismas 5 llamadas). Falta el capilar (80 triángulos): hoy suman 54 576.
    for (const malla of [celulas.malla, osteocitos.discos, osteocitos.canaliculos]) {
      expect((malla.material as { transparent: boolean }).transparent, malla.name).toBe(false);
    }
    const triangulos =
      celulas.malla.count * triangulosDe(celulas.malla) +
      (hueso.geometria.getIndex()?.count ?? 0) / 3 +
      osteocitos.discos.count * triangulosDe(osteocitos.discos) +
      osteocitos.canaliculos.count * triangulosDe(osteocitos.canaliculos);
    expect(triangulos).toBeLessThan(60_000);
    celulas.liberar();
    osteocitos.liberar();
    hueso.liberar();
  });

  it('no producen NaN en ningún instante y las instancias ocultas quedan con escala cero', () => {
    const hueso = new MallaHueso();
    const celulas = new CelulasBmu(hueso);
    const osteocitos = new OsteocitosBmu();
    for (const t of TIEMPOS) {
      const e = estadoBmu(t);
      hueso.actualizar(e);
      celulas.actualizar(e);
      osteocitos.actualizar(e);
      expect(sinNaN(celulas.malla.instanceMatrix.array), `celulas en t = ${t}`).toBe(true);
      expect(sinNaN(celulas.malla.instanceColor!.array), `colores en t = ${t}`).toBe(true);
      expect(sinNaN(osteocitos.discos.instanceMatrix.array), `osteocitos en t = ${t}`).toBe(true);
      expect(sinNaN(osteocitos.canaliculos.instanceMatrix.array), `canalículos en t = ${t}`).toBe(
        true,
      );
    }
    celulas.liberar();
    osteocitos.liberar();
    hueso.liberar();
  });

  it('las instancias visibles tienen base directa (determinante positivo): three las ilumina del lado bueno', () => {
    // three decide la cara delantera por objeto (determinante de la matriz de mundo), no por instancia: una
    // instancia con base zurda se dibuja por su cara trasera, con la normal invertida, y se ilumina al revés.
    const hueso = new MallaHueso();
    const celulas = new CelulasBmu(hueso);
    const osteocitos = new OsteocitosBmu();
    for (const t of [0.14, 0.32, 0.5, 0.66, 0.84, 1]) {
      const e = estadoBmu(t);
      hueso.actualizar(e);
      celulas.actualizar(e);
      osteocitos.actualizar(e);
      for (const malla of [celulas.malla, osteocitos.discos, osteocitos.canaliculos]) {
        const dets = determinantes(malla);
        if (t >= 0.84 || malla === celulas.malla)
          expect(dets.length, `${malla.name}, t = ${t}`).toBeGreaterThan(0);
        for (const d of dets) expect(d, `${malla.name}, t = ${t}`).toBeGreaterThan(0);
      }
    }
    celulas.liberar();
    osteocitos.liberar();
    hueso.liberar();
  });

  it('la esfera envolvente de cada malla instanciada es finita aunque haya instancias ocultas', () => {
    const hueso = new MallaHueso();
    const celulas = new CelulasBmu(hueso);
    const osteocitos = new OsteocitosBmu();
    for (const t of [0, 0.32, 0.5, 0.84]) {
      const e = estadoBmu(t);
      hueso.actualizar(e);
      celulas.actualizar(e);
      osteocitos.actualizar(e);
      for (const malla of [celulas.malla, osteocitos.discos, osteocitos.canaliculos]) {
        malla.computeBoundingSphere();
        const { center, radius } = malla.boundingSphere!;
        expect(
          Number.isFinite(center.x + center.y + center.z + radius),
          `${malla.name}, t = ${t}`,
        ).toBe(true);
      }
    }
    celulas.liberar();
    osteocitos.liberar();
    hueso.liberar();
  });

  it('cada célula lleva su oclusión ambiental (por instancia): menos luz indirecta en el fondo del túnel', () => {
    const hueso = new MallaHueso();
    const celulas = new CelulasBmu(hueso);
    const ao = celulas.malla.geometry.getAttribute('ao');
    expect(ao.count).toBe(TOTAL_INSTANCIAS);
    expect(
      (ao as unknown as { isInstancedBufferAttribute?: boolean }).isInstancedBufferAttribute,
    ).toBe(true);
    expect(
      (celulas.malla.material as { customProgramCacheKey: () => string }).customProgramCacheKey(),
    ).toContain('ao');
    for (const t of [0.14, 0.32, 0.66]) {
      const e = estadoBmu(t);
      hueso.actualizar(e);
      celulas.actualizar(e);
      let minimo = Infinity;
      for (let i = 0; i < ao.count; i++) {
        const v = ao.getX(i);
        expect(v, `t = ${t}`).toBeGreaterThan(0.4);
        expect(v, `t = ${t}`).toBeLessThanOrEqual(1);
        if (esVisible(celulas.malla.instanceMatrix.array, i)) minimo = Math.min(minimo, v);
      }
      expect(minimo, `t = ${t}`).toBeLessThan(0.9);
    }
    celulas.liberar();
    hueso.liberar();
  });

  it('en reposo (t = 0) no hay osteoclastos ni osteocitos visibles; en plena resorción, sí osteoclastos', () => {
    const hueso = new MallaHueso();
    const celulas = new CelulasBmu(hueso);
    const osteocitos = new OsteocitosBmu();
    const visibles = (matrices: ArrayLike<number>, desde: number, hasta: number): number => {
      let n = 0;
      for (let i = desde; i < hasta; i++) if (esVisible(matrices, i)) n += 1;
      return n;
    };
    const inicio = estadoBmu(0);
    hueso.actualizar(inicio);
    celulas.actualizar(inicio);
    osteocitos.actualizar(inicio);
    expect(visibles(osteocitos.discos.instanceMatrix.array, 0, osteocitos.discos.count)).toBe(0);
    const resorcion = estadoBmu(0.32);
    hueso.actualizar(resorcion);
    celulas.actualizar(resorcion);
    // Precursores (8) y luego 4 cuerpos de osteoclasto: los cuerpos son las instancias 8 a 11.
    expect(visibles(celulas.malla.instanceMatrix.array, 8, 12)).toBe(4);
    const final = estadoBmu(1);
    osteocitos.actualizar(final);
    expect(
      visibles(osteocitos.discos.instanceMatrix.array, 0, osteocitos.discos.count),
    ).toBeGreaterThanOrEqual(N_OSTEOCITOS * 3 - 6);
    celulas.liberar();
    osteocitos.liberar();
    hueso.liberar();
  });
});

describe('vistas de cámara', () => {
  it('hay una vista para cada nombre del contenido y desconocidas caen en la general', () => {
    for (const nombre of VISTAS_ESCENA_PROCEDURAL.bmu_remodelado) {
      expect(vistaBmu(nombre), nombre).toBeDefined();
      expect(sinNaN(estadoDeVista(nombre, 1.5).posicion)).toBe(true);
    }
    expect(vistaBmu('inexistente')).toBe(vistaBmu('general'));
  });

  it('en un lienzo estrecho la cámara se aleja y siempre queda dentro de los límites del zoom', () => {
    const ancho = estadoDeVista('general', 2);
    const estrecho = estadoDeVista('general', 0.8);
    const dist = (e: ReturnType<typeof estadoDeVista>) =>
      Math.hypot(...(e.posicion.map((v, i) => v - e.objetivo[i]!) as [number, number, number]));
    expect(dist(estrecho)).toBeGreaterThan(dist(ancho));
    for (const nombre of VISTAS_ESCENA_PROCEDURAL.bmu_remodelado) {
      for (const aspecto of [0.4, 0.8, 1.5, 2.5]) {
        const d = dist(estadoDeVista(nombre, aspecto));
        expect(d).toBeGreaterThanOrEqual(LIMITES_DISTANCIA.minima);
        expect(d).toBeLessThanOrEqual(LIMITES_DISTANCIA.maxima);
      }
    }
  });

  it('la transición empieza y termina exactamente en los estados dados', () => {
    const a = estadoDeVista('general', 1.5);
    const b = estadoDeVista('detalle', 1.5);
    const inicio = mezclarCamara(a, b, 0);
    const fin = mezclarCamara(a, b, 1);
    a.posicion.forEach((v, i) => expect(inicio.posicion[i]!).toBeCloseTo(v, 9));
    b.posicion.forEach((v, i) => expect(fin.posicion[i]!).toBeCloseTo(v, 9));
    b.objetivo.forEach((v, i) => expect(fin.objetivo[i]!).toBeCloseTo(v, 9));
  });

  it('el zoom respeta los límites de distancia', () => {
    const e = estadoDeVista('general', 1.5);
    const cerca = estadoConZoom(e, 0.0001);
    const lejos = estadoConZoom(e, 1000);
    const dist = (x: typeof e) =>
      Math.hypot(...(x.posicion.map((v, i) => v - x.objetivo[i]!) as [number, number, number]));
    expect(dist(cerca)).toBeCloseTo(LIMITES_DISTANCIA.minima, 6);
    expect(dist(lejos)).toBeCloseTo(LIMITES_DISTANCIA.maxima, 6);
  });
});
