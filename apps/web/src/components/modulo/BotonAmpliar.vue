<script setup lang="ts">
/**
 * Botón en la esquina superior derecha de una imagen que la abre a pantalla completa (indicación de la usuaria,
 * 2026-10-29). Va dentro de un contenedor `relative` del tamaño de la imagen. La vista ampliada es un `<dialog>`
 * modal nativo: atrapa el foco, se cierra con Esc, con el botón «Cerrar» o tocando fuera de la imagen, y devuelve el
 * foco al botón que la abrió.
 */
import { ref } from 'vue';
import { Maximize2, X } from '@lucide/vue';

const props = defineProps<{ src: string; alt: string; pie?: string }>();

const dialogo = ref<HTMLDialogElement | null>(null);

function abrir(): void {
  dialogo.value?.showModal?.();
}
function cerrar(): void {
  dialogo.value?.close?.();
}
/** Un clic en el fondo (fuera de la imagen y del pie) lo cierra. */
function alPulsarFondo(e: MouseEvent): void {
  if (e.target === e.currentTarget) cerrar();
}
</script>

<template>
  <button
    type="button"
    class="bg-background/85 text-foreground hover:bg-background focus-visible:ring-ring absolute top-2 right-2 z-10 flex size-9 items-center justify-center rounded-full border shadow-md backdrop-blur outline-none focus-visible:ring-2"
    :aria-label="`Ampliar imagen: ${props.alt}`"
    title="Ver a pantalla completa"
    data-testid="ampliar-imagen"
    @click.stop="abrir"
  >
    <Maximize2 class="size-4" aria-hidden="true" />
  </button>
  <dialog
    ref="dialogo"
    class="imagen-ampliada m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent p-0"
    :aria-label="props.alt"
    data-testid="imagen-ampliada"
    @click="alPulsarFondo"
  >
    <div
      class="flex size-full flex-col items-center justify-center gap-3 p-4 sm:p-8"
      @click="alPulsarFondo"
    >
      <img
        :src="props.src"
        :alt="props.alt"
        class="max-h-[calc(100dvh-6rem)] max-w-full rounded-lg bg-white object-contain shadow-2xl"
      />
      <p v-if="props.pie" class="max-w-3xl text-center text-sm text-white/90">{{ props.pie }}</p>
    </div>
    <button
      type="button"
      class="focus-visible:ring-ring absolute top-4 right-4 flex min-h-11 items-center gap-2 rounded-full bg-white px-4 font-semibold text-black shadow-lg outline-none focus-visible:ring-2"
      data-testid="cerrar-imagen-ampliada"
      autofocus
      @click="cerrar"
    >
      <X class="size-5" aria-hidden="true" />
      Cerrar
    </button>
  </dialog>
</template>

<style scoped>
.imagen-ampliada::backdrop {
  background: rgb(0 0 0 / 0.88);
}
</style>
