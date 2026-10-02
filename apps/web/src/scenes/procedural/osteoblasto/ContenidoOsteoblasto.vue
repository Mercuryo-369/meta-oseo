<script setup lang="ts">
/**
 * Contenido 3D de la escena del osteoblasto (dentro del <TresCanvas>): la superficie ósea y la fila celular. No
 * tiene estado propio: cada vez que cambia `t` calcula `estadoOsteoblasto(t)` (función pura) y se lo pasa a las
 * dos piezas, que solo se mueven, se escalan, se colorean o se aclaran. Al desmontar libera todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { estadoOsteoblasto } from './estado';
import { FilaCelular, SuperficieOsea } from './mallas';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const superficie = new SuperficieOsea();
const fila = new FilaCelular();

const grupo = new Group();
grupo.name = 'osteoblasto_celula';
grupo.add(superficie.grupo, fila.grupo);

function dibujar(t: number): void {
  const estado = estadoOsteoblasto(t);
  superficie.actualizar(estado);
  fila.actualizar(estado);
  invalidate();
}

watch(() => props.t, dibujar, { immediate: true });

onBeforeUnmount(() => {
  grupo.remove(superficie.grupo, fila.grupo);
  superficie.liberar();
  fila.liberar();
});
</script>

<template>
  <primitive :object="grupo" />
</template>
