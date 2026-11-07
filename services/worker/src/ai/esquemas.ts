/**
 * Validación de los cuerpos del mentor con zod, con los mismos límites que los esquemas Pydantic de
 * services/api (app/schemas/chat.py, contexto.py y mentor.py). Las longitudes se miden en puntos de
 * código, como `len()` de Python, no en unidades UTF-16 de JavaScript.
 */
import { z } from 'zod';
import { ACTIVITY_ID_PATTERN, MODULE_COUNT, NIVELES, TIPOS_ACTIVIDAD } from '../core/constantes';
import { asegurarGuardable } from '../core/texto';

/** Longitud en puntos de código (como `len()` en Python). */
export function largo(texto: string): number {
  return Array.from(texto).length;
}

function esGuardable(texto: string): boolean {
  try {
    asegurarGuardable(texto);
    return true;
  } catch {
    return false;
  }
}

const MENSAJE_NO_GUARDABLE = 'Contiene caracteres Unicode no válidos.';
const textoGuardable = z.string().refine(esGuardable, MENSAJE_NO_GUARDABLE);

/** Cadena corta del contexto pedagógico (≤ 64 puntos de código, guardable). */
const CadenaCorta = z
  .string()
  .refine((s) => largo(s) <= 64, 'Debe tener como máximo 64 caracteres.')
  .refine(esGuardable, MENSAJE_NO_GUARDABLE);

const Modulo = z.number().int().min(1).max(MODULE_COUNT);

const ActividadActual = z.object({
  id: CadenaCorta,
  tipo: z.enum(TIPOS_ACTIVIDAD),
  intentos: z.number().int().min(0),
  completada: z.boolean(),
});

/** `ContextoPedagogico` en camelCase (PLAN §3, congelado). */
export const ContextoPedagogico = z.object({
  modulo: Modulo,
  seccion: CadenaCorta,
  actividadActual: ActividadActual.nullish(),
  estructuraSeleccionada: CadenaCorta.nullish(),
  moleculaSeleccionada: CadenaCorta.nullish(),
  nivel: z.enum(NIVELES),
  tiempoEnSeccionSeg: z.number().int().min(0),
  interaccionesRecientes: z.array(CadenaCorta).max(10),
  progreso: z.object({
    modulosCompletados: z.array(Modulo).max(MODULE_COUNT),
    puntajeTotal: z.number().int().min(0),
    logros: z.array(CadenaCorta).max(100),
  }),
});
export type ContextoPedagogico = z.infer<typeof ContextoPedagogico>;

const MensajeChat = z.object({
  role: z.enum(['user', 'assistant']),
  content: z
    .string()
    .refine((s) => largo(s) >= 1 && largo(s) <= 8000, 'Debe tener entre 1 y 8000 caracteres.')
    .refine(esGuardable, MENSAJE_NO_GUARDABLE)
    .refine((s) => s.trim() !== '', 'El mensaje no puede estar vacío.'),
});

/** `POST /api/chat` */
export const CuerpoChat = z
  .object({
    messages: z.array(MensajeChat).min(1).max(40),
    contexto: ContextoPedagogico.nullish(),
    session_id: z.number().int().min(1).nullish(),
  })
  .refine((v) => v.messages[v.messages.length - 1]?.role === 'user', {
    message: 'El último mensaje debe ser del usuario.',
  });
export type CuerpoChat = z.infer<typeof CuerpoChat>;

/** `POST /api/chat/feedback` */
export const CuerpoFeedback = z.object({
  message_id: z.number().int().min(1),
  valor: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});

/** `POST /api/mentor/quiz`: al menos uno entre tema, módulo y contexto. */
export const CuerpoQuiz = z
  .object({
    tema: textoGuardable.refine((s) => largo(s) <= 120, 'Debe tener como máximo 120 caracteres.').nullish(),
    modulo: Modulo.nullish(),
    seccion: textoGuardable
      .refine((s) => largo(s) >= 1 && largo(s) <= 64, 'Debe tener entre 1 y 64 caracteres.')
      .nullish(),
    contexto: ContextoPedagogico.nullish(),
  })
  .transform((v, ctx) => {
    // El tema se normaliza (espacios colapsados); vacío equivale a no indicarlo.
    const tema = v.tema == null ? null : v.tema.split(/\s+/).filter(Boolean).join(' ') || null;
    const modulo = v.modulo ?? null;
    const seccion = v.seccion ?? null;
    const contexto = v.contexto ?? null;
    if (tema === null && contexto === null && modulo === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Indica un tema, un módulo o el contexto pedagógico para el quiz.',
        input: v,
      });
      return z.NEVER;
    }
    if (seccion !== null && modulo === null && contexto === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Para indicar una sección hace falta el módulo o el contexto.',
        input: v,
      });
      return z.NEVER;
    }
    return { tema, modulo, seccion, contexto };
  });
export type CuerpoQuiz = z.output<typeof CuerpoQuiz>;

/** `POST /api/mentor/retroalimentacion` */
export const CuerpoRetroalimentacion = z.object({
  pregunta_id: z
    .string()
    .regex(ACTIVITY_ID_PATTERN)
    .refine(esGuardable, MENSAJE_NO_GUARDABLE),
  respuesta: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => largo(s) >= 10 && largo(s) <= 2000, 'Debe tener entre 10 y 2000 caracteres.')
    .refine(esGuardable, MENSAJE_NO_GUARDABLE),
  contexto: ContextoPedagogico.nullish(),
});
export type CuerpoRetroalimentacion = z.infer<typeof CuerpoRetroalimentacion>;
