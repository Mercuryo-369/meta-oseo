<script setup lang="ts">
/**
 * Un paso del recorrido de secciones con forma de flecha («>»): la punta de la derecha encaja en la muesca del
 * paso siguiente, así que la propia forma separa una sección de la otra. Lleva el icono de la sección, su número y
 * su título. La sección que se lee va rellena de azul; la completada, con una marca verde junto al número; la
 * bloqueada, atenuada y con candado. El estado también va en texto para lectores de pantalla (`etiqueta`).
 *
 * Va DENTRO del botón de `NavegacionSecciones.vue` (que pone el foco, el resalte al pasar y la sombra); este
 * componente no es interactivo.
 */
import { computed } from 'vue';
import { Check, Lock } from '@lucide/vue';
import { iconoDeSeccion } from './iconosSeccion';

const props = defineProps<{
  /** «3.1». */
  numero: string;
  titulo: string;
  /** Texto del estado para lectores de pantalla («completada», «bloqueada»…). */
  etiqueta: string;
  estado: 'completada' | 'bloqueada' | 'normal';
  actual: boolean;
  /** El primer paso no lleva muesca a la izquierda. */
  primero: boolean;
}>();

const icono = computed(() => iconoDeSeccion(props.titulo));
</script>

<template>
  <span
    class="paso-flecha flex h-full min-h-[4.5rem] w-full items-center gap-2.5 py-2 pr-6 transition-colors"
    :class="[
      primero ? 'paso-flecha--primero pl-3' : 'pl-7',
      actual
        ? 'bg-primary text-primary-foreground'
        : estado === 'bloqueada'
          ? 'cristal-paso text-muted-foreground opacity-80'
          : 'cristal-paso text-foreground group-hover:bg-card',
    ]"
    data-testid="nodo-paso"
  >
    <component :is="icono" class="size-7 shrink-0" :stroke-width="1.5" aria-hidden="true" />
    <span class="min-w-0 leading-tight">
      <span class="flex items-center gap-1 text-sm font-semibold tabular-nums">
        {{ numero }}
        <Check
          v-if="estado === 'completada'"
          class="size-3.5"
          :class="actual ? '' : 'text-success'"
          :stroke-width="3"
          aria-hidden="true"
        />
        <Lock
          v-else-if="estado === 'bloqueada'"
          class="size-3"
          :stroke-width="2.5"
          aria-hidden="true"
        />
      </span>
      <span class="mt-0.5 line-clamp-3 block text-[0.78rem]" :class="actual ? 'font-semibold' : ''">
        {{ titulo }}
      </span>
      <span class="sr-only">({{ etiqueta }})</span>
    </span>
  </span>
</template>

<style scoped>
/* Pasos no activos: blanco translúcido con desenfoque, como el título, sobre la ilustración de la portada. */
.cristal-paso {
  background: color-mix(in oklab, var(--card) 84%, transparent);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}
/* Flecha: punta a la derecha y muesca a la izquierda, del mismo tamaño (encajan al solaparse). */
.paso-flecha {
  clip-path: polygon(0 0, calc(100% - 1rem) 0, 100% 50%, calc(100% - 1rem) 100%, 0 100%, 1rem 50%);
}
.paso-flecha--primero {
  clip-path: polygon(0 0, calc(100% - 1rem) 0, 100% 50%, calc(100% - 1rem) 100%, 0 100%);
  border-radius: 0.5rem 0 0 0.5rem;
}
</style>
