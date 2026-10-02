/** Datos de ejemplo del panel del docente (forma de docs/api-contract.md, sección "Docente"). */
import type {
  DocenteActividadesStats,
  DocenteEstudianteDetalle,
  DocenteEstudiantesPagina,
  DocenteMentorUso,
  DocenteOverview,
} from '@/types/api';

export const RESUMEN: DocenteOverview = {
  generado_en: '2026-09-24T15:00:00Z',
  estudiantes: 5,
  activos_7d: 2,
  activos_30d: 4,
  modulos_completados: [
    { modulos_completados: 0, estudiantes: 2 },
    { modulos_completados: 1, estudiantes: 1 },
    { modulos_completados: 2, estudiantes: 1 },
    { modulos_completados: 3, estudiantes: 0 },
    { modulos_completados: 4, estudiantes: 0 },
    { modulos_completados: 5, estudiantes: 0 },
    { modulos_completados: 6, estudiantes: 1 },
  ],
  tiempo_por_modulo: [
    { modulo: 1, tiempo_promedio_seg: 367, estudiantes: 3 },
    { modulo: 2, tiempo_promedio_seg: 3900, estudiantes: 2 },
    { modulo: 3, tiempo_promedio_seg: 45, estudiantes: 1 },
    { modulo: 4, tiempo_promedio_seg: null, estudiantes: 0 },
    { modulo: 5, tiempo_promedio_seg: null, estudiantes: 0 },
    { modulo: 6, tiempo_promedio_seg: null, estudiantes: 0 },
  ],
  puntaje: { promedio: 124, mediana: 60.5 },
};

export const RESUMEN_VACIO: DocenteOverview = {
  ...RESUMEN,
  estudiantes: 0,
  activos_7d: 0,
  activos_30d: 0,
  puntaje: { promedio: null, mediana: null },
};

export function estudiante(id: number, nombre: string, apellido: string, extra = {}) {
  return {
    id,
    nombre,
    apellido,
    tipo_identificacion: 'CC',
    numero_identificacion: '*******789',
    identificacion_completa: false,
    nivel: 'pregrado' as const,
    modulos_completados: 2,
    puntaje_total: 260,
    ultima_actividad: '2026-09-24T14:00:00Z',
    tiempo_total_seg: 1000,
    ...extra,
  };
}

export const PAGINA_1: DocenteEstudiantesPagina = {
  estudiantes: [
    estudiante(2, 'Ana', 'Pérez'),
    estudiante(3, 'Luis', 'Gómez', { ultima_actividad: null }),
  ],
  page: 1,
  page_size: 25,
  total: 30,
  total_pages: 2,
};

export const PAGINA_2: DocenteEstudiantesPagina = {
  estudiantes: [estudiante(9, 'Zoraida', 'Vega')],
  page: 2,
  page_size: 25,
  total: 30,
  total_pages: 2,
};

export const PAGINA_BUSQUEDA_EXACTA: DocenteEstudiantesPagina = {
  estudiantes: [
    estudiante(2, 'Ana', 'Pérez', {
      numero_identificacion: '1023456789',
      identificacion_completa: true,
    }),
  ],
  page: 1,
  page_size: 25,
  total: 1,
  total_pages: 1,
};

export const PAGINA_SIN_RESULTADOS: DocenteEstudiantesPagina = {
  estudiantes: [],
  page: 1,
  page_size: 25,
  total: 0,
  total_pages: 1,
};

export const DETALLE: DocenteEstudianteDetalle = {
  id: 2,
  nombre: 'Ana',
  apellido: 'Pérez',
  tipo_identificacion: 'CC',
  numero_identificacion: '*******789',
  identificacion_completa: false,
  nivel: 'pregrado',
  created_at: '2026-09-01T10:00:00Z',
  modulos_completados: 2,
  puntaje_total: 260,
  tiempo_total_seg: 1000,
  ultima_actividad: '2026-09-24T14:00:00Z',
  progreso: Array.from({ length: 6 }, (_, i) => ({
    modulo: i + 1,
    seccion_actual: i === 0 ? 'm1_s3' : null,
    completado: i < 2,
    tiempo_total_seg: i < 2 ? 500 : 0,
    updated_at: i < 2 ? '2026-09-20T10:00:00Z' : null,
  })),
  actividades: [
    {
      activity_id: 'm1_relacionar_funciones',
      modulo: 1,
      tipo: 'relacion_columnas',
      mejor_puntaje: 80,
      puntaje_contabilizado: 80,
      intentos: 2,
      registros: 2,
      completada: true,
      ultimo_intento: '2026-09-20T10:00:00Z',
    },
  ],
  mentor: {
    consultas: 3,
    tokens_entrada: 1200,
    tokens_salida: 800,
    tokens_cache_lectura: 0,
    tokens_cache_escritura: 0,
    costo_estimado_usd: 0.026,
    ultima_consulta: '2026-09-23T09:00:00Z',
  },
};

export const ACTIVIDADES: DocenteActividadesStats = {
  actividades: [
    {
      activity_id: 'm1_relacionar_funciones',
      modulo: 1,
      tipo: 'relacion_columnas',
      estudiantes_intentaron: 4,
      estudiantes_completaron: 3,
      tasa_finalizacion: 0.75,
      intentos_promedio: 1.5,
      puntaje_promedio: 80,
    },
    {
      activity_id: 'm3_ordenar_fases',
      modulo: 3,
      tipo: 'ordenar_secuencia',
      estudiantes_intentaron: 3,
      estudiantes_completaron: 1,
      tasa_finalizacion: 0.3333,
      intentos_promedio: 4.2,
      puntaje_promedio: 50,
    },
  ],
  por_modulo: Array.from({ length: 6 }, (_, i) => ({
    modulo: i + 1,
    actividades: i === 0 ? 1 : i === 2 ? 1 : 0,
    estudiantes_intentaron: i === 0 ? 4 : i === 2 ? 3 : 0,
    tasa_finalizacion: i === 0 ? 0.75 : i === 2 ? 0.3333 : null,
    intentos_promedio: i === 0 ? 1.5 : i === 2 ? 4.2 : null,
    puntaje_promedio: i === 0 ? 80 : i === 2 ? 50 : null,
  })),
  mas_dificiles: [
    {
      activity_id: 'm3_ordenar_fases',
      modulo: 3,
      tipo: 'ordenar_secuencia',
      estudiantes_intentaron: 3,
      estudiantes_completaron: 1,
      tasa_finalizacion: 0.3333,
      intentos_promedio: 4.2,
      puntaje_promedio: 50,
    },
  ],
};

export const ACTIVIDADES_VACIAS: DocenteActividadesStats = {
  actividades: [],
  por_modulo: ACTIVIDADES.por_modulo.map((m) => ({
    ...m,
    actividades: 0,
    estudiantes_intentaron: 0,
    tasa_finalizacion: null,
    intentos_promedio: null,
    puntaje_promedio: null,
  })),
  mas_dificiles: [],
};

export const MENTOR: DocenteMentorUso = {
  desde: '2026-08-26T00:00:00Z',
  hasta: '2026-09-24T15:00:00Z',
  dias: 30,
  precios: {
    moneda: 'USD',
    entrada_usd_por_mtok: 5,
    salida_usd_por_mtok: 25,
    cache_lectura_factor: 0.1,
    cache_escritura_factor: 1.25,
    nota: 'Estimación con tarifas configurables.',
  },
  totales: {
    consultas: 4,
    usuarios: 3,
    tokens_entrada: 7500,
    tokens_salida: 3600,
    tokens_cache_lectura: 10000,
    tokens_cache_escritura: 1000,
    costo_estimado_usd: 0.13875,
  },
  por_dia: [
    {
      fecha: '2026-09-22',
      consultas: 0,
      tokens_entrada: 0,
      tokens_salida: 0,
      costo_estimado_usd: 0,
    },
    {
      fecha: '2026-09-23',
      consultas: 3,
      tokens_entrada: 6500,
      tokens_salida: 3100,
      costo_estimado_usd: 0.121,
    },
    {
      fecha: '2026-09-24',
      consultas: 1,
      tokens_entrada: 1000,
      tokens_salida: 500,
      costo_estimado_usd: 0.0175,
    },
  ],
  por_dia_modelo: [
    {
      fecha: '2026-09-23',
      modelo: 'claude-opus-5',
      consultas: 3,
      tokens_entrada: 6500,
      tokens_salida: 3100,
      costo_estimado_usd: 0.121,
    },
    {
      fecha: '2026-09-24',
      modelo: 'claude-sonnet-5',
      consultas: 1,
      tokens_entrada: 1000,
      tokens_salida: 500,
      costo_estimado_usd: 0.0175,
    },
  ],
  por_modelo: [
    {
      modelo: 'claude-opus-5',
      consultas: 3,
      tokens_entrada: 6500,
      tokens_salida: 3100,
      tokens_cache_lectura: 10000,
      tokens_cache_escritura: 1000,
      costo_estimado_usd: 0.121,
    },
    {
      modelo: 'claude-sonnet-5',
      consultas: 1,
      tokens_entrada: 1000,
      tokens_salida: 500,
      tokens_cache_lectura: 0,
      tokens_cache_escritura: 0,
      costo_estimado_usd: 0.0175,
    },
  ],
  top_usuarios: [
    {
      user_id: 6,
      nombre: 'Elena',
      apellido: 'Vega',
      consultas: 1,
      tokens_entrada: 4000,
      tokens_salida: 2000,
      costo_estimado_usd: 0.08125,
    },
  ],
};

export const MENTOR_VACIO: DocenteMentorUso = {
  ...MENTOR,
  totales: {
    consultas: 0,
    usuarios: 0,
    tokens_entrada: 0,
    tokens_salida: 0,
    tokens_cache_lectura: 0,
    tokens_cache_escritura: 0,
    costo_estimado_usd: 0,
  },
  por_dia: [],
  por_dia_modelo: [],
  por_modelo: [],
  top_usuarios: [],
};
