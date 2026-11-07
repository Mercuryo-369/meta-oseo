/**
 * Prueba manual del motor BM25 del mentor (sin Python): empaqueta con esbuild (el que trae Wrangler)
 * los módulos de src/rag y muestra los 3 primeros resultados de cada consulta, para compararlos con
 * `app.rag.retriever` del Python.
 *
 * Uso (desde services/worker):  node scripts/probar_bm25.mjs ["consulta 1" "consulta 2" ...]
 */
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requerir = createRequire(import.meta.url);
// esbuild llega como dependencia de wrangler (no está declarado en el proyecto).
const esbuild = requerir(
  requerir.resolve('esbuild', { paths: [path.dirname(requerir.resolve('wrangler/package.json', { paths: [raiz] }))] }),
);

const CONSULTAS_POR_DEFECTO = [
  'qué hacen los osteoclastos',
  'señalización RANKL OPG',
  'mineralización del osteoide',
];
const consultas = process.argv.length > 2 ? process.argv.slice(2) : CONSULTAS_POR_DEFECTO;

const entrada = `
import { RECUPERADOR_DEL_CURSO } from './rag/indice';
import { consultaDesdeConversacion } from './rag/consulta';
import { tokenizar, normalizar, raiz } from './rag/texto';
export { RECUPERADOR_DEL_CURSO, consultaDesdeConversacion, tokenizar, normalizar, raiz };
`;

const bundle = await esbuild.build({
  stdin: { contents: entrada, resolveDir: path.join(raiz, 'src'), sourcefile: 'probe.ts', loader: 'ts' },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  loader: { '.jsonl': 'text', '.md': 'text', '.json': 'json' },
  logLevel: 'silent',
});
const dirTmp = path.join(raiz, '.wrangler', 'tmp');
mkdirSync(dirTmp, { recursive: true });
const archivo = path.join(dirTmp, 'probar_bm25.mjs');
writeFileSync(archivo, bundle.outputFiles[0].text);
const modulo = await import(pathToFileURL(archivo).href);
rmSync(archivo, { force: true });

const { RECUPERADOR_DEL_CURSO, consultaDesdeConversacion, tokenizar } = modulo;
// Contexto opcional por variables de entorno (mismo significado que en consulta_desde_conversacion).
const ctx = {
  modulo: process.env.PROBE_MODULO ? Number(process.env.PROBE_MODULO) : null,
  seccion: process.env.PROBE_SECCION || null,
  estructura: process.env.PROBE_ESTRUCTURA || null,
  molecula: process.env.PROBE_MOLECULA || null,
};
const previo = process.env.PROBE_PREVIO || null;
console.log(`Corpus: ${RECUPERADOR_DEL_CURSO.tamano} fragmentos`);
for (const pregunta of consultas) {
  const mensajes = previo ? [previo, pregunta] : [pregunta];
  const consulta = consultaDesdeConversacion(mensajes, { k: 5, modulo: ctx.modulo, seccion: ctx.seccion, estructura: ctx.estructura, molecula: ctx.molecula });
  const resultados = RECUPERADOR_DEL_CURSO.buscar(consulta);
  console.log(`\n# ${pregunta}`);
  console.log(`  raíces: ${JSON.stringify(tokenizar(pregunta))}`);
  for (const [i, r] of resultados.slice(0, 3).entries()) {
    const f = r.fragmento;
    console.log(`  ${i + 1}. ${f.id} | m${f.modulo} | ${f.tipo} | ${f.seccion_titulo} | ${r.puntaje.toFixed(6)}`);
  }
  if (resultados.length === 0) console.log('  (sin resultados)');
}
