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

## Resultado de la primera pasada (2026-10-18)

**Con ilustración (10):**

| Módulo | SVG |
|---|---|
| m1 | `m1_corte_hueso_capas`, `m1_osteona_detalle`, `m1_entretejido_laminar` |
| m2 | `m2_osteoclasto_resorcion`, `m2_ligamento_periodontal` |
| m3 | `m3_osteoide_hueso_inmaduro`, `m3_osteocito_red_lacuno_canalicular` |
| m4 | `m4_frente_mineralizacion` |
| m6 | `m6_tejido_oseo_envejecido`, `m6_hueso_normal_osteoporotico` |

**Siguen en SVG por falta de exactitud anatómica tras dos tandas (8):**

| SVG | Motivo |
|---|---|
| `m1_wolff_femur` | Cabeza femoral sin forma real. |
| `m2_osteoblasto_activo` | Células como cajas. |
| `m2_osteocito_lagunar` | Núcleo gigante sin citoplasma. |
| `m3_mandibula_desarrollo` | Dentaduras adultas. |
| `m1_proceso_alveolar_corte`, `m5_hueso_cortical_trabecular_alveolar` | Coronas con vasos y raíces distintas a las del dibujo. |
| `m5_movimiento_ortodontico_pdl`, `m5_cicatrizacion_alveolo_fases` | Dientes y cavidades inventados. |

**La pauta.** El modelo acierta con los tejidos y la histología. Falla con los dientes, la anatomía macroscópica
compleja y los orgánulos. Para esos casos, la vía exacta es un modelo 3D o un render hecho a mano, no la IA.

## Qué SVG convertir (propuesta, a revisar con el docente)

**Escenas anatómicas, histológicas o celulares: ganan con la ilustración.**

| Módulo | SVG |
|---|---|
| m1 | `m1_corte_hueso_capas`, `m1_osteona_detalle`, `m1_proceso_alveolar_corte`, `m1_entretejido_laminar`, `m1_wolff_femur` |
| m2 | `m2_osteoclasto_resorcion` (piloto), `m2_osteoblasto_activo`, `m2_osteocito_lagunar`, `m2_ligamento_periodontal` |
| m3 | `m3_mandibula_desarrollo`, `m3_osteoide_hueso_inmaduro`, `m3_osteocito_red_lacuno_canalicular` |
| m4 | `m4_frente_mineralizacion` |
| m5 | `m5_hueso_cortical_trabecular_alveolar`, `m5_movimiento_ortodontico_pdl`, `m5_cicatrizacion_alveolo_fases` |
| m6 | `m6_tejido_oseo_envejecido`, `m6_hueso_normal_osteoporotico` |

**Esquemas: se quedan en SVG.** Son vías de señalización, gráficas, mapas y balances, y ahí la ilustración realista
no aporta nada:

| Módulo | SVG |
|---|---|
| m3 | `m3_sensores_mecanicos` (membrana y moléculas), `m3_rutas_formacion_osea`, `m3_mecanostato_ventanas`, `m3_bmp_runx2_osterix`, `m3_via_wnt_esclerostina` |
| m4 | `m4_fibrilla_colageno`, `m4_fibrilla_mineralizada` (escala molecular), `m4_composicion_matriz`, `m4_homeostasis_calcio_fosfato` |
| m5 | `m5_ciclo_remodelado_bmu` (línea de tiempo: la IA inventa rótulos), `m5_hormonas_regulacion_calcemia`, `m5_equilibrio_remodelado_alteraciones`, `m5_acoplamiento_matriz_esclerostina`, `m5_osteoclastogenesis_rank_rankl_opg` |
| m6 | `m6_curva_masa_osea`, `m6_prevencion_mapa` |

Las imágenes estáticas (`tipo: imagen`) y los fondos de arrastre o vídeo siguen siendo SVG. Si se quiere
ilustrarlos, se puede reutilizar el WebP de su multicapa como `src`, pero eso pierde los glifos.
