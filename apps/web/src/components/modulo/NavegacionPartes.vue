<script setup lang="ts">
/**
 * Navegación principal dentro de un módulo (indicación de la usuaria, 2026-10-29): las secciones (1.1, 1.2…) en una
 * fila y, en la sección abierta, sus partes desglosadas (1.1.1, 1.1.2…), una por pantalla. Las demás secciones van
 * plegadas: solo su número, con el título en `title` y en el nombre accesible. Una sección bloqueada no se abre:
 * avisa con `bloqueada` para que la vista explique qué falta. En pantallas estrechas la fila se desplaza de lado.
 */
import { computed, nextTick, ref, watch } from 'vue';
import { Check, ChevronLeft, ChevronRight, Lock } from '@lucide/vue';
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
  /** Solo las partes de la sección abierta (las secciones van en `BarraModulo`, con flechas). */
  soloPartes?: boolean;
  /** Subcapítulo de cada parte: entre un subcapítulo y el siguiente va una separación con su nombre. */
  subcapitulos?: readonly (string | null)[];
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

/**
 * Puntos a la vista en el indicador compacto: todos si caben; si la sección tiene muchas partes, una ventana
 * centrada en la visible, con los puntos de los bordes más pequeños para indicar que hay más.
 */
const MAX_PUNTOS = 15;
const ventana = computed(() => {
  const total = props.partes.length;
  if (total <= MAX_PUNTOS) return { desde: 0, hasta: total };
  const desde = Math.min(Math.max(props.parte - Math.floor(MAX_PUNTOS / 2), 0), total - MAX_PUNTOS);
  return { desde, hasta: desde + MAX_PUNTOS };
});
const visibles = computed(() =>
  Array.from(
    { length: ventana.value.hasta - ventana.value.desde },
    (_, k) => ventana.value.desde + k,
  ),
);
function esBorde(j: number): boolean {
  const { desde, hasta } = ventana.value;
  return (j === desde && desde > 0) || (j === hasta - 1 && hasta < props.partes.length);
}
function cambiaSubcapitulo(j: number): boolean {
  const s = props.subcapitulos;
  return j > ventana.value.desde && Boolean(s?.[j]) && s?.[j] !== s?.[j - 1];
}

function numero(i: number): string {
  return `${props.numeroModulo}.${i + 1}`;
}
function alPulsarSeccion(i: number): void {
  if (props.estados[i] === 'bloqueada') emit('bloqueada', i);
  else emit('irSeccion', i);
}
</script>

<template>
  <nav
    :aria-label="soloPartes ? 'Partes de la sección' : 'Secciones y partes del módulo'"
    data-testid="navegacion-partes"
  >
    <!-- Indicador compacto «· · · 3.3.1 · · ·»: la parte visible con su número y las demás como puntos (las ya
         recorridas en el color del módulo). Una separación marca el cambio de subcapítulo. -->
    <div
      v-if="soloPartes && partes.length > 0"
      class="bg-card inline-flex max-w-full items-center gap-0.5 rounded-full border p-0.5 shadow-sm"
      data-testid="indicador-partes"
    >
      <button
        type="button"
        class="focus-visible:ring-ring text-muted-foreground hover:bg-secondary hover:text-foreground grid size-8 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-30"
        :disabled="parte <= 0"
        :aria-label="`Parte anterior: ${numero(indice)}.${parte}`"
        data-testid="parte-anterior"
        @click="emit('irParte', parte - 1)"
      >
        <ChevronLeft class="size-4" aria-hidden="true" />
      </button>
      <ol class="flex min-w-0 items-center">
        <li v-for="j in visibles" :key="j" class="flex shrink-0 items-center">
          <span
            v-if="cambiaSubcapitulo(j)"
            class="bg-border mx-1 h-4 w-px"
            :title="subcapitulos?.[j] ?? undefined"
            aria-hidden="true"
          />
          <button
            v-if="j === parte"
            type="button"
            class="bg-primary text-primary-foreground focus-visible:ring-ring mx-0.5 min-h-7 rounded-full px-3 text-xs font-bold tabular-nums shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            aria-current="step"
            :aria-label="`${numero(indice)}.${j + 1}, parte ${j + 1} de ${partes.length}: ${partes[j]}`"
            :title="partes[j]"
            :data-parte="j"
          >
            {{ numero(indice) }}.{{ j + 1 }}
          </button>
          <button
            v-else
            type="button"
            class="group focus-visible:ring-ring grid h-8 w-4 place-items-center rounded-full outline-none focus-visible:ring-2"
            :aria-label="`${numero(indice)}.${j + 1}: ${partes[j]}`"
            :title="`${numero(indice)}.${j + 1} · ${partes[j]}`"
            :data-parte="j"
            @click="emit('irParte', j)"
          >
            <span
              class="block rounded-full transition-transform group-hover:scale-150 motion-reduce:transition-none"
              :class="[
                esBorde(j) ? 'size-1' : 'size-2',
                j < parte ? 'bg-primary/60' : 'bg-muted-foreground/35',
              ]"
            />
          </button>
        </li>
      </ol>
      <button
        type="button"
        class="focus-visible:ring-ring text-muted-foreground hover:bg-secondary hover:text-foreground grid size-8 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-30"
        :disabled="parte >= partes.length - 1"
        :aria-label="`Parte siguiente: ${numero(indice)}.${parte + 2}`"
        data-testid="parte-siguiente"
        @click="emit('irParte', parte + 1)"
      >
        <ChevronRight class="size-4" aria-hidden="true" />
      </button>
    </div>
    <ol v-else ref="fila" class="fila-partes flex items-center gap-1.5 overflow-x-auto pb-1">
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
