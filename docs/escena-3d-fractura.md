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
| `hematoma` (0,15) | Un coágulo rojo oscuro fusiforme llena la brecha, entra en el canal y rodea los extremos; los bordes del hueso se oscurecen (necrosis) | `corte` |
| `inflamacion` (0,3) | El coágulo se vuelve rosado (granulación); neutrófilos (amarillos) y macrófagos (azules) sobre él y en la brecha; células madre (lila pálido) sobre el periostio engrosado; vasos nuevos desde el periostio y la médula | `detalle` |
| `callo_blando` (0,45) | Manguito fusiforme: centro celeste (fibrocartílago) y periferia beige (tejido fibroso); tapa también la brecha y el canal | `callo` |
| `callo_duro` (0,6) | El centro pasa por gris (cartílago calcificado) a rosa (hueso entretejido, endocondral); la periferia pasa directamente a rosa (intramembranosa); osteoblastos (violeta) sobre el callo | `corte` |
| `remodelado` (0,8) | El manguito encoge con osteoclastos (lila) encima; la médula central crece a través de la brecha; el hueso necrótico ya tiene color normal | `callo` |
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
  (`puntoSobreCallo`), así lo acompañan mientras encoge. Cada célula tiene un retraso propio para aparecer.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`), con `resolverVista` apuntando a `fractura/vistas.ts`. Las
  vistas de corte son elevadas (50° a 54°) porque la cuña se abre hacia arriba.
- **Colores** (`paleta.ts`): los del SVG `m5_reparacion_fractura_fases.svg` (coágulo `#b4413a`, neutrófilos
  `#f3e39a`, macrófagos `#86b3da`) y los de las escenas del hueso, la BMU y las dos rutas (cortical `#d98aa2`,
  periostio `#d2b48c`, cartílago `#cfe6ef`, calcificado `#8fa9b8`, osteoclasto `#c9a0dc`, osteoblasto `#8b7bdc`).

## 3. Límites y honestidad

- **Sin comprobación visual.** Por orden del usuario no se levantó Vite ni se abrió el navegador: no hay capturas
  en `.verify/fractura/`. Los encuadres se comprobaron solo por geometría (con FOV 34°, la vista `general` a
  distancia 11,5 abarca los 6,6 de largo del hueso en móvil vertical y en escritorio; `corte` y `detalle` cubren
  la brecha y el callo). Puede haber solapes, colores o tamaños que no se entiendan a la primera; revisar antes
  de la entrega al docente.
- Las formas son **esquemáticas**: fractura transversal (no oblicua ni conminuta) con desplazamiento lateral fijo
  de 0,12 que no se reduce; el periostio se dibuja como una vaina fina que el callo cubre (en realidad el callo se
  forma bajo el periostio, que queda levantado por fuera); el hematoma y el callo son sólidos de revolución
  lisos; las células están muy exageradas respecto al hueso y son esferas sin núcleo.
- La médula retirada de los extremos deja, en la fase `fractura`, un tramo de canal vacío: se interpreta como
  sangrado, pero no es una estructura real.
- El paso de cartílago a hueso se cuenta con el color de un solo material por parte: no hay trabéculas ni frentes
  de osificación dibujados dentro del callo.
- **Sin revisión del docente** del texto de los pasos ni de la forma de las estructuras. Los plazos de los textos
  siguen a la tabla de la sección 5.6 (horas a 2 semanas, 1.ª a 3.ª semana, 3.ª a 12.ª semana, meses a años).
- Presupuesto medido en memoria (sin WebGL): **15 036 triángulos y 18 llamadas de dibujo** en el peor instante
  (`t` = 0,375, cuña cerrada, cuando conviven hematoma y callo); una prueba exige menos de 40 000 y 40.
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
