# Escena 3D del alvéolo tras la extracción y el reborde con los años (módulo 6)

Nota de diseño de `alveolo_postextraccion`, escena **procedural** del OVA (el formato lo explica
[escena-3d-bmu.md](escena-3d-bmu.md); la plantilla de código es la del hueso largo,
[escena-3d-hueso.md](escena-3d-hueso.md), y el escenario es el de [escena-3d-alveolar.md](escena-3d-alveolar.md)).
Es una actividad **opcional** del módulo 6, `m6_4_alveolo_3d` (sección 6.4 "La mandíbula con los años", 30
puntos), que acompaña a la actividad de ordenar la cascada del reborde (`m6_4_ordenar_reborde`) y a la mandíbula 3D
(`m6_4_mandibula_3d`): lo que allí se ordena y se lee, aquí se ve pasar en el corte de un alvéolo.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y la escena **avanza en el tiempo**: de la extracción de un premolar
inferior a años después. La escala no es proporcional (horas, días, semanas, meses y años ocupan tramos parecidos
del deslizador; el texto de cada paso lo dice). Puede ir y volver cuando quiera, girar la escena con un dedo y
acercarla con dos.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `diente` (0) | El mismo segmento de cuerpo mandibular de la escena `hueso_alveolar`, ya cortado en sentido vestibulolingual por el eje de la raíz: el premolar en su alvéolo con el ligamento, el hueso alveolar propio, las tablas (la vestibular más delgada), el trabecular, el conducto mandibular y, sobre la cara vestibular, el foramen mentoniano; encía sobre la cresta | `general` |
| `extraccion` (0,14) | El diente sube y desaparece; queda el alvéolo vacío (fondo oscuro) con restos de ligamento y puntos de sangrado en las paredes | `alveolo` |
| `coagulo` (0,28) | El alvéolo se llena, desde el fondo, de un coágulo rojo oscuro | `alveolo` |
| `granulacion` (0,42) | El tejido de granulación (rosado, con vasos) sustituye al coágulo desde las paredes y el fondo; la encía empieza a cerrar por arriba | `alveolo` |
| `hueso_entretejido` (0,56) | Hueso entretejido rosado (muy vascular) rellena el alvéolo desde el fondo y las paredes; osteoclastos sobre el hueso alveolar propio, que se desvanece (más en la tabla vestibular) | `alveolo` |
| `maduracion` (0,7) | El relleno toma el color del hueso laminar, aparecen trabéculas en el antiguo alvéolo, una tapa cortical lo cierra y la encía está cerrada; después la placa del relleno se funde con el trabecular | `corte` |
| `reabsorcion_reborde` (0,85) | El reborde pierde altura y grosor, más por vestibular: se estrecha, baja y se desplaza hacia lingual; osteoclastos sobre la superficie; el conducto queda más cerca de la cresta | `reborde` |
| `reborde_final` (1) | Reborde bajo y estrecho (filo de cuchillo que acaba plano), con el conducto casi en la cresta y el foramen mentoniano cerca de la superficie | `reborde` |

Se completa al visitar los ocho pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/alveolo/estado.ts`): pistas de fotogramas clave
  con tramos suavizados. Cada tejido del alvéolo tiene su presencia y su "encogido" (cuánto lo ha sustituido el
  tejido siguiente desde las paredes y el fondo); el reborde tiene una sola magnitud de pérdida (0 a 1) que sube
  poco hasta la maduración, la mayor parte en el primer año y el resto despacio. Las pruebas comprueban el orden
  de los tejidos (nada se encoge antes de estar completo; el diente ya no está cuando llega el coágulo) y que la
  pérdida y la maduración nunca retroceden.
- **El escenario se reutiliza.** Las constantes del cuerpo, la raíz y el conducto y los perfiles fijos (raíz,
  corona, pulpa, bandas del ligamento y de la lámina, perforaciones de la lámina) se importan de
  `../alveolar/{estado,disposicion,geometria,paleta}.ts` sin tocarlos. Con el reborde intacto el contorno de esta
  escena coincide con el de aquella (una prueba lo comprueba punto a punto).
- **Lo que cambia con el tiempo se morfa sobre mallas de topología fija** (`geometria.ts`): una `cinta`
  extruida entre dos carriles de N puntos (tapas y paredes; la cortical y las dos bandas de encía) y un `abanico`
  (la cara de la médula y los cinco rellenos del alvéolo). El índice se calcula una vez; en cada instante
  `disposicion.ts` (puro) devuelve los polígonos con el MISMO número de puntos y solo se reescriben las
  posiciones y las normales. Nada se recrea ni se recompila por fotograma.
- **El reborde que se pierde** (`disposicion.ts`, `semianchoReborde`): el perfil del cuerpo por encima de su parte
  más ancha se comprime hasta la cresta actual, se estrecha con un exponente alto (la base no cambia), más la
  tabla vestibular que la lingual (por eso la cresta se corre hacia lingual, y además se desplaza `DESPLAZAMIENTO_LINGUAL`),
  y la cresta se redondea con un radio que crece hasta dejarla en filo. El interior sigue al exterior menos el grosor
  de cada tabla. Las trabéculas que quedan fuera del hueso actual se ocultan (comprobación analítica, sin
  polígonos); el foramen y los osteoclastos del reborde siguen a la superficie.
- **El alvéolo es una pila de placas** sobre la cara de corte, de atrás hacia delante: hueso alveolar propio,
  fondo oscuro de la cavidad, hueso nuevo, granulación, coágulo, ligamento, raíz y pulpa. El tejido más nuevo
  ocupa el alvéolo entero detrás del anterior, que se encoge desde las paredes y el fondo: así se ve "crecer
  desde las paredes" sin agujeros en los polígonos. El techo de las placas es la cresta actual, para que nunca
  asomen por encima del hueso cuando el reborde baja. Al fundirse la placa de hueso nuevo, lo que queda detrás
  (médula y trabéculas, incluidas las del antiguo alvéolo, que aparecen al madurar) ya es el hueso definitivo.
- **Cinco piezas** (`mallas.ts`): `Reborde` (cortical morfable con tapas más claras, cara de la médula, 150
  trabéculas instanciadas, foramen), `Encia` (dos cintas abiertas que cierran hacia el centro de la cresta y
  siguen al reborde), `Diente` (media corona y placas de la raíz y la pulpa: sube y se desvanece), `Alveolo`
  (placas fijas y rellenos morfables, sangrado, vasos y osteoclastos instanciados) y `Conducto` (luz, borde,
  nervio, arteria y vena como discos sobre la cara de la médula).
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con la prop `resolverVista` y las vistas de
  `alveolo/vistas.ts`: `general`, `corte`, `alveolo` (las de `hueso_alveolar`, la tercera con el nombre de esta
  escena) y `reborde`, más baja y alejada para ver la cresta bajar hacia el conducto y el foramen.
- **Colores:** los de `NATURAL` en `alveolo/paleta.ts` (la paleta común de las escenas; el hueso, el diente, el
  ligamento, la lámina y el conducto, los de `hueso_alveolar`: ver «Revisión de diseño»). Los colores de los dibujos
  siguen en `HEX`, que ya no se dibuja.

## 3. Límites y honestidad

- Las formas son **esquemáticas**: el cuerpo es un bloque de sección ovoide, la corona un torno con una cúspide,
  el ligamento y la lámina van mucho más gruesos que en la realidad, el conducto va exagerado y algo alto, y el
  foramen mentoniano se dibuja en este mismo segmento (en la realidad queda a la altura de los premolares, pero
  este corte no pasa por él). La tapa cortical, los osteoclastos (células aplanadas, sin núcleos) y los vasos (discos) son señales,
  no histología.
- **La sección es plana.** El alvéolo y sus rellenos son placas superpuestas sobre la cara de corte, no volúmenes:
  al girar mucho la cámara hacia un lado se nota que no tienen grosor. Solo la cortical, la encía, la corona y las
  trabéculas tienen volumen. Desde el lado −X (detrás del bloque) se ve la tapa trasera sin la sección.
- **La pérdida del reborde es una fórmula, no un dato:** la compresión del perfil, los factores de estrechamiento
  (vestibular 1, lingual 0,55, exponente 3), el desplazamiento lingual (0,2 unidades) y el redondeo de la cresta se
  ajustaron para que a 0,2 unidades bajo la cresta quede un 40 a 65 % del ancho original en el "primer año"
  (`reborde` = 0,6) y para que el conducto siga dentro del hueso al final (queda a 0,16 unidades de la cara
  interna de la cresta). La cresta final está a la altura del ápice de la raíz que había, no por debajo, porque
  más abajo el conducto asomaría. El grosor de las tablas no cambia con la pérdida (la vestibular no se adelgaza:
  se pierde en altura y la cresta se estrecha).
- **La cronología es didáctica.** Los hitos no son proporcionales a los tiempos reales (horas, días, semanas,
  meses, años) y las fases se solapan menos que en la biología (aquí cada tejido termina de sustituirse antes de
  que aparezca el siguiente). El "40 a 60 %" es la cifra del texto de la sección (revisión sistemática a 6 meses,
  sitios mixtos), aplicada aquí a una única medida a 0,2 unidades bajo la cresta.
- **Sin revisión del docente** del texto de los pasos ni de las formas. Dudas científicas concretas que debería
  mirar: que el hueso alveolar propio se pinte desapareciendo entero durante el hueso entretejido (en realidad se
  reabsorbe en semanas y parte se remodela); que la encía cierre por completo ya en la fase de granulación (el
  cierre epitelial tarda unas semanas); la forma final del reborde ("filo" que acaba plano) frente a las clases IV
  y V de Cawood y Howell; y que el conducto y el foramen queden tan cerca de la cresta (aquí exagerado para que se
  vea).
- **Sin comprobación visual en navegador** (prohibida para esta tarea): no hay capturas. El encuadre se comprobó
  con la geometría: en cada hito, la caja envolvente de lo visible cabe en el cono de la cámara de su vista (y en
  `general` y `corte` siempre) con un lienzo cuadrado y 1,4° de margen; en lienzos estrechos la cámara se aleja
  como en la BMU. No se comprobó el aspecto de los materiales, la iluminación, el z-fighting de las placas (a una
  centésima unas de otras) ni el pellizco ni el giro con el dedo.
- **Sin medir en un teléfono real.** Presupuesto comprobado por pruebas en el peor instante: ver «Revisión de
  diseño» (las cifras anteriores no contaban la doble pasada ni las sombras). three va en el chunk `webgl`
  compartido.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes propias | `apps/web/src/scenes/procedural/alveolo/estado.ts` |
| Contorno del reborde, encía, rellenos, trabéculas, osteoclastos, foramen | `.../alveolo/disposicion.ts` |
| Cintas y abanicos de topología fija | `.../alveolo/geometria.ts` |
| Las cinco piezas | `.../alveolo/mallas.ts` |
| Vistas de cámara | `.../alveolo/vistas.ts` |
| Colores | `.../alveolo/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../alveolo/EscenaAlveolo.vue`, `ContenidoAlveolo.vue` |
| Pruebas (134) | `.../alveolo/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Escenario reutilizado | `scenes/procedural/alveolar/` (`estado`, `disposicion`, `geometria`, `paleta`) |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m6_el_paso_del_tiempo/content.json`, actividad `m6_4_alveolo_3d` |
| Dibujos hermanos en 2D | `public/images/m5/m5_cicatrizacion_alveolo_fases.svg`, `public/images/m6/m6_reborde_alveolar_cascada.svg` |

## Realismo (2026-10-14)

Mejora de realismo «paso por paso» con la base compartida (`scenes/procedural/realismo.ts` y `EntornoRealista.vue`),
la misma que en [escena-3d-alveolar.md](escena-3d-alveolar.md), que dibuja el mismo segmento de mandíbula. Lo que
sigue sustituye lo que dicen las secciones anteriores sobre los colores (sección 2) y el presupuesto (sección 3).

- **Paleta natural** propia (`NATURAL` en `alveolo/paleta.ts`, con las mismas claves que `HEX` más el cemento): el
  hueso, el diente, la médula, el conducto y sus vasos son los de la escena `hueso_alveolar`; la encía, rosa coral;
  el alvéolo vacío, en sombra rojiza casi negra; la sangre, roja y brillante; el coágulo, rojo oscuro. Se mantenían,
  algo más sobrios, los colores que nombran los textos (el ligamento «verde», la lámina «banda rosa oscuro», el hueso
  entretejido «claro» y los osteoclastos «violeta claro»): la revisión de diseño los sustituye por los naturales y
  propone el cambio de los textos.
- **Tejido por pieza**: superficie y cara de corte de la cortical, hueso alveolar propio, tapa cortical y borde
  del conducto: `hueso` (el cemento, `dentina` desde la revisión de diseño). Trabéculas: `hueso_esponjoso`. Médula: `medula`; también la luz del conducto (tejido
  conjuntivo laxo y grasa). Hueso nuevo: `hueso_inmaduro` (más poroso). Coágulo y tejido de granulación: `coagulo`
  (grumosos y muy húmedos). Ligamento: `membrana`. Encía y pulpa: `encia`. Esmalte: `esmalte`. Dentina: `dentina`.
  Fondo del alvéolo vacío y foramen: `cavidad`. Sangrado: `liquido`. Vasos, arteria y vena: `vaso`. Nervios:
  `nervio`. Osteoclastos: `celula`.
- **Relieve con UV en unidades de la escena**: las cintas y los abanicos que se morfan llevan UV que se reescriben
  con las posiciones (en las paredes de la cortical, el recorrido del contorno en espejo, sin costuras). Los extremos
  de las cintas abiertas de la encía tienen ahora vértices propios: antes compartían los de las tapas y sus normales
  se mezclaban con la cara de corte.
- **Forma**:
  - El diente es el de la escena `hueso_alveolar`: corona de primer premolar inferior con sus dos cúspides y el surco
    central, y en la cara de corte el esmalte, la dentina, el cemento (nuevo) y la pulpa.
  - 270 trabéculas (antes 150; las 150 primeras siguen en su sitio; la misma densidad que en `hueso_alveolar`) de
    seis caras, algo más finas por un extremo y de grosor variable.
  - Osteoclastos sin facetas: cúpulas de 12 × 4 caras sobre la cara de corte (de ellos solo se ve la mitad de
    delante) y esferas de 12 × 8 en el reborde, en dos grupos de instancias que no se dibujan a la vez. El objeto
    `osteoclastos` es ahora un grupo con los dos y se ve en las mismas fases que antes.
  - El nervio mentoniano asoma del foramen como un cabo corto (antes era un disco plano).
- **Desvanecer de verdad**: el diente que sale pasa a transparente y su material se recompila (antes subía opaco y
  desaparecía de golpe; ver la escena `hueso_alveolar`).
- **Luces**: el bloque de la escena del hueso y `EntornoRealista` (0,75), con sombras suaves.
- **Presupuesto** comprobado por pruebas en el peor instante, con la cuenta de entonces (sin la doble pasada ni las
  sombras; la de hoy, en «Revisión de diseño»): 6 400 triángulos y 24 llamadas de dibujo (antes 5 286 y 24; tope:
  40 000 y 40). Por pieza: reborde 4 288 (tope 5 500), encía 264 (700), diente 1 105 y 4 llamadas (1 200
  y 4: la media corona y la cara de corte del esmalte van en una sola malla, lo que deja sitio al cemento), alvéolo
  1 702 (3 000) y conducto 146 (500).
- **Pruebas nuevas** (7; 128 en total): UV en unidades en las cintas y vértices propios en los extremos de la
  abierta; UV en toda superficie con relieve; el desvanecido del diente recompila el material.
- **Dudas para el docente** (resueltas en la revisión de diseño): la encía que tapaba el foramen mentoniano en el
  último paso (fidelidad-11), la cresta por encima del cuello del diente (fidelidad-02) y los colores del ligamento y
  del hueso alveolar propio (fidelidad-01 y -03, con propuesta de cambio del texto).

No se ha visto en pantalla (el usuario prueba en local).

## Revisión de diseño (2026-10-17)

Revisión de render, rendimiento, fidelidad histológica y realismo, con la base compartida nueva (`realismo.ts`,
`iluminacion.ts` y `EntornoRealista.vue`). El segmento, el diente y la paleta son los de
[escena-3d-alveolar.md](escena-3d-alveolar.md), así que esta escena hereda sus correcciones (cara de corte que mira
a +X, render-02; cresta 0,2 por debajo del cuello con la raíz cervical en relieve, fidelidad-02; foramen apical,
fidelidad-12; cemento sin poros, fidelidad-13; esmalte con degradado, realismo-10). Además:

- **Encía vestibular del derecho** (render-07): sus carriles corren al revés que los de la lingual y la cinta quedaba
  con todas las normales hacia dentro (volumen negativo). Se escribe con los carriles intercambiados; una prueba
  comprueba que las dos cintas tienen volumen positivo en todo el recorrido.
- **Encía junto al diente** (fidelidad-02): con el cuello 0,2 sobre la cresta, la encía de 0,15 dejaba el margen bajo
  el cuello, como una recesión. Mientras hay diente, el carril libre sube hasta `ENCIA.margen` = 0,3 sobre la cresta
  (0,1 por encima del cuello, unos 0,8 mm); al cerrar el alvéolo baja al grosor de siempre.
- **El foramen mentoniano se ve en el último paso** (fidelidad-11, confirmado: en el reborde atrófico la banda de
  encía insertada se estrecha sobre la cresta y el foramen queda bajo una mucosa alveolar fina, que no se dibuja): la
  encía baja `caidaEncia(reborde)`, de 0,55 con el reborde intacto a 0,25 con la pérdida completa. Al final el borde
  superior del foramen queda 0,10 unidades por debajo de la encía.
- **Osteoclastos aplanados** (realismo-21): eran cúpulas y esferas de escala uniforme, que se leían como partículas.
  En la cara de corte, cúpulas bajas (0,038 de alto sobre una base de 0,11 × 0,085); en el reborde, esferas aplastadas
  a lo largo de la normal de la superficie (`normalSuperficie`), de 0,11 × 0,043 × 0,085. Sin triángulos nuevos.
- **Paleta común** (el mismo tejido, el mismo color): el ligamento periodontal pasa del verde salvia `#8fa57a` al
  rosado `#d4948b` de `hueso_alveolar` (fidelidad-01, confirmado: es tejido conjuntivo muy vascular, rosado en fresco;
  el verde solo venía del relleno de los SVG); el hueso alveolar propio, del rosa viejo `#b8747b` a la banda más clara,
  `#f4ecdc` (fidelidad-03, confirmado: es hueso compacto, la lámina dura); el hueso entretejido, del casi blanco
  `#f3eada` al rosado `#e2b4a2` (fidelidad-08, confirmado: más celular y vascular que el laminar; madura al marfil de
  las trabéculas, `#e6d8bc`); los osteoclastos, del violeta `#b49bd0` al lila `#b893cf` de la BMU y la ortodoncia
  (fidelidad-06); sangre `#a9271f`, coágulo `#7e1e1b` y vasos `#c9473e`. El tejido de granulación sigue `#d9877f`.
- **Sombras y pasadas** (rendimiento-01): las placas planas del alvéolo (lámina, ligamento, cavidad, rellenos, tapa,
  sangrado, vasos) y del corte del diente (dentina, pulpa) flotan sobre el hueco de la médula: no proyectan sombra
  (`userData.sinSombra`; su sombra hacía parecer despegada la cara de corte) y las que se desvanecen se dibujan en una
  sola pasada (`forceSinglePass`: una placa plana no tiene cara interior que ordenar). La corona y el cemento, que
  llevan relieve, conservan las dos pasadas.
- **Presupuesto** (rendimiento-09), medido como se dibuja (instancias, la doble pasada y, aparte, el pase de sombras)
  en 401 instantes: peor instante (t ≈ 0,09, el diente desvaneciéndose) **26 llamadas y 7 362 triángulos, más 18
  llamadas y 6 210 triángulos de sombra**; antes, con la misma cuenta, 29 y 7 582, más 24 y 6 400. Tope: 40 llamadas,
  40 000 triángulos y 40 llamadas de sombra.
- **Pruebas**: 134 (antes 128): las cintas de la encía con volumen positivo; el margen de la encía sobre el cuello; el
  foramen a la vista al final; los osteoclastos aplanados; las placas sin sombra y en una pasada; los mismos colores que
  en `hueso_alveolar` y la ortodoncia; el presupuesto con la doble pasada y las sombras. El encuadre de las vistas
  sigue comprobándose con la corona más alta.

### Propuestas de cambio de texto (`m6_el_paso_del_tiempo/content.json`, actividad `m6_4_alveolo_3d`)

Sin editar: los textos que nombran colores ya no coinciden con la escena hasta que el docente los acepte.

- `paso_diente` (478 → 482 caracteres): «El ligamento periodontal (verde) une» → «El ligamento periodontal (rosado) une», y
  «(banda rosa oscuro)» → «(banda blanca y densa)».
- `paso_hueso_entretejido` (351 → 363): «inmaduro y claro,» → «inmaduro y rosa pálido (muy vascular),», y «los
  osteoclastos (violeta claro)» → «los osteoclastos (lila)».
- `paso_reborde_final` (476 → 474, opcional): «y el foramen mentoniano cerca de la superficie» → «y el foramen
  mentoniano bajo una mucosa fina».

El dibujo `m6_reborde_alveolar_cascada.svg` sigue con el ligamento verde (`#b9cf8f`): cambiarlo a `#d4948b` o aceptar
la diferencia entre esquema y escena es decisión del docente.

- **Para mirar en pantalla**: la encía vestibular, que antes se veía por dentro; el margen de la encía junto al cuello
  en la vista `general`; el foramen en la vista `reborde`; los osteoclastos aplanados.

No se ha visto en pantalla (el usuario prueba en local).
