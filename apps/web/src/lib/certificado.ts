/**
 * Cliente de certificado, verificación pública y logros (docs/api-contract.md, "Certificado (F5-05)"
 * y "Logros"). Se apoya en `apiFetch`/`apiFetchRaw` de `lib/api.ts`.
 */
import { ApiError, apiFetch, apiFetchRaw, leerApiError } from '@/lib/api';
import type {
  CertificadoEmitido,
  CertificadoEstado,
  CertificadoVerificado,
  LogrosResponse,
} from '@/types/api';

/* -------------------------------------------------------------------------------------------
 * Código de verificación
 * ----------------------------------------------------------------------------------------- */

/** Forma `OVA-XXXX-XXXX` (el alfabeto exacto lo valida el servidor). */
const FORMA_CODIGO = /^OVA-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/**
 * Normaliza lo que alguien escribe o pega desde un documento impreso: mayúsculas, sin espacios
 * y con guiones normales (acepta guion largo, guion bajo o ningún guion: "ova 7k3m 9qxa").
 */
export function normalizarCodigo(valor: string): string {
  const limpio = valor
    .toUpperCase()
    .replace(/[\s\u00a0]+/g, '')
    .replace(/[\u2010-\u2015\u2212_]/g, '-');
  const partes = limpio.match(/^OVA-?([A-Z0-9]{4})-?([A-Z0-9]{4})$/);
  return partes ? `OVA-${partes[1]}-${partes[2]}` : limpio;
}

/** ¿Tiene la forma de un código? Un código mal formado no se envía al servidor. */
export function codigoBienFormado(codigo: string): boolean {
  return FORMA_CODIGO.test(codigo);
}

/** Enlace público que un tercero abre para verificar el certificado. */
export function urlVerificacion(codigo: string): string {
  return `${window.location.origin}/verify/${encodeURIComponent(codigo)}`;
}

/* -------------------------------------------------------------------------------------------
 * Certificado del estudiante (con sesión)
 * ----------------------------------------------------------------------------------------- */

export function obtenerEstadoCertificado(signal?: AbortSignal): Promise<CertificadoEstado> {
  return apiFetch<CertificadoEstado>('/certificate/status', { signal });
}

/** Idempotente: 201 al emitirlo, 200 con `nuevo: false` si ya existía. 409 si no es elegible. */
export function emitirCertificado(): Promise<CertificadoEmitido> {
  return apiFetch<CertificadoEmitido>('/certificate', { method: 'POST' });
}

/** Extrae `filename` de una cabecera Content-Disposition; `null` si no viene o es insegura. */
export function nombreDeCabecera(cabecera: string | null): string | null {
  if (!cabecera) return null;
  const coincidencia = cabecera.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (!coincidencia?.[1]) return null;
  let nombre = coincidencia[1].trim();
  try {
    nombre = decodeURIComponent(nombre);
  } catch {
    // Se conserva tal cual.
  }
  // Solo el nombre, sin rutas, y con caracteres seguros para el sistema de archivos.
  nombre = nombre.split(/[\\/]/).pop() ?? '';
  return /^[\w.\- ]{1,100}$/.test(nombre) && nombre.toLowerCase().endsWith('.pdf') ? nombre : null;
}

export interface PdfDescargado {
  blob: Blob;
  nombre: string;
}

/**
 * Descarga el PDF con `Authorization` (no se puede abrir con un enlace simple: el token no viaja
 * en la URL). Lanza `ApiError` (404 `certificado_no_emitido`, 429, red...).
 */
export async function descargarCertificadoPdf(codigo?: string): Promise<PdfDescargado> {
  const res = await apiFetchRaw('/certificate/pdf', { headers: { Accept: 'application/pdf' } });
  if (!res.ok) throw await leerApiError(res);
  let blob: Blob;
  try {
    blob = await res.blob();
  } catch {
    throw new ApiError(
      res.status,
      'respuesta_invalida',
      'No pudimos leer el archivo. Inténtalo de nuevo.',
    );
  }
  if (blob.size === 0) {
    throw new ApiError(
      res.status,
      'respuesta_invalida',
      'El archivo llegó vacío. Inténtalo de nuevo.',
    );
  }
  const nombre =
    nombreDeCabecera(res.headers.get('Content-Disposition')) ??
    `certificado_${codigo ?? 'OVA'}.pdf`;
  return { blob, nombre };
}

/** Entrega el blob al navegador como descarga (enlace temporal que se libera después). */
export function guardarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.rel = 'noopener';
  enlace.style.display = 'none';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Margen para que el navegador termine de iniciar la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/* -------------------------------------------------------------------------------------------
 * Verificación pública (sin token)
 * ----------------------------------------------------------------------------------------- */

/** Espera por defecto (segundos) si el 429 no trae `Retry-After` legible. */
const ESPERA_POR_DEFECTO_SEG = 30;
const ESPERA_MAXIMA_SEG = 3600;

/**
 * `GET /api/verify/{codigo}` sin token. Errores: `certificado_no_encontrado` (404, siempre el
 * mismo), `demasiados_intentos` (429; `detalle.retry_after` trae los segundos de espera), red y
 * servidor. No cierra la sesión de nadie: la petición no lleva `Authorization`.
 */
export async function verificarCertificado(
  codigo: string,
  signal?: AbortSignal,
): Promise<CertificadoVerificado> {
  const res = await apiFetchRaw(`/verify/${encodeURIComponent(codigo)}`, { auth: false, signal });
  if (res.status === 429) {
    const error = await leerApiError(res);
    const bruto = Number(res.headers.get('Retry-After'));
    const espera =
      Number.isFinite(bruto) && bruto > 0
        ? Math.min(Math.ceil(bruto), ESPERA_MAXIMA_SEG)
        : ESPERA_POR_DEFECTO_SEG;
    throw new ApiError(
      429,
      error.code,
      error.message,
      {},
      { ...error.detalle, retry_after: espera },
    );
  }
  if (!res.ok) throw await leerApiError(res);
  try {
    return (await res.json()) as CertificadoVerificado;
  } catch {
    throw new ApiError(
      res.status,
      'respuesta_invalida',
      'El servidor respondió algo que no entendimos. Inténtalo de nuevo.',
    );
  }
}

/* -------------------------------------------------------------------------------------------
 * Logros
 * ----------------------------------------------------------------------------------------- */

export async function obtenerLogros(signal?: AbortSignal): Promise<LogrosResponse> {
  const datos = await apiFetch<LogrosResponse>('/achievements', { signal });
  if (!datos || !Array.isArray(datos.logros)) {
    throw new ApiError(
      200,
      'respuesta_invalida',
      'El servidor respondió algo que no entendimos. Inténtalo de nuevo.',
    );
  }
  return datos;
}
