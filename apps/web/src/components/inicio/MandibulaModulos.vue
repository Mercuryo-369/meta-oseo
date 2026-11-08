<script setup lang="ts">
/**
 * Portada del inicio según el diseño que entregó el usuario el 2026-11-07: barra lateral oscura con el
 * saludo, «Tu progreso» (anillo con el porcentaje y la barra) y la «Ruta de aprendizaje» (los seis
 * módulos con su estado); a la derecha, la cabecera del módulo elegido y la mandíbula 3D con las seis
 * tarjetas claras ancladas al hueso, el selector «Vista 3D», la barra de herramientas de la cámara y
 * los botones «Volver» y «Siguiente». Sustituye a la portada minimalista del mismo día.
 *
 * Datos: el avance por módulo lo da el servidor (`usePasosModulos`); los puntos por módulo salen de
 * `GET /api/activities/results` (una petición al abrir). La mandíbula es la malla anatómica de
 * BodyParts3D; cada módulo es un punto anclado sobre el hueso, de un cóndilo al otro.
 *
 * En pantallas estrechas todo va en columna: la barra lateral primero (la lista abre el módulo con un
 * toque) y la escena debajo, con números en vez de tarjetas.
 */
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Lock,
  Maximize2,
  RotateCw,
  Trophy,
  Undo2,
  ZoomIn,
  ZoomOut,
} from '@lucide/vue';
import MenuCuenta from '@/components/MenuCuenta.vue';
import IconoModulo from '@/components/modulo/IconoModulo.vue';
import { textoEstadoTarjeta } from '@/components/modulo/identidad';
import { usePasosModulos } from '@/components/modulo/usePasosModulos';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ANCLAS_PIEZAS_DERECHA } from '@/content/nodos3d';
import type { AnclaNodo, VistaCamara } from '@/content/nodos3d';
import { MODULOS } from '@/data/modulos';
import { apiFetch } from '@/lib/api';
import type { NodoEscena } from '@/scenes/nodosEscena';
import { ETIQUETA_VISTA } from '@/scenes/vistas';
import { useProgresoStore } from '@/stores/progreso';
import type { ResultadosResponse } from '@/types/api';

// three y TresJS llegan solo cuando el inicio monta la escena.
const EscenaExploracion = defineAsyncComponent(() => import('@/scenes/EscenaExploracion.vue'));

const props = defineProps<{
  /** Nombre del estudiante, para el saludo. */
  nombre: string;
}>();

const progreso = useProgresoStore();
const router = useRouter();
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
/** Vista con la que la cámara se acerca a cada módulo al elegirlo (2026-11-06). */
const VISTAS_RECORRIDO: readonly VistaCamara[] = [
  'lateral_derecha',
  'oblicua',
  'oblicua',
  'frontal',
  'lateral_izquierda',
  'lateral_izquierda',
];

/** «m2_3_osteocito» → «2.3». */
function numeroDeSeccion(id: string | null | undefined): string | null {
  const m = id ? /^m(\d)_(\d+)_/.exec(id) : null;
  return m ? `${m[1]}.${m[2]}` : null;
}

/** Puntos por módulo (mejor puntaje por actividad, la misma regla del total): una petición al abrir. */
const puntosPorModulo = ref<Map<number, number>>(new Map());
onMounted(async () => {
  try {
    const { resultados } = await apiFetch<ResultadosResponse>('/activities/results');
    const suma = new Map<number, number>();
    for (const r of resultados) {
      suma.set(r.modulo, (suma.get(r.modulo) ?? 0) + (r.mejor_puntaje ?? 0));
    }
    puntosPorModulo.value = suma;
  } catch {
    // Sin puntos por módulo la portada sigue funcionando; el total del HUD viene del progreso.
  }
});

const items = computed(() =>
  MODULOS.map((m) => {
    const estado = cargandoProgreso.value ? 'disponible' : estadoDe(m.numero);
    const seccion = numeroDeSeccion(
      progreso.modulos.find((p) => p.modulo === m.numero)?.seccion_actual,
    );
    const puntos = puntosPorModulo.value.get(m.numero) ?? 0;
    const estadoCorto =
      estado === 'completado'
        ? 'Completado'
        : estado === 'en_curso'
          ? seccion
            ? `En la ${seccion}`
            : 'En curso'
          : estado === 'bloqueado'
            ? 'Bloqueado'
            : 'Sin empezar';
    return {
      m,
      id: `modulo_${m.numero}`,
      estado,
      puntos,
      avance: puntos > 0 ? `${estadoCorto} · ${puntos} pts` : estadoCorto,
      avanceLargo: textoEstadoTarjeta(estado, m.numero),
    };
  }),
);
const porId = computed(() => new Map(items.value.map((it) => [it.id, it])));
const porcentaje = computed(() => Math.round((completados.value / MODULOS.length) * 100));

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

/* ----- Selección: la lista, los puntos y las tarjetas eligen; «Siguiente» (o un segundo toque) abre ----- */
const seleccion = ref<string | null>(null);
watch(
  siguiente,
  (m) => {
    if (seleccion.value === null && m) seleccion.value = `modulo_${m.numero}`;
  },
  { immediate: true },
);
const elegido = computed(() => porId.value.get(seleccion.value ?? '') ?? items.value[0]);
const indiceElegido = computed(() => items.value.findIndex((it) => it.id === seleccion.value));

/* Al elegir un módulo la cámara viaja a su posición; la selección inicial no la mueve. */
const ordenEnfoque = ref(0);
watch(seleccion, (nueva, previa) => {
  if (previa !== null && nueva !== previa) ordenEnfoque.value += 1;
});

function abrir(id: string | null): void {
  const item = id ? porId.value.get(id) : undefined;
  if (item) void router.push({ name: 'modulo', params: { n: item.m.numero } });
}
function alSeleccionar(id: string): void {
  if (seleccion.value === id) {
    abrir(id);
    return;
  }
  seleccion.value = id;
}
function elegirIndice(i: number): void {
  const item = items.value[i];
  if (item) seleccion.value = item.id;
}
const verbo = computed(() => {
  const e = elegido.value?.estado;
  return e === 'completado' ? 'Repasar' : e === 'en_curso' ? 'Continuar' : 'Empezar';
});

/* ----- Cámara: barra de herramientas, «Vista 3D» y pantalla completa ----- */
const escena = ref<{
  zoom: (factor: number) => void;
  verTodo: () => void;
  elegirVista: (vista: string) => void;
} | null>(null);
const contenedorEscena = ref<HTMLElement | null>(null);
const VISTAS_3D: readonly VistaCamara[] = [
  'oblicua',
  'frontal',
  'lateral_derecha',
  'lateral_izquierda',
  'superior',
  'posterior',
];
const vista = ref<VistaCamara>('oblicua');
function cambiarVista(v: string): void {
  vista.value = v as VistaCamara;
  escena.value?.elegirVista(v);
}
/** «Rotar»: gira a la vista siguiente del recorrido (un movimiento corto cada vez). */
function rotar(): void {
  const giro: readonly VistaCamara[] = [
    'oblicua',
    'lateral_derecha',
    'posterior',
    'lateral_izquierda',
    'frontal',
  ];
  const i = giro.indexOf(vista.value);
  cambiarVista(giro[(i + 1) % giro.length] ?? 'oblicua');
}
function restablecer(): void {
  vista.value = 'oblicua';
  escena.value?.verTodo();
}
function pantallaCompleta(): void {
  const el = contenedorEscena.value;
  if (!el) return;
  if (document.fullscreenElement) void document.exitFullscreen();
  else void el.requestFullscreen?.();
}

const inicial = computed(() => (props.nombre.trim()[0] ?? '?').toUpperCase());
</script>

<template>
  <div
    class="flex flex-col gap-4 lg:grid lg:h-[calc(100dvh-5.5rem)] lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-5"
    data-testid="mandibula-modulos"
  >
    <!-- Barra lateral -->
    <aside
      class="portada-lateral flex flex-col gap-4 rounded-3xl p-4 text-white shadow-lg lg:min-h-0 lg:overflow-hidden"
      data-testid="barra-lateral"
    >
      <div class="flex items-center gap-3">
        <span
          class="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20"
          aria-hidden="true"
        >
          <IconoModulo icono="hueso" class="size-7" />
        </span>
        <div class="min-w-0">
          <p class="text-lg leading-tight font-bold">Metabolismo óseo</p>
          <p class="text-xs text-white/75">Un viaje interactivo desde la célula hasta el hueso</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span
          class="grid size-12 shrink-0 place-items-center rounded-full bg-white/20 text-lg font-bold ring-2 ring-white/40"
          aria-hidden="true"
        >
          {{ inicial }}
        </span>
        <div class="min-w-0">
          <h1 id="titulo-inicio" class="truncate text-xl leading-tight font-bold">
            Hola, {{ nombre }}
          </h1>
          <p class="text-sm text-white/75">Continúa tu aprendizaje</p>
        </div>
      </div>

      <!-- Tu progreso -->
      <div
        class="flex items-center gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15"
        data-testid="avance-global"
      >
        <svg viewBox="0 0 64 64" class="size-16 shrink-0" aria-hidden="true">
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            stroke-width="6"
          />
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="#7fc3ff"
            stroke-width="6"
            stroke-linecap="round"
            :stroke-dasharray="`${(porcentaje / 100) * 163.4} 163.4`"
            transform="rotate(-90 32 32)"
          />
          <text x="32" y="36" text-anchor="middle" class="fill-white text-[13px] font-bold">
            {{ porcentaje }}%
          </text>
        </svg>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">Tu progreso</p>
          <p class="text-base font-bold">{{ completados }} de {{ MODULOS.length }} módulos</p>
          <p class="text-xs text-white/75 tabular-nums">{{ progreso.puntajeTotal }} pts</p>
          <div
            class="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"
            role="progressbar"
            aria-label="Módulos completados"
            :aria-valuemin="0"
            :aria-valuemax="MODULOS.length"
            :aria-valuenow="completados"
          >
            <div class="h-full rounded-full bg-[#7fc3ff]" :style="{ width: `${porcentaje}%` }" />
          </div>
        </div>
      </div>

      <!-- Ruta de aprendizaje -->
      <section aria-labelledby="titulo-ruta" class="min-w-0">
        <h2 id="titulo-ruta" class="mb-2 text-base font-bold">Ruta de aprendizaje</h2>
        <ol class="grid gap-1" aria-label="Módulos y tu avance">
          <li v-for="it in items" :key="it.id">
            <!-- En pantallas anchas elige (la cámara viaja al módulo); en estrechas abre el módulo. -->
            <button
              type="button"
              class="hidden w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70 lg:flex"
              :class="seleccion === it.id ? 'bg-white text-[#0f2a52] shadow' : 'hover:bg-white/10'"
              :aria-current="seleccion === it.id ? 'true' : undefined"
              :data-modulo="it.m.numero"
              :title="it.avanceLargo"
              @click="alSeleccionar(it.id)"
            >
              <span
                class="grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold"
                :class="
                  it.estado === 'completado'
                    ? 'bg-success text-white'
                    : seleccion === it.id
                      ? 'bg-[#1f5a96] text-white'
                      : 'bg-white/15 text-white'
                "
              >
                <Check
                  v-if="it.estado === 'completado'"
                  class="size-4"
                  :stroke-width="3"
                  aria-hidden="true"
                />
                <template v-else>{{ it.m.numero }}</template>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold">{{ it.m.titulo }}</span>
                <span
                  class="block truncate text-xs"
                  :class="seleccion === it.id ? 'text-[#0f2a52]/70' : 'text-white/70'"
                >
                  {{ it.avance }}
                </span>
              </span>
              <Lock
                v-if="it.estado === 'bloqueado'"
                class="size-4 shrink-0 opacity-70"
                aria-hidden="true"
              />
              <ArrowRight
                v-else-if="seleccion === it.id"
                class="size-4 shrink-0"
                aria-hidden="true"
              />
              <span
                v-else
                class="size-4 shrink-0 rounded-full border border-white/40"
                aria-hidden="true"
              />
            </button>
            <RouterLink
              :to="{ name: 'modulo', params: { n: it.m.numero } }"
              class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
              :class="seleccion === it.id ? 'bg-white text-[#0f2a52] shadow' : 'bg-white/10'"
              :data-modulo="it.m.numero"
            >
              <span
                class="grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold"
                :class="
                  it.estado === 'completado'
                    ? 'bg-success text-white'
                    : seleccion === it.id
                      ? 'bg-[#1f5a96] text-white'
                      : 'bg-white/15 text-white'
                "
              >
                <Check
                  v-if="it.estado === 'completado'"
                  class="size-4"
                  :stroke-width="3"
                  aria-hidden="true"
                />
                <template v-else>{{ it.m.numero }}</template>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold">{{ it.m.titulo }}</span>
                <span
                  class="block truncate text-xs"
                  :class="seleccion === it.id ? 'text-[#0f2a52]/70' : 'text-white/70'"
                  >{{ it.avance }}</span
                >
              </span>
              <Lock
                v-if="it.estado === 'bloqueado'"
                class="size-4 shrink-0 opacity-70"
                aria-hidden="true"
              />
              <ChevronRight v-else class="size-4 shrink-0" aria-hidden="true" />
            </RouterLink>
          </li>
        </ol>
      </section>

      <div class="mt-auto space-y-3 lg:hidden xl:block">
        <slot name="antes" />
        <p
          class="flex items-start gap-2 rounded-2xl bg-white/10 p-3 text-xs text-white/85 ring-1 ring-white/15"
        >
          <Trophy class="text-eosina mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>¡Aprende, explora y descubre el fascinante mundo del hueso!</span>
        </p>
      </div>
    </aside>

    <!-- Zona principal: cabecera del módulo elegido, mandíbula y herramientas -->
    <section class="flex min-w-0 flex-col gap-3 lg:min-h-0" aria-labelledby="titulo-modulo-elegido">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div v-if="elegido" class="min-w-0" data-testid="modulo-elegido" aria-live="polite">
          <span
            class="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold tracking-wide uppercase"
          >
            <span class="bg-primary size-1.5 rounded-full" aria-hidden="true" />
            Módulo {{ elegido.m.numero }}
          </span>
          <h2
            id="titulo-modulo-elegido"
            class="mt-1 text-2xl leading-tight font-bold tracking-tight"
          >
            {{ elegido.m.titulo }}
          </h2>
          <p class="text-muted-foreground mt-1 text-sm md:text-base">
            {{ elegido.m.identidad.frase }} · {{ elegido.avanceLargo }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Sheet>
            <SheetTrigger as-child>
              <Button variant="outline" class="rounded-full" data-testid="ayuda-inicio">
                <CircleHelp aria-hidden="true" />
                Ayuda
              </Button>
            </SheetTrigger>
            <SheetContent side="right" class="overflow-y-auto sm:max-w-sm">
              <SheetHeader class="text-left">
                <SheetTitle>Cómo usar el OVA</SheetTitle>
                <SheetDescription>Lo esencial para recorrer los módulos.</SheetDescription>
              </SheetHeader>
              <ul class="mt-4 list-disc space-y-2 pl-5 text-sm">
                <li>
                  Elige un módulo en la ruta de aprendizaje o tocando su punto en la mandíbula; la
                  cámara se acerca a esa zona.
                </li>
                <li>
                  «Siguiente» abre el módulo elegido. Los módulos se desbloquean en orden al
                  completar las actividades obligatorias.
                </li>
                <li>
                  Arrastra la mandíbula para girarla y usa la rueda o los botones para acercar y
                  alejar. «Restablecer» vuelve a la vista inicial.
                </li>
                <li>
                  El mentor de IA (botón redondo abajo a la derecha) responde preguntas sobre lo que
                  estás viendo.
                </li>
                <li>En «Configuración» cambias tu nivel y ves tus logros y tu certificado.</li>
              </ul>
            </SheetContent>
          </Sheet>
          <MenuCuenta variante="configuracion" />
          <Button
            variant="outline"
            size="icon"
            class="rounded-full"
            title="Pantalla completa"
            @click="pantallaCompleta"
          >
            <Maximize2 aria-hidden="true" />
            <span class="sr-only">Pantalla completa</span>
          </Button>
        </div>
      </div>

      <div ref="contenedorEscena" class="bg-background relative min-h-0 flex-1 rounded-3xl">
        <EscenaExploracion
          ref="escena"
          modelo="mandibula"
          alt="Mandíbula humana en vista oblicua con los seis módulos del curso marcados en orden, del cóndilo derecho al izquierdo"
          :nodos="nodos"
          :visitados="visitados"
          :seleccion-id="seleccion"
          :orden-enfoque="ordenEnfoque"
          vista-inicial="oblicua"
          sin-controles
          etiquetas-laterales
          estilo-etiquetas="claro"
          :ancho-etiquetas="0.24"
          ayuda-oculta
          viaje-visible
          class="lg:[&_.escena]:h-[calc(100dvh-19.5rem)] lg:[&_.escena]:min-h-[22rem] lg:[&_.escena]:rounded-3xl"
          @seleccionar="alSeleccionar"
        >
          <template #etiqueta="{ id, numero }">
            <span v-if="porId.get(id)" class="flex min-w-0 flex-1 items-center gap-2">
              <span class="min-w-0 flex-1">
                <span class="block text-[0.85rem] leading-snug font-bold">{{
                  porId.get(id)?.m.titulo
                }}</span>
                <span
                  class="block text-[0.72rem] leading-snug font-medium text-[#0f2a52]/70"
                  :title="porId.get(id)?.avanceLargo"
                >
                  {{ porId.get(id)?.avance }}
                </span>
              </span>
              <ChevronRight class="size-4 shrink-0 text-[#1f5a96]" aria-hidden="true" />
              <span class="sr-only">Módulo {{ numero }}</span>
            </span>
          </template>
        </EscenaExploracion>
        <!-- «Vista 3D»: vistas con nombre de la escena -->
        <div class="absolute top-3 right-3 hidden lg:block">
          <label class="sr-only" for="vista-3d">Vista 3D</label>
          <NativeSelect
            id="vista-3d"
            :model-value="vista"
            class="bg-card/90 w-44 rounded-full shadow backdrop-blur"
            @update:model-value="cambiarVista(String($event))"
          >
            <option v-for="v in VISTAS_3D" :key="v" :value="v">
              Vista 3D: {{ ETIQUETA_VISTA[v] }}
            </option>
          </NativeSelect>
        </div>
      </div>

      <!-- Espacio a la derecha para el botón flotante del mentor. -->
      <div class="flex flex-wrap items-center justify-between gap-3 lg:pr-20">
        <div
          class="bg-card flex items-center gap-1 rounded-full border px-2 py-1 shadow-sm"
          role="toolbar"
          aria-label="Herramientas de la mandíbula"
          data-testid="herramientas-3d"
        >
          <Button variant="ghost" size="sm" class="rounded-full" @click="rotar">
            <RotateCw aria-hidden="true" />
            Rotar
          </Button>
          <Button variant="ghost" size="sm" class="rounded-full" @click="escena?.zoom(1.3)">
            <ZoomIn aria-hidden="true" />
            Acercar
          </Button>
          <Button variant="ghost" size="sm" class="rounded-full" @click="escena?.zoom(0.75)">
            <ZoomOut aria-hidden="true" />
            Alejar
          </Button>
          <Button variant="ghost" size="sm" class="rounded-full" @click="restablecer">
            <Undo2 aria-hidden="true" />
            Restablecer
          </Button>
        </div>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            class="rounded-full"
            :disabled="indiceElegido <= 0"
            @click="elegirIndice(indiceElegido - 1)"
          >
            <ArrowLeft aria-hidden="true" />
            Volver
          </Button>
          <Button
            class="rounded-full px-6"
            data-testid="abrir-modulo-mandibula"
            @click="abrir(seleccion)"
          >
            {{ verbo }}<span class="sr-only">: Módulo {{ elegido?.m.numero }}</span>
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Azul profundo del diseño, con un degradado suave; en el tema oscuro queda igual (texto blanco). */
.portada-lateral {
  background: linear-gradient(165deg, #0b2d5c 0%, #123f7d 60%, #1b4d8f 100%);
}
</style>
