/**
 * Sugerencias de refuerzo (equivale a app/services/refuerzo.py): qué conceptos conviene repasar,
 * SIN llamar al modelo. Reglas fijas sobre los resultados del estudiante y el manifiesto.
 *
 * Una sugerencia por actividad, con UN motivo (el de más peso):
 * - `atascada` (90 + extra): sin completar y con 3 o más intentos.
 * - `precision_baja` (60 a 88): completada, con menos del 70 % del puntaje máximo.
 * - `en_curso` (50): obligatoria, sin completar, con 1 o 2 intentos.
 * - `varios_intentos` (40 + extra): completada con buen puntaje, pero con 3 o más intentos.
 * - `pendiente` (30): obligatoria, sin ningún intento, de un módulo ya iniciado.
 */
import { aBool, aEntero, todas } from '../core/db';
import type { Manifiesto, ActivitySpec } from './manifiesto';
import type { MejorResultado } from './progreso';

export const INTENTOS_ATASCADA = 3;
const PRECISION_MINIMA = 0.7;
export const LIMITE_POR_DEFECTO = 5;
export const LIMITE_MAXIMO = 10;
const UMBRAL_ALTA = 80;
const UMBRAL_MEDIA = 50;
const TOPE_EXTRA_INTENTOS = 9;

export type Prioridad = 'alta' | 'media' | 'baja';
export type MotivoTipo = 'atascada' | 'precision_baja' | 'en_curso' | 'varios_intentos' | 'pendiente';

export interface RefuerzoSugerencia {
  actividad_id: string;
  concepto: string;
  modulo: number;
  seccion: string;
  seccion_titulo: string;
  url: string;
  motivo_tipo: MotivoTipo;
  motivo: string;
  prioridad: Prioridad;
  puntaje: number;
}

interface Evaluada {
  puntaje: number;
  motivo: MotivoTipo;
  texto: string;
}

/**
 * Redondeo de Python (`round`): a la par más cercana en los empates. Math.round redondearía los
 * .5 hacia arriba y daría un puntaje distinto al del Python en esos casos.
 */
function redondearComoPython(x: number): number {
  const base = Math.floor(x);
  const resto = x - base;
  if (resto > 0.5) return base + 1;
  if (resto < 0.5) return base;
  return base % 2 === 0 ? base : base + 1;
}

export function prioridadDe(puntaje: number): Prioridad {
  if (puntaje >= UMBRAL_ALTA) return 'alta';
  if (puntaje >= UMBRAL_MEDIA) return 'media';
  return 'baja';
}

function intentosTexto(intentos: number): string {
  return intentos === 1 ? '1 intento' : `${intentos} intentos`;
}

/** Puntaje, motivo y texto de una actividad, o `null` si no hay nada que reforzar. */
export function evaluarActividad(
  spec: ActivitySpec,
  resultado: MejorResultado | undefined,
  moduloIniciado: boolean,
): Evaluada | null {
  if (!resultado || (resultado.intentos === 0 && !resultado.completada)) {
    if (spec.obligatoria && moduloIniciado) {
      return { puntaje: 30, motivo: 'pendiente', texto: 'Es una actividad obligatoria que aún no has hecho' };
    }
    return null;
  }

  const intentos = resultado.intentos;
  const extra = Math.min(Math.max(intentos - INTENTOS_ATASCADA, 0), TOPE_EXTRA_INTENTOS);
  if (!resultado.completada) {
    if (intentos >= INTENTOS_ATASCADA) {
      return {
        puntaje: 90 + extra,
        motivo: 'atascada',
        texto: `Llevas ${intentosTexto(intentos)} y aún no la completas`,
      };
    }
    if (spec.obligatoria) {
      return {
        puntaje: 50,
        motivo: 'en_curso',
        texto: 'Empezaste esta actividad obligatoria y aún no la completas',
      };
    }
    return null;
  }

  const precision = Math.min(resultado.mejor_puntaje / spec.puntaje_max, 1.0);
  if (precision < PRECISION_MINIMA) {
    return {
      puntaje: 60 + redondearComoPython(((PRECISION_MINIMA - precision) / PRECISION_MINIMA) * 28),
      motivo: 'precision_baja',
      texto: `Tu mejor resultado fue ${resultado.mejor_puntaje} de ${spec.puntaje_max} puntos`,
    };
  }
  if (intentos >= INTENTOS_ATASCADA) {
    return {
      puntaje: 40 + extra,
      motivo: 'varios_intentos',
      texto: `Necesitaste ${intentosTexto(intentos)} para completarla`,
    };
  }
  return null;
}

/**
 * `iniciados`: módulos en los que el estudiante ya hizo algo (un resultado, tiempo o sección abierta).
 * `completados`: módulos que cerró. Solo lee filas del propio usuario.
 */
export async function modulosDelEstudiante(
  db: D1Database,
  userId: number,
  resultados: readonly MejorResultado[],
): Promise<{ iniciados: Set<number>; completados: Set<number> }> {
  const iniciados = new Set(resultados.map((r) => r.modulo));
  const completados = new Set<number>();
  const filas = await todas<{
    modulo: number;
    seccion_actual: string | null;
    completado: number;
    tiempo_total_seg: number;
  }>(db, 'SELECT modulo, seccion_actual, completado, tiempo_total_seg FROM progress_modulos WHERE user_id = ?', userId);
  for (const fila of filas) {
    const modulo = aEntero(fila.modulo);
    const completado = aBool(fila.completado);
    if (completado) completados.add(modulo);
    if (completado || aEntero(fila.tiempo_total_seg) > 0 || (fila.seccion_actual ?? null) !== null) {
      iniciados.add(modulo);
    }
  }
  return { iniciados, completados };
}

interface Candidata {
  puntaje: number;
  motivo: MotivoTipo;
  texto: string;
  actividadId: string;
  spec: ActivitySpec;
  orden: number;
}

/**
 * Lista priorizada de conceptos a reforzar, la más urgente primero. Vacía si no hay señal. Una
 * sugerencia por concepto dentro de un módulo (queda la más urgente). Con `modulo`, solo sus actividades.
 */
export function calcularSugerencias(
  manifiesto: Manifiesto,
  resultados: readonly MejorResultado[],
  opciones: {
    iniciados?: ReadonlySet<number>;
    completados?: ReadonlySet<number>;
    modulo?: number | null;
    limite?: number;
  } = {},
): RefuerzoSugerencia[] {
  const porActividad = new Map(resultados.map((r) => [r.activity_id, r] as const));
  const iniciados = opciones.iniciados ?? new Set<number>();
  const completados = opciones.completados ?? new Set<number>();
  const moduloFiltro = opciones.modulo ?? null;

  const mejores = new Map<string, Candidata>();
  let orden = 0;
  for (const [actividadId, spec] of manifiesto.actividades) {
    const posicion = orden++;
    if (moduloFiltro !== null && spec.modulo !== moduloFiltro) continue;
    const evaluada = evaluarActividad(
      spec,
      porActividad.get(actividadId),
      iniciados.has(spec.modulo) && !completados.has(spec.modulo),
    );
    if (!evaluada) continue;
    const candidata: Candidata = { ...evaluada, actividadId, spec, orden: posicion };
    const concepto = spec.concepto || spec.seccion_titulo || spec.seccion;
    const clave = `${spec.modulo}\u0000${concepto.toLowerCase()}`;
    const previa = mejores.get(clave);
    if (
      !previa ||
      candidata.puntaje > previa.puntaje ||
      (candidata.puntaje === previa.puntaje && candidata.orden < previa.orden)
    ) {
      mejores.set(clave, candidata);
    }
  }

  const ordenadas = [...mejores.values()].sort(
    (a, b) => b.puntaje - a.puntaje || a.spec.modulo - b.spec.modulo || a.orden - b.orden,
  );
  const limite = Math.max(1, Math.min(opciones.limite ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO));
  return ordenadas.slice(0, limite).map((c) => ({
    actividad_id: c.actividadId,
    concepto: c.spec.concepto || c.spec.seccion_titulo || c.spec.seccion,
    modulo: c.spec.modulo,
    seccion: c.spec.seccion,
    seccion_titulo: c.spec.seccion_titulo,
    url: `/modulo/${c.spec.modulo}?s=${c.spec.seccion}`,
    motivo_tipo: c.motivo,
    motivo: c.texto,
    prioridad: prioridadDe(c.puntaje),
    puntaje: c.puntaje,
  }));
}
