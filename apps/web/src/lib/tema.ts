/**
 * Tema claro / oscuro.
 *
 * Por defecto, tema claro con fondos pastel (indicación de la docente, 2026-11-05: «usar colores claros o pastel para
 * los fondos»), aunque el sistema esté en oscuro. El oscuro se mantiene como opción. Si el estudiante elige uno con el botón de la cabecera
 * (`SelectorTema.vue`), esa elección se guarda en el navegador (`localStorage`, clave `ova.tema`) y manda
 * sobre el sistema en las visitas siguientes. Añade o quita la clase `dark` de <html> (los tokens de
 * src/style.css dependen de ella). El script en línea de index.html aplica lo mismo antes del primer
 * pintado para que no haya destello: si cambia la clave o los valores, cambiarlos también allí.
 */
import { computed, ref } from 'vue';

export type PreferenciaTema = 'claro' | 'oscuro' | 'sistema';

export const CLAVE_TEMA = 'ova.tema';

const preferencia = ref<PreferenciaTema>('sistema');

export function aplicarTema(oscuro: boolean): void {
  document.documentElement.classList.toggle('dark', oscuro);
}

/** Preferencia guardada; `sistema` si no hay o el almacenamiento no está disponible. */
export function leerPreferencia(): PreferenciaTema {
  try {
    const valor = localStorage.getItem(CLAVE_TEMA);
    return valor === 'claro' || valor === 'oscuro' ? valor : 'sistema';
  } catch {
    return 'sistema';
  }
}

function guardarPreferencia(p: PreferenciaTema): void {
  try {
    if (p === 'sistema') localStorage.removeItem(CLAVE_TEMA);
    else localStorage.setItem(CLAVE_TEMA, p);
  } catch {
    // Ventana privada o almacenamiento bloqueado: la elección dura hasta recargar.
  }
}

const oscuro = computed(() => preferencia.value === 'oscuro');

/** Elige un tema y lo recuerda (`sistema` vuelve a seguir al sistema operativo). */
function establecer(p: PreferenciaTema): void {
  preferencia.value = p;
  guardarPreferencia(p);
  aplicarTema(oscuro.value);
}

/** Pasa al tema contrario del que se ve ahora y lo recuerda. */
function alternar(): void {
  establecer(oscuro.value ? 'claro' : 'oscuro');
}

/** Estado del tema para los componentes. */
export function useTema() {
  return { preferencia, oscuro, establecer, alternar };
}

/** Aplica el tema guardado al arrancar (claro si no hay elección). Devuelve una función de limpieza, por contrato. */
export function iniciarTema(): () => void {
  preferencia.value = leerPreferencia();
  aplicarTema(oscuro.value);
  return () => {};
}
