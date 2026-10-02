"""Normalización y tokenización del español para la recuperación (F3-01/F3-02).

Python puro, sin bibliotecas de PLN: la API debe funcionar en Windows con Python 3.14 y en una
imagen slim. El resultado es deliberadamente "grueso": `tokenizar` devuelve raíces sin tildes ni
mayúsculas para que «Osteoclastos», «osteoclasto» y «OSTEOCLÁSTICO» coincidan.

Pasos:

1. `normalizar`: minúsculas y sin marcas diacríticas (`ó` -> `o`, `ñ` -> `n`).
2. Se separan palabras y números (las letras griegas se conservan: `β-catenina` -> `β`, `catenina`).
3. Se descartan las palabras vacías (artículos, preposiciones, muletillas de pregunta).
4. `raiz`: stemming ligero del español (plurales, género, terminaciones verbales y sufijos
   frecuentes) más una tabla mínima de equivalencias del dominio (`oseo` ~ `hueso`).

No es un stemmer lingüísticamente completo (no lo pretende): busca que las variantes que aparecen
en las preguntas de los estudiantes caigan en la misma raíz que las del material. Su calidad se
mide con el conjunto de evaluación de `docs/mentor-eval.md` (`python -m app.rag.evaluar`).
"""

import re
import unicodedata

_WORD = re.compile(r"[^\W_]+", re.UNICODE)

# Palabras vacías, ya normalizadas (sin tildes). Incluye los verbos auxiliares y las muletillas de
# las preguntas de los estudiantes («qué», «cómo», «explícame», «por favor») que no orientan la
# búsqueda. Se dejan fuera palabras con contenido posible en el tema (p. ej. «acido», «masa»).
_STOPWORDS_TEXT = """
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
"""
STOPWORDS = frozenset(_STOPWORDS_TEXT.split())

# Equivalencias del dominio sobre RAÍCES ya calculadas (ver `raiz`). Los estudiantes escriben
# «hueso» y el material dice «óseo»; «huesos», «osea», «oseos» comparten raíz con «oseo».
_EQUIVALENCIAS_RAIZ = {
    "ose": "hues",
    "osteoclastic": "osteoclast",
    "osteoblastic": "osteoblast",
    "osteocitic": "osteocit",
    "mandibular": "mandibul",
    "celular": "celul",
}

_VOWELS = "aeiou"

# Sufijos que se retiran (de mayor a menor longitud) si queda una raíz de al menos `_MIN_ROOT`.
_MIN_ROOT = 3
_SUFFIXES = (
    "amientos",
    "imientos",
    "amiento",
    "imiento",
    "aciones",
    "iciones",
    "acion",
    "icion",
    "ciones",
    "siones",
    "cion",
    "sion",
    "mente",
    "idades",
    "idad",
    "adoras",
    "adores",
    "adora",
    "ador",
    "ismos",
    "ismo",
    "istas",
    "ista",
    "ables",
    "able",
    "ibles",
    "ible",
    "icos",
    "icas",
    "ico",
    "ica",
    "osos",
    "osas",
    "oso",
    "osa",
    "ando",
    "iendo",
    "aron",
    "ieron",
    "aban",
    "aba",
    "ados",
    "adas",
    "idos",
    "idas",
    "ado",
    "ada",
    "ido",
    "ida",
    "ara",
    "ar",
    "er",
    "ir",
)


def normalizar(texto: str) -> str:
    """Minúsculas y sin marcas diacríticas. Conserva las letras griegas (`β`, `α`)."""
    descompuesto = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in descompuesto if not unicodedata.combining(c))


def _quitar_plural(palabra: str) -> str:
    if len(palabra) <= 4:
        return palabra
    if palabra.endswith("ces"):
        return palabra[:-3] + "z"
    if palabra.endswith("es") and palabra[-3] not in _VOWELS:
        return palabra[:-2]
    if palabra.endswith("s") and palabra[-2] in _VOWELS + "n":
        return palabra[:-1]
    return palabra


def raiz(palabra: str) -> str:
    """Raíz ligera de una palabra YA normalizada."""
    if len(palabra) < 4 or not palabra.isalpha():
        return palabra
    palabra = _quitar_plural(palabra)
    for sufijo in _SUFFIXES:
        if palabra.endswith(sufijo) and len(palabra) - len(sufijo) >= _MIN_ROOT:
            palabra = palabra[: -len(sufijo)]
            break
    else:
        # Terminaciones verbales y de género (`forma`, `forman`, `formo`, `hueso`, `celula`).
        if palabra.endswith("an") or palabra.endswith("en"):
            if len(palabra) - 2 >= _MIN_ROOT + 1:
                palabra = palabra[:-2]
        elif palabra[-1] in "aeo" and len(palabra) - 1 >= _MIN_ROOT:
            palabra = palabra[:-1]
    return _EQUIVALENCIAS_RAIZ.get(palabra, palabra)


def tokenizar(texto: str) -> list[str]:
    """Raíces de las palabras con contenido de `texto` (con repeticiones, en orden)."""
    resultado: list[str] = []
    for palabra in _WORD.findall(normalizar(texto)):
        if palabra in STOPWORDS:
            continue
        resultado.append(raiz(palabra))
    return resultado


def contar_palabras(texto: str) -> int:
    """Palabras del texto (sin filtrar), para dimensionar los fragmentos."""
    return len(_WORD.findall(texto))
