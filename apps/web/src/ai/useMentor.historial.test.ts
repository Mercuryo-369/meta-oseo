/**
 * Interfaces pendientes del chat (F3-09, F3-11): recuperar la conversación guardada, valorar una
 * respuesta con los pulgares y "Nueva conversación" que borra la sesión en el servidor.
 * Todo contra `fetch` simulado; nada llama a un servidor.
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { respuestaError, respuestaJson, usuarioDePrueba } from '@/test/utils';
import { respuestaSse, sseFin, sseMensaje, sseSesion, sseTexto } from './pruebas';
import { useMentor } from './useMentor';

const fetchMock = vi.fn<typeof fetch>();

const CITA = {
  id: 'm3:m3_4_osteocito_sensor:t_flujo',
  modulo: 3,
  seccion_id: 'm3_4_osteocito_sensor',
  titulo: 'Módulo 3 · El osteocito, un sensor',
  url: '/modulo/3?s=m3_4_osteocito_sensor',
};

function historial(extra: Record<string, unknown> = {}) {
  return {
    session_id: 9,
    messages: [
      {
        id: 1,
        role: 'user',
        content: '¿Qué hace un osteocito?',
        citas: [],
        valoracion: null,
        created_at: '2026-09-25T10:00:00Z',
      },
      {
        id: 2,
        role: 'assistant',
        content: 'Siente la carga mecánica [1].',
        citas: [CITA, { ...CITA, id: 'x', url: 'https://malo.example/' }],
        valoracion: 1,
        created_at: '2026-09-25T10:00:05Z',
      },
    ],
    ...extra,
  };
}

function crear() {
  const auth = useAuthStore();
  auth.token = 'tok-123';
  auth.establecerUsuario(usuarioDePrueba());
  const scope = effectScope();
  return scope.run(() => useMentor())!;
}

function llamadas(fragmento: string) {
  return fetchMock.mock.calls.filter(([url]) => String(url).includes(fragmento));
}

/** Solo las peticiones a POST /api/chat (no al historial, la valoración ni el borrado). */
function llamadasAlChat() {
  return fetchMock.mock.calls.filter(([url]) => /\/chat$/.test(String(url)));
}

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('restaurar: conversación guardada', () => {
  it('trae la conversación más reciente: mensajes, fuentes válidas, valoración y sesión', async () => {
    fetchMock.mockResolvedValue(respuestaJson(200, historial()));
    const m = crear();
    await m.restaurar();

    expect(String(fetchMock.mock.calls[0]![0])).toMatch(/\/chat\/history$/); // sin session_id
    expect(m.estadoHistorial.value).toBe('listo');
    expect(m.sesionId.value).toBe(9);
    expect(m.mensajes.value.map((x) => [x.role, x.status])).toEqual([
      ['user', 'completo'],
      ['assistant', 'completo'],
    ]);
    const respuesta = m.mensajes.value[1]!;
    expect(respuesta.idServidor).toBe(2);
    expect(respuesta.valoracion).toBe(1);
    // Solo sobrevive la fuente con ruta interna.
    expect(respuesta.citas).toEqual([CITA]);
    expect(m.mensajes.value[0]!.idServidor).toBeUndefined();
  });

  it('sin conversaciones (session_id nulo) deja todo vacío y sin error', async () => {
    fetchMock.mockResolvedValue(respuestaJson(200, { session_id: null, messages: [] }));
    const m = crear();
    await m.restaurar();
    expect(m.mensajes.value).toEqual([]);
    expect(m.sesionId.value).toBeNull();
    expect(m.estadoHistorial.value).toBe('listo');
    expect(m.errorHistorial.value).toBeNull();
  });

  it('solo se pide una vez por sesión', async () => {
    fetchMock.mockResolvedValue(respuestaJson(200, historial()));
    const m = crear();
    await m.restaurar();
    await m.restaurar();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('dos llamadas simultáneas hacen una sola petición y no duplican mensajes', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaJson(200, historial())));
    const m = crear();
    await Promise.all([m.restaurar(), m.restaurar()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(m.mensajes.value).toHaveLength(2);
  });

  it('si el estudiante ya escribió mientras llegaba, se descarta el historial (sin duplicar)', async () => {
    let resolver!: (r: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((r) => (resolver = r)));
    const m = crear();
    const pendiente = m.restaurar();

    fetchMock.mockImplementationOnce(() =>
      Promise.resolve(respuestaSse([sseSesion(30), sseTexto('Hola'), sseFin()])),
    );
    await m.enviar('¿Qué es un osteoclasto?');
    resolver(respuestaJson(200, historial()));
    await pendiente;

    expect(m.mensajes.value.map((x) => x.content)).toEqual(['¿Qué es un osteoclasto?', 'Hola']);
    expect(m.sesionId.value).toBe(30);
  });

  it('no pide nada si ya hay mensajes o una sesión abierta', async () => {
    fetchMock.mockResolvedValue(respuestaSse([sseSesion(5), sseTexto('Hola'), sseFin()]));
    const m = crear();
    await m.enviar('hola');
    fetchMock.mockClear();
    await m.restaurar();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(m.estadoHistorial.value).toBe('listo');
  });

  it('un fallo deja un mensaje amable y se puede reintentar', async () => {
    fetchMock.mockResolvedValueOnce(respuestaError(500, 'error_servidor', 'Traceback interno'));
    const m = crear();
    await m.restaurar();
    expect(m.estadoHistorial.value).toBe('error');
    expect(m.errorHistorial.value).toBe('No pudimos recuperar tu conversación anterior.');
    expect(m.errorHistorial.value).not.toContain('Traceback');
    expect(m.errorHistorialReintentable.value).toBe(true);
    expect(m.mensajes.value).toEqual([]);

    fetchMock.mockResolvedValueOnce(respuestaJson(200, historial()));
    await m.restaurar();
    expect(m.estadoHistorial.value).toBe('listo');
    expect(m.errorHistorial.value).toBeNull();
    expect(m.mensajes.value).toHaveLength(2);
  });

  it('sin conexión también es un error legible', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const m = crear();
    await m.restaurar();
    expect(m.estadoHistorial.value).toBe('error');
    expect(m.errorHistorial.value).toBe('No pudimos recuperar tu conversación anterior.');
  });

  it('al cerrar sesión se olvida todo y la siguiente persona vuelve a recuperar la suya', async () => {
    fetchMock.mockResolvedValue(respuestaJson(200, historial()));
    const m = crear();
    await m.restaurar();
    useAuthStore().logout();
    await nextTick();
    expect(m.mensajes.value).toEqual([]);
    expect(m.sesionId.value).toBeNull();
    expect(m.estadoHistorial.value).toBe('pendiente');

    useAuthStore().token = 'otro-token';
    fetchMock.mockResolvedValue(respuestaJson(200, { session_id: null, messages: [] }));
    await m.restaurar();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('lo restaurado se continúa con el mismo session_id', async () => {
    fetchMock.mockResolvedValueOnce(respuestaJson(200, historial()));
    const m = crear();
    await m.restaurar();
    fetchMock.mockResolvedValueOnce(respuestaSse([sseSesion(9), sseTexto('Y más'), sseFin()]));
    await m.enviar('¿Y los osteoclastos?');
    const cuerpo = JSON.parse(String(llamadasAlChat()[0]![1]!.body)) as Record<string, unknown>;
    expect(cuerpo.session_id).toBe(9);
    expect((cuerpo.messages as unknown[]).length).toBe(3);
  });
});

describe('valorar: pulgares', () => {
  async function conRespuesta() {
    fetchMock.mockResolvedValueOnce(
      respuestaSse([sseSesion(4), sseTexto('Respuesta'), sseMensaje(88), sseFin()]),
    );
    const m = crear();
    await m.enviar('hola');
    return { m, respuesta: m.mensajes.value[1]! };
  }

  it('envía 1 y muestra el voto; repetirlo lo retira con 0; el otro pulgar lo cambia', async () => {
    const { m, respuesta } = await conRespuesta();
    fetchMock.mockImplementation((_url, init) => {
      const cuerpo = JSON.parse(String(init?.body)) as { message_id: number; valor: number };
      return Promise.resolve(
        respuestaJson(200, { message_id: cuerpo.message_id, valor: cuerpo.valor || null }),
      );
    });
    await m.valorar(respuesta.id, 1);
    expect(respuesta.valoracion).toBe(1);
    expect(JSON.parse(String(llamadas('/chat/feedback')[0]![1]!.body))).toEqual({
      message_id: 88,
      valor: 1,
    });

    await m.valorar(respuesta.id, 1); // mismo voto: se retira
    expect(respuesta.valoracion).toBeNull();
    expect(JSON.parse(String(llamadas('/chat/feedback')[1]![1]!.body)).valor).toBe(0);

    await m.valorar(respuesta.id, -1);
    await m.valorar(respuesta.id, 1); // cambiar de opinión
    expect(respuesta.valoracion).toBe(1);
    expect(JSON.parse(String(llamadas('/chat/feedback')[3]![1]!.body)).valor).toBe(1);
    expect(respuesta.valorando).toBe(false);
  });

  it('el voto se ve al instante y no admite un segundo mientras viaja', async () => {
    const { m, respuesta } = await conRespuesta();
    let resolver!: (r: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (resolver = r)));
    const primero = m.valorar(respuesta.id, -1);
    expect(respuesta.valoracion).toBe(-1); // optimista
    expect(respuesta.valorando).toBe(true);
    await m.valorar(respuesta.id, 1); // ignorado
    expect(llamadas('/chat/feedback')).toHaveLength(1);
    resolver(respuestaJson(200, { message_id: 88, valor: -1 }));
    await primero;
    expect(respuesta.valoracion).toBe(-1);
    expect(respuesta.valorando).toBe(false);
  });

  it('si el servidor falla, el voto vuelve a como estaba y se explica sin texto técnico', async () => {
    const { m, respuesta } = await conRespuesta();
    fetchMock.mockResolvedValue(respuestaError(500, 'error_servidor', 'Traceback'));
    await m.valorar(respuesta.id, 1);
    expect(respuesta.valoracion).toBeNull();
    expect(respuesta.errorValoracion).toBe('No se pudo guardar tu valoración. Inténtalo de nuevo.');
    expect(respuesta.valorando).toBe(false);

    // Un voto posterior que sí funciona limpia el aviso.
    fetchMock.mockResolvedValue(respuestaJson(200, { message_id: 88, valor: 1 }));
    await m.valorar(respuesta.id, 1);
    expect(respuesta.errorValoracion).toBeNull();
    expect(respuesta.valoracion).toBe(1);
  });

  it('sin conexión el aviso lo dice', async () => {
    const { m, respuesta } = await conRespuesta();
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await m.valorar(respuesta.id, -1);
    expect(respuesta.errorValoracion).toBe('No se pudo guardar tu valoración: sin conexión.');
  });

  it('una respuesta sin id del servidor o un mensaje del estudiante no se valoran', async () => {
    fetchMock.mockResolvedValueOnce(respuestaSse([sseTexto('Sin evento mensaje'), sseFin()]));
    const m = crear();
    await m.enviar('hola');
    fetchMock.mockClear();
    await m.valorar(m.mensajes.value[1]!.id, 1);
    await m.valorar(m.mensajes.value[0]!.id, 1);
    await m.valorar('no-existe', 1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('la valoración de una respuesta restaurada se cambia igual', async () => {
    fetchMock.mockResolvedValueOnce(respuestaJson(200, historial()));
    const m = crear();
    await m.restaurar();
    fetchMock.mockResolvedValueOnce(respuestaJson(200, { message_id: 2, valor: -1 }));
    await m.valorar(m.mensajes.value[1]!.id, -1);
    expect(m.mensajes.value[1]!.valoracion).toBe(-1);
  });
});

describe('nuevaConversacion: borra la sesión', () => {
  async function conSesion() {
    fetchMock.mockResolvedValueOnce(respuestaSse([sseSesion(12), sseTexto('Hola'), sseFin()]));
    const m = crear();
    await m.enviar('hola');
    fetchMock.mockClear();
    return m;
  }

  it('llama a DELETE /chat/session con la sesión y vacía la pantalla', async () => {
    const m = await conSesion();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await m.nuevaConversacion()).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/chat\/session\?session_id=12$/);
    expect(init?.method).toBe('DELETE');
    expect(m.mensajes.value).toEqual([]);
    expect(m.sesionId.value).toBeNull();
    expect(m.borrando.value).toBe(false);
    expect(m.errorBorrado.value).toBeNull();
  });

  it('la siguiente pregunta abre una conversación distinta (sin session_id)', async () => {
    const m = await conSesion();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await m.nuevaConversacion();
    fetchMock.mockResolvedValueOnce(respuestaSse([sseSesion(13), sseTexto('Otra'), sseFin()]));
    await m.enviar('¿y ahora?');
    const cuerpo = JSON.parse(String(llamadasAlChat()[0]![1]!.body)) as Record<string, unknown>;
    expect(cuerpo).not.toHaveProperty('session_id');
    expect(m.sesionId.value).toBe(13);
  });

  it('si la conversación ya no existía (404), igual queda limpia', async () => {
    const m = await conSesion();
    fetchMock.mockResolvedValue(respuestaError(404, 'sesion_no_encontrada'));
    expect(await m.nuevaConversacion()).toBe(true);
    expect(m.mensajes.value).toEqual([]);
  });

  it('si el borrado falla, conserva la conversación y lo explica', async () => {
    const m = await conSesion();
    fetchMock.mockResolvedValue(respuestaError(500, 'error_servidor', 'Traceback'));
    expect(await m.nuevaConversacion()).toBe(false);
    expect(m.mensajes.value).toHaveLength(2);
    expect(m.sesionId.value).toBe(12);
    expect(m.errorBorrado.value).toBe('No se pudo borrar la conversación. Inténtalo de nuevo.');
    expect(m.borrando.value).toBe(false);

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await m.nuevaConversacion();
    expect(m.errorBorrado.value).toContain('La conversación no se borró.');

    // Reintentar con éxito limpia el aviso.
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await m.nuevaConversacion()).toBe(true);
    expect(m.errorBorrado.value).toBeNull();
  });

  it('sin conversación guardada solo limpia, sin llamar al servidor', async () => {
    const m = crear();
    fetchMock.mockClear();
    expect(await m.nuevaConversacion()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('detiene la respuesta en curso antes de borrar', async () => {
    fetchMock.mockImplementationOnce((_url, init) => {
      return new Promise<Response>((_r, rechazar) => {
        init?.signal?.addEventListener('abort', () =>
          rechazar(new DOMException('abortado', 'AbortError')),
        );
      });
    });
    const m = crear();
    void m.enviar('hola');
    await nextTick();
    // Aún sin evento `sesion`: no hay nada que borrar en el servidor.
    expect(await m.nuevaConversacion()).toBe(true);
    expect(m.ocupado.value).toBe(false);
    expect(m.mensajes.value).toEqual([]);
  });
});
