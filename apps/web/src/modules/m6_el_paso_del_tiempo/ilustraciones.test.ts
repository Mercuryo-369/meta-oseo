// Prueba permanente de las ilustraciones SVG del módulo 6 ("El paso del tiempo").
// Valida cada archivo de public/images/m6 con el validador real (src/content/svg.ts) y comprueba
// que estén todas las capas que pide el guion, en docs/guion-por-modulo/m6_el_paso_del_tiempo.md,
// sección "Ilustraciones y modelos requeridos" (tabla "Capas o zonas"). El modelo 3D de la mandíbula
// (`mandibula`) no es un SVG y no se comprueba aquí.
import { describe, expect, it } from 'vitest';
import { analizarSvg, problemasSvg } from '@/content/svg';

/** Texto crudo de los SVG de public/images/m6, indexado por ruta relativa a esta prueba. */
const CRUDOS = import.meta.glob('../../../public/images/m6/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
/** Todos los dibujos del OVA usan el viewBox por defecto de la guía (sección 8). */
const VIEWBOX = '0 0 800 600';
/** Peso máximo fijado para estas ilustraciones: la mitad del límite del validador (200 KB). */
const PESO_MAX_BYTES = 100 * 1024;
/** 30 unidades del viewBox equivalen a 12 px reales en un teléfono de 320 px de ancho. */
const TAMANO_MIN_ROTULO = 30;
/**
 * Tinta índigo de la paleta H&E (la misma de los módulos 2 a 5). Los dibujos de este módulo se ven
 * como imagen (`<img>`, donde `currentColor` es siempre negro) y también inyectados en la página
 * (multicapa y animación), así que llevan su propia lámina clara de fondo y tinta fija: se leen igual
 * en tema claro y oscuro.
 */
const TINTA = '#2b2350';
/** Fondo de lámina (lavanda muy clara) que llevan todos los dibujos. */
const LAMINA = '#f1edfa';

/** Capas (grupos `<g id>`) por archivo, tal como las lista la tabla del guion. */
const CAPAS_POR_ARCHIVO: Record<string, readonly string[]> = {
  // Sección 6.1 (video-texto m6_1_video_curva): cada capa es un grupo de primer nivel.
  m6_curva_masa_osea: [
    'eje_edad_masa',
    'curva_mujer',
    'curva_hombre',
    'fase_crecimiento',
    'zona_pico_masa_osea',
    'fase_meseta',
    'marca_menopausia',
    'fase_perdida_acelerada',
    'fase_perdida_lenta',
    'umbral_fragilidad',
    'curva_pico_mayor',
  ],
  // Sección 6.1 (arrastre molecular m6_1_arrastre_estrogenos): fondo de la escena.
  m6_escena_estrogeno_rankl: [
    'superficie_osea',
    'celula_osteoblastica',
    'receptor_er_alfa',
    'rankl_membrana',
    'opg_soluble',
    'linfocito_t',
    'precursor_osteoclasto',
    'receptor_rank',
    'receptor_cfms',
    'receptor_tnf',
    'osteoclasto_multinucleado',
    'laguna_resorcion',
    'efecto_estrogeno_rankl',
    'efecto_opg_bloquea',
    'efecto_diferenciacion',
    'efecto_proliferacion',
    'efecto_amplificacion_tnf',
  ],
  // Sección 6.2 (multicapa, explorar)
  m6_tejido_oseo_envejecido: [
    'osteocito_senescente',
    'red_canalicular_reducida',
    'laguna_mineralizada',
    'microfisura',
    'poro_cortical',
    'medula_adiposa',
    'matriz_colageno_age',
    'superficie_osteoblastos_escasos',
  ],
  // Sección 6.3 (multicapa, explorar)
  m6_hueso_normal_osteoporotico: [
    'trabeculas_normales',
    'trabeculas_osteoporoticas',
    'perforacion_trabecular',
    'cortical_normal',
    'cortical_adelgazada',
    'porosidad_cortical',
    'cavidad_medular_ampliada',
    'colapso_vertebral',
  ],
  // Sección 6.4 (figura tras m6_4_ordenar_reborde)
  m6_reborde_alveolar_cascada: [
    'etapa_1_diente_presente',
    'etapa_2_alveolo_postextraccion',
    'etapa_3_reborde_redondeado',
    'etapa_4_reborde_filo_cuchillo',
    'etapa_5_reborde_plano',
    'etapa_6_reborde_deprimido',
    'ligamento_periodontal',
    'hueso_alveolar_propio',
    'carga_funcional',
    'conducto_mandibular',
  ],
  // Sección 6.4 (figura de la ATM)
  m6_atm_cambios_degenerativos: [
    'condilo_mandibular',
    'fosa_mandibular',
    'eminencia_articular',
    'disco_articular',
    'fibrocartilago_articular',
    'hueso_subcondral',
    'osteofito_condilar',
    'aplanamiento_condilar',
    'esclerosis_subcondral',
    'disco_desplazado',
  ],
  // Sección 6.5 (figura del mapa de prevención)
  m6_prevencion_mapa: [
    'hueso_diana',
    'pilar_carga_mecanica',
    'pilar_calcio',
    'pilar_vitamina_d',
    'pilar_habitos',
    'pilar_caidas',
    'palanca_antirreabsortivos',
    'palanca_anabolicos',
  ],
};

const ARCHIVOS = Object.keys(CAPAS_POR_ARCHIVO);

/** Capas que empiezan ocultas (las muestra la actividad): la escena del estrógeno, como en el módulo 5. */
const OCULTAS_EN_ESCENA = [
  'opg_soluble',
  'laguna_resorcion',
  'osteoclasto_multinucleado',
  'efecto_estrogeno_rankl',
  'efecto_opg_bloquea',
  'efecto_diferenciacion',
  'efecto_proliferacion',
  'efecto_amplificacion_tnf',
] as const;

/** Paleta H&E compartida entre los seis módulos: el hueso mineralizado tiene un solo color. */
const COLOR_HUESO = '#d98aa2';
/** Dibujos que muestran matriz ósea mineralizada. */
const CON_HUESO = [
  'm6_escena_estrogeno_rankl',
  'm6_tejido_oseo_envejecido',
  'm6_hueso_normal_osteoporotico',
  'm6_reborde_alveolar_cascada',
  'm6_atm_cambios_degenerativos',
  'm6_prevencion_mapa',
];

function existe(nombre: string): boolean {
  return `../../../public/images/m6/${nombre}.svg` in CRUDOS;
}

function leer(nombre: string): string {
  const svg = CRUDOS[`../../../public/images/m6/${nombre}.svg`];
  if (svg === undefined) throw new Error(`Falta public/images/m6/${nombre}.svg`);
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

describe('ilustraciones SVG del módulo 6', () => {
  it('produce los 7 SVG que lista la tabla del guion, ni uno más ni uno menos', () => {
    expect(ARCHIVOS).toHaveLength(7);
    for (const nombre of ARCHIVOS) {
      expect(existe(nombre), `falta ${nombre}.svg`).toBe(true);
    }
    const presentes = Object.keys(CRUDOS)
      .map((ruta) => /([^/]+)\.svg$/.exec(ruta)?.[1] ?? '')
      .sort();
    expect(presentes).toEqual([...ARCHIVOS].sort());
  });

  describe.each(ARCHIVOS)('%s', (nombre) => {
    const capas = CAPAS_POR_ARCHIVO[nombre] ?? [];

    it('pasa el validador real con su viewBox y todas sus capas como <g id>', () => {
      // gruposRaiz exige además que cada capa sea hijo directo de <svg> y que no haya formas sueltas:
      // así el mismo archivo sirve para explorar (multicapa), para animar (video-texto) y de fondo.
      expect(problemasSvg(leer(nombre), { viewBox: VIEWBOX, capas, gruposRaiz: capas })).toEqual(
        [],
      );
    });

    it('usa un viewBox de enteros y lleva título y descripción accesibles', () => {
      const svg = leer(nombre);
      expect(analizarSvg(svg).viewBox).toMatch(/^\d+ \d+ \d+ \d+$/);
      expect(svg).toMatch(/<title>[^<]{3,}<\/title>/);
      expect(svg).toMatch(/<desc>[^<]{30,}<\/desc>/);
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

    it('lleva su lámina de fondo opaca y rotula con la tinta de la paleta y un tamaño legible', () => {
      const svg = leer(nombre);
      // La lámina es un rect opaco: en la curva vive dentro de eje_edad_masa (visible en todos los
      // pasos de la animación); en el resto, en el grupo fondo_lamina o en la capa base.
      expect(svg, 'lámina de fondo').toMatch(new RegExp(`<rect [^>]*fill="${LAMINA}"`));
      const textos = [...svg.matchAll(/<text\b([^>]*)>/g)].map((m) => m[1] ?? '');
      expect(textos.length).toBeGreaterThan(0);
      for (const atributos of textos) {
        expect(atributos, 'los rótulos usan la tinta de la paleta').toContain(`fill="${TINTA}"`);
        const tamano = Number(/font-size="([\d.]+)"/.exec(atributos)?.[1] ?? 0);
        expect(tamano).toBeGreaterThanOrEqual(TAMANO_MIN_ROTULO);
      }
    });

    it('no fija colores de texto que se pierdan en un tema (ni negro ni blanco puros)', () => {
      expect(leer(nombre)).not.toMatch(
        /<text\b[^>]*fill="(?:#000(?:000)?|#fff(?:fff)?|black|white)"/i,
      );
    });

    it('no usa script, style embebido, imágenes ni referencias externas', () => {
      const svg = leer(nombre);
      expect(svg).not.toMatch(/<(?:script|style|image|foreignObject)\b/i);
      expect(svg).not.toMatch(/\son[a-z]+\s*=/i);
      expect(svg).not.toMatch(/(?:href|url\()\s*=?\s*["']?(?:https?:|data:)/i);
    });
  });

  it('mantiene el mismo color para el hueso mineralizado en todos los dibujos que lo muestran', () => {
    for (const nombre of CON_HUESO) {
      expect(leer(nombre), `${nombre}: hueso mineralizado`).toContain(COLOR_HUESO);
    }
  });

  it('la curva expone como grupos de primer nivel las capas de los seis pasos de la animación', () => {
    // Capas que muestran o resaltan los pasos de m6_1_video_curva (guion, sección 6.1).
    const raiz = analizarSvg(leer('m6_curva_masa_osea')).hijosRaiz.flatMap((h) =>
      h.etiqueta === 'g' && h.id ? [h.id] : [],
    );
    for (const capa of CAPAS_POR_ARCHIVO.m6_curva_masa_osea ?? []) expect(raiz).toContain(capa);
  });

  it('la escena del estrógeno oculta al inicio las capas de efecto, el osteoclasto y la laguna', () => {
    const svg = leer('m6_escena_estrogeno_rankl');
    for (const capa of OCULTAS_EN_ESCENA) {
      expect(svg, `${capa} debe empezar oculta`).toMatch(
        new RegExp(`<g id="${capa}"[^>]*style="opacity:0;visibility:hidden"`),
      );
    }
    // Las capas de la escena base (célula, receptores, hueso) sí se ven desde el principio.
    for (const capa of [
      'celula_osteoblastica',
      'receptor_rank',
      'linfocito_t',
      'superficie_osea',
    ]) {
      expect(svg).not.toMatch(new RegExp(`<g id="${capa}"[^>]*visibility:hidden`));
    }
  });
});
