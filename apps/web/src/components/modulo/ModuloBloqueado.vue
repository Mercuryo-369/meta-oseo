<script setup lang="ts">
/**
 * Página de un módulo bloqueado, EN SU SITIO (sin redirigir): el estudiante sigue en la dirección
 * que pidió y ve la presentación del módulo con su identidad (título, subtítulo, apertura,
 * duración, objetivos, acento e ilustración), el panel «Todavía bloqueado» (`PanelBloqueoModulo`)
 * con lo que falta y un botón al módulo que sí puede estudiar. No monta secciones ni actividades:
 * `ModuloView.vue` solo llega aquí cuando `decidirAccesoModulo` dice que no y el contenido ya cargó.
 */
import type { ModuloContenido } from '@/content/schema';
import type { Modulo } from '@/data/modulos';
import CabeceraModulo from './CabeceraModulo.vue';
import { estiloAcento } from './identidad';
import PanelBloqueoModulo from './PanelBloqueoModulo.vue';

defineProps<{
  modulo: ModuloContenido;
  /** Módulo que hay que completar antes (el anterior). */
  requerido: Modulo;
  /** Primer módulo que el estudiante sí puede estudiar. */
  destino: number;
}>();
</script>

<template>
  <div :style="estiloAcento(modulo.numero)" :data-modulo="modulo.numero">
    <CabeceraModulo :modulo="modulo" bloqueado>
      <PanelBloqueoModulo :numero="modulo.numero" :requerido="requerido" :destino="destino" />
    </CabeceraModulo>
  </div>
</template>
