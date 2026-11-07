/**
 * Cliente mínimo de la API de Mensajes de Anthropic con `fetch` (equivale a app/ai/client.py y al
 * SDK oficial que usa la API de Python). Sin SDK: Workers no lo necesita y el protocolo es pequeño.
 *
 * Reglas de `claude-opus-5` que se respetan aquí (igual que en Python): pensamiento adaptativo y
 * esfuerzo en `output_config`; NUNCA `temperature`, `top_p`, `top_k`, `budget_tokens`, prefill ni
 * `tool_choice` forzado (devuelven 400).
 *
 * - Chat: `stream: true`; se leen los eventos SSE de Anthropic.
 * - Quiz y retroalimentación: sin streaming (`crearMensaje`), con salida estructurada.
 * - Reintentos antes de que empiece la respuesta (429, 408, 409, 5xx y red), como el SDK: 2 reintentos.
 * - El endpoint es el de beta del SDK (`/v1/messages?beta=true`) porque Python usa `client.beta`.
 */

export const URL_MENSAJES = 'https://api.anthropic.com/v1/messages?beta=true';
export const VERSION_API = '2023-06-01';

// Fallback del lado del servidor (rechazos de seguridad): ver app/ai/client.py.
export const BETA_FALLBACK = 'server-side-fallback-2026-07-01';
export const MODO_FALLBACK = 'default';
const MODELOS_CON_FALLBACK: ReadonlySet<string> = new Set(['claude-opus-5']);

// Espera máxima entre fragmentos del stream (el modelo puede pensar un rato antes de escribir).
const TIMEOUT_LECTURA_MS = 120_000;
const REINTENTOS_MAXIMOS = 2;
const RETRASO_INICIAL_MS = 500;
const RETRASO_MAXIMO_MS = 8_000;
// Un `retry-after` mayor que esto no se obedece: se usa el retraso normal.
const RETRY_AFTER_MAXIMO_MS = 60_000;

/** Señal que nunca se cancela (para las llamadas que no atienden al cliente). */
const SIN_CANCELAR: AbortSignal = new AbortController().signal;

export interface DetalleFallo {
  estado?: number | null;
  tipo?: string | null;
  conexion?: boolean;
  tiempo?: boolean;
  requestId?: string | null;
  reintentoEnMs?: number | null;
}

/** Fallo de la API o de la red. Sin texto crudo: solo lo necesario para clasificarlo. */
export class ErrorAnthropic extends Error {
  readonly estado: number | null;
  readonly tipo: string | null;
  readonly conexion: boolean;
  readonly tiempo: boolean;
  readonly requestId: string | null;
  readonly reintentoEnMs: number | null;

  constructor(detalle: DetalleFallo = {}) {
    super('Fallo de la API de Anthropic');
    this.estado = detalle.estado ?? null;
    this.tipo = detalle.tipo ?? null;
    this.conexion = detalle.conexion ?? false;
    this.tiempo = detalle.tiempo ?? false;
    this.requestId = detalle.requestId ?? null;
    this.reintentoEnMs = detalle.reintentoEnMs ?? null;
  }
}

/** El stream terminó sin entregar un mensaje (no llegó `message_start`). */
export class ErrorIncompleto extends Error {}

/** La petición se canceló porque el cliente se desconectó. No es un fallo del modelo. */
export class ErrorCancelado extends Error {}

export interface BloqueTexto {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

export interface Turno {
  role: 'user' | 'assistant';
  content: string | BloqueTexto[];
}

export interface ParametrosMensaje {
  model: string;
  max_tokens: number;
  system?: BloqueTexto[];
  messages: Turno[];
  thinking: { type: 'adaptive' };
  output_config: {
    effort: string;
    format?: { type: 'json_schema'; schema: Record<string, unknown> };
  };
  /** Cabeceras `anthropic-beta`: no van en el cuerpo (como `betas` del SDK). */
  betas?: string[];
  fallbacks?: typeof MODO_FALLBACK;
}

export interface UsoMensaje {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export interface MensajeCompleto {
  model?: string;
  stop_reason: string | null;
  stop_details?: { category?: string | null } | null;
  content: Array<{ type: string; text?: string }>;
  usage?: UsoMensaje | null;
}

/** Evento del stream de Anthropic (se tipa solo lo que se usa). */
export interface EventoAnthropic {
  type: string;
  [clave: string]: unknown;
}

/** Parámetros del modelo según la configuración (equivale a `build_request` / `build_quiz_request`). */
export function paramsMensaje(
  cfg: { anthropicModel: string; mentorEffort: string; mentorServerFallback: boolean },
  opciones: {
    system: BloqueTexto[];
    messages: Turno[];
    maxTokens: number;
    formato?: { type: 'json_schema'; schema: Record<string, unknown> };
  },
): ParametrosMensaje {
  const params: ParametrosMensaje = {
    model: cfg.anthropicModel,
    max_tokens: opciones.maxTokens,
    system: opciones.system,
    messages: opciones.messages,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: cfg.mentorEffort,
      ...(opciones.formato ? { format: opciones.formato } : {}),
    },
  };
  if (cfg.mentorServerFallback && MODELOS_CON_FALLBACK.has(cfg.anthropicModel)) {
    params.betas = [BETA_FALLBACK];
    params.fallbacks = MODO_FALLBACK;
  }
  return params;
}

function cabeceras(apiKey: string, betas: string[] | undefined): Record<string, string> {
  const salida: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': apiKey.trim(),
    'anthropic-version': VERSION_API,
  };
  if (betas && betas.length > 0) salida['anthropic-beta'] = betas.join(',');
  return salida;
}

function reintentoDeCabecera(respuesta: Response): number | null {
  const ms = respuesta.headers.get('retry-after-ms');
  if (ms !== null && Number.isFinite(Number(ms))) return Number(ms);
  const segundos = respuesta.headers.get('retry-after');
  if (segundos !== null && Number.isFinite(Number(segundos))) return Number(segundos) * 1000;
  return null;
}

/**
 * Espera que `promesa` termine como mucho `ms` y se cancela si `senal` se aborta. `alCancelar` libera
 * el recurso subyacente (el lector del stream).
 */
function conTiempoYCancelacion<T>(
  promesa: Promise<T>,
  senal: AbortSignal,
  ms: number,
  alCancelar: () => void,
): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    if (senal.aborted) {
      alCancelar();
      rechazar(new ErrorCancelado('cancelado por el cliente'));
      return;
    }
    const alVencer = setTimeout(() => {
      alCancelar();
      rechazar(new ErrorAnthropic({ tiempo: true }));
    }, ms);
    const alAbortar = () => {
      clearTimeout(alVencer);
      alCancelar();
      rechazar(new ErrorCancelado('cancelado por el cliente'));
    };
    senal.addEventListener('abort', alAbortar, { once: true });
    const limpiar = () => {
      clearTimeout(alVencer);
      senal.removeEventListener('abort', alAbortar);
    };
    promesa.then(
      (valor) => {
        limpiar();
        resolver(valor);
      },
      () => {
        limpiar();
        rechazar(new ErrorAnthropic({ conexion: true }));
      },
    );
  });
}

/** Una sola petición HTTP (sin reintentos). Las cabeceras llegan dentro de `TIMEOUT_LECTURA_MS`. */
async function pedir(
  apiKey: string,
  params: ParametrosMensaje,
  stream: boolean,
  senal: AbortSignal,
): Promise<Response> {
  if (senal.aborted) throw new ErrorCancelado('cancelado por el cliente');
  const { betas, ...cuerpo } = params;
  const controlador = new AbortController();
  let vencio = false;
  const alVencer = setTimeout(() => {
    vencio = true;
    controlador.abort();
  }, TIMEOUT_LECTURA_MS);
  const alAbortar = () => controlador.abort();
  senal.addEventListener('abort', alAbortar);
  try {
    return await fetch(URL_MENSAJES, {
      method: 'POST',
      headers: cabeceras(apiKey, betas),
      body: JSON.stringify(stream ? { ...cuerpo, stream: true } : cuerpo),
      signal: controlador.signal,
    });
  } catch {
    if (senal.aborted) throw new ErrorCancelado('cancelado por el cliente');
    throw new ErrorAnthropic(vencio ? { tiempo: true } : { conexion: true });
  } finally {
    clearTimeout(alVencer);
    senal.removeEventListener('abort', alAbortar);
  }
}

/** Respuesta HTTP no exitosa -> `ErrorAnthropic` con el tipo de error del cuerpo. */
async function verificarOk(respuesta: Response): Promise<Response> {
  if (respuesta.ok) return respuesta;
  let tipo: string | null = null;
  try {
    const cuerpo = (await respuesta.json()) as { error?: { type?: unknown } } | null;
    const t = cuerpo?.error?.type;
    tipo = typeof t === 'string' ? t : null;
  } catch {
    tipo = null;
  }
  throw new ErrorAnthropic({
    estado: respuesta.status,
    tipo,
    requestId: respuesta.headers.get('request-id'),
    reintentoEnMs: reintentoDeCabecera(respuesta),
  });
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/** Retraso antes del reintento `intento` (0 para el primero): el del servidor o el del SDK. */
function retrasoDeReintento(intento: number, error: ErrorAnthropic): number {
  if (error.reintentoEnMs !== null && error.reintentoEnMs >= 0 && error.reintentoEnMs <= RETRY_AFTER_MAXIMO_MS) {
    return error.reintentoEnMs;
  }
  const base = Math.min(RETRASO_INICIAL_MS * 2 ** intento, RETRASO_MAXIMO_MS);
  return base * (1 - 0.25 * Math.random());
}

function esReintentable(error: unknown): error is ErrorAnthropic {
  if (!(error instanceof ErrorAnthropic)) return false;
  if (error.conexion || error.tiempo) return true;
  const estado = error.estado ?? 0;
  return estado === 408 || estado === 409 || estado === 429 || estado >= 500;
}

/** Repite `operacion` mientras falle de forma transitoria, como el SDK (`max_retries = 2`). */
async function conReintentos<T>(operacion: () => Promise<T>, senal: AbortSignal): Promise<T> {
  for (let intento = 0; ; intento++) {
    try {
      return await operacion();
    } catch (error) {
      if (!esReintentable(error) || intento >= REINTENTOS_MAXIMOS || senal.aborted) throw error;
      await esperar(retrasoDeReintento(intento, error));
    }
  }
}

/** Mensaje completo sin streaming (quiz y retroalimentación). */
export async function crearMensaje(
  apiKey: string,
  params: ParametrosMensaje,
  senal: AbortSignal = SIN_CANCELAR,
): Promise<MensajeCompleto> {
  return conReintentos(async () => {
    const respuesta = await verificarOk(await pedir(apiKey, params, false, senal));
    const texto = await conTiempoYCancelacion(respuesta.text(), senal, TIMEOUT_LECTURA_MS, () => {});
    try {
      return JSON.parse(texto) as MensajeCompleto;
    } catch {
      throw new ErrorAnthropic({});
    }
  }, senal);
}

/** Eventos del stream de Mensajes (`stream: true`), ya decodificados. Lanza `ErrorAnthropic` si
 * Anthropic envía un evento `error` dentro del stream. */
export async function* transmitirMensaje(
  apiKey: string,
  params: ParametrosMensaje,
  senal: AbortSignal,
): AsyncGenerator<EventoAnthropic> {
  const respuesta = await conReintentos(
    async () => verificarOk(await pedir(apiKey, params, true, senal)),
    senal,
  );
  if (!respuesta.body) throw new ErrorAnthropic({ conexion: true });
  const lector = respuesta.body.getReader();
  const liberar = () => {
    lector.cancel().catch(() => {});
  };
  const decodificador = new TextDecoder();
  let pendiente = '';
  try {
    for (;;) {
      const trozo = await conTiempoYCancelacion(lector.read(), senal, TIMEOUT_LECTURA_MS, liberar);
      if (trozo.done) break;
      pendiente = (pendiente + decodificador.decode(trozo.value, { stream: true })).replace(/\r\n/g, '\n');
      let fin = pendiente.indexOf('\n\n');
      while (fin >= 0) {
        const bloque = pendiente.slice(0, fin);
        pendiente = pendiente.slice(fin + 2);
        const datos = bloque
          .split('\n')
          .filter((linea) => linea.startsWith('data:'))
          .map((linea) => linea.slice(5).replace(/^ /, ''))
          .join('\n');
        if (datos !== '') {
          const evento = decodificarEvento(datos);
          if (evento.type === 'error') {
            const error = evento.error as { type?: unknown } | undefined;
            const tipo = typeof error?.type === 'string' ? error.type : null;
            throw new ErrorAnthropic({ tipo });
          }
          if (evento.type !== 'ping') yield evento;
        }
        fin = pendiente.indexOf('\n\n');
      }
    }
  } finally {
    liberar();
  }
}

function decodificarEvento(datos: string): EventoAnthropic {
  try {
    const evento = JSON.parse(datos) as EventoAnthropic;
    if (typeof evento !== 'object' || evento === null || typeof evento.type !== 'string') {
      throw new Error('evento sin tipo');
    }
    return evento;
  } catch {
    throw new ErrorAnthropic({});
  }
}

/** Texto de todos los bloques `text` de un mensaje (equivale a `_texto_del_mensaje`). */
export function textoDelMensaje(mensaje: MensajeCompleto): string {
  return mensaje.content
    .filter((bloque) => bloque.type === 'text')
    .map((bloque) => bloque.text ?? '')
    .join('');
}
