/**
 * Prueba permanente del contenido del módulo 1 («Conociendo el hueso»). Valida SOLO este módulo:
 *
 *  - contra el esquema real y la auditoría de recursos (`auditarContenidoModulo`: existencia de los
 *    SVG y de cada capa que el JSON referencia);
 *  - contra su guion (`docs/guion-por-modulo/m1_conociendo_el_hueso.md`): secciones, actividades por
 *    tipo, puntajes, cantidad de capas, pares, pasos, nodos y preguntas, y el texto de cada opción,
 *    enunciado y explicación de los quices;
 *  - que ningún texto visible arrastre marcas o encabezados del guion, ni URLs externas.
 *
 * Si falla por una diferencia con el guion: o el guion cambió (regenerar con
 * `tools/guiones/convertir.py 1` y repasar `estado_revision.notas`) o alguien editó el JSON a mano.
 */
import { describe, expect, it } from 'vitest';
import guionConFin from '../../../../../docs/guion-por-modulo/m1_conociendo_el_hueso.md?raw';
import { auditarContenidoModulo } from '@/content/auditoria';
import { idDeBloque, listarActividades } from '@/content/consultas';
import { PUNTAJE_MODULO_MAX } from '@/content/constantes';
import { puntajeMaximoModulo } from '@/content/scoring';
import type { Actividad, ModuloContenido } from '@/content/schema';
import type { DependenciasAuditoria } from '@/content/svg';
import { HITOS_ALVEOLAR } from '@/scenes/procedural/alveolar/estado';
import { HITOS_HUESO } from '@/scenes/procedural/hueso/estado';
import { HITOS_MATRIZ } from '@/scenes/procedural/matriz/estado';
import contenidoCrudo from './content.json';

/* -------------------------------------------------------------------------------------------
 * Carga del módulo (esquema real + recursos de public/)
 * ----------------------------------------------------------------------------------------- */

const CARPETA = 'm1_conociendo_el_hueso';

const svgsPublicos = import.meta.glob('/public/images/m1/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const archivosPublicos = new Set(Object.keys(import.meta.glob('/public/images/m1/*')));

const dependencias: DependenciasAuditoria = {
  leerSvg: (ruta) => svgsPublicos[`/public${ruta}`],
  existe: (ruta) => archivosPublicos.has(`/public${ruta}`),
};

const auditoria = auditarContenidoModulo(CARPETA, contenidoCrudo, dependencias);
const modulo = auditoria.modulo as ModuloContenido;
/**
 * Exploraciones 3D con línea de tiempo añadidas fuera del guion (como la de la BMU en el módulo 5): la matriz
 * ósea por escalas (1.3), del hueso largo a la osteona (1.4) y el hueso alveolar por dentro (1.5). Son opcionales
 * y no cuentan en las cifras de la ficha, salvo en el total de puntos del módulo.
 */
const EXTRAS_3D = [
  { id: 'm1_3_matriz_3d', seccion: 'm1_3_matriz', escena: 'matriz_osea', hitos: HITOS_MATRIZ },
  {
    id: 'm1_4_viaje_3d',
    seccion: 'm1_4_organizacion',
    escena: 'hueso_largo_a_osteona',
    hitos: HITOS_HUESO,
  },
  {
    id: 'm1_5_alveolar_3d',
    seccion: 'm1_5_mandibula',
    escena: 'hueso_alveolar',
    hitos: HITOS_ALVEOLAR,
  },
] as const;
const PUNTAJE_EXTRA_3D = 30;
const idsExtra = new Set<string>(EXTRAS_3D.map((e) => e.id));
const todasLasActividades = listarActividades(modulo).map((u) => u.actividad);
/** Las del guion: sin las actividades 3D añadidas fuera de él. */
const actividades = todasLasActividades.filter((a) => !idsExtra.has(a.id));

/* -------------------------------------------------------------------------------------------
 * Lectura del guion (sin librería de YAML: solo lo que hace falta para contar y comparar)
 * ----------------------------------------------------------------------------------------- */

/** Quita las marcas del guion y los enlaces de glosario para comparar el texto plano. */
function plano(texto: string): string {
  return texto
    .replace(/\s*\[verificar\]/gi, '')
    .replace(/\[([^\]]+)\]\(glosario:[^)]+\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Valor de una línea YAML: cadena entre comillas dobles o texto suelto. */
function valorYaml(bruto: string): string {
  const t = bruto.trim();
  if (t.startsWith('"') && t.endsWith('"')) {
    try {
      return JSON.parse(t) as string;
    } catch {
      return t.slice(1, -1);
    }
  }
  return t;
}

interface PreguntaGuion {
  id: string;
  formato: string;
  enunciado: string;
  explicacion: string;
  correcta: string;
  opciones: { id: string; texto: string }[];
  pasos: { id: string; texto: string }[];
}

interface ActividadGuion {
  id: string;
  tipo: string;
  obligatoria: boolean;
  puntaje: number;
  yaml: string;
}

/** El guion puede llegar con saltos CRLF según el `autocrlf` de Git. */
const guionCrudo = guionConFin.replace(/\r\n/g, '\n');

const seccionesGuion = [...guionCrudo.matchAll(/^### Seccion \d+\.\d+: .*\n\s*id "([^"]+)"/gm)].map(
  (m) => m[1]!,
);

const actividadesGuion: ActividadGuion[] = [
  ...guionCrudo.matchAll(/##### Actividad (\S+)\s+```yaml\n([\s\S]*?)```/g),
].map((m) => {
  const yaml = m[2]!;
  const campo = (clave: string) => new RegExp(`^${clave}:\\s*(.+)$`, 'm').exec(yaml)?.[1]?.trim();
  return {
    id: m[1]!,
    tipo: campo('tipo') ?? '',
    obligatoria: campo('obligatoria') !== 'false',
    puntaje: Number(campo('puntaje_max')),
    yaml,
  };
});

/** Líneas de una clave de primer nivel, hasta la siguiente clave de primer nivel. */
function bloqueDe(yaml: string, clave: string): string[] {
  const lineas = yaml.split('\n');
  const inicio = lineas.findIndex((l) => l.startsWith(`${clave}:`));
  if (inicio < 0) return [];
  const resto = lineas.slice(inicio + 1);
  const fin = resto.findIndex((l) => /^[a-z_]+:/.test(l));
  return fin < 0 ? resto : resto.slice(0, fin);
}

/** Elementos de una clave: lista con guiones a 2 espacios o lista en línea `[a, b]`. */
function contarClave(yaml: string, clave: string): number {
  const linea = new RegExp(`^${clave}:\\s*\\[(.*)\\]\\s*$`, 'm').exec(yaml);
  if (linea) return linea[1]!.split(',').filter((x) => x.trim() !== '').length;
  return bloqueDe(yaml, clave).filter((l) => /^ {2}- /.test(l)).length;
}

function preguntasDeGuion(yaml: string): PreguntaGuion[] {
  const preguntas: PreguntaGuion[] = [];
  let actual: PreguntaGuion | undefined;
  let enPasos = false;
  let elemento: { id: string; texto: string } | undefined;
  for (const linea of bloqueDe(yaml, 'preguntas')) {
    let m: RegExpExecArray | null;
    if ((m = /^ {2}- id: (\S+)/.exec(linea))) {
      actual = {
        id: m[1]!,
        formato: '',
        enunciado: '',
        explicacion: '',
        correcta: '',
        opciones: [],
        pasos: [],
      };
      preguntas.push(actual);
      enPasos = false;
    } else if (!actual) {
      continue;
    } else if ((m = /^ {4}formato: (\S+)/.exec(linea))) actual.formato = m[1]!;
    else if ((m = /^ {4}enunciado: (.*)$/.exec(linea))) actual.enunciado = valorYaml(m[1]!);
    else if ((m = /^ {4}explicacion: (.*)$/.exec(linea))) actual.explicacion = valorYaml(m[1]!);
    else if ((m = /^ {4}correcta: (.*)$/.exec(linea))) actual.correcta = m[1]!.trim();
    else if (/^ {4}pasos:/.test(linea)) enPasos = true;
    else if (/^ {4}opciones:/.test(linea)) enPasos = false;
    else if ((m = /^ {6}- id: (\S+)/.exec(linea))) {
      elemento = { id: m[1]!, texto: '' };
      (enPasos ? actual.pasos : actual.opciones).push(elemento);
    } else if ((m = /^ {8}texto: (.*)$/.exec(linea)) && elemento) elemento.texto = valorYaml(m[1]!);
  }
  return preguntas;
}

/* -------------------------------------------------------------------------------------------
 * Ayudas
 * ----------------------------------------------------------------------------------------- */

function porTipo(lista: readonly { tipo: string }[]): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const a of lista) cuenta[a.tipo] = (cuenta[a.tipo] ?? 0) + 1;
  return Object.fromEntries(Object.entries(cuenta).sort(([a], [b]) => a.localeCompare(b)));
}

/** Todas las cadenas del árbol, sin el estado de revisión (que no lee el estudiante). */
function cadenas(valor: unknown, ruta = '$'): { ruta: string; texto: string }[] {
  if (typeof valor === 'string') return [{ ruta, texto: valor }];
  if (Array.isArray(valor)) return valor.flatMap((v, i) => cadenas(v, `${ruta}[${i}]`));
  if (valor && typeof valor === 'object') {
    return Object.entries(valor).flatMap(([k, v]) =>
      k === 'estado_revision' ? [] : cadenas(v, `${ruta}.${k}`),
    );
  }
  return [];
}

const guionDe = (id: string) => actividadesGuion.find((a) => a.id === id);

/* -------------------------------------------------------------------------------------------
 * Pruebas
 * ----------------------------------------------------------------------------------------- */

describe('módulo 1: esquema y recursos', () => {
  it('cumple el esquema real y la auditoría de recursos (SVG y capas), con cero problemas', () => {
    expect(auditoria.problemas, `\n - ${auditoria.problemas.join('\n - ')}\n`).toEqual([]);
    expect(auditoria.modulo).toBeDefined();
  });

  it('es el módulo 1 y está en borrador pendiente del docente', () => {
    expect(modulo.numero).toBe(1);
    expect(modulo.slug).toBe('conociendo_el_hueso');
    expect(modulo.titulo).toBe('Conociendo el hueso');
    expect(modulo.estado_revision.estado).toBe('borrador');
  });

  it('no supera el tope de puntos del módulo y suma lo que declara el guion', () => {
    const total = puntajeMaximoModulo(modulo) - EXTRAS_3D.length * PUNTAJE_EXTRA_3D;
    expect(puntajeMaximoModulo(modulo)).toBeLessThanOrEqual(PUNTAJE_MODULO_MAX);
    const declarado =
      /Puntaje maximo del modulo: (\d+) puntos \((\d+) en las actividades obligatorias y (\d+) en las opcionales\)/.exec(
        guionCrudo,
      );
    expect(declarado, 'La ficha del guion ya no declara el puntaje').not.toBeNull();
    const [, totalGuion, obligatorias, opcionales] = declarado!.map(Number);
    expect(total).toBe(totalGuion);
    expect(actividades.filter((a) => a.obligatoria).reduce((s, a) => s + a.puntaje_max, 0)).toBe(
      obligatorias,
    );
    expect(actividades.filter((a) => !a.obligatoria).reduce((s, a) => s + a.puntaje_max, 0)).toBe(
      opcionales,
    );
    // Cifras verificadas al cerrar el módulo (guion 2026-09-23).
    expect([total, obligatorias, opcionales]).toEqual([440, 370, 70]);
  });

  it.each(EXTRAS_3D)(
    'la exploración 3D $id es opcional, procedural y usa los hitos de su escena',
    ({ id, seccion, escena, hitos }) => {
      const u = listarActividades(modulo).find((x) => x.actividad.id === id)!;
      expect(u.seccion.id).toBe(seccion);
      const a = u.actividad;
      if (a.tipo !== 'exploracion-3d') throw new Error('tipo inesperado');
      expect(a.obligatoria).toBe(false);
      expect(a.puntaje_max).toBe(PUNTAJE_EXTRA_3D);
      expect(a.config.modelo).toBe('procedural');
      expect(a.config.escena).toBe(escena);
      const pasos = a.config.linea_de_tiempo!.pasos;
      // Los `t` del contenido son los hitos canónicos de la escena, en el orden de las fases.
      expect(pasos.map((p) => p.t)).toEqual(Object.values(hitos));
      expect(a.config.requeridos).toEqual(pasos.map((p) => p.id));
    },
  );

  it('los SVG del módulo no repiten ids ni traen scripts, manejadores ni recursos externos', () => {
    const problemas: string[] = [];
    for (const [ruta, svg] of Object.entries(svgsPublicos)) {
      const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!);
      const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (repetidos.length > 0) problemas.push(`${ruta}: ids repetidos ${[...new Set(repetidos)]}`);
      if (/<script|<foreignObject|\son[a-z]+\s*=/i.test(svg))
        problemas.push(`${ruta}: contenido activo`);
      if (/(?:href|src)\s*=\s*"(?:https?:)?\/\//i.test(svg))
        problemas.push(`${ruta}: recurso externo`);
    }
    expect(problemas, `\n - ${problemas.join('\n - ')}\n`).toEqual([]);
  });
});

describe('módulo 1: cobertura respecto al guion', () => {
  it('lee el guion completo (18 actividades en 5 secciones)', () => {
    expect(seccionesGuion).toHaveLength(5);
    expect(actividadesGuion).toHaveLength(18);
  });

  it('las secciones del módulo son las del guion, con los mismos ids y en el mismo orden', () => {
    expect(modulo.secciones.map((s) => s.id)).toEqual(seccionesGuion);
    expect(modulo.secciones).toHaveLength(5);
  });

  it('las actividades son las del guion: mismos ids, orden, tipos, obligatoriedad y puntaje', () => {
    expect(actividades.map((a) => a.id)).toEqual(actividadesGuion.map((a) => a.id));
    for (const g of actividadesGuion) {
      const a = actividades.find((x) => x.id === g.id)!;
      expect(a.tipo, g.id).toBe(g.tipo);
      expect(a.obligatoria, g.id).toBe(g.obligatoria);
      expect(a.puntaje_max, g.id).toBe(g.puntaje);
    }
  });

  it('hay 18 actividades (14 obligatorias y 4 opcionales) con el reparto de tipos del guion', () => {
    expect(actividades).toHaveLength(18);
    expect(actividades.filter((a) => a.obligatoria)).toHaveLength(14);
    expect(actividades.filter((a) => !a.obligatoria).map((a) => a.id)).toEqual([
      'm1_2_quiz_calcio',
      'm1_3_quiz_matriz',
      'm1_4_quiz_organizacion',
      'm1_5_wolff_femur',
    ]);
    expect(porTipo(actividades)).toEqual({
      'arrastre-molecular': 1,
      'exploracion-3d': 1,
      multicapa: 6,
      quiz: 5,
      'relacion-columnas': 4,
      'video-texto': 1,
    });
    expect(porTipo(actividadesGuion)).toEqual(porTipo(actividades));
  });

  it('cada sección tiene al menos una actividad obligatoria y los ids de sección y de bloque son únicos', () => {
    for (const s of modulo.secciones) {
      const obligatorias = s.bloques.filter(
        (b) => b.tipo === 'actividad' && b.actividad.obligatoria,
      );
      expect(obligatorias.length, s.id).toBeGreaterThanOrEqual(1);
    }
    const ids = modulo.secciones.flatMap((s) => s.bloques.map((b) => idDeBloque(b)));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada actividad conserva las cantidades del guion (capas, pares, pasos, nodos, preguntas)', () => {
    const problemas: string[] = [];
    const cmp = (id: string, que: string, json: number, guion: number) => {
      if (json !== guion) problemas.push(`${id}: ${que} ${json} en el JSON y ${guion} en el guion`);
    };
    for (const a of actividades) {
      const g = guionDe(a.id)!;
      const y = g.yaml;
      switch (a.tipo) {
        case 'multicapa':
          cmp(a.id, 'capas', a.config.capas.length, contarClave(y, 'capas'));
          cmp(a.id, 'requeridas', a.config.requeridas.length, contarClave(y, 'requeridas'));
          break;
        case 'relacion-columnas':
          cmp(a.id, 'pares', a.config.pares.length, contarClave(y, 'pares'));
          cmp(a.id, 'columna A', a.config.columna_a.elementos.length, contarClave(y, 'izquierda'));
          cmp(a.id, 'columna B', a.config.columna_b.elementos.length, contarClave(y, 'derecha'));
          break;
        case 'arrastre-molecular':
          cmp(a.id, 'moléculas', a.config.moleculas.length, contarClave(y, 'moleculas'));
          cmp(a.id, 'receptores', a.config.receptores.length, contarClave(y, 'receptores'));
          cmp(
            a.id,
            'pares',
            a.config.pares.length,
            contarClave(y, 'moleculas') - contarClave(y, 'distractores'),
          );
          break;
        case 'video-texto':
          if (a.config.medio === 'animacion') {
            cmp(a.id, 'pasos', a.config.pasos.length, contarClave(y, 'pasos'));
          }
          break;
        case 'exploracion-3d':
          cmp(a.id, 'nodos', a.config.nodos.length, contarClave(y, 'hotspots'));
          cmp(a.id, 'requeridos', a.config.requeridos.length, contarClave(y, 'requeridos'));
          break;
        case 'quiz':
          cmp(a.id, 'preguntas', a.config.preguntas.length, contarClave(y, 'preguntas'));
          break;
      }
    }
    expect(problemas, `\n - ${problemas.join('\n - ')}\n`).toEqual([]);
    const preguntas = actividades.flatMap((a) => (a.tipo === 'quiz' ? a.config.preguntas : []));
    expect(preguntas).toHaveLength(29);
    expect(preguntas.filter((p) => p.formato === 'opcion_multiple')).toHaveLength(22);
    expect(preguntas.filter((p) => p.formato === 'verdadero_falso')).toHaveLength(5);
    expect(preguntas.filter((p) => p.formato === 'ordenar')).toHaveLength(2);
  });

  it('cada pregunta de los quices conserva su enunciado, opciones, respuesta correcta y explicación', () => {
    const problemas: string[] = [];
    for (const a of actividades) {
      if (a.tipo !== 'quiz') continue;
      const del = preguntasDeGuion(guionDe(a.id)!.yaml);
      expect(
        a.config.preguntas.map((p) => p.id),
        a.id,
      ).toEqual(del.map((p) => p.id));
      for (const g of del) {
        const p = a.config.preguntas.find((x) => x.id === g.id)!;
        if (plano(p.enunciado) !== plano(g.enunciado))
          problemas.push(`${g.id}: enunciado distinto`);
        if (plano(p.explicacion) !== plano(g.explicacion))
          problemas.push(`${g.id}: explicación distinta`);
        if (p.formato === 'verdadero_falso') {
          if (g.formato !== 'verdadero_falso' || p.correcta !== (g.correcta === 'verdadero')) {
            problemas.push(`${g.id}: respuesta verdadero/falso distinta`);
          }
        } else if (p.formato === 'opcion_multiple') {
          const textos = p.opciones.map((o) => plano(o.texto));
          if (JSON.stringify(textos) !== JSON.stringify(g.opciones.map((o) => plano(o.texto)))) {
            problemas.push(`${g.id}: opciones distintas`);
          }
          const correctasGuion = g.correcta
            .replace(/[[\]]/g, '')
            .split(',')
            .map((x) => x.trim());
          const textosCorrectos = p.opciones
            .filter((o) => p.correctas.includes(o.id))
            .map((o) => plano(o.texto));
          const esperados = g.opciones
            .filter((o) => correctasGuion.includes(o.id))
            .map((o) => plano(o.texto));
          if (JSON.stringify(textosCorrectos) !== JSON.stringify(esperados)) {
            problemas.push(`${g.id}: opción correcta distinta`);
          }
        } else {
          const orden = g.correcta
            .replace(/[[\]]/g, '')
            .split(',')
            .map((x) => x.trim());
          const esperado = orden.map((id) => plano(g.pasos.find((s) => s.id === id)?.texto ?? '?'));
          if (JSON.stringify(p.pasos.map((s) => plano(s.texto))) !== JSON.stringify(esperado)) {
            problemas.push(`${g.id}: orden de los pasos distinto`);
          }
        }
      }
    }
    expect(problemas, `\n - ${problemas.join('\n - ')}\n`).toEqual([]);
  });

  it('la evaluación final exige el umbral que propone el guion (60 %)', () => {
    const final = actividades.find((a) => a.id === 'm1_5_evaluacion_final') as Actividad;
    expect(final.puntaje_max).toBe(100);
    expect(final.aprobacion_min).toBe(0.6);
  });
});

describe('módulo 1: textos visibles', () => {
  const todas = cadenas(contenidoCrudo);

  function ofensores(patron: RegExp): string[] {
    return todas
      .filter((c) => patron.test(c.texto))
      .map((c) => `${c.ruta}: ${c.texto.slice(0, 80)}`);
  }

  it('ninguna marca [verificar] llega al texto (van a estado_revision.pendientes)', () => {
    expect(ofensores(/\[verificar\]|verificar\]/i)).toEqual([]);
    expect(modulo.estado_revision.pendientes.length).toBeGreaterThan(0);
    expect(modulo.estado_revision.notas ?? '').not.toMatch(/\[verificar\]/i);
  });

  it('ningún comentario, encabezado ni marca estructural del guion', () => {
    expect(ofensores(/<!--|-->|^#{1,2}\s/m)).toEqual([]);
    expect(ofensores(/#### Contenido|##### Actividad|### Seccion|^id "/m)).toEqual([]);
    expect(ofensores(/```/)).toEqual([]);
    expect(ofensores(/^\s*>/m)).toEqual([]);
  });

  it('sin URLs externas, sin HTML y sin texto con la codificación dañada', () => {
    expect(ofensores(/https?:\/\/|www\./i)).toEqual([]);
    expect(ofensores(/<\/?[a-z][^>]*>/i)).toEqual([]);
    expect(ofensores(/Ã.|Â.|�/)).toEqual([]);
  });

  it('los avisos no repiten su etiqueta: la pone la interfaz según la variante', () => {
    const problemas: string[] = [];
    for (const s of modulo.secciones) {
      for (const b of s.bloques) {
        if (b.tipo !== 'callout') continue;
        if (/^\s*(cl[ií]nico|atenci[oó]n|dato|recuerda)\s*:/i.test(b.markdown)) {
          problemas.push(`${b.id}: empieza con la etiqueta «${b.markdown.slice(0, 20)}»`);
        }
        if (
          b.titulo &&
          /^(caso cl[ií]nico|atenci[oó]n|dato clave|recuerda)\s*:?$/i.test(b.titulo)
        ) {
          problemas.push(`${b.id}: título igual a la etiqueta`);
        }
      }
    }
    expect(problemas).toEqual([]);
  });

  it('cada imagen tiene alt propio, pie y un SVG que existe', () => {
    const imagenes = modulo.secciones.flatMap((s) => s.bloques.filter((b) => b.tipo === 'imagen'));
    expect(imagenes.length).toBeGreaterThanOrEqual(5);
    for (const b of imagenes) {
      expect(b.alt.length, b.id).toBeGreaterThanOrEqual(10);
      expect(b.alt, b.id).not.toMatch(/\.svg|^m1_/);
      expect(archivosPublicos.has(`/public${b.src}`), `${b.id}: ${b.src}`).toBe(true);
    }
  });

  it('las referencias no están verificadas y no traen URL inventada', () => {
    expect(modulo.referencias.length).toBeGreaterThan(0);
    for (const r of modulo.referencias) {
      expect(r.verificada, r.id).toBe(false);
      expect(r.url, r.id).toBeUndefined();
    }
  });
});

describe('módulo 1: glosario', () => {
  const enlaces = cadenas(contenidoCrudo).flatMap((c) =>
    [...c.texto.matchAll(/\]\(glosario:([^)]+)\)/g)].map((m) => m[1]!),
  );

  it('todo enlace glosario:id apunta a un término que existe', () => {
    const ids = new Set(modulo.glosario.map((t) => t.id));
    expect(enlaces.length).toBeGreaterThan(0);
    expect(enlaces.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('cada término del glosario se enlaza al menos una vez y aparece en el texto', () => {
    const sinEnlace = modulo.glosario.map((t) => t.id).filter((id) => !enlaces.includes(id));
    expect(sinEnlace).toEqual([]);
    // El texto del enlace es una forma del término (p. ej. «osteonas» o «lagunas»).
    const cuerpo = modulo.secciones
      .flatMap((s) => s.bloques.filter((b) => b.tipo === 'texto' || b.tipo === 'callout'))
      .map((b) => b.markdown)
      .join('\n');
    for (const t of modulo.glosario) {
      expect(cuerpo, t.id).toContain(`](glosario:${t.id})`);
    }
  });

  it('no hay dos términos con el mismo id ni con la misma etiqueta', () => {
    const ids = modulo.glosario.map((t) => t.id);
    const nombres = modulo.glosario.map((t) => t.termino.toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(nombres).size).toBe(nombres.length);
  });
});
