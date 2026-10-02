# Escena 3D del movimiento ortodóntico (módulo 5)

Nota de diseño de `movimiento_ortodontico`, escena **procedural** del OVA (el formato lo explica
[escena-3d-bmu.md](escena-3d-bmu.md); la plantilla de código es la del corte alveolar del módulo 1,
[escena-3d-alveolar.md](escena-3d-alveolar.md)). Es una actividad **opcional** del módulo 5,
`m5_5_ortodoncia_3d` (sección 5.5 "Hueso cortical, trabecular y alveolar: el movimiento ortodóntico", 30 puntos),
que acompaña a la actividad multicapa `m5_ortodoncia_multicapa`: la misma historia del dibujo
`m5_movimiento_ortodontico_pdl.svg`, pero en un bloque que se recorre en el tiempo, se gira y se acerca.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y la escena **recorre un movimiento ortodóntico** en un corte
mesiodistal del proceso alveolar con un canino de una raíz. Aquí `t` sí es tiempo biológico, comprimido y no
proporcional: de la aplicación de la fuerza (horas) a la retención (meses). Puede ir y volver cuando quiera.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `reposo` (0) | El bloque cortado: cortical, esponjoso, encía, el canino con su ligamento (verde) de grosor uniforme, fibras oblicuas, vasos y la lámina del hueso alveolar propio | `general` |
| `fuerza` (0,16) | Aparecen el bracket y la flecha naranja hacia la derecha (distal); el diente apenas se mueve | `general` |
| `ligamento` (0,32) | La raíz se corre dentro del alvéolo: ligamento estrechado a la derecha (fibras arrugadas, vasos aplastados, foco hialinizado blanquecino) y ensanchado a la izquierda (fibras tensas); la corona se inclina un poco | `corte` |
| `resorcion` (0,5) | Osteoclastos morados sobre la pared derecha, que se festonea (lagunas de Howship), se adelgaza y se oscurece; la zona hialinizada desaparece | `compresion` |
| `aposicion` (0,66) | Fila de osteoblastos azules sobre la pared izquierda con un ribete de osteoide; la pared se vuelve hueso nuevo (rosa claro) | `tension` |
| `desplazamiento` (0,83) | El diente y su alvéolo han avanzado hacia la derecha; una línea punteada marca la posición inicial; la banda clara del lado izquierdo es el hueso nuevo | `general` |
| `retencion` (1) | Sin fuerza: la pared derecha se alisa, el hueso nuevo toma el color del maduro, el ligamento recupera su grosor y los osteoblastos quedan aplanados como células de revestimiento | `corte` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad. La actividad definitiva (textos y vistas) está en `.verify/ortodoncia/actividad.json`
hasta que el coordinador la fusione en el `content.json` del módulo 5.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/ortodoncia/estado.ts`): pistas de fotogramas
  clave (`evaluarPista`) para la fuerza, el corrimiento de la raíz dentro del ligamento, la inclinación de la
  corona, la hialinización, los osteoclastos y la resorción, los osteoblastos, el osteoide, el aplanamiento a
  células de revestimiento, la maduración del hueso nuevo, el avance por remodelado y la marca de referencia.
  `HITOS_ORTODONCIA` fija los `t` que usa el contenido.
- **Dos movimientos distintos del diente.** El primero es el *corrimiento en el alvéolo* (`corrimientoEnAlveolo`):
  la raíz se desplaza dentro del ligamento una fracción de su grosor (0,55) y el alvéolo no se mueve, porque es
  hueso. El segundo es el *desplazamiento por remodelado* (`diente.desplazamiento`): el diente y el alvéolo
  entero avanzan juntos 0,7 unidades. Así la escena separa "el ligamento se comprime" de "el hueso se remodela".
- **La sección es un dibujo en 2D montado sobre un bloque en 3D**, como en la escena alveolar: los perfiles
  (`disposicion.ts`, puro) son polígonos `[x, y]` en el plano de corte z = 0. El contorno de la raíz tiene
  siempre `N_MUESTRAS_RAIZ` (97) muestras y a partir de él se calculan, por desplazamiento a lo largo de la
  normal, la pared del alvéolo (con lagunas periódicas del lado de compresión), la lámina (adelgazada al
  reabsorberse) y el ribete de osteoide. Las bandas entre dos contornos son mallas de topología fija
  (`Banda`) cuyos vértices se recolocan en cada fotograma; la raíz, la corona y la pulpa son abanicos
  (`Abanico`). No se crea geometría al mover el deslizador.
- **El hueso nuevo** es la banda entre la pared inicial (`paredInicial`, fija) y la pared actual del lado
  izquierdo: crece sola a medida que el alvéolo avanza, y madura por color (hueso nuevo → hueso maduro).
- **Cinco piezas** (`mallas.ts`): `BloqueAlveolar` (cortical extruida con el hueco del esponjoso, cara de
  corte, médula, 130 trabéculas instanciadas fuera de la huella que barre el diente, encía), `Diente` (media
  corona trasera en relieve, cara de corte con esmalte, dentina, cemento y pulpa, línea punteada de la posición
  inicial), `Alveolo` (ligamento, fibras como polilíneas que se arrugan o se tensan según el lado, vasos
  instanciados que se aplastan, zona hialinizada, lámina de cada lado, hueso nuevo, osteoide), `Celulas`
  (osteoclastos con tres núcleos y osteoblastos cúbicos que se aplanan, instanciados) y `Fuerza` (bracket y
  flecha, pegados a la corona).
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con `resolverVista` y las vistas de `ortodoncia/vistas.ts`.
  La cara de corte mira a +Z, así que las vistas tienen azimut pequeño; `compresion` apunta a la pared derecha y
  `tension` a la izquierda. La cámara no sigue al diente.
- **Colores:** los del dibujo `m5_movimiento_ortodontico_pdl.svg` (ligamento `#b9cf8f`, hialinizado, fuerza
  naranja `#e8622b`, bracket gris), los del corte alveolar del módulo 1 (lámina, médula, trabéculas) y los de
  la BMU (hueso, osteoide, hueso nuevo, hueso reabsorbido, osteoclasto, osteoblasto, capilar), para que cada
  estructura y cada célula se reconozcan de un dibujo al otro.

## 3. Límites y honestidad

- Las formas son **esquemáticas**: el proceso alveolar es un bloque redondeado, la corona un torno con una
  cúspide; el ligamento (0,1 unidades) y la lámina (0,12) van **mucho más gruesos** que en la realidad, y el
  desplazamiento (0,7 unidades, cerca de un semiancho de raíz) es enorme comparado con el milímetro mensual
  real. El texto lo dice.
- **La sección es plana.** Ligamento, lámina, hueso nuevo, raíz y células son placas superpuestas a
  profundidades distintas (centésimas); solo la corona, el cascarón cortical, la encía, las trabéculas, las
  células y la flecha tienen volumen. Al girar mucho la cámara hacia un lado se nota.
- El movimiento es una **traslación casi pura** (inclinación máxima de 0,05 rad, con centro de rotación en la
  raíz): no se representa el vuelco de la corona ni el par de fuerzas que evita ese vuelco; tampoco la
  resorción radicular ni la resorción socavante desde los espacios medulares.
- Las **lagunas de Howship** son un festón periódico de 5 muestras (un artefacto regular, no una forma
  observada) y la hialinización es un tramo fijo de muestras (62 a 80) de la pared derecha.
- La **pared inicial no se marca** por separado del lado de compresión: allí el hueso desapareció y solo la
  línea punteada del diente recuerda dónde estaba.
- Las fibras son líneas de un píxel: se ven poco a baja densidad y desde la vista `general`.
- **Sin revisión del docente** del texto ni de las formas. Dudas científicas concretas que debería mirar: si
  representar la hialinización con fuerza ligera (aquí un foco pequeño que los osteoclastos retiran), el
  momento en que aparecen los osteoblastos respecto de los osteoclastos, que la lámina del lado de tensión se
  "convierta" en hueso nuevo por color, y la cifra "cerca de un milímetro al mes" del paso de desplazamiento.
- **Presupuesto** medido en memoria en 41 instantes: peor caso 9 778 triángulos y 26 llamadas de dibujo (en
  `t` = 0,575; tope 40 000 y 40). No se midió en un teléfono real. three va en el chunk `webgl` compartido.
- **Comprobación visual INCOMPLETA** (se interrumpió por orden del usuario para no gastar más). Verificado en
  Chrome con emulación táctil de 390 × 844 px: `t` = 0; 0,16; 0,32; 0,5; 0,66; 0,83 y 1 en la vista automática
  (`general`, porque la actividad provisional tenía todas las vistas en `general`), más `compresion` en 0,5 y
  `tension` en 0,66; capturas en `.verify/ortodoncia/`. **No** se capturó a 1280 × 800 px (la emulación llegó
  a configurarse pero no se tomó ninguna captura), no se vio la vista `corte` en 0,32 ni en 1 (las que propone
  `actividad.json`), no se probó el pellizco, el giro con el dedo ni la reproducción completa. En lo que se
  vio no hizo falta corregir nada: cada fase se distingue; lo más flojo es que en `general` las fibras y el
  ribete de osteoide son finos y que la línea punteada de referencia asoma por encima de la encía.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes geométricas | `apps/web/src/scenes/procedural/ortodoncia/estado.ts` |
| Perfiles 2D, contornos del alvéolo por estado, trabéculas, fibras, vasos, células | `.../ortodoncia/disposicion.ts` |
| Placas, bloques extruidos, bandas, abanicos, polilíneas, media corona | `.../ortodoncia/geometria.ts` |
| Las cinco piezas | `.../ortodoncia/mallas.ts` |
| Vistas de cámara | `.../ortodoncia/vistas.ts` |
| Colores | `.../ortodoncia/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../ortodoncia/EscenaOrtodoncia.vue`, `ContenidoOrtodoncia.vue` |
| Pruebas | `.../ortodoncia/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m5_renovando_el_hueso/content.json`, actividad `m5_5_ortodoncia_3d` (definitiva en `.verify/ortodoncia/actividad.json`) |
| Dibujo hermano en 2D | `public/images/m5/m5_movimiento_ortodontico_pdl.svg`, actividad `m5_ortodoncia_multicapa` |
