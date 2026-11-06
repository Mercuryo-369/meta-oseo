<script setup lang="ts">
/**
 * Bloque `pregunta`: pregunta de aplicación abierta (2.1 del documento de la docente). El estudiante escribe su
 * respuesta, puede pedir al mentor de IA una retroalimentación (`POST /api/mentor/retroalimentacion`, pedido de la
 * docente para las preguntas de «detecta y corrige el error» de 4.1) y luego la compara con la del docente.
 *
 * No puntúa: la retroalimentación de la IA explica qué está bien, qué falta y por qué, pero no da puntos ni logros y
 * el servidor no guarda la respuesta. Lo escrito se guarda solo en este navegador (comodidad, no estado del curso):
 * si el almacenamiento no está disponible, el bloque funciona igual. Nunca se muestra texto crudo de un error del
 * servidor: pasa por `falloDeRetroalimentacion`.
 */
import type { Component } from 'vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Eye,
  LoaderCircle,
  MessageSquareText,
} from '@lucide/vue';
import type { BloquePregunta } from '@/content/schema';
import { falloDeRetroalimentacion } from '@/ai/errores';
import type { RespuestaRetroalimentacion, ValoracionRespuesta } from '@/ai/mentorApi';
import { pedirRetroalimentacion } from '@/ai/mentorApi';
import { ApiError } from '@/lib/api';
import { useContextoStore } from '@/stores/contextoPedagogico';
import TextoRico from './TextoRico.vue';

const props = defineProps<{ bloque: BloquePregunta }>();

/** Límites del contrato para la respuesta del estudiante (sin contar espacios de los bordes). */
const MIN_CARACTERES = 10;
const MAX_CARACTERES = 2000;

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

// --- Retroalimentación con IA ---------------------------------------------------------------

const contexto = useContextoStore();
const estado = ref<'inactivo' | 'cargando' | 'error' | 'listo'>('inactivo');
const resultado = ref<RespuestaRetroalimentacion | null>(null);
const error = ref<string | null>(null);
let control: AbortController | null = null;

const caracteresUtiles = computed(() => respuesta.value.replace(/\s/g, '').length);
const puedePedir = computed(
  () =>
    estado.value !== 'cargando' &&
    caracteresUtiles.value >= MIN_CARACTERES &&
    respuesta.value.trim().length <= MAX_CARACTERES,
);

const ETIQUETAS: Record<ValoracionRespuesta, { texto: string; icono: Component; clases: string }> =
  {
    acertada: {
      texto: 'Acertada',
      icono: CircleCheck,
      clases: 'border-success bg-success-soft text-success',
    },
    parcial: {
      texto: 'Parcialmente acertada',
      icono: CircleAlert,
      clases: 'border-primary/40 bg-accent/50 text-primary',
    },
    incorrecta: {
      texto: 'Incorrecta',
      icono: CircleX,
      clases: 'border-destructive/50 bg-destructive/10 text-destructive',
    },
  };
const etiqueta = computed(() => (resultado.value ? ETIQUETAS[resultado.value.valoracion] : null));

async function pedir(): Promise<void> {
  if (!puedePedir.value) return;
  control?.abort();
  const miControl = new AbortController();
  control = miControl;
  estado.value = 'cargando';
  error.value = null;
  try {
    const r = await pedirRetroalimentacion(
      {
        pregunta_id: props.bloque.id,
        respuesta: respuesta.value.trim(),
        contexto: contexto.toPayload(),
      },
      miControl.signal,
    );
    if (miControl.signal.aborted) return;
    if (
      !(r.valoracion in ETIQUETAS) ||
      typeof r.retroalimentacion !== 'string' ||
      !r.retroalimentacion
    ) {
      throw new ApiError(500, 'respuesta_invalida', '');
    }
    resultado.value = r;
    estado.value = 'listo';
  } catch (e) {
    if (miControl.signal.aborted) return; // cancelado a propósito (el bloque se desmontó)
    error.value = falloDeRetroalimentacion(
      e instanceof ApiError ? e : new ApiError(0, 'red', ''),
    ).mensaje;
    estado.value = 'error';
  } finally {
    if (control === miControl) control = null;
  }
}

onBeforeUnmount(() => control?.abort());
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
        :maxlength="MAX_CARACTERES"
        class="bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-base outline-none focus-visible:ring-2"
        placeholder="Escribe aquí tu respuesta antes de compararla con la del docente."
      />
    </label>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium outline-none hover:opacity-90 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!puedePedir"
        :aria-describedby="
          caracteresUtiles < MIN_CARACTERES ? `ayuda-retro-${bloque.id}` : undefined
        "
        data-testid="pedir-retroalimentacion"
        @click="pedir"
      >
        <LoaderCircle
          v-if="estado === 'cargando'"
          class="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
        <MessageSquareText v-else class="size-4" aria-hidden="true" />
        {{ estado === 'cargando' ? 'Revisando tu respuesta…' : 'Pedir retroalimentación' }}
      </button>
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
    </div>
    <p
      v-if="caracteresUtiles < MIN_CARACTERES"
      :id="`ayuda-retro-${bloque.id}`"
      class="text-muted-foreground text-sm"
    >
      Escribe al menos {{ MIN_CARACTERES }} caracteres para pedir la retroalimentación del mentor.
    </p>

    <div aria-live="polite" data-testid="retroalimentacion">
      <p
        v-if="estado === 'error' && error"
        class="text-destructive flex items-start gap-2 text-sm"
        role="alert"
      >
        <CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {{ error }}
      </p>
      <div
        v-else-if="estado === 'listo' && resultado && etiqueta"
        class="space-y-2 rounded-xl border p-4"
      >
        <p class="text-sm font-semibold">Retroalimentación del mentor</p>
        <span
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium"
          :class="etiqueta.clases"
          data-testid="valoracion"
        >
          <component :is="etiqueta.icono" class="size-4" aria-hidden="true" />
          {{ etiqueta.texto }}
        </span>
        <p class="leading-relaxed whitespace-pre-line">{{ resultado.retroalimentacion }}</p>
        <p class="text-muted-foreground text-xs">
          Es una orientación de la IA: no suma puntos ni se guarda. Compárala con la respuesta del
          docente.
        </p>
      </div>
    </div>

    <div v-if="vista" class="bg-accent/50 rounded-xl border p-4" aria-live="polite">
      <p class="text-primary mb-1 text-sm font-semibold">Respuesta del docente</p>
      <TextoRico :texto="bloque.respuesta" class="text-justify leading-relaxed" />
    </div>
  </section>
</template>
