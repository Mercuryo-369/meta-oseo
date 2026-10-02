/**
 * Carga de datos del panel: estado de carga, de error (en español) y recarga. Cancela la
 * petición anterior si se pide otra y descarta respuestas tardías, para que una búsqueda o
 * un cambio de página rápidos no muestren datos de una consulta vieja.
 */
import { onScopeDispose, ref, shallowRef } from 'vue';
import { ApiError } from '@/lib/api';

export function mensajeDeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return 'Tu cuenta no tiene permiso para ver esta información.';
    return e.message;
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

export function useCarga<T>(cargador: (signal: AbortSignal) => Promise<T>) {
  const datos = shallowRef<T | null>(null);
  const cargando = ref(false);
  const error = ref<string | null>(null);
  let controlador: AbortController | null = null;
  let version = 0;

  async function cargar(): Promise<void> {
    controlador?.abort();
    const actual = new AbortController();
    controlador = actual;
    const mia = ++version;
    cargando.value = true;
    error.value = null;
    try {
      const respuesta = await cargador(actual.signal);
      if (mia === version) datos.value = respuesta;
    } catch (e) {
      if (mia !== version) return;
      if (e instanceof DOMException && e.name === 'AbortError') return;
      error.value = mensajeDeError(e);
    } finally {
      if (mia === version) cargando.value = false;
    }
  }

  onScopeDispose(() => {
    version++;
    controlador?.abort();
  });

  return { datos, cargando, error, cargar };
}
