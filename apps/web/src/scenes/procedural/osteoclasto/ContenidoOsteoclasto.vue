<script setup lang="ts">
/**
 * Contenido 3D de la escena del osteoclasto (dentro del <TresCanvas>): el entorno óseo, la célula, las
 * mononucleares y las partículas. No tiene estado propio: cada vez que cambia `t` calcula `estadoOsteoclasto(t)`
 * (función pura) y se lo pasa a las cuatro piezas, que solo se mueven, se escalan o se aclaran. Al desmontar
 * libera todo.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { Group } from 'three';
import { estadoOsteoclasto } from './estado';
import { CelulasMononucleares, EntornoOseo, Osteoclasto, Particulas } from './mallas';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const piezas = [new EntornoOseo(), new Osteoclasto(), new CelulasMononucleares(), new Particulas()];

const grupo = new Group();
grupo.name = 'osteoclasto_resorcion';
for (const p of piezas) grupo.add(p.grupo);

function dibujar(t: number): void {
  const estado = estadoOsteoclasto(t);
  for (const p of piezas) p.actualizar(estado);
  invalidate();
}

watch(() => props.t, dibujar, { immediate: true });

onBeforeUnmount(() => {
  for (const p of piezas) {
    grupo.remove(p.grupo);
    p.liberar();
  }
});
</script>

<template>
  <primitive :object="grupo" />
</template>
