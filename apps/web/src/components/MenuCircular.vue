<script setup lang="ts">
/**
 * Menú circular con los seis módulos (F1-10). AppShell lo monta sin props y él mismo se
 * posiciona con `position: fixed`:
 *
 *   escritorio  botón circular fijo al borde izquierdo, a media altura; al abrirse, los
 *               nodos salen en un semicírculo hacia la derecha.
 *   móvil       botón flotante abajo a la izquierda; al abrirse, los nodos salen en un
 *               cuarto de círculo hacia arriba, con un velo que atenúa el contenido. Se cierra
 *               al elegir un módulo, con Escape, tocando fuera o al salir del menú con Tab,
 *               así que nunca tapa el contenido de forma permanente.
 *
 * Patrón de accesibilidad: es NAVEGACIÓN, no un menú de aplicación. Por eso usa el patrón de
 * "navegación con botón de despliegue" de la guía WAI-ARIA (`<nav>` + botón con
 * `aria-expanded` + lista de enlaces reales) y no `role="menu"`/`menuitem`, que sustituiría
 * la semántica de enlace y pide un manejo de teclado propio de aplicaciones. Encima se añade
 * el teclado de un menú radial: flechas (con vuelta), Inicio/Fin y Escape.
 *
 * La geometría vive en `menu/geometria.ts` (funciones puras) y el estado de cada módulo en
 * `menu/estados.ts`; el dibujo de cada nodo, en `menu/NodoModulo.vue`.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { useRoute } from 'vue-router';
import { usePreferredReducedMotion, useWindowSize } from '@vueuse/core';
import { Bone, X } from '@lucide/vue';
import { useAccesoModulos } from '@/components/modulo/useAccesoModulos';
import { MODULOS } from '@/data/modulos';
import { useProgresoStore } from '@/stores/progreso';
import { detenerNodo, entrarNodo, salirNodo } from '@/components/menu/animacion';
import { precargarGsap } from '@/components/menu/gsapPerezoso';
import { estadoDelModulo, moduloDeLaRuta } from '@/components/menu/estados';
import {
  CENTRO_X,
  TAM_NODO,
  calcularDisposicion,
  sectorAnular,
  segmentosDeAnillo,
} from '@/components/menu/geometria';
import NodoModulo from '@/components/menu/NodoModulo.vue';

const progreso = useProgresoStore();
const route = useRoute();
// Mismo bloqueo que la página del módulo y la portada; el rol docente no tiene bloqueo.
const { bloqueoSecuencial } = useAccesoModulos();
const { width, height } = useWindowSize({ initialWidth: 1024, initialHeight: 768 });
const movimiento = usePreferredReducedMotion();
const reducido = computed(() => movimiento.value === 'reduce');

const abierto = ref(false);
const raiz = ref<HTMLElement | null>(null);
const control = ref<HTMLButtonElement | null>(null);
const idLista = useId();

const disposicion = computed(() =>
  calcularDisposicion({ ancho: width.value, alto: height.value, total: MODULOS.length }),
);
const moduloActual = computed(() => moduloDeLaRuta(route));

const nodos = computed(() =>
  MODULOS.map((modulo, i) => ({
    modulo,
    posicion: disposicion.value.nodos[i]!,
    anchoMaximo: disposicion.value.anchoMaximo[i]!,
    estado: estadoDelModulo(modulo.numero, {
      moduloActual: moduloActual.value,
      completados: progreso.modulosCompletados,
      bloqueoSecuencial: bloqueoSecuencial.value,
    }),
  })),
);
// La lista se vacía al cerrar: <TransitionGroup> anima la salida de cada nodo antes de quitarlo.
const nodosVisibles = computed(() => (abierto.value ? nodos.value : []));

const sector = computed(() =>
  sectorAnular(
    disposicion.value.sector.interior,
    disposicion.value.sector.exterior,
    disposicion.value.arco.desde,
    disposicion.value.arco.hasta,
  ),
);

// Anillo de progreso alrededor del control: un segmento por módulo, relleno si está completado.
const segmentosAnillo = segmentosDeAnillo(MODULOS.length, 33, 36);
const completados = computed(() => progreso.modulosCompletados.length);
const etiquetaControl = computed(
  () => `Menú de módulos, ${completados.value} de ${MODULOS.length} completados`,
);

// El centro del control queda a 2.25rem del borde izquierdo; el vertical depende del modo.
// Se respetan las áreas seguras (muescas, barra de gestos).
const estiloRaiz = computed(() => {
  const izquierda = `calc(${CENTRO_X / 16}rem + var(--area-segura-izquierda))`;
  return disposicion.value.modo === 'escritorio'
    ? { left: izquierda, top: '50%' }
    : { left: izquierda, bottom: 'calc(2.75rem + var(--area-segura-abajo))' };
});

/** Píxeles con hasta dos decimales (evita ruido de coma flotante como 19.409999999999997). */
const px = (n: number): string => `${Math.round(n * 100) / 100}px`;

function elementosNodo(): HTMLElement[] {
  return Array.from(raiz.value?.querySelectorAll<HTMLElement>('[data-nodo-menu]') ?? []);
}

type FocoInicial = 'activo' | 'primero' | 'ultimo';

/** Abre el menú y lleva el foco a un nodo: el del módulo abierto, el primero o el último. */
async function abrir(foco: FocoInicial = 'activo'): Promise<void> {
  abierto.value = true;
  await nextTick();
  const items = elementosNodo();
  let destino: HTMLElement | undefined;
  if (foco === 'ultimo') destino = items[items.length - 1];
  else if (foco === 'activo') {
    destino = items.find((el) => el.dataset.modulo === String(moduloActual.value));
  }
  (destino ?? items[0])?.focus({ preventScroll: true });
}

function cerrar(devolverFoco = false): void {
  if (!abierto.value) return;
  abierto.value = false;
  if (devolverFoco) control.value?.focus({ preventScroll: true });
}

function alternar(): void {
  if (abierto.value) cerrar();
  else void abrir();
}

function moverFoco(tecla: string): boolean {
  const items = elementosNodo();
  if (items.length === 0) return false;
  const actual = items.indexOf(document.activeElement as HTMLElement);
  let destino: number;
  switch (tecla) {
    case 'ArrowDown':
    case 'ArrowRight':
      destino = actual < 0 ? 0 : (actual + 1) % items.length;
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      destino = actual < 0 ? items.length - 1 : (actual - 1 + items.length) % items.length;
      break;
    case 'Home':
      destino = 0;
      break;
    case 'End':
      destino = items.length - 1;
      break;
    default:
      return false;
  }
  items[destino]!.focus({ preventScroll: true });
  return true;
}

function alPulsarTecla(e: KeyboardEvent): void {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (abierto.value) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cerrar(true);
    } else if (moverFoco(e.key)) {
      e.preventDefault();
    }
    return;
  }
  // Cerrado, las flechas sobre el botón lo abren (como un botón de menú).
  if (e.target !== control.value) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    void abrir('primero');
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    void abrir('ultimo');
  }
}

// Si el foco sale del menú (Tab hacia el contenido, por ejemplo) se cierra: es una
// superposición temporal y no debe quedar abierta detrás del foco.
function alPerderFoco(e: FocusEvent): void {
  if (!abierto.value) return;
  const siguiente = e.relatedTarget;
  if (siguiente instanceof Node && !raiz.value?.contains(siguiente)) cerrar();
}

// Al cambiar de página se cierra sin mover el foco: AppShell lo lleva al contenido.
watch(
  () => route.fullPath,
  () => cerrar(),
);

// GSAP se descarga aparte, sin bloquear el pintado, y solo si se va a usar.
onMounted(() => {
  if (!reducido.value) void precargarGsap();
});

onBeforeUnmount(() => {
  raiz.value?.querySelectorAll('li').forEach((li) => detenerNodo(li));
});
</script>

<template>
  <nav
    ref="raiz"
    aria-label="Módulos"
    class="fixed size-0"
    :class="abierto ? 'z-50' : 'z-40'"
    :style="estiloRaiz"
    :data-modo="disposicion.modo"
    data-testid="menu-circular"
    @keydown="alPulsarTecla"
    @focusout="alPerderFoco"
  >
    <!-- Velo: atenúa el contenido y cierra el menú al tocar fuera. Decorativo para lectores. -->
    <Transition name="menu-velo">
      <div
        v-if="abierto"
        class="bg-background/60 fixed inset-0"
        aria-hidden="true"
        data-testid="menu-velo"
        @click="cerrar()"
      />
    </Transition>

    <!-- Fondo en semicírculo (sector anular). Origen del SVG = centro del control. -->
    <Transition name="menu-sector">
      <svg
        v-if="abierto"
        class="pointer-events-none absolute top-0 left-0 overflow-visible"
        width="1"
        height="1"
        aria-hidden="true"
        focusable="false"
      >
        <path :d="sector" class="fill-card stroke-border opacity-90" stroke-width="1.5" />
      </svg>
    </Transition>

    <button
      ref="control"
      type="button"
      class="bg-primary text-primary-foreground absolute -top-7 -left-7 grid size-14 place-items-center rounded-full shadow-lg"
      :aria-expanded="abierto"
      :aria-controls="idLista"
      data-testid="menu-control"
      @click="alternar"
    >
      <span class="sr-only">{{ etiquetaControl }}</span>
      <X v-if="abierto" class="size-6" aria-hidden="true" />
      <Bone v-else class="size-6" aria-hidden="true" />

      <!-- Anillo de progreso: segmento grueso y verde = módulo completado; fino = pendiente. -->
      <svg
        class="pointer-events-none absolute -inset-2 size-[4.5rem]"
        viewBox="0 0 72 72"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          v-for="(d, i) in segmentosAnillo"
          :key="i"
          :d="d"
          stroke-linecap="round"
          :class="nodos[i]?.estado.completado ? 'stroke-success' : 'stroke-input'"
          :stroke-width="nodos[i]?.estado.completado ? 4.5 : 2"
          data-testid="menu-anillo"
          :data-completado="nodos[i]?.estado.completado"
        />
      </svg>
    </button>

    <TransitionGroup
      :id="idLista"
      tag="ul"
      role="list"
      :css="false"
      class="m-0 list-none p-0"
      @enter="(el, hecho) => entrarNodo(el, hecho, reducido)"
      @leave="(el, hecho) => salirNodo(el, hecho, reducido)"
      @enter-cancelled="detenerNodo"
      @leave-cancelled="detenerNodo"
    >
      <li
        v-for="n in nodosVisibles"
        :key="n.modulo.numero"
        class="absolute"
        :style="{
          left: px(n.posicion.x - TAM_NODO / 2),
          top: px(n.posicion.y - TAM_NODO / 2),
          width: 'max-content',
          maxWidth: `${n.anchoMaximo}px`,
        }"
        :data-x="n.posicion.x"
        :data-y="n.posicion.y"
        :data-indice="n.posicion.indice"
        :data-total="nodos.length"
      >
        <NodoModulo :modulo="n.modulo" :estado="n.estado" @elegir="cerrar()" />
      </li>
    </TransitionGroup>
  </nav>
</template>

<style scoped>
/* Solo opacidad y escala; con prefers-reduced-motion la regla global de style.css reduce
   las transiciones a 0.01 ms. */
.menu-velo-enter-active,
.menu-velo-leave-active {
  transition: opacity 0.2s ease;
}
.menu-velo-enter-from,
.menu-velo-leave-to {
  opacity: 0;
}
.menu-sector-enter-active,
.menu-sector-leave-active {
  transform-origin: 0 0;
  transition:
    opacity 0.2s ease,
    transform 0.22s ease;
}
.menu-sector-enter-from,
.menu-sector-leave-to {
  opacity: 0;
  transform: scale(0.7);
}
</style>
