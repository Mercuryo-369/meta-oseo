import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { Box3, Vector2, Vector3 } from 'three';
import type { BufferGeometry, Material, Mesh, Object3D } from 'three';
import { CATALOGO_NODOS } from '@/content/nodos3d';
import { ConfigExploracion3dSchema } from '@/content/schema';
import { useModeloExploracion } from '../useModeloExploracion';
import type { ModeloExploracion } from '../useModeloExploracion';
import {
  ANCHO_LPD,
  DESPLAZAMIENTO,
  GROSOR_LAMINA,
  LADO_PRESION,
  LADO_TENSION,
  LAGUNAS_HOWSHIP,
  LARGO_RAIZ,
  REGIONES_LIGAMENTO,
  R_CUELLO,
  Y_CORTE,
  Y_CRESTA,
  Z_LIGAMENTO,
  anchoLigamento,
  crearLigamentoPeriodontal,
  dentroDeLaRaiz,
  disposicion,
  enLigamento,
  finDentina,
  grosorCemento,
  medioTornoVertical,
  paredAlveolo,
  paredLateral,
  profundidadLagunas,
  puntoDeRegion,
  radioAlveolo,
  radioLamina,
  radioConducto,
  radioPulpa,
  radioRaiz,
  superficieRaiz,
} from './modeloLigamentoPeriodontal';

function mallas(raiz: Object3D): Mesh[] {
  const lista: Mesh[] = [];
  raiz.traverse((o) => {
    if ((o as Mesh).isMesh) lista.push(o as Mesh);
  });
  return lista;
}

function triangulos(g: BufferGeometry): number {
  return (g.index ? g.index.count : g.getAttribute('position').count) / 3;
}

type P2 = [number, number];
const v2 = (p: P2): Vector2 => new Vector2(p[0], p[1]);

describe('raíz: una sola, cónica y con sus capas', () => {
  it('se afina sin saltos del cuello al ápice redondeado, como una raíz real de unos 13 mm', () => {
    let anterior = radioRaiz(LARGO_RAIZ);
    expect(anterior).toBeCloseTo(R_CUELLO, 6);
    for (let y = LARGO_RAIZ - 0.01; y > 0.05; y -= 0.01) {
      const r = radioRaiz(y);
      expect(r, `y = ${y.toFixed(2)}`).toBeLessThanOrEqual(anterior + 1e-12);
      expect(anterior - r, `salto en y = ${y.toFixed(2)}`).toBeLessThan(0.03);
      anterior = r;
    }
    expect(radioRaiz(0)).toBe(0);
    // Proporciones: unos 5,8 mm de ancho en el cuello, la mitad del largo con ~70 % del ancho, ápice estrecho.
    expect(2 * R_CUELLO).toBeGreaterThan(5);
    expect(2 * R_CUELLO).toBeLessThan(7.5);
    expect(LARGO_RAIZ / (2 * R_CUELLO)).toBeGreaterThan(2);
    expect(radioRaiz(LARGO_RAIZ / 2) / R_CUELLO).toBeGreaterThan(0.6);
    expect(radioRaiz(LARGO_RAIZ / 2) / R_CUELLO).toBeLessThan(0.85);
    expect(radioRaiz(0.5)).toBeLessThan(0.6);
  });

  it('el conducto pulpar es central y estrecho, y el cemento es fino y más grueso hacia el ápice', () => {
    for (let y = 1; y <= Y_CORTE; y += 0.5) {
      expect(radioConducto(y) / radioRaiz(y), `y = ${y}`).toBeLessThan(0.3);
      expect(radioPulpa(y)).toBeLessThan(radioRaiz(y) - grosorCemento(y));
      expect(grosorCemento(y)).toBeLessThan(0.25);
    }
    expect(grosorCemento(0)).toBeGreaterThan(2 * grosorCemento(LARGO_RAIZ) - 1e-9);
    // La dentina llega casi al ápice; allí el conducto sale por el foramen apical, rodeado de cemento.
    expect(finDentina()).toBeLessThan(0.5);
    expect(radioPulpa(0.03)).toBeGreaterThan(0);
  });
});

describe('ligamento periodontal bajo la fuerza lateral', () => {
  it('la raíz queda dentro del alvéolo y el ligamento la rodea entera, también bajo el ápice', () => {
    for (const lado of [LADO_TENSION, LADO_PRESION]) {
      for (let y = 0.05; y <= Y_CRESTA; y += 0.05) {
        expect(anchoLigamento(lado, y), `lado ${lado}, y = ${y.toFixed(2)}`).toBeGreaterThan(0.3);
      }
    }
    expect(enLigamento(DESPLAZAMIENTO, -0.3)).toBe(true);
    expect(dentroDeLaRaiz(DESPLAZAMIENTO, 5)).toBe(true);
    expect(enLigamento(DESPLAZAMIENTO, 5)).toBe(false);
  });

  it('es ancho y estirado en el lado de tensión y estrecho y comprimido en el de presión', () => {
    for (let y = 1; y <= Y_CRESTA; y += 0.25) {
      const tension = anchoLigamento(LADO_TENSION, y);
      const presion = anchoLigamento(LADO_PRESION, y) - profundidadLagunas(y);
      // En reposo el ligamento tiene el mismo ancho a los dos lados; la fuerza lo reparte: + y − el desplazamiento.
      expect(tension - presion).toBeCloseTo(2 * DESPLAZAMIENTO, 6);
      expect(presion).toBeGreaterThanOrEqual(ANCHO_LPD - DESPLAZAMIENTO - 1e-6);
      expect(presion).toBeLessThan(ANCHO_LPD - DESPLAZAMIENTO + 0.12);
      expect(tension / presion).toBeGreaterThan(2.5);
    }
  });

  it('el alvéolo es la raíz en reposo engrosada lo mismo en todas direcciones, sin escalones bajo el ápice', () => {
    // Cada punto de la pared está a ANCHO_LPD de la raíz en reposo (medido en perpendicular).
    const contornoRaiz: Vector2[] = [];
    for (let y = 0; y <= Y_CRESTA; y += 0.002) {
      contornoRaiz.push(new Vector2(radioRaiz(y), y), new Vector2(-radioRaiz(y), y));
    }
    for (let y = -ANCHO_LPD + 0.02; y <= Y_CRESTA; y += 0.1) {
      const pared = new Vector2(radioAlveolo(y), y);
      const minimo = Math.min(...contornoRaiz.map((q) => q.distanceTo(pared)));
      expect(minimo, `y = ${y.toFixed(2)}`).toBeCloseTo(ANCHO_LPD, 2);
    }
    // El semiancho crece de forma monótona del fondo a la cresta.
    let anterior = 0;
    for (let y = -ANCHO_LPD; y <= Y_CRESTA; y += 0.01) {
      expect(radioAlveolo(y) + 1e-9).toBeGreaterThanOrEqual(anterior);
      expect(radioLamina(y)).toBeGreaterThan(radioAlveolo(y));
      anterior = radioAlveolo(y);
    }
  });

  it('los haces van de la raíz al hueso: oblicuos (más altos en el hueso), rectos al tensarse y ondulados al comprimirse', () => {
    const { haces } = disposicion();
    expect(haces.length).toBeGreaterThan(25);
    const laterales = haces.filter((h) => h.raiz[1] >= 1.1);
    for (const h of laterales) {
      expect(h.raiz[0], 'inserción en la raíz').toBeCloseTo(superficieRaiz(h.lado, h.raiz[1]), 6);
      expect(h.hueso[0], 'inserción en el hueso').toBeCloseTo(paredAlveolo(h.lado, h.hueso[1]), 6);
      expect(h.hueso[1]).toBeGreaterThanOrEqual(h.raiz[1]);
      if (h.raiz[1] < 9) expect(h.hueso[1] - h.raiz[1]).toBeGreaterThan(0.3);
      for (const p of h.recorrido.slice(1, -1)) expect(enLigamento(p[0], p[1])).toBe(true);
      // Recto en tensión: todos los puntos sobre la recta; ondulado en presión.
      const a = v2(h.raiz);
      const d = v2(h.hueso).sub(a).normalize();
      const desvio = Math.max(...h.recorrido.map((p) => Math.abs(v2(p).sub(a).cross(d))));
      if (h.lado === LADO_TENSION) expect(desvio).toBeLessThan(1e-9);
      else expect(desvio).toBeGreaterThan(0.02);
    }
    expect(laterales.filter((h) => h.lado === LADO_TENSION).length).toBeGreaterThan(12);
    expect(laterales.filter((h) => h.lado === LADO_PRESION).length).toBeGreaterThan(6);
    // Haces apicales bajo la raíz.
    expect(haces.filter((h) => h.raiz[1] < 1).length).toBeGreaterThanOrEqual(5);
  });

  it('las fibras de Sharpey son los extremos incluidos en el cemento y en el hueso alveolar propio', () => {
    for (const h of disposicion().haces) {
      const [, enCemento] = h.sharpeyCemento;
      expect(dentroDeLaRaiz(enCemento[0], enCemento[1]), 'dentro de la raíz').toBe(true);
      // Más cerca de la superficie que el grosor del cemento: se queda en el cemento, no llega a la dentina.
      const hondo = v2(enCemento).distanceTo(v2(h.raiz));
      expect(hondo).toBeLessThan(grosorCemento(h.raiz[1]) / 0.5 + 1e-9);
      const [, enHueso] = h.sharpeyHueso;
      expect(enLigamento(enHueso[0], enHueso[1]) || dentroDeLaRaiz(enHueso[0], enHueso[1])).toBe(
        false,
      );
      expect(v2(enHueso).distanceTo(v2(h.hueso))).toBeLessThan(GROSOR_LAMINA);
    }
  });

  it('en el lado de presión no se insertan haces donde el hueso se está reabsorbiendo', () => {
    for (const h of disposicion().haces.filter((x) => x.lado === LADO_PRESION)) {
      for (const yk of LAGUNAS_HOWSHIP) expect(Math.abs(h.hueso[1] - yk)).toBeGreaterThan(0.35);
    }
  });
});

describe('células en su sitio', () => {
  const d = disposicion();

  it('los fibroblastos son fusiformes, abundantes, están en el ligamento y siguen a los haces', () => {
    expect(d.fibroblastos.length).toBeGreaterThan(25);
    for (const c of d.fibroblastos) {
      expect(enLigamento(c.centro[0], c.centro[1]), `${c.centro}`).toBe(true);
      expect(c.ejes[0] / c.ejes[1], 'fusiforme').toBeGreaterThan(3.5);
    }
    expect(d.fibroblastos.filter((c) => c.lado === LADO_TENSION).length).toBeGreaterThan(
      d.fibroblastos.filter((c) => c.lado === LADO_PRESION).length,
    );
  });

  it('las progenitoras están junto a los vasos del ligamento', () => {
    expect(d.progenitoras.length).toBeGreaterThanOrEqual(8);
    const vasos = d.vasos.slice(0, 3);
    for (const c of d.progenitoras) {
      expect(enLigamento(c.centro[0], c.centro[1])).toBe(true);
      const cerca = vasos.some((v) =>
        v.puntos.some(
          (p) => Math.abs(p[1] - c.centro[1]) < 0.7 && Math.abs(p[0] - c.centro[0]) < 0.2,
        ),
      );
      expect(cerca, `${c.centro}`).toBe(true);
    }
  });

  it('los cementoblastos son cúbicos y forman una fila sobre el cemento de los dos lados', () => {
    expect(d.cementoblastos.length).toBeGreaterThan(60);
    for (const lado of [LADO_TENSION, LADO_PRESION]) {
      expect(d.cementoblastos.filter((c) => c.lado === lado).length).toBeGreaterThan(30);
    }
    for (const c of d.cementoblastos) {
      expect(enLigamento(c.centro[0], c.centro[1])).toBe(true);
      if (c.centro[1] > 0.5) {
        const separacion = c.lado * (c.centro[0] - superficieRaiz(c.lado, c.centro[1]));
        expect(separacion).toBeGreaterThan(0);
        expect(separacion).toBeLessThan(0.08);
      }
      expect(c.ejes[0] / c.ejes[1]).toBeLessThan(2);
    }
  });

  it('los osteoblastos son cúbicos y se alinean sobre el hueso del lado de tensión', () => {
    expect(d.osteoblastos.length).toBeGreaterThan(30);
    for (const c of d.osteoblastos) {
      expect(c.centro[0]).toBeLessThan(0);
      expect(enLigamento(c.centro[0], c.centro[1])).toBe(true);
      const separacion = c.centro[0] - paredAlveolo(LADO_TENSION, c.centro[1]);
      expect(separacion).toBeGreaterThan(0.05);
      expect(separacion).toBeLessThan(0.2);
      expect(c.ejes[0] / c.ejes[1]).toBeLessThan(1.5);
    }
  });

  it('los osteoclastos son gigantes, multinucleados y ocupan las lagunas del lado de presión', () => {
    expect(d.osteoclastos).toHaveLength(LAGUNAS_HOWSHIP.length);
    for (const c of d.osteoclastos) {
      expect(c.centro[0]).toBeGreaterThan(radioAlveolo(c.centro[1]));
      expect(profundidadLagunas(c.centro[1])).toBeGreaterThan(0.15);
      expect(c.nucleos.length).toBeGreaterThanOrEqual(3);
      // Mucho más grandes que un osteoblasto.
      expect(c.ejes[0] * c.ejes[1]).toBeGreaterThan(
        5 * d.osteoblastos[0]!.ejes[0] * d.osteoblastos[0]!.ejes[1],
      );
    }
  });

  it('los restos de Malassez son nidos pequeños de células cerca del cemento, en los dos lados', () => {
    expect(d.nidos.length).toBeGreaterThanOrEqual(3);
    expect(new Set(d.nidos.map((n) => n.lado)).size).toBe(2);
    for (const n of d.nidos) {
      expect(n.celulas.length).toBeGreaterThanOrEqual(4);
      for (const c of n.celulas) expect(enLigamento(c.centro[0], c.centro[1])).toBe(true);
      const y = Math.max(0.3, n.centro[1]);
      if (n.centro[1] > 1) {
        expect(n.lado * (n.centro[0] - superficieRaiz(n.lado, y))).toBeLessThan(0.3);
      }
    }
  });

  it('las células son cúpulas macizas (no anillos) con su núcleo dentro', () => {
    const modelo = crearLigamentoPeriodontal();
    for (const id of [
      'fibroblastos_periodontales',
      'cementoblastos',
      'osteoblastos_alveolares',
      'osteoclastos_alveolares',
    ]) {
      const [citoplasma, nucleos] = mallas(modelo.getObjectByName(id)!);
      const caja = new Box3().setFromBufferAttribute(
        citoplasma!.geometry.getAttribute('position') as never,
      );
      const cajaNucleos = new Box3().setFromBufferAttribute(
        nucleos!.geometry.getAttribute('position') as never,
      );
      expect(
        caja.containsBox(new Box3(cajaNucleos.min, cajaNucleos.max.clone().setZ(caja.max.z))),
        id,
      ).toBe(true);
      // Ningún vértice por debajo de la base: no hay agujero en el centro de la célula.
      expect(caja.min.z, id).toBeGreaterThanOrEqual(Z_LIGAMENTO - 1e-6);
    }
  });
});

describe('modelo', () => {
  const modelo = crearLigamentoPeriodontal();

  it('tiene una pieza con nombre por cada región del catálogo, con materiales propios', () => {
    expect([...REGIONES_LIGAMENTO].sort()).toEqual(
      CATALOGO_NODOS.ligamento_periodontal.map((n) => n.id).sort(),
    );
    const vistos = new Map<Material, string>();
    for (const id of [...REGIONES_LIGAMENTO, 'contexto']) {
      const region = modelo.getObjectByName(id);
      expect(region, id).toBeDefined();
      const suyas = mallas(region!);
      expect(suyas.length, id).toBeGreaterThan(0);
      for (const m of suyas) {
        const mat = m.material as Material;
        expect(vistos.get(mat) ?? id, `material compartido entre ${vistos.get(mat)} y ${id}`).toBe(
          id,
        );
        vistos.set(mat, id);
      }
    }
  });

  it('es un bloque serrado: la cara de corte mira a la cámara y nada sobresale de ella salvo las flechas', () => {
    for (const m of mallas(modelo)) {
      const pos = m.geometry.getAttribute('position');
      const tope = /marca|fuerza/.test(m.name) ? 0.6 : 0.2;
      for (let i = 0; i < pos.count; i++) expect(pos.getZ(i), m.name).toBeLessThanOrEqual(tope);
    }
    for (const nombre of ['cortical_corte', 'ligamento', 'lamina', 'cemento']) {
      // La capa de la cara de corte es la más adelantada de su malla: plana y mirando a +Z.
      const m = modelo.getObjectByName(nombre) as Mesh;
      const n = m.geometry.getAttribute('normal');
      const p = m.geometry.getAttribute('position');
      let zMax = -Infinity;
      for (let i = 0; i < p.count; i++) zMax = Math.max(zMax, p.getZ(i));
      let deFrente = 0;
      for (let i = 0; i < p.count; i++) {
        if (p.getZ(i) < zMax - 1e-6) continue;
        expect(n.getZ(i), nombre).toBeGreaterThan(0.99);
        deFrente++;
      }
      expect(deFrente, nombre).toBeGreaterThan(40);
    }
  });

  it('las superficies de atrás (paredes, raíz que asoma) tienen las normales hacia fuera', () => {
    for (const lado of [-1, 1] as const) {
      const g = paredLateral(lado);
      const n = g.getAttribute('normal');
      for (let i = 0; i < n.count; i++) expect(n.getX(i) * lado).toBeGreaterThan(0.9);
    }
    const g = medioTornoVertical(
      [
        [0, 1],
        [1, 1.1],
      ],
      0.5,
    );
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      const radial = new Vector3(p.getX(i) - 0.5, 0, p.getZ(i));
      expect(radial.dot(new Vector3(n.getX(i), n.getY(i), n.getZ(i)))).toBeGreaterThan(0);
    }
  });

  it('cabe en el presupuesto del móvil: menos de 60 000 triángulos y de 32 llamadas de dibujo', () => {
    const lista = mallas(modelo);
    expect(lista.length).toBeLessThan(32);
    expect(lista.reduce((t, m) => t + triangulos(m.geometry), 0)).toBeLessThan(60_000);
  });

  it('el punto de cada etiqueta cae dentro del bloque, en su tejido y en su lado', () => {
    const caja = new Box3().setFromObject(modelo);
    const izquierda = [
      'celulas_progenitoras_perivasculares',
      'hueso_alveolar_propio',
      'lado_tension',
      'osteoblastos_alveolares',
      'fibroblastos_periodontales',
      'ligamento_periodontal',
    ];
    for (const id of REGIONES_LIGAMENTO) {
      const { punto, radio } = puntoDeRegion(id);
      expect(caja.containsPoint(new Vector3(...punto)), id).toBe(true);
      expect(punto[2], id).toBeGreaterThan(0);
      expect(radio, id).toBeGreaterThan(0);
      // Seis a cada lado del eje: las etiquetas laterales se reparten en dos columnas iguales.
      expect(punto[0] < 0, id).toBe(izquierda.includes(id));
    }
    const [x, y] = puntoDeRegion('ligamento_periodontal').punto;
    expect(enLigamento(x, y)).toBe(true);
    for (const id of ['lado_tension', 'lado_presion', 'restos_epiteliales_malassez'] as const) {
      const [px, py] = puntoDeRegion(id).punto;
      expect(enLigamento(px, py), id).toBe(true);
    }
    const [cx, cy] = puntoDeRegion('cemento_radicular').punto;
    expect(dentroDeLaRaiz(cx, cy)).toBe(true);
    expect(cx - (superficieRaiz(1, cy) - grosorCemento(cy))).toBeGreaterThan(0);
    const [hx, hy] = puntoDeRegion('hueso_alveolar_propio').punto;
    expect(-hx - radioAlveolo(hy)).toBeGreaterThan(0);
    expect(-hx - radioAlveolo(hy)).toBeLessThan(GROSOR_LAMINA);
    // Dos etiquetas del mismo lado no se pisan: al menos 0,9 mm de altura entre ellas.
    for (const lado of [true, false]) {
      const ys = REGIONES_LIGAMENTO.filter((id) => izquierda.includes(id) === lado)
        .map((id) => puntoDeRegion(id).punto[1])
        .sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) expect(ys[i]! - ys[i - 1]!).toBeGreaterThan(0.9);
    }
  });
});

describe('carga en la exploración', () => {
  function montar(): ModeloExploracion {
    let modelo: ModeloExploracion | null = null;
    mount(
      defineComponent({
        setup() {
          modelo = useModeloExploracion({
            modelo: 'ligamento_periodontal',
            nombre: 'prueba',
            aspecto: () => 1,
          });
          return () => h('div');
        },
      }),
    );
    return modelo!;
  }

  it('se construye sin descarga, queda normalizado y ubica cada región', async () => {
    const modelo = montar();
    await modelo.cargar();
    expect(modelo.estado.value).toBe('listo');
    expect(modelo.raiz.value).not.toBeNull();
    const caja = modelo.caja.value!;
    const radio =
      Math.hypot(caja.max[0] - caja.min[0], caja.max[1] - caja.min[1], caja.max[2] - caja.min[2]) /
      2;
    expect(radio).toBeLessThan(1.1);
    for (const id of REGIONES_LIGAMENTO) {
      const u = modelo.ubicar({ id, camara: { vista: 'frontal' } });
      expect(u, id).not.toBeNull();
      expect(u!.normal).toEqual([0, 0, 1]);
    }
    expect(modelo.ubicar({ id: 'epifisis', camara: { vista: 'frontal' } })).toBeNull();
  });
});

describe('contenido', () => {
  const base = {
    modelo: 'ligamento_periodontal',
    alt: 'Raíz de un diente en su alvéolo con el ligamento periodontal.',
    nodos: [
      { id: 'cemento_radicular', etiqueta: 'Cemento', descripcion: 'Tejido que cubre la raíz.' },
      { id: 'lado_presion', etiqueta: 'Lado de presión', descripcion: 'Ligamento comprimido.' },
    ],
    requeridos: ['lado_presion'],
  };

  it('admite los nodos del catálogo y rechaza los demás y el ancla', () => {
    expect(ConfigExploracion3dSchema.safeParse(base).success).toBe(true);
    expect(
      ConfigExploracion3dSchema.safeParse({
        ...base,
        nodos: [
          ...base.nodos,
          { id: 'epifisis', etiqueta: 'Epífisis', descripcion: 'No es de este modelo.' },
        ],
      }).success,
    ).toBe(false);
    expect(
      ConfigExploracion3dSchema.safeParse({
        ...base,
        nodos: [{ ...base.nodos[0]!, ancla: { x: 0.5, y: 0.5, z: 0.5 } }, base.nodos[1]!],
      }).success,
    ).toBe(false);
  });
});
