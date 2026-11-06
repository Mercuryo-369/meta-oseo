# Atribuciones y licencias de recursos de terceros

Registro de los recursos externos que viajan con el OVA y de lo que exige cada licencia.
Se actualiza cada vez que se incorpora, modifica o sustituye un recurso.

## Modelo 3D de la mandíbula (provisional, Fase 1)

| Campo | Valor |
|---|---|
| Recurso | BodyParts3D, componente **FJ6399 "Mandible"**, versión 4.3 |
| Autor | The Database Center for Life Science (**DBCLS**), proyecto BodyParts3D / Anatomography |
| Fuente original | <http://lifesciencedb.jp/bp3d/> |
| Página del archivo | <https://commons.wikimedia.org/wiki/File:BodyParts3D_FJ6399_Mandible.stl> (Wikimedia Commons) |
| Descarga | <https://commons.wikimedia.org/wiki/Special:FilePath/BodyParts3D_FJ6399_Mandible.stl> |
| Fechas | Archivo creado el 2014-01-31; subido a Commons el 2018-03-20; descargado para este proyecto el 2026-09-23 |
| Licencia | **Creative Commons Atribución-CompartirIgual 2.1 Japón** (CC BY-SA 2.1 JP) |
| Texto de la licencia | <https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en> |
| Archivo en el repositorio | `apps/web/public/models/mandibula_bodyparts3d.stl` |
| Formato y tamaño | STL binario, 1 151 084 bytes (1,10 MB), 23 020 triángulos, unidades en milímetros. SHA-256 `307b6e9b1b0cf90b0c132ee437e16c1b33edecfb7c42fbecfc936925cd4725d3` |

La licencia y la línea de crédito se tomaron de la página del archivo en Wikimedia Commons,
verificada el 2026-09-23. La página principal de BodyParts3D solo muestra "©2010 DBCLS -
Anatomography" y no enuncia la licencia por sí misma.

### Línea de crédito

La ficha de Commons pide este texto:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan.

En la aplicación aparece en la vista `/demo-mandibula` (`apps/web/src/views/DemoMandibulaView.vue`),
con enlaces a la fuente y a la licencia. **Toda pantalla que muestre este modelo o un derivado
suyo debe llevar esta atribución** (por ejemplo la del Módulo 1 y la del Módulo 5 cuando usen la
mandíbula).

### Cambios realizados (la licencia exige indicarlos)

El archivo `.stl` del repositorio es **idéntico al original**: no se ha editado. La adaptación
ocurre en el navegador al cargarlo (`apps/web/src/scenes/stl.ts`):

1. Rotación de -90º alrededor de X, porque BodyParts3D usa Z como eje vertical y three.js usa Y.
2. Centrado en el origen.
3. Soldado de vértices duplicados y recálculo de normales, para sombreado suave en lugar de
   caras planas.
4. Escalado uniforme para que la esfera envolvente tenga radio 1.

La interfaz lo declara con la nota "reorientado, centrado y reescalado".

### Qué obliga CC BY-SA a los derivados (CompartirIgual)

Cualquier obra derivada del modelo debe distribuirse bajo **la misma licencia (CC BY-SA 2.1 JP)
o una compatible** y con la misma atribución. Esto afecta al trabajo previsto en el plan:

- **F0-08** (refinar la mandíbula en Blender y separar cóndilo, rama, cuerpo, ángulo y sínfisis
  como nodos con nombre) y **F0-09** (exportar el GLB con Draco): el `.blend` y el `.glb`
  resultantes son derivados y deben publicarse con CC BY-SA 2.1 JP y esta atribución. Conviene
  guardar el `.blend` en el repositorio y anotar aquí sus cambios.
- Si el OVA se entrega o se publica con ese GLB, el GLB (no el código de la aplicación) debe
  quedar disponible bajo esa licencia. Este documento no es asesoría jurídica: si el docente o la
  institución van a distribuir el OVA fuera del curso, conviene que alguien confirme cómo
  se combina la licencia del modelo con la del resto del contenido.
- Un modelo distinto (por ejemplo el de AnatomyTOOL, ver `docs/referencias.md`) exige revisar su
  propia licencia antes de usarlo.

## Bibliotecas usadas por la escena 3D

Todas con licencia MIT (versiones instaladas el 2026-09-23). Sus avisos de copyright se
incluyen en los paquetes de `node_modules` y en el build.

| Biblioteca | Versión | Licencia | Uso |
|---|---|---|---|
| three | 0.186.0 | MIT | Renderizado WebGL, `STLLoader`, `BufferGeometryUtils` |
| @tresjs/core | 5.9.0 | MIT | Escena declarativa en Vue (`TresCanvas`, eventos de puntero por malla) |
| @tresjs/cientos | 5.9.0 | MIT | `OrbitControls` |
| three-stdlib | 2.36.1 | MIT | Implementación de los controles (dependencia de cientos) |

## Fuentes del certificado PDF (F5-05)

| Campo | Valor |
|---|---|
| Recurso | **DejaVu Fonts 2.37**: `DejaVuSans.ttf`, `DejaVuSans-Bold.ttf`, `DejaVuSerif.ttf`, `DejaVuSerif-Bold.ttf` |
| Autores | Basadas en Bitstream Vera (© 2003 Bitstream, Inc.); los cambios de DejaVu son de dominio público; glifos importados de Arev Fonts (© Tavmjong Bah) |
| Fuente | <https://github.com/dejavu-fonts/dejavu-fonts/releases/tag/version_2_37> (`dejavu-fonts-ttf-2.37.tar.bz2`, SHA-256 `fa9ca4d13871dd122f61258a80d01751d603b4d3ee14095d65453b4e846e17d7`), descargado el 2026-09-24 |
| Licencia | **Bitstream Vera Fonts Copyright / Arev Fonts Copyright** (permisiva, sin copyleft). Texto completo en `services/api/app/assets/fonts/LICENSE-DejaVu.txt` |
| Archivos en el repositorio | `services/api/app/assets/fonts/` (sin modificar) |
| Uso | Incrustadas (subconjunto) en el PDF del certificado con reportlab |

Qué exige la licencia: conservar el aviso de copyright y el texto del permiso en todas las copias de las
fuentes (por eso viaja `LICENSE-DejaVu.txt` junto a los `.ttf` y en la imagen de la API); no vender las
fuentes por separado; y, si se modifican, renombrarlas sin las palabras "Bitstream" ni "Vera". No se
han modificado. Cubren el alfabeto latino con todos sus diacríticos (acentos, ñ, ç, ø, ł, č...), griego y
cirílico, suficiente para nombres reales de estudiantes; los ideogramas (chino, japonés, coreano) no
están cubiertos y saldrían como el glifo vacío de la fuente.

## Bibliotecas del backend para el certificado (F5-05)

Versiones instaladas el 2026-09-24. Python puro o con ruedas binarias precompiladas: no necesitan
GTK, Cairo ni otras bibliotecas del sistema (por eso no se usa WeasyPrint).

| Biblioteca | Versión | Licencia | Uso |
|---|---|---|---|
| reportlab | 5.0.1 | BSD | Generación del PDF y del código QR |
| pillow | 12.3.0 | MIT-CMU (HPND) | Dependencia de reportlab |
| charset-normalizer | 3.5.1 | MIT | Dependencia de reportlab |
| pypdf | 6.19.0 | BSD-3-Clause | Solo pruebas (extraer el texto del PDF); grupo `dev` |

## Pasajes de artículos en el corpus del mentor

`services/api/app/data/bibliografia_mentor.json` (y, generado de él, `corpus.jsonl`) contiene el resumen y las
conclusiones, **literales y sin modificar**, de cinco artículos de acceso abierto de la bibliografía de la docente
(`docs/bibliografia.md`). Solo los lee el mentor, para fundamentar sus respuestas; no se muestran al estudiante.
Cada pasaje lleva su cita completa y su DOI. Uso educativo y no comercial.

| Clave | Artículo | Licencia |
|---|---|---|
| Ref d | Liu M, et al. Bone Res. 2025;13(1):98. doi: 10.1038/s41413-025-00494-1 | CC BY 4.0 |
| Ref f | Emam AN. Discov Appl Sci. 2025;7:1114. doi: 10.1007/s42452-025-07780-x | CC BY-NC-ND 4.0 |
| Ref h | Li R, et al. J Orthop Translat. 2025;50:129-43. doi: 10.1016/j.jot.2024.10.002 | CC BY-NC-ND 4.0 |
| Ref z12 | Stewart S, et al. Bone Joint Res. 2020;9(1):1-14 (PMC7229304) | CC BY-NC-ND 4.0 |
| Ref z6 | Florencio-Silva R, et al. Biomed Res Int. 2015;2015:421746 (PMC4515490) | CC BY |

Ref m (Selvaraj et al., Differentiation 2024, Elsevier, «All rights reserved») vino con los demás PDF pero **no**
entra al corpus. Las licencias NoDerivatives (ND) permiten reproducir el texto sin cambios: por eso los pasajes son
literales; la línea «Temas» en español que los acompaña es un índice de búsqueda, no una traducción del artículo.

