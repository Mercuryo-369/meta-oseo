<script setup lang="ts">
/**
 * Rótulo temático del módulo: icono y palabra clave («Mineralización», «Remodelado»…) en una
 * píldora teñida con el acento del módulo. Debe ir dentro de un elemento con `estiloAcento(n)`.
 */
import { computed } from 'vue';
import { moduloPorNumero } from '@/data/modulos';
import IconoModulo from './IconoModulo.vue';

const props = defineProps<{ numero: number }>();
const identidad = computed(() => moduloPorNumero(props.numero)?.identidad);
</script>

<template>
  <span
    v-if="identidad"
    class="bg-acento-suave text-acento inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
    data-testid="rotulo-modulo"
  >
    <IconoModulo :icono="identidad.icono" class="size-3.5" />
    {{ identidad.rotulo }}
  </span>
</template>
