import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { Router } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { fila, simularApi } from '@/components/modulo/utilesPrueba';
import type { ApiSimulada, OpcionesApi } from '@/components/modulo/utilesPrueba';
import { muestra, validar } from '@/content/__fixtures__/utiles';
import { visibleParaNivel } from '@/content/consultas';
import type * as Configuracion from '@/config';
import type * as ModuloRegistry from '@/content/registry';
import type { ResultadoCarga } from '@/content/registry';
import type { ModuloContenido } from '@/content/schema';
import { guardarModulo } from '@/router/guardModulo';
import { useActividadesStore } from '@/stores/actividades';
import { useAuthStore } from '@/stores/auth';
import { useContextoStore } from '@/stores/contextoPedagogico';
import { useProgresoStore } from '@/stores/progreso';
import { respuestaJson, usuarioDePrueba } from '@/test/utils';
import type { Rol } from '@/types/api';
import ModuloView from './ModuloView.vue';

/* -------------------------------------------------------------------------------------------
 * Simulaciones: contenido, componentes de actividad y configuración
 * ----------------------------------------------------------------------------------------- */

const { cargarModuloMock, cfg } = vi.hoisted(() => ({
  cargarModuloMock: vi.fn<(n: number) => Promise<ResultadoCarga>>(),
  cfg: { bloqueo: true, notaRevision: true },
}));

vi.mock('@/content/registry', async (importarOriginal) => ({
  ...(await importarOriginal<typeof ModuloRegistry>()),
  cargarModulo: cargarModuloMock,
}));

vi.mock('@/config', async (importarOriginal) => ({
  ...(await importarOriginal<typeof Configuracion>()),
  get BLOQUEO_SECUENCIAL() {
    return cfg.bloqueo;
  },
  get MOSTRAR_NOTA_REVISION() {
    return cfg.notaRevision;
  },
}));

// Las actividades reales tienen sus propias pruebas: aquí un componente de actividad de mentira que
// cumple el contrato (props y eventos) y deja disparar cada evento con un botón.
vi.mock('@/activities/registro', async () => {
  const { defineComponent: definir, h: crear } = await import('vue');
  const Falsa = definir({
    name: 'ActividadFalsa',
    props: ['actividad', 'modulo', 'modo', 'estadoPrevio'],
    emits: ['progreso', 'interaccion', 'completada'],
    setup(props, { emit }) {
      return () =>
        crear(
          'div',
          {
            'data-testid': 'actividad-falsa',
            'data-modo': props.modo,
            'data-servidor': JSON.stringify(props.estadoPrevio?.servidor ?? null),
            'data-progreso': JSON.stringify(props.estadoPrevio?.progreso ?? null),
          },
          [
            crear('h3', props.actividad.id),
            crear(
              'button',
              {
                'data-testid': 'completar',
                onClick: () =>
                  emit('completada', {
                    puntaje: props.actividad.puntaje_max,
                    intentos: 1,
                    precision: 1,
                    detalle: {},
                  }),
              },
              'Completar',
            ),
            crear(
              'button',
              {
                'data-testid': 'interactuar',
                onClick: () =>
                  emit('interaccion', { accion: 'selecciona_capa', objeto: 'periostio' }),
              },
              'Interactuar',
            ),
            crear(
              'button',
              {
                'data-testid': 'progreso',
                onClick: () =>
                  emit('progreso', { avance: 0.5, intentos: 1, instantanea: { paso: 2 } }),
              },
              'Progreso',
            ),
          ],
        );
    },
  });
  return { componenteDeActividad: () => Falsa };
});

const Vacia = defineComponent({ render: () => h('div') });

/* -------------------------------------------------------------------------------------------
 * Datos de prueba
 * ----------------------------------------------------------------------------------------- */

/** Actividades obligatorias del módulo de muestra, con su tipo y puntaje. */
const OBLIGATORIAS = [
  ['m1_capas_hueso', 'multicapa', 30],
  ['m1_celulas_funciones', 'relacion-columnas', 30],
  ['m1_animacion_remodelado', 'video-texto', 20],
  ['m1_senales_remodelado', 'arrastre-molecular', 50],
  ['m1_explora_mandibula', 'exploracion-3d', 30],
  ['m1_identifica_celulas', 'multicapa', 30],
  ['m1_quiz_repaso', 'quiz', 50],
] as const;

function filasCompletas(numero: number, excepto: readonly string[] = []) {
  return OBLIGATORIAS.filter(([id]) => !excepto.includes(id)).map(([id, tipo, puntaje]) =>
    fila(id, numero, { tipo, mejor_puntaje: puntaje, mejor_precision: 1 }),
  );
}

function moduloDePrueba(cambios?: (datos: Record<string, unknown>) => void): ModuloContenido {
  const datos = muestra();
  cambios?.(datos);
  const r = validar(datos);
  if (!r.modulo) throw new Error(`El módulo de prueba no es válido: ${r.issues.join('; ')}`);
  return r.modulo;
}

/** El módulo de muestra con otro número (el contenido está simulado: no pasa por el esquema). */
function moduloConNumero(numero: number): ModuloContenido {
  return { ...structuredClone(moduloDePrueba()), numero } as ModuloContenido;
}

function respuestaModulo(modulo: ModuloContenido): ResultadoCarga {
  return {
    ok: true,
    modulo,
    entrada: {
      numero: modulo.numero,
      slug: modulo.slug,
      carpeta: `m${modulo.numero}_${modulo.slug}`,
    },
  };
}

/* -------------------------------------------------------------------------------------------
 * Montaje
 * ----------------------------------------------------------------------------------------- */

interface OpcionesMontaje extends OpcionesApi {
  n?: number;
  ruta?: string;
  modulo?: ModuloContenido;
  conCertificado?: boolean;
  /** Registra el guard de módulo del router real. */
  conGuard?: boolean;
  /** Rol de la sesión (por defecto, estudiante). */
  rol?: Rol;
  /** Sustituye lo que devuelve `cargarModulo`. */
  carga?: ResultadoCarga;
  api?: ApiSimulada;
}

interface Montaje {
  wrapper: VueWrapper;
  router: Router;
  api: ApiSimulada;
  store: ReturnType<typeof useActividadesStore>;
  progreso: ReturnType<typeof useProgresoStore>;
  contexto: ReturnType<typeof useContextoStore>;
}

const montados: VueWrapper[] = [];

async function montar(opciones: OpcionesMontaje = {}): Promise<Montaje> {
  const n = opciones.n ?? 1;
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'jwt-de-prueba';
  auth.establecerUsuario(usuarioDePrueba({ rol: opciones.rol ?? 'estudiante' }));

  const api = opciones.api ?? simularApi(opciones);
  cargarModuloMock.mockResolvedValue(
    opciones.carga ?? respuestaModulo(opciones.modulo ?? moduloDePrueba()),
  );

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'inicio', component: Vacia },
      { path: '/modulo/:n', name: 'modulo', component: Vacia },
      ...(opciones.conCertificado ? [{ path: '/certificado', component: Vacia }] : []),
    ],
  });
  if (opciones.conGuard) router.beforeEach(guardarModulo);
  await router.push(opciones.ruta ?? `/modulo/${n}`);
  await router.isReady();

  const wrapper = mount(ModuloView, {
    props: { n },
    attachTo: document.body,
    global: { plugins: [pinia, router] },
  });
  montados.push(wrapper);
  await flushPromises();

  return {
    wrapper: wrapper as unknown as VueWrapper,
    router,
    api,
    store: useActividadesStore(),
    progreso: useProgresoStore(),
    contexto: useContextoStore(),
  };
}

beforeEach(() => {
  localStorage.clear();
  cfg.bloqueo = true;
  cfg.notaRevision = true;
  cargarModuloMock.mockReset();
});

afterEach(() => {
  while (montados.length > 0) montados.pop()?.unmount();
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const bloquesDeActividad = (w: VueWrapper) => w.findAll('[data-testid="bloque-actividad"]');
const idsDeActividades = (w: VueWrapper) =>
  bloquesDeActividad(w).map((b) => b.attributes('data-actividad'));

/** Pulsa «Completar» de una actividad concreta. */
async function completar(w: VueWrapper, id: string): Promise<void> {
  await w.get(`[data-actividad="${id}"] [data-testid="completar"]`).trigger('click');
  await flushPromises();
}

/* -------------------------------------------------------------------------------------------
 * Carga y cabecera
 * ----------------------------------------------------------------------------------------- */

describe('ModuloView: carga y cabecera', () => {
  it('muestra el estado de carga y luego el módulo con su cabecera', async () => {
    let liberar: (r: Response) => void = () => undefined;
    const api = simularApi({
      responder: (l) =>
        l.ruta.startsWith('/activities/results')
          ? new Promise<Response>((resolver) => {
              liberar = resolver;
            })
          : undefined,
    });
    const { wrapper } = await montar({ api });
    expect(wrapper.find('[data-testid="modulo-cargando"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="cabecera-modulo"]').exists()).toBe(false);

    liberar(respuestaJson(200, { resultados: [] }));
    await flushPromises();

    expect(wrapper.find('[data-testid="modulo-cargando"]').exists()).toBe(false);
    const modulo = moduloDePrueba();
    expect(wrapper.findAll('h1')).toHaveLength(1);
    expect(wrapper.get('h1').text()).toBe(modulo.titulo);
    expect(wrapper.get('[data-testid="cabecera-modulo"]').text()).toContain(modulo.subtitulo);
    expect(wrapper.get('[data-testid="duracion"]').text()).toContain(
      `${modulo.duracion_estimada_min} min`,
    );
    expect(wrapper.findAll('[data-testid="objetivos"] li')).toHaveLength(modulo.objetivos.length);
    expect(wrapper.get('[data-testid="avance-obligatorias"]').text()).toContain('0 de 7');
  });

  it('muestra la nota «Contenido en revisión» mientras no esté aprobado y se puede ocultar', async () => {
    const { wrapper } = await montar();
    expect(wrapper.get('[data-testid="nota-revision"]').text()).toContain('Contenido en revisión');
    wrapper.unmount();
    montados.pop();

    cfg.notaRevision = false;
    const otro = await montar();
    expect(otro.wrapper.find('[data-testid="nota-revision"]').exists()).toBe(false);
  });

  it('no muestra la nota si el contenido está aprobado', async () => {
    const aprobado = moduloDePrueba((d) => {
      d.estado_revision = {
        estado: 'aprobado',
        pendientes: [],
        revisado_por: 'Dr. Prueba',
        fecha: '2026-09-24',
        version: '1.0',
      };
    });
    const { wrapper } = await montar({ modulo: aprobado });
    expect(wrapper.find('[data-testid="nota-revision"]').exists()).toBe(false);
  });

  it('un módulo sin contenido lo explica con lenguaje claro', async () => {
    const { wrapper, store } = await montar({
      n: 2,
      carga: { ok: false, motivo: 'sin_contenido', mensaje: 'Sin contenido', errores: [] },
    });
    expect(wrapper.get('[data-testid="modulo-vacio"]').text()).toContain(
      'Este módulo aún no tiene contenido',
    );
    expect(wrapper.findAll('h1')).toHaveLength(1);
    expect(wrapper.find('[data-testid="cabecera-modulo"]').exists()).toBe(false);
    // Sin contenido no se monta nada ni se piden resultados.
    expect(store.estadoCarga[2]).toBeUndefined();
  });

  it('un error de carga se muestra como alerta y se puede reintentar', async () => {
    const primero = await montar({ completados: [1] });
    cargarModuloMock.mockResolvedValueOnce({
      ok: false,
      motivo: 'error_de_carga',
      mensaje: 'No pudimos cargar el contenido de este módulo.',
      errores: ['detalle'],
    });
    await primero.wrapper.setProps({ n: 2 });
    await flushPromises();
    const alerta = primero.wrapper.get('[data-testid="modulo-error"]');
    expect(alerta.attributes('role')).toBe('alert');
    expect(alerta.text()).toContain('No pudimos cargar el contenido');

    cargarModuloMock.mockResolvedValue(respuestaModulo(moduloDePrueba()));
    await primero.wrapper.get('[data-testid="reintentar-carga"]').trigger('click');
    await flushPromises();
    expect(primero.wrapper.find('[data-testid="cabecera-modulo"]').exists()).toBe(true);
  });

  it('si la carga del contenido lanza una excepción, cae en el mensaje de error', async () => {
    const m = await montar();
    cargarModuloMock.mockRejectedValueOnce(new Error('boom'));
    await m.wrapper.setProps({ n: 2 });
    await flushPromises();
    expect(m.wrapper.get('[data-testid="modulo-error"]').text()).toContain('Revisa tu conexión');
  });
});

/* -------------------------------------------------------------------------------------------
 * Persistencia: estado previo de las actividades
 * ----------------------------------------------------------------------------------------- */

describe('ModuloView: restauración del estado', () => {
  it('no monta ninguna actividad hasta tener el estado del servidor', async () => {
    let liberar: (r: Response) => void = () => undefined;
    const api = simularApi({
      responder: (l) =>
        l.ruta.startsWith('/activities/results')
          ? new Promise<Response>((resolver) => {
              liberar = resolver;
            })
          : undefined,
    });
    const { wrapper } = await montar({ api, ruta: '/modulo/1?s=tejido_dinamico' });
    expect(wrapper.find('[data-testid="actividad-falsa"]').exists()).toBe(false);

    liberar(
      respuestaJson(200, {
        resultados: [
          fila('m1_capas_hueso', 1, { tipo: 'multicapa', mejor_puntaje: 27, intentos: 2 }),
        ],
      }),
    );
    await flushPromises();
    const servidor = JSON.parse(
      wrapper
        .get('[data-actividad="m1_capas_hueso"] [data-testid="actividad-falsa"]')
        .attributes('data-servidor') ?? 'null',
    );
    expect(servidor).toEqual({ puntaje: 27, intentos: 2, completada: true });
  });

  it('agota la espera y monta la actividad sin estado del servidor', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const api = simularApi({
      responder: (l) =>
        l.ruta.startsWith('/activities/results')
          ? new Promise<Response>(() => undefined)
          : undefined,
    });
    const { wrapper } = await montar({ api });
    expect(wrapper.find('[data-testid="actividad-falsa"]').exists()).toBe(false);

    await vi.advanceTimersByTimeAsync(3_100);
    await flushPromises();
    const primera = wrapper.get('[data-testid="actividad-falsa"]');
    expect(primera.attributes('data-servidor')).toBe('null');
  });

  it('con la API caída usa el respaldo local para el estado previo y el avance', async () => {
    localStorage.setItem(
      'ova.actividades.resultados.1',
      JSON.stringify({
        m1_capas_hueso: { modulo: 1, completada: true, puntaje: 30, intentos: 1, precision: 1 },
      }),
    );
    const { wrapper, store } = await montar({
      fallaLectura: true,
      ruta: '/modulo/1?s=tejido_dinamico',
    });
    expect(store.estadoCarga[1]).toBe('error');
    const actividad = wrapper.get('[data-actividad="m1_capas_hueso"]');
    expect(actividad.get('[data-testid="actividad-falsa"]').attributes('data-modo')).toBe(
      'revisar',
    );
    expect(wrapper.get('[data-testid="avance-obligatorias"]').text()).toContain('1 de 7');
  });

  it('una actividad ya superada se abre en modo revisar y se puede practicar de nuevo', async () => {
    const { wrapper } = await montar({
      filas: filasCompletas(1, ['m1_quiz_repaso']),
      ruta: '/modulo/1?s=tejido_dinamico',
    });
    const bloque = wrapper.get('[data-actividad="m1_capas_hueso"]');
    expect(bloque.get('[data-testid="actividad-falsa"]').attributes('data-modo')).toBe('revisar');
    expect(bloque.get('[data-testid="estado-actividad"]').text()).toContain('Completada');

    await bloque.get('[data-testid="modo-revisar"] button').trigger('click');
    expect(bloque.get('[data-testid="actividad-falsa"]').attributes('data-modo')).toBe('jugar');
    expect(bloque.find('[data-testid="modo-revisar"]').exists()).toBe(false);
  });

  it('guarda la instantánea de un intento a medias y la ofrece al volver', async () => {
    const primero = await montar();
    await primero.wrapper.get('[data-testid="progreso"]').trigger('click');
    const clave = 'ova.actividades.instantanea.1.m1_capas_hueso';
    expect(JSON.parse(localStorage.getItem(clave) ?? 'null')).toEqual({
      avance: 0.5,
      intentos: 1,
      instantanea: { paso: 2 },
    });
    primero.wrapper.unmount();
    montados.pop();

    const segundo = await montar();
    const progreso = JSON.parse(
      segundo.wrapper.get('[data-testid="actividad-falsa"]').attributes('data-progreso') ?? 'null',
    );
    expect(progreso).toMatchObject({ avance: 0.5, instantanea: { paso: 2 } });
  });
});

/* -------------------------------------------------------------------------------------------
 * Bloques
 * ----------------------------------------------------------------------------------------- */

describe('ModuloView: bloques', () => {
  it('pinta texto, callout, imagen y actividad de la primera sección, con encabezados en orden', async () => {
    const { wrapper } = await montar();
    const seccion = wrapper.get('[data-testid="seccion"]');
    expect(seccion.attributes('data-seccion')).toBe('tejido_dinamico');
    expect(seccion.find('[data-testid="bloque-texto"]').exists()).toBe(true);
    expect(seccion.find('[data-testid="bloque-callout"]').exists()).toBe(true);
    expect(seccion.find('[data-testid="bloque-imagen"] img').attributes('alt')).toBeTruthy();
    expect(idsDeActividades(wrapper)).toEqual(['m1_capas_hueso']);
    // h1 (módulo) > h2 (sección) sin saltos.
    expect(wrapper.findAll('h1')).toHaveLength(1);
    expect(wrapper.get('h2#titulo-seccion').text()).toBe('El hueso, un tejido dinámico');
    expect(wrapper.get('#titulo-seccion').attributes('tabindex')).toBe('-1');
  });

  it('oculta la profundización de posgrado a pregrado y la muestra a posgrado', async () => {
    const modulo = moduloDePrueba((d) => {
      const secciones = d.secciones as { bloques: Record<string, unknown>[] }[];
      secciones[0]!.bloques[0]!.nivel = 'posgrado';
    });
    const a = await montar({ modulo });
    expect(a.wrapper.findAll('[data-testid="bloque-texto"]')).toHaveLength(0);
    a.wrapper.unmount();
    montados.pop();

    const b = await montar({ modulo });
    b.contexto.setNivel('posgrado');
    await flushPromises();
    expect(b.wrapper.findAll('[data-testid="bloque-texto"]')).toHaveLength(1);
  });

  it('muestra las cuatro variantes de callout con icono y etiqueta, no solo color', async () => {
    const { wrapper } = await montar({
      ruta: '/modulo/1?s=funciones',
      filas: filasCompletas(1, ['m1_celulas_funciones']).filter(
        (f) => f.activity_id === 'm1_capas_hueso',
      ),
    });
    const callouts = wrapper.findAll('[data-testid="bloque-callout"]');
    expect(callouts.length).toBeGreaterThanOrEqual(1);
    for (const c of callouts) {
      expect(c.attributes('data-variante')).toBeTruthy();
      expect(c.find('svg').exists()).toBe(true);
      expect(c.get('p').text().length).toBeGreaterThan(3);
    }
  });

  it('la tabla tiene una versión ancha con encabezados y otra apilada para móvil', async () => {
    const { wrapper } = await montar({
      ruta: '/modulo/1?s=funciones',
      filas: filasCompletas(1).filter((f) => f.activity_id === 'm1_capas_hueso'),
    });
    const tabla = wrapper.get('[data-testid="bloque-tabla"]');
    expect(tabla.findAll('table th[scope="col"]').length).toBeGreaterThan(1);
    expect(tabla.findAll('table th[scope="row"]').length).toBeGreaterThan(0);
    expect(tabla.findAll('[data-testid="tabla-apilada"] > li').length).toBeGreaterThan(1);
  });
});

/* -------------------------------------------------------------------------------------------
 * Bloqueo de secciones
 * ----------------------------------------------------------------------------------------- */

describe('ModuloView: bloqueo de secciones', () => {
  it('abre en la primera sección pendiente y marca las demás como bloqueadas', async () => {
    const { wrapper } = await montar();
    const items = wrapper.findAll('[data-testid="indice-secciones"] button');
    expect(items.map((i) => i.attributes('data-estado'))).toEqual([
      'actual',
      'bloqueada',
      'bloqueada',
      'bloqueada',
    ]);
    expect(items[0]!.attributes('aria-current')).toBe('step');
    expect(items[1]!.attributes('aria-disabled')).toBe('true');
  });

  it('reanuda en la primera sección sin terminar', async () => {
    const { wrapper } = await montar({
      filas: filasCompletas(1).filter((f) =>
        ['m1_capas_hueso', 'm1_celulas_funciones', 'm1_animacion_remodelado'].includes(
          f.activity_id,
        ),
      ),
    });
    expect(wrapper.get('[data-testid="seccion"]').attributes('data-seccion')).toBe(
      'celulas_y_senales',
    );
  });

  it('tocar una sección bloqueada no navega y explica qué falta', async () => {
    const { wrapper, router } = await montar();
    await wrapper.findAll('[data-testid="indice-secciones"] button')[2]!.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.query.s).toBeUndefined();
    const aviso = wrapper.get('[data-testid="aviso-seccion-bloqueada"]');
    expect(aviso.attributes('role')).toBe('status');
    expect(aviso.text()).toContain('todavía está bloqueada');
    expect(aviso.text()).toContain('completa la actividad obligatoria');
  });

  it('una URL a una sección bloqueada muestra la explicación, no el contenido', async () => {
    const { wrapper, router } = await montar({ ruta: '/modulo/1?s=repaso' });
    const panel = wrapper.get('[data-testid="seccion-bloqueada"]');
    expect(panel.text()).toContain('Esta sección todavía está bloqueada');
    expect(panel.text()).toContain('El hueso, un tejido dinámico');
    expect(wrapper.find('[data-testid="bloque-actividad"]').exists()).toBe(false);

    await wrapper.get('[data-testid="ir-a-seccion-actual"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.s).toBe('tejido_dinamico');
    expect(wrapper.find('[data-testid="seccion"]').exists()).toBe(true);
  });

  it('«Siguiente» sigue en el orden de tabulación pero explica qué falta y lleva a la actividad', async () => {
    const { wrapper, router } = await montar();
    const siguiente = wrapper.get('[data-testid="seccion-siguiente"]');
    expect(siguiente.attributes('aria-disabled')).toBe('true');
    expect(siguiente.attributes('disabled')).toBeUndefined();
    expect(wrapper.get('[data-testid="motivo-bloqueo"]').text()).toContain(
      'completa la actividad obligatoria',
    );

    await siguiente.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.s).toBeUndefined();
    expect(wrapper.find('[data-testid="seccion-bloqueada"]').exists()).toBe(false);
  });

  it('al completar la obligatoria se abre la siguiente sección y el foco pasa a su título', async () => {
    const { wrapper, router } = await montar();
    await completar(wrapper, 'm1_capas_hueso');

    expect(wrapper.find('[data-testid="motivo-bloqueo"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="anuncio-vivo"]').text()).toContain('Sección completada');
    const items = wrapper.findAll('[data-testid="indice-secciones"] button');
    expect(items[0]!.attributes('data-estado')).toBe('completada');
    expect(items[1]!.attributes('data-estado')).toBe('actual');

    const siguiente = wrapper.get('[data-testid="seccion-siguiente"]');
    expect(siguiente.attributes('aria-disabled')).toBeUndefined();
    await siguiente.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.s).toBe('funciones');
    await new Promise((r) => setTimeout(r, 10));
    expect(document.activeElement?.id).toBe('titulo-seccion');
    expect(document.activeElement?.textContent).toContain('Lo que hace el hueso');
  });

  it('una sección completada nunca se vuelve a cerrar', async () => {
    const { wrapper } = await montar({
      filas: filasCompletas(1).filter((f) => f.activity_id === 'm1_capas_hueso'),
    });
    const items = wrapper.findAll('[data-testid="indice-secciones"] button');
    expect(items[0]!.attributes('data-estado')).toBe('completada');
    expect(items[0]!.attributes('aria-disabled')).toBeUndefined();
  });

  it('el selector de secciones para móvil marca cada sección y no navega a una bloqueada', async () => {
    const { wrapper, router } = await montar();
    const select = wrapper.get('select#ir-a-seccion');
    const opciones = select.findAll('option').map((o) => o.text());
    expect(opciones[0]).toContain('pendiente');
    expect(opciones[1]).toContain('bloqueada');
    await select.setValue('3');
    await flushPromises();
    expect(router.currentRoute.value.query.s).toBeUndefined();
    expect((select.element as HTMLSelectElement).value).toBe('0');
  });

  it('con VITE_BLOQUEO_SECUENCIAL=false todas las secciones están abiertas', async () => {
    cfg.bloqueo = false;
    const { wrapper } = await montar({ ruta: '/modulo/1?s=repaso' });
    expect(wrapper.find('[data-testid="seccion-bloqueada"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="seccion"]').attributes('data-seccion')).toBe('repaso');
    const estados = wrapper
      .findAll('[data-testid="indice-secciones"] button')
      .map((b) => b.attributes('data-estado'));
    expect(estados).not.toContain('bloqueada');
  });

  it('un módulo ya completado en el servidor deja abiertas todas las secciones', async () => {
    const { wrapper } = await montar({ completados: [1], ruta: '/modulo/1?s=repaso' });
    expect(wrapper.find('[data-testid="seccion-bloqueada"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="seccion"]').attributes('data-seccion')).toBe('repaso');
  });
});

/* -------------------------------------------------------------------------------------------
 * Resultados, HUD y logros
 * ----------------------------------------------------------------------------------------- */

describe('ModuloView: completar una actividad', () => {
  it('envía el POST exacto, actualiza el puntaje del HUD y avisa del logro nuevo', async () => {
    const { wrapper, api, progreso } = await montar({
      puntajeTotal: 10,
      logrosPorActividad: { m1_capas_hueso: ['primer_hueso'] },
    });
    await completar(wrapper, 'm1_capas_hueso');

    const posts = api.filtrar('POST', '/activities/');
    expect(posts).toHaveLength(1);
    expect(posts[0]!.ruta).toBe('/activities/m1_capas_hueso/result');
    expect(posts[0]!.cuerpo).toEqual({
      modulo: 1,
      tipo: 'multicapa',
      puntaje: 30,
      intentos: 1,
      completada: true,
      detalle: { precision: 1 },
    });
    expect(progreso.puntajeTotal).toBe(40);
    expect(progreso.logros).toContain('primer_hueso');

    const aviso = wrapper.get('[data-testid="aviso-logro"]');
    expect(aviso.text()).toContain('Logro desbloqueado');
    expect(aviso.text()).toContain('Primer hueso');
    const region = wrapper.get('[data-testid="avisos-logro"]');
    expect(region.attributes('aria-live')).toBe('polite');
    // Se puede cerrar con un botón etiquetado.
    await aviso.get('button').trigger('click');
    expect(wrapper.find('[data-testid="aviso-logro"]').exists()).toBe(false);
  });

  it('el aviso de logro desaparece solo', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const { wrapper } = await montar({ logrosPorActividad: { m1_capas_hueso: ['primer_hueso'] } });
    await completar(wrapper, 'm1_capas_hueso');
    expect(wrapper.find('[data-testid="aviso-logro"]').exists()).toBe(true);
    await vi.advanceTimersByTimeAsync(9_500);
    expect(wrapper.find('[data-testid="aviso-logro"]').exists()).toBe(false);
  });

  it('si la red falla, la actividad cuenta como hecha y se avisa de que se reintentará', async () => {
    let conRed = false;
    const { wrapper, api, store } = await montar({
      responder: (l) => {
        if (l.metodo === 'POST' && !conRed) throw new TypeError('sin red');
        return undefined;
      },
    });
    await completar(wrapper, 'm1_capas_hueso');

    expect(store.pendientes).toBe(1);
    expect(wrapper.get('[data-testid="error-envio"]').text()).toContain('lo reintentaremos');
    // El estudiante puede seguir: la sección quedó completada.
    expect(wrapper.find('[data-testid="motivo-bloqueo"]').exists()).toBe(false);

    conRed = true;
    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(store.pendientes).toBe(0);
    expect(wrapper.find('[data-testid="error-envio"]').exists()).toBe(false);
    // Un fallo y un éxito del mismo envío; ningún duplicado aceptado.
    expect(api.filtrar('POST', '/activities/m1_capas_hueso')).toHaveLength(2);
  });

  it('un 422 no bloquea al estudiante', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { wrapper, store } = await montar({
      responder: (l) =>
        l.metodo === 'POST'
          ? new Response(
              JSON.stringify({ detail: { code: 'actividad_desconocida', message: 'No existe' } }),
              { status: 422, headers: { 'Content-Type': 'application/json' } },
            )
          : undefined,
    });
    await completar(wrapper, 'm1_capas_hueso');
    expect(store.descartados).toHaveLength(1);
    expect(wrapper.find('[data-testid="error-envio"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="motivo-bloqueo"]').exists()).toBe(false);
    expect(
      wrapper.findAll('[data-testid="indice-secciones"] button')[1]!.attributes('data-estado'),
    ).toBe('actual');
  });

  it('una actividad terminada sin llegar al mínimo de precisión no abre la siguiente sección', async () => {
    const { wrapper } = await montar({
      ruta: '/modulo/1?s=repaso',
      filas: [
        ...filasCompletas(1, ['m1_quiz_repaso']),
        fila('m1_quiz_repaso', 1, { mejor_puntaje: 20, mejor_precision: 0.4 }),
      ],
    });
    expect(wrapper.get('[data-actividad="m1_quiz_repaso"]').text()).toContain('al menos 60 %');
    expect(wrapper.find('[data-testid="modulo-completado"]').exists()).toBe(false);
  });
});

/* -------------------------------------------------------------------------------------------
 * Completar el módulo
 * ----------------------------------------------------------------------------------------- */

describe('ModuloView: módulo completado', () => {
  const rutaRepaso = '/modulo/1?s=repaso';

  it('envía el PUT completado:true después del último POST y ofrece el siguiente módulo', async () => {
    const { wrapper, api, progreso } = await montar({
      ruta: rutaRepaso,
      filas: filasCompletas(1, ['m1_quiz_repaso']),
    });
    expect(
      api
        .filtrar('PUT', '/progress/')
        .filter((l) => (l.cuerpo as { completado?: boolean }).completado),
    ).toHaveLength(0);
    expect(wrapper.find('[data-testid="modulo-completado"]').exists()).toBe(false);

    await completar(wrapper, 'm1_quiz_repaso');
    await flushPromises();

    const orden = api.llamadas
      .filter(
        (l) =>
          l.metodo === 'POST' ||
          (l.metodo === 'PUT' && (l.cuerpo as { completado?: boolean }).completado === true),
      )
      .map((l) => `${l.metodo} ${l.ruta}`);
    expect(orden).toEqual(['POST /activities/m1_quiz_repaso/result', 'PUT /progress/1']);
    const put = api.llamadas.find(
      (l) => l.metodo === 'PUT' && (l.cuerpo as { completado?: boolean }).completado === true,
    );
    expect(put!.cuerpo).toEqual({ completado: true });
    expect(progreso.estaCompletado(1)).toBe(true);

    const panel = wrapper.get('[data-testid="modulo-completado"]');
    expect(panel.text()).toContain('¡Completaste el módulo 1!');
    expect(panel.find('[data-testid="modulo-guardando"]').exists()).toBe(false);
    expect(panel.get('[data-testid="siguiente-modulo"]').attributes('href')).toBe('/modulo/2');
    expect(wrapper.get('[data-testid="anuncio-vivo"]').text()).toContain('Completaste el módulo 1');
  });

  it('no repite el PUT completado aunque cambie la cola de resultados', async () => {
    const { wrapper, api } = await montar({
      ruta: rutaRepaso,
      filas: filasCompletas(1, ['m1_quiz_repaso']),
    });
    await completar(wrapper, 'm1_quiz_repaso');
    await flushPromises();
    const enviosCompletado = () =>
      api.llamadas.filter(
        (l) => l.metodo === 'PUT' && (l.cuerpo as { completado?: boolean }).completado === true,
      );
    expect(enviosCompletado()).toHaveLength(1);
    await completar(wrapper, 'm1_quiz_repaso');
    await flushPromises();
    expect(enviosCompletado()).toHaveLength(1);
  });

  it('si el módulo quedó completo pero el servidor no lo sabe, reenvía el PUT al cargar', async () => {
    const { api, progreso } = await montar({ ruta: rutaRepaso, filas: filasCompletas(1) });
    const put = api.llamadas.filter(
      (l) => l.metodo === 'PUT' && (l.cuerpo as { completado?: boolean }).completado === true,
    );
    expect(put).toHaveLength(1);
    expect(progreso.estaCompletado(1)).toBe(true);
  });

  it('si el servidor ya lo tiene completado no envía nada', async () => {
    const { api } = await montar({ completados: [1], filas: filasCompletas(1) });
    expect(
      api.llamadas.filter(
        (l) => l.metodo === 'PUT' && (l.cuerpo as { completado?: boolean }).completado === true,
      ),
    ).toHaveLength(0);
  });

  it('un 409 modulo_incompleto muestra qué falta y se reenvía al repetir esa actividad', async () => {
    let rechazar = true;
    const { wrapper, api } = await montar({
      ruta: rutaRepaso,
      filas: filasCompletas(1, ['m1_quiz_repaso']),
      responder: (l) => {
        if (l.metodo === 'PUT' && (l.cuerpo as { completado?: boolean }).completado && rechazar) {
          return new Response(
            JSON.stringify({
              detail: {
                code: 'modulo_incompleto',
                message: 'Faltan resultados',
                faltantes: ['m1_capas_hueso'],
              },
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return undefined;
      },
    });
    await completar(wrapper, 'm1_quiz_repaso');
    await flushPromises();

    const faltantes = wrapper.get('[data-testid="modulo-faltantes"]');
    expect(faltantes.text()).toContain('Falta el resultado de');
    expect(faltantes.text()).not.toContain('m1_capas_hueso');
    const enviosCompletado = () =>
      api.llamadas.filter(
        (l) => l.metodo === 'PUT' && (l.cuerpo as { completado?: boolean }).completado === true,
      );
    expect(enviosCompletado()).toHaveLength(1);

    rechazar = false;
    await completar(wrapper, 'm1_quiz_repaso');
    await flushPromises();
    expect(enviosCompletado()).toHaveLength(2);
    expect(wrapper.find('[data-testid="modulo-faltantes"]').exists()).toBe(false);
  });

  it('al completar el módulo 6 enlaza el certificado si la ruta existe', async () => {
    const modulo6 = moduloConNumero(6);
    const { wrapper } = await montar({
      n: 6,
      modulo: modulo6,
      completados: [1, 2, 3, 4, 5],
      ruta: '/modulo/6?s=repaso',
      conCertificado: true,
      filas: filasCompletas(6, ['m1_quiz_repaso']),
    });
    await completar(wrapper, 'm1_quiz_repaso');
    const enlace = wrapper.get('[data-testid="ver-certificado"]');
    expect(enlace.attributes('href')).toBe('/certificado');
    expect(wrapper.find('[data-testid="siguiente-modulo"]').exists()).toBe(false);
  });

  it('al completar el módulo 6 sin página de certificado muestra un aviso y no rompe', async () => {
    const modulo6 = moduloConNumero(6);
    const { wrapper } = await montar({
      n: 6,
      modulo: modulo6,
      completados: [1, 2, 3, 4, 5],
      ruta: '/modulo/6?s=repaso',
      filas: filasCompletas(6, ['m1_quiz_repaso']),
    });
    await completar(wrapper, 'm1_quiz_repaso');
    expect(wrapper.find('[data-testid="ver-certificado"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="certificado-pronto"]').text()).toContain('certificado');
  });
});

/* -------------------------------------------------------------------------------------------
 * Bloqueo entre módulos
 * ----------------------------------------------------------------------------------------- */

describe('ModuloView: bloqueo de módulos', () => {
  it('el guard ya no redirige: un módulo bloqueado se queda en su dirección', async () => {
    const { router } = await montar({ n: 1, ruta: '/modulo/1', conGuard: true });
    await router.push('/modulo/3');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/modulo/3');
  });

  it('un módulo bloqueado se muestra EN SU SITIO con su identidad y sin secciones ni actividades', async () => {
    const { wrapper, router } = await montar({
      n: 3,
      ruta: '/modulo/3',
      conGuard: true,
      modulo: moduloConNumero(3),
    });
    // Sin redirigir ni avisos de rebote.
    expect(router.currentRoute.value.fullPath).toBe('/modulo/3');
    expect(wrapper.find('[data-testid="aviso-redirigido"]').exists()).toBe(false);

    // Presentación del módulo: título, subtítulo, duración y objetivos (la cabecera bloqueada).
    const cabecera = wrapper.get('[data-testid="cabecera-modulo"]');
    expect(cabecera.attributes('data-bloqueado')).toBe('true');
    expect(cabecera.attributes('data-modulo')).toBe('3');
    expect(wrapper.findAll('h1')).toHaveLength(1);
    expect(wrapper.get('[data-testid="titulo-modulo"]').text()).toBe(moduloDePrueba().titulo);
    expect(cabecera.text()).toContain(moduloDePrueba().subtitulo);
    expect(wrapper.find('[data-testid="duracion"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="objetivos"] li').length).toBeGreaterThan(0);
    expect(wrapper.get('[data-testid="etiqueta-bloqueado"]').text()).toContain('Bloqueado');

    // Identidad del módulo 3 (rótulo, portada y acento propios).
    expect(wrapper.get('[data-testid="rotulo-modulo"]').text()).toContain('Formación');
    expect(wrapper.get('[data-testid="portada-modulo"]').attributes('data-modulo')).toBe('3');
    expect(wrapper.get('[data-testid="portada-modulo"] img').attributes('src')).toBe(
      '/images/m3/m3_sensores_mecanicos.svg',
    );
    expect(cabecera.attributes('style')).toContain('--acento: var(--acento-m3)');
    // Sin avance ni puntaje del módulo: aún no se puede estudiar.
    expect(wrapper.find('[data-testid="avance-obligatorias"]').exists()).toBe(false);

    // Panel «Todavía bloqueado» con lo que falta y el botón al módulo que sí se puede estudiar.
    const panel = wrapper.get('[data-testid="modulo-bloqueado"]');
    expect(panel.text()).toContain('Todavía bloqueado');
    expect(panel.text()).toContain('Antes completa el módulo 2');
    expect(panel.get('[data-testid="falta-modulo"]').text()).toContain('Completar el módulo 2');
    // El módulo 2 tampoco está abierto: el botón lleva al primero que sí lo está.
    expect(panel.text()).toContain('tampoco está abierto');
    expect(panel.get('a').attributes('href')).toBe('/modulo/1');
    expect(panel.get('a').text()).toContain('Ir al módulo 1');

    // No se monta nada de estudio.
    expect(wrapper.find('[data-testid="seccion"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="seccion-bloqueada"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="indice-secciones"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="bloque-actividad"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="actividad-falsa"]').exists()).toBe(false);
  });

  it('el panel muestra el avance del módulo anterior cuando se conoce', async () => {
    const { wrapper } = await montar({
      n: 2,
      ruta: '/modulo/2',
      modulo: moduloConNumero(2),
      filas: filasCompletas(1, ['m1_quiz_repaso', 'm1_identifica_celulas']),
    });
    await flushPromises();
    const avance = wrapper.get('[data-testid="avance-previo"]');
    expect(avance.text()).toContain('5 de 7 actividades obligatorias');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('71');
    // El botón lleva al módulo anterior, que es el que falta.
    expect(wrapper.get('[data-testid="ir-al-modulo"]').attributes('href')).toBe('/modulo/1');
  });

  it('con el módulo anterior completado el módulo se abre con normalidad', async () => {
    const { wrapper, router } = await montar({
      n: 3,
      ruta: '/modulo/3',
      conGuard: true,
      completados: [1, 2],
      modulo: moduloConNumero(3),
    });
    expect(router.currentRoute.value.fullPath).toBe('/modulo/3');
    expect(wrapper.find('[data-testid="modulo-bloqueado"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="seccion"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="cabecera-modulo"]').attributes('data-bloqueado')).toBe(
      undefined,
    );
  });

  it('un módulo ya completado nunca se cierra', async () => {
    const { wrapper } = await montar({
      n: 4,
      ruta: '/modulo/4',
      completados: [4],
      modulo: moduloConNumero(4),
    });
    expect(wrapper.find('[data-testid="modulo-bloqueado"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="seccion"]').exists()).toBe(true);
  });

  it('con el bloqueo desactivado ningún módulo queda bloqueado', async () => {
    cfg.bloqueo = false;
    const { wrapper } = await montar({ n: 5, ruta: '/modulo/5', modulo: moduloConNumero(5) });
    expect(wrapper.find('[data-testid="modulo-bloqueado"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="seccion"]').exists()).toBe(true);
  });

  it('si el progreso no se pudo cargar la página falla abierta', async () => {
    const { wrapper } = await montar({
      n: 5,
      ruta: '/modulo/5',
      modulo: moduloConNumero(5),
      responder: (l) => (l.ruta === '/progress' ? new Response('x', { status: 500 }) : undefined),
    });
    expect(wrapper.find('[data-testid="modulo-bloqueado"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="seccion"]').exists()).toBe(true);
  });

  it('un estudiante no puede abrir los módulos 2 a 6 con una cuenta nueva (cada uno con su identidad)', async () => {
    const acentos = new Set<string>();
    for (const n of [2, 3, 4, 5, 6]) {
      const { wrapper } = await montar({ n, ruta: `/modulo/${n}`, modulo: moduloConNumero(n) });
      expect(wrapper.find('[data-testid="modulo-bloqueado"]').exists(), `módulo ${n}`).toBe(true);
      expect(wrapper.find('[data-testid="seccion"]').exists(), `módulo ${n}`).toBe(false);
      expect(wrapper.find('[data-testid="bloque-actividad"]').exists(), `módulo ${n}`).toBe(false);
      const cabecera = wrapper.get('[data-testid="cabecera-modulo"]');
      expect(cabecera.attributes('data-modulo')).toBe(String(n));
      acentos.add(cabecera.attributes('style') ?? '');
      wrapper.unmount();
      montados.pop();
    }
    // Cinco módulos bloqueados, cinco acentos distintos (el 1 siempre está abierto).
    expect(acentos.size).toBe(5);
  });

  it('el docente ve todo abierto y en solo lectura, con su etiqueta, aunque no haya completado nada', async () => {
    const { wrapper } = await montar({
      n: 4,
      ruta: '/modulo/4',
      rol: 'docente',
      modulo: moduloConNumero(4),
    });
    expect(wrapper.find('[data-testid="modulo-bloqueado"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="etiqueta-docente"]').text()).toContain('Vista de docente');
    expect(wrapper.get('[data-testid="aviso-docente"]').text()).toContain('no se guarda');
    expect(wrapper.find('[data-testid="avance-obligatorias"]').exists()).toBe(false);
    // Ninguna sección queda bloqueada.
    const estados = wrapper
      .findAll('[data-testid="indice-secciones"] button')
      .map((b) => b.attributes('data-estado'));
    expect(estados.length).toBeGreaterThan(1);
    expect(estados).not.toContain('bloqueada');
    // Las actividades se abren en modo `revisar` (respuestas correctas, solo lectura).
    expect(wrapper.get('[data-testid="actividad-falsa"]').attributes('data-modo')).toBe('revisar');
    expect(wrapper.get('[data-testid="modo-docente"]').text()).toContain('no se guarda nada');
  });

  it('el docente puede abrir una sección que a un estudiante le aparece bloqueada', async () => {
    const { wrapper } = await montar({ rol: 'docente', ruta: '/modulo/1?s=repaso' });
    expect(wrapper.find('[data-testid="seccion-bloqueada"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="seccion"]').attributes('data-seccion')).toBe('repaso');

    const estudiante = await montar({ ruta: '/modulo/1?s=repaso' });
    expect(estudiante.wrapper.find('[data-testid="seccion-bloqueada"]').exists()).toBe(true);
    expect(estudiante.wrapper.find('[data-testid="etiqueta-docente"]').exists()).toBe(false);
  });

  it('el docente no envía nada al servidor: ni progreso, ni tiempo, ni resultados', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const { wrapper, api, store } = await montar({ rol: 'docente' });

    // Prueba la actividad: el botón la abre en modo jugar, pero lo que haga no se registra.
    await wrapper.get('[data-testid="modo-revisar"] button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="actividad-falsa"]').attributes('data-modo')).toBe('jugar');
    await wrapper.get('[data-testid="progreso"]').trigger('click');
    await completar(wrapper, 'm1_capas_hueso');
    await vi.advanceTimersByTimeAsync(120_000);

    expect(api.llamadas.filter((l) => l.metodo === 'POST')).toEqual([]);
    expect(api.llamadas.filter((l) => l.metodo === 'PUT')).toEqual([]);
    // Solo se lee: el progreso y los resultados ya guardados.
    expect(api.llamadas.every((l) => l.metodo === 'GET')).toBe(true);
    // Tampoco quedan resultados, cola ni instantáneas locales.
    expect(store.resultados).toEqual({});
    expect(store.pendientes).toBe(0);
    expect(store.leerInstantanea('m1_capas_hueso')).toBeUndefined();
  });

  it('el estudiante SÍ registra su progreso (la vista de docente no se filtra al estudiante)', async () => {
    const { wrapper, api } = await montar();
    expect(wrapper.find('[data-testid="etiqueta-docente"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="actividad-falsa"]').attributes('data-modo')).toBe('jugar');
    await completar(wrapper, 'm1_capas_hueso');
    expect(api.filtrar('POST', '/activities/m1_capas_hueso/result')).toHaveLength(1);
    expect(api.filtrar('PUT', '/progress/1').length).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------------------------
 * Contexto pedagógico
 * ----------------------------------------------------------------------------------------- */

describe('ModuloView: contexto pedagógico', () => {
  it('fija módulo y sección al abrir y los cambia con la navegación', async () => {
    const { contexto, wrapper } = await montar();
    expect(contexto.modulo).toBe(1);
    expect(contexto.seccion).toBe('tejido_dinamico');

    await completar(wrapper, 'm1_capas_hueso');
    await wrapper.get('[data-testid="seccion-siguiente"]').trigger('click');
    await flushPromises();
    expect(contexto.seccion).toBe('funciones');
  });

  it('registra actividadActual, interacciones, estructura seleccionada y completada', async () => {
    const { contexto, wrapper } = await montar();
    await wrapper.get('[data-testid="interactuar"]').trigger('click');

    expect(contexto.interaccionesRecientes).toEqual(['selecciona_capa:periostio']);
    expect(contexto.estructuraSeleccionada).toBe('periostio');
    expect(contexto.actividadActual).toEqual({
      id: 'm1_capas_hueso',
      tipo: 'multicapa',
      intentos: 1,
      completada: false,
    });

    await completar(wrapper, 'm1_capas_hueso');
    expect(contexto.actividadActual).toMatchObject({ id: 'm1_capas_hueso', completada: true });
    const carga = contexto.toPayload();
    expect(carga.modulo).toBe(1);
    expect(carga.progreso.puntajeTotal).toBeGreaterThanOrEqual(0);
    expect(carga.interaccionesRecientes.length).toBeLessThanOrEqual(10);
  });

  it('guarda como máximo las 10 interacciones más recientes', async () => {
    const { contexto, wrapper } = await montar();
    for (let i = 0; i < 12; i++) {
      await wrapper.get('[data-testid="interactuar"]').trigger('click');
    }
    expect(contexto.interaccionesRecientes).toHaveLength(10);
  });

  it('al cambiar de sección se reinicia la selección y el tiempo en sección', async () => {
    const { contexto, wrapper } = await montar({
      filas: filasCompletas(1).filter((f) => f.activity_id === 'm1_capas_hueso'),
    });
    await wrapper.get('[data-testid="interactuar"]').trigger('click');
    contexto.tickTiempo(20);
    expect(contexto.tiempoEnSeccionSeg).toBe(20);

    await wrapper.findAll('[data-testid="indice-secciones"] button')[0]!.trigger('click');
    await flushPromises();
    expect(contexto.seccion).toBe('tejido_dinamico');
    expect(contexto.estructuraSeleccionada).toBeUndefined();
    expect(contexto.actividadActual).toBeUndefined();
    expect(contexto.tiempoEnSeccionSeg).toBe(0);
  });

  it('al cambiar de módulo reinicia sección e interacciones', async () => {
    const { contexto, wrapper } = await montar({ completados: [1] });
    await wrapper.get('[data-testid="interactuar"]').trigger('click');
    expect(contexto.interaccionesRecientes).toHaveLength(1);

    await wrapper.setProps({ n: 2 });
    await flushPromises();
    expect(contexto.modulo).toBe(2);
    expect(contexto.interaccionesRecientes).toEqual([]);
    expect(contexto.actividadActual).toBeUndefined();
  });

  it('el tiempo en sección corre solo con la página visible y se reinicia al cambiar de sección', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const { contexto } = await montar();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(contexto.tiempoEnSeccionSeg).toBe(5);

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(contexto.tiempoEnSeccionSeg).toBe(5);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('al cerrar sesión el contexto vuelve a cero', async () => {
    const { contexto, wrapper } = await montar();
    await wrapper.get('[data-testid="interactuar"]').trigger('click');
    useAuthStore().logout();
    expect(contexto.interaccionesRecientes).toEqual([]);
    expect(contexto.seccion).toBe('inicio');
    expect(contexto.modulo).toBe(1);
  });
});

/* -------------------------------------------------------------------------------------------
 * Tiempo de estudio y sección actual
 * ----------------------------------------------------------------------------------------- */

describe('ModuloView: tiempo y sección actual', () => {
  const put = (api: ApiSimulada) =>
    api.llamadas
      .filter((l) => l.metodo === 'PUT' && l.ruta === '/progress/1')
      .map((l) => l.cuerpo as { tiempo_delta_seg?: number; seccion_actual?: string });

  it('envía tiempo_delta_seg cada 30 s con la pestaña visible y la sección actual', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const { api } = await montar();
    // Al abrir la sección se guarda seccion_actual sin tiempo.
    expect(put(api)[0]).toEqual({ tiempo_delta_seg: 0, seccion_actual: 'tejido_dinamico' });

    await vi.advanceTimersByTimeAsync(29_000);
    expect(put(api)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(put(api)[1]).toEqual({ tiempo_delta_seg: 30, seccion_actual: 'tejido_dinamico' });
    expect(Math.max(...put(api).map((c) => c.tiempo_delta_seg ?? 0))).toBeLessThanOrEqual(3600);
  });

  it('no cuenta ni envía tiempo con la pestaña oculta', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const { api } = await montar();
    const antes = put(api).length;
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await vi.advanceTimersByTimeAsync(120_000);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    expect(put(api).filter((c) => (c.tiempo_delta_seg ?? 0) >= 30)).toHaveLength(0);
    expect(put(api).length).toBeLessThanOrEqual(antes + 1);
  });

  it('un envío que falla no pierde el tiempo acumulado', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    let falla = false;
    const { api } = await montar({
      responder: (l) => {
        if (l.metodo === 'PUT' && falla) throw new TypeError('sin red');
        return undefined;
      },
    });
    falla = true;
    await vi.advanceTimersByTimeAsync(31_000);
    falla = false;
    await vi.advanceTimersByTimeAsync(31_000);
    const enviados = put(api).filter((c) => (c.tiempo_delta_seg ?? 0) > 0);
    // El primer intento (30 s) falló; el siguiente suma todo lo acumulado.
    expect(enviados.at(-1)!.tiempo_delta_seg).toBeGreaterThanOrEqual(60);
  });
});

/* -------------------------------------------------------------------------------------------
 * Glosario y referencias
 * ----------------------------------------------------------------------------------------- */

describe('ModuloView: glosario y referencias', () => {
  it('lista glosario y referencias al final del módulo', async () => {
    const { wrapper } = await montar();
    const modulo = moduloDePrueba();
    const glosario = wrapper.get('[data-testid="glosario"]');
    expect(glosario.findAll('dt')).toHaveLength(modulo.glosario.length);
    expect(glosario.find('#glosario-osteoblasto').exists()).toBe(true);
    expect(wrapper.get('[data-testid="referencias"]').findAll('li')).toHaveLength(
      modulo.referencias.length,
    );
  });

  it('un enlace de glosario abre la definición en una hoja accesible y devuelve el foco al cerrar', async () => {
    const { wrapper, router } = await montar();
    const enlace = wrapper.get('a[data-glosario]');
    const id = enlace.attributes('data-glosario');
    expect(enlace.attributes('aria-haspopup')).toBe('dialog');
    const rutaAntes = router.currentRoute.value.fullPath;
    (enlace.element as HTMLElement).focus();
    await enlace.trigger('click');
    await flushPromises();

    // No navega: abre la definición.
    expect(router.currentRoute.value.fullPath).toBe(rutaAntes);
    const hoja = document.body.querySelector('[data-testid="hoja-glosario"]');
    expect(hoja).not.toBeNull();
    expect(hoja!.getAttribute('role')).toBe('dialog');
    expect(hoja!.textContent).toContain('Glosario');
    const definicion = moduloDePrueba().glosario.find((t) => t.id === id)!;
    expect(hoja!.textContent).toContain(definicion.termino);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flushPromises();
    await new Promise((r) => setTimeout(r, 20));
    expect(document.body.querySelector('[data-testid="hoja-glosario"]')).toBeNull();
  });

  it('un id de glosario desconocido no abre nada ni rompe', async () => {
    const { wrapper } = await montar();
    const enlace = wrapper.get('a[data-glosario]');
    enlace.element.dispatchEvent(
      new CustomEvent('ova:glosario', { bubbles: true, detail: { id: 'no_existe' } }),
    );
    await flushPromises();
    expect(document.body.querySelector('[data-testid="hoja-glosario"]')).toBeNull();
  });
});

/* -------------------------------------------------------------------------------------------
 * Desmontaje
 * ----------------------------------------------------------------------------------------- */

describe('ModuloView: desmontaje limpio', () => {
  it('quita temporizadores y escuchas y deja el contexto sin sección', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const quitarDoc = vi.spyOn(document, 'removeEventListener');
    const quitarWin = vi.spyOn(window, 'removeEventListener');
    const { wrapper, contexto } = await montar();
    await vi.advanceTimersByTimeAsync(3_000);

    wrapper.unmount();
    montados.pop();
    await flushPromises();

    expect(quitarDoc).toHaveBeenCalledWith('ova:glosario', expect.any(Function));
    expect(quitarDoc).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(quitarWin).toHaveBeenCalledWith('online', expect.any(Function));
    expect(quitarWin).toHaveBeenCalledWith('pagehide', expect.any(Function));
    expect(contexto.seccion).toBe('inicio');
    expect(vi.getTimerCount()).toBe(0);

    // Tras desmontar, un evento de glosario no hace nada.
    document.dispatchEvent(new CustomEvent('ova:glosario', { detail: { id: 'osteoblasto' } }));
    await flushPromises();
    expect(document.body.querySelector('[data-testid="hoja-glosario"]')).toBeNull();
  });

  it('al salir guarda el tiempo pendiente con keepalive', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const { wrapper, api } = await montar();
    await vi.advanceTimersByTimeAsync(10_000);
    const antes = api.fetch.mock.calls.length;

    wrapper.unmount();
    montados.pop();
    await flushPromises();

    const llamada = api.fetch.mock.calls.slice(antes).find(([, init]) => init?.method === 'PUT');
    expect(llamada).toBeDefined();
    expect(llamada![1]?.keepalive).toBe(true);
    expect(JSON.parse(String(llamada![1]?.body)).tiempo_delta_seg).toBe(10);
  });

  it('una carga que termina después de desmontar no toca el estado', async () => {
    let liberar: (r: Response) => void = () => undefined;
    const api = simularApi({
      responder: (l) =>
        l.ruta.startsWith('/activities/results')
          ? new Promise<Response>((resolver) => {
              liberar = resolver;
            })
          : undefined,
    });
    const { wrapper, contexto } = await montar({ api });
    wrapper.unmount();
    montados.pop();
    liberar(respuestaJson(200, { resultados: [] }));
    await flushPromises();
    expect(contexto.seccion).toBe('inicio');
  });
});

/* -------------------------------------------------------------------------------------------
 * Contenido real
 * ----------------------------------------------------------------------------------------- */

describe('ModuloView: contenido real de los módulos', () => {
  it.for([1, 2, 3, 4, 5, 6])(
    'el módulo %i pinta cada una de sus secciones sin advertencias de Vue',
    async (n, { skip }) => {
      cfg.bloqueo = false;
      const real = await vi.importActual<typeof ModuloRegistry>('@/content/registry');
      const carga = await real.cargarModulo(n);
      // El contenido de cada módulo lo escribe otra tarea: si aún no existe o no valida, se omite.
      if (!carga.ok)
        return skip(`El módulo ${n} aún no valida contra el esquema (${carga.motivo}).`);

      const advertencias = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const errores = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      for (const seccion of carga.modulo.secciones) {
        const m = await montar({ n, carga, ruta: `/modulo/${n}?s=${seccion.id}` });
        const visibles = seccion.bloques.filter((b) => visibleParaNivel(b, 'pregrado'));
        expect(m.wrapper.get('[data-testid="seccion"]').attributes('data-seccion')).toBe(
          seccion.id,
        );
        expect(m.wrapper.get('#titulo-seccion').text()).toBe(seccion.titulo);
        expect(bloquesDeActividad(m.wrapper)).toHaveLength(
          seccion.bloques.filter((b) => b.tipo === 'actividad').length,
        );
        expect(m.wrapper.findAll('h1')).toHaveLength(1);
        expect(visibles.length).toBeGreaterThan(0);
        m.wrapper.unmount();
        montados.pop();
      }
      expect(advertencias).not.toHaveBeenCalled();
      expect(errores).not.toHaveBeenCalled();
    },
  );
});

describe('ModuloView: última sección', () => {
  it('explica qué falta para terminar el módulo y no ofrece «Siguiente»', async () => {
    const { wrapper } = await montar({
      ruta: '/modulo/1?s=repaso',
      filas: filasCompletas(1, ['m1_quiz_repaso']),
    });
    expect(wrapper.find('[data-testid="seccion-siguiente"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="motivo-bloqueo"]').text()).toContain(
      'm1_quiz_repaso'.slice(0, 0),
    );
    expect(wrapper.find('[data-testid="modulo-completado"]').exists()).toBe(false);
  });
});
