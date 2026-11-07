/**
 * Arma la consulta de recuperación a partir de la conversación y del contexto pedagógico
 * (equivale a app/rag/consulta.py).
 *
 * - La pregunta es el último mensaje del estudiante. Si es un seguimiento sin contenido propio
 *   («¿y eso por qué?»), se le suma el mensaje anterior del estudiante.
 * - El módulo y la sección abiertos refuerzan (no filtran) los resultados.
 * - La estructura, la molécula y las palabras del id de la sección entran como texto de menor peso.
 */
import type { Consulta } from './retriever';
import { normalizar, tokenizar } from './texto';

// Palabras que remiten a lo dicho antes («¿y eso por qué pasa?»).
const ANAFORAS: ReadonlySet<string> = new Set([
  'eso',
  'esto',
  'esa',
  'ese',
  'esas',
  'esos',
  'ello',
  'aquello',
  'anterior',
  'mismo',
  'tambien',
]);
// Prefijos de ids de capas, moléculas, pasos... que no aportan a la búsqueda.
const PREFIJOS_ID = /^(?:mol|rec|par|histo|ident|capa|paso|ea|eb)_|^m\d+_(?:\d+_)?/;
// Tope del texto que se busca (un mensaje puede tener hasta 8000 caracteres).
const MAX_CARACTERES_CONSULTA = 1500;

/** Primeros `n` caracteres (puntos de código, como el slicing de Python). */
function primeros(texto: string, n: number): string {
  return Array.from(texto).slice(0, n).join('');
}

function legible(identificador: string | null | undefined): string {
  if (!identificador) return '';
  return identificador.replace(PREFIJOS_ID, '').replace(/_/g, ' ');
}

function esSeguimiento(pregunta: string): boolean {
  const terminos = tokenizar(pregunta).length;
  if (terminos === 0) return true;
  return (
    terminos === 1 && normalizar(pregunta).split(/\s+/).some((p) => ANAFORAS.has(p))
  );
}

export interface OpcionesConsulta {
  k: number;
  modulo?: number | null;
  seccion?: string | null;
  estructura?: string | null;
  molecula?: string | null;
}

/**
 * `mensajesEstudiante`: solo los mensajes del estudiante, en orden (el último es la pregunta).
 */
export function consultaDesdeConversacion(
  mensajesEstudiante: readonly string[],
  opciones: OpcionesConsulta,
): Consulta {
  const pregunta = mensajesEstudiante[mensajesEstudiante.length - 1] ?? '';
  let texto = primeros(pregunta, MAX_CARACTERES_CONSULTA);
  if (mensajesEstudiante.length > 1 && esSeguimiento(texto)) {
    const anterior = mensajesEstudiante[mensajesEstudiante.length - 2] ?? '';
    texto = `${primeros(anterior, MAX_CARACTERES_CONSULTA)} ${texto}`;
  }
  const seccion = opciones.seccion ?? null;
  const contexto = `${legible(opciones.estructura)} ${legible(opciones.molecula)} ${
    seccion !== null && seccion !== 'inicio' ? legible(seccion) : ''
  }`.trim();
  return {
    texto,
    k: opciones.k,
    moduloActual: opciones.modulo ?? null,
    seccionActual: seccion,
    textoContexto: contexto,
  };
}
