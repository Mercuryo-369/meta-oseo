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
- **Colores:** las familias de color del dibujo `m2_osteoclasto_resorcion.svg` (`HEX` de `osteoclasto/paleta.ts`) y
  de la BMU, para que cada estructura se reconozca del dibujo a la escena. Lo que se dibuja es la paleta natural
  (`NATURAL` del mismo archivo; ver «Realismo» y «Revisión de diseño», abajo).

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
  corte, con las dos mitades a la vista): 17 697 triángulos y 15 llamadas de dibujo (tope: 40 000 y 40), más
  como mucho 10 llamadas en el pase de sombras. three va en el chunk `webgl` compartido.
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

## Realismo (2026-10-14)

Mejora de realismo con la base compartida (`scenes/procedural/realismo.ts` y `EntornoRealista.vue`), la misma de
[escena-3d-hueso.md](escena-3d-hueso.md) y [escena-3d-matriz.md](escena-3d-matriz.md):

- **Paleta natural** propia (`NATURAL` en `osteoclasto/paleta.ts`, que tiene los valores vigentes; `HEX` no
  cambia): el hueso fresco es marfil (no el rosa de la tinción), la cara de corte un punto más clara y el fondo de
  la laguna de Howship pardo, más oscuro, como dice el texto. Células en tonos suaves: citoplasma lila, precursores
  lila pálido (desde el 2026-10-17; antes morados), núcleos índigo, pliegues violeta y zona clara casi blanca. Se
  mantienen, algo más sobrios, los colores que nombran los textos: H+ naranja, Cl- verde, catepsina K ámbar, calcio
  claro, fosfato azul, CTX rosa y capilar rojo. El texto alternativo de la actividad ya dice «un bloque de hueso
  marfil».
- **Color por vértice y por instancia con base blanca**: la superficie del hueso y las células mononucleares
  multiplicaban el color del material por el de cada vértice o instancia (salían más oscuras de lo previsto);
  ahora se ve el color de la paleta.
- **Tejido de cada pieza**: superficie, cara de corte y lados del bloque `hueso` (relieve de poros con UV en
  unidades de escena, una repetición cada 1,6 unidades: a esta escala recuerdan las bocas de los canalículos y miden
  lo mismo en todas las caras); capilar `vaso`; citoplasma, zona clara, cuerpos apoptóticos y células mononucleares
  `celula`; núcleos `nucleo`; pliegues del borde festoneado `organulo`; partículas `molecula`. Se conservan las
  opacidades y los materiales de una sola cara (las cúpulas translúcidas se ven mejor sin sus caras interiores).
  Los brillos propios (emisivos) se quitaron o se tiñeron el 2026-10-17 (ver abajo). La tapa de la sección lleva
  ahora UV.
- **Forma**: la cúpula tiene lóbulos suaves (`lobulosCupula`: hasta un 5 % del radio, solo hacia fuera y nulos en
  el borde, para que la célula siga sobre el anillo y los núcleos dentro; normales exactas, sin costura entre las
  dos mitades ni estrella en el polo; la tapa de la sección sigue el mismo contorno). Núcleos ovalados y algo
  aplanados; precursores y células de inversión de 12 × 8 lados (antes 10 × 7) y un poco ovalados; pliegues de
  10 × 7 (antes 8 × 6); cuerpos apoptóticos con su propia esfera de 12 × 8; capilar de 28 lados (antes 18);
  partículas de tamaño según lo que son (protón y calcio menores; catepsina K y CTX mayores). Posiciones, tiempos,
  hitos, vistas y nombres, sin cambios.
- **Luces**: el bloque de la escena del hueso (principal 2,6, contraluz frío 1,1, ambiental 0,18, hemisférica
  cálida 0,45) y la luz de entorno con sombras suaves. Desde el 2026-10-15 la escena no lleva luces propias: las
  pone el esquema común de `iluminacion.ts` (`EntornoRealista.vue`).
- **Presupuesto** (sustituye a las cifras de la sección 3): en el peor instante (`t` ≈ 0,43, durante el corte)
  17 697 triángulos (antes 16 217) y 15 llamadas de dibujo (sin cambios; no se añadió ninguna malla); tope 40 000
  y 40. En los 41 instantes de las pruebas, 15 423 (antes 13 943); por pieza: bloque 7 328, célula 7 767,
  mononucleares 3 696 (su tope de prueba pasa de 3 000 a 4 000) y partículas 5 280.

No se ha visto en pantalla (el usuario prueba en local).

## Revisión de diseño (2026-10-17)

Correcciones de la revisión de diseño y realismo, con el hallazgo de cada una:

- **Emisivos (realismo-03).** Fuera los del capilar (#7a2a24 × 0,35: la sangre no da luz), la zona clara (su propio
  color × 0,25: sumaba casi un cuarto de blanco y parecía un aro de neón), los núcleos (× 0,3) y los pliegues del
  borde festoneado (× 0,2): con la luz común ya tienen volumen sin brillar por dentro.
- **Partículas desteñidas (render-09).** Su emisivo era blanco × 0,18, y three lo suma igual a todas las instancias
  (no lo multiplica por el color de cada una): cada color subía hacia el blanco, el Cl- verde salía verde menta, el
  fosfato azul celeste y el H+ naranja, salmón. Se conserva el emisivo (sin él se apagarían en la penumbra, dentro
  de la célula), pero teñido con el color de cada instancia (`inyectar`, de `realismo.ts`: `totalEmissiveRadiance
  *= vColor.rgb`). El brillo de terciopelo de su material blanco ya es gris desde la base común. La verificación de
  realismo-03 proponía quitarlo del todo; la de render-09, teñirlo: se aplica esta, que conserva los colores que
  nombra el texto también en la penumbra.
- **Paleta unificada entre escenas (fidelidad-06).** En `NATURAL`: hueso `#e6d8bc` y cara de corte `#eadfc8` (los
  dos extremos del marfil del hueso maduro; antes `#e8dbc3` y `#efe5d1`, casi el blanco del hueso nuevo), fondo de
  la laguna `#b4956f` (el de la pared reabsorbida de la BMU; antes `#b1906f`), osteoclasto `#b893cf` (antes
  `#bfa2cd`), núcleos `#4b408f` (antes `#40357f`), capilar `#c9473e` (el vaso; antes `#d9574a`) y precursores
  `#cbb7da` (la versión pálida del osteoclasto, la misma de la BMU; antes `#ab8dc3`, más oscuros que la célula que
  forman). Partículas, zona clara, pliegues y cuerpos apoptóticos, sin cambios.
- **Pruebas que cuentan lo que se dibuja (rendimiento-09).** Los contadores cuentan dos veces las mallas de doble
  pasada (transparentes de doble cara; aquí no hay ninguna, y una prueba lo comprueba) y aparte el pase de sombras
  (tope 40 llamadas). Nueva prueba de los emisivos, con la sustitución comprobada en el sombreador real de three.
- **Higiene (rendimiento-16).** El alias engañoso `NATURAL as HEX` de `mallas.ts` pasa a `NATURAL as COLOR`, y el
  envoltorio local `poner` (que solo llamaba a `ponerOpacidad`) desaparece.

Presupuesto: sin cambios. Antes y después, en el peor instante (`t` ≈ 0,43), 17 697 triángulos y 15 llamadas de
dibujo; el pase de sombras, como mucho 10 llamadas. Todos los materiales son de una cara: no hay doble pasada.

No se ha visto en pantalla (la usuaria prueba en su equipo).
