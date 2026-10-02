/**
 * "Ponme a prueba" (F4-03): el componente del quiz de práctica con la API simulada.
 * Se comprueba el recorrido, la retroalimentación inmediata, los estados de carga y error, que NO
 * se otorguen puntos (ni se llame a la API de actividades) y la accesibilidad básica y el teclado.
 */
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, reactive } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useQuiz } from '@/ai/useQuiz';
import { useAuthStore } from '@/stores/auth';
import { respuestaError, respuestaJson, usuarioDePrueba } from '@/test/utils';
import MentorQuiz from './MentorQuiz.vue';

const fetchMock = vi.fn<typeof fetch>();
let wrapper: VueWrapper | undefined;

function pregunta(n: number, correcta: number, fuentes = ['1']) {
  return {
    id: n,
    enunciado: `¿Cuál es la idea correcta número ${n}?`,
    opciones: [0, 1, 2, 3].map((i) => ({ texto: `Opción ${n}-${i}` })),
    correcta,
    explicacion: `Porque la opción ${n}-${correcta} lo dice el material.`,
    dificultad: n === 1 ? 'basica' : 'intermedia',
    fuentes,
  };
}

function quizRespuesta() {
  return {
    modulo: 3,
    seccion: 'm3_2_rankl',
    tema: 'La balanza RANKL/OPG',
    preguntas: [pregunta(1, 1), pregunta(2, 0, ['1', '2']), pregunta(3, 3)],
    fuentes: [
      {
        id: 'a',
        modulo: 3,
        seccion_id: 'm3_2_rankl',
        titulo: 'Módulo 3 · La balanza RANKL/OPG',
        url: '/modulo/3?s=m3_2_rankl',
      },
      {
        id: 'b',
        modulo: 1,
        seccion_id: null,
        titulo: 'Módulo 1 · Glosario: RANKL',
        url: '/modulo/1',
      },
    ],
    otorga_puntos: false,
  };
}

/** Monta el componente con el controlador real de `useQuiz` (envuelto en `reactive`). */
async function montar(
  respuesta: () => Response | Promise<Response> = () => respuestaJson(200, quizRespuesta()),
) {
  fetchMock.mockImplementation(() => Promise.resolve(respuesta()));
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'tok-123';
  auth.establecerUsuario(usuarioDePrueba());
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/modulo/:n([1-6])', component: { template: '<div />' } },
    ],
  });
  await router.push('/');
  await router.isReady();

  let controlador!: ReturnType<typeof reactive<ReturnType<typeof useQuiz>>>;
  const Anfitrion = defineComponent({
    emits: ['volver', 'navegar'],
    setup(_, { emit }) {
      controlador = reactive(useQuiz());
      return () =>
        h(MentorQuiz, {
          quiz: controlador,
          onVolver: () => emit('volver'),
          onNavegar: () => emit('navegar'),
        });
    },
  });
  wrapper = mount(Anfitrion, { global: { plugins: [pinia, router] }, attachTo: document.body });
  return { controlador, router };
}

const $ = (id: string) => wrapper!.find(`[data-testid="${id}"]`);
const opciones = () => wrapper!.findAll('[data-testid="quiz-opcion"]');

async function empezar(respuesta?: () => Response | Promise<Response>) {
  const ctx = await montar(respuesta);
  await ctx.controlador.iniciar();
  await flushPromises();
  return ctx;
}

async function elegir(i: number) {
  await opciones()[i]!.trigger('click');
  await flushPromises();
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = '';
});

describe('MentorQuiz: carga y error', () => {
  it('mientras carga muestra un estado accesible y la nota de práctica libre', async () => {
    let resolver!: (r: Response) => void;
    const { controlador } = await montar(
      () => new Promise<Response>((r) => (resolver = r)) as never,
    );
    void controlador.iniciar();
    await flushPromises();
    const cargando = $('quiz-cargando');
    expect(cargando.exists()).toBe(true);
    expect(cargando.attributes('role')).toBe('status');
    expect(cargando.text()).toContain('Preparando tus preguntas');
    expect($('quiz-nota-practica').text()).toContain('no suma puntos ni logros');
    resolver(respuestaJson(200, quizRespuesta()));
    await flushPromises();
    expect($('quiz-cargando').exists()).toBe(false);
    expect($('quiz-pregunta').exists()).toBe(true);
  });

  it('un error se avisa con role=alert, ofrece Reintentar y no filtra texto técnico', async () => {
    let respuestas = 0;
    await empezar(() => {
      respuestas += 1;
      return respuestas === 1
        ? respuestaError(502, 'quiz_invalido', 'Traceback interno')
        : respuestaJson(200, quizRespuesta());
    });
    const error = $('quiz-error');
    expect(error.attributes('role')).toBe('alert');
    expect(error.text()).toContain('No se pudo preparar el quiz');
    expect(error.text()).not.toContain('Traceback');
    expect($('quiz-nota-practica').exists()).toBe(true);

    await $('quiz-reintentar').trigger('click');
    await flushPromises();
    expect($('quiz-error').exists()).toBe(false);
    expect($('quiz-pregunta').exists()).toBe(true);
  });

  it('si reintentar no sirve (cuota agotada) no lo ofrece', async () => {
    await empezar(() => respuestaError(429, 'limite_diario_quiz'));
    expect($('quiz-error').text()).toContain('Hoy ya hiciste todos tus quizzes');
    expect($('quiz-reintentar').exists()).toBe(false);
  });

  it('"Volver al chat" avisa al panel', async () => {
    const { controlador } = await empezar();
    expect(controlador.estado).toBe('listo');
    await $('quiz-volver').trigger('click');
    expect(wrapper!.emitted('volver')).toHaveLength(1);
  });
});

describe('MentorQuiz: pregunta y retroalimentación inmediata', () => {
  it('muestra la primera pregunta, su progreso, su dificultad y cuatro opciones', async () => {
    await empezar();
    expect($('quiz-progreso').text()).toBe('Pregunta 1 de 3');
    expect($('quiz-enunciado').text()).toBe('¿Cuál es la idea correcta número 1?');
    expect(wrapper!.text()).toContain('Dificultad básica');
    expect(opciones().map((o) => o.text())).toEqual([
      'Opción 1-0',
      'Opción 1-1',
      'Opción 1-2',
      'Opción 1-3',
    ]);
    expect($('quiz-retroalimentacion').text()).toBe(''); // aún sin responder
    expect($('quiz-siguiente').exists()).toBe(false);
  });

  it('al acertar dice "Correcto", explica y marca la opción con texto (no solo color)', async () => {
    await empezar();
    await elegir(1);
    expect($('quiz-veredicto').text()).toBe('¡Correcto!');
    expect($('quiz-explicacion').text()).toBe('Porque la opción 1-1 lo dice el material.');
    expect(opciones()[1]!.text()).toContain('(Correcta)');
    expect(opciones()[1]!.attributes('data-estado')).toBe('correcta');
    expect(
      opciones()
        .map((o) => o.text())
        .join(' '),
    ).not.toContain('(Tu respuesta)');
  });

  it('al fallar marca la elegida y la correcta y explica', async () => {
    await empezar();
    await elegir(3);
    expect($('quiz-veredicto').text()).toBe('Todavía no.');
    expect(opciones()[3]!.text()).toContain('(Tu respuesta)');
    expect(opciones()[3]!.attributes('data-estado')).toBe('incorrecta');
    expect(opciones()[1]!.text()).toContain('(Correcta)');
    expect($('quiz-explicacion').text()).toContain('lo dice el material');
  });

  it('la retroalimentación está en una región viva educada', async () => {
    await empezar();
    const region = $('quiz-retroalimentacion');
    expect(region.attributes('role')).toBe('status');
    expect(region.attributes('aria-live')).toBe('polite');
  });

  it('tras responder, la pregunta queda bloqueada (no se puede cambiar la respuesta)', async () => {
    await empezar();
    await elegir(3);
    await elegir(1);
    expect(opciones()[3]!.attributes('data-estado')).toBe('incorrecta');
    expect(opciones()[1]!.attributes('data-estado')).toBe('correcta');
    for (const o of opciones()) expect(o.attributes('aria-disabled')).toBe('true');
    // Sigue siendo alcanzable con el teclado: no se usa `disabled`.
    for (const o of opciones()) expect(o.attributes('disabled')).toBeUndefined();
  });

  it('las fuentes de la pregunta son enlaces internos', async () => {
    const { router } = await empezar();
    await elegir(1);
    const fuentes = wrapper!.findAll('[data-testid="quiz-fuente"]');
    expect(fuentes.map((f) => f.attributes('href'))).toEqual(['/modulo/3?s=m3_2_rankl']);
    await fuentes[0]!.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/modulo/3?s=m3_2_rankl');
    expect(wrapper!.emitted('navegar')).toHaveLength(1);
  });

  it('pasa a la siguiente pregunta y al enunciado le da el foco', async () => {
    await empezar();
    await elegir(1);
    await $('quiz-siguiente').trigger('click');
    await flushPromises();
    expect($('quiz-progreso').text()).toBe('Pregunta 2 de 3');
    expect($('quiz-retroalimentacion').text()).toBe('');
    expect(document.activeElement).toBe($('quiz-enunciado').element);
    expect($('quiz-siguiente').exists()).toBe(false);
  });

  it('al responder, el foco pasa al botón de continuar', async () => {
    await empezar();
    await elegir(2);
    expect(document.activeElement).toBe($('quiz-siguiente').element);
  });
});

describe('MentorQuiz: teclado y semántica', () => {
  it('las opciones son botones nativos con al menos 44 px, alcanzables con Tab', async () => {
    await empezar();
    for (const o of opciones()) {
      expect(o.element.tagName).toBe('BUTTON');
      expect(o.attributes('type')).toBe('button');
      expect(o.classes()).toContain('min-h-11');
      expect(o.attributes('tabindex')).toBeUndefined();
    }
  });

  it('la pregunta es una región con nombre y las opciones una lista', async () => {
    await empezar();
    const seccion = $('quiz-pregunta');
    expect(seccion.attributes('aria-labelledby')).toBe($('quiz-enunciado').attributes('id'));
    expect($('quiz-opciones').element.tagName).toBe('UL');
    expect(wrapper!.get('h2').text()).toBe('Ponme a prueba');
  });

  it('un botón nativo se activa con Enter o Espacio: el clic equivale a la tecla', async () => {
    // happy-dom no sintetiza el clic de Enter/Espacio en un <button>; se comprueba que es nativo
    // y que el manejador está en `click` (que es lo que esas teclas disparan en un navegador).
    await empezar();
    const opcion = opciones()[1]!;
    expect(opcion.element.tagName).toBe('BUTTON');
    opcion.element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect($('quiz-veredicto').text()).toBe('¡Correcto!');
  });
});

describe('MentorQuiz: resumen y práctica libre', () => {
  async function terminar(elegidas: number[]) {
    const ctx = await empezar();
    for (const [i, opcion] of elegidas.entries()) {
      await elegir(opcion);
      await $('quiz-siguiente').trigger('click');
      await flushPromises();
      if (i < elegidas.length - 1) expect($('quiz-progreso').exists()).toBe(true);
    }
    return ctx;
  }

  it('la última pregunta ofrece "Ver resultado" y abre el resumen con los aciertos', async () => {
    await empezar();
    await elegir(1);
    await $('quiz-siguiente').trigger('click');
    await elegir(0);
    await $('quiz-siguiente').trigger('click');
    await flushPromises();
    await elegir(2); // fallada (la correcta es la 3)
    expect($('quiz-siguiente').text()).toBe('Ver resultado');
    await $('quiz-siguiente').trigger('click');
    await flushPromises();

    const resumen = $('quiz-resumen');
    expect(resumen.exists()).toBe(true);
    expect(resumen.get('h3').text()).toBe('Acertaste 2 de 3');
    const items = wrapper!.findAll('[data-testid="quiz-resumen-item"]');
    expect(items).toHaveLength(3);
    expect(items[0]!.text()).toContain('Acertaste');
    expect(items[2]!.text()).toContain('Fallaste');
    // Para repasar: solo las fuentes de lo fallado, con enlaces internos.
    expect(
      wrapper!.findAll('[data-testid="quiz-repasar-enlace"]').map((e) => e.attributes('href')),
    ).toEqual(['/modulo/3?s=m3_2_rankl']);
    expect(document.activeElement).toBe(wrapper!.get('h2').element);
  });

  it('con todo correcto felicita y no ofrece "Para repasar"', async () => {
    await terminar([1, 0, 3]);
    expect($('quiz-resumen').get('h3').text()).toBe('Acertaste 3 de 3');
    expect($('quiz-repasar').exists()).toBe(false);
    expect($('quiz-resumen').text()).toContain('tienes claras estas ideas');
  });

  it('"Otro quiz" pide uno nuevo y vuelve a la primera pregunta', async () => {
    await terminar([1, 0, 3]);
    await $('quiz-otro').trigger('click');
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect($('quiz-resumen').exists()).toBe(false);
    expect($('quiz-progreso').text()).toBe('Pregunta 1 de 3');
  });

  it('dice que es práctica libre y que es IA en todos los estados, y nunca da puntos', async () => {
    await terminar([1, 0, 3]);
    expect($('quiz-nota-practica').text()).toContain('no suma puntos ni logros');
    expect(wrapper!.text()).toContain('Preguntas generadas por IA');
    expect(wrapper!.text()).not.toMatch(/\+\s*\d+\s*puntos|ganaste|logro desbloqueado/i);
    // Las únicas llamadas fueron al quiz: nada a actividades, progreso ni logros.
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatch(/\/mentor\/quiz$/);
  });
});
