<script setup lang="ts">
/**
 * Contenido 3D de la escena del osteocito (dentro del <TresCanvas>): el bloque de matriz, la red celular, la
 * dinámica (líquido, sensores, esclerostina, señal) y la superficie. No tiene estado propio: cada vez que
 * cambia `t` calcula `estadoOsteocito(t)` (función pura) y se lo pasa a las piezas, que solo colocan, escalan y
 * aclaran. La compresión del bloque es un simple encogimiento en Y de todo el grupo. Al desmontar libera todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { COMPRESION_MAXIMA, estadoOsteocito } from './estado';
import { crearPiezas } from './mallas';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const piezas = crearPiezas();
const grupo = new Group();
grupo.name = 'osteocito_red';
for (const pieza of piezas) grupo.add(pieza.grupo);

function dibujar(t: number): void {
  const estado = estadoOsteocito(t);
  for (const pieza of piezas) pieza.actualizar(estado);
  grupo.scale.y = 1 - COMPRESION_MAXIMA * estado.compresion;
  invalidate();
}

watch(() => props.t, dibujar, { immediate: true });

onBeforeUnmount(() => {
  for (const pieza of piezas) {
    grupo.remove(pieza.grupo);
    pieza.liberar();
  }
});
</script>

<template>
  <primitive :object="grupo" />
</template>
