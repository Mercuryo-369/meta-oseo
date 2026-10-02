import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { simularRutas, verificadoDePrueba } from '@/components/certificado/utilesPrueba';
import { crearRouter } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { respuestaError, respuestaJson, usuarioDePrueba } from '@/test/utils';
import VerificarView from './VerificarView.vue';

let wrappers: VueWrapper[] = [];
const CODIGO = 'OVA-7K3M-9QXA';

async function montar(ruta = `/verify/${CODIGO}`, conSesion = false) {
  const pinia = createPinia();
  setActivePinia(pinia);
  if (conSesion) {
    const auth = useAuthStore();
    auth.token = 'jwt-de-prueba';
    auth.establecerUsuario(usuarioDePrueba());
  }
  const router = crearRouter(createMemoryHistory());
  await router.push(ruta);
  await router.isReady();
  const wrapper = mount(VerificarView, {
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  await flushPromises();
  return { wrapper, router };
}

const porId = (w: VueWrapper, id: string) => w.find(`[data-testid="${id}"]`);
const limite = (segundos?: number) =>
  new Response(
    JSON.stringify({ detail: { code: 'demasiados_intentos', message: 'Demasiadas consultas.' } }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...(segundos !== undefined ? { 'Retry-After': String(segundos) } : {}),
      },
    },
  );

beforeEach(() => {
  wrappers.forEach((w) => w.unmount());
  wrappers = [];
  document.body.innerHTML = '';
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('VerificarView: sin código', () => {
  it('muestra el formulario y no consulta nada', async () => {
    const { fetch } = simularRutas({});
    const { wrapper } = await montar('/verify');
    expect(porId(wrapper, 'campo-codigo').exists()).toBe(true);
    expect(porId(wrapper, 'resultado').text()).toBe('');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('al enviar un código escrito a mano lo normaliza, actualiza la URL y consulta', async () => {
    const { llamadas } = simularRutas({
      [`GET /verify/${CODIGO}`]: () => respuestaJson(200, verificadoDePrueba()),
    });
    const { wrapper, router } = await montar('/verify');

    await porId(wrapper, 'campo-codigo').setValue('  ova 7k3m 9qxa ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.params.codigo).toBe(CODIGO);
    expect(llamadas.map((l) => l.ruta)).toEqual([`/verify/${CODIGO}`]);
    expect(porId(wrapper, 'verificar-valido').exists()).toBe(true);
    expect((porId(wrapper, 'campo-codigo').element as HTMLInputElement).value).toBe(CODIGO);
  });
});

describe('VerificarView: certificado válido', () => {
  it('consulta sin token y muestra nombre, fecha, puntaje e identificación enmascarada', async () => {
    const { llamadas } = simularRutas({
      [`GET /verify/${CODIGO}`]: () => respuestaJson(200, verificadoDePrueba()),
    });
    const { wrapper } = await montar(`/verify/${CODIGO}`, true);

    // Aunque haya sesión, la consulta pública no envía Authorization.
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0]!.headers.has('Authorization')).toBe(false);

    const valido = porId(wrapper, 'verificar-valido');
    expect(valido.text()).toContain('Certificado válido');
    expect(porId(wrapper, 'dato-nombre').text()).toBe('Ana Pérez');
    expect(porId(wrapper, 'dato-identificacion').text()).toContain('*******789');
    expect(porId(wrapper, 'dato-identificacion').text()).toContain('CC');
    expect(porId(wrapper, 'dato-identificacion').text()).toContain('terminada en 789');
    expect(porId(wrapper, 'dato-fecha').text()).toBe('24 de septiembre de 2026');
    expect(porId(wrapper, 'dato-puntaje').text()).toContain('231 puntos');
    expect(porId(wrapper, 'dato-puntaje').text()).toContain('79,1 %');
    expect(porId(wrapper, 'dato-codigo').text()).toBe(CODIGO);
    expect(valido.text()).toContain('últimas 3 cifras');
  });

  it('la identificación no se "completa": solo aparece lo enmascarado que llega del servidor', async () => {
    simularRutas({
      [`GET /verify/${CODIGO}`]: () => respuestaJson(200, verificadoDePrueba()),
    });
    const { wrapper } = await montar(`/verify/${CODIGO}`, true);
    // El número real del usuario de prueba no debe aparecer en ningún sitio.
    expect(wrapper.text()).not.toContain('1023456789');
    // El asterisco del lector de pantalla se sustituye por "terminada en".
    expect(porId(wrapper, 'dato-identificacion').find('[aria-hidden="true"]').text()).toBe(
      '*******789',
    );
  });

  it('sin porcentaje (certificado emitido sin manifiesto) no muestra el porcentaje', async () => {
    simularRutas({
      [`GET /verify/${CODIGO}`]: () => respuestaJson(200, verificadoDePrueba({ porcentaje: null })),
    });
    const { wrapper } = await montar();
    expect(porId(wrapper, 'dato-puntaje').text()).toBe('231 puntos');
    expect(wrapper.text()).not.toContain('null');
  });

  it('normaliza el código de la URL (minúsculas) antes de consultar', async () => {
    const { llamadas } = simularRutas({
      [`GET /verify/${CODIGO}`]: () => respuestaJson(200, verificadoDePrueba()),
    });
    const { wrapper } = await montar('/verify/ova-7k3m-9qxa');
    expect(llamadas[0]!.ruta).toBe(`/verify/${CODIGO}`);
    expect(porId(wrapper, 'verificar-valido').exists()).toBe(true);
  });

  it('muestra el estado de carga y luego mueve el foco al resultado', async () => {
    let resolver: (r: Response) => void = () => {};
    simularRutas({
      [`GET /verify/${CODIGO}`]: () => new Promise<Response>((r) => (resolver = r)),
    });
    const { wrapper } = await montar();
    expect(porId(wrapper, 'verificar-cargando').exists()).toBe(true);
    expect(porId(wrapper, 'verificar-enviar').attributes('disabled')).toBeDefined();

    resolver(respuestaJson(200, verificadoDePrueba()));
    await flushPromises();
    expect(porId(wrapper, 'verificar-cargando').exists()).toBe(false);
    expect(document.activeElement?.tagName).toBe('H2');
    expect(document.activeElement?.textContent).toContain('Certificado válido');
  });
});

describe('VerificarView: no encontrado', () => {
  it('404 muestra un mensaje neutro, sin datos de nadie', async () => {
    simularRutas({
      [`GET /verify/${CODIGO}`]: () =>
        respuestaError(404, 'certificado_no_encontrado', 'No existe'),
    });
    const { wrapper } = await montar();
    const caja = porId(wrapper, 'verificar-no-encontrado');
    expect(caja.text()).toContain('No encontramos ese certificado');
    expect(caja.text()).not.toContain('Ana');
    expect(porId(wrapper, 'verificar-valido').exists()).toBe(false);
    expect(document.activeElement?.tagName).toBe('H2');
  });

  it('un código mal formado ni se envía al servidor y da el mismo mensaje neutro', async () => {
    const { fetch } = simularRutas({});
    const { wrapper } = await montar('/verify/HOLA');
    expect(fetch).not.toHaveBeenCalled();
    expect(porId(wrapper, 'verificar-no-encontrado').text()).toContain(
      'No encontramos ese certificado',
    );
  });

  it('el mensaje del 404 real y del mal formado es idéntico (no se puede sondear)', async () => {
    simularRutas({
      [`GET /verify/${CODIGO}`]: () =>
        respuestaError(404, 'certificado_no_encontrado', 'No existe'),
    });
    const a = (await montar()).wrapper;
    const b = (await montar('/verify/HOLA')).wrapper;
    expect(porId(a, 'verificar-no-encontrado').text()).toBe(
      porId(b, 'verificar-no-encontrado').text(),
    );
  });
});

describe('VerificarView: demasiados intentos (429)', () => {
  it('avisa con cuenta atrás según Retry-After y reactiva Reintentar al terminar', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    let n = 0;
    const { llamadas } = simularRutas({
      [`GET /verify/${CODIGO}`]: () =>
        n++ === 0 ? limite(3) : respuestaJson(200, verificadoDePrueba()),
    });
    const { wrapper } = await montar();

    const caja = porId(wrapper, 'verificar-limite');
    expect(caja.text()).toContain('Demasiadas consultas');
    expect(porId(wrapper, 'verificar-espera').text()).toContain('3 segundos');
    expect(porId(wrapper, 'verificar-reintentar').attributes('disabled')).toBeDefined();
    expect(porId(wrapper, 'verificar-enviar').attributes('disabled')).toBeDefined();

    vi.advanceTimersByTime(1000);
    await nextTick();
    expect(porId(wrapper, 'verificar-espera').text()).toContain('2 segundos');
    vi.advanceTimersByTime(2000);
    await nextTick();
    expect(porId(wrapper, 'verificar-espera').text()).toContain('Ya puedes intentarlo de nuevo');
    expect(porId(wrapper, 'verificar-reintentar').attributes('disabled')).toBeUndefined();

    await porId(wrapper, 'verificar-reintentar').trigger('click');
    await flushPromises();
    expect(llamadas).toHaveLength(2);
    expect(porId(wrapper, 'verificar-valido').exists()).toBe(true);
  });

  it('sin Retry-After usa 30 segundos', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    simularRutas({ [`GET /verify/${CODIGO}`]: () => limite() });
    const { wrapper } = await montar();
    expect(porId(wrapper, 'verificar-espera').text()).toContain('30 segundos');
  });

  it('no se puede enviar el formulario durante la espera', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { llamadas } = simularRutas({ [`GET /verify/${CODIGO}`]: () => limite(60) });
    const { wrapper } = await montar();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(llamadas).toHaveLength(1);
  });
});

describe('VerificarView: errores de red y servidor', () => {
  it('un 500 muestra el mensaje en español y Reintentar vuelve a consultar', async () => {
    let n = 0;
    simularRutas({
      [`GET /verify/${CODIGO}`]: () =>
        n++ === 0 ? respuestaJson(500, {}) : respuestaJson(200, verificadoDePrueba()),
    });
    const { wrapper } = await montar();
    const error = porId(wrapper, 'verificar-error');
    expect(error.attributes('role')).toBe('alert');
    expect(error.text()).toContain('El servidor no está disponible');

    await porId(wrapper, 'verificar-reintentar').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'verificar-valido').exists()).toBe(true);
  });

  it('sin conexión muestra el mensaje de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('sin red')));
    const { wrapper } = await montar();
    expect(porId(wrapper, 'verificar-error').text()).toContain('No hay conexión con el servidor');
  });

  it('un error no cierra la sesión de quien ya la tenía', async () => {
    simularRutas({ [`GET /verify/${CODIGO}`]: () => respuestaError(401, 'token_invalido') });
    await montar(`/verify/${CODIGO}`, true);
    expect(useAuthStore().token).toBe('jwt-de-prueba');
  });
});

describe('VerificarView: accesibilidad', () => {
  it('el campo tiene etiqueta, hay un h1 y el resultado va en una región aria-live', async () => {
    simularRutas({
      [`GET /verify/${CODIGO}`]: () => respuestaJson(200, verificadoDePrueba()),
    });
    const { wrapper } = await montar();
    expect(wrapper.get('label[for="codigo-verificacion"]').text()).toBe('Código de verificación');
    expect(wrapper.get('#codigo-verificacion').attributes('autocapitalize')).toBe('characters');
    expect(wrapper.findAll('h1')).toHaveLength(1);
    expect(porId(wrapper, 'resultado').attributes('aria-live')).toBe('polite');
    // La sección de resultado se nombra con su título.
    const seccion = porId(wrapper, 'verificar-valido');
    expect(document.getElementById(seccion.attributes('aria-labelledby')!)?.textContent).toContain(
      'Certificado válido',
    );
    for (const icono of wrapper.findAll('svg.lucide')) {
      expect(icono.attributes('aria-hidden')).toBe('true');
    }
  });
});
