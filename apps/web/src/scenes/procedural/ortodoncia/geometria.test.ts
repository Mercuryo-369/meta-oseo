/**
 * Pruebas de las formas de la escena del movimiento ortodóntico sin WebGL (three crea las geometrías en
 * memoria): geometrías válidas, sin NaN en todo el recorrido del tiempo, presupuesto de polígonos y de llamadas
 * de dibujo, determinismo, liberación de recursos y visibilidad por fase.
 */
import { describe, expect, it } from 'vitest';
import { Box3, DoubleSide, PerspectiveCamera, Vector3 } from 'three';
import type { BufferGeometry, Group, Material, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { FOV_GRADOS } from '../bmu/vistas';
import { Y_CUELLO, perfilBloque, perfilCorona, regionTrabecular, siluetaRaiz } from './disposicion';
import {
  ALTO_CORONA,
  DESPLAZAMIENTO_MAXIMO,
  PROFUNDIDAD_BLOQUE,
  SEMIANCHO_BLOQUE,
  X_DIENTE_INICIAL,
  Y_BASE,
  Y_CRESTA,
  estadoOrtodoncia,
} from './estado';
import {
  Abanico,
  Banda,
  CENTRO_DENTINA,
  Polilineas,
  bloque,
  bracket,
  mediaCorona,
  perfilCoronaSuave,
  perfilDentinaCoronal,
  placa,
  siluetaDentina,
} from './geometria';
import { Alveolo, BloqueAlveolar, Celulas, Diente, Fuerza } from './mallas';
import type { PiezaOrtodoncia } from './mallas';
import { estadoDeVistaOrtodoncia } from './vistas';

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
    if (!malla.geometry || !o.visible) return;
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
 * Lo que se dibuja de verdad en un fotograma (rendimiento-09): en el pase principal, cada malla visible (con su
 * material visible) cuenta una llamada, y DOS si su material es transparente, de doble cara y sin
 * `forceSinglePass` (three la parte en cara trasera y delantera); sus triángulos, por cada instancia y cada pasada.
 * Las líneas cuentan una llamada y ningún triángulo. Aparte, el pase de sombras: las mallas que proyectan (opacas u
 * opacidad > 0,9 y sin `userData.sinSombra`, la regla de `EntornoRealista`), una pasada cada una.
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
      const m = malla.material as Material;
      if (!m.visible) return;
      if (malla.isLine) {
        r.llamadas++;
        return;
      }
      const t = triangulosDe(malla.geometry) * (malla.isInstancedMesh ? (malla.count ?? 1) : 1);
      const pasadas = m.transparent && m.side === DoubleSide && !m.forceSinglePass ? 2 : 1;
      r.llamadas += pasadas;
      r.triangulos += pasadas * t;
      if (!malla.userData.sinSombra && (!m.transparent || m.opacity > 0.9)) {
        r.sombras++;
        r.triangulosSombra += t;
      }
    });
  }
  return r;
}

describe('placa, bloque y media corona', () => {
  it('la placa queda en el plano de corte a la profundidad pedida y sin NaN', () => {
    const g = placa(perfilBloque(), [regionTrabecular()], 0.3);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.z).toBeCloseTo(0.3, 6);
    expect(g.boundingBox!.max.z).toBeCloseTo(0.3, 6);
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    expect(triangulosDe(g)).toBeGreaterThan(50);
  });

  it('el bloque se extiende hacia −Z con la profundidad pedida y con tapas', () => {
    const g = bloque(perfilBloque(), [regionTrabecular()], PROFUNDIDAD_BLOQUE);
    g.computeBoundingBox();
    expect(g.boundingBox!.max.z).toBeCloseTo(0, 6);
    expect(g.boundingBox!.min.z).toBeCloseTo(-PROFUNDIDAD_BLOQUE, 6);
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    const sinTapas = placa(perfilBloque(), [regionTrabecular()], 0);
    expect(triangulosDe(g)).toBeGreaterThan(2 * triangulosDe(sinTapas));
  });

  it('la media corona ocupa el lado trasero (z ≤ 0) con el eje en x = 0', () => {
    const g = mediaCorona();
    g.computeBoundingBox();
    expect(g.boundingBox!.max.z).toBeLessThanOrEqual(1e-6);
    expect(g.boundingBox!.min.z).toBeLessThan(-0.4);
    expect((g.boundingBox!.max.x + g.boundingBox!.min.x) / 2).toBeCloseTo(0, 4);
  });

  it('con bisel, el bloque conserva la cara de corte exacta en z = 0 y el fondo en −profundidad', () => {
    const liso = bloque(perfilBloque(), [regionTrabecular()], PROFUNDIDAD_BLOQUE);
    const g = bloque(perfilBloque(), [regionTrabecular()], PROFUNDIDAD_BLOQUE, 0.04);
    g.computeBoundingBox();
    expect(g.boundingBox!.max.z).toBeCloseTo(0, 6);
    expect(g.boundingBox!.min.z).toBeCloseTo(-PROFUNDIDAD_BLOQUE, 6);
    expect(sinNaN(g.getAttribute('normal').array)).toBe(true);
    expect(g.getAttribute('uv')).toBeDefined();
    // Los vértices de la cara de corte siguen el contorno sin bisel (ahí se apoyan las capas planas).
    const pos = g.getAttribute('position');
    let xMax = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getZ(i)) < 1e-6) xMax = Math.max(xMax, pos.getX(i));
    }
    expect(xMax).toBeCloseTo(SEMIANCHO_BLOQUE, 6);
    // Detrás del bisel el sólido crece: el redondeo.
    expect(g.boundingBox!.max.x).toBeCloseTo(SEMIANCHO_BLOQUE + 0.04, 6);
    expect(triangulosDe(g)).toBeGreaterThan(triangulosDe(liso));
  });

  it('el perfil suavizado de la corona pasa por los puntos del original y solo la cúspide toca el eje', () => {
    const original = perfilCorona();
    const suave = perfilCoronaSuave();
    expect(suave).toHaveLength(2 * (original.length - 1) + 1);
    original.forEach(([r, y], i) => {
      expect(suave[2 * i]![0]).toBeCloseTo(r, 6);
      expect(suave[2 * i]![1]).toBeCloseTo(y, 6);
    });
    expect(suave.filter(([r]) => r === 0)).toHaveLength(1);
    expect(suave[suave.length - 1]![0]).toBe(0);
  });

  it('la dentina coronal queda dentro de la corona: el esmalte, nulo en el cuello y grueso en la cúspide', () => {
    const corona = perfilCoronaSuave();
    const dentina = perfilDentinaCoronal();
    const radioCorona = (y: number): number => {
      for (let i = 0; i < corona.length - 1; i++) {
        const [r0, y0] = corona[i]!;
        const [r1, y1] = corona[i + 1]!;
        if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
      }
      return 0;
    };
    // En el cuello coinciden (unión amelocementaria); por encima, la dentina va por dentro.
    expect(dentina[0]).toEqual(corona[0]);
    for (const [r, y] of dentina.slice(1)) expect(r).toBeLessThanOrEqual(radioCorona(y) + 1e-9);
    const alto = corona[corona.length - 1]![1] - corona[0]![1];
    const cuspide = corona[corona.length - 1]![1] - dentina[dentina.length - 1]![1];
    expect(cuspide).toBeCloseTo(0.2 * alto, 6);
  });

  it('la silueta de toda la dentina se rellena en abanico desde su centro sin solapes', () => {
    const silueta = siluetaDentina();
    const centro = CENTRO_DENTINA;
    // Raíz entera y, encima de la cresta, la dentina coronal (sin escalón en el cuello).
    expect(silueta.length).toBeGreaterThan(siluetaRaiz().length);
    expect(Math.max(...silueta.map(([, y]) => y))).toBeGreaterThan(Y_CRESTA + 0.8);
    // Cada lado gira en sentido antihorario alrededor del centro: el abanico no se pliega.
    for (let i = 0; i < silueta.length; i++) {
      const a = silueta[i]!;
      const b = silueta[(i + 1) % silueta.length]!;
      const cruz =
        (a[0] - centro[0]) * (b[1] - centro[1]) - (a[1] - centro[1]) * (b[0] - centro[0]);
      expect(cruz, `lado ${i}`).toBeGreaterThan(0);
    }
  });

  it('el bracket es una sola geometría válida y pequeña', () => {
    const g = bracket();
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    expect(sinNaN(g.getAttribute('normal').array)).toBe(true);
    expect(g.getAttribute('uv')).toBeDefined();
    expect(triangulosDe(g)).toBeLessThan(200);
    g.dispose();
  });
});

describe('bandas, abanicos y polilíneas', () => {
  it('la banda tiene 2·(n − 1) triángulos y sus vértices siguen a los contornos', () => {
    const banda = new Banda(4);
    expect(triangulosDe(banda.geometria)).toBe(6);
    const a = [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ] as const;
    const b = a.map(([x, y]) => [x + 1, y] as const);
    banda.poner(a, b, 0.5);
    const pos = banda.geometria.getAttribute('position');
    expect(pos.getX(0)).toBe(0);
    expect(pos.getX(1)).toBe(1);
    expect(pos.getY(7)).toBe(3);
    expect(pos.getZ(3)).toBe(0.5);
    // Con `desde`, la banda empieza más adelante en los contornos.
    const corta = new Banda(2);
    corta.poner(a, b, 0, 2);
    expect(corta.geometria.getAttribute('position').getY(0)).toBe(2);
    // UV en unidades de escena: u a lo largo del borde `a`, v de `a` (0) a `b` (su distancia).
    const uv = banda.geometria.getAttribute('uv');
    expect(uv.getX(0)).toBe(0);
    expect(uv.getY(0)).toBe(0);
    expect(uv.getY(1)).toBeCloseTo(1, 6);
    expect(uv.getX(6)).toBeCloseTo(3, 6);
    // Con los bordes al revés (banda en sentido horario) se intercambian, pero v sigue siendo 0 en `a`.
    const reves = new Banda(4);
    reves.poner(b, a, 0);
    const uvReves = reves.geometria.getAttribute('uv');
    const posReves = reves.geometria.getAttribute('position');
    for (let i = 0; i < 8; i++) {
      expect(uvReves.getY(i)).toBeCloseTo(posReves.getX(i) === 1 ? 0 : 1, 6);
    }
    banda.geometria.dispose();
    corta.geometria.dispose();
    reves.geometria.dispose();
  });

  it('el abanico rellena la silueta de la raíz desde su centro sin NaN', () => {
    const silueta = siluetaRaiz();
    const abanico = new Abanico(silueta.length);
    expect(triangulosDe(abanico.geometria)).toBe(silueta.length);
    abanico.poner(silueta, [0, 0], 0.04);
    const pos = abanico.geometria.getAttribute('position');
    expect(sinNaN(pos.array)).toBe(true);
    expect(pos.getZ(0)).toBeCloseTo(0.04, 6);
    expect(pos.getX(1)).toBeCloseTo(silueta[0]![0], 6);
    // UV relativas al centro: la textura viaja con el diente.
    abanico.poner(silueta, [0.5, 0.25], 0.04);
    const uv = abanico.geometria.getAttribute('uv');
    expect(uv.getX(0)).toBe(0);
    expect(uv.getX(1)).toBeCloseTo(silueta[0]![0] - 0.5, 6);
    expect(uv.getY(1)).toBeCloseTo(silueta[0]![1] - 0.25, 6);
    abanico.geometria.dispose();
  });

  it('las polilíneas escriben (puntos − 1) segmentos por línea', () => {
    const lineas = new Polilineas(2, 4);
    expect(lineas.geometria.getAttribute('position').count).toBe(2 * 3 * 2);
    lineas.poner(
      [
        [
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0],
        ],
        [
          [0, 1],
          [1, 1],
          [2, 1],
          [3, 1],
        ],
      ],
      0.1,
    );
    const pos = lineas.geometria.getAttribute('position');
    expect(pos.getX(5)).toBe(3);
    expect(pos.getY(6)).toBe(1);
    expect(pos.getZ(11)).toBeCloseTo(0.1, 6);
    lineas.geometria.dispose();
  });
});

describe.each<[string, () => PiezaOrtodoncia, number, number]>([
  ['BloqueAlveolar', () => new BloqueAlveolar(), 4_000, 5],
  ['Diente', () => new Diente(), 1_500, 6],
  ['Alveolo', () => new Alveolo(), 2_500, 8],
  ['Celulas', () => new Celulas(), 6_000, 4],
  ['Fuerza', () => new Fuerza(), 400, 3],
])('%s', (_, crear, presupuesto, llamadas) => {
  it('cabe en el presupuesto de polígonos y de llamadas de dibujo', () => {
    const pieza = crear();
    let peor = 0;
    let peorLlamadas = 0;
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoOrtodoncia(t));
      if (!pieza.grupo.visible) continue;
      peor = Math.max(peor, triangulos(pieza.grupo));
      peorLlamadas = Math.max(peorLlamadas, llamadasDeDibujo(pieza.grupo));
    }
    expect(peor).toBeGreaterThan(10);
    expect(peor).toBeLessThan(presupuesto);
    expect(peorLlamadas).toBeLessThanOrEqual(llamadas);
    pieza.liberar();
  });

  it('no produce NaN en ningún instante ni deja posiciones o escalas inválidas', () => {
    const pieza = crear();
    for (const t of TIEMPOS) {
      pieza.actualizar(estadoOrtodoncia(t));
      for (const v of [pieza.grupo.position.x, pieza.grupo.position.y, pieza.grupo.scale.x]) {
        expect(Number.isFinite(v), `t = ${t}`).toBe(true);
      }
      for (const g of geometriasDe(pieza.grupo)) {
        expect(sinNaN(g.getAttribute('position').array), `t = ${t}`).toBe(true);
      }
      pieza.grupo.traverse((o) => {
        const im = o as Mesh & {
          isInstancedMesh?: boolean;
          instanceMatrix?: { array: ArrayLike<number> };
        };
        if (im.isInstancedMesh && im.instanceMatrix) {
          expect(sinNaN(im.instanceMatrix.array), `${o.name} en t = ${t}`).toBe(true);
        }
      });
    }
    pieza.liberar();
  });

  it('actualizar es determinista: la misma t da lo mismo, vaya lo que vaya antes', () => {
    const pieza = crear();
    const foto = (): unknown[] => {
      const lista: unknown[] = [
        pieza.grupo.visible,
        pieza.grupo.position.x,
        pieza.grupo.rotation.z,
      ];
      pieza.grupo.traverse((o) => {
        const m = (o as Mesh).material as
          { opacity?: number; color?: { getHex: () => number } } | undefined;
        if (m) lista.push(o.visible, m.opacity, m.color?.getHex());
        const g = (o as Mesh).geometry as BufferGeometry | undefined;
        if (g) lista.push(Array.from(g.getAttribute('position').array));
      });
      return lista;
    };
    pieza.actualizar(estadoOrtodoncia(0.61));
    const antes = foto();
    pieza.actualizar(estadoOrtodoncia(0.05));
    pieza.actualizar(estadoOrtodoncia(0.97));
    pieza.actualizar(estadoOrtodoncia(0.61));
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
  // rendimiento-09: cuenta lo que se dibuja de verdad (instancias, la doble pasada de los transparentes de doble cara
  // y, aparte, el pase de sombras), en 401 instantes. Cifras que cita docs/escena-3d-ortodoncia.md.
  it('cabe en el presupuesto total con la doble pasada: menos de 40 000 triángulos, 40 llamadas y 40 de sombra', () => {
    const piezas = [new BloqueAlveolar(), new Alveolo(), new Diente(), new Celulas(), new Fuerza()];
    const peor = { llamadas: 0, triangulos: 0, sombras: 0, triangulosSombra: 0 };
    for (let k = 0; k <= 400; k++) {
      for (const p of piezas) p.actualizar(estadoOrtodoncia(k / 400));
      const r = medirDibujo(piezas.map((p) => p.grupo));
      for (const clave of Object.keys(peor) as (keyof typeof peor)[]) {
        peor[clave] = Math.max(peor[clave], r[clave]);
      }
    }
    console.info(`[ortodoncia] peor instante: ${JSON.stringify(peor)}`);
    expect(peor.triangulos).toBeLessThan(40_000);
    expect(peor.llamadas).toBeLessThan(40);
    expect(peor.sombras).toBeLessThan(40);
    for (const p of piezas) p.liberar();
  });

  // realismo-12: el bracket flotaba 0,21 delante del diente y su sombra caía despegada.
  it('el bracket va pegado a la cara de corte de la corona, a media corona; la flecha, delante', () => {
    const fuerza = new Fuerza();
    const diente = new Diente();
    for (const t of [0.16, 0.5, 0.83]) {
      const e = estadoOrtodoncia(t);
      fuerza.actualizar(e);
      diente.actualizar(e);
      fuerza.grupo.updateMatrixWorld(true);
      const bracket = fuerza.grupo.getObjectByName('bracket') as Mesh;
      const caja = new Box3().setFromObject(bracket);
      // La base atraviesa la cara de corte de la corona (z de 0,042 a 0,05).
      expect(caja.min.z, `t = ${t}`).toBeLessThan(0.042);
      expect(caja.max.z, `t = ${t}`).toBeGreaterThan(0.05);
      // Y cae dentro de la silueta de la corona, en su tercio medio.
      const corona = diente.grupo.getObjectByName('corte_corona') as Mesh;
      corona.geometry.computeBoundingBox();
      const cajaCorona = corona.geometry.boundingBox!;
      expect(caja.min.x).toBeGreaterThan(cajaCorona.min.x);
      expect(caja.max.x).toBeLessThan(cajaCorona.max.x);
      const medio = (caja.min.y + caja.max.y) / 2;
      const k = (medio - cajaCorona.min.y) / (cajaCorona.max.y - cajaCorona.min.y);
      expect(k, `t = ${t}`).toBeGreaterThan(1 / 3);
      expect(k, `t = ${t}`).toBeLessThan(2 / 3);
      const punta = new Box3().setFromObject(fuerza.grupo.getObjectByName('punta_flecha')!);
      expect(punta.min.z).toBeGreaterThan(caja.max.z);
    }
    fuerza.liberar();
    diente.liberar();
  });

  // Sin navegador: la cúspide (que subió 0,25 con fidelidad-02) y la base del bloque caben en la vista general, en
  // un lienzo ancho (1,5) y en uno de teléfono (1,1).
  it('la vista general encuadra de la cúspide del canino a la base del bloque', () => {
    for (const aspecto of [1.5, 1.1]) {
      const e = estadoDeVistaOrtodoncia('general', aspecto);
      const camara = new PerspectiveCamera(FOV_GRADOS, aspecto, 0.1, 80);
      camara.position.set(...e.posicion);
      camara.lookAt(new Vector3(...e.objetivo));
      camara.updateMatrixWorld();
      for (const x of [X_DIENTE_INICIAL, X_DIENTE_INICIAL + DESPLAZAMIENTO_MAXIMO]) {
        const cuspide = new Vector3(x, Y_CUELLO + ALTO_CORONA, 0).project(camara).y;
        expect(cuspide, `aspecto ${aspecto}`).toBeLessThan(0.99);
      }
      const base = new Vector3(0, Y_BASE, 0).project(camara).y;
      expect(base, `aspecto ${aspecto}`).toBeGreaterThan(-0.99);
    }
  });

  // realismo-10: el esmalte era un blanco uniforme con brillo de espejo (porcelana).
  it('la corona lleva el degradado del esmalte del cuello a la cúspide, y su cara de corte, un blanco uniforme', () => {
    const g = mediaCorona();
    const pos = g.getAttribute('position');
    const color = g.getAttribute('color');
    expect(color.count).toBe(pos.count);
    let cuello = 0;
    let cuspide = 0;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < pos.getY(cuello)) cuello = i;
      if (pos.getY(i) > pos.getY(cuspide)) cuspide = i;
    }
    expect(pos.getY(cuello)).toBeCloseTo(Y_CUELLO, 6);
    expect(color.getX(cuello)).toBeGreaterThan(color.getZ(cuello) + 0.1);
    expect(color.getZ(cuspide)).toBeGreaterThan(color.getX(cuspide));
    g.dispose();
    const diente = new Diente();
    const corte = diente.grupo.getObjectByName('corte_corona') as Mesh;
    const material = corte.material as MeshStandardMaterial;
    expect(material.vertexColors).toBe(true);
    const c = corte.geometry.getAttribute('color');
    expect(c.count).toBe(corte.geometry.getAttribute('position').count);
    expect(c.getX(0)).toBeCloseTo(c.getX(c.count - 1), 9);
    diente.liberar();
  });

  it('la fuerza solo se dibuja mientras hay fuerza, pegada a la corona', () => {
    const fuerza = new Fuerza();
    fuerza.actualizar(estadoOrtodoncia(0));
    expect(fuerza.grupo.visible).toBe(false);
    fuerza.actualizar(estadoOrtodoncia(0.16));
    expect(fuerza.grupo.visible).toBe(true);
    expect(fuerza.grupo.position.x).toBeCloseTo(X_DIENTE_INICIAL, 6);
    fuerza.actualizar(estadoOrtodoncia(0.83));
    expect(fuerza.grupo.position.x).toBeGreaterThan(X_DIENTE_INICIAL + 0.5);
    fuerza.actualizar(estadoOrtodoncia(1));
    expect(fuerza.grupo.visible).toBe(false);
    fuerza.liberar();
  });

  it('las células aparecen con su fase: osteoclastos en la resorción, osteoblastos desde la aposición', () => {
    const celulas = new Celulas();
    const osteoclastos = celulas.grupo.getObjectByName('osteoclastos')!;
    const osteoblastos = celulas.grupo.getObjectByName('osteoblastos')!;
    celulas.actualizar(estadoOrtodoncia(0.32));
    expect(osteoclastos.visible).toBe(false);
    expect(osteoblastos.visible).toBe(false);
    celulas.actualizar(estadoOrtodoncia(0.5));
    expect(osteoclastos.visible).toBe(true);
    expect(osteoblastos.visible).toBe(false);
    celulas.actualizar(estadoOrtodoncia(0.66));
    expect(osteoclastos.visible).toBe(false);
    expect(osteoblastos.visible).toBe(true);
    celulas.actualizar(estadoOrtodoncia(1));
    expect(osteoblastos.visible).toBe(true);
    celulas.liberar();
  });

  it('la zona hialinizada y la marca de referencia aparecen y desaparecen con su fase', () => {
    const alveolo = new Alveolo();
    const diente = new Diente();
    const hialinizado = alveolo.grupo.getObjectByName('zona_hialinizada') as Mesh;
    const referencia = diente.grupo.getObjectByName('posicion_inicial') as Mesh;
    const opacidad = (m: Mesh): number => (m.material as { opacity: number }).opacity;
    alveolo.actualizar(estadoOrtodoncia(0));
    diente.actualizar(estadoOrtodoncia(0));
    expect(opacidad(hialinizado)).toBe(0);
    expect(opacidad(referencia)).toBe(0);
    alveolo.actualizar(estadoOrtodoncia(0.32));
    expect(opacidad(hialinizado)).toBe(1);
    alveolo.actualizar(estadoOrtodoncia(0.66));
    expect(opacidad(hialinizado)).toBe(0);
    diente.actualizar(estadoOrtodoncia(0.83));
    expect(opacidad(referencia)).toBe(1);
    alveolo.liberar();
    diente.liberar();
  });

  it('los abanicos del corte del diente no se pliegan: todos sus triángulos miran a +Z en todo instante', () => {
    const diente = new Diente();
    for (const t of [0, 0.32, 0.5, 0.83, 1]) {
      diente.actualizar(estadoOrtodoncia(t));
      for (const nombre of ['corte_raiz', 'corte_corona', 'pulpa']) {
        const g = (diente.grupo.getObjectByName(nombre) as Mesh).geometry;
        const pos = g.getAttribute('position');
        const indice = g.getIndex()!;
        for (let i = 0; i < indice.count; i += 3) {
          const [a, b, c] = [indice.getX(i), indice.getX(i + 1), indice.getX(i + 2)];
          const cruz =
            (pos.getX(b) - pos.getX(a)) * (pos.getY(c) - pos.getY(a)) -
            (pos.getY(b) - pos.getY(a)) * (pos.getX(c) - pos.getX(a));
          expect(cruz, `${nombre}, triángulo ${i / 3}, t = ${t}`).toBeGreaterThan(-1e-12);
        }
      }
    }
    diente.liberar();
  });

  it('el diente se mueve hacia la derecha con el tiempo (corona en relieve y cara de corte)', () => {
    const diente = new Diente();
    const corona = diente.grupo.getObjectByName('corona_relieve')!;
    const raiz = diente.grupo.getObjectByName('corte_raiz') as Mesh;
    diente.actualizar(estadoOrtodoncia(0));
    const x0 = corona.position.x;
    raiz.geometry.computeBoundingBox();
    const raizX0 = raiz.geometry.boundingBox!.min.x;
    diente.actualizar(estadoOrtodoncia(1));
    expect(corona.position.x - x0).toBeGreaterThan(0.6);
    raiz.geometry.computeBoundingBox();
    expect(raiz.geometry.boundingBox!.min.x - raizX0).toBeGreaterThan(0.6);
    diente.liberar();
  });
});
