# Modulo 5: Renovando el hueso

> BORRADOR redactado por IA, pendiente de validacion del docente. Redactado el 2026-09-23 y ajustado el 2026-09-24 tras una revision cientifica independiente (ver "Registro de revision" al final). Fuente pedagogica: docs/briefing-pedagogico.md. Las cifras marcadas con [verificar] varian entre fuentes o son aproximadas y estan listadas en la seccion "Notas de verificacion para el docente".

## Ficha

- **Foco:** Remodelado, reparación y equilibrio óseo.
- **Densidad:** Alta.
- **Duración estimada:** 90 a 120 minutos, repartidos en 2 o 3 sesiones (recorrido típico de 116 minutos; ver la tabla de tiempos). Los bloques «Para profundizar» y las actividades opcionales alargan el recorrido. Los tiempos deben probarse con estudiantes [verificar].
- **Sesiones sugeridas:** sesión 1, secciones 5.1 a 5.3 (44 min); sesión 2, secciones 5.4 a 5.6 (46 min); sesión 3, secciones 5.7 y 5.8 (26 min).
- **Nivel:** pregrado y posgrado. El texto base sirve para ambos niveles; las preguntas de dificultad 3 y los avisos "Clinico" profundizan para posgrado y para estudiantes de odontología y cirugía oral.
- **Logro que se otorga al completarlo:** Remodelador (id `remodelador`).
- **Requisitos previos:** módulos 1 a 4 (células óseas, osteoblasto, matriz y mineralización). Este módulo reutiliza esos conceptos y no los vuelve a explicar.
- **Secciones:** 8 (7 de contenido y una evaluación final).
- **Actividades:** 26 en total, 20 obligatorias. Puntaje máximo del módulo: 790 puntos.
- **Regla sugerida para otorgar el logro:** completar todas las actividades obligatorias y alcanzar al menos el 70 % del puntaje de la evaluación final. Es una propuesta; la regla global del OVA la define el equipo.

**Tiempos por sección**

| Sección | Tema | Minutos aproximados |
|---|---|---|
| 5.1 | La BMU y el ciclo de remodelado | 18 |
| 5.2 | El eje RANK, RANKL y OPG, y el M-CSF | 14 |
| 5.3 | Acoplamiento y esclerostina | 12 |
| 5.4 | Hormonas que regulan el remodelado | 12 |
| 5.5 | Hueso cortical, trabecular y alveolar: el movimiento ortodóntico | 18 |
| 5.6 | Reparación: fractura y alveolo postextracción | 16 |
| 5.7 | Equilibrio óseo y sus alteraciones | 14 |
| 5.8 | Evaluación final | 12 |
| | **Total** | **116** |

**Interacción por tipo de actividad (vale para todo el módulo; ninguna función depende solo del hover)**

| Tipo | Ratón | Táctil | Teclado |
|---|---|---|---|
| multicapa | El hover resalta la capa; el clic la fija y muestra su texto | Un toque fija la capa y abre su texto; otro toque en el fondo la cierra | Tab recorre las capas en orden; Enter o Espacio abre el texto; Esc lo cierra |
| arrastre-molecular | Arrastrar la molécula hasta el receptor | Arrastre con un dedo; alternativa de dos toques (tocar la molécula y luego el receptor) | Tab elige molécula; Enter la toma; Tab elige receptor; Enter la suelta |
| relacion-columnas | Clic en un elemento de cada columna, o arrastre | Toque en un elemento de la izquierda y luego en uno de la derecha | Tab recorre; Enter selecciona; Tab hasta la otra columna; Enter empareja |
| quiz | Clic en una opción; en ordenar pasos, arrastre o botones subir y bajar | Toque en una opción; en ordenar pasos, arrastre o botones subir y bajar | Flechas y Enter; en ordenar pasos, Enter selecciona y las flechas arriba y abajo mueven, o botones subir y bajar |
| video-texto | Botones Anterior y Siguiente; clic en la barra de pasos | Botones Anterior y Siguiente o deslizar; toque en la barra de pasos | Flechas izquierda y derecha; Espacio pausa el avance automático |
| exploracion-3d | Arrastrar para girar, rueda para acercar, clic en un hotspot | Un dedo gira, dos dedos acercan o alejan, toque en un hotspot | Flechas giran, +/- acercan, Tab recorre una lista equivalente de hotspots, Enter abre el texto |

**Convenciones de datos de este guion**

- Los ids de secciones, actividades, capas, moléculas y hotspots están en snake_case sin tildes. Los textos que lee el estudiante llevan tildes.
- Los avisos dentro del contenido usan las etiquetas literales `Clinico:`, `Dato:`, `Atencion:` y `Recuerda:` al inicio de una cita. La interfaz debe mostrarlas con su nombre acentuado (Clínico, Atención).
- En quiz de formato `opcion_multiple`, `correcta` es el id de la opción. En `verdadero_falso`, `correcta` es `verdadero` o `falso` y no hay lista de opciones. En `ordenar_pasos`, `pasos` viene en el orden correcto (la interfaz debe barajarlos) y `correcta` repite ese orden como lista de ids.
- En multicapa con `modo: identificar`, el campo `consignas` indica qué capa debe tocar el estudiante para cada enunciado. En `modo: explorar` no hay consignas: el estudiante visita las capas `requeridas`.
- El campo `interaccion` de cada actividad resume el uso con ratón, táctil y teclado, en línea con la tabla anterior.
- La etiqueta `[verificar]` es una marca para el docente, no para el estudiante. Al transcribir a datos, debe guardarse como metadato (por ejemplo, un campo `verificar: true` en el texto afectado) y no mostrarse en la interfaz hasta que el docente valide la cifra.
- Los bloques encabezados con «Para profundizar (plegable; no se evalúa)» agrupan genes y señales secundarias que no son necesarios para las ideas centrales. Al transcribir a datos, deben guardarse como bloque plegable (por ejemplo, un campo `profundizar: true`) y no deben aparecer en ninguna pregunta de la evaluación final.
- En multicapa de modo `explorar` el puntaje es menor (20), porque solo mide la visita de las capas; la comprobación de la comprensión está en la actividad siguiente de la misma sección.
- El puntaje de una actividad se reparte entre sus elementos (capas, acoples, pares o preguntas) y se descuenta por intentos fallidos según la regla global del motor de actividades.

## Objetivos de aprendizaje

Al terminar el módulo, el estudiante podrá:

1. **Describir** la unidad multicelular básica (BMU) y **ordenar** las seis fases del ciclo de remodelado (quiescencia, activación, resorción, inversión, formación y mineralización), con su duración aproximada.
2. **Explicar** cómo M-CSF, RANKL, RANK y OPG controlan la formación de osteoclastos y **predecir** qué ocurre cuando cambia la relación RANKL/OPG.
3. **Explicar** cómo la resorción activa la formación en el mismo sitio (acoplamiento) y cómo la esclerostina frena la vía Wnt en los osteoblastos.
4. **Relacionar** la PTH, los estrógenos, la calcitonina y la vitamina D con su efecto sobre el remodelado y sobre la masa ósea.
5. **Comparar** el recambio del hueso cortical, trabecular y alveolar, y **localizar** las zonas de tensión y compresión durante el movimiento ortodóntico con su respuesta celular.
6. **Secuenciar** la reparación de una fractura y la cicatrización de un alveolo postextracción, y **distinguir** osteopetrosis, enfermedad de Paget y osteoporosis por su desequilibrio de remodelado.

## Conexion con el hueso mandibular

La mandíbula es un lugar privilegiado para estudiar el remodelado, porque reúne tres condiciones que otros huesos no tienen juntas. Aloja dientes, y el hueso que los rodea (el hueso alveolar) depende de ellos y se remodela a un ritmo alto. Recibe cargas masticatorias y ortodónticas que se pueden medir y modificar. Y está expuesta a la cavidad oral, de modo que las infecciones, las extracciones y los tratamientos farmacológicos que alteran el remodelado tienen consecuencias visibles.

| Sección | Cómo se aplica a la mandíbula |
|---|---|
| 5.1 | Las BMU trabajan como osteonas en la cortical basal y como hemiosteonas en el hueso esponjoso del proceso alveolar. El remodelado es más intenso junto al ligamento periodontal. |
| 5.2 | En la periodontitis, la inflamación aumenta RANKL y reduce OPG en el tejido gingival y periodontal, y el resultado es pérdida de hueso alveolar. |
| 5.3 | Al perder los dientes, el proceso alveolar deja de recibir carga y se atrofia. Las mutaciones que anulan la esclerostina (esclerosteosis, enfermedad de van Buchem) engruesan la mandíbula. |
| 5.4 | El hiperparatiroidismo deja huella en los maxilares (pérdida de la lámina dura y tumores pardos). La deficiencia de vitamina D retrasa la erupción y altera la mineralización dentaria. |
| 5.5 | El movimiento ortodóntico es remodelado provocado: resorción en el lado de compresión y formación en el lado de tensión del hueso alveolar. |
| 5.6 | Las fracturas mandibulares y los alvéolos postextracción cicatrizan con fases similares a las de otros huesos (con fijación estable, la fractura mandibular forma poco cartílago). La pérdida de reborde tras una extracción condiciona la rehabilitación con implantes. |
| 5.7 | En la osteopetrosis, los dientes no erupcionan bien y la mandíbula es propensa a la osteomielitis. En la enfermedad de Paget, la afectación maxilar hace que las prótesis dejen de ajustar. En la osteoporosis, el grosor de la cortical mandibular en la radiografía panorámica sirve como indicio. |
| 5.8 | Integración: el estudiante razona casos clínicos de la región oral con lo aprendido. |

## Ilustraciones y modelos requeridos

Todas las imágenes se producen como SVG multicapa: cada capa es un grupo `<g>` con el id indicado. Las células van en SVG. El único modelo 3D es la mandíbula, una sola malla, con hotspots con nombre (no hay piezas separadas).

| id de archivo | Qué muestra | Se usa en |
|---|---|---|
| `m5_bmu_cortical_longitudinal` | Corte longitudinal de una BMU cortical: cono de corte, zona de inversión y cono de cierre | 5.1 (video-texto) |
| `m5_ciclo_remodelado_bmu` | Las seis fases del ciclo de remodelado sobre una superficie ósea trabecular, una capa por fase | 5.1 (multicapa) |
| `m5_osteoclastogenesis_rank_rankl_opg` | Precursor de osteoclasto, célula osteoblástica con RANKL, M-CSF, RANK, c-Fms y OPG | 5.2 (video-texto y arrastre) |
| `m5_acoplamiento_matriz_esclerostina` | Laguna de resorción con factores liberados de la matriz, células reclutadas, osteoblasto y osteocito con esclerostina | 5.3 (multicapa y arrastre) |
| `m5_hormonas_regulacion_calcemia` | Esquema de la calcemia con paratiroides, tiroides, riñón, intestino, hueso y ovario | 5.4 (multicapa) |
| `m5_hueso_cortical_trabecular_alveolar` | Corte transversal del cuerpo mandibular a nivel de un premolar con sus tipos de hueso | 5.5 (multicapa) |
| `m5_movimiento_ortodontico_pdl` | Corte de una raíz dentaria con ligamento periodontal y hueso alveolar bajo una fuerza ortodóntica | 5.5 (multicapa) |
| `m5_reparacion_fractura_fases` | Fractura con hematoma, callo blando, callo duro y remodelado del callo | 5.6 (video-texto) |
| `m5_cicatrizacion_alveolo_fases` | Alveolo postextracción desde el coágulo hasta la remodelación del reborde | 5.6 (multicapa) |
| `m5_equilibrio_remodelado_alteraciones` | Cuatro paneles de hueso: normal, osteopetrosis, enfermedad de Paget y osteoporosis | 5.7 (multicapa) |

**Ilustración `m5_bmu_cortical_longitudinal`**

Corte longitudinal de una osteona en formación. La BMU avanza de derecha a izquierda. A la derecha queda el hueso ya renovado y a la izquierda el hueso aún sin remodelar.

| id de capa | Etiqueta | Qué se dibuja |
|---|---|---|
| `hueso_cortical_previo` | Hueso cortical previo | Laminillas paralelas al eje, osteonas antiguas seccionadas y osteocitos en sus lagunas |
| `capilar_central` | Capilar y conducto central | Un capilar que recorre el eje de la BMU, con sus células endoteliales |
| `cono_de_corte` | Cono de corte | Punta de la BMU con osteoclastos multinucleados de borde festoneado y pared de resorción irregular |
| `zona_de_inversion` | Zona de inversión | Células mononucleares de inversión y una línea de cemento irregular |
| `cono_de_cierre` | Cono de cierre | Osteoblastos cuboidales en fila, con una banda de osteoide pálido entre ellos y el hueso mineralizado |
| `osteona_nueva` | Osteona nueva | Laminillas concéntricas mineralizadas, osteocitos incluidos y conducto central con capilar |
| `direccion_de_avance` | Dirección de avance | Flecha que indica el sentido en que se mueve la BMU |

Notas de precisión anatómica:
- Los osteoclastos van siempre delante y los osteoblastos detrás. El orden no puede invertirse en el dibujo.
- El túnel es cilíndrico y mide aproximadamente 200 µm de diámetro; la barra de escala debe indicar «aprox.» y no dar una cifra más precisa.
- La línea de cemento debe verse festoneada (escalonada), no recta: es el contorno de las lagunas de resorción.
- El osteoide se dibuja más claro que el hueso mineralizado y solo en el cono de cierre.
- Texto alternativo sugerido: «Corte longitudinal de una unidad multicelular básica cortical, con osteoclastos delante, zona de inversión y osteoblastos detrás formando una osteona nueva».

**Ilustración `m5_ciclo_remodelado_bmu`**

Franja horizontal de una superficie de hueso trabecular con médula ósea debajo o al costado. De izquierda a derecha se dibuja la secuencia de una BMU: cada fase ocupa un tramo. Es una representación de la BMU en el espacio y en el tiempo.

| id de capa | Etiqueta | Qué se dibuja |
|---|---|---|
| `superficie_osea_base` | Superficie ósea base (no interactiva) | Hueso trabecular mineralizado y médula; sirve de fondo |
| `fase_quiescencia` | Quiescencia | Células de revestimiento aplanadas sobre una capa fina de matriz no mineralizada; osteocitos en el interior |
| `fase_activacion` | Activación | Células de revestimiento retraídas y formando un techo (canopy); precursores mononucleares llegando desde un capilar |
| `fase_resorcion` | Resorción | Osteoclasto multinucleado con zona de sellado y borde festoneado sobre una laguna de Howship |
| `fase_inversion` | Inversión | Laguna vacía tapizada por células de inversión mononucleares; línea de cemento escalonada |
| `fase_formacion` | Formación | Fila de osteoblastos cuboidales y una banda de osteoide rellenando la laguna |
| `fase_mineralizacion` | Mineralización | Osteoide oscurecido por depósito mineral y un osteocito recién incluido; células de revestimiento volviendo a cubrir la superficie |

Notas de precisión anatómica:
- Debe verse un solo osteoclasto grande con varios núcleos (la célula más grande del dibujo) y osteoblastos mucho más pequeños, en fila.
- La laguna de Howship es cóncava y de contorno festoneado.
- La línea de cemento aparece en la fase de inversión y permanece en las fases siguientes, visible como una línea oscura entre el hueso viejo y el nuevo.
- Las células de revestimiento son planas, con núcleo alargado; los osteoblastos activos son cuboidales.
- Texto alternativo sugerido: «Seis fases del ciclo de remodelado sobre una superficie ósea: quiescencia, activación, resorción, inversión, formación y mineralización».

**Ilustración `m5_osteoclastogenesis_rank_rankl_opg`**

Escena de una superficie ósea con dos células frente a frente: una célula de linaje osteoblástico arriba (con RANKL en su membrana) y un precursor mononuclear de osteoclasto abajo (con los receptores RANK y c-Fms). La misma escena sirve para el video-texto y para el arrastre molecular.

| id de capa | Etiqueta | Qué se dibuja |
|---|---|---|
| `superficie_osea` | Superficie ósea mineralizada | Banda de hueso en la parte inferior de la escena |
| `celula_osteoblastica` | Célula de linaje osteoblástico | Osteoblasto (o osteocito) que produce RANKL, M-CSF y OPG |
| `rankl_membrana` | RANKL en la membrana | Trímeros de RANKL anclados a la membrana de la célula osteoblástica |
| `precursor_osteoclasto` | Precursor de osteoclasto | Célula mononuclear del linaje monocito-macrófago, sin borde festoneado |
| `receptor_rank` | Receptor RANK | Receptor de membrana del precursor, dibujado frente al RANKL |
| `receptor_c_fms` | Receptor c-Fms | Receptor de M-CSF en la membrana del precursor |
| `mcsf` | M-CSF | Molécula soluble que sale de la célula osteoblástica hacia c-Fms |
| `opg` | Osteoprotegerina (OPG) | Molécula soluble en forma de señuelo que se acopla a RANKL |
| `nfatc1_nucleo` | Núcleo con NFATc1 | Núcleo del precursor con el factor NFATc1 resaltado |
| `osteoclasto_maduro` | Osteoclasto multinucleado | Célula grande con varios núcleos, zona de sellado y borde festoneado |
| `laguna_resorcion` | Laguna de resorción | Concavidad bajo el osteoclasto en la superficie ósea |
| `balanza_rankl_opg` | Balanza RANKL/OPG | Indicador de balanza con RANKL en un platillo y OPG en el otro; se inclina según su relación |

Notas de precisión anatómica:
- RANKL es el ligando y va en la célula osteoblástica; RANK es el receptor y va en el precursor. No deben dibujarse al revés.
- La OPG es soluble y no tiene anclaje a la membrana: se dibuja libre, capturando a RANKL.
- El osteoclasto maduro debe tener varios núcleos; el precursor tiene uno solo.
- Texto alternativo sugerido: «Un precursor de osteoclasto recibe M-CSF y RANKL de una célula osteoblástica y madura a osteoclasto; la OPG captura RANKL y frena el proceso».

**Ilustración `m5_acoplamiento_matriz_esclerostina`**

Corte de una laguna de resorción con la secuencia de acoplamiento: matriz, osteoclasto, factores liberados, células reclutadas, osteoblasto y osteocito con esclerostina.

| id de capa | Etiqueta | Qué se dibuja |
|---|---|---|
| `matriz_con_factores` | Matriz con factores almacenados | Hueso mineralizado con puntos que representan TGF-β1, IGF-1 y BMP |
| `osteoclasto_resorbiendo` | Osteoclasto en la laguna | Osteoclasto con borde festoneado, disolviendo la matriz |
| `factores_liberados` | TGF-β1 e IGF-1 liberados | Puntos de colores que salen de la matriz hacia la laguna |
| `celula_mesenquimal_reclutada` | Célula mesenquimal reclutada | Célula alargada que se acerca a la laguna, con receptor de TGF-β |
| `preosteoblasto_igf1` | Preosteoblasto | Célula en diferenciación con receptor de IGF-1 |
| `osteoblasto_formador` | Osteoblasto formador | Osteoblasto cuboidal con osteoide, con el complejo Frizzled y LRP5/6 en su membrana |
| `osteocito_esclerostina` | Osteocito que secreta esclerostina | Osteocito en su laguna, con canalículos, liberando esclerostina hacia la superficie |
| `via_wnt_lrp5_6` | Vía Wnt y LRP5/6 | Wnt uniéndose a LRP5/6 y esclerostina compitiendo por el mismo receptor |

Notas de precisión anatómica:
- Los factores de la matriz salen de la matriz y no del osteoclasto. El osteoclasto solo los libera y activa al disolverla.
- La esclerostina se dibuja saliendo del osteocito (célula dentro del hueso), no del osteoblasto.
- Esclerostina y Wnt compiten por LRP5/6; deben dibujarse en el mismo receptor con colores distintos.
- Texto alternativo sugerido: «Tras la resorción, los factores liberados de la matriz reclutan y diferencian osteoblastos; el osteocito frena la formación con esclerostina».

**Ilustración `m5_hormonas_regulacion_calcemia`**

Esquema con la sangre (calcemia) en el centro y seis órganos alrededor unidos por flechas: estímulo y efecto. No es una escena anatómica a escala.

| id de capa | Etiqueta | Qué se dibuja |
|---|---|---|
| `sangre_calcemia` | Calcemia | Gota o vaso central con «Ca2+» y un rango normal indicado sin cifra |
| `paratiroides_pth` | Paratiroides: PTH | Glándula posterior al tiroides con flecha «calcio bajo → PTH» |
| `tiroides_calcitonina` | Tiroides: calcitonina | Células C parafoliculares con flecha «calcio alto → calcitonina» |
| `rinon_calcitriol` | Riñón: calcitriol y calcio | Riñón con la conversión de 25(OH)D a calcitriol y la reabsorción de calcio |
| `intestino_absorcion` | Intestino: absorción | Intestino delgado con flecha de absorción de calcio y fosfato |
| `hueso_diana` | Hueso: RANKL, OPG y osteoclasto | Superficie ósea con osteoblasto, osteoclasto y sus señales |
| `ovario_estrogenos` | Ovario: estrógenos | Ovario con flecha de freno sobre el osteoclasto |

Notas de precisión anatómica:
- Las paratiroides van en la cara posterior del tiroides; las células C del tiroides son las productoras de calcitonina, no las paratiroides.
- Las flechas de PTH y calcitonina deben tener sentidos opuestos sobre la calcemia.
- Texto alternativo sugerido: «Esquema de regulación del calcio: la PTH y el calcitriol lo suben, la calcitonina lo baja, los estrógenos frenan la resorción».

**Ilustración `m5_hueso_cortical_trabecular_alveolar`**

Corte transversal (vestibulolingual) del cuerpo mandibular a nivel de un premolar inferior, con una raíz dentaria y sus tejidos de soporte. Los espesores son esquemáticos.

| id de capa | Etiqueta | Qué se dibuja |
|---|---|---|
| `tabla_cortical_vestibular` | Tabla cortical vestibular | Lámina de hueso compacto en el lado vestibular del proceso alveolar |
| `tabla_cortical_lingual` | Tabla cortical lingual | Lámina de hueso compacto en el lado lingual |
| `hueso_esponjoso_alveolar` | Hueso esponjoso de soporte | Trabéculas con médula entre las dos tablas y alrededor del alvéolo |
| `hueso_alveolar_propio` | Hueso alveolar propio | Lámina fina que reviste el alvéolo (lámina cribiforme), con fibras de Sharpey insertadas; corresponde a la lámina dura en la radiografía |
| `ligamento_periodontal` | Ligamento periodontal | Espacio estrecho entre raíz y hueso con fibras oblicuas |
| `raiz_dentaria` | Raíz dentaria con cemento | Raíz cubierta por una capa delgada de cemento |
| `cresta_alveolar` | Cresta alveolar | Margen coronal del hueso alveolar |
| `hueso_basal` | Hueso basal | Porción inferior del cuerpo mandibular, con cortical gruesa |

Notas de precisión anatómica:
- El hueso alveolar propio y el hueso de soporte son distintos: el primero reviste el alvéolo y el segundo lo rodea.
- El hueso basal no depende de los dientes; el proceso alveolar sí.
- El espacio del ligamento periodontal es muy estrecho (décimas de milímetro); no debe dibujarse ancho.
- Texto alternativo sugerido: «Corte transversal de la mandíbula con la raíz de un premolar, ligamento periodontal, hueso alveolar propio, tablas corticales, hueso esponjoso y hueso basal».

**Ilustración `m5_movimiento_ortodontico_pdl`**

Corte horizontal de un canino inferior en su alvéolo. Una fuerza ortodóntica lo empuja hacia distal (a la derecha del dibujo): el lado distal es el lado de compresión y el lado mesial (a la izquierda) es el lado de tensión.

| id de capa | Etiqueta | Qué se dibuja |
|---|---|---|
| `raiz_cemento` | Raíz y cemento | Sección de la raíz con su capa de cemento |
| `fuerza_ortodontica` | Fuerza ortodóntica | Flecha que empuja la raíz hacia distal |
| `compresion_lpd` | Ligamento comprimido | Ligamento periodontal estrechado en el lado distal, con fibras apretadas y vasos colapsados |
| `compresion_hialinizacion` | Zona hialinizada | Área sin núcleos, de aspecto vítreo, dentro del ligamento comprimido; hialinización extensa, propia de la fuerza excesiva |
| `compresion_osteoclastos` | Osteoclastos en el lado de compresión | Osteoclastos sobre la pared alveolar distal, resorbiendo |
| `tension_lpd` | Ligamento estirado | Ligamento periodontal ensanchado en el lado mesial, con fibras tensas |
| `tension_osteoblastos` | Osteoblastos en el lado de tensión | Osteoblastos y una banda de osteoide sobre la pared alveolar mesial |
| `senales_compresion` | Señales en compresión | Etiquetas «RANKL sube, OPG baja, PGE2, IL-1β, TNF-α» |
| `senales_tension` | Señales en tensión | Etiquetas «OPG sube, RANKL baja, IL-10, colágeno I, osteocalcina» |

Notas de precisión anatómica:
- La resorción se dibuja en el lado hacia el que se mueve el diente (compresión) y la formación en el lado opuesto (tensión).
- El movimiento neto es del diente dentro de un hueso que se remodela; el dibujo no debe mostrar el hueso «doblándose».
- La hialinización extensa es propia de la fuerza excesiva; con fuerza ligera solo hay focos pequeños. La capa debe poder ocultarse (capa independiente) para mostrar el caso de fuerza ligera.
- Las etiquetas de señales resumen datos de un estudio en humanos con expansión maxilar rápida y de modelos animales; no deben presentarse como universales.
- Texto alternativo sugerido: «Un canino empujado hacia distal: el ligamento se comprime y el hueso se resorbe en el lado distal; el ligamento se estira y se forma hueso en el lado mesial».

**Ilustración `m5_reparacion_fractura_fases`**

Corte longitudinal de un hueso largo fracturado con cicatrización secundaria: es un esquema general y no representa una fractura mandibular con fijación estable. Las capas aparecen en orden cronológico; el video-texto las muestra una a una.

| id de capa | Etiqueta | Qué se dibuja |
|---|---|---|
| `hueso_fracturado_base` | Extremos fracturados | Dos fragmentos con cortical, médula y periostio, separados por la línea de fractura |
| `hematoma_fracturario` | Hematoma | Coágulo con fibrina, plaquetas y células inflamatorias llenando el espacio |
| `periostio_neovascularizacion` | Periostio y neovascularización | Periostio engrosado y vasos nuevos que invaden la zona |
| `callo_blando` | Callo blando | Masa de tejido fibroso y cartílago que une los extremos por fuera |
| `callo_duro` | Callo duro | Hueso inmaduro (reticular) que sustituye al cartílago: subperióstico en la periferia y endocondral en el centro |
| `remodelado_callo` | Remodelado del callo | Hueso laminar organizado, con BMU y reapertura del conducto medular |

Notas de precisión anatómica:
- El callo blando es cartílago y tejido fibroso: no debe pintarse como hueso.
- El callo duro está hecho de hueso reticular (inmaduro), desorganizado; el hueso laminar solo aparece en la fase de remodelado.
- El callo en su máximo tamaño es un abultamiento; tras el remodelado, el contorno se aproxima al original.
- Texto alternativo sugerido: «Fases de reparación de una fractura: hematoma, callo blando cartilaginoso, callo duro de hueso inmaduro y remodelado».

**Ilustración `m5_cicatrizacion_alveolo_fases`**

Corte vestibulolingual (transversal) de un alveolo mandibular tras la extracción de un diente unirradicular, con las paredes vestibular y lingual. Cada fase ocupa una capa.

| id de capa | Etiqueta | Qué se dibuja |
|---|---|---|
| `paredes_del_alveolo` | Paredes del alveolo | Hueso alveolar propio con hueso fascicular, y tablas vestibular (más delgada) y lingual |
| `coagulo` | Coágulo | Coágulo de fibrina, eritrocitos y plaquetas que llena el alveolo |
| `tejido_de_granulacion_alveolo` | Tejido de granulación | Vasos nuevos, fibroblastos y células inflamatorias que sustituyen al coágulo |
| `epitelio_de_cierre` | Epitelio de cierre | Epitelio oral que avanza desde los bordes hasta cubrir el alveolo |
| `matriz_provisional_y_hueso_inmaduro` | Matriz provisional y hueso inmaduro | Trabéculas de hueso reticular que crecen desde las paredes y el fondo hacia el centro |
| `hueso_laminar_y_medula` | Hueso laminar y médula | Hueso laminar con médula y una cortical que cierra la cresta; se establece de forma progresiva y más tarde en la zona coronal |
| `remodelado_del_reborde` | Remodelado del reborde | Contorno final de la cresta más bajo y estrecho, con pérdida del hueso fascicular; la pared vestibular es la que más disminuye |

Notas de precisión anatómica:
- La pared vestibular se dibuja más delgada que la lingual: en general es la que más se resorbe.
- El hueso fascicular (con fibras de Sharpey) forma parte de las paredes iniciales y desaparece porque depende del ligamento periodontal, que se pierde con el diente.
- No debe dibujarse un alveolo vacío al final: se llena de hueso, pero el reborde se reduce.
- El hueso inmaduro domina durante los primeros meses: la capa de hueso laminar no debe dibujarse completa ni uniforme, sino como zonas que crecen con el tiempo.
- La pérdida del reborde empieza pronto y se solapa con la formación de hueso: la capa de remodelado del reborde puede superponerse a las anteriores.
- Texto alternativo sugerido: «Cicatrización del alveolo postextracción: coágulo, tejido de granulación, hueso inmaduro, hueso laminar y reducción del reborde».

**Ilustración `m5_equilibrio_remodelado_alteraciones`**

Cuatro paneles de un mismo campo de hueso trabecular en corte, al mismo aumento, para comparar.

| id de capa | Etiqueta | Qué se dibuja |
|---|---|---|
| `hueso_normal` | Hueso normal | Trabéculas de grosor regular, bien conectadas, con médula y osteoclastos y osteoblastos escasos |
| `osteopetrosis` | Osteopetrosis | Trabéculas gruesas con núcleos de cartílago calcificado, cavidad medular casi obliterada y osteoclastos sin borde festoneado |
| `enfermedad_de_paget` | Enfermedad de Paget | Hueso engrosado con patrón en mosaico (líneas de cemento irregulares), osteoclastos muy grandes y médula fibrovascular |
| `osteoporosis` | Osteoporosis | Trabéculas delgadas, perforadas y desconectadas, con médula abundante |

Notas de precisión anatómica:
- Los cuatro paneles deben tener la misma escala y el mismo campo. La osteoporosis conserva la calidad del tejido, pero pierde masa y conexiones.
- En la osteopetrosis, el hueso es denso pero el tejido está mal organizado: no debe dibujarse como «hueso sano y más abundante».
- En Paget, el patrón en mosaico se dibuja con líneas de cemento en direcciones distintas.
- Texto alternativo sugerido: «Comparación de hueso trabecular normal con osteopetrosis, enfermedad de Paget y osteoporosis».

**Modelo 3D `mandibula`**

Una sola malla de mandíbula, sin dientes ni ligamento periodontal (según docs/referencias.md, BodyParts3D FJ6399 refinada). Los hotspots son puntos anclados a la malla con nombre; no hay piezas separadas. Las zonas de compresión y tensión del canino son marcadores translúcidos superpuestos sobre las paredes alveolares distal y mesial del canino; si la malla no conserva el alvéolo del canino, se marcan sobre el borde alveolar de esa región.

| id de hotspot | Etiqueta | Zona anatómica |
|---|---|---|
| `proceso_alveolar` | Proceso alveolar | Porción superior del cuerpo mandibular, alrededor de los alvéolos |
| `cresta_alveolar` | Cresta alveolar | Margen libre del hueso alveolar |
| `tabla_cortical_vestibular` | Tabla cortical vestibular | Cara externa (vestibular) del proceso alveolar |
| `tabla_cortical_lingual` | Tabla cortical lingual | Cara interna (lingual) del proceso alveolar; hay que girar el modelo para verla |
| `cuerpo_mandibular_basal` | Hueso basal del cuerpo | Porción inferior del cuerpo mandibular |
| `septo_interdental` | Septo interdental | Tabique óseo entre dos alvéolos vecinos |
| `canino_zona_compresion` | Zona de compresión del canino | Pared alveolar distal del canino (marcador superpuesto) |
| `canino_zona_tension` | Zona de tensión del canino | Pared alveolar mesial del canino (marcador superpuesto) |
| `agujero_mentoniano` | Agujero mentoniano | Cara externa del cuerpo, a la altura de los premolares |

## Secciones

### Seccion 5.1: La BMU y el ciclo de remodelado (id "m5_1_bmu_ciclo")

Id: "m5_1_bmu_ciclo" · Duración aproximada: 18 minutos

#### Contenido

**Un hueso terminado no es un hueso quieto**

Cuando termina el crecimiento, el esqueleto sigue renovándose. En el adulto se reemplaza aproximadamente el 10 % del hueso cada año, de modo que casi todo el esqueleto se sustituye en unos 10 años [verificar]. Ese recambio se llama **remodelado óseo**.

Remodelado y modelado no son lo mismo:

| | Modelado | Remodelado |
|---|---|---|
| Cuándo predomina | Crecimiento y adaptación a cargas nuevas | Toda la vida adulta |
| Formación y resorción | En superficies distintas, sin relación entre sí | En el mismo sitio y en secuencia (acopladas) |
| Resultado | Cambia la forma y el tamaño del hueso | Reemplaza hueso viejo por hueso nuevo sin cambiar la forma |
| Ejemplo | Ensanchamiento del cuerpo mandibular durante el crecimiento | Sustitución de una osteona vieja por una nueva |

> Atencion: en la literatura de crecimiento craneofacial, y por tanto en ortodoncia y ortopedia maxilar, se usa la palabra «remodelación» para lo que aquí llamamos modelado (los cambios de forma del hueso al crecer). En este módulo, «remodelado» significa solo el recambio acoplado de hueso viejo por hueso nuevo.

**¿Para qué se renueva un hueso ya formado?**

- Reparar el **microdaño** que se acumula con la carga repetida.
- **Adaptar** la arquitectura del hueso a la carga mecánica.
- **Sustituir hueso viejo**, donde los osteocitos han muerto y la matriz se ha vuelto quebradiza.
- **Liberar calcio y fosfato** cuando el organismo los necesita: el hueso guarda cerca del 99 % del calcio del cuerpo.

Hay dos maneras de decidir dónde remodelar. En el remodelado **dirigido**, los osteocitos que mueren o se deforman cerca de un microdaño señalan el sitio exacto. En el remodelado **no dirigido**, señales del organismo entero (por ejemplo la PTH, sección 5.4) activan sitios que no se relacionan con un daño concreto.

**La BMU: el equipo que remodela**

La **unidad multicelular básica** (BMU, del inglés *basic multicellular unit*) es el equipo temporal de células que renueva un fragmento de hueso. Se forma en un sitio, trabaja y se desarma al terminar. Incluye:

- **Osteoclastos**, que van delante y excavan.
- **Osteoblastos**, que van detrás y rellenan.
- **Células de revestimiento óseo y macrófagos**, que forman un techo sobre el sitio y lo aíslan de la médula (el compartimento de remodelado).
- **Osteocitos** vecinos, que detectan el daño y la carga y envían señales.
- Un **capilar** que trae precursores, oxígeno y nutrientes.

La BMU adopta dos formas según dónde trabaja:

| | BMU cortical | BMU trabecular y endocortical |
|---|---|---|
| Forma | Túnel que avanza: cono de corte (osteoclastos) y cono de cierre (osteoblastos) | Surco superficial que se rellena en el mismo sitio |
| Resultado | Osteona nueva (sistema de Havers) con su conducto central | Paquete óseo estructural, una osteona incompleta (hemiosteona) |
| Tamaño aproximado | Túnel de unos 200 µm de diámetro que avanza unas decenas de µm por día [verificar] | Profundidad de decenas de µm |
| Dónde, en la mandíbula | Cortical basal y tablas corticales | Hueso esponjoso del proceso alveolar |

Una BMU vive unos 6 a 9 meses [verificar]. Esta cifra y la del ciclo completo (4 a 6 meses, más abajo) se refieren a cosas cercanas pero se miden con criterios distintos según la fuente; por eso la vida de la BMU resulta algo mayor. Un osteoclasto vive aproximadamente 2 semanas y un osteoblasto aproximadamente 3 meses [verificar], así que durante la vida de una BMU se relevan varias generaciones de ambos. En un adulto hay más de un millón de BMU activas al mismo tiempo [verificar].

> Dato: cada BMU está en una fase distinta. Por eso el esqueleto no se debilita entero a la vez: en cada momento solo una fracción pequeña de la superficie ósea se está remodelando.

**Las seis fases del ciclo**

| Fase | Qué ocurre | Protagonistas | Duración aproximada |
|---|---|---|---|
| 1. Quiescencia | La superficie descansa, tapizada por células de revestimiento sobre una capa fina de matriz sin mineralizar | Células de revestimiento, osteocitos | Es el estado de la mayor parte de la superficie ósea en cada momento |
| 2. Activación | Un estímulo (microdaño, PTH, falta de carga, cambios hormonales) retrae las células de revestimiento, que digieren la capa fina de matriz y forman un techo sobre el sitio. Se reclutan precursores de osteoclastos | Osteocitos, células de revestimiento, precursores de osteoclastos, M-CSF y RANKL | Días [verificar] |
| 3. Resorción | El osteoclasto se sella a la superficie, bombea protones que disuelven el mineral y secreta catepsina K que degrada el colágeno. Deja una laguna de Howship (en superficie) o un túnel (en la cortical) | Osteoclasto multinucleado | Aproximadamente 2 a 4 semanas; termina con la apoptosis del osteoclasto [verificar] |
| 4. Inversión | Células mononucleares limpian la laguna, depositan la línea de cemento y liberan señales que atraen osteoblastos | Células de inversión | Aproximadamente 1 a 2 semanas; algunas fuentes dan valores mayores [verificar] |
| 5. Formación | Los osteoblastos depositan osteoide en capas hasta rellenar la laguna. Al terminar, la mayoría muere por apoptosis; unos pocos quedan como osteocitos y otros como células de revestimiento | Osteoblastos | Aproximadamente 3 a 4 meses [verificar] |
| 6. Mineralización | El osteoide se mineraliza: primero rápido (mineralización primaria) y después lento, durante meses o años (mineralización secundaria). El sitio vuelve a la quiescencia | Osteoblastos, osteocitos, matriz | Empieza unos días después del depósito del osteoide y se prolonga meses [verificar] |

El ciclo completo, de la activación a la mineralización inicial, dura alrededor de 4 a 6 meses [verificar].

Entre las cuatro fases activas de la BMU (activación, resorción, inversión y formación), la formación es la más larga. No entran en esa comparación la quiescencia, que es el estado de casi toda la superficie ósea casi todo el tiempo, ni la mineralización secundaria, que se prolonga meses o años.

Tres ideas para retener:

- **La resorción es más rápida que la formación.** Formar tarda varias veces más que resorber. Si se activan muchas BMU a la vez, queda un déficit transitorio de hueso, el **espacio de remodelado**, que se recupera cuando las lagunas terminan de rellenarse.
- **El orden no cambia.** Primero se resorbe y después se forma, siempre en el mismo sitio.
- **El ciclo termina en quiescencia.** El hueso nuevo queda cubierto por células de revestimiento hasta la siguiente activación.

> Recuerda: la secuencia es quiescencia, activación, resorción, inversión, formación y mineralización. Los osteoclastos siempre llegan primero: sin resorción previa no hay formación en ese sitio.

> Clinico: en la mandíbula, la mayor parte del remodelado ocurre en el proceso alveolar, junto al ligamento periodontal. Ahí se aplican las fuerzas ortodónticas (sección 5.5) y ahí se producen las extracciones (sección 5.6).

#### Actividades

##### Actividad m5_bmu_video

```yaml
tipo: video-texto
titulo: "Una BMU cortical en movimiento"
instrucciones: "Avanza paso a paso con Siguiente (o desliza en el móvil). En cada paso cambia la ilustración y aparece un texto breve."
obligatoria: false
puntaje_max: 10
concepto: "Estructura de la BMU cortical: cono de corte, zona de inversión y cono de cierre"
interaccion: "Ratón: botones Anterior y Siguiente. Táctil: los mismos botones o deslizar. Teclado: flechas izquierda y derecha."
retroalimentacion:
  acierto: "Completaste la explicación. Recuerda el orden espacial de la BMU cortical: osteoclastos delante, inversión en medio y osteoblastos detrás."
  error: "Todavía quedan pasos por ver. Puedes volver atrás con Anterior; no se pierden puntos por repetir."
svg: m5_bmu_cortical_longitudinal
pasos:
  - id: p1_hueso_previo
    titulo: "Un hueso cortical listo para renovarse"
    texto_narrado: "En el hueso cortical, un capilar recorre el conducto central de cada osteona. Un microdaño detectado por los osteocitos, o una señal hormonal, activa un sitio. Los precursores de osteoclastos llegan por la sangre."
    cambia_en_escena: "Se muestran hueso_cortical_previo y capilar_central; aparece direccion_de_avance con transparencia baja. Las demás capas están ocultas."
  - id: p2_cono_corte
    titulo: "El cono de corte"
    texto_narrado: "Los osteoclastos ocupan la punta de la BMU. Disuelven mineral y colágeno y excavan un túnel de unos 200 µm de diámetro que avanza unas decenas de micrómetros por día [verificar]. Dentro del túnel sigue un capilar."
    cambia_en_escena: "Aparece cono_de_corte con los osteoclastos resaltados; la pared del túnel se ensancha y direccion_de_avance se vuelve opaca."
  - id: p3_inversion
    titulo: "La zona de inversión"
    texto_narrado: "Detrás de los osteoclastos, la pared queda irregular. Células mononucleares de inversión la limpian y depositan la línea de cemento, que marcará el límite entre el hueso viejo y el nuevo."
    cambia_en_escena: "Aparece zona_de_inversion; la línea de cemento se dibuja de forma progresiva a lo largo de la pared."
  - id: p4_cono_cierre
    titulo: "El cono de cierre"
    texto_narrado: "Más atrás, los osteoblastos tapizan la pared y depositan osteoide en capas concéntricas, de fuera hacia dentro. El túnel se estrecha alrededor del capilar. Los osteoblastos que quedan atrapados se convierten en osteocitos."
    cambia_en_escena: "Aparece cono_de_cierre; el diámetro libre del túnel se reduce y se dibujan osteoblastos en fila y una banda de osteoide."
  - id: p5_osteona_nueva
    titulo: "Una osteona nueva"
    texto_narrado: "Cuando el ciclo termina queda una osteona nueva: laminillas concéntricas mineralizadas, un conducto central con su capilar y osteocitos en sus lagunas. La BMU ya se ha ido y el sitio vuelve a la quiescencia."
    cambia_en_escena: "Aparece osteona_nueva y se atenúan cono_de_corte, zona_de_inversion y cono_de_cierre; direccion_de_avance se desplaza fuera del campo."
```

##### Actividad m5_ciclo_multicapa

```yaml
tipo: multicapa
titulo: "Recorre el ciclo de remodelado, fase por fase"
instrucciones: "Toca (o pasa el cursor por) cada fase de la ilustración para leer qué ocurre. Debes visitar las seis fases."
obligatoria: true
puntaje_max: 20
concepto: "Fases del ciclo de remodelado en una BMU"
interaccion: "Ratón: el hover resalta y el clic fija la fase. Táctil: un toque abre el texto de la fase. Teclado: Tab recorre las fases y Enter abre el texto."
retroalimentacion:
  acierto: "Visitaste las seis fases. Fíjate en que el osteoclasto trabaja solo en la fase de resorción y que la línea de cemento aparece en la inversión."
  error: "Todavía te faltan fases por visitar. Cada fase visitada suma puntos; abre las que aún no viste."
svg: m5_ciclo_remodelado_bmu
modo: explorar
capas:
  - id: fase_quiescencia
    etiqueta: "Quiescencia"
    descripcion: "La superficie está tapizada por células de revestimiento óseo, aplanadas, sobre una capa muy fina de matriz sin mineralizar. Los osteocitos, dentro del hueso, vigilan la carga y el daño. Es el estado en que se encuentra la mayor parte de la superficie ósea en cada momento."
  - id: fase_activacion
    etiqueta: "Activación"
    descripcion: "Una señal (microdaño, PTH, falta de carga, cambios hormonales) hace que las células de revestimiento se retraigan y digieran la capa fina de matriz. Se forma un compartimento cubierto por un techo de células. Llegan precursores de osteoclastos, que se fusionan bajo la influencia de M-CSF y RANKL."
  - id: fase_resorcion
    etiqueta: "Resorción"
    descripcion: "El osteoclasto multinucleado se sella a la superficie, bombea protones que disuelven el mineral y secreta catepsina K que degrada el colágeno. Deja una laguna de Howship. Dura aproximadamente entre 2 y 4 semanas [verificar] y termina con la apoptosis del osteoclasto."
  - id: fase_inversion
    etiqueta: "Inversión"
    descripcion: "Células mononucleares limpian la laguna y depositan la línea de cemento, una capa rica en glucoproteínas que servirá de límite entre el hueso viejo y el nuevo. Estas células liberan señales que atraen a los precursores de osteoblastos. Dura aproximadamente entre 1 y 2 semanas [verificar]."
  - id: fase_formacion
    etiqueta: "Formación"
    descripcion: "Los osteoblastos depositan osteoide, en capas, hasta rellenar la laguna. Es la fase activa más larga de la BMU: aproximadamente 3 a 4 meses [verificar]. Al terminar, la mayoría de los osteoblastos muere por apoptosis; unos pocos quedan atrapados como osteocitos y otros pasan a células de revestimiento."
  - id: fase_mineralizacion
    etiqueta: "Mineralización"
    descripcion: "El osteoide se mineraliza en dos tiempos: una mineralización primaria rápida y una secundaria lenta, que continúa durante meses o años (se estudia en el módulo 4). Cuando termina, las células de revestimiento vuelven a cubrir la superficie y el sitio regresa a la quiescencia."
requeridas: [fase_quiescencia, fase_activacion, fase_resorcion, fase_inversion, fase_formacion, fase_mineralizacion]
```

##### Actividad m5_ciclo_ordenar

```yaml
tipo: quiz
titulo: "Ordena el ciclo de remodelado"
instrucciones: "Coloca las seis fases en el orden en que ocurren en un sitio de la superficie ósea, desde la superficie en reposo hasta el regreso al reposo."
obligatoria: true
puntaje_max: 30
concepto: "Secuencia del ciclo de remodelado"
interaccion: "Ratón: arrastrar cada fase o usar los botones subir y bajar. Táctil: arrastrar con un dedo o usar los botones. Teclado: seleccionar una fase con Enter y moverla con las flechas arriba y abajo."
retroalimentacion:
  acierto: "Orden correcto. La resorción siempre precede a la formación y el ciclo termina otra vez en quiescencia."
  error: "El orden no es correcto. Repasa la ilustración de la actividad anterior: el osteoclasto actúa antes que el osteoblasto y la línea de cemento se deposita entre ambos."
preguntas:
  - id: m5_1_q1_ordenar_ciclo
    formato: ordenar_pasos
    enunciado: "Ordena las seis fases del ciclo de remodelado, desde la superficie en reposo hasta el regreso al reposo."
    pasos:
      - id: quiescencia
        texto: "Quiescencia: la superficie descansa bajo las células de revestimiento"
      - id: activacion
        texto: "Activación: se retraen las células de revestimiento y se reclutan precursores de osteoclastos"
      - id: resorcion
        texto: "Resorción: el osteoclasto disuelve mineral y colágeno y deja una laguna"
      - id: inversion
        texto: "Inversión: células mononucleares limpian la laguna y depositan la línea de cemento"
      - id: formacion
        texto: "Formación: los osteoblastos depositan osteoide y rellenan la laguna"
      - id: mineralizacion
        texto: "Mineralización: el osteoide se mineraliza y el sitio vuelve a la quiescencia"
    correcta: [quiescencia, activacion, resorcion, inversion, formacion, mineralizacion]
    explicacion: "El orden es fijo: quiescencia, activación, resorción, inversión, formación y mineralización. La línea de cemento se deposita en la inversión, entre la resorción y la formación. La formación dura varias veces más que la resorción."
    dificultad: 1
    concepto: "Secuencia del ciclo de remodelado"
```

##### Actividad m5_bmu_columnas

```yaml
tipo: relacion-columnas
titulo: "Los integrantes de la BMU y su tarea"
instrucciones: "Une cada integrante de la BMU (columna izquierda) con lo que hace (columna derecha). Sobran dos frases en la columna derecha."
obligatoria: true
puntaje_max: 30
concepto: "Células y estructuras de la BMU y su función"
interaccion: "Ratón: clic en un elemento de cada columna, o arrastrar. Táctil: tocar uno de la izquierda y luego uno de la derecha. Teclado: Tab, Enter en la columna izquierda, Tab hasta la derecha y Enter."
retroalimentacion:
  acierto: "Todas las parejas son correctas. Recuerda que los osteocitos y las células de revestimiento no excavan ni rellenan, pero deciden dónde y cuándo se activa la BMU."
  error: "Alguna pareja es incorrecta. Ordena por fase: quiescencia y activación (revestimiento y osteocito), resorción (osteoclasto), inversión (célula de inversión), formación (osteoblasto)."
izquierda:
  - id: cel_revestimiento
    texto: "Célula de revestimiento óseo"
  - id: osteoclasto
    texto: "Osteoclasto multinucleado"
  - id: cel_inversion
    texto: "Célula de inversión"
  - id: osteoblasto
    texto: "Osteoblasto"
  - id: osteocito
    texto: "Osteocito"
  - id: capilar
    texto: "Capilar del sitio de remodelado"
derecha:
  - id: r_techo
    texto: "Se retrae al activarse el sitio y forma el techo del compartimento de remodelado"
  - id: r_disuelve
    texto: "Se sella a la superficie y disuelve mineral y colágeno de la matriz"
  - id: r_cemento
    texto: "Limpia la laguna y deposita la línea de cemento"
  - id: r_osteoide
    texto: "Deposita osteoide en la laguna hasta rellenarla"
  - id: r_detecta
    texto: "Detecta el microdaño y la carga, y libera señales como RANKL y esclerostina"
  - id: r_trae
    texto: "Trae al sitio precursores de osteoclastos y osteoblastos, oxígeno y nutrientes"
  - id: r_cemento_radicular
    texto: "Produce el cemento que recubre la raíz del diente"
  - id: r_callo
    texto: "Forma el cartílago del callo blando tras una fractura"
pares:
  - izquierda: cel_revestimiento
    derecha: r_techo
  - izquierda: osteoclasto
    derecha: r_disuelve
  - izquierda: cel_inversion
    derecha: r_cemento
  - izquierda: osteoblasto
    derecha: r_osteoide
  - izquierda: osteocito
    derecha: r_detecta
  - izquierda: capilar
    derecha: r_trae
distractores: [r_cemento_radicular, r_callo]
```

### Seccion 5.2: El eje RANK, RANKL y OPG, y el M-CSF (id "m5_2_eje_rankl_opg")

Id: "m5_2_eje_rankl_opg" · Duración aproximada: 14 minutos

#### Contenido

**De dónde viene el osteoclasto**

El osteoclasto no nace del hueso ni del linaje del osteoblasto. Deriva de **precursores hematopoyéticos del linaje monocito-macrófago**. Para convertirse en un osteoclasto multinucleado y activo, el precursor necesita dos señales que le entrega el propio microambiente óseo: **M-CSF** y **RANKL**. Un tercer actor, la **OPG**, decide cuánto de esa señal llega.

| Molécula | Quién la produce | A qué se une | Qué provoca |
|---|---|---|---|
| **M-CSF** (CSF1) | Células del linaje osteoblástico y del estroma de la médula; también osteocitos | **c-Fms** (receptor CSF1R) del precursor | El precursor prolifera y sobrevive, y aumenta su cantidad de RANK |
| **RANKL** | Células del linaje osteoblástico, osteocitos, células del ligamento periodontal; linfocitos T activados en la inflamación | **RANK** del precursor | Diferenciación, fusión, activación y supervivencia del osteoclasto |
| **OPG** (osteoprotegerina) | Células del linaje osteoblástico y del estroma | **RANKL** | Lo captura: es un receptor señuelo soluble que impide que RANKL active a RANK |

RANKL existe como proteína de membrana (en el osteoblasto y el osteocito) y como forma soluble, que se libera por corte proteolítico. Las dos son activas.

**Dentro del precursor: la cascada**

1. RANKL se une a RANK.
2. Dentro del precursor se activan vías de señalización que hacen subir **NFATc1**, el regulador maestro de la osteoclastogénesis.
3. NFATc1 enciende los genes del osteoclasto: fosfatasa ácida resistente al tartrato (TRAP), catepsina K y receptor de calcitonina.
4. Los precursores se fusionan y forman un osteoclasto multinucleado con zona de sellado y borde festoneado.

**Para profundizar (plegable; no se evalúa)**

- RANK recluta la proteína adaptadora TRAF6 y activa las vías de NF-κB y de c-Fos, que llevan a NFATc1. La fusión de los precursores requiere la proteína DC-STAMP, y NFATc1 enciende también la integrina β3.
- Los genes son *TNFSF11* (RANKL), *TNFRSF11A* (RANK) y *TNFRSF11B* (OPG).

**La balanza RANKL/OPG**

El número y la actividad de los osteoclastos dependen del equilibrio entre RANKL y OPG, no de la cantidad absoluta de RANKL.

| Aumenta la relación RANKL/OPG (más resorción) | Disminuye la relación RANKL/OPG (menos resorción) |
|---|---|
| PTH sostenida (sección 5.4) | Estrógenos (sección 5.4) |
| Glucocorticoides en exceso | Carga mecánica adecuada |
| Deficiencia de estrógenos | Vía Wnt activa en el osteoblasto (sección 5.3) |
| Citocinas inflamatorias (IL-1, IL-6, TNF-α) y prostaglandina E2 | |
| Falta de carga mecánica | |

Dos aclaraciones sobre lo que no está en la tabla. El **calcitriol** aporta mineral (sección 5.4); a dosis altas o con hiperparatiroidismo secundario puede aumentar RANKL en el osteoblasto, pero en la fisiología normal ese no es su papel principal [verificar]. El **denosumab** no es un modulador fisiológico: es un anticuerpo que neutraliza RANKL y reproduce de forma farmacológica el efecto de la OPG.

Los experimentos genéticos en ratones muestran por qué esta balanza es tan importante:

- **Sin RANKL o sin RANK**: no se forman osteoclastos, el hueso no se resorbe (osteopetrosis) y los dientes no erupcionan bien.
- **Sin OPG**: hay demasiados osteoclastos y el resultado es osteoporosis grave.

> Dato: además de los osteoblastos, los osteocitos son una fuente importante de RANKL para el remodelado del hueso adulto (estudios en ratón). El osteocito detecta el daño o la falta de carga y llama a los osteoclastos.

**Para profundizar (plegable; no se evalúa)**

> Dato: en personas, la ausencia de OPG por mutación del gen TNFRSF11B produce una forma juvenil de enfermedad de Paget, con resorción y formación muy aumentadas [verificar].

> Atencion: no confundas los nombres. **RANKL** es el ligando y está en la célula osteoblástica. **RANK** es el receptor y está en el precursor. **OPG** es un señuelo soluble que se une a RANKL. La OPG no activa nada: solo lo captura.

> Clinico: en la periodontitis, las células inflamatorias (linfocitos T y B) y los fibroblastos gingivales aumentan RANKL, y la relación RANKL/OPG sube en el tejido periodontal. El resultado es pérdida de hueso alveolar. El denosumab, un anticuerpo humano contra RANKL, actúa como una OPG farmacológica: reduce el número y la actividad de los osteoclastos y se usa en osteoporosis y en enfermedad ósea metastásica.

#### Actividades

##### Actividad m5_osteoclastogenesis_video

```yaml
tipo: video-texto
titulo: "Cómo se forma un osteoclasto y cómo se frena"
instrucciones: "Avanza paso a paso con Siguiente (o desliza en el móvil). Observa qué molécula se une a qué receptor en cada paso."
obligatoria: false
puntaje_max: 10
concepto: "Osteoclastogénesis: M-CSF, RANKL, RANK y OPG"
interaccion: "Ratón: botones Anterior y Siguiente. Táctil: los mismos botones o deslizar. Teclado: flechas izquierda y derecha."
retroalimentacion:
  acierto: "Completaste la explicación. Antes de la actividad de arrastre, recuerda: M-CSF con c-Fms, RANKL con RANK y OPG con RANKL."
  error: "Todavía quedan pasos por ver. Puedes volver atrás con Anterior sin perder puntos."
svg: m5_osteoclastogenesis_rank_rankl_opg
pasos:
  - id: p1_precursor
    titulo: "Un precursor a la espera"
    texto_narrado: "Cerca de la superficie ósea hay un precursor mononuclear del linaje monocito-macrófago. Todavía no puede resorber hueso. Necesita dos señales de la célula osteoblástica vecina."
    cambia_en_escena: "Se muestran superficie_osea, celula_osteoblastica, rankl_membrana, precursor_osteoclasto, receptor_rank y receptor_c_fms. RANKL y RANK aparecen enfrentados pero sin unirse."
  - id: p2_mcsf
    titulo: "M-CSF: sobrevivir y multiplicarse"
    texto_narrado: "La célula osteoblástica libera M-CSF, que se une al receptor c-Fms. El precursor prolifera, sobrevive y aumenta la cantidad de RANK en su membrana. Todavía no es un osteoclasto."
    cambia_en_escena: "Aparece mcsf saliendo de la célula osteoblástica hacia receptor_c_fms; se dibujan tres precursores en lugar de uno y aparecen más receptores RANK."
  - id: p3_rankl_rank
    titulo: "RANKL se une a RANK"
    texto_narrado: "El RANKL de la membrana de la célula osteoblástica se une a RANK. Dentro del precursor se activan vías de señalización y sube NFATc1, el regulador maestro de la osteoclastogénesis."
    cambia_en_escena: "rankl_membrana se acopla a receptor_rank; aparece nfatc1_nucleo con el núcleo iluminado."
  - id: p4_fusion
    titulo: "Fusión y maduración"
    texto_narrado: "Los precursores activados se fusionan y forman un osteoclasto multinucleado, con zona de sellado y borde festoneado. Bajo la célula se abre una laguna de resorción en la superficie ósea."
    cambia_en_escena: "Aparecen osteoclasto_maduro y laguna_resorcion; precursor_osteoclasto se atenúa."
  - id: p5_opg
    titulo: "La OPG entra en escena"
    texto_narrado: "La OPG, también producida por la célula osteoblástica, es un receptor señuelo soluble. Se une a RANKL con gran afinidad y lo aparta de RANK. Sin RANKL unido a RANK, los precursores no maduran."
    cambia_en_escena: "Aparece opg acoplada a rankl_membrana, que se vuelve gris; receptor_rank queda vacío y osteoclasto_maduro se encoge."
  - id: p6_balanza
    titulo: "Una balanza"
    texto_narrado: "La cantidad de osteoclastos depende de la relación RANKL/OPG. Si sube RANKL o baja OPG, hay más resorción; si baja RANKL o sube OPG, hay menos. Muchas hormonas y fármacos actúan moviendo esta balanza."
    cambia_en_escena: "Aparece balanza_rankl_opg con RANKL en un platillo y OPG en el otro; el platillo se inclina según el valor y el tamaño del osteoclasto cambia con él."
```

##### Actividad m5_arrastre_rankl_opg

```yaml
tipo: arrastre-molecular
titulo: "Enciende y frena la osteoclastogénesis"
instrucciones: "Arrastra cada molécula hasta el receptor con el que se une. Observa qué le ocurre al precursor y a la superficie ósea. Dos de las cinco moléculas no encajan en ningún receptor de la escena."
obligatoria: true
puntaje_max: 40
concepto: "Eje M-CSF, RANKL, RANK y OPG"
interaccion: "Ratón: arrastrar la molécula al receptor. Táctil: arrastrar con un dedo o tocar la molécula y luego el receptor. Teclado: Tab elige molécula, Enter la toma, Tab elige receptor y Enter la suelta."
retroalimentacion:
  acierto: "Acople correcto. Sigue con las moléculas que faltan y observa cómo cambia el indicador de resorción."
  error: "Esa molécula no se une a ese receptor. Recuerda: M-CSF con c-Fms, RANKL con RANK, y la OPG se une a RANKL (no a un receptor del precursor)."
svg: m5_osteoclastogenesis_rank_rankl_opg
escena: "Corte esquemático de una superficie ósea, con la ilustración m5_osteoclastogenesis_rank_rankl_opg como fondo. Arriba, una célula de linaje osteoblástico con RANKL anclado en su membrana (diana rankl_membrana, el blanco de la OPG). Abajo, un precursor mononuclear de osteoclasto con dos receptores en su membrana: c-Fms y RANK. Bajo el precursor está la superficie ósea mineralizada. En la bandeja lateral hay cinco moléculas para arrastrar: tres correctas y dos que no encajan. Los acoples pueden hacerse en cualquier orden; el único caso que depende del orden es RANKL sin M-CSF previo, que produce un efecto parcial. Un indicador de resorción, a la derecha de la escena, sube cuando se forma un osteoclasto y baja cuando se frena."
moleculas:
  - id: mcsf
    nombre: "M-CSF (factor estimulante de colonias de macrófagos)"
    descripcion: "Citocina soluble producida por células del linaje osteoblástico y del estroma. Mantiene vivo y en proliferación al precursor."
  - id: rankl
    nombre: "RANKL (forma soluble)"
    descripcion: "Ligando de la familia del TNF. En el osteoblasto y el osteocito está anclado a la membrana; también existe una forma soluble, que aquí se arrastra como ligando libre hasta RANK. La OPG captura tanto el RANKL soluble como el de la membrana."
  - id: opg
    nombre: "OPG (osteoprotegerina)"
    descripcion: "Receptor señuelo soluble producido por el linaje osteoblástico. Captura a RANKL con gran afinidad."
receptores:
  - id: c_fms
    nombre: "c-Fms (receptor de M-CSF, CSF1R)"
    descripcion: "Receptor con actividad de cinasa en la membrana del precursor. Su activación mantiene la supervivencia y la proliferación."
  - id: rank
    nombre: "RANK (TNFRSF11A)"
    descripcion: "Receptor de la membrana del precursor. Su activación por RANKL dispara la vía de NFATc1 y la osteoclastogénesis."
  - id: rankl_membrana
    nombre: "Diana: RANKL de la membrana de la célula osteoblástica"
    descripcion: "No es un receptor, sino la diana de la OPG: ligando anclado a la célula osteoblástica, que la OPG captura."
pares:
  - molecula: mcsf
    receptor: c_fms
    efecto:
      titulo: "Precursores vivos y en aumento"
      descripcion: "El M-CSF activa c-Fms: el precursor sobrevive, prolifera y aumenta la cantidad de RANK en su membrana. Todavía no hay osteoclasto: falta la señal de RANKL."
      que_se_anima: "Aparecen tres precursores alrededor del original (proliferación), un halo verde de supervivencia y más receptores RANK en su membrana. El indicador de resorción no se mueve."
  - molecula: rankl
    receptor: rank
    efecto:
      titulo: "Osteoclastogénesis"
      descripcion: "RANKL se une a RANK, se activa la cascada de señales que hace subir NFATc1, y los precursores se diferencian y se fusionan en un osteoclasto multinucleado. Funciona mejor con precursores vivos y numerosos, que aporta el M-CSF: si RANKL se acopla antes que M-CSF, el efecto es parcial (se forma un osteoclasto pequeño y el indicador sube solo un poco); con M-CSF ya acoplado, el efecto es completo."
      que_se_anima: "El núcleo del precursor se ilumina (NFATc1), los precursores se fusionan en una célula grande con varios núcleos, aparece el borde festoneado y se abre una laguna en la superficie ósea. El indicador de resorción sube. Si M-CSF aún no está acoplado, la célula fusionada es pequeña, con pocos núcleos, y el indicador sube solo hasta la mitad."
  - molecula: opg
    receptor: rankl_membrana
    efecto:
      titulo: "Freno de la osteoclastogénesis"
      descripcion: "La OPG se une a RANKL y lo aparta de RANK. Sin señal de RANKL no se activa NFATc1, los precursores no se fusionan y los osteoclastos ya formados pierden apoyo. El fármaco denosumab logra un efecto parecido al neutralizar RANKL."
      que_se_anima: "La OPG rodea al RANKL de la membrana, que se vuelve gris; el receptor RANK queda vacío, los osteoclastos se separan y se encogen, y el indicador de resorción baja."
distractores:
  - id: pth
    nombre: "PTH (hormona paratiroidea)"
    descripcion: "Actúa sobre el receptor PTH1R del linaje osteoblástico y del osteocito, y así aumenta RANKL de forma indirecta."
    por_que_no_encaja: "En esta escena ningún receptor responde a la PTH. El precursor de osteoclasto no tiene receptor de PTH: la hormona aumenta la osteoclastogénesis subiendo RANKL en la célula osteoblástica, no uniéndose a RANK ni a c-Fms."
  - id: esclerostina
    nombre: "Esclerostina"
    descripcion: "Glucoproteína secretada por el osteocito que bloquea la vía Wnt."
    por_que_no_encaja: "Se une a LRP5 y LRP6 del osteoblasto, no a RANK ni a c-Fms. No interviene directamente en la formación del osteoclasto (se estudia en la sección 5.3)."
```

##### Actividad m5_quiz_eje_rankl

```yaml
tipo: quiz
titulo: "Comprueba el eje RANKL, RANK y OPG"
instrucciones: "Responde las cuatro preguntas. Después de cada una verás una explicación breve."
obligatoria: true
puntaje_max: 40
concepto: "Origen del osteoclasto y control por RANKL, RANK, OPG y M-CSF"
interaccion: "Ratón: clic en la opción. Táctil: toque en la opción. Teclado: flechas para moverte entre opciones y Enter para responder."
retroalimentacion:
  acierto: "Bien. El eje RANKL, RANK y OPG es el interruptor principal de la resorción: vuelve a él cada vez que aparezca una hormona o un fármaco."
  error: "Repasa el video-texto anterior: M-CSF mantiene vivo al precursor, RANKL lo diferencia y la OPG captura a RANKL."
preguntas:
  - id: m5_2_q1_linaje
    formato: opcion_multiple
    enunciado: "¿De qué linaje derivan los osteoclastos?"
    opciones:
      - id: a
        texto: "Del linaje mesenquimal, igual que los osteoblastos"
      - id: b
        texto: "De los condrocitos hipertróficos del cartílago"
      - id: c
        texto: "De los osteocitos que se fusionan al morir"
      - id: d
        texto: "Del linaje hematopoyético monocito-macrófago"
    correcta: d
    explicacion: "Los osteoclastos derivan de precursores hematopoyéticos del linaje monocito-macrófago. Los osteoblastos, en cambio, derivan de células mesenquimales. Por eso el trasplante de progenitores hematopoyéticos puede corregir algunas formas de osteopetrosis (sección 5.7)."
    dificultad: 1
    concepto: "Origen del osteoclasto"
  - id: m5_2_q2_opg
    formato: opcion_multiple
    enunciado: "¿Cuál de estas afirmaciones describe correctamente a la OPG?"
    opciones:
      - id: a
        texto: "Es un receptor señuelo soluble que captura a RANKL e impide que active a RANK"
      - id: b
        texto: "Es un receptor de la membrana del osteoclasto que, al activarse, enciende NFATc1"
      - id: c
        texto: "Es una citocina que reemplaza al M-CSF en la supervivencia del precursor"
      - id: d
        texto: "Es la enzima que degrada el colágeno tipo I en la laguna de resorción"
    correcta: a
    explicacion: "La OPG es soluble y captura a RANKL, de modo que RANKL no llega a RANK. El receptor que activa NFATc1 es RANK, y la enzima que degrada colágeno en la laguna es la catepsina K."
    dificultad: 2
    concepto: "Función de la OPG"
  - id: m5_2_q3_mcsf
    formato: verdadero_falso
    enunciado: "El M-CSF, por sí solo, basta para que un precursor se convierta en un osteoclasto multinucleado y activo."
    correcta: falso
    explicacion: "Falso. El M-CSF mantiene vivo al precursor y aumenta su RANK, pero la diferenciación y la fusión requieren RANKL. Sin RANKL no se forman osteoclastos."
    dificultad: 2
    concepto: "Papel del M-CSF frente a RANKL"
  - id: m5_2_q4_sin_rankl
    formato: opcion_multiple
    enunciado: "Un ratón carece del gen de RANKL. ¿Qué esperas encontrar?"
    opciones:
      - id: a
        texto: "Osteoporosis grave, por exceso de osteoclastos y de resorción del hueso"
      - id: b
        texto: "Hueso normal, porque el M-CSF puede sustituir por completo a RANKL"
      - id: c
        texto: "Osteopetrosis: no se forman osteoclastos y el hueso no se resorbe"
      - id: d
        texto: "Fracturas por defecto de mineralización del osteoide y falta de calcio"
    correcta: c
    explicacion: "Sin RANKL no hay osteoclastogénesis: el hueso no se resorbe ni se remodela y se acumula (osteopetrosis). Estos animales suelen mostrar además fallo de la erupción dental, porque erupcionar exige resorber hueso. El ratón sin OPG muestra lo contrario: osteoporosis por exceso de osteoclastos."
    dificultad: 3
    concepto: "Consecuencias de la falta de RANKL"
```

### Seccion 5.3: Acoplamiento y esclerostina (id "m5_3_acoplamiento_esclerostina")

Id: "m5_3_acoplamiento_esclerostina" · Duración aproximada: 12 minutos

#### Contenido

**Acoplamiento: formar lo que se resorbió**

En cada sitio de remodelado, la formación empieza donde terminó la resorción y repone una cantidad parecida de hueso. A esa dependencia se le llama **acoplamiento**. Es lo que mantiene estable la masa ósea del adulto sano; si la formación no compensa la resorción, se pierde hueso (sección 5.7).

El acoplamiento no depende de una sola señal. Actúan varios mecanismos a la vez.

**Factores liberados de la matriz.** La matriz ósea es un almacén de factores de crecimiento: TGF-β1 (en forma latente), IGF-1, IGF-2, BMP, PDGF y FGF. Cuando el osteoclasto disuelve el mineral con ácido y degrada el colágeno, libera y activa esos factores dentro de la laguna.

| Señal | De dónde viene | Qué hace en el acoplamiento |
|---|---|---|
| **TGF-β1** | Matriz ósea, liberado y activado por la resorción | Recluta células madre mesenquimales hacia la laguna |
| **IGF-1 e IGF-2** | Matriz ósea | Favorecen la diferenciación y la supervivencia de los osteoblastos |
| **BMP** (por ejemplo BMP-2) | Matriz ósea | Inducen la diferenciación de los precursores a osteoblastos |

**Para profundizar (plegable; no se evalúa)**

Otras señales descritas sobre todo en experimentos con células y con ratones:

| Señal | De dónde viene | Qué hace |
|---|---|---|
| **Efrina B2 y EphB4** | Contacto entre el osteoclasto (efrina B2) y el linaje osteoblástico (EphB4) | Favorece la diferenciación del osteoblasto y frena la del osteoclasto |
| **Cardiotrofina-1 y esfingosina-1-fosfato (S1P)** | Secretadas por el osteoclasto | Estimulan a los precursores de osteoblastos |
| **Semaforina 4D** | Osteoclasto | Señal inhibidora: frena la formación (en ratones) |

Las **células de inversión** y el techo de células del compartimento de remodelado también cuentan: preparan la superficie y ponen a los precursores de osteoblastos en contacto con estas señales.

> Atencion: el acoplamiento se conoce sobre todo por experimentos en células y en ratones, y no existe una molécula única que lo explique por completo. Los textos estándar destacan al TGF-β1 y al IGF-1 liberados de la matriz; las demás señales de la tabla de profundización se conocen sobre todo en ratones [verificar].

**Esclerostina: el freno de los osteoblastos**

Para formar hueso, el osteoblasto necesita la vía **Wnt/β-catenina**:

1. Wnt se une al receptor Frizzled y al correceptor **LRP5/LRP6**.
2. La β-catenina deja de degradarse, se acumula y entra al núcleo.
3. Se activan genes que promueven la proliferación, la diferenciación y la supervivencia del osteoblasto, y aumenta también la producción de OPG.

La **esclerostina** (gen *SOST*) es una glucoproteína secretada sobre todo por los osteocitos maduros. Se une a LRP5/6, compite con Wnt y bloquea la vía: menos β-catenina y menos formación.

| Situación del osteocito | Esclerostina | Consecuencia |
|---|---|---|
| Carga mecánica adecuada | Baja | La vía Wnt se activa y predomina la formación |
| Falta de carga (reposo prolongado, inmovilización) | Sube | Menos formación; además aumenta RANKL y el hueso se pierde |
| PTH intermitente (sección 5.4) | Baja | Efecto anabólico |

> Recuerda: el osteocito dirige la orquesta. Con carga normal produce poca esclerostina y poco RANKL, y predomina la formación. Sin carga o con daño produce más esclerostina y más RANKL, y predomina la resorción sin formación.

> Dato: las mutaciones que inactivan el gen *SOST* causan esclerosteosis, y una deleción en una región reguladora cercana causa la enfermedad de van Buchem. Las dos producen exceso de hueso, con engrosamiento del cráneo y de la mandíbula [verificar].

> Clinico: el romosozumab es un anticuerpo contra la esclerostina que se usa en osteoporosis grave. Aumenta la formación y reduce la resorción. Su ficha incluye advertencias de riesgo cardiovascular [verificar]. Otro ejemplo de la importancia de la carga: tras perder los dientes, el proceso alveolar deja de recibir cargas a través del ligamento periodontal y se atrofia.

#### Actividades

##### Actividad m5_acoplamiento_multicapa

```yaml
tipo: multicapa
titulo: "De la resorción a la formación: recorre el sitio de remodelado"
instrucciones: "Toca (o pasa el cursor por) cada elemento de la ilustración, en el orden que quieras, para ver qué papel cumple en el acoplamiento. Debes visitar los ocho."
obligatoria: true
puntaje_max: 20
concepto: "Acoplamiento entre resorción y formación; esclerostina y vía Wnt"
interaccion: "Ratón: el hover resalta y el clic fija el elemento. Táctil: un toque abre el texto. Teclado: Tab recorre los elementos y Enter abre el texto."
retroalimentacion:
  acierto: "Recorriste todo el sitio. La idea central: la resorción libera las señales que reclutan y diferencian a los osteoblastos, y el osteocito regula el ritmo con la esclerostina."
  error: "Todavía te faltan elementos por visitar. Sigue la secuencia: matriz, osteoclasto, factores liberados, células reclutadas, osteoblasto y osteocito."
svg: m5_acoplamiento_matriz_esclerostina
modo: explorar
capas:
  - id: matriz_con_factores
    etiqueta: "Matriz con factores almacenados"
    descripcion: "La matriz mineralizada guarda factores de crecimiento latentes: TGF-β1, IGF-1, IGF-2 y BMP. Mientras el hueso no se resorbe, permanecen atrapados."
  - id: osteoclasto_resorbiendo
    etiqueta: "Osteoclasto en la laguna"
    descripcion: "El osteoclasto disuelve el mineral con ácido y degrada el colágeno con catepsina K. Al abrir la matriz deja salir los factores almacenados. La resorción es lo que enciende el acoplamiento."
  - id: factores_liberados
    etiqueta: "TGF-β1 e IGF-1 liberados"
    descripcion: "El TGF-β1 se activa y forma un gradiente hacia la laguna; el IGF-1 y las BMP también se liberan. Son las señales que traducen «aquí se resorbió» en «aquí hay que formar»."
  - id: celula_mesenquimal_reclutada
    etiqueta: "Célula mesenquimal reclutada"
    descripcion: "El TGF-β1 activado atrae a células madre mesenquimales de la médula y del techo del compartimento hacia la laguna."
  - id: preosteoblasto_igf1
    etiqueta: "Preosteoblasto"
    descripcion: "Ya en la laguna, el IGF-1 y las BMP hacen que la célula mesenquimal se comprometa como preosteoblasto y luego como osteoblasto maduro."
  - id: osteoblasto_formador
    etiqueta: "Osteoblasto formador"
    descripcion: "El osteoblasto deposita osteoide sobre la línea de cemento. Para hacerlo necesita la vía Wnt, que se activa a través de Frizzled y LRP5/6."
  - id: osteocito_esclerostina
    etiqueta: "Osteocito que secreta esclerostina"
    descripcion: "Los osteocitos del hueso vecino liberan esclerostina, que llega a la superficie por los canalículos. Es el freno de la formación: sube sin carga y baja con carga."
  - id: via_wnt_lrp5_6
    etiqueta: "Vía Wnt y LRP5/6"
    descripcion: "Wnt y esclerostina compiten por LRP5/6. Si gana Wnt, la β-catenina se acumula y hay formación. Si gana la esclerostina, la vía se apaga."
requeridas: [matriz_con_factores, osteoclasto_resorbiendo, factores_liberados, celula_mesenquimal_reclutada, preosteoblasto_igf1, osteoblasto_formador, osteocito_esclerostina, via_wnt_lrp5_6]
```

##### Actividad m5_arrastre_acoplamiento

```yaml
tipo: arrastre-molecular
titulo: "Activa el acoplamiento y frénalo con la esclerostina"
instrucciones: "Arrastra cada molécula al receptor de la célula correspondiente y observa qué ocurre con el osteoide. Dos de las seis moléculas no encajan en ningún receptor de la escena."
obligatoria: true
puntaje_max: 40
concepto: "Señales de acoplamiento (TGF-β1, IGF-1), vía Wnt y esclerostina"
interaccion: "Ratón: arrastrar la molécula al receptor. Táctil: arrastrar con un dedo o tocar la molécula y luego el receptor. Teclado: Tab elige molécula, Enter la toma, Tab elige receptor y Enter la suelta."
retroalimentacion:
  acierto: "Acople correcto. Observa el indicador de osteoide: sube con las señales de formación y baja con la esclerostina."
  error: "Esa molécula no se une a ese receptor. Recuerda: TGF-β1 recluta células mesenquimales, IGF-1 actúa sobre el preosteoblasto y Wnt y esclerostina compiten por LRP5/6."
svg: m5_acoplamiento_matriz_esclerostina
escena: "Corte de una laguna de resorción recién terminada, con la ilustración m5_acoplamiento_matriz_esclerostina como fondo. A la izquierda hay una célula mesenquimal con receptor de TGF-β; en el centro, un preosteoblasto con receptor de IGF-1; a la derecha, un osteoblasto formador con el complejo Frizzled y LRP5/6. En la bandeja lateral hay seis moléculas: cuatro correctas (TGF-β1, IGF-1, Wnt y esclerostina) y dos que no encajan. Un indicador de osteoide, sobre la laguna, sube con las señales de formación y baja con la esclerostina. Los acoples pueden hacerse en cualquier orden; Wnt y esclerostina comparten el receptor LRP5/6, así que el último de los dos que se acople decide el estado final de esa célula (el otro se retira)."
moleculas:
  - id: tgf_beta1
    nombre: "TGF-β1 activo"
    descripcion: "Factor almacenado en la matriz que la resorción libera y activa. Atrae a las células mesenquimales hacia la laguna."
  - id: igf1
    nombre: "IGF-1"
    descripcion: "Factor de crecimiento liberado de la matriz. Favorece la diferenciación y la supervivencia de los osteoblastos."
  - id: wnt
    nombre: "Wnt"
    descripcion: "Ligando de la vía canónica Wnt/β-catenina, que activa al osteoblasto."
  - id: esclerostina
    nombre: "Esclerostina"
    descripcion: "Glucoproteína secretada por el osteocito. Se une a LRP5/6 y bloquea a Wnt."
receptores:
  - id: receptor_tgf_beta
    nombre: "Receptor de TGF-β (célula mesenquimal)"
    descripcion: "Receptor de la célula mesenquimal que responde al TGF-β1 activo con migración hacia la laguna."
  - id: receptor_igf1
    nombre: "Receptor de IGF-1 (preosteoblasto)"
    descripcion: "Receptor del preosteoblasto que responde al IGF-1 con diferenciación y supervivencia."
  - id: lrp5_6
    nombre: "LRP5/6 con Frizzled (osteoblasto)"
    descripcion: "Complejo receptor de la vía Wnt en el osteoblasto. Acepta dos moléculas: Wnt (lo activa) o la esclerostina (lo bloquea). Ambos pares puntúan una vez cada uno; el estado final de la animación lo determina el último acople."
pares:
  - molecula: tgf_beta1
    receptor: receptor_tgf_beta
    efecto:
      titulo: "Reclutamiento de células mesenquimales"
      descripcion: "El TGF-β1 activado por la resorción atrae a las células mesenquimales hacia la laguna, donde recibirán las señales de diferenciación."
      que_se_anima: "La célula mesenquimal se alarga y se desplaza hacia la laguna siguiendo un gradiente de color. El indicador de osteoide sube un nivel."
  - molecula: igf1
    receptor: receptor_igf1
    efecto:
      titulo: "Diferenciación a osteoblasto"
      descripcion: "El IGF-1 liberado de la matriz favorece que el preosteoblasto se diferencie y sobreviva. Pasa de una célula alargada a un osteoblasto cuboidal."
      que_se_anima: "El preosteoblasto se vuelve cuboidal y aparece una fina banda de osteoide sobre la línea de cemento. El indicador de osteoide sube un nivel."
  - molecula: wnt
    receptor: lrp5_6
    efecto:
      titulo: "Vía Wnt activa"
      descripcion: "Wnt se une a Frizzled y LRP5/6: la β-catenina deja de degradarse, se acumula y entra al núcleo. El osteoblasto aumenta su actividad y su supervivencia."
      que_se_anima: "Puntos de β-catenina se acumulan y entran al núcleo del osteoblasto; la banda de osteoide se engruesa. El indicador de osteoide sube."
  - molecula: esclerostina
    receptor: lrp5_6
    efecto:
      titulo: "Freno de la formación"
      descripcion: "La esclerostina ocupa LRP5/6 y evita que Wnt se una. La β-catenina se degrada y el osteoblasto reduce su actividad. Es el freno que el osteocito aplica cuando no hay carga."
      que_se_anima: "La esclerostina cubre LRP5/6, Wnt rebota (si ya estaba unido, es desplazado), la β-catenina desaparece del núcleo y el osteoblasto se aplana. El indicador de osteoide baja."
distractores:
  - id: rankl
    nombre: "RANKL"
    descripcion: "Ligando que activa a RANK en los precursores de osteoclastos."
    por_que_no_encaja: "Los receptores de esta escena están en células del linaje osteoblástico. RANK está en los precursores de osteoclastos, que no aparecen aquí. RANKL no interviene en este tramo del acoplamiento."
  - id: calcitonina
    nombre: "Calcitonina"
    descripcion: "Hormona secretada por las células C del tiroides."
    por_que_no_encaja: "Su receptor está en el osteoclasto, que aquí ya terminó su trabajo. No actúa sobre las células del linaje osteoblástico de esta escena."
```

##### Actividad m5_quiz_acoplamiento

```yaml
tipo: quiz
titulo: "Comprueba el acoplamiento y la esclerostina"
instrucciones: "Responde las tres preguntas. Después de cada una verás una explicación breve."
obligatoria: true
puntaje_max: 30
concepto: "Acoplamiento y regulación de la formación por esclerostina"
interaccion: "Ratón: clic en la opción. Táctil: toque en la opción. Teclado: flechas para moverte entre opciones y Enter para responder."
retroalimentacion:
  acierto: "Bien. Recuerda que el acoplamiento une en un mismo sitio lo que se resorbió con lo que se forma, y que la esclerostina es el freno de esa formación."
  error: "Repasa el mapa de la ilustración: la resorción libera TGF-β1 e IGF-1, y el osteocito regula el ritmo con la esclerostina."
preguntas:
  - id: m5_3_q1_matriz
    formato: opcion_multiple
    enunciado: "¿Cómo contribuye la propia resorción a que después se forme hueso en el mismo sitio?"
    opciones:
      - id: a
        texto: "El osteoclasto libera y activa factores almacenados en la matriz, como TGF-β1 e IGF-1"
      - id: b
        texto: "El osteoclasto se transforma en osteoblasto al terminar la resorción"
      - id: c
        texto: "El calcio liberado de la matriz pasa a los osteoblastos y forma directamente el nuevo mineral"
      - id: d
        texto: "No contribuye: la formación es independiente y ocurre en superficies distintas"
    correcta: a
    explicacion: "La matriz es un almacén de factores de crecimiento. Al disolverla, el osteoclasto libera y activa TGF-β1 e IGF-1, que reclutan y diferencian a los osteoblastos en el mismo sitio. Osteoclastos y osteoblastos son linajes distintos, y la formación independiente de la resorción es el modelado, no el remodelado."
    dificultad: 2
    concepto: "Factores de acoplamiento liberados de la matriz"
  - id: m5_3_q2_esclerostina
    formato: opcion_multiple
    enunciado: "¿Cuál es la acción de la esclerostina?"
    opciones:
      - id: a
        texto: "Se une a Frizzled y activa la vía Wnt, con lo que aumenta la formación ósea"
      - id: b
        texto: "Actúa como señuelo de RANKL y frena la osteoclastogénesis en el sitio de resorción"
      - id: c
        texto: "Se une a LRP5/6 y bloquea la vía Wnt, con lo que reduce la formación ósea"
      - id: d
        texto: "Estimula la apoptosis del osteoclasto maduro y acorta su tiempo de resorción"
    correcta: c
    explicacion: "La esclerostina, secretada por el osteocito, compite con Wnt por LRP5/6 y frena la formación. El señuelo de RANKL es la OPG. El nombre engaña: su falta produce esclerosis (hueso denso), no su presencia."
    dificultad: 2
    concepto: "Función de la esclerostina"
  - id: m5_3_q3_descarga
    formato: opcion_multiple
    enunciado: "Un paciente pasa varias semanas inmovilizado en cama. ¿Qué cambio esperas en los osteocitos de su esqueleto?"
    opciones:
      - id: a
        texto: "Aumentan la esclerostina y el RANKL, lo que favorece la pérdida de hueso"
      - id: b
        texto: "Disminuyen la esclerostina y el RANKL, lo que favorece la formación de hueso nuevo"
      - id: c
        texto: "No cambian: los osteocitos no responden a la falta de carga mecánica"
      - id: d
        texto: "Producen más OPG y menos esclerostina, lo que aumenta la masa ósea global"
    correcta: a
    explicacion: "Sin carga, el osteocito produce más esclerostina (menos formación) y más RANKL (más resorción). El resultado es pérdida de hueso. Con carga ocurre lo contrario."
    dificultad: 2
    concepto: "Carga mecánica, esclerostina y RANKL"
```

### Seccion 5.4: Hormonas que regulan el remodelado (id "m5_4_hormonas_remodelado")

Id: "m5_4_hormonas_remodelado" · Duración aproximada: 12 minutos

#### Contenido

**Un tejido con dos exigencias**

El hueso debe cumplir dos tareas a la vez: sostener el cuerpo y guardar el calcio. La calcemia se mantiene en un intervalo muy estrecho (el calcio ionizado en sangre es de aproximadamente 1,1 a 1,3 mmol/L [verificar]) porque de ella dependen los músculos, los nervios y la coagulación. Cuando el calcio baja, el organismo lo saca del hueso. Ese es el origen de buena parte del remodelado no dirigido (sección 5.1).

> Dato: cerca del 99 % del calcio del cuerpo está en el hueso. El esqueleto es el reservorio que amortigua la calcemia.

Cuatro hormonas dominan el remodelado. Casi todas actúan sobre la relación RANKL/OPG (sección 5.2).

| Hormona | Origen y estímulo | Efecto sobre el hueso | Efecto neto |
|---|---|---|---|
| **PTH** | Células principales de las paratiroides; calcemia baja | Actúa sobre el receptor PTH1R del linaje osteoblástico y del osteocito: sube RANKL y M-CSF, baja OPG y baja esclerostina | Sostenida: catabólica. Intermitente: anabólica |
| **Calcitriol** (1,25-dihidroxivitamina D) | Riñón (activación por 1α-hidroxilasa, estimulada por la PTH) | Aumenta la absorción intestinal de calcio y fosfato y aporta el mineral para mineralizar; a dosis altas puede subir RANKL [verificar] | Mantiene la mineralización; su déficit causa raquitismo u osteomalacia |
| **Calcitonina** | Células C del tiroides; calcemia alta | Se une a su receptor en el osteoclasto y retrae su borde festoneado | Frena la resorción de forma breve; papel fisiológico menor en el adulto |
| **Estrógenos** | Ovario (en el varón, también por conversión de testosterona) | Bajan RANKL, suben OPG, favorecen la apoptosis del osteoclasto y protegen a osteoblastos y osteocitos | Protectores: frenan la resorción |

**PTH: la misma hormona, dos efectos**

- **Elevada de forma sostenida** (por ejemplo, un adenoma paratiroideo): la PTH sube RANKL y baja OPG de manera continua, y predomina la resorción. Es la situación del hiperparatiroidismo, con pérdida de hueso sobre todo cortical.
- **En pulsos breves y diarios** (teriparatida, un fragmento de la PTH, inyectado una vez al día): estimula a los osteoblastos (más células, más supervivencia, menos esclerostina) y el aumento de resorción es menor. El balance favorece la formación y el hueso aumenta.

> Recuerda: la PTH sostenida destruye y la PTH en pulsos construye. La diferencia es el patrón temporal, no la molécula.

**Vitamina D: el aporte de mineral**

La vitamina D se obtiene de la piel (con luz ultravioleta B) y de la dieta. El hígado la convierte en 25-hidroxivitamina D (la reserva que se mide en sangre) y el riñón, con la enzima 1α-hidroxilasa, en **calcitriol**, la forma activa.

- El calcitriol aumenta la absorción intestinal de calcio y de fosfato. Sin ese aporte, el osteoide no se mineraliza bien.
- La deficiencia grave produce **raquitismo** en niños y **osteomalacia** en adultos: hueso blando, con osteoide sin mineralizar. Además, el calcio bajo eleva la PTH (hiperparatiroidismo secundario) y acelera la pérdida de hueso.
- El calcitriol también frena la síntesis de PTH, lo que cierra un circuito de retroalimentación.

> Clinico: el raquitismo puede retrasar la erupción dentaria y causar hipoplasia del esmalte y defectos de la dentina [verificar]. Un hiperparatiroidismo primario puede dejar huella en los maxilares: pérdida de la lámina dura, radiolucidez difusa y lesiones de células gigantes conocidas como tumores pardos [verificar].

**Calcitonina: el freno rápido**

Las células C del tiroides la liberan cuando el calcio sube. Se une a su receptor en el osteoclasto, que retrae su borde festoneado y deja de resorber. El efecto es rápido pero de corta duración. En el adulto su papel fisiológico es pequeño: las personas sin tiroides mantienen una calcemia y un hueso normales [verificar]. Su uso clínico actual es limitado.

> Atencion: no confundas **calcitonina** (baja el calcio, células C del tiroides) con **calcitriol** (sube la absorción de calcio, vitamina D activa).

**Estrógenos: el escudo del hueso**

Los estrógenos frenan la resorción por varias vías: bajan RANKL, suben OPG, favorecen la apoptosis de los osteoclastos, reducen las citocinas que estimulan la resorción y protegen del daño a osteoblastos y osteocitos.

Cuando disminuyen, como ocurre en la menopausia, aumenta el número de BMU activadas y la formación no compensa lo que se resorbe en cada una. La pérdida ósea se acelera sobre todo en los primeros años posmenopáusicos [verificar]. En los varones, el estradiol formado a partir de testosterona cumple un papel parecido.

**Otras hormonas que conviene conocer**

| Hormona | Efecto principal |
|---|---|
| Glucocorticoides en exceso | Suben RANKL, bajan OPG, acortan la vida de osteoblastos y osteocitos y reducen la formación; causan osteoporosis |
| Hormonas tiroideas en exceso | Aceleran el recambio óseo (más activación de BMU) y favorecen la pérdida de hueso |
| Hormona de crecimiento e IGF-1 | Favorecen la formación de hueso |

#### Actividades

##### Actividad m5_hormonas_multicapa

```yaml
tipo: multicapa
titulo: "El circuito del calcio y el hueso"
instrucciones: "Toca (o pasa el cursor por) cada órgano del esquema para ver qué hormona libera y cómo actúa sobre el calcio y el hueso. Debes visitar los siete elementos."
obligatoria: false
puntaje_max: 20
concepto: "Regulación hormonal de la calcemia y del remodelado"
interaccion: "Ratón: el hover resalta y el clic fija el elemento. Táctil: un toque abre el texto. Teclado: Tab recorre los elementos y Enter abre el texto."
retroalimentacion:
  acierto: "Recorriste el circuito completo. Fíjate en que la PTH y el calcitriol suben el calcio por tres vías (hueso, riñón e intestino) y la calcitonina lo baja."
  error: "Te faltan elementos por visitar. Empieza por la calcemia y sigue cada flecha."
svg: m5_hormonas_regulacion_calcemia
modo: explorar
capas:
  - id: sangre_calcemia
    etiqueta: "Calcemia"
    descripcion: "El calcio ionizado de la sangre se mantiene en un intervalo estrecho porque los músculos, los nervios y la coagulación dependen de él. Cuando baja, el organismo actúa por tres vías: hueso, riñón e intestino."
  - id: paratiroides_pth
    etiqueta: "Paratiroides: PTH"
    descripcion: "Las paratiroides, situadas en la cara posterior del tiroides, detectan la calcemia baja y liberan PTH. La PTH sube el calcio en sangre al actuar sobre el hueso y el riñón."
  - id: tiroides_calcitonina
    etiqueta: "Tiroides: calcitonina"
    descripcion: "Las células C del tiroides secretan calcitonina cuando el calcio sube. Frena al osteoclasto, pero en el adulto su papel fisiológico es menor."
  - id: rinon_calcitriol
    etiqueta: "Riñón: calcitriol y calcio"
    descripcion: "En el riñón, la PTH aumenta la reabsorción de calcio, reduce la de fosfato y estimula la enzima 1α-hidroxilasa, que convierte la 25-hidroxivitamina D en calcitriol, la forma activa."
  - id: intestino_absorcion
    etiqueta: "Intestino: absorción"
    descripcion: "El calcitriol aumenta la absorción intestinal de calcio y fosfato. Es la vía que aporta el mineral que el hueso necesita para mineralizarse."
  - id: hueso_diana
    etiqueta: "Hueso: RANKL, OPG y osteoclasto"
    descripcion: "La PTH actúa sobre el linaje osteoblástico y el osteocito: sube RANKL y baja OPG, lo que activa a los osteoclastos y libera calcio. El calcitriol aporta el mineral para mineralizar; a dosis altas o con hiperparatiroidismo secundario puede subir RANKL [verificar]."
  - id: ovario_estrogenos
    etiqueta: "Ovario: estrógenos"
    descripcion: "Los estrógenos bajan RANKL, suben OPG y favorecen la apoptosis de los osteoclastos: frenan la resorción. Su descenso en la menopausia acelera la pérdida de hueso."
requeridas: [sangre_calcemia, paratiroides_pth, tiroides_calcitonina, rinon_calcitriol, intestino_absorcion, hueso_diana, ovario_estrogenos]
```

##### Actividad m5_relacion_hormonas

```yaml
tipo: relacion-columnas
titulo: "Hormona y efecto sobre el remodelado"
instrucciones: "Une cada hormona o situación hormonal (columna izquierda) con su efecto sobre el hueso (columna derecha). Sobran dos efectos en la columna derecha."
obligatoria: true
puntaje_max: 30
concepto: "Efecto de PTH, estrógenos, calcitonina, vitamina D y glucocorticoides sobre el hueso"
interaccion: "Ratón: clic en un elemento de cada columna, o arrastrar. Táctil: tocar uno de la izquierda y luego uno de la derecha. Teclado: Tab, Enter en la columna izquierda, Tab hasta la derecha y Enter."
retroalimentacion:
  acierto: "Todas las parejas son correctas. Recuerda: la PTH cambia de signo según su patrón temporal, y casi todas estas hormonas actúan moviendo la balanza RANKL/OPG."
  error: "Alguna pareja es incorrecta. Piensa en el patrón (pulsos o sostenido) para la PTH, en quién frena la resorción (estrógenos y calcitonina) y en quién aporta mineral (calcitriol)."
izquierda:
  - id: l_pth_pulsos
    texto: "PTH en dosis bajas e intermitentes (teriparatida)"
  - id: l_pth_sostenida
    texto: "PTH elevada de forma sostenida (hiperparatiroidismo)"
  - id: l_estrogenos
    texto: "Estrógenos"
  - id: l_calcitonina
    texto: "Calcitonina"
  - id: l_calcitriol
    texto: "Calcitriol (1,25-dihidroxivitamina D)"
  - id: l_glucocorticoides
    texto: "Glucocorticoides en exceso"
derecha:
  - id: r_anabolica
    texto: "Efecto anabólico: más osteoblastos y menos esclerostina; la formación supera a la resorción"
  - id: r_catabolica
    texto: "Efecto catabólico por exceso de resorción, sobre todo en el hueso cortical"
  - id: r_frena
    texto: "Baja RANKL, sube OPG y favorece la apoptosis del osteoclasto: frena la resorción"
  - id: r_retrae
    texto: "Actúa sobre el receptor del osteoclasto y retrae su borde festoneado; efecto breve"
  - id: r_absorcion
    texto: "Aumenta la absorción intestinal de calcio y fosfato y aporta mineral para la mineralización"
  - id: r_gluco
    texto: "Acorta la vida de osteoblastos y osteocitos y reduce la formación, además de subir RANKL"
  - id: r_captura
    texto: "Se une a RANKL y lo aparta de RANK, igual que la OPG"
  - id: r_esclerostina
    texto: "Proteína secretada por el osteocito que bloquea la vía Wnt"
pares:
  - izquierda: l_pth_pulsos
    derecha: r_anabolica
  - izquierda: l_pth_sostenida
    derecha: r_catabolica
  - izquierda: l_estrogenos
    derecha: r_frena
  - izquierda: l_calcitonina
    derecha: r_retrae
  - izquierda: l_calcitriol
    derecha: r_absorcion
  - izquierda: l_glucocorticoides
    derecha: r_gluco
distractores: [r_captura, r_esclerostina]
```

##### Actividad m5_quiz_hormonas

```yaml
tipo: quiz
titulo: "Comprueba la regulación hormonal"
instrucciones: "Responde las cuatro preguntas. Después de cada una verás una explicación breve."
obligatoria: true
puntaje_max: 40
concepto: "Regulación hormonal del remodelado óseo"
interaccion: "Ratón: clic en la opción. Táctil: toque en la opción. Teclado: flechas para moverte entre opciones y Enter para responder."
retroalimentacion:
  acierto: "Bien. Las hormonas del remodelado se entienden como fuerzas que empujan la balanza RANKL/OPG y el aporte de mineral."
  error: "Repasa la tabla de las cuatro hormonas: qué frena la resorción, qué la estimula y qué aporta el mineral."
preguntas:
  - id: m5_4_q1_pth
    formato: opcion_multiple
    enunciado: "Una paciente recibe teriparatida (PTH 1-34) en una inyección diaria. Otra persona tiene un adenoma paratiroideo con PTH elevada de forma constante. ¿Qué esperas?"
    opciones:
      - id: a
        texto: "Ambas pierden hueso por igual, porque la PTH siempre activa a los osteoclastos y frena a los osteoblastos"
      - id: b
        texto: "La inyección diaria es predominantemente anabólica y la PTH constante, predominantemente catabólica"
      - id: c
        texto: "La inyección diaria es predominantemente catabólica y la PTH constante, predominantemente anabólica"
      - id: d
        texto: "Ninguna modifica el hueso, porque la PTH actúa solo sobre el riñón y el intestino"
    correcta: b
    explicacion: "El patrón temporal decide. En pulsos breves, la PTH estimula a los osteoblastos y el balance favorece la formación. Sostenida, sube RANKL de forma continua y predomina la resorción."
    dificultad: 2
    concepto: "PTH intermitente frente a sostenida"
  - id: m5_4_q2_estrogenos
    formato: opcion_multiple
    enunciado: "¿Qué cambio explica que la deficiencia de estrógenos cause pérdida de hueso?"
    opciones:
      - id: a
        texto: "Sube la relación RANKL/OPG y se activan más BMU, sin que la formación compense"
      - id: b
        texto: "Baja RANKL y sube OPG, lo que frena la resorción y protege a los osteocitos"
      - id: c
        texto: "Los estrógenos actúan solo sobre el útero y no tienen relación con el hueso ni con las BMU"
      - id: d
        texto: "Aumenta la mineralización del osteoide y el hueso se vuelve rígido y quebradizo"
    correcta: a
    explicacion: "Sin estrógenos aumentan RANKL y las citocinas que estimulan la resorción, y se activan más BMU. En cada una, la formación no alcanza a reponer lo resorbido. Bajar RANKL y subir OPG es el efecto normal de los estrógenos, no el de su deficiencia."
    dificultad: 2
    concepto: "Deficiencia de estrógenos y pérdida ósea"
  - id: m5_4_q3_calcitonina
    formato: verdadero_falso
    enunciado: "La calcitonina es la principal hormona que mantiene la calcemia en el adulto."
    correcta: falso
    explicacion: "Falso. La calcitonina frena al osteoclasto, pero en el adulto su papel fisiológico es menor. La calcemia se mantiene sobre todo con la PTH y el calcitriol."
    dificultad: 1
    concepto: "Papel de la calcitonina"
  - id: m5_4_q4_vitamina_d
    formato: opcion_multiple
    enunciado: "Un niño con deficiencia grave de vitamina D tiene huesos blandos y deformados. ¿Qué proceso está alterado principalmente?"
    opciones:
      - id: a
        texto: "La formación de osteoclastos, por un exceso de RANKL producido por los osteoblastos"
      - id: b
        texto: "La síntesis de colágeno tipo I, porque los osteoblastos no logran secretarlo"
      - id: c
        texto: "La apoptosis de los osteocitos, que mueren de forma prematura en el hueso"
      - id: d
        texto: "La mineralización del osteoide, por falta de calcio y fosfato disponibles"
    correcta: d
    explicacion: "Sin vitamina D activa se absorbe poco calcio y fosfato, y el osteoide no se mineraliza bien. Es el raquitismo. El colágeno tipo I se sintetiza con normalidad: lo que falla es el mineral."
    dificultad: 2
    concepto: "Vitamina D y mineralización"
```

### Seccion 5.5: Hueso cortical, trabecular y alveolar: el movimiento ortodóntico (id "m5_5_alveolar_ortodoncia")

Id: "m5_5_alveolar_ortodoncia" · Duración aproximada: 18 minutos

#### Contenido

**Dos tipos de hueso, dos ritmos de recambio**

| | Hueso cortical (compacto) | Hueso trabecular (esponjoso) |
|---|---|---|
| Proporción de la masa esquelética | Aproximadamente 80 % | Aproximadamente 20 % |
| Superficie disponible por unidad de volumen | Baja | Alta |
| Recambio anual aproximado | 2 a 3 % | Alrededor de 25 % [verificar] |
| Forma de la BMU | Túnel (osteona) | Surco superficial (hemiosteona) |
| Pérdida con deficiencia de estrógenos | Más lenta | Más rápida y más temprana |
| Ejemplos en la mandíbula | Cortical basal y tablas vestibular y lingual | Esponjoso del proceso alveolar y del cuerpo |

El hueso trabecular es la minoría de la masa, pero concentra la mayor parte del recambio [verificar]. La explicación principal es geométrica: el remodelado solo ocurre en superficies, y el hueso trabecular tiene mucha más superficie por unidad de volumen. Por unidad de superficie, la diferencia entre ambos es mucho menor [verificar].

> Clinico: por esta razón, al iniciar un fármaco que reduce la resorción, la densidad del hueso trabecular (por ejemplo, la de las vértebras) tiende a aumentar antes que la del hueso cortical.

**El hueso alveolar: un hueso que depende del diente**

El **proceso alveolar** es la parte del maxilar y de la mandíbula que aloja las raíces. Se distinguen tres componentes:

- **Hueso alveolar propio**: una lámina delgada que reviste el alvéolo. Recibe las fibras de Sharpey del ligamento periodontal (por eso se llama también hueso fascicular) y está perforado por conductos vasculares (lámina cribiforme). En la radiografía corresponde a la **lámina dura**.
- **Hueso de soporte**: las tablas corticales vestibular y lingual y el hueso esponjoso interradicular e interdental que las une.
- **Hueso basal**: la porción inferior del cuerpo mandibular. No depende de los dientes.

Lo que hace especial a este hueso:

1. **Se remodela con rapidez.** En estudios en animales, el hueso alveolar se renueva varias veces más rápido que el fémur, y dentro de la mandíbula, más que el hueso basal [verificar]. Contribuyen la cercanía del ligamento periodontal (rico en células progenitoras), la carga masticatoria y el ambiente inflamatorio de la cavidad oral.
2. **Depende del diente.** Se forma con la erupción y se atrofia si el diente se pierde. El hueso basal permanece.
3. **Responde a la inflamación periodontal** con la misma balanza RANKL/OPG de la sección 5.2.
4. **Convive con el cemento radicular**, que se resorbe mucho menos que el hueso en las mismas condiciones, y por eso el diente puede moverse sin que su raíz se disuelva [verificar].

**El movimiento ortodóntico: remodelado provocado**

Cuando se aplica una fuerza a un diente, el diente se mueve dentro del alvéolo porque el hueso alveolar se remodela. El hueso no se dobla: se resorbe en el lado hacia el que se empuja el diente y se forma en el lado opuesto. El ligamento periodontal transmite la fuerza; sus células y los osteocitos detectan la deformación (mecanotransducción, módulo 3).

| | Lado de compresión (hacia el que se mueve el diente) | Lado de tensión (el opuesto) |
|---|---|---|
| Ligamento periodontal | Comprimido y estrechado; vasos comprimidos; hipoxia | Estirado y ensanchado; fibras tensas; las células proliferan |
| Señales | RANKL sube, OPG baja; prostaglandina E2, IL-1β y TNF-α | OPG sube, RANKL baja; IL-10, colágeno I y marcadores osteogénicos (osteocalcina) [verificar] |
| Células | Osteoclastos | Osteoblastos (de progenitores del ligamento) |
| Proceso óseo | Resorción de la pared alveolar | Depósito de osteoide sobre la pared alveolar |

Estos patrones de señales provienen en parte de un estudio en humanos con expansión maxilar rápida (Garlet 2007) y en parte de modelos animales, y no valen igual para todos los tipos de movimiento [verificar]. El TGF-β1 que libera la matriz al resorberse (sección 5.3) participa en el acoplamiento, pero no es una señal exclusiva del lado de tensión.

**Fuerza ligera frente a fuerza excesiva**

- Con una fuerza **ligera y continua**, los osteoclastos aparecen pronto desde el propio ligamento y resorben la pared alveolar desde el lado del ligamento. Se llama resorción **directa o frontal**. La hialinización es una respuesta casi inevitable al inicio del movimiento, pero con fuerza ligera se limita a focos pequeños [verificar].
- Con una fuerza **excesiva**, el ligamento comprimido queda sin riego en un área más extensa y sus células mueren: la zona **hialinizada**, sin núcleos y de aspecto vítreo, es mayor. El movimiento se detiene hasta que osteoclastos de los espacios medulares vecinos eliminan hueso por debajo de esa zona (resorción **socavante**) y retiran los restos.

El movimiento suele describirse en tres fases: una **inicial**, de desplazamiento rápido en el primer día o dos, por la deformación del ligamento; una de **retraso**, con la hialinización, que dura de unos días a varias semanas según la fuerza [verificar]; y una de **movimiento continuo**, a una velocidad del orden de 1 mm al mes [verificar].

> Recuerda: resorción en compresión y formación en tensión. Si el canino se retrae hacia distal, la pared distal del alvéolo se resorbe y sobre la pared mesial se forma hueso nuevo.

> Atencion: más fuerza no significa más velocidad. La idea clásica (Schwarz, 1932) es que la fuerza óptima no supera la presión capilar del ligamento, de aproximadamente 20 a 25 mmHg [verificar]. Una fuerza excesiva provoca hialinización extensa, retrasa el movimiento y aumenta el riesgo de resorción radicular y de dolor.

> Dato: tras una lesión ósea, como una corticotomía, aumenta de forma transitoria la activación de BMU en la zona: es el fenómeno de aceleración regional (RAP), descrito por Frost. Se aprovecha en ortodoncia para acelerar el movimiento dentario. En animales, la esclerostina tiende a aumentar en el lado de compresión y a disminuir en el de tensión [verificar].

> Clinico: los fármacos que reducen la resorción (bisfosfonatos, denosumab) tienden a enlentecer el movimiento ortodóntico, porque sin osteoclastos no se resorbe hueso en el lado de compresión [verificar]. Y como la periodontitis y la ortodoncia comparten la balanza RANKL/OPG, conviene controlar la inflamación periodontal antes de aplicar fuerzas.

#### Actividades

##### Actividad m5_alveolar_multicapa

```yaml
# Ilustración realista exacta (tools/imagenes/texturizar.py, 2026-10-25): forma del dibujo validado, texturas de tejido real.
tipo: multicapa
titulo: "Identifica los tejidos del proceso alveolar"
instrucciones: "En el corte transversal de la mandíbula, toca la estructura que se pide en cada consigna. Al terminar podrás explorar cada capa libremente."
obligatoria: false
puntaje_max: 20
concepto: "Tejidos de soporte dentario: hueso alveolar propio, cortical, esponjoso y basal"
interaccion: "Ratón: clic en la capa que responde a la consigna. Táctil: toque en la capa. Teclado: Tab recorre las capas y Enter elige la capa como respuesta."
retroalimentacion:
  acierto: "Identificaste los tejidos del proceso alveolar. Recuerda que el hueso alveolar propio y el de soporte dependen del diente, y el hueso basal no."
  error: "Esa no es la estructura pedida. Fíjate en la ubicación: el hueso alveolar propio reviste el alvéolo, las tablas corticales están por fuera y el hueso basal está por debajo."
svg: m5_hueso_cortical_trabecular_alveolar
modo: identificar
capas:
  - id: tabla_cortical_vestibular
    etiqueta: "Tabla cortical vestibular"
    descripcion: "Lámina de hueso compacto en el lado vestibular (hacia la mejilla o el labio). Es la que más se resorbe tras una extracción y limita el movimiento ortodóntico hacia vestibular."
  - id: tabla_cortical_lingual
    etiqueta: "Tabla cortical lingual"
    descripcion: "Lámina de hueso compacto en el lado lingual. Su espesor varía según la región de la mandíbula."
  - id: hueso_esponjoso_alveolar
    etiqueta: "Hueso esponjoso de soporte"
    descripcion: "Trabéculas y médula entre las tablas corticales y alrededor del alvéolo. Allí trabajan las BMU trabeculares y el recambio es alto."
  - id: hueso_alveolar_propio
    etiqueta: "Hueso alveolar propio"
    descripcion: "Lámina fina que reviste el alvéolo, con fibras de Sharpey y conductos vasculares (lámina cribiforme). Es la lámina dura de la radiografía. Depende del diente y desaparece tras la extracción."
  - id: ligamento_periodontal
    etiqueta: "Ligamento periodontal"
    descripcion: "Tejido conectivo de décimas de milímetro de espesor que une el cemento con el hueso alveolar. Transmite la carga y contiene células progenitoras, y es el escenario del movimiento ortodóntico."
  - id: raiz_dentaria
    etiqueta: "Raíz dentaria con cemento"
    descripcion: "La raíz está cubierta por cemento, que se resorbe mucho menos que el hueso en las mismas condiciones; por eso el diente se mueve sin que se disuelva su raíz."
  - id: cresta_alveolar
    etiqueta: "Cresta alveolar"
    descripcion: "Margen coronal del hueso alveolar. En un periodonto sano se sitúa aproximadamente 1 a 2 mm apical a la unión amelocementaria [verificar]. Es el primer sitio donde la periodontitis hace perder hueso."
  - id: hueso_basal
    etiqueta: "Hueso basal"
    descripcion: "Porción inferior del cuerpo mandibular, con cortical gruesa. No depende de los dientes y permanece cuando se pierden."
consignas:
  - id: c1_lamina_dura
    enunciado: "Toca la lámina que reviste el alvéolo y que en la radiografía se ve como lámina dura."
    capa_correcta: hueso_alveolar_propio
  - id: c2_basal
    enunciado: "Toca el hueso que no depende de los dientes y permanece cuando se pierden."
    capa_correcta: hueso_basal
  - id: c3_vestibular
    enunciado: "Toca la tabla cortical del lado de la mejilla (vestibular)."
    capa_correcta: tabla_cortical_vestibular
  - id: c4_lingual
    enunciado: "Toca la tabla cortical del lado de la lengua (lingual)."
    capa_correcta: tabla_cortical_lingual
  - id: c5_esponjoso
    enunciado: "Toca el hueso con trabéculas y médula donde trabajan las BMU trabeculares."
    capa_correcta: hueso_esponjoso_alveolar
  - id: c6_ligamento
    enunciado: "Toca el tejido conectivo que une el cemento con el hueso alveolar y transmite la fuerza de la raíz al hueso."
    capa_correcta: ligamento_periodontal
  - id: c7_cresta
    enunciado: "Toca el margen coronal del hueso alveolar, donde la periodontitis empieza a hacer perder hueso."
    capa_correcta: cresta_alveolar
  - id: c8_raiz
    enunciado: "Toca la raíz del diente, cubierta por cemento."
    capa_correcta: raiz_dentaria
requeridas: [tabla_cortical_vestibular, tabla_cortical_lingual, hueso_esponjoso_alveolar, hueso_alveolar_propio, ligamento_periodontal, raiz_dentaria, cresta_alveolar, hueso_basal]
```

##### Actividad m5_explora_mandibula_ortodoncia

```yaml
tipo: exploracion-3d
titulo: "Explora la mandíbula: hueso alveolar y zonas de un movimiento ortodóntico"
instrucciones: "Gira la mandíbula y toca los puntos marcados para leer su descripción. Para ver la tabla lingual, gira el modelo. Debes visitar los siete puntos requeridos; los otros dos son opcionales."
obligatoria: true
puntaje_max: 30
concepto: "Anatomía del hueso alveolar y zonas de tensión y compresión en ortodoncia"
interaccion: "Ratón: arrastrar para girar, rueda para acercar y clic en un hotspot. Táctil: un dedo gira, dos dedos acercan o alejan y un toque abre el hotspot. Teclado: flechas giran, más y menos acercan, Tab recorre una lista equivalente de hotspots y Enter abre el texto."
retroalimentacion:
  acierto: "Localizaste los puntos requeridos. Recuerda la regla del movimiento ortodóntico: resorción en el lado de compresión y formación en el de tensión."
  error: "Te faltan puntos por visitar. Gira el modelo: la tabla lingual y la pared mesial del canino no se ven desde el frente."
modelo: mandibula
hotspots:
  - id: proceso_alveolar
    etiqueta: "Proceso alveolar"
    descripcion: "Parte del cuerpo mandibular que aloja las raíces de los dientes. Se forma con la erupción y se atrofia si se pierden los dientes. Es la zona de la mandíbula con mayor recambio óseo [verificar]."
    zona_anatomica: "Porción superior del cuerpo mandibular, alrededor de los alvéolos dentarios"
  - id: cresta_alveolar
    etiqueta: "Cresta alveolar"
    descripcion: "Margen coronal del proceso alveolar. En un periodonto sano se sitúa aproximadamente 1 a 2 mm apical a la unión amelocementaria [verificar]. Es el primer sitio donde se ve la pérdida ósea de la periodontitis."
    zona_anatomica: "Margen libre del hueso alveolar, cerca del cuello de los dientes"
  - id: tabla_cortical_vestibular
    etiqueta: "Tabla cortical vestibular"
    descripcion: "Lámina de hueso compacto en la cara vestibular del proceso alveolar. Suele ser delgada, sobre todo en la región anterior. Es la pared que más se resorbe tras una extracción y la barrera del movimiento hacia vestibular."
    zona_anatomica: "Cara externa (vestibular) del proceso alveolar"
  - id: tabla_cortical_lingual
    etiqueta: "Tabla cortical lingual"
    descripcion: "Lámina de hueso compacto en la cara lingual del proceso alveolar. Su espesor varía según la región. Hay que girar el modelo para verla."
    zona_anatomica: "Cara interna (lingual) del proceso alveolar"
  - id: cuerpo_mandibular_basal
    etiqueta: "Hueso basal del cuerpo"
    descripcion: "Porción inferior del cuerpo mandibular, con cortical gruesa. No depende de los dientes: permanece cuando el proceso alveolar se atrofia tras perderlos."
    zona_anatomica: "Porción inferior del cuerpo mandibular"
  - id: septo_interdental
    etiqueta: "Septo interdental"
    descripcion: "Tabique de hueso entre dos alvéolos vecinos. Contiene vasos que nutren el ligamento periodontal. En la periodontitis su altura se pierde de forma característica."
    zona_anatomica: "Hueso entre los alvéolos de dos dientes vecinos"
  - id: canino_zona_compresion
    etiqueta: "Zona de compresión del canino"
    descripcion: "Pared alveolar distal del canino cuando una fuerza lo retrae hacia el espacio de una extracción de premolar. El ligamento periodontal se comprime, sube RANKL y los osteoclastos resorben la pared. Si la fuerza es excesiva, la hialinización es más extensa y el movimiento se retrasa."
    zona_anatomica: "Pared alveolar distal del canino (marcador superpuesto)"
  - id: canino_zona_tension
    etiqueta: "Zona de tensión del canino"
    descripcion: "Pared alveolar mesial del mismo alvéolo. El ligamento se estira, predomina OPG y los osteoblastos depositan osteoide sobre la pared. El diente avanza porque el hueso se remodela: se resorbe por delante y se forma por detrás."
    zona_anatomica: "Pared alveolar mesial del canino (marcador superpuesto)"
  - id: agujero_mentoniano
    etiqueta: "Agujero mentoniano"
    descripcion: "Orificio por el que salen el nervio y los vasos mentonianos, a la altura de los premolares. No forma parte del remodelado, pero es una referencia para ubicar la región premolar y un límite en cirugías de la zona."
    zona_anatomica: "Cara externa del cuerpo mandibular, a la altura de los premolares"
requeridos: [proceso_alveolar, cresta_alveolar, tabla_cortical_vestibular, tabla_cortical_lingual, cuerpo_mandibular_basal, canino_zona_compresion, canino_zona_tension]
```

##### Actividad m5_ortodoncia_multicapa

```yaml
# Ilustración realista exacta (tools/imagenes/texturizar.py, 2026-10-25): forma del dibujo validado, texturas de tejido real.
tipo: multicapa
titulo: "Tensión y compresión alrededor del canino"
instrucciones: "En el corte del canino, toca la capa que responde a cada consigna. Al terminar podrás explorar cada capa libremente."
obligatoria: true
puntaje_max: 30
concepto: "Respuesta del ligamento periodontal y del hueso alveolar al movimiento ortodóntico"
interaccion: "Ratón: clic en la capa que responde a la consigna. Táctil: toque en la capa. Teclado: Tab recorre las capas y Enter elige la capa como respuesta."
retroalimentacion:
  acierto: "Identificaste ambos lados. Regla: compresión, resorción por osteoclastos con RANKL alto; tensión, formación por osteoblastos con OPG alta."
  error: "Esa no es la capa pedida. Compara los dos lados del diente: el que recibe la fuerza (compresión) y el opuesto (tensión)."
svg: m5_movimiento_ortodontico_pdl
modo: identificar
capas:
  - id: raiz_cemento
    etiqueta: "Raíz y cemento"
    descripcion: "La raíz del canino, cubierta por cemento. El cemento se resorbe mucho menos que el hueso, por lo que el diente se mueve sin perder su raíz."
  - id: fuerza_ortodontica
    etiqueta: "Fuerza ortodóntica"
    descripcion: "La fuerza aplicada empuja la raíz hacia distal. El lado distal será el de compresión y el mesial el de tensión."
  - id: compresion_lpd
    etiqueta: "Ligamento comprimido"
    descripcion: "En el lado distal el ligamento periodontal se estrecha y sus vasos se comprimen, con hipoxia. Sus células y los osteocitos detectan la deformación y aumentan las señales de resorción."
  - id: compresion_hialinizacion
    etiqueta: "Zona hialinizada"
    descripcion: "Con una fuerza excesiva, el ligamento comprimido queda sin riego en un área extensa, sus células mueren y el tejido adquiere aspecto vítreo (con fuerza ligera solo se ven focos pequeños). El movimiento se detiene hasta que osteoclastos vecinos eliminan hueso por debajo de la zona (resorción socavante)."
  - id: compresion_osteoclastos
    etiqueta: "Osteoclastos en el lado de compresión"
    descripcion: "En el lado distal, los osteoclastos resorben la pared alveolar. Con fuerza ligera aparecen pronto y actúan desde el lado del ligamento (resorción directa o frontal)."
  - id: tension_lpd
    etiqueta: "Ligamento estirado"
    descripcion: "En el lado mesial el ligamento se ensancha y sus fibras se tensan. Las células proliferan y aumenta la producción de OPG."
  - id: tension_osteoblastos
    etiqueta: "Osteoblastos en el lado de tensión"
    descripcion: "Progenitores del ligamento se diferencian en osteoblastos y depositan osteoide sobre la pared mesial. Así se mantiene el espesor del ligamento mientras el diente avanza."
  - id: senales_compresion
    etiqueta: "Señales en compresión"
    descripcion: "RANKL sube y OPG baja; aumentan la prostaglandina E2, la IL-1β y el TNF-α. El resultado es más osteoclastogénesis y resorción de la pared alveolar."
  - id: senales_tension
    etiqueta: "Señales en tensión"
    descripcion: "OPG sube y RANKL baja; aumentan la IL-10, el colágeno tipo I y marcadores osteogénicos como la osteocalcina [verificar]. El resultado es formación de hueso."
consignas:
  - id: c1_fuerza
    enunciado: "Toca la flecha que indica hacia dónde se empuja el diente."
    capa_correcta: fuerza_ortodontica
  - id: c2_compresion_lpd
    enunciado: "Toca el ligamento periodontal estrechado, con los vasos comprimidos, del lado hacia el que se mueve el diente."
    capa_correcta: compresion_lpd
  - id: c3_osteoclastos
    enunciado: "Toca las células que resorben la pared alveolar en el lado de compresión."
    capa_correcta: compresion_osteoclastos
  - id: c4_hialinizacion
    enunciado: "Toca el área sin núcleos y de aspecto vítreo que aparece con una fuerza excesiva."
    capa_correcta: compresion_hialinizacion
  - id: c5_senales_compresion
    enunciado: "Toca las señales de un lado donde sube RANKL y baja OPG."
    capa_correcta: senales_compresion
  - id: c6_tension_lpd
    enunciado: "Toca el ligamento ensanchado, con las fibras tensas, del lado opuesto al de la fuerza."
    capa_correcta: tension_lpd
  - id: c7_osteoblastos
    enunciado: "Toca las células que depositan osteoide sobre la pared alveolar en el lado de tensión."
    capa_correcta: tension_osteoblastos
  - id: c8_senales_tension
    enunciado: "Toca las señales de un lado donde sube OPG y baja RANKL."
    capa_correcta: senales_tension
  - id: c9_cemento
    enunciado: "Toca la estructura que se resorbe mucho menos que el hueso y permite que el diente se mueva sin perder su raíz."
    capa_correcta: raiz_cemento
requeridas: [raiz_cemento, fuerza_ortodontica, compresion_lpd, compresion_hialinizacion, compresion_osteoclastos, tension_lpd, tension_osteoblastos, senales_compresion, senales_tension]
```

##### Actividad m5_quiz_ortodoncia

```yaml
tipo: quiz
titulo: "Comprueba hueso cortical, trabecular y ortodoncia"
instrucciones: "Responde las cuatro preguntas. Después de cada una verás una explicación breve."
obligatoria: true
puntaje_max: 40
concepto: "Recambio cortical y trabecular; remodelado alveolar en ortodoncia"
interaccion: "Ratón: clic en la opción. Táctil: toque en la opción. Teclado: flechas para moverte entre opciones y Enter para responder."
retroalimentacion:
  acierto: "Bien. El movimiento ortodóntico es remodelado provocado: el diente avanza porque el hueso alveolar se resorbe por delante y se forma por detrás."
  error: "Repasa la tabla de compresión y tensión, y la razón geométrica del recambio trabecular."
preguntas:
  - id: m5_5_q1_trabecular
    formato: opcion_multiple
    enunciado: "¿Por qué el hueso trabecular se renueva más rápido que el cortical, por unidad de volumen?"
    opciones:
      - id: a
        texto: "Porque sus osteoclastos son más potentes y sus osteoblastos más numerosos"
      - id: b
        texto: "Porque tiene mucha más superficie por unidad de volumen, donde se activan las BMU"
      - id: c
        texto: "Porque no tiene osteocitos que frenen el remodelado con esclerostina"
      - id: d
        texto: "Porque su matriz no está mineralizada y los osteoclastos la disuelven con facilidad"
    correcta: b
    explicacion: "El remodelado ocurre en superficies. El hueso trabecular ofrece mucha más superficie por unidad de volumen, así que más BMU pueden activarse por cada volumen de hueso. Sus células no son distintas y su matriz sí está mineralizada."
    dificultad: 1
    concepto: "Recambio del hueso trabecular frente al cortical"
  - id: m5_5_q2_compresion
    formato: opcion_multiple
    enunciado: "Se aplica una fuerza ligera y continua que retrae un canino hacia distal. ¿Qué ocurre en el lado distal (compresión)?"
    opciones:
      - id: a
        texto: "El ligamento se estira y los osteoblastos depositan osteoide"
      - id: b
        texto: "El ligamento se comprime, sube RANKL y los osteoclastos resorben la pared alveolar"
      - id: c
        texto: "No hay cambios óseos: el diente se mueve porque el hueso se deforma como un resorte"
      - id: d
        texto: "Se forma un callo de cartílago que rellena el espacio"
    correcta: b
    explicacion: "En compresión, el ligamento se estrecha, sube RANKL y bajan las señales protectoras, y los osteoclastos resorben la pared. La formación de osteoide ocurre en el lado de tensión. El hueso no se deforma como un resorte: se remodela."
    dificultad: 2
    concepto: "Lado de compresión en el movimiento ortodóntico"
  - id: m5_5_q3_hialinizacion
    formato: opcion_multiple
    enunciado: "¿Qué es la hialinización en el movimiento ortodóntico y cuándo aparece?"
    opciones:
      - id: a
        texto: "La mineralización progresiva del ligamento periodontal cuando se aplican fuerzas ligeras y continuas"
      - id: b
        texto: "El depósito de osteoide sobre la pared alveolar, en el lado de tensión del ligamento"
      - id: c
        texto: "La formación de hueso reticular en la médula ósea vecina, por estímulo de la fuerza"
      - id: d
        texto: "Una zona del ligamento sin células y de aspecto vítreo, por una compresión que corta el riego"
    correcta: d
    explicacion: "La hialinización es una zona necrótica del ligamento comprimido, con aspecto vítreo. Aparece sobre todo, y de forma más extensa, con fuerzas excesivas (pueden verse focos pequeños incluso con fuerzas ligeras), y retrasa el movimiento hasta que los osteoclastos vecinos eliminan el hueso por debajo (resorción socavante)."
    dificultad: 2
    concepto: "Hialinización y fuerza excesiva"
  - id: m5_5_q4_alveolar_propio
    formato: verdadero_falso
    enunciado: "Tras perder un diente, el hueso alveolar propio permanece casi sin cambios, porque forma parte del hueso basal."
    correcta: falso
    explicacion: "Falso. El hueso alveolar propio depende del diente y del ligamento periodontal: al perder el diente se resorbe y el proceso alveolar se atrofia. El hueso basal es el que permanece."
    dificultad: 2
    concepto: "Dependencia del hueso alveolar respecto del diente"
```

### Seccion 5.6: Reparación: fractura y alveolo postextracción (id "m5_6_reparacion_fractura_alveolo")

Id: "m5_6_reparacion_fractura_alveolo" · Duración aproximada: 16 minutos

#### Contenido

**Un hueso que se repara sin cicatriz**

A diferencia de la piel, el hueso fracturado se regenera: el tejido que reemplaza al dañado es hueso, no cicatriz, y con el remodelado recupera su forma y su resistencia. La reparación repite en parte el desarrollo del esqueleto, con células madre mesenquimales, cartílago y osificación.

**Dos maneras de cicatrizar una fractura**

| | Cicatrización secundaria (indirecta) | Cicatrización primaria (directa) |
|---|---|---|
| Cuándo | Fragmentos con algo de movimiento o separados (tratamiento cerrado o fijación flexible) | Fragmentos en contacto e inmóviles (fijación rígida, por ejemplo placas de compresión) |
| Callo | Sí, abundante: primero blando y luego duro | Poco o ninguno |
| Mecanismo | Callo con osificación endocondral e intramembranosa | Remodelado tipo Havers: las osteonas nuevas cruzan la línea de fractura |
| Carga | Más gradual | Permite una función más temprana |

> Clinico: las fracturas mandibulares suelen tratarse con reducción y fijación estable (placas de compresión o miniplacas; las miniplacas son de fijación semirrígida). La fijación rígida favorece la cicatrización primaria; con miniplacas puede quedar algo de callo [verificar]. Si la fractura comunica con la cavidad oral (por ejemplo, a través de un alvéolo), el foco queda expuesto a la flora oral: la estabilidad y el control de la infección son decisivos.

> Atencion: el esquema de cuatro fases que sigue, con callo blando cartilaginoso, describe sobre todo la cicatrización secundaria de los huesos largos, que tiene algo de movimiento. En los huesos membranosos craneofaciales, como la mandíbula, con fijación estable el cartílago es escaso o falta y predomina la osificación intramembranosa; el callo blando cartilaginoso es típico de las fracturas con movimiento [verificar].

**Las cuatro fases de la reparación secundaria**

| Fase | Cuándo (aproximado) | Qué ocurre | Señales y protagonistas |
|---|---|---|---|
| 1. Hematoma e inflamación | Horas hasta 1 a 2 semanas [verificar] | Se rompen los vasos y se forma un hematoma con plaquetas y fibrina. Llegan neutrófilos y macrófagos, que limpian los restos. El hueso de los bordes muere por falta de riego. Se reclutan células madre del periostio, de la médula y de la sangre | IL-1, IL-6, TNF-α, PDGF, TGF-β y VEGF; hipoxia |
| 2. Callo blando | Aproximadamente de la 1.ª a la 3.ª semana [verificar] | El hematoma se sustituye por tejido de granulación. Los vasos nuevos (angiogénesis) invaden la zona. Las células madre se diferencian en condrocitos y fibroblastos y forman cartílago y tejido fibroso que puentean los extremos. Estabiliza, pero es débil | BMP (por ejemplo BMP-2), VEGF, Sox9 |
| 3. Callo duro | Aproximadamente de la 3.ª a la 12.ª semana [verificar] | El callo blando se reemplaza por hueso inmaduro (reticular). En la periferia, junto al periostio, se forma hueso directamente (osificación intramembranosa). En el centro, el cartílago se calcifica, lo invaden vasos y se sustituye por hueso (osificación endocondral) | Osteoblastos, condrocitos hipertróficos, osteoclastos (RANKL) |
| 4. Remodelado del callo | Meses a años | Las BMU sustituyen el hueso reticular por hueso laminar, el callo disminuye, el conducto medular se reabre y el hueso recupera su forma y su resistencia según la carga | RANKL/OPG, Wnt, carga mecánica |

Los plazos varían con el hueso, la edad, la irrigación y la estabilidad del foco. Los factores que retrasan la reparación son la inestabilidad, la infección, la mala irrigación, el tabaquismo y la diabetes.

> Atencion: el callo blando no es hueso: es cartílago y tejido fibroso, y como no está mineralizado no se ve en la radiografía. El callo visible aparece con el callo duro.

> Dato: la inmovilización clásica de una fractura mandibular es de unas 4 a 6 semanas [verificar]; con fijación rígida la función se recupera antes.

**Cicatrización del alvéolo postextracción**

El alvéolo cicatriza con la misma lógica que una fractura (coágulo, tejido de granulación, hueso inmaduro y hueso laminar) y, además, sufre un remodelado que reduce el reborde.

| Fase | Cuándo (aproximado) | Qué ocurre |
|---|---|---|
| 1. Coágulo | Inmediato (horas) | El alvéolo se llena de sangre y se forma un coágulo de fibrina con plaquetas, que protege y sirve de andamio |
| 2. Inflamación y tejido de granulación | Desde los 2 o 3 días; predomina en las primeras semanas | Llegan células inflamatorias que limpian el coágulo. Se forman vasos y fibroblastos y el coágulo se sustituye por tejido de granulación. El epitelio oral avanza desde los bordes y cubre el alvéolo hacia las 3 a 4 semanas [verificar] |
| 3. Matriz provisional y hueso inmaduro | Aproximadamente de las 2 a las 6 u 8 semanas [verificar] | Trabéculas de hueso reticular crecen desde las paredes y el fondo hacia el centro. Casi todo el tejido de granulación se ha sustituido hacia las 6 a 8 semanas |
| 4. Hueso laminar y médula | Progresivo, durante los meses siguientes. A los 3 a 6 meses todavía domina el hueso inmaduro; el laminar y la médula se establecen más tarde, sobre todo en la zona coronal [verificar] | El hueso reticular se va reemplazando por hueso laminar y médula, y una cortical cierra la cresta |
| 5. Remodelado del reborde y contorno final | Desde las primeras semanas y durante meses | La cresta se remodela y el reborde queda más bajo y más estrecho. Esta pérdida empieza pronto y se solapa con la formación de hueso inmaduro |

**Lo que cambia en el reborde.** El hueso fascicular (con fibras de Sharpey) depende del ligamento periodontal, y al desaparecer el diente es lo primero que se resorbe. La pared vestibular, más delgada, es la que más disminuye. Esta pérdida empieza en las primeras semanas y se solapa con la formación de hueso, de modo que el remodelado del reborde no es una etapa separada posterior. Los estudios clínicos muestran que el ancho del reborde se reduce aproximadamente a la mitad en el primer año, con la mayor parte de la pérdida en los primeros 3 meses; una revisión sistemática halló a los 6 meses una pérdida horizontal de 29 a 63 % y vertical de 11 a 22 % [verificar].

> Clinico: si se planea un implante en un alvéolo, se puede recurrir a la preservación del reborde (por ejemplo, un injerto óseo cubierto) para limitar esa pérdida. La indicación depende del caso.

> Clinico: la alveolitis («alveolo seco») ocurre cuando el coágulo se pierde o se degrada en los primeros días. El hueso queda expuesto y duele. Es más frecuente en los molares inferiores.

> Clinico: los antirresortivos (bisfosfonatos, denosumab) reducen el remodelado. La osteonecrosis de los maxilares asociada a medicamentos (MRONJ) se define por hueso expuesto, o que se sondea a través de una fístula, durante más de 8 semanas en una persona con tratamiento antirresortivo o antiangiogénico, sin radioterapia previa en los maxilares ni enfermedad metastásica en ellos. La extracción es el desencadenante más frecuente, pero no el único: también intervienen la enfermedad periodontal y el trauma por la prótesis. Es más frecuente con las dosis altas usadas en oncología que con las de osteoporosis [verificar].

#### Actividades

##### Actividad m5_reparacion_fractura_video

```yaml
tipo: video-texto
titulo: "Cómo cicatriza una fractura (esquema general de cicatrización secundaria)"
instrucciones: "Avanza paso a paso con Siguiente (o desliza en el móvil). En cada paso cambia la ilustración y aparece un texto breve."
obligatoria: false
puntaje_max: 10
concepto: "Fases de la reparación de una fractura"
interaccion: "Ratón: botones Anterior y Siguiente. Táctil: los mismos botones o deslizar. Teclado: flechas izquierda y derecha."
retroalimentacion:
  acierto: "Completaste la explicación. Antes de la actividad de ordenar, recuerda las cuatro fases: hematoma, callo blando, callo duro y remodelado."
  error: "Todavía quedan pasos por ver. Puedes volver atrás con Anterior sin perder puntos."
svg: m5_reparacion_fractura_fases
pasos:
  - id: p1_hematoma
    titulo: "Fractura y hematoma"
    texto_narrado: "La fractura rompe el hueso, el periostio y los vasos. La sangre forma un hematoma entre los fragmentos y las células de los bordes mueren por falta de riego. El hematoma es el primer molde de la reparación."
    cambia_en_escena: "Se muestran hueso_fracturado_base y hematoma_fracturario llenando el espacio entre los fragmentos."
  - id: p2_inflamacion
    titulo: "Inflamación y reclutamiento"
    texto_narrado: "Plaquetas, neutrófilos y macrófagos limpian los restos y liberan citocinas y factores de crecimiento. Estas señales reclutan células madre del periostio y de la médula y estimulan la formación de vasos nuevos."
    cambia_en_escena: "Aparece periostio_neovascularizacion (periostio engrosado y vasos nuevos) y hematoma_fracturario se atenúa."
  - id: p3_callo_blando
    titulo: "Callo blando"
    texto_narrado: "Las células madre se diferencian en condrocitos y fibroblastos. Forman un callo blando de cartílago y tejido fibroso que une los extremos por fuera. Estabiliza el foco, pero todavía es débil y no se ve en la radiografía."
    cambia_en_escena: "Aparece callo_blando rodeando los extremos y hematoma_fracturario desaparece."
  - id: p4_callo_duro
    titulo: "Callo duro"
    texto_narrado: "El callo blando se reemplaza por hueso inmaduro. En la periferia se forma hueso directamente; en el centro, el cartílago se calcifica, lo invaden vasos y se sustituye por hueso. Los extremos quedan unidos por un callo duro."
    cambia_en_escena: "callo_duro sustituye a callo_blando: la periferia se pinta como hueso reticular y el centro pasa de cartílago a hueso."
  - id: p5_remodelado
    titulo: "Remodelado del callo"
    texto_narrado: "Durante meses o años, las BMU sustituyen el hueso reticular por hueso laminar. El callo disminuye, el conducto medular se reabre y el hueso recupera su forma y su resistencia según las cargas que recibe."
    cambia_en_escena: "Aparece remodelado_callo con hueso laminar y BMU; callo_duro se reduce de tamaño y se reabre el conducto medular."
```

##### Actividad m5_ordenar_fractura

```yaml
tipo: quiz
titulo: "Ordena la reparación de una fractura"
instrucciones: "Coloca las cuatro fases en el orden en que ocurren tras una fractura con cicatrización secundaria."
obligatoria: true
puntaje_max: 20
concepto: "Secuencia de la reparación de una fractura"
interaccion: "Ratón: arrastrar cada fase o usar los botones subir y bajar. Táctil: arrastrar con un dedo o usar los botones. Teclado: seleccionar una fase con Enter y moverla con las flechas arriba y abajo."
retroalimentacion:
  acierto: "Orden correcto. El hueso reticular del callo duro se convierte en hueso laminar solo en el remodelado final."
  error: "El orden no es correcto. Piensa en el material que llena el foco en cada fase: coágulo, cartílago, hueso inmaduro y hueso laminar."
preguntas:
  - id: m5_6_q1_ordenar_fractura
    formato: ordenar_pasos
    enunciado: "Ordena las cuatro fases de la reparación de una fractura."
    pasos:
      - id: hematoma
        texto: "Hematoma e inflamación: se forma un coágulo y llegan células inflamatorias"
      - id: callo_blando
        texto: "Callo blando: cartílago y tejido fibroso unen los extremos"
      - id: callo_duro
        texto: "Callo duro: el cartílago se sustituye por hueso inmaduro"
      - id: remodelado
        texto: "Remodelado del callo: las BMU sustituyen el hueso reticular por hueso laminar"
    correcta: [hematoma, callo_blando, callo_duro, remodelado]
    explicacion: "Primero el hematoma con la inflamación, después el callo blando de cartílago y tejido fibroso, luego el callo duro de hueso inmaduro y, por último, el remodelado que devuelve hueso laminar y la forma original."
    dificultad: 1
    concepto: "Secuencia de la reparación de una fractura"
```

##### Actividad m5_alveolo_multicapa

```yaml
# Ilustración realista exacta (tools/imagenes/texturizar.py, 2026-10-25): forma del dibujo validado, texturas de tejido real.
tipo: multicapa
titulo: "Cicatrización del alvéolo: recorre las fases"
instrucciones: "Toca (o pasa el cursor por) cada capa del alvéolo para ver qué ocurre en esa fase. Debes visitar las seis capas marcadas como requeridas."
obligatoria: false
puntaje_max: 20
concepto: "Fases de la cicatrización del alvéolo postextracción"
interaccion: "Ratón: el hover resalta y el clic fija la capa. Táctil: un toque abre el texto. Teclado: Tab recorre las capas y Enter abre el texto."
retroalimentacion:
  acierto: "Recorriste las fases del alvéolo. Recuerda que, aunque el alvéolo se llene de hueso, el reborde termina más bajo y más estrecho, y que esa pérdida empieza pronto."
  error: "Te faltan capas por visitar. Recorre las fases en orden: coágulo, granulación, epitelio, hueso inmaduro, hueso laminar y remodelado del reborde."
svg: m5_cicatrizacion_alveolo_fases
modo: explorar
capas:
  - id: paredes_del_alveolo
    etiqueta: "Paredes del alveolo"
    descripcion: "Hueso alveolar propio con hueso fascicular, y las tablas vestibular (más delgada) y lingual. El hueso fascicular depende del ligamento periodontal, que se pierde con el diente."
  - id: coagulo
    etiqueta: "Coágulo"
    descripcion: "Al extraer el diente, el alvéolo se llena de sangre y se forma un coágulo de fibrina con plaquetas y eritrocitos. Protege el hueso y sirve de andamio para las células."
  - id: tejido_de_granulacion_alveolo
    etiqueta: "Tejido de granulación"
    descripcion: "A partir de los 2 o 3 días llegan células inflamatorias y el coágulo se sustituye por tejido de granulación, con vasos nuevos y fibroblastos. Predomina durante las primeras semanas."
  - id: epitelio_de_cierre
    etiqueta: "Epitelio de cierre"
    descripcion: "El epitelio oral avanza desde los bordes y cubre el alvéolo hacia las 3 a 4 semanas [verificar]. Cierra la herida de los tejidos blandos antes de que el hueso termine de madurar."
  - id: matriz_provisional_y_hueso_inmaduro
    etiqueta: "Matriz provisional y hueso inmaduro"
    descripcion: "Trabéculas de hueso reticular crecen desde las paredes y el fondo hacia el centro, alrededor de los vasos. Hacia las 6 a 8 semanas casi todo el tejido de granulación se ha sustituido, y el hueso inmaduro sigue dominando durante los primeros meses [verificar]."
  - id: hueso_laminar_y_medula
    etiqueta: "Hueso laminar y médula"
    descripcion: "El hueso reticular se reemplaza de forma progresiva por hueso laminar y médula. A los 3 a 6 meses todavía domina el hueso inmaduro; el laminar y la médula se establecen más tarde, sobre todo en la zona coronal [verificar]. Una cortical cierra la cresta."
  - id: remodelado_del_reborde
    etiqueta: "Remodelado del reborde"
    descripcion: "El hueso fascicular se resorbe y la pared vestibular, más delgada, es la que más disminuye. Esta pérdida empieza en las primeras semanas y se solapa con la formación de hueso. El reborde queda más bajo y más estrecho: aproximadamente la mitad del ancho se pierde en el primer año, sobre todo en los primeros 3 meses [verificar]."
requeridas: [coagulo, tejido_de_granulacion_alveolo, epitelio_de_cierre, matriz_provisional_y_hueso_inmaduro, hueso_laminar_y_medula, remodelado_del_reborde]
```

##### Actividad m5_ordenar_alveolo

```yaml
tipo: quiz
titulo: "Ordena la cicatrización del alvéolo"
instrucciones: "Coloca las cinco etapas según el tejido que predomina en el alvéolo a medida que pasan las semanas y los meses tras una extracción dentaria."
obligatoria: true
puntaje_max: 30
concepto: "Secuencia de la cicatrización del alvéolo postextracción"
interaccion: "Ratón: arrastrar cada etapa o usar los botones subir y bajar. Táctil: arrastrar con un dedo o usar los botones. Teclado: seleccionar una etapa con Enter y moverla con las flechas arriba y abajo."
retroalimentacion:
  acierto: "Orden correcto. El alvéolo se llena de hueso, pero el reborde se remodela y disminuye durante meses."
  error: "El orden no es correcto. Sigue el tejido que predomina en el alvéolo: coágulo, granulación, hueso inmaduro, hueso laminar y, al final, el contorno final del reborde."
preguntas:
  - id: m5_6_q2_ordenar_alveolo
    formato: ordenar_pasos
    enunciado: "Ordena las cinco etapas de la cicatrización de un alvéolo según el tejido que predomina en él, desde la extracción hasta el contorno final."
    pasos:
      - id: coagulo
        texto: "Coágulo de sangre que llena el alvéolo"
      - id: granulacion
        texto: "Tejido de granulación que sustituye al coágulo"
      - id: hueso_inmaduro
        texto: "Matriz provisional y hueso inmaduro que crece desde las paredes"
      - id: hueso_laminar
        texto: "Hueso laminar y médula, con una cortical que cierra la cresta"
      - id: contorno_final
        texto: "Maduración del hueso y contorno final del reborde, que queda más bajo y más estrecho"
    correcta: [coagulo, granulacion, hueso_inmaduro, hueso_laminar, contorno_final]
    explicacion: "La secuencia sigue el tejido que predomina, igual que en una fractura: coágulo, tejido de granulación, hueso inmaduro y hueso laminar. La pérdida del reborde empieza en las primeras semanas y se solapa con la formación de hueso, por eso el contorno final, más bajo y más estrecho, se cuenta como el último paso: es el resultado de todo el proceso."
    dificultad: 2
    concepto: "Secuencia de la cicatrización del alvéolo postextracción"
```

##### Actividad m5_quiz_reparacion

```yaml
tipo: quiz
titulo: "Comprueba la reparación ósea"
instrucciones: "Responde las tres preguntas. Después de cada una verás una explicación breve."
obligatoria: true
puntaje_max: 30
concepto: "Tipos de cicatrización, función del callo blando y riesgo de MRONJ"
interaccion: "Ratón: clic en la opción. Táctil: toque en la opción. Teclado: flechas para moverte entre opciones y Enter para responder."
retroalimentacion:
  acierto: "Bien. La estabilidad del foco decide el tipo de cicatrización, y sin remodelado un alvéolo puede no cicatrizar."
  error: "Repasa la tabla de cicatrización primaria y secundaria, y el aviso sobre antirresortivos."
preguntas:
  - id: m5_6_q3_primaria
    formato: opcion_multiple
    enunciado: "Una fractura mandibular se trata con placas de compresión que dejan los extremos inmóviles y en contacto (fijación rígida). ¿Cómo cicatriza principalmente?"
    opciones:
      - id: a
        texto: "Por cicatrización primaria: osteonas nuevas cruzan la línea de fractura, con poco o ningún callo"
      - id: b
        texto: "Con un callo blando abundante, que se osifica por vía endocondral y después se remodela lentamente"
      - id: c
        texto: "No cicatriza si no hay algo de movimiento entre los fragmentos que estimule la reparación"
      - id: d
        texto: "Se sustituye por una cicatriz de tejido fibroso, como ocurre en la piel, sin formar hueso"
    correcta: a
    explicacion: "Con fijación rígida y contacto entre los fragmentos no hay movimiento que estimule el callo. Las osteonas nuevas cruzan la línea de fractura (cicatrización primaria). El callo abundante es propio de la cicatrización secundaria; con miniplacas semirrígidas o con algo de movimiento puede formarse algo de callo."
    dificultad: 2
    concepto: "Cicatrización primaria frente a secundaria"
  - id: m5_6_q4_callo_blando
    formato: opcion_multiple
    enunciado: "¿Cuál es la función principal del callo blando en la reparación de una fractura?"
    opciones:
      - id: a
        texto: "Mineralizarse de inmediato y soportar la carga completa desde la primera semana"
      - id: b
        texto: "Eliminar los restos del hematoma mediante osteoclastos y células inflamatorias"
      - id: c
        texto: "Estabilizar provisionalmente los extremos y servir de molde para el hueso que vendrá"
      - id: d
        texto: "Reemplazar por completo la fase de remodelado y devolver al hueso su forma y su resistencia originales"
    correcta: c
    explicacion: "El callo blando, de cartílago y tejido fibroso, une provisionalmente los extremos y estabiliza el foco. Después se sustituye por hueso inmaduro (callo duro) y por hueso laminar (remodelado). No soporta carga completa."
    dificultad: 2
    concepto: "Función del callo blando"
  - id: m5_6_q5_mronj
    formato: opcion_multiple
    enunciado: "Una paciente con cáncer de mama y metástasis óseas recibe denosumab en dosis altas y necesita una extracción. ¿Qué riesgo debes considerar?"
    opciones:
      - id: a
        texto: "Alveolitis por exceso de coágulo, que ocurre con más frecuencia en quienes reciben antirresortivos"
      - id: b
        texto: "Hipertrofia del reborde alveolar por exceso de formación de hueso alrededor del alvéolo vacío"
      - id: c
        texto: "Osteonecrosis de los maxilares asociada a medicamentos: el remodelado suprimido no deja cicatrizar"
      - id: d
        texto: "Formación excesiva de callo blando, que bloquea la cicatrización normal del tejido del alvéolo"
    correcta: c
    explicacion: "Los antirresortivos reducen el remodelado. En los maxilares, una extracción puede dejar un alvéolo que no cicatriza y hueso necrótico expuesto durante más de 8 semanas (MRONJ). Es más frecuente con las dosis altas de oncología. La alveolitis se produce por pérdida del coágulo, no por exceso."
    dificultad: 3
    concepto: "Antirresortivos y cicatrización del alvéolo"
```

### Seccion 5.7: Equilibrio óseo y sus alteraciones (id "m5_7_equilibrio_alteraciones")

Id: "m5_7_equilibrio_alteraciones" · Duración aproximada: 14 minutos

#### Contenido

**El balance del remodelado**

La masa ósea depende de dos cosas: cuántas BMU se activan (la **frecuencia de activación**) y cuánto hueso deja cada una (el **balance por BMU**). En el adulto sano, la frecuencia de activación es estable y el balance por BMU es casi nulo, aunque se vuelve ligeramente negativo con la edad (módulo 6). Casi toda enfermedad metabólica del hueso altera una de las dos, o el funcionamiento del osteoclasto o del osteoblasto.

| Alteración | Qué falla | Resorción | Formación | Resultado |
|---|---|---|---|---|
| **Osteopetrosis** | El osteoclasto no se forma o no funciona | Muy disminuida | Conservada | Hueso denso pero frágil |
| **Enfermedad de Paget** | Osteoclastos gigantes hiperactivos en focos | Muy aumentada en los focos | Aumentada y desordenada | Hueso agrandado, vascular y débil |
| **Osteoporosis** | Más BMU activadas y formación insuficiente por BMU | Aumentada | Insuficiente para compensar | Menos masa y microarquitectura deteriorada |

**Osteopetrosis: demasiado hueso, poco funcional**

Se debe a un fallo de los osteoclastos, que no se forman o no pueden resorber. Sin resorción, el hueso y el cartílago calcificado se acumulan y no se remodelan.

- **Fallo de función (osteoclastos presentes):** el osteoclasto existe, pero no logra acidificar la laguna y no disuelve el mineral.
- **Fallo de formación (osteoclastos ausentes):** falta la señal RANKL a RANK que forma los osteoclastos.
- **Formas clínicas:** una forma infantil recesiva grave y una forma del adulto, dominante y más leve (enfermedad de Albers-Schönberg).
- **Consecuencias:** fracturas por fragilidad; obliteración de la cavidad medular, con anemia y pancitopenia; estrechamiento de los agujeros por donde pasan los nervios craneales (ceguera, sordera, parálisis facial). En la radiografía, «hueso dentro del hueso» y deformidad en matraz de Erlenmeyer.
- **Tratamiento:** en las formas infantiles por defecto propio del osteoclasto, el trasplante de progenitores hematopoyéticos, porque los osteoclastos derivan de la sangre. No corrige la falta de RANKL, que es de otra célula [verificar].

**Para profundizar (plegable; no se evalúa)**

- Fallo de función: mutaciones en genes de la acidificación de la laguna, como *TCIRG1* (una subunidad de la bomba de protones V-ATPase) y *CLCN7* (un canal de cloruro), o en *CA2* (anhidrasa carbónica II, con acidosis tubular renal). *TCIRG1* explica aproximadamente la mitad o más de las formas recesivas graves [verificar].
- Fallo de formación: mutaciones en *TNFSF11* (RANKL) o *TNFRSF11A* (RANK).

> Clinico: en los maxilares, la osteopetrosis retrasa o impide la erupción dentaria, altera la oclusión y deja una mandíbula con poco riego, propensa a la osteomielitis tras una infección o una extracción.

> Atencion: hueso denso no es hueso sano. En la osteopetrosis el hueso es muy denso pero frágil, porque no se remodela: acumula microdaño y conserva cartílago calcificado.

**Enfermedad de Paget: remodelado focal y desordenado**

Es una enfermedad del adulto mayor en la que uno o varios focos del esqueleto se remodelan a una velocidad muy alta y sin orden.

- **Fase inicial:** osteoclastos gigantes, con decenas de núcleos [verificar], resorben de forma intensa.
- **Fase siguiente:** los osteoblastos forman hueso a gran velocidad, primero reticular y después laminar, con un patrón en mosaico de líneas de cemento desordenadas. La médula se reemplaza por tejido fibrovascular.
- **Resultado:** hueso agrandado, deformado, muy vascularizado y débil.
- **Genética:** existen formas familiares, con predisposición genética (detalle en «Para profundizar»).
- **Laboratorio:** fosfatasa alcalina elevada con calcio y fósforo normales.
- **Dónde:** pelvis, vértebras, cráneo, fémur y tibia. En los maxilares afecta con más frecuencia al superior que a la mandíbula [verificar].

**Para profundizar (plegable; no se evalúa)**

- Mutaciones del gen *SQSTM1* en una fracción de los casos, hasta cerca del 40 % de los familiares [verificar]. Su efecto es activar en exceso la vía de NF-κB, la misma que activa RANKL (sección 5.2).

> Clinico: en el maxilar superior, el ensanchamiento del reborde separa los dientes y hace que las prótesis dejen de ajustar. Puede haber hipercementosis y aspecto de «copos de algodón» en la radiografía. Las extracciones se complican por el hueso muy vascularizado y el riesgo de infección [verificar].

**Osteoporosis: menos hueso y peor arquitectura**

Es una enfermedad esquelética con masa ósea baja y deterioro de la microarquitectura, que aumenta la fragilidad y el riesgo de fractura. Como criterio operativo, la OMS define osteoporosis por una densidad mineral ósea de 2,5 desviaciones estándar o más por debajo de la media del adulto joven (T-score igual o menor que −2,5) medida por densitometría (DXA). Este criterio se aplica a mujeres posmenopáusicas y a varones de 50 años o más; en personas más jóvenes y en niños no se usa el T-score (se usa el Z-score) y el diagnóstico exige otros criterios.

- **Mecanismo:** aumenta la frecuencia de activación (más RANKL respecto a OPG) y, en cada BMU, la formación no repone lo resorbido. Las trabéculas se adelgazan, se perforan y pierden sus conexiones, y en la cortical aumenta la porosidad.
- **Posmenopáusica:** el déficit de estrógenos eleva el recambio y predomina la pérdida de hueso trabecular (vértebras, radio distal). Con la edad se suma una formación menor y más pérdida cortical (cadera).
- **Secundaria:** glucocorticoides, hiperparatiroidismo, hipertiroidismo, inmovilización, entre otras causas.

> Clinico: en la radiografía panorámica, una cortical mandibular delgada o porosa puede orientar hacia una densidad ósea baja y motivar una densitometría [verificar]. La relación entre la osteoporosis y la pérdida de hueso alveolar o de dientes se ha propuesto, pero no está establecida con certeza [verificar].

**La farmacología calca la biología**

Los tratamientos de la osteoporosis apuntan a las moléculas que estudiaste en este módulo.

| Diana | Fármaco | Efecto |
|---|---|---|
| RANKL | Denosumab (anticuerpo) | Actúa como una OPG farmacológica y reduce los osteoclastos |
| Osteoclasto, que capta lo fijado al mineral | Bisfosfonatos (por ejemplo alendronato y zoledronato) | Se fijan al hueso y el osteoclasto los capta y entra en apoptosis |
| PTH1R en pulsos diarios | Teriparatida | Anabólico: estimula la formación |
| Esclerostina | Romosozumab | Aumenta la formación y reduce la resorción |
| Receptor de estrógenos | Raloxifeno (modulador selectivo) | Frena la resorción |

> Recuerda: los antirresortivos (bisfosfonatos y denosumab) reducen la resorción y, con ella, el acoplamiento y el remodelado total. En los maxilares, esa supresión explica el riesgo de MRONJ tras una extracción (sección 5.6).

#### Actividades

##### Actividad m5_equilibrio_multicapa

```yaml
tipo: multicapa
titulo: "Identifica la alteración del remodelado"
instrucciones: "Observa los cuatro paneles de hueso trabecular y toca el que responde a cada consigna. Los paneles tienen la misma escala."
obligatoria: true
puntaje_max: 30
concepto: "Osteopetrosis, enfermedad de Paget y osteoporosis: desequilibrio del remodelado"
interaccion: "Ratón: clic en el panel que responde a la consigna. Táctil: toque en el panel. Teclado: Tab recorre los paneles y Enter elige el panel como respuesta."
retroalimentacion:
  acierto: "Identificaste los cuatro paneles. Recuerda que la masa ósea no lo es todo: la osteopetrosis tiene más hueso y es frágil, y la osteoporosis tiene menos hueso y peor arquitectura."
  error: "Ese no es el panel pedido. Compara el grosor y la conexión de las trabéculas, el tamaño de los osteoclastos y el patrón del hueso."
svg: m5_equilibrio_remodelado_alteraciones
modo: identificar
capas:
  - id: hueso_normal
    etiqueta: "Hueso normal"
    descripcion: "Trabéculas de grosor regular y bien conectadas, con médula y pocos osteoclastos y osteoblastos. La resorción y la formación están equilibradas en cada BMU."
  - id: osteopetrosis
    etiqueta: "Osteopetrosis"
    descripcion: "Trabéculas gruesas con núcleos de cartílago calcificado y cavidad medular casi obliterada. Los osteoclastos no resorben (sin borde festoneado o ausentes). Hueso denso pero frágil, con riesgo de anemia y de fracturas."
  - id: enfermedad_de_paget
    etiqueta: "Enfermedad de Paget"
    descripcion: "Hueso engrosado con patrón en mosaico, líneas de cemento desordenadas, osteoclastos muy grandes y médula fibrovascular. Remodelado muy rápido y desorganizado en un foco."
  - id: osteoporosis
    etiqueta: "Osteoporosis"
    descripcion: "Trabéculas delgadas, perforadas y desconectadas, con médula abundante. La resorción supera a la formación en cada BMU y se activan más BMU."
consignas:
  - id: c1_normal
    enunciado: "Toca el panel de referencia, con trabéculas de grosor regular y bien conectadas."
    capa_correcta: hueso_normal
  - id: c2_osteopetrosis
    enunciado: "Toca el panel con trabéculas gruesas, cavidad medular casi obliterada y osteoclastos que no resorben."
    capa_correcta: osteopetrosis
  - id: c3_paget
    enunciado: "Toca el panel con patrón en mosaico y osteoclastos muy grandes."
    capa_correcta: enfermedad_de_paget
  - id: c4_osteoporosis
    enunciado: "Toca el panel con trabéculas delgadas, perforadas y desconectadas."
    capa_correcta: osteoporosis
  - id: c5_fallo_osteoclasto
    enunciado: "Toca la alteración causada por un fallo en la formación o en la función de los osteoclastos."
    capa_correcta: osteopetrosis
  - id: c6_balance_negativo
    enunciado: "Toca la alteración en la que se activan más BMU y cada una forma menos hueso del que resorbió."
    capa_correcta: osteoporosis
requeridas: [hueso_normal, osteopetrosis, enfermedad_de_paget, osteoporosis]
```

##### Actividad m5_relacion_farmacos

```yaml
tipo: relacion-columnas
titulo: "Diana biológica y fármaco"
instrucciones: "Une cada diana o situación biológica (columna izquierda) con el fármaco que actúa sobre ella (columna derecha). Sobran dos fármacos en la columna derecha."
obligatoria: true
puntaje_max: 30
concepto: "Fármacos que actúan sobre RANKL, el osteoclasto, la PTH, la esclerostina y los estrógenos"
interaccion: "Ratón: clic en un elemento de cada columna, o arrastrar. Táctil: tocar uno de la izquierda y luego uno de la derecha. Teclado: Tab, Enter en la columna izquierda, Tab hasta la derecha y Enter."
retroalimentacion:
  acierto: "Todas las parejas son correctas. Los antirresortivos frenan al osteoclasto; los anabólicos (teriparatida y romosozumab) estimulan la formación."
  error: "Alguna pareja es incorrecta. Piensa en el mecanismo: quién neutraliza RANKL, quién entra al osteoclasto, quién imita a la PTH en pulsos, quién bloquea la esclerostina."
izquierda:
  - id: l_rankl
    texto: "RANKL"
  - id: l_osteoclasto
    texto: "Osteoclasto, que capta lo fijado al mineral óseo"
  - id: l_pth1r
    texto: "Receptor de PTH estimulado en pulsos diarios"
  - id: l_esclerostina
    texto: "Esclerostina"
  - id: l_estrogenos
    texto: "Receptor de estrógenos"
derecha:
  - id: r_denosumab
    texto: "Denosumab: anticuerpo que neutraliza RANKL, como una OPG farmacológica"
  - id: r_bisfosfonatos
    texto: "Bisfosfonatos: se fijan al mineral y el osteoclasto que los capta entra en apoptosis"
  - id: r_teriparatida
    texto: "Teriparatida: fragmento de PTH en inyección diaria, de efecto anabólico"
  - id: r_romosozumab
    texto: "Romosozumab: anticuerpo contra la esclerostina que aumenta la formación"
  - id: r_raloxifeno
    texto: "Raloxifeno: modulador selectivo del receptor de estrógenos que frena la resorción"
  - id: r_levotiroxina
    texto: "Levotiroxina en exceso: acelera el recambio óseo y favorece la pérdida de hueso"
  - id: r_prednisona
    texto: "Prednisona en dosis altas y prolongadas: reduce la formación de hueso"
pares:
  - izquierda: l_rankl
    derecha: r_denosumab
  - izquierda: l_osteoclasto
    derecha: r_bisfosfonatos
  - izquierda: l_pth1r
    derecha: r_teriparatida
  - izquierda: l_esclerostina
    derecha: r_romosozumab
  - izquierda: l_estrogenos
    derecha: r_raloxifeno
distractores: [r_levotiroxina, r_prednisona]
```

##### Actividad m5_quiz_alteraciones

```yaml
tipo: quiz
titulo: "Comprueba las alteraciones del remodelado"
instrucciones: "Responde las cuatro preguntas. Después de cada una verás una explicación breve."
obligatoria: true
puntaje_max: 40
concepto: "Osteopetrosis, enfermedad de Paget y osteoporosis"
interaccion: "Ratón: clic en la opción. Táctil: toque en la opción. Teclado: flechas para moverte entre opciones y Enter para responder."
retroalimentacion:
  acierto: "Bien. Cada alteración se entiende preguntando qué célula falla y qué pasa con la resorción, la formación y el número de BMU."
  error: "Repasa la tabla del balance del remodelado y las tres descripciones."
preguntas:
  - id: m5_7_q1_osteopetrosis
    formato: opcion_multiple
    enunciado: "Un niño tiene huesos muy densos en la radiografía, anemia y fracturas frecuentes. ¿Qué mecanismo explica el cuadro?"
    opciones:
      - id: a
        texto: "Exceso de resorción por osteoclastos hiperactivos, con adelgazamiento de las trabéculas"
      - id: b
        texto: "Falta de mineralización del osteoide por déficit de vitamina D y de calcio disponible"
      - id: c
        texto: "Exceso de esclerostina que bloquea la vía Wnt y frena la formación de hueso nuevo"
      - id: d
        texto: "Fallo en la formación o en la función de los osteoclastos: el hueso no se remodela"
    correcta: d
    explicacion: "Es osteopetrosis: sin resorción, el hueso se acumula, la cavidad medular se obstruye (anemia) y el hueso, aunque denso, es frágil. El exceso de esclerostina produciría menos formación, y la falta de vitamina D produce hueso blando."
    dificultad: 2
    concepto: "Osteopetrosis"
  - id: m5_7_q2_paget
    formato: opcion_multiple
    enunciado: "¿Qué describe mejor la enfermedad de Paget del hueso?"
    opciones:
      - id: a
        texto: "Resorción disminuida y formación aumentada, de forma uniforme en todo el esqueleto"
      - id: b
        texto: "Formación disminuida en todo el esqueleto, sin cambios en la resorción ni en el hueso"
      - id: c
        texto: "Focos con resorción muy intensa y formación acelerada y desorganizada, en mosaico"
      - id: d
        texto: "Defecto de mineralización del osteoide por falta de calcio y de vitamina D"
    correcta: c
    explicacion: "En Paget los cambios son focales: osteoclastos gigantes resorben con intensidad y los osteoblastos forman hueso rápido y desorganizado, con líneas de cemento en mosaico. El defecto de mineralización del osteoide por falta de calcio describe la osteomalacia."
    dificultad: 2
    concepto: "Enfermedad de Paget"
  - id: m5_7_q3_osteoporosis
    formato: opcion_multiple
    enunciado: "En la osteoporosis posmenopáusica, ¿cuál es la alteración de fondo?"
    opciones:
      - id: a
        texto: "Los osteoclastos dejan de funcionar, por lo que el hueso se acumula y se endurece"
      - id: b
        texto: "Aumenta la mineralización del osteoide y el hueso se vuelve rígido y quebradizo"
      - id: c
        texto: "Se activan más BMU y en cada una la formación no repone lo resorbido"
      - id: d
        texto: "Los osteocitos dejan de producir esclerostina y la formación aumenta sin control"
    correcta: c
    explicacion: "Sin estrógenos aumenta la relación RANKL/OPG, se activan más BMU y la formación no compensa la resorción de cada una. Resultado: menos hueso y una microarquitectura deteriorada."
    dificultad: 2
    concepto: "Mecanismo de la osteoporosis"
  - id: m5_7_q4_densidad
    formato: verdadero_falso
    enunciado: "Un hueso más denso en la radiografía es siempre un hueso más resistente."
    correcta: falso
    explicacion: "Falso. En la osteopetrosis el hueso es muy denso pero frágil, porque no se remodela y acumula microdaño y cartílago calcificado. La resistencia depende también de la calidad y de la arquitectura, no solo de la masa."
    dificultad: 2
    concepto: "Masa ósea frente a calidad ósea"
```

### Seccion 5.8: Evaluación final (id "m5_8_evaluacion_final")

Id: "m5_8_evaluacion_final" · Duración aproximada: 12 minutos

#### Contenido

**Evaluación final del módulo 5**

Ya recorriste el ciclo de remodelado, el eje molecular, el acoplamiento, las hormonas, el hueso alveolar, la reparación y las alteraciones. Esta evaluación integra todo. Son 14 preguntas de distinto formato. Después de cada respuesta verás una explicación breve, y las preguntas que falles quedarán marcadas para que el mentor te ayude a reforzarlas.

Para obtener el logro **Remodelador** hay que completar las actividades obligatorias del módulo y alcanzar al menos el 70 % de esta evaluación (regla sugerida).

**Mapa del módulo: diez ideas**

1. El remodelado es el recambio acoplado de hueso viejo por hueso nuevo en el mismo sitio, realizado por las BMU.
2. El ciclo tiene seis fases: quiescencia, activación, resorción, inversión, formación y mineralización. Dura alrededor de 4 a 6 meses, y la formación es la más larga de las fases activas de la BMU.
3. El osteoclasto deriva de la línea hematopoyética. Necesita M-CSF y RANKL. La OPG es el señuelo que frena.
4. La relación RANKL/OPG es el interruptor de la resorción. Hormonas, inflamación y fármacos actúan sobre ella.
5. El acoplamiento: la resorción libera TGF-β1 e IGF-1 de la matriz, que reclutan y diferencian a los osteoblastos.
6. El osteocito frena la formación con esclerostina, que bloquea Wnt. La carga la reduce y la falta de carga la aumenta.
7. La PTH sostenida degrada hueso y en pulsos lo forma; los estrógenos frenan la resorción; la calcitonina tiene papel menor; la vitamina D aporta mineral.
8. El hueso trabecular se renueva más rápido por su superficie. El hueso alveolar depende del diente y se remodela con rapidez. En ortodoncia, hay resorción en compresión y formación en tensión.
9. La fractura se repara en hematoma, callo blando, callo duro y remodelado. El alvéolo se llena de hueso, pero el reborde disminuye.
10. Osteopetrosis (falla la resorción), enfermedad de Paget (remodelado focal y desordenado) y osteoporosis (balance negativo con más BMU) son desequilibrios distintos, y los fármacos actuales apuntan a estas mismas moléculas.

> Recuerda: si dudas en una pregunta, pregúntate qué célula actúa, sobre qué molécula y en qué fase del ciclo.

#### Actividades

##### Actividad m5_evaluacion_final

```yaml
tipo: quiz
titulo: "Evaluación final: Renovando el hueso"
instrucciones: "Responde las 14 preguntas. Después de cada respuesta verás una explicación breve. No puedes saltar preguntas."
obligatoria: true
puntaje_max: 100
concepto: "Integración del módulo 5: remodelado, reparación y equilibrio óseo"
interaccion: "Ratón: clic en la opción; en ordenar pasos, arrastre o botones subir y bajar. Táctil: toque en la opción; en ordenar pasos, arrastre o botones. Teclado: flechas y Enter; en ordenar pasos, seleccionar con Enter y mover con las flechas."
retroalimentacion:
  acierto: "Excelente. Dominas el remodelado óseo: célula, molécula y fase del ciclo. Se te otorga el logro Remodelador si completaste las actividades obligatorias y alcanzaste el 70 %."
  error: "Todavía hay conceptos por reforzar. Revisa las explicaciones de las preguntas falladas o pide ayuda al mentor sobre esos conceptos."
preguntas:
  - id: m5_8_q1_modelado_remodelado
    formato: opcion_multiple
    enunciado: "¿Qué distingue al remodelado del modelado?"
    opciones:
      - id: a
        texto: "El remodelado acopla ambas en el mismo sitio; el modelado las separa en superficies distintas"
      - id: b
        texto: "El remodelado ocurre solo durante el crecimiento y el modelado durante toda la vida adulta"
      - id: c
        texto: "El modelado renueva hueso viejo sin cambiar su forma y el remodelado cambia el tamaño del hueso"
      - id: d
        texto: "En el remodelado solo actúan los osteoblastos y en el modelado solo actúan los osteoclastos"
    correcta: a
    explicacion: "El remodelado es el recambio acoplado (resorción y formación en el mismo sitio, en secuencia) y predomina en el adulto. El modelado cambia la forma del hueso, con formación y resorción en superficies distintas, y predomina durante el crecimiento."
    dificultad: 1
    concepto: "Modelado frente a remodelado"
  - id: m5_8_q2_ordenar_acoplamiento
    formato: ordenar_pasos
    enunciado: "Ordena la cadena de acoplamiento en un sitio de remodelado, desde la resorción hasta el regreso al reposo."
    pasos:
      - id: libera
        texto: "El osteoclasto resorbe la matriz y libera TGF-β1 e IGF-1"
      - id: recluta
        texto: "El TGF-β1 activado recluta células mesenquimales hacia la laguna"
      - id: diferencia
        texto: "El IGF-1 y otras señales diferencian a los precursores en osteoblastos"
      - id: osteoide
        texto: "Los osteoblastos depositan osteoide sobre la línea de cemento"
      - id: mineraliza
        texto: "El osteoide se mineraliza y el sitio vuelve a la quiescencia"
    correcta: [libera, recluta, diferencia, osteoide, mineraliza]
    explicacion: "La resorción libera los factores de la matriz; el TGF-β1 recluta células, el IGF-1 y otras señales las diferencian en osteoblastos, estos depositan osteoide y, al mineralizarse, el sitio vuelve a la quiescencia."
    dificultad: 2
    concepto: "Acoplamiento entre resorción y formación"
  - id: m5_8_q3_sin_opg
    formato: opcion_multiple
    enunciado: "Un ratón carece del gen de la OPG. ¿Qué esperas encontrar?"
    opciones:
      - id: a
        texto: "Osteopetrosis, porque no se forman osteoclastos y el hueso no se resorbe ni se remodela"
      - id: b
        texto: "Osteoporosis grave, porque RANKL actúa sin freno y hay exceso de osteoclastos"
      - id: c
        texto: "Hueso normal, porque el M-CSF compensa por completo la falta de OPG en la médula"
      - id: d
        texto: "Hueso normal en cantidad, pero con mineralización defectuosa por falta de calcio"
    correcta: b
    explicacion: "La OPG es el señuelo que captura a RANKL. Sin OPG, RANKL activa a RANK sin freno, aumentan los osteoclastos y la resorción y se produce osteoporosis. La osteopetrosis es lo que ocurre sin RANKL."
    dificultad: 2
    concepto: "Eje RANKL, RANK y OPG"
  - id: m5_8_q4_inversion
    formato: opcion_multiple
    enunciado: "¿Qué ocurre en la fase de inversión del ciclo de remodelado?"
    opciones:
      - id: a
        texto: "Células mononucleares limpian la laguna, depositan la línea de cemento y liberan señales"
      - id: b
        texto: "Los osteoclastos multinucleados alcanzan su máxima actividad y excavan la laguna de resorción"
      - id: c
        texto: "Los osteoblastos depositan osteoide en capas hasta rellenar por completo la laguna de resorción"
      - id: d
        texto: "Las células de revestimiento cubren de nuevo la superficie y el sitio vuelve al reposo"
    correcta: a
    explicacion: "La inversión une la resorción con la formación: células mononucleares preparan la superficie, depositan la línea de cemento y liberan señales de acoplamiento. La excavación es la resorción, el osteoide es la formación y el reposo es la quiescencia."
    dificultad: 1
    concepto: "Fase de inversión"
  - id: m5_8_q5_fase_larga
    formato: opcion_multiple
    enunciado: "¿Cuál de estas cuatro fases activas de la BMU dura más?"
    opciones:
      - id: a
        texto: "La formación"
      - id: b
        texto: "La activación"
      - id: c
        texto: "La resorción"
      - id: d
        texto: "La inversión"
    correcta: a
    explicacion: "La formación dura aproximadamente 3 a 4 meses, varias veces más que la resorción (2 a 4 semanas), la inversión (1 a 2 semanas) o la activación (días). Es la más larga de las fases activas; la quiescencia y la mineralización secundaria no entran en esta comparación. Por eso, si se activan muchas BMU a la vez, aparece un espacio de remodelado transitorio."
    dificultad: 1
    concepto: "Duración de las fases del ciclo"
  - id: m5_8_q6_sost
    formato: opcion_multiple
    enunciado: "Una persona tiene una mutación que inactiva el gen SOST. ¿Qué esperas encontrar?"
    opciones:
      - id: a
        texto: "Osteoporosis, porque los osteoclastos son más numerosos y resorben en exceso"
      - id: b
        texto: "Osteopetrosis, porque los osteoclastos no se forman y el hueso no se resorbe"
      - id: c
        texto: "Hueso denso por exceso de formación, porque falta el freno de la vía Wnt"
      - id: d
        texto: "Raquitismo, porque falta vitamina D y el osteoide no se mineraliza bien"
    correcta: c
    explicacion: "El gen SOST codifica la esclerostina, el freno de Wnt. Sin ella, los osteoblastos forman hueso de más (esclerosteosis y enfermedad de van Buchem). Es un hueso denso por exceso de formación, no por falta de resorción como en la osteopetrosis."
    dificultad: 3
    concepto: "Esclerostina y vía Wnt"
  - id: m5_8_q7_calcitonina
    formato: opcion_multiple
    enunciado: "¿Cuál de estas hormonas inhibe directamente al osteoclasto y retrae su borde festoneado?"
    opciones:
      - id: a
        texto: "La PTH sostenida"
      - id: b
        texto: "El calcitriol"
      - id: c
        texto: "Los glucocorticoides en exceso"
      - id: d
        texto: "La calcitonina"
    correcta: d
    explicacion: "La calcitonina se une a su receptor en el osteoclasto y este retrae su borde festoneado. La PTH sostenida y los glucocorticoides aumentan la resorción, y el calcitriol aporta mineral."
    dificultad: 1
    concepto: "Calcitonina"
  - id: m5_8_q8_calcemia_baja
    formato: opcion_multiple
    enunciado: "Baja la calcemia. ¿Cuál es la respuesta hormonal correcta?"
    opciones:
      - id: a
        texto: "Se libera calcitonina, que activa a los osteoclastos y aumenta la resorción de hueso"
      - id: b
        texto: "Se libera PTH, que sube RANKL en el hueso y estimula la formación de calcitriol"
      - id: c
        texto: "Se libera PTH, que baja RANKL en el hueso y sube la calcitonina para frenar la resorción"
      - id: d
        texto: "Se libera calcitriol, que reduce la absorción intestinal de calcio y sube la calcemia"
    correcta: b
    explicacion: "La calcemia baja estimula la PTH. En el hueso sube RANKL y libera calcio; en el riñón aumenta la reabsorción de calcio y activa la 1α-hidroxilasa, con lo que aumenta el calcitriol y la absorción intestinal. La calcitonina responde al calcio alto."
    dificultad: 2
    concepto: "Homeostasis del calcio"
  - id: m5_8_q9_trabecular
    formato: opcion_multiple
    enunciado: "Se inicia un fármaco antirresortivo. ¿En qué tipo de hueso se verá antes el aumento de densidad?"
    opciones:
      - id: a
        texto: "En el cortical, porque tiene más masa y por eso responde antes al tratamiento"
      - id: b
        texto: "En el trabecular, por su mayor superficie y su mayor recambio"
      - id: c
        texto: "En ninguno: los antirresortivos no modifican la densidad, solo el riesgo de fractura"
      - id: d
        texto: "En ambos por igual y a la misma velocidad, porque el recambio es el mismo"
    correcta: b
    explicacion: "El hueso trabecular tiene más superficie y un recambio mayor, de modo que responde antes cuando se frena la resorción: su densidad (por ejemplo, la vertebral) sube antes que la del cortical."
    dificultad: 3
    concepto: "Recambio trabecular frente al cortical"
  - id: m5_8_q10_hialinizacion
    formato: opcion_multiple
    enunciado: "Con una fuerza ortodóntica excesiva aparece una zona hialinizada en el lado de compresión. ¿Qué consecuencia tiene?"
    opciones:
      - id: a
        texto: "El movimiento se acelera, porque hay más osteoclastos disponibles dentro del ligamento periodontal"
      - id: b
        texto: "El movimiento se retrasa hasta que osteoclastos de la médula vecina resorben el hueso por debajo"
      - id: c
        texto: "Se forma un callo blando en el ligamento que fija el diente y evita que siga moviéndose"
      - id: d
        texto: "Aumenta la formación de hueso en el lado de compresión y el diente avanza más rápido"
    correcta: b
    explicacion: "La hialinización es tejido necrótico sin células: no puede reclutar osteoclastos desde el ligamento. El movimiento se retrasa hasta que los osteoclastos de los espacios medulares vecinos resorben por debajo (socavante). En compresión no se forma hueso."
    dificultad: 3
    concepto: "Hialinización y resorción socavante"
  - id: m5_8_q11_alveolo_tres_meses
    formato: opcion_multiple
    enunciado: "Tres meses después de una extracción dentaria, sin injerto, ¿qué esperas encontrar?"
    opciones:
      - id: a
        texto: "Un alvéolo intacto, sin cambios en el reborde, porque el hueso alveolar se conserva tras perder el diente"
      - id: b
        texto: "Un alvéolo lleno de cartílago, como el callo blando de una fractura no fijada"
      - id: c
        texto: "Alvéolo con hueso inmaduro dominante, laminar aún en formación y reborde más estrecho por vestibular"
      - id: d
        texto: "Un alvéolo vacío, sin coágulo ni tejido, porque el hueso no logra cicatrizar sin diente"
    correcta: c
    explicacion: "El alvéolo se llena de hueso, primero inmaduro y luego laminar. A los 3 meses todavía predomina el hueso inmaduro, y el laminar y la médula se van estableciendo de forma progresiva. Además el reborde se remodela: pierde ancho y altura, sobre todo en los primeros 3 meses y por la pared vestibular, más delgada. El hueso fascicular depende del diente y se resorbe."
    dificultad: 2
    concepto: "Cicatrización del alvéolo y pérdida de reborde"
  - id: m5_8_q12_paget_caso
    formato: opcion_multiple
    enunciado: "Un hombre de 65 años nota que su prótesis superior ya no le ajusta. La radiografía muestra un maxilar engrosado con aspecto de copos de algodón; tiene fosfatasa alcalina elevada y calcio y fósforo normales. ¿Cuál es el diagnóstico más probable?"
    opciones:
      - id: a
        texto: "Osteopetrosis, por fallo de los osteoclastos"
      - id: b
        texto: "Enfermedad de Paget, por remodelado focal acelerado"
      - id: c
        texto: "Osteoporosis, por balance negativo de las BMU"
      - id: d
        texto: "Osteomalacia, por defecto de mineralización del osteoide"
    correcta: b
    explicacion: "El maxilar engrosado, el mal ajuste de la prótesis, el aspecto de copos de algodón y la fosfatasa alcalina elevada con calcio y fósforo normales orientan a enfermedad de Paget. La osteoporosis y la osteomalacia no engrosan el hueso, y la osteopetrosis suele cursar con fracturas y anemia y no con este cuadro."
    dificultad: 3
    concepto: "Enfermedad de Paget en los maxilares"
  - id: m5_8_q13_callo
    formato: opcion_multiple
    enunciado: "¿Cuál es la diferencia principal entre el callo blando y el callo duro de una fractura?"
    opciones:
      - id: a
        texto: "El blando se forma solo en la periferia del foco y el duro únicamente en la médula"
      - id: b
        texto: "El blando ya es hueso laminar maduro y el duro es un tejido cartilaginoso"
      - id: c
        texto: "El blando aparece años después del duro, durante el remodelado del callo"
      - id: d
        texto: "El blando es de cartílago y tejido fibroso; el duro, de hueso inmaduro"
    correcta: d
    explicacion: "El callo blando es cartílago y tejido fibroso, no mineralizado. El duro es hueso inmaduro (reticular), que se forma por osificación intramembranosa y endocondral. El hueso laminar aparece después, con el remodelado."
    dificultad: 1
    concepto: "Callo blando frente a callo duro"
  - id: m5_8_q14_denosumab
    formato: opcion_multiple
    enunciado: "¿Qué fármaco actúa neutralizando directamente a RANKL?"
    opciones:
      - id: a
        texto: "Los bisfosfonatos"
      - id: b
        texto: "La teriparatida"
      - id: c
        texto: "El romosozumab"
      - id: d
        texto: "El denosumab"
    correcta: d
    explicacion: "El denosumab es un anticuerpo contra RANKL: actúa como una OPG farmacológica. Los bisfosfonatos afectan al osteoclasto, la teriparatida es un fragmento de PTH y el romosozumab neutraliza la esclerostina."
    dificultad: 1
    concepto: "Farmacología dirigida a RANKL"
```

## Glosario

- **Acoplamiento**: dependencia entre la resorción y la formación en un mismo sitio de remodelado; la formación repone lo que se resorbió.
- **Activación**: fase del ciclo en la que un estímulo retrae las células de revestimiento y recluta precursores de osteoclastos.
- **Alveolitis (alveolo seco)**: complicación de una extracción en la que el coágulo se pierde o se degrada y el hueso del alvéolo queda expuesto y doloroso.
- **BMU (unidad multicelular básica)**: equipo temporal de osteoclastos, osteoblastos y células asociadas que remodela un fragmento de hueso.
- **Calcitonina**: hormona de las células C del tiroides que inhibe al osteoclasto; su papel fisiológico en el adulto es menor.
- **Calcitriol**: forma activa de la vitamina D (1,25-dihidroxivitamina D); aumenta la absorción intestinal de calcio y fosfato.
- **Callo blando**: tejido de cartílago y tejido fibroso, sin mineralizar, que puentea una fractura en la fase inicial de reparación.
- **Callo duro**: callo de hueso inmaduro (reticular) que sustituye al callo blando.
- **Catepsina K**: enzima del osteoclasto que degrada el colágeno tipo I de la matriz ósea.
- **Cicatrización primaria (directa)**: reparación de una fractura con fijación rígida, mediante remodelado tipo Havers y sin callo.
- **Cicatrización secundaria (indirecta)**: reparación de una fractura mediante callo blando, callo duro y remodelado.
- **Cono de corte y cono de cierre**: las dos zonas de la BMU cortical; en el cono de corte los osteoclastos excavan el túnel y, detrás, en el cono de cierre, los osteoblastos lo rellenan.
- **Espacio de remodelado**: déficit transitorio de hueso, resorbido pero aún no rellenado, que resulta de que la formación sea más lenta que la resorción.
- **Esclerostina**: glucoproteína secretada por los osteocitos (gen *SOST*) que bloquea la vía Wnt al unirse a LRP5/6 y reduce la formación de hueso.
- **Fenómeno de aceleración regional (RAP)**: aumento transitorio del remodelado en la zona de una lesión ósea, descrito por Frost.
- **Hemiosteona (paquete óseo estructural)**: resultado de una BMU sobre una superficie trabecular; equivale a media osteona.
- **Hialinización**: zona del ligamento periodontal sin células y de aspecto vítreo, causada por una compresión que corta el riego; es pequeña y focal con fuerzas ligeras y más extensa con fuerzas excesivas.
- **Hueso alveolar propio**: lámina fina que reviste el alvéolo y recibe las fibras de Sharpey; en la radiografía es la lámina dura.
- **Hueso laminar y hueso reticular**: el laminar es el hueso maduro, con colágeno organizado en láminas; el reticular (inmaduro) tiene colágeno desordenado y es el primero que se forma en la reparación y en el desarrollo.
- **Laguna de Howship**: cavidad cóncava que el osteoclasto excava en la superficie del hueso.
- **Línea de cemento**: línea de matriz que se deposita en la fase de inversión y separa el hueso viejo del nuevo; no debe confundirse con el cemento radicular.
- **M-CSF**: factor estimulante de colonias de macrófagos; mantiene vivos y en proliferación a los precursores de osteoclastos.
- **MRONJ**: osteonecrosis de los maxilares asociada a medicamentos; hueso expuesto, o que se sondea por una fístula, durante más de 8 semanas en una persona con tratamiento antirresortivo o antiangiogénico, sin radioterapia previa ni metástasis en los maxilares.
- **NFATc1**: factor de transcripción que actúa como regulador maestro de la diferenciación del osteoclasto.
- **OPG (osteoprotegerina)**: receptor señuelo soluble que se une a RANKL e impide que active a RANK.
- **Osteoide**: matriz ósea orgánica recién depositada, aún sin mineralizar.
- **Osteona (sistema de Havers)**: unidad estructural del hueso cortical, formada por laminillas concéntricas alrededor de un conducto central con un capilar.
- **Osteopetrosis**: enfermedad por fallo en la formación o en la función de los osteoclastos, con hueso denso pero frágil.
- **Osteoporosis**: enfermedad con masa ósea baja y deterioro de la microarquitectura; la OMS la define por un T-score igual o menor que −2,5 en mujeres posmenopáusicas y varones de 50 años o más.
- **Paget, enfermedad de**: remodelado focal muy rápido y desorganizado, con hueso agrandado, vascular y débil.
- **PTH**: hormona paratiroidea; sube la calcemia; sostenida cataboliza el hueso y en pulsos lo forma.
- **Quiescencia**: estado de reposo de la superficie ósea, cubierta por células de revestimiento.
- **RANK y RANKL**: RANK es el receptor de la membrana del precursor de osteoclasto; RANKL es su ligando, presente en el linaje osteoblástico y en el osteocito. Su unión inicia la osteoclastogénesis.
- **Remodelado óseo**: recambio acoplado de hueso viejo por hueso nuevo en el mismo sitio, sin cambiar la forma del hueso.
- **Modelado óseo**: cambio de forma del hueso por formación y resorción en superficies distintas, sin acoplamiento; predomina durante el crecimiento.
- **Resorción (reabsorción) ósea**: destrucción de la matriz ósea por los osteoclastos.
- **Resorción socavante**: resorción que hacen osteoclastos de los espacios medulares vecinos por debajo de una zona hialinizada.
- **T-score**: puntaje de la densitometría que compara la densidad ósea con la media del adulto joven, en desviaciones estándar.
- **TGF-β1 e IGF-1**: factores de crecimiento almacenados en la matriz ósea; la resorción los libera y son señales de acoplamiento.
- **TRAP**: fosfatasa ácida resistente al tartrato; enzima y marcador del osteoclasto.
- **Vía Wnt/β-catenina**: vía de señalización que activa al osteoblasto; la esclerostina la bloquea.
- **Zona de sellado y borde festoneado**: el anillo de adhesión del osteoclasto a la superficie ósea y su membrana plegada, donde se disuelve el mineral.

## Referencias

Solo obras y artículos reales; se citan sin páginas ni enlaces salvo los datos verificados. El docente puede sustituirlos por las ediciones que use en su curso.

- Ross MH, Pawlina W. *Histología: texto y atlas color con biología celular y molecular* (*Histology: A Text and Atlas*). Wolters Kluwer.
- Junqueira LC, Carneiro J. *Histología básica: texto y atlas* (*Basic Histology*).
- Gartner LP, Hiatt JL. *Color Textbook of Histology*. Elsevier.
- Kierszenbaum AL, Tres LL. *Histology and Cell Biology: An Introduction to Pathology*. Elsevier.
- Nanci A. *Ten Cate's Oral Histology: Development, Structure, and Function*. Elsevier.
- Bilezikian JP, Martin TJ, Clemens TL, Rosen CJ (eds.). *Principles of Bone Biology*. Academic Press.
- Hall JE, Hall ME. *Guyton y Hall: Tratado de fisiología médica*. Elsevier.
- Kumar V, Abbas AK, Aster JC. *Robbins y Cotran: Patología estructural y funcional* (*Robbins and Cotran Pathologic Basis of Disease*). Elsevier.
- Standring S (ed.). *Gray's Anatomy: The Anatomical Basis of Clinical Practice*. Elsevier.
- Lindhe J, Lang NP, Karring T (eds.). *Clinical Periodontology and Implant Dentistry*. Wiley-Blackwell.
- Proffit WR, Fields HW, Larson BE, Sarver DM. *Contemporary Orthodontics*. Elsevier.
- Hupp JR, Ellis E, Tucker MR. *Contemporary Oral and Maxillofacial Surgery*. Elsevier.
- Frost HM. *Bone Remodeling Dynamics*. Charles C Thomas, 1963.
- Eriksen EF. Cellular mechanisms of bone remodeling. *Reviews in Endocrine and Metabolic Disorders*, 2010;11:219-227.
- Sims NA, Martin TJ. Coupling the activities of bone formation and resorption: a multitude of signals within the basic multicellular unit. *BoneKEy Reports*, 2014.
- Parfitt AM. Misconceptions (2): turnover is always higher in cancellous than in cortical bone. *Bone*, 2002.
- Huja SS, Fernandez SA, Hill KJ, Li Y. Remodeling dynamics in the alveolar process in skeletally mature dogs. *The Anatomical Record Part A*, 2006.
- Amler MH. The time sequence of tissue regeneration in human extraction wounds. *Oral Surgery, Oral Medicine, Oral Pathology*, 1969;27:309-318.
- Schropp L, Wenzel A, Kostopoulos L, Karring T. Bone healing and soft tissue contour changes following single-tooth extraction: a clinical and radiographic 12-month prospective study. *International Journal of Periodontics and Restorative Dentistry*, 2003;23:313-323.
- Trombelli L, Farina R, Marzola A, Bozzi L, Liljenberg B, Lindhe J. Modeling and remodeling of human extraction sockets. *Journal of Clinical Periodontology*, 2008;35:630-639.
- Garlet TP, Coelho U, Silva JS, Garlet GP. Cytokine expression pattern in compression and tension sides of the periodontal ligament during orthodontic tooth movement in humans. *European Journal of Oral Sciences*, 2007;115:355-362.
- American Association of Oral and Maxillofacial Surgeons. Position paper on medication-related osteonecrosis of the jaws, 2022 update. *Journal of Oral and Maxillofacial Surgery*, 2022.

## Banco de preguntas para el mentor

Preguntas extra, distintas de las del módulo, para reforzar. Cada una trae la respuesta esperada, la dificultad (1 a 3) y el concepto.

1. **Pregunta:** ¿Por qué el osteoclasto necesita un medio ácido para disolver el hueso y qué hace la catepsina K?
   - **Respuesta:** La bomba de protones (V-ATPase) del borde festoneado acidifica el espacio sellado y el ácido disuelve la hidroxiapatita. Al quedar expuesto el colágeno tipo I, la catepsina K lo degrada.
   - **Dificultad:** 2
   - **Concepto:** Mecanismo de la resorción
2. **Pregunta:** ¿Qué ocurre con el osteoclasto al terminar la fase de resorción?
   - **Respuesta:** Muere por apoptosis (vive aproximadamente 2 semanas) y se reemplaza por nuevos osteoclastos mientras la BMU siga activa.
   - **Dificultad:** 1
   - **Concepto:** Fase de resorción
3. **Pregunta:** ¿Qué destino tienen los osteoblastos al terminar de rellenar una laguna?
   - **Respuesta:** La mayoría muere por apoptosis. Unos pocos quedan atrapados en la matriz como osteocitos y otros se aplanan como células de revestimiento.
   - **Dificultad:** 2
   - **Concepto:** Fase de formación
4. **Pregunta:** Nombra dos diferencias entre una BMU cortical y una trabecular.
   - **Respuesta:** La cortical excava un túnel (cono de corte y cono de cierre) y deja una osteona con conducto central; la trabecular excava un surco superficial y deja una hemiosteona. La cortical avanza y la trabecular trabaja en el mismo sitio.
   - **Dificultad:** 2
   - **Concepto:** Tipos de BMU
5. **Pregunta:** Un paciente toma glucocorticoides por vía oral durante años. ¿Por qué puede desarrollar osteoporosis?
   - **Respuesta:** Los glucocorticoides suben RANKL y bajan OPG (más resorción) y además acortan la vida de osteoblastos y osteocitos y reducen la formación. El balance por BMU se vuelve negativo.
   - **Dificultad:** 2
   - **Concepto:** Glucocorticoides y hueso
6. **Pregunta:** ¿Por qué se forma un espacio de remodelado y qué implica?
   - **Respuesta:** Porque la formación es varias veces más lenta que la resorción. Mientras las lagunas no se rellenan hay un déficit transitorio de hueso, que se recupera cuando termina la formación.
   - **Dificultad:** 2
   - **Concepto:** Espacio de remodelado
7. **Pregunta:** ¿Qué significa que el hueso alveolar sea «dependiente del diente»?
   - **Respuesta:** Que el proceso alveolar se forma con la erupción y se mantiene mientras el diente transmite carga a través del ligamento periodontal. Si el diente se pierde, el hueso alveolar propio se resorbe y el proceso alveolar se atrofia. El hueso basal permanece.
   - **Dificultad:** 1
   - **Concepto:** Hueso alveolar
8. **Pregunta:** ¿En qué difiere la resorción ósea con una fuerza ortodóntica ligera y con una excesiva?
   - **Respuesta:** Con fuerza ligera, los osteoclastos actúan pronto desde el ligamento (resorción directa o frontal). Con fuerza excesiva la zona hialinizada es más extensa (con fuerza ligera solo hay focos pequeños) y los osteoclastos de los espacios medulares vecinos resorben por debajo (socavante), con retraso del movimiento.
   - **Dificultad:** 2
   - **Concepto:** Hialinización y tipos de resorción
9. **Pregunta:** ¿Por qué se dice que el callo blando no es hueso?
   - **Respuesta:** Porque es cartílago y tejido fibroso sin mineralizar. Se reemplaza por hueso inmaduro (callo duro) y luego por hueso laminar (remodelado).
   - **Dificultad:** 2
   - **Concepto:** Fases de la reparación de una fractura
10. **Pregunta:** ¿Por qué tras una extracción se pierde más reborde por la pared vestibular?
    - **Respuesta:** Porque la tabla vestibular suele ser más delgada y está formada en gran parte por hueso fascicular, que depende del ligamento periodontal y se resorbe cuando el diente desaparece.
    - **Dificultad:** 2
    - **Concepto:** Pérdida de reborde tras la extracción
11. **Pregunta:** Explica por qué el hiperparatiroidismo y la teriparatida, aunque ambos elevan la PTH, tienen efectos opuestos sobre el hueso.
    - **Respuesta:** Por el patrón temporal. Sostenida, la PTH sube RANKL de forma continua y predomina la resorción. En pulsos diarios estimula a los osteoblastos (más células, más supervivencia, menos esclerostina) y el balance favorece la formación.
    - **Dificultad:** 3
    - **Concepto:** PTH intermitente frente a sostenida
12. **Pregunta:** ¿Por qué el trasplante de progenitores hematopoyéticos puede tratar algunas formas de osteopetrosis?
    - **Respuesta:** Porque los osteoclastos derivan de células hematopoyéticas. Si el defecto está en el propio osteoclasto, las células del donante producen osteoclastos funcionales. No sirve si falta RANKL, porque ese defecto no está en la línea hematopoyética.
    - **Dificultad:** 3
    - **Concepto:** Osteopetrosis y origen del osteoclasto
13. **Pregunta:** ¿Qué relación hay entre la periodontitis y RANKL?
    - **Respuesta:** La inflamación periodontal aumenta RANKL (por linfocitos y fibroblastos) y reduce OPG. La relación RANKL/OPG sube, se activan más osteoclastos y se pierde hueso alveolar.
    - **Dificultad:** 2
    - **Concepto:** RANKL en periodontitis
14. **Pregunta:** ¿Qué mide la densitometría (DXA) y cuál es el umbral de la OMS para osteoporosis?
    - **Respuesta:** Mide la densidad mineral ósea y la compara con la media del adulto joven en desviaciones estándar. La OMS define osteoporosis con un T-score igual o menor que −2,5 en mujeres posmenopáusicas y varones de 50 años o más; en más jóvenes se usa el Z-score.
    - **Dificultad:** 1
    - **Concepto:** Diagnóstico de osteoporosis
15. **Pregunta:** Un osteocito en una zona sin carga, ¿qué moléculas aumenta y con qué efecto?
    - **Respuesta:** Aumenta la esclerostina (bloquea Wnt y reduce la formación) y RANKL (más resorción). El resultado es pérdida de hueso.
    - **Dificultad:** 2
    - **Concepto:** Osteocito, carga, esclerostina y RANKL
16. **Pregunta:** ¿En qué se diferencian la calcitonina y el calcitriol?
    - **Respuesta:** La calcitonina la secretan las células C del tiroides con calcio alto y frena al osteoclasto. El calcitriol es la forma activa de la vitamina D, se forma en el riñón y aumenta la absorción intestinal de calcio y fosfato.
    - **Dificultad:** 1
    - **Concepto:** Calcitonina frente a calcitriol

17. **Pregunta:** ¿Por qué a los 3 meses de una extracción el alvéolo ya tiene hueso pero todavía no es hueso laminar maduro?
    - **Respuesta:** Porque el primer hueso que se forma es reticular (inmaduro) y domina durante los primeros 3 a 6 meses. El hueso laminar y la médula se establecen de forma progresiva, más tarde en la zona coronal.
    - **Dificultad:** 2
    - **Concepto:** Cicatrización del alvéolo
18. **Pregunta:** ¿Por qué el callo blando cartilaginoso es típico de las fracturas con movimiento y escaso en una fractura mandibular con fijación estable?
    - **Respuesta:** Porque el entorno mecánico decide el destino de las células: con movimiento se forma cartílago (osificación endocondral); con fijación estable, sobre todo en huesos membranosos como la mandíbula, predomina la osificación intramembranosa y hay poco cartílago.
    - **Dificultad:** 3
    - **Concepto:** Tipos de cicatrización de una fractura

## Ganchos para el mentor

**Conceptos clave del módulo**

1. BMU y ciclo: seis fases, orden fijo, formación como la fase activa más larga.
2. Origen hematopoyético del osteoclasto y control por M-CSF, RANKL, RANK y OPG.
3. La relación RANKL/OPG como interruptor de la resorción.
4. Acoplamiento por TGF-β1 e IGF-1 liberados de la matriz.
5. Esclerostina como freno de Wnt; el osteocito integra carga, RANKL y esclerostina.
6. PTH (patrón temporal), estrógenos, calcitonina y vitamina D.
7. Recambio cortical frente a trabecular (razón geométrica) y hueso alveolar dependiente del diente.
8. Ortodoncia: resorción en compresión, formación en tensión, hialinización extensa con fuerza excesiva.
9. Reparación de fractura (cuatro fases) y del alvéolo (con pérdida de reborde).
10. Osteopetrosis, Paget y osteoporosis como desequilibrios distintos; la farmacología calca la biología.

**Datos de profundización (no se evalúan; ofrecerlos solo si el estudiante los pide)**

TRAF6, NF-κB, c-Fos, DC-STAMP e integrina β3; efrina B2 y EphB4, cardiotrofina-1, esfingosina-1-fosfato y semaforina 4D; los genes TNFSF11, TNFRSF11A, TNFRSF11B, TCIRG1, CLCN7, CA2 y SQSTM1.

**Errores frecuentes y cómo aclararlos**

| Error frecuente | Cómo aclararlo |
|---|---|
| Creer que el osteoclasto deriva del osteoblasto o del hueso | Preguntar de qué célula madre viene. Recordar el linaje monocito-macrófago y que M-CSF y RANKL vienen del linaje osteoblástico, que es su vecino, no su origen |
| Creer que la OPG activa al osteoclasto o que es su receptor | Usar la imagen del señuelo: la OPG captura a RANKL y no activa nada. Volver a la actividad de arrastre |
| Confundir RANK con RANKL | La L es de ligando. RANKL está en la célula osteoblástica; RANK, en el precursor |
| Creer que M-CSF y RANKL hacen lo mismo | M-CSF mantiene vivo y en proliferación al precursor; RANKL lo diferencia y lo fusiona |
| Creer que todo el hueso se remodela a la vez | La BMU es focal y temporal; cada una está en una fase distinta |
| Creer que resorción y formación son independientes | Acoplamiento: la resorción libera TGF-β1 e IGF-1 que llaman a los osteoblastos al mismo sitio |
| Creer que la esclerostina estimula el hueso por su nombre | Es un inhibidor de Wnt. Su falta produce esclerosis (esclerosteosis). Pedir que expliquen el efecto de una mutación de pérdida de función |
| Creer que la PTH siempre destruye hueso | Depende del patrón: sostenida cataboliza; en pulsos anabólica (teriparatida) |
| Creer que la calcitonina es la hormona principal de la calcemia | En el adulto su papel es menor; mandan la PTH y el calcitriol |
| Confundir calcitonina con calcitriol | Calcitonina baja el calcio (tiroides); calcitriol sube la absorción de calcio (vitamina D activa) |
| Creer que un hueso más denso es más sano | Osteopetrosis: denso y frágil. La calidad y la arquitectura cuentan |
| Creer que en ortodoncia el hueso se deforma como un resorte | El hueso se remodela: se resorbe por delante y se forma por detrás |
| Creer que la compresión forma hueso, como en la carga mecánica del hueso | En el ligamento periodontal, la compresión lleva a hipoxia, RANKL alto y resorción; la formación ocurre en el lado de tensión |
| Creer que el callo blando es hueso | Es cartílago y tejido fibroso; el hueso inmaduro llega con el callo duro |
| Creer que el alvéolo se rellena y queda igual | Se llena de hueso, pero el reborde pierde ancho y altura por la pérdida del hueso fascicular |
| Creer que la osteoporosis es solo falta de calcio | Es un desequilibrio del remodelado. El calcio y la vitamina D son necesarios pero no explican todo |
| Confundir remodelado con la «remodelación» de la literatura de crecimiento craneofacial | Aclarar que en crecimiento se llama remodelación al modelado; aquí remodelado es el recambio acoplado |
| Creer que la resorción es la fase activa más larga | La formación es la más larga de las fases activas (aproximadamente 3 a 4 meses). Si preguntan por la quiescencia o la mineralización secundaria, aclarar que la comparación se hace solo entre las cuatro fases activas |
| Creer que la hialinización solo aparece con fuerza excesiva | Es casi inevitable en focos pequeños al inicio del movimiento; con fuerza excesiva es más extensa y retrasa más el movimiento |
| Creer que toda fractura mandibular forma un gran callo de cartílago | Con fijación estable el cartílago es escaso y predomina la osificación intramembranosa; el callo blando cartilaginoso es típico de las fracturas con movimiento |
| Creer que el calcitriol es un estimulador fisiológico de la resorción | Su papel principal es aportar calcio y fosfato para mineralizar; el efecto sobre RANKL aparece sobre todo a dosis altas |
| Creer que el denosumab cambia la producción de OPG o de RANKL | Neutraliza RANKL: reproduce el efecto de la OPG, sin modificar su producción |
| Creer que el alvéolo cicatriza y que después, en otra etapa, pierde el reborde | La pérdida del reborde empieza en las primeras semanas y se solapa con la formación de hueso; el hueso inmaduro domina durante meses |

**A qué actividad enviar según el concepto que falla**

| Concepto con fallos | Sección | Actividad de refuerzo |
|---|---|---|
| Fases y BMU | 5.1 | `m5_ciclo_multicapa`, `m5_ciclo_ordenar`, `m5_bmu_columnas` |
| M-CSF, RANKL, RANK, OPG | 5.2 | `m5_osteoclastogenesis_video`, `m5_arrastre_rankl_opg` |
| Acoplamiento y esclerostina | 5.3 | `m5_acoplamiento_multicapa`, `m5_arrastre_acoplamiento` |
| Hormonas | 5.4 | `m5_hormonas_multicapa`, `m5_relacion_hormonas` |
| Cortical, trabecular y alveolar | 5.5 | `m5_alveolar_multicapa`, `m5_explora_mandibula_ortodoncia` |
| Ortodoncia | 5.5 | `m5_ortodoncia_multicapa` |
| Reparación de fractura y alvéolo | 5.6 | `m5_reparacion_fractura_video`, `m5_ordenar_fractura`, `m5_alveolo_multicapa`, `m5_ordenar_alveolo` |
| Alteraciones y fármacos | 5.7 | `m5_equilibrio_multicapa`, `m5_relacion_farmacos` |

**Preguntas guía para el diálogo socrático**

- «¿Qué célula actúa primero en un sitio de remodelado y qué deja preparado para la siguiente?»
- «Si sube la OPG, ¿qué le pasa a RANKL y qué le pasa al osteoclasto?»
- «¿Qué le dice el osteocito a los osteoblastos cuando no hay carga?»
- «En el lado hacia el que se mueve el diente, ¿qué le pasa al ligamento y qué célula aparece?»
- «Si dos personas tienen huesos densos, ¿cómo distingues una osteopetrosis de una esclerosteosis por el mecanismo?»

## Notas de verificacion para el docente

Este guion fue redactado por una IA con apoyo de fuentes abiertas (revisiones sobre remodelado óseo, cicatrización del alvéolo, ortodoncia, osteopetrosis, enfermedad de Paget y antirresortivos) y no sustituye la revisión de un experto. Las cifras siguientes varían entre fuentes, dependen del hueso, de la especie o del estudio, o son aproximadas. Están marcadas con [verificar] en el cuerpo del texto.

**Ciclo de remodelado y BMU (sección 5.1)**

| N.º | Afirmación o cifra | Situación | Qué confirmar |
|---|---|---|---|
| 1 | Se reemplaza aproximadamente el 10 % del esqueleto cada año; casi todo se sustituye en unos 10 años | Es la cifra habitual, pero es un promedio global; varía por hueso y por edad | Que el docente acepte «aproximadamente 10 % por año» como cifra de curso |
| 2 | Túnel de la BMU cortical de unos 200 µm de diámetro; avanza unas decenas de µm por día | Algunas fuentes dan 20 a 40 µm/día, otras 25 µm/día y en animales 11 µm/día | Cifra y unidad de referencia del curso |
| 3 | Vida de una BMU de 6 a 9 meses; osteoclasto de 2 semanas; osteoblasto de 3 meses; más de un millón de BMU activas | Otras fuentes dan 6 a 12 meses para la BMU; los tiempos celulares son promedios. La vida de la BMU (6 a 9 meses) y el ciclo de la activación a la mineralización inicial (4 a 6 meses, nota 9) se miden con criterios distintos según la fuente y el texto avisa de ello | Si se prefiere una cifra única para ambas (por ejemplo, «4 a 9 meses según el hueso») coherente con el módulo 4 |
| 4 | Duración de la activación (días) | Las fuentes dan pocas cifras y muy variables | Si se debe suprimir la cifra |
| 5 | Resorción de aproximadamente 2 a 4 semanas | Fuentes consultadas: 2 semanas, unos 30 a 40 días, 3 semanas y 7 días | Rango aceptado por el docente |
| 6 | Inversión de aproximadamente 1 a 2 semanas | Se citan desde 5 a 15 días hasta varias semanas | Rango aceptado |
| 7 | Formación de aproximadamente 3 a 4 meses | Se citan 1 a 3 meses y 13 semanas, según la fuente | Rango aceptado |
| 8 | Mineralización: comienza unos días después del depósito del osteoide y se prolonga meses | El retraso de mineralización exacto varía; se estudia en el módulo 4 | Coherencia con la cifra del módulo 4 |
| 9 | Ciclo completo de 4 a 6 meses | Se citan 120 a 200 días, 17 semanas, un promedio de 4 meses (rango de 3 a 24) y 4 a 6 meses | Cifra única para todo el OVA |

**Eje molecular, acoplamiento y hormonas (secciones 5.2 a 5.4)**

| N.º | Afirmación o cifra | Situación | Qué confirmar |
|---|---|---|---|
| 10 | La ausencia de OPG causa una forma juvenil de enfermedad de Paget (mutaciones de TNFRSF11B) | Dato de la literatura de genética ósea que no se contrastó en las búsquedas de esta redacción | Que el docente lo considere adecuado para el nivel |
| 11 | Los textos destacan TGF-β1 e IGF-1 como factores de acoplamiento; el papel de efrina B2, cardiotrofina-1, S1P y semaforina 4D proviene de estudios en ratones | El campo está en debate y no hay una molécula única | Qué señales incluir en el curso |
| 12 | Esclerosteosis y enfermedad de van Buchem con engrosamiento del cráneo y de la mandíbula | El exceso de hueso por falta de esclerostina está bien establecido; el detalle mandibular no se contrastó | Confirmar el hallazgo mandibular |
| 13 | Romosozumab con advertencias de riesgo cardiovascular | Dato farmacológico que cambia con las actualizaciones de las fichas técnicas | Estado actual de la ficha técnica |
| 14 | Calcio ionizado de aproximadamente 1,1 a 1,3 mmol/L | Los intervalos de referencia varían por laboratorio | Intervalo de referencia del curso |
| 15 | Raquitismo con retraso de la erupción, hipoplasia del esmalte y defectos de la dentina; hiperparatiroidismo con pérdida de la lámina dura y tumores pardos | Descripciones clínicas clásicas, no contrastadas con una fuente puntual en esta redacción | Confirmar las manifestaciones orales |
| 16 | Personas sin tiroides mantienen calcemia y hueso normales (papel menor de la calcitonina) | Es la afirmación habitual, con matices | Redacción para el nivel de posgrado |
| 17 | La pérdida ósea se acelera sobre todo en los primeros años posmenopáusicos | No se da cifra; conviene decidir si se añade una (por ejemplo, porcentaje anual) | Si se desea una cifra |
| 43 | El calcitriol puede aumentar RANKL a dosis altas o con hiperparatiroidismo secundario; en fisiología normal su papel principal es aportar mineral | En cultivos y con dosis supra fisiológicas induce RANKL en osteoblastos; en fisiología su efecto sobre el hueso es mixto | Si se conserva la mención o se deja solo el papel de aporte de mineral |

**Hueso cortical, trabecular, alveolar y ortodoncia (sección 5.5)**

| N.º | Afirmación o cifra | Situación | Qué confirmar |
|---|---|---|---|
| 18 | Recambio anual cortical de 2 a 3 % y trabecular de aproximadamente 25 %; el trabecular concentra la mayor parte del recambio; por unidad de superficie la diferencia es mucho menor | Se citan 3 % y 26 % en algunas fuentes; el trabecular sería el 20 % de la masa y cerca del 80 % del recambio. La afirmación por superficie sigue el argumento de Parfitt (2002), que conviene contrastar | Cifras y la afirmación por superficie |
| 19 | El hueso alveolar se remodela varias veces más rápido que el fémur y más que el hueso basal | Proviene de estudios en perros adultos (Huja 2006, con tasas de formación de 37 % por año en mandíbula frente a 6,4 % en fémur); faltan datos humanos equivalentes | Que se acepte extrapolar a humanos con esa cautela |
| 20 | El cemento radicular se resorbe menos que el hueso en las mismas condiciones | Es la explicación clásica; los mecanismos exactos (OPG del cemento y del ligamento) se discuten | Redacción de la causa |
| 21 | Fases del movimiento ortodóntico: retraso de días a semanas; velocidad de 1 mm al mes | Varía mucho por fuerza, individuo y tipo de movimiento. Una fuente indica inicio del movimiento a los 2 días con fuerzas ligeras y de 7 a 14 días con fuerzas fuertes | Cifras de referencia del curso de ortodoncia |
| 22 | Fuerza óptima menor que la presión capilar (aproximadamente 20 a 25 mmHg; Schwarz 1932) | Concepto clásico, cuestionado en la literatura moderna | Si se mantiene como concepto histórico |
| 23 | La esclerostina aumenta en el lado de compresión y disminuye en el de tensión (animales) | Datos preclínicos | Si se mantiene en el nivel de posgrado |
| 24 | Los bisfosfonatos y el denosumab enlentecen el movimiento ortodóntico | Evidencia principalmente animal y estudios clínicos limitados | Redacción de la advertencia clínica |
| 25 | Cresta alveolar a 1 a 2 mm apical a la unión amelocementaria | Los libros dan valores entre 1 y 2 mm, según el criterio de medición | Valor de referencia del curso |
| 26 | El proceso alveolar es la zona de mayor recambio de la mandíbula | Es una inferencia de los estudios animales de la nota 19 | Redacción del hotspot |
| 40 | Señales del lado de tensión (OPG, IL-10, colágeno I, osteocalcina) y de compresión (RANKL, TNF-α, MMP-1) | Provienen de Garlet 2007, un estudio en humanos con expansión maxilar rápida (no con retracción de un canino) y de modelos animales. En ese estudio el TGF-β no distinguió los lados, por lo que se retiró del lado de tensión | Si se mantiene este nivel de detalle y la advertencia sobre el tipo de movimiento |
| 41 | La hialinización aparece en focos pequeños incluso con fuerzas ligeras y es más extensa con fuerzas excesivas | Concordante con la literatura ortodóntica clásica (Reitan, Rygh); la extensión y frecuencia dependen de la fuerza y del tipo de movimiento | Redacción para el curso de ortodoncia |

**Reparación (sección 5.6)**

| N.º | Afirmación o cifra | Situación | Qué confirmar |
|---|---|---|---|
| 27 | Fases de la fractura: inflamación de horas a 1 o 2 semanas; callo blando de la 1.ª a la 3.ª semana; callo duro de la 3.ª a la 12.ª semana; remodelado de meses a años | Se citan inflamación de 1 a 2 semanas y reparación de 2 a 12 semanas; los plazos varían por hueso, edad y fijación | Cifras del curso y su adaptación a la mandíbula |
| 28 | Inmovilización clásica de una fractura mandibular de 4 a 6 semanas | Depende del tipo de fractura y de la fijación; con fijación rígida la función se recupera antes | Cifra de referencia clínica |
| 29 | Alvéolo: epitelización a las 3 a 4 semanas; hueso inmaduro desde las primeras semanas (el tejido de granulación casi se ha sustituido hacia las 6 a 8 semanas) y dominante durante los primeros 3 a 6 meses; hueso laminar y médula de forma progresiva, más tarde en la zona coronal | Trombelli 2008 (27 biopsias humanas: 2 a 4, 6 a 8 y 12 a 24 semanas) halló que a las 12 a 24 semanas el hueso reticular todavía dominaba (41 %) y solo 1 de 11 biopsias tenía hueso laminar y médula. Las cifras anteriores de este guion (4.ª y 12.ª semana para el hueso laminar) se retiraron por contradecir esa fuente. Amler (1969) no pudo consultarse; además hay variación individual muy amplia | Cifras del curso |
| 30 | Pérdida de reborde: aproximadamente 50 % del ancho en el primer año, con la mayor parte en los primeros 3 meses; a los 6 meses, pérdida horizontal de 29 a 63 % y vertical de 11 a 22 % | Schropp (2003) se cita a veces como «50 % en 12 meses» y a veces como «50 % en 3 meses»; la revisión sistemática aporta los rangos de 6 meses | Formulación exacta de la cifra |
| 31 | La MRONJ (hueso expuesto o fístula sondeable más de 8 semanas, con antirresortivo o antiangiogénico, sin radioterapia previa ni metástasis en los maxilares) es más frecuente con dosis oncológicas que con las de osteoporosis; la extracción es el desencadenante más frecuente pero no el único | Es la posición del documento de 2022 de la AAOMS, que estratifica el riesgo | Definición y estratificación de riesgo vigentes |
| 42 | En los huesos membranosos craneofaciales con fijación estable el callo cartilaginoso es escaso y predomina la osificación intramembranosa; las miniplacas son fijación semirrígida | Coincide con la literatura sobre cicatrización craneofacial; el esquema de cuatro fases con callo blando es el de los huesos largos con movimiento | Si el docente prefiere presentar el esquema clásico como base y este matiz como aviso, que es como está ahora |

**Alteraciones del equilibrio (sección 5.7)**

| N.º | Afirmación o cifra | Situación | Qué confirmar |
|---|---|---|---|
| 32 | *TCIRG1* explica aproximadamente la mitad o más de las osteopetrosis recesivas graves | Una fuente da 58 %; otras porcentajes menores | Cifra |
| 33 | El trasplante de progenitores hematopoyéticos corrige los defectos propios del osteoclasto pero no la falta de RANKL | Concepto aceptado, con excepciones e indicaciones específicas | Indicaciones |
| 34 | Osteoclastos de Paget con decenas de núcleos | Los textos dan cifras variables, algunos hasta más de cien núcleos | Cifra o descripción cualitativa |
| 35 | *SQSTM1* en hasta cerca del 40 % de los casos familiares | Se cita «hasta 40 %» en casos familiares y esporádicos; el porcentaje esporádico es menor | Porcentajes |
| 36 | En los maxilares, el maxilar superior se afecta más que la mandíbula en Paget | Dato clínico clásico que no se contrastó con una fuente puntual | Confirmar |
| 37 | Complicaciones de las extracciones en Paget y hallazgos orales | Descripción clínica clásica | Confirmar |
| 38 | Cortical mandibular en la radiografía panorámica como indicio de baja densidad ósea; relación de la osteoporosis con la pérdida de hueso alveolar y de dientes | La utilidad del cribado panorámico y la asociación con la pérdida alveolar son objeto de debate | Formulación clínica |
| 39 | Criterio T-score menor o igual que −2,5 solo en mujeres posmenopáusicas y varones de 50 años o más; Z-score en más jóvenes | Consistente con la posición de la OMS y de la ISCD; se acotó el texto tras la revisión | Que el docente acepte la acotación |

**Otras decisiones que conviene confirmar (sin marca en el texto)**

- La regla sugerida del logro Remodelador (todas las obligatorias y al menos 70 % en la evaluación final) es una propuesta.
- El uso de «resorción» como término principal (con «reabsorción» como sinónimo aceptado) y la advertencia sobre la «remodelación» del crecimiento craneofacial.
- Los tiempos de cada sección (116 minutos en total, repartidos en 2 o 3 sesiones) son estimados y deben probarse con estudiantes. Se calcularon a partir de unas 6.100 palabras de contenido y de 26 actividades.
- Los bloques «Para profundizar» (genes y señales secundarias) se propusieron como plegables y fuera de la evaluación; el docente puede moverlos al cuerpo principal o suprimirlos.
- En la cicatrización del alvéolo, el último paso del ordenamiento se planteó como «contorno final del reborde» y el orden sigue el tejido predominante, porque el remodelado del reborde empieza pronto y se solapa con la formación de hueso.
- Las multicapa en modo explorar valen 20 puntos y la de ortodoncia se pasó a modo identificar (30 puntos), para premiar la comprensión y no solo la visita.
- La zona de compresión y tensión se ilustra con un canino que se retrae hacia distal; el docente puede preferir otro ejemplo (por ejemplo, un molar).
- Los datos de recambio óseo del hueso alveolar provienen sobre todo de animales.

## Registro de revision

Revision cientifica independiente del 2026-09-24. Los datos discutidos se contrastaron con fuentes abiertas (resumen y texto de Trombelli 2008 y de Garlet 2007, revisiones sobre cicatrizacion craneofacial y sobre vitamina D y RANKL, posiciones de la OMS y la ISCD sobre el T-score, y el documento de la AAOMS de 2022) o con razonamiento explicito. Ningun hallazgo se rechazo: los quince eran correctos, pero cuatro se aplicaron solo en parte por las razones que se indican.

| N.º | Hallazgo | Decision | Razon breve |
|---|---|---|---|
| 1 | Tiempos del alveolo (hueso laminar desde la 4.ª semana y a las 12 semanas) contradicen a Trombelli 2008 | Aceptado | Verificado: en las 27 biopsias humanas, a las 12 a 24 semanas el hueso reticular aun dominaba (41 %) y solo 1 de 11 tenia hueso laminar y medula. Se quitaron las cifras de la tabla, de la capa, de la nota 29 y de la pregunta m5_8_q11 (la opcion correcta ahora dice hueso inmaduro dominante). |
| 2 | Orden de m5_ordenar_alveolo y feedback de m5_alveolo_multicapa | Parcial | Razonamiento: la perdida del reborde empieza pronto y se solapa con la formacion de hueso, asi que no es una etapa posterior. Se reformulo el enunciado (segun el tejido que predomina), el paso 5 pasa a «maduracion del hueso y contorno final del reborde» (id contorno_final) y se explica el solapamiento. Se mantuvo el orden de cinco pasos, porque el contorno final si es el resultado ultimo. Se corrigio el feedback y se movio la capa del epitelio a su lugar cronologico (tambien en la tabla de la ilustracion). |
| 3 | «La formacion es la fase mas larga» | Aceptado | Con las seis fases definidas en el modulo, la afirmacion era falsa (quiescencia y mineralizacion secundaria duran mas). Ahora dice «la fase activa mas larga de la BMU» en 5.1, 5.8, la capa, el banco, los ganchos y la tabla de errores; m5_8_q5 compara solo las cuatro fases activas. |
| 4 | Duracion de 57 min irreal | Parcial | Aceptado el diagnostico: con unas 6.100 palabras y 26 actividades, 45 a 60 min no es realista. Ahora se declara 90 a 120 min en 2 o 3 sesiones (116 min tipicos, con tiempos por seccion recalculados). No se recorto contenido ni se hicieron opcionales mas actividades: la densidad alta es coherente con el briefing y los bloques «Para profundizar» (hallazgo 13) ya alivian la carga. Queda [verificar] para probar con estudiantes. |
| 5 | TGF-β en el lado de tension | Aceptado | Verificado con el resumen de Garlet 2007: en tension suben IL-10, TIMP-1, colageno I, OPG y osteocalcina; en compresion TNF-α, RANKL y MMP-1; se hizo con expansion maxilar rapida. Se retiro TGF-β del lado de tension (tabla, capa, etiqueta de la ilustracion), se añadio una nota sobre el tipo de estudio y se añadio la referencia. |
| 6 | Hialinizacion «solo con fuerza excesiva» | Aceptado | La literatura ortodontica describe focos pequeños casi inevitables al inicio del movimiento; es mas extensa con fuerzas altas. Se corrigieron texto, capa, glosario, hotspot, pregunta m5_5_q3 y banco. Las preguntas q3 y q10 siguen siendo correctas. |
| 7 | Calcitriol sube RANKL «con calcemia baja» | Aceptado | Verificado: la induccion de RANKL por 1,25(OH)2D3 es sobre todo in vitro o con dosis supra fisiologicas. Se saco de la tabla del eje, se conserva como aclaracion con [verificar], se corrigio 5.4, la capa hueso_diana y la explicacion de m5_8_q7. |
| 8 | Denosumab dentro de la tabla RANKL/OPG | Aceptado | No es un modulador fisiologico: neutraliza RANKL. Se saco de la tabla y se explica aparte. |
| 9 | Fractura mandibular presentada como ejemplo del esquema con callo blando | Aceptado | Verificado: los huesos craneofaciales estabilizados forman poco o ningun cartilago y las miniplacas son de fijacion semirrigida. Se añadio un aviso, se reformulo el Clinico y la pregunta m5_6_q3, y la ilustracion y el video se rotularon como esquema general de hueso largo. |
| 10 | Dos cifras cercanas: vida de la BMU (6 a 9 meses) y ciclo (4 a 6 meses) | Parcial | Se añadio una frase que avisa de que se miden con criterios distintos segun la fuente. No se unifico en una sola cifra, porque las fuentes no coinciden y el docente debe elegir la cifra unica para todo el OVA (notas 3 y 9). |
| 11 | Arrastre: orden M-CSF y RANKL, RANKL de membrana como receptor, receptor lrp5_6 compartido | Aceptado | Se definio el efecto parcial de RANKL sin M-CSF previo; rankl_membrana se rotulo «Diana» (el id se mantiene porque coincide con la capa SVG); se indico que lrp5_6 acepta dos moleculas, que ambos pares puntuan una vez y que el ultimo acople decide el estado final. |
| 12 | «Corte sagital» del alveolo | Aceptado | Las paredes vestibular y lingual se ven en un corte vestibulolingual (transversal). Corregido. |
| 13 | Carga cognitiva de genes y señales secundarias | Parcial | Se marcaron como «Para profundizar (plegable; no se evalua)» los genes y la cascada intracelular (5.2), las señales secundarias de acoplamiento (5.3) y los genes de osteopetrosis y Paget (5.7), y se documento la convencion. No se aplico a 5.5: sus señales son parte de la actividad de identificacion. Ninguna pregunta de la evaluacion final usa esos datos. |
| 14 | Multicapa en modo explorar puntuan solo por visitar | Parcial | m5_ortodoncia_multicapa paso a modo identificar con 9 consignas. Las de ciclo y acoplamiento se mantienen en explorar, porque tienen detras una actividad de comprobacion (ordenar y arrastre), pero su puntaje baja de 30 a 20 (total del modulo: 790 puntos, 700 en obligatorias). |
| 15 | Omisiones en MRONJ y en el criterio T-score | Aceptado | La definicion de MRONJ ahora incluye fistula sondeable, tratamiento antirresortivo o antiangiogenico, ausencia de radioterapia y de metastasis en los maxilares, y otros desencadenantes distintos de la extraccion. El T-score de −2,5 se acoto a mujeres posmenopausicas y varones de 50 años o mas (Z-score en mas jovenes). |

Ademas, el script de consistencia se volvio a ejecutar tras los cambios: ids unicos, capas y referencias cruzadas correctas, pares y distractores coherentes, 39 preguntas con correcta dentro de las opciones y reparto de letras 8 a, 8 b, 8 c y 7 d.
