<script setup lang="ts">
/**
 * Un logro del catálogo. El estado (obtenido, siguiente, pendiente) se dice con icono Y con texto:
 * nunca solo con color.
 */
import { computed } from 'vue';
import { Award, Lock, Target } from '@lucide/vue';
import { formatearFecha } from '@/lib/formato';
import type { Logro } from '@/types/api';

const props = defineProps<{
  logro: Logro;
  /** Es el próximo logro por conseguir: se destaca. */
  siguiente?: boolean;
}>();

const fecha = computed(() => formatearFecha(props.logro.obtenido_en));
const estado = computed(() => {
  if (props.logro.obtenido) return 'obtenido';
  return props.siguiente ? 'siguiente' : 'pendiente';
});
</script>

<template>
  <li
    class="flex h-full min-w-0 items-start gap-3 rounded-xl border p-4"
    :class="[
      estado === 'obtenido' && 'bg-success-soft',
      estado === 'siguiente' && 'bg-accent border-eosina border-2',
      estado === 'pendiente' && 'bg-card',
    ]"
    :data-testid="`logro-${logro.codigo}`"
    :data-estado="estado"
  >
    <span
      class="flex size-11 shrink-0 items-center justify-center rounded-full"
      :class="[
        estado === 'obtenido' && 'bg-success text-background',
        estado === 'siguiente' && 'bg-eosina text-background',
        estado === 'pendiente' && 'bg-muted text-muted-foreground',
      ]"
      aria-hidden="true"
    >
      <Award v-if="estado === 'obtenido'" class="size-6" />
      <Target v-else-if="estado === 'siguiente'" class="size-6" />
      <Lock v-else class="size-5" />
    </span>
    <div class="min-w-0 space-y-1">
      <h3 class="font-serif text-lg leading-snug font-semibold">{{ logro.nombre }}</h3>
      <p class="text-sm leading-snug">{{ logro.descripcion }}</p>
      <p class="pt-1 text-sm font-medium" data-testid="logro-estado">
        <span v-if="estado === 'obtenido'" class="text-success">
          Obtenido<template v-if="fecha"> el {{ fecha }}</template>
        </span>
        <span v-else-if="estado === 'siguiente'" class="text-accent-foreground">
          Pendiente · tu siguiente logro
        </span>
        <span v-else class="text-muted-foreground">Pendiente</span>
      </p>
    </div>
  </li>
</template>
