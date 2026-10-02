<script setup lang="ts">
/**
 * Contenido 3D de la escena de las dos rutas (dentro del <TresCanvas>): el lado intramembranoso a la izquierda y
 * el endocondral a la derecha. No tiene estado propio: cada vez que cambia `t` calcula `estadoDosRutas(t)`
 * (función pura) y se lo pasa a los dos lados, que solo colocan, escalan y colorean piezas. Al desmontar libera
 * todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { estadoDosRutas } from './estado';
import { LadoEndocondral, LadoIntramembranoso } from './mallas';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const izquierda = new LadoIntramembranoso();
const derecha = new LadoEndocondral();

const grupo = new Group();
grupo.name = 'dos_rutas_osificacion';
grupo.add(izquierda.grupo, derecha.grupo);

function dibujar(t: number): void {
  const estado = estadoDosRutas(t);
  izquierda.actualizar(estado);
  derecha.actualizar(estado);
  invalidate();
}

watch(() => props.t, dibujar, { immediate: true });

onBeforeUnmount(() => {
  grupo.remove(izquierda.grupo, derecha.grupo);
  izquierda.liberar();
  derecha.liberar();
});
</script>

<template>
  <primitive :object="grupo" />
</template>
