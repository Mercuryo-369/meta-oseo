<script setup lang="ts">
/**
 * Contenido 3D de la escena de la BMU (dentro del <TresCanvas>): el hueso, las células, los osteocitos y el
 * capilar. No tiene estado propio: cada vez que cambia `t` calcula `estadoBmu(t)` (función pura) y se lo
 * pasa a las tres mallas, que solo lo dibujan. Al desmontar libera geometrías y materiales.
 *
 * Llamadas de dibujo: hueso (1), células (1), osteocitos (2) y capilar (1). Materiales reutilizados.
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { CylinderGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial } from 'three';
import { CelulasBmu } from './celulas';
import { LARGO, R_CAPILAR, estadoBmu } from './estado';
import { MallaHueso } from './malla';
import { HEX } from './paleta';
import { OsteocitosBmu } from './osteocitos';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const hueso = new MallaHueso();
const celulas = new CelulasBmu(hueso);
const osteocitos = new OsteocitosBmu();

const materialHueso = new MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.62,
  metalness: 0,
  side: DoubleSide,
});
const mallaHueso = new Mesh(hueso.geometria, materialHueso);
mallaHueso.name = 'hueso_cortical';
mallaHueso.frustumCulled = false;

// Capilar: un tubo que atraviesa el fragmento por el eje y asoma un poco por los extremos.
const geometriaCapilar = new CylinderGeometry(R_CAPILAR, R_CAPILAR, LARGO + 0.9, 14, 1, false);
geometriaCapilar.rotateZ(Math.PI / 2);
const materialCapilar = new MeshStandardMaterial({
  color: HEX.capilar,
  roughness: 0.35,
  metalness: 0,
  emissive: '#7a2a24',
  emissiveIntensity: 0.35,
});
const capilar = new Mesh(geometriaCapilar, materialCapilar);
capilar.name = 'capilar';

const grupo = new Group();
grupo.name = 'bmu_remodelado';
grupo.add(mallaHueso, capilar, celulas.malla, osteocitos.discos, osteocitos.canaliculos);

function dibujar(t: number): void {
  const estado = estadoBmu(t);
  // El hueso primero: las células se apoyan en la luz que acaba de calcular.
  hueso.actualizar(estado);
  celulas.actualizar(estado);
  osteocitos.actualizar(estado);
  invalidate();
}

watch(() => props.t, dibujar, { immediate: true });

onBeforeUnmount(() => {
  grupo.remove(mallaHueso, capilar, celulas.malla, osteocitos.discos, osteocitos.canaliculos);
  hueso.liberar();
  celulas.liberar();
  osteocitos.liberar();
  materialHueso.dispose();
  geometriaCapilar.dispose();
  materialCapilar.dispose();
});
</script>

<template>
  <primitive :object="grupo" />
</template>
