<script setup lang="ts">
/**
 * Cabecera de la página de módulo: título (el único `h1`), rótulo temático, subtítulo, frase de
 * apertura (tomada del resumen, sin editar `content.json`), duración, avance, objetivos de
 * aprendizaje y, mientras el docente no apruebe el contenido, una nota discreta «Contenido en
 * revisión» (se oculta con `MOSTRAR_NOTA_REVISION` de config.ts).
 *
 * Cada módulo tiene identidad propia: acento de color (`--acento-mN`), ilustración de portada y
 * rótulo con icono. Las páginas pares invierten la posición de la ilustración en pantallas anchas
 * para que la apertura no sea idéntica en los seis módulos.
 *
 * También sirve para la página de un módulo bloqueado (`bloqueado`, sin `avance`): muestra la
 * presentación del módulo, la ranura por defecto va entre la presentación y los objetivos (ahí se
 * explica el bloqueo) y no enseña el avance ni el puntaje. Con `revision` (vista de docente) tampoco
 * se muestran, porque en esa vista no se guarda nada.
 */
import { computed } from 'vue';
import { Clock, Eye, ListChecks, Lock, NotebookPen, Trophy } from '@lucide/vue';
import { MOSTRAR_NOTA_REVISION, TOTAL_MODULOS } from '@/config';
import type { ProgresoModulo } from '@/content/scoring';
import type { ModuloContenido } from '@/content/schema';
import { textoDuracion } from './acceso';
import { aperturaDelResumen, estiloAcento } from './identidad';
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
  }>(),
  { avance: null, puntajeObtenido: 0, bloqueado: false, revision: false },
);

const enRevision = computed(
  () => MOSTRAR_NOTA_REVISION && props.modulo.estado_revision.estado !== 'aprobado',
);
const porcentaje = computed(() => Math.round((props.avance?.fraccion ?? 0) * 100));
const mostrarAvance = computed(() => props.avance !== null && !props.bloqueado && !props.revision);
const apertura = computed(() => aperturaDelResumen(props.modulo.resumen, props.modulo.subtitulo));
const identidad = computed(() => moduloPorNumero(props.modulo.numero)?.identidad);
/** Módulos pares: la ilustración va a la izquierda en pantallas anchas. */
const invertida = computed(() => props.modulo.numero % 2 === 0);
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
      class="bg-card border-l-acento grid gap-5 rounded-2xl border border-l-4 p-4 md:gap-8 md:p-6"
      :class="
        invertida
          ? 'md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]'
          : 'md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]'
      "
    >
      <PortadaModulo
        :numero="modulo.numero"
        prioritaria
        class="order-first aspect-[16/9] w-full md:aspect-auto md:min-h-56"
        :class="invertida ? '' : 'md:order-last'"
      />

      <div class="min-w-0 space-y-4">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p class="text-muted-foreground text-sm font-medium">
            Módulo {{ modulo.numero }} de {{ TOTAL_MODULOS }}
          </p>
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

        <div>
          <h1
            id="titulo-modulo"
            class="text-3xl font-semibold tracking-tight md:text-4xl"
            data-testid="titulo-modulo"
          >
            {{ modulo.titulo }}
          </h1>
          <p class="text-muted-foreground mt-1 text-lg">{{ modulo.subtitulo }}</p>
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
          class="block max-w-prose text-base leading-relaxed"
          data-testid="apertura-modulo"
        />

        <p
          v-if="revision"
          class="text-muted-foreground max-w-prose text-sm"
          data-testid="aviso-docente"
        >
          Como docente puedes recorrer todo el módulo sin desbloquear nada. Mientras revisas no se
          guarda avance, puntaje ni tiempo, así que no altera las estadísticas de los estudiantes.
        </p>

        <ul class="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm" role="list">
          <li class="inline-flex items-center gap-1.5" data-testid="duracion">
            <Clock class="text-acento size-4" aria-hidden="true" />
            <span class="sr-only">Duración estimada:</span>
            {{ textoDuracion(modulo.duracion_estimada_min) }}
          </li>
          <template v-if="mostrarAvance && avance">
            <li class="inline-flex items-center gap-1.5" data-testid="avance-obligatorias">
              <ListChecks class="text-acento size-4" aria-hidden="true" />
              {{ avance.obligatoriasCompletadas }} de {{ avance.obligatoriasTotal }} actividades
              obligatorias ({{ porcentaje }} %)
            </li>
            <li class="inline-flex items-center gap-1.5" data-testid="puntaje-modulo">
              <Trophy class="text-acento size-4" aria-hidden="true" />
              {{ puntajeObtenido }} de {{ avance.puntajeMaximo }} puntos
            </li>
          </template>
        </ul>
      </div>
    </div>

    <slot />

    <section aria-labelledby="titulo-objetivos" class="bg-card rounded-xl border p-4">
      <h2 id="titulo-objetivos" class="font-serif text-lg font-semibold">
        Objetivos de aprendizaje
      </h2>
      <ul
        class="marker:text-acento mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed"
        data-testid="objetivos"
      >
        <li v-for="objetivo in modulo.objetivos" :key="objetivo">
          <TextoRico :texto="objetivo" modo="linea" />
        </li>
      </ul>
    </section>
  </header>
</template>
