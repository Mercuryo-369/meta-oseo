<script setup lang="ts">
/**
 * Contenido 3D de la escena de la vesícula de matriz (dentro del <TresCanvas>): el osteoblasto con su membrana,
 * el osteoide con sus fibrillas y la vesícula. No tiene estado propio: cada vez que cambia `t` calcula
 * `estadoVesicula(t)` (función pura) y se lo pasa a las tres piezas, que solo se mueven, se escalan o se aclaran.
 * La vista `interior` fuerza el corte de la vesícula (se quita la mitad que mira a la cámara) aunque el tiempo no
 * lo pida, para poder mirar dentro en cualquier fase. Al desmontar libera todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { estadoVesicula } from './estado';
import type { EstadoVesicula } from './estado';
import { Osteoblasto, Osteoide, VesiculaMatriz } from './mallas';

const props = defineProps<{ t: number; vista: string }>();

const { invalidate } = useTres();

const osteoblasto = new Osteoblasto();
const osteoide = new Osteoide();
const vesicula = new VesiculaMatriz();

const grupo = new Group();
grupo.name = 'vesicula_matriz_escena';
grupo.add(osteoblasto.grupo, osteoide.grupo, vesicula.grupo);

function dibujar(): void {
  let estado: EstadoVesicula = estadoVesicula(props.t);
  if (props.vista === 'interior') {
    estado = { ...estado, vesicula: { ...estado.vesicula, corte: 1 } };
  }
  osteoblasto.actualizar(estado);
  osteoide.actualizar(estado);
  vesicula.actualizar(estado);
  invalidate();
}

watch(() => [props.t, props.vista] as const, dibujar, { immediate: true });

onBeforeUnmount(() => {
  grupo.remove(osteoblasto.grupo, osteoide.grupo, vesicula.grupo);
  osteoblasto.liberar();
  osteoide.liberar();
  vesicula.liberar();
});
</script>

<template>
  <primitive :object="grupo" />
</template>
