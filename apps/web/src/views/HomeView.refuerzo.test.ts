/** Portada: tarjeta "Para reforzar" (F3-07). Solo aparece si el servidor sugiere algo. */
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { crearRouter } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { respuestaError, respuestaJson, progresoDePrueba, usuarioDePrueba } from '@/test/utils';
import HomeView from './HomeView.vue';

const fetchMock = vi.fn<typeof fetch>();

const SUGERENCIA = {
  actividad_id: 'm1_capas',
  concepto: 'Funciones del hueso',
  modulo: 1,
  seccion: 'm1_2_funciones',
  seccion_titulo: 'Para qué sirve el hueso',
  url: '/modulo/1?s=m1_2_funciones',
  motivo_tipo: 'precision_baja',
  motivo: 'Tu mejor resultado fue 20 de 50 puntos',
  prioridad: 'media',
  puntaje: 72,
};

function servidor(refuerzo: () => Response) {
  fetchMock.mockImplementation((entrada) => {
    const url = String(entrada);
    if (url.includes('/mentor/refuerzo')) return Promise.resolve(refuerzo());
    if (url.endsWith('/progress')) return Promise.resolve(respuestaJson(200, progresoDePrueba()));
    return Promise.reject(new Error(`fetch inesperado: ${url}`));
  });
}

async function montar() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'tok-123';
  auth.establecerUsuario(usuarioDePrueba());
  const router = crearRouter(createMemoryHistory());
  await router.push('/');
  await router.isReady();
  const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('HomeView: Para reforzar', () => {
  it('muestra la tarjeta con los enlaces a las secciones sugeridas', async () => {
    servidor(() => respuestaJson(200, { sugerencias: [SUGERENCIA] }));
    const wrapper = await montar();
    const tarjeta = wrapper.get('[data-testid="tarjeta-refuerzo"]');
    expect(tarjeta.get('h2').text()).toBe('Para reforzar');
    expect(tarjeta.text()).toContain('Funciones del hueso');
    expect(tarjeta.text()).toContain('Tu mejor resultado fue 20 de 50 puntos');
    expect(tarjeta.get('[data-testid="refuerzo-enlace"]').attributes('href')).toBe(
      '/modulo/1?s=m1_2_funciones',
    );
    // En la portada no se ofrece el quiz desde cada sugerencia (eso es del panel del mentor).
    expect(tarjeta.find('[data-testid="refuerzo-practicar"]').exists()).toBe(false);
  });

  it('va antes de la lista de módulos', async () => {
    servidor(() => respuestaJson(200, { sugerencias: [SUGERENCIA] }));
    const wrapper = await montar();
    const html = wrapper.html();
    expect(html.indexOf('data-testid="tarjeta-refuerzo"')).toBeLessThan(
      html.indexOf('id="titulo-modulos"'),
    );
  });

  it('sin sugerencias no aparece nada', async () => {
    servidor(() => respuestaJson(200, { sugerencias: [] }));
    const wrapper = await montar();
    expect(wrapper.find('[data-testid="tarjeta-refuerzo"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Para reforzar');
  });

  it('si el servidor falla tampoco aparece ni hay aviso de error', async () => {
    servidor(() => respuestaError(500, 'error_servidor', 'Traceback'));
    const wrapper = await montar();
    expect(wrapper.find('[data-testid="tarjeta-refuerzo"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Traceback');
    expect(wrapper.text()).not.toContain('sugerencias de refuerzo');
  });
});
