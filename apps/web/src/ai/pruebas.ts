/**
 * Utilidades de prueba para el mentor: fabrican respuestas SSE como las de POST /api/chat.
 * Solo las importan los `*.test.ts`; no entran en el build de producción.
 */

const codificador = new TextEncoder();

/** Un evento SSE completo: `event: <nombre>\ndata: <json>\n\n`. */
export function eventoSse(nombre: string, datos: unknown): string {
  return `event: ${nombre}\ndata: ${JSON.stringify(datos)}\n\n`;
}

export const sseTexto = (delta: string) => eventoSse('text', { delta });
export const sseFin = (stopReason = 'end_turn') => eventoSse('done', { stop_reason: stopReason });
export const sseError = (code: string, message = 'texto del servidor') =>
  eventoSse('error', { code, message });
export const sseUso = (entrada = 10, salida = 5, lectura = 0, creacion = 0) =>
  eventoSse('usage', {
    input_tokens: entrada,
    output_tokens: salida,
    cache_read_input_tokens: lectura,
    cache_creation_input_tokens: creacion,
  });
/** Eventos de F3-05, F3-09 y F3-11: conversación guardada, fuentes del curso e id de la respuesta. */
export const sseSesion = (sessionId: number) => eventoSse('sesion', { session_id: sessionId });
export const sseCitas = (citas: unknown[]) => eventoSse('citas', { citas });
export const sseMensaje = (messageId: number) => eventoSse('mensaje', { message_id: messageId });
export const PING = ': ping\n\n';

const CABECERAS_SSE = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' };

/** Respuesta 200 cuyo cuerpo emite los trozos dados y se cierra. */
export function respuestaSse(trozos: string | string[]): Response {
  const lista = Array.isArray(trozos) ? trozos : [trozos];
  const flujo = new ReadableStream<Uint8Array>({
    start(controlador) {
      for (const trozo of lista) controlador.enqueue(codificador.encode(trozo));
      controlador.close();
    },
  });
  return new Response(flujo, { status: 200, headers: CABECERAS_SSE });
}

/** Respuesta 200 que emite los trozos y luego falla (conexión que se cae a mitad del stream). */
export function respuestaSseQueFalla(trozos: string[], error: unknown): Response {
  const flujo = new ReadableStream<Uint8Array>({
    async start(controlador) {
      for (const trozo of trozos) controlador.enqueue(codificador.encode(trozo));
      // Un instante para que el consumidor procese lo enviado antes del error.
      await new Promise((r) => setTimeout(r, 0));
      controlador.error(error);
    },
  });
  return new Response(flujo, { status: 200, headers: CABECERAS_SSE });
}

export interface FlujoControlable {
  respuesta: Response;
  /** Emite un trozo (texto UTF-8). */
  enviar(trozo: string): void;
  cerrar(): void;
  fallar(error: unknown): void;
  /** `true` si el cliente canceló la lectura del cuerpo (`reader.cancel()`). */
  readonly canceladoPorElCliente: boolean;
}

/**
 * Stream que se alimenta a mano, para comprobar el estado entre trozos. Si se pasa la señal del
 * `fetch`, un `abort()` hace fallar el cuerpo con `AbortError`, como lo haría el navegador.
 */
export function flujoControlable(signal?: AbortSignal | null): FlujoControlable {
  let control!: ReadableStreamDefaultController<Uint8Array>;
  let cancelado = false;
  const flujo = new ReadableStream<Uint8Array>({
    start(c) {
      control = c;
    },
    cancel() {
      cancelado = true;
    },
  });
  signal?.addEventListener('abort', () => {
    try {
      control.error(new DOMException('The operation was aborted.', 'AbortError'));
    } catch {
      // El flujo ya estaba cerrado.
    }
  });
  return {
    respuesta: new Response(flujo, { status: 200, headers: CABECERAS_SSE }),
    enviar: (trozo) => control.enqueue(codificador.encode(trozo)),
    cerrar: () => control.close(),
    fallar: (error) => control.error(error),
    get canceladoPorElCliente() {
      return cancelado;
    },
  };
}
