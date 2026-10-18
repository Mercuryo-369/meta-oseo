// Prueba permanente de las ilustraciones SVG del módulo 1 ("Conociendo el hueso").
// Valida cada archivo de public/images/m1 con el validador real (src/content/svg.ts) y comprueba que
// estén todas las capas que pide el guion, en docs/guion-por-modulo/m1_conociendo_el_hueso.md, sección
// "Ilustraciones y modelos requeridos" (tabla "Capas o zonas"). El modelo 3D de la mandíbula no es un
// SVG y no se comprueba aquí. Las capas se listan de forma explícita (citando esa tabla) y, además, se
// cruzan con la propia tabla del guion y con las actividades de content.json.
import { describe, expect, it } from 'vitest';
import { analizarSvg, auditarRecursos, problemasSvg } from '@/content/svg';
import type { ConSecciones } from '@/content/consultas';
import contenido from './content.json';

/** Texto crudo de los SVG de public/images/m1, indexado por ruta relativa a esta prueba. */
const CRUDOS = import.meta.glob('../../../public/images/m1/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
/** Guion del módulo (borrador del docente) para cruzar la tabla de capas. */
const GUION = import.meta.glob('../../../../../docs/guion-por-modulo/m1_conociendo_el_hueso.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const VIEWBOX = '0 0 800 600';
/** Peso máximo fijado para estas ilustraciones: la mitad del límite del validador (200 KB). */
const PESO_MAX_BYTES = 100 * 1024;
/** 30 unidades del viewBox equivalen a 12 px reales en un teléfono de 320 px de ancho. */
const TAMANO_MIN_ROTULO = 30;

/** Capas (grupos `<g id>`) por archivo, tal como las lista la tabla del guion (sección "Ilustraciones y modelos requeridos"). */
const CAPAS_POR_ARCHIVO: Record<string, readonly string[]> = {
  // Sección 1.1 (multicapa, explorar) y figura de la sección 1.1
  m1_hueso_largo_macro: [
    'cartilago_articular',
    'epifisis',
    'linea_epifisaria',
    'metafisis',
    'diafisis',
    'cavidad_medular',
    'arteria_nutricia',
  ],
  // Sección 1.2 (arrastre molecular): fondo de la escena. Los efectos no llevan capas propias.
  m1_hormonas_oseas_escena: [
    'hueso_emisor',
    'vaso_sanguineo',
    'organo_rinon',
    'organo_pancreas',
    'organo_hipotalamo',
    'receptor_fgfr_klotho',
    'receptor_celula_beta',
    'receptor_mc4r',
  ],
  // Sección 1.3 (video-texto con animación): todos los grupos son hijos directos de la raíz
  m1_matriz_composicion: [
    'fragmento_hueso',
    'fibrilla_colageno',
    'zonas_hueco',
    'cristales_hidroxiapatita',
    'proteinas_no_colagenas',
    'fuerza_traccion',
    'fuerza_compresion',
  ],
  // Sección 1.3 (multicapa, explorar)
  m1_entretejido_laminar: [
    'fibras_entretejidas',
    'osteocitos_entretejido',
    'laminillas_paralelas',
    'osteocitos_laminares',
  ],
  // Sección 1.4 (multicapa, identificar)
  m1_corte_hueso_capas: [
    'periostio',
    'hueso_cortical',
    'endostio',
    'hueso_trabecular',
    'medula_osea',
  ],
  // Sección 1.4 (multicapa, identificar)
  m1_osteona_detalle: [
    'conducto_de_havers',
    'laminillas_concentricas',
    'osteocito_en_laguna',
    'canaliculos',
    'linea_cementante',
    'conducto_de_volkmann',
    'laminillas_intersticiales',
  ],
  // Sección 1.5 (multicapa, identificar) y figura de la sección 1.5
  m1_proceso_alveolar_corte: [
    'hueso_alveolar_propio',
    'tablas_corticales',
    'hueso_trabecular_alveolar',
    'ligamento_periodontal',
    'raiz_dentaria',
    'conducto_mandibular',
  ],
  // Sección 1.5 (multicapa, explorar) y figura de la sección 1.5
  m1_wolff_femur: ['trayectorias_compresion', 'trayectorias_traccion', 'corteza_femoral'],
};

/**
 * Variantes con rótulos de los dibujos que se usan en modo "identificar": la actividad no puede llevar
 * el nombre de las estructuras escrito en el dibujo, pero la figura de la lectura sí. Mismas capas.
 */
const VARIANTES_ROTULADAS: Record<string, string> = {
  m1_corte_hueso_capas_rotulado: 'm1_corte_hueso_capas',
  m1_proceso_alveolar_corte_rotulado: 'm1_proceso_alveolar_corte',
};

const ARCHIVOS = Object.keys(CAPAS_POR_ARCHIVO);
const ANIMACION = ['m1_matriz_composicion'];
/** Modo "identificar": el dibujo no puede nombrar las estructuras (delataría la respuesta). */
const IDENTIFICAR = ['m1_corte_hueso_capas', 'm1_osteona_detalle', 'm1_proceso_alveolar_corte'];
/** Estructuras finas: la guía pide un área táctil transparente más ancha sobre ellas (`data-zona-toque`). */
const CAPAS_FINAS: Record<string, readonly string[]> = {
  m1_hueso_largo_macro: ['cartilago_articular', 'linea_epifisaria', 'arteria_nutricia'],
  m1_corte_hueso_capas: ['periostio', 'endostio'],
  m1_osteona_detalle: ['canaliculos', 'linea_cementante', 'conducto_de_volkmann'],
  m1_proceso_alveolar_corte: ['hueso_alveolar_propio', 'ligamento_periodontal'],
};

/** Paleta H&E compartida con los demás módulos: mismo lenguaje de color para el hueso mineralizado. */
const COLOR_HUESO = '#d98aa2';
const CON_HUESO = [
  'm1_hueso_largo_macro',
  'm1_hormonas_oseas_escena',
  'm1_entretejido_laminar',
  'm1_corte_hueso_capas',
  'm1_osteona_detalle',
  'm1_proceso_alveolar_corte',
  'm1_wolff_femur',
  'm1_matriz_composicion',
];

const ruta = (nombre: string): string => `../../../public/images/m1/${nombre}.svg`;
const existe = (nombre: string): boolean => ruta(nombre) in CRUDOS;
function leer(nombre: string): string {
  const svg = CRUDOS[ruta(nombre)];
  if (svg === undefined) throw new Error(`Falta public/images/m1/${nombre}.svg`);
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
function grupo(svg: string, id: string): string {
  const abre = svg.indexOf(`<g id="${id}"`);
  expect(abre, `capa ${id}`).toBeGreaterThan(-1);
  return cuerpoDeGrupo(svg, abre);
}
const textosDe = (svg: string): string[] =>
  [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1] ?? '');

describe('ilustraciones SVG del módulo 1', () => {
  it('produce los 8 SVG que lista la tabla del guion, más solo las 2 variantes rotuladas', () => {
    expect(ARCHIVOS).toHaveLength(8);
    for (const nombre of ARCHIVOS) expect(existe(nombre), `falta ${nombre}.svg`).toBe(true);
    for (const nombre of Object.keys(VARIANTES_ROTULADAS)) {
      expect(existe(nombre), `falta ${nombre}.svg`).toBe(true);
    }
    // `X_zonas.svg` es la versión de capas de `X.svg` que va sobre su ilustración realista (tools/imagenes): no es
    // un dibujo más del guion.
    const presentes = Object.keys(CRUDOS)
      .map((r) => r.replace(/^.*\//, '').replace(/\.svg$/, ''))
      .filter((n) => !n.endsWith('_zonas'))
      .sort();
    expect(presentes).toEqual([...ARCHIVOS, ...Object.keys(VARIANTES_ROTULADAS)].sort());
  });

  describe.each(ARCHIVOS)('%s', (nombre) => {
    const capas = CAPAS_POR_ARCHIVO[nombre] ?? [];

    it('pasa el validador real con su viewBox y todas sus capas como <g id>', () => {
      // En la animación, cada capa además debe ser hijo directo de <svg> y no haber formas sueltas.
      const opciones = ANIMACION.includes(nombre)
        ? { viewBox: VIEWBOX, capas, gruposRaiz: capas }
        : { viewBox: VIEWBOX, capas };
      expect(problemasSvg(leer(nombre), opciones)).toEqual([]);
    });

    it('usa un viewBox de enteros y lleva título y descripción accesibles', () => {
      const svg = leer(nombre);
      expect(analizarSvg(svg).viewBox).toMatch(/^\d+ \d+ \d+ \d+$/);
      expect(svg).toMatch(/<title>[^<]{10,}<\/title>/);
      expect(svg).toMatch(/<desc>[^<]{40,}<\/desc>/);
    });

    it(`pesa como máximo ${PESO_MAX_BYTES / 1024} KB`, () => {
      expect(analizarSvg(leer(nombre)).bytes).toBeLessThanOrEqual(PESO_MAX_BYTES);
    });

    it('no repite ids ni deja capas sin contenido dibujado', () => {
      const svg = leer(nombre);
      const info = analizarSvg(svg);
      expect(new Set(info.ids).size).toBe(info.ids.length);
      for (const capa of capas) {
        expect(grupo(svg, capa), `capa ${capa} vacía`).toMatch(
          /<(?:path|rect|circle|ellipse|polygon|line|polyline)\b/,
        );
      }
    });

    it('no usa imágenes, scripts, estilos ni referencias externas (respaldo del validador)', () => {
      const svg = leer(nombre);
      const sinNamespace = svg.replace(/xmlns="[^"]*"/, '');
      expect(/<(?:script|image|style|foreignObject|animate|set)\b/i.test(sinNamespace)).toBe(false);
      expect(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(sinNamespace)).toBe(false);
    });

    it('rotula con tamaño legible a 320 px y tinta propia con halo (se ve en tema claro y oscuro)', () => {
      // Se ven también dentro de <img> (figuras de la lectura), donde currentColor sería siempre negro:
      // por eso los rótulos llevan tinta índigo fija y un halo claro, no currentColor.
      for (const atributos of textosDe(leer(nombre))) {
        expect(Number(/font-size="([\d.]+)"/.exec(atributos)?.[1] ?? 0)).toBeGreaterThanOrEqual(
          TAMANO_MIN_ROTULO,
        );
        expect(atributos).toMatch(/paint-order="stroke"/);
        expect(atributos).not.toMatch(/fill="(?:#000(?:000)?|#fff(?:fff)?|black|white)"/i);
      }
    });

    it('usa el mismo rosa del hueso mineralizado que los demás módulos', () => {
      if (CON_HUESO.includes(nombre)) expect(leer(nombre)).toContain(COLOR_HUESO);
    });

    if (CAPAS_FINAS[nombre]) {
      it('dibuja un área táctil ampliada (data-zona-toque) sobre sus estructuras finas', () => {
        const svg = leer(nombre);
        for (const capa of CAPAS_FINAS[nombre] ?? []) {
          expect(grupo(svg, capa), `zona táctil de ${capa}`).toContain('data-zona-toque');
        }
      });
    }

    if (IDENTIFICAR.includes(nombre)) {
      it('modo identificar: no escribe en el dibujo el nombre de ninguna estructura', () => {
        expect(/<text\b/.test(leer(nombre))).toBe(false);
      });
    }
  });

  describe.each(Object.entries(VARIANTES_ROTULADAS))('%s', (nombre, original) => {
    it('conserva las capas del original, pasa el validador y sí lleva rótulos', () => {
      const svg = leer(nombre);
      expect(problemasSvg(svg, { viewBox: VIEWBOX, capas: CAPAS_POR_ARCHIVO[original] })).toEqual(
        [],
      );
      expect(analizarSvg(svg).bytes).toBeLessThanOrEqual(PESO_MAX_BYTES);
      expect(textosDe(svg).length).toBeGreaterThan(3);
      for (const atributos of textosDe(svg)) {
        expect(Number(/font-size="([\d.]+)"/.exec(atributos)?.[1] ?? 0)).toBeGreaterThanOrEqual(
          TAMANO_MIN_ROTULO,
        );
      }
    });
  });

  describe('coherencia con el guion y con content.json', () => {
    it('las capas de cada archivo coinciden con la tabla "Ilustraciones y modelos requeridos" del guion', () => {
      const md = Object.values(GUION)[0];
      expect(md, 'no se pudo leer el guion').toBeDefined();
      const tabla =
        (md ?? '').split('## Ilustraciones y modelos requeridos')[1]?.split('\n### ')[0] ?? '';
      const filas = tabla.split('\n').filter((l) => l.startsWith('| `m1_'));
      expect(filas.map((f) => /`([a-z0-9_]+)`/.exec(f)?.[1]).sort()).toEqual([...ARCHIVOS].sort());
      for (const fila of filas) {
        const celdas = fila.split('|').map((c) => c.trim());
        const archivo = /`([a-z0-9_]+)`/.exec(celdas[1] ?? '')?.[1] ?? '';
        const capas = [...(celdas[3] ?? '').matchAll(/`([a-z0-9_]+)` =/g)].map((m) => m[1]);
        expect([...capas].sort(), archivo).toEqual([...(CAPAS_POR_ARCHIVO[archivo] ?? [])].sort());
      }
    });

    it('cada SVG que content.json referencia existe, con el viewBox y las capas que declara su actividad', () => {
      const problemas = auditarRecursos(contenido as unknown as ConSecciones, {
        leerSvg: (r) => CRUDOS[`../../../public${r}`],
        existe: (r) => `../../../public${r}` in CRUDOS,
      }).filter((p) => p.ruta.startsWith('/images/m1/') && p.ruta.endsWith('.svg'));
      expect(problemas).toEqual([]);
    });

    it('todos los SVG del módulo los usa content.json', () => {
      const usados = JSON.stringify(contenido);
      for (const nombre of ARCHIVOS) expect(usados, nombre).toContain(`/images/m1/${nombre}.svg`);
    });
  });

  it('la escena de hormonas coloca los receptores donde content.json fija las zonas de destino (82 %; 18, 50 y 82 %)', () => {
    const svg = leer('m1_hormonas_oseas_escena');
    const esperado: Record<string, [number, number]> = {
      receptor_fgfr_klotho: [656, 108],
      receptor_celula_beta: [656, 300],
      receptor_mc4r: [656, 492],
    };
    for (const [id, [x, y]] of Object.entries(esperado)) {
      expect(grupo(svg, id), id).toContain(`cx="${x}" cy="${y}"`);
    }
  });

  it('la animación de la matriz expone como grupos de primer nivel las capas de los 6 pasos', () => {
    const usadas = [
      'fragmento_hueso',
      'fibrilla_colageno',
      'zonas_hueco',
      'cristales_hidroxiapatita',
      'proteinas_no_colagenas',
      'fuerza_traccion',
      'fuerza_compresion',
    ];
    const raiz = analizarSvg(leer('m1_matriz_composicion')).hijosRaiz.flatMap((h) =>
      h.etiqueta === 'g' && h.id ? [h.id] : [],
    );
    for (const capa of usadas) expect(raiz).toContain(capa);
  });
});
