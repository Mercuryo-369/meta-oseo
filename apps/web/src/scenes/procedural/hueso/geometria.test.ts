/**
 * Pruebas de las formas de la escena del hueso sin WebGL (three crea las geometrías en memoria): geometrías
 * válidas, sin NaN en todo el recorrido del tiempo, UV en unidades de escena, presupuesto de polígonos y de
 * llamadas de dibujo (con las instancias, la doble pasada de las transparencias y el pase de sombras) y
 * liberación de recursos.
 */
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Group, InstancedMesh, Material, Mesh, Object3D } from 'three';
import { DoubleSide, MeshPhysicalMaterial } from 'three';
import { estadoHueso } from './estado';
import {
  anillo,
  cascaraElipsoide,
  longitudMeridiano,
  revolucion,
  tronco,
  uvCilindro,
} from './geometria';
import {
  CorteTransversal,
  HuesoLargo,
  NIVELES_OSTEONA,
  OVALIZACION_OSTEONA,
  OsteonaAmpliada,
} from './mallas';
import type { EscalaHueso } from './mallas';
import { CylinderGeometry } from 'three';

const TIEMPOS = Array.from({ length: 41 }, (_, i) => i / 40);
/** Cada 1/600: el fundido del hueso largo al corte dura menos de 0,1 de t. */
const TIEMPOS_FINOS = Array.from({ length: 601 }, (_, i) => i / 600);

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

function esVisible(o: Object3D): boolean {
  let p: Object3D | null = o;
  while (p) {
    if (!p.visible) return false;
    p = p.parent;
  }
  return true;
}

/** Triángulos de una malla tal como se dibuja: los de su geometría por el número de instancias. */
function triangulosDeMalla(o: Object3D): number {
  const malla = o as Mesh;
  if (!malla.isMesh) return 0;
  const g = malla.geometry;
  const porInstancia = (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
  const instanciada = o as InstancedMesh;
  return porInstancia * (instanciada.isInstancedMesh ? instanciada.count : 1);
}

/** Triángulos de todas las mallas del grupo (visibles o no; las líneas no tienen triángulos). */
function triangulos(grupo: Group): number {
  let suma = 0;
  grupo.traverse((o) => (suma += triangulosDeMalla(o)));
  return suma;
}

interface Dibujo {
  triangulos: number;
  llamadas: number;
  /** Lo mismo contando dos veces lo que three dibuja en dos pasadas (transparente de doble cara). */
  triangulosConPasadas: number;
  llamadasConPasadas: number;
  /** Pase de sombras: las mallas opacas (o casi) que proyectan sombra. */
  triangulosSombra: number;
  llamadasSombra: number;
}

/**
 * Lo que se dibuja de verdad en un fotograma: cada objeto visible con geometría es una llamada (una línea
 * también); three parte en dos pasadas (cara trasera y delantera) todo material transparente de doble cara sin
 * `forceSinglePass`, y el pase de sombras dibuja otra vez las mallas que las proyectan (`EntornoRealista`: opacas
 * o con opacidad > 0,9 y sin `userData.sinSombra`).
 */
function medirDibujo(grupos: readonly Object3D[]): Dibujo {
  const d: Dibujo = {
    triangulos: 0,
    llamadas: 0,
    triangulosConPasadas: 0,
    llamadasConPasadas: 0,
    triangulosSombra: 0,
    llamadasSombra: 0,
  };
  for (const grupo of grupos) {
    grupo.traverse((o) => {
      const g = (o as Mesh).geometry as BufferGeometry | undefined;
      if (!g || !esVisible(o)) return;
      const t = triangulosDeMalla(o);
      const m = (o as Mesh).material as Material;
      const pasadas = m.transparent && m.side === DoubleSide && !m.forceSinglePass ? 2 : 1;
      d.llamadas++;
      d.triangulos += t;
      d.llamadasConPasadas += pasadas;
      d.triangulosConPasadas += t * pasadas;
      if ((o as Mesh).isMesh && !o.userData.sinSombra && (!m.transparent || m.opacity > 0.9)) {
        d.llamadasSombra++;
        d.triangulosSombra += t;
      }
    });
  }
  return d;
}

/** Repeticiones de la textura por unidad de superficie en un triángulo: √(área UV / área real). */
function densidadUv(g: BufferGeometry, tri: number): number {
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  const idx = g.getIndex();
  const v = (k: number) => idx?.getX(3 * tri + k) ?? 3 * tri + k;
  const [a, b, c] = [v(0), v(1), v(2)];
  const p = (i: number) => [pos.getX(i), pos.getY(i), pos.getZ(i)] as const;
  const [pa, pb, pc] = [p(a), p(b), p(c)];
  const ab = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]];
  const ac = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
  const cruz = [
    ab[1]! * ac[2]! - ab[2]! * ac[1]!,
    ab[2]! * ac[0]! - ab[0]! * ac[2]!,
    ab[0]! * ac[1]! - ab[1]! * ac[0]!,
  ];
  const area = Math.hypot(cruz[0]!, cruz[1]!, cruz[2]!) / 2;
  const du1 = uv.getX(b) - uv.getX(a);
  const dv1 = uv.getY(b) - uv.getY(a);
  const du2 = uv.getX(c) - uv.getX(a);
  const dv2 = uv.getY(c) - uv.getY(a);
  const areaUv = Math.abs(du1 * dv2 - du2 * dv1) / 2;
  return area < 1e-9 ? 1 : Math.sqrt(areaUv / area);
}

/** Densidad mínima y máxima de UV por unidad en todos los triángulos no degenerados. */
function rangoDensidad(g: BufferGeometry): [number, number] {
  const n = (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
  let min = Infinity;
  let max = 0;
  for (let t = 0; t < n; t++) {
    const d = densidadUv(g, t);
    min = Math.min(min, d);
    max = Math.max(max, d);
  }
  return [min, max];
}

describe('anillo', () => {
  it('un anillo parcial lleva las dos caras de corte que uno completo no tiene', () => {
    const cuenta = (g: BufferGeometry) => g.getAttribute('position').count;
    const completo = anillo(0.5, 1, 1, 0, Math.PI * 2, 56);
    const parcial = anillo(0.5, 1, 1, 0, Math.PI, 56);
    // Dos planos de 4 vértices cada uno, además de la mitad de los segmentos del anillo completo.
    expect(cuenta(parcial)).toBeLessThan(cuenta(completo));
    expect(sinNaN(completo.getAttribute('position').array)).toBe(true);
    expect(sinNaN(parcial.getAttribute('normal').array)).toBe(true);
  });

  it('los índices apuntan a vértices que existen', () => {
    const g = anillo(0.3, 1, 2, 0.4, 2.2);
    const vertices = g.getAttribute('position').count;
    const indices = g.getIndex()!.array;
    for (let i = 0; i < indices.length; i++) expect(indices[i]!).toBeLessThan(vertices);
  });

  it('un disco (radio interior 0) es válido', () => {
    const g = anillo(0, 0.6, 0.3);
    expect(sinNaN(g.getAttribute('position').array)).toBe(true);
    expect(sinNaN(g.getAttribute('uv').array)).toBe(true);
  });

  it('las UV van en unidades de escena: el grano mide lo mismo en paredes, tapas y caras (también en un tramo corto)', () => {
    // El tramo necrótico de la fractura mide 0,35 de largo: antes su grano salía 20 veces más apretado a lo largo.
    for (const g of [
      anillo(0.62, 1, 7, -0.35, 3.84),
      anillo(0.62, 1, 0.35, 0.3, 4),
      anillo(0, 0.6, 0.3),
      anillo(1, 1.07, 0.3, 0, Math.PI * 2, 56, { tapasPolares: true }),
    ]) {
      const [min, max] = rangoDensidad(g);
      // Paredes de un cilindro: exacto; tapas planas: exacto; polares en un anillo fino: casi.
      expect(min).toBeGreaterThan(0.85);
      expect(max).toBeLessThan(1.15);
    }
  });

  it('el cuerpo y la cuña siguen el mismo dibujo en su unión de delante (U = θ · radio, sin salto)', () => {
    const t0 = -2.79;
    const a = 2.44;
    const cuna = anillo(0.62, 1, 1, t0, a);
    const cuerpo = anillo(0.62, 1, 1, t0 + a, Math.PI * 2 - a);
    const uEn = (g: BufferGeometry, theta: number) => {
      const pos = g.getAttribute('position');
      const uv = g.getAttribute('uv');
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getZ(i));
        const th = Math.atan2(pos.getX(i), pos.getZ(i));
        if (Math.abs(r - 1) < 1e-6 && Math.abs(th - theta) < 1e-5) return uv.getX(i);
      }
      throw new Error('sin vértice');
    };
    expect(uEn(cuerpo, t0 + a)).toBeCloseTo(uEn(cuna, t0 + a), 5);
  });

  it('las tapas polares de una vuelta completa dan un número entero de repeticiones (sin corte en la costura)', () => {
    const periodo = 1 / 1.44;
    const g = anillo(1, 1.07, 0.3, 0, Math.PI * 2, 56, {
      tapasPolares: true,
      periodoTapas: periodo,
    });
    const uv = g.getAttribute('uv');
    const normal = g.getAttribute('normal');
    let maxV = 0;
    for (let i = 0; i < uv.count; i++)
      if (Math.abs(normal.getY(i)) > 0.5) maxV = Math.max(maxV, uv.getY(i));
    const vueltas = maxV / periodo;
    expect(Math.abs(vueltas - Math.round(vueltas))).toBeLessThan(1e-6);
  });

  it('el desplazamiento de V sigue a la altura a la que irá la pieza', () => {
    const g = anillo(0.62, 1, 0.35, 0, Math.PI * 2, 56, { desplazamientoV: 2 });
    const pos = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    const normal = g.getAttribute('normal');
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(normal.getY(i)) > 0.5) continue;
      expect(uv.getY(i)).toBeCloseTo(pos.getY(i) + 2, 6);
    }
  });
});

describe('tronco y cáscara de la epífisis', () => {
  it('la metáfisis empalma con la diáfisis sin costura (mismas UV en la unión) y su grano no se aplasta', () => {
    const diafisis = anillo(0.62, 1, 7, -0.35, 3.84);
    const metafisis = tronco(0.62, 1, 1.24, 1.36, 2.55, 3.35, -0.35, 3.84);
    const uvEn = (g: BufferGeometry, y: number) => {
      const pos = g.getAttribute('position');
      const uv = g.getAttribute('uv');
      const normal = g.getAttribute('normal');
      const mapa = new Map<string, [number, number]>();
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getZ(i));
        if (Math.abs(pos.getY(i) - y) > 1e-5 || Math.abs(r - 1) > 1e-5) continue;
        // Solo la pared (normal hacia fuera), no las caras de corte que tocan la misma arista.
        const radial = (normal.getX(i) * pos.getX(i) + normal.getZ(i) * pos.getZ(i)) / r;
        if (Math.abs(radial) < 0.5) continue;
        mapa.set(Math.atan2(pos.getX(i), pos.getZ(i)).toFixed(4), [uv.getX(i), uv.getY(i)]);
      }
      return mapa;
    };
    const arriba = uvEn(diafisis, 2.55);
    const abajo = uvEn(metafisis, 2.55);
    // La diáfisis tiene un solo tramo de altura: su fila en 2,55 no existe; se comparan U y V calculadas.
    expect(abajo.size).toBeGreaterThan(20);
    for (const [theta, [u, v]] of abajo) {
      // U = θ · 1 con θ sin envolver (de −0,35 a 3,49): la misma que da la pared de la diáfisis en esa altura.
      const vueltas = (u - Number(theta)) / (Math.PI * 2);
      expect(Math.abs(vueltas - Math.round(vueltas))).toBeLessThan(1e-3);
      expect(v).toBeCloseTo(2.55, 6);
    }
    expect(arriba.size).toBe(0);
    const [min, max] = rangoDensidad(metafisis);
    expect(min).toBeGreaterThan(0.75);
    expect(max).toBeLessThan(1.3);
  });

  it('cascaraElipsoide queda centrada en su altura y acotada por su radio y su semieje', () => {
    const g = cascaraElipsoide(1.6, 1.2, 4, 0, Math.PI * 2);
    g.computeBoundingBox();
    const caja = g.boundingBox!;
    expect(caja.max.y).toBeCloseTo(4 + 1.2, 2);
    expect(caja.min.y).toBeCloseTo(4 - 1.2, 2);
    expect(caja.max.x).toBeCloseTo(1.6, 1);
  });

  it('en la cáscara de la epífisis la V es la longitud del meridiano y el grano no cambia de la cuña al cuerpo', () => {
    expect(longitudMeridiano(1, 1, Math.PI)).toBeCloseTo(Math.PI, 6);
    const cuerpo = cascaraElipsoide(1.65, 1.25, 4.05, -0.35, 3.84);
    const cuna = cascaraElipsoide(1.65, 1.25, 4.05, -2.79, 2.44);
    // Lejos de los polos (donde los triángulos se degeneran), la densidad es casi 1 en las dos piezas.
    for (const g of [cuerpo, cuna]) {
      const pos = g.getAttribute('position');
      const n = g.getIndex()!.count / 3;
      for (let t = 0; t < n; t++) {
        const i = g.getIndex()!.getX(3 * t);
        if (Math.hypot(pos.getX(i), pos.getZ(i)) < 1.2) continue;
        const d = densidadUv(g, t);
        expect(d).toBeGreaterThan(0.8);
        expect(d).toBeLessThan(1.2);
      }
    }
  });

  it('revolucion (periostio, hematoma, callo) mide la V a lo largo del perfil', () => {
    const g = revolucion(
      [
        [1, -1],
        [1, 1],
        [1.5, 2],
      ],
      Math.PI,
    );
    const uv = g.getAttribute('uv');
    let maxV = 0;
    for (let i = 0; i < uv.count; i++) maxV = Math.max(maxV, uv.getY(i));
    expect(maxV).toBeCloseTo(2 + Math.hypot(0.5, 1), 5);
    expect(sinNaN(uv.array)).toBe(true);
  });

  it('uvCilindro: pared con U = θ · radio y tapas planas', () => {
    const g = uvCilindro(new CylinderGeometry(0.6, 0.6, 2, 24, 1, false, Math.PI), Math.PI);
    const [min, max] = rangoDensidad(g);
    expect(min).toBeGreaterThan(0.9);
    expect(max).toBeLessThan(1.1);
  });
});

describe.each<[string, () => EscalaHueso, number]>([
  // Con las instancias (antes no se contaban: el hueso salía en 11 362 y dibujaba 15 418).
  ['HuesoLargo', () => new HuesoLargo(), 16_500],
  ['CorteTransversal', () => new CorteTransversal(), 13_500],
  ['OsteonaAmpliada', () => new OsteonaAmpliada(), 9_500],
])('%s', (_, crear, presupuesto) => {
  it('cabe en el presupuesto de polígonos (contando las instancias)', () => {
    const escala = crear();
    expect(triangulos(escala.grupo)).toBeGreaterThan(100);
    expect(triangulos(escala.grupo)).toBeLessThan(presupuesto);
    escala.liberar();
  });

  it('no produce NaN en ningún instante ni deja posiciones o escalas inválidas', () => {
    const escala = crear();
    for (const t of TIEMPOS) {
      escala.actualizar(estadoHueso(t));
      for (const v of [escala.grupo.position.x, escala.grupo.position.y, escala.grupo.scale.x]) {
        expect(Number.isFinite(v), `t = ${t}`).toBe(true);
      }
    }
    for (const g of geometriasDe(escala.grupo)) {
      expect(sinNaN(g.getAttribute('position').array)).toBe(true);
      const uv = g.getAttribute('uv');
      if (uv) expect(sinNaN(uv.array)).toBe(true);
    }
    escala.liberar();
  });

  it('actualizar es determinista: la misma t da lo mismo, vaya lo que vaya antes', () => {
    const escala = crear();
    escala.actualizar(estadoHueso(0.61));
    const antes = [escala.grupo.visible, escala.grupo.scale.x, escala.grupo.position.x];
    escala.actualizar(estadoHueso(0.05));
    escala.actualizar(estadoHueso(0.97));
    escala.actualizar(estadoHueso(0.61));
    expect([escala.grupo.visible, escala.grupo.scale.x, escala.grupo.position.x]).toEqual(antes);
    escala.liberar();
  });

  it('cada material sube de versión como mucho una vez por fotograma (la opacidad se aplica una sola vez)', () => {
    const escala = crear();
    const materiales = new Set<Material>();
    escala.grupo.traverse((o) => {
      const m = (o as Mesh).material as Material | undefined;
      if (m) materiales.add(m);
    });
    for (const t of TIEMPOS_FINOS) {
      const antes = new Map([...materiales].map((m) => [m, m.version]));
      escala.actualizar(estadoHueso(t));
      for (const m of materiales) {
        expect(m.version - antes.get(m)!, `t = ${t}, ${m.name || m.type}`).toBeLessThanOrEqual(1);
      }
    }
    escala.liberar();
  });

  it('libera las geometrías al terminar', () => {
    const escala = crear();
    let liberadas = 0;
    for (const g of geometriasDe(escala.grupo)) g.addEventListener('dispose', () => liberadas++);
    escala.liberar();
    expect(liberadas).toBeGreaterThan(0);
  });
});

describe('piezas del hueso largo', () => {
  it('el periostio cubre diáfisis, metáfisis y epífisis por fuera del hueso y se deja de dibujar al apagarse', () => {
    const hueso = new HuesoLargo();
    const periostio = hueso.grupo.getObjectByName('periostio') as Mesh;
    periostio.geometry.computeBoundingBox();
    const caja = periostio.geometry.boundingBox!;
    // Llega hasta el borde del cartílago articular (|y| ≈ 4,78) y abraza la epífisis (radio 1,65).
    expect(caja.max.y).toBeGreaterThan(4.7);
    expect(caja.min.y).toBeLessThan(-4.7);
    expect(caja.max.x).toBeGreaterThan(1.65);
    hueso.actualizar(estadoHueso(0));
    expect(esVisible(periostio)).toBe(true);
    hueso.actualizar(estadoHueso(0.2));
    expect(periostio.visible).toBe(false);
    hueso.liberar();
  });

  it('las piezas grandes del hueso miden el relieve por unidad (repetición de un solo dígito, no la 6 × 10 de antes)', () => {
    const hueso = new HuesoLargo();
    const corte = new CorteTransversal();
    for (const escala of [hueso, corte]) {
      escala.grupo.traverse((o) => {
        const m = (o as Mesh).material as MeshPhysicalMaterial | undefined;
        if (!(m instanceof MeshPhysicalMaterial) || !m.bumpMap) return;
        if ((o as InstancedMesh).isInstancedMesh && o.name === 'trabeculas') return;
        expect(m.bumpMap.repeat.x, o.name).toBeLessThan(4);
        expect(m.bumpMap.anisotropy, o.name).toBe(4);
      });
    }
    hueso.liberar();
    corte.liberar();
  });

  it('las osteonas del corte no salen de su hueco (ni con la escala, la ovalización y la línea de cemento)', () => {
    const borde = NIVELES_OSTEONA.cemento[1] * 1.08 * (1 + OVALIZACION_OSTEONA);
    expect(borde).toBeLessThanOrEqual(0.1 + 1e-9);
    const corte = new CorteTransversal();
    const cemento = corte.grupo.getObjectByName('osteona_linea_cemento') as InstancedMesh;
    expect(cemento.count).toBe(16);
    corte.liberar();
  });
});

describe('visibilidad por escala', () => {
  it('al principio solo el hueso entero; al final la osteona y el corte pequeño', () => {
    const hueso = new HuesoLargo();
    const corte = new CorteTransversal();
    const osteona = new OsteonaAmpliada();
    for (const e of [hueso, corte, osteona]) e.actualizar(estadoHueso(0));
    expect([hueso.grupo.visible, corte.grupo.visible, osteona.grupo.visible]).toEqual([
      true,
      false,
      false,
    ]);
    for (const e of [hueso, corte, osteona]) e.actualizar(estadoHueso(1));
    expect([hueso.grupo.visible, corte.grupo.visible, osteona.grupo.visible]).toEqual([
      false,
      true,
      true,
    ]);
    hueso.liberar();
    corte.liberar();
    osteona.liberar();
  });
});

describe('presupuesto de la escena completa', () => {
  // El peor instante es el fundido del hueso largo al corte (t ≈ 0,33-0,41): unas 23 llamadas y 24 100 triángulos;
  // 38 y 36 800 con la doble pasada (antes de la revisión, 29 y 27 846; 58 y 55 692 con ella).
  it('en el peor instante cabe en 40 000 triángulos y 40 llamadas, también con la doble pasada; sombras < 40', () => {
    const escalas = [new HuesoLargo(), new CorteTransversal(), new OsteonaAmpliada()];
    const peor: Dibujo = {
      triangulos: 0,
      llamadas: 0,
      triangulosConPasadas: 0,
      llamadasConPasadas: 0,
      triangulosSombra: 0,
      llamadasSombra: 0,
    };
    for (const t of TIEMPOS_FINOS) {
      for (const e of escalas) e.actualizar(estadoHueso(t));
      const d = medirDibujo(escalas.map((e) => e.grupo));
      for (const k of Object.keys(peor) as (keyof Dibujo)[]) peor[k] = Math.max(peor[k], d[k]);
    }
    expect(peor.triangulos).toBeGreaterThan(10_000);
    expect(peor.triangulos).toBeLessThan(40_000);
    expect(peor.llamadas).toBeLessThan(40);
    expect(peor.triangulosConPasadas).toBeLessThan(40_000);
    expect(peor.llamadasConPasadas).toBeLessThan(40);
    expect(peor.llamadasSombra).toBeLessThan(40);
    for (const e of escalas) e.liberar();
  });
});
