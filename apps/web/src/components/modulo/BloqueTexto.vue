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
    /**
     * Dónde va el panel de cristal sobre la ilustración de fondo (referencias de la docente, documento del
     * 2026-11-05): `izquierda` (definiciones sobre el fondo del módulo), `derecha` (entrada de 1.2: el panel deja
     * ver la calavera) o `abajo` (entrada de 1.1: la ilustración entera arriba y el texto en una franja debajo).
     */
    panel?: 'izquierda' | 'derecha' | 'abajo';
  }>(),
  { columnas: false, incrustado: false, figura: false, figuraAlt: '', panel: 'izquierda' },
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
  <!-- Panel abajo: la ilustración entera (sin recortar) y, debajo, el texto en una franja de cristal a todo el
       ancho; detrás, la misma ilustración difuminada rellena el recuadro. -->
  <div
    v-else-if="bloque.fondo && panel === 'abajo'"
    :id="`bloque-${bloque.id}`"
    class="relative isolate flex flex-col gap-3 overflow-hidden rounded-2xl border p-3 sm:p-4"
    data-testid="bloque-texto"
    data-fondo="true"
    data-panel="abajo"
  >
    <img
      :src="bloque.fondo"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      class="absolute inset-0 -z-10 size-full scale-110 object-cover opacity-30 blur-xl"
    />
    <img
      :src="bloque.fondo"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      class="ilustracion-entera mx-auto block w-auto max-w-full rounded-xl object-contain"
    />
    <div class="cristal-portada border-l-acento space-y-2 rounded-2xl border-l-4 px-5 py-4 sm:px-6">
      <h3 v-if="bloque.titulo" class="font-serif text-xl font-semibold">{{ bloque.titulo }}</h3>
      <TextoRico
        :texto="bloque.markdown"
        class="text-justify text-base leading-relaxed hyphens-auto"
      />
    </div>
  </div>
  <div
    v-else-if="bloque.fondo"
    :id="`bloque-${bloque.id}`"
    class="relative isolate flex items-center overflow-hidden rounded-2xl border p-4 sm:p-8 lg:min-h-[var(--alto-vista,28rem)]"
    :class="panel === 'derecha' ? 'justify-end' : ''"
    data-testid="bloque-texto"
    data-fondo="true"
    :data-panel="panel"
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
  /* Panel abajo: la ilustración cede el alto de la franja de texto. */
  .ilustracion-entera {
    max-height: calc(var(--alto-vista, 100dvh - 6.5rem) - 11rem);
  }
}
</style>
