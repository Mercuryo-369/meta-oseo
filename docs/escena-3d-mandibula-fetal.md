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
| `cartilagos_secundarios` (0,66) | Los tres cartílagos secundarios: condilar sobre la rama, coronoideo (pequeño) y sinfisario entre las dos mitades | `lateral` |
| `meckel_regresion` (0,83) | El cartílago de Meckel se adelgaza y desaparece junto al cuerpo; quedan el martillo y el yunque (dos piezas en el oído) y el ligamento esfenomandibular (hilo fino) | `lateral` |
| `nacimiento` (1) | Mandíbula neonatal: dos mitades unidas por el cartílago sinfisario, rama corta y ángulo abierto, cóndilo casi osificado con una capa de cartílago, sin coronoideo, sin mesénquima | `general` |

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
  altura `y`: el Meckel va en `n = 0`, el nervio en `n = 0,34`, el centro del cuerpo óseo en `n = 0,42`.
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
  `HuesoMandibular` (cuerpo, gérmenes con su campana, rama extruida de una silueta con cóndilo y coronoides,
  y los cinco cartílagos secundarios instanciados). Reciben el estado y solo escriben posiciones, escalan o
  aclaran; las que no se ven llevan `visible = false`.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con la prop `resolverVista` y las vistas de
  `mandibula_fetal/vistas.ts`: `general` (desde delante y arriba, algo a la derecha), `lateral` (desde +X, la
  rama y el cóndilo), `corte` (cerca de la ventana, mirando la tapa posterior) y `detalle` (el centro de
  osificación desde arriba y lateral).
- **Colores** (`paleta.ts`): el ectomesénquima violeta del dibujo `m2_origen_mandibula.svg`, el cartílago azul
  hielo del hueso largo, el hueso rosa de la BMU, el nervio amarillo del hueso alveolar, el germen del color de
  la dentina, y un rosa oscuro (`sitio_primer_osificacion` del dibujo del módulo 3) para el destello del centro.

## 3. Límites y honestidad

- Las formas son **esquemáticas**: el arco es una herradura idealizada; el cuerpo, un canal en U con dos láminas
  (no hay cortical, trabéculas ni foramen mentoniano dibujado); la rama es una placa plana extruida; los gérmenes
  son esferas con una media esfera encima a modo de órgano del esmalte, sin lámina dental ni yema. Los tamaños
  relativos (Meckel, nervio, gérmenes, huesecillos) están exagerados para verse en un teléfono.
- El **cartílago de Meckel queda medial al hueso y visible** en las fases de extensión: el cuerpo no lo envuelve
  como en la realidad (donde el hueso lo rodea en parte); se dibuja separado para que la varilla se distinga del
  hueso. Las dos varillas casi se tocan en la línea media, pero no se dibuja su unión.
- El **nervio** va dentro de la canaleta en U pero no queda encerrado en un conducto cerrado: el "techo" del canal
  son los gérmenes. En las vistas cercanas se ve el nervio sobre el suelo del hueso.
- El **ligamento esfenomandibular** se dibuja como el resto adelgazado del tramo posterior del Meckel, del oído
  hasta la cara medial de la rama; su inserción real (espina del esfenoides, língula) no está representada.
- La regresión del Meckel (hito en `t` = 0,83) y la aparición de los huesecillos van juntas y **antes** de que el
  cóndilo termine de osificarse (`t` = 1); en la realidad estos procesos se solapan durante meses. La escala de
  tiempo es pedagógica, no proporcional.
- **Sin revisión del docente** del texto de los pasos ni de las formas. Dudas científicas concretas que debería
  mirar: la altura relativa de la rama neonatal y el ángulo; que el cartílago coronoideo desaparezca antes del
  nacimiento (aquí se apaga en `t` = 0,98); que la sínfisis se muestre como una pieza de cartílago única entre
  las dos mitades; y la forma del nervio mentoniano (aquí sale hacia fuera y arriba desde la bifurcación).
- **Sin medir en un teléfono real.** Presupuesto comprobado por pruebas en el peor instante (`t` ≈ 0,73):
  18 160 triángulos y 11 llamadas de dibujo (tope: 40 000 y 40). three va en el chunk `webgl` compartido.
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
| Pruebas | `.../mandibula_fetal/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m2_descubriendo_sus_celulas/content.json`, actividad `m2_1_mandibula_fetal_3d` |
