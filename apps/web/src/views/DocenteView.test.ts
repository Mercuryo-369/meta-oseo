import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { respuestaError, respuestaJson, usuarioDePrueba } from '@/test/utils';
import {
  ACTIVIDADES,
  ACTIVIDADES_VACIAS,
  DETALLE,
  MENTOR,
  MENTOR_VACIO,
  PAGINA_1,
  PAGINA_2,
  PAGINA_BUSQUEDA_EXACTA,
  PAGINA_SIN_RESULTADOS,
  RESUMEN,
  RESUMEN_VACIO,
} from '@/test/docenteFixtures';
import DocenteView from './DocenteView.vue';

// La descarga real crea un enlace y hace clic: aquí solo interesa que se le entregue el archivo.
const guardarBlob = vi.fn();
vi.mock('@/components/docente/descarga', () => ({
  guardarBlob: (...args: unknown[]) => guardarBlob(...args),
}));

type Manejador = (url: URL, init?: RequestInit) => Response | Promise<Response>;

const fetchMock = vi.fn<typeof fetch>();
let manejadores: Record<string, Manejador> = {};

function manejadoresPorDefecto(): Record<string, Manejador> {
  return {
    overview: () => respuestaJson(200, RESUMEN),
    students: () => respuestaJson(200, PAGINA_1),
    student: () => respuestaJson(200, DETALLE),
    actividades: () => respuestaJson(200, ACTIVIDADES),
    mentor: () => respuestaJson(200, MENTOR),
    csv: () =>
      new Response('﻿id_estudiante,nombre\r\n1,Ana\r\n', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="progreso_ova_2026-09-24.csv"',
        },
      }),
  };
}

function clave(url: URL): string {
  const p = url.pathname;
  if (p.endsWith('/teacher/overview')) return 'overview';
  if (p.endsWith('/teacher/students')) return 'students';
  if (/\/teacher\/students\/\d+$/.test(p)) return 'student';
  if (p.endsWith('/teacher/activities/stats')) return 'actividades';
  if (p.endsWith('/teacher/mentor/usage')) return 'mentor';
  if (p.endsWith('/teacher/export/progress.csv')) return 'csv';
  return 'desconocida';
}

/** Solicitudes hechas al panel, como URL relativa (`/api/teacher/...?...`). */
function llamadas(prefijo = ''): string[] {
  return fetchMock.mock.calls
    .map((c) => String(c[0]))
    .filter((u) => u.includes(`/teacher/${prefijo}`));
}

async function montar(rol: 'docente' | 'estudiante' = 'docente'): Promise<VueWrapper> {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'tok-docente';
  auth.establecerUsuario(usuarioDePrueba({ rol }));
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'inicio', component: { template: '<div />' } }],
  });
  await router.push('/');
  const wrapper = mount(DocenteView, {
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}

async function irAPestana(wrapper: VueWrapper, etiqueta: string): Promise<void> {
  const pestana = wrapper.findAll('[role="tab"]').find((t) => t.text() === etiqueta);
  expect(pestana, `pestaña ${etiqueta}`).toBeTruthy();
  await pestana!.trigger('click');
  await flushPromises();
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  guardarBlob.mockReset();
  manejadores = manejadoresPorDefecto();
  fetchMock.mockReset();
  fetchMock.mockImplementation((entrada, init) => {
    const url = new URL(String(entrada), 'http://localhost');
    const m = manejadores[clave(url)];
    if (!m) return Promise.reject(new TypeError('sin red'));
    return Promise.resolve(m(url, init));
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('permisos', () => {
  it('un estudiante ve "acceso solo para docentes" y no dispara ninguna petición', async () => {
    const wrapper = await montar('estudiante');

    expect(wrapper.get('[data-testid="sin-acceso"]').text()).toContain('Acceso solo para docentes');
    expect(wrapper.find('h1').text()).toBe('Acceso solo para docentes');
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('a[href="/"]').text()).toContain('Ir al inicio');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un docente ve el panel con sus cinco pestañas y pide el resumen con su token', async () => {
    const wrapper = await montar();

    expect(wrapper.find('h1').text()).toBe('Panel del docente');
    const pestanas = wrapper.findAll('[role="tab"]').map((t) => t.text());
    expect(pestanas).toEqual(['Resumen', 'Estudiantes', 'Actividades', 'Mentor', 'Exportar']);
    expect(llamadas('overview')).toHaveLength(1);
    const cabeceras = fetchMock.mock.calls[0]![1]!.headers as Headers;
    expect(cabeceras.get('Authorization')).toBe('Bearer tok-docente');
  });
});

describe('pestañas y accesibilidad', () => {
  it('la barra de pestañas oculta su barra de desplazamiento pero sigue desplazándose', async () => {
    const wrapper = await montar();
    const lista = wrapper.get('[role="tablist"]');
    const clases = lista.classes().join(' ');
    // Se oculta la barra nativa (Firefox y WebKit) y se conserva el desplazamiento horizontal.
    expect(clases).toContain('overflow-x-auto');
    expect(clases).toContain('[scrollbar-width:none]');
    expect(clases).toContain('[&::-webkit-scrollbar]:hidden');
    // Las pestañas siguen siendo enfocables por teclado y con el foco visible dentro del recuadro.
    for (const t of wrapper.findAll('[role="tab"]')) {
      expect(t.classes().join(' ')).toContain('focus-visible:outline-offset-[-2px]');
      expect(t.classes()).toContain('min-h-11');
    }
  });

  it('un degradado avisa de que hay más pestañas hacia el lado que desborda', async () => {
    const wrapper = await montar();
    const lista = wrapper.get('[role="tablist"]').element as HTMLElement;
    const izquierdo = () => wrapper.get('[data-testid="degradado-izquierdo"]');
    const derecho = () => wrapper.get('[data-testid="degradado-derecho"]');

    // Sin desbordamiento (happy-dom no mide) no hay degradados visibles.
    expect(derecho().isVisible()).toBe(false);
    expect(izquierdo().isVisible()).toBe(false);

    // Barra más estrecha que sus pestañas y al principio: solo el borde derecho.
    Object.defineProperty(lista, 'clientWidth', { value: 300, configurable: true });
    Object.defineProperty(lista, 'scrollWidth', { value: 520, configurable: true });
    Object.defineProperty(lista, 'scrollLeft', { value: 0, configurable: true, writable: true });
    await wrapper.get('[role="tablist"]').trigger('scroll');
    expect(derecho().isVisible()).toBe(true);
    expect(izquierdo().isVisible()).toBe(false);

    // A la mitad: ambos. Al final: solo el izquierdo.
    lista.scrollLeft = 100;
    await wrapper.get('[role="tablist"]').trigger('scroll');
    expect(izquierdo().isVisible()).toBe(true);
    expect(derecho().isVisible()).toBe(true);
    lista.scrollLeft = 220;
    await wrapper.get('[role="tablist"]').trigger('scroll');
    expect(izquierdo().isVisible()).toBe(true);
    expect(derecho().isVisible()).toBe(false);

    // Decorativos: ni lectores de pantalla ni clics.
    expect(izquierdo().attributes('aria-hidden')).toBe('true');
    expect(derecho().classes()).toContain('pointer-events-none');
  });

  it('la fecha del resumen termina en un solo punto (sin «a. m..»)', async () => {
    const wrapper = await montar();
    const texto = wrapper.get('#titulo-resumen').element.parentElement!.textContent ?? '';
    expect(texto).toMatch(/Datos al .+\. Solo cuentan los estudiantes\./);
    expect(texto).not.toContain('..');
  });

  it('sigue el patrón ARIA: una pestaña seleccionada, un panel etiquetado por ella', async () => {
    const wrapper = await montar();

    const pestanas = wrapper.findAll('[role="tab"]');
    expect(pestanas.filter((t) => t.attributes('aria-selected') === 'true')).toHaveLength(1);
    expect(pestanas[0]!.attributes('tabindex')).toBe('0');
    expect(pestanas[1]!.attributes('tabindex')).toBe('-1');
    const panel = wrapper.get('[role="tabpanel"]');
    expect(panel.attributes('aria-labelledby')).toBe(pestanas[0]!.attributes('id'));
    expect(pestanas[0]!.attributes('aria-controls')).toBe(panel.attributes('id'));
    expect(wrapper.get('[role="tablist"]').attributes('aria-label')).toBeTruthy();
  });

  it('las flechas, Inicio y Fin cambian de pestaña con el teclado', async () => {
    const wrapper = await montar();
    const lista = wrapper.get('[role="tablist"]');

    await lista.trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.get('[aria-selected="true"]').text()).toBe('Estudiantes');
    await lista.trigger('keydown', { key: 'End' });
    expect(wrapper.get('[aria-selected="true"]').text()).toBe('Exportar');
    await lista.trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.get('[aria-selected="true"]').text()).toBe('Resumen');
    await lista.trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.get('[aria-selected="true"]').text()).toBe('Exportar');
    await lista.trigger('keydown', { key: 'Home' });
    expect(wrapper.get('[aria-selected="true"]').text()).toBe('Resumen');
    await flushPromises();
  });

  it('cada sección tiene un encabezado y toda tabla tiene título y encabezados de columna', async () => {
    const wrapper = await montar();
    for (const etiqueta of ['Estudiantes', 'Actividades', 'Mentor']) {
      await irAPestana(wrapper, etiqueta);
    }
    for (const etiqueta of ['Resumen', 'Actividades', 'Mentor']) {
      await irAPestana(wrapper, etiqueta);
      const panel = wrapper.get('[role="tabpanel"]');
      expect(panel.find('h2').exists()).toBe(true);
      for (const tabla of panel.findAll('table')) {
        expect(tabla.find('caption').text()).not.toBe('');
        expect(tabla.findAll('th[scope="col"]').length).toBeGreaterThan(0);
      }
      // Las regiones con desplazamiento son alcanzables con teclado y tienen nombre.
      for (const region of panel.findAll('[role="region"]')) {
        expect(region.attributes('tabindex')).toBe('0');
        expect(region.attributes('aria-label')).toBeTruthy();
      }
    }
  });

  it('los botones y campos tienen nombre accesible', async () => {
    const wrapper = await montar();
    await irAPestana(wrapper, 'Estudiantes');
    const panel = wrapper.get('[role="tabpanel"]');
    for (const boton of panel.findAll('button')) {
      expect((boton.attributes('aria-label') ?? boton.text()).trim()).not.toBe('');
    }
    expect(panel.get('#busqueda-estudiantes').attributes('id')).toBe('busqueda-estudiantes');
    expect(panel.find('label[for="busqueda-estudiantes"]').exists()).toBe(true);
    expect(panel.find('label[for="orden-estudiantes"]').exists()).toBe(true);
  });
});

describe('Resumen', () => {
  it('muestra las tarjetas, el gráfico de módulos completados y el tiempo por módulo', async () => {
    const wrapper = await montar();
    const texto = wrapper.get('[role="tabpanel"]').text();

    expect(texto).toContain('Estudiantes5');
    expect(texto).toContain('Activos en 7 días2');
    expect(texto).toContain('Activos en 30 días4');
    expect(texto).toContain('Puntaje promedio124,0');
    expect(texto).toContain('Puntaje mediana60,5');

    const graficos = wrapper.findAll('figure');
    expect(graficos).toHaveLength(2);
    const [modulos, tiempo] = graficos;
    expect(modulos!.findAll('[data-testid="barra"]')).toHaveLength(7);
    expect(modulos!.get('[role="img"]').attributes('aria-label')).toContain(
      '0 módulos completados: 2',
    );
    // Alternativa en tabla: 7 filas con su valor.
    expect(modulos!.findAll('tbody tr')).toHaveLength(7);
    expect(modulos!.findAll('tbody tr')[6]!.text()).toContain('6 módulos completados');
    // Tiempo: 367 s = 6 min 7 s; sin datos se muestra como 0 s en el gráfico.
    expect(tiempo!.text()).toContain('6 min 7 s');
    expect(tiempo!.text()).toContain('1 h 5 min');
    expect(tiempo!.findAll('tbody tr')).toHaveLength(6);
  });

  it('las barras tienen valor en texto (no dependen solo del color)', async () => {
    const wrapper = await montar();
    const valores = wrapper.findAll('figure')[0]!.findAll('[data-testid="valor-barra"]');
    expect(valores.map((v) => v.text())).toEqual(['2', '1', '1', '0', '0', '0', '1']);
  });

  it('sin estudiantes muestra un estado vacío en español', async () => {
    manejadores.overview = () => respuestaJson(200, RESUMEN_VACIO);
    const wrapper = await montar();
    expect(wrapper.get('[role="tabpanel"]').text()).toContain('Todavía no hay estudiantes');
    expect(wrapper.find('figure').exists()).toBe(false);
  });

  it('muestra el error y permite reintentar', async () => {
    let intento = 0;
    manejadores.overview = () =>
      ++intento === 1
        ? respuestaError(500, 'error_servidor', 'Falla del servidor')
        : respuestaJson(200, RESUMEN);
    const wrapper = await montar();

    expect(wrapper.get('[role="alert"]').text()).toContain('Falla del servidor');
    await wrapper.get('[role="alert"] button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Activos en 7 días');
  });

  it('muestra el estado de carga mientras espera', async () => {
    let resolver: (r: Response) => void = () => {};
    manejadores.overview = () =>
      new Promise<Response>((r) => (resolver = r)) as unknown as Response;
    const wrapper = await montar();
    expect(wrapper.get('[role="status"]').text()).toContain('Cargando el resumen');
    resolver(respuestaJson(200, RESUMEN));
    await flushPromises();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });
});

describe('Estudiantes', () => {
  it('lista con la identificación enmascarada y sin recargar la página', async () => {
    const wrapper = await montar();
    await irAPestana(wrapper, 'Estudiantes');

    const items = wrapper.findAll('ul[aria-label="Lista de estudiantes"] > li');
    expect(items).toHaveLength(2);
    expect(items[0]!.text()).toContain('Ana Pérez');
    expect(items[0]!.text()).toContain('*******789');
    expect(items[0]!.text()).not.toContain('1023456789');
    expect(items[0]!.text()).toContain('2 de 6');
    expect(items[1]!.text()).toContain('Sin actividad');
    expect(wrapper.text()).toContain('Mostrando 1 a 2 de 30 estudiantes');
    expect(llamadas('students')[0]).toContain('page=1');
    expect(llamadas('students')[0]).toContain('page_size=25');
    expect(llamadas('students')[0]).toContain('orden=nombre');
  });

  it('pagina con Anterior y Siguiente', async () => {
    manejadores.students = (url) =>
      respuestaJson(200, url.searchParams.get('page') === '2' ? PAGINA_2 : PAGINA_1);
    const wrapper = await montar();
    await irAPestana(wrapper, 'Estudiantes');

    const nav = wrapper.get('nav[aria-label="Paginación de estudiantes"]');
    const [anterior, siguiente] = nav.findAll('button');
    expect(anterior!.attributes('disabled')).toBeDefined();
    expect(nav.text()).toContain('Página 1 de 2');

    await siguiente!.trigger('click');
    await flushPromises();
    expect(llamadas('students').at(-1)).toContain('page=2');
    expect(wrapper.text()).toContain('Zoraida Vega');
    expect(nav.text()).toContain('Página 2 de 2');
    expect(
      wrapper
        .get('nav[aria-label="Paginación de estudiantes"]')
        .findAll('button')[1]!
        .attributes('disabled'),
    ).toBeDefined();

    await wrapper
      .get('nav[aria-label="Paginación de estudiantes"]')
      .findAll('button')[0]!
      .trigger('click');
    await flushPromises();
    expect(llamadas('students').at(-1)).toContain('page=1');
    expect(wrapper.text()).toContain('Ana Pérez');
  });

  it('busca por texto y vuelve a la primera página', async () => {
    manejadores.students = (url) => {
      const q = url.searchParams.get('q');
      if (q === 'Zoraida')
        return respuestaJson(200, { ...PAGINA_2, page: 1, total: 1, total_pages: 1 });
      return respuestaJson(200, url.searchParams.get('page') === '2' ? PAGINA_2 : PAGINA_1);
    };
    const wrapper = await montar();
    await irAPestana(wrapper, 'Estudiantes');
    await wrapper.get('nav button:last-of-type').trigger('click');
    await flushPromises();
    expect(llamadas('students').at(-1)).toContain('page=2');

    await wrapper.get('#busqueda-estudiantes').setValue('  Zoraida ');
    await wrapper.get('form[role="search"]').trigger('submit');
    await flushPromises();

    const ultima = llamadas('students').at(-1)!;
    expect(ultima).toContain('q=Zoraida');
    expect(ultima).toContain('page=1');
    expect(wrapper.text()).toContain('Zoraida Vega');
    expect(wrapper.text()).toContain('Mostrando 1 a 1 de 1 estudiantes');
  });

  it('una búsqueda por número exacto muestra la identificación completa y lo dice con texto', async () => {
    manejadores.students = (url) =>
      respuestaJson(
        200,
        url.searchParams.get('q') === '1023456789' ? PAGINA_BUSQUEDA_EXACTA : PAGINA_1,
      );
    const wrapper = await montar();
    await irAPestana(wrapper, 'Estudiantes');
    await wrapper.get('#busqueda-estudiantes').setValue('1023456789');
    await wrapper.get('form[role="search"]').trigger('submit');
    await flushPromises();

    const item = wrapper.get('ul[aria-label="Lista de estudiantes"] > li');
    expect(item.text()).toContain('1023456789');
    expect(item.text()).toContain('completa por búsqueda exacta');
  });

  it('cambiar el orden pide la primera página con ese orden', async () => {
    const wrapper = await montar();
    await irAPestana(wrapper, 'Estudiantes');
    await wrapper.get('#orden-estudiantes').setValue('puntaje');
    await flushPromises();
    expect(llamadas('students').at(-1)).toContain('orden=puntaje');
    expect(llamadas('students').at(-1)).toContain('page=1');
  });

  it('sin resultados explica que el número debe escribirse completo; Limpiar restablece', async () => {
    manejadores.students = (url) =>
      respuestaJson(200, url.searchParams.get('q') ? PAGINA_SIN_RESULTADOS : PAGINA_1);
    const wrapper = await montar();
    await irAPestana(wrapper, 'Estudiantes');
    await wrapper.get('#busqueda-estudiantes').setValue('nadie');
    await wrapper.get('form[role="search"]').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[role="tabpanel"]').text()).toContain(
      'Ningún estudiante coincide con «nadie»',
    );
    expect(wrapper.text()).toContain('exacto');

    const limpiar = wrapper.findAll('form button').find((b) => b.text() === 'Limpiar');
    await limpiar!.trigger('click');
    await flushPromises();
    expect(llamadas('students').at(-1)).not.toContain('q=');
    expect(wrapper.text()).toContain('Ana Pérez');
  });

  it('sin estudiantes registrados muestra el estado vacío', async () => {
    manejadores.students = () => respuestaJson(200, PAGINA_SIN_RESULTADOS);
    const wrapper = await montar();
    await irAPestana(wrapper, 'Estudiantes');
    expect(wrapper.get('[role="tabpanel"]').text()).toContain(
      'Todavía no hay estudiantes registrados',
    );
  });

  it('un error de la API se muestra en español y se puede reintentar', async () => {
    let intento = 0;
    manejadores.students = () =>
      ++intento === 1 ? respuestaJson(0 + 503, { detail: 'x' }) : respuestaJson(200, PAGINA_1);
    const wrapper = await montar();
    await irAPestana(wrapper, 'Estudiantes');
    const alerta = wrapper.get('[role="alert"]');
    expect(alerta.text()).toContain('El servidor no está disponible');
    await alerta.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Ana Pérez');
  });

  it('abre el detalle con progreso por módulo, actividades y mentor, y vuelve a la lista', async () => {
    const wrapper = await montar();
    await irAPestana(wrapper, 'Estudiantes');
    const ver = wrapper.get('button[data-ver="2"]');
    expect(ver.attributes('aria-label')).toBe('Ver detalle de Ana Pérez');
    await ver.trigger('click');
    await flushPromises();

    expect(llamadas('students/2')).toHaveLength(1);
    const detalle = wrapper.get('section[aria-labelledby="titulo-detalle-estudiante"]');
    expect(detalle.get('h2').text()).toBe('Ana Pérez');
    expect(detalle.text()).toContain('*******789');
    expect(detalle.text()).toContain('2 de 6');
    const progreso = detalle.get('table[aria-label], div[aria-label="Progreso por módulo"] table');
    expect(progreso.findAll('tbody tr')).toHaveLength(6);
    expect(progreso.text()).toContain('Completado');
    expect(progreso.text()).toContain('m1_s3');
    expect(detalle.text()).toContain('m1_relacionar_funciones');
    expect(detalle.text()).toContain('Completada');
    expect(detalle.text()).toContain('Uso del mentor');
    expect(detalle.text()).toContain('US$ 0,0260');

    // La lista queda oculta pero conserva su estado; "Volver" la muestra y devuelve el foco.
    expect(wrapper.get('form[role="search"]').isVisible()).toBe(false);
    await detalle.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.find('section[aria-labelledby="titulo-detalle-estudiante"]').exists()).toBe(
      false,
    );
    expect(wrapper.get('form[role="search"]').isVisible()).toBe(true);
    expect(document.activeElement).toBe(wrapper.get('button[data-ver="2"]').element);
  });

  it('detalle inexistente (404) muestra el mensaje de la API', async () => {
    manejadores.student = () =>
      respuestaError(404, 'estudiante_no_encontrado', 'No existe ese estudiante.');
    const wrapper = await montar();
    await irAPestana(wrapper, 'Estudiantes');
    await wrapper.get('button[data-ver="2"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('No existe ese estudiante.');
  });
});

describe('Actividades', () => {
  it('muestra las más difíciles resaltadas con texto y las estadísticas por actividad y módulo', async () => {
    const wrapper = await montar();
    await irAPestana(wrapper, 'Actividades');
    expect(llamadas('activities/stats')[0]).toContain('limite=5');

    const dificiles = wrapper.get('section[aria-labelledby="titulo-dificiles"]');
    expect(dificiles.text()).toContain('m3_ordenar_fases');
    expect(dificiles.text()).toContain('33 %');
    expect(dificiles.text()).toContain('1 de 3');

    const filas = wrapper.findAll('section[aria-labelledby="titulo-por-actividad"] tbody tr');
    expect(filas).toHaveLength(2);
    const dificil = filas.find((f) => f.attributes('data-dificil') === 'si');
    expect(dificil!.text()).toContain('m3_ordenar_fases');
    expect(dificil!.text()).toContain('Más difícil n.º 1');
    expect(filas.find((f) => f.attributes('data-dificil') !== 'si')!.text()).toContain('75 %');

    const porModulo = wrapper.findAll('section[aria-labelledby="titulo-por-modulo"] tbody tr');
    expect(porModulo).toHaveLength(6);
  });

  it('filtra por módulo sin recargar', async () => {
    const wrapper = await montar();
    await irAPestana(wrapper, 'Actividades');
    const antes = llamadas('activities/stats').length;

    await wrapper.get('#filtro-modulo').setValue('1');
    const filas = wrapper.findAll('section[aria-labelledby="titulo-por-actividad"] tbody tr');
    expect(filas).toHaveLength(1);
    expect(filas[0]!.text()).toContain('m1_relacionar_funciones');

    await wrapper.get('#filtro-modulo').setValue('2');
    expect(wrapper.get('section[aria-labelledby="titulo-por-actividad"]').text()).toContain(
      'No hay actividades con intentos en este módulo',
    );
    expect(llamadas('activities/stats')).toHaveLength(antes);
  });

  it('sin resultados muestra el estado vacío', async () => {
    manejadores.actividades = () => respuestaJson(200, ACTIVIDADES_VACIAS);
    const wrapper = await montar();
    await irAPestana(wrapper, 'Actividades');
    expect(wrapper.get('[role="tabpanel"]').text()).toContain(
      'Todavía no hay resultados de actividades',
    );
  });

  it('un error muestra un aviso con reintento', async () => {
    manejadores.actividades = () => respuestaError(500, 'error_servidor', 'Falló el cálculo.');
    const wrapper = await montar();
    await irAPestana(wrapper, 'Actividades');
    expect(wrapper.get('[role="alert"]').text()).toContain('Falló el cálculo.');
    expect(wrapper.get('[role="alert"] button').text()).toBe('Reintentar');
  });
});

describe('Mentor', () => {
  it('muestra totales, gráficos por día, tablas por modelo y por día, y el top de usuarios', async () => {
    const wrapper = await montar();
    await irAPestana(wrapper, 'Mentor');
    expect(llamadas('mentor/usage')[0]).toContain('dias=30');

    const panel = wrapper.get('[role="tabpanel"]');
    expect(panel.text()).toContain('Consultas4');
    expect(panel.text()).toContain('Tokens de entrada7.500');
    expect(panel.text()).toContain('US$ 0,1388');

    const graficos = panel.findAll('figure');
    expect(graficos).toHaveLength(2);
    expect(graficos[0]!.findAll('[data-testid="barra"]')).toHaveLength(3);
    expect(graficos[0]!.get('[role="img"]').attributes('aria-label')).toContain(
      'Consultas por día',
    );
    expect(graficos[1]!.text()).toContain('Costo estimado por día');

    const porDiaModelo = panel.get('div[aria-label="Tokens y costo estimado por día y modelo"]');
    expect(porDiaModelo.findAll('tbody tr')).toHaveLength(2);
    expect(porDiaModelo.text()).toContain('claude-sonnet-5');
    expect(panel.get('div[aria-label="Uso del mentor por modelo"]').text()).toContain(
      'claude-opus-5',
    );
    expect(panel.get('div[aria-label="Usuarios con más uso del mentor"]').text()).toContain(
      'Elena Vega',
    );
  });

  it('deja claro que el costo es una estimación con precios configurables', async () => {
    const wrapper = await montar();
    await irAPestana(wrapper, 'Mentor');
    const nota = wrapper.get('[role="note"]');
    expect(nota.text()).toContain('El costo es una estimación');
    expect(nota.text()).toContain('configurables');
    expect(nota.text()).toContain('no es la factura');
    expect(nota.text()).toContain('US$ 5,00');
    expect(nota.text()).toContain('US$ 25,00');
    expect(nota.text()).toContain('Estimación con tarifas configurables.');
  });

  it('cambiar el período vuelve a pedir los datos', async () => {
    const wrapper = await montar();
    await irAPestana(wrapper, 'Mentor');
    await wrapper.get('#periodo-mentor').setValue('7');
    await flushPromises();
    expect(llamadas('mentor/usage').at(-1)).toContain('dias=7');
  });

  it('sin consultas muestra el estado vacío y con error permite reintentar', async () => {
    manejadores.mentor = () => respuestaJson(200, MENTOR_VACIO);
    const vacio = await montar();
    await irAPestana(vacio, 'Mentor');
    expect(vacio.get('[role="tabpanel"]').text()).toContain('Todavía no hay consultas al mentor');
    vacio.unmount();

    manejadores.mentor = () => respuestaError(500, 'error_servidor', 'Sin datos del mentor.');
    const roto = await montar();
    await irAPestana(roto, 'Mentor');
    expect(roto.get('[role="alert"]').text()).toContain('Sin datos del mentor.');
  });
});

describe('Exportar', () => {
  it('descarga el CSV enmascarado con fetch autenticado y entrega el archivo', async () => {
    const wrapper = await montar();
    await irAPestana(wrapper, 'Exportar');
    const boton = wrapper.findAll('button').find((b) => b.text() === 'Descargar CSV');
    await boton!.trigger('click');
    await flushPromises();

    const [entrada, init] = fetchMock.mock.calls.at(-1)!;
    expect(String(entrada)).toBe('/api/teacher/export/progress.csv');
    expect((init!.headers as Headers).get('Authorization')).toBe('Bearer tok-docente');
    expect(guardarBlob).toHaveBeenCalledTimes(1);
    const [blob, nombre] = guardarBlob.mock.calls[0]!;
    expect(blob).toBeInstanceOf(Blob);
    expect(nombre).toBe('progreso_ova_2026-09-24.csv');
    expect(wrapper.get('[role="status"]').text()).toContain('identificación enmascarada');
  });

  it('la identificación completa exige confirmación explícita con advertencia', async () => {
    const wrapper = await montar();
    await irAPestana(wrapper, 'Exportar');
    const abrir = wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Descargar con identificación completa'));
    await abrir!.trigger('click');
    await flushPromises();

    // Aún no se ha pedido nada al servidor.
    expect(llamadas('export')).toHaveLength(0);
    const dialogo = wrapper.get('[role="alertdialog"]');
    expect(dialogo.attributes('aria-labelledby')).toBe('titulo-confirmacion');
    expect(dialogo.text()).toContain('datos personales');
    expect(dialogo.text()).toContain('número de identificación completo');
    // El foco cae en la opción segura.
    expect(document.activeElement?.textContent?.trim()).toBe('Cancelar');

    await dialogo
      .findAll('button')
      .find((b) => b.text().startsWith('Sí, descargar'))!
      .trigger('click');
    await flushPromises();
    expect(String(fetchMock.mock.calls.at(-1)![0])).toBe(
      '/api/teacher/export/progress.csv?identificacion=completa',
    );
    expect(guardarBlob).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false);
    expect(wrapper.get('[role="status"]').text()).toContain('identificación completa');
  });

  it('cancelar la confirmación no descarga nada', async () => {
    const wrapper = await montar();
    await irAPestana(wrapper, 'Exportar');
    await wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Descargar con identificación completa'))!
      .trigger('click');
    await wrapper.get('[role="alertdialog"]').findAll('button')[0]!.trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false);
    expect(llamadas('export')).toHaveLength(0);
    expect(guardarBlob).not.toHaveBeenCalled();
  });

  it('un fallo de la descarga se avisa en español y no entrega archivo', async () => {
    manejadores.csv = () => respuestaError(500, 'error_servidor', 'No se pudo generar el CSV.');
    const wrapper = await montar();
    await irAPestana(wrapper, 'Exportar');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Descargar CSV')!
      .trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain('No se pudo generar el CSV.');
    expect(guardarBlob).not.toHaveBeenCalled();
  });
});
