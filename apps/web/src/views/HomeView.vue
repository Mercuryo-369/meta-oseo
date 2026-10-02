<script setup lang="ts">
/**
 * Inicio de las rutas autenticadas: introducción y tarjetas de los seis módulos.
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
import { ArrowRight, Award, Box, CircleCheck, CircleDot, Eye, Lock, Trophy } from '@lucide/vue';
import OsteonaIlustracion from '@/components/OsteonaIlustracion.vue';
import { useRefuerzoStore } from '@/ai/refuerzo';
import TarjetaRefuerzo from '@/components/mentor/TarjetaRefuerzo.vue';
import SelectorNivel from '@/components/nivel/SelectorNivel.vue';
import PortadaModulo from '@/components/modulo/PortadaModulo.vue';
import RotuloModulo from '@/components/modulo/RotuloModulo.vue';
import { estadoDeTarjeta, estiloAcento, textoEstadoTarjeta } from '@/components/modulo/identidad';
import type { EstadoTarjeta } from '@/components/modulo/identidad';
import { useAccesoModulos } from '@/components/modulo/useAccesoModulos';
import { Button } from '@/components/ui/button';
import { MODULOS } from '@/data/modulos';
import { useAuthStore } from '@/stores/auth';
import { useContextoStore } from '@/stores/contextoPedagogico';
import { useProgresoStore } from '@/stores/progreso';

const auth = useAuthStore();
const progreso = useProgresoStore();
const refuerzo = useRefuerzoStore();
const contexto = useContextoStore();
const { esDocente, bloqueoSecuencial } = useAccesoModulos();

const nombre = computed(() => auth.usuario?.nombre ?? '');
const completados = computed(() => progreso.modulosCompletados.length);
const recorridoCompleto = computed(() => completados.value >= MODULOS.length);

/** Módulos con avance guardado (sección actual o tiempo) y sin completar. */
const enCurso = computed(() =>
  progreso.modulos
    .filter((m) => !m.completado && (m.seccion_actual !== null || m.tiempo_total_seg > 0))
    .map((m) => m.modulo),
);
/** Mientras llega el progreso no se muestra un estado que luego cambiaría (parpadeo del candado). */
const cargandoProgreso = computed(() => progreso.loading && !progreso.loaded);

function estadoDe(numero: number): EstadoTarjeta {
  return estadoDeTarjeta(numero, {
    completados: progreso.modulosCompletados,
    enCurso: enCurso.value,
    bloqueoSecuencial: bloqueoSecuencial.value,
  });
}

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
    class="mx-auto w-full max-w-5xl px-4 pt-6 pb-[max(7rem,calc(var(--area-segura-abajo)+6rem))] md:pt-10 md:pb-10"
  >
    <section class="grid items-center gap-6 md:grid-cols-[1fr_auto] md:gap-12">
      <div class="space-y-4">
        <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Hola, {{ nombre }}</h1>
        <p class="max-w-prose text-lg leading-relaxed">
          Seis módulos te llevan de la célula al hueso: cómo se forma, se mineraliza, se renueva y
          envejece, con la mandíbula como ejemplo.
        </p>
        <p class="text-muted-foreground max-w-prose">
          Para avanzar tendrás que actuar: explorar capas, relacionar conceptos y responder
          preguntas. Si algo no queda claro, pregúntale al mentor con el botón de chat.
        </p>
      </div>
      <OsteonaIlustracion class="hidden w-52 md:block" />
    </section>

    <!-- «Para reforzar» (F3-07): solo aparece si hay algo que repasar. -->
    <div v-if="refuerzo.sugerencias.length > 0" class="mt-8">
      <TarjetaRefuerzo :sugerencias="refuerzo.sugerencias" :limite="4" />
    </div>

    <section aria-labelledby="titulo-modulos" class="mt-8 md:mt-12">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="titulo-modulos" class="text-2xl font-semibold">Módulos</h2>
        <p class="text-muted-foreground text-sm">
          {{ completados }} de {{ MODULOS.length }} completados
        </p>
      </div>

      <p
        v-if="esDocente"
        class="bg-accent text-accent-foreground mt-4 flex items-start gap-2 rounded-md px-3 py-2 text-sm"
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
        class="bg-accent text-accent-foreground mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm"
      >
        <span>{{ progreso.error }}</span>
        <Button variant="outline" size="sm" @click="progreso.load({ force: true })">
          Reintentar
        </Button>
      </p>

      <ol
        role="list"
        class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        :aria-busy="cargandoProgreso ? 'true' : undefined"
      >
        <li
          v-for="m in MODULOS"
          :key="m.numero"
          class="flex"
          :style="estiloAcento(m.numero)"
          data-testid="tarjeta-modulo"
          :data-modulo="m.numero"
          :data-estado="cargandoProgreso ? 'cargando' : estadoDe(m.numero)"
        >
          <RouterLink
            :to="{ name: 'modulo', params: { n: m.numero } }"
            class="bg-card hover:border-acento focus-visible:border-acento group flex w-full flex-col overflow-hidden rounded-xl border transition-colors"
            :class="!cargandoProgreso && estadoDe(m.numero) === 'bloqueado' ? 'border-dashed' : ''"
          >
            <span class="relative block">
              <PortadaModulo
                :numero="m.numero"
                class="aspect-[16/9] w-full rounded-none border-0 border-b"
                :class="
                  !cargandoProgreso && estadoDe(m.numero) === 'bloqueado'
                    ? 'opacity-75 saturate-50'
                    : ''
                "
              />
              <span
                v-if="!cargandoProgreso && estadoDe(m.numero) === 'bloqueado'"
                class="bg-background text-foreground absolute top-2 right-2 grid size-8 place-items-center rounded-full border shadow-xs"
                aria-hidden="true"
                data-testid="insignia-bloqueado"
              >
                <Lock class="size-4" />
              </span>
              <span
                v-else-if="!cargandoProgreso && estadoDe(m.numero) === 'completado'"
                class="bg-success-soft text-success absolute top-2 right-2 grid size-8 place-items-center rounded-full border shadow-xs"
                aria-hidden="true"
                data-testid="insignia-completado"
              >
                <CircleCheck class="size-4" />
              </span>
            </span>

            <span class="flex flex-1 flex-col gap-2 p-4">
              <span class="flex items-start gap-3">
                <span
                  class="bg-acento text-acento-sobre flex size-10 shrink-0 items-center justify-center rounded-full font-serif text-xl font-semibold"
                  aria-hidden="true"
                >
                  {{ m.numero }}
                </span>
                <span class="block min-w-0 font-serif text-lg leading-snug font-semibold">
                  <span class="sr-only">Módulo {{ m.numero }}: </span>{{ m.titulo }}
                </span>
              </span>
              <RotuloModulo :numero="m.numero" class="self-start" />
              <span class="text-muted-foreground block text-sm leading-snug">{{ m.foco }}</span>
              <span class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm">
                <span
                  v-if="m.densidad === 'alta'"
                  class="text-accent-foreground bg-accent rounded-full px-2 py-0.5"
                >
                  Densidad alta
                </span>
                <template v-if="!cargandoProgreso">
                  <span
                    v-if="estadoDe(m.numero) === 'bloqueado'"
                    class="text-foreground inline-flex items-center gap-1 font-medium"
                    data-testid="estado-modulo"
                  >
                    <Lock class="size-4" aria-hidden="true" />
                    {{ textoEstadoTarjeta('bloqueado', m.numero) }}
                  </span>
                  <span
                    v-else-if="estadoDe(m.numero) === 'completado'"
                    class="text-success inline-flex items-center gap-1 font-medium"
                    data-testid="estado-modulo"
                  >
                    <CircleCheck class="size-4" aria-hidden="true" />
                    {{ textoEstadoTarjeta('completado', m.numero) }}
                  </span>
                  <span
                    v-else-if="estadoDe(m.numero) === 'en_curso'"
                    class="text-acento inline-flex items-center gap-1 font-medium"
                    data-testid="estado-modulo"
                  >
                    <CircleDot class="size-4" aria-hidden="true" />
                    {{ textoEstadoTarjeta('en_curso', m.numero) }}
                  </span>
                  <span
                    v-else
                    class="text-muted-foreground inline-flex items-center gap-1 font-medium"
                    data-testid="estado-modulo"
                  >
                    <ArrowRight class="size-4" aria-hidden="true" />
                    {{ textoEstadoTarjeta('disponible', m.numero) }}
                  </span>
                </template>
              </span>
            </span>
          </RouterLink>
        </li>
      </ol>
    </section>

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

    <section class="mt-8 md:mt-12">
      <RouterLink
        :to="{ name: 'demo_mandibula' }"
        class="text-primary inline-flex min-h-11 items-center gap-2 font-medium underline-offset-4 hover:underline"
      >
        <Box class="size-4" aria-hidden="true" />
        Demo técnica: mandíbula en 3D (Fase 1)
      </RouterLink>
    </section>
  </div>
</template>
