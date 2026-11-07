/**
 * Acceso a D1. Convenciones: fechas como texto ISO (`tiempo.ts`), booleanos como 0/1, JSON como
 * texto. No hay transacciones interactivas en D1: lo que deba ser atómico va en `db.batch([...])`
 * o en una sola sentencia (`INSERT ... ON CONFLICT`, `UPDATE ... SET x = x + ?`).
 */

export type Fila = Record<string, unknown>;

export function aBool(valor: unknown): boolean {
  return valor === 1 || valor === true || valor === '1';
}

export function aEntero(valor: unknown, porDefecto = 0): number {
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? Math.trunc(n) : porDefecto;
}

export function aTexto(valor: unknown): string | null {
  return valor === null || valor === undefined ? null : String(valor);
}

/** `true` si el error de D1 es por violar un índice o restricción UNIQUE. */
export function esViolacionUnica(error: unknown): boolean {
  const mensaje = error instanceof Error ? error.message : String(error);
  return /UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(mensaje);
}

/** Primera fila o `null`. */
export async function primera<T extends object = Fila>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const fila = await db
    .prepare(sql)
    .bind(...params)
    .first<T>();
  return fila ?? null;
}

/** Todas las filas. */
export async function todas<T extends object = Fila>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const { results } = await db
    .prepare(sql)
    .bind(...params)
    .all<T>();
  return results;
}

/** Ejecuta una sentencia sin leer filas. Devuelve filas afectadas. */
export async function ejecutar(db: D1Database, sql: string, ...params: unknown[]): Promise<number> {
  const resultado = await db
    .prepare(sql)
    .bind(...params)
    .run();
  return resultado.meta.changes ?? 0;
}

/** Un valor escalar (primera columna de la primera fila). */
export async function escalar<T = unknown>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const valor = await db
    .prepare(sql)
    .bind(...params)
    .first<T>(undefined as unknown as string);
  return (valor ?? null) as T | null;
}
