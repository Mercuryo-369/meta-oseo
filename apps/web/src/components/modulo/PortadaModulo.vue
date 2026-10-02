<script setup lang="ts">
/**
 * Ilustración de portada de un módulo: uno de los SVG ya producidos (`public/images/m{n}/`) dentro
 * de un recuadro con el acento del módulo. Es decorativa (`alt` vacío, `aria-hidden`): el título y
 * el rótulo dicen lo mismo con palabras. Si la imagen no carga queda el recuadro teñido con el
 * icono del módulo, sin imagen rota. El encuadre lo fija cada módulo (`identidad.portada`): `cubrir`
 * solo para dibujos sin rótulos en los bordes; los que los llevan se muestran enteros (`contener`), con
 * fondo `papel` si el SVG no trae el suyo. Debe ir dentro de un elemento con `estiloAcento(n)`.
 */
import { computed, ref } from 'vue';
import { moduloPorNumero } from '@/data/modulos';
import IconoModulo from './IconoModulo.vue';

/** Fondo claro de los dibujos del proyecto (el papel de las láminas, sea cual sea el tema). */
const FONDO_PAPEL = '#f1edfa';

// `prioritaria`: la portada de la cabecera es lo primero que se ve; se pide ya, sin esperar al desplazamiento.
const props = defineProps<{ numero: number; prioritaria?: boolean }>();
const identidad = computed(() => moduloPorNumero(props.numero)?.identidad);
const fallo = ref(false);
</script>

<template>
  <div
    v-if="identidad"
    class="bg-acento-suave relative isolate overflow-hidden rounded-xl border"
    aria-hidden="true"
    data-testid="portada-modulo"
    :data-modulo="numero"
    :style="identidad.portada.fondo === 'papel' ? { backgroundColor: FONDO_PAPEL } : undefined"
  >
    <IconoModulo
      :icono="identidad.icono"
      class="text-acento absolute top-1/2 left-1/2 size-1/3 -translate-x-1/2 -translate-y-1/2 opacity-40"
    />
    <img
      v-if="!fallo"
      :src="identidad.portada.src"
      alt=""
      :loading="prioritaria ? 'eager' : 'lazy'"
      :fetchpriority="prioritaria ? 'high' : 'auto'"
      decoding="async"
      draggable="false"
      class="relative size-full"
      :class="identidad.portada.ajuste === 'cubrir' ? 'object-cover' : 'object-contain p-1'"
      :style="{ objectPosition: identidad.portada.posicion }"
      @error="fallo = true"
    />
  </div>
</template>
