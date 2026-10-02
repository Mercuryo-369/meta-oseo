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
| `secrecion` (0,48) | Vesículas que nacen junto al Golgi y bajan al polo basal; bajo la fila crece una capa clara de osteoide | `celula` |
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
- **Colores** (`paleta.ts`): los de la BMU para hueso, osteoide, hueso nuevo, células y capilar, y los del SVG
  del osteoblasto para las laminillas, el retículo, el Golgi y las vesículas.

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
- **Sin medir en un teléfono real.** Presupuesto medido en memoria con los mismos criterios de la prueba de
  geometría: 13 320 triángulos y 16 llamadas de dibujo en el peor instante (t = 0,565 y 0,755); three va en el
  chunk `webgl` compartido con las otras escenas.
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
