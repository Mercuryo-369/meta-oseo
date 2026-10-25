// Prueba permanente de las ilustraciones SVG del módulo 5 ("Renovando el hueso").
// Valida cada archivo de public/images/m5 con el validador real (src/content/svg.ts) y comprueba que
// estén todas las capas que pide el guion, en docs/guion-por-modulo/m5_renovando_el_hueso.md, sección
// "Ilustraciones y modelos requeridos" (una tabla "id de capa" por ilustración). El modelo 3D de la
// mandíbula no es un SVG y no se comprueba aquí.
import { describe, expect, it } from 'vitest';
import { analizarSvg, problemasSvg } from '@/content/svg';

/** Texto crudo de los SVG de public/images/m5, indexado por ruta relativa a esta prueba. */
const CRUDOS = import.meta.glob('../../../public/images/m5/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
/** Guion del módulo (si el repositorio lo trae): permite cruzar las capas de esta prueba con la tabla. */
const GUION = import.meta.glob('../../../../../docs/guion-por-modulo/m5_renovando_el_hueso.md', {
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
/** Tinta índigo fija de los rótulos que se apoyan sobre una placa clara (legible en tema claro y oscuro). */
const TINTA_PLACA = '#2b2350';

/** Capas (grupos `<g id>`) por archivo, tal como las lista la tabla del guion. */
const CAPAS_POR_ARCHIVO: Record<string, readonly string[]> = {
  // Sección 5.1 (video-texto)
  m5_bmu_cortical_longitudinal: [
    'hueso_cortical_previo',
    'capilar_central',
    'cono_de_corte',
    'zona_de_inversion',
    'cono_de_cierre',
    'osteona_nueva',
    'direccion_de_avance',
  ],
  // Sección 5.1 (multicapa, explorar)
  m5_ciclo_remodelado_bmu: [
    'superficie_osea_base',
    'fase_quiescencia',
    'fase_activacion',
    'fase_resorcion',
    'fase_inversion',
    'fase_formacion',
    'fase_mineralizacion',
  ],
  // Sección 5.2 (video-texto y arrastre molecular: fondo de la escena)
  m5_osteoclastogenesis_rank_rankl_opg: [
    'superficie_osea',
    'celula_osteoblastica',
    'rankl_membrana',
    'precursor_osteoclasto',
    'receptor_rank',
    'receptor_c_fms',
    'mcsf',
    'opg',
    'nfatc1_nucleo',
    'osteoclasto_maduro',
    'laguna_resorcion',
    'balanza_rankl_opg',
  ],
  // Sección 5.3 (multicapa, explorar; y fondo del arrastre molecular)
  m5_acoplamiento_matriz_esclerostina: [
    'matriz_con_factores',
    'osteoclasto_resorbiendo',
    'factores_liberados',
    'celula_mesenquimal_reclutada',
    'preosteoblasto_igf1',
    'osteoblasto_formador',
    'osteocito_esclerostina',
    'via_wnt_lrp5_6',
  ],
  // Sección 5.4 (multicapa, explorar)
  m5_hormonas_regulacion_calcemia: [
    'sangre_calcemia',
    'paratiroides_pth',
    'tiroides_calcitonina',
    'rinon_calcitriol',
    'intestino_absorcion',
    'hueso_diana',
    'ovario_estrogenos',
  ],
  // Sección 5.5 (multicapa, identificar)
  m5_hueso_cortical_trabecular_alveolar: [
    'tabla_cortical_vestibular',
    'tabla_cortical_lingual',
    'hueso_esponjoso_alveolar',
    'hueso_alveolar_propio',
    'ligamento_periodontal',
    'raiz_dentaria',
    'cresta_alveolar',
    'hueso_basal',
  ],
  // Sección 5.5 (multicapa, identificar)
  m5_movimiento_ortodontico_pdl: [
    'raiz_cemento',
    'fuerza_ortodontica',
    'compresion_lpd',
    'compresion_hialinizacion',
    'compresion_osteoclastos',
    'tension_lpd',
    'tension_osteoblastos',
    'senales_compresion',
    'senales_tension',
  ],
  // Sección 5.6 (video-texto)
  m5_reparacion_fractura_fases: [
    'hueso_fracturado_base',
    'hematoma_fracturario',
    'periostio_neovascularizacion',
    'callo_blando',
    'callo_duro',
    'remodelado_callo',
  ],
  // Sección 5.6 (multicapa, explorar)
  m5_cicatrizacion_alveolo_fases: [
    'paredes_del_alveolo',
    'coagulo',
    'tejido_de_granulacion_alveolo',
    'epitelio_de_cierre',
    'matriz_provisional_y_hueso_inmaduro',
    'hueso_laminar_y_medula',
    'remodelado_del_reborde',
  ],
  // Sección 5.7 (multicapa, identificar)
  m5_equilibrio_remodelado_alteraciones: [
    'hueso_normal',
    'osteopetrosis',
    'enfermedad_de_paget',
    'osteoporosis',
  ],
};

const ARCHIVOS = Object.keys(CAPAS_POR_ARCHIVO);

/** Los SVG que se usan en un video-texto: todo su dibujo va en grupos de primer nivel (sección 8, regla 7). */
const VIDEO_TEXTO = [
  'm5_bmu_cortical_longitudinal',
  'm5_osteoclastogenesis_rank_rankl_opg',
  'm5_reparacion_fractura_fases',
];

/**
 * Los SVG que se usan en un multicapa y las capas que el estudiante toca (docs/content-schema.md, sección 8,
 * "Zonas táctiles"). La aplicación clona cada trazo sin relleno con un grosor mínimo de 44 px, así que una capa
 * con líneas o contornos sueltos declara su propia zona (`<g data-zona-toque>`): solo esa zona es el objetivo.
 */
const MULTICAPA: Record<string, readonly string[]> = {
  m5_ciclo_remodelado_bmu: [
    'fase_quiescencia',
    'fase_activacion',
    'fase_resorcion',
    'fase_inversion',
    'fase_formacion',
    'fase_mineralizacion',
  ],
  m5_acoplamiento_matriz_esclerostina: CAPAS_POR_ARCHIVO.m5_acoplamiento_matriz_esclerostina ?? [],
  m5_hormonas_regulacion_calcemia: CAPAS_POR_ARCHIVO.m5_hormonas_regulacion_calcemia ?? [],
  m5_hueso_cortical_trabecular_alveolar:
    CAPAS_POR_ARCHIVO.m5_hueso_cortical_trabecular_alveolar ?? [],
  m5_movimiento_ortodontico_pdl: CAPAS_POR_ARCHIVO.m5_movimiento_ortodontico_pdl ?? [],
  m5_cicatrizacion_alveolo_fases: CAPAS_POR_ARCHIVO.m5_cicatrizacion_alveolo_fases ?? [],
  m5_equilibrio_remodelado_alteraciones:
    CAPAS_POR_ARCHIVO.m5_equilibrio_remodelado_alteraciones ?? [],
};

/** Capas que cada actividad de "identificar" pide tocar: sus etiquetas no pueden aparecer escritas en el dibujo. */
const ETIQUETAS_OCULTAS: Record<string, readonly string[]> = {
  m5_hueso_cortical_trabecular_alveolar: [
    'Tabla cortical vestibular',
    'Tabla cortical lingual',
    'Hueso esponjoso de soporte',
    'Hueso alveolar propio',
    'Ligamento periodontal',
    'Raíz dentaria con cemento',
    'Cresta alveolar',
    'Hueso basal',
  ],
  m5_movimiento_ortodontico_pdl: [
    'Raíz y cemento',
    'Fuerza ortodóntica',
    'Ligamento comprimido',
    'Zona hialinizada',
    'Osteoclastos en el lado de compresión',
    'Ligamento estirado',
    'Osteoblastos en el lado de tensión',
  ],
  m5_equilibrio_remodelado_alteraciones: [
    'Hueso normal',
    'Osteopetrosis',
    'Enfermedad de Paget',
    'Osteoporosis',
  ],
};

/** Paleta H&E compartida con los demás módulos: mismo lenguaje de color para hueso y osteoide. */
const COLOR_HUESO = '#d98aa2';
const COLOR_OSTEOIDE = '#f4d3dd';
const COLOR_NUCLEO = '#3b2f86';

function existe(nombre: string): boolean {
  return `../../../public/images/m5/${nombre}.svg` in CRUDOS;
}

function leer(nombre: string): string {
  const svg = CRUDOS[`../../../public/images/m5/${nombre}.svg`];
  if (svg === undefined) throw new Error(`Falta public/images/m5/${nombre}.svg`);
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

/** Textos (nodos `<text>`) de un SVG, sin etiquetas. */
function textos(svg: string): string[] {
  return [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((m) => (m[1] ?? '').trim());
}

/** Lee del guion, por ilustración, los ids de la primera columna de su tabla "id de capa". */
function capasDelGuion(md: string): Record<string, string[]> {
  const salida: Record<string, string[]> = {};
  const inicio = md.indexOf('## Ilustraciones y modelos requeridos');
  const fin = md.indexOf('\n## ', inicio + 10);
  const seccion = md.slice(inicio, fin === -1 ? undefined : fin);
  const bloques = seccion.split(/\*\*Ilustración `([a-z0-9_]+)`\*\*/);
  for (let i = 1; i < bloques.length; i += 2) {
    const id = bloques[i] ?? '';
    const cuerpo = bloques[i + 1] ?? '';
    // Solo las filas contiguas de la tabla (después vienen las notas y, al final, la tabla del modelo 3D).
    const lineas = cuerpo.slice(cuerpo.indexOf('| id de capa')).split('\n');
    const corte = lineas.findIndex((l, k) => k > 0 && !l.startsWith('|'));
    const tabla = lineas.slice(0, corte === -1 ? undefined : corte).join('\n');
    salida[id] = [...tabla.matchAll(/^\| `([a-z0-9_]+)` \|/gm)].map((m) => m[1] ?? '');
  }
  return salida;
}

describe('ilustraciones SVG del módulo 5', () => {
  it('produce los 10 SVG que lista la tabla del guion, ni uno más ni uno menos', () => {
    expect(ARCHIVOS).toHaveLength(10);
    for (const nombre of ARCHIVOS) {
      expect(existe(nombre), `falta ${nombre}.svg`).toBe(true);
    }
    // `X_zonas.svg` es la versión de capas de `X.svg` que va sobre su ilustración realista (tools/imagenes).
    const enCarpeta = Object.keys(CRUDOS)
      .map((r) => /\/([^/]+)\.svg$/.exec(r)?.[1] ?? r)
      .filter((n) => !n.endsWith('_zonas'));
    expect([...enCarpeta].sort()).toEqual([...ARCHIVOS].sort());
  });

  const guion = Object.values(GUION)[0];
  (guion === undefined ? it.skip : it)(
    'las capas de esta prueba coinciden con las tablas del guion (sección "Ilustraciones y modelos requeridos")',
    () => {
      const delGuion = capasDelGuion(guion ?? '');
      expect(Object.keys(delGuion).sort()).toEqual([...ARCHIVOS].sort());
      for (const nombre of ARCHIVOS) {
        expect(delGuion[nombre], nombre).toEqual(CAPAS_POR_ARCHIVO[nombre]);
      }
    },
  );

  describe.each(ARCHIVOS)('%s', (nombre) => {
    const capas = CAPAS_POR_ARCHIVO[nombre] ?? [];

    it('pasa el validador real con su viewBox y todas sus capas como <g id>', () => {
      expect(problemasSvg(leer(nombre), { viewBox: VIEWBOX, capas })).toEqual([]);
    });

    it('tiene cada capa como hijo directo de <svg> y ninguna forma suelta en la raíz', () => {
      // gruposRaiz exige que cada capa sea hijo directo de <svg> y que no haya formas sueltas:
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

    it('lleva título y descripción accesibles', () => {
      const svg = leer(nombre);
      expect(svg).toMatch(/<title>[^<]{6,}<\/title>/);
      expect(svg).toMatch(/<desc>[^<]{30,}<\/desc>/);
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

    it('rotula con currentColor (o con tinta fija sobre placa clara) y con un tamaño legible a 320 px', () => {
      const etiquetas = [...leer(nombre).matchAll(/<text\b([^>]*)>/g)].map((m) => m[1] ?? '');
      for (const atributos of etiquetas) {
        const relleno = /fill="([^"]+)"/.exec(atributos)?.[1];
        expect(
          [undefined, 'currentColor', TINTA_PLACA].includes(relleno) && relleno !== undefined,
          `texto con relleno inesperado: ${relleno ?? '(sin fill)'}`,
        ).toBe(true);
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

  describe.each(Object.keys(MULTICAPA))('multicapa: %s', (nombre) => {
    const capas = MULTICAPA[nombre] ?? [];

    it('cada capa tiene como máximo una zona táctil, transparente, y las de trazos sueltos tienen la suya', () => {
      const svg = leer(nombre);
      for (const capa of capas) {
        const cuerpo = cuerpoDeGrupo(svg, svg.indexOf(`<g id="${capa}"`));
        const zonas = cuerpo.match(/<g data-zona-toque/g) ?? [];
        expect(zonas.length, `${capa}: más de una zona`).toBeLessThanOrEqual(1);
        if (zonas.length === 1) {
          const zona = cuerpoDeGrupo(
            svg,
            svg.indexOf('<g data-zona-toque', svg.indexOf(`<g id="${capa}"`)),
          );
          expect(zona, `${capa}: la zona debe tener alguna forma`).toMatch(
            /<(?:rect|path|ellipse|circle)\b/,
          );
          expect(zona, `${capa}: la zona debe ser transparente`).not.toMatch(
            /fill="(?!transparent)[^"]*"/,
          );
        } else {
          // Sin zona propia, la app clonaría cada línea o contorno con 44 px de grosor: no puede haberlos.
          expect(cuerpo, `${capa}: líneas sueltas sin zona`).not.toMatch(/<(?:line|polyline)\b/);
          expect(cuerpo, `${capa}: contornos sin relleno y sin zona`).not.toMatch(
            /<(?:path|rect|circle|ellipse)\b[^>]*\sfill="none"[^>]*\sstroke="(?!none|transparent)/,
          );
        }
      }
    });
  });

  describe.each(VIDEO_TEXTO)('video-texto: %s', (nombre) => {
    it('deja como grupos de primer nivel todas las capas que muestran u ocultan los pasos', () => {
      const raiz = analizarSvg(leer(nombre)).hijosRaiz.flatMap((h) =>
        h.etiqueta === 'g' && h.id ? [h.id] : [],
      );
      for (const capa of CAPAS_POR_ARCHIVO[nombre] ?? []) expect(raiz).toContain(capa);
    });
  });

  describe.each(Object.keys(ETIQUETAS_OCULTAS))('identificar: %s', (nombre) => {
    it('no escribe en el dibujo el nombre de las capas que hay que identificar', () => {
      const escritos = textos(leer(nombre)).map((t) => t.toLowerCase());
      for (const etiqueta of ETIQUETAS_OCULTAS[nombre] ?? []) {
        expect(escritos, `el dibujo revela «${etiqueta}»`).not.toContain(etiqueta.toLowerCase());
      }
    });
  });

  it('m5_equilibrio_remodelado_alteraciones no lleva ningún texto (los paneles se identifican por su aspecto)', () => {
    expect(textos(leer('m5_equilibrio_remodelado_alteraciones'))).toEqual([]);
  });

  it('m5_movimiento_ortodontico_pdl escribe las señales que pide el guion, en su capa', () => {
    const svg = leer('m5_movimiento_ortodontico_pdl');
    const comp = cuerpoDeGrupo(svg, svg.indexOf('<g id="senales_compresion"'));
    const tens = cuerpoDeGrupo(svg, svg.indexOf('<g id="senales_tension"'));
    for (const t of ['RANKL', 'OPG', 'PGE2', 'IL-1β', 'TNF-α']) expect(textos(comp)).toContain(t);
    for (const t of ['OPG', 'RANKL', 'IL-10', 'Colágeno I', 'Osteocalcina']) {
      expect(textos(tens)).toContain(t);
    }
  });

  it('m5_hormonas_regulacion_calcemia pone las flechas de PTH y calcitonina en sentidos opuestos sobre la calcemia', () => {
    const svg = leer('m5_hormonas_regulacion_calcemia');
    const pth = cuerpoDeGrupo(svg, svg.indexOf('<g id="paratiroides_pth"'));
    const cal = cuerpoDeGrupo(svg, svg.indexOf('<g id="tiroides_calcitonina"'));
    // Verde y hacia arriba para lo que sube la calcemia; rojo y hacia abajo para lo que la baja.
    expect(pth).toContain('#1b7f5f');
    expect(cal).toContain('#c2384f');
    expect(textos(pth)).toContain('PTH');
    expect(textos(cal)).toContain('Calcitonina');
  });

  it('m5_bmu_cortical_longitudinal indica que la escala es aproximada', () => {
    expect(textos(leer('m5_bmu_cortical_longitudinal'))).toContain('aprox. 200 µm');
  });

  it('mantiene el mismo color para hueso, osteoide y núcleo que los demás módulos (paleta H&E)', () => {
    for (const nombre of [
      'm5_bmu_cortical_longitudinal',
      'm5_ciclo_remodelado_bmu',
      'm5_acoplamiento_matriz_esclerostina',
      'm5_hueso_cortical_trabecular_alveolar',
      'm5_reparacion_fractura_fases',
      'm5_cicatrizacion_alveolo_fases',
      'm5_equilibrio_remodelado_alteraciones',
    ]) {
      const svg = leer(nombre);
      // Un SVG que ya es la capa de zonas sobre su ilustración realista conserva los rellenos (con opacidad 0), pero
      // no los trazos: la paleta se comprueba en los rellenos de núcleos y en el dibujo original (historial de git).
      if (svg.includes('Zonas sobre la ilustración')) {
        expect(svg, `${nombre}: núcleos`).toContain(COLOR_NUCLEO);
        continue;
      }
      expect(svg, `${nombre}: hueso mineralizado`).toContain(COLOR_HUESO);
      expect(svg, `${nombre}: núcleos`).toContain(COLOR_NUCLEO);
    }
    for (const nombre of [
      'm5_bmu_cortical_longitudinal',
      'm5_ciclo_remodelado_bmu',
      'm5_acoplamiento_matriz_esclerostina',
    ]) {
      // El osteoide (rosa pálido) solo aparece donde el dibujo muestra matriz sin mineralizar.
      expect(leer(nombre), `${nombre}: osteoide`).toContain(COLOR_OSTEOIDE);
    }
  });

  it('el video-texto de la osteoclastogénesis nace con la escena inicial (los pasos posteriores, ocultos)', () => {
    const svg = leer('m5_osteoclastogenesis_rank_rankl_opg');
    for (const capa of [
      'mcsf',
      'opg',
      'nfatc1_nucleo',
      'osteoclasto_maduro',
      'laguna_resorcion',
      'balanza_rankl_opg',
    ]) {
      expect(svg, capa).toMatch(new RegExp(`<g id="${capa}" style="opacity:0;visibility:hidden">`));
    }
    for (const capa of [
      'superficie_osea',
      'celula_osteoblastica',
      'rankl_membrana',
      'precursor_osteoclasto',
      'receptor_rank',
      'receptor_c_fms',
    ]) {
      expect(svg, capa).toMatch(new RegExp(`<g id="${capa}">`));
    }
  });
});
