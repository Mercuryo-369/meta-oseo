/**
 * Consumo de tokens del mentor (equivale a app/ai/usage.py): lectura de lo que informa Anthropic
 * y registro en `usage_events`, que es lo que cuenta las cuotas diarias.
 */
import { ahora } from '../core/tiempo';

export const KIND_CHAT = 'chat';
export const KIND_QUIZ = 'quiz';
const LARGO_MAX_MODELO = 64; // columna `usage_events.model`

export interface Uso {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

export const USO_CERO: Uso = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

/** Campos de `usage` tal como llegan de Anthropic (`null` o ausentes valen 0). */
export interface UsoAnthropic {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function usoDe(u: UsoAnthropic | null | undefined): Uso {
  return {
    input_tokens: u?.input_tokens ?? 0,
    output_tokens: u?.output_tokens ?? 0,
    cache_read_input_tokens: u?.cache_read_input_tokens ?? 0,
    cache_creation_input_tokens: u?.cache_creation_input_tokens ?? 0,
  };
}

/** Suma de consumos (un quiz puede necesitar más de una llamada al modelo). */
export function sumarUso(a: Uso, b: Uso): Uso {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_read_input_tokens: a.cache_read_input_tokens + b.cache_read_input_tokens,
    cache_creation_input_tokens: a.cache_creation_input_tokens + b.cache_creation_input_tokens,
  };
}

/** Recorta por puntos de código (como el `[:64]` de Python). */
function recortarModelo(modelo: string): string {
  return Array.from(modelo).slice(0, LARGO_MAX_MODELO).join('');
}

/** Guarda una fila de `usage_events`. Un fallo aquí no debe tumbar la respuesta ya entregada. */
export async function registrarUso(
  db: D1Database,
  userId: number,
  modelo: string,
  uso: Uso,
  kind: string = KIND_CHAT,
): Promise<void> {
  try {
    await db
      .prepare(
        'INSERT INTO usage_events (user_id, kind, model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        userId,
        kind,
        recortarModelo(modelo),
        uso.input_tokens,
        uso.output_tokens,
        uso.cache_read_input_tokens,
        uso.cache_creation_input_tokens,
        ahora(),
      )
      .run();
  } catch (error) {
    console.error('No se pudo registrar el consumo del mentor en usage_events', error);
  }
}

export { recortarModelo };
