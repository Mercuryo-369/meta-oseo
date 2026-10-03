/**
 * Cliente de la API (fetch sobre "/api") según docs/api-contract.md.
 *
 * - `apiFetch<T>()`: JSON de ida y vuelta; lanza `ApiError` si la respuesta no es 2xx.
 * - `apiFetchRaw()`: devuelve la `Response` sin leer el cuerpo. Lo usa el composable de chat
 *   (`src/ai/useMentor.ts`) para manejar su propio stream SSE. Usa `leerApiError()` para
 *   convertir una respuesta de error en `ApiError`.
 *
 * Ambos agregan `Authorization: Bearer <jwt>` desde el store de auth y, ante un 401 en una
 * petición que llevaba token, cierran la sesión (el guard del router redirige a /acceso).
 */
import { API_BASE, MODO_DEMO } from '@/config';
import { useAuthStore } from '@/stores/auth';

/** Error de la API, ya con mensaje en español apto para mostrar al estudiante. */
export class ApiError extends Error {
  readonly status: number;
  /** Slug del contrato (`usuario_no_encontrado`), `validacion` (422), `red` (sin respuesta)... */
  readonly code: string;
  /** Solo en 422: mensaje del servidor por campo (`numero_identificacion`, `nombre`...). */
  readonly campos: Record<string, string>;
  /**
   * Campos extra del `detail` propio del contrato: `faltantes` (409 `modulo_incompleto`),
   * `motivos` (409 `certificado_no_elegible`), `puntaje_max` (422 `puntaje_invalido`)...
   */
  readonly detalle: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    campos: Record<string, string> = {},
    detalle: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.campos = campos;
    this.detalle = detalle;
  }
}

export const MENSAJE_SIN_CONEXION =
  'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';

/** Mensajes por defecto cuando el servidor no manda uno propio en español. */
function porDefecto(status: number): { code: string; message: string } {
  if (status === 401) {
    return {
      code: 'token_invalido',
      message: 'Tu sesión no es válida o expiró. Ingresa de nuevo.',
    };
  }
  if (status === 403) {
    return { code: 'prohibido', message: 'No tienes permiso para hacer esto.' };
  }
  if (status === 404) {
    return { code: 'no_encontrado', message: 'No encontramos lo que buscabas.' };
  }
  if (status === 409) {
    return { code: 'conflicto', message: 'Esa acción entra en conflicto con datos existentes.' };
  }
  if (status === 422) {
    return { code: 'validacion', message: 'Los datos enviados no son válidos. Revísalos.' };
  }
  if (status === 429) {
    return {
      code: 'demasiados_intentos',
      message: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    };
  }
  if (status >= 500) {
    return {
      code: 'error_servidor',
      message: 'El servidor no está disponible por ahora. Inténtalo de nuevo en unos minutos.',
    };
  }
  return { code: 'error_desconocido', message: 'Ocurrió un error inesperado. Inténtalo de nuevo.' };
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/**
 * Convierte el cuerpo de una respuesta de error en `ApiError`. Entiende:
 * - `{"detail": {"code": "...", "message": "..."}}` (errores propios del contrato),
 * - `{"detail": [{"loc": [...], "msg": "..."}]}` (422 de validación de FastAPI),
 * - cualquier otra cosa (HTML de un proxy, `{"detail": "Not Found"}`, cuerpo vacío).
 */
export function interpretarError(status: number, cuerpo: unknown): ApiError {
  const base = porDefecto(status);
  if (esObjeto(cuerpo)) {
    const detail = cuerpo.detail;
    if (esObjeto(detail) && typeof detail.code === 'string') {
      const message =
        typeof detail.message === 'string' && detail.message ? detail.message : base.message;
      const { code: _code, message: _mensaje, ...extra } = detail;
      return new ApiError(status, detail.code, message, {}, extra);
    }
    if (Array.isArray(detail)) {
      const campos: Record<string, string> = {};
      for (const item of detail) {
        if (!esObjeto(item) || !Array.isArray(item.loc)) continue;
        // loc = ["body", "numero_identificacion"]: el último elemento textual es el campo.
        const campo = [...item.loc].reverse().find((x) => typeof x === 'string');
        if (typeof campo === 'string' && typeof item.msg === 'string' && !(campo in campos)) {
          campos[campo] = item.msg;
        }
      }
      return new ApiError(status, 'validacion', porDefecto(422).message, campos);
    }
  }
  return new ApiError(status, base.code, base.message);
}

/** Lee el cuerpo de una respuesta no exitosa y devuelve el `ApiError` correspondiente. */
export async function leerApiError(res: Response): Promise<ApiError> {
  let cuerpo: unknown = null;
  try {
    cuerpo = JSON.parse(await res.text());
  } catch {
    // Cuerpo vacío o que no es JSON: se usa el mensaje por defecto del estado HTTP.
  }
  return interpretarError(res.status, cuerpo);
}

export interface ApiFetchInit extends Omit<RequestInit, 'body'> {
  /** Objeto que se serializa como JSON. Para otros cuerpos usar `apiFetchRaw`. */
  body?: unknown;
  /** `false` para no enviar el token (login y registro). Por defecto se envía si existe. */
  auth?: boolean;
}

/**
 * `fetch` con base "/api" y autenticación. Devuelve la `Response` tal cual: NO lanza por
 * códigos HTTP de error (eso lo decide quien llama), pero sí:
 * - convierte un fallo de red en `ApiError` con `code: "red"` y `status: 0`;
 * - deja pasar los `AbortError` sin tocarlos (cancelar no es un error para el usuario);
 * - cierra la sesión ante un 401 si la petición llevaba token.
 */
export async function apiFetchRaw(path: string, init: ApiFetchInit = {}): Promise<Response> {
  const { auth = true, body, headers: cabecerasIniciales, ...resto } = init;
  const store = useAuthStore();
  const token = auth ? store.token : null;

  const headers = new Headers(cabecerasIniciales);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let cuerpo: BodyInit | undefined;
  if (body !== undefined) {
    cuerpo = typeof body === 'string' ? body : JSON.stringify(body);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  }

  if (MODO_DEMO) {
    const { responderDemo } = await import('@/lib/modoDemo');
    return responderDemo(path, (resto.method ?? 'GET').toUpperCase(), cuerpo);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...resto, headers, body: cuerpo });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    if (resto.signal?.aborted) throw e;
    throw new ApiError(0, 'red', MENSAJE_SIN_CONEXION);
  }

  if (res.status === 401 && token) {
    // El token venció o ya no es válido: se cierra la sesión y el guard redirige a /acceso.
    store.logout();
  }
  return res;
}

/** Petición JSON: devuelve el cuerpo ya interpretado o lanza `ApiError`. */
export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const res = await apiFetchRaw(path, init);
  if (!res.ok) throw await leerApiError(res);
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(res.status, 'respuesta_invalida', porDefecto(500).message);
  }
}
