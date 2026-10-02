<script setup lang="ts">
/**
 * Barra del puntaje en las actividades obligatorias frente al umbral del certificado. Marca el
 * umbral con una línea y lo dice con texto: el estado no depende del color.
 */
import { computed, useId } from 'vue';
import { formatearPorcentaje } from '@/lib/formato';

const props = defineProps<{
  /** Porcentaje conseguido (0 a 100). */
  porcentaje: number;
  /** Porcentaje mínimo que exige el certificado. */
  umbral: number;
}>();

const idEtiqueta = useId();
const ancho = computed(() => Math.min(100, Math.max(0, props.porcentaje)));
const posicionUmbral = computed(() => Math.min(100, Math.max(0, props.umbral)));
const alcanzado = computed(() => props.porcentaje >= props.umbral);
const texto = computed(
  () =>
    `${formatearPorcentaje(props.porcentaje)}; se necesita al menos ${formatearPorcentaje(props.umbral)}`,
);
</script>

<template>
  <div class="space-y-1.5" data-testid="barra-puntaje">
    <p :id="idEtiqueta" class="text-sm font-medium">Puntaje en las actividades obligatorias</p>
    <div
      role="progressbar"
      :aria-labelledby="idEtiqueta"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="ancho"
      :aria-valuetext="texto"
      class="bg-muted relative h-4 w-full overflow-hidden rounded-full"
    >
      <div
        class="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700"
        :class="alcanzado ? 'bg-success' : 'bg-primary'"
        :style="{ width: `${ancho}%` }"
      />
      <div
        class="bg-foreground absolute inset-y-0 w-0.5"
        :style="{ left: `${posicionUmbral}%` }"
        aria-hidden="true"
      />
    </div>
    <p class="text-muted-foreground flex flex-wrap justify-between gap-x-3 text-sm tabular-nums">
      <span data-testid="barra-actual">
        Llevas <strong class="text-foreground">{{ formatearPorcentaje(porcentaje) }}</strong>
      </span>
      <span data-testid="barra-umbral">Mínimo: {{ formatearPorcentaje(umbral) }}</span>
    </p>
  </div>
</template>
