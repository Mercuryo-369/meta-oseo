<script setup lang="ts">
/**
 * "Ponme a prueba" (F4-03): el quiz de práctica del mentor, dentro de su panel.
 *
 * Es un componente PROPIO del mentor; no reutiliza ni modifica `ActividadQuiz`. Recibe el
 * controlador de `useQuiz()` (el panel lo crea, así el avance sobrevive a cerrar el panel).
 *
 * - Práctica libre: una nota fija lo dice en TODOS los estados. No envía nada a la API de
 *   actividades, no da puntos ni logros.
 * - Una pregunta a la vez. Al elegir una opción, la respuesta se marca al instante con la
 *   explicación y las fuentes; la pregunta queda bloqueada. El estado de cada opción se dice con
 *   texto («Correcta», «Tu respuesta») y con icono, no solo con color.
 * - Teclado: las opciones son botones (Tab y Enter o Espacio). Al elegir, el foco pasa al botón
 *   "Siguiente"; al cambiar de pregunta, al enunciado. La explicación se anuncia en una región
 *   `aria-live="polite"`.
 * - Estados de carga y de error (con "Reintentar" cuando sirve) y un resumen final con lo que
 *   conviene repasar.
 */
import { computed, nextTick, ref, useId, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { ArrowLeft, CircleCheck, CircleX, Loader } from '@lucide/vue';
import { esRutaInterna } from '@/ai/refuerzo';
import type { ControladorQuiz } from '@/ai/useQuiz';
import { Button } from '@/components/ui/button';

const props = defineProps<{ quiz: ControladorQuiz }>();
const emit = defineEmits<{ volver: []; navegar: [] }>();

const idTitulo = useId();
const idEnunciado = useId();
const enunciado = ref<HTMLElement | null>(null);
const siguiente = ref<{ $el?: HTMLElement } | null>(null);
const titulo = ref<HTMLElement | null>(null);

/** Tras la última pregunta, "Ver resultado" abre el resumen. */
const verResumen = ref(false);

const enResumen = computed(() => verResumen.value && props.quiz.terminado);
const numeroPregunta = computed(() => props.quiz.indice + 1);
const total = computed(() => props.quiz.preguntas.length);

const ETIQUETA_DIFICULTAD = {
  basica: 'Básica',
  intermedia: 'Intermedia',
  avanzada: 'Avanzada',
} as const;

const fuentesActuales = computed(() =>
  props.quiz.actual
    ? props.quiz.fuentesDe(props.quiz.actual).filter((f) => esRutaInterna(f.url))
    : [],
);
const acerto = computed(
  () => props.quiz.actual !== null && props.quiz.elegidaActual === props.quiz.actual.correcta,
);

/** Estado de una opción tras responder, para pintarla y para decirlo en texto. */
function estadoOpcion(i: number): 'correcta' | 'incorrecta' | 'neutra' {
  const actual = props.quiz.actual;
  if (!actual || !props.quiz.respondida) return 'neutra';
  if (i === actual.correcta) return 'correcta';
  return i === props.quiz.elegidaActual ? 'incorrecta' : 'neutra';
}

async function elegir(i: number): Promise<void> {
  if (!props.quiz.responder(i)) return;
  await nextTick();
  siguiente.value?.$el?.focus({ preventScroll: false });
}

async function avanzar(): Promise<void> {
  if (props.quiz.esUltima) {
    verResumen.value = true;
    await nextTick();
    titulo.value?.focus({ preventScroll: true });
    return;
  }
  props.quiz.siguiente();
  await nextTick();
  enunciado.value?.focus({ preventScroll: true });
}

async function otroQuiz(): Promise<void> {
  verResumen.value = false;
  await props.quiz.reintentar();
}

// Un quiz nuevo (o cerrado) siempre empieza en la primera pregunta, no en el resumen.
watch(
  () => props.quiz.quiz,
  () => {
    verResumen.value = false;
  },
);

/** Para el resumen: preguntas falladas con sus fuentes. */
const falladas = computed(() =>
  props.quiz.preguntas
    .map((p, i) => ({ pregunta: p, indice: i, elegida: props.quiz.elegidas[i] ?? null }))
    .filter((x) => x.elegida !== x.pregunta.correcta),
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4" data-testid="mentor-quiz">
    <div class="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="-ml-2 shrink-0"
        data-testid="quiz-volver"
        @click="emit('volver')"
      >
        <ArrowLeft aria-hidden="true" />
        Volver al chat
      </Button>
    </div>

    <h2
      :id="idTitulo"
      ref="titulo"
      tabindex="-1"
      class="mt-2 font-serif text-xl leading-tight font-semibold outline-none"
    >
      Ponme a prueba
    </h2>
    <p class="text-muted-foreground mt-1 text-sm" data-testid="quiz-nota-practica">
      Es práctica libre: no suma puntos ni logros, y no se guarda.
    </p>

    <!-- Cargando -->
    <div
      v-if="quiz.estado === 'cargando'"
      class="mt-6 flex items-center gap-3 text-sm"
      role="status"
      data-testid="quiz-cargando"
    >
      <Loader aria-hidden="true" class="size-5 shrink-0 motion-safe:animate-spin" />
      <span>Preparando tus preguntas… Puede tardar unos segundos.</span>
    </div>

    <!-- Error -->
    <div
      v-else-if="quiz.estado === 'error'"
      class="bg-accent text-accent-foreground mt-4 rounded-md px-3 py-3 text-sm"
      role="alert"
      data-testid="quiz-error"
    >
      <p>{{ quiz.error }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <Button
          v-if="quiz.errorReintentable"
          type="button"
          size="sm"
          variant="outline"
          data-testid="quiz-reintentar"
          @click="quiz.reintentar()"
        >
          Reintentar
        </Button>
        <Button type="button" size="sm" variant="ghost" @click="emit('volver')">
          Volver al chat
        </Button>
      </div>
    </div>

    <!-- Resumen -->
    <section
      v-else-if="quiz.estado === 'listo' && enResumen"
      class="mt-4 space-y-4"
      aria-labelledby="quiz-resumen-titulo"
      data-testid="quiz-resumen"
    >
      <div>
        <h3 id="quiz-resumen-titulo" class="text-lg font-semibold">
          Acertaste {{ quiz.aciertos }} de {{ total }}
        </h3>
        <p class="text-muted-foreground text-sm">
          {{
            quiz.aciertos === total
              ? 'Muy bien: tienes claras estas ideas.'
              : 'Repasa lo que fallaste y vuelve a intentarlo cuando quieras.'
          }}
        </p>
      </div>

      <ol class="flex flex-col gap-2" aria-label="Resultado por pregunta">
        <li
          v-for="(p, i) in quiz.preguntas"
          :key="p.id"
          class="flex items-start gap-2 text-sm"
          data-testid="quiz-resumen-item"
        >
          <CircleCheck
            v-if="quiz.elegidas[i] === p.correcta"
            aria-hidden="true"
            class="text-success mt-0.5 size-4 shrink-0"
          />
          <CircleX v-else aria-hidden="true" class="text-destructive mt-0.5 size-4 shrink-0" />
          <span>
            <span class="sr-only">{{
              quiz.elegidas[i] === p.correcta ? 'Acertaste: ' : 'Fallaste: '
            }}</span
            >{{ p.enunciado }}
          </span>
        </li>
      </ol>

      <div v-if="falladas.length > 0" data-testid="quiz-repasar">
        <h4 class="text-sm font-semibold">Para repasar</h4>
        <ul role="list" class="mt-1 flex flex-col">
          <template v-for="f in falladas" :key="f.pregunta.id">
            <li
              v-for="fuente in quiz.fuentesDe(f.pregunta).filter((x) => esRutaInterna(x.url))"
              :key="`${f.pregunta.id}-${fuente.id}`"
            >
              <RouterLink
                :to="fuente.url"
                class="text-primary hover:bg-accent focus-visible:ring-ring -mx-1.5 inline-flex min-h-11 items-center rounded-md px-1.5 text-sm underline underline-offset-2 outline-none focus-visible:ring-2"
                data-testid="quiz-repasar-enlace"
                @click="emit('navegar')"
              >
                {{ fuente.titulo }}
              </RouterLink>
            </li>
          </template>
        </ul>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button type="button" data-testid="quiz-otro" @click="otroQuiz">Otro quiz</Button>
        <Button type="button" variant="outline" @click="emit('volver')">Volver al chat</Button>
      </div>
    </section>

    <!-- Pregunta -->
    <section
      v-else-if="quiz.estado === 'listo' && quiz.actual"
      class="mt-4"
      :aria-labelledby="idEnunciado"
      data-testid="quiz-pregunta"
    >
      <p class="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
        <span class="font-semibold tracking-wide uppercase" data-testid="quiz-progreso"
          >Pregunta {{ numeroPregunta }} de {{ total }}</span
        >
        <span aria-hidden="true">·</span>
        <span>Dificultad {{ ETIQUETA_DIFICULTAD[quiz.actual.dificultad].toLowerCase() }}</span>
      </p>
      <h3
        :id="idEnunciado"
        ref="enunciado"
        tabindex="-1"
        class="mt-1 text-base leading-snug font-semibold outline-none"
        data-testid="quiz-enunciado"
      >
        {{ quiz.actual.enunciado }}
      </h3>

      <ul role="list" class="mt-3 flex flex-col gap-2" data-testid="quiz-opciones">
        <li v-for="(opcion, i) in quiz.actual.opciones" :key="i">
          <button
            type="button"
            class="focus-visible:ring-ring flex min-h-11 w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-2 aria-disabled:cursor-default"
            :class="{
              'border-input bg-card hover:bg-accent hover:text-accent-foreground':
                estadoOpcion(i) === 'neutra' && !quiz.respondida,
              'border-input bg-card opacity-70': estadoOpcion(i) === 'neutra' && quiz.respondida,
              'border-success bg-success-soft text-foreground': estadoOpcion(i) === 'correcta',
              'border-destructive bg-card text-foreground': estadoOpcion(i) === 'incorrecta',
            }"
            :aria-disabled="quiz.respondida ? 'true' : undefined"
            :data-estado="estadoOpcion(i)"
            data-testid="quiz-opcion"
            @click="elegir(i)"
          >
            <CircleCheck
              v-if="estadoOpcion(i) === 'correcta'"
              aria-hidden="true"
              class="text-success mt-0.5 size-4 shrink-0"
            />
            <CircleX
              v-else-if="estadoOpcion(i) === 'incorrecta'"
              aria-hidden="true"
              class="text-destructive mt-0.5 size-4 shrink-0"
            />
            <span class="min-w-0 flex-1 break-words">
              {{ opcion.texto }}
              <span v-if="estadoOpcion(i) === 'correcta'" class="text-success ml-1 font-semibold">
                (Correcta)
              </span>
              <span
                v-else-if="estadoOpcion(i) === 'incorrecta'"
                class="text-destructive ml-1 font-semibold"
              >
                (Tu respuesta)
              </span>
            </span>
          </button>
        </li>
      </ul>

      <!-- Retroalimentación inmediata: región viva, se lee cuando aparece. -->
      <div role="status" aria-live="polite" data-testid="quiz-retroalimentacion">
        <div v-if="quiz.respondida" class="mt-3 rounded-lg border p-3 text-sm">
          <p class="font-semibold" data-testid="quiz-veredicto">
            {{ acerto ? '¡Correcto!' : 'Todavía no.' }}
          </p>
          <p class="mt-1" data-testid="quiz-explicacion">{{ quiz.actual.explicacion }}</p>
          <ul
            v-if="fuentesActuales.length > 0"
            role="list"
            class="mt-1 flex flex-col"
            aria-label="Dónde repasarlo"
          >
            <li v-for="fuente in fuentesActuales" :key="fuente.id">
              <RouterLink
                :to="fuente.url"
                class="text-primary hover:bg-accent focus-visible:ring-ring -mx-1.5 inline-flex min-h-11 items-center rounded-md px-1.5 text-sm underline underline-offset-2 outline-none focus-visible:ring-2"
                data-testid="quiz-fuente"
                @click="emit('navegar')"
              >
                {{ fuente.titulo }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>

      <Button
        v-if="quiz.respondida"
        ref="siguiente"
        type="button"
        class="mt-3"
        data-testid="quiz-siguiente"
        @click="avanzar"
      >
        {{ quiz.esUltima ? 'Ver resultado' : 'Siguiente pregunta' }}
      </Button>
    </section>

    <p class="text-muted-foreground mt-6 text-xs leading-snug">
      Preguntas generadas por IA. Verifica con el material del curso.
    </p>
  </div>
</template>
