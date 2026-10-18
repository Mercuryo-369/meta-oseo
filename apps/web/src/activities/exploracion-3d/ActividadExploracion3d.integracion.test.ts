/**
 * Integración de la actividad con la escena REAL (EscenaExploracion, sin WebGL): el <TresCanvas> y la
 * cámara se sustituyen por dobles, pero la carga perezosa, el modelo, los estados y los puntos de
 * interés son los de producción. Comprueba que la lista y el modelo son la misma actividad.
 */
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import type { Component, SetupContext } from 'vue';
import { muestra, validar } from '@/content/__fixtures__/utiles';
import { listarActividades } from '@/content/consultas';
import type { ActividadExploracion3d } from '@/content/schema';
import { respuestaFalsa, stlBinario, triangulosDeCaja } from '@/scenes/stlDePrueba';
import { hayWebGL2 } from '@/scenes/webgl';
import Actividad from './ActividadExploracion3d.vue';

vi.mock('@/scenes/webgl', () => ({ hayWebGL2: vi.fn() }));

enableAutoUnmount(afterEach);

const STL = stlBinario(triangulosDeCaja([0, -130, 1450], [100, 60, 80]));
const fetchMock = vi.fn<typeof fetch>();

const TresCanvasFalso: Component = {
  name: 'TresCanvas',
  setup(_props: unknown, { slots }: SetupContext) {
    return () => h('div', { 'data-test': 'lienzo' }, slots.default?.());
  },
};
const CamaraFalsa = defineComponent({
  name: 'CamaraExploracion',
  props: {
    orden: { type: Object, default: undefined },
    limites: { type: Object, default: undefined },
    reducirMovimiento: Boolean,
    puntos: { type: Array, default: undefined },
    centro: { type: Array, default: undefined },
    ancho: { type: Number, default: undefined },
    alto: { type: Number, default: undefined },
  },
  emits: ['proyeccion', 'interrumpida'],
  setup: () => () => h('div', { 'data-test': 'camara' }),
});

const mandibula = listarActividades(validar(muestra()).modulo!)
  .map((u) => u.actividad)
  .find(
    (a): a is ActividadExploracion3d =>
      a.tipo === 'exploracion-3d' && a.config.modelo === 'mandibula',
  )!;

function montar(actividad: ActividadExploracion3d = mandibula): VueWrapper {
  return mount(Actividad, {
    props: { modulo: 1, actividad },
    global: { stubs: { TresCanvas: TresCanvasFalso, CamaraExploracion: CamaraFalsa } },
    attachTo: document.body,
  }) as unknown as VueWrapper;
}

/** El fragmento del visor (three, TresJS) se transforma de verdad: se espera a que monte, sin plazos fijos. */
async function montarConVisor(actividad?: ActividadExploracion3d): Promise<VueWrapper> {
  const w = montar(actividad);
  await vi.waitFor(() => expect(w.find('[data-testid="escena-exploracion"]').exists()).toBe(true), {
    timeout: 15_000,
  });
  await flushPromises();
  return w;
}

const lista = (w: VueWrapper, id: string) =>
  w.findAll('[data-nodo]').find((b) => b.attributes('data-nodo') === id)!;

/**
 * La parte sobre el modelo: el número (pantallas estrechas) o, con la mandíbula desde `lg`, su etiqueta
 * lateral. Las dos hacen lo mismo y llevan los mismos atributos de estado.
 */
const enModelo = (w: VueWrapper, id: string) =>
  w.get(`[data-punto="${id}"], [data-etiqueta="${id}"]`);

/** Ancho de la ventana simulada (happy-dom), para probar el modo de pantalla estrecha y el ancho. */
function ventana(ancho: number): void {
  (
    window as unknown as { happyDOM: { setViewport(v: { width: number; height: number }): void } }
  ).happyDOM.setViewport({ width: ancho, height: 900 });
}

beforeEach(() => {
  ventana(1280);
  document.body.innerHTML = '';
  vi.mocked(hayWebGL2).mockReturnValue(true);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () =>
    respuestaFalsa({ fragmentos: [new Uint8Array(STL)], longitud: STL.byteLength }),
  );
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('actividad con la escena real', () => {
  it('descarga el visor y el modelo solo al montar y muestra el visor cuando está listo', async () => {
    const w = await montarConVisor();
    const escena = w.get('[data-testid="escena-exploracion"]');
    expect(escena.attributes('data-estado')).toBe('listo');
    expect(escena.attributes('aria-label')).toBe(mandibula.config.alt);
    expect(w.find('[data-testid="aviso-sin-3d"]').exists()).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('tocar un punto del modelo y tocar la lista son lo mismo: visita, ficha y evento', async () => {
    const w = await montarConVisor();
    const camara = w.findComponent({ name: 'CamaraExploracion' });
    camara.vm.$emit(
      'proyeccion',
      mandibula.config.nodos.map((n, i) => ({
        id: n.id,
        x: 30 + i * 40,
        y: 60,
        enPantalla: true,
        detras: false,
      })),
    );
    await flushPromises();
    await enModelo(w, 'condilo').trigger('click');
    expect(lista(w, 'condilo').attributes('data-visitado')).toBe('true');
    expect(w.get('[data-testid="ficha"]').text()).toContain('Cóndilo');
    expect(w.emitted('interaccion')).toEqual([[{ accion: 'selecciona_nodo', objeto: 'condilo' }]]);
    // La cámara recibe la orden de enfocar el nodo.
    expect(camara.props('orden')).toMatchObject({ tipo: 'estado' });
    // El punto seleccionado queda marcado en el modelo.
    expect(enModelo(w, 'condilo').attributes('data-seleccionado')).toBe('true');
    // Y se completa alternando lista y modelo.
    await lista(w, 'angulo').trigger('click');
    await enModelo(w, 'cuerpo').trigger('click');
    expect(w.emitted('completada')).toHaveLength(1);
  });

  it('los puntos del modelo reflejan las partes ya exploradas', async () => {
    const w = await montarConVisor();
    await lista(w, 'rama').trigger('click');
    w.findComponent({ name: 'CamaraExploracion' }).vm.$emit('proyeccion', [
      { id: 'rama', x: 50, y: 50, enPantalla: true, detras: false },
    ]);
    await flushPromises();
    expect(enModelo(w, 'rama').attributes('data-visitado')).toBe('true');
  });

  it('mandíbula en pantalla ancha: etiquetas a los dos lados con una línea a cada punto visible', async () => {
    const w = await montarConVisor();
    w.findComponent({ name: 'CamaraExploracion' }).vm.$emit(
      'proyeccion',
      mandibula.config.nodos.map((n, i) => ({
        id: n.id,
        x: 200 + i * 30,
        y: 80 + i * 20,
        enPantalla: i !== 0,
        detras: false,
      })),
    );
    await flushPromises();
    expect(w.find('[data-testid="puntos-de-interes"]').exists()).toBe(false);
    const etiquetas = w.findAll('[data-etiqueta]');
    expect(etiquetas).toHaveLength(mandibula.config.nodos.length);
    // Las partes de cada lado del modelo van a su lado (la mandíbula tiene partes en los dos).
    expect(new Set(etiquetas.map((e) => e.attributes('data-lado')))).toEqual(
      new Set(['izq', 'der']),
    );
    // Una línea por punto en pantalla: el primero está fuera.
    expect(w.findAll('[data-testid="lineas-etiquetas"] line')).toHaveLength(
      mandibula.config.nodos.length - 1,
    );
    // Ayuda visual, no un segundo índice: fuera del árbol de accesibilidad y del orden de Tab.
    for (const e of etiquetas) {
      expect(e.attributes('aria-hidden')).toBe('true');
      expect(e.attributes('tabindex')).toBe('-1');
    }
  });

  it('en pantalla estrecha la mandíbula conserva los números sobre el modelo', async () => {
    ventana(390);
    const w = await montarConVisor();
    w.findComponent({ name: 'CamaraExploracion' }).vm.$emit('proyeccion', [
      { id: 'rama', x: 50, y: 50, enPantalla: true, detras: false },
    ]);
    await flushPromises();
    expect(w.find('[data-testid="etiquetas-laterales"]').exists()).toBe(false);
    expect(w.find('[data-punto="rama"]').exists()).toBe(true);
  });

  it('sin WebGL 2 no descarga el modelo y la actividad se completa con la lista', async () => {
    vi.mocked(hayWebGL2).mockReturnValue(false);
    const w = await montarConVisor();
    expect(w.get('[data-testid="escena-exploracion"]').attributes('data-estado')).toBe('sin_webgl');
    expect(w.get('[data-testid="aviso-sin-3d"]').text()).toContain('lista de partes');
    expect(fetchMock).not.toHaveBeenCalled();
    for (const id of mandibula.config.requeridos) await lista(w, id).trigger('click');
    expect(w.emitted('completada')).toHaveLength(1);
  });

  it('con el modelo ausente (404) se ve el error del visor, el aviso y la lista sigue completando', async () => {
    fetchMock.mockImplementation(async () => new Response('no', { status: 404 }));
    const w = await montarConVisor();
    expect(w.get('[data-testid="escena-exploracion"]').attributes('data-estado')).toBe('error');
    expect(w.get('[role="alert"]').text()).toContain('Problema con el modelo 3D');
    expect(w.find('[data-testid="aviso-sin-3d"]').exists()).toBe(true);
    for (const id of mandibula.config.requeridos) await lista(w, id).trigger('click');
    expect(w.emitted('completada')).toHaveLength(1);
  });

  it('con el modelo de células (GLB inexistente) la exploración de células sigue siendo completable', async () => {
    const celulas = listarActividades(validar(muestra()).modulo!)
      .map((u) => u.actividad)
      .find(
        (a): a is ActividadExploracion3d =>
          a.tipo === 'exploracion-3d' && a.config.modelo === 'celulas',
      )!;
    fetchMock.mockImplementation(async () => new Response('no', { status: 404 }));
    const w = await montarConVisor(celulas);
    expect(w.get('[data-testid="escena-exploracion"]').attributes('data-estado')).toBe('error');
    expect(w.find('[data-testid="atribucion"]').exists()).toBe(false);
    for (const id of celulas.config.requeridos) await lista(w, id).trigger('click');
    expect(w.emitted('completada')).toHaveLength(1);
  });

  it('desmontar aborta la descarga del modelo', async () => {
    let senal: AbortSignal | undefined;
    fetchMock.mockImplementation(async (_url, init) => {
      senal = init?.signal ?? undefined;
      return respuestaFalsa({ fragmentos: [new Uint8Array(STL)], longitud: STL.byteLength });
    });
    const w = await montarConVisor();
    w.unmount();
    expect(senal?.aborted).toBe(true);
  });
});
