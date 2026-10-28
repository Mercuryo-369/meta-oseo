<script setup lang="ts">
/**
 * Actividad `curva-esfuerzo` («¿El hueso se recupera o se fractura?», módulo 1.4 del documento de la docente): una
 * curva esfuerzo-deformación del hueso con sus zonas (región elástica, plástica, fallo) y una serie de escenarios.
 * En cada uno el estudiante mueve un marcador hasta el punto que describe la situación y responde qué le pasa al
 * hueso si se retira la carga.
 *
 *  - Marcador: se arrastra a lo largo de la curva (puntero o dedo; `touch-action: none` solo en él) o se toca la
 *    gráfica. Alternativa de teclado y lector (R1): el marcador es un `slider` (flechas, Re Pág/Av Pág, Inicio/Fin)
 *    y hay un botón por zona que lo lleva a su centro.
 *  - Por escenario: «Fijar el marcador» comprueba la zona (fuera de la pedida es un error y se puede corregir);
 *    después se elige una opción (una sola oportunidad) y se ve la retroalimentación y la nota del docente.
 *  - Puntaje: `precisionPorConteo` sobre los pasos (zona y respuesta de cada escenario) y `calcularPuntaje`.
 *  - Contrato (types.ts): `progreso` con instantánea validada, `interaccion` (`ubica_marcador`, `responde_pregunta`,
 *    `reinicia_actividad`), `completada` una vez por intento; en `revisar`, solo lectura con las respuestas correctas.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { Check, CircleAlert, Info, MapPin, RotateCcw, X } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import TextoRico from '@/components/modulo/TextoRico.vue';
import { intentoInicial } from '@/activities/types';
import type {
  EmitsActividadCurvaEsfuerzo,
  PropsActividadCurvaEsfuerzo,
  ProgresoActividad,
  ResultadoActividad,
} from '@/activities/types';
import { instantaneaVigente, semillaNueva } from '@/activities/quiz/logica';
import { crearEmisorProgreso } from '@/content/progreso';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import {
  actividadSuperada,
  bandaRetroalimentacion,
  calcularPuntaje,
  precisionPorConteo,
  textoRetroalimentacion,
} from '@/content/scoring';
import type { ZonaCurva } from '@/content/schema';
import {
  acotar,
  armarInstantanea,
  centroDeZona,
  contar,
  esfuerzoEn,
  estadoVacio,
  leerInstantanea,
  ordenOpciones,
  puntosCurva,
  terminados,
  X_FALLO,
  X_LIMITE_ELASTICO,
  zonaEn,
} from './logica';
import type { EstadoIntento } from './logica';

const props = withDefaults(defineProps<PropsActividadCurvaEsfuerzo>(), {
  modo: 'jugar',
  estadoPrevio: undefined,
});
const emit = defineEmits<EmitsActividadCurvaEsfuerzo>();

const uid = useId();
const jugando = computed(() => props.modo !== 'revisar');
const config = computed(() => props.actividad.config);
const escenarios = computed(() => config.value.escenarios);
const zonas = computed(() => config.value.zonas);

/* ---- estado ---- */

const intentos = ref(intentoInicial(props.estadoPrevio));
const estado = ref<EstadoIntento>(estadoVacio(escenarios.value.length, semillaNueva()));
const fase = ref<'escenarios' | 'resumen'>('escenarios');
const interactuo = ref(false);
const aviso = ref<{ tipo: 'error' | 'ok'; texto: string } | null>(null);
const mensajeVivo = ref('');

const orden = computed(() => ordenOpciones(props.actividad, estado.value.semilla));
const escenario = computed(() => escenarios.value[estado.value.actual]);
const estadoEsc = computed(() => estado.value.escenarios[estado.value.actual]);
const zonaActual = computed(() => zonaEn(zonas.value, estado.value.x));

const emisor = crearEmisorProgreso<ProgresoActividad>((p) => emit('progreso', p));

function emitirProgreso(): void {
  if (!jugando.value) return;
  emisor.emitir({
    avance: terminados(estado.value) / Math.max(1, escenarios.value.length),
    intentos: intentos.value,
    instantanea: armarInstantanea(estado.value),
  });
}

function aplicarEstadoPrevio(): void {
  intentos.value = intentoInicial(props.estadoPrevio);
  const restaurado = instantaneaVigente(props.estadoPrevio)
    ? leerInstantanea(props.actividad, props.estadoPrevio?.progreso?.instantanea)
    : null;
  estado.value = restaurado ?? estadoVacio(escenarios.value.length, semillaNueva());
}
if (jugando.value) aplicarEstadoPrevio();

// La respuesta del servidor puede llegar después de montar: hasta la primera interacción se recalcula.
watch(
  () => props.estadoPrevio,
  () => {
    if (jugando.value && !interactuo.value && fase.value === 'escenarios') aplicarEstadoPrevio();
  },
  { deep: true },
);

function anunciar(texto: string): void {
  mensajeVivo.value = '';
  void nextTick(() => (mensajeVivo.value = texto));
}

function tocar(): void {
  interactuo.value = true;
}

/* ---- gráfica ---- */

const ANCHO = 600;
const ALTO = 340;
const MARGEN = { izq: 56, der: 20, arr: 20, abj: 48 };
const anchoUtil = ANCHO - MARGEN.izq - MARGEN.der;
const altoUtil = ALTO - MARGEN.arr - MARGEN.abj;

function px(x: number): number {
  return MARGEN.izq + (acotar(x, 0, 100) / 100) * anchoUtil;
}
function py(y: number): number {
  return MARGEN.arr + altoUtil - (acotar(y, 0, 100) / 100) * altoUtil;
}

const trazoCurva = computed(() => {
  const puntos = puntosCurva();
  const fallo = puntos.at(-1)!;
  const d = puntos.map(
    ([x, y], k) => `${k === 0 ? 'M' : 'L'}${px(x).toFixed(1)},${py(y).toFixed(1)}`,
  );
  return { linea: d.join(' '), fallo };
});

/** Color de cada zona, en el orden del contenido (docente: elástica azul, plástica rosada, fractura roja). */
const COLORES = [
  'var(--primary)',
  'var(--primary)',
  'var(--eosina)',
  'var(--eosina)',
  'var(--destructive)',
  'var(--destructive)',
  'var(--eosina)',
  'var(--primary)',
];
const OPACIDADES = [0.12, 0.24, 0.12, 0.24, 0.2, 0.3, 0.18, 0.18];
const zonasDibujo = computed(() =>
  zonas.value.map((z, k) => ({
    z,
    x: px(z.desde),
    ancho: px(z.hasta) - px(z.desde),
    color: COLORES[k % COLORES.length],
    opacidad: OPACIDADES[k % OPACIDADES.length],
    centro: px((z.desde + z.hasta) / 2),
  })),
);

const marcador = computed(() => ({
  x: px(estado.value.x),
  y: py(esfuerzoEn(estado.value.x)),
}));

const svg = ref<SVGSVGElement | null>(null);
const arrastrando = ref(false);

function xDeEvento(e: PointerEvent): number {
  const caja = svg.value?.getBoundingClientRect();
  if (!caja || caja.width === 0) return estado.value.x;
  const enSvg = ((e.clientX - caja.left) / caja.width) * ANCHO;
  return Math.round(acotar(((enSvg - MARGEN.izq) / anchoUtil) * 100, 0, 100) * 10) / 10;
}

const puedeMover = computed(
  () => jugando.value && fase.value === 'escenarios' && !estadoEsc.value?.zonaOk,
);

function mover(x: number): void {
  if (!puedeMover.value) return;
  tocar();
  estado.value.x = Math.round(acotar(x, 0, 100) * 10) / 10;
  aviso.value = null;
  emitirProgreso();
}

function alBajar(e: PointerEvent): void {
  if (!puedeMover.value) return;
  arrastrando.value = true;
  (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  mover(xDeEvento(e));
}
function alMover(e: PointerEvent): void {
  if (arrastrando.value) mover(xDeEvento(e));
}
function alSoltar(): void {
  arrastrando.value = false;
}
/** Tocar la gráfica lleva el marcador allí (además de arrastrarlo). */
function alTocarGrafica(e: PointerEvent): void {
  if (!puedeMover.value || arrastrando.value) return;
  mover(xDeEvento(e));
}

function alTeclaMarcador(e: KeyboardEvent): void {
  const pasos: Record<string, number> = {
    ArrowRight: 1,
    ArrowUp: 1,
    ArrowLeft: -1,
    ArrowDown: -1,
    PageUp: 10,
    PageDown: -10,
  };
  if (e.key in pasos) {
    e.preventDefault();
    mover(estado.value.x + pasos[e.key]!);
  } else if (e.key === 'Home') {
    e.preventDefault();
    mover(0);
  } else if (e.key === 'End') {
    e.preventDefault();
    mover(100);
  }
}

const textoValor = computed(() => {
  const z = zonaActual.value;
  return `Deformación ${Math.round(estado.value.x)} %${z ? `, ${z.etiqueta}` : ''}`;
});

/* ---- escenario ---- */

function fijarMarcador(): void {
  const e = escenario.value;
  const s = estadoEsc.value;
  if (!jugando.value || !e || !s || s.zonaOk) return;
  tocar();
  const z = zonaActual.value;
  const ok = z?.id === e.zona;
  emit('interaccion', {
    accion: 'ubica_marcador',
    objeto: z?.id ?? 'fuera_de_zona',
    resultado: ok ? 'correcta' : 'incorrecta',
  });
  if (ok) {
    s.zonaOk = true;
    aviso.value = {
      tipo: 'ok',
      texto: `Bien: el marcador está en «${z!.etiqueta}». Ahora responde.`,
    };
  } else {
    s.erroresZona++;
    aviso.value = {
      tipo: 'error',
      texto: `El marcador está en «${z?.etiqueta ?? 'fuera de la curva'}». Vuelve a leer la situación y muévelo al punto que describe.`,
    };
  }
  anunciar(aviso.value.texto);
  emitirProgreso();
}

const opcionesVisibles = computed(() => {
  const e = escenario.value;
  if (!e) return [];
  const ordenEsc = orden.value[estado.value.actual] ?? e.opciones.map((_, j) => j);
  return ordenEsc.map((j) => ({ indice: j, opcion: e.opciones[j]! }));
});

function responder(indice: number): void {
  const e = escenario.value;
  const s = estadoEsc.value;
  if (!jugando.value || !e || !s || !s.zonaOk || s.respuesta !== null) return;
  tocar();
  s.respuesta = indice;
  const correcta = e.opciones[indice]?.id === e.correcta;
  emit('interaccion', {
    accion: 'responde_pregunta',
    objeto: e.id,
    resultado: correcta ? 'correcta' : 'incorrecta',
  });
  anunciar(
    `${correcta ? 'Correcto.' : 'No es correcto.'} ${textoPlanoDeMarkdown(e.retroalimentacion)}`,
  );
  emitirProgreso();
}

const respondido = computed(() => estadoEsc.value?.respuesta != null);
const acerto = computed(() => {
  const e = escenario.value;
  const r = estadoEsc.value?.respuesta;
  return e != null && r != null && e.opciones[r]?.id === e.correcta;
});

const titulo = ref<HTMLElement | null>(null);

async function siguienteEscenario(): Promise<void> {
  if (!respondido.value) return;
  if (estado.value.actual >= escenarios.value.length - 1) {
    terminar();
    return;
  }
  estado.value.actual++;
  aviso.value = null;
  emitirProgreso();
  await nextTick();
  titulo.value?.focus();
}

/* ---- resultado ---- */

interface Resumen {
  resultado: ResultadoActividad<'curva-esfuerzo'>;
  porcentaje: number;
  mensaje: string;
  banda: ReturnType<typeof bandaRetroalimentacion>;
  aprobado: boolean;
}
const resumen = ref<Resumen | null>(null);
const tituloResumen = ref<HTMLElement | null>(null);

function terminar(): void {
  if (!jugando.value || fase.value !== 'escenarios') return;
  const c = contar(props.actividad, estado.value);
  const precision = precisionPorConteo(c.aciertos, c.errores);
  const puntaje = calcularPuntaje(props.actividad, { precision, intentos: intentos.value });
  const resultado: ResultadoActividad<'curva-esfuerzo'> = {
    puntaje,
    intentos: intentos.value,
    precision,
    detalle: {
      aciertos: c.aciertos,
      errores: c.errores,
      errores_por_escenario: c.erroresPorEscenario,
    },
  };
  resumen.value = {
    resultado,
    porcentaje: Math.round(precision * 100),
    mensaje: textoRetroalimentacion(props.actividad, precision),
    banda: bandaRetroalimentacion(precision),
    aprobado: actividadSuperada(props.actividad, { completada: true, mejorPrecision: precision }),
  };
  fase.value = 'resumen';
  emisor.cerrar();
  emit('completada', resultado);
  anunciar(
    `Terminaste los escenarios: ${resumen.value.porcentaje} % de acierto y ${puntaje} de ${props.actividad.puntaje_max} puntos.`,
  );
  void nextTick(() => tituloResumen.value?.focus());
}

function repetir(): void {
  if (!jugando.value || fase.value !== 'resumen') return;
  intentos.value += 1;
  interactuo.value = true;
  emisor.reabrir();
  emit('interaccion', { accion: 'reinicia_actividad' });
  estado.value = estadoVacio(escenarios.value.length, semillaNueva());
  resumen.value = null;
  aviso.value = null;
  fase.value = 'escenarios';
  anunciar(`Empezaste el intento ${intentos.value}. Escenario 1 de ${escenarios.value.length}.`);
  void nextTick(() => titulo.value?.focus());
}

onBeforeUnmount(() => {
  emisor.vaciar();
});

/* ---- revisar ---- */

function zonaDe(id: string): ZonaCurva | undefined {
  return zonas.value.find((z) => z.id === id);
}
function moverAZona(z: ZonaCurva): void {
  mover(centroDeZona(z));
}
</script>

<template>
  <section class="space-y-4" :aria-labelledby="`${uid}-titulo`" data-testid="actividad-curva">
    <header class="space-y-1">
      <h3 :id="`${uid}-titulo`" class="font-serif text-xl font-semibold">{{ actividad.titulo }}</h3>
      <TextoRico
        :texto="actividad.instrucciones"
        modo="linea"
        class="text-muted-foreground block"
      />
    </header>

    <!-- Gráfica: curva, zonas y marcador -->
    <div class="bg-card rounded-xl border p-3">
      <svg
        ref="svg"
        :viewBox="`0 0 ${ANCHO} ${ALTO}`"
        class="mx-auto block h-auto max-h-[min(58dvh,28rem)] w-full select-none"
        role="img"
        :aria-label="`Curva esfuerzo-deformación del hueso con las zonas: ${zonas.map((z) => z.etiqueta).join(', ')}.`"
        @pointerdown="alTocarGrafica"
      >
        <g v-for="(d, i) in zonasDibujo" :key="d.z.id">
          <rect
            :x="d.x"
            :y="MARGEN.arr"
            :width="d.ancho"
            :height="altoUtil"
            :fill="d.color"
            :fill-opacity="d.opacidad"
          />
          <text
            :x="d.centro"
            :y="MARGEN.arr + 14 + (i % 2) * 15"
            text-anchor="middle"
            class="fill-foreground text-[10px] font-semibold"
          >
            {{ d.z.etiqueta }}
          </text>
        </g>
        <!-- Ejes -->
        <line
          :x1="MARGEN.izq"
          :y1="MARGEN.arr + altoUtil"
          :x2="ANCHO - MARGEN.der"
          :y2="MARGEN.arr + altoUtil"
          class="stroke-foreground"
          stroke-width="1.5"
        />
        <line
          :x1="MARGEN.izq"
          :y1="MARGEN.arr"
          :x2="MARGEN.izq"
          :y2="MARGEN.arr + altoUtil"
          class="stroke-foreground"
          stroke-width="1.5"
        />
        <text
          :x="MARGEN.izq + anchoUtil / 2"
          :y="ALTO - 12"
          text-anchor="middle"
          class="fill-foreground text-[13px] font-semibold"
        >
          Deformación
        </text>
        <text
          :x="16"
          :y="MARGEN.arr + altoUtil / 2"
          text-anchor="middle"
          :transform="`rotate(-90 16 ${MARGEN.arr + altoUtil / 2})`"
          class="fill-foreground text-[13px] font-semibold"
        >
          Esfuerzo
        </text>
        <!-- Límite elástico (fin del tramo lineal) -->
        <line
          :x1="px(X_LIMITE_ELASTICO)"
          :y1="py(esfuerzoEn(X_LIMITE_ELASTICO))"
          :x2="px(X_LIMITE_ELASTICO)"
          :y2="MARGEN.arr + altoUtil"
          class="stroke-muted-foreground"
          stroke-dasharray="4 4"
        />
        <!-- Curva -->
        <path
          :d="trazoCurva.linea"
          fill="none"
          class="stroke-foreground"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <!-- Caída tras el fallo -->
        <line
          :x1="px(X_FALLO)"
          :y1="py(esfuerzoEn(X_FALLO))"
          :x2="px(100)"
          :y2="py(0)"
          class="stroke-foreground"
          stroke-width="2"
          stroke-dasharray="5 4"
        />
        <circle
          :cx="px(X_FALLO)"
          :cy="py(esfuerzoEn(X_FALLO))"
          r="6"
          fill="var(--destructive)"
          stroke="white"
          stroke-width="2"
        />
        <!-- Marcador -->
        <g
          v-if="jugando"
          class="marcador"
          :class="puedeMover ? 'cursor-grab' : ''"
          role="slider"
          :tabindex="puedeMover ? 0 : -1"
          aria-label="Marcador sobre la curva"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.round(estado.x)"
          :aria-valuetext="textoValor"
          :aria-disabled="!puedeMover"
          data-testid="marcador-curva"
          @pointerdown.stop="alBajar"
          @pointermove="alMover"
          @pointerup="alSoltar"
          @pointercancel="alSoltar"
          @keydown="alTeclaMarcador"
        >
          <circle :cx="marcador.x" :cy="marcador.y" r="24" fill="transparent" />
          <line
            :x1="marcador.x"
            :y1="marcador.y"
            :x2="marcador.x"
            :y2="MARGEN.arr + altoUtil"
            class="stroke-primary"
            stroke-width="1.5"
            stroke-dasharray="3 3"
          />
          <circle
            :cx="marcador.x"
            :cy="marcador.y"
            r="10"
            fill="var(--primary)"
            stroke="white"
            stroke-width="3"
          />
        </g>
      </svg>
      <p v-if="jugando" class="text-muted-foreground mt-1 text-sm" aria-hidden="true">
        {{ textoValor }}
      </p>
    </div>

    <!-- Modo jugar -->
    <template v-if="jugando && fase === 'escenarios' && escenario && estadoEsc">
      <div class="space-y-3 rounded-xl border p-4" data-testid="escenario-curva">
        <p class="text-muted-foreground text-sm">
          Escenario {{ estado.actual + 1 }} de {{ escenarios.length }}
        </p>
        <h4 ref="titulo" tabindex="-1" class="text-lg font-semibold outline-none">
          {{ escenario.titulo }}
        </h4>
        <p class="text-justify">
          <strong>Situación:</strong> <TextoRico :texto="escenario.situacion" modo="linea" />
        </p>

        <!-- Paso 1: ubicar el marcador -->
        <div v-if="!estadoEsc.zonaOk" class="space-y-2">
          <p class="text-sm">
            Mueve el marcador por la curva hasta el punto que describe la situación y fíjalo.
            También puedes usar las flechas del teclado o estos botones:
          </p>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Llevar el marcador a una zona">
            <Button
              v-for="z in zonas"
              :key="z.id"
              variant="outline"
              size="sm"
              class="min-h-11"
              @click="moverAZona(z)"
            >
              {{ z.etiqueta }}
            </Button>
          </div>
          <Button class="min-h-11" data-testid="fijar-marcador" @click="fijarMarcador">
            <MapPin class="size-4" aria-hidden="true" /> Fijar el marcador aquí
          </Button>
        </div>

        <p
          v-if="aviso"
          class="flex items-start gap-2 rounded-md px-3 py-2 text-sm"
          :class="aviso.tipo === 'error' ? 'bg-destructive/10' : 'bg-success-soft'"
        >
          <CircleAlert
            v-if="aviso.tipo === 'error'"
            class="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <Check v-else class="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {{ aviso.texto }}
        </p>

        <!-- Paso 2: responder -->
        <div v-if="estadoEsc.zonaOk" class="space-y-2">
          <p class="font-semibold">
            <TextoRico :texto="escenario.pregunta" modo="linea" />
          </p>
          <ul class="space-y-2">
            <li v-for="o in opcionesVisibles" :key="o.opcion.id">
              <button
                type="button"
                class="focus-visible:ring-ring flex min-h-11 w-full items-start gap-2 rounded-lg border px-3 py-2 text-left outline-none focus-visible:ring-2"
                :class="
                  !respondido
                    ? 'bg-card hover:bg-accent'
                    : o.opcion.id === escenario.correcta
                      ? 'border-success bg-success-soft'
                      : estadoEsc.respuesta === o.indice
                        ? 'border-destructive bg-destructive/10'
                        : 'opacity-70'
                "
                :disabled="respondido"
                :aria-pressed="estadoEsc.respuesta === o.indice"
                @click="responder(o.indice)"
              >
                <Check
                  v-if="respondido && o.opcion.id === escenario.correcta"
                  class="text-success mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <X
                  v-else-if="respondido && estadoEsc.respuesta === o.indice"
                  class="text-destructive mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <TextoRico :texto="o.opcion.texto" modo="linea" />
              </button>
            </li>
          </ul>
          <div
            v-if="respondido"
            class="space-y-2 rounded-md border p-3"
            data-testid="retro-escenario"
          >
            <p class="font-semibold" :class="acerto ? 'text-success' : 'text-destructive'">
              {{ acerto ? 'Correcto' : 'No es correcto' }}
            </p>
            <p class="text-justify text-sm">
              <TextoRico :texto="escenario.retroalimentacion" modo="linea" />
            </p>
            <p v-if="escenario.nota" class="text-muted-foreground flex items-start gap-2 text-sm">
              <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <TextoRico :texto="escenario.nota" modo="linea" />
            </p>
            <Button class="min-h-11" data-testid="siguiente-escenario" @click="siguienteEscenario">
              {{ estado.actual >= escenarios.length - 1 ? 'Ver resultado' : 'Siguiente escenario' }}
            </Button>
          </div>
        </div>
      </div>
    </template>

    <!-- Resumen -->
    <div
      v-if="jugando && fase === 'resumen' && resumen"
      class="space-y-2 rounded-xl border p-4"
      data-testid="resumen-curva"
    >
      <h4 ref="tituloResumen" tabindex="-1" class="text-lg font-semibold outline-none">
        Resultado: {{ resumen.porcentaje }} % de acierto · {{ resumen.resultado.puntaje }} de
        {{ actividad.puntaje_max }} puntos
      </h4>
      <p><TextoRico :texto="resumen.mensaje" modo="linea" /></p>
      <p v-if="actividad.aprobacion_min !== undefined && !resumen.aprobado" class="text-sm">
        Necesitas {{ Math.round(actividad.aprobacion_min * 100) }} % de acierto para seguir:
        inténtalo de nuevo.
      </p>
      <Button variant="outline" class="min-h-11" @click="repetir">
        <RotateCcw class="size-4" aria-hidden="true" /> Repetir
      </Button>
    </div>

    <!-- Modo revisar: las respuestas correctas -->
    <ol v-if="!jugando" class="space-y-3" data-testid="revision-curva">
      <li v-for="e in escenarios" :key="e.id" class="space-y-1 rounded-xl border p-4">
        <p class="font-semibold">{{ e.titulo }}</p>
        <p class="text-sm"><TextoRico :texto="e.situacion" modo="linea" /></p>
        <p class="text-sm">
          <strong>Zona:</strong> {{ zonaDe(e.zona)?.etiqueta }} ·
          <strong>Respuesta:</strong>
          <TextoRico
            :texto="e.opciones.find((o) => o.id === e.correcta)?.texto ?? ''"
            modo="linea"
          />
        </p>
        <p class="text-muted-foreground text-sm">
          <TextoRico :texto="e.retroalimentacion" modo="linea" />
        </p>
      </li>
    </ol>

    <p class="sr-only" aria-live="polite">{{ mensajeVivo }}</p>
  </section>
</template>

<style scoped>
.marcador {
  touch-action: none;
  outline: none;
}
.marcador:focus-visible circle:last-of-type {
  stroke: var(--ring);
  stroke-width: 5;
}
.cursor-grab:active {
  cursor: grabbing;
}
</style>
