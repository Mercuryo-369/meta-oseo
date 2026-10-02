"""Normalización, palabras vacías y stemming ligero del español (F3-02)."""

import pytest

from app.rag.texto import STOPWORDS, contar_palabras, normalizar, raiz, tokenizar


def test_normalizar_quita_tildes_y_mayusculas():
    assert normalizar("OSTEOCLÁSTICO Ñandú Ü") == "osteoclastico nandu u"


def test_normalizar_conserva_las_letras_griegas():
    assert normalizar("β-catenina, TGF-β1") == "β-catenina, tgf-β1"


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("Osteoclastos", "osteoclasto"),
        ("ÓSEO", "hueso"),
        ("huesos", "hueso"),
        ("óseas", "hueso"),
        ("célula", "celulas"),
        ("formación", "formaciones"),
        ("forma", "forman"),
        ("receptor", "receptores"),
        ("matrices", "matriz"),
        ("reabsorbe", "reabsorben"),
        ("mandíbula", "MANDIBULAR"),
    ],
)
def test_las_variantes_comparten_raiz(a: str, b: str):
    assert tokenizar(a) == tokenizar(b) != []


def test_palabras_distintas_no_se_confunden():
    for a, b in [("osteoblasto", "osteoclasto"), ("calcitonina", "calcitriol"), ("rank", "rankl")]:
        assert tokenizar(a) != tokenizar(b)


def test_las_palabras_vacias_y_las_muletillas_se_descartan():
    assert tokenizar("¿Qué es el osteoide y para qué sirve?") == ["osteoid"]
    assert tokenizar("explícame por favor cómo funciona") == ["funcion"]
    assert {"el", "que", "como", "para", "explicame"} <= STOPWORDS


def test_conserva_numeros_y_letras_con_significado():
    assert tokenizar("vitamina D3 y el T-score de −2,5") == ["vitamin", "d3", "t", "scor", "2", "5"]
    assert "β" in tokenizar("β-catenina")


def test_una_palabra_corta_no_se_recorta_de_mas():
    assert raiz("pth") == "pth"
    assert raiz("rank") == "rank"
    assert raiz("ca2") == "ca2"


def test_contar_palabras():
    assert contar_palabras("Uno dos, tres. ¿Cuatro?") == 4
    assert contar_palabras("") == 0
