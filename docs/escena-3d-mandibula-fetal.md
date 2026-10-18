# Escena 3D de la mandíbula fetal (módulo 2)

Nota de diseño de `mandibula_fetal`, escena **procedural** del OVA (el formato lo explica
[escena-3d-bmu.md](escena-3d-bmu.md); la plantilla de código es la del hueso largo,
[escena-3d-hueso.md](escena-3d-hueso.md)). Es una actividad **opcional** del módulo 2, `m2_1_mandibula_fetal_3d`
(sección 2.1 "Del ectomesénquima a la mandíbula", 30 puntos), que acompaña al texto y al vídeo de esa sección: en
vez de leer que "el hueso aparece junto al cartílago de Meckel", el estudiante ve dónde, junto a qué y en qué
orden.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y la escena **avanza en el desarrollo prenatal**, de la sexta semana al
nacimiento. La escala de tiempo es pedagógica (cada fase ocupa lo que necesita para verse), no proporcional a las
semanas; el texto de cada paso pone las semanas aproximadas. Puede ir y volver cuando quiera, girar la escena con
un dedo y acercarla con dos.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `mesenquima` (0) | La herradura de ectomesénquima del primer arco, con el cartílago de Meckel (varilla azul) por dentro y el nervio alveolar inferior (amarillo) por fuera, con sus ramas mentoniana e incisiva | `general` |
| `condensacion` (0,17) | Una mancha de mesénquima condensado, con sus células apretadas, lateral al Meckel en el ángulo entre el nervio y la rama mentoniana | `detalle` |
| `centro` (0,34) | La primera placa de hueso intramembranoso (rosa, destacada) en ese sitio; la condensación se apaga | `detalle` |
| `extension` (0,5) | El hueso crece hacia atrás y hacia delante como un canal alrededor del nervio, levanta dos láminas alrededor de los gérmenes dentarios y aparece la rama; en la mitad derecha falta un tramo (ventana de corte) para ver la sección en U | `corte` |
| `cartilagos_secundarios` (0,66) | Los cartílagos secundarios: condilar (un cono que baja por la rama), coronoideo (pequeño) y los dos nódulos sinfisarios entre las dos mitades | `lateral` |
| `meckel_regresion` (0,83) | El cartílago de Meckel se adelgaza y desaparece junto al cuerpo; quedan el martillo y el yunque (dos piezas en el oído) y el ligamento esfenomandibular (hilo fino) | `lateral` |
| `nacimiento` (1) | Mandíbula neonatal: dos mitades unidas por los cartílagos sinfisarios, rama corta y ángulo abierto, cóndilo casi osificado con una capa de cartílago, sin coronoideo, sin mesénquima | `general` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/mandibula_fetal/estado.ts`): pistas de fotogramas
  clave con tramos suavizados (`evaluarPista`). El hueso tiene `alcance` (cuánto se ha extendido a cada lado del
  centro de osificación, en el parámetro `u` del arco), `tamano` de la sección, altura `alveolar` de las láminas,
  destello del centro y tamaño de la rama; el Meckel tiene `regresion` y `osiculos`; los cartílagos secundarios y
  la osificación del cóndilo van aparte. Nada se acumula: adelantar y atrasar es exacto.
- **Todo sigue un arco** (`disposicion.ts`, puro): cada mitad es una curva de Bézier cuadrática desde el oído
  (atrás y arriba) hasta la línea media, con el punto de control casi a la altura del mentón para que las dos
  mitades se junten sin quiebro; por detrás de `u = 0` el arco sube hacia el oído (solo lo recorren el Meckel y
  el nervio). Un punto se describe por `u`, un desplazamiento lateral `n` (normal horizontal hacia fuera) y una
  altura `y`: el Meckel va en `n = 0`, el nervio en `n = 0,46` (y `y = -0,06`, cerca del suelo de la canaleta), el
  centro del cuerpo óseo en `n = 0,5`. El nervio se bifurca en `u = 0,54` (bajo el germen del primer molar temporal)
  y el primer centro de osificación está en `u = 0,55`, justo delante.
- **Casi todo es un barrido** (`geometria.ts`, clase `Barrido`): un perfil cerrado (círculo para el Meckel y el
  nervio, elipse para el mesénquima, canal en U para el hueso) recorre el arco. La topología (anillos, tapas,
  índices) se reserva una vez y solo se reescriben las posiciones cuando cambia el estado, así el hueso crece y
  el Meckel se adelgaza sin crear geometría. El mesénquima es un solo barrido continuo por las dos mitades.
- **El cuerpo óseo crece desde el centro** con una punta que se afila (`escalaCuerpoEn`): la sección es el perfil
  en U (`perfilCuerpo`) escalado por el tamaño y por una rampa que llega a cero en el borde del alcance. Las
  láminas del perfil suben con `alveolar` sin cambiar la topología, lo que permite triangular la tapa una sola
  vez. La ventana de corte (`VENTANA_CORTE`) parte el cuerpo de la mitad +X en dos tramos con tapas: al mirar la
  tapa se ve la U con el nervio en el suelo y un germen dentro.
- **Cinco piezas** (`mallas.ts`): `Mesenquima` (masa translúcida y 150 células instanciadas), `CartilagoMeckel`
  (varilla que se adelgaza al ligamento; martillo y yunque como elipsoides instanciados), `NervioAlveolar`
  (tronco, rama incisiva y mentoniana en un solo barrido), `Condensacion` (dos manchas y 80 células) y
  `HuesoMandibular` (cuerpo, gérmenes en campana: el órgano del esmalte en torno con la papila dentro; rama
  extruida de una silueta con cóndilo y coronoides, y los seis cartílagos secundarios instanciados: condilar y
  coronoideo de cada lado y dos nódulos sinfisarios). Reciben el estado y solo escriben posiciones, escalan o
  aclaran; las que no se ven llevan `visible = false`.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con la prop `resolverVista` y las vistas de
  `mandibula_fetal/vistas.ts`: `general` (desde delante y arriba, algo a la derecha), `lateral` (desde +X, la
  rama y el cóndilo), `corte` (cerca de la ventana, mirando la tapa posterior) y `detalle` (el centro de
  osificación desde arriba y lateral).
- **Colores** (`paleta.ts`): `HEX` guarda los de los dibujos (`m2_origen_mandibula.svg`, el del módulo 3) y de las
  escenas vecinas, y ya no se dibuja; la escena usa `NATURAL` (ver «Realismo» y «Revisión de diseño»): masa
  gelatinosa translúcida, hueso fetal rosado `#e2b4a2`, cartílago blanco azulado `#d9e8ef`, nervio amarillento,
  gérmenes crema bajo una campana azulada y un rojizo para el destello del centro.

## 3. Límites y honestidad

- Las formas son **esquemáticas**: el arco es una herradura idealizada; el cuerpo, un canal en U con dos láminas
  (no hay cortical, trabéculas ni foramen mentoniano dibujado: el nervio mentoniano sale por la lámina vestibular);
  la rama es una placa plana extruida; los gérmenes son un órgano del esmalte en campana (un torno) sobre una papila
  aplastada, sin lámina dental ni las capas del órgano del esmalte. Los tamaños relativos (Meckel, nervio,
  gérmenes, huesecillos) están exagerados para verse en un teléfono; los molares temporales son algo mayores que el
  canino y los incisivos.
- El **cartílago de Meckel queda medial al hueso y visible** en las fases de extensión: el cuerpo no lo envuelve
  como en la realidad (donde el hueso lo rodea en parte); se dibuja separado para que la varilla se distinga del
  hueso. Las dos varillas casi se tocan en la línea media, pero no se dibuja su unión.
- El **nervio** va dentro de la canaleta en U, cerca de su suelo (al nacer el conducto mandibular corre cerca del
  borde inferior), pero no queda encerrado en un conducto cerrado: por encima están los gérmenes.
- El **ligamento esfenomandibular** se dibuja como el resto adelgazado del tramo posterior del Meckel, del oído
  hasta la cara medial de la rama; su inserción real (espina del esfenoides, língula) no está representada.
- La regresión del Meckel (hito en `t` = 0,83) y la aparición de los huesecillos van juntas y **antes** de que el
  cóndilo termine de osificarse (`t` = 1); en la realidad estos procesos se solapan durante meses. La escala de
  tiempo es pedagógica, no proporcional.
- **Sin revisión del docente** del texto de los pasos ni de las formas. Dudas científicas concretas que debería
  mirar: la altura relativa de la rama neonatal y el ángulo; que el cartílago coronoideo desaparezca antes del
  nacimiento (aquí se apaga en `t` = 0,98); los dos nódulos sinfisarios entre las dos mitades; el cartílago
  condilar en cono que se reduce a una capa; la bifurcación del nervio bajo el primer molar temporal y el primer
  centro de osificación justo delante; y la forma del nervio mentoniano (aquí sale hacia fuera y arriba desde la
  bifurcación).
- **Sin medir en un teléfono real.** Presupuesto comprobado por pruebas en el peor instante (`t` ≈ 0,73), contando
  la doble pasada de los transparentes de doble cara y una llamada por grupo de material: 30 048 triángulos y 13
  llamadas de dibujo, más 10 del pase de sombras (tope: 40 000 y 40). three va en el chunk `webgl` compartido.
- Verificada en Chrome con WebGL, con emulación táctil de 390 × 844 px (`t` = 0; 0,17; 0,34; 0,5; 0,66; 0,83 y 1,
  en vista automática, más `detalle` en 0,34, `corte` en 0,5 y `lateral` en 1) y a 1280 × 800 px (`t` = 0,5 y 1).
  No se probó el pellizco ni la cámara libre. La etiqueta de la vista `detalle` en el selector de vistas de la
  actividad dice "Detalle del túnel" porque `PanelLineaTiempo.vue` tiene un mapa de etiquetas pensado para la BMU;
  arreglarlo queda fuera de esta escena.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes | `apps/web/src/scenes/procedural/mandibula_fetal/estado.ts` |
| Arco, nervio, perfil del cuerpo, silueta de la rama, células | `.../mandibula_fetal/disposicion.ts` |
| Barrido, esfera unitaria, placa extruida | `.../mandibula_fetal/geometria.ts` |
| Las cinco piezas | `.../mandibula_fetal/mallas.ts` |
| Vistas de cámara | `.../mandibula_fetal/vistas.ts` |
| Colores | `.../mandibula_fetal/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../mandibula_fetal/EscenaMandibulaFetal.vue`, `ContenidoMandibulaFetal.vue` |
| Pruebas | `.../mandibula_fetal/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts`, `vistas.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m2_descubriendo_sus_celulas/content.json`, actividad `m2_1_mandibula_fetal_3d` |

## Realismo (2026-10-14)

A petición del usuario («no se ve tan real»), con la base compartida (`scenes/procedural/realismo.ts`,
`EntornoRealista.vue`):

- **Paleta natural** (`NATURAL` en `mandibula_fetal/paleta.ts`): ectomesénquima gelatinoso y translúcido (ya no
  violeta de tinción) y condensación más densa y opaca; hueso fetal rosado (es muy vascular), cara de corte rojiza
  con espacios vasculares, cartílago blanco azulado, nervio amarillento, gérmenes cremosos bajo una campana
  azulada. Se ajustaron dos textos de pasos: «(masa violeta)» → «(masa gelatinosa translúcida)», «una varilla
  azul» → «una varilla de un blanco azulado» y «(manchas moradas)» → «(manchas más densas y opacas)».
- **Materiales por tejido**: mesénquima (`mesenquima`), células (`celula`), cartílagos de Meckel, secundarios y
  osículos (`cartilago`), nervio con fascículos (`nervio`), cuerpo y rama de hueso entretejido poroso
  (`hueso_inmaduro`) y, en la ventana de corte, el interior esponjoso (`hueso_esponjoso`, segundo material de
  las tapas del barrido).
- **Geometría**: los barridos (`Barrido`) traen ahora coordenadas UV (en espejo alrededor del perfil, sin costura)
  y dos grupos de índices (paredes y tapas); el perfil del cuerpo y la silueta de la rama se suavizan con el
  algoritmo de Chaikin (sin aristas de polígono); la rama tiene los cantos redondeados (bisel de 0,045, normales
  suavizadas por ángulo); más lados en el Meckel (14), el nervio (10), el mesénquima (18), los gérmenes y los
  cartílagos secundarios. El peor instante sigue por debajo de 40 000 triángulos y 40 llamadas de dibujo.
- **Luz**: entorno de estudio, contraluz y sombras suaves (las piezas que se desvanecen no proyectan sombra).

No se ha visto en pantalla.

## Revisión de diseño (2026-10-17)

Revisión con mirada de diseñador gráfico y de odontólogo, sobre la base compartida nueva (luces de
`iluminacion.ts` y `EntornoRealista.vue`, motas y rugosidad de `realismo.ts`). La usuaria dijo que la escena «no se
ve tan real»: había dos fallos de render graves, ya corregidos.

- **Normales del revés en la mitad +X (render-07).** `Barrido` usaba el mismo orden de índices en las dos mitades,
  pero `normalLateral` se refleja de una a otra: en la mitad +1 (la de las vistas `corte`, `lateral` y `detalle`)
  todas las paredes miraban hacia dentro (Meckel 0 de 630 normales hacia fuera, nervio 0 de 590, cuerpo con volumen
  negativo), y también el mesénquima entero, un solo tramo de oído a oído. Ahora cada tramo dice si su marco es
  diestro (`invertir`): se invierten sus paredes y se dejan sus tapas. Con eso cuadran la sombra propia, la doble
  pasada de la masa translúcida (antes pintaba la pared cercana antes que la del fondo) y las caras de la ventana de
  corte. Pruebas nuevas: volumen con signo de cada tramo, tapas hacia fuera y el 100 % de las normales de vértice
  hacia fuera en las dos mitades.
- **Células detrás de la pared del fondo (render-06).** Las células del mesénquima y de la condensación no escribían
  profundidad y la pared del fondo de la masa (que se dibuja después) se mezclaba encima: en la condensación se veía
  un 3 % de cada célula en vez del 16 %. Ahora la escriben en cuanto se ven (opacidad > 0,5, la regla de
  `ponerOpacidad`) y van en una sola pasada (`forceSinglePass`, rendimiento-01).
- **Germen en campana (realismo-18).** El órgano del esmalte es un torno convexo por fuera y cóncavo por dentro,
  abierto abajo (el asa cervical), y la papila dental es la esfera crema, aplastada y más baja, que asoma por debajo.
  Los colores no cambian («crema, con una campana azulada»). Los molares temporales son algo mayores (radios 0,21;
  0,2; 0,18; 0,16 y 0,16 en vez de cinco de 0,19).
- **Grano del relieve (realismo-19).** Las UV del barrido van alrededor del perfil por longitud de arco (antes por
  punto: en el perfil en U el grano se estiraba en las láminas) y las de la cara de corte con la misma escala en los
  dos ejes; la rama escala sus UV. Medido al nacer: cuerpo y rama a ~1,8 repeticiones por unidad en los dos sentidos
  (antes la rama, con el mismo material, iba a 4-6 y el cuerpo a 1,5-2,7); cara de corte a ~3,7, redonda; Meckel a
  1,2 × 1,7 (antes 8,8 × 1,2: vetas en un cartílago hialino).
- **Bifurcación del nervio y primer centro de osificación (fidelidad-05, comprobado).** Sadler (*Langman*) y Moore
  (*The Developing Human*) forman la mandíbula por osificación intramembranosa del mesénquima lateral al Meckel, y
  Nanci (*Ten Cate's Oral Histology*) sitúa el primer centro en el ángulo de la división del nervio alveolar
  inferior en sus ramas incisiva y mentoniana, cerca del futuro foramen mentoniano; al nacer ese foramen se abre
  bajo el primer molar temporal (*Gray's Anatomy*). La bifurcación estaba
  en `u` = 0,72, entre el canino y el incisivo lateral, y dejaba el germen del canino bajo el tronco. Ahora:
  bifurcación en 0,54 (bajo el primer molar), centro en 0,55 y ventana de corte de 0,485-0,555 a 0,36-0,43, por
  detrás del centro (fuera de la placa inicial, con el tronco del nervio en la canaleta y el germen del segundo
  molar dentro). Efecto en la animación: en la extensión (`t` = 0,5) el hueso ya llega a la rama (antes la rama
  quedaba suelta) y las dos mitades se juntan en la línea media un poco después (hacia `t` = 0,55). Las vistas
  `corte` y `detalle` se orientan ahora respecto a la tangente del arco en su objetivo, con el mismo ángulo que antes
  (47° y 86°): sus azimuts pasan de 20° y 40° a unos 30° y 56°, para que la tapa de la ventana se siga viendo por
  fuera del tramo de delante.
- **Forma (fidelidad-18, comprobado en la geometría y en Nanci).** El cuerpo se separa más del Meckel (`N_CUERPO`
  0,42 → 0,5): la lámina lingual ya no se mete en la varilla entre `t` 0,55 y 0,8. El nervio va centrado en la
  canaleta y cerca de su suelo (`n` 0,34 → 0,46; `y` 0,05 → -0,06): antes flotaba a media altura. Dos nódulos
  sinfisarios en vez de uno. El cartílago condilar nace como un cono que baja por la rama y se reduce a una capa sobre
  la cabeza al osificarse.
- **Paleta unificada:** hueso fetal `#e2b4a2` (antes `#ebc9bb`), el mismo hueso inmaduro de las dos rutas y del
  callo.
- **Higiene (rendimiento-15 y rendimiento-16):** sin objetos de three creados en cada fotograma; fuera las
  exportaciones sin uso (`muestrasDeArco`, `GERMENES_POR_LADO`, `ANCHO_CUERPO`, `LIMITES_CUERPO`); `NATURAL` se importa
  como `COLOR`.

Presupuesto en el peor instante (`t` ≈ 0,73), contando la doble pasada y los grupos de material: antes 34 504
triángulos y 14 llamadas (10 de sombras, 18 744 triángulos); después 30 048 triángulos y 13 llamadas (10 de
sombras, 19 688 triángulos). La pieza `HuesoMandibular` pasa su tope de 14 000 a 15 000 triángulos (la campana y el
segundo nódulo sinfisario); la escena sigue lejos de 40 000.

No se ha visto en pantalla. Conviene mirar: la papila crema que asoma bajo la campana; que la campana del segundo
molar no asome por fuera de la lámina vestibular en `t` = 0,5; el cono condilar en `t` = 0,66; y la vista `corte`
con la ventana nueva.
