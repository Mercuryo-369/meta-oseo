/** Progreso por módulo, resultados de actividades y logros (docs/api-contract.md, F1-06). */
import { Hono } from 'hono';
import { z } from 'zod';
import { type App, requiereUsuario } from '../core/auth';
import {
  ACTIVITY_ID_PATTERN,
  MAX_ACTIVITY_ATTEMPTS,
  MAX_ACTIVITY_DETAIL_BYTES,
  MAX_ACTIVITY_SCORE,
  MAX_SECTION_LENGTH,
  MAX_TIME_DELTA_SECONDS,
  MODULE_COUNT,
  TIPOS_ACTIVIDAD,
} from '../core/constantes';
import { asegurarGuardable } from '../core/texto';
import { consulta, cuerpoJson, enteroOpcional, validar } from '../core/validar';
import { listarLogros } from '../servicios/logros';
import { actualizarProgreso, leerProgreso, listarResultados, registrarResultado } from '../servicios/progreso';

const ModuloPath = z.object({ modulo: z.coerce.number().int().min(1).max(MODULE_COUNT) });
const ActivityIdPath = z.object({ activity_id: z.string().regex(ACTIVITY_ID_PATTERN) });

const ProgressUpdate = z.object({
  seccion_actual: z
    .string()
    .max(MAX_SECTION_LENGTH)
    .nullable()
    .optional()
    .transform((v, ctx) => {
      if (v === null || v === undefined) return v;
      try {
        return asegurarGuardable(v);
      } catch (e) {
        ctx.addIssue({ code: 'custom', message: (e as Error).message });
        return z.NEVER;
      }
    }),
  tiempo_delta_seg: z.number().int().min(0).max(MAX_TIME_DELTA_SECONDS).nullable().optional(),
  completado: z.boolean().nullable().optional(),
});

const ActivityResultCreate = z.object({
  modulo: z.number().int().min(1).max(MODULE_COUNT),
  tipo: z.enum(TIPOS_ACTIVIDAD),
  puntaje: z.number().int().min(0).max(MAX_ACTIVITY_SCORE),
  intentos: z.number().int().min(1).max(MAX_ACTIVITY_ATTEMPTS),
  completada: z.boolean(),
  detalle: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .superRefine((v, ctx) => {
      if (!v) return;
      let serializado: string;
      try {
        serializado = JSON.stringify(v);
        asegurarGuardable(serializado);
      } catch {
        ctx.addIssue({ code: 'custom', message: 'El detalle debe ser un objeto JSON válido.' });
        return;
      }
      if (new TextEncoder().encode(serializado).length > MAX_ACTIVITY_DETAIL_BYTES) {
        ctx.addIssue({
          code: 'custom',
          message: `El detalle no puede superar ${MAX_ACTIVITY_DETAIL_BYTES / 1024} KB serializado.`,
        });
      }
    }),
});

const FiltroModulo = z.object({ modulo: enteroOpcional.pipe(z.number().int().min(1).max(MODULE_COUNT).optional()) });

// Middleware por ruta (no `use('*')`): un `use` dentro de un sub-app montado en /api alcanzaría a las rutas
// públicas que se monten después (por ejemplo /api/verify).
export const rutasProgreso = new Hono<App>();

rutasProgreso.get('/progress', requiereUsuario, async (c) => c.json(await leerProgreso(c.env.DB, c.get('usuario').id)));

rutasProgreso.put('/progress/:modulo', requiereUsuario, async (c) => {
  const { modulo } = validar(ModuloPath, c.req.param(), 'path');
  const body = validar(ProgressUpdate, await cuerpoJson(c.req.raw));
  return c.json(await actualizarProgreso(c.env.DB, c.get('usuario').id, modulo, body));
});

rutasProgreso.get('/activities/results', requiereUsuario, async (c) => {
  const { modulo } = validar(FiltroModulo, consulta(c.req.raw), 'query');
  return c.json({ resultados: await listarResultados(c.env.DB, c.get('usuario').id, modulo) });
});

rutasProgreso.post('/activities/:activity_id/result', requiereUsuario, async (c) => {
  const { activity_id } = validar(ActivityIdPath, c.req.param(), 'path');
  const body = validar(ActivityResultCreate, await cuerpoJson(c.req.raw));
  return c.json(await registrarResultado(c.env.DB, c.get('usuario').id, activity_id, body));
});

rutasProgreso.get('/achievements', requiereUsuario, async (c) => c.json({ logros: await listarLogros(c.env.DB, c.get('usuario').id) }));
