<script setup lang="ts">
/**
 * Bloque `imagen`: `alt` obligatorio (lo exige el esquema), pie con Markdown de una línea y
 * crédito. Si hay `figura` (la versión realista del dibujo), se muestra esa. Si el archivo no carga, se muestra el texto alternativo en un recuadro para que el
 * contenido no se pierda.
 *
 * Con `puntos` (pedido de la docente: «al tocar cada letrero deberá salir el texto»), cada letrero de la imagen
 * lleva encima un botón numerado y, debajo, una fila con sus nombres; al tocarlo, su texto sale en un recuadro.
 * Con `en_orden`, cada punto se habilita al abrir el anterior.
 *
 * Con `secuencia`, las imágenes se recorren una a una, en grande, con anterior/siguiente y una fila de pasos.
 */
import { computed, ref } from 'vue';
import { Check, ChevronLeft, ChevronRight, ImageOff, Lock } from '@lucide/vue';
import type { BloqueImagen } from '@/content/schema';
import TextoRico from './TextoRico.vue';

const props = defineProps<{ bloque: BloqueImagen }>();

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

const secuencia = computed(() => props.bloque.secuencia ?? []);
const paso = ref(0);
const pasoActual = computed(() => secuencia.value[paso.value]);

function abrir(i: number): void {
  if (bloqueado(i)) return;
  activo.value = i;
  vistos.value = new Set(vistos.value).add(i);
}
</script>

<template>
  <figure :id="`bloque-${bloque.id}`" class="space-y-2" data-testid="bloque-imagen">
    <template v-if="!fallo">
      <div
        v-if="secuencia.length > 0 && pasoActual"
        class="mx-auto w-full max-w-4xl space-y-3"
        data-testid="imagen-secuencia"
      >
        <img
          :key="pasoActual.src"
          :src="pasoActual.src"
          :alt="pasoActual.alt"
          :width="pasoActual.ancho"
          :height="pasoActual.alto"
          decoding="async"
          class="bg-card block h-auto max-h-[75dvh] w-full rounded-lg border object-contain"
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
      <div
        v-else-if="bloque.pareja"
        class="mx-auto grid w-full max-w-5xl items-start gap-4 md:grid-cols-2"
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
            class="bg-card h-auto max-h-[70dvh] w-full rounded-lg border object-contain"
            @error="fallo = true"
          />
          <p class="text-muted-foreground text-sm">
            <TextoRico :texto="bloque.pie" modo="linea" />
          </p>
        </div>
        <figure class="space-y-2">
          <img
            :src="bloque.pareja.src"
            :alt="bloque.pareja.alt"
            :width="bloque.pareja.ancho"
            :height="bloque.pareja.alto"
            loading="lazy"
            decoding="async"
            class="bg-card h-auto max-h-[70dvh] w-full rounded-lg border object-contain"
            @error="fallo = true"
          />
          <figcaption class="text-muted-foreground text-sm">
            <TextoRico :texto="bloque.pareja.pie" modo="linea" />
          </figcaption>
        </figure>
      </div>
      <img
        v-else-if="puntos.length === 0"
        :src="bloque.figura ?? bloque.src"
        :alt="bloque.alt"
        :width="bloque.ancho"
        :height="bloque.alto"
        loading="lazy"
        decoding="async"
        class="bg-card mx-auto h-auto max-h-[70dvh] w-full max-w-2xl rounded-lg border object-contain"
        @error="fallo = true"
      />
      <div v-else class="mx-auto w-full max-w-4xl space-y-3" data-testid="imagen-puntos">
        <div class="relative">
          <img
            :src="bloque.figura ?? bloque.src"
            :alt="bloque.alt"
            :width="bloque.ancho"
            :height="bloque.alto"
            loading="lazy"
            decoding="async"
            class="bg-card block h-auto w-full rounded-lg border"
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
        <!-- Los mismos puntos por nombre: más fáciles de tocar en un teléfono -->
        <div class="flex flex-wrap gap-2" role="group" :aria-label="`Letreros de: ${bloque.pie}`">
          <button
            v-for="(p, i) in puntos"
            :key="p.id"
            type="button"
            class="focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition outline-none focus-visible:ring-2"
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
            <Lock v-if="bloqueado(i)" class="size-3.5" aria-hidden="true" />
            <Check v-else-if="vistos.has(i) && activo !== i" class="size-3.5" aria-hidden="true" />
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
            <TextoRico :texto="puntoActivo.markdown" class="mt-1 text-sm leading-relaxed" />
          </template>
          <p v-else class="text-muted-foreground text-sm">
            {{
              bloque.en_orden
                ? 'Toca los puntos en orden, empezando por el 1, para leer cada uno.'
                : 'Toca cada letrero de la imagen para leer su descripción.'
            }}
          </p>
        </div>
      </div>
    </template>
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
    <figcaption class="text-muted-foreground mx-auto max-w-2xl text-sm">
      <TextoRico v-if="!bloque.pareja" :texto="bloque.pie" modo="linea" />
      <span v-if="bloque.credito" class="block text-xs"> Crédito: {{ bloque.credito }}</span>
    </figcaption>
  </figure>
</template>
