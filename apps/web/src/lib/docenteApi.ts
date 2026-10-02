/**
 * Cliente del panel del docente (docs/api-contract.md, sección "Docente"). Todas las rutas
 * exigen rol docente; a un estudiante el servidor le responde 403 `no_autorizado`. Por eso la
 * vista NO llama a ninguna de estas funciones si el usuario no es docente.
 */
import { apiFetch, apiFetchRaw, leerApiError } from '@/lib/api';
import type {
  DocenteActividadesStats,
  DocenteEstudianteDetalle,
  DocenteEstudiantesPagina,
  DocenteMentorUso,
  DocenteOrdenEstudiantes,
  DocenteOverview,
} from '@/types/api';

export interface ConsultaEstudiantesDocente {
  page: number;
  /** Palabras del nombre o apellido, o un número de identificación exacto. */
  q?: string;
  orden?: DocenteOrdenEstudiantes;
  pageSize?: number;
}

export const TAMANO_PAGINA_DOCENTE = 25;

export function obtenerResumenDocente(signal?: AbortSignal): Promise<DocenteOverview> {
  return apiFetch<DocenteOverview>('/teacher/overview', { signal });
}

export function obtenerEstudiantesDocente(
  consulta: ConsultaEstudiantesDocente,
  signal?: AbortSignal,
): Promise<DocenteEstudiantesPagina> {
  const params = new URLSearchParams({
    page: String(consulta.page),
    page_size: String(consulta.pageSize ?? TAMANO_PAGINA_DOCENTE),
    orden: consulta.orden ?? 'nombre',
  });
  const q = consulta.q?.trim();
  if (q) params.set('q', q);
  return apiFetch<DocenteEstudiantesPagina>(`/teacher/students?${params.toString()}`, { signal });
}

export function obtenerEstudianteDocente(
  id: number,
  signal?: AbortSignal,
): Promise<DocenteEstudianteDetalle> {
  return apiFetch<DocenteEstudianteDetalle>(`/teacher/students/${id}`, { signal });
}

export function obtenerActividadesDocente(
  limite = 5,
  signal?: AbortSignal,
): Promise<DocenteActividadesStats> {
  return apiFetch<DocenteActividadesStats>(`/teacher/activities/stats?limite=${limite}`, {
    signal,
  });
}

export function obtenerUsoMentorDocente(
  dias = 30,
  limite = 10,
  signal?: AbortSignal,
): Promise<DocenteMentorUso> {
  return apiFetch<DocenteMentorUso>(`/teacher/mentor/usage?dias=${dias}&limite=${limite}`, {
    signal,
  });
}

/** Extrae el nombre de archivo de un `Content-Disposition`; `null` si no viene o no es usable. */
export function nombreDeDescarga(disposicion: string | null): string | null {
  if (!disposicion) return null;
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposicion);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/**
 * Descarga el CSV de progreso con la sesión del docente (un enlace directo no llevaría el
 * token). Con `identificacionCompleta` el número sale sin enmascarar: quien llama debe haber
 * pedido antes una confirmación explícita.
 */
export async function descargarProgresoCsv(
  identificacionCompleta = false,
  signal?: AbortSignal,
): Promise<{ blob: Blob; nombre: string }> {
  const consulta = identificacionCompleta ? '?identificacion=completa' : '';
  const res = await apiFetchRaw(`/teacher/export/progress.csv${consulta}`, {
    headers: { Accept: 'text/csv' },
    signal,
  });
  if (!res.ok) throw await leerApiError(res);
  const blob = await res.blob();
  const hoy = new Date().toISOString().slice(0, 10);
  return {
    blob,
    nombre: nombreDeDescarga(res.headers.get('Content-Disposition')) ?? `progreso_ova_${hoy}.csv`,
  };
}
