# Escena 3D del osteocito y su red lacuno-canalicular (módulo 2)

Nota de diseño de `osteocito_red`, escena **procedural** del OVA construida sobre la plantilla del hueso
([escena-3d-hueso.md](escena-3d-hueso.md)) y la cámara de la BMU ([escena-3d-bmu.md](escena-3d-bmu.md), que explica el
formato, los controles y cómo añadir otra escena). Es una actividad **opcional** del módulo 2, `m2_3_osteocito_3d`
(sección 2.3 "El osteocito, sensor del hueso", 30 puntos), que sigue a la imagen multicapa del osteocito en su
laguna: el mismo dibujo, ahora en 3D y en movimiento.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y ve, dentro de un bloque de matriz mineralizada, cómo se **construye** la
red del osteocito y cómo **trabaja** cuando el hueso recibe carga. Puede girar la escena con un dedo y acercarla con
dos. El tiempo no es real: la red tarda semanas en formarse y la respuesta a la carga va de segundos a horas.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `laguna` (0) | El osteocito central en su laguna: cuerpo, núcleo y cilio primario | `laguna` |
| `dendritas` (0,17) | Las dendritas se alargan dentro de sus canalículos; esclerostina saliendo de la célula | `canaliculos` |
| `red` (0,34) | Ocho vecinos, uniones comunicantes (verde), dendritas al conducto con capilar y a la superficie | `red` |
| `carga` (0,5) | Flechas de compresión, el bloque se encoge un 4 % y el líquido (azul) fluye por los canalículos | `canaliculos` |
| `senal` (0,66) | Cilio e integrinas (amarillo) laten; la esclerostina desaparece | `canaliculos` |
| `mensaje` (0,83) | Pulsos amarillos suben a la superficie; las células aplanadas se vuelven osteoblastos cúbicos | `superficie` |
| `reposo` (1) | Sin carga: sin flujo, la esclerostina vuelve, los osteoblastos se aplanan | `general` |

Se completa al visitar los siete pasos. La lista de pasos y su texto funcionan sin WebGL y bastan para completar la
actividad. El texto de la fase `reposo` menciona apoptosis → RANKL → resorción, que la escena NO dibuja.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/osteocito/estado.ts`): pistas de fotogramas clave
  (`evaluarPista`) para el crecimiento de dendritas, aparición de vecinos, uniones, compresión, flujo, sensores,
  esclerostina, pulsos del mensaje y activación de la superficie. El latido de los sensores y el avance de las
  partículas también salen de `t` (seno y fracción), así que adelantar y atrasar es exacto.
- **La disposición es pura y determinista** (`disposicion.ts`, `generadorDeterminista`): la central y ocho vecinas en
  posiciones fijas; cada conexión célula-célula son dos medias dendritas que se tocan en una unión comunicante;
  dendritas enteras al conducto de Havers y a la superficie; ramas libres hasta completar la cuota (28 en la
  central, 10 por vecina). También las partículas del líquido, las moléculas de esclerostina, las integrinas y las
  rutas del mensaje (central → unión → vecina → superficie).
- **Cuatro piezas** (`mallas.ts`): `BloqueMatriz` (paredes interiores de una caja con laminillas, velo frontal
  translúcido, conducto con capilar, osteoide de la superficie, flechas de carga), `RedCelular` (lagunas, cuerpos,
  núcleos, dendritas y canalículos como tramos instanciados, uniones), `Dinamica` (partículas, cilio, integrinas,
  esclerostina, pulsos) y `Superficie` (células que pasan de aplanadas a cúbicas, con color por instancia).
  Todo lo repetido es `InstancedMesh` (escala nula = oculto; si no queda ninguna a la vista, la malla no se
  dibuja); 19 llamadas de dibujo en el peor instante.
- **La compresión** es un encogimiento en Y del grupo entero (`ContenidoOsteocito.vue`) más un arrastre lateral de
  las dendritas dentro de sus canalículos, que no se mueven.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con `resolverVista` apuntando a `osteocito/vistas.ts`.
- **Colores:** los que se dibujan son los de `NATURAL` en `paleta.ts` (ver «Realismo» y «Revisión de diseño»);
  `HEX` guarda los del SVG `m2_osteocito_lagunar.svg` y de las paletas de la BMU y del hueso. El líquido en
  movimiento va en un azul más profundo (`#2a88dc`) y emisivo, porque bajo el velo y dentro del canalículo
  translúcido un celeste se perdía.

## 3. Límites y honestidad

- **No está a escala** ni de lejos: la laguna real mide 10 a 20 µm y los canalículos unos 0,3 µm; aquí las dendritas
  y canalículos son decenas de veces más gruesos de lo real, y la compresión (4 %) es unas 40 veces la real. El texto
  de los pasos lo dice.
- **Simplificaciones biológicas dudosas o discutibles:** el flujo del líquido se dibuja siempre hacia el conducto
  (en realidad es oscilante y depende del gradiente de presión); las integrinas se dibujan como puntos sobre la
  dendrita, no como anclajes a la pared; el cilio primario sale del cuerpo en una dirección fija; la esclerostina
  "vuelve" en el reposo como si fuera instantáneo; los osteoblastos se activan en toda la superficie a la vez; el
  mensaje a la superficie es un pulso genérico (no se distingue Wnt de otros mediadores como PGE2 o NO). Nada de esto
  lo ha revisado el docente.
- **Sin medir en un teléfono real.** Presupuesto medido por la prueba de geometría: las cifras al día están en
  «Revisión de diseño (2026-10-17)».
- Verificada en Chrome (WebGL 2) con emulación táctil de 390 × 844 px a 2x en los siete hitos con la vista
  `general` y en las vistas `laguna` (t = 0), `canaliculos` (0,17 y 0,5) y `superficie` (0,83), y a 1280 × 800 px en
  t = 0,34 y 0,83. No se probó el pellizco ni la reproducción continua; el modo oscuro es el único capturado.
- La vista `general` a 390 px deja el bloque pequeño; por eso los pasos usan vistas cercanas.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes | `apps/web/src/scenes/procedural/osteocito/estado.ts` |
| Disposición de la red y de lo repetido | `.../osteocito/disposicion.ts` |
| Formas (tramo, esfera, caja, flecha, tubo) | `.../osteocito/geometria.ts` |
| Las cuatro piezas | `.../osteocito/mallas.ts` |
| Vistas de cámara | `.../osteocito/vistas.ts` |
| Paleta | `.../osteocito/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../osteocito/EscenaOsteocito.vue`, `ContenidoOsteocito.vue` |
| Pruebas | `.../osteocito/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m2_descubriendo_sus_celulas/content.json`, actividad `m2_3_osteocito_3d` |

## Realismo (2026-10-14)

Mejora de realismo con la misma base que las escenas del hueso y de la matriz (`scenes/procedural/realismo.ts` y
`EntornoRealista.vue`). Lo que sigue sustituye lo que los apartados anteriores dicen de colores (ya no hay «velo
rosa»), formas y presupuesto.

- **Paleta natural** propia (`NATURAL` en `osteocito/paleta.ts`; `HEX` no cambia y sigue importando la del hueso):
  matriz marfil (velo y paredes) con laminillas pardas, laguna oscura, pared del conducto tostada, canalículo como
  una vaina de líquido casi incolora, osteocitos y dendritas azul lavanda, núcleos violeta oscuro. Se mantienen, algo
  más sobrios, los colores que nombran los textos: cilio primario e integrinas amarillos (un amarillo dorado: el de
  antes tenía casi la misma luminosidad que el marfil y se perdía), esclerostina naranja, uniones comunicantes
  verdes y líquido azul. Los pulsos de la señal siguen en el amarillo vivo de antes. Las células de la superficie van
  del malva pálido (revestimiento) al violeta azulado del osteoblasto, los mismos tonos que en la escena del
  osteoblasto.
- **Tejido de cada pieza** (`materialOrganico`): paredes y velo de la matriz `hueso` (mate y poroso, con UV en
  unidades de escena: una repetición del relieve cada 2 unidades); pared del conducto `membrana` (el endostio que la
  reviste); capilar `vaso`; borde de osteoide `fibra` (vetas a lo largo de X); laguna `cavidad`; cuerpos de los
  osteocitos, dendritas y células de la superficie `celula`; núcleos `nucleo` (cromatina granulosa); canalículos
  `liquido` (vaina translúcida, lisa y brillante); partículas del líquido `liquido`; uniones, cilio, integrinas,
  esclerostina, pulsos y flechas `molecula`. Se conservan las emisiones (líquido, sensores, pulsos, uniones, capilar),
  las opacidades y el orden de dibujo.
- **Sombras**: las paredes interiores del bloque proyectan sombra solo con las caras que la luz ve por detrás
  (`shadowSide: BackSide`); si no, la cara de delante y la de arriba de la caja, que la luz ve de frente, dejarían
  todo el interior en sombra. La red proyecta sombras sobre el fondo y el suelo del bloque; el conducto se sombrea a
  sí mismo (su interior se ve oscuro, como un túnel). El borde de osteoide sombreaba la parte alta del fondo: desde
  el 2026-10-17 no proyecta sombra.
- **Forma**: cuerpos de los osteocitos de 20 × 14 (antes 14 × 10); lagunas de 16 × 12; núcleos de 14 × 10 (antes 8 ×
  6); dendritas que se afinan del cuerpo a la punta (de 1,2 a 0,84 veces el radio; el canalículo, un túnel en la
  matriz, no cambia); células de la superficie como cajas de aristas redondeadas (`celulaDesdeBase`, antes de aristas
  vivas) con núcleos de 12 × 8; capilar de 20 lados. Para dejar margen en el presupuesto, las esferas de la dinámica
  (partículas, integrinas, esclerostina y pulsos: puntos de unos pocos píxeles) pasan de 8 × 6 a 8 × 5.
- **Luces** (desde el 2026-10-15): la escena ya no lleva luces propias; `EntornoRealista` pone el esquema común de
  `iluminacion.ts` (principal 2,2 arriba a la izquierda y a unos 45° de la vista, contraluz fría 0,7 detrás del
  objeto, hemisferio 0,35 y entorno 0,25 que giran con la cámara) con sombras PCF ajustadas a la escena.
- **Presupuesto** (criterio de entonces: solo las instancias a la vista, medido en 201 instantes): 35 987
  triángulos en el peor instante, t = 0,575 (antes 30 063), y 19 llamadas de dibujo (igual). El criterio cambió el
  2026-10-17: ver la revisión de diseño.

No se ha visto en pantalla: el usuario la prueba en su equipo.

## Revisión de diseño (2026-10-17)

Revisión de diseño y realismo de todas las escenas 3D. No se ha visto en pantalla: la usuaria la prueba en su equipo.

- **La tapa de osteoide ya no sombrea el interior** (render-05): `osteoide_superficie` es una caja que cubre toda la
  cara de arriba del bloque y era la mayor fuente de sombra de la escena (según la verificación, en el paso
  `superficie` dejaba los pulsos de la señal enteros en sombra). Lleva `userData.sinSombra`.
- **Canalículos como un velo** (realismo-11): con opacidad constante y el barniz del tejido `liquido` parecían pajitas
  de cristal. Ahora `veloFresnel(0,4; 2)`: de frente dejan ver la dendrita (0,17 de opacidad) y de canto se ven
  densos (0,84), como la vaina de líquido que son; satinados (rugosidad 0,35, barniz 0,3). Una sola pasada
  (`forceSinglePass`): son tubos finos que no escriben profundidad y sus dos paredes tienen el mismo color.
- **El líquido y los pulsos, de verdad delante de los canalículos**: el `renderOrder` 11 de las partículas no servía,
  porque three dibuja lo opaco antes que lo transparente sea cual sea su orden, y el halo de los canalículos las
  seguía apagando. Ahora las partículas y los pulsos van en la lista de transparentes con opacidad 1 (tapan del
  todo y escriben profundidad), de una cara, con `renderOrder` 11: entre los canalículos (10) y el velo de la cara (20).
- **Solo emiten luz las señales** (realismo-03): el capilar y las uniones comunicantes ya no; el líquido, el cilio,
  las integrinas y los pulsos conservan la suya.
- **Instancias ocultas sin NaN** (render-13): la matriz de una instancia oculta es una escala nula
  (`makeScale(0, 0, 0)`) en lugar de 16 ceros, que dejaban la esfera envolvente en NaN (orden de los transparentes).
  Y una malla instanciada sin ninguna instancia a la vista (flechas, líquido, integrinas, esclerostina, pulsos,
  uniones, dendritas y canalículos) no se dibuja: menos llamadas en el pase principal y en el de sombras.
- **Paleta unificada entre escenas** (el mismo tejido, el mismo color; fidelidad-10): matriz `#eadfc8` y pared del
  fondo `#e6d8bc` (los dos extremos del marfil del hueso maduro; antes `#eadfca` y `#e2d3b9`); borde de osteoide
  `#eed4c9` (antes `#f1e7da`, más claro que la matriz); revestimiento `#c6c2e2` (lavanda pálido, versión pálida del
  osteoblasto; antes `#dcc8d2`, rosa grisáceo, que se confundía con el osteoide); núcleos `#4b408f`. Los textos de
  los pasos no nombran esos colores.
- **Higiene** (rendimiento-16): alias local `COLOR` para la paleta natural en `mallas.ts` y sin el `side: DoubleSide`
  repetido en `material()`.
- **Pruebas** (rendimiento-09): el presupuesto cuenta lo que se dibuja de verdad (todas las instancias, la doble
  pasada y, aparte, el pase de sombras), y hay pruebas de la sombra del osteoide, del orden de dibujo, de las
  emisiones, de la esfera envolvente y de que no se dibuja una malla instanciada vacía.
- **Presupuesto** (con el criterio nuevo, en 201 instantes): peor instante 35 730 triángulos y 19 llamadas, t = 0,575
  (antes 41 682 y 21: pasaba del tope de 40 000 por la doble pasada de los canalículos); sombras, 15 llamadas y
  30 532 triángulos (antes 17 y 31 312). Topes: 40 000 y 40 en cada pase.
