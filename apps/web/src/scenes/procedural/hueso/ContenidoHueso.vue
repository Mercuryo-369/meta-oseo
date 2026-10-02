<script setup lang="ts">
/**
 * Contenido 3D de la escena del hueso (dentro del <TresCanvas>): el hueso largo, el corte transversal y la
 * osteona ampliada. No tiene estado propio: cada vez que cambia `t` calcula `estadoHueso(t)` (función pura) y
 * se lo pasa a las tres escalas, que solo se mueven, se escalan o se aclaran. Al desmontar libera todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { estadoHueso } from './estado';
import { CorteTransversal, HuesoLargo, OsteonaAmpliada } from './mallas';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const hueso = new HuesoLargo();
const corte = new CorteTransversal();
const osteona = new OsteonaAmpliada();

const grupo = new Group();
grupo.name = 'hueso_largo_a_osteona';
grupo.add(hueso.grupo, corte.grupo, osteona.grupo);

function dibujar(t: number): void {
  const estado = estadoHueso(t);
  hueso.actualizar(estado);
  corte.actualizar(estado);
  osteona.actualizar(estado);
  invalidate();
}

watch(() => props.t, dibujar, { immediate: true });

onBeforeUnmount(() => {
  grupo.remove(hueso.grupo, corte.grupo, osteona.grupo);
  hueso.liberar();
  corte.liberar();
  osteona.liberar();
});
</script>

<template>
  <primitive :object="grupo" />
</template>
