<script setup lang="ts">
/**
 * Contenido 3D de la escena de la fractura (dentro del <TresCanvas>): el hueso fracturado y los tejidos de la
 * reparación. No tiene estado propio: cada vez que cambia `t` (o se abre o cierra la cuña) calcula
 * `estadoFractura(t)` (función pura) y se lo pasa a las dos partes, que solo colocan, escalan y colorean
 * piezas. Al desmontar libera todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { estadoFractura } from './estado';
import { HuesoFracturado, Reparacion } from './mallas';

const props = defineProps<{
  t: number;
  /** Con `true` la cuña está abierta: se ve el interior de la diáfisis (vistas `corte` y `detalle`). */
  abierta: boolean;
}>();

const { invalidate } = useTres();

const hueso = new HuesoFracturado();
const reparacion = new Reparacion();

const grupo = new Group();
grupo.name = 'reparacion_fractura';
grupo.add(hueso.grupo, reparacion.grupo);

function dibujar(): void {
  const estado = estadoFractura(props.t);
  hueso.actualizar(estado, props.abierta);
  reparacion.actualizar(estado, props.abierta);
  invalidate();
}

watch(() => [props.t, props.abierta] as const, dibujar, { immediate: true });

onBeforeUnmount(() => {
  grupo.remove(hueso.grupo, reparacion.grupo);
  hueso.liberar();
  reparacion.liberar();
});
</script>

<template>
  <primitive :object="grupo" />
</template>
