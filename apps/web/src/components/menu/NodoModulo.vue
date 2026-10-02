<script setup lang="ts">
/**
 * Un módulo dentro del menú circular: píldora de 44 px de alto con el nodo (disco SVG con el
 * número, más una insignia de "completado" o "bloqueado") y el título del módulo al lado.
 *
 * Es un enlace real (`<a href="/modulo/n">`, vía RouterLink): se puede abrir con clic
 * derecho o en otra pestaña, y RouterLink pone `aria-current="page"` en el módulo abierto.
 * Un módulo bloqueado TAMBIÉN es un enlace (no un callejón sin salida): lleva a la página del
 * módulo, que se muestra bloqueada en su sitio y explica qué falta y cómo desbloquearlo. Por eso
 * no lleva `aria-disabled`; el candado, el borde discontinuo y el texto oculto dicen que aún no
 * se puede estudiar.
 *
 * El estado nunca se comunica solo con color: activo = disco relleno con doble anillo,
 * completado = insignia con marca de verificación, bloqueado = borde discontinuo e insignia
 * con candado; además el texto oculto lo dice en voz alta.
 */
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { Modulo } from '@/data/modulos';
import type { EstadoModulo } from './estados';

const props = defineProps<{
  modulo: Modulo;
  estado: EstadoModulo;
}>();

const emit = defineEmits<{ elegir: [] }>();

const claseDisco = computed(() => {
  if (props.estado.activo) return 'fill-primary stroke-primary';
  if (props.estado.completado) return 'fill-success-soft stroke-success';
  if (props.estado.bloqueado) return 'fill-muted stroke-muted-foreground';
  return 'fill-card stroke-input';
});

const claseNumero = computed(() => {
  if (props.estado.activo) return 'fill-primary-foreground';
  if (props.estado.completado) return 'fill-success';
  if (props.estado.bloqueado) return 'fill-muted-foreground';
  return 'fill-foreground';
});

const clasePildora = computed(() => {
  if (props.estado.activo) return 'border-primary ring-1 ring-primary';
  if (props.estado.bloqueado) return 'border-dashed border-input hover:bg-muted';
  return 'border-input hover:bg-secondary';
});

const claseTitulo = computed(() => {
  if (props.estado.activo) return 'font-semibold text-primary';
  if (props.estado.bloqueado) return 'font-medium text-muted-foreground';
  return 'font-medium text-card-foreground';
});

/** Un clic normal cierra el menú; los modificadores (nueva pestaña, etc.) lo dejan abierto. */
function alHacerClic(e: MouseEvent): void {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  emit('elegir');
}
</script>

<template>
  <RouterLink
    :to="{ name: 'modulo', params: { n: modulo.numero } }"
    data-nodo-menu
    :data-modulo="modulo.numero"
    :data-bloqueado="estado.bloqueado ? 'true' : undefined"
    class="bg-card box-border flex h-11 min-h-11 w-full items-center rounded-full border text-left shadow-md transition-colors"
    :class="clasePildora"
    @click="alHacerClic"
  >
    <svg
      viewBox="0 0 44 44"
      class="size-[2.625rem] shrink-0"
      aria-hidden="true"
      focusable="false"
      data-testid="nodo-svg"
    >
      <!-- Módulo abierto: anillo exterior y disco interior más pequeño. -->
      <circle
        v-if="estado.activo"
        cx="22"
        cy="22"
        r="20"
        fill="none"
        class="stroke-primary"
        stroke-width="2.5"
      />
      <circle
        cx="22"
        cy="22"
        :r="estado.activo ? 15 : 19"
        :class="claseDisco"
        stroke-width="2"
        :stroke-dasharray="estado.bloqueado && !estado.activo ? '3 3' : undefined"
      />
      <text
        x="22"
        y="22.5"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="18"
        font-weight="700"
        class="font-serif"
        :class="claseNumero"
      >
        {{ modulo.numero }}
      </text>

      <!-- Insignia de completado: círculo con marca de verificación. -->
      <g v-if="estado.completado">
        <circle cx="34" cy="10" r="8" class="fill-success stroke-card" stroke-width="2" />
        <path
          d="M30.4 10.2 L32.9 12.7 L37.6 7.9"
          fill="none"
          class="stroke-background"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
      <!-- Insignia de bloqueado: círculo con candado. -->
      <g v-else-if="estado.bloqueado">
        <circle cx="34" cy="10" r="8" class="fill-muted-foreground stroke-card" stroke-width="2" />
        <rect x="30.6" y="9.2" width="6.8" height="5.2" rx="1.1" class="fill-background" />
        <path
          d="M32.2 9.2 V7.8 a1.8 1.8 0 0 1 3.6 0 V9.2"
          fill="none"
          class="stroke-background"
          stroke-width="1.4"
        />
      </g>
    </svg>

    <span
      class="min-w-0 py-1 pr-3.5 pl-1 text-[13px] leading-tight [overflow-wrap:anywhere] md:text-sm"
    >
      <span :class="claseTitulo">
        <span class="sr-only">Módulo {{ modulo.numero }}: </span>{{ modulo.titulo }}
      </span>
      <span v-if="estado.completado" class="sr-only">, completado</span>
      <span v-if="estado.bloqueado" class="sr-only">
        , bloqueado: completa antes el módulo {{ modulo.numero - 1 }}; el enlace explica qué falta
      </span>
    </span>
  </RouterLink>
</template>
