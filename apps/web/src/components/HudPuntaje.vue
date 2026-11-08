<script setup lang="ts">
/**
 * HUD persistente del shell (F1-11): puntaje total, módulo actual y siguiente logro.
 *
 *   móvil       píldora compacta de dos líneas: a la izquierda el puntaje; a la derecha, el
 *               módulo actual arriba y el siguiente logro abajo (con icono en vez de rótulo).
 *   escritorio  barra de una línea con los tres datos y sus rótulos visibles.
 *
 * AppShell lo monta sin props dentro de la cabecera. Al montarse pide el progreso (el store
 * no duplica peticiones: comparte la que ya esté en curso y no repite si ya cargó).
 *
 * Accesibilidad: el número animado es solo visual (`aria-hidden`); el valor real está en
 * texto oculto para lectores de pantalla y los CAMBIOS de puntaje se anuncian por una región
 * `aria-live="polite"` aparte, agrupados y sin repetir la carga inicial.
 */
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { usePreferredReducedMotion } from '@vueuse/core';
import { Award, BookOpen, PartyPopper, RefreshCw, TriangleAlert, Trophy } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { moduloDeLaRuta } from '@/components/menu/estados';
import { useAnuncioPuntaje } from '@/components/hud/useAnuncioPuntaje';
import { precargarGsap } from '@/components/menu/gsapPerezoso';
import { usePuntajeAnimado } from '@/components/hud/usePuntajeAnimado';
import { moduloPorNumero } from '@/data/modulos';
import { useProgresoStore } from '@/stores/progreso';

const progreso = useProgresoStore();
const route = useRoute();

const movimiento = usePreferredReducedMotion();
const reducido = computed(() => movimiento.value === 'reduce');

onMounted(() => {
  void progreso.load();
  // GSAP (contador animado) se descarga aparte y solo si se va a usar.
  if (!reducido.value) void precargarGsap();
});

const puntaje = computed(() => progreso.puntajeTotal);
const cargado = computed(() => progreso.loaded);
const puntajeMostrado = usePuntajeAnimado(puntaje, cargado, reducido);
const anuncio = useAnuncioPuntaje(puntaje, cargado);

// Mientras no haya datos del servidor se muestran los del estado de carga o de error.
// Sin token (modo de desarrollo sin backend) el store no carga ni falla: se ven los valores
// por defecto, que son los correctos para un estudiante nuevo.
const cargando = computed(() => progreso.loading && !progreso.loaded);
const fallo = computed(() => progreso.error !== null && !progreso.loaded);
const sinDatos = computed(() => cargando.value || fallo.value);

const modulo = computed(() => {
  const n = moduloDeLaRuta(route);
  return n === null ? undefined : moduloPorNumero(n);
});
// Fuera de un módulo: "Inicio", o el título de la pantalla (p. ej. la demo 3D).
const rotuloModulo = computed(() => {
  if (modulo.value) return `Módulo ${modulo.value.numero}`;
  return route.name === 'inicio' ? 'Inicio' : (route.meta.titulo ?? 'Inicio');
});

const textoPuntaje = computed(() => {
  if (sinDatos.value) return 'Puntaje total: no disponible';
  const n = puntaje.value;
  return `Puntaje total: ${n} ${n === 1 ? 'punto' : 'puntos'}`;
});

function reintentar(): void {
  void progreso.load({ force: true });
}
</script>

<template>
  <div
    role="group"
    aria-label="Tu progreso"
    :aria-busy="cargando"
    class="bg-card border-border flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-2xl border px-2 py-1 md:w-fit md:max-w-full md:rounded-full md:px-3"
    data-testid="hud"
  >
    <!-- Puntaje -->
    <p
      class="bg-primary text-primary-foreground flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums"
      data-testid="hud-puntaje"
    >
      <Trophy class="size-4" aria-hidden="true" />
      <span
        aria-hidden="true"
        :class="cargando && 'animate-pulse'"
        data-testid="hud-puntaje-visible"
        >{{ sinDatos ? '–' : puntajeMostrado }}</span
      >
      <span aria-hidden="true" class="text-xs font-medium">pts</span>
      <span class="sr-only" data-testid="hud-puntaje-sr">{{ textoPuntaje }}</span>
    </p>

    <div class="min-w-0 flex-1 text-xs leading-snug md:flex md:items-center md:gap-4 md:text-sm">
      <!-- Módulo actual -->
      <p
        class="flex min-w-0 items-center gap-1.5"
        data-testid="hud-modulo"
        :title="modulo ? `${rotuloModulo}: ${modulo.titulo}` : undefined"
      >
        <BookOpen class="text-muted-foreground size-3.5 shrink-0 md:hidden" aria-hidden="true" />
        <span class="text-muted-foreground sr-only md:not-sr-only md:shrink-0">
          Módulo actual:
        </span>
        <span class="min-w-0 truncate">
          <span class="font-semibold">{{ rotuloModulo }}</span
          ><span v-if="modulo" class="text-muted-foreground hidden md:inline">
            · {{ modulo.titulo }}</span
          >
        </span>
      </p>

      <!-- El siguiente logro, desde `lg`: en tableta no cabe al lado del módulo y quedaba debajo de «Mi cuenta». -->
      <span class="bg-border hidden h-4 w-px shrink-0 lg:block" aria-hidden="true" />

      <!-- Siguiente logro, o el estado de carga / error -->
      <p
        v-if="cargando"
        class="text-muted-foreground flex min-w-0 items-center gap-1.5"
        data-testid="hud-cargando"
      >
        <span class="truncate">Cargando tu progreso…</span>
      </p>
      <p
        v-else-if="fallo"
        role="status"
        class="text-accent-foreground flex min-w-0 items-center gap-1.5"
        data-testid="hud-error"
        :title="progreso.error ?? undefined"
      >
        <TriangleAlert class="text-eosina size-3.5 shrink-0" aria-hidden="true" />
        <span class="truncate">Progreso no disponible</span>
        <span class="sr-only">. {{ progreso.error }}</span>
      </p>
      <p
        v-else-if="progreso.siguienteLogro"
        class="hidden min-w-0 items-center gap-1.5 lg:flex"
        data-testid="hud-logro"
        :title="progreso.siguienteLogro.descripcion"
      >
        <Award class="text-eosina size-3.5 shrink-0" aria-hidden="true" />
        <span class="text-muted-foreground sr-only md:not-sr-only md:shrink-0">
          Siguiente logro:
        </span>
        <span class="text-accent-foreground min-w-0 truncate font-medium">
          {{ progreso.siguienteLogro.nombre }}
        </span>
      </p>
      <!-- Con el catálogo vacío no hay nada que afirmar: no se dice que se obtuvieron todos. -->
      <p
        v-else-if="progreso.catalogoLogros.length > 0"
        class="flex min-w-0 items-center gap-1.5"
        data-testid="hud-logros-completos"
      >
        <PartyPopper class="text-success size-3.5 shrink-0 max-md:hidden" aria-hidden="true" />
        <span class="text-success min-w-0 truncate font-medium">Completaste todos los logros</span>
      </p>
    </div>

    <Button v-if="fallo" variant="ghost" size="icon" class="shrink-0" @click="reintentar">
      <RefreshCw aria-hidden="true" />
      <span class="sr-only">Reintentar cargar tu progreso</span>
    </Button>

    <!-- Anuncia los cambios de puntaje sin ruido: regla del composable useAnuncioPuntaje. -->
    <span class="sr-only" aria-live="polite" aria-atomic="true" data-testid="hud-anuncio">{{
      anuncio
    }}</span>
  </div>
</template>
