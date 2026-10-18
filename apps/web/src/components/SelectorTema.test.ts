import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { iniciarTema } from '@/lib/tema';
import SelectorTema from './SelectorTema.vue';

beforeEach(() => {
  document.documentElement.classList.remove('dark');
  localStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  iniciarTema();
});

describe('SelectorTema', () => {
  it('es un botón de alternancia con nombre fijo y su estado en aria-pressed', async () => {
    const w = mount(SelectorTema);
    const boton = w.get('[data-testid="selector-tema"]');
    expect(boton.attributes('aria-label')).toBe('Tema oscuro');
    expect(boton.attributes('aria-pressed')).toBe('false');
    await boton.trigger('click');
    expect(boton.attributes('aria-pressed')).toBe('true');
    expect(boton.attributes('title')).toBe('Usar tema claro');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
