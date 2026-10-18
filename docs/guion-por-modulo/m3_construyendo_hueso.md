# Modulo 3: Construyendo hueso

> Estado: BORRADOR redactado por IA, pendiente de validacion del docente.

> Convenciones de este guion. Los encabezados estructurales, las claves YAML y las etiquetas de aviso (Clinico, Dato, Atencion, Recuerda) van sin tilde para que se transcriban sin ambiguedad; la interfaz las mostrara con tilde. Las cifras aproximadas o que varian entre fuentes llevan la etiqueta [verificar] y se explican en la seccion 12; esa etiqueta se elimina del texto del estudiante cuando el docente valide la cifra.
>
> Modos de multicapa: en `explorar` el estudiante abre cada capa y lee su descripcion; en `identificar` la aplicacion muestra el nombre de una capa y el estudiante debe tocarla en la imagen (al acertar se muestra su descripcion). En quiz, `verdadero_falso` no lleva opciones y su `correcta` es booleana; en `ordenar_pasos` los pasos se listan en desorden y `correcta` da los ids en el orden correcto. En arrastre-molecular la escena debe poder reiniciarse. Toda actividad ofrece una alternativa sin arrastre y sin hover (tocar y luego tocar; Tab y Enter). La ilustración de cada sección (tabla de la sección 5, columna «Se usa en») se muestra junto al texto que la explica: al costado en pantallas anchas y intercalada antes del bloque correspondiente en móvil. La sección 3.8 no lleva imagen nueva.

## Ficha

| Campo | Valor |
|---|---|
| Modulo | 3 de 6 |
| Foco | Mecanotransducción y formación ósea |
| Densidad | Alta |
| Duración estimada | 60 a 90 minutos [verificar] (las actividades opcionales suman tiempo) |
| Número de secciones | 8 (la última es la evaluación final) |
| Nivel | Pregrado y posgrado de ciencias de la salud, con enfoque en el hueso mandibular |
| Logro que se otorga al completarlo | Constructor (id `constructor`) |
| Criterio de logro propuesto | Completar las actividades obligatorias y obtener al menos 70 % en la evaluación final (propuesta, a validar con el docente) |
| Prerrequisitos | Módulos 1 y 2 (generalidades del hueso y linaje de las células óseas). Prepara el módulo 4 (mineralización) y el módulo 5 (remodelado) |

## Objetivos de aprendizaje

1. Comparar la osificación intramembranosa y la endocondral, e identificar cuál origina cada región de la mandíbula (cuerpo y rama frente a cóndilo).
2. Ordenar los eventos desde la condensación mesenquimatosa hasta el hueso laminar y distinguir el hueso inmaduro del hueso laminar.
3. Explicar cómo BMP, RUNX2 y osterix dirigen la diferenciación del osteoblasto.
4. Describir cómo el osteocito percibe la carga: flujo de líquido en el sistema lacuno-canalicular, sensores (integrinas, Piezo1, cilio primario, conexina 43) y mensajeros (Ca²⁺, PGE2, óxido nítrico).
5. Relacionar la vía Wnt/β-catenina, LRP5/6 y la esclerostina (SOST) con la carga, el desuso y la PTH intermitente.
6. Aplicar la teoría del mecanostato de Frost para predecir la respuesta del hueso mandibular a la carga masticatoria, al movimiento ortodóntico y a la disminución de carga por desuso.

## Conexion con el hueso mandibular

La mandíbula es el mejor caso de estudio del módulo porque reúne todo lo que se explica en él.

- **Formación:** el cuerpo y la rama se forman por osificación intramembranosa junto al cartílago de Meckel, y el cóndilo por osificación endocondral a partir de un cartílago secundario. Es un ejemplo especialmente claro de las dos rutas y de un cartílago guía en un mismo hueso.
- **Sensor y efector:** el proceso alveolar y el cuerpo reciben la carga de la masticación, que se transmite a través de los dientes y del ligamento periodontal. Los osteocitos de esa región detectan la deformación y ajustan la formación de hueso mediante la vía Wnt y la esclerostina.
- **Adaptación:** la mandíbula se ajusta a su uso. Con carga suficiente mantiene su masa; con desuso (pérdida dentaria, dieta muy blanda, inmovilización) la pierde; con fuerzas ortodónticas se remodela de forma deliberada; con distracción osteogénica se induce hueso nuevo por tensión.
- **Genética y terapia:** las mutaciones en SOST producen alteraciones mandibulares visibles (el sobrecrecimiento mandibular de la esclerosteosis) y las de LRP5 alteran la masa ósea de todo el esqueleto; los fármacos que actúan sobre esta vía (PTH intermitente, anticuerpo anti-esclerostina) se usan en el tratamiento de la osteoporosis.

## Ilustraciones y modelos requeridos

Las imágenes se producen como SVG multicapa: cada capa es un grupo `<g id="...">` con el id de la tabla y debe poder resaltarse y recibir un toque. La mandíbula es un modelo 3D de una sola malla: las zonas se marcan con hotspots con nombre, no con piezas separadas. Desde 2026-10-18, las exploraciones de 3.3 y 3.4 usan modelos 3D construidos por código (`osteoide` y `red_lacuno_canalicular`), cuyas regiones son piezas con nombre; el resto de las células se dibujan en SVG.

| id de archivo | Qué muestra | Se usa en | Capas o zonas (`id` = etiqueta) |
|---|---|---|---|
| `m3_rutas_formacion_osea` | Dos paneles lado a lado: A, osificación intramembranosa; B, osificación endocondral en un hueso largo. | Sección 3.1 | `im_condensacion_mesenquimatosa` = Condensación mesenquimatosa; `im_osteoblastos` = Osteoblastos; `im_osteoide` = Osteoide; `im_trabeculas_hueso_inmaduro` = Trabéculas de hueso inmaduro; `im_periostio` = Periostio; `ec_modelo_cartilaginoso` = Modelo de cartílago hialino; `ec_condrocitos_hipertroficos` = Condrocitos hipertróficos; `ec_collar_oseo` = Collar óseo perióstico; `ec_invasion_vascular` = Invasión vascular; `ec_centro_osificacion_primario` = Centro primario de osificación; `ec_placa_crecimiento` = Placa de crecimiento |
| `m3_mandibula_desarrollo` | Vista lateral esquemática de una hemimandíbula fetal (aproximadamente entre las semanas 10 y 14 de desarrollo, contadas desde la fecundación [verificar]): hueso intramembranoso lateral al cartílago de Meckel y cartílagos secundarios. | Sección 3.2 | `cartilago_de_meckel` = Cartílago de Meckel; `hueso_intramembranoso_lateral` = Hueso intramembranoso (cuerpo y rama); `sitio_primer_osificacion` = Primer centro de osificación; `nervio_alveolar_inferior` = Nervio alveolar inferior; `germen_dental` = Germen dental; `cartilago_condilar` = Cartílago condilar (secundario); `cartilago_coronoideo` = Cartílago coronoideo (secundario); `cartilago_sinfisario` = Cartílago sinfisario (secundario); `extremo_posterior_meckel` = Extremo posterior de Meckel (martillo y yunque) |
| `osteoide` (modelo 3D por código; hasta 2026-10-18, el SVG `m3_osteoide_hueso_inmaduro`) | Corte de una trabécula en formación: osteoblastos, osteoide, frente de mineralización, hueso inmaduro con osteocitos y, al lado, hueso laminar ya remodelado. | Sección 3.3 | `osteoblastos_activos` = Osteoblastos activos; `osteoide` = Osteoide; `frente_mineralizacion` = Frente de mineralización; `hueso_inmaduro` = Hueso inmaduro (fibrilar); `osteocito_incluido` = Osteocito recién incluido; `capilar` = Capilar sanguíneo; `linea_cementante` = Línea cementante; `hueso_laminar` = Hueso laminar |
| `m3_bmp_runx2_osterix` | Escena para el arrastre: célula osteoprogenitora con receptor de BMP en la membrana, Smad en el citoplasma y RUNX2 y osterix en el núcleo. | Sección 3.3 (arrastre) | `celula_progenitora` = Célula osteoprogenitora; `receptor_bmp` = Receptor de BMP (tipo I y tipo II); `smad_1_5_8` = Smad1/5/8; `smad4` = Smad4; `nucleo_celular` = Núcleo; `runx2` = RUNX2; `osterix_sp7` = Osterix (SP7); `genes_osteoblasto` = Genes del osteoblasto |
| `m3_osteocito_red_lacuno_canalicular` (SVG de la animación) y `red_lacuno_canalicular` (modelo 3D por código de la exploración desde 2026-10-18, con 12 regiones: ver la actividad) | Corte de hueso cortical con un osteocito en su laguna, sus procesos en los canalículos, el espacio pericelular, los sensores y la conexión con el capilar y con las células de la superficie. | Sección 3.4 | `matriz_mineralizada` = Matriz mineralizada; `laguna_osteocitica` = Laguna osteocítica; `cuerpo_osteocito` = Cuerpo del osteocito; `procesos_dendriticos` = Procesos dendríticos; `canaliculos` = Canalículos; `espacio_pericelular` = Espacio pericelular; `fibras_de_anclaje` = Fibras de anclaje; `integrinas_puntos_union` = Integrinas en los puntos de unión; `cilio_primario` = Cilio primario; `canal_piezo1` = Canal Piezo1; `conexina_43` = Conexina 43 (uniones y hemicanales); `capilar_conducto_haversiano` = Capilar del conducto de Havers; `celulas_revestimiento` = Células de revestimiento y osteoblastos de superficie; `flechas_flujo_liquido` = Dirección del flujo de líquido; `mensajeros_pge2_no` = Mensajeros PGE2 y óxido nítrico |
| `m3_sensores_mecanicos` | Ampliación esquemática (fuera de escala) de la membrana de un proceso dendrítico con sus sensores y mensajeros, más un recuadro aparte con el cuerpo del osteocito en su laguna, donde se dibuja el cilio primario. | Sección 3.5 | `membrana_proceso` = Membrana del proceso dendrítico; `matriz_pericelular_fibras` = Matriz pericelular y fibras de anclaje; `integrinas` = Integrinas; `canal_piezo1` = Canal Piezo1; `cilio_primario` = Cilio primario; `hemicanal_cx43` = Hemicanal de conexina 43; `calcio_intracelular` = Ca²⁺ intracelular; `citoesqueleto_actina` = Citoesqueleto de actina; `pge2` = Prostaglandina E2 (PGE2); `oxido_nitrico` = Óxido nítrico (NO) |
| `m3_via_wnt_esclerostina` | Escena para el arrastre: membrana de un osteoblasto de superficie con Frizzled, LRP5/6 y receptor de PTH, complejo de destrucción, β-catenina y núcleo; a un lado, un osteocito que secreta esclerostina y que también lleva PTH1R. | Sección 3.6 (arrastre) | `osteoblasto_membrana` = Membrana del osteoblasto; `frizzled` = Frizzled; `lrp5_6` = LRP5/6; `pth1r` = Receptor de PTH (PTH1R); `pth1r_osteocito` = PTH1R del osteocito; `complejo_destruccion` = Complejo de destrucción (Axin, APC, GSK3β); `beta_catenina` = β-catenina; `nucleo_tcf_lef` = Núcleo con TCF/LEF; `genes_diana_wnt` = Genes diana de Wnt; `osteocito_secretor` = Osteocito secretor de esclerostina; `matriz_osea_superficie` = Matriz ósea y osteoide en la superficie |
| `m3_mecanostato_ventanas` | Gráfico esquemático del mecanostato de Frost: eje horizontal con la deformación del hueso (en microdeformaciones, escala logarítmica) y bandas de respuesta. | Sección 3.7 | `ventana_desuso` = Ventana de desuso; `umbral_desuso` = Umbral de remodelado por desuso (MESr); `ventana_adaptada` = Ventana adaptada (mantenimiento); `umbral_modelado` = Umbral de modelado (MESm); `ventana_sobrecarga_leve` = Ventana de sobrecarga leve; `umbral_microdano` = Umbral de microdaño (MESp); `ventana_sobrecarga_patologica` = Ventana de sobrecarga patológica; `zona_fractura` = Zona de fractura |
| `mandibula` (modelo 3D, un solo GLB) | Mandíbula completa en una sola malla (BodyParts3D FJ6399, refinada) con hotspots con nombre sobre las zonas de mayor carga. No hay piezas separadas. | Sección 3.7 | Hotspots: `condilo` = Cóndilo (cabeza); `cuello_condilo` = Cuello del cóndilo; `apofisis_coronoides` = Apófisis coronoides; `rama` = Rama; `angulo` = Ángulo; `cuerpo_molares` = Cuerpo (región molar); `proceso_alveolar` = Proceso alveolar; `borde_basal` = Borde basal; `sinfisis` = Sínfisis mentoniana |

**Notas de precisión anatómica**

- `m3_rutas_formacion_osea`: en el panel A dibujar los osteoblastos cuboides en fila sobre una banda pálida de osteoide, y debajo la trabécula mineralizada con osteocitos incluidos; el mesénquima condensado rodea capilares. En el panel B respetar el orden de zonas de la placa de crecimiento (reserva, proliferación en columnas, hipertrofia, calcificación y osificación) y dibujar el collar óseo perióstico alrededor de la diáfisis, antes de la invasión vascular, que entra por el centro. Usar el mismo color para el osteoide y para la matriz mineralizada en los dos paneles. Esquema fuera de escala.
- `m3_mandibula_desarrollo`: vista lateral. El cartílago de Meckel discurre por la cara medial de la lámina ósea, que se forma lateral a él; usar transparencia para verlo. El hueso se forma como un canal abierto hacia arriba alrededor del nervio alveolar inferior y de los gérmenes dentales, y su primer centro de osificación se ubica donde el nervio se divide en sus ramas mentoniana e incisiva. El cartílago condilar es un casquete en el extremo posterosuperior, el coronoideo en el extremo anterosuperior de la rama y el sinfisario en la línea media anterior. El extremo posterior de Meckel apunta al oído medio. Dibujar el cartílago condilar como un cartílago independiente del de Meckel.
- `osteoide` (modelo 3D): en el hueso inmaduro mostrar fibras de colágeno en haces irregulares y osteocitos grandes, redondeados y numerosos; en el laminar, láminas paralelas con osteocitos alineados y menos numerosos. La línea cementante separa ambos como una línea irregular y basófila. Los osteoblastos son cúbicos y voluminosos, con el núcleo en el polo alejado del hueso y la zona pálida del Golgi entre el núcleo y la matriz; el capilar va en el tejido conectivo de encima, cortado a lo largo, con sus eritrocitos.
- `m3_bmp_runx2_osterix`: la secuencia se lee de la membrana al núcleo. Señales BMP en la membrana; Smad1/5/8 fosforilados unidos a Smad4 en el citoplasma; RUNX2 activado en el núcleo; osterix aparece después de RUNX2 (mostrarlo como paso siguiente, no simultáneo).
- `m3_osteocito_red_lacuno_canalicular` y `red_lacuno_canalicular`: el espacio pericelular y las fibras de anclaje están exagerados para que se vean (esquema fuera de escala; indicarlo en la imagen). Los canalículos parten del cuerpo del osteocito en todas direcciones, con mayor densidad hacia el capilar y hacia la superficie. Los procesos de osteocitos vecinos se tocan mediante uniones comunicantes en sus extremos. El cilio primario se proyecta desde el cuerpo dentro de la laguna. Las flechas de flujo deben poder invertirse para representar el ciclo de carga y descarga (en la animación; el modelo 3D muestra el sentido al cargar). En el modelo 3D, las células de revestimiento son planas, con el núcleo aplanado, y el capilar va a lo largo del conducto de Havers, abierto, con sus eritrocitos.
- `m3_sensores_mecanicos`: fuera de escala. Las fibras de anclaje cruzan el espacio pericelular entre la pared canalicular y la membrana del proceso. Piezo1 se dibuja como canal de tres aspas; el hemicanal de conexina 43 como hemicanal de seis subunidades. El cilio primario no se dibuja sobre la membrana del proceso: va en un recuadro con el cuerpo del osteocito, proyectándose dentro de la laguna.
- `m3_via_wnt_esclerostina`: Frizzled es un receptor de siete dominios transmembrana; LRP5/6 es un correceptor de un solo paso de membrana. El osteocito secretor debe quedar a un lado y por debajo del osteoblasto, dentro de la matriz, y su esclerostina se representa como partículas que viajan hacia LRP5/6. El osteocito lleva su propio PTH1R (`pth1r_osteocito`): es el mismo receptor que el del osteoblasto y la PTH puede acoplarse a cualquiera de los dos. Los estados de la escena (Wnt acoplado, esclerostina acoplada, PTH acoplada) deben poder mostrarse por separado.
- `m3_mecanostato_ventanas`: las cifras son aproximadas y varían entre fuentes; rotularlas como «valores aproximados». Eje en escala logarítmica. Mostrar los umbrales como marcas con rango, no como líneas exactas. La ventana adaptada va entre MESr y MESm y la de sobrecarga leve entre MESm y MESp.
- `mandibula` (3D): una sola malla, sin nodos separados por región. Los hotspots son posiciones con nombre; los colores de «mayor carga» son cualitativos y didácticos, no un mapa cuantitativo de deformación. Debe existir una alternativa sin WebGL: una lista de zonas navegable con teclado y con la misma información. Orientación inicial: vista lateral oblicua izquierda.

## Secciones

### Seccion 3.1: Dos rutas para construir hueso (id "m3_1_dos_rutas")

#### Contenido

Todo el hueso, venga de donde venga, se construye igual: un **osteoblasto** secreta una matriz orgánica llamada **osteoide** y esa matriz se mineraliza. Lo que cambia entre las dos rutas de formación ósea es **sobre qué** se deposita el osteoide.

- **Osificación intramembranosa:** el hueso se forma directamente dentro de tejido conjuntivo embrionario (mesénquima) condensado. No hay cartílago intermedio.
- **Osificación endocondral:** primero se forma un molde de cartílago hialino con la forma del futuro hueso. Después ese cartílago se calcifica, se invade de vasos y es sustituido por hueso.

El tejido óseo que resulta es el mismo. Empieza como hueso inmaduro y con el tiempo se remodela a hueso laminar (sección 3.3).

**Comparación de las dos rutas**

| | Intramembranosa | Endocondral |
|---|---|---|
| Punto de partida | Condensación de mesénquima muy vascularizado | Condensación que se diferencia en condrocitos y forma un molde de cartílago hialino |
| Cartílago intermedio | No | Sí, se calcifica y se sustituye |
| Reguladores principales | RUNX2, luego osterix | SOX9 en la condrogénesis; RUNX2 en la hipertrofia y en los osteoblastos; osterix en los osteoblastos |
| Ejemplos | Huesos planos del cráneo, la mayor parte de los huesos de la cara, cuerpo y rama de la mandíbula, clavícula (en su mayor parte) | Huesos largos, vértebras, costillas, base del cráneo, cóndilo mandibular (por un cartílago secundario) |
| Crecimiento | Por aposición desde el periostio | Por la placa de crecimiento y por aposición |

**Pasos de la osificación intramembranosa**

1. Condensación de células mesenquimatosas junto a capilares.
2. Diferenciación de esas células en osteoblastos.
3. Secreción de osteoide.
4. Mineralización del osteoide; algunos osteoblastos quedan atrapados y se vuelven osteocitos.
5. Las espículas óseas crecen, se fusionan en trabéculas de hueso inmaduro y se forma el periostio.
6. Con el tiempo, el hueso inmaduro se remodela a hueso laminar.

**Pasos de la osificación endocondral**

1. La condensación mesenquimatosa se diferencia en condrocitos (regulador SOX9) y forma un molde de cartílago hialino rodeado de pericondrio.
2. Los condrocitos centrales proliferan, se hipertrofian y sintetizan colágeno tipo X; la matriz que los rodea se calcifica.
3. El pericondrio vecino pasa a ser periostio y sus osteoblastos forman el **collar óseo** alrededor de la diáfisis.
4. Los vasos sanguíneos invaden el cartílago hipertrófico (atraídos por señales como VEGF) y traen osteoprogenitores y células que degradan el cartílago calcificado.
5. Los osteoblastos depositan osteoide sobre los restos de cartílago calcificado y aparece el **centro primario de osificación**. Más tarde aparecen los centros secundarios en las epífisis.
6. Entre la diáfisis y la epífisis queda la **placa de crecimiento**, organizada en zonas: reserva, proliferación (en columnas), hipertrofia, calcificación y osificación.

Dos señales coordinan el proceso. Los condrocitos prehipertróficos secretan Indian hedgehog (IHH), que induce la formación del collar óseo en el pericondrio. La proteína relacionada con la PTH (PTHrP), producida cerca de los extremos del molde, retrasa la hipertrofia de los condrocitos. Juntas forman un circuito de retroalimentación que regula el ritmo del crecimiento.

> Atencion: «Endocondral» no significa que el cartílago se convierta en hueso. La matriz de cartílago calcificado sirve de andamio y en gran parte se elimina; el hueso nuevo lo depositan osteoblastos. Estudios recientes en ratones indican que una parte de los condrocitos hipertróficos podría sobrevivir y convertirse en osteoblastos y osteocitos [verificar].

> Dato: Los huesos largos usan las dos rutas a la vez. El collar óseo que rodea la diáfisis se forma por osificación intramembranosa, sin cartílago, y el interior se forma por osificación endocondral.

> Clinico: la consolidación de una fractura repite estas vías según la mecánica del foco. Con fijación rígida la consolidación es directa (primaria), casi sin callo y con remodelado de contacto. Con un movimiento moderado se forma un callo con cartílago y hueso (vía endocondral). Con un movimiento excesivo predomina el tejido fibroso y puede haber pseudoartrosis. Ya se ve el tema del módulo: la mecánica decide qué tejido se forma.

> Recuerda: las dos rutas comparten al osteoblasto y al osteoide. Si entiendes una, entiendes el resto del módulo.

#### Actividades

##### Actividad m3_multicapa_rutas

```yaml
tipo: multicapa
titulo: "Dos rutas, un mismo tejido"
instrucciones: "Explora el esquema de las dos rutas de formación ósea. Toca cada capa para leer qué es y qué hace. Con teclado, usa Tab para pasar de una capa a otra, Enter o Espacio para abrirla y Esc para cerrarla. Pasar el cursor solo muestra el nombre; la descripción completa aparece al tocar o al pulsar Enter. Debes abrir las 9 capas obligatorias."
obligatoria: true
puntaje_max: 20
concepto: "Osificación intramembranosa y endocondral"
retroalimentacion:
  acierto: "Bien. Las dos rutas terminan en el mismo tejido; lo que cambia es el andamio previo: tejido conjuntivo condensado o un molde de cartílago."
  error: "Aún te faltan capas obligatorias. Ábrelas todas: la comparación solo se entiende al ver las dos rutas completas."
svg: m3_rutas_formacion_osea
modo: explorar
capas:
  - id: im_condensacion_mesenquimatosa
    etiqueta: "Condensación mesenquimatosa"
    descripcion: "Agrupación densa de células mesenquimatosas junto a capilares. Recibe señales (BMP, Wnt, FGF) que la comprometen con el linaje osteoblástico. Es el punto de partida de la vía intramembranosa."
  - id: im_osteoblastos
    etiqueta: "Osteoblastos"
    descripcion: "Células cuboides dispuestas en fila que secretan osteoide. Tienen retículo endoplásmico rugoso y aparato de Golgi muy desarrollados. Algunas quedarán atrapadas en la matriz y serán osteocitos."
  - id: im_osteoide
    etiqueta: "Osteoide"
    descripcion: "Matriz orgánica recién secretada y aún sin mineralizar, formada sobre todo por colágeno tipo I. Se ve como una banda pálida entre los osteoblastos y la matriz mineralizada."
  - id: im_trabeculas_hueso_inmaduro
    etiqueta: "Trabéculas de hueso inmaduro"
    descripcion: "Espículas de hueso inmaduro que crecen alrededor de los capilares y se fusionan en una red. Su colágeno es irregular y tienen muchos osteocitos. Más tarde se remodelan a hueso laminar."
  - id: im_periostio
    etiqueta: "Periostio"
    descripcion: "Capa de tejido conjuntivo que queda en la superficie del hueso en formación. Su capa interna conserva células osteoprogenitoras que permiten el crecimiento por aposición."
  - id: ec_modelo_cartilaginoso
    etiqueta: "Modelo de cartílago hialino"
    descripcion: "Molde de cartílago hialino con la forma aproximada del futuro hueso, rodeado de pericondrio. Es el andamio de la vía endocondral."
  - id: ec_condrocitos_hipertroficos
    etiqueta: "Condrocitos hipertróficos"
    descripcion: "Condrocitos del centro del molde que aumentan mucho de tamaño y sintetizan colágeno tipo X. Su matriz se calcifica y emiten señales (como VEGF) que atraen vasos sanguíneos."
  - id: ec_collar_oseo
    etiqueta: "Collar óseo perióstico"
    descripcion: "Manguito de hueso que forman los osteoblastos del pericondrio, que ahora es periostio, alrededor de la diáfisis. Se forma por osificación intramembranosa, sin cartílago intermedio: un mismo hueso largo usa las dos rutas."
  - id: ec_invasion_vascular
    etiqueta: "Invasión vascular"
    descripcion: "Los vasos atraviesan el collar óseo y entran en el cartílago calcificado. Traen osteoprogenitores y células que degradan el cartílago calcificado (condroclastos y osteoclastos)."
  - id: ec_centro_osificacion_primario
    etiqueta: "Centro primario de osificación"
    descripcion: "Zona central de la diáfisis donde los osteoblastos depositan osteoide sobre restos de cartílago calcificado. Desde aquí la osificación avanza hacia los extremos."
  - id: ec_placa_crecimiento
    etiqueta: "Placa de crecimiento"
    descripcion: "Cartílago que queda entre la diáfisis y la epífisis. Se organiza en zonas (reserva, proliferación, hipertrofia, calcificación y osificación) y permite el crecimiento en longitud durante la infancia y la adolescencia."
requeridas:
  - im_condensacion_mesenquimatosa
  - im_osteoblastos
  - im_osteoide
  - im_trabeculas_hueso_inmaduro
  - ec_modelo_cartilaginoso
  - ec_condrocitos_hipertroficos
  - ec_collar_oseo
  - ec_invasion_vascular
  - ec_centro_osificacion_primario
```

##### Actividad m3_quiz_rutas

```yaml
tipo: quiz
titulo: "Comprueba las dos rutas"
instrucciones: "Responde las tres preguntas. Recibes la explicación justo después de cada respuesta. Toca una opción o, con teclado, muévete con las flechas y confirma con Enter."
obligatoria: true
puntaje_max: 30
concepto: "Diferencias entre osificación intramembranosa y endocondral"
retroalimentacion:
  acierto: "Correcto. Distinguir el andamio previo (tejido conjuntivo o cartílago) es la base para entender la mandíbula en la siguiente sección."
  error: "Repasa la tabla comparativa: la diferencia clave es si hay o no un molde de cartílago que luego se sustituye."
preguntas:
  - id: m3_q_rutas_1
    formato: opcion_multiple
    enunciado: "¿Qué distingue la osificación endocondral de la intramembranosa?"
    opciones:
      - id: a
        texto: "El hueso se forma sin osteoblastos, gracias a la actividad de los osteoclastos sobre el cartílago."
      - id: b
        texto: "Produce un tejido óseo de composición distinta a la del hueso formado por la vía intramembranosa."
      - id: c
        texto: "El hueso se forma sobre un molde de cartílago hialino que después se calcifica y se sustituye."
      - id: d
        texto: "Solo ocurre en el adulto, durante la reparación de fracturas, y no en el desarrollo embrionario."
    correcta: c
    explicacion: "En la vía endocondral existe un molde de cartílago hialino que se calcifica, se invade de vasos y se sustituye por hueso. El tejido óseo resultante es el mismo en ambas rutas y siempre intervienen osteoblastos."
    dificultad: 1
    concepto: "Osificación endocondral"
  - id: m3_q_rutas_2
    formato: verdadero_falso
    enunciado: "En un hueso largo en desarrollo, el collar óseo que rodea la diáfisis se forma por osificación intramembranosa."
    correcta: true
    explicacion: "Verdadero. Los osteoblastos del pericondrio, que se convierte en periostio, depositan hueso directamente sobre la superficie del molde, sin cartílago intermedio. Por eso un hueso largo usa las dos rutas."
    dificultad: 2
    concepto: "Collar óseo perióstico"
  - id: m3_q_rutas_3
    formato: opcion_multiple
    enunciado: "¿Qué eventos preparan el centro primario de osificación en la vía endocondral?"
    opciones:
      - id: a
        texto: "Aparición de osteoclastos en el pericondrio, que reabsorben el cartílago desde fuera."
      - id: b
        texto: "Mineralización del osteoide del collar óseo, que reemplaza al cartílago."
      - id: c
        texto: "Hipertrofia de los condrocitos, calcificación de su matriz e invasión de vasos sanguíneos."
      - id: d
        texto: "Fusión de espículas de hueso inmaduro alrededor de capilares, sin cartílago."
    correcta: c
    explicacion: "Los condrocitos centrales se hipertrofian y su matriz se calcifica; luego los vasos invaden el cartílago y traen osteoprogenitores. El collar óseo se forma por fuera y no sustituye al cartílago, y la fusión de espículas alrededor de capilares describe la vía intramembranosa."
    dificultad: 2
    concepto: "Centro primario de osificación"
```

### Seccion 3.2: La mandíbula, un hueso con dos historias (id "m3_2_mandibula_historias")

#### Contenido

La mandíbula usa **las dos rutas** y además un **cartílago guía**. Su tejido de origen es el ectomesénquima (derivado de la cresta neural) del primer arco faríngeo. Las semanas de esta sección se cuentan desde la fecundación (semanas de desarrollo) [verificar].

**Cuerpo y rama: osificación intramembranosa junto al cartílago de Meckel**

En cada lado del primer arco aparece una barra de cartílago hialino, el **cartílago de Meckel** (hacia la sexta semana de desarrollo [verificar]). La mandíbula no se forma osificando esa barra. El mesénquima que la rodea se condensa en su cara lateral y el hueso se forma por osificación intramembranosa. El primer centro de osificación aparece hacia las semanas 6 a 7 [verificar], en el ángulo donde el nervio alveolar inferior se divide en sus ramas mentoniana e incisiva. El hueso crece como un canal alrededor del nervio y de los gérmenes dentales; de esa relación nace el **proceso alveolar**.

**Destino del cartílago de Meckel**

- El extremo posterior se osifica por vía endocondral y forma el martillo y el yunque.
- La porción media se transforma en tejido fibroso: el ligamento esfenomandibular y el ligamento anterior del martillo.
- La porción anterior queda incorporada al cuerpo mandibular cerca de la línea media; algunos estudios recientes describen que esa región se osifica en parte por vía endocondral [verificar].
- El resto se reabsorbe y desaparece.

**Cóndilo, coronoides y sínfisis: cartílagos secundarios**

Cuando ya existe hueso intramembranoso aparecen los **cartílagos secundarios**: el condilar (hacia las semanas 10 a 12 [verificar]), el coronoideo y el sinfisario. Se llaman secundarios porque se forman más tarde, sobre hueso ya formado, y de manera independiente del cartílago de Meckel.

El **cartílago condilar** es el único que persiste como sitio de crecimiento. Tiene cuatro capas: una capa fibrosa superficial (la futura superficie articular), una capa de células proliferativas, una zona de condrocitos maduros y una zona de condrocitos hipertróficos que se osifica por vía endocondral. Crece hasta el final del crecimiento facial, hacia la adolescencia tardía o el inicio de la adultez [verificar], y su proliferación responde a la carga funcional.

| Región | Mecanismo | Comentario |
|---|---|---|
| Cuerpo | Intramembranosa | Lateral al cartílago de Meckel; se remodela con la erupción dentaria y la función |
| Rama | Intramembranosa (predominantemente) | Crece por aposición y remodelado |
| Proceso alveolar | Intramembranosa | Se forma alrededor de los gérmenes dentales y depende de la presencia del diente |
| Apófisis coronoides | Intramembranosa, con un cartílago secundario transitorio | Se relaciona con la inserción del músculo temporal |
| Cóndilo | Endocondral, a partir de un cartílago secundario | Sitio de crecimiento y superficie articular |
| Sínfisis | Unión fibrosa con pequeños cartílagos secundarios | Las dos mitades se fusionan durante el primer año de vida [verificar] |
| Extremo posterior de Meckel | Endocondral | Forma el martillo y el yunque; no es parte de la mandíbula |

> Atencion: que el cóndilo crezca por osificación endocondral no significa que derive del cartílago de Meckel. Su cartílago es secundario e independiente.

> Dato: a diferencia de la placa de crecimiento de un hueso largo, las células progenitoras del cartílago condilar están cerca de la superficie articular, bajo una capa fibrosa, y sus condrocitos no se ordenan en columnas regulares [verificar]. Además, los condrocitos de los cartílagos secundarios derivan del periostio del hueso ya formado.

> Clinico: una fractura del cuello del cóndilo en un niño puede alterar el crecimiento mandibular, porque el cartílago condilar es un centro de crecimiento. Por eso el seguimiento se prolonga hasta el final del crecimiento [verificar].

> Recuerda: cuerpo, rama y proceso alveolar se forman por vía intramembranosa; el cóndilo, por vía endocondral a partir de un cartílago secundario; el cartílago de Meckel guía el proceso pero no se convierte en la mandíbula.

#### Actividades

##### Actividad m3_multicapa_mandibula_fetal

```yaml
tipo: multicapa
titulo: "Encuentra las piezas de la mandíbula fetal"
instrucciones: "La aplicación te pide una estructura por su nombre y tú la tocas en el esquema. Al acertar se abre su descripción. Sin ratón, usa Tab para recorrer las estructuras y Enter para elegir la que buscas; también puedes pedir una pista para resaltar una zona. Debes identificar las 7 estructuras obligatorias."
obligatoria: true
puntaje_max: 20
concepto: "Origen intramembranoso y endocondral de la mandíbula"
retroalimentacion:
  acierto: "Correcto. El hueso lateral al cartílago de Meckel es intramembranoso; el cóndilo tiene su propio cartílago secundario."
  error: "Esa no es la estructura. Recuerda: Meckel es una barra de cartílago medial a la lámina ósea, y los cartílagos secundarios están en los extremos (cóndilo, coronoides) y en la línea media (sínfisis)."
svg: m3_mandibula_desarrollo
modo: identificar
capas:
  - id: cartilago_de_meckel
    etiqueta: "Cartílago de Meckel"
    descripcion: "Barra de cartílago hialino a cada lado de la mandíbula, derivada del ectomesénquima del primer arco faríngeo. Actúa como guía: el hueso se forma a su lado y no por su osificación directa. La mayor parte desaparece."
  - id: hueso_intramembranoso_lateral
    etiqueta: "Hueso intramembranoso (cuerpo y rama)"
    descripcion: "Lámina de hueso que se forma por osificación intramembranosa en el mesénquima condensado lateral al cartílago de Meckel. Origina el cuerpo y la rama de la mandíbula."
  - id: sitio_primer_osificacion
    etiqueta: "Primer centro de osificación"
    descripcion: "Primer punto de osificación mandibular, en las primeras semanas del desarrollo (semanas 6 a 7 de desarrollo aproximadamente [verificar]), en el ángulo donde el nervio alveolar inferior se divide en sus ramas mentoniana e incisiva."
  - id: nervio_alveolar_inferior
    etiqueta: "Nervio alveolar inferior"
    descripcion: "Rama del nervio mandibular que discurre por el canal en formación. El hueso se forma alrededor de este nervio y de los gérmenes dentales."
  - id: germen_dental
    etiqueta: "Germen dental"
    descripcion: "Primordio del diente dentro del canal óseo. El proceso alveolar se forma alrededor de los gérmenes dentales y depende de la presencia del diente."
  - id: cartilago_condilar
    etiqueta: "Cartílago condilar (secundario)"
    descripcion: "Cartílago secundario del cóndilo. Aparece más tarde y de forma independiente del cartílago de Meckel. Se osifica por vía endocondral y sigue creciendo durante el desarrollo posnatal."
  - id: cartilago_coronoideo
    etiqueta: "Cartílago coronoideo (secundario)"
    descripcion: "Cartílago secundario transitorio de la apófisis coronoides, asociado a la inserción del músculo temporal. Se sustituye por hueso."
  - id: cartilago_sinfisario
    etiqueta: "Cartílago sinfisario (secundario)"
    descripcion: "Pequeños cartílagos secundarios de la región de la sínfisis. Las dos mitades de la mandíbula se unen en la sínfisis, que se osifica durante el primer año de vida (aproximadamente [verificar])."
  - id: extremo_posterior_meckel
    etiqueta: "Extremo posterior de Meckel (martillo y yunque)"
    descripcion: "Porción posterior del cartílago de Meckel. Se osifica por vía endocondral y forma el martillo y el yunque del oído medio; no forma parte de la mandíbula."
requeridas:
  - cartilago_de_meckel
  - hueso_intramembranoso_lateral
  - sitio_primer_osificacion
  - cartilago_condilar
  - cartilago_coronoideo
  - cartilago_sinfisario
  - extremo_posterior_meckel
```

##### Actividad m3_columnas_mandibula_origen

```yaml
tipo: relacion-columnas
titulo: "Cada región, su origen"
instrucciones: "Une cada región (columna izquierda) con su origen o destino (columna derecha). Toca un elemento de la izquierda y luego uno de la derecha; también puedes arrastrar. Con teclado, usa Tab, Enter para elegir el primero y de nuevo Tab y Enter para elegir su pareja. Sobra una opción de la derecha que no corresponde a nada."
obligatoria: true
puntaje_max: 30
concepto: "Regiones mandibulares y tipo de osificación"
retroalimentacion:
  acierto: "Correcto. Cuerpo, rama y proceso alveolar son intramembranosos; el cóndilo es endocondral por un cartílago secundario; y Meckel tiene tres destinos distintos según la región."
  error: "Alguna pareja no es correcta. Piensa qué región tiene hueso formado junto a un cartílago y cuál tiene un cartílago propio que se osifica."
izquierda:
  - id: l1
    texto: "Cuerpo de la mandíbula"
  - id: l2
    texto: "Cóndilo mandibular"
  - id: l3
    texto: "Extremo posterior del cartílago de Meckel"
  - id: l4
    texto: "Porción media del cartílago de Meckel"
  - id: l5
    texto: "Proceso alveolar"
  - id: l6
    texto: "Sínfisis mentoniana del recién nacido"
derecha:
  - id: r1
    texto: "Osificación intramembranosa: lámina ósea lateral al cartílago de Meckel, que forma la base del cuerpo"
  - id: r2
    texto: "Osificación endocondral a partir de un cartílago secundario"
  - id: r3
    texto: "Osificación endocondral que forma el martillo y el yunque"
  - id: r4
    texto: "Transformación en tejido fibroso: ligamento esfenomandibular y ligamento anterior del martillo"
  - id: r5
    texto: "Osificación intramembranosa que depende del diente: se forma con él y se reabsorbe si él se pierde"
  - id: r6
    texto: "Unión fibrosa entre las dos mitades, que se osifica durante el primer año de vida"
  - id: r7
    texto: "Osificación endocondral del cartílago de Meckel completo, que origina toda la mandíbula"
pares:
  - izquierda: l1
    derecha: r1
  - izquierda: l2
    derecha: r2
  - izquierda: l3
    derecha: r3
  - izquierda: l4
    derecha: r4
  - izquierda: l5
    derecha: r5
  - izquierda: l6
    derecha: r6
```

##### Actividad m3_quiz_mandibula

```yaml
tipo: quiz
titulo: "Comprueba la mandíbula"
instrucciones: "Responde las tres preguntas y lee la explicación de cada una."
obligatoria: true
puntaje_max: 30
concepto: "Desarrollo de la mandíbula"
retroalimentacion:
  acierto: "Bien. Ya distingues el origen de cada parte de la mandíbula, base para entender cómo responde después a la carga."
  error: "Vuelve a la tabla de regiones: cuerpo y rama son intramembranosos y el cóndilo tiene un cartílago secundario propio."
preguntas:
  - id: m3_q_mand_1
    formato: opcion_multiple
    enunciado: "¿Qué mecanismo forma el cuerpo y la rama de la mandíbula?"
    opciones:
      - id: a
        texto: "Osificación endocondral del cartílago de Meckel completo, que se transforma directamente en hueso."
      - id: b
        texto: "Osificación intramembranosa en el mesénquima condensado lateral al cartílago de Meckel."
      - id: c
        texto: "Osificación endocondral desde una placa de crecimiento como la de un hueso largo."
      - id: d
        texto: "Osificación de un molde de cartílago hialino que se forma en la rama y luego se calcifica."
    correcta: b
    explicacion: "El hueso se forma por osificación intramembranosa lateral al cartílago de Meckel. La barra de Meckel actúa como guía y en su mayor parte desaparece; no se convierte en la mandíbula."
    dificultad: 1
    concepto: "Osificación intramembranosa mandibular"
  - id: m3_q_mand_2
    formato: verdadero_falso
    enunciado: "El cóndilo mandibular crece a partir de un remanente del cartílago de Meckel."
    correcta: false
    explicacion: "Falso. El cóndilo tiene un cartílago secundario propio, que aparece más tarde sobre hueso ya formado e independiente del cartílago de Meckel."
    dificultad: 2
    concepto: "Cartílago condilar secundario"
  - id: m3_q_mand_3
    formato: opcion_multiple
    enunciado: "¿Por qué se llama «secundario» al cartílago condilar?"
    opciones:
      - id: a
        texto: "Porque aparece más tarde, sobre hueso ya formado, e independiente del cartílago de Meckel."
      - id: b
        texto: "Porque se forma después del nacimiento, cuando el niño ya mastica alimentos sólidos."
      - id: c
        texto: "Porque solo tiene dos capas celulares, a diferencia del cartílago primario de un hueso largo."
      - id: d
        texto: "Porque no se osifica y se conserva toda la vida como cartílago articular del cóndilo."
    correcta: a
    explicacion: "«Secundario» se refiere a su aparición tardía e independiente. Se forma antes del nacimiento, tiene cuatro capas y su zona hipertrófica se osifica por vía endocondral mientras dura el crecimiento."
    dificultad: 2
    concepto: "Cartílagos secundarios"
```

### Seccion 3.3: De la condensación al hueso laminar (id "m3_3_condensacion_laminar")

#### Contenido

La formación intramembranosa empieza con una **condensación mesenquimatosa**: las células mesenquimatosas (en la mandíbula, ectomesénquima) se agrupan junto a vasos sanguíneos y reciben señales (BMP, Wnt, FGF) que las comprometen con el linaje osteoblástico. Lo que sigue es un programa genético ordenado.

**El programa genético del osteoblasto**

| Molécula | Qué es | Qué hace | Evidencia clave |
|---|---|---|---|
| BMP (BMP-2, -4, -7) | Factores de crecimiento de la superfamilia TGF-β | Se unen a receptores tipo I y tipo II; activan Smad1/5/8, que con Smad4 entran al núcleo e inducen RUNX2 | Son inductores osteogénicos clásicos; se usan BMP recombinantes en cirugía |
| RUNX2 | Factor de transcripción | Compromete a la célula mesenquimatosa con el linaje osteoblástico y activa genes de la matriz ósea | Los ratones sin Runx2 no forman osteoblastos ni hueso; su pérdida parcial en humanos causa displasia cleidocraneal |
| Osterix (SP7) | Factor de transcripción que actúa después de RUNX2 | Lleva al preosteoblasto a osteoblasto maduro | Los ratones sin Sp7 forman cartílago pero no hueso |
| Wnt/β-catenina | Vía de señalización | Favorece la diferenciación osteoblástica frente a la condrogénica | Sin β-catenina, los progenitores dan condrocitos en lugar de osteoblastos (ratones) |

Léelo como una cadena: **BMP enciende, RUNX2 compromete, osterix madura**. El osteoblasto maduro expresa colágeno tipo I, fosfatasa alcalina y, más tarde, osteocalcina.

**Del osteoblasto al osteoide**

El osteoblasto maduro es una célula cuboide con abundante retículo endoplásmico rugoso y aparato de Golgi, adaptada a secretar. Su producto es el **osteoide**: colágeno tipo I (la mayor parte de la matriz orgánica, aproximadamente 90 % [verificar]) junto con proteínas no colágenas, como osteocalcina, osteopontina y sialoproteína ósea, y proteoglucanos. El osteoide se mineraliza poco después (el proceso completo se estudia en el módulo 4). Los osteoblastos que quedan rodeados por su propia matriz se convierten en **osteocitos**, tema de la sección 3.4; los demás se transforman en células de revestimiento óseo o mueren por apoptosis.

**Hueso inmaduro y hueso laminar**

Las primeras trabéculas son de **hueso inmaduro** (también llamado fibrilar o trenzado). Se forma rápido y sin necesidad de una superficie previa, por eso es el hueso del feto, del recién nacido y del callo de fractura. Con el tiempo los osteoclastos lo reabsorben y los osteoblastos depositan en su lugar **hueso laminar**, más organizado y resistente.

| Característica | Hueso inmaduro (fibrilar) | Hueso laminar |
|---|---|---|
| Colágeno | Haces irregulares, entrecruzados y sin orientación | Fibras paralelas dentro de cada lámina, con orientación que cambia entre láminas |
| Osteocitos | Más numerosos, más grandes y redondeados, sin patrón | Menos numerosos y alineados entre láminas |
| Formación | Rápida; puede formarse de novo, sin superficie previa | Lenta; se deposita sobre una superficie preexistente |
| Mineralización | Irregular, en parches | Ordenada y uniforme |
| Resistencia | Menor | Mayor |
| Dónde aparece | Feto y recién nacido, callo de fractura, enfermedad de Paget, osteogénesis imperfecta | Hueso cortical y trabecular del adulto |

> Atencion: «inmaduro» describe la organización del colágeno, no una calidad «mala». Es el hueso adecuado cuando se necesita formar tejido rápido; su debilidad relativa es la razón por la que se sustituye por hueso laminar.

> Clinico: la displasia cleidocraneal es causada por mutaciones con pérdida de función en un solo alelo de RUNX2. Además de clavículas hipoplásicas y fontanelas abiertas, cursa con retraso en la erupción dentaria y dientes supernumerarios; en algunos pacientes, esa erupción retrasada o los dientes supernumerarios son el motivo de consulta odontológica que lleva al diagnóstico.

> Clinico: la FDA (Estados Unidos) aprobó en 2007 [verificar] la proteína morfogenética ósea 2 recombinante (rhBMP-2) sobre una esponja de colágeno para la elevación de seno y para el aumento del reborde alveolar en defectos de alvéolos postextracción. La aprobación en otros países puede diferir. Es la aplicación directa de esta cadena, pero puede causar inflamación local importante [verificar].

> Recuerda: el osteoide es la matriz aún no mineralizada. La mineralización, y por qué el hueso es duro, se explica en el módulo 4.

#### Actividades

##### Actividad m3_quiz_condensacion

```yaml
tipo: quiz
titulo: "Del mesénquima al hueso"
instrucciones: "Responde tres preguntas: una para ordenar pasos, una de opción múltiple y una de verdadero o falso. En la de ordenar, arrastra los pasos con el dedo o el ratón, o toca un paso y usa los botones Subir y Bajar. Con teclado, pulsa Enter sobre un paso, muévelo con las flechas y vuelve a pulsar Enter para soltarlo."
obligatoria: true
puntaje_max: 30
concepto: "Osificación intramembranosa y programa genético del osteoblasto"
retroalimentacion:
  acierto: "Bien. Tienes la secuencia completa: condensación, osteoblasto, osteoide, mineralización, trabéculas y remodelado a hueso laminar."
  error: "Repasa la cadena BMP, RUNX2, osterix y la secuencia de la osificación intramembranosa."
preguntas:
  - id: m3_q_cond_1
    formato: ordenar_pasos
    enunciado: "Ordena los pasos de la osificación intramembranosa, del primero al último."
    pasos:
      - id: p1
        texto: "Mineralización del osteoide; algunos osteoblastos quedan atrapados como osteocitos."
      - id: p2
        texto: "Condensación de células mesenquimatosas junto a capilares."
      - id: p3
        texto: "Remodelado: el hueso inmaduro es sustituido por hueso laminar."
      - id: p4
        texto: "Secreción de osteoide por los osteoblastos."
      - id: p5
        texto: "Diferenciación en osteoblastos (BMP, RUNX2, osterix)."
      - id: p6
        texto: "Fusión de las espículas en trabéculas de hueso inmaduro y formación del periostio."
    correcta: [p2, p5, p4, p1, p6, p3]
    explicacion: "La secuencia es: condensación, diferenciación a osteoblastos, secreción de osteoide, mineralización con atrapamiento de osteocitos, fusión en trabéculas de hueso inmaduro con formación del periostio, y remodelado a hueso laminar."
    dificultad: 2
    concepto: "Secuencia de la osificación intramembranosa"
  - id: m3_q_cond_2
    formato: opcion_multiple
    enunciado: "¿Qué factor de transcripción se considera el regulador maestro del linaje osteoblástico y actúa antes que osterix?"
    opciones:
      - id: a
        texto: "SOX9"
      - id: b
        texto: "RUNX2"
      - id: c
        texto: "PPARγ"
      - id: d
        texto: "MyoD"
    correcta: b
    explicacion: "RUNX2 compromete a la célula mesenquimatosa con el linaje osteoblástico y osterix (SP7) actúa después. SOX9 dirige el linaje del condrocito, PPARγ el del adipocito y MyoD el del músculo esquelético."
    dificultad: 1
    concepto: "RUNX2 y osterix"
  - id: m3_q_cond_3
    formato: verdadero_falso
    enunciado: "El hueso inmaduro puede formarse sin una superficie ósea o cartilaginosa previa, mientras que el hueso laminar se deposita sobre una superficie preexistente."
    correcta: true
    explicacion: "Verdadero. El hueso inmaduro se forma de novo y con rapidez, por eso aparece en el feto y en el callo de fractura. El hueso laminar es lento y se deposita sobre una superficie que ya existe, como la de un hueso inmaduro que se está remodelando."
    dificultad: 3
    concepto: "Hueso inmaduro y hueso laminar"
```

##### Actividad m3_multicapa_osteoide

```yaml
tipo: exploracion-3d
titulo: "Dentro de una trabécula en formación"
instrucciones: "Gira el corte de la trabécula con un dedo y acércalo con dos (en escritorio, arrastra con el ratón y usa la rueda). Toca cada región para leer qué es; con teclado, Tab y Enter, o elige en la lista bajo el modelo (sirve también sin 3D). Compara el colágeno y los osteocitos del hueso inmaduro y del laminar. Visita las 6 regiones obligatorias."
obligatoria: true
puntaje_max: 20
concepto: "Osteoide, hueso inmaduro y hueso laminar"
retroalimentacion:
  acierto: "Bien. Ahora puedes reconocer en un corte el osteoide, el frente de mineralización y la diferencia entre hueso inmaduro y laminar."
  error: "Faltan capas obligatorias. Ábrelas todas para comparar el hueso inmaduro con el laminar."
# 2026-10-18: pasa del dibujo SVG (m3_osteoide_hueso_inmaduro, con una ilustración hecha con IA que tenía errores
# histológicos) a un modelo 3D construido por código. Mismo id, regiones, textos, puntaje y obligatorias.
modelo: osteoide
hotspots:
  - id: osteoblastos_activos
    etiqueta: "Osteoblastos activos"
    descripcion: "Células cuboides en fila que secretan colágeno tipo I y otras proteínas de la matriz. Están comunicadas entre sí por uniones comunicantes."
  - id: osteoide
    etiqueta: "Osteoide"
    descripcion: "Banda de matriz orgánica todavía sin mineralizar, rica en colágeno tipo I. Su grosor depende de la velocidad de formación."
  - id: frente_mineralizacion
    etiqueta: "Frente de mineralización"
    descripcion: "Límite entre el osteoide y la matriz mineralizada, donde se depositan los cristales de hidroxiapatita. Su estudio detallado corresponde al módulo 4."
  - id: hueso_inmaduro
    etiqueta: "Hueso inmaduro (fibrilar)"
    descripcion: "Hueso con haces de colágeno irregulares y muchos osteocitos grandes y redondeados. Se forma rápido y con mineralización irregular. Es menos resistente que el laminar."
  - id: osteocito_incluido
    etiqueta: "Osteocito recién incluido"
    descripcion: "Osteoblasto que quedó rodeado por su propia matriz. Comienza a extender procesos y forma su laguna. Es el origen de la red de la sección 3.4."
  - id: capilar
    etiqueta: "Capilar sanguíneo"
    descripcion: "Las trabéculas crecen alrededor de capilares. El tejido óseo en formación es muy vascularizado."
  - id: linea_cementante
    etiqueta: "Línea cementante"
    descripcion: "Línea irregular y basófila que marca el límite hasta donde se reabsorbió el hueso viejo antes de depositar hueso nuevo. Aquí separa el hueso inmaduro del laminar que lo sustituye."
  - id: hueso_laminar
    etiqueta: "Hueso laminar"
    descripcion: "Hueso organizado en láminas con fibras de colágeno paralelas y osteocitos alineados entre ellas. Se deposita sobre una superficie ya existente y es más resistente que el inmaduro."
requeridas:
  - osteoblastos_activos
  - osteoide
  - frente_mineralizacion
  - hueso_inmaduro
  - osteocito_incluido
  - hueso_laminar
```

##### Actividad m3_arrastre_bmp

```yaml
tipo: arrastre-molecular
titulo: "Enciende el programa del osteoblasto"
instrucciones: "Arrastra la molécula que puede inducir el programa osteoblástico hasta su receptor en la membrana de la célula osteoprogenitora y observa el efecto. Cuidado: hay moléculas que no encajan. Sin arrastrar: toca la molécula y luego toca el receptor. Con teclado: Tab hasta la molécula, Enter para tomarla, Tab hasta el receptor y Enter para soltarla. Puedes reiniciar la escena las veces que quieras."
obligatoria: true
puntaje_max: 30
concepto: "Vía BMP, Smad, RUNX2 y osterix"
retroalimentacion:
  acierto: "Correcto. BMP-2 activó la cascada BMP, Smad, RUNX2 y osterix, y la célula progenitora empezó a comportarse como osteoblasto."
  error: "Esa molécula no se acopla ahí. Piensa cuál es el factor de crecimiento osteoinductor de la familia TGF-β y a qué tipo de receptor se une."
svg: m3_bmp_runx2_osterix
escena: "Una célula osteoprogenitora de un mesénquima condensado. En su membrana hay un receptor de BMP (complejo de receptor tipo I y tipo II). En el citoplasma hay moléculas Smad1/5/8 y Smad4 en reposo. En el núcleo hay dos interruptores apagados: RUNX2 y osterix (SP7). Alrededor de la célula flotan tres moléculas que el estudiante puede arrastrar."
moleculas:
  - id: bmp2
    nombre: "BMP-2"
    descripcion: "Proteína morfogenética ósea 2, factor de crecimiento de la superfamilia TGF-β presente en el tejido óseo en formación."
  - id: noggin
    nombre: "Noggin"
    descripcion: "Proteína secretada que se une a BMP en el espacio extracelular."
  - id: rankl
    nombre: "RANKL"
    descripcion: "Ligando de la familia del TNF que se une al receptor RANK."
receptores:
  - id: receptor_bmp
    nombre: "Receptor de BMP (tipo I y tipo II)"
    descripcion: "Complejo de receptores con actividad de serina/treonina quinasa en la membrana de la célula osteoprogenitora."
pares:
  - molecula: bmp2
    receptor: receptor_bmp
    efecto:
      titulo: "Se activa la vía BMP, Smad, RUNX2 y osterix"
      descripcion: "BMP-2 une el receptor tipo II con el tipo I; el tipo II fosforila al tipo I y este fosforila a Smad1/5/8. Smad1/5/8 forma un complejo con Smad4, entra al núcleo y, con otros factores, aumenta la expresión de RUNX2. RUNX2 activa genes del linaje osteoblástico e induce osterix (SP7), que completa la maduración a osteoblasto: aumentan el colágeno tipo I, la fosfatasa alcalina y otras proteínas de la matriz."
      que_se_anima: "Ocurre en cinco tiempos, cada uno con su etiqueta: 1) receptor_bmp se ilumina; 2) los puntos smad_1_5_8 cambian de color (fosforilados) y se unen a smad4; 3) el complejo viaja al nucleo_celular; 4) se enciende runx2 y, solo después, osterix_sp7; 5) se activa la capa genes_osteoblasto y la celula_progenitora pasa a forma cuboide de osteoblasto. Si el estudiante intenta acoplar noggin al receptor, noggin rebota y aparece el mensaje «Noggin bloquea BMP fuera de la célula»."
distractores:
  - molecula: noggin
    por_que: "Noggin se une a BMP en el espacio extracelular y lo bloquea antes de que llegue a su receptor; no se acopla al receptor de BMP. Es un freno de la vía."
  - molecula: rankl
    por_que: "RANKL se une a RANK, receptor de los precursores de osteoclastos. Ese receptor no está en esta escena y RANKL no induce la diferenciación osteoblástica."
```

### Seccion 3.4: El osteocito, sensor del hueso (id "m3_4_osteocito_sensor")

#### Contenido

Un **osteocito** es un osteoblasto que quedó incluido en la matriz mineralizada. Es la célula más abundante del hueso adulto (aproximadamente entre 90 y 95 % de las células óseas [verificar]), puede vivir décadas [verificar] y no está aislado: forma una red que atraviesa todo el hueso.

**Cómo se forma y qué lo distingue**

- El osteoblasto rodeado de osteoide se llama osteocito joven (osteoide-osteocito). Expresa marcadores como E11/podoplanina y empieza a extender procesos.
- El osteocito maduro tiene un cuerpo alojado en una **laguna** y **procesos dendríticos** que recorren **canalículos**. Expresa DMP1 y esclerostina (SOST).

**El sistema lacuno-canalicular**

- Las lagunas alojan el cuerpo celular; los canalículos, de menos de 1 µm de diámetro (típicamente cientos de nanómetros [verificar]), alojan los procesos. Cada osteocito extiende decenas de procesos (entre 40 y 100 aproximadamente [verificar]).
- Entre la membrana del proceso y la pared del canalículo queda el **espacio pericelular**, lleno de líquido intersticial y de matriz pericelular, con fibras transversales que anclan el proceso a la pared.
- En los extremos de los procesos hay **uniones comunicantes** (conexina 43) que conectan a los osteocitos entre sí y con los osteoblastos y las células de revestimiento de la superficie. La red llega también a los vasos sanguíneos.

**Cómo detecta la carga: el flujo de líquido**

Con las cargas fisiológicas la matriz se deforma apenas una fracción de 1 %: unos cientos de microdeformaciones en la actividad habitual y picos de unos 1000 a 3000 µε (0,1 a 0,3 %) en la actividad intensa [verificar]. Esa deformación es demasiado pequeña para que la sienta una célula directamente. El mecanismo es indirecto:

1. La carga deforma la matriz mineralizada y crea diferencias de presión en el líquido de los canalículos.
2. El líquido se desplaza por el espacio pericelular, de las zonas comprimidas a las de menor presión.
3. Ese flujo ejerce un **esfuerzo cortante** sobre la membrana de los procesos dendríticos. Los modelos calculan valores del orden de 0,8 a 3 Pa para cargas fisiológicas [verificar].
4. Las fibras de anclaje amplifican la deformación local de la membrana del proceso, que puede ser hasta unas 10 veces mayor que la de la matriz [verificar] (modelo de Weinbaum y colaboradores).

Los osteocitos responden al esfuerzo cortante del flujo más que a la presión hidrostática en sí misma.

**Dinámica, no estática**

El flujo solo existe mientras la carga cambia. Si la carga se mantiene constante, el líquido se redistribuye, el flujo cesa y el estímulo desaparece. Por eso la carga estática mantenida casi no estimula la formación de hueso, mientras que las cargas dinámicas sí. Además, ante una señal repetitiva el hueso se desensibiliza, y los descansos entre ciclos restauran la respuesta.

**El osteocito como director**

Además de sensor, el osteocito coordina la respuesta. Envía señales a las células de la superficie: esclerostina (frena la formación, sección 3.6), RANKL (impulsa la resorción, módulo 5) y FGF23 (regula el fosfato en el organismo). Los osteoblastos y los osteoclastos son, en gran parte, ejecutores de lo que el osteocito indica.

> Atencion: el osteoblasto no es el sensor principal. Los osteoblastos también responden a la carga, pero la percepción y la coordinación recaen sobre todo en el osteocito, por su posición en la matriz y por su red.

> Dato: la red lacuno-canalicular también transporta oxígeno, nutrientes y desechos. La carga que mueve el líquido ayuda a mantener vivos a los osteocitos; sin carga hay menos flujo y más muerte celular.

> Clinico: las lagunas vacías, sin osteocitos, son un signo histológico de necrosis ósea, como en la osteorradionecrosis mandibular. Sin osteocitos el hueso pierde su capacidad de detectar la carga y de coordinar la reparación.

> Recuerda: carga que cambia, líquido que se mueve, esfuerzo cortante en la membrana. Sin cambio no hay flujo.

#### Actividades

##### Actividad m3_video_mecanotransduccion

```yaml
tipo: video-texto
titulo: "De un mordisco a una señal"
instrucciones: "Sigue la animación paso a paso: cada paso muestra un cambio en el esquema y su explicación escrita. Toca Siguiente y Anterior, o usa las flechas del teclado. El texto está siempre visible junto a la imagen, así que no dependes del ratón ni del sonido. Para completar la actividad debes llegar al último paso."
obligatoria: true
puntaje_max: 20
concepto: "Mecanotransducción: del flujo de líquido a la señal celular"
retroalimentacion:
  acierto: "Completaste la explicación. Recuerda la cadena: carga, flujo, esfuerzo cortante, sensores, mensajeros, respuesta de las células de superficie."
  error: "Todavía no llegaste al último paso. Avanza hasta el final para completar la actividad."
ilustracion: m3_osteocito_red_lacuno_canalicular
pasos:
  - id: v1
    titulo: "Una carga sobre el hueso"
    texto_narrado: "Cuando muerdes o masticas, la mandíbula se carga y su matriz mineralizada se deforma apenas una fracción diminuta de su longitud. Esa deformación es minúscula, pero es el origen de toda la señal."
    cambia_en_escena: "Se resalta la capa `matriz_mineralizada` y aparecen flechas de compresión que la deforman ligeramente (exageradas para verse); el resto de capas se atenúa."
  - id: v2
    titulo: "El líquido se desplaza"
    texto_narrado: "La deformación crea diferencias de presión en el líquido que llena los canalículos. El líquido es empujado desde las zonas comprimidas hacia las de menor presión y vuelve cuando la carga cesa. Por eso solo las cargas que cambian generan flujo."
    cambia_en_escena: "Se resaltan `canaliculos`, `espacio_pericelular` y `flechas_flujo_liquido`; las flechas avanzan en un sentido y se invierten cuando la carga se libera."
  - id: v3
    titulo: "El flujo roza la membrana"
    texto_narrado: "El líquido circula por el espacio estrecho entre la pared del canalículo y la membrana del proceso dendrítico. Al pasar ejerce un esfuerzo cortante y arrastra las fibras de anclaje, que amplifican la deformación de la membrana."
    cambia_en_escena: "Se resaltan `procesos_dendriticos`, `espacio_pericelular` y `fibras_de_anclaje`; las fibras se tensan y la membrana del proceso se deforma en cada punto de anclaje."
  - id: v4
    titulo: "Los sensores se activan"
    texto_narrado: "En la membrana y en la laguna actúan varios sensores a la vez: las integrinas de los puntos de unión, el canal Piezo1 y el cilio primario. Al activarse, aumenta el Ca²⁺ intracelular y cambia el estado de su citoesqueleto."
    cambia_en_escena: "Se resaltan con un destello `integrinas_puntos_union`, `canal_piezo1` y `cilio_primario`; aumenta el brillo dentro de `cuerpo_osteocito` para representar la entrada de Ca²⁺."
  - id: v5
    titulo: "El osteocito libera mensajeros"
    texto_narrado: "Con el aumento de Ca²⁺ y la deformación de la membrana se abren hemicanales de conexina 43 y el osteocito libera prostaglandina E2 (PGE2). También produce óxido nítrico. Estos mensajeros se propagan por la red y hacia la superficie del hueso."
    cambia_en_escena: "Se resalta `conexina_43` y aparece la capa `mensajeros_pge2_no` con partículas que salen del osteocito y viajan por los procesos hacia la superficie."
  - id: v6
    titulo: "La superficie responde"
    texto_narrado: "Los mensajeros llegan a las células de revestimiento y a los osteoblastos. A la vez, el osteocito reduce la esclerostina, un freno de la vía Wnt, y aumenta la señal que favorece la formación de hueso. El resultado es más hueso donde más se necesita, tema de las dos secciones siguientes."
    cambia_en_escena: "Se resalta `celulas_revestimiento`; las células de la superficie pasan a forma cuboide activa y aparece una fina capa nueva de osteoide sobre la superficie; junto al osteocito aparece la etiqueta superpuesta «menos esclerostina, más Wnt»."
```

##### Actividad m3_multicapa_osteocito

```yaml
tipo: exploracion-3d
titulo: "Explora la red lacuno-canalicular"
instrucciones: "Gira el bloque de hueso cortical con un dedo y acércalo con dos (en escritorio, arrastra con el ratón y usa la rueda): la matriz está cortada para que veas el osteocito y su red. Toca cada región para leer qué es; con teclado, Tab y Enter, o elige en la lista bajo el modelo (sirve también sin 3D). Visita las 9 regiones obligatorias."
obligatoria: true
puntaje_max: 30
concepto: "Anatomía funcional del sistema lacuno-canalicular"
retroalimentacion:
  acierto: "Muy bien. Ya conoces las piezas de la red: laguna, procesos, canalículos, espacio pericelular y sus conexiones con el capilar y la superficie."
  error: "Faltan capas obligatorias. Ábrelas todas: el flujo de líquido solo se entiende viendo cómo se conectan las piezas."
# 2026-10-18: pasa del dibujo SVG (con una ilustración hecha con IA que tenía errores histológicos) a un modelo 3D
# construido por código. El SVG m3_osteocito_red_lacuno_canalicular se conserva para la animación. La exploración
# admite 12 regiones y el dibujo tenía 15 capas: espacio_pericelular se une a canaliculos, integrinas_puntos_union a
# fibras_de_anclaje, y canal_piezo1 y conexina_43 forman canales_de_membrana (obligatorias: 9, antes 10). Pendiente
# de validar con el docente.
modelo: red_lacuno_canalicular
hotspots:
  - id: matriz_mineralizada
    etiqueta: "Matriz mineralizada"
    descripcion: "Matriz ósea calcificada que rodea a la red. Se deforma muy poco con la carga; esa deformación crea diferencias de presión en el líquido de los canalículos."
  - id: laguna_osteocitica
    etiqueta: "Laguna osteocítica"
    descripcion: "Cavidad de la matriz que aloja el cuerpo del osteocito. Entre la célula y la pared queda una fina capa de líquido."
  - id: cuerpo_osteocito
    etiqueta: "Cuerpo del osteocito"
    descripcion: "Cuerpo celular del osteocito, con núcleo y organelos reducidos respecto al osteoblasto. Produce esclerostina y otras señales."
  - id: procesos_dendriticos
    etiqueta: "Procesos dendríticos"
    descripcion: "Prolongaciones finas del osteocito que recorren los canalículos y se conectan con las de otros osteocitos. Su membrana es donde actúa el esfuerzo cortante del flujo."
  - id: canaliculos
    etiqueta: "Canalículos y espacio pericelular"
    descripcion: "Conductos de menos de un micrómetro de diámetro que salen de las lagunas y alojan los procesos. Forman la red por la que se mueve el líquido. Entre la membrana del proceso y la pared del canalículo queda el espacio pericelular, muy estrecho, con líquido intersticial y matriz pericelular: por aquí circula el flujo que activa al osteocito. En el modelo, el líquido es el manguito translúcido, exagerado para que se vea."
  - id: fibras_de_anclaje
    etiqueta: "Fibras de anclaje e integrinas"
    descripcion: "Elementos transversales que unen la membrana del proceso con la pared del canalículo. En el modelo de Weinbaum, el arrastre del líquido sobre ellas amplifica la deformación local de la membrana. En los puntos de unión, las integrinas, receptores de adhesión, fijan el proceso a la pared canalicular: transmiten la tracción al citoesqueleto y activan señales de adhesión focal."
  - id: cilio_primario
    etiqueta: "Cilio primario"
    descripcion: "Prolongación única en forma de antena que se proyecta desde el cuerpo dentro de la laguna. Se propone como sensor del flujo de líquido; su mecanismo exacto en osteocitos sigue en estudio."
  - id: canales_de_membrana
    etiqueta: "Canales de membrana: Piezo1 y conexina 43"
    descripcion: "Piezo1, de tres aspas, es un canal catiónico mecanosensible: con el estiramiento de la membrana deja entrar cationes, entre ellos Ca²⁺. La conexina 43, en anillos de seis subunidades, forma las uniones comunicantes que conectan procesos de osteocitos vecinos y hemicanales, mitades de esos canales abiertas al medio, que se abren con la deformación y liberan mensajeros como la PGE2."
  - id: capilar_conducto_haversiano
    etiqueta: "Capilar del conducto de Havers"
    descripcion: "Vaso que abastece a los osteocitos de oxígeno y nutrientes. Los canalículos conectan las lagunas con este conducto y con la superficie."
  - id: celulas_revestimiento
    etiqueta: "Células de revestimiento y osteoblastos de superficie"
    descripcion: "Células que cubren la superficie ósea. Reciben las señales del osteocito y, según ellas, forman hueso nuevo o lo preparan para resorción."
  - id: flechas_flujo_liquido
    etiqueta: "Dirección del flujo de líquido"
    descripcion: "Flechas que indican cómo se mueve el líquido cuando la carga cambia: en un sentido al cargar y en el contrario al descargar. Sin cambio de carga no hay flujo. En el modelo, las flechas marcan el sentido al cargar."
  - id: mensajeros_pge2_no
    etiqueta: "Mensajeros PGE2 y óxido nítrico"
    descripcion: "Moléculas que el osteocito libera en respuesta al flujo. Viajan por la red y llegan a la superficie, donde modulan a osteoblastos y osteoclastos."
requeridas:
  - matriz_mineralizada
  - laguna_osteocitica
  - cuerpo_osteocito
  - procesos_dendriticos
  - canaliculos
  - fibras_de_anclaje
  - canales_de_membrana
  - capilar_conducto_haversiano
  - flechas_flujo_liquido
```

##### Actividad m3_quiz_osteocito

```yaml
tipo: quiz
titulo: "Comprueba lo que siente el osteocito"
instrucciones: "Responde las tres preguntas. Recibes la explicación después de cada respuesta."
obligatoria: true
puntaje_max: 30
concepto: "Detección de la carga por el osteocito"
retroalimentacion:
  acierto: "Correcto. Entender que el osteocito siente flujo y no deformación directa es la clave del resto del módulo."
  error: "Repasa la cadena: la carga cambia, el líquido se mueve y el esfuerzo cortante activa al osteocito."
preguntas:
  - id: m3_q_osteo_1
    formato: opcion_multiple
    enunciado: "Según el modelo del flujo lacuno-canalicular, ¿qué estímulo físico activa principalmente a los osteocitos?"
    opciones:
      - id: a
        texto: "El esfuerzo cortante que ejerce el flujo de líquido sobre la membrana de sus procesos."
      - id: b
        texto: "La presión hidrostática estática del líquido dentro de los canalículos, sin flujo."
      - id: c
        texto: "El aumento de la temperatura local del hueso durante la masticación intensa."
      - id: d
        texto: "La fractura completa de la matriz mineralizada por una sobrecarga aguda."
    correcta: a
    explicacion: "La deformación de la matriz mueve el líquido por los canalículos y ese flujo produce esfuerzo cortante sobre la membrana de los procesos. Los osteocitos responden al cortante del flujo más que a la presión estática en sí misma."
    dificultad: 2
    concepto: "Esfuerzo cortante del flujo"
  - id: m3_q_osteo_2
    formato: verdadero_falso
    enunciado: "Una carga estática mantenida en el tiempo es un estímulo osteogénico más potente que una carga dinámica de la misma magnitud."
    correcta: false
    explicacion: "Falso. El flujo de líquido solo existe mientras la carga cambia. Con una carga constante el líquido se redistribuye, el flujo cesa y el estímulo desaparece; por eso las cargas dinámicas son más osteogénicas."
    dificultad: 2
    concepto: "Carga dinámica frente a estática"
  - id: m3_q_osteo_3
    formato: opcion_multiple
    enunciado: "En el modelo de Weinbaum, ¿cuál es la función de las fibras de anclaje (elementos transversales) del espacio pericelular?"
    opciones:
      - id: a
        texto: "Almacenar calcio y fosfato para la mineralización de la matriz vecina."
      - id: b
        texto: "Amplificar la deformación de la membrana del proceso cuando el líquido la arrastra."
      - id: c
        texto: "Sintetizar colágeno tipo I y otras proteínas de la matriz ósea."
      - id: d
        texto: "Reabsorber la matriz de la pared canalicular durante el remodelado."
    correcta: b
    explicacion: "Las fibras de anclaje transmiten el arrastre del líquido a la membrana y amplifican la deformación local, lo que explica cómo una deformación pequeña de la matriz produce una señal celular apreciable."
    dificultad: 3
    concepto: "Amplificación de la deformación"
```

### Seccion 3.5: Sensores y mensajeros (id "m3_5_sensores_mensajeros")

#### Contenido

El osteocito no depende de un único sensor. La mecanotransducción se describe en **cuatro etapas**:

1. **Acoplamiento mecánico:** la carga se convierte en una señal física local (flujo, esfuerzo cortante, deformación de la membrana).
2. **Acoplamiento bioquímico:** los sensores convierten esa señal en una señal química (entrada de Ca²⁺, activación de quinasas).
3. **Transmisión de la señal:** mensajeros y uniones comunicantes llevan la información a otras células.
4. **Respuesta efectora:** osteoblastos y osteoclastos ajustan la formación y la resorción de hueso.

**Sensores del osteocito**

| Sensor | Qué detecta | Qué activa | Matiz |
|---|---|---|---|
| Matriz pericelular y fibras de anclaje | Arrastre del líquido | Transmiten la fuerza y amplifican la deformación de la membrana y del citoesqueleto | Elemento central del modelo de Weinbaum |
| Integrinas (por ejemplo αVβ3) | Tracción entre la matriz y el citoesqueleto en los puntos de unión | Adhesiones focales, FAK y reorganización de la actina | Están en los puntos de unión a la pared canalicular |
| Piezo1 | Estiramiento de la membrana | Entrada de cationes, entre ellos Ca²⁺ (es un canal no selectivo) | Bien documentado en el linaje osteoblástico; en osteocitos maduros la evidencia es mixta [verificar] |
| Cilio primario | Flexión por el flujo; se proyecta desde el cuerpo del osteocito, dentro de la laguna | Se han propuesto rutas con policistinas y Ca²⁺ y otras independientes de Ca²⁺ (adenilil ciclasa 6 y AMPc) [verificar] | Su mecanismo en osteocitos sigue en discusión |
| Conexina 43 (hemicanales y uniones) | Deformación de la membrana y flujo | Hemicanales: liberan PGE2 y ATP. Uniones: pasan iones y moléculas entre células | Es sensor, efector y conector de la red |

**Mensajeros**

- **Ca²⁺ intracelular:** sube en segundos tras el estímulo y puede propagarse como onda por la red a través de las uniones comunicantes.
- **Prostaglandina E2 (PGE2):** se sintetiza mediante las ciclooxigenasas (COX-2 aumenta con el flujo) y se libera por hemicanales de conexina 43. Actúa sobre osteoblastos y osteocitos mediante los receptores EP2 y EP4. Su efecto es dual y depende de la dosis, del receptor y del contexto: con el flujo fisiológico predomina la señal anabólica; en la inflamación y en el lado de compresión ortodóntico estimula RANKL y la resorción [verificar].
- **Óxido nítrico (NO):** lo produce la óxido nítrico sintasa endotelial (eNOS) tras el flujo. En general reduce el reclutamiento y la actividad de los osteoclastos y favorece a los osteoblastos. En los modelos de flujo, el efecto antiosteoclástico se atribuye sobre todo al NO.
- **ATP:** también se libera por hemicanales y actúa sobre receptores purinérgicos.

Estas rutas convergen en dos resultados: acumulación de β-catenina (vía Wnt) y descenso de la esclerostina. Por ejemplo, la PGE2 y el flujo inactivan a GSK3β, una pieza del complejo de destrucción, y así la β-catenina se acumula [verificar]. Es el puente hacia la sección 3.6.

> Atencion: no hay un «sensor único». Los datos experimentales muestran contribuciones de varios sensores y, en algunos casos, resultados que dependen del tipo celular y del tejido. Por ejemplo, en ratones con deleción de Piezo1 en osteoblastos maduros y osteocitos (Dmp1-Cre) hay menos masa ósea y no hay respuesta anabólica a la carga de la tibia. En cambio, con la misma deleción en el hueso alveolar el movimiento ortodóntico no cambió, y otros trabajos atribuyen ese movimiento a Piezo1 de las células del ligamento periodontal [verificar]. Su papel depende del tejido y del tipo celular. Léelo como un sistema redundante.

> Dato: la PGE2 muestra que un mismo mensajero puede tener efectos opuestos. En animales, los inhibidores de COX (como la indometacina) reducen la formación de hueso inducida por carga, lo que apoya su papel anabólico con el flujo. En ortodoncia, la PGE2 del lado de compresión favorece la resorción, y por eso se discute si los antiinflamatorios no esteroideos pueden enlentecer el movimiento dentario [verificar].

> Clinico: las mutaciones en GJA1, el gen de la conexina 43, causan la displasia oculodentodigital, que además de alteraciones oculares, dentales (hipoplasia del esmalte, dientes pequeños) y de los dedos puede acompañarse de engrosamiento de huesos craneofaciales, incluida la mandíbula [verificar].

> Recuerda: los cuatro pasos (acoplamiento mecánico, acoplamiento bioquímico, transmisión y respuesta) son la estructura de la cascada que ordenarás en esta sección.

#### Actividades

##### Actividad m3_multicapa_sensores

```yaml
tipo: multicapa
titulo: "Encuentra los sensores"
instrucciones: "La aplicación te pide un elemento por su nombre y tú lo tocas en el esquema de la membrana del proceso dendrítico (el cilio primario está en el recuadro del cuerpo del osteocito). Al acertar se abre su descripción. Sin ratón, usa Tab para recorrer los elementos y Enter para elegir el que buscas. Identifica los 8 elementos principales; la actividad es opcional y suma puntos."
obligatoria: false
puntaje_max: 20
concepto: "Sensores y mensajeros de la mecanotransducción"
retroalimentacion:
  acierto: "Correcto. Ya sabes ubicar los sensores y mensajeros sobre la membrana del proceso dendrítico."
  error: "Ese no es el elemento buscado. Los sensores están en la membrana del proceso, en el espacio pericelular o, en el caso del cilio primario, en el cuerpo del osteocito; los mensajeros (Ca²⁺, PGE2, NO) están en el interior o salen de la célula."
svg: m3_sensores_mecanicos
modo: identificar
capas:
  - id: membrana_proceso
    etiqueta: "Membrana del proceso dendrítico"
    descripcion: "Membrana plasmática del proceso que recorre el canalículo. Sobre ella actúa el esfuerzo cortante del flujo."
  - id: matriz_pericelular_fibras
    etiqueta: "Matriz pericelular y fibras de anclaje"
    descripcion: "Matriz del espacio pericelular con fibras transversales que anclan el proceso a la pared. Transmiten y amplifican la deformación."
  - id: integrinas
    etiqueta: "Integrinas"
    descripcion: "Receptores de adhesión que unen la matriz con el citoesqueleto de actina en los puntos de unión. Activan adhesiones focales y FAK."
  - id: canal_piezo1
    etiqueta: "Canal Piezo1"
    descripcion: "Canal catiónico mecanosensible que se abre con el estiramiento de la membrana y deja entrar cationes, entre ellos Ca²⁺."
  - id: cilio_primario
    etiqueta: "Cilio primario"
    descripcion: "Prolongación única que actúa como antena del flujo. Se proyecta desde el cuerpo del osteocito, dentro de la laguna (se dibuja en un recuadro aparte). Se han propuesto rutas con policistinas y Ca²⁺ y otras independientes de Ca²⁺ (adenilil ciclasa 6 y AMPc); el mecanismo en osteocitos sigue en discusión [verificar]."
  - id: hemicanal_cx43
    etiqueta: "Hemicanal de conexina 43"
    descripcion: "Mitad de una unión comunicante abierta al espacio extracelular. Se abre con la deformación y libera PGE2 y ATP."
  - id: calcio_intracelular
    etiqueta: "Ca²⁺ intracelular"
    descripcion: "Primer mensajero que sube tras el estímulo. Puede propagarse por la red a través de las uniones comunicantes."
  - id: citoesqueleto_actina
    etiqueta: "Citoesqueleto de actina"
    descripcion: "Red interna que resiste la deformación y comunica las integrinas con el interior de la célula."
  - id: pge2
    etiqueta: "Prostaglandina E2 (PGE2)"
    descripcion: "Mensajero local liberado por hemicanales de conexina 43; con el flujo fisiológico predomina su efecto anabólico. Actúa sobre osteoblastos y osteocitos mediante EP2 y EP4."
  - id: oxido_nitrico
    etiqueta: "Óxido nítrico (NO)"
    descripcion: "Mensajero gaseoso producido por eNOS tras el flujo. En general reduce la actividad de los osteoclastos y favorece a los osteoblastos."
requeridas:
  - matriz_pericelular_fibras
  - integrinas
  - canal_piezo1
  - cilio_primario
  - hemicanal_cx43
  - calcio_intracelular
  - pge2
  - oxido_nitrico
```

##### Actividad m3_columnas_estimulo_respuesta

```yaml
tipo: relacion-columnas
titulo: "Del estímulo mecánico a su respuesta"
instrucciones: "Une cada estímulo o evento (columna izquierda) con el evento físico o la respuesta celular que le corresponde (columna derecha). Toca un elemento de la izquierda y luego uno de la derecha; también puedes arrastrar. Con teclado, usa Tab, Enter para elegir el primero y de nuevo Tab y Enter para su pareja. Sobran dos opciones de la derecha."
obligatoria: true
puntaje_max: 40
concepto: "Estímulos mecánicos y respuestas del osteocito"
retroalimentacion:
  acierto: "Excelente. Relacionaste cada evento mecánico con su respuesta celular, incluido el efecto de la carga y del desuso sobre la esclerostina."
  error: "Alguna pareja no es correcta. Recuerda: la deformación de la matriz empuja el líquido; el estiramiento de la membrana abre Piezo1; la tracción sobre las integrinas activa FAK; el flujo abre hemicanales de conexina 43 y libera PGE2; la carga baja la esclerostina y el desuso la sube; y los mensajeros activan a los osteoblastos."
izquierda:
  - id: l1
    texto: "Deformación de la matriz mineralizada al masticar"
  - id: l2
    texto: "Estiramiento de la membrana del proceso dendrítico"
  - id: l3
    texto: "Tracción de las fibras de anclaje sobre las integrinas"
  - id: l4
    texto: "Flujo de líquido sobre la membrana durante la carga cíclica"
  - id: l5
    texto: "Carga dinámica repetida, con descansos entre ciclos, sobre los osteocitos"
  - id: l6
    texto: "Descarga prolongada (por ejemplo, reposo en cama o ausencia de masticación)"
  - id: l7
    texto: "Mensajeros solubles (PGE2 y óxido nítrico) que llegan a los osteoblastos de la superficie"
derecha:
  - id: r1
    texto: "Presión que empuja el líquido intersticial por los canalículos"
  - id: r2
    texto: "Entrada de Ca²⁺ por un canal catiónico que se abre al estirar la membrana (Piezo1)"
  - id: r3
    texto: "Activación de FAK en las adhesiones focales y reorganización de la actina"
  - id: r4
    texto: "Liberación de PGE2 y ATP por hemicanales de conexina 43"
  - id: r5
    texto: "Descenso de la expresión de SOST en el osteocito, con menos esclerostina"
  - id: r6
    texto: "Aumento de la esclerostina y pérdida del estímulo anabólico"
  - id: r7
    texto: "Los osteoblastos de la superficie aumentan su actividad y la formación de hueso"
  - id: r8
    texto: "Activación del receptor RANK en el propio osteocito"
  - id: r9
    texto: "Hipertrofia de condrocitos con síntesis de colágeno tipo X"
pares:
  - izquierda: l1
    derecha: r1
  - izquierda: l2
    derecha: r2
  - izquierda: l3
    derecha: r3
  - izquierda: l4
    derecha: r4
  - izquierda: l5
    derecha: r5
  - izquierda: l6
    derecha: r6
  - izquierda: l7
    derecha: r7
```

##### Actividad m3_quiz_cascada

```yaml
tipo: quiz
titulo: "Ordena la cascada de señales"
instrucciones: "Ordena la cascada de mecanotransducción y responde dos preguntas cortas. Para ordenar, arrastra los pasos con el dedo o el ratón, o toca un paso y usa los botones Subir y Bajar. Con teclado, pulsa Enter sobre un paso, muévelo con las flechas y vuelve a pulsar Enter para soltarlo."
obligatoria: true
puntaje_max: 40
concepto: "Cascada de mecanotransducción del osteocito"
retroalimentacion:
  acierto: "Muy bien. Tienes la cascada completa, desde la carga hasta la formación de hueso."
  error: "Revisa los cuatro pasos de la mecanotransducción: acoplamiento mecánico, acoplamiento bioquímico, transmisión de la señal y respuesta efectora."
preguntas:
  - id: m3_q_casc_1
    formato: ordenar_pasos
    enunciado: "Ordena los pasos de la cascada de mecanotransducción, desde la carga hasta la respuesta."
    pasos:
      - id: p4
        texto: "Se activan los sensores (Piezo1, integrinas, cilio primario) y aumenta el Ca²⁺ intracelular."
      - id: p1
        texto: "La carga masticatoria deforma ligeramente la matriz mineralizada."
      - id: p6
        texto: "Disminuye la esclerostina y se libera la vía Wnt/β-catenina."
      - id: p3
        texto: "El flujo ejerce esfuerzo cortante sobre los procesos dendríticos, amplificado por las fibras de anclaje."
      - id: p7
        texto: "Los osteoblastos de la superficie aumentan la formación de hueso."
      - id: p2
        texto: "El líquido intersticial es empujado por los canalículos."
      - id: p5
        texto: "Se abren hemicanales de conexina 43 y el osteocito libera PGE2 y óxido nítrico."
    correcta: [p1, p2, p3, p4, p5, p6, p7]
    explicacion: "La secuencia es: deformación de la matriz, flujo de líquido, esfuerzo cortante amplificado por las fibras de anclaje, activación de sensores con entrada de Ca²⁺, liberación de PGE2 y NO por hemicanales de conexina 43, descenso de la esclerostina con activación de Wnt, y formación de hueso por los osteoblastos."
    dificultad: 3
    concepto: "Secuencia de la mecanotransducción"
  - id: m3_q_casc_2
    formato: opcion_multiple
    enunciado: "¿Qué mensajero libera el osteocito a través de hemicanales de conexina 43 en respuesta al flujo de líquido?"
    opciones:
      - id: a
        texto: "Calcitonina, de la glándula tiroides"
      - id: b
        texto: "Hormona paratiroidea (PTH)"
      - id: c
        texto: "Insulina, del páncreas"
      - id: d
        texto: "Prostaglandina E2 (PGE2)"
    correcta: d
    explicacion: "Los hemicanales de conexina 43 se abren con la deformación y liberan PGE2 (y ATP). La calcitonina la producen las células C de la tiroides, la PTH las glándulas paratiroides y la insulina el páncreas; ninguna es un mensajero local del osteocito."
    dificultad: 1
    concepto: "Mensajeros del osteocito"
  - id: m3_q_casc_3
    formato: verdadero_falso
    enunciado: "Piezo1 es un canal catiónico mecanosensible que, al estirarse la membrana, deja entrar cationes como el Ca²⁺."
    correcta: true
    explicacion: "Verdadero. Piezo1 se abre con el estiramiento de la membrana y deja entrar cationes (no es selectivo para el Ca²⁺); el aumento de Ca²⁺ intracelular es el primer mensajero de la cascada."
    dificultad: 1
    concepto: "Piezo1"
```

### Seccion 3.6: Wnt, esclerostina y PTH (id "m3_6_wnt_esclerostina_pth")

#### Contenido

Las señales del osteocito convergen en una vía: **Wnt/β-catenina**, el principal interruptor anabólico del hueso. Su freno local es la **esclerostina**, y la carga mecánica actúa precisamente sobre esa pieza.

**La vía Wnt canónica en el osteoblasto**

| Situación | Receptores | Complejo de destrucción | β-catenina | Resultado |
|---|---|---|---|---|
| Sin Wnt | Frizzled y LRP5/6 sin ligando | Activo (Axin, APC, GSK3β, CK1) | Fosforilada y degradada en el proteasoma | Sin señal |
| Con Wnt | Wnt se une a Frizzled y recluta a LRP5/6 | Inactivado | Se acumula, entra al núcleo y se une a TCF/LEF | Se activan genes de diferenciación y supervivencia del osteoblasto y de osteoprotegerina (OPG), que frena a los osteoclastos |
| Con esclerostina | La esclerostina ocupa LRP5/6 | Sigue activo | Sigue degradada | Señal Wnt bloqueada |

**La esclerostina y la carga**

El osteocito produce esclerostina (producto del gen **SOST**) y la libera hacia la matriz y la superficie. Se une a LRP5/6 e impide que Wnt lo reclute: es un freno local de la formación ósea.

La carga mecánica reduce la esclerostina y la descarga la aumenta. En modelos de ratón, la estimulación mecánica disminuye la expresión de Sost en las regiones que reciben más deformación [verificar], y la descarga la incrementa. Así, la formación se concentra donde se necesita.

**Lo que enseña la genética humana**

| Alteración | Efecto sobre la vía | Fenotipo |
|---|---|---|
| Pérdida de función de LRP5 | Menos señal Wnt | Síndrome de osteoporosis-pseudoglioma: osteoporosis grave de inicio infantil y alteraciones oculares |
| Ganancia de función de LRP5 (por ejemplo, mutaciones que reducen la unión de inhibidores) | Más señal Wnt | Masa ósea alta |
| Pérdida de función de SOST | No hay esclerostina | Esclerosteosis: hueso muy denso, con sobrecrecimiento del cráneo y la mandíbula |
| Deleción de una región reguladora de SOST | Menos esclerostina en el hueso | Enfermedad de van Buchem, de cuadro parecido y más leve |

**PTH: el efecto depende del patrón**

La hormona paratiroidea (PTH) actúa sobre el receptor PTH1R de osteoblastos y osteocitos.

- **PTH intermitente** (una inyección diaria de teriparatida, PTH 1-34): predomina el efecto **anabólico**. La PTH aumenta el AMPc y activa PKA; en el osteocito reduce la transcripción de SOST, de modo que la vía Wnt queda menos frenada, y en el osteoblasto favorece la supervivencia y la diferenciación.
- **PTH continua** (por ejemplo, en el hiperparatiroidismo): predomina el efecto **catabólico**, porque aumenta la relación RANKL/OPG y con ello la resorción.

> Atencion: la carga y la PTH intermitente convergen en la caída de la esclerostina, pero no son idénticas. En ratones, la respuesta ósea a la carga requiere LRP5, mientras que el efecto anabólico de la PTH intermitente no [verificar].

> Dato: la esclerostina no es el único inhibidor de Wnt que ocupa LRP5/6: DKK1 también lo hace, con ayuda de Kremen. Además, LRP4 facilita la acción inhibidora de la esclerostina [verificar].

> Clinico: el romosozumab es un anticuerpo que bloquea la esclerostina. Libera la vía Wnt: aumenta la formación de hueso y reduce la resorción. Está aprobado para la osteoporosis posmenopáusica con alto riesgo de fractura y tiene advertencias de riesgo cardiovascular [verificar]. Es el ejemplo más claro de cómo entender esta vía condujo a un fármaco.

> Clinico: en el hiperparatiroidismo (PTH elevada de forma continua) los maxilares pueden mostrar pérdida de la lámina dura y lesiones radiolúcidas conocidas como tumores pardos.

> Recuerda: Wnt activa, la esclerostina frena, la carga baja la esclerostina y la PTH intermitente también la baja.

#### Actividades

##### Actividad m3_arrastre_wnt

```yaml
tipo: arrastre-molecular
titulo: "Enciende y bloquea la vía Wnt"
instrucciones: "Arrastra cada molécula hasta el receptor que le corresponde y observa el efecto sobre la célula. Prueba primero Wnt, reinicia la escena y prueba la esclerostina para ver cómo bloquea la señal. Hay moléculas que no encajan. Sin arrastrar: toca la molécula y luego toca el receptor. Con teclado: Tab hasta la molécula, Enter para tomarla, Tab hasta el receptor y Enter para soltarla. Usa Reiniciar las veces que quieras."
obligatoria: true
puntaje_max: 50
concepto: "Vía Wnt/β-catenina, esclerostina y PTH"
retroalimentacion:
  acierto: "Correcto. Wnt activa la vía, la esclerostina la bloquea al ocupar LRP5/6 y la PTH intermitente reduce la esclerostina."
  error: "Esa molécula no se acopla ahí. Piensa a qué receptor se une cada una: Wnt a Frizzled, la esclerostina a LRP5/6 y la PTH a su propio receptor."
svg: m3_via_wnt_esclerostina
escena: "Corte de la superficie ósea. Abajo, la membrana de un osteoblasto con tres receptores: Frizzled, LRP5/6 y el receptor de PTH (PTH1R). Dentro del osteoblasto, el complejo de destrucción (Axin, APC, GSK3β) degrada partículas de β-catenina y el núcleo tiene TCF/LEF apagado. A un lado, un osteocito dentro de la matriz que emite partículas de esclerostina y que también lleva un PTH1R en su membrana. Alrededor flotan cinco moléculas que el estudiante puede arrastrar."
moleculas:
  - id: wnt
    nombre: "Wnt"
    descripcion: "Ligando glucoproteico secretado que activa la vía canónica (por ejemplo Wnt1, Wnt3a o Wnt10b)."
  - id: esclerostina
    nombre: "Esclerostina"
    descripcion: "Proteína secretada por el osteocito, producto del gen SOST."
  - id: pth
    nombre: "PTH"
    descripcion: "Hormona paratiroidea, administrada aquí en pulsos intermitentes."
  - id: rankl
    nombre: "RANKL"
    descripcion: "Ligando de la familia del TNF que se une al receptor RANK."
  - id: noggin
    nombre: "Noggin"
    descripcion: "Proteína secretada que se une a BMP en el espacio extracelular."
receptores:
  - id: frizzled
    nombre: "Frizzled"
    descripcion: "Receptor de siete dominios transmembrana que une a Wnt."
  - id: lrp5_6
    nombre: "LRP5/6"
    descripcion: "Correceptor de un solo paso de membrana que Wnt recluta y que la esclerostina puede ocupar."
  - id: pth1r
    nombre: "Receptor de PTH (PTH1R)"
    descripcion: "Receptor acoplado a proteína G presente en osteoblastos y osteocitos. Aparece dos veces en la escena (en la membrana del osteoblasto y en la del osteocito): es el mismo receptor y la PTH puede acoplarse a cualquiera de los dos."
pares:
  - molecula: wnt
    receptor: frizzled
    efecto:
      titulo: "Vía Wnt activada"
      descripcion: "Wnt se une a Frizzled y recluta a LRP5/6. El complejo de destrucción (Axin, APC, GSK3β, CK1) se inactiva, la β-catenina deja de degradarse, se acumula, entra al núcleo y se une a TCF/LEF. Se activan genes que favorecen la diferenciación y la supervivencia del osteoblasto y la síntesis de osteoprotegerina (OPG)."
      que_se_anima: "El complejo de destrucción se apaga y se aleja; los puntos de β-catenina se acumulan, cruzan al núcleo y encienden la capa genes_diana_wnt; sobre la superficie crece una banda de osteoide (capa matriz_osea_superficie)."
  - molecula: esclerostina
    receptor: lrp5_6
    efecto:
      titulo: "Vía Wnt bloqueada"
      descripcion: "La esclerostina se une al extremo extracelular de LRP5/6 e impide que Wnt lo reclute. Sin el complejo Wnt, Frizzled y LRP5/6, el complejo de destrucción sigue activo: la β-catenina se fosforila y se degrada, no llega al núcleo y no se activan los genes diana. Disminuye la formación de hueso."
      que_se_anima: "Las partículas de esclerostina viajan desde el osteocito hasta LRP5/6 y lo tapan; el receptor se ve gris; los puntos de β-catenina desaparecen degradados por el complejo de destrucción. Si el estudiante intenta acoplar Wnt con LRP5/6 ocupado, Wnt rebota y aparece el mensaje «LRP5/6 ocupado por esclerostina»."
  - molecula: pth
    receptor: pth1r
    efecto:
      titulo: "PTH intermitente: efecto anabólico"
      descripcion: "La PTH se une a PTH1R, acoplado a proteína G, y aumenta el AMPc y activa PKA. En el osteocito reduce la transcripción de SOST, de modo que baja la esclerostina y la vía Wnt queda menos frenada; en el osteoblasto favorece la supervivencia y la diferenciación. Con pulsos diarios predomina la formación de hueso; con exposición continua predomina la resorción, porque aumenta la relación RANKL/OPG."
      que_se_anima: "Se iluminan pth1r (osteoblasto) y pth1r_osteocito y aparece un pulso breve de AMPc en cada célula; el osteocito secretor reduce la emisión de partículas de esclerostina y el osteoblasto muestra una marca de supervivencia. Un interruptor opcional pulso/continuo muestra en el modo continuo un aumento de RANKL y un osteoclasto activo cerca de la superficie."
distractores:
  - molecula: rankl
    por_que: "RANKL se une a RANK, el receptor de los precursores de osteoclastos. Ese receptor no está en esta escena y RANKL no activa ni frena la vía Wnt."
  - molecula: noggin
    por_que: "Noggin es un antagonista extracelular de BMP: se une a BMP, no a Frizzled, LRP5/6 ni PTH1R, y no interviene en la vía Wnt."
```

##### Actividad m3_columnas_sost_condiciones

```yaml
tipo: relacion-columnas
titulo: "Condiciones que cambian la vía Wnt"
instrucciones: "Une cada condición (columna izquierda) con su efecto sobre la esclerostina, la vía Wnt o el hueso (columna derecha). Toca un elemento de la izquierda y luego uno de la derecha; también puedes arrastrar. Con teclado, usa Tab y Enter para elegir cada elemento. Sobra una opción de la derecha."
obligatoria: false
puntaje_max: 30
concepto: "Regulación de SOST y de la vía Wnt"
retroalimentacion:
  acierto: "Muy bien. Reconoces cómo la carga, el desuso, la PTH, la genética y los fármacos cambian la vía Wnt."
  error: "Alguna pareja no es correcta. Recuerda que la carga y la PTH intermitente bajan la esclerostina, y que la pérdida de función de SOST y la ganancia de función de LRP5 dan más hueso."
izquierda:
  - id: l1
    texto: "Carga mecánica dinámica adecuada"
  - id: l2
    texto: "Desuso (reposo prolongado, sin carga)"
  - id: l3
    texto: "PTH administrada de forma intermitente"
  - id: l4
    texto: "Pérdida de función de LRP5"
  - id: l5
    texto: "Mutación de LRP5 que reduce la unión de inhibidores (ganancia de función)"
  - id: l6
    texto: "Pérdida de función del gen SOST"
  - id: l7
    texto: "Anticuerpo anti-esclerostina (romosozumab)"
derecha:
  - id: r1
    texto: "Disminuye SOST y aumenta la señal Wnt/β-catenina"
  - id: r2
    texto: "Aumenta SOST y disminuye la señal Wnt"
  - id: r3
    texto: "Reduce SOST mediante AMPc y PKA y favorece la formación de hueso"
  - id: r4
    texto: "Síndrome de osteoporosis-pseudoglioma, con masa ósea muy baja"
  - id: r5
    texto: "Rasgo hereditario de masa ósea alta por resistencia a inhibidores como DKK1 y la esclerostina"
  - id: r6
    texto: "Esclerosteosis: sin esclerostina, con hueso muy denso y sobrecrecimiento de cráneo y mandíbula"
  - id: r7
    texto: "Libera la vía Wnt: aumenta la formación y reduce la resorción"
  - id: r8
    texto: "Aumenta la relación RANKL/OPG y predomina la resorción (PTH continua)"
pares:
  - izquierda: l1
    derecha: r1
  - izquierda: l2
    derecha: r2
  - izquierda: l3
    derecha: r3
  - izquierda: l4
    derecha: r4
  - izquierda: l5
    derecha: r5
  - izquierda: l6
    derecha: r6
  - izquierda: l7
    derecha: r7
```

##### Actividad m3_quiz_wnt_pth

```yaml
tipo: quiz
titulo: "Comprueba Wnt, esclerostina y PTH"
instrucciones: "Responde las tres preguntas y lee la explicación de cada una."
obligatoria: true
puntaje_max: 30
concepto: "Vía Wnt, esclerostina y PTH"
retroalimentacion:
  acierto: "Correcto. Ya puedes explicar cómo la carga y la PTH intermitente liberan la vía Wnt al bajar la esclerostina."
  error: "Repasa la tabla de estados de la vía y recuerda: la esclerostina ocupa LRP5/6, la carga la reduce y la PTH intermitente también."
preguntas:
  - id: m3_q_wnt_1
    formato: opcion_multiple
    enunciado: "¿A qué proteína se une la esclerostina para inhibir la vía Wnt canónica?"
    opciones:
      - id: a
        texto: "Frizzled"
      - id: b
        texto: "β-catenina"
      - id: c
        texto: "LRP5/6"
      - id: d
        texto: "TCF/LEF"
    correcta: c
    explicacion: "La esclerostina se une al correceptor LRP5/6 e impide que Wnt lo reclute. Frizzled es el receptor al que se une Wnt, y β-catenina y TCF/LEF son componentes intracelulares."
    dificultad: 2
    concepto: "Esclerostina y LRP5/6"
  - id: m3_q_wnt_2
    formato: opcion_multiple
    enunciado: "¿Qué ocurre con la esclerostina en un hueso sometido a carga mecánica dinámica adecuada?"
    opciones:
      - id: a
        texto: "Disminuye su expresión, y la vía Wnt queda menos frenada."
      - id: b
        texto: "Aumenta su expresión, y se frena la formación de hueso."
      - id: c
        texto: "No cambia, porque solo la regula la PTH."
      - id: d
        texto: "Se convierte en un activador de Wnt."
    correcta: a
    explicacion: "La carga reduce la expresión de SOST, de modo que hay menos freno sobre la vía Wnt y se favorece la formación de hueso. La descarga produce el efecto contrario."
    dificultad: 1
    concepto: "Regulación de SOST por la carga"
  - id: m3_q_wnt_3
    formato: opcion_multiple
    enunciado: "Un paciente con osteoporosis recibe teriparatida (PTH 1-34) en una inyección diaria. ¿Qué efecto predomina sobre el hueso?"
    opciones:
      - id: a
        texto: "Catabólico: aumenta la relación RANKL/OPG y la resorción."
      - id: b
        texto: "Ninguno, porque la PTH solo actúa sobre el riñón y el intestino."
      - id: c
        texto: "Bloquea la vía Wnt al unirse a LRP5/6 como lo hace la esclerostina."
      - id: d
        texto: "Anabólico: aumenta la formación de hueso y baja la esclerostina."
    correcta: d
    explicacion: "La PTH en pulsos intermitentes, como con una inyección diaria, predomina como anabólica: reduce la esclerostina y favorece a los osteoblastos. La exposición continua es la que produce el efecto catabólico."
    dificultad: 2
    concepto: "PTH intermitente frente a continua"
```

### Seccion 3.7: El mecanostato y la carga en la mandíbula (id "m3_7_mecanostato_mandibula")

#### Contenido

Si el osteocito es el sensor, el **mecanostato** de Frost describe cómo el sistema decide qué hacer. La idea (H. M. Frost, 1987) es que el hueso funciona como un termostato: compara la deformación que recibe con umbrales de referencia y ajusta su masa y su arquitectura hasta que la deformación de uso vuelve al rango deseado. Responde a la **deformación** (strain), no a la fuerza: un hueso grueso y uno delgado soportan la misma fuerza con distinta deformación. Esta idea desarrolla la ley de Wolff (1892): la arquitectura del hueso se adapta a las cargas que soporta.

La deformación se expresa en microdeformaciones (µε): 1000 µε equivalen a una deformación de 0,1 %.

**Las ventanas del mecanostato** (valores aproximados que varían entre fuentes [verificar])

| Ventana | Deformación aproximada | Qué hace el hueso |
|---|---|---|
| Desuso | Por debajo de unos 50 a 100 µε (umbral MESr) [verificar] | Remodelado por desuso: predomina la resorción y se pierde hueso |
| Adaptada | Entre MESr y MESm: unos 100 a 1000-1500 µε; las fuentes difieren [verificar] | Mantenimiento: la formación y la resorción se equilibran |
| Sobrecarga leve | Entre MESm y MESp: unos 1000-1500 a 3000 µε [verificar] | Modelado: aumenta la formación y el hueso se refuerza (el umbral de modelado, MESm, está alrededor de 1000 a 1500 µε) |
| Sobrecarga patológica | Por encima de unos 3000 µε (umbral MESp) [verificar] | Se acumula microdaño y se forma hueso inmaduro reactivo; aumenta el riesgo de fractura por fatiga |

Una carga única que rompe un hueso sano produce deformaciones cercanas a 25 000 µε [verificar]. En la actividad intensa, los huesos de carga alcanzan picos de unos 1000 a 3000 µε; la actividad habitual queda por debajo [verificar]. Los umbrales no son fijos: la edad, las hormonas (como los estrógenos y la PTH), la genética y la nutrición modifican la sensibilidad del sistema [verificar].

**La mandíbula bajo carga**

- **Fuerza de mordida:** la fuerza máxima voluntaria en la región molar es de unos 400 a 600 N en adultos sanos, con diferencias entre estudios, entre sexos y según el método [verificar]. La masticación cotidiana usa solo una parte de esa fuerza [verificar].
- **Cómo se deforma:** en primates, las mediciones con galgas extensiométricas in vivo muestran que el cuerpo mandibular se flexiona en el plano sagital y se tuerce sobre su eje mayor, y que la sínfisis soporta cizallamiento y flexión transversal (el llamado «wishboning») [verificar]. En humanos hay pocas mediciones in vivo, por lo que las zonas del modelo 3D de esta sección son didácticas y cualitativas.
- **Los dientes son parte del sistema:** las fuerzas oclusales llegan al hueso alveolar como tensión, a través del ligamento periodontal. El hueso alveolar depende del diente: se forma con él y se pierde si él se pierde.

**Cuatro situaciones que ilustran el mecanostato** (la de ortodoncia, por analogía)

1. **Desuso.** Al perderse los dientes, el reborde alveolar recibe menos carga, cae en la ventana de desuso y se reabsorbe. En ratas en crecimiento, una dieta blanda produce menor densidad ósea y menor grosor cortical mandibular y menor volumen trabecular del hueso alveolar [verificar]. Por eso se busca devolver carga funcional al hueso, por ejemplo con implantes osteointegrados.
2. **Carga masticatoria.** Con una dieta variada y de consistencia firme, el hueso mandibular se mantiene y se adapta. La masticación es una carga dinámica, la que el osteocito puede detectar.
3. **Ortodoncia.** Una fuerza aplicada a un diente comprime el ligamento periodontal en el lado hacia el que se mueve y lo estira en el lado opuesto. En el **lado de compresión** aumenta RANKL, que producen fibroblastos periodontales y osteocitos, y los osteoclastos reabsorben hueso; la inflamación aséptica local y mediadores como la PGE2 favorecen ese aumento [verificar]. En el **lado de tensión** los osteoblastos forman hueso nuevo. En modelos de rata, la esclerostina es mayor en el lado de compresión [verificar]. Si la fuerza es excesiva, se ocluyen los vasos del ligamento y aparece una zona hialinizada, avascular; el movimiento se detiene hasta que se reabsorbe el hueso vecino por detrás. Aquí el estímulo dominante es la compresión y la tensión del ligamento periodontal (teoría de presión-tensión); su relación con las ventanas del mecanostato es una analogía didáctica, no una medición de µε.
4. **Distracción osteogénica.** Al separar de forma gradual los fragmentos de una osteotomía se induce hueso nuevo en la brecha por tensión (ley de tensión-estrés de Ilizarov). En la mandíbula, el hueso nuevo se forma en su mayor parte por osificación intramembranosa. Un protocolo típico incluye una latencia de unos 5 a 7 días en adultos, un ritmo aproximado de 1 mm al día repartido en dos activaciones y una fase de consolidación de varias semanas [verificar].

> Atencion: más carga no siempre es mejor. Por encima de la ventana adaptada el hueso se refuerza, pero por encima de la ventana de sobrecarga patológica se acumula microdaño.

> Clinico: la parálisis del músculo masetero con toxina botulínica, usada para tratar la hipertrofia del masetero o el bruxismo, se ha asociado en animales y en algunos informes clínicos con pérdida de hueso mandibular, un ejemplo de desuso por menor carga muscular [verificar].

> Dato: el término «modelado» se refiere a la formación o resorción en superficies distintas, que cambia la forma del hueso; el «remodelado» reemplaza tejido en el mismo sitio sin cambiar su forma. Se estudia en el módulo 5.

> Recuerda: el mecanostato compara la deformación con umbrales. Poca deformación: pérdida. Deformación adaptada: mantenimiento. Sobrecarga leve: refuerzo. Sobrecarga patológica: microdaño.

#### Actividades

##### Actividad m3_multicapa_mecanostato

```yaml
tipo: multicapa
titulo: "Las ventanas del mecanostato"
instrucciones: "Explora el gráfico del mecanostato. Toca cada zona o cada umbral para leer qué significa. Con teclado, usa Tab para moverte entre zonas, Enter o Espacio para abrirlas y Esc para cerrarlas. Las cifras son aproximadas. Debes abrir las 6 capas obligatorias."
obligatoria: true
puntaje_max: 20
concepto: "Mecanostato de Frost: ventanas y umbrales"
retroalimentacion:
  acierto: "Bien. Ya sabes ubicar el desuso, el mantenimiento, el refuerzo y la sobrecarga patológica en el gráfico."
  error: "Faltan capas obligatorias. Ábrelas todas para comparar las cuatro ventanas."
svg: m3_mecanostato_ventanas
modo: explorar
capas:
  - id: ventana_desuso
    etiqueta: "Ventana de desuso"
    descripcion: "Deformaciones por debajo de aproximadamente 50 a 100 microdeformaciones [verificar]. El hueso interpreta que le sobra masa: predomina la resorción y se pierde hueso, como con el reposo en cama o al perder los dientes."
  - id: umbral_desuso
    etiqueta: "Umbral de remodelado por desuso (MESr)"
    descripcion: "Umbral mínimo efectivo de remodelado, alrededor de 50 a 100 microdeformaciones [verificar]. Por debajo se activa el remodelado por desuso."
  - id: ventana_adaptada
    etiqueta: "Ventana adaptada (mantenimiento)"
    descripcion: "Entre el umbral de desuso (MESr) y el de modelado (MESm): unas 100 a 1000-1500 microdeformaciones, según la fuente [verificar]. Es el rango de la actividad habitual: el hueso se mantiene y el remodelado repone tejido viejo sin cambiar la masa."
  - id: umbral_modelado
    etiqueta: "Umbral de modelado (MESm)"
    descripcion: "Umbral mínimo efectivo de modelado, entre unas 1000 y 1500 microdeformaciones según la fuente [verificar]. Al superarlo se activa el modelado que añade hueso en las superficies."
  - id: ventana_sobrecarga_leve
    etiqueta: "Ventana de sobrecarga leve"
    descripcion: "Entre el umbral de modelado (MESm) y el de microdaño (MESp): unas 1000-1500 a 3000 microdeformaciones, según la fuente [verificar]. El hueso responde con modelado: más formación y refuerzo de la estructura, como en una persona entrenada."
  - id: umbral_microdano
    etiqueta: "Umbral de microdaño (MESp)"
    descripcion: "Alrededor de 3000 microdeformaciones [verificar]. Por encima, el microdaño se acumula más rápido de lo que se repara."
  - id: ventana_sobrecarga_patologica
    etiqueta: "Ventana de sobrecarga patológica"
    descripcion: "Por encima de unas 3000 microdeformaciones [verificar]. Se acumulan microfracturas y se forma hueso inmaduro reactivo; si la exposición se mantiene aumenta el riesgo de fractura por fatiga."
  - id: zona_fractura
    etiqueta: "Zona de fractura"
    descripcion: "Deformaciones cercanas a 25 000 microdeformaciones, es decir 2,5 % [verificar], que rompen un hueso sano con una sola carga."
requeridas:
  - ventana_desuso
  - ventana_adaptada
  - umbral_modelado
  - ventana_sobrecarga_leve
  - umbral_microdano
  - ventana_sobrecarga_patologica
```

##### Actividad m3_exploracion_mandibula

```yaml
tipo: exploracion-3d
titulo: "Las zonas de mayor carga de la mandíbula"
instrucciones: "Rota la mandíbula con un dedo (o con el ratón), acerca con dos dedos (o con la rueda) y toca un punto marcado para leer qué carga recibe esa zona y cómo se adapta. La coloración de mayor carga es cualitativa y didáctica. Si tu dispositivo no muestra 3D o prefieres otra forma de explorar, usa la lista de zonas junto al modelo: con teclado, Tab para recorrerla y Enter para abrir cada zona. Debes visitar las 7 zonas obligatorias."
obligatoria: true
puntaje_max: 40
concepto: "Zonas de carga de la mandíbula y adaptación ósea"
retroalimentacion:
  acierto: "Muy bien. Ya conectas cada zona de la mandíbula con la carga que recibe: compresión articular en el cóndilo, tracción muscular en el ángulo, flexión en el cuerpo y carga dentaria en el proceso alveolar."
  error: "Aún faltan zonas obligatorias. Visítalas todas: cada una muestra un tipo distinto de carga."
modelo: mandibula
hotspots:
  - id: condilo
    etiqueta: "Cóndilo (cabeza)"
    descripcion: "Articula con el hueso temporal a través del disco articular y recibe carga articular durante la masticación. Contiene el cartílago condilar, sitio de crecimiento de la mandíbula, que responde a la carga funcional mientras dura el crecimiento. Su hueso subcondral se remodela con el uso."
    zona_anatomica: "Extremo posterosuperior de la rama"
  - id: cuello_condilo
    etiqueta: "Cuello del cóndilo"
    descripcion: "Estrechamiento bajo la cabeza donde se concentran las tensiones que se transmiten entre la rama y el cóndilo. Es un sitio frecuente de fractura mandibular; en niños, una lesión aquí puede afectar el crecimiento."
    zona_anatomica: "Unión del cóndilo con la rama"
  - id: apofisis_coronoides
    etiqueta: "Apófisis coronoides"
    descripcion: "Proyección anterior de la rama donde se inserta el músculo temporal. Recibe tracción muscular más que carga oclusal directa, y su desarrollo se relaciona con esa tracción."
    zona_anatomica: "Extremo anterosuperior de la rama"
  - id: rama
    etiqueta: "Rama"
    descripcion: "Lámina ósea vertical entre el ángulo y el cóndilo. Recibe la tracción de los músculos masticadores y transmite las cargas hacia el cóndilo. Es una lámina relativamente delgada."
    zona_anatomica: "Parte vertical de la mandíbula"
  - id: angulo
    etiqueta: "Ángulo"
    descripcion: "Región donde se insertan el masetero, en la cara lateral, y el pterigoideo medial, en la cara medial, que forman un cabestrillo muscular. Recibe tracción y flexión. Es un sitio frecuente de fractura, sobre todo si hay un tercer molar incluido que debilita la zona."
    zona_anatomica: "Unión de la rama con el cuerpo"
  - id: cuerpo_molares
    etiqueta: "Cuerpo (región molar)"
    descripcion: "Parte del cuerpo bajo los molares, por donde se transmiten las fuerzas de masticación desde los dientes. Se flexiona y se tuerce durante la masticación. El conducto del nervio alveolar inferior discurre por esta región."
    zona_anatomica: "Cuerpo mandibular, bajo los molares"
  - id: proceso_alveolar
    etiqueta: "Proceso alveolar"
    descripcion: "Hueso que aloja los alvéolos dentales. Las fuerzas oclusales llegan como tensión a través del ligamento periodontal. Es la zona más dependiente de la carga: se forma con el diente, se reabsorbe si el diente se pierde y es donde actúa la ortodoncia."
    zona_anatomica: "Borde superior del cuerpo, alrededor de las raíces"
  - id: borde_basal
    etiqueta: "Borde basal"
    descripcion: "Borde inferior del cuerpo, con cortical gruesa. Actúa como una viga: soporta tensión y compresión por la flexión del cuerpo durante la masticación."
    zona_anatomica: "Borde inferior del cuerpo"
  - id: sinfisis
    etiqueta: "Sínfisis mentoniana"
    descripcion: "Zona de unión de las dos mitades de la mandíbula. En la masticación soporta cizallamiento y flexión transversal, descritos sobre todo en primates. Es un sitio frecuente de fractura parasinfisaria."
    zona_anatomica: "Línea media anterior"
requeridas:
  - condilo
  - cuello_condilo
  - angulo
  - cuerpo_molares
  - proceso_alveolar
  - borde_basal
  - sinfisis
```

##### Actividad m3_quiz_casos_carga

```yaml
tipo: quiz
titulo: "Casos clínicos de carga y adaptación"
instrucciones: "Responde cuatro casos breves. Aplica el mecanostato y lo que sabes de la mecanotransducción. Recibes la explicación después de cada respuesta."
obligatoria: true
puntaje_max: 40
concepto: "Aplicación clínica del mecanostato"
retroalimentacion:
  acierto: "Muy bien. Aplicas el mecanostato a situaciones reales de la mandíbula."
  error: "Repasa las ventanas del mecanostato y los tres escenarios: desuso, ortodoncia y distracción."
preguntas:
  - id: m3_q_casos_1
    formato: opcion_multiple
    enunciado: "Una paciente edéntula inferior total lleva años sin rehabilitación y su reborde alveolar se ha reabsorbido mucho. ¿Cuál es la explicación más adecuada según el mecanostato?"
    opciones:
      - id: a
        texto: "Sin carga dentaria, el hueso alveolar cae en la ventana de desuso y predomina la resorción."
      - id: b
        texto: "El reborde sufre una sobrecarga patológica permanente por la presión de los tejidos blandos."
      - id: c
        texto: "La falta de PTH intermitente activa directamente la resorción del reborde alveolar."
      - id: d
        texto: "El reborde permanece en la ventana adaptada y por eso pierde masa de forma fisiológica."
    correcta: a
    explicacion: "El hueso alveolar dependía de la carga que le transmitían los dientes; sin rehabilitación la perdió. Sin ella la deformación cae por debajo del umbral de desuso y predomina la resorción. En este caso no hay sobrecarga. La pérdida del reborde es multifactorial (inflamación, factores sistémicos, prótesis mal ajustadas), pero el mecanostato explica el componente de desuso."
    dificultad: 2
    concepto: "Desuso y reborde alveolar"
  - id: m3_q_casos_2
    formato: opcion_multiple
    enunciado: "Durante un tratamiento de ortodoncia se aplica una fuerza a un diente. ¿Qué ocurre en el lado de compresión del ligamento periodontal?"
    opciones:
      - id: a
        texto: "Predomina la formación de hueso nuevo por los osteoblastos."
      - id: b
        texto: "Aumentan los osteoclastos y predomina la resorción del hueso alveolar."
      - id: c
        texto: "Se forma un cartílago secundario como el condilar."
      - id: d
        texto: "No hay cambios, porque el ligamento absorbe toda la fuerza."
    correcta: b
    explicacion: "En el lado de compresión aumenta RANKL y los osteoclastos reabsorben hueso, lo que abre camino al diente. En el lado de tensión predominan los osteoblastos, que forman hueso."
    dificultad: 2
    concepto: "Ortodoncia y remodelado alveolar"
  - id: m3_q_casos_3
    formato: opcion_multiple
    enunciado: "En una distracción osteogénica mandibular, los fragmentos se separan lentamente de forma controlada. ¿Qué principio explica la formación de hueso nuevo en la brecha?"
    opciones:
      - id: a
        texto: "La ausencia total de carga y de tensión en la brecha activa la formación de hueso."
      - id: b
        texto: "La fijación rígida sin ninguna tensión entre los fragmentos, que protege la brecha."
      - id: c
        texto: "La tracción gradual y controlada estimula la formación de hueso (ley de tensión-estrés)."
      - id: d
        texto: "La liberación continua de PTH por el hueso vecino a la brecha."
    correcta: c
    explicacion: "La tracción gradual y controlada es un estímulo mecánico que induce hueso nuevo en la brecha, en la mandíbula sobre todo por osificación intramembranosa. Sin tensión o con movimiento descontrolado el resultado es distinto."
    dificultad: 3
    concepto: "Distracción osteogénica"
  - id: m3_q_casos_4
    formato: opcion_multiple
    enunciado: "Según el mecanostato, ¿qué riesgo aumenta si la deformación del hueso se mantiene por encima de la ventana de sobrecarga patológica?"
    opciones:
      - id: a
        texto: "Se acumula microdaño y aumenta el riesgo de fractura por fatiga."
      - id: b
        texto: "Se pierde hueso por desuso, como ocurre con el reposo prolongado."
      - id: c
        texto: "Aumenta la esclerostina, que frena la resorción y protege al hueso."
      - id: d
        texto: "Ninguno: más carga siempre aumenta la masa ósea y la resistencia."
    correcta: a
    explicacion: "Por encima del umbral de microdaño este se acumula más rápido de lo que se repara y sube el riesgo de fractura por fatiga. La pérdida por desuso corresponde a la deformación insuficiente, y más carga no siempre es mejor."
    dificultad: 2
    concepto: "Sobrecarga patológica"
```

### Seccion 3.8: Cierre y evaluación final (id "m3_8_evaluacion_final")

#### Contenido

Este módulo cuenta una sola historia: **cómo el hueso se construye y cómo decide cuánto construir**.

**Mapa del módulo**

| Sección | Idea central | Palabra clave |
|---|---|---|
| 3.1 Dos rutas | La osificación intramembranosa forma hueso sin molde; la endocondral usa un molde de cartílago. El tejido resultante es el mismo | Andamio previo |
| 3.2 La mandíbula | Cuerpo, rama y proceso alveolar son intramembranosos junto al cartílago de Meckel; el cóndilo es endocondral, por un cartílago secundario | Cartílago guía |
| 3.3 Condensación al hueso laminar | BMP enciende, RUNX2 compromete y osterix madura al osteoblasto; el osteoide se mineraliza y el hueso inmaduro se sustituye por hueso laminar | Programa genético |
| 3.4 El osteocito | La carga mueve el líquido de los canalículos y el esfuerzo cortante activa al osteocito | Flujo |
| 3.5 Sensores y mensajeros | Integrinas, Piezo1, cilio primario y conexina 43 detectan; Ca²⁺, PGE2 y NO transmiten | Cascada |
| 3.6 Wnt, esclerostina y PTH | La carga baja la esclerostina y libera la vía Wnt; la PTH intermitente también la baja | Freno y acelerador |
| 3.7 Mecanostato | El hueso compara la deformación con umbrales y se refuerza, se mantiene o se pierde | Ventanas |

**La historia completa en una cadena**

Carga, flujo de líquido, esfuerzo cortante, sensores, mensajeros (Ca²⁺, PGE2, NO), descenso de la esclerostina, vía Wnt/β-catenina activa, RUNX2 y osterix, osteoblastos, osteoide, mineralización (módulo 4) y remodelado (módulo 5). Con **desuso**, la cadena se invierte: menos flujo, más esclerostina, menos Wnt y menos hueso.

**Evaluación final**

Son 12 preguntas que integran todo el módulo. Cada respuesta muestra una explicación breve al instante. Vale 100 puntos, con penalización por intentos fallidos. Si una pregunta te cuesta, el mentor puede ayudarte a repasar el concepto antes de intentarlo de nuevo.

> Recuerda: la evaluación mide la comprensión de la cadena completa, no la memoria de datos aislados. Si dudas, sigue la cadena desde la carga hasta el hueso.

#### Actividades

##### Actividad m3_evaluacion_final

```yaml
tipo: quiz
titulo: "Evaluación final del módulo 3: Construyendo hueso"
instrucciones: "Responde las 12 preguntas. Hay opción múltiple, verdadero o falso y una pregunta para ordenar pasos. Recibes la explicación justo después de cada respuesta. En la pregunta de ordenar, arrastra los pasos con el dedo o el ratón, o toca un paso y usa los botones Subir y Bajar; con teclado, Enter para tomar un paso, flechas para moverlo y Enter para soltarlo."
obligatoria: true
puntaje_max: 100
concepto: "Integración del módulo 3: formación ósea y mecanotransducción"
retroalimentacion:
  acierto: "Excelente. Dominas cómo se forma el hueso y cómo la carga mecánica regula esa formación. Has completado el módulo Construyendo hueso."
  error: "Repasa las secciones de las preguntas que fallaste; el mentor puede ayudarte con los conceptos que necesitan refuerzo."
preguntas:
  - id: m3_q_fin_1
    formato: opcion_multiple
    enunciado: "¿Qué par de región mandibular y mecanismo de formación es correcto?"
    opciones:
      - id: a
        texto: "Cuerpo: osificación intramembranosa. Cóndilo: osificación endocondral a partir de un cartílago secundario."
      - id: b
        texto: "Cuerpo: osificación endocondral desde una placa de crecimiento. Cóndilo: osificación intramembranosa."
      - id: c
        texto: "Cuerpo y cóndilo: osificación endocondral a partir del cartílago de Meckel, que se convierte en hueso."
      - id: d
        texto: "Cuerpo y cóndilo: osificación intramembranosa directa, sin ningún cartílago en ninguna etapa."
    correcta: a
    explicacion: "El cuerpo se forma por osificación intramembranosa lateral al cartílago de Meckel, y el cóndilo por osificación endocondral a partir de un cartílago secundario propio."
    dificultad: 1
    concepto: "Formación de la mandíbula"
  - id: m3_q_fin_2
    formato: opcion_multiple
    enunciado: "¿Cuál es una característica del hueso inmaduro (fibrilar)?"
    opciones:
      - id: a
        texto: "Láminas paralelas de colágeno con pocos osteocitos alineados entre ellas."
      - id: b
        texto: "Se forma siempre lentamente, y solo sobre una superficie preexistente."
      - id: c
        texto: "Haces de colágeno irregulares y osteocitos numerosos, grandes y redondeados."
      - id: d
        texto: "Predomina en el hueso cortical del adulto sano y se forma lentamente."
    correcta: c
    explicacion: "El hueso inmaduro tiene colágeno irregular y muchos osteocitos, y se forma rápido. Las otras opciones describen el hueso laminar."
    dificultad: 2
    concepto: "Hueso inmaduro y laminar"
  - id: m3_q_fin_3
    formato: opcion_multiple
    enunciado: "Una niña presenta clavículas hipoplásicas, fontanelas abiertas y dientes supernumerarios con erupción retrasada. ¿Qué alteración genética explica el cuadro?"
    opciones:
      - id: a
        texto: "Pérdida de función del gen SOST (sin esclerostina)."
      - id: b
        texto: "Ganancia de función de LRP5 (resistencia a inhibidores)."
      - id: c
        texto: "Defecto congénito de los osteoclastos (osteopetrosis)."
      - id: d
        texto: "Pérdida de función en un solo alelo de RUNX2."
    correcta: d
    explicacion: "Es la displasia cleidocraneal, causada por haploinsuficiencia de RUNX2, el regulador maestro del linaje osteoblástico. La pérdida de SOST y la ganancia de LRP5 dan masa ósea alta, y los defectos de los osteoclastos (ausencia o mala función) causan osteopetrosis."
    dificultad: 2
    concepto: "RUNX2 y displasia cleidocraneal"
  - id: m3_q_fin_4
    formato: verdadero_falso
    enunciado: "El osteocito forma una red conectada por uniones comunicantes y es la célula más abundante del hueso adulto."
    correcta: true
    explicacion: "Verdadero. Los osteocitos son la gran mayoría de las células del hueso adulto y se conectan por sus procesos y por uniones comunicantes (conexina 43), formando una red que detecta la carga y coordina la respuesta."
    dificultad: 1
    concepto: "Red de osteocitos"
  - id: m3_q_fin_5
    formato: opcion_multiple
    enunciado: "¿Por qué una carga estática mantenida estimula poco la formación ósea?"
    opciones:
      - id: a
        texto: "Porque destruye de inmediato a los osteocitos que soportan la carga mantenida."
      - id: b
        texto: "Porque sin cambio de carga el líquido de los canalículos deja de fluir y no hay esfuerzo cortante."
      - id: c
        texto: "Porque bloquea el receptor de PTH en la superficie de los osteoblastos."
      - id: d
        texto: "Porque una carga mantenida no genera ninguna deformación en la matriz."
    correcta: b
    explicacion: "El estímulo es el flujo, y el flujo requiere que la carga cambie. Una carga constante lo anula. El hueso sí se deforma, pero sin cambio no hay flujo."
    dificultad: 3
    concepto: "Carga dinámica frente a estática"
  - id: m3_q_fin_6
    formato: opcion_multiple
    enunciado: "¿Qué papel cumplen los hemicanales de conexina 43 en la respuesta del osteocito a la carga?"
    opciones:
      - id: a
        texto: "Transportan la PTH desde la superficie hasta el núcleo del osteocito."
      - id: b
        texto: "Sintetizan esclerostina a partir del gen SOST dentro del núcleo."
      - id: c
        texto: "Se abren con la deformación y liberan mensajeros como la PGE2."
      - id: d
        texto: "Unen a Wnt con Frizzled en la membrana del osteoblasto."
    correcta: c
    explicacion: "Los hemicanales de conexina 43 se abren con la deformación mecánica y liberan PGE2 y ATP, que transmiten la señal a otras células. Las otras funciones no corresponden a la conexina 43."
    dificultad: 2
    concepto: "Conexina 43 y PGE2"
  - id: m3_q_fin_7
    formato: opcion_multiple
    enunciado: "¿Cuál es la secuencia correcta del efecto de la carga sobre la vía Wnt?"
    opciones:
      - id: a
        texto: "La carga aumenta la esclerostina, y por eso aumenta la señal Wnt y la formación de hueso."
      - id: b
        texto: "La carga activa RANK en el osteocito, lo que aumenta la señal Wnt y la formación de hueso."
      - id: c
        texto: "La carga reduce LRP5, lo que aumenta la señal Wnt y la formación de hueso."
      - id: d
        texto: "La carga baja la esclerostina, Wnt/β-catenina queda menos frenada y aumenta la formación ósea."
    correcta: d
    explicacion: "La carga baja la expresión de SOST, de modo que hay menos esclerostina ocupando LRP5/6, Wnt puede activar su vía y aumenta la formación ósea."
    dificultad: 2
    concepto: "Carga, esclerostina y Wnt"
  - id: m3_q_fin_8
    formato: ordenar_pasos
    enunciado: "Ordena los pasos de la activación de la vía Wnt canónica, del primero al último."
    pasos:
      - id: p3
        texto: "La β-catenina no se degrada y se acumula en el citoplasma."
      - id: p5
        texto: "Se activan genes que favorecen la formación de hueso, como los de diferenciación del osteoblasto y de OPG."
      - id: p1
        texto: "Wnt se une a Frizzled y recluta a LRP5/6."
      - id: p4
        texto: "La β-catenina entra al núcleo y se une a TCF/LEF."
      - id: p2
        texto: "El complejo de destrucción (Axin, APC, GSK3β) se inactiva."
    correcta: [p1, p2, p3, p4, p5]
    explicacion: "Wnt se une a Frizzled y recluta a LRP5/6, con lo que se inactiva el complejo de destrucción. La β-catenina se acumula, entra al núcleo, se une a TCF/LEF y activa los genes diana."
    dificultad: 3
    concepto: "Vía Wnt canónica"
  - id: m3_q_fin_9
    formato: verdadero_falso
    enunciado: "La PTH administrada de forma continua tiene el mismo efecto anabólico que la administrada de forma intermitente."
    correcta: false
    explicacion: "Falso. La PTH intermitente predomina como anabólica, porque baja la esclerostina y favorece a los osteoblastos. La exposición continua aumenta la relación RANKL/OPG y predomina la resorción."
    dificultad: 2
    concepto: "PTH intermitente frente a continua"
  - id: m3_q_fin_10
    formato: opcion_multiple
    enunciado: "Un paciente con pérdida de función de SOST tiene un hueso muy denso. ¿Qué otro hallazgo es característico?"
    opciones:
      - id: a
        texto: "Osteoporosis grave de inicio infantil con alteraciones oculares."
      - id: b
        texto: "Sobrecrecimiento del cráneo y de la mandíbula."
      - id: c
        texto: "Displasia cleidocraneal con dientes supernumerarios."
      - id: d
        texto: "Fragilidad ósea con escleróticas azules."
    correcta: b
    explicacion: "Sin esclerostina la vía Wnt no está frenada y el hueso crece en exceso: es la esclerosteosis, con sobrecrecimiento craneofacial, incluida la mandíbula. La osteoporosis con alteración ocular es el síndrome de osteoporosis-pseudoglioma (pérdida de LRP5)."
    dificultad: 3
    concepto: "SOST y esclerosteosis"
  - id: m3_q_fin_11
    formato: opcion_multiple
    enunciado: "Según el mecanostato de Frost, ¿qué ocurre si la deformación del hueso se mantiene por debajo del umbral de desuso?"
    opciones:
      - id: a
        texto: "El hueso forma más masa ósea para compensar."
      - id: b
        texto: "El hueso se mantiene igual, porque solo responde a la fuerza y no a la deformación."
      - id: c
        texto: "Se acumula microdaño y aumenta el riesgo de fractura por fatiga."
      - id: d
        texto: "Predomina la resorción y el hueso pierde masa."
    correcta: d
    explicacion: "Con deformación insuficiente el hueso entra en remodelado por desuso: predomina la resorción y se pierde masa. El microdaño corresponde a la sobrecarga patológica."
    dificultad: 2
    concepto: "Mecanostato: ventana de desuso"
  - id: m3_q_fin_12
    formato: opcion_multiple
    enunciado: "En un tratamiento de ortodoncia con una fuerza excesiva, el diente deja de moverse durante varias semanas. ¿Qué lo explica mejor?"
    opciones:
      - id: a
        texto: "El exceso de fuerza estimula la formación de hueso en el lado de compresión y ese hueso nuevo bloquea al diente."
      - id: b
        texto: "El hueso alveolar entra en la ventana de desuso y por eso deja de responder al estímulo mecánico."
      - id: c
        texto: "La fuerza bloquea el receptor RANK de los osteoclastos, de modo que no hay resorción en ningún lado."
      - id: d
        texto: "Se ocluyen los vasos del ligamento y aparece una zona hialinizada que frena el movimiento hasta que se reabsorbe el hueso vecino."
    correcta: d
    explicacion: "Con una fuerza excesiva se comprimen y ocluyen los vasos del ligamento periodontal y aparece una zona hialinizada, avascular. El movimiento se detiene hasta que los osteoclastos la eliminan por resorción desde el hueso vecino. Por analogía, es el equivalente ortodóntico de una carga excesiva."
    dificultad: 3
    concepto: "Ortodoncia: zona hialinizada"
```

## Glosario

| Término | Definición |
|---|---|
| Osteoide | Matriz orgánica del hueso recién secretada y aún no mineralizada; contiene sobre todo colágeno tipo I. |
| Osteoblasto | Célula formadora de hueso; secreta el osteoide y regula su mineralización. |
| Osteocito | Osteoblasto incluido en la matriz mineralizada; forma una red, detecta la carga y coordina la respuesta ósea. |
| Osificación intramembranosa | Formación de hueso directamente en mesénquima condensado, sin molde de cartílago. |
| Osificación endocondral | Formación de hueso sobre un molde de cartílago que se calcifica y es sustituido. |
| Condensación mesenquimatosa | Agrupación densa de células mesenquimatosas que precede a la formación de hueso o cartílago. |
| Cartílago de Meckel | Barra de cartílago hialino del primer arco faríngeo que guía la formación de la mandíbula y forma el martillo y el yunque. |
| Cartílago secundario | Cartílago que aparece tarde sobre hueso ya formado, con condrocitos derivados del periostio e independiente de un molde primario; ejemplos: condilar, coronoideo y sinfisario. |
| Collar óseo | Manguito de hueso que forma el periostio alrededor de la diáfisis por osificación intramembranosa. |
| Placa de crecimiento | Cartílago entre diáfisis y epífisis, organizado en zonas, que permite el crecimiento en longitud. |
| Hueso inmaduro (fibrilar) | Hueso de formación rápida con colágeno irregular y osteocitos numerosos; se sustituye por hueso laminar. |
| Hueso laminar | Hueso organizado en láminas de colágeno paralelo; es el hueso maduro del adulto. |
| BMP | Proteína morfogenética ósea; factor de crecimiento de la superfamilia TGF-β que induce la diferenciación osteoblástica. |
| Smad | Proteínas intracelulares que transmiten la señal de BMP (Smad1/5/8 con Smad4) hasta el núcleo. |
| RUNX2 | Factor de transcripción maestro del linaje osteoblástico; su pérdida parcial causa displasia cleidocraneal. |
| Osterix (SP7) | Factor de transcripción que actúa después de RUNX2 y lleva al preosteoblasto a osteoblasto maduro. |
| Noggin | Antagonista extracelular de BMP. |
| Sistema lacuno-canalicular | Red de lagunas y canalículos que aloja a los osteocitos y sus procesos y por la que circula el líquido intersticial. |
| Espacio pericelular | Espacio muy estrecho entre la membrana del proceso del osteocito y la pared del canalículo, lleno de líquido y matriz pericelular. |
| Esfuerzo cortante | Fuerza por unidad de superficie que ejerce un fluido al deslizar sobre una superficie; es el estímulo del flujo sobre la membrana del osteocito. |
| Mecanotransducción | Conversión de una señal mecánica en una respuesta bioquímica y celular. |
| Integrina | Receptor de adhesión que une la matriz extracelular con el citoesqueleto y transmite señales mecánicas. |
| Piezo1 | Canal catiónico mecanosensible que se abre con el estiramiento de la membrana y deja entrar cationes, entre ellos Ca²⁺. |
| Cilio primario | Prolongación única en forma de antena que se propone como sensor del flujo de líquido. |
| Conexina 43 | Proteína que forma uniones comunicantes y hemicanales; los hemicanales liberan PGE2 y ATP con la deformación. |
| Hemicanal | Mitad de una unión comunicante, abierta al medio extracelular. |
| Prostaglandina E2 (PGE2) | Mensajero lipídico que el osteocito libera con el flujo; con el flujo fisiológico favorece la formación de hueso, y en la inflamación o la compresión ortodóntica favorece la resorción. |
| Óxido nítrico (NO) | Mensajero gaseoso producido por eNOS con el flujo; en general reduce la actividad de osteoclastos y favorece a osteoblastos. |
| Wnt | Familia de ligandos que activan la vía canónica de β-catenina, principal vía anabólica del hueso. |
| β-catenina | Proteína que, al acumularse en el citoplasma y entrar al núcleo, activa junto con TCF/LEF los genes diana de Wnt. |
| Frizzled | Receptor de siete dominios transmembrana que une a Wnt. |
| LRP5 y LRP6 | Correceptores de Wnt; también son el sitio donde se une la esclerostina. |
| Esclerostina (SOST) | Proteína producida por osteocitos maduros que se une a LRP5/6 y frena la vía Wnt y la formación de hueso. |
| Osteoprotegerina (OPG) | Proteína que actúa como señuelo de RANKL y frena la formación de osteoclastos. |
| RANKL | Ligando que se une a RANK en los precursores de osteoclastos y estimula la resorción. |
| PTH | Hormona paratiroidea; en pulsos intermitentes es anabólica y de forma continua es catabólica. |
| Teriparatida | Fragmento 1-34 de la PTH, usado en inyección diaria para tratar la osteoporosis. |
| Romosozumab | Anticuerpo que bloquea la esclerostina. |
| Mecanostato | Teoría de Frost según la cual el hueso ajusta su masa comparando la deformación con umbrales. |
| Microdeformación (µε) | Unidad de deformación: una millonésima de la longitud; 1000 µε equivalen a 0,1 %. |
| Ley de Wolff | Principio (1892) según el cual la arquitectura del hueso se adapta a las cargas que soporta. |
| Modelado | Formación o resorción en superficies distintas que cambia la forma y la masa del hueso. |
| Remodelado | Reemplazo de hueso viejo por hueso nuevo en el mismo sitio, sin cambiar su forma. |
| Desuso | Reducción de la carga sobre el hueso, que lleva a pérdida ósea. |
| Distracción osteogénica | Separación gradual de los fragmentos de una osteotomía que induce hueso nuevo por tensión. |
| Hialinización | Zona avascular y necrótica del ligamento periodontal que aparece con fuerzas ortodónticas excesivas. |

## Referencias

Solo se citan obras reales y estándar. Los artículos son trabajos fundacionales citados por autor, título, revista y año; no se incluyen páginas, DOI ni enlaces. Las ediciones se indican solo cuando se conocen con certeza.

**Textos de histología, anatomía y embriología**

1. Ross MH, Pawlina W. *Histology: A Text and Atlas, with Correlated Cell and Molecular Biology*. 8.ª edición.
2. Mescher AL. *Junqueira's Basic Histology: Text and Atlas*.
3. Nanci A. *Ten Cate's Oral Histology: Development, Structure, and Function*.
4. Sperber GH, Sperber SM, Guttmann GD. *Craniofacial Embryogenetics and Development*. 2.ª edición.
5. Moore KL, Persaud TVN, Torchia MG. *The Developing Human: Clinically Oriented Embryology*.
6. Standring S (ed.). *Gray's Anatomy: The Anatomical Basis of Clinical Practice*.

**Biología ósea y mecánica**

7. Bilezikian JP, Martin TJ, Clemens TL, Rosen CJ (eds.). *Principles of Bone Biology*. 4.ª edición.
8. Hall BK. *Bones and Cartilage: Developmental and Evolutionary Skeletal Biology*. 2.ª edición.
9. Currey JD. *Bones: Structure and Mechanics*.
10. Cowin SC (ed.). *Bone Mechanics Handbook*. 2.ª edición.
11. Hall JE, Hall ME. *Guyton and Hall Textbook of Medical Physiology*.

**Crecimiento facial y ortodoncia**

12. Enlow DH, Hans MG. *Essentials of Facial Growth*.
13. Proffit WR, Fields HW, Larson BE, Sarver DM. *Contemporary Orthodontics*. 6.ª edición.

**Artículos fundacionales**

14. Frost HM. «Bone "mass" and the "mechanostat": a proposal». *The Anatomical Record*, 1987.
15. Frost HM. «Bone's mechanostat: a 2003 update». *The Anatomical Record Part A*, 2003.
16. Lanyon LE, Rubin CT. «Static vs dynamic loads as an influence on bone remodelling». *Journal of Biomechanics*, 1984.
17. Rubin CT, Lanyon LE. «Regulation of bone mass by mechanical strain magnitude». *Calcified Tissue International*, 1985.
18. Duncan RL, Turner CH. «Mechanotransduction and the functional response of bone to mechanical strain». *Calcified Tissue International*, 1995.
19. Weinbaum S, Cowin SC, Zeng Y. «A model for the excitation of osteocytes by mechanical loading-induced bone fluid shear stresses». *Journal of Biomechanics*, 1994.
20. Cherian PP, Siller-Jackson AJ, Gu S, Wang X, Bonewald LF, Sprague E, Jiang JX. «Mechanical strain opens connexin 43 hemichannels in osteocytes: a novel mechanism for the release of prostaglandin». *Molecular Biology of the Cell*, 2005.
21. Dallas SL, Prideaux M, Bonewald LF. «The osteocyte: an endocrine cell ... and more». *Endocrine Reviews*, 2013.
22. Robling AG, Niziolek PJ, Baldridge LA, et al. «Mechanical stimulation of bone in vivo reduces osteocyte expression of Sost/sclerostin». *Journal of Biological Chemistry*, 2008.
23. Sawakami K, Robling AG, Ai M, et al. «The Wnt co-receptor LRP5 is essential for skeletal mechanotransduction but not for the anabolic bone response to parathyroid hormone treatment». *Journal of Biological Chemistry*, 2006.
24. Li X, Han L, Nookaew I, et al. «Stimulation of Piezo1 by mechanical signals promotes bone anabolism». *eLife*, 2019.
25. Malone AM, Anderson CT, Tummala P, et al. «Primary cilia mediate mechanosensing in bone cells by a calcium-independent mechanism». *Proceedings of the National Academy of Sciences*, 2007.
26. Nottmeier C, et al. «Mechanical-induced bone remodeling does not depend on Piezo1 in dentoalveolar hard tissue». *Scientific Reports*, 2023.

## Banco de preguntas para el mentor

Preguntas extra, distintas de las del módulo, para que el mentor refuerce un concepto. Las respuestas son la versión resumida que el mentor debe dar o esperar.

**B1.** ¿Qué es el osteoide y en qué se diferencia de la matriz mineralizada?
- Respuesta: es la matriz orgánica recién secretada por los osteoblastos (colágeno tipo I y proteínas no colágenas) que todavía no tiene cristales de hidroxiapatita. La matriz mineralizada es ese mismo material ya calcificado.
- Dificultad: 1
- Concepto: osteoide

**B2.** ¿De qué estructura embrionaria se forman el martillo y el yunque?
- Respuesta: del extremo posterior del cartílago de Meckel, que se osifica por vía endocondral. No forma parte de la mandíbula.
- Dificultad: 2
- Concepto: cartílago de Meckel

**B3.** ¿Qué diferencia hay entre un cartílago primario y uno secundario?
- Respuesta: el primario es un molde que se forma antes del hueso (por ejemplo, el de un hueso largo o el de Meckel). El secundario aparece más tarde sobre hueso ya formado, con condrocitos que derivan del periostio, de manera independiente (condilar, coronoideo y sinfisario).
- Dificultad: 2
- Concepto: cartílagos secundarios

**B4.** ¿Qué hace osterix y qué pasa si falta?
- Respuesta: actúa después de RUNX2 y lleva al preosteoblasto a osteoblasto maduro. En ratones sin Sp7 se forma cartílago pero no hueso, porque los precursores no maduran a osteoblastos.
- Dificultad: 2
- Concepto: RUNX2 y osterix

**B5.** ¿Por qué se dice que el osteocito responde al flujo y no a la deformación directa de la matriz?
- Respuesta: la deformación de la matriz con cargas fisiológicas es muy pequeña para activar a una célula por sí sola. El flujo de líquido que provoca produce esfuerzo cortante sobre la membrana de los procesos, y las fibras de anclaje amplifican la deformación local, lo que sí es suficiente.
- Dificultad: 3
- Concepto: flujo lacuno-canalicular

**B6.** Nombra tres sensores mecánicos del osteocito.
- Respuesta: integrinas en los puntos de unión, canal Piezo1, cilio primario y conexina 43 (hemicanales); también la matriz pericelular con las fibras de anclaje. Basta con tres.
- Dificultad: 1
- Concepto: sensores del osteocito

**B7.** ¿Qué efecto tiene el óxido nítrico en el hueso tras el flujo de líquido?
- Respuesta: lo produce la eNOS con el flujo y, en general, reduce el reclutamiento y la actividad de los osteoclastos y favorece a los osteoblastos, con lo que apoya una respuesta anabólica.
- Dificultad: 2
- Concepto: mensajeros del osteocito

**B8.** ¿En qué se parecen y en qué se diferencian la ganancia de función de LRP5 y la pérdida de función de SOST?
- Respuesta: en ambas hay más señal Wnt y masa ósea alta. En la ganancia de LRP5 el receptor resiste a inhibidores como DKK1 y la esclerostina. En la pérdida de SOST no hay esclerostina, y el cuadro (esclerosteosis) cursa con sobrecrecimiento craneofacial, incluida la mandíbula.
- Dificultad: 3
- Concepto: LRP5 y SOST

**B9.** ¿Cómo se explica que la PTH intermitente sea anabólica y la continua catabólica?
- Respuesta: con pulsos, predomina el efecto sobre osteoblastos y osteocitos: baja la esclerostina y favorece la formación. Con exposición continua aumenta la relación RANKL/OPG, se activan los osteoclastos y predomina la resorción.
- Dificultad: 3
- Concepto: PTH

**B10.** ¿Qué ocurre con la esclerostina cuando el hueso deja de recibir carga y qué consecuencia tiene?
- Respuesta: aumenta la expresión de SOST, la vía Wnt queda más frenada y disminuye la formación de hueso, lo que contribuye a la pérdida por desuso.
- Dificultad: 2
- Concepto: SOST y desuso

**B11.** ¿Qué ventanas define el mecanostato de Frost?
- Respuesta: desuso (pérdida de hueso), adaptada (mantenimiento), sobrecarga leve (modelado y refuerzo) y sobrecarga patológica (microdaño). Los valores son aproximados y varían entre fuentes.
- Dificultad: 2
- Concepto: mecanostato

**B12.** ¿Por qué la PGE2 puede favorecer la formación de hueso con el flujo y la resorción en el lado de compresión de un diente en movimiento?
- Respuesta: su efecto es dual y depende de la dosis, del receptor (EP2 y EP4) y del contexto. Con flujo fisiológico predomina la señal anabólica; con inflamación local y en el lado de compresión ortodóntico estimula RANKL y la resorción. Por eso los antiinflamatorios no esteroideos pueden reducir la formación de hueso inducida por carga y, posiblemente, enlentecer el movimiento dentario.
- Dificultad: 3
- Concepto: PGE2 dual

**B13.** ¿Por qué la distracción osteogénica se hace con un ritmo lento y controlado?
- Respuesta: la tensión gradual induce formación de hueso en la brecha. Si es demasiado rápida, la brecha se llena de tejido fibroso o no consolida; si es demasiado lenta, la brecha puede consolidar de forma prematura antes de lograr el alargamiento.
- Dificultad: 3
- Concepto: distracción osteogénica

**B14.** ¿Qué es el collar óseo en un hueso largo?
- Respuesta: un manguito de hueso que los osteoblastos del pericondrio forman alrededor de la diáfisis, por osificación intramembranosa, antes de que los vasos invadan el cartílago.
- Dificultad: 1
- Concepto: collar óseo

**B15.** ¿Qué diferencia hay entre modelado y remodelado?
- Respuesta: el modelado forma o reabsorbe hueso en superficies distintas y cambia la forma y la masa. El remodelado reemplaza hueso viejo por hueso nuevo en el mismo sitio y no cambia la forma. Se profundiza en el módulo 5.
- Dificultad: 2
- Concepto: modelado y remodelado

**B16.** ¿Por qué se reabsorbe el hueso alveolar cuando se pierde un diente?
- Respuesta: porque el diente transmitía la carga al hueso alveolar a través del ligamento periodontal. Sin ella, la deformación cae al rango de desuso, sube la esclerostina y predomina la resorción.
- Dificultad: 2
- Concepto: desuso alveolar

**B17.** ¿Qué célula produce la esclerostina y dónde?
- Respuesta: el osteocito maduro, dentro de la matriz mineralizada. La secreta hacia la matriz y la superficie, donde frena la vía Wnt de los osteoblastos.
- Dificultad: 1
- Concepto: esclerostina

## Ganchos para el mentor

**Conceptos clave del módulo**

- Las dos rutas comparten al osteoblasto y al osteoide; cambia el andamio previo.
- Mandíbula: cuerpo, rama y proceso alveolar son intramembranosos; el cóndilo es endocondral por un cartílago secundario; Meckel es guía.
- Cadena genética: BMP enciende, RUNX2 compromete, osterix madura.
- Hueso inmaduro es rápido y desordenado; el laminar es lento y organizado.
- El osteocito siente el flujo de líquido (esfuerzo cortante), no la deformación directa.
- La carga debe ser dinámica; la estática casi no estimula.
- Cascada: carga, flujo, sensores, Ca²⁺, PGE2 y NO, esclerostina baja, Wnt activa, formación de hueso.
- La esclerostina frena Wnt al ocupar LRP5/6; la carga y la PTH intermitente la reducen.
- Mecanostato: desuso, adaptada, sobrecarga leve, sobrecarga patológica.

**Errores frecuentes y cómo aclararlos**

| Error frecuente | Por qué ocurre | Cómo aclararlo |
|---|---|---|
| «La osificación endocondral produce un hueso distinto» | Se confunde el origen con el tejido | Insistir en que el tejido final es el mismo; cambia solo el andamio previo. Pedir que nombre el andamio de cada ruta |
| «La mandíbula se forma por osificación del cartílago de Meckel» | Se oye «Meckel» y «mandíbula» juntos | Aclarar que Meckel es guía y el hueso se forma a su lado por vía intramembranosa; solo su extremo posterior forma martillo y yunque |
| «El cóndilo es intramembranoso como el resto» | Se generaliza desde el cuerpo | Recordar el cartílago condilar secundario y su zona hipertrófica |
| «Osterix actúa antes que RUNX2» | Se memoriza la lista sin el orden | Usar la cadena BMP, RUNX2, osterix y la evidencia de los ratones sin Sp7 |
| «Hueso inmaduro es hueso malo o de una persona joven» | El nombre induce a error | Explicar que describe el colágeno; es el hueso rápido del feto y del callo, luego se sustituye |
| «El osteoblasto es el sensor de la carga» | El osteoblasto es la célula que se nombra primero | Preguntar quién está dentro de la matriz y forma una red; el osteocito percibe y coordina, el osteoblasto ejecuta |
| «El osteocito siente la presión o la deformación directa» | Se imagina una célula que se aplasta | Recordar el flujo y el esfuerzo cortante, y que sin cambio de carga no hay flujo |
| «Una carga mantenida es más potente» | Se confunde magnitud con duración | Preguntar qué pasa con el líquido si la carga no cambia |
| «La PGE2 solo forma hueso» | Se recuerda solo su papel anabólico con el flujo | Explicar el efecto dual: anabólica con flujo fisiológico, pro-resortiva en la inflamación y en el lado de compresión ortodóntico; preguntar qué pasaría con un antiinflamatorio |
| «Piezo1 es el único sensor» | Se simplifica la cascada | Nombrar los otros sensores y aclarar que hay redundancia y matices según el tipo celular |
| «La esclerostina promueve la formación de hueso» | Se confunde con una proteína de la matriz | Recordar que es un freno de Wnt: ocupa LRP5/6; por eso el anticuerpo que la bloquea aumenta la formación |
| «La PTH siempre forma hueso» | Se recuerda solo el uso terapéutico | Preguntar por el patrón: intermitente anabólica, continua catabólica |
| «Más carga siempre es mejor» | Se interpreta el mecanostato como lineal | Mostrar la ventana de sobrecarga patológica y el microdaño |
| «El mecanostato responde a la fuerza» | Se confunden fuerza y deformación | Comparar un hueso grueso y uno delgado con la misma fuerza |
| «En ortodoncia el hueso se reabsorbe en el lado de tensión» | Se invierten los lados | Recordar: compresión, resorción; tensión, formación |

**Pistas por sección**

- 3.1 y 3.2: si el estudiante dice que no distingue las rutas, preguntar «¿había un molde de cartílago?» antes de dar la respuesta.
- 3.3: pedir que cuente la historia de una trabécula desde la condensación hasta el hueso laminar.
- 3.4 y 3.5: pedir que ordene con sus palabras la cascada y que diga qué sentiría el osteocito si la carga fuera constante.
- 3.6: pedir que explique qué le pasa a la β-catenina en cada estado y qué haría la esclerostina en la escena.
- 3.7: dar un caso (edéntulo, ortodoncia o distracción) y pedir que lo ubique en las ventanas del mecanostato.

## Notas de verificacion para el docente

Los datos siguientes se redactaron a partir de textos estándar y de una contrastación en la literatura, pero varían entre fuentes o son aproximados. Conviene confirmarlos antes de publicar. Los marcados con [verificar] en el cuerpo del texto corresponden a estos puntos.

**Sección 3.1**

1. Destino de los condrocitos hipertróficos. Los textos clásicos describen que el cartílago calcificado es sustituido. Estudios de rastreo genético en ratones indican que parte de esos condrocitos podría convertirse en osteoblastos y osteocitos. Confirmar cómo se quiere presentar el punto en el nivel de pregrado.

**Sección 3.2**

2. Semana de aparición del cartílago de Meckel (sexta semana) y del primer centro de osificación mandibular (semanas 6 a 7). Las fuentes varían ligeramente. En el texto se fijó la convención de semanas de desarrollo contadas desde la fecundación (la edad gestacional, contada desde la última menstruación, suma unas 2 semanas); confirmar que coincide con la del curso.
3. Semana de aparición del cartílago condilar (10 a 12 semanas) y edad de fin de su crecimiento (adolescencia tardía o inicio de la adultez). Las fuentes varían y el fin del crecimiento depende del individuo.
4. Contribución endocondral del extremo anterior del cartílago de Meckel. Los textos clásicos lo describen como incorporado al cuerpo y en parte reabsorbido; trabajos recientes describen un componente endocondral. Decidir qué versión enseñar.
5. Número y nombre de los cartílagos secundarios. Los textos citan el condilar, el coronoideo y el sinfisario; algunos añaden el angular. Confirmar la lista, el carácter transitorio del coronoideo y la afirmación de que el cartílago condilar no ordena sus condrocitos en columnas regulares, a diferencia de la placa de crecimiento.
6. Momento de osificación de la sínfisis (primer año de vida).
7. Afirmación clínica sobre fracturas condilares infantiles y alteración del crecimiento. Confirmar el énfasis con un cirujano maxilofacial.
8. Rango del dibujo de `m3_mandibula_desarrollo` (semanas 10 a 14 de desarrollo, aproximado).

**Sección 3.3**

9. Proporción del colágeno tipo I en la matriz orgánica (aproximadamente 90 %). Los textos usan 90 % o «más del 90 %».
10. Aprobación de la FDA de rhBMP-2 en 2007 para elevación de seno y aumento del reborde en defectos de alvéolos postextracción, y sus efectos adversos locales. Es una aprobación de Estados Unidos: confirmar la situación regulatoria del país del curso.

**Sección 3.4**

11. Proporción de osteocitos entre las células del hueso adulto: 90 a 95 % en textos clásicos y más de 95 % en revisiones recientes. Vida media de los osteocitos: décadas.
12. Diámetro de los canalículos (menos de 1 µm; valores típicos de cientos de nanómetros) y número de procesos por osteocito (decenas; entre 40 y 100 aproximadamente).
13. Deformación de la matriz: unos cientos de µε en la actividad habitual y picos de 1000 a 3000 µε (0,1 a 0,3 %) en la actividad intensa. Depende del hueso, de la especie y de la actividad.
14. Esfuerzo cortante estimado en el sistema lacuno-canalicular (0,8 a 3 Pa) y amplificación de la deformación en el proceso (hasta unas 10 veces). Son valores de modelos teóricos con supuestos geométricos; los valores experimentales varían.

**Sección 3.5**

15. Participación de las integrinas en la apertura de hemicanales de conexina 43 (evidencia en cultivos celulares). Se retiró del cuerpo del texto para no crear ambigüedad con la actividad `m3_columnas_estimulo_respuesta`; puede reintroducirse como tema de profundización.
16. Papel de Piezo1. Con Dmp1-Cre (osteoblastos maduros y osteocitos) hay menos masa ósea y falta la respuesta anabólica a la carga de la tibia (Li 2019); con la misma deleción en el hueso alveolar el movimiento ortodóntico no cambió, y otro trabajo atribuye ese movimiento a Piezo1 del ligamento periodontal. Dmp1-Cre no es específico de osteocitos. Presentar el punto con matices.
17. Mecanismo del cilio primario del osteocito: rutas dependientes de Ca²⁺ y policistinas frente a rutas independientes de Ca²⁺ (adenilil ciclasa 6 y AMPc). El trabajo fundacional en hueso (2007) propuso un mecanismo independiente de Ca²⁺ (una corrección de 2008 sobre la quelación del calcio no cambió su conclusión principal). TRPV4 se retiró del texto por falta de respaldo en osteocitos. Sigue en discusión.
18. Efecto de los antiinflamatorios no esteroideos sobre la respuesta a la carga y el movimiento ortodóntico. La evidencia en animales es más sólida que en humanos.
19. Manifestaciones craneofaciales de la displasia oculodentodigital, incluido el engrosamiento mandibular.

**Sección 3.6**

20. Disminución regional de Sost con la carga (evidencia en ratones).
21. Dependencia de LRP5 de la respuesta a la carga frente a la PTH intermitente (evidencia en ratones; su extrapolación a humanos y el papel de otros correceptores no están cerrados).
22. Indicación aprobada y advertencias de seguridad cardiovascular del romosozumab. Confirmar con la ficha regulatoria vigente en el país.

**Sección 3.7**

23. Umbrales del mecanostato: umbral de remodelado por desuso (50 a 100 µε), ventana adaptada (100 o 200 a 1500 µε según la fuente), umbral de modelado (1000 a 1500 µε), umbral de microdaño (aproximadamente 3000 µε). En el texto, la ventana adaptada va entre MESr y MESm (unos 100 a 1000-1500 µε) y la de sobrecarga leve entre MESm y MESp, de modo que no se solapan; los límites exactos dependen de la fuente.
24. Deformación de fractura (aproximadamente 25 000 µε) y picos fisiológicos de la actividad intensa (1000 a 3000 µε).
25. Modificación de los umbrales por hormonas, edad y genética. Es una propuesta teórica de Frost.
26. Fuerza máxima de mordida en molares (400 a 600 N): los estudios publicados van de aproximadamente 300 a 650 N según el método, la edad y el sexo. La fracción de esa fuerza que se usa al masticar varía con el alimento.
27. Patrón de deformación mandibular (flexión, torsión y «wishboning» en la sínfisis): los datos in vivo provienen sobre todo de primates. Confirmar cuánto de esto se puede afirmar para humanos.
28. Efecto de la dieta blanda en ratas en crecimiento sobre la densidad y el grosor cortical mandibular (evidencia animal).
29. Mayor esclerostina en el lado de compresión durante el movimiento ortodóntico (estudios en ratas; hay variaciones).
30. Parámetros de la distracción osteogénica mandibular (latencia de 5 a 7 días en adultos, ritmo de 1 mm al día, consolidación de semanas): varían con la edad, el sitio y el protocolo.
31. Pérdida de hueso mandibular tras toxina botulínica en el masetero (evidencia animal e informes clínicos).

**Añadidos en el ajuste tras la revisión científica**

32. Duración estimada del módulo (60 a 90 minutos): es una estimación por el número de actividades y la extensión del texto; confirmar con una prueba piloto.
33. Efecto dual de la PGE2 (anabólica con flujo fisiológico; pro-resortiva en la inflamación y en el lado de compresión ortodóntico), secciones 3.5 y 3.7. Depende de la dosis, del receptor y del contexto.
34. Inactivación de GSK3β por la PGE2 y el flujo como vía hacia la acumulación de β-catenina (evidencia sobre todo en cultivos de células óseas).
35. LRP4 como facilitador de la acción de la esclerostina y DKK1 como segundo inhibidor de LRP5/6 (sección 3.6).
36. Papel de la inflamación aséptica y de la PGE2 en el aumento de RANKL del lado de compresión ortodóntico (sección 3.7).

**Cifras y afirmaciones que conviene confirmar aunque no llevan marca**

- Función del cartílago coronoideo como cartílago secundario transitorio y su relación con la tracción del temporal.
- Las descripciones de la displasia cleidocraneal (retraso eruptivo, dientes supernumerarios) y de la esclerosteosis (sobrecrecimiento mandibular): son descripciones estándar, pero conviene contrastarlas con el texto de referencia del curso.
- Las afirmaciones sobre el hiperparatiroidismo y la pérdida de la lámina dura (signo descrito, pero variable).


## Registro de revision

Revisión científica independiente (34 preguntas de quiz y 115 afirmaciones revisadas). Los datos discutidos se contrastaron con las fuentes originales: Li 2019 (eLife) usó Dmp1-Cre y encontró pérdida de la respuesta anabólica a la carga de la tibia; el trabajo de Sci Rep 2023 con la misma deleción no halló cambio en el movimiento ortodóntico; Malone 2007 (PNAS) propuso que el cilio primario actúa por un mecanismo independiente de Ca²⁺ (con una corrección de 2008 sobre la quelación del calcio que no cambió su conclusión); la FDA aprobó rhBMP-2 en 2007 para elevación de seno y aumento del reborde en defectos de alvéolos postextracción.

| Hallazgo | Decisión | Razón breve |
|---|---|---|
| 1. Parejas ambiguas en `m3_columnas_estimulo_respuesta` (l2, l3, l4; r1 no es respuesta celular) | Aceptado | Se reescribieron l4, r2, r3, r4 y r7 con el mecanismo; se sacó la mención de integrinas hacia conexina 43 del cuerpo (queda en la nota 15); título, instrucciones y texto de error ahora dicen «evento o respuesta» y reflejan las parejas reales |
| 2. Piezo1 en osteocitos y movimiento ortodóntico (3.5, ref. 24) | Aceptado | Verificado: Li 2019 usa Dmp1-Cre y muestra pérdida de la respuesta a la carga; lo que no cambió es el movimiento ortodóntico (Sci Rep 2023). Se reescribió la Atención y la nota 16, y se añadió la ref. 26 |
| 3. Mecanismo del cilio primario (Ca²⁺, policistinas, TRPV4) | Aceptado | Verificado: Malone 2007 propone un mecanismo independiente de Ca²⁺. Se presentan ambas hipótesis con [verificar], se retiró TRPV4 y se añadió la ref. 25 |
| 4. PGE2 presentada solo como anabólica; r7 y B7 | Aceptado | Se añadió el efecto dual en 3.5 y en la actividad; r7 ya no atribuye menor reclutamiento de osteoclastos a la PGE2 (se atribuye al NO); el Dato de AINE se explica por ese efecto; B12 pasó a tratar el efecto dual |
| 5. Cuerpo frente a proceso alveolar (`m3_columnas_mandibula_origen` l1/r1, l5/r5) | Aceptado | r1 se precisó como lámina lateral a Meckel que forma la base del cuerpo, y r5 como hueso que depende del diente |
| 6. Cilio dibujado sobre el proceso dendrítico (`m3_sensores_mecanicos`) | Aceptado | El cilio va en un recuadro con el cuerpo del osteocito; se corrigieron la tabla de ilustraciones, sus notas, la descripción de la capa y el texto de error |
| 7. Consolidación de fracturas (3.1) | Aceptado | Se reescribió: directa con fijación rígida, callo endocondral con movimiento moderado y tejido fibroso o pseudoartrosis con movimiento excesivo |
| 8. rhBMP-2: jurisdicción y dos indicaciones (3.3) | Aceptado | Verificado: aprobación de la FDA en 2007 para elevación de seno y aumento del reborde en alvéolos postextracción. Se aclaró que es de Estados Unidos y se actualizó la nota 10 |
| 9. Explicación de `m3_q_casos_1` | Aceptado | Se explica que no hay sobrecarga en este caso y que la pérdida del reborde es multifactorial, con el desuso como componente que explica el mecanostato |
| 10. 1000-3000 µε frente a ventana adaptada y umbral MESm (3.4 y 3.7) | Aceptado | 3.4 y 3.7 hablan de picos en actividad intensa; la ventana adaptada va entre MESr y MESm (100 a 1000-1500 µε) y la de sobrecarga leve entre MESm y MESp; se actualizaron tabla, capas, notas 13, 23 y 24 |
| 11. Ortodoncia dentro del mecanostato (3.7) | Aceptado | Se declaró la teoría de presión-tensión y que la relación con las ventanas es una analogía; se añadió el papel de la inflamación y la PGE2 en RANKL |
| 12. Piezo1 es un canal catiónico no selectivo | Aceptado | Se cambió en tabla, capas, glosario y en la pregunta `m3_q_casc_3` y su explicación |
| 13. PTH1R solo en el osteoblasto (`m3_arrastre_wnt`) | Aceptado | Se añadió la capa `pth1r_osteocito`; sigue un solo receptor `pth1r` (mismo receptor, dos copias en la escena) para no alterar el motor; la animación baja la esclerostina desde el PTH1R del osteocito |
| 14. `m3_arrastre_bmp` se reduce a elegir una de tres | Parcial | Se detalló la animación en cinco tiempos con etiquetas y el rebote de noggin; no se añadió una segunda fase porque el motor de arrastre solo define pares molécula-receptor. Queda como mejora opcional |
| 15. Duración de 45 a 60 minutos y densidad de 3.4 a 3.6 | Parcial | Se declararon 60 a 90 minutos (nota 32); no se redujo la tabla de sensores porque el nivel incluye posgrado y la densidad «Alta» es la declarada; las actividades opcionales ya lo son |
| 16. `m3_multicapa_sensores` opcional pero con «Debes identificar» | Aceptado | Ahora dice «Identifica los 8 elementos principales; la actividad es opcional y suma puntos» |
| 17. `m3_q_fin_10` delata la respuesta y `m3_q_fin_12` repite `m3_q_casos_2` | Aceptado | Se quitó «(esclerosteosis)» de la opción; fin_12 es ahora una pregunta de aplicación sobre la zona hialinizada (dificultad 3) |
| 18. `m3_q_fin_3` sobre la osteopetrosis | Aceptado | La opción c y la explicación hablan de defecto de osteoclastos (ausencia o mala función) |
| 19. Displasia cleidocraneal y el odontólogo (3.3) | Aceptado | Se reemplazó por «en algunos pacientes... son el motivo de consulta odontológica que lleva al diagnóstico» |
| 20. Omisiones: IHH/PTHrP, DKK1 y LRP4, PGE2/β-catenina | Aceptado | Se añadió un párrafo en 3.1, un Dato en 3.6 y una frase en 3.5 (GSK3β), con [verificar] donde corresponde (notas 34 y 35) |
| 21. Convención de semanas (3.2) | Aceptado | Se fijó «semanas de desarrollo contadas desde la fecundación» en el texto, en la ilustración y en la nota 2 |
