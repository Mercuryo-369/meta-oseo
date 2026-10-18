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
| `reposo` (0) | El bloque cortado: cortical, esponjoso, encía, el canino con su ligamento (rosado) de grosor uniforme, fibras oblicuas, vasos y la lámina del hueso alveolar propio | `general` |
| `fuerza` (0,16) | Aparecen el bracket y la flecha naranja hacia la derecha (distal); el diente apenas se mueve | `general` |
| `ligamento` (0,32) | La raíz se corre dentro del alvéolo: ligamento estrechado a la derecha (fibras arrugadas, vasos aplastados, foco hialinizado blanquecino) y ensanchado a la izquierda (fibras tensas); la corona se inclina un poco | `corte` |
| `resorcion` (0,5) | Osteoclastos lila en lagunas de Howship a los bordes de la zona hialinizada (resorción frontal) y detrás de ella, en la cara medular de la lámina (resorción socavante); la pared derecha se festonea, se adelgaza y se oscurece; la zona hialinizada desaparece | `compresion` |
| `aposicion` (0,66) | Fila de osteoblastos violeta sobre la pared izquierda con un ribete de osteoide; la pared se vuelve hueso nuevo (marfil claro) | `tension` |
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
- **Colores:** los de `NATURAL` en `ortodoncia/paleta.ts` (la paleta común de las escenas; el diente, el ligamento
  y la lámina, los de `hueso_alveolar`: ver «Revisión de diseño»). Los del dibujo
  `m5_movimiento_ortodontico_pdl.svg` siguen en `HEX`, que ya no se dibuja (salvo la flecha y la línea punteada).

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
  resorción radicular. La resorción socavante desde los espacios medulares es solo una señal: dos osteoclastos en
  la cara medular de la lámina, detrás de la zona hialinizada.
- Las **lagunas de Howship** son un festón periódico de 5 muestras (un artefacto regular, no una forma
  observada) y la hialinización es un tramo fijo de muestras (62 a 80) de la pared derecha.
- La **pared inicial no se marca** por separado del lado de compresión: allí el hueso desapareció y solo la
  línea punteada del diente recuerda dónde estaba.
- Las fibras son líneas de un píxel: se ven poco a baja densidad y desde la vista `general`.
- **Sin revisión del docente** del texto ni de las formas. Dudas científicas concretas que debería mirar: si
  representar la hialinización con fuerza ligera (aquí un foco pequeño que los osteoclastos retiran), el
  momento en que aparecen los osteoblastos respecto de los osteoclastos, que la lámina del lado de tensión se
  "convierta" en hueso nuevo por color, y la cifra "cerca de un milímetro al mes" del paso de desplazamiento.
- **Presupuesto** medido en memoria: ver «Revisión de diseño» (las cifras anteriores no contaban la doble pasada ni
  las sombras). No se midió en un teléfono real. three va en el chunk `webgl` compartido.
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

## Realismo (2026-10-14)

Mejora de realismo con la base compartida (`scenes/procedural/realismo.ts` y `EntornoRealista.vue`), como en las
escenas del hueso y de la matriz:

- **Paleta natural** propia (`NATURAL` en `ortodoncia/paleta.ts`; `HEX` no cambia; la revisión de diseño la unificó
  con la paleta común): hueso marfil (cortical, cara de corte y trabéculas; el hueso alveolar propio era entonces un
  punto más oscuro), pared reabsorbida tostada, osteoide pálido algo
  rosado, médula entre las trabéculas grasa con algo de médula roja, encía rosa coral, esmalte blanco azulado,
  dentina amarillenta, cemento ocre, pulpa rosada y bracket de acero. Se mantienen, algo más sobrios, los colores que
  nombran los textos de los pasos: el ligamento periodontal **verde**, los osteoclastos **lila**, los osteoblastos
  **azules** y el hueso nuevo como la **banda clara** del lado izquierdo. La flecha naranja de la fuerza y la línea
  punteada no cambian. (La revisión de diseño cambió el verde y el azul y propone el cambio de los textos.)
- **Materiales por pieza**: cortical, cara de corte y hueso alveolar propio, `hueso`; trabéculas, `hueso_esponjoso`;
  médula, `medula`; encía y pulpa, `encia`; esmalte, `esmalte`; dentina y cemento, `dentina`; ligamento,
  `membrana`; hueso nuevo, `hueso_inmaduro`; osteoide y zona hialinizada, `cartilago` (lisos y húmedos; la zona
  hialinizada conserva su transparencia); vasos, `vaso`; osteoclastos y osteoblastos, `celula`, y sus núcleos,
  `nucleo`; el bracket, acero (metálico, sobre la base lisa de `cristal`); la flecha, `molecula`.
- **Coordenadas UV**: las bandas (ligamento, láminas, hueso nuevo, osteoide, zona hialinizada, cemento) y los
  abanicos (dentina, corona, pulpa) no tenían; ahora las llevan en unidades de escena: las bandas, a lo largo y a
  través (así las vetas del ligamento cruzan la banda del hueso al cemento, como las fibras principales), y los
  abanicos, respecto de su centro (la textura viaja con el diente). Placas y bloques usan las de three, también en
  unidades de escena, así que esos materiales fijan cuántas veces se repite el relieve por unidad.
- **Forma**: la cortical y la encía tienen los cantos biselados (0,04 y 0,06; la cara de corte sigue en z = 0 con el
  contorno exacto, donde se apoyan las capas planas); 130 trabéculas de grosor variable, algo cónicas y de 6 lados;
  corona de perfil suavizado (una curva por los puntos del perfil original, en el torno y en la cara de corte). **El
  corte del diente muestra la dentina dentro de la corona** (antes la corona cortada era toda esmalte): la dentina de
  la raíz y la coronal son una sola pieza, dibujada delante del esmalte, que queda como un casquete fino en el cuello
  y grueso en la cúspide (un 20 % de la altura de la corona). Bracket con base y dos aletas a los lados de la ranura;
  vasos del ligamento de 12 × 8.
- **Luz**: luz de entorno y sombras suaves (`EntornoRealista.vue`); luces más suaves y un contraluz frío.
- **Presupuesto** (peor instante, medido como en las pruebas de entonces, que contaban también las líneas y no la
  doble pasada ni las sombras; la cuenta de hoy, en «Revisión de diseño»): 12 042 triángulos y 26 llamadas de dibujo
  (antes 9 879 y 26). Por pieza: bloque 2 958 (tope 4 000), alvéolo 2 020 (2 500), diente 1 084
  (1 500), células 5 768 (6 000) y fuerza 212 (400); ninguna llamada de dibujo nueva. Sin cambios de posiciones,
  tiempos, hitos ni vistas.

No se ha visto en pantalla (el usuario prueba en local).

## Revisión de diseño (2026-10-17)

Revisión de render, rendimiento, fidelidad histológica y realismo, con la base compartida nueva (`realismo.ts`,
`iluminacion.ts` y `EntornoRealista.vue`). Las tres escenas dentales (esta,
[escena-3d-alveolar.md](escena-3d-alveolar.md) y [escena-3d-alveolo.md](escena-3d-alveolo.md)) quedan coherentes: el
mismo ligamento, la misma lámina dura, el mismo diente y la misma relación cresta–cuello.

- **Bracket pegado** (realismo-12): la pieza de la fuerza iba entera en z = 0,32 y el bracket flotaba 0,21 delante
  del diente, con la sombra despegada. Ahora son dos subgrupos: el bracket, en z = 0,097, con la base (0,035 a 0,07)
  atravesando la cara de corte de la corona; la flecha, delante, en 0,32. El giro del diente sigue en el grupo. Bracket
  y flecha son sólidos cerrados: cara delantera (`FrontSide`), una sola pasada al desvanecerse. Una prueba comprueba que
  la base atraviesa la cara de corte, a media corona, en tres instantes.
- **Osteoclastos fuera de la zona hialinizada** (fidelidad-04, confirmado: la zona hialinizada es acelular; con
  fuerza ligera la resorción frontal ocurre en el ligamento vivo de sus bordes, y el tejido necrótico lo retiran
  macrófagos mientras la pared de detrás se reabsorbe desde la médula, la resorción socavante; Reitan; Proffit, cap.
  8): dos de los cuatro osteoclastos (muestras 69 y 77) caían dentro del tramo 62-80. Ahora los frontales van en las
  muestras 57 y 88, en lagunas hondas, sin que ni la punta de la célula entre en la zona; y dos socavantes (68 y 74)
  trabajan en la cara medular de la lámina, detrás de ella. El mismo número de células. Además el osteoclasto se
  aplana contra el hueso (0,045 de semieje a lo largo de la normal, antes 0,1): en el ligamento comprimido (0,045 a
  0,09) montaba sobre el cemento, que es lo que se vería en una resorción radicular.
- **La cresta ya no toca el esmalte** (fidelidad-02, confirmado): la corona empezaba 0,05 por debajo de la cresta;
  ahora en `Y_CUELLO`, 0,2 por encima (`CRESTA_A_CUELLO` de `hueso_alveolar`, unos 1,5 mm), con el cuello del ancho de
  la raíz. Todo el diente sube 0,25 respecto de la cresta: la cámara pulpar, el centro del abanico de la corona y el
  bracket (`Y_BRACKET` = `Y_CUELLO` + 0,6, el 46 % de la corona, como antes). El cemento cubre también la raíz
  cervical, entre la cresta y el cuello. La encía (hasta 0,3 sobre la cresta) deja su margen 0,1 por encima del cuello,
  unos 0,7 mm, como en la boca. La vista `general` sube su objetivo 0,12 para que la cúspide no se salga en un lienzo
  ancho (una prueba lo comprueba).
- **Foramen apical** (fidelidad-12, confirmado): el conducto terminaba 0,24 unidades (1,7 mm) antes del ápice; ahora
  llega a `Y_FORAMEN`, a 0,01.
- **Esmalte que no parece porcelana** (realismo-10): brillo satinado en la base y el degradado por vértice de
  `hueso_alveolar` en el torno de la corona (`pintarEsmalte`, por la altura del cuello a la cúspide); la cara de corte
  (`corte_corona`), un atributo de color uniforme, así que comparte el material del torno sin salir negra.
- **Paleta común** (el mismo tejido, el mismo color; casi todo, de `NATURAL` de `hueso_alveolar`): ligamento del verde
  `#a6c08a` al rosado `#d4948b`, con fibras `#f7ece4` (antes verde oscuro `#5a7343`; fidelidad-01, confirmado: el verde
  solo venía del dibujo); hueso alveolar propio de `#d6c29d` (más oscuro que las trabéculas) a `#f4ecdc`, la banda más
  clara (fidelidad-03, confirmado); osteoblastos del azul `#7c91cf` (el color del osteocito) al violeta `#8d86c6`, con
  núcleos `#4b408f` (fidelidad-06, confirmado); médula de `#cf8c5d` a la mixta `#b86a45` del corte alveolar
  (fidelidad-16); hueso nuevo `#f2e9d8` (antes `#f6efe1`), que con la lámina sigue siendo la banda clara del lado
  izquierdo; cara de corte `#eadfc8`, trabéculas `#e6d8bc`, encía `#dc958c`, vasos `#c9473e`; dentina, cemento,
  pulpa y esmalte, los de `hueso_alveolar`.
- **Sombras y pasadas**: las bandas y los abanicos de la cara de corte (ligamento, láminas, hueso nuevo, osteoide, zona
  hialinizada, dentina, corona, cemento, pulpa) flotan sobre el hueco de la médula: no proyectan sombra
  (`userData.sinSombra`; su sombra hacía parecer despegado el alvéolo entero). La zona hialinizada, siempre
  translúcida y plana, se dibuja en una sola pasada (`forceSinglePass`).
- **Higiene** (rendimiento-15 y -16): `Celulas.actualizar` y `Alveolo.ponerVasos` ya no crean objetos de three en cada
  fotograma (92 por fotograma antes); `perfilesAlveolo` se calcula una vez por estado (lo pedían el diente, el alvéolo
  y las células); el cemento se calcula una vez en el marco del diente; `relieve` tiene la firma de las otras escenas
  dentales; la paleta se importa como `COLOR` (los colores de trabajo de las láminas se llaman `TONOS`).
- **Presupuesto** (rendimiento-09), medido como se dibuja (instancias, la doble pasada de los transparentes de doble
  cara y, aparte, el pase de sombras) en 401 instantes: peor instante (t ≈ 0,565) **25 llamadas y 11 949 triángulos,
  más 14 llamadas y 10 954 triángulos de sombra**; antes, con la misma cuenta, 26 y 11 977, más 23 y 11 905. Tope: 40
  llamadas, 40 000 triángulos y 40 llamadas de sombra. Los topes por pieza no cambian.
- **Pruebas**: 99 (antes 92): la cresta 0,2 bajo el cuello; el foramen; ningún osteoclasto frontal en la zona
  hialinizada y los socavantes detrás; `perfilesAlveolo` memorizado; el bracket pegado; los abanicos sin pliegues; el
  degradado del esmalte; el encuadre de `general`; el presupuesto con la doble pasada y las sombras.

### Propuestas de cambio de texto (`m5_renovando_el_hueso/content.json`, actividad `m5_5_ortodoncia_3d`)

Sin editar: los textos que nombran colores ya no coinciden con la escena hasta que el docente los acepte.

- `paso_reposo` (405 → 406 caracteres): «el **ligamento periodontal** (verde), de grosor uniforme» → «el **ligamento
  periodontal** (rosado), de grosor uniforme».
- `paso_fuerza` (284 → 227; fidelidad-20, confirmado: la frase está repetida y «el hueso no se dobla» es discutible, la
  flexión del hueso alveolar es uno de los mecanismos de señal propuestos): «El diente apenas se mueve todavía: el
  hueso no se dobla. El diente apenas se mueve todavía: lo primero» → «El diente apenas se mueve todavía: lo primero».
- `paso_resorcion` (373 → 473): «Con fuerza ligera actúan desde el propio ligamento (resorción frontal) y retiran
  también la zona hialinizada.» → «Con fuerza ligera actúan desde el propio ligamento (resorción frontal). La zona
  hialinizada no tiene células: la retiran macrófagos y la pared que hay detrás se reabsorbe desde la médula
  (resorción socavante).»
- `paso_aposicion` (395 → 396): «**osteoblastos** (azules)» → «**osteoblastos** (violeta)».

El dibujo `m5_movimiento_ortodontico_pdl.svg` sigue con el ligamento verde (`#b9cf8f`, `tension_lpd` y
`compresion_lpd`): cambiarlo a `#d4948b` o aceptar la diferencia entre esquema y escena es decisión del docente.

- **Para mirar en pantalla**: el bracket sobre la corona en las vistas `general` y `corte`; los osteoclastos
  socavantes sobre la médula en la vista `compresion`; la franja de raíz cervical sobre la encía en el corte; el
  degradado del esmalte.

No se ha visto en pantalla (el usuario prueba en local).
