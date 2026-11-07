/**
 * Panel docente: `/api/teacher/*` (docs/api-contract.md, "Docente"; F6-03). Todas las rutas exigen
 * el rol `docente` (401 `token_invalido` sin token válido, 403 `no_autorizado` si es estudiante).
 * Se monta en `/api/teacher` desde `src/index.ts`.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { type App, type Ctx, requiereDocente } from '../core/auth';
import { ApiError } from '../core/errores';
import { aIso } from '../core/tiempo';
import { consulta, cuerpoJson, enteroOpcional, validar } from '../core/validar';
import { paramsMensaje } from '../ai/anthropic';
import { clasificarFallo } from '../ai/errores';
import {
  PROVEEDORES,
  borrarConfigMentor,
  clienteDe,
  guardarConfigMentor,
  publica,
  resolverConfigMentor,
} from '../ai/proveedor';
import {
  csvProgreso,
  detalleEstudiante,
  estadisticasActividades,
  listarEstudiantes,
  resumenCohorte,
  usoMentor,
} from '../servicios/docente';

/** 404 `estudiante_no_encontrado`: id inexistente o que no es de un estudiante. */
export const estudianteNoEncontrado = (): ApiError =>
  new ApiError(404, 'estudiante_no_encontrado', 'No hay un estudiante con ese id.');

/** Entero de la consulta con rango y valor por defecto (fuera de rango o no entero: 422). */
const enteroEnRango = (minimo: number, maximo: number, porDefecto: number) =>
  enteroOpcional.pipe(z.number().int().min(minimo).max(maximo).default(porDefecto));

const ListadoEstudiantes = z.object({
  page: enteroEnRango(1, Number.MAX_SAFE_INTEGER, 1),
  page_size: enteroEnRango(1, 100, 25),
  q: z
    .string()
    .refine((texto) => [...texto].length <= 100, { message: 'Debe tener como máximo 100 caracteres.' })
    .optional(),
  orden: z.enum(['nombre', 'puntaje', 'ultima_actividad']).default('nombre'),
});

const IdEstudiante = z.object({ id: z.coerce.number().int().min(1) });

const LimiteActividades = z.object({ limite: enteroEnRango(1, 50, 5) });

const UsoMentorConsulta = z.object({
  dias: enteroEnRango(1, 365, 30),
  limite: enteroEnRango(1, 50, 10),
});

const ExportacionConsulta = z.object({
  identificacion: z.enum(['enmascarada', 'completa']).default('enmascarada'),
});

export const rutasDocente = new Hono<App>();
rutasDocente.use('*', requiereDocente);

rutasDocente.get('/overview', async (c) => {
  const resumen = await resumenCohorte(c.env.DB, new Date());
  return c.json(resumen);
});

rutasDocente.get('/students', async (c) => {
  const { page, page_size, q, orden } = validar(ListadoEstudiantes, consulta(c.req.raw), 'query');
  return c.json(await listarEstudiantes(c.env.DB, { page, pageSize: page_size, q, orden }));
});

rutasDocente.get('/students/:id', async (c) => {
  const { id } = validar(IdEstudiante, c.req.param(), 'path');
  const detalle = await detalleEstudiante(c.env.DB, precios(c), id);
  if (!detalle) throw estudianteNoEncontrado();
  return c.json(detalle);
});

rutasDocente.get('/activities/stats', async (c) => {
  const { limite } = validar(LimiteActividades, consulta(c.req.raw), 'query');
  return c.json(await estadisticasActividades(c.env.DB, limite));
});

rutasDocente.get('/mentor/usage', async (c) => {
  const { dias, limite } = validar(UsoMentorConsulta, consulta(c.req.raw), 'query');
  return c.json(await usoMentor(c.env.DB, precios(c), { dias, limite, ahora: new Date() }));
});

rutasDocente.get('/export/progress.csv', (c) => {
  const { identificacion } = validar(ExportacionConsulta, consulta(c.req.raw), 'query');
  const hoy = aIso(new Date()).slice(0, 10);
  return new Response(csvProgreso(c.env.DB, identificacion !== 'completa'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="progreso_ova_${hoy}.csv"`,
      'cache-control': 'no-store',
    },
  });
});

/** Precios por millón de tokens (variables PRECIO_*; por defecto 5 y 25). */
function precios(c: Ctx): { entrada: number; salida: number } {
  const config = c.get('config');
  return { entrada: config.precioEntradaUsdPorMtok, salida: config.precioSalidaUsdPorMtok };
}

// --- Proveedor de IA del mentor (configurable desde el panel; pedido del usuario, 2026-11-07) ------

const ConfigMentorEntrada = z
  .object({
    proveedor: z.enum(PROVEEDORES),
    base_url: z.string().trim().url().max(300).nullable().optional(),
    modelo: z.string().trim().min(1).max(120),
    /** Vacía o ausente: se conserva la clave ya guardada en el panel. */
    api_key: z.string().trim().max(500).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.proveedor === 'openai_compatible') {
      if (!v.base_url) {
        ctx.addIssue({ code: 'custom', path: ['base_url'], message: 'Indica la URL base del proveedor compatible (termina en /v1).' });
      } else if (!v.base_url.startsWith('https://')) {
        ctx.addIssue({ code: 'custom', path: ['base_url'], message: 'La URL base debe empezar por https://.' });
      }
    }
  });

/** 422 `clave_requerida`: no hay clave nueva ni guardada. */
const claveRequerida = (): ApiError =>
  new ApiError(422, 'clave_requerida', 'Escribe la clave de la API: todavía no hay ninguna guardada.');

rutasDocente.get('/mentor/config', async (c) => {
  return c.json(publica(await resolverConfigMentor(c.env.DB, c.get('config'))));
});

rutasDocente.put('/mentor/config', async (c) => {
  const cuerpo = validar(ConfigMentorEntrada, await cuerpoJson(c.req.raw));
  const guardado = await guardarConfigMentor(c.env.DB, c.get('config'), {
    proveedor: cuerpo.proveedor,
    base_url: cuerpo.base_url ?? null,
    modelo: cuerpo.modelo,
    api_key: cuerpo.api_key ?? null,
  });
  if (!guardado) throw claveRequerida();
  return c.json(publica(await resolverConfigMentor(c.env.DB, c.get('config'))));
});

/** Quita la configuración del panel: el mentor vuelve a la variable del Worker (si la hay). */
rutasDocente.delete('/mentor/config', async (c) => {
  await borrarConfigMentor(c.env.DB);
  return c.json(publica(await resolverConfigMentor(c.env.DB, c.get('config'))));
});

/** Prueba real contra el proveedor con la configuración efectiva (una petición corta). */
rutasDocente.post('/mentor/config/probar', async (c) => {
  const cfg = c.get('config');
  const proveedor = await resolverConfigMentor(c.env.DB, cfg);
  if (!proveedor) throw new ApiError(503, 'ia_no_configurada', 'El mentor de IA no está configurado todavía.');
  const cliente = clienteDe(proveedor);
  const params = paramsMensaje(
    { ...cfg, anthropicModel: proveedor.modelo, mentorEffort: 'low' },
    {
      system: [{ type: 'text', text: 'Eres el mentor de un curso de metabolismo óseo. Responde en una sola frase corta en español.' }],
      messages: [{ role: 'user', content: 'Di «Conexión correcta» y nada más.' }],
      maxTokens: 200,
    },
  );
  const inicio = Date.now();
  try {
    const mensaje = await cliente.crear(params);
    const texto = mensaje.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim();
    return c.json({
      ok: true,
      proveedor: proveedor.proveedor,
      modelo: mensaje.model ?? proveedor.modelo,
      respuesta: texto.slice(0, 200),
      milisegundos: Date.now() - inicio,
    });
  } catch (error) {
    const fallo = clasificarFallo(error);
    const estado = (error as { estado?: number | null }).estado ?? null;
    const detalle = estado ? ` (el proveedor respondió ${estado})` : '';
    throw new ApiError(502, 'ia_error', `No se pudo conectar con el proveedor${detalle}: ${fallo.message}`, {
      extra: { codigo_fallo: fallo.code, estado },
    });
  }
});
