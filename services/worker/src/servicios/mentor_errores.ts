/**
 * Fábricas de errores del mentor con los mensajes de app/ai/errors.py y de los módulos del mentor.
 * Todas devuelven un `ApiError` (formato `{"detail": {"code", "message"}}` del contrato).
 */
import { ApiError } from '../core/errores';

export const iaNoConfigurada = (): ApiError =>
  new ApiError(503, 'ia_no_configurada', 'El mentor de IA no está disponible en este momento.');

/** 429 `limite_diario`: el estudiante agotó sus mensajes de hoy (`Retry-After` en segundos). */
export const limiteDiario = (limite: number, retryAfter: number): ApiError =>
  new ApiError(
    429,
    'limite_diario',
    `Hoy ya usaste tus ${limite} mensajes con el mentor. Puedes seguir estudiando los módulos y volver a preguntarle mañana.`,
    { headers: { 'Retry-After': String(Math.max(1, retryAfter)) } },
  );

/** 429 `limite_diario_quiz`: agotó sus quizzes de práctica de hoy (la retroalimentación comparte la cuota). */
export const limiteDiarioQuiz = (limite: number, retryAfter: number): ApiError =>
  new ApiError(
    429,
    'limite_diario_quiz',
    `Hoy ya hiciste tus ${limite} quizzes de práctica con el mentor. Puedes seguir con las actividades del módulo y volver a practicar mañana.`,
    { headers: { 'Retry-After': String(Math.max(1, retryAfter)) } },
  );

export const sesionNoEncontrada = (): ApiError =>
  new ApiError(404, 'sesion_no_encontrada', 'No se encontró esa conversación.');

export const mensajeNoEncontrado = (): ApiError =>
  new ApiError(404, 'mensaje_no_encontrado', 'No se encontró esa respuesta del mentor.');

export const preguntaNoEncontrada = (): ApiError =>
  new ApiError(404, 'pregunta_no_encontrada', 'No se encontró esa pregunta.');

/** 422 `material_insuficiente`: no hay material del curso sobre el tema pedido. */
export const materialInsuficiente = (): ApiError =>
  new ApiError(
    422,
    'material_insuficiente',
    'No encontré material del curso sobre ese tema para preparar preguntas. Prueba con un concepto de los módulos.',
  );

/** 502 `ia_error`: el modelo rechazó la consulta o el servicio falló (el detalle solo va al log). */
export const iaError = (mensaje: string): ApiError => new ApiError(502, 'ia_error', mensaje);

/** 502 `quiz_invalido`: el modelo no entregó un quiz utilizable tras el reintento. */
export const quizInvalido = (mensaje: string): ApiError => new ApiError(502, 'quiz_invalido', mensaje);

/** 502 `retroalimentacion_invalida`: el modelo no entregó una retroalimentación utilizable. */
export const retroalimentacionInvalida = (mensaje: string): ApiError =>
  new ApiError(502, 'retroalimentacion_invalida', mensaje);
