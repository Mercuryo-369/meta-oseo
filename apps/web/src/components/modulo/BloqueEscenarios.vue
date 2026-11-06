<script setup lang="ts">
/**
 * Bloque `escenarios`: el estudiante elige uno de varios escenarios y ve su contenido (rutas e imagen). Es la
 * «Actividad: Interactiva» de la 3.2 del documento de la docente («El usuario selecciona uno de los cuatro
 * escenarios del microambiente óseo»). No puntúa. Botones con `aria-pressed` (alternativa de teclado nativa) y el
 * contenido del elegido en una región `aria-live`. Imagen a la izquierda y texto a la derecha con su barra, como el
 * resto de las vistas.
 *
 * Con `prediccion` (comentario de la docente: «incluir una pregunta de predicción y una retroalimentación explicativa
 * para cada escenario»), el escenario primero pregunta qué ocurrirá; al responder se ve la retroalimentación y después
 * las rutas. La respuesta solo vive mientras la página está abierta.
 */
import { CircleCheck, CircleX, Lightbulb } from '@lucide/vue';
import { computed, reactive, ref } from 'vue';
import type { BloqueEscenarios } from '@/content/schema';
import BotonAmpliar from './BotonAmpliar.vue';
import TextoRico from './TextoRico.vue';

const props = defineProps<{ bloque: BloqueEscenarios }>();

const elegido = ref<number | null>(null);
const escenario = computed(() =>
  elegido.value === null ? null : (props.bloque.escenarios[elegido.value] ?? null),
);
/** Opción elegida en la predicción de cada escenario (por id de escenario). */
const respuestas = reactive<Record<string, string>>({});
const respuesta = computed(() => (escenario.value ? respuestas[escenario.value.id] : undefined));
/** Las rutas se muestran cuando no hay predicción o ya se respondió. */
const rutasVisibles = computed(
  () => Boolean(escenario.value) && (!escenario.value?.prediccion || respuesta.value !== undefined),
);
const acerto = computed(
  () => respuesta.value !== undefined && respuesta.value === escenario.value?.prediccion?.correcta,
);
function responder(opcion: string): void {
  if (escenario.value && respuesta.value === undefined) respuestas[escenario.value.id] = opcion;
}
const hayPredicciones = computed(() => props.bloque.escenarios.some((e) => e.prediccion));
</script>

<template>
  <section
    :id="`bloque-${bloque.id}`"
    class="bg-card space-y-4 rounded-2xl border p-4 sm:p-6 lg:space-y-3 lg:p-5"
    :aria-labelledby="`titulo-${bloque.id}`"
    data-testid="bloque-escenarios"
  >
    <!-- En escritorio el título ya está en el encabezado de la parte: queda para el lector de pantalla y la
         cabecera se compacta para que el escenario elegido quepa en la pantalla. -->
    <header class="space-y-1">
      <h3 :id="`titulo-${bloque.id}`" class="font-serif text-xl font-semibold lg:sr-only">
        {{ bloque.titulo }}
      </h3>
      <TextoRico
        :texto="bloque.instrucciones"
        modo="linea"
        class="text-muted-foreground block text-justify lg:text-sm"
      />
    </header>

    <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="group" aria-label="Escenarios">
      <button
        v-for="(e, i) in bloque.escenarios"
        :key="e.id"
        type="button"
        class="focus-visible:ring-ring flex min-h-14 flex-col items-start rounded-xl border px-4 py-2.5 text-left outline-none focus-visible:ring-2 lg:min-h-0 lg:py-2"
        :class="
          elegido === i ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
        "
        :aria-pressed="elegido === i"
        :data-escenario="e.id"
        @click="elegido = i"
      >
        <span class="text-sm font-semibold">Escenario {{ i + 1 }}. {{ e.etiqueta }}</span>
        <span v-if="e.detalle" class="text-xs opacity-80 lg:line-clamp-1" :title="e.detalle">{{
          e.detalle
        }}</span>
      </button>
    </div>

    <div aria-live="polite">
      <p v-if="!escenario" class="text-muted-foreground text-sm">
        {{
          hayPredicciones
            ? 'Elige un escenario: primero predice qué ocurrirá y luego mira qué rutas de señalización se activan o se inhiben.'
            : 'Elige un escenario para ver qué rutas de señalización se activan o se inhiben.'
        }}
      </p>

      <!-- Pregunta de predicción, antes de las rutas -->
      <div
        v-else-if="escenario.prediccion && respuesta === undefined"
        :key="`prediccion-${escenario.id}`"
        class="mx-auto max-w-4xl space-y-3 rounded-xl border p-4 sm:p-5"
        data-testid="escenario-prediccion"
      >
        <p class="text-primary flex items-center gap-2 text-sm font-semibold">
          <Lightbulb class="size-4 shrink-0" aria-hidden="true" />
          Antes de ver las rutas, predice
        </p>
        <p class="font-medium">
          <TextoRico :texto="escenario.prediccion.pregunta" modo="linea" />
        </p>
        <div class="grid gap-2" role="group" aria-label="Opciones de la predicción">
          <button
            v-for="(o, k) in escenario.prediccion.opciones"
            :key="o.id"
            type="button"
            class="focus-visible:ring-ring hover:bg-accent flex items-start gap-3 rounded-lg border px-4 py-2.5 text-left text-sm outline-none focus-visible:ring-2"
            :data-opcion="o.id"
            @click="responder(o.id)"
          >
            <span class="font-semibold">{{ String.fromCharCode(65 + k) }}.</span>
            <TextoRico :texto="o.texto" modo="linea" />
          </button>
        </div>
      </div>

      <div
        v-else-if="rutasVisibles"
        :key="escenario.id"
        class="grid items-start gap-5"
        :class="escenario.imagen ? 'lg:grid-cols-[fit-content(60%)_minmax(18rem,1fr)]' : ''"
        data-testid="escenario-elegido"
      >
        <div v-if="escenario.imagen" class="relative mx-auto w-fit max-w-full">
          <img
            :src="escenario.imagen"
            :alt="escenario.alt ?? escenario.etiqueta"
            :width="escenario.ancho"
            :height="escenario.alto"
            decoding="async"
            class="bg-background mx-auto block h-auto max-h-[calc(var(--alto-vista,100dvh-3rem)-12.5rem)] w-auto max-w-full rounded-lg border"
          />
          <BotonAmpliar
            :src="escenario.imagen"
            :alt="escenario.alt ?? escenario.etiqueta"
            :pie="escenario.etiqueta"
          />
        </div>
        <div
          class="min-w-0 space-y-4 rounded-xl border p-4 lg:max-h-[calc(var(--alto-vista,100dvh-3rem)-12.5rem)] lg:overflow-y-auto lg:overscroll-contain"
        >
          <!-- Retroalimentación de la predicción -->
          <div
            v-if="escenario.prediccion && respuesta !== undefined"
            class="space-y-1 rounded-lg border-l-4 p-3 text-sm"
            :class="acerto ? 'border-l-success bg-success-soft' : 'border-l-destructive bg-muted'"
            data-testid="escenario-retroalimentacion"
            :data-acierto="acerto"
          >
            <p class="flex items-center gap-2 font-semibold">
              <CircleCheck v-if="acerto" class="text-success size-4 shrink-0" aria-hidden="true" />
              <CircleX v-else class="text-destructive size-4 shrink-0" aria-hidden="true" />
              {{ acerto ? 'Tu predicción es correcta.' : 'Tu predicción no coincide.' }}
            </p>
            <TextoRico
              :texto="escenario.prediccion.retroalimentacion"
              modo="linea"
              class="block text-justify"
            />
          </div>
          <TextoRico
            :texto="escenario.markdown"
            class="text-justify text-base leading-relaxed hyphens-auto"
          />
        </div>
      </div>
    </div>
  </section>
</template>
