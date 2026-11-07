/**
 * Formato de los eventos SSE del mentor (equivale a app/ai/sse.py; contrato en
 * docs/api-contract.md, "Mentor de IA"). Cada evento es `event: <nombre>\ndata: <json>\n\n`. El
 * comentario `: ping` mantiene viva la conexión cuando el modelo tarda.
 */

/** Cada 15 s sin eventos el contrato pide un comentario de latido. */
export const PING_INTERVALO_MS = 15_000;
export const PING = ': ping\n\n';

/** Cabeceras de la respuesta: sin caché y sin buffering en nginx (cada evento llega al instante). */
export const CABECERAS_SSE: Record<string, string> = {
  'content-type': 'text/event-stream',
  'cache-control': 'no-cache',
  'x-accel-buffering': 'no',
};

/** Trama SSE. El JSON va en una sola línea (los saltos de línea se escapan en JSON). */
export function evento(nombre: string, datos: Record<string, unknown>): string {
  return `event: ${nombre}\ndata: ${JSON.stringify(datos)}\n\n`;
}
