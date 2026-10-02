// Prueba permanente del contenido del módulo 6 ("El paso del tiempo"): valida SOLO este módulo
// contra el esquema real, comprueba que el content.json cubre su guion
// (docs/guion-por-modulo/m6_el_paso_del_tiempo.md) y que no queda nada estructural o pendiente
// en los textos que ve el estudiante. Los dibujos SVG tienen su propia prueba (ilustraciones.test.ts).
import { describe, expect, it } from 'vitest';
import guionCrudo from '../../../../../docs/guion-por-modulo/m6_el_paso_del_tiempo.md?raw';
import { auditarContenidoModulo, advertenciasDeModulo } from '@/content/auditoria';
import { contarActividadesPorTipo, listarActividades, recorrerCadenas } from '@/content/consultas';
import { PUNTAJE_MODULO_MAX, PUNTAJE_MODULO_MIN } from '@/content/constantes';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import { puntajeMaximoModulo } from '@/content/scoring';
import { HITOS_ALVEOLO } from '@/scenes/procedural/alveolo/estado';
import { HITOS_TRABECULAR } from '@/scenes/procedural/trabecular/estado';
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

const CARPETA = 'm6_el_paso_del_tiempo';
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
  /** Valor crudo de `correcta:` (`c`, `[a, c]`, `verdadero`, `[p2, p5]`). */
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
  /** SVG que cita el guion (`svg:`, `ilustracion:` o `escena.svg:`). */
  svg: string | undefined;
  /** Cantidad de elementos de cada lista de primer nivel del yaml (capas, pares, pasos...). */
  listas: Record<string, number>;
  preguntas: PreguntaGuion[];
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
  const RE = /^### Seccion (\d\.\d): (.+)\n\nid "([a-z0-9_]+)"/gm;
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
        svg: /^(?:svg|ilustracion|\s{2}svg): (m6_[a-z0-9_]+)$/m.exec(yaml)?.[1],
        listas,
        preguntas: leerPreguntas(yaml),
      });
    }
  });
  return { secciones, actividades };
}

const { secciones: seccionesGuion, actividades: actividadesGuion } = leerGuion();

/**
 * Exploraciones 3D procedurales con línea de tiempo añadidas fuera del guion (el hueso trabecular con los años y el alvéolo tras la extracción).
 * Son opcionales y no cuentan en las cifras de la ficha, salvo en el total de puntos del módulo.
 * Para añadir otra escena basta con una fila más: las pruebas de abajo se derivan de esta lista.
 */
const EXTRAS_3D = [
  {
    id: 'm6_3_trabecular_3d',
    seccion: 'm6_3_osteoporosis',
    escena: 'hueso_trabecular_tiempo',
    hitos: HITOS_TRABECULAR,
    puntaje: 30,
  },
  {
    id: 'm6_4_alveolo_3d',
    seccion: 'm6_4_mandibula_y_tiempo',
    escena: 'alveolo_postextraccion',
    hitos: HITOS_ALVEOLO,
    puntaje: 30,
  },
] as const;
const ID_EXTRAS_3D = new Set<string>(EXTRAS_3D.map((e) => e.id));
/** Puntos que las exploraciones extra suman al total del módulo. */
const PUNTAJE_EXTRAS_3D = EXTRAS_3D.reduce((s, e) => s + e.puntaje, 0);

/** Cifras de la ficha del guion (verificadas a mano al escribir esta prueba). */
const FICHA = {
  secciones: 5,
  actividades: 14,
  obligatorias: 9,
  total: 440,
  obligatorio: 330,
  preguntas: 28,
  preguntasFinal: 8,
  glosario: 27,
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

/** Texto sin marcado, sin marcas `[verificar]` y con espacios normalizados, para comparar con el guion. */
function normalizar(texto: string): string {
  return textoPlanoDeMarkdown(texto.replace(/\s*\[verificar\]/gi, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

/* -------------------------------------------------------------------------------------------
 * Esquema y recursos
 * ----------------------------------------------------------------------------------------- */

describe('módulo 6: esquema, carpeta y recursos', () => {
  it('pasa el esquema real y la auditoría del proyecto sin problemas', () => {
    expect(auditoria.problemas, `\n - ${auditoria.problemas.join('\n - ')}\n`).toEqual([]);
    expect(modulo.numero).toBe(6);
    expect(modulo.slug).toBe('el_paso_del_tiempo');
  });

  it('sigue en borrador hasta que el docente lo apruebe', () => {
    expect(modulo.estado_revision.estado).toBe('borrador');
  });

  it('el peso de content.json es razonable (tope ' + TOPE_PESO_BYTES / 1024 + ' KB)', () => {
    expect(new TextEncoder().encode(contenidoTexto).length).toBeLessThan(TOPE_PESO_BYTES);
  });

  it('solo advierte de un término del glosario que únicamente aparece en la tabla y los objetivos', () => {
    const sinEnlace = advertenciasDeModulo(modulo)
      .filter((a) => a.includes('no está enlazado'))
      .map((a) => /"([^"]+)"/.exec(a)![1]);
    // Micropetrosis solo se nombra en la tabla «Qué cambia» (donde el esquema no admite enlaces) y en un
    // objetivo que ya lleva otro enlace; adipogénesis y microdaño los enlaza la escena 3D del trabecular.
    expect(sinEnlace.sort()).toEqual(['micropetrosis']);
  });

  it('cada SVG que usa el módulo existe y los seis dibujos del guion están todos referenciados', () => {
    const usados = new Set<string>();
    recorrerCadenas(modulo, [], (texto) => {
      const m = /^\/images\/m6\/(m6_[a-z0-9_]+)\.svg$/.exec(texto);
      if (m) usados.add(m[1]!);
    });
    for (const nombre of usados) {
      expect(archivosPublicos.has(`/public/images/m6/${nombre}.svg`), nombre).toBe(true);
    }
    // El séptimo dibujo del guion (tejido envejecido) es de la multicapa; hay siete en total.
    expect([...usados].sort()).toEqual(
      [
        'm6_atm_cambios_degenerativos',
        'm6_curva_masa_osea',
        'm6_escena_estrogeno_rankl',
        'm6_hueso_normal_osteoporotico',
        'm6_prevencion_mapa',
        'm6_reborde_alveolar_cascada',
        'm6_tejido_oseo_envejecido',
      ].sort(),
    );
  });
});

/* -------------------------------------------------------------------------------------------
 * Cobertura respecto al guion
 * ----------------------------------------------------------------------------------------- */

describe('módulo 6: cobertura del guion', () => {
  /** Todas las actividades del módulo, con las exploraciones 3D añadidas fuera del guion. */
  const todas = listarActividades(modulo);
  /** Las del guion: sin las exploraciones 3D extra. */
  const ubicadas = todas.filter((u) => !ID_EXTRAS_3D.has(u.actividad.id));

  it('el guion se parseó como se espera (5 secciones y 14 actividades)', () => {
    expect(seccionesGuion).toHaveLength(FICHA.secciones);
    expect(actividadesGuion).toHaveLength(FICHA.actividades);
    expect(actividadesGuion.filter((a) => a.obligatoria)).toHaveLength(FICHA.obligatorias);
  });

  it('tiene las secciones del guion, en orden, con su id y su título', () => {
    expect(modulo.secciones.map((s) => s.id)).toEqual(seccionesGuion.map((s) => s.id));
    expect(modulo.secciones.map((s) => s.titulo)).toEqual(seccionesGuion.map((s) => s.titulo));
    expect(modulo.secciones.map((s) => s.id)).toEqual([
      'm6_1_curva_y_menopausia',
      'm6_2_celulas_y_matriz',
      'm6_3_osteoporosis',
      'm6_4_mandibula_y_tiempo',
      'm6_5_prevenir_e_intervenir',
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
    expect(guion).toContain(
      `Puntaje maximo del modulo: ${FICHA.total} puntos en total (suma de los \`puntaje_max\`): ${FICHA.obligatorio} en actividades obligatorias`,
    );
    expect(puntajeMaximoModulo(modulo)).toBeLessThanOrEqual(PUNTAJE_MODULO_MAX);
    expect(puntajeMaximoModulo(modulo)).toBeGreaterThanOrEqual(PUNTAJE_MODULO_MIN);
  });

  it('cuenta 14 actividades del guion (2 multicapa, 7 quiz, 2 relaciones, 1 video, 1 arrastre y 1 exploración 3D) más las 3D extra', () => {
    expect(contarActividadesPorTipo(modulo)).toEqual({
      multicapa: 2,
      quiz: 7,
      'relacion-columnas': 2,
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

  it('los quiz conservan sus preguntas (ids, formato, respuesta correcta) y suman 28, 8 en la evaluación final', () => {
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
          expect(String(p.correcta), pg.id).toBe(pg.correcta === 'verdadero' ? 'true' : 'false');
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
    const final = ubicadas.find((u) => u.actividad.id === 'm6_5_evaluacion_final')!.actividad;
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
        // En el guion, esclerostina y osteocalcina están en `moleculas` y en `distractores`.
        expect(a.config.moleculas.length, `${g.id} moleculas`).toBe(l.moleculas);
        expect(a.config.receptores.length, `${g.id} receptores`).toBe(l.receptores);
        expect(a.config.pares.length, `${g.id} pares`).toBe(l.pares);
        expect(a.config.distractores?.length ?? 0, `${g.id} distractores`).toBe(l.distractores);
      } else if (a.tipo === 'exploracion-3d') {
        expect(a.config.nodos.length, `${g.id} hotspots`).toBe(l.hotspots);
        expect(a.config.requeridos.length, `${g.id} requeridos`).toBe(l.requeridos);
      }
    }
  });

  it('cada actividad con dibujo usa el SVG que cita el guion', () => {
    let comprobadas = 0;
    for (const g of actividadesGuion.filter((x) => x.svg)) {
      const a = ubicadas.find((x) => x.actividad.id === g.id)!.actividad;
      const ruta = `/images/m6/${g.svg}.svg`;
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
    // Video de la curva, arrastre de la escena y las dos multicapa.
    expect(comprobadas).toBe(4);
  });

  it('los receptores del arrastre están sobre los sitios dibujados en su SVG', () => {
    // Centros (viewBox 800x600) de los sitios que dibuja m6_escena_estrogeno_rankl.svg.
    const sitios: Record<string, [number, number]> = {
      rec_receptor_er_alfa: [133, 150],
      rec_rankl_membrana: [445, 150],
      rec_receptor_rank: [665, 114],
      rec_receptor_cfms: [197, 412],
      rec_receptor_tnf: [598, 412],
    };
    const a = ubicadas.find((u) => u.actividad.id === 'm6_1_arrastre_estrogenos')!.actividad;
    if (a.tipo !== 'arrastre-molecular') throw new Error('tipo inesperado');
    expect(a.config.receptores.length).toBe(Object.keys(sitios).length);
    for (const r of a.config.receptores) {
      const [x, y] = sitios[r.id]!;
      expect(Math.abs(r.posicion.x - (x / 800) * 100), `${r.id} x`).toBeLessThanOrEqual(3);
      expect(Math.abs(r.posicion.y - (y / 600) * 100), `${r.id} y`).toBeLessThanOrEqual(3);
    }
  });

  it('cada paso de la animación de la curva conserva el eje (`visibles` oculta todo lo demás)', () => {
    const a = ubicadas.find((u) => u.actividad.id === 'm6_1_video_curva')!.actividad;
    if (a.tipo !== 'video-texto' || a.config.medio !== 'animacion') throw new Error('animación');
    for (const paso of a.config.pasos) {
      expect(paso.visibles, paso.id).toContain('eje_edad_masa');
      expect(paso.visibles, paso.id).toContain('curva_mujer');
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

  it('las actividades van al final de su sección (solo el texto de contexto del arrastre queda en medio)', () => {
    for (const s of modulo.secciones) {
      const tipos = s.bloques.map((b) => b.tipo);
      const primera = tipos.indexOf('actividad');
      // El convertidor deja la oración de contexto de una instrucción demasiado larga en un bloque
      // `..._contexto` justo antes de su actividad (sección 6.1, arrastre de los estrógenos).
      const despues = s.bloques.slice(primera).filter((b) => b.tipo !== 'actividad');
      expect(
        despues.map((b) => b.id),
        s.id,
      ).toEqual(s.id === 'm6_1_curva_y_menopausia' ? ['t_m6_1_arrastre_estrogenos_contexto'] : []);
    }
  });

  it('el logro y la evaluación final salen de la ficha del guion', () => {
    expect(guion).toContain('cronista ("Cronista")');
    const final = ubicadas.find((u) => u.actividad.id === 'm6_5_evaluacion_final')!.actividad;
    expect(final.obligatoria).toBe(true);
    expect(final.puntaje_max).toBe(100);
    // Umbral propuesto en la ficha (decisión D02 de docs/revision-docente.md): 70 %, como los demás módulos.
    expect(guion).toContain('alcanzar al menos el 70 % en ella');
    expect(final.aprobacion_min).toBe(0.7);
    // Es la última actividad del módulo.
    expect(ubicadas.at(-1)!.actividad.id).toBe('m6_5_evaluacion_final');
  });

  it('las seis leyendas de figura del guion están como pie de su imagen', () => {
    const imagenes = modulo.secciones
      .flatMap((s) => s.bloques)
      .flatMap((b) => (b.tipo === 'imagen' ? [b] : []));
    expect(imagenes).toHaveLength(6);
    imagenes.forEach((img, i) => {
      expect(img.pie, img.id).toMatch(new RegExp(`^Figura 6\\.${i + 1}\\. `));
    });
    // Y ninguna quedó además como párrafo suelto en cursiva.
    expect(textosVisibles().filter((t) => /(^|\n)\*Figura \d/.test(t.texto))).toEqual([]);
  });

  it('hay un bloque de profundización de posgrado, como en el guion', () => {
    const posgrado = modulo.secciones
      .flatMap((s) => s.bloques)
      .filter((b) => 'nivel' in b && b.nivel === 'posgrado');
    expect(posgrado).toHaveLength(1);
    expect(guion).toMatch(/profundizar|posgrado/i);
  });
});

/* -------------------------------------------------------------------------------------------
 * Lo que ve el estudiante
 * ----------------------------------------------------------------------------------------- */

describe('módulo 6: textos visibles', () => {
  it('no queda ninguna marca [verificar] (las cifras dudosas van en estado_revision)', () => {
    const conMarca = textosVisibles().filter((t) => /\[verificar\]/i.test(t.texto));
    expect(conMarca).toEqual([]);
    expect(modulo.estado_revision.pendientes).toHaveLength(48);
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
        /\bm6_[a-z0-9_]+\b|\b[a-z]{3,}_[a-z]{3,}(_[a-z]+)*\b/.test(
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
    expect(modulo.referencias).toHaveLength(30);
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
    // Cuatro del guion más las exploraciones 3D extra (que también llevan `alt`).
    expect(conAlt.length).toBe(4 + EXTRAS_3D.length);
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
    // Los cuatro tipos del guion aparecen en el módulo.
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

  it('los títulos de las columnas de cada relación son propios, no los genéricos del convertidor', () => {
    for (const { actividad } of listarActividades(modulo)) {
      if (actividad.tipo !== 'relacion-columnas') continue;
      expect(actividad.config.columna_a.titulo, actividad.id).not.toBe('Concepto');
      expect(actividad.config.columna_b.titulo, actividad.id).not.toBe('Descripción');
    }
  });

  it('la lista de las clases de Cawood y Howell tiene un encabezado legible', () => {
    const bloque = modulo.secciones
      .flatMap((s) => s.bloques)
      .find((b) => b.tipo === 'texto' && /\*\*I:\*\* Con dientes/.test(b.markdown));
    expect(bloque && 'markdown' in bloque ? bloque.markdown : '').toMatch(
      /^Clases de \[\*\*Cawood y Howell\*\*\]\(glosario:clasificacion_de_cawood_y_howell\) y forma del reborde/,
    );
  });
});

/* -------------------------------------------------------------------------------------------
 * Glosario
 * ----------------------------------------------------------------------------------------- */

describe('módulo 6: glosario', () => {
  const visible = textosVisibles()
    .filter((t) => !t.ruta.startsWith('glosario'))
    .map((t) => t.texto)
    .join('\n')
    .toLowerCase();

  /** Otras formas en que el texto nombra un término cuyo encabezado es una frase compuesta. */
  const ALIAS: Record<string, string[]> = {
    masa_osea_maxima_pico_de_masa_osea: ['pico de masa ósea'],
    senescencia_celular: ['senescencia'],
    baja_masa_osea_osteopenia: ['osteopenia'],
    microdano_microfisura: ['microdaño', 'microfisura'],
    hueso_alveolar_propio_hueso_fasciculado_bundle: ['hueso alveolar propio'],
    atrofia_mandibular: ['mandíbula atrófica', 'atrofia severa', 'atrofia'],
    clasificacion_de_cawood_y_howell: ['cawood y howell'],
    indice_de_klemetti_indice_cortical_mandibular: ['klemetti'],
    opg_osteoprotegerina: ['opg'],
    sasp_fenotipo_secretor_asociado_a_la_senescencia: ['sasp'],
    productos_de_glicacion_avanzada_age: ['ages', 'glicación (age)'],
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
    expect(usados.size).toBe(modulo.glosario.length - 1);
  });

  it('los términos no se repiten y llevan definición', () => {
    expect(new Set(modulo.glosario.map((t) => t.id)).size).toBe(modulo.glosario.length);
    expect(modulo.glosario).toHaveLength(FICHA.glosario);
    for (const t of modulo.glosario) expect(t.definicion.length, t.id).toBeGreaterThan(15);
  });

  it('el glosario y las referencias del guion están completos', () => {
    const cuerpo = guion.slice(guion.indexOf('\n## Glosario'), guion.indexOf('\n## Referencias'));
    expect(cuerpo.match(/^- \*\*/gm)).toHaveLength(FICHA.glosario);
    const refs = guion.slice(
      guion.indexOf('\n## Referencias'),
      guion.indexOf('\n## Banco de preguntas'),
    );
    expect(refs.match(/^\d+\. /gm)).toHaveLength(modulo.referencias.length);
  });
});
