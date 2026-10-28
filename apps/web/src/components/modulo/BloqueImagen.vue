<script setup lang="ts">
/**
 * Bloque `imagen`: `alt` obligatorio (lo exige el esquema), pie con Markdown de una línea y crédito. Si hay `figura`
 * (la versión realista del dibujo), se muestra esa. Si el archivo no carga, se muestra el texto alternativo en un
 * recuadro para que el contenido no se pierda.
 *
 * Una vista por pantalla (observaciones de la docente, 2026-10-27: «que en una sola vista podamos ver todo sin estar
 * para arriba y para abajo», «las imágenes a la izquierda y el texto a la derecha», «cuando el texto es largo, que
 * tenga su barrita para deslizar sin dejar de ver la imagen»):
 *  - La imagen se ajusta a la altura de la ventana: nunca se sale de la pantalla.
 *  - Con texto al lado (ranura `lateral`, la pone la página cuando un texto acompaña a la imagen), la imagen va a la
 *    izquierda y el texto a la derecha en un recuadro con su propia barra de desplazamiento. Si la imagen es muy
 *    ancha, o el texto es corto y la imagen apaisada, el texto va debajo y la imagen gana tamaño.
 *  - Con `puntos` («al tocar cada letrero deberá salir el texto»), los letreros y su recuadro van a la derecha de la
 *    imagen. Con `en_orden`, cada punto se habilita al abrir el anterior.
 *  - Con `secuencia`, las imágenes se recorren una a una con anterior/siguiente y una fila de pasos.
 *  - Con `pareja`, dos imágenes lado a lado.
 */
import { computed, ref, useSlots } from 'vue';
import { Check, ChevronLeft, ChevronRight, ImageOff, Lock } from '@lucide/vue';
import type { BloqueImagen } from '@/content/schema';
import TextoRico from './TextoRico.vue';

const props = withDefaults(
  defineProps<{
    bloque: BloqueImagen;
    /** Caracteres del texto de la ranura `lateral` (decide su ancho y si va al lado o debajo). */
    largoLateral?: number;
    /** El texto lateral se lee sobre un fondo ilustrado: recuadro de cristal. */
    lateralCristal?: boolean;
  }>(),
  { largoLateral: 0, lateralCristal: false },
);
const slots = useSlots();

const fallo = ref(false);
const puntos = computed(() => props.bloque.puntos ?? []);
const activo = ref<number | null>(null);
const vistos = ref<Set<number>>(new Set());
/** Con `en_orden`: el primero aún sin abrir; los posteriores esperan. */
const siguiente = computed(() => {
  for (let i = 0; i < puntos.value.length; i++) if (!vistos.value.has(i)) return i;
  return puntos.value.length;
});
const puntoActivo = computed(() => (activo.value === null ? null : puntos.value[activo.value]));

function bloqueado(i: number): boolean {
  return props.bloque.en_orden === true && i > siguiente.value;
}

function abrir(i: number): void {
  if (bloqueado(i)) return;
  activo.value = i;
  vistos.value = new Set(vistos.value).add(i);
}

const secuencia = computed(() => props.bloque.secuencia ?? []);
const paso = ref(0);
const pasoActual = computed(() => secuencia.value[paso.value]);

const hayLateral = computed(() => Boolean(slots.lateral));
const hayPuntos = computed(() => puntos.value.length > 0);
/** Proporción ancho/alto de la imagen (o de la primera de la secuencia). */
const aspecto = computed(() => {
  const a = pasoActual.value ?? props.bloque;
  return a.ancho && a.alto ? a.ancho / a.alto : 1.4;
});
/** Texto debajo de la imagen: imagen muy apaisada, o apaisada con poco texto (así la imagen se ve más grande). */
const apilado = computed(
  () =>
    hayLateral.value &&
    !hayPuntos.value &&
    (aspecto.value >= 1.75 || (aspecto.value >= 1.3 && props.largoLateral < 450)),
);
/** Hay columna derecha: texto al lado o letreros de la imagen. */
const conColumna = computed(() => (hayLateral.value && !apilado.value) || hayPuntos.value);
/** Ancho de la columna derecha según cuánto texto lleva: poco texto, columna angosta e imagen grande. */
const anchoColumna = computed(() => {
  if (hayPuntos.value) return '24rem';
  const n = props.largoLateral;
  return n < 500 ? '20rem' : n < 1200 ? '26rem' : '32rem';
});
const claseRecuadro = computed(() =>
  props.lateralCristal ? 'cristal-portada' : 'bg-card border shadow-sm',
);
</script>

<template>
  <figure :id="`bloque-${bloque.id}`" data-testid="bloque-imagen" :data-apilado="apilado">
    <div
      v-if="!fallo"
      class="grid items-start gap-5"
      :class="conColumna ? 'lg:grid-cols-[minmax(0,1fr)_var(--columna)]' : ''"
      :style="{ '--columna': anchoColumna }"
    >
      <!-- Columna de la imagen -->
      <div class="min-w-0 space-y-2">
        <!-- Secuencia -->
        <div
          v-if="secuencia.length > 0 && pasoActual"
          class="space-y-3"
          data-testid="imagen-secuencia"
        >
          <img
            :key="pasoActual.src"
            :src="pasoActual.src"
            :alt="pasoActual.alt"
            :width="pasoActual.ancho"
            :height="pasoActual.alto"
            decoding="async"
            class="imagen-ajustada bg-card mx-auto block rounded-lg border"
            style="--alto-max: calc(100dvh - 14rem)"
            @error="fallo = true"
          />
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="hover:bg-accent focus-visible:ring-ring flex size-10 shrink-0 items-center justify-center rounded-full border outline-none focus-visible:ring-2 disabled:opacity-40"
              :disabled="paso === 0"
              aria-label="Imagen anterior"
              @click="paso--"
            >
              <ChevronLeft class="size-5" aria-hidden="true" />
            </button>
            <ol
              class="flex min-w-0 flex-1 flex-wrap justify-center gap-2"
              aria-label="Pasos de la secuencia"
            >
              <li v-for="(s, i) in secuencia" :key="s.src">
                <button
                  type="button"
                  class="focus-visible:ring-ring rounded-full border px-3 py-1.5 text-sm outline-none focus-visible:ring-2"
                  :class="
                    i === paso
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-accent'
                  "
                  :aria-current="i === paso ? 'step' : undefined"
                  @click="paso = i"
                >
                  {{ i + 1 }}. {{ s.etiqueta }}
                </button>
              </li>
            </ol>
            <button
              type="button"
              class="hover:bg-accent focus-visible:ring-ring flex size-10 shrink-0 items-center justify-center rounded-full border outline-none focus-visible:ring-2 disabled:opacity-40"
              :disabled="paso === secuencia.length - 1"
              aria-label="Imagen siguiente"
              @click="paso++"
            >
              <ChevronRight class="size-5" aria-hidden="true" />
            </button>
          </div>
          <p class="sr-only" aria-live="polite">
            Imagen {{ paso + 1 }} de {{ secuencia.length }}: {{ pasoActual.etiqueta }}
          </p>
        </div>

        <!-- Pareja: dos imágenes lado a lado -->
        <div
          v-else-if="bloque.pareja"
          class="grid items-start gap-5 md:grid-cols-2"
          data-testid="imagen-pareja"
        >
          <div class="space-y-2">
            <img
              :src="bloque.figura ?? bloque.src"
              :alt="bloque.alt"
              :width="bloque.ancho"
              :height="bloque.alto"
              loading="lazy"
              decoding="async"
              class="imagen-ajustada bg-card mx-auto block rounded-lg border"
              @error="fallo = true"
            />
            <p class="text-muted-foreground text-center text-sm">
              <TextoRico :texto="bloque.pie" modo="linea" />
            </p>
          </div>
          <div class="space-y-2">
            <img
              :src="bloque.pareja.src"
              :alt="bloque.pareja.alt"
              :width="bloque.pareja.ancho"
              :height="bloque.pareja.alto"
              loading="lazy"
              decoding="async"
              class="imagen-ajustada bg-card mx-auto block rounded-lg border"
              @error="fallo = true"
            />
            <p class="text-muted-foreground text-center text-sm">
              <TextoRico :texto="bloque.pareja.pie" modo="linea" />
            </p>
          </div>
        </div>

        <!-- Imagen con letreros tocables: el contenedor mide lo mismo que la imagen, así los puntos caen en su sitio -->
        <div v-else-if="hayPuntos" class="text-center" data-testid="imagen-puntos">
          <div class="relative inline-block max-w-full align-top">
            <img
              :src="bloque.figura ?? bloque.src"
              :alt="bloque.alt"
              :width="bloque.ancho"
              :height="bloque.alto"
              loading="lazy"
              decoding="async"
              class="imagen-ajustada bg-card block rounded-lg border"
              @error="fallo = true"
            />
            <button
              v-for="(p, i) in puntos"
              :key="p.id"
              type="button"
              class="focus-visible:ring-ring absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold shadow-md ring-2 ring-black/20 transition outline-none focus-visible:ring-2 sm:size-7 sm:text-xs"
              :class="[
                activo === i
                  ? 'bg-primary text-primary-foreground scale-110'
                  : vistos.has(i)
                    ? 'bg-primary/70 text-primary-foreground'
                    : bloqueado(i)
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary text-primary-foreground animate-pulse',
              ]"
              :style="{ left: `${p.x}%`, top: `${p.y}%` }"
              :aria-label="`${i + 1}. ${p.etiqueta}${bloqueado(i) ? ' (abre antes el anterior)' : ''}`"
              :aria-pressed="activo === i"
              :aria-disabled="bloqueado(i)"
              :data-testid="`punto-${p.id}`"
              @click="abrir(i)"
            >
              {{ i + 1 }}
            </button>
          </div>
        </div>

        <!-- Imagen sola -->
        <img
          v-else
          :src="bloque.figura ?? bloque.src"
          :alt="bloque.alt"
          :width="bloque.ancho"
          :height="bloque.alto"
          loading="lazy"
          decoding="async"
          class="imagen-ajustada bg-card mx-auto block rounded-lg border"
          :style="apilado ? { '--alto-max': 'calc(100dvh - 17rem)' } : undefined"
          @error="fallo = true"
        />

        <figcaption class="text-muted-foreground text-center text-sm">
          <TextoRico v-if="!bloque.pareja" :texto="bloque.pie" modo="linea" />
          <span v-if="bloque.credito" class="block text-xs">Fuente: {{ bloque.credito }}</span>
        </figcaption>
      </div>

      <!-- Columna derecha (o debajo, si va apilado): el texto que acompaña y los letreros -->
      <div
        v-if="hayLateral || hayPuntos"
        class="min-w-0 space-y-3 lg:sticky lg:top-20"
        :class="
          apilado ? '' : 'lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain'
        "
      >
        <div
          v-if="hayLateral"
          class="rounded-2xl p-5"
          :class="[claseRecuadro, apilado ? 'lg:max-h-[16rem] lg:overflow-y-auto' : '']"
          data-testid="texto-lateral"
        >
          <slot name="lateral" />
        </div>

        <template v-if="hayPuntos">
          <!-- Los mismos puntos por nombre: más fáciles de tocar en un teléfono -->
          <div class="flex flex-wrap gap-2" role="group" :aria-label="`Letreros de: ${bloque.pie}`">
            <button
              v-for="(p, i) in puntos"
              :key="p.id"
              type="button"
              class="focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-sm transition outline-none focus-visible:ring-2"
              :class="
                activo === i
                  ? 'bg-primary text-primary-foreground border-primary'
                  : bloqueado(i)
                    ? 'text-muted-foreground cursor-not-allowed opacity-60'
                    : 'bg-card hover:bg-accent'
              "
              :aria-pressed="activo === i"
              :aria-disabled="bloqueado(i)"
              @click="abrir(i)"
            >
              <Lock v-if="bloqueado(i)" class="size-3.5 shrink-0" aria-hidden="true" />
              <Check
                v-else-if="vistos.has(i) && activo !== i"
                class="size-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{{ i + 1 }}. {{ p.etiqueta }}</span>
            </button>
          </div>
          <div
            class="bg-card min-h-16 rounded-lg border p-4"
            aria-live="polite"
            data-testid="recuadro-punto"
          >
            <template v-if="puntoActivo">
              <p class="text-primary font-semibold">{{ puntoActivo.etiqueta }}</p>
              <TextoRico
                :texto="puntoActivo.markdown"
                class="mt-1 text-justify text-sm leading-relaxed hyphens-auto"
              />
            </template>
            <p v-else class="text-muted-foreground text-sm">
              {{
                bloque.en_orden
                  ? 'Toca los puntos en orden, empezando por el 1, para leer cada uno.'
                  : 'Toca cada letrero de la imagen para leer su descripción.'
              }}
            </p>
          </div>
        </template>
      </div>
    </div>
    <div
      v-else
      role="img"
      :aria-label="bloque.alt"
      class="bg-muted text-muted-foreground mx-auto flex max-w-2xl items-start gap-3 rounded-lg border border-dashed p-4"
      data-testid="imagen-caida"
    >
      <ImageOff class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p class="text-sm">No pudimos cargar la imagen. Lo que muestra: {{ bloque.alt }}</p>
    </div>
  </figure>
</template>

<style scoped>
/* La imagen nunca se sale de la pantalla: cabe a lo ancho de su columna y en la altura de la ventana (descontando la
   barra superior y su pie), sin deformarse. */
.imagen-ajustada {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: var(--alto-max, calc(100dvh - 9rem));
}
</style>
