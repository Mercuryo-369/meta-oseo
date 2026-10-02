/**
 * Funciones del mentor en su panel (F3-06, F4-03, F3-11, F3-09, F3-07) con la API simulada:
 * conversación restaurada, pulgares, "Nueva conversación" con confirmación, sugerencias de
 * refuerzo, "Explícame ...", el atajo "Preguntar al mentor", el evento de documento y el quiz.
 *
 * Como en MentorPanel.test.ts, DOMPurify se sustituye por identidad (no funciona en happy-dom).
 */
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { preguntarAlMentor } from '@/ai/explicame';
import { limpiarIndicesExplicame } from '@/ai/explicame';
import { respuestaSse, sseFin, sseMensaje, sseSesion, sseTexto } from '@/ai/pruebas';
import { useAuthStore } from '@/stores/auth';
import { useContextoStore } from '@/stores/contextoPedagogico';
import { respuestaError, respuestaJson, usuarioDePrueba } from '@/test/utils';
import MentorPanel from './MentorPanel.vue';

vi.mock('@/ai/sanitizar', () => ({ sanitizarHtml: vi.fn((html: string) => html) }));
// El contenido real no importa aquí: el nombre legible se deriva del id.
vi.mock('@/content/registry', () => ({
  cargarModulo: vi.fn(() => Promise.resolve({ ok: false, motivo: 'sin_contenido', mensaje: '' })),
}));

type Manejador = (url: string, init?: RequestInit) => Response | Promise<Response>;

const llamadas: { url: string; metodo: string; cuerpo: unknown }[] = [];
const rutas = new Map<string, Manejador>();
let wrapper: VueWrapper | undefined;
let avisos: MockInstance[] = [];

/** Enrutador de `fetch`: cada prueba registra la respuesta de las rutas que usa. */
function ruta(clave: string, manejador: Manejador): void {
  rutas.set(clave, manejador);
}

const fetchEnrutado: typeof fetch = (entrada, init) => {
  const url = String(entrada);
  const metodo = (init?.method ?? 'GET').toUpperCase();
  let cuerpo: unknown = init?.body ?? null;
  if (typeof cuerpo === 'string') {
    try {
      cuerpo = JSON.parse(cuerpo);
    } catch {
      // Cuerpo que no es JSON: se deja como texto.
    }
  }
  llamadas.push({ url, metodo, cuerpo });
  for (const [clave, manejador] of rutas) {
    const [m, fragmento] = clave.split(' ') as [string, string];
    if (m === metodo && url.includes(fragmento)) return Promise.resolve(manejador(url, init));
  }
  return Promise.reject(new Error(`fetch sin ruta simulada: ${metodo} ${url}`));
};

const HISTORIAL_VACIO = () => respuestaJson(200, { session_id: null, messages: [] });
const SIN_SUGERENCIAS = () => respuestaJson(200, { sugerencias: [] });

function historial() {
  return respuestaJson(200, {
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
        content: 'Siente la carga mecánica.',
        citas: [],
        valoracion: -1,
        created_at: '2026-09-25T10:00:05Z',
      },
    ],
  });
}

function sugerencias() {
  return respuestaJson(200, {
    sugerencias: [
      {
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
      },
    ],
  });
}

function quiz() {
  return respuestaJson(200, {
    modulo: 3,
    seccion: 'm3_2_rankl',
    tema: 'La balanza RANKL/OPG',
    preguntas: [1, 2, 3].map((n) => ({
      id: n,
      enunciado: `¿Idea correcta número ${n}?`,
      opciones: [0, 1, 2, 3].map((i) => ({ texto: `Opción ${n}-${i}` })),
      correcta: 1,
      explicacion: `Porque sí, ${n}.`,
      dificultad: 'basica',
      fuentes: ['1'],
    })),
    fuentes: [
      {
        id: 'a',
        modulo: 3,
        seccion_id: 'm3_2_rankl',
        titulo: 'Módulo 3 · La balanza RANKL/OPG',
        url: '/modulo/3?s=m3_2_rankl',
      },
    ],
    otorga_puntos: false,
  });
}

function simularPantalla(pantalla: 'movil' | 'escritorio'): void {
  vi.spyOn(window, 'matchMedia').mockImplementation((consulta: string) => {
    const minimo = /min-width:\s*(\d+)px/.exec(consulta);
    const coincide = minimo ? (pantalla === 'escritorio' ? 1280 : 390) >= Number(minimo[1]) : false;
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

async function montar(pantalla: 'movil' | 'escritorio' = 'escritorio') {
  simularPantalla(pantalla);
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'tok-123';
  auth.establecerUsuario(usuarioDePrueba());
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/modulo/:n([1-6])', component: { template: '<div />' } },
    ],
  });
  await router.push('/');
  await router.isReady();
  wrapper = mount(MentorPanel, { global: { plugins: [pinia, router] }, attachTo: document.body });
  return { auth, router, contexto: useContextoStore() };
}

const q = <T extends Element = HTMLElement>(selector: string) =>
  document.body.querySelector<T>(selector);
const qa = (selector: string) => Array.from(document.body.querySelectorAll<HTMLElement>(selector));
const porId = (id: string) => q(`[data-testid="${id}"]`);
const clic = async (id: string) => {
  porId(id)!.click();
  await flushPromises();
  await nextTick();
};

async function abrir(): Promise<void> {
  await wrapper!.get('[data-testid="mentor-abrir"]').trigger('click');
  await flushPromises();
  await nextTick();
}

async function escribir(texto: string): Promise<void> {
  const el = q<HTMLTextAreaElement>('[data-testid="mentor-campo"]')!;
  el.value = texto;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
}

const mensajes = () => qa('[data-testid="mentor-mensaje"]');
/** La lista de mensajes es un componente asíncrono: se espera a que aparezca. */
const esperarMensajes = (n: number) => vi.waitFor(() => expect(mensajes()).toHaveLength(n));
const pedidosAlChat = () => llamadas.filter((l) => l.metodo === 'POST' && /\/chat$/.test(l.url));

function rutasBase(): void {
  ruta('GET /chat/history', HISTORIAL_VACIO);
  ruta('GET /mentor/refuerzo', SIN_SUGERENCIAS);
}

beforeEach(() => {
  avisos = [vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')];
  for (const espia of avisos) espia.mockImplementation(() => undefined);
  document.body.innerHTML = '';
  localStorage.clear();
  llamadas.length = 0;
  rutas.clear();
  limpiarIndicesExplicame();
  vi.stubGlobal('fetch', fetchEnrutado);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = '';
  const emitidos = avisos.flatMap((espia) => espia.mock.calls.map((llamada) => String(llamada[0])));
  expect(emitidos).toEqual([]);
});

describe('Conversación restaurada (F3-09)', () => {
  it('al abrir recupera la conversación guardada, con su valoración', async () => {
    rutasBase();
    ruta('GET /chat/history', historial);
    await montar();
    await abrir();
    await flushPromises();
    await esperarMensajes(2);
    expect(mensajes()[0]!.textContent).toContain('¿Qué hace un osteocito?');
    expect(porId('mentor-pulgar-abajo')!.getAttribute('aria-pressed')).toBe('true');
    expect(porId('mentor-valoracion-estado')!.textContent).toContain('no te sirvió');
    expect(porId('mentor-vacio')).toBeNull();
    expect(porId('mentor-nueva')).not.toBeNull(); // ya hay una conversación que se puede borrar
  });

  it('cerrar y volver a abrir no la pide ni la duplica', async () => {
    rutasBase();
    ruta('GET /chat/history', historial);
    await montar();
    await abrir();
    await flushPromises();
    q<HTMLButtonElement>('[data-testid="mentor-abrir"]')?.click(); // ya abierto: no hace nada útil
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flushPromises();
    await abrir();
    await flushPromises();
    expect(llamadas.filter((l) => l.url.includes('/chat/history'))).toHaveLength(1);
    await esperarMensajes(2);
  });

  it('sin conversación guardada muestra el estado vacío, sin avisos', async () => {
    rutasBase();
    await montar();
    await abrir();
    await flushPromises();
    expect(porId('mentor-vacio')).not.toBeNull();
    expect(porId('mentor-historial-error')).toBeNull();
    expect(porId('mentor-historial-cargando')).toBeNull();
  });

  it('mientras llega lo avisa con un estado accesible', async () => {
    rutasBase();
    let resolver!: (r: Response) => void;
    ruta('GET /chat/history', () => new Promise<Response>((r) => (resolver = r)) as never);
    await montar();
    await abrir();
    const aviso = porId('mentor-historial-cargando')!;
    expect(aviso.getAttribute('role')).toBe('status');
    expect(aviso.textContent).toContain('Recuperando');
    resolver(historial());
    await flushPromises();
    expect(porId('mentor-historial-cargando')).toBeNull();
    await esperarMensajes(2);
  });

  it('si falla, avisa con role=alert y Reintentar la recupera', async () => {
    rutasBase();
    let intento = 0;
    ruta('GET /chat/history', () => {
      intento += 1;
      return intento === 1 ? respuestaError(500, 'error_servidor', 'Traceback') : historial();
    });
    await montar();
    await abrir();
    await flushPromises();
    const alerta = porId('mentor-historial-error')!;
    expect(alerta.getAttribute('role')).toBe('alert');
    expect(alerta.textContent).toContain('No pudimos recuperar tu conversación anterior.');
    expect(alerta.textContent).not.toContain('Traceback');
    await clic('mentor-historial-reintentar');
    expect(porId('mentor-historial-error')).toBeNull();
    await esperarMensajes(2);
  });

  it('el aviso de que son respuestas de IA se mantiene', async () => {
    rutasBase();
    await montar();
    await abrir();
    expect(porId('mentor-panel')!.textContent).toContain(
      'Respuestas generadas por IA. Verifica con el material del curso.',
    );
  });
});

describe('Pulgares (F3-11)', () => {
  it('votar envía el voto, lo muestra y tocarlo otra vez lo retira', async () => {
    rutasBase();
    ruta('GET /chat/history', historial);
    ruta('POST /chat/feedback', (_url, init) => {
      const cuerpo = JSON.parse(String(init?.body)) as { message_id: number; valor: number };
      return respuestaJson(200, { message_id: cuerpo.message_id, valor: cuerpo.valor || null });
    });
    await montar();
    await abrir();
    await flushPromises();

    await clic('mentor-pulgar-arriba'); // cambia el -1 por 1
    expect(llamadas.find((l) => l.url.includes('/chat/feedback'))!.cuerpo).toEqual({
      message_id: 2,
      valor: 1,
    });
    expect(porId('mentor-pulgar-arriba')!.getAttribute('aria-pressed')).toBe('true');
    expect(porId('mentor-pulgar-abajo')!.getAttribute('aria-pressed')).toBe('false');
    expect(porId('mentor-valoracion-estado')!.textContent).toBe('Marcaste que te sirvió');

    await clic('mentor-pulgar-arriba'); // retirar
    expect(porId('mentor-pulgar-arriba')!.getAttribute('aria-pressed')).toBe('false');
    expect(porId('mentor-valoracion-estado')!.textContent).toBe('');
  });

  it('una respuesta recién recibida se puede valorar con el id que manda el servidor', async () => {
    rutasBase();
    ruta('POST /chat', () =>
      respuestaSse([sseSesion(4), sseTexto('Respuesta corta'), sseMensaje(77), sseFin()]),
    );
    ruta('POST /chat/feedback', () => respuestaJson(200, { message_id: 77, valor: -1 }));
    await montar();
    await abrir();
    await escribir('hola');
    q<HTMLTextAreaElement>('[data-testid="mentor-campo"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    await flushPromises();
    expect(qa('[data-testid="mentor-valoracion"]')).toHaveLength(1); // solo la respuesta del mentor
    await clic('mentor-pulgar-abajo');
    expect(llamadas.find((l) => l.url.includes('/chat/feedback'))!.cuerpo).toEqual({
      message_id: 77,
      valor: -1,
    });
  });

  it('si falla, el voto vuelve atrás y se avisa', async () => {
    rutasBase();
    ruta('GET /chat/history', historial);
    ruta('POST /chat/feedback', () => respuestaError(500, 'error_servidor', 'Traceback'));
    await montar();
    await abrir();
    await flushPromises();
    await clic('mentor-pulgar-arriba');
    expect(porId('mentor-pulgar-arriba')!.getAttribute('aria-pressed')).toBe('false');
    expect(porId('mentor-pulgar-abajo')!.getAttribute('aria-pressed')).toBe('true');
    const alerta = porId('mentor-valoracion-error')!;
    expect(alerta.getAttribute('role')).toBe('alert');
    expect(alerta.textContent).toContain('No se pudo guardar tu valoración');
  });
});

describe('Nueva conversación con confirmación', () => {
  async function conConversacion() {
    rutasBase();
    ruta('GET /chat/history', historial);
    const ctx = await montar();
    await abrir();
    await flushPromises();
    return ctx;
  }

  it('pide confirmación y Cancelar no borra nada', async () => {
    await conConversacion();
    ruta('DELETE /chat/session', () => new Response(null, { status: 204 }));
    await clic('mentor-nueva');
    const barra = porId('mentor-confirmar-nueva')!;
    expect(barra.getAttribute('role')).toBe('group');
    expect(barra.textContent).toContain('¿Borrar esta conversación y empezar otra?');
    expect(document.activeElement).toBe(porId('mentor-nueva-cancelar'));
    await clic('mentor-nueva-cancelar');
    expect(porId('mentor-confirmar-nueva')).toBeNull();
    expect(mensajes()).toHaveLength(2);
    expect(llamadas.some((l) => l.metodo === 'DELETE')).toBe(false);
  });

  it('Escape cancela la confirmación sin cerrar el panel', async () => {
    await conConversacion();
    await clic('mentor-nueva');
    porId('mentor-nueva-cancelar')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await flushPromises();
    expect(porId('mentor-confirmar-nueva')).toBeNull();
    expect(porId('mentor-panel')).not.toBeNull();
    expect(mensajes()).toHaveLength(2);
  });

  it('confirmar borra la sesión en el servidor y deja el chat vacío', async () => {
    await conConversacion();
    ruta('DELETE /chat/session', () => new Response(null, { status: 204 }));
    await clic('mentor-nueva');
    await clic('mentor-nueva-confirmar');
    const borrado = llamadas.find((l) => l.metodo === 'DELETE')!;
    expect(borrado.url).toMatch(/\/chat\/session\?session_id=9$/);
    expect(mensajes()).toHaveLength(0);
    expect(porId('mentor-vacio')).not.toBeNull();
    expect(porId('mentor-confirmar-nueva')).toBeNull();
    expect(porId('mentor-nueva')).toBeNull();
  });

  it('si el servidor no lo borra, conserva la conversación y lo explica', async () => {
    await conConversacion();
    ruta('DELETE /chat/session', () => respuestaError(500, 'error_servidor', 'Traceback'));
    await clic('mentor-nueva');
    await clic('mentor-nueva-confirmar');
    expect(mensajes()).toHaveLength(2);
    expect(porId('mentor-error-borrado')!.getAttribute('role')).toBe('alert');
    expect(porId('mentor-error-borrado')!.textContent).toContain('No se pudo borrar');
    expect(porId('mentor-error-borrado')!.textContent).not.toContain('Traceback');
  });
});

describe('Para reforzar (F3-07)', () => {
  it('el estado vacío muestra la tarjeta con motivo, prioridad y enlace a la sección', async () => {
    rutasBase();
    ruta('GET /mentor/refuerzo', sugerencias);
    await montar();
    await abrir();
    await flushPromises();
    const tarjeta = porId('tarjeta-refuerzo')!;
    expect(tarjeta.textContent).toContain('Para reforzar');
    expect(tarjeta.textContent).toContain('Señalización RANK-RANKL-OPG');
    expect(tarjeta.textContent).toContain('Llevas 4 intentos y aún no la completas');
    expect(tarjeta.textContent).toContain('Prioridad alta');
    expect(q<HTMLAnchorElement>('[data-testid="refuerzo-enlace"]')!.getAttribute('href')).toBe(
      '/modulo/3?s=m3_2_rankl',
    );
  });

  it('sin sugerencias no hay tarjeta (sin ruido)', async () => {
    rutasBase();
    await montar();
    await abrir();
    await flushPromises();
    expect(porId('tarjeta-refuerzo')).toBeNull();
    expect(porId('mentor-vacio')!.textContent).not.toContain('Para reforzar');
  });

  it('un fallo al pedirlas tampoco muestra nada', async () => {
    rutasBase();
    ruta('GET /mentor/refuerzo', () => respuestaError(500, 'error_servidor'));
    await montar();
    await abrir();
    await flushPromises();
    expect(porId('tarjeta-refuerzo')).toBeNull();
    expect(porId('mentor-vacio')).not.toBeNull();
  });

  it('seguir un enlace en móvil cierra la hoja para ver el contenido', async () => {
    rutasBase();
    ruta('GET /mentor/refuerzo', sugerencias);
    const { router } = await montar('movil');
    await abrir();
    await flushPromises();
    await clic('refuerzo-enlace');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/modulo/3?s=m3_2_rankl');
    expect(porId('mentor-panel')).toBeNull();
  });

  it('"Ponme a prueba" de una sugerencia pide un quiz sobre ese concepto', async () => {
    rutasBase();
    ruta('GET /mentor/refuerzo', sugerencias);
    ruta('POST /mentor/quiz', quiz);
    await montar();
    await abrir();
    await flushPromises();
    await clic('refuerzo-practicar');
    const pedido = llamadas.find((l) => l.url.includes('/mentor/quiz'))!;
    expect(pedido.cuerpo).toMatchObject({
      tema: 'Señalización RANK-RANKL-OPG',
      modulo: 3,
      seccion: 'm3_2_rankl',
    });
    expect(porId('quiz-pregunta')).not.toBeNull();
  });
});

describe('Explícame esto (F3-06)', () => {
  it('con una estructura seleccionada ofrece "Explícame {nombre}" y envía la pregunta fija', async () => {
    rutasBase();
    ruta('POST /chat', () => respuestaSse([sseSesion(3), sseTexto('Es una célula.'), sseFin()]));
    const { contexto } = await montar();
    contexto.setModulo(2);
    contexto.setEstructura('histo_osteoclasto');
    contexto.setNivel('posgrado');
    await abrir();
    await flushPromises();

    const chips = qa('[data-testid="mentor-explicame-chip"]');
    expect(chips.map((c) => c.textContent!.trim())).toEqual(['Explícame Osteoclasto']);
    chips[0]!.click();
    await flushPromises();

    const [pedido] = pedidosAlChat();
    const cuerpo = pedido!.cuerpo as {
      messages: { role: string; content: string }[];
      contexto: Record<string, unknown>;
    };
    expect(cuerpo.messages.at(-1)).toEqual({
      role: 'user',
      content:
        'Explícame «Osteoclasto»: ¿qué es, qué función cumple y cómo se relaciona con lo que estoy estudiando?',
    });
    // El servidor recibe la selección y el nivel para adaptar la explicación.
    expect(cuerpo.contexto).toMatchObject({
      nivel: 'posgrado',
      estructuraSeleccionada: 'histo_osteoclasto',
      modulo: 2,
    });
  });

  it('una molécula también tiene su chip', async () => {
    rutasBase();
    const { contexto } = await montar();
    contexto.setMolecula('mol_rankl');
    await abrir();
    await flushPromises();
    expect(qa('[data-testid="mentor-explicame-chip"]').map((c) => c.textContent!.trim())).toEqual([
      'Explícame Rankl',
    ]);
  });

  it('sin selección no hay chips', async () => {
    rutasBase();
    await montar();
    await abrir();
    expect(porId('mentor-explicame')).toBeNull();
  });

  it('el botón del chip es nativo y mide 44 px', async () => {
    rutasBase();
    const { contexto } = await montar();
    contexto.setEstructura('histo_osteoclasto');
    await abrir();
    const chip = porId('mentor-explicame-chip')!;
    expect(chip.tagName).toBe('BUTTON');
    expect(chip.getAttribute('type')).toBe('button');
    expect(chip.className).toContain('min-h-11');
  });
});

describe('Atajo "Preguntar al mentor" y evento de documento', () => {
  it('con el panel cerrado y algo seleccionado aparece; al pulsarlo abre y envía la pregunta', async () => {
    rutasBase();
    ruta('POST /chat', () => respuestaSse([sseSesion(3), sseTexto('Respuesta'), sseFin()]));
    const { contexto } = await montar();
    expect(porId('mentor-preguntar-seleccion')).toBeNull();
    contexto.setEstructura('histo_osteoclasto');
    await nextTick();
    const atajo = porId('mentor-preguntar-seleccion')!;
    expect(atajo.tagName).toBe('BUTTON');
    expect(atajo.textContent).toContain('Preguntar al mentor');
    expect(atajo.textContent).toContain('sobre Osteoclasto'); // para el lector de pantalla
    expect(atajo.className).toContain('min-h-11');

    atajo.click();
    await flushPromises();
    await flushPromises();
    expect(porId('mentor-panel')).not.toBeNull();
    expect(porId('mentor-preguntar-seleccion')).toBeNull(); // ya no hace falta
    const [pedido] = pedidosAlChat();
    expect(
      (pedido!.cuerpo as { messages: { content: string }[] }).messages.at(-1)!.content,
    ).toContain('«Osteoclasto»');
    expect(mensajes()).toHaveLength(2);
  });

  it('el atajo desaparece al quitar la selección', async () => {
    rutasBase();
    const { contexto } = await montar();
    contexto.setEstructura('histo_osteoclasto');
    await nextTick();
    contexto.setEstructura(undefined);
    await nextTick();
    expect(porId('mentor-preguntar-seleccion')).toBeNull();
  });

  it('recupera la conversación guardada antes de enviar, en vez de abrir otra', async () => {
    rutasBase();
    ruta('GET /chat/history', historial);
    ruta('POST /chat', () => respuestaSse([sseSesion(9), sseTexto('Sigo'), sseFin()]));
    const { contexto } = await montar();
    contexto.setEstructura('histo_osteoclasto');
    await nextTick();
    porId('mentor-preguntar-seleccion')!.click();
    await flushPromises();
    await flushPromises();
    const cuerpo = pedidosAlChat()[0]!.cuerpo as Record<string, unknown>;
    expect(cuerpo.session_id).toBe(9);
    expect(mensajes()).toHaveLength(4); // 2 guardados + pregunta + respuesta
  });

  it('el evento "ova:preguntar-al-mentor" abre el panel y envía el texto', async () => {
    rutasBase();
    ruta('POST /chat', () => respuestaSse([sseSesion(3), sseTexto('Ok'), sseFin()]));
    await montar();
    preguntarAlMentor('¿Qué es la lámina cribiforme?');
    await flushPromises();
    await flushPromises();
    expect(porId('mentor-panel')).not.toBeNull();
    const [pedido] = pedidosAlChat();
    expect((pedido!.cuerpo as { messages: unknown[] }).messages).toEqual([
      { role: 'user', content: '¿Qué es la lámina cribiforme?' },
    ]);
  });

  it('un evento sin texto válido se ignora', async () => {
    rutasBase();
    await montar();
    document.dispatchEvent(new CustomEvent('ova:preguntar-al-mentor', { detail: { texto: '  ' } }));
    document.dispatchEvent(new CustomEvent('ova:preguntar-al-mentor', { detail: 5 }));
    await flushPromises();
    expect(porId('mentor-panel')).toBeNull();
    expect(pedidosAlChat()).toHaveLength(0);
  });
});

describe('Ponme a prueba (F4-03)', () => {
  it('el estado vacío ofrece el quiz; muestra las preguntas, da retroalimentación y dice que no da puntos', async () => {
    rutasBase();
    ruta('POST /mentor/quiz', quiz);
    const { contexto } = await montar();
    contexto.setModulo(3);
    contexto.setSeccion('m3_2_rankl');
    await abrir();
    await clic('mentor-a-prueba');
    await flushPromises();

    expect(porId('mentor-quiz')).not.toBeNull();
    expect(porId('mentor-campo')).toBeNull(); // el campo del chat no estorba
    expect(porId('quiz-nota-practica')!.textContent).toContain('no suma puntos ni logros');
    const pedido = llamadas.find((l) => l.url.includes('/mentor/quiz'))!;
    expect(pedido.cuerpo).toMatchObject({ contexto: { modulo: 3, seccion: 'm3_2_rankl' } });

    qa('[data-testid="quiz-opcion"]')[1]!.click();
    await flushPromises();
    expect(porId('quiz-veredicto')!.textContent).toBe('¡Correcto!');
    // Nada salió hacia actividades, progreso ni logros.
    expect(llamadas.some((l) => /activities|progress|achievements|logros/.test(l.url))).toBe(false);
  });

  it('desde la cabecera también se abre, y "Volver al chat" regresa sin perder el quiz', async () => {
    rutasBase();
    ruta('POST /mentor/quiz', quiz);
    await montar();
    await abrir();
    await clic('mentor-abrir-quiz');
    expect(porId('quiz-pregunta')).not.toBeNull();
    expect(porId('mentor-abrir-quiz')).toBeNull(); // dentro del quiz no se ofrece otra vez

    qa('[data-testid="quiz-opcion"]')[1]!.click();
    await flushPromises();
    await clic('quiz-volver');
    expect(porId('mentor-campo')).not.toBeNull();
    expect(porId('mentor-quiz')).toBeNull();

    await clic('mentor-abrir-quiz'); // retoma el mismo quiz, sin pedir otro
    expect(llamadas.filter((l) => l.url.includes('/mentor/quiz'))).toHaveLength(1);
    expect(porId('quiz-veredicto')!.textContent).toBe('¡Correcto!');
  });

  it('un error de la API se muestra con Reintentar y sin texto técnico', async () => {
    rutasBase();
    ruta('POST /mentor/quiz', () => respuestaError(502, 'quiz_invalido', 'Traceback'));
    await montar();
    await abrir();
    await clic('mentor-a-prueba');
    await flushPromises();
    expect(porId('quiz-error')!.textContent).toContain('No se pudo preparar el quiz');
    expect(porId('quiz-error')!.textContent).not.toContain('Traceback');
    expect(porId('quiz-reintentar')).not.toBeNull();
  });
});
