/** Constantes de dominio (equivalen a services/api/app/core/constants.py). */

export const VERSION = '0.1.0';

/** Cantidad de módulos temáticos del OVA (docs/api-contract.md: siempre 6, numerados 1..6). */
export const MODULE_COUNT = 6;

export const MAX_SECTION_LENGTH = 64;
export const MAX_TIME_DELTA_SECONDS = 3600;
export const MAX_ACTIVITY_SCORE = 1000;
export const MAX_ACTIVITY_ATTEMPTS = 100;
export const MAX_ACTIVITY_DETAIL_BYTES = 4 * 1024;

/** Formato del identificador de actividad, p. ej. `m1_capas_hueso`. */
export const ACTIVITY_ID_PATTERN = /^[a-z0-9_-]{1,64}$/;

export const CHAT_HISTORY_DEFAULT_LIMIT = 50;
export const CHAT_HISTORY_MAX_LIMIT = 100;

/** El «día» del límite diario del mentor es el calendario de Colombia (UTC-5), como el certificado. */
export const CHAT_DAY_UTC_OFFSET_HOURS = -5;
export const CERT_UTC_OFFSET_HOURS = -5;

export const TIPOS_IDENTIFICACION = ['CC', 'TI', 'CE', 'PA', 'RC', 'PEP', 'PPT'] as const;
export type TipoIdentificacion = (typeof TIPOS_IDENTIFICACION)[number];

export const NIVELES = ['pregrado', 'posgrado'] as const;
export type Nivel = (typeof NIVELES)[number];

export const ROLES = ['estudiante', 'docente'] as const;
export type Rol = (typeof ROLES)[number];

export const TIPOS_ACTIVIDAD = [
  'multicapa',
  'arrastre-molecular',
  'relacion-columnas',
  'quiz',
  'video-texto',
  'exploracion-3d',
  'clasificacion',
  'curva-esfuerzo',
] as const;
export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

/** Títulos de los módulos, para el certificado. Deben coincidir con apps/web/src/data/modulos.ts. */
export const MODULE_TITLES: Record<number, string> = {
  1: 'Conociendo el hueso',
  2: 'Descubriendo sus células',
  3: 'Construyendo hueso',
  4: 'Transformando la matriz',
  5: 'Renovando el hueso',
  6: 'El paso del tiempo',
};

/** Nombre del OVA impreso en el certificado. */
export const OVA_TITLE = 'Metabolismo óseo: un viaje interactivo desde la célula hasta el hueso';
