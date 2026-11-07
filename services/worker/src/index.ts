/**
 * API del OVA «Metabolismo óseo» en Cloudflare Workers (migración desde FastAPI, 2026-11-07).
 *
 * - Los archivos de `apps/web/dist` (la SPA compilada) los sirve Cloudflare como assets; cualquier
 *   ruta desconocida devuelve `index.html` (`not_found_handling: single-page-application`).
 * - Solo `/api/*` pasa por este código (`run_worker_first`). El contrato es docs/api-contract.md:
 *   mismos cuerpos, códigos y errores que la API de Python, así el frontend no cambia.
 * - Datos en D1 (migrations/), límites con el binding Rate Limiting, secretos con `wrangler secret`.
 */
import { Hono } from 'hono';
import type { App } from './core/auth';
import { VERSION } from './core/constantes';
import { configuracion, type Env } from './core/entorno';
import { ApiError } from './core/errores';
import { ErrorValidacion } from './core/validar';
import { rutasAuth } from './rutas/auth';
import { rutasProgreso } from './rutas/progreso';

const app = new Hono<App>();

// Configuración derivada de las variables del Worker, una vez por petición.
app.use('/api/*', async (c, next) => {
  c.set('config', configuracion(c.env));
  await next();
});

app.get('/api/health', (c) => c.json({ status: 'ok', env: c.get('config').env, version: VERSION }));
app.route('/api', rutasAuth);
app.route('/api', rutasProgreso);

app.notFound((c) =>
  c.req.path.startsWith('/api/')
    ? c.json({ detail: { code: 'no_encontrado', message: 'Ruta no encontrada.' } }, 404)
    : c.env.ASSETS.fetch(c.req.raw),
);

app.onError((error, c) => {
  if (error instanceof ApiError) return error.respuesta();
  if (error instanceof ErrorValidacion) return error.respuesta();
  console.error('Error no controlado en la API:', error);
  return c.json({ detail: { code: 'error_interno', message: 'Ocurrió un error en el servidor.' } }, 500);
});

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> | Response {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    return app.fetch(request, env, ctx);
  },
};
