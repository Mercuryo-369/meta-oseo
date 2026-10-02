/** Pulgares de una respuesta del mentor (F3-11): estado en texto, teclado y errores. */
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MentorValoracion from './MentorValoracion.vue';

const arriba = (w: ReturnType<typeof montar>) => w.get('[data-testid="mentor-pulgar-arriba"]');
const abajo = (w: ReturnType<typeof montar>) => w.get('[data-testid="mentor-pulgar-abajo"]');

function montar(props: Record<string, unknown> = {}) {
  return mount(MentorValoracion, { props: { valoracion: null, ...props } });
}

describe('MentorValoracion', () => {
  it('son dos botones nativos con nombre accesible, de 44 px y en un grupo con nombre', () => {
    const w = montar();
    expect(w.get('[role="group"]').attributes('aria-label')).toBe('¿Te sirvió esta respuesta?');
    expect(arriba(w).element.tagName).toBe('BUTTON');
    expect(arriba(w).text()).toBe('Me sirvió');
    expect(abajo(w).text()).toBe('No me sirvió');
    for (const b of [arriba(w), abajo(w)]) {
      expect(b.attributes('type')).toBe('button');
      expect(b.classes()).toEqual(expect.arrayContaining(['min-h-11', 'min-w-11']));
      expect(b.attributes('aria-pressed')).toBe('false');
    }
  });

  it('muestra el estado con aria-pressed Y con texto visible', () => {
    const positivo = montar({ valoracion: 1 });
    expect(arriba(positivo).attributes('aria-pressed')).toBe('true');
    expect(abajo(positivo).attributes('aria-pressed')).toBe('false');
    expect(positivo.get('[data-testid="mentor-valoracion-estado"]').text()).toBe(
      'Marcaste que te sirvió',
    );

    const negativo = montar({ valoracion: -1 });
    expect(abajo(negativo).attributes('aria-pressed')).toBe('true');
    expect(negativo.get('[data-testid="mentor-valoracion-estado"]').text()).toBe(
      'Marcaste que no te sirvió',
    );

    const sin = montar();
    expect(sin.get('[data-testid="mentor-valoracion-estado"]').text()).toBe('');
  });

  it('el resultado se anuncia en una región viva educada', () => {
    const estado = montar({ valoracion: 1 }).get('[data-testid="mentor-valoracion-estado"]');
    expect(estado.attributes('role')).toBe('status');
    expect(estado.attributes('aria-live')).toBe('polite');
  });

  it('al tocar emite el voto (también el activo: el compositor decide retirarlo)', async () => {
    const w = montar({ valoracion: 1 });
    await arriba(w).trigger('click');
    await abajo(w).trigger('click');
    expect(w.emitted('votar')).toEqual([[1], [-1]]);
  });

  it('mientras el voto viaja no emite, pero los botones conservan el foco', async () => {
    const w = montar({ ocupado: true });
    await arriba(w).trigger('click');
    expect(w.emitted('votar')).toBeUndefined();
    expect(arriba(w).attributes('aria-disabled')).toBe('true');
    expect(arriba(w).attributes('disabled')).toBeUndefined();
  });

  it('un fallo se avisa con role=alert', () => {
    const w = montar({ error: 'No se pudo guardar tu valoración. Inténtalo de nuevo.' });
    const alerta = w.get('[data-testid="mentor-valoracion-error"]');
    expect(alerta.attributes('role')).toBe('alert');
    expect(alerta.text()).toContain('No se pudo guardar');
    expect(montar().find('[data-testid="mentor-valoracion-error"]').exists()).toBe(false);
  });
});
