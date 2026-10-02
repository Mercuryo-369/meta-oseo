/**
 * Prueba de integración del módulo 1: monta la página de módulo (`ModuloView`) con el
 * `content.json` REAL, cargado por el registro real, y las seis actividades reales (sin ningún
 * doble de los componentes de actividad). Recorre el módulo como un estudiante:
 *
 *  (a) cada actividad monta sin errores ni avisos de Vue en la consola;
 *  (b) cada una se completa con la interacción mínima de su tipo y emite `completada` con el
 *      puntaje de `puntaje_max` (primer intento, sin errores);
 *  (c) el bloqueo por secuencia mantiene cerrada la sección siguiente hasta completar las
 *      actividades obligatorias de la actual, y entonces la abre;
 *  (d) al completar el módulo se llama a la API con los cuerpos exactos del contrato
 *      (`POST /api/activities/{id}/result` por actividad y `PUT /api/progress/1` con `completado`);
 *  (e) cada enlace de glosario del texto abre la definición de un término que existe.
 *
 * Dobles usados (solo del ENTORNO, nunca de las actividades): un `fetch` simulado que sirve los SVG
 * de `public/images/m1/` desde disco y hace de API (`simularApi`), y la escena WebGL de la
 * exploración 3D, que no puede correr en happy-dom (la actividad se completa con su lista de partes,
 * igual que en un teléfono sin WebGL).
 *
 * Todo hallazgo de esta prueba es un fallo del contenido (se corrige en `content.json`) o de un
 * componente/anfitrión (se reporta, no se arregla aquí).
 */
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { Router } from 'vue-router';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Component } from 'vue';
import ActividadArrastreMolecular from '@/activities/arrastre-molecular/ActividadArrastreMolecular.vue';
import ActividadExploracion3d from '@/activities/exploracion-3d/ActividadExploracion3d.vue';
import ActividadMulticapa from '@/activities/multicapa/ActividadMulticapa.vue';
import { construirConsignas, requeridasEfectivas } from '@/activities/multicapa/logica';
import {
  moverPaso,
  preguntaVisible,
  pulsarPrincipal,
} from '@/activities/quiz/__fixtures__/conductor';
import ActividadQuiz from '@/activities/quiz/ActividadQuiz.vue';
import ActividadRelacionColumnas from '@/activities/relacion-columnas/ActividadRelacionColumnas.vue';
import { aPeticionResultadoApi } from '@/activities/types';
import type { ResultadoActividad } from '@/activities/types';
import ActividadVideoTexto from '@/activities/video-texto/ActividadVideoTexto.vue';
import { simularApi } from '@/components/modulo/utilesPrueba';
import type { ApiSimulada } from '@/components/modulo/utilesPrueba';
import { problemasDeEmisiones } from '@/content/__fixtures__/contrato';
import type { EventosEmitidos } from '@/content/__fixtures__/contrato';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import { API_DETALLE_MAX_BYTES, PATRON_ACTIVITY_ID_API } from '@/content/constantes';
import { listarActividades } from '@/content/consultas';
import { cargarModulo } from '@/content/registry';
import { puntajeMaximoModulo } from '@/content/scoring';
import type {
  Actividad,
  ActividadArrastreMolecular as DatosArrastre,
  ActividadExploracion3d as Datos3d,
  ActividadMulticapa as DatosMulticapa,
  ActividadQuiz as DatosQuiz,
  ActividadRelacionColumnas as DatosRelacion,
  ActividadVideoTexto as DatosVideo,
  ModuloContenido,
} from '@/content/schema';
import { useAuthStore } from '@/stores/auth';
import { respuestaError, usuarioDePrueba } from '@/test/utils';
import ModuloView from '@/views/ModuloView.vue';

/* -------------------------------------------------------------------------------------------
 * Dobles del entorno
 * ----------------------------------------------------------------------------------------- */

// La escena WebGL no corre en happy-dom. Se sustituye SOLO ella (la actividad es la real).
vi.mock('@/scenes/EscenaExploracion.vue', async () => {
  const { defineComponent, h, onMounted } = await import('vue');
  return {
    __esModule: true,
    default: defineComponent({
      name: 'EscenaExploracionSinWebgl',
      props: {
        modelo: { type: String, default: undefined },
        alt: { type: String, default: undefined },
        nodos: { type: Array, default: undefined },
        visitados: { type: Array, default: undefined },
        seleccionId: { type: String, default: undefined },
        ordenEnfoque: { type: Number, default: undefined },
      },
      emits: ['seleccionar', 'estado'],
      setup(_props, { emit }) {
        onMounted(() => emit('estado', 'sin_webgl'));
        return () => h('div', { 'data-testid': 'escena-sin-webgl' });
      },
    }),
  };
});

const svgsPublicos = import.meta.glob('/public/images/m1/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Sirve un SVG de `public/` como lo haría el servidor; el resto de rutas las atiende la API simulada. */
function servirRecursos(ruta: string): Response | undefined {
  if (!ruta.startsWith('/images/')) return undefined;
  const svg = svgsPublicos[`/public${ruta.split('?')[0]}`];
  return svg === undefined
    ? respuestaError(404, 'no_encontrado')
    : new Response(svg, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
}

/* -------------------------------------------------------------------------------------------
 * Estado compartido del recorrido (las pruebas de este archivo son una secuencia)
 * ----------------------------------------------------------------------------------------- */

const TIPOS: Record<Actividad['tipo'], Component> = {
  multicapa: ActividadMulticapa,
  quiz: ActividadQuiz,
  'relacion-columnas': ActividadRelacionColumnas,
  'arrastre-molecular': ActividadArrastreMolecular,
  'video-texto': ActividadVideoTexto,
  'exploracion-3d': ActividadExploracion3d,
};

let modulo: ModuloContenido;
let api: ApiSimulada;
let router: Router;
let anfitrion: VueWrapper;
let seccionEnCurso = 'carga';
/** Todo lo que salió por `console.warn` y `console.error` durante el recorrido, con su sección. */
const avisos: string[] = [];
/** Resultado emitido por cada actividad (para comparar con el cuerpo enviado a la API). */
const resultados = new Map<string, ResultadoActividad>();

beforeEach(() => {
  // `unstubGlobals` y `restoreMocks` (vite.config.ts) limpian antes de cada prueba: se reponen.
  vi.stubGlobal('fetch', api.fetch);
  const registrar =
    (nivel: string) =>
    (...args: unknown[]) => {
      avisos.push(
        `[${seccionEnCurso}] ${nivel}: ${args
          .map((a) => String(a))
          .join(' ')
          .slice(0, 300)}`,
      );
    };
  vi.spyOn(console, 'warn').mockImplementation(registrar('warn'));
  vi.spyOn(console, 'error').mockImplementation(registrar('error'));
});

beforeAll(async () => {
  localStorage.clear();
  const cargado = await cargarModulo(1);
  if (!cargado.ok) throw new Error(`El módulo 1 no carga: ${cargado.errores.join('; ')}`);
  modulo = cargado.modulo;

  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'jwt-de-prueba';
  auth.establecerUsuario(usuarioDePrueba());

  api = simularApi({ completados: [], responder: (l) => servirRecursos(l.ruta) });
  const Vacia = { render: () => null };
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'inicio', component: Vacia },
      { path: '/modulo/:n', name: 'modulo', component: Vacia },
    ],
  });
  await router.push('/modulo/1');
  await router.isReady();

  vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
    avisos.push(`[carga] warn: ${a.map(String).join(' ').slice(0, 300)}`);
  });
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
    avisos.push(`[carga] error: ${a.map(String).join(' ').slice(0, 300)}`);
  });
  anfitrion = mount(ModuloView, {
    props: { n: 1 },
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      // Los avisos de Vue (props, plantillas...) se guardan igual que la consola.
      config: {
        warnHandler: (mensaje: string) =>
          avisos.push(`[${seccionEnCurso}] vue: ${mensaje.slice(0, 300)}`),
      },
    },
  }) as unknown as VueWrapper;
  await vi.waitFor(() =>
    expect(anfitrion.find('[data-testid="cabecera-modulo"]').exists()).toBe(true),
  );
});

afterAll(() => {
  anfitrion?.unmount();
  document.body.innerHTML = '';
});

/* -------------------------------------------------------------------------------------------
 * Ayudas
 * ----------------------------------------------------------------------------------------- */

const ordenSecciones = () => modulo.secciones.map((s) => s.id);
const estadosDeSecciones = () =>
  anfitrion
    .findAll('[data-testid="indice-secciones"] button')
    .map((b) => b.attributes('data-estado'));

async function irASeccion(id: string): Promise<void> {
  await router.push({ name: 'modulo', params: { n: 1 }, query: { s: id } });
  await flushPromises();
}

async function pausa(ms = 20): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
  await flushPromises();
}

/** Componente de actividad montado dentro de su bloque, o `undefined` si aún no está. */
function componenteDe(a: Actividad): VueWrapper | undefined {
  return anfitrion
    .findAllComponents(TIPOS[a.tipo])
    .find((c) => (c.props() as { actividad?: Actividad }).actividad?.id === a.id) as
    VueWrapper | undefined;
}

async function esperarMontaje(a: Actividad): Promise<VueWrapper> {
  await vi.waitFor(() => expect(componenteDe(a), `no se monta ${a.id}`).toBeDefined(), {
    timeout: 10_000,
  });
  return componenteDe(a)!;
}

function completadas(c: VueWrapper): ResultadoActividad[] {
  return (c.emitted('completada') ?? []).map((e) => e[0] as ResultadoActividad);
}

/* ----- Interacción mínima por tipo ----- */

/** Zona tocable de una capa en el SVG inyectado: la zona clonada o, si no, su primera forma. */
function zonaDeCapa(c: VueWrapper, id: string): Element {
  const raiz = c.get('[data-testid="multicapa-svg"]').element;
  const g = Array.from(raiz.querySelectorAll('[data-capa]')).find(
    (e) => e.getAttribute('data-capa') === id,
  );
  if (!g) throw new Error(`El dibujo inyectado no tiene la capa «${id}»`);
  const zona = g.querySelector('[data-zona-auto], [data-zona-toque]') ?? g.firstElementChild;
  if (!zona) throw new Error(`La capa «${id}» no tiene formas que tocar`);
  return zona;
}

async function completarMulticapa(c: VueWrapper, a: DatosMulticapa): Promise<void> {
  await vi.waitFor(() => expect(c.find('[data-testid="multicapa-svg"] svg').exists()).toBe(true), {
    timeout: 10_000,
  });
  const lista = c.get('[data-testid="multicapa-lista"]');
  for (const capa of a.config.capas) {
    // Cada capa del contenido está en el dibujo real y en la lista accesible.
    zonaDeCapa(c, capa.id);
    expect(
      lista.findAll('button').some((b) => b.attributes('data-capa') === capa.id),
      `${a.id}: sin botón para la capa ${capa.id}`,
    ).toBe(true);
  }
  // `identificar` pide cada capa requerida (una consigna por pista); `explorar`, las requeridas.
  const secuencia =
    a.config.modo === 'identificar'
      ? construirConsignas(a.config).map((x) => x.capa)
      : requeridasEfectivas(a.config);
  for (const id of secuencia) {
    zonaDeCapa(c, id).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    if (completadas(c).length > 0) break;
  }
}

async function completarRelacion(c: VueWrapper, a: DatosRelacion): Promise<void> {
  const item = (columna: 'a' | 'b', id: string) => {
    const encontrado = c
      .findAll(`[data-columna="${columna}"]`)
      .find((x) => x.attributes('data-id') === id);
    if (!encontrado) throw new Error(`${a.id}: no hay el elemento ${columna}:${id}`);
    return encontrado;
  };
  for (const par of a.config.pares) {
    await item('a', par.a).trigger('click');
    await item('b', par.b).trigger('click');
    await flushPromises();
  }
}

async function completarArrastre(c: VueWrapper, a: DatosArrastre): Promise<void> {
  const { moleculas, receptores, pares } = a.config;
  for (const par of pares) {
    const i = moleculas.findIndex((m) => m.id === par.molecula);
    const j = receptores.findIndex((r) => r.id === par.receptor);
    const pieza = c.find(`[data-pieza][data-indice="${i}"]`);
    const receptor = c.find(`[data-receptor][data-indice="${j}"]`);
    expect(pieza.exists(), `${a.id}: falta la pieza ${par.molecula}`).toBe(true);
    expect(receptor.exists(), `${a.id}: falta el receptor ${par.receptor}`).toBe(true);
    // La pieza y el receptor mostrados son los del par (nombre visible = etiqueta del contenido).
    expect(pieza.text()).toContain(moleculas[i]!.etiqueta);
    expect(receptor.text()).toContain(receptores[j]!.etiqueta);
    await pieza.trigger('click');
    await receptor.trigger('click');
    await flushPromises();
  }
}

async function completarVideo(c: VueWrapper, a: DatosVideo): Promise<void> {
  await vi.waitFor(() => expect(c.find('[data-testid="contador-paso"]').exists()).toBe(true));
  const total = Number(/de (\d+)/.exec(c.get('[data-testid="contador-paso"]').text())?.[1]);
  if (a.config.medio === 'animacion') expect(total).toBe(a.config.pasos.length);
  for (let i = 0; i < total - 1; i++) {
    await c.get('[data-testid="siguiente"]').trigger('click');
    await flushPromises();
  }
}

async function completar3d(c: VueWrapper, a: Datos3d): Promise<void> {
  const lista = c.get('[data-testid="lista-nodos"]');
  for (const id of a.config.requeridos) {
    const boton = lista.findAll('button').find((b) => b.attributes('data-nodo') === id);
    expect(boton, `${a.id}: sin botón para el nodo ${id}`).toBeDefined();
    await boton!.trigger('click');
    await flushPromises();
  }
}

/**
 * Marca la opción cuyo texto es EXACTAMENTE `texto`. El conductor del quiz elige la primera cuya
 * etiqueta lo CONTIENE, y falla con «Colágeno tipo I» frente a «Colágeno tipo II»: aquí se elige la
 * etiqueta más corta que lo contiene.
 */
async function marcarOpcion(c: VueWrapper, texto: string): Promise<void> {
  const candidatas = c
    .findAll('label')
    .map((l) => ({ l, t: l.text().replace(/\s+/g, ' ').trim() }))
    .filter((x) => x.t.includes(texto))
    .sort((x, y) => x.t.length - y.t.length);
  if (candidatas.length === 0) throw new Error(`No hay una opción con el texto «${texto}»`);
  await candidatas[0]!.l.find('input').setValue(true);
}

/** Responde bien y en orden todas las preguntas del quiz (comprobar, siguiente). */
async function completarQuizCorrecto(c: VueWrapper, a: DatosQuiz): Promise<void> {
  for (let i = 0; i < a.config.preguntas.length; i++) {
    const p = preguntaVisible(c, a);
    if (p.formato === 'verdadero_falso') {
      await marcarOpcion(c, p.correcta ? 'Verdadero' : 'Falso');
    } else if (p.formato === 'opcion_multiple') {
      for (const o of p.opciones.filter((x) => p.correctas.includes(x.id))) {
        await marcarOpcion(c, textoPlanoDeMarkdown(o.texto));
      }
    } else {
      for (const [k, paso] of p.pasos.entries()) {
        await moverPaso(c, textoPlanoDeMarkdown(paso.texto), k);
      }
    }
    await pulsarPrincipal(c); // Comprobar
    await pulsarPrincipal(c); // Siguiente / Ver resultado
  }
}

async function interactuar(c: VueWrapper, a: Actividad): Promise<void> {
  switch (a.tipo) {
    case 'multicapa':
      return completarMulticapa(c, a);
    case 'relacion-columnas':
      return completarRelacion(c, a);
    case 'arrastre-molecular':
      return completarArrastre(c, a);
    case 'video-texto':
      return completarVideo(c, a);
    case 'exploracion-3d':
      return completar3d(c, a);
    case 'quiz':
      return completarQuizCorrecto(c, a as DatosQuiz);
  }
}

/** Completa una actividad y comprueba (a), (b) y (d) para ella. */
async function completarYVerificar(a: Actividad): Promise<void> {
  const c = await esperarMontaje(a);
  await interactuar(c, a);
  await vi.waitFor(() => expect(completadas(c), `${a.id} no emitió completada`).toHaveLength(1), {
    timeout: 10_000,
  });

  const r = completadas(c)[0]!;
  expect(r.puntaje, `${a.id}: puntaje`).toBe(a.puntaje_max);
  expect(r.intentos, `${a.id}: intentos`).toBe(1);
  expect(r.precision, `${a.id}: precisión`).toBe(1);
  expect(problemasDeEmisiones(c.emitted() as EventosEmitidos, a), a.id).toEqual([]);
  resultados.set(a.id, r);

  // Contrato con la API: un POST por actividad con el cuerpo exacto.
  await vi.waitFor(
    () => expect(api.filtrar('POST', `/activities/${a.id}/result`), a.id).toHaveLength(1),
    { timeout: 10_000 },
  );
  const post = api.filtrar('POST', `/activities/${a.id}/result`)[0]!;
  expect(PATRON_ACTIVITY_ID_API.test(a.id)).toBe(true);
  const cuerpo = post.cuerpo as Record<string, unknown>;
  expect(Object.keys(cuerpo).sort(), `${a.id}: campos del cuerpo`).toEqual([
    'completada',
    'detalle',
    'intentos',
    'modulo',
    'puntaje',
    'tipo',
  ]);
  expect(cuerpo).toMatchObject({
    modulo: 1,
    tipo: a.tipo,
    puntaje: a.puntaje_max,
    intentos: 1,
    completada: true,
  });
  expect((cuerpo.detalle as { precision: number }).precision).toBe(1);
  expect(JSON.stringify(cuerpo.detalle).length).toBeLessThanOrEqual(API_DETALLE_MAX_BYTES);
  expect(cuerpo).toEqual(aPeticionResultadoApi(a, 1, r).cuerpo);
}

/** (e) Cada enlace de glosario visible abre la definición de su término (y solo de él). */
async function comprobarGlosario(): Promise<number> {
  const ids = [
    ...new Set(
      anfitrion.findAll('a[data-glosario]').map((e) => e.attributes('data-glosario') ?? ''),
    ),
  ];
  for (const id of ids) {
    const termino = modulo.glosario.find((t) => t.id === id);
    expect(termino, `el enlace glosario:${id} no apunta a ningún término`).toBeDefined();
    const enlace = anfitrion
      .findAll('a[data-glosario]')
      .find((e) => e.attributes('data-glosario') === id)!;
    expect(enlace.attributes('aria-haspopup')).toBe('dialog');
    await enlace.trigger('click');
    await flushPromises();
    const hoja = document.body.querySelector('[data-testid="hoja-glosario"]');
    expect(hoja, `el enlace glosario:${id} no abrió la hoja`).not.toBeNull();
    expect(hoja!.textContent).toContain(termino!.termino);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await pausa();
    expect(document.body.querySelector('[data-testid="hoja-glosario"]')).toBeNull();
  }
  return ids.length;
}

/* -------------------------------------------------------------------------------------------
 * El recorrido
 * ----------------------------------------------------------------------------------------- */

describe('módulo 1 (integración): carga', () => {
  it('la página carga el content.json real: cabecera, cinco secciones y solo la primera abierta', () => {
    expect(anfitrion.get('h1').text()).toBe('Conociendo el hueso');
    expect(ordenSecciones()).toHaveLength(5);
    expect(estadosDeSecciones()).toEqual([
      'actual',
      'bloqueada',
      'bloqueada',
      'bloqueada',
      'bloqueada',
    ]);
    expect(anfitrion.get('[data-testid="avance-obligatorias"]').text()).toContain('0 de 14');
    expect(anfitrion.get('[data-testid="puntaje-modulo"]').text()).toContain('530');
    expect(anfitrion.find('[data-testid="modulo-error"]').exists()).toBe(false);
  });

  it('el glosario del final lista todos los términos y cada enlace apunta a uno de ellos', () => {
    const lista = anfitrion.get('[data-testid="glosario"]');
    expect(lista.findAll('dt')).toHaveLength(modulo.glosario.length);
    for (const t of modulo.glosario) {
      expect(lista.find(`#glosario-${t.id}`).exists(), t.id).toBe(true);
    }
  });
});

describe('módulo 1 (integración): recorrido por secciones', () => {
  const ids = [
    'm1_1_tejido_vivo',
    'm1_2_funciones',
    'm1_3_matriz',
    'm1_4_organizacion',
    'm1_5_mandibula',
  ];

  for (const [indice, id] of ids.entries()) {
    it(`sección ${indice + 1} (${id}): actividades reales, bloqueo por secuencia y glosario`, async () => {
      seccionEnCurso = id;
      const seccion = modulo.secciones[indice]!;
      expect(seccion.id).toBe(id);
      const actividades = listarActividades({ secciones: [seccion] }).map((u) => u.actividad);

      // (c) Antes de completar, la siguiente sección está cerrada y explica qué falta.
      const siguiente = ids[indice + 1];
      if (siguiente) {
        expect(estadosDeSecciones()[indice + 1]).toBe('bloqueada');
        await irASeccion(siguiente);
        expect(anfitrion.find('[data-testid="seccion-bloqueada"]').exists()).toBe(true);
        expect(anfitrion.get('[data-testid="seccion-bloqueada"]').text()).toContain(
          'todavía está bloqueada',
        );
      }
      await irASeccion(id);
      expect(anfitrion.get('[data-testid="seccion"]').attributes('data-seccion')).toBe(id);
      expect(anfitrion.find('[data-testid="seccion-bloqueada"]').exists()).toBe(false);

      // (a) Todas las actividades de la sección montan con su componente real.
      for (const a of actividades) {
        const c = await esperarMontaje(a);
        expect(c.exists(), a.id).toBe(true);
      }
      expect(anfitrion.findAll('[data-testid="bloque-actividad"]')).toHaveLength(
        actividades.length,
      );

      // (e) Los enlaces de glosario del texto abren su definición.
      await comprobarGlosario();

      // (b) y (d) Las obligatorias, en orden.
      for (const a of actividades.filter((x) => x.obligatoria)) await completarYVerificar(a);
      await flushPromises();

      // (c) Con las obligatorias hechas se abre la siguiente sección (las opcionales no bloquean).
      const estados = estadosDeSecciones();
      expect(estados[indice], 'la sección terminada').toBe('completada');
      if (siguiente) {
        expect(estados[indice + 1], 'la sección siguiente').not.toBe('bloqueada');
        expect(
          anfitrion.get('[data-testid="seccion-siguiente"]').attributes('aria-disabled'),
        ).toBeUndefined();
      }

      // Las opcionales también se pueden completar y puntúan con su propio puntaje.
      for (const a of actividades.filter((x) => !x.obligatoria)) await completarYVerificar(a);

      if (siguiente) {
        await irASeccion(siguiente);
        expect(anfitrion.get('[data-testid="seccion"]').attributes('data-seccion')).toBe(siguiente);
        expect(anfitrion.find('[data-testid="seccion-bloqueada"]').exists()).toBe(false);
      }
    }, 120_000);
  }
});

describe('módulo 1 (integración): módulo completo', () => {
  it('muestra el cierre del módulo con todo el puntaje', async () => {
    seccionEnCurso = 'cierre';
    await irASeccion('m1_5_mandibula');
    expect(estadosDeSecciones()).toEqual(Array(5).fill('completada'));
    await vi.waitFor(() =>
      expect(anfitrion.find('[data-testid="modulo-completado"]').exists()).toBe(true),
    );
    const total = puntajeMaximoModulo(modulo);
    expect(total).toBe(530);
    expect(anfitrion.get('[data-testid="puntaje-modulo"]').text()).toContain(String(total));
    expect(anfitrion.get('[data-testid="avance-obligatorias"]').text()).toContain('14 de 14');
  });

  it('(d) la API recibió un POST por actividad y un único PUT completado con el cuerpo del contrato', async () => {
    const todas = listarActividades(modulo).map((u) => u.actividad);
    const posts = api.llamadas.filter(
      (l) => l.metodo === 'POST' && /^\/activities\/[^/]+\/result$/.test(l.ruta),
    );
    expect(posts).toHaveLength(todas.length);
    expect(posts.map((p) => p.ruta).sort()).toEqual(
      todas.map((a) => `/activities/${a.id}/result`).sort(),
    );
    expect(posts.reduce((s, p) => s + (p.cuerpo as { puntaje: number }).puntaje, 0)).toBe(530);

    await vi.waitFor(() =>
      expect(
        api.llamadas.filter(
          (l) => l.metodo === 'PUT' && (l.cuerpo as { completado?: boolean }).completado === true,
        ),
      ).toHaveLength(1),
    );
    const put = api.llamadas.find(
      (l) => l.metodo === 'PUT' && (l.cuerpo as { completado?: boolean }).completado === true,
    )!;
    expect(put.ruta).toBe('/progress/1');
    expect(put.cuerpo).toEqual({ completado: true });

    // El PUT sale después del último POST.
    const iPut = api.llamadas.indexOf(put);
    const iUltimoPost = Math.max(...posts.map((p) => api.llamadas.indexOf(p)));
    // Solo las obligatorias condicionan el PUT: el POST de la opcional final puede llegar después.
    const obligatorias = new Set(
      todas.filter((a) => a.obligatoria).map((a) => `/activities/${a.id}/result`),
    );
    const iUltimaObligatoria = Math.max(
      ...posts.filter((p) => obligatorias.has(p.ruta)).map((p) => api.llamadas.indexOf(p)),
    );
    expect(iPut).toBeGreaterThan(iUltimaObligatoria);
    expect(iUltimoPost).toBeGreaterThan(0);

    // Todo PUT de progreso lleva solo campos del contrato.
    for (const l of api.llamadas.filter((x) => x.metodo === 'PUT')) {
      expect(l.ruta).toBe('/progress/1');
      const claves = Object.keys(l.cuerpo as object);
      expect(
        claves.every((k) => ['seccion_actual', 'tiempo_delta_seg', 'completado'].includes(k)),
      ).toBe(true);
    }
  });

  it('(a) sin errores ni avisos de Vue ni de la consola en todo el recorrido', () => {
    expect(avisos, `\n - ${avisos.join('\n - ')}\n`).toEqual([]);
  });
});

describe('módulo 1 (integración): caminos de error con el contenido real', () => {
  const actividad = <T extends Actividad>(id: string) =>
    listarActividades(modulo).find((u) => u.actividad.id === id)!.actividad as T;
  const montados: VueWrapper[] = [];
  const montar = (a: Actividad): VueWrapper => {
    const w = mount(TIPOS[a.tipo], {
      props: { actividad: a, modulo: 1 },
      attachTo: document.body,
    }) as unknown as VueWrapper;
    montados.push(w);
    return w;
  };
  const interacciones = (w: VueWrapper) =>
    (w.emitted('interaccion') ?? []).map((e) => e[0] as { accion: string; resultado?: string });

  afterAll(() => {
    while (montados.length > 0) montados.pop()?.unmount();
  });

  it('arrastre: soltar un distractor sobre un receptor lo rechaza con su texto y no completa; después se puede terminar', async () => {
    const a = actividad<DatosArrastre>('m1_2_hormonas_oseas');
    const w = montar(a);
    const distractores = a.config.moleculas.filter(
      (m) => !a.config.pares.some((p) => p.molecula === m.id),
    );
    expect(distractores.length).toBeGreaterThan(0);
    const d = distractores[0]!;
    await w.get(`[data-pieza][data-indice="${a.config.moleculas.indexOf(d)}"]`).trigger('click');
    await w.get('[data-receptor][data-indice="0"]').trigger('click');
    await flushPromises();
    expect(interacciones(w).some((x) => x.resultado === 'incorrecta')).toBe(true);
    expect(w.text().replace(/\s+/g, ' ')).toContain((d.rechazo ?? '').slice(0, 40));
    expect(w.emitted('completada')).toBeUndefined();

    await completarArrastre(w, a);
    const r = completadas(w)[0]!;
    expect(r.precision).toBeLessThan(1);
    expect(r.puntaje).toBeGreaterThan(0);
    expect(r.puntaje).toBeLessThan(a.puntaje_max);
  });

  it('relación: unir con un distractor es un error que se corrige; el puntaje baja pero se completa', async () => {
    const a = actividad<DatosRelacion>('m1_2_relacion_funciones');
    const w = montar(a);
    const usados = new Set(a.config.pares.map((p) => p.b));
    const distractor = a.config.columna_b.elementos.find((e) => !usados.has(e.id))!;
    const primero = a.config.pares[0]!;
    const el = (col: 'a' | 'b', id: string) =>
      w.findAll(`[data-columna="${col}"]`).find((x) => x.attributes('data-id') === id)!;
    await el('a', primero.a).trigger('click');
    await el('b', distractor.id).trigger('click');
    await flushPromises();
    expect(interacciones(w).some((x) => x.resultado === 'incorrecta')).toBe(true);
    expect(w.emitted('completada')).toBeUndefined();

    await completarRelacion(w, a);
    const r = completadas(w)[0]!;
    expect(r.precision).toBeLessThan(1);
    expect(r.puntaje).toBeGreaterThan(0);
    expect(r.puntaje).toBeLessThan(a.puntaje_max);
  });

  it('multicapa (identificar): tocar la capa equivocada no completa; con la correcta se termina con menos puntaje', async () => {
    const a = actividad<DatosMulticapa>('m1_4_corte_capas');
    expect(a.config.modo).toBe('identificar');
    const w = montar(a);
    await vi.waitFor(() => expect(w.find('[data-testid="multicapa-svg"] svg').exists()).toBe(true));
    const [primera] = construirConsignas(a.config);
    const otra = a.config.capas.find((c) => c.id !== primera!.capa)!;
    zonaDeCapa(w, otra.id).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(interacciones(w).some((x) => x.resultado === 'incorrecta')).toBe(true);
    expect(w.emitted('completada')).toBeUndefined();

    await completarMulticapa(w, a);
    const r = completadas(w)[0]!;
    expect(r.precision).toBeLessThan(1);
    expect(r.puntaje).toBeGreaterThan(0);
    expect(r.puntaje).toBeLessThan(a.puntaje_max);
  });

  it('quiz: una respuesta incorrecta muestra la explicación de la pregunta', async () => {
    const a = actividad<DatosQuiz>('m1_1_quiz_conceptos');
    const w = montar(a);
    const p = preguntaVisible(w, a);
    if (p.formato !== 'opcion_multiple') throw new Error('la primera pregunta cambió de formato');
    const mala = p.opciones.find((o) => !p.correctas.includes(o.id))!;
    await marcarOpcion(w, textoPlanoDeMarkdown(mala.texto));
    await pulsarPrincipal(w);
    expect(w.text().replace(/\s+/g, ' ')).toContain(p.explicacion.slice(0, 40));
  });
});
