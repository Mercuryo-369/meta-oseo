/**
 * Menú circular y HUD reales dentro del AppShell real. AppShell.test.ts los sustituye por
 * stubs a propósito; aquí se comprueba que encajan con el shell y entre sí (solo el panel del
 * mentor, que es de otro componente, va como stub).
 */
import { flushPromises, mount } from '@vue/test-utils';
import type * as ConfigModulo from '@/config';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, RouterView } from 'vue-router';
import { crearRouter } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { progresoDePrueba, respuestaJson, usuarioDePrueba } from '@/test/utils';
import { simularMovimientoReducido } from './testing';

// Estas pruebas verifican el shell y la navegación, no el bloqueo secuencial (F2-08): se desactiva
// para poder llegar a cualquier módulo.
vi.mock('@/config', async (importOriginal) => ({
  ...(await importOriginal<typeof ConfigModulo>()),
  BLOQUEO_SECUENCIAL: false,
}));

const fetchMock = vi.fn<typeof fetch>();
let wrapper: VueWrapper | undefined;

async function montarShell(ruta: string) {
  simularMovimientoReducido(true);
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'tok';
  auth.establecerUsuario(usuarioDePrueba());
  const router = crearRouter(createMemoryHistory());
  await router.push(ruta);
  await router.isReady();
  wrapper = mount(
    { render: () => h(RouterView) },
    {
      global: {
        plugins: [pinia, router],
        stubs: { MentorPanel: true, transition: false, 'transition-group': false },
      },
      attachTo: document.body,
    },
  );
  await flushPromises();
  return { router };
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

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('menú de módulos + HUD dentro del AppShell', () => {
  it('el HUD va en la cabecera y el menú fuera de ella, y el progreso se pide una sola vez', async () => {
    await montarShell('/');
    const w = wrapper!;
    expect(w.find('header [data-testid="hud"]').exists()).toBe(true);
    // El menú es una barra lateral fuera de la cabecera; en la cabecera solo va su botón (pantallas estrechas).
    expect(w.find('header nav').exists()).toBe(false);
    expect(w.find('header [data-testid="menu-control"]').exists()).toBe(true);
    expect(w.find('nav[aria-label="Módulos"]').exists()).toBe(true);
    // Shell + HUD piden el progreso al montarse: el store comparte la misma petición.
    const progreso = fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/progress'));
    expect(progreso).toHaveLength(1);
    expect(w.get('[data-testid="hud-puntaje-visible"]').text()).toBe('100');
    expect(w.get('[data-testid="menu-control"]').text()).toContain('1 de 6 completados');
  });

  it('elegir un módulo en el menú navega, cierra el menú, actualiza el HUD y lleva el foco al contenido', async () => {
    const { router } = await montarShell('/');
    const w = wrapper!;
    await w.get('[data-testid="menu-control"]').trigger('click');
    await flushPromises();
    expect(w.findAll('nav[aria-label="Módulos"] a[data-modulo]')).toHaveLength(6);

    await w.get('nav[aria-label="Módulos"] a[href="/modulo/3"]').trigger('click');
    await flushPromises();
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/modulo/3'));
    await flushPromises();

    expect(w.get('[data-testid="menu-control"]').attributes('aria-expanded')).toBe('false');
    expect(w.get('[data-testid="hud-modulo"]').text()).toContain('Módulo 3');
    expect(w.get('[data-testid="hud-modulo"]').text()).toContain('Construyendo hueso');
    expect(document.activeElement).toBe(w.get('main#contenido').element);

    // Al reabrirlo, el módulo 3 está marcado como el actual.
    await w.get('[data-testid="menu-control"]').trigger('click');
    await flushPromises();
    expect(w.get('nav[aria-label="Módulos"] [aria-current="page"]').attributes('href')).toBe(
      '/modulo/3',
    );
  });
});
