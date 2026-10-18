# Escena 3D con línea de tiempo: la BMU (prototipo) y cómo añadir otra

Nota de diseño de `bmu_remodelado`, la primera escena **procedural** del OVA: una escena 3D hecha por código
(sin modelos de células) que muestra el ciclo de remodelado de una unidad multicelular básica (BMU) a lo largo
del tiempo. Es un prototipo para juzgar en pantalla si este formato (observar procesos en tiempo real y
rotar el objeto) merece más escenas. Está en el módulo 5 como actividad **opcional** `m5_bmu_3d_tiempo`
(sección 5.1, 40 puntos). Cómo se escribe el contenido: `docs/content-schema.md`, secciones 7.6 y 9.

## 1. Qué hace el estudiante

- **Reproducir y pausar**, **fase anterior y siguiente**, **deslizador continuo** de tiempo, **velocidad**
  (0,5×, 1×, 2×) y **reiniciar**. Nada arranca solo, tampoco con `prefers-reduced-motion`.
- **Girar** (un dedo o el ratón) y **acercar** (dos dedos, la rueda o los botones); sin paneo, que en móvil
  hace perder el modelo. Cuatro vistas con nombre: `general`, `perfil`, `extremo` y `detalle`. Por defecto la
  cámara **sigue a la fase**; si el estudiante la mueve a mano, deja de seguirla hasta que pide "Vista de la
  fase".
- Junto a la escena: el **texto de la fase en curso**, sincronizado con `t`. La lista de fases (botones) de
  la actividad lleva la línea hasta cada hito.
- **Completar**: visitar los pasos `requeridos`. Visitar es **detener la línea en un hito** (a menos del 1,5 %
  de la línea) o **pasar por él** reproduciendo o arrastrando. Un salto con los botones o la lista aterriza en
  el hito y solo visita ese.

## 2. Diseño: el estado es una función pura del tiempo

`estadoBmu(t)` (`scenes/procedural/bmu/estado.ts`) devuelve todo lo que la escena necesita en el instante
`t` de 0 a 1 y **no lee ni guarda nada más**: longitud y radio del túnel, posición y número de osteoclastos,
grosor del osteoide, fracción mineralizada, número de osteocitos, etc. Cada magnitud es una **pista de
fotogramas clave** (`interpolacion.ts`, `evaluarPista`) con tramos suavizados y monótonos, así que:

- adelantar y atrasar es **exacto y reversible** (la misma `t` da siempre el mismo estado; nada se acumula
  entre fotogramas, ni siquiera la "vibración" de los osteoclastos, que sale de `t`);
- no hace falta simular nada: para saltar a cualquier instante basta con calcular su estado.

Las **fases** tienen un hito cada una (`HITOS_BMU`: 0; 0,14; 0,32; 0,5; 0,66; 0,84; 1) y cada fase abarca
hasta el punto medio con el hito vecino (`LIMITES_FASES_BMU`). La interfaz usa la misma regla para elegir el
texto (`pasoDeTiempo` en `lineaTiempo.ts`), de modo que **el contenido debe usar como `t` de sus pasos los
hitos de la escena**; una prueba de M5 lo comprueba. La escala de tiempo es pedagógica, no proporcional (la
formación dura meses y la resorción, semanas).

Modelo geométrico (1 unidad = 100 µm): un cilindro de hueso cortical (radio 2) con un conducto de Havers de
0,3 y su capilar. La BMU **entra por el extremo derecho** y avanza a la izquierda, como en
`m5_bmu_cortical_longitudinal.svg`. Se le quita una cuña de 90° para ver el interior.

| Fase | Qué se ve |
|---|---|
| Quiescencia | Osteona en reposo: láminas concéntricas en la tapa, capilar y células de revestimiento aplanadas |
| Activación | El revestimiento se retrae; llegan precursores desde el capilar y se fusionan |
| Resorción | Cuatro osteoclastos multinucleados (núcleos y borde festoneado) en el flanco del **cono de corte**; el túnel de 200 µm crece con la pared festoneada |
| Inversión | Los osteoclastos se encogen (apoptosis); células mononucleares y la **línea de cemento** oscura |
| Formación | Los osteoblastos depositan osteoide en seis capas concéntricas, de fuera hacia dentro; el relleno sigue a la BMU (**cono de cierre**) y la luz se estrecha |
| Mineralización | El osteoide se mineraliza (primero las capas externas) y aparecen doce osteocitos con canalículos, vistos en las caras de corte |
| Reposo | Osteona nueva: conducto de Havers estrechado, mineralizada, con cemento y osteocitos; vuelve el revestimiento |

## 3. Rendimiento y recursos (móvil primero)

- Una sola geometría con color por vértice para todo el hueso (13 120 triángulos) y **InstancedMesh** para
  las células (una llamada, 236 instancias de esfera de 168 triángulos), los discos de los osteocitos y sus
  canalículos. Total: **5 llamadas de dibujo** y 54 576 triángulos (tope de diseño: 60 000), más otras 5
  llamadas con los mismos triángulos en el pase de sombras. Ningún material es transparente: no hay doble
  pasada. Materiales reutilizados; el relieve es una textura de 256 × 256 calculada por código y compartida.
- DPR limitado a [1, 2] y `render-mode="on-demand"`: solo se dibuja cuando cambia `t` o la cámara.
- Las geometrías se **recalculan en su sitio** (mismos arreglos, sin reservar memoria por fotograma) y se
  liberan al desmontar (`liberar()`); TresJS libera el renderizador.
- **Carga perezosa**: el registro (`registro.ts`) no importa three; la escena entra por `import()`.
  three y TresJS van en el chunk `webgl` compartido con la mandíbula (896 kB, 241 kB gzip); el componente de
  la escena pesa 21 kB (8,6 kB gzip) y la actividad, 27 kB. Nada de esto va en el chunk inicial.

## 4. Accesibilidad

- El texto de la fase se ve siempre; la región `aria-live="polite"` solo anuncia el **cambio de fase**
  (título corto) y con retardo de 450 ms, no en cada fotograma.
- El deslizador es un `<input type="range">` con etiqueta y `aria-valuetext` ("Fase 3 de 7: Resorción. 32 %"):
  operable con flechas, Inicio, Fin, Re Pág y Av Pág. Botones de 44 px con nombre accesible.
- **Sin WebGL** (o si la escena falla): el texto de la fase, el deslizador, los botones y la lista de
  fases siguen funcionando y bastan para completar la actividad (regla R1). La actividad avisa de ello.
- Con `prefers-reduced-motion`: sin inercia en la cámara ni transiciones, y nunca hay reproducción automática.

## 5. Estructura de archivos

```
apps/web/src/scenes/procedural/
  interpolacion.ts      pistas de fotogramas clave, suavizados, generador determinista
  lineaTiempo.ts        (puro) qué paso manda en t, paso anterior/siguiente, qué se visita
  useLineaTiempo.ts     t, reproducción con el reloj, saltos y visitas (reloj inyectable)
  registro.ts           registro de escenas: definición, hitos, vistas, carga perezosa
  bmu/
    estado.ts           estadoBmu(t) y el perfil del túnel (puros, con pruebas)
    vistas.ts           vistas de cámara con nombre y transiciones (puro)
    paleta.ts sector.ts constantes de color y de la cuña
    malla.ts            el hueso: una geometría con color por vértice
    celulas.ts          todas las células en un InstancedMesh
    osteocitos.ts       los osteocitos como cortes sobre las caras de la cuña
    ContenidoBmu.vue    une las mallas y las actualiza al cambiar `t`
    CamaraBmu.vue       OrbitControls + transiciones entre vistas
    EscenaBmu.vue       lienzo, luz común (EntornoRealista), estados (sin WebGL, error, contexto perdido)
apps/web/src/activities/exploracion-3d/
  PanelLineaTiempo.vue  escena + texto de la fase + controles (sin three)
  ActividadExploracion3d.vue  variante `procedural` (los pasos son las "partes")
  logica.ts             pasos de la línea de tiempo → nodos
```

## 6. Cómo añadir otra escena procedural

1. **Estado puro.** Crea `scenes/procedural/<nombre>/estado.ts` con `estado<Nombre>(t: number)`: función
   pura, sin three ni Vue, que acota `t`, define sus fases y sus hitos (`HITOS_*`) y calcula cada magnitud
   con pistas de fotogramas clave. Escribe sus pruebas: monotonía y continuidad donde corresponda, valores
   en cada hito, t = 0 y t = 1, reversibilidad y ausencia de NaN (mira `bmu/estado.test.ts`).
2. **Geometría.** Una geometría por grupo de piezas con color por vértice, `InstancedMesh` para lo que se
   repita, materiales reutilizados, arreglos preasignados que se rellenan en su sitio y un `liberar()`.
   Presupuesto: menos de ~60 000 triángulos y pocas llamadas de dibujo. Prueba en memoria (no hace falta
   WebGL): sin NaN, triángulos e instancias dentro del presupuesto (`bmu/geometria.test.ts`).
3. **Componente de escena** `<Nombre>/Escena<Nombre>.vue`, con el contrato común de `registro.ts`:
   props `PropsEscenaProcedural` (`t`, `vista`, `ordenVista`, `ordenZoom`, `alt`, `reducirMovimiento`) y
   eventos `estado` y `camaraLibre`. Copia `EscenaBmu.vue`: detecta WebGL 2, monta el `TresCanvas` con
   DPR [1, 2] y `render-mode="on-demand"`, y usa `CamaraBmu.vue` como plantilla de cámara (o generalízala).
   No sabe nada de fases ni de puntajes.
4. **Regístrala.** En `content/nodos3d.ts` añade el nombre a `ESCENAS_PROCEDURALES` y sus vistas a
   `VISTAS_ESCENA_PROCEDURAL`; en `scenes/procedural/registro.ts` añade su definición (`duracionSeg`,
   `vistas`, `hitos`, `estado`, `cargar: () => import('./<nombre>/Escena<Nombre>.vue')`). La prueba
   `registro.test.ts` comprueba que ambas listas coinciden.
5. **Contenido.** Una actividad `exploracion-3d` con `modelo: "procedural"`, `escena: "<nombre>"` y una
   `linea_de_tiempo` cuyos `t` sean los hitos de la escena (docs/content-schema.md, 7.6). Añade su prueba de
   cobertura como en `m5_renovando_el_hueso/contenido.test.ts`.
6. **Documenta** las vistas y los hitos en `docs/content-schema.md`, sección 9, y una nota como esta.

Regla del proyecto: el 3D es solo para la mandíbula y las células. Las imágenes multicapa, el arrastre
molecular y la relación de columnas siguen en SVG/2D.

## 7. Verificación

Ver `TODO.md`, fila "Escenas 3D con línea de tiempo (prototipo BMU)": pruebas, capturas en `.verify/bmu3d/`
(escritorio 1280x800 y móvil 390x844), consola, peso de los chunks y tiempo de fotograma medido.

## Realismo (2026-10-14)

Mejora de realismo con la base compartida (`scenes/procedural/realismo.ts` y `EntornoRealista.vue`), como en las
escenas del hueso y de la matriz:

- **Paleta natural** propia (`NATURAL` y `RGB_NATURAL` en `bmu/paleta.ts`; los valores vigentes son los de ese
  archivo, ajustados el 2026-10-17 a la paleta unificada: ver la revisión de diseño, abajo). `HEX` y `RGB` no
  cambian: casi todas las demás escenas construyen sus paletas con `HEX`. El hueso fresco es marfil (no el rosa de
  la tinción H&E), con las láminas viejas en dos tonos de marfil, como en la escena del hueso; el osteoide, una
  franja pálida algo rosada (colágeno sin mineralizar) que al mineralizarse toma el marfil claro del hueso nuevo; la
  línea de cemento, ocre oscuro; la pared reabsorbida, un marfil tostado más oscuro que el hueso intacto; las
  lagunas de los osteocitos, oscuras (son huecos), y los canalículos, pardos. Las células conservan sus colores
  didácticos, algo más sobrios: osteoclastos lila, osteoblastos violeta, precursores y células de inversión lila
  grisáceo. El capilar sigue rojo. Los textos de los pasos no nombran colores; los que citan los apartados
  anteriores son los de antes.
- **Materiales por pieza**: el hueso (una malla con color por vértice), tejido `hueso` (mate, con relieve de poros);
  las células (una malla instanciada) y los discos de los osteocitos, `celula` (blanda y húmeda, con un brillo
  aterciopelado lila grisáceo, porque el color de cada célula va por instancia), con un emisivo violeta tenue
  (0,15 desde el 2026-10-17); los canalículos, `cavidad`; el capilar, `vaso` (sin emisivo desde el 2026-10-17).
- **Coordenadas UV** en la malla del hueso, que no tenía: en unidades de escena, planas en las caras de corte (x,
  radio) y en las tapas (y, z) y cilíndricas en la superficie exterior y en la luz del conducto (con el radio del
  túnel fijo, para que la textura no resbale cuando la luz se estrecha). El material repite el relieve una vez por
  unidad (100 µm): con la repetición del tejido, pensada para UV de 0 a 1, el grano no se vería.
- **Forma**: células de 12 × 8 (antes 9 × 6: se veían las facetas), discos de los osteocitos de 24 lados (antes 16) y
  capilar de 20 (antes 14).
- **Luz**: luz de entorno y sombras suaves (`EntornoRealista.vue`); luces más suaves y un contraluz frío. Desde el
  2026-10-15 la escena no lleva luces propias: las pone el esquema común de `iluminacion.ts`.
- **Presupuesto**: 54 576 triángulos (antes 35 856) y las mismas 5 llamadas de dibujo. La prueba sigue exigiendo
  menos de 60 000 triángulos. Sin cambios de posiciones, tiempos, hitos ni vistas.

No se ha visto en pantalla (el usuario prueba en local).

## Revisión de diseño (2026-10-17)

Correcciones de la revisión de diseño y realismo (render WebGL, rendimiento, fidelidad y realismo visual), con el
hallazgo de cada una:

- **Células iluminadas al revés (render-03).** El marco de cada célula de la pared y de cada osteoclasto (cuerpo,
  núcleos y lóbulos) era zurdo: t × f = −n. three decide qué cara es la delantera por objeto (el determinante de su
  matriz de mundo), no por instancia, así que esas instancias se dibujaban con la cara trasera y, con material de
  doble cara, la normal invertida: el lado que mira a la luz principal quedaba apagado y el contraluz iluminaba la
  cara visible. Las células se leían como hoyos en la pared. Ahora f = (0, sen fi, −cos fi) y la base es directa;
  el desfase de los núcleos en f cambia de signo, así que quedan donde estaban. Lo mismo en los osteocitos de la
  cara 0 (discos y canalículos): el segundo eje cambia de signo en esa cara, con los canalículos en las mismas
  direcciones. Una prueba comprueba que todas las instancias visibles tienen determinante positivo.
- **Emisivos (realismo-03).** El violeta de las células baja de 0,55 a 0,15 (tapaba el fallo anterior y hacía que
  núcleos y células se vieran iluminados por dentro y sin volumen); el capilar ya no emite (la sangre no da luz).
- **Oclusión ambiental del túnel (realismo-06).** La luz de entorno y el hemisferio no saben que la luz del
  conducto está dentro de un cilindro abierto solo por la ventana de 90° de la cuña: el fondo del túnel salía tan
  claro como la cara exterior. La geometría del hueso lleva un atributo `ao` (`oclusionPorVertice` de
  `realismo.ts`): 1 en las piezas exteriores y, en la luz, de ~0,75 frente a la ventana a ~0,4 junto a las caras
  de corte, de vuelta a 1 hacia los extremos (`oclusionLuz` en `malla.ts`). Solo apaga la luz indirecta: la directa
  ya la ocultan las sombras. Es estático y se escribe una vez. Las células llevan el mismo atributo, por instancia
  (un `InstancedBufferAttribute` en la esfera), con el 80 % de la oclusión de la pared en que se apoyan (asoman
  hacia el eje); los precursores, que salen del eje, van de la oclusión del centro del túnel a la de su destino. La
  verificación proponía multiplicar el color de las células, pero eso apaga también la luz directa, que es lo que
  la propia verificación descarta para la pared.
- **Esfera envolvente NaN (render-13).** Las instancias ocultas tenían la matriz entera a cero; con m[15] = 0 three
  divide entre cero al calcular la esfera envolvente de la malla. Ahora tienen escala cero y m[15] = 1.
- **Paleta unificada entre escenas (fidelidad-06).** En `NATURAL`: osteoblasto `#8d86c6` (violeta) y osteocito
  `#8a9ad2` (azul; antes `#8e7fc4`, casi el tono del osteoblasto: los osteocitos atrapados no se distinguían de los
  osteoblastos), hueso intersticial `#e6d8bc` (dentro del marfil del hueso maduro), células de revestimiento
  `#c6c2e2` (la versión pálida del osteoblasto, porque son osteoblastos en reposo; antes rosa grisáceo `#d9c1c9`) y
  capilar `#c9473e` (el vaso de la paleta unificada). Siguen igual: hueso `#eadfc8`, hueso nuevo `#f2e9d8`,
  osteoide `#eed4c9`, osteoclasto `#b893cf`, núcleos `#4b408f` y precursores `#cbb7da`. Los textos de la actividad
  no nombran colores: no hay cambios de texto.
- **Pruebas que cuentan lo que se dibuja (rendimiento-09).** Los triángulos de discos y canalículos salen de su
  geometría (la prueba seguía con 16 por disco, que ya tiene 24); la prueba comprueba que ningún material es
  transparente (sin doble pasada). Nuevas pruebas: determinantes, esfera envolvente finita y oclusión.
- **Higiene (rendimiento-16).** Fuera `puntoCilindrico` (`sector.ts`, sin uso); el alias engañoso
  `NATURAL as HEX` pasa a `NATURAL as COLOR` (o `NATURAL`, en `celulas.ts`, que ya tiene un `COLOR` propio).

Presupuesto: sin cambios. Antes y después, 54 576 triángulos y 5 llamadas de dibujo, más 5 llamadas (los mismos
triángulos) en el pase de sombras; ningún material transparente, así que no hay doble pasada. El atributo `ao` no
añade triángulos ni llamadas.

No se ha visto en pantalla (la usuaria prueba en su equipo).
