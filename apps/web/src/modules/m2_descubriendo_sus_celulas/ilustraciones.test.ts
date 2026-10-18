// Prueba permanente de las ilustraciones SVG del módulo 2 ("Descubriendo sus células").
// Valida cada archivo de public/images/m2 con el validador real (src/content/svg.ts) y comprueba que
// estén todas las capas y zonas que pide el guion, en docs/guion-por-modulo/m2_descubriendo_sus_celulas.md,
// sección "Ilustraciones y modelos requeridos" (tablas "Capas de ..."). Los modelos 3D de la mandíbula y
// del ligamento periodontal no son SVG y no se comprueban aquí.
//
// Ids repetidos entre dibujos: el guion llama `uniones_comunicantes` a una capa de m2_osteoblasto_activo y
// de m2_osteocito_lagunar, y `matriz_mineralizada` a una de m2_osteocito_lagunar y de
// m2_osteoclasto_resorcion. Los ids de capa no se repiten dentro de un módulo (docs/content-schema.md,
// sección 3), así que el content.json conserva el id del guion en la primera aparición y antepone el
// prefijo del dibujo en la segunda: `osteocito_lagunar_uniones_comunicantes` y
// `osteoclasto_resorcion_matriz_mineralizada`. Los SVG usan esos mismos ids.
import { describe, expect, it } from 'vitest';
import { analizarSvg, problemasSvg } from '@/content/svg';

/** Texto crudo de los SVG de public/images/m2, indexado por ruta relativa a esta prueba. */
const CRUDOS = import.meta.glob('../../../public/images/m2/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
/** content.json del módulo (solo lectura): sirve para comprobar que los viewBox coinciden. */
const CONTENIDOS = import.meta.glob('./content.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Peso máximo fijado para estas ilustraciones: la mitad del límite del validador (200 KB). */
const PESO_MAX_BYTES = 100 * 1024;
/**
 * Los cinco dibujos son verticales o cuadrados y de 1000 unidades de ancho (el guion pide "cuadrado o
 * vertical, por ejemplo 1000 x 1000"). A 320 px de ancho, 12 px reales son 37,5 unidades.
 */
const ANCHO_VIEWBOX = 1000;
const TAMANO_MIN_ROTULO = 37.5;

interface Dibujo {
  viewBox: string;
  /** `identificar`: los rótulos revelarían la respuesta, así que el dibujo no lleva texto. */
  modo: 'video' | 'explorar' | 'identificar' | 'arrastre';
  /** Capas (grupos `<g id>`) tal como las lista la tabla del guion. */
  capas: readonly string[];
}

const DIBUJOS: Record<string, Dibujo> = {
  // Sección 2.1 (video-texto)
  m2_origen_mandibula: {
    viewBox: '0 0 1000 1000',
    modo: 'video',
    capas: [
      'tubo_neural',
      'cresta_neural',
      'corriente_migratoria',
      'primer_arco_faringeo',
      'ectomesenquima',
      'cartilago_meckel',
      'hueso_intramembranoso',
      'extremo_posterior_meckel',
      'cartilago_condilar',
      'hueso_endocondral_condilo',
    ],
  },
  // Secciones 2.2 (video-texto) y 2.4 (arrastre molecular)
  m2_arbol_linajes_oseos: {
    viewBox: '0 0 1000 1540',
    modo: 'arrastre',
    capas: [
      'celula_madre_mesenquimal',
      'celula_osteoprogenitora',
      'preosteoblasto',
      'osteoblasto',
      'osteocito',
      'celula_de_revestimiento',
      'destino_apoptosis',
      'celula_madre_hematopoyetica',
      'progenitor_mieloide',
      'precursor_monocito_macrofago',
      'preosteoclasto',
      'osteoclasto',
      'senal_runx2',
      'senal_osterix',
      'senal_mcsf',
      'senal_rankl',
      'senal_opg',
      'zona_etapa_mesenquimal',
      'zona_etapa_preosteoblasto',
      'zona_receptor_cfms',
      'zona_receptor_rank',
      'zona_ligando_osteoblasto',
    ],
  },
  // Sección 2.2 (multicapa, explorar)
  m2_osteoblasto_activo: {
    viewBox: '0 0 1000 760',
    modo: 'explorar',
    capas: [
      'nucleo_osteoblasto',
      'reticulo_endoplasmico_rugoso',
      'aparato_golgi',
      'vesiculas_secrecion',
      'osteoide',
      'fosfatasa_alcalina',
      'osteocalcina',
      'ligandos_rankl_opg',
      'uniones_comunicantes',
      'frente_mineralizacion',
      'hueso_mineralizado',
      'celula_revestimiento',
    ],
  },
  // Sección 2.3 (multicapa, explorar)
  m2_osteocito_lagunar: {
    viewBox: '0 0 1000 1230',
    modo: 'explorar',
    capas: [
      'cuerpo_osteocito',
      'nucleo_osteocito',
      'laguna_osteocitica',
      'canaliculos',
      'dendritas',
      'osteocito_lagunar_uniones_comunicantes',
      'liquido_lacunocanalicular',
      'matriz_mineralizada',
      'esclerostina',
      'celulas_superficie',
      'vaso_sanguineo',
    ],
  },
  // Sección 2.4 (multicapa, identificar)
  m2_osteoclasto_resorcion: {
    viewBox: '0 0 1000 900',
    modo: 'identificar',
    capas: [
      'nucleos_multiples',
      'zona_clara',
      'borde_festoneado',
      'bomba_protones',
      'canal_cloruro',
      'anhidrasa_carbonica_ii',
      'catepsina_k',
      'trap',
      'laguna_howship',
      'osteoclasto_resorcion_matriz_mineralizada',
      'receptores_rank_cfms',
    ],
  },
};

const ARCHIVOS = Object.keys(DIBUJOS);

/** Capas que el guion pide como zonas de acople: solo contorno punteado, sin relleno. */
const ZONAS_DE_ACOPLE =
  DIBUJOS.m2_arbol_linajes_oseos?.capas.filter((c) => c.startsWith('zona_')) ?? [];

/** Paleta H&E compartida con los demás módulos: mismo lenguaje de color para hueso y osteoide. */
const COLOR_HUESO = '#d98aa2';
const COLOR_OSTEOIDE = '#f4d3dd';

function existe(nombre: string): boolean {
  return `../../../public/images/m2/${nombre}.svg` in CRUDOS;
}

function leer(nombre: string): string {
  const svg = CRUDOS[`../../../public/images/m2/${nombre}.svg`];
  if (svg === undefined) throw new Error(`Falta public/images/m2/${nombre}.svg`);
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

describe('ilustraciones SVG del módulo 2', () => {
  it('produce los 5 SVG que lista la tabla del guion, ni uno más ni uno menos', () => {
    // El de la sección 2.5 (m2_ligamento_periodontal) se sustituyó el 2026-10-18 por el modelo 3D
    // `ligamento_periodontal` (scenes/ligamento_periodontal).
    expect(ARCHIVOS).toHaveLength(5);
    for (const nombre of ARCHIVOS) {
      expect(existe(nombre), `falta ${nombre}.svg`).toBe(true);
    }
    const enDisco = Object.keys(CRUDOS)
      .map((r) => r.replace(/^.*\//, '').replace(/\.svg$/, ''))
      .sort();
    expect(enDisco).toEqual([...ARCHIVOS].sort());
  });

  describe.each(ARCHIVOS)('%s', (nombre) => {
    const dibujo = DIBUJOS[nombre];
    if (dibujo === undefined) throw new Error(`Sin datos de ${nombre}`);
    const { capas, viewBox, modo } = dibujo;

    it('pasa el validador real con su viewBox y todas sus capas como <g id>', () => {
      // gruposRaiz exige además que cada capa sea hijo directo de <svg> y que no haya formas sueltas:
      // así el mismo archivo sirve para explorar, identificar, animar (video-texto) o arrastrar.
      expect(problemasSvg(leer(nombre), { viewBox, capas, gruposRaiz: capas })).toEqual([]);
    });

    it('usa un viewBox de enteros, de 1000 de ancho y a lo sumo 4:3 apaisado', () => {
      const vb = analizarSvg(leer(nombre)).viewBox ?? '';
      expect(vb).toMatch(/^0 0 \d+ \d+$/);
      const [, , ancho, alto] = vb.split(' ').map(Number);
      expect(ancho).toBe(ANCHO_VIEWBOX);
      // El guion pide formato cuadrado o vertical para ocupar el ancho del teléfono; los cortes de
      // una célula y del alvéolo son casi cuadrados (900) o algo apaisados (760), nunca más que 4:3.
      expect(alto).toBeGreaterThanOrEqual((ancho ?? 0) * 0.75);
    });

    it(`pesa como máximo ${PESO_MAX_BYTES / 1024} KB`, () => {
      expect(analizarSvg(leer(nombre)).bytes).toBeLessThanOrEqual(PESO_MAX_BYTES);
    });

    it('no repite ids ni deja capas sin contenido dibujado', () => {
      const svg = leer(nombre);
      const info = analizarSvg(svg);
      expect(new Set(info.ids).size).toBe(info.ids.length);
      for (const capa of capas) {
        const abre = svg.indexOf(`<g id="${capa}"`);
        expect(abre, `capa ${capa}`).toBeGreaterThan(-1);
        const cuerpo = cuerpoDeGrupo(svg, abre);
        expect(cuerpo, `capa ${capa} vacía`).toMatch(
          /<(?:path|rect|circle|ellipse|polygon|line|polyline|text)\b/,
        );
      }
    });

    it('cada capa lleva título y descripción accesibles', () => {
      const svg = leer(nombre);
      for (const capa of capas) {
        const cuerpo = cuerpoDeGrupo(svg, svg.indexOf(`<g id="${capa}"`));
        expect(cuerpo, `título de ${capa}`).toMatch(/<title>[^<]{3,}<\/title>/);
        expect(cuerpo, `descripción de ${capa}`).toMatch(/<desc>[^<]{10,}<\/desc>/);
      }
      expect(svg).toMatch(/<title>[^<]{3,}<\/title>/);
    });

    it('rotula con currentColor y con un tamaño legible a 320 px de ancho', () => {
      const textos = [...leer(nombre).matchAll(/<text\b([^>]*)>/g)].map((m) => m[1] ?? '');
      for (const atributos of textos) {
        expect(atributos).toMatch(/fill="currentColor"/);
        const tamano = /font-size="([\d.]+)"/.exec(atributos)?.[1];
        expect(Number(tamano), atributos).toBeGreaterThanOrEqual(TAMANO_MIN_ROTULO);
      }
    });

    if (modo === 'identificar') {
      it('no lleva texto dentro del dibujo (los rótulos revelarían la respuesta)', () => {
        expect(leer(nombre)).not.toMatch(/<text\b/);
      });
    }

    it('las áreas de toque propias son transparentes: no se ven ni tapan el dibujo', () => {
      const svg = leer(nombre);
      const zonas = [...svg.matchAll(/<g data-zona-toque=""([^>]*)>/g)];
      for (const zona of zonas) {
        expect(zona[1]).toMatch(/fill="transparent"/);
        expect(zona[1]).toMatch(/stroke="none"/);
      }
      // Cada forma dentro de una zona, si trae su propio contorno o relleno, debe ser transparente.
      for (const m of svg.matchAll(/<g data-zona-toque=""[^>]*>([\s\S]*?)<\/g>/g)) {
        const cuerpo = m[1] ?? '';
        for (const c of cuerpo.matchAll(/\b(fill|stroke)="([^"]*)"/g)) {
          expect(['transparent', 'none'], `${c[1]}="${c[2]}" dentro de una zona`).toContain(c[2]);
        }
      }
    });

    it('no usa referencias (url, href) ni ids de dibujo que puedan chocar con otros SVG', () => {
      const info = analizarSvg(leer(nombre));
      expect(info.idsReferenciados).toEqual([]);
    });
  });

  it('el hueso mineralizado y el osteoide usan el mismo color en todos los dibujos que los muestran', () => {
    for (const nombre of [
      'm2_osteoblasto_activo',
      'm2_osteocito_lagunar',
      'm2_osteoclasto_resorcion',
    ]) {
      expect(leer(nombre), nombre).toContain(`fill="${COLOR_HUESO}"`);
    }
    for (const nombre of ['m2_osteoblasto_activo', 'm2_origen_mandibula']) {
      const svg = leer(nombre);
      expect(svg, nombre).toContain(`fill="${COLOR_HUESO}"`);
    }
    expect(leer('m2_osteoblasto_activo')).toContain(`fill="${COLOR_OSTEOIDE}"`);
  });

  describe('m2_arbol_linajes_oseos: reglas de las notas de precisión anatómica', () => {
    const svg = () => leer('m2_arbol_linajes_oseos');

    it('las zonas de acople son contornos punteados sin relleno que no tapan a las células', () => {
      for (const zona of ZONAS_DE_ACOPLE) {
        const cuerpo = cuerpoDeGrupo(svg(), svg().indexOf(`<g id="${zona}"`));
        expect(cuerpo, zona).toContain('stroke-dasharray');
        // El único relleno visible posible sería el del anillo: debe ser "none".
        const anillo = /<circle\b[^>]*stroke-dasharray[^>]*>/.exec(cuerpo)?.[0] ?? '';
        expect(anillo, zona).toContain('fill="none"');
      }
    });

    it('cada zona de acople tiene un área de toque de al menos el 12 % del ancho (120 unidades)', () => {
      for (const zona of ZONAS_DE_ACOPLE) {
        const cuerpo = cuerpoDeGrupo(svg(), svg().indexOf(`<g id="${zona}"`));
        const toque = /<g data-zona-toque[^>]*>\s*<circle\b[^>]*\br="([\d.]+)"/.exec(cuerpo);
        expect(Number(toque?.[1]) * 2, zona).toBeGreaterThanOrEqual(120);
      }
    });

    it('las señales de la actividad de arrastre están en su lugar: RUNX2 antes que osterix', () => {
      const s = svg();
      expect(s.indexOf('id="senal_runx2"')).toBeLessThan(s.indexOf('id="senal_osterix"'));
    });
  });

  describe('m2_origen_mandibula: la capa ectomesenquima existe en los dos paneles', () => {
    it('hay ectomesénquima dentro del arco (panel A) y alrededor de la barra (panel B)', () => {
      const svg = leer('m2_origen_mandibula');
      const cuerpo = cuerpoDeGrupo(svg, svg.indexOf('<g id="ectomesenquima"'));
      // Panel A: relleno con células dentro del arco (grupo girado con el arco); panel B: envoltura
      // ancha y translúcida alrededor de la barra, con células dispersas.
      expect(cuerpo).toContain('rotate(12 325 340)');
      expect(cuerpo).toContain('stroke-width="150"');
      expect(cuerpo.match(/<circle\b/g)?.length ?? 0).toBeGreaterThan(40);
    });
  });

  describe('coherencia con el content.json del módulo (solo lectura)', () => {
    it('el viewBox declarado para cada SVG coincide con el del archivo', () => {
      const crudo = Object.values(CONTENIDOS)[0];
      if (crudo === undefined) return;
      let raiz: unknown;
      try {
        raiz = JSON.parse(crudo);
      } catch {
        return; // el contenido se está editando: lo audita su propia prueba
      }
      const pares: { svg: string; viewBox: string }[] = [];
      const recorrer = (v: unknown): void => {
        if (Array.isArray(v)) {
          v.forEach(recorrer);
        } else if (v !== null && typeof v === 'object') {
          const o = v as Record<string, unknown>;
          if (typeof o.svg === 'string' && typeof o.viewBox === 'string') {
            pares.push({ svg: o.svg, viewBox: o.viewBox });
          }
          Object.values(o).forEach(recorrer);
        }
      };
      recorrer(raiz);
      for (const { svg, viewBox } of pares) {
        const nombre = /\/images\/m2\/([^/]+)\.svg$/.exec(svg)?.[1];
        if (nombre === undefined || !(nombre in DIBUJOS)) continue;
        expect(viewBox, `viewBox de ${nombre} en content.json`).toBe(DIBUJOS[nombre]?.viewBox);
      }
    });
  });
});
