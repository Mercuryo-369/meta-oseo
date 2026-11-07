/**
 * Índice BM25 del curso, construido una vez por instancia del Worker (equivale a `obtener_retriever`
 * del Python, que lo crea al arrancar). Es el único punto por el que las rutas del mentor buscan.
 */
import { FRAGMENTOS_DEL_CURSO } from './corpus';
import { BM25Retriever } from './retriever';

export const RECUPERADOR_DEL_CURSO = new BM25Retriever(FRAGMENTOS_DEL_CURSO);
