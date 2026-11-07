/** Usuario autenticado por `Authorization: Bearer <jwt>` (equivale a `get_current_user`). */
import type { Context, MiddlewareHandler } from 'hono';
import type { Nivel, Rol, TipoIdentificacion } from './constantes';
import { aEntero, primera } from './db';
import type { Configuracion, Env } from './entorno';
import { noAutorizado, tokenInvalido } from './errores';
import { decodificarToken } from './jwt';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  tipo_identificacion: TipoIdentificacion;
  numero_identificacion: string;
  nivel: Nivel;
  rol: Rol;
  created_at: string;
}

/** Variables que los manejadores leen del contexto de Hono. */
export type Variables = { config: Configuracion; usuario: Usuario };
export type App = { Bindings: Env; Variables: Variables };
export type Ctx = Context<App>;

interface FilaUsuario {
  id: number;
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  nivel: string;
  rol: string;
  created_at: string;
}

export function usuarioDeFila(fila: FilaUsuario): Usuario {
  return {
    id: aEntero(fila.id),
    nombre: fila.nombre,
    apellido: fila.apellido,
    tipo_identificacion: fila.tipo_identificacion as TipoIdentificacion,
    numero_identificacion: fila.numero_identificacion,
    nivel: fila.nivel as Nivel,
    rol: fila.rol as Rol,
    created_at: fila.created_at,
  };
}

export async function usuarioPorId(db: D1Database, id: number): Promise<Usuario | null> {
  const fila = await primera<FilaUsuario>(db, 'SELECT * FROM users WHERE id = ?', id);
  return fila ? usuarioDeFila(fila) : null;
}

/** Usuario del token Bearer, o `null` si falta o no verifica. */
export async function usuarioDelToken(c: Ctx): Promise<Usuario | null> {
  const cabecera = c.req.header('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(cabecera.trim());
  if (!m) return null;
  const id = await decodificarToken(m[1] as string, c.get('config').secretKey);
  if (id === null) return null;
  return usuarioPorId(c.env.DB, id);
}

/** Middleware: exige un token válido y deja el usuario en `c.get('usuario')`. */
export const requiereUsuario: MiddlewareHandler<App> = async (c, next) => {
  const usuario = await usuarioDelToken(c);
  if (!usuario) throw tokenInvalido();
  c.set('usuario', usuario);
  await next();
};

/** Middleware: además del token, exige el rol docente (403 `no_autorizado` si no). */
export const requiereDocente: MiddlewareHandler<App> = async (c, next) => {
  const usuario = await usuarioDelToken(c);
  if (!usuario) throw tokenInvalido();
  if (usuario.rol !== 'docente') throw noAutorizado();
  c.set('usuario', usuario);
  await next();
};
