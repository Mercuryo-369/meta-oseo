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
 * Etiquetas laterales (`etiquetasLaterales`, la usa la mandíbula): desde `lg`, en vez de los números
 * sobre el modelo, cada parte lleva una etiqueta a un lado del lienzo unida con una línea a su punto,
 * como un atlas. Las partes se ordenan de izquierda a derecha sobre el modelo y la mitad más a la izquierda
 * va a la columna izquierda (columnas equilibradas aunque todas estén del mismo lado); dentro de cada
 * columna, de arriba abajo por su altura. Nada de eso cambia al girar; las líneas sí siguen al punto proyectado en cada fotograma (y
 * se atenúan si queda detrás del hueso). Son la misma ayuda visual que los números (`aria-hidden`,
 * fuera del orden de Tab): la alternativa accesible sigue siendo la lista de la actividad.
 *
 * Estados (`EstadosEscena`): detectando, sin WebGL 2, cargando, error (modelo ausente, archivo no
 * válido, contexto perdido) y listo. En todos menos "listo" no hay lienzo y la actividad sigue viva.
 *
 * Nota de tipos (@tresjs/core 5.9 + @types/three 0.186): `:position="[x, y, z]"` no compila
 * (`Object3D.position` es `readonly`); se usan instancias de `Vector3` o props por eje.
 */
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue';
import { TresCanvas } from '@tresjs/core';
import type { TresContext } from '@tresjs/core';
import { resaltarNodo } from './glb';
import { useElementSize, useMediaQuery } from '@vueuse/core';
import { Check, Maximize, ZoomIn, ZoomOut } from '@lucide/vue';
import { FrontSide, NeutralToneMapping } from 'three';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { Modelo3d, VistaCamara } from '@/content/nodos3d';
import { VISTAS_CAMARA } from '@/content/nodos3d';
import { centroDeCaja } from './anclas';
import CamaraExploracion from './CamaraExploracion.vue';
import EstadosEscena from './EstadosEscena.vue';
import EntornoRealista from './procedural/EntornoRealista.vue';
import { liberarMaterialOrganico, materialTriplanar } from './procedural/realismo';
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
    /** Desde `lg`, etiquetas a los lados con líneas guía en vez de números sobre el modelo. */
    etiquetasLaterales?: boolean;
    /** Vista con la que se abre y a la que vuelve «Ver todo» (la portada del inicio usa `oblicua`). */
    vistaInicial?: VistaCamara;
    /** Sin el selector de vista ni los botones de zoom (el modelo sigue girando con el dedo). */
    sinControles?: boolean;
    /** Ancho de cada columna de etiquetas laterales, en fracción del lienzo. */
    anchoEtiquetas?: number;
  }>(),
  {
    visitados: () => [],
    seleccionId: null,
    ordenEnfoque: 0,
    etiquetasLaterales: false,
    vistaInicial: 'frontal',
    sinControles: false,
    anchoEtiquetas: 0.22,
  },
);

const emit = defineEmits<{
  seleccionar: [id: string];
  estado: [estado: EstadoEscena];
}>();

/** Hueso real (2026-10-14): marfil, con poros y variación de tono por relieve triplanar. */
const COLOR_HUESO = '#e8dcc3';
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
// Etiquetas laterales (atlas)
// -----------------------------------------------------------------------------------------

/** Ancho de cada columna de etiquetas, en fracción del lienzo. */
const COLUMNA_ETIQUETAS = computed(() => props.anchoEtiquetas);
const pantallaAncha = useMediaQuery('(min-width: 64rem)');
const conEtiquetas = computed(() => props.etiquetasLaterales && pantallaAncha.value);

const etiquetas = computed(() => {
  if (!conEtiquetas.value) return [];
  const porId = new Map(posiciones.value.map((p) => [p.id, p]));
  const partes = props.nodos.flatMap((nodo, indice) => {
    const ubicacion = ubicaciones.value.get(nodo.id);
    if (!ubicacion) return [];
    const [x, y] = ubicacion.punto;
    return [
      {
        id: nodo.id,
        numero: indice + 1,
        etiqueta: nodo.etiqueta,
        x,
        altura: y,
        posicion: porId.get(nodo.id),
        visitado: props.visitados.includes(nodo.id),
        seleccionado: props.seleccionId === nodo.id,
      },
    ];
  });
  const porX = [...partes].sort((a, b) => a.x - b.x);
  const mitad = Math.ceil(porX.length / 2);
  const conLado = porX.map((p, k) => ({
    ...p,
    lado: k < mitad ? ('izq' as const) : ('der' as const),
  }));
  return (['izq', 'der'] as const).flatMap((lado) => {
    const delLado = conLado.filter((p) => p.lado === lado).sort((a, b) => b.altura - a.altura);
    // De arriba abajo, repartidas en la altura del lienzo con un margen arriba y abajo.
    return delLado.map((p, k) => ({ ...p, yRel: 0.07 + (0.86 * (k + 0.5)) / delLado.length }));
  });
});

const lineasEtiquetas = computed(() =>
  etiquetas.value.flatMap((e) =>
    e.posicion?.enPantalla
      ? [
          {
            id: e.id,
            x1:
              (e.lado === 'izq' ? COLUMNA_ETIQUETAS.value : 1 - COLUMNA_ETIQUETAS.value) *
              ancho.value,
            y1: e.yRel * alto.value,
            x2: e.posicion.x,
            y2: e.posicion.y,
            detras: e.posicion.detras,
            seleccionado: e.seleccionado,
          },
        ]
      : [],
  ),
);

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
      vista: vista ?? props.vistaInicial,
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
  vistaActual.value = props.vistaInicial;
  pedirEstado(
    estadoDeEncuadre(
      calcularEncuadre(
        {
          centro: centroModelo.value,
          radio: RADIO_NORMALIZADO,
          vista: props.vistaInicial,
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
// Una vista inicial distinta de la frontal se pide en cuanto la cámara existe.
watch(listo, (ya) => {
  if (ya && props.vistaInicial !== 'frontal') setTimeout(() => verTodo(), 50);
});
const colorModelo = computed(() => (props.modelo === 'mandibula' ? COLOR_HUESO : COLOR_CELULAS));
/**
 * Material del modelo de una sola malla (la mandíbula STL, sin UV): relieve triplanar de poros y grano, color
 * que varía un poco con el relieve y brillo sutil, como un hueso real. Cara única: la malla es cerrada.
 */
const materialModelo = materialTriplanar(
  colorModelo.value,
  props.modelo === 'mandibula' ? 'hueso' : 'celula',
  { escala: 1.6, intensidad: 1.1, motas: 0.13 },
  { side: FrontSide },
);
onBeforeUnmount(() => liberarMaterialOrganico(materialModelo));

/**
 * En los modelos de piezas (el hueso largo, los GLB) el nodo elegido brilla en azul: se distingue del resto, no solo
 * por su etiqueta. El lienzo dibuja a demanda, así que el cambio pide un dibujo.
 */
const COLOR_RESALTE = '#2a6db5';
let contextoTres: TresContext | null = null;
function alListo(ctx: TresContext): void {
  contextoTres = ctx;
  alEstarListo(ctx);
}
watch(
  [() => props.seleccionId, raiz],
  ([id, r]) => {
    if (!r) return;
    resaltarNodo(r, id ?? null, COLOR_RESALTE);
    contextoTres?.renderer.invalidate();
  },
  { immediate: true },
);
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
      :class="listo ? (conEtiquetas ? 'h-[32rem]' : 'h-[min(62svh,28rem)] min-h-72') : 'min-h-64'"
    >
      <TresCanvas
        v-if="listo && camaraInicial"
        :key="claveLienzo"
        alpha
        :clear-alpha="0"
        :dpr="[1, 2]"
        :tone-mapping="NeutralToneMapping"
        render-mode="on-demand"
        @ready="alListo"
        @error="modelo.fallarRenderizado"
      >
        <TresPerspectiveCamera
          :position="camaraInicial"
          :fov="FOV_VERTICAL_GRADOS"
          :near="0.1"
          :far="50"
        />
        <!-- Luces, entorno y sombras: el esquema común de iluminacion.ts, que sigue a la cámara. -->
        <EntornoRealista />

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

        <TresMesh v-if="geometria" :geometry="geometria" :material="materialModelo" />
        <primitive v-if="raiz" :object="raiz" />
      </TresCanvas>

      <!--
        Puntos de interés: ayuda visual y táctil. Para teclado y lector de pantalla la alternativa es la
        lista de nodos de la actividad, que hace lo mismo (regla R1); por eso no entran en el orden de Tab
        ni en el árbol de accesibilidad.
      -->
      <!-- Etiquetas laterales con líneas guía (mandíbula, desde lg) -->
      <template v-if="listo && conEtiquetas">
        <svg
          class="pointer-events-none absolute inset-0 size-full"
          :viewBox="`0 0 ${ancho} ${alto}`"
          aria-hidden="true"
          data-testid="lineas-etiquetas"
        >
          <g v-for="l in lineasEtiquetas" :key="l.id" :opacity="l.detras ? 0.35 : 0.85">
            <line
              :x1="l.x1"
              :y1="l.y1"
              :x2="l.x2"
              :y2="l.y2"
              :stroke="l.seleccionado ? '#1f5a96' : '#1b2a41'"
              :stroke-width="l.seleccionado ? 3 : 2"
              stroke-linecap="round"
            />
            <circle
              :cx="l.x2"
              :cy="l.y2"
              :r="l.seleccionado ? 7 : 5.5"
              :fill="l.seleccionado ? '#1f5a96' : '#1b2a41'"
              stroke="#ffffff"
              stroke-width="2.5"
            />
          </g>
        </svg>
        <div class="pointer-events-none absolute inset-0" data-testid="etiquetas-laterales">
          <button
            v-for="e in etiquetas"
            :key="e.id"
            type="button"
            tabindex="-1"
            aria-hidden="true"
            class="pointer-events-auto absolute flex -translate-y-1/2 items-center gap-2 rounded-lg bg-[#1b2a41] py-1.5 text-left text-[0.8rem] leading-tight font-semibold text-white shadow-lg ring-1 ring-white/10 transition-colors outline-none hover:bg-[#24364f]"
            :class="[
              e.lado === 'izq'
                ? 'left-2 flex-row-reverse pr-1.5 pl-3 text-right'
                : 'right-2 pr-3 pl-1.5',
              e.seleccionado ? 'ring-2 ring-[#86b4e8]' : '',
              e.posicion?.enPantalla && !e.posicion.detras ? '' : 'opacity-80',
            ]"
            :style="{
              top: `${e.yRel * 100}%`,
              width: `calc(${COLUMNA_ETIQUETAS * 100}% - 0.75rem)`,
            }"
            :data-etiqueta="e.id"
            :data-lado="e.lado"
            :data-visitado="e.visitado"
            :data-seleccionado="e.seleccionado"
            @click="emit('seleccionar', e.id)"
          >
            <span
              class="grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold"
              :class="e.visitado ? 'bg-success text-white' : 'bg-white text-[#1b2a41]'"
            >
              <Check v-if="e.visitado" class="size-4" :stroke-width="3" />
              <template v-else>{{ e.numero }}</template>
            </span>
            <slot
              :id="e.id"
              name="etiqueta"
              :numero="e.numero"
              :visitado="e.visitado"
              :seleccionado="e.seleccionado"
            >
              <span class="min-w-0 flex-1">{{ e.etiqueta }}</span>
            </slot>
          </button>
        </div>
      </template>

      <div
        v-if="listo && !conEtiquetas"
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
        <template v-if="conEtiquetas">
          Arrastra para girar el modelo y usa la rueda para acercarlo. Cada etiqueta señala una
          parte: tócala o elige una en la lista.
        </template>
        <template v-else>
          Arrastra para girar el modelo y pellizca para acercarlo. Los números marcan las partes:
          tócalos o elige una en la lista.
        </template>
      </template>
      <template v-else-if="estado === 'cargando' || estado === 'detectando'">
        Preparando el modelo 3D. Mientras tanto puedes usar la lista de partes.
      </template>
      <template v-else>
        El modelo 3D no está disponible. Usa la lista de partes: es la misma actividad.
      </template>
    </p>

    <div
      v-if="listo && !sinControles"
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
