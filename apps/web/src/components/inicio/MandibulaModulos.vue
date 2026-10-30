<script setup lang="ts">
/**
 * Mapa de los seis módulos sobre la mandíbula (pedido de la usuaria, 2026-10-27: «una mandíbula que muestre todos
 * los módulos y los avances», con una imagen de referencia: la mandíbula en vista oblicua, una tarjeta por módulo
 * unida con una línea a su punto y un círculo al centro). El modelo es la malla anatómica de BodyParts3D (la misma
 * de las exploraciones) y cada módulo es un punto anclado sobre el hueso, en orden de un cóndilo al otro.
 *
 * El avance que se muestra es el que guarda el servidor por módulo: bloqueado, listo para empezar, en curso (con la
 * sección en la que va) o completado. Las tarjetas sobre la escena son una ayuda visual (`aria-hidden`); la
 * alternativa accesible es el recorrido de pasos del inicio y, en pantallas estrechas (donde la escena muestra solo
 * números), la lista de debajo. Si el 3D no carga, la lista y el botón siguen funcionando.
 *
 * Disposición (revisión de la portada, 2026-10-29): en pantallas anchas la escena ocupa la columna derecha a todo el
 * alto de la ventana y la izquierda reúne la ranura `antes` (saludo), el avance global (el círculo de la referencia,
 * que ya no tapa el hueso), el módulo elegido con su botón y la ranura `despues` (nivel y reconocimiento). En
 * pantallas estrechas todo va en columna.
 */
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { ArrowRight, CircleCheck, Lock } from '@lucide/vue';
import { ANCLAS_PIEZAS_DERECHA } from '@/content/nodos3d';
import type { AnclaNodo } from '@/content/nodos3d';
import { estiloAcento, textoEstadoTarjeta } from '@/components/modulo/identidad';
import { usePasosModulos } from '@/components/modulo/usePasosModulos';
import { MODULOS } from '@/data/modulos';
import { useProgresoStore } from '@/stores/progreso';
import type { NodoEscena } from '@/scenes/nodosEscena';

// three y TresJS llegan solo cuando el inicio monta la escena.
const EscenaExploracion = defineAsyncComponent(() => import('@/scenes/EscenaExploracion.vue'));

const progreso = useProgresoStore();
const { estadoDe, siguiente, cargandoProgreso, completados } = usePasosModulos();

/** Lado izquierdo del sujeto: la misma pieza con `x` reflejada (la malla es simétrica). */
function izquierda(a: AnclaNodo | undefined): AnclaNodo | undefined {
  return a ? { ...a, x: 1 - a.x } : undefined;
}
/** Recorrido de un cóndilo al otro: 1 cóndilo D, 2 ángulo D, 3 cuerpo D, 4 cuerpo I, 5 ángulo I, 6 cóndilo I. */
const ANCLAS_RECORRIDO: readonly (AnclaNodo | undefined)[] = [
  ANCLAS_PIEZAS_DERECHA.condilo,
  ANCLAS_PIEZAS_DERECHA.angulo,
  ANCLAS_PIEZAS_DERECHA.cuerpo,
  izquierda(ANCLAS_PIEZAS_DERECHA.cuerpo),
  izquierda(ANCLAS_PIEZAS_DERECHA.angulo),
  izquierda(ANCLAS_PIEZAS_DERECHA.condilo),
];

/** «m2_3_osteocito» → «2.3». */
function numeroDeSeccion(id: string | null | undefined): string | null {
  const m = id ? /^m(\d)_(\d+)_/.exec(id) : null;
  return m ? `${m[1]}.${m[2]}` : null;
}

const items = computed(() =>
  MODULOS.map((m) => {
    const estado = cargandoProgreso.value ? 'disponible' : estadoDe(m.numero);
    const seccion = numeroDeSeccion(
      progreso.modulos.find((p) => p.modulo === m.numero)?.seccion_actual,
    );
    const avance =
      estado === 'completado'
        ? 'Completado'
        : estado === 'en_curso'
          ? seccion
            ? `En curso: vas en la ${seccion}`
            : 'En curso'
          : textoEstadoTarjeta(estado, m.numero);
    return { m, id: `modulo_${m.numero}`, estado, avance };
  }),
);
const porId = computed(() => new Map(items.value.map((it) => [it.id, it])));

const nodos = computed<NodoEscena[]>(() =>
  items.value.map((it, i) => ({
    id: it.id,
    etiqueta: `Módulo ${it.m.numero}: ${it.m.titulo}`,
    ancla: ANCLAS_RECORRIDO[i],
    vista: 'oblicua',
    zoom: 1,
  })),
);
const visitados = computed(() =>
  items.value.filter((it) => it.estado === 'completado').map((it) => it.id),
);

const seleccion = ref<string | null>(null);
watch(
  siguiente,
  (m) => {
    if (seleccion.value === null && m) seleccion.value = `modulo_${m.numero}`;
  },
  { immediate: true },
);
const elegido = computed(() => porId.value.get(seleccion.value ?? '') ?? items.value[0]);
const verbo = computed(() => {
  const e = elegido.value?.estado;
  return e === 'completado' ? 'Repasar' : e === 'en_curso' ? 'Continuar' : 'Abrir';
});
</script>

<template>
  <div
    class="flex flex-col gap-4 lg:grid lg:h-full lg:grid-cols-[minmax(20rem,25rem)_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-8"
    data-testid="mandibula-modulos"
  >
    <div class="lg:col-start-1 lg:row-start-1">
      <slot name="antes" />
    </div>

    <!-- Avance global: el círculo de la referencia, junto al texto (no sobre el hueso) -->
    <div class="flex items-center gap-4 lg:col-start-1 lg:row-start-2" data-testid="avance-global">
      <div
        class="grid size-20 shrink-0 place-items-center rounded-full bg-[#f0a37a]/90 text-center text-[#3a1d10] shadow-lg ring-4 ring-white/50"
        aria-hidden="true"
      >
        <p class="text-2xl leading-none font-extrabold">{{ completados }}/{{ MODULOS.length }}</p>
      </div>
      <p class="text-sm leading-snug">
        <span class="font-semibold"
          >{{ completados }} de {{ MODULOS.length }} módulos completados.</span
        >
        <span class="text-muted-foreground block">
          Toca un módulo en la mandíbula para ver tu avance y entrar.
        </span>
      </p>
    </div>

    <div class="relative lg:col-start-2 lg:row-span-4 lg:row-start-1">
      <EscenaExploracion
        modelo="mandibula"
        alt="Mandíbula humana en vista oblicua con los seis módulos del curso marcados en orden, del cóndilo derecho al izquierdo"
        :nodos="nodos"
        :visitados="visitados"
        :seleccion-id="seleccion"
        vista-inicial="oblicua"
        sin-controles
        etiquetas-laterales
        :ancho-etiquetas="0.25"
        ayuda-oculta
        class="lg:[&_.escena]:h-[calc(100dvh-10.5rem)]"
        @seleccionar="(id: string) => (seleccion = id)"
      >
        <template #etiqueta="{ id, numero }">
          <span
            v-if="porId.get(id)"
            class="flex min-w-0 flex-1 items-center gap-2"
            :style="estiloAcento(numero)"
          >
            <span class="min-w-0 flex-1">
              <span class="block text-[0.68rem] font-semibold tracking-wide uppercase opacity-75">
                Módulo {{ numero }}
              </span>
              <span class="block text-[0.85rem] leading-snug font-bold">
                {{ porId.get(id)?.m.titulo }}
              </span>
              <span class="block text-[0.72rem] leading-snug font-medium opacity-80">
                {{ porId.get(id)?.m.identidad.frase }}
              </span>
              <span
                class="mt-0.5 inline-flex items-center gap-1 text-[0.7rem] font-semibold"
                :class="
                  porId.get(id)?.estado === 'completado'
                    ? 'text-[#7ee2a8]'
                    : porId.get(id)?.estado === 'bloqueado'
                      ? 'opacity-70'
                      : 'text-[#9cc7f3]'
                "
              >
                <Lock v-if="porId.get(id)?.estado === 'bloqueado'" class="size-3" />
                {{ porId.get(id)?.avance }}
              </span>
            </span>
          </span>
        </template>
      </EscenaExploracion>
    </div>

    <!-- La lista: visible en pantallas estrechas (la escena muestra solo números); en las anchas, solo para lectores de pantalla -->
    <ol class="grid gap-2 sm:grid-cols-2 lg:sr-only" aria-label="Módulos y tu avance">
      <li v-for="it in items" :key="it.id">
        <button
          type="button"
          class="focus-visible:ring-ring flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left outline-none focus-visible:ring-2"
          :class="seleccion === it.id ? 'border-primary bg-primary/10' : 'bg-card hover:bg-accent'"
          :aria-pressed="seleccion === it.id"
          @click="seleccion = it.id"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            :class="
              it.estado === 'completado'
                ? 'bg-success text-white'
                : it.estado === 'bloqueado'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary text-primary-foreground'
            "
          >
            <CircleCheck v-if="it.estado === 'completado'" class="size-4" aria-hidden="true" />
            <Lock v-else-if="it.estado === 'bloqueado'" class="size-4" aria-hidden="true" />
            <template v-else>{{ it.m.numero }}</template>
          </span>
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold">{{ it.m.titulo }}</span>
            <span class="text-muted-foreground block text-xs">{{ it.avance }}</span>
          </span>
        </button>
      </li>
    </ol>

    <!-- Módulo elegido: su avance y el botón para entrar -->
    <div
      v-if="elegido"
      class="bg-card/80 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 lg:col-start-1 lg:row-start-3"
      aria-live="polite"
      data-testid="modulo-elegido"
    >
      <p class="min-w-0">
        <span class="text-primary text-sm font-bold">Módulo {{ elegido.m.numero }}</span>
        <span class="block font-semibold">{{ elegido.m.titulo }}</span>
        <span class="text-muted-foreground text-sm">{{ elegido.avance }}</span>
      </p>
      <RouterLink
        :to="{ name: 'modulo', params: { n: elegido.m.numero } }"
        class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        data-testid="abrir-modulo-mandibula"
      >
        {{ verbo }}: Módulo {{ elegido.m.numero }}
        <ArrowRight class="size-5" aria-hidden="true" />
      </RouterLink>
    </div>

    <div class="lg:col-start-1 lg:row-start-4">
      <slot name="despues" />
    </div>
  </div>
</template>
