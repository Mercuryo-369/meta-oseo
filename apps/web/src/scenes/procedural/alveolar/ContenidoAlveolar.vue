<script setup lang="ts">
/**
 * Contenido 3D de la escena del hueso alveolar (dentro del <TresCanvas>): la mitad anterior que se aparta, el
 * cuerpo seccionado con sus trabéculas, el alvéolo con el diente y el conducto mandibular. No tiene estado
 * propio: cada vez que cambia `t` calcula `estadoAlveolar(t)` (función pura) y se lo pasa a las piezas, que
 * solo se mueven, se aclaran o se destacan. Al desmontar libera todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { estadoAlveolar } from './estado';
import { Alveolo, ConductoMandibular, CuerpoSeccionado, MitadMovil } from './mallas';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const piezas = [new MitadMovil(), new CuerpoSeccionado(), new Alveolo(), new ConductoMandibular()];

const grupo = new Group();
grupo.name = 'hueso_alveolar';
for (const pieza of piezas) grupo.add(pieza.grupo);

function dibujar(t: number): void {
  const estado = estadoAlveolar(t);
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
