<script setup lang="ts">
/**
 * Estados comunes de una sección del panel: cargando, error (con reintento), vacío o contenido.
 * Si ya hay datos y una recarga falla, se conservan los datos y se avisa del error encima.
 */
import { LoaderCircle, TriangleAlert } from '@lucide/vue';
import { Button } from '@/components/ui/button';

withDefaults(
  defineProps<{
    cargando: boolean;
    error: string | null;
    /** `true` si ya se recibió una respuesta (aunque esté vacía). */
    hayDatos: boolean;
    /** `true` si la respuesta no trae nada que mostrar. */
    vacio?: boolean;
    textoVacio?: string;
    /** Qué se está cargando, para el lector de pantalla ("el resumen"). */
    que?: string;
  }>(),
  { vacio: false, textoVacio: 'Todavía no hay datos para mostrar.', que: 'los datos' },
);

defineEmits<{ reintentar: [] }>();
</script>

<template>
  <div :aria-busy="cargando">
    <div
      v-if="error"
      role="alert"
      class="border-destructive/50 bg-card mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
    >
      <p class="text-destructive flex items-start gap-2 text-sm font-medium">
        <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ error }}</span>
      </p>
      <Button variant="outline" size="sm" @click="$emit('reintentar')">Reintentar</Button>
    </div>

    <p
      v-if="cargando && !hayDatos"
      role="status"
      class="text-muted-foreground flex items-center gap-2 py-8 text-sm"
    >
      <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
      Cargando {{ que }}…
    </p>
    <p
      v-else-if="hayDatos && vacio"
      class="bg-card text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm"
    >
      {{ textoVacio }}
    </p>
    <slot v-else-if="hayDatos" />
  </div>
</template>
