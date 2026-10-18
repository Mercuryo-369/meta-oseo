// Prueba permanente de las ilustraciones SVG del módulo 4 ("Transformando la matriz").
// Valida cada archivo de public/images/m4 con el validador real (src/content/svg.ts) y comprueba
// que estén todas las capas que pide el guion, en docs/guion-por-modulo/m4_transformando_la_matriz.md,
// sección "Ilustraciones y modelos requeridos" (tabla "Capas o zonas"). El modelo 3D de la mandíbula
// no es un SVG y no se comprueba aquí.
import { describe, expect, it } from 'vitest';
import { analizarSvg, problemasSvg } from '@/content/svg';

/** Texto crudo de los SVG de public/images/m4, indexado por ruta relativa a esta prueba. */
const CRUDOS = import.meta.glob('../../../public/images/m4/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
/** Todos los dibujos del OVA usan el viewBox por defecto de la guía (sección 8). */
const VIEWBOX = '0 0 800 600';
/** Peso máximo fijado para estas ilustraciones: 60 KB (el validador admite 200 KB; el mayor pesa unos 29 KB). */
const PESO_MAX_BYTES = 60 * 1024;
/** 28 unidades del viewBox equivalen a 11 px reales en un teléfono de 320 px de ancho (escala 0,4). */
const TAMANO_MIN_ROTULO = 28;
/** Tinta oscura fija: el único color de texto fijo que se admite, siempre sobre un relleno claro fijo. */
const TINTA_TEXTO = '#1e1a33';

/**
 * Capas (grupos `<g id>`) por archivo, tal como las lista la tabla del guion.
 * Una excepción de nombre, tomada de content.json del módulo: la capa `zona_hueco` de
 * `m4_fibrilla_mineralizada` se llama `fibrilla_mineralizada_zona_hueco`, porque el id `zona_hueco`
 * ya lo usa la actividad de `m4_fibrilla_colageno` y las capas son únicas en el módulo (guía, sección 12).
 */
const CAPAS_POR_ARCHIVO: Record<string, readonly string[]> = {
  // Sección 4.1 (multicapa, explorar)
  m4_composicion_matriz: ['fraccion_mineral', 'colageno_i', 'proteinas_no_colagenas', 'agua'],
  // Sección 4.2 (multicapa, identificar)
  m4_fibrilla_colageno: [
    'molecula_tropocolageno',
    'zona_hueco',
    'zona_solapamiento',
    'periodo_d',
    'entrecruzamientos',
  ],
  // Sección 4.3 (video-texto y arrastre molecular: fondo de la escena)
  m4_vesicula_matriz: [
    'osteoblasto',
    'fibrilla_colageno',
    'membrana_vesicula',
    'canal_anexina',
    'transportador_fosfato',
    'lumen_vesicula',
    'tnap_membrana',
    'enpp1_ankh',
    'cristal_hidroxiapatita',
    'iones_calcio',
    'iones_fosfato',
    'pirofosfato',
  ],
  // Sección 4.4 (multicapa, explorar)
  m4_fibrilla_mineralizada: [
    'fibrilla_colageno',
    'fibrilla_mineralizada_zona_hueco',
    'nodulo_mineral',
    'cristales_intrafibrilares',
    'cristales_extrafibrilares',
    'eje_c_cristales',
  ],
  // Sección 4.6 (multicapa, identificar)
  m4_frente_mineralizacion: [
    'osteoblastos',
    'osteoide',
    'vesiculas_matriz',
    'frente_mineralizacion',
    'hueso_mineralizado',
    'osteocito',
    'canaliculos',
    'marcas_tetraciclina',
  ],
  // Sección 4.7 (multicapa, identificar)
  m4_homeostasis_calcio_fosfato: [
    'piel',
    'higado',
    'rinon',
    'intestino_delgado',
    'glandula_paratiroides',
    'tiroides_celulas_c',
    'hueso_osteocitos',
  ],
  // Sección 4.8 (figura de apoyo, sin actividad); los paneles contienen sus tres capas
  m4_osteoide_normal_vs_osteomalacia: [
    'panel_hueso_normal',
    'costura_osteoide_normal',
    'hueso_mineralizado_normal',
    'marcas_tetraciclina_normales',
    'panel_osteomalacia',
    'costura_osteoide_ensanchada',
    'hueso_mineralizado_reducido',
    'marcas_tetraciclina_difusas',
  ],
};

const ARCHIVOS = Object.keys(CAPAS_POR_ARCHIVO);

/** Dibujos de modo "identificar": no pueden nombrar dentro del dibujo las estructuras que se piden. */
const NOMBRES_PROHIBIDOS: Record<string, RegExp> = {
  m4_fibrilla_colageno: /hueco|solap|periodo|tropocol|entrecruz|mol[eé]cula/i,
  m4_frente_mineralizacion:
    /osteoblast|osteoide|ves[ií]cula|frente|hueso|osteocit|canal[ií]cul|tetraciclina/i,
  m4_homeostasis_calcio_fosfato:
    /piel|h[ií]gado|ri[nñ][oó]n|intestino|paratiroid|tiroides|hueso|osteocit/i,
};

/** Archivos cuyas capas deben traer su propia zona táctil `<g data-zona-toque>` (guía, sección 8). */
const CON_ZONA_EXPLICITA = [
  'm4_composicion_matriz',
  'm4_fibrilla_colageno',
  'm4_frente_mineralizacion',
  'm4_homeostasis_calcio_fosfato',
];

/** Paleta H&E compartida con los demás módulos: mismo lenguaje de color para hueso, osteoide y núcleos. */
const COLOR_HUESO = '#d98aa2';
const COLOR_OSTEOIDE = '#f4d3dd';
const COLOR_NUCLEO = '#3b2f86';
const COLOR_OSTEOBLASTO = '#8b7bdc';
const COLOR_OSTEOCITO = '#6f93e2';

/**
 * Sitios de suelta de la actividad de arrastre `m4_arrastre_mineralizacion` (sección 4.3), en unidades
 * del viewBox. Son los centros que declara el comentario del propio SVG; el contenido debe usarlos (en
 * porcentaje: x/8 e y/6) para que cada botón caiga sobre su estructura.
 */
const SITIOS_ARRASTRE: Record<string, readonly [number, number]> = {
  canal_anexina: [236, 345],
  transportador_fosfato: [564, 345],
  lumen_vesicula: [400, 300],
  membrana_vesicula: [500, 202],
  cristal_hidroxiapatita: [400, 438],
};

function existe(nombre: string): boolean {
  return `../../../public/images/m4/${nombre}.svg` in CRUDOS;
}

function leer(nombre: string): string {
  const svg = CRUDOS[`../../../public/images/m4/${nombre}.svg`];
  if (svg === undefined) throw new Error(`Falta public/images/m4/${nombre}.svg`);
  return svg;
}

/** Contenido de un `<g>` (con sus grupos anidados) a partir de la posición de su etiqueta de apertura. */
function cuerpoDeGrupo(svg: string, abre: number): string {
  let profundidad = 0;
  for (const m of svg.slice(abre).matchAll(/<(\/?)g\b[^>]*?(\/?)>/g)) {
    if (m[2] === '/') continue;
    profundidad += m[1] === '/' ? -1 : 1;
    if (profundidad === 0) return svg.slice(abre, abre + (m.index ?? 0));
  }
  return svg.slice(abre);
}

function cuerpoDeCapa(svg: string, capa: string): string {
  const abre = svg.indexOf(`<g id="${capa}"`);
  expect(abre, `capa ${capa}`).toBeGreaterThan(-1);
  return cuerpoDeGrupo(svg, abre);
}

/** Cajas (x, y, ancho, alto) de los `<rect>` de la zona táctil de una capa. */
function cajasDeZona(svg: string, capa: string): { x: number; y: number; w: number; h: number }[] {
  const cuerpo = cuerpoDeCapa(svg, capa);
  const abre = cuerpo.indexOf('<g data-zona-toque');
  if (abre < 0) return [];
  const zona = cuerpoDeGrupo(cuerpo, abre);
  return [...zona.matchAll(/<rect\b([^>]*)>/g)].map((m) => {
    const num = (k: string) => Number(new RegExp(`\\b${k}="(-?[\\d.]+)"`).exec(m[1] ?? '')?.[1]);
    return { x: num('x'), y: num('y'), w: num('width'), h: num('height') };
  });
}

describe('ilustraciones SVG del módulo 4', () => {
  it('produce los 7 SVG que lista la tabla del guion, ni uno más ni uno menos', () => {
    expect(ARCHIVOS).toHaveLength(7);
    for (const nombre of ARCHIVOS) {
      expect(existe(nombre), `falta ${nombre}.svg`).toBe(true);
    }
    // `X_zonas.svg` es la versión de capas de `X.svg` que va sobre su ilustración realista (tools/imagenes): no es
    // un dibujo más del guion.
    const presentes = Object.keys(CRUDOS)
      .map((ruta) => /([^/]+)\.svg$/.exec(ruta)?.[1] ?? '')
      .filter((n) => !n.endsWith('_zonas'))
      .sort();
    expect(presentes).toEqual([...ARCHIVOS].sort());
  });

  describe.each(ARCHIVOS)('%s', (nombre) => {
    const capas = CAPAS_POR_ARCHIVO[nombre] ?? [];

    it('pasa el validador real con su viewBox y todas sus capas como <g id>', () => {
      expect(problemasSvg(leer(nombre), { viewBox: VIEWBOX, capas })).toEqual([]);
    });

    it('usa un viewBox de enteros, con título y descripción accesibles', () => {
      const svg = leer(nombre);
      expect(analizarSvg(svg).viewBox).toMatch(/^\d+ \d+ \d+ \d+$/);
      expect(svg).toMatch(/<title>[^<]{10,}<\/title>/);
      expect(svg).toMatch(/<desc>[^<]{80,}<\/desc>/);
    });

    it(`pesa como máximo ${PESO_MAX_BYTES / 1024} KB`, () => {
      expect(analizarSvg(leer(nombre)).bytes).toBeLessThanOrEqual(PESO_MAX_BYTES);
    });

    it('no repite ids ni deja capas sin contenido dibujado', () => {
      const svg = leer(nombre);
      const info = analizarSvg(svg);
      expect(new Set(info.ids).size).toBe(info.ids.length);
      for (const capa of capas) {
        expect(cuerpoDeCapa(svg, capa), `capa ${capa} vacía`).toMatch(
          /<(?:path|rect|circle|ellipse|polygon|line|polyline|text)\b/,
        );
      }
    });

    it('rotula con currentColor (o tinta oscura sobre relleno claro) y con un tamaño legible a 320 px', () => {
      const textos = [...leer(nombre).matchAll(/<text\b([^>]*)>/g)].map((m) => m[1] ?? '');
      for (const atributos of textos) {
        const fill = /fill="([^"]+)"/.exec(atributos)?.[1];
        expect([`currentColor`, TINTA_TEXTO], `fill del rótulo: ${fill}`).toContain(fill);
        const tamano = Number(/font-size="([\d.]+)"/.exec(atributos)?.[1] ?? 0);
        expect(tamano).toBeGreaterThanOrEqual(TAMANO_MIN_ROTULO);
      }
    });

    it('no fija colores de texto que se pierdan en un tema (ni negro ni blanco puros)', () => {
      expect(leer(nombre)).not.toMatch(
        /<text\b[^>]*fill="(?:#000(?:000)?|#fff(?:fff)?|black|white)"/i,
      );
    });
  });

  describe('modo identificar: el dibujo no nombra lo que se pide ubicar', () => {
    it.each(Object.keys(NOMBRES_PROHIBIDOS))('%s', (nombre) => {
      const textos = [...leer(nombre).matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(
        (m) => m[1] ?? '',
      );
      const prohibido = NOMBRES_PROHIBIDOS[nombre] as RegExp;
      for (const t of textos) expect(t, `rótulo "${t}"`).not.toMatch(prohibido);
    });
  });

  describe('zonas táctiles', () => {
    it.each(CON_ZONA_EXPLICITA)('%s: cada capa trae su <g data-zona-toque>', (nombre) => {
      const svg = leer(nombre);
      for (const capa of CAPAS_POR_ARCHIVO[nombre] ?? []) {
        expect(cuerpoDeCapa(svg, capa), `capa ${capa}`).toContain('data-zona-toque');
      }
    });

    it('periodo_d es una regla aparte: su zona no toca las de zona_hueco ni zona_solapamiento', () => {
      const svg = leer('m4_fibrilla_colageno');
      const regla = cajasDeZona(svg, 'periodo_d');
      expect(regla.length).toBeGreaterThan(0);
      const otras = [...cajasDeZona(svg, 'zona_hueco'), ...cajasDeZona(svg, 'zona_solapamiento')];
      expect(otras.length).toBeGreaterThan(0);
      for (const a of regla) {
        for (const b of otras) {
          const cruzan = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          expect(cruzan, 'la zona de periodo_d se solapa con otra').toBe(false);
        }
      }
    });

    it('en el corte del frente, osteocito, canalículos, vesículas y marcas se dibujan después del hueso y del osteoide', () => {
      const svg = leer('m4_frente_mineralizacion');
      const pos = (id: string) => svg.indexOf(`<g id="${id}"`);
      for (const encima of [
        'osteocito',
        'canaliculos',
        'vesiculas_matriz',
        'marcas_tetraciclina',
      ]) {
        expect(pos(encima), encima).toBeGreaterThan(pos('hueso_mineralizado'));
        expect(pos(encima), encima).toBeGreaterThan(pos('osteoide'));
      }
      // la zona de hueso_mineralizado excluye la del osteocito (trazado con relleno par-impar)
      expect(cuerpoDeCapa(svg, 'hueso_mineralizado')).toContain('fill-rule="evenodd"');
    });
  });

  describe('m4_vesicula_matriz (video-texto y arrastre molecular)', () => {
    const capas = CAPAS_POR_ARCHIVO['m4_vesicula_matriz'] ?? [];

    it('todo el dibujo va en grupos de primer nivel, uno por capa que usan los pasos', () => {
      const problemas = problemasSvg(leer('m4_vesicula_matriz'), {
        viewBox: VIEWBOX,
        capas,
        gruposRaiz: capas,
      });
      expect(problemas).toEqual([]);
    });

    it('los sitios del arrastre quedan a 52 px o más entre sí y a 22 px o más del borde (escena de 320 px)', () => {
      const escala = 320 / 800;
      const ids = Object.keys(SITIOS_ARRASTRE);
      for (const id of ids) {
        const [x, y] = SITIOS_ARRASTRE[id] as readonly [number, number];
        expect(x * escala, `${id} x`).toBeGreaterThanOrEqual(22);
        expect((800 - x) * escala, `${id} borde derecho`).toBeGreaterThanOrEqual(22);
        expect(y * escala, `${id} y`).toBeGreaterThanOrEqual(22);
        expect((600 - y) * escala, `${id} borde inferior`).toBeGreaterThanOrEqual(22);
      }
      for (const [i, a] of ids.entries()) {
        for (const b of ids.slice(i + 1)) {
          const [ax, ay] = SITIOS_ARRASTRE[a] as readonly [number, number];
          const [bx, by] = SITIOS_ARRASTRE[b] as readonly [number, number];
          const px = Math.hypot(ax - bx, ay - by) * escala;
          expect(px, `${a} y ${b}`).toBeGreaterThanOrEqual(52);
        }
      }
    });

    it('el comentario del archivo declara esos mismos sitios', () => {
      const svg = leer('m4_vesicula_matriz');
      for (const [id, [x, y]] of Object.entries(SITIOS_ARRASTRE)) {
        expect(svg.includes(`${id} ${x},${y}`), `comentario de ${id}`).toBe(true);
      }
    });
  });

  it('mantiene el mismo lenguaje de color para hueso, osteoide y células que el resto de módulos', () => {
    const frente = leer('m4_frente_mineralizacion');
    expect(frente).toContain(COLOR_HUESO);
    expect(frente).toContain(COLOR_OSTEOIDE);
    expect(frente).toContain(COLOR_OSTEOBLASTO);
    expect(frente).toContain(COLOR_OSTEOCITO);
    expect(frente).toContain(COLOR_NUCLEO);
    const osteomalacia = leer('m4_osteoide_normal_vs_osteomalacia');
    expect(osteomalacia).toContain(COLOR_HUESO);
    expect(osteomalacia).toContain(COLOR_OSTEOIDE);
    expect(leer('m4_homeostasis_calcio_fosfato')).toContain(COLOR_HUESO);
    expect(leer('m4_vesicula_matriz')).toContain(COLOR_OSTEOBLASTO);
    expect(leer('m4_vesicula_matriz')).toContain(COLOR_NUCLEO);
  });
});
