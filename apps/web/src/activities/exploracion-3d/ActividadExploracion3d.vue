<script setup lang="ts">
/**
 * Actividad `exploracion-3d` (F2-05): el estudiante gira un modelo 3D (mandíbula o células), toca sus
 * partes y lee la ficha de cada una. Se completa al visitar todos los nodos `requeridos`
 * (docs/content-schema.md, 7.6 y 9). La precisión es siempre 1: no hay respuestas erróneas.
 *
 * Contrato: props y eventos de activities/types.ts (`PropsActividadExploracion3d`,
 * `EmitsActividadExploracion3d`). Puntaje solo con `@/content/scoring`; texto solo con
 * `@/content/markdown` (vía `TextoMarkdown`); `progreso` con `crearEmisorProgreso`, que no emite tras
 * `completada`.
 *
 * Degradación (regla R1, cabecera de types.ts): la LISTA de partes son botones que funcionan SIEMPRE,
 * marcan la parte como visitada y permiten completar la actividad aunque el lienzo esté en error (sin
 * WebGL 2, GLB ausente, contexto perdido, fragmento del visor sin descargar). El 3D es una ayuda, no un
 * requisito: una exploración obligatoria no puede bloquear el módulo por un fallo gráfico.
 *
 * Carga perezosa: three y TresJS viven en el fragmento de `@/scenes/EscenaExploracion.vue`, que se
 * descarga solo al montar esta actividad. Aquí no se importa nada de three (ni de forma indirecta:
 * `AtribucionMandibula` y `nodosEscena` no lo usan).
 *
 * Estado del intento: `visitados` (ids, en orden de visita). La instantánea guarda sus ÍNDICES
 * (`logica.ts`) y una llegada tardía de `estadoPrevio` se recoge mientras el estudiante no haya hecho
 * nada, igual que en los otros cinco componentes.
 *
 * Foco (R6): tocar una parte no mueve el foco; al completar pasa al encabezado del resultado, y al
 * empezar otro intento, a la lista de partes. Nada roba el foco al cargar.
 *
 * Variante PROCEDURAL (`config.modelo === 'procedural'`, docs/escena-3d-bmu.md): en lugar de un modelo con
 * nodos, una escena hecha por código con LÍNEA DE TIEMPO. Las "partes" son los pasos de
 * `config.linea_de_tiempo` (`prepararExploracion` los convierte en nodos, así que la lista, el avance, la
 * instantánea y la finalización son los mismos) y en vez de `EscenaExploracion` se monta `PanelLineaTiempo`,
 * que lleva la escena (fragmento perezoso), el texto de la fase y los controles de tiempo. Visitar un paso
 * es detener la línea de tiempo en él o pasar por él (`visitarDesdeLinea`), o pulsarlo en la lista, que
 * además lleva la línea hasta él. Sin WebGL, el panel (texto, deslizador, botones) y la lista bastan.
 */
import {
  computed,
  defineAsyncComponent,
  h,
  nextTick,
  onBeforeUnmount,
  ref,
  useId,
  watch,
} from 'vue';
import { Check, CircleCheck, Eye } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { intentoInicial } from '@/activities/types';
import type {
  EmitsActividadExploracion3d,
  ProgresoActividad,
  PropsActividadExploracion3d,
  ResultadoActividad,
} from '@/activities/types';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import { crearEmisorProgreso } from '@/content/progreso';
import { calcularPuntaje, textoRetroalimentacion } from '@/content/scoring';
import AtribucionMandibula from '@/scenes/AtribucionMandibula.vue';
import type { EstadoEscena } from '@/scenes/useModeloExploracion';
import {
  avanceDeExploracion,
  crearInstantanea,
  esExploracionProcedural,
  exploracionCompleta,
  prepararExploracion,
  requeridosVisitados,
  restaurarVisitados,
} from './logica';
import PanelLineaTiempo from './PanelLineaTiempo.vue';
import TextoMarkdown from './TextoMarkdown.vue';

const props = withDefaults(defineProps<PropsActividadExploracion3d>(), {
  modo: 'jugar',
  estadoPrevio: undefined,
});
const emit = defineEmits<EmitsActividadExploracion3d>();

const idTitulo = useId();
const idLista = useId();
const idFicha = useId();
const idResultado = useId();

/* ------------------------------------------------------------------------------------------
 * Visor 3D (fragmento aparte)
 * ---------------------------------------------------------------------------------------- */

const visorNoDisponible = ref(false);

/** Mientras se descarga el fragmento del visor. La lista de partes ya funciona. */
const VisorCargando = () =>
  h(
    'p',
    {
      role: 'status',
      class: 'text-muted-foreground flex min-h-11 items-center text-sm',
      'data-testid': 'visor-cargando',
    },
    'Cargando el visor 3D… Mientras tanto puedes usar la lista de partes.',
  );

/** Sin visor no se dibuja nada aquí: el aviso (`aviso-sin-3d`) y la lista explican qué hacer. */
const VisorNoCargo = () => null;

const EscenaExploracion = defineAsyncComponent({
  loader: () => import('@/scenes/EscenaExploracion.vue'),
  loadingComponent: VisorCargando,
  // Con `errorComponent` Vue no relanza el fallo de la descarga como error sin capturar.
  errorComponent: VisorNoCargo,
  delay: 200,
  // Sin visor la actividad sigue completándose con la lista: se avisa y se deja de reintentar.
  onError(_error, _reintentar, fallar) {
    visorNoDisponible.value = true;
    fallar();
  },
});

const estadoEscena = ref<EstadoEscena | ''>('');
const escenaNoDisponible = computed(
  () =>
    visorNoDisponible.value || estadoEscena.value === 'error' || estadoEscena.value === 'sin_webgl',
);

/* ------------------------------------------------------------------------------------------
 * Estado del intento
 * ---------------------------------------------------------------------------------------- */

const exploracion = computed(() => prepararExploracion(props.actividad.config));
const nodos = computed(() => exploracion.value.nodos);
const pasos = computed(() => exploracion.value.pasos);
const esProcedural = computed(() => esExploracionProcedural(props.actividad.config));
/** Cómo se llaman las partes en los textos: fases en una escena con línea de tiempo. */
const partes = computed(() =>
  esProcedural.value
    ? { plural: 'fases', requeridas: 'fases requeridas', lista: 'Fases del proceso' }
    : { plural: 'partes', requeridas: 'partes requeridas', lista: 'Partes del modelo' },
);
const requeridos = computed(() => exploracion.value.requeridos);
const jugando = computed(() => props.modo === 'jugar');

const intentos = ref(intentoInicial(props.estadoPrevio));
const visitados = ref<string[]>(
  restaurarVisitados(props.estadoPrevio?.progreso?.instantanea, nodos.value),
);
const seleccionId = ref<string | null>(null);
const ordenEnfoque = ref(0);
/** Sube al empezar otro intento: la línea de tiempo vuelve a t = 0. */
const ordenReinicio = ref(0);
/** Fase en curso según `t` (solo escenas procedurales). */
const faseActualId = ref<string | null>(null);
/** ¿Ya hizo algo el estudiante en esta ejecución? Hasta entonces `estadoPrevio` puede reasignarse. */
const interactuado = ref(false);
const resultado = ref<ResultadoActividad<'exploracion-3d'> | null>(null);
const anuncio = ref('');

const visitadosRequeridos = computed(() => requeridosVisitados(requeridos.value, visitados.value));
const seleccionado = computed(() => nodos.value.find((n) => n.id === seleccionId.value) ?? null);
const puntajePrevio = computed(() => {
  const servidor = props.estadoPrevio?.servidor;
  return servidor?.completada ? servidor.puntaje : null;
});

// Emisor de `progreso`: agrupa las emisiones y, tras `completada`, no emite más (ver types.ts).
const emisor = crearEmisorProgreso<ProgresoActividad>((p) => emit('progreso', p));
onBeforeUnmount(() => emisor.vaciar());

// El estado del servidor puede llegar después de montar: hasta la primera interacción, el número de
// intento y lo restaurado se recalculan con lo último que se sabe.
watch(
  () => props.estadoPrevio,
  (nuevo) => {
    if (interactuado.value) return;
    intentos.value = intentoInicial(nuevo);
    visitados.value = restaurarVisitados(nuevo?.progreso?.instantanea, nodos.value);
  },
  { deep: true },
);

/* ------------------------------------------------------------------------------------------
 * Acciones
 * ---------------------------------------------------------------------------------------- */

const tituloResultado = ref<HTMLElement | null>(null);
const tituloLista = ref<HTMLElement | null>(null);

function completar(): void {
  const precision = 1;
  const puntaje = calcularPuntaje(props.actividad, { precision, intentos: intentos.value });
  const final: ResultadoActividad<'exploracion-3d'> = {
    puntaje,
    intentos: intentos.value,
    precision,
    detalle: { visitados: [...visitados.value] },
  };
  resultado.value = final;
  anuncio.value = `Exploración completada. Obtuviste ${puntaje} de ${props.actividad.puntaje_max} puntos.`;
  // Primero se cierra el emisor: el `progreso` pendiente jamás debe llegar después de `completada`.
  emisor.cerrar();
  emit('completada', final);
  // R6: al completar, el foco pasa al encabezado del resultado.
  void nextTick(() => tituloResultado.value?.focus());
}

function seleccionar(id: string): void {
  const nodo = nodos.value.find((n) => n.id === id);
  if (!nodo) return;
  seleccionId.value = id;
  ordenEnfoque.value += 1;
  if (!jugando.value) {
    // Revisar: solo lectura. Se lee la ficha y se mueve la cámara; no se cuenta nada ni se emite nada.
    anuncio.value = `${nodo.etiqueta}: ${textoPlanoDeMarkdown(nodo.descripcion)}`;
    return;
  }
  interactuado.value = true;
  emit('interaccion', { accion: 'selecciona_nodo', objeto: id });

  const yaCompletada = resultado.value !== null;
  const esNueva = !visitados.value.includes(id);
  if (esNueva) visitados.value = [...visitados.value, id];

  const ficha = `${nodo.etiqueta}: ${textoPlanoDeMarkdown(nodo.descripcion)}`;
  if (yaCompletada) {
    // Seguir explorando tras completar es libre: no cuenta, no emite `progreso` ni vuelve a completar.
    anuncio.value = ficha;
    return;
  }
  if (exploracionCompleta(requeridos.value, visitados.value)) {
    completar();
    return;
  }
  anuncio.value = `${ficha} ${
    esNueva ? 'Explorada.' : 'Ya la habías explorado.'
  } Llevas ${visitadosRequeridos.value} de ${requeridos.value.length} partes requeridas.`;
  if (esNueva) {
    emisor.emitir({
      avance: avanceDeExploracion(requeridos.value, visitados.value),
      intentos: intentos.value,
      instantanea: crearInstantanea(visitados.value, nodos.value),
    });
  }
}

/**
 * Pasos que la línea de tiempo visitó (se detuvo en ellos o pasó por ellos). Solo cuenta los nuevos: pasar
 * otra vez por uno ya visitado no emite nada. No mueve la selección ni la línea (ya está donde está).
 */
function visitarDesdeLinea(ids: string[]): void {
  if (!jugando.value) return;
  for (const id of ids) {
    const nodo = nodos.value.find((n) => n.id === id);
    if (!nodo || visitados.value.includes(id)) continue;
    interactuado.value = true;
    emit('interaccion', { accion: 'selecciona_nodo', objeto: id });
    visitados.value = [...visitados.value, id];
    // Seguir explorando tras completar es libre: no cuenta ni vuelve a completar.
    if (resultado.value !== null) continue;
    if (exploracionCompleta(requeridos.value, visitados.value)) {
      completar();
      continue;
    }
    anuncio.value = `Fase visitada: ${nodo.etiqueta}. Llevas ${visitadosRequeridos.value} de ${requeridos.value.length} fases requeridas.`;
    emisor.emitir({
      avance: avanceDeExploracion(requeridos.value, visitados.value),
      intentos: intentos.value,
      instantanea: crearInstantanea(visitados.value, nodos.value),
    });
  }
}

function repetir(): void {
  if (!jugando.value) return;
  intentos.value += 1;
  visitados.value = [];
  seleccionId.value = null;
  // Sin selección, la cámara vuelve al encuadre general (y la línea de tiempo, a t = 0).
  ordenEnfoque.value += 1;
  ordenReinicio.value += 1;
  resultado.value = null;
  anuncio.value = 'Empezaste de nuevo. Explora las partes requeridas.';
  emisor.reabrir();
  emit('interaccion', { accion: 'reinicia_actividad' });
  void nextTick(() => tituloLista.value?.focus());
}

const retroalimentacion = computed(() => textoRetroalimentacion(props.actividad, 1));

defineExpose({ seleccionar, repetir, visitarDesdeLinea });
</script>

<template>
  <section
    class="grid gap-4"
    :aria-labelledby="idTitulo"
    data-testid="actividad-exploracion-3d"
    :data-modo="modo"
  >
    <header class="grid gap-1">
      <h3 :id="idTitulo" class="font-heading text-lg font-semibold">{{ actividad.titulo }}</h3>
      <TextoMarkdown :texto="actividad.instrucciones" class="text-muted-foreground" />
      <p
        v-if="!jugando"
        class="bg-muted text-muted-foreground mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm"
        data-testid="aviso-revision"
      >
        <Eye class="size-4 shrink-0" aria-hidden="true" />
        Modo de revisión: solo lectura. Lee la ficha de cada parte; no se guarda nada.
      </p>
      <p
        v-else-if="puntajePrevio !== null"
        class="text-muted-foreground text-sm"
        data-testid="aviso-previo"
      >
        Ya completaste esta actividad (mejor puntaje: {{ puntajePrevio }} de
        {{ actividad.puntaje_max }}). Repetirla no sube el puntaje.
      </p>
    </header>

    <div v-if="jugando" class="grid gap-1" data-testid="avance">
      <p class="flex items-center gap-2 text-sm font-medium">
        <CircleCheck v-if="!!resultado" class="text-success size-4 shrink-0" aria-hidden="true" />
        {{ visitadosRequeridos }} de {{ requeridos.length }} {{ partes.requeridas }}
        {{ esProcedural ? 'visitadas' : 'exploradas' }}
      </p>
      <div
        class="bg-secondary h-2 overflow-hidden rounded-full"
        role="progressbar"
        :aria-label="`${esProcedural ? 'Fases requeridas visitadas' : 'Partes requeridas exploradas'}`"
        aria-valuemin="0"
        :aria-valuemax="requeridos.length"
        :aria-valuenow="visitadosRequeridos"
      >
        <div
          class="bg-primary h-full rounded-full motion-safe:transition-[width]"
          :style="{ width: `${(visitadosRequeridos / Math.max(1, requeridos.length)) * 100}%` }"
        />
      </div>
    </div>

    <div class="grid gap-2">
      <!-- Escena procedural: escena 3D, texto de la fase y controles de la línea de tiempo. -->
      <PanelLineaTiempo
        v-if="actividad.config.modelo === 'procedural' && actividad.config.escena"
        :key="actividad.config.escena"
        :escena="actividad.config.escena"
        :alt="actividad.config.alt"
        :pasos="pasos"
        :visitados="jugando ? visitados : []"
        :requeridos="requeridos"
        :seleccion-id="seleccionId"
        :orden-enfoque="ordenEnfoque"
        :orden-reinicio="ordenReinicio"
        @visitar="visitarDesdeLinea"
        @estado="estadoEscena = $event"
        @fase="faseActualId = $event"
      />
      <EscenaExploracion
        v-else-if="actividad.config.modelo !== 'procedural'"
        :key="actividad.config.modelo"
        :modelo="actividad.config.modelo"
        :alt="actividad.config.alt"
        :nodos="nodos"
        :visitados="jugando ? visitados : []"
        :seleccion-id="seleccionId"
        :orden-enfoque="ordenEnfoque"
        @seleccionar="seleccionar"
        @estado="estadoEscena = $event"
      />
      <p
        v-if="escenaNoDisponible"
        class="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm"
        data-testid="aviso-sin-3d"
      >
        <template v-if="visorNoDisponible">No se pudo cargar el visor 3D. </template>
        Puedes {{ jugando ? 'completar la actividad' : 'leer las fichas' }} con la lista de
        {{ partes.plural }}<template v-if="esProcedural"> y la línea de tiempo</template>: es la
        misma actividad.
      </p>
      <p
        v-if="actividad.config.modelo === 'mandibula'"
        class="text-muted-foreground text-xs"
        data-testid="atribucion"
      >
        <AtribucionMandibula />
      </p>
    </div>

    <section :aria-labelledby="idLista" class="grid gap-2">
      <h4
        :id="idLista"
        ref="tituloLista"
        tabindex="-1"
        class="text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {{ partes.lista }}
      </h4>
      <ul class="grid gap-2 sm:grid-cols-2" data-testid="lista-nodos">
        <li v-for="(nodo, indice) in nodos" :key="nodo.id">
          <button
            type="button"
            class="border-input bg-card text-card-foreground hover:bg-accent focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 rounded-md border px-3 py-2 text-left outline-none focus-visible:ring-2"
            :class="
              (esProcedural ? faseActualId === nodo.id : seleccionId === nodo.id)
                ? 'border-primary bg-accent ring-primary ring-2'
                : ''
            "
            :aria-current="
              esProcedural
                ? faseActualId === nodo.id
                  ? 'step'
                  : undefined
                : seleccionId === nodo.id
                  ? 'true'
                  : undefined
            "
            :aria-describedby="!esProcedural && seleccionId === nodo.id ? idFicha : undefined"
            :data-nodo="nodo.id"
            :data-visitado="jugando && visitados.includes(nodo.id)"
            @click="seleccionar(nodo.id)"
          >
            <span
              class="bg-secondary text-secondary-foreground grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold"
              aria-hidden="true"
              >{{ indice + 1 }}</span
            >
            <span class="min-w-0 flex-1">
              <span class="block font-medium break-words">{{ nodo.etiqueta }}</span>
              <span class="text-muted-foreground block text-xs">
                {{ nodo.requerido ? 'Requerida' : 'Opcional'
                }}<template v-if="jugando && visitados.includes(nodo.id)">
                  · {{ esProcedural ? 'Visitada' : 'Explorada' }}</template
                >
              </span>
            </span>
            <Check
              v-if="jugando && visitados.includes(nodo.id)"
              class="text-success size-5 shrink-0"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>
    </section>

    <article
      v-if="!esProcedural"
      :id="idFicha"
      class="bg-card text-card-foreground rounded-xl border p-4"
      data-testid="ficha"
    >
      <template v-if="seleccionado">
        <h4 class="font-heading text-base font-semibold break-words">
          {{ seleccionado.etiqueta }}
        </h4>
        <TextoMarkdown :texto="seleccionado.descripcion" class="mt-1 block" />
      </template>
      <p v-else class="text-muted-foreground text-sm">
        Elige una parte de la lista o toca un número sobre el modelo para leer su ficha.
      </p>
    </article>

    <div
      v-if="resultado"
      class="bg-success-soft text-foreground grid gap-2 rounded-xl border p-4"
      role="group"
      :aria-labelledby="idResultado"
      data-testid="resultado"
    >
      <h4
        :id="idResultado"
        ref="tituloResultado"
        tabindex="-1"
        class="font-heading flex items-center gap-2 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CircleCheck class="text-success size-5 shrink-0" aria-hidden="true" />
        Exploración completada
      </h4>
      <TextoMarkdown :texto="retroalimentacion" class="block" />
      <p class="text-sm">
        Puntaje: <strong>{{ resultado.puntaje }}</strong> de {{ actividad.puntaje_max }} · Intento
        {{ resultado.intentos }}
      </p>
      <div>
        <Button type="button" variant="outline" data-testid="repetir" @click="repetir">
          Volver a explorar desde cero
        </Button>
      </div>
    </div>

    <p class="sr-only" aria-live="polite" aria-atomic="true" data-testid="anuncio">
      {{ anuncio }}
    </p>
  </section>
</template>
