/**
 * Mantiene sincronizados la guía de autoría (docs/content-schema.md), el esquema y el contrato
 * con el backend:
 *  - Cada ejemplo JSON de la guía (` ```json ejemplo:<nombre> `) valida con su esquema, y cada
 *    ejemplo marcado como inválido (`invalido:<nombre>`) falla. Así la guía no puede enseñar algo
 *    que el esquema rechaza.
 *  - Los vocabularios y los números que cita la guía son los del código.
 *  - Los seis tipos de actividad, los límites de puntaje, intentos y detalle y el patrón de
 *    `activity_id` coinciden con docs/api-contract.md y con el backend (services/api).
 */
import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import guia from '../../../../docs/content-schema.md?raw';
import contrato from '../../../../docs/api-contract.md?raw';
import enumsPy from '../../../../services/api/app/models/enums.py?raw';
import constantesPy from '../../../../services/api/app/core/constants.py?raw';
import {
  API_DETALLE_MAX_BYTES,
  API_INTENTOS_MAX,
  API_PUNTAJE_MAX,
  PATRON_ACTIVITY_ID_API,
  PENALIZACION_POR_INTENTO_DEFECTO,
  PISO_PENALIZACION_DEFECTO,
  PUNTAJE_MODULO_MAX,
  PUNTAJE_MODULO_MIN,
} from './constantes';
import { CATALOGO_NODOS, MODELOS_3D, VISTAS_CAMARA } from './nodos3d';
import {
  ActividadSchema,
  ANIMACIONES_EFECTO,
  BloqueActividadSchema,
  BloqueCalloutSchema,
  BloqueImagenSchema,
  BloqueTablaSchema,
  BloqueTextoSchema,
  EstadoRevisionSchema,
  ESTADOS_REVISION,
  FORMAS_MOLECULA,
  FORMATOS_PREGUNTA,
  NodoEscenaSchema,
  ReferenciaSchema,
  SeccionSchema,
  TerminoGlosarioSchema,
  TIPOS_ACTIVIDAD,
  TIPOS_BLOQUE,
  VARIANTES_CALLOUT,
} from './schema';
import { UMBRAL_RETRO_CORRECTA, UMBRAL_RETRO_PARCIAL } from './scoring';
import { problemasSvg } from './svg';

interface Ejemplo {
  lenguaje: string;
  tipo: 'ejemplo' | 'invalido';
  nombre: string;
  cuerpo: string;
}

/** Bloques de código de la guía con marca `ejemplo:nombre` o `invalido:nombre`. */
function extraerEjemplos(markdown: string): Ejemplo[] {
  const ejemplos: Ejemplo[] = [];
  const lineas = markdown.split('\n');
  for (let i = 0; i < lineas.length; i++) {
    const apertura = /^```(\w+)\s+(ejemplo|invalido):([a-z0-9_]+)\s*$/.exec(lineas[i] ?? '');
    if (!apertura) continue;
    const cuerpo: string[] = [];
    i++;
    while (i < lineas.length && !/^```\s*$/.test(lineas[i] ?? '')) {
      cuerpo.push(lineas[i] ?? '');
      i++;
    }
    ejemplos.push({
      lenguaje: apertura[1] ?? '',
      tipo: apertura[2] as Ejemplo['tipo'],
      nombre: apertura[3] ?? '',
      cuerpo: cuerpo.join('\n'),
    });
  }
  return ejemplos;
}

const ejemplos = extraerEjemplos(guia);

/** Esquema con el que se valida cada ejemplo JSON de la guía. */
const ESQUEMAS: Record<string, ZodType> = {
  glosario_termino: TerminoGlosarioSchema,
  referencia: ReferenciaSchema,
  seccion: SeccionSchema,
  bloque_texto: BloqueTextoSchema,
  bloque_imagen: BloqueImagenSchema,
  bloque_callout: BloqueCalloutSchema,
  bloque_callout_posgrado: BloqueCalloutSchema,
  nodo_3d_ancla: NodoEscenaSchema,
  bloque_tabla: BloqueTablaSchema,
  bloque_actividad: BloqueActividadSchema,
  actividad_multicapa_explorar: ActividadSchema,
  actividad_multicapa_identificar: ActividadSchema,
  actividad_arrastre_molecular: ActividadSchema,
  actividad_relacion_columnas: ActividadSchema,
  actividad_quiz: ActividadSchema,
  actividad_video_texto_animacion: ActividadSchema,
  actividad_video_texto_video: ActividadSchema,
  actividad_exploracion_3d: ActividadSchema,
  actividad_exploracion_3d_procedural: ActividadSchema,
  estado_revision: EstadoRevisionSchema,
};

describe('ejemplos de docs/content-schema.md', () => {
  it('la guía trae un ejemplo de cada bloque, de cada tipo de actividad y de cada variante', () => {
    const nombres = ejemplos
      .filter((e) => e.tipo === 'ejemplo' && e.lenguaje === 'json')
      .map((e) => e.nombre);
    expect([...nombres].sort()).toEqual(Object.keys(ESQUEMAS).sort());
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  for (const ejemplo of ejemplos.filter((e) => e.tipo === 'ejemplo' && e.lenguaje === 'json')) {
    it(`el ejemplo "${ejemplo.nombre}" es JSON válido para el esquema`, () => {
      const esquema = ESQUEMAS[ejemplo.nombre];
      expect(esquema, `falta el esquema de ${ejemplo.nombre} en la prueba`).toBeDefined();
      const datos: unknown = JSON.parse(ejemplo.cuerpo);
      const resultado = esquema!.safeParse(datos);
      expect(
        resultado.success
          ? []
          : resultado.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      ).toEqual([]);
    });
  }

  it('los ejemplos de actividad son del tipo (y variante) que dicen ser', () => {
    const tipoDe = (nombre: string) => {
      const cuerpo = ejemplos.find((e) => e.nombre === nombre)?.cuerpo ?? '{}';
      return JSON.parse(cuerpo) as {
        tipo?: string;
        config?: { modo?: string; medio?: string; modelo?: string };
      };
    };
    expect(tipoDe('actividad_multicapa_explorar')).toMatchObject({
      tipo: 'multicapa',
      config: { modo: 'explorar' },
    });
    expect(tipoDe('actividad_multicapa_identificar')).toMatchObject({
      tipo: 'multicapa',
      config: { modo: 'identificar' },
    });
    expect(tipoDe('actividad_arrastre_molecular').tipo).toBe('arrastre-molecular');
    expect(tipoDe('actividad_relacion_columnas').tipo).toBe('relacion-columnas');
    expect(tipoDe('actividad_quiz').tipo).toBe('quiz');
    expect(tipoDe('actividad_video_texto_animacion')).toMatchObject({
      tipo: 'video-texto',
      config: { medio: 'animacion' },
    });
    expect(tipoDe('actividad_video_texto_video')).toMatchObject({
      tipo: 'video-texto',
      config: { medio: 'video' },
    });
    expect(tipoDe('actividad_exploracion_3d')).toMatchObject({
      tipo: 'exploracion-3d',
      config: { modelo: 'mandibula' },
    });
    expect(tipoDe('actividad_exploracion_3d_procedural')).toMatchObject({
      tipo: 'exploracion-3d',
      config: { modelo: 'procedural' },
    });
  });

  it('el quiz de la guía usa los tres formatos de pregunta', () => {
    const quiz = JSON.parse(
      ejemplos.find((e) => e.nombre === 'actividad_quiz')?.cuerpo ?? '{}',
    ) as {
      config: { preguntas: { formato: string }[] };
    };
    expect(new Set(quiz.config.preguntas.map((p) => p.formato))).toEqual(
      new Set(FORMATOS_PREGUNTA),
    );
  });

  it('el SVG mínimo de la guía es válido y el marcado como inválido se rechaza por lo que dice', () => {
    const minimo = ejemplos.find((e) => e.nombre === 'svg_minimo');
    expect(minimo?.lenguaje).toBe('svg');
    expect(
      problemasSvg(minimo?.cuerpo ?? '', {
        viewBox: '0 0 800 600',
        capas: ['capa_hueso_compacto', 'capa_medula_osea'],
      }),
    ).toEqual([]);

    const invalido = ejemplos.find((e) => e.nombre === 'svg_prohibido');
    const problemas = problemasSvg(invalido?.cuerpo ?? '');
    expect(problemas.some((p) => p.includes('<script>'))).toBe(true);
    expect(problemas.some((p) => p.includes('on*='))).toBe(true);
    expect(problemas.some((p) => p.includes('Referencia externa'))).toBe(true);
  });
});

describe('vocabularios y números de la guía = los del código', () => {
  const menciona = (texto: string) => guia.includes(texto);

  it('cita los 6 tipos de actividad, los 5 de bloque, las 4 variantes de callout y los 3 estados', () => {
    for (const valor of [
      ...TIPOS_ACTIVIDAD,
      ...TIPOS_BLOQUE,
      ...VARIANTES_CALLOUT,
      ...ESTADOS_REVISION,
    ]) {
      expect(
        menciona(`\`${valor}\``) || menciona(`"${valor}"`) || menciona(`**\`${valor}\`**`),
        valor,
      ).toBe(true);
    }
  });

  it('cita las animaciones del efecto, las formas de molécula, las vistas de cámara y los modelos 3D', () => {
    for (const valor of [
      ...ANIMACIONES_EFECTO,
      ...FORMAS_MOLECULA,
      ...VISTAS_CAMARA,
      ...MODELOS_3D,
      ...FORMATOS_PREGUNTA,
    ]) {
      expect(menciona(valor), valor).toBe(true);
    }
  });

  it('lista todos los nodos del catálogo 3D', () => {
    for (const modelo of MODELOS_3D) {
      for (const nodo of CATALOGO_NODOS[modelo])
        expect(menciona(`\`${nodo.id}\``), nodo.id).toBe(true);
    }
  });

  it('los números de puntaje que cita la guía son las constantes', () => {
    expect(menciona(`entre ${PUNTAJE_MODULO_MIN} y ${PUNTAJE_MODULO_MAX} puntos`)).toBe(true);
    const coma = (n: number) => String(n).replace('.', ',');
    expect(menciona(`por_intento = ${coma(PENALIZACION_POR_INTENTO_DEFECTO)}`)).toBe(true);
    expect(menciona(`piso = ${coma(PISO_PENALIZACION_DEFECTO)}`)).toBe(true);
    expect(menciona(`(desde ${coma(UMBRAL_RETRO_CORRECTA)})`)).toBe(true);
    expect(menciona(`(desde ${coma(UMBRAL_RETRO_PARCIAL)})`)).toBe(true);
    expect(menciona(`${API_PUNTAJE_MAX}`)).toBe(true);
    expect(menciona('"por_intento": 0.1, "piso": 0.4')).toBe(true);
  });

  it('tiene la sección "Cambios de API requeridos" con el endpoint propuesto', () => {
    expect(guia).toContain('## 14. Cambios de API requeridos');
    expect(guia).toContain('GET /api/activities/results');
    expect(guia).toContain('mejor_precision');
  });

  it('la tabla de límites cita los máximos que el esquema aplica', () => {
    const filas = [
      '| `instrucciones` de una actividad | 10 a **400** |',
      '| `capas` de una multicapa · `requeridas` | 2 a **15** · 1 a **15** |',
      '| `efecto.descripcion` | 10 a **450** |',
      '| `explicacion` de una pregunta · `enunciado` | 10 a **600** · 10 a 400 |',
      '| `columnas` de una tabla · filas | 2 a **6** · 1 a 12 |',
      '| Puntos de un módulo (suma de `puntaje_max`) | 100 a **1000** |',
    ];
    for (const fila of filas) expect(guia, fila).toContain(fila);
  });

  it('la sección 17 documenta cada hallazgo con su decisión (A, P o R) y su razón', () => {
    const inicio = guia.indexOf('## 17. Decisiones de diseño');
    expect(inicio).toBeGreaterThan(0);
    const filas = guia
      .slice(inicio)
      .split('\n')
      .filter((l) => /^\| \d+ \|/.test(l));
    expect(filas.length).toBeGreaterThanOrEqual(30);
    for (const fila of filas) {
      const celdas = fila.split('|').map((c) => c.trim());
      // ["", "n", "hallazgo", "decisión", "razón", ""]
      expect(celdas, fila).toHaveLength(6);
      expect(celdas[3], fila).toMatch(/^\*\*(A|P|R)\*\*/);
      expect((celdas[4] ?? '').length, fila).toBeGreaterThan(40);
    }
  });

  it('menciona los campos añadidos en el ajuste', () => {
    for (const campo of [
      'aprobacion_min',
      'ancla',
      'pendientes',
      'nivel',
      'dificultad',
      'pistas_extra',
      'encabezado_criterio',
      'data-zona-toque',
      'crearEmisorProgreso',
      'idsSuperadas',
    ]) {
      expect(guia, campo).toContain(campo);
    }
  });
});

describe('contrato con el backend', () => {
  it('docs/api-contract.md lista los mismos 6 tipos de actividad, en el mismo orden', () => {
    const linea = contrato.split('\n').find((l) => l.startsWith('`tipo` ∈'));
    expect(linea, 'no se encontró la línea "`tipo` ∈ ..." del contrato').toBeDefined();
    const tipos = [...(linea ?? '').matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]).slice(1);
    expect(tipos).toEqual([...TIPOS_ACTIVIDAD]);
  });

  it('el enum TipoActividad del backend tiene los mismos valores, en el mismo orden', () => {
    const clase = /class TipoActividad\(StrEnum\):([\s\S]*)$/.exec(enumsPy)?.[1] ?? '';
    const valores = [...clase.matchAll(/=\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
    expect(valores).toEqual([...TIPOS_ACTIVIDAD]);
  });

  it('los límites del backend (puntaje, intentos, detalle, activity_id) son los del contenido', () => {
    const numero = (nombre: string) =>
      new RegExp(`^${nombre}\\s*=\\s*(.+)$`, 'm').exec(constantesPy)?.[1]?.trim();
    expect(numero('MAX_ACTIVITY_SCORE')).toBe(String(API_PUNTAJE_MAX));
    expect(numero('MAX_ACTIVITY_ATTEMPTS')).toBe(String(API_INTENTOS_MAX));
    expect(numero('MAX_ACTIVITY_DETAIL_BYTES')).toBe(`${API_DETALLE_MAX_BYTES / 1024} * 1024`);
    expect(numero('ACTIVITY_ID_PATTERN')).toBe(`r"${PATRON_ACTIVITY_ID_API.source}"`);
  });

  it('el contrato documenta los mismos límites de resultado', () => {
    expect(contrato).toContain('`puntaje` 0..1000');
    expect(contrato).toContain('`intentos` 1..100');
    expect(contrato).toContain('hasta 4 KB serializado');
    expect(contrato).toContain('`^[a-z0-9_-]{1,64}$`');
  });

  it('el contrato ya documenta la lectura de resultados que alimenta EstadoPrevioActividad', () => {
    expect(contrato).toContain('GET /api/activities/results');
    for (const campo of ['mejor_puntaje', 'intentos', 'completada', 'ultimo_intento_en']) {
      expect(contrato, campo).toContain(`"${campo}"`);
    }
    // La guía no la presenta como pendiente: propone solo lo que falta (mejor_precision, límites).
    expect(guia).not.toContain('Mientras el endpoint no exista');
    expect(guia).toContain('`mejor_precision`');
  });
});
