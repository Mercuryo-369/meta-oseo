# Ilustraciones realistas bajo las multicapa

Convierte el dibujo plano de una actividad multicapa en una **ilustración médica realista** sin perder lo que la
actividad necesita: cada estructura sigue en el mismo sitio y se sigue tocando.

- La ilustración (WebP) va **debajo**, en el campo `fondo` de la config (docs/content-schema.md).
- El SVG va **encima**:
  - Las estructuras quedan invisibles pero tocables, y al elegirlas se dibuja su contorno sobre la ilustración.
  - Lo que la IA no puede dibujar con exactitud queda dibujado en SVG nítido: moléculas, receptores y flechas. Son
    las capas «glifo» del encargo.
- Todo se genera en local, en la RTX 4060 (8 GB), con modelos de licencia abierta. No sale nada del equipo.

## Por qué así (lo que no funcionó)

| Intento | Resultado |
|---|---|
| FLUX.1-schnell a partir del SVG (img2img) | Hereda el trazo plano: parece un dibujo, con letras inventadas. 33 min por imagen (la VRAM se desbordaba). |
| FLUX solo con texto | Realista, pero compone a su manera (cortes redondos vistos desde arriba, «medusas»): las zonas no caen en su sitio. |
| SDXL + bordes del SVG, una pasada | Alineación exacta, pero aspecto de diagrama. Con poca fuerza en los bordes, se pierde la estructura. |
| **SDXL + bordes (estructura) y repintado sin bordes (refinado)** | **Alineado y con textura, volumen y luz realistas. ~40 s por candidata.** |

## Modelos (Hugging Face, sin cuenta)

| Uso | Modelo | Licencia |
|---|---|---|
| Generador | `SG161222/RealVisXL_V5.0_Lightning` (SDXL, 6 pasos) | OpenRAIL++ (uso comercial permitido) |
| Control por bordes | `TencentARC/t2i-adapter-canny-sdxl-1.0` | Apache 2.0 |
| VAE en fp16 | `madebyollin/sdxl-vae-fp16-fix` | MIT |

Reparto de memoria:
- Los codificadores de texto codifican todos los encargos y vuelven a la RAM.
- El UNet, el VAE y el adaptador quedan fijos en la GPU (5,6 GB) y los comparten las dos pasadas.
- No se usa `enable_model_cpu_offload` ni `from_pipe`: duplicaban el UNet en la GPU.

## Entorno (fuera del repo, una vez)

Los pesos ocupan unos 7 GB. El entorno y la caché viven en `%USERPROFILE%\ova-imagenes`:

```bash
cd ~/ova-imagenes
uv venv --python 3.12 .venv
uv pip install --python .venv/Scripts/python.exe torch --index-url https://download.pytorch.org/whl/cu128
uv pip install --python .venv/Scripts/python.exe diffusers transformers accelerate safetensors pillow pyyaml \
  opencv-python-headless resvg-py
export HF_HOME="$HOME/ova-imagenes/hf"     # caché de modelos (se descargan en el primer `generar`)
```

## Flujo por imagen

Desde la raíz del repo, con `PY=~/ova-imagenes/.venv/Scripts/python.exe`:

1. **Encargo.** Se añade una entrada a [encargos.yaml](encargos.yaml) con estos campos:
   - `nombre` y `modulo`.
   - `glifos`: las capas que se quedan dibujadas encima.
   - `prompt`: en inglés y breve. Va primero lo propio de la escena; CLIP corta a 77 tokens.
   - Nunca nombrar «text», «label» ni «8k»: el modelo los dibuja.
2. **Candidatas.** `$PY tools/imagenes/imagenes.py generar NOMBRE --n 6`
   - Deja en `~/ova-imagenes/trabajo/NOMBRE/` el boceto, los bordes, `e{n}.png` (pasada de estructura), `s{n}.png`
     (refinada) y **`hoja.png`**.
   - La hoja muestra cada candidata limpia y con los bordes del SVG en cian: así se ve de un vistazo si cada
     estructura cae en su zona.
   - Ajustes útiles:
     - `--refinar` (0,5–0,7): más alto da más realismo y algo menos de fidelidad.
     - `--escala` y `--factor`: fuerza de los bordes en la primera pasada.
     - `--semilla` y `--sufijo`: para probar sin pisar candidatas anteriores.
3. **Elegir.** Se anota la `semilla` en el encargo. Es material de un trabajo universitario: la anatomía debe ser
   **exacta**, no solo plausible. Se descarta la candidata si:
   - Alguna estructura no cae dentro de su contorno.
   - Tiene un color o una textura que no corresponde: una corona que no es esmalte blanco, una raíz con aspecto de
     madera, un diente con forma de implante.
   - Tiene texto o artefactos.
   - Inventa estructuras. Las que caen fuera de la silueta se recortan solas (paso 4); las que caen dentro, no.

   Ante la duda, la actividad se queda con su SVG. La ilustración es un apoyo visual: lo que se evalúa sigue
   siendo el dibujo validado y sus capas.
4. **Integrar.** `$PY tools/imagenes/imagenes.py integrar NOMBRE --semilla K [--sufijo _x]`
   - Escribe `public/images/mX/NOMBRE.webp` a 1200 px de ancho, normalmente menos de 150 KB.
   - **Recorta la ilustración a la silueta del SVG** (sin rótulos): fuera, transparente. La IA rellena a su manera lo
     que el dibujo deja vacío (dientes vecinos, cráneos) y eso no llega a la actividad.
   - Transforma el SVG de capas para ir encima.
   - Añade `fondo` a la config.
   - Si el mismo SVG se usa fuera de la multicapa (imagen, vídeo, arrastre), lo conserva y escribe las zonas en
     `NOMBRE_zonas.svg`.
5. **Verificar.** El flujo normal de contenido:
   - `prettier` del content.json.
   - `validar-modulo.mjs`.
   - `build_manifest` y `build_corpus --comprobar`.
   - Pruebas.

Para deshacer una imagen basta con `git checkout` del SVG y del content.json, y borrar el WebP.

Pruebas de la parte sin GPU:

```bash
uv run --no-project --with pytest python -m pytest tools/imagenes/tests -q
uvx ruff check tools/imagenes --config tools/imagenes/ruff.toml && uvx ruff format --check tools/imagenes --config tools/imagenes/ruff.toml
```

## Resultado (2026-10-18)

**En uso: solo el osteoclasto (`m2_osteoclasto_resorcion`).** Se integró la corrección por capas (`corregir`) que
convierte la zona clara en el pie del citoplasma sellado contra el hueso.

Al revisarlas a tamaño completo, estructura por estructura, las otras 9 ilustraciones tenían errores histológicos.
Por ejemplo, el hueso laminar salía como bandas con cavidades, la osteona con radios y la cortical osteoporótica
gruesa. `corregir` tampoco los arregló, porque el modelo no conoce la histología. Esas 9 actividades se convirtieron
en **exploraciones 3D con modelos construidos por código** (docs/realismo-3d.md, `scenes/modelosPorCodigo.ts`):
- Exactas por construcción.
- Con los materiales realistas de las demás escenas.
- Las de modo identificar lo conservan (`config.modo`).

Las 8 multicapa que no lograron una candidata exacta siguen con su SVG:
- `m1_wolff_femur`
- `m2_osteoblasto_activo`
- `m2_osteocito_lagunar`
- `m3_mandibula_desarrollo`
- `m1_proceso_alveolar_corte`
- `m5_hueso_cortical_trabecular_alveolar`
- `m5_movimiento_ortodontico_pdl`
- `m5_cicatrizacion_alveolo_fases`

**Pauta para usar este flujo en el futuro.** El modelo general (RealVisXL) acierta con superficies y volúmenes, pero no
con la histología ni con los dientes. Solo sirve para escenas celulares sencillas. Cada ilustración la revisa a tamaño
completo alguien con formación en histología y la aprueba el docente. Ante la duda, un modelo 3D por código.

## Provisionales en uso (2026-10-25)

Decisión de la usuaria: hasta que estén las versiones exactas, se usan las candidatas más recientes y más parecidas a
su dibujo, aunque tengan errores. Cada una está marcada con `estado: provisional` y la lista `corregir` en
[encargos.yaml](encargos.yaml), y como pendiente en `estado_revision` de su módulo (aparece en
docs/revision-docente.md):

| SVG | Errores a corregir |
|---|---|
| `m1_proceso_alveolar_corte` | Corona con vasos y forma irreal; raíz con aspecto de varios conductos; conducto mandibular sin paquete definido |
| `m1_wolff_femur` | Cabeza femoral sin forma anatómica; trabéculas pintadas que no siguen los sistemas del dibujo |
| `m2_osteoblasto_activo` | Osteoblastos como cajas; orgánulos no reconocibles; célula de revestimiento no plana |
| `m2_osteocito_lagunar` | Núcleo gigante separado del cuerpo; prolongaciones que no salen del cuerpo; lagunas como dianas |
| `m3_mandibula_desarrollo` | No distingue Meckel del hueso intramembranoso; gérmenes como coronas adultas; proporciones adultas |
| `m5_hueso_cortical_trabecular_alveolar` | Premolar con dos raíces (el dibujo tiene una); hueso basal y conducto poco definidos |
| `m5_movimiento_ortodontico_pdl` | Dentina naranja con estrías; diente vecino inventado; ligamento sin compresión y tensión |
| `m5_cicatrizacion_alveolo_fases` | Cavidades a los lados que parecen alvéolos; fases de cicatrización no diferenciadas |

**Cómo se corregirán.** Con `texturizar.py` (en preparación). La forma sale del SVG validado, píxel a píxel, y la IA
solo pone texturas de tejido real con la paleta común de docs/realismo-3d.md. Así no puede inventar anatomía. El mapa
color del dibujo → tejido de cada encargo va en `tejidos`.

