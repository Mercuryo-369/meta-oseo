import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLAVE_TEMA, aplicarTema, iniciarTema, leerPreferencia, useTema } from './tema';

describe('tema claro/oscuro', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('aplicarTema añade y quita la clase dark de <html>', () => {
    aplicarTema(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    aplicarTema(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('iniciarTema sigue la preferencia del sistema y reacciona a sus cambios', () => {
    let alCambiar: ((e: MediaQueryListEvent) => void) | null = null;
    const consulta = {
      matches: true,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => (alCambiar = cb),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => consulta),
    );

    const detener = iniciarTema();
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    alCambiar!({ matches: false } as MediaQueryListEvent);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    detener();
    expect(consulta.removeEventListener).toHaveBeenCalledOnce();
  });

  it('claro por defecto: si el sistema no pide oscuro, no se añade la clase', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    iniciarTema();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('tema elegido por el estudiante', () => {
  const sistema = (oscuro: boolean) =>
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: oscuro, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );

  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('alternar pasa al tema contrario y lo recuerda', () => {
    sistema(false);
    iniciarTema();
    const tema = useTema();
    tema.alternar();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('oscuro');
    tema.alternar();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('claro');
  });

  it('la elección guardada manda sobre el sistema al volver', () => {
    localStorage.setItem(CLAVE_TEMA, 'claro');
    sistema(true);
    iniciarTema();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(useTema().preferencia.value).toBe('claro');
  });

  it('«sistema» borra la elección y vuelve a seguir al sistema', () => {
    sistema(true);
    iniciarTema();
    useTema().establecer('claro');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    useTema().establecer('sistema');
    expect(localStorage.getItem(CLAVE_TEMA)).toBeNull();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('un valor guardado desconocido equivale a seguir al sistema', () => {
    localStorage.setItem(CLAVE_TEMA, 'morado');
    expect(leerPreferencia()).toBe('sistema');
  });
});
