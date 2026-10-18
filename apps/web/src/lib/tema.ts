/**
 * Tema claro / oscuro.
 *
 * Por defecto sigue la preferencia del sistema. Si el estudiante elige uno con el botón de la cabecera
 * (`SelectorTema.vue`), esa elección se guarda en el navegador (`localStorage`, clave `ova.tema`) y manda
 * sobre el sistema en las visitas siguientes. Añade o quita la clase `dark` de <html> (los tokens de
 * src/style.css dependen de ella). El script en línea de index.html aplica lo mismo antes del primer
 * pintado para que no haya destello: si cambia la clave o los valores, cambiarlos también allí.
 */
import { computed, ref } from 'vue';

export type PreferenciaTema = 'claro' | 'oscuro' | 'sistema';

export const CLAVE_TEMA = 'ova.tema';

const preferencia = ref<PreferenciaTema>('sistema');
const sistemaOscuro = ref(false);

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

const oscuro = computed(() =>
  preferencia.value === 'sistema' ? sistemaOscuro.value : preferencia.value === 'oscuro',
);

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

/** Aplica el tema al arrancar y sigue los cambios del sistema. Devuelve la función para dejar de escuchar. */
export function iniciarTema(): () => void {
  preferencia.value = leerPreferencia();
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    aplicarTema(oscuro.value);
    return () => {};
  }
  const consulta = window.matchMedia('(prefers-color-scheme: dark)');
  sistemaOscuro.value = consulta.matches;
  aplicarTema(oscuro.value);
  const alCambiar = (e: MediaQueryListEvent) => {
    sistemaOscuro.value = e.matches;
    aplicarTema(oscuro.value);
  };
  consulta.addEventListener('change', alCambiar);
  return () => consulta.removeEventListener('change', alCambiar);
}
