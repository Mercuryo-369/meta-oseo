/**
 * Quiz de práctica del mentor (F4-03): "Ponme a prueba".
 *
 * Pide 3 preguntas de opción múltiple sobre la sección o el concepto actual
 * (`POST /api/mentor/quiz`) y lleva el recorrido: una pregunta a la vez, retroalimentación
 * inmediata al elegir, resumen al final. Es PRÁCTICA LIBRE: no envía ningún resultado a la API,
 * no toca el puntaje ni los logros y no se guarda; al cerrar el quiz se olvida.
 *
 * - Una sola petición a la vez: `iniciar()` con una en curso se ignora.
 * - Cada petición lleva un número de serie; `cancelar()`, `cerrar()` o la salida de sesión lo
 *   avanzan y descartan lo que llegue después.
 * - La respuesta se revisa antes de mostrarla (3 preguntas, 4 opciones, una correcta válida): si el
 *   servidor devolviera otra cosa, se muestra el error genérico y no un quiz roto.
 * - Nunca se muestra texto crudo del servidor: los errores pasan por `falloDeQuiz`.
 */
import type { UnwrapNestedRefs } from 'vue';
import { computed, getCurrentScope, onScopeDispose, ref, watch } from 'vue';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useContextoStore } from '@/stores/contextoPedagogico';
import { falloDeQuiz } from './errores';
import type { CuerpoQuiz, FuenteCurso, PreguntaQuiz, RespuestaQuiz } from './mentorApi';
import { pedirQuiz } from './mentorApi';

export type EstadoQuiz = 'inactivo' | 'cargando' | 'error' | 'listo';

/** De qué tratar el quiz cuando no es el de la sección actual (p. ej. una sugerencia de refuerzo). */
export interface EnfoqueQuiz {
  tema?: string;
  modulo?: number;
  seccion?: string;
}

const MENSAJE_RESPUESTA_INVALIDA =
  'No se pudo preparar el quiz esta vez. Inténtalo de nuevo en un momento.';

function esPreguntaValida(p: PreguntaQuiz): boolean {
  return (
    typeof p.enunciado === 'string' &&
    p.enunciado !== '' &&
    typeof p.explicacion === 'string' &&
    Array.isArray(p.opciones) &&
    p.opciones.length >= 2 &&
    p.opciones.every((o) => typeof o?.texto === 'string' && o.texto !== '') &&
    Number.isInteger(p.correcta) &&
    p.correcta >= 0 &&
    p.correcta < p.opciones.length
  );
}

function esQuizValido(quiz: RespuestaQuiz): boolean {
  return (
    Array.isArray(quiz.preguntas) &&
    quiz.preguntas.length > 0 &&
    quiz.preguntas.every(esPreguntaValida) &&
    Array.isArray(quiz.fuentes)
  );
}

export function useQuiz() {
  const auth = useAuthStore();
  const contexto = useContextoStore();

  const estado = ref<EstadoQuiz>('inactivo');
  const quiz = ref<RespuestaQuiz | null>(null);
  const error = ref<string | null>(null);
  const errorReintentable = ref(true);
  /** Posición de la pregunta que se está viendo. */
  const indice = ref(0);
  /** Opción elegida en cada pregunta (`null` mientras no la responde). */
  const elegidas = ref<(number | null)[]>([]);
  /** Enfoque del último intento, para "Reintentar" y "Otro quiz". */
  let ultimoEnfoque: EnfoqueQuiz = {};
  let serie = 0;
  let control: AbortController | null = null;

  const preguntas = computed(() => quiz.value?.preguntas ?? []);
  const actual = computed<PreguntaQuiz | null>(() => preguntas.value[indice.value] ?? null);
  const elegidaActual = computed(() => elegidas.value[indice.value] ?? null);
  const respondida = computed(() => elegidaActual.value !== null);
  const esUltima = computed(() => indice.value >= preguntas.value.length - 1);
  const aciertos = computed(
    () => preguntas.value.filter((p, i) => elegidas.value[i] === p.correcta).length,
  );
  /** Se contestaron todas las preguntas: toca el resumen. */
  const terminado = computed(
    () => preguntas.value.length > 0 && elegidas.value.every((e) => e !== null),
  );
  const ocupado = computed(() => estado.value === 'cargando');

  function cancelar(): void {
    serie += 1;
    control?.abort();
    control = null;
  }

  /** Pide un quiz nuevo. Devuelve `false` si se ignoró (ya hay una petición en curso). */
  async function iniciar(enfoque: EnfoqueQuiz = {}): Promise<boolean> {
    if (ocupado.value) return false;
    ultimoEnfoque = enfoque;
    cancelar();
    const miSerie = serie;
    control = new AbortController();
    const miControl = control;
    estado.value = 'cargando';
    error.value = null;
    quiz.value = null;
    indice.value = 0;
    elegidas.value = [];

    const cuerpo: CuerpoQuiz = { contexto: contexto.toPayload() };
    if (enfoque.tema) cuerpo.tema = enfoque.tema;
    if (enfoque.modulo !== undefined) cuerpo.modulo = enfoque.modulo;
    if (enfoque.seccion) cuerpo.seccion = enfoque.seccion;

    try {
      const respuesta = await pedirQuiz(cuerpo, miControl.signal);
      if (miSerie !== serie) return true;
      if (!esQuizValido(respuesta)) {
        estado.value = 'error';
        error.value = MENSAJE_RESPUESTA_INVALIDA;
        errorReintentable.value = true;
        return true;
      }
      quiz.value = respuesta;
      elegidas.value = respuesta.preguntas.map(() => null);
      estado.value = 'listo';
    } catch (e) {
      if (miSerie !== serie || miControl.signal.aborted) return true; // cancelado a propósito
      const fallo = falloDeQuiz(e instanceof ApiError ? e : new ApiError(0, 'red', ''));
      estado.value = 'error';
      error.value = fallo.mensaje;
      errorReintentable.value = fallo.reintentable;
    } finally {
      if (miSerie === serie) control = null;
    }
    return true;
  }

  /** Vuelve a pedir el quiz con el mismo enfoque (tras un error o para practicar otra vez). */
  function reintentar(): Promise<boolean> {
    return iniciar(ultimoEnfoque);
  }

  /** Elige una opción de la pregunta actual. Solo cuenta la primera: después queda bloqueada. */
  function responder(opcion: number): boolean {
    const pregunta = actual.value;
    if (estado.value !== 'listo' || !pregunta || respondida.value) return false;
    if (!Number.isInteger(opcion) || opcion < 0 || opcion >= pregunta.opciones.length) return false;
    elegidas.value = elegidas.value.map((e, i) => (i === indice.value ? opcion : e));
    return true;
  }

  function siguiente(): void {
    if (respondida.value && !esUltima.value) indice.value += 1;
  }

  /** Las fuentes de una pregunta, en el orden de sus etiquetas. */
  function fuentesDe(pregunta: PreguntaQuiz): FuenteCurso[] {
    const todas = quiz.value?.fuentes ?? [];
    const resultado: FuenteCurso[] = [];
    for (const etiqueta of pregunta.fuentes) {
      const fuente = todas[Number(etiqueta) - 1];
      if (fuente && !resultado.includes(fuente)) resultado.push(fuente);
    }
    return resultado;
  }

  /** Cierra el quiz y olvida todo. */
  function cerrar(): void {
    cancelar();
    estado.value = 'inactivo';
    quiz.value = null;
    error.value = null;
    indice.value = 0;
    elegidas.value = [];
  }

  watch(
    () => auth.token,
    (token) => {
      if (!token) cerrar();
    },
  );
  if (getCurrentScope()) onScopeDispose(cancelar);

  return {
    estado,
    quiz,
    error,
    errorReintentable,
    indice,
    elegidas,
    preguntas,
    actual,
    elegidaActual,
    respondida,
    esUltima,
    aciertos,
    terminado,
    ocupado,
    iniciar,
    reintentar,
    responder,
    siguiente,
    fuentesDe,
    cancelar,
    cerrar,
  };
}

/** El controlador ya envuelto en `reactive()` (los componentes lo reciben así, sin `.value`). */
export type ControladorQuiz = UnwrapNestedRefs<ReturnType<typeof useQuiz>>;
