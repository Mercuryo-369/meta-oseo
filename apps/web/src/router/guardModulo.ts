/**
 * Guard de los módulos (F2-08). YA NO REDIRIGE: un módulo bloqueado se abre en su propia dirección
 * y la página (`ModuloView.vue` → `ModuloBloqueado.vue`) lo muestra bloqueado en su sitio, con la
 * identidad del módulo, lo que falta y un botón al módulo que sí se puede estudiar. Redirigir al
 * primer módulo hacía que cada clic en un módulo bloqueado mostrara la página del módulo 1 y que los
 * seis módulos parecieran iguales.
 *
 * Lo que sí hace: antes de entrar a un módulo con sesión, espera el progreso (una sola petición
 * compartida con la propia página) para que la primera pantalla ya conozca el estado y no parpadee.
 * El bloqueo lo decide la página con `decidirAccesoModulo`, que falla ABIERTO si el progreso no se
 * pudo cargar (API caída, desarrollo sin backend): no se bloquea a nadie por un dato que falta.
 * Las secciones de dentro del módulo las protege también la página.
 */
import type { RouteLocationNormalized } from 'vue-router';
import { cargarModulo } from '@/content/registry';
import { useAuthStore } from '@/stores/auth';
import { useProgresoStore } from '@/stores/progreso';

export async function guardarModulo(to: RouteLocationNormalized): Promise<true> {
  if (to.name !== 'modulo') return true;
  // Sin sesión decide guardarSesion (registrado antes que este guard).
  if (!useAuthStore().isAuthenticated) return true;
  // El contenido (chunk del módulo) se pide a la vez que el progreso, no después de montar la página:
  // así el módulo no espera dos viajes en cascada. Un fallo aquí lo trata la propia página.
  void cargarModulo(Number(to.params.n)).catch(() => undefined);
  await useProgresoStore().load();
  return true;
}
