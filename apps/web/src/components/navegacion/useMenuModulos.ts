/**
 * Estado compartido entre el botón «Módulos» de la cabecera (pantallas estrechas) y el menú lateral: si el
 * menú está desplegado. En pantallas anchas el menú es una barra lateral siempre visible y este estado no
 * cambia nada a la vista.
 */
import { ref } from 'vue';

const abierto = ref(false);

/** Id del botón que despliega el menú (para devolverle el foco al cerrarlo con Escape). */
export const ID_CONTROL_MENU = 'control-menu-modulos';
/** Id del menú (para `aria-controls`). */
export const ID_MENU = 'menu-modulos';

export function useMenuModulos() {
  return {
    abierto,
    abrir: () => {
      abierto.value = true;
    },
    cerrar: () => {
      abierto.value = false;
    },
    alternar: () => {
      abierto.value = !abierto.value;
    },
  };
}
