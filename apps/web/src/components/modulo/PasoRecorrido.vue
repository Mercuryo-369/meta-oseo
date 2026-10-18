<script setup lang="ts">
/**
 * Contenido de un paso de un recorrido horizontal (secciones en la cabecera del módulo, módulos en la
 * portada del inicio): nodo con el número, la marca de completado o el candado; riel hasta el paso
 * siguiente; debajo, un rótulo opcional («Módulo 4») y el título. Va DENTRO de un elemento interactivo (botón o enlace) con las clases
 * `relative flex flex-col`; este componente no es interactivo por sí mismo.
 *
 * Mismo lenguaje que el menú lateral (`navegacion/MenuModulos.vue`): el paso actual va con el nodo relleno
 * de azul, el completado en verde con una marca y el bloqueado en gris con candado. El estado se dice
 * también en texto para lectores de pantalla (`etiqueta`).
 */
import { Check, Lock } from '@lucide/vue';

defineProps<{
  /** Número que va dentro del nodo («4», «3.1»). */
  numero: string | number;
  /** Rótulo sobre el título («Módulo 4»). Se omite cuando el nodo ya dice todo («3.1»). */
  rotulo?: string;
  titulo: string;
  /** Texto del estado para lectores de pantalla («completada», «bloqueada»…). */
  etiqueta: string;
  estado: 'completada' | 'bloqueada' | 'normal';
  actual: boolean;
  /** El último paso no lleva riel a la derecha. */
  ultimo: boolean;
}>();
</script>

<template>
  <span class="contents">
    <span class="flex w-full items-center" aria-hidden="true">
      <span
        class="grid h-7 min-w-7 shrink-0 place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums"
        :class="
          actual
            ? 'bg-primary text-primary-foreground'
            : estado === 'completada'
              ? 'bg-success text-white'
              : estado === 'bloqueada'
                ? 'bg-muted text-muted-foreground'
                : 'bg-card text-foreground border'
        "
        data-testid="nodo-paso"
      >
        <Check v-if="estado === 'completada'" class="size-3.5" :stroke-width="3" />
        <Lock v-else-if="estado === 'bloqueada'" class="size-3" :stroke-width="2.5" />
        <template v-else>{{ numero }}</template>
      </span>
      <span v-if="!ultimo" class="bg-border ml-2 h-px flex-1" />
    </span>
    <span
      class="mt-2 block min-w-0 pr-3 leading-snug"
      :class="estado === 'bloqueada' ? 'text-muted-foreground' : 'text-foreground'"
    >
      <span
        v-if="rotulo"
        class="block text-xs font-semibold tabular-nums"
        :class="actual ? 'text-primary' : ''"
      >
        {{ rotulo }}
      </span>
      <span class="line-clamp-2 block text-[0.8rem]" :class="actual ? 'font-semibold' : ''">
        {{ titulo }}
      </span>
      <span class="sr-only">({{ etiqueta }})</span>
    </span>
  </span>
</template>
