import { flushPromises, mount } from '@vue/test-utils';
import type * as ConfigModulo from '@/config';
import type * as RegistroModulos from '@/content/registry';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { RouterView } from 'vue-router';
import { h } from 'vue';
import HudPuntaje from '@/components/HudPuntaje.vue';
import MentorPanel from '@/components/mentor/MentorPanel.vue';
import { crearRouter } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { useContextoStore } from '@/stores/contextoPedagogico';
import { progresoDePrueba, respuestaJson, usuarioDePrueba } from '@/test/utils';

// Estas pruebas verifican el shell y la navegación, no el bloqueo secuencial (F2-08): se desactiva
// para poder llegar a cualquier módulo.
vi.mock('@/config', async (importOriginal) => ({
  ...(await importOriginal<typeof ConfigModulo>()),
  BLOQUEO_SECUENCIAL: false,
}));

// El contenido real de los módulos lo escriben otras tareas: esta prueba no depende de él. Con
// "sin contenido" la página de módulo muestra igualmente el título del módulo.
vi.mock('@/content/registry', async (importOriginal) => ({
  ...(await importOriginal<typeof RegistroModulos>()),
  cargarModulo: vi.fn(() =>
    Promise.resolve({ ok: false, motivo: 'sin_contenido', mensaje: 'Sin contenido', errores: [] }),
  ),
}));

const fetchMock = vi.fn<typeof fetch>();

async function montarApp(ruta: string) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'tok';
  auth.establecerUsuario(usuarioDePrueba());
  const router = crearRouter(createMemoryHistory());
  await router.push(ruta);
  await router.isReady();
  // Se monta con <RouterView/> raíz, como App.vue: el shell y la vista van por el router.
  const wrapper = mount(
    { render: () => h(RouterView) },
    {
      // Los tres componentes de los otros agentes se sustituyen por stubs: esta prueba verifica
      // el layout del shell, no su contenido, y sigue valiendo cuando ellos los reescriban.
      global: {
        plugins: [pinia, router],
        stubs: { HudPuntaje: true, MentorPanel: true },
      },
      attachTo: document.body,
    },
  );
  await flushPromises();
  return { wrapper, router, auth };
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation((entrada) => {
    const url = String(entrada);
    if (url.endsWith('/progress')) {
      return Promise.resolve(respuestaJson(200, progresoDePrueba([1], 100, ['primer_hueso'])));
    }
    if (url.endsWith('/achievements')) return Promise.resolve(respuestaJson(200, { logros: [] }));
    return Promise.reject(new TypeError('sin red'));
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('AppShell', () => {
  it('monta HUD y mentor alrededor de la vista (sin menú lateral), con los landmarks correctos', async () => {
    const { wrapper } = await montarApp('/');

    expect(wrapper.find('header').exists()).toBe(true);
    expect(wrapper.get('header').findComponent(HudPuntaje).exists()).toBe(true);
    expect(wrapper.find('#menu-modulos').exists()).toBe(false);
    expect(wrapper.findComponent(MentorPanel).exists()).toBe(true);
    const main = wrapper.get('main#contenido');
    expect(main.attributes('tabindex')).toBe('-1');
    // La vista (Home) va DENTRO de <main>.
    expect(main.text()).toContain('Hola, Ana');
    expect(wrapper.get('a.saltar-al-contenido').attributes('href')).toBe('#contenido');
    wrapper.unmount();
  });

  it('el shell pide el progreso una sola vez', async () => {
    const { wrapper } = await montarApp('/');
    const progreso = fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/progress'));
    expect(progreso).toHaveLength(1);
    wrapper.unmount();
  });

  it('Home lista los 6 módulos con enlaces reales a /modulo/n y marca el completado', async () => {
    const { wrapper } = await montarApp('/');
    // Las tarjetas de módulo (la portada del inicio repite los seis enlaces como pasos).
    const enlaces = wrapper
      .findAll('[data-testid="tarjeta-modulo"] a')
      .map((a) => a.attributes('href'));
    expect(enlaces).toEqual([1, 2, 3, 4, 5, 6].map((n) => `/modulo/${n}`));
    const tarjetas = wrapper.findAll('[data-testid="tarjeta-modulo"]');
    expect(tarjetas[0]!.text()).toContain('Completado');
    expect(tarjetas[1]!.text()).not.toContain('Completado');
    expect(wrapper.text()).toContain('1 de 6 completados');
    wrapper.unmount();
  });

  it('la vista de módulo se monta dentro del shell y llama a setModulo', async () => {
    const { wrapper, router } = await montarApp('/modulo/3');
    const contexto = useContextoStore();
    // La página carga el contenido del módulo de forma asíncrona.
    await vi.waitFor(() => expect(wrapper.get('h1').text()).toBe('Construyendo hueso'));
    expect(wrapper.find('[data-testid="modulo-view"]').exists()).toBe(true);
    expect(contexto.modulo).toBe(3);

    await router.push('/modulo/5');
    await flushPromises();
    await vi.waitFor(() => expect(wrapper.get('h1').text()).toBe('Renovando el hueso'));
    expect(contexto.modulo).toBe(5);
    wrapper.unmount();
  });

  it('"Salir" cierra la sesión y lleva a /acceso', async () => {
    const { wrapper, router, auth } = await montarApp('/');
    const salir = wrapper.findAll('header button').find((b) => b.text().includes('Salir'))!;
    await salir.trigger('click');
    await flushPromises();
    expect(auth.isAuthenticated).toBe(false);
    // La vista de acceso se carga de forma perezosa: la navegación termina un instante después.
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('acceso'));
    wrapper.unmount();
  });

  it('el foco pasa al contenido al cambiar de página', async () => {
    const { wrapper, router } = await montarApp('/');
    await router.push('/modulo/2');
    await flushPromises();
    expect(document.activeElement).toBe(wrapper.get('main#contenido').element);
    wrapper.unmount();
  });
});
