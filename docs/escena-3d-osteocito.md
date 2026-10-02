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
  Todo lo repetido es `InstancedMesh` (matriz cero = oculto); 19 llamadas de dibujo en el peor instante.
- **La compresión** es un encogimiento en Y del grupo entero (`ContenidoOsteocito.vue`) más un arrastre lateral de
  las dendritas dentro de sus canalículos, que no se mueven.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con `resolverVista` apuntando a `osteocito/vistas.ts`.
- **Colores:** los del SVG `m2_osteocito_lagunar.svg` y de las paletas de la BMU y del hueso (`paleta.ts`). El
  líquido en movimiento va en un azul más profundo (`#1e8ff0`) y emisivo, porque bajo el velo rosa y dentro del
  canalículo translúcido un celeste se perdía.

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
- **Sin medir en un teléfono real.** Presupuesto medido por la prueba (41 instantes, contando instancias visibles):
  30 063 triángulos y 19 llamadas de dibujo en el peor instante (fase `red` en adelante).
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
