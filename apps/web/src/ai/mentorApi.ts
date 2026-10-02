/**
 * Llamadas JSON del mentor que no son el chat en streaming (docs/api-contract.md, "Mentor de IA"):
 * historial, borrado de la conversación, valoración, sugerencias de refuerzo y quiz de práctica.
 * El chat en sí (POST /api/chat, SSE) vive en `useMentor.ts`.
 *
 * Todas usan `apiFetch`: agregan el token, traducen los fallos de red y lanzan `ApiError`. Los
 * componentes nunca muestran el texto crudo del servidor: `errores.ts` lo traduce.
 */
import { apiFetch } from '@/lib/api';
import type { ContextoPedagogico } from '@/stores/contextoPedagogico';

/** Fuente del curso (mismo formato que las citas del chat). */
export interface FuenteCurso {
  id: string;
  modulo: number;
  seccion_id: string | null;
  titulo: string;
  url: string;
}

export type Valoracion = 1 | -1;

export interface MensajeHistorial {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  citas: FuenteCurso[];
  valoracion: Valoracion | null;
  created_at: string;
}

export interface RespuestaHistorial {
  /** `null` si el estudiante nunca ha conversado. */
  session_id: number | null;
  messages: MensajeHistorial[];
}

export interface RespuestaValoracion {
  message_id: number;
  valor: Valoracion | null;
}

export type PrioridadRefuerzo = 'alta' | 'media' | 'baja';
export type MotivoRefuerzo =
  'atascada' | 'precision_baja' | 'en_curso' | 'varios_intentos' | 'pendiente';

export interface SugerenciaRefuerzo {
  actividad_id: string;
  concepto: string;
  modulo: number;
  seccion: string;
  seccion_titulo: string;
  /** Ruta interna del frontend: `/modulo/3?s=m3_4_osteocito_sensor`. */
  url: string;
  motivo_tipo: MotivoRefuerzo;
  /** Frase lista para mostrar: «Necesitaste 4 intentos para completarla». */
  motivo: string;
  prioridad: PrioridadRefuerzo;
  puntaje: number;
}

export interface RespuestaRefuerzo {
  sugerencias: SugerenciaRefuerzo[];
}

export type Dificultad = 'basica' | 'intermedia' | 'avanzada';

export interface PreguntaQuiz {
  id: number;
  enunciado: string;
  opciones: { texto: string }[];
  /** Posición (desde 0) de la opción correcta. */
  correcta: number;
  explicacion: string;
  dificultad: Dificultad;
  /** Etiquetas ("1", "2"...) de `RespuestaQuiz.fuentes` en las que se apoya la pregunta. */
  fuentes: string[];
}

export interface RespuestaQuiz {
  modulo: number | null;
  seccion: string | null;
  tema: string;
  preguntas: PreguntaQuiz[];
  fuentes: FuenteCurso[];
  /** Siempre `false`: el quiz de práctica no otorga puntos ni logros. */
  otorga_puntos: boolean;
}

/** Cuerpo de POST /api/mentor/quiz: al menos uno entre `tema`, `modulo` y `contexto`. */
export interface CuerpoQuiz {
  tema?: string;
  modulo?: number;
  seccion?: string;
  contexto?: ContextoPedagogico;
}

/** Sin `sessionId`, el servidor devuelve la conversación más reciente del estudiante. */
export function obtenerHistorial(
  sessionId?: number,
  signal?: AbortSignal,
): Promise<RespuestaHistorial> {
  const consulta = sessionId === undefined ? '' : `?session_id=${sessionId}`;
  return apiFetch<RespuestaHistorial>(`/chat/history${consulta}`, { signal });
}

export function borrarConversacion(sessionId: number): Promise<void> {
  return apiFetch<void>(`/chat/session?session_id=${sessionId}`, { method: 'DELETE' });
}

/** `valor`: 1 (útil), -1 (no útil) o 0 para retirar la valoración. */
export function valorarRespuesta(
  messageId: number,
  valor: Valoracion | 0,
): Promise<RespuestaValoracion> {
  return apiFetch<RespuestaValoracion>('/chat/feedback', {
    method: 'POST',
    body: { message_id: messageId, valor },
  });
}

export function obtenerRefuerzo(modulo?: number): Promise<RespuestaRefuerzo> {
  const consulta = modulo === undefined ? '' : `?modulo=${modulo}`;
  return apiFetch<RespuestaRefuerzo>(`/mentor/refuerzo${consulta}`);
}

export function pedirQuiz(cuerpo: CuerpoQuiz, signal?: AbortSignal): Promise<RespuestaQuiz> {
  return apiFetch<RespuestaQuiz>('/mentor/quiz', { method: 'POST', body: cuerpo, signal });
}
