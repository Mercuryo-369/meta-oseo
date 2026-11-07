/**
 * Retroalimentación con IA de las preguntas abiertas (equivale a app/ai/retroalimentacion.py).
 *
 * El modelo compara la respuesta del estudiante SOLO con la respuesta de referencia del docente y el
 * enunciado (los pone el servidor desde `preguntas_abiertas.json`). Es retroalimentación, no
 * calificación: no se guarda la respuesta del estudiante ni da puntos. Consumo: kind `quiz`.
 */
import promptRetroCrudo from '../../../api/app/ai/prompts/retroalimentacion_v1.md';
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
import type { PreguntaAbierta } from '../servicios/preguntas_abiertas';
import { AVISO_DATOS, atributo, escapar, normalizarPrompt, renderContexto } from './prompt';
import { sumarUso, USO_CERO, type Uso, usoDe } from './usage';

export const RETRO_PROMPT = normalizarPrompt(promptRetroCrudo);
if (RETRO_PROMPT === '') throw new Error('El prompt de la retroalimentación está vacío.');

// Llamadas al modelo por pedido: la primera y UN reintento si lo devuelto no pasa la validación.
export const RETRO_MAX_INTENTOS = 2;
export const RETRO_MAX_TOKENS = 6000;
// El prompt pide 80 a 180 palabras; se tolera un margen para no gastar reintentos por poco.
const RETRO_PALABRAS: readonly [number, number] = [50, 240];
const RETRO_MAX_CARACTERES = 1800;
export const VALORACIONES = ['acertada', 'parcial', 'incorrecta'] as const;

const ESPACIOS_DE_LINEA = /[ \t\r\f\v]+/g;
const SEPARADOR_DE_PARRAFOS = /\n\s*\n/;
/** Separadores de línea de Python (`str.splitlines`). */
const SEPARADOR_LINEA = /\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/;

export function bloquesSistemaRetro(): BloqueTexto[] {
  return [{ type: 'text', text: RETRO_PROMPT, cache_control: { type: 'ephemeral' } }];
}

/** JSON schema de `output_config.format`: solo lo que la API admite. */
export const RETRO_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    valoracion: { type: 'string', enum: [...VALORACIONES] },
    retroalimentacion: { type: 'string' },
  },
  required: ['valoracion', 'retroalimentacion'],
  additionalProperties: false,
};

/** Texto de varias líneas escapado: conserva los saltos, no puede abrir ni cerrar etiquetas. */
function bloque(texto: string): string {
  return escapar(texto.replace(/\r\n/g, '\n').trim());
}

function renderPedido(
  pregunta: PreguntaAbierta,
  respuestaEstudiante: string,
  contexto: ContextoPedagogico | null,
): string {
  const partes = [
    '<datos_de_la_pregunta>',
    AVISO_DATOS,
    '',
    renderContexto(contexto),
    '',
    `<pregunta modulo="${pregunta.modulo}" titulo="${atributo(pregunta.titulo)}">`,
    bloque(pregunta.enunciado),
    '</pregunta>',
    '',
    '<respuesta_del_docente>',
    bloque(pregunta.respuesta),
    '</respuesta_del_docente>',
    '',
    '<respuesta_del_estudiante>',
    bloque(respuestaEstudiante),
    '</respuesta_del_estudiante>',
    '</datos_de_la_pregunta>',
  ];
  return (
    partes.join('\n') +
    '\n\nCompara la respuesta del estudiante con la respuesta del docente y escribe la ' +
    'retroalimentación, siguiendo las reglas del sistema.'
  );
}

/** Parámetros del pedido (mismos del modelo que el quiz: pensamiento, esfuerzo y salida estructurada). */
export function paramsRetroalimentacion(
  cfg: { anthropicModel: string; mentorEffort: string; mentorServerFallback: boolean; mentorMaxTokens: number },
  pregunta: PreguntaAbierta,
  respuestaEstudiante: string,
  contexto: ContextoPedagogico | null,
): ParametrosMensaje {
  return paramsMensaje(cfg, {
    system: bloquesSistemaRetro(),
    messages: [{ role: 'user', content: renderPedido(pregunta, respuestaEstudiante, contexto) }],
    maxTokens: Math.min(cfg.mentorMaxTokens, RETRO_MAX_TOKENS),
    formato: { type: 'json_schema', schema: RETRO_SCHEMA },
  });
}

export class RetroalimentacionInvalida extends Error {
  constructor(readonly errores: string[]) {
    super(errores.join('; '));
  }
}

/** Espacios simples dentro de cada párrafo y una línea en blanco entre párrafos. */
function limpiar(texto: string): string {
  return texto
    .replace(/\r\n/g, '\n')
    .split(SEPARADOR_DE_PARRAFOS)
    .map((parrafo) =>
      parrafo
        .split(SEPARADOR_LINEA)
        .filter((linea) => linea.trim() !== '')
        .map((linea) => linea.replace(ESPACIOS_DE_LINEA, ' ').trim())
        .join(' '),
    )
    .filter((parrafo) => parrafo !== '')
    .join('\n\n');
}

/** `[valoracion, retroalimentacion]` o lanza `RetroalimentacionInvalida`. */
export function validarRetroalimentacion(texto: string): { valoracion: string; retroalimentacion: string } {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new RetroalimentacionInvalida(['la respuesta no es JSON válido']);
  }
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    throw new RetroalimentacionInvalida(['la respuesta no es un objeto']);
  }
  const objeto = datos as Record<string, unknown>;
  const errores: string[] = [];
  const valoracion = objeto.valoracion;
  if (typeof valoracion !== 'string' || !(VALORACIONES as readonly string[]).includes(valoracion)) {
    errores.push('valoración no es válida');
  }
  let limpio = '';
  const bruto = objeto.retroalimentacion;
  if (typeof bruto !== 'string') {
    errores.push('la retroalimentación no es texto');
  } else {
    limpio = limpiar(bruto);
    const palabras = limpio.split(/\s+/).filter((p) => p !== '').length;
    if (palabras < RETRO_PALABRAS[0] || palabras > RETRO_PALABRAS[1]) {
      errores.push(
        `la retroalimentación tiene ${palabras} palabras (debe estar entre ${RETRO_PALABRAS[0]} y ${RETRO_PALABRAS[1]})`,
      );
    }
    if (Array.from(limpio).length > RETRO_MAX_CARACTERES) {
      errores.push(`la retroalimentación pasa de ${RETRO_MAX_CARACTERES} caracteres`);
    }
    if (limpio.includes('\u0000')) errores.push('la retroalimentación tiene caracteres no válidos');
  }
  if (errores.length > 0) throw new RetroalimentacionInvalida(errores);
  return { valoracion: String(valoracion), retroalimentacion: limpio };
}

export interface RetroalimentacionGenerada {
  valoracion: string;
  retroalimentacion: string;
  uso: Uso;
  modelo: string;
  intentos: number;
}

export const MENSAJE_IA_ERROR_RETRO =
  'El mentor no puede revisar tu respuesta en este momento. Intenta de nuevo en unos minutos.';
export const MENSAJE_RETRO_INVALIDA =
  'No se pudo preparar la retroalimentación esta vez. Inténtalo de nuevo en un momento.';
export const MENSAJE_RECHAZO_RETRO = 'El mentor no pudo revisar esa respuesta. Reformúlala e inténtalo de nuevo.';
export const CODIGO_RETRO_INVALIDA = 'retroalimentacion_invalida';

/** Pide la retroalimentación y la valida; reintenta una vez si lo devuelto no sirve. */
export async function generarRetroalimentacion(
  cliente: ClienteModelo,
  params: ParametrosMensaje,
): Promise<RetroalimentacionGenerada> {
  let uso: Uso = USO_CERO;
  let modelo: string | null = null;
  let ultimoError = '';
  for (let intento = 1; intento <= RETRO_MAX_INTENTOS; intento++) {
    let mensaje: MensajeCompleto;
    try {
      mensaje = await cliente.crear(params);
    } catch (error) {
      const fallo = clasificarFallo(error);
      console.warn('Fallo al preparar la retroalimentación', fallo.code);
      throw new FalloModelo(CODIGO_IA_ERROR, MENSAJE_IA_ERROR_RETRO, uso, modelo);
    }
    uso = sumarUso(uso, usoDe(mensaje.usage));
    modelo = mensaje.model ?? params.model;
    if (mensaje.stop_reason === 'refusal') {
      console.info('La retroalimentación fue rechazada (categoría:', mensaje.stop_details?.category ?? null, ')');
      throw new FalloModelo(CODIGO_IA_ERROR, MENSAJE_RECHAZO_RETRO, uso, modelo);
    }
    if (mensaje.stop_reason === 'max_tokens') {
      ultimoError = 'la respuesta se cortó por su longitud';
    } else {
      try {
        const { valoracion, retroalimentacion } = validarRetroalimentacion(textoDelMensaje(mensaje));
        return { valoracion, retroalimentacion, uso, modelo, intentos: intento };
      } catch (error) {
        if (!(error instanceof RetroalimentacionInvalida)) throw error;
        ultimoError = error.errores.join('; ');
      }
    }
    console.warn(`Retroalimentación inválida (intento ${intento} de ${RETRO_MAX_INTENTOS}): ${ultimoError}`);
  }
  throw new FalloModelo(CODIGO_RETRO_INVALIDA, MENSAJE_RETRO_INVALIDA, uso, modelo);
}
