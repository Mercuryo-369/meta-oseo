/**
 * Errores propios de la API con el formato del contrato (docs/api-contract.md):
 * `{"detail": {"code": "<slug>", "message": "<texto en español>", ...extra}}`.
 * Los 422 de validación conservan el formato de FastAPI (`detail` es una lista), ver validar.ts.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly extra: Record<string, unknown>;
  readonly headers: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    opciones: { extra?: Record<string, unknown>; headers?: Record<string, string> } = {},
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = opciones.extra ?? {};
    this.headers = opciones.headers ?? {};
  }

  /** Cuerpo JSON del contrato. */
  cuerpo(): { detail: Record<string, unknown> } {
    return { detail: { code: this.code, message: this.message, ...this.extra } };
  }

  respuesta(): Response {
    return new Response(JSON.stringify(this.cuerpo()), {
      status: this.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...this.headers,
      },
    });
  }
}

export const tokenInvalido = (): ApiError =>
  new ApiError(401, 'token_invalido', 'Tu sesión no es válida o expiró. Vuelve a ingresar.', {
    headers: { 'WWW-Authenticate': 'Bearer' },
  });

export const usuarioNoEncontrado = (): ApiError =>
  new ApiError(404, 'usuario_no_encontrado', 'No hay un usuario registrado con esa identificación.');

export const usuarioExistente = (): ApiError =>
  new ApiError(409, 'usuario_existente', 'Ya existe un usuario registrado con esa identificación.');

export const demasiadosIntentos = (retryAfterSeconds: number): ApiError =>
  new ApiError(
    429,
    'demasiados_intentos',
    'Demasiados intentos. Espera un momento antes de volver a intentar.',
    { headers: { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterSeconds))) } },
  );

export const noAutorizado = (): ApiError =>
  new ApiError(403, 'no_autorizado', 'Esta función es solo para el equipo docente.');

/** 422 `actividad_desconocida`: el id no existe o su módulo o tipo no coinciden. */
export const actividadDesconocida = (): ApiError =>
  new ApiError(
    422,
    'actividad_desconocida',
    'La actividad no existe en el contenido del OVA o no corresponde a ese módulo y tipo.',
  );

/** 422 `puntaje_invalido`: el puntaje supera el máximo de la actividad. */
export const puntajeInvalido = (maximo: number): ApiError =>
  new ApiError(422, 'puntaje_invalido', `El puntaje supera el máximo de la actividad (${maximo}).`, {
    extra: { puntaje_max: maximo },
  });

/** 409 `modulo_incompleto`: faltan actividades obligatorias del módulo por completar. */
export const moduloIncompleto = (
  faltantes: string[],
  message = 'Aún faltan actividades obligatorias por completar en este módulo.',
): ApiError => new ApiError(409, 'modulo_incompleto', message, { extra: { faltantes } });

export const certificadoNoElegible = (motivos: string[]): ApiError =>
  new ApiError(
    409,
    'certificado_no_elegible',
    'Todavía no cumples los requisitos para obtener el certificado.',
    { extra: { motivos } },
  );

export const certificadoNoEmitido = (): ApiError =>
  new ApiError(404, 'certificado_no_emitido', 'Todavía no has obtenido tu certificado.');

export const certificadoNoEncontrado = (): ApiError =>
  new ApiError(404, 'certificado_no_encontrado', 'No existe un certificado con ese código.');
