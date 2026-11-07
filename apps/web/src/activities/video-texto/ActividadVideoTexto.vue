<script setup lang="ts">
/**
 * Actividad `video-texto` (docs/content-schema.md, 7.5): explicación animada por pasos sobre un SVG
 * o video real del docente, siempre con el texto a la vista.
 *
 * Este componente es el único que habla con la página (contrato de `activities/types.ts`): elige el
 * panel según `config.medio` (`PanelAnimacion` o `PanelVideo`), traduce sus avisos a los eventos
 * `progreso`, `interaccion` y `completada`, calcula el puntaje con `@/content/scoring` y muestra el
 * resultado. Los paneles solo dibujan y miden.
 *
 *  - Precisión siempre 1 (no hay respuestas erróneas): el puntaje baja solo por repetir la actividad.
 *  - `progreso` pasa por `crearEmisorProgreso`: nunca llega después de `completada`.
 *  - Estado previo: `intentos` se recalcula con `intentoInicial` mientras el estudiante no haya hecho
 *    nada (el estado del servidor puede llegar tarde) y la instantánea guardada solo se ofrece a la
 *    primera ejecución, y los paneles la validan.
 *  - Modo `revisar`: solo lectura; el estudiante navega el contenido pero no se emite nada.
 *  - Los anuncios para lector de pantalla van en UNA región `aria-live="polite"`.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { CircleCheck, RotateCcw } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { intentoInicial } from '@/activities/types';
import type {
  DetalleVideoTexto,
  EmitsActividadVideoTexto,
  InteraccionActividad,
  JsonObjeto,
  ProgresoActividad,
  PropsActividadVideoTexto,
  ResultadoActividad,
} from '@/activities/types';
import { crearEmisorProgreso } from '@/content/progreso';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import { calcularPuntaje, textoRetroalimentacion } from '@/content/scoring';
import type { ConfigAnimacion, ConfigVideo } from '@/content/schema';
import PanelAnimacion from './PanelAnimacion.vue';
import PanelVideo from './PanelVideo.vue';
import TextoMarkdown from './TextoMarkdown.vue';

const props = withDefaults(defineProps<PropsActividadVideoTexto>(), {
  modo: 'jugar',
  estadoPrevio: undefined,
});
const emit = defineEmits<EmitsActividadVideoTexto>();

const idBase = useId();
const idTitulo = `${idBase}-titulo`;

const jugando = computed(() => props.modo === 'jugar');
const configAnimacion = computed<ConfigAnimacion | null>(() =>
  props.actividad.config.medio === 'animacion' ? props.actividad.config : null,
);
const configVideo = computed<ConfigVideo | null>(() =>
  props.actividad.config.medio === 'video' ? props.actividad.config : null,
);

/* ----------------------------------------- Estado del intento -------------------------------- */

const intentos = ref(intentoInicial(props.estadoPrevio));
/** Número de la ejecución dentro de este montaje: 0 es la primera (la única con instantánea). */
const ejecucion = ref(0);
const resultado = ref<ResultadoActividad<'video-texto'> | null>(null);
/** ¿El estudiante ya hizo algo en esta ejecución? Hasta entonces `estadoPrevio` puede corregir `intentos`. */
let movido = false;

const emisor = crearEmisorProgreso<ProgresoActividad>((p) => emit('progreso', p));
onBeforeUnmount(() => emisor.vaciar());

// El estado del servidor puede llegar después de montar: hasta la primera acción, el número de
// intento se recalcula con lo último que se sabe (una respuesta tardía no debe puntuarse mal).
watch(
  () => props.estadoPrevio,
  (nuevo) => {
    if (!movido && resultado.value === null) intentos.value = intentoInicial(nuevo);
  },
  { deep: true },
);

/** La instantánea guardada solo aplica a la primera ejecución; los paneles la validan. */
const instantanea = computed<JsonObjeto | undefined>(() =>
  ejecucion.value === 0 ? props.estadoPrevio?.progreso?.instantanea : undefined,
);

const yaCompletadaAntes = computed(
  () =>
    jugando.value && resultado.value === null && props.estadoPrevio?.servidor?.completada === true,
);

/* ---------------------------------------------- Anuncios ------------------------------------- */

const anuncio = ref('');
let alterna = false;
/** Espacio duro (U+00A0), escrito por código para que no sea un carácter invisible en el fuente. */
const ESPACIO_DURO = String.fromCharCode(160);

/** Un mismo mensaje dos veces seguidas se vuelve a leer: se alterna un espacio duro final invisible. */
function anunciar(mensaje: string): void {
  alterna = !alterna;
  anuncio.value = alterna ? mensaje : `${mensaje}${ESPACIO_DURO}`;
}

/* ------------------------------------------ Eventos de los paneles --------------------------- */

function alInteractuar(interaccion: InteraccionActividad): void {
  if (!jugando.value) return;
  movido = true;
  emit('interaccion', interaccion);
}

function alProgresar(avance: number, parcial: JsonObjeto): void {
  if (!jugando.value || resultado.value !== null) return;
  movido = true;
  emisor.emitir({
    avance: Math.min(1, Math.max(0, Number.isFinite(avance) ? avance : 0)),
    intentos: intentos.value,
    instantanea: parcial,
  });
}

const encabezadoResultado = ref<HTMLElement | null>(null);

function alCompletar(detalle: DetalleVideoTexto): void {
  if (!jugando.value || resultado.value !== null) return;
  movido = true;
  const precision = 1;
  const puntaje = calcularPuntaje(props.actividad, { precision, intentos: intentos.value });
  const final: ResultadoActividad<'video-texto'> = {
    puntaje,
    intentos: intentos.value,
    precision,
    detalle,
  };
  // `cerrar()` antes de `completada`: ningún `progreso` pendiente puede salir después.
  emisor.cerrar();
  resultado.value = final;
  anunciar(
    `Actividad completada. ${textoPlanoDeMarkdown(textoRetroalimentacion(props.actividad, precision))} ` +
      `Obtuviste ${puntaje} de ${props.actividad.puntaje_max} puntos.`,
  );
  emit('completada', final);
  // R6: al completar, el foco pasa al encabezado del resultado.
  void nextTick(() => encabezadoResultado.value?.focus());
}

/* ----------------------------------------------- Repetir ------------------------------------- */

const panelAnimacion = ref<InstanceType<typeof PanelAnimacion> | null>(null);
const panelVideo = ref<InstanceType<typeof PanelVideo> | null>(null);

function repetir(): void {
  if (!jugando.value || resultado.value === null) return;
  intentos.value += 1;
  resultado.value = null;
  movido = true;
  emisor.reabrir();
  ejecucion.value += 1;
  panelAnimacion.value?.reiniciar();
  panelVideo.value?.reiniciar();
  emit('interaccion', { accion: 'reinicia_actividad' });
  anunciar(`Empezaste el intento ${intentos.value}.`);
}

const textoMejor = computed(() => {
  const s = props.estadoPrevio?.servidor;
  return s ? `${s.puntaje} de ${props.actividad.puntaje_max}` : '';
});
</script>

<template>
  <section class="grid gap-4" :aria-labelledby="idTitulo" data-testid="actividad-video-texto">
    <header class="grid gap-1">
      <!-- El título ya es el encabezado de la parte: queda para el lector de pantalla. -->
      <h3 :id="idTitulo" class="sr-only">{{ actividad.titulo }}</h3>
      <p class="text-muted-foreground">
        <TextoMarkdown :texto="actividad.instrucciones" />
      </p>
    </header>

    <p
      v-if="!jugando"
      class="rounded-lg border border-dashed border-border bg-muted p-3 text-sm"
      data-testid="aviso-revision"
    >
      Modo de revisión: repasa el contenido con calma; aquí no se puntúa.
    </p>
    <p
      v-else-if="yaCompletadaAntes"
      class="rounded-lg border border-border bg-muted p-3 text-sm"
      data-testid="aviso-repeticion"
    >
      Ya completaste esta actividad (mejor puntaje: {{ textoMejor }}). Puedes repasarla; el puntaje
      guardado es el mejor de tus intentos.
    </p>

    <PanelAnimacion
      v-if="configAnimacion"
      ref="panelAnimacion"
      :config="configAnimacion"
      :actividad-id="actividad.id"
      :instantanea="instantanea"
      @progreso="alProgresar"
      @interaccion="alInteractuar"
      @completar="alCompletar"
      @anunciar="anunciar"
    />
    <PanelVideo
      v-else-if="configVideo"
      ref="panelVideo"
      :config="configVideo"
      :titulo="actividad.titulo"
      :jugando="jugando"
      :instantanea="instantanea"
      @progreso="alProgresar"
      @interaccion="alInteractuar"
      @completar="alCompletar"
      @anunciar="anunciar"
    />

    <div class="sr-only" aria-live="polite" aria-atomic="true" data-testid="anuncio">
      {{ anuncio }}
    </div>

    <section
      v-if="resultado"
      class="grid gap-3 rounded-xl border-2 border-primary bg-card p-4 text-card-foreground"
      :aria-labelledby="`${idBase}-resultado`"
      data-testid="resultado"
    >
      <h4
        :id="`${idBase}-resultado`"
        ref="encabezadoResultado"
        tabindex="-1"
        class="flex items-center gap-2 font-serif text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background rounded-sm"
      >
        <CircleCheck class="size-6 shrink-0 text-primary" aria-hidden="true" />
        Actividad completada
      </h4>
      <p data-testid="retroalimentacion">
        <TextoMarkdown :texto="textoRetroalimentacion(actividad, resultado.precision)" />
      </p>
      <p class="text-sm text-muted-foreground" data-testid="puntaje-obtenido">
        Puntaje: <strong>{{ resultado.puntaje }}</strong> de {{ actividad.puntaje_max }} (intento
        {{ resultado.intentos }}).
      </p>
      <div>
        <Button type="button" variant="outline" data-testid="repetir" @click="repetir">
          <RotateCcw aria-hidden="true" />
          Repetir la actividad
        </Button>
      </div>
      <p class="text-sm text-muted-foreground">
        Se guarda tu mejor resultado; un intento adicional puede valer menos puntos que el anterior.
      </p>
    </section>
  </section>
</template>
