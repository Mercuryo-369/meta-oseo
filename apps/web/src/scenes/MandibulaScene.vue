<script setup lang="ts">
/**
 * Escena 3D "hola mandíbula" (F1-12). Carga el STL provisional de BodyParts3D, lo encuadra y
 * deja girarlo y acercarlo con el dedo o el ratón. Tocar el hueso llama a
 * `setEstructura('mandibula')` del store del contexto pedagógico: demuestra que los eventos
 * de puntero por malla funcionan también en táctil (los usará F2-05 por cada nodo del GLB).
 *
 * Ciclo de vida: la descarga y el parseo ocurren FUERA del lienzo, así el indicador de carga
 * es HTML normal y el <TresCanvas> solo se monta cuando ya hay geometría. Al desmontar se
 * cancela la descarga, se libera la geometría y TresJS libera escena y renderizador (incluido
 * `forceContextLoss`, que devuelve el contexto WebGL al navegador).
 *
 * Nota de tipos (@tresjs/core 5.9 + @types/three 0.186, comprobado con vue-tsc):
 * `:position="[x, y, z]"`, `:scale="n"` y `:scale="[x, y, z]"` NO compilan porque
 * `Object3D.position` y `scale` son `readonly`. Se usan instancias de `Vector3` o props por
 * eje (`:position-x`). `:rotation="[x, y, z]"` sí compila. La escala del modelo va ya
 * incorporada en la geometría (stl.ts), así que no hace falta `scale`.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { TresCanvas } from '@tresjs/core';
import type { TresContext } from '@tresjs/core';
import { OrbitControls } from '@tresjs/cientos';
import { useElementSize, useMediaQuery } from '@vueuse/core';
import { FrontSide, NeutralToneMapping, TOUCH } from 'three';
import { useContextoStore } from '@/stores/contextoPedagogico';
import EstadosEscena from './EstadosEscena.vue';
import EntornoRealista from './procedural/EntornoRealista.vue';
import { liberarMaterialOrganico, materialTriplanar } from './procedural/realismo';
import {
  FOV_VERTICAL_GRADOS,
  RADIO_NORMALIZADO,
  distanciaParaEncajar,
  esToqueSinArrastre,
  limitesDistancia,
} from './encuadre';
import type { PuntoPantalla } from './encuadre';
import { useContextoWebgl } from './useContextoWebgl';
import { useModeloMandibula } from './useModeloMandibula';

/** Id de la estructura en el contexto pedagógico (snake_case, como los nodos del futuro GLB). */
const ID_ESTRUCTURA = 'mandibula';
const NOMBRE_ESTRUCTURA = 'Mandíbula';

// Colores del hueso y de su resalte al seleccionarlo (eosina de la paleta H&E, src/style.css).
const COLOR_HUESO = '#e8dcc3';
const COLOR_SELECCION = '#b23a5f';

/** Un dedo gira; dos dedos acercan o alejan. Sin paneo: en móvil estorba y pierde el modelo. */
const TOQUES = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

const contexto = useContextoStore();
const idAyuda = useId();
const contenedor = ref<HTMLElement | null>(null);
const { width: ancho, height: alto } = useElementSize(contenedor);
const aspecto = computed(() => (alto.value > 0 ? ancho.value / alto.value : 1));

const modelo = useModeloMandibula({ nombre: 'MandibulaScene', aspecto: () => aspecto.value });
const { estado, mensajeError, porcentaje, geometria, camaraInicial } = modelo;
const { contextoPerdido, claveLienzo, alEstarListo, recuperar } = useContextoWebgl();
const sobreMalla = ref(false);

const reducirMovimiento = useMediaQuery('(prefers-reduced-motion: reduce)');
/** El giro automático se detiene para siempre en cuanto el estudiante toca la escena. */
const girandoSolo = ref(true);
const autoRotar = computed(() => girandoSolo.value && !reducirMovimiento.value);

const seleccionada = computed(() => contexto.estructuraSeleccionada === ID_ESTRUCTURA);

/** Hueso real (2026-10-14): relieve triplanar (la malla STL no trae UV), con el resalte al seleccionarla. */
const materialHueso = materialTriplanar(
  COLOR_HUESO,
  'hueso',
  { escala: 1.6, intensidad: 1.1, motas: 0.13 },
  { side: FrontSide, emissive: COLOR_SELECCION, emissiveIntensity: 0 },
);
/** Contexto del lienzo: dibuja a demanda, así que el resalte de la selección pide un dibujo. */
let contextoTres: TresContext | null = null;
function alListo(ctx: TresContext): void {
  contextoTres = ctx;
  alEstarListo(ctx);
}

watch(seleccionada, (s) => {
  materialHueso.emissiveIntensity = s ? 0.35 : 0;
  contextoTres?.renderer.invalidate();
});

const limites = computed(() =>
  limitesDistancia(RADIO_NORMALIZADO, distanciaParaEncajar(RADIO_NORMALIZADO, aspecto.value)),
);

function reintentar(): void {
  if (estado.value === 'error') {
    void modelo.cargar();
    return;
  }
  // Contexto WebGL perdido: se vuelve a crear el lienzo con la misma geometría.
  recuperar();
}

// ---------------------------------------------------------------------------------------
// Selección por toque o clic
// ---------------------------------------------------------------------------------------

let inicioPuntero: PuntoPantalla | null = null;

/** Registra dónde se pulsó, para distinguir un toque de un arrastre al recibir el `click`. */
function registrarInicio(evento: PointerEvent): void {
  inicioPuntero = { x: evento.clientX, y: evento.clientY };
}

function toqueLimpio(evento: Pick<MouseEvent, 'clientX' | 'clientY'>): boolean {
  const limpio = esToqueSinArrastre(inicioPuntero, { x: evento.clientX, y: evento.clientY });
  inicioPuntero = null;
  return limpio;
}

function seleccionar(): void {
  contexto.setEstructura(ID_ESTRUCTURA);
}

/** Toque o clic sobre la malla (evento de TresJS: raycasting con @pmndrs/pointer-events). */
function alTocarMalla(evento: Pick<MouseEvent, 'clientX' | 'clientY'>): void {
  if (toqueLimpio(evento)) seleccionar();
}

/** Toque o clic fuera del hueso: quita la selección. */
function alTocarFuera(evento: Pick<MouseEvent, 'clientX' | 'clientY'>): void {
  if (toqueLimpio(evento)) contexto.setEstructura(undefined);
}

onMounted(() => modelo.iniciar());

onBeforeUnmount(() => liberarMaterialOrganico(materialHueso));

onBeforeUnmount(() => {
  // Lo que el estudiante "tenía en pantalla" deja de valer al salir de la escena.
  if (seleccionada.value) contexto.setEstructura(undefined);
});
</script>

<template>
  <div
    ref="contenedor"
    class="escena select-none focus-visible:outline-offset-[-3px]"
    :class="sobreMalla ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'"
    role="group"
    tabindex="0"
    aria-label="Modelo 3D de la mandíbula"
    :aria-describedby="idAyuda"
    :data-estado="estado"
    @pointerdown="registrarInicio"
    @keydown.enter.self.prevent="seleccionar"
    @keydown.space.self.prevent="seleccionar"
  >
    <p :id="idAyuda" class="sr-only">
      Arrastra para girar el modelo y pellizca para acercarlo. Pulsa Intro para seleccionar la
      mandíbula.
    </p>
    <p class="sr-only" role="status">
      {{ seleccionada ? `${NOMBRE_ESTRUCTURA} seleccionada` : '' }}
    </p>

    <TresCanvas
      v-if="estado === 'listo' && geometria && camaraInicial"
      :key="claveLienzo"
      alpha
      :clear-alpha="0"
      :dpr="[1, 2]"
      :tone-mapping="NeutralToneMapping"
      render-mode="on-demand"
      @ready="alListo"
      @error="modelo.fallarRenderizado"
      @pointermissed="alTocarFuera"
    >
      <TresPerspectiveCamera
        :position="camaraInicial"
        :fov="FOV_VERTICAL_GRADOS"
        :near="0.1"
        :far="50"
      />
      <!-- Luces, entorno y sombras: el esquema común de iluminacion.ts, que sigue a la cámara. -->
      <EntornoRealista />

      <OrbitControls
        make-default
        :enable-damping="!reducirMovimiento"
        :damping-factor="0.08"
        :enable-pan="false"
        :rotate-speed="0.8"
        :touches="TOQUES"
        :min-distance="limites.minima"
        :max-distance="limites.maxima"
        :auto-rotate="autoRotar"
        :auto-rotate-speed="0.7"
        @start="girandoSolo = false"
      />

      <TresMesh
        :geometry="geometria"
        :material="materialHueso"
        @click="alTocarMalla"
        @pointerenter="sobreMalla = true"
        @pointerleave="sobreMalla = false"
      />
    </TresCanvas>

    <!-- Etiqueta: pista de uso y, al tocar el hueso, el nombre de la estructura. -->
    <div
      v-if="estado === 'listo'"
      class="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center"
    >
      <p
        class="bg-card/90 text-card-foreground max-w-full rounded-2xl border px-4 py-2 text-center text-sm shadow-sm backdrop-blur"
        :class="seleccionada ? 'border-eosina font-semibold' : 'text-muted-foreground'"
      >
        <template v-if="seleccionada">
          {{ NOMBRE_ESTRUCTURA }}
          <span class="text-muted-foreground font-normal"> · estructura seleccionada</span>
        </template>
        <template v-else>Arrastra para girar, pellizca para acercar y toca el hueso.</template>
      </p>
    </div>

    <EstadosEscena
      :estado="estado"
      :porcentaje="porcentaje"
      :mensaje-error="mensajeError"
      :contexto-perdido="contextoPerdido"
      @reintentar="reintentar"
    />
  </div>
</template>

<style scoped>
/* Fondo con los tokens de src/style.css: sigue solo al tema claro/oscuro porque el lienzo es
   transparente. Sin degradado plano: un foco de luz suave detrás del hueso. */
.escena {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(
    ellipse at 50% 42%,
    var(--card) 0%,
    var(--muted) 62%,
    var(--secondary) 100%
  );
}
</style>
