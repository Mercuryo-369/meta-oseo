/**
 * "Fuentes" bajo la respuesta del mentor (F3-05): enlaces internos accesibles a las secciones del
 * curso que consultó. Se prueba el mensaje aislado y el panel completo (con un router de prueba).
 *
 * Como en MentorPanel.test.ts, DOMPurify se sustituye por identidad (no funciona en happy-dom);
 * la primera capa (markdown-it sin HTML crudo) es la real.
 */
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { Router } from 'vue-router';
import { respuestaSse, sseCitas, sseFin, sseMensaje, sseSesion, sseTexto } from '@/ai/pruebas';
import type { CitaMentor, MensajeMentor } from '@/ai/useMentor';
import { useAuthStore } from '@/stores/auth';
import { usuarioDePrueba } from '@/test/utils';
import MentorMensaje from './MentorMensaje.vue';
import MentorPanel from './MentorPanel.vue';

vi.mock('@/ai/sanitizar', () => ({ sanitizarHtml: vi.fn((html: string) => html) }));

const fetchMock = vi.fn<typeof fetch>();
let wrapper: VueWrapper | undefined;
let avisos: MockInstance[] = [];

const CITAS: CitaMentor[] = [
  {
    id: 'm3:m3_4_osteocito_sensor:t_dinamica_no_estatica',
    modulo: 3,
    seccion_id: 'm3_4_osteocito_sensor',
    titulo: 'Módulo 3 · El osteocito, un sensor de la carga',
    url: '/modulo/3?s=m3_4_osteocito_sensor',
  },
  {
    id: 'm1:glosario:osteocito',
    modulo: 1,
    seccion_id: null,
    titulo: 'Módulo 1 · Glosario: Osteocito',
    url: '/modulo/1',
  },
];

function crearRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'inicio', component: { template: '<div />' } },
      { path: '/modulo/:n([1-6])', name: 'modulo', component: { template: '<div />' } },
    ],
  });
}

function mensajeMentor(sobrescribir: Partial<MensajeMentor> = {}): MensajeMentor {
  return {
    id: 'm-1',
    role: 'assistant',
    content: 'El osteocito percibe la carga [1].',
    status: 'completo',
    citas: CITAS,
    ...sobrescribir,
  };
}

async function montarMensaje(mensaje: MensajeMentor) {
  const router = crearRouter();
  await router.push('/');
  await router.isReady();
  wrapper = mount(MentorMensaje, { props: { mensaje }, global: { plugins: [router] } });
  return { router };
}

beforeEach(() => {
  avisos = [vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')];
  for (const espia of avisos) espia.mockImplementation(() => undefined);
  document.body.innerHTML = '';
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = '';
  const emitidos = avisos.flatMap((espia) => espia.mock.calls.map((llamada) => String(llamada[0])));
  expect(emitidos).toEqual([]);
});

describe('MentorMensaje: Fuentes', () => {
  it('lista las fuentes como enlaces internos, numerados igual que las etiquetas del texto', async () => {
    await montarMensaje(mensajeMentor());
    const nav = wrapper!.get('nav[data-testid="mentor-fuentes"]');
    expect(nav.attributes('aria-label')).toBe('Fuentes del curso consultadas');
    expect(nav.text()).toContain('Fuentes');
    expect(nav.findAll('ol > li')).toHaveLength(2);

    const enlaces = nav.findAll('a[data-testid="mentor-fuente"]');
    expect(enlaces.map((a) => a.attributes('href'))).toEqual([
      '/modulo/3?s=m3_4_osteocito_sensor',
      '/modulo/1',
    ]);
    expect(enlaces[0]!.text()).toContain('[1]');
    expect(enlaces[0]!.text()).toContain('Módulo 3 · El osteocito, un sensor de la carga');
    expect(enlaces[1]!.text()).toContain('[2]');
    // Para el lector de pantalla: "Fuente 1: ..." y el número entre corchetes queda oculto.
    expect(enlaces[0]!.get('.sr-only').text()).toBe('Fuente 1:');
    expect(enlaces[0]!.get('[aria-hidden="true"]').text()).toBe('[1]');
  });

  it('cada enlace cumple el tamaño táctil de 44 px y es enfocable con teclado', async () => {
    await montarMensaje(mensajeMentor());
    for (const enlace of wrapper!.findAll('a[data-testid="mentor-fuente"]')) {
      expect(enlace.classes()).toContain('min-h-11');
      expect(enlace.classes()).toContain('focus-visible:ring-2');
      expect(enlace.attributes('tabindex')).toBeUndefined(); // un <a href> ya es enfocable
    }
  });

  it('no aparecen mientras llega el texto, ni sin citas, ni en el mensaje del estudiante', async () => {
    await montarMensaje(mensajeMentor({ status: 'transmitiendo' }));
    expect(wrapper!.find('[data-testid="mentor-fuentes"]').exists()).toBe(false);
    wrapper!.unmount();

    await montarMensaje(mensajeMentor({ citas: undefined }));
    expect(wrapper!.find('[data-testid="mentor-fuentes"]').exists()).toBe(false);
    wrapper!.unmount();

    await montarMensaje(mensajeMentor({ status: 'interrumpido' }));
    expect(wrapper!.find('[data-testid="mentor-fuentes"]').exists()).toBe(false);
    wrapper!.unmount();

    await montarMensaje(mensajeMentor({ role: 'user' }));
    expect(wrapper!.find('[data-testid="mentor-fuentes"]').exists()).toBe(false);
  });

  it('seguir una fuente navega dentro de la aplicación a la sección y avisa al panel', async () => {
    const { router } = await montarMensaje(mensajeMentor());
    await wrapper!.findAll('a[data-testid="mentor-fuente"]')[0]!.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/modulo/3?s=m3_4_osteocito_sensor');
    expect(router.currentRoute.value.name).toBe('modulo');
    expect(wrapper!.emitted('navegar')).toEqual([[CITAS[0]]]);
  });

  it('un título con HTML se muestra como texto, no como marcado', async () => {
    await montarMensaje(
      mensajeMentor({ citas: [{ ...CITAS[0]!, titulo: '<img src=x onerror=alert(1)> Sección' }] }),
    );
    const enlace = wrapper!.get('a[data-testid="mentor-fuente"]');
    expect(enlace.find('img').exists()).toBe(false);
    expect(enlace.text()).toContain('<img src=x onerror=alert(1)> Sección');
  });
});

// ---- El panel completo ---------------------------------------------------------------------------

function simularPantalla(pantalla: 'movil' | 'escritorio'): void {
  vi.spyOn(window, 'matchMedia').mockImplementation((consulta: string) => {
    const minimo = /min-width:\s*(\d+)px/.exec(consulta);
    const coincide = minimo ? (pantalla === 'escritorio' ? 1280 : 390) >= Number(minimo[1]) : false;
    return {
      matches: coincide,
      media: consulta,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  });
}

const porId = (id: string) => document.body.querySelector<HTMLElement>(`[data-testid="${id}"]`);

async function panelConRespuesta(pantalla: 'movil' | 'escritorio') {
  simularPantalla(pantalla);
  fetchMock.mockImplementation(() =>
    Promise.resolve(
      respuestaSse([
        sseSesion(12),
        sseTexto('El osteocito percibe la carga [1].'),
        sseCitas(CITAS),
        sseMensaje(40),
        sseFin(),
      ]),
    ),
  );
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'tok-123';
  auth.establecerUsuario(usuarioDePrueba());
  const router = crearRouter();
  await router.push('/');
  await router.isReady();
  wrapper = mount(MentorPanel, { global: { plugins: [pinia, router] }, attachTo: document.body });
  await wrapper.get('[data-testid="mentor-abrir"]').trigger('click');
  await flushPromises();
  await nextTick();
  const campo = document.body.querySelector<HTMLTextAreaElement>('[data-testid="mentor-campo"]')!;
  campo.value = '¿Cómo siente la carga el osteocito?';
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  porId('mentor-enviar')!.click();
  await flushPromises();
  await vi.waitFor(() => expect(porId('mentor-fuentes')).not.toBeNull());
  return { router };
}

describe('MentorPanel: Fuentes', () => {
  it('muestra las fuentes como enlaces internos al terminar la respuesta', async () => {
    await panelConRespuesta('escritorio');
    const enlaces = Array.from(
      document.body.querySelectorAll<HTMLAnchorElement>('[data-testid="mentor-fuente"]'),
    );
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([
      '/modulo/3?s=m3_4_osteocito_sensor',
      '/modulo/1',
    ]);
    expect(porId('mentor-fuentes')!.getAttribute('aria-label')).toBeTruthy();
  });

  it('en móvil, abrir una fuente navega y cierra la hoja para dejar ver el contenido', async () => {
    const { router } = await panelConRespuesta('movil');
    document.body.querySelector<HTMLAnchorElement>('[data-testid="mentor-fuente"]')!.click();
    await flushPromises();
    await nextTick();
    expect(router.currentRoute.value.fullPath).toBe('/modulo/3?s=m3_4_osteocito_sensor');
    await vi.waitFor(() => expect(porId('mentor-panel')).toBeNull());
  });

  it('en escritorio, el panel lateral sigue abierto tras abrir una fuente', async () => {
    const { router } = await panelConRespuesta('escritorio');
    document.body.querySelector<HTMLAnchorElement>('[data-testid="mentor-fuente"]')!.click();
    await flushPromises();
    await nextTick();
    expect(router.currentRoute.value.fullPath).toBe('/modulo/3?s=m3_4_osteocito_sensor');
    expect(porId('mentor-panel')).not.toBeNull();
    expect(porId('mentor-fuentes')).not.toBeNull();
  });
});
