<script setup lang="ts">
/**
 * Bloque `video`: un mini video del diseñador (3.1 y 3.3 del documento de la docente). Sin `src`, muestra su espacio
 * reservado con lo que mostrará, para que la docente vea dónde irá. Con `src`, un reproductor nativo con controles
 * (sin reproducción automática ni sonido inesperado).
 */
import { Clapperboard } from '@lucide/vue';
import type { BloqueVideo } from '@/content/schema';
import TextoRico from './TextoRico.vue';

defineProps<{ bloque: BloqueVideo }>();
</script>

<template>
  <figure
    :id="`bloque-${bloque.id}`"
    class="mx-auto w-full max-w-4xl space-y-2"
    data-testid="bloque-video"
    :data-pendiente="bloque.src ? undefined : 'true'"
  >
    <video
      v-if="bloque.src"
      :src="bloque.src"
      :poster="bloque.poster"
      controls
      preload="metadata"
      class="bg-card aspect-video w-full rounded-xl border"
    />
    <div
      v-else
      class="bg-muted/60 text-muted-foreground flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center"
    >
      <Clapperboard class="size-10" :stroke-width="1.5" aria-hidden="true" />
      <p class="text-foreground font-semibold">Video en preparación</p>
      <p class="max-w-xl text-sm">
        <TextoRico :texto="bloque.descripcion" modo="linea" />
      </p>
    </div>
    <figcaption class="text-muted-foreground text-center text-sm">{{ bloque.titulo }}</figcaption>
  </figure>
</template>
