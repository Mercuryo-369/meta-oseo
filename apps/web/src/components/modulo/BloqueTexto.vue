<script setup lang="ts">
/**
 * Bloque `texto`: subtítulo opcional (nivel 3) y Markdown restringido. Con `fondo`, el texto se lee en un panel de
 * cristal sobre la ilustración (pedido de la docente: «usemos este fondo para poner la información de abajo»).
 */
import type { BloqueTexto } from '@/content/schema';
import TextoRico from './TextoRico.vue';

defineProps<{ bloque: BloqueTexto }>();
</script>

<template>
  <div
    v-if="bloque.fondo"
    :id="`bloque-${bloque.id}`"
    class="relative isolate overflow-hidden rounded-2xl border p-4 sm:p-8"
    data-testid="bloque-texto"
    data-fondo="true"
  >
    <img
      :src="bloque.fondo"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      class="absolute inset-0 -z-10 size-full object-cover"
    />
    <div class="cristal-portada max-w-prose space-y-2 rounded-2xl p-5 sm:p-6">
      <h3 v-if="bloque.titulo" class="font-serif text-xl font-semibold">{{ bloque.titulo }}</h3>
      <TextoRico :texto="bloque.markdown" class="text-base leading-relaxed" />
    </div>
  </div>
  <div v-else :id="`bloque-${bloque.id}`" class="space-y-2" data-testid="bloque-texto">
    <h3 v-if="bloque.titulo" class="font-serif text-xl font-semibold">{{ bloque.titulo }}</h3>
    <TextoRico :texto="bloque.markdown" class="max-w-prose text-base leading-relaxed" />
  </div>
</template>
