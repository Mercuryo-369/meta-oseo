<script setup lang="ts">
/**
 * Anillo de avance ("3 de 6"). Es solo un indicador: el valor también está escrito en el centro
 * y en `aria-valuetext`, así que el estado no depende del color ni del trazo.
 */
import { computed, useId } from 'vue';

const props = defineProps<{
  valor: number;
  maximo: number;
  /** Nombre accesible, p. ej. "Módulos completados". */
  etiqueta: string;
  /** Texto bajo el número, p. ej. "módulos". */
  unidad?: string;
}>();

const RADIO = 42;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

const idEtiqueta = useId();
const fraccion = computed(() =>
  props.maximo > 0 ? Math.min(1, Math.max(0, props.valor / props.maximo)) : 0,
);
const trazo = computed(() => `${(fraccion.value * CIRCUNFERENCIA).toFixed(2)} ${CIRCUNFERENCIA}`);
const texto = computed(
  () => `${props.valor} de ${props.maximo}${props.unidad ? ` ${props.unidad}` : ''}`,
);
</script>

<template>
  <div
    role="progressbar"
    :aria-labelledby="idEtiqueta"
    aria-valuemin="0"
    :aria-valuemax="maximo"
    :aria-valuenow="valor"
    :aria-valuetext="texto"
    class="relative size-32 shrink-0"
    data-testid="anillo-progreso"
  >
    <span :id="idEtiqueta" class="sr-only">{{ etiqueta }}</span>
    <svg viewBox="0 0 100 100" class="size-full -rotate-90" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" :r="RADIO" fill="none" stroke-width="9" class="stroke-muted" />
      <circle
        cx="50"
        cy="50"
        :r="RADIO"
        fill="none"
        stroke-width="9"
        stroke-linecap="round"
        class="stroke-primary motion-safe:transition-[stroke-dasharray] motion-safe:duration-700"
        :stroke-dasharray="trazo"
      />
    </svg>
    <div
      class="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight"
      aria-hidden="true"
    >
      <span class="font-serif text-3xl font-semibold tabular-nums">{{ valor }}/{{ maximo }}</span>
      <span v-if="unidad" class="text-muted-foreground text-xs">{{ unidad }}</span>
    </div>
  </div>
</template>
