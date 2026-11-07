/**
 * Errores del mentor: del fallo de Anthropic a los códigos del contrato (equivale a app/ai/errors.py).
 * Al cliente NUNCA llega texto crudo de una excepción, ni cabeceras, ni la clave: solo un código del
 * contrato y un mensaje en español. El detalle técnico va solo al log del servidor.
 */
import { ErrorAnthropic, ErrorIncompleto } from './anthropic';
import type { Uso } from './usage';

// Códigos de error dentro del stream (docs/api-contract.md).
export const CODIGO_REFUSAL = 'refusal';
export const CODIGO_MAX_TOKENS = 'max_tokens';
export const CODIGO_UPSTREAM_ERROR = 'upstream_error';

export const MENSAJE_REFUSAL =
  'Lo siento, no puedo responder a esa consulta. Prueba con otras palabras o pregúntame algo más sobre el tema.';
export const MENSAJE_MAX_TOKENS =
  'La respuesta se cortó por su longitud. Pídeme que continúe o hazme una pregunta más concreta.';
const MENSAJE_UPSTREAM = 'El mentor no está disponible en este momento. Intenta de nuevo en unos minutos.';
const MENSAJE_OVERLOADED =
  'El mentor tiene mucha demanda en este momento. Intenta de nuevo en unos minutos.';
const MENSAJE_TIMEOUT = 'El mentor tardó demasiado en responder. Intenta de nuevo.';
const MENSAJE_CONNECTION =
  'No se pudo conectar con el mentor. Revisa tu conexión e intenta de nuevo en un momento.';
const MENSAJE_INCOMPLETE = 'La respuesta se interrumpió antes de terminar. Intenta de nuevo.';
const MENSAJE_RATE_LIMITED =
  'El mentor recibió demasiadas consultas. Espera un momento antes de volver a preguntar.';

/** Cómo se le cuenta un fallo al cliente. `transitorio` decide el nivel del log. */
export interface FalloFlujo {
  code: string;
  message: string;
  transitorio: boolean;
}

const RATE_LIMITED: FalloFlujo = {
  code: 'rate_limited',
  message: MENSAJE_RATE_LIMITED,
  transitorio: true,
};
const OVERLOADED: FalloFlujo = { code: CODIGO_UPSTREAM_ERROR, message: MENSAJE_OVERLOADED, transitorio: true };
const TIMEOUT: FalloFlujo = { code: CODIGO_UPSTREAM_ERROR, message: MENSAJE_TIMEOUT, transitorio: true };
const CONNECTION: FalloFlujo = { code: CODIGO_UPSTREAM_ERROR, message: MENSAJE_CONNECTION, transitorio: true };
export const FALLO_INCOMPLETO: FalloFlujo = { code: CODIGO_UPSTREAM_ERROR, message: MENSAJE_INCOMPLETE, transitorio: true };
const UPSTREAM: FalloFlujo = { code: CODIGO_UPSTREAM_ERROR, message: MENSAJE_UPSTREAM, transitorio: true };
// Fallos que no se arreglan reintentando (clave inválida, petición mal formada...): ERROR en el log.
const UPSTREAM_MAL_CONFIGURADO: FalloFlujo = {
  code: CODIGO_UPSTREAM_ERROR,
  message: MENSAJE_UPSTREAM,
  transitorio: false,
};

/** Tipo de error de la API -> fallo. Lo usan los errores dentro del stream y los de estado HTTP. */
const POR_TIPO_DE_ERROR: Readonly<Record<string, FalloFlujo>> = {
  rate_limit_error: RATE_LIMITED,
  overloaded_error: OVERLOADED,
  timeout_error: TIMEOUT,
  api_error: UPSTREAM,
  invalid_request_error: UPSTREAM_MAL_CONFIGURADO,
  authentication_error: UPSTREAM_MAL_CONFIGURADO,
  permission_error: UPSTREAM_MAL_CONFIGURADO,
  not_found_error: UPSTREAM_MAL_CONFIGURADO,
  billing_error: UPSTREAM_MAL_CONFIGURADO,
};

/**
 * Traduce cualquier fallo al código del contrato. El orden importa, igual que en Python: primero
 * el tiempo de espera y la red, luego el estado HTTP (429, 529, 5xx), y por último el tipo de error.
 */
export function clasificarFallo(error: unknown): FalloFlujo {
  if (error instanceof ErrorIncompleto) return FALLO_INCOMPLETO;
  if (error instanceof ErrorAnthropic) {
    if (error.tiempo) return TIMEOUT;
    if (error.conexion) return CONNECTION;
    if (error.estado === 429) return RATE_LIMITED;
    if (error.estado === 529) return OVERLOADED;
    // Error con tipo conocido (dentro del stream con HTTP 200, o un estado HTTP sin más pistas).
    if (error.tipo !== null && Object.hasOwn(POR_TIPO_DE_ERROR, error.tipo)) {
      return POR_TIPO_DE_ERROR[error.tipo] ?? UPSTREAM_MAL_CONFIGURADO;
    }
    if (error.estado !== null && error.estado >= 500) return UPSTREAM;
    return UPSTREAM_MAL_CONFIGURADO;
  }
  return UPSTREAM_MAL_CONFIGURADO;
}

/** Código de error del quiz y la retroalimentación cuando el modelo no responde utilizable. */
export const CODIGO_IA_ERROR = 'ia_error';

/**
 * Fallo de una llamada sin streaming (quiz y retroalimentación). `uso` y `modelo` son lo gastado
 * hasta el fallo, para registrarlo igual en `usage_events`.
 */
export class FalloModelo extends Error {
  constructor(
    readonly code: string,
    readonly mensaje: string,
    readonly uso: Uso,
    readonly modelo: string | null,
  ) {
    super(mensaje);
  }
}
