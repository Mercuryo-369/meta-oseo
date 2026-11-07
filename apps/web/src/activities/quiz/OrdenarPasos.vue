<script setup lang="ts">
/**
 * Lista de pasos que el estudiante reordena (formato `ordenar` del quiz).
 *
 * Dos formas de hacer lo mismo, siempre disponibles (regla R1 del contrato):
 *  - Botones "Subir" y "Bajar" de cada paso: son botones nativos de 44 px, con nombre accesible
 *    ("Subir el paso «Activación»") y funcionan con teclado, lector de pantalla y toque.
 *  - Arrastre por el asa de la izquierda con eventos de puntero (ratón, dedo o lápiz). `touch-action:
 *    none` va SOLO en el asa (R8): el resto de la fila deja desplazar la página con el dedo. Los
 *    eventos van en el propio asa con captura de puntero, sin escuchas en `document`, así que al
 *    desmontar no queda nada colgado.
 *
 * El componente no conoce la respuesta correcta: solo recibe el orden actual (`modelValue`, una
 * lista de claves que indexan `textos`) y los textos. Las claves no llegan al DOM; después de
 * comprobar, el padre pasa `marcas` (una por posición) para señalar cada paso con icono y texto.
 */
import { computed, nextTick, ref } from 'vue';
import { Check, ChevronDown, ChevronUp, GripVertical, X } from '@lucide/vue';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import TextoLinea from './TextoLinea.vue';

const props = withDefaults(
  defineProps<{
    /** Orden actual: `modelValue[k]` es la clave (índice en `textos`) del paso en el lugar k. */
    modelValue: readonly number[];
    /** Texto (Markdown de línea) de cada paso, indexado por clave. */
    textos: readonly string[];
    /** Tras comprobar: no se puede reordenar. */
    deshabilitado?: boolean;
    /** Tras comprobar: `true` si el paso de esa posición está en su lugar. */
    marcas?: readonly boolean[] | null;
    /** Sin transiciones de movimiento (prefers-reduced-motion). */
    movimientoReducido?: boolean;
  }>(),
  { deshabilitado: false, marcas: null, movimientoReducido: false },
);

const emit = defineEmits<{
  'update:modelValue': [orden: number[]];
  /** Frase para la región `aria-live` del padre ("«Activación» ahora está en la posición 2 de 4"). */
  anuncio: [texto: string];
  /** El estudiante tocó algo (el padre deja de aceptar un estado previo tardío). */
  editando: [];
}>();

const raiz = ref<HTMLOListElement | null>(null);

const planos = computed(() => props.textos.map((t) => textoPlanoDeMarkdown(t ?? '')));
const total = computed(() => props.modelValue.length);

function nombreDelPaso(posicion: number): string {
  return planos.value[props.modelValue[posicion] as number] ?? '';
}

/* ---- botones ---- */

function mover(desde: number, hasta: number, botonAlTerminar: 'subir' | 'bajar' | null): void {
  if (props.deshabilitado || hasta < 0 || hasta >= total.value || desde === hasta) return;
  const nuevo = [...props.modelValue];
  const [paso] = nuevo.splice(desde, 1);
  nuevo.splice(hasta, 0, paso as number);
  emit('editando');
  emit('update:modelValue', nuevo);
  const nombre = planos.value[paso as number] ?? '';
  emit('anuncio', `«${nombre}» ahora está en la posición ${hasta + 1} de ${total.value}.`);
  if (botonAlTerminar) void devolverFoco(hasta, botonAlTerminar);
}

/**
 * Al mover un paso, el navegador puede soltar el foco del botón (el nodo cambia de sitio). Se
 * devuelve al mismo botón del paso en su nueva posición, o al opuesto si ese ya no se puede usar
 * (el primero no sube, el último no baja).
 */
async function devolverFoco(posicion: number, boton: 'subir' | 'bajar'): Promise<void> {
  await nextTick();
  const fila = raiz.value?.children[posicion];
  if (!fila) return;
  const elegido = fila.querySelector<HTMLButtonElement>(`button[data-accion="${boton}"]`);
  const otro = fila.querySelector<HTMLButtonElement>(
    `button[data-accion="${boton === 'subir' ? 'bajar' : 'subir'}"]`,
  );
  (elegido && !elegido.disabled ? elegido : otro)?.focus();
}

/* ---- arrastre ---- */

/** Separación entre filas (Tailwind `gap-2`), en px: parte del desplazamiento de las demás. */
const SEPARACION_PX = 8;

interface Arrastre {
  desde: number;
  hasta: number;
  dy: number;
  y0: number;
  pointerId: number;
  /** Centros y alturas de las filas al empezar (no cambian mientras se arrastra). */
  filas: { centro: number; alto: number }[];
}

const arrastre = ref<Arrastre | null>(null);

function alBajarElPuntero(evento: PointerEvent, posicion: number): void {
  if (props.deshabilitado || arrastre.value) return;
  if (evento.pointerType === 'mouse' && evento.button !== 0) return;
  const filas = Array.from(raiz.value?.children ?? []).map((fila) => {
    const r = fila.getBoundingClientRect();
    return { centro: r.top + r.height / 2, alto: r.height };
  });
  if (posicion >= filas.length) return;
  arrastre.value = {
    desde: posicion,
    hasta: posicion,
    dy: 0,
    y0: evento.clientY,
    pointerId: evento.pointerId,
    filas,
  };
  try {
    (evento.currentTarget as HTMLElement | null)?.setPointerCapture?.(evento.pointerId);
  } catch {
    // Sin captura de puntero (entornos antiguos): los eventos siguen llegando mientras esté encima.
  }
  emit('editando');
}

function alMoverElPuntero(evento: PointerEvent): void {
  const a = arrastre.value;
  if (!a || evento.pointerId !== a.pointerId) return;
  const dy = evento.clientY - a.y0;
  const centro = (a.filas[a.desde]?.centro ?? 0) + dy;
  // Lugar final = cuántas de las OTRAS filas quedan por encima del centro de la arrastrada.
  let hasta = 0;
  a.filas.forEach((fila, i) => {
    if (i !== a.desde && fila.centro < centro) hasta++;
  });
  arrastre.value = { ...a, dy, hasta };
}

function alSoltarElPuntero(evento: PointerEvent): void {
  const a = arrastre.value;
  if (!a || evento.pointerId !== a.pointerId) return;
  arrastre.value = null;
  mover(a.desde, a.hasta, null);
}

/** Cancelado por el sistema (llamada, gesto del navegador): vuelve todo a su sitio. */
function alCancelarElPuntero(evento: PointerEvent): void {
  const a = arrastre.value;
  if (!a || evento.pointerId !== a.pointerId) return;
  arrastre.value = null;
}

/** Desplazamiento visual de cada fila mientras se arrastra (la lista real no cambia hasta soltar). */
function estiloDeFila(posicion: number): Record<string, string> {
  const a = arrastre.value;
  if (!a) return {};
  if (posicion === a.desde) {
    return {
      transform: `translateY(${a.dy}px)`,
      transition: 'none',
      zIndex: '10',
      position: 'relative',
    };
  }
  const paso = (a.filas[a.desde]?.alto ?? 0) + SEPARACION_PX;
  let desplazamiento = 0;
  if (a.desde < a.hasta && posicion > a.desde && posicion <= a.hasta) desplazamiento = -paso;
  if (a.desde > a.hasta && posicion < a.desde && posicion >= a.hasta) desplazamiento = paso;
  return desplazamiento === 0 ? {} : { transform: `translateY(${desplazamiento}px)` };
}
</script>

<template>
  <ol
    ref="raiz"
    role="list"
    class="m-0 flex list-none flex-col gap-2 p-0"
    aria-label="Pasos por ordenar"
    data-ordenar
  >
    <li
      v-for="(clave, posicion) in modelValue"
      :key="clave"
      class="bg-card border-input text-card-foreground flex min-h-11 items-stretch gap-1 rounded-xl border text-left select-none"
      :class="[
        movimientoReducido ? '' : 'transition-transform duration-150',
        arrastre?.desde === posicion ? 'shadow-lg ring-2 ring-[var(--ring)]' : '',
      ]"
      :style="estiloDeFila(posicion)"
      :data-arrastrando="arrastre?.desde === posicion ? 'true' : undefined"
    >
      <span
        v-if="!deshabilitado"
        aria-hidden="true"
        data-asa
        class="text-muted-foreground flex min-h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-l-xl"
        style="touch-action: none"
        @pointerdown="alBajarElPuntero($event, posicion)"
        @pointermove="alMoverElPuntero"
        @pointerup="alSoltarElPuntero"
        @pointercancel="alCancelarElPuntero"
        @lostpointercapture="alCancelarElPuntero"
      >
        <GripVertical class="size-5" aria-hidden="true" />
      </span>
      <div
        class="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2"
        :class="{ 'pl-3': deshabilitado }"
      >
        <div class="flex min-w-0 items-baseline gap-2">
          <span
            aria-hidden="true"
            class="text-muted-foreground shrink-0 text-sm font-semibold tabular-nums"
          >
            {{ posicion + 1 }}.
          </span>
          <TextoLinea :texto="textos[clave] ?? ''" class="min-w-0" />
        </div>
        <span
          v-if="marcas"
          class="flex items-center gap-1 text-sm font-semibold"
          :class="marcas[posicion] ? 'text-success' : 'text-destructive'"
        >
          <Check v-if="marcas[posicion]" class="size-4 shrink-0" aria-hidden="true" />
          <X v-else class="size-4 shrink-0" aria-hidden="true" />
          {{ marcas[posicion] ? 'En su lugar' : 'Fuera de lugar' }}
        </span>
      </div>
      <div v-if="!deshabilitado" class="flex shrink-0 items-center gap-1 pr-1">
        <button
          type="button"
          data-accion="subir"
          class="text-foreground hover:bg-secondary flex min-h-11 min-w-11 items-center justify-center rounded-lg disabled:opacity-40"
          :disabled="posicion === 0"
          :aria-label="`Subir el paso «${nombreDelPaso(posicion)}»`"
          @click="mover(posicion, posicion - 1, 'subir')"
        >
          <ChevronUp class="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-accion="bajar"
          class="text-foreground hover:bg-secondary flex min-h-11 min-w-11 items-center justify-center rounded-lg disabled:opacity-40"
          :disabled="posicion === modelValue.length - 1"
          :aria-label="`Bajar el paso «${nombreDelPaso(posicion)}»`"
          @click="mover(posicion, posicion + 1, 'bajar')"
        >
          <ChevronDown class="size-5" aria-hidden="true" />
        </button>
      </div>
    </li>
  </ol>
</template>
