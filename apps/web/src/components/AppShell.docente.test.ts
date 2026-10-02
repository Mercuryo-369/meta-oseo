/**
 * Enlace de entrada al panel del docente en el shell: visible solo para el rol docente, y la
 * ruta /docente a través del router real (estudiante: pantalla de acceso denegado, sin peticiones).
 */
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, RouterView } from 'vue-router';
import { crearRouter } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { RESUMEN } from '@/test/docenteFixtures';
import { progresoDePrueba, respuestaJson, usuarioDePrueba } from '@/test/utils';
import type { Rol } from '@/types/api';

const fetchMock = vi.fn<typeof fetch>();

async function montarApp(rol: Rol, ruta = '/') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'tok';
  auth.establecerUsuario(usuarioDePrueba({ rol }));
  const router = crearRouter(createMemoryHistory());
  await router.push(ruta);
  await router.isReady();
  const wrapper = mount(
    { render: () => h(RouterView) },
    {
      global: {
        plugins: [pinia, router],
        stubs: { MenuCircular: true, HudPuntaje: true, MentorPanel: true },
      },
      attachTo: document.body,
    },
  );
  await flushPromises();
  return { wrapper, router };
}

function peticionesAlPanel(): string[] {
  return fetchMock.mock.calls.map((c) => String(c[0])).filter((u) => u.includes('/teacher/'));
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation((entrada) => {
    const url = String(entrada);
    if (url.endsWith('/progress')) return Promise.resolve(respuestaJson(200, progresoDePrueba()));
    if (url.endsWith('/teacher/overview')) return Promise.resolve(respuestaJson(200, RESUMEN));
    return Promise.reject(new TypeError('sin red'));
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('enlace al panel del docente', () => {
  it('un docente ve el enlace en la cabecera y llega al panel', async () => {
    const { wrapper, router } = await montarApp('docente');

    const enlace = wrapper.get('[data-testid="enlace-docente"]');
    expect(enlace.attributes('href')).toBe('/docente');
    expect(enlace.text()).toContain('Panel docente');

    await enlace.trigger('click');
    // La vista se carga de forma perezosa (import dinámico): se espera a que termine la navegación.
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('docente'));
    await flushPromises();
    expect(wrapper.get('h1').text()).toBe('Panel del docente');
    expect(peticionesAlPanel()).toEqual(['/api/teacher/overview']);
    // El resto del shell sigue en su sitio.
    expect(wrapper.find('header').exists()).toBe(true);
    expect(wrapper.find('main#contenido').exists()).toBe(true);
    expect(wrapper.text()).toContain('Salir');
  });

  it('un estudiante no ve el enlace', async () => {
    const { wrapper } = await montarApp('estudiante');
    expect(wrapper.find('[data-testid="enlace-docente"]').exists()).toBe(false);
    expect(wrapper.find('a[href="/docente"]').exists()).toBe(false);
  });

  it('un estudiante que escribe /docente ve el acceso denegado y no se pide nada al panel', async () => {
    const { wrapper } = await montarApp('estudiante', '/docente');
    expect(wrapper.get('h1').text()).toBe('Acceso solo para docentes');
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(peticionesAlPanel()).toEqual([]);
  });
});
