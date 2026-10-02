<script setup lang="ts">
/**
 * Icono temático de un módulo (uno de Lucide por módulo; el nombre lo fija `data/modulos.ts`).
 * Decorativo: el rótulo que lo acompaña ya dice el tema.
 */
import type { Component } from 'vue';
import { Bone, Gem, Hammer, Hourglass, Microscope, RefreshCw } from '@lucide/vue';
import type { IconoModulo } from '@/data/modulos';

defineProps<{ icono: IconoModulo }>();

const ICONOS: Readonly<Record<IconoModulo, Component>> = {
  hueso: Bone,
  celula: Microscope,
  construccion: Hammer,
  mineral: Gem,
  renovacion: RefreshCw,
  tiempo: Hourglass,
};
</script>

<template>
  <component :is="ICONOS[icono]" aria-hidden="true" />
</template>
