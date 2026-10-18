/**
 * Pruebas de las formas de la escena de las dos rutas sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo, presupuesto de lo que se dibuja de verdad (doble pasada de los
 * transparentes y sombras incluidas), grano del relieve en unidades, formas celulares, liberación de recursos,
 * determinismo y visibilidad por fase.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, InstancedMesh, Material, Mesh, Object3D } from 'three';
import {
  Color,
  DoubleSide,
  Matrix4,
  MeshPhysicalMaterial,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { COLLAR, HITOS_DOS_RUTAS, PLACA, estadoDosRutas } from './estado';
import {
  anilloAbierto,
  aro,
  caja,
  cilindro,
  esfera,
  osteonaConCanal,
  tabla,
  tramo,
} from './geometria';
import { FORMA, LadoEndocondral, LadoIntramembranoso, llegada } from './mallas';
import type { LadoDosRutas } from './mallas';
import { HEX, NATURAL } from './paleta';

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

/**
 * Lo que se dibuja de verdad en un instante. Pase principal: una llamada por objeto visible (las líneas también, sin
 * triángulos) y por grupo si tiene varios materiales; un material transparente de doble cara sin `forceSinglePass`
 * cuenta dos veces (three lo dibuja en dos pasadas). Las instancias cuentan todas. Pase de sombras: las mallas que
 * proyectan con la regla de `EntornoRealista` (opacas u opacidad > 0,9, sin `userData.sinSombra`).
 */
function medir(grupos: readonly Group[]): {
  triangulos: number;
  llamadas: number;
  llamadasSombra: number;
} {
  let triangulos = 0;
  let llamadas = 0;
  let llamadasSombra = 0;
  for (const grupo of grupos) {
    grupo.traverse((o) => {
      if (!esVisible(o)) return;
      if ((o as { isLine?: boolean }).isLine) {
        llamadas++;
        return;
      }
      const malla = o as Mesh;
      if (!malla.isMesh) return;
      const g = malla.geometry;
      const total = g.index ? g.index.count : g.getAttribute('position').count;
      const instancias = (malla as InstancedMesh).isInstancedMesh
        ? (malla as InstancedMesh).count
        : 1;
      const materiales = (
        Array.isArray(malla.material) ? malla.material : [malla.material]
      ) as Material[];
      const partes =
        Array.isArray(malla.material) && g.groups.length > 0
          ? g.groups.map((gr) => ({ m: materiales[gr.materialIndex ?? 0], cuenta: gr.count }))
          : [{ m: materiales[0], cuenta: total }];
      const primero = materiales[0]!;
      const proyecta = !malla.userData.sinSombra && (!primero.transparent || primero.opacity > 0.9);
      for (const { m, cuenta } of partes) {
        if (!m) continue;
        const pasadas = m.transparent && m.side === DoubleSide && !m.forceSinglePass ? 2 : 1;
        llamadas += pasadas;
        triangulos += pasadas * (Math.min(cuenta, total) / 3) * instancias;
        if (proyecta) llamadasSombra++;
      }
    });
  }
  return { triangulos, llamadas, llamadasSombra };
}

/** Posición y semiejes de la instancia `i`. */
function instancia(o: Object3D, i: number): { p: Vector3; e: Vector3 } {
  const m = new Matrix4();
  (o as InstancedMesh).getMatrixAt(i, m);
  const p = new Vector3();
  const e = new Vector3();
  m.decompose(p, new Quaternion(), e);
  return { p, e };
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
    ['tabla', tabla],
    ['tramo', () => tramo()],
    ['cilindro', () => cilindro()],
    ['anilloAbierto', () => anilloAbierto(0.43, 0.54)],
    ['aro', () => aro(0.06, 0.1)],
    ['osteonaConCanal', () => osteonaConCanal()],
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

describe('UV en unidades de escena (realismo-04 y realismo-19)', () => {
  it('la tabla lleva UV a su tamaño final: la cara frontal mide en UV lo que mide la tabla', () => {
    const g = tabla();
    const pos = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    const frontal = { u: [Infinity, -Infinity], v: [Infinity, -Infinity] };
    for (let i = 0; i < pos.count; i++) {
      if (pos.getZ(i) < 0.4999) continue;
      frontal.u = [Math.min(frontal.u[0]!, uv.getX(i)), Math.max(frontal.u[1]!, uv.getX(i))];
      frontal.v = [Math.min(frontal.v[0]!, uv.getY(i)), Math.max(frontal.v[1]!, uv.getY(i))];
    }
    // Antes, de 0 a 1 en los dos sentidos: 2,9 × 20,6 repeticiones por unidad con la repetición 9 × 3,3.
    expect(frontal.u[1]! - frontal.u[0]!).toBeCloseTo(
      PLACA.ancho * (1 - 2 * (0.035 / PLACA.ancho)),
      4,
    );
    expect(frontal.v[1]! - frontal.v[0]!).toBeCloseTo(PLACA.grosor * (1 - 2 * 0.18), 4);
    g.dispose();
  });

  it('el anillo abierto lleva UV en unidades: arco por radio alrededor y alto a lo largo', () => {
    const alto = 2 * COLLAR.medioLargo;
    const g = anilloAbierto(COLLAR.interior, COLLAR.exterior, 40, { alto });
    const pos = g.getAttribute('position');
    const normal = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    let uMin = Infinity;
    let uMax = -Infinity;
    let vMin = Infinity;
    let vMax = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      const radial = Math.abs(normal.getX(i) * pos.getX(i) + normal.getZ(i) * pos.getZ(i)) / r;
      // Pared exterior: normal radial y radio exterior.
      if (Math.abs(r - COLLAR.exterior) > 1e-4 || radial < 0.9) continue;
      uMin = Math.min(uMin, uv.getX(i));
      uMax = Math.max(uMax, uv.getX(i));
      vMin = Math.min(vMin, uv.getY(i));
      vMax = Math.max(vMax, uv.getY(i));
    }
    // Abierto 120°: la pared recorre 240° de la vuelta.
    expect(uMax - uMin).toBeCloseTo(COLLAR.exterior * ((240 * Math.PI) / 180), 3);
    expect(vMax - vMin).toBeCloseTo(alto, 6);
    g.dispose();
  });

  it('la repetición del relieve es por unidad en las tablas, el collar y la cortical', () => {
    const izquierda = new LadoIntramembranoso();
    const derecha = new LadoEndocondral();
    const repeticion = (grupo: Group, nombre: string): number[] => {
      const m = (buscar(grupo, nombre) as Mesh).material as MeshPhysicalMaterial;
      return m.bumpMap!.repeat.toArray();
    };
    expect(repeticion(izquierda.grupo, 'tabla_superior')).toEqual([1.5, 1.5]);
    expect(repeticion(derecha.grupo, 'collar_periostico')).toEqual([1.5, 1.5]);
    expect(repeticion(derecha.grupo, 'cortical')).toEqual([1.4, 1.4]);
    izquierda.liberar();
    derecha.liberar();
  });
});

describe('formas del realismo', () => {
  it('la tabla es una caja de lado 1 con UV, de caras planas donde van las laminillas', () => {
    const g = tabla();
    g.computeBoundingBox();
    expect(g.boundingBox!.min.toArray().map((v) => +v.toFixed(6))).toEqual([-0.5, -0.5, -0.5]);
    expect(g.boundingBox!.max.toArray().map((v) => +v.toFixed(6))).toEqual([0.5, 0.5, 0.5]);
    expect(g.getAttribute('uv')).toBeDefined();
    // La cara delantera (z = 0,5) llega hasta ±30 % del grosor: ahí se dibujan las laminillas.
    const pos = g.getAttribute('position');
    let alto = 0;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getZ(i) > 0.4999) alto = Math.max(alto, Math.abs(pos.getY(i)));
    }
    expect(alto).toBeGreaterThan(0.3);
    g.dispose();
  });

  it('la osteona lleva el conducto de Havers oscuro en el hueco del aro', () => {
    const g = osteonaConCanal(0.06, 0.1, 0.032);
    const pos = g.getAttribute('position');
    const color = g.getAttribute('color');
    expect(color.count).toBe(pos.count);
    let oscuros = 0;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      if (color.getX(i) < 0.5) {
        oscuros++;
        expect(r).toBeLessThan(0.06);
      } else {
        expect(r).toBeGreaterThan(0.059);
      }
    }
    expect(oscuros).toBeGreaterThan(8);
    g.dispose();
  });
});

describe('materiales y paleta natural', () => {
  it('todas las mallas de los dos lados llevan UV (el relieve las necesita) y material físico', () => {
    for (const lado of [new LadoIntramembranoso(), new LadoEndocondral()]) {
      lado.grupo.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        expect((m.geometry as BufferGeometry).getAttribute('uv'), m.name).toBeDefined();
        expect(m.material, m.name).toBeInstanceOf(MeshPhysicalMaterial);
      });
      lado.liberar();
    }
  });

  it('el cartílago calcificado sigue gris (lo nombra el paso de crecimiento) y más oscuro que el sano', () => {
    const hsl = { h: 0, s: 0, l: 0 };
    new Color(NATURAL.cartilagoCalcificado).getHSL(hsl, SRGBColorSpace);
    expect(hsl.s).toBeLessThan(0.12);
    const sano = { h: 0, s: 0, l: 0 };
    new Color(NATURAL.cartilago).getHSL(sano, SRGBColorSpace);
    expect(hsl.l).toBeLessThan(sano.l - 0.15);
    // Hueso marfil, no rosa: tono amarillento.
    new Color(NATURAL.laminaClara).getHSL(hsl, SRGBColorSpace);
    expect(hsl.h * 360).toBeGreaterThan(30);
    expect(hsl.h * 360).toBeLessThan(55);
    // Mismas claves que la paleta de los dibujos (que no cambia).
    expect(Object.keys(NATURAL).sort()).toEqual(Object.keys(HEX).sort());
  });
});

describe('revisión de diseño (2026-10-17)', () => {
  it('las instancias ocultas tienen escala 0 y no matriz nula: la esfera envolvente es finita (render-13)', () => {
    const lados = [new LadoIntramembranoso(), new LadoEndocondral()];
    for (const t of [0, 0.5, 1]) {
      for (const lado of lados) {
        lado.actualizar(estadoDosRutas(t));
        lado.grupo.traverse((o) => {
          const im = o as InstancedMesh;
          if (!im.isInstancedMesh) return;
          im.boundingSphere = null;
          im.computeBoundingSphere();
          const c = im.boundingSphere!.center;
          expect(Number.isFinite(c.x + c.y + c.z), `t = ${t}, ${o.name}`).toBe(true);
        });
      }
    }
    for (const lado of lados) lado.liberar();
  });

  it('los osteoclastos del frente son grandes y aplanados; los osteoblastos, más altos que anchos (realismo-21)', () => {
    const derecha = new LadoEndocondral();
    derecha.actualizar(estadoDosRutas(HITOS_DOS_RUTAS.vascularizacion));
    const osteoclasto = instancia(buscar(derecha.grupo, 'osteoclastos'), 0).e;
    expect(osteoclasto.y).toBeLessThan(0.5 * Math.min(osteoclasto.x, osteoclasto.z));
    const osteoblasto = instancia(buscar(derecha.grupo, 'osteoblastos_centro'), 0).e;
    expect(osteoblasto.y).toBeGreaterThan(osteoblasto.x);
    // Apoyado en el frente: su cara de abajo toca el plano del frente.
    const frente = estadoDosRutas(HITOS_DOS_RUTAS.vascularizacion).endocondral.frente;
    const { p, e } = instancia(buscar(derecha.grupo, 'osteoclastos'), 0);
    expect(p.y - e.y).toBeCloseTo(frente, 6);
    derecha.liberar();
  });

  it('la cavidad medular del hueso en crecimiento tiene médula roja, la misma del lado intramembranoso (fidelidad-07)', () => {
    const izquierda = new LadoIntramembranoso();
    const derecha = new LadoEndocondral();
    const color = (grupo: Group, nombre: string): string =>
      ((buscar(grupo, nombre) as Mesh).material as MeshPhysicalMaterial).color.getHexString();
    expect(color(derecha.grupo, 'cavidad_medular')).toBe(color(izquierda.grupo, 'medula'));
    expect(`#${color(derecha.grupo, 'cavidad_medular')}`).toBe(NATURAL.medulaRoja);
    izquierda.liberar();
    derecha.liberar();
  });

  it('el molde de cartílago lleva velo de Fresnel más denso en el centro; las tablas no sombrean el diploe', () => {
    const izquierda = new LadoIntramembranoso();
    const derecha = new LadoEndocondral();
    const cartilago = (buscar(derecha.grupo, 'cartilago_superior') as Mesh)
      .material as MeshPhysicalMaterial;
    const velo = cartilago.userData.velo as {
      uVeloCentro: { value: number };
      uVeloBorde: { value: number };
    };
    expect(velo.uVeloCentro.value).toBeGreaterThan(velo.uVeloBorde.value);
    expect(cartilago.clearcoat).toBeLessThan(0.3);
    expect(buscar(izquierda.grupo, 'tabla_superior').userData.sinSombra).toBe(true);
    expect(buscar(izquierda.grupo, 'tabla_inferior').userData.sinSombra).toBe(true);
    izquierda.liberar();
    derecha.liberar();
  });

  it('paleta unificada: hueso entretejido rosado, laminar marfil y osteoide pálido', () => {
    const tono = (hex: string) => {
      const hsl = { h: 0, s: 0, l: 0 };
      new Color(hex).getHSL(hsl, SRGBColorSpace);
      return hsl;
    };
    // El entretejido, más rosado (tono más bajo) y más oscuro que el laminar.
    expect(tono(NATURAL.hueso).h).toBeLessThan(tono(NATURAL.laminaClara).h);
    expect(tono(NATURAL.hueso).l).toBeLessThan(tono(NATURAL.laminaClara).l);
    expect(tono(NATURAL.osteoide).l).toBeGreaterThan(tono(NATURAL.hueso).l);
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
  it('cabe en el presupuesto de triángulos y de llamadas (con la doble pasada) y de sombras en el peor instante', () => {
    const izquierda = new LadoIntramembranoso();
    const derecha = new LadoEndocondral();
    let peor = { triangulos: 0, llamadas: 0, llamadasSombra: 0 };
    for (let i = 0; i <= 200; i++) {
      const e = estadoDosRutas(i / 200);
      izquierda.actualizar(e);
      derecha.actualizar(e);
      const m = medir([izquierda.grupo, derecha.grupo]);
      peor = {
        triangulos: Math.max(peor.triangulos, m.triangulos),
        llamadas: Math.max(peor.llamadas, m.llamadas),
        llamadasSombra: Math.max(peor.llamadasSombra, m.llamadasSombra),
      };
    }
    expect(peor.triangulos).toBeGreaterThan(1000);
    expect(peor.triangulos).toBeLessThan(PRESUPUESTO.triangulos);
    expect(peor.llamadas).toBeLessThan(PRESUPUESTO.llamadas);
    expect(peor.llamadasSombra).toBeLessThan(PRESUPUESTO.llamadas);
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
