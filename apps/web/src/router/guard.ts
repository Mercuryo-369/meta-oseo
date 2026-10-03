/**
 * Guard de sesión del router.
 *
 * - Sin sesión: toda ruta salvo las marcadas `meta.publica` redirige a /acceso.
 * - Con sesión: /acceso redirige a / (o al destino que se pidió antes de pasar por /acceso).
 * - Si hay un token guardado pero aún no se conoce al usuario (recarga de página), se
 *   valida con GET /api/me antes de decidir.
 * - MODO DESARROLLO SIN BACKEND: con `pnpm dev` y VITE_DEV_BYPASS_AUTH=true la sesión se
 *   considera iniciada con un usuario ficticio y NO se llama a /api/me. La condición
 *   `import.meta.env.DEV` es constante `false` en producción, así que el bloque (y el
 *   módulo `devBypass`) se eliminan del build.
 */
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';
import { MODO_DEMO } from '@/config';
import { useAuthStore } from '@/stores/auth';

const BARRA_INVERTIDA = String.fromCharCode(92);

/** Solo se aceptan destinos internos ("/modulo/3"), nunca URLs externas ni "//host". */
export function destinoSeguro(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  if (!valor.startsWith('/') || valor.startsWith('//') || valor.includes(BARRA_INVERTIDA)) {
    return null;
  }
  return valor;
}

export async function guardarSesion(to: RouteLocationNormalized): Promise<true | RouteLocationRaw> {
  const auth = useAuthStore();

  if (MODO_DEMO) {
    const { usuarioDemo } = await import('@/lib/modoDemo');
    if (!auth.usuario) auth.establecerUsuario(usuarioDemo());
  } else if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
    const { activarSesionDeDesarrollo } = await import('@/lib/devBypass');
    activarSesionDeDesarrollo(auth);
  } else if (!auth.usuario && auth.token) {
    await auth.restore();
  }

  if (to.name === 'acceso') {
    return auth.isAuthenticated ? (destinoSeguro(to.query.redirect) ?? '/') : true;
  }
  if (to.meta.publica || auth.isAuthenticated) return true;

  // Se recuerda a dónde iba, salvo que sea el inicio.
  const destino = to.fullPath === '/' ? undefined : to.fullPath;
  return destino ? { name: 'acceso', query: { redirect: destino } } : { name: 'acceso' };
}
