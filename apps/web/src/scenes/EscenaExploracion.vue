<script setup lang="ts">
/**
 * Escena 3D de la actividad `exploracion-3d` (F2-05): el modelo con sus puntos de interés (hotspots),
 * vistas de cámara con nombre y zoom con transición suave. La actividad (activities/exploracion-3d) la
 * carga de forma perezosa: three y TresJS solo llegan al navegador cuando el estudiante llega aquí.
 *
 * Qué es de quién:
 *  - La ACTIVIDAD decide qué nodo está seleccionado y cuáles están visitados; esta escena solo lo
 *    dibuja y avisa (`seleccionar`) cuando el estudiante toca un punto sobre el modelo.
 *  - La LISTA de nodos (botones) vive en la actividad y funciona siempre: aquí los puntos son una
 *    ayuda visual para quien puede tocarlos. Por eso llevan `aria-hidden` y `tabindex="-1"`: para
 *    teclado y lector de pantalla la alternativa es esa lista (regla R1), no doscientos botones
 *    duplicados. Los controles de vista y de zoom (select y botones) SÍ son accesibles.
 *
 * Estados (`EstadosEscena`): detectando, sin WebGL 2, cargando, error (modelo ausente, archivo no
 * válido, contexto perdido) y listo. En todos menos "listo" no hay lienzo y la actividad sigue viva.
 *
 * Nota de tipos (@tresjs/core 5.9 + @types/three 0.186): `:position="[x, y, z]"` no compila
 * (`Object3D.position` es `readonly`); se usan instancias de `Vector3` o props por eje.
 */
import { computed, onMounted, shallowRef, useId, watch } from 'vue';
import { TresCanvas } from '@tresjs/core';
import { useElementSize, useMediaQuery } from '@vueuse/core';
import { Check, Maximize, ZoomIn, ZoomOut } from '@lucide/vue';
import { NeutralToneMapping } from 'three';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { Modelo3d, VistaCamara } from '@/content/nodos3d';
import { VISTAS_CAMARA } from '@/content/nodos3d';
import { centroDeCaja } from './anclas';
import CamaraExploracion from './CamaraExploracion.vue';
import EstadosEscena from './EstadosEscena.vue';
import { FOV_VERTICAL_GRADOS, RADIO_NORMALIZADO, distanciaParaEncajar } from './encuadre';
import type { NodoEscena } from './nodosEscena';
import type { PosicionPunto } from './proyeccion';
import { useContextoWebgl } from './useContextoWebgl';
import { useModeloExploracion } from './useModeloExploracion';
import type { EstadoEscena } from './useModeloExploracion';
import {
  ETIQUETA_VISTA,
  FACTOR_ZOOM_BOTON,
  calcularEncuadre,
  estadoDeEncuadre,
  limitesZoomExploracion,
} from './vistas';
import type { OrdenCamara, Vec3 } from './vistas';

const props = withDefaults(
  defineProps<{
    /** Se elige al montar: si cambia, quien la use debe volver a montarla (`:key`). */
    modelo: Modelo3d;
    alt: string;
    nodos: readonly NodoEscena[];
    visitados?: readonly string[];
    seleccionId?: string | null;
    /** Sube cada vez que hay que llevar la cámara al nodo seleccionado (aunque sea el mismo). */
    ordenEnfoque?: number;
  }>(),
  { visitados: () => [], seleccionId: null, ordenEnfoque: 0 },
);

const emit = defineEmits<{
  seleccionar: [id: string];
  estado: [estado: EstadoEscena];
}>();

const COLOR_HUESO = '#e3d6b8';
const COLOR_CELULAS = '#d9cfe8';

const idAyuda = useId();
const idVista = useId();
const contenedor = shallowRef<HTMLElement | null>(null);
const { width: ancho, height: alto } = useElementSize(contenedor);
const aspecto = computed(() => (alto.value > 0 ? ancho.value / alto.value : 1));
const reducirMovimiento = useMediaQuery('(prefers-reduced-motion: reduce)');

const modelo = useModeloExploracion({
  modelo: props.modelo,
  nombre: 'EscenaExploracion',
  aspecto: () => aspecto.value,
});
const { estado, mensajeError, porcentaje, geometria, raiz, camaraInicial } = modelo;
const { contextoPerdido, claveLienzo, alEstarListo, recuperar } = useContextoWebgl();

watch(estado, (nuevo) => emit('estado', nuevo), { immediate: true });

const limites = computed(() =>
  limitesZoomExploracion(distanciaParaEncajar(RADIO_NORMALIZADO, aspecto.value)),
);
const centroModelo = computed<Vec3>(() => {
  const caja = modelo.caja.value;
  return caja ? centroDeCaja(caja) : [0, 0, 0];
});

// -----------------------------------------------------------------------------------------
// Puntos de interés
// -----------------------------------------------------------------------------------------

const ubicaciones = computed(() => {
  // Depende de `caja` (el modelo cargó) y de los nodos: se recalcula solo cuando cambia alguno.
  void modelo.caja.value;
  return new Map(
    props.nodos.map((nodo) => [
      nodo.id,
      modelo.ubicar({ id: nodo.id, ancla: nodo.ancla, camara: { vista: nodo.vista } }),
    ]),
  );
});

const puntosProyectables = computed(() =>
  props.nodos.flatMap((nodo) => {
    const ubicacion = ubicaciones.value.get(nodo.id);
    return ubicacion ? [{ id: nodo.id, punto: ubicacion.punto, normal: ubicacion.normal }] : [];
  }),
);

const posiciones = shallowRef<PosicionPunto[]>([]);
const hotspots = computed(() => {
  const porId = new Map(posiciones.value.map((p) => [p.id, p]));
  return props.nodos.flatMap((nodo, indice) => {
    const posicion = porId.get(nodo.id);
    if (!posicion?.enPantalla) return [];
    return [
      {
        id: nodo.id,
        numero: indice + 1,
        etiqueta: nodo.etiqueta,
        x: posicion.x,
        y: posicion.y,
        detras: posicion.detras,
        visitado: props.visitados.includes(nodo.id),
        seleccionado: props.seleccionId === nodo.id,
      },
    ];
  });
});

// -----------------------------------------------------------------------------------------
// Cámara: vistas, nodos y zoom
// -----------------------------------------------------------------------------------------

const orden = shallowRef<OrdenCamara | null>(null);
let contadorOrdenes = 0;
/** Vista con nombre en la que está la cámara; vacía si el estudiante la movió a mano. */
const vistaActual = shallowRef<VistaCamara | ''>('');

const nodoSeleccionado = computed(
  () => props.nodos.find((n) => n.id === props.seleccionId) ?? null,
);

function pedirEstado(estadoCamara: ReturnType<typeof estadoDeEncuadre>): void {
  contadorOrdenes += 1;
  orden.value = { id: contadorOrdenes, tipo: 'estado', estado: estadoCamara };
}

/** Encuadre del nodo seleccionado, o del modelo entero si no hay o no se puede ubicar. */
function encuadreDeSeleccion(vista?: VistaCamara) {
  const nodo = nodoSeleccionado.value;
  const ubicacion = nodo ? ubicaciones.value.get(nodo.id) : null;
  if (nodo && ubicacion) {
    return calcularEncuadre(
      {
        centro: ubicacion.punto,
        radio: ubicacion.radio,
        vista: vista ?? nodo.vista,
        zoom: nodo.zoom,
        aspecto: aspecto.value,
      },
      limites.value,
    );
  }
  return calcularEncuadre(
    {
      centro: centroModelo.value,
      radio: RADIO_NORMALIZADO,
      vista: vista ?? 'frontal',
      zoom: 1,
      aspecto: aspecto.value,
      fovVerticalGrados: FOV_VERTICAL_GRADOS,
    },
    limites.value,
  );
}

function enfocarSeleccion(): void {
  const nodo = nodoSeleccionado.value;
  const hayUbicacion = nodo ? ubicaciones.value.get(nodo.id) : null;
  vistaActual.value = nodo && hayUbicacion ? nodo.vista : 'frontal';
  pedirEstado(estadoDeEncuadre(encuadreDeSeleccion()));
}

function elegirVista(vista: string): void {
  if (!(VISTAS_CAMARA as readonly string[]).includes(vista)) return;
  vistaActual.value = vista as VistaCamara;
  pedirEstado(estadoDeEncuadre(encuadreDeSeleccion(vista as VistaCamara)));
}

function verTodo(): void {
  vistaActual.value = 'frontal';
  pedirEstado(
    estadoDeEncuadre(
      calcularEncuadre(
        {
          centro: centroModelo.value,
          radio: RADIO_NORMALIZADO,
          vista: 'frontal',
          zoom: 1,
          aspecto: aspecto.value,
        },
        limites.value,
      ),
    ),
  );
}

function zoom(factor: number): void {
  contadorOrdenes += 1;
  orden.value = { id: contadorOrdenes, tipo: 'zoom', factor };
}

watch(
  () => props.ordenEnfoque,
  () => enfocarSeleccion(),
);

// Un nodo pedido mientras cargaba el modelo se enfoca cuando ya se puede ubicar.
watch(modelo.caja, (caja) => {
  if (caja && props.ordenEnfoque > 0) enfocarSeleccion();
});

// -----------------------------------------------------------------------------------------
// Estados
// -----------------------------------------------------------------------------------------

function reintentar(): void {
  if (estado.value === 'error') {
    void modelo.cargar();
    return;
  }
  recuperar();
}

onMounted(() => modelo.iniciar());

const listo = computed(() => estado.value === 'listo');
const colorModelo = computed(() => (props.modelo === 'mandibula' ? COLOR_HUESO : COLOR_CELULAS));
</script>

<template>
  <div
    class="escena-exploracion"
    role="group"
    :aria-label="alt"
    :aria-describedby="idAyuda"
    :data-estado="estado"
    data-testid="escena-exploracion"
  >
    <div
      ref="contenedor"
      class="escena relative w-full overflow-hidden rounded-xl border"
      :class="listo ? 'h-[min(62svh,28rem)] min-h-72' : 'min-h-64'"
    >
      <TresCanvas
        v-if="listo && camaraInicial"
        :key="claveLienzo"
        alpha
        :clear-alpha="0"
        :dpr="[1, 2]"
        :tone-mapping="NeutralToneMapping"
        render-mode="on-demand"
        @ready="alEstarListo"
        @error="modelo.fallarRenderizado"
      >
        <!-- Los hijos de la cámara la siguen: la luz principal ilumina siempre lo que se ve. -->
        <TresPerspectiveCamera
          :position="camaraInicial"
          :fov="FOV_VERTICAL_GRADOS"
          :near="0.1"
          :far="50"
        >
          <TresDirectionalLight :position-x="2" :position-y="3" :position-z="1" :intensity="2.4" />
        </TresPerspectiveCamera>
        <TresHemisphereLight color="#ffffff" ground-color="#9d92bf" :intensity="1.3" />

        <CamaraExploracion
          :orden="orden"
          :limites="limites"
          :reducir-movimiento="reducirMovimiento"
          :puntos="puntosProyectables"
          :centro="centroModelo"
          :ancho="ancho"
          :alto="alto"
          @proyeccion="posiciones = $event"
          @interrumpida="vistaActual = ''"
        />

        <TresMesh v-if="geometria" :geometry="geometria">
          <TresMeshStandardMaterial :color="colorModelo" :roughness="0.65" :metalness="0.02" />
        </TresMesh>
        <primitive v-if="raiz" :object="raiz" />
      </TresCanvas>

      <!--
        Puntos de interés: ayuda visual y táctil. Para teclado y lector de pantalla la alternativa es la
        lista de nodos de la actividad, que hace lo mismo (regla R1); por eso no entran en el orden de Tab
        ni en el árbol de accesibilidad.
      -->
      <div
        v-if="listo"
        class="pointer-events-none absolute inset-0 overflow-hidden"
        data-testid="puntos-de-interes"
      >
        <button
          v-for="punto in hotspots"
          :key="punto.id"
          type="button"
          tabindex="-1"
          aria-hidden="true"
          class="pointer-events-auto absolute top-0 left-0 grid size-11 place-items-center rounded-full outline-none"
          :class="punto.detras ? 'opacity-50' : ''"
          :style="{ transform: `translate(${punto.x}px, ${punto.y}px) translate(-50%, -50%)` }"
          :data-punto="punto.id"
          :data-visitado="punto.visitado"
          :data-seleccionado="punto.seleccionado"
          @click="emit('seleccionar', punto.id)"
        >
          <span
            class="relative grid size-9 place-items-center rounded-full border-2 text-sm font-semibold shadow-md motion-safe:transition-transform"
            :class="
              punto.seleccionado
                ? 'bg-primary text-primary-foreground border-primary-foreground ring-primary scale-110 ring-2'
                : punto.visitado
                  ? 'bg-success-soft text-success border-success'
                  : 'bg-card text-card-foreground border-primary'
            "
          >
            {{ punto.numero }}
            <Check
              v-if="punto.visitado"
              class="bg-success text-card absolute -top-1 -right-1 size-4 rounded-full p-0.5"
              aria-hidden="true"
            />
          </span>
          <span
            v-if="punto.seleccionado"
            class="bg-card text-card-foreground pointer-events-none absolute top-full left-1/2 mt-1 w-max max-w-44 -translate-x-1/2 rounded-md border px-2 py-1 text-center text-xs font-medium shadow-sm"
          >
            {{ punto.etiqueta }}
          </span>
        </button>
      </div>

      <EstadosEscena
        :estado="estado"
        :porcentaje="porcentaje"
        :mensaje-error="mensajeError"
        :contexto-perdido="contextoPerdido"
        texto-sin-webgl="Tu navegador no ofrece gráficos 3D (WebGL 2). La lista de partes de abajo sigue funcionando y basta para completar la actividad."
        @reintentar="reintentar"
      />
    </div>

    <p :id="idAyuda" class="text-muted-foreground mt-2 text-sm">
      <template v-if="listo">
        Arrastra para girar el modelo y pellizca para acercarlo. Los números marcan las partes:
        tócalos o elige una en la lista.
      </template>
      <template v-else-if="estado === 'cargando' || estado === 'detectando'">
        Preparando el modelo 3D. Mientras tanto puedes usar la lista de partes.
      </template>
      <template v-else>
        El modelo 3D no está disponible. Usa la lista de partes: es la misma actividad.
      </template>
    </p>

    <div
      v-if="listo"
      class="mt-2 flex flex-wrap items-end gap-2"
      role="group"
      aria-label="Controles de la cámara"
      data-testid="controles-camara"
    >
      <div class="min-w-40 flex-1">
        <label :for="idVista" class="text-muted-foreground mb-1 block text-sm">Vista</label>
        <NativeSelect
          :id="idVista"
          :model-value="vistaActual"
          data-testid="selector-vista"
          @update:model-value="elegirVista(String($event ?? ''))"
        >
          <NativeSelectOption value="" disabled>Vista libre (girada a mano)</NativeSelectOption>
          <NativeSelectOption v-for="vista in VISTAS_CAMARA" :key="vista" :value="vista">
            {{ ETIQUETA_VISTA[vista] }}
          </NativeSelectOption>
        </NativeSelect>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Acercar"
        data-testid="acercar"
        @click="zoom(FACTOR_ZOOM_BOTON)"
      >
        <ZoomIn aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Alejar"
        data-testid="alejar"
        @click="zoom(1 / FACTOR_ZOOM_BOTON)"
      >
        <ZoomOut aria-hidden="true" />
      </Button>
      <Button type="button" variant="outline" data-testid="ver-todo" @click="verTodo">
        <Maximize aria-hidden="true" />
        Ver todo
      </Button>
    </div>
  </div>
</template>

<style scoped>
/* Fondo con los tokens de src/style.css: sigue solo al tema claro/oscuro porque el lienzo es
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
