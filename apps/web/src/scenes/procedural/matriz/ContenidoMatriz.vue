<script setup lang="ts">
/**
 * Contenido 3D de la escena de la matriz ósea (dentro del <TresCanvas>): el fragmento de hueso laminar, las
 * laminillas ampliadas y la fibrilla abierta. No tiene estado propio: cada vez que cambia `t` calcula
 * `estadoMatriz(t)` (función pura) y se lo pasa a las tres escalas, que solo se mueven, se escalan o se
 * aclaran. Al desmontar libera todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { estadoMatriz } from './estado';
import { FibrillaAbierta, FragmentoLaminar, LaminillasAmpliadas } from './mallas';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const fragmento = new FragmentoLaminar();
const laminillas = new LaminillasAmpliadas();
const fibrilla = new FibrillaAbierta();

const grupo = new Group();
grupo.name = 'matriz_osea';
grupo.add(fragmento.grupo, laminillas.grupo, fibrilla.grupo);

function dibujar(t: number): void {
  const estado = estadoMatriz(t);
  fragmento.actualizar(estado);
  laminillas.actualizar(estado);
  fibrilla.actualizar(estado);
  invalidate();
}

watch(() => props.t, dibujar, { immediate: true });

onBeforeUnmount(() => {
  grupo.remove(fragmento.grupo, laminillas.grupo, fibrilla.grupo);
  fragmento.liberar();
  laminillas.liberar();
  fibrilla.liberar();
});
</script>

<template>
  <primitive :object="grupo" />
</template>
