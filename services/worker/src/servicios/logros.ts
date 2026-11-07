/**
 * Catálogo y otorgamiento de logros (docs/api-contract.md, "Logros"; equivale a
 * app/services/achievements.py). El otorgamiento es atómico e idempotente gracias a la
 * restricción única `(user_id, codigo)` con `INSERT ... ON CONFLICT DO NOTHING RETURNING`.
 */
import { todas } from '../core/db';
import { ahora } from '../core/tiempo';

export interface LogroLeido {
  codigo: string;
  nombre: string;
  descripcion: string;
  obtenido: boolean;
  obtenido_en: string | null;
}

/** Otorga los logros ligados a completar `modulo`. Devuelve solo los recién otorgados. */
export async function otorgarLogrosDeModulo(db: D1Database, userId: number, modulo: number): Promise<string[]> {
  const codigos = await todas<{ codigo: string }>(
    db,
    'SELECT codigo FROM achievements WHERE modulo = ? ORDER BY codigo',
    modulo,
  );
  const otorgados: string[] = [];
  for (const { codigo } of codigos) {
    const filas = await todas<{ codigo: string }>(
      db,
      'INSERT INTO user_achievements (user_id, codigo, obtenido_en) VALUES (?, ?, ?) ON CONFLICT (user_id, codigo) DO NOTHING RETURNING codigo',
      userId,
      codigo,
      ahora(),
    );
    if (filas.length > 0) otorgados.push(codigo);
  }
  return otorgados;
}

/** Códigos de los logros del usuario, en el orden en que los obtuvo. */
export async function codigosObtenidos(db: D1Database, userId: number): Promise<string[]> {
  const filas = await todas<{ codigo: string }>(
    db,
    'SELECT codigo FROM user_achievements WHERE user_id = ? ORDER BY obtenido_en, id',
    userId,
  );
  return filas.map((f) => f.codigo);
}

/** Catálogo completo con el estado de obtención del usuario (`GET /api/achievements`). */
export async function listarLogros(db: D1Database, userId: number): Promise<LogroLeido[]> {
  const obtenidos = new Map<string, string>();
  for (const f of await todas<{ codigo: string; obtenido_en: string }>(
    db,
    'SELECT codigo, obtenido_en FROM user_achievements WHERE user_id = ?',
    userId,
  )) {
    obtenidos.set(f.codigo, f.obtenido_en);
  }
  const catalogo = await todas<{ codigo: string; nombre: string; descripcion: string }>(
    db,
    'SELECT codigo, nombre, descripcion FROM achievements ORDER BY (modulo IS NULL), modulo, codigo',
  );
  return catalogo.map((item) => ({
    codigo: item.codigo,
    nombre: item.nombre,
    descripcion: item.descripcion,
    obtenido: obtenidos.has(item.codigo),
    obtenido_en: obtenidos.get(item.codigo) ?? null,
  }));
}
