/**
 * Pruebas del modo `identificar` de ActividadExploracion3d (`config.modo`): consignas por `pista`, fallos que
 * bajan la precisión, toques repetidos que no cuentan, instantánea y reinicio. La escena es un doble sin WebGL,
 * como en `ActividadExploracion3d.test.ts`.
 */
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PropsActividadExploracion3d, ResultadoActividad } from '@/activities/types';
import { pruebasDeContratoActividad } from '@/content/__fixtures__/contrato';
import { calcularPuntaje } from '@/content/scoring';
import type { ActividadExploracion3d } from '@/content/schema';
import { ActividadExploracion3dSchema } from '@/content/schema';
import Actividad from './ActividadExploracion3d.vue';
import { crearActividad } from './utilesPrueba';

vi.mock('@/scenes/EscenaExploracion.vue', async () => {
  const { defineComponent, h, onMounted } = await import('vue');
  return {
    // Sin `__esModule`, Vue tomaría el módulo entero por el componente (defineAsyncComponent).
    __esModule: true,
    default: defineComponent({
      name: 'EscenaExploracionFalsa',
      props: {
        modelo: { type: String, default: undefined },
        alt: { type: String, default: undefined },
        nodos: { type: Array, default: undefined },
        visitados: { type: Array, default: undefined },
        seleccionId: { type: String, default: undefined },
        ordenEnfoque: { type: Number, default: undefined },
      },
      emits: ['seleccionar', 'estado'],
      setup(props: { nodos: { id: string; etiqueta: string }[] }, { emit }) {
        onMounted(() => emit('estado', 'listo'));
        return () =>
          h(
            'div',
            { 'data-testid': 'escena-falsa' },
            props.nodos.map((n) =>
              h(
                'button',
                { type: 'button', 'data-punto': n.id, onClick: () => emit('seleccionar', n.id) },
                `Punto ${n.etiqueta}`,
              ),
            ),
          );
      },
    }),
  };
});

enableAutoUnmount(afterEach);

type Props = Omit<PropsActividadExploracion3d, 'modulo'>;

async function montar(
  actividad: ActividadExploracion3d,
  extra: Partial<Props> = {},
): Promise<VueWrapper> {
  const w = mount(Actividad, {
    props: { modulo: 1, actividad, ...extra },
    attachTo: document.body,
  }) as unknown as VueWrapper;
  await flushPromises();
  return w;
}

function parte(w: VueWrapper, id: string) {
  const encontrado = w.findAll('[data-nodo]').find((b) => b.attributes('data-nodo') === id);
  if (!encontrado) throw new Error(`No hay una parte "${id}" en la lista`);
  return encontrado;
}

async function tocar(w: VueWrapper, ...ids: string[]): Promise<void> {
  for (const id of ids) await parte(w, id).trigger('click');
}

function resultados(w: VueWrapper): ResultadoActividad<'exploracion-3d'>[] {
  return (w.emitted('completada') ?? []).map((a) => a[0] as ResultadoActividad<'exploracion-3d'>);
}

const actividad = crearActividad({ identificar: true, nodos: 4, requeridos: 3 });

pruebasDeContratoActividad({
  nombre: 'ActividadExploracion3d (identificar)',
  actividad,
  montar: (props) => mount(Actividad, { props, attachTo: document.body }) as unknown as VueWrapper,
  completar: (w) => tocar(w, ...actividad.config.requeridos),
  precisionEsperada: 1,
});

describe('modo identificar', () => {
  it('muestra la consigna en curso y el avance por consignas', async () => {
    const w = await montar(actividad);
    expect(w.get('[data-testid="consigna"]').text()).toContain('Consigna 1 de 3');
    expect(w.get('[data-testid="consigna"]').text()).toContain('Pista de la zona número 1');
    expect(w.get('[data-testid="avance"]').text()).toContain('0 de 3 consignas resueltas');
  });

  it('un acierto pasa a la siguiente consigna, marca el nodo y emite identifica_nodo', async () => {
    const w = await montar(actividad);
    await tocar(w, 'zona_1');
    expect(w.get('[data-testid="veredicto"]').attributes('data-tipo')).toBe('correcta');
    expect(w.get('[data-testid="consigna"]').text()).toContain('Pista de la zona número 2');
    expect(parte(w, 'zona_1').attributes('data-visitado')).toBe('true');
    expect(w.emitted('interaccion')).toEqual([
      [{ accion: 'identifica_nodo', objeto: 'zona_1', resultado: 'correcta' }],
    ]);
  });

  it('un fallo cuenta contra el nodo pedido y baja la precisión al completar', async () => {
    const w = await montar(actividad);
    await tocar(w, 'zona_4');
    expect(w.get('[data-testid="veredicto"]').attributes('data-tipo')).toBe('incorrecta');
    expect(w.emitted('interaccion')).toEqual([
      [{ accion: 'identifica_nodo', objeto: 'zona_1', resultado: 'incorrecta' }],
      [{ accion: 'selecciona_nodo', objeto: 'zona_4' }],
    ]);
    await tocar(w, 'zona_1', 'zona_2', 'zona_3');
    const [final] = resultados(w);
    expect(final!.precision).toBeCloseTo(3 / 4);
    expect(final!.puntaje).toBe(calcularPuntaje(actividad, { precision: 3 / 4, intentos: 1 }));
    expect(final!.detalle).toEqual({
      modo: 'identificar',
      visitados: ['zona_1', 'zona_2', 'zona_3'],
      aciertos: 3,
      errores: 1,
      errores_por_nodo: { zona_1: 1 },
    });
    expect(w.get('[data-testid="resultado"]').text()).toContain('Actividad completada');
  });

  it('tocar uno ya identificado no es un fallo', async () => {
    const w = await montar(actividad);
    await tocar(w, 'zona_1', 'zona_1');
    expect(w.get('[data-testid="veredicto"]').attributes('data-tipo')).toBe('info');
    await tocar(w, 'zona_2', 'zona_3');
    expect(resultados(w)[0]!.precision).toBe(1);
  });

  it('recupera la consigna en curso y los fallos de una instantánea', async () => {
    const w = await montar(actividad, {
      estadoPrevio: {
        progreso: {
          avance: 1 / 3,
          intentos: 1,
          instantanea: { modo: 'identificar', paso: 1, errores_por_nodo: { zona_1: 1 } },
        },
      },
    } as Partial<Props>);
    expect(w.get('[data-testid="consigna"]').text()).toContain('Consigna 2 de 3');
    expect(parte(w, 'zona_1').attributes('data-visitado')).toBe('true');
    await tocar(w, 'zona_2', 'zona_3');
    expect(resultados(w)[0]!.precision).toBeCloseTo(3 / 4);
  });

  it('una instantánea rota o de otro modo empieza de cero', async () => {
    for (const instantanea of [
      { modo: 'identificar', paso: 99 },
      { visitados: [0, 1] },
      'basura',
      { modo: 'identificar', paso: 1, errores_por_nodo: { zona_9: 5, zona_1: -2 } },
    ]) {
      const w = await montar(actividad, {
        estadoPrevio: { progreso: { avance: 0, intentos: 1, instantanea } },
      } as unknown as Partial<Props>);
      const consigna = w.get('[data-testid="consigna"]').text();
      if (typeof instantanea === 'object' && 'paso' in instantanea && instantanea.paso === 1) {
        expect(consigna).toContain('Consigna 2 de 3');
        await tocar(w, 'zona_2', 'zona_3');
        expect(resultados(w)[0]!.precision).toBe(1);
      } else {
        expect(consigna).toContain('Consigna 1 de 3');
      }
      w.unmount();
    }
  });

  it('emite la instantánea de identificar como progreso', async () => {
    const w = await montar(actividad);
    await tocar(w, 'zona_3', 'zona_1');
    await new Promise((r) => setTimeout(r, 1200));
    const progresos = (w.emitted('progreso') ?? []).map(
      (a) => a[0] as { avance: number; instantanea: unknown },
    );
    expect(progresos.length).toBeGreaterThan(0);
    expect(progresos.at(-1)).toMatchObject({
      avance: 1 / 3,
      instantanea: { modo: 'identificar', paso: 1, errores_por_nodo: { zona_1: 1 } },
    });
  });

  it('repetir empieza de cero: consignas, fallos e intento nuevo', async () => {
    const w = await montar(actividad);
    await tocar(w, 'zona_2', 'zona_1', 'zona_2', 'zona_3');
    await w.get('[data-testid="repetir"]').trigger('click');
    expect(w.get('[data-testid="consigna"]').text()).toContain('Consigna 1 de 3');
    await tocar(w, 'zona_1', 'zona_2', 'zona_3');
    const segundo = resultados(w)[1]!;
    expect(segundo.intentos).toBe(2);
    expect(segundo.precision).toBe(1);
  });

  it('en revisión no hay consigna: se leen las fichas', async () => {
    const w = await montar(actividad, { modo: 'revisar' });
    expect(w.find('[data-testid="consigna"]').exists()).toBe(false);
    await tocar(w, 'zona_2');
    expect(w.get('[data-testid="ficha"]').text()).toContain('Zona 2');
  });
});

describe('esquema del modo identificar', () => {
  const base = crearActividad({ identificar: true });

  it('cada requerido necesita pista', () => {
    const sinPista = structuredClone(base) as unknown as {
      config: { nodos: { pista?: string }[] };
    };
    delete sinPista.config.nodos[0]!.pista;
    expect(ActividadExploracion3dSchema.safeParse(sinPista).success).toBe(false);
  });

  it('una escena procedural no admite identificar', () => {
    const procedural = { ...base, config: { ...base.config, modelo: 'procedural', nodos: [] } };
    const r = ActividadExploracion3dSchema.safeParse(procedural);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('solo admite el modo');
  });
});
