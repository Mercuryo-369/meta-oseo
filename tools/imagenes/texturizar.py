"""Ilustración realista y EXACTA a partir del SVG validado: la geometría es la del dibujo, la IA solo pone texturas.

La generación libre (imagenes.py generar) inventa anatomía. Aquí la IA no decide ninguna forma:
1. El SVG se dibuja sin suavizado y cada píxel se clasifica por su color de relleno en un tejido
   (`tejidos` del encargo: color del dibujo -> tejido). Los colores no listados (contornos, trazos de dibujo)
   se reparten entre los tejidos vecinos.
2. Para cada tejido, SDXL genera una textura fotográfica plana («macro photograph of ... texture») y se lleva al
   color natural de la paleta común (docs/realismo-3d.md): se conserva el detalle de la textura, no su tono.
3. Cada región se rellena con su textura y recibe volumen (bisel por distancia al borde), luz de estudio y
   oclusión en los huecos. Los bordes se suavizan con el dibujo con suavizado.

Uso (entorno de la GPU, ver README):
  python texturizar.py NOMBRE... [--realismo 0.5] [--n 3]
      -> trabajo/NOMBRE/s1_tex.png (base exacta) y s{k}_texia.png (con repintado realista), hoja_texia.png
  python imagenes.py integrar NOMBRE --semilla K --sufijo _texia
"""

from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import imagenes
import svg_fondo

# Tejido -> color natural (paleta común de docs/realismo-3d.md) y descripción de su textura para SDXL.
TEJIDOS: dict[str, tuple[str, str]] = {
    "hueso_cortical": ("#e6d8bc", "cut surface of dense human cortical bone, fine lamellar grain and tiny pores"),
    "hueso_alveolar_propio": (
        "#f4ecdc",
        "thin dense compact bone plate, smooth ivory surface with tiny vascular pores",
    ),
    "hueso_trabecular": ("#e6d8bc", "cut surface of human cancellous bone, ivory interconnected trabecular struts"),
    "medula_roja": ("#9e3f33", "red bone marrow tissue, soft dark red granular surface"),
    "medula_amarilla": ("#e8c561", "yellow fatty bone marrow, soft glossy yellow fat lobules"),
    "medula_mixta": ("#b86a45", "bone marrow in spongy bone spaces, mixed red and yellow soft tissue"),
    "ligamento": ("#d4948b", "periodontal ligament, pink fibrous connective tissue with fine collagen fibres"),
    "dentina": ("#ecd9aa", "cut surface of human tooth dentin, smooth ivory with very fine tubule striations"),
    "esmalte": ("#eef1ef", "human tooth enamel surface, glossy translucent bluish white, very smooth"),
    "cemento": ("#d2b984", "dental cementum, thin pale yellow bony layer, fine texture"),
    "pulpa": ("#c65f5b", "dental pulp, soft red vascular connective tissue"),
    "nervio": ("#e8d390", "peripheral nerve bundle, glossy pale yellow fibres running in parallel"),
    "arteria": ("#c9473e", "artery wall cut surface, glossy red smooth"),
    "vena": ("#4e5b8c", "vein, dark bluish red glossy smooth"),
    "encia": ("#dc958c", "human gingiva, pink stippled mucosa"),
    "cartilago": ("#d9e8ef", "hyaline cartilage, smooth glossy bluish white"),
    "osteoide": ("#eed4c9", "unmineralised osteoid matrix, smooth pale pink"),
    "hueso_inmaduro": ("#e2b4a2", "woven bone, irregular coarse pinkish ivory texture"),
    # Materiales de escenas celulares y moleculares (visualización científica): el color suele venir del dibujo
    # (`material@original`) para que cada molécula siga distinguiéndose.
    "membrana_lipidica": (
        "#e6c58a",
        "phospholipid bilayer molecular rendering, densely packed glossy lipid head groups",
    ),
    "proteina": (
        "#8a6fe0",
        "molecular surface rendering of a protein, bumpy glossy atomic spheres, scientific visualization",
    ),
    "citoplasma": ("#f0eaff", "cell cytoplasm, translucent fine granular gel, microscopy"),
    "liquido": ("#d4eefa", "clear extracellular fluid, translucent with very fine suspended fibrils"),
    "colageno": ("#e9c98f", "collagen fibrils, aligned fibrous bundles with periodic banding, electron microscopy"),
    "actina": ("#9a86c8", "actin filament bundles, fine twisted protein filaments, electron microscopy"),
    "mineral": ("#cfe1f2", "hydroxyapatite crystal platelets, glassy mineral crystals, electron microscopy"),
    "liso": ("#ffffff", "smooth glossy surface, subtle fine noise"),
    "celula": ("#b893cf", "living cell surface, smooth translucent membrane with fine granular texture, microscopy"),
    "nucleo": ("#3b2f86", "cell nucleus chromatin, dark granular speckled texture, microscopy"),
    "sangre": ("#c9473e", "red blood cells packed in plasma, glossy red discs, microscopy"),
    "organo": ("#c98a70", "glossy organ surface, smooth moist tissue, anatomical specimen"),
    "periostio": (
        "#e3cabd",
        "thin glistening dense fibrous connective tissue membrane, whitish pink, fine parallel collagen fibres, tiny vessels",
    ),
    "fibrocartilago": (
        "#ece6d8",
        "dense white fibrocartilage, opaque smooth glossy surface with faint parallel collagen fibre striations",
    ),
    "tejido_embrionario": (
        "#ecc9bd",
        "translucent pale pink embryonic tissue, smooth moist surface, soft subsurface scattering, fine cellular grain",
    ),
    "mesenquima": (
        "#e6d9e6",
        "loose embryonic mesenchyme, translucent gelatinous ground substance with sparse stellate cells and fine fibrils",
    ),
    "germen_dental": ("#efe0c8", "soft translucent embryonic tooth bud, glossy gelatinous surface"),
    "adn": (
        "#b7b0e8",
        "DNA double helix strands, twisted backbones with base-pair rungs, smooth molecular surface rendering",
    ),
    "mitocondria": (
        "#d9a69c",
        "elongated mitochondrion with folded inner cristae, smooth outer membrane, granular pale matrix, electron micrograph",
    ),
    "tejido_granulacion": (
        "#e9a79f",
        "granulation tissue, soft moist pink loose connective tissue dotted with tiny capillary loops and cells",
    ),
    "ligamento_hialinizado": (
        "#ecdde4",
        "hyalinized periodontal ligament, glassy homogeneous acellular pale pink connective tissue, smooth",
    ),
    "piel": (
        "#e8c2a8",
        "human skin surface, fine pores and subtle creases, soft subsurface scattering, even natural tone",
    ),
}

ESTILO_TEXTURA = "seamless flat texture, macro photograph, even diffuse lighting, no shadows, sharp focus, top view"
NEGATIVO_TEXTURA = "text, letters, frame, border, vignette, object, tooth shape, perspective, shadow"

LUZ = np.array([-0.45, -0.6, 0.66]) / np.linalg.norm([-0.45, -0.6, 0.66])
MEDIO = (LUZ + np.array([0, 0, 1.0])) / np.linalg.norm(LUZ + np.array([0, 0, 1.0]))


def hex_rgb(h: str) -> np.ndarray:
    h = h.strip().lstrip("#")
    if len(h) == 3:  # #fff -> #ffffff
        h = "".join(c * 2 for c in h)
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def _png(texto: str, ancho: int, nitido: bool) -> np.ndarray:
    import resvg_py

    opciones = {"shape_rendering": "crisp_edges"} if nitido else {}
    datos = resvg_py.svg_to_bytes(svg_string=texto, width=ancho, **opciones)
    return np.asarray(Image.open(io.BytesIO(bytes(datos))).convert("RGBA"), np.float32) / 255


def mapa_de_tejidos(texto: str, tejidos: dict[str, str], ancho: int) -> tuple[np.ndarray, list[str], np.ndarray]:
    """Etiqueta por píxel (índice en la lista de tejidos, -1 fuera del dibujo) y alfa suavizado del dibujo."""
    base = svg_fondo.svg_sin_capas(texto, [])
    nitido = _png(base, ancho, True)
    suave = _png(base, ancho, False)
    nombres = sorted(set(tejidos.values()))
    colores = np.array([hex_rgb(c) for c in tejidos], np.float32)
    indices = np.array([nombres.index(t) for t in tejidos.values()])
    # Un mismo material con colores distintos son entradas distintas: «proteina@original#2bb0c8».
    rgb = nitido[..., :3]
    distancia = np.linalg.norm(rgb[:, :, None, :] - colores[None, None], axis=3)
    cercano = distancia.argmin(axis=2)
    etiqueta = np.where(distancia.min(axis=2) < 0.035, indices[cercano], -1).astype(np.int32)
    dentro = nitido[..., 3] > 0.5
    etiqueta[~dentro] = -2
    # Zonas grandes sin tejido asignado (fondos de panel, rellenos semitransparentes): conservan su propio color, con
    # textura lisa. Las pequeñas (contornos, trazos de dibujo) se reparten abajo entre los tejidos vecinos.
    sin = (etiqueta == -1).astype(np.uint8)
    n, comp, stats, _ = cv2.connectedComponentsWithStats(sin, connectivity=4)
    minimo = 0.004 * etiqueta.size
    for k in range(1, n):
        if stats[k, cv2.CC_STAT_AREA] < minimo:
            continue
        zona = comp == k
        tono = np.median(rgb[zona], axis=0)
        nombre = "liso@#" + "".join(f"{round(float(c) * 255):02x}" for c in tono)
        if nombre not in nombres:
            nombres.append(nombre)
        etiqueta[zona] = nombres.index(nombre)
    # Contornos y colores sin tejido: al tejido más cercano.
    sin = etiqueta == -1
    if sin.any():
        mejor = np.full(etiqueta.shape, np.inf, np.float32)
        nueva = etiqueta.copy()
        for k in range(len(nombres)):
            d = cv2.distanceTransform((etiqueta != k).astype(np.uint8), cv2.DIST_L2, 5)
            cambiar = sin & (d < mejor)
            nueva[cambiar] = k
            mejor = np.minimum(mejor, np.where(sin, d, np.inf))
        etiqueta = nueva
    return etiqueta, nombres, suave[..., 3]


def textura_en_color(textura: np.ndarray, color: np.ndarray) -> np.ndarray:
    """Lleva la textura al color natural en Lab: conserva el detalle (desviación de luminancia y tono) y no su media."""
    lab = cv2.cvtColor(textura.astype(np.float32), cv2.COLOR_RGB2LAB)
    meta = cv2.cvtColor(color.reshape(1, 1, 3), cv2.COLOR_RGB2LAB)[0, 0]
    media = lab.reshape(-1, 3).mean(0)
    desv = lab.reshape(-1, 3).std(0) + 1e-6
    lab = (lab - media) * np.array([0.6, 0.35, 0.35]) * (np.array([12.0, 6.0, 6.0]) / desv) + meta
    return np.clip(cv2.cvtColor(lab.astype(np.float32), cv2.COLOR_LAB2RGB), 0, 1)


def mosaico(textura: np.ndarray, alto: int, ancho: int, escala: float) -> np.ndarray:
    """Cubre alto x ancho repitiendo la textura en espejo (sin costuras visibles)."""
    t = cv2.resize(textura, None, fx=escala, fy=escala, interpolation=cv2.INTER_AREA)
    reps = (alto // t.shape[0] + 2, ancho // t.shape[1] + 2)
    fila = np.concatenate([t if j % 2 == 0 else t[:, ::-1] for j in range(reps[1])], axis=1)
    todo = np.concatenate([fila if i % 2 == 0 else fila[::-1] for i in range(reps[0])], axis=0)
    return todo[:alto, :ancho]


def componer(
    etiqueta: np.ndarray, nombres: list[str], alfa: np.ndarray, texturas: dict[str, np.ndarray]
) -> Image.Image:
    alto, ancho = etiqueta.shape
    escala = ancho / 1600
    salida = np.zeros((alto, ancho, 3), np.float32)
    altura = np.zeros((alto, ancho), np.float32)
    for k, nombre in enumerate(nombres):
        mascara = (etiqueta == k).astype(np.uint8)
        if not mascara.any():
            continue
        material, _, tono = nombre.partition("@")
        color = hex_rgb(tono or TEJIDOS[material][0])
        tex = mosaico(textura_en_color(texturas[material], color), alto, ancho, 0.55 * escala)
        suave = cv2.GaussianBlur(mascara.astype(np.float32), (0, 0), 0.8)
        salida = salida * (1 - suave[..., None]) + tex * suave[..., None]
        dist = cv2.distanceTransform(mascara, cv2.DIST_L2, 5)
        cupula = np.sqrt(np.clip(dist / (14 * escala), 0, 1))
        lum = cv2.cvtColor(tex, cv2.COLOR_RGB2GRAY)
        altura = altura * (1 - suave) + (cupula + 0.25 * (lum - lum.mean())) * suave
    gy, gx = np.gradient(cv2.GaussianBlur(altura, (0, 0), 1.2 * escala))
    normal = np.dstack([-gx * 7 / escala, -gy * 7 / escala, np.ones_like(gx)])
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    difusa = np.clip(normal @ LUZ, 0, 1)
    brillo = np.clip(normal @ MEDIO, 0, 1) ** 40
    hueco = np.clip(cv2.GaussianBlur(altura, (0, 0), 18 * escala) - altura, 0, None)
    oclusion = np.clip(1 - 0.9 * hueco, 0.6, 1)
    final = salida * (0.5 + 0.6 * difusa)[..., None] * oclusion[..., None] + 0.12 * brillo[..., None]
    rgba = np.dstack([np.clip(final, 0, 1), alfa])
    return Image.fromarray((rgba * 255).astype(np.uint8), "RGBA")


BIBLIOTECA = imagenes.TRABAJO.parent / "texturas"


def texturas_que_faltan(nombres: list[str], semilla: int = 1) -> list[str]:
    return [n for n in nombres if not (BIBLIOTECA / f"{n}_s{semilla}.png").exists()]


def texto_textura(n: str) -> tuple[str, str]:
    return (f"{TEJIDOS[n][1]}, {ESTILO_TEXTURA}", NEGATIVO_TEXTURA)


def texto_realismo(e: dict) -> tuple[str, str]:
    return (f"{e['prompt'].strip()}, photorealistic, highly detailed", imagenes.NEGATIVO)


def generar_texturas(nombres: list[str], semilla: int, pipes=None) -> dict[str, np.ndarray]:
    """Texturas de la biblioteca (~/ova-imagenes/texturas/{tejido}_s{semilla}.png); genera solo las que faltan, con
    el modelo ya cargado (`pipes`): cargarlo dos veces desborda los 8 GB y lo hace todo unas cinco veces más lento."""
    BIBLIOTECA.mkdir(parents=True, exist_ok=True)
    texturas = {}
    faltan = []
    for n in nombres:
        ruta = BIBLIOTECA / f"{n}_s{semilla}.png"
        if ruta.exists():
            texturas[n] = np.asarray(Image.open(ruta).convert("RGB"), np.float32) / 255
        else:
            faltan.append(n)
    if faltan:
        for n, t in _generar(faltan, semilla, pipes).items():
            Image.fromarray((t * 255).astype(np.uint8)).save(BIBLIOTECA / f"{n}_s{semilla}.png")
            texturas[n] = t
    return texturas


def _generar(nombres: list[str], semilla: int, pipes) -> dict[str, np.ndarray]:
    import torch
    from diffusers import StableDiffusionXLPipeline

    textos = [texto_textura(n) for n in nombres]
    pipe, _, codificados, _ = pipes
    t2i = StableDiffusionXLPipeline(
        vae=pipe.vae,
        text_encoder=None,
        text_encoder_2=None,
        tokenizer=pipe.tokenizer,
        tokenizer_2=pipe.tokenizer_2,
        unet=pipe.unet,
        scheduler=pipe.scheduler,
    )
    texturas = {}
    for n, (prompt, _) in zip(nombres, textos, strict=True):
        imagen = t2i(
            **codificados[prompt],
            width=1024,
            height=1024,
            num_inference_steps=6,
            guidance_scale=1.5,
            generator=torch.Generator("cpu").manual_seed(semilla),
        ).images[0]
        texturas[n] = np.asarray(imagen.convert("RGB"), np.float32) / 255
    return texturas


def tejidos_de(e: dict) -> dict[str, str]:
    """Mapa color del dibujo -> «material@#color» de un encargo."""
    tejidos = {}
    for color, valor in e["tejidos"].items():
        color = color.lower()
        material, _, tono = str(valor).partition("@")
        tono = color if tono == "original" else (tono or TEJIDOS.get(material, ("#ffffff",))[0])
        tejidos[color] = f"{material}@{tono.lower()}"
    desconocidos = {v.split("@")[0] for v in tejidos.values()} - set(TEJIDOS)
    if desconocidos:
        sys.exit(f"{e['nombre']}: materiales sin definir en TEJIDOS: {sorted(desconocidos)}")
    return tejidos


def realismo(elegidos: list[dict], fuerza: float, n: int, pipes) -> None:
    """Repintado fotorrealista suave (img2img, sin bordes) sobre la base texturizada: s{k}_texia.png, k = 1..n.

    A 0,5 conserva la geometría del dibujo y da aspecto real; por encima empieza a inventar (probado el 2026-10-25).
    """
    import math

    import torch

    textos = [texto_realismo(e) for e in elegidos]
    _, refinador, codificados, _ = pipes
    for e, (prompt, _) in zip(elegidos, textos, strict=True):
        carpeta = imagenes.TRABAJO / e["nombre"]
        base = Image.open(carpeta / "s1_tex.png").convert("RGBA")
        fondo = Image.new("RGBA", base.size, (245, 247, 250, 255))
        fondo.alpha_composite(base)
        w = 1024
        h = round(w * base.height / base.width / 8) * 8
        entrada = fondo.convert("RGB").resize((w, h), Image.LANCZOS)
        candidatas = []
        for k in range(1, n + 1):
            imagen = refinador(
                **codificados[prompt],
                image=entrada,
                strength=fuerza,
                num_inference_steps=math.ceil(6 / fuerza),
                guidance_scale=1.5,
                generator=torch.Generator("cpu").manual_seed(k),
            ).images[0]
            imagen.save(carpeta / f"s{k}_texia.png")
            candidatas.append((k, imagen))
        bordes = Image.open(carpeta / "bordes.png") if (carpeta / "bordes.png").exists() else None
        if bordes is None:
            imagenes.preparar(e)
            bordes = Image.open(carpeta / "bordes.png")
        imagenes.hoja(carpeta, candidatas, bordes.convert("RGB").resize((w, h)), "_texia")
        print(f"{e['nombre']}: {n} candidatas realistas", flush=True)


def main() -> None:
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("nombres", nargs="+")
    a.add_argument("--ancho", type=int, default=1600)
    a.add_argument("--realismo", type=float, default=0.5, help="fuerza del repintado realista (0 = solo texturas)")
    a.add_argument("--n", type=int, default=2)
    a.add_argument("--rehacer", action="store_true", help="rehace también lo que ya existe")
    args = a.parse_args()
    todos = imagenes.encargos()
    elegidos = [todos[x] for x in args.nombres]

    def hecho(e: dict, archivo: str) -> bool:
        return not args.rehacer and (imagenes.TRABAJO / e["nombre"] / archivo).exists()

    sin_base = [e for e in elegidos if not hecho(e, "s1_tex.png")]
    sin_realismo = [e for e in elegidos if args.realismo > 0 and not hecho(e, f"s{args.n}_texia.png")]
    mapas = {}
    materiales: set[str] = set()
    for e in sin_base:
        etiqueta, nombres, alfa = mapa_de_tejidos(imagenes.svg_original(e), tejidos_de(e), args.ancho)
        mapas[e["nombre"]] = (etiqueta, nombres, alfa)
        materiales |= {x.split("@")[0] for x in nombres}
    faltan = texturas_que_faltan(sorted(materiales))
    # Un solo modelo en la GPU para todo: texturas que falten y repintado.
    pipes = None
    if faltan or sin_realismo:
        pipes = imagenes.cargar_pipeline(
            [texto_textura(m) for m in faltan] + [texto_realismo(e) for e in sin_realismo], con_adaptador=False
        )
    texturas = generar_texturas(sorted(materiales), 1, pipes)
    for e in sin_base:
        carpeta = imagenes.TRABAJO / e["nombre"]
        carpeta.mkdir(parents=True, exist_ok=True)
        etiqueta, nombres, alfa = mapas[e["nombre"]]
        componer(etiqueta, nombres, alfa, texturas).save(carpeta / "s1_tex.png")
        print(f"{e['nombre']}: base texturizada", flush=True)
    if sin_realismo:
        realismo(sin_realismo, args.realismo, args.n, pipes)


if __name__ == "__main__":
    main()
