<script setup lang="ts">
/**
 * Bloque `escenarios`: el estudiante elige uno de varios escenarios y ve su contenido (rutas e imagen). Es la
 * «Actividad: Interactiva» de la 3.2 del documento de la docente («El usuario selecciona uno de los cuatro
 * escenarios del microambiente óseo»). No puntúa. Botones con `aria-pressed` (alternativa de teclado nativa) y el
 * contenido del elegido en una región `aria-live`. Imagen a la izquierda y texto a la derecha con su barra, como el
 * resto de las vistas.
 */
import { computed, ref } from 'vue';
import type { BloqueEscenarios } from '@/content/schema';
import TextoRico from './TextoRico.vue';

const props = defineProps<{ bloque: BloqueEscenarios }>();

const elegido = ref<number | null>(null);
const escenario = computed(() =>
  elegido.value === null ? null : (props.bloque.escenarios[elegido.value] ?? null),
);
</script>

<template>
  <section
    :id="`bloque-${bloque.id}`"
    class="bg-card space-y-4 rounded-2xl border p-4 sm:p-6"
    :aria-labelledby="`titulo-${bloque.id}`"
    data-testid="bloque-escenarios"
  >
    <header class="space-y-1">
      <h3 :id="`titulo-${bloque.id}`" class="font-serif text-xl font-semibold">
        {{ bloque.titulo }}
      </h3>
      <TextoRico
        :texto="bloque.instrucciones"
        modo="linea"
        class="text-muted-foreground block text-justify"
      />
    </header>

    <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="group" aria-label="Escenarios">
      <button
        v-for="(e, i) in bloque.escenarios"
        :key="e.id"
        type="button"
        class="focus-visible:ring-ring flex min-h-14 flex-col items-start rounded-xl border px-4 py-2.5 text-left outline-none focus-visible:ring-2"
        :class="
          elegido === i ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
        "
        :aria-pressed="elegido === i"
        :data-escenario="e.id"
        @click="elegido = i"
      >
        <span class="text-sm font-semibold">Escenario {{ i + 1 }}. {{ e.etiqueta }}</span>
        <span v-if="e.detalle" class="text-xs opacity-80">{{ e.detalle }}</span>
      </button>
    </div>

    <div aria-live="polite">
      <p v-if="!escenario" class="text-muted-foreground text-sm">
        Elige un escenario para ver qué rutas de señalización se activan o se inhiben.
      </p>
      <div
        v-else
        :key="escenario.id"
        class="grid items-start gap-5"
        :class="escenario.imagen ? 'lg:grid-cols-[fit-content(60%)_minmax(18rem,1fr)]' : ''"
        data-testid="escenario-elegido"
      >
        <img
          v-if="escenario.imagen"
          :src="escenario.imagen"
          :alt="escenario.alt ?? escenario.etiqueta"
          :width="escenario.ancho"
          :height="escenario.alto"
          decoding="async"
          class="bg-background mx-auto block h-auto max-h-[calc(var(--alto-vista,100dvh-3rem)-9rem)] w-auto max-w-full rounded-lg border"
        />
        <div
          class="min-w-0 rounded-xl border p-4 lg:max-h-[calc(var(--alto-vista,100dvh-3rem)-9rem)] lg:overflow-y-auto lg:overscroll-contain"
        >
          <TextoRico
            :texto="escenario.markdown"
            class="text-justify text-base leading-relaxed hyphens-auto"
          />
        </div>
      </div>
    </div>
  </section>
</template>
