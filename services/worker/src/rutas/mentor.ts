/**
 * Mentor de IA (docs/api-contract.md, "Mentor de IA"; equivale a app/routers/mentor.py):
 * - `POST /api/chat`: respuesta en streaming SSE con recuperación del material del curso.
 * - `GET /api/chat/history`, `DELETE /api/chat/session[/:id]`, `POST /api/chat/feedback`.
 * - `GET /api/mentor/refuerzo` (reglas, sin modelo), `POST /api/mentor/quiz` y
 *   `POST /api/mentor/retroalimentacion` (salida estructurada, sin streaming).
 *
 * Orden de las comprobaciones (como el Python): validación -> sin clave (503) -> cuota diaria (429)
 * -> límite por minuto (429) -> sesión (404) -> ... Las cuotas cuentan `usage_events`.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { type App, type Ctx, requiereUsuario } from '../core/auth';
import { ApiError } from '../core/errores';
import { CHAT_DAY_UTC_OFFSET_HOURS, CHAT_HISTORY_DEFAULT_LIMIT, CHAT_HISTORY_MAX_LIMIT, MODULE_COUNT } from '../core/constantes';
import { limitar } from '../core/limites';
import { segundosHastaMedianoche } from '../core/tiempo';
import { consulta, cuerpoJson, enteroOpcional, validar } from '../core/validar';
import { bloquesSistema, citasDe, etiquetar, renderDatos, type FragmentoEtiquetado } from '../ai/prompt';
import { CABECERAS_SSE, evento, PING, PING_INTERVALO_MS } from '../ai/sse';
import { ConversacionMentor } from '../ai/mentor';
import { type BloqueTexto, ErrorCancelado, paramsMensaje, type Turno } from '../ai/anthropic';
import { CuerpoChat, CuerpoFeedback, CuerpoQuiz, CuerpoRetroalimentacion, type ContextoPedagogico } from '../ai/esquemas';
import { CODIGO_IA_ERROR, FalloModelo } from '../ai/errores';
import {
  borrarSesion,
  contarMensajesHoy,
  contarUsoHoy,
  fijarValoracion,
  historial,
  prepararTurno,
  ultimaSesionId,
} from '../ai/store';
import { KIND_QUIZ, registrarUso } from '../ai/usage';
import { etiquetarMaterial, generarQuiz, mezclarOpciones, paramsQuiz, seleccionarMaterial, type QuizGenerado } from '../ai/quiz';
import { generarRetroalimentacion, paramsRetroalimentacion, type RetroalimentacionGenerada } from '../ai/retroalimentacion';
import { consultaDesdeConversacion } from '../rag/consulta';
import { RECUPERADOR_DEL_CURSO } from '../rag/indice';
import { limiteDiario, limiteDiarioQuiz, iaError, iaNoConfigurada, materialInsuficiente, mensajeNoEncontrado, preguntaNoEncontrada, quizInvalido, retroalimentacionInvalida, sesionNoEncontrada } from '../servicios/mentor_errores';
import { obtenerPregunta } from '../servicios/preguntas_abiertas';
import { calcularSugerencias, LIMITE_POR_DEFECTO, LIMITE_MAXIMO, modulosDelEstudiante } from '../servicios/refuerzo';
import { listarResultados } from '../servicios/progreso';
import { manifiesto } from '../servicios/manifiesto';

export const rutasMentor = new Hono<App>();
// Autenticación por ruta (no `use('*')`): un `use` en un sub-app montado en /api alcanzaría a las rutas
// públicas montadas después (/api/verify).

/** Clave del límite por minuto (compartida por chat, quiz y retroalimentación). */
const CLAVE_LIMITE_POR_MINUTO = 'user:';
/** El «día» de las cuotas es el de Colombia. */
const DESFASE_DIA = CHAT_DAY_UTC_OFFSET_HOURS;

/** `GET /api/chat/history`: parámetros de consulta. */
const ConsultaHistorial = z.object({
  session_id: enteroOpcional.pipe(z.number().int().min(1).optional()),
  limit: enteroOpcional.pipe(z.number().int().min(1).max(CHAT_HISTORY_MAX_LIMIT).optional()),
});

/** `DELETE /api/chat/session?session_id=`: obligatorio. */
const ConsultaSesion = z.object({
  session_id: enteroOpcional.pipe(z.number().int().min(1)),
});

const RutaSesion = z.object({
  session_id: z.coerce.number().int(),
});

/** `GET /api/mentor/refuerzo`: parámetros de consulta. */
const ConsultaRefuerzo = z.object({
  modulo: enteroOpcional.pipe(z.number().int().min(1).max(MODULE_COUNT).optional()),
  limite: enteroOpcional.pipe(z.number().int().min(1).max(LIMITE_MAXIMO).optional()),
});

/** Mensajes del historial como van a Anthropic: sin los asistentes iniciales (la API exige abrir con el usuario). */
function turnosDeHistorial(mensajes: readonly { role: 'user' | 'assistant'; content: string }[]): Turno[] {
  const turnos = [...mensajes];
  while (turnos.length > 0 && turnos[0]?.role !== 'user') turnos.shift();
  return turnos.map((t) => ({ role: t.role, content: t.content }));
}

/** El último turno del estudiante lleva delante el bloque de DATOS (contexto y material). */
function conDatosDelCurso(
  turnos: readonly Turno[],
  contexto: ContextoPedagogico | null,
  material: readonly FragmentoEtiquetado[],
): Turno[] {
  const historial = turnos.slice(0, -1);
  const ultimo = turnos[turnos.length - 1];
  if (!ultimo || typeof ultimo.content !== 'string') throw new Error('El último turno debe ser del estudiante');
  const bloques: BloqueTexto[] = [
    { type: 'text', text: renderDatos(contexto, material) },
    { type: 'text', text: ultimo.content },
  ];
  return [...historial, { role: 'user', content: bloques }];
}

/** Límite diario de mensajes del chat (0 = sin límite). */
async function verificarCuotaDelChat(c: Ctx, userId: number): Promise<void> {
  const limite = c.get('config').mentorMaxMensajesDia;
  if (limite <= 0) return;
  const ahoraDate = new Date();
  const usados = await contarMensajesHoy(c.env.DB, userId, ahoraDate, DESFASE_DIA);
  if (usados >= limite) {
    throw limiteDiario(limite, segundosHastaMedianoche(ahoraDate, DESFASE_DIA));
  }
}

/** Cuota diaria de quizzes y retroalimentaciones (0 = sin límite). */
async function verificarCuotaDelQuiz(c: Ctx, userId: number): Promise<void> {
  const limite = c.get('config').mentorMaxQuizDia;
  if (limite <= 0) return;
  const ahoraDate = new Date();
  const usados = await contarUsoHoy(c.env.DB, userId, KIND_QUIZ, ahoraDate, DESFASE_DIA);
  if (usados >= limite) {
    throw limiteDiarioQuiz(limite, segundosHastaMedianoche(ahoraDate, DESFASE_DIA));
  }
}

/** Entrega el trabajo al runtime para que termine aunque la respuesta ya se haya enviado. */
function enSegundoPlano(c: Ctx, trabajo: Promise<unknown>): void {
  try {
    c.executionCtx.waitUntil(trabajo);
  } catch {
    // Sin ExecutionContext (pruebas): el trabajo sigue en curso como promesa.
  }
}

/** Respuesta `text/event-stream`: se devuelve de inmediato y los eventos llegan mientras el modelo escribe. */
function responderSse(c: Ctx, conversacion: ConversacionMentor): Response {
  const codificador = new TextEncoder();
  const senalCliente = c.req.raw.signal;
  const controlador = new AbortController();
  let controladorStream: ReadableStreamDefaultController<Uint8Array> | null = null;
  let cerrado = false;

  const escribir = (trama: string): void => {
    if (cerrado || controladorStream === null) return;
    try {
      controladorStream.enqueue(codificador.encode(trama));
    } catch {
      cerrado = true;
    }
  };
  const latido = setInterval(() => escribir(PING), PING_INTERVALO_MS);
  const alDesconectar = (): void => controlador.abort();
  senalCliente.addEventListener('abort', alDesconectar, { once: true });

  const cuerpo = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controladorStream = ctrl;
    },
    cancel() {
      // El cliente se fue: se corta la petición a Anthropic (y se deja de cobrar tokens).
      cerrado = true;
      controlador.abort();
    },
  });

  const trabajo = conversacion
    .ejecutar((nombre, datos) => escribir(evento(nombre, datos)), controlador.signal)
    .catch((error: unknown) => {
      if (!(error instanceof ErrorCancelado)) console.error('Error inesperado en el mentor', error);
    })
    .finally(() => {
      clearInterval(latido);
      senalCliente.removeEventListener('abort', alDesconectar);
      if (!cerrado && controladorStream !== null) {
        cerrado = true;
        try {
          controladorStream.close();
        } catch {
          // Ya cerrado por el runtime.
        }
      }
    });
  enSegundoPlano(c, trabajo);
  return new Response(cuerpo, { status: 200, headers: CABECERAS_SSE });
}

// --- Chat --------------------------------------------------------------------------------------

rutasMentor.post('/chat', requiereUsuario, async (c) => {
  const usuario = c.get('usuario');
  const cfg = c.get('config');
  const cuerpo = validar(CuerpoChat, await cuerpoJson(c.req.raw));

  if (cfg.anthropicApiKey.trim() === '') throw iaNoConfigurada();
  await verificarCuotaDelChat(c, usuario.id);
  await limitar(c.env.LIMITE_CHAT, `${CLAVE_LIMITE_POR_MINUTO}${usuario.id}`);

  const contexto = cuerpo.contexto ?? null;
  const ultimo = cuerpo.messages[cuerpo.messages.length - 1];
  if (!ultimo) throw new Error('El chat no trae mensajes');
  const turno = await prepararTurno(
    c.env.DB,
    usuario.id,
    cuerpo.session_id ?? null,
    contexto?.modulo ?? null,
    ultimo.content,
  );
  if (!turno) throw sesionNoEncontrada();

  const busqueda = consultaDesdeConversacion(
    cuerpo.messages.filter((m) => m.role === 'user').map((m) => m.content),
    {
      k: cfg.mentorRagTopK,
      modulo: contexto?.modulo ?? null,
      seccion: contexto?.seccion ?? null,
      estructura: contexto?.estructuraSeleccionada ?? null,
      molecula: contexto?.moleculaSeleccionada ?? null,
    },
  );
  const resultados = RECUPERADOR_DEL_CURSO.buscar(busqueda);
  const material = etiquetar(resultados.map((r) => r.fragmento));

  const params = paramsMensaje(cfg, {
    system: bloquesSistema(),
    messages: conDatosDelCurso(turnosDeHistorial(cuerpo.messages), contexto, material),
    maxTokens: cfg.mentorMaxTokens,
  });
  const conversacion = new ConversacionMentor({
    db: c.env.DB,
    apiKey: cfg.anthropicApiKey,
    params,
    userId: usuario.id,
    sessionId: turno.sessionId,
    citas: citasDe(material),
  });
  return responderSse(c, conversacion);
});

rutasMentor.get('/chat/history', requiereUsuario, async (c) => {
  const usuario = c.get('usuario');
  const q = validar(ConsultaHistorial, consulta(c.req.raw), 'query');
  let sesionId = q.session_id ?? null;
  if (sesionId === null) {
    sesionId = await ultimaSesionId(c.env.DB, usuario.id);
    if (sesionId === null) return c.json({ session_id: null, messages: [] });
  }
  const encontrada = await historial(c.env.DB, usuario.id, sesionId, q.limit ?? CHAT_HISTORY_DEFAULT_LIMIT);
  if (!encontrada) throw sesionNoEncontrada();
  return c.json({ session_id: encontrada.sessionId, messages: encontrada.mensajes });
});

async function borrarConversacion(c: Ctx, sesionId: number): Promise<Response> {
  const borrada = await borrarSesion(c.env.DB, c.get('usuario').id, sesionId);
  if (!borrada) throw sesionNoEncontrada();
  return new Response(null, { status: 204 });
}

rutasMentor.delete('/chat/session', requiereUsuario, async (c) => {
  const q = validar(ConsultaSesion, consulta(c.req.raw), 'query');
  return borrarConversacion(c, q.session_id);
});

rutasMentor.delete('/chat/session/:session_id', requiereUsuario, async (c) => {
  const ruta = validar(RutaSesion, c.req.param(), 'path');
  return borrarConversacion(c, ruta.session_id);
});

rutasMentor.post('/chat/feedback', requiereUsuario, async (c) => {
  const cuerpo = validar(CuerpoFeedback, await cuerpoJson(c.req.raw));
  const guardada = await fijarValoracion(c.env.DB, c.get('usuario').id, cuerpo.message_id, cuerpo.valor);
  if (!guardada) throw mensajeNoEncontrado();
  return c.json({ message_id: cuerpo.message_id, valor: cuerpo.valor === 0 ? null : cuerpo.valor });
});

// --- Refuerzo (sin modelo) ---------------------------------------------------------------------

rutasMentor.get('/mentor/refuerzo', requiereUsuario, async (c) => {
  const usuario = c.get('usuario');
  const q = validar(ConsultaRefuerzo, consulta(c.req.raw), 'query');
  const resultados = await listarResultados(c.env.DB, usuario.id);
  const { iniciados, completados } = await modulosDelEstudiante(c.env.DB, usuario.id, resultados);
  return c.json({
    sugerencias: calcularSugerencias(manifiesto, resultados, {
      iniciados,
      completados,
      modulo: q.modulo ?? null,
      limite: q.limite ?? LIMITE_POR_DEFECTO,
    }),
  });
});

// --- Quiz de práctica --------------------------------------------------------------------------

/** Traduce el fallo del modelo al error de la API; el detalle técnico ya fue al log. */
function falloDelModelo(fallo: FalloModelo, tipoInvalido: (mensaje: string) => ApiError): ApiError {
  return fallo.code === CODIGO_IA_ERROR ? iaError(fallo.mensaje) : tipoInvalido(fallo.mensaje);
}

rutasMentor.post('/mentor/quiz', requiereUsuario, async (c) => {
  const usuario = c.get('usuario');
  const cfg = c.get('config');
  const cuerpo = validar(CuerpoQuiz, await cuerpoJson(c.req.raw));

  if (cfg.anthropicApiKey.trim() === '') throw iaNoConfigurada();
  await verificarCuotaDelQuiz(c, usuario.id);
  await limitar(c.env.LIMITE_CHAT, `${CLAVE_LIMITE_POR_MINUTO}${usuario.id}`);

  const contexto = cuerpo.contexto;
  const modulo = cuerpo.modulo ?? contexto?.modulo ?? null;
  let seccion: string | null;
  if (cuerpo.seccion !== null) {
    seccion = cuerpo.seccion;
  } else if (contexto && (cuerpo.modulo === null || cuerpo.modulo === contexto.modulo)) {
    seccion = contexto.seccion !== 'inicio' ? contexto.seccion : null;
  } else {
    seccion = null;
  }
  const nivel = contexto?.nivel ?? 'pregrado';
  const material = seleccionarMaterial(RECUPERADOR_DEL_CURSO, {
    modulo,
    seccion,
    tema: cuerpo.tema,
    nivel,
    estructura: contexto?.estructuraSeleccionada ?? null,
    molecula: contexto?.moleculaSeleccionada ?? null,
  });
  if (material.fragmentos.length === 0) throw materialInsuficiente();
  const { material: etiquetados, etiquetas, citas } = etiquetarMaterial(material.fragmentos);

  let generado: QuizGenerado;
  try {
    generado = await generarQuiz(
      cfg.anthropicApiKey,
      paramsQuiz(cfg, contexto, etiquetados, cuerpo.tema),
      etiquetas,
    );
  } catch (error) {
    if (error instanceof FalloModelo) {
      if (error.modelo !== null) await registrarUso(c.env.DB, usuario.id, error.modelo, error.uso, KIND_QUIZ);
      throw falloDelModelo(error, quizInvalido);
    }
    throw error;
  }
  // Una fila por quiz (suma de sus llamadas): es lo que cuenta la cuota diaria.
  await registrarUso(c.env.DB, usuario.id, generado.modelo, generado.uso, KIND_QUIZ);

  return c.json({
    modulo,
    seccion,
    tema: material.tema,
    preguntas: mezclarOpciones(generado.preguntas),
    fuentes: citas,
    otorga_puntos: false,
  });
});

// --- Retroalimentación de preguntas abiertas ---------------------------------------------------

rutasMentor.post('/mentor/retroalimentacion', requiereUsuario, async (c) => {
  const usuario = c.get('usuario');
  const cfg = c.get('config');
  const cuerpo = validar(CuerpoRetroalimentacion, await cuerpoJson(c.req.raw));

  if (cfg.anthropicApiKey.trim() === '') throw iaNoConfigurada();
  const pregunta = obtenerPregunta(cuerpo.pregunta_id);
  if (!pregunta) throw preguntaNoEncontrada();
  await verificarCuotaDelQuiz(c, usuario.id);
  await limitar(c.env.LIMITE_CHAT, `${CLAVE_LIMITE_POR_MINUTO}${usuario.id}`);

  let generada: RetroalimentacionGenerada;
  try {
    generada = await generarRetroalimentacion(
      cfg.anthropicApiKey,
      paramsRetroalimentacion(cfg, pregunta, cuerpo.respuesta, cuerpo.contexto ?? null),
    );
  } catch (error) {
    if (error instanceof FalloModelo) {
      if (error.modelo !== null) await registrarUso(c.env.DB, usuario.id, error.modelo, error.uso, KIND_QUIZ);
      throw falloDelModelo(error, retroalimentacionInvalida);
    }
    throw error;
  }
  await registrarUso(c.env.DB, usuario.id, generada.modelo, generada.uso, KIND_QUIZ);

  return c.json({
    pregunta_id: cuerpo.pregunta_id,
    valoracion: generada.valoracion,
    retroalimentacion: generada.retroalimentacion,
  });
});

