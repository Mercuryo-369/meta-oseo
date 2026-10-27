/**
 * Lógica pura del quiz (sin Vue): depuración de preguntas, barajado determinista, instantánea
 * del intento a medias y veredicto de cada pregunta. Vive aparte del componente para probarla
 * a fondo (adversarialmente) sin montar nada.
 *
 * El puntaje NO se calcula aquí: es de `@/content/scoring` (`precisionPregunta`, `precisionQuiz`,
 * `calcularPuntaje`). Este archivo solo decide cómo se presentan las preguntas y cómo se guardan.
 *
 * Instantánea (`progreso.instantanea`), pensada para caber siempre en `INSTANTANEA_MAX_BYTES`:
 *
 *     { v: 1, semilla: 123456, r: [ null, [0, 2], true, [2, 0, 1, 3] ] }
 *
 * `semilla` deriva TODO el barajado (orden de preguntas, de opciones y de pasos): el mismo intento
 * se ve igual tras recargar. `r[i]` es la respuesta CONFIRMADA de la pregunta `i` de la lista del
 * contenido (no del orden barajado), o `null` si aún no se responde: una lista de índices de las
 * opciones marcadas (`opcion_multiple`), un booleano (`verdadero_falso`) o el orden elegido como
 * índices de los pasos (`ordenar`). Son índices y no ids: ocupan poco y una instantánea de otra
 * versión del contenido se detecta sola (longitud o índices fuera de rango) y se descarta entera.
 */
import type { EstadoPrevioActividad, JsonObjeto, JsonValor } from '@/activities/types';
import type { Pregunta } from '@/content/schema';
import type { RespuestaPregunta } from '@/content/scoring';

/** Versión del formato de la instantánea: si cambia, las guardadas se ignoran. */
export const VERSION_INSTANTANEA = 1;

/** Tope de la semilla (32 bits sin signo). */
const SEMILLA_MAX = 2 ** 32;

/* -------------------------------------------------------------------------------------------
 * Azar determinista
 * ----------------------------------------------------------------------------------------- */

/** Generador pseudoaleatorio mulberry32: mismo número de semilla, misma secuencia. */
export function crearAzar(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / SEMILLA_MAX;
  };
}

/** Semilla derivada de otra y de una sal (para que cada pregunta baraje con su propia secuencia). */
export function derivarSemilla(base: number, sal: number): number {
  let h = (base ^ Math.imul(sal + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Semilla nueva para un intento (aleatoria: cada ejecución se ve distinta). */
export function semillaNueva(): number {
  return Math.floor(Math.random() * SEMILLA_MAX) >>> 0;
}

/** Fisher-Yates sobre una copia. */
export function barajar<T>(elementos: readonly T[], azar: () => number): T[] {
  const copia = [...elementos];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(azar() * (i + 1)));
    const auxiliar = copia[i] as T;
    copia[i] = copia[j] as T;
    copia[j] = auxiliar;
  }
  return copia;
}

function rango(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/**
 * Permutación de `0..n-1` que NUNCA es el orden correcto (la identidad) si `n >= 2`: si el azar la
 * produce se vuelve a barajar y, en el peor caso, se rota una posición. Con 3 pasos, 1 de cada 6
 * barajados regalaría la respuesta. Con `n < 2` no hay otra permutación y se devuelve la única.
 */
export function ordenNoCorrecto(n: number, azar: () => number): number[] {
  const identidad = rango(n);
  if (n < 2) return identidad;
  for (let intento = 0; intento < 32; intento++) {
    const orden = barajar(identidad, azar);
    if (orden.some((valor, i) => valor !== i)) return orden;
  }
  return [...identidad.slice(1), identidad[0] as number];
}

/* -------------------------------------------------------------------------------------------
 * Depuración de preguntas (defensa en profundidad: el contenido ya pasó por zod, pero la
 * instantánea, el proveedor de IA y un contenido a medio escribir no deben romper el componente)
 * ----------------------------------------------------------------------------------------- */

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function idsDistintos(elementos: readonly unknown[]): boolean {
  const vistos = new Set<string>();
  for (const e of elementos) {
    if (!esObjeto(e) || typeof e.id !== 'string' || e.id === '' || typeof e.texto !== 'string') {
      return false;
    }
    if (vistos.has(e.id)) return false;
    vistos.add(e.id);
  }
  return true;
}

/** ¿Tiene la forma mínima que el componente necesita para mostrarla y puntuarla? */
export function esPreguntaUtilizable(bruta: unknown): bruta is Pregunta {
  if (!esObjeto(bruta)) return false;
  if (typeof bruta.id !== 'string' || bruta.id === '') return false;
  if (typeof bruta.enunciado !== 'string' || bruta.enunciado === '') return false;
  if (typeof bruta.explicacion !== 'string') return false;
  switch (bruta.formato) {
    case 'verdadero_falso':
      return typeof bruta.correcta === 'boolean';
    case 'ordenar':
      return Array.isArray(bruta.pasos) && bruta.pasos.length >= 1 && idsDistintos(bruta.pasos);
    case 'opcion_multiple': {
      if (!Array.isArray(bruta.opciones) || bruta.opciones.length < 1) return false;
      if (!idsDistintos(bruta.opciones)) return false;
      if (!Array.isArray(bruta.correctas) || bruta.correctas.length < 1) return false;
      const ids = new Set((bruta.opciones as { id: string }[]).map((o) => o.id));
      return bruta.correctas.every((c) => typeof c === 'string' && ids.has(c));
    }
    default:
      return false;
  }
}

/**
 * Las preguntas utilizables, en el orden del contenido y sin ids repetidos (la repetida se
 * descarta). Una lista que no es lista da una lista vacía: el componente muestra su estado de error.
 */
export function depurarPreguntas(bruto: unknown): Pregunta[] {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set<string>();
  const utiles: Pregunta[] = [];
  for (const candidata of bruto) {
    if (!esPreguntaUtilizable(candidata) || vistos.has(candidata.id)) continue;
    vistos.add(candidata.id);
    utiles.push(candidata);
  }
  return utiles;
}

/* -------------------------------------------------------------------------------------------
 * Presentación
 * ----------------------------------------------------------------------------------------- */

export interface PreguntaPresentada {
  /** Posición de la pregunta en la lista depurada del contenido (la clave de las respuestas). */
  indice: number;
  pregunta: Pregunta;
  /** `ordenOpciones[k]` = índice en `pregunta.opciones` de la opción que se muestra en el lugar k. */
  ordenOpciones: number[];
  /** `ordenPasos[k]` = índice en `pregunta.pasos` del paso que se muestra en el lugar k (al empezar). */
  ordenPasos: number[];
}

export interface OpcionesPresentacion {
  barajarPreguntas: boolean;
  barajarOpciones: boolean;
}

/** Orden de presentación de una pregunta con su propia secuencia derivada de la semilla. */
export function presentarPregunta(
  pregunta: Pregunta,
  indice: number,
  semilla: number,
  barajarOpciones: boolean,
): PreguntaPresentada {
  let ordenOpciones: number[] = [];
  let ordenPasos: number[] = [];
  if (pregunta.formato === 'opcion_multiple') {
    ordenOpciones = rango(pregunta.opciones.length);
    if (barajarOpciones) {
      ordenOpciones = barajar(ordenOpciones, crearAzar(derivarSemilla(semilla, 1 + indice * 2)));
    }
  } else if (pregunta.formato === 'ordenar') {
    // Los pasos SIEMPRE se barajan: el orden del arreglo es la respuesta.
    ordenPasos = ordenNoCorrecto(
      pregunta.pasos.length,
      crearAzar(derivarSemilla(semilla, 2 + indice * 2)),
    );
  }
  return { indice, pregunta, ordenOpciones, ordenPasos };
}

/**
 * Las preguntas de este intento, en el orden del contenido: todas o, con `mostrar`, las `siempre`
 * más una muestra de `mostrar` del resto, distinta en cada intento y determinista según la semilla.
 */
export function preguntasDelIntento(
  todas: readonly Pregunta[],
  semilla: number,
  mostrar: number | undefined,
): Pregunta[] {
  const sorteables = rango(todas.length).filter((i) => todas[i]?.siempre !== true);
  if (mostrar === undefined || mostrar >= sorteables.length) return [...todas];
  const elegidas = new Set(
    barajar(sorteables, crearAzar(derivarSemilla(semilla, 1))).slice(0, mostrar),
  );
  return todas.filter((p, i) => p.siempre === true || elegidas.has(i));
}

/** La semilla de una instantánea guardada (para rehacer su muestra antes de leer sus respuestas). */
export function semillaDeInstantanea(instantanea: unknown): number | null {
  if (!esObjeto(instantanea)) return null;
  const { semilla } = instantanea;
  return typeof semilla === 'number' &&
    Number.isInteger(semilla) &&
    semilla >= 0 &&
    semilla < SEMILLA_MAX
    ? semilla
    : null;
}

/** Las preguntas en el orden en que se muestran en este intento. Determinista según la semilla. */
export function presentarQuiz(
  preguntas: readonly Pregunta[],
  semilla: number,
  opciones: OpcionesPresentacion,
): PreguntaPresentada[] {
  let orden = rango(preguntas.length);
  if (opciones.barajarPreguntas) orden = barajar(orden, crearAzar(derivarSemilla(semilla, 0)));
  return orden.map((indice) =>
    presentarPregunta(preguntas[indice] as Pregunta, indice, semilla, opciones.barajarOpciones),
  );
}

/* -------------------------------------------------------------------------------------------
 * Veredicto
 * ----------------------------------------------------------------------------------------- */

export type Veredicto = 'correcta' | 'parcial' | 'incorrecta';

const TOLERANCIA = 1e-9;

/** `correcta` solo con precisión 1; `parcial` con algo entre 0 y 1; `incorrecta` con 0. */
export function veredictoDe(precision: number): Veredicto {
  if (precision >= 1 - TOLERANCIA) return 'correcta';
  if (precision > TOLERANCIA) return 'parcial';
  return 'incorrecta';
}

/** Precisión con dos decimales, como la lleva `detalle.preguntas`. */
export function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/* -------------------------------------------------------------------------------------------
 * Instantánea del intento a medias
 * ----------------------------------------------------------------------------------------- */

function esEntero(valor: unknown, max: number): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor < max;
}

/** Lista de índices distintos y dentro de rango, o `null`. */
function indicesValidos(valor: unknown, max: number, exactos: boolean): number[] | null {
  if (!Array.isArray(valor)) return null;
  const vistos = new Set<number>();
  for (const v of valor) {
    if (!esEntero(v, max) || vistos.has(v)) return null;
    vistos.add(v);
  }
  if (exactos && vistos.size !== max) return null;
  return valor as number[];
}

/** La respuesta como JSON compacto (índices), o `null` si no corresponde a la pregunta. */
export function codificarRespuesta(
  pregunta: Pregunta,
  respuesta: RespuestaPregunta,
): JsonValor | null {
  if (respuesta.formato !== pregunta.formato) return null;
  if (pregunta.formato === 'verdadero_falso' && respuesta.formato === 'verdadero_falso') {
    return respuesta.valor;
  }
  if (pregunta.formato === 'opcion_multiple' && respuesta.formato === 'opcion_multiple') {
    const indices = pregunta.opciones
      .map((o, i) => (respuesta.seleccion.includes(o.id) ? i : -1))
      .filter((i) => i >= 0);
    return indices;
  }
  if (pregunta.formato === 'ordenar' && respuesta.formato === 'ordenar') {
    const indices = respuesta.orden.map((id) => pregunta.pasos.findIndex((p) => p.id === id));
    return indices.every((i) => i >= 0) ? indices : null;
  }
  return null;
}

/** Inverso de `codificarRespuesta`; `undefined` si el valor no es válido para esa pregunta. */
export function decodificarRespuesta(
  pregunta: Pregunta,
  valor: unknown,
): RespuestaPregunta | undefined {
  if (pregunta.formato === 'verdadero_falso') {
    return typeof valor === 'boolean' ? { formato: 'verdadero_falso', valor } : undefined;
  }
  if (pregunta.formato === 'opcion_multiple') {
    const indices = indicesValidos(valor, pregunta.opciones.length, false);
    if (!indices) return undefined;
    return {
      formato: 'opcion_multiple',
      seleccion: indices.map((i) => (pregunta.opciones[i] as { id: string }).id),
    };
  }
  const indices = indicesValidos(valor, pregunta.pasos.length, true);
  if (!indices) return undefined;
  return {
    formato: 'ordenar',
    orden: indices.map((i) => (pregunta.pasos[i] as { id: string }).id),
  };
}

export interface EstadoRestaurado {
  semilla: number;
  /** Una entrada por pregunta de la lista depurada; `null` si aún no se responde. */
  respuestas: (RespuestaPregunta | null)[];
}

/** Arma la instantánea que se emite en `progreso`. */
export function armarInstantanea(
  preguntas: readonly Pregunta[],
  respuestas: readonly (RespuestaPregunta | null)[],
  semilla: number,
): JsonObjeto {
  return {
    v: VERSION_INSTANTANEA,
    semilla,
    r: preguntas.map((pregunta, i) => {
      const respuesta = respuestas[i];
      return respuesta ? codificarRespuesta(pregunta, respuesta) : null;
    }),
  };
}

/**
 * Lee una instantánea guardada. Devuelve `null` si no es de este formato, si no cuadra con las
 * preguntas actuales (otra versión del contenido) o si cualquier respuesta es inválida: se ignora
 * ENTERA, nunca a medias, para no mezclar respuestas de un contenido con las de otro.
 */
export function leerInstantanea(
  preguntas: readonly Pregunta[],
  instantanea: unknown,
): EstadoRestaurado | null {
  if (!esObjeto(instantanea) || instantanea.v !== VERSION_INSTANTANEA) return null;
  const semilla = instantanea.semilla;
  if (
    typeof semilla !== 'number' ||
    !Number.isInteger(semilla) ||
    semilla < 0 ||
    semilla >= SEMILLA_MAX
  ) {
    return null;
  }
  const r = instantanea.r;
  if (!Array.isArray(r) || r.length !== preguntas.length) return null;
  const respuestas: (RespuestaPregunta | null)[] = [];
  for (const [i, valor] of r.entries()) {
    if (valor === null) {
      respuestas.push(null);
      continue;
    }
    const respuesta = decodificarRespuesta(preguntas[i] as Pregunta, valor);
    if (!respuesta) return null;
    respuestas.push(respuesta);
  }
  return { semilla, respuestas };
}

/**
 * ¿Sigue vigente el intento a medias que guardó el navegador? No si el servidor ya registra ese
 * número de intento como terminado (se completó en otro dispositivo y esta instantánea quedó vieja).
 */
export function instantaneaVigente(estadoPrevio: EstadoPrevioActividad | undefined): boolean {
  const progreso = estadoPrevio?.progreso;
  if (!progreso || typeof progreso.intentos !== 'number' || !Number.isFinite(progreso.intentos)) {
    return false;
  }
  const registrados = estadoPrevio?.servidor?.intentos ?? 0;
  const delServidor = Number.isFinite(registrados) ? Math.max(0, Math.floor(registrados)) : 0;
  return Math.floor(progreso.intentos) >= delServidor + 1;
}

/** Posición (en el orden presentado) por la que se retoma: la primera sin responder, o la última. */
export function posicionDeReanudacion(
  presentadas: readonly PreguntaPresentada[],
  respuestas: readonly (RespuestaPregunta | null)[],
): number {
  const primera = presentadas.findIndex((p) => !respuestas[p.indice]);
  return primera >= 0 ? primera : Math.max(0, presentadas.length - 1);
}

/**
 * La respuesta correcta de una pregunta, con la forma de una respuesta del estudiante. La usa el
 * modo `revisar` (que muestra las respuestas correctas, nunca las del estudiante).
 */
export function respuestaCorrecta(pregunta: Pregunta): RespuestaPregunta {
  if (pregunta.formato === 'verdadero_falso') {
    return { formato: 'verdadero_falso', valor: pregunta.correcta };
  }
  if (pregunta.formato === 'opcion_multiple') {
    return { formato: 'opcion_multiple', seleccion: [...pregunta.correctas] };
  }
  return { formato: 'ordenar', orden: pregunta.pasos.map((p) => p.id) };
}
