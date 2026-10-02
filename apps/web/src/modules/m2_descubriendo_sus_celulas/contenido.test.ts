// Prueba permanente del contenido del módulo 2 ("Descubriendo sus células"): valida SOLO este módulo
// contra el esquema real, comprueba que el content.json cubre su guion
// (docs/guion-por-modulo/m2_descubriendo_sus_celulas.md) y que no queda nada estructural o pendiente
// en los textos que ve el estudiante. Los dibujos SVG tienen su propia prueba (ilustraciones.test.ts).
import { describe, expect, it } from 'vitest';
import guionCrudo from '../../../../../docs/guion-por-modulo/m2_descubriendo_sus_celulas.md?raw';
import { auditarContenidoModulo, advertenciasDeModulo } from '@/content/auditoria';
import { contarActividadesPorTipo, listarActividades, recorrerCadenas } from '@/content/consultas';
import { PUNTAJE_MODULO_MAX, PUNTAJE_MODULO_MIN } from '@/content/constantes';
import { puntajeMaximoModulo } from '@/content/scoring';
import { HITOS_ALVEOLAR } from '@/scenes/procedural/alveolar/estado';
import { HITOS_MANDIBULA_FETAL } from '@/scenes/procedural/mandibula_fetal/estado';
import { HITOS_OSTEOBLASTO } from '@/scenes/procedural/osteoblasto/estado';
import { HITOS_OSTEOCITO } from '@/scenes/procedural/osteocito/estado';
import { HITOS_OSTEOCLASTO } from '@/scenes/procedural/osteoclasto/estado';
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

const CARPETA = 'm2_descubriendo_sus_celulas';
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
  /** Cantidad de elementos de cada lista del yaml (capas, pares, pasos...). */
  listas: Record<string, number>;
  /** Ids de los elementos de la lista `preguntas` (solo en los quiz). */
  preguntas: string[];
}

/** Elementos `  - ` de una lista de primer nivel del yaml. */
function elementosDeLista(yaml: string, clave: string): string[] {
  const lineas = yaml.split('\n');
  const inicio = lineas.findIndex((l) => l.startsWith(`${clave}:`));
  if (inicio < 0) return [];
  const items: string[] = [];
  for (let i = inicio + 1; i < lineas.length; i++) {
    const l = lineas[i] ?? '';
    if (/^[a-z_]+:/.test(l)) break;
    if (/^ {2}- /.test(l)) items.push(l);
  }
  return items;
}

/** Cantidad de elementos de una lista en línea del yaml: `requeridas: [a, b, c]`. */
function elementosEnLinea(yaml: string, clave: string): number {
  const m = new RegExp(`^${clave}: \\[(.*)\\]$`, 'm').exec(yaml);
  return m ? m[1]!.split(',').filter((x) => x.trim() !== '').length : 0;
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
        'izquierda',
        'derecha',
        'pares',
        'distractores',
        'moleculas',
        'receptores',
        'pasos',
        'hotspots',
        'preguntas',
      ]) {
        listas[clave] = elementosDeLista(yaml, clave).length;
      }
      // `requeridas` (capas o hotspots) va en línea: [a, b, c].
      listas.requeridas = elementosEnLinea(yaml, 'requeridas');
      actividades.push({
        id: a[1]!,
        seccion: m[3]!,
        tipo: /^tipo: (.+)$/m.exec(yaml)![1]!.trim(),
        obligatoria: /^obligatoria: true$/m.test(yaml),
        puntaje: Number(/^puntaje_max: (\d+)$/m.exec(yaml)![1]),
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
 * Exploraciones 3D procedurales con línea de tiempo añadidas fuera del guion (una por célula y una por la mandíbula).
 * Son opcionales y no cuentan en las cifras de la ficha, salvo en el total de puntos del módulo.
 * Para añadir otra escena basta con una fila más: las pruebas de abajo se derivan de esta lista.
 */
const EXTRAS_3D = [
  {
    id: 'm2_1_mandibula_fetal_3d',
    seccion: 'm2_1_origen_craneofacial',
    escena: 'mandibula_fetal',
    hitos: HITOS_MANDIBULA_FETAL,
    puntaje: 30,
  },
  {
    id: 'm2_2_osteoblasto_3d',
    seccion: 'm2_2_linea_osteoblastica',
    escena: 'osteoblasto_celula',
    hitos: HITOS_OSTEOBLASTO,
    puntaje: 30,
  },
  {
    id: 'm2_3_osteocito_3d',
    seccion: 'm2_3_osteocito',
    escena: 'osteocito_red',
    hitos: HITOS_OSTEOCITO,
    puntaje: 30,
  },
  {
    id: 'm2_4_osteoclasto_3d',
    seccion: 'm2_4_osteoclasto',
    escena: 'osteoclasto_resorcion',
    hitos: HITOS_OSTEOCLASTO,
    puntaje: 30,
  },
  {
    id: 'm2_5_alveolar_3d',
    seccion: 'm2_5_ligamento_periodontal',
    escena: 'hueso_alveolar',
    hitos: HITOS_ALVEOLAR,
    puntaje: 30,
  },
] as const;
const ID_EXTRAS_3D = new Set<string>(EXTRAS_3D.map((e) => e.id));
/** Puntos que las exploraciones extra suman al total del módulo. */
const PUNTAJE_EXTRAS_3D = EXTRAS_3D.reduce((s, e) => s + e.puntaje, 0);

/** Cifras de la ficha del guion (verificadas a mano al escribir esta prueba). */
const FICHA = {
  secciones: 5,
  actividades: 13,
  obligatorias: 11,
  preguntas: 23,
  total: 380,
  obligatorio: 340,
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

describe('módulo 2: esquema, carpeta y recursos', () => {
  it('pasa el esquema real y la auditoría del proyecto sin problemas', () => {
    expect(auditoria.problemas, `\n - ${auditoria.problemas.join('\n - ')}\n`).toEqual([]);
    expect(modulo.numero).toBe(2);
    expect(modulo.slug).toBe('descubriendo_sus_celulas');
  });

  it('sigue en borrador hasta que el docente lo apruebe', () => {
    expect(modulo.estado_revision.estado).toBe('borrador');
  });

  it('el peso de content.json es razonable (tope ' + TOPE_PESO_BYTES / 1024 + ' KB)', () => {
    expect(new TextEncoder().encode(contenidoTexto).length).toBeLessThan(TOPE_PESO_BYTES);
  });

  it('cada SVG que referencia una actividad existe en public/images/m2', () => {
    const rutas = new Set<string>();
    for (const { actividad } of listarActividades(modulo)) {
      const c = actividad.config as { svg?: string; escena?: { fondo_svg?: string } };
      if (c.svg) rutas.add(c.svg);
      if (c.escena?.fondo_svg) rutas.add(c.escena.fondo_svg);
    }
    for (const ruta of rutas) expect(archivosPublicos.has(`/public${ruta}`), ruta).toBe(true);
    // Seis dibujos: 2.1 (origen), 2.2 (árbol de linajes, también en 2.4), osteoblasto, osteocito,
    // osteoclasto y ligamento periodontal.
    expect([...rutas].sort()).toEqual([
      '/images/m2/m2_arbol_linajes_oseos.svg',
      '/images/m2/m2_ligamento_periodontal.svg',
      '/images/m2/m2_origen_mandibula.svg',
      '/images/m2/m2_osteoblasto_activo.svg',
      '/images/m2/m2_osteocito_lagunar.svg',
      '/images/m2/m2_osteoclasto_resorcion.svg',
    ]);
  });
});

/* -------------------------------------------------------------------------------------------
 * Cobertura respecto al guion
 * ----------------------------------------------------------------------------------------- */

describe('módulo 2: cobertura del guion', () => {
  /** Todas las actividades del módulo, con las exploraciones 3D añadidas fuera del guion. */
  const todas = listarActividades(modulo);
  /** Las del guion: sin las exploraciones 3D extra. */
  const ubicadas = todas.filter((u) => !ID_EXTRAS_3D.has(u.actividad.id));

  it('el guion se parseó como se espera (5 secciones y 13 actividades)', () => {
    expect(seccionesGuion).toHaveLength(FICHA.secciones);
    expect(actividadesGuion).toHaveLength(FICHA.actividades);
    expect(actividadesGuion.filter((a) => a.obligatoria)).toHaveLength(FICHA.obligatorias);
    expect(guion).toContain(`- **Secciones:** ${FICHA.secciones}`);
    expect(guion).toContain(`- **Puntaje máximo:** ${FICHA.total} puntos`);
  });

  it('tiene las secciones del guion, en orden, con su id y su título', () => {
    expect(modulo.secciones.map((s) => s.id)).toEqual(seccionesGuion.map((s) => s.id));
    expect(modulo.secciones.map((s) => s.titulo)).toEqual(seccionesGuion.map((s) => s.titulo));
    expect(modulo.secciones.map((s) => s.id)).toEqual([
      'm2_1_origen_craneofacial',
      'm2_2_linea_osteoblastica',
      'm2_3_osteocito',
      'm2_4_osteoclasto',
      'm2_5_ligamento_periodontal',
    ]);
  });

  it('conserva los seis objetivos del guion', () => {
    const objetivos = [...guion.matchAll(/^\d\. (.+)$/gm)].map((m) => m[1]!).slice(0, 6);
    expect(modulo.objetivos).toHaveLength(6);
    expect(modulo.objetivos).toEqual(objetivos);
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
    expect(puntajeMaximoModulo(modulo)).toBeLessThanOrEqual(PUNTAJE_MODULO_MAX);
    expect(puntajeMaximoModulo(modulo)).toBeGreaterThanOrEqual(PUNTAJE_MODULO_MIN);
  });

  it('cuenta 13 actividades del guion (4 multicapa, 4 quiz, 1 relación, 2 videos, 1 arrastre y 1 exploración 3D) más las 3D extra', () => {
    expect(contarActividadesPorTipo(modulo)).toEqual({
      multicapa: 4,
      quiz: 4,
      'relacion-columnas': 1,
      'video-texto': 2,
      'arrastre-molecular': 1,
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

  it('los quiz conservan los ids de sus preguntas y suman 23 (10 en la evaluación final)', () => {
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
    const final = ubicadas.find((u) => u.actividad.id === 'm2_evaluacion_final')!.actividad;
    expect(final.tipo === 'quiz' && final.config.preguntas.length).toBe(10);
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
        // En este guion los distractores son moléculas de la lista `moleculas` con un motivo de rechazo.
        expect(a.config.moleculas.length, `${g.id} moleculas`).toBe(l.moleculas);
        expect(a.config.receptores.length, `${g.id} receptores`).toBe(l.receptores);
        expect(a.config.pares.length, `${g.id} pares`).toBe(l.pares);
        expect(a.config.distractores?.length ?? 0, `${g.id} distractores`).toBe(l.distractores);
      } else if (a.tipo === 'exploracion-3d') {
        expect(a.config.nodos.length, `${g.id} hotspots`).toBe(l.hotspots);
        expect(a.config.requeridos.length, `${g.id} requeridos`).toBe(l.requeridas);
      }
    }
  });

  it('los receptores del arrastre coinciden con las zonas de acople del SVG del árbol de linajes', () => {
    // Centros en el viewBox 1000 x 1540, tal como los dibujan los grupos zona_* de m2_arbol_linajes_oseos.svg.
    const zonas: Record<string, [string, number, number]> = {
      rec_etapa_mesenquimal: ['zona_etapa_mesenquimal', 255, 200],
      rec_etapa_preosteoblasto: ['zona_etapa_preosteoblasto', 255, 730],
      rec_cfms: ['zona_receptor_cfms', 663, 730],
      rec_rank: ['zona_receptor_rank', 670, 995],
      rec_ligando_osteoblasto: ['zona_ligando_osteoblasto', 352, 995],
    };
    const svg = svgsPublicos['/public/images/m2/m2_arbol_linajes_oseos.svg'] ?? '';
    const a = ubicadas.find((u) => u.actividad.id === 'm2_arrastre_senales_linajes')!.actividad;
    if (a.tipo !== 'arrastre-molecular') throw new Error('tipo inesperado');
    expect(a.config.receptores.map((r) => r.id).sort()).toEqual(Object.keys(zonas).sort());
    for (const r of a.config.receptores) {
      const [grupo, x, y] = zonas[r.id]!;
      expect(svg, grupo).toContain(`id="${grupo}"`);
      expect(svg, `${grupo} cx`).toContain(`cx="${x}" cy="${y}"`);
      expect(r.posicion.x, `${r.id} x`).toBeCloseTo((x / 1000) * 100, 0);
      expect(r.posicion.y, `${r.id} y`).toBeCloseTo((y / 1540) * 100, 0);
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

  it('cada sección respeta el tope de bloques del esquema', () => {
    // El esquema admite hasta 16 bloques por sección (docs/content-schema.md).
    for (const s of modulo.secciones) expect(s.bloques.length, s.id).toBeLessThanOrEqual(16);
  });
});

/* -------------------------------------------------------------------------------------------
 * Lo que ve el estudiante
 * ----------------------------------------------------------------------------------------- */

describe('módulo 2: textos visibles', () => {
  it('no queda ninguna marca [verificar] (las cifras dudosas van en estado_revision)', () => {
    const conMarca = textosVisibles().filter((t) => /\[verificar\]/i.test(t.texto));
    expect(conMarca).toEqual([]);
    expect(modulo.estado_revision.pendientes.length).toBeGreaterThan(0);
    for (const p of modulo.estado_revision.pendientes) {
      expect(p.nota.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('cada marca [verificar] del cuerpo del guion queda registrada como pendiente', () => {
    // La sección de notas para el docente cita la etiqueta sin usarla como marca: no se cuenta.
    const cuerpo = guion.slice(0, guion.indexOf('\n## Notas de verificacion'));
    const marcas = (cuerpo.match(/\[verificar\]/g) ?? []).length;
    expect(marcas).toBeGreaterThan(0);
    // Las marcas del guion que caen fuera del cuerpo del módulo (ficha, banco del mentor) no se
    // transcriben, por eso el conteo del JSON puede ser menor, nunca mayor.
    expect(modulo.estado_revision.pendientes.length).toBeLessThanOrEqual(marcas);
    expect(modulo.estado_revision.pendientes.length).toBeGreaterThanOrEqual(20);
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

  it('todas las ilustraciones de las actividades traen texto alternativo', () => {
    const conAlt = listarActividades(modulo).filter(({ actividad }) =>
      ['multicapa', 'video-texto', 'arrastre-molecular'].includes(actividad.tipo),
    );
    expect(conAlt.length).toBeGreaterThan(0);
    for (const { actividad } of conAlt) {
      const c = actividad.config as { alt?: string; escena?: { alt?: string } };
      const alt = c.alt ?? c.escena?.alt;
      expect(alt?.trim().length ?? 0, actividad.id).toBeGreaterThanOrEqual(10);
    }
    // Y las imágenes sueltas, si las hubiera.
    for (const b of modulo.secciones.flatMap((s) => s.bloques)) {
      if (b.tipo === 'imagen') expect(b.alt.trim().length, b.id).toBeGreaterThanOrEqual(10);
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
});

/* -------------------------------------------------------------------------------------------
 * Glosario
 * ----------------------------------------------------------------------------------------- */

describe('módulo 2: glosario', () => {
  const visible = textosVisibles()
    .filter((t) => !t.ruta.startsWith('glosario'))
    .map((t) => t.texto)
    .join('\n')
    .toLowerCase();

  it('cada término del glosario existe en el texto del módulo', () => {
    const ausentes: string[] = [];
    for (const t of modulo.glosario) {
      const partes = [
        t.termino,
        t.termino.replace(/\s*\(.*\)\s*$/, ''),
        /\((.+)\)\s*$/.exec(t.termino)?.[1],
      ];
      if (partes.some((p) => p && visible.includes(p.toLowerCase()))) continue;
      // «RANK y RANKL»: cada parte aparece por separado en el texto.
      const conjuncion = t.termino.split(' y ');
      if (conjuncion.length > 1 && conjuncion.every((p) => visible.includes(p.toLowerCase())))
        continue;
      ausentes.push(t.id);
    }
    expect(ausentes).toEqual([]);
  });

  it('los enlaces [término](glosario:id) apuntan a términos que existen', () => {
    const ids = new Set(modulo.glosario.map((t) => t.id));
    const usados = new Set<string>();
    for (const { texto } of textosVisibles()) {
      for (const m of texto.matchAll(/\]\(glosario:([a-z0-9_]+)\)/g)) usados.add(m[1]!);
    }
    for (const id of usados) expect(ids.has(id), id).toBe(true);
  });

  it('cubre casi todo el glosario con enlaces y solo advierte de lo que está en tablas o actividades', () => {
    const usados = new Set<string>();
    for (const { texto } of textosVisibles()) {
      for (const m of texto.matchAll(/\]\(glosario:([a-z0-9_]+)\)/g)) usados.add(m[1]!);
    }
    // Los pasos de las escenas 3D enlazan los cuatro términos que el texto corrido solo nombra en tablas.
    expect(usados.size).toBe(modulo.glosario.length);
    const advertencias = advertenciasDeModulo(modulo);
    const sinEnlace = advertencias
      .filter((a) => a.includes('no está enlazado'))
      .map((a) => /"([^"]+)"/.exec(a)![1]);
    // Ya no queda ningún término sin enlazar: los pasos de las escenas 3D cubren los que antes solo
    // aparecían en tablas o actividades.
    expect(sinEnlace).toEqual([]);
    // La única otra advertencia es el aviso de pendientes para el docente.
    expect(advertencias.filter((a) => !a.includes('no está enlazado'))).toEqual([
      expect.stringContaining('pendiente(s) de revisión'),
    ]);
  });

  it('los términos no se repiten y llevan definición', () => {
    expect(new Set(modulo.glosario.map((t) => t.id)).size).toBe(modulo.glosario.length);
    for (const t of modulo.glosario) expect(t.definicion.length, t.id).toBeGreaterThan(15);
  });
});
