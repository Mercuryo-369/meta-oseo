// Prueba de integración del módulo 4 ("Transformando la matriz"): monta el anfitrión REAL
// (ModuloView) con el content.json real del módulo y los seis componentes de actividad reales
// (sin sustituir ninguno), y recorre las ocho secciones como lo haría un estudiante:
//   (a) cada actividad monta sin errores ni avisos de Vue en consola,
//   (b) cada actividad se completa con la interacción mínima de su tipo y reporta un puntaje
//       coherente con su puntaje_max,
//   (c) el bloqueo por secuencia abre la sección siguiente solo al terminar las obligatorias,
//   (d) al completar el módulo se llama a la API con los cuerpos del contrato (fetch simulado),
//   (e) los enlaces del glosario abren su definición.
// El modelo 3D de la mandíbula no se dibuja (happy-dom no tiene WebGL 2): la exploración se
// resuelve con la lista de nodos, que es la alternativa de teclado y de lector de pantalla.
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { Router } from 'vue-router';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { construirConsignas } from '@/activities/multicapa/logica';
import { PATRON_ACTIVITY_ID_API } from '@/content/constantes';
import { BLOQUEO_SECUENCIAL } from '@/config';
import { simularApi } from '@/components/modulo/utilesPrueba';
import type { ApiSimulada } from '@/components/modulo/utilesPrueba';
import { listarActividades } from '@/content/consultas';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import { cargarModulo } from '@/content/registry';
import type {
  Actividad,
  ActividadArrastreMolecular,
  ActividadExploracion3d,
  ActividadMulticapa,
  ActividadQuiz,
  ActividadRelacionColumnas,
  ActividadVideoTexto,
  ModuloContenido,
} from '@/content/schema';
import { useAuthStore } from '@/stores/auth';
import { usuarioDePrueba } from '@/test/utils';
import ModuloView from '@/views/ModuloView.vue';

/* -------------------------------------------------------------------------------------------
 * Preparación: el módulo real, los SVG reales, una API simulada y el registro de la consola
 * ----------------------------------------------------------------------------------------- */

const svgsPublicos = import.meta.glob('/public/images/m4/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const N = 4;
/** Módulos 1 a 3 completados: sin ellos el módulo 4 está bloqueado por secuencia. */
const COMPLETADOS_PREVIOS = [1, 2, 3];

/** Mensajes de console.warn y console.error durante toda la prueba. */
const consola: string[] = [];

/** El módulo real, tal como lo carga la aplicación (esquema validado). */
const carga = await cargarModulo(N);
if (!carga.ok) throw new Error(`No se pudo cargar el módulo 4: ${carga.mensaje}`);
const modulo: ModuloContenido = carga.modulo;

let wrapper: VueWrapper;
let router: Router;
let api: ApiSimulada;

const actividades = (): Actividad[] => listarActividades(modulo).map((u) => u.actividad);

const seccionActual = () => wrapper.find('[data-testid="seccion"]');
const bloque = (id: string) => wrapper.get(`[data-actividad="${id}"]`);

async function irA(idSeccion: string): Promise<void> {
  await router.push({ name: 'modulo', params: { n: N }, query: { s: idSeccion } });
  await flushPromises();
}

async function esperar(condicion: () => void, tiempo = 20_000): Promise<void> {
  await vi.waitFor(condicion, { timeout: tiempo, interval: 25 });
  await flushPromises();
}

/** Espera a que el componente (que se descarga bajo demanda) haya dibujado la actividad. */
async function esperarActividad(id: string): Promise<void> {
  const a = actividades().find((x) => x.id === id)!;
  await esperar(() => expect(wrapper.find(`[data-actividad="${id}"] h3`).exists()).toBe(true));
  // Las que descargan un SVG lo dejan listo antes de tocar nada; si falla, se dice por qué.
  if (a.tipo === 'multicapa') {
    await esperar(() => {
      expect(
        wrapper.find(`[data-actividad="${id}"] [data-testid="multicapa-error-svg"]`).exists(),
        `El SVG de ${id} no cargó (fetch: ${api.llamadas.map((l) => l.ruta).join(', ')})`,
      ).toBe(false);
      expect(
        wrapper
          .find(`[data-actividad="${id}"] [data-testid="multicapa-svg"] g[data-capa]`)
          .exists(),
      ).toBe(true);
    });
  } else if (a.tipo === 'video-texto') {
    await esperar(() => {
      expect(
        wrapper.find(`[data-actividad="${id}"] [data-testid="error-svg"]`).exists(),
        `El SVG de ${id} no cargó`,
      ).toBe(false);
      expect(
        wrapper.find(`[data-actividad="${id}"] [data-testid="svg-animacion"] svg`).exists(),
      ).toBe(true);
    });
  }
}

const postsDe = (id: string) =>
  api.filtrar('POST', `/activities/${id}/result`).map((l) => l.cuerpo as Record<string, unknown>);

async function esperarResultado(id: string): Promise<Record<string, unknown>> {
  await esperar(() => expect(postsDe(id).length).toBeGreaterThanOrEqual(1));
  return postsDe(id)[0]!;
}

/** Lo que dice el anfitrión sobre la actividad: «Completada · 20 de 20 puntos». */
const estadoDe = (id: string) => bloque(id).get('[data-testid="estado-actividad"]').text();

/* -------------------------------------------------------------------------------------------
 * Conductores: la interacción mínima de cada tipo, como la haría un estudiante
 * ----------------------------------------------------------------------------------------- */

/** Punto tocable de una capa dentro del SVG inyectado (la zona que el componente clona). */
function zonaTocable(id: string, capa: string): Element {
  const raiz = bloque(id).get('[data-testid="multicapa-svg"]').element;
  const g = Array.from(raiz.querySelectorAll('[data-capa]')).find(
    (e) => e.getAttribute('data-capa') === capa,
  );
  if (!g) throw new Error(`El SVG de ${id} no tiene la capa ${capa}`);
  const zona = g.querySelector('[data-zona-auto], [data-zona-toque]');
  if (!zona) throw new Error(`La capa ${capa} de ${id} no tiene zona táctil`);
  return zona;
}

async function tocarEnSvg(id: string, capa: string): Promise<void> {
  zonaTocable(id, capa).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await flushPromises();
}

async function pulsarCapaDeLista(id: string, capa: string): Promise<void> {
  const boton = bloque(id)
    .findAll('[data-testid="multicapa-lista"] button')
    .find((b) => b.attributes('data-capa') === capa);
  if (!boton) throw new Error(`No hay botón de lista para la capa ${capa} de ${id}`);
  await boton.trigger('click');
  await flushPromises();
}

async function completarMulticapa(a: ActividadMulticapa): Promise<void> {
  if (a.config.modo === 'identificar') {
    // Cada consigna se responde tocando la capa en el dibujo.
    for (const c of construirConsignas(a.config)) await tocarEnSvg(a.id, c.capa);
  } else {
    // La primera capa se toca en el dibujo y las demás con la alternativa de la lista.
    const [primera, ...resto] = a.config.requeridas;
    await tocarEnSvg(a.id, primera!);
    for (const capa of resto) await pulsarCapaDeLista(a.id, capa);
  }
}

/** La opción cuyo texto contiene el pedido; si hay varias, la de texto más corto (la más exacta). */
function entrada(id: string, texto: string) {
  const candidatas = bloque(id)
    .findAll('label')
    .filter((l) => l.text().includes(texto));
  candidatas.sort((x, y) => x.text().length - y.text().length);
  const etiqueta = candidatas[0];
  if (!etiqueta) throw new Error(`No hay una opción con el texto «${texto}» en ${id}`);
  return etiqueta.get('input');
}

async function moverPaso(id: string, texto: string, destino: number): Promise<void> {
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const filas = bloque(id).findAll('ol[data-ordenar] > li');
    const coinciden = filas.filter((f) => f.text().includes(texto));
    coinciden.sort((x, y) => x.text().length - y.text().length);
    const actual = filas.indexOf(coinciden[0]!);
    if (actual < 0) throw new Error(`No hay un paso con el texto «${texto}» en ${id}`);
    if (actual === destino) return;
    const accion = actual > destino ? 'subir' : 'bajar';
    await filas[actual]!.get(`button[data-accion="${accion}"]`).trigger('click');
  }
  throw new Error(`No se pudo colocar el paso «${texto}» de ${id}`);
}

async function principal(id: string): Promise<void> {
  await bloque(id).get('button[data-principal]').trigger('click');
  await flushPromises();
}

async function completarQuiz(a: ActividadQuiz): Promise<void> {
  const total = a.config.preguntas.length;
  for (let i = 0; i < total; i++) {
    const idPregunta = bloque(a.id).get('article[data-pregunta]').attributes('data-pregunta');
    const p = a.config.preguntas.find((x) => x.id === idPregunta);
    if (!p) throw new Error(`Pregunta visible desconocida (${idPregunta}) en ${a.id}`);
    if (p.formato === 'verdadero_falso') {
      await entrada(a.id, p.correcta ? 'Verdadero' : 'Falso').setValue(true);
    } else if (p.formato === 'opcion_multiple') {
      for (const o of p.opciones.filter((x) => p.correctas.includes(x.id))) {
        await entrada(a.id, textoPlanoDeMarkdown(o.texto)).setValue(true);
      }
    } else {
      for (const [k, paso] of p.pasos.entries()) {
        await moverPaso(a.id, textoPlanoDeMarkdown(paso.texto), k);
      }
    }
    await principal(a.id); // Comprobar
    await principal(a.id); // Siguiente o Ver resultado
  }
}

async function completarRelacion(a: ActividadRelacionColumnas): Promise<void> {
  const elemento = (columna: 'a' | 'b', idElemento: string) =>
    bloque(a.id)
      .findAll(`[data-columna="${columna}"]`)
      .find((x) => x.attributes('data-id') === idElemento);
  for (const par of a.config.pares) {
    const izquierda = elemento('a', par.a);
    const derecha = elemento('b', par.b);
    if (!izquierda || !derecha) throw new Error(`Falta un elemento del par ${par.id} de ${a.id}`);
    await izquierda.trigger('click');
    await derecha.trigger('click');
  }
}

async function completarVideoTexto(a: ActividadVideoTexto): Promise<void> {
  if (a.config.medio !== 'animacion') throw new Error('Se esperaba una animación');
  const { pasos } = a.config;
  const titulo = () => bloque(a.id).get('[data-testid="titulo-paso"]').text();
  // Cada paso muestra su propio título antes de avanzar.
  expect(titulo()).toBe(textoPlanoDeMarkdown(pasos[0]!.titulo));
  for (let i = 1; i < pasos.length; i++) {
    await bloque(a.id).get('[data-testid="siguiente"]').trigger('click');
    await flushPromises();
    expect(titulo(), `paso ${i + 1} de ${a.id}`).toBe(textoPlanoDeMarkdown(pasos[i]!.titulo));
  }
}

async function completarArrastre(a: ActividadArrastreMolecular): Promise<void> {
  for (const par of a.config.pares) {
    const i = a.config.moleculas.findIndex((m) => m.id === par.molecula);
    const j = a.config.receptores.findIndex((r) => r.id === par.receptor);
    await bloque(a.id).get(`[data-pieza][data-indice="${i}"]`).trigger('click');
    await bloque(a.id).get(`[data-receptor][data-indice="${j}"]`).trigger('click');
    await flushPromises();
  }
}

async function completarExploracion(a: ActividadExploracion3d): Promise<void> {
  for (const idNodo of a.config.requeridos) {
    const boton = bloque(a.id)
      .findAll('[data-nodo]')
      .find((b) => b.attributes('data-nodo') === idNodo);
    if (!boton) throw new Error(`No hay botón de lista para el nodo ${idNodo}`);
    await boton.trigger('click');
    await flushPromises();
  }
}

async function completar(a: Actividad): Promise<void> {
  switch (a.tipo) {
    case 'multicapa':
      return completarMulticapa(a);
    case 'quiz':
      return completarQuiz(a);
    case 'relacion-columnas':
      return completarRelacion(a);
    case 'video-texto':
      return completarVideoTexto(a);
    case 'arrastre-molecular':
      return completarArrastre(a);
    case 'exploracion-3d':
      return completarExploracion(a);
  }
}

/* -------------------------------------------------------------------------------------------
 * Montaje (una sola vez: el estudiante recorre el módulo en orden y el progreso se acumula)
 * ----------------------------------------------------------------------------------------- */

beforeAll(async () => {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.token = 'jwt-de-prueba';
  auth.establecerUsuario(usuarioDePrueba());

  api = simularApi({
    completados: COMPLETADOS_PREVIOS,
    responder: (llamada) => {
      const svg = /^\/images\/m4\/([a-z0-9_]+\.svg)$/.exec(llamada.ruta);
      if (svg) {
        const texto = svgsPublicos[`/public/images/m4/${svg[1]}`];
        return texto === undefined
          ? new Response('no encontrado', { status: 404 })
          : new Response(texto, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
      }
      return undefined;
    },
  });

  const Vacia = { render: () => null };
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'inicio', component: Vacia },
      { path: '/modulo/:n', name: 'modulo', component: Vacia },
      { path: '/certificado', component: Vacia },
    ],
  });
  await router.push(`/modulo/${N}`);
  await router.isReady();

  wrapper = mount(ModuloView, {
    props: { n: N },
    attachTo: document.body,
    global: { plugins: [pinia, router] },
  }) as unknown as VueWrapper;
  await esperar(() => expect(wrapper.find('[data-testid="cabecera-modulo"]').exists()).toBe(true));
});

// La configuración de vitest restaura espías y globales entre pruebas (`restoreMocks`,
// `unstubGlobals`): se vuelven a instalar antes de cada una.
beforeEach(() => {
  vi.stubGlobal('fetch', api.fetch);
  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    consola.push(`warn: ${args.map(String).join(' ')}`);
  });
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    consola.push(`error: ${args.map(String).join(' ')}`);
  });
});

afterAll(() => {
  wrapper?.unmount();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/* -------------------------------------------------------------------------------------------
 * Comprobaciones previas
 * ----------------------------------------------------------------------------------------- */

describe('módulo 4 integrado: cabecera y bloqueo inicial', () => {
  it('el bloqueo por secuencia está activo y el módulo abre con el contenido real', () => {
    expect(BLOQUEO_SECUENCIAL).toBe(true);
    expect(wrapper.get('[data-testid="titulo-modulo"]').text()).toBe('Transformando la matriz');
    expect(wrapper.findAll('[data-testid="objetivos"] li')).toHaveLength(modulo.objetivos.length);
    expect(wrapper.get('[data-testid="avance-obligatorias"]').text()).toContain('0 de 15');
    // 660 del guion más 2 exploraciones 3D extra de 30 puntos.
    expect(wrapper.get('[data-testid="puntaje-modulo"]').text()).toContain('720');
  });

  it('arranca en la sección 4.1 y las demás están bloqueadas hasta terminarla', async () => {
    expect(seccionActual().attributes('data-seccion')).toBe('m4_1_osteoide');
    await irA('m4_3_vesiculas_ppi');
    expect(wrapper.find('[data-testid="seccion-bloqueada"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="seccion"]').exists()).toBe(false);
    await irA('m4_1_osteoide');
    expect(seccionActual().exists()).toBe(true);
  });

  it('el glosario final lista todos los términos y las referencias', () => {
    const texto = wrapper.text();
    expect(modulo.glosario.length).toBe(42);
    expect(texto).toContain('Glosario');
    expect(texto).toContain('Referencias');
  });
});

/* -------------------------------------------------------------------------------------------
 * Recorrido sección por sección
 * ----------------------------------------------------------------------------------------- */

/** Comprueba que cada enlace del glosario visible abre su definición. */
async function comprobarGlosario(idSeccion: string): Promise<number> {
  const enlaces = Array.from(
    document.body.querySelectorAll<HTMLAnchorElement>(
      `[data-seccion="${idSeccion}"] a[data-glosario]`,
    ),
  );
  for (const enlace of enlaces) {
    const id = enlace.getAttribute('data-glosario')!;
    const termino = modulo.glosario.find((t) => t.id === id);
    expect(termino, `El enlace ${id} no existe en el glosario`).toBeDefined();
    enlace.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await esperar(() => {
      const hoja = document.body.querySelector('[data-testid="hoja-glosario"]');
      expect(hoja?.textContent ?? '', `hoja del término ${id}`).toContain(termino!.termino);
    }, 5000);
    const hoja = document.body.querySelector('[data-testid="hoja-glosario"]')!;
    // La definición se muestra sin el marcado crudo de los enlaces.
    expect(hoja.textContent).not.toContain('](glosario:');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await esperar(
      () => expect(document.body.querySelector('[data-testid="hoja-glosario"]')).toBeNull(),
      5000,
    );
  }
  return enlaces.length;
}

let enlacesProbados = 0;

describe('módulo 4 integrado: las ocho secciones', () => {
  for (const [indice, seccion] of modulo.secciones.entries()) {
    const siguiente = modulo.secciones[indice + 1];

    it(`${seccion.id}: monta, se completa y abre ${siguiente?.id ?? 'el cierre del módulo'}`, async () => {
      const consolaAntes = consola.length;
      await irA(seccion.id);
      expect(seccionActual().attributes('data-seccion')).toBe(seccion.id);
      expect(wrapper.get('#titulo-seccion').text()).toBe(seccion.titulo);

      // Textos, imágenes y tablas del bloque se dibujan.
      const bloques = seccion.bloques;
      expect(wrapper.findAll('[data-testid="bloque-imagen"]').length).toBe(
        bloques.filter((b) => b.tipo === 'imagen').length,
      );
      expect(wrapper.findAll('[data-testid="bloque-callout"]').length).toBe(
        bloques.filter((b) => b.tipo === 'callout').length,
      );
      for (const img of wrapper.findAll('[data-testid="bloque-imagen"] img')) {
        expect(img.attributes('alt')?.length ?? 0).toBeGreaterThanOrEqual(10);
      }

      enlacesProbados += await comprobarGlosario(seccion.id);

      const delSeccion = bloques.flatMap((b) => (b.tipo === 'actividad' ? [b.actividad] : []));
      const obligatorias = delSeccion.filter((a) => a.obligatoria);
      expect(obligatorias.length).toBeGreaterThanOrEqual(1);

      // (c) Mientras falte una obligatoria, la sección siguiente sigue bloqueada.
      let restantes = obligatorias.length;
      for (const a of delSeccion) {
        await esperarActividad(a.id);
        await completar(a);
        const cuerpo = await esperarResultado(a.id);

        // (b) El resultado es coherente con la actividad.
        expect(cuerpo.modulo).toBe(N);
        expect(cuerpo.tipo).toBe(a.tipo);
        expect(cuerpo.completada).toBe(true);
        expect(cuerpo.intentos).toBe(1);
        expect(Number.isInteger(cuerpo.puntaje)).toBe(true);
        expect(cuerpo.puntaje as number).toBeGreaterThan(0);
        expect(cuerpo.puntaje as number).toBeLessThanOrEqual(a.puntaje_max);
        // Una ejecución sin errores en el primer intento vale el puntaje completo.
        expect(cuerpo.puntaje, `puntaje de ${a.id}`).toBe(a.puntaje_max);
        await esperar(() =>
          expect(estadoDe(a.id)).toContain(
            `Completada · ${a.puntaje_max} de ${a.puntaje_max} puntos`,
          ),
        );

        if (a.obligatoria) restantes--;
        if (siguiente && restantes > 0) {
          await irA(siguiente.id);
          expect(
            wrapper.find('[data-testid="seccion-bloqueada"]').exists(),
            `${siguiente.id} debe seguir bloqueada`,
          ).toBe(true);
          await irA(seccion.id);
          await esperarActividad(a.id);
        }
      }

      if (siguiente) {
        await irA(siguiente.id);
        expect(wrapper.find('[data-testid="seccion-bloqueada"]').exists()).toBe(false);
        expect(seccionActual().attributes('data-seccion')).toBe(siguiente.id);
      } else {
        await esperar(() =>
          expect(wrapper.find('[data-testid="modulo-completado"]').exists()).toBe(true),
        );
      }

      // Ningún id repetido en la página (dos SVG en línea con los mismos grupos rompen los enlaces y a11y).
      const repetidos = new Map<string, number>();
      for (const el of Array.from(document.body.querySelectorAll('[id]'))) {
        repetidos.set(el.id, (repetidos.get(el.id) ?? 0) + 1);
      }
      expect(
        [...repetidos].filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`),
        `ids repetidos en ${seccion.id}`,
      ).toEqual([]);

      // (a) Ningún error ni aviso de consola durante esta sección.
      expect(consola.slice(consolaAntes), 'consola').toEqual([]);
    }, 120_000);
  }
});

/* -------------------------------------------------------------------------------------------
 * Cierre del módulo: la API recibe lo que fija el contrato
 * ----------------------------------------------------------------------------------------- */

describe('módulo 4 integrado: cierre y API', () => {
  it('se probaron los enlaces del glosario de todas las secciones', () => {
    expect(enlacesProbados).toBeGreaterThanOrEqual(38);
  });

  it('(d) cada actividad se reportó una sola vez con el cuerpo del contrato', () => {
    const posts = api.filtrar('POST', '/activities/');
    // 20 del guion y 2 exploraciones 3D extra.
    expect(posts).toHaveLength(22);
    expect(posts).toHaveLength(actividades().length);
    for (const a of actividades()) {
      const llamadas = api.filtrar('POST', `/activities/${a.id}/result`);
      expect(llamadas, a.id).toHaveLength(1);
      expect(PATRON_ACTIVITY_ID_API.test(a.id)).toBe(true);
      const cuerpo = llamadas[0]!.cuerpo as Record<string, unknown>;
      expect(Object.keys(cuerpo).sort(), a.id).toEqual([
        'completada',
        'detalle',
        'intentos',
        'modulo',
        'puntaje',
        'tipo',
      ]);
      expect(cuerpo).toMatchObject({
        modulo: 4,
        tipo: a.tipo,
        puntaje: a.puntaje_max,
        intentos: 1,
        completada: true,
      });
      const detalle = cuerpo.detalle as Record<string, unknown>;
      expect(typeof detalle, a.id).toBe('object');
      expect(new TextEncoder().encode(JSON.stringify(detalle)).length, a.id).toBeLessThanOrEqual(
        4096,
      );
    }
  });

  it('(d) el módulo se marca completado con un PUT {completado: true} solo después de todos los POST', async () => {
    await esperar(() =>
      expect(
        api
          .filtrar('PUT', '/progress/4')
          .some((l) => (l.cuerpo as { completado?: boolean }).completado === true),
      ).toBe(true),
    );
    const puts = api.filtrar('PUT', '/progress/4');
    const completados = puts.filter(
      (l) => (l.cuerpo as { completado?: boolean }).completado === true,
    );
    expect(completados).toHaveLength(1);
    expect(completados[0]!.cuerpo).toEqual({ completado: true });
    // Todos los POST salieron antes que ese PUT.
    const orden = api.llamadas.filter((l) => l.metodo === 'POST' || l.metodo === 'PUT');
    const posicionPut = orden.indexOf(completados[0]!);
    const ultimoPost = orden.map((l) => l.metodo).lastIndexOf('POST');
    expect(ultimoPost).toBeLessThan(posicionPut);
    // Los demás PUT (tiempo y sección) respetan el contrato.
    for (const p of puts) {
      const c = p.cuerpo as { seccion_actual?: string; tiempo_delta_seg?: number };
      if (c.seccion_actual !== undefined) {
        expect(modulo.secciones.map((s) => s.id)).toContain(c.seccion_actual);
        expect(c.seccion_actual.length).toBeLessThanOrEqual(64);
      }
      if (c.tiempo_delta_seg !== undefined) {
        expect(Number.isInteger(c.tiempo_delta_seg)).toBe(true);
        expect(c.tiempo_delta_seg).toBeGreaterThanOrEqual(0);
        expect(c.tiempo_delta_seg).toBeLessThanOrEqual(3600);
      }
    }
  });

  it('el módulo queda al 100 %: 15 obligatorias y 720 puntos', () => {
    expect(wrapper.get('[data-testid="avance-obligatorias"]').text()).toContain('15 de 15');
    expect(wrapper.get('[data-testid="puntaje-modulo"]').text()).toContain('720');
  });

  it('(a) en todo el recorrido no hubo ningún aviso ni error en la consola', () => {
    expect(consola).toEqual([]);
  });
});

/* -------------------------------------------------------------------------------------------
 * Dibujos: cada capa que el contenido referencia se puede tocar en el SVG real
 * ----------------------------------------------------------------------------------------- */

describe('módulo 4 integrado: zonas táctiles de los dibujos reales', () => {
  it('cada capa de cada multicapa tiene una zona táctil dentro del SVG inyectado', async () => {
    const problemas: string[] = [];
    for (const a of actividades().filter((x): x is ActividadMulticapa => x.tipo === 'multicapa')) {
      const secc = listarActividades(modulo).find((u) => u.actividad.id === a.id)!.seccion;
      await irA(secc.id);
      await esperarActividad(a.id);
      for (const capa of a.config.capas) {
        try {
          zonaTocable(a.id, capa.id);
        } catch (e) {
          problemas.push((e as Error).message);
        }
      }
    }
    expect(problemas).toEqual([]);
  });
});
