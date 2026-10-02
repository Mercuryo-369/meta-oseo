/**
 * Esquema del contenido de un módulo (`content.json`). Guía de autoría: docs/content-schema.md.
 *
 * Todo el contenido pedagógico vive en JSON, no en código (CLAUDE.md). Este archivo define,
 * con zod 4, qué es un JSON válido y deriva los tipos TypeScript que usan las páginas y los
 * componentes de actividad (`src/activities/types.ts`).
 *
 * Criterios de diseño:
 *  - Los objetos son estrictos: un campo desconocido es un error (casi siempre una errata que
 *    de otro modo se ignoraría en silencio).
 *  - Las claves del JSON van en snake_case en español, como la API. Los valores `tipo` de las
 *    actividades son EXACTAMENTE los del contrato (docs/api-contract.md) y de
 *    `ContextoPedagogico.actividadActual.tipo`.
 *  - Los refinamientos por objeto (una capa requerida existe, la respuesta correcta es una de
 *    las opciones...) viven junto al objeto; los del módulo entero (ids únicos, prefijos, enlaces
 *    al glosario, rangos de puntaje) en `ModuloContenidoSchema`.
 *  - Los refinamientos de zod se ejecutan aunque haya errores "continuables" (una cadena
 *    demasiado corta, una lista vacía): el código debe tolerar listas vacías. Solo se omiten si
 *    algún valor tiene el tipo equivocado, así que dentro de un refinamiento los tipos son fiables.
 */
import { z } from 'zod';
import { MODULOS } from '@/data/modulos';
import {
  ANCHO_REFERENCIA_PX,
  API_PUNTAJE_MAX,
  ID_SECCION_RESERVADO,
  MARGEN_MIN_RECEPTOR_PX,
  PATRON_ID,
  PENALIZACION_POR_INTENTO_DEFECTO,
  PISO_PENALIZACION_DEFECTO,
  PUNTAJE_MODULO_MAX,
  PUNTAJE_MODULO_MIN,
  SEPARACION_MIN_RECEPTORES_PX,
} from './constantes';
import type { TipoId } from './consultas';
import {
  alcanceDeId,
  listarActividades,
  recolectarIds,
  recolectarRecursos,
  recorrerCadenas,
  rutaLegible,
} from './consultas';
import {
  CATALOGO_NODOS,
  ESCENAS_PROCEDURALES,
  MODELO_PROCEDURAL,
  MODELOS_3D,
  MODELOS_CON_ANCLA,
  VISTAS_CAMARA,
  vistasDeEscenaProcedural,
} from './nodos3d';
import {
  idsGlosarioEnTexto,
  problemasMarkdownBloque,
  problemasMarkdownLinea,
  problemasTextoPlano,
} from './texto';

/* -------------------------------------------------------------------------------------------
 * Vocabularios cerrados
 * ----------------------------------------------------------------------------------------- */

/** Los 6 valores de `tipo` del contrato (docs/api-contract.md) en el orden del briefing. */
export const TIPOS_ACTIVIDAD = [
  'multicapa',
  'arrastre-molecular',
  'relacion-columnas',
  'quiz',
  'video-texto',
  'exploracion-3d',
] as const;
export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export const TIPOS_BLOQUE = ['texto', 'imagen', 'callout', 'tabla', 'actividad'] as const;
export type TipoBloque = (typeof TIPOS_BLOQUE)[number];

export const VARIANTES_CALLOUT = ['clinico', 'dato', 'atencion', 'recuerda'] as const;
export type VarianteCallout = (typeof VARIANTES_CALLOUT)[number];
export const ETIQUETA_VARIANTE_CALLOUT: Readonly<Record<VarianteCallout, string>> = {
  clinico: 'Caso clínico',
  dato: 'Dato clave',
  atencion: 'Atención',
  recuerda: 'Recuerda',
};

export const ESTADOS_REVISION = ['borrador', 'revisado_docente', 'aprobado'] as const;
export type EstadoRevision = (typeof ESTADOS_REVISION)[number];

/**
 * Nivel de un bloque de lectura. Sin `nivel`, el bloque es para todos; con `nivel: 'posgrado'` es
 * profundización que solo ve quien tiene `nivel: posgrado` en su perfil (docs/api-contract.md).
 */
export const NIVELES_BLOQUE = ['posgrado'] as const;
const nivelBloque = z.enum(NIVELES_BLOQUE).optional();

export const MODOS_MULTICAPA = ['explorar', 'identificar'] as const;
export const FORMAS_MOLECULA = ['circulo', 'hexagono', 'triangulo', 'rombo', 'cuadrado'] as const;

/**
 * Animaciones del efecto biológico al acoplar una molécula. Son un vocabulario cerrado para que
 * `ActivityDrag` las implemente una sola vez con SVG y GSAP, sin arte específico por contenido.
 *  - `activacion`: pulso y anillos de señal en el receptor.
 *  - `inhibicion`: el receptor se atenúa y aparece un bloqueo.
 *  - `cascada`: la señal avanza del receptor hacia el interior de la célula.
 *  - `union`: encaje neutro con un leve rebote (sin efecto adicional).
 *  - `crecimiento`: la estructura crece o se multiplica.
 *  - `transformacion`: cambio de color y de forma (diferenciación).
 *  - `liberacion`: partículas que salen de la célula (secreción).
 *  - `mineralizacion`: aparecen cristales pequeños (depósito mineral).
 *  - `reabsorcion`: la estructura se encoge o se disuelve.
 */
export const ANIMACIONES_EFECTO = [
  'activacion',
  'inhibicion',
  'cascada',
  'union',
  'crecimiento',
  'transformacion',
  'liberacion',
  'mineralizacion',
  'reabsorcion',
] as const;
export type AnimacionEfecto = (typeof ANIMACIONES_EFECTO)[number];

export const DIRECCIONES_INDICADOR = ['aumenta', 'disminuye', 'sin_cambio'] as const;
export const FORMATOS_PREGUNTA = ['opcion_multiple', 'verdadero_falso', 'ordenar'] as const;
export type FormatoPregunta = (typeof FORMATOS_PREGUNTA)[number];

/* -------------------------------------------------------------------------------------------
 * Primitivas: identificadores, texto, rutas
 * ----------------------------------------------------------------------------------------- */

const MENSAJE_ID =
  'Id inválido: snake_case en minúsculas, empieza por letra, sin tildes ni espacios, máximo 64 caracteres (por ejemplo "capa_periostio").';

/** Id de cualquier elemento del contenido (sección, bloque, capa, opción...). */
export const IdSchema = z.string().regex(PATRON_ID, MENSAJE_ID);

/**
 * Id de actividad. Viaja como `activity_id` a la API (`^[a-z0-9_-]{1,64}$`); PATRON_ID es un
 * subconjunto estricto de ese patrón. El prefijo `m{n}_` lo exige el módulo (ver
 * `ModuloContenidoSchema`): la API suma el mejor puntaje por `activity_id` sin mirar el módulo,
 * así que dos módulos no pueden compartir un id.
 */
export const IdActividadSchema = z.string().regex(PATRON_ID, MENSAJE_ID);

type ContextoRefinamiento = {
  addIssue: (issue: { code: 'custom'; message: string; path?: PropertyKey[] }) => void;
};

function agregar(ctx: ContextoRefinamiento, path: PropertyKey[], message: string): void {
  ctx.addIssue({ code: 'custom', message, path });
}

function textoPlano(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(min, `Mínimo ${min} caracteres.`)
    .max(max, `Máximo ${max} caracteres.`)
    .superRefine((texto, ctx) => {
      for (const problema of problemasTextoPlano(texto)) agregar(ctx, [], problema);
    });
}

function markdownLinea(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(min, `Mínimo ${min} caracteres.`)
    .max(max, `Máximo ${max} caracteres.`)
    .superRefine((texto, ctx) => {
      for (const problema of problemasMarkdownLinea(texto)) agregar(ctx, [], problema);
    });
}

function markdownBloque(min: number, max: number, titulos: boolean) {
  return z
    .string()
    .trim()
    .min(min, `Mínimo ${min} caracteres.`)
    .max(max, `Máximo ${max} caracteres.`)
    .superRefine((texto, ctx) => {
      for (const problema of problemasMarkdownBloque(texto, { titulos })) {
        agregar(ctx, [], problema);
      }
    });
}

const rutaSvg = z
  .string()
  .regex(
    /^\/images\/m[1-6]\/[a-z0-9_]{1,60}\.svg$/,
    'Ruta de SVG inválida: debe ser "/images/m{n}/nombre_en_snake_case.svg" (el archivo vive en apps/web/public/images/m{n}/).',
  );
const rutaImagen = z
  .string()
  .regex(
    /^\/images\/m[1-6]\/[a-z0-9_]{1,60}\.(?:svg|webp|png|jpg|jpeg|avif)$/,
    'Ruta de imagen inválida: debe ser "/images/m{n}/nombre_en_snake_case.{svg|webp|png|jpg|avif}".',
  );
const rutaVideo = z
  .string()
  .regex(
    /^\/videos\/m[1-6]\/[a-z0-9_]{1,60}\.(?:mp4|webm)$/,
    'Ruta de video inválida: debe ser "/videos/m{n}/nombre_en_snake_case.{mp4|webm}".',
  );
const rutaSubtitulos = z
  .string()
  .regex(
    /^\/videos\/m[1-6]\/[a-z0-9_.]{1,60}\.vtt$/,
    'Ruta de subtítulos inválida: debe ser "/videos/m{n}/nombre.vtt".',
  );
const viewBox = z
  .string()
  .regex(
    /^0 0 [1-9]\d{1,4} [1-9]\d{1,4}$/,
    'viewBox inválido: debe ser "0 0 ancho alto" con enteros positivos (por ejemplo "0 0 800 600").',
  );

function duplicados(valores: readonly string[]): string[] {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();
  for (const v of valores) {
    if (vistos.has(v)) repetidos.add(v);
    vistos.add(v);
  }
  return [...repetidos];
}

/* -------------------------------------------------------------------------------------------
 * Campos comunes de toda actividad
 * ----------------------------------------------------------------------------------------- */

/**
 * Penalización por intentos (docs/content-schema.md, "Puntaje"). El factor del intento `n` es
 * `max(piso, 1 - por_intento * (n - 1))`: el primer intento vale 100 %, cada reintento resta
 * `por_intento` y nunca baja de `piso`.
 */
export const PenalizacionSchema = z
  .strictObject({
    por_intento: z.number().min(0).max(0.5).default(PENALIZACION_POR_INTENTO_DEFECTO),
    piso: z.number().min(0).max(1).default(PISO_PENALIZACION_DEFECTO),
  })
  .default({ por_intento: PENALIZACION_POR_INTENTO_DEFECTO, piso: PISO_PENALIZACION_DEFECTO });
export type Penalizacion = z.infer<typeof PenalizacionSchema>;

/**
 * Retroalimentación al terminar la actividad, según la precisión (>= 0,8 `correcta`;
 * >= 0,5 `parcial`; menos `incorrecta`; ver `bandaRetroalimentacion` en scoring.ts).
 */
export const RetroalimentacionSchema = z.strictObject({
  correcta: markdownLinea(10, 400),
  parcial: markdownLinea(10, 400).optional(),
  incorrecta: markdownLinea(10, 400).optional(),
});
export type Retroalimentacion = z.infer<typeof RetroalimentacionSchema>;

const camposComunes = {
  id: IdActividadSchema,
  titulo: textoPlano(3, 100),
  instrucciones: markdownLinea(10, 400),
  /** Si es `true` (por defecto) hay que completarla para avanzar (sección y módulo). */
  obligatoria: z.boolean().default(true),
  /**
   * Precisión mínima (0,5 a 1) de la MEJOR ejecución para dar por superada una actividad
   * obligatoria: `0.7` = 70 % de acierto. Se mide sobre la precisión y no sobre el puntaje, para
   * que la penalización por intentos no haga inalcanzable el umbral. Terminar una ejecución la
   * completa (API) aunque no llegue; la actividad cuenta como superada para secciones y módulos
   * cuando llega (scoring.ts, `actividadSuperada`). Solo actividades que pueden resolverse con
   * errores.
   */
  aprobacion_min: z.number().min(0.5).max(1).optional(),
  puntaje_max: z.number().int().min(1).max(API_PUNTAJE_MAX),
  penalizacion: PenalizacionSchema,
  retroalimentacion: RetroalimentacionSchema,
  /** Qué concepto refuerza, para que el mentor sepa qué repasar si falla. */
  concepto: textoPlano(3, 120),
};

/**
 * `aprobacion_min` solo tiene sentido en una actividad obligatoria que puede resolverse con
 * errores (`puedeFallar`): con precisión siempre 1 no hay nada que aprobar.
 */
function exigirAprobacionCoherente(
  actividad: { obligatoria: boolean; aprobacion_min?: number },
  ctx: ContextoRefinamiento,
  puedeFallar: boolean,
): void {
  if (actividad.aprobacion_min === undefined) return;
  if (!actividad.obligatoria) {
    agregar(ctx, ['aprobacion_min'], '"aprobacion_min" solo se usa en actividades obligatorias.');
  } else if (!puedeFallar) {
    agregar(
      ctx,
      ['aprobacion_min'],
      'Esta actividad no puede resolverse con errores (la precisión es siempre 1): quita "aprobacion_min".',
    );
  }
}

function exigirRetroIncorrecta(
  actividad: { retroalimentacion: Retroalimentacion },
  ctx: ContextoRefinamiento,
): void {
  if (!actividad.retroalimentacion.incorrecta) {
    agregar(
      ctx,
      ['retroalimentacion', 'incorrecta'],
      'Esta actividad puede resolverse con errores: escribe también "retroalimentacion.incorrecta" (qué repasar).',
    );
  }
}

/* -------------------------------------------------------------------------------------------
 * Actividad: multicapa
 * ----------------------------------------------------------------------------------------- */

export const CapaSchema = z.strictObject({
  /** Id del `<g id="...">` de la capa en el SVG. */
  id: IdSchema,
  etiqueta: textoPlano(2, 60),
  descripcion: markdownLinea(10, 500),
  /** Solo en modo "identificar": qué se le pide al estudiante encontrar, sin dar el nombre. */
  pista: markdownLinea(10, 200).optional(),
  /**
   * Consignas adicionales sobre la MISMA capa (hasta 2 más), para cuando la actividad pregunta
   * varias cosas sobre una estructura ("la zona de mayor densidad", "la que crece más rápido").
   * Cada consigna es un toque más y cuenta para la precisión.
   */
  pistas_extra: z.array(markdownLinea(10, 200)).max(2).optional(),
});

export const ConfigMulticapaSchema = z
  .strictObject({
    svg: rutaSvg,
    viewBox,
    /** Descripción de la imagen completa, para lectores de pantalla. */
    alt: textoPlano(10, 300),
    modo: z.enum(MODOS_MULTICAPA),
    capas: z.array(CapaSchema).min(2).max(15),
    /** Capas que hay que visitar (explorar) o identificar (identificar) para completar. */
    requeridas: z.array(IdSchema).min(1).max(15),
  })
  .superRefine((config, ctx) => {
    const ids = new Set(config.capas.map((c) => c.id));
    for (const repetida of duplicados(config.requeridas)) {
      agregar(ctx, ['requeridas'], `La capa requerida "${repetida}" está repetida.`);
    }
    config.requeridas.forEach((id, i) => {
      if (!ids.has(id)) {
        agregar(ctx, ['requeridas', i], `La capa requerida "${id}" no existe en "capas".`);
      }
    });
    config.capas.forEach((capa, i) => {
      if (capa.pistas_extra !== undefined && !capa.pista) {
        agregar(ctx, ['capas', i, 'pistas_extra'], '"pistas_extra" necesita también "pista".');
      }
    });
    if (config.modo === 'identificar') {
      config.requeridas.forEach((id) => {
        const indice = config.capas.findIndex((c) => c.id === id);
        const capa = config.capas[indice];
        if (capa && !capa.pista) {
          agregar(
            ctx,
            ['capas', indice, 'pista'],
            `En modo "identificar", la capa requerida "${id}" necesita "pista" (qué debe encontrar el estudiante).`,
          );
        }
      });
    }
  });

export const ActividadMulticapaSchema = z
  .strictObject({
    ...camposComunes,
    tipo: z.literal('multicapa'),
    config: ConfigMulticapaSchema,
  })
  .superRefine((actividad, ctx) => {
    const identificar = actividad.config.modo === 'identificar';
    if (identificar) exigirRetroIncorrecta(actividad, ctx);
    exigirAprobacionCoherente(actividad, ctx, identificar);
  });

/* -------------------------------------------------------------------------------------------
 * Actividad: arrastre molecular
 * ----------------------------------------------------------------------------------------- */

export const MoleculaSchema = z.strictObject({
  id: IdSchema,
  etiqueta: textoPlano(1, 40),
  descripcion: markdownLinea(10, 300),
  forma: z.enum(FORMAS_MOLECULA).default('circulo'),
  /**
   * Por qué no encaja donde el estudiante la soltó. Es OBLIGATORIO en las moléculas que son
   * distractores (es el único texto que reciben); en las demás, opcional.
   */
  rechazo: markdownLinea(10, 300).optional(),
});

export const ReceptorSchema = z.strictObject({
  id: IdSchema,
  etiqueta: textoPlano(1, 40),
  descripcion: markdownLinea(10, 300),
  /** Posición del centro, en porcentaje del ancho (x) y del alto (y) de la escena. */
  posicion: z.strictObject({ x: z.number().min(5).max(95), y: z.number().min(5).max(95) }),
});

export const IndicadorEfectoSchema = z.strictObject({
  etiqueta: textoPlano(3, 60),
  direccion: z.enum(DIRECCIONES_INDICADOR),
});

export const EfectoBiologicoSchema = z.strictObject({
  titulo: textoPlano(3, 80),
  descripcion: markdownLinea(10, 450),
  animacion: z.enum(ANIMACIONES_EFECTO),
  /** Medidores que cambian al acoplar (por ejemplo "Actividad osteoclástica" aumenta). */
  indicadores: z.array(IndicadorEfectoSchema).max(3).default([]),
});

export const ParMolecularSchema = z.strictObject({
  id: IdSchema,
  molecula: IdSchema,
  receptor: IdSchema,
  efecto: EfectoBiologicoSchema,
});

/** Ancho y alto del `viewBox` "0 0 W H", o `null` si no tiene ese formato. */
export function dimensionesDeViewBox(texto: string): { ancho: number; alto: number } | null {
  const m = /^0 0 ([1-9]\d{1,4}) ([1-9]\d{1,4})$/.exec(texto);
  return m ? { ancho: Number(m[1]), alto: Number(m[2]) } : null;
}

export const ConfigArrastreMolecularSchema = z
  .strictObject({
    escena: z.strictObject({
      viewBox,
      /** SVG de fondo opcional (por ejemplo la membrana celular); sin él, la escena es lisa. */
      fondo_svg: rutaSvg.optional(),
      alt: textoPlano(10, 300),
    }),
    moleculas: z.array(MoleculaSchema).min(2).max(8),
    receptores: z.array(ReceptorSchema).min(1).max(6),
    pares: z.array(ParMolecularSchema).min(1).max(6),
    /** Moléculas que no encajan en ningún receptor (opciones incorrectas a propósito). */
    distractores: z.array(IdSchema).max(4).default([]),
  })
  .superRefine((config, ctx) => {
    const moleculas = new Set(config.moleculas.map((m) => m.id));
    const receptores = new Set(config.receptores.map((r) => r.id));
    const enPar = new Set<string>();
    const receptoresEnPar = new Set<string>();
    config.pares.forEach((par, i) => {
      if (!moleculas.has(par.molecula)) {
        agregar(
          ctx,
          ['pares', i, 'molecula'],
          `La molécula "${par.molecula}" no existe en "moleculas".`,
        );
      }
      if (!receptores.has(par.receptor)) {
        agregar(
          ctx,
          ['pares', i, 'receptor'],
          `El receptor "${par.receptor}" no existe en "receptores".`,
        );
      }
      // Cada molécula encaja en UN receptor; en cambio un receptor puede aceptar varias moléculas
      // (por ejemplo LRP5/6 con Wnt, que lo activa, y con la esclerostina, que lo bloquea).
      if (enPar.has(par.molecula)) {
        agregar(
          ctx,
          ['pares', i, 'molecula'],
          `La molécula "${par.molecula}" aparece en más de un par (cada molécula encaja en un solo receptor).`,
        );
      }
      enPar.add(par.molecula);
      receptoresEnPar.add(par.receptor);
    });
    config.receptores.forEach((r, i) => {
      if (!receptoresEnPar.has(r.id)) {
        agregar(
          ctx,
          ['receptores', i],
          `El receptor "${r.id}" no tiene par: todo receptor debe aceptar al menos una molécula.`,
        );
      }
    });
    for (const repetido of duplicados(config.distractores)) {
      agregar(ctx, ['distractores'], `El distractor "${repetido}" está repetido.`);
    }
    const distractores = new Set(config.distractores);
    config.distractores.forEach((id, i) => {
      if (!moleculas.has(id)) {
        agregar(ctx, ['distractores', i], `El distractor "${id}" no existe en "moleculas".`);
      } else if (enPar.has(id)) {
        agregar(
          ctx,
          ['distractores', i],
          `"${id}" es distractor pero también forma un par válido; un distractor no encaja en ningún receptor.`,
        );
      }
    });
    config.moleculas.forEach((m, i) => {
      if (!enPar.has(m.id) && !distractores.has(m.id)) {
        agregar(
          ctx,
          ['moleculas', i],
          `La molécula "${m.id}" no forma ningún par ni está en "distractores".`,
        );
      }
      if (distractores.has(m.id) && !m.rechazo) {
        agregar(
          ctx,
          ['moleculas', i, 'rechazo'],
          `La molécula "${m.id}" es distractor: escribe "rechazo" (por qué no encaja donde la suelta el estudiante).`,
        );
      }
    });

    // Geometría en píxeles de un teléfono de 320 px de ancho: la escena se muestra a ancho
    // completo y su alto sale del viewBox, así que la distancia y los márgenes se miden en px
    // (un porcentaje del alto no vale lo mismo que uno del ancho).
    const medidas = dimensionesDeViewBox(config.escena.viewBox);
    if (!medidas) return;
    const anchoPx = ANCHO_REFERENCIA_PX;
    const altoPx = (ANCHO_REFERENCIA_PX * medidas.alto) / medidas.ancho;
    const aPx = (r: { posicion: { x: number; y: number } }) => ({
      x: (r.posicion.x / 100) * anchoPx,
      y: (r.posicion.y / 100) * altoPx,
    });
    config.receptores.forEach((r, i) => {
      const { x, y } = aPx(r);
      const margen = MARGEN_MIN_RECEPTOR_PX;
      if (x < margen || x > anchoPx - margen || y < margen || y > altoPx - margen) {
        const minX = Math.ceil((margen / anchoPx) * 100);
        const minY = Math.ceil((margen / altoPx) * 100);
        agregar(
          ctx,
          ['receptores', i, 'posicion'],
          `El receptor "${r.id}" queda a menos de ${margen} px de un borde en un teléfono de ${anchoPx} px: su zona táctil de 44 px se saldría de la escena. Con este viewBox, "x" debe estar entre ${minX} y ${100 - minX} e "y" entre ${minY} y ${100 - minY}.`,
        );
      }
    });
    for (let i = 0; i < config.receptores.length; i++) {
      for (let j = i + 1; j < config.receptores.length; j++) {
        const a = config.receptores[i];
        const b = config.receptores[j];
        if (!a || !b) continue;
        const pa = aPx(a);
        const pb = aPx(b);
        const distancia = Math.hypot(pa.x - pb.x, pa.y - pb.y);
        if (distancia < SEPARACION_MIN_RECEPTORES_PX) {
          agregar(
            ctx,
            ['receptores', j, 'posicion'],
            `Los receptores "${a.id}" y "${b.id}" quedan a ${distancia.toFixed(0)} px en un teléfono de ${anchoPx} px; deben separarse al menos ${SEPARACION_MIN_RECEPTORES_PX} px (44 px de zona táctil más 8 px de aire). Aléjalos, teniendo en cuenta que el alto de la escena es ${altoPx.toFixed(0)} px.`,
          );
        }
      }
    }
  });

export const ActividadArrastreMolecularSchema = z
  .strictObject({
    ...camposComunes,
    tipo: z.literal('arrastre-molecular'),
    config: ConfigArrastreMolecularSchema,
  })
  .superRefine((actividad, ctx) => {
    exigirRetroIncorrecta(actividad, ctx);
    exigirAprobacionCoherente(actividad, ctx, true);
  });

/* -------------------------------------------------------------------------------------------
 * Actividad: relación de columnas
 * ----------------------------------------------------------------------------------------- */

export const ElementoColumnaSchema = z.strictObject({
  id: IdSchema,
  texto: markdownLinea(2, 140),
});

export const ParColumnasSchema = z.strictObject({
  id: IdSchema,
  /** Id del elemento de la columna A. */
  a: IdSchema,
  /** Id del elemento de la columna B. */
  b: IdSchema,
  /** Se muestra al acertar el par (retroalimentación inmediata). */
  explicacion: markdownLinea(10, 300),
});

export const ConfigRelacionColumnasSchema = z
  .strictObject({
    columna_a: z.strictObject({
      titulo: textoPlano(2, 40),
      elementos: z.array(ElementoColumnaSchema).min(3).max(8),
    }),
    columna_b: z.strictObject({
      titulo: textoPlano(2, 40),
      /** Puede traer hasta 3 elementos más que la columna A: son distractores sin pareja. */
      elementos: z.array(ElementoColumnaSchema).min(3).max(11),
    }),
    pares: z.array(ParColumnasSchema).min(3).max(8),
    barajar: z.boolean().default(true),
  })
  .superRefine((config, ctx) => {
    const a = new Set(config.columna_a.elementos.map((e) => e.id));
    const b = new Set(config.columna_b.elementos.map((e) => e.id));
    const usadosA = new Set<string>();
    const usadosB = new Set<string>();
    config.pares.forEach((par, i) => {
      if (!a.has(par.a)) {
        agregar(ctx, ['pares', i, 'a'], `El elemento "${par.a}" no existe en "columna_a".`);
      }
      if (!b.has(par.b)) {
        agregar(ctx, ['pares', i, 'b'], `El elemento "${par.b}" no existe en "columna_b".`);
      }
      if (usadosA.has(par.a)) {
        agregar(ctx, ['pares', i, 'a'], `El elemento "${par.a}" de la columna A ya tiene pareja.`);
      }
      if (usadosB.has(par.b)) {
        agregar(ctx, ['pares', i, 'b'], `El elemento "${par.b}" de la columna B ya tiene pareja.`);
      }
      usadosA.add(par.a);
      usadosB.add(par.b);
    });
    config.columna_a.elementos.forEach((e, i) => {
      if (!usadosA.has(e.id)) {
        agregar(
          ctx,
          ['columna_a', 'elementos', i],
          `El elemento "${e.id}" de la columna A no tiene par: todos los elementos de A deben relacionarse.`,
        );
      }
    });
    const extras = config.columna_b.elementos.filter((e) => !usadosB.has(e.id)).length;
    if (extras > 3) {
      agregar(
        ctx,
        ['columna_b', 'elementos'],
        `La columna B tiene ${extras} elementos sin pareja; el máximo son 3 distractores.`,
      );
    }
  });

export const ActividadRelacionColumnasSchema = z
  .strictObject({
    ...camposComunes,
    tipo: z.literal('relacion-columnas'),
    config: ConfigRelacionColumnasSchema,
  })
  .superRefine((actividad, ctx) => {
    exigirRetroIncorrecta(actividad, ctx);
    exigirAprobacionCoherente(actividad, ctx, true);
  });

/* -------------------------------------------------------------------------------------------
 * Actividad: quiz
 * ----------------------------------------------------------------------------------------- */

export const OpcionQuizSchema = z.strictObject({
  id: IdSchema,
  texto: markdownLinea(1, 200),
  /** Por qué esta opción es incorrecta (o por qué es correcta). Opcional. */
  explicacion: markdownLinea(10, 300).optional(),
});

export const PasoOrdenSchema = z.strictObject({
  id: IdSchema,
  texto: markdownLinea(2, 140),
});

const camposPregunta = {
  id: IdSchema,
  enunciado: markdownLinea(10, 400),
  /** Retroalimentación inmediata tras responder (briefing: "explicación breve"). */
  explicacion: markdownLinea(10, 600),
  /** Concepto que evalúa la pregunta (si difiere del de la actividad). */
  concepto: textoPlano(3, 120).optional(),
  /**
   * Dificultad: 1 básica, 2 intermedia, 3 avanzada (los guiones marcan las de 3 como de
   * posgrado). Sirve al mentor para graduar la ayuda y al docente para leer las estadísticas.
   */
  dificultad: z.number().int().min(1).max(3).optional(),
};

/**
 * Una o varias correctas. Con una sola correcta la interfaz usa botones de radio; con varias,
 * casillas ("Marca todas las correctas"). La precisión de la pregunta es
 * `max(0, (correctas marcadas - incorrectas marcadas) / total de correctas)`.
 */
export const PreguntaOpcionMultipleSchema = z
  .strictObject({
    ...camposPregunta,
    formato: z.literal('opcion_multiple'),
    opciones: z.array(OpcionQuizSchema).min(3).max(6),
    correctas: z.array(IdSchema).min(1).max(5),
  })
  .superRefine((pregunta, ctx) => {
    const ids = new Set(pregunta.opciones.map((o) => o.id));
    for (const repetida of duplicados(pregunta.correctas)) {
      agregar(ctx, ['correctas'], `La opción correcta "${repetida}" está repetida.`);
    }
    pregunta.correctas.forEach((id, i) => {
      if (!ids.has(id)) {
        agregar(ctx, ['correctas', i], `La opción correcta "${id}" no existe en "opciones".`);
      }
    });
    const incorrectas = pregunta.opciones.length - pregunta.correctas.length;
    if (incorrectas < 1) {
      agregar(ctx, ['correctas'], 'Debe haber al menos una opción incorrecta.');
    } else if (pregunta.correctas.length > 1 && incorrectas < pregunta.correctas.length) {
      // Con varias correctas, marcarlo todo no puede puntuar: se necesitan al menos tantas
      // incorrectas como correctas (la precisión es (correctas - incorrectas marcadas) / correctas).
      agregar(
        ctx,
        ['opciones'],
        `Con ${pregunta.correctas.length} correctas hacen falta al menos ${pregunta.correctas.length} incorrectas (hay ${incorrectas}); si no, marcar todas las opciones daría puntos sin saber la respuesta.`,
      );
    }
  });

export const PreguntaVerdaderoFalsoSchema = z.strictObject({
  ...camposPregunta,
  formato: z.literal('verdadero_falso'),
  correcta: z.boolean(),
});

/** El orden del arreglo `pasos` ES el orden correcto; la interfaz los baraja para mostrarlos. */
export const PreguntaOrdenarSchema = z.strictObject({
  ...camposPregunta,
  formato: z.literal('ordenar'),
  pasos: z.array(PasoOrdenSchema).min(3).max(7),
});

export const PreguntaSchema = z.discriminatedUnion('formato', [
  PreguntaOpcionMultipleSchema,
  PreguntaVerdaderoFalsoSchema,
  PreguntaOrdenarSchema,
]);

export const ConfigQuizSchema = z.strictObject({
  preguntas: z.array(PreguntaSchema).min(1).max(20),
  barajar_preguntas: z.boolean().default(false),
  barajar_opciones: z.boolean().default(true),
  /**
   * Preguntas de refuerzo generadas por la IA (F4-03) al terminar el quiz. NO puntúan: son
   * práctica, porque el servidor no puede validar contenido que no escribió el docente.
   */
  preguntas_ia: z.strictObject({ cantidad: z.number().int().min(1).max(5) }).optional(),
});

export const ActividadQuizSchema = z
  .strictObject({
    ...camposComunes,
    tipo: z.literal('quiz'),
    config: ConfigQuizSchema,
  })
  .superRefine((actividad, ctx) => {
    exigirRetroIncorrecta(actividad, ctx);
    exigirAprobacionCoherente(actividad, ctx, true);
  });

/* -------------------------------------------------------------------------------------------
 * Actividad: video + texto
 * ----------------------------------------------------------------------------------------- */

/**
 * Cada paso de la animación es un estado del SVG: `visibles` son los `<g id>` que se muestran
 * (el resto se oculta) y `resaltadas` las que se destacan. Los ids deben existir en el SVG
 * (se comprueba en auditarRecursos, svg.ts).
 */
export const PasoAnimacionSchema = z
  .strictObject({
    id: IdSchema,
    titulo: textoPlano(3, 80),
    texto: markdownLinea(10, 500),
    visibles: z.array(IdSchema).min(1).max(30),
    resaltadas: z.array(IdSchema).max(10).default([]),
  })
  .superRefine((paso, ctx) => {
    const visibles = new Set(paso.visibles);
    paso.resaltadas.forEach((id, i) => {
      if (!visibles.has(id)) {
        agregar(ctx, ['resaltadas', i], `"${id}" está resaltada pero no está en "visibles".`);
      }
    });
  });

export const ConfigAnimacionSchema = z.strictObject({
  medio: z.literal('animacion'),
  svg: rutaSvg,
  viewBox,
  alt: textoPlano(10, 300),
  pasos: z.array(PasoAnimacionSchema).min(2).max(10),
});

export const SubtituloSchema = z.strictObject({
  idioma: z.enum(['es', 'en']),
  etiqueta: textoPlano(2, 30),
  src: rutaSubtitulos,
});

export const HitoVideoSchema = z.strictObject({
  t_seg: z.number().int().min(0),
  titulo: textoPlano(3, 80),
});

/** Video real aportado por el docente. Sin subtítulos y transcripción no se acepta. */
export const ConfigVideoSchema = z
  .strictObject({
    medio: z.literal('video'),
    src: rutaVideo,
    poster: rutaImagen.optional(),
    duracion_seg: z.number().int().min(5).max(1800),
    subtitulos: z.array(SubtituloSchema).min(1).max(3),
    transcripcion: markdownBloque(50, 6000, false),
    hitos: z.array(HitoVideoSchema).max(10).default([]),
  })
  .superRefine((config, ctx) => {
    for (const repetido of duplicados(config.subtitulos.map((s) => s.idioma))) {
      agregar(ctx, ['subtitulos'], `Hay dos pistas de subtítulos en idioma "${repetido}".`);
    }
    let anterior = -1;
    config.hitos.forEach((hito, i) => {
      if (hito.t_seg <= anterior) {
        agregar(ctx, ['hitos', i, 't_seg'], 'Los hitos deben ir en orden cronológico estricto.');
      }
      if (hito.t_seg >= config.duracion_seg) {
        agregar(ctx, ['hitos', i, 't_seg'], 'Un hito no puede estar al final o después del video.');
      }
      anterior = hito.t_seg;
    });
  });

export const ConfigVideoTextoSchema = z.discriminatedUnion('medio', [
  ConfigAnimacionSchema,
  ConfigVideoSchema,
]);

export const ActividadVideoTextoSchema = z
  .strictObject({
    ...camposComunes,
    tipo: z.literal('video-texto'),
    config: ConfigVideoTextoSchema,
  })
  .superRefine((actividad, ctx) => exigirAprobacionCoherente(actividad, ctx, false));

/* -------------------------------------------------------------------------------------------
 * Actividad: exploración 3D
 * ----------------------------------------------------------------------------------------- */

export const CamaraNodoSchema = z.strictObject({
  vista: z.enum(VISTAS_CAMARA).default('frontal'),
  /** 1 = encuadre automático del nodo; 2 = el doble de cerca; 0,5 = la mitad. */
  zoom: z.number().min(0.5).max(3).default(1),
});

/** Punto del modelo en coordenadas normalizadas (0 a 1) de su caja envolvente (nodos3d.ts). */
export const AnclaNodoSchema = z.strictObject({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  z: z.number().min(0).max(1),
});

export const NodoEscenaSchema = z.strictObject({
  /**
   * Nombre del nodo en el GLB (catálogo en nodos3d.ts) o, si lleva `ancla`, un id libre en
   * snake_case.
   */
  id: IdSchema,
  etiqueta: textoPlano(2, 60),
  descripcion: markdownLinea(10, 500),
  /**
   * Para zonas que no son una pieza del GLB (una cresta, un foramen, una zona de compresión) o
   * mientras el modelo sea una sola malla: el punto del modelo al que apunta la ficha. Solo en
   * el modelo `mandibula`.
   */
  ancla: AnclaNodoSchema.optional(),
  camara: CamaraNodoSchema.optional(),
});

/**
 * Paso de la línea de tiempo de una escena procedural: un hito en el tiempo `t` (0 a 1) con su
 * título, su texto y la vista de cámara con nombre de esa escena (`VISTAS_ESCENA_PROCEDURAL`).
 * Visitar un paso es detener la línea de tiempo en él o pasar por él.
 */
export const PasoLineaTiempoSchema = z.strictObject({
  id: IdSchema,
  t: z.number().min(0).max(1),
  titulo: textoPlano(2, 60),
  texto: markdownLinea(10, 500),
  /** Vista de cámara con nombre de la escena; por defecto `general`. */
  vista: IdSchema.default('general'),
});

export const LineaTiempoSchema = z.strictObject({
  pasos: z.array(PasoLineaTiempoSchema).min(2).max(12),
});

export const ConfigExploracion3dSchema = z
  .strictObject({
    /** `mandibula` o `celulas` (GLB con nodos) o `procedural` (escena hecha por código). */
    modelo: z.enum([...MODELOS_3D, MODELO_PROCEDURAL]),
    /** Descripción del modelo para lectores de pantalla. */
    alt: textoPlano(10, 300),
    /**
     * Partes del modelo (2 a 12). Solo en los modelos con GLB: una escena `procedural` no lleva
     * `nodos` (sus partes son los pasos de `linea_de_tiempo`).
     */
    nodos: z.array(NodoEscenaSchema).max(12).default([]),
    /** Ids de nodos (o de pasos, en `procedural`) que hay que visitar para completar. */
    requeridos: z.array(IdSchema).min(1).max(12),
    /** Solo `procedural`: la escena del registro `scenes/procedural/registro.ts`. */
    escena: z.enum(ESCENAS_PROCEDURALES).optional(),
    /** Solo `procedural`: los pasos de la línea de tiempo. */
    linea_de_tiempo: LineaTiempoSchema.optional(),
  })
  .superRefine((config, ctx) => {
    if (config.modelo === MODELO_PROCEDURAL) {
      validarProcedural(config, ctx);
      return;
    }
    if (config.escena !== undefined) {
      agregar(ctx, ['escena'], '"escena" solo se usa con el modelo "procedural".');
    }
    if (config.linea_de_tiempo !== undefined) {
      agregar(
        ctx,
        ['linea_de_tiempo'],
        '"linea_de_tiempo" solo se usa con el modelo "procedural".',
      );
    }
    if (config.nodos.length < 2) {
      agregar(ctx, ['nodos'], 'Debe haber entre 2 y 12 nodos.');
    }
    const modelo = config.modelo;
    const catalogo = new Set(CATALOGO_NODOS[modelo].map((n) => n.id));
    const admiteAncla = MODELOS_CON_ANCLA.includes(modelo);
    config.nodos.forEach((nodo, i) => {
      if (nodo.ancla !== undefined) {
        if (!admiteAncla) {
          agregar(
            ctx,
            ['nodos', i, 'ancla'],
            `El modelo "${config.modelo}" está hecho de piezas separadas y no admite "ancla".`,
          );
        }
        return;
      }
      if (!catalogo.has(nodo.id)) {
        agregar(
          ctx,
          ['nodos', i, 'id'],
          `"${nodo.id}" no es un nodo del modelo "${config.modelo}". Nodos válidos: ${[...catalogo].join(', ')}.${admiteAncla ? ' Si es una zona que no es una pieza del modelo, añade "ancla": { "x", "y", "z" } (valores de 0 a 1).' : ''}`,
        );
      }
    });
    const ids = new Set(config.nodos.map((n) => n.id));
    for (const repetido of duplicados(config.requeridos)) {
      agregar(ctx, ['requeridos'], `El nodo requerido "${repetido}" está repetido.`);
    }
    config.requeridos.forEach((id, i) => {
      if (!ids.has(id)) {
        agregar(ctx, ['requeridos', i], `El nodo requerido "${id}" no existe en "nodos".`);
      }
    });
  });

/** Reglas propias del modelo `procedural`: escena registrada, pasos únicos y vistas válidas. */
function validarProcedural(
  config: {
    nodos: unknown[];
    requeridos: string[];
    escena?: (typeof ESCENAS_PROCEDURALES)[number] | undefined;
    linea_de_tiempo?: { pasos: { id: string; t: number; vista: string }[] } | undefined;
  },
  ctx: ContextoRefinamiento,
): void {
  if (config.nodos.length > 0) {
    agregar(ctx, ['nodos'], 'Una escena "procedural" no lleva "nodos": usa "linea_de_tiempo".');
  }
  if (config.escena === undefined) {
    agregar(
      ctx,
      ['escena'],
      `Falta "escena". Escenas procedurales: ${ESCENAS_PROCEDURALES.join(', ')}.`,
    );
  }
  if (config.linea_de_tiempo === undefined) {
    agregar(ctx, ['linea_de_tiempo'], 'Falta "linea_de_tiempo" con los pasos de la escena.');
    return;
  }
  const pasos = config.linea_de_tiempo.pasos;
  const vistas = config.escena === undefined ? [] : vistasDeEscenaProcedural(config.escena);
  for (const repetido of duplicados(pasos.map((p) => p.id))) {
    agregar(ctx, ['linea_de_tiempo', 'pasos'], `El paso "${repetido}" está repetido.`);
  }
  let anterior = -1;
  pasos.forEach((paso, i) => {
    if (paso.t <= anterior) {
      agregar(
        ctx,
        ['linea_de_tiempo', 'pasos', i, 't'],
        'Los pasos deben ir en orden cronológico estricto (t creciente).',
      );
    }
    anterior = paso.t;
    if (config.escena !== undefined && !vistas.includes(paso.vista)) {
      agregar(
        ctx,
        ['linea_de_tiempo', 'pasos', i, 'vista'],
        `La vista "${paso.vista}" no existe en la escena "${config.escena}". Vistas válidas: ${vistas.join(', ')}.`,
      );
    }
  });
  const ids = new Set(pasos.map((p) => p.id));
  for (const repetido of duplicados(config.requeridos)) {
    agregar(ctx, ['requeridos'], `El paso requerido "${repetido}" está repetido.`);
  }
  config.requeridos.forEach((id, i) => {
    if (!ids.has(id)) {
      agregar(ctx, ['requeridos', i], `El paso requerido "${id}" no existe en "linea_de_tiempo".`);
    }
  });
}

export const ActividadExploracion3dSchema = z
  .strictObject({
    ...camposComunes,
    tipo: z.literal('exploracion-3d'),
    config: ConfigExploracion3dSchema,
  })
  .superRefine((actividad, ctx) => exigirAprobacionCoherente(actividad, ctx, false));

/* -------------------------------------------------------------------------------------------
 * Unión de actividades
 * ----------------------------------------------------------------------------------------- */

export const ActividadSchema = z.discriminatedUnion('tipo', [
  ActividadMulticapaSchema,
  ActividadArrastreMolecularSchema,
  ActividadRelacionColumnasSchema,
  ActividadQuizSchema,
  ActividadVideoTextoSchema,
  ActividadExploracion3dSchema,
]);

/* -------------------------------------------------------------------------------------------
 * Bloques y secciones
 * ----------------------------------------------------------------------------------------- */

export const BloqueTextoSchema = z.strictObject({
  id: IdSchema,
  tipo: z.literal('texto'),
  /** Subtítulo opcional (se muestra como encabezado de nivel 3). */
  titulo: textoPlano(3, 80).optional(),
  markdown: markdownBloque(20, 2500, true),
  /** `posgrado`: profundización que solo ve quien es de posgrado. Sin él, es para todos. */
  nivel: nivelBloque,
});

export const BloqueImagenSchema = z
  .strictObject({
    id: IdSchema,
    tipo: z.literal('imagen'),
    src: rutaImagen,
    /** Texto alternativo OBLIGATORIO: describe lo que la imagen enseña, no que "es una imagen". */
    alt: textoPlano(10, 250),
    pie: markdownLinea(5, 250),
    /** Autoría y licencia, si la imagen no es propia. */
    credito: textoPlano(3, 200).optional(),
    /** Tamaño intrínseco (evita saltos de diseño al cargar). Ambos o ninguno. */
    ancho: z.number().int().min(1).max(4000).optional(),
    alto: z.number().int().min(1).max(4000).optional(),
    nivel: nivelBloque,
  })
  .superRefine((imagen, ctx) => {
    if ((imagen.ancho === undefined) !== (imagen.alto === undefined)) {
      agregar(
        ctx,
        [imagen.ancho === undefined ? 'ancho' : 'alto'],
        'Indica "ancho" y "alto" juntos, o ninguno.',
      );
    }
  });

export const BloqueCalloutSchema = z.strictObject({
  id: IdSchema,
  tipo: z.literal('callout'),
  variante: z.enum(VARIANTES_CALLOUT),
  /** Si se omite, la interfaz usa `ETIQUETA_VARIANTE_CALLOUT[variante]`. */
  titulo: textoPlano(3, 60).optional(),
  markdown: markdownBloque(10, 900, false),
  nivel: nivelBloque,
});

export const BloqueTablaSchema = z
  .strictObject({
    id: IdSchema,
    tipo: z.literal('tabla'),
    /** Es el nombre accesible de la tabla. */
    titulo: textoPlano(3, 100),
    /**
     * Rótulo de la primera columna, la de los criterios (por ejemplo "Fase"). Sin él, la columna
     * no lleva encabezado visible.
     */
    encabezado_criterio: textoPlano(1, 40).optional(),
    /** Los elementos que se comparan (la primera columna, con el criterio, va aparte). */
    columnas: z.array(textoPlano(1, 40)).min(2).max(6),
    filas: z
      .array(
        z.strictObject({
          criterio: textoPlano(2, 60),
          celdas: z.array(markdownLinea(1, 200)),
        }),
      )
      .min(1)
      .max(12),
    nivel: nivelBloque,
  })
  .superRefine((tabla, ctx) => {
    tabla.filas.forEach((fila, i) => {
      if (fila.celdas.length !== tabla.columnas.length) {
        agregar(
          ctx,
          ['filas', i, 'celdas'],
          `La fila "${fila.criterio}" tiene ${fila.celdas.length} celdas y la tabla ${tabla.columnas.length} columnas.`,
        );
      }
    });
  });

/** El id del bloque es el de la actividad (`actividad.id`): no lleva `id` propio. */
export const BloqueActividadSchema = z.strictObject({
  tipo: z.literal('actividad'),
  actividad: ActividadSchema,
});

export const BloqueSchema = z.discriminatedUnion('tipo', [
  BloqueTextoSchema,
  BloqueImagenSchema,
  BloqueCalloutSchema,
  BloqueTablaSchema,
  BloqueActividadSchema,
]);

export const SeccionSchema = z
  .strictObject({
    id: IdSchema,
    titulo: textoPlano(3, 100),
    /** Una frase que resume la sección (menú, mentor, vista previa). */
    resumen: markdownLinea(10, 300).optional(),
    bloques: z.array(BloqueSchema).min(1).max(16),
  })
  .superRefine((seccion, ctx) => {
    if (seccion.id === ID_SECCION_RESERVADO) {
      agregar(
        ctx,
        ['id'],
        `El id "${ID_SECCION_RESERVADO}" está reservado: es la sección con la que el contexto pedagógico arranca antes de entrar a una sección.`,
      );
    }
  });

/* -------------------------------------------------------------------------------------------
 * Módulo
 * ----------------------------------------------------------------------------------------- */

export const TerminoGlosarioSchema = z.strictObject({
  id: IdSchema,
  termino: textoPlano(2, 60),
  definicion: markdownLinea(10, 400),
});

export const ReferenciaSchema = z.strictObject({
  id: IdSchema,
  /** Cita bibliográfica. No inventes obras: cita solo libros o artículos que existan. */
  cita: textoPlano(20, 400),
  url: z
    .string()
    .regex(/^https:\/\/\S{4,300}$/, 'La URL debe empezar por https://.')
    .optional(),
  /** `true` cuando el docente confirmó que la referencia existe y es pertinente. */
  verificada: z.boolean().default(false),
});

const fechaIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe ser AAAA-MM-DD.')
  // zod ejecuta este refine aunque el regex haya fallado ("05/10/2026"): no debe lanzar.
  .refine((f) => {
    const fecha = new Date(`${f}T00:00:00Z`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(f);
  }, 'La fecha no existe.');

/**
 * Estado de revisión del contenido. Mientras el docente no lo valide es `borrador`. Pasar a
 * `revisado_docente` o `aprobado` exige quién, cuándo y qué versión (y anotar la entrega en
 * docs/revisiones.md, CLAUDE.md).
 */
export const PendienteRevisionSchema = z.strictObject({
  /**
   * Id del elemento que tiene la duda: bloque, sección, actividad, capa, molécula, pregunta,
   * término del glosario o referencia (debe existir en el módulo).
   */
  id: IdSchema,
  /** Qué hay que confirmar con el docente (cifra dudosa, dato que varía entre fuentes...). */
  nota: textoPlano(5, 300),
});

export const EstadoRevisionSchema = z
  .strictObject({
    estado: z.enum(ESTADOS_REVISION),
    notas: textoPlano(5, 600).optional(),
    /**
     * Lista de cifras o afirmaciones dudosas para el docente (lo que los guiones marcan con
     * "[verificar]"). Nunca se muestra al estudiante.
     */
    pendientes: z.array(PendienteRevisionSchema).max(250).default([]),
    revisado_por: textoPlano(3, 80).optional(),
    fecha: fechaIso.optional(),
    version: textoPlano(1, 20).optional(),
  })
  .superRefine((revision, ctx) => {
    if (revision.estado === 'borrador') return;
    for (const campo of ['revisado_por', 'fecha', 'version'] as const) {
      if (revision[campo] === undefined) {
        agregar(ctx, [campo], `Con estado "${revision.estado}" es obligatorio indicar "${campo}".`);
      }
    }
  });

const NumeroModuloSchema = z.literal([1, 2, 3, 4, 5, 6]);

const ModuloBaseSchema = z.strictObject({
  id: IdSchema,
  numero: NumeroModuloSchema,
  /** El de src/data/modulos.ts; también la carpeta `m{numero}_{slug}`. */
  slug: IdSchema,
  titulo: textoPlano(3, 100),
  subtitulo: textoPlano(5, 160),
  resumen: markdownLinea(30, 600),
  objetivos: z.array(markdownLinea(10, 220)).min(2).max(8),
  duracion_estimada_min: z.number().int().min(5).max(240),
  glosario: z.array(TerminoGlosarioSchema).min(3).max(60),
  referencias: z.array(ReferenciaSchema).min(1).max(30),
  estado_revision: EstadoRevisionSchema,
  secciones: z.array(SeccionSchema).min(2).max(12),
});

export type ModuloContenido = z.infer<typeof ModuloBaseSchema>;

/** Refinamientos que miran el módulo entero (ids, prefijos, glosario, recursos, puntaje). */
function refinarModulo(modulo: ModuloContenido, ctx: ContextoRefinamiento): void {
  const oficial = MODULOS.find((m) => m.numero === modulo.numero);
  if (oficial) {
    if (modulo.slug !== oficial.slug) {
      agregar(
        ctx,
        ['slug'],
        `El slug del módulo ${modulo.numero} debe ser "${oficial.slug}" (src/data/modulos.ts).`,
      );
    }
    if (modulo.titulo !== oficial.titulo) {
      agregar(
        ctx,
        ['titulo'],
        `El título del módulo ${modulo.numero} debe ser "${oficial.titulo}" (src/data/modulos.ts).`,
      );
    }
  }
  if (modulo.id !== `m${modulo.numero}`) {
    agregar(ctx, ['id'], `El id del módulo debe ser "m${modulo.numero}".`);
  }

  // Unicidad de ids. Sección, bloque, actividad, capa, molécula y pregunta no se repiten en el
  // módulo; nodo, opción, par, receptor, elemento y paso solo dentro de su actividad (y en ella
  // no puede haber dos ids iguales, sea cual sea su tipo).
  const vistosModulo = new Map<string, { tipo: TipoId; ruta: PropertyKey[] }>();
  const vistosActividad = new Map<string, Map<string, { tipo: TipoId; ruta: PropertyKey[] }>>();
  for (const entrada of recolectarIds(modulo)) {
    if (alcanceDeId(entrada.tipo) === 'modulo') {
      const previo = vistosModulo.get(entrada.id);
      if (previo) {
        agregar(
          ctx,
          entrada.ruta,
          `Id duplicado "${entrada.id}" (${entrada.tipo}); ya se usó como ${previo.tipo} en ${rutaLegible(previo.ruta)}. Los ids de sección, bloque, actividad, capa, molécula y pregunta no se repiten en un módulo.`,
        );
      } else {
        vistosModulo.set(entrada.id, { tipo: entrada.tipo, ruta: entrada.ruta });
      }
    }
    if (entrada.actividadId !== undefined) {
      let locales = vistosActividad.get(entrada.actividadId);
      if (!locales) {
        locales = new Map();
        vistosActividad.set(entrada.actividadId, locales);
      }
      const previo = locales.get(entrada.id);
      // Dos ids de alcance módulo iguales ya se avisaron arriba; aquí interesa el choque en que
      // interviene al menos un id de alcance actividad.
      const ambosDeModulo =
        previo !== undefined &&
        alcanceDeId(entrada.tipo) === 'modulo' &&
        alcanceDeId(previo.tipo) === 'modulo';
      if (previo && !ambosDeModulo) {
        agregar(
          ctx,
          entrada.ruta,
          `Id duplicado "${entrada.id}" (${entrada.tipo}) dentro de la actividad "${entrada.actividadId}"; ya se usó como ${previo.tipo} en ${rutaLegible(previo.ruta)}. Los ids de una actividad no se repiten entre sí.`,
        );
      } else if (!previo) {
        locales.set(entrada.id, { tipo: entrada.tipo, ruta: entrada.ruta });
      }
    }
    if (entrada.tipo === 'actividad' && !entrada.id.startsWith(`${modulo.id}_`)) {
      agregar(
        ctx,
        entrada.ruta,
        `El id de actividad "${entrada.id}" debe empezar por "${modulo.id}_": la API suma puntajes por activity_id y no puede repetirse entre módulos.`,
      );
    }
  }

  for (const [lista, nombre] of [
    [modulo.glosario, 'glosario'],
    [modulo.referencias, 'referencias'],
  ] as const) {
    for (const repetido of duplicados(lista.map((x) => x.id))) {
      agregar(ctx, [nombre], `Id duplicado "${repetido}" en "${nombre}".`);
    }
  }

  // Enlaces [término](glosario:id): el término debe existir.
  const terminos = new Set(modulo.glosario.map((t) => t.id));
  recorrerCadenas(modulo, [], (texto, ruta) => {
    for (const id of idsGlosarioEnTexto(texto)) {
      if (!terminos.has(id)) {
        agregar(ctx, ruta, `El enlace glosario:${id} no apunta a ningún término del glosario.`);
      }
    }
  });

  // Los recursos del módulo n viven en /images/m{n}/ y /videos/m{n}/.
  for (const recurso of recolectarRecursos(modulo)) {
    const numero = /^\/(?:images|videos)\/m(\d)\//.exec(recurso.ruta)?.[1];
    if (numero !== undefined && Number(numero) !== modulo.numero) {
      agregar(
        ctx,
        recurso.jsonPath,
        `El recurso "${recurso.ruta}" es del módulo ${numero}; en el módulo ${modulo.numero} debe estar en la carpeta "m${modulo.numero}".`,
      );
    }
  }

  // Pendientes de revisión: cada uno apunta a un elemento que existe.
  const existentes = new Set<string>([
    modulo.id,
    ...vistosModulo.keys(),
    ...modulo.glosario.map((t) => t.id),
    ...modulo.referencias.map((r) => r.id),
  ]);
  modulo.estado_revision.pendientes.forEach((pendiente, i) => {
    if (!existentes.has(pendiente.id)) {
      agregar(
        ctx,
        ['estado_revision', 'pendientes', i, 'id'],
        `El pendiente apunta a "${pendiente.id}", que no es ninguna sección, bloque, actividad, capa, molécula, pregunta, término del glosario ni referencia del módulo.`,
      );
    }
  });

  // Cada sección debe exigir algo: una sin actividades obligatorias se daría por completada sin
  // haberse leído y, con el bloqueo secuencial, abriría la siguiente.
  modulo.secciones.forEach((seccion, i) => {
    const exige = seccion.bloques.some((b) => b.tipo === 'actividad' && b.actividad.obligatoria);
    if (!exige) {
      agregar(
        ctx,
        ['secciones', i],
        `La sección "${seccion.id}" no tiene ninguna actividad obligatoria: cada sección necesita al menos una, para que "completada" signifique algo.`,
      );
    }
  });

  const actividades = listarActividades(modulo);
  if (!actividades.some((a) => a.actividad.obligatoria)) {
    agregar(
      ctx,
      ['secciones'],
      'El módulo necesita al menos una actividad obligatoria: el estudiante debe actuar para avanzar.',
    );
  }
  const total = actividades.reduce((suma, a) => suma + a.actividad.puntaje_max, 0);
  if (total < PUNTAJE_MODULO_MIN || total > PUNTAJE_MODULO_MAX) {
    agregar(
      ctx,
      ['secciones'],
      `Las actividades suman ${total} puntos; el módulo debe sumar entre ${PUNTAJE_MODULO_MIN} y ${PUNTAJE_MODULO_MAX}.`,
    );
  }
}

/** Módulo completo: la estructura más los refinamientos cruzados. */
export const ModuloContenidoSchema = ModuloBaseSchema.superRefine((modulo, ctx) =>
  refinarModulo(modulo, ctx),
);

/* -------------------------------------------------------------------------------------------
 * Tipos inferidos (salida del parseo: con los valores por defecto ya aplicados)
 * ----------------------------------------------------------------------------------------- */

/** Lo que se escribe en content.json (los campos con valor por defecto son opcionales). */
export type ModuloContenidoEntrada = z.input<typeof ModuloContenidoSchema>;
export type Seccion = z.infer<typeof SeccionSchema>;
export type Bloque = z.infer<typeof BloqueSchema>;
export type BloqueTexto = z.infer<typeof BloqueTextoSchema>;
export type BloqueImagen = z.infer<typeof BloqueImagenSchema>;
export type BloqueCallout = z.infer<typeof BloqueCalloutSchema>;
export type BloqueTabla = z.infer<typeof BloqueTablaSchema>;
export type BloqueActividad = z.infer<typeof BloqueActividadSchema>;
export type Actividad = z.infer<typeof ActividadSchema>;
export type ActividadDe<T extends TipoActividad> = Extract<Actividad, { tipo: T }>;
export type ActividadMulticapa = z.infer<typeof ActividadMulticapaSchema>;
export type ActividadArrastreMolecular = z.infer<typeof ActividadArrastreMolecularSchema>;
export type ActividadRelacionColumnas = z.infer<typeof ActividadRelacionColumnasSchema>;
export type ActividadQuiz = z.infer<typeof ActividadQuizSchema>;
export type ActividadVideoTexto = z.infer<typeof ActividadVideoTextoSchema>;
export type ActividadExploracion3d = z.infer<typeof ActividadExploracion3dSchema>;
export type ConfigMulticapa = z.infer<typeof ConfigMulticapaSchema>;
export type ConfigArrastreMolecular = z.infer<typeof ConfigArrastreMolecularSchema>;
export type ConfigRelacionColumnas = z.infer<typeof ConfigRelacionColumnasSchema>;
export type ConfigQuiz = z.infer<typeof ConfigQuizSchema>;
export type ConfigVideoTexto = z.infer<typeof ConfigVideoTextoSchema>;
export type ConfigAnimacion = z.infer<typeof ConfigAnimacionSchema>;
export type ConfigVideo = z.infer<typeof ConfigVideoSchema>;
export type ConfigExploracion3d = z.infer<typeof ConfigExploracion3dSchema>;
export type Capa = z.infer<typeof CapaSchema>;
export type Molecula = z.infer<typeof MoleculaSchema>;
export type Receptor = z.infer<typeof ReceptorSchema>;
export type ParMolecular = z.infer<typeof ParMolecularSchema>;
export type EfectoBiologico = z.infer<typeof EfectoBiologicoSchema>;
export type ElementoColumna = z.infer<typeof ElementoColumnaSchema>;
export type ParColumnas = z.infer<typeof ParColumnasSchema>;
export type Pregunta = z.infer<typeof PreguntaSchema>;
export type PreguntaOpcionMultiple = z.infer<typeof PreguntaOpcionMultipleSchema>;
export type PreguntaVerdaderoFalso = z.infer<typeof PreguntaVerdaderoFalsoSchema>;
export type PreguntaOrdenar = z.infer<typeof PreguntaOrdenarSchema>;
export type PasoAnimacion = z.infer<typeof PasoAnimacionSchema>;
export type NodoEscena = z.infer<typeof NodoEscenaSchema>;
export type PasoLineaTiempo = z.infer<typeof PasoLineaTiempoSchema>;
export type LineaTiempo = z.infer<typeof LineaTiempoSchema>;
export type TerminoGlosario = z.infer<typeof TerminoGlosarioSchema>;
export type Referencia = z.infer<typeof ReferenciaSchema>;
export type EstadoRevisionModulo = z.infer<typeof EstadoRevisionSchema>;
export type PendienteRevision = z.infer<typeof PendienteRevisionSchema>;
export type NivelBloque = (typeof NIVELES_BLOQUE)[number];
export type AnclaNodoContenido = z.infer<typeof AnclaNodoSchema>;
