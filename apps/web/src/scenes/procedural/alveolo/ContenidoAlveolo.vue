<script setup lang="ts">
/**
 * Contenido 3D de la escena del alvéolo tras la extracción (dentro del <TresCanvas>): el reborde que se morfa con
 * sus trabéculas y su foramen, la encía, el diente que sale, el alvéolo con sus rellenos y el conducto mandibular.
 * No tiene estado propio: cada vez que cambia `t` calcula `estadoAlveolo(t)` (función pura) y se lo pasa a las
 * piezas, que solo escriben, mueven, aclaran o tiñen. Al desmontar libera todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { estadoAlveolo } from './estado';
import { Alveolo, Conducto, Diente, Encia, Reborde } from './mallas';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const piezas = [new Reborde(), new Encia(), new Diente(), new Alveolo(), new Conducto()];

const grupo = new Group();
grupo.name = 'alveolo_postextraccion';
for (const pieza of piezas) grupo.add(pieza.grupo);

function dibujar(t: number): void {
  const estado = estadoAlveolo(t);
  for (const pieza of piezas) pieza.actualizar(estado);
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
