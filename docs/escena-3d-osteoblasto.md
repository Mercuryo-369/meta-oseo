# Escena 3D del osteoblasto: de precursor a osteocito (módulo 2)

Nota de diseño de `osteoblasto_celula`, escena **procedural** del OVA (el formato, los controles y cómo añadir
otra escena están en [escena-3d-bmu.md](escena-3d-bmu.md)). Es una actividad **opcional** del módulo 2,
`m2_2_osteoblasto_3d` (sección 2.2, 30 puntos), que acompaña a la animación del árbol de linajes
(`m2_video_linaje_osteoblastico`) y al dibujo multicapa del osteoblasto (`m2_multicapa_osteoblasto`,
`public/images/m2/m2_osteoblasto_activo.svg`): cuenta la misma historia, con los mismos colores, pero en 3D y a
lo largo del tiempo.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y sigue la **vida de una célula de la línea osteoblástica** sobre una
superficie de hueso. Aquí `t` sí es tiempo, aunque con escala pedagógica (la diferenciación dura días y la
formación de hueso, meses). Puede girar la escena con un dedo, acercarla con dos y elegir una vista con nombre.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `precursor` (0) | Un bloque de hueso viejo cortado (laminillas en la cara de corte) con un capilar al lado; encima, una célula osteoprogenitora fusiforme y pálida | `general` |
| `diferenciacion` (0,16) | La célula se vuelve cúbica y basófila y llegan cuatro vecinas: una fila epitelioide de cinco osteoblastos | `celula` |
| `organulos` (0,32) | La célula del centro se vuelve transparente: núcleo excéntrico con nucléolo, pilas de retículo rugoso (azul), sáculos de Golgi (amarillo), mitocondrias (naranja) | `organulos` |
| `secrecion` (0,48) | Vesículas que nacen junto al Golgi y bajan al polo basal; bajo la fila crece una franja pálida y algo rosada de osteoide | `celula` |
| `mineralizacion` (0,64) | En la cara de corte, el osteoide profundo se convierte en hueso nuevo; el frente de mineralización (línea oscura) sube y deja siempre una franja de osteoide encima | `matriz` |
| `destino` (0,8) | La célula 1 se hunde y queda como osteocito en una laguna con canalículos (dibujados en la cara de corte); la 2 se aplana (revestimiento); la 3 se encoge y se fragmenta (apoptosis) | `detalle` |
| `reposo` (1) | Tres células de revestimiento planas cubren la superficie, el osteocito en su laguna, el capilar al lado | `general` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/osteoblasto/estado.ts`): pistas de fotogramas
  clave con tramos suavizados (`evaluarPista`). Adelantar y atrasar es exacto; nada se acumula entre fotogramas.
  Cada célula de la fila tiene su propio estado (`presencia`, `cubico`, `aplanado`, `hundido`, `encogido`,
  `x`, `ancho`) y la escena, además, `transparencia`, `secrecion`, `deposito` (tope del osteoide), `mineral`
  (tope del hueso nuevo), `frente`, `fragmentos`, `laguna` y `cobertura`.
- **Dos piezas** (`mallas.ts`): `SuperficieOsea` (bloque de hueso viejo con laminillas, hueso nuevo y osteoide
  que crecen como dos cajas escaladas, frente de mineralización, capilar, y en la cara de corte la laguna del
  osteocito con sus canalículos) y `FilaCelular` (cinco cuerpos celulares con `RoundedBoxGeometry` escalada,
  núcleos, orgánulos de la protagonista, vesículas y cuerpos apoptóticos). Ninguna calcula biología: reciben el
  estado y solo mueven, escalan, colorean o aclaran.
- **Una sola geometría para todas las formas celulares**: la caja redondeada, escalada a lo ancho y bajo, se lee
  como célula fusiforme; con los tres semiejes parecidos, como osteoblasto cúbico; aplastada, como célula de
  revestimiento; pequeña, como cuerpo del osteocito. `formaDeCelula` mezcla los semiejes según el estado.
- **Piezas repetidas y sus posiciones** (`disposicion.ts`, puro y determinista): cisternas del retículo, sáculos
  del Golgi, mitocondrias, carriles y desfases de las 12 vesículas, direcciones de los 8 cuerpos apoptóticos,
  canalículos de la laguna y laminillas del hueso viejo. Núcleos, láminas, glóbulos y fragmentos van en
  `InstancedMesh` con color por instancia.
- **Las vesículas viajan en función de `t`** (`cicloVesiculas`), no de un reloj: al arrastrar el deslizador hacia
  atrás vuelven por donde vinieron.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con la prop `resolverVista` y las vistas de esta escena
  (`osteoblasto/vistas.ts`). Un dedo gira, dos acercan, sin paneo.
- **Colores**: los que se dibujan son los de `NATURAL` en `paleta.ts` (ver «Revisión de diseño (2026-10-17)»);
  `HEX` guarda los de la BMU y los del SVG del osteoblasto y no se dibuja.

## 3. Límites y honestidad

- Las **formas son esquemáticas** y no guardan escala: la célula mide alrededor de 1 unidad y el bloque, 8; los
  orgánulos están exagerados para que se lean en un móvil (el retículo real mide décimas de micra). Las células
  son cajas redondeadas, no polígonos irregulares; la fila tiene cinco células y solo la del centro muestra
  orgánulos y secreta (en la vida real todas lo hacen; el texto lo dice).
- **Simplificaciones biológicas**: el osteocito se dibuja atrapado en la cara de corte con canalículos planos,
  no con prolongaciones 3D; la apoptosis se muestra como fragmentación en bolitas sin fagocitosis; el frente de
  mineralización es una lámina recta (el real es irregular); el capilar se desvanece mientras la protagonista
  está transparente para que no se vea a través de ella, y con las vistas `celula`/`matriz` se transparenta a
  través de las células translúcidas (opacidad 0,8). Las tres células de revestimiento finales se estiran para
  cubrir los huecos, un gesto didáctico. No se dibuja el preosteoblasto como etapa aparte: la diferenciación va
  de fusiforme a cúbica en un solo tramo, y RUNX2 y osterix solo aparecen en el texto.
- **Sin revisión del docente** del texto de los pasos ni de la forma de las estructuras.
- **Sin medir en un teléfono real.** Presupuesto medido en memoria por la prueba de geometría: las cifras al día
  están en «Revisión de diseño (2026-10-17)»; three va en el chunk `webgl` compartido con las otras escenas.
- Verificada en Chrome con WebGL, con emulación táctil de 390 × 844 px (`t` = 0; 0,16; 0,32; 0,48; 0,64; 0,8 y 1,
  cada hito con su vista definitiva) y a 1280 × 800 px (`t` = 0,32 y 0,8), solo tema oscuro. No se probó el
  pellizco ni el giro con el dedo, ni la línea de vuelta completa, ni el tema claro.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes | `apps/web/src/scenes/procedural/osteoblasto/estado.ts` |
| Disposición de piezas repetidas (orgánulos, vesículas, fragmentos, canalículos, laminillas) | `.../osteoblasto/disposicion.ts` |
| Formas (caja, cuerpo celular, esfera, tubo, disco) | `.../osteoblasto/geometria.ts` |
| Las dos piezas (superficie ósea y fila celular) | `.../osteoblasto/mallas.ts` |
| Vistas de cámara | `.../osteoblasto/vistas.ts` |
| Paleta | `.../osteoblasto/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../osteoblasto/EscenaOsteoblasto.vue`, `ContenidoOsteoblasto.vue` |
| Pruebas | `.../osteoblasto/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m2_descubriendo_sus_celulas/content.json`, actividad `m2_2_osteoblasto_3d` |

## Realismo (2026-10-14)

Mejora de realismo con la misma base que las escenas del hueso y de la matriz (`scenes/procedural/realismo.ts` y
`EntornoRealista.vue`). Lo que sigue sustituye lo que los apartados anteriores dicen de colores, formas y
presupuesto.

- **Paleta natural** propia (`NATURAL` en `osteoblasto/paleta.ts`; `HEX` no cambia): colores del tejido vivo, no de
  la tinción. Se mantienen los que nombran los textos: el frente de mineralización «la línea oscura», el retículo
  rugoso azul, el Golgi amarillo y las mitocondrias naranjas (el hueso viejo, el hueso nuevo y el osteoide
  cambiaron el 2026-10-17: ver la revisión de diseño). Las células van en tonos suaves
  que siguen distinguiendo cada estado: precursor lila pálido, osteoblasto basófilo violeta azulado, revestimiento
  malva pálido, osteocito azul lavanda y apoptosis grisácea. La laguna cortada pasa de halo claro a cavidad oscura
  y los canalículos, de hilos amarillos a hilos pardos, como en la escena del hueso.
- **Tejido de cada pieza** (`materialOrganico`): hueso viejo `hueso` (mate y poroso); hueso nuevo `hueso_inmaduro`
  (recién mineralizado, más poroso); osteoide `fibra` (colágeno sin mineral: vetas a lo largo de la superficie y
  brillo sedoso); frente de mineralización `hueso` (sin emisión desde el 2026-10-17); capilar `vaso`; laguna cortada
  `cavidad`; cuerpos celulares, osteocito cortado y cuerpos apoptóticos `celula` (membrana blanda y húmeda; su
  brillo aterciopelado sigue al color de cada célula); núcleos y nucléolo `nucleo` (cromatina granulosa); retículo,
  ribosomas, Golgi, mitocondrias y vesículas `organulo` (lisos y húmedos). Los cuerpos celulares conservan su
  opacidad de 0,8 (0,28 la protagonista al mostrar los orgánulos) y solo se dibuja su cara de fuera.
- **Forma**: las cajas de las capas de hueso llevan UV en unidades de escena (`cajaEnEscala`): el relieve mide lo
  mismo en todas las caras (una repetición cada 2 unidades) y no se estira en la cara de 8 × 1,5. Cuerpo celular
  algo más redondeado (radio 0,5 en lugar de 0,42; sigue leyéndose cúbico). Esferas de 16 × 12 (antes 14 × 10).
  Cisternas del retículo y sáculos del Golgi como sacos aplastados de borde redondeado (antes cajas de aristas
  vivas). Nuevos **ribosomas**: 192 granos en las dos caras de las ocho cisternas del retículo, lo que lo hace
  «rugoso» (el Golgi queda liso); malla `ribosomas`, que aparece y se aclara con los orgánulos, y posiciones puras en
  `ribosomasDelReticulo` (espiral de Vogel por cara). El osteocito cortado es medio elipsoide que asoma de la cara
  (antes un disco plano sin luz). Capilar de 24 lados.
- **Luces** (desde el 2026-10-15): la escena ya no lleva luces propias; `EntornoRealista` pone el esquema común de
  `iluminacion.ts` (principal 2,2 arriba a la izquierda y a unos 45° de la vista, contraluz fría 0,7 detrás del
  objeto, hemisferio 0,35 y entorno 0,25 que giran con la cámara) con sombras PCF ajustadas a la escena. Los cuerpos celulares,
  translúcidos, no proyectan sombra (regla de `EntornoRealista` para lo que tiene opacidad menor de 0,9); sus
  núcleos y los orgánulos sí.
- **Presupuesto** (criterio de entonces, medido en 201 instantes): 22 828 triángulos en el peor instante (antes
  13 352) y 16 llamadas de dibujo (igual). El criterio cambió el 2026-10-17: ver la revisión de diseño.

No se ha visto en pantalla: el usuario la prueba en su equipo.

## Revisión de diseño (2026-10-17)

Revisión de diseño y realismo de todas las escenas 3D. No se ha visto en pantalla: la usuaria la prueba en su equipo.

- **Paleta unificada entre escenas** (el mismo tejido, el mismo color; `NATURAL` en `osteoblasto/paleta.ts`, la de
  `bmu/paleta.ts`; fidelidad-09 y fidelidad-10). Hueso viejo `#e8dbc3` (antes `#dbb0aa`, el «bloque rosado»): el
  marfil del hueso maduro, como en el osteocito y el osteoclasto del mismo módulo, con laminillas `#c0a582` (las del
  osteocito; antes `#b48a83`). Hueso nuevo `#f2e9d8` (antes `#e8d6c8`): el marfil más claro del hueso recién
  formado. Osteoide `#eed4c9` (antes `#f3e9de`): la franja pálida y algo rosada del colágeno sin mineral. Antes el
  osteoide era más claro que el hueso nuevo y al mineralizarse parecía oscurecerse, al revés que en la BMU y en
  ortodoncia. En la cara de corte queda, de abajo arriba: hueso viejo marfil, hueso nuevo más blanco, la línea
  oscura del frente (`#6b4a4f`) y el osteoide rosado pálido. Revestimiento `#c6c2e2` y precursor `#cbb7da`: versiones
  pálidas del osteoblasto (`#8d86c6`), frías frente al hueso y al osteoide; núcleos `#4b408f`. Los textos de los
  pasos `paso_precursor` («el bloque rosado») y `paso_secrecion` («la capa clara») quedan propuestos para cambiar.
- **Nada brilla por dentro** (realismo-03): el capilar y el frente de mineralización ya no tienen emisión (la del
  frente aclaraba «la línea oscura» que nombra el texto).
- **Una sola pasada** (rendimiento-01): el frente, el capilar, la laguna cortada, el osteocito cortado y los orgánulos
  son piezas cerradas que se desvanecen; ahora son de una cara (three dibujaba en dos pasadas todo lo transparente
  de doble cara) y pasan a opacas al terminar de aparecer (antes el frente y la laguna seguían transparentes con
  opacidad 1 y no daban sombra).
- **Higiene** (rendimiento-16): alias local `COLOR` para la paleta natural en `mallas.ts` (antes `HEX`, que confundía:
  `HEX` no se dibuja), sin el `side: DoubleSide` repetido en `material()` y sin la copia local de `poner`.
- **Pruebas** (rendimiento-09): el presupuesto cuenta lo que se dibuja de verdad: todas las instancias, la doble
  pasada de lo transparente de doble cara, las líneas como llamadas sin triángulos y, aparte, el pase de sombras.
  Prueban además que nada se dibuja en dos pasadas y que nada emite luz.
- **Presupuesto** (con el criterio nuevo, en 201 instantes): peor instante 22 796 triángulos y 16 llamadas (antes
  36 184 y 20, t ≈ 0,6, por los orgánulos que se desvanecían en dos pasadas); sombras, 8 llamadas y 15 428
  triángulos. Topes: 40 000 y 40 en cada pase.
