<script setup lang="ts">
/**
 * Logros (F5-04): cuadrícula del catálogo de `GET /api/achievements` con lo obtenido (y su fecha)
 * y lo pendiente, más el siguiente logro destacado. Estados de carga, error y catálogo vacío.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { LoaderCircle, PartyPopper, RefreshCw, Target, TriangleAlert } from '@lucide/vue';
import TarjetaLogro from '@/components/logros/TarjetaLogro.vue';
import { Button, buttonVariants } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { obtenerLogros } from '@/lib/certificado';
import { cn } from '@/lib/utils';
import type { Logro } from '@/types/api';

const logros = ref<Logro[] | null>(null);
const cargando = ref(true);
const error = ref<string | null>(null);

let cancelar: AbortController | null = null;

const obtenidos = computed(() => (logros.value ?? []).filter((l) => l.obtenido).length);
const total = computed(() => logros.value?.length ?? 0);
/** Primer logro del catálogo aún pendiente. */
const siguiente = computed<Logro | null>(
  () => (logros.value ?? []).find((l) => !l.obtenido) ?? null,
);

async function cargar(): Promise<void> {
  cancelar?.abort();
  const control = new AbortController();
  cancelar = control;
  cargando.value = true;
  error.value = null;
  try {
    const datos = await obtenerLogros(control.signal);
    if (control.signal.aborted) return;
    logros.value = datos.logros;
  } catch (e) {
    if (control.signal.aborted) return;
    error.value =
      e instanceof ApiError ? e.message : 'No pudimos cargar tus logros. Inténtalo de nuevo.';
  } finally {
    if (cancelar === control) cargando.value = false;
  }
}

onMounted(() => {
  void cargar();
});
onBeforeUnmount(() => cancelar?.abort());
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-4 py-6 md:py-10">
    <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Mis logros</h1>
    <p class="text-muted-foreground mt-2 max-w-prose">
      Cada logro reconoce un paso de tu recorrido. Los obtenidos llevan la fecha en que los
      conseguiste.
    </p>

    <p
      v-if="cargando && !logros"
      role="status"
      class="text-muted-foreground mt-8 flex items-center gap-2"
      data-testid="logros-cargando"
    >
      <LoaderCircle class="size-5 motion-safe:animate-spin" aria-hidden="true" />
      Cargando tus logros…
    </p>

    <div
      v-else-if="error && !logros"
      role="alert"
      class="bg-accent text-accent-foreground mt-8 space-y-3 rounded-xl border p-4"
      data-testid="logros-error"
    >
      <p class="flex items-start gap-2">
        <TriangleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span>{{ error }}</span>
      </p>
      <Button variant="outline" data-testid="logros-reintentar" @click="cargar">
        <RefreshCw aria-hidden="true" />
        Reintentar
      </Button>
    </div>

    <template v-else-if="logros">
      <p
        v-if="total === 0"
        class="text-muted-foreground bg-muted mt-8 rounded-xl p-4"
        data-testid="logros-vacio"
      >
        Todavía no hay logros disponibles. Vuelve más tarde.
      </p>

      <template v-else>
        <p class="mt-6 font-medium tabular-nums" data-testid="logros-resumen">
          {{ obtenidos }} de {{ total }} logros obtenidos
        </p>

        <section
          v-if="siguiente"
          aria-labelledby="titulo-siguiente-logro"
          class="bg-accent text-accent-foreground border-eosina mt-4 flex items-start gap-3 rounded-xl border p-4"
          data-testid="siguiente-logro"
        >
          <Target class="text-eosina mt-0.5 size-6 shrink-0" aria-hidden="true" />
          <div class="space-y-1">
            <h2 id="titulo-siguiente-logro" class="font-serif text-lg font-semibold">
              Tu siguiente logro: {{ siguiente.nombre }}
            </h2>
            <p>{{ siguiente.descripcion }}</p>
          </div>
        </section>
        <p
          v-else
          class="bg-success-soft text-foreground mt-4 flex items-center gap-2 rounded-xl border p-4 font-medium"
          data-testid="logros-completos"
        >
          <PartyPopper class="text-success size-6 shrink-0" aria-hidden="true" />
          ¡Conseguiste todos los logros!
        </p>

        <h2 class="sr-only">Catálogo de logros</h2>
        <ul
          role="list"
          class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="lista-logros"
        >
          <TarjetaLogro
            v-for="logro in logros"
            :key="logro.codigo"
            :logro="logro"
            :siguiente="siguiente?.codigo === logro.codigo"
          />
        </ul>
      </template>

      <p
        v-if="error"
        role="alert"
        class="text-accent-foreground mt-4 flex flex-wrap items-center gap-2 text-sm"
        data-testid="logros-error-recarga"
      >
        {{ error }}
        <Button variant="outline" size="sm" @click="cargar">Reintentar</Button>
      </p>
    </template>

    <RouterLink :to="{ name: 'inicio' }" :class="cn(buttonVariants({ variant: 'ghost' }), 'mt-8')">
      Volver al inicio
    </RouterLink>
  </div>
</template>
