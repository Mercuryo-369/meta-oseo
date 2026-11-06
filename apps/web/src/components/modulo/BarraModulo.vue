<script setup lang="ts">
/**
 * Barra superior de cada sección (referencia «Títulos y subtítulos» del documento de la docente, 2026-11-05): una
 * flecha con el número y el título del módulo, que lleva a su portada, y a continuación las secciones como flechas
 * encadenadas (las mismas de la portada, en versión compacta). En móvil, `NavegacionSecciones` muestra su selector.
 */
import { RouterLink } from 'vue-router';
import type { EstadoSeccion } from '@/content/scoring';
import { moduloPorNumero } from '@/data/modulos';
import IconoModulo from './IconoModulo.vue';
import NavegacionSecciones from './NavegacionSecciones.vue';

const props = defineProps<{
  numero: number;
  titulo: string;
  secciones: readonly { id: string; titulo: string }[];
  estados: readonly EstadoSeccion[];
  indice: number;
}>();

const emit = defineEmits<{ ir: [indice: number]; bloqueada: [indice: number] }>();

const identidad = moduloPorNumero(props.numero)?.identidad;
</script>

<template>
  <div class="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0" data-testid="barra-modulo">
    <RouterLink
      :to="{ name: 'modulo', params: { n: numero } }"
      class="flecha-titulo cristal-portada focus-visible:ring-ring flex shrink-0 items-center gap-2.5 py-1.5 pr-8 pl-3 outline-none focus-visible:ring-2 md:w-[18rem] lg:w-[21rem]"
      :title="`Portada del módulo ${numero}`"
      data-testid="enlace-portada"
    >
      <span class="text-primary hidden shrink-0 sm:block" aria-hidden="true">
        <IconoModulo v-if="identidad" :icono="identidad.icono" class="size-7" />
      </span>
      <span class="min-w-0 leading-tight">
        <span class="text-primary block text-xs font-bold">Módulo {{ numero }}</span>
        <span class="line-clamp-2 block text-sm font-semibold">{{ titulo }}</span>
      </span>
    </RouterLink>
    <div class="min-w-0 flex-1 md:-ml-2 md:flex">
      <NavegacionSecciones
        :secciones="secciones"
        :estados="estados"
        :indice="indice"
        :numero-modulo="numero"
        encadenada
        compacta
        @ir="(i: number) => emit('ir', i)"
        @bloqueada="(i: number) => emit('bloqueada', i)"
      />
    </div>
  </div>
</template>

<style scoped>
/* Primera flecha: sin muesca a la izquierda y con la punta a la derecha (encaja con la primera sección). */
.flecha-titulo {
  border-radius: 0.75rem;
}
@media (min-width: 768px) {
  .flecha-titulo {
    clip-path: polygon(0 0, calc(100% - 1rem) 0, 100% 50%, calc(100% - 1rem) 100%, 0 100%);
    border-radius: 0.75rem 0 0 0.75rem;
  }
}
</style>
