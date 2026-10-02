import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { simularRutas } from '@/components/certificado/utilesPrueba';
import { crearRouter } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { respuestaJson, usuarioDePrueba } from '@/test/utils';
import type { Logro } from '@/types/api';
import LogrosView from './LogrosView.vue';

let wrappers: VueWrapper[] = [];

function logro(codigo: string, nombre: string, obtenidoEn: string | null = null): Logro {
  return {
    codigo,
    nombre,
    descripcion: `Descripción de ${nombre}`,
    obtenido: obtenidoEn !== null,
    obtenido_en: obtenidoEn,
  };
}

const CATALOGO = [
  logro('primer_hueso', 'Primer hueso', '2026-09-23T20:00:00Z'),
  logro('celula_por_celula', 'Célula por célula', '2026-09-24T09:30:00Z'),
  logro('constructor', 'Constructor'),
  logro('mineralizador', 'Mineralizador'),
  logro('remodelador', 'Remodelador'),
  logro('cronista', 'Cronista'),
];

async function montar() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'jwt-de-prueba';
  auth.establecerUsuario(usuarioDePrueba());
  const router = crearRouter(createMemoryHistory());
  await router.push('/logros');
  await router.isReady();
  const wrapper = mount(LogrosView, {
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  await flushPromises();
  return { wrapper, router };
}

const porId = (w: VueWrapper, id: string) => w.find(`[data-testid="${id}"]`);

beforeEach(() => {
  wrappers.forEach((w) => w.unmount());
  wrappers = [];
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('LogrosView', () => {
  it('muestra el estado de carga', async () => {
    let resolver: (r: Response) => void = () => {};
    simularRutas({ 'GET /achievements': () => new Promise<Response>((r) => (resolver = r)) });
    const { wrapper } = await montar();
    expect(porId(wrapper, 'logros-cargando').attributes('role')).toBe('status');
    resolver(respuestaJson(200, { logros: CATALOGO }));
    await flushPromises();
    expect(porId(wrapper, 'logros-cargando').exists()).toBe(false);
    expect(porId(wrapper, 'lista-logros').exists()).toBe(true);
  });

  it('dibuja la cuadrícula del catálogo con nombre, descripción, estado y fecha', async () => {
    simularRutas({ 'GET /achievements': () => respuestaJson(200, { logros: CATALOGO }) });
    const { wrapper } = await montar();

    const tarjetas = porId(wrapper, 'lista-logros').findAll('li');
    expect(tarjetas).toHaveLength(6);
    expect(porId(wrapper, 'logros-resumen').text()).toBe('2 de 6 logros obtenidos');

    const primero = porId(wrapper, 'logro-primer_hueso');
    expect(primero.text()).toContain('Primer hueso');
    expect(primero.text()).toContain('Descripción de Primer hueso');
    expect(primero.get('[data-testid="logro-estado"]').text()).toBe(
      'Obtenido el 23 de septiembre de 2026',
    );
    expect(primero.attributes('data-estado')).toBe('obtenido');

    const pendiente = porId(wrapper, 'logro-mineralizador');
    expect(pendiente.attributes('data-estado')).toBe('pendiente');
    expect(pendiente.get('[data-testid="logro-estado"]').text()).toBe('Pendiente');
  });

  it('el estado se dice con texto (no solo con color) y los iconos son decorativos', async () => {
    simularRutas({ 'GET /achievements': () => respuestaJson(200, { logros: CATALOGO }) });
    const { wrapper } = await montar();
    for (const tarjeta of porId(wrapper, 'lista-logros').findAll('li')) {
      const texto = tarjeta.get('[data-testid="logro-estado"]').text();
      expect(texto).toMatch(/^(Obtenido|Pendiente)/);
    }
    for (const icono of wrapper.findAll('svg.lucide')) {
      expect(icono.attributes('aria-hidden')).toBe('true');
    }
  });

  it('destaca el siguiente logro (el primero pendiente) en el resumen y en su tarjeta', async () => {
    simularRutas({ 'GET /achievements': () => respuestaJson(200, { logros: CATALOGO }) });
    const { wrapper } = await montar();

    const destacado = porId(wrapper, 'siguiente-logro');
    expect(destacado.text()).toContain('Tu siguiente logro: Constructor');
    expect(destacado.text()).toContain('Descripción de Constructor');
    const tarjeta = porId(wrapper, 'logro-constructor');
    expect(tarjeta.attributes('data-estado')).toBe('siguiente');
    expect(tarjeta.text()).toContain('tu siguiente logro');
    expect(porId(wrapper, 'logro-mineralizador').attributes('data-estado')).toBe('pendiente');
  });

  it('con todos obtenidos lo celebra y no hay siguiente', async () => {
    const todos = CATALOGO.map((l) => ({
      ...l,
      obtenido: true,
      obtenido_en: '2026-09-24T09:30:00Z',
    }));
    simularRutas({ 'GET /achievements': () => respuestaJson(200, { logros: todos }) });
    const { wrapper } = await montar();
    expect(porId(wrapper, 'logros-completos').text()).toContain('todos los logros');
    expect(porId(wrapper, 'siguiente-logro').exists()).toBe(false);
    expect(porId(wrapper, 'logros-resumen').text()).toBe('6 de 6 logros obtenidos');
  });

  it('con el catálogo vacío lo dice sin afirmar nada más', async () => {
    simularRutas({ 'GET /achievements': () => respuestaJson(200, { logros: [] }) });
    const { wrapper } = await montar();
    expect(porId(wrapper, 'logros-vacio').exists()).toBe(true);
    expect(porId(wrapper, 'logros-completos').exists()).toBe(false);
    expect(porId(wrapper, 'lista-logros').exists()).toBe(false);
  });

  it('un error del servidor muestra alert y Reintentar recupera', async () => {
    let n = 0;
    simularRutas({
      'GET /achievements': () =>
        n++ === 0 ? respuestaJson(500, {}) : respuestaJson(200, { logros: CATALOGO }),
    });
    const { wrapper } = await montar();
    const error = porId(wrapper, 'logros-error');
    expect(error.attributes('role')).toBe('alert');
    expect(error.text()).toContain('El servidor no está disponible');

    await porId(wrapper, 'logros-reintentar').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'logros-error').exists()).toBe(false);
    expect(porId(wrapper, 'lista-logros').findAll('li')).toHaveLength(6);
  });

  it('sin conexión muestra el mensaje de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('sin red')));
    const { wrapper } = await montar();
    expect(porId(wrapper, 'logros-error').text()).toContain('No hay conexión con el servidor');
  });

  it('accesibilidad: un h1, lista semántica y regiones con título', async () => {
    simularRutas({ 'GET /achievements': () => respuestaJson(200, { logros: CATALOGO }) });
    const { wrapper } = await montar();
    expect(wrapper.findAll('h1')).toHaveLength(1);
    expect(porId(wrapper, 'lista-logros').element.tagName).toBe('UL');
    const region = porId(wrapper, 'siguiente-logro');
    const titulo = document.getElementById(region.attributes('aria-labelledby')!);
    expect(titulo?.textContent).toContain('Constructor');
  });
});
