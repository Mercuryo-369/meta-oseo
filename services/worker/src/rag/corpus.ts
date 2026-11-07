/**
 * Corpus del mentor (equivale a app/rag/corpus.py). El archivo `corpus.jsonl` lo genera
 * `python -m app.scripts.build_corpus` en services/api y Wrangler lo empaqueta como texto: una línea
 * JSON por fragmento. Un fragmento mal formado impide arrancar (como el Python con una ruta explícita).
 */
import corpusTexto from '../../../api/app/data/corpus.jsonl';

export const TIPO_CONTENIDO = 'contenido';
export const TIPO_GLOSARIO = 'glosario';
export const TIPO_OBJETIVOS = 'objetivos';
export const TIPO_BANCO = 'banco';
export const TIPO_GANCHO = 'gancho';
export const TIPO_BIBLIOGRAFIA = 'bibliografia';
const TIPOS = new Set([
  TIPO_CONTENIDO,
  TIPO_GLOSARIO,
  TIPO_OBJETIVOS,
  TIPO_BANCO,
  TIPO_GANCHO,
  TIPO_BIBLIOGRAFIA,
]);
/** Lo que el estudiante puede leer en el OVA (y por eso se cita con un enlace). */
const TIPOS_CITABLES = new Set([TIPO_CONTENIDO, TIPO_GLOSARIO, TIPO_OBJETIVOS]);

export const NIVEL_TODOS = 'todos';
export const NIVEL_POSGRADO = 'posgrado';

export interface Fragmento {
  id: string;
  modulo: number;
  seccion_id: string | null;
  seccion_titulo: string;
  tipo: string;
  texto: string;
  url: string;
  nivel: string;
  subtitulo: string;
  refs: string[];
}

export function esCitable(fragmento: Fragmento): boolean {
  return TIPOS_CITABLES.has(fragmento.tipo);
}

/** Separadores de línea de Python (`str.splitlines`). */
const SEPARADOR_LINEA = /\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/;

function campo(datos: Record<string, unknown>, clave: string): string {
  if (!(clave in datos)) throw new Error(`Fragmento mal formado: falta ${clave}`);
  return String(datos[clave]);
}

function aFragmento(datos: unknown): Fragmento {
  if (typeof datos !== 'object' || datos === null) throw new Error('Fragmento mal formado');
  const d = datos as Record<string, unknown>;
  const fragmento: Fragmento = {
    id: campo(d, 'id'),
    modulo: Number(campo(d, 'modulo')),
    seccion_id: 'seccion_id' in d ? (d.seccion_id as string | null) : null,
    seccion_titulo: campo(d, 'seccion_titulo'),
    tipo: campo(d, 'tipo'),
    texto: campo(d, 'texto'),
    url: campo(d, 'url'),
    nivel: 'nivel' in d ? String(d.nivel) : NIVEL_TODOS,
    subtitulo: 'subtitulo' in d ? String(d.subtitulo) : '',
    refs: Array.isArray(d.refs) ? d.refs.map(String) : [],
  };
  if (!TIPOS.has(fragmento.tipo)) throw new Error(`Tipo de fragmento desconocido: ${fragmento.tipo}`);
  if (fragmento.texto.trim() === '') throw new Error(`El fragmento ${fragmento.id} no tiene texto.`);
  return fragmento;
}

/** Lee el JSONL del corpus. Lanza `Error` si una línea no es válida o un id se repite. */
export function cargarCorpus(contenido: string): Fragmento[] {
  const fragmentos: Fragmento[] = [];
  const vistos = new Set<string>();
  contenido.split(SEPARADOR_LINEA).forEach((linea, indice) => {
    if (linea.trim() === '') return;
    let datos: unknown;
    try {
      datos = JSON.parse(linea);
    } catch {
      throw new Error(`Corpus, línea ${indice + 1}: JSON inválido`);
    }
    const fragmento = aFragmento(datos);
    if (vistos.has(fragmento.id)) {
      throw new Error(`Corpus, línea ${indice + 1}: id repetido ${fragmento.id}`);
    }
    vistos.add(fragmento.id);
    fragmentos.push(fragmento);
  });
  return fragmentos;
}

/** Corpus empaquetado con el Worker (se lee una vez por instancia). */
export const FRAGMENTOS_DEL_CURSO: readonly Fragmento[] = cargarCorpus(corpusTexto);
