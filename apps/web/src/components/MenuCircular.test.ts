import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ConfigModulo from '@/config';
import type * as CargadorGsap from '@/components/menu/gsapPerezoso';
import MenuCircular from '@/components/MenuCircular.vue';
import { calcularDisposicion, TAM_NODO } from '@/components/menu/geometria';
import { precargarGsap } from '@/components/menu/gsapPerezoso';
import {
  crearRouterDePrueba,
  enfocar,
  fijarViewport,
  simularMovimientoReducido,
} from '@/components/menu/testing';
import { MODULOS } from '@/data/modulos';
import { useAuthStore } from '@/stores/auth';
import { useProgresoStore } from '@/stores/progreso';
import { progresoDePrueba, usuarioDePrueba } from '@/test/utils';

// BLOQUEO_SECUENCIAL es una constante de config.ts (false hoy). Para probar el estado
// "bloqueado" se sustituye por un getter que lee este objeto; cada prueba lo fija antes de montar.
const config = vi.hoisted(() => ({ bloqueo: false }));
vi.mock('@/config', async (importOriginal) => {
  const original = await importOriginal<typeof ConfigModulo>();
  return {
    ...original,
    get BLOQUEO_SECUENCIAL() {
      return config.bloqueo;
    },
  };
});

// La carga real de GSAP se conserva; el envoltorio solo permite contar las llamadas.
vi.mock('@/components/menu/gsapPerezoso', async (importOriginal) => {
  const original = await importOriginal<typeof CargadorGsap>();
  return { ...original, precargarGsap: vi.fn(original.precargarGsap) };
});

const montados: VueWrapper[] = [];

interface OpcionesMontaje {
  ruta?: string;
  completados?: number[];
  /** `true` por defecto: sin animación, para que abrir y cerrar sea síncrono. */
  reducido?: boolean;
}

async function montar({ ruta = '/', completados = [], reducido = true }: OpcionesMontaje = {}) {
  simularMovimientoReducido(reducido);
  const pinia = createPinia();
  setActivePinia(pinia);
  const progreso = useProgresoStore();
  progreso.modulos = progresoDePrueba(completados).modulos;
  const router = await crearRouterDePrueba(ruta);
  const wrapper = mount(MenuCircular, {
    // Transition y TransitionGroup reales (VTU los sustituye por stubs si no): así se prueban
    // también los ganchos de entrada y salida.
    global: { plugins: [pinia, router], stubs: { transition: false, 'transition-group': false } },
    attachTo: document.body,
  });
  montados.push(wrapper);
  // Cuántas veces pidió el componente la descarga de GSAP (antes de la espera de más abajo).
  const cargasPedidas = vi.mocked(precargarGsap).mock.calls.length;
  // GSAP se descarga aparte tras el montaje; se espera a que esté listo antes de probar animaciones.
  if (!reducido) await precargarGsap();
  await flushPromises();
  return { wrapper, router, progreso, cargasPedidas };
}

const control = (w: VueWrapper) => w.get('[data-testid="menu-control"]');
const nodos = (w: VueWrapper) => w.findAll('[data-nodo-menu]');

async function abrir(w: VueWrapper) {
  await control(w).trigger('click');
  await flushPromises();
}

beforeEach(() => {
  document.body.innerHTML = '';
  config.bloqueo = false;
  vi.mocked(precargarGsap).mockClear();
});

afterEach(() => {
  while (montados.length) montados.pop()!.unmount();
  fijarViewport(1024, 768);
});

describe('MenuCircular: cerrado', () => {
  it('es una navegación con un solo botón, contraído y con el progreso en su nombre', async () => {
    const { wrapper } = await montar({ completados: [1, 2] });
    const nav = wrapper.get('nav');
    expect(nav.attributes('aria-label')).toBe('Módulos');
    const boton = control(wrapper);
    expect(boton.element.tagName).toBe('BUTTON');
    expect(boton.attributes('type')).toBe('button');
    expect(boton.attributes('aria-expanded')).toBe('false');
    expect(boton.attributes('aria-controls')).toBe(wrapper.get('ul').attributes('id'));
    expect(boton.text()).toContain('Menú de módulos, 2 de 6 completados');
    expect(nodos(wrapper)).toHaveLength(0);
  });

  it('no usa role=menu: son enlaces reales dentro de <nav>', async () => {
    const { wrapper } = await montar();
    await abrir(wrapper);
    expect(wrapper.find('[role="menu"], [role="menuitem"]').exists()).toBe(false);
    expect(wrapper.get('ul').attributes('role')).toBe('list');
  });

  it('el anillo de progreso marca un segmento por módulo completado', async () => {
    const { wrapper, progreso } = await montar({ completados: [1, 3] });
    const segmentos = wrapper.findAll('[data-testid="menu-anillo"]');
    expect(segmentos.map((s) => s.attributes('data-completado'))).toEqual([
      'true',
      'false',
      'true',
      'false',
      'false',
      'false',
    ]);
    progreso.modulos = progresoDePrueba([1, 2, 3]).modulos;
    await flushPromises();
    expect(
      wrapper
        .findAll('[data-testid="menu-anillo"]')
        .filter((s) => s.attributes('data-completado') === 'true'),
    ).toHaveLength(3);
    expect(control(wrapper).text()).toContain('3 de 6 completados');
  });
});

describe('MenuCircular: abierto', () => {
  it('muestra los seis módulos como enlaces reales a /modulo/n, con su título', async () => {
    const { wrapper } = await montar();
    await abrir(wrapper);
    expect(control(wrapper).attributes('aria-expanded')).toBe('true');

    const enlaces = wrapper.findAll('a');
    expect(enlaces.map((a) => a.attributes('href'))).toEqual(
      MODULOS.map((m) => `/modulo/${m.numero}`),
    );
    MODULOS.forEach((m, i) => {
      expect(enlaces[i]!.text()).toContain(m.titulo);
      // El número va en el disco SVG (decorativo); el texto oculto lo dice para lectores.
      expect(enlaces[i]!.text()).toContain(`Módulo ${m.numero}: `);
      expect(enlaces[i]!.get('svg').attributes('aria-hidden')).toBe('true');
    });
  });

  it('coloca cada nodo con la geometría calculada (relativa al centro del control)', async () => {
    const { wrapper } = await montar();
    await abrir(wrapper);
    const esperado = calcularDisposicion({
      ancho: window.innerWidth,
      alto: window.innerHeight,
      total: 6,
    });
    const items = wrapper.findAll('li');
    expect(items).toHaveLength(6);
    items.forEach((li, i) => {
      const { x, y } = esperado.nodos[i]!;
      const estilo = (li.element as HTMLElement).style;
      expect(parseFloat(estilo.left)).toBeCloseTo(x - TAM_NODO / 2, 2);
      expect(parseFloat(estilo.top)).toBeCloseTo(y - TAM_NODO / 2, 2);
      expect(estilo.maxWidth).toBe(`${esperado.anchoMaximo[i]}px`);
    });
  });

  it('cada píldora mide 44 px de alto como mínimo', async () => {
    const { wrapper } = await montar();
    await abrir(wrapper);
    for (const n of nodos(wrapper)) expect(n.classes()).toEqual(expect.arrayContaining(['h-11']));
  });

  it('elegir un módulo navega a él y cierra el menú', async () => {
    const { wrapper, router } = await montar();
    await abrir(wrapper);
    await wrapper.get('a[href="/modulo/4"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/modulo/4');
    expect(control(wrapper).attributes('aria-expanded')).toBe('false');
    expect(nodos(wrapper)).toHaveLength(0);
  });

  it('un clic con Ctrl (abrir en otra pestaña) no cierra el menú ni navega', async () => {
    const { wrapper, router } = await montar();
    await abrir(wrapper);
    await wrapper.get('a[href="/modulo/2"]').trigger('click', { ctrlKey: true });
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/');
    expect(control(wrapper).attributes('aria-expanded')).toBe('true');
  });

  it('cambiar de ruta por otra vía también cierra el menú', async () => {
    const { wrapper, router } = await montar();
    await abrir(wrapper);
    await router.push('/demo-mandibula');
    await flushPromises();
    expect(control(wrapper).attributes('aria-expanded')).toBe('false');
  });

  it('tocar el velo lo cierra', async () => {
    const { wrapper } = await montar();
    await abrir(wrapper);
    await wrapper.get('[data-testid="menu-velo"]').trigger('click');
    await flushPromises();
    expect(control(wrapper).attributes('aria-expanded')).toBe('false');
  });

  it('se cierra cuando el foco sale del menú hacia otro elemento', async () => {
    const { wrapper } = await montar();
    const fuera = document.createElement('button');
    document.body.appendChild(fuera);
    await abrir(wrapper);
    nodos(wrapper)[0]!.element.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: fuera }),
    );
    await flushPromises();
    expect(control(wrapper).attributes('aria-expanded')).toBe('false');
  });

  it('NO se cierra cuando el foco se mueve entre sus propios elementos', async () => {
    const { wrapper } = await montar();
    await abrir(wrapper);
    const [primero, segundo] = nodos(wrapper);
    primero!.element.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: segundo!.element }),
    );
    await flushPromises();
    expect(control(wrapper).attributes('aria-expanded')).toBe('true');
  });
});

describe('MenuCircular: estados de cada módulo', () => {
  it('marca el módulo abierto con aria-current="page"', async () => {
    const { wrapper } = await montar({ ruta: '/modulo/3' });
    await abrir(wrapper);
    const actuales = wrapper.findAll('[aria-current="page"]');
    expect(actuales).toHaveLength(1);
    expect(actuales[0]!.attributes('href')).toBe('/modulo/3');
  });

  it('sin módulo abierto (inicio) ningún nodo tiene aria-current', async () => {
    const { wrapper } = await montar({ ruta: '/' });
    await abrir(wrapper);
    expect(wrapper.findAll('[aria-current]')).toHaveLength(0);
  });

  it('los módulos completados lo dicen en voz alta y muestran su insignia', async () => {
    const { wrapper } = await montar({ completados: [1, 2] });
    await abrir(wrapper);
    const [uno, dos, tres] = nodos(wrapper);
    expect(uno!.text()).toContain('completado');
    expect(dos!.text()).toContain('completado');
    expect(tres!.text()).not.toContain('completado');
    // Insignia: círculo verde con marca de verificación (un <path> extra en el SVG).
    expect(uno!.findAll('svg path')).toHaveLength(1);
    expect(tres!.findAll('svg path')).toHaveLength(0);
  });

  it('la ausencia de bloqueo deja todos los módulos como enlaces (BLOQUEO_SECUENCIAL = false)', async () => {
    const { wrapper } = await montar({ completados: [] });
    await abrir(wrapper);
    expect(wrapper.findAll('a')).toHaveLength(6);
    expect(wrapper.findAll('[aria-disabled="true"]')).toHaveLength(0);
  });

  describe('con BLOQUEO_SECUENCIAL = true', () => {
    beforeEach(() => {
      config.bloqueo = true;
    });

    it('marca como bloqueados los módulos cuyo anterior no está completado, sin dejar de ser enlaces', async () => {
      const { wrapper } = await montar({ completados: [1] });
      await abrir(wrapper);
      const items = nodos(wrapper);
      // Todos son enlaces: un módulo bloqueado lleva a su página, que explica el bloqueo.
      expect(items.map((n) => n.element.tagName)).toEqual(['A', 'A', 'A', 'A', 'A', 'A']);
      expect(items.map((n) => n.attributes('data-bloqueado'))).toEqual([
        undefined,
        undefined,
        'true',
        'true',
        'true',
        'true',
      ]);
      expect(wrapper.findAll('[aria-disabled="true"]')).toHaveLength(0);
    });

    it('un módulo bloqueado es un enlace a su página y explica por qué está bloqueado', async () => {
      const { wrapper } = await montar({ completados: [1] });
      await abrir(wrapper);
      const bloqueado = nodos(wrapper)[2]!;
      expect(bloqueado.attributes('href')).toBe('/modulo/3');
      expect(bloqueado.text()).toContain('bloqueado: completa antes el módulo 2');
      // Insignia de candado: rectángulo del cuerpo del candado y arco de la argolla.
      expect(bloqueado.findAll('svg rect')).toHaveLength(1);
    });

    it('tocar un módulo bloqueado navega a su página (no es un callejón sin salida) y cierra el menú', async () => {
      const { wrapper, router } = await montar({ completados: [1] });
      await abrir(wrapper);
      await nodos(wrapper)[3]!.trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.fullPath).toBe('/modulo/4');
      expect(control(wrapper).attributes('aria-expanded')).toBe('false');
    });

    it('el teclado también llega a los bloqueados', async () => {
      const { wrapper } = await montar({ completados: [1] });
      await abrir(wrapper);
      const items = nodos(wrapper);
      enfocar(items[1]!);
      await items[1]!.trigger('keydown', { key: 'ArrowDown' });
      expect(document.activeElement).toBe(items[2]!.element);
    });

    it('un módulo ya completado no se muestra bloqueado y el abierto por URL sí lo está si le falta el anterior', async () => {
      const { wrapper } = await montar({ ruta: '/modulo/5', completados: [4] });
      await abrir(wrapper);
      const items = nodos(wrapper);
      // 4 completado sin que el 3 lo esté: sin candado.
      expect(items[3]!.attributes('data-bloqueado')).toBeUndefined();
      // 5 abierto y desbloqueado (el 4 está completado).
      expect(items[4]!.attributes('aria-current')).toBe('page');
      expect(items[4]!.attributes('data-bloqueado')).toBeUndefined();
      // El 6 queda bloqueado: el 5 no está completado.
      expect(items[5]!.attributes('data-bloqueado')).toBe('true');

      const bloqueadoAbierto = await montar({ ruta: '/modulo/3', completados: [] });
      await abrir(bloqueadoAbierto.wrapper);
      const nodo = nodos(bloqueadoAbierto.wrapper)[2]!;
      expect(nodo.attributes('aria-current')).toBe('page');
      expect(nodo.attributes('data-bloqueado')).toBe('true');
    });

    it('para el rol docente ningún módulo aparece bloqueado, y para el estudiante sí', async () => {
      const estudiante = await montar({ completados: [] });
      await abrir(estudiante.wrapper);
      expect(nodos(estudiante.wrapper).filter((n) => n.attributes('data-bloqueado'))).toHaveLength(
        5,
      );

      const docente = await montar({ completados: [] });
      useAuthStore().establecerUsuario(usuarioDePrueba({ rol: 'docente' }));
      await abrir(docente.wrapper);
      expect(nodos(docente.wrapper).filter((n) => n.attributes('data-bloqueado'))).toHaveLength(0);
    });

    it('coincide con las reglas de acceso de la página para las 64 combinaciones de completados', async () => {
      const { decidirAccesoModulo } = await import('@/components/modulo/acceso');
      const { estadoDelModulo } = await import('@/components/menu/estados');
      for (let mascara = 0; mascara < 64; mascara++) {
        const completados = [1, 2, 3, 4, 5, 6].filter((n) => (mascara >> (n - 1)) & 1);
        for (let n = 1; n <= 6; n++) {
          const menu = estadoDelModulo(n, {
            moduloActual: null,
            completados,
            bloqueoSecuencial: true,
          });
          const pagina = decidirAccesoModulo(n, completados, {
            bloqueoSecuencial: true,
            progresoConocido: true,
          });
          expect(menu.bloqueado, `módulo ${n}, completados ${completados.join(',')}`).toBe(
            !pagina.permitido,
          );
        }
      }
    });
  });
});

describe('MenuCircular: teclado', () => {
  it('al abrir lleva el foco al módulo abierto, o al primero si no hay', async () => {
    const enModulo = await montar({ ruta: '/modulo/4' });
    await abrir(enModulo.wrapper);
    expect(document.activeElement).toBe(nodos(enModulo.wrapper)[3]!.element);
    enModulo.wrapper.unmount();
    montados.pop();

    const enInicio = await montar({ ruta: '/' });
    await abrir(enInicio.wrapper);
    expect(document.activeElement).toBe(nodos(enInicio.wrapper)[0]!.element);
  });

  it('las flechas recorren los nodos con vuelta; Inicio y Fin saltan a los extremos', async () => {
    const { wrapper } = await montar();
    await abrir(wrapper);
    const items = nodos(wrapper);
    const enfocado = () => items.findIndex((n) => n.element === document.activeElement);
    const pulsar = (tecla: string) => items[enfocado()]!.trigger('keydown', { key: tecla });

    expect(enfocado()).toBe(0);
    await pulsar('ArrowDown');
    expect(enfocado()).toBe(1);
    await pulsar('ArrowRight');
    expect(enfocado()).toBe(2);
    await pulsar('ArrowUp');
    expect(enfocado()).toBe(1);
    await pulsar('ArrowLeft');
    expect(enfocado()).toBe(0);
    await pulsar('ArrowUp');
    expect(enfocado()).toBe(5);
    await pulsar('ArrowDown');
    expect(enfocado()).toBe(0);
    await pulsar('End');
    expect(enfocado()).toBe(5);
    await pulsar('Home');
    expect(enfocado()).toBe(0);
  });

  it('las teclas que maneja el menú no llegan al navegador (preventDefault)', async () => {
    const { wrapper } = await montar();
    await abrir(wrapper);
    const evento = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    nodos(wrapper)[0]!.element.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
    const otra = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    nodos(wrapper)[0]!.element.dispatchEvent(otra);
    expect(otra.defaultPrevented).toBe(false);
  });

  it('Escape cierra el menú y devuelve el foco al botón', async () => {
    const { wrapper } = await montar();
    await abrir(wrapper);
    await nodos(wrapper)[2]!.trigger('keydown', { key: 'Escape' });
    await flushPromises();
    expect(control(wrapper).attributes('aria-expanded')).toBe('false');
    expect(nodos(wrapper)).toHaveLength(0);
    expect(document.activeElement).toBe(control(wrapper).element);
  });

  it('Escape con el menú cerrado no hace nada', async () => {
    const { wrapper } = await montar();
    const evento = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    control(wrapper).element.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(false);
    expect(control(wrapper).attributes('aria-expanded')).toBe('false');
  });

  it('con el menú cerrado, las flechas sobre el botón lo abren en el primero o el último nodo', async () => {
    const abajo = await montar();
    enfocar(control(abajo.wrapper));
    await control(abajo.wrapper).trigger('keydown', { key: 'ArrowDown' });
    await flushPromises();
    expect(control(abajo.wrapper).attributes('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(nodos(abajo.wrapper)[0]!.element);
    abajo.wrapper.unmount();
    montados.pop();

    const arriba = await montar();
    enfocar(control(arriba.wrapper));
    await control(arriba.wrapper).trigger('keydown', { key: 'ArrowUp' });
    await flushPromises();
    expect(document.activeElement).toBe(nodos(arriba.wrapper)[5]!.element);
  });

  it('las combinaciones con Ctrl, Alt o Meta se dejan pasar', async () => {
    const { wrapper } = await montar();
    enfocar(control(wrapper));
    await control(wrapper).trigger('keydown', { key: 'ArrowDown', ctrlKey: true });
    await flushPromises();
    expect(control(wrapper).attributes('aria-expanded')).toBe('false');
  });

  it('con Enter sobre el botón se abre (clic nativo) y con Enter sobre un enlace navega', async () => {
    const { wrapper, router } = await montar();
    await abrir(wrapper);
    // En un navegador, Enter sobre un <a href> dispara un clic; aquí se simula ese clic.
    await nodos(wrapper)[1]!.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/modulo/2');
  });
});

describe('MenuCircular: disposición según la pantalla', () => {
  it('escritorio (1024 px): control a media altura en el borde izquierdo', async () => {
    const { wrapper } = await montar();
    const nav = wrapper.get('nav');
    expect(nav.attributes('data-modo')).toBe('escritorio');
    expect(nav.attributes('style')).toContain('top: 50%');
    expect(nav.classes()).toContain('fixed');
  });

  it('móvil (390 px): sigue la ventana, con el control abajo y un cuarto de círculo', async () => {
    const { wrapper } = await montar();
    fijarViewport(390, 844);
    await vi.waitFor(() => expect(wrapper.get('nav').attributes('data-modo')).toBe('movil'));
    expect(wrapper.get('nav').attributes('style')).not.toContain('top: 50%');
    await abrir(wrapper);
    // Todos los nodos quedan por encima del centro del control (y < 0).
    for (const li of wrapper.findAll('li')) {
      expect(Number(li.attributes('data-y'))).toBeLessThan(0);
    }
  });

  it('el nav se coloca por encima de la cabecera (z-40) y sube a z-50 al abrirse', async () => {
    const { wrapper } = await montar();
    expect(wrapper.get('nav').classes()).toContain('z-40');
    await abrir(wrapper);
    expect(wrapper.get('nav').classes()).toContain('z-50');
  });
});

describe('MenuCircular: animación', () => {
  it('con movimiento reducido no descarga GSAP', async () => {
    const { cargasPedidas } = await montar({ reducido: true });
    expect(cargasPedidas).toBe(0);
  });

  it('sin movimiento reducido pide GSAP al montarse', async () => {
    const { cargasPedidas } = await montar({ reducido: false });
    expect(cargasPedidas).toBe(1);
  });

  it('con movimiento reducido los nodos no llevan estilos de animación', async () => {
    const { wrapper } = await montar({ reducido: true });
    await abrir(wrapper);
    for (const li of wrapper.findAll('li')) {
      expect(li.attributes('style')).not.toMatch(/opacity|transform/);
    }
  });

  it('sin movimiento reducido anima la entrada y la salida y termina en el estado correcto', async () => {
    const { wrapper } = await montar({ reducido: false });
    await abrir(wrapper);
    expect(wrapper.findAll('li')).toHaveLength(6);
    // Al terminar la entrada no queda ningún estilo temporal.
    await vi.waitFor(
      () => {
        for (const li of wrapper.findAll('li')) {
          expect(li.attributes('style')).not.toMatch(/opacity|transform/);
        }
      },
      { timeout: 4000 },
    );
    await control(wrapper).trigger('click');
    expect(control(wrapper).attributes('aria-expanded')).toBe('false');
    // Los nodos se retiran cuando termina la animación de salida.
    await vi.waitFor(() => expect(wrapper.findAll('li')).toHaveLength(0), { timeout: 4000 });
  });

  it('abrir y cerrar rápido no deja nodos a medias', async () => {
    const { wrapper } = await montar({ reducido: false });
    await control(wrapper).trigger('click');
    await control(wrapper).trigger('click');
    await control(wrapper).trigger('click');
    await flushPromises();
    await vi.waitFor(
      () => {
        expect(wrapper.findAll('li')).toHaveLength(6);
        for (const li of wrapper.findAll('li')) {
          expect(li.attributes('style')).not.toMatch(/opacity|transform/);
        }
      },
      { timeout: 4000 },
    );
  });
});
