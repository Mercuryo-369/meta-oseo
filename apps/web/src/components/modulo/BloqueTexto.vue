<script setup lang="ts">
/**
 * Bloque `texto`: subtítulo opcional (nivel 3) y Markdown restringido. Con `fondo`, el texto se lee en un panel de
 * cristal sobre la ilustración (pedido de la docente: «usemos este fondo para poner la información de abajo»).
 */
import type { BloqueTexto } from '@/content/schema';
import TextoRico from './TextoRico.vue';

withDefaults(
  defineProps<{
    bloque: BloqueTexto;
    /** Texto largo a todo el ancho: en pantallas muy anchas se lee en dos columnas (líneas de largo cómodo). */
    columnas?: boolean;
    /** Dentro del recuadro junto a una imagen: sin columnas. */
    incrustado?: boolean;
    /**
     * El fondo es una figura que la sección muestra completa más adelante (módulos 5 y 6 usan su primera imagen):
     * se vela para que el panel no tape a medias sus rótulos y se lea como fondo (revisión del módulo 5, 2026-11-06).
     */
    velado?: boolean;
  }>(),
  { columnas: false, incrustado: false, velado: false },
);
</script>

<template>
  <div
    v-if="bloque.fondo"
    :id="`bloque-${bloque.id}`"
    class="relative isolate flex items-center overflow-hidden rounded-2xl border p-4 sm:p-8 lg:min-h-[var(--alto-vista,28rem)]"
    :class="velado ? 'justify-center' : ''"
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
      :class="velado ? 'scale-105 opacity-25 blur-[3px]' : ''"
      :data-velado="velado ? 'true' : undefined"
    />
    <div
      class="cristal-portada border-l-acento max-w-3xl space-y-2 rounded-2xl border-l-4 p-5 sm:p-7"
    >
      <h3 v-if="bloque.titulo" class="font-serif text-xl font-semibold">{{ bloque.titulo }}</h3>
      <TextoRico
        :texto="bloque.markdown"
        class="text-justify text-base leading-relaxed hyphens-auto"
      />
    </div>
  </div>
  <div v-else :id="`bloque-${bloque.id}`" class="space-y-2" data-testid="bloque-texto">
    <h3 v-if="bloque.titulo" class="font-serif text-xl font-semibold">{{ bloque.titulo }}</h3>
    <TextoRico
      :texto="bloque.markdown"
      class="text-justify text-base leading-relaxed hyphens-auto"
      :class="
        columnas && !incrustado
          ? 'xl:columns-2 xl:gap-12 [&_li]:break-inside-avoid [&_p]:break-inside-avoid'
          : ''
      "
    />
  </div>
</template>
