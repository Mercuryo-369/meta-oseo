# Escena 3D del osteoclasto: de precursores a laguna de resorción (módulo 2)

Nota de diseño de `osteoclasto_resorcion`, escena **procedural** del OVA (el formato lo explica
[escena-3d-bmu.md](escena-3d-bmu.md); la plantilla de código es la del hueso largo,
[escena-3d-hueso.md](escena-3d-hueso.md)). Es una actividad **opcional** del módulo 2, `m2_4_osteoclasto_3d`
(sección 2.4 "El osteoclasto, célula que reabsorbe", 30 puntos), que acompaña a la actividad multicapa
`m2_multicapa_osteoclasto`: el mismo osteoclasto del dibujo `m2_osteoclasto_resorcion.svg`, pero visto nacer,
trabajar y morir.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y la escena **recorre la vida de un osteoclasto**. Aquí `t` sí es
tiempo, con escala pedagógica (la fusión dura horas; una laguna, días). Puede ir y volver cuando quiera, girar
la escena con un dedo y acercarla con dos.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `precursores` (0) | Un bloque de hueso con un capilar detrás; seis precursores mononucleares cuelgan del capilar y bajan en arco hasta la superficie | `general` |
| `fusion` (0,16) | Los precursores convergen y quedan como bultos sobre una célula redonda que crece; dentro se ven los núcleos | `celula` |
| `adhesion` (0,32) | La célula se aplana en cúpula sobre el hueso y aparece el anillo claro de la zona de sellado | `celula` |
| `borde_rugoso` (0,48) | La mitad delantera del bloque y de la célula se aparta y se desvanece: en sección, los pliegues del borde festoneado y partículas que caen hacia el hueso (H+ naranja, Cl- verde, catepsina K ámbar) | `borde` |
| `resorcion` (0,64) | La superficie se hunde bajo la célula: laguna de Howship de borde festoneado y fondo más oscuro | `laguna` |
| `liberacion` (0,8) | Calcio (claro), fosfato (azul) y colágeno (rosa) suben del fondo de la laguna, cruzan la célula y salen hacia el capilar | `celula` |
| `apoptosis` (1) | La célula se encoge, se aclara y se fragmenta; el anillo y los pliegues se deshacen; queda la laguna vacía y llegan cinco células de inversión por los lados | `laguna` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/osteoclasto/estado.ts`): trece pistas de
  fotogramas clave (`evaluarPista`) para la llegada, la fusión, el aplanamiento, el sellado, el corte, los
  pliegues, el bombeo, la excavación, la liberación, el encogimiento, la opacidad, la fragmentación y la
  inversión. Las magnitudes derivadas que comparten mallas y pruebas también son puras: `dimensionesCelula`
  (semiejes y centro de la cúpula) y `profundidadLaguna(x, z, excavacion)` (cuenco de borde festoneado con
  ondulaciones en el fondo).
- **La escena se corta por z = 0.** El bloque y la célula están en dos mitades; a partir de 0,37 la mitad
  delantera (+Z) se desplaza hacia la cámara y se desvanece, y la trasera queda como sección: la cara de corte
  del bloque sigue la laguna (su fila superior de vértices baja con `profundidadLaguna`) y la cúpula lleva una
  tapa de sección plana (`tapaCupula`). Todas las vistas miran desde +Z para tener la sección de frente.
- **La laguna se escribe en su sitio**: la superficie del hueso es una rejilla de 72 × 24 celdas por mitad con
  color por vértice; al cambiar `excavacion` se reescriben alturas y colores (de hueso a hueso resorbido) y se
  recalculan las normales. Se salta si la excavación no cambió.
- **Cuatro piezas** (`mallas.ts`): `EntornoOseo` (dos `MitadBloque` y el capilar), `Osteoclasto` (dos medias
  cúpulas con tapa, dos medios anillos de sellado, núcleos, pliegues y cuerpos apoptóticos instanciados),
  `CelulasMononucleares` (un solo `InstancedMesh` con color por instancia para precursores y células de
  inversión, dos instancias por célula: cuerpo y núcleo) y `Particulas` (dos `InstancedMesh`, ácido y
  productos; su avance sale de `t`, con 16 y 10 ciclos por línea de tiempo, sin relojes propios).
- **Piezas repetidas y sus posiciones** (`disposicion.ts`, puro y determinista con `generadorDeterminista`):
  precursores, seis núcleos alternando delante y detrás del corte, 36 pliegues en tres coronas, partículas solo
  en la mitad trasera, células de inversión desde los lados y cuerpos apoptóticos en direcciones repartidas.
- **Durante la fusión los precursores quedan fuera de la célula**: su posición se empuja hasta el radio de la
  célula que crece, para que se vean como bultos que se absorben y no desaparezcan dentro.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con la prop `resolverVista` y las vistas de
  `osteoclasto/vistas.ts`. En un lienzo estrecho la cámara se aleja sola (`estadoDeEsferica`).
- **Colores:** los del dibujo `m2_osteoclasto_resorcion.svg` (núcleos `#3b2f86`, zona clara `#f1ecfb`, H+
  `#f2745e`, Cl- `#2fa88c`, catepsina K `#e2a12e`) y de la BMU para el hueso, el capilar, el precursor y el
  citoplasma, para que cada estructura se reconozca del dibujo a la escena.

## 3. Límites y honestidad

- Las formas son **esquemáticas**: la célula es una cúpula lisa (esfera cortada), no una célula con
  citoplasma irregular; los pliegues del borde festoneado son elipsoides verticales, no repliegues de membrana
  continuos; el capilar es un tubo recto sin pared ni sangre. Nada guarda escala (un osteoclasto mide 50 a
  100 µm; aquí la célula es 2,5 unidades y el bloque 6,4).
- La zona de sellado es un **toro** sobre la superficie, no una banda de citoplasma dentro de la célula; se
  lee bien de lejos, pero de cerca parece un aro aparte.
- Las **partículas son símbolos**: el H+ y el Cl- caen como esferas desde una altura fija dentro del
  citoplasma hasta el suelo de la laguna; no hay bombas ni canales dibujados en la membrana. Los productos
  suben por una curva del fondo de la laguna al capilar, pasando por la cima de la célula (transcitosis),
  también como esferas.
- La mitad delantera **se desvanece** al apartarse; con la cámara casi de frente, una mitad opaca desplazada
  tapaba la sección. Desde detrás del bloque (−Z) se ve el interior de la media cúpula sin tapa: no hay vista con
  nombre que mire desde allí.
- En la vista `borde` la cara de corte del bloque ocupa la mitad inferior del lienzo: es el precio de tener la
  sección de frente y a poca altura.
- El citoplasma no escribe profundidad (para ver núcleos y pliegues a través); con la cámara girada a mano se
  puede notar algún orden de dibujo extraño entre la cúpula y el anillo.
- **Sin revisión del docente** del texto de los pasos ni de las formas. Dudas científicas concretas que debería
  mirar: el número de núcleos (seis), la salida de los productos "por arriba" hacia el capilar (la transcitosis
  se libera por el dominio basolateral; el capilar aquí está justo encima por claridad), el orden y la duración
  relativa de las fases, y que las células de inversión lleguen después de la apoptosis (en la BMU real se
  solapan).
- **Sin medir en un teléfono real.** Presupuesto medido por prueba en el peor instante (`t` = 0,43, durante el
  corte, con las dos mitades a la vista): 16 217 triángulos y 15 llamadas de dibujo (tope: 40 000 y 40). three
  va en el chunk `webgl` compartido.
- Verificada en Chrome con WebGL y emulación táctil de 390 × 844 px (`t` = 0; 0,16; 0,32; 0,48; 0,64; 0,8 y 1
  en vista automática, más las vistas `celula`, `borde` y `laguna` en sus hitos) y a 1280 × 800 px (`t` = 0,48 y
  1); capturas en `.verify/osteoclasto/`. No se probó el pellizco ni el giro con el dedo, ni la reproducción
  completa, ni el tema claro.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes geométricas, laguna | `apps/web/src/scenes/procedural/osteoclasto/estado.ts` |
| Precursores, núcleos, pliegues, partículas, inversión, fragmentos | `.../osteoclasto/disposicion.ts` |
| Medias cúpulas, tapa, superficie, cara de corte, anillos, tubo | `.../osteoclasto/geometria.ts` |
| Las cuatro piezas | `.../osteoclasto/mallas.ts` |
| Vistas de cámara | `.../osteoclasto/vistas.ts` |
| Colores | `.../osteoclasto/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../osteoclasto/EscenaOsteoclasto.vue`, `ContenidoOsteoclasto.vue` |
| Pruebas | `.../osteoclasto/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m2_descubriendo_sus_celulas/content.json`, actividad `m2_4_osteoclasto_3d` |
| Dibujo hermano en 2D | `public/images/m2/m2_osteoclasto_resorcion.svg`, actividad `m2_multicapa_osteoclasto` |
