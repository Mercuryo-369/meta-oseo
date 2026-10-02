import { describe, expect, it, vi } from 'vitest';
import { BLOQUEO_SECUENCIAL } from '@/config';
import { catalogoDeRespaldo } from './logros';
import { MODULOS, esNumeroModulo, moduloPorNumero } from './modulos';

describe('MODULOS (docs/briefing-pedagogico.md)', () => {
  it('son los 6 módulos del briefing, en orden, con título y foco', () => {
    expect(MODULOS.map((m) => [m.numero, m.titulo, m.foco])).toEqual([
      [1, 'Conociendo el hueso', 'Generalidades, funciones biomecánicas y metabólicas esenciales'],
      [2, 'Descubriendo sus células', 'Origen y procesos de diferenciación celular'],
      [3, 'Construyendo hueso', 'Mecanotransducción y formación ósea'],
      [4, 'Transformando la matriz', 'Mineralización del tejido óseo'],
      [5, 'Renovando el hueso', 'Remodelado, reparación y equilibrio óseo'],
      [6, 'El paso del tiempo', 'Envejecimiento y cambios degenerativos'],
    ]);
  });

  it('los módulos 3, 4 y 5 son de densidad alta y el resto media', () => {
    expect(MODULOS.filter((m) => m.densidad === 'alta').map((m) => m.numero)).toEqual([3, 4, 5]);
  });

  it('los slugs son únicos y están en snake_case', () => {
    const slugs = MODULOS.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(6);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z]+(_[a-z]+)*$/);
  });

  it('cada módulo apunta al logro que otorga (catálogo de Fase 1 del contrato)', () => {
    expect(MODULOS.map((m) => m.logro)).toEqual([
      'primer_hueso',
      'celula_por_celula',
      'constructor',
      'mineralizador',
      'remodelador',
      'cronista',
    ]);
    expect(catalogoDeRespaldo().map((l) => l.codigo)).toEqual(MODULOS.map((m) => m.logro));
    expect(catalogoDeRespaldo()[0]).toMatchObject({
      nombre: 'Primer hueso',
      descripcion: 'Completaste el módulo 1',
      obtenido: false,
    });
  });

  it('moduloPorNumero y esNumeroModulo solo aceptan de 1 a 6', () => {
    expect(moduloPorNumero(3)?.titulo).toBe('Construyendo hueso');
    expect(moduloPorNumero(0)).toBeUndefined();
    expect(moduloPorNumero(7)).toBeUndefined();
    expect([1, 6].every(esNumeroModulo)).toBe(true);
    expect([0, 7, 2.5, '3', null].some(esNumeroModulo)).toBe(false);
  });
});

describe('config', () => {
  it('el bloqueo secuencial está activo por defecto (F2-08)', () => {
    expect(BLOQUEO_SECUENCIAL).toBe(true);
  });

  it('VITE_BLOQUEO_SECUENCIAL=false lo desactiva y cualquier otro valor lo deja activo', async () => {
    vi.stubEnv('VITE_BLOQUEO_SECUENCIAL', 'false');
    vi.resetModules();
    expect((await import('@/config')).BLOQUEO_SECUENCIAL).toBe(false);
    vi.stubEnv('VITE_BLOQUEO_SECUENCIAL', '0');
    vi.resetModules();
    expect((await import('@/config')).BLOQUEO_SECUENCIAL).toBe(true);
  });
});

// Los SVG ya producidos, tal como los ve el bundler: la portada debe apuntar a uno que exista.
const IMAGENES = import.meta.glob('../../public/images/m*/*.svg', {
  query: '?url',
  import: 'default',
});

const TEXTOS_SVG = import.meta.glob('../../public/images/m*/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('identidad de cada módulo', () => {
  it('cada módulo tiene rótulo, frase, icono y portada propios', () => {
    for (const campo of ['rotulo', 'frase', 'icono'] as const) {
      const valores = MODULOS.map((m) => m.identidad[campo]);
      expect(new Set(valores).size, campo).toBe(6);
      for (const v of valores) expect(v.length).toBeGreaterThan(2);
    }
    expect(new Set(MODULOS.map((m) => m.identidad.portada.src)).size).toBe(6);
  });

  it('la portada es un SVG ya producido de la carpeta de su módulo y el archivo existe', () => {
    for (const m of MODULOS) {
      const { src, ajuste } = m.identidad.portada;
      expect(src).toMatch(
        new RegExp('^/images/m' + m.numero + '/m' + m.numero + '_[a-z0-9_]+[.]svg$'),
      );
      expect(['cubrir', 'contener']).toContain(ajuste);
      expect(Object.keys(IMAGENES), src).toContain(`../../public${src}`);
    }
  });

  it('una portada con rótulos dentro del dibujo se muestra entera: recortarla cortaría sus palabras', () => {
    for (const m of MODULOS) {
      const { src, ajuste } = m.identidad.portada;
      const svg = TEXTOS_SVG[`../../public${src}`] ?? '';
      expect(svg.length, src).toBeGreaterThan(0);
      if (/<text[\s>]/.test(svg)) expect(ajuste, `${src} tiene rótulos`).toBe('contener');
    }
  });

  it('el marco de la portada es apaisado: ninguna portada es una figura vertical que quede diminuta', () => {
    for (const m of MODULOS) {
      const svg = TEXTOS_SVG[`../../public${m.identidad.portada.src}`] ?? '';
      const [, ancho, alto] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)!.map(Number);
      expect(ancho! / alto!, m.identidad.portada.src).toBeGreaterThanOrEqual(1);
    }
  });

  it('los SVG con rótulos oscuros y sin fondo propio llevan fondo de papel en su portada', () => {
    const conPapel = MODULOS.filter((m) => m.identidad.portada.fondo === 'papel').map(
      (m) => m.numero,
    );
    expect(conPapel).toEqual([3, 5, 6]);
  });
});
