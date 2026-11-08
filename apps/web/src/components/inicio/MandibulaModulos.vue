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
import { RouterLink, useRouter } from 'vue-router';
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

/**
 * Vista con la que la cámara se acerca a cada módulo al elegirlo (pedido de la usuaria, 2026-11-06: «si selecciono
 * el 5, la mandíbula debe cambiar y mostrar la posición 5»): el lado derecho se ve desde la derecha, el izquierdo
 * desde la izquierda y el cuerpo izquierdo de frente.
 */
const VISTAS_RECORRIDO: readonly NodoEscena['vista'][] = [
  'lateral_derecha',
  'oblicua',
  'oblicua',
  'frontal',
  'lateral_izquierda',
  'lateral_izquierda',
];
const nodos = computed<NodoEscena[]>(() =>
  items.value.map((it, i) => ({
    id: it.id,
    etiqueta: `Módulo ${it.m.numero}: ${it.m.titulo}`,
    ancla: ANCLAS_RECORRIDO[i],
    vista: VISTAS_RECORRIDO[i] ?? 'oblicua',
    // Menos que el encuadre automático del punto: se ve la zona del hueso con su contexto.
    zoom: 0.7,
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
/* Al elegir un módulo (tocando su punto, su tarjeta o la lista) la cámara se acerca a su posición en el hueso. La
   selección inicial (el módulo que toca) no mueve la cámara: la portada abre con la mandíbula entera. */
const ordenEnfoque = ref(0);
watch(seleccion, (nueva, previa) => {
  if (previa !== null && nueva !== previa) ordenEnfoque.value += 1;
});
const router = useRouter();
/** Tocar el punto o la tarjeta de un módulo lo elige; tocar de nuevo el elegido lo abre (2026-11-07). */
function alSeleccionar(id: string): void {
  if (seleccion.value === id) {
    const item = porId.value.get(id);
    if (item) void router.push({ name: 'modulo', params: { n: item.m.numero } });
    return;
  }
  seleccion.value = id;
}
function verboDe(estado: string | undefined): string {
  return estado === 'completado' ? 'Repasar' : estado === 'en_curso' ? 'Continuar' : 'Abrir';
}
</script>

<template>
  <div
    class="flex flex-col gap-4 lg:grid lg:h-full lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-8"
    data-testid="mandibula-modulos"
  >
    <div class="lg:col-start-1 lg:row-start-1">
      <slot name="antes" />
    </div>

    <!-- Avance global en una línea (portada minimalista, 2026-11-07: sin el círculo) -->
    <p class="text-sm lg:col-start-1 lg:row-start-2" data-testid="avance-global">
      <span class="font-semibold"
        >{{ completados }} de {{ MODULOS.length }} módulos completados.</span
      >
      <span class="text-muted-foreground"> Elige un módulo para entrar.</span>
    </p>

    <div class="relative lg:col-start-2 lg:row-span-3 lg:row-start-1">
      <EscenaExploracion
        modelo="mandibula"
        alt="Mandíbula humana en vista oblicua con los seis módulos del curso marcados en orden, del cóndilo derecho al izquierdo"
        :nodos="nodos"
        :visitados="visitados"
        :seleccion-id="seleccion"
        :orden-enfoque="ordenEnfoque"
        vista-inicial="oblicua"
        sin-controles
        etiquetas-laterales
        :ancho-etiquetas="0.25"
        ayuda-oculta
        viaje-visible
        sin-lineas
        class="lg:[&_.escena]:h-[calc(100dvh-7.5rem)]"
        @seleccionar="alSeleccionar"
      >
        <template #etiqueta="{ id, numero }">
          <span
            v-if="porId.get(id)"
            class="flex min-w-0 flex-1 items-center gap-2"
            :style="estiloAcento(numero)"
          >
            <!-- Tarjeta mínima (2026-11-07): número y título; el estado, solo como icono. -->
            <span class="min-w-0 flex-1">
              <span class="block text-[0.68rem] font-semibold tracking-wide uppercase opacity-75">
                Módulo {{ numero }}
              </span>
              <span class="flex items-center gap-1.5 text-[0.85rem] leading-snug font-bold">
                <span class="min-w-0">{{ porId.get(id)?.m.titulo }}</span>
                <span
                  v-if="seleccion === id"
                  class="inline-flex items-center gap-0.5 text-[0.72rem] font-semibold text-[#9cc7f3]"
                >
                  {{ verboDe(porId.get(id)?.estado) }}
                  <ArrowRight class="size-3" aria-hidden="true" />
                </span>
                <CircleCheck
                  v-if="porId.get(id)?.estado === 'completado'"
                  class="size-3.5 shrink-0 text-[#7ee2a8]"
                  :aria-label="porId.get(id)?.avance"
                />
                <Lock
                  v-else-if="porId.get(id)?.estado === 'bloqueado'"
                  class="size-3.5 shrink-0 opacity-70"
                  :aria-label="porId.get(id)?.avance"
                />
              </span>
            </span>
          </span>
        </template>
      </EscenaExploracion>
    </div>

    <!-- La lista: visible en pantallas estrechas (la escena muestra solo números); en las anchas, solo para lectores de pantalla -->
    <!-- La lista: en pantallas estrechas abre el módulo al tocarlo; en las anchas, para lectores de pantalla -->
    <ol class="grid gap-2 sm:grid-cols-2 lg:sr-only" aria-label="Módulos y tu avance">
      <li v-for="it in items" :key="it.id">
        <RouterLink
          :to="{ name: 'modulo', params: { n: it.m.numero } }"
          class="focus-visible:ring-ring flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left outline-none focus-visible:ring-2"
          :class="seleccion === it.id ? 'border-primary bg-primary/10' : 'bg-card hover:bg-accent'"
          :aria-current="seleccion === it.id ? 'true' : undefined"
          :data-modulo="it.m.numero"
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
        </RouterLink>
      </li>
    </ol>

    <div class="lg:col-start-1 lg:row-start-3">
      <slot name="despues" />
    </div>
  </div>
</template>
