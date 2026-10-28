<script setup lang="ts">
/**
 * Bloque `callout`: recuadro con una idea destacada. Las cuatro variantes se distinguen por icono
 * Y etiqueta (nunca solo por color): «Caso clínico», «Dato clave», «Atención» y «Recuerda».
 */
import { computed } from 'vue';
import type { Component } from 'vue';
import { Info, Lightbulb, Stethoscope, TriangleAlert } from '@lucide/vue';
import { ETIQUETA_VARIANTE_CALLOUT } from '@/content/schema';
import type { BloqueCallout, VarianteCallout } from '@/content/schema';
import TextoRico from './TextoRico.vue';

const props = defineProps<{ bloque: BloqueCallout }>();

const ESTILOS: Readonly<
  Record<VarianteCallout, { icono: Component; borde: string; color: string }>
> = {
  clinico: { icono: Stethoscope, borde: 'border-l-eosina', color: 'text-eosina' },
  dato: { icono: Info, borde: 'border-l-primary', color: 'text-primary' },
  atencion: { icono: TriangleAlert, borde: 'border-l-destructive', color: 'text-destructive' },
  recuerda: { icono: Lightbulb, borde: 'border-l-success', color: 'text-success' },
};

const estilo = computed(() => ESTILOS[props.bloque.variante]);
const etiqueta = computed(() => ETIQUETA_VARIANTE_CALLOUT[props.bloque.variante]);
const titulo = computed(() => props.bloque.titulo ?? etiqueta.value);
</script>

<template>
  <aside
    :id="`bloque-${bloque.id}`"
    :aria-labelledby="`titulo-${bloque.id}`"
    :data-variante="bloque.variante"
    :class="['bg-card rounded-lg border border-l-4 p-4', estilo.borde]"
    data-testid="bloque-callout"
  >
    <div class="flex items-center gap-2">
      <component :is="estilo.icono" :class="['size-5 shrink-0', estilo.color]" aria-hidden="true" />
      <p :id="`titulo-${bloque.id}`" class="text-foreground font-semibold">
        <!-- Con título propio se antepone la etiqueta de la variante: «Atención: …». -->
        <span v-if="bloque.titulo" class="font-normal">{{ etiqueta }}: </span>{{ titulo }}
      </p>
    </div>
    <TextoRico :texto="bloque.markdown" class="mt-2 text-justify leading-relaxed hyphens-auto" />
  </aside>
</template>
