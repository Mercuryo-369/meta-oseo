# Escena 3D de la vesícula de matriz: así nace el primer cristal (módulo 4)

Nota de diseño de `vesicula_matriz`, escena **procedural** del OVA (el formato, los controles y cómo añadir otra
escena están en [escena-3d-bmu.md](escena-3d-bmu.md); las plantillas de piezas repetidas son
[escena-3d-matriz.md](escena-3d-matriz.md) y la escena del osteoblasto). Es una actividad **opcional** del módulo 4,
`m4_3_vesicula_3d` (sección 4.3, 30 puntos), que acompaña a la animación `m4_video_vesiculas_nucleacion` y al
arrastre `m4_arrastre_mineralizacion` sobre el dibujo `public/images/m4/m4_vesicula_matriz.svg`: cuenta la misma
historia, con los mismos colores, pero en 3D y en el tiempo.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y sigue la **vida de una vesícula de matriz**: aquí `t` sí es tiempo,
aunque con una escala pedagógica, no proporcional. Puede girar la escena con un dedo, acercarla con dos y elegir
una vista con nombre; la vista `interior` corta la vesícula para mirar dentro en cualquier fase.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `osteoblasto` (0) | Arriba, la membrana basal ondulada de un osteoblasto con parte del citoplasma y, colgando de su cara externa, TNAP (naranja), ENPP1 (lila) y ANKH (verde agua); abajo, el osteoide: fibrillas de colágeno con bandeo | `general` |
| `gemacion` (0,17) | Un abultamiento de la membrana se estrangula y se desprende como vesícula (esfera translúcida con anexinas, PiT-1, TNAP fuera y PHOSPHO1 dentro); cae y queda apoyada en una fibrilla | `general` |
| `acumulacion` (0,34) | Calcio (amarillo) entra por las anexinas y fosfato (verde) por PiT-1 o nace junto a PHOSPHO1; los iones cruzan la membrana y se acumulan en su cara interna | `vesicula` |
| `nucleacion` (0,5) | La vesícula cortada muestra el cúmulo de iones, el núcleo de fosfato de calcio amorfo y el primer cristal (placa crema) en la cara interna | `interior` |
| `ruptura` (0,66) | El racimo de cristales crece en abanico, atraviesa la membrana y la rompe (se aclara y se hunde); las placas salen al osteoide | `vesicula` |
| `propagacion` (0,83) | Placas de mineral en las zonas de hueco del bandeo de las fibrillas, que crecen desde la vesícula hacia fuera; cuatro vesículas más hacen lo mismo alrededor | `general` |
| `regulacion` (1) | Pirofosfato (mancuernas rojas) pegado a las caras de los cristales; bajo la membrana, la TNAP corta PPi en dos Pi (que se separan y se vuelven verdes) y junto a ENPP1 aparece PPi nuevo | `cristal` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/vesicula/estado.ts`): pistas de fotogramas
  clave con tramos suavizados. Adelantar y atrasar es exacto; nada se acumula entre fotogramas. La vista
  `interior` no está en el estado: `ContenidoVesicula.vue` fuerza `corte = 1` cuando la vista es esa.
- **Tres piezas con su propio objeto** (`mallas.ts`): `Osteoblasto` (membrana, citoplasma, enzimas y la
  hidrólisis de PPi), `Osteoide` (fibrillas con bandeo, placas propagadas, vesículas vecinas, PPi sobre placas) y
  `VesiculaMatriz` (esfera entera y media esfera que se turnan por opacidad para el corte, cuello de gemación,
  proteínas de membrana en dos grupos, delante y detrás del plano de corte, iones, núcleo amorfo, racimo y PPi).
  Cada una recibe el estado y solo mueve, escala, colorea o aclara; no calcula biología.
- **Piezas repetidas y sus posiciones** (`disposicion.ts`, puro y determinista): la ondulación de la membrana,
  41 enzimas, 9 fibrillas con 38 segmentos de bandeo cada una (periodo D con 60 % de hueco y 40 % de
  solapamiento), unas 300 placas sobre los huecos con un retardo de crecimiento proporcional a su distancia al
  punto de contacto, 18 proteínas en la vesícula, 72 iones con su camino origen, canal, destino (`posicionDeIon`
  es pura: misma entrada, misma posición), 7 cristales del racimo con su base ortonormal, 4 vecinas con 16
  cristales y 16 + 5 + 4 + 3 moléculas de PPi.
- **Todo lo repetido va en `InstancedMesh`** (color por instancia para las enzimas, las proteínas, los iones y
  los dos fosfatos de la hidrólisis, que cambian de rojo a verde al separarse). La membrana del osteoblasto es
  una lámina desplazada por una onda y el citoplasma una losa con la cara inferior desplazada por la misma onda.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con la prop `resolverVista` y las vistas de esta escena
  (`vesicula/vistas.ts`). La vista `general` mira desde **debajo** de la membrana, para ver su cara externa con
  las enzimas y que no tape la vesícula que brota.
- **Colores** (`paleta.ts`): los grupos del SVG `m4_vesicula_matriz.svg` (osteoblasto, fibrilla, membrana de la
  vesícula, anexina, PiT, TNAP, ENPP1/ANKH, calcio, fosfato, PPi), el crema de los cristales de la escena de la
  matriz y el violeta del osteoblasto de la BMU.

## 3. Límites y honestidad

- **Escala esquemática.** La vesícula (0,85 unidades de radio) y las fibrillas (0,3 de radio, periodo D de 0,6)
  guardan entre sí una proporción verosímil (unos 100 nm frente a 67 nm), pero los iones, los canales, las
  enzimas y las moléculas de PPi están exagerados cientos de veces para que se lean en un móvil, y la membrana del
  osteoblasto es solo una franja de célula. El contenido lo dice.
- **Simplificaciones biológicas**: las proteínas de membrana son cilindros de colores, no formas moleculares;
  la nucleación se muestra como iones que se juntan en una bola tosca (fosfato de calcio amorfo) de la que sale
  una placa; la "ruptura" es una vesícula que se aclara y se hunde mientras los cristales la atraviesan, sin
  desgarro de la membrana; el cristal inicial se dibuja como placa (en las primeras etapas se describe como
  aguja de unos 50 nm); el mineral "de superficie" sobre los huecos del bandeo es una convención (el mineral real
  también es intrafibrilar); la hidrólisis de PPi se muestra en solo cuatro TNAP de la membrana del osteoblasto y
  no en la TNAP de la vesícula; el freno del PPi se representa con moléculas pegadas y el simple hecho de que las
  placas dejan de crecer. El papel exacto del fosfato de calcio amorfo in vivo y el peso de las vesículas en el
  hueso laminar maduro se discuten; el texto lo dice.
- **Cosas que quedaron feas o dudosas**: en la vista `general` el cuello de gemación queda casi oculto detrás
  de la propia vesícula (se ve al girar); en `vesicula`, durante la ruptura, la vesícula translúcida deja ver las
  fibrillas de atrás y parece atravesada por ellas; el racimo de cristales es pequeño en la vista `vesicula` y
  se aprecia mejor en `cristal` o girando.
- **Sin revisión del docente** del texto de los pasos ni de la forma de las estructuras.
- **Sin medir en un teléfono real.** Presupuesto comprobado por pruebas en memoria: 31 624 triángulos y 16
  llamadas de dibujo en el peor instante (t = 0,875). three va en el chunk `webgl` compartido con las otras
  escenas.
- Verificada en Chrome con WebGL, con emulación táctil de 390 × 844 px (`t` = 0; 0,17; 0,34; 0,5; 0,66; 0,83 y
  1 en la vista `general`, y además `interior` en 0,5, `vesicula` en 0,66 y `cristal` en 1) y a 1280 × 800 px
  (`t` = 0,34 en `general` y 1 en `cristal`). No se probó el pellizco ni el giro con el dedo, ni la línea de
  vuelta completa, ni el modo claro.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes | `apps/web/src/scenes/procedural/vesicula/estado.ts` |
| Disposición de piezas repetidas (membrana, enzimas, fibrillas, placas, proteínas, iones, racimo, vecinas, PPi) | `.../vesicula/disposicion.ts` |
| Formas (esfera, media esfera, placas, tubo, cuello, mancuerna, lámina y losa onduladas) | `.../vesicula/geometria.ts` |
| Las tres piezas | `.../vesicula/mallas.ts` |
| Vistas de cámara | `.../vesicula/vistas.ts` |
| Colores | `.../vesicula/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../vesicula/EscenaVesicula.vue`, `ContenidoVesicula.vue` |
| Pruebas | `.../vesicula/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m4_transformando_la_matriz/content.json`, actividad `m4_3_vesicula_3d` |
