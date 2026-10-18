/**
 * Pruebas de las formas de la escena de la vesícula sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo, presupuesto de lo que se dibuja de verdad (con la doble pasada
 * de los transparentes de doble cara y el pase de sombras), materiales y liberación de recursos.
 */
import { describe, expect, it } from 'vitest';
import { DoubleSide } from 'three';
import type {
  BufferGeometry,
  Group,
  InstancedMesh,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
} from 'three';
import { HITOS_VESICULA, estadoVesicula } from './estado';
import { segmentosDeBandeo } from './disposicion';
import {
  cuello,
  esfera,
  globulo,
  hemisferio,
  laminaOndulada,
  losaOndulada,
  mancuerna,
  placaDesdeOrigen,
  tramoFibrilla,
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

interface Dibujo {
  llamadas: number;
  triangulos: number;
  llamadasSombra: number;
  triangulosSombra: number;
}

/**
 * Lo que se dibuja de verdad (revisión de diseño, 2026-10-17): una llamada por malla a la vista, dos si su
 * material es transparente y de doble cara sin `forceSinglePass` (three lo parte en dos pasadas, cara de atrás y
 * cara de delante); sus triángulos por todas sus instancias y por sus pasadas. Aparte, el pase de sombras: las
 * mallas que las proyectan según la regla de `EntornoRealista` (opacas o con opacidad > 0,9 y sin
 * `userData.sinSombra`).
 */
function medirDibujo(grupos: readonly Group[]): Dibujo {
  const d: Dibujo = { llamadas: 0, triangulos: 0, llamadasSombra: 0, triangulosSombra: 0 };
  for (const grupo of grupos) {
    for (const malla of mallasDe(grupo)) {
      if (!aLaVista(malla)) continue;
      const m = malla.material as Material;
      const pasadas = m.transparent && m.side === DoubleSide && !m.forceSinglePass ? 2 : 1;
      const g = malla.geometry as BufferGeometry;
      const porInstancia = (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
      const instancias = (malla as InstancedMesh).isInstancedMesh
        ? (malla as InstancedMesh).count
        : 1;
      d.llamadas += pasadas;
      d.triangulos += porInstancia * instancias * pasadas;
      if (!malla.userData.sinSombra && (!m.transparent || m.opacity > 0.9)) {
        d.llamadasSombra++;
        d.triangulosSombra += porInstancia * instancias;
      }
    }
  }
  return d;
}

/** Todos los instantes de la prueba, con la vista `interior` (corte forzado) y sin ella. */
const ESTADOS = [0, 1].flatMap((corte) =>
  Array.from({ length: 201 }, (_, i) => {
    const e = estadoVesicula(i / 200);
    return corte ? { ...e, vesicula: { ...e.vesicula, corte: 1 } } : e;
  }),
);

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

  it('el glóbulo ocupa lo mismo que una caja de lado 1 y el tramo de fibrilla solo tapa su extremo -X', () => {
    const g = globulo();
    g.computeBoundingBox();
    expect(g.boundingBox!.min.toArray().map((v) => +v.toFixed(6))).toEqual([-0.5, -0.5, -0.5]);
    expect(g.boundingBox!.max.toArray().map((v) => +v.toFixed(6))).toEqual([0.5, 0.5, 0.5]);
    const abierto = tramoFibrilla(0.3, 12);
    const tapado = tramoFibrilla(0.3, 12, true);
    for (const t of [abierto, tapado]) {
      t.computeBoundingBox();
      expect(t.boundingBox!.min.x).toBeCloseTo(-0.5, 6);
      expect(t.boundingBox!.max.x).toBeCloseTo(0.5, 6);
      expect(t.boundingBox!.max.y).toBeCloseTo(0.3, 6);
      expect(t.getAttribute('uv').count).toBe(t.getAttribute('position').count);
    }
    // Abierto: 2 triángulos por lado; con tapa, uno más por lado, y la tapa mira a -X en x = -0,5.
    expect(abierto.getIndex()!.count / 3).toBe(24);
    expect(tapado.getIndex()!.count / 3).toBe(36);
    const pos = tapado.getAttribute('position');
    const nor = tapado.getAttribute('normal');
    let enTapa = 0;
    for (let i = 0; i < pos.count; i++) {
      if (nor.getX(i) < -0.99) {
        enTapa++;
        expect(pos.getX(i)).toBeCloseTo(-0.5, 6);
      }
    }
    expect(enTapa).toBeGreaterThan(12);
    // Las puntas de cada fibrilla son tramos de hueco (los que llevan tapa): lo da por hecho `Osteoide`.
    const bandeo = segmentosDeBandeo();
    expect(bandeo[0]!.hueco).toBe(true);
    expect(bandeo[bandeo.length - 1]!.hueco).toBe(true);
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
  // 9 000 (antes 8 000): desde el realismo (2026-10-14) las 41 enzimas son glóbulos de 80 triángulos (antes
  // cajas de 12); la escena entera sigue muy por debajo de su tope de 40 000. Desde la revisión de diseño
  // (2026-10-17) se cuenta la doble pasada; las moléculas pequeñas que se desvanecen ya no la tienen. La vesícula
  // pasa de 9 000 a 11 000 solo por esa cuenta: mientras se corta, la esfera entera y la media esfera (952
  // triángulos cada una) se dibujan a la vez y en dos pasadas cada una (10 462; con el criterio de antes, 8 558).
  ['Osteoblasto', () => new Osteoblasto(), 9_000],
  ['Osteoide', () => new Osteoide(), 22_000],
  ['VesiculaMatriz', () => new VesiculaMatriz(), 11_000],
])('%s', (_, crear, presupuesto) => {
  it('cabe en el presupuesto de triángulos en todos los instantes (con la doble pasada)', () => {
    const pieza = crear();
    let maximo = 0;
    for (const e of ESTADOS) {
      pieza.actualizar(e);
      maximo = Math.max(maximo, medirDibujo([pieza.grupo]).triangulos);
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

  it('en el peor instante dibuja menos de 40 000 triángulos y menos de 40 llamadas, también en las sombras', () => {
    const piezas = crearTodas();
    const peor: Dibujo = { llamadas: 0, triangulos: 0, llamadasSombra: 0, triangulosSombra: 0 };
    for (const e of ESTADOS) {
      for (const p of piezas) p.actualizar(e);
      const m = medirDibujo(piezas.map((p) => p.grupo));
      for (const k of Object.keys(peor) as (keyof Dibujo)[]) peor[k] = Math.max(peor[k], m[k]);
    }
    expect(peor.triangulos).toBeLessThan(40_000);
    expect(peor.llamadas).toBeLessThan(40);
    expect(peor.triangulosSombra).toBeLessThan(40_000);
    expect(peor.llamadasSombra).toBeLessThan(40);
    for (const p of piezas) p.liberar();
  });

  it('solo las membranas se dibujan en dos pasadas, y las de las vesículas son un velo sin luz propia', () => {
    const piezas = crearTodas();
    const dobles = new Set<string>();
    for (const e of ESTADOS) {
      for (const p of piezas) p.actualizar(e);
      for (const p of piezas) {
        for (const malla of mallasDe(p.grupo)) {
          const m = malla.material as Material;
          if (aLaVista(malla) && m.transparent && m.side === DoubleSide && !m.forceSinglePass) {
            dobles.add(malla.name);
          }
        }
      }
    }
    const membranas = ['membrana_vesicula', 'membrana_vesicula_cortada', 'vesiculas_vecinas'];
    // El cuello de gemación es un tubo abierto de membrana (28 triángulos): de doble cara mientras aparece.
    expect([...dobles].sort()).toEqual([...membranas, 'cuello_gemacion'].sort());
    for (const nombre of membranas) {
      const malla = piezas.map((p) => p.grupo.getObjectByName(nombre)).find(Boolean) as Mesh;
      const m = malla.material as MeshPhysicalMaterial;
      // Velo de Fresnel: más transparente de frente que de canto.
      const velo = m.userData.velo as {
        uVeloCentro: { value: number };
        uVeloBorde: { value: number };
      };
      expect(velo.uVeloCentro.value, nombre).toBeLessThan(velo.uVeloBorde.value);
      expect(m.emissiveIntensity === 0 || m.emissive.getHex() === 0, nombre).toBe(true);
      // Satinada, no de cristal.
      expect(m.roughness, nombre).toBeGreaterThanOrEqual(0.3);
    }
    for (const p of piezas) p.liberar();
  });

  it('los cristales no emiten luz y las estrías de las fibrillas corren a lo largo del eje', () => {
    const osteoide = new Osteoide();
    const vesicula = new VesiculaMatriz();
    for (const nombre of ['cristales_fibrillas', 'racimo_cristales']) {
      const malla = [osteoide, vesicula]
        .map((p) => p.grupo.getObjectByName(nombre))
        .find(Boolean) as Mesh;
      const m = malla.material as MeshPhysicalMaterial;
      expect(m.emissiveIntensity === 0 || m.emissive.getHex() === 0, nombre).toBe(true);
    }
    // El patrón `fibras` tiene 32 celdas en U y 3 en V. En el cilindro, U da la vuelta (2πr) y V recorre el
    // tramo (largo × 1,02): el tamaño de una veta a lo largo del eje debe superar al de una veta alrededor.
    const radio = 0.3;
    const bandeo = segmentosDeBandeo();
    for (const [nombre, hueco] of [
      ['fibrillas_zona_hueco', true],
      ['fibrillas_zona_solapamiento', false],
    ] as const) {
      const malla = osteoide.grupo.getObjectByName(nombre) as Mesh;
      const repeticion = (malla.material as MeshPhysicalMaterial).bumpMap!.repeat;
      // U entera: sin costura a lo largo del tramo.
      expect(Number.isInteger(repeticion.x), nombre).toBe(true);
      const largo = bandeo.find((s) => s.hueco === hueco)!.largo * 1.02;
      const vetaAlrededor = (2 * Math.PI * radio) / (32 * repeticion.x);
      const vetaALoLargo = largo / (3 * repeticion.y);
      expect(vetaALoLargo / vetaAlrededor, nombre).toBeGreaterThan(4);
    }
    osteoide.liberar();
    vesicula.liberar();
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
