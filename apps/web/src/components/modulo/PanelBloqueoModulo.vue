<script setup lang="ts">
/**
 * Panel «Todavía bloqueado» de un módulo: explica el motivo, muestra lo que falta (el módulo
 * anterior y cuánto lleva el estudiante) y ofrece un botón al módulo que sí puede estudiar. Lo usa
 * `ModuloBloqueado.vue`; los colores vienen del acento del módulo (`estiloAcento`).
 */
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { Lock } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { cargarModulo } from '@/content/registry';
import { idsSuperadas, progresoDeModulo } from '@/content/scoring';
import type { ModuloContenido } from '@/content/schema';
import { moduloPorNumero } from '@/data/modulos';
import type { Modulo } from '@/data/modulos';
import { useActividadesStore } from '@/stores/actividades';
import { mensajeModuloBloqueado } from './acceso';

const props = defineProps<{
  numero: number;
  /** Módulo que hay que completar antes (el anterior). */
  requerido: Modulo;
  /** Primer módulo que el estudiante sí puede estudiar. */
  destino: number;
}>();

const store = useActividadesStore();

const destinoModulo = computed(() => moduloPorNumero(props.destino));
const mensaje = computed(() => mensajeModuloBloqueado(props.numero, props.requerido));
/** El anterior también está bloqueado: hay que ir al primero pendiente. */
const anteriorTambienBloqueado = computed(() => props.destino !== props.requerido.numero);

const contenidoPrevio = ref<ModuloContenido | null>(null);

onMounted(async () => {
  try {
    const resultado = await cargarModulo(props.requerido.numero);
    if (!resultado.ok) return;
    await store.cargarResultados(props.requerido.numero);
    contenidoPrevio.value = resultado.modulo;
  } catch {
    // Sin el avance del anterior el panel sigue explicando el bloqueo.
  }
});

const avancePrevio = computed(() => {
  const previo = contenidoPrevio.value;
  if (!previo || store.estadoCarga[props.requerido.numero] !== 'listo') return null;
  return progresoDeModulo(previo, idsSuperadas(previo, store.conocidos));
});
const porcentajePrevio = computed(() => Math.round((avancePrevio.value?.fraccion ?? 0) * 100));
</script>

<template>
  <section
    aria-labelledby="titulo-bloqueo"
    class="bg-card space-y-3 rounded-xl border border-dashed p-5"
    data-testid="modulo-bloqueado"
  >
    <h2 id="titulo-bloqueo" class="flex items-center gap-2 font-serif text-xl font-semibold">
      <Lock class="text-acento size-5 shrink-0" aria-hidden="true" />
      Todavía bloqueado
    </h2>
    <p data-testid="motivo-bloqueo-modulo">{{ mensaje }}</p>
    <p v-if="anteriorTambienBloqueado" class="text-muted-foreground">
      El módulo {{ requerido.numero }} tampoco está abierto todavía: el siguiente que puedes
      estudiar es el módulo {{ destino }} («{{ destinoModulo?.titulo }}»).
    </p>

    <div class="bg-muted space-y-2 rounded-lg p-3" data-testid="falta-modulo">
      <p class="text-sm font-medium">Lo que falta</p>
      <p class="text-sm">Completar el módulo {{ requerido.numero }}: «{{ requerido.titulo }}».</p>
      <template v-if="avancePrevio">
        <div
          class="bg-background h-2 overflow-hidden rounded-full border"
          role="progressbar"
          :aria-valuenow="porcentajePrevio"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Avance del módulo ${requerido.numero}`"
        >
          <div class="bg-acento h-full" :style="{ width: `${porcentajePrevio}%` }" />
        </div>
        <p class="text-muted-foreground text-sm" data-testid="avance-previo">
          Llevas {{ avancePrevio.obligatoriasCompletadas }} de
          {{ avancePrevio.obligatoriasTotal }} actividades obligatorias ({{ porcentajePrevio }} %)
          del módulo {{ requerido.numero }}.
        </p>
      </template>
    </div>

    <Button as-child data-testid="ir-al-modulo">
      <RouterLink :to="{ name: 'modulo', params: { n: destino } }">
        Ir al módulo {{ destino }}
      </RouterLink>
    </Button>
  </section>
</template>
