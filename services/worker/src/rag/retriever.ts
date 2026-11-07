/**
 * Recuperación de fragmentos del curso: BM25 (Okapi) en memoria, equivalente a
 * app/rag/retriever.py. Se construye una vez por instancia del Worker y no cambia después.
 *
 * idf(t) * tf * (k1 + 1) / (tf + k1 * (1 - b + b * longitud / longitud_media)), con
 * idf(t) = ln(1 + (N - n_t + 0.5) / (n_t + 0.5)). El orden de las operaciones de punto flotante
 * se conserva a propósito: así los puntajes coinciden con los del Python.
 */
import {
  type Fragmento,
  TIPO_BANCO,
  TIPO_BIBLIOGRAFIA,
  TIPO_CONTENIDO,
  TIPO_GANCHO,
  TIPO_GLOSARIO,
} from './corpus';
import { tokenizar } from './texto';

// Parámetros de BM25 (valores clásicos; se ajustaron con docs/mentor-eval.md).
export const K1 = 0.9;
export const B = 0.4;
// Las palabras del título de la sección pesan como si se repitieran.
const PESO_TITULO = 2;
// Peso de los términos del contexto (estructura o molécula) frente a los de la pregunta.
const PESO_CONTEXTO = 0.35;
// Refuerzos multiplicativos por estar en el módulo o la sección que el estudiante tiene abiertos.
const REFUERZO_MODULO = 0.25;
const REFUERZO_SECCION = 0.2;
// Glosario y material del docente para el mentor puntúan algo menos que el texto del curso.
const FACTOR_POR_TIPO: Readonly<Record<string, number>> = {
  [TIPO_GLOSARIO]: 0.7,
  [TIPO_BANCO]: 0.9,
  [TIPO_GANCHO]: 0.85,
  [TIPO_BIBLIOGRAFIA]: 0.8,
};
// Topes por resultado: definiciones y material de apoyo no deben llenar la lista.
const MAX_GLOSARIO = 2;
const MAX_APOYO = 2;
const MAX_BIBLIOGRAFIA = 1;
// Umbrales para poder decir «el material no cubre esto».
const PUNTAJE_MINIMO = 2.0;
const COBERTURA_MINIMA = 0.3;
const FRACCION_DEL_MEJOR = 0.4;

export interface Consulta {
  texto: string;
  k: number;
  /** Solo fragmentos de estos módulos (`undefined`: todos). */
  modulos?: ReadonlySet<number>;
  /** Refuerzo de lo que el estudiante tiene abierto (no filtra, solo sube el puntaje). */
  moduloActual?: number | null;
  seccionActual?: string | null;
  /** Texto adicional de menor peso (estructura o molécula seleccionadas). */
  textoContexto?: string;
}

export interface Resultado {
  fragmento: Fragmento;
  puntaje: number;
}

/** Parte de un glosario antes de los dos puntos (el término definido). */
function terminoDelGlosario(texto: string): string {
  const indice = texto.indexOf(':');
  return indice >= 0 ? texto.slice(0, indice) : texto;
}

/** Raíces que se indexan de un fragmento: su título (repetido) y su texto. */
function textoIndexable(fragmento: Fragmento): string[] {
  let titulo: string;
  if (fragmento.tipo === TIPO_CONTENIDO) titulo = fragmento.seccion_titulo;
  else if (fragmento.tipo === TIPO_GLOSARIO) titulo = terminoDelGlosario(fragmento.texto);
  else if (fragmento.tipo === TIPO_BANCO || fragmento.tipo === TIPO_GANCHO) titulo = '';
  else titulo = fragmento.seccion_titulo;
  const raicesTitulo = tokenizar(titulo);
  const repetidas: string[] = [];
  for (let i = 0; i < PESO_TITULO; i++) repetidas.push(...raicesTitulo);
  return [...repetidas, ...tokenizar(fragmento.texto)];
}

function compararIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export class BM25Retriever {
  private readonly fragmentos: readonly Fragmento[];
  private readonly k1: number;
  private readonly b: number;
  /** Término -> lista de [número de fragmento, frecuencia]. */
  private readonly postings = new Map<string, Array<[number, number]>>();
  private readonly longitudes: number[] = [];
  private media = 0;
  private readonly numeroPorId = new Map<string, number>();
  private readonly claveGlosario = new Map<string, string>();

  constructor(fragmentos: readonly Fragmento[], k1 = K1, b = B) {
    this.fragmentos = fragmentos;
    this.k1 = k1;
    this.b = b;
    this.construir();
  }

  get tamano(): number {
    return this.fragmentos.length;
  }

  /** Fragmentos de un módulo (o de una de sus secciones), en el orden del corpus. No puntúa. */
  fragmentosDe(modulo: number, seccionId?: string): Fragmento[] {
    return this.fragmentos.filter(
      (f) => f.modulo === modulo && (seccionId === undefined || f.seccion_id === seccionId),
    );
  }

  private construir(): void {
    this.fragmentos.forEach((fragmento, numero) => {
      this.numeroPorId.set(fragmento.id, numero);
      if (fragmento.tipo === TIPO_GLOSARIO) {
        this.claveGlosario.set(
          fragmento.id,
          tokenizar(terminoDelGlosario(fragmento.texto)).join(' '),
        );
      }
      const frecuencias = new Map<string, number>();
      for (const termino of textoIndexable(fragmento)) {
        frecuencias.set(termino, (frecuencias.get(termino) ?? 0) + 1);
      }
      let longitud = 0;
      for (const [termino, tf] of frecuencias) {
        longitud += tf;
        const lista = this.postings.get(termino);
        if (lista) lista.push([numero, tf]);
        else this.postings.set(termino, [[numero, tf]]);
      }
      this.longitudes.push(longitud);
    });
    const total = this.longitudes.reduce((a, b) => a + b, 0);
    this.media = this.longitudes.length > 0 ? total / this.longitudes.length : 0;
  }

  private idf(termino: string): number {
    const n = this.postings.get(termino)?.length ?? 0;
    const total = this.fragmentos.length;
    return Math.log(1 + (total - n + 0.5) / (n + 0.5));
  }

  private idfMaximo(): number {
    return Math.log(1 + (this.fragmentos.length + 0.5) / 0.5);
  }

  /**
   * Peso de cada término de la búsqueda, cuáles vienen de la pregunta (no del contexto) y la
   * lista de raíces de la pregunta (su longitud decide si hay pregunta o solo contexto).
   */
  private ponderar(consulta: Consulta): {
    pesos: Map<string, number>;
    principales: Set<string>;
    lista: string[];
  } {
    const pesos = new Map<string, number>();
    const lista = tokenizar(consulta.texto);
    for (const termino of lista) pesos.set(termino, 1.0);
    // Sin palabras con contenido («explícame esto»), el contexto es todo lo que hay.
    const pesoContexto = lista.length > 0 ? PESO_CONTEXTO : 1.0;
    for (const termino of tokenizar(consulta.textoContexto ?? '')) {
      if (!pesos.has(termino)) pesos.set(termino, pesoContexto);
    }
    return { pesos, principales: new Set(lista), lista };
  }

  buscar(consulta: Consulta): Resultado[] {
    if (this.fragmentos.length === 0 || this.media === 0) return [];
    const { pesos, principales, lista } = this.ponderar(consulta);
    const puntajes = new Map<number, number>();
    // Peso informativo de las palabras de la PREGUNTA y cuánto de él contiene cada fragmento.
    const masa = new Map<number, number>();
    let masaTotal = 0;
    for (const [termino, peso] of pesos) {
      const postings = this.postings.get(termino);
      if (!postings) {
        if (principales.has(termino)) masaTotal += this.idfMaximo();
        continue;
      }
      const idf = this.idf(termino) * peso;
      if (principales.has(termino)) masaTotal += idf;
      for (const [numero, tf] of postings) {
        if (principales.has(termino)) masa.set(numero, (masa.get(numero) ?? 0) + idf);
        const largo = this.longitudes[numero] ?? 0;
        const norma = this.k1 * (1.0 - this.b + (this.b * largo) / this.media);
        puntajes.set(
          numero,
          (puntajes.get(numero) ?? 0) + (idf * tf * (this.k1 + 1.0)) / (tf + norma),
        );
      }
    }

    const candidatos: Resultado[] = [];
    for (const [numero, base] of puntajes) {
      const fragmento = this.fragmentos[numero];
      if (!fragmento) continue;
      if (consulta.modulos !== undefined && !consulta.modulos.has(fragmento.modulo)) continue;
      let puntaje = base * (FACTOR_POR_TIPO[fragmento.tipo] ?? 1.0);
      if (consulta.moduloActual != null && fragmento.modulo === consulta.moduloActual) {
        puntaje *= 1.0 + REFUERZO_MODULO;
        if (consulta.seccionActual && fragmento.seccion_id === consulta.seccionActual) {
          puntaje *= 1.0 + REFUERZO_SECCION;
        }
      }
      candidatos.push({ fragmento, puntaje });
    }

    // Mayor puntaje primero; a igualdad, el id (orden estable, igual que el Python).
    candidatos.sort((a, b) => b.puntaje - a.puntaje || compararIds(a.fragmento.id, b.fragmento.id));
    const primero = candidatos[0];
    if (!primero || primero.puntaje < PUNTAJE_MINIMO) return [];
    const mejor = this.numeroPorId.get(primero.fragmento.id) ?? -1;
    if (lista.length > 0 && (masa.get(mejor) ?? 0) / masaTotal < COBERTURA_MINIMA) return [];
    const limite = primero.puntaje * FRACCION_DEL_MEJOR;
    return this.diversificar(
      candidatos.filter((r) => r.puntaje >= limite),
      consulta.k,
      consulta.moduloActual ?? null,
    );
  }

  /**
   * Primeros `k` sin repetir términos del glosario y con topes de glosario, apoyo y bibliografía.
   * De varias definiciones del mismo término (una por módulo) se deja la del módulo actual o, si
   * no hay, la de mejor puntaje.
   */
  private diversificar(
    candidatos: Resultado[],
    k: number,
    moduloActual: number | null,
  ): Resultado[] {
    const elegidos: Resultado[] = [];
    const posicionDeTermino = new Map<string, number>();
    let glosario = 0;
    let apoyo = 0;
    let bibliografia = 0;
    for (const resultado of candidatos) {
      const fragmento = resultado.fragmento;
      if (fragmento.tipo === TIPO_GLOSARIO) {
        const clave = this.claveGlosario.get(fragmento.id) ?? '';
        const posicion = posicionDeTermino.get(clave);
        if (posicion !== undefined) {
          const previo = elegidos[posicion];
          if (
            previo &&
            fragmento.modulo === moduloActual &&
            previo.fragmento.modulo !== moduloActual
          ) {
            elegidos[posicion] = resultado;
          }
          continue;
        }
        if (glosario >= MAX_GLOSARIO) continue;
        posicionDeTermino.set(clave, elegidos.length);
        glosario += 1;
      } else if (fragmento.tipo === TIPO_BANCO || fragmento.tipo === TIPO_GANCHO) {
        if (apoyo >= MAX_APOYO) continue;
        apoyo += 1;
      } else if (fragmento.tipo === TIPO_BIBLIOGRAFIA) {
        if (bibliografia >= MAX_BIBLIOGRAFIA) continue;
        bibliografia += 1;
      }
      elegidos.push(resultado);
      if (elegidos.length >= k) break;
    }
    return elegidos;
  }
}
