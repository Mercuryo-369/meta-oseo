// Prueba permanente de las ilustraciones SVG del módulo 3 ("Construyendo hueso").
// Valida cada archivo de public/images/m3 con el validador real (src/content/svg.ts) y comprueba
// que estén todas las capas que pide el guion, en docs/guion-por-modulo/m3_construyendo_hueso.md,
// sección "Ilustraciones y modelos requeridos" (tabla "Capas o zonas"). Los modelos 3D (la mandíbula y, desde
// 2026-10-18, la trabécula en formación de 3.3 y la red lacuno-canalicular de 3.4, construidos por código) no son SVG
// y no se comprueban aquí: tienen sus pruebas en src/scenes.
import { describe, expect, it } from 'vitest';
import { analizarSvg, problemasSvg } from '@/content/svg';

/** Texto crudo de los SVG de public/images/m3, indexado por ruta relativa a esta prueba. */
const CRUDOS = import.meta.glob('../../../public/images/m3/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
/** Todos los dibujos del OVA usan el viewBox por defecto de la guía (sección 8). */
const VIEWBOX = '0 0 800 600';
/** Peso máximo fijado para estas ilustraciones: la mitad del límite del validador (200 KB). */
const PESO_MAX_BYTES = 100 * 1024;
/** 30 unidades del viewBox equivalen a 12 px reales en un teléfono de 320 px de ancho. */
const TAMANO_MIN_ROTULO = 28;

/** Capas (grupos `<g id>`) por archivo, tal como las lista la tabla del guion. */
const CAPAS_POR_ARCHIVO: Record<string, readonly string[]> = {
  // Sección 3.1 (multicapa, explorar)
  m3_rutas_formacion_osea: [
    'im_condensacion_mesenquimatosa',
    'im_osteoblastos',
    'im_osteoide',
    'im_trabeculas_hueso_inmaduro',
    'im_periostio',
    'ec_modelo_cartilaginoso',
    'ec_condrocitos_hipertroficos',
    'ec_collar_oseo',
    'ec_invasion_vascular',
    'ec_centro_osificacion_primario',
    'ec_placa_crecimiento',
  ],
  // Sección 3.2 (multicapa, identificar)
  m3_mandibula_desarrollo: [
    'cartilago_de_meckel',
    'hueso_intramembranoso_lateral',
    'sitio_primer_osificacion',
    'nervio_alveolar_inferior',
    'germen_dental',
    'cartilago_condilar',
    'cartilago_coronoideo',
    'cartilago_sinfisario',
    'extremo_posterior_meckel',
  ],
  // Sección 3.3 (arrastre molecular): fondo de la escena
  m3_bmp_runx2_osterix: [
    'celula_progenitora',
    'receptor_bmp',
    'smad_1_5_8',
    'smad4',
    'nucleo_celular',
    'runx2',
    'osterix_sp7',
    'genes_osteoblasto',
  ],
  // Animación de la sección 3.4 (video-texto). La exploración de 3.4 es ahora el modelo 3D `red_lacuno_canalicular`.
  m3_osteocito_red_lacuno_canalicular: [
    'matriz_mineralizada',
    'laguna_osteocitica',
    'cuerpo_osteocito',
    'procesos_dendriticos',
    'canaliculos',
    'espacio_pericelular',
    'fibras_de_anclaje',
    'integrinas_puntos_union',
    'cilio_primario',
    'canal_piezo1',
    'conexina_43',
    'capilar_conducto_haversiano',
    'celulas_revestimiento',
    'flechas_flujo_liquido',
    'mensajeros_pge2_no',
  ],
  // Sección 3.5 (multicapa, identificar)
  m3_sensores_mecanicos: [
    'membrana_proceso',
    'matriz_pericelular_fibras',
    'integrinas',
    'sensores_mecanicos_canal_piezo1',
    'sensores_mecanicos_cilio_primario',
    'hemicanal_cx43',
    'calcio_intracelular',
    'citoesqueleto_actina',
    'pge2',
    'oxido_nitrico',
  ],
  // Sección 3.6 (arrastre molecular): fondo de la escena
  m3_via_wnt_esclerostina: [
    'osteoblasto_membrana',
    'frizzled',
    'lrp5_6',
    'pth1r',
    'pth1r_osteocito',
    'complejo_destruccion',
    'beta_catenina',
    'nucleo_tcf_lef',
    'genes_diana_wnt',
    'osteocito_secretor',
    'matriz_osea_superficie',
  ],
  // Sección 3.7 (multicapa, explorar)
  m3_mecanostato_ventanas: [
    'ventana_desuso',
    'umbral_desuso',
    'ventana_adaptada',
    'umbral_modelado',
    'ventana_sobrecarga_leve',
    'umbral_microdano',
    'ventana_sobrecarga_patologica',
    'zona_fractura',
  ],
};

const ARCHIVOS = Object.keys(CAPAS_POR_ARCHIVO);

/** Paleta H&E compartida con los demás módulos: mismo lenguaje de color para hueso y osteoide. */
const COLOR_HUESO = '#d98aa2';
const COLOR_OSTEOIDE = '#f4d3dd';

function existe(nombre: string): boolean {
  return `../../../public/images/m3/${nombre}.svg` in CRUDOS;
}

function leer(nombre: string): string {
  const svg = CRUDOS[`../../../public/images/m3/${nombre}.svg`];
  if (svg === undefined) throw new Error(`Falta public/images/m3/${nombre}.svg`);
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

describe('ilustraciones SVG del módulo 3', () => {
  it('produce los 7 SVG que lista la tabla del guion, ni uno más ni uno menos', () => {
    // Eran 8: m3_osteoide_hueso_inmaduro pasó a un modelo 3D (2026-10-18) y se retiró.
    expect(ARCHIVOS).toHaveLength(7);
    for (const nombre of ARCHIVOS) {
      expect(existe(nombre), `falta ${nombre}.svg`).toBe(true);
    }
  });

  describe.each(ARCHIVOS)('%s', (nombre) => {
    const capas = CAPAS_POR_ARCHIVO[nombre] ?? [];

    it('pasa el validador real con su viewBox y todas sus capas como <g id>', () => {
      // gruposRaiz exige además que cada capa sea hijo directo de <svg> y que no haya formas sueltas:
      // así el mismo archivo sirve para explorar (multicapa) y para animar (video-texto).
      expect(problemasSvg(leer(nombre), { viewBox: VIEWBOX, capas, gruposRaiz: capas })).toEqual(
        [],
      );
    });

    it('usa un viewBox de enteros', () => {
      expect(analizarSvg(leer(nombre)).viewBox).toMatch(/^\d+ \d+ \d+ \d+$/);
    });

    it(`pesa como máximo ${PESO_MAX_BYTES / 1024} KB`, () => {
      expect(analizarSvg(leer(nombre)).bytes).toBeLessThanOrEqual(PESO_MAX_BYTES);
    });

    it('no repite ids de capa ni deja capas sin contenido dibujado', () => {
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

    it('rotula con currentColor y con un tamaño legible a 320 px de ancho', () => {
      const textos = [...leer(nombre).matchAll(/<text\b([^>]*)>/g)].map((m) => m[1] ?? '');
      for (const atributos of textos) {
        expect(atributos, 'los rótulos usan fill="currentColor"').toMatch(/fill="currentColor"/);
        const tamano = Number(/font-size="([\d.]+)"/.exec(atributos)?.[1] ?? 0);
        expect(tamano).toBeGreaterThanOrEqual(TAMANO_MIN_ROTULO);
      }
    });

    it('no fija colores de texto que se pierdan en un tema (ni negro ni blanco puros)', () => {
      const svg = leer(nombre);
      expect(svg).not.toMatch(/<text\b[^>]*fill="(?:#000(?:000)?|#fff(?:fff)?|black|white)"/i);
    });
  });

  it('mantiene el mismo color para hueso y osteoide en los dibujos que muestran matriz ósea', () => {
    for (const nombre of ['m3_rutas_formacion_osea', 'm3_osteocito_red_lacuno_canalicular']) {
      const svg = leer(nombre);
      expect(svg, `${nombre}: hueso mineralizado`).toContain(COLOR_HUESO);
      if (nombre !== 'm3_osteocito_red_lacuno_canalicular') {
        expect(svg, `${nombre}: osteoide`).toContain(COLOR_OSTEOIDE);
      }
    }
  });

  it('el osteocito expone como grupos de primer nivel las capas de la animación (sección 3.4, pasos v1 a v6)', () => {
    // Capas que muestran o resaltan los seis pasos de m3_video_mecanotransduccion.
    const usadas = [
      'matriz_mineralizada',
      'canaliculos',
      'espacio_pericelular',
      'flechas_flujo_liquido',
      'procesos_dendriticos',
      'fibras_de_anclaje',
      'cuerpo_osteocito',
      'integrinas_puntos_union',
      'cilio_primario',
      'canal_piezo1',
      'conexina_43',
      'mensajeros_pge2_no',
      'celulas_revestimiento',
    ];
    const raiz = analizarSvg(leer('m3_osteocito_red_lacuno_canalicular')).hijosRaiz.flatMap((h) =>
      h.etiqueta === 'g' && h.id ? [h.id] : [],
    );
    for (const capa of usadas) expect(raiz).toContain(capa);
  });
});
