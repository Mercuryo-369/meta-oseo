# Escena 3D del hueso alveolar por dentro (módulo 1)

Nota de diseño de `hueso_alveolar`, escena **procedural** del OVA (el formato lo explica
[escena-3d-bmu.md](escena-3d-bmu.md); la plantilla de código es la del hueso largo,
[escena-3d-hueso.md](escena-3d-hueso.md)). Es una actividad **opcional** del módulo 1, `m1_5_alveolar_3d`
(sección 1.5 "La mandíbula, un hueso bajo carga", 30 puntos), que acompaña a la actividad multicapa
`m1_5_proceso_alveolar`: el mismo corte vestibulolingual del dibujo `m1_proceso_alveolar_corte.svg`, pero en
un bloque que se corta y se gira.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y la escena **recorre el cuerpo de la mandíbula**. Aquí `t` no es
tiempo: es el orden en que se descubren las estructuras. Puede ir y volver cuando quiera, girar la escena con
un dedo y acercarla con dos.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `cuerpo` (0) | Un segmento del cuerpo mandibular con un premolar de una raíz en su alvéolo; solo la cortical lisa | `general` |
| `corte` (0,18) | La mitad anterior se aparta y se desvanece; queda la sección vestibulolingual por el eje de la raíz | `corte` |
| `tablas` (0,34) | Las tablas corticales (vestibular fina, lingual y base gruesas) se destacan | `corte` |
| `trabecular` (0,5) | Las trabéculas entre las tablas se destacan sobre la médula | `corte` |
| `alveolar_propio` (0,66) | La lámina densa que reviste el alvéolo se destaca y aparecen sus perforaciones (lámina cribiforme); la cámara se acerca a la raíz | `raiz` |
| `ligamento` (0,82) | El ligamento periodontal se destaca y aparecen sus fibras oblicuas, del hueso al cemento | `raiz` |
| `conducto` (1) | El conducto mandibular bajo el ápice, con el nervio (blanco amarillento), la arteria (roja) y la vena (azulada); la cámara mira dentro del túnel | `conducto` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/alveolar/estado.ts`): pistas de fotogramas
  clave con tramos suavizados. Cada estructura tiene un `resalte` (0 a 1) que sube hasta su hito, se mantiene
  un poco y se apaga antes del hito siguiente; nunca hay dos estructuras destacadas a la vez (una prueba lo
  comprueba). Las perforaciones y las fibras aparecen con su fase y se quedan.
- **La sección es un dibujo en 2D montado sobre un bloque en 3D.** Los perfiles de la sección (contorno del
  cuerpo, región trabecular en herradura, raíz, corona, pulpa, bandas del ligamento y de la lámina) son
  polígonos `[z, y]` calculados en `disposicion.ts` (puro). `geometria.ts` los convierte en placas planas
  (`ShapeGeometry`) y en bloques extruidos a lo largo del cuerpo (`ExtrudeGeometry`). La mitad que queda es un
  cascarón cortical extruido con el hueco del trabecular; la cara de corte lleva encima, a profundidades
  distintas de unas centésimas, las placas de cada capa. La médula está 0,16 unidades por detrás de la cara y
  las trabéculas (barras instanciadas, orientadas en abanico desde la raíz hacia las tablas) van en ese hueco.
- **Cuatro piezas** (`mallas.ts`): `MitadMovil` (se aparta 3,4 unidades por +X y se desvanece),
  `CuerpoSeccionado` (cascarón, cara de las tablas, médula, placa del fondo, trabéculas), `Alveolo` (media
  corona en relieve, cara de corte del diente con pulpa, lámina con perforaciones, ligamento con fibras) y
  `ConductoMandibular` (túnel abierto hacia la cara con el nervio y los vasos, que terminan como discos a la
  vista dentro del túnel). Reciben el estado y solo mueven, aclaran o destacan.
- **Resaltes por color propio:** cada estructura se destaca con un emisivo que es una versión más viva de su
  propio color (`paleta.ts`, `resalte*`), no con el amarillo común de las otras escenas: sobre la médula
  amarilla, un destello amarillo borraba las trabéculas.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`) con la prop `resolverVista` y las vistas de
  `alveolar/vistas.ts`. La cara de corte mira hacia +X, así que las vistas que la muestran tienen un azimut
  grande (la cámara se coloca del lado +X, algo hacia vestibular).
- **Colores:** los de `NATURAL` en `alveolar/paleta.ts` (la paleta común de las escenas: ver «Revisión de
  diseño»). Los del dibujo `m1_proceso_alveolar_corte.svg` siguen en `HEX`, que aquí ya no se dibuja pero importan
  otras escenas.

## 3. Límites y honestidad

- Las formas son **esquemáticas**: el cuerpo es un bloque de sección ovoide (más alto que ancho, redondeado
  por la base, estrechado hacia la cresta), no la anatomía real; la corona es la de un primer premolar inferior
  (ver «Realismo»); el ligamento (0,06 unidades) y la lámina (0,10) van **mucho más gruesos** que en la realidad para que se vean
  en un teléfono, y el conducto va exagerado y algo alto. La raíz cabe entera en la sección (las de verdad
  suelen quedar fuera del plano en parte).
- **La sección es plana.** El alvéolo, el ligamento, la raíz y el conducto son placas superpuestas sobre la
  cara de corte, no volúmenes: al girar mucho la cámara hacia un lado se nota que no tienen grosor. Solo la
  corona, el cascarón cortical, las trabéculas y el túnel del conducto tienen volumen. Desde el lado −X (detrás
  del bloque) se ve el interior del cascarón sin cara de corte: no hay vista con nombre que mire desde allí.
- La mitad anterior **se desvanece** al apartarse (no queda como cuña apartada): con la cámara casi de frente a
  la sección, una mitad opaca desplazada la tapaba.
- La cortical se funde con la lámina cerca de la cresta (no hay trabecular entre ambas) más trecho del lado
  vestibular que del lingual, porque la tabla vestibular es más fina. Es lo que ocurre, pero aquí es un artefacto
  del umbral `HUECO_MINIMO_TRABECULAR`, no un dato.
- Las fibras del ligamento y las perforaciones son líneas de un píxel y discos pequeños: se ven poco en
  pantallas de baja densidad y desde la vista `corte`.
- **Sin revisión del docente** del texto de los pasos ni de las formas. Dudas científicas concretas que debería
  mirar: el grosor relativo de las tablas (aquí lingual 0,36 frente a vestibular 0,24 y base 0,5), la
  orientación en abanico de las trabéculas, el sentido de las fibras oblicuas (aquí del hueso, más arriba, al
  cemento, más abajo) y la posición del conducto respecto del ápice.
- **Sin medir en un teléfono real.** Presupuesto comprobado por pruebas en el peor instante: ver «Revisión de
  diseño» (las cifras anteriores no contaban la doble pasada ni las sombras). three va en el chunk `webgl`
  compartido.
- Verificada en Chrome con WebGL y emulación táctil de 390 × 844 px (`t` = 0; 0,18; 0,34; 0,5; 0,66; 0,82 y 1) y
  a 1280 × 800 px (`t` = 0,18 y 0,66); capturas en `.verify/alveolar/`. No se probó el pellizco ni el giro con
  el dedo, ni la reproducción completa.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes geométricas | `apps/web/src/scenes/procedural/alveolar/estado.ts` |
| Perfiles 2D de la sección, trabéculas, perforaciones, fibras | `.../alveolar/disposicion.ts` |
| Placas, bloques extruidos, media corona | `.../alveolar/geometria.ts` |
| Las cuatro piezas | `.../alveolar/mallas.ts` |
| Vistas de cámara | `.../alveolar/vistas.ts` |
| Colores | `.../alveolar/paleta.ts` |
| Escena y contenido dentro del lienzo | `.../alveolar/EscenaAlveolar.vue`, `ContenidoAlveolar.vue` |
| Pruebas | `.../alveolar/estado.test.ts`, `disposicion.test.ts`, `geometria.test.ts` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m1_conociendo_el_hueso/content.json`, actividad `m1_5_alveolar_3d` |
| Dibujo hermano en 2D | `public/images/m1/m1_proceso_alveolar_corte.svg`, actividad `m1_5_proceso_alveolar` |

## Realismo (2026-10-14)

Mejora de realismo «paso por paso» con la base compartida (`scenes/procedural/realismo.ts` y `EntornoRealista.vue`),
como en [escena-3d-hueso.md](escena-3d-hueso.md). Lo que sigue sustituye lo que dicen las secciones anteriores sobre
los colores (sección 2), la forma de la corona y el presupuesto (sección 3).

- **Paleta natural** propia (`NATURAL` en `alveolar/paleta.ts`; `HEX` no cambia porque lo importan la mandíbula
  fetal y la ortodoncia): hueso marfil, con la cara de corte del hueso compacto más blanca que la superficie y el
  hueso alveolar propio (la lámina dura) como la banda más clara; trabéculas marfil sobre una médula mixta, roja y
  grasa, de color ámbar rojizo; ligamento periodontal rosado con fibras blanquecinas; dentina amarillo pálido,
  cemento algo más oscuro y mate, esmalte blanco azulado y pulpa rojiza; nervio blanco amarillento, arteria roja y
  vena azulada; perforaciones de la lámina oscuras. Los resaltes de cada fase son versiones más vivas y cálidas de
  esos colores. Los textos de los pasos de esta escena no nombran colores.
- **Tejido por pieza**: superficie del hueso, cara de corte de las tablas, hueso alveolar propio, pared y borde
  del conducto: `hueso` (mate, con poros). Cemento: `dentina` desde la revisión de diseño (antes `hueso`). Trabéculas: `hueso_esponjoso`. Médula: `medula`. Ligamento:
  `membrana`, con las vetas del relieve giradas para que crucen la banda, como sus fibras principales. Esmalte:
  `esmalte`. Dentina: `dentina`. Pulpa: `encia` (blanda y húmeda). Perforaciones: `cavidad`. Nervio: `nervio`.
  Arteria y vena: `vaso`. Las fibras del ligamento siguen siendo líneas.
- **Relieve con UV en unidades de la escena**: las placas y el bloque extruido (este, con un generador propio: en
  las paredes, el recorrido del contorno en espejo, sin costuras) llevan UV en unidades, y cada material fija
  cuántas repeticiones del relieve caben en una unidad (1,3 en el hueso).
- **Forma**:
  - Las paredes del bloque extruido se sombrean suaves (antes se veían las facetas de la extrusión); las aristas
    con la cara de corte quedan vivas, como en un corte de sierra.
  - La corona es la de un primer premolar inferior: cúspide vestibular alta sobre el eje de la raíz, con sus aristas
    mesial y distal; cúspide lingual baja; surco central de mesial a distal, cerrado por los rebordes marginales
    (antes, un torno con una sola cúspide redondeada). Se construye por meridianos: la cara del diente y una
    superficie oclusal en relieve, así que su borde en el plano de corte es la silueta del corte.
  - La cara de corte del diente muestra el esmalte sobre la dentina, que hace un cuerno bajo cada cúspide; el
    cemento que reviste la raíz, fino en el cuello y grueso en el ápice, que llena (lo nombran los textos y antes no
    se dibujaba); y la pulpa.
  - 200 trabéculas (antes 110; las 110 primeras siguen en su sitio) de seis caras, algo más finas por un extremo y
    de grosor variable, sin asomar por delante de la cara de corte.
- **Desvanecer de verdad**: al pasar un material a transparente se marca para recompilar. Three fija el alfa a 1 en
  el sombreador de un material que se compiló opaco, así que antes la mitad anterior se apartaba opaca y desaparecía
  de golpe.
- **Luces**: el bloque de la escena del hueso (principal 2,6, contraluz frío 1,1, ambiental 0,18 y hemisférica
  cálida 0,45) y `EntornoRealista` (0,75), con sombras suaves.
- **Presupuesto** comprobado por pruebas en el peor instante, con la cuenta de entonces (sin la doble pasada ni
  las sombras; la de hoy, en «Revisión de diseño»): 7 430 triángulos y 19 llamadas de dibujo (antes 4 925 y 19;
  tope: 40 000 y 40). Por pieza: mitad anterior 1 358 (tope 2 500), cuerpo seccionado 4 269 (9 000),
  alvéolo 1 671 y 8 llamadas (3 000 y 8: la media corona y la cara de corte del esmalte van en una sola malla, lo que
  deja sitio al cemento) y conducto 312 (1 500). Con sombras, cada malla opaca se dibuja además en el mapa de sombras.
- **Pruebas nuevas** (10; 78 en total): la corona con dos cúspides y su borde en el corte igual a la silueta; la
  dentina bajo el esmalte y la pulpa dentro de ella; el cemento dentro de la raíz y lleno en el ápice; UV en unidades
  y paredes sin facetas en el bloque; UV en toda superficie con relieve; el desvanecido recompila el material.
- **Dudas para el docente** (resueltas en la revisión de diseño): la cresta alveolar quedaba 0,04 unidades por
  encima del cuello del diente; ahora queda 0,2 por debajo (fidelidad-02). El esmalte está a su grosor real; el
  cemento va de 4 a 8 veces más grueso en el cuello para que se vea (fidelidad-13).

No se ha visto en pantalla (el usuario prueba en local).

## Revisión de diseño (2026-10-17)

Revisión de render, rendimiento, fidelidad histológica y realismo, con la base compartida nueva (`realismo.ts`,
`iluminacion.ts` y `EntornoRealista.vue`, que pone las luces y las sombras de todas las escenas). Las tres escenas
dentales (esta, [escena-3d-alveolo.md](escena-3d-alveolo.md) y [escena-3d-ortodoncia.md](escena-3d-ortodoncia.md))
quedan coherentes: el mismo ligamento, la misma lámina dura, el mismo diente y la misma relación cresta–cuello.

- **La cara de corte ya no queda en sombra** (render-02): `placa` giraba la forma con la cara delantera hacia −X, y
  la cámara la mira desde +X; el sesgo de las sombras metía la consulta detrás de la placa y de la tapa del bloque
  (55-75 % de sombra en las capas del corte). Ahora invierte el orden de los triángulos y pone la normal en +X. Los
  discos de las perforaciones y el anillo del borde del conducto, igual. La escena del alvéolo, que importa `placa`,
  queda corregida con ella.
- **La cresta ya no toca el esmalte** (fidelidad-02, confirmado: en un periodonto sano la cresta queda 1,5 a 2 mm por
  debajo del límite amelocementario, el espacio de la inserción supracrestal; el propio OVA lo dice en el módulo 5):
  `Y_CUELLO` pasa de 0,04 por debajo de la cresta a `CRESTA_A_CUELLO` = 0,2 por encima (unos 1,6 mm). La corona y la
  cámara pulpar suben 0,24. Entre la cresta y el cuello queda la raíz cervical, cubierta de cemento: en la cara de
  corte (dentina y cemento llegan al cuello) y en relieve (`mediaRaizCervical`, un medio cilindro en cada mitad), para
  que la corona no flote sobre el hueso. La vista `corte` sube su objetivo 0,15 para que la cúspide no se salga en un
  lienzo ancho (una prueba lo comprueba).
- **Foramen apical** (fidelidad-12, confirmado): el conducto se cerraba 0,22 unidades (1,7 mm) antes del ápice, en
  cemento macizo; ahora llega a 0,01 (`Y_FORAMEN`) y, como la pulpa va delante del cemento, abre el foramen.
- **Cemento sin poros vasculares** (fidelidad-13, confirmado): el cemento es avascular; pasa del tejido `hueso` al
  `dentina` (liso y mate). Su grosor no cambia (exagerado a propósito) y la longitud de la raíz tampoco (sin acuerdo
  del docente).
- **Esmalte que no parece porcelana** (realismo-10): brillo satinado en la base (`realismo.ts`) y un degradado por
  vértice (`ESMALTE` en `paleta.ts`, `pintarEsmalte` en `geometria.ts`) según la altura sobre el cuello: amarillento en
  el tercio cervical, blanco cálido en el medio, gris azulado en la cúspide. La cara de corte del esmalte, un blanco
  uniforme. Se usa la altura y no la fila de la malla (lo que proponía la corrección): así es la misma regla en las
  tres escenas.
- **Paleta común** (el mismo tejido, el mismo color): cara de corte del hueso compacto `#eadfc8` y trabéculas
  `#e6d8bc` (antes `#efe6d2` y `#e2cfa9`), borde del conducto `#f4ecdc`, arteria `#c9473e`. El ligamento (`#d4948b`,
  fibras `#f7ece4`), la lámina dura (`#f4ecdc`) y el diente (`#ecd9aa`, `#d2b984`, `#c65f5b`) ya eran los de la paleta
  común: las escenas del alvéolo y de la ortodoncia los toman ahora de aquí. La médula sigue mixta (`#b86a45`, ámbar
  rojizo): la paleta común solo tiene roja y amarilla, y la del proceso alveolar de un adulto es una mezcla; la
  ortodoncia la usa también (fidelidad-16).
- **Sombras**: las capas interiores del corte (ligamento, raíz, pulpa, perforaciones) llevan `userData.sinSombra`:
  son un dibujo plano sobre las de detrás, y su sombra solo dejaría un reborde desplazado. La lámina y las tablas sí
  proyectan dentro del hueco del trabecular.
- **Higiene** (rendimiento-15 y -16): las perforaciones se escriben sin crear objetos de three; `curvaSuave`,
  `interpolarMonotona` y `PuntoPerfil` dejan de exportarse; `mallas.ts` importa la paleta como `COLOR` (no `HEX`).
- **Presupuesto** (rendimiento-09), medido como se dibuja (instancias, la doble pasada de los transparentes de doble
  cara y, aparte, el pase de sombras) en 401 instantes: peor instante (t ≈ 0,095, la mitad anterior desvaneciéndose)
  **23 llamadas y 8 868 triángulos, más 16 llamadas y 7 178 triángulos de sombra**; antes, con la misma cuenta, 21 y
  8 758, más 18 y 7 400. Tope: 40 llamadas, 40 000 triángulos y 40 llamadas de sombra. La mitad anterior pasa de 2 a
  3 llamadas (la raíz cervical, con su material de cemento).
- **Pruebas**: 85 (antes 78): la placa mira a +X; los discos y el anillo también; el degradado del esmalte; la raíz
  cervical; las capas sin sombra; el conducto hasta el foramen; la cresta 0,2 bajo el cuello; el encuadre de `general`
  y `corte`; el presupuesto con la doble pasada y las sombras.
- **Textos**: los pasos de esta escena no nombran colores; ninguno cambia.
- **Para mirar en pantalla**: la franja de raíz cervical en la vista `general` (sin encía, como dice el texto); que la
  cara de corte se vea iluminada como la tapa del bloque; el degradado del esmalte con la luz de estudio.

No se ha visto en pantalla (el usuario prueba en local).
