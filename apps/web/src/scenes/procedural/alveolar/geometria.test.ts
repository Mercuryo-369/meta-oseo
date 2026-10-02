/**
 * Pruebas de las formas de la escena del hueso alveolar sin WebGL (three crea las geometrías en memoria):
 * geometrías válidas, sin NaN en todo el recorrido del tiempo, presupuesto de polígonos y de llamadas de dibujo,
 * y liberación de recursos.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, Mesh } from 'three';
import { perfilCuerpo, regionTrabecular, siluetaRaiz } from './disposicion';
import { LARGO_SEGMENTO, Z_ALVEOLO, estadoAlveolar } from './estado';
import { bloque, mediaCorona, placa } from './geometria';
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
});

describe.each<[string, () => PiezaAlveolar, number, number]>([
  ['MitadMovil', () => new MitadMovil(), 2_500, 2],
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
});

describe('la escena completa', () => {
  it('cabe en el presupuesto total: menos de 40 000 triángulos y de 40 llamadas de dibujo', () => {
    const piezas = [
      new MitadMovil(),
      new CuerpoSeccionado(),
      new Alveolo(),
      new ConductoMandibular(),
    ];
    let peorTriangulos = 0;
    let peorLlamadas = 0;
    for (const t of TIEMPOS) {
      let tri = 0;
      let llam = 0;
      for (const p of piezas) {
        p.actualizar(estadoAlveolar(t));
        if (!p.grupo.visible) continue;
        tri += triangulos(p.grupo);
        llam += llamadasDeDibujo(p.grupo);
      }
      peorTriangulos = Math.max(peorTriangulos, tri);
      peorLlamadas = Math.max(peorLlamadas, llam);
    }
    expect(peorTriangulos).toBeLessThan(40_000);
    expect(peorLlamadas).toBeLessThan(40);
    for (const p of piezas) p.liberar();
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
