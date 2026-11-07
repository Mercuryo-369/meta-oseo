/**
 * Persistencia del mentor en D1: conversaciones, mensajes, valoraciones y límites diarios
 * (equivale a app/ai/store.py).
 *
 * Aislamiento: TODA consulta lleva el `user_id` del token. Una sesión o un mensaje ajenos responde
 * igual que uno inexistente (`null`), para no revelar que existen.
 *
 * D1 no tiene transacciones interactivas: cada operación es una sentencia o un `batch`.
 */
import { aEntero, aTexto, primera, todas } from '../core/db';
import { aIso, ahora } from '../core/tiempo';
import { type Uso, KIND_CHAT } from './usage';
import type { Cita } from './prompt';

const ROL_USUARIO = 'user';
const ROL_ASSISTANT = 'assistant';
const LARGO_MAX_MODELO = 64;

/** Inicio (en UTC) del día local de `ahoraDate`; `offsetHoras` es la zona (Colombia: -5). */
export function inicioDiaUtc(ahoraDate: Date, offsetHoras: number): Date {
  const desplazamiento = offsetHoras * 3_600_000;
  const local = new Date(ahoraDate.getTime() + desplazamiento);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - desplazamiento);
}

/** Consultas del usuario de esa clase (`chat`, `quiz`) que hoy consumieron al modelo. */
export async function contarUsoHoy(
  db: D1Database,
  userId: number,
  kind: string,
  ahoraDate: Date,
  offsetHoras: number,
): Promise<number> {
  const fila = await primera<{ total: number }>(
    db,
    'SELECT COUNT(*) AS total FROM usage_events WHERE user_id = ? AND kind = ? AND created_at >= ?',
    userId,
    kind,
    aIso(inicioDiaUtc(ahoraDate, offsetHoras)),
  );
  return aEntero(fila?.total);
}

/** Mensajes del usuario al mentor que hoy consumieron al modelo (límite diario del chat). */
export function contarMensajesHoy(
  db: D1Database,
  userId: number,
  ahoraDate: Date,
  offsetHoras: number,
): Promise<number> {
  return contarUsoHoy(db, userId, KIND_CHAT, ahoraDate, offsetHoras);
}

export interface Turno {
  sessionId: number;
}

/**
 * Guarda el mensaje del estudiante (abriendo la conversación si hace falta). `null` si `sessionId`
 * no existe o no es del usuario. Un reintento idéntico (sin respuesta en medio) no se duplica.
 */
export async function prepararTurno(
  db: D1Database,
  userId: number,
  sessionId: number | null,
  modulo: number | null,
  textoUsuario: string,
): Promise<Turno | null> {
  const instante = ahora();
  let idSesion: number;
  if (sessionId === null) {
    const insertada = await db
      .prepare('INSERT INTO chat_sessions (user_id, modulo, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .bind(userId, modulo, instante, instante)
      .run();
    idSesion = aEntero(insertada.meta.last_row_id);
  } else {
    const existente = await primera<{ id: number }>(
      db,
      'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
      sessionId,
      userId,
    );
    if (!existente) return null;
    idSesion = aEntero(existente.id);
  }

  const ultimo = await primera<{ id: number; role: string; content: string }>(
    db,
    'SELECT id, role, content FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 1',
    idSesion,
  );
  if (!ultimo || ultimo.role !== ROL_USUARIO || ultimo.content !== textoUsuario) {
    await db
      .prepare(
        'INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(idSesion, ROL_USUARIO, textoUsuario, instante)
      .run();
  }
  // El modulo solo se actualiza si la petición lo trae (como el Python).
  await db
    .prepare('UPDATE chat_sessions SET updated_at = ?, modulo = COALESCE(?, modulo) WHERE id = ?')
    .bind(instante, modulo, idSesion)
    .run();
  return { sessionId: idSesion };
}

/** Guarda la respuesta del mentor con su modelo, sus tokens y sus citas. Devuelve su id. */
export async function guardarRespuesta(
  db: D1Database,
  sessionId: number,
  texto: string,
  datos: { modelo: string; uso: Uso; citas: Cita[] },
): Promise<number> {
  const instante = ahora();
  const insertada = await db
    .prepare(
      'INSERT INTO chat_messages (session_id, role, content, input_tokens, output_tokens, model, citas, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      sessionId,
      ROL_ASSISTANT,
      texto,
      datos.uso.input_tokens,
      datos.uso.output_tokens,
      Array.from(datos.modelo).slice(0, LARGO_MAX_MODELO).join(''),
      datos.citas.length > 0 ? JSON.stringify(datos.citas) : null,
      instante,
    )
    .run();
  // La conversación pudo borrarse mientras se generaba: la actualización no hace nada entonces.
  await db.prepare('UPDATE chat_sessions SET updated_at = ? WHERE id = ?').bind(instante, sessionId).run();
  return aEntero(insertada.meta.last_row_id);
}

/** Id de la conversación más reciente del usuario, o `null`. */
export async function ultimaSesionId(db: D1Database, userId: number): Promise<number | null> {
  const fila = await primera<{ id: number }>(
    db,
    'SELECT id FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1',
    userId,
  );
  return fila ? aEntero(fila.id) : null;
}

export interface MensajeGuardado {
  id: number;
  role: string;
  content: string;
  citas: Cita[];
  valoracion: number | null;
  created_at: string;
}

/** Últimos `limite` mensajes (en orden cronológico) de una conversación del usuario; `null` si no es suya. */
export async function historial(
  db: D1Database,
  userId: number,
  sessionId: number,
  limite: number,
): Promise<{ sessionId: number; mensajes: MensajeGuardado[] } | null> {
  const sesion = await primera<{ id: number }>(
    db,
    'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
    sessionId,
    userId,
  );
  if (!sesion) return null;
  const filas = await todas<{
    id: number;
    role: string;
    content: string;
    citas: string | null;
    valoracion: number | null;
    created_at: string;
  }>(
    db,
    'SELECT id, role, content, citas, valoracion, created_at FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT ?',
    sessionId,
    limite,
  );
  const mensajes = filas.reverse().map((f) => ({
    id: aEntero(f.id),
    role: f.role,
    content: f.content,
    citas: citasDeTexto(f.citas),
    valoracion: f.valoracion === null || f.valoracion === undefined ? null : aEntero(f.valoracion),
    created_at: f.created_at,
  }));
  return { sessionId: aEntero(sesion.id), mensajes };
}

/** Borra la conversación y sus mensajes. `false` si no existe o no es del usuario. */
export async function borrarSesion(db: D1Database, userId: number, sessionId: number): Promise<boolean> {
  const sesion = await primera<{ id: number }>(
    db,
    'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
    sessionId,
    userId,
  );
  if (!sesion) return false;
  // Los mensajes se borran de forma explícita: no depende de que D1 aplique el CASCADE.
  await db.batch([
    db.prepare('DELETE FROM chat_messages WHERE session_id = ?').bind(sessionId),
    db.prepare('DELETE FROM chat_sessions WHERE id = ? AND user_id = ?').bind(sessionId, userId),
  ]);
  return true;
}

/**
 * Guarda (1, -1) o retira (0) la valoración de una respuesta del mentor del propio usuario.
 * `false` si el mensaje no existe, no es del mentor o no es de una conversación del usuario.
 */
export async function fijarValoracion(
  db: D1Database,
  userId: number,
  messageId: number,
  valor: -1 | 0 | 1,
): Promise<boolean> {
  const cambios = await db
    .prepare(
      'UPDATE chat_messages SET valoracion = ? WHERE id = ? AND role = ? AND session_id IN (SELECT id FROM chat_sessions WHERE user_id = ?)',
    )
    .bind(valor === 0 ? null : valor, messageId, ROL_ASSISTANT, userId)
    .run();
  return aEntero(cambios.meta.changes) > 0;
}

/** Citas guardadas con un mensaje (lista vacía si no hay o el JSON no sirve). */
export function citasDeTexto(crudo: string | null | undefined): Cita[] {
  const texto = aTexto(crudo);
  if (!texto) return [];
  try {
    const datos: unknown = JSON.parse(texto);
    return Array.isArray(datos) ? (datos as Cita[]) : [];
  } catch {
    return [];
  }
}
