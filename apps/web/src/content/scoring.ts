/**
 * Puntaje, completitud y bloqueo. Funciones puras: no leen stores ni la red; quien las llama
 * pasa lo que sabe (qué actividades están completadas, qué módulos lo están). Fórmulas y
 * reglas documentadas en docs/content-schema.md, "Puntaje y bloqueo".
 *
 * Definiciones que comparten los seis componentes de actividad:
 *  - INTENTO: una ejecución completa de la actividad, de principio a fin. Repetirla tras
 *    completarla (o tras terminarla con errores) es el intento siguiente.
 *  - PRECISIÓN: fracción de acierto (0 a 1) de la ejecución que completa la actividad.
 *      · multicapa "explorar", video-texto y exploracion-3d: siempre 1 (no hay error posible).
 *      · multicapa "identificar", arrastre-molecular y relacion-columnas: `precisionPorConteo`
 *        (aciertos / (aciertos + fallos)), donde cada acople o toque equivocado es un fallo.
 *      · quiz: promedio de `precisionPregunta` (`precisionQuiz`).
 *  - PUNTAJE = `puntaje_max` x precisión x factor por intentos, redondeado al entero más
 *    cercano. El factor del intento n es `max(piso, 1 - por_intento x (n - 1))`.
 */
import { BLOQUEO_SECUENCIAL, TOTAL_MODULOS } from '@/config';
import {
  API_INTENTOS_MAX,
  API_PUNTAJE_MAX,
  PENALIZACION_POR_INTENTO_DEFECTO,
  PISO_PENALIZACION_DEFECTO,
} from './constantes';
import { listarActividades } from './consultas';
import type { ActividadUbicada, ConSecciones } from './consultas';
import type { Actividad, Penalizacion, Pregunta, Seccion } from './schema';

/* -------------------------------------------------------------------------------------------
 * Utilidades numéricas
 * ----------------------------------------------------------------------------------------- */

/** Limita `valor` a [min, max]; un valor que no es número (NaN) queda en `min`. */
function limitar(valor: number, min: number, max: number): number {
  if (Number.isNaN(valor)) return min;
  return Math.min(max, Math.max(min, valor));
}

/** Quita el ruido de coma flotante (85.49999999999999 -> 85.5) antes de redondear al entero. */
function sinRuido(valor: number): number {
  return Math.round(valor * 1e6) / 1e6;
}

/** Precisión saneada: entre 0 y 1, y 0 si no es un número. */
export function limitarPrecision(precision: number): number {
  return limitar(precision, 0, 1);
}

/* -------------------------------------------------------------------------------------------
 * Puntaje de una actividad
 * ----------------------------------------------------------------------------------------- */

/** Techo de intentos que se considera al calcular el factor (evita `Infinity` en la resta). */
const INTENTOS_TECHO = 1_000_000;

/**
 * Factor por intentos: `max(piso, 1 - por_intento x (intentos - 1))`, siempre entre `piso` y 1.
 * `intentos` menor que 1, no entero o NaN se trata como 1 (nunca premia ni castiga de más).
 */
export function factorPorIntentos(
  intentos: number,
  penalizacion: Partial<Penalizacion> = {},
): number {
  const n = Number.isNaN(intentos)
    ? 1
    : Math.min(Math.max(1, Math.floor(intentos)), INTENTOS_TECHO);
  const porIntento = limitar(penalizacion.por_intento ?? PENALIZACION_POR_INTENTO_DEFECTO, 0, 1);
  const piso = limitar(penalizacion.piso ?? PISO_PENALIZACION_DEFECTO, 0, 1);
  return Math.max(piso, 1 - porIntento * (n - 1));
}

export interface EntradaPuntaje {
  /** Precisión de la ejecución que completa la actividad (0 a 1). */
  precision: number;
  /** Número de esta ejecución: 1 el primer intento, 2 el segundo... */
  intentos: number;
}

/** Lo mínimo que hace falta de una actividad para puntuarla. */
export interface ParametrosPuntaje {
  puntaje_max: number;
  penalizacion?: Partial<Penalizacion>;
}

/**
 * Puntaje entero de una actividad: `puntaje_max x precision x factorPorIntentos`.
 * Nunca es negativo ni supera `puntaje_max` (ni el tope de la API, 1000), aunque los datos de
 * entrada sean absurdos (precisión fuera de rango, intentos 0 o NaN).
 */
export function calcularPuntaje(actividad: ParametrosPuntaje, entrada: EntradaPuntaje): number {
  const maximo = limitar(actividad.puntaje_max, 0, API_PUNTAJE_MAX);
  const bruto =
    maximo *
    limitarPrecision(entrada.precision) *
    factorPorIntentos(entrada.intentos, actividad.penalizacion);
  return limitar(Math.round(sinRuido(bruto)), 0, Math.round(maximo));
}

/**
 * ¿Ejecución sin errores? Precisión 1 en el primer intento. Es la base del logro "Sin errores en un
 * módulo" (F5-04): se decide con la precisión y no con `puntaje === puntaje_max`, porque el
 * redondeo puede dar el puntaje máximo con media pregunta mal (un quiz de 20 preguntas con
 * `puntaje_max` 10).
 */
export function ejecucionSinErrores(entrada: EntradaPuntaje): boolean {
  return limitarPrecision(entrada.precision) >= 1 - 1e-9 && Math.floor(entrada.intentos) === 1;
}

/** Intentos saneados para enviarlos a la API (entero entre 1 y 100). */
export function intentosParaApi(intentos: number): number {
  if (Number.isNaN(intentos)) return 1;
  return Math.min(API_INTENTOS_MAX, Math.max(1, Math.floor(intentos)));
}

/** Precisión de una ejecución con acierto/fallo por acción: aciertos / (aciertos + fallos). */
export function precisionPorConteo(aciertos: number, fallos: number): number {
  const a = Math.max(0, Number.isFinite(aciertos) ? aciertos : 0);
  const f = Math.max(0, Number.isFinite(fallos) ? fallos : 0);
  return a + f === 0 ? 0 : a / (a + f);
}

/* -------------------------------------------------------------------------------------------
 * Retroalimentación por banda de precisión
 * ----------------------------------------------------------------------------------------- */

export const UMBRAL_RETRO_CORRECTA = 0.8;
export const UMBRAL_RETRO_PARCIAL = 0.5;
export type BandaRetroalimentacion = 'correcta' | 'parcial' | 'incorrecta';

/** `correcta` desde 0,8; `parcial` desde 0,5; `incorrecta` por debajo. */
export function bandaRetroalimentacion(precision: number): BandaRetroalimentacion {
  const p = limitarPrecision(precision);
  if (p >= UMBRAL_RETRO_CORRECTA) return 'correcta';
  if (p >= UMBRAL_RETRO_PARCIAL) return 'parcial';
  return 'incorrecta';
}

/**
 * Mensaje de `retroalimentacion` que corresponde a la precisión. Si la actividad no escribió el
 * de esa banda se usa el más cercano (parcial <-> incorrecta) y, en último caso, `correcta`.
 */
export function textoRetroalimentacion(
  actividad: Pick<Actividad, 'retroalimentacion'>,
  precision: number,
): string {
  const r = actividad.retroalimentacion;
  const banda = bandaRetroalimentacion(precision);
  if (banda === 'correcta') return r.correcta;
  if (banda === 'parcial') return r.parcial ?? r.incorrecta ?? r.correcta;
  return r.incorrecta ?? r.parcial ?? r.correcta;
}

/* -------------------------------------------------------------------------------------------
 * Precisión de un quiz
 * ----------------------------------------------------------------------------------------- */

/** Respuesta del estudiante a una pregunta, según su `formato`. */
export type RespuestaPregunta =
  | { formato: 'opcion_multiple'; seleccion: readonly string[] }
  | { formato: 'verdadero_falso'; valor: boolean }
  | { formato: 'ordenar'; orden: readonly string[] }
  /** Id del término puesto en cada hueco, en orden; `null` si el hueco quedó vacío. */
  | { formato: 'completar'; relleno: readonly (string | null)[] };

/**
 * Precisión (0 a 1) de una pregunta. Sin respuesta, o con una del formato equivocado, vale 0.
 *  - opcion_multiple: `max(0, (correctas marcadas - incorrectas marcadas) / total de correctas)`.
 *    Los ids que no son opciones de la pregunta se ignoran.
 *  - verdadero_falso: 1 si acierta, 0 si no.
 *  - ordenar: fracción de pasos que quedaron en su posición correcta.
 *  - completar: fracción de huecos con su término.
 */
export function precisionPregunta(
  pregunta: Pregunta,
  respuesta: RespuestaPregunta | undefined,
): number {
  if (!respuesta || respuesta.formato !== pregunta.formato) return 0;
  if (pregunta.formato === 'verdadero_falso' && respuesta.formato === 'verdadero_falso') {
    return respuesta.valor === pregunta.correcta ? 1 : 0;
  }
  if (pregunta.formato === 'opcion_multiple' && respuesta.formato === 'opcion_multiple') {
    const validas = new Set(pregunta.opciones.map((o) => o.id));
    const correctas = new Set(pregunta.correctas);
    if (correctas.size === 0) return 0;
    let aciertos = 0;
    let errores = 0;
    for (const id of new Set(respuesta.seleccion)) {
      if (!validas.has(id)) continue;
      if (correctas.has(id)) aciertos++;
      else errores++;
    }
    return limitarPrecision((aciertos - errores) / correctas.size);
  }
  if (pregunta.formato === 'ordenar' && respuesta.formato === 'ordenar') {
    const total = pregunta.pasos.length;
    if (total === 0) return 0;
    let enSuLugar = 0;
    pregunta.pasos.forEach((paso, i) => {
      if (respuesta.orden[i] === paso.id) enSuLugar++;
    });
    return enSuLugar / total;
  }
  if (pregunta.formato === 'completar' && respuesta.formato === 'completar') {
    const total = pregunta.huecos.length;
    if (total === 0) return 0;
    const bien = pregunta.huecos.filter((h, i) => respuesta.relleno[i] === h.id).length;
    return bien / total;
  }
  return 0;
}

/** Promedio de la precisión de todas las preguntas; una sin responder cuenta 0. */
export function precisionQuiz(
  preguntas: readonly Pregunta[],
  respuestas: Readonly<Record<string, RespuestaPregunta | undefined>>,
): number {
  if (preguntas.length === 0) return 0;
  const suma = preguntas.reduce((acc, p) => acc + precisionPregunta(p, respuestas[p.id]), 0);
  return suma / preguntas.length;
}

/* -------------------------------------------------------------------------------------------
 * Puntaje del módulo
 * ----------------------------------------------------------------------------------------- */

export interface OpcionesPuntajeModulo {
  /** Suma solo las actividades obligatorias. Por defecto suma todas. */
  soloObligatorias?: boolean;
}

/** Puntaje máximo posible del módulo: suma de `puntaje_max` de sus actividades. */
export function puntajeMaximoModulo(
  modulo: ConSecciones,
  opciones: OpcionesPuntajeModulo = {},
): number {
  return listarActividades(modulo)
    .filter((u) => !opciones.soloObligatorias || u.actividad.obligatoria)
    .reduce((suma, u) => suma + u.actividad.puntaje_max, 0);
}

/**
 * Puntaje del módulo a partir del mejor puntaje conocido de cada actividad (por `activity_id`),
 * igual que el servidor: cada actividad aporta como mucho su `puntaje_max` y las que no tienen
 * resultado aportan 0. Sirve para mostrar el avance sin esperar a la API.
 */
export function puntajeObtenidoModulo(
  modulo: ConSecciones,
  mejoresPuntajes: Readonly<Record<string, number>>,
): number {
  return listarActividades(modulo).reduce((suma, { actividad }) => {
    const mejor = mejoresPuntajes[actividad.id];
    return suma + (mejor === undefined ? 0 : limitar(mejor, 0, actividad.puntaje_max));
  }, 0);
}

/* -------------------------------------------------------------------------------------------
 * Completitud
 * ----------------------------------------------------------------------------------------- */

/**
 * Ids de las actividades que cuentan como hechas, como conjunto o como lista. Una actividad sin
 * `aprobacion_min` cuenta cuando se completó; una con `aprobacion_min`, cuando además su mejor
 * precisión llegó al umbral. Para construir el conjunto con esa regla, `idsSuperadas`.
 */
export type Completadas = ReadonlySet<string> | readonly string[];

/** Lo que se sabe del mejor resultado de una actividad (servidor o registro local). */
export interface ResultadoConocido {
  /** Alguna ejecución se terminó (API: `completada`). */
  completada: boolean;
  /** Mejor precisión (0 a 1) entre las ejecuciones. Si se desconoce, no se puede aplicar el umbral. */
  mejorPrecision?: number;
}

/**
 * ¿Está superada la actividad? Sin `aprobacion_min`: si se completó. Con él: si se completó y la
 * mejor precisión lo alcanza. Si la precisión se desconoce (un servidor que aún no la devuelve),
 * no se bloquea al estudiante: se acepta la actividad completada.
 */
export function actividadSuperada(
  actividad: { aprobacion_min?: number },
  resultado: ResultadoConocido | undefined,
): boolean {
  if (!resultado?.completada) return false;
  const minimo = actividad.aprobacion_min;
  if (minimo === undefined || resultado.mejorPrecision === undefined) return true;
  return limitarPrecision(resultado.mejorPrecision) + 1e-9 >= minimo;
}

/**
 * Ids de las actividades superadas del módulo, listos para `seccionCompletada`,
 * `moduloCompletado` y demás. `resultados` es el mejor resultado conocido por `activity_id`.
 */
export function idsSuperadas(
  modulo: ConSecciones,
  resultados: Readonly<Record<string, ResultadoConocido | undefined>>,
): Set<string> {
  const superadas = new Set<string>();
  for (const { actividad } of listarActividades(modulo)) {
    if (actividadSuperada(actividad, resultados[actividad.id])) superadas.add(actividad.id);
  }
  return superadas;
}

function aConjunto(completadas: Completadas): ReadonlySet<string> {
  return completadas instanceof Set ? completadas : new Set(completadas as readonly string[]);
}

/**
 * Una sección está completada cuando todas sus actividades OBLIGATORIAS lo están. Sin
 * actividades obligatorias se considera completada, pero el esquema exige al menos una en cada
 * sección, así que en un módulo válido no ocurre.
 */
export function seccionCompletada(seccion: Seccion, completadas: Completadas): boolean {
  const hechas = aConjunto(completadas);
  return seccion.bloques.every(
    (bloque) =>
      bloque.tipo !== 'actividad' ||
      !bloque.actividad.obligatoria ||
      hechas.has(bloque.actividad.id),
  );
}

/** El módulo está completado cuando todas sus secciones lo están. */
export function moduloCompletado(modulo: ConSecciones, completadas: Completadas): boolean {
  const hechas = aConjunto(completadas);
  return modulo.secciones.every((seccion) => seccionCompletada(seccion, hechas));
}

export interface ProgresoModulo {
  obligatoriasTotal: number;
  obligatoriasCompletadas: number;
  actividadesTotal: number;
  actividadesCompletadas: number;
  /** Avance sobre las obligatorias: 0 a 1 (1 si el módulo no tiene ninguna). */
  fraccion: number;
  puntajeMaximo: number;
}

export function progresoDeModulo(modulo: ConSecciones, completadas: Completadas): ProgresoModulo {
  const hechas = aConjunto(completadas);
  const todas = listarActividades(modulo);
  const obligatorias = todas.filter((u) => u.actividad.obligatoria);
  const obligatoriasCompletadas = obligatorias.filter((u) => hechas.has(u.actividad.id)).length;
  return {
    obligatoriasTotal: obligatorias.length,
    obligatoriasCompletadas,
    actividadesTotal: todas.length,
    actividadesCompletadas: todas.filter((u) => hechas.has(u.actividad.id)).length,
    fraccion: obligatorias.length === 0 ? 1 : obligatoriasCompletadas / obligatorias.length,
    puntajeMaximo: todas.reduce((suma, u) => suma + u.actividad.puntaje_max, 0),
  };
}

/**
 * Primera actividad pendiente, en el orden del módulo: la siguiente pieza que el estudiante
 * debe hacer. Por defecto solo cuentan las obligatorias. `null` si no queda ninguna.
 */
export function siguientePendiente(
  modulo: ConSecciones,
  completadas: Completadas,
  opciones: { incluirOpcionales?: boolean } = {},
): ActividadUbicada | null {
  const hechas = aConjunto(completadas);
  return (
    listarActividades(modulo).find(
      (u) => (opciones.incluirOpcionales || u.actividad.obligatoria) && !hechas.has(u.actividad.id),
    ) ?? null
  );
}

/* -------------------------------------------------------------------------------------------
 * Bloqueo secuencial
 * ----------------------------------------------------------------------------------------- */

export interface OpcionesBloqueo {
  /** Por defecto, `BLOQUEO_SECUENCIAL` de src/config.ts. */
  bloqueoSecuencial?: boolean;
}

/**
 * ¿Se puede abrir el módulo `numero`? Sin bloqueo secuencial, siempre (mientras el número sea
 * de 1 a 6). Con él, el módulo 1 está siempre abierto y los demás cuando el anterior está
 * completado. Un módulo ya completado nunca se cierra (el backend no exige orden, así que
 * puede haber uno completado sin que el anterior lo esté). Es la regla de `estadoDelModulo` del
 * menú circular para saber si un módulo está bloqueado, con una diferencia: el menú deja abrir el
 * módulo que ya es el activo (se entra por URL) y esta función no lo sabe; quien la usa para
 * proteger una ruta debe permitir el módulo en el que el estudiante ya está.
 */
export function moduloDesbloqueado(
  numero: number,
  modulosCompletados: readonly number[],
  opciones: OpcionesBloqueo = {},
): boolean {
  if (!Number.isInteger(numero) || numero < 1 || numero > TOTAL_MODULOS) return false;
  const bloqueo = opciones.bloqueoSecuencial ?? BLOQUEO_SECUENCIAL;
  if (!bloqueo || numero === 1) return true;
  return modulosCompletados.includes(numero - 1) || modulosCompletados.includes(numero);
}

/**
 * Siguiente módulo por hacer: el menor número no completado y desbloqueado. `null` si los seis
 * están completados.
 */
export function siguienteModulo(
  modulosCompletados: readonly number[],
  opciones: OpcionesBloqueo = {},
): number | null {
  for (let n = 1; n <= TOTAL_MODULOS; n++) {
    if (!modulosCompletados.includes(n) && moduloDesbloqueado(n, modulosCompletados, opciones)) {
      return n;
    }
  }
  return null;
}

/**
 * Estado de cada sección de un módulo, en orden:
 *  - `completada`: todas sus actividades obligatorias están hechas.
 *  - `actual`: la primera que no está completada.
 *  - `bloqueada`: viene después de la actual y hay bloqueo secuencial.
 *  - `disponible`: viene después de la actual y NO hay bloqueo (se puede abrir ya).
 * Una sección completada nunca se muestra bloqueada.
 */
export type EstadoSeccion = 'completada' | 'actual' | 'disponible' | 'bloqueada';

export function estadoDeSecciones(
  modulo: ConSecciones,
  completadas: Completadas,
  opciones: OpcionesBloqueo = {},
): EstadoSeccion[] {
  const bloqueo = opciones.bloqueoSecuencial ?? BLOQUEO_SECUENCIAL;
  const hechas = aConjunto(completadas);
  const completa = modulo.secciones.map((s) => seccionCompletada(s, hechas));
  const actual = completa.indexOf(false);
  return completa.map((estaCompleta, i) => {
    if (estaCompleta) return 'completada';
    if (i === actual) return 'actual';
    return bloqueo ? 'bloqueada' : 'disponible';
  });
}

/** ¿Se puede abrir la sección `indice` del módulo? (`false` si el índice no existe.) */
export function seccionDesbloqueada(
  modulo: ConSecciones,
  indice: number,
  completadas: Completadas,
  opciones: OpcionesBloqueo = {},
): boolean {
  const estado = estadoDeSecciones(modulo, completadas, opciones)[indice];
  return estado !== undefined && estado !== 'bloqueada';
}
