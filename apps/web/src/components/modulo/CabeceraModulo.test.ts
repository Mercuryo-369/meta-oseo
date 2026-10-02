import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { muestra, validar } from '@/content/__fixtures__/utiles';
import type { ModuloContenido } from '@/content/schema';
import { progresoDeModulo } from '@/content/scoring';
import CabeceraModulo from './CabeceraModulo.vue';

function modulo(numero: number, cambios?: (d: Record<string, unknown>) => void): ModuloContenido {
  const datos = muestra();
  cambios?.(datos);
  const r = validar(datos);
  if (!r.modulo) throw new Error(r.issues.join('; '));
  return { ...r.modulo, numero } as ModuloContenido;
}

const avance = (m: ModuloContenido) => progresoDeModulo(m, new Set<string>());

describe('CabeceraModulo: identidad', () => {
  it('muestra rótulo, frase y portada del módulo y fija su acento', () => {
    const m = modulo(5);
    const w = mount(CabeceraModulo, { props: { modulo: m, avance: avance(m) } });
    const raiz = w.get('[data-testid="cabecera-modulo"]');
    expect(raiz.attributes('style')).toContain('--acento: var(--acento-m5)');
    expect(w.get('[data-testid="rotulo-modulo"]').text()).toBe('Remodelado');
    expect(w.get('[data-testid="frase-modulo"]').text()).toBe('Un ciclo que nunca se detiene');
    expect(w.get('[data-testid="portada-modulo"]').attributes('aria-hidden')).toBe('true');
    expect(w.get('[data-testid="portada-modulo"] img').attributes('alt')).toBe('');
  });

  it('la portada de la cabecera se pide ya (no perezosa) y con prioridad alta', () => {
    const m = modulo(2);
    const w = mount(CabeceraModulo, { props: { modulo: m, avance: avance(m) } });
    const img = w.get('[data-testid="portada-modulo"] img');
    expect(img.attributes('loading')).toBe('eager');
    expect(img.attributes('fetchpriority')).toBe('high');
  });

  it('la apertura es la frase de gancho del resumen, sin repetir el subtítulo', () => {
    const m = modulo(3, (d) => {
      d.subtitulo = 'Mecanotransducción y formación ósea';
      d.resumen = 'Mecanotransducción y formación ósea. La mandíbula es el mejor caso de estudio.';
    });
    const w = mount(CabeceraModulo, { props: { modulo: m, avance: avance(m) } });
    expect(w.get('[data-testid="apertura-modulo"]').text()).toBe(
      'La mandíbula es el mejor caso de estudio.',
    );
  });

  it('si el resumen solo repite el subtítulo no se duplica el texto', () => {
    const m = modulo(2, (d) => {
      d.subtitulo = 'Origen y diferenciación celular';
      d.resumen = 'Origen y diferenciación celular.';
    });
    const w = mount(CabeceraModulo, { props: { modulo: m, avance: avance(m) } });
    expect(w.find('[data-testid="apertura-modulo"]').exists()).toBe(false);
  });

  it('los módulos pares invierten la posición de la ilustración; los impares, no', () => {
    const impar = mount(CabeceraModulo, {
      props: { modulo: modulo(3), avance: avance(modulo(3)) },
    });
    const par = mount(CabeceraModulo, { props: { modulo: modulo(4), avance: avance(modulo(4)) } });
    expect(impar.get('[data-testid="portada-modulo"]').classes()).toContain('md:order-last');
    expect(par.get('[data-testid="portada-modulo"]').classes()).not.toContain('md:order-last');
  });

  it('no usa animaciones propias (respeta prefers-reduced-motion por construcción)', () => {
    const m = modulo(1);
    const w = mount(CabeceraModulo, { props: { modulo: m, avance: avance(m) } });
    expect(w.html()).not.toMatch(/animate-|transition-transform|duration-/);
  });
});

describe('CabeceraModulo: avance y modos', () => {
  it('con avance muestra las actividades obligatorias y el puntaje', () => {
    const m = modulo(1);
    const w = mount(CabeceraModulo, {
      props: { modulo: m, avance: avance(m), puntajeObtenido: 12 },
    });
    expect(w.get('[data-testid="avance-obligatorias"]').text()).toContain('actividades');
    expect(w.get('[data-testid="puntaje-modulo"]').text()).toContain('12 de');
    expect(w.find('[data-testid="etiqueta-docente"]').exists()).toBe(false);
    expect(w.find('[data-testid="etiqueta-bloqueado"]').exists()).toBe(false);
  });

  it('bloqueado: presentación sin avance ni puntaje y con la ranura entre la presentación y los objetivos', () => {
    const m = modulo(4);
    const w = mount(CabeceraModulo, {
      props: { modulo: m, bloqueado: true },
      slots: { default: '<div data-testid="ranura">Panel</div>' },
    });
    expect(w.get('[data-testid="etiqueta-bloqueado"]').text()).toContain('Bloqueado');
    expect(w.find('[data-testid="avance-obligatorias"]').exists()).toBe(false);
    expect(w.find('[data-testid="puntaje-modulo"]').exists()).toBe(false);
    expect(w.find('[data-testid="duracion"]').exists()).toBe(true);
    const html = w.html();
    expect(html.indexOf('data-testid="ranura"')).toBeGreaterThan(html.indexOf('duracion'));
    expect(html.indexOf('data-testid="ranura"')).toBeLessThan(html.indexOf('titulo-objetivos'));
  });

  it('vista de docente: etiqueta visible, aviso de solo lectura y sin avance ni puntaje', () => {
    const m = modulo(6);
    const w = mount(CabeceraModulo, { props: { modulo: m, avance: avance(m), revision: true } });
    expect(w.get('[data-testid="etiqueta-docente"]').text()).toContain('Vista de docente');
    expect(w.get('[data-testid="aviso-docente"]').text()).toContain('no se guarda');
    expect(w.find('[data-testid="avance-obligatorias"]').exists()).toBe(false);
    expect(w.find('[data-testid="puntaje-modulo"]').exists()).toBe(false);
  });
});
