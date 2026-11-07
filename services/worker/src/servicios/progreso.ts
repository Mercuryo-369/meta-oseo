/**
 * Progreso por módulo y puntaje (docs/api-contract.md, "Progreso" y "Actividades y puntaje";
 * equivale a app/services/progress.py). Las escrituras son atómicas en una sentencia o en un
 * `batch` de D1. Siempre se valida contra el manifiesto de actividades (va dentro del Worker).
 */
import { aBool, aEntero, aTexto, primera, todas } from '../core/db';
import { actividadDesconocida, moduloIncompleto, puntajeInvalido } from '../core/errores';
import { MODULE_COUNT, type TipoActividad } from '../core/constantes';
import { ahora } from '../core/tiempo';
import { codigosObtenidos, otorgarLogrosDeModulo } from './logros';
import { manifiesto, type Manifiesto } from './manifiesto';

export interface ModuloProgreso {
  modulo: number;
  seccion_actual: string | null;
  completado: boolean;
  tiempo_total_seg: number;
  updated_at: string | null;
}

export interface ProgresoLeido {
  modulos: ModuloProgreso[];
  puntaje_total: number;
  logros: string[];
}

export interface ActualizacionProgreso {
  seccion_actual?: string | null;
  tiempo_delta_seg?: number | null;
  completado?: boolean | null;
}

export interface ResultadoActividadEntrada {
  modulo: number;
  tipo: TipoActividad;
  puntaje: number;
  intentos: number;
  completada: boolean;
  detalle?: Record<string, unknown> | null;
}

export interface ResultadoActividadLeido {
  activity_id: string;
  modulo: number;
  tipo: TipoActividad;
  puntaje: number;
  intentos: number;
  completada: boolean;
  created_at: string;
}

export interface MejorResultado {
  activity_id: string;
  modulo: number;
  tipo: TipoActividad;
  mejor_puntaje: number;
  intentos: number;
  completada: boolean;
  ultimo_intento_en: string;
}

interface FilaProgreso {
  modulo: number;
  seccion_actual: string | null;
  completado: number;
  tiempo_total_seg: number;
  updated_at: string;
}

function moduloDeFila(f: FilaProgreso): ModuloProgreso {
  return {
    modulo: aEntero(f.modulo),
    seccion_actual: aTexto(f.seccion_actual),
    completado: aBool(f.completado),
    tiempo_total_seg: aEntero(f.tiempo_total_seg),
    updated_at: f.updated_at,
  };
}

/** Puntaje total: suma, por `activity_id`, del MEJOR puntaje entre los intentos completados. */
export async function puntajeTotal(db: D1Database, userId: number): Promise<number> {
  const fila = await primera<{ total: number }>(
    db,
    'SELECT COALESCE(SUM(mejor), 0) AS total FROM (SELECT MAX(puntaje) AS mejor FROM activity_results WHERE user_id = ? AND completada = 1 GROUP BY activity_id)',
    userId,
  );
  return aEntero(fila?.total);
}

/** Los 6 módulos (con valores por defecto si no hay fila), puntaje total y logros. */
export async function leerProgreso(db: D1Database, userId: number): Promise<ProgresoLeido> {
  const filas = await todas<FilaProgreso>(db, 'SELECT * FROM progress_modulos WHERE user_id = ?', userId);
  const porModulo = new Map(filas.map((f) => [aEntero(f.modulo), moduloDeFila(f)]));
  const modulos: ModuloProgreso[] = [];
  for (let n = 1; n <= MODULE_COUNT; n++) {
    modulos.push(
      porModulo.get(n) ?? { modulo: n, seccion_actual: null, completado: false, tiempo_total_seg: 0, updated_at: null },
    );
  }
  return { modulos, puntaje_total: await puntajeTotal(db, userId), logros: await codigosObtenidos(db, userId) };
}

/** Ids de las actividades obligatorias del módulo sin un resultado completado, en orden. */
export async function obligatoriasPendientes(
  db: D1Database,
  userId: number,
  man: Manifiesto,
  modulo: number,
): Promise<string[]> {
  const requeridas = man.requiredIds(modulo);
  if (requeridas.length === 0) return [];
  const marcadores = requeridas.map(() => '?').join(',');
  const hechas = new Set(
    (
      await todas<{ activity_id: string }>(
        db,
        `SELECT DISTINCT activity_id FROM activity_results WHERE user_id = ? AND completada = 1 AND activity_id IN (${marcadores})`,
        userId,
        ...requeridas,
      )
    ).map((f) => f.activity_id),
  );
  return requeridas.filter((id) => !hechas.has(id));
}

async function filaModulo(db: D1Database, userId: number, modulo: number): Promise<FilaProgreso | null> {
  return primera<FilaProgreso>(db, 'SELECT * FROM progress_modulos WHERE user_id = ? AND modulo = ?', userId, modulo);
}

/** `PUT /api/progress/{modulo}`: suma tiempo, fija sección, completa (monótono) y premia. */
export async function actualizarProgreso(
  db: D1Database,
  userId: number,
  modulo: number,
  cambios: ActualizacionProgreso,
  man: Manifiesto = manifiesto,
): Promise<{ modulo: ModuloProgreso; logros_nuevos: string[] }> {
  if (cambios.completado === true) {
    const previa = await filaModulo(db, userId, modulo);
    if (!previa || !aBool(previa.completado)) {
      if (!man.modulos.includes(modulo)) {
        throw moduloIncompleto([], 'El servidor no tiene registrado el contenido de este módulo.');
      }
      const faltantes = await obligatoriasPendientes(db, userId, man, modulo);
      if (faltantes.length > 0) throw moduloIncompleto(faltantes);
    }
  }
  const instante = ahora();
  const asignaciones: string[] = ['updated_at = ?'];
  const valores: unknown[] = [instante];
  if (cambios.seccion_actual !== undefined && cambios.seccion_actual !== null) {
    asignaciones.push('seccion_actual = ?');
    valores.push(cambios.seccion_actual);
  }
  if (cambios.tiempo_delta_seg) {
    asignaciones.push('tiempo_total_seg = tiempo_total_seg + ?');
    valores.push(cambios.tiempo_delta_seg);
  }
  if (cambios.completado === true) asignaciones.push('completado = 1');
  // 1) La fila existe (con dos peticiones simultáneas solo una inserta); 2) un solo UPDATE.
  await db.batch([
    db
      .prepare(
        'INSERT INTO progress_modulos (user_id, modulo, seccion_actual, completado, tiempo_total_seg, updated_at) VALUES (?, ?, NULL, 0, 0, ?) ON CONFLICT (user_id, modulo) DO NOTHING',
      )
      .bind(userId, modulo, instante),
    db
      .prepare(`UPDATE progress_modulos SET ${asignaciones.join(', ')} WHERE user_id = ? AND modulo = ?`)
      .bind(...valores, userId, modulo),
  ]);
  const fila = (await filaModulo(db, userId, modulo)) as FilaProgreso;
  const logrosNuevos = aBool(fila.completado) ? await otorgarLogrosDeModulo(db, userId, modulo) : [];
  return { modulo: moduloDeFila(fila), logros_nuevos: logrosNuevos };
}

/** 422 `actividad_desconocida` o `puntaje_invalido` según el contenido del OVA. */
export function validarContraManifiesto(man: Manifiesto, activityId: string, entrada: ResultadoActividadEntrada): void {
  const spec = man.actividades.get(activityId);
  if (!spec || spec.modulo !== entrada.modulo || spec.tipo !== entrada.tipo) throw actividadDesconocida();
  if (entrada.puntaje > spec.puntaje_max) throw puntajeInvalido(spec.puntaje_max);
}

/** `POST /api/activities/{activity_id}/result`: guarda el intento y recalcula el puntaje. */
export async function registrarResultado(
  db: D1Database,
  userId: number,
  activityId: string,
  entrada: ResultadoActividadEntrada,
  man: Manifiesto = manifiesto,
): Promise<{ resultado: ResultadoActividadLeido; puntaje_total: number; logros_nuevos: string[] }> {
  validarContraManifiesto(man, activityId, entrada);
  const instante = ahora();
  await db
    .prepare(
      'INSERT INTO activity_results (user_id, activity_id, modulo, tipo, puntaje, intentos, completada, detalle, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      userId,
      activityId,
      entrada.modulo,
      entrada.tipo,
      entrada.puntaje,
      entrada.intentos,
      entrada.completada ? 1 : 0,
      entrada.detalle ? JSON.stringify(entrada.detalle) : null,
      instante,
    )
    .run();
  return {
    resultado: {
      activity_id: activityId,
      modulo: entrada.modulo,
      tipo: entrada.tipo,
      puntaje: entrada.puntaje,
      intentos: entrada.intentos,
      completada: entrada.completada,
      created_at: instante,
    },
    puntaje_total: await puntajeTotal(db, userId),
    logros_nuevos: [],
  };
}

/** `GET /api/activities/results`: una fila por actividad con resultados del usuario. */
export async function listarResultados(db: D1Database, userId: number, modulo?: number): Promise<MejorResultado[]> {
  const filas = await todas<{
    activity_id: string;
    modulo: number;
    tipo: string;
    puntaje: number;
    intentos: number;
    completada: number;
    created_at: string;
  }>(
    db,
    'SELECT activity_id, modulo, tipo, puntaje, intentos, completada, created_at FROM activity_results WHERE user_id = ? ORDER BY created_at, id',
    userId,
  );
  const mejores = new Map<string, MejorResultado>();
  for (const f of filas) {
    const entrada = mejores.get(f.activity_id) ?? {
      activity_id: f.activity_id,
      modulo: 0,
      tipo: f.tipo as TipoActividad,
      mejor_puntaje: 0,
      intentos: 0,
      completada: false,
      ultimo_intento_en: f.created_at,
    };
    entrada.modulo = aEntero(f.modulo);
    entrada.tipo = f.tipo as TipoActividad;
    entrada.ultimo_intento_en = f.created_at;
    entrada.intentos = Math.max(entrada.intentos, aEntero(f.intentos));
    if (aBool(f.completada)) {
      entrada.completada = true;
      entrada.mejor_puntaje = Math.max(entrada.mejor_puntaje, aEntero(f.puntaje));
    }
    mejores.set(f.activity_id, entrada);
  }
  return [...mejores.values()]
    .filter((r) => modulo === undefined || r.modulo === modulo)
    .sort((a, b) => a.modulo - b.modulo || (a.activity_id < b.activity_id ? -1 : a.activity_id > b.activity_id ? 1 : 0));
}
