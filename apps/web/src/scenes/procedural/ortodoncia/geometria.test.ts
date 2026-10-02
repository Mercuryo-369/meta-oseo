/**
 * Pruebas de las formas de la escena del movimiento ortodóntico sin WebGL (three crea las geometrías en
 * memoria): geometrías válidas, sin NaN en todo el recorrido del tiempo, presupuesto de polígonos y de llamadas
 * de dibujo, determinismo, liberación de recursos y visibilidad por fase.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, Mesh } from 'three';
import { perfilBloque, regionTrabecular, siluetaRaiz } from './disposicion';
import { PROFUNDIDAD_BLOQUE, X_DIENTE_INICIAL, estadoOrtodoncia } from './estado';
import { Abanico, Banda, Polilineas, bloque, mediaCorona, placa } from './geometria';
import { Alveolo, BloqueAlveolar, Celulas, Diente, Fuerza } from './mallas';
import type { PiezaOrtodoncia } from './mallas';

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
    banda.geometria.dispose();
    corta.geometria.dispose();
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
  it('cabe en el presupuesto total: menos de 40 000 triángulos y de 40 llamadas de dibujo', () => {
    const piezas = [new BloqueAlveolar(), new Alveolo(), new Diente(), new Celulas(), new Fuerza()];
    let peorTriangulos = 0;
    let peorLlamadas = 0;
    for (const t of TIEMPOS) {
      let tri = 0;
      let llam = 0;
      for (const p of piezas) {
        p.actualizar(estadoOrtodoncia(t));
        if (!p.grupo.visible) continue;
        tri += triangulos(p.grupo);
        llam += llamadasDeDibujo(p.grupo);
      }
      peorTriangulos = Math.max(peorTriangulos, tri);
      peorLlamadas = Math.max(peorLlamadas, llam);
    }
    // Cifras que cita docs/escena-3d-ortodoncia.md.
    expect(peorTriangulos).toBeLessThan(40_000);
    expect(peorLlamadas).toBeLessThan(40);
    for (const p of piezas) p.liberar();
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
