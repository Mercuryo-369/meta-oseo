/**
 * Quiz de práctica del mentor (equivale a app/ai/quiz.py): 3 preguntas de opción múltiple con salida
 * estructurada, apoyadas en el material del curso. Práctica libre: no da puntos ni se guarda.
 *
 * La salida estructurada garantiza la FORMA; lo que el esquema no puede decir (una sola opción
 * correcta, opciones distintas, fuentes que existen, longitudes) se valida aquí, con reintento único.
 */
import promptQuizCrudo from '../../../api/app/ai/prompts/quiz_v1.md';
import { MODULE_TITLES } from '../core/constantes';
import {
  NIVEL_POSGRADO,
  TIPO_CONTENIDO,
  TIPO_GLOSARIO,
  TIPO_OBJETIVOS,
  type Fragmento,
} from '../rag/corpus';
import type { BM25Retriever } from '../rag/retriever';
import {
  type BloqueTexto,
  type MensajeCompleto,
  type ParametrosMensaje,
  paramsMensaje,
  textoDelMensaje,
} from './anthropic';
import type { ClienteModelo } from './proveedor';
import { CODIGO_IA_ERROR, clasificarFallo, FalloModelo } from './errores';
import type { ContextoPedagogico } from './esquemas';
import {
  AVISO_DATOS,
  type Cita,
  citasDe,
  etiquetar,
  type FragmentoEtiquetado,
  linea,
  normalizarPrompt,
  renderContexto,
  renderMaterial,
} from './prompt';
import { sumarUso, USO_CERO, type Uso, usoDe } from './usage';

export const QUIZ_PROMPT = normalizarPrompt(promptQuizCrudo);
if (QUIZ_PROMPT === '') throw new Error('El prompt del quiz está vacío.');

// Llamadas al modelo por quiz: la primera y UN reintento si lo devuelto no pasa la validación.
export const QUIZ_MAX_INTENTOS = 2;
// Tope de salida de cada llamada (3 preguntas con explicación caben de sobra).
export const QUIZ_MAX_TOKENS = 8000;
export const QUIZ_PREGUNTAS = 3;
export const QUIZ_OPCIONES = 4;
export const DIFICULTADES = ['basica', 'intermedia', 'avanzada'] as const;

// Material: lo que el estudiante puede leer. El del docente para el mentor NO entra al quiz.
const TIPOS_DEL_QUIZ = new Set([TIPO_CONTENIDO, TIPO_GLOSARIO, TIPO_OBJETIVOS]);
const MAX_FRAGMENTOS = 8;
const MAX_CARACTERES_MATERIAL = 9000;
// Fragmentos de refuerzo que se piden a la búsqueda cuando hay tema o estructura seleccionada.
const K_BUSQUEDA = 6;

// Longitudes válidas (en puntos de código) de cada texto que devuelve el modelo.
const ENUNCIADO_LARGO: readonly [number, number] = [15, 300];
const OPCION_LARGO: readonly [number, number] = [1, 200];
const EXPLICACION_LARGO: readonly [number, number] = [20, 700];
const MAX_FUENTES_POR_PREGUNTA = 3;

// Opciones que dejan de tener sentido al mezclar el orden. Con lookarounds Unicode en vez de `\b`
// para que las vocales acentuadas cuenten como letras, igual que en Python.
const OPCION_DEPENDIENTE =
  /(?<![\p{L}\p{N}_])(?:(?:todas|ninguna|ambas|cualquiera)\s+(?:de\s+)?(?:las|los)\s+(?:anteriores|opciones|respuestas)|(?:a|b|c|d)\s+y\s+(?:a|b|c|d))(?![\p{L}\p{N}_])/iu;
const ESPACIOS = /\s+/g;



/** JSON schema de `output_config.format`: solo lo que la API admite (sin longitudes ni cantidades). */
export const QUIZ_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    preguntas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          enunciado: { type: 'string' },
          opciones: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                texto: { type: 'string' },
                correcta: { type: 'boolean' },
              },
              required: ['texto', 'correcta'],
              additionalProperties: false,
            },
          },
          explicacion: { type: 'string' },
          dificultad: { type: 'string', enum: [...DIFICULTADES] },
          fuentes: { type: 'array', items: { type: 'string' } },
        },
        required: ['enunciado', 'opciones', 'explicacion', 'dificultad', 'fuentes'],
        additionalProperties: false,
      },
    },
  },
  required: ['preguntas'],
  additionalProperties: false,
};

export function bloquesSistemaQuiz(): BloqueTexto[] {
  return [{ type: 'text', text: QUIZ_PROMPT, cache_control: { type: 'ephemeral' } }];
}

// --- Material ---------------------------------------------------------------------------------

export interface MaterialDelQuiz {
  fragmentos: Fragmento[];
  tema: string;
}

function esDelQuiz(fragmento: Fragmento, nivel: string): boolean {
  if (!TIPOS_DEL_QUIZ.has(fragmento.tipo)) return false;
  return !(fragmento.nivel === NIVEL_POSGRADO && nivel !== NIVEL_POSGRADO);
}

/** Primeros fragmentos que caben en el tope de cantidad y de caracteres. */
function recortar(fragmentos: readonly Fragmento[]): Fragmento[] {
  const elegidos: Fragmento[] = [];
  let total = 0;
  for (const fragmento of fragmentos) {
    if (elegidos.length >= MAX_FRAGMENTOS) break;
    const largo = Array.from(fragmento.texto).length;
    // Siempre entra el primero, aunque sea largo; los demás, mientras quepan.
    if (elegidos.length > 0 && total + largo > MAX_CARACTERES_MATERIAL) continue;
    elegidos.push(fragmento);
    total += largo;
  }
  return elegidos;
}

/** Identificador de capa, molécula o estructura en texto (como `_nombre_legible` de quiz.py). */
function nombreLegible(identificador: string): string {
  return identificador.replace(/^(?:mol|rec|par|histo|ident|capa|paso|ea|eb)_/, '').replace(/_/g, ' ');
}

export interface OpcionesMaterial {
  modulo: number | null;
  seccion: string | null;
  tema: string | null;
  nivel: string;
  estructura?: string | null;
  molecula?: string | null;
}

/**
 * Fragmentos sobre los que se pregunta (vacío si no hay nada que preguntar):
 * 1. La sección indicada completa, si existe. 2. Lo que la búsqueda halla para el tema o para la
 * estructura o molécula seleccionada. 3. Sin lo anterior, el comienzo del módulo.
 */
export function seleccionarMaterial(
  recuperador: BM25Retriever,
  opciones: OpcionesMaterial,
): MaterialDelQuiz {
  const { modulo, seccion, tema, nivel } = opciones;
  const fragmentos: Fragmento[] = [];
  const vistos = new Set<string>();
  const agregar = (candidatos: readonly Fragmento[]): void => {
    for (const fragmento of candidatos) {
      if (!vistos.has(fragmento.id) && esDelQuiz(fragmento, nivel)) {
        vistos.add(fragmento.id);
        fragmentos.push(fragmento);
      }
    }
  };

  let tituloSeccion = '';
  if (modulo !== null && seccion) {
    const deLaSeccion = recuperador.fragmentosDe(modulo, seccion);
    agregar(deLaSeccion);
    tituloSeccion = deLaSeccion[0]?.seccion_titulo ?? '';
  }

  const textoBusqueda = tema ?? '';
  const textoContexto = [opciones.estructura, opciones.molecula]
    .filter((x): x is string => Boolean(x))
    .map(nombreLegible)
    .join(' ')
    .trim();
  if (textoBusqueda !== '' || textoContexto !== '') {
    const resultados = recuperador.buscar({
      texto: textoBusqueda,
      k: K_BUSQUEDA,
      moduloActual: modulo,
      seccionActual: seccion,
      textoContexto,
    });
    agregar(resultados.map((r) => r.fragmento));
  }

  if (fragmentos.length === 0 && modulo !== null) {
    // Los objetivos primero (orden estable, como `sorted(..., key=tipo != objetivos)` en Python).
    const delModulo = recuperador.fragmentosDe(modulo);
    const ordenados = [
      ...delModulo.filter((f) => f.tipo === TIPO_OBJETIVOS),
      ...delModulo.filter((f) => f.tipo !== TIPO_OBJETIVOS),
    ];
    agregar(ordenados.slice(0, MAX_FRAGMENTOS));
  }

  let titulo = tema || tituloSeccion;
  if (!titulo && modulo) {
    titulo = `Módulo ${modulo}: ${MODULE_TITLES[modulo] ?? ''}`.replace(/^[: ]+|[: ]+$/g, '');
  }
  return { fragmentos: recortar(fragmentos), tema: titulo };
}

/** Fragmentos con etiqueta, etiquetas válidas (`"1"`, `"2"`...) y las fuentes que ve el estudiante. */
export function etiquetarMaterial(fragmentos: readonly Fragmento[]): {
  material: FragmentoEtiquetado[];
  etiquetas: ReadonlySet<string>;
  citas: Cita[];
} {
  const material = etiquetar(fragmentos);
  const citas = citasDe(material);
  const etiquetas = new Set(citas.map((_, i) => String(i + 1)));
  return { material, etiquetas, citas };
}

// --- Petición ---------------------------------------------------------------------------------

function renderPedido(
  contexto: ContextoPedagogico | null,
  material: readonly FragmentoEtiquetado[],
  tema: string | null,
): string {
  const partes = ['<datos_del_curso>', AVISO_DATOS, '', renderContexto(contexto)];
  if (tema) partes.push('', `<tema_solicitado>${linea(tema)}</tema_solicitado>`);
  partes.push('', renderMaterial(material), '</datos_del_curso>');
  return (
    partes.join('\n') +
    `\n\nPrepara ${QUIZ_PREGUNTAS} preguntas de opción múltiple de práctica sobre este ` +
    'material, siguiendo las reglas del sistema.'
  );
}

/** Parámetros de la petición del quiz (pensamiento adaptativo, esfuerzo y salida estructurada). */
export function paramsQuiz(
  cfg: { anthropicModel: string; mentorEffort: string; mentorServerFallback: boolean; mentorMaxTokens: number },
  contexto: ContextoPedagogico | null,
  material: readonly FragmentoEtiquetado[],
  tema: string | null,
): ParametrosMensaje {
  return paramsMensaje(cfg, {
    system: bloquesSistemaQuiz(),
    messages: [{ role: 'user', content: renderPedido(contexto, material, tema) }],
    maxTokens: Math.min(cfg.mentorMaxTokens, QUIZ_MAX_TOKENS),
    formato: { type: 'json_schema', schema: QUIZ_SCHEMA },
  });
}

// --- Validación -------------------------------------------------------------------------------

export class QuizInvalido extends Error {
  constructor(readonly errores: string[]) {
    super(errores.join('; '));
  }
}

export interface QuizOpcion {
  texto: string;
}

export interface QuizPregunta {
  id: number;
  enunciado: string;
  opciones: QuizOpcion[];
  correcta: number;
  explicacion: string;
  dificultad: (typeof DIFICULTADES)[number];
  fuentes: string[];
}

/** Forma comparable de un texto: sin acentos, en minúsculas, con espacios simples y sin punto final. */
function normalizarComparable(texto: string): string {
  const sinAcentos = texto.normalize('NFD').replace(/\p{Mn}/gu, '');
  return sinAcentos.replace(ESPACIOS, ' ').trim().toLowerCase().replace(/\.+$/, '');
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Texto limpio y su validación de longitud (mismo criterio que `_texto` de quiz.py). */
function textoValidado(
  valor: unknown,
  largo: readonly [number, number],
  nombre: string,
  errores: string[],
): string {
  if (typeof valor !== 'string') {
    errores.push(`${nombre} no es texto`);
    return '';
  }
  const limpio = valor.replace(ESPACIOS, ' ').trim();
  const n = Array.from(limpio).length;
  if (n < largo[0] || n > largo[1]) {
    errores.push(`${nombre} mide ${n} caracteres (debe estar entre ${largo[0]} y ${largo[1]})`);
  }
  if (limpio.includes('\u0000')) errores.push(`${nombre} tiene caracteres no válidos`);
  return limpio;
}

function validarPregunta(
  numero: number,
  bruta: unknown,
  etiquetas: ReadonlySet<string>,
): { pregunta: QuizPregunta | null; errores: string[] } {
  const errores: string[] = [];
  const prefijo = `pregunta ${numero}`;
  if (!esObjeto(bruta)) return { pregunta: null, errores: [`${prefijo} no es un objeto`] };

  const enunciado = textoValidado(bruta.enunciado, ENUNCIADO_LARGO, `${prefijo}: enunciado`, errores);
  const explicacion = textoValidado(bruta.explicacion, EXPLICACION_LARGO, `${prefijo}: explicación`, errores);

  const dificultad = bruta.dificultad;
  if (typeof dificultad !== 'string' || !(DIFICULTADES as readonly string[]).includes(dificultad)) {
    errores.push(`${prefijo}: dificultad no es válida`);
  }

  const opciones: QuizOpcion[] = [];
  let correcta = -1;
  const brutas = bruta.opciones;
  if (!Array.isArray(brutas) || brutas.length !== QUIZ_OPCIONES) {
    const cantidad = Array.isArray(brutas) ? String(brutas.length) : 'ninguna';
    errores.push(`${prefijo}: debe tener ${QUIZ_OPCIONES} opciones (tiene ${cantidad})`);
  } else {
    let marcadas = 0;
    const vistas = new Set<string>();
    brutas.forEach((opcion: unknown, posicion) => {
      if (!esObjeto(opcion) || typeof opcion.correcta !== 'boolean') {
        errores.push(`${prefijo}: la opción ${posicion + 1} está mal formada`);
        return;
      }
      const texto = textoValidado(opcion.texto, OPCION_LARGO, `${prefijo}: opción ${posicion + 1}`, errores);
      const clave = normalizarComparable(texto);
      if (vistas.has(clave)) errores.push(`${prefijo}: hay opciones repetidas`);
      vistas.add(clave);
      if (OPCION_DEPENDIENTE.test(texto)) {
        errores.push(`${prefijo}: la opción ${posicion + 1} depende del orden de las demás`);
      }
      if (opcion.correcta) {
        marcadas += 1;
        correcta = posicion;
      }
      opciones.push({ texto });
    });
    if (marcadas !== 1) errores.push(`${prefijo}: debe haber una sola opción correcta (hay ${marcadas})`);
    if (vistas.has(normalizarComparable(enunciado))) errores.push(`${prefijo}: una opción repite el enunciado`);
  }

  const fuentes: string[] = [];
  const brutasFuentes = bruta.fuentes;
  if (!Array.isArray(brutasFuentes) || brutasFuentes.length === 0) {
    errores.push(`${prefijo}: falta indicar la fuente`);
  } else {
    for (const etiqueta of brutasFuentes as unknown[]) {
      const limpia = typeof etiqueta === 'string' ? etiqueta.trim() : null;
      if (limpia === null || !etiquetas.has(limpia)) {
        errores.push(`${prefijo}: la fuente ${String(etiqueta)} no existe en el material`);
      } else if (!fuentes.includes(limpia)) {
        fuentes.push(limpia);
      }
    }
    if (fuentes.length > MAX_FUENTES_POR_PREGUNTA) {
      errores.push(`${prefijo}: cita más de ${MAX_FUENTES_POR_PREGUNTA} fuentes`);
    }
  }

  if (errores.length > 0) return { pregunta: null, errores };
  return {
    pregunta: {
      id: numero,
      enunciado,
      opciones,
      correcta,
      explicacion,
      dificultad: dificultad as QuizPregunta['dificultad'],
      fuentes,
    },
    errores: [],
  };
}

/** Convierte el texto del modelo en preguntas válidas o lanza `QuizInvalido`. */
export function validarQuiz(texto: string, etiquetas: ReadonlySet<string>): QuizPregunta[] {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new QuizInvalido(['la respuesta no es JSON válido']);
  }
  const brutas = esObjeto(datos) ? datos.preguntas : undefined;
  if (!Array.isArray(brutas)) throw new QuizInvalido(['falta la lista `preguntas`']);
  if (brutas.length !== QUIZ_PREGUNTAS) {
    throw new QuizInvalido([`debe haber ${QUIZ_PREGUNTAS} preguntas (hay ${brutas.length})`]);
  }
  const preguntas: QuizPregunta[] = [];
  const errores: string[] = [];
  brutas.forEach((bruta: unknown, indice) => {
    const { pregunta, errores: fallos } = validarPregunta(indice + 1, bruta, etiquetas);
    errores.push(...fallos);
    if (pregunta) preguntas.push(pregunta);
  });
  if (errores.length === 0) {
    const enunciados = preguntas.map((p) => normalizarComparable(p.enunciado));
    if (new Set(enunciados).size !== enunciados.length) errores.push('hay preguntas repetidas');
  }
  if (errores.length > 0) throw new QuizInvalido(errores);
  return preguntas;
}

/** Revuelve el orden de las opciones de cada pregunta y ajusta la posición de la correcta. */
export function mezclarOpciones(preguntas: readonly QuizPregunta[]): QuizPregunta[] {
  return preguntas.map((pregunta) => {
    const orden = pregunta.opciones.map((_, i) => i);
    // Fisher-Yates con el generador criptográfico (como `random.SystemRandom` en Python).
    for (let i = orden.length - 1; i > 0; i--) {
      const aleatorio = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
      const j = aleatorio % (i + 1);
      [orden[i], orden[j]] = [orden[j] ?? 0, orden[i] ?? 0];
    }
    return {
      ...pregunta,
      opciones: orden.map((i) => pregunta.opciones[i] ?? { texto: '' }),
      correcta: orden.indexOf(pregunta.correcta),
    };
  });
}

// --- Llamada al modelo ------------------------------------------------------------------------

export interface QuizGenerado {
  preguntas: QuizPregunta[];
  uso: Uso;
  modelo: string;
  intentos: number;
}

export const MENSAJE_IA_ERROR_QUIZ =
  'El mentor no puede preparar el quiz en este momento. Intenta de nuevo en unos minutos.';
export const MENSAJE_QUIZ_INVALIDO = 'No se pudo preparar el quiz esta vez. Inténtalo de nuevo en un momento.';
export const MENSAJE_RECHAZO_QUIZ = 'No se pudo preparar un quiz sobre ese tema. Prueba con otro concepto.';
export const CODIGO_QUIZ_INVALIDO = 'quiz_invalido';

/**
 * Pide el quiz a Claude y lo valida; reintenta si lo devuelto no sirve. Lanza `FalloModelo` si el
 * modelo rechaza la consulta, si el servicio falla o si tras `QUIZ_MAX_INTENTOS` sigue inválido. El
 * consumo de las llamadas que sí respondieron viaja en la excepción, para registrarlo igual.
 */
export async function generarQuiz(
  cliente: ClienteModelo,
  params: ParametrosMensaje,
  etiquetas: ReadonlySet<string>,
): Promise<QuizGenerado> {
  let uso: Uso = USO_CERO;
  let modelo: string | null = null;
  let ultimoError = '';
  for (let intento = 1; intento <= QUIZ_MAX_INTENTOS; intento++) {
    let mensaje: MensajeCompleto;
    try {
      mensaje = await cliente.crear(params);
    } catch (error) {
      const fallo = clasificarFallo(error);
      console.warn('Fallo al preparar el quiz', fallo.code);
      throw new FalloModelo(CODIGO_IA_ERROR, MENSAJE_IA_ERROR_QUIZ, uso, modelo);
    }
    uso = sumarUso(uso, usoDe(mensaje.usage));
    modelo = mensaje.model ?? params.model;
    if (mensaje.stop_reason === 'refusal') {
      console.info('El quiz fue rechazado (categoría:', mensaje.stop_details?.category ?? null, ')');
      throw new FalloModelo(CODIGO_IA_ERROR, MENSAJE_RECHAZO_QUIZ, uso, modelo);
    }
    if (mensaje.stop_reason === 'max_tokens') {
      ultimoError = 'la respuesta se cortó por su longitud';
    } else {
      try {
        const preguntas = validarQuiz(textoDelMensaje(mensaje), etiquetas);
        return { preguntas, uso, modelo, intentos: intento };
      } catch (error) {
        if (!(error instanceof QuizInvalido)) throw error;
        ultimoError = error.errores.join('; ');
      }
    }
    console.warn(`Quiz inválido (intento ${intento} de ${QUIZ_MAX_INTENTOS}): ${ultimoError}`);
  }
  throw new FalloModelo(CODIGO_QUIZ_INVALIDO, MENSAJE_QUIZ_INVALIDO, uso, modelo);
}

