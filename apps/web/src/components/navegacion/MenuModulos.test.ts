import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { crearRouter } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { useProgresoStore } from '@/stores/progreso';
import { usuarioDePrueba } from '@/test/utils';
import BotonModulos from './BotonModulos.vue';
import MenuModulos from './MenuModulos.vue';
import { useMenuModulos } from './useMenuModulos';

async function montar(ruta = '/', completados: number[] = [1]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore().establecerUsuario(usuarioDePrueba({ rol: 'estudiante' }));
  const progreso = useProgresoStore();
  progreso.modulos = progreso.modulos.map((m) => ({
    ...m,
    completado: completados.includes(m.modulo),
  }));
  const router = crearRouter(createMemoryHistory());
  await router.push(ruta);
  await router.isReady();
  const wrapper = mount(
    { components: { BotonModulos, MenuModulos }, template: '<BotonModulos /><MenuModulos />' },
    { global: { plugins: [pinia, router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('MenuModulos', () => {
  it('lista los seis módulos con enlace y estado en texto', async () => {
    const { wrapper } = await montar();
    const nav = wrapper.get('nav[aria-label="Módulos"]');
    const enlaces = nav.findAll('[data-modulo]');
    expect(enlaces.map((a) => a.attributes('href'))).toEqual(
      [1, 2, 3, 4, 5, 6].map((n) => `/modulo/${n}`),
    );
    expect(enlaces[0]!.attributes('data-estado')).toBe('completada');
    expect(enlaces[2]!.text()).toContain('Completa el módulo 2 para abrirlo');
    // Sin barra de avance desde el 2026-10-25 (se quitó «Tu recorrido»).
    expect(nav.find('[role="progressbar"]').exists()).toBe(false);
    // Accesos generales.
    const destinos = nav.findAll('ul a').map((a) => a.attributes('href'));
    expect(destinos).toEqual(['/', '/logros', '/certificado']);
    wrapper.unmount();
  });

  it('marca el módulo abierto con aria-current="page"', async () => {
    const { wrapper } = await montar('/modulo/2');
    const actual = wrapper.findAll('nav [aria-current="page"]');
    expect(actual).toHaveLength(1);
    expect(actual[0]!.attributes('href')).toBe('/modulo/2');
    wrapper.unmount();
  });

  it('el botón despliega el panel, Escape lo cierra y devuelve el foco al botón', async () => {
    const { wrapper } = await montar();
    const boton = wrapper.get('[data-testid="menu-control"]');
    expect(boton.attributes('aria-expanded')).toBe('false');
    expect(boton.text()).toContain('1 de 6 completados');

    await boton.trigger('click');
    await flushPromises();
    expect(boton.attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('[data-testid="velo-menu"]').exists()).toBe(true);
    expect(document.activeElement?.getAttribute('href')).toBe('/modulo/1');

    await wrapper.get('nav').trigger('keydown', { key: 'Escape' });
    expect(boton.attributes('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(boton.element);
    wrapper.unmount();
  });

  it('elegir un destino o tocar el velo cierra el panel', async () => {
    const { wrapper, router } = await montar();
    const { abrir } = useMenuModulos();
    abrir();
    await flushPromises();
    await router.push('/modulo/1');
    await flushPromises();
    expect(wrapper.get('[data-testid="menu-control"]').attributes('aria-expanded')).toBe('false');

    abrir();
    await flushPromises();
    await wrapper.get('[data-testid="velo-menu"]').trigger('click');
    expect(wrapper.find('[data-testid="velo-menu"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
