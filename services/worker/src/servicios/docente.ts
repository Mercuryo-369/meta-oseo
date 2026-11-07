/**
 * Panel docente (docs/api-contract.md, "Docente"; equivale a app/services/teacher.py y
 * app/services/teacher_csv.py). Todo se agrega en SQL: nunca se cargan tablas enteras en memoria.
 *
 * - Solo cuentan los estudiantes (`rol = 'estudiante'`), salvo en el uso del mentor, que cuenta
 *   todos los `usage_events` (como en la API de Python).
 * - Las fechas son texto ISO UTC (`2026-09-23T20:00:00Z`): se comparan como texto y el día es
 *   `substr(created_at, 1, 10)`.
 * - D1 admite como máximo 100 parámetros por sentencia: el CSV recorre a los estudiantes por
 *   rangos de `user_id`, sin listas `IN (...)`.
 */
import { MODULE_COUNT } from '../core/constantes';
import { aEntero, primera, todas } from '../core/db';
import { enmascararIdentificacion, normalizarNumeroIdentificacion } from '../core/texto';
import { aIso } from '../core/tiempo';

const FACTOR_CACHE_LECTURA = 0.1;
const FACTOR_CACHE_ESCRITURA = 1.25;
const LOTE_CSV = 200;
const NOTA_PRECIOS =
  'Estimación con precios configurables (PRECIO_ENTRADA_USD_POR_MTOK y PRECIO_SALIDA_USD_POR_MTOK); la factura real la emite Anthropic.';
const DIA_UTC = 'substr(created_at, 1, 10)';

export const COLUMNAS_CSV = [
  'id_estudiante',
  'nombre',
  'apellido',
  'tipo_identificacion',
  'numero_identificacion',
  'nivel',
  'modulo',
  'completado',
  'seccion_actual',
  'tiempo_total_seg',
  'puntaje_modulo',
  'actividades_completadas',
  'ultima_actualizacion',
  'puntaje_total',
] as const;

export interface PrecioTokens {
  entrada: number;
  salida: number;
}

// --- Tipos de respuesta (mismos nombres de campo que el esquema Python) -----------------------

export interface ResumenCohorte {
  generado_en: string;
  estudiantes: number;
  activos_7d: number;
  activos_30d: number;
  modulos_completados: { modulos_completados: number; estudiantes: number }[];
  tiempo_por_modulo: { modulo: number; tiempo_promedio_seg: number | null; estudiantes: number }[];
  puntaje: { promedio: number | null; mediana: number | null };
}

export interface EstudianteResumen {
  id: number;
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  identificacion_completa: boolean;
  nivel: string;
  modulos_completados: number;
  puntaje_total: number;
  ultima_actividad: string | null;
  tiempo_total_seg: number;
}

export interface PaginaEstudiantes {
  estudiantes: EstudianteResumen[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ModuloEstudiante {
  modulo: number;
  seccion_actual: string | null;
  completado: boolean;
  tiempo_total_seg: number;
  updated_at: string | null;
}

export interface ActividadEstudiante {
  activity_id: string;
  modulo: number;
  tipo: string;
  mejor_puntaje: number;
  puntaje_contabilizado: number;
  intentos: number;
  registros: number;
  completada: boolean;
  ultimo_intento: string | null;
}

export interface MentorEstudiante {
  consultas: number;
  tokens_entrada: number;
  tokens_salida: number;
  tokens_cache_lectura: number;
  tokens_cache_escritura: number;
  costo_estimado_usd: number;
  ultima_consulta: string | null;
}

export interface DetalleEstudiante {
  id: number;
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  identificacion_completa: boolean;
  nivel: string;
  created_at: string;
  modulos_completados: number;
  puntaje_total: number;
  tiempo_total_seg: number;
  ultima_actividad: string | null;
  progreso: ModuloEstudiante[];
  actividades: ActividadEstudiante[];
  mentor: MentorEstudiante;
}

export interface EstadisticaActividad {
  activity_id: string;
  modulo: number;
  tipo: string;
  estudiantes_intentaron: number;
  estudiantes_completaron: number;
  tasa_finalizacion: number | null;
  intentos_promedio: number | null;
  puntaje_promedio: number | null;
}

export interface EstadisticaModulo {
  modulo: number;
  actividades: number;
  estudiantes_intentaron: number;
  tasa_finalizacion: number | null;
  intentos_promedio: number | null;
  puntaje_promedio: number | null;
}

export interface EstadisticasActividades {
  actividades: EstadisticaActividad[];
  por_modulo: EstadisticaModulo[];
  mas_dificiles: EstadisticaActividad[];
}

export interface UsoMentor {
  desde: string;
  hasta: string;
  dias: number;
  precios: {
    moneda: string;
    entrada_usd_por_mtok: number;
    salida_usd_por_mtok: number;
    cache_lectura_factor: number;
    cache_escritura_factor: number;
    nota: string;
  };
  totales: {
    consultas: number;
    usuarios: number;
    tokens_entrada: number;
    tokens_salida: number;
    tokens_cache_lectura: number;
    tokens_cache_escritura: number;
    costo_estimado_usd: number;
  };
  por_dia: { fecha: string; consultas: number; tokens_entrada: number; tokens_salida: number; costo_estimado_usd: number }[];
  por_dia_modelo: {
    fecha: string;
    modelo: string;
    consultas: number;
    tokens_entrada: number;
    tokens_salida: number;
    costo_estimado_usd: number;
  }[];
  por_modelo: {
    modelo: string;
    consultas: number;
    tokens_entrada: number;
    tokens_salida: number;
    tokens_cache_lectura: number;
    tokens_cache_escritura: number;
    costo_estimado_usd: number;
  }[];
  top_usuarios: {
    user_id: number;
    nombre: string;
    apellido: string;
    consultas: number;
    tokens_entrada: number;
    tokens_salida: number;
    costo_estimado_usd: number;
  }[];
}

// --- Utilidades --------------------------------------------------------------------------------

interface Uso {
  entrada: number;
  salida: number;
  cacheLectura: number;
  cacheEscritura: number;
}

/** Costo estimado en USD (precios por millón de tokens), redondeado a 6 decimales. */
export function costoEstimado(precios: PrecioTokens, uso: Uso): number {
  const total =
    (uso.entrada * precios.entrada +
      uso.salida * precios.salida +
      uso.cacheLectura * precios.entrada * FACTOR_CACHE_LECTURA +
      uso.cacheEscritura * precios.entrada * FACTOR_CACHE_ESCRITURA) /
    1_000_000;
  return Math.round(total * 1_000_000) / 1_000_000;
}

/** Decimal de un agregado; `null` si no hay filas (SQL devuelve NULL). */
function aDecimal(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function redondear(valor: unknown, digitos = 4): number | null {
  const n = aDecimal(valor);
  if (n === null) return null;
  const factor = 10 ** digitos;
  return Math.round(n * factor) / factor;
}

/** Tasa de finalización: completaron / intentaron, o `null` si nadie lo intentó. */
function tasa(completaron: unknown, intentaron: unknown): number | null {
  const total = aEntero(intentaron);
  return total === 0 ? null : redondear(aEntero(completaron) / total);
}

function escaparLike(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Subconsultas agregadas por usuario (se anteponen a cada consulta que las necesita).
 * `mejor` aplica la regla del total: el mejor puntaje entre los intentos completados.
 */
const AGREGADOS = `
WITH
progreso AS (
  SELECT user_id,
         SUM(CASE WHEN completado = 1 THEN 1 ELSE 0 END) AS completados,
         SUM(tiempo_total_seg) AS tiempo
  FROM progress_modulos GROUP BY user_id
),
mejor AS (
  SELECT user_id, activity_id, MIN(modulo) AS modulo, MAX(puntaje) AS mejor
  FROM activity_results WHERE completada = 1 GROUP BY user_id, activity_id
),
puntaje AS (
  SELECT user_id, SUM(mejor) AS puntaje FROM mejor GROUP BY user_id
),
ultima AS (
  SELECT user_id, MAX(ts) AS ts FROM (
    SELECT user_id, MAX(updated_at) AS ts FROM progress_modulos GROUP BY user_id
    UNION ALL
    SELECT user_id, MAX(created_at) AS ts FROM activity_results GROUP BY user_id
    UNION ALL
    SELECT user_id, MAX(created_at) AS ts FROM usage_events GROUP BY user_id
  ) GROUP BY user_id
)`;

// --- Resumen de la cohorte ---------------------------------------------------------------------

export async function resumenCohorte(db: D1Database, ahora: Date): Promise<ResumenCohorte> {
  const corte7 = aIso(new Date(ahora.getTime() - 7 * 86_400_000));
  const corte30 = aIso(new Date(ahora.getTime() - 30 * 86_400_000));

  const total = aEntero(
    (await primera<{ n: number }>(db, "SELECT COUNT(*) AS n FROM users WHERE rol = 'estudiante'"))?.n,
  );

  const activos = await primera<{ activos_7d: number; activos_30d: number }>(
    db,
    `${AGREGADOS}
     SELECT COALESCE(SUM(CASE WHEN u.ts >= ? THEN 1 ELSE 0 END), 0) AS activos_7d,
            COALESCE(SUM(CASE WHEN u.ts >= ? THEN 1 ELSE 0 END), 0) AS activos_30d
     FROM users e JOIN ultima u ON u.user_id = e.id
     WHERE e.rol = 'estudiante'`,
    corte7,
    corte30,
  );

  // Distribución: cuántos estudiantes tienen 0..6 módulos completados.
  const distribucion = await todas<{ k: number; n: number }>(
    db,
    `${AGREGADOS}
     SELECT k, COUNT(*) AS n FROM (
       SELECT COALESCE(p.completados, 0) AS k
       FROM users e LEFT JOIN progreso p ON p.user_id = e.id
       WHERE e.rol = 'estudiante'
     ) GROUP BY k`,
  );
  const porK = new Map(distribucion.map((f) => [aEntero(f.k), aEntero(f.n)]));
  const modulosCompletados = [];
  for (let k = 0; k <= MODULE_COUNT; k++) {
    modulosCompletados.push({ modulos_completados: k, estudiantes: porK.get(k) ?? 0 });
  }

  // Tiempo promedio por módulo, sobre los estudiantes con fila de progreso en él.
  const tiempos = new Map(
    (
      await todas<{ modulo: number; promedio: number | null; n: number }>(
        db,
        `SELECT pm.modulo AS modulo, AVG(pm.tiempo_total_seg) AS promedio, COUNT(*) AS n
         FROM progress_modulos pm JOIN users e ON e.id = pm.user_id
         WHERE e.rol = 'estudiante' GROUP BY pm.modulo`,
      )
    ).map((f) => [aEntero(f.modulo), f] as const),
  );
  const tiempoPorModulo = [];
  for (let modulo = 1; modulo <= MODULE_COUNT; modulo++) {
    const fila = tiempos.get(modulo);
    tiempoPorModulo.push({
      modulo,
      tiempo_promedio_seg: fila ? aDecimal(fila.promedio) : null,
      estudiantes: fila ? aEntero(fila.n) : 0,
    });
  }

  return {
    generado_en: aIso(ahora),
    estudiantes: total,
    activos_7d: aEntero(activos?.activos_7d),
    activos_30d: aEntero(activos?.activos_30d),
    modulos_completados: modulosCompletados,
    tiempo_por_modulo: tiempoPorModulo,
    puntaje: await puntajeResumen(db, total),
  };
}

/** Promedio y mediana del puntaje total (todos los estudiantes cuentan, con 0 si no puntuaron). */
async function puntajeResumen(
  db: D1Database,
  totalEstudiantes: number,
): Promise<{ promedio: number | null; mediana: number | null }> {
  if (totalEstudiantes === 0) return { promedio: null, mediana: null };
  const base = `${AGREGADOS}
    SELECT COALESCE(s.puntaje, 0) AS valor
    FROM users e LEFT JOIN puntaje s ON s.user_id = e.id
    WHERE e.rol = 'estudiante'`;
  const promedio = await primera<{ promedio: number | null }>(
    db,
    `${AGREGADOS}
     SELECT AVG(COALESCE(s.puntaje, 0)) AS promedio
     FROM users e LEFT JOIN puntaje s ON s.user_id = e.id
     WHERE e.rol = 'estudiante'`,
  );
  // Mediana: con n impar, el valor central; con n par, el promedio de los dos centrales.
  const centrales = await todas<{ valor: number }>(
    db,
    `${base} ORDER BY valor LIMIT ? OFFSET ?`,
    totalEstudiantes % 2 === 1 ? 1 : 2,
    Math.floor((totalEstudiantes - 1) / 2),
  );
  const mediana = centrales.reduce((suma, f) => suma + aEntero(f.valor), 0) / centrales.length;
  return { promedio: aDecimal(promedio?.promedio), mediana };
}

// --- Lista de estudiantes ----------------------------------------------------------------------

interface BusquedaEstudiantes {
  condiciones: string[];
  parametros: unknown[];
  /** Número de identificación normalizado si la búsqueda es un número exacto. */
  exacto: string | null;
}

/**
 * Cada palabra debe estar en el nombre o el apellido (sin distinguir mayúsculas). Un texto que
 * sea un número de identificación válido se compara por IGUALDAD, nunca por fragmentos.
 * Nota: SQLite (D1) pliega a minúsculas solo el ASCII; los acentos en mayúscula no se pliegan.
 */
function condicionesBusqueda(q: string | undefined): BusquedaEstudiantes {
  const palabras = (q ?? '').split(/\s+/).filter((p) => p.length > 0);
  const condiciones = ["e.rol = 'estudiante'"];
  if (palabras.length === 0) return { condiciones, parametros: [], exacto: null };

  const parametros: unknown[] = [];
  const coincidenciaNombre = palabras
    .map((palabra) => {
      const patron = `%${escaparLike(palabra.toLowerCase())}%`;
      parametros.push(patron, patron);
      return "(LOWER(e.nombre) LIKE ? ESCAPE '\\' OR LOWER(e.apellido) LIKE ? ESCAPE '\\')";
    })
    .join(' AND ');

  let exacto: string | null = null;
  try {
    exacto = normalizarNumeroIdentificacion(palabras.join(' '));
  } catch {
    exacto = null;
  }
  if (exacto === null) {
    condiciones.push(`(${coincidenciaNombre})`);
  } else {
    condiciones.push(`(${coincidenciaNombre} OR e.numero_identificacion = ?)`);
    parametros.push(exacto);
  }
  return { condiciones, parametros, exacto };
}

const ORDEN_ESTUDIANTES = {
  nombre: 'LOWER(e.nombre) ASC, LOWER(e.apellido) ASC, e.id ASC',
  puntaje: 'COALESCE(s.puntaje, 0) DESC, LOWER(e.nombre) ASC, LOWER(e.apellido) ASC, e.id ASC',
  ultima_actividad: '(u.ts IS NULL) ASC, u.ts DESC, e.id ASC',
} as const;

export type OrdenEstudiantes = keyof typeof ORDEN_ESTUDIANTES;

interface FilaEstudiante {
  id: number;
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  nivel: string;
  completados: number;
  tiempo: number;
  puntaje: number;
  ultima: string | null;
}

export async function listarEstudiantes(
  db: D1Database,
  opciones: { page: number; pageSize: number; q: string | undefined; orden: OrdenEstudiantes },
): Promise<PaginaEstudiantes> {
  const busqueda = condicionesBusqueda(opciones.q);
  const where = busqueda.condiciones.join(' AND ');

  const conteo = await primera<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM users e WHERE ${where}`,
    ...busqueda.parametros,
  );
  const total = aEntero(conteo?.n);

  const filas = await todas<FilaEstudiante>(
    db,
    `${AGREGADOS}
     SELECT e.id, e.nombre, e.apellido, e.tipo_identificacion, e.numero_identificacion, e.nivel,
            COALESCE(p.completados, 0) AS completados,
            COALESCE(p.tiempo, 0) AS tiempo,
            COALESCE(s.puntaje, 0) AS puntaje,
            u.ts AS ultima
     FROM users e
     LEFT JOIN progreso p ON p.user_id = e.id
     LEFT JOIN puntaje s ON s.user_id = e.id
     LEFT JOIN ultima u ON u.user_id = e.id
     WHERE ${where}
     ORDER BY ${ORDEN_ESTUDIANTES[opciones.orden]}
     LIMIT ? OFFSET ?`,
    ...busqueda.parametros,
    opciones.pageSize,
    (opciones.page - 1) * opciones.pageSize,
  );

  const estudiantes = filas.map((f): EstudianteResumen => {
    const completa = busqueda.exacto !== null && f.numero_identificacion === busqueda.exacto;
    return {
      id: aEntero(f.id),
      nombre: f.nombre,
      apellido: f.apellido,
      tipo_identificacion: f.tipo_identificacion,
      numero_identificacion: completa ? f.numero_identificacion : enmascararIdentificacion(f.numero_identificacion),
      identificacion_completa: completa,
      nivel: f.nivel,
      modulos_completados: aEntero(f.completados),
      puntaje_total: aEntero(f.puntaje),
      ultima_actividad: f.ultima,
      tiempo_total_seg: aEntero(f.tiempo),
    };
  });

  return {
    estudiantes,
    page: opciones.page,
    page_size: opciones.pageSize,
    total,
    total_pages: Math.ceil(total / opciones.pageSize),
  };
}

// --- Detalle de un estudiante ------------------------------------------------------------------

interface FilaUso {
  consultas: number | null;
  t_in: number | null;
  t_out: number | null;
  c_read: number | null;
  c_write: number | null;
}

/** Sumas de uso del mentor (sin alias: las consultas que las usan no unen tablas con esas columnas). */
const SUMAS_USO = `COUNT(*) AS consultas,
  COALESCE(SUM(input_tokens), 0) AS t_in,
  COALESCE(SUM(output_tokens), 0) AS t_out,
  COALESCE(SUM(cache_read_tokens), 0) AS c_read,
  COALESCE(SUM(cache_creation_tokens), 0) AS c_write`;

function usoDeFila(f: FilaUso): Uso & { consultas: number } {
  return {
    consultas: aEntero(f.consultas),
    entrada: aEntero(f.t_in),
    salida: aEntero(f.t_out),
    cacheLectura: aEntero(f.c_read),
    cacheEscritura: aEntero(f.c_write),
  };
}

export async function detalleEstudiante(
  db: D1Database,
  precios: PrecioTokens,
  id: number,
): Promise<DetalleEstudiante | null> {
  const usuario = await primera<{
    id: number;
    nombre: string;
    apellido: string;
    tipo_identificacion: string;
    numero_identificacion: string;
    nivel: string;
    created_at: string;
  }>(
    db,
    `SELECT id, nombre, apellido, tipo_identificacion, numero_identificacion, nivel, created_at
     FROM users WHERE id = ? AND rol = 'estudiante'`,
    id,
  );
  if (!usuario) return null;

  const filasProgreso = await todas<{
    modulo: number;
    seccion_actual: string | null;
    completado: number;
    tiempo_total_seg: number;
    updated_at: string;
  }>(db, 'SELECT modulo, seccion_actual, completado, tiempo_total_seg, updated_at FROM progress_modulos WHERE user_id = ?', id);
  const porModulo = new Map(filasProgreso.map((f) => [aEntero(f.modulo), f]));
  const progreso: ModuloEstudiante[] = [];
  for (let modulo = 1; modulo <= MODULE_COUNT; modulo++) {
    const f = porModulo.get(modulo);
    progreso.push(
      f
        ? {
            modulo,
            seccion_actual: f.seccion_actual,
            completado: aEntero(f.completado) === 1,
            tiempo_total_seg: aEntero(f.tiempo_total_seg),
            updated_at: f.updated_at,
          }
        : { modulo, seccion_actual: null, completado: false, tiempo_total_seg: 0, updated_at: null },
    );
  }

  const filasActividad = await todas<{
    activity_id: string;
    modulo: number;
    tipo: string;
    mejor: number | null;
    contabilizado: number | null;
    intentos: number | null;
    registros: number;
    completada: number;
    ultimo: string | null;
  }>(
    db,
    `SELECT activity_id,
            MIN(modulo) AS modulo,
            MIN(tipo) AS tipo,
            MAX(puntaje) AS mejor,
            MAX(CASE WHEN completada = 1 THEN puntaje END) AS contabilizado,
            MAX(intentos) AS intentos,
            COUNT(*) AS registros,
            MAX(CASE WHEN completada = 1 THEN 1 ELSE 0 END) AS completada,
            MAX(created_at) AS ultimo
     FROM activity_results WHERE user_id = ?
     GROUP BY activity_id
     ORDER BY MIN(modulo), activity_id`,
    id,
  );
  const actividades: ActividadEstudiante[] = filasActividad.map((f) => ({
    activity_id: f.activity_id,
    modulo: aEntero(f.modulo),
    tipo: f.tipo,
    mejor_puntaje: aEntero(f.mejor),
    puntaje_contabilizado: aEntero(f.contabilizado),
    intentos: aEntero(f.intentos),
    registros: aEntero(f.registros),
    completada: aEntero(f.completada) === 1,
    ultimo_intento: f.ultimo,
  }));

  const uso = await primera<FilaUso & { ultima: string | null }>(
    db,
    `SELECT ${SUMAS_USO}, MAX(created_at) AS ultima FROM usage_events WHERE user_id = ?`,
    id,
  );
  const usoMentor = usoDeFila(uso ?? { consultas: 0, t_in: 0, t_out: 0, c_read: 0, c_write: 0 });
  const mentor: MentorEstudiante = {
    consultas: usoMentor.consultas,
    tokens_entrada: usoMentor.entrada,
    tokens_salida: usoMentor.salida,
    tokens_cache_lectura: usoMentor.cacheLectura,
    tokens_cache_escritura: usoMentor.cacheEscritura,
    costo_estimado_usd: costoEstimado(precios, usoMentor),
    ultima_consulta: uso?.ultima ?? null,
  };

  // Última actividad: el instante más reciente entre progreso, resultados y consultas al mentor.
  const marcas = [
    ...filasProgreso.map((f) => f.updated_at),
    ...actividades.map((a) => a.ultimo_intento),
    mentor.ultima_consulta,
  ].filter((m): m is string => typeof m === 'string');
  const ultimaActividad = marcas.length > 0 ? marcas.reduce((a, b) => (a > b ? a : b)) : null;

  return {
    id: aEntero(usuario.id),
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    tipo_identificacion: usuario.tipo_identificacion,
    numero_identificacion: enmascararIdentificacion(usuario.numero_identificacion),
    identificacion_completa: false,
    nivel: usuario.nivel,
    created_at: usuario.created_at,
    modulos_completados: progreso.filter((m) => m.completado).length,
    // Misma regla del total: suma de los mejores puntajes completados por actividad.
    puntaje_total: actividades.reduce((suma, a) => suma + a.puntaje_contabilizado, 0),
    tiempo_total_seg: progreso.reduce((suma, m) => suma + m.tiempo_total_seg, 0),
    ultima_actividad: ultimaActividad,
    progreso,
    actividades,
    mentor,
  };
}

// --- Estadísticas por actividad ----------------------------------------------------------------

/** Un registro por par (estudiante, actividad): la unidad de conteo de las estadísticas. */
const PARES = `WITH par AS (
  SELECT ar.activity_id AS activity_id,
         ar.user_id AS user_id,
         MIN(ar.modulo) AS modulo,
         MIN(ar.tipo) AS tipo,
         MAX(ar.intentos) AS intentos,
         MAX(CASE WHEN ar.completada = 1 THEN 1 ELSE 0 END) AS completada,
         MAX(CASE WHEN ar.completada = 1 THEN ar.puntaje END) AS mejor
  FROM activity_results ar JOIN users e ON e.id = ar.user_id
  WHERE e.rol = 'estudiante'
  GROUP BY ar.activity_id, ar.user_id
)`;

export async function estadisticasActividades(
  db: D1Database,
  limite: number,
): Promise<EstadisticasActividades> {
  const filasActividad = await todas<{
    activity_id: string;
    modulo: number;
    tipo: string;
    intentaron: number;
    completaron: number | null;
    intentos: number | null;
    puntaje: number | null;
  }>(
    db,
    `${PARES}
     SELECT activity_id, MIN(modulo) AS modulo, MIN(tipo) AS tipo,
            COUNT(*) AS intentaron,
            SUM(completada) AS completaron,
            AVG(intentos) AS intentos,
            AVG(mejor) AS puntaje
     FROM par GROUP BY activity_id ORDER BY MIN(modulo), activity_id`,
  );
  const actividades: EstadisticaActividad[] = filasActividad.map((f) => ({
    activity_id: f.activity_id,
    modulo: aEntero(f.modulo),
    tipo: f.tipo,
    estudiantes_intentaron: aEntero(f.intentaron),
    estudiantes_completaron: aEntero(f.completaron),
    tasa_finalizacion: tasa(f.completaron, f.intentaron),
    intentos_promedio: redondear(f.intentos),
    puntaje_promedio: redondear(f.puntaje),
  }));

  const filasModulo = await todas<{
    modulo: number;
    actividades: number;
    estudiantes: number;
    pares: number;
    completados: number | null;
    intentos: number | null;
    puntaje: number | null;
  }>(
    db,
    `${PARES}
     SELECT modulo,
            COUNT(DISTINCT activity_id) AS actividades,
            COUNT(DISTINCT user_id) AS estudiantes,
            COUNT(*) AS pares,
            SUM(completada) AS completados,
            AVG(intentos) AS intentos,
            AVG(mejor) AS puntaje
     FROM par GROUP BY modulo`,
  );
  const porModulo = new Map(filasModulo.map((f) => [aEntero(f.modulo), f]));
  const modulos: EstadisticaModulo[] = [];
  for (let modulo = 1; modulo <= MODULE_COUNT; modulo++) {
    const f = porModulo.get(modulo);
    modulos.push(
      f
        ? {
            modulo,
            actividades: aEntero(f.actividades),
            estudiantes_intentaron: aEntero(f.estudiantes),
            tasa_finalizacion: tasa(f.completados, f.pares),
            intentos_promedio: redondear(f.intentos),
            puntaje_promedio: redondear(f.puntaje),
          }
        : {
            modulo,
            actividades: 0,
            estudiantes_intentaron: 0,
            tasa_finalizacion: null,
            intentos_promedio: null,
            puntaje_promedio: null,
          },
    );
  }

  // Las más difíciles: menor tasa de finalización y, a igualdad, más intentos promedio.
  const dificiles = [...actividades]
    .sort((a, b) => {
      const tasaA = a.tasa_finalizacion ?? 1;
      const tasaB = b.tasa_finalizacion ?? 1;
      if (tasaA !== tasaB) return tasaA - tasaB;
      const intentosA = a.intentos_promedio ?? 0;
      const intentosB = b.intentos_promedio ?? 0;
      if (intentosA !== intentosB) return intentosB - intentosA;
      return a.activity_id < b.activity_id ? -1 : a.activity_id > b.activity_id ? 1 : 0;
    })
    .slice(0, limite);

  return { actividades, por_modulo: modulos, mas_dificiles: dificiles };
}

// --- Uso del mentor ----------------------------------------------------------------------------

export async function usoMentor(
  db: D1Database,
  precios: PrecioTokens,
  opciones: { dias: number; limite: number; ahora: Date },
): Promise<UsoMentor> {
  const { dias, limite, ahora } = opciones;
  // Ventana: `dias` días UTC, hoy incluido.
  const hoy = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
  const primerDia = new Date(hoy.getTime() - (dias - 1) * 86_400_000);
  const desde = aIso(primerDia);
  const hasta = aIso(ahora);
  const periodo = 'created_at >= ? AND created_at <= ?';

  const totales = await primera<FilaUso & { usuarios: number }>(
    db,
    `SELECT ${SUMAS_USO}, COUNT(DISTINCT user_id) AS usuarios FROM usage_events WHERE ${periodo}`,
    desde,
    hasta,
  );
  const usoTotal = usoDeFila(totales ?? { consultas: 0, t_in: 0, t_out: 0, c_read: 0, c_write: 0 });

  const porDia = await todas<FilaUso & { dia: string }>(
    db,
    `SELECT ${DIA_UTC} AS dia, ${SUMAS_USO} FROM usage_events WHERE ${periodo} GROUP BY ${DIA_UTC}`,
    desde,
    hasta,
  );
  const diasPorFecha = new Map(porDia.map((f) => [f.dia, f]));
  const diasVentana: UsoMentor['por_dia'] = [];
  for (let i = 0; i < dias; i++) {
    const fecha = new Date(primerDia.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    const f = diasPorFecha.get(fecha);
    const u = f ? usoDeFila(f) : null;
    diasVentana.push({
      fecha,
      consultas: u?.consultas ?? 0,
      tokens_entrada: u?.entrada ?? 0,
      tokens_salida: u?.salida ?? 0,
      costo_estimado_usd: u ? costoEstimado(precios, u) : 0,
    });
  }

  const porDiaModelo = await todas<FilaUso & { dia: string; modelo: string }>(
    db,
    `SELECT ${DIA_UTC} AS dia, model AS modelo, ${SUMAS_USO}
     FROM usage_events WHERE ${periodo}
     GROUP BY ${DIA_UTC}, model ORDER BY ${DIA_UTC}, model`,
    desde,
    hasta,
  );

  const porModelo = await todas<FilaUso & { modelo: string }>(
    db,
    `SELECT model AS modelo, ${SUMAS_USO}
     FROM usage_events WHERE ${periodo}
     GROUP BY model ORDER BY COUNT(*) DESC, model`,
    desde,
    hasta,
  );

  // Consumo por usuario, ordenado por costo estimado (misma fórmula que `costoEstimado`).
  const topFilas = await todas<FilaUso & { user_id: number; nombre: string; apellido: string }>(
    db,
    `SELECT u.id AS user_id, u.nombre AS nombre, u.apellido AS apellido, ${SUMAS_USO}
     FROM usage_events ue JOIN users u ON u.id = ue.user_id
     WHERE ue.created_at >= ? AND ue.created_at <= ?
     GROUP BY u.id, u.nombre, u.apellido
     ORDER BY (SUM(ue.input_tokens) * ? + SUM(ue.output_tokens) * ? + SUM(ue.cache_read_tokens) * ? + SUM(ue.cache_creation_tokens) * ?) DESC,
              COUNT(*) DESC, u.id ASC
     LIMIT ?`,
    desde,
    hasta,
    precios.entrada,
    precios.salida,
    precios.entrada * FACTOR_CACHE_LECTURA,
    precios.entrada * FACTOR_CACHE_ESCRITURA,
    limite,
  );

  return {
    desde,
    hasta,
    dias,
    precios: {
      moneda: 'USD',
      entrada_usd_por_mtok: precios.entrada,
      salida_usd_por_mtok: precios.salida,
      cache_lectura_factor: FACTOR_CACHE_LECTURA,
      cache_escritura_factor: FACTOR_CACHE_ESCRITURA,
      nota: NOTA_PRECIOS,
    },
    totales: {
      consultas: usoTotal.consultas,
      usuarios: aEntero(totales?.usuarios),
      tokens_entrada: usoTotal.entrada,
      tokens_salida: usoTotal.salida,
      tokens_cache_lectura: usoTotal.cacheLectura,
      tokens_cache_escritura: usoTotal.cacheEscritura,
      costo_estimado_usd: costoEstimado(precios, usoTotal),
    },
    por_dia: diasVentana,
    por_dia_modelo: porDiaModelo.map((f) => {
      const u = usoDeFila(f);
      return {
        fecha: f.dia,
        modelo: f.modelo,
        consultas: u.consultas,
        tokens_entrada: u.entrada,
        tokens_salida: u.salida,
        costo_estimado_usd: costoEstimado(precios, u),
      };
    }),
    por_modelo: porModelo.map((f) => {
      const u = usoDeFila(f);
      return {
        modelo: f.modelo,
        consultas: u.consultas,
        tokens_entrada: u.entrada,
        tokens_salida: u.salida,
        tokens_cache_lectura: u.cacheLectura,
        tokens_cache_escritura: u.cacheEscritura,
        costo_estimado_usd: costoEstimado(precios, u),
      };
    }),
    top_usuarios: topFilas.map((f) => {
      const u = usoDeFila(f);
      return {
        user_id: aEntero(f.user_id),
        nombre: f.nombre,
        apellido: f.apellido,
        consultas: u.consultas,
        tokens_entrada: u.entrada,
        tokens_salida: u.salida,
        costo_estimado_usd: costoEstimado(precios, u),
      };
    }),
  };
}

// --- Exportación CSV ---------------------------------------------------------------------------

/** Celda CSV: protege contra inyección de fórmulas y escapa como lo hace Python `csv` (RFC 4180). */
export function celdaCsv(valor: unknown): string {
  let texto = valor === null || valor === undefined ? '' : String(valor);
  if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(valor)) texto = `'${valor}`;
  if (/[",\r\n]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

function lineaCsv(celdas: unknown[]): string {
  return `${celdas.map(celdaCsv).join(',')}\r\n`;
}

interface FilaEstudianteCsv {
  id: number;
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  nivel: string;
}

/**
 * CSV de progreso en streaming: UTF-8 con BOM (Excel), CRLF, una fila por estudiante y módulo.
 * Recorre a los estudiantes en lotes de `LOTE_CSV` por `id`; cada lote hace consultas por rango de
 * `user_id` (ver el encabezado del archivo).
 */
export function csvProgreso(db: D1Database, enmascarar: boolean): ReadableStream<Uint8Array> {
  const codificador = new TextEncoder();
  let ultimoId = 0;
  let terminado = false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(codificador.encode(`\uFEFF${lineaCsv([...COLUMNAS_CSV])}`));
    },
    async pull(controller) {
      if (terminado) {
        controller.close();
        return;
      }
      const lote = await todas<FilaEstudianteCsv>(
        db,
        `SELECT id, nombre, apellido, tipo_identificacion, numero_identificacion, nivel
         FROM users WHERE rol = 'estudiante' AND id > ? ORDER BY id LIMIT ?`,
        ultimoId,
        LOTE_CSV,
      );
      if (lote.length === 0) {
        terminado = true;
        controller.close();
        return;
      }
      // El lote cubre a TODOS los estudiantes con id en (desde, hasta]: el rango es exacto.
      const desde = ultimoId;
      const hasta = aEntero(lote[lote.length - 1]?.id);
      ultimoId = hasta;

      const progreso = await todas<{
        user_id: number;
        modulo: number;
        seccion_actual: string | null;
        completado: number;
        tiempo_total_seg: number;
        updated_at: string;
      }>(
        db,
        `SELECT user_id, modulo, seccion_actual, completado, tiempo_total_seg, updated_at
         FROM progress_modulos WHERE user_id > ? AND user_id <= ?`,
        desde,
        hasta,
      );
      const porClave = new Map(progreso.map((f) => [`${f.user_id}:${f.modulo}`, f]));

      const puntajes = await todas<{ user_id: number; modulo: number; puntaje: number; completadas: number }>(
        db,
        `SELECT user_id, modulo, SUM(mejor) AS puntaje, COUNT(*) AS completadas FROM (
           SELECT user_id, activity_id, MIN(modulo) AS modulo, MAX(puntaje) AS mejor
           FROM activity_results
           WHERE completada = 1 AND user_id > ? AND user_id <= ?
           GROUP BY user_id, activity_id
         ) GROUP BY user_id, modulo`,
        desde,
        hasta,
      );
      const puntajePorClave = new Map(
        puntajes.map((f) => [
          `${f.user_id}:${f.modulo}`,
          { puntaje: aEntero(f.puntaje), completadas: aEntero(f.completadas) },
        ]),
      );

      const lineas: string[] = [];
      for (const estudiante of lote) {
        const id = aEntero(estudiante.id);
        const numero = enmascarar
          ? enmascararIdentificacion(estudiante.numero_identificacion)
          : estudiante.numero_identificacion;
        let total = 0;
        for (let modulo = 1; modulo <= MODULE_COUNT; modulo++) {
          total += puntajePorClave.get(`${id}:${modulo}`)?.puntaje ?? 0;
        }
        for (let modulo = 1; modulo <= MODULE_COUNT; modulo++) {
          const fila = porClave.get(`${id}:${modulo}`);
          const puntos = puntajePorClave.get(`${id}:${modulo}`);
          lineas.push(
            lineaCsv([
              id,
              estudiante.nombre,
              estudiante.apellido,
              estudiante.tipo_identificacion,
              numero,
              estudiante.nivel,
              modulo,
              fila && aEntero(fila.completado) === 1 ? 'si' : 'no',
              fila?.seccion_actual ?? '',
              fila ? aEntero(fila.tiempo_total_seg) : 0,
              puntos?.puntaje ?? 0,
              puntos?.completadas ?? 0,
              fila?.updated_at ?? '',
              total,
            ]),
          );
        }
      }
      controller.enqueue(codificador.encode(lineas.join('')));
    },
  });
}
