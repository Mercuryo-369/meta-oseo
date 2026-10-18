<script setup lang="ts">
/**
 * Botón de la cabecera para pasar del tema claro al oscuro y al revés. La elección se recuerda
 * (`lib/tema.ts`). El icono muestra el tema al que se pasa y la etiqueta lo dice con palabras.
 */
import { computed } from 'vue';
import { Moon, Sun } from '@lucide/vue';
import { useTema } from '@/lib/tema';

const tema = useTema();
const etiqueta = computed(() => (tema.oscuro.value ? 'Usar tema claro' : 'Usar tema oscuro'));
</script>

<template>
  <button
    type="button"
    class="hover:bg-muted focus-visible:ring-ring text-muted-foreground hover:text-foreground inline-grid size-11 shrink-0 place-items-center rounded-md outline-none focus-visible:ring-2"
    aria-label="Tema oscuro"
    :title="etiqueta"
    :aria-pressed="tema.oscuro.value ? 'true' : 'false'"
    data-testid="selector-tema"
    @click="tema.alternar()"
  >
    <Sun v-if="tema.oscuro.value" class="size-5" aria-hidden="true" />
    <Moon v-else class="size-5" aria-hidden="true" />
  </button>
</template>
