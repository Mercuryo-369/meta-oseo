import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Arranque real de la aplicación (main.ts): Pinia, router con historial del navegador,
 * plugin de movimiento y tema. Sustituye a abrir el navegador, que en la base no se usa.
 */
describe('arranque de la aplicación', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
    document.documentElement.classList.remove('dark');
    localStorage.clear();
    // Ninguna llamada a la API debe ser necesaria en modo de desarrollo sin backend.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('no debería llamarse'))),
    );
    // Cada prueba arranca en la raíz; el origen lo pone el entorno de pruebas (happy-dom).
    window.history.replaceState(null, '', '/');
  });

  it('con VITE_DEV_BYPASS_AUTH=true monta el inicio con el usuario ficticio y sin llamar a la API', async () => {
    vi.stubEnv('VITE_DEV_BYPASS_AUTH', 'true');

    await import('./main');
    // La primera carga de las vistas (importaciones perezosas) puede tardar más de 1 s al transformar.
    await vi.waitFor(() => expect(document.body.textContent).toContain('Hola, Estudiante'), {
      timeout: 10_000,
    });
    await flushPromises();

    expect(document.querySelectorAll('[data-testid="tarjeta-modulo"] a')).toHaveLength(6);
    expect(document.querySelector('main#contenido')).not.toBeNull();
    expect(document.title).toBe('Inicio · Metabolismo óseo · OVA');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sin el bypass y sin sesión muestra la pantalla de acceso', async () => {
    await import('./main');
    await vi.waitFor(() => expect(document.querySelector('#numero-identificacion')).not.toBeNull());
    expect(document.body.textContent).toContain('Ingresa con tu documento');
    expect(window.location.pathname).toBe('/acceso');
    expect(fetch).not.toHaveBeenCalled();
  });
});
