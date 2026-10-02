/**
 * Pruebas de la variante PROCEDURAL de `exploracion-3d` en el esquema: una escena hecha por código con una
 * línea de tiempo de pasos, en lugar de un modelo con nodos. Lo de mandíbula y células tiene sus pruebas en
 * `schema.test.ts` y no cambia.
 */
import { describe, expect, it } from 'vitest';
import { ActividadExploracion3dSchema, ConfigExploracion3dSchema } from './schema';

const PASOS = [
  {
    id: 'paso_inicio',
    t: 0,
    titulo: 'Inicio del proceso',
    texto: 'Así empieza el proceso que se recorre en la línea de tiempo.',
    vista: 'general',
  },
  {
    id: 'paso_medio',
    t: 0.5,
    titulo: 'Punto medio',
    texto: 'A mitad del recorrido se ve el túnel excavado por completo.',
    vista: 'perfil',
  },
  {
    id: 'paso_final',
    t: 1,
    titulo: 'Final del proceso',
    texto: 'Al final queda la estructura nueva con su conducto estrecho.',
  },
];

function config(cambios: Record<string, unknown> = {}) {
  return {
    modelo: 'procedural',
    escena: 'bmu_remodelado',
    alt: 'Escena 3D procedural de prueba que se puede girar y recorrer en el tiempo.',
    linea_de_tiempo: { pasos: PASOS },
    requeridos: ['paso_inicio', 'paso_final'],
    ...cambios,
  };
}

function problemas(entrada: unknown): string[] {
  const r = ConfigExploracion3dSchema.safeParse(entrada);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

describe('exploracion-3d procedural: lo que admite', () => {
  it('acepta una escena registrada con su línea de tiempo y sin nodos', () => {
    const r = ConfigExploracion3dSchema.safeParse(config());
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.nodos).toEqual([]);
      // La vista por defecto de un paso es la general.
      expect(r.data.linea_de_tiempo?.pasos[2]?.vista).toBe('general');
    }
  });

  it('la actividad completa valida con tipo exploracion-3d (el tipo no cambia)', () => {
    const r = ActividadExploracion3dSchema.safeParse({
      id: 'm5_bmu_prueba',
      tipo: 'exploracion-3d',
      titulo: 'Escena procedural de prueba',
      instrucciones: 'Reproduce la línea de tiempo y visita todas las fases.',
      puntaje_max: 40,
      retroalimentacion: { correcta: 'Recorriste todas las fases de la escena de prueba.' },
      concepto: 'Prueba',
      config: config(),
    });
    expect(r.success).toBe(true);
  });
});

describe('exploracion-3d procedural: lo que rechaza', () => {
  it('exige escena y línea de tiempo', () => {
    expect(problemas(config({ escena: undefined })).join('|')).toContain('Falta "escena"');
    expect(problemas(config({ linea_de_tiempo: undefined })).join('|')).toContain(
      'Falta "linea_de_tiempo"',
    );
  });

  it('rechaza una escena que no está registrada', () => {
    expect(problemas(config({ escena: 'no_existe' })).join('|')).toContain('escena');
  });

  it('no admite nodos en una escena procedural', () => {
    const nodos = [
      {
        id: 'a',
        etiqueta: 'A',
        descripcion: 'Una descripción de prueba.',
        ancla: { x: 0, y: 0, z: 0 },
      },
    ];
    expect(problemas(config({ nodos })).join('|')).toContain('no lleva "nodos"');
  });

  it('exige t entre 0 y 1, estrictamente creciente', () => {
    const mal = (t: number[]) =>
      problemas(config({ linea_de_tiempo: { pasos: PASOS.map((p, i) => ({ ...p, t: t[i]! })) } }));
    expect(mal([0, 0.5, 1.2]).length).toBeGreaterThan(0);
    expect(mal([-0.1, 0.5, 1]).length).toBeGreaterThan(0);
    expect(mal([0, 0.5, 0.5]).join('|')).toContain('orden cronológico');
    expect(mal([0.6, 0.5, 1]).join('|')).toContain('orden cronológico');
  });

  it('rechaza una vista que la escena no tiene', () => {
    const pasos = PASOS.map((p, i) => (i === 1 ? { ...p, vista: 'desde_marte' } : p));
    const texto = problemas(config({ linea_de_tiempo: { pasos } })).join('|');
    expect(texto).toContain('linea_de_tiempo.pasos.1.vista');
    expect(texto).toContain('general, perfil, extremo, detalle');
  });

  it('rechaza ids de paso repetidos y requeridos que no existen o se repiten', () => {
    const repetidos = PASOS.map((p, i) => (i === 2 ? { ...p, id: 'paso_inicio' } : p));
    expect(problemas(config({ linea_de_tiempo: { pasos: repetidos } })).join('|')).toContain(
      'está repetido',
    );
    expect(problemas(config({ requeridos: ['paso_fantasma'] })).join('|')).toContain(
      'no existe en "linea_de_tiempo"',
    );
    expect(problemas(config({ requeridos: ['paso_inicio', 'paso_inicio'] })).join('|')).toContain(
      'está repetido',
    );
  });

  it('pide entre 2 y 12 pasos', () => {
    expect(
      problemas(config({ linea_de_tiempo: { pasos: [PASOS[0]] }, requeridos: ['paso_inicio'] }))
        .length,
    ).toBeGreaterThan(0);
  });

  it('los campos de la variante procedural no valen en un modelo con GLB', () => {
    const base = {
      modelo: 'mandibula',
      alt: 'Modelo 3D de la mandíbula de prueba.',
      nodos: [
        { id: 'condilo', etiqueta: 'Cóndilo', descripcion: 'Extremo superior de la rama.' },
        { id: 'sinfisis', etiqueta: 'Sínfisis', descripcion: 'Unión de las dos mitades.' },
      ],
      requeridos: ['condilo'],
    };
    expect(problemas(base)).toEqual([]);
    expect(problemas({ ...base, escena: 'bmu_remodelado' }).join('|')).toContain('escena');
    expect(problemas({ ...base, linea_de_tiempo: { pasos: PASOS } }).join('|')).toContain(
      'linea_de_tiempo',
    );
    // Y un modelo con GLB sigue necesitando 2 nodos como mínimo.
    expect(problemas({ ...base, nodos: [base.nodos[0]] }).join('|')).toContain('entre 2 y 12');
    expect(problemas({ ...base, nodos: undefined }).join('|')).toContain('entre 2 y 12');
  });
});
