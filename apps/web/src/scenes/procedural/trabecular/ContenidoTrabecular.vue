<script setup lang="ts">
/**
 * Contenido 3D de la escena del hueso trabecular (dentro del <TresCanvas>): el cubo que envejece y, a su
 * izquierda, el cubo joven fantasma de la comparación. No tiene estado propio: cada vez que cambia `t` calcula
 * `estadoTrabecular(t)` (función pura) y se lo pasa a los dos cubos, que solo recolocan, colorean y aclaran
 * piezas. Al desmontar libera todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { X_FANTASMA, estadoTrabecular } from './estado';
import { CuboTrabecular } from './mallas';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const cubo = new CuboTrabecular({ fantasma: false });
const fantasma = new CuboTrabecular({ fantasma: true });
fantasma.grupo.position.x = X_FANTASMA;

const grupo = new Group();
grupo.name = 'hueso_trabecular_tiempo';
grupo.add(cubo.grupo, fantasma.grupo);

function dibujar(t: number): void {
  const estado = estadoTrabecular(t);
  cubo.actualizar(estado);
  fantasma.actualizar(estado);
  invalidate();
}

watch(() => props.t, dibujar, { immediate: true });

onBeforeUnmount(() => {
  grupo.remove(cubo.grupo, fantasma.grupo);
  cubo.liberar();
  fantasma.liberar();
});
</script>

<template>
  <primitive :object="grupo" />
</template>
