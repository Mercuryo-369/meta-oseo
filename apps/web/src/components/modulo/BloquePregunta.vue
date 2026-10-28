<script setup lang="ts">
/**
 * Bloque `pregunta`: pregunta de aplicación abierta (2.1 del documento de la docente). El estudiante escribe su
 * respuesta y luego la compara con la del docente. No puntúa: una respuesta libre no se corrige sola. Lo escrito se
 * guarda solo en este navegador (comodidad, no estado del curso): si el almacenamiento no está disponible, el
 * bloque funciona igual.
 */
import { ref, watch } from 'vue';
import { Eye } from '@lucide/vue';
import type { BloquePregunta } from '@/content/schema';
import TextoRico from './TextoRico.vue';

const props = defineProps<{ bloque: BloquePregunta }>();

const clave = `ova:pregunta:${props.bloque.id}`;
function leer(): string {
  try {
    return localStorage.getItem(clave) ?? '';
  } catch {
    return '';
  }
}
const respuesta = ref(leer());
const vista = ref(false);
watch(respuesta, (v) => {
  try {
    localStorage.setItem(clave, v);
  } catch {
    // Sin almacenamiento (ventana privada): se escribe igual, solo no se recuerda.
  }
});
</script>

<template>
  <section
    :id="`bloque-${bloque.id}`"
    class="bg-card space-y-4 rounded-2xl border p-4 sm:p-6"
    :aria-labelledby="`titulo-${bloque.id}`"
    data-testid="bloque-pregunta"
  >
    <h3 :id="`titulo-${bloque.id}`" class="font-serif text-xl font-semibold">
      {{ bloque.titulo }}
    </h3>
    <TextoRico :texto="bloque.enunciado" class="text-justify leading-relaxed" />
    <label class="block space-y-1">
      <span class="text-sm font-medium">Tu respuesta</span>
      <textarea
        v-model="respuesta"
        rows="5"
        class="bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-base outline-none focus-visible:ring-2"
        placeholder="Escribe aquí tu respuesta antes de compararla con la del docente."
      />
    </label>
    <button
      v-if="!vista"
      type="button"
      class="hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-2 rounded-full border px-4 py-2 font-medium outline-none focus-visible:ring-2"
      data-testid="ver-respuesta"
      @click="vista = true"
    >
      <Eye class="size-4" aria-hidden="true" />
      Ver la respuesta del docente
    </button>
    <div v-else class="bg-accent/50 rounded-xl border p-4" aria-live="polite">
      <p class="text-primary mb-1 text-sm font-semibold">Respuesta del docente</p>
      <TextoRico :texto="bloque.respuesta" class="text-justify leading-relaxed" />
    </div>
  </section>
</template>
