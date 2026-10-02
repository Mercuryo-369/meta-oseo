/**
 * Pruebas de la variante PROCEDURAL de ActividadExploracion3d (escena con línea de tiempo): la batería de
 * contrato, la lista de fases como alternativa sin WebGL, el texto de la fase sincronizado con `t`, visitar
 * deteniéndose o pasando por un hito, la reproducción, el teclado y el modo revisar. La escena real (three,
 * TresJS) se sustituye por un doble: lo que se prueba es la actividad y su panel. La geometría y el estado de
 * la escena se prueban en `scenes/procedural/`.
 */
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsActividadExploracion3d, ResultadoActividad } from '@/activities/types';
import { pruebasDeContratoActividad, problemasDeEmisiones } from '@/content/__fixtures__/contrato';
import type { EventosEmitidos } from '@/content/__fixtures__/contrato';
import { calcularPuntaje } from '@/content/scoring';
import { ActividadExploracion3dSchema } from '@/content/schema';
import type { ActividadExploracion3d } from '@/content/schema';
import Actividad from './ActividadExploracion3d.vue';
import fuentePanel from './PanelLineaTiempo.vue?raw';

/** Estado y contadores del doble de la escena. */
const escena = vi.hoisted(() => ({
  estado: 'listo' as string,
  montajes: 0,
  desmontajes: 0,
  ultimasProps: null as Record<string, unknown> | null,
}));

vi.mock('@/scenes/procedural/bmu/EscenaBmu.vue', async () => {
  const { defineComponent, h, onBeforeUnmount, onMounted } = await import('vue');
  return {
    __esModule: true,
    default: defineComponent({
      name: 'EscenaBmuFalsa',
      props: {
        t: { type: Number, default: 0 },
        vista: { type: String, default: '' },
        ordenVista: { type: Number, default: 0 },
        ordenZoom: { type: Object, default: null },
        alt: { type: String, default: '' },
        reducirMovimiento: { type: Boolean, default: false },
      },
      emits: ['estado', 'camaraLibre'],
      setup(props: Record<string, unknown>, { emit }) {
        escena.montajes += 1;
        onMounted(() => emit('estado', escena.estado));
        onBeforeUnmount(() => {
          escena.desmontajes += 1;
        });
        return () => {
          escena.ultimasProps = { ...props };
          return h('div', {
            'data-testid': 'escena-falsa',
            'data-t': String(props.t),
            'data-vista': String(props.vista),
            onClick: () => emit('camaraLibre'),
          });
        };
      },
    }),
  };
});

enableAutoUnmount(afterEach);

const PASOS = [
  ['paso_uno', 0, 'Primera fase', 'general'],
  ['paso_dos', 0.14, 'Segunda fase', 'general'],
  ['paso_tres', 0.32, 'Tercera fase', 'perfil'],
  ['paso_cuatro', 0.5, 'Cuarta fase', 'detalle'],
  ['paso_cinco', 1, 'Quinta fase', 'extremo'],
] as const;

function crear(
  cambios: { requeridos?: string[]; puntaje_max?: number } = {},
): ActividadExploracion3d {
  return ActividadExploracion3dSchema.parse({
    id: 'm5_procedural_prueba',
    tipo: 'exploracion-3d',
    titulo: 'Escena con línea de tiempo de prueba',
    instrucciones: 'Reproduce la línea de tiempo y visita las fases.',
    puntaje_max: cambios.puntaje_max ?? 40,
    retroalimentacion: { correcta: 'Recorriste todas las fases de la escena de prueba.' },
    concepto: 'Concepto de prueba',
    config: {
      modelo: 'procedural',
      escena: 'bmu_remodelado',
      alt: 'Escena 3D de prueba que se puede girar, acercar y recorrer en el tiempo.',
      linea_de_tiempo: {
        pasos: PASOS.map(([id, t, titulo, vista]) => ({
          id,
          t,
          titulo,
          vista,
          texto: `Texto de la ${titulo.toLowerCase()} de la escena.`,
        })),
      },
      requeridos: cambios.requeridos ?? PASOS.map(([id]) => id),
    },
  });
}

const actividad = crear();

type Props = Omit<PropsActividadExploracion3d, 'modulo'> & { modulo?: 1 | 2 | 3 | 4 | 5 | 6 };

function montar(a: ActividadExploracion3d, extra: Partial<Props> = {}): VueWrapper {
  return mount(Actividad, {
    props: { modulo: 5, actividad: a, ...extra },
    attachTo: document.body,
  }) as unknown as VueWrapper;
}

async function montarListo(a = actividad, extra: Partial<Props> = {}): Promise<VueWrapper> {
  const w = montar(a, extra);
  await flushPromises();
  return w;
}

const fase = (w: VueWrapper, id: string) =>
  w.findAll('[data-nodo]').find((b) => b.attributes('data-nodo') === id)!;
const control = (w: VueWrapper, testid: string) => w.get(`[data-testid="${testid}"]`);
const deslizador = (w: VueWrapper) => control(w, 'deslizador-tiempo');

/** Mueve el deslizador como lo haría el estudiante (evento `input`) y lo suelta (`change`). */
async function mover(w: VueWrapper, t: number, soltar = true): Promise<void> {
  const el = deslizador(w);
  await el.setValue(String(Math.round(t * 1000)));
  if (soltar) await el.trigger('change');
  await flushPromises();
}

const valorT = (w: VueWrapper) => Number((deslizador(w).element as HTMLInputElement).value) / 1000;
const eventos = (w: VueWrapper) => w.emitted() as EventosEmitidos;
const resultados = (w: VueWrapper) =>
  (w.emitted('completada') ?? []).map((a) => a[0] as ResultadoActividad<'exploracion-3d'>);

beforeEach(() => {
  escena.estado = 'listo';
  escena.montajes = 0;
  escena.desmontajes = 0;
  escena.ultimasProps = null;
});

pruebasDeContratoActividad({
  nombre: 'ActividadExploracion3d (procedural)',
  actividad,
  montar: (props) => mount(Actividad, { props, attachTo: document.body }) as unknown as VueWrapper,
  completar: async (w) => {
    for (const [id] of PASOS) await fase(w, id).trigger('click');
  },
  precisionEsperada: 1,
});

describe('presentación', () => {
  it('muestra la escena, el texto de la primera fase, los controles y la lista de fases', async () => {
    const w = await montarListo();
    expect(w.get('h3').text()).toBe(actividad.titulo);
    expect(w.find('[data-testid="escena-falsa"]').exists()).toBe(true);
    expect(control(w, 'fase-actual').text()).toContain('Primera fase');
    expect(control(w, 'fase-actual').text()).toContain('Fase 1 de 5');
    expect(w.findAll('[data-nodo]')).toHaveLength(5);
    expect(
      w
        .get(
          '#' +
            w
              .get('[data-testid="lista-nodos"]')
              .element.closest('section')!
              .getAttribute('aria-labelledby'),
        )
        .text(),
    ).toBe('Fases del proceso');
    expect(w.text()).toContain('0 de 5 fases requeridas visitadas');
    // Sin ficha aparte: el texto de la fase está junto a la escena.
    expect(w.find('[data-testid="ficha"]').exists()).toBe(false);
    // No hay atribución de la mandíbula.
    expect(w.find('[data-testid="atribucion"]').exists()).toBe(false);
  });

  it('empieza detenida en t = 0: no hay reproducción automática', async () => {
    const w = await montarListo();
    expect(valorT(w)).toBe(0);
    expect(control(w, 'reproducir').attributes('aria-pressed')).toBe('false');
    expect(control(w, 'reproducir').text()).toContain('Reproducir');
  });

  it('la escena recibe t, la vista de la fase y la descripción; las vistas del contenido se respetan', async () => {
    const w = await montarListo();
    await fase(w, 'paso_tres').trigger('click');
    await flushPromises();
    expect(escena.ultimasProps?.t).toBeCloseTo(0.32, 9);
    expect(escena.ultimasProps?.vista).toBe('perfil');
    expect(escena.ultimasProps?.alt).toBe(actividad.config.alt);
  });
});

describe('texto de la fase sincronizado con t', () => {
  it('cambia de fase en el punto medio entre hitos (y solo entonces)', async () => {
    const w = await montarListo();
    const titulo = () => control(w, 'fase-actual').get('h4').text();
    await mover(w, 0.06, false);
    expect(titulo()).toBe('Primera fase');
    await mover(w, 0.08, false);
    expect(titulo()).toBe('Segunda fase');
    await mover(w, 0.22, false);
    expect(titulo()).toBe('Segunda fase');
    await mover(w, 0.24, false);
    expect(titulo()).toBe('Tercera fase');
    await mover(w, 1, false);
    expect(titulo()).toBe('Quinta fase');
    await mover(w, 0, false);
    expect(titulo()).toBe('Primera fase');
  });

  it('marca la fase en curso en la lista con aria-current="step"', async () => {
    const w = await montarListo();
    await mover(w, 0.5, false);
    expect(fase(w, 'paso_cuatro').attributes('aria-current')).toBe('step');
    expect(fase(w, 'paso_tres').attributes('aria-current')).toBeUndefined();
  });

  it('el deslizador es operable con teclado y dice en qué fase está', async () => {
    const w = await montarListo();
    const el = deslizador(w);
    expect(el.attributes('type')).toBe('range');
    expect(el.attributes('min')).toBe('0');
    expect(el.attributes('max')).toBe('1000');
    expect(w.find(`label[for="${el.attributes('id')}"]`).exists()).toBe(true);
    await mover(w, 0.32, false);
    expect(el.attributes('aria-valuetext')).toContain('Fase 3 de 5: Tercera fase');
    expect(el.attributes('aria-valuetext')).toContain('32 %');
  });

  describe('región aria-live moderada', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('anuncia solo el cambio de fase (título corto) y con retardo, no en cada movimiento', async () => {
      const w = await montarListo();
      const anuncio = () => control(w, 'anuncio-fase').text();
      expect(control(w, 'anuncio-fase').attributes('aria-live')).toBe('polite');
      expect(anuncio()).toBe('');
      // Recorrer varias fases seguidas (arrastrando) no habla hasta que se queda quieto.
      await mover(w, 0.2, false);
      await mover(w, 0.4, false);
      await mover(w, 0.5, false);
      await vi.advanceTimersByTimeAsync(100);
      expect(anuncio()).toBe('');
      await vi.advanceTimersByTimeAsync(600);
      expect(anuncio()).toBe('Fase 4 de 5: Cuarta fase.');
    });
  });
});

describe('visitar y completar', () => {
  it('pulsar una fase de la lista lleva la línea hasta su hito, la marca visitada y emite la interacción', async () => {
    const w = await montarListo();
    await fase(w, 'paso_tres').trigger('click');
    await flushPromises();
    expect(valorT(w)).toBeCloseTo(0.32, 9);
    expect(fase(w, 'paso_tres').attributes('data-visitado')).toBe('true');
    expect(control(w, 'fase-actual').text()).toContain('Tercera fase');
    expect(eventos(w).interaccion?.[0]).toEqual([
      { accion: 'selecciona_nodo', objeto: 'paso_tres' },
    ]);
    // Solo esa: los saltos no visitan lo de en medio.
    expect(fase(w, 'paso_dos').attributes('data-visitado')).toBe('false');
    expect(w.text()).toContain('1 de 5 fases requeridas visitadas');
  });

  it('pasar por un hito con el deslizador lo visita; detenerse en él, también; quedarse entre dos, no', async () => {
    const w = await montarListo();
    await mover(w, 0.2); // pasa por paso_uno (0) y paso_dos (0,14) y se detiene entre fases
    expect(fase(w, 'paso_uno').attributes('data-visitado')).toBe('true');
    expect(fase(w, 'paso_dos').attributes('data-visitado')).toBe('true');
    expect(fase(w, 'paso_tres').attributes('data-visitado')).toBe('false');
    await mover(w, 0.5); // se detiene justo en paso_cuatro y pasa por paso_tres
    expect(fase(w, 'paso_tres').attributes('data-visitado')).toBe('true');
    expect(fase(w, 'paso_cuatro').attributes('data-visitado')).toBe('true');
    expect(fase(w, 'paso_cinco').attributes('data-visitado')).toBe('false');
  });

  it('adelantar y atrasar es exacto: la escena y el texto quedan donde estaban al pasar', async () => {
    const w = await montarListo();
    await mover(w, 0.77, false);
    const propsIda = { ...escena.ultimasProps };
    const textoIda = control(w, 'fase-actual').text();
    await mover(w, 0.1, false);
    await mover(w, 1, false);
    await mover(w, 0.77, false);
    expect(escena.ultimasProps?.t).toBe(propsIda.t);
    expect(control(w, 'fase-actual').text()).toBe(textoIda);
  });

  it('paso anterior y siguiente saltan de hito en hito', async () => {
    const w = await montarListo();
    await control(w, 'fase-siguiente').trigger('click');
    expect(valorT(w)).toBeCloseTo(0.14, 9);
    await control(w, 'fase-siguiente').trigger('click');
    await control(w, 'fase-siguiente').trigger('click');
    expect(valorT(w)).toBeCloseTo(0.5, 9);
    await control(w, 'fase-anterior').trigger('click');
    expect(valorT(w)).toBeCloseTo(0.32, 9);
    expect(w.text()).toContain('3 de 5 fases requeridas visitadas');
  });

  it('completa al visitar todas las requeridas: un resultado, con el puntaje de la fórmula común', async () => {
    const w = await montarListo();
    await mover(w, 1); // arrastrar de punta a punta pasa por todos los hitos
    const r = resultados(w);
    expect(r).toHaveLength(1);
    expect(r[0]!.precision).toBe(1);
    expect(r[0]!.intentos).toBe(1);
    expect(r[0]!.puntaje).toBe(calcularPuntaje(actividad, { precision: 1, intentos: 1 }));
    expect(r[0]!.detalle.visitados).toEqual(PASOS.map(([id]) => id));
    expect(problemasDeEmisiones(eventos(w), actividad)).toEqual([]);
    expect(w.find('[data-testid="resultado"]').exists()).toBe(true);
  });

  it('solo cuentan las requeridas: con una requerida menos se completa antes', async () => {
    const parcial = crear({ requeridos: ['paso_dos', 'paso_cuatro'] });
    const w = await montarListo(parcial);
    await fase(w, 'paso_cuatro').trigger('click');
    expect(resultados(w)).toHaveLength(0);
    await fase(w, 'paso_dos').trigger('click');
    expect(resultados(w)).toHaveLength(1);
    expect(resultados(w)[0]!.detalle.visitados).toEqual(['paso_cuatro', 'paso_dos']);
  });

  it('vuelve a t = 0 y deja visitar de nuevo al repetir', async () => {
    const w = await montarListo();
    await mover(w, 1);
    expect(resultados(w)).toHaveLength(1);
    await w.get('[data-testid="repetir"]').trigger('click');
    await flushPromises();
    expect(valorT(w)).toBe(0);
    expect(w.text()).toContain('0 de 5 fases requeridas visitadas');
    await mover(w, 1);
    expect(resultados(w)).toHaveLength(2);
    expect(resultados(w)[1]!.intentos).toBe(2);
  });

  it('emite `progreso` con el avance y una instantánea con los índices de las fases', async () => {
    const w = await montarListo();
    await fase(w, 'paso_dos').trigger('click');
    await fase(w, 'paso_cuatro').trigger('click');
    const progreso = (w.emitted('progreso') ?? []) as unknown as [
      { avance: number; instantanea: { visitados: number[] } },
    ][];
    expect(progreso.length).toBeGreaterThanOrEqual(1);
    expect(progreso[0]![0].instantanea).toEqual({ visitados: [1] });
  });

  it('restaura las fases visitadas de una instantánea', async () => {
    const w = await montarListo(actividad, {
      estadoPrevio: {
        progreso: { avance: 0.4, intentos: 1, instantanea: { visitados: [0, 3] } },
      },
    });
    expect(fase(w, 'paso_uno').attributes('data-visitado')).toBe('true');
    expect(fase(w, 'paso_cuatro').attributes('data-visitado')).toBe('true');
    expect(w.text()).toContain('2 de 5 fases requeridas visitadas');
  });
});

describe('reproducción', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'setTimeout',
        'clearTimeout',
      ],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('reproducir avanza t, cambia el botón a "Pausar" y pausar lo detiene', async () => {
    const w = await montarListo();
    await control(w, 'reproducir').trigger('click');
    expect(control(w, 'reproducir').attributes('aria-pressed')).toBe('true');
    expect(control(w, 'reproducir').text()).toContain('Pausar');
    await vi.advanceTimersByTimeAsync(4000);
    await flushPromises();
    const t1 = valorT(w);
    expect(t1).toBeGreaterThan(0.05);
    await control(w, 'reproducir').trigger('click');
    expect(control(w, 'reproducir').attributes('aria-pressed')).toBe('false');
    await vi.advanceTimersByTimeAsync(4000);
    expect(valorT(w)).toBeCloseTo(t1, 6);
  });

  it('a doble velocidad avanza más deprisa', async () => {
    const lenta = await montarListo();
    await control(lenta, 'reproducir').trigger('click');
    await vi.advanceTimersByTimeAsync(3000);
    const tNormal = valorT(lenta);
    lenta.unmount();
    const rapida = await montarListo();
    await control(rapida, 'velocidad').setValue('2');
    await control(rapida, 'reproducir').trigger('click');
    await vi.advanceTimersByTimeAsync(3000);
    expect(valorT(rapida)).toBeGreaterThan(tNormal * 1.6);
  });

  it('reproduciendo pasa por los hitos y llega a completar', async () => {
    const w = await montarListo();
    await control(w, 'velocidad').setValue('2');
    await control(w, 'reproducir').trigger('click');
    await vi.advanceTimersByTimeAsync(40_000);
    await flushPromises();
    expect(resultados(w)).toHaveLength(1);
    expect(control(w, 'reproducir').attributes('aria-pressed')).toBe('false');
    expect(valorT(w)).toBe(1);
  });

  it('reiniciar vuelve a t = 0 y detiene la reproducción', async () => {
    const w = await montarListo();
    await control(w, 'reproducir').trigger('click');
    await vi.advanceTimersByTimeAsync(3000);
    await control(w, 'reiniciar-tiempo').trigger('click');
    await flushPromises();
    expect(valorT(w)).toBe(0);
    expect(control(w, 'reproducir').attributes('aria-pressed')).toBe('false');
  });

  it('mover el deslizador durante la reproducción la pausa', async () => {
    const w = await montarListo();
    await control(w, 'reproducir').trigger('click');
    await mover(w, 0.4, false);
    expect(control(w, 'reproducir').attributes('aria-pressed')).toBe('false');
  });
});

describe('cámara', () => {
  it('la vista sigue a la fase hasta que el estudiante toma el control, y se recupera con "Vista de la fase"', async () => {
    const w = await montarListo();
    const vista = () => String(escena.ultimasProps?.vista);
    await fase(w, 'paso_tres').trigger('click');
    await flushPromises();
    expect(vista()).toBe('perfil');
    // El estudiante gira la escena a mano: deja de seguir a la fase.
    await w.get('[data-testid="escena-falsa"]').trigger('click');
    await fase(w, 'paso_cuatro').trigger('click');
    await flushPromises();
    expect(vista()).toBe('perfil');
    expect(control(w, 'selector-vista').element).toHaveProperty('value', 'libre');
    await control(w, 'vista-de-la-fase').trigger('click');
    await flushPromises();
    expect(vista()).toBe('detalle');
  });

  it('el selector de vista fija una vista con nombre', async () => {
    const w = await montarListo();
    await control(w, 'selector-vista').setValue('extremo');
    await flushPromises();
    expect(escena.ultimasProps?.vista).toBe('extremo');
    await fase(w, 'paso_tres').trigger('click');
    await flushPromises();
    expect(escena.ultimasProps?.vista).toBe('extremo');
  });

  it('acercar y alejar mandan órdenes de zoom distintas', async () => {
    const w = await montarListo();
    await control(w, 'acercar').trigger('click');
    const primera = escena.ultimasProps?.ordenZoom as { id: number; factor: number };
    expect(primera.factor).toBeLessThan(1);
    await control(w, 'alejar').trigger('click');
    const segunda = escena.ultimasProps?.ordenZoom as { id: number; factor: number };
    expect(segunda.factor).toBeGreaterThan(1);
    expect(segunda.id).toBeGreaterThan(primera.id);
  });
});

describe('sin WebGL', () => {
  it('con la escena sin WebGL avisa, oculta los controles de cámara y sigue completándose (texto, línea y lista)', async () => {
    escena.estado = 'sin_webgl';
    const w = await montarListo();
    const aviso = w.get('[data-testid="aviso-sin-3d"]');
    expect(aviso.text()).toContain('lista de fases');
    expect(aviso.text()).toContain('línea de tiempo');
    expect(w.find('[data-testid="selector-vista"]').exists()).toBe(false);
    expect(w.find('[data-testid="acercar"]').exists()).toBe(false);
    // El texto de la fase, el deslizador y los botones funcionan igual.
    await mover(w, 0.5, false);
    expect(control(w, 'fase-actual').text()).toContain('Cuarta fase');
    await mover(w, 1);
    expect(resultados(w)).toHaveLength(1);
  });

  it('solo con la lista de fases se completa la actividad', async () => {
    escena.estado = 'error';
    const w = await montarListo();
    for (const [id] of PASOS) await fase(w, id).trigger('click');
    expect(resultados(w)).toHaveLength(1);
  });
});

describe('modo revisar', () => {
  it('permite recorrer la línea de tiempo sin emitir nada ni marcar visitas', async () => {
    const w = await montarListo(actividad, { modo: 'revisar' });
    expect(w.find('[data-testid="aviso-revision"]').exists()).toBe(true);
    await mover(w, 1);
    await fase(w, 'paso_dos').trigger('click');
    expect(control(w, 'fase-actual').text()).toContain('Segunda fase');
    expect(w.emitted('completada')).toBeUndefined();
    expect(w.emitted('interaccion')).toBeUndefined();
    expect(w.emitted('progreso')).toBeUndefined();
    expect(w.findAll('[data-visitado="true"]')).toHaveLength(0);
  });
});

describe('carga perezosa y limpieza', () => {
  it('el panel no importa three ni TresJS ni la escena de forma estática', () => {
    expect(fuentePanel).not.toMatch(/from\s+['"]three/);
    expect(fuentePanel).not.toMatch(/from\s+['"]@tresjs/);
    expect(fuentePanel).not.toMatch(/from\s+['"]@\/scenes\/procedural\/bmu/);
    expect(fuentePanel).not.toContain('v-html');
  });

  it('desmonta la escena una sola vez y no deja reproducción en marcha', async () => {
    const w = await montarListo();
    await control(w, 'reproducir').trigger('click');
    w.unmount();
    expect(escena.montajes).toBe(1);
    expect(escena.desmontajes).toBe(1);
  });
});
