<script setup lang="ts">
/**
 * Pulgares 👍/👎 de una respuesta del mentor (F3-11).
 *
 * - Dos botones de al menos 44 px con `aria-pressed`: el estado se dice con el icono relleno Y con
 *   un texto visible («Marcaste que te sirvió»), no solo con el color.
 * - Tocar el voto activo lo retira; tocar el otro lo cambia. Mientras el voto viaja al servidor los
 *   botones no responden (`aria-disabled`, sin quitarles el foco).
 * - El resultado se anuncia en una región `aria-live="polite"`; un fallo se avisa con `role="alert"`
 *   y el voto vuelve a como estaba.
 */
import { computed } from 'vue';
import { ThumbsDown, ThumbsUp } from '@lucide/vue';
import type { Valoracion } from '@/ai/mentorApi';

const props = defineProps<{
  valoracion: Valoracion | null | undefined;
  ocupado?: boolean;
  error?: string | null;
}>();
const emit = defineEmits<{ votar: [valor: Valoracion] }>();

const estado = computed(() => {
  if (props.valoracion === 1) return 'Marcaste que te sirvió';
  if (props.valoracion === -1) return 'Marcaste que no te sirvió';
  return '';
});

function votar(valor: Valoracion): void {
  if (props.ocupado) return;
  emit('votar', valor);
}

const CLASE_BOTON =
  'text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring aria-pressed:text-primary aria-pressed:bg-accent inline-flex min-h-11 min-w-11 items-center justify-center rounded-md outline-none focus-visible:ring-2 aria-disabled:cursor-wait aria-disabled:opacity-60';
</script>

<template>
  <div class="mt-2" data-testid="mentor-valoracion">
    <div class="-ml-2 flex flex-wrap items-center gap-x-1">
      <div role="group" aria-label="¿Te sirvió esta respuesta?" class="flex items-center">
        <button
          type="button"
          :class="CLASE_BOTON"
          :aria-pressed="valoracion === 1"
          :aria-disabled="ocupado ? 'true' : undefined"
          title="Me sirvió"
          data-testid="mentor-pulgar-arriba"
          @click="votar(1)"
        >
          <ThumbsUp aria-hidden="true" class="size-4" :class="valoracion === 1 && 'fill-current'" />
          <span class="sr-only">Me sirvió</span>
        </button>
        <button
          type="button"
          :class="CLASE_BOTON"
          :aria-pressed="valoracion === -1"
          :aria-disabled="ocupado ? 'true' : undefined"
          title="No me sirvió"
          data-testid="mentor-pulgar-abajo"
          @click="votar(-1)"
        >
          <ThumbsDown
            aria-hidden="true"
            class="size-4"
            :class="valoracion === -1 && 'fill-current'"
          />
          <span class="sr-only">No me sirvió</span>
        </button>
      </div>
      <span
        class="text-muted-foreground text-xs"
        role="status"
        aria-live="polite"
        data-testid="mentor-valoracion-estado"
        >{{ estado }}</span
      >
    </div>
    <p
      v-if="error"
      role="alert"
      class="text-destructive mt-1 text-xs"
      data-testid="mentor-valoracion-error"
    >
      {{ error }}
    </p>
  </div>
</template>
