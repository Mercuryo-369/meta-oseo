/** Registro, ingreso y perfil (docs/api-contract.md, "Auth" y "Usuario"). */
import { Hono } from 'hono';
import { z } from 'zod';
import { type App, requiereUsuario, type Usuario, usuarioDeFila } from '../core/auth';
import { NIVELES, TIPOS_IDENTIFICACION } from '../core/constantes';
import { esViolacionUnica, primera } from '../core/db';
import type { Configuracion } from '../core/entorno';
import { usuarioExistente, usuarioNoEncontrado } from '../core/errores';
import { crearToken } from '../core/jwt';
import { ipCliente, limitar } from '../core/limites';
import { normalizarNombre, normalizarNumeroIdentificacion } from '../core/texto';
import { ahora } from '../core/tiempo';
import { cuerpoJson, validar } from '../core/validar';

/** Normaliza y valida con la misma regla del servidor Python (identidad.py). */
const numeroIdentificacion = z.string().transform((v, ctx) => {
  try {
    return normalizarNumeroIdentificacion(v);
  } catch (e) {
    ctx.addIssue({ code: 'custom', message: (e as Error).message });
    return z.NEVER;
  }
});
const nombrePersona = z.string().transform((v, ctx) => {
  try {
    return normalizarNombre(v);
  } catch (e) {
    ctx.addIssue({ code: 'custom', message: (e as Error).message });
    return z.NEVER;
  }
});

const LoginRequest = z.object({
  tipo_identificacion: z.enum(TIPOS_IDENTIFICACION),
  numero_identificacion: numeroIdentificacion,
});
const RegisterRequest = LoginRequest.extend({ nombre: nombrePersona, apellido: nombrePersona });
const UserUpdate = z.object({ nivel: z.enum(NIVELES).nullable().optional() });

async function respuestaToken(usuario: Usuario, config: Configuracion) {
  return {
    access_token: await crearToken(usuario.id, config.secretKey, config.accessTokenExpireMinutes * 60),
    token_type: 'bearer' as const,
    expires_in: config.accessTokenExpireMinutes * 60,
    user: usuario,
  };
}

export const rutasAuth = new Hono<App>();

rutasAuth.post('/auth/register', async (c) => {
  await limitar(c.env.LIMITE_ACCESO, ipCliente(c.req.raw));
  const body = validar(RegisterRequest, await cuerpoJson(c.req.raw));
  const instante = ahora();
  let id: number;
  try {
    // Sin consulta previa: el índice único (tipo, número) es la única fuente de verdad.
    const fila = await primera<{ id: number }>(
      c.env.DB,
      'INSERT INTO users (nombre, apellido, tipo_identificacion, numero_identificacion, nivel, rol, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
      body.nombre,
      body.apellido,
      body.tipo_identificacion,
      body.numero_identificacion,
      'pregrado',
      'estudiante',
      instante,
    );
    id = Number(fila?.id);
  } catch (error) {
    if (esViolacionUnica(error)) throw usuarioExistente();
    throw error;
  }
  const usuario: Usuario = {
    id,
    nombre: body.nombre,
    apellido: body.apellido,
    tipo_identificacion: body.tipo_identificacion,
    numero_identificacion: body.numero_identificacion,
    nivel: 'pregrado',
    rol: 'estudiante',
    created_at: instante,
  };
  return c.json(await respuestaToken(usuario, c.get('config')), 201);
});

rutasAuth.post('/auth/login', async (c) => {
  await limitar(c.env.LIMITE_ACCESO, ipCliente(c.req.raw));
  const body = validar(LoginRequest, await cuerpoJson(c.req.raw));
  const fila = await primera<Parameters<typeof usuarioDeFila>[0]>(
    c.env.DB,
    'SELECT * FROM users WHERE tipo_identificacion = ? AND numero_identificacion = ?',
    body.tipo_identificacion,
    body.numero_identificacion,
  );
  if (!fila) throw usuarioNoEncontrado();
  return c.json(await respuestaToken(usuarioDeFila(fila), c.get('config')));
});

rutasAuth.get('/me', requiereUsuario, (c) => c.json(c.get('usuario')));

rutasAuth.patch('/me', requiereUsuario, async (c) => {
  const body = validar(UserUpdate, await cuerpoJson(c.req.raw));
  const usuario = c.get('usuario');
  if (body.nivel && body.nivel !== usuario.nivel) {
    await c.env.DB.prepare('UPDATE users SET nivel = ? WHERE id = ?').bind(body.nivel, usuario.id).run();
    usuario.nivel = body.nivel;
  }
  return c.json(usuario);
});
