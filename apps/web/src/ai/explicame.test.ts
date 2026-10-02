/** "Explícame esto" (F3-06): nombre legible, pregunta fija y evento de documento. */
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useContextoStore } from '@/stores/contextoPedagogico';
import {
  EVENTO_PREGUNTAR_AL_MENTOR,
  limpiarIndicesExplicame,
  nombreDesdeId,
  preguntaExplicame,
  preguntarAlMentor,
  textoDelEvento,
  useExplicame,
} from './explicame';

const cargarModulo = vi.hoisted(() => vi.fn());
vi.mock('@/content/registry', () => ({ cargarModulo }));

/** Módulo mínimo con lo que leen `indiceEstructuras` e `indiceMoleculas`. */
const MODULO = {
  secciones: [
    {
      id: 's1',
      bloques: [
        {
          tipo: 'actividad',
          actividad: {
            id: 'm2_capas',
            tipo: 'multicapa',
            config: {
              capas: [{ id: 'histo_osteoclasto', etiqueta: 'Osteoclasto', descripcion: 'x' }],
            },
          },
        },
        {
          tipo: 'actividad',
          actividad: {
            id: 'm2_3d',
            tipo: 'exploracion-3d',
            config: { nodos: [{ id: 'cuerpo', etiqueta: 'Cuerpo mandibular', descripcion: 'x' }] },
          },
        },
        {
          tipo: 'actividad',
          actividad: {
            id: 'm2_3d_bis',
            tipo: 'exploracion-3d',
            config: { nodos: [{ id: 'cuerpo', etiqueta: 'Cuerpo del fémur', descripcion: 'x' }] },
          },
        },
        {
          tipo: 'actividad',
          actividad: {
            id: 'm2_drag',
            tipo: 'arrastre-molecular',
            config: { moleculas: [{ id: 'mol_rankl', etiqueta: 'RANKL', descripcion: 'x' }] },
          },
        },
      ],
    },
  ],
};

function preparar() {
  setActivePinia(createPinia());
  const contexto = useContextoStore();
  contexto.setModulo(2);
  const scope = effectScope();
  const { chips } = scope.run(() => useExplicame())!;
  return { contexto, chips };
}

beforeEach(() => {
  cargarModulo.mockReset();
  cargarModulo.mockResolvedValue({ ok: true, modulo: MODULO, entrada: {} });
  limpiarIndicesExplicame();
});

describe('nombres y pregunta', () => {
  it.each([
    ['histo_osteoclasto', 'Osteoclasto'],
    ['mol_rankl', 'Rankl'],
    ['cartilago_articular', 'Cartilago articular'],
    ['capa_periostio', 'Periostio'],
    ['mol_', 'mol_'],
  ])('%s -> %s', (id, esperado) => {
    expect(nombreDesdeId(id)).toBe(esperado);
  });

  it('la pregunta es clara, fija y con el nombre entre comillas', () => {
    expect(preguntaExplicame('Osteoclasto')).toBe(
      'Explícame «Osteoclasto»: ¿qué es, qué función cumple y cómo se relaciona con lo que estoy estudiando?',
    );
  });
});

describe('chips', () => {
  it('sin selección no hay chips ni se carga el módulo', async () => {
    const { chips } = preparar();
    await flushPromises();
    expect(chips.value).toEqual([]);
    expect(cargarModulo).not.toHaveBeenCalled();
  });

  it('una estructura toma su nombre del contenido del módulo', async () => {
    const { contexto, chips } = preparar();
    contexto.setEstructura('histo_osteoclasto');
    await flushPromises();
    expect(chips.value).toEqual([
      {
        clave: 'estructura:histo_osteoclasto',
        tipo: 'estructura',
        nombre: 'Osteoclasto',
        pregunta: preguntaExplicame('Osteoclasto'),
      },
    ]);
    expect(cargarModulo).toHaveBeenCalledWith(2);
  });

  it('antes de cargar el contenido usa el nombre derivado del id', () => {
    const { contexto, chips } = preparar();
    contexto.setEstructura('histo_osteoclasto');
    expect(chips.value[0]!.nombre).toBe('Osteoclasto');
    contexto.setEstructura('lamina_cribiforme');
    expect(chips.value[0]!.nombre).toBe('Lamina cribiforme');
  });

  it('un nodo repetido entre actividades se resuelve con la actividad abierta', async () => {
    const { contexto, chips } = preparar();
    contexto.setEstructura('cuerpo');
    contexto.setActividad({
      id: 'm2_3d_bis',
      tipo: 'exploracion-3d',
      intentos: 0,
      completada: false,
    });
    await flushPromises();
    expect(chips.value[0]!.nombre).toBe('Cuerpo del fémur');
    contexto.setActividad({ id: 'm2_3d', tipo: 'exploracion-3d', intentos: 0, completada: false });
    expect(chips.value[0]!.nombre).toBe('Cuerpo mandibular');
  });

  it('una molécula usa la etiqueta del contenido', async () => {
    const { contexto, chips } = preparar();
    contexto.setMolecula('mol_rankl');
    await flushPromises();
    expect(chips.value).toHaveLength(1);
    expect(chips.value[0]).toMatchObject({ tipo: 'molecula', nombre: 'RANKL' });
    expect(chips.value[0]!.pregunta).toContain('«RANKL»');
  });

  it('con ambas, la estructura va primero, salvo en una actividad de moléculas', async () => {
    const { contexto, chips } = preparar();
    contexto.setEstructura('histo_osteoclasto');
    contexto.setMolecula('mol_rankl');
    await flushPromises();
    expect(chips.value.map((c) => c.tipo)).toEqual(['estructura', 'molecula']);
    contexto.setActividad({
      id: 'm2_drag',
      tipo: 'arrastre-molecular',
      intentos: 1,
      completada: false,
    });
    expect(chips.value.map((c) => c.tipo)).toEqual(['molecula', 'estructura']);
  });

  it('al cambiar de sección la selección y los chips desaparecen', async () => {
    const { contexto, chips } = preparar();
    contexto.setEstructura('histo_osteoclasto');
    await flushPromises();
    contexto.setSeccion('otra_seccion');
    expect(chips.value).toEqual([]);
  });

  it('si el contenido no carga, sigue funcionando con el nombre derivado', async () => {
    cargarModulo.mockResolvedValue({
      ok: false,
      motivo: 'sin_contenido',
      mensaje: '',
      errores: [],
    });
    const { contexto, chips } = preparar();
    contexto.setEstructura('histo_osteoclasto');
    await flushPromises();
    expect(chips.value[0]!.nombre).toBe('Osteoclasto');
  });
});

describe('evento de documento', () => {
  it('preguntarAlMentor emite el evento documentado con el texto', () => {
    const escucha = vi.fn();
    document.addEventListener(EVENTO_PREGUNTAR_AL_MENTOR, escucha);
    preguntarAlMentor('¿Qué es la lámina cribiforme?');
    document.removeEventListener(EVENTO_PREGUNTAR_AL_MENTOR, escucha);
    expect(EVENTO_PREGUNTAR_AL_MENTOR).toBe('ova:preguntar-al-mentor');
    expect(escucha).toHaveBeenCalledTimes(1);
    expect(textoDelEvento(escucha.mock.calls[0]![0] as Event)).toBe(
      '¿Qué es la lámina cribiforme?',
    );
  });

  it.each([
    [{ texto: '   ' }],
    [{ texto: 'x'.repeat(501) }],
    [{ texto: 42 }],
    [{}],
    [null],
    ['texto suelto'],
  ])('ignora un detalle inválido: %j', (detalle) => {
    expect(textoDelEvento(new CustomEvent('x', { detail: detalle }))).toBeNull();
  });

  it('recorta los espacios y acepta el máximo', () => {
    expect(textoDelEvento(new CustomEvent('x', { detail: { texto: '  hola  ' } }))).toBe('hola');
    const maximo = 'y'.repeat(500);
    expect(textoDelEvento(new CustomEvent('x', { detail: { texto: maximo } }))).toBe(maximo);
  });
});
