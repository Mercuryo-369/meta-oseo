<script setup lang="ts">
/**
 * Navegación principal dentro de un módulo (indicación de la usuaria, 2026-10-29): las secciones (1.1, 1.2…) en una
 * fila y, en la sección abierta, sus partes desglosadas (1.1.1, 1.1.2…), una por pantalla. Las demás secciones van
 * plegadas: solo su número, con el título en `title` y en el nombre accesible. Una sección bloqueada no se abre:
 * avisa con `bloqueada` para que la vista explique qué falta. En pantallas estrechas la fila se desplaza de lado.
 */
import { nextTick, ref, watch } from 'vue';
import { Check, Lock } from '@lucide/vue';
import type { EstadoSeccion } from '@/content/scoring';
import { textoPlanoDeMarkdown } from '@/content/markdown';

const props = defineProps<{
  numeroModulo: number;
  secciones: readonly { id: string; titulo: string }[];
  estados: readonly EstadoSeccion[];
  /** Sección abierta. */
  indice: number;
  /** Nombres de las partes de la sección abierta. */
  partes: readonly string[];
  /** Parte visible. */
  parte: number;
}>();

const emit = defineEmits<{
  irSeccion: [indice: number];
  irParte: [parte: number];
  bloqueada: [indice: number];
}>();

/* La parte visible siempre a la vista en la fila, aunque la sección tenga muchas partes. */
const fila = ref<HTMLElement | null>(null);
watch(
  () => [props.indice, props.parte],
  () =>
    void nextTick(() =>
      fila.value
        ?.querySelector('[aria-current="step"]')
        ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }),
    ),
  { immediate: true },
);

function numero(i: number): string {
  return `${props.numeroModulo}.${i + 1}`;
}
function alPulsarSeccion(i: number): void {
  if (props.estados[i] === 'bloqueada') emit('bloqueada', i);
  else emit('irSeccion', i);
}
</script>

<template>
  <nav aria-label="Secciones y partes del módulo" data-testid="navegacion-partes">
    <ol ref="fila" class="fila-partes flex items-center gap-1.5 overflow-x-auto pb-1">
      <li v-for="(s, i) in secciones" :key="s.id" class="shrink-0">
        <!-- Sección abierta: su número y título, y a continuación sus partes -->
        <div
          v-if="i === indice"
          class="bg-primary/10 border-primary flex items-center gap-1 rounded-full border py-1 pr-1 pl-3"
          data-testid="seccion-abierta"
        >
          <span
            class="text-primary max-w-[16rem] truncate text-sm font-bold"
            :title="textoPlanoDeMarkdown(s.titulo)"
          >
            {{ numero(i) }} · {{ textoPlanoDeMarkdown(s.titulo) }}
          </span>
          <ol class="flex items-center gap-1" aria-label="Partes de la sección">
            <li v-for="(p, j) in partes" :key="j">
              <button
                type="button"
                class="focus-visible:ring-ring min-h-8 rounded-full px-2.5 text-xs font-semibold tabular-nums outline-none focus-visible:ring-2"
                :class="
                  j === parte
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-primary/20 text-foreground'
                "
                :aria-current="j === parte ? 'step' : undefined"
                :aria-label="`${numero(i)}.${j + 1}: ${p}`"
                :title="p"
                :data-parte="j"
                @click="emit('irParte', j)"
              >
                {{ numero(i) }}.{{ j + 1 }}
              </button>
            </li>
          </ol>
        </div>
        <!-- Otra sección: plegada -->
        <button
          v-else
          type="button"
          class="focus-visible:ring-ring flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold tabular-nums outline-none focus-visible:ring-2"
          :class="
            estados[i] === 'bloqueada'
              ? 'text-muted-foreground border-dashed'
              : 'hover:bg-accent text-foreground'
          "
          :aria-label="`${numero(i)}: ${textoPlanoDeMarkdown(s.titulo)}${estados[i] === 'bloqueada' ? ' (bloqueada)' : estados[i] === 'completada' ? ' (completada)' : ''}`"
          :aria-disabled="estados[i] === 'bloqueada' ? 'true' : undefined"
          :title="textoPlanoDeMarkdown(s.titulo)"
          :data-seccion="s.id"
          @click="alPulsarSeccion(i)"
        >
          <Lock v-if="estados[i] === 'bloqueada'" class="size-3.5" aria-hidden="true" />
          <Check
            v-else-if="estados[i] === 'completada'"
            class="text-primary size-3.5"
            aria-hidden="true"
          />
          {{ numero(i) }}
        </button>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
/* Barra de desplazamiento fina: la fila solo se desplaza cuando la sección tiene muchas partes. */
.fila-partes {
  scrollbar-width: thin;
}
</style>
