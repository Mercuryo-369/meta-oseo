/** Tarjeta "Para reforzar" (F3-07): sin ruido, enlaces internos y accesibilidad básica. */
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { SugerenciaRefuerzo } from '@/ai/mentorApi';
import TarjetaRefuerzo from './TarjetaRefuerzo.vue';

function sugerencia(sobrescribir: Partial<SugerenciaRefuerzo> = {}): SugerenciaRefuerzo {
  return {
    actividad_id: 'm3_quiz',
    concepto: 'Señalización RANK-RANKL-OPG',
    modulo: 3,
    seccion: 'm3_2_rankl',
    seccion_titulo: 'La balanza RANKL/OPG',
    url: '/modulo/3?s=m3_2_rankl',
    motivo_tipo: 'atascada',
    motivo: 'Necesitaste 4 intentos para completarla',
    prioridad: 'alta',
    puntaje: 91,
    ...sobrescribir,
  };
}

const LISTA = [
  sugerencia(),
  sugerencia({
    actividad_id: 'm1_rel',
    concepto: 'Funciones del hueso',
    modulo: 1,
    seccion: 'm1_2_funciones',
    seccion_titulo: 'Para qué sirve el hueso',
    url: '/modulo/1?s=m1_2_funciones',
    motivo: 'Tu mejor resultado fue 20 de 50 puntos',
    prioridad: 'media',
  }),
  sugerencia({
    actividad_id: 'm2_x',
    concepto: 'Osteoblasto',
    modulo: 2,
    seccion: 'm2_1',
    seccion_titulo: '',
    url: '/modulo/2?s=m2_1',
    prioridad: 'baja',
  }),
  sugerencia({ actividad_id: 'm4_y', concepto: 'Cuarto', url: '/modulo/4' }),
];

async function montar(props: {
  sugerencias: SugerenciaRefuerzo[];
  limite?: number;
  practicable?: boolean;
}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/modulo/:n([1-6])', component: { template: '<div />' } },
    ],
  });
  await router.push('/');
  await router.isReady();
  const wrapper = mount(TarjetaRefuerzo, { props, global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe('TarjetaRefuerzo', () => {
  it('sin sugerencias no dibuja nada (sin ruido)', async () => {
    const { wrapper } = await montar({ sugerencias: [] });
    expect(wrapper.find('[data-testid="tarjeta-refuerzo"]').exists()).toBe(false);
    expect(wrapper.text()).toBe('');
    expect(wrapper.html()).not.toContain('reforzar');
  });

  it('con un límite de 0 tampoco dibuja nada', async () => {
    const { wrapper } = await montar({ sugerencias: LISTA, limite: 0 });
    expect(wrapper.find('[data-testid="tarjeta-refuerzo"]').exists()).toBe(false);
  });

  it('muestra el concepto, el módulo y sección, el motivo y la prioridad en texto', async () => {
    const { wrapper } = await montar({ sugerencias: LISTA, limite: 2 });
    const items = wrapper.findAll('[data-testid="refuerzo-item"]');
    expect(items).toHaveLength(2); // respeta el límite
    const primero = items[0]!;
    expect(primero.get('[data-testid="refuerzo-enlace"]').text()).toContain(
      'Señalización RANK-RANKL-OPG',
    );
    expect(primero.text()).toContain('Módulo 3 · La balanza RANKL/OPG');
    expect(primero.get('[data-testid="refuerzo-motivo"]').text()).toBe(
      'Necesitaste 4 intentos para completarla',
    );
    expect(primero.get('[data-testid="refuerzo-prioridad"]').text()).toBe('Prioridad alta');
    expect(items[1]!.get('[data-testid="refuerzo-prioridad"]').text()).toBe('Prioridad media');
    expect(items[0]!.attributes('data-prioridad')).toBe('alta');
  });

  it('sin título de sección muestra solo el módulo', async () => {
    const { wrapper } = await montar({ sugerencias: [LISTA[2]!] });
    const texto = wrapper.get('[data-testid="refuerzo-enlace"]').text();
    expect(texto).toContain('Módulo 2');
    expect(texto).not.toContain('·');
  });

  it('cada sugerencia enlaza a su sección con una ruta interna', async () => {
    const { wrapper } = await montar({ sugerencias: LISTA });
    const enlaces = wrapper.findAll('[data-testid="refuerzo-enlace"]');
    expect(enlaces.map((e) => e.attributes('href'))).toEqual([
      '/modulo/3?s=m3_2_rankl',
      '/modulo/1?s=m1_2_funciones',
      '/modulo/2?s=m2_1',
    ]); // el límite por defecto es 3
    for (const enlace of enlaces) expect(enlace.element.tagName).toBe('A');
  });

  it('seguir un enlace navega y avisa al panel', async () => {
    const { wrapper, router } = await montar({ sugerencias: LISTA });
    await wrapper.get('[data-testid="refuerzo-enlace"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/modulo/3?s=m3_2_rankl');
    expect(wrapper.emitted('navegar')![0]![0]).toMatchObject({ actividad_id: 'm3_quiz' });
  });

  it('es una región con nombre y una lista; los objetivos táctiles miden 44 px', async () => {
    const { wrapper } = await montar({ sugerencias: LISTA, practicable: true });
    const seccion = wrapper.get('section');
    const titulo = wrapper.get('h2');
    expect(titulo.text()).toBe('Para reforzar');
    expect(seccion.attributes('aria-labelledby')).toBe(titulo.attributes('id'));
    expect(wrapper.find('ul[role="list"]').exists()).toBe(true);
    for (const el of wrapper.findAll('[data-testid="refuerzo-enlace"], button')) {
      expect(el.classes()).toContain('min-h-11');
    }
  });

  it('el botón "Ponme a prueba" solo aparece si es practicable y dice sobre qué', async () => {
    const sin = await montar({ sugerencias: LISTA });
    expect(sin.wrapper.find('[data-testid="refuerzo-practicar"]').exists()).toBe(false);

    const { wrapper } = await montar({ sugerencias: LISTA, practicable: true });
    const botones = wrapper.findAll('[data-testid="refuerzo-practicar"]');
    expect(botones).toHaveLength(3);
    expect(botones[0]!.attributes('type')).toBe('button');
    expect(botones[0]!.text()).toContain('Ponme a prueba');
    expect(botones[0]!.text()).toContain('sobre Señalización RANK-RANKL-OPG'); // lector de pantalla
    await botones[1]!.trigger('click');
    expect(wrapper.emitted('practicar')![0]![0]).toMatchObject({ actividad_id: 'm1_rel' });
  });

  it('el botón se activa con el teclado (Enter y Espacio son de un button nativo)', async () => {
    const { wrapper } = await montar({ sugerencias: LISTA, practicable: true });
    const boton = wrapper.get('[data-testid="refuerzo-practicar"]');
    expect(boton.element.tagName).toBe('BUTTON');
    expect(boton.attributes('tabindex')).toBeUndefined();
  });
});
