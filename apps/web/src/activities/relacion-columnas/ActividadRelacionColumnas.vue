<script setup lang="ts">
/**
 * Actividad `relacion-columnas` (docs/content-schema.md, 7.3): unir cada elemento de la columna A
 * con su pareja de la B.
 *
 * Cómo se juega (las tres vías son la misma actividad, R1):
 *  - Toque-toque: se elige un elemento y luego su pareja (en cualquier orden de columnas).
 *  - Arrastre opcional: se suelta un elemento sobre el de la otra columna (`useArrastrePares`).
 *  - Teclado: Enter o Espacio eligen, las flechas se mueven, Escape cancela la selección.
 *
 * Reglas propias:
 *  - Un acierto fija la pareja y muestra su `explicacion`; un error no revela la respuesta.
 *  - Precisión = aciertos / (aciertos + uniones equivocadas), con `precisionPorConteo`.
 *  - La columna B se baraja con una semilla derivada del id de la actividad y del intento
 *    (`derivarSemilla`): estable al recargar y distinta en cada intento. Los distractores de B
 *    nunca tienen pareja.
 *  - `progreso` va por `crearEmisorProgreso`; al completar se cierra el emisor antes de `completada`.
 *  - Modo `revisar`: solo lectura, muestra las parejas correctas y no emite nada.
 *
 * Interacción con el mentor: `relaciona_par` con objeto = id del elemento de A.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { ArrowLeftRight, Ban, Check, Info, RotateCcw, X } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { intentoInicial } from '@/activities/types';
import type {
  EmitsActividadRelacionColumnas,
  EstadoPrevioActividad,
  ProgresoActividad,
  PropsActividadRelacionColumnas,
  ResultadoActividad,
} from '@/activities/types';
import { renderizarLinea, textoPlanoDeMarkdown } from '@/content/markdown';
import { crearEmisorProgreso } from '@/content/progreso';
import { calcularPuntaje, precisionPorConteo, textoRetroalimentacion } from '@/content/scoring';
import {
  analizarConfig,
  construirDetalle,
  crearInstantanea,
  derivarSemilla,
  evaluarPar,
  leerInstantanea,
  ordenarColumnaB,
  totalErrores,
} from './logica';
import type { AnalisisValido, Columna } from './logica';
import { MARGEN_OBJETIVO_PX, useArrastrePares } from './useArrastrePares';
import type { ItemArrastre } from './useArrastrePares';

const props = withDefaults(defineProps<PropsActividadRelacionColumnas>(), {
  modo: 'jugar',
  estadoPrevio: undefined,
});
const emit = defineEmits<EmitsActividadRelacionColumnas>();

const idBase = useId();
const jugando = computed(() => props.modo === 'jugar');
const reducirMovimiento = useMediaQuery('(prefers-reduced-motion: reduce)');

/* -------------------------------------------------------------------------------------------
 * Configuración
 * ----------------------------------------------------------------------------------------- */

const analisis = computed(() => analizarConfig(props.actividad.config));
const valido = computed<AnalisisValido | null>(() => (analisis.value.ok ? analisis.value : null));
const motivoError = computed(() => (analisis.value.ok ? '' : analisis.value.motivo));

/** Quita los enlaces del HTML ya saneado: dentro de un botón no puede haber otro control. */
function sinEnlaces(html: string): string {
  return html.replace(/<a\b[^>]*>/g, '').replace(/<\/a>/g, '');
}

interface TextoElemento {
  html: string;
  plano: string;
}

/** Texto ya renderizado de cada elemento (clave `columna:índice`). */
const textos = computed(() => {
  const mapa = new Map<string, TextoElemento>();
  const a = valido.value;
  if (!a) return mapa;
  a.a.forEach((e, i) =>
    mapa.set(`a:${i}`, {
      html: sinEnlaces(renderizarLinea(e.texto)),
      plano: textoPlanoDeMarkdown(e.texto),
    }),
  );
  a.b.forEach((e, i) =>
    mapa.set(`b:${i}`, {
      html: sinEnlaces(renderizarLinea(e.texto)),
      plano: textoPlanoDeMarkdown(e.texto),
    }),
  );
  return mapa;
});

function textoDe(columna: Columna, indice: number): TextoElemento {
  return textos.value.get(`${columna}:${indice}`) ?? { html: '', plano: '' };
}

const instruccionesHtml = computed(() => renderizarLinea(props.actividad.instrucciones));
const tituloPlano = computed(() => textoPlanoDeMarkdown(props.actividad.titulo));

/* -------------------------------------------------------------------------------------------
 * Estado del intento
 * ----------------------------------------------------------------------------------------- */

interface Seleccion {
  columna: Columna;
  indice: number;
}
type TipoAviso = 'info' | 'ok' | 'error';
interface Aviso {
  tipo: TipoAviso;
  titulo: string;
  detalle: string;
  explicacionHtml: string;
}

const intentos = ref(1);
const semilla = ref(1);
const hechos = ref<number[]>([]);
const errores = ref<number[]>([]);
const seleccion = ref<Seleccion | null>(null);
const ultimoFallo = ref<{ a: number; b: number } | null>(null);
const ultimoAcierto = ref<number | null>(null);
const aviso = ref<Aviso | null>(null);
const resultado = ref<ResultadoActividad<'relacion-columnas'> | null>(null);
/** El estudiante ya hizo algo: desde aquí ya no se recalcula el intento con un estado tardío. */
let interactuado = false;

const emisor = crearEmisorProgreso<ProgresoActividad>((p) => emit('progreso', p));
onBeforeUnmount(() => emisor.vaciar());

const total = computed(() => valido.value?.pares.length ?? 0);
const completa = computed(() => total.value > 0 && hechos.value.length >= total.value);

function reiniciarEstado(): void {
  hechos.value = [];
  errores.value = Array.from({ length: total.value }, () => 0);
  seleccion.value = null;
  ultimoFallo.value = null;
  ultimoAcierto.value = null;
  aviso.value = null;
  resultado.value = null;
}

/** Arranca desde el estado previo de la página (también al llegar tarde el del servidor). */
function iniciar(estado: EstadoPrevioActividad | undefined): void {
  const a = valido.value;
  intentos.value = intentoInicial(estado);
  reiniciarEstado();
  interactuado = false;
  semilla.value = derivarSemilla(props.actividad.id, intentos.value);
  if (!a) return;
  // Una instantánea de un intento que el servidor ya tiene registrado está vencida.
  const delProgreso = estado?.progreso;
  const vigente =
    delProgreso !== undefined &&
    Number.isFinite(delProgreso.intentos) &&
    delProgreso.intentos > (estado?.servidor?.intentos ?? 0);
  const parcial = vigente ? leerInstantanea(a, delProgreso.instantanea) : null;
  if (parcial) {
    hechos.value = [...parcial.hechos];
    errores.value = [...parcial.errores];
    if (parcial.semilla !== undefined) semilla.value = parcial.semilla;
  }
}

iniciar(props.estadoPrevio);

// El estado del servidor puede llegar después de montar: hasta la primera interacción se recalcula.
watch(
  () => props.estadoPrevio,
  (nuevo) => {
    if (!interactuado) iniciar(nuevo);
  },
  { deep: true },
);
// Otra actividad o contenido distinto (misma id, otras parejas): empezar de cero.
watch(
  () => `${props.actividad.id}|${valido.value?.firma ?? ''}`,
  () => {
    emisor.reabrir();
    iniciar(props.estadoPrevio);
  },
);
watch(jugando, (activo) => {
  if (!activo) {
    seleccion.value = null;
    arrastre.cancelar();
    emisor.cerrar();
  } else if (!resultado.value) emisor.reabrir();
});

/* -------------------------------------------------------------------------------------------
 * Disposición
 * ----------------------------------------------------------------------------------------- */

const ordenB = computed(() => (valido.value ? ordenarColumnaB(valido.value, semilla.value) : []));

/** Número de pareja (1 en adelante, en el orden en que se acertaron) por índice de par. */
const ordenDePar = computed(() => new Map(hechos.value.map((par, i) => [par, i + 1])));

type EstadoItem =
  'libre' | 'seleccionado' | 'emparejado' | 'fallo' | 'sobrante' | 'arrastrado' | 'objetivo';

interface VistaItem {
  columna: Columna;
  indice: number;
  id: string;
  html: string;
  plano: string;
  estado: EstadoItem;
  /** Número de pareja si ya está emparejado. */
  numero: number | null;
  /** Texto de su pareja si ya está emparejado. */
  parejaPlano: string;
  /** Es de la pareja recién formada (aparece con un fundido si se permite el movimiento). */
  nuevo: boolean;
}

function vistaDe(columna: Columna, indice: number): VistaItem {
  const a = valido.value as AnalisisValido;
  const elemento = columna === 'a' ? a.a[indice]! : a.b[indice]!;
  const par = (columna === 'a' ? a.parDeA : a.parDeB).get(elemento.id);
  const numero = par !== undefined ? (ordenDePar.value.get(par) ?? null) : null;
  let estado: EstadoItem = 'libre';
  const origen = arrastre.origen.value;
  const sobre = arrastre.sobre.value;
  const idItem = elemento.id;
  if (numero !== null) estado = 'emparejado';
  else if (completa.value && columna === 'b') estado = 'sobrante';
  else if (origen && origen.columna === columna && origen.id === idItem) estado = 'arrastrado';
  else if (sobre && sobre.columna === columna && sobre.id === idItem) estado = 'objetivo';
  else if (seleccion.value?.columna === columna && seleccion.value.indice === indice)
    estado = 'seleccionado';
  else if (ultimoFallo.value && ultimoFallo.value[columna] === indice) estado = 'fallo';

  let parejaPlano = '';
  if (numero !== null && par !== undefined) {
    parejaPlano =
      columna === 'a'
        ? textoDe('b', a.indiceBDePar[par] ?? -1).plano
        : textoDe('a', a.indiceADePar[par] ?? -1).plano;
  }
  const t = textoDe(columna, indice);
  const nuevo = par !== undefined && par === ultimoAcierto.value && numero !== null;
  return {
    columna,
    indice,
    id: idItem,
    html: t.html,
    plano: t.plano,
    estado,
    numero,
    parejaPlano,
    nuevo,
  };
}

const itemsA = computed(() => (valido.value ? valido.value.a.map((_, i) => vistaDe('a', i)) : []));
const itemsB = computed(() => (valido.value ? ordenB.value.map((i) => vistaDe('b', i)) : []));

const TEXTO_INSIGNIA: Record<EstadoItem, string> = {
  libre: '',
  seleccionado: 'Seleccionado',
  emparejado: '',
  fallo: 'No coincide',
  sobrante: 'Sin pareja',
  arrastrado: 'Arrastrando',
  objetivo: 'Soltar aquí',
};

function insignia(item: VistaItem): string {
  if (item.estado === 'emparejado') return `Pareja ${item.numero}`;
  return TEXTO_INSIGNIA[item.estado];
}

/* -------------------------------------------------------------------------------------------
 * Acciones
 * ----------------------------------------------------------------------------------------- */

function avisar(tipo: TipoAviso, titulo: string, detalle = '', explicacionHtml = ''): void {
  aviso.value = { tipo, titulo, detalle, explicacionHtml };
}

function emitirProgreso(): void {
  const a = valido.value;
  if (!a) return;
  emisor.emitir({
    avance: total.value === 0 ? 0 : hechos.value.length / total.value,
    intentos: intentos.value,
    instantanea: crearInstantanea(
      a,
      { hechos: hechos.value, errores: errores.value },
      semilla.value,
    ),
  });
}

const tituloResultado = ref<HTMLElement | null>(null);
const tituloActividad = ref<HTMLElement | null>(null);

function finalizar(a: AnalisisValido): void {
  const estado = { hechos: hechos.value, errores: errores.value };
  const fallos = totalErrores(errores.value);
  const precision = precisionPorConteo(hechos.value.length, fallos);
  const puntaje = calcularPuntaje(props.actividad, { precision, intentos: intentos.value });
  const r: ResultadoActividad<'relacion-columnas'> = {
    puntaje,
    intentos: intentos.value,
    precision,
    detalle: construirDetalle(a, estado),
  };
  resultado.value = r;
  emisor.cerrar();
  emit('completada', r);
  // R6: al completar, el foco pasa al encabezado del resultado.
  void nextTick(() => tituloResultado.value?.focus());
}

/** Intenta unir el elemento `indiceA` de A con el `indiceB` de B (toque, arrastre o teclado). */
function intentarPar(indiceA: number, indiceB: number): void {
  const a = valido.value;
  if (!a || !jugando.value || resultado.value) return;
  const elA = a.a[indiceA];
  const elB = a.b[indiceB];
  if (!elA || !elB) return;
  const evaluacion = evaluarPar(a, elA.id, elB.id);
  if (!evaluacion) return;
  const par = a.pares[evaluacion.indicePar]!;
  // Un elemento que ya tiene pareja no se vuelve a unir.
  if (estaEmparejado('a', indiceA) || estaEmparejado('b', indiceB)) {
    avisar('info', 'Ese elemento ya tiene pareja.');
    return;
  }
  interactuado = true;
  const nombreA = textoDe('a', indiceA).plano;
  const nombreB = textoDe('b', indiceB).plano;
  seleccion.value = null;
  if (evaluacion.correcto) {
    hechos.value = [...hechos.value, evaluacion.indicePar];
    ultimoFallo.value = null;
    ultimoAcierto.value = evaluacion.indicePar;
    const cierre = hechos.value.length >= total.value ? ' Terminaste la actividad.' : '';
    avisar(
      'ok',
      'Correcto.',
      `«${nombreA}» va con «${nombreB}».${cierre}`,
      renderizarLinea(par.explicacion),
    );
    emit('interaccion', { accion: 'relaciona_par', objeto: elA.id, resultado: 'correcta' });
    if (hechos.value.length >= total.value) finalizar(a);
    else emitirProgreso();
  } else {
    errores.value = errores.value.map((n, i) => (i === evaluacion.indicePar ? n + 1 : n));
    ultimoFallo.value = { a: indiceA, b: indiceB };
    ultimoAcierto.value = null;
    avisar('error', 'Incorrecto.', `«${nombreA}» no va con «${nombreB}». Inténtalo de nuevo.`);
    emit('interaccion', { accion: 'relaciona_par', objeto: elA.id, resultado: 'incorrecta' });
    emitirProgreso();
  }
}

function estaEmparejado(columna: Columna, indice: number): boolean {
  const a = valido.value;
  if (!a) return false;
  const elemento = columna === 'a' ? a.a[indice] : a.b[indice];
  if (!elemento) return false;
  const par = (columna === 'a' ? a.parDeA : a.parDeB).get(elemento.id);
  return par !== undefined && hechos.value.includes(par);
}

/** Clic, Enter o Espacio sobre un elemento. */
function alElegir(columna: Columna, indice: number): void {
  const a = valido.value;
  if (!a || !jugando.value || resultado.value) return;
  if (arrastre.consumirClicSuprimido()) return;
  if (estaEmparejado(columna, indice)) {
    avisar('info', 'Ese elemento ya tiene pareja.');
    return;
  }
  interactuado = true;
  ultimoFallo.value = null;
  const actual = seleccion.value;
  const otra = columna === 'a' ? a.tituloB : a.tituloA;
  if (!actual) {
    seleccion.value = { columna, indice };
    avisar(
      'info',
      `Elegiste «${textoDe(columna, indice).plano}».`,
      `Ahora elige su pareja en la columna «${otra}».`,
    );
    return;
  }
  if (actual.columna === columna) {
    if (actual.indice === indice) {
      seleccion.value = null;
      avisar('info', 'Selección cancelada.');
    } else {
      seleccion.value = { columna, indice };
      avisar(
        'info',
        `Elegiste «${textoDe(columna, indice).plano}».`,
        `Ahora elige su pareja en la columna «${otra}».`,
      );
    }
    return;
  }
  if (columna === 'b') intentarPar(actual.indice, indice);
  else intentarPar(indice, actual.indice);
}

function reintentar(): void {
  if (!jugando.value) return;
  emit('interaccion', { accion: 'reinicia_actividad' });
  interactuado = true;
  intentos.value += 1;
  semilla.value = derivarSemilla(props.actividad.id, intentos.value);
  reiniciarEstado();
  emisor.reabrir();
  avisar(
    'info',
    `Nuevo intento (intento ${intentos.value}).`,
    'La columna de la derecha se barajó.',
  );
  void nextTick(() => tituloActividad.value?.focus());
}

function cancelarSeleccion(): void {
  arrastre.cancelar();
  if (seleccion.value) {
    seleccion.value = null;
    avisar('info', 'Selección cancelada.');
  }
}

/* -------------------------------------------------------------------------------------------
 * Teclado: flechas entre elementos
 * ----------------------------------------------------------------------------------------- */

const refs = new Map<string, HTMLElement>();

function fijarRef(columna: Columna, indice: number, el: Element | ComponentPublicInstance | null) {
  const clave = `${columna}:${indice}`;
  if (el instanceof HTMLElement) refs.set(clave, el);
  else refs.delete(clave);
}

function alTeclear(evento: KeyboardEvent, columna: Columna, posicion: number): void {
  const lista = columna === 'a' ? itemsA.value : itemsB.value;
  const otraLista = columna === 'a' ? itemsB.value : itemsA.value;
  let destino: VistaItem | undefined;
  switch (evento.key) {
    case 'ArrowDown':
      destino = lista[Math.min(lista.length - 1, posicion + 1)];
      break;
    case 'ArrowUp':
      destino = lista[Math.max(0, posicion - 1)];
      break;
    case 'Home':
      destino = lista[0];
      break;
    case 'End':
      destino = lista[lista.length - 1];
      break;
    case 'ArrowRight':
      if (columna === 'a') destino = otraLista[Math.min(otraLista.length - 1, posicion)];
      break;
    case 'ArrowLeft':
      if (columna === 'b') destino = otraLista[Math.min(otraLista.length - 1, posicion)];
      break;
    default:
      return;
  }
  evento.preventDefault();
  if (destino) refs.get(`${destino.columna}:${destino.indice}`)?.focus();
}

/* -------------------------------------------------------------------------------------------
 * Arrastre (opcional)
 * ----------------------------------------------------------------------------------------- */

function itemDeDatos(item: ItemArrastre): { columna: Columna; indice: number } | null {
  const a = valido.value;
  if (!a) return null;
  const lista = item.columna === 'a' ? a.a : a.b;
  const indice = lista.findIndex((e) => e.id === item.id);
  return indice < 0 ? null : { columna: item.columna, indice };
}

function objetivoEn(x: number, y: number, origen: ItemArrastre): ItemArrastre | null {
  const a = valido.value;
  if (!a) return null;
  const contraria: Columna = origen.columna === 'a' ? 'b' : 'a';
  const lista = contraria === 'a' ? a.a : a.b;
  for (let i = 0; i < lista.length; i++) {
    const el = refs.get(`${contraria}:${i}`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (
      x >= r.left - MARGEN_OBJETIVO_PX &&
      x <= r.right + MARGEN_OBJETIVO_PX &&
      y >= r.top - MARGEN_OBJETIVO_PX &&
      y <= r.bottom + MARGEN_OBJETIVO_PX
    ) {
      return { columna: contraria, id: lista[i]!.id };
    }
  }
  return null;
}

function alSoltar(origen: ItemArrastre, destino: ItemArrastre): void {
  const o = itemDeDatos(origen);
  const d = itemDeDatos(destino);
  if (!o || !d) return;
  if (estaEmparejado(o.columna, o.indice) || estaEmparejado(d.columna, d.indice)) {
    avisar('info', 'Ese elemento ya tiene pareja.');
    return;
  }
  if (o.columna === d.columna) return;
  ultimoFallo.value = null;
  if (o.columna === 'a') intentarPar(o.indice, d.indice);
  else intentarPar(d.indice, o.indice);
}

const arrastre = useArrastrePares({
  activo: () => jugando.value && !resultado.value && valido.value !== null,
  objetivoEn,
  alSoltar,
});

function alPresionar(evento: PointerEvent, item: VistaItem): void {
  arrastre.alPresionar(evento, { columna: item.columna, id: item.id });
}

const textoFantasma = computed(() => {
  const o = arrastre.origen.value;
  const a = valido.value;
  if (!o || !a) return '';
  const indice = (o.columna === 'a' ? a.a : a.b).findIndex((e) => e.id === o.id);
  return textoDe(o.columna, indice).plano;
});

const estiloFantasma = computed(() => ({
  left: `${arrastre.puntero.value.x}px`,
  top: `${arrastre.puntero.value.y}px`,
}));

/* -------------------------------------------------------------------------------------------
 * Enlaces del glosario
 * ----------------------------------------------------------------------------------------- */

/**
 * Los enlaces `data-glosario` no navegan: se avisa a la página con un evento del DOM
 * (`ova:glosario`, con `detail.id`) para que abra la definición. Ver docs de types.ts, R10.
 */
function alClicTexto(evento: MouseEvent): void {
  const destino = evento.target;
  if (!(destino instanceof Element)) return;
  const enlace = destino.closest('a[data-glosario]');
  if (!enlace) return;
  evento.preventDefault();
  enlace.dispatchEvent(
    new CustomEvent('ova:glosario', {
      bubbles: true,
      composed: true,
      detail: { id: enlace.getAttribute('data-glosario') ?? '' },
    }),
  );
}

/* -------------------------------------------------------------------------------------------
 * Resultado y vistas derivadas
 * ----------------------------------------------------------------------------------------- */

const porcentaje = computed(() =>
  resultado.value ? Math.round(resultado.value.precision * 100) : 0,
);
const minimoAprobacion = computed(() => props.actividad.aprobacion_min);
const noAprueba = computed(
  () =>
    resultado.value !== null &&
    minimoAprobacion.value !== undefined &&
    resultado.value.precision + 1e-9 < minimoAprobacion.value,
);
const retroHtml = computed(() =>
  resultado.value
    ? renderizarLinea(textoRetroalimentacion(props.actividad, resultado.value.precision))
    : '',
);

/** Parejas formadas, en el orden en que se acertaron, para releer sus explicaciones. */
const parejasFormadas = computed(() => {
  const a = valido.value;
  if (!a) return [];
  return hechos.value.map((par, i) => ({
    numero: i + 1,
    id: a.pares[par]!.id,
    a: textoDe('a', a.indiceADePar[par] ?? -1).plano,
    b: textoDe('b', a.indiceBDePar[par] ?? -1).plano,
    explicacionHtml: renderizarLinea(a.pares[par]!.explicacion),
    nueva: par === ultimoAcierto.value,
  }));
});

/** Parejas correctas para el modo `revisar`, en el orden de A. */
const parejasRevision = computed(() => {
  const a = valido.value;
  if (!a) return [];
  return a.a.map((_, i) => {
    const par = a.parDeA.get(a.a[i]!.id)!;
    return {
      id: a.pares[par]!.id,
      a: textoDe('a', i),
      b: textoDe('b', a.indiceBDePar[par] ?? -1),
      explicacionHtml: renderizarLinea(a.pares[par]!.explicacion),
    };
  });
});
const distractoresRevision = computed(() => {
  const a = valido.value;
  if (!a) return [];
  return a.b.map((e, i) => ({ id: e.id, t: textoDe('b', i) })).filter((d) => !a.parDeB.has(d.id));
});

const pista = computed(() => {
  const a = valido.value;
  const s = seleccion.value;
  if (!a || !s || s.columna !== 'a') return '';
  return `Elige la pareja de «${textoDe('a', s.indice).plano}»`;
});
const pistaA = computed(() => {
  const a = valido.value;
  const s = seleccion.value;
  if (!a || !s || s.columna !== 'b') return '';
  return `Elige la pareja de «${textoDe('b', s.indice).plano}»`;
});

function dom(sufijo: string): string {
  return `${idBase}-${sufijo}`;
}
</script>

<template>
  <section
    class="relacion-columnas @container"
    :class="{ 'movimiento-reducido': reducirMovimiento }"
    :data-movimiento="reducirMovimiento ? 'reducido' : 'normal'"
    :aria-labelledby="dom('titulo')"
    data-test="relacion-columnas"
    @keydown.esc="cancelarSeleccion"
    @click="alClicTexto"
  >
    <header class="cabecera">
      <h3 :id="dom('titulo')" ref="tituloActividad" tabindex="-1" class="titulo">
        {{ tituloPlano }}
      </h3>
      <!-- eslint-disable-next-line vue/no-v-html -- renderizarLinea sanea el Markdown (lista blanca) -->
      <p class="instrucciones" v-html="instruccionesHtml" />
    </header>

    <!-- Región de anuncios: una sola, educada y atómica (R4). Siempre presente. -->
    <div
      class="aviso"
      :data-tipo="aviso?.tipo ?? 'vacio'"
      aria-live="polite"
      aria-atomic="true"
      data-test="anuncio"
    >
      <template v-if="aviso">
        <span class="aviso-icono" aria-hidden="true">
          <Check v-if="aviso.tipo === 'ok'" class="size-4" />
          <X v-else-if="aviso.tipo === 'error'" class="size-4" />
          <Info v-else class="size-4" />
        </span>
        <span class="aviso-texto">
          <strong>{{ aviso.titulo }}</strong>
          <template v-if="aviso.detalle"> {{ aviso.detalle }}</template>
          <!-- eslint-disable vue/no-v-html -- renderizarLinea sanea el Markdown -->
          <span
            v-if="aviso.explicacionHtml"
            class="aviso-explicacion"
            v-html="aviso.explicacionHtml"
          />
          <!-- eslint-enable vue/no-v-html -->
        </span>
      </template>
    </div>

    <!-- Estado de error: la configuración no se puede jugar. -->
    <div v-if="!valido" class="error" role="alert" data-test="error-config">
      <Ban class="size-5" aria-hidden="true" />
      <p>
        No se pudo mostrar esta actividad: su contenido está incompleto. {{ motivoError }} Avisa a
        tu docente y sigue con el resto del módulo.
      </p>
    </div>

    <!-- Modo revisar: solo lectura, con las respuestas correctas. -->
    <div v-else-if="!jugando" class="revision" data-test="revision">
      <p class="ayuda">Estas son las parejas correctas.</p>
      <ul class="lista-revision">
        <li v-for="p in parejasRevision" :key="p.id" class="par-revision">
          <span class="par-revision-texto">
            <!-- eslint-disable-next-line vue/no-v-html -- renderizarLinea sanea el Markdown -->
            <span v-html="p.a.html" />
            <ArrowLeftRight class="size-4 flecha" aria-hidden="true" />
            <span class="sr-only">con</span>
            <!-- eslint-disable-next-line vue/no-v-html -- renderizarLinea sanea el Markdown -->
            <span v-html="p.b.html" />
          </span>
          <!-- eslint-disable-next-line vue/no-v-html -- renderizarLinea sanea el Markdown -->
          <span class="explicacion" v-html="p.explicacionHtml" />
        </li>
      </ul>
      <template v-if="distractoresRevision.length">
        <p class="ayuda">Sin pareja (sobrantes):</p>
        <ul class="lista-revision">
          <li v-for="d in distractoresRevision" :key="d.id" class="par-revision">
            <!-- eslint-disable-next-line vue/no-v-html -- renderizarLinea sanea el Markdown -->
            <span v-html="d.t.html" />
          </li>
        </ul>
      </template>
    </div>

    <template v-else>
      <p class="ayuda">
        Toca un elemento y luego su pareja. También puedes arrastrar uno hasta el otro. Con teclado:
        Enter o Espacio para elegir, flechas para moverte y Escape para cancelar.
      </p>

      <div class="columnas">
        <div class="columna">
          <h4 :id="dom('titulo-a')" class="titulo-columna">{{ valido.tituloA }}</h4>
          <p v-if="pistaA" class="pista">{{ pistaA }}</p>
          <ul :aria-labelledby="dom('titulo-a')" class="lista">
            <li v-for="(item, pos) in itemsA" :key="item.id">
              <button
                :ref="(el) => fijarRef('a', item.indice, el)"
                type="button"
                class="item"
                :class="{ nuevo: item.nuevo && !reducirMovimiento }"
                :data-columna="'a'"
                :data-id="item.id"
                :data-estado="item.estado"
                :aria-pressed="item.estado === 'seleccionado'"
                :aria-disabled="item.estado === 'emparejado'"
                @click="alElegir('a', item.indice)"
                @keydown="alTeclear($event, 'a', pos)"
                @pointerdown="alPresionar($event, item)"
              >
                <!-- eslint-disable-next-line vue/no-v-html -- renderizarLinea sanea el Markdown -->
                <span class="item-texto" v-html="item.html" />
                <span v-if="insignia(item)" class="insignia">
                  <Check v-if="item.estado === 'emparejado'" class="size-3.5" aria-hidden="true" />
                  <X v-else-if="item.estado === 'fallo'" class="size-3.5" aria-hidden="true" />
                  {{ insignia(item) }}
                </span>
                <span v-if="item.estado === 'emparejado'" class="pareja-texto">
                  <span class="sr-only">con</span>
                  <ArrowLeftRight class="size-3.5" aria-hidden="true" />
                  {{ item.parejaPlano }}
                </span>
              </button>
            </li>
          </ul>
        </div>

        <div class="columna">
          <h4 :id="dom('titulo-b')" class="titulo-columna">{{ valido.tituloB }}</h4>
          <p v-if="pista" class="pista">{{ pista }}</p>
          <ul :aria-labelledby="dom('titulo-b')" class="lista">
            <li v-for="(item, pos) in itemsB" :key="item.id">
              <button
                :ref="(el) => fijarRef('b', item.indice, el)"
                type="button"
                class="item"
                :class="{ nuevo: item.nuevo && !reducirMovimiento }"
                :data-columna="'b'"
                :data-id="item.id"
                :data-estado="item.estado"
                :aria-pressed="item.estado === 'seleccionado'"
                :aria-disabled="item.estado === 'emparejado'"
                @click="alElegir('b', item.indice)"
                @keydown="alTeclear($event, 'b', pos)"
                @pointerdown="alPresionar($event, item)"
              >
                <!-- eslint-disable-next-line vue/no-v-html -- renderizarLinea sanea el Markdown -->
                <span class="item-texto" v-html="item.html" />
                <span v-if="insignia(item)" class="insignia">
                  <Check v-if="item.estado === 'emparejado'" class="size-3.5" aria-hidden="true" />
                  <X v-else-if="item.estado === 'fallo'" class="size-3.5" aria-hidden="true" />
                  <Ban v-else-if="item.estado === 'sobrante'" class="size-3.5" aria-hidden="true" />
                  {{ insignia(item) }}
                </span>
                <span v-if="item.estado === 'emparejado'" class="pareja-texto">
                  <span class="sr-only">con</span>
                  <ArrowLeftRight class="size-3.5" aria-hidden="true" />
                  {{ item.parejaPlano }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <p class="progreso-texto" data-test="conteo">
        Parejas formadas: {{ hechos.length }} de {{ total }}.
      </p>

      <ol v-if="parejasFormadas.length" class="formadas" aria-label="Parejas formadas">
        <li v-for="p in parejasFormadas" :key="p.id" class="formada" :data-nueva="p.nueva">
          <span class="formada-titulo">
            <strong>Pareja {{ p.numero }}:</strong> {{ p.a }}
            <span class="sr-only">con</span>
            <ArrowLeftRight class="size-3.5 flecha" aria-hidden="true" />
            {{ p.b }}
          </span>
          <!-- eslint-disable-next-line vue/no-v-html -- renderizarLinea sanea el Markdown -->
          <span class="explicacion" v-html="p.explicacionHtml" />
        </li>
      </ol>

      <div
        v-if="resultado"
        class="resultado"
        role="group"
        :aria-labelledby="dom('resultado')"
        data-test="resultado"
      >
        <h4 :id="dom('resultado')" ref="tituloResultado" tabindex="-1" class="titulo-resultado">
          Actividad completada
        </h4>
        <p>
          Puntaje: <strong>{{ resultado.puntaje }}</strong> de {{ actividad.puntaje_max }} puntos.
          Intento {{ resultado.intentos }}.
        </p>
        <p>
          Aciertos: {{ resultado.detalle.aciertos }}. Uniones equivocadas:
          {{ resultado.detalle.errores }}. Precisión: {{ porcentaje }} %.
        </p>
        <!-- eslint-disable-next-line vue/no-v-html -- renderizarLinea sanea el Markdown -->
        <p class="retro" v-html="retroHtml" />
        <p v-if="noAprueba && minimoAprobacion !== undefined" class="minimo" data-test="minimo">
          Necesitas {{ Math.round(minimoAprobacion * 100) }} % de acierto para seguir; inténtalo de
          nuevo.
        </p>
        <Button type="button" :variant="noAprueba ? 'default' : 'outline'" @click="reintentar">
          <RotateCcw aria-hidden="true" />
          {{ noAprueba ? 'Intentar de nuevo' : 'Repetir la actividad' }}
        </Button>
      </div>
    </template>

    <Teleport to="body">
      <div
        v-if="arrastre.origen.value"
        class="fantasma"
        :class="{ 'fantasma-reducido': reducirMovimiento }"
        :style="estiloFantasma"
        aria-hidden="true"
        data-test="fantasma"
      >
        {{ textoFantasma }}
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.relacion-columnas {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  color: var(--card-foreground);
}
/* El título ya es el encabezado de la parte (también en el teléfono): queda para el lector de pantalla. */
.titulo {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.instrucciones,
.ayuda,
.progreso-texto {
  font-size: 0.9375rem;
  /* Líneas cortas de instrucciones: a la izquierda, sin los huecos del justificado en el teléfono. */
  text-align: left;
}
.ayuda,
.progreso-texto,
.pista {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}
.pista {
  font-weight: 600;
  color: var(--primary);
}

/* Región de anuncios */
.aviso {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  min-height: 2.75rem;
  padding: 0.625rem 0.75rem;
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--muted);
  font-size: 0.9375rem;
}
/* Sin mensaje, la región sigue en el DOM para el lector de pantalla pero no ocupa sitio: dejaba un hueco vacío entre
   la instrucción y las columnas (revisión del módulo 5, 2026-11-06). */
.aviso[data-tipo='vacio'] {
  position: absolute;
  width: 1px;
  height: 1px;
  min-height: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.aviso[data-tipo='ok'] {
  border-color: var(--success);
  background: var(--success-soft);
}
.aviso[data-tipo='error'] {
  border-style: dashed;
  border-color: var(--destructive);
}
.aviso-icono {
  margin-top: 0.125rem;
  flex-shrink: 0;
}
.aviso[data-tipo='ok'] .aviso-icono,
.aviso[data-tipo='ok'] strong {
  color: var(--success);
}
.aviso[data-tipo='error'] .aviso-icono,
.aviso[data-tipo='error'] strong {
  color: var(--destructive);
}
.aviso-explicacion {
  display: block;
  margin-top: 0.25rem;
}

.error {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 2px dashed var(--destructive);
  border-radius: var(--radius-lg);
  color: var(--card-foreground);
}

/* Columnas: apiladas en pantallas estrechas, lado a lado desde ~36 rem de ancho del contenedor */
.columnas {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: minmax(0, 1fr);
}
@container (min-width: 36rem) {
  .columnas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
  }
}
.titulo-columna {
  font-size: 0.9375rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}
.lista {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.625rem 0.75rem;
  border: 2px solid var(--input);
  border-radius: var(--radius-lg);
  background: var(--card);
  color: var(--card-foreground);
  font-size: 0.9375rem;
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
  overflow-wrap: anywhere;
  /* El desplazamiento vertical sigue en manos del navegador (R8): solo se reserva el gesto horizontal. */
  touch-action: pan-y;
  user-select: none;
  -webkit-touch-callout: none;
  transition:
    background-color 0.15s,
    border-color 0.15s;
}
.item:hover {
  background: var(--secondary);
}
.item[data-estado='seleccionado'] {
  border-color: var(--primary);
  background: var(--secondary);
  box-shadow: 0 0 0 2px var(--ring);
}
.item[data-estado='emparejado'] {
  border-color: var(--success);
  background: var(--success-soft);
  cursor: default;
}
.item[data-estado='fallo'] {
  border-style: dashed;
  border-color: var(--destructive);
}
.item[data-estado='sobrante'] {
  border-style: dotted;
  background: var(--muted);
  cursor: default;
}
.item[data-estado='arrastrado'] {
  border-style: dashed;
  opacity: 0.6;
}
.item[data-estado='objetivo'] {
  border-style: dashed;
  border-color: var(--primary);
  background: var(--secondary);
}
.insignia {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--muted-foreground);
}
.item[data-estado='seleccionado'] .insignia {
  color: var(--primary);
}
.item[data-estado='emparejado'] .insignia {
  color: var(--success);
}
.item[data-estado='fallo'] .insignia {
  color: var(--destructive);
}
.pareja-texto {
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: var(--card-foreground);
}

.formadas {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.formada {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem;
  border-left: 4px solid var(--success);
  background: var(--muted);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}
.explicacion {
  color: var(--card-foreground);
}
.flecha {
  display: inline-block;
  vertical-align: text-bottom;
}

.lista-revision {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.par-revision {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  font-size: 0.9375rem;
}
.par-revision-texto {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  font-weight: 600;
}

.resultado {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.875rem;
  border: 2px solid var(--primary);
  border-radius: var(--radius-lg);
  background: var(--card);
}
.titulo-resultado {
  font-family: var(--font-serif);
  font-size: 1.0625rem;
  font-weight: 700;
  outline-offset: 4px;
}
.minimo {
  font-weight: 600;
  color: var(--destructive);
}

.fantasma {
  position: fixed;
  z-index: 200;
  max-width: 16rem;
  padding: 0.5rem 0.75rem;
  overflow: hidden;
  border: 2px solid var(--primary);
  border-radius: var(--radius-lg);
  background: var(--card);
  color: var(--card-foreground);
  font-size: 0.9375rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
  transform: translate(-50%, -110%) rotate(-1deg);
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.25);
}
.fantasma-reducido {
  transform: translate(-50%, -110%);
}

/* Aparición del par recién formado: solo con movimiento permitido. */
@media (prefers-reduced-motion: no-preference) {
  .item.nuevo {
    animation: par-nuevo 0.3s ease-out;
  }
}
@keyframes par-nuevo {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 1;
  }
}
</style>
