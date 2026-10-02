# Escena 3D del hueso alveolar por dentro (módulo 1)

Nota de diseño de `hueso_alveolar`, escena **procedural** del OVA (el formato lo explica
[escena-3d-bmu.md](escena-3d-bmu.md); la plantilla de código es la del hueso largo,
[escena-3d-hueso.md](escena-3d-hueso.md)). Es una actividad **opcional** del módulo 1, `m1_5_alveolar_3d`
(sección 1.5 "La mandíbula, un hueso bajo carga", 30 puntos), que acompaña a la actividad multicapa
`m1_5_proceso_alveolar`: el mismo corte vestibulolingual del dibujo `m1_proceso_alveolar_corte.svg`, pero en
un bloque que se corta y se gira.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y la escena **recorre el cuerpo de la mandíbula**. Aquí `t` no es
tiempo: es el orden en que se descubren las estructuras. Puede ir y volver cuando quiera, girar la escena con
un dedo y acercarla con dos.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `cuerpo` (0) | Un segmento del cuerpo mandibular con un premolar de una raíz en su alvéolo; solo la cortical lisa | `general` |
| `corte` (0,18) | La mitad anterior se aparta y se desvanece; queda la sección vestibulolingual por el eje de la raíz | `corte` |
| `tablas` (0,34) | Las tablas corticales (vestibular fina, lingual y base gruesas) se destacan | `corte` |
| `trabecular` (0,5) | Las trabéculas entre las tablas se destacan sobre la médula | `corte` |
| `alveolar_propio` (0,66) | La lámina densa que reviste el alvéolo se destaca y aparecen sus perforaciones (lámina cribiforme); la cámara se acerca a la raíz | `raiz` |
| `ligamento` (0,82) | El ligamento periodontal se destaca y aparecen sus fibras oblicuas, del hueso al cemento | `raiz` |
| `conducto` (1) | El conducto mandibular bajo el ápice, con el nervio (amarillo), la arteria (roja) y la vena (azul); la cámara mira dentro del túnel | `conducto` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/alveolar/estado.ts`): pistas de fotogramas
  clave con tramos suavizados. Cada estructura tiene un `resalte` (0 a 1) que sube hasta su hito, se mantiene
  un poco y se apaga antes del hito siguiente; nunca hay dos estructuras destacadas a la vez (una prueba lo
  comprueba). Las perforaciones y las fibras aparecen con su fase y se quedan.
- **La sección es un dibujo en 2D montado sobre un bloque en 3D.** Los perfiles de la sección (contorno del
  cuerpo, región trabecular en herradura, raíz, corona, pulpa, bandas del ligamento y de la lámina) son
  polígonos `[z, y]` calculados en `disposicion.ts` (puro). `geometria.ts` los convierte en placas planas
  (`ShapeGeometry`) y en bloques extruidos a lo largo del cuerpo (`ExtrudeGeometry`). La mitad que queda es un
  cascarón cortical extruido con el hueco del trabecular; la cara de corte lleva encima, a profundidades
  distintas de unas centésimas, las placas de cada capa. La médula está 0,16 unidades por detrás de la cara y
  las trabéculas (barras instanciadas, orientadas en abanico desde la raíz hacia las tablas) van en ese hueco.
- **Cuatro piezas** (`mallas.ts`): `MitadMovil` (se aparta 3,4 unidades por +X y se desvanece),
  `CuerpoSeccionado` (cascarón, cara de las tablas, médula, placa del fondo, trabéculas), `Alveolo` (media
  corona en relieve, cara de corte del diente con pulpa, lámina con perforaciones, ligamento con fibras) y
  `ConductoMandibular` (túnel abierto hacia la cara con el nervio y los vasos, que terminan como discos a la
  vista dentro del túnel). Reciben el estado y solo mueven, aclaran o destacan.
- **Resaltes por color propio:** cada estructura se destaca con un emisivo que es una versión más viva de su
  propio color (`paleta.ts`, `resalte*`), no con el amarillo común de las otras escenas: sobre la médula
  amarilla, un destello amarillo borraba las trabéculas.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con la prop `resolverVista` y las vistas de
  `alveolar/vistas.ts`. La cara de corte mira hacia +X, así que las vistas que la muestran tienen un azimut
  grande (la cámara se coloca del lado +X, algo hacia vestibular).
- **Colores:** los del dibujo `m1_proceso_alveolar_corte.svg` (lámina `#c0648a`, ligamento `#b9cf8f`, médula
  `#f3e6b3`, raíz `#f2e5b6`, pulpa `#f0a9a0`, borde del conducto `#7d6fd0`, nervio `#e7c84f`, arteria
  `#d9574a`, vena `#5b7fb3`) y de la BMU para el hueso, para que cada capa se reconozca del dibujo a la escena.

## 3. Límites y honestidad

- Las formas son **esquemáticas**: el cuerpo es un bloque de sección ovoide (más alto que ancho, redondeado
  por la base, estrechado hacia la cresta), no la anatomía real; la corona es un torno con una sola cúspide; el
  ligamento (0,06 unidades) y la lámina (0,10) van **mucho más gruesos** que en la realidad para que se vean
  en un teléfono, y el conducto va exagerado y algo alto. La raíz cabe entera en la sección (las de verdad
  suelen quedar fuera del plano en parte).
- **La sección es plana.** El alvéolo, el ligamento, la raíz y el conducto son placas superpuestas sobre la
  cara de corte, no volúmenes: al girar mucho la cámara hacia un lado se nota que no tienen grosor. Solo la
  corona, el cascarón cortical, las trabéculas y el túnel del conducto tienen volumen. Desde el lado −X (detrás
  del bloque) se ve el interior del cascarón sin cara de corte: no hay vista con nombre que mire desde allí.
- La mitad anterior **se desvanece** al apartarse (no queda como cuña apartada): con la cámara casi de frente a
  la sección, una mitad opaca desplazada la tapaba.
- La cortical se funde con la lámina cerca de la cresta (no hay trabecular entre ambas) más trecho del lado
  vestibular que del lingual, porque la tabla vestibular es más fina. Es lo que ocurre, pero aquí es un artefacto
  del umbral `HUECO_MINIMO_TRABECULAR`, no un dato.
- Las fibras del ligamento y las perforaciones son líneas de un píxel y discos pequeños: se ven poco en
  pantallas de baja densidad y desde la vista `corte`.
- **Sin revisión del docente** del texto de los pasos ni de las formas. Dudas científicas concretas que debería
  mirar: el grosor relativo de las tablas (aquí lingual 0,36 frente a vestibular 0,24 y base 0,5), la
  orientación en abanico de las trabéculas, el sentido de las fibras oblicuas (aquí del hueso, más arriba, al
  cemento, más abajo) y la posición del conducto respecto del ápice.
- **Sin medir en un teléfono real.** Presupuesto comprobado por pruebas en el peor instante: unos 4 900
  triángulos y 19 llamadas de dibujo (tope: 40 000 y 40). three va en el chunk `webgl` compartido.
- Verificada en Chrome con WebGL y emulación táctil de 390 × 844 px (`t` = 0; 0,18; 0,34; 0,5; 0,66; 0,82 y 1) y
  a 1280 × 800 px (`t` = 0,18 y 0,66); capturas en `.verify/alveolar/`. No se probó el pellizco ni el giro con
  el dedo, ni la reproducción completa.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes geométricas | `apps/web/src/scenes/procedural/alveolar/estado.ts` |
| Perfiles 2D de la sección, trabéculas, perforaciones, fibras | `.../alveolar/disposicion.ts` |
| Placas, bloques extruidos, media corona | `.../alveolar/geometria.ts` |
| Las cuatro piezas | `.../alveolar/mallas.ts` |
| Vistas de cámara | `.../alveolar/vistas.ts` |
| Colores | `.../alveolar/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../alveolar/EscenaAlveolar.vue`, `ContenidoAlveolar.vue` |
| Pruebas | `.../alveolar/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m1_conociendo_el_hueso/content.json`, actividad `m1_5_alveolar_3d` |
| Dibujo hermano en 2D | `public/images/m1/m1_proceso_alveolar_corte.svg`, actividad `m1_5_proceso_alveolar` |
