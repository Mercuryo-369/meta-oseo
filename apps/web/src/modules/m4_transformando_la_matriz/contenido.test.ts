// Prueba permanente del contenido del módulo 4 ("Transformando la matriz"): valida SOLO este módulo
// contra el esquema real, comprueba que el content.json cubre su guion
// (docs/guion-por-modulo/m4_transformando_la_matriz.md) y que no queda nada estructural o pendiente
// en los textos que ve el estudiante. Los dibujos SVG tienen su propia prueba (ilustraciones.test.ts).
import { describe, expect, it } from 'vitest';
import guionCrudo from '../../../../../docs/guion-por-modulo/m4_transformando_la_matriz.md?raw';
import { auditarContenidoModulo, advertenciasDeModulo } from '@/content/auditoria';
import { contarActividadesPorTipo, listarActividades, recorrerCadenas } from '@/content/consultas';
import { PUNTAJE_MODULO_MAX, PUNTAJE_MODULO_MIN } from '@/content/constantes';
import { puntajeMaximoModulo } from '@/content/scoring';
import { HITOS_MATRIZ } from '@/scenes/procedural/matriz/estado';
import { HITOS_VESICULA } from '@/scenes/procedural/vesicula/estado';
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

const CARPETA = 'm4_transformando_la_matriz';
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
  const RE = /^### Seccion (\d\.\d): (.+)\n\nid: "([a-z0-9_]+)"/gm;
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
 * Exploraciones 3D procedurales con línea de tiempo añadidas fuera del guion (la vesícula de matriz y la matriz ósea por escalas).
 * Son opcionales y no cuentan en las cifras de la ficha, salvo en el total de puntos del módulo.
 * Para añadir otra escena basta con una fila más: las pruebas de abajo se derivan de esta lista.
 */
const EXTRAS_3D = [
  {
    id: 'm4_3_vesicula_3d',
    seccion: 'm4_3_vesiculas_ppi',
    escena: 'vesicula_matriz',
    hitos: HITOS_VESICULA,
    puntaje: 30,
  },
  {
    id: 'm4_4_matriz_3d',
    seccion: 'm4_4_hidroxiapatita',
    escena: 'matriz_osea',
    hitos: HITOS_MATRIZ,
    puntaje: 30,
  },
] as const;
const ID_EXTRAS_3D = new Set<string>(EXTRAS_3D.map((e) => e.id));
/** Puntos que las exploraciones extra suman al total del módulo. */
const PUNTAJE_EXTRAS_3D = EXTRAS_3D.reduce((s, e) => s + e.puntaje, 0);

/** Cifras de la ficha del guion (verificadas a mano al escribir esta prueba). */
const FICHA = { secciones: 8, actividades: 20, obligatorias: 15, total: 660, obligatorio: 510 };

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

describe('módulo 4: esquema, carpeta y recursos', () => {
  it('pasa el esquema real y la auditoría del proyecto sin problemas', () => {
    expect(auditoria.problemas, `\n - ${auditoria.problemas.join('\n - ')}\n`).toEqual([]);
    expect(modulo.numero).toBe(4);
    expect(modulo.slug).toBe('transformando_la_matriz');
  });

  it('sigue en borrador hasta que el docente lo apruebe', () => {
    expect(modulo.estado_revision.estado).toBe('borrador');
  });

  it('el peso de content.json es razonable (tope ' + TOPE_PESO_BYTES / 1024 + ' KB)', () => {
    expect(new TextEncoder().encode(contenidoTexto).length).toBeLessThan(TOPE_PESO_BYTES);
  });

  it('solo advierte de términos del glosario que únicamente están en encabezados de tabla', () => {
    const sinEnlace = advertenciasDeModulo(modulo)
      .filter((a) => a.includes('no está enlazado'))
      .map((a) => /"([^"]+)"/.exec(a)![1]);
    // Aparecen solo como fila o título de una tabla, donde el esquema no admite enlaces.
    expect(sinEnlace.sort()).toEqual(['bsap_fosfatasa_alcalina_osea', 'mineralizacion_primaria']);
  });
});

/* -------------------------------------------------------------------------------------------
 * Cobertura respecto al guion
 * ----------------------------------------------------------------------------------------- */

describe('módulo 4: cobertura del guion', () => {
  /** Todas las actividades del módulo, con las exploraciones 3D añadidas fuera del guion. */
  const todas = listarActividades(modulo);
  /** Las del guion: sin las exploraciones 3D extra. */
  const ubicadas = todas.filter((u) => !ID_EXTRAS_3D.has(u.actividad.id));

  it('el guion se parseó como se espera (8 secciones y 20 actividades)', () => {
    expect(seccionesGuion).toHaveLength(FICHA.secciones);
    expect(actividadesGuion).toHaveLength(FICHA.actividades);
    expect(actividadesGuion.filter((a) => a.obligatoria)).toHaveLength(FICHA.obligatorias);
  });

  it('tiene las secciones del guion, en orden, con su id y su título', () => {
    expect(modulo.secciones.map((s) => s.id)).toEqual(seccionesGuion.map((s) => s.id));
    expect(modulo.secciones.map((s) => s.titulo)).toEqual(seccionesGuion.map((s) => s.titulo));
    expect(modulo.secciones.map((s) => s.id)).toEqual([
      'm4_1_osteoide',
      'm4_2_colageno_i',
      'm4_3_vesiculas_ppi',
      'm4_4_hidroxiapatita',
      'm4_5_proteinas_no_colagenas',
      'm4_6_frente_y_fases',
      'm4_7_homeostasis_ca_pi',
      'm4_8_patologias_mandibula',
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
    expect(puntajeMaximoModulo(modulo)).toBeLessThanOrEqual(PUNTAJE_MODULO_MAX);
    expect(puntajeMaximoModulo(modulo)).toBeGreaterThanOrEqual(PUNTAJE_MODULO_MIN);
  });

  it('cuenta 20 actividades del guion (5 multicapa, 9 quiz, 3 relaciones, 1 video, 1 arrastre y 1 exploración 3D) más las 3D extra', () => {
    expect(contarActividadesPorTipo(modulo)).toEqual({
      multicapa: 5,
      quiz: 9,
      'relacion-columnas': 3,
      'video-texto': 1,
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

  it('los quiz conservan los ids de sus preguntas y suman 16 en la evaluación final', () => {
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
    const final = ubicadas.find((u) => u.actividad.id === 'm4_evaluacion_final')!.actividad;
    expect(final.tipo === 'quiz' && final.config.preguntas.length).toBe(16);
    expect(total).toBe(actividadesGuion.reduce((s, a) => s + a.preguntas.length, 0));
  });

  it('la evaluación final exige el 70 % de acierto que propone la ficha del guion (D02)', () => {
    expect(guion).toContain('alcanzar al menos el 70 % en la evaluación final');
    const final = ubicadas.find((u) => u.actividad.id === 'm4_evaluacion_final')!.actividad;
    expect(final.obligatoria).toBe(true);
    expect(final.aprobacion_min).toBe(0.7);
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

  it('los receptores del arrastre coinciden con los sitios que anota el SVG de la vesícula', () => {
    // Centros en el viewBox 800x600, tal como los anota el comentario de m4_vesicula_matriz.svg.
    const sitios: Record<string, [number, number]> = {
      rec_canal_anexina: [236, 345],
      rec_transportador_fosfato: [564, 345],
      rec_lumen_vesicula: [400, 300],
      rec_membrana_vesicula: [500, 202],
      rec_cristal_hidroxiapatita: [400, 438],
    };
    const svg = svgsPublicos['/public/images/m4/m4_vesicula_matriz.svg'] ?? '';
    expect(svg).toContain('canal_anexina 236,345');
    const a = ubicadas.find((u) => u.actividad.id === 'm4_arrastre_mineralizacion')!.actividad;
    if (a.tipo !== 'arrastre-molecular') throw new Error('tipo inesperado');
    for (const r of a.config.receptores) {
      const [x, y] = sitios[r.id]!;
      expect(r.posicion.x, `${r.id} x`).toBeCloseTo((x / 800) * 100, 0);
      expect(r.posicion.y, `${r.id} y`).toBeCloseTo((y / 600) * 100, 0);
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

  it('cada figura «[Figura: id | pie]» del guion es un bloque de imagen con su archivo y su alt', () => {
    const figuras = [...guion.matchAll(/^\[Figura: (m4_[a-z0-9_]+) \| (.+)\]$/gm)].map(
      (m) => m[1]!,
    );
    expect(figuras).toHaveLength(7);
    const imagenes = modulo.secciones
      .flatMap((s) => s.bloques)
      .flatMap((b) => (b.tipo === 'imagen' ? [b] : []));
    expect(imagenes.map((i) => i.src)).toEqual(figuras.map((f) => `/images/m4/${f}.svg`));
    for (const i of imagenes) {
      expect(i.alt.length, i.id).toBeGreaterThanOrEqual(10);
      expect(archivosPublicos.has(`/public${i.src}`), i.src).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------------------------
 * Lo que ve el estudiante
 * ----------------------------------------------------------------------------------------- */

describe('módulo 4: textos visibles', () => {
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

  it('todas las imágenes traen texto alternativo', () => {
    const imagenes = modulo.secciones
      .flatMap((s) => s.bloques)
      .flatMap((b) => (b.tipo === 'imagen' ? [b] : []));
    expect(imagenes.length).toBeGreaterThan(0);
    for (const i of imagenes) expect(i.alt.trim().length, i.id).toBeGreaterThanOrEqual(10);
    const actividadesConAlt = listarActividades(modulo).filter(({ actividad }) =>
      ['multicapa', 'video-texto', 'exploracion-3d'].includes(actividad.tipo),
    );
    for (const { actividad } of actividadesConAlt) {
      const alt = (actividad.config as { alt?: string }).alt;
      expect(alt?.trim().length ?? 0, actividad.id).toBeGreaterThanOrEqual(10);
    }
  });

  it('los avisos usan las cuatro variantes y su etiqueta lleva la tilde correcta', () => {
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

describe('módulo 4: glosario', () => {
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
      const alguno = partes.some((p) => p && visible.includes(p.toLowerCase()));
      // «Calcitriol (1,25(OH)2D)» se escribe en el texto con subíndice o como «calcitriol».
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
    expect(usados.size).toBe(modulo.glosario.length - 2);
  });

  it('los términos no se repiten y llevan definición', () => {
    expect(new Set(modulo.glosario.map((t) => t.id)).size).toBe(modulo.glosario.length);
    for (const t of modulo.glosario) expect(t.definicion.length, t.id).toBeGreaterThan(15);
  });
});
