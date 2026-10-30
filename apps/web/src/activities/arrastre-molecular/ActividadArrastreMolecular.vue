<script setup lang="ts">
/**
 * Actividad `arrastre-molecular` (docs/content-schema.md 7.2): el estudiante lleva cada molécula
 * al receptor al que se une y ve el efecto biológico del acople.
 *
 * Tres formas de hacer lo mismo (regla R1: la alternativa no es un modo aparte):
 *  - Arrastrar con el ratón o el dedo (Pointer Events, `useArrastreMolecular`): el receptor se
 *    elige por cercanía dentro de un radio de captura de 56 px; soltar en el vacío devuelve la
 *    pieza a la bandeja sin fallo.
 *  - Tocar la molécula y luego el receptor (dos toques), sin arrastrar.
 *  - Teclado y lector de pantalla: Enter o Espacio sobre la molécula la elige, y Tab o las
 *    flechas llevan al receptor, donde Enter la acopla. Todo se anuncia en una región
 *    `aria-live="polite"`.
 *
 * Reglas (types.ts, "Arrastre"): solo es un fallo acoplar una molécula sobre un receptor que no es
 * el suyo, o un distractor sobre cualquiera (entonces se muestra su `rechazo`). Un receptor acepta
 * varias moléculas y muestra el efecto de la ÚLTIMA. Se completa cuando cada par se acopló al
 * menos una vez. `precision` = acoples correctos / (acoples correctos + fallos).
 *
 * La lógica (modelo, suelta, instantánea) está en `logica.ts` y la geometría en `geometria.ts`;
 * ambas son funciones puras con pruebas. Aquí solo hay estado, eventos del contrato y vista.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  useId,
  useTemplateRef,
  watch,
} from 'vue';
import { useMediaQuery } from '@vueuse/core';
import {
  Ban,
  ArrowDownToLine,
  CircleAlert,
  CircleCheck,
  CircleX,
  Droplets,
  Gem,
  Hand,
  Info,
  Link,
  Minimize2,
  RotateCcw,
  Shuffle,
  Sprout,
  Zap,
} from '@lucide/vue';
import { textoPlanoDeMarkdown } from '@/content/markdown';
import { crearEmisorProgreso } from '@/content/progreso';
import type { AnimacionEfecto } from '@/content/schema';
import {
  bandaRetroalimentacion,
  calcularPuntaje,
  precisionPorConteo,
  textoRetroalimentacion,
} from '@/content/scoring';
import type { BandaRetroalimentacion } from '@/content/scoring';
import { intentoInicial } from '../types';
import type {
  EmitsActividadArrastreMolecular,
  EstadoPrevioActividad,
  ProgresoActividad,
  PropsActividadArrastreMolecular,
} from '../types';
import {
  alineacionEtiqueta,
  anchoMaxEtiquetaPx,
  aspectoDeViewBox,
  centroDeRect,
  margenInferiorEscena,
  ordenBarajado,
  semillaNueva,
} from './geometria';
import {
  aInstantanea,
  aplicarSuelta,
  construirModelo,
  erroresPorId,
  estadoVacio,
  estaCompleto,
  paresAcopladosEn,
  parVisibleDeReceptor,
  resolverSuelta,
  restaurarInstantanea,
} from './logica';
import type { EstadoArrastre } from './logica';
import EfectoReceptor from './partes/EfectoReceptor.vue';
import FormaMolecula from './partes/FormaMolecula.vue';
import TarjetaEfecto from './partes/TarjetaEfecto.vue';
import TextoLinea from './partes/TextoLinea.vue';
import { useArrastreMolecular } from './useArrastreMolecular';

const props = withDefaults(defineProps<PropsActividadArrastreMolecular>(), {
  modo: 'jugar',
  estadoPrevio: undefined,
});
const emit = defineEmits<EmitsActividadArrastreMolecular>();

const uid = useId();
const reducirMovimiento = useMediaQuery('(prefers-reduced-motion: reduce)');

/** Nombre del evento del DOM con el que se pide a la página abrir un término del glosario. */
const EVENTO_GLOSARIO = 'ova:glosario';

/* -------------------------------------------------------------------------------------------
 * Modelo y estado de la ejecución
 * ----------------------------------------------------------------------------------------- */

const modelo = computed(() => construirModelo(props.actividad.config));
const jugando = computed(() => props.modo === 'jugar');

const estado = shallowRef<EstadoArrastre>(estadoVacio());
const semilla = ref(semillaNueva());
const intentos = ref(1);
/** ¿El estudiante ya hizo algo? Hasta entonces, `estadoPrevio` puede cambiar lo que se muestra. */
const interactuado = ref(false);

interface ResumenFinal {
  puntaje: number;
  precision: number;
  porcentaje: number;
  errores: number;
  banda: BandaRetroalimentacion;
  mensaje: string;
  aprobacion: { minimo: number; alcanzado: boolean } | null;
}
const resumen = ref<ResumenFinal | null>(null);
const completada = computed(() => resumen.value !== null);
const activo = computed(() => jugando.value && !completada.value && modelo.value.problema === null);

/** Molécula elegida (toque o teclado), a la espera de un receptor. */
const seleccion = ref<number | null>(null);
/** Receptor tocado sin molécula elegida (se muestra su descripción). */
const inspeccion = ref<number | null>(null);

const emisor = crearEmisorProgreso<ProgresoActividad>((p) => emit('progreso', p));

/** Aplica lo guardado: número de intento y, si es del intento en curso, el avance a medias. */
function aplicarPrevio(previo: EstadoPrevioActividad | undefined): void {
  intentos.value = intentoInicial(previo);
  const progreso = previo?.progreso;
  if (!progreso || !Number.isFinite(progreso.intentos)) return;
  // Una instantánea de un intento que el servidor ya da por terminado no se restaura.
  if (Math.floor(progreso.intentos) < intentos.value) return;
  const restaurado = restaurarInstantanea(progreso.instantanea, modelo.value);
  if (!restaurado) return;
  estado.value = restaurado.estado;
  if (restaurado.semilla !== null) semilla.value = restaurado.semilla;
}
aplicarPrevio(props.estadoPrevio);

// El estado del servidor puede llegar tarde: hasta la primera interacción se recalcula.
watch(
  () => props.estadoPrevio,
  (nuevo) => {
    if (interactuado.value || completada.value) return;
    estado.value = estadoVacio();
    aplicarPrevio(nuevo);
  },
  { deep: true },
);

// Otra actividad en la misma instancia: se empieza de cero.
watch(modelo, () => {
  estado.value = estadoVacio();
  semilla.value = semillaNueva();
  seleccion.value = null;
  inspeccion.value = null;
  resumen.value = null;
  efectosVivos.value = {};
  interactuado.value = false;
  emisor.reabrir();
  mensaje.value = MENSAJE_INICIAL();
  aplicarPrevio(props.estadoPrevio);
});

onBeforeUnmount(() => emisor.vaciar());

/* -------------------------------------------------------------------------------------------
 * Mensajes (región aria-live)
 * ----------------------------------------------------------------------------------------- */

type TipoMensaje = 'ayuda' | 'exito' | 'error';
interface Mensaje {
  tipo: TipoMensaje;
  resumen: string;
  /** Texto con Markdown de línea (descripción de la molécula, `rechazo`...). */
  detalle?: string;
  /** Título del efecto biológico (texto plano). */
  titulo?: string;
  /** Solo para el lector de pantalla: la descripción del efecto, que la tarjeta muestra completa. */
  lector?: string;
  /** Cierre de la actividad. */
  final?: string;
}

const MENSAJE_INICIAL = (): Mensaje => ({
  tipo: 'ayuda',
  resumen: 'Toca una molécula para elegirla, o arrástrala hasta su receptor.',
});
const mensaje = ref<Mensaje>(MENSAJE_INICIAL());
const contadorMensaje = ref(0);

function decir(nuevo: Mensaje): void {
  mensaje.value = nuevo;
  // La clave nueva vuelve a montar el contenido: un mensaje repetido se vuelve a anunciar.
  contadorMensaje.value += 1;
}

const ICONO_MENSAJE = { ayuda: Info, exito: CircleCheck, error: CircleX } as const;

/* -------------------------------------------------------------------------------------------
 * Presentación derivada
 * ----------------------------------------------------------------------------------------- */

const aspecto = computed(() => aspectoDeViewBox(props.actividad.config?.escena?.viewBox));
/** Descripción de la escena; con contenido roto (sin `escena`) queda vacía en vez de romper. */
const altEscena = computed(() => props.actividad.config?.escena?.alt ?? '');
const margenInferior = computed(() => margenInferiorEscena(modelo.value.receptores, aspecto.value));
const orden = computed(() => ordenBarajado(modelo.value.moleculas.length, semilla.value));
const total = computed(() => modelo.value.pares.length);
const acoplados = computed(() => estado.value.acoplados.length);
const porcentajeAvance = computed(() =>
  total.value === 0 ? 0 : Math.round((acoplados.value / total.value) * 100),
);

function etiquetaMolecula(indice: number): string {
  return modelo.value.moleculas[indice]?.etiqueta ?? '';
}

function receptorDeMolecula(molecula: number): number | null {
  const par = modelo.value.moleculas[molecula]?.par ?? null;
  if (par === null || !estado.value.acoplados.includes(par)) return null;
  return modelo.value.pares[par]?.receptor ?? null;
}

interface VistaReceptor {
  indice: number;
  id: string;
  etiqueta: string;
  descripcion: string;
  x: number;
  y: number;
  /** Par cuyo efecto se ve (el último acoplado), o `null` si está libre. */
  par: number | null;
  forma: string | null;
  /**
   * Forma de la molécula que encaja en este receptor, dibujada como guía mientras está libre (observación de la
   * docente, 2026-10-27: el lugar receptor tiene la forma preestablecida de su molécula, así quien entra por primera
   * vez sabe qué figura va en cada sitio sin tener que adivinar).
   */
  formaGuia: string | null;
  animacion: AnimacionEfecto | null;
  acopladas: string[];
  alineacion: 'inicio' | 'centro' | 'fin';
  anchoEtiquetaPx: number;
}

const vistaReceptores = computed<VistaReceptor[]>(() => {
  const m = modelo.value;
  return m.receptores.map((r) => {
    const par = parVisibleDeReceptor(m, estado.value, r.indice);
    const paresAqui = paresAcopladosEn(m, estado.value, r.indice);
    // En modo `revisar` la escena enseña, sin estado, la forma de la primera molécula que encaja.
    const parForma = par ?? (jugando.value ? null : (r.pares[0] ?? null));
    const molecula = parForma === null ? null : m.moleculas[m.pares[parForma]!.molecula];
    return {
      indice: r.indice,
      id: r.id,
      etiqueta: r.etiqueta,
      descripcion: r.descripcion,
      x: r.x,
      y: r.y,
      par,
      forma: molecula?.forma ?? null,
      formaGuia:
        r.pares[0] === undefined
          ? null
          : (m.moleculas[m.pares[r.pares[0]]!.molecula]?.forma ?? null),
      animacion: par === null ? null : (m.pares[par]?.efecto.animacion ?? null),
      acopladas: paresAqui.map((p) => etiquetaMolecula(m.pares[p]!.molecula)),
      alineacion: alineacionEtiqueta(r.x),
      anchoEtiquetaPx: anchoMaxEtiquetaPx(m.receptores, r.indice, aspecto.value),
    };
  });
});

const efectosVisibles = computed(() => {
  const m = modelo.value;
  const ultimo = estado.value.acoplados.at(-1);
  return vistaReceptores.value.flatMap((r) => {
    if (r.par === null) return [];
    const par = m.pares[r.par]!;
    const molecula = m.moleculas[par.molecula]!;
    const otras = paresAcopladosEn(m, estado.value, r.indice)
      .filter((p) => p !== r.par)
      .map((p) => etiquetaMolecula(m.pares[p]!.molecula));
    return [
      {
        receptor: r.etiqueta,
        molecula: molecula.etiqueta,
        forma: molecula.forma,
        efecto: par.efecto,
        otras,
        ultimo: ultimo === r.par,
        clave: par.indice,
      },
    ];
  });
});

/** Modo `revisar`: cada par con su efecto y cada distractor con su rechazo. */
const parejasRevision = computed(() =>
  modelo.value.pares.map((par) => ({
    clave: par.indice,
    molecula: modelo.value.moleculas[par.molecula]!,
    receptor: modelo.value.receptores[par.receptor]!.etiqueta,
    efecto: par.efecto,
  })),
);
const distractoresRevision = computed(() => modelo.value.moleculas.filter((m) => m.par === null));

const ICONO_EFECTO: Readonly<Record<AnimacionEfecto, typeof Zap>> = {
  activacion: Zap,
  inhibicion: Ban,
  cascada: ArrowDownToLine,
  union: Link,
  crecimiento: Sprout,
  transformacion: Shuffle,
  liberacion: Droplets,
  mineralizacion: Gem,
  reabsorcion: Minimize2,
};
const TEXTO_EFECTO: Readonly<Record<AnimacionEfecto, string>> = {
  activacion: 'activación',
  inhibicion: 'inhibición',
  cascada: 'cascada de señal',
  union: 'unión',
  crecimiento: 'crecimiento',
  transformacion: 'transformación',
  liberacion: 'liberación',
  mineralizacion: 'mineralización',
  reabsorcion: 'reabsorción',
};

/** Animaciones en curso por receptor (solo con movimiento permitido). */
const efectosVivos = ref<Record<number, { tipo: AnimacionEfecto; n: number }>>({});
let contadorEfectos = 0;

const yaCompletada = computed(() => props.estadoPrevio?.servidor?.completada === true);

/* -------------------------------------------------------------------------------------------
 * Medición y arrastre
 * ----------------------------------------------------------------------------------------- */

const zonasReceptor: (HTMLElement | null)[] = [];
const botonesReceptor: (HTMLElement | null)[] = [];
function fijarZona(indice: number, el: unknown): void {
  zonasReceptor[indice] = el instanceof HTMLElement ? el : null;
}
function fijarBotonReceptor(indice: number, el: unknown): void {
  botonesReceptor[indice] = el instanceof HTMLElement ? el : null;
}

const arrastre = useArrastreMolecular({
  activo: () => activo.value,
  centros: () =>
    modelo.value.receptores.map((r) => {
      const zona = zonasReceptor[r.indice];
      return zona ? centroDeRect(zona.getBoundingClientRect()) : null;
    }),
  alEmpezar: (molecula) => {
    seleccion.value = null;
    inspeccion.value = null;
    empezarArrastre(molecula);
  },
  alSoltar: (molecula, receptor) => soltar(molecula, receptor),
});

/* -------------------------------------------------------------------------------------------
 * Acciones del estudiante
 * ----------------------------------------------------------------------------------------- */

function empezarArrastre(molecula: number): void {
  const m = modelo.value.moleculas[molecula];
  if (!m) return;
  interactuado.value = true;
  emit('interaccion', { accion: 'arrastra_molecula', objeto: m.id });
}

function emitirProgreso(): void {
  emisor.emitir({
    avance: total.value === 0 ? 0 : Math.min(1, acoplados.value / total.value),
    intentos: intentos.value,
    instantanea: aInstantanea(estado.value, semilla.value),
  });
}

/** Resuelve soltar `molecula` sobre `receptor` (o en el vacío, con `null`). */
function soltar(molecula: number, receptor: number | null): void {
  if (!activo.value) return;
  const m = modelo.value;
  const mol = m.moleculas[molecula];
  if (!mol) return;
  if (receptor === null || !m.receptores[receptor]) {
    decir({
      tipo: 'ayuda',
      resumen: `${mol.etiqueta} volvió a la bandeja. Suéltala sobre un receptor para acoplarla.`,
    });
    return;
  }
  const rec = m.receptores[receptor]!;
  const suelta = resolverSuelta(m, estado.value, molecula, receptor);
  interactuado.value = true;
  emit('interaccion', {
    accion: 'acopla_molecula',
    objeto: mol.id,
    resultado: suelta.tipo === 'fallo' ? 'incorrecta' : 'correcta',
  });
  estado.value = aplicarSuelta(estado.value, suelta, molecula);

  if (suelta.tipo === 'fallo') {
    decir({
      tipo: 'error',
      resumen: suelta.distractor
        ? `${mol.etiqueta} no encaja en ${rec.etiqueta}.`
        : `${mol.etiqueta} no se une a ${rec.etiqueta}. Prueba con otro receptor.`,
      detalle:
        mol.rechazo ??
        (suelta.distractor ? 'Esta molécula no se une a ningún receptor de la escena.' : undefined),
    });
    emitirProgreso();
    return;
  }

  const par = m.pares[suelta.par]!;
  if (!reducirMovimiento.value) {
    contadorEfectos += 1;
    efectosVivos.value = {
      ...efectosVivos.value,
      [receptor]: { tipo: par.efecto.animacion, n: contadorEfectos },
    };
  }
  const repetido = suelta.tipo === 'repetido';
  decir({
    tipo: 'exito',
    resumen: repetido
      ? `Volviste a acoplar ${mol.etiqueta} en ${rec.etiqueta}.`
      : `¡Acoplada! ${mol.etiqueta} se une a ${rec.etiqueta}.`,
    titulo: par.efecto.titulo,
    lector: textoPlanoDeMarkdown(par.efecto.descripcion),
  });
  if (estaCompleto(m, estado.value)) completar();
  else emitirProgreso();
}

/** Todos los pares acoplados: puntúa, avisa a la página y muestra el resultado. */
function completar(): void {
  const precision = precisionPorConteo(total.value, estado.value.fallos);
  const puntaje = calcularPuntaje(props.actividad, { precision, intentos: intentos.value });
  const minimo = props.actividad.aprobacion_min;
  resumen.value = {
    puntaje,
    precision,
    porcentaje: Math.round(precision * 100),
    errores: estado.value.fallos,
    banda: bandaRetroalimentacion(precision),
    mensaje: textoRetroalimentacion(props.actividad, precision),
    aprobacion: minimo === undefined ? null : { minimo, alcanzado: precision + 1e-9 >= minimo },
  };
  seleccion.value = null;
  inspeccion.value = null;
  mensaje.value = {
    ...mensaje.value,
    final: `Actividad completada: ${puntaje} de ${props.actividad.puntaje_max} puntos.`,
  };
  // `progreso` no debe llegar después de `completada`: se cierra el emisor antes de emitirla.
  emisor.cerrar();
  emit('completada', {
    puntaje,
    intentos: intentos.value,
    precision,
    detalle: {
      acoples_correctos: total.value,
      errores: estado.value.fallos,
      errores_por_molecula: erroresPorId(modelo.value, estado.value),
    },
  });
  void nextTick(() => tituloResultado.value?.focus());
}

const tituloResultado = useTemplateRef<HTMLElement>('titulo-resultado');
const tituloBandeja = useTemplateRef<HTMLElement>('titulo-bandeja');

/** El estudiante repite la actividad completa: es el intento siguiente. */
function repetir(): void {
  if (!jugando.value || !completada.value) return;
  intentos.value += 1;
  estado.value = estadoVacio();
  semilla.value = semillaNueva();
  resumen.value = null;
  seleccion.value = null;
  inspeccion.value = null;
  efectosVivos.value = {};
  interactuado.value = true;
  emisor.reabrir();
  decir(MENSAJE_INICIAL());
  emit('interaccion', { accion: 'reinicia_actividad' });
  void nextTick(() => tituloBandeja.value?.focus());
}

/** Toque o Enter/Espacio sobre una molécula: la elige (o quita la elección). */
function alTocarMolecula(indice: number, evento: MouseEvent): void {
  if (arrastre.clicSuprimido() || !activo.value) return;
  const mol = modelo.value.moleculas[indice];
  if (!mol) return;
  if (seleccion.value === indice) {
    seleccion.value = null;
    decir({ tipo: 'ayuda', resumen: `Quitaste la elección de ${mol.etiqueta}.` });
    return;
  }
  seleccion.value = indice;
  inspeccion.value = null;
  empezarArrastre(indice);
  decir({
    tipo: 'ayuda',
    resumen: `Elegiste ${mol.etiqueta}. Ahora elige el receptor donde se acopla.`,
    detalle: mol.descripcion,
  });
  // Con teclado o lector de pantalla (clic sin puntero), el foco pasa al primer receptor.
  if (evento.detail === 0) void nextTick(() => botonesReceptor[0]?.focus());
}

function quitarSeleccion(): void {
  if (seleccion.value === null) return;
  const mol = modelo.value.moleculas[seleccion.value];
  seleccion.value = null;
  decir({ tipo: 'ayuda', resumen: `Quitaste la elección de ${mol?.etiqueta ?? 'la molécula'}.` });
}

/** Toque o Enter sobre un receptor: acopla la molécula elegida o, sin ella, enseña el receptor. */
function alTocarReceptor(indice: number): void {
  if (!activo.value) return;
  if (seleccion.value === null) {
    const rec = modelo.value.receptores[indice];
    if (!rec) return;
    inspeccion.value = indice;
    decir({
      tipo: 'ayuda',
      resumen: `Receptor ${rec.etiqueta}. Elige primero una molécula para acoplarla.`,
      detalle: rec.descripcion,
    });
    return;
  }
  const molecula = seleccion.value;
  seleccion.value = null;
  soltar(molecula, indice);
}

function alPulsarEscape(): void {
  if (seleccion.value !== null) quitarSeleccion();
}

/** Flechas, Inicio y Fin mueven el foco entre las piezas o entre los receptores. */
function moverFoco(evento: KeyboardEvent, selector: string): void {
  const paso =
    evento.key === 'ArrowRight' || evento.key === 'ArrowDown'
      ? 1
      : evento.key === 'ArrowLeft' || evento.key === 'ArrowUp'
        ? -1
        : 0;
  const extremo = evento.key === 'Home' ? 0 : evento.key === 'End' ? -1 : null;
  if (paso === 0 && extremo === null) return;
  const contenedor = evento.currentTarget;
  const actual = evento.target instanceof Element ? evento.target.closest(selector) : null;
  if (!(contenedor instanceof HTMLElement) || !actual) return;
  const lista = Array.from(contenedor.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute('disabled'),
  );
  const posicion = lista.indexOf(actual as HTMLElement);
  if (posicion < 0) return;
  const destino =
    extremo !== null
      ? extremo === 0
        ? 0
        : lista.length - 1
      : Math.min(lista.length - 1, Math.max(0, posicion + paso));
  evento.preventDefault();
  lista[destino]?.focus();
}

/** Los enlaces `[término](glosario:id)` no navegan: se avisa a la página para abrir la definición. */
function alHacerClic(evento: MouseEvent): void {
  const enlace =
    evento.target instanceof Element ? evento.target.closest('a[data-glosario]') : null;
  if (!enlace) return;
  evento.preventDefault();
  const id = enlace.getAttribute('data-glosario');
  if (!id) return;
  enlace.dispatchEvent(
    new CustomEvent(EVENTO_GLOSARIO, {
      bubbles: true,
      composed: true,
      detail: { id, actividadId: props.actividad.id },
    }),
  );
}

/* -------------------------------------------------------------------------------------------
 * Fondo de la escena
 * ----------------------------------------------------------------------------------------- */

// La versión realista (`fondo`), si la hay; si no, el dibujo validado.
const fondo = computed(
  () => props.actividad.config?.escena?.fondo ?? props.actividad.config?.escena?.fondo_svg,
);
const fondoEstado = ref<'cargando' | 'listo' | 'error'>('cargando');
watch(fondo, () => {
  fondoEstado.value = 'cargando';
});

/* -------------------------------------------------------------------------------------------
 * Vista
 * ----------------------------------------------------------------------------------------- */

interface PiezaVista {
  indice: number;
  etiqueta: string;
  forma: string;
  descripcion: string;
  elegida: boolean;
  acopladaEn: string | null;
  arrastrando: boolean;
}

const piezas = computed<PiezaVista[]>(() =>
  orden.value.map((indice) => {
    const m = modelo.value.moleculas[indice]!;
    const receptor = receptorDeMolecula(indice);
    return {
      indice,
      etiqueta: m.etiqueta,
      forma: m.forma,
      descripcion: textoPlanoDeMarkdown(m.descripcion),
      elegida: seleccion.value === indice,
      acopladaEn: receptor === null ? null : (modelo.value.receptores[receptor]?.etiqueta ?? null),
      arrastrando: arrastre.molecula.value === indice,
    };
  }),
);

function estiloPieza(pieza: PiezaVista): Record<string, string> | undefined {
  if (!pieza.arrastrando) return undefined;
  const { x, y } = arrastre.desplazamiento.value;
  return { transform: `translate3d(${x}px, ${y}px, 0)` };
}

function estiloReceptor(r: VistaReceptor): Record<string, string> {
  return {
    left: `${r.x}%`,
    top: `${r.y}%`,
    '--ancho-cqw': `${((r.anchoEtiquetaPx / 320) * 100).toFixed(2)}cqw`,
  };
}

function nombreAccesibleSufijo(r: VistaReceptor): string {
  if (seleccion.value !== null) {
    return `. Acoplar ${etiquetaMolecula(seleccion.value)} aquí`;
  }
  return r.acopladas.length > 0 ? `. Acoplado: ${r.acopladas.join(', ')}` : '. Sin acoplar';
}

const CLASE_BANDA: Readonly<Record<BandaRetroalimentacion, string>> = {
  correcta: 'border-success bg-success-soft',
  parcial: 'border-eosina bg-accent',
  incorrecta: 'border-destructive bg-card',
};
const ICONO_BANDA: Readonly<Record<BandaRetroalimentacion, typeof CircleCheck>> = {
  correcta: CircleCheck,
  parcial: CircleAlert,
  incorrecta: CircleX,
};

defineExpose({ repetir });
</script>

<template>
  <section
    class="actividad-arrastre bg-card text-card-foreground border-border mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-4 rounded-2xl border p-4 sm:p-6 lg:max-w-none"
    :aria-labelledby="`${uid}-titulo`"
    data-actividad="arrastre-molecular"
    :data-modo="modo"
    :data-movimiento="reducirMovimiento ? 'reducido' : 'normal'"
    @click="alHacerClic"
    @keydown.esc="alPulsarEscape"
  >
    <header class="flex flex-col gap-2">
      <h3 :id="`${uid}-titulo`" class="text-foreground text-xl font-semibold">
        {{ actividad.titulo }}
      </h3>
      <p class="text-muted-foreground text-sm leading-relaxed">
        <TextoLinea :texto="actividad.instrucciones" />
      </p>
      <p v-if="yaCompletada && jugando && !completada" class="text-muted-foreground text-sm">
        Ya la completaste (mejor puntaje: {{ estadoPrevio?.servidor?.puntaje }} de
        {{ actividad.puntaje_max }}). Puedes repetirla: se guarda tu mejor puntaje.
      </p>
    </header>

    <!-- Contenido que no se puede mostrar. -->
    <div
      v-if="modelo.problema !== null"
      role="alert"
      class="border-destructive bg-card flex items-start gap-3 rounded-xl border-2 p-3"
      data-estado="error"
    >
      <CircleAlert class="text-destructive mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p class="text-foreground text-sm">
        No pudimos cargar esta actividad. {{ modelo.problema }} Si sigue pasando, avísale a tu
        docente.
      </p>
    </div>

    <!-- Modo revisar: solo lectura, con las respuestas correctas. -->
    <template v-else-if="!jugando">
      <div
        class="escena-envoltura"
        :style="{
          paddingBottom: `${margenInferior}px`,
          '--aspecto': String(aspecto),
          '--margen-escena': `${margenInferior}px`,
        }"
        data-modo-revisar
      >
        <div
          class="escena"
          role="img"
          :aria-label="altEscena"
          :style="{ aspectRatio: String(aspecto) }"
        >
          <img
            v-if="fondo && fondoEstado !== 'error'"
            class="fondo"
            :src="fondo"
            alt=""
            aria-hidden="true"
            @load="fondoEstado = 'listo'"
            @error="fondoEstado = 'error'"
          />
          <div
            v-for="r in vistaReceptores"
            :key="r.indice"
            class="receptor"
            :data-alineacion="r.alineacion"
            :style="estiloReceptor(r)"
            aria-hidden="true"
          >
            <span class="zona">
              <FormaMolecula v-if="r.forma" :forma="r.forma" class="forma-acoplada" />
              <FormaMolecula
                v-else-if="r.formaGuia"
                :forma="r.formaGuia"
                class="forma-acoplada forma-guia"
                data-forma-guia
              />
            </span>
            <span class="etiqueta-receptor">{{ r.etiqueta }}</span>
          </div>
        </div>
      </div>
      <section class="flex flex-col gap-3" :aria-labelledby="`${uid}-revision`">
        <h4 :id="`${uid}-revision`" class="text-foreground text-base font-semibold">
          Cómo se acopla cada molécula
        </h4>
        <TarjetaEfecto
          v-for="p in parejasRevision"
          :key="p.clave"
          :molecula="p.molecula.etiqueta"
          :forma="p.molecula.forma"
          :receptor="p.receptor"
          :efecto="p.efecto"
        />
        <div v-if="distractoresRevision.length > 0" class="flex flex-col gap-2">
          <h4 class="text-foreground text-base font-semibold">Moléculas que no encajan</h4>
          <ul class="flex flex-col gap-2" role="list">
            <li
              v-for="d in distractoresRevision"
              :key="d.indice"
              class="border-border bg-card flex min-w-0 items-start gap-2 rounded-xl border p-3 text-sm"
            >
              <FormaMolecula :forma="d.forma" class="text-primary mt-0.5" />
              <span class="[overflow-wrap:anywhere]">
                <strong>{{ d.etiqueta }}</strong
                >: <TextoLinea :texto="d.rechazo ?? d.descripcion" />
              </span>
            </li>
          </ul>
        </div>
      </section>
      <!-- Región de anuncios: siempre presente aunque en revisión no hay nada que anunciar. -->
      <p class="sr-only" aria-live="polite" aria-atomic="true" />
    </template>

    <!-- Jugar. -->
    <template v-else>
      <div class="flex flex-col gap-1" data-avance>
        <p class="text-foreground text-sm font-medium">Acoplados: {{ acoplados }} de {{ total }}</p>
        <div class="bg-muted h-2 overflow-hidden rounded-full" aria-hidden="true">
          <div class="bg-primary h-full" :style="{ width: `${porcentajeAvance}%` }" />
        </div>
      </div>

      <!-- Bandeja de moléculas. -->
      <section class="flex flex-col gap-2" :aria-labelledby="`${uid}-bandeja`">
        <h4
          :id="`${uid}-bandeja`"
          ref="titulo-bandeja"
          tabindex="-1"
          class="text-foreground text-base font-semibold outline-offset-4"
        >
          Moléculas
        </h4>
        <ul class="bandeja" role="list" data-bandeja @keydown="moverFoco($event, '[data-pieza]')">
          <li v-for="p in piezas" :key="p.indice" class="pieza-item">
            <button
              type="button"
              class="pieza"
              data-pieza
              :data-indice="p.indice"
              :data-estado="p.acopladaEn ? 'acoplada' : p.elegida ? 'elegida' : 'libre'"
              :data-arrastrando="p.arrastrando ? 'true' : undefined"
              :aria-pressed="p.elegida ? 'true' : 'false'"
              :aria-describedby="`${uid}-md${p.indice}`"
              :disabled="completada"
              :style="estiloPieza(p)"
              @pointerdown="arrastre.presionar($event, p.indice)"
              @click="alTocarMolecula(p.indice, $event)"
            >
              <FormaMolecula :forma="p.forma" />
              <span class="pieza-texto">{{ p.etiqueta }}</span>
              <CircleCheck v-if="p.acopladaEn" class="size-4 shrink-0" aria-hidden="true" />
              <span v-if="p.acopladaEn" class="solo-lector">, acoplada en {{ p.acopladaEn }}</span>
            </button>
            <span :id="`${uid}-md${p.indice}`" class="solo-lector">{{ p.descripcion }}</span>
          </li>
        </ul>
        <button
          v-if="seleccion !== null"
          type="button"
          class="border-input text-foreground hover:bg-muted inline-flex min-h-11 items-center gap-2 self-start rounded-lg border px-3 text-sm font-medium"
          data-quitar-seleccion
          @click="quitarSeleccion"
        >
          <Hand class="size-4" aria-hidden="true" />
          Quitar la elección
        </button>
      </section>

      <!-- Retroalimentación: la única región aria-live de la actividad, con un solo mensaje. -->
      <div
        class="flex min-h-14 items-start gap-3 rounded-xl border-2 p-3"
        :class="{
          'border-success bg-success-soft': mensaje.tipo === 'exito',
          'border-destructive bg-card': mensaje.tipo === 'error',
          'border-border bg-muted': mensaje.tipo === 'ayuda',
        }"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        :data-tipo="mensaje.tipo"
        data-retroalimentacion
      >
        <component
          :is="ICONO_MENSAJE[mensaje.tipo]"
          class="mt-0.5 size-5 shrink-0"
          :class="{
            'text-success': mensaje.tipo === 'exito',
            'text-destructive': mensaje.tipo === 'error',
            'text-foreground': mensaje.tipo === 'ayuda',
          }"
          aria-hidden="true"
        />
        <div :key="contadorMensaje" class="text-foreground min-w-0 text-sm leading-relaxed">
          <p class="[overflow-wrap:anywhere]">{{ mensaje.resumen }}</p>
          <p v-if="mensaje.titulo" class="font-semibold [overflow-wrap:anywhere]">
            {{ mensaje.titulo }}
          </p>
          <p v-if="mensaje.lector" class="solo-lector">{{ mensaje.lector }}</p>
          <p v-if="mensaje.detalle" class="text-muted-foreground mt-1">
            <TextoLinea :texto="mensaje.detalle" />
          </p>
          <p v-if="mensaje.final" class="mt-1 font-semibold">{{ mensaje.final }}</p>
        </div>
      </div>

      <!-- Escena con los receptores. -->
      <div
        class="escena-envoltura"
        :style="{
          paddingBottom: `${margenInferior}px`,
          '--aspecto': String(aspecto),
          '--margen-escena': `${margenInferior}px`,
        }"
        data-escena-envoltura
      >
        <div
          class="escena"
          role="group"
          :aria-label="altEscena"
          :aria-busy="fondoEstado === 'cargando' && fondo ? 'true' : undefined"
          :style="{ aspectRatio: String(aspecto) }"
          data-escena
          @keydown="moverFoco($event, '[data-receptor]')"
        >
          <img
            v-if="fondo && fondoEstado !== 'error'"
            class="fondo"
            :src="fondo"
            alt=""
            aria-hidden="true"
            @load="fondoEstado = 'listo'"
            @error="fondoEstado = 'error'"
          />
          <button
            v-for="r in vistaReceptores"
            :key="r.indice"
            :ref="(el) => fijarBotonReceptor(r.indice, el)"
            type="button"
            class="receptor"
            data-receptor
            :data-indice="r.indice"
            :data-alineacion="r.alineacion"
            :data-ocupado="r.par !== null ? 'true' : undefined"
            :data-efecto="r.animacion ?? undefined"
            :data-disponible="seleccion !== null ? 'true' : undefined"
            :data-objetivo="arrastre.objetivo.value === r.indice ? 'true' : undefined"
            :aria-describedby="`${uid}-rd${r.indice}`"
            :disabled="completada"
            :style="estiloReceptor(r)"
            @click="alTocarReceptor(r.indice)"
          >
            <span :ref="(el) => fijarZona(r.indice, el)" class="zona">
              <FormaMolecula v-if="r.forma" :forma="r.forma" class="forma-acoplada" />
              <FormaMolecula
                v-else-if="r.formaGuia"
                :forma="r.formaGuia"
                class="forma-acoplada forma-guia"
                data-forma-guia
              />
              <span v-if="r.animacion" class="insignia" data-insignia>
                <component :is="ICONO_EFECTO[r.animacion]" class="size-3.5" aria-hidden="true" />
              </span>
              <EfectoReceptor
                v-if="efectosVivos[r.indice]"
                :key="efectosVivos[r.indice]!.n"
                :tipo="efectosVivos[r.indice]!.tipo"
              />
            </span>
            <span class="etiqueta-receptor"
              ><span class="solo-lector">Receptor </span>{{ r.etiqueta
              }}<span class="solo-lector">{{ nombreAccesibleSufijo(r) }}</span
              ><span v-if="r.animacion" class="solo-lector">
                . Efecto: {{ TEXTO_EFECTO[r.animacion] }}</span
              ></span
            >
          </button>
          <p v-if="fondo && fondoEstado === 'cargando'" class="nota-fondo" aria-hidden="true">
            Cargando el dibujo…
          </p>
        </div>
        <span
          v-for="r in vistaReceptores"
          :id="`${uid}-rd${r.indice}`"
          :key="`d${r.indice}`"
          class="solo-lector"
          >{{ textoPlanoDeMarkdown(r.descripcion) }}</span
        >
      </div>
      <p
        v-if="fondoEstado === 'error'"
        class="text-muted-foreground flex items-start gap-2 text-sm"
        role="note"
        data-fondo-error
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        No se pudo cargar el dibujo de fondo de la escena. La actividad funciona igual.
      </p>

      <!-- Efectos observados. -->
      <section
        v-if="efectosVisibles.length > 0"
        class="flex flex-col gap-2"
        :aria-labelledby="`${uid}-efectos`"
        data-efectos
      >
        <h4 :id="`${uid}-efectos`" class="text-foreground text-base font-semibold">
          Lo que observas
        </h4>
        <TarjetaEfecto
          v-for="e in efectosVisibles"
          :key="e.clave"
          :molecula="e.molecula"
          :forma="e.forma"
          :receptor="e.receptor"
          :efecto="e.efecto"
          :ultimo="e.ultimo"
          :otras="e.otras"
        />
      </section>

      <!-- Resultado final. -->
      <section
        v-if="resumen"
        class="flex flex-col gap-3"
        :aria-labelledby="`${uid}-resultado`"
        data-fase="resumen"
      >
        <h4
          :id="`${uid}-resultado`"
          ref="titulo-resultado"
          tabindex="-1"
          class="text-foreground text-lg font-semibold outline-offset-4"
        >
          Resultado de la actividad
        </h4>
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-muted rounded-xl p-3">
            <p class="text-muted-foreground text-xs">Acierto</p>
            <p class="text-foreground text-xl font-semibold tabular-nums" data-porcentaje>
              {{ resumen.porcentaje }} %
            </p>
          </div>
          <div class="bg-muted rounded-xl p-3">
            <p class="text-muted-foreground text-xs">Puntaje</p>
            <p class="text-foreground text-xl font-semibold tabular-nums" data-puntaje>
              {{ resumen.puntaje }}
              <span class="text-muted-foreground text-xs font-normal">
                de {{ actividad.puntaje_max }}
              </span>
            </p>
          </div>
          <div class="bg-muted rounded-xl p-3">
            <p class="text-muted-foreground text-xs">Errores</p>
            <p class="text-foreground text-xl font-semibold tabular-nums" data-errores>
              {{ resumen.errores }}
            </p>
          </div>
        </div>
        <div
          class="flex items-start gap-3 rounded-xl border-2 p-3"
          :class="CLASE_BANDA[resumen.banda]"
          data-retro-final
        >
          <component
            :is="ICONO_BANDA[resumen.banda]"
            class="text-foreground mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />
          <p class="text-foreground text-sm leading-relaxed">
            <TextoLinea :texto="resumen.mensaje" />
          </p>
        </div>
        <p
          v-if="resumen.aprobacion"
          class="text-foreground flex items-start gap-2 text-sm font-medium"
          data-aprobacion
        >
          <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <template v-if="resumen.aprobacion.alcanzado">
            Alcanzaste el mínimo de {{ Math.round(resumen.aprobacion.minimo * 100) }} % de acierto
            para seguir.
          </template>
          <template v-else>
            Necesitas {{ Math.round(resumen.aprobacion.minimo * 100) }} % de acierto para seguir;
            inténtalo de nuevo.
          </template>
        </p>
        <button
          type="button"
          class="bg-primary text-primary-foreground inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg px-4 text-sm font-semibold"
          data-repetir
          @click="repetir"
        >
          <RotateCcw class="size-4" aria-hidden="true" />
          Repetir la actividad
        </button>
      </section>
    </template>
  </section>
</template>

<style scoped>
/* En escritorio la actividad cabe en una pantalla (indicación de la usuaria, 2026-10-29): la escena a la izquierda,
   tan grande como permite el alto disponible (`--alto-vista`, que pone la vista del módulo), y a la derecha el
   enunciado, el avance, las moléculas y los mensajes. */
@media (min-width: 1024px) {
  .actividad-arrastre {
    display: grid;
    grid-template-columns: auto minmax(18rem, 1fr);
    /* La escena abarca todas las filas; la última, flexible, absorbe su alto y la columna derecha queda compacta. */
    grid-template-rows: repeat(12, auto) 1fr;
    align-content: start;
    align-items: start;
    column-gap: 1.5rem;
  }
  .actividad-arrastre > * {
    grid-column: 2;
  }
  .actividad-arrastre > .escena-envoltura {
    grid-column: 1;
    grid-row: 1 / 14;
    width: min(
      44rem,
      calc(
        (var(--alto-vista, 100dvh - 6rem) - 5.5rem - var(--margen-escena, 0px)) *
          var(--aspecto, 1.5)
      )
    );
    max-width: none;
  }
}

.solo-lector {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* ---- Bandeja ---- */
.bandeja {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem; /* 8 px: separación mínima entre objetivos táctiles (R2) */
  list-style: none;
  margin: 0;
  padding: 0;
}
.pieza-item {
  position: relative;
  min-width: 0;
  max-width: 100%;
}
.pieza {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  min-width: 2.75rem;
  max-width: 100%;
  padding: 0.25rem 0.75rem;
  border: 2px solid var(--input);
  border-radius: 999px;
  background: var(--card);
  color: var(--foreground);
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: grab;
  /* R8: solo la pieza que se arrastra impide desplazar la página con el dedo. */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.pieza-texto {
  min-width: 0;
  overflow-wrap: anywhere;
  text-align: left;
}
.pieza[data-estado='elegida'] {
  border-color: var(--ring);
  border-width: 3px;
  background: var(--secondary);
  padding: calc(0.25rem - 1px) calc(0.75rem - 1px);
}
.pieza[data-estado='acoplada'] {
  border-style: dashed;
  color: var(--success);
}
.pieza[data-arrastrando='true'] {
  position: relative;
  z-index: 30;
  cursor: grabbing;
  border-color: var(--ring);
  background: var(--secondary);
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.25);
  opacity: 0.95;
}
.pieza:disabled {
  cursor: default;
}

/* ---- Escena ---- */
.escena-envoltura {
  position: relative;
  width: 100%;
  max-width: 44rem;
  margin-inline: auto;
}
.escena {
  position: relative;
  width: 100%;
  container-type: inline-size;
  border: 2px solid var(--border);
  border-radius: 0.75rem;
  background: var(--muted);
}
.fondo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}
.nota-fondo {
  position: absolute;
  left: 0.5rem;
  top: 0.25rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.receptor {
  position: absolute;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--foreground);
  /* El centro de la zona táctil (44 px) queda sobre el punto (x %, y %) de la escena. */
  transform: translate(-50%, -22px);
  cursor: pointer;
}
.receptor[data-alineacion='inicio'] {
  align-items: flex-start;
  transform: translate(-22px, -22px);
}
.receptor[data-alineacion='fin'] {
  align-items: flex-end;
  transform: translate(calc(-100% + 22px), -22px);
}
div.receptor {
  cursor: default;
}
.zona {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 2px dashed var(--input);
  border-radius: 50%;
  background: var(--card);
  color: var(--primary);
}
.receptor[data-ocupado='true'] .zona {
  border-style: solid;
  border-color: var(--primary);
  background: var(--secondary);
}
.receptor[data-efecto='inhibicion'] .zona {
  opacity: 0.7;
  border-color: var(--destructive);
}
.receptor[data-disponible='true'] .zona {
  border-color: var(--ring);
  border-width: 3px;
}
.receptor[data-objetivo='true'] .zona {
  border-style: solid;
  border-color: var(--ring);
  border-width: 4px;
  background: var(--secondary);
  box-shadow: 0 0 0 3px var(--card);
}
.receptor:focus-visible .zona {
  outline: 3px solid var(--ring);
  outline-offset: 3px;
}
.receptor:disabled {
  cursor: default;
}
.forma-acoplada {
  width: 1.625rem;
  height: 1.625rem;
}
/* Hueco con la forma de su molécula: tenue y sin color, para que se lea como «aquí encaja esta figura». */
.forma-guia {
  opacity: 0.65;
  filter: grayscale(0.6);
}
.insignia {
  position: absolute;
  right: -0.4rem;
  top: -0.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid var(--input);
  border-radius: 50%;
  background: var(--card);
  color: var(--foreground);
}
.etiqueta-receptor {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  max-width: 112px;
  padding: 0.125rem 0.375rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--card);
  color: var(--foreground);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
}
@supports (width: 1cqw) {
  .etiqueta-receptor {
    max-width: min(112px, var(--ancho-cqw, 112px));
  }
}
.receptor[data-alineacion='inicio'] .etiqueta-receptor {
  text-align: left;
}
.receptor[data-alineacion='fin'] .etiqueta-receptor {
  text-align: right;
}

/* Con movimiento reducido, sin transiciones ni sombras animadas (R3). */
[data-movimiento='reducido'] .pieza,
[data-movimiento='reducido'] .zona {
  transition: none;
}
</style>
