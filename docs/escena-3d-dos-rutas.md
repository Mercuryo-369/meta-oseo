# Escena 3D de las dos rutas de osificación (módulo 3)

Nota de diseño de `dos_rutas_osificacion`, una escena **procedural** del OVA (el formato, los controles y cómo
añadir otra escena están en [escena-3d-bmu.md](escena-3d-bmu.md); la plantilla de código es la del hueso,
[escena-3d-hueso.md](escena-3d-hueso.md)). Es una actividad **opcional** del módulo 3, `m3_1_dos_rutas_3d` (sección
3.1, 30 puntos), que acompaña a la tabla comparativa y al dibujo `m3_rutas_formacion_osea.svg`: en vez de leer las
dos rutas en columnas, el estudiante las ve avanzar **a la vez, lado a lado**.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y los dos huesos se forman al mismo tiempo: a la **izquierda** un hueso
plano por osificación intramembranosa, a la **derecha** un hueso largo por osificación endocondral, separados por un
hueco. Aquí `t` sí es tiempo (didáctico, no proporcional). Puede girar la escena con un dedo y acercarla con dos.

| Fase (`t`) | Izquierda (intramembranosa) | Derecha (endocondral) | Vista |
|---|---|---|---|
| `mesenquima` (0) | Células mesenquimales fusiformes dispersas en un panel translúcido | Lo mismo | `general` |
| `condensacion` (0,15) | Las células se agrupan en una masa aplanada | Se agrupan en una masa alargada | `general` |
| `diferenciacion` (0,3) | Osteoblastos cúbicos y un islote de osteoide en el centro | Condrocitos en lagunas dentro de un molde de cartílago con forma de hueso largo, con pericondrio | `intramembranosa` |
| `crecimiento` (0,45) | Espículas de hueso entretejido que se ramifican, osteoblastos al borde, osteocitos atrapados | Condrocitos centrales hipertróficos, matriz calcificada (gris), collar perióstico abierto hacia la cámara | `endocondral` |
| `vascularizacion` (0,6) | Vasos que entran entre las trabéculas y médula | Yema perióstica que perfora el collar, osteoclastos y osteoblastos en el frente, vaso medular: centro primario | `detalle` |
| `hueso_primario` (0,8) | Trabéculas más gruesas; las de la periferia se funden en dos tablas compactas | El frente sustituye casi toda la diáfisis; placas de crecimiento en los extremos y centros secundarios en las epífisis | `general` |
| `remodelado` (1) | Hueso laminar: osteonas y laminillas en las tablas | Cortical gruesa, cavidad medular, placa fina y cartílago articular | `general` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan para
completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/dos_rutas/estado.ts`): pistas de fotogramas clave
  con tramos suavizados, agrupadas en `intramembranosa` y `endocondral`. Adelantar y atrasar es exacto; nada se
  acumula entre fotogramas. Los hitos son los que usa el contenido del módulo 3 y una prueba los fija.
- **Dos lados con su propio objeto** (`mallas.ts`): `LadoIntramembranoso` (origen en x = −2,5) y `LadoEndocondral`
  (x = +2,5). Cada uno recibe el estado y solo coloca, escala, colorea y aclara piezas; no calcula biología. Lo que no
  se ve no se dibuja (`visible = false` o matriz cero en las instancias).
- **Piezas repetidas y sus posiciones** (`disposicion.ts`, puro y determinista): 64 células a la izquierda (dónde
  están dispersas, dónde se condensan y dónde acaban: al borde de una espícula o dentro de ella), 84 espículas que se
  ramifican desde el centro y rebotan en el borde de la red, 6 vasos, 8 osteonas; 72 células a la derecha (cada una
  con su laguna dentro del molde) y 44 trabéculas del centro primario.
- **Células instanciadas con color por instancia:** una misma `InstancedMesh` pasa de célula mesenquimal pálida a
  osteoblasto violeta, osteocito azul o célula de revestimiento (izquierda) y a condrocito lila o hipertrófico (derecha)
  cambiando forma y color por instancia. Las espículas también llevan color por instancia: osteoide pálido algo
  rosado al nacer, hueso entretejido rosado al mineralizarse, hueso laminar marfil al final.
- **Molde que se sustituye sin geometría nueva:** la diáfisis cartilaginosa son dos cilindros (arriba y abajo del
  frente) que se acortan hacia los extremos; entre el frente y el cartílago sano hay otro par de cilindros grises
  (calcificado). Los condrocitos desaparecen cuando el frente o el centro secundario los alcanza. El collar, la cortical
  y el pericondrio son anillos **abiertos 120° hacia la cámara** para ver el interior.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`), con `resolverVista` y las vistas de esta escena
  (`dos_rutas/vistas.ts`). Un dedo gira, dos acercan, sin paneo.
- **Colores:** `HEX` (`dos_rutas/paleta.ts`) guarda los del SVG de las rutas del módulo 3 y de las escenas del hueso,
  la BMU y el osteoblasto (lo importa la escena de la fractura y no cambia); la escena dibuja `NATURAL`, con la
  paleta unificada entre escenas (ver «Revisión de diseño»).

## 3. Límites y honestidad

- Las formas son **esquemáticas**: el hueso plano es una red de barras entre dos tablas, no un parietal; el molde es un
  cilindro con dos elipsoides; las trabéculas del centro primario son barras al azar; los tamaños relativos (células
  frente a hueso) no guardan escala. El contenido lo dice en el primer paso.
- **La placa de crecimiento no muestra sus zonas** (reserva, proliferación en columnas, hipertrofia, calcificación,
  osificación): es solo la banda de cartílago que queda entre el frente y el centro secundario. Los condrocitos no se
  ordenan en columnas.
- El cartílago articular es lo que queda de la epífisis translúcida alrededor del centro secundario: no hay una capa
  aparte. La cortical madura de la derecha es un anillo liso sin osteonas ni laminillas (las osteonas solo se dibujan
  en la tabla superior de la izquierda).
- El **pericondrio** es una vaina fina, blanco rosada y translúcida; solo se dibuja su cara exterior, que se lee como
  dos rebordes a los lados del molde.
- Los vasos de la izquierda son barras rectas con un quiebro; no se ramifican. Las células de revestimiento del final
  son osteoblastos aplanados, sin capa continua.
- Los osteoclastos del frente de la derecha son elipsoides aplanados apoyados en el frente y los osteoblastos,
  elipsoides algo más altos que anchos, de tamaño fijo y en posiciones fijas relativas al frente; no hay borde
  festoneado ni laguna de resorción.
- **Sin revisión del docente** del texto de los pasos ni de la forma de las estructuras.
- **Sin medir en un teléfono real.** Presupuesto comprobado por pruebas en el peor instante (t = 0,88), contando la
  doble pasada de los transparentes de doble cara: 38 820 triángulos y 30 llamadas de dibujo, más 17 del pase de
  sombras (límite: 40 000 y 40).
- Verificada en Chrome con WebGL, tema oscuro, con emulación táctil de 390 × 844 px (`t` = 0; 0,15; 0,3; 0,45; 0,6; 0,8 y
  1) y a 1280 × 800 px (`t` = 0,3 y 1). No se recorrió la reproducción completa, no se probó el pellizco ni el tema
  claro, y no se comprobó la vista `detalle` en escritorio.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes | `apps/web/src/scenes/procedural/dos_rutas/estado.ts` |
| Disposición de piezas repetidas | `.../dos_rutas/disposicion.ts` |
| Formas (esfera, tramo, cilindro, anillo abierto, aro) | `.../dos_rutas/geometria.ts` |
| Los dos lados | `.../dos_rutas/mallas.ts` |
| Vistas de cámara | `.../dos_rutas/vistas.ts` |
| Paleta | `.../dos_rutas/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../dos_rutas/EscenaDosRutas.vue`, `ContenidoDosRutas.vue` |
| Pruebas | `.../dos_rutas/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m3_construyendo_hueso/content.json`, actividad `m3_1_dos_rutas_3d` |

## Realismo (2026-10-14)

Mejora de realismo con la base común de las escenas procedurales (`scenes/procedural/realismo.ts` y
`EntornoRealista.vue`), la misma de [escena-3d-hueso.md](escena-3d-hueso.md) y
[escena-3d-matriz.md](escena-3d-matriz.md):

- **Paleta natural** propia (`NATURAL` en `dos_rutas/paleta.ts`; `HEX` no cambia porque la importa la escena de la
  fractura): mesénquima gelatinoso rosado pálido; osteoide que al mineralizarse pasa a hueso inmaduro y, ya laminar,
  a marfil (antes, tres rosas de tinción; los valores son ahora los de la paleta unificada del 2026-10-17); cartílago
  hialino blanco azulado; vasos y médula roja color sangre, también en la cavidad medular (desde el 2026-10-17);
  pericondrio blanco rosado (antes ocre claro). Las células conservan sus tonos
  didácticos, algo más sobrios (mesenquimal malva pálido, osteoblasto violeta, osteocito azul, revestimiento pálido,
  condrocito lila, osteoclasto lila). Se mantiene el color que nombra el texto del paso `crecimiento`: el cartílago
  calcificado sigue **gris** (ahora un gris neutro, antes gris azulado), más oscuro que el cartílago sano.
- **Tejido de cada pieza** (`realismo.ts`): panel → `mesenquima`; células, osteoclastos y osteoblastos del frente →
  `celula`; núcleos → `nucleo`; islote de osteoide → `fibra` (colágeno aún sin mineralizar: estrías y brillo sedoso);
  espículas, collar perióstico y trabéculas del centro primario → `hueso_inmaduro`; tablas compactas, sus osteonas y la
  cortical madura → `hueso`; centros secundarios → `hueso_esponjoso`; molde y epífisis → `cartilago` (liso y húmedo) y
  la zona calcificada, el mismo tejido pero mate (rugosidad 0,62 y poco barniz: matriz calcárea); pericondrio →
  `membrana`; yema, vaso medular y vasos de la izquierda → `vaso` (con su brillo propio); velo de médula roja y cavidad
  medular → `medula`; lagunas de los condrocitos → `cavidad`. Los materiales son de una cara, como antes, salvo los
  velos, el collar y la cortical: las células, el cartílago y el pericondrio son translúcidos y se verían con doble
  capa.
- **Luz de entorno** y contraluz frío, como en la escena del hueso; la luz principal proyecta sombras suaves.
- **Forma**: células de 12 × 8 segmentos (antes 7 × 5 a la izquierda y 8 × 6 a la derecha) y tamaño algo distinto en
  cada una (±8 %, determinista); grosor variable en espículas (−15 % a +10 %), vasos (−15 % a +20 %) y trabéculas del
  centro primario (±20 %); islote de osteoide de 20 × 12; tablas compactas de borde biselado (caja de 44 triángulos con
  normales redondeadas y la cara delantera plana donde van las laminillas, relieve repetido en proporción a su forma);
  osteonas con su **conducto de Havers** oscuro en el centro (colores de vértice: misma malla y misma llamada de
  dibujo). Para caber en el presupuesto, los núcleos, que apenas se ven a través del cuerpo celular (opacidad 0,92),
  bajan a 4 × 3, y las lagunas, siempre detrás del cartílago translúcido, tienen su propia esfera de 6 × 5.
- **Presupuesto** en el peor instante (t = 0,9): 38 644 triángulos y 29 llamadas de dibujo (antes 29 076 y 29; límite
  de la prueba: 40 000 y 40). Pruebas nuevas en `geometria.test.ts`: la tabla y la osteona, UV y material físico en
  todas las mallas, y el gris del cartílago calcificado.

No se ha visto en pantalla (el usuario prueba en local): falta comprobar a ojo el contraste de las células pálidas y del
panel de mesénquima en el tema claro.

## Revisión de diseño (2026-10-17)

Revisión con mirada de diseñador gráfico y de clínico, sobre la base compartida nueva (luces de `iluminacion.ts` y
`EntornoRealista.vue`, motas, rugosidad y `veloFresnel` de `realismo.ts`).

- **Grano del relieve a escala (realismo-04 y realismo-19).** Las tablas compactas llevan UV en unidades de escena a
  su tamaño (`cajaBiselada` con medidas; repetición 1,5 por unidad): antes, con UV de 0 a 1 por cara, la cara
  frontal, la de las laminillas, iba a 2,9 × 20,6 repeticiones por unidad (7:1). El collar, la cortical y el
  pericondrio (`anilloAbierto`) también: arco por radio alrededor, alto a lo largo, (x, z) en las tapas y (radio,
  alto) en las caras de corte; repetición 1,5 en el collar, 1,4 en la cortical y 0,6 en el pericondrio. Antes cada
  parte del anillo traía sus UV de 0 a 1 y el grano cambiaba en cada arista. `anilloAbierto` calcula sus propias UV:
  no depende de las de `anillo` del hueso.
- **Molde de cartílago (realismo-11).** Velo de Fresnel al revés que en una membrana (1,15 en el centro, 0,6 en el
  contorno: es un sólido macizo, más espeso en el centro) y menos barniz (clearcoat 0,6 → 0,25): parecía un tubo de
  plástico.
- **Células del frente (realismo-21).** Los osteoclastos eran esferas perfectas de 0,12: ahora son grandes y
  aplanados (semiejes 1,5 r × 0,55 r × 1,2 r), apoyados en el plano del frente y girados en él, cada uno de una
  manera. Los osteoblastos, cúbicos-altos (0,9 r × 1,2 r × 0,9 r).
- **Médula roja en la cavidad medular (fidelidad-07, comprobado).** El último paso muestra un hueso en crecimiento
  (con placa de crecimiento y cartílago articular): al nacer y en la infancia toda la médula es hematopoyética, y la
  conversión a grasa empieza en la diáfisis después del primer año y llega al patrón adulto hacia los 25 (Ross y
  Pawlina; Moore y Dawson, *Radiology* 1990). Antes la cavidad se llenaba de médula amarilla en cuanto aparecía,
  mientras el panel izquierdo tenía médula roja; ahora es la misma, roja.
- **Sombras (render-05, caso menor).** Las dos tablas son las tapas del diploe y ya no proyectan sombra
  (`userData.sinSombra`): la de arriba dejaba en sombra el 14-25 % de las espículas y los vasos.
- **Instancias ocultas (render-13).** Escala 0 con el término homogéneo en 1 (`makeScale(0, 0, 0)`) en vez de las 16
  componentes a 0, que daban una esfera envolvente NaN.
- **Paleta unificada** (`NATURAL`): osteoide `#eed4c9` → hueso inmaduro `#e2b4a2` (espículas, collar, trabéculas del
  centro primario y centros secundarios; antes marfil cálido `#e5d3b0`) → laminar marfil `#eadfc8`; cartílago
  `#d9e8ef`; médula roja `#9e3f33` y amarilla `#e8c561`; vaso `#c9473e`; osteoblasto `#8d86c6`, osteocito `#8a9ad2`,
  osteoclasto `#b893cf`, núcleos `#4b408f`; revestimiento, un osteoblasto pálido (`#cdcae9`, antes rosado);
  pericondrio blanco rosado `#e6cfc4` (fidelidad-17, comprobado: el periostio fresco es una membrana fibrosa
  blanquecina y el pericondrio fetal, fino y translúcido; el caramelo `#d8ae8c`, con el brillo de terciopelo, se
  leía como cuero). El gris del cartílago calcificado, que nombra el texto, no cambia.
- **Pruebas:** el presupuesto cuenta ahora la doble pasada y el pase de sombras; nuevas pruebas de las UV en
  unidades, de la forma de las células del frente, de la esfera envolvente de las instancias, del color de la cavidad
  medular, del velo del cartílago y de las tablas sin sombra.

Presupuesto en el peor instante, contando la doble pasada: antes y después 38 820 triángulos y 30 llamadas (no hay
piezas nuevas); pase de sombras, de 19 a 17 llamadas (las tablas ya no proyectan).

No se ha visto en pantalla. Conviene mirar: el contraste del hueso entretejido rosado con el osteoide pálido en las
espículas; el molde de cartílago con el velo nuevo; y que los osteoclastos aplanados se distingan bien a través del
cartílago calcificado.
