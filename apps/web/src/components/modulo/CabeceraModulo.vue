<script setup lang="ts">
/**
 * Portada de la página de módulo, con el diseño de referencia de la usuaria (portada del módulo 3, 2026-10-25):
 *
 *   ┌ ▶ Módulo 3 · título ▶ 3.1 ▶ 3.2 ▶ 3.3 ▶ 3.4 ───────────────────────────────┐  flechas encadenadas
 *   │                                                     ┌ panel de cristal ────┐ │
 *   │      ilustración a sangre (`identidad.heroe`),      │ entrada de la sección│ │
 *   │      con el motivo en los dos tercios izquierdos    │ activa, con palabras │ │
 *   │                                                     │ clave en azul     ➜  │ │
 *   └─────────────────────────────────────────────────────┴──────────────────────┘ ┘
 *   rótulo · notas · duración · avance · puntaje (línea de datos, fuera de la portada)
 *
 * El título es la primera flecha de la fila y los pasos (ranura `pasos`) la continúan. El panel lee la entrada de
 * la sección activa (`textoSeccion`, su `resumen`) o, si no la hay, la apertura del módulo (tomada del resumen, sin
 * editar `content.json`). Sin ilustración a sangre, la portada del módulo ocupa el hueco de la izquierda. En móvil
 * todo se apila: título, pasos, ilustración y panel.
 *
 * Contiene el título (el único `h1`), subtítulo, rótulo temático, duración, avance, objetivos y, mientras el
 * docente no apruebe el contenido, una nota «Contenido en revisión» (se oculta con `MOSTRAR_NOTA_REVISION`).
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
    /** Entrada de la sección activa (Markdown de una línea, con **palabras clave**). */
    textoSeccion?: string;
    /** Diapositiva de una sección: su número y título, como encabezado del panel («1.2 · Para qué sirve…»). */
    encabezadoSeccion?: string;
    /** Ilustración de fondo de la sección activa: sustituye a la del módulo en su diapositiva. */
    fondoSeccion?: string;
    /** Panel abajo, a todo el ancho, para fondos que ocupan la diapositiva entera. */
    panelAbajo?: boolean;
  }>(),
  {
    avance: null,
    puntajeObtenido: 0,
    bloqueado: false,
    revision: false,
    textoContinuar: 'Ir a la sección',
    textoSeccion: undefined,
    encabezadoSeccion: undefined,
    fondoSeccion: undefined,
    panelAbajo: false,
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
/** Ilustración a sangre: la de la sección activa o la del módulo. */
const heroe = computed(() => props.fondoSeccion ?? identidad.value?.heroe);
/** Fondo de la portada: la ilustración a sangre o, mientras no exista, la portada del módulo. */
const fondo = computed(() => heroe.value ?? identidad.value?.portada.src);
/** Lo que lee el panel: la entrada de la sección activa o, si no la hay, la apertura del módulo. */
const textoPanel = computed(() => props.textoSeccion?.trim() || apertura.value);
</script>

<template>
  <header
    class="space-y-4"
    :style="estiloAcento(modulo.numero)"
    :data-modulo="modulo.numero"
    :data-bloqueado="bloqueado ? 'true' : undefined"
    data-testid="cabecera-modulo"
  >
    <div
      class="fondo-portada relative isolate overflow-hidden rounded-3xl border shadow-sm"
      data-testid="portada-cabecera"
    >
      <!-- Ilustración a sangre: en pantallas anchas ocupa todo el fondo, con los pasos y el panel encima; en móvil va
           en su hueco, más abajo. Mientras el módulo no tenga la suya (`identidad.heroe`), hace de fondo su portada. -->
      <img
        v-if="fondo"
        :src="fondo"
        alt=""
        aria-hidden="true"
        loading="eager"
        fetchpriority="high"
        decoding="async"
        draggable="false"
        class="absolute inset-0 -z-10 hidden size-full object-cover md:block"
        :data-testid="heroe ? 'heroe-modulo' : 'fondo-provisional'"
      />

      <!-- Fila de flechas encadenadas: el título y, a continuación, los pasos -->
      <div class="flex flex-col gap-2 p-3 md:flex-row md:items-stretch md:gap-0 md:p-4">
        <div
          class="flecha-titulo cristal-portada flex shrink-0 items-center gap-3 py-3 pr-9 pl-4 md:w-[22rem] lg:w-[26rem]"
          data-testid="titulo-flecha"
        >
          <span class="text-primary hidden shrink-0 sm:block" aria-hidden="true">
            <IconoModulo v-if="identidad" :icono="identidad.icono" class="size-11" />
          </span>
          <div class="min-w-0">
            <p class="text-primary text-sm font-bold">
              Módulo {{ modulo.numero }}
              <span class="text-muted-foreground font-medium">de {{ TOTAL_MODULOS }}</span>
            </p>
            <h1
              id="titulo-modulo"
              class="text-2xl leading-tight font-bold tracking-tight lg:text-[1.75rem]"
              data-testid="titulo-modulo"
            >
              {{ modulo.titulo }}
            </h1>
            <p class="text-foreground/80 mt-0.5 text-sm md:text-base">{{ modulo.subtitulo }}</p>
          </div>
        </div>
        <!-- La fila de pasos se solapa con la punta del título (igual que los pasos entre sí): el solape va en la
             fila y no en el primer paso, porque la fila recorta lo que sobresale y le cortaría la muesca. -->
        <div v-if="slots.pasos" class="min-w-0 flex-1 md:-ml-2 md:flex">
          <slot name="pasos" />
        </div>
      </div>

      <!-- Escena a la izquierda y panel de cristal a la derecha -->
      <div
        class="grid gap-4 px-3 pb-3 md:px-5 md:pb-5"
        :class="
          panelAbajo
            ? 'md:min-h-[34rem] md:grid-rows-[minmax(14rem,1fr)_auto] lg:min-h-[40rem]'
            : 'md:min-h-[26rem] md:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:min-h-[30rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]'
        "
        :data-panel="panelAbajo ? 'abajo' : 'derecha'"
      >
        <!-- Hueco de la escena: en pantallas anchas la ilustración es el fondo; en móvil va aquí. -->
        <div class="min-h-0 md:invisible" aria-hidden="true">
          <img
            v-if="heroe"
            :src="heroe"
            alt=""
            draggable="false"
            class="aspect-[16/10] w-full rounded-2xl object-cover md:hidden"
          />
          <PortadaModulo v-else :numero="modulo.numero" class="aspect-[16/10] w-full md:hidden" />
        </div>

        <div
          class="cristal-portada flex flex-col gap-4 rounded-3xl p-5 md:p-7"
          data-testid="panel-portada"
        >
          <!-- Párrafo, no encabezado: el título de la sección ya es el h2 del contenido, más abajo. -->
          <p
            v-if="encabezadoSeccion"
            class="text-primary font-serif text-2xl leading-tight font-bold"
            data-testid="encabezado-diapositiva"
          >
            {{ encabezadoSeccion }}
          </p>
          <TextoRico
            v-if="textoPanel"
            :texto="textoPanel"
            modo="linea"
            class="[&_strong]:text-primary block text-lg leading-relaxed [&_strong]:font-bold lg:text-xl lg:leading-relaxed"
            data-testid="apertura-modulo"
          />
          <p v-if="revision" class="text-muted-foreground text-sm" data-testid="aviso-docente">
            Como docente puedes recorrer todo el módulo sin desbloquear nada. Mientras revisas no se
            guarda avance, puntaje ni tiempo, así que no altera las estadísticas de los estudiantes.
          </p>
          <div v-if="!bloqueado" class="mt-auto flex justify-end">
            <button
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

    <!-- Datos del módulo, fuera de la portada para que esta quede limpia -->
    <div
      class="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-sm"
      data-testid="datos-modulo"
    >
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
      <ul class="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1" role="list">
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

<style scoped>
/* Primera flecha de la fila: sin muesca a la izquierda y con la punta a la derecha, del mismo tamaño que la de los
   pasos (PasoFlecha.vue), para que encajen al solaparse. En móvil la fila se apila y la tarjeta es redondeada. */
.flecha-titulo {
  border-radius: 1rem;
}
@media (min-width: 768px) {
  .flecha-titulo {
    clip-path: polygon(0 0, calc(100% - 1rem) 0, 100% 50%, calc(100% - 1rem) 100%, 0 100%);
    border-radius: 1rem 0 0 1rem;
  }
}
</style>
