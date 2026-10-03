/**
 * Worker de Cloudflare que sirve el OVA (F7-01).
 *
 * - Los archivos de `dist/` (la SPA compilada) los sirve Cloudflare directamente; cualquier ruta
 *   desconocida devuelve `index.html` (`not_found_handling: single-page-application`).
 * - Solo `/api/*` pasa por este código (`run_worker_first`): se reenvía tal cual al backend FastAPI
 *   definido en `API_ORIGIN`. Así el frontend sigue llamando a `/api` en el mismo origen (sin CORS)
 *   y el chat del mentor (SSE) llega en streaming, porque la respuesta se devuelve sin leerla.
 */

interface Env {
  /** Origen del backend, sin barra final: `https://api.ova.ejemplo.edu.co`. */
  API_ORIGIN?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

function json(status: number, detail: string): Response {
  return new Response(JSON.stringify({ detail }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const origen = (env.API_ORIGIN ?? '').replace(/\/+$/, '');
    if (!origen) return json(503, 'El servidor del OVA todavía no está conectado.');

    const destino = new URL(url.pathname + url.search, origen);
    const cabeceras = new Headers(request.headers);
    // La API limita intentos por IP y solo confía en X-Forwarded-For con TRUST_PROXY=true:
    // se SOBRESCRIBE con la IP real que ve Cloudflare para que el cliente no pueda falsearla.
    const ip = request.headers.get('cf-connecting-ip');
    if (ip) cabeceras.set('x-forwarded-for', ip);
    cabeceras.set('x-forwarded-proto', 'https');
    cabeceras.delete('host');

    try {
      return await fetch(destino, {
        method: request.method,
        headers: cabeceras,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
      });
    } catch {
      return json(502, 'No se pudo contactar con el servidor del OVA.');
    }
  },
};
