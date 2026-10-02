<script setup lang="ts">
/**
 * Panel de una escena PROCEDURAL con línea de tiempo (actividad `exploracion-3d`, modelo `procedural`;
 * docs/escena-3d-bmu.md): la escena 3D (fragmento perezoso, three y TresJS solo se descargan al montarlo),
 * el texto de la fase actual sincronizado con `t` y los controles: reproducir y pausar, paso anterior y
 * siguiente, deslizador continuo, velocidad, reiniciar, vista de cámara y zoom.
 *
 * Qué es de quién:
 *  - AQUÍ vive el tiempo (`useLineaTiempo`): la escena solo dibuja `estado(t)`. Este panel avisa a la
 *    actividad de los pasos que se visitan (`visitar`) y de la fase en curso (`fase`); la actividad decide
 *    qué es completar. Nada de aquí puntúa.
 *  - La LISTA de fases (botones) vive en la actividad y funciona siempre; aquí el texto de la fase, el
 *    deslizador y los botones NO dependen de WebGL: sin 3D el estudiante puede recorrer la línea de tiempo
 *    y completar la actividad igual (regla R1).
 *
 * Accesibilidad: el deslizador es un `<input type="range">` (teclado: flechas, Inicio, Fin, Re Pág y
 * Av Pág) con `aria-valuetext` de la fase; el texto de la fase se ve siempre, pero la región `aria-live`
 * solo anuncia el cambio de fase (título corto) y con retardo, para no hablar en cada fotograma. Sin
 * reproducción automática nunca; con `prefers-reduced-motion` la cámara no se anima.
 */
import { computed, defineAsyncComponent, h, onBeforeUnmount, ref, useId, watch } from 'vue';
import type { Component } from 'vue';
import {
  Camera,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
} from '@lucide/vue';
import { useMediaQuery } from '@vueuse/core';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { EscenaProcedural } from '@/content/nodos3d';
import { escenaProcedural } from '@/scenes/procedural/registro';
import { pasoDeTiempo, porcentajeDeTiempo } from '@/scenes/procedural/lineaTiempo';
import { VELOCIDADES, useLineaTiempo } from '@/scenes/procedural/useLineaTiempo';
import type { Velocidad } from '@/scenes/procedural/useLineaTiempo';
import type { EstadoEscena } from '@/scenes/useModeloExploracion';
import type { PasoExploracion } from './logica';
import TextoMarkdown from './TextoMarkdown.vue';

const props = withDefaults(
  defineProps<{
    escena: EscenaProcedural;
    alt: string;
    /** Pasos ordenados por `t`. */
    pasos: readonly PasoExploracion[];
    /** Ids de los pasos ya visitados (vacío en modo revisar). */
    visitados?: readonly string[];
    /** Ids de los pasos que hay que visitar. */
    requeridos?: readonly string[];
    /** Paso al que la lista pide saltar; sube `ordenEnfoque` cada vez que se pulsa un botón de la lista. */
    seleccionId?: string | null;
    ordenEnfoque?: number;
    /** Sube para volver a t = 0 (empezar otro intento). */
    ordenReinicio?: number;
  }>(),
  {
    visitados: () => [],
    requeridos: () => [],
    seleccionId: null,
    ordenEnfoque: 0,
    ordenReinicio: 0,
  },
);

const emit = defineEmits<{
  /** El estudiante detuvo la línea en estos pasos o pasó por ellos. */
  visitar: [ids: string[]];
  /** Estado del lienzo (detectando, sin_webgl, error, listo), o el fallo de descarga del fragmento. */
  estado: [estado: EstadoEscena];
  /** Paso cuya fase está en curso (cambia al mover `t`). */
  fase: [id: string];
}>();

const idTexto = useId();
const idVelocidad = useId();
const idVista = useId();
const idDeslizador = useId();

const definicion = computed(() => escenaProcedural(props.escena));
const reducirMovimiento = useMediaQuery('(prefers-reduced-motion: reduce)');

/* ------------------------------------------------------------------------------------------
 * Escena (fragmento aparte)
 * ---------------------------------------------------------------------------------------- */

const visorNoDisponible = ref(false);

/** Mientras se descarga el fragmento de la escena. La línea de tiempo y la lista ya funcionan. */
const EscenaCargando = () =>
  h(
    'p',
    {
      role: 'status',
      class:
        'text-muted-foreground flex min-h-64 items-center justify-center rounded-xl border p-4 text-center text-sm',
      'data-testid': 'visor-cargando',
    },
    'Cargando la escena 3D… Mientras tanto puedes usar la línea de tiempo y la lista de fases.',
  );

/** Sin escena no se dibuja nada aquí: el aviso de la actividad explica qué hacer. */
const EscenaNoCargo = () => null;

const Escena = computed<Component | null>(() => {
  const def = definicion.value;
  if (!def) return null;
  return defineAsyncComponent({
    loader: def.cargar,
    loadingComponent: EscenaCargando,
    errorComponent: EscenaNoCargo,
    delay: 200,
    // Sin escena la actividad sigue completándose con la línea de tiempo: se avisa y se deja de reintentar.
    onError(_error, _reintentar, fallar) {
      visorNoDisponible.value = true;
      emit('estado', 'error');
      fallar();
    },
  });
});

/* ------------------------------------------------------------------------------------------
 * Línea de tiempo
 * ---------------------------------------------------------------------------------------- */

const linea = useLineaTiempo({
  pasos: () => props.pasos,
  duracionSeg: () => definicion.value?.duracionSeg ?? 40,
  alVisitar: (ids) => emit('visitar', ids),
});
const { t, reproduciendo, velocidad } = linea;

const indiceFase = computed(() => pasoDeTiempo(props.pasos, t.value));
const pasoActual = computed<PasoExploracion | null>(() => props.pasos[indiceFase.value] ?? null);
const porcentaje = computed(() => porcentajeDeTiempo(t.value));
const requeridosSet = computed(() => new Set(props.requeridos));
const visitadosSet = computed(() => new Set(props.visitados));

watch(
  () => pasoActual.value?.id,
  (id) => {
    if (id) emit('fase', id);
  },
  { immediate: true },
);

// Región aria-live: solo el cambio de fase, con retardo, para no hablar mientras se arrastra o reproduce.
const anuncioFase = ref('');
let temporizadorAnuncio: ReturnType<typeof setTimeout> | null = null;
watch(indiceFase, (indice, previo) => {
  if (indice === previo) return;
  if (temporizadorAnuncio) clearTimeout(temporizadorAnuncio);
  temporizadorAnuncio = setTimeout(() => {
    const paso = props.pasos[indiceFase.value];
    anuncioFase.value = paso
      ? `Fase ${indiceFase.value + 1} de ${props.pasos.length}: ${paso.titulo}.`
      : '';
  }, 450);
});
onBeforeUnmount(() => {
  if (temporizadorAnuncio) clearTimeout(temporizadorAnuncio);
});

// La lista de fases de la actividad pide saltar a un paso.
watch(
  () => props.ordenEnfoque,
  () => {
    const paso = props.pasos.find((p) => p.id === props.seleccionId);
    if (!paso) return;
    linea.pausar();
    linea.saltar(paso.t);
  },
);
// Otro intento: la línea vuelve al principio.
watch(
  () => props.ordenReinicio,
  () => linea.reiniciar(),
);

/** Valor del deslizador: entero de 0 a 1000. */
const valorDeslizador = computed(() => Math.round(t.value * 1000));
const textoDeslizador = computed(() => {
  const paso = pasoActual.value;
  return paso
    ? `Fase ${indiceFase.value + 1} de ${props.pasos.length}: ${paso.titulo}. ${porcentaje.value} % de la línea de tiempo.`
    : `${porcentaje.value} % de la línea de tiempo.`;
});

function alMoverDeslizador(evento: Event): void {
  const valor = Number((evento.target as HTMLInputElement).value);
  // Mover el deslizador toma el control: la reproducción se detiene y se cuentan los hitos por los que pasa.
  if (reproduciendo.value) linea.pausar();
  linea.arrastrar(valor / 1000);
}

function alSoltarDeslizador(): void {
  linea.soltar();
}

function cambiarVelocidad(valor: string): void {
  const v = Number(valor);
  if ((VELOCIDADES as readonly number[]).includes(v)) linea.cambiarVelocidad(v as Velocidad);
}

/* ------------------------------------------------------------------------------------------
 * Cámara
 * ---------------------------------------------------------------------------------------- */

/** `auto`: la cámara sigue la vista de cada fase; `libre`: el estudiante giró o acercó a mano; o un nombre. */
const modoVista = ref<string>('auto');
const vistaFijada = ref(props.pasos[0]?.vista ?? 'general');
const ordenVista = ref(0);
const ordenZoom = ref<{ id: number; factor: number } | null>(null);
const estadoEscena = ref<EstadoEscena | ''>('');

const vistaEscena = computed(() =>
  modoVista.value === 'auto' ? (pasoActual.value?.vista ?? vistaFijada.value) : vistaFijada.value,
);
const vistasDisponibles = computed(() => definicion.value?.vistas ?? []);

/** Etiquetas de las vistas con nombre (las genéricas sirven a todas las escenas; cada escena puede afinar las suyas). */
const ETIQUETA_VISTA_GENERICA: Readonly<Record<string, string>> = {
  general: 'General',
  perfil: 'Perfil',
  extremo: 'Extremo',
  detalle: 'Detalle',
  interior: 'Interior',
  corte: 'Corte',
  capas: 'Capas separadas',
  osteona: 'Osteona',
  fibra: 'Fibra',
  fibrilla: 'Fibrilla',
  carga: 'Bajo carga',
  raiz: 'Raíz',
  conducto: 'Conducto',
  celula: 'Célula',
  organulos: 'Orgánulos',
  matriz: 'Matriz',
  laguna: 'Laguna',
  canaliculos: 'Canalículos',
  red: 'Red',
  superficie: 'Superficie',
  borde: 'Borde rugoso',
  lateral: 'Lateral',
  intramembranosa: 'Intramembranosa',
  endocondral: 'Endocondral',
  vesicula: 'Vesícula',
  cristal: 'Cristal',
  compresion: 'Lado de compresión',
  tension: 'Lado de tensión',
  callo: 'Callo',
  comparacion: 'Comparación',
  alveolo: 'Alvéolo',
  reborde: 'Reborde',
};
const ETIQUETA_VISTA_POR_ESCENA: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  bmu_remodelado: {
    perfil: 'Perfil (corte longitudinal)',
    extremo: 'Extremo (corte transversal)',
    detalle: 'Detalle del túnel',
  },
};
const ETIQUETA_VISTA = computed<Readonly<Record<string, string>>>(() => ({
  ...ETIQUETA_VISTA_GENERICA,
  ...(ETIQUETA_VISTA_POR_ESCENA[props.escena] ?? {}),
}));

function elegirVista(valor: string): void {
  if (valor === 'auto') {
    modoVista.value = 'auto';
    ordenVista.value += 1;
    return;
  }
  vistaFijada.value = valor;
  modoVista.value = valor;
  ordenVista.value += 1;
}

function alTomarCamara(): void {
  if (modoVista.value !== 'auto') {
    modoVista.value = 'libre';
    return;
  }
  vistaFijada.value = vistaEscena.value;
  modoVista.value = 'libre';
}

function volverAVistaDeFase(): void {
  elegirVista('auto');
}

function zoom(factor: number): void {
  ordenZoom.value = { id: (ordenZoom.value?.id ?? 0) + 1, factor };
}

function alEstado(estado: EstadoEscena): void {
  estadoEscena.value = estado;
  emit('estado', estado);
}

const escenaLista = computed(() => estadoEscena.value === 'listo');

defineExpose({ linea });
</script>

<template>
  <div class="grid gap-3" data-testid="panel-linea-tiempo">
    <component
      :is="Escena"
      v-if="Escena"
      :t="t"
      :vista="vistaEscena"
      :orden-vista="ordenVista"
      :orden-zoom="ordenZoom"
      :alt="alt"
      :reducir-movimiento="reducirMovimiento"
      @estado="alEstado"
      @camara-libre="alTomarCamara"
    />
    <p v-if="escenaLista" class="text-muted-foreground text-sm" data-testid="ayuda-escena">
      Arrastra sobre la escena para girarla y pellizca (o usa la rueda) para acercarla. Mueve la
      línea de tiempo para ver cómo cambia la escena.
    </p>

    <!-- Fase actual: el texto SIEMPRE se ve y sigue a `t`; solo el título corto se anuncia (más abajo). -->
    <article
      :id="idTexto"
      class="bg-card text-card-foreground rounded-xl border p-4"
      data-testid="fase-actual"
      :data-fase="pasoActual?.id"
    >
      <template v-if="pasoActual">
        <p class="text-muted-foreground text-xs font-medium">
          Fase {{ indiceFase + 1 }} de {{ pasos.length }} · {{ porcentaje }} % de la línea de tiempo
        </p>
        <h4 class="font-heading mt-0.5 text-base font-semibold break-words">
          {{ pasoActual.titulo }}
        </h4>
        <TextoMarkdown :texto="pasoActual.texto" class="mt-1 block" />
      </template>
    </article>

    <!-- Controles -->
    <div
      class="grid gap-3"
      role="group"
      aria-label="Línea de tiempo"
      data-testid="controles-tiempo"
    >
      <div class="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Fase anterior"
          data-testid="fase-anterior"
          @click="linea.anterior()"
        >
          <SkipBack aria-hidden="true" />
        </Button>
        <Button
          type="button"
          class="min-w-32"
          :aria-pressed="reproduciendo"
          data-testid="reproducir"
          @click="linea.alternar()"
        >
          <Pause v-if="reproduciendo" aria-hidden="true" />
          <Play v-else aria-hidden="true" />
          {{ reproduciendo ? 'Pausar' : 'Reproducir' }}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Fase siguiente"
          data-testid="fase-siguiente"
          @click="linea.siguiente()"
        >
          <SkipForward aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Reiniciar al principio"
          data-testid="reiniciar-tiempo"
          @click="linea.reiniciar()"
        >
          <RotateCcw aria-hidden="true" />
        </Button>
      </div>

      <div class="grid gap-1">
        <label :for="idDeslizador" class="text-sm font-medium">Línea de tiempo</label>
        <div class="relative">
          <input
            :id="idDeslizador"
            type="range"
            min="0"
            max="1000"
            step="5"
            :value="valorDeslizador"
            class="linea-tiempo focus-visible:ring-ring relative z-10 block h-11 w-full cursor-pointer appearance-none bg-transparent outline-none focus-visible:ring-2"
            :aria-valuetext="textoDeslizador"
            :aria-describedby="idTexto"
            data-testid="deslizador-tiempo"
            @input="alMoverDeslizador"
            @change="alSoltarDeslizador"
          />
          <!-- Marcas de los hitos (decorativas: la lista de fases es la alternativa). -->
          <div class="pointer-events-none absolute inset-x-3.5 top-1/2 h-0" aria-hidden="true">
            <span
              v-for="paso in pasos"
              :key="paso.id"
              class="absolute top-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              :class="
                visitadosSet.has(paso.id)
                  ? 'border-success bg-success'
                  : requeridosSet.has(paso.id)
                    ? 'border-primary bg-card'
                    : 'border-input bg-card'
              "
              :style="{ left: `${paso.t * 100}%` }"
              :data-hito="paso.id"
            />
          </div>
        </div>
        <p class="text-muted-foreground text-xs">
          Los puntos marcan cada fase; se marcan en verde al visitarlas. La escala de tiempo es
          didáctica, no proporcional.
        </p>
      </div>

      <div class="flex flex-wrap items-end gap-2">
        <div class="min-w-28">
          <label :for="idVelocidad" class="text-muted-foreground mb-1 block text-sm"
            >Velocidad</label
          >
          <NativeSelect
            :id="idVelocidad"
            :model-value="String(velocidad)"
            data-testid="velocidad"
            @update:model-value="cambiarVelocidad(String($event ?? ''))"
          >
            <NativeSelectOption v-for="v in VELOCIDADES" :key="v" :value="String(v)">
              {{ String(v).replace('.', ',') }}×
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <div v-if="escenaLista" class="min-w-40 flex-1">
          <label :for="idVista" class="text-muted-foreground mb-1 block text-sm">Vista</label>
          <NativeSelect
            :id="idVista"
            :model-value="modoVista"
            data-testid="selector-vista"
            @update:model-value="elegirVista(String($event ?? ''))"
          >
            <NativeSelectOption value="auto">Automática (sigue la fase)</NativeSelectOption>
            <NativeSelectOption value="libre" disabled>Libre (girada a mano)</NativeSelectOption>
            <NativeSelectOption v-for="v in vistasDisponibles" :key="v" :value="v">
              {{ ETIQUETA_VISTA[v] ?? v }}
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <template v-if="escenaLista">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Acercar"
            data-testid="acercar"
            @click="zoom(0.75)"
          >
            <ZoomIn aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Alejar"
            data-testid="alejar"
            @click="zoom(1 / 0.75)"
          >
            <ZoomOut aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="vista-de-la-fase"
            @click="volverAVistaDeFase"
          >
            <Camera aria-hidden="true" />
            Vista de la fase
          </Button>
        </template>
      </div>
    </div>

    <p class="sr-only" aria-live="polite" aria-atomic="true" data-testid="anuncio-fase">
      {{ anuncioFase }}
    </p>
  </div>
</template>

<style scoped>
/* Deslizador con los tokens de src/style.css: pista fina y pulgar de 28 px (el objetivo de 44 px lo da la
   altura del propio <input>). */
.linea-tiempo::-webkit-slider-runnable-track {
  height: 0.375rem;
  border-radius: 9999px;
  background: var(--secondary);
  border: 1px solid var(--input);
}
.linea-tiempo::-moz-range-track {
  height: 0.375rem;
  border-radius: 9999px;
  background: var(--secondary);
  border: 1px solid var(--input);
}
.linea-tiempo::-webkit-slider-thumb {
  appearance: none;
  width: 1.75rem;
  height: 1.75rem;
  margin-top: -0.75rem;
  border-radius: 9999px;
  background: var(--primary);
  border: 3px solid var(--card);
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
}
.linea-tiempo::-moz-range-thumb {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  background: var(--primary);
  border: 3px solid var(--card);
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
}
</style>
