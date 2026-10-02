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
| `hueso_entretejido` (0,56) | Hueso entretejido claro rellena el alvéolo desde el fondo y las paredes; osteoclastos sobre el hueso alveolar propio, que se desvanece (más en la tabla vestibular) | `alveolo` |
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
- **Colores:** los de la escena `hueso_alveolar` para el hueso, el diente, el ligamento y el conducto; los de
  `m5_cicatrizacion_alveolo_fases.svg` para la encía y el sangrado; coágulo `#8e2530`, granulación `#f3b8b0`,
  hueso entretejido `#f2c4d3` que madura al `#d98aa2` del hueso; osteoclastos `#c9a0dc` de la BMU (`paleta.ts`).

## 3. Límites y honestidad

- Las formas son **esquemáticas**: el cuerpo es un bloque de sección ovoide, la corona un torno con una cúspide,
  el ligamento y la lámina van mucho más gruesos que en la realidad, el conducto va exagerado y algo alto, y el
  foramen mentoniano se dibuja en este mismo segmento (en la realidad queda a la altura de los premolares, pero
  este corte no pasa por él). La tapa cortical, los osteoclastos (esferas) y los vasos (discos) son señales, no
  histología.
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
- **Sin medir en un teléfono real.** Presupuesto comprobado por pruebas en el peor instante: 5 286 triángulos y 24
  llamadas de dibujo (tope: 40 000 y 40). three va en el chunk `webgl` compartido.

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
| Pruebas (121) | `.../alveolo/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Escenario reutilizado | `scenes/procedural/alveolar/` (`estado`, `disposicion`, `geometria`, `paleta`) |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m6_el_paso_del_tiempo/content.json`, actividad `m6_4_alveolo_3d` |
| Dibujos hermanos en 2D | `public/images/m5/m5_cicatrizacion_alveolo_fases.svg`, `public/images/m6/m6_reborde_alveolar_cascada.svg` |
