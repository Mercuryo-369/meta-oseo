/**
 * Bindings y variables del Worker (wrangler.json) y la configuración derivada de ellas
 * (equivale a app/core/settings.py). Los secretos (`SECRET_KEY`, `ANTHROPIC_API_KEY`) se cargan
 * con `wrangler secret put`; en desarrollo, en `.dev.vars`.
 */

export interface RateLimit {
  limit(opciones: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
  LIMITE_ACCESO: RateLimit;
  LIMITE_CHAT: RateLimit;
  LIMITE_VERIFICAR: RateLimit;
  LIMITE_PDF: RateLimit;

  ENV?: string;
  SECRET_KEY?: string;
  PUBLIC_BASE_URL?: string;
  ACCESS_TOKEN_EXPIRE_MINUTES?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  MENTOR_EFFORT?: string;
  MENTOR_MAX_TOKENS?: string;
  MENTOR_SERVER_FALLBACK?: string;
  MENTOR_MAX_MENSAJES_DIA?: string;
  MENTOR_MAX_QUIZ_DIA?: string;
  MENTOR_RAG_TOP_K?: string;
  CERT_MIN_PORCENTAJE?: string;
  PRECIO_ENTRADA_USD_POR_MTOK?: string;
  PRECIO_SALIDA_USD_POR_MTOK?: string;
}

export interface Configuracion {
  env: 'dev' | 'prod';
  secretKey: string;
  publicBaseUrl: string;
  accessTokenExpireMinutes: number;
  anthropicApiKey: string;
  anthropicModel: string;
  mentorEffort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  mentorMaxTokens: number;
  mentorServerFallback: boolean;
  mentorMaxMensajesDia: number;
  mentorMaxQuizDia: number;
  mentorRagTopK: number;
  certMinPorcentaje: number;
  precioEntradaUsdPorMtok: number;
  precioSalidaUsdPorMtok: number;
}

function numero(valor: string | undefined, porDefecto: number): number {
  const n = valor === undefined || valor === '' ? NaN : Number(valor);
  return Number.isFinite(n) ? n : porDefecto;
}

function booleano(valor: string | undefined, porDefecto: boolean): boolean {
  if (valor === undefined || valor === '') return porDefecto;
  return ['1', 'true', 'yes', 'si', 'sí', 'on'].includes(valor.trim().toLowerCase());
}

/** Clave de desarrollo: solo se admite fuera de producción. */
const SECRET_KEY_DEV = 'clave-de-desarrollo-no-usar-en-produccion';

export function configuracion(env: Env): Configuracion {
  const esProd = (env.ENV ?? 'prod') !== 'dev';
  const secretKey = env.SECRET_KEY ?? '';
  if (esProd && (secretKey.length < 32 || secretKey === SECRET_KEY_DEV)) {
    throw new Error(
      'SECRET_KEY no está definida (o es demasiado corta) en producción: `wrangler secret put SECRET_KEY`.',
    );
  }
  const efectos = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
  const effort = (env.MENTOR_EFFORT ?? 'medium') as (typeof efectos)[number];
  return {
    env: esProd ? 'prod' : 'dev',
    secretKey: secretKey || SECRET_KEY_DEV,
    publicBaseUrl: (env.PUBLIC_BASE_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
    accessTokenExpireMinutes: Math.max(1, numero(env.ACCESS_TOKEN_EXPIRE_MINUTES, 10080)),
    anthropicApiKey: env.ANTHROPIC_API_KEY ?? '',
    anthropicModel: env.ANTHROPIC_MODEL ?? 'claude-opus-5',
    mentorEffort: efectos.includes(effort) ? effort : 'medium',
    mentorMaxTokens: Math.max(1, numero(env.MENTOR_MAX_TOKENS, 16000)),
    mentorServerFallback: booleano(env.MENTOR_SERVER_FALLBACK, true),
    mentorMaxMensajesDia: Math.max(0, numero(env.MENTOR_MAX_MENSAJES_DIA, 60)),
    mentorMaxQuizDia: Math.max(0, numero(env.MENTOR_MAX_QUIZ_DIA, 20)),
    mentorRagTopK: Math.min(10, Math.max(1, numero(env.MENTOR_RAG_TOP_K, 5))),
    certMinPorcentaje: Math.min(100, Math.max(0, numero(env.CERT_MIN_PORCENTAJE, 60))),
    precioEntradaUsdPorMtok: Math.max(0, numero(env.PRECIO_ENTRADA_USD_POR_MTOK, 5)),
    precioSalidaUsdPorMtok: Math.max(0, numero(env.PRECIO_SALIDA_USD_POR_MTOK, 25)),
  };
}
