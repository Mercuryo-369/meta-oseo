/**
 * Pruebas de `ActividadArrastreMolecular`: la batería de conformidad del contrato y los casos
 * propios del arrastre (toque, Pointer Events, teclado, radio de captura, distractores, competencia
 * en un receptor, intentos y penalización, estado previo, movimiento reducido, desmontaje limpio y
 * contenido adversarial). El DOM es happy-dom: no hay layout, así que los rectángulos de los
 * receptores se simulan con `getBoundingClientRect`.
 */
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INSTANTANEA_MAX_BYTES,
  PROGRESO_INTERVALO_MIN_MS,
  RADIO_CAPTURA_MIN_PX,
  TAMANO_TACTIL_MIN_PX,
  aPeticionResultadoApi,
} from '@/activities/types';
import type { ProgresoActividad, PropsActividadArrastreMolecular } from '@/activities/types';
import { listarActividades } from '@/content/consultas';
import { pruebasDeContratoActividad, problemasDeEmisiones } from '@/content/__fixtures__/contrato';
import type { EventosEmitidos } from '@/content/__fixtures__/contrato';
import { muestra, validar } from '@/content/__fixtures__/utiles';
import { calcularPuntaje } from '@/content/scoring';
import { ConfigArrastreMolecularSchema } from '@/content/schema';
import type {
  ActividadArrastreMolecular as TipoActividadArrastre,
  AnimacionEfecto,
  ConfigArrastreMolecular,
} from '@/content/schema';
import ActividadArrastreMolecular from './ActividadArrastreMolecular.vue';
import { ordenBarajado } from './geometria';
import codigoFuente from './ActividadArrastreMolecular.vue?raw';

const modulo = validar(muestra()).modulo!;
const arrastre = listarActividades(modulo).find((u) => u.actividad.tipo === 'arrastre-molecular')!
  .actividad as TipoActividadArrastre;

/* -------------------------------------------------------------------------------------------
 * Ayudas
 * ----------------------------------------------------------------------------------------- */

/** Actividad de muestra con otra `config` (y, si se pide, otros campos). */
function conConfig(
  config: unknown,
  extra: Partial<Omit<TipoActividadArrastre, 'config'>> = {},
): TipoActividadArrastre {
  return { ...structuredClone(arrastre), ...extra, config } as TipoActividadArrastre;
}

function variante(cambios: (c: ConfigArrastreMolecular) => void): TipoActividadArrastre {
  const config = structuredClone(arrastre.config);
  cambios(config);
  return conConfig(config);
}

const efecto = (
  animacion: AnimacionEfecto = 'activacion',
  titulo = 'Efecto de prueba',
  descripcion = 'Descripción del efecto de prueba.',
) => ({ titulo, descripcion, animacion, indicadores: [] });

/** Wnt y SOST compiten por LRP5/6; PTH va a PTH1R; "Ruido" y "Ajeno" son distractores. */
function configCompetencia(): ConfigArrastreMolecular {
  return {
    escena: { viewBox: '0 0 800 600', alt: 'Escena de prueba con dos receptores.' },
    moleculas: [
      { id: 'wnt', etiqueta: 'Wnt', descripcion: 'Activa la vía canónica.', forma: 'circulo' },
      { id: 'sost', etiqueta: 'SOST', descripcion: 'Bloquea el receptor.', forma: 'cuadrado' },
      { id: 'pth', etiqueta: 'PTH', descripcion: 'Hormona paratiroidea.', forma: 'rombo' },
      {
        id: 'ruido',
        etiqueta: 'Ruido',
        descripcion: 'No encaja en ningún sitio.',
        forma: 'triangulo',
        rechazo: 'Ruido no encaja en ningún receptor de esta escena.',
      },
      {
        id: 'ajeno',
        etiqueta: 'Ajeno',
        descripcion: 'Tampoco encaja en ningún sitio.',
        forma: 'hexagono',
        rechazo: 'Ajeno pertenece a otra vía y aquí no se une.',
      },
    ],
    receptores: [
      {
        id: 'lrp',
        etiqueta: 'LRP5/6',
        descripcion: 'Correceptor de la vía Wnt.',
        posicion: { x: 30, y: 50 },
      },
      {
        id: 'pth1r',
        etiqueta: 'PTH1R',
        descripcion: 'Receptor de la hormona.',
        posicion: { x: 70, y: 50 },
      },
    ],
    pares: [
      {
        id: 'p_wnt',
        molecula: 'wnt',
        receptor: 'lrp',
        efecto: efecto('activacion', 'Wnt activa la vía', 'Wnt activa la vía canónica.'),
      },
      {
        id: 'p_sost',
        molecula: 'sost',
        receptor: 'lrp',
        efecto: efecto('inhibicion', 'SOST frena la vía', 'SOST bloquea la vía canónica.'),
      },
      { id: 'p_pth', molecula: 'pth', receptor: 'pth1r', efecto: efecto('liberacion') },
    ],
    distractores: ['ruido', 'ajeno'],
  } as ConfigArrastreMolecular;
}

interface Opciones {
  modo?: 'jugar' | 'revisar';
  estadoPrevio?: PropsActividadArrastreMolecular['estadoPrevio'];
  conDocumento?: boolean;
}

let montados: VueWrapper[] = [];

function montar(actividad: TipoActividadArrastre = arrastre, opciones: Opciones = {}) {
  const progresos: ProgresoActividad[] = [];
  /** Nombre de cada evento emitido, en el orden real (sobrevive al desmontaje). */
  const eventos: string[] = [];
  const wrapper = mount(ActividadArrastreMolecular, {
    attachTo: opciones.conDocumento ? document.body : undefined,
    props: {
      actividad,
      modulo: 1,
      modo: opciones.modo,
      estadoPrevio: opciones.estadoPrevio,
      onProgreso: (p: ProgresoActividad) => {
        progresos.push(p);
        eventos.push('progreso');
      },
      onInteraccion: () => eventos.push('interaccion'),
      onCompletada: () => eventos.push('completada'),
    } as never,
  });
  montados.push(wrapper);
  return { wrapper, progresos, eventos };
}

/**
 * Tras un arrastre real el componente ignora, durante 400 ms, el clic que dispara el navegador.
 * Las pruebas avanzan el reloj de `Date.now` en vez de esperar.
 */
let desfaseReloj = 0;
const ahoraReal = Date.now.bind(Date);
beforeEach(() => {
  desfaseReloj = 0;
  vi.spyOn(Date, 'now').mockImplementation(() => ahoraReal() + desfaseReloj);
});

afterEach(() => {
  for (const w of montados) {
    try {
      w.unmount();
    } catch {
      // ya desmontado por la prueba
    }
  }
  montados = [];
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const interacciones = (w: VueWrapper) =>
  (w.emitted('interaccion') ?? []).map((a) => a[0]) as {
    accion: string;
    objeto?: string;
    resultado?: string;
  }[];
const completadas = (w: VueWrapper) =>
  (w.emitted('completada') ?? []).map((a) => a[0]) as {
    puntaje: number;
    intentos: number;
    precision: number;
    detalle: {
      acoples_correctos: number;
      errores: number;
      errores_por_molecula: Record<string, number>;
    };
  }[];
const texto = (w: VueWrapper) => w.text().replace(/\s+/g, ' ');
const viva = (w: VueWrapper) => w.find('[data-retroalimentacion]');

const pieza = (w: VueWrapper, i: number) => w.find(`[data-pieza][data-indice="${i}"]`);
const receptor = (w: VueWrapper, i: number) => w.find(`[data-receptor][data-indice="${i}"]`);

async function elegir(w: VueWrapper, molecula: number): Promise<void> {
  await pieza(w, molecula).trigger('click');
}
async function acoplarPorToque(w: VueWrapper, molecula: number, rec: number): Promise<void> {
  await elegir(w, molecula);
  await receptor(w, rec).trigger('click');
}
/** Completa la actividad de muestra: RANKL en RANK y PTH en PTH1R. */
async function completarMuestra(w: VueWrapper): Promise<void> {
  await acoplarPorToque(w, 0, 0);
  await acoplarPorToque(w, 1, 1);
  await flushPromises();
}

/** Coloca las zonas de los receptores en (x, y) de la ventana: 44 x 44 px centradas ahí. */
function colocarReceptores(w: VueWrapper, centros: { x: number; y: number }[]): void {
  w.findAll('[data-receptor]').forEach((boton, i) => {
    const c = centros[i] ?? { x: -9999, y: -9999 };
    const zona = boton.find('.zona').element;
    vi.spyOn(zona, 'getBoundingClientRect').mockReturnValue({
      left: c.x - 22,
      top: c.y - 22,
      right: c.x + 22,
      bottom: c.y + 22,
      x: c.x - 22,
      y: c.y - 22,
      width: 44,
      height: 44,
      toJSON: () => ({}),
    });
  });
}
const CENTROS = [
  { x: 100, y: 200 },
  { x: 260, y: 200 },
];

function evento(tipo: string, x: number, y: number, extra: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(tipo, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
    ...extra,
  });
}

/** Gesto de arrastre con Pointer Events: presiona la pieza, mueve y suelta en (x, y). */
async function arrastrar(
  w: VueWrapper,
  molecula: number,
  destino: { x: number; y: number },
  { soltar = true, esperar = true }: { soltar?: boolean; esperar?: boolean } = {},
): Promise<void> {
  pieza(w, molecula).element.dispatchEvent(evento('pointerdown', 20, 20));
  window.dispatchEvent(evento('pointermove', 20 + 3, 20));
  window.dispatchEvent(evento('pointermove', destino.x, destino.y));
  await nextTick();
  if (soltar) {
    window.dispatchEvent(evento('pointerup', destino.x, destino.y));
    await nextTick();
    if (esperar) desfaseReloj += 500;
  }
}

function simularMovimientoReducido(reducido: boolean) {
  const anadidos = vi.fn();
  const quitados = vi.fn();
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (consulta: string) =>
      ({
        matches: reducido && consulta.includes('prefers-reduced-motion'),
        media: consulta,
        onchange: null,
        addEventListener: anadidos,
        removeEventListener: quitados,
        addListener: anadidos,
        removeListener: quitados,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
  return { anadidos, quitados };
}

/* -------------------------------------------------------------------------------------------
 * 1. Batería de conformidad del contrato
 * ----------------------------------------------------------------------------------------- */

pruebasDeContratoActividad<'arrastre-molecular'>({
  nombre: 'ActividadArrastreMolecular',
  actividad: arrastre,
  montar: (props) =>
    mount(ActividadArrastreMolecular, {
      props: props as never,
      attachTo: document.body,
    }) as unknown as VueWrapper,
  completar: completarMuestra,
  precisionEsperada: 1,
});

// Con la actividad de competencia (dos pares en el mismo receptor y dos distractores).
pruebasDeContratoActividad<'arrastre-molecular'>({
  nombre: 'ActividadArrastreMolecular (competencia en un receptor)',
  actividad: conConfig(configCompetencia()),
  montar: (props) =>
    mount(ActividadArrastreMolecular, { props: props as never }) as unknown as VueWrapper,
  completar: async (w) => {
    await acoplarPorToque(w, 0, 0);
    await acoplarPorToque(w, 1, 0);
    await acoplarPorToque(w, 2, 1);
    await flushPromises();
  },
  precisionEsperada: 1,
});

/* -------------------------------------------------------------------------------------------
 * 2. Presentación y accesibilidad estática
 * ----------------------------------------------------------------------------------------- */

describe('ActividadArrastreMolecular: presentación', () => {
  it('muestra título, instrucciones, las tres moléculas, los dos receptores y el avance en 0', () => {
    const { wrapper } = montar();
    expect(wrapper.find('h3').text()).toBe(arrastre.titulo);
    expect(texto(wrapper)).toContain('Arrastra cada molécula hasta el receptor');
    expect(wrapper.findAll('[data-pieza]')).toHaveLength(3);
    expect(wrapper.findAll('[data-receptor]')).toHaveLength(2);
    expect(texto(wrapper)).toContain('Acoplados: 0 de 2');
    const etiquetas = wrapper.findAll('.pieza-texto').map((e) => e.text());
    expect([...etiquetas].sort()).toEqual(['OPG', 'PTH', 'RANKL']);
  });

  it('no monta nada de resultados ni de efectos antes de interactuar', () => {
    const { wrapper } = montar();
    expect(wrapper.find('[data-fase="resumen"]').exists()).toBe(false);
    expect(wrapper.find('[data-efectos]').exists()).toBe(false);
    expect(wrapper.find('[data-fx]').exists()).toBe(false);
  });

  it('cada zona interactiva tiene nombre accesible y descripción tomados del contenido (R7)', () => {
    const { wrapper } = montar();
    for (const [i, r] of arrastre.config.receptores.entries()) {
      const boton = receptor(wrapper, i);
      expect(boton.attributes('type')).toBe('button');
      expect(boton.text()).toContain(r.etiqueta);
      const idDescripcion = boton.attributes('aria-describedby')!;
      expect(wrapper.find(`#${idDescripcion}`).text()).toContain(r.descripcion.slice(0, 20));
    }
    for (const p of wrapper.findAll('[data-pieza]')) {
      expect(p.attributes('type')).toBe('button');
      expect(p.attributes('aria-pressed')).toBe('false');
      const idDescripcion = p.attributes('aria-describedby')!;
      expect(wrapper.find(`#${idDescripcion}`).text().length).toBeGreaterThan(10);
    }
    const escena = wrapper.find('[data-escena]');
    expect(escena.attributes('role')).toBe('group');
    expect(escena.attributes('aria-label')).toBe(arrastre.config.escena.alt);
    const seccion = wrapper.find('section');
    expect(wrapper.find(`#${seccion.attributes('aria-labelledby')}`).text()).toBe(arrastre.titulo);
  });

  it('hay una sola región aria-live y presente desde el inicio (R4)', () => {
    const { wrapper } = montar();
    const vivas = wrapper.findAll('[aria-live]');
    expect(vivas).toHaveLength(1);
    expect(vivas[0]!.attributes('aria-live')).toBe('polite');
    expect(texto(wrapper)).toContain('Toca una molécula para elegirla');
  });

  it('los iconos y las formas son decorativos (aria-hidden) y las formas distinguen sin color', () => {
    const { wrapper } = montar();
    for (const svg of wrapper.findAll('svg')) expect(svg.attributes('aria-hidden')).toBe('true');
    const formas = wrapper.findAll('[data-pieza] svg').map((s) => s.attributes('data-forma'));
    expect([...formas].sort()).toEqual(['hexagono', 'rombo', 'triangulo']);
  });

  it('la geometría de CSS cumple el contrato: 44 px, 8 px de aire y touch-action solo en la pieza (R2, R8)', () => {
    const estilo = codigoFuente.slice(codigoFuente.indexOf('<style'));
    const regla = (selector: string) =>
      new RegExp(`(?:^|\\n)${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`).exec(estilo)?.[1] ??
      '';
    // 2.75rem = 44 px con 16 px de base.
    expect(TAMANO_TACTIL_MIN_PX).toBe(44);
    expect(regla('.pieza')).toMatch(/min-height:\s*2\.75rem/);
    expect(regla('.pieza')).toMatch(/min-width:\s*2\.75rem/);
    expect(regla('.zona')).toMatch(/width:\s*2\.75rem/);
    expect(regla('.zona')).toMatch(/height:\s*2\.75rem/);
    expect(regla('.bandeja')).toMatch(/gap:\s*0\.5rem/);
    const usos = estilo.match(/touch-action:[^;]*;/g) ?? [];
    expect(usos).toEqual(['touch-action: none;']);
    expect(regla('.pieza')).toContain('touch-action: none');
    expect(codigoFuente.slice(0, codigoFuente.indexOf('<style'))).not.toMatch(/touch-action/);
    // Nada de v-html en la actividad: el texto pasa por TextoLinea (renderizarLinea).
    expect(codigoFuente).not.toContain('v-html');
  });
});

/* -------------------------------------------------------------------------------------------
 * 3. Flujo feliz por toque
 * ----------------------------------------------------------------------------------------- */

describe('ActividadArrastreMolecular: flujo feliz (toque en dos pasos)', () => {
  it('elegir una molécula la marca y anuncia qué hacer; luego el receptor la acopla', async () => {
    const { wrapper } = montar();
    await elegir(wrapper, 0);
    expect(pieza(wrapper, 0).attributes('aria-pressed')).toBe('true');
    expect(pieza(wrapper, 0).attributes('data-estado')).toBe('elegida');
    expect(viva(wrapper).text()).toContain('Elegiste RANKL');
    expect(receptor(wrapper, 0).attributes('data-disponible')).toBe('true');
    expect(receptor(wrapper, 0).text()).toContain('Acoplar RANKL aquí');

    await receptor(wrapper, 0).trigger('click');
    expect(pieza(wrapper, 0).attributes('data-estado')).toBe('acoplada');
    expect(pieza(wrapper, 0).attributes('aria-pressed')).toBe('false');
    expect(pieza(wrapper, 0).text()).toContain('acoplada en RANK');
    expect(viva(wrapper).attributes('data-tipo')).toBe('exito');
    expect(viva(wrapper).text()).toContain('¡Acoplada! RANKL se une a RANK.');
    expect(viva(wrapper).text()).toContain('El preosteoclasto madura');
    expect(texto(wrapper)).toContain('Acoplados: 1 de 2');
    expect(receptor(wrapper, 0).attributes('data-ocupado')).toBe('true');
    expect(receptor(wrapper, 0).attributes('data-efecto')).toBe('transformacion');
  });

  it('muestra la tarjeta del efecto con título, descripción e indicadores con texto y no solo color', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 0, 0);
    const tarjeta = wrapper.find('[data-tarjeta-efecto]');
    expect(tarjeta.text()).toContain('El preosteoclasto madura');
    expect(tarjeta.text()).toContain('Al unirse RANKL a RANK');
    expect(tarjeta.text()).toContain('Formación de osteoclastos');
    expect(tarjeta.text()).toContain('aumenta');
    expect(tarjeta.text()).toContain('Último acople');
  });

  it('emite las interacciones del vocabulario, con la molécula como objeto', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 0, 0);
    expect(interacciones(wrapper)).toEqual([
      { accion: 'arrastra_molecula', objeto: 'mol_rankl' },
      { accion: 'acopla_molecula', objeto: 'mol_rankl', resultado: 'correcta' },
    ]);
  });

  it('al acoplar la última emite UNA vez "completada" con precisión 1, puntaje 50 y detalle', async () => {
    const { wrapper } = montar();
    await completarMuestra(wrapper);
    expect(completadas(wrapper)).toEqual([
      {
        puntaje: 50,
        intentos: 1,
        precision: 1,
        detalle: { acoples_correctos: 2, errores: 0, errores_por_molecula: {} },
      },
    ]);
    const eventos = wrapper.emitted() as EventosEmitidos;
    expect(problemasDeEmisiones(eventos, arrastre)).toEqual([]);
    const { cuerpo } = aPeticionResultadoApi(arrastre, 1, completadas(wrapper)[0]!);
    expect(cuerpo).toMatchObject({ tipo: 'arrastre-molecular', puntaje: 50, completada: true });
  });

  it('muestra el resultado, deshabilita las piezas y pasa el foco al encabezado del resultado (R6)', async () => {
    const { wrapper } = montar(arrastre, { conDocumento: true });
    await completarMuestra(wrapper);
    await nextTick();
    const resumen = wrapper.find('[data-fase="resumen"]');
    expect(resumen.exists()).toBe(true);
    expect(resumen.find('[data-porcentaje]').text()).toBe('100 %');
    expect(resumen.find('[data-puntaje]').text()).toContain('50');
    expect(resumen.find('[data-errores]').text()).toBe('0');
    expect(resumen.text()).toContain('Muy bien');
    expect(viva(wrapper).text()).toContain('Actividad completada: 50 de 50 puntos.');
    expect(document.activeElement).toBe(resumen.find('h4').element);
    for (const p of wrapper.findAll('[data-pieza]')) expect(p.attributes('disabled')).toBeDefined();
    for (const r of wrapper.findAll('[data-receptor]')) {
      expect(r.attributes('disabled')).toBeDefined();
    }
  });

  it('tocar de nuevo la molécula elegida quita la elección, y hay un botón para quitarla', async () => {
    const { wrapper } = montar();
    await elegir(wrapper, 1);
    expect(wrapper.find('[data-quitar-seleccion]').exists()).toBe(true);
    await elegir(wrapper, 1);
    expect(pieza(wrapper, 1).attributes('aria-pressed')).toBe('false');
    expect(viva(wrapper).text()).toContain('Quitaste la elección de PTH');
    await elegir(wrapper, 2);
    await wrapper.find('[data-quitar-seleccion]').trigger('click');
    expect(wrapper.find('[data-quitar-seleccion]').exists()).toBe(false);
    expect(pieza(wrapper, 2).attributes('aria-pressed')).toBe('false');
  });

  it('elegir otra molécula cambia la elección; tocar un receptor sin elegir solo lo describe', async () => {
    const { wrapper } = montar();
    await receptor(wrapper, 0).trigger('click');
    expect(viva(wrapper).text()).toContain('Receptor RANK. Elige primero una molécula');
    expect(viva(wrapper).text()).toContain('preosteoclasto');
    expect(interacciones(wrapper)).toEqual([]);
    await elegir(wrapper, 0);
    await elegir(wrapper, 1);
    expect(pieza(wrapper, 0).attributes('aria-pressed')).toBe('false');
    expect(pieza(wrapper, 1).attributes('aria-pressed')).toBe('true');
  });
});

/* -------------------------------------------------------------------------------------------
 * 4. Errores, distractores, precisión y penalización
 * ----------------------------------------------------------------------------------------- */

describe('ActividadArrastreMolecular: errores y distractores', () => {
  it('un distractor sobre cualquier receptor es fallo y muestra su rechazo', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 2, 0);
    expect(interacciones(wrapper).at(-1)).toEqual({
      accion: 'acopla_molecula',
      objeto: 'mol_opg',
      resultado: 'incorrecta',
    });
    expect(viva(wrapper).attributes('data-tipo')).toBe('error');
    expect(viva(wrapper).text()).toContain('OPG no encaja en RANK.');
    expect(viva(wrapper).text()).toContain(
      'La OPG no se une a esa membrana: captura al RANKL antes de que llegue a su receptor.',
    );
    expect(texto(wrapper)).toContain('Acoplados: 0 de 2');
    expect(pieza(wrapper, 2).attributes('data-estado')).toBe('libre');
    await acoplarPorToque(wrapper, 2, 1);
    expect(viva(wrapper).text()).toContain('OPG no encaja en PTH1R.');
    expect(completadas(wrapper)).toHaveLength(0);
  });

  it('cada distractor muestra SU rechazo, no el de otro', async () => {
    const { wrapper } = montar(conConfig(configCompetencia()));
    await acoplarPorToque(wrapper, 3, 0);
    expect(viva(wrapper).text()).toContain('Ruido no encaja en ningún receptor de esta escena.');
    await acoplarPorToque(wrapper, 4, 1);
    expect(viva(wrapper).text()).toContain('Ajeno pertenece a otra vía y aquí no se une.');
    expect(viva(wrapper).text()).not.toContain('Ruido no encaja');
  });

  it('una molécula sobre un receptor que no es el suyo es fallo, con texto que no revela la respuesta', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 1, 0); // PTH sobre RANK
    expect(viva(wrapper).attributes('data-tipo')).toBe('error');
    expect(viva(wrapper).text()).toContain('PTH no se une a RANK.');
    expect(viva(wrapper).text()).not.toContain('PTH1R');
    expect(interacciones(wrapper).at(-1)?.resultado).toBe('incorrecta');
  });

  it('tras un error el foco se queda donde estaba (R6)', async () => {
    const { wrapper } = montar(arrastre, { conDocumento: true });
    await elegir(wrapper, 2);
    const destino = receptor(wrapper, 1).element as HTMLElement;
    destino.focus();
    await receptor(wrapper, 1).trigger('click');
    expect(document.activeElement).toBe(destino);
  });

  it('precisión, puntaje y errores por molécula al terminar con fallos', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 2, 0); // OPG: fallo
    await acoplarPorToque(wrapper, 1, 0); // PTH en RANK: fallo
    await completarMuestra(wrapper);
    const [r] = completadas(wrapper);
    expect(r!.precision).toBeCloseTo(2 / 4, 10);
    expect(r!.puntaje).toBe(25);
    expect(r!.puntaje).toBe(calcularPuntaje(arrastre, { precision: 0.5, intentos: 1 }));
    expect(r!.detalle).toEqual({
      acoples_correctos: 2,
      errores: 2,
      errores_por_molecula: { mol_opg: 1, mol_pth: 1 },
    });
    expect(wrapper.find('[data-errores]').text()).toBe('2');
    expect(wrapper.find('[data-porcentaje]').text()).toBe('50 %');
    expect(wrapper.find('[data-retro-final]').text()).toContain('Casi.');
  });

  it('con precisión baja muestra el mensaje "incorrecta" del docente', async () => {
    const { wrapper } = montar();
    for (let i = 0; i < 5; i++) await acoplarPorToque(wrapper, 2, 0);
    await completarMuestra(wrapper);
    expect(completadas(wrapper)[0]!.precision).toBeCloseTo(2 / 7, 10);
    expect(wrapper.find('[data-retro-final]').text()).toContain('Repasa la sección de señales');
  });

  it('acoplar de nuevo en su receptor una molécula ya acoplada no es error ni acierto', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 0, 0);
    await acoplarPorToque(wrapper, 0, 0);
    expect(viva(wrapper).text()).toContain('Volviste a acoplar RANKL en RANK.');
    expect(texto(wrapper)).toContain('Acoplados: 1 de 2');
    await completarMuestra(wrapper);
    expect(completadas(wrapper)[0]!.precision).toBe(1);
  });

  it('con aprobacion_min: la banda baja avisa lo que falta y la alta lo confirma; el puntaje se emite igual', async () => {
    const conMinimo = { ...arrastre, aprobacion_min: 0.7 } as TipoActividadArrastre;
    const { wrapper: mal } = montar(conMinimo);
    await acoplarPorToque(mal, 2, 0);
    await acoplarPorToque(mal, 2, 1);
    await completarMuestra(mal);
    expect(completadas(mal)).toHaveLength(1);
    expect(mal.find('[data-aprobacion]').text()).toContain(
      'Necesitas 70 % de acierto para seguir; inténtalo de nuevo.',
    );
    const { wrapper: bien } = montar(conMinimo);
    await completarMuestra(bien);
    expect(bien.find('[data-aprobacion]').text()).toContain('Alcanzaste el mínimo de 70 %');
    const { wrapper: sin } = montar();
    await completarMuestra(sin);
    expect(sin.find('[data-aprobacion]').exists()).toBe(false);
  });
});

describe('ActividadArrastreMolecular: repetir, intentos y penalización', () => {
  it('repetir empieza el intento 2 desde cero: reinicia el estado, emite reinicia_actividad y penaliza', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 2, 0); // un fallo en el primer intento
    await completarMuestra(wrapper);
    expect(completadas(wrapper)[0]).toMatchObject({ intentos: 1, puntaje: 33 }); // 50 x 2/3
    await wrapper.find('[data-repetir]').trigger('click');
    expect(interacciones(wrapper).at(-1)).toEqual({ accion: 'reinicia_actividad' });
    expect(texto(wrapper)).toContain('Acoplados: 0 de 2');
    expect(wrapper.find('[data-fase="resumen"]').exists()).toBe(false);
    for (const p of wrapper.findAll('[data-pieza]'))
      expect(p.attributes('disabled')).toBeUndefined();
    await completarMuestra(wrapper);
    const todas = completadas(wrapper);
    expect(todas).toHaveLength(2);
    expect(todas[1]).toMatchObject({ intentos: 2, precision: 1 });
    expect(todas[1]!.puntaje).toBe(calcularPuntaje(arrastre, { precision: 1, intentos: 2 }));
    expect(todas[1]!.puntaje).toBe(43); // 50 x (1 - 0,15) = 42,5 -> 43
    expect(todas[1]!.detalle.errores).toBe(0); // los fallos del intento 1 no se arrastran
  });

  it('el foco vuelve a la bandeja al repetir', async () => {
    const { wrapper } = montar(arrastre, { conDocumento: true });
    await completarMuestra(wrapper);
    await wrapper.find('[data-repetir]').trigger('click');
    await nextTick();
    expect(document.activeElement?.textContent?.trim()).toBe('Moléculas');
  });

  it('cada ejecución completa emite exactamente una "completada"', async () => {
    const { wrapper } = montar();
    for (let i = 1; i <= 3; i++) {
      await completarMuestra(wrapper);
      expect(completadas(wrapper)).toHaveLength(i);
      expect(completadas(wrapper)[i - 1]!.intentos).toBe(i);
      await wrapper.find('[data-repetir]').trigger('click');
    }
  });

  it('con el servidor en 2 intentos, la ejecución es la 3 y se penaliza con el factor 0,7', async () => {
    const { wrapper } = montar(arrastre, {
      estadoPrevio: { servidor: { puntaje: 40, intentos: 2, completada: true } },
    });
    expect(texto(wrapper)).toContain('Ya la completaste (mejor puntaje: 40 de 50)');
    await completarMuestra(wrapper);
    expect(completadas(wrapper)[0]).toMatchObject({ intentos: 3, puntaje: 35 }); // 50 x 0,7
  });

  it('desde el intento 7 el factor toca el piso (0,4) y no baja más', async () => {
    const { wrapper } = montar(arrastre, {
      estadoPrevio: { servidor: { puntaje: 1, intentos: 500, completada: true } },
    });
    await completarMuestra(wrapper);
    const [r] = completadas(wrapper);
    expect(r!.intentos).toBe(501);
    expect(r!.puntaje).toBe(20); // 50 x 0,4
    // La API acota los intentos a 100 sin romper el cuerpo.
    expect(aPeticionResultadoApi(arrastre, 1, r!).cuerpo.intentos).toBe(100);
  });

  it('repetir solo funciona tras completar: el método expuesto no reinicia una ejecución a medias', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 0, 0);
    (wrapper.vm as unknown as { repetir: () => void }).repetir();
    await nextTick();
    expect(texto(wrapper)).toContain('Acoplados: 1 de 2');
    expect(interacciones(wrapper).some((i) => i.accion === 'reinicia_actividad')).toBe(false);
  });
});

/* -------------------------------------------------------------------------------------------
 * 5. Arrastre con Pointer Events
 * ----------------------------------------------------------------------------------------- */

describe('ActividadArrastreMolecular: arrastre con Pointer Events', () => {
  it('arrastrar sobre el receptor correcto lo acopla y emite arrastra + acopla', async () => {
    const { wrapper } = montar();
    colocarReceptores(wrapper, CENTROS);
    await arrastrar(wrapper, 0, CENTROS[0]!);
    expect(interacciones(wrapper)).toEqual([
      { accion: 'arrastra_molecula', objeto: 'mol_rankl' },
      { accion: 'acopla_molecula', objeto: 'mol_rankl', resultado: 'correcta' },
    ]);
    expect(pieza(wrapper, 0).attributes('data-estado')).toBe('acoplada');
    expect(pieza(wrapper, 0).attributes('data-arrastrando')).toBeUndefined();
  });

  it('arrastrar una molécula sobre un receptor ajeno o un distractor sobre uno cuenta como fallo con su texto', async () => {
    const { wrapper } = montar();
    colocarReceptores(wrapper, CENTROS);
    await arrastrar(wrapper, 2, CENTROS[1]!); // OPG sobre PTH1R
    expect(interacciones(wrapper).at(-1)).toMatchObject({
      objeto: 'mol_opg',
      resultado: 'incorrecta',
    });
    expect(viva(wrapper).text()).toContain('La OPG no se une a esa membrana');
    await arrastrar(wrapper, 0, CENTROS[1]!); // RANKL sobre PTH1R
    expect(viva(wrapper).text()).toContain('RANKL no se une a PTH1R.');
    expect(texto(wrapper)).toContain('Acoplados: 0 de 2');
  });

  it('soltar en el vacío devuelve la pieza a la bandeja SIN fallo ni acopla_molecula', async () => {
    const { wrapper } = montar();
    colocarReceptores(wrapper, CENTROS);
    await arrastrar(wrapper, 0, { x: 5, y: 5 });
    expect(interacciones(wrapper)).toEqual([{ accion: 'arrastra_molecula', objeto: 'mol_rankl' }]);
    expect(viva(wrapper).text()).toContain('RANKL volvió a la bandeja');
    expect(viva(wrapper).attributes('data-tipo')).toBe('ayuda');
    expect(pieza(wrapper, 0).attributes('data-estado')).toBe('libre');
    expect(pieza(wrapper, 0).attributes('data-arrastrando')).toBeUndefined();
    expect(pieza(wrapper, 0).attributes('style') ?? '').not.toContain('translate3d');
    // Y no cuenta en la precisión.
    await completarMuestra(wrapper);
    expect(completadas(wrapper)[0]!.precision).toBe(1);
  });

  it('soltar en el vacío un distractor tampoco es un error', async () => {
    const { wrapper } = montar();
    colocarReceptores(wrapper, CENTROS);
    await arrastrar(wrapper, 2, { x: 5, y: 400 });
    expect(interacciones(wrapper).every((i) => i.resultado === undefined)).toBe(true);
    await completarMuestra(wrapper);
    expect(completadas(wrapper)[0]!.detalle.errores).toBe(0);
  });

  it('el radio de captura es el del contrato: 56 px captura y más no', async () => {
    expect(RADIO_CAPTURA_MIN_PX).toBe(56);
    const { wrapper } = montar();
    colocarReceptores(wrapper, CENTROS);
    // 56 px del centro, en diagonal: captura.
    await arrastrar(wrapper, 0, { x: CENTROS[0]!.x + 39, y: CENTROS[0]!.y + 40 });
    expect(interacciones(wrapper).at(-1)).toMatchObject({
      accion: 'acopla_molecula',
      resultado: 'correcta',
    });
    // 60 px de PTH1R, lejos de RANK: no captura y no hay fallo.
    const antes = interacciones(wrapper).length;
    await arrastrar(wrapper, 1, { x: CENTROS[1]!.x, y: CENTROS[1]!.y + 60 });
    expect(interacciones(wrapper).slice(antes)).toEqual([
      { accion: 'arrastra_molecula', objeto: 'mol_pth' },
    ]);
  });

  it('con receptores solapados en el radio, gana el más cercano', async () => {
    const { wrapper } = montar();
    colocarReceptores(wrapper, [
      { x: 100, y: 200 },
      { x: 160, y: 200 }, // a 60 px: los radios de 56 px se solapan
    ]);
    await arrastrar(wrapper, 1, { x: 140, y: 200 }); // PTH: más cerca de PTH1R (20 px) que de RANK (40)
    expect(interacciones(wrapper).at(-1)).toMatchObject({
      objeto: 'mol_pth',
      resultado: 'correcta',
    });
  });

  it('mientras se arrastra marca el receptor candidato y mueve la pieza; al soltar todo vuelve a su sitio', async () => {
    const { wrapper } = montar();
    colocarReceptores(wrapper, CENTROS);
    await arrastrar(wrapper, 0, { x: 110, y: 205 }, { soltar: false });
    expect(pieza(wrapper, 0).attributes('data-arrastrando')).toBe('true');
    expect(pieza(wrapper, 0).attributes('style')).toContain('translate3d(90px, 185px, 0)');
    expect(receptor(wrapper, 0).attributes('data-objetivo')).toBe('true');
    expect(receptor(wrapper, 1).attributes('data-objetivo')).toBeUndefined();
    window.dispatchEvent(evento('pointermove', 5, 5));
    await nextTick();
    expect(receptor(wrapper, 0).attributes('data-objetivo')).toBeUndefined();
    window.dispatchEvent(evento('pointerup', 5, 5));
    await nextTick();
    expect(pieza(wrapper, 0).attributes('data-arrastrando')).toBeUndefined();
  });

  it('un toque que se mueve menos de 6 px no es arrastre: sigue siendo un clic que elige la molécula', async () => {
    const { wrapper } = montar();
    colocarReceptores(wrapper, CENTROS);
    pieza(wrapper, 0).element.dispatchEvent(evento('pointerdown', 20, 20));
    window.dispatchEvent(evento('pointermove', 23, 22));
    window.dispatchEvent(evento('pointerup', 23, 22));
    await nextTick();
    expect(interacciones(wrapper)).toEqual([]);
    await pieza(wrapper, 0).trigger('click');
    expect(pieza(wrapper, 0).attributes('aria-pressed')).toBe('true');
  });

  it('tras un arrastre real se ignora el clic fantasma que dispara el navegador', async () => {
    const { wrapper } = montar();
    colocarReceptores(wrapper, CENTROS);
    await arrastrar(wrapper, 2, { x: 5, y: 5 }, { esperar: false });
    await pieza(wrapper, 2).trigger('click');
    expect(pieza(wrapper, 2).attributes('aria-pressed')).toBe('false');
    expect(interacciones(wrapper)).toHaveLength(1);
    // Pasada la ventana, un clic auténtico vuelve a elegir la pieza.
    desfaseReloj += 500;
    await pieza(wrapper, 2).trigger('click');
    expect(pieza(wrapper, 2).attributes('aria-pressed')).toBe('true');
  });

  it('pointercancel y Escape cancelan el arrastre sin soltar la pieza en ningún sitio', async () => {
    const { wrapper } = montar();
    colocarReceptores(wrapper, CENTROS);
    await arrastrar(wrapper, 0, CENTROS[0]!, { soltar: false });
    window.dispatchEvent(evento('pointercancel', CENTROS[0]!.x, CENTROS[0]!.y));
    await nextTick();
    expect(pieza(wrapper, 0).attributes('data-arrastrando')).toBeUndefined();
    window.dispatchEvent(evento('pointerup', CENTROS[0]!.x, CENTROS[0]!.y));
    await arrastrar(wrapper, 0, CENTROS[0]!, { soltar: false });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(pieza(wrapper, 0).attributes('data-arrastrando')).toBeUndefined();
    window.dispatchEvent(evento('pointerup', CENTROS[0]!.x, CENTROS[0]!.y));
    await nextTick();
    expect(interacciones(wrapper).filter((i) => i.accion === 'acopla_molecula')).toEqual([]);
    expect(texto(wrapper)).toContain('Acoplados: 0 de 2');
  });

  it('ignora otros punteros, un segundo dedo y el botón derecho del ratón', async () => {
    const { wrapper } = montar();
    colocarReceptores(wrapper, CENTROS);
    pieza(wrapper, 0).element.dispatchEvent(evento('pointerdown', 20, 20, { button: 2 }));
    pieza(wrapper, 0).element.dispatchEvent(evento('pointerdown', 20, 20, { isPrimary: false }));
    window.dispatchEvent(evento('pointermove', CENTROS[0]!.x, CENTROS[0]!.y));
    window.dispatchEvent(evento('pointerup', CENTROS[0]!.x, CENTROS[0]!.y));
    await nextTick();
    expect(interacciones(wrapper)).toEqual([]);
    // Un puntero distinto al que presionó no mueve ni suelta.
    pieza(wrapper, 0).element.dispatchEvent(evento('pointerdown', 20, 20));
    window.dispatchEvent(evento('pointermove', CENTROS[0]!.x, CENTROS[0]!.y, { pointerId: 9 }));
    window.dispatchEvent(evento('pointerup', CENTROS[0]!.x, CENTROS[0]!.y, { pointerId: 9 }));
    await nextTick();
    expect(interacciones(wrapper)).toEqual([]);
    window.dispatchEvent(evento('pointerup', 0, 0));
  });

  it('no se puede arrastrar después de completar ni en modo revisar', async () => {
    const { wrapper } = montar();
    colocarReceptores(wrapper, CENTROS);
    await completarMuestra(wrapper);
    const antes = interacciones(wrapper).length;
    pieza(wrapper, 2).element.dispatchEvent(evento('pointerdown', 20, 20));
    window.dispatchEvent(evento('pointermove', CENTROS[0]!.x, CENTROS[0]!.y));
    window.dispatchEvent(evento('pointerup', CENTROS[0]!.x, CENTROS[0]!.y));
    await nextTick();
    expect(interacciones(wrapper)).toHaveLength(antes);
    expect(completadas(wrapper)).toHaveLength(1);
    const { wrapper: r } = montar(arrastre, { modo: 'revisar' });
    expect(r.findAll('[data-pieza]')).toHaveLength(0);
  });

  it('un arrastre completo por Pointer Events lleva la actividad de principio a fin', async () => {
    const { wrapper } = montar();
    colocarReceptores(wrapper, CENTROS);
    await arrastrar(wrapper, 2, CENTROS[0]!); // distractor: fallo
    await arrastrar(wrapper, 0, CENTROS[0]!);
    await arrastrar(wrapper, 1, CENTROS[1]!);
    await flushPromises();
    expect(completadas(wrapper)).toHaveLength(1);
    expect(completadas(wrapper)[0]!.precision).toBeCloseTo(2 / 3, 10);
  });
});

/* -------------------------------------------------------------------------------------------
 * 6. Competencia: varias moléculas en un receptor
 * ----------------------------------------------------------------------------------------- */

describe('ActividadArrastreMolecular: un receptor acepta varias moléculas', () => {
  const actividad = () => conConfig(configCompetencia());

  it('muestra el efecto de la ÚLTIMA molécula acoplada y avisa de las otras', async () => {
    const { wrapper } = montar(actividad());
    await acoplarPorToque(wrapper, 0, 0); // Wnt en LRP5/6
    expect(receptor(wrapper, 0).attributes('data-efecto')).toBe('activacion');
    await acoplarPorToque(wrapper, 1, 0); // SOST en LRP5/6
    expect(receptor(wrapper, 0).attributes('data-efecto')).toBe('inhibicion');
    const tarjetas = wrapper.findAll('[data-tarjeta-efecto]');
    expect(tarjetas).toHaveLength(1);
    expect(tarjetas[0]!.text()).toContain('SOST frena la vía');
    expect(tarjetas[0]!.text()).toContain('También se acoplaron en este receptor: Wnt');
    expect(receptor(wrapper, 0).text()).toContain('Acoplado: Wnt, SOST');
    // Volver a soltar Wnt devuelve el efecto a Wnt.
    await acoplarPorToque(wrapper, 0, 0);
    expect(receptor(wrapper, 0).attributes('data-efecto')).toBe('activacion');
  });

  it('cada par cuenta una sola vez y el orden de las sueltas no cambia el resultado', async () => {
    const ordenes: [number, number][][] = [
      [
        [0, 0],
        [1, 0],
        [2, 1],
      ],
      [
        [2, 1],
        [1, 0],
        [0, 0],
      ],
      [
        [1, 0],
        [0, 0],
        [0, 0],
        [2, 1],
      ],
    ];
    for (const orden of ordenes) {
      const { wrapper } = montar(actividad());
      for (const [m, r] of orden) await acoplarPorToque(wrapper, m, r);
      await flushPromises();
      expect(completadas(wrapper), JSON.stringify(orden)).toHaveLength(1);
      expect(completadas(wrapper)[0]).toMatchObject({
        precision: 1,
        puntaje: 50,
        detalle: { acoples_correctos: 3, errores: 0 },
      });
    }
  });

  it('no se completa mientras falte algún par aunque el receptor ya tenga efecto', async () => {
    const { wrapper } = montar(actividad());
    await acoplarPorToque(wrapper, 0, 0);
    await acoplarPorToque(wrapper, 2, 1);
    expect(completadas(wrapper)).toHaveLength(0);
    expect(texto(wrapper)).toContain('Acoplados: 2 de 3');
    await acoplarPorToque(wrapper, 1, 0);
    expect(completadas(wrapper)).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------------------------
 * 7. Teclado y lector de pantalla (R1)
 * ----------------------------------------------------------------------------------------- */

describe('ActividadArrastreMolecular: teclado y lector de pantalla', () => {
  it('las flechas, Inicio y Fin mueven el foco entre las moléculas', async () => {
    const { wrapper } = montar(arrastre, { conDocumento: true });
    const piezas = wrapper.findAll('[data-pieza]');
    const el = (i: number) => piezas[i]!.element as HTMLElement;
    el(0).focus();
    await piezas[0]!.trigger('keydown', { key: 'ArrowRight' });
    expect(document.activeElement).toBe(el(1));
    await piezas[1]!.trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(el(2));
    await piezas[2]!.trigger('keydown', { key: 'ArrowRight' });
    expect(document.activeElement).toBe(el(2)); // no da la vuelta
    await piezas[2]!.trigger('keydown', { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(el(1));
    await piezas[1]!.trigger('keydown', { key: 'Home' });
    expect(document.activeElement).toBe(el(0));
    await piezas[0]!.trigger('keydown', { key: 'End' });
    expect(document.activeElement).toBe(el(2));
    await piezas[2]!.trigger('keydown', { key: 'ArrowUp' });
    expect(document.activeElement).toBe(el(1));
  });

  it('las flechas también recorren los receptores', async () => {
    const { wrapper } = montar(arrastre, { conDocumento: true });
    const receptores = wrapper.findAll('[data-receptor]');
    (receptores[0]!.element as HTMLElement).focus();
    await receptores[0]!.trigger('keydown', { key: 'ArrowRight' });
    expect(document.activeElement).toBe(receptores[1]!.element);
    await receptores[1]!.trigger('keydown', { key: 'Home' });
    expect(document.activeElement).toBe(receptores[0]!.element);
  });

  it('elegir con teclado (clic sin puntero) mueve el foco al primer receptor y anuncia qué hacer', async () => {
    const { wrapper } = montar(arrastre, { conDocumento: true });
    await pieza(wrapper, 1).trigger('click', { detail: 0 });
    await nextTick();
    expect(document.activeElement).toBe(receptor(wrapper, 0).element);
    expect(viva(wrapper).text()).toContain(
      'Elegiste PTH. Ahora elige el receptor donde se acopla.',
    );
  });

  it('con un toque de puntero (detail 1) el foco no se roba', async () => {
    const { wrapper } = montar(arrastre, { conDocumento: true });
    (pieza(wrapper, 1).element as HTMLElement).focus();
    await pieza(wrapper, 1).trigger('click', { detail: 1 });
    await nextTick();
    expect(document.activeElement).toBe(pieza(wrapper, 1).element);
  });

  it('el flujo completo se puede hacer solo con teclado y sin ningún evento de puntero', async () => {
    const { wrapper } = montar(arrastre, { conDocumento: true });
    const punteros = vi.fn();
    wrapper.element.addEventListener('pointerdown', punteros);
    for (const [m, r] of [
      [0, 0],
      [1, 1],
    ] as const) {
      await pieza(wrapper, m).trigger('click', { detail: 0 });
      await nextTick();
      await receptor(wrapper, r).trigger('click', { detail: 0 });
    }
    await flushPromises();
    expect(completadas(wrapper)).toHaveLength(1);
    expect(punteros).not.toHaveBeenCalled();
  });

  it('anuncia en la región aria-live el resultado: acierto con el efecto, error con el rechazo', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 2, 0);
    const region = viva(wrapper);
    expect(region.attributes('aria-live')).toBe('polite');
    expect(region.attributes('role')).toBe('status');
    expect(region.text()).toContain('OPG no encaja en RANK.');
    await acoplarPorToque(wrapper, 0, 0);
    expect(region.text()).toContain('¡Acoplada! RANKL se une a RANK.');
    expect(region.text()).toContain('Al unirse RANKL a RANK, el precursor se diferencia');
    // Es una sola región, y los iconos del mensaje son decorativos.
    expect(wrapper.findAll('[aria-live]')).toHaveLength(1);
    for (const svg of region.findAll('svg')) expect(svg.attributes('aria-hidden')).toBe('true');
  });

  it('el mismo mensaje repetido se vuelve a anunciar (el contenido se vuelve a montar)', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 2, 0);
    const primero = viva(wrapper).find('p').element;
    await acoplarPorToque(wrapper, 2, 0);
    expect(viva(wrapper).find('p').element).not.toBe(primero);
  });

  it('Escape quita la elección y lo anuncia', async () => {
    const { wrapper } = montar();
    await elegir(wrapper, 0);
    await wrapper.find('section').trigger('keydown', { key: 'Escape' });
    expect(pieza(wrapper, 0).attributes('aria-pressed')).toBe('false');
    expect(viva(wrapper).text()).toContain('Quitaste la elección de RANKL');
  });

  it('el nombre accesible del receptor dice qué molécula se acoplaría aquí y cuál ya está acoplada', async () => {
    const { wrapper } = montar();
    expect(receptor(wrapper, 0).text()).toContain('Sin acoplar');
    await elegir(wrapper, 0);
    expect(receptor(wrapper, 1).text()).toContain('Acoplar RANKL aquí');
    await receptor(wrapper, 0).trigger('click');
    expect(receptor(wrapper, 0).text()).toContain('Acoplado: RANKL');
    expect(receptor(wrapper, 0).text()).toContain('Efecto: transformación');
  });
});

/* -------------------------------------------------------------------------------------------
 * 8. Efecto biológico y movimiento reducido (R3)
 * ----------------------------------------------------------------------------------------- */

const TODAS_LAS_ANIMACIONES: AnimacionEfecto[] = [
  'activacion',
  'inhibicion',
  'cascada',
  'union',
  'crecimiento',
  'transformacion',
  'liberacion',
  'mineralizacion',
  'reabsorcion',
];

describe('ActividadArrastreMolecular: animación del efecto y movimiento reducido', () => {
  it.each(TODAS_LAS_ANIMACIONES)(
    'el efecto "%s" se anima sobre el receptor y se retira al terminar',
    async (tipo) => {
      simularMovimientoReducido(false);
      const { wrapper } = montar(variante((c) => void (c.pares[0]!.efecto.animacion = tipo)));
      expect(wrapper.attributes('data-movimiento')).toBe('normal');
      await acoplarPorToque(wrapper, 0, 0);
      const fx = receptor(wrapper, 0).find('[data-fx]');
      expect(fx.exists()).toBe(true);
      expect(fx.attributes('data-fx')).toBe(tipo);
      expect(fx.attributes('aria-hidden')).toBe('true');
      const particulas = fx.findAll('.p');
      expect(particulas.length).toBeGreaterThan(0);
      for (const p of particulas) await p.trigger('animationend');
      expect(receptor(wrapper, 0).find('[data-fx]').exists()).toBe(false);
      // El estado final (insignia, texto) sigue ahí cuando termina el movimiento.
      expect(receptor(wrapper, 0).find('[data-insignia]').exists()).toBe(true);
      expect(receptor(wrapper, 0).attributes('data-efecto')).toBe(tipo);
    },
  );

  it('con prefers-reduced-motion el efecto aparece SIN movimiento: sin partículas, con insignia y texto', async () => {
    simularMovimientoReducido(true);
    const { wrapper } = montar();
    expect(wrapper.attributes('data-movimiento')).toBe('reducido');
    await acoplarPorToque(wrapper, 0, 0);
    expect(wrapper.find('[data-fx]').exists()).toBe(false);
    expect(receptor(wrapper, 0).find('[data-insignia]').exists()).toBe(true);
    expect(receptor(wrapper, 0).attributes('data-efecto')).toBe('transformacion');
    const tarjeta = wrapper.find('[data-tarjeta-efecto]');
    expect(tarjeta.text()).toContain('El preosteoclasto madura');
    expect(tarjeta.text()).toContain('Al unirse RANKL a RANK');
    expect(viva(wrapper).text()).toContain('El preosteoclasto madura');
    // Y el resto de la actividad funciona igual.
    await acoplarPorToque(wrapper, 1, 1);
    expect(completadas(wrapper)).toHaveLength(1);
    expect(wrapper.find('[data-fx]').exists()).toBe(false);
  });

  it('un acople equivocado no dispara ninguna animación de efecto', async () => {
    simularMovimientoReducido(false);
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 2, 0);
    expect(wrapper.find('[data-fx]').exists()).toBe(false);
    expect(wrapper.find('[data-insignia]').exists()).toBe(false);
  });

  it('el titulo y la descripcion del efecto se muestran siempre, no dependen de la animación', async () => {
    for (const reducido of [true, false]) {
      simularMovimientoReducido(reducido);
      const { wrapper } = montar();
      await acoplarPorToque(wrapper, 1, 1);
      expect(wrapper.find('[data-efectos]').text()).toContain('El osteoblasto libera RANKL');
      expect(wrapper.find('[data-efectos]').text()).toContain('La PTH estimula al osteoblasto');
      wrapper.unmount();
    }
  });

  it('el oyente de la preferencia de movimiento se retira al desmontar (sin fugas)', () => {
    const { anadidos, quitados } = simularMovimientoReducido(true);
    const { wrapper } = montar();
    expect(anadidos).toHaveBeenCalled();
    wrapper.unmount();
    expect(quitados.mock.calls.length).toBeGreaterThanOrEqual(anadidos.mock.calls.length);
  });

  it('si la preferencia cambia con la actividad ya en pantalla, la etiqueta de movimiento se actualiza', async () => {
    let oyente: ((e: { matches: boolean }) => void) | undefined;
    const consulta = { matches: false } as { matches: boolean };
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          get matches() {
            return consulta.matches;
          },
          media: '',
          addEventListener: (_t: string, f: (e: { matches: boolean }) => void) => (oyente = f),
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    );
    const { wrapper } = montar();
    expect(wrapper.attributes('data-movimiento')).toBe('normal');
    consulta.matches = true;
    oyente?.({ matches: true });
    await nextTick();
    expect(wrapper.attributes('data-movimiento')).toBe('reducido');
  });
});

/* -------------------------------------------------------------------------------------------
 * 9. Estado previo
 * ----------------------------------------------------------------------------------------- */

describe('ActividadArrastreMolecular: estado previo', () => {
  const previo = (instantanea: Record<string, unknown>, intentos = 1) => ({
    progreso: { avance: 0.5, intentos, instantanea: instantanea as never },
  });

  it('restaura el avance a medias, los fallos y el intento en curso', async () => {
    const { wrapper } = montar(arrastre, {
      estadoPrevio: previo({ semilla: 7, acoplados: [0], fallos: 1, errores: { '2': 1 } }, 2),
    });
    expect(texto(wrapper)).toContain('Acoplados: 1 de 2');
    expect(pieza(wrapper, 0).attributes('data-estado')).toBe('acoplada');
    expect(receptor(wrapper, 0).attributes('data-ocupado')).toBe('true');
    await acoplarPorToque(wrapper, 1, 1);
    const [r] = completadas(wrapper);
    expect(r).toMatchObject({ intentos: 2, precision: 2 / 3 });
    expect(r!.detalle.errores_por_molecula).toEqual({ mol_opg: 1 });
    expect(r!.puntaje).toBe(calcularPuntaje(arrastre, { precision: 2 / 3, intentos: 2 }));
  });

  it('no emite progreso ni interacciones al restaurar', async () => {
    const { wrapper, progresos } = montar(arrastre, {
      estadoPrevio: previo({ acoplados: [1], semilla: 3 }),
    });
    await flushPromises();
    expect(progresos).toHaveLength(0);
    expect(wrapper.emitted('interaccion')).toBeUndefined();
  });

  it('la semilla guardada fija el orden de las moléculas al recargar', () => {
    const orden = (semilla: number) =>
      montar(arrastre, { estadoPrevio: previo({ semilla, acoplados: [], fallos: 1 }) })
        .wrapper.findAll('[data-pieza]')
        .map((p) => p.attributes('data-indice'));
    const semillas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const semilla of semillas) {
      expect(orden(semilla), `semilla ${semilla}`).toEqual(ordenBarajado(3, semilla).map(String));
    }
    // Y la semilla sí cambia el orden (no es siempre el mismo).
    expect(new Set(semillas.map((s) => orden(s).join())).size).toBeGreaterThan(1);
  });

  it('una instantánea de un intento que el servidor ya cerró se ignora', async () => {
    const { wrapper } = montar(arrastre, {
      estadoPrevio: {
        servidor: { puntaje: 10, intentos: 3, completada: true },
        progreso: { avance: 0.5, intentos: 2, instantanea: { acoplados: [0], semilla: 1 } },
      },
    });
    expect(texto(wrapper)).toContain('Acoplados: 0 de 2');
    await completarMuestra(wrapper);
    expect(completadas(wrapper)[0]!.intentos).toBe(4);
  });

  it('una instantánea de un intento ya terminado (todos los pares) no se restaura', () => {
    const { wrapper } = montar(arrastre, {
      estadoPrevio: previo({ acoplados: [0, 1], semilla: 1 }),
    });
    expect(texto(wrapper)).toContain('Acoplados: 0 de 2');
    expect(wrapper.find('[data-fase="resumen"]').exists()).toBe(false);
  });

  it('una instantánea corrupta se ignora y la actividad funciona', async () => {
    for (const basura of [
      { acoplados: 'todos', fallos: {}, errores: [1], semilla: 'x' },
      { acoplados: [99, -1, 0.5], errores: { '9999': 4 } },
      {},
    ]) {
      const { wrapper } = montar(arrastre, { estadoPrevio: previo(basura) });
      expect(texto(wrapper)).toContain('Acoplados: 0 de 2');
      await completarMuestra(wrapper);
      expect(completadas(wrapper)[0]!.precision).toBe(1);
      wrapper.unmount();
    }
  });

  it('valores hostiles en el estado previo no rompen los intentos', async () => {
    for (const intentos of [NaN, -5, 0, 1e12, Infinity]) {
      const { wrapper } = montar(arrastre, {
        estadoPrevio: {
          servidor: { puntaje: 0, intentos, completada: false },
          progreso: { avance: 0, intentos, instantanea: {} },
        },
      });
      await completarMuestra(wrapper);
      const [r] = completadas(wrapper);
      expect(r!.intentos, String(intentos)).toBeGreaterThanOrEqual(1);
      expect(problemasDeEmisiones(wrapper.emitted() as EventosEmitidos, arrastre)).toEqual([]);
      wrapper.unmount();
    }
  });

  it('un estado del servidor que llega tarde reemplaza lo restaurado si nadie ha interactuado', async () => {
    const { wrapper } = montar();
    await wrapper.setProps({
      estadoPrevio: {
        servidor: { puntaje: 10, intentos: 4, completada: true },
        progreso: { avance: 0.5, intentos: 5, instantanea: { acoplados: [1], semilla: 2 } },
      },
    } as never);
    expect(texto(wrapper)).toContain('Acoplados: 1 de 2');
    await acoplarPorToque(wrapper, 0, 0);
    expect(completadas(wrapper)[0]!.intentos).toBe(5);
  });

  it('un estado tardío no borra lo que el estudiante ya hizo', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 0, 0);
    await wrapper.setProps({
      estadoPrevio: { servidor: { puntaje: 10, intentos: 2, completada: true } },
    } as never);
    expect(texto(wrapper)).toContain('Acoplados: 1 de 2');
    await acoplarPorToque(wrapper, 1, 1);
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it('un estado tardío después de completar no reinicia el resultado', async () => {
    const { wrapper } = montar();
    await completarMuestra(wrapper);
    await wrapper.setProps({
      estadoPrevio: { servidor: { puntaje: 10, intentos: 2, completada: true } },
    } as never);
    expect(wrapper.find('[data-fase="resumen"]').exists()).toBe(true);
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it('otra actividad en la misma instancia empieza de cero', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 0, 0);
    await wrapper.setProps({ actividad: conConfig(configCompetencia()) } as never);
    expect(texto(wrapper)).toContain('Acoplados: 0 de 3');
    expect(wrapper.findAll('[data-pieza]')).toHaveLength(5);
    expect(wrapper.find('[data-efectos]').exists()).toBe(false);
  });
});

/* -------------------------------------------------------------------------------------------
 * 10. Progreso: orden y limitador
 * ----------------------------------------------------------------------------------------- */

describe('ActividadArrastreMolecular: progreso', () => {
  it('emite progreso en la primera interacción con avance, intento e instantánea válidos', async () => {
    const { wrapper, progresos } = montar();
    await acoplarPorToque(wrapper, 0, 0);
    expect(progresos).toHaveLength(1);
    expect(progresos[0]).toMatchObject({ avance: 0.5, intentos: 1 });
    expect(progresos[0]!.instantanea).toMatchObject({ acoplados: [0], fallos: 0 });
    expect(new TextEncoder().encode(JSON.stringify(progresos[0]!.instantanea)).length).toBeLessThan(
      INSTANTANEA_MAX_BYTES,
    );
    expect(problemasDeEmisiones(wrapper.emitted() as EventosEmitidos, arrastre)).toEqual([]);
  });

  it('un fallo también se guarda, para no perderlo al recargar', async () => {
    const { wrapper, progresos } = montar();
    await acoplarPorToque(wrapper, 2, 0);
    expect(progresos.at(-1)!.instantanea).toMatchObject({
      acoplados: [],
      fallos: 1,
      errores: { 2: 1 },
    });
    expect(progresos.at(-1)!.avance).toBe(0);
    expect(wrapper.emitted('progreso')).toHaveLength(1);
  });

  it('ida y vuelta: lo que emite progreso se restaura exactamente al remontar', async () => {
    const { wrapper, progresos } = montar();
    await acoplarPorToque(wrapper, 2, 1);
    await acoplarPorToque(wrapper, 0, 0);
    wrapper.unmount(); // vaciar() emite lo pendiente
    const ultimo = progresos.at(-1)!;
    const { wrapper: otro } = montar(arrastre, { estadoPrevio: { progreso: ultimo } });
    expect(texto(otro)).toContain('Acoplados: 1 de 2');
    await acoplarPorToque(otro, 1, 1);
    expect(completadas(otro)[0]!.precision).toBeCloseTo(2 / 3, 10);
    expect(completadas(otro)[0]!.detalle.errores_por_molecula).toEqual({ mol_opg: 1 });
  });

  it('agrupa las emisiones dentro del intervalo de 300 ms y no las pierde', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { wrapper, progresos } = montar();
    await acoplarPorToque(wrapper, 2, 0);
    await acoplarPorToque(wrapper, 2, 1);
    await acoplarPorToque(wrapper, 1, 0);
    expect(progresos).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(PROGRESO_INTERVALO_MIN_MS + 1);
    expect(progresos).toHaveLength(2);
    expect(progresos[1]!.instantanea).toMatchObject({ fallos: 3 });
  });

  it('JAMÁS emite progreso después de completada: ni pendiente, ni con el tiempo, ni al desmontar', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { wrapper, progresos, eventos } = montar();
    await acoplarPorToque(wrapper, 2, 0); // emite y abre el intervalo
    await acoplarPorToque(wrapper, 0, 0); // queda pendiente
    await acoplarPorToque(wrapper, 1, 1); // completa: cancela el pendiente
    expect(completadas(wrapper)).toHaveLength(1);
    const antes = progresos.length;
    await vi.advanceTimersByTimeAsync(PROGRESO_INTERVALO_MIN_MS * 5);
    expect(progresos).toHaveLength(antes);
    expect(vi.getTimerCount()).toBe(0);
    // Interacciones espurias tras completar tampoco.
    for (const b of wrapper.findAll('button')) await b.trigger('click');
    await vi.advanceTimersByTimeAsync(PROGRESO_INTERVALO_MIN_MS * 5);
    expect(progresos).toHaveLength(antes);
    wrapper.unmount();
    expect(progresos).toHaveLength(antes);
    // En el orden real, ningún "progreso" viene después de "completada".
    const c = eventos.indexOf('completada');
    expect(c).toBeGreaterThan(-1);
    expect(eventos.slice(c + 1)).not.toContain('progreso');
    expect(eventos.filter((n) => n === 'completada')).toHaveLength(1);
  });

  it('el emisor se reabre al repetir: el progreso del intento 2 vuelve a emitirse con intentos = 2', async () => {
    const { wrapper, progresos } = montar();
    await completarMuestra(wrapper);
    const antes = progresos.length;
    await wrapper.find('[data-repetir]').trigger('click');
    await acoplarPorToque(wrapper, 0, 0);
    expect(progresos.length).toBeGreaterThan(antes);
    expect(progresos.at(-1)).toMatchObject({ intentos: 2, avance: 0.5 });
  });

  it('desmontar a medias emite el último progreso pendiente y no deja temporizadores', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { wrapper, progresos } = montar();
    await acoplarPorToque(wrapper, 2, 0);
    await acoplarPorToque(wrapper, 0, 0);
    expect(progresos).toHaveLength(1);
    wrapper.unmount();
    expect(progresos).toHaveLength(2);
    expect(progresos[1]!.instantanea).toMatchObject({ acoplados: [0] });
    expect(vi.getTimerCount()).toBe(0);
  });
});

/* -------------------------------------------------------------------------------------------
 * 11. Modo revisar
 * ----------------------------------------------------------------------------------------- */

describe('ActividadArrastreMolecular: modo revisar', () => {
  it('muestra cada par con su efecto y cada distractor con su rechazo, sin piezas ni receptores activos', () => {
    const { wrapper } = montar(arrastre, { modo: 'revisar' });
    expect(wrapper.attributes('data-modo')).toBe('revisar');
    expect(wrapper.findAll('[data-tarjeta-efecto]')).toHaveLength(2);
    expect(texto(wrapper)).toContain('El preosteoclasto madura');
    expect(texto(wrapper)).toContain('El osteoblasto libera RANKL');
    expect(texto(wrapper)).toContain('Moléculas que no encajan');
    expect(texto(wrapper)).toContain('La OPG no se une a esa membrana');
    expect(wrapper.findAll('[data-pieza]')).toHaveLength(0);
    expect(wrapper.findAll('[data-receptor]')).toHaveLength(0);
    expect(wrapper.find('[data-modo-revisar]').exists()).toBe(true);
    expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe(arrastre.config.escena.alt);
    expect(wrapper.find('[aria-live]').exists()).toBe(true);
  });

  it('no emite nada, ni puntúa, aunque se toque todo', async () => {
    const { wrapper, progresos } = montar(arrastre, {
      modo: 'revisar',
      estadoPrevio: { servidor: { puntaje: 50, intentos: 1, completada: true } },
    });
    for (const b of wrapper.findAll('button')) await b.trigger('click');
    await flushPromises();
    expect(wrapper.emitted('completada')).toBeUndefined();
    expect(wrapper.emitted('interaccion')).toBeUndefined();
    expect(wrapper.emitted('progreso')).toBeUndefined();
    expect(progresos).toHaveLength(0);
    expect(wrapper.find('[data-fase="resumen"]').exists()).toBe(false);
  });

  it('nunca muestra la instantánea del estudiante', () => {
    const { wrapper } = montar(arrastre, {
      modo: 'revisar',
      estadoPrevio: {
        progreso: { avance: 0.5, intentos: 1, instantanea: { acoplados: [0], fallos: 3 } },
      },
    });
    expect(texto(wrapper)).not.toContain('Acoplados');
    expect(texto(wrapper)).not.toContain('Errores');
  });

  it('pasar de jugar a revisar con la misma instancia no rompe ni emite', async () => {
    const { wrapper } = montar();
    await acoplarPorToque(wrapper, 0, 0);
    const antes = wrapper.emitted('completada')?.length ?? 0;
    await wrapper.setProps({ modo: 'revisar' } as never);
    expect(wrapper.findAll('[data-pieza]')).toHaveLength(0);
    expect(wrapper.emitted('completada')?.length ?? 0).toBe(antes);
  });
});

/* -------------------------------------------------------------------------------------------
 * 12. Desmontaje limpio
 * ----------------------------------------------------------------------------------------- */

describe('ActividadArrastreMolecular: desmontaje sin fugas', () => {
  const TIPOS = ['pointermove', 'pointerup', 'pointercancel', 'keydown'];

  it('quita todas las escuchas globales al soltar, al cancelar y al desmontar en pleno arrastre', async () => {
    const alta = vi.spyOn(window, 'addEventListener');
    const baja = vi.spyOn(window, 'removeEventListener');
    const cuenta = (espia: typeof alta, tipo: string) =>
      espia.mock.calls.filter((c) => c[0] === tipo).length;
    const { wrapper, eventos } = montar();
    colocarReceptores(wrapper, CENTROS);
    // Sin puntero presionado no hay escuchas globales de arrastre.
    for (const t of TIPOS) expect(cuenta(alta, t), `${t} al montar`).toBe(0);
    // Un arrastre completo: las que se añaden se quitan.
    await arrastrar(wrapper, 0, CENTROS[0]!);
    for (const t of TIPOS) {
      expect(cuenta(alta, t), t).toBeGreaterThan(0);
      expect(cuenta(baja, t), t).toBe(cuenta(alta, t));
    }
    // Un arrastre interrumpido por el desmontaje.
    alta.mockClear();
    baja.mockClear();
    await arrastrar(wrapper, 1, CENTROS[1]!, { soltar: false });
    for (const t of TIPOS) expect(cuenta(alta, t)).toBe(1);
    wrapper.unmount();
    const antes = eventos.length;
    for (const t of TIPOS) expect(cuenta(baja, t), `${t} al desmontar`).toBe(1);
    window.dispatchEvent(evento('pointermove', 300, 300));
    window.dispatchEvent(evento('pointerup', CENTROS[1]!.x, CENTROS[1]!.y));
    await nextTick();
    expect(eventos).toHaveLength(antes);
  });

  it('desmontar tras completar, sin interactuar, o dos veces no lanza ni deja temporizadores', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { wrapper: a } = montar();
    await completarMuestra(a);
    expect(() => a.unmount()).not.toThrow();
    const { wrapper: b } = montar();
    expect(() => b.unmount()).not.toThrow();
    expect(() => b.unmount()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('desmontar con un efecto animándose no deja errores ni nodos', async () => {
    simularMovimientoReducido(false);
    const errores = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const avisos = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { wrapper } = montar(arrastre, { conDocumento: true });
    await acoplarPorToque(wrapper, 0, 0);
    expect(wrapper.find('[data-fx]').exists()).toBe(true);
    wrapper.unmount();
    expect(document.body.querySelector('[data-fx]')).toBeNull();
    expect(errores).not.toHaveBeenCalled();
    expect(avisos).not.toHaveBeenCalled();
  });

  it('en operación normal no hay avisos ni errores de Vue', async () => {
    const errores = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const avisos = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { wrapper } = montar(arrastre, { conDocumento: true });
    colocarReceptores(wrapper, CENTROS);
    await arrastrar(wrapper, 2, CENTROS[0]!);
    await arrastrar(wrapper, 0, CENTROS[0]!);
    await acoplarPorToque(wrapper, 1, 1);
    await wrapper.find('[data-repetir]').trigger('click');
    expect(errores).not.toHaveBeenCalled();
    expect(avisos).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------------------------
 * 13. Contenido adversarial
 * ----------------------------------------------------------------------------------------- */

describe('ActividadArrastreMolecular: contenido adversarial', () => {
  function esValida(config: unknown): void {
    const r = ConfigArrastreMolecularSchema.safeParse(config);
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues)).toBe(true);
  }

  it('el mínimo del esquema: un receptor, un par y un solo distractor', async () => {
    const config = {
      escena: { viewBox: '0 0 100 100', alt: 'Una sola escena con un receptor.' },
      moleculas: [
        { id: 'a', etiqueta: 'A', descripcion: 'Molécula A de prueba.' },
        {
          id: 'b',
          etiqueta: 'B',
          descripcion: 'Molécula B de prueba.',
          rechazo: 'B no encaja en A.',
        },
      ],
      receptores: [
        { id: 'r', etiqueta: 'R', descripcion: 'Receptor único.', posicion: { x: 10, y: 90 } },
      ],
      pares: [{ id: 'p', molecula: 'a', receptor: 'r', efecto: efecto() }],
      distractores: ['b'],
    };
    esValida(config);
    const { wrapper } = montar(conConfig(config));
    expect(wrapper.findAll('[data-pieza]')).toHaveLength(2);
    expect(receptor(wrapper, 0).attributes('data-alineacion')).toBe('inicio');
    await acoplarPorToque(wrapper, 1, 0);
    expect(viva(wrapper).text()).toContain('B no encaja en A.');
    await acoplarPorToque(wrapper, 0, 0);
    expect(completadas(wrapper)).toHaveLength(1);
    expect(completadas(wrapper)[0]!.precision).toBe(0.5);
    expect(problemasDeEmisiones(wrapper.emitted() as EventosEmitidos, arrastre)).toEqual([]);
  });

  it('una sola opción (una molécula, un receptor) se completa aunque el esquema pida al menos dos moléculas', async () => {
    const config = {
      escena: { viewBox: '0 0 800 600', alt: 'Escena de una sola opción.' },
      moleculas: [{ id: 'a', etiqueta: 'A', descripcion: 'Molécula A de prueba.' }],
      receptores: [
        { id: 'r', etiqueta: 'R', descripcion: 'Receptor único.', posicion: { x: 50, y: 50 } },
      ],
      pares: [{ id: 'p', molecula: 'a', receptor: 'r', efecto: efecto() }],
    };
    const { wrapper } = montar(conConfig(config));
    await acoplarPorToque(wrapper, 0, 0);
    expect(completadas(wrapper)).toHaveLength(1);
    expect(completadas(wrapper)[0]).toMatchObject({ precision: 1, puntaje: 50 });
  });

  it('límites de tamaño: 8 moléculas, 6 receptores, 6 pares, 2 distractores y textos máximos', async () => {
    const largo = (n: number, base: string) => base.repeat(Math.ceil(n / base.length)).slice(0, n);
    const moleculas = Array.from({ length: 8 }, (_, i) => ({
      id: `mol_${i}`,
      etiqueta: largo(40, `Molécula${i}`),
      descripcion: largo(300, `Descripción larga de la molécula ${i}. `),
      forma: (['circulo', 'hexagono', 'triangulo', 'rombo', 'cuadrado'] as const)[i % 5],
      ...(i >= 6
        ? { rechazo: largo(300, `No encaja porque la molécula ${i} es un señuelo. `) }
        : {}),
    }));
    const receptores = Array.from({ length: 6 }, (_, i) => ({
      id: `rec_${i}`,
      etiqueta: largo(40, `Receptor${i}`),
      descripcion: largo(300, `Descripción larga del receptor ${i}. `),
      posicion: { x: 15 + (i % 3) * 35, y: 25 + Math.floor(i / 3) * 50 },
    }));
    const pares = Array.from({ length: 6 }, (_, i) => ({
      id: `par_${i}`,
      molecula: `mol_${i}`,
      receptor: `rec_${i}`,
      efecto: {
        titulo: largo(80, `Título del efecto ${i} `),
        descripcion: largo(450, `Descripción larga del efecto ${i} con **negrita**. `),
        animacion: TODAS_LAS_ANIMACIONES[i]!,
        indicadores: [
          { etiqueta: largo(60, 'Indicador'), direccion: 'aumenta' },
          { etiqueta: largo(60, 'Otro'), direccion: 'disminuye' },
          { etiqueta: largo(60, 'Tercero'), direccion: 'sin_cambio' },
        ],
      },
    }));
    const config = {
      escena: { viewBox: '0 0 800 600', alt: largo(300, 'Escena enorme con muchos receptores. ') },
      moleculas,
      receptores,
      pares,
      distractores: ['mol_6', 'mol_7'],
    };
    esValida(config);
    const { wrapper, progresos } = montar(conConfig(config, { puntaje_max: 1000 }));
    expect(wrapper.findAll('[data-pieza]')).toHaveLength(8);
    expect(wrapper.findAll('[data-receptor]')).toHaveLength(6);
    expect(wrapper.html()).not.toContain('NaN');
    expect(wrapper.html()).not.toContain('Infinity');
    // Falla todo lo posible y luego acopla todo.
    for (let i = 0; i < 40; i++) await acoplarPorToque(wrapper, 6 + (i % 2), i % 6);
    for (let i = 0; i < 6; i++) await acoplarPorToque(wrapper, i, i);
    await flushPromises();
    expect(completadas(wrapper)).toHaveLength(1);
    const r = completadas(wrapper)[0]!;
    expect(r.precision).toBeCloseTo(6 / 46, 10);
    expect(r.puntaje).toBeLessThanOrEqual(1000);
    expect(
      problemasDeEmisiones(wrapper.emitted() as EventosEmitidos, {
        ...arrastre,
        puntaje_max: 1000,
      }),
    ).toEqual([]);
    for (const p of progresos) {
      expect(new TextEncoder().encode(JSON.stringify(p.instantanea)).length).toBeLessThan(
        INSTANTANEA_MAX_BYTES,
      );
    }
    expect(
      aPeticionResultadoApi({ ...arrastre, puntaje_max: 1000 }, 1, r).cuerpo.detalle?.truncado,
    ).toBeUndefined();
  });

  it('textos Unicode (tildes, emoji, escritura derecha a izquierda, combinantes) se muestran tal cual', async () => {
    const etiquetas = ['Ñandú 🦴', 'مرحبا', 'é combinada', '骨代謝'];
    const config = {
      escena: { viewBox: '0 0 800 600', alt: 'Escena con textos en varios alfabetos y símbolos.' },
      moleculas: [
        ...etiquetas.slice(0, 2).map((e, i) => ({
          id: `u_${i}`,
          etiqueta: e,
          descripcion: `Descripción con símbolos ✓ α β γ ${e}.`,
        })),
        {
          id: 'u_d',
          etiqueta: etiquetas[2]!,
          descripcion: 'Distractor con combinantes.',
          rechazo: `No encaja: ${etiquetas[3]} 🚫 no se une aquí.`,
        },
      ],
      receptores: etiquetas.slice(0, 2).map((e, i) => ({
        id: `ru_${i}`,
        etiqueta: e,
        descripcion: `Receptor con símbolos ${e} para pruebas.`,
        posicion: { x: 25 + i * 50, y: 50 },
      })),
      pares: [0, 1].map((i) => ({
        id: `pu_${i}`,
        molecula: `u_${i}`,
        receptor: `ru_${i}`,
        efecto: efecto(
          'union',
          `Efecto ${etiquetas[i]}`,
          `Se unió ${etiquetas[i]} ✓ correctamente.`,
        ),
      })),
      distractores: ['u_d'],
    };
    esValida(config);
    const { wrapper } = montar(conConfig(config));
    const visibles = wrapper.findAll('.pieza-texto').map((e) => e.text());
    for (const e of etiquetas.slice(0, 3)) expect(visibles).toContain(e);
    const i = wrapper.findAll('[data-pieza]').findIndex((p) => p.text().includes('é'));
    await acoplarPorToque(
      wrapper,
      Number(wrapper.findAll('[data-pieza]')[i]!.attributes('data-indice')),
      0,
    );
    expect(viva(wrapper).text()).toContain('骨代謝 🚫 no se une aquí.');
    await acoplarPorToque(wrapper, 0, 0);
    await acoplarPorToque(wrapper, 1, 1);
    expect(completadas(wrapper)).toHaveLength(1);
    expect(completadas(wrapper)[0]!.detalle.errores_por_molecula).toEqual({ u_d: 1 });
  });

  it('ids raros y de 64 caracteres no rompen los eventos ni el detalle (interacción <= 64 caracteres)', async () => {
    const idLargo = 'm'.repeat(64);
    const config = {
      escena: { viewBox: '0 0 800 600', alt: 'Escena con identificadores límite de longitud.' },
      moleculas: [
        { id: idLargo, etiqueta: 'Larga', descripcion: 'Molécula con un id de 64 caracteres.' },
        {
          id: 'constructor',
          etiqueta: 'Constructor',
          descripcion: 'Id que choca con el prototipo.',
        },
        {
          id: 'to_string',
          etiqueta: 'Distractor',
          descripcion: 'Distractor con id de método.',
          rechazo: 'No encaja en ningún receptor.',
        },
      ],
      receptores: [
        {
          id: 'has_own_property',
          etiqueta: 'R1',
          descripcion: 'Receptor uno de prueba.',
          posicion: { x: 25, y: 50 },
        },
        {
          id: 'r2',
          etiqueta: 'R2',
          descripcion: 'Receptor dos de prueba.',
          posicion: { x: 75, y: 50 },
        },
      ],
      pares: [
        { id: 'p1', molecula: idLargo, receptor: 'has_own_property', efecto: efecto() },
        { id: 'p2', molecula: 'constructor', receptor: 'r2', efecto: efecto() },
      ],
      distractores: ['to_string'],
    };
    esValida(config);
    const { wrapper } = montar(conConfig(config));
    await acoplarPorToque(wrapper, 2, 0);
    await acoplarPorToque(wrapper, 1, 0);
    await acoplarPorToque(wrapper, 0, 0);
    await acoplarPorToque(wrapper, 1, 1);
    expect(completadas(wrapper)).toHaveLength(1);
    expect(completadas(wrapper)[0]!.detalle.errores_por_molecula).toEqual({
      to_string: 1,
      constructor: 1,
    });
    expect(problemasDeEmisiones(wrapper.emitted() as EventosEmitidos, arrastre)).toEqual([]);
  });

  it('ids repetidos (contenido inválido) no rompen: el par se enlaza con el primero', async () => {
    const config = structuredClone(configCompetencia());
    config.moleculas[4]!.id = 'ruido'; // dos moléculas "ruido"
    const { wrapper } = montar(conConfig(config));
    expect(wrapper.findAll('[data-pieza]')).toHaveLength(5);
    await acoplarPorToque(wrapper, 4, 0);
    expect(viva(wrapper).attributes('data-tipo')).toBe('error');
    await acoplarPorToque(wrapper, 0, 0);
    await acoplarPorToque(wrapper, 1, 0);
    await acoplarPorToque(wrapper, 2, 1);
    expect(completadas(wrapper)).toHaveLength(1);
  });

  it('una molécula suelta (ni par ni distractor, contenido inválido) se trata como distractor sin romper', async () => {
    const config = structuredClone(configCompetencia());
    config.distractores = ['ruido'];
    const { wrapper } = montar(conConfig(config));
    await acoplarPorToque(wrapper, 4, 1); // "Ajeno" está suelta
    expect(viva(wrapper).attributes('data-tipo')).toBe('error');
    expect(viva(wrapper).text()).toContain('Ajeno pertenece a otra vía');
  });

  it('un distractor sin texto de rechazo muestra un mensaje genérico y no rompe', async () => {
    const config = structuredClone(configCompetencia());
    delete (config.moleculas[3] as { rechazo?: string }).rechazo;
    const { wrapper } = montar(conConfig(config));
    await acoplarPorToque(wrapper, 3, 0);
    expect(viva(wrapper).text()).toContain('no se une a ningún receptor de la escena');
  });

  it('el HTML y el JavaScript en los textos del contenido nunca se ejecutan ni se insertan como elementos', async () => {
    const config = structuredClone(configCompetencia());
    config.moleculas[0]!.etiqueta = '<img src=x onerror=alert(1)>';
    config.moleculas[0]!.descripcion =
      '<script>alert(1)</script> Descripción con [enlace](javascript:alert(1)).';
    config.moleculas[3]!.rechazo =
      '<b onclick="alert(1)">Rechazo</b> con <iframe src="https://x.test"></iframe> HTML.';
    config.receptores[0]!.etiqueta = '<svg onload=alert(1)>';
    config.pares[0]!.efecto.titulo = '<img src=y onerror=alert(2)>';
    config.pares[0]!.efecto.descripcion =
      'Efecto <style>*{display:none}</style> con [x](javascript:alert(3)) y **negrita**.';
    const { wrapper } = montar(conConfig(config), { conDocumento: true });
    await acoplarPorToque(wrapper, 3, 0);
    await acoplarPorToque(wrapper, 0, 0);
    const html = wrapper.html();
    expect(wrapper.find('img[src="x"]').exists()).toBe(false);
    expect(wrapper.find('img[src="y"]').exists()).toBe(false);
    expect(wrapper.find('script').exists()).toBe(false);
    expect(wrapper.find('iframe').exists()).toBe(false);
    expect(wrapper.find('style').exists()).toBe(false);
    expect(html).not.toMatch(/<[a-z]+[^>]*\son(error|click|load)=/i);
    for (const a of wrapper.findAll('a'))
      expect(a.attributes('href') ?? '').not.toMatch(/^\s*javascript:/i);
    expect(texto(wrapper)).toContain('<img src=x onerror=alert(1)>'); // se ve como texto
    // El Markdown permitido sí se representa.
    expect(wrapper.find('[data-tarjeta-efecto] .texto-linea strong').text()).toBe('negrita');
  });

  it('los enlaces del glosario no navegan: avisan a la página con un evento del DOM', async () => {
    const config = structuredClone(configCompetencia());
    config.pares[0]!.efecto.descripcion =
      'Wnt activa la vía [canónica](glosario:via_canonica) del receptor.';
    const { wrapper } = montar(conConfig(config), { conDocumento: true });
    await acoplarPorToque(wrapper, 0, 0);
    const enlace = wrapper.find('a[data-glosario]');
    expect(enlace.exists()).toBe(true);
    const oyente = vi.fn();
    document.addEventListener('ova:glosario', oyente);
    await enlace.trigger('click');
    document.removeEventListener('ova:glosario', oyente);
    expect(oyente).toHaveBeenCalledTimes(1);
    expect((oyente.mock.calls[0]![0] as CustomEvent).detail).toMatchObject({ id: 'via_canonica' });
  });

  it('contenido inconsistente: mensaje claro en español, sin piezas ni eventos', async () => {
    const config = structuredClone(configCompetencia());
    config.pares[0]!.receptor = 'no_existe';
    const { wrapper } = montar(conConfig(config));
    const alerta = wrapper.find('[role="alert"]');
    expect(alerta.exists()).toBe(true);
    expect(alerta.text()).toContain('No pudimos cargar esta actividad.');
    expect(alerta.text()).toContain('no existe');
    expect(alerta.text()).toContain('avísale a tu docente');
    expect(wrapper.findAll('[data-pieza]')).toHaveLength(0);
    expect(wrapper.find('[data-escena]').exists()).toBe(false);
    for (const b of wrapper.findAll('button')) await b.trigger('click');
    expect(wrapper.emitted('completada')).toBeUndefined();
    expect(wrapper.emitted('interaccion')).toBeUndefined();
    const { wrapper: r } = montar(conConfig(config), { modo: 'revisar' });
    expect(r.find('[role="alert"]').exists()).toBe(true);
  });

  it('una configuración vacía o rota no lanza al montar', () => {
    for (const config of [
      {},
      { escena: {} },
      undefined as never,
      { moleculas: 'x', receptores: 5 },
    ]) {
      const errores = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(() => {
        const { wrapper } = montar(
          conConfig(config ?? { escena: { viewBox: '0 0 8 8', alt: '' } }),
        );
        wrapper.unmount();
      }).not.toThrow();
      errores.mockRestore();
    }
  });

  it('el dibujo de fondo: estado de carga visible, y si falla se avisa en español y la actividad sigue', async () => {
    const { wrapper } = montar();
    const escena = wrapper.find('[data-escena]');
    expect(escena.attributes('aria-busy')).toBe('true');
    expect(escena.text()).toContain('Cargando el dibujo');
    const fondo = wrapper.find('img.fondo');
    expect(fondo.attributes('src')).toBe('/images/m1/membrana_celular.svg');
    expect(fondo.attributes('alt')).toBe('');
    expect(fondo.attributes('aria-hidden')).toBe('true');
    await fondo.trigger('load');
    expect(wrapper.find('[data-escena]').attributes('aria-busy')).toBeUndefined();

    const { wrapper: roto } = montar();
    await roto.find('img.fondo').trigger('error');
    expect(roto.find('img.fondo').exists()).toBe(false);
    expect(roto.find('[data-fondo-error]').text()).toContain(
      'No se pudo cargar el dibujo de fondo',
    );
    await completarMuestra(roto);
    expect(completadas(roto)).toHaveLength(1);
  });

  it('con fondo (versión realista) lo muestra en lugar del SVG', () => {
    const { wrapper } = montar(
      variante((c) => void (c.escena.fondo = '/images/m1/membrana_celular_figura.webp')),
    );
    expect(wrapper.get('img.fondo').attributes('src')).toBe(
      '/images/m1/membrana_celular_figura.webp',
    );
  });

  it('sin fondo_svg no hay imagen ni estado de carga', () => {
    const { wrapper } = montar(
      variante((c) => void delete (c.escena as { fondo_svg?: string }).fondo_svg),
    );
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('[data-escena]').attributes('aria-busy')).toBeUndefined();
  });

  it('un viewBox extremo (99999 x 10000) no produce NaN ni Infinity en la escena', () => {
    const { wrapper } = montar(variante((c) => void (c.escena.viewBox = '0 0 99999 10000')));
    expect(wrapper.html()).not.toContain('NaN');
    expect(wrapper.html()).not.toContain('Infinity');
    expect(wrapper.find('[data-escena]').attributes('style')).toContain('aspect-ratio: 9.9999');
  });

  it('un viewBox ilegible no rompe la escena (se usa 4:3)', () => {
    const { wrapper } = montar(variante((c) => void (c.escena.viewBox = 'no es un viewBox')));
    expect(wrapper.find('[data-escena]').attributes('style')).toContain('aspect-ratio: 1.3333');
    expect(wrapper.html()).not.toContain('NaN');
  });

  it('un receptor en el borde alinea su etiqueta hacia dentro para no salirse de la pantalla', () => {
    const { wrapper } = montar(
      variante((c) => {
        c.receptores[0]!.posicion = { x: 5, y: 50 };
        c.receptores[1]!.posicion = { x: 95, y: 50 };
      }),
    );
    expect(receptor(wrapper, 0).attributes('data-alineacion')).toBe('inicio');
    expect(receptor(wrapper, 1).attributes('data-alineacion')).toBe('fin');
    expect(receptor(wrapper, 0).attributes('style')).toContain('left: 5%');
    expect(receptor(wrapper, 1).attributes('style')).toContain('left: 95%');
  });

  it('la actividad con aprobacion_min y puntaje_max mínimo (1) da resultados válidos', async () => {
    const { wrapper } = montar({
      ...arrastre,
      puntaje_max: 1,
      aprobacion_min: 0.5,
    } as TipoActividadArrastre);
    await acoplarPorToque(wrapper, 2, 0);
    await completarMuestra(wrapper);
    const [r] = completadas(wrapper);
    expect(Number.isInteger(r!.puntaje)).toBe(true);
    expect(r!.puntaje).toBeGreaterThanOrEqual(0);
    expect(r!.puntaje).toBeLessThanOrEqual(1);
  });
});
