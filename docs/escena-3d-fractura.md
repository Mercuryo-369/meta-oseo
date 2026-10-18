# Escena 3D de la reparación de una fractura (módulo 5)

Nota de diseño de `reparacion_fractura`, una escena **procedural** del OVA (el formato, los controles y cómo
añadir otra escena están en [escena-3d-bmu.md](escena-3d-bmu.md); la plantilla de código es la del hueso,
[escena-3d-hueso.md](escena-3d-hueso.md)). Es una actividad **opcional** del módulo 5, `m5_6_fractura_3d` (sección
5.6, 30 puntos), que acompaña a la animación 2D `m5_reparacion_fractura_video` y a la tabla de cicatrización
primaria frente a secundaria: en vez de ver la fractura en un dibujo plano, el estudiante la rodea y la abre.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y ve cicatrizar, por vía **secundaria** (indirecta, con callo), una
fractura transversal de la diáfisis de un hueso largo. Aquí `t` sí es tiempo, de las primeras horas a los meses,
en escala didáctica (no proporcional). Puede girar la escena con un dedo y acercarla con dos. En las vistas
`corte` y `detalle` la diáfisis se abre por arriba (una cuña de 140°) para ver dentro.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `fractura` (0) | Dos fragmentos de diáfisis algo desplazados (cortical, médula, periostio roto); vasos rotos y gotas de sangre en la brecha | `general` |
| `hematoma` (0,15) | Un coágulo rojo oscuro fusiforme llena la brecha, entra en el canal y rodea los extremos; los bordes del hueso mueren y quedan pálidos (necrosis) | `corte` |
| `inflamacion` (0,3) | El coágulo se vuelve rosado (granulación); neutrófilos (amarillos) y macrófagos (azules) sobre él y en la brecha; células madre (lila pálido) sobre el periostio engrosado; vasos nuevos desde el periostio y la médula | `detalle` |
| `callo_blando` (0,45) | Manguito fusiforme: centro celeste (fibrocartílago) y periferia beige (tejido fibroso); tapa también la brecha y el canal | `callo` |
| `callo_duro` (0,6) | El centro pasa por gris (cartílago calcificado) a rosa (hueso entretejido, endocondral); la periferia pasa directamente a rosa (intramembranosa); osteoblastos (violeta) sobre el callo | `corte` |
| `remodelado` (0,8) | El manguito encoge con osteoclastos (lila) encima; la médula central crece a través de la brecha; el hueso necrótico ya tiene color normal | `corte` |
| `consolidado` (1) | Cortical continua con un engrosamiento mínimo del color del hueso maduro; médula continua; sin células ni vasos nuevos | `general` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/fractura/estado.ts`): 16 pistas de fotogramas
  clave con tramos suavizados (sangrado, hematoma, granulación, inflamación, células madre, periostio, vasos
  nuevos, escala del callo, sus tres cambios de color, laminar, necrosis, osteoblastos, osteoclastos, médula).
  Adelantar y atrasar es exacto; nada se acumula entre fotogramas. Los hitos son los que usa el contenido del
  módulo 5 y una prueba los fija.
- **Dos partes con su propio objeto** (`mallas.ts`): `HuesoFracturado` (los dos fragmentos, fusionados en una
  geometría por material: cortical, extremos necróticos, médula, periostio; y la médula central que recanaliza) y
  `Reparacion` (sangrado, hematoma, células, vasos y callo). Reciben `EstadoFractura` y la bandera `abierta`, y
  solo colocan, escalan y colorean piezas; no calculan biología.
- **La cuña depende de la vista, no de `t`** (única desviación respecto a la plantilla): cada pieza maciza está
  partida en CUERPO y TAPA (`CUNA`, 140° centrados arriba); `EscenaFractura.vue` pasa `abierta` cuando la vista con
  nombre es `corte` o `detalle` y `ContenidoFractura.vue` oculta las tapas y las células que caerían en el
  sector abierto (quedarían flotando). Así el coordinador decide con la `vista` de cada paso si se ve dentro.
- **Sólidos de revolución** (`geometria.ts`, `fusiforme`): el hematoma y las tres piezas del callo (centro
  endocondral y dos periferias intramembranosas) son perfiles `[radio, y]` revolucionados con `LatheGeometry` y,
  cuando están partidos, dos caras de corte planas (`ShapeGeometry`). Los tejidos blandos se cortan con una cuña
  **un poco mayor** que la del hueso (`RETIRO_CUNA`: 4° el callo, 7° el hematoma), de modo que sus caras de corte
  quedan detrás de las del hueso y no compiten en el mismo plano (sin parpadeo por profundidad).
- **El callo crece y encoge con una sola escala**: a 0,5 cabe entero dentro de la cortical y no se dibuja; a 1 es
  el manguito completo (radio 1,85 con cortical de radio 1); al consolidar baja a 0,565 (radio 1,045: un
  engrosamiento apenas visible). Como el fusiforme es macizo, también hace de **callo interno** en la brecha y el
  canal; la médula, retirada 0,6 de cada extremo, vuelve a ocupar el canal al final (pieza `medula_central`).
- **Piezas repetidas** (`disposicion.ts`, puro y determinista): 12 vasos rotos, 24 gotas, 34 células inflamatorias
  (un tercio macrófagos), 14 células madre, 16 vasos nuevos, 9 osteoclastos y 18 osteoblastos. Los osteoclastos y
  osteoblastos guardan altura y ángulo y se colocan **sobre la superficie del callo a su escala actual**
  (`puntoSobreCallo`), así lo acompañan mientras encoge; desde 2026-10-17, también las células inflamatorias de la
  superficie del hematoma (`puntoSobreHematoma`). Cada célula tiene un retraso propio para aparecer.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`), con `resolverVista` apuntando a `fractura/vistas.ts`. Las
  vistas de corte son elevadas (50° a 54°) porque la cuña se abre hacia arriba.
- **Colores** (`paleta.ts`): `HEX` guarda los del SVG `m5_reparacion_fractura_fases.svg` (coágulo `#b4413a`,
  neutrófilos `#f3e39a`, macrófagos `#86b3da`) y los de las escenas del hueso, la BMU y las dos rutas (cortical
  `#d98aa2`, periostio `#d2b48c`, cartílago `#cfe6ef`, calcificado `#8fa9b8`, osteoclasto `#c9a0dc`, osteoblasto
  `#8b7bdc`). Los que se dibujan son los de `NATURAL` (ver «Realismo» y «Revisión de diseño (2026-10-17)»).

## 3. Límites y honestidad

- **Sin comprobación visual.** Por orden del usuario no se levantó Vite ni se abrió el navegador: no hay capturas
  en `.verify/fractura/`. Los encuadres se comprobaron solo por geometría (con FOV 34°, la vista `general` a
  distancia 11,5 abarca los 6,6 de largo del hueso en móvil vertical y en escritorio; `corte` y `detalle` cubren
  la brecha y el callo). Puede haber solapes, colores o tamaños que no se entiendan a la primera; revisar antes
  de la entrega al docente.
- Las formas son **esquemáticas**: fractura transversal (no oblicua ni conminuta) con desplazamiento lateral fijo
  de 0,12 que no se reduce; el periostio se dibuja como una vaina fina que el callo cubre (en realidad el callo se
  forma bajo el periostio, que queda levantado por fuera); el hematoma y el callo son sólidos de revolución algo
  irregulares; las células están muy exageradas respecto al hueso y son esferas sin núcleo (las del callo,
  aplanadas contra él).
- La médula retirada de los extremos deja, en la fase `fractura`, un tramo de canal vacío: se interpreta como
  sangrado, pero no es una estructura real.
- El paso de cartílago a hueso se cuenta con el color de un solo material por parte: no hay trabéculas ni frentes
  de osificación dibujados dentro del callo.
- **Sin revisión del docente** del texto de los pasos ni de la forma de las estructuras. Los plazos de los textos
  siguen a la tabla de la sección 5.6 (horas a 2 semanas, 1.ª a 3.ª semana, 3.ª a 12.ª semana, meses a años).
- Presupuesto medido en memoria (sin WebGL): **19 388 triángulos y 18 llamadas de dibujo** en el peor instante
  (`t` = 0,375, cuña cerrada, cuando conviven hematoma y callo); 19 llamadas contando la doble pasada de las
  transparencias y 18 en el pase de sombras. Una prueba exige menos de 40 000 y 40 en todo.
- No se midió en un teléfono real ni el peso del chunk.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes | `apps/web/src/scenes/procedural/fractura/estado.ts` |
| Disposición de piezas repetidas y perfiles | `.../fractura/disposicion.ts` |
| Formas (fusiforme, anillo, esfera, tramo, arcos de la cuña) | `.../fractura/geometria.ts` |
| Las dos partes (hueso y reparación) | `.../fractura/mallas.ts` |
| Vistas de cámara y qué vistas abren la cuña | `.../fractura/vistas.ts` |
| Paleta | `.../fractura/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../fractura/EscenaFractura.vue`, `ContenidoFractura.vue` |
| Pruebas | `.../fractura/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m5_renovando_el_hueso/content.json`, actividad `m5_6_fractura_3d` (texto definitivo propuesto en `.verify/fractura/actividad.json`) |

## Realismo (2026-10-14)

Mejora de realismo con la base compartida (`scenes/procedural/realismo.ts` y `EntornoRealista.vue`), como en las
escenas del hueso y de la matriz:

- **Paleta natural** propia (`NATURAL` en `fractura/paleta.ts`; `HEX` no cambia): cortical marfil (no el rosa de la
  tinción); hueso muerto de los bordes gris pardo apagado; médula amarilla, grasa; periostio como en la escena del
  hueso; coágulo rojo oscuro que se organiza en tejido de granulación rojo carne; tejido fibroso blanquecino; sangre
  roja. Se mantienen, algo más sobrios, los colores que nombran los textos de los pasos: el hueso de los bordes que
  queda **pálido** al morir, el fibrocartílago **blanco azulado**, el callo duro **rosado** (el hueso
  reticular es más vascular, y más rosado, que el laminar; al remodelarse vuelve al marfil de la cortical), el
  cartílago calcificado **gris** y los osteoclastos **lila**. Neutrófilos amarillo pálido, macrófagos azul grisáceo,
  células madre lila pálido y osteoblastos violeta. El `alt` de la actividad dice «una diáfisis fracturada, rosa»: se
  ha propuesto cambiarlo («de color marfil»), sin tocar el contenido. Los colores que citan los apartados 1 y 2 son
  los de antes.
- **Materiales por pieza**: cortical y hueso muerto, `hueso` (el muerto, además, más mate y seco a medida que
  muere); médula, `medula`; periostio, `membrana` (sigue translúcido); hematoma, `coagulo`; callo (centro y
  periferia), `hueso_inmaduro` con un acabado que cambia con su tejido, como el color: liso y húmedo de cartílago,
  granuloso de cartílago calcificado, mate de tejido fibroso, poroso de hueso reticular y el de la cortical al final
  (sin que el barniz llegue a 0, para no recompilar el sombreador); sangre de vasos y gotas, `vaso`, con su emisivo;
  células, `celula`.
- **Forma**: la superficie de fractura es dentada (antes, un corte de sierra plano): el borde del tramo necrótico de
  cada fragmento sigue el mismo dibujo (una suma de senos de ±0,06 alrededor del eje), así que los dos bordes encajan
  y la brecha mide lo mismo en cada ángulo; el periostio tiene el borde desgarrado (±0,1); los vasos rotos se alargan
  hacia dentro del fragmento para salir siempre del hueso. El hematoma y el callo ya no son husos perfectos: su
  superficie es algo irregular (±4,5 % y ±3 % del radio; poco, porque las células que se apoyan en ellos se colocan
  sobre el perfil liso), con un relieve que solo depende del ángulo y de la altura, así que el torno, sus caras de
  corte y las tres piezas del callo siguen encajando. Células de 12 × 8 (antes 8 × 6), gotas de 8 × 6 y vasos de 8
  lados (antes 6).
- **Luz**: luz de entorno y sombras suaves (`EntornoRealista.vue`); luces más suaves y un contraluz frío.
- **Presupuesto**: 19 388 triángulos y 18 llamadas de dibujo en el peor instante (`t` = 0,375, cuña cerrada; antes
  15 036 y 18; tope 40 000 y 40). Sin cambios de posiciones, tiempos, hitos ni vistas.

No se ha visto en pantalla (el usuario prueba en local).

## Revisión de diseño (2026-10-17)

Correcciones de una revisión de render, rendimiento, fidelidad y realismo (ids de `.verify/agentes/hallazgos/`):

- **Células que flotaban o se hundían (realismo-09).** Las células inflamatorias de la superficie del hematoma tenían
  una posición fija calculada para un hematoma a escala 0,95 y liso: en el paso `inflamacion` 7 de 16 neutrófilos
  flotaban y 8 quedaban hundidos, y entre `inflamacion` y `callo_blando`, al encoger el hematoma, quedaban en el aire.
  Además, todo lo que se apoyaba en el hematoma o en el callo llevaba el desplazamiento del fragmento distal (0,12 en
  x para y > 0), aunque los dos son tornos centrados en x = 0. Ahora (`disposicion.ts`) se colocan en cada fotograma
  sobre la superficie que se dibuja (la irregular de `abollar`, con la misma función `grumo` y la misma semilla), a
  la escala actual, sin el desplazamiento; las del hematoma asoman el 65 % y desaparecen con él. Las del callo van
  aplanadas contra su superficie (1,15 × 0,6 × 1,15 radios, a lo largo de la normal del perfil, que en los extremos
  del manguito se tumba unos 30°): asoman unos dos tercios y se apoyan en toda la base, no como canicas. Las de la
  brecha no cambian.
- **Grano del relieve a escala (realismo-04).** El tramo necrótico (un anillo de 0,35 de largo) iba a 1,56 × 28,6
  repeticiones por unidad (el borde que muere salía liso y rayado), y el callo a 0,2-0,6 en el torno frente a 4-6 en
  sus caras de corte. Ahora todas las formas traen UV en unidades (`anillo` del hueso, `fusiforme` con el torno de
  `revolucion`) y la repetición se fija por unidad: cortical y hueso necrótico 1,4; médula 1,2; periostio 0,6;
  hematoma y callo 1,5. El tramo sano y el necrótico siguen el mismo dibujo en su unión, y en el borde dentado el
  grano no se estira. Filtrado anisótropo 4.
- **Periostio de una pasada (rendimiento-01).** Se creaba siempre transparente y seguía dibujándose en dos pasadas
  con opacidad 1; ahora es opaco mientras está engrosado (t de 0,30 a 0,70) y translúcido (0,7) cuando es fino.
- **Sangre sin emisivo (realismo-03).** Vasos rotos, gotas y vasos nuevos: la sangre no emite luz y, con la luz de la
  base, el emisivo la aclaraba por dentro. Los vasos nuevos llevan el color de pared de vaso (`#c9473e`); la sangre
  de los rotos y de las gotas sigue `#a9271f`.
- **Instancias ocultas (render-13).** Escala 0 con el término homogéneo en 1 (`makeScale(0, 0, 0)`) en vez de las 16
  componentes a 0, que daban una esfera envolvente NaN (sin orden de transparencias ni raycast).
- **Paleta unificada** (`NATURAL`): cortical `#eadfc8` (la del hueso y la BMU), hueso laminar nuevo `#f2e9d8`,
  cartílago `#d9e8ef` y calcificado `#a2aaae` (fidelidad-16), osteoblasto `#8d86c6` (fidelidad-06), célula madre
  `#cbb7da` (la versión pálida del precursor de la BMU) y periostio blanco rosado `#e6cfc4` (antes tostado
  `#d8ae8c`; fidelidad-17, comprobado). El hueso necrótico queda pálido, de un blanco de tiza (`#f3eee4`, antes `#a39478`): sin
  riego no sangra ni se oscurece (fidelidad-14; el texto del paso se cambió a la vez).
- **Pruebas:** el presupuesto cuenta la doble pasada y el pase de sombras; pruebas nuevas de la colocación de las
  células, de las UV en unidades, del periostio opaco y de la esfera envolvente de las instancias. Higiene: alias
  local `COLOR` en `mallas.ts` y sin `radioCalloEscalado`, que nadie usaba (rendimiento-16).

Presupuesto en el peor instante: antes 19 388 triángulos y 18 llamadas (20 con la doble pasada; 18 de sombra);
ahora 19 388 y 18 (19 con la doble pasada, y ninguna doble pasada entre t = 0,30 y 0,70; 18 de sombra).

Cambios de texto propuestos, sin aplicar: el hueso desvitalizado de los bordes, en fresco, es pálido y no sangra
(fidelidad-14), y el fibrocartílago del callo ya no es «celeste» sino blanco azulado (fidelidad-16); las frases
exactas están en el informe de la revisión.

No se ha visto en pantalla. Conviene mirar: las células sobre el hematoma en los pasos `inflamacion` y
`callo_blando` (que se vean apoyadas y que se vayan con él); los osteoblastos y osteoclastos aplanados sobre el
callo; el grano del borde necrótico y del callo; y el periostio blanco rosado sobre la cortical marfil.
