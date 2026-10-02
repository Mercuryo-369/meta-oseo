/** Pruebas de la lógica de la variante procedural: los pasos de la línea de tiempo son las "partes". */
import { describe, expect, it } from 'vitest';
import { ConfigExploracion3dSchema } from '@/content/schema';
import type { ConfigExploracion3d } from '@/content/schema';
import {
  crearInstantanea,
  esExploracionProcedural,
  pasosDeConfig,
  prepararExploracion,
  restaurarVisitados,
} from './logica';

function config(cambios: Partial<ConfigExploracion3d> = {}): ConfigExploracion3d {
  return {
    ...ConfigExploracion3dSchema.parse({
      modelo: 'procedural',
      escena: 'bmu_remodelado',
      alt: 'Escena 3D de prueba con línea de tiempo para explorar.',
      linea_de_tiempo: {
        pasos: [
          { id: 'paso_b', t: 0.5, titulo: 'Fase B', texto: 'Texto de la fase B de prueba.' },
          { id: 'paso_a', t: 0, titulo: 'Fase A', texto: 'Texto de la fase A de prueba.' },
          { id: 'paso_c', t: 1, titulo: 'Fase C', texto: 'Texto de la fase C de prueba.' },
        ].sort((x, y) => x.t - y.t),
      },
      requeridos: ['paso_a', 'paso_c'],
    }),
    ...cambios,
  };
}

describe('prepararExploracion (procedural)', () => {
  it('convierte los pasos en nodos, en orden de t, con su título y su texto', () => {
    const e = prepararExploracion(config());
    expect(esExploracionProcedural(config())).toBe(true);
    expect(e.nodos.map((n) => n.id)).toEqual(['paso_a', 'paso_b', 'paso_c']);
    expect(e.nodos.map((n) => n.etiqueta)).toEqual(['Fase A', 'Fase B', 'Fase C']);
    expect(e.nodos[0]!.descripcion).toBe('Texto de la fase A de prueba.');
    expect(e.nodos.every((n) => n.ancla === undefined)).toBe(true);
    expect(e.requeridos).toEqual(['paso_a', 'paso_c']);
    expect(e.nodos.map((n) => n.requerido)).toEqual([true, false, true]);
    expect(e.pasos.map((p) => [p.id, p.t, p.vista])).toEqual([
      ['paso_a', 0, 'general'],
      ['paso_b', 0.5, 'general'],
      ['paso_c', 1, 'general'],
    ]);
  });

  it('sanea: pasos repetidos (gana el primero), requeridos que no existen y sin ninguno válido exige todos', () => {
    const base = config();
    const repetido = {
      ...base,
      linea_de_tiempo: {
        pasos: [
          ...base.linea_de_tiempo!.pasos,
          { ...base.linea_de_tiempo!.pasos[0]!, titulo: 'Otra' },
        ],
      },
    };
    expect(prepararExploracion(repetido).nodos).toHaveLength(3);
    expect(prepararExploracion({ ...base, requeridos: ['paso_a', 'fantasma'] }).requeridos).toEqual(
      ['paso_a'],
    );
    expect(prepararExploracion({ ...base, requeridos: ['fantasma'] }).requeridos).toEqual([
      'paso_a',
      'paso_b',
      'paso_c',
    ]);
  });

  it('una configuración sin línea de tiempo no se rompe', () => {
    const vacia = config({ linea_de_tiempo: undefined });
    expect(pasosDeConfig(vacia)).toEqual([]);
    expect(prepararExploracion(vacia).nodos).toEqual([]);
  });

  it('la instantánea guarda los índices de las fases y los restaura', () => {
    const e = prepararExploracion(config());
    expect(crearInstantanea(['paso_c', 'paso_a'], e.nodos)).toEqual({ visitados: [2, 0] });
    expect(restaurarVisitados({ visitados: [2, 0, 9, 'x'] }, e.nodos)).toEqual([
      'paso_c',
      'paso_a',
    ]);
  });

  it('un modelo con GLB no tiene pasos ni cambia', () => {
    const glb = ConfigExploracion3dSchema.parse({
      modelo: 'celulas',
      alt: 'Modelo 3D de células de prueba para explorar.',
      nodos: [
        { id: 'osteoblasto', etiqueta: 'Osteoblasto', descripcion: 'Forma la matriz ósea nueva.' },
        { id: 'osteocito', etiqueta: 'Osteocito', descripcion: 'Vive dentro de la matriz.' },
      ],
      requeridos: ['osteoblasto'],
    });
    const e = prepararExploracion(glb);
    expect(esExploracionProcedural(glb)).toBe(false);
    expect(e.pasos).toEqual([]);
    expect(e.nodos.map((n) => n.id)).toEqual(['osteoblasto', 'osteocito']);
  });
});
