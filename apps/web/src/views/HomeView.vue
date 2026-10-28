<script setup lang="ts">
/**
 * Inicio de las rutas autenticadas. Arriba, el saludo y la mandíbula 3D con los seis módulos y el avance de
 * cada uno (`MandibulaModulos`): es el único sitio del inicio que los muestra (antes había además un recorrido
 * de pasos y una cuadrícula de tarjetas con la misma información; la usuaria pidió quitar lo duplicado).
 * Los módulos forman una secuencia (el briefing los ordena de la célula al envejecimiento),
 * por eso van numerados y en una lista ordenada. Cada tarjeta lleva la identidad de su módulo
 * (acento, ilustración de portada, rótulo) y dice su estado con icono Y texto, nunca solo con color:
 * bloqueado («Completa el módulo N para abrirlo»), en curso, completado o listo para empezar. Una
 * tarjeta bloqueada sigue siendo un enlace: lleva a la página del módulo, que explica el bloqueo.
 * El estado usa la misma regla que la página y el menú circular (`estadoDeTarjeta`). La sección
 * «Tu nivel» (`SelectorNivel`) es el único sitio donde se cambia Pregrado / Posgrado.
 */
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { Award, Eye, Trophy } from '@lucide/vue';
import { useRefuerzoStore } from '@/ai/refuerzo';
import TarjetaRefuerzo from '@/components/mentor/TarjetaRefuerzo.vue';
import SelectorNivel from '@/components/nivel/SelectorNivel.vue';
import MandibulaModulos from '@/components/inicio/MandibulaModulos.vue';
import IconoModulo from '@/components/modulo/IconoModulo.vue';
import { useAccesoModulos } from '@/components/modulo/useAccesoModulos';
import { usePasosModulos } from '@/components/modulo/usePasosModulos';
import { Button } from '@/components/ui/button';
import { MODULOS } from '@/data/modulos';
import { useAuthStore } from '@/stores/auth';
import { useContextoStore } from '@/stores/contextoPedagogico';
import { useProgresoStore } from '@/stores/progreso';

const auth = useAuthStore();
const progreso = useProgresoStore();
const refuerzo = useRefuerzoStore();
const contexto = useContextoStore();
const { esDocente } = useAccesoModulos();
const { completados, recorridoCompleto, siguiente, continuar } = usePasosModulos();

const nombre = computed(() => auth.usuario?.nombre ?? '');

onMounted(() => {
  contexto.setSeccion('inicio');
  void progreso.load();
  // Acaba de volver de estudiar: las sugerencias de refuerzo se piden de nuevo (F3-07).
  void refuerzo.cargar({ force: true });
});
</script>

<template>
  <!-- El padding inferior deja el final de la página por encima de los botones flotantes (menú
       circular y mentor) en móvil; el <main> del shell reserva otro tanto. -->
  <div
    class="mx-auto w-full max-w-[96rem] px-4 md:px-8 pt-6 pb-[max(7rem,calc(var(--area-segura-abajo)+6rem))] md:pt-10 md:pb-10"
  >
    <section
      aria-labelledby="titulo-inicio"
      class="fondo-portada relative isolate overflow-hidden rounded-3xl border p-3 shadow-sm md:p-5"
      data-testid="portada-inicio"
    >
      <!-- Fila superior: título -->
      <div class="panel-cristal flex items-center gap-4 rounded-2xl px-4 py-3 lg:max-w-xl">
        <span
          class="border-primary/30 text-primary hidden size-14 shrink-0 items-center justify-center rounded-xl border sm:flex"
          aria-hidden="true"
        >
          <IconoModulo icono="hueso" class="size-9" />
        </span>
        <div class="min-w-0">
          <p class="text-primary text-sm font-bold">Metabolismo óseo</p>
          <h1
            id="titulo-inicio"
            class="text-2xl leading-tight font-semibold tracking-tight md:text-3xl"
          >
            Hola, {{ nombre }}
          </h1>
          <p class="text-foreground/80 mt-0.5 text-base">
            Un viaje interactivo desde la célula hasta el hueso
          </p>
        </div>
      </div>

      <!-- Fila principal: la mandíbula con los seis módulos y su avance -->
      <div class="panel-cristal mt-4 rounded-3xl p-3 md:p-5">
        <div class="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-1">
          <p class="max-w-3xl leading-relaxed">
            Seis módulos te llevan <strong class="text-primary">de la célula al hueso</strong>: cómo
            se forma, se mineraliza, se renueva y envejece, con la
            <strong class="text-primary">mandíbula</strong> como ejemplo. Toca un punto para ver tu
            avance en ese módulo.
          </p>
          <p class="text-muted-foreground text-sm" data-testid="resumen-avance">
            <!-- En pantallas anchas lo dice el círculo central de la mandíbula -->
            <span class="lg:hidden">
              <span class="text-foreground font-semibold">
                {{ completados }} de {{ MODULOS.length }}
              </span>
              módulos completados ·
            </span>
            <template v-if="siguiente">
              Sigue:
              <span class="text-foreground font-medium">Módulo {{ siguiente.numero }}</span>
            </template>
          </p>
        </div>
        <MandibulaModulos />
        <RouterLink
          v-if="continuar"
          :to="continuar.to"
          class="sr-only focus:not-sr-only"
          :aria-label="continuar.texto"
          data-testid="continuar-inicio"
        >
          {{ continuar.texto }}
        </RouterLink>
      </div>
    </section>

    <!-- «Para reforzar» (F3-07): solo aparece si hay algo que repasar. -->
    <div v-if="refuerzo.sugerencias.length > 0" class="mt-8">
      <TarjetaRefuerzo :sugerencias="refuerzo.sugerencias" :limite="4" />
    </div>

    <div class="mt-4 space-y-3">
      <p
        v-if="esDocente"
        class="bg-accent text-accent-foreground flex items-start gap-2 rounded-md px-3 py-2 text-sm"
        role="note"
        data-testid="nota-docente"
      >
        <Eye class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <strong>Vista de docente.</strong> Puedes abrir los seis módulos completos. Mientras
          revisas no se guarda avance, puntaje ni tiempo.
        </span>
      </p>

      <p
        v-if="progreso.error"
        role="status"
        class="bg-accent text-accent-foreground flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm"
      >
        <span>{{ progreso.error }}</span>
        <Button variant="outline" size="sm" @click="progreso.load({ force: true })">
          Reintentar
        </Button>
      </p>
    </div>

    <SelectorNivel />

    <section aria-labelledby="titulo-reconocimiento" class="mt-8 md:mt-12">
      <h2 id="titulo-reconocimiento" class="text-2xl font-semibold">Tu reconocimiento</h2>
      <ul role="list" class="mt-4 grid gap-3 sm:grid-cols-2">
        <li class="flex">
          <RouterLink
            :to="{ name: 'logros' }"
            class="bg-card hover:border-primary focus-visible:border-primary flex min-h-11 w-full items-start gap-3 rounded-xl border p-4 transition-colors"
            data-testid="enlace-logros"
          >
            <Trophy class="text-eosina mt-0.5 size-6 shrink-0" aria-hidden="true" />
            <span class="space-y-1">
              <span class="block font-serif text-lg leading-snug font-semibold">Mis logros</span>
              <span class="text-muted-foreground block text-sm">
                Mira los que ya tienes y cuál es el siguiente.
              </span>
            </span>
          </RouterLink>
        </li>
        <li class="flex">
          <RouterLink
            :to="{ name: 'certificado' }"
            class="bg-card hover:border-primary focus-visible:border-primary flex min-h-11 w-full items-start gap-3 rounded-xl border p-4 transition-colors"
            data-testid="enlace-certificado"
          >
            <Award class="text-eosina mt-0.5 size-6 shrink-0" aria-hidden="true" />
            <span class="space-y-1">
              <span class="block font-serif text-lg leading-snug font-semibold">
                Mi certificado
              </span>
              <span class="text-muted-foreground block text-sm">
                {{
                  recorridoCompleto
                    ? 'Completaste los seis módulos: revisa si ya puedes obtenerlo.'
                    : 'Se obtiene al completar los seis módulos con el puntaje mínimo.'
                }}
              </span>
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
