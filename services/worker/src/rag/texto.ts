/**
 * Normalización y tokenización del español para la recuperación BM25 (equivale a
 * app/rag/texto.py). Debe producir EXACTAMENTE las mismas raíces que el Python: el índice del
 * corpus y la consulta del estudiante pasan por aquí, y cualquier diferencia cambia el orden de
 * los resultados.
 *
 * Pasos: minúsculas y sin marcas diacríticas; palabras y números (las letras griegas se conservan);
 * sin palabras vacías; raíz con stemming ligero del español y equivalencias del dominio.
 */

// Palabras vacías ya normalizadas (sin tildes). Copia de `_STOPWORDS_TEXT` de texto.py.
const STOPWORDS_TEXTO = `
a al algo algun alguna algunas alguno algunos ante antes aquel aquella aquello aqui asi aun aunque
bajo bien cada como con contra cual cuales cualquier cuando cuanto cuanta cuantos cuantas cuyo
de del desde donde dos durante e el ella ellas ello ellos en entre era eran eres es esa esas ese
eso esos esta estaba estaban estamos estan estar estas este esto estos estoy fue fueron ha haber
habia hace hacen hacer hacia han hasta hay he la las le les lo los mas me mi mis mientras mismo
misma mismos mucho muchos muy nada ni no nos nosotros nuestro nuestra o os otra otras otro otros
para pero poco por porque pues que quien quienes se sea sean segun ser si sido sin sino sobre
solo son su sus tal tambien tan tanto te tengo tiene tienen todo toda todos todas tras tu tus un
una unas uno unos usted ustedes va van vez vamos voy y ya yo
explicame explica explicar explique dime decime cuentame quiero saber puedes podrias pueden puede
favor gracias hola buenas ayudame ayuda duda pregunta entender entiendo comprender significa
significan sirve sirven q
`;
const STOPWORDS: ReadonlySet<string> = new Set(STOPWORDS_TEXTO.split(/\s+/).filter(Boolean));

// Equivalencias del dominio sobre RAÍCES ya calculadas (ver `raiz`): «hueso» ~ «óseo».
const EQUIVALENCIAS_RAIZ: ReadonlyMap<string, string> = new Map([
  ['ose', 'hues'],
  ['osteoclastic', 'osteoclast'],
  ['osteoblastic', 'osteoblast'],
  ['osteocitic', 'osteocit'],
  ['mandibular', 'mandibul'],
  ['celular', 'celul'],
]);

const VOCALES = 'aeiou';
// Sufijos que se retiran (en este orden) si queda una raíz de al menos MIN_RAIZ letras.
const MIN_RAIZ = 3;
const SUFIJOS: readonly string[] = [
  'amientos',
  'imientos',
  'amiento',
  'imiento',
  'aciones',
  'iciones',
  'acion',
  'icion',
  'ciones',
  'siones',
  'cion',
  'sion',
  'mente',
  'idades',
  'idad',
  'adoras',
  'adores',
  'adora',
  'ador',
  'ismos',
  'ismo',
  'istas',
  'ista',
  'ables',
  'able',
  'ibles',
  'ible',
  'icos',
  'icas',
  'ico',
  'ica',
  'osos',
  'osas',
  'oso',
  'osa',
  'ando',
  'iendo',
  'aron',
  'ieron',
  'aban',
  'aba',
  'ados',
  'adas',
  'idos',
  'idas',
  'ado',
  'ada',
  'ido',
  'ida',
  'ara',
  'ar',
  'er',
  'ir',
];

const PALABRA = /[\p{L}\p{N}]+/gu;
const MARCA_DIACRITICA = /\p{M}/gu;

/** Minúsculas y sin marcas diacríticas. Conserva las letras griegas (`β`, `α`). */
export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(MARCA_DIACRITICA, '');
}

function quitarPlural(palabra: string): string {
  if (palabra.length <= 4) return palabra;
  if (palabra.endsWith('ces')) return `${palabra.slice(0, -3)}z`;
  if (palabra.endsWith('es') && !VOCALES.includes(palabra.charAt(palabra.length - 3))) {
    return palabra.slice(0, -2);
  }
  if (palabra.endsWith('s') && `${VOCALES}n`.includes(palabra.charAt(palabra.length - 2))) {
    return palabra.slice(0, -1);
  }
  return palabra;
}

/** Raíz ligera de una palabra YA normalizada. */
export function raiz(palabra: string): string {
  if (palabra.length < 4 || !/^\p{L}+$/u.test(palabra)) return palabra;
  let forma = quitarPlural(palabra);
  const sufijo = SUFIJOS.find(
    (s) => forma.endsWith(s) && forma.length - s.length >= MIN_RAIZ,
  );
  if (sufijo !== undefined) {
    forma = forma.slice(0, forma.length - sufijo.length);
  } else if (forma.endsWith('an') || forma.endsWith('en')) {
    // Terminaciones verbales y de género (`forman`, `formen`).
    if (forma.length - 2 >= MIN_RAIZ + 1) forma = forma.slice(0, -2);
  } else {
    const ultima = forma.slice(-1);
    // `'aeo'.includes('')` es verdadero: la cadena vacía no cuenta como vocal final.
    if (ultima !== '' && 'aeo'.includes(ultima) && forma.length - 1 >= MIN_RAIZ) {
      forma = forma.slice(0, -1);
    }
  }
  return EQUIVALENCIAS_RAIZ.get(forma) ?? forma;
}

/** Raíces de las palabras con contenido de `texto` (con repeticiones, en orden). */
export function tokenizar(texto: string): string[] {
  const salida: string[] = [];
  for (const coincidencia of normalizar(texto).matchAll(PALABRA)) {
    const palabra = coincidencia[0];
    if (STOPWORDS.has(palabra)) continue;
    salida.push(raiz(palabra));
  }
  return salida;
}

export { STOPWORDS, SUFIJOS };
