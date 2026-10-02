<script setup lang="ts">
/**
 * Lista de mensajes con autoscroll.
 *
 * El desplazamiento automático sigue el final de la conversación mientras llega el texto, pero
 * se PAUSA si el estudiante sube a releer: en ese caso aparece "Ir al final". Enviar un mensaje
 * nuevo vuelve a pegar la vista al final.
 *
 * La región desplazable es enfocable (tabindex 0) para que quien usa solo teclado pueda
 * recorrerla con las flechas cuando no hay ningún enlace dentro (WCAG 2.1.1).
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { ArrowDown } from '@lucide/vue';
import type { Valoracion } from '@/ai/mentorApi';
import type { CitaMentor, MensajeMentor } from '@/ai/useMentor';
import { Button } from '@/components/ui/button';
import MentorMensaje from './MentorMensaje.vue';

const props = defineProps<{ mensajes: readonly MensajeMentor[] }>();
defineEmits<{ navegar: [cita: CitaMentor]; valorar: [idMensaje: string, valor: Valoracion] }>();

/** Cuántos píxeles de margen cuentan como "estar al final". */
const UMBRAL_PX = 64;

const contenedor = ref<HTMLElement | null>(null);
const pegado = ref(true);

/** Una respuesta fallida sin texto no se dibuja: el error se muestra aparte, en el panel. */
const visibles = computed(() =>
  props.mensajes.filter((m) => !(m.role === 'assistant' && m.status === 'error' && !m.content)),
);

function alDesplazar(): void {
  const el = contenedor.value;
  if (!el) return;
  pegado.value = el.scrollHeight - el.scrollTop - el.clientHeight <= UMBRAL_PX;
}

function irAlFinal(): void {
  const el = contenedor.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
  pegado.value = true;
}

/** Botón "Ir al final": además de bajar, devuelve el foco a la lista (el botón desaparece). */
function irAlFinalYEnfocar(): void {
  irAlFinal();
  contenedor.value?.focus({ preventScroll: true });
}

// Sigue el texto que llega mientras el estudiante no haya subido a leer.
watch(
  () => [
    props.mensajes.length,
    props.mensajes.at(-1)?.content.length,
    props.mensajes.at(-1)?.status,
  ],
  async () => {
    await nextTick();
    if (pegado.value) irAlFinal();
  },
);

// Un mensaje nuevo del estudiante siempre lleva al final.
const idUltimoEstudiante = computed(
  () => [...props.mensajes].reverse().find((m) => m.role === 'user')?.id,
);
watch(idUltimoEstudiante, async () => {
  pegado.value = true;
  await nextTick();
  irAlFinal();
});

onMounted(irAlFinal);

defineExpose({ irAlFinal });
</script>

<template>
  <div class="relative min-h-0 flex-1">
    <div
      ref="contenedor"
      class="h-full overflow-y-auto overscroll-contain px-3 py-4"
      role="region"
      aria-label="Conversación con el mentor"
      tabindex="0"
      data-testid="mentor-lista"
      @scroll.passive="alDesplazar"
    >
      <ol class="flex flex-col gap-3">
        <MentorMensaje
          v-for="m in visibles"
          :key="m.id"
          :mensaje="m"
          @navegar="(cita) => $emit('navegar', cita)"
          @valorar="(valor) => $emit('valorar', m.id, valor)"
        />
      </ol>
    </div>

    <div v-if="!pegado" class="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        class="pointer-events-auto border shadow-md"
        data-testid="mentor-ir-al-final"
        @click="irAlFinalYEnfocar"
      >
        <ArrowDown aria-hidden="true" />
        Ir al final
      </Button>
    </div>
  </div>
</template>
