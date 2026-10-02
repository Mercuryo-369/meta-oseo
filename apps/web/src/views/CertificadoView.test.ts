import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import {
  estadoElegible,
  estadoEmitido,
  estadoNoElegible,
  resumenDePrueba,
  simularRutas,
} from '@/components/certificado/utilesPrueba';
import type { LlamadaSimulada } from '@/components/certificado/utilesPrueba';
import { crearRouter } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { respuestaError, respuestaJson, usuarioDePrueba } from '@/test/utils';
import CertificadoView from './CertificadoView.vue';

let wrappers: VueWrapper[] = [];

async function montar() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'jwt-de-prueba';
  auth.establecerUsuario(usuarioDePrueba());
  const router = crearRouter(createMemoryHistory());
  await router.push('/certificado');
  await router.isReady();
  const wrapper = mount(CertificadoView, {
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  await flushPromises();
  return { wrapper, router };
}

const porId = (w: VueWrapper, id: string) => w.find(`[data-testid="${id}"]`);

/** Un `fetch` que solo responde `GET /certificate/status` (y lo que se agregue). */
function apiConEstado(
  estado: unknown,
  extra: Record<string, (llamada: LlamadaSimulada) => Response | Promise<Response>> = {},
) {
  return simularRutas({
    'GET /certificate/status': () => respuestaJson(200, estado),
    ...extra,
  });
}

function movimientoReducido(reducido: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (consulta: string): MediaQueryList =>
      ({
        matches: reducido && consulta.includes('prefers-reduced-motion: reduce'),
        media: consulta,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
        onchange: null,
      }) as MediaQueryList,
  );
}

beforeEach(() => {
  wrappers.forEach((w) => w.unmount());
  wrappers = [];
  document.body.innerHTML = '';
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CertificadoView: carga y errores', () => {
  it('muestra el estado de carga mientras espera al servidor', async () => {
    let resolver: (r: Response) => void = () => {};
    simularRutas({
      'GET /certificate/status': () => new Promise<Response>((r) => (resolver = r)),
    });
    const { wrapper } = await montar();
    const cargando = porId(wrapper, 'cert-cargando');
    expect(cargando.exists()).toBe(true);
    expect(cargando.attributes('role')).toBe('status');
    expect(cargando.text()).toContain('Consultando tu certificado');

    resolver(respuestaJson(200, estadoNoElegible()));
    await flushPromises();
    expect(porId(wrapper, 'cert-cargando').exists()).toBe(false);
    expect(porId(wrapper, 'cert-no-elegible').exists()).toBe(true);
  });

  it('un error del servidor se dice en español, con alert y botón Reintentar que funciona', async () => {
    let intento = 0;
    apiConEstado(null, {
      'GET /certificate/status': () =>
        intento++ === 0 ? respuestaJson(500, {}) : respuestaJson(200, estadoNoElegible()),
    });
    const { wrapper } = await montar();
    const error = porId(wrapper, 'cert-error');
    expect(error.attributes('role')).toBe('alert');
    expect(error.text()).toContain('El servidor no está disponible');

    await porId(wrapper, 'cert-reintentar').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'cert-error').exists()).toBe(false);
    expect(porId(wrapper, 'cert-no-elegible').exists()).toBe(true);
  });

  it('sin conexión muestra el mensaje de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('sin red')));
    const { wrapper } = await montar();
    expect(porId(wrapper, 'cert-error').text()).toContain('No hay conexión con el servidor');
  });
});

describe('CertificadoView: no elegible', () => {
  it('muestra el avance de módulos, el puntaje frente al umbral y qué falta', async () => {
    apiConEstado(estadoNoElegible());
    const { wrapper } = await montar();

    const anillo = porId(wrapper, 'anillo-progreso');
    expect(anillo.attributes('role')).toBe('progressbar');
    expect(anillo.attributes('aria-valuenow')).toBe('3');
    expect(anillo.attributes('aria-valuemax')).toBe('6');
    expect(anillo.attributes('aria-valuetext')).toBe('3 de 6 módulos');

    const barra = wrapper.get('[data-testid="barra-puntaje"] [role="progressbar"]');
    expect(barra.attributes('aria-valuenow')).toBe('39.5');
    expect(barra.attributes('aria-valuetext')).toContain('39,5 %');
    expect(barra.attributes('aria-valuetext')).toContain('70 %');

    expect(porId(wrapper, 'puntaje-obligatorias').text()).toContain('190 puntos de 480 puntos');
    expect(porId(wrapper, 'puntos-faltantes').text()).toContain('146 puntos');
    expect(porId(wrapper, 'motivos').findAll('li')).toHaveLength(2);
    expect(porId(wrapper, 'motivos').text()).toContain(
      'Faltan por completar los módulos 4, 5 y 6.',
    );
    expect(porId(wrapper, 'obtener-certificado').exists()).toBe(false);
  });

  it('enlaza a cada módulo pendiente y no a los completados; el estado se dice con texto', async () => {
    apiConEstado(estadoNoElegible());
    const { wrapper } = await montar();

    for (const n of [4, 5, 6]) {
      const fila = porId(wrapper, `requisito-modulo-${n}`);
      expect(fila.get('a').attributes('href')).toBe(`/modulo/${n}`);
      expect(fila.text()).toContain('Pendiente');
    }
    for (const n of [1, 2, 3]) {
      const fila = porId(wrapper, `requisito-modulo-${n}`);
      expect(fila.find('a').exists()).toBe(false);
      expect(fila.text()).toContain('Completado');
    }
  });

  it('explica qué puntos cuentan', async () => {
    apiConEstado(estadoNoElegible());
    const { wrapper } = await montar();
    const explicacion = porId(wrapper, 'explicacion');
    expect(explicacion.text()).toContain('¿Qué puntos cuentan?');
    expect(explicacion.text()).toContain('obligatorias');
    expect(explicacion.text()).toContain('opcionales');
    expect(explicacion.text()).toContain('210 puntos');
  });

  it('sin manifiesto (puntajes nulos) solo exige completar los módulos', async () => {
    apiConEstado(
      estadoNoElegible({
        puntaje_obligatorias: null,
        puntaje_maximo: null,
        porcentaje: null,
        umbral: null,
        puntos_faltantes: null,
        motivos: ['Faltan por completar los módulos 4, 5 y 6.'],
      }),
    );
    const { wrapper } = await montar();
    expect(porId(wrapper, 'sin-puntaje-minimo').exists()).toBe(true);
    expect(porId(wrapper, 'barra-puntaje').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('NaN');
    expect(wrapper.text()).not.toContain('null');
  });

  it('con el puntaje ya alcanzado pero módulos pendientes no pide más puntos', async () => {
    apiConEstado(
      estadoNoElegible({ porcentaje: 80, puntos_faltantes: 0, puntaje_obligatorias: 384 }),
    );
    const { wrapper } = await montar();
    expect(porId(wrapper, 'puntos-faltantes').exists()).toBe(false);
    expect(wrapper.text()).toContain('Ya alcanzaste el mínimo');
  });
});

describe('CertificadoView: elegible y emisión', () => {
  it('ofrece "Obtener mi certificado" y al emitirlo (201) muestra la tarjeta y celebra', async () => {
    movimientoReducido(false);
    const { llamadas } = apiConEstado(estadoElegible(), {
      'POST /certificate': () =>
        respuestaJson(201, { certificado: resumenDePrueba(), nuevo: true }),
    });
    const { wrapper } = await montar();

    const boton = porId(wrapper, 'obtener-certificado');
    expect(boton.text()).toBe('Obtener mi certificado');
    await boton.trigger('click');
    await flushPromises();

    expect(llamadas.filter((l) => l.metodo === 'POST')).toHaveLength(1);
    expect(porId(wrapper, 'cert-emitido').exists()).toBe(true);
    expect(porId(wrapper, 'obtener-certificado').exists()).toBe(false);
    expect(porId(wrapper, 'tarjeta-nombre').text()).toBe('Ana Pérez');
    expect(porId(wrapper, 'tarjeta-codigo').text()).toBe('OVA-7K3M-9QXA');
    expect(porId(wrapper, 'tarjeta-fecha').text()).toBe('24 de septiembre de 2026');
    expect(porId(wrapper, 'tarjeta-puntaje').text()).toContain('231 puntos');
    expect(porId(wrapper, 'tarjeta-puntaje').text()).toContain('79,1 %');
    expect(wrapper.text()).toContain('¡Felicitaciones, obtuviste tu certificado!');
    expect(porId(wrapper, 'celebracion').exists()).toBe(true);
    expect(porId(wrapper, 'celebracion').attributes('aria-hidden')).toBe('true');
    // El foco pasa al título del resultado para quien usa lector de pantalla.
    expect(document.activeElement?.tagName).toBe('H2');
    expect(document.activeElement?.textContent).toContain('Felicitaciones');
  });

  it('con movimiento reducido no dibuja la celebración y todo sigue funcionando', async () => {
    movimientoReducido(true);
    apiConEstado(estadoElegible(), {
      'POST /certificate': () =>
        respuestaJson(201, { certificado: resumenDePrueba(), nuevo: true }),
    });
    const { wrapper } = await montar();
    await porId(wrapper, 'obtener-certificado').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'celebracion').exists()).toBe(false);
    expect(porId(wrapper, 'tarjeta-codigo').exists()).toBe(true);
  });

  it('el 200 idempotente (nuevo: false) muestra el certificado sin celebrar', async () => {
    movimientoReducido(false);
    apiConEstado(estadoElegible(), {
      'POST /certificate': () =>
        respuestaJson(200, { certificado: resumenDePrueba(), nuevo: false }),
    });
    const { wrapper } = await montar();
    await porId(wrapper, 'obtener-certificado').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'tarjeta-codigo').text()).toBe('OVA-7K3M-9QXA');
    expect(porId(wrapper, 'celebracion').exists()).toBe(false);
    expect(wrapper.text()).toContain('Tu certificado está emitido');
    expect(wrapper.text()).not.toContain('Felicitaciones');
  });

  it('deshabilita el botón mientras emite (sin doble emisión)', async () => {
    let resolver: (r: Response) => void = () => {};
    const { llamadas } = apiConEstado(estadoElegible(), {
      'POST /certificate': () => new Promise<Response>((r) => (resolver = r)),
    });
    const { wrapper } = await montar();
    const boton = porId(wrapper, 'obtener-certificado');
    await boton.trigger('click');
    await boton.trigger('click');
    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.attributes('aria-busy')).toBe('true');
    expect(boton.text()).toBe('Emitiendo…');
    expect(llamadas.filter((l) => l.metodo === 'POST')).toHaveLength(1);

    resolver(respuestaJson(201, { certificado: resumenDePrueba(), nuevo: true }));
    await flushPromises();
    expect(porId(wrapper, 'cert-emitido').exists()).toBe(true);
  });

  it('409 certificado_no_elegible muestra los motivos y vuelve a leer el estado', async () => {
    let lecturas = 0;
    apiConEstado(null, {
      'GET /certificate/status': () =>
        respuestaJson(200, lecturas++ === 0 ? estadoElegible() : estadoNoElegible()),
      'POST /certificate': () =>
        respuestaJson(409, {
          detail: {
            code: 'certificado_no_elegible',
            message: 'No cumples los requisitos.',
            motivos: ['Faltan por completar los módulos 4, 5 y 6.'],
          },
        }),
    });
    const { wrapper } = await montar();
    await porId(wrapper, 'obtener-certificado').trigger('click');
    await flushPromises();

    const alerta = porId(wrapper, 'error-emision');
    expect(alerta.attributes('role')).toBe('alert');
    expect(alerta.text()).toContain('Todavía no cumples los requisitos');
    expect(alerta.text()).toContain('Faltan por completar los módulos 4, 5 y 6.');
    expect(lecturas).toBe(2);
    expect(porId(wrapper, 'cert-no-elegible').exists()).toBe(true);
  });

  it('otro error al emitir se muestra y permite reintentar', async () => {
    let n = 0;
    apiConEstado(estadoElegible(), {
      'POST /certificate': () =>
        n++ === 0
          ? respuestaError(500, 'error_servidor', 'Falla temporal del servidor.')
          : respuestaJson(201, { certificado: resumenDePrueba(), nuevo: true }),
    });
    const { wrapper } = await montar();
    await porId(wrapper, 'obtener-certificado').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'error-emision').text()).toContain('Falla temporal del servidor.');
    expect(porId(wrapper, 'obtener-certificado').attributes('disabled')).toBeUndefined();

    await porId(wrapper, 'obtener-certificado').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'cert-emitido').exists()).toBe(true);
    expect(porId(wrapper, 'error-emision').exists()).toBe(false);
  });
});

describe('CertificadoView: certificado emitido', () => {
  const pdf = () =>
    new Response(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="certificado_OVA-7K3M-9QXA.pdf"',
      },
    });

  let descargas: Array<{ nombre: string; href: string }>;
  let crear: ReturnType<typeof vi.fn>;
  let originales: { c: typeof URL.createObjectURL; r: typeof URL.revokeObjectURL };

  beforeEach(() => {
    descargas = [];
    crear = vi.fn(() => 'blob:certificado');
    originales = { c: URL.createObjectURL, r: URL.revokeObjectURL };
    URL.createObjectURL = crear as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      descargas.push({ nombre: this.download, href: this.href });
    });
  });

  afterEach(() => {
    URL.createObjectURL = originales.c;
    URL.revokeObjectURL = originales.r;
  });

  it('abre directo la tarjeta si ya estaba emitido, sin celebración', async () => {
    movimientoReducido(false);
    apiConEstado(estadoEmitido());
    const { wrapper } = await montar();
    expect(porId(wrapper, 'cert-emitido').exists()).toBe(true);
    expect(porId(wrapper, 'celebracion').exists()).toBe(false);
    expect(porId(wrapper, 'tarjeta-codigo').text()).toBe('OVA-7K3M-9QXA');
  });

  it('descarga el PDF con Authorization y lo guarda con el nombre del servidor', async () => {
    const { llamadas } = apiConEstado(estadoEmitido(), { 'GET /certificate/pdf': pdf });
    const { wrapper } = await montar();

    await porId(wrapper, 'descargar-pdf').trigger('click');
    await flushPromises();

    const llamada = llamadas.find((l) => l.ruta === '/certificate/pdf')!;
    expect(llamada.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
    expect(crear).toHaveBeenCalledTimes(1);
    const blob = crear.mock.calls[0]![0] as Blob;
    expect(blob.type).toBe('application/pdf');
    expect(descargas).toEqual([
      { nombre: 'certificado_OVA-7K3M-9QXA.pdf', href: 'blob:certificado' },
    ]);
    const aviso = porId(wrapper, 'aviso-descarga');
    expect(aviso.attributes('role')).toBe('status');
    expect(aviso.text()).toContain('certificado_OVA-7K3M-9QXA.pdf');
    expect(porId(wrapper, 'error-descarga').exists()).toBe(false);
  });

  it('mientras descarga el botón queda deshabilitado', async () => {
    let resolver: (r: Response) => void = () => {};
    const { llamadas } = apiConEstado(estadoEmitido(), {
      'GET /certificate/pdf': () => new Promise<Response>((r) => (resolver = r)),
    });
    const { wrapper } = await montar();
    const boton = porId(wrapper, 'descargar-pdf');
    await boton.trigger('click');
    await boton.trigger('click');
    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.text()).toContain('Preparando el PDF');
    expect(llamadas.filter((l) => l.ruta === '/certificate/pdf')).toHaveLength(1);
    resolver(pdf());
    await flushPromises();
    expect(boton.attributes('disabled')).toBeUndefined();
  });

  it('errores de descarga (404, 429, red) se muestran en español con alert', async () => {
    const respuestas = [
      respuestaError(404, 'certificado_no_emitido', 'Aún no has emitido tu certificado.'),
      respuestaError(429, 'demasiados_intentos', 'Demasiadas descargas. Espera un minuto.'),
    ];
    apiConEstado(estadoEmitido(), {
      'GET /certificate/pdf': () => respuestas.shift() ?? pdf(),
    });
    const { wrapper } = await montar();

    await porId(wrapper, 'descargar-pdf').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'error-descarga').attributes('role')).toBe('alert');
    expect(porId(wrapper, 'error-descarga').text()).toBe('Aún no has emitido tu certificado.');

    await porId(wrapper, 'descargar-pdf').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'error-descarga').text()).toContain('Espera un minuto');
    expect(descargas).toHaveLength(0);

    // Tras el error se puede volver a intentar y el aviso de error desaparece.
    await porId(wrapper, 'descargar-pdf').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'error-descarga').exists()).toBe(false);
    expect(descargas).toHaveLength(1);
  });

  it('muestra el enlace público de verificación y lo copia al portapapeles', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: escribir } });
    apiConEstado(estadoEmitido());
    const { wrapper } = await montar();

    const esperado = `${window.location.origin}/verify/OVA-7K3M-9QXA`;
    const campo = porId(wrapper, 'enlace-verificacion');
    expect((campo.element as HTMLInputElement).value).toBe(esperado);
    expect(campo.attributes('readonly')).toBeDefined();
    expect(wrapper.get('label[for="enlace-verificacion"]').text()).toContain('Enlace público');

    await porId(wrapper, 'copiar-enlace').trigger('click');
    await flushPromises();
    expect(escribir).toHaveBeenCalledWith(esperado);
    expect(porId(wrapper, 'aviso-enlace').text()).toBe('Enlace copiado.');
    expect(porId(wrapper, 'aviso-enlace').attributes('role')).toBe('status');
  });

  it('si el portapapeles falla lo dice y deja el enlace seleccionado', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denegado')) },
    });
    apiConEstado(estadoEmitido());
    const { wrapper } = await montar();
    await porId(wrapper, 'copiar-enlace').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'error-enlace').attributes('role')).toBe('alert');
    expect(porId(wrapper, 'error-enlace').text()).toContain('No pudimos copiar');
    expect(document.activeElement).toBe(porId(wrapper, 'enlace-verificacion').element);
  });

  it('ofrece Compartir solo si el navegador tiene Web Share y lo usa con el enlace', async () => {
    apiConEstado(estadoEmitido());
    vi.stubGlobal('navigator', { ...navigator, share: undefined });
    let { wrapper } = await montar();
    expect(porId(wrapper, 'compartir').exists()).toBe(false);
    wrapper.unmount();

    const compartir = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share: compartir });
    ({ wrapper } = await montar());
    await porId(wrapper, 'compartir').trigger('click');
    await flushPromises();
    expect(compartir).toHaveBeenCalledTimes(1);
    expect(compartir.mock.calls[0]![0].url).toBe(`${window.location.origin}/verify/OVA-7K3M-9QXA`);
  });

  it('cancelar el cuadro de compartir no es un error; otro fallo sí se avisa', async () => {
    const compartir = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('cancelado', 'AbortError'))
      .mockRejectedValueOnce(new Error('falla'));
    vi.stubGlobal('navigator', { ...navigator, share: compartir });
    apiConEstado(estadoEmitido());
    const { wrapper } = await montar();

    await porId(wrapper, 'compartir').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'error-enlace').exists()).toBe(false);

    await porId(wrapper, 'compartir').trigger('click');
    await flushPromises();
    expect(porId(wrapper, 'error-enlace').exists()).toBe(true);
  });
});

describe('CertificadoView: accesibilidad básica', () => {
  it('un solo h1, controles con nombre accesible y barras de progreso con nombre', async () => {
    apiConEstado(estadoNoElegible());
    const { wrapper } = await montar();
    expect(wrapper.findAll('h1')).toHaveLength(1);
    for (const boton of wrapper.findAll('button')) {
      expect(boton.text().length).toBeGreaterThan(0);
    }
    for (const barra of wrapper.findAll('[role="progressbar"]')) {
      expect(barra.attributes('aria-labelledby')).toBeTruthy();
      const nombre = document.getElementById(barra.attributes('aria-labelledby')!);
      expect(nombre?.textContent?.trim().length).toBeGreaterThan(0);
      expect(barra.attributes('aria-valuetext')).toBeTruthy();
    }
    // Los iconos son decorativos.
    for (const icono of wrapper.findAll('svg.lucide')) {
      expect(icono.attributes('aria-hidden')).toBe('true');
    }
  });

  it('en el estado emitido el campo del enlace tiene etiqueta y los botones nombre', async () => {
    apiConEstado(estadoEmitido());
    const { wrapper } = await montar();
    expect(wrapper.findAll('h1')).toHaveLength(1);
    expect(wrapper.find('#enlace-verificacion').exists()).toBe(true);
    expect(wrapper.find('label[for="enlace-verificacion"]').exists()).toBe(true);
    for (const boton of wrapper.findAll('button')) {
      expect(boton.text().length).toBeGreaterThan(0);
    }
  });
});
