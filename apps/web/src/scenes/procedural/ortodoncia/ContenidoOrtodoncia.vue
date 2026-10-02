<script setup lang="ts">
/**
 * Contenido 3D de la escena del movimiento ortodóntico (dentro del <TresCanvas>): el bloque de proceso alveolar
 * con su encía, el diente, el alvéolo (ligamento, lámina, hueso nuevo), las células y la fuerza. No tiene estado
 * propio: cada vez que cambia `t` calcula `estadoOrtodoncia(t)` (función pura) y se lo pasa a las piezas, que
 * solo recolocan vértices, se mueven o cambian de color. Al desmontar libera todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { estadoOrtodoncia } from './estado';
import { Alveolo, BloqueAlveolar, Celulas, Diente, Fuerza } from './mallas';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const piezas = [new BloqueAlveolar(), new Alveolo(), new Diente(), new Celulas(), new Fuerza()];

const grupo = new Group();
grupo.name = 'movimiento_ortodontico';
for (const pieza of piezas) grupo.add(pieza.grupo);

function dibujar(t: number): void {
  const estado = estadoOrtodoncia(t);
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
