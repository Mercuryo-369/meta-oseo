<script setup lang="ts">
/**
 * Tarjeta "Para reforzar" (F3-07): los conceptos que conviene repasar según el avance del
 * estudiante, cada uno con su motivo en lenguaje claro y un enlace a la sección donde se estudia.
 * La usan el estado vacío del panel del mentor y la portada.
 *
 * - SIN RUIDO: sin sugerencias no dibuja nada (ni título ni mensaje de "no hay").
 * - Accesible: es una región con nombre; la lista es una lista; cada enlace mide al menos 44 px y
 *   dice el concepto y el módulo; la prioridad se escribe («Prioridad alta»), no depende del color.
 * - Los enlaces son rutas internas (`/modulo/3?s=...`): `refuerzo.ts` descarta cualquier otra.
 * - Con `practicable`, cada sugerencia ofrece "Ponme a prueba" sobre ese concepto.
 */
import { computed, useId } from 'vue';
import { RouterLink } from 'vue-router';
import { ClipboardCheck } from '@lucide/vue';
import type { PrioridadRefuerzo, SugerenciaRefuerzo } from '@/ai/mentorApi';

const props = withDefaults(
  defineProps<{
    sugerencias: readonly SugerenciaRefuerzo[];
    /** Cuántas se muestran como máximo. */
    limite?: number;
    /** Muestra el botón "Ponme a prueba" de cada sugerencia (panel del mentor). */
    practicable?: boolean;
  }>(),
  { limite: 3, practicable: false },
);
const emit = defineEmits<{
  navegar: [sugerencia: SugerenciaRefuerzo];
  practicar: [sugerencia: SugerenciaRefuerzo];
}>();

const idTitulo = useId();
const visibles = computed(() => props.sugerencias.slice(0, props.limite));

const TEXTO_PRIORIDAD: Record<PrioridadRefuerzo, string> = {
  alta: 'Prioridad alta',
  media: 'Prioridad media',
  baja: 'Prioridad baja',
};
const CLASE_PRIORIDAD: Record<PrioridadRefuerzo, string> = {
  alta: 'bg-accent text-accent-foreground border-eosina',
  media: 'bg-muted text-foreground border-border',
  baja: 'bg-muted text-muted-foreground border-border',
};
</script>

<template>
  <section
    v-if="visibles.length > 0"
    :aria-labelledby="idTitulo"
    class="bg-card rounded-xl border p-4"
    data-testid="tarjeta-refuerzo"
  >
    <h2 :id="idTitulo" class="font-serif text-lg leading-tight font-semibold">Para reforzar</h2>
    <p class="text-muted-foreground mt-0.5 text-sm">Según tu avance, te conviene repasar esto:</p>
    <ul role="list" class="mt-2 flex flex-col divide-y">
      <li
        v-for="s in visibles"
        :key="s.actividad_id"
        class="flex flex-col gap-1 py-2 first:pt-0 last:pb-0"
        data-testid="refuerzo-item"
        :data-prioridad="s.prioridad"
      >
        <RouterLink
          :to="s.url"
          class="text-primary hover:bg-accent focus-visible:ring-ring -mx-1.5 flex min-h-11 flex-col justify-center rounded-md px-1.5 py-1 outline-none focus-visible:ring-2"
          data-testid="refuerzo-enlace"
          @click="emit('navegar', s)"
        >
          <span class="font-medium underline underline-offset-2">{{ s.concepto }}</span>
          <span class="text-muted-foreground text-xs">
            Módulo {{ s.modulo
            }}<template v-if="s.seccion_titulo"> · {{ s.seccion_titulo }}</template>
          </span>
        </RouterLink>
        <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span data-testid="refuerzo-motivo">{{ s.motivo }}</span>
          <span
            class="rounded-full border px-2 py-0.5 text-xs font-medium"
            :class="CLASE_PRIORIDAD[s.prioridad]"
            data-testid="refuerzo-prioridad"
            >{{ TEXTO_PRIORIDAD[s.prioridad] }}</span
          >
        </p>
        <button
          v-if="practicable"
          type="button"
          class="text-primary hover:bg-accent focus-visible:ring-ring -mx-1.5 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md px-1.5 text-sm outline-none focus-visible:ring-2"
          data-testid="refuerzo-practicar"
          @click="emit('practicar', s)"
        >
          <ClipboardCheck aria-hidden="true" class="size-4" />
          <span
            >Ponme a prueba<span class="sr-only"> sobre {{ s.concepto }}</span></span
          >
        </button>
      </li>
    </ul>
  </section>
</template>
