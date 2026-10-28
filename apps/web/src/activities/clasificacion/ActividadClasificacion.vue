<script setup lang="ts">
/**
 * Actividad `clasificacion`: arrastrar cada elemento de la bandeja a su categoría (una caja, o una celda de una
 * tabla). La usan la tabla «Compara el hueso cortical y el trabecular» (1.2: primero la tabla solo tiene los nombres
 * de las características y los títulos; los elementos están abajo y el estudiante los acomoda), «¿De qué linaje
 * proviene cada célula?» (2.1) y «¿En qué compartimento ocurre cada evento?» (3.3, con dibujos).
 *
 * Tres formas de hacer lo mismo (regla R1: la alternativa no es un modo aparte): arrastrar con el ratón o el dedo,
 * tocar un elemento y luego su categoría, o con teclado (Enter para elegir, Tab hasta la categoría y Enter).
 *
 *  - Soltar en la categoría correcta: el elemento queda colocado (con su explicación, si la trae) y se emite
 *    `clasifica_elemento` correcta.
 *  - Soltar en una equivocada: vuelve a la bandeja, cuenta un error de ese elemento y se explica por qué (su
 *    `explicacion` o la retroalimentación incorrecta); `clasifica_elemento` incorrecta.
 *  - Soltar fuera de toda categoría no cuenta.
 *  - Al colocar todos: precisión = aciertos / (aciertos + errores), `completada` y el mensaje final.
 *
 * Contrato (activities/types.ts): progreso agrupado con `crearEmisorProgreso` y cerrado al completar, intentos con
 * `intentoInicial` (y recalculados si el estado del servidor llega tarde, mientras el estudiante no haya hecho
 * nada), instantánea validada contra la actividad, modo `revisar` con las respuestas correctas y sin eventos.
 */
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { Check, Info, RotateCcw, X } from '@lucide/vue';
import TextoRico from '@/components/modulo/TextoRico.vue';
import { Button } from '@/components/ui/button';
import { intentoInicial } from '@/activities/types';
import type {
  EmitsActividadClasificacion,
  ProgresoActividad,
  PropsActividadClasificacion,
} from '@/activities/types';
import { renderizarLinea, textoPlanoDeMarkdown } from '@/content/markdown';
import { crearEmisorProgreso } from '@/content/progreso';
import { calcularPuntaje, precisionPorConteo, textoRetroalimentacion } from '@/content/scoring';
import type { CategoriaClasificacion } from '@/content/schema';
import {
  armarTabla,
  construirDetalle,
  crearInstantanea,
  derivarSemilla,
  leerInstantanea,
  ordenBandeja,
} from './logica';

const props = withDefaults(defineProps<PropsActividadClasificacion>(), {
  modo: 'jugar',
  estadoPrevio: undefined,
});
const emit = defineEmits<EmitsActividadClasificacion>();

const uid = useId();
const jugando = computed(() => props.modo === 'jugar');
const config = computed(() => props.actividad.config);
const elementos = computed(() => config.value.elementos);
const total = computed(() => elementos.value.length);
const tabla = computed(() =>
  config.value.disposicion === 'tabla' ? armarTabla(config.value.categorias) : null,
);

/** HTML de una línea de Markdown, sin enlaces (dentro de un botón no puede haber otro control). */
function linea(texto: string): string {
  return renderizarLinea(texto)
    .replace(/<a\b[^>]*>/g, '')
    .replace(/<\/a>/g, '');
}

/* ---- estado del intento ---- */

const intentos = ref(intentoInicial(props.estadoPrevio));
const semilla = ref(derivarSemilla(props.actividad.id, intentos.value));
const colocados = ref<number[]>([]);
const errores = ref<number[]>(elementos.value.map(() => 0));
const seleccion = ref<number | null>(null);
const mensaje = ref<{ tipo: 'acierto' | 'error' | 'info'; texto: string } | null>(null);
const completada = ref(false);
const resultado = ref<{ puntaje: number; precision: number } | null>(null);
/** El estudiante ya hizo algo: un estado previo tardío ya no reemplaza el intento. */
const interactuo = ref(false);

const orden = computed(() =>
  ordenBandeja(total.value, config.value.barajar !== false, semilla.value),
);
const enBandeja = computed(() => orden.value.filter((i) => !colocados.value.includes(i)));
const totalErrores = computed(() => errores.value.reduce((a, b) => a + b, 0));

function indiceCategoria(id: string): number {
  return config.value.categorias.findIndex((c) => c.id === id);
}
/** Elementos colocados en cada categoría (en revisar, todos en su sitio). */
function colocadosEn(categoria: CategoriaClasificacion): number[] {
  const lista = jugando.value ? colocados.value : elementos.value.map((_, i) => i);
  return lista.filter((i) => elementos.value[i]?.categoria === categoria.id);
}

function aplicarEstadoPrevio(): void {
  intentos.value = intentoInicial(props.estadoPrevio);
  const previo = leerInstantanea(props.actividad, props.estadoPrevio?.progreso?.instantanea);
  const mismoIntento = props.estadoPrevio?.progreso?.intentos === intentos.value;
  if (previo && mismoIntento) {
    semilla.value = previo.semilla;
    colocados.value = previo.colocados;
    errores.value = previo.errores;
  } else {
    semilla.value = derivarSemilla(props.actividad.id, intentos.value);
    colocados.value = [];
    errores.value = elementos.value.map(() => 0);
  }
}
if (jugando.value) aplicarEstadoPrevio();
watch(
  () => props.estadoPrevio,
  () => {
    if (jugando.value && !interactuo.value && !completada.value) aplicarEstadoPrevio();
  },
  { deep: true },
);

/* ---- eventos ---- */

const emisor = crearEmisorProgreso<ProgresoActividad>((p) => emit('progreso', p));
onBeforeUnmount(() => emisor.vaciar());

function emitirProgreso(): void {
  emisor.emitir({
    avance: total.value === 0 ? 0 : colocados.value.length / total.value,
    intentos: intentos.value,
    instantanea: crearInstantanea({
      semilla: semilla.value,
      colocados: colocados.value,
      errores: errores.value,
    }),
  });
}

function completar(): void {
  const precision = precisionPorConteo(total.value, totalErrores.value);
  const puntaje = calcularPuntaje(props.actividad, { precision, intentos: intentos.value });
  completada.value = true;
  resultado.value = { puntaje, precision };
  emisor.cerrar();
  emit('completada', {
    puntaje,
    intentos: intentos.value,
    precision,
    detalle: construirDetalle(props.actividad, errores.value),
  });
}

/** Intenta colocar el elemento `i` en la categoría `idCategoria`. */
function colocar(i: number, idCategoria: string): void {
  if (!jugando.value || completada.value || colocados.value.includes(i)) return;
  const elemento = elementos.value[i];
  const categoria = config.value.categorias[indiceCategoria(idCategoria)];
  if (!elemento || !categoria) return;
  interactuo.value = true;
  seleccion.value = null;
  const correcta = elemento.categoria === idCategoria;
  emit('interaccion', {
    accion: 'clasifica_elemento',
    objeto: elemento.id,
    resultado: correcta ? 'correcta' : 'incorrecta',
  });
  const nombre = textoPlanoDeMarkdown(elemento.texto);
  if (correcta) {
    colocados.value = [...colocados.value, i];
    mensaje.value = {
      tipo: 'acierto',
      texto: `Correcto: «${nombre}» va en ${categoria.etiqueta}.${elemento.explicacion ? ` ${textoPlanoDeMarkdown(elemento.explicacion)}` : ''}`,
    };
  } else {
    errores.value = errores.value.map((n, k) => (k === i ? n + 1 : n));
    const porque = elemento.explicacion ?? props.actividad.retroalimentacion.incorrecta ?? '';
    mensaje.value = {
      tipo: 'error',
      texto: `«${nombre}» no va en ${categoria.etiqueta}. ${textoPlanoDeMarkdown(porque)}`.trim(),
    };
  }
  emitirProgreso();
  if (colocados.value.length === total.value) completar();
}

function elegir(i: number): void {
  if (!jugando.value || completada.value) return;
  seleccion.value = seleccion.value === i ? null : i;
  mensaje.value =
    seleccion.value === null
      ? null
      : {
          tipo: 'info',
          texto: `Elegiste «${textoPlanoDeMarkdown(elementos.value[i]?.texto ?? '')}». Ahora toca su ${tabla.value ? 'celda' : 'categoría'}.`,
        };
}

function alTocarCategoria(id: string): void {
  if (seleccion.value === null) {
    if (jugando.value && !completada.value) {
      mensaje.value = { tipo: 'info', texto: 'Primero elige un elemento de abajo.' };
    }
    return;
  }
  colocar(seleccion.value, id);
}

function repetir(): void {
  intentos.value += 1;
  semilla.value = derivarSemilla(props.actividad.id, intentos.value);
  colocados.value = [];
  errores.value = elementos.value.map(() => 0);
  seleccion.value = null;
  mensaje.value = null;
  completada.value = false;
  resultado.value = null;
  interactuo.value = true;
  emisor.reabrir();
  emit('interaccion', { accion: 'reinicia_actividad' });
  emitirProgreso();
}

/* ---- arrastre con puntero (ratón y dedo) ---- */

const arrastre = ref<{ i: number; x: number; y: number; activo: boolean } | null>(null);
let origen: { x: number; y: number } | null = null;
const objetivo = ref<string | null>(null);

function categoriaBajo(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>(`[data-zona="${uid}"]`);
  return el?.dataset.categoria ?? null;
}
function alPresionar(e: PointerEvent, i: number): void {
  if (!jugando.value || completada.value || e.button > 0) return;
  origen = { x: e.clientX, y: e.clientY };
  arrastre.value = { i, x: e.clientX, y: e.clientY, activo: false };
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
}
function alMover(e: PointerEvent): void {
  const a = arrastre.value;
  if (!a || !origen) return;
  const lejos = Math.hypot(e.clientX - origen.x, e.clientY - origen.y) > 6;
  arrastre.value = { ...a, x: e.clientX, y: e.clientY, activo: a.activo || lejos };
  if (arrastre.value.activo) objetivo.value = categoriaBajo(e.clientX, e.clientY);
}
function alSoltar(e: PointerEvent): void {
  const a = arrastre.value;
  arrastre.value = null;
  origen = null;
  objetivo.value = null;
  if (!a) return;
  if (!a.activo) {
    elegir(a.i);
    return;
  }
  const destino = categoriaBajo(e.clientX, e.clientY);
  if (destino) colocar(a.i, destino);
}
function alCancelar(): void {
  arrastre.value = null;
  origen = null;
  objetivo.value = null;
}

const textoFinal = computed(() =>
  resultado.value ? textoRetroalimentacion(props.actividad, resultado.value.precision) : '',
);
</script>

<template>
  <div class="space-y-4" :data-actividad="actividad.id" data-testid="actividad-clasificacion">
    <header class="space-y-1">
      <h3 class="font-serif text-xl font-semibold">{{ actividad.titulo }}</h3>
      <!-- eslint-disable-next-line vue/no-v-html -- Markdown saneado (renderizarLinea, regla R10) -->
      <p class="text-muted-foreground text-sm" v-html="linea(actividad.instrucciones)" />
      <p v-if="jugando" class="text-sm font-semibold tabular-nums">
        Colocados: {{ colocados.length }} de {{ total }}
        <span v-if="totalErrores > 0" class="text-muted-foreground font-normal">
          · {{ totalErrores }} {{ totalErrores === 1 ? 'error' : 'errores' }}
        </span>
      </p>
    </header>

    <!-- Tabla: cada celda es una categoría -->
    <div v-if="tabla" class="overflow-x-auto rounded-xl border">
      <table class="w-full min-w-[36rem] border-collapse text-sm">
        <thead>
          <tr class="bg-muted/60">
            <th scope="col" class="w-1/5 px-3 py-2 text-left font-semibold">
              {{ config.titulo_filas ?? '' }}
            </th>
            <th
              v-for="col in tabla.columnas"
              :key="col"
              scope="col"
              class="px-3 py-2 text-left font-semibold"
            >
              {{ col }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fila in tabla.filas" :key="fila.etiqueta" class="border-t">
            <th scope="row" class="px-3 py-2 text-left align-top font-semibold">
              {{ fila.etiqueta }}
            </th>
            <td v-for="(celda, k) in fila.celdas" :key="k" class="p-1.5 align-top">
              <button
                v-if="celda"
                type="button"
                class="zona focus-visible:ring-ring flex min-h-14 w-full flex-col items-stretch justify-center gap-1.5 rounded-lg border-2 border-dashed p-2 text-left outline-none focus-visible:ring-2"
                :class="[
                  objetivo === celda.id ? 'border-primary bg-primary/10' : '',
                  seleccion !== null && objetivo !== celda.id ? 'border-primary/50' : '',
                ]"
                :data-zona="uid"
                :data-categoria="celda.id"
                :aria-label="`Colocar en ${celda.etiqueta}`"
                :disabled="!jugando || completada"
                @click="alTocarCategoria(celda.id)"
              >
                <span
                  v-for="i in colocadosEn(celda)"
                  :key="i"
                  class="bg-success/15 text-foreground flex items-start gap-1.5 rounded-md px-2 py-1"
                >
                  <Check class="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <!-- eslint-disable-next-line vue/no-v-html -- Markdown saneado (R10) -->
                  <span v-html="linea(elementos[i]!.texto)" />
                </span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Cajas: una por categoría, con su dibujo si lo trae -->
    <div
      v-else
      class="grid gap-3"
      :class="config.categorias.length <= 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3'"
    >
      <button
        v-for="c in config.categorias"
        :key="c.id"
        type="button"
        class="zona bg-card focus-visible:ring-ring flex min-h-28 flex-col gap-2 rounded-xl border-2 border-dashed p-3 text-left outline-none focus-visible:ring-2"
        :class="[
          objetivo === c.id ? 'border-primary bg-primary/10' : '',
          seleccion !== null && objetivo !== c.id ? 'border-primary/50' : '',
        ]"
        :data-zona="uid"
        :data-categoria="c.id"
        :aria-label="`Colocar en ${c.etiqueta}`"
        :disabled="!jugando || completada"
        @click="alTocarCategoria(c.id)"
      >
        <span class="flex items-start gap-3">
          <img
            v-if="c.imagen"
            :src="c.imagen"
            alt=""
            aria-hidden="true"
            draggable="false"
            class="bg-background h-24 w-32 shrink-0 rounded-md border object-contain"
          />
          <span class="min-w-0">
            <span class="block font-semibold">{{ c.etiqueta }}</span>
            <TextoRico
              v-if="c.descripcion"
              :texto="c.descripcion"
              modo="linea"
              class="text-muted-foreground block text-sm"
            />
          </span>
        </span>
        <span
          v-for="i in colocadosEn(c)"
          :key="i"
          class="bg-success/15 flex items-start gap-1.5 rounded-md px-2 py-1 text-sm"
        >
          <Check class="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <!-- eslint-disable-next-line vue/no-v-html -- Markdown saneado (R10) -->
          <span v-html="linea(elementos[i]!.texto)" />
        </span>
      </button>
    </div>

    <!-- Mensaje de la última acción -->
    <p
      class="flex min-h-6 items-start gap-2 text-sm"
      :class="
        mensaje?.tipo === 'error'
          ? 'text-destructive'
          : mensaje?.tipo === 'acierto'
            ? 'text-success'
            : 'text-muted-foreground'
      "
      aria-live="polite"
      data-testid="mensaje-clasificacion"
    >
      <template v-if="mensaje">
        <X v-if="mensaje.tipo === 'error'" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <Check
          v-else-if="mensaje.tipo === 'acierto'"
          class="mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        <Info v-else class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ mensaje.texto }}</span>
      </template>
    </p>

    <!-- Bandeja -->
    <section v-if="jugando && !completada" :aria-labelledby="`${uid}-bandeja`" class="space-y-2">
      <h4 :id="`${uid}-bandeja`" class="text-sm font-semibold">
        {{ tabla ? 'Características para acomodar' : 'Elementos para clasificar' }}
      </h4>
      <ul class="flex flex-wrap gap-2">
        <li v-for="i in enBandeja" :key="i">
          <button
            type="button"
            class="pieza bg-card focus-visible:ring-ring min-h-11 rounded-lg border px-3 py-2 text-left text-sm shadow-sm outline-none select-none focus-visible:ring-2"
            :class="
              seleccion === i
                ? 'border-primary bg-primary/10 ring-primary ring-2'
                : 'hover:bg-accent'
            "
            :aria-pressed="seleccion === i"
            :data-elemento="elementos[i]!.id"
            @pointerdown="alPresionar($event, i)"
            @pointermove="alMover"
            @pointerup="alSoltar"
            @pointercancel="alCancelar"
            @keydown.enter.prevent="elegir(i)"
            @keydown.space.prevent="elegir(i)"
          >
            <!-- eslint-disable-next-line vue/no-v-html -- Markdown saneado (R10) -->
            <span v-html="linea(elementos[i]!.texto)" />
          </button>
        </li>
      </ul>
    </section>

    <!-- Pieza que sigue al puntero mientras se arrastra -->
    <div
      v-if="arrastre?.activo"
      class="bg-card border-primary pointer-events-none fixed z-50 max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 px-3 py-2 text-sm shadow-xl"
      :style="{ left: `${arrastre.x}px`, top: `${arrastre.y}px` }"
      aria-hidden="true"
    >
      <!-- eslint-disable-next-line vue/no-v-html -- Markdown saneado (R10) -->
      <span v-html="linea(elementos[arrastre.i]!.texto)" />
    </div>

    <!-- Resultado -->
    <section
      v-if="completada && resultado"
      class="bg-card space-y-2 rounded-xl border p-4"
      aria-live="polite"
      data-testid="resultado-clasificacion"
    >
      <p class="font-semibold">
        Completaste la actividad: {{ resultado.puntaje }} de {{ actividad.puntaje_max }} puntos ·
        {{ Math.round(resultado.precision * 100) }} % de acierto
      </p>
      <!-- eslint-disable-next-line vue/no-v-html -- Markdown saneado (R10) -->
      <p class="text-sm" v-html="linea(textoFinal)" />
      <p
        v-if="actividad.aprobacion_min && resultado.precision < actividad.aprobacion_min"
        class="text-sm"
      >
        Necesitas {{ Math.round(actividad.aprobacion_min * 100) }} % de acierto para seguir;
        inténtalo de nuevo.
      </p>
      <Button variant="outline" size="sm" @click="repetir">
        <RotateCcw class="size-4" aria-hidden="true" />
        Repetir
      </Button>
    </section>
  </div>
</template>

<style scoped>
/* Solo la pieza que se arrastra bloquea el desplazamiento táctil (regla R8). */
.pieza {
  touch-action: none;
  cursor: grab;
}
.zona:disabled {
  cursor: default;
}
</style>
