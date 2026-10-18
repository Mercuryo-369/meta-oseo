<script setup lang="ts">
/**
 * Contenido 3D de la escena de la BMU (dentro del <TresCanvas>): el hueso, las células, los osteocitos y el
 * capilar. No tiene estado propio: cada vez que cambia `t` calcula `estadoBmu(t)` (función pura) y se lo
 * pasa a las tres mallas, que solo lo dibujan. Al desmontar libera geometrías y materiales.
 *
 * Llamadas de dibujo: hueso (1), células (1), osteocitos (2) y capilar (1). Materiales reutilizados.
 *
 * Realismo (2026-10-14): materiales de `realismo.ts`: el hueso con relieve de poros y su color por vértice (paleta
 * natural, marfil) y el capilar con la pared lisa y húmeda de un vaso (20 lados, antes 14).
 */
import { onBeforeUnmount, watch } from 'vue';
import { useTres } from '@tresjs/core';
import { CylinderGeometry, Group, Mesh } from 'three';
import { liberarMaterialOrganico, materialOrganico } from '../realismo';
import { CelulasBmu } from './celulas';
import { LARGO, R_CAPILAR, estadoBmu } from './estado';
import { MallaHueso, materialHuesoBmu } from './malla';
import { NATURAL as COLOR } from './paleta';
import { OsteocitosBmu } from './osteocitos';

const props = defineProps<{ t: number }>();

const { invalidate } = useTres();

const hueso = new MallaHueso();
const celulas = new CelulasBmu(hueso);
const osteocitos = new OsteocitosBmu();

const materialHueso = materialHuesoBmu();
const mallaHueso = new Mesh(hueso.geometria, materialHueso);
mallaHueso.name = 'hueso_cortical';
mallaHueso.frustumCulled = false;

// Capilar: un tubo que atraviesa el fragmento por el eje y asoma un poco por los extremos. Sin emisivo (antes
// #7a2a24 × 0,35, realismo-03): la sangre no da luz; con la luz común de `iluminacion.ts` ya no se apaga.
const geometriaCapilar = new CylinderGeometry(R_CAPILAR, R_CAPILAR, LARGO + 0.9, 20, 1, false);
geometriaCapilar.rotateZ(Math.PI / 2);
const materialCapilar = materialOrganico(COLOR.capilar, 'vaso');
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
  liberarMaterialOrganico(materialHueso);
  geometriaCapilar.dispose();
  liberarMaterialOrganico(materialCapilar);
});
</script>

<template>
  <primitive :object="grupo" />
</template>
