<script setup lang="ts">
/**
 * Botón «Módulos» de la cabecera: despliega el menú lateral en pantallas estrechas (en las anchas el menú
 * ya está a la vista y el botón se oculta). Patrón de navegación con botón de despliegue (WAI-ARIA):
 * `aria-expanded` y `aria-controls`; el menú son enlaces reales.
 */
import { computed } from 'vue';
import { Menu } from '@lucide/vue';
import { MODULOS } from '@/data/modulos';
import { useProgresoStore } from '@/stores/progreso';
import { ID_CONTROL_MENU, ID_MENU, useMenuModulos } from './useMenuModulos';

const { abierto, alternar } = useMenuModulos();
const progreso = useProgresoStore();
const completados = computed(() => progreso.modulosCompletados.length);
</script>

<template>
  <button
    :id="ID_CONTROL_MENU"
    type="button"
    class="hover:bg-muted focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium outline-none focus-visible:ring-2"
    :aria-expanded="abierto ? 'true' : 'false'"
    :aria-controls="ID_MENU"
    data-testid="menu-control"
    @click="alternar"
  >
    <Menu class="size-4" aria-hidden="true" />
    Módulos
    <span class="sr-only">, {{ completados }} de {{ MODULOS.length }} completados</span>
  </button>
</template>
