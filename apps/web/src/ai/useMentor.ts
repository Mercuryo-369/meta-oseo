/**
 * Chat con el mentor de IA (F1-13): streaming SSE sobre POST /api/chat.
 *
 * Usa `fetch` + `ReadableStream` (no `EventSource`, que no permite POST ni cabeceras) y un
 * `AbortController` para cancelar; el backend cancela a su vez la petición a Anthropic cuando el
 * cliente se desconecta. Protocolo en docs/api-contract.md, sección "Mentor de IA".
 *
 * Decisiones de diseño:
 * - Una sola petición activa. `enviar()` mientras hay una en curso se IGNORA (devuelve `false`);
 *   la interfaz deshabilita el campo, esto es la red de seguridad contra doble envío.
 * - Cada petición tiene un número de serie. Al detener, limpiar o desmontar, el número avanza y
 *   todo lo que llegue de la petición anterior se descarta: no hay carreras entre streams.
 * - Al servidor solo viaja lo que cumple el contrato: máximo 40 mensajes, el último del
 *   estudiante, cada uno de 1 a 8000 caracteres (las respuestas largas del mentor se recortan
 *   al reenviarlas como historial). Los mensajes vacíos o fallidos no se reenvían.
 * - Nunca se muestra texto técnico crudo: los errores se traducen en `errores.ts`.
 * - Los mensajes viven en memoria; se borran al cerrar sesión. El servidor guarda además cada
 *   conversación (F3-09): el evento `sesion` trae su id y `enviar` lo reenvía como `session_id` para
 *   continuarla. `restaurar()` recupera al abrir el panel la conversación más reciente
 *   (`GET /api/chat/history`) sin pisar lo que el estudiante ya haya escrito ni duplicar mensajes.
 *   `nuevaConversacion()` la BORRA en el servidor (`DELETE /api/chat/session`) y empieza otra;
 *   `limpiar()` solo olvida lo que hay en pantalla.
 * - El evento `citas` (F3-05) trae las fuentes del curso que usó el mentor: se muestran como enlaces
 *   internos bajo su respuesta. El evento `mensaje` trae el id de la respuesta guardada, con el que
 *   `valorar()` envía el pulgar arriba o abajo (F3-11; repetir el mismo voto lo retira).
 * - Los eventos `tool_use` (acciones de cámara 3D, F3-08) y cualquier evento desconocido se ignoran.
 */
import { computed, getCurrentScope, onScopeDispose, ref, watch } from 'vue';
import { ApiError, apiFetchRaw, leerApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useContextoStore } from '@/stores/contextoPedagogico';
import type { FalloMentor } from './errores';
import {
  FALLO_CORTE,
  FALLO_MENSAJE_LARGO,
  FALLO_SIN_TEXTO,
  falloDeApi,
  falloDeBorrado,
  falloDeHistorial,
  falloDeStream,
  falloDeValoracion,
} from './errores';
import { MAX_CARACTERES, MAX_MENSAJES, acotarCaracteres, contarCaracteres } from './limites';
import type { MensajeHistorial, Valoracion } from './mentorApi';
import { borrarConversacion, obtenerHistorial, valorarRespuesta } from './mentorApi';
import type { EventoSse } from './sse';
import { leerEventosSse } from './sse';

export { MAX_CARACTERES, MAX_MENSAJES } from './limites';

export type RolMensaje = 'user' | 'assistant';
export type EstadoMensaje = 'completo' | 'transmitiendo' | 'interrumpido' | 'error';
export type FaseMentor = 'idle' | 'thinking' | 'streaming' | 'error';

/** Fuente del curso que el mentor consultó (evento SSE `citas`); `url` es una ruta interna. */
export interface CitaMentor {
  id: string;
  modulo: number;
  seccion_id: string | null;
  titulo: string;
  url: string;
}

export interface MensajeMentor {
  id: string;
  role: RolMensaje;
  content: string;
  status: EstadoMensaje;
  /** Fuentes del curso en las que se apoyó la respuesta (solo respuestas del mentor). */
  citas?: CitaMentor[];
  /** Id de la respuesta guardada en el servidor (evento `mensaje`); sirve para valorarla. */
  idServidor?: number;
  /** Voto del estudiante: 1 (útil), -1 (no útil) o `null`/ausente si no votó. */
  valoracion?: Valoracion | null;
  /** Hay un voto viajando al servidor: los pulgares se bloquean hasta que responda. */
  valorando?: boolean;
  /** Mensaje legible si el último voto no se pudo guardar. */
  errorValoracion?: string | null;
}

/** Estado de la recuperación de la conversación guardada. */
export type EstadoHistorial = 'pendiente' | 'cargando' | 'listo' | 'error';

/** Cuerpo de cada mensaje que viaja a POST /api/chat. */
export interface MensajeChat {
  role: RolMensaje;
  content: string;
}

/** Payload del evento SSE `usage` (docs/api-contract.md). */
export interface UsoTokens {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

let contadorId = 0;
/** Identificador local de mensaje. No usa `crypto.randomUUID` (solo existe en contextos seguros). */
function nuevoId(): string {
  contadorId += 1;
  return `m${Date.now().toString(36)}-${contadorId}`;
}

/**
 * Arma el historial que viaja al servidor a partir de los mensajes en pantalla:
 * descarta los vacíos (respuestas fallidas o en curso), recorta cada texto a 8000 caracteres,
 * conserva los `MAX_MENSAJES` más recientes y, si el recorte deja una respuesta del mentor al
 * principio, la quita (la conversación debe empezar con un mensaje del estudiante).
 */
export function construirHistorial(mensajes: readonly MensajeMentor[]): MensajeChat[] {
  const utiles = mensajes
    .filter((m) => m.content.trim().length > 0)
    .map<MensajeChat>((m) => ({ role: m.role, content: acotarCaracteres(m.content) }));
  const recientes = utiles.slice(-MAX_MENSAJES);
  while (recientes.length > 0 && recientes[0]!.role === 'assistant') recientes.shift();
  return recientes;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** JSON del campo `data`; `null` si no es un objeto válido (el evento se ignora). */
function leerDatos(evento: EventoSse): Record<string, unknown> | null {
  try {
    const valor: unknown = JSON.parse(evento.data);
    return esObjeto(valor) ? valor : null;
  } catch {
    return null;
  }
}

function numero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0;
}

/**
 * Ruta interna permitida en una cita: `/modulo/<n>` con `?s=<seccion>` opcional. Cualquier otra
 * cosa (otro origen, `//host`, `javascript:`) se descarta: los enlaces de "Fuentes" nunca salen
 * de la aplicación.
 */
const RUTA_CITA = /^\/modulo\/[1-6](\?s=[a-z0-9_-]{1,64})?$/;

/** Lee la carga del evento `citas`; descarta las entradas mal formadas. */
export function leerCitas(datos: Record<string, unknown> | null): CitaMentor[] {
  const lista = datos?.citas;
  if (!Array.isArray(lista)) return [];
  const citas: CitaMentor[] = [];
  for (const item of lista) {
    if (!esObjeto(item)) continue;
    const { id, modulo, seccion_id: seccion, titulo, url } = item;
    if (typeof id !== 'string' || typeof titulo !== 'string' || typeof url !== 'string') continue;
    if (typeof modulo !== 'number' || !RUTA_CITA.test(url)) continue;
    citas.push({
      id,
      modulo,
      seccion_id: typeof seccion === 'string' ? seccion : null,
      titulo,
      url,
    });
  }
  return citas;
}

export function useMentor() {
  const auth = useAuthStore();
  const contexto = useContextoStore();

  const mensajes = ref<MensajeMentor[]>([]);
  const fase = ref<FaseMentor>('idle');
  /** Mensaje legible para el estudiante; nunca texto técnico crudo. */
  const error = ref<string | null>(null);
  /** Consumo de tokens de la última respuesta (evento `usage`). */
  const uso = ref<UsoTokens | null>(null);
  /** `stop_reason` de la última respuesta terminada con `done`. */
  const motivoFin = ref<string | null>(null);

  /** Si el error actual tiene arreglo posible con "Reintentar". */
  const errorReintentable = ref(true);
  /** Conversación guardada en el servidor (evento `sesion`); `null` hasta la primera respuesta. */
  const sesionId = ref<number | null>(null);
  /** Recuperación del historial guardado (`restaurar`). */
  const estadoHistorial = ref<EstadoHistorial>('pendiente');
  const errorHistorial = ref<string | null>(null);
  const errorHistorialReintentable = ref(true);
  /** Borrado de la conversación en el servidor (`nuevaConversacion`). */
  const borrando = ref(false);
  const errorBorrado = ref<string | null>(null);
  /** Número de serie de la restauración vigente; `limpiar` y el cierre de sesión lo avanzan. */
  let serieHistorial = 0;
  /** Número de serie de la petición vigente; avanzar lo invalida todo lo anterior. */
  let serie = 0;
  let controlActivo: AbortController | null = null;

  const ocupado = computed(() => fase.value === 'thinking' || fase.value === 'streaming');

  /**
   * ¿Hay algo que reintentar? Sí si el último mensaje es una respuesta fallida o interrumpida,
   * o un mensaje del estudiante sin respuesta (p. ej. tras detener antes del primer texto).
   */
  const puedeReintentar = computed(() => {
    if (ocupado.value) return false;
    const ultimo = mensajes.value.at(-1);
    if (!ultimo) return false;
    if (fase.value === 'error' && !errorReintentable.value) return false;
    if (ultimo.role === 'user') return true;
    return ultimo.status === 'error' || ultimo.status === 'interrumpido';
  });

  function cancelarActiva(): void {
    serie += 1;
    controlActivo?.abort();
    controlActivo = null;
  }

  /** Quita las respuestas fallidas sin texto: no aportan nada y no deben acumularse. */
  function purgarFallidasVacias(): void {
    mensajes.value = mensajes.value.filter(
      (m) => !(m.role === 'assistant' && m.status === 'error' && m.content === ''),
    );
  }

  function marcarFallo(asistente: MensajeMentor, fallo: FalloMentor): void {
    asistente.status = asistente.content ? 'interrumpido' : 'error';
    fase.value = 'error';
    error.value = fallo.mensaje;
    errorReintentable.value = fallo.reintentable;
  }

  /** Aplica un evento SSE al mensaje en curso. Devuelve `true` si fue terminal (`done`/`error`). */
  function aplicarEvento(evento: EventoSse, asistente: MensajeMentor): boolean {
    const datos = leerDatos(evento);
    switch (evento.event) {
      case 'sesion': {
        const id = datos?.session_id;
        if (typeof id === 'number' && Number.isInteger(id) && id > 0) sesionId.value = id;
        return false;
      }
      case 'citas': {
        const citas = leerCitas(datos);
        if (citas.length > 0) asistente.citas = citas;
        return false;
      }
      case 'mensaje': {
        const id = datos?.message_id;
        if (typeof id === 'number' && Number.isInteger(id) && id > 0) asistente.idServidor = id;
        return false;
      }
      case 'text': {
        const delta = datos?.delta;
        if (typeof delta === 'string' && delta !== '') {
          asistente.content += delta;
          if (fase.value === 'thinking') fase.value = 'streaming';
        }
        return false;
      }
      case 'usage': {
        if (datos) {
          uso.value = {
            input_tokens: numero(datos.input_tokens),
            output_tokens: numero(datos.output_tokens),
            cache_read_input_tokens: numero(datos.cache_read_input_tokens),
            cache_creation_input_tokens: numero(datos.cache_creation_input_tokens),
          };
        }
        return false;
      }
      case 'done': {
        if (!asistente.content.trim()) {
          marcarFallo(asistente, FALLO_SIN_TEXTO);
          return true;
        }
        asistente.status = 'completo';
        fase.value = 'idle';
        error.value = null;
        motivoFin.value = typeof datos?.stop_reason === 'string' ? datos.stop_reason : null;
        return true;
      }
      case 'error': {
        marcarFallo(asistente, falloDeStream(datos?.code));
        return true;
      }
      default:
        // `tool_use` (F3-08) y cualquier evento futuro: se ignoran sin romper el flujo.
        return false;
    }
  }

  /**
   * Envía la conversación actual (cuyo último mensaje es del estudiante) y transmite la
   * respuesta al mensaje del mentor que se añade al final.
   */
  async function transmitir(): Promise<void> {
    const historial = construirHistorial(mensajes.value);
    mensajes.value.push({ id: nuevoId(), role: 'assistant', content: '', status: 'transmitiendo' });
    // Se toma el proxy reactivo del array para que cada cambio se refleje en pantalla.
    const asistente = mensajes.value[mensajes.value.length - 1]!;

    cancelarActiva();
    const miSerie = serie;
    const control = new AbortController();
    controlActivo = control;
    fase.value = 'thinking';
    error.value = null;
    errorReintentable.value = true;
    uso.value = null;
    motivoFin.value = null;

    try {
      const res = await apiFetchRaw('/chat', {
        method: 'POST',
        body: {
          messages: historial,
          contexto: contexto.toPayload(),
          ...(sesionId.value !== null ? { session_id: sesionId.value } : {}),
        },
        headers: { Accept: 'text/event-stream' },
        signal: control.signal,
      });
      if (miSerie !== serie) return;
      if (!res.ok) throw await leerApiError(res);
      if (!res.body) throw new ApiError(res.status, 'respuesta_invalida', '');

      let terminal = false;
      for await (const evento of leerEventosSse(res.body)) {
        if (miSerie !== serie) return; // detenida o reemplazada: `return` cancela el lector
        if (aplicarEvento(evento, asistente)) {
          terminal = true;
          break; // exactamente un evento terminal; lo que venga después no cuenta
        }
      }
      if (miSerie !== serie) return;
      if (!terminal) marcarFallo(asistente, FALLO_CORTE);
    } catch (e) {
      if (miSerie !== serie || control.signal.aborted) return; // cancelación voluntaria
      if (e instanceof ApiError) {
        // La conversación ya no existe en el servidor (p. ej. se borró): la siguiente abre otra.
        if (e.code === 'sesion_no_encontrada') sesionId.value = null;
        // Un 401 ya cerró la sesión dentro de `apiFetchRaw`.
        marcarFallo(asistente, falloDeApi(e));
      } else {
        // Error de lectura a mitad del stream (red caída, conexión reiniciada...).
        marcarFallo(asistente, FALLO_CORTE);
      }
    } finally {
      if (miSerie === serie) controlActivo = null;
    }
  }

  /**
   * Envía un mensaje del estudiante. Devuelve `true` si se envió; `false` si se ignoró (hay una
   * respuesta en curso, texto vacío o demasiado largo). La promesa se resuelve al terminar el stream.
   */
  async function enviar(texto: string): Promise<boolean> {
    if (ocupado.value) return false;
    const limpio = texto.trim();
    if (!limpio) return false;
    if (contarCaracteres(limpio) > MAX_CARACTERES) {
      fase.value = 'error';
      error.value = FALLO_MENSAJE_LARGO.mensaje;
      errorReintentable.value = false;
      return false;
    }
    purgarFallidasVacias();
    mensajes.value.push({ id: nuevoId(), role: 'user', content: limpio, status: 'completo' });
    await transmitir();
    return true;
  }

  /**
   * Detiene la respuesta en curso. Conserva el texto parcial marcado como interrumpido; si aún
   * no había texto, quita el mensaje vacío. No es un error: no se muestra aviso.
   */
  function detener(): void {
    if (!ocupado.value) return;
    cancelarActiva();
    const ultimo = mensajes.value.at(-1);
    if (ultimo?.role === 'assistant' && ultimo.status === 'transmitiendo') {
      if (ultimo.content) ultimo.status = 'interrumpido';
      else mensajes.value.pop();
    }
    fase.value = 'idle';
    error.value = null;
  }

  /**
   * Vuelve a pedir la respuesta al último mensaje del estudiante, descartando la respuesta
   * fallida o interrumpida. Devuelve `false` si no había nada que reintentar.
   */
  async function reintentar(): Promise<boolean> {
    if (ocupado.value) return false;
    const ultimo = mensajes.value.at(-1);
    if (
      ultimo?.role === 'assistant' &&
      (ultimo.status === 'error' || ultimo.status === 'interrumpido')
    ) {
      mensajes.value.pop();
    }
    if (mensajes.value.at(-1)?.role !== 'user') return false;
    await transmitir();
    return true;
  }

  /** Empieza una conversación nueva: cancela lo que esté en curso y borra los mensajes. */
  function limpiar(): void {
    cancelarActiva();
    serieHistorial += 1;
    // Una restauración en vuelo queda descartada: se puede volver a pedir.
    if (estadoHistorial.value === 'cargando') estadoHistorial.value = 'pendiente';
    mensajes.value = [];
    sesionId.value = null;
    fase.value = 'idle';
    error.value = null;
    errorReintentable.value = true;
    uso.value = null;
    motivoFin.value = null;
  }

  /** Error de red genérico cuando la excepción no es de la API. */
  const comoApiError = (e: unknown): ApiError =>
    e instanceof ApiError ? e : new ApiError(0, 'red', '');

  /** Mensaje del historial del servidor -> mensaje en pantalla (con sus fuentes ya validadas). */
  function desdeHistorial(fila: MensajeHistorial): MensajeMentor {
    const mensaje: MensajeMentor = {
      id: nuevoId(),
      role: fila.role,
      content: fila.content,
      status: 'completo',
    };
    if (fila.role === 'assistant') {
      mensaje.idServidor = fila.id;
      mensaje.valoracion = fila.valoracion ?? null;
      const citas = leerCitas({ citas: fila.citas });
      if (citas.length > 0) mensaje.citas = citas;
    }
    return mensaje;
  }

  /**
   * Recupera la conversación más reciente del estudiante (al abrir el panel). Solo actúa una vez
   * por sesión y solo si la pantalla está vacía: si el estudiante ya escribió algo mientras
   * llegaba, se descarta lo recibido en lugar de mezclarlo (así nunca se duplican mensajes).
   * Un historial vacío no es un error; un fallo deja `errorHistorial` y se puede reintentar.
   */
  async function restaurar(): Promise<void> {
    if (estadoHistorial.value === 'cargando' || estadoHistorial.value === 'listo') return;
    if (ocupado.value || mensajes.value.length > 0 || sesionId.value !== null) {
      estadoHistorial.value = 'listo';
      return;
    }
    serieHistorial += 1;
    const miSerie = serieHistorial;
    estadoHistorial.value = 'cargando';
    errorHistorial.value = null;
    try {
      const res = await obtenerHistorial();
      if (miSerie !== serieHistorial) return;
      estadoHistorial.value = 'listo';
      if (mensajes.value.length > 0 || sesionId.value !== null || ocupado.value) return;
      if (res.session_id === null || res.messages.length === 0) return;
      mensajes.value = res.messages.map(desdeHistorial);
      sesionId.value = res.session_id;
    } catch (e) {
      if (miSerie !== serieHistorial) return;
      estadoHistorial.value = 'error';
      const fallo = falloDeHistorial(comoApiError(e));
      errorHistorial.value = fallo.mensaje;
      errorHistorialReintentable.value = fallo.reintentable;
    }
  }

  /**
   * Vota una respuesta del mentor. El voto se ve al instante y se deshace si el servidor no lo
   * acepta. Votar lo mismo otra vez retira el voto (el contrato usa 0 para eso).
   */
  async function valorar(idMensaje: string, valor: Valoracion): Promise<void> {
    const mensaje = mensajes.value.find((m) => m.id === idMensaje);
    if (!mensaje || mensaje.idServidor === undefined || mensaje.valorando) return;
    const previa = mensaje.valoracion ?? null;
    const enviado: Valoracion | 0 = previa === valor ? 0 : valor;
    mensaje.valorando = true;
    mensaje.errorValoracion = null;
    mensaje.valoracion = enviado === 0 ? null : enviado;
    try {
      const res = await valorarRespuesta(mensaje.idServidor, enviado);
      mensaje.valoracion = res.valor ?? null;
    } catch (e) {
      mensaje.valoracion = previa;
      mensaje.errorValoracion = falloDeValoracion(comoApiError(e)).mensaje;
    } finally {
      mensaje.valorando = false;
    }
  }

  /**
   * "Nueva conversación": borra la conversación guardada en el servidor y deja la pantalla vacía.
   * Sin conversación guardada solo limpia. Si el servidor no confirma el borrado, la conversación
   * se conserva (si no, volvería a aparecer al recargar) y `errorBorrado` explica qué pasó.
   * Devuelve `true` si quedó una conversación nueva.
   */
  async function nuevaConversacion(): Promise<boolean> {
    if (borrando.value) return false;
    errorBorrado.value = null;
    const id = sesionId.value;
    if (id === null) {
      limpiar();
      return true;
    }
    detener();
    borrando.value = true;
    try {
      await borrarConversacion(id);
    } catch (e) {
      // 404: ya no existía en el servidor, que era lo que se quería.
      if (!(e instanceof ApiError && e.status === 404)) {
        errorBorrado.value = falloDeBorrado(comoApiError(e)).mensaje;
        return false;
      }
    } finally {
      borrando.value = false;
    }
    limpiar();
    return true;
  }

  // Al cerrar sesión (botón "Salir" o 401) la conversación del estudiante no debe sobrevivir.
  watch(
    () => auth.token,
    (token) => {
      if (token) return;
      limpiar();
      // La próxima persona que entre debe recuperar SU conversación.
      estadoHistorial.value = 'pendiente';
      errorHistorial.value = null;
      errorBorrado.value = null;
    },
  );

  if (getCurrentScope()) onScopeDispose(cancelarActiva);

  return {
    mensajes,
    sesionId,
    fase,
    error,
    uso,
    motivoFin,
    ocupado,
    puedeReintentar,
    estadoHistorial,
    errorHistorial,
    errorHistorialReintentable,
    borrando,
    errorBorrado,
    enviar,
    detener,
    reintentar,
    limpiar,
    restaurar,
    valorar,
    nuevaConversacion,
  };
}
