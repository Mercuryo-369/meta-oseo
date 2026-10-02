import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { crearRouter } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { useProgresoStore } from '@/stores/progreso';
import { usuarioDePrueba } from '@/test/utils';
import HomeView from './HomeView.vue';

async function montar(
  completados: number[] = [],
  opciones: { rol?: 'docente' | 'estudiante'; enCurso?: number[] } = {},
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  // Sin token el store no pide nada: el progreso se fija a mano.
  useAuthStore().establecerUsuario(usuarioDePrueba({ rol: opciones.rol ?? 'estudiante' }));
  const progreso = useProgresoStore();
  progreso.modulos = progreso.modulos.map((m) => ({
    ...m,
    completado: completados.includes(m.modulo),
    seccion_actual: opciones.enCurso?.includes(m.modulo) ? 'seccion' : m.seccion_actual,
  }));
  const router = crearRouter(createMemoryHistory());
  await router.push('/');
  await router.isReady();
  const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return wrapper;
}

beforeEach(() => localStorage.clear());

describe('HomeView: entradas a logros y certificado', () => {
  it('enlaza a /logros y a /certificado', async () => {
    const wrapper = await montar();
    expect(wrapper.get('[data-testid="enlace-logros"]').attributes('href')).toBe('/logros');
    expect(wrapper.get('[data-testid="enlace-certificado"]').attributes('href')).toBe(
      '/certificado',
    );
  });

  it('el aviso del certificado cambia al completar los seis módulos', async () => {
    const incompleto = await montar([1, 2]);
    expect(incompleto.get('[data-testid="enlace-certificado"]').text()).toContain(
      'Se obtiene al completar los seis módulos',
    );
    const completo = await montar([1, 2, 3, 4, 5, 6]);
    expect(completo.get('[data-testid="enlace-certificado"]').text()).toContain(
      'revisa si ya puedes obtenerlo',
    );
  });
});

describe('HomeView: tarjetas de módulo', () => {
  const tarjetas = (w: Awaited<ReturnType<typeof montar>>) =>
    w.findAll('[data-testid="tarjeta-modulo"]');

  it('con una cuenta nueva el 1 está listo y del 2 al 6 aparecen bloqueados con su motivo', async () => {
    const wrapper = await montar();
    const t = tarjetas(wrapper);
    expect(t).toHaveLength(6);
    expect(t.map((x) => x.attributes('data-estado'))).toEqual([
      'disponible',
      'bloqueado',
      'bloqueado',
      'bloqueado',
      'bloqueado',
      'bloqueado',
    ]);
    // El bloqueo se dice con texto e icono, no solo con color.
    for (let i = 1; i < 6; i++) {
      const estado = t[i]!.get('[data-testid="estado-modulo"]');
      expect(estado.text()).toBe(`Completa el módulo ${i} para abrirlo`);
      expect(estado.find('svg').exists()).toBe(true);
      expect(t[i]!.find('[data-testid="insignia-bloqueado"]').exists()).toBe(true);
    }
    expect(t[0]!.get('[data-testid="estado-modulo"]').text()).toBe('Listo para empezar');
    expect(t[0]!.find('[data-testid="insignia-bloqueado"]').exists()).toBe(false);
  });

  it('una tarjeta bloqueada sigue siendo un enlace a la página del módulo (no un callejón sin salida)', async () => {
    const wrapper = await montar();
    const t = tarjetas(wrapper);
    for (let i = 0; i < 6; i++) {
      const enlace = t[i]!.get('a');
      expect(enlace.attributes('href')).toBe(`/modulo/${i + 1}`);
      expect(enlace.attributes('aria-disabled')).toBeUndefined();
    }
    // Lo bloqueado se distingue también por su borde discontinuo.
    expect(t[2]!.get('a').classes()).toContain('border-dashed');
    expect(t[0]!.get('a').classes()).not.toContain('border-dashed');
  });

  it('muestra completado, en curso y bloqueado según el progreso', async () => {
    const wrapper = await montar([1], { enCurso: [2] });
    const t = tarjetas(wrapper);
    expect(t.map((x) => x.attributes('data-estado'))).toEqual([
      'completado',
      'en_curso',
      'bloqueado',
      'bloqueado',
      'bloqueado',
      'bloqueado',
    ]);
    expect(t[0]!.get('[data-testid="estado-modulo"]').text()).toBe('Completado');
    expect(t[0]!.find('[data-testid="insignia-completado"]').exists()).toBe(true);
    expect(t[1]!.get('[data-testid="estado-modulo"]').text()).toBe('En curso');
    expect(t[2]!.get('[data-testid="estado-modulo"]').text()).toBe(
      'Completa el módulo 2 para abrirlo',
    );
  });

  it('cada tarjeta lleva la identidad de su módulo: acento, portada y rótulo propios', async () => {
    const wrapper = await montar();
    const t = tarjetas(wrapper);
    const acentos = t.map((x) => x.attributes('style'));
    expect(new Set(acentos).size).toBe(6);
    const portadas = t.map((x) => x.get('[data-testid="portada-modulo"] img').attributes('src'));
    expect(new Set(portadas).size).toBe(6);
    expect(portadas[3]).toBe('/images/m4/m4_fibrilla_mineralizada.svg');
    const rotulos = t.map((x) => x.get('[data-testid="rotulo-modulo"]').text());
    expect(new Set(rotulos).size).toBe(6);
    // Las ilustraciones son decorativas y se cargan bajo demanda.
    const img = t[0]!.get('[data-testid="portada-modulo"] img');
    expect(img.attributes('alt')).toBe('');
    expect(img.attributes('loading')).toBe('lazy');
  });

  it('el docente no ve nada bloqueado y una etiqueta «Vista de docente»', async () => {
    const wrapper = await montar([], { rol: 'docente' });
    const t = tarjetas(wrapper);
    expect(t.map((x) => x.attributes('data-estado'))).not.toContain('bloqueado');
    expect(wrapper.find('[data-testid="insignia-bloqueado"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="nota-docente"]').text()).toContain('Vista de docente');

    const estudiante = await montar();
    expect(estudiante.find('[data-testid="nota-docente"]').exists()).toBe(false);
  });

  it('deja margen inferior para que los botones flotantes no tapen el final de la página', async () => {
    const wrapper = await montar();
    expect(wrapper.get('div').classes().join(' ')).toContain('pb-[max(7rem,');
  });
});

describe('HomeView: nivel', () => {
  it('trae la seccion Tu nivel con el control de Pregrado y Posgrado', async () => {
    const wrapper = await montar();
    const seccion = wrapper.get('[data-testid="seccion-nivel"]');
    expect(seccion.get('h2').text()).toBe('Tu nivel');
    expect(seccion.findAll('input[type="radio"]')).toHaveLength(2);
    // También el docente puede previsualizar el nivel.
    const docente = await montar([], { rol: 'docente' });
    expect(docente.find('[data-testid="seccion-nivel"]').exists()).toBe(true);
  });
});
