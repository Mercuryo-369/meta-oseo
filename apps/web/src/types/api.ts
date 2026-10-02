/**
 * Tipos de las respuestas de la API. Reflejan docs/api-contract.md, que es la fuente
 * de verdad: cualquier cambio aquí exige cambiarlo allí y en services/api.
 */
import type { TipoActividad } from '@/content/schema';
import type { TipoIdentificacion } from '@/lib/identificacion';

export type Nivel = 'pregrado' | 'posgrado';
export type Rol = 'estudiante' | 'docente';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  tipo_identificacion: TipoIdentificacion;
  numero_identificacion: string;
  nivel: Nivel;
  rol: Rol;
  /** ISO 8601 en UTC con sufijo Z. */
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
  /** Segundos hasta que expira el token. */
  expires_in: number;
  user: Usuario;
}

export interface LoginPayload {
  tipo_identificacion: TipoIdentificacion;
  numero_identificacion: string;
}

export interface RegistroPayload extends LoginPayload {
  nombre: string;
  apellido: string;
}

export interface ModuloProgress {
  /** 1 a 6. */
  modulo: number;
  seccion_actual: string | null;
  completado: boolean;
  tiempo_total_seg: number;
  updated_at: string | null;
}

export interface ProgresoResponse {
  /** Siempre 6 elementos (módulos 1 a 6). */
  modulos: ModuloProgress[];
  puntaje_total: number;
  /** Códigos de los logros obtenidos. */
  logros: string[];
}

export interface Logro {
  codigo: string;
  nombre: string;
  descripcion: string;
  obtenido: boolean;
  obtenido_en: string | null;
}

export interface LogrosResponse {
  logros: Logro[];
}

/* -------------------------------------------------------------------------------------------
 * Actividades y progreso por módulo (docs/api-contract.md, "Actividades y puntaje")
 * ----------------------------------------------------------------------------------------- */

/** Fila de `GET /api/activities/results`: una por `activity_id` del usuario autenticado. */
export interface ResultadoActividadFila {
  activity_id: string;
  modulo: number;
  tipo: TipoActividad;
  /** Mayor puntaje entre los intentos completados (0 si ninguno). */
  mejor_puntaje: number;
  /** Mayor número de intento reportado. */
  intentos: number;
  completada: boolean;
  ultimo_intento_en: string | null;
  /** Aún no lo devuelve el servidor (docs/content-schema.md, sección 14): opcional. */
  mejor_precision?: number | null;
}

export interface ResultadosResponse {
  resultados: ResultadoActividadFila[];
}

/** Respuesta de `POST /api/activities/{id}/result`. */
export interface RespuestaResultadoActividad {
  resultado: {
    activity_id: string;
    modulo: number;
    tipo: TipoActividad;
    puntaje: number;
    intentos: number;
    completada: boolean;
    created_at: string;
  };
  puntaje_total: number;
  logros_nuevos: string[];
}

/** Cuerpo de `PUT /api/progress/{modulo}`: todos los campos son opcionales. */
export interface CuerpoProgresoModulo {
  seccion_actual?: string;
  /** 0 a 3600; se suma a `tiempo_total_seg`. */
  tiempo_delta_seg?: number;
  completado?: boolean;
}

/** Respuesta de `PUT /api/progress/{modulo}`. */
export interface RespuestaProgresoModulo {
  modulo: ModuloProgress;
  logros_nuevos: string[];
}

/* -------------------------------------------------------------------------------------------
 * Certificado (docs/api-contract.md, "Certificado (F5-05)")
 * ----------------------------------------------------------------------------------------- */

/** Resumen del certificado emitido (`certificado` de `/status` y de `POST /api/certificate`). */
export interface CertificadoResumen {
  /** `OVA-XXXX-XXXX`. */
  codigo: string;
  emitido_en: string;
  puntaje_total: number;
  /** `null` si el certificado se emitió sin manifiesto de actividades. */
  puntaje_obligatorias: number | null;
  puntaje_maximo: number | null;
  porcentaje: number | null;
}

/** `GET /api/certificate/status`. Los campos de puntaje son `null` sin manifiesto. */
export interface CertificadoEstado {
  elegible: boolean;
  emitido: boolean;
  modulos_completados: number[];
  modulos_pendientes: number[];
  puntaje_total: number;
  puntaje_obligatorias: number | null;
  puntaje_maximo: number | null;
  porcentaje: number | null;
  umbral: number | null;
  puntos_faltantes: number | null;
  /** Textos en español de lo que impide emitirlo. */
  motivos: string[];
  certificado: CertificadoResumen | null;
}

/** `POST /api/certificate`: 201 (`nuevo: true`) al emitirlo, 200 (`nuevo: false`) si ya existía. */
export interface CertificadoEmitido {
  certificado: CertificadoResumen;
  nuevo: boolean;
}

/** `GET /api/verify/{codigo}` (público). La identificación llega enmascarada por el servidor. */
export interface CertificadoVerificado {
  valido: boolean;
  codigo: string;
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  identificacion_enmascarada: string;
  emitido_en: string;
  puntaje_total: number;
  /** `null` si el certificado se emitió sin manifiesto. */
  porcentaje: number | null;
}

/* -------------------------------------------------------------------------------------------
 * Panel del docente (docs/api-contract.md, sección "Docente")
 * ----------------------------------------------------------------------------------------- */

export interface DocenteModulosCompletados {
  /** 0 a 6. */
  modulos_completados: number;
  estudiantes: number;
}

export interface DocenteTiempoModulo {
  modulo: number;
  /** `null` si ningún estudiante tiene progreso en ese módulo. */
  tiempo_promedio_seg: number | null;
  estudiantes: number;
}

/** `GET /api/teacher/overview`. */
export interface DocenteOverview {
  generado_en: string;
  estudiantes: number;
  activos_7d: number;
  activos_30d: number;
  /** Siempre 7 elementos (0 a 6 módulos completados). */
  modulos_completados: DocenteModulosCompletados[];
  /** Siempre 6 elementos. */
  tiempo_por_modulo: DocenteTiempoModulo[];
  /** `promedio` y `mediana` son `null` si no hay estudiantes. */
  puntaje: { promedio: number | null; mediana: number | null };
}

export type DocenteOrdenEstudiantes = 'nombre' | 'puntaje' | 'ultima_actividad';

export interface DocenteEstudianteResumen {
  id: number;
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  /** Enmascarado (últimos 3 caracteres) salvo en una búsqueda exacta por número. */
  numero_identificacion: string;
  identificacion_completa: boolean;
  nivel: Nivel;
  modulos_completados: number;
  puntaje_total: number;
  ultima_actividad: string | null;
  tiempo_total_seg: number;
}

/** `GET /api/teacher/students`. */
export interface DocenteEstudiantesPagina {
  estudiantes: DocenteEstudianteResumen[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface DocenteEstudianteModulo {
  modulo: number;
  seccion_actual: string | null;
  completado: boolean;
  tiempo_total_seg: number;
  updated_at: string | null;
}

export interface DocenteEstudianteActividad {
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

export interface DocenteEstudianteMentor {
  consultas: number;
  tokens_entrada: number;
  tokens_salida: number;
  tokens_cache_lectura: number;
  tokens_cache_escritura: number;
  costo_estimado_usd: number;
  ultima_consulta: string | null;
}

/** `GET /api/teacher/students/{id}` (la identificación siempre viene enmascarada). */
export interface DocenteEstudianteDetalle {
  id: number;
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  identificacion_completa: boolean;
  nivel: Nivel;
  created_at: string;
  modulos_completados: number;
  puntaje_total: number;
  tiempo_total_seg: number;
  ultima_actividad: string | null;
  progreso: DocenteEstudianteModulo[];
  actividades: DocenteEstudianteActividad[];
  mentor: DocenteEstudianteMentor;
}

export interface DocenteActividadStat {
  activity_id: string;
  modulo: number;
  tipo: string;
  estudiantes_intentaron: number;
  estudiantes_completaron: number;
  /** Proporción de 0 a 1; `null` si nadie la intentó. */
  tasa_finalizacion: number | null;
  intentos_promedio: number | null;
  puntaje_promedio: number | null;
}

export interface DocenteModuloActividadStat {
  modulo: number;
  actividades: number;
  estudiantes_intentaron: number;
  tasa_finalizacion: number | null;
  intentos_promedio: number | null;
  puntaje_promedio: number | null;
}

/** `GET /api/teacher/activities/stats`. */
export interface DocenteActividadesStats {
  actividades: DocenteActividadStat[];
  /** Siempre los 6 módulos. */
  por_modulo: DocenteModuloActividadStat[];
  mas_dificiles: DocenteActividadStat[];
}

export interface DocentePreciosMentor {
  moneda: string;
  entrada_usd_por_mtok: number;
  salida_usd_por_mtok: number;
  cache_lectura_factor: number;
  cache_escritura_factor: number;
  nota: string;
}

export interface DocenteMentorTotales {
  consultas: number;
  usuarios: number;
  tokens_entrada: number;
  tokens_salida: number;
  tokens_cache_lectura: number;
  tokens_cache_escritura: number;
  costo_estimado_usd: number;
}

export interface DocenteMentorDia {
  /** AAAA-MM-DD (UTC). */
  fecha: string;
  consultas: number;
  tokens_entrada: number;
  tokens_salida: number;
  costo_estimado_usd: number;
}

export interface DocenteMentorDiaModelo {
  fecha: string;
  modelo: string;
  consultas: number;
  tokens_entrada: number;
  tokens_salida: number;
  costo_estimado_usd: number;
}

export interface DocenteMentorModelo {
  modelo: string;
  consultas: number;
  tokens_entrada: number;
  tokens_salida: number;
  tokens_cache_lectura: number;
  tokens_cache_escritura: number;
  costo_estimado_usd: number;
}

export interface DocenteMentorTopUsuario {
  user_id: number;
  nombre: string;
  apellido: string;
  consultas: number;
  tokens_entrada: number;
  tokens_salida: number;
  costo_estimado_usd: number;
}

/** `GET /api/teacher/mentor/usage`. */
export interface DocenteMentorUso {
  desde: string;
  hasta: string;
  dias: number;
  precios: DocentePreciosMentor;
  totales: DocenteMentorTotales;
  /** Todos los días de la ventana, con ceros. */
  por_dia: DocenteMentorDia[];
  por_dia_modelo: DocenteMentorDiaModelo[];
  por_modelo: DocenteMentorModelo[];
  top_usuarios: DocenteMentorTopUsuario[];
}
