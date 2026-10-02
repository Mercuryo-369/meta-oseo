<script setup lang="ts">
/**
 * Contenido 3D de la escena de la mandíbula fetal (dentro del <TresCanvas>): el mesénquima, el cartílago de
 * Meckel, el nervio alveolar inferior, la condensación y el hueso con sus gérmenes, su rama y sus cartílagos
 * secundarios. No tiene estado propio: cada vez que cambia `t` calcula `estadoMandibulaFetal(t)` (función pura)
 * y se lo pasa a las piezas, que solo se mueven, se escalan o se aclaran. Al desmontar libera todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { estadoMandibulaFetal } from './estado';
import {
  CartilagoMeckel,
  Condensacion,
  HuesoMandibular,
  Mesenquima,
  NervioAlveolar,
} from './mallas';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const piezas = [
  new Mesenquima(),
  new CartilagoMeckel(),
  new NervioAlveolar(),
  new Condensacion(),
  new HuesoMandibular(),
];

const grupo = new Group();
grupo.name = 'mandibula_fetal';
for (const pieza of piezas) grupo.add(pieza.grupo);

function dibujar(t: number): void {
  const estado = estadoMandibulaFetal(t);
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
