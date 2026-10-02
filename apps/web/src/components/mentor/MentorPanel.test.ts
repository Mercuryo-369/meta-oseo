/**
 * Pruebas del panel del mentor con streams simulados (no hace falta backend).
 * AppShell.test.ts sustituye MentorPanel por un stub a propósito; aquí se prueba el real.
 *
 * La segunda capa de seguridad (DOMPurify) se sustituye por una función identidad con espía
 * porque DOMPurify no funciona bajo happy-dom (ver src/ai/sanitizar.test.ts); la primera capa
 * (markdown-it sin HTML crudo) es la real y es la que se ejercita en las pruebas de XSS.
 */
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { sanitizarHtml } from '@/ai/sanitizar';
import type { FlujoControlable } from '@/ai/pruebas';
import { flujoControlable, respuestaSse, sseError, sseFin, sseTexto } from '@/ai/pruebas';
import { useAuthStore } from '@/stores/auth';
import { respuestaError, respuestaJson, usuarioDePrueba } from '@/test/utils';
import MentorPanel from './MentorPanel.vue';

vi.mock('@/ai/sanitizar', () => ({ sanitizarHtml: vi.fn((html: string) => html) }));

/** Solo el chat (POST /api/chat) llega a este mock; las demás llamadas del panel se responden abajo. */
const fetchMock = vi.fn<typeof fetch>();

/**
 * Enrutador de `fetch`: el panel también pide el historial guardado y las sugerencias de refuerzo
 * al abrirse. Aquí devuelven "nada" para que estas pruebas (que tratan del chat) sigan viendo en
 * `fetchMock` solo las llamadas al chat. Las pruebas de esas funciones están en
 * `MentorPanel.funciones.test.ts`.
 */
const fetchEnrutado: typeof fetch = (entrada, init) => {
  const url = String(entrada);
  if (url.includes('/chat/history')) {
    return Promise.resolve(respuestaJson(200, { session_id: null, messages: [] }));
  }
  if (url.includes('/mentor/refuerzo'))
    return Promise.resolve(respuestaJson(200, { sugerencias: [] }));
  return fetchMock(entrada, init);
};
let wrapper: VueWrapper | undefined;

type Pantalla = 'movil' | 'escritorio';

/** Simula el ancho de pantalla y si el puntero es táctil (matchMedia). */
function simularPantalla(pantalla: Pantalla, tactil = false): void {
  vi.spyOn(window, 'matchMedia').mockImplementation((consulta: string) => {
    const minimo = /min-width:\s*(\d+)px/.exec(consulta);
    let coincide = false;
    if (minimo) coincide = (pantalla === 'escritorio' ? 1280 : 390) >= Number(minimo[1]);
    else if (consulta.includes('pointer: coarse')) coincide = tactil;
    return {
      matches: coincide,
      media: consulta,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  });
}

function montar(pantalla: Pantalla = 'escritorio', tactil = false) {
  simularPantalla(pantalla, tactil);
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'tok-123';
  auth.establecerUsuario(usuarioDePrueba());
  wrapper = mount(MentorPanel, { global: { plugins: [pinia] }, attachTo: document.body });
  return { auth };
}

/** El contenido de la hoja va en un portal (fuera del árbol del componente). */
const q = <T extends Element = HTMLElement>(selector: string) =>
  document.body.querySelector<T>(selector);
const qa = (selector: string) => Array.from(document.body.querySelectorAll<HTMLElement>(selector));
const porId = (id: string) => q(`[data-testid="${id}"]`);
const campo = () => q<HTMLTextAreaElement>('[data-testid="mentor-campo"]')!;

async function abrir(): Promise<void> {
  await wrapper!.get('[data-testid="mentor-abrir"]').trigger('click');
  await flushPromises();
  await nextTick();
}

async function escribir(texto: string): Promise<void> {
  const el = campo();
  el.value = texto;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
}

async function teclear(opciones: KeyboardEventInit): Promise<KeyboardEvent> {
  const evento = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...opciones });
  campo().dispatchEvent(evento);
  await flushPromises();
  return evento;
}

async function escape(): Promise<void> {
  const destino = document.activeElement ?? document.body;
  destino.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await flushPromises();
}

/** Prepara fetch con un stream controlable y devuelve un acceso a él. */
function flujoManual() {
  const estado: { flujo?: FlujoControlable } = {};
  fetchMock.mockImplementation((_url, init) => {
    estado.flujo = flujoControlable(init?.signal);
    return Promise.resolve(estado.flujo.respuesta);
  });
  return estado;
}

function cuerpoEnviado(n = 0): { messages: { role: string; content: string }[] } {
  return JSON.parse(String(fetchMock.mock.calls[n]![1]!.body));
}

const mensajes = () => qa('[data-testid="mentor-mensaje"]');

/** Avisos de Vue o de reka-ui (título/descripción ausentes...) durante la prueba. */
let avisos: MockInstance[] = [];

beforeEach(() => {
  avisos = [vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')];
  for (const espia of avisos) espia.mockImplementation(() => undefined);
  document.body.innerHTML = '';
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchEnrutado);
  vi.mocked(sanitizarHtml).mockClear();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = '';
  // Ninguna prueba debe producir avisos de Vue ni de reka-ui (accesibilidad de la hoja).
  const emitidos = avisos.flatMap((espia) => espia.mock.calls.map((llamada) => String(llamada[0])));
  expect(emitidos).toEqual([]);
});

describe('MentorPanel: apertura y estado vacío', () => {
  it('muestra solo el botón flotante hasta que se abre', () => {
    montar();
    const boton = wrapper!.get('[data-testid="mentor-abrir"]');
    expect(boton.text()).toContain('Abrir al mentor de IA');
    expect(boton.attributes('aria-expanded')).toBe('false');
    expect(porId('mentor-panel')).toBeNull();
  });

  it('al abrir: título, tres preguntas de ejemplo, aviso de IA y campo etiquetado', async () => {
    montar();
    await abrir();
    const panel = porId('mentor-panel')!;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.textContent).toContain('Mentor de IA');
    expect(qa('[data-testid="mentor-ejemplo"]')).toHaveLength(3);
    expect(panel.textContent).toContain(
      'Respuestas generadas por IA. Verifica con el material del curso.',
    );
    // El campo tiene etiqueta accesible y la hoja está descrita.
    const etiqueta = q<HTMLLabelElement>(`label[for="${campo().id}"]`);
    expect(etiqueta?.textContent).toContain('Escribe tu pregunta');
    expect(panel.getAttribute('aria-labelledby')).toBeTruthy();
    expect(panel.getAttribute('aria-describedby')).toBeTruthy();
    // Sin mensajes no hay botón de nueva conversación ni de detener.
    expect(porId('mentor-nueva')).toBeNull();
    expect(porId('mentor-detener')).toBeNull();
    expect(wrapper!.get('[data-testid="mentor-abrir"]').attributes('aria-expanded')).toBe('true');
  });

  it('tocar una pregunta de ejemplo la envía', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(respuestaSse([sseTexto('Claro'), sseFin()])),
    );
    montar();
    await abrir();
    (qa('[data-testid="mentor-ejemplo"]')[1] as HTMLButtonElement).click();
    await flushPromises();
    expect(cuerpoEnviado().messages).toEqual([
      { role: 'user', content: '¿Cómo se remodela el hueso a lo largo de la vida?' },
    ]);
    expect(porId('mentor-vacio')).toBeNull();
    // La lista se carga de forma perezosa (markdown-it + DOMPurify): puede tardar un instante.
    await vi.waitFor(() => expect(mensajes()).toHaveLength(2));
  });

  it('los botones y el campo cumplen el tamaño táctil de 44 px (clases)', async () => {
    montar();
    await abrir();
    expect(campo().className).toContain('min-h-11');
    for (const ejemplo of qa('[data-testid="mentor-ejemplo"]')) {
      expect(ejemplo.className).toContain('min-h-11');
    }
    expect(porId('mentor-enviar')!.className).toContain('size-11');
  });
});

describe('MentorPanel: envío con Enter', () => {
  it('Enter envía, Shift+Enter no, y el campo se vacía', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaSse([sseTexto('ok'), sseFin()])));
    montar();
    await abrir();
    await escribir('Hola mentor');

    const conShift = await teclear({ key: 'Enter', shiftKey: true });
    expect(conShift.defaultPrevented).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    const enter = await teclear({ key: 'Enter' });
    expect(enter.defaultPrevented).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cuerpoEnviado().messages).toEqual([{ role: 'user', content: 'Hola mentor' }]);
    expect(campo().value).toBe('');
  });

  it('Enter con el campo vacío o durante una composición IME no envía', async () => {
    montar();
    await abrir();
    await teclear({ key: 'Enter' });
    await escribir('あ');
    await teclear({ key: 'Enter', isComposing: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('el botón de enviar está deshabilitado con el campo vacío y envía al pulsarlo', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaSse([sseTexto('ok'), sseFin()])));
    montar();
    await abrir();
    const enviar = () => porId('mentor-enviar') as HTMLButtonElement;
    expect(enviar().disabled).toBe(true);
    await escribir('Pregunta por botón');
    expect(enviar().disabled).toBe(false);
    enviar().click();
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('MentorPanel: streaming', () => {
  it('muestra "pensando", luego el texto en Markdown, y bloquea el campo mientras responde', async () => {
    const manual = flujoManual();
    montar();
    await abrir();
    await escribir('¿Qué son los osteoclastos?');
    await teclear({ key: 'Enter' });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await flushPromises();

    // Antes del primer texto: indicador de pensando y campo deshabilitado.
    expect(mensajes()[1]!.textContent).toContain('Pensando');
    expect(campo().disabled).toBe(true);
    expect(porId('mentor-detener')).not.toBeNull();
    expect(porId('mentor-enviar')).toBeNull();
    expect(porId('mentor-anuncio')!.textContent).toContain('El mentor está pensando');

    manual.flujo!.enviar(sseTexto('Son células **gigantes** que '));
    await vi.waitFor(() => expect(porId('mentor-markdown')).not.toBeNull());
    expect(porId('mentor-markdown')!.querySelector('strong')?.textContent).toBe('gigantes');
    expect(mensajes()[1]!.textContent).not.toContain('Pensando');
    expect(mensajes()[1]!.getAttribute('data-status')).toBe('transmitiendo');
    // Mientras llega el texto NO se lee token a token: la región viva no tiene el parcial.
    expect(porId('mentor-anuncio')!.textContent).not.toContain('gigantes');

    manual.flujo!.enviar(sseTexto('resorben hueso.') + sseFin());
    await vi.waitFor(() => expect(mensajes()[1]!.getAttribute('data-status')).toBe('completo'));
    await flushPromises();

    // Al completar: se anuncia UNA vez la respuesta completa y el campo se libera.
    expect(porId('mentor-anuncio')!.textContent).toContain(
      'Respuesta del mentor: Son células gigantes que resorben hueso.',
    );
    expect(campo().disabled).toBe(false);
    expect(porId('mentor-detener')).toBeNull();
    expect(porId('mentor-enviar')).not.toBeNull();
  });

  it('la región viva es polite y atómica', async () => {
    montar();
    await abrir();
    const region = porId('mentor-anuncio')!;
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-atomic')).toBe('true');
  });

  it('Detener conserva el texto parcial marcado como interrumpido y libera el campo', async () => {
    const manual = flujoManual();
    montar();
    await abrir();
    await escribir('hola');
    await teclear({ key: 'Enter' });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    manual.flujo!.enviar(sseTexto('Respuesta a medias'));
    await vi.waitFor(() =>
      expect(porId('mentor-markdown')?.textContent).toContain('Respuesta a medias'),
    );

    (porId('mentor-detener') as HTMLButtonElement).click();
    await flushPromises();

    expect(mensajes()[1]!.getAttribute('data-status')).toBe('interrumpido');
    expect(porId('mentor-markdown')!.textContent).toContain('Respuesta a medias');
    expect(porId('mentor-interrumpido')!.textContent).toContain('Respuesta interrumpida');
    expect(campo().disabled).toBe(false);
    expect(porId('mentor-detener')).toBeNull();
    // Detener no es un error: no aparece el aviso rojo.
    expect(porId('mentor-error')).toBeNull();
  });

  it('el foco vuelve al campo al terminar la respuesta (puntero fino)', async () => {
    const manual = flujoManual();
    montar('escritorio', false);
    await abrir();
    await escribir('hola');
    await teclear({ key: 'Enter' });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    manual.flujo!.enviar(sseTexto('ok') + sseFin());
    await vi.waitFor(() => expect(campo().disabled).toBe(false));
    await flushPromises();
    expect(document.activeElement).toBe(campo());
  });
});

describe('MentorPanel: seguridad del Markdown (XSS)', () => {
  /** El mentor responde con este texto y devuelve el HTML renderizado de la burbuja. */
  async function responderCon(texto: string): Promise<HTMLElement> {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaSse([sseTexto(texto), sseFin()])));
    montar();
    await abrir();
    await escribir('hola');
    await teclear({ key: 'Enter' });
    await flushPromises();
    await vi.waitFor(() => expect(porId('mentor-markdown')).not.toBeNull());
    return porId('mentor-markdown')!;
  }

  it('<img src=x onerror=...> en la respuesta NO llega al DOM como elemento', async () => {
    const burbuja = await responderCon('Mira: <img src=x onerror="window.__xss=1">');
    expect(burbuja.querySelector('img')).toBeNull();
    expect(document.body.querySelector('img[onerror]')).toBeNull();
    // Se ve como texto literal.
    expect(burbuja.textContent).toContain('<img src=x onerror="window.__xss=1">');
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it('<script>, <iframe> y manejadores on* tampoco', async () => {
    const burbuja = await responderCon(
      '<script>window.__xss=2</script><iframe src="https://malo.example"></iframe><b onmouseover="window.__xss=3">x</b>',
    );
    expect(burbuja.querySelector('script, iframe, b')).toBeNull();
    expect(burbuja.innerHTML).not.toMatch(/<[^>]*\son\w+=/i);
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it('los enlaces javascript:, data: y vbscript: no son enlaces ejecutables', async () => {
    const burbuja = await responderCon(
      '[uno](javascript:window.__xss=4) [dos](data:text/html,x) [tres](vbscript:x) [ok](https://ejemplo.org/hueso)',
    );
    const hrefs = Array.from(burbuja.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['https://ejemplo.org/hueso']);
    expect(burbuja.innerHTML).not.toMatch(/href="(javascript|data|vbscript):/i);
  });

  it('los enlaces legítimos abren en pestaña nueva con rel="noopener noreferrer"', async () => {
    const burbuja = await responderCon('Lee [esta guía](https://ejemplo.org/guia).');
    const enlace = burbuja.querySelector('a')!;
    expect(enlace.getAttribute('target')).toBe('_blank');
    expect(enlace.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('el HTML pasa SIEMPRE por la segunda capa (DOMPurify)', async () => {
    await responderCon('Texto **normal**');
    expect(sanitizarHtml).toHaveBeenCalled();
    expect(vi.mocked(sanitizarHtml).mock.calls.at(-1)![0]).toContain('<strong>normal</strong>');
  });

  it('lo que escribe el estudiante nunca se interpreta como HTML ni Markdown', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaSse([sseTexto('ok'), sseFin()])));
    montar();
    await abrir();
    await escribir('<img src=x onerror=alert(1)> **negrita**');
    await teclear({ key: 'Enter' });
    await flushPromises();
    const propio = mensajes()[0]!;
    expect(propio.querySelector('img, strong')).toBeNull();
    expect(propio.textContent).toContain('<img src=x onerror=alert(1)> **negrita**');
  });
});

describe('MentorPanel: errores', () => {
  it('503 ia_no_configurada: mensaje amable y sin botón de reintentar', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaError(503, 'ia_no_configurada')));
    montar();
    await abrir();
    await escribir('hola');
    await teclear({ key: 'Enter' });
    await flushPromises();
    const aviso = porId('mentor-error')!;
    expect(aviso.getAttribute('role')).toBe('alert');
    expect(aviso.textContent).toContain('El mentor no está disponible por ahora.');
    expect(porId('mentor-reintentar')).toBeNull();
    // La respuesta fallida vacía no se dibuja como burbuja.
    expect(mensajes()).toHaveLength(1);
    expect(campo().disabled).toBe(false);
  });

  it('un error del servidor ofrece Reintentar y al pulsarlo se completa la respuesta', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(respuestaError(500, 'error_servidor')));
    montar();
    await abrir();
    await escribir('¿Qué es el osteoide?');
    await teclear({ key: 'Enter' });
    await flushPromises();
    expect(porId('mentor-error')!.textContent).toContain('no pudo responder en este momento');

    fetchMock.mockImplementationOnce(() =>
      Promise.resolve(respuestaSse([sseTexto('Matriz sin mineralizar.'), sseFin()])),
    );
    (porId('mentor-reintentar') as HTMLButtonElement).click();
    await flushPromises();
    await vi.waitFor(() => expect(porId('mentor-markdown')).not.toBeNull());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cuerpoEnviado(1).messages).toEqual([{ role: 'user', content: '¿Qué es el osteoide?' }]);
    expect(porId('mentor-error')).toBeNull();
    expect(porId('mentor-markdown')!.textContent).toContain('Matriz sin mineralizar.');
  });

  it('un error dentro del stream conserva el texto parcial y avisa', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(respuestaSse([sseTexto('Los osteo'), sseError('upstream_error')])),
    );
    montar();
    await abrir();
    await escribir('hola');
    await teclear({ key: 'Enter' });
    await flushPromises();
    expect(porId('mentor-markdown')!.textContent).toContain('Los osteo');
    expect(porId('mentor-interrumpido')).not.toBeNull();
    expect(porId('mentor-error')!.textContent).toContain('problema para responder');
    expect(porId('mentor-error')!.textContent).not.toContain('upstream');
  });

  it('red caída: aviso de sin conexión', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    montar();
    await abrir();
    await escribir('hola');
    await teclear({ key: 'Enter' });
    await flushPromises();
    expect(porId('mentor-error')!.textContent).toContain('No hay conexión con el servidor');
    expect(porId('mentor-reintentar')).not.toBeNull();
  });

  it('401: cierra la sesión', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaError(401, 'token_invalido')));
    const { auth } = montar();
    await abrir();
    await escribir('hola');
    await teclear({ key: 'Enter' });
    await flushPromises();
    expect(auth.isAuthenticated).toBe(false);
  });
});

describe('MentorPanel: límite de caracteres', () => {
  it('el contador aparece cerca del límite y bloquea el envío al pasarse', async () => {
    montar();
    await abrir();
    await escribir('a'.repeat(6999));
    expect(porId('mentor-contador')).toBeNull();

    await escribir('a'.repeat(7500));
    expect(porId('mentor-contador')!.textContent).toContain('7500 de 8000');
    expect(campo().getAttribute('aria-describedby')).toBe(porId('mentor-contador')!.id);

    await escribir('a'.repeat(8001));
    expect(porId('mentor-contador')!.textContent).toContain('Te pasaste por 1 caracteres');
    expect(campo().getAttribute('aria-invalid')).toBe('true');
    expect((porId('mentor-enviar') as HTMLButtonElement).disabled).toBe(true);
    await teclear({ key: 'Enter' });
    expect(fetchMock).not.toHaveBeenCalled();

    // Exactamente 8000 sí se puede enviar.
    fetchMock.mockImplementation(() => Promise.resolve(respuestaSse([sseTexto('ok'), sseFin()])));
    await escribir('a'.repeat(8000));
    await teclear({ key: 'Enter' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('MentorPanel: autoscroll', () => {
  /** Simula las medidas de scroll (happy-dom no hace layout). */
  function simularScroll(el: HTMLElement, scrollTop: number) {
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: 300 });
    Object.defineProperty(el, 'scrollTop', {
      configurable: true,
      writable: true,
      value: scrollTop,
    });
  }

  it('sigue el final mientras llega texto y se pausa si el estudiante sube a leer', async () => {
    const manual = flujoManual();
    montar();
    await abrir();
    await escribir('hola');
    await teclear({ key: 'Enter' });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const lista = porId('mentor-lista')!;
    simularScroll(lista, 700); // abajo del todo (1000 - 300)

    manual.flujo!.enviar(sseTexto('primer trozo '));
    await vi.waitFor(() => expect(lista.scrollTop).toBe(1000));
    expect(porId('mentor-ir-al-final')).toBeNull();

    // El estudiante sube a releer.
    lista.scrollTop = 100;
    lista.dispatchEvent(new Event('scroll'));
    await nextTick();
    expect(porId('mentor-ir-al-final')).not.toBeNull();

    manual.flujo!.enviar(sseTexto('segundo trozo '));
    await vi.waitFor(() => expect(porId('mentor-markdown')!.textContent).toContain('segundo'));
    await flushPromises();
    expect(lista.scrollTop).toBe(100); // no lo arrastra hacia abajo
    expect(porId('mentor-ir-al-final')).not.toBeNull();

    // "Ir al final" baja, desaparece y devuelve el foco a la lista.
    (porId('mentor-ir-al-final') as HTMLButtonElement).click();
    await nextTick();
    expect(lista.scrollTop).toBe(1000);
    expect(porId('mentor-ir-al-final')).toBeNull();
    expect(document.activeElement).toBe(lista);

    manual.flujo!.enviar(sseFin());
    await flushPromises();
  });

  it('la lista es una región enfocable con nombre (recorrible con teclado)', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaSse([sseTexto('ok'), sseFin()])));
    montar();
    await abrir();
    await escribir('hola');
    await teclear({ key: 'Enter' });
    await flushPromises();
    const lista = porId('mentor-lista')!;
    expect(lista.getAttribute('role')).toBe('region');
    expect(lista.getAttribute('aria-label')).toBe('Conversación con el mentor');
    expect(lista.getAttribute('tabindex')).toBe('0');
  });
});

describe('MentorPanel: móvil y escritorio', () => {
  it('móvil: hoja inferior modal con fondo atenuado; el foco va al título, no al campo', async () => {
    montar('movil', true);
    await abrir();
    const panel = porId('mentor-panel')!;
    expect(panel.className).toContain('bottom-0');
    expect(panel.className).toContain('inset-x-0');
    expect(q('[data-slot="sheet-overlay"]')).not.toBeNull();
    await nextTick();
    expect(document.activeElement).not.toBe(campo());
    expect(document.activeElement?.textContent).toContain('Mentor de IA');
  });

  it('escritorio: panel lateral derecho NO modal (sin fondo) y el foco va al campo', async () => {
    montar('escritorio');
    await abrir();
    const panel = porId('mentor-panel')!;
    expect(panel.className).toContain('right-0');
    expect(panel.style.top).toContain('--altura-cabecera');
    expect(q('[data-slot="sheet-overlay"]')).toBeNull();
    await nextTick();
    expect(document.activeElement).toBe(campo());
  });

  it('escritorio: tocar fuera del panel no lo cierra', async () => {
    montar('escritorio');
    await abrir();
    const fuera = document.createElement('div');
    document.body.appendChild(fuera);
    fuera.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fuera.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(porId('mentor-panel')).not.toBeNull();
  });
});

describe('MentorPanel: foco, cierre y estado', () => {
  it('Escape cierra y el foco vuelve al botón flotante', async () => {
    montar('escritorio');
    await abrir();
    expect(porId('mentor-panel')).not.toBeNull();
    await escape();
    expect(porId('mentor-panel')).toBeNull();
    const boton = wrapper!.get('[data-testid="mentor-abrir"]').element;
    expect(document.activeElement).toBe(boton);
    expect(boton.getAttribute('aria-expanded')).toBe('false');
  });

  it('el borrador sin enviar sobrevive a cerrar y abrir', async () => {
    montar();
    await abrir();
    await escribir('una pregunta a medias');
    await escape();
    await abrir();
    expect(campo().value).toBe('una pregunta a medias');
  });

  it('la conversación y una respuesta en curso sobreviven a cerrar el panel', async () => {
    const manual = flujoManual();
    montar();
    await abrir();
    await escribir('hola');
    await teclear({ key: 'Enter' });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    manual.flujo!.enviar(sseTexto('Empiezo a responder'));
    await vi.waitFor(() => expect(porId('mentor-markdown')).not.toBeNull());

    await escape();
    expect(porId('mentor-panel')).toBeNull();
    manual.flujo!.enviar(sseTexto(' y termino.') + sseFin());
    await flushPromises();

    // Con el panel cerrado, el botón avisa de que hay una respuesta nueva.
    expect(wrapper!.find('[data-testid="mentor-sin-leer"]').exists()).toBe(true);
    expect(wrapper!.get('[data-testid="mentor-abrir"]').text()).toContain(
      'hay una respuesta nueva',
    );
    // Y una región viva externa lo avisa a los lectores de pantalla, sin leer toda la respuesta.
    const aviso = wrapper!.get('[data-testid="mentor-aviso-cerrado"]');
    expect(aviso.attributes('aria-live')).toBe('polite');
    expect(aviso.text()).toContain('El mentor respondió');
    expect(aviso.text()).not.toContain('Empiezo a responder');

    await abrir();
    expect(mensajes()).toHaveLength(2);
    expect(porId('mentor-markdown')!.textContent).toContain('Empiezo a responder y termino.');
    expect(wrapper!.find('[data-testid="mentor-sin-leer"]').exists()).toBe(false);
    expect(wrapper!.get('[data-testid="mentor-aviso-cerrado"]').text()).toBe('');
  });

  it('"Nueva conversación" vacía el chat y vuelve al estado vacío', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respuestaSse([sseTexto('ok'), sseFin()])));
    montar();
    await abrir();
    await escribir('hola');
    await teclear({ key: 'Enter' });
    await flushPromises();
    expect(mensajes()).toHaveLength(2);

    (porId('mentor-nueva') as HTMLButtonElement).click();
    await flushPromises();
    // Pide confirmación antes de borrar nada.
    expect(porId('mentor-confirmar-nueva')).not.toBeNull();
    expect(mensajes()).toHaveLength(2);
    (porId('mentor-nueva-confirmar') as HTMLButtonElement).click();
    await flushPromises();
    expect(mensajes()).toHaveLength(0);
    expect(porId('mentor-vacio')).not.toBeNull();
    expect(porId('mentor-nueva')).toBeNull();
  });

  it('desmontar el panel cancela la respuesta en curso', async () => {
    let senal: AbortSignal | null | undefined;
    fetchMock.mockImplementation((_url, init) => {
      senal = init?.signal;
      return Promise.resolve(flujoControlable(init?.signal).respuesta);
    });
    montar();
    await abrir();
    await escribir('hola');
    await teclear({ key: 'Enter' });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    wrapper!.unmount();
    wrapper = undefined;
    expect(senal!.aborted).toBe(true);
  });
});
