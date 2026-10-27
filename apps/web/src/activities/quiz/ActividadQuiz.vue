<script setup lang="ts">
/**
 * Actividad `quiz` (docs/content-schema.md, 7.4): preguntas con retroalimentación inmediata.
 *
 * Contrato: `PropsActividadQuiz` y `EmitsActividadQuiz` (`activities/types.ts`). El anfitrión
 * descubre este archivo por su nombre (`activities/quiz/ActividadQuiz.vue`).
 *
 * Flujo (modo `jugar`):
 *   1. Una pregunta a la vez, en su formato (opción múltiple, verdadero/falso u ordenar).
 *   2. "Comprobar respuesta" bloquea la pregunta y muestra veredicto y explicación en el acto.
 *      Emite `interaccion` (`responde_pregunta`) y `progreso` (agrupado por `crearEmisorProgreso`).
 *   3. "Siguiente pregunta" avanza (el foco pasa al enunciado nuevo). En la última, "Ver
 *      resultado" emite `completada` UNA vez, cierra el emisor de `progreso` y pasa al resumen.
 *   4. El resumen da la precisión, el puntaje, el mensaje de `retroalimentacion` de su banda y,
 *      con `aprobacion_min`, si se alcanzó. "Repetir el quiz" empieza el intento siguiente
 *      (`reinicia_actividad`, `reabrir()`); la penalización por intentos la aplica `calcularPuntaje`.
 *
 * Modo `revisar`: solo lectura. Muestra todas las preguntas con las respuestas CORRECTAS y sus
 * explicaciones; no puntúa ni emite nada.
 *
 * Puntaje solo con `@/content/scoring` (`precisionPregunta`, `precisionQuiz`, `calcularPuntaje`).
 * Texto solo con `@/content/markdown` (vía `TextoLinea.vue`): nunca `v-html` sobre texto crudo.
 *
 * Estado del intento (semilla, respuestas) y su instantánea: ver `logica.ts`. El estado previo se
 * aplica al montar y, mientras el estudiante no haya tocado nada, también si llega después (la
 * respuesta del servidor es asíncrona): así el número de intento, y con él la penalización, es el
 * correcto. Una instantánea de un intento que el servidor ya cuenta como terminado se descarta.
 *
 * Puntos de extensión (sin cambiar el contrato): preguntas de refuerzo de IA (`ia.ts`, no puntúan
 * ni emiten) y evento DOM `ova:glosario` al activar un enlace del glosario.
 */
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  ref,
  useId,
  useTemplateRef,
  watch,
} from 'vue';
import { usePreferredReducedMotion } from '@vueuse/core';
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Info,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from '@lucide/vue';
import { intentoInicial } from '@/activities/types';
import type {
  EmitsActividadQuiz,
  ProgresoActividad,
  PropsActividadQuiz,
  ResultadoActividad,
} from '@/activities/types';
import { crearEmisorProgreso } from '@/content/progreso';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import {
  actividadSuperada,
  bandaRetroalimentacion,
  calcularPuntaje,
  factorPorIntentos,
  precisionPregunta,
  precisionQuiz,
  textoRetroalimentacion,
} from '@/content/scoring';
import type { BandaRetroalimentacion, RespuestaPregunta } from '@/content/scoring';
import { CLAVE_PREGUNTAS_IA, EVENTO_GLOSARIO } from './ia';
import type { DetalleEventoGlosario } from './ia';
import {
  armarInstantanea,
  preguntasDelIntento,
  semillaDeInstantanea,
  depurarPreguntas,
  instantaneaVigente,
  leerInstantanea,
  posicionDeReanudacion,
  presentarPregunta,
  presentarQuiz,
  redondear2,
  semillaNueva,
  veredictoDe,
} from './logica';
import type { PreguntaPresentada, Veredicto } from './logica';
import PreguntaQuiz from './PreguntaQuiz.vue';
import TextoLinea from './TextoLinea.vue';

const props = withDefaults(defineProps<PropsActividadQuiz>(), {
  modo: 'jugar',
  estadoPrevio: undefined,
});
const emit = defineEmits<EmitsActividadQuiz>();

const uid = useId();
const jugando = computed(() => props.modo !== 'revisar');
const movimiento = usePreferredReducedMotion();
const reducido = computed(() => movimiento.value === 'reduce');

/* ---- contenido ---- */

const todasLasPreguntas = computed(() => depurarPreguntas(props.actividad?.config?.preguntas));
const mostrar = computed(() => props.actividad?.config?.mostrar);
const opcionesPresentacion = computed(() => ({
  barajarPreguntas: props.actividad?.config?.barajar_preguntas === true,
  barajarOpciones: props.actividad?.config?.barajar_opciones !== false,
}));

/* ---- estado del intento ---- */

const intentos = ref(intentoInicial(props.estadoPrevio));
const semilla = ref(semillaNueva());
/** Las de este intento: con banco (`mostrar`), la muestra que tocó con la semilla. */
const preguntas = computed(() =>
  preguntasDelIntento(todasLasPreguntas.value, semilla.value, mostrar.value),
);
const respuestas = ref<(RespuestaPregunta | null)[]>(preguntas.value.map(() => null));
const posicion = ref(0);
const fase = ref<'preguntas' | 'resumen'>('preguntas');
/** El estudiante ya hizo algo: un estado previo tardío ya no puede reemplazar el intento. */
const interactuo = ref(false);

const presentadas = computed(() =>
  presentarQuiz(preguntas.value, semilla.value, opcionesPresentacion.value),
);
/** Modo `revisar`: en el orden del contenido, sin barajar (la respuesta correcta no depende del orden). */
const presentadasRevision = computed(() =>
  preguntas.value.map((p, i) => presentarPregunta(p, i, 0, false)),
);
const actual = computed<PreguntaPresentada | undefined>(() => presentadas.value[posicion.value]);
const respondidas = computed(() => respuestas.value.filter((r) => r !== null).length);

// Emisor de `progreso`: agrupa las emisiones y, tras `completada`, no emite más (ver types.ts).
const emisor = crearEmisorProgreso<ProgresoActividad>((p) => emit('progreso', p));

function sinRespuestas(): (RespuestaPregunta | null)[] {
  return preguntas.value.map(() => null);
}

/** Aplica lo que se sabe del pasado: número de intento e intento a medias (si sigue vigente). */
function aplicarEstadoPrevio(): void {
  intentos.value = intentoInicial(props.estadoPrevio);
  const instantanea = props.estadoPrevio?.progreso?.instantanea;
  const semillaGuardada = instantaneaVigente(props.estadoPrevio)
    ? semillaDeInstantanea(instantanea)
    : null;
  const restaurado =
    semillaGuardada === null
      ? null
      : leerInstantanea(
          preguntasDelIntento(todasLasPreguntas.value, semillaGuardada, mostrar.value),
          instantanea,
        );
  semilla.value = restaurado ? restaurado.semilla : semillaNueva();
  respuestas.value = restaurado ? restaurado.respuestas : sinRespuestas();
  posicion.value = posicionDeReanudacion(presentadas.value, respuestas.value);
}

if (jugando.value) aplicarEstadoPrevio();

// La respuesta del servidor puede llegar después de montar: hasta la primera interacción, se
// recalcula con lo último que se sabe (una penalización equivocada se cobraría de más o de menos).
watch(
  () => props.estadoPrevio,
  () => {
    if (jugando.value && !interactuo.value && fase.value === 'preguntas') aplicarEstadoPrevio();
  },
  { deep: true },
);

// Otra actividad en el mismo componente: se empieza de cero.
watch(
  () => props.actividad,
  () => {
    cancelarPractica();
    practica.value = 'inactiva';
    interactuo.value = false;
    fase.value = 'preguntas';
    resumen.value = null;
    emisor.reabrir();
    if (jugando.value) aplicarEstadoPrevio();
  },
);

/* ---- responder ---- */

const anuncio = ref('');
const contadorAnuncio = ref(0);
/** Texto para la región aria-live. El `key` renueva el nodo: así se lee aunque el texto se repita. */
function anunciar(texto: string): void {
  anuncio.value = texto;
  contadorAnuncio.value++;
}

const preguntaRef = useTemplateRef<InstanceType<typeof PreguntaQuiz>>('pregunta-actual');
const tituloResumen = useTemplateRef<HTMLElement>('titulo-resumen');

function alComprobar(respuesta: RespuestaPregunta): void {
  const objetivo = actual.value;
  if (!jugando.value || fase.value !== 'preguntas' || !objetivo) return;
  if (respuestas.value[objetivo.indice]) return; // ya comprobada: no se cambia ni se cuenta dos veces
  interactuo.value = true;
  const nuevas = [...respuestas.value];
  nuevas[objetivo.indice] = respuesta;
  respuestas.value = nuevas;
  const acierto = veredictoDe(precisionPregunta(objetivo.pregunta, respuesta)) === 'correcta';
  emit('interaccion', {
    accion: 'responde_pregunta',
    objeto: objetivo.pregunta.id,
    resultado: acierto ? 'correcta' : 'incorrecta',
  });
  emisor.emitir({
    avance: nuevas.filter((r) => r !== null).length / Math.max(1, preguntas.value.length),
    intentos: intentos.value,
    instantanea: armarInstantanea(preguntas.value, nuevas, semilla.value),
  });
}

async function siguiente(): Promise<void> {
  if (!jugando.value || fase.value !== 'preguntas' || !actual.value) return;
  if (!respuestas.value[actual.value.indice]) return;
  if (posicion.value >= presentadas.value.length - 1) {
    void terminar();
    return;
  }
  posicion.value++;
  await nextTick();
  preguntaRef.value?.enfocar();
}

/* ---- resultado ---- */

interface Resumen {
  resultado: ResultadoActividad<'quiz'>;
  porcentaje: number;
  banda: BandaRetroalimentacion;
  mensaje: string;
  /** `undefined` si la actividad no tiene `aprobacion_min`. */
  aprobacion?: { minimo: number; ahora: boolean; antes: boolean };
  factor: number;
  desglose: { id: string; enunciado: string; veredicto: Veredicto }[];
}
const resumen = ref<Resumen | null>(null);

async function terminar(): Promise<void> {
  if (!jugando.value || fase.value !== 'preguntas' || preguntas.value.length === 0) return;
  const porId: Record<string, RespuestaPregunta | undefined> = {};
  preguntas.value.forEach((p, i) => {
    porId[p.id] = respuestas.value[i] ?? undefined;
  });
  const precision = precisionQuiz(preguntas.value, porId);
  const puntaje = calcularPuntaje(props.actividad, { precision, intentos: intentos.value });
  const resultado: ResultadoActividad<'quiz'> = {
    puntaje,
    intentos: intentos.value,
    precision,
    detalle: {
      preguntas: Object.fromEntries(
        preguntas.value.map((p) => [p.id, redondear2(precisionPregunta(p, porId[p.id]))]),
      ),
    },
  };

  const minimo = props.actividad.aprobacion_min;
  const previa = props.estadoPrevio?.servidor;
  resumen.value = {
    resultado,
    porcentaje: Math.round(precision * 100),
    banda: bandaRetroalimentacion(precision),
    mensaje: textoRetroalimentacion(props.actividad, precision),
    aprobacion:
      minimo === undefined
        ? undefined
        : {
            minimo,
            ahora: actividadSuperada(props.actividad, {
              completada: true,
              mejorPrecision: precision,
            }),
            antes:
              previa?.completada === true &&
              previa.precision !== undefined &&
              actividadSuperada(props.actividad, {
                completada: true,
                mejorPrecision: previa.precision,
              }),
          },
    factor: factorPorIntentos(intentos.value, props.actividad.penalizacion),
    desglose: presentadas.value.map((p) => ({
      id: p.pregunta.id,
      enunciado: textoPlanoDeMarkdown(p.pregunta.enunciado),
      veredicto: veredictoDe(precisionPregunta(p.pregunta, porId[p.pregunta.id])),
    })),
  };
  fase.value = 'resumen';
  anunciar(
    `Terminaste el quiz. ${resumen.value.porcentaje} % de acierto y ${puntaje} de ${props.actividad.puntaje_max} puntos.`,
  );
  // Norma del contrato: `progreso` nunca llega después de `completada`.
  emisor.cerrar();
  emit('completada', resultado);
  await nextTick();
  tituloResumen.value?.focus();
}

function repetir(): void {
  if (!jugando.value || fase.value !== 'resumen') return;
  cancelarPractica();
  practica.value = 'inactiva';
  intentos.value += 1;
  interactuo.value = true;
  emisor.reabrir();
  emit('interaccion', { accion: 'reinicia_actividad' });
  semilla.value = semillaNueva();
  respuestas.value = sinRespuestas();
  posicion.value = 0;
  resumen.value = null;
  fase.value = 'preguntas';
  anunciar(`Empezaste el intento ${intentos.value}. Pregunta 1 de ${preguntas.value.length}.`);
  void nextTick(() => preguntaRef.value?.enfocar());
}

/* ---- práctica con preguntas de IA (punto de extensión, ver ia.ts) ---- */

const proveedorIA = inject(CLAVE_PREGUNTAS_IA, null);
const cantidadIA = computed(() => props.actividad?.config?.preguntas_ia?.cantidad);
const iaDisponible = computed(
  () => jugando.value && proveedorIA !== null && typeof cantidadIA.value === 'number',
);

const practica = ref<'inactiva' | 'cargando' | 'error' | 'activa' | 'terminada'>('inactiva');
const practicaPresentadas = ref<PreguntaPresentada[]>([]);
const practicaRespuestas = ref<(RespuestaPregunta | null)[]>([]);
const practicaPosicion = ref(0);
const practicaAciertos = computed(
  () =>
    practicaPresentadas.value.filter((p) => {
      const r = practicaRespuestas.value[p.indice];
      return r ? veredictoDe(precisionPregunta(p.pregunta, r)) === 'correcta' : false;
    }).length,
);
const practicaActual = computed(() => practicaPresentadas.value[practicaPosicion.value]);
let controlador: AbortController | null = null;

function cancelarPractica(): void {
  controlador?.abort();
  controlador = null;
}

async function iniciarPractica(): Promise<void> {
  const generar = proveedorIA;
  const cantidad = cantidadIA.value;
  if (!generar || typeof cantidad !== 'number' || practica.value === 'cargando') return;
  cancelarPractica();
  const propio = new AbortController();
  controlador = propio;
  practica.value = 'cargando';
  anunciar('Preparando preguntas de refuerzo.');
  try {
    const bruto = await generar(
      {
        actividadId: props.actividad.id,
        concepto: props.actividad.concepto,
        cantidad,
        enunciadosDelDocente: preguntas.value.map((p) => textoPlanoDeMarkdown(p.enunciado)),
        modulo: props.modulo,
      },
      { signal: propio.signal },
    );
    if (propio.signal.aborted) return;
    const utiles = depurarPreguntas(bruto).slice(0, Math.max(1, cantidad));
    if (utiles.length === 0) throw new Error('El proveedor no devolvió preguntas utilizables.');
    practicaPresentadas.value = presentarQuiz(utiles, semillaNueva(), {
      barajarPreguntas: false,
      barajarOpciones: true,
    });
    practicaRespuestas.value = utiles.map(() => null);
    practicaPosicion.value = 0;
    practica.value = 'activa';
    anunciar(`Práctica de refuerzo: ${utiles.length} preguntas. No suman puntos.`);
  } catch {
    if (propio.signal.aborted) return;
    practica.value = 'error';
    anunciar('No se pudieron preparar las preguntas de refuerzo.');
  } finally {
    if (controlador === propio) controlador = null;
  }
}

function cerrarPractica(): void {
  cancelarPractica();
  practica.value = 'inactiva';
}

function alComprobarPractica(respuesta: RespuestaPregunta): void {
  const objetivo = practicaActual.value;
  if (!objetivo || practicaRespuestas.value[objetivo.indice]) return;
  const nuevas = [...practicaRespuestas.value];
  nuevas[objetivo.indice] = respuesta;
  practicaRespuestas.value = nuevas;
}

async function siguientePractica(): Promise<void> {
  if (practicaPosicion.value >= practicaPresentadas.value.length - 1) {
    practica.value = 'terminada';
    anunciar(
      `Terminaste la práctica: ${practicaAciertos.value} de ${practicaPresentadas.value.length} correctas. No suma puntos.`,
    );
    return;
  }
  practicaPosicion.value++;
  await nextTick();
  preguntaRef.value?.enfocar();
}

/* ---- glosario ---- */

/**
 * Los enlaces `[término](glosario:id)` salen como `<a data-glosario="id" href="#glosario-id">`. Se
 * cancela la navegación y se lanza `ova:glosario` para que el anfitrión abra la definición.
 */
function alHacerClic(evento: MouseEvent): void {
  const enlace =
    evento.target instanceof Element ? evento.target.closest('a[data-glosario]') : null;
  if (!enlace) return;
  evento.preventDefault();
  const id = enlace.getAttribute('data-glosario');
  if (!id) return;
  const detail: DetalleEventoGlosario = { id, actividadId: props.actividad.id };
  enlace.dispatchEvent(new CustomEvent(EVENTO_GLOSARIO, { detail, bubbles: true, composed: true }));
}

/* ---- ciclo de vida ---- */

onBeforeUnmount(() => {
  cancelarPractica();
  emisor.vaciar();
});

/* ---- presentación ---- */

const idTitulo = computed(() => `${uid}-titulo`);
const porcentajeAvance = computed(() =>
  preguntas.value.length === 0 ? 0 : Math.round((respondidas.value / preguntas.value.length) * 100),
);
const yaCompletada = computed(() => props.estadoPrevio?.servidor?.completada === true);

const ICONO_BANDA: Record<BandaRetroalimentacion, typeof CircleCheck> = {
  correcta: CircleCheck,
  parcial: CircleAlert,
  incorrecta: CircleX,
};
const CLASE_BANDA: Record<BandaRetroalimentacion, string> = {
  correcta: 'border-success bg-success-soft',
  parcial: 'border-eosina bg-accent',
  incorrecta: 'border-destructive bg-card',
};
const COLOR_ICONO_BANDA: Record<BandaRetroalimentacion, string> = {
  correcta: 'text-success',
  parcial: 'text-accent-foreground',
  incorrecta: 'text-destructive',
};
const ETIQUETA_VEREDICTO: Record<Veredicto, string> = {
  correcta: 'Correcta',
  parcial: 'Parcial',
  incorrecta: 'Incorrecta',
};
</script>

<template>
  <section
    class="bg-card text-card-foreground border-border mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-4 rounded-2xl border p-4 sm:p-6"
    :aria-labelledby="idTitulo"
    :aria-busy="practica === 'cargando' ? 'true' : undefined"
    data-actividad="quiz"
    @click="alHacerClic"
  >
    <header class="flex flex-col gap-2">
      <h3 :id="idTitulo" class="text-foreground text-xl font-semibold">{{ actividad.titulo }}</h3>
      <p class="text-muted-foreground text-sm leading-relaxed">
        <TextoLinea :texto="actividad.instrucciones" />
      </p>
    </header>

    <!-- Región de anuncios: siempre presente, invisible, cortés y con un solo mensaje a la vez. -->
    <p class="sr-only" aria-live="polite" aria-atomic="true" data-anuncios>
      <span :key="contadorAnuncio">{{ anuncio }}</span>
    </p>

    <!-- Error: contenido sin preguntas utilizables. -->
    <div
      v-if="preguntas.length === 0"
      role="alert"
      class="border-destructive bg-card flex items-start gap-3 rounded-xl border-2 p-3"
      data-estado="error"
    >
      <TriangleAlert class="text-destructive mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p class="text-foreground text-sm">
        No pudimos cargar esta actividad: no tiene preguntas para mostrar. Si sigue pasando, avísale
        a tu docente.
      </p>
    </div>

    <!-- Revisar: solo lectura, con las respuestas correctas. -->
    <div v-else-if="!jugando" class="flex flex-col gap-6" data-modo="revisar">
      <PreguntaQuiz
        v-for="(p, i) in presentadasRevision"
        :key="p.pregunta.id"
        :presentada="p"
        :numero="i + 1"
        :total="presentadasRevision.length"
        :id-base="`${uid}-r${i}`"
        :movimiento-reducido="reducido"
        comprobada
        revision
      />
    </div>

    <!-- Resumen final. -->
    <div v-else-if="fase === 'resumen' && resumen" class="flex flex-col gap-4" data-fase="resumen">
      <h4
        ref="titulo-resumen"
        tabindex="-1"
        class="text-foreground text-lg font-semibold outline-offset-4"
      >
        Resultado del quiz
      </h4>

      <div class="grid grid-cols-2 gap-3">
        <div class="bg-muted rounded-xl p-3">
          <p class="text-muted-foreground text-sm">Acierto</p>
          <p class="text-foreground text-2xl font-semibold tabular-nums">
            {{ resumen.porcentaje }} %
          </p>
        </div>
        <div class="bg-muted rounded-xl p-3">
          <p class="text-muted-foreground text-sm">Puntaje</p>
          <p class="text-foreground text-2xl font-semibold tabular-nums">
            {{ resumen.resultado.puntaje }}
            <span class="text-muted-foreground text-base font-normal">
              de {{ actividad.puntaje_max }}
            </span>
          </p>
        </div>
      </div>

      <div
        class="flex items-start gap-3 rounded-xl border-2 p-3"
        :class="CLASE_BANDA[resumen.banda]"
        data-retro-final
      >
        <component
          :is="ICONO_BANDA[resumen.banda]"
          class="mt-0.5 size-5 shrink-0"
          :class="COLOR_ICONO_BANDA[resumen.banda]"
          aria-hidden="true"
        />
        <p class="text-foreground text-sm leading-relaxed">
          <TextoLinea :texto="resumen.mensaje" />
        </p>
      </div>

      <p
        v-if="resumen.aprobacion"
        class="text-foreground flex items-start gap-2 text-sm font-medium"
        data-aprobacion
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <template v-if="resumen.aprobacion.ahora">
          Alcanzaste el mínimo de {{ Math.round(resumen.aprobacion.minimo * 100) }} % de acierto
          para seguir.
        </template>
        <template v-else-if="resumen.aprobacion.antes">
          Ya habías alcanzado el mínimo de {{ Math.round(resumen.aprobacion.minimo * 100) }} % en un
          intento anterior. Puedes repetir el quiz para mejorar tu puntaje.
        </template>
        <template v-else>
          Necesitas {{ Math.round(resumen.aprobacion.minimo * 100) }} % de acierto para seguir;
          inténtalo de nuevo.
        </template>
      </p>

      <p v-if="resumen.factor < 1" class="text-muted-foreground text-sm">
        Este fue tu intento {{ resumen.resultado.intentos }}: el puntaje se ajusta a
        {{ Math.round(resumen.factor * 100) }} % por los intentos anteriores.
      </p>

      <div>
        <h5 class="text-foreground mb-2 text-sm font-semibold">Tus respuestas</h5>
        <ul class="m-0 flex list-none flex-col gap-1.5 p-0" data-desglose>
          <li
            v-for="fila in resumen.desglose"
            :key="fila.id"
            class="border-border flex min-h-11 items-start gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <CircleCheck
              v-if="fila.veredicto === 'correcta'"
              class="text-success mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <CircleAlert
              v-else-if="fila.veredicto === 'parcial'"
              class="text-accent-foreground mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <CircleX v-else class="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span class="text-foreground min-w-0 [overflow-wrap:anywhere]">
              <span class="font-semibold">{{ ETIQUETA_VEREDICTO[fila.veredicto] }}.</span>
              {{ fila.enunciado }}
            </span>
          </li>
        </ul>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          class="bg-primary text-primary-foreground hover:bg-primary/90 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-2 font-semibold sm:w-auto"
          data-accion="repetir"
          @click="repetir"
        >
          <RotateCcw class="size-4" aria-hidden="true" />
          Repetir el quiz
        </button>
        <button
          v-if="iaDisponible && practica === 'inactiva'"
          type="button"
          class="border-input bg-card text-foreground hover:bg-secondary flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 px-5 py-2 font-semibold sm:w-auto"
          data-accion="practicar"
          @click="iniciarPractica"
        >
          <Sparkles class="size-4" aria-hidden="true" />
          Practicar con preguntas de refuerzo
        </button>
      </div>

      <!-- Práctica de IA: no puntúa y no emite. -->
      <div
        v-if="iaDisponible && practica !== 'inactiva'"
        class="border-border flex flex-col gap-3 rounded-xl border-2 border-dashed p-3"
        data-practica
      >
        <p class="text-foreground text-sm font-semibold">
          Práctica de refuerzo
          <span class="text-muted-foreground font-normal">(no suma puntos)</span>
        </p>

        <div v-if="practica === 'cargando'" class="flex flex-col gap-2" role="status">
          <p class="text-foreground flex items-center gap-2 text-sm">
            <LoaderCircle
              class="size-4 shrink-0"
              :class="reducido ? '' : 'animate-spin'"
              aria-hidden="true"
            />
            Preparando preguntas de refuerzo…
          </p>
          <button
            type="button"
            class="border-input bg-card text-foreground hover:bg-secondary min-h-11 w-full rounded-xl border-2 px-4 py-2 font-semibold sm:w-auto sm:self-start"
            @click="cerrarPractica"
          >
            Cancelar
          </button>
        </div>

        <div v-else-if="practica === 'error'" class="flex flex-col gap-2" role="alert">
          <p class="text-foreground flex items-start gap-2 text-sm">
            <TriangleAlert class="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
            No pudimos preparar las preguntas de refuerzo. Tu resultado no cambia; puedes reintentar
            o seguir adelante.
          </p>
          <div class="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              class="bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 w-full rounded-xl px-4 py-2 font-semibold sm:w-auto"
              @click="iniciarPractica"
            >
              Reintentar
            </button>
            <button
              type="button"
              class="border-input bg-card text-foreground hover:bg-secondary min-h-11 w-full rounded-xl border-2 px-4 py-2 font-semibold sm:w-auto"
              @click="cerrarPractica"
            >
              Cerrar
            </button>
          </div>
        </div>

        <template v-else-if="practica === 'activa' && practicaActual">
          <PreguntaQuiz
            ref="pregunta-actual"
            :key="`ia-${practicaPosicion}`"
            :presentada="practicaActual"
            :numero="practicaPosicion + 1"
            :total="practicaPresentadas.length"
            :respuesta="practicaRespuestas[practicaActual.indice]"
            :comprobada="practicaRespuestas[practicaActual.indice] != null"
            :ultima="practicaPosicion === practicaPresentadas.length - 1"
            :movimiento-reducido="reducido"
            :id-base="`${uid}-ia${practicaPosicion}`"
            @comprobar="alComprobarPractica"
            @siguiente="siguientePractica"
            @anuncio="anunciar"
          />
          <button
            type="button"
            class="text-muted-foreground min-h-11 self-start rounded-lg px-2 text-sm underline"
            @click="cerrarPractica"
          >
            Salir de la práctica
          </button>
        </template>

        <div v-else-if="practica === 'terminada'" class="flex flex-col gap-2">
          <p class="text-foreground text-sm">
            Terminaste la práctica: {{ practicaAciertos }} de {{ practicaPresentadas.length }}
            correctas. No suma puntos.
          </p>
          <div class="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              class="border-input bg-card text-foreground hover:bg-secondary min-h-11 w-full rounded-xl border-2 px-4 py-2 font-semibold sm:w-auto"
              @click="iniciarPractica"
            >
              Practicar de nuevo
            </button>
            <button
              type="button"
              class="border-input bg-card text-foreground hover:bg-secondary min-h-11 w-full rounded-xl border-2 px-4 py-2 font-semibold sm:w-auto"
              @click="cerrarPractica"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Preguntas, una a la vez. -->
    <template v-else-if="actual">
      <div class="flex flex-col gap-1.5" data-avance>
        <div class="text-muted-foreground flex items-center justify-between text-sm">
          <span>{{ respondidas }} de {{ presentadas.length }} respondidas</span>
          <span v-if="intentos > 1">Intento {{ intentos }}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Avance del quiz"
          aria-valuemin="0"
          :aria-valuemax="presentadas.length"
          :aria-valuenow="respondidas"
          :aria-valuetext="`${respondidas} de ${presentadas.length} preguntas respondidas`"
          class="bg-muted h-2 w-full overflow-hidden rounded-full"
        >
          <div
            class="bg-primary h-full rounded-full"
            :class="reducido ? '' : 'transition-[width] duration-300'"
            :style="{ width: `${porcentajeAvance}%` }"
          />
        </div>
      </div>

      <p
        v-if="yaCompletada && !interactuo && respondidas === 0"
        class="text-muted-foreground flex items-start gap-2 text-sm"
        data-ya-completada
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Ya completaste esta actividad. Puedes repetirla para mejorar tu puntaje.
      </p>

      <PreguntaQuiz
        ref="pregunta-actual"
        :key="`${semilla}-${posicion}`"
        :presentada="actual"
        :numero="posicion + 1"
        :total="presentadas.length"
        :respuesta="respuestas[actual.indice]"
        :comprobada="respuestas[actual.indice] != null"
        :ultima="posicion === presentadas.length - 1"
        :movimiento-reducido="reducido"
        :id-base="`${uid}-q${posicion}`"
        @comprobar="alComprobar"
        @siguiente="siguiente"
        @anuncio="anunciar"
        @editando="interactuo = true"
      />
    </template>
  </section>
</template>
