/**
 * Traduce los errores del mentor a mensajes en español para el estudiante (F1-13).
 *
 * Regla: NUNCA se muestra texto crudo del servidor ni de una excepción (podría ser técnico,
 * estar en inglés o revelar detalles internos). Cada código conocido tiene un mensaje propio
 * y cualquier otro cae en uno genérico.
 */
import type { ApiError } from '@/lib/api';
import { MENSAJE_SIN_CONEXION } from '@/lib/api';

export interface FalloMentor {
  /** Texto para el estudiante. */
  mensaje: string;
  /** Si tiene sentido ofrecer "Reintentar" (falso cuando reintentar no puede arreglarlo). */
  reintentable: boolean;
}

export const FALLO_GENERICO: FalloMentor = {
  mensaje: 'El mentor no pudo responder en este momento. Inténtalo de nuevo.',
  reintentable: true,
};

/** El flujo se cortó sin `done` ni `error` (red, proxy o servidor). */
export const FALLO_CORTE: FalloMentor = {
  mensaje: 'La respuesta se interrumpió antes de terminar. Puedes reintentar.',
  reintentable: true,
};

export const FALLO_SIN_TEXTO: FalloMentor = {
  mensaje: 'El mentor no devolvió una respuesta. Inténtalo de nuevo.',
  reintentable: true,
};

export const FALLO_MENSAJE_LARGO: FalloMentor = {
  mensaje: 'Tu mensaje es demasiado largo. Acórtalo e inténtalo de nuevo.',
  reintentable: false,
};

/** Errores HTTP antes de abrir el stream (`apiFetchRaw` + `leerApiError`). */
export function falloDeApi(err: ApiError): FalloMentor {
  if (err.status === 0 || err.code === 'red') {
    return { mensaje: MENSAJE_SIN_CONEXION, reintentable: true };
  }
  if (err.status === 401) {
    return {
      mensaje: 'Tu sesión expiró. Ingresa de nuevo para hablar con el mentor.',
      reintentable: false,
    };
  }
  if (err.status === 503 && err.code === 'ia_no_configurada') {
    return { mensaje: 'El mentor no está disponible por ahora.', reintentable: false };
  }
  if (err.status === 422) {
    return {
      mensaje: 'No pude procesar ese mensaje. Prueba con uno más corto o distinto.',
      reintentable: false,
    };
  }
  if (err.status === 429 && err.code === 'limite_diario') {
    return {
      mensaje:
        'Hoy ya usaste todos tus mensajes con el mentor. Vuelve mañana; mientras tanto puedes seguir con los módulos.',
      reintentable: false,
    };
  }
  if (err.status === 404 && err.code === 'sesion_no_encontrada') {
    return {
      mensaje: 'Esa conversación ya no existe. Envía tu mensaje otra vez para empezar una nueva.',
      reintentable: true,
    };
  }
  if (err.status === 429) {
    return {
      mensaje: 'Estás enviando muchos mensajes seguidos. Espera un momento e inténtalo de nuevo.',
      reintentable: true,
    };
  }
  return FALLO_GENERICO;
}

/** Códigos del evento SSE `error` (docs/api-contract.md). */
export function falloDeStream(code: unknown): FalloMentor {
  switch (code) {
    case 'refusal':
      return {
        mensaje: 'El mentor no puede responder a esa pregunta. Reformúlala o pregunta otra cosa.',
        reintentable: true,
      };
    case 'max_tokens':
      return {
        mensaje:
          'La respuesta se cortó por ser demasiado larga. Pide un resumen o una parte más concreta.',
        reintentable: true,
      };
    case 'rate_limited':
      return {
        mensaje: 'El mentor está muy ocupado ahora. Espera un momento e inténtalo de nuevo.',
        reintentable: true,
      };
    case 'upstream_error':
      return {
        mensaje: 'El mentor tuvo un problema para responder. Inténtalo de nuevo.',
        reintentable: true,
      };
    default:
      return FALLO_GENERICO;
  }
}

/* -------------------------------------------------------------------------------------------
 * Interfaces del mentor que no son el chat (F4-03, F3-11, F3-07)
 * ----------------------------------------------------------------------------------------- */

const MENSAJE_SESION_EXPIRADA = 'Tu sesión expiró. Ingresa de nuevo para continuar.';

/** Errores de POST /api/mentor/quiz. */
export function falloDeQuiz(err: ApiError): FalloMentor {
  if (err.status === 0 || err.code === 'red') {
    return { mensaje: MENSAJE_SIN_CONEXION, reintentable: true };
  }
  if (err.status === 401) return { mensaje: MENSAJE_SESION_EXPIRADA, reintentable: false };
  if (err.status === 503 && err.code === 'ia_no_configurada') {
    return { mensaje: 'El mentor no está disponible por ahora.', reintentable: false };
  }
  if (err.status === 429 && err.code === 'limite_diario_quiz') {
    return {
      mensaje:
        'Hoy ya hiciste todos tus quizzes de práctica. Vuelve mañana; mientras tanto puedes seguir con los módulos.',
      reintentable: false,
    };
  }
  if (err.status === 429) {
    return {
      mensaje: 'Estás pidiendo muchas cosas seguidas. Espera un momento e inténtalo de nuevo.',
      reintentable: true,
    };
  }
  if (err.status === 422 && err.code === 'material_insuficiente') {
    return {
      mensaje:
        'No encontré material del curso para preparar preguntas sobre esto. Abre una sección del módulo e inténtalo de nuevo.',
      reintentable: false,
    };
  }
  if (err.status === 422) {
    return { mensaje: 'No pude preparar el quiz con esos datos.', reintentable: false };
  }
  return {
    mensaje: 'No se pudo preparar el quiz esta vez. Inténtalo de nuevo en un momento.',
    reintentable: true,
  };
}

/** Errores de GET /api/chat/history al recuperar la conversación anterior. */
export function falloDeHistorial(err: ApiError): FalloMentor {
  if (err.status === 401) return { mensaje: MENSAJE_SESION_EXPIRADA, reintentable: false };
  return {
    mensaje: 'No pudimos recuperar tu conversación anterior.',
    reintentable: err.status !== 404,
  };
}

/** Errores de POST /api/chat/feedback. */
export function falloDeValoracion(err: ApiError): FalloMentor {
  if (err.status === 401) return { mensaje: MENSAJE_SESION_EXPIRADA, reintentable: false };
  if (err.status === 0 || err.code === 'red') {
    return { mensaje: 'No se pudo guardar tu valoración: sin conexión.', reintentable: true };
  }
  return { mensaje: 'No se pudo guardar tu valoración. Inténtalo de nuevo.', reintentable: true };
}

/** Errores de DELETE /api/chat/session. */
export function falloDeBorrado(err: ApiError): FalloMentor {
  if (err.status === 401) return { mensaje: MENSAJE_SESION_EXPIRADA, reintentable: false };
  if (err.status === 0 || err.code === 'red') {
    return { mensaje: `${MENSAJE_SIN_CONEXION} La conversación no se borró.`, reintentable: true };
  }
  return {
    mensaje: 'No se pudo borrar la conversación. Inténtalo de nuevo.',
    reintentable: true,
  };
}
