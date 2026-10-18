<script setup lang="ts">
/**
 * Actividad `multicapa` (docs/content-schema.md, 7.1 y 8): un dibujo SVG con capas que el
 * estudiante toca para leer su ficha (`explorar`) o para encontrar la que pide el enunciado
 * (`identificar`).
 *
 * Estructura
 *  - El SVG se descarga con `fetch` y se inyecta inline (`svgCapas.ts` lo sanea, marca las capas
 *    y construye las zonas táctiles). Mientras carga, o si falla, la LISTA de capas sigue
 *    funcionando: una actividad obligatoria no puede quedar bloqueada por un dibujo que no llega.
 *  - Junto al dibujo hay SIEMPRE una lista de capas como botones (teclado, lector de pantalla y
 *    superposiciones difíciles de tocar). Es la misma actividad, no un modo aparte.
 *  - Tocar/clic activa una capa. En escritorio, pasar el cursor resalta la capa y, en `explorar`,
 *    muestra su ficha; con el dedo (`pointerType` táctil) no hay hover. Nada depende solo del
 *    hover. En `identificar` el hover solo resalta: la ficha traería el nombre de la respuesta.
 *
 * Contrato (activities/types.ts): `progreso` con `crearEmisorProgreso`, `interaccion` por cada
 * acción, `completada` una vez por ejecución con puntaje de `@/content/scoring`. En modo
 * `revisar` es solo lectura: muestra las fichas y las respuestas correctas y no emite nada.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  useTemplateRef,
  watch,
} from 'vue';
import { usePreferredReducedMotion } from '@vueuse/core';
import {
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Eye,
  Info,
  LoaderCircle,
  RotateCcw,
  Target,
  Trophy,
} from '@lucide/vue';
import { intentoInicial } from '@/activities/types';
import type {
  EmitsActividadMulticapa,
  InteraccionActividad,
  ProgresoActividad,
  PropsActividadMulticapa,
  ResultadoActividad,
} from '@/activities/types';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import { crearEmisorProgreso } from '@/content/progreso';
import { calcularPuntaje, precisionPorConteo, textoRetroalimentacion } from '@/content/scoring';
import {
  barajar,
  capasAcertadas,
  construirConsignas,
  crearInstantanea,
  detalleDeExplorar,
  detalleDeIdentificar,
  erroresDe,
  leerInstantanea,
  nuevaSemilla,
  requeridasEfectivas,
  totalErrores,
  veredictoDeToque,
} from './logica';
import type { EstadoIntento } from './logica';
import { ErrorSvg, actualizarEscala, prefijoDeIds, prepararSvg } from './svgCapas';
import TextoLinea from './TextoLinea.vue';

const props = withDefaults(defineProps<PropsActividadMulticapa>(), {
  modo: 'jugar',
  estadoPrevio: undefined,
});
const emit = defineEmits<EmitsActividadMulticapa>();

const uid = useId();
const idTitulo = `${uid}-titulo`;
const idLista = `${uid}-lista`;

const movimiento = usePreferredReducedMotion();
const movimientoReducido = computed(() => movimiento.value === 'reduce');

/* ---- configuración derivada (solo lectura) ---- */

const config = computed(() => props.actividad.config);
const jugando = computed(() => props.modo !== 'revisar');
const esIdentificar = computed(() => config.value.modo === 'identificar');
const capas = computed(() => config.value.capas);
const capaPorId = computed(() => {
  const mapa = new Map<string, (typeof capas.value)[number]>();
  for (const capa of capas.value) if (!mapa.has(capa.id)) mapa.set(capa.id, capa);
  return mapa;
});
const requeridas = computed(() => requeridasEfectivas(config.value));
const consignas = computed(() => (esIdentificar.value ? construirConsignas(config.value) : []));

/* ---- estado de la ejecución ---- */

const intentos = ref(1);
/** Tras la primera acción (o un reintento) el número de intento ya no se recalcula. */
let intentosFijados = false;
const visitadas = ref<string[]>([]);
const paso = ref(0);
const errores = ref<Record<string, number>>({});
const semilla = ref(nuevaSemilla());
const completado = ref(false);
const resultado = ref<ResultadoActividad<'multicapa'> | null>(null);
const seleccionada = ref<string | null>(null);
const veredicto = ref<{ tipo: 'correcta' | 'incorrecta' | 'info'; texto: string } | null>(null);
const pulso = ref<string | null>(null);
const hoverSvg = ref<string | null>(null);
const resaltoLista = ref<string | null>(null);
const anuncio = ref('');
let paridadAnuncio = false;

const emisor = crearEmisorProgreso<ProgresoActividad>((p) => emit('progreso', p));

const requeridasVistas = computed(
  () => requeridas.value.filter((id) => visitadas.value.includes(id)).length,
);
const consignaActual = computed(() => consignas.value[paso.value] ?? null);
const acertadas = computed(() => capasAcertadas(consignas.value, paso.value));
const fallosTotales = computed(() => totalErrores(errores.value));
const sinContenido = computed(() => requeridas.value.length === 0 || capas.value.length === 0);

const totalPasos = computed(() =>
  esIdentificar.value ? consignas.value.length : requeridas.value.length,
);
const pasosHechos = computed(() => (esIdentificar.value ? paso.value : requeridasVistas.value));
const porcentajeAvance = computed(() =>
  totalPasos.value > 0
    ? Math.round((Math.min(pasosHechos.value, totalPasos.value) / totalPasos.value) * 100)
    : 0,
);

/** Capas de la lista: en `identificar` se barajan (estable en la ejecución) para no delatar el orden. */
const listaCapas = computed(() => {
  const base = capas.value.map((capa, indice) => ({ capa, indice }));
  return esIdentificar.value && jugando.value ? barajar(base, semilla.value) : base;
});

function aplicarEstadoPrevio(): void {
  intentos.value = intentoInicial(props.estadoPrevio);
  visitadas.value = [];
  paso.value = 0;
  errores.value = {};
  if (!jugando.value) return;
  const estado = leerInstantanea(
    props.estadoPrevio?.progreso?.instantanea,
    config.value,
    consignas.value.length,
  );
  if (!estado) return;
  if (estado.modo === 'explorar') {
    visitadas.value = estado.visitadas;
  } else {
    paso.value = estado.paso;
    errores.value = estado.erroresPorCapa;
    if (estado.semilla !== undefined) semilla.value = estado.semilla;
  }
}
aplicarEstadoPrevio();

/** Vuelve al estado inicial de una ejecución (cambio de actividad o de modo). */
function reiniciarLocal(): void {
  completado.value = false;
  resultado.value = null;
  seleccionada.value = null;
  veredicto.value = null;
  pulso.value = null;
  hoverSvg.value = null;
  resaltoLista.value = null;
  intentosFijados = false;
  emisor.reabrir();
  aplicarEstadoPrevio();
}

// El estado del servidor puede llegar tarde: hasta la primera acción, se recalcula el intento (y se
// vuelve a leer la instantánea) con lo último que se sabe.
watch(
  () => props.estadoPrevio,
  () => {
    if (!intentosFijados && !completado.value) aplicarEstadoPrevio();
  },
  { deep: true },
);
watch(() => props.modo, reiniciarLocal);
watch(
  () => props.actividad.id,
  () => {
    reiniciarLocal();
    void cargarSvg();
  },
);

/* ---- anuncios (región aria-live) ---- */

/** Un anuncio a la vez; alterna un carácter invisible para que un texto repetido se vuelva a leer. */
function anunciar(texto: string): void {
  paridadAnuncio = !paridadAnuncio;
  anuncio.value = paridadAnuncio ? texto : `${texto}\u200B`;
}

function fichaTexto(capa: { etiqueta: string; descripcion: string }): string {
  return `${capa.etiqueta}. ${textoPlanoDeMarkdown(capa.descripcion)}`;
}

/* ---- eventos del contrato ---- */

function notificar(interaccion: InteraccionActividad): void {
  if (jugando.value) emit('interaccion', interaccion);
}

function estadoActual(): EstadoIntento & { semilla?: number } {
  return esIdentificar.value
    ? {
        modo: 'identificar',
        paso: paso.value,
        erroresPorCapa: errores.value,
        semilla: semilla.value,
      }
    : { modo: 'explorar', visitadas: visitadas.value };
}

function emitirProgreso(): void {
  if (!jugando.value || completado.value) return;
  emisor.emitir({
    avance: totalPasos.value > 0 ? Math.min(1, pasosHechos.value / totalPasos.value) : 0,
    intentos: intentos.value,
    instantanea: crearInstantanea(estadoActual()),
  });
}

const tituloResultado = useTemplateRef<HTMLElement>('tituloResultado');
const titulo = useTemplateRef<HTMLElement>('titulo');

function completar(): void {
  if (completado.value || !jugando.value) return;
  const identificar = esIdentificar.value;
  const precision = identificar
    ? precisionPorConteo(consignas.value.length, fallosTotales.value)
    : 1;
  const puntaje = calcularPuntaje(props.actividad, { precision, intentos: intentos.value });
  const final: ResultadoActividad<'multicapa'> = {
    puntaje,
    intentos: intentos.value,
    precision,
    detalle: identificar
      ? detalleDeIdentificar(consignas.value.length, errores.value)
      : detalleDeExplorar(visitadas.value),
  };
  // Primero se cierra el emisor: ningún `progreso` puede salir después de `completada`.
  emisor.cerrar();
  completado.value = true;
  resultado.value = final;
  anunciar(`Actividad completada. Obtuviste ${puntaje} de ${props.actividad.puntaje_max} puntos.`);
  emit('completada', final);
  // R6: al completar, el foco pasa al encabezado del resultado.
  void nextTick().then(() => tituloResultado.value?.focus());
}

function reiniciar(): void {
  if (!jugando.value) return;
  intentos.value += 1;
  intentosFijados = true;
  visitadas.value = [];
  paso.value = 0;
  errores.value = {};
  semilla.value = nuevaSemilla();
  completado.value = false;
  resultado.value = null;
  seleccionada.value = null;
  veredicto.value = null;
  pulso.value = null;
  emisor.reabrir();
  notificar({ accion: 'reinicia_actividad' });
  anunciar('Empiezas otro intento.');
  void nextTick().then(() => titulo.value?.focus());
}

/* ---- activar una capa (toque, clic o botón de la lista) ---- */

function activar(id: string): void {
  const capa = capaPorId.value.get(id);
  if (!capa) return;
  seleccionada.value = id;
  pulso.value = movimientoReducido.value ? null : id;

  if (!jugando.value) {
    veredicto.value = null;
    anunciar(fichaTexto(capa));
    return;
  }
  if (completado.value) {
    // Terminada la ejecución se puede seguir leyendo las fichas; ya no puntúa ni guarda progreso.
    veredicto.value = null;
    notificar({ accion: 'selecciona_capa', objeto: id });
    anunciar(fichaTexto(capa));
    return;
  }
  intentosFijados = true;
  if (esIdentificar.value) alIdentificar(id, capa);
  else alExplorar(id, capa);
}

function alExplorar(id: string, capa: { etiqueta: string; descripcion: string }): void {
  notificar({ accion: 'selecciona_capa', objeto: id });
  if (!visitadas.value.includes(id)) visitadas.value = [...visitadas.value, id];
  veredicto.value = null;
  const faltan = requeridas.value.length - requeridasVistas.value;
  anunciar(
    `${fichaTexto(capa)} Capas obligatorias vistas: ${requeridasVistas.value} de ${requeridas.value.length}.`,
  );
  if (requeridas.value.length > 0 && faltan === 0) completar();
  else emitirProgreso();
}

function alIdentificar(id: string, capa: { etiqueta: string; descripcion: string }): void {
  const consigna = consignaActual.value;
  if (!consigna) return;
  const veredictoToque = veredictoDeToque(id, consigna.capa, acertadas.value);

  if (veredictoToque === 'correcta') {
    notificar({ accion: 'identifica_capa', objeto: id, resultado: 'correcta' });
    paso.value += 1;
    veredicto.value = { tipo: 'correcta', texto: `¡Correcto! Es «${capa.etiqueta}».` };
    const siguiente = consignaActual.value;
    if (siguiente) {
      anunciar(
        `Correcto: ${fichaTexto(capa)} Siguiente consigna: ${textoPlanoDeMarkdown(siguiente.texto)}`,
      );
      emitirProgreso();
    } else {
      anunciar(`Correcto: ${fichaTexto(capa)}`);
      completar();
    }
    return;
  }

  if (veredictoToque === 'incorrecta') {
    errores.value = {
      ...errores.value,
      [consigna.capa]: erroresDe(errores.value, consigna.capa) + 1,
    };
    // Objeto = la capa PEDIDA; después, la tocada, para que el mentor sepa qué confundió con qué.
    notificar({ accion: 'identifica_capa', objeto: consigna.capa, resultado: 'incorrecta' });
    notificar({ accion: 'selecciona_capa', objeto: id });
    veredicto.value = {
      tipo: 'incorrecta',
      texto: `Esa no es. Tocaste «${capa.etiqueta}». Lee otra vez la consigna e inténtalo de nuevo.`,
    };
    anunciar(`Incorrecto. Tocaste ${fichaTexto(capa)} Lee otra vez la consigna.`);
    emitirProgreso();
    return;
  }

  // Ya acertada antes: se lee su ficha pero no cuenta como fallo.
  notificar({ accion: 'selecciona_capa', objeto: id });
  veredicto.value = {
    tipo: 'info',
    texto: `Ya identificaste «${capa.etiqueta}»; esa no cuenta como error. Sigue con la consigna.`,
  };
  anunciar(`${fichaTexto(capa)} Ya la identificaste; no cuenta como error.`);
}

/* ---- ficha visible ---- */

/** La ficha que se muestra: la vista previa del cursor (si procede) o la última capa activada. */
const capaFicha = computed(() => {
  const previa = !esIdentificar.value || !jugando.value ? hoverSvg.value : null;
  const id = previa ?? seleccionada.value;
  return id === null ? null : (capaPorId.value.get(id) ?? null);
});

const textoFichaVacia = computed(() => {
  if (!jugando.value) return 'Toca una capa del dibujo o de la lista para leer su ficha.';
  return esIdentificar.value
    ? 'Lee la consigna y toca la estructura en el dibujo o elígela en la lista.'
    : 'Toca una capa del dibujo o de la lista para leer su ficha.';
});

/* ---- lista de capas ---- */

function rotuloEstado(id: string): string | null {
  if (esIdentificar.value) return jugando.value && acertadas.value.has(id) ? 'Identificada' : null;
  if (!requeridas.value.includes(id))
    return visitadas.value.includes(id) && jugando.value ? 'Vista' : null;
  if (!jugando.value) return 'Obligatoria';
  return visitadas.value.includes(id) ? 'Vista' : 'Obligatoria';
}

function marcada(id: string): boolean {
  if (!jugando.value) return false;
  return esIdentificar.value ? acertadas.value.has(id) : visitadas.value.includes(id);
}

function alEntrarEnLista(id: string): void {
  // En `identificar` resaltar la capa al pasar por su nombre delataría la respuesta.
  if (!esIdentificar.value) resaltoLista.value = id;
}

/* ---- respuestas correctas (modo revisar de identificar) ---- */

const respuestasCorrectas = computed(() =>
  consignas.value.map((c) => ({
    texto: c.texto,
    etiqueta: capaPorId.value.get(c.capa)?.etiqueta ?? c.capa,
  })),
);

/* ---- resultado ---- */

const textoResultado = computed(() =>
  resultado.value ? textoRetroalimentacion(props.actividad, resultado.value.precision) : '',
);
const porcentajeResultado = computed(() =>
  resultado.value ? Math.round(resultado.value.precision * 100) : 0,
);
const aprobacionPendiente = computed(() => {
  const minimo = props.actividad.aprobacion_min;
  return resultado.value !== null && minimo !== undefined && resultado.value.precision < minimo
    ? Math.round(minimo * 100)
    : null;
});

/* -------------------------------------------------------------------------------------------
 * El dibujo: descarga, inyección, estados visuales y punteros
 * ----------------------------------------------------------------------------------------- */

const anfitrion = useTemplateRef<HTMLElement>('anfitrion');
const estadoSvg = ref<'cargando' | 'listo' | 'error'>('cargando');
const mensajeErrorSvg = ref('');

let controlador: AbortController | null = null;
let solicitud = 0;
let raizSvg: SVGSVGElement | null = null;
let capasSvg = new Map<string, Element>();
let anchoViewBox = 0;
let ultimaEscala: number | null = null;
let observador: ResizeObserver | null = null;

/** Ruta pública de un archivo de `public/` respetando la base de la aplicación. */
function rutaPublica(ruta: string): string {
  return `${import.meta.env.BASE_URL}${ruta.replace(/^\/+/, '')}`;
}

/** Ruta pública del SVG respetando la base de la aplicación (`import.meta.env.BASE_URL`). */
function urlDelSvg(): string {
  return `${import.meta.env.BASE_URL}${config.value.svg.replace(/^\/+/, '')}`;
}

function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorSvg) return 'El dibujo no tiene un formato válido.';
  if (
    error instanceof Response ||
    (typeof error === 'object' && error !== null && 'estado' in error)
  ) {
    return 'El dibujo no está disponible por ahora.';
  }
  return 'No pudimos descargar el dibujo. Revisa tu conexión.';
}

function soltarSvg(): void {
  observador?.disconnect();
  observador = null;
  raizSvg?.remove();
  raizSvg = null;
  capasSvg = new Map();
  ultimaEscala = null;
}

async function cargarSvg(): Promise<void> {
  controlador?.abort();
  const ctl = new AbortController();
  controlador = ctl;
  const mia = ++solicitud;
  soltarSvg();
  estadoSvg.value = 'cargando';
  mensajeErrorSvg.value = '';
  try {
    if (typeof fetch !== 'function') throw new Error('sin fetch');
    const respuesta = await fetch(urlDelSvg(), { signal: ctl.signal });
    if (!respuesta.ok)
      throw Object.assign(new Error(`HTTP ${respuesta.status}`), { estado: respuesta.status });
    const texto = await respuesta.text();
    if (mia !== solicitud) return;
    const preparado = prepararSvg(texto, {
      idsCapas: capas.value.map((c) => c.id),
      prefijoId: prefijoDeIds(props.actividad.id),
      viewBox: config.value.viewBox,
    });
    const destino = anfitrion.value;
    if (!destino) return;
    destino.replaceChildren(preparado.raiz);
    raizSvg = preparado.raiz;
    capasSvg = preparado.capas;
    anchoViewBox = preparado.medidas[0];
    estadoSvg.value = 'listo';
    reescalar();
    if (typeof ResizeObserver !== 'undefined') {
      observador = new ResizeObserver(() => reescalar());
      observador.observe(destino);
    }
    pintarEstados();
  } catch (error) {
    if (ctl.signal.aborted || mia !== solicitud) return;
    estadoSvg.value = 'error';
    mensajeErrorSvg.value = mensajeDeError(error);
  }
}

/** Las zonas de solo contorno miden `44 / escala` unidades: se ajustan si el dibujo cambia de tamaño. */
function reescalar(): void {
  const raiz = raizSvg;
  if (!raiz || anchoViewBox <= 0) return;
  const ancho = raiz.getBoundingClientRect().width || anfitrion.value?.clientWidth || 0;
  if (!(ancho > 0)) return;
  const escala = ancho / anchoViewBox;
  if (ultimaEscala !== null && Math.abs(escala - ultimaEscala) / ultimaEscala < 0.01) return;
  ultimaEscala = escala;
  actualizarEscala(raiz, escala);
}

/** Clases de estado sobre las capas del dibujo (contorno más grueso o rayado: no solo color). */
function pintarEstados(): void {
  const resaltada = hoverSvg.value ?? resaltoLista.value;
  for (const [id, el] of capasSvg) {
    el.classList.toggle('es-activa', id === seleccionada.value);
    el.classList.toggle('es-resaltada', id === resaltada);
    el.classList.toggle('pulso', id === pulso.value && !movimientoReducido.value);
  }
}
watch([seleccionada, hoverSvg, resaltoLista, pulso, movimientoReducido], pintarEstados, {
  flush: 'post',
});

function capaDelEvento(evento: Event): string | null {
  const objetivo = evento.target;
  if (!(objetivo instanceof Element)) return null;
  return objetivo.closest('[data-capa]')?.getAttribute('data-capa') ?? null;
}

/** Clic o toque: el navegador lo genera tras un toque sin desplazamiento, así el scroll no activa nada. */
function alClicSvg(evento: MouseEvent): void {
  const id = capaDelEvento(evento);
  if (id !== null) activar(id);
}

function alPunteroSobre(evento: PointerEvent): void {
  // Con el dedo no hay hover: el toque activa directamente.
  if (evento.pointerType === 'touch') return;
  hoverSvg.value = capaDelEvento(evento);
}

function alPunteroFuera(evento: PointerEvent): void {
  if (evento.pointerType === 'touch') return;
  hoverSvg.value = null;
}

onMounted(() => {
  void cargarSvg();
});

onBeforeUnmount(() => {
  controlador?.abort();
  controlador = null;
  solicitud++;
  emisor.vaciar();
  soltarSvg();
});

defineExpose({ activar, reiniciar });
</script>

<template>
  <section
    class="multicapa space-y-4"
    :aria-labelledby="idTitulo"
    :data-movimiento="movimientoReducido ? 'reducido' : 'normal'"
    :data-modo="config.modo"
    data-testid="actividad-multicapa"
  >
    <header class="space-y-1">
      <h3 :id="idTitulo" ref="titulo" tabindex="-1" class="text-lg font-semibold outline-offset-4">
        {{ actividad.titulo }}
      </h3>
      <p class="text-muted-foreground text-sm">
        <TextoLinea :texto="actividad.instrucciones" />
      </p>
    </header>

    <p
      v-if="!jugando"
      class="bg-muted text-foreground flex items-start gap-2 rounded-lg p-3 text-sm"
      data-testid="multicapa-aviso-revision"
    >
      <Eye class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        Modo de repaso: lee las fichas
        <template v-if="esIdentificar">y las respuestas correctas</template>. Esta vista no puntúa.
      </span>
    </p>

    <p
      v-if="sinContenido"
      class="border-input bg-muted flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm"
      role="status"
      data-testid="multicapa-sin-contenido"
    >
      <CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>Esta actividad no tiene capas que trabajar. Avísale a tu docente.</span>
    </p>

    <!-- Resultado (al completar) -->
    <div
      v-if="resultado"
      class="border-success bg-success-soft text-foreground space-y-3 rounded-lg border p-4"
      data-testid="multicapa-resultado"
    >
      <h4
        ref="tituloResultado"
        tabindex="-1"
        class="flex items-center gap-2 font-semibold outline-offset-4"
      >
        <Trophy class="text-success size-5 shrink-0" aria-hidden="true" />
        Actividad completada
      </h4>
      <p class="text-sm"><TextoLinea :texto="textoResultado" /></p>
      <ul class="text-sm">
        <li>
          Puntaje: <strong>{{ resultado.puntaje }}</strong> de {{ actividad.puntaje_max }} puntos
        </li>
        <li>Intento {{ resultado.intentos }}</li>
        <li>Precisión: {{ porcentajeResultado }} %</li>
      </ul>
      <p
        v-if="aprobacionPendiente !== null"
        class="flex items-start gap-2 text-sm font-medium"
        data-testid="multicapa-aprobacion"
      >
        <CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span
          >Necesitas {{ aprobacionPendiente }} % de acierto para seguir; inténtalo de nuevo.</span
        >
      </p>
      <p class="text-muted-foreground text-xs">
        Puedes repetirla: se conserva tu mejor puntaje. Mientras tanto, sigue leyendo las fichas.
      </p>
      <button
        type="button"
        class="border-input bg-card hover:bg-secondary inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
        data-testid="multicapa-repetir"
        @click="reiniciar"
      >
        <RotateCcw class="size-4" aria-hidden="true" />
        Repetir la actividad
      </button>
    </div>

    <!-- Avance y consigna (jugando) -->
    <div
      v-else-if="jugando && !sinContenido"
      class="border-input bg-card space-y-2 rounded-lg border p-3"
      data-testid="multicapa-progreso"
    >
      <div class="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <p v-if="esIdentificar" class="font-medium">
          Consigna {{ Math.min(paso + 1, consignas.length) }} de {{ consignas.length }}
        </p>
        <p v-else class="font-medium">
          Capas obligatorias vistas: {{ requeridasVistas }} de {{ requeridas.length }}
        </p>
        <p v-if="esIdentificar" class="text-muted-foreground">
          Aciertos: {{ paso }} · Fallos: {{ fallosTotales }}
        </p>
      </div>
      <div
        class="bg-muted h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-label="Avance de la actividad"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="porcentajeAvance"
      >
        <div class="bg-primary h-full" :style="{ width: `${porcentajeAvance}%` }" />
      </div>
      <p
        v-if="esIdentificar && consignaActual"
        class="flex items-start gap-2 pt-1 font-medium"
        data-testid="multicapa-consigna"
      >
        <Target class="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span><TextoLinea :texto="consignaActual.texto" /></span>
      </p>
    </div>

    <!-- Repaso de identificar: consignas con su respuesta -->
    <div v-else-if="!jugando && esIdentificar" class="space-y-2" data-testid="multicapa-respuestas">
      <h4 class="text-sm font-semibold">Consignas y respuestas</h4>
      <ol class="list-decimal space-y-2 pl-5 text-sm">
        <li v-for="(fila, i) in respuestasCorrectas" :key="i">
          <TextoLinea :texto="fila.texto" />
          <span class="block font-medium">Respuesta: {{ fila.etiqueta }}</span>
        </li>
      </ol>
    </div>

    <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
      <!-- Dibujo -->
      <div
        class="lienzo border-input bg-card rounded-lg border p-2"
        :aria-busy="estadoSvg === 'cargando'"
        data-testid="multicapa-lienzo"
      >
        <div v-show="estadoSvg === 'listo'" class="relative">
          <!-- Ilustración realista bajo las capas: misma caja y mismo encaje que el SVG (los dos centrados y sin
               recortar), así cada zona queda sobre su estructura. Decorativa: el grupo ya lleva la descripción. -->
          <img
            v-if="config.fondo"
            :src="rutaPublica(config.fondo)"
            alt=""
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 size-full rounded-md object-contain"
            data-testid="multicapa-fondo"
          />
          <div
            ref="anfitrion"
            role="group"
            :aria-label="config.alt"
            class="anfitrion relative"
            data-testid="multicapa-svg"
            @click="alClicSvg"
            @pointerover="alPunteroSobre"
            @pointerleave="alPunteroFuera"
          />
        </div>
        <p
          v-if="estadoSvg === 'cargando'"
          class="text-muted-foreground flex min-h-32 items-center justify-center gap-2 text-sm"
          role="status"
          data-testid="multicapa-cargando"
        >
          <LoaderCircle class="size-4 motion-safe:animate-spin" aria-hidden="true" />
          Cargando el dibujo…
        </p>
        <div
          v-else-if="estadoSvg === 'error'"
          class="flex min-h-32 flex-col items-start justify-center gap-2 p-2 text-sm"
          role="status"
          data-testid="multicapa-error-svg"
        >
          <p class="flex items-start gap-2 font-medium">
            <CircleAlert class="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{{ mensajeErrorSvg }}</span>
          </p>
          <p class="text-muted-foreground">
            Puedes seguir con la actividad usando la lista de capas.
          </p>
          <button
            type="button"
            class="border-input bg-card hover:bg-secondary inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 font-medium"
            data-testid="multicapa-reintentar"
            @click="cargarSvg"
          >
            <RotateCcw class="size-4" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      </div>

      <div class="min-w-0 space-y-4">
        <!-- Ficha -->
        <div
          class="border-input bg-card min-h-24 space-y-2 rounded-lg border p-3"
          data-testid="multicapa-ficha"
        >
          <p
            v-if="veredicto"
            class="flex items-start gap-2 text-sm font-medium"
            :data-veredicto="veredicto.tipo"
            data-testid="multicapa-veredicto"
          >
            <CircleCheck
              v-if="veredicto.tipo === 'correcta'"
              class="text-success mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <CircleX
              v-else-if="veredicto.tipo === 'incorrecta'"
              class="text-destructive mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <Info v-else class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{{ veredicto.texto }}</span>
          </p>
          <template v-if="capaFicha">
            <h4 class="font-semibold [overflow-wrap:anywhere]">{{ capaFicha.etiqueta }}</h4>
            <p class="text-sm"><TextoLinea :texto="capaFicha.descripcion" /></p>
          </template>
          <p v-else class="text-muted-foreground flex items-start gap-2 text-sm">
            <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{{ textoFichaVacia }}</span>
          </p>
        </div>

        <!-- Lista de capas: alternativa de teclado y de lector de pantalla (R1) -->
        <div>
          <h4 :id="idLista" class="mb-2 text-sm font-semibold">Capas del dibujo</h4>
          <ul :aria-labelledby="idLista" class="flex flex-col gap-2" data-testid="multicapa-lista">
            <li v-for="{ capa, indice } in listaCapas" :key="`${indice}-${capa.id}`">
              <button
                type="button"
                class="border-input bg-card hover:bg-secondary flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium [overflow-wrap:anywhere]"
                :class="seleccionada === capa.id ? 'border-primary bg-secondary border-2' : ''"
                :aria-current="seleccionada === capa.id ? 'true' : undefined"
                :data-capa="capa.id"
                @click="activar(capa.id)"
                @pointerenter="alEntrarEnLista(capa.id)"
                @pointerleave="resaltoLista = null"
                @focus="alEntrarEnLista(capa.id)"
                @blur="resaltoLista = null"
              >
                <Check
                  v-if="marcada(capa.id)"
                  class="text-success size-4 shrink-0"
                  aria-hidden="true"
                />
                <span v-else class="size-4 shrink-0" aria-hidden="true" />
                <span class="min-w-0 flex-1">{{ capa.etiqueta }}</span>
                <span
                  v-if="rotuloEstado(capa.id)"
                  class="text-muted-foreground shrink-0 text-xs font-normal"
                >
                  {{ rotuloEstado(capa.id) }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Único punto de anuncios: acierto, error, ficha y actividad completada (R4) -->
    <div
      class="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="multicapa-anuncio"
    >
      {{ anuncio }}
    </div>
  </section>
</template>

<style scoped>
.lienzo {
  /* El dibujo ocupa el ancho y nunca se sale de la pantalla del móvil. */
  min-width: 0;
}
.anfitrion :deep(.multicapa-svg) {
  display: block;
  width: 100%;
  height: auto;
  max-height: 30rem;
  /* El desplazamiento de la página con el dedo sigue funcionando (R8): sin touch-action. */
}
.anfitrion :deep(g[data-capa]) {
  cursor: pointer;
}

/* Capa activa: contorno rayado y grueso (no solo color). */
.anfitrion
  :deep(
    g[data-capa].es-activa
      :is(path, rect, circle, ellipse, line, polyline, polygon):not(
        [data-zona-auto],
        [data-zona-toque] *
      )
  ) {
  stroke: var(--primary);
  stroke-width: 4px;
  stroke-dasharray: 10 5;
  vector-effect: non-scaling-stroke;
}
/* Capa bajo el cursor (escritorio) o elegida en la lista: contorno continuo. */
.anfitrion
  :deep(
    g[data-capa].es-resaltada:not(.es-activa)
      :is(path, rect, circle, ellipse, line, polyline, polygon):not(
        [data-zona-auto],
        [data-zona-toque] *
      )
  ) {
  stroke: var(--ring);
  stroke-width: 3px;
  vector-effect: non-scaling-stroke;
}

@media (prefers-reduced-motion: no-preference) {
  .anfitrion :deep(g[data-capa].pulso) {
    animation: multicapa-pulso 0.5s ease-out 1;
  }
}
@keyframes multicapa-pulso {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
}
</style>
