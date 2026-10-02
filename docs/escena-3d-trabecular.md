# Escena 3D del hueso trabecular que envejece (módulo 6)

Nota de diseño de `hueso_trabecular_tiempo`, escena **procedural** del OVA (el formato lo explica
[escena-3d-bmu.md](escena-3d-bmu.md); la plantilla de código es la del hueso largo,
[escena-3d-hueso.md](escena-3d-hueso.md)). Es una actividad **opcional** del módulo 6, `m6_3_trabecular_3d`
(sección 6.3 "Osteoporosis: calidad, cantidad y riesgo", 30 puntos), que acompaña a la actividad multicapa
`m6_3_multicapa_normal_osteoporotico`: el mismo contraste del dibujo `m6_hueso_normal_osteoporotico.svg`, pero
visto ocurrir en un cubo de hueso a lo largo de cinco décadas.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y **un cubo de hueso trabecular envejece**. Aquí `t` es tiempo: décadas
de vida, de los 30 a los 80 años, en escala pedagógica (no proporcional). Puede ir y volver cuando quiera, girar
la escena con un dedo y acercarla con dos.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `joven` (0) | Un cubo de unas 3 unidades (una biopsia de cresta ilíaca o de cuerpo vertebral) con una cortical fina encima; red densa de placas verticales y barras horizontales, médula lavanda entre ellas; en la cara frontal, tres BMU: osteoclastos en un hoyo, osteoblastos rellenando otros dos | `general` |
| `equilibrio` (0,17) | La red no cambia: lo que se excava se rellena (hoyo lleno de osteoide) | `detalle` |
| `adelgazamiento` (0,34) | Todas las trabéculas más finas; los hoyos de las BMU quedan a medio rellenar y el de resorción crece | `corte` |
| `perforacion` (0,5) | Las BMU ya no se ven; algunas placas se agujerean (pasan a marcos de barras) y algunas barras se cortan dejando un muñón | `corte` |
| `desconexion` (0,66) | Más de la mitad de las barras horizontales han desaparecido; las placas quedan sin arriostrar | `general` |
| `osteoporosis` (0,83) | Red rala y fina, cortical más delgada y con poros, médula amarilla (grasa); a la izquierda aparece el cubo joven translúcido ("fantasma") | `comparacion` |
| `carga` (1) | Una flecha naranja baja sobre cada cubo: el joven se aplasta un 4 % y el osteoporótico un 22 % (y abomba); tres placas se quiebran y se encienden en rojo (microfracturas) | `comparacion` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/trabecular/estado.ts`): pistas de fotogramas
  clave (`evaluarPista`) para el grosor global, la fracción de barras presentes, la fracción de placas
  perforadas, la opacidad, el relleno y la excavación de las BMU, el grosor y la porosidad de la cortical, la
  adiposidad de la médula, la opacidad del fantasma y la flecha, el aplastamiento y la rotura. Todo monótono
  donde debe serlo (el grosor y las barras no vuelven a crecer; la perforación no retrocede).
- **Animar sin simular.** La red es fija y determinista (`disposicion.ts`, `generadorDeterminista`): un cubo de
  5 × 5 × 5 celdas cuyas caras verticales interiores son las **placas** (dos familias, con la normal en Z y en X)
  y cuyas aristas horizontales interiores son las **barras**; solo existe el 56 % de las caras y el 66 % de las
  aristas, con un desorden pequeño en posición, inclinación y tamaño (105 placas y 99 barras). Cada trabécula
  nace con un grosor base y una **vida** (0 a 1). Las reglas puras `factorGrosor`, `agujeroDePlaca` y
  `presenciaDeBarra` comparan esa vida con los factores globales del estado: las de menor vida se adelgazan
  más, se perforan antes y se cortan antes. Así el cubo joven fantasma es la misma red con los factores de
  `RED_JOVEN`.
- **Una placa son cuatro tiras instanciadas** (arriba, abajo, izquierda, derecha). Intacta, las dos horizontales
  la cubren entera y las laterales quedan escondidas dentro; al perforarse, las cuatro se separan y dejan un
  agujero central de hasta el 64 % del ancho y del alto: la placa pasa a ser un marco de barras. Una barra que se
  corta se acorta hacia uno de sus extremos hasta desaparecer (muñón). Las placas con BMU o microfractura nacen
  con vida alta y siguen enteras hasta el final.
- **Seis piezas** (`mallas.ts`): `RedTrabecular` (dos `InstancedMesh`: 420 tiras y 99 barras, con color por
  instancia en el cubo que envejece), `CorticalSuperior` (lámina y 16 poros instanciados), `Medula` (caja
  translúcida de caras traseras cuyo color va del lavanda al amarillo), `BmuTrabeculares` (hoyos, osteoide y
  células en tres `InstancedMesh`; se apoyan en la cara frontal de su placa y bajan con ella al adelgazarse),
  `FlechaCarga` y `CuboTrabecular`, que las une y aplasta todo menos la flecha (la base no se mueve). Con
  `fantasma: true` es el cubo joven translúcido, sin médula ni BMU, desplazado `X_FANTASMA` = -3,9.
- **Delante de cada BMU se abre una ventana**: se quitan las placas de canto y las barras de la capa frontal que
  la taparían, para que se vea desde la vista `detalle`.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con la prop `resolverVista` y las vistas de
  `trabecular/vistas.ts`: `general` (tres cuartos), `detalle` (cerca de la cara frontal), `corte` (de frente y
  casi sin elevación: la red se lee como un corte histológico o una radiografía) y `comparacion` (más lejos,
  centrada entre los dos cubos). En un lienzo estrecho la cámara se aleja sola (`estadoDeEsferica`).
- **Colores:** los del dibujo `m6_hueso_normal_osteoporotico.svg` (médula `#e2d9f5`, grasa `#f3e39a`,
  microfractura `#b8302f`, flecha `#e58c3c`), el hueso esponjoso del módulo 1 (`#efb5c6`) y la BMU (hueso
  `#d98aa2`, hoyo, osteoide, osteoclasto `#c9a0dc`, osteoblasto `#8b7bdc`).

## 3. Límites y honestidad

- **Sin comprobación visual en el navegador.** Por orden del usuario (ahorro de tokens) esta escena no se abrió
  en Chrome ni se capturó: los encuadres se comprobaron **por geometría** proyectando las esquinas de los cubos
  con la cámara de cada vista (aspecto 1 y 1,9): en `general` y `corte` el cubo ocupa del 45 al 55 % del ancho;
  en `comparacion` los dos cubos caben (NDC de -0,73 a 0,67 en X) con la flecha incluida; `detalle` desborda a
  propósito. Colores, solapes, legibilidad de las tiras y de las BMU, y el aspecto del fantasma translúcido sobre
  la médula **no están vistos**. Números en `.verify/trabecular/medida.txt`.
- Las formas son **esquemáticas**: trabéculas rectas sobre una retícula con desorden, no las láminas curvas del
  hueso real; la relación grosor/separación (0,11 frente a 0,6) es del orden de la real (100 a 150 µm frente a
  500 a 1 000 µm), pero el cubo no guarda escala con la pantalla. Las BMU son tres discos con esferas.
- **Dudas científicas** para el docente: la secuencia adelgazamiento → perforación → desconexión se presenta
  como fases separadas cuando en realidad se superponen; la cortical se adelgaza solo por la cara superior (no se
  dibuja la trabecularización de la cara endóstica); el aplastamiento del 22 % y las tres microfracturas son
  ilustrativos; la escala de edades (30 a 80 años en 0 a 0,83) es pedagógica y el texto lo dice.
- Las microfracturas están en el interior (una placa central y dos de canto en la capa frontal): pueden quedar
  medio tapadas desde `comparacion`; se distinguen por el rojo.
- **Sin revisión del docente** del texto de los pasos ni de la forma de las estructuras. **Sin medir en un
  teléfono real.** Presupuesto comprobado por pruebas contando instancias: 16 324 triángulos y 10 llamadas de
  dibujo en el peor instante (`carga`); 7 llamadas en las fases sin fantasma.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes | `apps/web/src/scenes/procedural/trabecular/estado.ts` |
| Red determinista y reglas de envejecimiento por trabécula | `.../trabecular/disposicion.ts` |
| Formas unidad (caja, cilindro, esfera, disco, flecha) | `.../trabecular/geometria.ts` |
| Las piezas y el cubo completo | `.../trabecular/mallas.ts` |
| Vistas de cámara | `.../trabecular/vistas.ts` |
| Paleta | `.../trabecular/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../trabecular/EscenaTrabecular.vue`, `ContenidoTrabecular.vue` |
| Pruebas (68) | `estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m6_el_paso_del_tiempo/content.json`, actividad `m6_3_trabecular_3d` (texto definitivo en `.verify/trabecular/actividad.json` hasta que el coordinador lo fusione) |
