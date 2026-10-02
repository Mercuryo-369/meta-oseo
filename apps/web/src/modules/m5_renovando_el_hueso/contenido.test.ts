// Prueba permanente del contenido del módulo 5 ("Renovando el hueso"): valida SOLO este módulo
// contra el esquema real, comprueba que el content.json cubre su guion
// (docs/guion-por-modulo/m5_renovando_el_hueso.md) y que no queda nada estructural o pendiente
// en los textos que ve el estudiante. Los dibujos SVG tienen su propia prueba (ilustraciones.test.ts).
import { describe, expect, it } from 'vitest';
import guionCrudo from '../../../../../docs/guion-por-modulo/m5_renovando_el_hueso.md?raw';
import { auditarContenidoModulo, advertenciasDeModulo } from '@/content/auditoria';
import { contarActividadesPorTipo, listarActividades, recorrerCadenas } from '@/content/consultas';
import { PUNTAJE_MODULO_MAX, PUNTAJE_MODULO_MIN } from '@/content/constantes';
import { HITOS_BMU } from '@/scenes/procedural/bmu/estado';
import { HITOS_FRACTURA } from '@/scenes/procedural/fractura/estado';
import { HITOS_ORTODONCIA } from '@/scenes/procedural/ortodoncia/estado';
import { puntajeMaximoModulo } from '@/content/scoring';
import { ETIQUETA_VARIANTE_CALLOUT } from '@/content/schema';
import type { ModuloContenido } from '@/content/schema';
import type { DependenciasAuditoria } from '@/content/svg';
import contenidoCrudo from './content.json';
import contenidoTexto from './content.json?raw';

/* -------------------------------------------------------------------------------------------
 * Recursos públicos (para la auditoría de SVG) y el módulo validado
 * ----------------------------------------------------------------------------------------- */

const svgsPublicos = import.meta.glob('/public/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const archivosPublicos = new Set(Object.keys(import.meta.glob('/public/**/*')));
const dependencias: DependenciasAuditoria = {
  leerSvg: (ruta) => svgsPublicos[`/public${ruta}`],
  existe: (ruta) => archivosPublicos.has(`/public${ruta}`),
};

const CARPETA = 'm5_renovando_el_hueso';
const auditoria = auditarContenidoModulo(CARPETA, contenidoCrudo, dependencias);
const modulo = auditoria.modulo as ModuloContenido;

/* -------------------------------------------------------------------------------------------
 * El guion: secciones, actividades y sus cifras (se parsea el propio Markdown)
 * ----------------------------------------------------------------------------------------- */

const guion = guionCrudo.replace(/\r\n/g, '\n');

interface SeccionGuion {
  numero: string;
  titulo: string;
  id: string;
}
interface ActividadGuion {
  id: string;
  seccion: string;
  tipo: string;
  obligatoria: boolean;
  puntaje: number;
  /** SVG que cita el guion (`svg: m5_...`). */
  svg: string | undefined;
  /** Cantidad de elementos de cada lista de primer nivel del yaml (capas, pares, pasos...). */
  listas: Record<string, number>;
  /** Ids de los elementos de la lista `preguntas` (solo en los quiz). */
  preguntas: string[];
}

/** Elementos `  - ` de una lista de primer nivel del yaml. */
function elementosDeLista(yaml: string, clave: string): string[] {
  const lineas = yaml.split('\n');
  const inicio = lineas.findIndex((l) => l.startsWith(`${clave}:`));
  if (inicio < 0) return [];
  // Lista en línea: `requeridas: [a, b, c]`.
  const enLinea = /^[a-z_]+: \[(.*)\]\s*$/.exec(lineas[inicio] ?? '');
  if (enLinea) return enLinea[1]!.split(',').map((x) => x.trim());
  const items: string[] = [];
  for (let i = inicio + 1; i < lineas.length; i++) {
    const l = lineas[i] ?? '';
    if (/^[a-z_]+:/.test(l)) break;
    if (/^ {2}- /.test(l)) items.push(l);
  }
  return items;
}

function leerGuion(): { secciones: SeccionGuion[]; actividades: ActividadGuion[] } {
  const secciones: SeccionGuion[] = [];
  const actividades: ActividadGuion[] = [];
  const RE = /^### Seccion (\d\.\d): (.+) \(id "([a-z0-9_]+)"\)$/gm;
  const inicios = [...guion.matchAll(RE)];
  inicios.forEach((m, i) => {
    const fin = inicios[i + 1]?.index ?? guion.indexOf('\n## Glosario');
    const cuerpo = guion.slice(m.index, fin);
    secciones.push({ numero: m[1]!, titulo: m[2]!.trim(), id: m[3]! });
    const REA = /^##### Actividad ([a-z0-9_]+)\n\n```yaml\n([\s\S]*?)\n```/gm;
    for (const a of cuerpo.matchAll(REA)) {
      const yaml = a[2]!;
      const listas: Record<string, number> = {};
      for (const clave of [
        'capas',
        'requeridas',
        'izquierda',
        'derecha',
        'pares',
        'distractores',
        'moleculas',
        'receptores',
        'pasos',
        'hotspots',
        'requeridos',
        'preguntas',
      ]) {
        listas[clave] = elementosDeLista(yaml, clave).length;
      }
      actividades.push({
        id: a[1]!,
        seccion: m[3]!,
        tipo: /^tipo: (.+)$/m.exec(yaml)![1]!.trim(),
        obligatoria: /^obligatoria: true$/m.test(yaml),
        puntaje: Number(/^puntaje_max: (\d+)$/m.exec(yaml)![1]),
        svg: /^svg: (m5_[a-z0-9_]+)$/m.exec(yaml)?.[1],
        listas,
        preguntas: elementosDeLista(yaml, 'preguntas').map(
          (l) => /- id: ([a-z0-9_]+)/.exec(l)![1]!,
        ),
      });
    }
  });
  return { secciones, actividades };
}

const { secciones: seccionesGuion, actividades: actividadesGuion } = leerGuion();

/**
 * Exploraciones 3D procedurales con línea de tiempo añadidas fuera del guion (el prototipo de la BMU, docs/escena-3d-bmu.md, y las de ortodoncia y fractura).
 * Son opcionales y no cuentan en las cifras de la ficha, salvo en el total de puntos del módulo.
 * Para añadir otra escena basta con una fila más: las pruebas de abajo se derivan de esta lista.
 */
const EXTRAS_3D = [
  {
    id: 'm5_bmu_3d_tiempo',
    seccion: 'm5_1_bmu_ciclo',
    escena: 'bmu_remodelado',
    hitos: HITOS_BMU,
    puntaje: 40,
  },
  {
    id: 'm5_5_ortodoncia_3d',
    seccion: 'm5_5_alveolar_ortodoncia',
    escena: 'movimiento_ortodontico',
    hitos: HITOS_ORTODONCIA,
    puntaje: 30,
  },
  {
    id: 'm5_6_fractura_3d',
    seccion: 'm5_6_reparacion_fractura_alveolo',
    escena: 'reparacion_fractura',
    hitos: HITOS_FRACTURA,
    puntaje: 30,
  },
] as const;
const ID_EXTRAS_3D = new Set<string>(EXTRAS_3D.map((e) => e.id));
/** Puntos que las exploraciones extra suman al total del módulo. */
const PUNTAJE_EXTRAS_3D = EXTRAS_3D.reduce((s, e) => s + e.puntaje, 0);

/** Cifras de la ficha del guion (verificadas a mano al escribir esta prueba). */
const FICHA = {
  secciones: 8,
  actividades: 26,
  obligatorias: 20,
  total: 790,
  obligatorio: 700,
  preguntas: 39,
};

const TOPE_PESO_BYTES = 260 * 1024;

/** Texto que ve el estudiante: todo el módulo salvo `estado_revision` (que es interno). */
function textosVisibles(): { ruta: string; texto: string }[] {
  const salida: { ruta: string; texto: string }[] = [];
  const { estado_revision: _interno, ...visible } = modulo;
  void _interno;
  recorrerCadenas(visible, [], (texto, ruta) => {
    salida.push({ ruta: ruta.join('.'), texto });
  });
  return salida;
}

/* -------------------------------------------------------------------------------------------
 * Esquema y recursos
 * ----------------------------------------------------------------------------------------- */

describe('módulo 5: esquema, carpeta y recursos', () => {
  it('pasa el esquema real y la auditoría del proyecto sin problemas', () => {
    expect(auditoria.problemas, `\n - ${auditoria.problemas.join('\n - ')}\n`).toEqual([]);
    expect(modulo.numero).toBe(5);
    expect(modulo.slug).toBe('renovando_el_hueso');
  });

  it('sigue en borrador hasta que el docente lo apruebe', () => {
    expect(modulo.estado_revision.estado).toBe('borrador');
  });

  it('el peso de content.json es razonable (tope ' + TOPE_PESO_BYTES / 1024 + ' KB)', () => {
    expect(new TextEncoder().encode(contenidoTexto).length).toBeLessThan(TOPE_PESO_BYTES);
  });

  it('solo advierte de tres términos del glosario que únicamente aparecen en dibujos o actividades', () => {
    const sinEnlace = advertenciasDeModulo(modulo)
      .filter((a) => a.includes('no está enlazado'))
      .map((a) => /"([^"]+)"/.exec(a)![1]);
    // Cono de corte y de cierre, osteona y hemiosteona solo se nombran en las capas y los pasos de
    // las actividades y en las tablas, donde el esquema no admite enlaces.
    expect(sinEnlace.sort()).toEqual([
      'cono_de_corte_y_cono_de_cierre',
      'hemiosteona_paquete_oseo_estructural',
      'osteona_sistema_de_havers',
    ]);
  });
});

/* -------------------------------------------------------------------------------------------
 * Cobertura respecto al guion
 * ----------------------------------------------------------------------------------------- */

describe('módulo 5: cobertura del guion', () => {
  /** Todas las actividades del módulo, con las exploraciones 3D añadidas fuera del guion. */
  const todas = listarActividades(modulo);
  /** Las del guion: sin las exploraciones 3D extra. */
  const ubicadas = todas.filter((u) => !ID_EXTRAS_3D.has(u.actividad.id));

  it('el guion se parseó como se espera (8 secciones y 26 actividades)', () => {
    expect(seccionesGuion).toHaveLength(FICHA.secciones);
    expect(actividadesGuion).toHaveLength(FICHA.actividades);
    expect(actividadesGuion.filter((a) => a.obligatoria)).toHaveLength(FICHA.obligatorias);
  });

  it('tiene las secciones del guion, en orden, con su id y su título', () => {
    expect(modulo.secciones.map((s) => s.id)).toEqual(seccionesGuion.map((s) => s.id));
    expect(modulo.secciones.map((s) => s.titulo)).toEqual(seccionesGuion.map((s) => s.titulo));
    expect(modulo.secciones.map((s) => s.id)).toEqual([
      'm5_1_bmu_ciclo',
      'm5_2_eje_rankl_opg',
      'm5_3_acoplamiento_esclerostina',
      'm5_4_hormonas_remodelado',
      'm5_5_alveolar_ortodoncia',
      'm5_6_reparacion_fractura_alveolo',
      'm5_7_equilibrio_alteraciones',
      'm5_8_evaluacion_final',
    ]);
  });

  it('cada actividad del guion está en su sección y en el mismo orden, con su tipo', () => {
    expect(ubicadas.map((u) => u.actividad.id)).toEqual(actividadesGuion.map((a) => a.id));
    for (const g of actividadesGuion) {
      const u = ubicadas.find((x) => x.actividad.id === g.id)!;
      expect(u.seccion.id, g.id).toBe(g.seccion);
      expect(u.actividad.tipo, g.id).toBe(g.tipo);
    }
  });

  it('cada actividad conserva su obligatoriedad y su puntaje', () => {
    for (const g of actividadesGuion) {
      const a = ubicadas.find((x) => x.actividad.id === g.id)!.actividad;
      expect(a.obligatoria, `${g.id} obligatoria`).toBe(g.obligatoria);
      expect(a.puntaje_max, `${g.id} puntaje`).toBe(g.puntaje);
    }
  });

  it('el puntaje total y el obligatorio coinciden con la ficha y respetan el tope del esquema', () => {
    expect(puntajeMaximoModulo(modulo)).toBe(FICHA.total + PUNTAJE_EXTRAS_3D);
    expect(puntajeMaximoModulo(modulo, { soloObligatorias: true })).toBe(FICHA.obligatorio);
    expect(actividadesGuion.reduce((s, a) => s + a.puntaje, 0)).toBe(FICHA.total);
    expect(actividadesGuion.filter((a) => a.obligatoria).reduce((s, a) => s + a.puntaje, 0)).toBe(
      FICHA.obligatorio,
    );
    expect(puntajeMaximoModulo(modulo)).toBeLessThanOrEqual(PUNTAJE_MODULO_MAX);
    expect(puntajeMaximoModulo(modulo)).toBeGreaterThanOrEqual(PUNTAJE_MODULO_MIN);
  });

  it('cuenta 26 actividades del guion (7 multicapa, 10 quiz, 3 relaciones, 3 videos, 2 arrastres y 1 exploración 3D) más las 3D extra', () => {
    expect(contarActividadesPorTipo(modulo)).toEqual({
      multicapa: 7,
      quiz: 10,
      'relacion-columnas': 3,
      'video-texto': 3,
      'arrastre-molecular': 2,
      'exploracion-3d': 1 + EXTRAS_3D.length,
    });
  });

  it.each(EXTRAS_3D)(
    'la exploración 3D $id es opcional, procedural y usa los hitos de su escena',
    ({ id, seccion, escena, hitos, puntaje }) => {
      const u = todas.find((x) => x.actividad.id === id)!;
      expect(u, id).toBeDefined();
      expect(u.seccion.id).toBe(seccion);
      const a = u.actividad;
      if (a.tipo !== 'exploracion-3d') throw new Error('tipo inesperado');
      expect(a.obligatoria).toBe(false);
      expect(a.puntaje_max).toBe(puntaje);
      expect(a.config.modelo).toBe('procedural');
      expect(a.config.escena).toBe(escena);
      const pasos = a.config.linea_de_tiempo!.pasos;
      // Los `t` del contenido son los hitos canónicos de la escena, en el orden de las fases.
      expect(pasos.map((p) => p.t)).toEqual(Object.values(hitos));
      expect(a.config.requeridos).toEqual(pasos.map((p) => p.id));
    },
  );

  it('los quiz conservan los ids de sus preguntas y suman 39 (14 en la evaluación final)', () => {
    let total = 0;
    for (const g of actividadesGuion.filter((a) => a.tipo === 'quiz')) {
      const a = ubicadas.find((x) => x.actividad.id === g.id)!.actividad;
      if (a.tipo !== 'quiz') throw new Error('tipo inesperado');
      expect(
        a.config.preguntas.map((p) => p.id),
        g.id,
      ).toEqual(g.preguntas);
      total += a.config.preguntas.length;
    }
    const final = ubicadas.find((u) => u.actividad.id === 'm5_evaluacion_final')!.actividad;
    expect(final.tipo === 'quiz' && final.config.preguntas.length).toBe(14);
    expect(total).toBe(FICHA.preguntas);
    expect(total).toBe(actividadesGuion.reduce((s, a) => s + a.preguntas.length, 0));
  });

  it('las demás actividades conservan sus capas, pares, pasos, moléculas y nodos', () => {
    for (const g of actividadesGuion) {
      const a = ubicadas.find((x) => x.actividad.id === g.id)!.actividad;
      const l = g.listas;
      if (a.tipo === 'multicapa') {
        expect(a.config.capas.length, `${g.id} capas`).toBe(l.capas);
        expect(a.config.requeridas.length, `${g.id} requeridas`).toBe(l.requeridas);
      } else if (a.tipo === 'relacion-columnas') {
        expect(a.config.columna_a.elementos.length, `${g.id} izquierda`).toBe(l.izquierda);
        expect(a.config.columna_b.elementos.length, `${g.id} derecha`).toBe(l.derecha);
        expect(a.config.pares.length, `${g.id} pares`).toBe(l.pares);
      } else if (a.tipo === 'video-texto') {
        if (a.config.medio !== 'animacion') throw new Error('se esperaba una animación');
        expect(a.config.pasos.length, `${g.id} pasos`).toBe(l.pasos);
      } else if (a.tipo === 'arrastre-molecular') {
        // Las moléculas de tipo distractor del guion pasan a `moleculas` con su `rechazo`.
        expect(a.config.moleculas.length, `${g.id} moleculas`).toBe(
          (l.moleculas ?? 0) + (l.distractores ?? 0),
        );
        expect(a.config.receptores.length, `${g.id} receptores`).toBe(l.receptores);
        expect(a.config.pares.length, `${g.id} pares`).toBe(l.pares);
        expect(a.config.distractores?.length ?? 0, `${g.id} distractores`).toBe(l.distractores);
      } else if (a.tipo === 'exploracion-3d') {
        expect(a.config.nodos.length, `${g.id} hotspots`).toBe(l.hotspots);
        expect(a.config.requeridos.length, `${g.id} requeridos`).toBe(l.requeridos);
      }
    }
  });

  it('en la mandíbula, los puntos opcionales apretados llevan su propia vista de cámara con zoom', () => {
    const a = ubicadas.find((x) => x.actividad.id === 'm5_explora_mandibula_ortodoncia')!.actividad;
    if (a.tipo !== 'exploracion-3d') throw new Error('se esperaba una exploración 3D');
    // Nueve puntos de los cuales siete son requeridos: el septo y el agujero mentoniano son opcionales.
    expect(a.config.nodos).toHaveLength(9);
    expect(a.config.requeridos).toHaveLength(7);
    const opcionales = a.config.nodos.filter((n) => !a.config.requeridos.includes(n.id));
    expect(opcionales.map((n) => n.id).sort()).toEqual(['agujero_mentoniano', 'septo_interdental']);
    // Sin zoom propio los nueve números se rozan en la vista de conjunto: al enfocarlos se separan.
    for (const n of opcionales) {
      expect(n.camara, n.id).toBeDefined();
      expect(n.camara!.zoom, n.id).toBeGreaterThanOrEqual(2);
    }
    // Los requeridos son los de los guiones: ninguno queda fuera por el ajuste de cámara.
    expect(a.puntaje_max).toBe(30);
  });

  it('cada actividad con dibujo usa el SVG que cita el guion', () => {
    let comprobadas = 0;
    for (const g of actividadesGuion.filter((x) => x.svg)) {
      const a = ubicadas.find((x) => x.actividad.id === g.id)!.actividad;
      const ruta = `/images/m5/${g.svg}.svg`;
      let usada: string | undefined;
      if (a.tipo === 'multicapa' || a.tipo === 'video-texto') {
        usada = 'svg' in a.config ? (a.config as { svg: string }).svg : undefined;
      } else if (a.tipo === 'arrastre-molecular') {
        usada = a.config.escena.fondo_svg;
      }
      expect(usada, g.id).toBe(ruta);
      expect(archivosPublicos.has(`/public${ruta}`), ruta).toBe(true);
      comprobadas++;
    }
    expect(comprobadas).toBe(actividadesGuion.filter((x) => x.svg).length);
    expect(comprobadas).toBe(12);
  });

  it('los receptores del arrastre están sobre los sitios dibujados en su SVG', () => {
    // Centros aproximados (viewBox 800x600) de los receptores y de las células que dibujan los SVG,
    // y la separación mínima de 52 px que exige el esquema en un teléfono de 320 px de ancho.
    const sitios: Record<string, Record<string, [number, number]>> = {
      m5_arrastre_rankl_opg: {
        rec_c_fms: [236, 329],
        rec_rank: [314, 330],
        rec_rankl_membrana: [320, 200],
      },
      m5_arrastre_acoplamiento: {
        rec_receptor_tgf_beta: [227, 300],
        rec_receptor_igf1: [436, 330],
        rec_lrp5_6: [650, 270],
      },
    };
    for (const [id, receptores] of Object.entries(sitios)) {
      const a = ubicadas.find((u) => u.actividad.id === id)!.actividad;
      if (a.tipo !== 'arrastre-molecular') throw new Error('tipo inesperado');
      expect(a.config.receptores.length, id).toBe(Object.keys(receptores).length);
      for (const r of a.config.receptores) {
        const [x, y] = receptores[r.id]!;
        // Tolerancia de 12 puntos porcentuales: separa los receptores sin alejarlos de su sitio.
        expect(Math.abs(r.posicion.x - (x / 800) * 100), `${r.id} x`).toBeLessThanOrEqual(12);
        expect(Math.abs(r.posicion.y - (y / 600) * 100), `${r.id} y`).toBeLessThanOrEqual(12);
      }
    }
  });

  it('cada paso de las animaciones conserva la capa de fondo (`visibles` oculta todo lo demás)', () => {
    const fondos: Record<string, string[]> = {
      m5_bmu_video: ['hueso_cortical_previo'],
      m5_osteoclastogenesis_video: ['superficie_osea'],
      m5_reparacion_fractura_video: ['fondo_escena', 'hueso_fracturado_base'],
    };
    for (const [id, capas] of Object.entries(fondos)) {
      const a = ubicadas.find((u) => u.actividad.id === id)!.actividad;
      if (a.tipo !== 'video-texto' || a.config.medio !== 'animacion') throw new Error(id);
      for (const paso of a.config.pasos) {
        for (const capa of capas) expect(paso.visibles, `${paso.id} ${capa}`).toContain(capa);
      }
    }
  });

  it('cada sección tiene al menos una actividad obligatoria', () => {
    for (const s of modulo.secciones) {
      const obligatorias = s.bloques.filter(
        (b) => b.tipo === 'actividad' && b.actividad.obligatoria,
      );
      expect(obligatorias.length, s.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('las actividades van al final de su sección (después de todo el texto)', () => {
    for (const s of modulo.secciones) {
      const tipos = s.bloques.map((b) => b.tipo);
      const primera = tipos.indexOf('actividad');
      expect(
        tipos.slice(primera).every((t) => t === 'actividad'),
        s.id,
      ).toBe(true);
    }
  });

  it('el logro y la regla de aprobación de la evaluación final salen de la ficha del guion', () => {
    expect(guion).toContain('Remodelador (id `remodelador`)');
    const final = ubicadas.find((u) => u.actividad.id === 'm5_evaluacion_final')!.actividad;
    expect(final.obligatoria).toBe(true);
    expect(final.puntaje_max).toBe(100);
    expect(final.aprobacion_min).toBe(0.7);
  });
});

/* -------------------------------------------------------------------------------------------
 * Lo que ve el estudiante
 * ----------------------------------------------------------------------------------------- */

describe('módulo 5: textos visibles', () => {
  it('no queda ninguna marca [verificar] (las cifras dudosas van en estado_revision)', () => {
    const conMarca = textosVisibles().filter((t) => /\[verificar\]/i.test(t.texto));
    expect(conMarca).toEqual([]);
    expect(modulo.estado_revision.pendientes.length).toBeGreaterThan(0);
    for (const p of modulo.estado_revision.pendientes) {
      expect(p.nota.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('no queda ningún comentario ni encabezado estructural del guion', () => {
    const mal: string[] = [];
    for (const { ruta, texto } of textosVisibles()) {
      if (/<!--|-->/.test(texto)) mal.push(`${ruta}: comentario HTML`);
      if (/^\s{0,3}#{1,6}\s/m.test(texto) && !/^\s{0,3}#{3,4}\s/m.test(texto))
        mal.push(`${ruta}: encabezado Markdown de nivel no permitido`);
      if (/^\[Figura:/m.test(texto)) mal.push(`${ruta}: línea de figura sin convertir`);
      if (/^\s*(Seccion|Actividad) \S+:/m.test(texto)) mal.push(`${ruta}: encabezado del guion`);
      if (/^>\s?(Cl[ií]nico|Dato|Atenci[oó]n|Recuerda):/im.test(texto))
        mal.push(`${ruta}: aviso sin convertir`);
      if (/^```/m.test(texto)) mal.push(`${ruta}: bloque de código`);
    }
    expect(mal).toEqual([]);
  });

  it('no se cuelan ids de ilustración ni de capa en los textos legibles (alt, títulos, descripciones)', () => {
    const mal = textosVisibles().filter(
      (t) =>
        /(^|\.)(alt|titulo|descripcion|instrucciones|texto|markdown|etiqueta|pista|explicacion)$/.test(
          t.ruta,
        ) &&
        /\bm5_[a-z0-9_]+\b|\b[a-z]{3,}_[a-z]{3,}(_[a-z]+)*\b/.test(
          t.texto.replace(/\]\(glosario:[a-z0-9_]+\)/g, ']'),
        ),
    );
    expect(mal.map((t) => `${t.ruta}: ${t.texto.slice(0, 80)}`)).toEqual([]);
  });

  it('no hay URLs externas en los textos ni en las referencias', () => {
    const conUrl = textosVisibles().filter((t) => /https?:\/\/|www\./i.test(t.texto));
    expect(conUrl).toEqual([]);
    for (const r of modulo.referencias) {
      expect('url' in r && r.url, r.id).toBeFalsy();
    }
  });

  it('las referencias no están verificadas (lo confirma el docente)', () => {
    expect(modulo.referencias.length).toBeGreaterThan(0);
    for (const r of modulo.referencias) expect(r.verificada, r.id).toBe(false);
  });

  it('todas las imágenes y actividades con dibujo traen texto alternativo', () => {
    const imagenes = modulo.secciones
      .flatMap((s) => s.bloques)
      .flatMap((b) => (b.tipo === 'imagen' ? [b] : []));
    for (const i of imagenes) expect(i.alt.trim().length, i.id).toBeGreaterThanOrEqual(10);
    const conAlt = listarActividades(modulo).filter(({ actividad }) =>
      ['multicapa', 'video-texto', 'exploracion-3d'].includes(actividad.tipo),
    );
    // Once del guion más las exploraciones 3D extra (que también llevan `alt`).
    expect(conAlt.length).toBe(11 + EXTRAS_3D.length);
    for (const { actividad } of conAlt) {
      const alt = (actividad.config as { alt?: string }).alt;
      expect(alt?.trim().length ?? 0, actividad.id).toBeGreaterThanOrEqual(10);
    }
    for (const { actividad } of listarActividades(modulo)) {
      if (actividad.tipo !== 'arrastre-molecular') continue;
      expect(actividad.config.escena.alt.trim().length, actividad.id).toBeGreaterThanOrEqual(10);
    }
  });

  it('los avisos usan las variantes del esquema y su etiqueta lleva la tilde correcta', () => {
    expect(ETIQUETA_VARIANTE_CALLOUT).toEqual({
      clinico: 'Caso clínico',
      dato: 'Dato clave',
      atencion: 'Atención',
      recuerda: 'Recuerda',
    });
    const avisos = modulo.secciones
      .flatMap((s) => s.bloques)
      .flatMap((b) => (b.tipo === 'callout' ? [b] : []));
    expect(avisos.length).toBeGreaterThan(0);
    for (const a of avisos) {
      expect(Object.keys(ETIQUETA_VARIANTE_CALLOUT), a.id).toContain(a.variante);
      // La etiqueta la pone el componente; en el texto no debe repetirse sin tilde.
      expect(a.titulo ?? '', a.id).not.toMatch(/\b(Atencion|Clinico)\b/);
      expect(a.markdown, a.id).not.toMatch(/^\s*(Atencion|Clinico|Dato|Recuerda):/i);
    }
  });

  it('los títulos de las columnas de cada relación son propios, no los genéricos del convertidor', () => {
    for (const { actividad } of listarActividades(modulo)) {
      if (actividad.tipo !== 'relacion-columnas') continue;
      expect(actividad.config.columna_a.titulo, actividad.id).not.toBe('Concepto');
      expect(actividad.config.columna_b.titulo, actividad.id).not.toBe('Descripción');
    }
  });
});

/* -------------------------------------------------------------------------------------------
 * Glosario
 * ----------------------------------------------------------------------------------------- */

describe('módulo 5: glosario', () => {
  const visible = textosVisibles()
    .filter((t) => !t.ruta.startsWith('glosario'))
    .map((t) => t.texto)
    .join('\n')
    .toLowerCase();

  /** Otras formas en que el texto nombra un término cuyo encabezado es una frase compuesta. */
  const ALIAS: Record<string, string[]> = {
    cono_de_corte_y_cono_de_cierre: ['cono de corte', 'cono de cierre'],
    hueso_laminar_y_hueso_reticular: ['hueso laminar', 'hueso reticular'],
    paget_enfermedad_de: ['enfermedad de paget'],
    rank_y_rankl: ['rankl'],
    resorcion_reabsorcion_osea: ['resorción'],
    via_wnt_catenina: ['vía wnt'],
    tgf_1_e_igf_1: ['tgf-β1', 'igf-1'],
    osteona_sistema_de_havers: ['osteona'],
    hemiosteona_paquete_oseo_estructural: ['hemiosteona'],
  };

  it('cada término del glosario existe en el texto del módulo', () => {
    const ausentes: string[] = [];
    for (const t of modulo.glosario) {
      const partes = [
        t.termino,
        t.termino.replace(/\s*\(.*\)\s*$/, ''),
        /\((.+)\)\s*$/.exec(t.termino)?.[1],
        ...(ALIAS[t.id] ?? []),
      ];
      const alguno = partes.some((p) => p && visible.includes(p.toLowerCase()));
      if (!alguno) ausentes.push(t.id);
    }
    expect(ausentes).toEqual([]);
  });

  it('los enlaces [término](glosario:id) apuntan a términos que existen y cubren casi todo el glosario', () => {
    const ids = new Set(modulo.glosario.map((t) => t.id));
    const usados = new Set<string>();
    for (const { texto } of textosVisibles()) {
      for (const m of texto.matchAll(/\]\(glosario:([a-z0-9_]+)\)/g)) usados.add(m[1]!);
    }
    for (const id of usados) expect(ids.has(id), id).toBe(true);
    expect(usados.size).toBe(modulo.glosario.length - 3);
  });

  it('los términos no se repiten y llevan definición', () => {
    expect(new Set(modulo.glosario.map((t) => t.id)).size).toBe(modulo.glosario.length);
    expect(modulo.glosario).toHaveLength(42);
    for (const t of modulo.glosario) expect(t.definicion.length, t.id).toBeGreaterThan(15);
  });
});
