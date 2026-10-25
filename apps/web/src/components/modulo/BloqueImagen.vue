<script setup lang="ts">
/**
 * Bloque `imagen`: `alt` obligatorio (lo exige el esquema), pie con Markdown de una línea y
 * crédito. Si hay `figura` (la versión realista del dibujo), se muestra esa. Si el archivo no carga, se muestra el texto alternativo en un recuadro para que el
 * contenido no se pierda.
 */
import { ref } from 'vue';
import { ImageOff } from '@lucide/vue';
import type { BloqueImagen } from '@/content/schema';
import TextoRico from './TextoRico.vue';

defineProps<{ bloque: BloqueImagen }>();

const fallo = ref(false);
</script>

<template>
  <figure :id="`bloque-${bloque.id}`" class="space-y-2" data-testid="bloque-imagen">
    <img
      v-if="!fallo"
      :src="bloque.figura ?? bloque.src"
      :alt="bloque.alt"
      :width="bloque.ancho"
      :height="bloque.alto"
      loading="lazy"
      decoding="async"
      class="bg-card mx-auto h-auto max-h-[70dvh] w-full max-w-2xl rounded-lg border object-contain"
      @error="fallo = true"
    />
    <div
      v-else
      role="img"
      :aria-label="bloque.alt"
      class="bg-muted text-muted-foreground mx-auto flex max-w-2xl items-start gap-3 rounded-lg border border-dashed p-4"
      data-testid="imagen-caida"
    >
      <ImageOff class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p class="text-sm">No pudimos cargar la imagen. Lo que muestra: {{ bloque.alt }}</p>
    </div>
    <figcaption class="text-muted-foreground mx-auto max-w-2xl text-sm">
      <TextoRico :texto="bloque.pie" modo="linea" />
      <span v-if="bloque.credito" class="block text-xs"> Crédito: {{ bloque.credito }}</span>
    </figcaption>
  </figure>
</template>
