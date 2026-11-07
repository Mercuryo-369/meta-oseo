/**
 * Límites de peticiones con el binding Rate Limiting de Cloudflare (wrangler.json `ratelimits`):
 * ventana fija de 60 s por clave (IP o usuario). Equivale a app/core/rate_limit.py; aquí el
 * conteo vive en Cloudflare y vale para todas las instancias del Worker.
 */
import type { RateLimit } from './entorno';
import { demasiadosIntentos } from './errores';

/** IP del cliente: la que ve Cloudflare (no se confía en X-Forwarded-For). */
export function ipCliente(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-real-ip') ?? 'desconocida';
}

/** Registra un intento de `clave` y lanza 429 `demasiados_intentos` si se excede el límite. */
export async function limitar(limite: RateLimit | undefined, clave: string): Promise<void> {
  if (!limite) return; // sin binding (pruebas): sin límite
  const { success } = await limite.limit({ key: clave });
  if (!success) throw demasiadosIntentos(60);
}
