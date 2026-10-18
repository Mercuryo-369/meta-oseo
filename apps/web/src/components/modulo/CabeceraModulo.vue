<script setup lang="ts">
/**
 * Portada de la página de módulo, con el diseño de referencia del OVA:
 *
 *   ┌ tarjeta de título ┐
 *   ┌ 3.1 ─ 3.2 ─ 3.3 ─ … (ranura `pasos`, a todo el ancho) ───┐
 *   ┌ ilustración del módulo ─────────────┐ ┌ panel translúcido: frase, apertura,  ┐
 *   │                                     │ │ datos del módulo y botón «continuar» │
 *
 * Todo va sobre un fondo degradado azulado (`.fondo-portada` en style.css). Si el módulo tiene una
 * ilustración pintada a sangre (`identidad.heroe`), esa ocupa todo el fondo y el panel flota encima;
 * si no, se muestra la portada SVG del módulo en un marco. Los módulos pares invierten la posición
 * de la ilustración y del panel para que la apertura no sea idéntica en los seis.
 *
 * Contiene el título (el único `h1`), rótulo temático, subtítulo, frase y apertura (tomada del
 * resumen, sin editar `content.json`), duración, avance, objetivos y, mientras el docente no apruebe
 * el contenido, una nota «Contenido en revisión» (se oculta con `MOSTRAR_NOTA_REVISION`).
 *
 * También sirve para la página de un módulo bloqueado (`bloqueado`, sin `avance`): la ranura por
 * defecto va entre la presentación y los objetivos (ahí se explica el bloqueo) y no se muestran el
 * avance, el puntaje ni el botón de continuar. Con `revision` (vista de docente) tampoco se muestran
 * el avance ni el puntaje, porque en esa vista no se guarda nada.
 */
import { computed, useSlots } from 'vue';
import { ArrowRight, Clock, Eye, ListChecks, Lock, NotebookPen, Trophy } from '@lucide/vue';
import { MOSTRAR_NOTA_REVISION, TOTAL_MODULOS } from '@/config';
import type { ProgresoModulo } from '@/content/scoring';
import type { ModuloContenido } from '@/content/schema';
import { textoDuracion } from './acceso';
import { aperturaDelResumen, estiloAcento } from './identidad';
import IconoModulo from './IconoModulo.vue';
import PortadaModulo from './PortadaModulo.vue';
import RotuloModulo from './RotuloModulo.vue';
import TextoRico from './TextoRico.vue';
import { moduloPorNumero } from '@/data/modulos';

const props = withDefaults(
  defineProps<{
    modulo: ModuloContenido;
    avance?: ProgresoModulo | null;
    puntajeObtenido?: number;
    /** Módulo bloqueado para el estudiante: solo presentación. */
    bloqueado?: boolean;
    /** Vista de docente: solo lectura, sin avance ni puntaje. */
    revision?: boolean;
    /** Texto accesible del botón de la flecha (por ejemplo «Empezar: Dos rutas para construir hueso»). */
    textoContinuar?: string;
  }>(),
  {
    avance: null,
    puntajeObtenido: 0,
    bloqueado: false,
    revision: false,
    textoContinuar: 'Ir a la sección',
  },
);

const emit = defineEmits<{ continuar: [] }>();
const slots = useSlots();

const enRevision = computed(
  () => MOSTRAR_NOTA_REVISION && props.modulo.estado_revision.estado !== 'aprobado',
);
const porcentaje = computed(() => Math.round((props.avance?.fraccion ?? 0) * 100));
const mostrarAvance = computed(() => props.avance !== null && !props.bloqueado && !props.revision);
const apertura = computed(() => aperturaDelResumen(props.modulo.resumen, props.modulo.subtitulo));
const identidad = computed(() => moduloPorNumero(props.modulo.numero)?.identidad);
/** Módulos pares: la ilustración va a la derecha y el panel a la izquierda en pantallas anchas. */
const invertida = computed(() => props.modulo.numero % 2 === 0);
const heroe = computed(() => identidad.value?.heroe);
</script>

<template>
  <header
    class="space-y-5"
    :style="estiloAcento(modulo.numero)"
    :data-modulo="modulo.numero"
    :data-bloqueado="bloqueado ? 'true' : undefined"
    data-testid="cabecera-modulo"
  >
    <div
      class="fondo-portada relative isolate overflow-hidden rounded-3xl border p-3 shadow-sm md:p-5"
    >
      <!-- Ilustración a sangre (opcional, por módulo) -->
      <img
        v-if="heroe"
        :src="heroe"
        alt=""
        aria-hidden="true"
        loading="eager"
        fetchpriority="high"
        decoding="async"
        draggable="false"
        class="absolute inset-0 -z-10 size-full object-cover"
        data-testid="heroe-modulo"
      />

      <!-- Fila superior: título -->
      <div class="panel-cristal flex items-center gap-4 rounded-2xl px-4 py-3 lg:max-w-xl">
        <span
          class="border-primary/30 text-primary hidden size-14 shrink-0 items-center justify-center rounded-xl border sm:flex"
          aria-hidden="true"
        >
          <IconoModulo v-if="identidad" :icono="identidad.icono" class="size-9" />
        </span>
        <div class="min-w-0">
          <p class="text-primary text-sm font-bold">
            Módulo {{ modulo.numero }}
            <span class="text-muted-foreground font-medium">de {{ TOTAL_MODULOS }}</span>
          </p>
          <h1
            id="titulo-modulo"
            class="text-2xl leading-tight font-semibold tracking-tight md:text-3xl"
            data-testid="titulo-modulo"
          >
            {{ modulo.titulo }}
          </h1>
          <p class="text-foreground/80 mt-0.5 text-base">{{ modulo.subtitulo }}</p>
        </div>
      </div>

      <!-- Pasos (secciones) a todo el ancho de la portada -->
      <div v-if="slots.pasos" class="panel-cristal mt-3 rounded-2xl px-2 py-2">
        <slot name="pasos" />
      </div>

      <!-- Fila principal: ilustración y panel -->
      <div
        class="mt-4 grid gap-4 md:gap-6"
        :class="
          invertida
            ? 'md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]'
            : 'md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]'
        "
      >
        <PortadaModulo
          :numero="modulo.numero"
          prioritaria
          class="aspect-[16/10] w-full shadow-md md:aspect-auto md:min-h-80"
          :class="[invertida ? 'md:order-last' : '', heroe ? 'invisible' : '']"
        />

        <div class="panel-cristal flex flex-col gap-4 rounded-3xl p-5 md:p-7">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <RotuloModulo :numero="modulo.numero" />
            <p
              v-if="bloqueado"
              class="bg-muted text-foreground inline-flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-0.5 text-xs font-medium"
              data-testid="etiqueta-bloqueado"
            >
              <Lock class="size-3.5" aria-hidden="true" />
              Bloqueado
            </p>
            <p
              v-if="revision"
              class="bg-accent text-accent-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              role="note"
              title="Estás viendo el módulo como docente: todo está abierto y no se guarda nada."
              data-testid="etiqueta-docente"
            >
              <Eye class="size-3.5" aria-hidden="true" />
              Vista de docente
            </p>
            <p
              v-if="enRevision"
              class="bg-accent text-accent-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              role="note"
              title="Este contenido es un borrador que el docente aún debe validar."
              data-testid="nota-revision"
            >
              <NotebookPen class="size-3.5" aria-hidden="true" />
              Contenido en revisión
            </p>
          </div>

          <p
            v-if="identidad"
            class="text-acento font-serif text-xl leading-snug font-semibold"
            data-testid="frase-modulo"
          >
            {{ identidad.frase }}
          </p>

          <TextoRico
            v-if="apertura"
            :texto="apertura"
            modo="linea"
            class="[&_strong]:text-primary block text-lg leading-relaxed [&_strong]:font-bold"
            data-testid="apertura-modulo"
          />

          <p v-if="revision" class="text-muted-foreground text-sm" data-testid="aviso-docente">
            Como docente puedes recorrer todo el módulo sin desbloquear nada. Mientras revisas no se
            guarda avance, puntaje ni tiempo, así que no altera las estadísticas de los estudiantes.
          </p>

          <div class="mt-auto flex items-end justify-between gap-4">
            <ul class="text-muted-foreground flex flex-col gap-1.5 text-sm" role="list">
              <li class="inline-flex items-center gap-1.5" data-testid="duracion">
                <Clock class="text-primary size-4" aria-hidden="true" />
                <span class="sr-only">Duración estimada:</span>
                {{ textoDuracion(modulo.duracion_estimada_min) }}
              </li>
              <template v-if="mostrarAvance && avance">
                <li class="inline-flex items-center gap-1.5" data-testid="avance-obligatorias">
                  <ListChecks class="text-primary size-4" aria-hidden="true" />
                  {{ avance.obligatoriasCompletadas }} de {{ avance.obligatoriasTotal }} actividades
                  obligatorias ({{ porcentaje }} %)
                </li>
                <li class="inline-flex items-center gap-1.5" data-testid="puntaje-modulo">
                  <Trophy class="text-primary size-4" aria-hidden="true" />
                  {{ puntajeObtenido }} de {{ avance.puntajeMaximo }} puntos
                </li>
              </template>
            </ul>

            <button
              v-if="!bloqueado"
              type="button"
              class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring flex size-14 shrink-0 items-center justify-center rounded-full shadow-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              :aria-label="textoContinuar"
              :title="textoContinuar"
              data-testid="continuar-modulo"
              @click="emit('continuar')"
            >
              <ArrowRight class="size-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <slot />

    <section aria-labelledby="titulo-objetivos" class="panel-cristal rounded-2xl p-4 md:p-5">
      <h2 id="titulo-objetivos" class="font-serif text-lg font-semibold">
        Objetivos de aprendizaje
      </h2>
      <ul
        class="marker:text-primary mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed"
        data-testid="objetivos"
      >
        <li v-for="objetivo in modulo.objetivos" :key="objetivo">
          <TextoRico :texto="objetivo" modo="linea" />
        </li>
      </ul>
    </section>
  </header>
</template>
