/**
 * Validación de entradas con zod y respuesta 422 con el formato por defecto de FastAPI
 * (`detail` es una lista de `{type, loc, msg, input}`), que es lo que el frontend ya maneja.
 */
import { z } from 'zod';
import { imprimibleUtf8 } from './texto';

export class ErrorValidacion extends Error {
  readonly detalle: unknown[];
  constructor(detalle: unknown[]) {
    super('Entrada no válida');
    this.detalle = detalle;
  }
  respuesta(): Response {
    return new Response(JSON.stringify({ detail: this.detalle }), {
      status: 422,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
}

function seguro(valor: unknown): unknown {
  if (typeof valor === 'number' && !Number.isFinite(valor)) return String(valor);
  if (typeof valor === 'string') return imprimibleUtf8(valor);
  if (Array.isArray(valor)) return valor.map(seguro);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor as Record<string, unknown>).map(([k, v]) => [k, seguro(v)]));
  }
  return valor;
}

/** Valida `datos` con `esquema`; si falla, lanza `ErrorValidacion` (422). */
export function validar<T>(esquema: z.ZodType<T>, datos: unknown, ubicacion: 'body' | 'query' | 'path' = 'body'): T {
  const resultado = esquema.safeParse(datos);
  if (resultado.success) return resultado.data;
  const detalle = resultado.error.issues.map((issue) => ({
    type: issue.code,
    loc: [ubicacion, ...issue.path.map(String)],
    msg: issue.message,
    input: seguro(datos),
  }));
  throw new ErrorValidacion(detalle);
}

/** Cuerpo JSON de la petición, o 422 si no es JSON. */
export async function cuerpoJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ErrorValidacion([
      { type: 'json_invalid', loc: ['body'], msg: 'El cuerpo debe ser JSON válido.', input: null },
    ]);
  }
}

/** Parámetros de consulta como objeto (solo el primer valor de cada clave). */
export function consulta(request: Request): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [clave, valor] of new URL(request.url).searchParams) {
    if (!(clave in salida)) salida[clave] = valor;
  }
  return salida;
}

/** Entero opcional de la consulta (`"3"` -> 3; vacío o ausente -> undefined; otra cosa -> NaN). */
export const enteroOpcional = z.preprocess((v) => {
  if (v === undefined || v === '') return undefined;
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return Number(v);
  return v;
}, z.number().int().optional());
