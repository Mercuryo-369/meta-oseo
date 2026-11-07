/**
 * Certificado de finalización (F5-05): elegibilidad, emisión idempotente y verificación pública
 * (equivale a app/services/certificate.py). Las reglas y los textos de los motivos son los del
 * servidor Python; ver docs/api-contract.md, "Certificado (F5-05)".
 */
import type { Usuario } from '../core/auth';
import { MODULE_COUNT } from '../core/constantes';
import { aEntero, primera, todas } from '../core/db';
import type { Configuracion } from '../core/entorno';
import { certificadoNoElegible } from '../core/errores';
import { enmascararIdentificacion } from '../core/texto';
import { ahora } from '../core/tiempo';
import { manifiesto } from './manifiesto';
import { puntajeTotal } from './progreso';

/** Alfabeto sin 0/O ni 1/I/L: se confunden al leer o dictar el código. */
export const ALFABETO_CODIGO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const GRUPO_CODIGO = 4;
const MAX_INTENTOS_CODIGO = 8;
const PATRON_CODIGO = new RegExp(`^OVA-[${ALFABETO_CODIGO}]{4}-[${ALFABETO_CODIGO}]{4}$`);

/** Certificado tal como está en D1 (los puntajes pueden ser null en filas antiguas). */
export interface Certificado {
  id: number;
  user_id: number;
  codigo: string;
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  puntaje_total: number;
  puntaje_obligatorias: number | null;
  puntaje_maximo: number | null;
  created_at: string;
}

/** Resumen del certificado emitido (sin datos personales). */
export interface ResumenCertificado {
  codigo: string;
  emitido_en: string;
  puntaje_total: number;
  puntaje_obligatorias: number | null;
  puntaje_maximo: number | null;
  porcentaje: number | null;
}

/** Evaluación de elegibilidad. Con manifiesto (siempre en el Worker) los campos del puntaje no son null. */
export interface Elegibilidad {
  elegible: boolean;
  modulos_completados: number[];
  modulos_pendientes: number[];
  puntaje_total: number;
  puntaje_obligatorias: number;
  puntaje_maximo: number;
  porcentaje: number;
  umbral: number;
  puntos_faltantes: number;
  motivos: string[];
}

export interface EstadoCertificado extends Elegibilidad {
  emitido: boolean;
  certificado: ResumenCertificado | null;
}

interface FilaCertificado {
  id: number;
  user_id: number;
  codigo: string;
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  puntaje_total: number;
  puntaje_obligatorias: number | null;
  puntaje_maximo: number | null;
  created_at: string;
}

function certificadoDeFila(fila: FilaCertificado): Certificado {
  return {
    id: aEntero(fila.id),
    user_id: aEntero(fila.user_id),
    codigo: fila.codigo,
    nombre: fila.nombre,
    apellido: fila.apellido,
    tipo_identificacion: fila.tipo_identificacion,
    numero_identificacion: fila.numero_identificacion,
    puntaje_total: aEntero(fila.puntaje_total),
    // Filas antiguas pueden no traer puntajes (sin manifiesto cuando se emitieron): se respeta el null.
    puntaje_obligatorias: fila.puntaje_obligatorias === null ? null : aEntero(fila.puntaje_obligatorias),
    puntaje_maximo: fila.puntaje_maximo === null ? null : aEntero(fila.puntaje_maximo),
    created_at: fila.created_at,
  };
}

/** Código aleatorio legible, `OVA-XXXX-XXXX` (8 caracteres de 31: unos 40 bits). */
export function generarCodigo(): string {
  const grupos: string[] = [];
  for (let g = 0; g < 2; g++) {
    let grupo = '';
    while (grupo.length < GRUPO_CODIGO) {
      const lote = new Uint8Array(GRUPO_CODIGO * 2);
      crypto.getRandomValues(lote);
      for (const byte of lote) {
        // Se descartan los bytes >= 248 (= 31 * 8) para que cada carácter sea equiprobable.
        if (byte < 248 && grupo.length < GRUPO_CODIGO) grupo += ALFABETO_CODIGO[byte % 31];
      }
    }
    grupos.push(grupo);
  }
  return `OVA-${grupos.join('-')}`;
}

/** Código canónico, o `null` si no tiene el formato (tolera minúsculas y espacios). */
export function normalizarCodigo(crudo: string): string | null {
  const candidato = crudo.trim().toUpperCase();
  return PATRON_CODIGO.test(candidato) ? candidato : null;
}

/**
 * Porcentaje con un decimal, TRUNCADO (69,96 no debe mostrarse como 70,0 sin llegar a 70).
 * `null` si falta alguno de los dos valores; 100 si el máximo no es positivo.
 */
export function porcentaje(puntaje: number | null, maximo: number | null): number | null {
  if (puntaje === null || maximo === null) return null;
  if (maximo <= 0) return 100;
  return Math.floor((puntaje * 1000) / maximo) / 10;
}

/** `69.7` -> `"69,7"`: decimal con coma, como en los textos de la API. */
function formatearPorcentaje(valor: number): string {
  return valor.toFixed(1).replace('.', ',');
}

/** `[1]` -> `1`; `[1, 2, 3]` -> `1, 2 y 3`. */
function listaEspanola(numeros: number[]): string {
  const textos = numeros.map(String);
  if (textos.length === 1) return textos[0] ?? '';
  return `${textos.slice(0, -1).join(', ')} y ${textos[textos.length - 1]}`;
}

/**
 * Puntaje del usuario en las actividades OBLIGATORIAS: por actividad, su mejor intento completado
 * y como mucho su `puntaje_max`. Una actividad opcional no compensa una obligatoria mal resuelta.
 */
export async function puntajeObligatorias(db: D1Database, userId: number): Promise<number> {
  const requeridas = new Map<string, number>();
  for (const [id, spec] of manifiesto.actividades) {
    if (spec.obligatoria) requeridas.set(id, spec.puntaje_max);
  }
  if (requeridas.size === 0) return 0;
  // Se filtra en JS y no con `IN (...)`: D1 limita el número de parámetros por consulta.
  const filas = await todas<{ activity_id: string; mejor: number }>(
    db,
    'SELECT activity_id, MAX(puntaje) AS mejor FROM activity_results WHERE user_id = ? AND completada = 1 GROUP BY activity_id',
    userId,
  );
  let total = 0;
  for (const fila of filas) {
    const maximo = requeridas.get(fila.activity_id);
    if (maximo !== undefined) total += Math.min(aEntero(fila.mejor), maximo);
  }
  return total;
}

/** Reglas de elegibilidad con los motivos en español. */
export async function evaluarElegibilidad(
  db: D1Database,
  userId: number,
  config: Configuracion,
): Promise<Elegibilidad> {
  const completados = (
    await todas<{ modulo: number }>(
      db,
      'SELECT modulo FROM progress_modulos WHERE user_id = ? AND completado = 1',
      userId,
    )
  )
    .map((f) => aEntero(f.modulo))
    .filter((n) => n >= 1 && n <= MODULE_COUNT)
    .sort((a, b) => a - b);
  const pendientes: number[] = [];
  for (let n = 1; n <= MODULE_COUNT; n++) if (!completados.includes(n)) pendientes.push(n);

  const motivos: string[] = [];
  if (pendientes.length > 0) {
    motivos.push(
      pendientes.length === 1
        ? `Falta completar el módulo ${pendientes[0]}.`
        : `Faltan por completar los módulos ${listaEspanola(pendientes)}.`,
    );
  }

  const obtenido = await puntajeObligatorias(db, userId);
  const maximo = manifiesto.maxRequiredScore();
  const pct = porcentaje(obtenido, maximo) ?? 0;
  const umbral = config.certMinPorcentaje;
  // Aritmética entera: sin errores de redondeo en el borde del umbral.
  const necesarios = Math.ceil((umbral * maximo) / 100);
  const faltantes = Math.max(0, necesarios - obtenido);
  if (faltantes > 0) {
    motivos.push(
      `Tu puntaje en las actividades obligatorias es ${formatearPorcentaje(pct)} % y se necesita al menos ${umbral} %: te faltan ${faltantes} puntos.`,
    );
  }

  return {
    elegible: motivos.length === 0,
    modulos_completados: completados,
    modulos_pendientes: pendientes,
    puntaje_total: await puntajeTotal(db, userId),
    puntaje_obligatorias: obtenido,
    puntaje_maximo: maximo,
    porcentaje: pct,
    umbral,
    puntos_faltantes: faltantes,
    motivos,
  };
}

export function resumen(certificado: Certificado): ResumenCertificado {
  return {
    codigo: certificado.codigo,
    emitido_en: certificado.created_at,
    puntaje_total: certificado.puntaje_total,
    puntaje_obligatorias: certificado.puntaje_obligatorias,
    puntaje_maximo: certificado.puntaje_maximo,
    porcentaje: porcentaje(certificado.puntaje_obligatorias, certificado.puntaje_maximo),
  };
}

export async function certificadoDeUsuario(db: D1Database, userId: number): Promise<Certificado | null> {
  const fila = await primera<FilaCertificado>(db, 'SELECT * FROM certificates WHERE user_id = ?', userId);
  return fila ? certificadoDeFila(fila) : null;
}

async function certificadoPorId(db: D1Database, id: number): Promise<Certificado | null> {
  const fila = await primera<FilaCertificado>(db, 'SELECT * FROM certificates WHERE id = ?', id);
  return fila ? certificadoDeFila(fila) : null;
}

/** Certificado por código de verificación (público). `null` si no existe o el formato falla. */
export async function buscarPorCodigo(db: D1Database, crudo: string): Promise<Certificado | null> {
  const codigo = normalizarCodigo(crudo);
  if (codigo === null) return null;
  const fila = await primera<FilaCertificado>(db, 'SELECT * FROM certificates WHERE codigo = ?', codigo);
  return fila ? certificadoDeFila(fila) : null;
}

export async function estadoCertificado(
  db: D1Database,
  userId: number,
  config: Configuracion,
): Promise<EstadoCertificado> {
  const elegibilidad = await evaluarElegibilidad(db, userId, config);
  const existente = await certificadoDeUsuario(db, userId);
  return {
    ...elegibilidad,
    emitido: existente !== null,
    certificado: existente ? resumen(existente) : null,
  };
}

/**
 * Emite el certificado del usuario. Devuelve `{certificado, nuevo}`.
 *
 * Idempotente: si ya tiene uno lo devuelve (aunque hoy ya no fuera elegible: no se revoca). Sin
 * requisitos, 409 `certificado_no_elegible`. La emisión es un único `INSERT ... ON CONFLICT DO
 * NOTHING`: D1 no tiene transacciones interactivas, y el índice único de `user_id` decide quién
 * gana si dos peticiones llegan a la vez.
 */
export async function emitirCertificado(
  db: D1Database,
  usuario: Usuario,
  config: Configuracion,
): Promise<{ certificado: Certificado; nuevo: boolean }> {
  const existente = await certificadoDeUsuario(db, usuario.id);
  if (existente) return { certificado: existente, nuevo: false };

  const elegibilidad = await evaluarElegibilidad(db, usuario.id, config);
  if (!elegibilidad.elegible) throw certificadoNoElegible(elegibilidad.motivos);

  for (let intento = 0; intento < MAX_INTENTOS_CODIGO; intento++) {
    // Sin columna de conflicto: cubre el choque de `user_id` y, si ocurre, el de `codigo`.
    const insertada = await primera<{ id: number }>(
      db,
      `INSERT INTO certificates (user_id, codigo, nombre, apellido, tipo_identificacion, numero_identificacion,
         puntaje_total, puntaje_obligatorias, puntaje_maximo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      usuario.id,
      generarCodigo(),
      usuario.nombre,
      usuario.apellido,
      usuario.tipo_identificacion,
      usuario.numero_identificacion,
      elegibilidad.puntaje_total,
      elegibilidad.puntaje_obligatorias,
      elegibilidad.puntaje_maximo,
      ahora(),
    );
    if (insertada) {
      const certificado = await certificadoPorId(db, aEntero(insertada.id));
      if (certificado) return { certificado, nuevo: true };
    }
    // Otra petición se adelantó (user_id) o el código chocó: si ya hay certificado, es ese.
    const ganador = await certificadoDeUsuario(db, usuario.id);
    if (ganador) return { certificado: ganador, nuevo: false };
  }
  throw new Error('No se pudo generar un código de verificación único.');
}

/** Lo que la verificación pública muestra: la identificación solo con sus últimos 3 caracteres. */
export function datosVerificacion(certificado: Certificado): {
  codigo: string;
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  identificacion_enmascarada: string;
  emitido_en: string;
  puntaje_total: number;
  porcentaje: number | null;
} {
  return {
    codigo: certificado.codigo,
    nombre: certificado.nombre,
    apellido: certificado.apellido,
    tipo_identificacion: certificado.tipo_identificacion,
    identificacion_enmascarada: enmascararIdentificacion(certificado.numero_identificacion),
    emitido_en: certificado.created_at,
    puntaje_total: certificado.puntaje_total,
    porcentaje: porcentaje(certificado.puntaje_obligatorias, certificado.puntaje_maximo),
  };
}
