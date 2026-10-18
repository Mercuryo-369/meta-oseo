/**
 * Pruebas de las formas de la escena del osteoclasto sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en 41 instantes, presupuesto de polígonos y de llamadas de dibujo, determinismo, liberación de
 * recursos y visibilidad por fase. Desde la revisión de diseño (2026-10-17), los presupuestos cuentan lo que se
 * dibuja de verdad (la doble pasada de los materiales transparentes de doble cara y el pase de sombras) y se
 * comprueban los emisivos.
 */
import { describe, expect, it } from 'vitest';
import type {
  BufferGeometry,
  Group,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  WebGLProgramParametersWithUniforms,
  WebGLRenderer,
} from 'three';
import { DoubleSide, ShaderLib } from 'three';
import { BLOQUE, HITOS_OSTEOCLASTO, PROFUNDIDAD_LAGUNA, estadoOsteoclasto } from './estado';
import {
  AMPLITUD_LOBULOS,
  caraCorte,
  cupulaLobulada,
  ladosBloque,
  lobulosCupula,
  mediaCupula,
  medioAnillo,
  superficieHueso,
  tapaCupula,
  tapaLobulada,
  uvPlanar,
} from './geometria';
import { CelulasMononucleares, EntornoOseo, Osteoclasto, Particulas } from './mallas';
import type { PiezaOsteoclasto } from './mallas';

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

/** ¿Está el objeto a la vista, contando a sus antecesores? */
function aLaVista(o: {
  visible: boolean;
  parent: { visible: boolean; parent: unknown } | null;
}): boolean {
  let actual: { visible: boolean; parent: unknown } | null = o;
  while (actual) {
    if (!actual.visible) return false;
    actual = actual.parent as { visible: boolean; parent: unknown } | null;
  }
  return true;
}

/**
 * Pasadas con que three dibuja una malla: dos (cara trasera y delantera) si su material es transparente y de
 * doble cara sin `forceSinglePass`; una si no.
 */
function pasadas(malla: Mesh): number {
  const m = malla.material as Material;
  return m.transparent && m.side === DoubleSide && !m.forceSinglePass ? 2 : 1;
}

/** ¿Proyecta sombra? La misma regla de `EntornoRealista.vue`: opaca, o casi. */
function proyectaSombra(malla: Mesh): boolean {
  const m = malla.material as Material;
  return !malla.userData.sinSombra && (!m.transparent || m.opacity > 0.9);
}

/**
 * Triángulos dibujados (una instancia cuenta tantas veces como instancias tiene, y una malla de dos pasadas, dos
 * veces), solo de lo visible. Con `sombra`, los del pase de sombras (una pasada, solo las que proyectan).
 */
function triangulos(grupo: Group, sombra = false): number {
  let suma = 0;
  grupo.traverse((o) => {
    const malla = o as Mesh & { isInstancedMesh?: boolean; count?: number };
    if (!malla.geometry || !aLaVista(malla)) return;
    if (sombra && !proyectaSombra(malla)) return;
    const veces = sombra ? 1 : pasadas(malla);
    suma += triangulosDe(malla.geometry) * (malla.isInstancedMesh ? (malla.count ?? 1) : 1) * veces;
  });
  return suma;
}

/** Llamadas de dibujo: una por pasada de cada objeto a la vista. Con `sombra`, las del pase de sombras. */
function llamadasDeDibujo(grupo: Group, sombra = false): number {
  let n = 0;
  grupo.traverse((o) => {
    const malla = o as Mesh;
    if (!malla.geometry || !aLaVista(o)) return;
    if (sombra) n += proyectaSombra(malla) ? 1 : 0;
    else n += pasadas(malla);
  });
  return n;
}

function mallaLlamada(grupo: Group, nombre: string): Mesh {
  const o = grupo.getObjectByName(nombre) as Mesh | undefined;
  if (!o) throw new Error(`No hay malla "${nombre}"`);
  return o;
}

describe('formas', () => {
  it('las medias cúpulas quedan cada una en su lado de z = 0 y la tapa cubre su sección', () => {
    const trasera = mediaCupula('trasera');
    const delantera = mediaCupula('delantera');
    trasera.computeBoundingBox();
    delantera.computeBoundingBox();
    expect(trasera.boundingBox!.max.z).toBeLessThan(1e-6);
    expect(delantera.boundingBox!.min.z).toBeGreaterThan(-1e-6);
    // Cortada por debajo del ecuador: el borde inferior está en y = cos(0,6·π).
    expect(trasera.boundingBox!.min.y).toBeCloseTo(Math.cos(Math.PI * 0.6), 3);
    const tapa = tapaCupula();
    tapa.computeBoundingBox();
    expect(tapa.boundingBox!.min.y).toBeCloseTo(Math.cos(Math.PI * 0.6), 3);
    expect(tapa.boundingBox!.max.y).toBeCloseTo(1, 6);
    expect(sinNaN(tapa.getAttribute('position').array)).toBe(true);
    const indices = tapa.getIndex()!.array;
    for (let i = 0; i < indices.length; i++) {
      expect(indices[i]!).toBeLessThan(tapa.getAttribute('position').count);
    }
  });

  it('la superficie del hueso está en y = 0 con color por vértice y la cara de corte en z = 0', () => {
    const s = superficieHueso(8, 4, -1, 1, -1, 0);
    s.computeBoundingBox();
    expect(s.boundingBox!.min.y).toBeCloseTo(0, 6);
    expect(s.boundingBox!.max.z).toBeCloseTo(0, 6);
    expect(s.getAttribute('color').count).toBe(s.getAttribute('position').count);
    const c = caraCorte(8, -1, 1, -0.5, 1);
    c.computeBoundingBox();
    expect(c.boundingBox!.min.z).toBeCloseTo(0, 6);
    expect(c.boundingBox!.max.y).toBeCloseTo(0, 6);
    expect(c.boundingBox!.min.y).toBeCloseTo(-0.5, 6);
    // La fila superior son los primeros 9 vértices.
    for (let i = 0; i <= 8; i++) expect(c.getAttribute('position').getY(i)).toBeCloseTo(0, 6);
  });

  it('la cúpula lobulada sigue en su mitad y en el mismo borde, sin costura entre mitades, y la tapa la cierra', () => {
    const borde = Math.cos(Math.PI * 0.6);
    const [trasera, delantera] = [cupulaLobulada('trasera'), cupulaLobulada('delantera')];
    trasera.computeBoundingBox();
    delantera.computeBoundingBox();
    expect(trasera.boundingBox!.max.z).toBeLessThan(1e-6);
    expect(delantera.boundingBox!.min.z).toBeGreaterThan(-1e-6);
    expect(trasera.boundingBox!.min.y).toBeCloseTo(borde, 3);
    for (const g of [trasera, delantera]) {
      const pos = g.getAttribute('position');
      const nor = g.getAttribute('normal');
      for (let i = 0; i < pos.count; i++) {
        const [x, y, z] = [pos.getX(i), pos.getY(i), pos.getZ(i)];
        const r = Math.hypot(x, y, z);
        // Los lóbulos solo empujan hacia fuera, y poco.
        expect(r).toBeGreaterThan(1 - 1e-6);
        expect(r).toBeLessThan(1 + AMPLITUD_LOBULOS + 1e-6);
        expect(Math.hypot(nor.getX(i), nor.getY(i), nor.getZ(i))).toBeCloseTo(1, 5);
        expect((nor.getX(i) * x + nor.getY(i) * y + nor.getZ(i) * z) / r).toBeGreaterThan(0.9);
      }
    }
    // En el corte (z = 0) las dos mitades comparten posiciones y normales: no hay costura.
    const enCorte = (g: BufferGeometry): number[][] => {
      const pos = g.getAttribute('position');
      const nor = g.getAttribute('normal');
      const lista: number[][] = [];
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getZ(i)) > 1e-9) continue;
        lista.push([pos.getX(i), pos.getY(i), nor.getX(i), nor.getY(i), nor.getZ(i)]);
      }
      return lista.sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
    };
    const corteTrasera = enCorte(trasera);
    const corteDelantera = enCorte(delantera);
    expect(corteTrasera.length).toBeGreaterThan(10);
    expect(corteDelantera).toHaveLength(corteTrasera.length);
    corteTrasera.forEach((a, i) =>
      a.forEach((v, k) => expect(v).toBeCloseTo(corteDelantera[i]![k]!, 6)),
    );
    // La tapa tiene UV, apoya en el mismo borde y llega a la misma cima que las cúpulas.
    const tapa = tapaLobulada();
    tapa.computeBoundingBox();
    expect(tapa.getAttribute('uv').count).toBe(tapa.getAttribute('position').count);
    expect(tapa.boundingBox!.min.y).toBeCloseTo(borde, 3);
    expect(tapa.boundingBox!.max.y).toBeCloseTo(1 + lobulosCupula(0, 1, 0), 6);
    expect(tapa.boundingBox!.max.z).toBeCloseTo(0, 9);
    expect(lobulosCupula(0.95, borde, 0)).toBeCloseTo(0, 9);
  });

  it('uvPlanar proyecta cada cara en su plano y en unidades de escena', () => {
    const s = uvPlanar(superficieHueso(4, 2, -1, 1, -1, 0), 0.5);
    const pos = s.getAttribute('position');
    const uv = s.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      expect(uv.getX(i)).toBeCloseTo(pos.getX(i) / 0.5, 6);
      expect(uv.getY(i)).toBeCloseTo(pos.getZ(i) / 0.5, 6);
    }
    const c = uvPlanar(caraCorte(4, -1, 1, -0.5, 1), 0.5);
    expect(c.getAttribute('uv').getY(0)).toBeCloseTo(c.getAttribute('position').getY(0) / 0.5, 6);
  });

  it('los lados del bloque y los medios anillos quedan en su mitad', () => {
    const lados = ladosBloque(-1, 1, -0.8, -0.5);
    lados.computeBoundingBox();
    expect(lados.boundingBox!.max.z).toBeCloseTo(0, 6);
    expect(lados.boundingBox!.min.z).toBeCloseTo(-0.8, 6);
    const trasero = medioAnillo(1, 0.1, 'trasera');
    trasero.computeBoundingBox();
    expect(trasero.boundingBox!.max.z).toBeLessThan(0.11);
    expect(trasero.boundingBox!.min.z).toBeCloseTo(-1.1, 3);
    const delantero = medioAnillo(1, 0.1, 'delantera');
    delantero.computeBoundingBox();
    expect(delantero.boundingBox!.min.z).toBeGreaterThan(-0.11);
    expect(delantero.boundingBox!.max.z).toBeCloseTo(1.1, 3);
  });
});

describe.each<[string, () => PiezaOsteoclasto, number, number]>([
  ['EntornoOseo', () => new EntornoOseo(), 8_000, 7],
  ['Osteoclasto', () => new Osteoclasto(), 8_000, 8],
  // 4 000 (antes 3 000): desde el realismo (2026-10-14) las células son esferas de 12 × 8 (22 instancias,
  // 3 696 triángulos); la escena entera sigue muy por debajo de su tope de 40 000.
  ['CelulasMononucleares', () => new CelulasMononucleares(), 4_000, 1],
  ['Particulas', () => new Particulas(), 7_000, 2],
])('%s', (_, crear, presupuesto, llamadas) => {
  it('cabe en el presupuesto de polígonos y de llamadas de dibujo en todo instante', () => {
    const pieza = crear();
    let maximo = 0;
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoOsteoclasto(t));
      maximo = Math.max(maximo, triangulos(pieza.grupo));
      expect(llamadasDeDibujo(pieza.grupo)).toBeLessThanOrEqual(llamadas);
    }
    expect(maximo).toBeGreaterThan(50);
    expect(maximo).toBeLessThan(presupuesto);
    pieza.liberar();
  });

  it('no produce NaN en ningún instante', () => {
    const pieza = crear();
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoOsteoclasto(t));
      pieza.grupo.traverse((o) => {
        const m = o as Mesh & {
          isInstancedMesh?: boolean;
          instanceMatrix?: { array: ArrayLike<number> };
        };
        expect(Number.isFinite(o.position.x + o.position.y + o.position.z), `t = ${t}`).toBe(true);
        expect(Number.isFinite(o.scale.x * o.scale.y * o.scale.z), `t = ${t}`).toBe(true);
        if (m.isInstancedMesh && m.instanceMatrix) {
          expect(sinNaN(m.instanceMatrix.array), `${o.name}, t = ${t}`).toBe(true);
        }
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
        lista.push(o.visible, o.position.x, o.position.z, o.scale.x, o.scale.y);
        const m = (o as Mesh).material as MeshStandardMaterial | undefined;
        if (m) lista.push(m.opacity);
        // Las matrices de una malla oculta no se dibujan ni se reescriben: solo cuentan las visibles.
        const im = o as Mesh & {
          isInstancedMesh?: boolean;
          instanceMatrix?: { array: ArrayLike<number> };
        };
        if (im.isInstancedMesh && im.instanceMatrix && aLaVista(o)) {
          lista.push(Array.from(im.instanceMatrix.array));
        }
      });
      return lista;
    };
    pieza.actualizar(estadoOsteoclasto(0.61));
    const antes = foto();
    pieza.actualizar(estadoOsteoclasto(0.05));
    pieza.actualizar(estadoOsteoclasto(0.97));
    pieza.actualizar(estadoOsteoclasto(0.61));
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

describe('presupuesto total', () => {
  it('menos de 40 000 triángulos y de 40 llamadas de dibujo en el peor instante (y de 40 de sombra)', () => {
    const piezas = [
      new EntornoOseo(),
      new Osteoclasto(),
      new CelulasMononucleares(),
      new Particulas(),
    ];
    let peorTri = 0;
    let peorLlam = 0;
    let peorSombra = 0;
    for (const t of TIEMPOS) {
      let tri = 0;
      let llam = 0;
      let sombra = 0;
      for (const p of piezas) {
        p.actualizar(estadoOsteoclasto(t));
        tri += triangulos(p.grupo);
        llam += llamadasDeDibujo(p.grupo);
        sombra += llamadasDeDibujo(p.grupo, true);
      }
      peorTri = Math.max(peorTri, tri);
      peorLlam = Math.max(peorLlam, llam);
      peorSombra = Math.max(peorSombra, sombra);
    }
    expect(peorTri).toBeLessThan(40_000);
    expect(peorLlam).toBeLessThan(40);
    expect(peorSombra).toBeLessThan(40);
    for (const p of piezas) p.liberar();
  });

  it('ningún material es transparente de doble cara: cada pieza se dibuja en una sola pasada', () => {
    const piezas = [
      new EntornoOseo(),
      new Osteoclasto(),
      new CelulasMononucleares(),
      new Particulas(),
    ];
    for (const p of piezas) {
      p.grupo.traverse((o) => {
        const m = (o as Mesh).material as Material | undefined;
        if (m) expect(m.side, o.name).not.toBe(DoubleSide);
      });
      p.liberar();
    }
  });
});

describe('emisivos', () => {
  const materialesDe = (grupo: Group): MeshPhysicalMaterial[] => {
    const lista: MeshPhysicalMaterial[] = [];
    grupo.traverse((o) => {
      const m = (o as Mesh).material as MeshPhysicalMaterial | undefined;
      if (m && !lista.includes(m)) lista.push(m);
    });
    return lista;
  };

  it('solo las partículas emiten luz, y su emisivo va teñido con el color de cada instancia', () => {
    const piezas = [new EntornoOseo(), new Osteoclasto(), new CelulasMononucleares()];
    for (const p of piezas) {
      for (const m of materialesDe(p.grupo)) {
        const emite = m.emissiveIntensity > 0 && m.emissive.getHex() !== 0;
        expect(emite, `${p.grupo.name}: ${m.color.getHexString()}`).toBe(false);
      }
      p.liberar();
    }
    const particulas = new Particulas();
    const [material] = materialesDe(particulas.grupo);
    expect(material!.emissiveIntensity).toBeGreaterThan(0);
    // La sustitución entra en el sombreador real de three, después de calcular el emisivo.
    const shader = {
      vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader,
      uniforms: {},
    } as unknown as WebGLProgramParametersWithUniforms;
    material!.onBeforeCompile(shader, undefined as unknown as WebGLRenderer);
    const f = shader.fragmentShader;
    const tenido = f.indexOf('totalEmissiveRadiance *= vColor.rgb;');
    expect(tenido).toBeGreaterThan(f.indexOf('vec3 totalEmissiveRadiance = emissive;'));
    expect(tenido).toBeLessThan(f.indexOf('vec3 outgoingLight'));
    expect(material!.customProgramCacheKey()).toContain('emisivo_instancia');
    particulas.liberar();
  });
});

describe('visibilidad por fase', () => {
  it('la mitad delantera del bloque se ve al principio y desaparece desde el borde rugoso', () => {
    const entorno = new EntornoOseo();
    const delantera = entorno.grupo.getObjectByName('hueso_delantera')!;
    entorno.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.adhesion));
    expect(delantera.visible).toBe(true);
    expect(delantera.position.z).toBe(0);
    for (const t of [HITOS_OSTEOCLASTO.borde_rugoso, HITOS_OSTEOCLASTO.resorcion, 1]) {
      entorno.actualizar(estadoOsteoclasto(t));
      expect(delantera.visible, `t = ${t}`).toBe(false);
    }
    entorno.liberar();
  });

  it('la superficie se hunde hasta la profundidad de la laguna en el centro y la cara de corte la sigue', () => {
    const entorno = new EntornoOseo();
    const superficie = mallaLlamada(
      entorno.grupo.getObjectByName('hueso_trasera') as Group,
      'superficie_osea',
    );
    const cara = mallaLlamada(
      entorno.grupo.getObjectByName('hueso_trasera') as Group,
      'cara_de_corte',
    );
    const minimoY = (m: Mesh): number => {
      const pos = m.geometry.getAttribute('position');
      let minimo = Infinity;
      for (let i = 0; i < pos.count; i++) minimo = Math.min(minimo, pos.getY(i));
      return minimo;
    };
    const minimoFilaSuperior = (): number => {
      const pos = cara.geometry.getAttribute('position');
      let minimo = Infinity;
      for (let i = 0; i <= 72; i++) minimo = Math.min(minimo, pos.getY(i));
      return minimo;
    };
    entorno.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.adhesion));
    expect(minimoY(superficie)).toBeCloseTo(0, 6);
    expect(minimoFilaSuperior()).toBeCloseTo(0, 6);
    entorno.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.resorcion));
    expect(minimoY(superficie)).toBeLessThan(-PROFUNDIDAD_LAGUNA * 0.85);
    expect(minimoY(superficie)).toBeGreaterThan(-BLOQUE.alto);
    expect(minimoFilaSuperior()).toBeLessThan(-PROFUNDIDAD_LAGUNA * 0.85);
    entorno.liberar();
  });

  it('la célula, el anillo, los pliegues y los fragmentos aparecen en su fase', () => {
    const celula = new Osteoclasto();
    const visibles = (): Record<string, boolean> => ({
      cuerpo: celula.grupo.getObjectByName('citoplasma_trasero')!.parent!.visible,
      frente: celula.grupo.getObjectByName('citoplasma_delantero')!.parent!.visible,
      anillo: celula.grupo.getObjectByName('zona_clara_trasera')!.visible,
      anilloDelantero: celula.grupo.getObjectByName('zona_clara_delantera')!.visible,
      pliegues: celula.grupo.getObjectByName('borde_festoneado')!.visible,
      fragmentos: celula.grupo.getObjectByName('cuerpos_apoptoticos')!.visible,
      nucleos: celula.grupo.getObjectByName('nucleos')!.visible,
    });
    celula.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.precursores));
    expect(visibles()).toEqual({
      cuerpo: false,
      frente: false,
      anillo: false,
      anilloDelantero: false,
      pliegues: false,
      fragmentos: false,
      nucleos: false,
    });
    celula.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.fusion));
    expect(visibles()).toMatchObject({ cuerpo: true, frente: true, nucleos: true, anillo: false });
    celula.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.adhesion));
    expect(visibles()).toMatchObject({ anillo: true, anilloDelantero: true, pliegues: false });
    celula.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.borde_rugoso));
    expect(visibles()).toMatchObject({
      frente: false,
      anilloDelantero: false,
      pliegues: true,
      fragmentos: false,
    });
    celula.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.apoptosis));
    expect(visibles()).toMatchObject({ anillo: false, pliegues: false, fragmentos: true });
    celula.liberar();
  });

  it('las partículas ácidas solo se dibujan mientras hay bombeo y los productos mientras hay liberación', () => {
    const particulas = new Particulas();
    const acido = particulas.grupo.getObjectByName('salida_acida')!;
    const productos = particulas.grupo.getObjectByName('productos_resorcion')!;
    particulas.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.adhesion));
    expect([acido.visible, productos.visible]).toEqual([false, false]);
    particulas.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.resorcion));
    expect([acido.visible, productos.visible]).toEqual([true, false]);
    particulas.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.liberacion));
    expect([acido.visible, productos.visible]).toEqual([false, true]);
    particulas.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.apoptosis));
    expect([acido.visible, productos.visible]).toEqual([false, false]);
    particulas.liberar();
  });

  it('los precursores se ven al principio, desaparecen fusionados y vuelven las células de inversión al final', () => {
    const celulas = new CelulasMononucleares();
    const malla = celulas.grupo.getObjectByName('mononucleares')!;
    celulas.actualizar(estadoOsteoclasto(0));
    expect(malla.visible).toBe(true);
    celulas.actualizar(estadoOsteoclasto(HITOS_OSTEOCLASTO.adhesion));
    expect(malla.visible).toBe(false);
    celulas.actualizar(estadoOsteoclasto(1));
    expect(malla.visible).toBe(true);
    celulas.liberar();
  });
});
