/**
 * Proveedor de IA del mentor, configurable desde el panel docente (pedido del usuario, 2026-11-07).
 *
 * Orden de resolución: la configuración guardada en la tabla `ajustes` (clave `mentor`, con la
 * clave de la API cifrada con SECRET_KEY mediante AES-GCM) y, si no la hay, la variable
 * `ANTHROPIC_API_KEY` del Worker. Sin ninguna de las dos, el mentor no está configurado (503).
 *
 * `clienteDe` devuelve un cliente con la misma interfaz para Anthropic y para los proveedores
 * compatibles con OpenAI, así el resto del mentor no sabe cuál está detrás.
 */
import { primera } from '../core/db';
import type { Configuracion } from '../core/entorno';
import { ahora } from '../core/tiempo';
import {
  crearMensaje,
  type EventoAnthropic,
  type MensajeCompleto,
  type ParametrosMensaje,
  transmitirMensaje,
} from './anthropic';
import { crearChat, transmitirChat } from './openai';

export const PROVEEDORES = ['anthropic', 'openai', 'openai_compatible'] as const;
export type Proveedor = (typeof PROVEEDORES)[number];

export const URL_OPENAI = 'https://api.openai.com/v1';

export interface ConfigMentor {
  proveedor: Proveedor;
  /** Solo para `openai_compatible` (por ejemplo `https://api.groq.com/openai/v1`). */
  base_url: string | null;
  modelo: string;
  api_key: string;
  origen: 'panel' | 'entorno';
  actualizado_en: string | null;
}

/** Lo que ve el docente: nunca la clave completa. */
export interface ConfigMentorPublica {
  proveedor: Proveedor;
  base_url: string | null;
  modelo: string;
  clave_configurada: boolean;
  /** Últimos 4 caracteres de la clave, para reconocerla. */
  clave_sufijo: string | null;
  origen: 'panel' | 'entorno' | 'ninguno';
  actualizado_en: string | null;
}

interface FilaAjuste {
  proveedor: Proveedor;
  base_url: string | null;
  modelo: string;
  api_key_cifrada: string;
}

const CLAVE_AJUSTE = 'mentor';
const codificador = new TextEncoder();

// --- Cifrado de la clave (AES-GCM con una clave derivada de SECRET_KEY) --------------------------

async function claveAes(secreto: string): Promise<CryptoKey> {
  const resumen = await crypto.subtle.digest('SHA-256', codificador.encode(`mentor:${secreto}`));
  return crypto.subtle.importKey('raw', resumen, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function aBase64(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

function deBase64(texto: string): Uint8Array {
  return Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
}

export async function cifrar(texto: string, secreto: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await claveAes(secreto), codificador.encode(texto));
  const salida = new Uint8Array(iv.length + cifrado.byteLength);
  salida.set(iv, 0);
  salida.set(new Uint8Array(cifrado), iv.length);
  return aBase64(salida);
}

export async function descifrar(cifradoB64: string, secreto: string): Promise<string> {
  const bytes = deBase64(cifradoB64);
  const iv = bytes.slice(0, 12);
  const datos = bytes.slice(12);
  const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await claveAes(secreto), datos);
  return new TextDecoder().decode(claro);
}

// --- Lectura y escritura -------------------------------------------------------------------------

async function leerAjuste(db: D1Database): Promise<{ fila: FilaAjuste; updated_at: string } | null> {
  const r = await primera<{ valor: string; updated_at: string }>(db, 'SELECT valor, updated_at FROM ajustes WHERE clave = ?', CLAVE_AJUSTE);
  if (!r) return null;
  try {
    const fila = JSON.parse(r.valor) as FilaAjuste;
    if (!PROVEEDORES.includes(fila.proveedor) || typeof fila.modelo !== 'string' || typeof fila.api_key_cifrada !== 'string') {
      return null;
    }
    return { fila, updated_at: r.updated_at };
  } catch {
    return null;
  }
}

/** Configuración efectiva del mentor (panel, o variable del Worker), o `null` si no hay. */
export async function resolverConfigMentor(db: D1Database, cfg: Configuracion): Promise<ConfigMentor | null> {
  const guardado = await leerAjuste(db);
  if (guardado) {
    try {
      return {
        proveedor: guardado.fila.proveedor,
        base_url: guardado.fila.base_url ?? null,
        modelo: guardado.fila.modelo,
        api_key: await descifrar(guardado.fila.api_key_cifrada, cfg.secretKey),
        origen: 'panel',
        actualizado_en: guardado.updated_at,
      };
    } catch (error) {
      // Clave cifrada con otra SECRET_KEY: se avisa en el log y se sigue con la variable del Worker.
      console.error('No se pudo descifrar la clave del mentor guardada en ajustes', error);
    }
  }
  if (cfg.anthropicApiKey.trim() !== '') {
    return {
      proveedor: 'anthropic',
      base_url: null,
      modelo: cfg.anthropicModel,
      api_key: cfg.anthropicApiKey,
      origen: 'entorno',
      actualizado_en: null,
    };
  }
  return null;
}

export function publica(config: ConfigMentor | null): ConfigMentorPublica {
  if (!config) {
    return { proveedor: 'anthropic', base_url: null, modelo: '', clave_configurada: false, clave_sufijo: null, origen: 'ninguno', actualizado_en: null };
  }
  return {
    proveedor: config.proveedor,
    base_url: config.base_url,
    modelo: config.modelo,
    clave_configurada: true,
    clave_sufijo: config.api_key.length >= 8 ? config.api_key.slice(-4) : null,
    origen: config.origen,
    actualizado_en: config.actualizado_en,
  };
}

export interface NuevaConfigMentor {
  proveedor: Proveedor;
  base_url: string | null;
  modelo: string;
  /** Vacía o ausente: se conserva la clave guardada en el panel. */
  api_key: string | null;
}

/** Guarda la configuración del panel. Devuelve `false` si no hay clave (ni nueva ni guardada). */
export async function guardarConfigMentor(db: D1Database, cfg: Configuracion, nueva: NuevaConfigMentor): Promise<boolean> {
  let apiKeyCifrada: string | null = null;
  if (nueva.api_key && nueva.api_key.trim() !== '') {
    apiKeyCifrada = await cifrar(nueva.api_key.trim(), cfg.secretKey);
  } else {
    const previa = await leerAjuste(db);
    apiKeyCifrada = previa?.fila.api_key_cifrada ?? null;
  }
  if (!apiKeyCifrada) return false;
  const fila: FilaAjuste = {
    proveedor: nueva.proveedor,
    base_url: nueva.proveedor === 'openai_compatible' ? nueva.base_url : null,
    modelo: nueva.modelo.trim(),
    api_key_cifrada: apiKeyCifrada,
  };
  await db
    .prepare('INSERT INTO ajustes (clave, valor, updated_at) VALUES (?, ?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at')
    .bind(CLAVE_AJUSTE, JSON.stringify(fila), ahora())
    .run();
  return true;
}

export async function borrarConfigMentor(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM ajustes WHERE clave = ?').bind(CLAVE_AJUSTE).run();
}

// --- Cliente unificado -----------------------------------------------------------------------------

export interface ClienteModelo {
  modelo: string;
  crear(params: ParametrosMensaje, senal?: AbortSignal): Promise<MensajeCompleto>;
  transmitir(params: ParametrosMensaje, senal: AbortSignal): AsyncGenerator<EventoAnthropic>;
}

export function clienteDe(config: ConfigMentor): ClienteModelo {
  if (config.proveedor === 'anthropic') {
    return {
      modelo: config.modelo,
      crear: (params, senal) => crearMensaje(config.api_key, params, senal),
      transmitir: (params, senal) => transmitirMensaje(config.api_key, params, senal),
    };
  }
  const esOpenAi = config.proveedor === 'openai';
  const baseUrl = esOpenAi ? URL_OPENAI : (config.base_url ?? URL_OPENAI);
  return {
    modelo: config.modelo,
    crear: (params, senal) => crearChat(baseUrl, config.api_key, params, esOpenAi, senal),
    transmitir: (params, senal) => transmitirChat(baseUrl, config.api_key, params, esOpenAi, senal),
  };
}
