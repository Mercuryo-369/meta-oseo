<script setup lang="ts">
/**
 * Bloque `texto`: subtítulo opcional (nivel 3) y Markdown restringido. Con `fondo`, el texto se lee en un panel de
 * cristal sobre la ilustración (pedido de la docente: «usemos este fondo para poner la información de abajo»).
 */
import type { BloqueTexto } from '@/content/schema';
import BotonAmpliar from './BotonAmpliar.vue';
import TextoRico from './TextoRico.vue';

withDefaults(
  defineProps<{
    bloque: BloqueTexto;
    /** Texto largo a todo el ancho: en pantallas muy anchas se lee en dos columnas (líneas de largo cómodo). */
    columnas?: boolean;
    /** Dentro del recuadro junto a una imagen: sin columnas. */
    incrustado?: boolean;
    /**
     * El fondo es una figura de la misma sección (el módulo 5 abre con su primera imagen): no va detrás del texto,
     * donde el panel la tapa y pierde protagonismo, sino entera y grande, con el texto debajo (revisión del
     * módulo 5, 2026-11-06). `figuraAlt` es el texto alternativo de esa figura.
     */
    figura?: boolean;
    figuraAlt?: string;
  }>(),
  { columnas: false, incrustado: false, figura: false, figuraAlt: '' },
);
/** Tocar la figura la abre a pantalla completa, igual que su botón de ampliar. */
function ampliarVecina(evento: Event): void {
  const img = evento.currentTarget as HTMLElement;
  img.parentElement?.querySelector<HTMLButtonElement>('[data-testid="ampliar-imagen"]')?.click();
}
</script>

<template>
  <div
    v-if="bloque.fondo && figura"
    :id="`bloque-${bloque.id}`"
    class="flex flex-col gap-3"
    data-testid="bloque-texto"
    data-fondo="figura"
  >
    <div class="relative mx-auto w-fit max-w-full">
      <img
        :src="bloque.fondo"
        :alt="figuraAlt"
        loading="lazy"
        decoding="async"
        class="figura-apertura w-auto max-w-full cursor-zoom-in rounded-xl border object-contain"
        @click="ampliarVecina"
      />
      <BotonAmpliar :src="bloque.fondo" :alt="figuraAlt" />
    </div>
    <div
      class="bg-card border-l-acento space-y-2 rounded-2xl border border-l-4 p-4 shadow-sm sm:px-5"
    >
      <h3 v-if="bloque.titulo" class="font-serif text-xl font-semibold">{{ bloque.titulo }}</h3>
      <TextoRico
        :texto="bloque.markdown"
        class="text-justify text-base leading-relaxed hyphens-auto"
        :class="
          bloque.markdown.length > 500
            ? 'lg:columns-2 lg:gap-10 [&_li]:break-inside-avoid [&_p]:break-inside-avoid'
            : ''
        "
      />
    </div>
  </div>
  <div
    v-else-if="bloque.fondo"
    :id="`bloque-${bloque.id}`"
    class="relative isolate flex items-center overflow-hidden rounded-2xl border p-4 sm:p-8 lg:min-h-[var(--alto-vista,28rem)]"
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

<style scoped>
/* En escritorio la figura y su texto caben en la pantalla: la figura cede el alto que ocupa el panel de texto. */
@media (min-width: 1024px) {
  .figura-apertura {
    max-height: calc(var(--alto-vista, 100dvh - 6.5rem) - 13rem);
  }
}
</style>
