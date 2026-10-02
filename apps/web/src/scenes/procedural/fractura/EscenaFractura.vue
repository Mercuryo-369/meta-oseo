<script setup lang="ts">
/**
 * Escena 3D procedural "cómo cicatriza una fractura" (docs/escena-3d-fractura.md). La actividad `exploracion-3d`
 * (modelo `procedural`) la carga de forma perezosa desde el registro (`scenes/procedural/registro.ts`): three y
 * TresJS solo llegan al navegador cuando el estudiante llega aquí.
 *
 * Es un componente "tonto": recibe el tiempo `t` (0 a 1: de la fractura al hueso consolidado, con la
 * cicatrización secundaria y su callo) y una vista de cámara con nombre, y dibuja `estadoFractura(t)`. En las
 * vistas `corte` y `detalle` la cuña de la diáfisis se abre para ver dentro. El tiempo, la reproducción y el
 * texto viven en la actividad. Contrato común de las escenas procedurales: `PropsEscenaProcedural`. La cámara y
 * los estados (sin WebGL, error, contexto perdido) son los de la BMU.
 *
 * Rendimiento móvil: DPR entre 1 y 2, `render-mode="on-demand"` (solo se dibuja cuando cambia `t` o la cámara)
 * y piezas fusionadas o instanciadas (unas 24 llamadas de dibujo en el peor instante).
 */
import { computed, onMounted, shallowRef, watch } from 'vue';
import { TresCanvas } from '@tresjs/core';
import { useElementSize } from '@vueuse/core';
import { NeutralToneMapping, Vector3 } from 'three';
import EstadosEscena from '../../EstadosEscena.vue';
import { useContextoWebgl } from '../../useContextoWebgl';
import { hayWebGL2 } from '../../webgl';
import type { EventosEscenaProcedural, PropsEscenaProcedural } from '../registro';
import CamaraBmu from '../bmu/CamaraBmu.vue';
import { FOV_GRADOS } from '../bmu/vistas';
import ContenidoFractura from './ContenidoFractura.vue';
import { estadoDeVistaFractura, vistaAbierta } from './vistas';

const props = defineProps<PropsEscenaProcedural>();
const emit = defineEmits<{
  estado: EventosEscenaProcedural['estado'];
  camaraLibre: EventosEscenaProcedural['camaraLibre'];
}>();

type Estado = EventosEscenaProcedural['estado'][0];

const contenedor = shallowRef<HTMLElement | null>(null);
const { width: ancho, height: alto } = useElementSize(contenedor);
const aspecto = computed(() => (alto.value > 0 ? ancho.value / alto.value : 1));

const estado = shallowRef<Estado>('detectando');
const mensajeError = shallowRef('');
const { contextoPerdido, claveLienzo, alEstarListo, recuperar } = useContextoWebgl();

watch(estado, (nuevo) => emit('estado', nuevo), { immediate: true });

onMounted(() => {
  estado.value = hayWebGL2() ? 'listo' : 'sin_webgl';
});

function fallar(error: unknown): void {
  console.error('[EscenaFractura] error de renderizado', error);
  mensajeError.value =
    'No se pudo dibujar la escena 3D. Usa la lista de fases: es la misma actividad.';
  estado.value = 'error';
}

function reintentar(): void {
  if (estado.value === 'error') {
    estado.value = 'listo';
    return;
  }
  recuperar();
}

/**
 * Posición inicial de la cámara: se calcula una vez (no reactiva) y `CamaraBmu` la ajusta al aspecto real
 * del lienzo en cuanto está listo, sin transición.
 */
const posicionInicial = new Vector3(...estadoDeVistaFractura(props.vista, 1).posicion);
const listo = computed(() => estado.value === 'listo');
/** La cuña se abre en las vistas de corte (la decide la vista con nombre del paso). */
const abierta = computed(() => vistaAbierta(props.vista));
</script>

<template>
  <div
    class="escena-fractura"
    role="group"
    :aria-label="alt"
    :data-estado="estado"
    data-testid="escena-procedural"
  >
    <div
      ref="contenedor"
      class="escena relative h-80 min-h-72 w-full sm:h-[min(58svh,26rem)] overflow-hidden rounded-xl border"
    >
      <TresCanvas
        v-if="listo"
        :key="claveLienzo"
        alpha
        :clear-alpha="0"
        :dpr="[1, 2]"
        :tone-mapping="NeutralToneMapping"
        render-mode="on-demand"
        @ready="alEstarListo"
        @error="fallar"
      >
        <!-- La luz principal es hija de la cámara: ilumina siempre lo que se ve, gire como gire. -->
        <TresPerspectiveCamera :position="posicionInicial" :fov="FOV_GRADOS" :near="0.1" :far="80">
          <TresDirectionalLight :position-x="3" :position-y="4" :position-z="2" :intensity="3.4" />
        </TresPerspectiveCamera>
        <TresAmbientLight color="#ffffff" :intensity="0.55" />
        <TresHemisphereLight color="#ffffff" ground-color="#a48fbd" :intensity="0.9" />
        <CamaraBmu
          :vista="vista"
          :orden="ordenVista"
          :zoom="ordenZoom"
          :reducir-movimiento="reducirMovimiento"
          :aspecto="aspecto"
          :resolver-vista="estadoDeVistaFractura"
          @libre="emit('camaraLibre')"
        />
        <ContenidoFractura :t="t" :abierta="abierta" />
      </TresCanvas>

      <EstadosEscena
        :estado="estado"
        :mensaje-error="mensajeError"
        :contexto-perdido="contextoPerdido"
        texto-sin-webgl="Tu navegador no ofrece gráficos 3D (WebGL 2). La lista de fases sigue funcionando y basta para completar la actividad."
        @reintentar="reintentar"
      />
    </div>
  </div>
</template>

<style scoped>
/* Fondo con los tokens de src/style.css: sigue solo al tema claro y oscuro porque el lienzo es
   transparente. */
.escena {
  background: radial-gradient(
    ellipse at 50% 42%,
    var(--card) 0%,
    var(--muted) 62%,
    var(--secondary) 100%
  );
}
</style>
