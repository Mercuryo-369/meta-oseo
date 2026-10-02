/** Guard de las rutas de certificado, logros y verificación pública (F5-05, F5-04). */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { RUTA_CERTIFICADO } from '@/config';
import { useAuthStore } from '@/stores/auth';
import { usuarioDePrueba } from '@/test/utils';
import { crearRouter } from '.';

const fetchMock = vi.fn<typeof fetch>();

function nuevoRouter() {
  return crearRouter(createMemoryHistory());
}

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('rutas de certificado y logros', () => {
  it('RUTA_CERTIFICADO (la que enlaza el módulo 6) resuelve a la página del certificado', () => {
    expect(nuevoRouter().resolve(RUTA_CERTIFICADO).name).toBe('certificado');
  });

  it('sin sesión, /certificado y /logros redirigen a /acceso y recuerdan el destino', async () => {
    const router = nuevoRouter();
    await router.push('/certificado');
    expect(router.currentRoute.value.name).toBe('acceso');
    expect(router.currentRoute.value.query.redirect).toBe('/certificado');

    await router.push('/logros');
    expect(router.currentRoute.value.name).toBe('acceso');
    expect(router.currentRoute.value.query.redirect).toBe('/logros');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con sesión, /certificado y /logros se abren dentro del shell autenticado', async () => {
    useAuthStore().establecerUsuario(usuarioDePrueba());
    const router = nuevoRouter();
    await router.push('/certificado');
    expect(router.currentRoute.value.name).toBe('certificado');
    expect(router.currentRoute.value.meta.publica).toBeUndefined();
    await router.push('/logros');
    expect(router.currentRoute.value.name).toBe('logros');
  });

  it('tras iniciar sesión, /acceso devuelve a /certificado', async () => {
    useAuthStore().establecerUsuario(usuarioDePrueba());
    const router = nuevoRouter();
    await router.push('/acceso?redirect=/certificado');
    expect(router.currentRoute.value.fullPath).toBe('/certificado');
  });
});

describe('ruta pública /verify/:codigo', () => {
  it('se abre sin sesión, sin pasar por /acceso y sin llamar a la API', async () => {
    const router = nuevoRouter();
    await router.push('/verify/OVA-7K3M-9QXA');
    expect(router.currentRoute.value.name).toBe('verificar');
    expect(router.currentRoute.value.params.codigo).toBe('OVA-7K3M-9QXA');
    expect(router.currentRoute.value.meta.publica).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('el código es opcional: /verify muestra el formulario', async () => {
    const router = nuevoRouter();
    await router.push('/verify');
    expect(router.currentRoute.value.name).toBe('verificar');
    expect(router.currentRoute.value.params.codigo).toBeFalsy();
  });

  it('está fuera del shell autenticado (sin menú, HUD ni mentor)', () => {
    const coincidencias = nuevoRouter().resolve('/verify/OVA-7K3M-9QXA').matched;
    expect(coincidencias).toHaveLength(1);
    expect(coincidencias[0]!.name).toBe('verificar');
  });

  it('también se abre con sesión iniciada', async () => {
    useAuthStore().establecerUsuario(usuarioDePrueba());
    const router = nuevoRouter();
    await router.push('/verify/OVA-7K3M-9QXA');
    expect(router.currentRoute.value.name).toBe('verificar');
  });

  it('el título de la pestaña es "Verificar certificado"', async () => {
    const router = nuevoRouter();
    await router.push('/verify/OVA-7K3M-9QXA');
    expect(document.title).toContain('Verificar certificado');
  });
});
