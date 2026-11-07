/**
 * Preguntas abiertas (bloques `pregunta`) que el servidor conoce para la retroalimentación con IA
 * (equivale a app/services/preguntas_abiertas.py). El archivo `preguntas_abiertas.json` lo genera
 * `python -m app.scripts.build_preguntas` a partir de los `content.json`. Así el cliente solo envía el
 * id: el enunciado y la respuesta de referencia salen siempre del servidor.
 *
 * La carga es tolerante, como en Python: si el archivo no sirve se avisa y no hay preguntas.
 */
import datos from '../../../api/app/data/preguntas_abiertas.json';
import { MODULE_COUNT } from '../core/constantes';

export interface PreguntaAbierta {
  modulo: number;
  seccion: string;
  titulo: string;
  enunciado: string;
  respuesta: string;
}

const VERSION_PREGUNTAS = 1;

function esTexto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim() !== '';
}

function aPregunta(valor: unknown): PreguntaAbierta | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const p = valor as Record<string, unknown>;
  const modulo = p.modulo;
  if (typeof modulo !== 'number' || !Number.isInteger(modulo) || modulo < 1 || modulo > MODULE_COUNT) return null;
  if (!esTexto(p.seccion) || !esTexto(p.titulo) || !esTexto(p.enunciado) || !esTexto(p.respuesta)) return null;
  return {
    modulo,
    seccion: p.seccion,
    titulo: p.titulo,
    enunciado: p.enunciado,
    respuesta: p.respuesta,
  };
}

/** Preguntas del archivo generado, o un mapa vacío si el archivo no sirve. */
export function parsearPreguntas(archivo: unknown): Map<string, PreguntaAbierta> {
  const mapa = new Map<string, PreguntaAbierta>();
  if (typeof archivo !== 'object' || archivo === null) return mapa;
  const a = archivo as Record<string, unknown>;
  if (a.version !== VERSION_PREGUNTAS || typeof a.preguntas !== 'object' || a.preguntas === null) {
    console.warn('Versión de preguntas abiertas no soportada: la retroalimentación no está disponible.');
    return mapa;
  }
  for (const [id, cruda] of Object.entries(a.preguntas as Record<string, unknown>)) {
    const pregunta = aPregunta(cruda);
    if (pregunta) mapa.set(id, pregunta);
    else console.warn(`La pregunta ${id} no es válida y se omite.`);
  }
  return mapa;
}

const PREGUNTAS: ReadonlyMap<string, PreguntaAbierta> = parsearPreguntas(datos);

/** La pregunta con ese id, o `null` si el servidor no la conoce. */
export function obtenerPregunta(preguntaId: string): PreguntaAbierta | null {
  return PREGUNTAS.get(preguntaId) ?? null;
}
