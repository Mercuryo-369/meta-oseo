<script setup lang="ts">
/**
 * Pasos del módulo: flechas encadenadas («3.1 > 3.2 > …», pedido de la usuaria del 2026-10-18), una por sección,
 * con su icono, su número y su título. La sección que se lee va rellena de azul; la completada lleva una marca
 * verde; la bloqueada, un candado.
 *
 *  - En pantallas anchas los pasos se reparten el ancho de la cabecera. Cuando no caben (móvil), la fila
 *    se desplaza en horizontal con ajuste a cada paso; el paso actual se centra solo al cambiar de sección.
 *  - En móvil, debajo, un selector nativo para saltar («Sección 2 de 5»): con muchos pasos es más
 *    rápido que desplazar la fila. Todo va en el flujo de la página, nunca fijo.
 *
 * El estado de cada sección se dice con icono y con texto (completada, pendiente, bloqueada), nunca
 * solo con color. Una sección bloqueada se puede activar: no navega, pero pide a la página que
 * explique qué falta (`bloqueada`), en vez de ser un botón mudo.
 *
 * El dibujo de cada paso lo pone `PasoFlecha.vue`.
 */
import { computed, nextTick, ref, watch } from 'vue';
import type { EstadoSeccion } from '@/content/scoring';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import PasoFlecha from './PasoFlecha.vue';

const props = defineProps<{
  secciones: readonly { id: string; titulo: string }[];
  estados: readonly EstadoSeccion[];
  /** Índice de la sección que se está leyendo. */
  indice: number;
  /** Número del módulo, para rotular los pasos «3.1», «3.2»… (sin él, «1», «2»…). */
  numeroModulo?: number;
  /** La fila continúa otra flecha (el título del módulo en la portada): el primer paso también lleva muesca. */
  encadenada?: boolean;
}>();

const emit = defineEmits<{
  ir: [indice: number];
  bloqueada: [indice: number];
}>();

const ETIQUETA: Readonly<Record<EstadoSeccion, string>> = {
  completada: 'completada',
  actual: 'pendiente',
  disponible: 'disponible',
  bloqueada: 'bloqueada',
};

const items = computed(() =>
  props.secciones.map((s, i) => {
    const estado = props.estados[i] ?? 'bloqueada';
    const titulo = textoPlanoDeMarkdown(s.titulo);
    return {
      i,
      id: s.id,
      numero: props.numeroModulo ? `${props.numeroModulo}.${i + 1}` : String(i + 1),
      titulo,
      estado,
      etiqueta: ETIQUETA[estado],
      bloqueada: estado === 'bloqueada',
      /** Distintivo del paso: completado, bloqueado o ninguno. */
      marca: (estado === 'completada'
        ? 'completada'
        : estado === 'bloqueada'
          ? 'bloqueada'
          : 'normal') as 'completada' | 'bloqueada' | 'normal',
      actual: i === props.indice,
    };
  }),
);

function activar(i: number): void {
  if (props.estados[i] === 'bloqueada') emit('bloqueada', i);
  else emit('ir', i);
}

function alElegir(evento: Event): void {
  const i = Number((evento.target as HTMLSelectElement).value);
  if (Number.isInteger(i)) activar(i);
  // El selector vuelve a la sección visible si la elegida está bloqueada.
  (evento.target as HTMLSelectElement).value = String(props.indice);
}

/* ----- El paso actual siempre a la vista dentro de la fila ----- */

const botones = ref<HTMLElement[]>([]);

watch(
  () => props.indice,
  async (i) => {
    await nextTick();
    const reducir =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    botones.value[i]?.scrollIntoView?.({
      block: 'nearest',
      inline: 'center',
      behavior: reducir ? 'auto' : 'smooth',
    });
  },
);
</script>

<template>
  <nav
    aria-label="Secciones del módulo"
    :class="encadenada ? 'md:flex md:min-w-0 md:flex-1 md:flex-col' : ''"
    data-testid="navegacion-secciones"
  >
    <ol
      :class="encadenada ? 'md:flex-1' : ''"
      class="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-testid="indice-secciones"
    >
      <li
        v-for="item in items"
        :key="item.id"
        class="flex-1 snap-start"
        :style="{ minWidth: encadenada ? '13rem' : '10rem' }"
        :class="item.i === 0 ? '' : '-ml-2'"
      >
        <button
          :ref="(el) => (botones[item.i] = el as HTMLElement)"
          type="button"
          :aria-current="item.actual ? 'step' : undefined"
          :aria-disabled="item.bloqueada ? 'true' : undefined"
          :data-estado="item.estado"
          :title="`${item.numero}. ${item.titulo} (${item.etiqueta})`"
          class="group focus-visible:ring-ring relative flex h-full min-h-11 w-full rounded-lg text-left drop-shadow-sm outline-none focus-visible:ring-2"
          @click="activar(item.i)"
        >
          <PasoFlecha
            :numero="String(item.numero)"
            :titulo="item.titulo"
            :etiqueta="item.etiqueta"
            :estado="item.marca"
            :actual="item.actual"
            :primero="item.i === 0 && !encadenada"
          />
        </button>
      </li>
    </ol>

    <!-- Móvil: salto directo a una sección -->
    <div class="mt-3 space-y-2 md:hidden" data-testid="indicador-movil">
      <p class="text-sm font-medium">
        Sección {{ indice + 1 }} de {{ secciones.length }}
        <span class="text-muted-foreground font-normal"> · {{ items[indice]?.titulo }} </span>
      </p>
      <label class="sr-only" for="ir-a-seccion">Ir a la sección</label>
      <select
        id="ir-a-seccion"
        class="border-input bg-card h-11 w-full rounded-md border px-3 text-base"
        :value="String(indice)"
        @change="alElegir"
      >
        <option v-for="item in items" :key="item.id" :value="String(item.i)">
          {{ item.numero }}. {{ item.titulo }} ({{ item.etiqueta }})
        </option>
      </select>
    </div>
  </nav>
</template>
