<script setup lang="ts">
/**
 * Requisitos del certificado según `GET /api/certificate/status`: módulos completados (anillo y
 * lista con enlaces a los pendientes), puntaje en las actividades obligatorias frente al umbral y
 * una explicación de qué puntos cuentan. Sin manifiesto de actividades el servidor no da puntaje
 * ni umbral (`null`): solo se exige completar los seis módulos y así se dice.
 */
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { ArrowRight, CircleCheck, Circle } from '@lucide/vue';
import { TOTAL_MODULOS } from '@/config';
import { MODULOS } from '@/data/modulos';
import { formatearPorcentaje, formatearPuntos } from '@/lib/formato';
import type { CertificadoEstado } from '@/types/api';
import AnilloProgreso from './AnilloProgreso.vue';
import BarraPuntaje from './BarraPuntaje.vue';

const props = defineProps<{ estado: CertificadoEstado }>();

const completados = computed(() => new Set(props.estado.modulos_completados));
const hayPuntaje = computed(
  () =>
    props.estado.porcentaje !== null &&
    props.estado.umbral !== null &&
    props.estado.puntaje_obligatorias !== null &&
    props.estado.puntaje_maximo !== null,
);
</script>

<template>
  <div class="space-y-6" data-testid="requisitos">
    <section aria-labelledby="titulo-modulos-cert" class="space-y-3">
      <h2 id="titulo-modulos-cert" class="text-xl font-semibold">1. Completar los seis módulos</h2>
      <div class="flex flex-wrap items-center gap-5">
        <AnilloProgreso
          :valor="estado.modulos_completados.length"
          :maximo="TOTAL_MODULOS"
          etiqueta="Módulos completados"
          unidad="módulos"
        />
        <ol role="list" class="min-w-0 flex-1 basis-64 space-y-1.5" data-testid="lista-modulos">
          <li
            v-for="m in MODULOS"
            :key="m.numero"
            class="flex min-h-11 items-center gap-2 text-sm"
            :data-testid="`requisito-modulo-${m.numero}`"
          >
            <template v-if="completados.has(m.numero)">
              <CircleCheck class="text-success size-5 shrink-0" aria-hidden="true" />
              <span class="min-w-0">
                <span class="sr-only">Módulo {{ m.numero }}: </span>{{ m.titulo }}
                <span class="text-success font-medium"> · Completado</span>
              </span>
            </template>
            <RouterLink
              v-else
              :to="{ name: 'modulo', params: { n: m.numero } }"
              class="hover:bg-accent focus-visible:bg-accent -mx-2 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2"
            >
              <Circle class="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
              <span class="min-w-0 flex-1">
                <span class="sr-only">Módulo {{ m.numero }}: </span>{{ m.titulo }}
                <span class="text-accent-foreground font-medium"> · Pendiente</span>
              </span>
              <span class="text-primary inline-flex shrink-0 items-center gap-1 font-medium">
                Ir<span class="sr-only"> al módulo {{ m.numero }}</span>
                <ArrowRight class="size-4" aria-hidden="true" />
              </span>
            </RouterLink>
          </li>
        </ol>
      </div>
    </section>

    <section aria-labelledby="titulo-puntaje-cert" class="space-y-3">
      <h2 id="titulo-puntaje-cert" class="text-xl font-semibold">2. Alcanzar el puntaje mínimo</h2>
      <template v-if="hayPuntaje">
        <BarraPuntaje :porcentaje="estado.porcentaje!" :umbral="estado.umbral!" />
        <p class="text-sm" data-testid="puntaje-obligatorias">
          Tienes {{ formatearPuntos(estado.puntaje_obligatorias!) }} de
          {{ formatearPuntos(estado.puntaje_maximo!) }} posibles en las actividades obligatorias ({{
            formatearPorcentaje(estado.porcentaje!)
          }}).
          <span v-if="(estado.puntos_faltantes ?? 0) > 0" data-testid="puntos-faltantes">
            Te faltan {{ formatearPuntos(estado.puntos_faltantes!) }} para llegar al mínimo de
            {{ formatearPorcentaje(estado.umbral!) }}.
          </span>
          <span v-else class="text-success font-medium">Ya alcanzaste el mínimo.</span>
        </p>
      </template>
      <p v-else class="text-sm" data-testid="sin-puntaje-minimo">
        Para este certificado no se exige un puntaje mínimo: basta con completar los seis módulos.
      </p>

      <div class="bg-muted/60 space-y-2 rounded-lg border p-4 text-sm" data-testid="explicacion">
        <h3 class="font-serif text-base font-semibold">¿Qué puntos cuentan?</h3>
        <ul class="list-disc space-y-1 pl-5">
          <li>
            Solo cuentan las actividades <strong>obligatorias</strong>, con tu mejor intento en cada
            una. Repetir una actividad puede subir tu puntaje.
          </li>
          <li>
            Las actividades opcionales suman a tu puntaje total ({{
              formatearPuntos(estado.puntaje_total)
            }}
            hasta ahora), pero no compensan una obligatoria mal resuelta.
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
