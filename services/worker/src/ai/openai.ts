/**
 * Cliente mínimo para proveedores compatibles con la API de OpenAI (`/chat/completions`): OpenAI,
 * Groq, DeepSeek, Mistral, OpenRouter, Gemini (su endpoint compatible), etc. Pedido del usuario
 * (2026-11-07): que el docente pueda configurar «cualquier proveedor» desde su panel.
 *
 * Para no tocar el resto del mentor, devuelve lo mismo que el cliente de Anthropic: en streaming,
 * eventos con la forma de Anthropic (`message_start`, `content_block_delta` con `text_delta`,
 * `message_delta` con `stop_reason` y `usage`); sin streaming, un `MensajeCompleto`. Los fallos se
 * lanzan como `ErrorAnthropic` (solo estado y tipo) para que `clasificarFallo` los entienda.
 */
import {
  type BloqueTexto,
  ErrorAnthropic,
  type EventoAnthropic,
  type MensajeCompleto,
  type ParametrosMensaje,
  type Turno,
  type UsoMensaje,
} from './anthropic';

const TIMEOUT_MS = 120_000;
const REINTENTOS = 2;

function textoDe(contenido: string | BloqueTexto[]): string {
  return typeof contenido === 'string' ? contenido : contenido.map((b) => b.text).join('\n');
}

/** `stop`/`length`/`content_filter` de OpenAI -> `end_turn`/`max_tokens`/`refusal` de Anthropic. */
function razonDeParada(finish: unknown): string {
  if (finish === 'length') return 'max_tokens';
  if (finish === 'content_filter') return 'refusal';
  return 'end_turn';
}

interface UsoOpenAi {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number } | null;
}

function usoDeOpenAi(u: UsoOpenAi | null | undefined): UsoMensaje {
  return {
    input_tokens: u?.prompt_tokens ?? 0,
    output_tokens: u?.completion_tokens ?? 0,
    cache_read_input_tokens: u?.prompt_tokens_details?.cached_tokens ?? 0,
    cache_creation_input_tokens: 0,
  };
}

/** Cuerpo de `/chat/completions`. `modo` decide cómo se pide la salida estructurada. */
function cuerpo(
  params: ParametrosMensaje,
  stream: boolean,
  modo: 'json_schema' | 'json_object' | 'texto',
  esOpenAi: boolean,
): Record<string, unknown> {
  const mensajes: Array<{ role: string; content: string }> = [];
  let sistema = (params.system ?? []).map((b) => b.text).join('\n\n');
  const formato = params.output_config.format;
  if (formato && modo === 'json_object') {
    // Sin esquema en la petición: se describe en el sistema para que el JSON tenga la forma esperada.
    sistema += `\n\nResponde ÚNICAMENTE con un objeto JSON válido que cumpla este esquema:\n${JSON.stringify(formato.schema)}`;
  }
  if (sistema.trim() !== '') mensajes.push({ role: 'system', content: sistema });
  for (const turno of params.messages as Turno[]) mensajes.push({ role: turno.role, content: textoDe(turno.content) });
  const salida: Record<string, unknown> = { model: params.model, messages: mensajes, stream };
  // OpenAI exige `max_completion_tokens` en sus modelos recientes; los compatibles suelen usar `max_tokens`.
  salida[esOpenAi ? 'max_completion_tokens' : 'max_tokens'] = params.max_tokens;
  if (stream) salida.stream_options = { include_usage: true };
  if (formato && modo === 'json_schema') {
    salida.response_format = {
      type: 'json_schema',
      json_schema: { name: 'respuesta', schema: formato.schema },
    };
  } else if (formato && modo === 'json_object') {
    salida.response_format = { type: 'json_object' };
  }
  return salida;
}

async function pedir(
  baseUrl: string,
  apiKey: string,
  datos: Record<string, unknown>,
  senal: AbortSignal,
): Promise<Response> {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  for (let intento = 0; ; intento++) {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), TIMEOUT_MS);
    const alCancelar = () => control.abort();
    senal.addEventListener('abort', alCancelar, { once: true });
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(datos),
        signal: control.signal,
      });
      if (respuesta.ok) return respuesta;
      const reintentable = respuesta.status === 429 || respuesta.status >= 500;
      if (!reintentable || intento >= REINTENTOS) {
        let tipo: string | null = null;
        try {
          const error = (await respuesta.json()) as { error?: { type?: string; code?: string } };
          tipo = error.error?.type ?? error.error?.code ?? null;
        } catch {
          // sin cuerpo JSON: basta el estado
        }
        throw new ErrorAnthropic({ estado: respuesta.status, tipo });
      }
      await new Promise((r) => setTimeout(r, 500 * 2 ** intento));
    } catch (error) {
      if (error instanceof ErrorAnthropic) throw error;
      if (senal.aborted) throw error;
      if (intento >= REINTENTOS) throw new ErrorAnthropic({ conexion: true });
      await new Promise((r) => setTimeout(r, 500 * 2 ** intento));
    } finally {
      clearTimeout(temporizador);
      senal.removeEventListener('abort', alCancelar);
    }
  }
}

/** Un 400 al pedir `json_schema`: el proveedor no lo soporta; se reintenta con `json_object`. */
async function pedirConFormato(
  baseUrl: string,
  apiKey: string,
  params: ParametrosMensaje,
  stream: boolean,
  esOpenAi: boolean,
  senal: AbortSignal,
): Promise<Response> {
  const conEsquema = params.output_config.format ? 'json_schema' : 'texto';
  try {
    return await pedir(baseUrl, apiKey, cuerpo(params, stream, conEsquema, esOpenAi), senal);
  } catch (error) {
    if (conEsquema === 'json_schema' && error instanceof ErrorAnthropic && error.estado === 400) {
      return pedir(baseUrl, apiKey, cuerpo(params, stream, 'json_object', esOpenAi), senal);
    }
    throw error;
  }
}

interface RespuestaChat {
  model?: string;
  choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> }; finish_reason?: string }>;
  usage?: UsoOpenAi | null;
}

/** Mensaje completo sin streaming (quiz y retroalimentación). */
export async function crearChat(
  baseUrl: string,
  apiKey: string,
  params: ParametrosMensaje,
  esOpenAi: boolean,
  senal: AbortSignal = new AbortController().signal,
): Promise<MensajeCompleto> {
  const respuesta = await pedirConFormato(baseUrl, apiKey, params, false, esOpenAi, senal);
  let datos: RespuestaChat;
  try {
    datos = (await respuesta.json()) as RespuestaChat;
  } catch {
    throw new ErrorAnthropic({});
  }
  const eleccion = datos.choices?.[0];
  const contenido = eleccion?.message?.content;
  const texto =
    typeof contenido === 'string'
      ? contenido
      : (contenido ?? []).map((p) => (p.type === 'text' ? (p.text ?? '') : '')).join('');
  return {
    model: datos.model ?? params.model,
    stop_reason: razonDeParada(eleccion?.finish_reason),
    content: [{ type: 'text', text: texto }],
    usage: usoDeOpenAi(datos.usage),
  };
}

interface TrozoChat {
  model?: string;
  choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>;
  usage?: UsoOpenAi | null;
}

/** Stream de `/chat/completions` convertido a eventos con la forma de Anthropic. */
export async function* transmitirChat(
  baseUrl: string,
  apiKey: string,
  params: ParametrosMensaje,
  esOpenAi: boolean,
  senal: AbortSignal,
): AsyncGenerator<EventoAnthropic> {
  const respuesta = await pedirConFormato(baseUrl, apiKey, params, true, esOpenAi, senal);
  if (!respuesta.body) throw new ErrorAnthropic({ conexion: true });
  const lector = respuesta.body.getReader();
  const decodificador = new TextDecoder();
  let pendiente = '';
  let empezado = false;
  let razon: string | null = null;
  let uso: UsoMensaje | null = null;
  let modelo = params.model;
  try {
    for (;;) {
      const trozo = await lector.read();
      if (trozo.done) break;
      pendiente = (pendiente + decodificador.decode(trozo.value, { stream: true })).replace(/\r\n/g, '\n');
      let fin = pendiente.indexOf('\n\n');
      while (fin >= 0) {
        const bloque = pendiente.slice(0, fin);
        pendiente = pendiente.slice(fin + 2);
        fin = pendiente.indexOf('\n\n');
        const datos = bloque
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).replace(/^ /, ''))
          .join('\n');
        if (datos === '' || datos === '[DONE]') continue;
        let evento: TrozoChat;
        try {
          evento = JSON.parse(datos) as TrozoChat;
        } catch {
          throw new ErrorAnthropic({});
        }
        if (typeof evento.model === 'string') modelo = evento.model;
        if (!empezado) {
          empezado = true;
          yield { type: 'message_start', message: { model: modelo, usage: {} } };
        }
        const eleccion = evento.choices?.[0];
        const texto = eleccion?.delta?.content;
        if (typeof texto === 'string' && texto !== '') {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: texto } };
        }
        if (eleccion?.finish_reason) razon = razonDeParada(eleccion.finish_reason);
        if (evento.usage) uso = usoDeOpenAi(evento.usage);
      }
    }
  } finally {
    lector.cancel().catch(() => {});
  }
  if (!empezado) throw new ErrorAnthropic({});
  yield { type: 'message_delta', delta: { stop_reason: razon ?? 'end_turn' }, usage: uso ?? {} };
}
