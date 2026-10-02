/**
 * Pruebas de ActividadVideoTexto (medios "animacion" y "video"): conformidad con el contrato de
 * las actividades, flujo feliz y de error, intentos y penalización, estado previo (también tardío),
 * teclado y lector de pantalla, gesto táctil, prefers-reduced-motion, desmontaje limpio y
 * configuraciones adversariales.
 */
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { UMBRAL_VIDEO_VISTO } from '@/activities/types';
import type {
  InteraccionActividad,
  ProgresoActividad,
  PropsActividadVideoTexto,
  ResultadoActividad,
} from '@/activities/types';
import { PROGRESO_INTERVALO_MIN_MS } from '@/content/constantes';
import { buscarActividad } from '@/content/consultas';
import type {
  ActividadVideoTexto as DatosVideoTexto,
  ConfigAnimacion,
  ConfigVideo,
} from '@/content/schema';
import { pruebasDeContratoActividad, problemasDeEmisiones } from '@/content/__fixtures__/contrato';
import type { EventosEmitidos } from '@/content/__fixtures__/contrato';
import { muestra, validar } from '@/content/__fixtures__/utiles';
import SVG_REMODELADO from '@/content/__fixtures__/svg/remodelado_pasos.svg?raw';
import ActividadVideoTexto from './ActividadVideoTexto.vue';
import { duracionDePasoMs } from './video';

/* ------------------------------------------- Datos ------------------------------------------- */

const modulo = validar(muestra()).modulo!;
const animacion = buscarActividad(modulo, 'm1_animacion_remodelado')!.actividad as DatosVideoTexto;
const video = buscarActividad(modulo, 'm1_video_docente')!.actividad as DatosVideoTexto;

const configAnimacion = animacion.config as ConfigAnimacion;
const configVideo = video.config as ConfigVideo;

function conConfig(base: DatosVideoTexto, cambios: Record<string, unknown>) {
  return {
    ...base,
    config: { ...base.config, ...cambios },
  } as DatosVideoTexto;
}

function conActividad(base: DatosVideoTexto, cambios: Record<string, unknown>) {
  return { ...base, ...cambios } as DatosVideoTexto;
}

function pasoSintetico(i: number, extra: Record<string, unknown> = {}) {
  return {
    id: `paso_${i}`,
    titulo: `Paso número ${i}`,
    texto: `Texto del paso número ${i} con longitud suficiente.`,
    visibles: ['fondo_hueso'],
    resaltadas: [],
    ...extra,
  };
}

function animacionConPasos(n: number): DatosVideoTexto {
  return conConfig(animacion, { pasos: Array.from({ length: n }, (_, i) => pasoSintetico(i + 1)) });
}

/* ------------------------------------------ Simulacros --------------------------------------- */

interface Consulta {
  matches: boolean;
}

/** `matchMedia` simulado: solo `prefers-reduced-motion: reduce` puede valer `true`. */
function simularMovimientoReducido(reducido: boolean) {
  const escuchas = new Set<(e: { matches: boolean }) => void>();
  const consulta: Consulta & Record<string, unknown> = {
    matches: false,
    media: '',
    onchange: null,
    addEventListener: (_t: string, fn: (e: { matches: boolean }) => void) => escuchas.add(fn),
    removeEventListener: (_t: string, fn: (e: { matches: boolean }) => void) => escuchas.delete(fn),
    addListener: (fn: (e: { matches: boolean }) => void) => escuchas.add(fn),
    removeListener: (fn: (e: { matches: boolean }) => void) => escuchas.delete(fn),
    dispatchEvent: () => true,
  };
  const matchMedia = vi.fn((consultaTexto: string) => ({
    ...consulta,
    media: consultaTexto,
    matches: reducido && /prefers-reduced-motion:\s*reduce/.test(consultaTexto),
  }));
  vi.stubGlobal('matchMedia', matchMedia);
  (window as unknown as { matchMedia: unknown }).matchMedia = matchMedia;
  return { escuchas };
}

interface FetchSimulado {
  fn: ReturnType<typeof vi.fn>;
  senales: AbortSignal[];
}

/** Sustituye `fetch`: cada llamada la resuelve `respuesta` (o queda colgada hasta abortarse). */
function simularFetch(
  respuesta: (url: string) => Promise<Response> | Response | 'colgar' = () =>
    new Response(SVG_REMODELADO, { status: 200 }),
): FetchSimulado {
  const senales: AbortSignal[] = [];
  const fn = vi.fn((entrada: string | URL, init?: RequestInit) => {
    const senal = init?.signal ?? undefined;
    if (senal) senales.push(senal);
    const r = respuesta(String(entrada));
    if (r === 'colgar') {
      return new Promise<Response>((_, rechazar) => {
        senal?.addEventListener('abort', () => rechazar(new DOMException('abort', 'AbortError')));
      });
    }
    return Promise.resolve(r);
  });
  vi.stubGlobal('fetch', fn);
  return { fn, senales };
}

/** Rangos de tiempo mínimos para simular `video.played`. */
function rangos(...tramos: [number, number][]) {
  return {
    length: tramos.length,
    start: (i: number) => tramos[i]![0],
    end: (i: number) => tramos[i]![1],
  };
}

interface VideoControlable {
  el: HTMLVideoElement;
  reproducido: (...tramos: [number, number][]) => void;
  pausa: ReturnType<typeof vi.fn>;
  carga: ReturnType<typeof vi.fn>;
}

/** Deja el `<video>` de happy-dom con `duration`, `played`, `pause` y `load` controlables. */
function controlarVideo(wrapper: VueWrapper, duracion: number): VideoControlable {
  const el = wrapper.find('video').element as HTMLVideoElement;
  let tramos: [number, number][] = [];
  Object.defineProperty(el, 'duration', { configurable: true, get: () => duracion });
  Object.defineProperty(el, 'played', { configurable: true, get: () => rangos(...tramos) });
  const pausa = vi.fn();
  const carga = vi.fn();
  (el as unknown as { pause: unknown }).pause = pausa;
  (el as unknown as { load: unknown }).load = carga;
  return {
    el,
    reproducido: (...nuevos) => {
      tramos = nuevos;
    },
    pausa,
    carga,
  };
}

async function medirVideo(v: VideoControlable, evento = 'timeupdate'): Promise<void> {
  v.el.dispatchEvent(new Event(evento));
  await nextTick();
}

/* ------------------------------------------- Montaje ----------------------------------------- */

const montados: VueWrapper[] = [];

function montar(
  actividad: DatosVideoTexto,
  extra: Partial<PropsActividadVideoTexto> & Record<string, unknown> = {},
  atado = false,
): VueWrapper {
  const wrapper = mount(ActividadVideoTexto, {
    props: { actividad, modulo: 1, ...extra } as PropsActividadVideoTexto,
    attachTo: atado ? document.body : undefined,
  }) as unknown as VueWrapper;
  montados.push(wrapper);
  return wrapper;
}

async function montarListo(
  actividad: DatosVideoTexto,
  extra: Partial<PropsActividadVideoTexto> & Record<string, unknown> = {},
  atado = false,
): Promise<VueWrapper> {
  const wrapper = montar(actividad, extra, atado);
  await flushPromises();
  return wrapper;
}

async function clic(wrapper: VueWrapper, testid: string): Promise<void> {
  await wrapper.get(`[data-testid="${testid}"]`).trigger('click');
  await flushPromises();
}

async function siguiente(wrapper: VueWrapper, veces = 1): Promise<void> {
  for (let i = 0; i < veces; i++) await clic(wrapper, 'siguiente');
}

/** Lleva la animación de 4 pasos hasta el final. */
async function completarAnimacion(wrapper: VueWrapper): Promise<void> {
  const total = Number(/de (\d+)/.exec(wrapper.get('[data-testid="contador-paso"]').text())?.[1]);
  await siguiente(wrapper, total - 1);
}

function eventos(wrapper: VueWrapper): EventosEmitidos {
  return wrapper.emitted() as EventosEmitidos;
}

function completadas(wrapper: VueWrapper): ResultadoActividad<'video-texto'>[] {
  return (wrapper.emitted('completada') ?? []).map(
    (a) => a[0] as ResultadoActividad<'video-texto'>,
  );
}

function progresos(wrapper: VueWrapper): ProgresoActividad[] {
  return (wrapper.emitted('progreso') ?? []).map((a) => a[0] as ProgresoActividad);
}

function interacciones(wrapper: VueWrapper): InteraccionActividad[] {
  return (wrapper.emitted('interaccion') ?? []).map((a) => a[0] as InteraccionActividad);
}

function contador(wrapper: VueWrapper): string {
  return wrapper.get('[data-testid="contador-paso"]').text();
}

function puntero(
  el: Element,
  tipo: 'pointerdown' | 'pointerup' | 'pointercancel',
  init: { x: number; y: number; pointerType?: string; pointerId?: number },
): void {
  el.dispatchEvent(
    new PointerEvent(tipo, {
      bubbles: true,
      pointerType: init.pointerType ?? 'touch',
      pointerId: init.pointerId ?? 1,
      clientX: init.x,
      clientY: init.y,
    }),
  );
}

beforeEach(() => {
  simularFetch();
  simularMovimientoReducido(false);
});

afterEach(() => {
  while (montados.length > 0) {
    const w = montados.pop()!;
    try {
      w.unmount();
    } catch {
      // Ya desmontado por la propia prueba.
    }
  }
  vi.useRealTimers();
  document.body.innerHTML = '';
});

/* ============================================================================================= */
/* Contrato                                                                                      */
/* ============================================================================================= */

pruebasDeContratoActividad<'video-texto'>({
  nombre: 'ActividadVideoTexto (animación)',
  actividad: animacion,
  montar: (props) => mount(ActividadVideoTexto, { props }) as unknown as VueWrapper,
  completar: completarAnimacion,
  precisionEsperada: 1,
});

pruebasDeContratoActividad<'video-texto'>({
  nombre: 'ActividadVideoTexto (video, "Ya leí la transcripción")',
  actividad: video,
  montar: (props) => mount(ActividadVideoTexto, { props }) as unknown as VueWrapper,
  completar: async (wrapper) => {
    await wrapper.get('[data-testid="transcripcion-leida"]').trigger('click');
  },
  precisionEsperada: 1,
});

pruebasDeContratoActividad<'video-texto'>({
  nombre: 'ActividadVideoTexto (video, viéndolo)',
  actividad: video,
  montar: (props) => mount(ActividadVideoTexto, { props }) as unknown as VueWrapper,
  completar: async (wrapper) => {
    const v = controlarVideo(wrapper, 100);
    v.reproducido([0, 95]);
    await medirVideo(v);
  },
  precisionEsperada: 1,
});

/* ============================================================================================= */
/* Animación                                                                                     */
/* ============================================================================================= */

describe('animación: flujo feliz', () => {
  it('muestra el título, las instrucciones, el paso 1 y el texto de cada paso', async () => {
    const wrapper = await montarListo(animacion);
    expect(wrapper.get('h3').text()).toBe(animacion.titulo);
    expect(wrapper.text()).toContain(animacion.instrucciones);
    expect(contador(wrapper)).toBe('Paso 1 de 4');
    expect(wrapper.get('[data-testid="titulo-paso"]').text()).toBe('Superficie en reposo');
    expect(wrapper.get('[data-testid="texto-paso"]').text()).toContain('células de revestimiento');
    // El texto de todos los pasos está en la transcripción, a un toque de distancia.
    const transcripcion = wrapper.get('[data-testid="transcripcion"]').text();
    for (const p of configAnimacion.pasos) expect(transcripcion).toContain(p.titulo);
  });

  it('no arranca nada solo: sin reproducción, sin eventos y sin temporizadores al montar', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const wrapper = await montarListo(animacion);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(contador(wrapper)).toBe('Paso 1 de 4');
    expect(wrapper.get('[data-testid="reproducir"]').text()).toContain('Reproducir');
    expect(wrapper.emitted('interaccion')).toBeUndefined();
    expect(wrapper.emitted('progreso')).toBeUndefined();
  });

  it('cada "Siguiente" avanza un paso, emite avanza_paso con su id y anuncia el paso', async () => {
    const wrapper = await montarListo(animacion);
    await siguiente(wrapper);
    expect(contador(wrapper)).toBe('Paso 2 de 4');
    expect(interacciones(wrapper)).toEqual([{ accion: 'avanza_paso', objeto: 'paso_reabsorcion' }]);
    const anuncio = wrapper.get('[data-testid="anuncio"]');
    expect(anuncio.attributes('aria-live')).toBe('polite');
    expect(anuncio.text()).toContain('Paso 2 de 4: Reabsorción');
    expect(anuncio.text()).toContain('osteoclasto'); // texto plano, sin la sintaxis del enlace
    expect(anuncio.text()).not.toContain('glosario:');
  });

  it('completa al llegar al último paso con el detalle, el puntaje y el foco en el resultado', async () => {
    const wrapper = await montarListo(animacion, {}, true);
    await completarAnimacion(wrapper);
    const [resultado, ...otros] = completadas(wrapper);
    expect(otros).toEqual([]);
    expect(resultado).toEqual({
      puntaje: 20,
      intentos: 1,
      precision: 1,
      detalle: { medio: 'animacion', pasos_vistos: 4 },
    });
    expect(problemasDeEmisiones(eventos(wrapper), animacion)).toEqual([]);
    await nextTick();
    const titulo = wrapper.get('[data-testid="resultado"] h4');
    expect(document.activeElement).toBe(titulo.element);
    expect(wrapper.get('[data-testid="retroalimentacion"]').text()).toContain(
      animacion.retroalimentacion.correcta,
    );
    expect(wrapper.get('[data-testid="puntaje-obtenido"]').text()).toContain('20 de 20');
    expect(wrapper.get('[data-testid="anuncio"]').text()).toContain('Actividad completada');
  });

  it('progreso: sale el primero enseguida, lleva el intento y una instantánea con índices', async () => {
    const wrapper = await montarListo(animacion);
    await siguiente(wrapper);
    expect(progresos(wrapper)).toEqual([
      { avance: 1 / 3, intentos: 1, instantanea: { paso: 1, maximo: 1 } },
    ]);
  });

  it('"Anterior" retrocede sin quitar lo ya visto y emite avanza_paso del paso al que vuelve', async () => {
    const wrapper = await montarListo(animacion);
    await siguiente(wrapper, 2);
    await clic(wrapper, 'anterior');
    expect(contador(wrapper)).toBe('Paso 2 de 4');
    expect(interacciones(wrapper).at(-1)).toEqual({
      accion: 'avanza_paso',
      objeto: 'paso_reabsorcion',
    });
    await siguiente(wrapper, 2);
    expect(completadas(wrapper)).toHaveLength(1);
    expect(completadas(wrapper)[0]!.detalle).toEqual({ medio: 'animacion', pasos_vistos: 4 });
  });

  it('en el primer paso "Anterior" no hace nada y en el último "Siguiente" tampoco', async () => {
    const wrapper = await montarListo(animacion);
    await clic(wrapper, 'anterior');
    expect(contador(wrapper)).toBe('Paso 1 de 4');
    expect(wrapper.get('[data-testid="anterior"]').attributes('aria-disabled')).toBe('true');
    expect(wrapper.emitted('interaccion')).toBeUndefined();
    await completarAnimacion(wrapper);
    const antes = interacciones(wrapper).length;
    await clic(wrapper, 'siguiente');
    expect(contador(wrapper)).toBe('Paso 4 de 4');
    expect(interacciones(wrapper)).toHaveLength(antes);
    expect(wrapper.get('[data-testid="siguiente"]').attributes('aria-disabled')).toBe('true');
  });

  it('pasar de nuevo por el último paso tras completar no vuelve a emitir "completada"', async () => {
    const wrapper = await montarListo(animacion);
    await completarAnimacion(wrapper);
    await clic(wrapper, 'anterior');
    await clic(wrapper, 'siguiente');
    expect(completadas(wrapper)).toHaveLength(1);
  });
});

describe('animación: el SVG', () => {
  function estados(wrapper: VueWrapper): Record<string, string | null> {
    const grupos = wrapper.element.querySelectorAll('[data-testid="svg-animacion"] svg > g');
    return Object.fromEntries(
      Array.from(grupos, (g: Element) => [
        g.id.replace(/^.*?__/, ''),
        g.getAttribute('data-estado'),
      ]),
    );
  }

  it('inyecta el SVG (no <img>), con el viewBox del contenido y sin tamaño fijo', async () => {
    const wrapper = await montarListo(animacion);
    const svg = wrapper.get('[data-testid="svg-animacion"] svg').element;
    expect(svg.getAttribute('viewBox')).toBe('0 0 800 400');
    expect(svg.hasAttribute('width')).toBe(false);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper.find('img').exists()).toBe(false);
    const rol = wrapper.get('[data-testid="svg-animacion"]');
    expect(rol.attributes('role')).toBe('img');
    expect(rol.attributes('aria-label')).toBe(configAnimacion.alt);
  });

  it('cada paso muestra únicamente los grupos de "visibles" y resalta "resaltadas"', async () => {
    const wrapper = await montarListo(animacion);
    expect(estados(wrapper)).toEqual({
      fondo_hueso: 'visible',
      osteoclasto_activo: 'oculta',
      cavidad_reabsorcion: 'oculta',
      osteoblasto_activo: 'oculta',
      matriz_nueva: 'oculta',
    });
    await siguiente(wrapper);
    expect(estados(wrapper)).toEqual({
      fondo_hueso: 'visible',
      osteoclasto_activo: 'visible',
      cavidad_reabsorcion: 'visible',
      osteoblasto_activo: 'oculta',
      matriz_nueva: 'oculta',
    });
    const osteoclasto = wrapper.element.querySelector('[id$="__osteoclasto_activo"]') as SVGElement;
    // Resaltado sin depender del color: contorno más grueso (3 -> 6).
    expect(osteoclasto.getAttribute('data-resaltada')).toBe('true');
    expect(osteoclasto.querySelector('ellipse')!.getAttribute('stroke-width')).toBe('6');
    const cavidad = wrapper.element.querySelector('[id$="__cavidad_reabsorcion"]') as SVGElement;
    expect(cavidad.hasAttribute('data-resaltada')).toBe(false);
    expect(osteoclasto.style.visibility).toBe('visible');
    const oculto = wrapper.element.querySelector('[id$="__matriz_nueva"]') as SVGElement;
    expect(oculto.style.visibility).toBe('hidden');
    // Al pasar de paso, el resaltado anterior se restaura al grosor original.
    await siguiente(wrapper);
    expect(osteoclasto.hasAttribute('data-resaltada')).toBe(false);
  });

  it('al retroceder restaura el grosor original del contorno', async () => {
    const wrapper = await montarListo(animacion);
    await siguiente(wrapper);
    await clic(wrapper, 'anterior');
    const elipse = wrapper.element.querySelector('[id$="__osteoclasto_activo"] ellipse')!;
    expect(elipse.getAttribute('stroke-width')).toBe('3');
  });

  it('los ids que el paso menciona y no existen en el SVG se ignoran', async () => {
    const actividad = conConfig(animacion, {
      pasos: [
        pasoSintetico(1, { visibles: ['fondo_hueso', 'no_existe'], resaltadas: ['no_existe'] }),
        pasoSintetico(2, { visibles: ['fondo_hueso', 'matriz_nueva'] }),
      ],
    });
    const wrapper = await montarListo(actividad);
    expect(estados(wrapper).fondo_hueso).toBe('visible');
    await siguiente(wrapper);
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it('con prefers-reduced-motion los cambios son inmediatos (sin transición)', async () => {
    simularMovimientoReducido(true);
    const wrapper = await montarListo(animacion);
    await siguiente(wrapper);
    const grupo = wrapper.element.querySelector('[id$="__osteoclasto_activo"]') as SVGElement;
    expect(grupo.style.transition).toBe('none');
  });

  it('sin reduced-motion los grupos cambian con un fundido de opacidad', async () => {
    const wrapper = await montarListo(animacion);
    await siguiente(wrapper);
    const grupo = wrapper.element.querySelector('[id$="__osteoclasto_activo"]') as SVGElement;
    expect(grupo.style.transition).toContain('opacity');
  });

  it('saneamiento: no deja scripts, atributos on*, href ni url() externos; prefija los ids referenciados', async () => {
    const hostil = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="900" height="500">
      <script>alert(1)</script>
      <defs><linearGradient id="degradado"><stop offset="0" stop-color="#fff"/></linearGradient></defs>
      <g id="fondo_hueso" onclick="alert(2)">
        <rect width="10" height="10" fill="url(#degradado)" stroke="url(https://malo.example/x)"/>
        <use href="https://malo.example/x.svg#a"/>
        <a href="javascript:alert(3)"><rect width="5" height="5"/></a>
        <foreignObject><div>hola</div></foreignObject>
        <image href="data:image/png;base64,AAAA"/>
      </g>
      <g id="osteoclasto_activo"><animate attributeName="x" to="3"/></g>
    </svg>`;
    simularFetch(() => new Response(hostil, { status: 200 }));
    const wrapper = await montarListo(animacion);
    const svg = wrapper.get('[data-testid="svg-animacion"]').element;
    expect(svg.querySelector('script, foreignObject, image, animate')).toBeNull();
    expect(svg.innerHTML).not.toMatch(/onclick|javascript:|malo\.example/i);
    expect(svg.querySelector('linearGradient')!.getAttribute('id')).toBe(
      'm1_animacion_remodelado__degradado',
    );
    expect(svg.querySelector('rect')!.getAttribute('fill')).toBe(
      'url(#m1_animacion_remodelado__degradado)',
    );
    // El grupo controlable se sigue encontrando por su id original (el mapa de grupos) y su id del DOM lleva el prefijo.
    expect(
      svg.querySelector('#m1_animacion_remodelado__fondo_hueso')!.getAttribute('data-estado'),
    ).toBe('visible');
    expect(svg.querySelector('#fondo_hueso')).toBeNull();
    expect(svg.querySelector('svg')!.hasAttribute('width')).toBe(false);
  });

  it('el mismo dibujo en dos actividades no repite los ids referenciados', async () => {
    const conRef = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">
      <defs><linearGradient id="grad"/></defs>
      <g id="fondo_hueso"><rect width="9" height="9" fill="url(#grad)"/></g></svg>`;
    simularFetch(() => new Response(conRef, { status: 200 }));
    const a = await montarListo(conActividad(animacion, { id: 'm1_a' }), {}, true);
    const b = await montarListo(conActividad(animacion, { id: 'm1_b' }), {}, true);
    const ids = Array.from(document.querySelectorAll('linearGradient'), (n) => n.id);
    expect(ids.sort()).toEqual(['m1_a__grad', 'm1_b__grad']);
    a.unmount();
    b.unmount();
  });
});

describe('animación: ids únicos en el DOM', () => {
  it('dos dibujos con el mismo <g id="fondo_escena"> en la página no repiten ningún id', async () => {
    // Seis SVG del módulo 5 comparten `fondo_escena`; nadie lo referencia, así que antes se repetía.
    const comun = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">
      <title id="titulo_dibujo">Dibujo</title>
      <g id="fondo_escena" aria-labelledby="titulo_dibujo"><rect width="9" height="9"/></g>
      <g id="fondo_hueso"><rect width="4" height="4"/></g></svg>`;
    simularFetch(() => new Response(comun, { status: 200 }));
    const a = await montarListo(conActividad(animacion, { id: 'm5_a' }), {}, true);
    const b = await montarListo(conActividad(animacion, { id: 'm5_b' }), {}, true);
    const ids = Array.from(document.querySelectorAll('[id]'), (n) => n.id).filter((id) =>
      /fondo_|titulo_dibujo/.test(id),
    );
    expect(ids.sort()).toEqual([
      'm5_a__fondo_escena',
      'm5_a__fondo_hueso',
      'm5_a__titulo_dibujo',
      'm5_b__fondo_escena',
      'm5_b__fondo_hueso',
      'm5_b__titulo_dibujo',
    ]);
    // La referencia por lista de ids sigue apuntando al de su propio dibujo.
    expect(document.querySelector('#m5_a__fondo_escena')!.getAttribute('aria-labelledby')).toBe(
      'm5_a__titulo_dibujo',
    );
    // Los grupos se siguen controlando por su id original: el paso 1 deja visible `fondo_hueso`.
    expect(document.querySelector('#m5_a__fondo_hueso')!.getAttribute('data-estado')).toBe(
      'visible',
    );
    a.unmount();
    b.unmount();
  });
});

describe('animación: carga y error del SVG', () => {
  it('muestra "Cargando la ilustración" mientras espera y el texto ya está disponible', async () => {
    simularFetch(() => 'colgar');
    const wrapper = await montarListo(animacion);
    expect(wrapper.text()).toContain('Cargando la ilustración');
    expect(contador(wrapper)).toBe('Paso 1 de 4');
    await siguiente(wrapper, 3);
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it.each([
    ['la red falla', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['responde 404', () => new Response('no', { status: 404 })],
    ['no es un SVG', () => new Response('<html><body>hola</body></html>', { status: 200 })],
    ['XML mal formado', () => new Response('<svg viewBox="0 0 1 1"><g>', { status: 200 })],
    [
      'tiene DOCTYPE',
      () => new Response('<!DOCTYPE svg [<!ENTITY a "b">]><svg/>', { status: 200 }),
    ],
    ['pesa demasiado', () => new Response(`<svg>${'x'.repeat(210 * 1024)}</svg>`, { status: 200 })],
  ])(
    'si %s: dice que no se pudo cargar, sigue la explicación con texto y se puede completar',
    async (_n, respuesta) => {
      simularFetch(respuesta as never);
      const wrapper = await montarListo(animacion);
      const error = wrapper.get('[data-testid="error-svg"]');
      expect(error.text()).toContain('No se pudo cargar la ilustración');
      expect(error.attributes('role')).toBe('status');
      expect(error.text()).toContain('texto de cada paso');
      await completarAnimacion(wrapper);
      expect(completadas(wrapper)).toHaveLength(1);
    },
  );

  it('"Reintentar" vuelve a pedir el SVG y lo muestra si esta vez llega', async () => {
    let intento = 0;
    const sim = simularFetch(() =>
      ++intento === 1 ? new Response('x', { status: 500 }) : new Response(SVG_REMODELADO),
    );
    const wrapper = await montarListo(animacion);
    expect(wrapper.find('[data-testid="error-svg"]').exists()).toBe(true);
    await wrapper.get('[data-testid="error-svg"] button').trigger('click');
    await flushPromises();
    expect(sim.fn).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="error-svg"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="svg-animacion"] svg').exists()).toBe(true);
  });

  it('si cambia la ruta del SVG cancela la descarga anterior y carga la nueva', async () => {
    const sim = simularFetch(() => 'colgar');
    const wrapper = await montarListo(animacion);
    await wrapper.setProps({
      actividad: conConfig(animacion, { svg: '/images/m1/otro.svg' }),
    } as never);
    await flushPromises();
    expect(sim.senales[0]!.aborted).toBe(true);
    expect(sim.fn.mock.calls.at(-1)![0]).toBe('/images/m1/otro.svg');
  });
});

describe('animación: reproducción automática', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });

  it('Reproducir avanza solo, con espera proporcional al texto, y Pausar la detiene', async () => {
    const wrapper = await montarListo(animacion);
    await clic(wrapper, 'reproducir');
    expect(wrapper.get('[data-testid="reproducir"]').text()).toContain('Pausar');
    const espera = duracionDePasoMs(
      'El hueso está cubierto por células de revestimiento y no se está renovando en este punto.',
    );
    await vi.advanceTimersByTimeAsync(espera - 1);
    expect(contador(wrapper)).toBe('Paso 1 de 4');
    await vi.advanceTimersByTimeAsync(2);
    expect(contador(wrapper)).toBe('Paso 2 de 4');
    await clic(wrapper, 'reproducir'); // Pausar
    expect(wrapper.get('[data-testid="reproducir"]').text()).toContain('Reproducir');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(contador(wrapper)).toBe('Paso 2 de 4');
  });

  it('reproduciendo llega al final, completa una vez y se detiene', async () => {
    const wrapper = await montarListo(animacion);
    await clic(wrapper, 'reproducir');
    await vi.advanceTimersByTimeAsync(200_000);
    await flushPromises();
    expect(contador(wrapper)).toBe('Paso 4 de 4');
    expect(completadas(wrapper)).toHaveLength(1);
    expect(wrapper.get('[data-testid="reproducir"]').text()).toContain('Reproducir');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reproducir estando en el último paso vuelve al primero', async () => {
    const wrapper = await montarListo(animacion);
    await completarAnimacion(wrapper);
    await clic(wrapper, 'reproducir');
    expect(contador(wrapper)).toBe('Paso 1 de 4');
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it('avanzar a mano mientras reproduce reprograma la espera (sin saltos dobles)', async () => {
    const wrapper = await montarListo(animacion);
    await clic(wrapper, 'reproducir');
    await vi.advanceTimersByTimeAsync(4000);
    await siguiente(wrapper);
    expect(contador(wrapper)).toBe('Paso 2 de 4');
    await vi.advanceTimersByTimeAsync(4000); // la espera del paso anterior ya no cuenta
    expect(contador(wrapper)).toBe('Paso 2 de 4');
  });

  it('desmontar con la reproducción en marcha no deja temporizadores ni eventos', async () => {
    const wrapper = await montarListo(animacion);
    await clic(wrapper, 'reproducir');
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
    const antes = interacciones(wrapper).length;
    await vi.advanceTimersByTimeAsync(200_000);
    expect(interacciones(wrapper)).toHaveLength(antes);
  });
});

describe('animación: prefers-reduced-motion', () => {
  it('ofrece solo el avance manual: sin Reproducir y con un aviso', async () => {
    simularMovimientoReducido(true);
    const wrapper = await montarListo(animacion);
    expect(wrapper.find('[data-testid="reproducir"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="aviso-movimiento"]').text()).toContain('paso a paso');
    await completarAnimacion(wrapper);
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it('si el sistema pasa a pedir menos movimiento con la reproducción activa, se detiene', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const wrapper = await montarListo(animacion);
    await clic(wrapper, 'reproducir');
    simularMovimientoReducido(true);
    // `usePreferredReducedMotion` se suscribe en el montaje; se prueba reiniciando el montaje.
    wrapper.unmount();
    const otra = await montarListo(animacion);
    expect(otra.find('[data-testid="reproducir"]').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(200_000);
    expect(contador(otra)).toBe('Paso 1 de 4');
  });
});

describe('animación: táctil y teclado', () => {
  it('deslizar el dibujo a la izquierda avanza y a la derecha retrocede', async () => {
    const wrapper = await montarListo(animacion);
    const lienzo = wrapper.get('[data-testid="lienzo"]').element;
    puntero(lienzo, 'pointerdown', { x: 300, y: 100 });
    puntero(lienzo, 'pointerup', { x: 200, y: 105 });
    await nextTick();
    expect(contador(wrapper)).toBe('Paso 2 de 4');
    puntero(lienzo, 'pointerdown', { x: 100, y: 100 });
    puntero(lienzo, 'pointerup', { x: 220, y: 90 });
    await nextTick();
    expect(contador(wrapper)).toBe('Paso 1 de 4');
  });

  it('un deslizamiento corto, vertical (desplazar la página), con ratón o cancelado no cambia de paso', async () => {
    const wrapper = await montarListo(animacion);
    const lienzo = wrapper.get('[data-testid="lienzo"]').element;
    puntero(lienzo, 'pointerdown', { x: 300, y: 100 });
    puntero(lienzo, 'pointerup', { x: 270, y: 100 }); // 30 px: demasiado corto
    puntero(lienzo, 'pointerdown', { x: 300, y: 100 });
    puntero(lienzo, 'pointerup', { x: 200, y: 260 }); // sobre todo vertical
    puntero(lienzo, 'pointerdown', { x: 300, y: 100, pointerType: 'mouse' });
    puntero(lienzo, 'pointerup', { x: 100, y: 100, pointerType: 'mouse' });
    puntero(lienzo, 'pointerdown', { x: 300, y: 100 });
    puntero(lienzo, 'pointercancel', { x: 300, y: 100 });
    puntero(lienzo, 'pointerup', { x: 100, y: 100 });
    await nextTick();
    expect(contador(wrapper)).toBe('Paso 1 de 4');
    expect(wrapper.emitted('interaccion')).toBeUndefined();
  });

  it('un deslizamiento de otro puntero (otro dedo) no cuenta', async () => {
    const wrapper = await montarListo(animacion);
    const lienzo = wrapper.get('[data-testid="lienzo"]').element;
    puntero(lienzo, 'pointerdown', { x: 300, y: 100, pointerId: 1 });
    puntero(lienzo, 'pointerup', { x: 100, y: 100, pointerId: 2 });
    await nextTick();
    expect(contador(wrapper)).toBe('Paso 1 de 4');
  });

  it('el lienzo solo permite desplazamiento vertical (nunca bloquea el scroll de la página)', async () => {
    const wrapper = await montarListo(animacion);
    const clases = wrapper.get('[data-testid="lienzo"]').classes();
    expect(clases).toContain('touch-pan-y');
    expect(clases.join(' ')).not.toContain('touch-none');
  });

  it('los controles son botones nativos, con nombre, en orden lógico y con objetivo de 44 px', async () => {
    const wrapper = await montarListo(animacion);
    const botones = wrapper.get('[role="group"]').findAll('button');
    expect(botones.map((b) => b.text())).toEqual(['Anterior', 'Reproducir', 'Siguiente']);
    for (const b of botones) {
      expect(b.attributes('type')).toBe('button');
      expect(b.attributes('tabindex')).toBeUndefined();
      expect(b.classes()).toContain('h-11'); // 2,75 rem = 44 px
      expect(b.classes().join(' ')).not.toMatch(/\bh-(?:[1-9]|10)\b/);
    }
    expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe(
      'Controles de la explicación',
    );
    // Los iconos son decorativos.
    for (const svg of wrapper.get('[role="group"]').findAll('svg')) {
      expect(svg.attributes('aria-hidden')).toBe('true');
    }
  });

  it('la transcripción es un <details> nativo (teclado y lector) con todos los pasos', async () => {
    const wrapper = await montarListo(animacion);
    const detalles = wrapper.get('[data-testid="transcripcion"]');
    expect(detalles.element.tagName).toBe('DETAILS');
    expect(detalles.find('summary').text()).toContain('Transcripción');
    expect(detalles.findAll('li')).toHaveLength(4);
    await siguiente(wrapper);
    expect(detalles.findAll('li')[1]!.attributes('aria-current')).toBe('step');
  });

  it('el indicador de puntos es decorativo (aria-hidden) y no depende solo del color: hay texto "Paso x de y"', async () => {
    const wrapper = await montarListo(animacion);
    expect(wrapper.get('ol[aria-hidden="true"]').findAll('li')).toHaveLength(4);
    expect(contador(wrapper)).toBe('Paso 1 de 4');
  });

  it('el foco no se mueve al cambiar de paso ni al montar', async () => {
    const wrapper = await montarListo(animacion, {}, true);
    expect(document.activeElement).toBe(document.body);
    const boton = wrapper.get('[data-testid="siguiente"]').element as HTMLButtonElement;
    boton.focus();
    await siguiente(wrapper);
    expect(document.activeElement).toBe(boton);
  });
});

describe('animación: intentos y penalización', () => {
  it('repetir: intento 2, reinicia en el paso 1, emite reinicia_actividad y puntúa con 0,9', async () => {
    const wrapper = await montarListo(animacion);
    await completarAnimacion(wrapper);
    await clic(wrapper, 'repetir');
    expect(wrapper.find('[data-testid="resultado"]').exists()).toBe(false);
    expect(contador(wrapper)).toBe('Paso 1 de 4');
    expect(interacciones(wrapper).at(-1)).toEqual({ accion: 'reinicia_actividad' });
    await completarAnimacion(wrapper);
    const todas = completadas(wrapper);
    expect(todas).toHaveLength(2);
    expect(todas[1]).toMatchObject({ intentos: 2, puntaje: 18, precision: 1 });
    expect(wrapper.get('[data-testid="puntaje-obtenido"]').text()).toContain('18 de 20');
    expect(wrapper.get('[data-testid="puntaje-obtenido"]').text()).toContain('intento 2');
  });

  it('el puntaje baja hasta el piso (0,4) y no más', async () => {
    const wrapper = await montarListo(animacion, {
      estadoPrevio: { servidor: { puntaje: 20, intentos: 40, completada: true } },
    });
    await completarAnimacion(wrapper);
    expect(completadas(wrapper)[0]).toMatchObject({ intentos: 41, puntaje: 8 });
  });

  it('usa la penalización propia de la actividad (por_intento 0: no baja)', async () => {
    const actividad = conActividad(animacion, { penalizacion: { por_intento: 0, piso: 1 } });
    const wrapper = await montarListo(actividad, {
      estadoPrevio: { servidor: { puntaje: 20, intentos: 4, completada: true } },
    });
    await completarAnimacion(wrapper);
    expect(completadas(wrapper)[0]).toMatchObject({ intentos: 5, puntaje: 20 });
  });

  it('un progreso local más nuevo que el servidor conserva su número de intento', async () => {
    const wrapper = await montarListo(animacion, {
      estadoPrevio: {
        servidor: { puntaje: 20, intentos: 1, completada: true },
        progreso: { avance: 0.3, intentos: 4, instantanea: { paso: 1, maximo: 1 } },
      },
    });
    expect(contador(wrapper)).toBe('Paso 2 de 4');
    await siguiente(wrapper, 2);
    expect(completadas(wrapper)[0]).toMatchObject({ intentos: 4, puntaje: 14 });
    expect(progresos(wrapper).every((p) => p.intentos === 4)).toBe(true);
  });

  it('avisa si ya se completó antes (con el mejor puntaje) y sigue permitiendo repasarla', async () => {
    const wrapper = await montarListo(animacion, {
      estadoPrevio: { servidor: { puntaje: 18, intentos: 2, completada: true } },
    });
    expect(wrapper.get('[data-testid="aviso-repeticion"]').text()).toContain('18 de 20');
    await completarAnimacion(wrapper);
    expect(completadas(wrapper)[0]!.intentos).toBe(3);
  });
});

describe('animación: estado previo', () => {
  it('restaura el paso guardado', async () => {
    const wrapper = await montarListo(animacion, {
      estadoPrevio: {
        progreso: { avance: 0.33, intentos: 1, instantanea: { paso: 1, maximo: 1 } },
      },
    });
    expect(contador(wrapper)).toBe('Paso 2 de 4');
    expect(wrapper.get('[data-testid="titulo-paso"]').text()).toBe('Reabsorción');
    expect(wrapper.emitted('interaccion')).toBeUndefined();
  });

  it('una instantánea que ya estaba en el último paso reanuda en el penúltimo (sin completar sola)', async () => {
    const wrapper = await montarListo(animacion, {
      estadoPrevio: { progreso: { avance: 1, intentos: 1, instantanea: { paso: 3, maximo: 3 } } },
    });
    expect(contador(wrapper)).toBe('Paso 3 de 4');
    expect(wrapper.emitted('completada')).toBeUndefined();
    await siguiente(wrapper);
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it.each([
    ['índices fuera de rango', { paso: 99, maximo: 99 }],
    ['índices negativos', { paso: -1, maximo: -1 }],
    ['máximo menor que el paso', { paso: 2, maximo: 1 }],
    ['decimales', { paso: 1.5, maximo: 1.5 }],
    ['cadenas', { paso: '2', maximo: '2' }],
    ['nulos', { paso: null, maximo: null }],
    ['de un video', { visto: 0.5 }],
    ['vacía', {}],
  ])('ignora una instantánea inválida (%s)', async (_n, instantanea) => {
    const wrapper = await montarListo(animacion, {
      estadoPrevio: { progreso: { avance: 0.5, intentos: 1, instantanea: instantanea as never } },
    });
    expect(contador(wrapper)).toBe('Paso 1 de 4');
    await completarAnimacion(wrapper);
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it('una instantánea que llega tarde reposiciona mientras el estudiante no haya tocado nada', async () => {
    const wrapper = await montarListo(animacion);
    await wrapper.setProps({
      estadoPrevio: { progreso: { avance: 0.5, intentos: 1, instantanea: { paso: 2, maximo: 2 } } },
    } as never);
    await flushPromises();
    expect(contador(wrapper)).toBe('Paso 3 de 4');
  });

  it('una instantánea que llega tarde NO pisa lo que el estudiante ya hizo', async () => {
    const wrapper = await montarListo(animacion);
    await siguiente(wrapper);
    await wrapper.setProps({
      estadoPrevio: { progreso: { avance: 0.5, intentos: 1, instantanea: { paso: 2, maximo: 2 } } },
    } as never);
    await flushPromises();
    expect(contador(wrapper)).toBe('Paso 2 de 4');
  });

  it('el estado del servidor tardío tras interactuar no cambia el intento de esta ejecución', async () => {
    const wrapper = await montarListo(animacion);
    await siguiente(wrapper);
    await wrapper.setProps({
      estadoPrevio: { servidor: { puntaje: 5, intentos: 5, completada: true } },
    } as never);
    await flushPromises();
    await siguiente(wrapper, 2);
    expect(completadas(wrapper)[0]!.intentos).toBe(1);
  });

  it('tras repetir no se vuelve a aplicar la instantánea guardada', async () => {
    const wrapper = await montarListo(animacion, {
      estadoPrevio: {
        progreso: { avance: 0.33, intentos: 1, instantanea: { paso: 1, maximo: 1 } },
      },
    });
    await siguiente(wrapper, 2);
    await clic(wrapper, 'repetir');
    expect(contador(wrapper)).toBe('Paso 1 de 4');
  });
});

describe('animación: orden de los eventos', () => {
  it('nunca sale un "progreso" después de "completada", aunque hubiera uno pendiente en el limitador', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const alProgreso = vi.fn();
    const wrapper = await montarListo(animacion, { onProgreso: alProgreso });
    // Tres avances seguidos dentro de los 300 ms: el primero sale, el segundo queda pendiente.
    await siguiente(wrapper, 2);
    const antes = alProgreso.mock.calls.length;
    expect(antes).toBe(1);
    await siguiente(wrapper); // completa: cierra el emisor y descarta el pendiente
    await vi.advanceTimersByTimeAsync(PROGRESO_INTERVALO_MIN_MS * 5);
    expect(alProgreso.mock.calls.length).toBe(antes);
    wrapper.unmount();
    expect(alProgreso.mock.calls.length).toBe(antes);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('desmontar a medias emite el último progreso pendiente (para poder reanudar)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const alProgreso = vi.fn();
    const wrapper = await montarListo(animacion, { onProgreso: alProgreso });
    await siguiente(wrapper, 2);
    expect(alProgreso).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    expect(alProgreso).toHaveBeenCalledTimes(2);
    expect(alProgreso.mock.calls[1]![0].instantanea).toEqual({ paso: 2, maximo: 2 });
  });

  it('tras repetir vuelve a emitir progreso', async () => {
    const wrapper = await montarListo(animacion);
    await completarAnimacion(wrapper);
    const antes = progresos(wrapper).length;
    await clic(wrapper, 'repetir');
    await siguiente(wrapper);
    expect(progresos(wrapper).length).toBeGreaterThan(antes);
    expect(progresos(wrapper).at(-1)!.intentos).toBe(2);
  });
});

describe('modo "revisar"', () => {
  it('permite recorrer el contenido pero no emite nada ni muestra resultado', async () => {
    const wrapper = await montarListo(animacion, {
      modo: 'revisar',
      estadoPrevio: { servidor: { puntaje: 20, intentos: 1, completada: true } },
    });
    expect(wrapper.get('[data-testid="aviso-revision"]').text()).toContain('revisión');
    expect(wrapper.find('[data-testid="aviso-repeticion"]').exists()).toBe(false);
    await completarAnimacion(wrapper);
    expect(contador(wrapper)).toBe('Paso 4 de 4');
    expect(wrapper.emitted('completada')).toBeUndefined();
    expect(wrapper.emitted('progreso')).toBeUndefined();
    expect(wrapper.emitted('interaccion')).toBeUndefined();
    expect(wrapper.find('[data-testid="resultado"]').exists()).toBe(false);
  });

  it('el video en revisar no mide, no muestra el botón de transcripción leída y no emite', async () => {
    const wrapper = await montarListo(video, { modo: 'revisar' });
    expect(wrapper.find('[data-testid="transcripcion-leida"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="avance-video"]').exists()).toBe(false);
    const v = controlarVideo(wrapper, 100);
    v.reproducido([0, 100]);
    v.el.dispatchEvent(new Event('play'));
    await medirVideo(v);
    await medirVideo(v, 'ended');
    expect(wrapper.emitted('completada')).toBeUndefined();
    expect(wrapper.emitted('progreso')).toBeUndefined();
    expect(wrapper.emitted('interaccion')).toBeUndefined();
  });
});

describe('texto del contenido (Markdown restringido)', () => {
  it('nunca interpreta HTML crudo del contenido', async () => {
    const actividad = conConfig(
      conActividad(animacion, {
        instrucciones: 'Mira <img src=x onerror="window.__xss=1"> este esquema con calma.',
      }),
      {
        pasos: [
          pasoSintetico(1, {
            titulo: '<b>Título</b> <script>1</script>',
            texto:
              'Texto <script>window.__xss=2</script> con <iframe src="x"></iframe> mucho HTML.',
          }),
          pasoSintetico(2),
        ],
      },
    );
    const wrapper = await montarListo(actividad);
    expect(wrapper.element.querySelector('script, iframe, img')).toBeNull();
    expect(wrapper.element.querySelector('[onerror]')).toBeNull();
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
    // El título es texto plano: se ve tal cual, sin interpretar.
    expect(wrapper.get('[data-testid="titulo-paso"]').text()).toBe(
      '<b>Título</b> <script>1</script>',
    );
  });

  it('el énfasis y los enlaces de glosario se muestran; el glosario avisa con un evento y no navega', async () => {
    const wrapper = await montarListo(animacion, {}, true);
    await siguiente(wrapper);
    const enlace = wrapper.get('[data-testid="texto-paso"] a[data-glosario]');
    expect(enlace.text()).toBe('osteoclasto');
    const recibidos: string[] = [];
    document.body.addEventListener('ova:glosario', (e) =>
      recibidos.push((e as CustomEvent<{ id: string }>).detail.id),
    );
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true });
    enlace.element.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
    expect(recibidos).toEqual(['osteoclasto']);
  });
});

describe('animación: configuraciones adversariales', () => {
  it('un único paso: "Finalizar" completa (no hay a dónde avanzar)', async () => {
    const wrapper = await montarListo(animacionConPasos(1));
    expect(wrapper.get('[data-testid="siguiente"]').text()).toContain('Finalizar');
    expect(wrapper.find('[data-testid="reproducir"]').exists()).toBe(false);
    await clic(wrapper, 'siguiente');
    expect(completadas(wrapper)).toHaveLength(1);
    expect(completadas(wrapper)[0]!.detalle).toEqual({ medio: 'animacion', pasos_vistos: 1 });
  });

  it('diez pasos: recorre todos, progreso creciente y detalle con 10 pasos vistos', async () => {
    const wrapper = await montarListo(animacionConPasos(10));
    await completarAnimacion(wrapper);
    expect(completadas(wrapper)[0]!.detalle).toEqual({ medio: 'animacion', pasos_vistos: 10 });
    expect(interacciones(wrapper)).toHaveLength(9);
    for (const p of progresos(wrapper)) {
      expect(p.avance).toBeGreaterThanOrEqual(0);
      expect(p.avance).toBeLessThanOrEqual(1);
    }
    expect(problemasDeEmisiones(eventos(wrapper), animacion)).toEqual([]);
  });

  it('sin pasos muestra un aviso y no rompe', async () => {
    const wrapper = await montarListo(conConfig(animacion, { pasos: [] }));
    expect(wrapper.text()).toContain('aún no tiene pasos');
    await clic(wrapper, 'siguiente');
    expect(wrapper.emitted('completada')).toBeUndefined();
  });

  it('ids de actividad y de paso raros, textos largos y Unicode', async () => {
    const largo = 'Ñandú ✔ 骨 '.repeat(45).trim().slice(0, 500);
    const actividad = conConfig(
      conActividad(animacion, {
        id: 'm1_ñ "raro" <id> \u{1F9B4}',
        titulo: 'Título 骨 con "comillas" y <etiquetas>',
      }),
      {
        alt: 'Descripción con acentos: áéíóú ñ, símbolos ≥ ≤ µ y emoji \u{1F9B4}.',
        pasos: [
          pasoSintetico(1, { id: 'paso con espacios', titulo: '¿Qué pasa? ✔', texto: largo }),
          pasoSintetico(2, { id: 'a'.repeat(200), titulo: 'ß'.repeat(80), texto: largo }),
        ],
      },
    );
    const wrapper = await montarListo(actividad);
    expect(wrapper.get('h3').text()).toBe('Título 骨 con "comillas" y <etiquetas>');
    await siguiente(wrapper);
    expect(completadas(wrapper)).toHaveLength(1);
    // El id larguísimo del paso se recorta en describirInteraccion, y el evento sigue en el vocabulario.
    expect(problemasDeEmisiones(eventos(wrapper), actividad)).toEqual([]);
    expect(interacciones(wrapper)[0]!.objeto).toBe('a'.repeat(200));
    // El id de la actividad no llega al DOM sin escapar.
    expect(wrapper.element.querySelector('[id*="<"]')).toBeNull();
  });

  it('viewBox extraño: no rompe la proporción (se usa 2/1 por defecto)', async () => {
    const wrapper = await montarListo(conConfig(animacion, { viewBox: '0 0 0 0' }));
    const caja = wrapper.get('[data-testid="svg-animacion"]').attributes('style');
    expect(caja).toContain('2 / 1');
  });

  it('puntaje_max mínimo (1): el puntaje es un entero válido en cualquier intento', async () => {
    const chico = conActividad(animacion, { puntaje_max: 1 });
    const wrapper = await montarListo(chico);
    await completarAnimacion(wrapper);
    expect(problemasDeEmisiones(eventos(wrapper), chico)).toEqual([]);
    expect(completadas(wrapper)[0]!.puntaje).toBe(1);
  });

  it('puntaje_max alto (1000): no supera el tope de la API', async () => {
    const grande = conActividad(animacion, { puntaje_max: 5000 });
    const wrapper = await montarListo(grande);
    await completarAnimacion(wrapper);
    expect(completadas(wrapper)[0]!.puntaje).toBe(1000);
  });
});

describe('animación: desmontaje limpio', () => {
  it('cancela la descarga pendiente del SVG y vacía el contenedor', async () => {
    const sim = simularFetch(() => 'colgar');
    const wrapper = await montarListo(animacion);
    expect(sim.senales[0]!.aborted).toBe(false);
    wrapper.unmount();
    expect(sim.senales[0]!.aborted).toBe(true);
  });

  it('desmontar antes de que llegue el SVG no lanza ni deja errores sin capturar', async () => {
    let liberar: (r: Response) => void = () => undefined;
    simularFetch(
      () =>
        new Promise<Response>((resolver) => {
          liberar = resolver;
        }) as never,
    );
    const errores: unknown[] = [];
    const manejador = (e: PromiseRejectionEvent) => errores.push(e.reason);
    window.addEventListener('unhandledrejection', manejador);
    const wrapper = montar(animacion);
    wrapper.unmount();
    liberar(new Response(SVG_REMODELADO));
    await flushPromises();
    window.removeEventListener('unhandledrejection', manejador);
    expect(errores).toEqual([]);
  });

  it('no emite nada después de desmontar (ni siquiera con gestos pendientes)', async () => {
    const wrapper = await montarListo(animacion, {}, true);
    const lienzo = wrapper.get('[data-testid="lienzo"]').element;
    puntero(lienzo, 'pointerdown', { x: 300, y: 100 });
    wrapper.unmount();
    puntero(lienzo, 'pointerup', { x: 100, y: 100 });
    expect(wrapper.emitted('interaccion')).toBeUndefined();
  });
});

/* ============================================================================================= */
/* Video                                                                                         */
/* ============================================================================================= */

describe('video: elemento y accesibilidad', () => {
  it('<video> con controles, preload="none", playsinline, sin autoplay y con poster y nombre', async () => {
    const wrapper = await montarListo(video);
    const el = wrapper.get('video');
    expect(el.attributes('controls')).toBeDefined();
    expect(el.attributes('preload')).toBe('none');
    expect(el.attributes('playsinline')).toBeDefined();
    expect(el.attributes('autoplay')).toBeUndefined();
    expect((el.element as HTMLVideoElement).autoplay).toBeFalsy();
    expect(el.attributes('poster')).toBe(configVideo.poster);
    expect(el.attributes('aria-label')).toBe(`Video: ${video.titulo}`);
    expect(el.attributes('src')).toBeUndefined();
    // La fuente la elige el navegador con la lista de <source>; aquí, `src` directo del contenido.
    expect(el.element.getAttribute('muted')).toBeNull();
  });

  it('pistas de subtítulos: kind, srclang, etiqueta y la de español por defecto', async () => {
    const actividad = conConfig(video, {
      subtitulos: [
        { idioma: 'en', etiqueta: 'English', src: '/videos/m1/x.en.vtt' },
        { idioma: 'es', etiqueta: 'Español', src: '/videos/m1/x.es.vtt' },
      ],
    });
    const wrapper = await montarListo(actividad);
    const pistas = wrapper.findAll('track');
    expect(pistas).toHaveLength(2);
    expect(pistas.map((p) => p.attributes('srclang'))).toEqual(['en', 'es']);
    expect(pistas.map((p) => p.attributes('label'))).toEqual(['English', 'Español']);
    for (const p of pistas) expect(p.attributes('kind')).toBe('subtitles');
    const porDefecto = pistas.map((p) => (p.element as HTMLTrackElement).default);
    expect(porDefecto).toEqual([false, true]);
  });

  it('sin pista en español, la primera va activada', async () => {
    const actividad = conConfig(video, {
      subtitulos: [{ idioma: 'en', etiqueta: 'English', src: '/videos/m1/x.en.vtt' }],
    });
    const wrapper = await montarListo(actividad);
    expect((wrapper.get('track').element as HTMLTrackElement).default).toBe(true);
  });

  it('muestra la transcripción con Markdown saneado y los capítulos como botones', async () => {
    const wrapper = await montarListo(
      conConfig(video, {
        transcripcion:
          'Primera idea **importante** del video para leer con calma.\n\n<script>1</script>Segunda idea, con más detalle.',
      }),
    );
    const t = wrapper.get('[data-testid="transcripcion"]');
    expect(t.element.tagName).toBe('DETAILS');
    expect(t.find('strong').text()).toBe('importante');
    expect(t.find('script').exists()).toBe(false);
    expect(t.findAll('p').length).toBeGreaterThanOrEqual(2);
    const hitos = wrapper.get('nav[aria-label="Capítulos del video"]').findAll('button');
    expect(hitos.map((b) => b.text())).toEqual(['0:00 · Introducción', '0:45 · Capas del hueso']);
    for (const b of hitos) expect(b.classes()).toContain('h-11');
  });

  it('un hito lleva el video a ese segundo y lo anuncia', async () => {
    const wrapper = await montarListo(video);
    const v = controlarVideo(wrapper, 120);
    await wrapper.findAll('[data-testid="hito"]')[1]!.trigger('click');
    expect(v.el.currentTime).toBe(45);
    expect(wrapper.get('[data-testid="anuncio"]').text()).toContain('0:45');
    expect(wrapper.get('[data-testid="anuncio"]').text()).toContain('Capas del hueso');
  });

  it('sin hitos no dibuja la navegación de capítulos', async () => {
    const wrapper = await montarListo(conConfig(video, { hitos: [] }));
    expect(wrapper.find('nav').exists()).toBe(false);
  });

  it('la barra de progreso está etiquetada y dice cuánto falta', async () => {
    const wrapper = await montarListo(video);
    const barra = wrapper.get('progress');
    expect(barra.attributes('id')).toBe('progreso-video');
    expect(wrapper.get('label[for="progreso-video"]').text()).toContain('0 %');
    expect(wrapper.get('label[for="progreso-video"]').text()).toContain('90 %');
  });
});

describe('video: cómo se mide lo visto', () => {
  it('lo visto es la suma de los tramos reproducidos entre la duración REAL del elemento', async () => {
    const wrapper = await montarListo(video); // duracion_seg del contenido: 120
    const v = controlarVideo(wrapper, 60);
    v.reproducido([0, 30], [40, 50]); // 40 s de 60 = 0,67
    await medirVideo(v);
    expect(wrapper.emitted('completada')).toBeUndefined();
    expect(progresos(wrapper).at(-1)!.instantanea).toEqual({ visto: 0.67 });
    // Con la duración del contenido (120) 40 s serían 0,33: se comprueba que no se usa.
    expect(wrapper.get('label[for="progreso-video"]').text()).toContain('67 %');
    v.reproducido([0, 30], [40, 65]); // 55 s de 60 = 0,92 (pasa el umbral)
    await medirVideo(v);
    expect(completadas(wrapper)).toHaveLength(1);
    expect(completadas(wrapper)[0]).toMatchObject({
      puntaje: 10,
      intentos: 1,
      precision: 1,
      detalle: { medio: 'video', visto: 0.92, via: 'video' },
    });
  });

  it('saltar con la barra no suma: ver solo el tramo final no completa', async () => {
    const wrapper = await montarListo(video);
    const v = controlarVideo(wrapper, 100);
    v.el.currentTime = 100;
    v.reproducido([95, 100]); // 5 %
    await medirVideo(v, 'seeked');
    await medirVideo(v, 'ended');
    expect(wrapper.emitted('completada')).toBeUndefined();
    expect(wrapper.get('label[for="progreso-video"]').text()).toContain('5 %');
  });

  it('el umbral exacto (90 %) completa y justo por debajo no', async () => {
    const wrapper = await montarListo(video);
    const v = controlarVideo(wrapper, 1000);
    v.reproducido([0, 1000 * UMBRAL_VIDEO_VISTO - 1]);
    await medirVideo(v);
    expect(wrapper.emitted('completada')).toBeUndefined();
    v.reproducido([0, 1000 * UMBRAL_VIDEO_VISTO]);
    await medirVideo(v);
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it.each([
    ['NaN (metadatos sin cargar)', Number.NaN],
    ['Infinity (directo)', Number.POSITIVE_INFINITY],
    ['cero', 0],
    ['negativa', -5],
  ])('duración %s: no suma ni completa', async (_n, duracion) => {
    const wrapper = await montarListo(video);
    const v = controlarVideo(wrapper, duracion);
    v.reproducido([0, 500]);
    await medirVideo(v);
    expect(wrapper.emitted('completada')).toBeUndefined();
  });

  it('tramos con valores raros (invertidos, NaN) no cuentan', async () => {
    const wrapper = await montarListo(video);
    const v = controlarVideo(wrapper, 100);
    v.reproducido([50, 10], [Number.NaN, 20], [0, 5]);
    await medirVideo(v);
    expect(wrapper.get('label[for="progreso-video"]').text()).toContain('5 %');
  });

  it('reproducir emite reproduce_video; medir sin cambios no repite el progreso', async () => {
    const wrapper = await montarListo(video);
    const v = controlarVideo(wrapper, 100);
    v.el.dispatchEvent(new Event('play'));
    v.reproducido([0, 10]);
    await medirVideo(v);
    await medirVideo(v);
    await medirVideo(v, 'pause');
    expect(interacciones(wrapper)).toEqual([{ accion: 'reproduce_video' }]);
    expect(progresos(wrapper)).toHaveLength(1);
    expect(progresos(wrapper)[0]).toMatchObject({ intentos: 1, instantanea: { visto: 0.1 } });
  });

  it('completa una sola vez aunque sigan llegando eventos', async () => {
    const wrapper = await montarListo(video);
    const v = controlarVideo(wrapper, 100);
    v.reproducido([0, 100]);
    await medirVideo(v);
    await medirVideo(v, 'ended');
    await medirVideo(v, 'pause');
    await clic(wrapper, 'repetir').catch(() => undefined);
    expect(completadas(wrapper)).toHaveLength(1);
  });
});

describe('video: "Ya leí la transcripción"', () => {
  it('completa con via "transcripcion", precisión 1 y lo visto hasta entonces', async () => {
    const wrapper = await montarListo(video, {}, true);
    await clic(wrapper, 'transcripcion-leida');
    expect(completadas(wrapper)).toEqual([
      {
        puntaje: 10,
        intentos: 1,
        precision: 1,
        detalle: { medio: 'video', visto: 0, via: 'transcripcion' },
      },
    ]);
    await nextTick();
    expect(document.activeElement).toBe(wrapper.get('[data-testid="resultado"] h4').element);
    expect(problemasDeEmisiones(eventos(wrapper), video)).toEqual([]);
  });

  it('no permite completar dos veces (ni con el video después)', async () => {
    const wrapper = await montarListo(video);
    const v = controlarVideo(wrapper, 100);
    await clic(wrapper, 'transcripcion-leida');
    await clic(wrapper, 'transcripcion-leida').catch(() => undefined);
    v.reproducido([0, 100]);
    await medirVideo(v);
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it('el botón es un botón nativo con objetivo táctil de 44 px', async () => {
    const wrapper = await montarListo(video);
    const b = wrapper.get('[data-testid="transcripcion-leida"]');
    expect(b.element.tagName).toBe('BUTTON');
    expect(b.attributes('type')).toBe('button');
    expect(b.classes()).toContain('h-11');
  });
});

describe('video: carga y error', () => {
  it('"Cargando el video" al empezar a cargar y desaparece al estar listo', async () => {
    const wrapper = await montarListo(video);
    const el = wrapper.get('video').element;
    el.dispatchEvent(new Event('loadstart'));
    await nextTick();
    expect(wrapper.get('[data-testid="cargando-video"]').text()).toContain('Cargando el video');
    el.dispatchEvent(new Event('canplay'));
    await nextTick();
    expect(wrapper.find('[data-testid="cargando-video"]').exists()).toBe(false);
  });

  it('si falla: mensaje claro en español, "Reintentar" y la transcripción sigue sirviendo', async () => {
    const wrapper = await montarListo(video);
    const v = controlarVideo(wrapper, 100);
    v.el.dispatchEvent(new Event('error'));
    await nextTick();
    const error = wrapper.get('[data-testid="error-video"]');
    expect(error.attributes('role')).toBe('status');
    expect(error.text()).toContain('No se pudo cargar el video');
    expect(error.text()).toContain('transcripción');
    await error.get('button').trigger('click');
    expect(v.carga).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="error-video"]').exists()).toBe(false);
    await clic(wrapper, 'transcripcion-leida');
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it('con el error activo, los eventos de espera no lo ocultan', async () => {
    const wrapper = await montarListo(video);
    const el = wrapper.get('video').element;
    el.dispatchEvent(new Event('error'));
    el.dispatchEvent(new Event('waiting'));
    el.dispatchEvent(new Event('canplay'));
    await nextTick();
    expect(wrapper.find('[data-testid="error-video"]').exists()).toBe(true);
  });
});

describe('video: estado previo, intentos y repetición', () => {
  it('restaura lo visto (sin llegar nunca al umbral) y suma lo de esta sesión', async () => {
    const wrapper = await montarListo(video, {
      estadoPrevio: { progreso: { avance: 0.5, intentos: 1, instantanea: { visto: 0.5 } } },
    });
    expect(wrapper.get('label[for="progreso-video"]').text()).toContain('50 %');
    const v = controlarVideo(wrapper, 100);
    v.reproducido([0, 41]); // 0,5 + 0,41 = 0,91
    await medirVideo(v);
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it('una instantánea que ya bastaba para completar se queda un punto por debajo del umbral', async () => {
    const wrapper = await montarListo(video, {
      estadoPrevio: { progreso: { avance: 1, intentos: 1, instantanea: { visto: 0.95 } } },
    });
    expect(wrapper.get('label[for="progreso-video"]').text()).toContain('89 %');
    expect(wrapper.emitted('completada')).toBeUndefined();
  });

  it.each([[-1], [2], [Number.NaN], ['0.5'], [null]])(
    'ignora una fracción guardada inválida (%s)',
    async (visto) => {
      const wrapper = await montarListo(video, {
        estadoPrevio: { progreso: { avance: 0.5, intentos: 1, instantanea: { visto } as never } },
      });
      expect(wrapper.get('label[for="progreso-video"]').text()).toContain('0 %');
    },
  );

  it('una instantánea tardía reposiciona lo visto solo hasta que el estudiante reproduce', async () => {
    const wrapper = await montarListo(video);
    await wrapper.setProps({
      estadoPrevio: { progreso: { avance: 0.4, intentos: 1, instantanea: { visto: 0.4 } } },
    } as never);
    await flushPromises();
    expect(wrapper.get('label[for="progreso-video"]').text()).toContain('40 %');
    wrapper.get('video').element.dispatchEvent(new Event('play'));
    await wrapper.setProps({
      estadoPrevio: { progreso: { avance: 0.8, intentos: 1, instantanea: { visto: 0.8 } } },
    } as never);
    await flushPromises();
    expect(wrapper.get('label[for="progreso-video"]').text()).toContain('40 %');
  });

  it('penaliza por intento: con 3 registrados es el 4.º y vale 0,7', async () => {
    const wrapper = await montarListo(video, {
      estadoPrevio: { servidor: { puntaje: 10, intentos: 3, completada: true } },
    });
    await clic(wrapper, 'transcripcion-leida');
    expect(completadas(wrapper)[0]).toMatchObject({ intentos: 4, puntaje: 7 });
  });

  it('repetir reinicia lo visto, crea un <video> nuevo y cuenta el intento siguiente', async () => {
    const wrapper = await montarListo(video);
    const primero = controlarVideo(wrapper, 100);
    primero.reproducido([0, 95]);
    await medirVideo(primero);
    expect(completadas(wrapper)).toHaveLength(1);
    await clic(wrapper, 'repetir');
    expect(primero.pausa).toHaveBeenCalled();
    expect(wrapper.get('label[for="progreso-video"]').text()).toContain('0 %');
    const segundo = controlarVideo(wrapper, 100);
    expect(segundo.el).not.toBe(primero.el);
    segundo.reproducido([0, 92]);
    await medirVideo(segundo);
    expect(completadas(wrapper)).toHaveLength(2);
    expect(completadas(wrapper)[1]).toMatchObject({ intentos: 2, puntaje: 9 });
    expect(interacciones(wrapper)).toContainEqual({ accion: 'reinicia_actividad' });
  });
});

describe('video: orden de los eventos y desmontaje', () => {
  it('nunca hay "progreso" después de "completada"', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const alProgreso = vi.fn();
    const wrapper = await montarListo(video, { onProgreso: alProgreso });
    const v = controlarVideo(wrapper, 100);
    v.reproducido([0, 10]);
    await medirVideo(v);
    v.reproducido([0, 30]);
    await medirVideo(v); // pendiente en el limitador
    v.reproducido([0, 95]);
    await medirVideo(v); // completa
    const antes = alProgreso.mock.calls.length;
    await vi.advanceTimersByTimeAsync(PROGRESO_INTERVALO_MIN_MS * 5);
    expect(alProgreso.mock.calls.length).toBe(antes);
    wrapper.unmount();
    expect(alProgreso.mock.calls.length).toBe(antes);
  });

  it('al desmontar pausa el video y no deja temporizadores', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const wrapper = await montarListo(video);
    const v = controlarVideo(wrapper, 100);
    wrapper.unmount();
    expect(v.pausa).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('no falla si el elemento no implementa pause()', async () => {
    const wrapper = await montarListo(video);
    const el = wrapper.get('video').element as unknown as { pause: () => void };
    el.pause = () => {
      throw new Error('sin implementación');
    };
    expect(() => wrapper.unmount()).not.toThrow();
  });

  it('un evento del video después de desmontar no emite nada', async () => {
    const wrapper = await montarListo(video);
    const v = controlarVideo(wrapper, 100);
    wrapper.unmount();
    v.reproducido([0, 100]);
    await medirVideo(v);
    expect(wrapper.emitted('completada')).toBeUndefined();
  });
});

describe('video: configuraciones adversariales', () => {
  it('un solo subtítulo, transcripción mínima y sin poster ni hitos', async () => {
    const minimo = conConfig(video, {
      poster: undefined,
      hitos: [],
      transcripcion: 'x'.repeat(50),
      subtitulos: [{ idioma: 'es', etiqueta: 'Es', src: '/videos/m1/a.vtt' }],
    });
    const wrapper = await montarListo(minimo);
    expect(wrapper.get('video').attributes('poster')).toBeUndefined();
    await clic(wrapper, 'transcripcion-leida');
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it('transcripción de 6000 caracteres, capítulos con Unicode y diez hitos', async () => {
    const hitos = Array.from({ length: 10 }, (_, i) => ({
      t_seg: i * 10,
      titulo: `Capítulo ${i} ✔ 骨`,
    }));
    const grande = conConfig(video, {
      transcripcion: `${'Línea con acentos áéíóú ñ y símbolos ≥ µ. '.repeat(140)}`.slice(0, 6000),
      hitos,
    });
    const wrapper = await montarListo(grande);
    expect(wrapper.findAll('[data-testid="hito"]')).toHaveLength(10);
    await clic(wrapper, 'transcripcion-leida');
    expect(problemasDeEmisiones(eventos(wrapper), grande)).toEqual([]);
  });

  it('duración de una hora: el tiempo de los capítulos se formatea con horas', async () => {
    const largo = conConfig(video, {
      duracion_seg: 1800,
      hitos: [
        { t_seg: 0, titulo: 'Inicio' },
        { t_seg: 1500, titulo: 'Casi al final' },
      ],
    });
    const wrapper = await montarListo(largo);
    expect(wrapper.findAll('[data-testid="hito"]')[1]!.text()).toContain('25:00');
  });

  it('título con comillas y etiquetas no rompe el nombre accesible del video', async () => {
    const wrapper = await montarListo(conActividad(video, { titulo: 'Video "raro" <b>x</b> ñ' }));
    expect(wrapper.get('video').attributes('aria-label')).toBe('Video: Video "raro" <b>x</b> ñ');
  });
});
