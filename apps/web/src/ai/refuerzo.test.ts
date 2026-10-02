/** Sugerencias de refuerzo (F3-07): la store que las pide, las valida y las vacía al salir. */
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { respuestaError, respuestaJson, usuarioDePrueba } from '@/test/utils';
import type { SugerenciaRefuerzo } from './mentorApi';
import { VIGENCIA_MS, esRutaInterna, useRefuerzoStore } from './refuerzo';

const fetchMock = vi.fn<typeof fetch>();

function sugerencia(sobrescribir: Partial<SugerenciaRefuerzo> = {}): SugerenciaRefuerzo {
  return {
    actividad_id: 'm3_quiz',
    concepto: 'Señalización RANK-RANKL-OPG',
    modulo: 3,
    seccion: 'm3_2_rankl',
    seccion_titulo: 'La balanza RANKL/OPG',
    url: '/modulo/3?s=m3_2_rankl',
    motivo_tipo: 'atascada',
    motivo: 'Llevas 4 intentos y aún no la completas',
    prioridad: 'alta',
    puntaje: 91,
    ...sobrescribir,
  };
}

function preparar() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'tok-123';
  auth.establecerUsuario(usuarioDePrueba());
  return { auth, store: useRefuerzoStore() };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.useFakeTimers({ toFake: ['Date'] });
});
afterEach(() => vi.useRealTimers());

describe('esRutaInterna', () => {
  it.each(['/modulo/3', '/modulo/3?s=m3_2_rankl', '/modulo/6?s=a-b_c'])('acepta %s', (url) => {
    expect(esRutaInterna(url)).toBe(true);
  });
  it.each([
    'https://evil.example/modulo/3',
    '//evil.example',
    'javascript:alert(1)',
    '/modulo/7',
    '/modulo/3?s=<script>',
    '/otra/ruta',
    '',
    null,
    42,
  ])('rechaza %s', (url) => {
    expect(esRutaInterna(url)).toBe(false);
  });
});

describe('useRefuerzoStore', () => {
  it('pide las sugerencias con el token y las guarda', async () => {
    fetchMock.mockResolvedValue(respuestaJson(200, { sugerencias: [sugerencia()] }));
    const { store } = preparar();
    await store.cargar();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/mentor\/refuerzo$/);
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok-123');
    expect(store.sugerencias).toEqual([sugerencia()]);
    expect(store.error).toBeNull();
    expect(store.cargando).toBe(false);
  });

  it('sin señal la lista queda vacía y no hay error', async () => {
    fetchMock.mockResolvedValue(respuestaJson(200, { sugerencias: [] }));
    const { store } = preparar();
    await store.cargar();
    expect(store.sugerencias).toEqual([]);
    expect(store.error).toBeNull();
  });

  it('descarta las sugerencias con enlaces que no son rutas internas o sin texto', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson(200, {
        sugerencias: [
          sugerencia(),
          sugerencia({ actividad_id: 'a', url: 'https://evil.example/' }),
          sugerencia({ actividad_id: 'b', concepto: '' }),
        ],
      }),
    );
    const { store } = preparar();
    await store.cargar();
    expect(store.sugerencias.map((s) => s.actividad_id)).toEqual(['m3_quiz']);
  });

  it('no repite la petición mientras la respuesta es reciente, salvo con force', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(respuestaJson(200, { sugerencias: [sugerencia()] })),
    );
    const { store } = preparar();
    await store.cargar();
    await store.cargar();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await store.cargar({ force: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.setSystemTime(Date.now() + VIGENCIA_MS + 1);
    await store.cargar();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('peticiones simultáneas comparten una sola llamada', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(respuestaJson(200, { sugerencias: [sugerencia()] })),
    );
    const { store } = preparar();
    await Promise.all([store.cargar(), store.cargar({ force: true }), store.cargar()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sin sesión no pide nada', async () => {
    const { auth, store } = preparar();
    auth.token = null;
    await store.cargar();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un fallo no muestra nada: conserva lo anterior y deja el error aparte', async () => {
    fetchMock.mockResolvedValueOnce(respuestaJson(200, { sugerencias: [sugerencia()] }));
    const { store } = preparar();
    await store.cargar();
    fetchMock.mockResolvedValueOnce(respuestaError(500, 'error_servidor', 'Traceback'));
    await store.cargar({ force: true });
    expect(store.sugerencias).toHaveLength(1);
    expect(store.error).toBe('No se pudieron cargar las sugerencias de refuerzo.');

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await store.cargar({ force: true });
    expect(store.sugerencias).toHaveLength(1);
  });

  it('una respuesta con forma inesperada no rompe nada', async () => {
    fetchMock.mockResolvedValue(respuestaJson(200, { otra: 'cosa' }));
    const { store } = preparar();
    await store.cargar();
    expect(store.sugerencias).toEqual([]);
  });

  it('al cerrar sesión se vacía y una respuesta tardía no reaparece', async () => {
    let resolver!: (r: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((r) => (resolver = r)));
    const { auth, store } = preparar();
    const pendiente = store.cargar();
    auth.logout();
    await nextTick();
    resolver(respuestaJson(200, { sugerencias: [sugerencia()] }));
    await pendiente;
    expect(store.sugerencias).toEqual([]);
    expect(store.cargando).toBe(false);
  });

  it('el estudiante siguiente no ve las sugerencias del anterior', async () => {
    fetchMock.mockResolvedValue(respuestaJson(200, { sugerencias: [sugerencia()] }));
    const { auth, store } = preparar();
    await store.cargar();
    auth.logout();
    await nextTick();
    expect(store.sugerencias).toEqual([]);
  });
});
