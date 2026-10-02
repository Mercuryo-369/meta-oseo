<script setup lang="ts">
/**
 * Explicación animada por pasos (video-texto, medio "animacion"): un SVG cuyos grupos se muestran,
 * se ocultan o se resaltan según el paso, junto al texto del paso.
 *
 * Solo maneja la explicación; quien decide qué se emite al contrato (progreso, interacciones,
 * completada, modo `revisar`) es `ActividadVideoTexto.vue`, a quien este panel avisa.
 *
 *  - Controles: Anterior, Siguiente y, si el sistema no pide menos movimiento, Reproducir/Pausar.
 *    Sin `prefers-reduced-motion` la reproducción automática avanza sola (nunca arranca sola); con
 *    él solo se ofrece el avance manual y el dibujo cambia sin fundidos.
 *  - Gesto táctil: deslizar el dibujo a izquierda o derecha cambia de paso (`touch-action: pan-y`,
 *    el desplazamiento vertical de la página no se bloquea). Es un atajo: los botones siempre están.
 *  - Sin el SVG (red, formato) la explicación sigue completa con el texto de cada paso.
 *  - Se completa al llegar al último paso; la página no lo vuelve a pedir tras `reiniciar()`.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { usePreferredReducedMotion } from '@vueuse/core';
import { ChevronLeft, ChevronRight, LoaderCircle, Pause, Play, TriangleAlert } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import type { ConfigAnimacion } from '@/content/schema';
import type { DetalleVideoTexto, InteraccionActividad, JsonObjeto } from '@/activities/types';
import { leerInstantaneaAnimacion } from './instantanea';
import { prefijoDeIds } from '@/activities/idsUnicos';
import { aplicarPaso, cargarSvg } from './svgAnimacion';
import type { SvgListo } from './svgAnimacion';
import TextoMarkdown from './TextoMarkdown.vue';
import { duracionDePasoMs } from './video';

const props = defineProps<{
  config: ConfigAnimacion;
  /** Id de la actividad: prefija los ids referenciados del SVG inyectado. */
  actividadId: string;
  /** Instantánea guardada de un intento a medias (puede llegar tarde o estar corrupta). */
  instantanea?: JsonObjeto;
}>();

const emit = defineEmits<{
  progreso: [avance: number, instantanea: JsonObjeto];
  interaccion: [interaccion: InteraccionActividad];
  completar: [detalle: DetalleVideoTexto];
  anunciar: [mensaje: string];
}>();

/** Distancia mínima (px) de un deslizamiento para cambiar de paso. */
const UMBRAL_DESLIZAMIENTO_PX = 48;

const pasos = computed(() => props.config.pasos);
const total = computed(() => pasos.value.length);
const ultimo = computed(() => total.value - 1);

const paso = ref(0);
const maximo = ref(0);
const reproduciendo = ref(false);
/** ¿El estudiante ya tocó algo? Hasta entonces una instantánea tardía puede reposicionar. */
let movido = false;

const pasoActual = computed(() => pasos.value[paso.value]);
const esPrimero = computed(() => paso.value <= 0);
const esUltimo = computed(() => paso.value >= ultimo.value);
const unSoloPaso = computed(() => total.value === 1);

const movimiento = usePreferredReducedMotion();
const reducido = computed(() => movimiento.value === 'reduce');

/* ---------------------------------------- Instantánea ---------------------------------------- */

watch(
  () => [props.instantanea, total.value] as const,
  ([instantanea, cantidad]) => {
    if (movido) return;
    const guardada = leerInstantaneaAnimacion(instantanea, cantidad);
    if (!guardada) return;
    paso.value = guardada.paso;
    maximo.value = guardada.maximo;
  },
  { immediate: true, deep: true },
);

/* -------------------------------------------- Pasos ------------------------------------------ */

function instantaneaActual(): JsonObjeto {
  return { paso: paso.value, maximo: maximo.value };
}

function avance(): number {
  return ultimo.value > 0 ? Math.min(1, maximo.value / ultimo.value) : 0;
}

function completar(): void {
  reproduciendo.value = false;
  emit('completar', { medio: 'animacion', pasos_vistos: maximo.value + 1 });
}

function irA(destino: number): void {
  if (total.value === 0) return;
  const nuevo = Math.min(ultimo.value, Math.max(0, Math.trunc(destino)));
  if (nuevo === paso.value) return;
  movido = true;
  paso.value = nuevo;
  maximo.value = Math.max(maximo.value, nuevo);
  const actual = pasos.value[nuevo]!;
  emit('interaccion', { accion: 'avanza_paso', objeto: actual.id });
  emit(
    'anunciar',
    `Paso ${nuevo + 1} de ${total.value}: ${actual.titulo}. ${textoPlanoDeMarkdown(actual.texto)}`,
  );
  if (nuevo === ultimo.value) completar();
  else emit('progreso', avance(), instantaneaActual());
}

function siguiente(): void {
  if (esUltimo.value) {
    // Con un único paso no hay a dónde avanzar: "Finalizar" completa la actividad.
    if (unSoloPaso.value) {
      movido = true;
      completar();
    }
    return;
  }
  irA(paso.value + 1);
}

function anterior(): void {
  irA(paso.value - 1);
}

/* ------------------------------------ Reproducción automática -------------------------------- */

let temporizador: ReturnType<typeof setTimeout> | null = null;

function limpiarTemporizador(): void {
  if (temporizador !== null) {
    clearTimeout(temporizador);
    temporizador = null;
  }
}

// La reproducción se reprograma sola con cada cambio de paso (manual o automático) y se detiene
// si el sistema pasa a pedir menos movimiento o si ya no hay a dónde avanzar.
watch([reproduciendo, paso, reducido], () => {
  limpiarTemporizador();
  if (!reproduciendo.value) return;
  if (reducido.value || esUltimo.value) {
    reproduciendo.value = false;
    return;
  }
  const texto = textoPlanoDeMarkdown(pasoActual.value?.texto ?? '');
  temporizador = setTimeout(() => {
    temporizador = null;
    irA(paso.value + 1);
  }, duracionDePasoMs(texto));
});

function alternarReproduccion(): void {
  if (reducido.value) return;
  if (reproduciendo.value) {
    reproduciendo.value = false;
    return;
  }
  if (esUltimo.value) irA(0);
  reproduciendo.value = total.value > 1;
}

/* ------------------------------------------- Deslizar ---------------------------------------- */

let inicioDeslizamiento: { id: number; x: number; y: number } | null = null;

function alBajarPuntero(evento: PointerEvent): void {
  if (evento.pointerType === 'mouse') return;
  inicioDeslizamiento = { id: evento.pointerId, x: evento.clientX, y: evento.clientY };
}

function alSubirPuntero(evento: PointerEvent): void {
  const inicio = inicioDeslizamiento;
  inicioDeslizamiento = null;
  if (!inicio || inicio.id !== evento.pointerId) return;
  const dx = evento.clientX - inicio.x;
  const dy = evento.clientY - inicio.y;
  if (Math.abs(dx) < UMBRAL_DESLIZAMIENTO_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  if (dx < 0) siguiente();
  else anterior();
}

function alCancelarPuntero(): void {
  inicioDeslizamiento = null;
}

/* --------------------------------------------- SVG ------------------------------------------- */

const contenedor = ref<HTMLElement | null>(null);
const estadoSvg = ref<'cargando' | 'listo' | 'error'>('cargando');
let grupos: SvgListo['grupos'] | null = null;
let primeraPintura = true;
let controlador: AbortController | null = null;

function pintar(): void {
  const actual = pasoActual.value;
  if (!grupos || !actual) return;
  aplicarPaso(grupos, actual, !reducido.value && !primeraPintura);
  primeraPintura = false;
}

async function cargar(): Promise<void> {
  controlador?.abort();
  const propio = new AbortController();
  controlador = propio;
  estadoSvg.value = 'cargando';
  grupos = null;
  try {
    const listo = await cargarSvg(
      props.config.svg,
      prefijoDeIds(props.actividadId),
      props.config.viewBox,
      propio.signal,
    );
    if (propio.signal.aborted || !contenedor.value) return;
    contenedor.value.replaceChildren(listo.raiz);
    grupos = listo.grupos;
    primeraPintura = true;
    estadoSvg.value = 'listo';
    pintar();
  } catch {
    if (propio.signal.aborted) return;
    contenedor.value?.replaceChildren();
    estadoSvg.value = 'error';
  }
}

watch(paso, pintar, { flush: 'post' });
watch(
  () => [props.config.svg, props.config.viewBox],
  () => void cargar(),
);
onMounted(() => void cargar());

onBeforeUnmount(() => {
  controlador?.abort();
  controlador = null;
  limpiarTemporizador();
  reproduciendo.value = false;
  grupos = null;
  contenedor.value?.replaceChildren();
});

/** Proporción del dibujo, para reservar su espacio mientras carga (sin saltos de diseño). */
const proporcion = computed(() => {
  const partes = props.config.viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const ancho = partes[2];
  const alto = partes[3];
  return ancho && alto && ancho > 0 && alto > 0 ? `${ancho} / ${alto}` : '2 / 1';
});

/** Vuelve al primer paso para un intento nuevo. */
function reiniciar(): void {
  reproduciendo.value = false;
  movido = false;
  paso.value = 0;
  maximo.value = 0;
}

defineExpose({ reiniciar });
</script>

<template>
  <div class="grid gap-4" data-testid="panel-animacion">
    <figure class="m-0 grid gap-2">
      <div
        class="relative touch-pan-y overflow-hidden rounded-xl border border-input bg-card"
        data-testid="lienzo"
        @pointerdown="alBajarPuntero"
        @pointerup="alSubirPuntero"
        @pointercancel="alCancelarPuntero"
      >
        <div
          ref="contenedor"
          role="img"
          :aria-label="config.alt"
          class="w-full"
          :style="{ aspectRatio: proporcion }"
          data-testid="svg-animacion"
        />
        <div
          v-if="estadoSvg === 'cargando'"
          role="status"
          class="absolute inset-0 flex items-center justify-center gap-2 bg-card/90 p-4 text-sm text-muted-foreground"
        >
          <LoaderCircle class="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span>Cargando la ilustración…</span>
        </div>
        <div
          v-else-if="estadoSvg === 'error'"
          role="status"
          class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-4 text-center text-sm"
          data-testid="error-svg"
        >
          <p class="flex items-center gap-2 font-medium text-destructive">
            <TriangleAlert class="size-5 shrink-0" aria-hidden="true" />
            No se pudo cargar la ilustración.
          </p>
          <p class="text-muted-foreground">
            Puedes seguir la explicación con el texto de cada paso.
          </p>
          <Button type="button" variant="outline" @click="cargar">Reintentar</Button>
        </div>
      </div>
    </figure>

    <div
      v-if="pasoActual"
      class="grid gap-2 rounded-xl border border-border bg-card p-4 text-card-foreground"
      data-testid="paso-actual"
    >
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-medium text-muted-foreground" data-testid="contador-paso">
          Paso {{ paso + 1 }} de {{ total }}
        </p>
        <ol class="flex items-center gap-1.5" aria-hidden="true">
          <li
            v-for="(p, i) in pasos"
            :key="`${i}-${p.id}`"
            class="h-2.5 rounded-full border border-primary"
            :class="[
              i === paso ? 'w-6 bg-primary' : i < paso ? 'w-2.5 bg-primary/60' : 'w-2.5 bg-card',
            ]"
          />
        </ol>
      </div>
      <h4 class="font-serif text-lg font-semibold" data-testid="titulo-paso">
        {{ pasoActual.titulo }}
      </h4>
      <p class="leading-relaxed" data-testid="texto-paso">
        <TextoMarkdown :texto="pasoActual.texto" />
      </p>
    </div>
    <p v-else class="rounded-xl border border-border p-4 text-sm text-muted-foreground">
      Esta explicación aún no tiene pasos.
    </p>

    <div role="group" aria-label="Controles de la explicación" class="grid gap-2">
      <div class="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          class="min-w-28 flex-1"
          :aria-disabled="esPrimero ? 'true' : undefined"
          :class="esPrimero && 'opacity-50'"
          data-testid="anterior"
          @click="anterior"
        >
          <ChevronLeft aria-hidden="true" />
          Anterior
        </Button>
        <Button
          v-if="!reducido && total > 1"
          type="button"
          variant="secondary"
          class="min-w-28 flex-1"
          data-testid="reproducir"
          @click="alternarReproduccion"
        >
          <Pause v-if="reproduciendo" aria-hidden="true" />
          <Play v-else aria-hidden="true" />
          {{ reproduciendo ? 'Pausar' : 'Reproducir' }}
        </Button>
        <Button
          type="button"
          class="min-w-28 flex-1"
          :aria-disabled="esUltimo && !unSoloPaso ? 'true' : undefined"
          :class="esUltimo && !unSoloPaso && 'opacity-50'"
          data-testid="siguiente"
          @click="siguiente"
        >
          {{ unSoloPaso ? 'Finalizar' : 'Siguiente' }}
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      <p v-if="reducido" class="text-sm text-muted-foreground" data-testid="aviso-movimiento">
        Tu dispositivo pide menos movimiento: avanza paso a paso con los botones.
      </p>
    </div>

    <details class="rounded-xl border border-border bg-card p-4" data-testid="transcripcion">
      <summary class="objetivo-tactil flex cursor-pointer items-center font-medium">
        Transcripción de la explicación
      </summary>
      <ol class="mt-3 grid gap-3 pl-5" style="list-style: decimal">
        <li
          v-for="(p, i) in pasos"
          :key="`${i}-${p.id}`"
          :aria-current="i === paso ? 'step' : undefined"
          class="pl-1"
        >
          <strong class="font-semibold">{{ p.titulo }}.</strong>
          <TextoMarkdown :texto="p.texto" />
        </li>
      </ol>
    </details>
  </div>
</template>
