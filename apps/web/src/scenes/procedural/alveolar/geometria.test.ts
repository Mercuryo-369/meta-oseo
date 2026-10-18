/**
 * Pruebas de las formas de la escena del hueso alveolar sin WebGL (three crea las geometrías en memoria):
 * geometrías válidas, sin NaN en todo el recorrido del tiempo, presupuesto de polígonos y de llamadas de dibujo,
 * y liberación de recursos.
 */
import { describe, expect, it } from 'vitest';
import { DoubleSide, PerspectiveCamera, Vector3 } from 'three';
import type { BufferGeometry, Group, Material, Mesh, MeshStandardMaterial, Object3D } from 'three';
import {
  Y_CUELLO,
  perfilCuerpo,
  regionTrabecular,
  siluetaCorona,
  siluetaRaiz,
} from './disposicion';
import { FOV_GRADOS } from '../bmu/vistas';
import {
  ALTO_CORONA,
  LARGO_SEGMENTO,
  SEMIANCHO_RAIZ,
  Y_BASE,
  Y_CRESTA,
  Z_ALVEOLO,
  estadoAlveolar,
} from './estado';
import { bloque, mediaCorona, mediaRaizCervical, placa } from './geometria';
import { estadoDeVistaAlveolar } from './vistas';
import { Alveolo, ConductoMandibular, CuerpoSeccionado, MitadMovil } from './mallas';
import type { PiezaAlveolar } from './mallas';

const TIEMPOS = Array.from({ length: 41 }, (_, i) => i / 40);

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

function triangulosDe(g: BufferGeometry): number {
  return (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
}

/** Triángulos dibujados (una instancia cuenta tantas veces como instancias tiene). */
function triangulos(grupo: Group): number {
  let suma = 0;
  grupo.traverse((o) => {
    const malla = o as Mesh & { isInstancedMesh?: boolean; count?: number };
    if (!malla.geometry) return;
    suma += triangulosDe(malla.geometry) * (malla.isInstancedMesh ? (malla.count ?? 1) : 1);
  });
  return suma;
}

/** Objetos con geometría que se dibujan: cada uno es una llamada de dibujo. */
function llamadasDeDibujo(grupo: Group): number {
  let n = 0;
  grupo.traverse((o) => {
    if ((o as Mesh).geometry && o.visible) n++;
  });
  return n;
}

/** ¿El objeto y todos sus padres son visibles? */
function visibleDeVerdad(o: Object3D): boolean {
  for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

/**
 * Lo que se dibuja de verdad en un fotograma (rendimiento-09): en el pase principal, cada malla visible cuenta una
 * llamada por grupo de material, y DOS si su material es transparente, de doble cara y sin `forceSinglePass` (three
 * la parte en cara trasera y delantera); sus triángulos, por cada instancia y cada pasada. Las líneas cuentan una
 * llamada y ningún triángulo. Aparte, el pase de sombras: las mallas que proyectan (opacas u opacidad > 0,9 y sin
 * `userData.sinSombra`, la regla de `EntornoRealista`), una pasada cada una.
 */
function medirDibujo(grupos: readonly Object3D[]): {
  llamadas: number;
  triangulos: number;
  sombras: number;
  triangulosSombra: number;
} {
  const r = { llamadas: 0, triangulos: 0, sombras: 0, triangulosSombra: 0 };
  for (const raiz of grupos) {
    raiz.traverse((o) => {
      const malla = o as Mesh & { isInstancedMesh?: boolean; count?: number; isLine?: boolean };
      if (!malla.geometry || !visibleDeVerdad(o)) return;
      const lista = (
        Array.isArray(malla.material) ? malla.material : [malla.material]
      ) as Material[];
      if (malla.isLine) {
        if (lista[0]!.visible) r.llamadas++;
        return;
      }
      const instancias = malla.isInstancedMesh ? (malla.count ?? 1) : 1;
      const total = triangulosDe(malla.geometry);
      const partes =
        Array.isArray(malla.material) && malla.geometry.groups.length > 0
          ? malla.geometry.groups.map((g) => ({
              m: lista[g.materialIndex ?? 0]!,
              t: Math.min(g.count, 3 * total - g.start) / 3,
            }))
          : [{ m: lista[0]!, t: total }];
      const primero = lista[0]!;
      const proyecta = !malla.userData.sinSombra && (!primero.transparent || primero.opacity > 0.9);
      for (const { m, t } of partes) {
        if (!m.visible) continue;
        const pasadas = m.transparent && m.side === DoubleSide && !m.forceSinglePass ? 2 : 1;
        r.llamadas += pasadas;
        r.triangulos += pasadas * t * instancias;
        if (proyecta) {
          r.sombras++;
          r.triangulosSombra += t * instancias;
        }
      }
    });
  }
  return r;
}

describe('placa y bloque', () => {
  it('la placa queda en el plano de corte a la profundidad pedida y sin NaN', () => {
    const g = placa(perfilCuerpo(), [regionTrabecular()], 0.3);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.x).toBeCloseTo(0.3, 6);
    expect(g.boundingBox!.max.x).toBeCloseTo(0.3, 6);
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    expect(triangulosDe(g)).toBeGreaterThan(50);
  });

  it('un [z, y] del polígono va a (x, y, z) del mundo', () => {
    const g = placa(siluetaRaiz(0), [], 0);
    g.computeBoundingBox();
    const caja = g.boundingBox!;
    expect((caja.max.z + caja.min.z) / 2).toBeCloseTo(Z_ALVEOLO, 6);
    expect(caja.max.y).toBeGreaterThan(caja.min.y);
  });

  it('el bloque se extiende hacia −X con el largo pedido y con tapas', () => {
    const g = bloque(perfilCuerpo(), [regionTrabecular()], LARGO_SEGMENTO / 2);
    g.computeBoundingBox();
    expect(g.boundingBox!.max.x).toBeCloseTo(0, 6);
    expect(g.boundingBox!.min.x).toBeCloseTo(-LARGO_SEGMENTO / 2, 6);
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    const sinTapas = placa(perfilCuerpo(), [regionTrabecular()], 0);
    expect(triangulosDe(g)).toBeGreaterThan(2 * triangulosDe(sinTapas));
  });

  it('cada media corona ocupa su lado del plano de corte', () => {
    const izquierda = mediaCorona(-1);
    const derecha = mediaCorona(1);
    izquierda.computeBoundingBox();
    derecha.computeBoundingBox();
    expect(izquierda.boundingBox!.max.x).toBeLessThanOrEqual(1e-6);
    expect(derecha.boundingBox!.min.x).toBeGreaterThanOrEqual(-1e-6);
    expect((izquierda.boundingBox!.max.z + izquierda.boundingBox!.min.z) / 2).toBeCloseTo(
      Z_ALVEOLO,
      4,
    );
  });

  it('el borde de la media corona en el plano de corte es la silueta de la corona, con sus dos cúspides', () => {
    const g = mediaCorona(-1);
    const pos = g.getAttribute('position');
    const silueta = siluetaCorona();
    let enElCorte = 0;
    let vestibular = -Infinity;
    let lingual = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const [x, y, z] = [pos.getX(i), pos.getY(i), pos.getZ(i)];
      if (z > Z_ALVEOLO + 0.15) vestibular = Math.max(vestibular, y);
      if (z < Z_ALVEOLO - 0.15) lingual = Math.max(lingual, y);
      if (Math.abs(x) > 1e-6) continue;
      enElCorte++;
      const cerca = silueta.some(([sz, sy]) => Math.hypot(sz - z, sy - y) < 1e-5);
      expect(cerca, `${[z, y]}`).toBe(true);
    }
    expect(enElCorte).toBeGreaterThan(20);
    // Lejos del eje, la corona es más alta por vestibular (la cúspide lingual es baja).
    expect(vestibular).toBeGreaterThan(lingual + 0.1);
    const normales = g.getAttribute('normal');
    for (let i = 0; i < normales.count; i++) {
      const n = new Vector3(normales.getX(i), normales.getY(i), normales.getZ(i));
      // Los vértices de la punta que ningún triángulo usa pueden quedar con normal nula; los demás, unitarios.
      expect(Number.isFinite(n.length())).toBe(true);
    }
  });

  it('el bloque lleva UV en unidades de la escena y paredes sin facetas', () => {
    const g = bloque(perfilCuerpo(), [], 3);
    const pos = g.getAttribute('position');
    const normal = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    expect(uv.count).toBe(pos.count);
    // Las normales de la pared que llegan a un mismo punto coinciden (sombreado continuo); en las tapas, la UV
    // es la posición [z, y] del plano de corte.
    const porPunto = new Map<string, Vector3[]>();
    for (let i = 0; i < pos.count; i++) {
      const n = new Vector3(normal.getX(i), normal.getY(i), normal.getZ(i));
      expect(n.length()).toBeCloseTo(1, 5);
      if (Math.abs(n.x) > 0.9) {
        expect(uv.getX(i)).toBeCloseTo(pos.getZ(i), 5);
        expect(uv.getY(i)).toBeCloseTo(pos.getY(i), 5);
        continue;
      }
      const clave = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
      porPunto.set(clave, [...(porPunto.get(clave) ?? []), n]);
    }
    let peor = 0;
    for (const lista of porPunto.values()) {
      for (const n of lista) peor = Math.max(peor, n.angleTo(lista[0]!));
    }
    expect(porPunto.size).toBeGreaterThan(100);
    expect((peor * 180) / Math.PI).toBeLessThan(1);
    // La UV de la pared avanza con la profundidad (una unidad de UV por unidad de escena).
    let maxV = 0;
    for (let i = 0; i < uv.count; i++) maxV = Math.max(maxV, uv.getY(i));
    expect(maxV).toBeCloseTo(3, 5);
  });

  // render-02: la cara delantera de la placa miraba a −X (la cámara la ve desde +X) y la cara de corte quedaba en
  // sombra. Ahora mira a +X por el orden de los vértices y por la normal, como la tapa x = 0 del bloque.
  it('la placa mira a +X, hacia la cámara, por el orden de sus triángulos y por su normal', () => {
    const g = placa(siluetaRaiz(0), [], 0.05);
    const pos = g.getAttribute('position');
    const normal = g.getAttribute('normal');
    const indice = g.getIndex()!;
    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    for (let i = 0; i < indice.count; i += 3) {
      a.fromBufferAttribute(pos, indice.getX(i));
      b.fromBufferAttribute(pos, indice.getX(i + 1));
      c.fromBufferAttribute(pos, indice.getX(i + 2));
      const cara = b.clone().sub(a).cross(c.clone().sub(a));
      // Triángulos sin área (puntos alineados del contorno) aparte, todos con la cara hacia +X.
      if (cara.length() > 1e-9) expect(cara.x, `triángulo ${i / 3}`).toBeGreaterThan(0);
    }
    for (let i = 0; i < normal.count; i++) expect(normal.getX(i)).toBe(1);
  });

  it('los discos de las perforaciones y el borde del conducto también miran a +X', () => {
    const alveolo = new Alveolo();
    const conducto = new ConductoMandibular();
    for (const malla of [
      alveolo.grupo.getObjectByName('perforaciones') as Mesh,
      conducto.grupo.getObjectByName('borde_conducto') as Mesh,
    ]) {
      const normal = malla.geometry.getAttribute('normal');
      for (let i = 0; i < normal.count; i++) expect(normal.getX(i), malla.name).toBeCloseTo(1, 6);
    }
    alveolo.liberar();
    conducto.liberar();
  });

  // realismo-10: el esmalte era un blanco uniforme con brillo de espejo (porcelana).
  it('la corona lleva el degradado del esmalte: amarillento en el cuello, gris azulado en la cúspide', () => {
    const g = mediaCorona(-1);
    const pos = g.getAttribute('position');
    const color = g.getAttribute('color');
    expect(color.count).toBe(pos.count);
    let cuello = -1;
    let cuspide = -1;
    for (let i = 0; i < pos.count; i++) {
      if (cuello < 0 || pos.getY(i) < pos.getY(cuello)) cuello = i;
      if (cuspide < 0 || pos.getY(i) > pos.getY(cuspide)) cuspide = i;
    }
    // Cuello: más rojo que azul (amarillento). Cúspide: más azul que rojo.
    expect(color.getX(cuello)).toBeGreaterThan(color.getZ(cuello) + 0.1);
    expect(color.getZ(cuspide)).toBeGreaterThan(color.getX(cuspide));
    const alveolo = new Alveolo();
    const corona = alveolo.grupo.getObjectByName('corona') as Mesh;
    expect((corona.material as MeshStandardMaterial).vertexColors).toBe(true);
    expect(corona.geometry.getAttribute('color')).toBeDefined();
    alveolo.liberar();
  });

  // fidelidad-02: con la cresta 0,2 por debajo del cuello, sin la raíz cervical la corona flotaría sobre el hueso.
  it('la raíz cervical en relieve va de la cresta (hundida en el hueso) al cuello, del ancho de la raíz', () => {
    for (const lado of [-1, 1] as const) {
      const g = mediaRaizCervical(lado);
      g.computeBoundingBox();
      const caja = g.boundingBox!;
      expect(caja.min.y).toBeLessThan(Y_CRESTA);
      expect(caja.max.y).toBeCloseTo(Y_CUELLO, 6);
      expect(lado * (caja.min.x + caja.max.x)).toBeGreaterThan(0);
      expect(caja.max.z - caja.min.z).toBeCloseTo(2 * SEMIANCHO_RAIZ, 4);
      expect(g.getAttribute('uv')).toBeDefined();
      g.dispose();
    }
    const alveolo = new Alveolo();
    const cemento = alveolo.grupo.getObjectByName('cemento') as Mesh;
    cemento.geometry.computeBoundingBox();
    expect(cemento.geometry.boundingBox!.max.y).toBeCloseTo(Y_CUELLO, 6);
    // El cemento es tejido `dentina` (grumos lisos), no `hueso` (poros vasculares): es avascular (fidelidad-13).
    expect((cemento.material as MeshStandardMaterial).bumpMap?.name).toBe('relieve_grumos');
    alveolo.liberar();
    const mitad = new MitadMovil();
    expect(mitad.grupo.getObjectByName('raiz_mitad_anterior')).toBeDefined();
    mitad.liberar();
  });

  it('las capas interiores del corte no proyectan sombra; la lámina, las tablas y la corona sí', () => {
    const alveolo = new Alveolo();
    const cuerpo = new CuerpoSeccionado();
    for (const nombre of ['ligamento_periodontal', 'corte_raiz', 'pulpa', 'perforaciones']) {
      expect(alveolo.grupo.getObjectByName(nombre)!.userData.sinSombra, nombre).toBe(true);
    }
    for (const nombre of ['hueso_alveolar_propio', 'corona', 'cemento']) {
      expect(alveolo.grupo.getObjectByName(nombre)!.userData.sinSombra, nombre).toBeUndefined();
    }
    expect(cuerpo.grupo.getObjectByName('corte_tablas')!.userData.sinSombra).toBeUndefined();
    alveolo.liberar();
    cuerpo.liberar();
  });
});

// La mitad anterior pasa de 2 a 3 llamadas: la raíz cervical en relieve (fidelidad-02), con su propio material de
// cemento (el esmalte es satinado y el cemento, mate).
describe.each<[string, () => PiezaAlveolar, number, number]>([
  ['MitadMovil', () => new MitadMovil(), 2_500, 3],
  ['CuerpoSeccionado', () => new CuerpoSeccionado(), 9_000, 5],
  ['Alveolo', () => new Alveolo(), 3_000, 8],
  ['ConductoMandibular', () => new ConductoMandibular(), 1_500, 5],
])('%s', (_, crear, presupuesto, llamadas) => {
  it('cabe en el presupuesto de polígonos y de llamadas de dibujo', () => {
    const pieza = crear();
    pieza.actualizar(estadoAlveolar(1));
    expect(triangulos(pieza.grupo)).toBeGreaterThan(50);
    expect(triangulos(pieza.grupo)).toBeLessThan(presupuesto);
    expect(llamadasDeDibujo(pieza.grupo)).toBeLessThanOrEqual(llamadas);
    pieza.liberar();
  });

  it('no produce NaN en ningún instante ni deja posiciones o escalas inválidas', () => {
    const pieza = crear();
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoAlveolar(t));
      for (const v of [pieza.grupo.position.x, pieza.grupo.position.y, pieza.grupo.scale.x]) {
        expect(Number.isFinite(v), `t = ${t}`).toBe(true);
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
      const lista: unknown[] = [pieza.grupo.visible, pieza.grupo.position.x];
      pieza.grupo.traverse((o) => {
        const m = (o as Mesh).material as
          { opacity?: number; emissiveIntensity?: number } | undefined;
        if (m) lista.push(o.visible, m.opacity, m.emissiveIntensity);
      });
      return lista;
    };
    pieza.actualizar(estadoAlveolar(0.61));
    const antes = foto();
    pieza.actualizar(estadoAlveolar(0.05));
    pieza.actualizar(estadoAlveolar(0.97));
    pieza.actualizar(estadoAlveolar(0.61));
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

  it('las superficies con relieve tienen UV (sin ellas el relieve no se vería)', () => {
    const pieza = crear();
    let conRelieve = 0;
    pieza.grupo.traverse((o) => {
      const malla = o as Mesh;
      if (!malla.geometry) return;
      const materiales = (
        Array.isArray(malla.material) ? malla.material : [malla.material]
      ) as MeshStandardMaterial[];
      if (!materiales.some((m) => m.bumpMap)) return;
      conRelieve++;
      expect(malla.geometry.getAttribute('uv'), malla.name).toBeDefined();
    });
    expect(conRelieve).toBeGreaterThan(0);
    pieza.liberar();
  });
});

describe('desvanecer de verdad', () => {
  it('la mitad que se aparta pasa a transparente y su material se recompila (si no, el alfa quedaría en 1)', () => {
    const mitad = new MitadMovil();
    mitad.actualizar(estadoAlveolar(0));
    const materiales: Material[] = [];
    mitad.grupo.traverse((o) => {
      const m = (o as Mesh).material as Material | undefined;
      if (m && !materiales.includes(m)) materiales.push(m);
    });
    expect(materiales.length).toBeGreaterThan(0);
    const versiones = materiales.map((m) => m.version);
    for (const m of materiales) expect(m.transparent).toBe(false);
    mitad.actualizar(estadoAlveolar(0.13));
    materiales.forEach((m, i) => {
      expect(m.transparent).toBe(true);
      expect(m.opacity).toBeLessThan(0.9);
      expect(m.version).toBeGreaterThan(versiones[i]!);
    });
    mitad.liberar();
  });
});

describe('la escena completa', () => {
  // rendimiento-09: cuenta lo que se dibuja de verdad (instancias, la doble pasada de los transparentes de doble cara
  // y, aparte, el pase de sombras), en 401 instantes. Cifras que cita docs/escena-3d-alveolar.md.
  it('cabe en el presupuesto total con la doble pasada: menos de 40 000 triángulos, 40 llamadas y 40 de sombra', () => {
    const piezas = [
      new MitadMovil(),
      new CuerpoSeccionado(),
      new Alveolo(),
      new ConductoMandibular(),
    ];
    const peor = { llamadas: 0, triangulos: 0, sombras: 0, triangulosSombra: 0 };
    for (let k = 0; k <= 400; k++) {
      for (const p of piezas) p.actualizar(estadoAlveolar(k / 400));
      const r = medirDibujo(piezas.map((p) => p.grupo));
      for (const clave of Object.keys(peor) as (keyof typeof peor)[]) {
        peor[clave] = Math.max(peor[clave], r[clave]);
      }
    }
    console.info(`[alveolar] peor instante: ${JSON.stringify(peor)}`);
    expect(peor.triangulos).toBeLessThan(40_000);
    expect(peor.llamadas).toBeLessThan(40);
    expect(peor.sombras).toBeLessThan(40);
    for (const p of piezas) p.liberar();
  });

  // Sin navegador: la cúspide (que subió 0,24 con fidelidad-02) y el borde basal caben en las vistas que muestran el
  // diente entero, en un lienzo ancho (1,5) y en uno de teléfono (1,1).
  it('las vistas general y corte encuadran de la cúspide al borde basal', () => {
    const cuspide = new Vector3(0, Y_CUELLO + ALTO_CORONA, Z_ALVEOLO);
    const base = new Vector3(0, Y_BASE, 0);
    for (const aspecto of [1.5, 1.1]) {
      for (const vista of ['general', 'corte']) {
        const e = estadoDeVistaAlveolar(vista, aspecto);
        const camara = new PerspectiveCamera(FOV_GRADOS, aspecto, 0.1, 80);
        camara.position.set(...e.posicion);
        camara.lookAt(new Vector3(...e.objetivo));
        camara.updateMatrixWorld();
        for (const p of [cuspide, base]) {
          const y = p.clone().project(camara).y;
          expect(Math.abs(y), `${vista}, aspecto ${aspecto}, y = ${p.y}`).toBeLessThan(0.99);
        }
      }
    }
  });

  it('al principio el bloque está entero; desde el corte la mitad anterior ya no se dibuja', () => {
    const mitad = new MitadMovil();
    const cuerpo = new CuerpoSeccionado();
    mitad.actualizar(estadoAlveolar(0));
    cuerpo.actualizar(estadoAlveolar(0));
    expect(mitad.grupo.visible).toBe(true);
    expect(mitad.grupo.position.x).toBe(0);
    expect(cuerpo.grupo.visible).toBe(true);
    mitad.actualizar(estadoAlveolar(0.12));
    expect(mitad.grupo.position.x).toBeGreaterThan(0.5);
    for (const t of [0.18, 0.5, 1]) {
      mitad.actualizar(estadoAlveolar(t));
      expect(mitad.grupo.visible, `t = ${t}`).toBe(false);
    }
    mitad.liberar();
    cuerpo.liberar();
  });

  it('las perforaciones y las fibras aparecen con su fase', () => {
    const alveolo = new Alveolo();
    const perforaciones = alveolo.grupo.getObjectByName('perforaciones')!;
    const fibras = alveolo.grupo.getObjectByName('fibras_ligamento') as Mesh;
    alveolo.actualizar(estadoAlveolar(0.5));
    expect(perforaciones.visible).toBe(false);
    expect((fibras.material as { opacity: number }).opacity).toBe(0);
    alveolo.actualizar(estadoAlveolar(0.66));
    expect(perforaciones.visible).toBe(true);
    alveolo.actualizar(estadoAlveolar(0.82));
    expect((fibras.material as { opacity: number }).opacity).toBe(1);
    alveolo.liberar();
  });
});
