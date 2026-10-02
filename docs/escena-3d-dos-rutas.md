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
  cambiando forma y color por instancia. Las espículas también llevan color por instancia: osteoide rosado al nacer,
  hueso entretejido al mineralizarse, hueso laminar al final.
- **Molde que se sustituye sin geometría nueva:** la diáfisis cartilaginosa son dos cilindros (arriba y abajo del
  frente) que se acortan hacia los extremos; entre el frente y el cartílago sano hay otro par de cilindros grises
  (calcificado). Los condrocitos desaparecen cuando el frente o el centro secundario los alcanza. El collar, la cortical
  y el pericondrio son anillos **abiertos 120° hacia la cámara** para ver el interior.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`), con `resolverVista` y las vistas de esta escena
  (`dos_rutas/vistas.ts`). Un dedo gira, dos acercan, sin paneo.
- **Colores:** los del SVG de las rutas del módulo 3 y de las escenas del hueso, la BMU y el osteoblasto
  (`dos_rutas/paleta.ts`), para que cada tejido se reconozca de un dibujo al otro.

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
- El **pericondrio se ve a través del cartílago** (es translúcido) como una banda ocre al fondo de la diáfisis; se
  atenuó su opacidad para que el molde siga leyéndose celeste.
- Los vasos de la izquierda son barras rectas con un quiebro; no se ramifican. Las células de revestimiento del final
  son osteoblastos aplanados, sin capa continua.
- Los osteoblastos del frente de la derecha y los osteoclastos son esferas de tamaño fijo en posiciones fijas relativas
  al frente; no hay borde festoneado ni laguna de resorción.
- **Sin revisión del docente** del texto de los pasos ni de la forma de las estructuras.
- **Sin medir en un teléfono real.** Presupuesto comprobado por pruebas en el peor instante (t = 0,88): 29 076
  triángulos y 29 llamadas de dibujo (límite: 40 000 y 40).
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
