<script setup lang="ts">
/**
 * Estado vacío del chat: invitación a preguntar, con lo que el mentor ya sabe hacer por el
 * estudiante, de lo más a lo menos personal:
 *
 * 1. "Explícame ..." (F3-06): un botón por cada estructura o molécula que tiene seleccionada.
 * 2. "Para reforzar" (F3-07): los conceptos que conviene repasar, si el servidor sugiere alguno.
 * 3. Preguntas de ejemplo.
 * 4. "Ponme a prueba" (F4-03): un quiz corto de práctica.
 *
 * También avisa de la recuperación de la conversación anterior: mientras se pide (`cargando`) y si
 * falló (con "Reintentar"). Un historial vacío no dice nada.
 */
import { ClipboardCheck } from '@lucide/vue';
import type { ChipExplicame } from '@/ai/explicame';
import type { SugerenciaRefuerzo } from '@/ai/mentorApi';
import type { EstadoHistorial } from '@/ai/useMentor';
import { Button } from '@/components/ui/button';
import TarjetaRefuerzo from './TarjetaRefuerzo.vue';

withDefaults(
  defineProps<{
    chips?: readonly ChipExplicame[];
    sugerencias?: readonly SugerenciaRefuerzo[];
    estadoHistorial?: EstadoHistorial;
    errorHistorial?: string | null;
    puedeReintentarHistorial?: boolean;
  }>(),
  {
    chips: () => [],
    sugerencias: () => [],
    estadoHistorial: 'listo',
    errorHistorial: null,
    puedeReintentarHistorial: true,
  },
);
const emit = defineEmits<{
  preguntar: [texto: string];
  ponerAPrueba: [];
  practicar: [sugerencia: SugerenciaRefuerzo];
  navegar: [];
  reintentarHistorial: [];
}>();

const EJEMPLOS = [
  '¿Qué hacen los osteoclastos y los osteoblastos?',
  '¿Cómo se remodela el hueso a lo largo de la vida?',
  '¿Qué diferencia hay entre hueso cortical y trabecular?',
] as const;

const CLASE_BOTON =
  'border-input bg-card hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring min-h-11 w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-2';
</script>

<template>
  <div class="flex flex-col gap-4 px-4 py-6" data-testid="mentor-vacio">
    <p
      v-if="estadoHistorial === 'cargando'"
      class="text-muted-foreground text-sm"
      role="status"
      data-testid="mentor-historial-cargando"
    >
      Recuperando tu conversación anterior…
    </p>
    <div
      v-else-if="estadoHistorial === 'error' && errorHistorial"
      class="bg-accent text-accent-foreground flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm"
      role="alert"
      data-testid="mentor-historial-error"
    >
      <p class="min-w-0 flex-1">{{ errorHistorial }}</p>
      <Button
        v-if="puedeReintentarHistorial"
        type="button"
        size="sm"
        variant="outline"
        data-testid="mentor-historial-reintentar"
        @click="emit('reintentarHistorial')"
      >
        Reintentar
      </Button>
    </div>

    <div class="space-y-1">
      <p class="font-serif text-xl font-semibold">¿En qué te ayudo?</p>
      <p class="text-muted-foreground text-sm">
        Pregúntame sobre lo que estás viendo. Te guío para que llegues tú a la respuesta.
      </p>
    </div>

    <ul
      v-if="chips.length > 0"
      class="flex flex-col gap-2"
      aria-label="Explicaciones de lo que tienes seleccionado"
      data-testid="mentor-explicame"
    >
      <li v-for="chip in chips" :key="chip.clave">
        <button
          type="button"
          :class="CLASE_BOTON"
          class="border-primary font-medium"
          data-testid="mentor-explicame-chip"
          @click="emit('preguntar', chip.pregunta)"
        >
          Explícame {{ chip.nombre }}
        </button>
      </li>
    </ul>

    <TarjetaRefuerzo
      :sugerencias="sugerencias"
      practicable
      @navegar="emit('navegar')"
      @practicar="(s) => emit('practicar', s)"
    />

    <ul class="flex flex-col gap-2" aria-label="Preguntas de ejemplo">
      <li v-for="pregunta in EJEMPLOS" :key="pregunta">
        <button
          type="button"
          :class="CLASE_BOTON"
          data-testid="mentor-ejemplo"
          @click="emit('preguntar', pregunta)"
        >
          {{ pregunta }}
        </button>
      </li>
    </ul>

    <div class="border-t pt-4">
      <Button
        type="button"
        variant="outline"
        class="h-auto min-h-11 w-full justify-start gap-2 py-2.5 whitespace-normal"
        data-testid="mentor-a-prueba"
        @click="emit('ponerAPrueba')"
      >
        <ClipboardCheck aria-hidden="true" />
        <span class="flex flex-col items-start text-left">
          <span>Ponme a prueba</span>
          <span class="text-muted-foreground text-xs font-normal">
            3 preguntas de práctica sobre lo que estás viendo. No suman puntos.
          </span>
        </span>
      </Button>
    </div>
  </div>
</template>
