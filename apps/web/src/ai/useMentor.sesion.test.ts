/**
 * Conversación guardada y fuentes del curso (F3-05, F3-09, F3-11): los eventos SSE `sesion`,
 * `citas` y `mensaje`, y el `session_id` que se reenvía. Los eventos desconocidos siguen
 * ignorándose (compatibilidad hacia delante).
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { respuestaError, usuarioDePrueba } from '@/test/utils';
import { falloDeApi } from './errores';
import {
  eventoSse,
  respuestaSse,
  sseCitas,
  sseFin,
  sseMensaje,
  sseSesion,
  sseTexto,
  sseUso,
} from './pruebas';
import { leerCitas, useMentor } from './useMentor';

const fetchMock = vi.fn<typeof fetch>();

const CITA = {
  id: 'm3:m3_4_osteocito_sensor:t_dinamica_no_estatica',
  modulo: 3,
  seccion_id: 'm3_4_osteocito_sensor',
  titulo: 'Módulo 3 · El osteocito, un sensor de la carga',
  url: '/modulo/3?s=m3_4_osteocito_sensor',
};

function crear() {
  const auth = useAuthStore();
  auth.token = 'tok-123';
  auth.establecerUsuario(usuarioDePrueba());
  const scope = effectScope();
  return scope.run(() => useMentor())!;
}

const cuerpoEnviado = (n = 0): Record<string, unknown> =>
  JSON.parse(String(fetchMock.mock.calls[n]![1]!.body));

function respuestaCompleta(sesion = 7, extras: string[] = []): Response {
  return respuestaSse([
    sseSesion(sesion),
    sseTexto('Los osteocitos sienten la carga [1].'),
    ...extras,
    sseUso(),
    sseFin(),
  ]);
}

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('useMentor: conversación guardada (sesion)', () => {
  it('la primera petición no lleva session_id; el evento sesion fija el de las siguientes', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaCompleta(7)));
    const mentor = crear();
    expect(mentor.sesionId.value).toBeNull();

    await mentor.enviar('primera');
    expect(cuerpoEnviado(0)).not.toHaveProperty('session_id');
    expect(mentor.sesionId.value).toBe(7);

    await mentor.enviar('segunda');
    expect(cuerpoEnviado(1).session_id).toBe(7);
  });

  it('una nueva conversación olvida la sesión y la siguiente petición abre otra', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaCompleta(7)));
    const mentor = crear();
    await mentor.enviar('primera');
    mentor.limpiar();
    expect(mentor.sesionId.value).toBeNull();
    await mentor.enviar('otra conversación');
    expect(cuerpoEnviado(1)).not.toHaveProperty('session_id');
  });

  it('cerrar sesión (perder el token) también olvida la conversación', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaCompleta(7)));
    const mentor = crear();
    await mentor.enviar('primera');
    useAuthStore().token = null;
    await vi.waitFor(() => expect(mentor.sesionId.value).toBeNull());
  });

  it.each([0, -3, 1.5, '7', null])('ignora un session_id inválido (%j)', async (invalido) => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        respuestaSse([eventoSse('sesion', { session_id: invalido }), sseTexto('ok'), sseFin()]),
      ),
    );
    const mentor = crear();
    await mentor.enviar('hola');
    expect(mentor.sesionId.value).toBeNull();
  });

  it('un reintento tras un error reenvía la misma conversación', async () => {
    fetchMock
      .mockImplementationOnce(() =>
        Promise.resolve(
          respuestaSse([
            sseSesion(9),
            eventoSse('error', { code: 'upstream_error', message: 'x' }),
          ]),
        ),
      )
      .mockImplementationOnce(() => Promise.resolve(respuestaCompleta(9)));
    const mentor = crear();
    await mentor.enviar('hola');
    expect(mentor.sesionId.value).toBe(9);
    await mentor.reintentar();
    expect(cuerpoEnviado(1).session_id).toBe(9);
  });

  it('si el servidor ya no tiene la conversación (404) se olvida y se puede reintentar', async () => {
    fetchMock
      .mockImplementationOnce(() => Promise.resolve(respuestaCompleta(4)))
      .mockImplementationOnce(() =>
        Promise.resolve(respuestaError(404, 'sesion_no_encontrada', 'texto crudo')),
      )
      .mockImplementationOnce(() => Promise.resolve(respuestaCompleta(5)));
    const mentor = crear();
    await mentor.enviar('primera');
    await mentor.enviar('segunda');
    expect(mentor.sesionId.value).toBeNull();
    expect(mentor.error.value).toContain('Esa conversación ya no existe');
    expect(mentor.error.value).not.toContain('texto crudo');
    expect(mentor.puedeReintentar.value).toBe(true);

    await mentor.reintentar();
    expect(cuerpoEnviado(2)).not.toHaveProperty('session_id');
    expect(mentor.sesionId.value).toBe(5);
  });
});

describe('useMentor: fuentes del curso (citas)', () => {
  it('adjunta las citas a la respuesta del mentor', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(respuestaCompleta(7, [sseCitas([CITA]), sseMensaje(31)])),
    );
    const mentor = crear();
    await mentor.enviar('¿Cómo siente el osteocito la carga?');
    const [pregunta, respuesta] = mentor.mensajes.value;
    expect(pregunta!.citas).toBeUndefined();
    expect(respuesta).toMatchObject({ status: 'completo', citas: [CITA], idServidor: 31 });
  });

  it('sin evento citas (o con la lista vacía) el mensaje no tiene fuentes', async () => {
    fetchMock
      .mockImplementationOnce(() => Promise.resolve(respuestaCompleta()))
      .mockImplementationOnce(() => Promise.resolve(respuestaCompleta(7, [sseCitas([])])));
    const mentor = crear();
    await mentor.enviar('a');
    await mentor.enviar('b');
    expect(mentor.mensajes.value[1]!.citas).toBeUndefined();
    expect(mentor.mensajes.value[3]!.citas).toBeUndefined();
  });

  it('las citas de una respuesta no pasan a la siguiente', async () => {
    fetchMock
      .mockImplementationOnce(() => Promise.resolve(respuestaCompleta(7, [sseCitas([CITA])])))
      .mockImplementationOnce(() => Promise.resolve(respuestaCompleta(7)));
    const mentor = crear();
    await mentor.enviar('a');
    await mentor.enviar('b');
    expect(mentor.mensajes.value[1]!.citas).toHaveLength(1);
    expect(mentor.mensajes.value[3]!.citas).toBeUndefined();
  });

  it('un evento desconocido no rompe nada y se ignora', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(respuestaCompleta(7, [eventoSse('futuro', { x: 1 })])),
    );
    const mentor = crear();
    await mentor.enviar('hola');
    expect(mentor.mensajes.value[1]).toMatchObject({ status: 'completo' });
    expect(mentor.error.value).toBeNull();
  });

  it('el historial que se reenvía al servidor no incluye citas ni ids', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(respuestaCompleta(7, [sseCitas([CITA]), sseMensaje(31)])),
    );
    const mentor = crear();
    await mentor.enviar('primera');
    await mentor.enviar('segunda');
    expect(cuerpoEnviado(1).messages).toEqual([
      { role: 'user', content: 'primera' },
      { role: 'assistant', content: 'Los osteocitos sienten la carga [1].' },
      { role: 'user', content: 'segunda' },
    ]);
  });
});

describe('leerCitas', () => {
  it('acepta rutas internas del OVA, con o sin sección', () => {
    const solo = { ...CITA, id: 'm3:glosario:x', seccion_id: null, url: '/modulo/3' };
    expect(leerCitas({ citas: [CITA, solo] })).toEqual([CITA, solo]);
  });

  it.each([
    ['otro origen', 'https://sitio-malo.example/modulo/3'],
    ['sin barra inicial', 'modulo/3'],
    ['esquema javascript', 'javascript:alert(1)'],
    ['protocolo relativo', '//sitio-malo.example/modulo/3'],
    ['ruta que no es de módulo', '/acceso'],
    ['módulo inexistente', '/modulo/9'],
    ['sección con caracteres raros', '/modulo/3?s=<script>'],
    ['parámetro extra', '/modulo/3?s=a&redirect=https://x'],
    ['con retroceso de ruta', '/modulo/3/../../acceso'],
  ])('descarta la cita con una url no permitida: %s', (_nombre, url) => {
    expect(leerCitas({ citas: [{ ...CITA, url }] })).toEqual([]);
  });

  it('descarta entradas mal formadas y conserva las buenas', () => {
    const citas = leerCitas({
      citas: [null, 'x', 3, { id: 1 }, { ...CITA, modulo: '3' }, { ...CITA, titulo: 4 }, CITA],
    });
    expect(citas).toEqual([CITA]);
  });

  it('devuelve una lista vacía si la carga no es la esperada', () => {
    expect(leerCitas(null)).toEqual([]);
    expect(leerCitas({})).toEqual([]);
    expect(leerCitas({ citas: 'x' })).toEqual([]);
  });
});

describe('errores del límite diario', () => {
  it('429 limite_diario: mensaje propio en español, sin reintento', () => {
    const fallo = falloDeApi(new ApiError(429, 'limite_diario', 'texto del servidor'));
    expect(fallo.mensaje).toContain('Hoy ya usaste todos tus mensajes');
    expect(fallo.mensaje).not.toContain('servidor');
    expect(fallo.reintentable).toBe(false);
  });

  it('429 demasiados_intentos conserva su mensaje y se puede reintentar', () => {
    const fallo = falloDeApi(new ApiError(429, 'demasiados_intentos', 'x'));
    expect(fallo.reintentable).toBe(true);
    expect(fallo.mensaje).toContain('muchos mensajes seguidos');
  });

  it('en la conversación, el límite diario se muestra y no ofrece reintentar', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(respuestaError(429, 'limite_diario', 'crudo')),
    );
    const mentor = crear();
    await mentor.enviar('hola');
    expect(mentor.error.value).toContain('Vuelve mañana');
    expect(mentor.puedeReintentar.value).toBe(false);
  });
});
