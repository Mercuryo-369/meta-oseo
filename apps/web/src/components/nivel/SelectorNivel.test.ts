import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { visibleParaNivel } from '@/content/consultas';
import type { Bloque } from '@/content/schema';
import { useAuthStore } from '@/stores/auth';
import { useContextoStore } from '@/stores/contextoPedagogico';
import { respuestaError, respuestaJson, usuarioDePrueba } from '@/test/utils';
import SelectorNivel from './SelectorNivel.vue';

const fetchMock = vi.fn<typeof fetch>();

function cuerpo(llamada: number): unknown {
  return JSON.parse(String(fetchMock.mock.calls[llamada]![1]?.body));
}

function montar(opciones: { rol?: 'docente' | 'estudiante'; token?: string | null } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.establecerUsuario(usuarioDePrueba({ rol: opciones.rol ?? 'estudiante' }));
  auth.token = opciones.token === undefined ? 'jwt' : opciones.token;
  const wrapper = mount(SelectorNivel, { global: { plugins: [pinia] } });
  return { wrapper, auth, contexto: useContextoStore() };
}

type Envoltura = ReturnType<typeof montar>['wrapper'];

const radio = (w: Envoltura, nivel: string) =>
  w.get<HTMLInputElement>(`[data-testid="opcion-nivel-${nivel}"] input`);

async function elegir(w: Envoltura, nivel: string) {
  await radio(w, nivel).setValue(true);
  await flushPromises();
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('SelectorNivel: presentación', () => {
  it('es un grupo de radios etiquetado, con Pregrado marcado y el texto que explica qué cambia', () => {
    const { wrapper } = montar();
    expect(wrapper.get('h2').text()).toBe('Tu nivel');
    const grupo = wrapper.get('[role="radiogroup"]');
    expect(grupo.attributes('aria-labelledby')).toBe('titulo-nivel');
    const descripcion = wrapper.get(`#${grupo.attributes('aria-describedby')}`);
    expect(descripcion.text()).toContain(
      'El nivel posgrado añade avisos de profundización en los módulos y hace que el mentor responda con más detalle',
    );
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2);
    expect(radio(wrapper, 'pregrado').element.checked).toBe(true);
    expect(radio(wrapper, 'posgrado').element.checked).toBe(false);
  });

  it('cada opción mide al menos 44 px y la elegida lleva icono además del color', () => {
    const { wrapper } = montar();
    for (const nivel of ['pregrado', 'posgrado']) {
      expect(wrapper.get(`[data-testid="opcion-nivel-${nivel}"] span`).classes()).toContain(
        'min-h-11',
      );
    }
    expect(wrapper.find('[data-testid="opcion-nivel-pregrado"] svg').exists()).toBe(true);
    expect(wrapper.find('[data-testid="opcion-nivel-posgrado"] svg').exists()).toBe(false);
  });
});

describe('SelectorNivel: cambio de nivel', () => {
  it('actualiza el contexto al instante y guarda con PATCH /api/me', async () => {
    const { wrapper, auth, contexto } = montar();
    let resolver!: (r: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (resolver = r)));

    await radio(wrapper, 'posgrado').setValue(true);
    // Antes de que responda el servidor la pantalla y el mentor ya lo saben.
    expect(contexto.nivel).toBe('posgrado');
    expect(contexto.toPayload().nivel).toBe('posgrado');
    expect(wrapper.get('[data-testid="estado-nivel"]').text()).toContain('Guardando');

    resolver(respuestaJson(200, usuarioDePrueba({ nivel: 'posgrado' })));
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/me');
    expect(fetchMock.mock.calls[0]![1]?.method).toBe('PATCH');
    expect(cuerpo(0)).toEqual({ nivel: 'posgrado' });
    expect(auth.usuario?.nivel).toBe('posgrado');
    expect(wrapper.get('[data-testid="estado-nivel"]').text()).toContain(
      'Nivel guardado: Posgrado',
    );
    expect(wrapper.find('[data-testid="error-nivel"]').exists()).toBe(false);
  });

  it('volver a elegir el nivel vigente no envía nada', async () => {
    const { wrapper } = montar();
    await elegir(wrapper, 'pregrado');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si el servidor falla, el contexto vuelve al nivel guardado, avisa y permite reintentar', async () => {
    const { wrapper, auth, contexto } = montar();
    fetchMock.mockResolvedValueOnce(respuestaError(500, 'error_servidor', 'Falló el servidor.'));

    await elegir(wrapper, 'posgrado');

    expect(contexto.nivel).toBe('pregrado');
    expect(auth.usuario?.nivel).toBe('pregrado');
    expect(radio(wrapper, 'pregrado').element.checked).toBe(true);
    expect(radio(wrapper, 'posgrado').element.checked).toBe(false);
    const alerta = wrapper.get('[data-testid="error-nivel"]');
    expect(alerta.attributes('role')).toBe('alert');
    expect(alerta.text()).toContain('Falló el servidor.');

    fetchMock.mockResolvedValueOnce(respuestaJson(200, usuarioDePrueba({ nivel: 'posgrado' })));
    await wrapper.get('[data-testid="reintentar-nivel"]').trigger('click');
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cuerpo(1)).toEqual({ nivel: 'posgrado' });
    expect(contexto.nivel).toBe('posgrado');
    expect(radio(wrapper, 'posgrado').element.checked).toBe(true);
    expect(wrapper.find('[data-testid="error-nivel"]').exists()).toBe(false);
  });

  it('un fallo de red usa un mensaje propio y no pierde la sesión', async () => {
    const { wrapper, auth } = montar();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await elegir(wrapper, 'posgrado');
    expect(wrapper.get('[data-testid="error-nivel"]').text()).toContain('conexión');
    expect(auth.usuario).not.toBeNull();
  });

  it('elecciones seguidas se serializan y queda la última', async () => {
    const { wrapper, auth, contexto } = montar();
    let resolver!: (r: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (resolver = r)));
    fetchMock.mockResolvedValueOnce(respuestaJson(200, usuarioDePrueba({ nivel: 'pregrado' })));

    await radio(wrapper, 'posgrado').setValue(true);
    await radio(wrapper, 'pregrado').setValue(true);
    // La segunda elección se ve enseguida y no lanza una petición en paralelo.
    expect(contexto.nivel).toBe('pregrado');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolver(respuestaJson(200, usuarioDePrueba({ nivel: 'posgrado' })));
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cuerpo(1)).toEqual({ nivel: 'pregrado' });
    expect(auth.usuario?.nivel).toBe('pregrado');
    expect(contexto.nivel).toBe('pregrado');
  });

  it('el docente lo usa igual para previsualizar y solo se envía el nivel', async () => {
    const { wrapper, contexto } = montar({ rol: 'docente' });
    fetchMock.mockResolvedValueOnce(
      respuestaJson(200, usuarioDePrueba({ rol: 'docente', nivel: 'posgrado' })),
    );
    await elegir(wrapper, 'posgrado');
    expect(contexto.nivel).toBe('posgrado');
    expect(cuerpo(0)).toEqual({ nivel: 'posgrado' });
  });

  it('sin token (modo de desarrollo sin backend) solo cambia la vista local', async () => {
    const { wrapper, contexto } = montar({ token: null });
    await elegir(wrapper, 'posgrado');
    expect(contexto.nivel).toBe('posgrado');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="error-nivel"]').exists()).toBe(false);
  });
});

describe('SelectorNivel: efecto en caliente sobre el contenido y el mentor', () => {
  const bloques = [
    { tipo: 'texto', markdown: 'base' },
    { tipo: 'texto', markdown: 'profundización', nivel: 'posgrado' },
  ] as unknown as Bloque[];

  it('los bloques de posgrado aparecen y desaparecen sin recargar y el mentor recibe el nivel', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore();
    auth.establecerUsuario(usuarioDePrueba());
    auth.token = 'jwt';
    const contexto = useContextoStore();
    // Misma regla que ModuloView: `visibleParaNivel(bloque, contexto.nivel)`.
    const Pagina = defineComponent({
      setup: () => () =>
        h('div', [
          h(SelectorNivel),
          h(
            'ul',
            bloques
              .filter((b) => visibleParaNivel(b, contexto.nivel))
              .map((b) => h('li', { 'data-testid': 'bloque' }, b.tipo)),
          ),
        ]),
    });
    const wrapper = mount(Pagina, { global: { plugins: [pinia] } });
    expect(wrapper.findAll('[data-testid="bloque"]')).toHaveLength(1);

    fetchMock.mockResolvedValueOnce(respuestaJson(200, usuarioDePrueba({ nivel: 'posgrado' })));
    await radio(wrapper, 'posgrado').setValue(true);
    expect(wrapper.findAll('[data-testid="bloque"]')).toHaveLength(2);
    expect(contexto.toPayload().nivel).toBe('posgrado');
    await flushPromises();

    fetchMock.mockResolvedValueOnce(respuestaJson(200, usuarioDePrueba({ nivel: 'pregrado' })));
    await radio(wrapper, 'pregrado').setValue(true);
    await flushPromises();
    expect(wrapper.findAll('[data-testid="bloque"]')).toHaveLength(1);
    expect(contexto.toPayload().nivel).toBe('pregrado');
  });
});
