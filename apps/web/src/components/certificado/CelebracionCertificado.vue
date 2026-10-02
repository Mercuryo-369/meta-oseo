<script setup lang="ts">
/**
 * Celebración sobria al emitir el certificado por primera vez: unas chispas que suben y se
 * desvanecen una sola vez. Es solo decoración (`aria-hidden`, sin foco ni eventos) y no se
 * dibuja si la persona pidió menos movimiento; nada de la pantalla depende de ella.
 */
import { computed } from 'vue';
import { usePreferredReducedMotion } from '@vueuse/core';

const movimiento = usePreferredReducedMotion();
const activa = computed(() => movimiento.value !== 'reduce');

// Posiciones y retardos fijos: la animación es predecible y no requiere azar.
const chispas = [
  { x: 8, retardo: 0, color: 'bg-primary' },
  { x: 20, retardo: 120, color: 'bg-eosina' },
  { x: 33, retardo: 60, color: 'bg-success' },
  { x: 46, retardo: 200, color: 'bg-primary' },
  { x: 58, retardo: 30, color: 'bg-eosina' },
  { x: 70, retardo: 160, color: 'bg-success' },
  { x: 82, retardo: 90, color: 'bg-primary' },
  { x: 92, retardo: 240, color: 'bg-eosina' },
];
</script>

<template>
  <div
    v-if="activa"
    class="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden"
    aria-hidden="true"
    data-testid="celebracion"
  >
    <span
      v-for="(c, i) in chispas"
      :key="i"
      class="celebracion-chispa absolute bottom-0 size-2.5 rounded-full"
      :class="c.color"
      :style="{ left: `${c.x}%`, animationDelay: `${c.retardo}ms` }"
    />
  </div>
</template>

<style scoped>
.celebracion-chispa {
  opacity: 0;
  animation: chispa-sube 1400ms ease-out 1 forwards;
}

@keyframes chispa-sube {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.6);
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-9rem) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .celebracion-chispa {
    animation: none;
  }
}
</style>
