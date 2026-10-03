/**
 * Constantes de configuración de la SPA. Un solo lugar para lo que otros módulos
 * (menú, HUD, stores) necesitan consultar.
 */

/**
 * Si es `true`, un módulo solo se abre cuando el anterior está completado, y dentro de un módulo
 * la sección siguiente se abre al completar las actividades obligatorias de la actual (requisito
 * del briefing: el estudiante debe actuar para avanzar; F2-08). El backend no exige orden
 * (docs/api-contract.md, "Progreso"), así que el bloqueo es responsabilidad del frontend.
 *
 * Vale `true` por defecto. Para demos y pruebas se desactiva al compilar con la variable de Vite
 * `VITE_BLOQUEO_SECUENCIAL=false` (por ejemplo `VITE_BLOQUEO_SECUENCIAL=false pnpm dev`); cualquier
 * otro valor, o no definirla, deja el bloqueo activo.
 */
export const BLOQUEO_SECUENCIAL: boolean = import.meta.env.VITE_BLOQUEO_SECUENCIAL !== 'false';

/**
 * Muestra la nota discreta "Contenido en revisión" en la cabecera del módulo mientras su
 * `estado_revision.estado` no sea `aprobado`. Ponerla en `false` para ocultarla (por ejemplo, en
 * la entrega final, cuando el docente ya aprobó el contenido).
 */
export const MOSTRAR_NOTA_REVISION = true;

/** Cada cuántos segundos visibles se envía `tiempo_delta_seg` a PUT /api/progress/{n}. */
export const INTERVALO_TIEMPO_SEG = 30;

/** Tope de `tiempo_delta_seg` por petición (docs/api-contract.md). */
export const TIEMPO_DELTA_MAX_SEG = 3600;

/** Ruta del certificado (la construye otra oleada; el módulo 6 la enlaza solo si existe). */
export const RUTA_CERTIFICADO = '/certificado';

/** Prefijo de la API. Vite lo proxifica a FastAPI en desarrollo; nginx en Docker. */
export const API_BASE = '/api';

/** Versión de demostración sin backend (VITE_MODO_DEMO=true al compilar): ver `lib/modoDemo.ts`. */
export const MODO_DEMO: boolean = import.meta.env.VITE_MODO_DEMO === 'true';

/** Cantidad de módulos del OVA (briefing pedagógico). */
export const TOTAL_MODULOS = 6;

/** `ContextoPedagogico.interaccionesRecientes` guarda como máximo este número de eventos. */
export const MAX_INTERACCIONES_RECIENTES = 10;

/** El contrato valida las cadenas del contexto con un máximo de 64 caracteres. */
export const MAX_LONGITUD_CONTEXTO = 64;

/** Clave de localStorage para el JWT. */
export const CLAVE_TOKEN = 'ova.token';
