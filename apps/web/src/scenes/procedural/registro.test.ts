/**
 * Pruebas del registro de escenas procedurales: cada escena del catálogo del contenido tiene su definición,
 * sus vistas coinciden con las del contenido, su estado es una función pura y el registro no arrastra three.
 */
import { describe, expect, it } from 'vitest';
import { ESCENAS_PROCEDURALES, VISTAS_ESCENA_PROCEDURAL } from '@/content/nodos3d';
import { HITOS_BMU } from './bmu/estado';
import { HITOS_HUESO } from './hueso/estado';
import { escenaProcedural, escenasProcedurales, hayEscenaProcedural } from './registro';
import fuenteRegistro from './registro.ts?raw';

describe('registro de escenas procedurales', () => {
  it('tiene una definición por cada escena que admite el contenido, y solo esas', () => {
    expect(escenasProcedurales().map((e) => e.id)).toEqual([...ESCENAS_PROCEDURALES]);
    for (const id of ESCENAS_PROCEDURALES) {
      expect(hayEscenaProcedural(id)).toBe(true);
      expect(escenaProcedural(id)?.id).toBe(id);
    }
    expect(hayEscenaProcedural('no_existe')).toBe(false);
    expect(escenaProcedural('no_existe')).toBeUndefined();
    expect(escenaProcedural(undefined)).toBeUndefined();
  });

  it('las vistas de cada escena son las del catálogo del contenido (la primera es la general)', () => {
    for (const escena of escenasProcedurales()) {
      expect(escena.vistas).toEqual(VISTAS_ESCENA_PROCEDURAL[escena.id]);
      expect(escena.vistas[0]).toBe('general');
    }
  });

  it('la BMU declara sus hitos, una duración razonable y un estado puro', () => {
    const bmu = escenaProcedural('bmu_remodelado')!;
    expect(bmu.hitos).toEqual(HITOS_BMU);
    expect(bmu.duracionSeg).toBeGreaterThanOrEqual(20);
    expect(bmu.duracionSeg).toBeLessThanOrEqual(90);
    expect(bmu.estado(0.37)).toEqual(bmu.estado(0.37));
  });

  it('el hueso declara sus hitos, una duración razonable y un estado puro', () => {
    const hueso = escenaProcedural('hueso_largo_a_osteona')!;
    expect(hueso.hitos).toEqual(HITOS_HUESO);
    expect(hueso.duracionSeg).toBeGreaterThanOrEqual(20);
    expect(hueso.duracionSeg).toBeLessThanOrEqual(90);
    expect(hueso.estado(0.37)).toEqual(hueso.estado(0.37));
  });

  it('los hitos de cada escena están dentro de [0, 1] y en orden estricto', () => {
    for (const escena of escenasProcedurales()) {
      const t = Object.values(escena.hitos);
      t.forEach((valor, i) => {
        expect(valor).toBeGreaterThanOrEqual(0);
        expect(valor).toBeLessThanOrEqual(1);
        if (i > 0) expect(valor).toBeGreaterThan(t[i - 1]!);
      });
    }
  });

  it('carga su componente de forma perezosa', async () => {
    for (const escena of escenasProcedurales()) {
      const modulo = await escena.cargar();
      expect(modulo.default, escena.id).toBeTruthy();
    }
  });

  it('no importa three ni TresJS (solo declara y carga con import dinámico)', () => {
    expect(fuenteRegistro).not.toMatch(/from\s+['"]three/);
    expect(fuenteRegistro).not.toMatch(/from\s+['"]@tresjs/);
    expect(fuenteRegistro).not.toMatch(/from\s+['"]\.\/bmu\/[A-Za-z]+\.vue['"]/);
    expect(fuenteRegistro).toMatch(/import\(['"]\.\/bmu\/EscenaBmu\.vue['"]\)/);
    expect(fuenteRegistro).not.toMatch(/from\s+['"]\.\/hueso\/[A-Za-z]+\.vue['"]/);
    expect(fuenteRegistro).toMatch(/import\(['"]\.\/hueso\/EscenaHueso\.vue['"]\)/);
    expect(fuenteRegistro).not.toMatch(/from\s+['"]\.\/(?:matriz|alveolar)\/[A-Za-z]+\.vue['"]/);
    expect(fuenteRegistro).toMatch(/import\(['"]\.\/matriz\/EscenaMatriz\.vue['"]\)/);
    expect(fuenteRegistro).toMatch(/import\(['"]\.\/alveolar\/EscenaAlveolar\.vue['"]\)/);
  });
});
