# Escena 3D del hueso largo a la osteona (módulo 1)

Nota de diseño de `hueso_largo_a_osteona`, la segunda escena **procedural** del OVA (la primera es la BMU:
[escena-3d-bmu.md](escena-3d-bmu.md), que explica el formato, los controles y cómo añadir otra escena). Es una
actividad **opcional** del módulo 1, `m1_4_viaje_3d` (sección 1.4, 30 puntos), que acompaña a las actividades de
imágenes de esa sección: en vez de tocar capas en un dibujo plano, el estudiante baja de escala en 3D.

## 1. Qué hace el estudiante

Mueve el deslizador (o pulsa Reproducir) y la escena **baja de escala**. Aquí el tiempo no son días: es la
**profundidad de la mirada**. Puede subir y bajar cuando quiera, girar la escena con un dedo y acercarla con dos.

| Fase (`t`) | Qué se ve | Vista |
|---|---|---|
| `entero` (0) | Hueso largo: diáfisis, epífisis con cartílago articular y periostio | `general` |
| `abierto` (0,2) | La tapa de la cortical se levanta: cortical, médula ósea amarilla y trabéculas de las epífisis | `interior` |
| `corte` (0,42) | Un corte transversal de la diáfisis: periostio, cortical con osteonas, endostio y médula | `corte` |
| `capas` (0,58) | Las capas del corte se separan | `capas` |
| `osteonas` (0,74) | Las capas se juntan y las osteonas de la cortical se destacan | `corte` |
| `osteona` (0,88) | Una osteona ampliada y cortada en escalera; el corte queda pequeño en una esquina | `osteona` |
| `osteocitos` (1) | Los osteocitos crecen y se ven los canalículos | `detalle` |

Se completa al visitar los siete pasos. La lista de pasos y el texto de cada uno funcionan sin WebGL y bastan
para completar la actividad.

## 2. Diseño

- **El estado es una función pura de `t`** (`scenes/procedural/hueso/estado.ts`), igual que en la BMU: pistas de
  fotogramas clave con tramos suavizados. Adelantar y atrasar es exacto; nada se acumula entre fotogramas.
- **Tres "escalas" con su propio objeto** (`mallas.ts`): `HuesoLargo`, `CorteTransversal` y `OsteonaAmpliada`. Cada
  una recibe el estado y solo se mueve, se escala o se aclara; no calcula biología. Las que no se ven no se
  dibujan (`visible = false`).
- **Piezas repetidas y sus posiciones** (`disposicion.ts`, puro y determinista): las 16 osteonas del corte, las 340
  trabéculas de las epífisis, las láminas de la osteona ampliada, las 16 lagunas de osteocitos y el perfil del
  periostio. Una prueba comprueba que las osteonas del corte (con su ovalización y su línea de cemento) no tocan el
  endostio ni la lámina externa.
- **Corte "en escalera" de la osteona:** cada lámina pierde un sector distinto, de manera que las interiores
  quedan a la vista como peldaños. Sobre cada peldaño van las fibras de colágeno (rayas oblicuas que alternan
  de sentido de una lámina a la siguiente) y, en los de fuera, los osteocitos en sus lagunas.
- **La cámara es la de la BMU** (`bmu/CamaraBmu.vue`), con una prop `resolverVista` para usar las vistas de esta
  escena (`hueso/vistas.ts`). Un dedo gira, dos acercan, sin paneo.
- **Colores:** los que se dibujan son los de `NATURAL` en `hueso/paleta.ts` (la paleta unificada entre escenas, ver
  «Revisión de diseño (2026-10-17)»); `HEX` conserva los de los dibujos del módulo 1, que importan otras escenas.

## 3. Límites y honestidad

- Las formas son **esquemáticas**: el hueso largo es un cilindro con dos bulbos, no un fémur; las trabéculas son
  barras al azar sesgadas hacia la carga, no un patrón real; los tamaños no guardan escala entre pantallas.
- Los canalículos son líneas de un píxel: se ven poco en pantallas de baja densidad.
- **Sin revisión del docente** del texto de los pasos ni de la forma de las estructuras.
- **Sin medir en un teléfono real.** Presupuesto comprobado por pruebas, contando las instancias: menos de 16 500
  triángulos en el hueso, 13 500 en el corte y 9 500 en la osteona; en el peor instante de la escena (el fundido del
  hueso al corte), menos de 40 000 triángulos y 40 llamadas de dibujo también contando la doble pasada de las
  transparencias, y menos de 40 llamadas en el pase de sombras. La escena pesa 15 kB (6,3 kB gzip); three va en el
  chunk `webgl` compartido con la BMU y la mandíbula.
- Verificada en Chrome con WebGL, con emulación táctil de 390 × 844 px (`t` = 0; 0,2; 0,42; 0,58; 0,74; 0,88 y 1)
  y a 1280 × 800 px (`t` = 0,2). No se recorrió la línea de vuelta completa ni se probó el pellizco.

## 4. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado puro, hitos, constantes | `apps/web/src/scenes/procedural/hueso/estado.ts` |
| Disposición de piezas repetidas | `.../hueso/disposicion.ts` |
| Formas (anillos, cáscaras) | `.../hueso/geometria.ts` |
| Las tres escalas | `.../hueso/mallas.ts` |
| Vistas de cámara | `.../hueso/vistas.ts` |
| Escena y contenido dentro del lienzo | `.../hueso/EscenaHueso.vue`, `ContenidoHueso.vue` |
| Registro y catálogo | `scenes/procedural/registro.ts`, `content/nodos3d.ts` |
| Contenido | `modules/m1_conociendo_el_hueso/content.json`, actividad `m1_4_viaje_3d` |

## Realismo (2026-10-14)

Primera escena de la mejora de realismo «paso por paso». Cambios:

- **Materiales físicos por tejido** (`scenes/procedural/realismo.ts`): hueso mate con relieve de poros, hueso esponjoso
  granuloso, cartílago liso y húmedo, médula grasa con brillo suave, periostio y endostio fibrosos con brillo de
  terciopelo, vasos lisos y húmedos, lagunas oscuras. El relieve es ruido fractal calculado por código (texturas de
  256 × 256 que se repiten sin costura): no se descarga ninguna imagen.
- **Luz de entorno** (`EntornoRealista.vue`) y luces más suaves, con un contraluz frío que perfila los bordes.
- **Paleta natural** propia de esta escena (`NATURAL` en `hueso/paleta.ts`): el hueso fresco es marfil. Se mantienen
  los colores que nombran los textos: médula amarilla y conducto de Havers rojo.
- **Forma**: las metáfisis ensanchan la diáfisis hacia cada epífisis (antes había un escalón entre un cilindro y una
  esfera); 340 trabéculas (antes 240) de grosor variable, abiertas por los extremos. (Se dijo que así cabían en
  12 000 triángulos en el peor instante: la prueba no contaba las instancias; las cifras medidas están en la
  revisión de 2026-10-17.)

No se ha visto en pantalla (el usuario prueba en local). Si se aprueba, la misma base se aplica a la siguiente escena.

## Revisión de diseño (2026-10-17)

Correcciones de una revisión de render, rendimiento, fidelidad y realismo (ids de `.verify/agentes/hallazgos/`):

- **Grano del relieve a escala (realismo-04).** `anillo`, `tronco` y `cascaraElipsoide` (`geometria.ts`) traen ahora
  las UV en unidades de escena: en las superficies de revolución, U = θ · radio (la longitud del arco desde el
  frente) y V la longitud a lo largo del eje o del meridiano; en las tapas, (x, z); en las caras de corte, (radio,
  altura). La repetición del relieve se fija por unidad: cortical y cartílago 1,4; médula 1,2; periostio y endostio
  0,6; láminas de la osteona 1,4; en el corte, que se dibuja 2,4 veces mayor, esas mismas por 2,4 (el grano mide lo
  mismo en la escena y queda más fino que las osteonas). Antes cada pieza estiraba la textura a su tamaño: la
  metáfisis iba a 12,5 repeticiones por unidad a lo largo frente a 1,43 de la diáfisis (banda lisa) y el canto del
  corte a 13,9 frente a 0,4. Con θ absoluto, el cuerpo y la cuña siguen el mismo dibujo en su unión de delante, y la
  metáfisis empalma con la diáfisis sin costura. Filtrado anisótropo 4 en el relieve.
- **Periostio que cubre todo el hueso (realismo-16).** Era un cilindro de radio 1,07 que se metía dentro de la
  metáfisis y dejaba sin cubrir metáfisis y epífisis. Ahora es un torno que sigue la silueta del hueso a 0,02
  (`perfilPeriostio`) de un borde del cartílago articular (|y| ≈ 4,78) al otro. Además, velo de Fresnel (0,7 de
  frente, 1,6 de canto; realismo-11): con opacidad constante parecía una manga de vidrio. Se deja de dibujar cuando
  su opacidad llega a 0 (t ≥ 0,17).
- **Osteonas del corte (realismo-17).** Cada una algo ovalada (±8 %) y girada, con su **línea de cemento** (un anillo
  fino ocre que la separa del hueso intersticial); los niveles se reducen para que el borde no pase de 0,099, como
  antes. Los niveles se tocan: sus paredes comunes (ocultas dentro de la osteona) ya no se dibujan.
- **Médula en las epífisis (fidelidad-15, comprobado).** Las epífisis mostraban las trabéculas en el vacío, como un
  hueso macerado. Una cáscara de médula amarilla por dentro de la cortical (en el adulto la médula de las epífisis
  es grasa) queda detrás de las trabéculas al abrir la cuña; va en la misma malla que la de la diáfisis (no cuesta
  otra llamada). El comentario de `HEX.medulaRoja` decía «de las epífisis»: en el adulto la roja está en las
  metáfisis proximales del fémur y del húmero.
- **Una sola pasada donde no se nota (rendimiento-01) y menos llamadas.** `forceSinglePass` en las trabéculas, los
  niveles de las osteonas del corte, las lagunas y los osteocitos (piezas pequeñas repetidas); los vasos (esferas y
  cilindros cerrados) son de una cara. Las cáscaras grandes que se desvanecen siguen con dos pasadas (con una, el
  orden interno daría parches). Las dos epífisis, los dos cartílagos y las dos metáfisis de cada parte (cuerpo y
  cuña) van en una geometría cada una, y los casquetes de cartílago tienen los paralelos de la cáscara (7 en vez de
  22). Nombres de objetos sin cambios.
- **Opacidad una vez por fotograma (rendimiento-08).** El periostio estaba en la lista de materiales del hueso y
  recibía la opacidad dos veces (cruzando el umbral de transparencia dos veces en cada llamada).
- **Vasos sin emisivo (realismo-03).** Capilar, Volkmann y vaso medular: la sangre no emite luz y, con la luz de la
  base, el emisivo los iluminaba por dentro. El resalte de las osteonas se conserva.
- **Paleta unificada** (`NATURAL`): cortical y láminas claras `#eadfc8`, láminas oscuras `#d8c6a3`, intersticial y
  trabéculas `#e6d8bc`, línea de cemento `#8c6b45` (las de la BMU y la matriz); médula amarilla `#e8c561` y roja
  `#9e3f33`; cartílago `#d9e8ef`; vaso `#c9473e`; osteocito `#8a9ad2` (azul; antes era el violeta de los
  osteoblastos, fidelidad-06); periostio blanco rosado `#e6cfc4` (antes tostado `#d8ae8c`, que se leía como cuero;
  fidelidad-17, comprobado). El conducto de Havers sigue rojo y la médula amarilla, como dicen los textos.
- **Pruebas (rendimiento-09).** El presupuesto cuenta las instancias (antes no: el hueso salía en 11 362 triángulos
  y dibujaba 15 418), la doble pasada de las transparencias de doble cara y el pase de sombras, en el peor instante
  de la escena; pruebas nuevas de las UV en unidades, del periostio, de las osteonas y de que cada material cambie de
  versión como mucho una vez por fotograma. Higiene: `ponerLagunas` sin objetos nuevos por fotograma
  (rendimiento-15); alias local `COLOR` en `mallas.ts` y sin la constante `R_OSTEONA_CORTE`, que nadie usaba
  (rendimiento-16).

Presupuesto en el peor instante (el fundido del hueso al corte, t ≈ 0,33 a 0,41): antes 27 846 triángulos y 29
llamadas (55 692 y 58 con la doble pasada); ahora 24 080 y 23 (36 788 y 38). Pase de sombras: como mucho 25
llamadas (con la osteona y el corte a la vista). Por pieza, contando las instancias: hueso largo 15 418 → 16 420
(periostio nuevo de 2 208 y médula de las epífisis, menos los casquetes más ligeros), corte 12 428 → 9 868, osteona
8 760.

Cambio de texto propuesto, sin aplicar (fidelidad-15: el hueso mide 5,3 diámetros de largo; un fémur, unos 15):
`paso_hueso_entero`, «Un hueso largo, como el fémur:» → «Un hueso largo, como el fémur (aquí, acortado):».

No se ha visto en pantalla. Conviene mirar:
el periostio con el velo sobre la metáfisis y la epífisis; el grano del relieve en la metáfisis y las caras de corte;
la médula de las epífisis detrás de las trabéculas con la cuña abierta; y las osteonas ovaladas con su línea de
cemento.
