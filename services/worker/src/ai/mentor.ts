/**
 * Conversación con el mentor: consume el stream de Anthropic y lo convierte en eventos SSE
 * (equivale a app/ai/mentor.py, en una sola pasada sin cola: el emisor escribe directamente en el
 * ReadableStream de la respuesta).
 *
 * Contrato de la respuesta (docs/api-contract.md): `sesion`, `text`*, `citas`, `mensaje`, `usage`,
 * y un ÚNICO evento terminal `done` o `error`. En un fallo no hay `citas` ni `mensaje` y la respuesta
 * no se guarda. El consumo se registra en `usage_events` en cualquier desenlace en el que Anthropic
 * ya informó algún uso.
 */
import type { ParametrosMensaje } from './anthropic';
import { ErrorCancelado, ErrorIncompleto, transmitirMensaje, type EventoAnthropic } from './anthropic';
import {
  CODIGO_MAX_TOKENS,
  CODIGO_REFUSAL,
  CODIGO_UPSTREAM_ERROR,
  FALLO_INCOMPLETO,
  MENSAJE_MAX_TOKENS,
  MENSAJE_REFUSAL,
  clasificarFallo,
} from './errores';
import type { Cita } from './prompt';
import { guardarRespuesta } from './store';
import { KIND_CHAT, registrarUso, type Uso, usoDe } from './usage';

/** Emite un evento SSE (nombre y carga). */
export type Emisor = (nombre: string, datos: Record<string, unknown>) => void;

/** Estado del mensaje que se va acumulando durante el stream (como el snapshot del SDK). */
interface Snapshot {
  modelo: string | null;
  stopReason: string | null;
  stopCategoria: string | null;
  uso: Uso;
}

export interface ConversacionChat {
  db: D1Database;
  apiKey: string;
  params: ParametrosMensaje;
  userId: number;
  /** Conversación en la que se guarda la respuesta (`null`: no se guarda ni se anuncia). */
  sessionId: number | null;
  citas: Cita[];
}

const FIN_CORRECTO = new Set(['end_turn', 'stop_sequence']);

export class ConversacionMentor {
  private readonly textos: string[] = [];
  private snapshot: Snapshot | null = null;
  private usoGuardado = false;

  constructor(private readonly conversacion: ConversacionChat) {}

  /**
   * Ejecuta la consulta y emite sus eventos. No lanza por fallos del modelo (los traduce a `error`);
   * solo lanza `ErrorCancelado` si el cliente se desconectó (en ese caso no se emite nada más).
   */
  async ejecutar(emitir: Emisor, senal: AbortSignal): Promise<void> {
    const c = this.conversacion;
    if (c.sessionId !== null) emitir('sesion', { session_id: c.sessionId });
    let terminal: { nombre: 'done' | 'error'; datos: Record<string, unknown> };
    try {
      const mensaje = await this.leerStream(emitir, senal);
      terminal = this.eventoTerminal(mensaje);
      // El consumo se guarda ANTES de avisar al cliente: al ver `usage`/`done` la fila ya existe.
      await this.guardarUso();
      if (terminal.nombre === 'done') await this.anunciarRespuesta(mensaje, emitir);
      if (mensaje.stopReason !== null) emitir('usage', { ...mensaje.uso });
    } catch (error) {
      if (error instanceof ErrorCancelado) {
        await this.guardarUso();
        throw error;
      }
      const fallo = clasificarFallo(error);
      // Solo tipo y estado: sin cabeceras ni cuerpo (llevan datos del estudiante).
      if (fallo.transitorio) console.warn('Fallo del mentor', fallo.code, error);
      else console.error('Fallo del mentor (configuración)', fallo.code, error);
      await this.guardarUso();
      terminal = { nombre: 'error', datos: { code: fallo.code, message: fallo.message } };
    }
    emitir(terminal.nombre, terminal.datos);
  }

  /** Lee el stream reenviando solo el texto (el pensamiento no se transmite) y devuelve el estado. */
  private async leerStream(emitir: Emisor, senal: AbortSignal): Promise<Snapshot> {
    for await (const evento of transmitirMensaje(this.conversacion.apiKey, this.conversacion.params, senal)) {
      this.procesar(evento, emitir);
    }
    if (this.snapshot === null) throw new ErrorIncompleto('El stream terminó sin message_start');
    return this.snapshot;
  }

  private procesar(evento: EventoAnthropic, emitir: Emisor): void {
    if (evento.type === 'message_start') {
      const mensaje = (evento.message ?? {}) as {
        model?: string;
        usage?: Parameters<typeof usoDe>[0];
      };
      this.snapshot = {
        modelo: typeof mensaje.model === 'string' ? mensaje.model : null,
        stopReason: null,
        stopCategoria: null,
        uso: usoDe(mensaje.usage),
      };
      return;
    }
    if (this.snapshot === null) return;
    if (evento.type === 'content_block_delta') {
      const delta = (evento.delta ?? {}) as { type?: string; text?: unknown };
      // Solo texto: los bloques de pensamiento no se reenvían.
      if (delta.type === 'text_delta' && typeof delta.text === 'string' && delta.text !== '') {
        this.textos.push(delta.text);
        emitir('text', { delta: delta.text });
      }
      return;
    }
    if (evento.type === 'content_block_start') {
      const bloque = (evento.content_block ?? {}) as { type?: string; to?: { model?: string } };
      if (bloque.type === 'fallback') {
        console.info('Rechazo de seguridad: el fallback del servidor siguió la respuesta en', bloque.to?.model);
      }
      return;
    }
    if (evento.type === 'message_delta') {
      const delta = (evento.delta ?? {}) as { stop_reason?: string | null; stop_details?: { category?: string | null } | null };
      this.snapshot.stopReason = delta.stop_reason ?? null;
      this.snapshot.stopCategoria = delta.stop_details?.category ?? null;
      const usage = (evento.usage ?? {}) as Parameters<typeof usoDe>[0];
      const actual = this.snapshot.uso;
      this.snapshot.uso = {
        input_tokens: usage?.input_tokens ?? actual.input_tokens,
        output_tokens: usage?.output_tokens ?? actual.output_tokens,
        cache_read_input_tokens: usage?.cache_read_input_tokens ?? actual.cache_read_input_tokens,
        cache_creation_input_tokens:
          usage?.cache_creation_input_tokens ?? actual.cache_creation_input_tokens,
      };
    }
  }

  /** `done` si el modelo terminó su turno; `error` en cualquier otro desenlace. */
  private eventoTerminal(mensaje: Snapshot): { nombre: 'done' | 'error'; datos: Record<string, unknown> } {
    const razon = mensaje.stopReason;
    if (razon !== null && FIN_CORRECTO.has(razon)) {
      return { nombre: 'done', datos: { stop_reason: razon } };
    }
    if (razon === 'refusal') {
      // Solo la categoría va al log; la explicación no se envía al estudiante.
      console.info('El mentor rechazó una consulta (categoría:', mensaje.stopCategoria, ')');
      return { nombre: 'error', datos: { code: CODIGO_REFUSAL, message: MENSAJE_REFUSAL } };
    }
    if (razon === 'max_tokens') {
      console.warn('Respuesta del mentor cortada por max_tokens');
      return { nombre: 'error', datos: { code: CODIGO_MAX_TOKENS, message: MENSAJE_MAX_TOKENS } };
    }
    if (razon === null) console.warn('El stream de Anthropic se cortó antes de informar el stop_reason');
    else console.error('El mentor terminó con un stop_reason inesperado:', razon);
    return {
      nombre: 'error',
      datos: { code: CODIGO_UPSTREAM_ERROR, message: FALLO_INCOMPLETO.message },
    };
  }

  /** Guarda la respuesta completa y avisa de sus fuentes y de su id (antes de `usage`). */
  private async anunciarRespuesta(mensaje: Snapshot, emitir: Emisor): Promise<void> {
    const c = this.conversacion;
    if (c.citas.length > 0) emitir('citas', { citas: c.citas });
    const texto = this.textos.join('');
    if (c.sessionId === null || texto.trim() === '') return;
    try {
      const id = await guardarRespuesta(c.db, c.sessionId, texto, {
        modelo: mensaje.modelo ?? c.params.model,
        uso: mensaje.uso,
        citas: c.citas,
      });
      emitir('mensaje', { message_id: id });
    } catch (error) {
      // No guardar el historial no debe tumbar la respuesta que el estudiante ya leyó.
      console.error('No se pudo guardar la respuesta del mentor en chat_messages', error);
    }
  }

  /** Registra el consumo conocido (una sola vez; no hace nada si Anthropic no informó uso). */
  async guardarUso(): Promise<void> {
    if (this.usoGuardado || this.snapshot === null) return;
    this.usoGuardado = true;
    const c = this.conversacion;
    await registrarUso(
      c.db,
      c.userId,
      this.snapshot.modelo ?? c.params.model,
      this.snapshot.uso,
      KIND_CHAT,
    );
  }
}

