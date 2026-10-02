// Prueba permanente del contenido del módulo 3 ("Construyendo hueso"): valida SOLO este módulo
// contra el esquema real, comprueba que el content.json cubre su guion
// (docs/guion-por-modulo/m3_construyendo_hueso.md) y que no queda nada estructural o pendiente
// en los textos que ve el estudiante. Los dibujos SVG tienen su propia prueba (ilustraciones.test.ts).
import { describe, expect, it } from 'vitest';
import guionCrudo from '../../../../../docs/guion-por-modulo/m3_construyendo_hueso.md?raw';
import { auditarContenidoModulo, advertenciasDeModulo } from '@/content/auditoria';
import { contarActividadesPorTipo, listarActividades, recorrerCadenas } from '@/content/consultas';
import { PUNTAJE_MODULO_MAX, PUNTAJE_MODULO_MIN } from '@/content/constantes';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import { puntajeMaximoModulo } from '@/content/scoring';
import { HITOS_DOS_RUTAS } from '@/scenes/procedural/dos_rutas/estado';
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

const CARPETA = 'm3_construyendo_hueso';
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
interface PreguntaGuion {
  id: string;
  formato: string;
  /** Valor crudo de `correcta:` (`c`, `[a, c]`, `true`, `[p2, p5]`). */
  correcta: string;
  /** Ids de las opciones o de los pasos. */
  hijos: string[];
  explicacion: string;
}
interface ActividadGuion {
  id: string;
  seccion: string;
  tipo: string;
  obligatoria: boolean;
  puntaje: number;
  /** Cantidad de elementos de cada lista de primer nivel del yaml (capas, pares, pasos...). */
  listas: Record<string, number>;
  preguntas: PreguntaGuion[];
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

/** Las preguntas de un quiz con lo que hace falta para compararlas con el JSON. */
function leerPreguntas(yaml: string): PreguntaGuion[] {
  const lineas = yaml.split('\n');
  const inicio = lineas.findIndex((l) => l.startsWith('preguntas:'));
  if (inicio < 0) return [];
  const bloques: string[][] = [];
  for (let i = inicio + 1; i < lineas.length; i++) {
    const l = lineas[i] ?? '';
    if (/^[a-z_]+:/.test(l)) break;
    if (/^ {2}- id: /.test(l)) bloques.push([]);
    bloques.at(-1)?.push(l);
  }
  return bloques.map((b) => {
    const campo = (nombre: string) =>
      new RegExp(`^ {4}${nombre}: (.*)$`, 'm').exec(b.join('\n'))?.[1]?.trim() ?? '';
    const explicacion = campo('explicacion').replace(/^"|"$/g, '').replace(/\\"/g, '"');
    return {
      id: /- id: ([a-z0-9_]+)/.exec(b[0]!)![1]!,
      formato: campo('formato'),
      correcta: campo('correcta'),
      hijos: b.flatMap((l) => {
        const m = /^ {6}- id: ([a-z0-9_]+)$/.exec(l);
        return m ? [m[1]!] : [];
      }),
      explicacion,
    };
  });
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
        listas,
        preguntas: leerPreguntas(yaml),
      });
    }
  });
  return { secciones, actividades };
}

const { secciones: seccionesGuion, actividades: actividadesGuion } = leerGuion();

/**
 * Exploraciones 3D procedurales con línea de tiempo añadidas fuera del guion (las dos rutas de osificación).
 * Son opcionales y no cuentan en las cifras de la ficha, salvo en el total de puntos del módulo.
 * Para añadir otra escena basta con una fila más: las pruebas de abajo se derivan de esta lista.
 */
const EXTRAS_3D = [
  {
    id: 'm3_1_dos_rutas_3d',
    seccion: 'm3_1_dos_rutas',
    escena: 'dos_rutas_osificacion',
    hitos: HITOS_DOS_RUTAS,
    puntaje: 30,
  },
] as const;
const ID_EXTRAS_3D = new Set<string>(EXTRAS_3D.map((e) => e.id));
/** Puntos que las exploraciones extra suman al total del módulo. */
const PUNTAJE_EXTRAS_3D = EXTRAS_3D.reduce((s, e) => s + e.puntaje, 0);

/** Cifras del guion (verificadas a mano y con este mismo parseo al escribir la prueba). */
const FICHA = {
  secciones: 8,
  actividades: 21,
  obligatorias: 19,
  total: 700,
  obligatorio: 650,
  preguntas: 34,
  preguntasFinal: 12,
};

const TOPE_PESO_BYTES = 260 * 1024;

/** Términos del glosario que solo aparecen en tablas, actividades o títulos: el esquema no admite enlaces allí. */
const SIN_ENLACE = ['cilio_primario', 'frizzled', 'noggin', 'smad'];

/** Cómo se escribe en el texto un término del glosario cuando no es literalmente su nombre. */
const VARIANTES_EN_TEXTO: Record<string, string[]> = {
  lrp5_y_lrp6: ['LRP5/6'],
  hialinizacion: ['hialinizada'],
};

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

/** Texto sin marcado, sin marcas `[verificar]` y con espacios normalizados, para comparar con el guion. */
function normalizar(texto: string): string {
  return textoPlanoDeMarkdown(texto.replace(/\s*\[verificar\]/gi, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

/* -------------------------------------------------------------------------------------------
 * Esquema y recursos
 * ----------------------------------------------------------------------------------------- */

describe('módulo 3: esquema, carpeta y recursos', () => {
  it('pasa el esquema real y la auditoría del proyecto sin problemas', () => {
    expect(auditoria.problemas, `\n - ${auditoria.problemas.join('\n - ')}\n`).toEqual([]);
    expect(modulo.numero).toBe(3);
    expect(modulo.slug).toBe('construyendo_hueso');
  });

  it('sigue en borrador hasta que el docente lo apruebe', () => {
    expect(modulo.estado_revision.estado).toBe('borrador');
  });

  it('el peso de content.json es razonable (tope ' + TOPE_PESO_BYTES / 1024 + ' KB)', () => {
    expect(new TextEncoder().encode(contenidoTexto).length).toBeLessThan(TOPE_PESO_BYTES);
  });

  it('solo advierte de términos del glosario que únicamente están en tablas, actividades o títulos', () => {
    const sinEnlace = advertenciasDeModulo(modulo)
      .filter((a) => a.includes('no está enlazado'))
      .map((a) => /"([^"]+)"/.exec(a)![1]);
    expect(sinEnlace.sort()).toEqual(SIN_ENLACE);
  });

  it('todos los recursos SVG del módulo existen y son los 8 dibujos de la carpeta m3', () => {
    const rutas = new Set<string>();
    recorrerCadenas(modulo, [], (texto) => {
      if (/^\/images\/m3\/[a-z0-9_]+\.svg$/.test(texto)) rutas.add(texto);
    });
    for (const ruta of rutas) expect(archivosPublicos.has(`/public${ruta}`), ruta).toBe(true);
    const enDisco = Object.keys(svgsPublicos)
      .filter((r) => r.startsWith('/public/images/m3/'))
      .map((r) => r.replace('/public', ''));
    expect([...rutas].sort()).toEqual(enDisco.sort());
    expect(rutas.size).toBe(8);
  });
});

/* -------------------------------------------------------------------------------------------
 * Cobertura respecto al guion
 * ----------------------------------------------------------------------------------------- */

describe('módulo 3: cobertura del guion', () => {
  /** Todas las actividades del módulo, con las exploraciones 3D añadidas fuera del guion. */
  const todas = listarActividades(modulo);
  /** Las del guion: sin las exploraciones 3D extra. */
  const ubicadas = todas.filter((u) => !ID_EXTRAS_3D.has(u.actividad.id));

  it('el guion se parseó como se espera (8 secciones y 21 actividades)', () => {
    expect(seccionesGuion).toHaveLength(FICHA.secciones);
    expect(actividadesGuion).toHaveLength(FICHA.actividades);
    expect(actividadesGuion.filter((a) => a.obligatoria)).toHaveLength(FICHA.obligatorias);
  });

  it('tiene las secciones del guion, en orden, con su id y su título', () => {
    expect(modulo.secciones.map((s) => s.id)).toEqual(seccionesGuion.map((s) => s.id));
    expect(modulo.secciones.map((s) => s.titulo)).toEqual(seccionesGuion.map((s) => s.titulo));
    expect(modulo.secciones.map((s) => s.id)).toEqual([
      'm3_1_dos_rutas',
      'm3_2_mandibula_historias',
      'm3_3_condensacion_laminar',
      'm3_4_osteocito_sensor',
      'm3_5_sensores_mensajeros',
      'm3_6_wnt_esclerostina_pth',
      'm3_7_mecanostato_mandibula',
      'm3_8_evaluacion_final',
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

  it('el puntaje total y el obligatorio coinciden con el guion y respetan el tope del esquema', () => {
    expect(puntajeMaximoModulo(modulo)).toBe(FICHA.total + PUNTAJE_EXTRAS_3D);
    expect(puntajeMaximoModulo(modulo, { soloObligatorias: true })).toBe(FICHA.obligatorio);
    expect(actividadesGuion.reduce((s, a) => s + a.puntaje, 0)).toBe(FICHA.total);
    expect(puntajeMaximoModulo(modulo)).toBeLessThanOrEqual(PUNTAJE_MODULO_MAX);
    expect(puntajeMaximoModulo(modulo)).toBeGreaterThanOrEqual(PUNTAJE_MODULO_MIN);
  });

  it('cuenta 21 actividades del guion (6 multicapa, 8 quiz, 3 relaciones, 1 video, 2 arrastres y 1 exploración 3D) más las 3D extra', () => {
    expect(contarActividadesPorTipo(modulo)).toEqual({
      multicapa: 6,
      quiz: 8,
      'relacion-columnas': 3,
      'video-texto': 1,
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

  it('los quiz conservan sus preguntas (ids, formato, respuesta correcta) y suman 34, 12 en la evaluación final', () => {
    let total = 0;
    for (const g of actividadesGuion.filter((a) => a.tipo === 'quiz')) {
      const a = ubicadas.find((x) => x.actividad.id === g.id)!.actividad;
      if (a.tipo !== 'quiz') throw new Error('tipo inesperado');
      expect(
        a.config.preguntas.map((p) => p.id),
        g.id,
      ).toEqual(g.preguntas.map((p) => p.id));
      total += a.config.preguntas.length;

      for (const pg of g.preguntas) {
        const p = a.config.preguntas.find((x) => x.id === pg.id)!;
        const formato = pg.formato === 'ordenar_pasos' ? 'ordenar' : pg.formato;
        expect(p.formato, pg.id).toBe(formato);
        if (p.formato === 'verdadero_falso') {
          expect(String(p.correcta), pg.id).toBe(pg.correcta);
        } else if (p.formato === 'opcion_multiple') {
          const correctas = pg.correcta.replace(/[[\]\s]/g, '').split(',');
          expect(p.correctas, `${pg.id} correctas`).toEqual(correctas.map((c) => `${pg.id}_${c}`));
          expect(
            p.opciones.map((o) => o.id),
            `${pg.id} opciones`,
          ).toEqual(pg.hijos.map((h) => `${pg.id}_${h}`));
        } else {
          // El JSON guarda los pasos ya en el orden correcto (el componente los baraja).
          const orden = pg.correcta.replace(/[[\]\s]/g, '').split(',');
          expect(
            p.pasos.map((x) => x.id),
            `${pg.id} pasos`,
          ).toEqual(orden.map((o) => `${pg.id}_${o}`));
        }
        // La explicación conserva el texto del guion (sin marcado ni marcas de verificación).
        expect(normalizar(p.explicacion ?? ''), `${pg.id} explicación`).toBe(
          normalizar(pg.explicacion),
        );
      }
    }
    expect(total).toBe(FICHA.preguntas);
    expect(total).toBe(actividadesGuion.reduce((s, a) => s + a.preguntas.length, 0));
    const final = ubicadas.find((u) => u.actividad.id === 'm3_evaluacion_final')!.actividad;
    expect(final.tipo === 'quiz' && final.config.preguntas.length).toBe(FICHA.preguntasFinal);
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
        // En este guion las moléculas de distractor también van en `moleculas`.
        expect(a.config.moleculas.length, `${g.id} moleculas`).toBe(l.moleculas);
        expect(a.config.receptores.length, `${g.id} receptores`).toBe(l.receptores);
        expect(a.config.pares.length, `${g.id} pares`).toBe(l.pares);
        expect(a.config.distractores?.length ?? 0, `${g.id} distractores`).toBe(l.distractores);
      } else if (a.tipo === 'exploracion-3d') {
        expect(a.config.nodos.length, `${g.id} hotspots`).toBe(l.hotspots);
        // El guion llama `requeridas` a la lista de nodos que hay que visitar.
        expect(a.config.requeridos.length, `${g.id} requeridos`).toBe(l.requeridas);
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

  it('el guion no trae figuras sueltas: todos los dibujos entran por las actividades', () => {
    expect(guion).not.toMatch(/^\[Figura:/m);
    expect(guion).not.toMatch(/^!\[/m);
    const imagenes = modulo.secciones
      .flatMap((s) => s.bloques)
      .flatMap((b) => (b.tipo === 'imagen' ? [b] : []));
    expect(imagenes).toHaveLength(0);
  });
});

/* -------------------------------------------------------------------------------------------
 * Lo que ve el estudiante
 * ----------------------------------------------------------------------------------------- */

describe('módulo 3: textos visibles', () => {
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

  it('todas las imágenes de actividad traen texto alternativo', () => {
    const actividadesConAlt = listarActividades(modulo).filter(({ actividad }) =>
      ['multicapa', 'video-texto', 'exploracion-3d'].includes(actividad.tipo),
    );
    // Ocho del guion más las exploraciones 3D extra (que también llevan `alt`).
    expect(actividadesConAlt.length).toBe(8 + EXTRAS_3D.length);
    for (const { actividad } of actividadesConAlt) {
      const alt = (actividad.config as { alt?: string }).alt;
      expect(alt?.trim().length ?? 0, actividad.id).toBeGreaterThanOrEqual(10);
    }
    for (const { actividad } of listarActividades(modulo).filter(
      (x) => x.actividad.tipo === 'arrastre-molecular',
    )) {
      const escena = (actividad.config as { escena?: { alt?: string } }).escena;
      expect(escena?.alt?.trim().length ?? 0, actividad.id).toBeGreaterThanOrEqual(10);
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
    expect(new Set(avisos.map((a) => a.variante))).toEqual(
      new Set(['clinico', 'dato', 'atencion', 'recuerda']),
    );
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

describe('módulo 3: glosario', () => {
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
        ...(VARIANTES_EN_TEXTO[t.id] ?? []),
      ];
      const alguno = partes.some((p) => p && visible.includes(p.toLowerCase()));
      if (!alguno) ausentes.push(t.id);
    }
    expect(ausentes).toEqual([]);
  });

  it('los enlaces [término](glosario:id) apuntan a términos que existen y cubren todo el glosario salvo cuatro', () => {
    const ids = new Set(modulo.glosario.map((t) => t.id));
    const usados = new Set<string>();
    for (const { texto } of textosVisibles()) {
      for (const m of texto.matchAll(/\]\(glosario:([a-z0-9_]+)\)/g)) usados.add(m[1]!);
    }
    for (const id of usados) expect(ids.has(id), id).toBe(true);
    expect([...ids].filter((id) => !usados.has(id)).sort()).toEqual(SIN_ENLACE);
  });

  it('los términos no se repiten y llevan definición', () => {
    expect(new Set(modulo.glosario.map((t) => t.id)).size).toBe(modulo.glosario.length);
    for (const t of modulo.glosario) expect(t.definicion.length, t.id).toBeGreaterThan(15);
  });
});
