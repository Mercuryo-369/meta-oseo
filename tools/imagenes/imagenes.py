"""Ilustraciones realistas bajo las capas de las actividades multicapa (tools/imagenes/README.md).

  preparar  NOMBRE...           SVG -> boceto de bordes (solo las estructuras que pinta la IA)
  generar   NOMBRE... [--n 4]   candidatas en dos pasadas (estructura guiada por los bordes del SVG + refinado
                                realista) y hoja de revisión con los bordes superpuestos
  corregir  NOMBRE... [--n 3]   repinta solo las zonas de `correcciones` del encargo (capas del SVG o regiones) sobre
                                la candidata elegida, con su descripción precisa; hoja antes/después
  integrar  NOMBRE --semilla K  WebP en public/images, SVG de zonas encima y `fondo` en content.json

Se ejecuta con el entorno de la GPU (fuera del repo, ver README): torch solo se importa en `generar`.
"""

from __future__ import annotations

import argparse
import io
import os
import sys
import time
from pathlib import Path

import yaml
from PIL import Image, ImageDraw, ImageOps

sys.path.insert(0, str(Path(__file__).parent))
import svg_fondo

RAIZ = Path(__file__).resolve().parents[2]
PUBLICO = RAIZ / "apps/web/public"
TRABAJO = Path(os.environ.get("OVA_IMAGENES", Path.home() / "ova-imagenes")) / "trabajo"

MODELO = "SG161222/RealVisXL_V5.0_Lightning"  # OpenRAIL++ (uso comercial permitido)
ADAPTADOR = "TencentARC/t2i-adapter-canny-sdxl-1.0"  # Apache 2.0
VAE = "madebyollin/sdxl-vae-fp16-fix"  # MIT

# CLIP corta a 77 tokens: lo propio de cada encargo va primero y el estilo, al final y breve.
ESTILO = "photorealistic 3D medical render, subsurface scattering, studio lighting"
NEGATIVO = (
    "cartoon, flat vector illustration, drawing, sketch, clipart, text, letters, words, watermark, label, "
    "lowres, blurry, deformed"
)
ANCHO_WEBP = 1200


def encargos() -> dict[str, dict]:
    datos = yaml.safe_load((Path(__file__).parent / "encargos.yaml").read_text(encoding="utf-8"))
    return {e["nombre"]: e for e in datos["encargos"]}


def ruta_svg(e: dict) -> Path:
    return PUBLICO / "images" / e["modulo"] / f"{e['nombre']}.svg"


def png_de_svg(texto: str, ancho: int, alto: int, fondo: str | None = "#ffffff") -> Image.Image:
    import resvg_py

    # resvg conserva la proporción del viewBox: se dibuja a ese ancho y se deforma luego a las medidas de trabajo.
    datos = resvg_py.svg_to_bytes(svg_string=texto, width=ancho, **({"background": fondo} if fondo else {}))
    modo = "RGB" if fondo else "RGBA"
    return Image.open(io.BytesIO(bytes(datos))).convert(modo).resize((ancho, alto), Image.LANCZOS)


def recortar_a_silueta(imagen: Image.Image, texto: str) -> Image.Image:
    """Deja la ilustración solo donde el dibujo validado (el SVG) tiene forma; fuera, transparente.

    La IA rellena a su manera lo que el SVG deja vacío (dientes vecinos, cráneos, otros huesos): eso no corresponde a
    la anatomía del dibujo y no debe llegar a un material docente. La silueta es el SVG sin rótulos (con los glifos),
    con el borde suavizado un píxel.
    """
    from PIL import ImageFilter

    silueta = png_de_svg(svg_fondo.svg_sin_capas(texto, []), imagen.width, imagen.height, fondo=None)
    alfa = silueta.getchannel("A").point(lambda v: 255 if v > 8 else 0).filter(ImageFilter.GaussianBlur(1))
    recortada = imagen.convert("RGBA")
    recortada.putalpha(alfa)
    return recortada


def preparar(e: dict) -> None:
    import cv2
    import numpy as np

    texto = ruta_svg(e).read_text(encoding="utf-8")
    vw, vh = svg_fondo.viewbox(svg_fondo.leer(texto))
    w, h = svg_fondo.tamano_generacion(vw, vh)
    carpeta = TRABAJO / e["nombre"]
    carpeta.mkdir(parents=True, exist_ok=True)
    color = png_de_svg(
        svg_fondo.svg_sin_capas(texto, [] if e.get("boceto_con_glifos") else e.get("glifos", []), e.get("colores", [])),
        w,
        h,
    )
    color.save(carpeta / "boceto.png")
    gris = cv2.cvtColor(np.array(color), cv2.COLOR_RGB2GRAY)
    # Desenfoque y umbrales altos: quedan los contornos de las estructuras, no los adornos pequeños del dibujo.
    bordes = cv2.Canny(cv2.GaussianBlur(gris, (7, 7), 0), 60, 160)
    Image.fromarray(bordes).save(carpeta / "bordes.png")
    print(f"{e['nombre']}: boceto {w}x{h} en {carpeta}")


def prompts(e: dict) -> tuple[str, str]:
    return f"{e['prompt'].strip()}, {ESTILO}", f"{NEGATIVO}, {e.get('negativo', '')}".strip(", ")


def cargar_pipeline(textos: list[tuple[str, str]]):
    """Carga SDXL + adaptador y codifica de una vez los textos de todos los encargos.

    Reparto de los 8 GB a mano (sin `enable_model_cpu_offload`, cuyos ganchos se pisan entre las dos pasadas y
    duplicaban pesos en la GPU): los codificadores de texto (1,6 GB) suben, codifican todo y vuelven a la RAM; después
    quedan fijos en la GPU el UNet (5,1 GB), el VAE y el adaptador, compartidos por las dos pasadas.
    """
    import torch
    from diffusers import (
        AutoencoderKL,
        DPMSolverMultistepScheduler,
        StableDiffusionXLAdapterPipeline,
        StableDiffusionXLImg2ImgPipeline,
        StableDiffusionXLInpaintPipeline,
        T2IAdapter,
    )

    adaptador = T2IAdapter.from_pretrained(ADAPTADOR, torch_dtype=torch.float16, variant="fp16")
    vae = AutoencoderKL.from_pretrained(VAE, torch_dtype=torch.float16)
    pipe = StableDiffusionXLAdapterPipeline.from_pretrained(
        MODELO, adapter=adaptador, vae=vae, torch_dtype=torch.float16, variant="fp16"
    )
    # Lightning: pocos pasos y CFG bajo, con el muestreador que recomienda el modelo (DPM++ SDE Karras).
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config, use_karras_sigmas=True, algorithm_type="sde-dpmsolver++"
    )

    pipe.text_encoder.to("cuda")
    pipe.text_encoder_2.to("cuda")
    codificados = {}
    with torch.no_grad():
        for prompt, negativo in textos:
            emb, emb_neg, pooled, pooled_neg = pipe.encode_prompt(
                prompt=prompt, negative_prompt=negativo, device="cuda", do_classifier_free_guidance=True
            )
            codificados[prompt] = {
                "prompt_embeds": emb,
                "negative_prompt_embeds": emb_neg,
                "pooled_prompt_embeds": pooled,
                "negative_pooled_prompt_embeds": pooled_neg,
            }
    pipe.text_encoder.to("cpu")
    pipe.text_encoder_2.to("cpu")
    pipe.text_encoder = pipe.text_encoder_2 = None  # así el dispositivo de ejecución es la GPU del UNet
    torch.cuda.empty_cache()
    for modulo in (pipe.unet, pipe.vae, pipe.adapter):
        modulo.to("cuda")
    # Construida a mano con los MISMOS módulos: `from_pipe` duplicaba el UNet en la GPU (5,6 -> 10,9 GB).
    refinador = StableDiffusionXLImg2ImgPipeline(
        vae=pipe.vae,
        text_encoder=None,
        text_encoder_2=None,
        tokenizer=pipe.tokenizer,
        tokenizer_2=pipe.tokenizer_2,
        unet=pipe.unet,
        scheduler=pipe.scheduler,
    )
    repintor = StableDiffusionXLInpaintPipeline(
        vae=pipe.vae,
        text_encoder=None,
        text_encoder_2=None,
        tokenizer=pipe.tokenizer,
        tokenizer_2=pipe.tokenizer_2,
        unet=pipe.unet,
        scheduler=pipe.scheduler,
    )
    return pipe, refinador, codificados, repintor


def generar(
    pipes, e: dict, n: int, semilla: int, pasos: int, escala: float, factor: float, refinar: float, sufijo: str = ""
) -> None:
    """Pasada 1: composición fiel al SVG (bordes con fuerza alta), con el aspecto plano del dibujo. Pasada 2: se
    repinta con fuerza `refinar` (0,4-0,6) sin bordes: textura, volumen y luz realistas sin mover las formas."""
    import math

    import torch

    pipe, refinador, codificados, _ = pipes
    carpeta = TRABAJO / e["nombre"]
    bordes = Image.open(carpeta / "bordes.png").convert("RGB")
    w, h = bordes.size
    textos = codificados[prompts(e)[0]]
    t = time.time()
    candidatas = []
    for s in range(semilla, semilla + n):
        estructura = pipe(
            **textos,
            image=bordes,
            width=w,
            height=h,
            num_inference_steps=pasos,
            guidance_scale=1.5,
            adapter_conditioning_scale=escala,
            adapter_conditioning_factor=factor,
            generator=torch.Generator("cpu").manual_seed(s),
        ).images[0]
        estructura.save(carpeta / f"e{s}{sufijo}.png")
        imagen = estructura
        if refinar > 0:
            imagen = refinador(
                **textos,
                image=estructura,
                strength=refinar,
                num_inference_steps=math.ceil(pasos / refinar),
                guidance_scale=1.5,
                generator=torch.Generator("cpu").manual_seed(s),
            ).images[0]
        imagen.save(carpeta / f"s{s}{sufijo}.png")
        candidatas.append((s, imagen))
    print(f"{e['nombre']}: {n} candidatas en {time.time() - t:.0f} s", flush=True)
    hoja(carpeta, candidatas, bordes, sufijo)


def textos_correccion(e: dict) -> list[tuple[str, str]]:
    return [
        (f"{c['prompt'].strip()}, {ESTILO}", f"{NEGATIVO}, {c.get('negativo', '')}".strip(", "))
        for c in e.get("correcciones", [])
    ]


def mascara(e: dict, c: dict, ancho: int, alto: int) -> Image.Image:
    """Máscara de una corrección a las medidas de trabajo: la silueta de sus `capas` en el SVG original, o sus
    `elipses` ([cx, cy, rx, ry] en unidades del viewBox), ensanchada `crecer` píxeles y con el borde suavizado."""
    from PIL import ImageFilter

    texto = (TRABAJO / e["nombre"] / "original.svg").read_text(encoding="utf-8")
    vw, vh = svg_fondo.viewbox(svg_fondo.leer(texto))
    m = Image.new("L", (ancho, alto), 0)
    if c.get("capas"):
        capas = png_de_svg(svg_fondo.svg_solo_capas(texto, c["capas"]), ancho, alto, fondo=None)
        m = capas.getchannel("A").point(lambda v: 255 if v > 8 else 0)
    dibujo = ImageDraw.Draw(m)
    for cx, cy, rx, ry in c.get("elipses", []):
        sx, sy = ancho / vw, alto / vh
        dibujo.ellipse([(cx - rx) * sx, (cy - ry) * sy, (cx + rx) * sx, (cy + ry) * sy], fill=255)
    crecer = int(c.get("crecer", 10))
    if crecer:
        m = m.filter(ImageFilter.MaxFilter(2 * crecer + 1))
    return m.filter(ImageFilter.GaussianBlur(4))


def corregir(pipes, e: dict, n: int, pasos: int) -> None:
    """Aplica en orden las `correcciones` del encargo a su candidata elegida (`semilla` + `sufijo`). Cada versión usa
    otra semilla; se guardan como s{semilla}{sufijo}c{k}.png con una hoja antes/después."""
    import math

    import torch

    _, _, codificados, repintor = pipes
    carpeta = TRABAJO / e["nombre"]
    base_nombre = f"s{e['semilla']}{e.get('sufijo', '')}"
    base = Image.open(carpeta / f"{base_nombre}.png").convert("RGB")
    w, h = base.size
    versiones = []
    for k in range(1, n + 1):
        imagen = base
        for i, c in enumerate(e["correcciones"]):
            fuerza = float(c.get("fuerza", 0.85))
            textos = codificados[textos_correccion(e)[i][0]]
            imagen = repintor(
                **textos,
                image=imagen,
                mask_image=mascara(e, c, w, h),
                width=w,
                height=h,
                strength=fuerza,
                num_inference_steps=math.ceil(pasos / fuerza),
                guidance_scale=1.5,
                generator=torch.Generator("cpu").manual_seed(100 * k + i),
            ).images[0]
        imagen.save(carpeta / f"{base_nombre}c{k}.png")
        versiones.append((k, imagen))
    lado = 560
    esc = lado / max(w, h)
    tw, th = round(w * esc), round(h * esc)
    lienzo = Image.new("RGB", (tw * (n + 1) + 10 * n, th + 24), (24, 24, 28))
    dib = ImageDraw.Draw(lienzo)
    for i, (rotulo, im) in enumerate([("antes", base), *[(f"c{k}", v) for k, v in versiones]]):
        dib.text((i * (tw + 10) + 6, 4), rotulo, fill=(230, 230, 230))
        lienzo.paste(im.resize((tw, th)), (i * (tw + 10), 24))
    lienzo.save(carpeta / "hoja_correccion.png")
    print(f"{e['nombre']}: {n} correcciones; hoja en {carpeta / 'hoja_correccion.png'}", flush=True)


def hoja(carpeta: Path, candidatas: list[tuple[int, Image.Image]], bordes: Image.Image, sufijo: str = "") -> None:
    """Hoja de revisión: cada candidata en pequeño, a la izquierda limpia y a la derecha con los bordes del SVG."""
    lado = 384
    escala = lado / max(bordes.size)
    tw, th = round(bordes.width * escala), round(bordes.height * escala)
    mascara = ImageOps.grayscale(bordes).resize((tw, th)).point(lambda v: 170 if v > 40 else 0)
    cian = Image.new("RGB", (tw, th), (0, 230, 255))
    lienzo = Image.new("RGB", (2 * tw + 12, len(candidatas) * (th + 28)), (24, 24, 28))
    dibujo = ImageDraw.Draw(lienzo)
    for i, (s, imagen) in enumerate(candidatas):
        y = i * (th + 28)
        pequena = imagen.resize((tw, th))
        dibujo.text((6, y + 6), f"semilla {s}", fill=(230, 230, 230))
        lienzo.paste(pequena, (0, y + 24))
        lienzo.paste(Image.composite(cian, pequena, mascara), (tw + 12, y + 24))
    lienzo.save(carpeta / f"hoja{sufijo}.png")
    print(f"hoja de revisión: {carpeta / f'hoja{sufijo}.png'}")


def integrar(e: dict, semilla: int, sufijo: str = "") -> None:
    carpeta = TRABAJO / e["nombre"]
    svg = ruta_svg(e)
    texto = svg.read_text(encoding="utf-8")
    if svg_fondo.MARCA in texto:
        sys.exit(f"{svg.name} ya es un SVG de zonas: restaurar el original (git checkout) antes de integrar de nuevo")
    (carpeta / "original.svg").write_text(texto, encoding="utf-8")
    raiz = svg_fondo.leer(texto)
    vw, vh = svg_fondo.viewbox(raiz)
    imagen = Image.open(carpeta / f"s{semilla}{sufijo}.png").convert("RGB")
    imagen = imagen.resize((ANCHO_WEBP, round(ANCHO_WEBP * vh / vw)), Image.LANCZOS)
    imagen = recortar_a_silueta(imagen, texto)
    webp = svg.with_suffix(".webp")
    imagen.save(webp, "WEBP", quality=80, method=6)
    fondo = f"/images/{e['modulo']}/{webp.name}"

    ruta = f"/images/{e['modulo']}/{svg.name}"
    usos = svg_fondo.usos_del_svg(RAIZ, ruta)
    otros = [u for u in usos if u[1] != "multicapa"]
    # Si el mismo dibujo se usa también fuera de la multicapa (imagen, vídeo, arrastre), se conserva y las zonas van
    # a un SVG aparte; si no, se transforma en su sitio.
    destino = svg.with_name(f"{svg.stem}_zonas.svg") if otros else svg
    modulo = next((RAIZ / "apps/web/src/modules").glob(f"{e['modulo']}_*/content.json"))
    capas = svg_fondo.capas_de(modulo, ruta)
    destino.write_text(
        svg_fondo.svg_como_zonas(texto, e.get("glifos", []), capas, fondo, e.get("colores", [])),
        encoding="utf-8",
        newline="\n",
    )

    nuevo_svg = f"/images/{e['modulo']}/{destino.name}" if destino != svg else None
    tocadas = svg_fondo.poner_fondo(modulo, ruta, fondo, nuevo_svg)
    print(f"{webp.relative_to(RAIZ)} ({webp.stat().st_size // 1024} KB); zonas en {destino.relative_to(RAIZ)}")
    print(f"fondo en: {', '.join(tocadas) or '(ninguna multicapa)'}; otros usos del SVG: {otros or 'ninguno'}")


def figura(e: dict, semilla: int, sufijo: str) -> None:
    """Imagen final con los rótulos del dibujo encima (texto nítido), para los usos sin capas táctiles: bloques
    `imagen`, fondos de arrastre y portadas. Se guarda como {nombre}_figura.webp y se cambia en content.json."""
    carpeta = TRABAJO / e["nombre"]
    svg = ruta_svg(e)
    texto = svg.read_text(encoding="utf-8")
    if svg_fondo.MARCA in texto:
        sys.exit(f"{svg.name} es un SVG de zonas: usar el original")
    vw, vh = svg_fondo.viewbox(svg_fondo.leer(texto))
    alto = round(ANCHO_WEBP * vh / vw)
    base = Image.open(carpeta / f"s{semilla}{sufijo}.png").convert("RGB").resize((ANCHO_WEBP, alto), Image.LANCZOS)
    base = recortar_a_silueta(base, texto)
    encima = svg_fondo.svg_como_zonas(texto, e.get("glifos", []), [], "(figura)", e.get("colores", []))
    rotulos = png_de_svg(encima, ANCHO_WEBP, alto, fondo=None)
    final = Image.new("RGBA", base.size, (0, 0, 0, 0))
    final.alpha_composite(base)
    final.alpha_composite(rotulos)
    destino = svg.with_name(f"{svg.stem}_figura.webp")
    final.save(destino, "WEBP", quality=82, method=6)
    ruta = f"/images/{e['modulo']}/{svg.name}"
    figura_ruta = f"/images/{e['modulo']}/{destino.name}"
    modulo = next((RAIZ / "apps/web/src/modules").glob(f"{e['modulo']}_*/content.json"))
    tocadas = svg_fondo.usar_figura(modulo, ruta, figura_ruta, ANCHO_WEBP, alto)
    print(
        f"{destino.relative_to(RAIZ)} ({destino.stat().st_size // 1024} KB); usada en: {', '.join(tocadas) or 'nada'}"
    )


def main() -> None:
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("accion", choices=["preparar", "generar", "corregir", "integrar", "figura"])
    a.add_argument("nombres", nargs="*", help="encargos (por defecto, todos los de encargos.yaml)")
    a.add_argument("--n", type=int, default=4)
    a.add_argument("--semilla", type=int, default=1)
    a.add_argument("--pasos", type=int, default=6)
    a.add_argument("--escala", type=float, default=0.9, help="fuerza del boceto de bordes (0-1)")
    a.add_argument("--factor", type=float, default=0.9, help="fracción de los pasos guiada por el boceto")
    a.add_argument("--refinar", type=float, default=0.62, help="fuerza de la pasada realista (0 = sin ella)")
    a.add_argument("--sufijo", default="", help="para probar ajustes sin pisar candidatas: s1{sufijo}.png")
    args = a.parse_args()

    todos = encargos()
    elegidos = [todos[n] for n in args.nombres] if args.nombres else list(todos.values())
    if args.accion == "preparar":
        for e in elegidos:
            preparar(e)
    elif args.accion == "generar":
        for e in elegidos:
            if not (TRABAJO / e["nombre"] / "bordes.png").exists():
                preparar(e)
        pipes = cargar_pipeline([prompts(e) for e in elegidos])
        for e in elegidos:
            generar(pipes, e, args.n, args.semilla, args.pasos, args.escala, args.factor, args.refinar, args.sufijo)
    elif args.accion == "corregir":
        elegidos = [e for e in elegidos if e.get("correcciones")]
        for e in elegidos:
            (TRABAJO / e["nombre"] / "original.svg").write_text(
                ruta_svg(e).read_text(encoding="utf-8"), encoding="utf-8"
            )
        pipes = cargar_pipeline([t for e in elegidos for t in textos_correccion(e)])
        for e in elegidos:
            corregir(pipes, e, args.n, args.pasos)
    elif args.accion == "figura":
        if len(elegidos) != 1:
            a.error("figura: un solo encargo y su --semilla")
        figura(elegidos[0], args.semilla, args.sufijo)
    else:
        if len(elegidos) != 1:
            a.error("integrar: un solo encargo y su --semilla")
        integrar(elegidos[0], args.semilla, args.sufijo)


if __name__ == "__main__":
    main()
