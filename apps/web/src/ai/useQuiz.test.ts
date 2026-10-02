/**
 * Quiz de práctica del mentor (F4-03): el recorrido, la petición y los errores. Todo contra
 * `fetch` simulado. Es práctica libre: ninguna llamada va a la API de actividades ni de progreso.
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useContextoStore } from '@/stores/contextoPedagogico';
import { respuestaError, respuestaJson, usuarioDePrueba } from '@/test/utils';
import type { PreguntaQuiz, RespuestaQuiz } from './mentorApi';
import { useQuiz } from './useQuiz';

const fetchMock = vi.fn<typeof fetch>();

export function preguntaDePrueba(n: number, correcta = 1): PreguntaQuiz {
  return {
    id: n,
    enunciado: `¿Pregunta número ${n} sobre el hueso?`,
    opciones: [0, 1, 2, 3].map((i) => ({ texto: `Opción ${n}-${i}` })),
    correcta,
    explicacion: `La ${n}-${correcta} es la correcta porque lo dice el material.`,
    dificultad: 'basica',
    fuentes: ['1'],
  };
}

export function quizDePrueba(sobrescribir: Partial<RespuestaQuiz> = {}): RespuestaQuiz {
  return {
    modulo: 3,
    seccion: 'm3_2_rankl',
    tema: 'La balanza RANKL/OPG',
    preguntas: [preguntaDePrueba(1, 1), preguntaDePrueba(2, 0), preguntaDePrueba(3, 3)],
    fuentes: [
      {
        id: 'm3:m3_2_rankl:t1',
        modulo: 3,
        seccion_id: 'm3_2_rankl',
        titulo: 'Módulo 3 · La balanza RANKL/OPG',
        url: '/modulo/3?s=m3_2_rankl',
      },
    ],
    otorga_puntos: false,
    ...sobrescribir,
  };
}

function preparar() {
  setActivePinia(createPinia());
  const auth = useAuthStore();
  auth.token = 'tok-123';
  auth.establecerUsuario(usuarioDePrueba());
  const contexto = useContextoStore();
  contexto.setModulo(3);
  contexto.setSeccion('m3_2_rankl');
  const scope = effectScope();
  return { auth, contexto, quiz: scope.run(() => useQuiz())! };
}

const cuerpo = (n = 0): Record<string, unknown> =>
  JSON.parse(String(fetchMock.mock.calls[n]![1]!.body));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('pedir el quiz', () => {
  it('envía el contexto pedagógico (con el nivel) y pasa a listo', async () => {
    fetchMock.mockResolvedValue(respuestaJson(200, quizDePrueba()));
    const { quiz, contexto } = preparar();
    contexto.setNivel('posgrado');
    contexto.setEstructura('histo_osteoclasto');
    const promesa = quiz.iniciar();
    expect(quiz.estado.value).toBe('cargando');
    expect(quiz.ocupado.value).toBe(true);
    await promesa;

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/mentor\/quiz$/);
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok-123');
    const enviado = cuerpo() as { contexto: Record<string, unknown> };
    expect(enviado.contexto).toMatchObject({
      modulo: 3,
      seccion: 'm3_2_rankl',
      nivel: 'posgrado',
      estructuraSeleccionada: 'histo_osteoclasto',
    });
    expect(quiz.estado.value).toBe('listo');
    expect(quiz.preguntas.value).toHaveLength(3);
    expect(quiz.actual.value!.id).toBe(1);
    expect(quiz.error.value).toBeNull();
  });

  it('con un enfoque (sugerencia de refuerzo) envía tema, módulo y sección', async () => {
    fetchMock.mockResolvedValue(respuestaJson(200, quizDePrueba()));
    const { quiz } = preparar();
    await quiz.iniciar({ tema: 'Señalización RANK-RANKL-OPG', modulo: 5, seccion: 'm5_2_eje' });
    expect(cuerpo()).toMatchObject({
      tema: 'Señalización RANK-RANKL-OPG',
      modulo: 5,
      seccion: 'm5_2_eje',
    });
  });

  it('solo una petición a la vez', async () => {
    let resolver!: (r: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (resolver = r)));
    const { quiz } = preparar();
    const primera = quiz.iniciar();
    expect(await quiz.iniciar()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolver(respuestaJson(200, quizDePrueba()));
    await primera;
    expect(quiz.estado.value).toBe('listo');
  });

  it('nunca llama a las APIs de puntaje: es práctica libre', async () => {
    fetchMock.mockResolvedValue(respuestaJson(200, quizDePrueba()));
    const { quiz } = preparar();
    await quiz.iniciar();
    quiz.responder(1);
    quiz.siguiente();
    quiz.responder(0);
    quiz.siguiente();
    quiz.responder(3);
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls).toHaveLength(1);
    expect(urls.some((u) => /activities|progress|logros|achievements/.test(u))).toBe(false);
  });
});

describe('recorrido', () => {
  async function listo() {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaJson(200, quizDePrueba())));
    const ctx = preparar();
    await ctx.quiz.iniciar();
    return ctx.quiz;
  }

  it('responder marca la elección, bloquea la pregunta y cuenta el acierto', async () => {
    const quiz = await listo();
    expect(quiz.respondida.value).toBe(false);
    expect(quiz.responder(1)).toBe(true);
    expect(quiz.respondida.value).toBe(true);
    expect(quiz.elegidaActual.value).toBe(1);
    expect(quiz.responder(0)).toBe(false); // ya respondida: no se cambia
    expect(quiz.elegidaActual.value).toBe(1);
    expect(quiz.aciertos.value).toBe(1);
  });

  it('no se avanza sin responder y la última no avanza', async () => {
    const quiz = await listo();
    quiz.siguiente();
    expect(quiz.indice.value).toBe(0);
    quiz.responder(0);
    quiz.siguiente();
    expect(quiz.indice.value).toBe(1);
    quiz.responder(0);
    quiz.siguiente();
    expect(quiz.esUltima.value).toBe(true);
    quiz.responder(2);
    quiz.siguiente();
    expect(quiz.indice.value).toBe(2);
    expect(quiz.terminado.value).toBe(true);
  });

  it('cuenta los aciertos de las tres', async () => {
    const quiz = await listo();
    quiz.responder(1); // correcta
    quiz.siguiente();
    quiz.responder(2); // incorrecta (era 0)
    quiz.siguiente();
    quiz.responder(3); // correcta
    expect(quiz.aciertos.value).toBe(2);
    expect(quiz.terminado.value).toBe(true);
  });

  it.each([-1, 4, 1.5, Number.NaN])('rechaza la opción inválida %s', async (opcion) => {
    const quiz = await listo();
    expect(quiz.responder(opcion)).toBe(false);
    expect(quiz.respondida.value).toBe(false);
  });

  it('fuentesDe resuelve las etiquetas contra la lista de fuentes', async () => {
    const quiz = await listo();
    const p = quiz.actual.value!;
    expect(quiz.fuentesDe(p).map((f) => f.url)).toEqual(['/modulo/3?s=m3_2_rankl']);
    expect(quiz.fuentesDe({ ...p, fuentes: ['9', 'x', '1', '1'] })).toHaveLength(1);
  });

  it('cerrar olvida todo', async () => {
    const quiz = await listo();
    quiz.responder(1);
    quiz.cerrar();
    expect(quiz.estado.value).toBe('inactivo');
    expect(quiz.quiz.value).toBeNull();
    expect(quiz.preguntas.value).toEqual([]);
    expect(quiz.indice.value).toBe(0);
  });

  it('un quiz nuevo empieza desde la primera pregunta', async () => {
    const quiz = await listo();
    quiz.responder(1);
    quiz.siguiente();
    await quiz.reintentar();
    expect(quiz.indice.value).toBe(0);
    expect(quiz.elegidas.value).toEqual([null, null, null]);
  });
});

describe('errores', () => {
  it.each([
    [429, 'limite_diario_quiz', 'Hoy ya hiciste todos tus quizzes', false],
    [429, 'demasiados_intentos', 'Espera un momento', true],
    [503, 'ia_no_configurada', 'no está disponible por ahora', false],
    [422, 'material_insuficiente', 'No encontré material del curso', false],
    [502, 'quiz_invalido', 'No se pudo preparar el quiz', true],
    [502, 'ia_error', 'No se pudo preparar el quiz', true],
    [500, 'error_servidor', 'No se pudo preparar el quiz', true],
  ])('%s %s se traduce y no filtra texto técnico', async (estado, codigo, texto, reintentable) => {
    fetchMock.mockResolvedValue(
      respuestaError(estado, codigo, 'Traceback (most recent call last)'),
    );
    const { quiz } = preparar();
    await quiz.iniciar();
    expect(quiz.estado.value).toBe('error');
    expect(quiz.error.value).toContain(texto);
    expect(quiz.error.value).not.toContain('Traceback');
    expect(quiz.errorReintentable.value).toBe(reintentable);
  });

  it('sin conexión lo dice y se puede reintentar', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { quiz } = preparar();
    await quiz.iniciar({ tema: 'hueso' });
    expect(quiz.estado.value).toBe('error');
    expect(quiz.error.value).toContain('No hay conexión');
    expect(quiz.errorReintentable.value).toBe(true);

    fetchMock.mockResolvedValueOnce(respuestaJson(200, quizDePrueba()));
    await quiz.reintentar();
    expect(quiz.estado.value).toBe('listo');
    expect(cuerpo(1)).toMatchObject({ tema: 'hueso' }); // mismo enfoque
  });

  it('una respuesta malformada no muestra un quiz roto', async () => {
    const malos = [
      { ...quizDePrueba(), preguntas: [] },
      { ...quizDePrueba(), preguntas: [{ ...preguntaDePrueba(1), correcta: 9 }] },
      { ...quizDePrueba(), preguntas: [{ ...preguntaDePrueba(1), opciones: [] }] },
      { ...quizDePrueba(), fuentes: null },
      { otra: 'cosa' },
    ];
    for (const malo of malos) {
      fetchMock.mockResolvedValueOnce(respuestaJson(200, malo));
      const { quiz } = preparar();
      await quiz.iniciar();
      expect(quiz.estado.value).toBe('error');
      expect(quiz.error.value).toContain('No se pudo preparar el quiz');
    }
  });

  it('cancelar descarta la respuesta que llegue después', async () => {
    let resolver!: (r: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (resolver = r)));
    const { quiz } = preparar();
    const promesa = quiz.iniciar();
    quiz.cerrar();
    resolver(respuestaJson(200, quizDePrueba()));
    await promesa;
    expect(quiz.estado.value).toBe('inactivo');
    expect(quiz.quiz.value).toBeNull();
  });

  it('al cerrar sesión se cierra el quiz', async () => {
    fetchMock.mockResolvedValue(respuestaJson(200, quizDePrueba()));
    const { quiz, auth } = preparar();
    await quiz.iniciar();
    auth.logout();
    await nextTick();
    expect(quiz.estado.value).toBe('inactivo');
    expect(quiz.quiz.value).toBeNull();
  });
});
