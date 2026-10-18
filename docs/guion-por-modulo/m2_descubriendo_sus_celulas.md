# Modulo 2: Descubriendo sus células

> BORRADOR redactado por IA, pendiente de validacion del docente.

## Ficha

- **Foco:** Origen y procesos de diferenciación celular. De la cresta neural y la médula ósea a las células que forman, mantienen y reabsorben el hueso mandibular.
- **Densidad:** Media
- **Duracion estimada:** 40 a 50 minutos siguiendo solo las actividades obligatorias [verificar]. Las actividades de refuerzo (`obligatoria: false`) añaden unos 5 minutos. Si el curso lo prefiere, se puede repartir en dos sesiones (secciones 2.1 a 2.3 y 2.4 a 2.5).
- **Nivel:** Pregrado y posgrado en ciencias de la salud. Los avisos «Dato» con detalle molecular son de profundización para posgrado.
- **Logro que se otorga:** `celula_por_celula` (insignia «Célula por célula»). Condición propuesta, a confirmar con el docente: completar todas las actividades obligatorias y alcanzar al menos 70 % en la evaluación final.
- **Secciones:** 5
- **Puntaje máximo:** 380 puntos (340 en actividades obligatorias y 40 en actividades de refuerzo).

## Objetivos de aprendizaje

1. Describir el origen embrionario craneofacial de la mandíbula (cresta neural, ectomesénquima y cartílago de Meckel) y diferenciar la osificación intramembranosa de la osificación endocondral secundaria del cóndilo.
2. Ordenar las etapas del linaje osteoblástico (de célula madre mesenquimal a osteocito) y del osteoclástico (de célula madre hematopoyética a osteoclasto), indicando el factor o la señal que impulsa cada paso.
3. Identificar las estructuras del osteoblasto, del osteocito y del osteoclasto y relacionar cada una con su función.
4. Explicar cómo actúan M-CSF, RANKL y OPG sobre el linaje del osteoclasto, y por qué RUNX2 y osterix, en ese orden, son necesarios para el osteoblasto.
5. Relacionar cada célula ósea (progenitora, osteoblasto, revestimiento, osteocito, osteoclasto) con su función y con su marcador o señal principal.
6. Describir las células del ligamento periodontal y su relación con el hueso alveolar, y aplicarlo a la respuesta ósea ante una fuerza ortodóncica (lado de presión y lado de tensión).

## Conexion con el hueso mandibular

La mandíbula es un buen ejemplo para estudiar las células óseas porque reúne rasgos que otros huesos no tienen:

- **Origen craneofacial.** Su hueso procede de la cresta neural (ectomesénquima), no del mesodermo que forma el esqueleto de los miembros.
- **Dos mecanismos de osificación.** El cuerpo y la rama se forman por osificación intramembranosa junto al cartílago de Meckel. El cóndilo crece por osificación endocondral a partir de un cartílago secundario.
- **Hueso ligado al diente.** El proceso alveolar y el ligamento periodontal se forman con el diente y dependen de él. Sin diente, el hueso alveolar se reabsorbe.
- **Célula y clínica a la vista.** Los procesos celulares de este módulo explican la ortodoncia (lado de presión y de tensión), la pérdida de hueso alveolar en la periodontitis, la osteonecrosis de los maxilares por fármacos antirresortivos (más frecuente en la mandíbula que en el maxilar), la displasia cleidocraneal (RUNX2) y la esclerosteosis (sin esclerostina, con sobrecrecimiento del cráneo y de la mandíbula).

Cómo se aplica en cada sección:

| Sección | Aplicación a la mandíbula |
|---|---|
| 2.1 | Explorar la mandíbula en 3D y ubicar qué zonas se formaron por osificación intramembranosa y cuáles por osificación endocondral secundaria |
| 2.2 | Las células madre y osteoblastos del hueso mandibular descienden del ectomesénquima |
| 2.3 | Los osteocitos del hueso alveolar y del cuerpo mandibular detectan la carga masticatoria (se amplía en el módulo 3) |
| 2.4 | La resorción del hueso alveolar permite la erupción y el movimiento dentario, y los antirresortivos la frenan |
| 2.5 | El ligamento periodontal conecta el diente con el hueso alveolar y regula su remodelado |

Este módulo prepara los siguientes: el módulo 3 (mecanotransducción, osteocitos y esclerostina), el módulo 4 (mineralización, osteoblasto y fosfatasa alcalina) y el módulo 5 (remodelado, osteoclastos y RANKL/OPG).

## Ilustraciones y modelos requeridos

Las células se dibujan en SVG multicapa, salvo las del ligamento periodontal (sección 2.5), que desde 2026-10-18 van en el modelo 3D `ligamento_periodontal`, construido por código: una raíz en su alvéolo, en corte, con sus células. Los otros modelos 3D son la mandíbula (una sola malla, con hotspots con nombre) y las escenas procedurales de refuerzo. Este módulo no usa el modelo 3D `celulas`.

Convenciones de producción (aplican a todos los SVG):

- Cada capa es un grupo `<g id="...">` con `<title>` (etiqueta) y `<desc>` (texto alternativo). Las capas de fondo no son interactivas y no aparecen en las tablas.
- Cada capa interactiva debe medir al menos 44 x 44 píxeles en un teléfono; si el dibujo es más pequeño, se añade un área de toque transparente mayor.
- Ninguna información depende solo del color ni del hover: cada capa se distingue por forma o rotulado, y se selecciona con toque, clic o teclado.
- Alternativas táctil y de teclado: las construyen los componentes con los datos del contenido (toque para elegir y tocar el destino en lugar de arrastrar; Tab, Enter y Escape; lista de textos si no hay 3D). Las `instrucciones` solo resumen qué hacer y cuándo termina la actividad (10 a 300 caracteres).
- Orden de dibujo de cada SVG, de fondo a superficie: primero las capas de fondo (matriz, hueso, ligamento), luego las células y, al final, las etiquetas y marcadores. Las capas interactivas pequeñas (por ejemplo las del osteoclasto) miden al menos 12 % del ancho del `viewBox` o llevan un área de toque transparente mayor.
- Formato cuadrado o vertical (por ejemplo `viewBox` de 1000 x 1000) para que ocupe el ancho de un teléfono.
- Convención de las escenas video-texto: `mostrar` son las capas con opacidad completa en ese paso (el resto del SVG se atenúa), `resaltar` son las capas con contorno de énfasis y pulso, `animacion` es el movimiento específico del paso.

| id_archivo | Qué muestra | Se usa en |
|---|---|---|
| `m2_origen_mandibula` | Panel A: cabeza de un embrión hacia la cuarta o quinta semana, con el tubo neural, la cresta neural, la migración hacia el primer arco faríngeo y el ectomesénquima. Panel B: hemimandíbula en desarrollo (esquema compuesto de las semanas 6 a 14) en vista lateral con el cartílago de Meckel, el hueso intramembranoso, el cartílago condilar y el hueso endocondral del cóndilo | `m2_video_origen_mandibula` |
| `m2_arbol_linajes_oseos` | Árbol de los dos linajes con sus etapas (mesenquimal a la izquierda, hematopoyético a la derecha), los iconos de las señales (RUNX2, osterix, M-CSF, RANKL, OPG) y las zonas de acople para la actividad de arrastre | `m2_video_linaje_osteoblastico`, `m2_arrastre_senales_linajes` |
| `m2_osteoblasto_activo` | Osteoblasto cúbico sobre una capa de osteoide, con sus orgánulos, y una célula de revestimiento vecina sobre una superficie en reposo | `m2_multicapa_osteoblasto` |
| `m2_osteocito_lagunar` | Osteocito estrellado dentro de su laguna, con canalículos, dendritas, uniones comunicantes, vaso sanguíneo y la superficie con células de revestimiento | `m2_multicapa_osteocito` |
| `m2_osteoclasto_resorcion` | Osteoclasto multinucleado sobre la superficie ósea, con zona clara, borde festoneado, laguna de Howship y la maquinaria de acidificación y digestión | `m2_multicapa_osteoclasto` |
| `ligamento_periodontal` (modelo 3D, por código) | Corte longitudinal de la raíz de un diente en su alvéolo: cemento, ligamento periodontal con sus células, fibras de Sharpey y hueso alveolar; con la raíz sometida a una fuerza lateral para mostrar el lado de presión y el lado de tensión. Sustituye desde 2026-10-18 al dibujo `m2_ligamento_periodontal` | `m2_multicapa_ligamento_periodontal` |
| `mandibula` (modelo 3D) | Mandíbula humana completa, una sola malla, con hotspots con nombre | `m2_3d_origen_mandibula` |

Junto al texto de cada sección se muestra una ilustración de apoyo (encima del texto en móvil y al lado en pantallas anchas), con todas sus capas visibles y sin interacción. La misma ilustración se reutiliza después en la actividad de la sección:

| Sección | Ilustración junto al texto |
|---|---|
| 2.1 | `m2_origen_mandibula` |
| 2.2 | `m2_arbol_linajes_oseos` (mitad mesenquimal) y `m2_osteoblasto_activo` |
| 2.3 | `m2_osteocito_lagunar` |
| 2.4 | `m2_osteoclasto_resorcion` y `m2_arbol_linajes_oseos` (mitad hematopoyética) |
| 2.5 | Ninguna: el corte del ligamento es el modelo 3D `ligamento_periodontal` de la actividad |

**Capas de `m2_origen_mandibula`**

| id_capa | Etiqueta |
|---|---|
| `tubo_neural` | Tubo neural |
| `cresta_neural` | Cresta neural craneal |
| `corriente_migratoria` | Corriente de migración de la cresta neural |
| `primer_arco_faringeo` | Primer arco faríngeo (arco mandibular) |
| `ectomesenquima` | Ectomesénquima |
| `cartilago_meckel` | Cartílago de Meckel |
| `hueso_intramembranoso` | Hueso mandibular intramembranoso |
| `extremo_posterior_meckel` | Extremo posterior del cartílago de Meckel (martillo y yunque) |
| `cartilago_condilar` | Cartílago condilar (secundario) |
| `hueso_endocondral_condilo` | Hueso endocondral del cóndilo |

**Capas de `m2_arbol_linajes_oseos`**

| id_capa | Etiqueta |
|---|---|
| `celula_madre_mesenquimal` | Célula madre mesenquimal |
| `celula_osteoprogenitora` | Célula osteoprogenitora |
| `preosteoblasto` | Preosteoblasto |
| `osteoblasto` | Osteoblasto |
| `osteocito` | Osteocito |
| `celula_de_revestimiento` | Célula de revestimiento óseo |
| `destino_apoptosis` | Destino del osteoblasto: apoptosis |
| `celula_madre_hematopoyetica` | Célula madre hematopoyética |
| `progenitor_mieloide` | Progenitor mieloide |
| `precursor_monocito_macrofago` | Precursor monocito-macrófago |
| `preosteoclasto` | Preosteoclasto |
| `osteoclasto` | Osteoclasto |
| `senal_runx2` | Señal RUNX2 |
| `senal_osterix` | Señal osterix |
| `senal_mcsf` | Señal M-CSF |
| `senal_rankl` | Señal RANKL |
| `senal_opg` | Señal OPG |
| `zona_etapa_mesenquimal` | Zona de acople: célula mesenquimal sin factores osteoblásticos |
| `zona_etapa_preosteoblasto` | Zona de acople: preosteoblasto con RUNX2 y sin osterix |
| `zona_receptor_cfms` | Zona de acople: receptor c-Fms del precursor monocito-macrófago |
| `zona_receptor_rank` | Zona de acople: receptor RANK del preosteoclasto |
| `zona_ligando_osteoblasto` | Zona de acople: ligando expuesto por el osteoblasto (diana de OPG) |

**Capas de `m2_osteoblasto_activo`**

| id_capa | Etiqueta |
|---|---|
| `nucleo_osteoblasto` | Núcleo |
| `reticulo_endoplasmico_rugoso` | Retículo endoplasmático rugoso |
| `aparato_golgi` | Aparato de Golgi |
| `vesiculas_secrecion` | Vesículas de secreción |
| `osteoide` | Osteoide |
| `fosfatasa_alcalina` | Fosfatasa alcalina |
| `osteocalcina` | Osteocalcina |
| `ligandos_rankl_opg` | RANKL y OPG |
| `uniones_comunicantes` | Uniones comunicantes |
| `frente_mineralizacion` | Frente de mineralización |
| `hueso_mineralizado` | Hueso mineralizado |
| `celula_revestimiento` | Célula de revestimiento óseo |

**Capas de `m2_osteocito_lagunar`**

| id_capa | Etiqueta |
|---|---|
| `cuerpo_osteocito` | Cuerpo del osteocito |
| `nucleo_osteocito` | Núcleo |
| `laguna_osteocitica` | Laguna |
| `canaliculos` | Canalículos |
| `dendritas` | Dendritas |
| `uniones_comunicantes` | Uniones comunicantes |
| `liquido_lacunocanalicular` | Líquido lacuno-canalicular |
| `matriz_mineralizada` | Matriz mineralizada |
| `esclerostina` | Esclerostina |
| `celulas_superficie` | Osteoblastos y células de revestimiento |
| `vaso_sanguineo` | Vaso sanguíneo |

**Capas de `m2_osteoclasto_resorcion`**

| id_capa | Etiqueta |
|---|---|
| `nucleos_multiples` | Núcleos múltiples |
| `zona_clara` | Zona clara |
| `borde_festoneado` | Borde festoneado |
| `bomba_protones` | Bomba de protones (V-ATPasa) |
| `canal_cloruro` | Canal de cloruro (ClC-7) |
| `anhidrasa_carbonica_ii` | Anhidrasa carbónica II |
| `catepsina_k` | Catepsina K |
| `trap` | Fosfatasa ácida resistente al tartrato (TRAP) |
| `laguna_howship` | Laguna de Howship |
| `matriz_mineralizada` | Matriz mineralizada |
| `receptores_rank_cfms` | Receptores RANK y c-Fms |

**Nodos del modelo 3D `ligamento_periodontal`** (construido por código; los ids coinciden con el catálogo `apps/web/src/content/nodos3d.ts`)

| id_nodo | Etiqueta |
|---|---|
| `cemento_radicular` | Cemento radicular |
| `ligamento_periodontal` | Ligamento periodontal |
| `fibras_sharpey` | Fibras de Sharpey |
| `hueso_alveolar_propio` | Hueso alveolar propio |
| `fibroblastos_periodontales` | Fibroblastos periodontales |
| `celulas_progenitoras_perivasculares` | Células progenitoras perivasculares |
| `cementoblastos` | Cementoblastos |
| `osteoblastos_alveolares` | Osteoblastos alveolares |
| `osteoclastos_alveolares` | Osteoclastos alveolares |
| `restos_epiteliales_malassez` | Restos epiteliales de Malassez |
| `lado_presion` | Lado de presión |
| `lado_tension` | Lado de tensión |

**Hotspots del modelo 3D `mandibula`** (una sola malla; los ids coinciden con el catálogo `apps/web/src/content/nodos3d.ts`)

| id_hotspot | Etiqueta | Zona anatómica |
|---|---|---|
| `cuerpo` | Cuerpo mandibular | Porción horizontal entre la sínfisis y el ángulo, por debajo del proceso alveolar |
| `foramen_mentoniano` | Foramen mentoniano | Cara externa del cuerpo, a la altura de los premolares |
| `sinfisis` | Sínfisis mentoniana | Línea media del mentón |
| `rama` | Rama mandibular | Porción vertical posterior |
| `condilo` | Cóndilo mandibular | Extremo superior y posterior de la rama, que se articula con el temporal |
| `apofisis_coronoides` | Apófisis coronoides | Extremo superior y anterior de la rama, delante de la escotadura mandibular |
| `proceso_alveolar` | Proceso alveolar | Borde superior del cuerpo, que aloja los alvéolos dentarios |

**Notas de precisión anatómica**

- `m2_origen_mandibula`. Distribución de capas por panel: en el panel A van `tubo_neural`, `cresta_neural`, `corriente_migratoria`, `primer_arco_faringeo` y `ectomesenquima`; en el panel B van `ectomesenquima` (condensado alrededor de la barra de cartílago), `cartilago_meckel`, `hueso_intramembranoso`, `extremo_posterior_meckel`, `cartilago_condilar` y `hueso_endocondral_condilo`. La capa `ectomesenquima` existe en los dos paneles, y así el paso 3 del video la muestra en el panel B. El panel B es un compuesto: los pasos 3 y 4 corresponden al periodo embrionario (semanas 6 y 7) y el paso 6 al periodo fetal temprano (semanas 10 a 14). El panel A es un esquema de un embrión de cuarta o quinta semana; la cresta neural migra en corrientes ventrolaterales y no debe dibujarse como una masa única. En el panel B el hueso intramembranoso se dibuja al lado (lateral) del cartílago de Meckel, nunca como su continuación. El cartílago condilar es un cartílago aparte, en el extremo posterosuperior de la rama, sin continuidad con el de Meckel. El extremo posterior de Meckel se dibuja hacia el oído medio.
- `m2_arbol_linajes_oseos`. Las zonas de acople (`zona_*`) son contornos punteados alrededor de la célula o del receptor, sin relleno, que no tapan a las células dibujadas debajo. El linaje del osteoclasto nace en la célula madre hematopoyética, no en el osteoblasto ni en la célula madre mesenquimal: las dos ramas no deben cruzarse. El preosteoclasto es mononuclear y el osteoclasto tiene tres o más núcleos dibujados. RUNX2 se ubica en la transición de célula madre a osteoprogenitora y osterix en la transición de preosteoblasto a osteoblasto, en ese orden. RANKL se dibuja anclado a la membrana del osteoblasto, RANK en la membrana del preosteoclasto, y OPG como una molécula libre que se une a RANKL.
- `m2_osteoblasto_activo`. El osteoblasto activo es cúbico, con el núcleo en el polo opuesto al hueso, retículo rugoso y Golgi visibles. El osteoide queda entre la célula y el hueso mineralizado, y el frente de mineralización es el límite entre ambos. La célula de revestimiento se dibuja plana y alargada, sobre una superficie sin osteoide.
- `m2_osteocito_lagunar`. El cuerpo del osteocito ocupa la laguna; las dendritas ocupan los canalículos y dejan un espacio con líquido (mayor en el canalículo que el grosor de la dendrita). Las uniones comunicantes se dibujan en los extremos de las dendritas, no en el cuerpo. La red debe llegar a la superficie ósea y a un vaso.
- `m2_osteoclasto_resorcion`. La zona clara (zona de sellado) es un anillo que rodea al borde festoneado y apoya sobre el hueso. La laguna de Howship es la depresión del hueso bajo el borde festoneado. La bomba de protones, el canal de cloruro y el borde festoneado son adyacentes: se dibujan con un área de toque de al menos 12 % del ancho del `viewBox` y sin solaparse. La bomba de protones y el canal de cloruro se ubican en el borde festoneado; la anhidrasa carbónica II, en el citoplasma; la catepsina K, en el espacio sellado.
- Modelo 3D `ligamento_periodontal` (2026-10-18; sustituye al dibujo `m2_ligamento_periodontal`, cuya ilustración hecha con IA tenía una raíz de morfología irreal y células como anillos). Una sola raíz cónica de unos 13 mm, cortada a lo largo: dentina, conducto pulpar central y estrecho que se afina hasta el foramen apical, y una capa fina de cemento, más gruesa hacia el ápice. La raíz y el hueso tienen proporciones reales; el ligamento (0,85 mm en reposo frente a los 0,15 a 0,38 mm reales) y las células (unas diez veces) están ampliados para que se vean, y el texto alternativo lo dice. Los haces principales son oblicuos (se insertan en el hueso más arriba que en el cemento), horizontales junto a la cresta y en abanico en el ápice; sus extremos incluidos en el cemento y en el hueso alveolar propio son las fibras de Sharpey (`fibras_sharpey` marca solo esos extremos). La lámina (hueso alveolar propio) está perforada por conductos vasculares por los que pasan vasos del ligamento. Una fuerza lateral (flecha) empuja la raíz hacia la derecha, en bloque: a la izquierda (lado de tensión) el ligamento es ancho y sus haces están rectos y tensos, con osteoblastos cúbicos sobre una capa de osteoide; a la derecha (lado de presión) es estrecho, sus haces están ondulados y hay osteoclastos multinucleados en lagunas de Howship, donde los haces han perdido su inserción. `lado_presion` y `lado_tension` son dos pares de flechas por delante del ligamento (que se acercan y que se alejan), no áreas que tapen a las células. Fibroblastos fusiformes entre los haces y alineados con ellos; células progenitoras junto a los vasos; cementoblastos cúbicos en fila sobre el cemento; restos de Malassez en nidos de seis células cerca del cemento.
- Modelo 3D `mandibula`. Los hotspots son puntos con nombre sobre una sola malla: no se separan piezas. La ubicación de `foramen_mentoniano` y `sinfisis` debe coincidir con la anatomía de la malla.

## Secciones

### Seccion 2.1: Del ectomesénquima a la mandíbula (id "m2_1_origen_craneofacial")

#### Contenido

Ningún hueso aparece de la nada: sus células vienen de otras células. Antes de conocer al osteoblasto, al osteocito y al osteoclasto, conviene saber de dónde salen y por qué la mandíbula tiene una historia propia.

**Un origen distinto al de los huesos de los miembros**

Mientras se cierra el tubo neural, un grupo de células de la cresta neural craneal se desprende y migra hacia el futuro rostro y cuello. Se detienen en los arcos faríngeos. El primero, el arco mandibular, aparece hacia la cuarta semana de desarrollo.

En la cabeza, estas células forman el **ectomesénquima**: un tejido embrionario de origen neural que se comporta como mesénquima. De él salen el hueso de la mandíbula, la dentina, la pulpa, el cemento y el ligamento periodontal. En el tronco y en los miembros, el hueso y el cartílago derivan del mesodermo.

> Dato: Las células de la cresta neural que colonizan el primer arco no expresan genes Hox, una característica que forma parte de su identidad mandibular (profundización para posgrado).

**Dos maneras de formar hueso en una misma mandíbula**

| | Osificación intramembranosa | Osificación endocondral secundaria |
|---|---|---|
| Molde | El ectomesénquima se condensa; no hay cartílago | Un cartílago secundario, el condilar |
| Células | El ectomesénquima se diferencia directamente en osteoblastos | Progenitores, condroblastos y condrocitos hipertróficos; después el hueso reemplaza al cartílago |
| Dónde | Cuerpo, rama y proceso alveolar | Cóndilo |
| Cuándo empieza | Hacia la sexta o séptima semana [verificar] | Entre las semanas 10 y 14 aproximadamente [verificar] |

**El cartílago de Meckel es una guía, no el molde de la mandíbula**

Hacia la sexta semana, el ectomesénquima del arco mandibular se condensa y forma, a cada lado, una barra de cartílago: el cartílago de Meckel. La mandíbula no se forma osificándolo. El hueso aparece junto a él, por osificación intramembranosa, hacia la región del futuro foramen mentoniano, donde el nervio alveolar inferior se divide en sus ramas mentoniana e incisiva [verificar].

Después, el extremo posterior del cartílago de Meckel forma el martillo y el yunque del oído medio. Su porción media desaparece o se transforma en tejido fibroso, y una parte contribuye a ligamentos como el esfenomandibular [verificar].

> Recuerda: El cartílago de Meckel es primario y actúa como guía. El cartílago condilar es secundario: aparece después, cuando ya existe hueso intramembranoso.

**El cóndilo crece por osificación endocondral secundaria**

Entre las semanas 10 y 14 aproximadamente [verificar] aparecen cartílagos secundarios, sobre todo el condilar. Se llaman secundarios porque no derivan del cartílago de Meckel y surgen cuando ya hay hueso membranoso. El cartílago condilar crece, sus condrocitos se hipertrofian y el hueso lo reemplaza por osificación endocondral. Por eso el cóndilo es un centro de crecimiento de la mandíbula.

También se describen cartílagos secundarios más pequeños, en la apófisis coronoides y en la sínfisis [verificar].

> Clinico: Cuando falla el desarrollo de la cresta neural craneal, la mandíbula suele estar afectada. Un ejemplo es el síndrome de Treacher Collins (mutaciones en TCOF1), con hipoplasia mandibular.

**Dos familias de células mantienen el hueso**

Con la mandíbula formada, dos familias de células con orígenes distintos la mantienen toda la vida:

| Linaje | Célula de partida | Células que origina | Papel |
|---|---|---|---|
| Mesenquimal (osteoblástico) | Célula madre mesenquimal; en la mandíbula, de origen ectomesenquimal | Osteoprogenitora, osteoblasto, célula de revestimiento, osteocito | Formar y mantener la matriz |
| Hematopoyético (monocito-macrófago) | Célula madre hematopoyética de la médula ósea | Precursor monocito-macrófago, preosteoclasto, osteoclasto | Reabsorber hueso |

> Atencion: Los osteoclastos no derivan de los osteoblastos. Vienen de la médula ósea, como las células de la sangre. Aun así, los osteoblastos les envían las señales que los forman y los regulan (M-CSF, RANKL y OPG).

En las secciones siguientes recorrerás cada linaje, célula por célula.

#### Actividades

##### Actividad m2_video_origen_mandibula

```yaml
tipo: video-texto
titulo: "Del embrión a la mandíbula en seis pasos"
instrucciones: "Toca Siguiente para avanzar por los seis pasos y observa cómo cambia el dibujo; con Anterior vuelves. Con teclado: Tab hasta el botón y Enter, o las flechas. Nada avanza solo ni depende de pasar el mouse por encima."
obligatoria: true
puntaje_max: 10
concepto: "osificacion_mandibular"
retroalimentacion:
  acierto: "Recorriste los seis pasos. Recuerda la secuencia: cresta neural, arco mandibular, cartílago de Meckel, hueso intramembranoso, destino de Meckel y cartílago condilar con osificación endocondral."
  error: "Todavía faltan pasos por ver. Toca Siguiente hasta llegar al último paso para completar la actividad."
ilustracion: m2_origen_mandibula
pasos:
  - id: paso_cresta_neural
    titulo: "La cresta neural craneal"
    texto: "Mientras se cierra el tubo neural, células de la cresta neural craneal se desprenden de su borde superior. Son multipotentes y migran hacia la región que será la cara y el cuello. En la cabeza formarán tejidos, como el hueso y el cartílago, que en el tronco y los miembros derivan del mesodermo."
    cambia_escena:
      mostrar: [tubo_neural, cresta_neural]
      resaltar: [cresta_neural]
      animacion: "Puntos de color se separan del borde dorsal del tubo neural con un pulso de la capa cresta_neural."
  - id: paso_primer_arco
    titulo: "Migración al primer arco faríngeo"
    texto: "Las células migran en corrientes hacia los arcos faríngeos. Hacia la cuarta semana, el primer arco o arco mandibular se llena de un tejido llamado ectomesénquima. De él saldrán el hueso de la mandíbula, la dentina, la pulpa y el ligamento periodontal."
    cambia_escena:
      mostrar: [tubo_neural, cresta_neural, corriente_migratoria, primer_arco_faringeo, ectomesenquima]
      resaltar: [ectomesenquima]
      animacion: "Flechas discontinuas recorren la capa corriente_migratoria y llenan el arco con puntos de color que representan células."
  - id: paso_meckel
    titulo: "El cartílago de Meckel"
    texto: "Hacia la sexta semana, el ectomesénquima se condensa y forma una barra de cartílago a cada lado: el cartílago de Meckel. No se convierte en la mandíbula. Funciona como guía del hueso que se forma junto a él."
    cambia_escena:
      mostrar: [ectomesenquima, cartilago_meckel]
      resaltar: [cartilago_meckel]
      animacion: "La vista pasa del panel A (embrión) al panel B (hemimandíbula en desarrollo) con un fundido, y la barra de cartílago se dibuja de atrás hacia adelante."
  - id: paso_intramembranosa
    titulo: "Osificación intramembranosa"
    texto: "Junto al cartílago de Meckel, hacia el futuro foramen mentoniano, el ectomesénquima se condensa. Sus células se diferencian directamente en osteoblastos, sin pasar por cartílago, y depositan hueso. Ese hueso se extiende hacia atrás y hacia adelante y forma el cuerpo y la rama."
    cambia_escena:
      mostrar: [cartilago_meckel, hueso_intramembranoso]
      resaltar: [hueso_intramembranoso]
      animacion: "Aparecen puntos de osteoblastos al costado del cartílago y la capa hueso_intramembranoso crece hacia atrás y hacia adelante."
  - id: paso_destino_meckel
    titulo: "El destino del cartílago de Meckel"
    texto: "Mientras el hueso se consolida, la porción media del cartílago de Meckel desaparece o se transforma en tejido fibroso. Su extremo posterior forma el martillo y el yunque del oído medio. El hueso membranoso ya no necesita la guía."
    cambia_escena:
      mostrar: [cartilago_meckel, hueso_intramembranoso, extremo_posterior_meckel]
      resaltar: [extremo_posterior_meckel]
      animacion: "La porción media de la capa cartilago_meckel pierde color hasta desvanecerse; el extremo posterior permanece resaltado con un pulso."
  - id: paso_condilar
    titulo: "Cartílago condilar y osificación endocondral"
    texto: "Entre las semanas 10 y 14 aproximadamente [verificar] aparece el cartílago condilar, un cartílago secundario en el extremo superior de la rama. Se llama secundario porque no viene de Meckel y surge cuando ya hay hueso membranoso. Sus condrocitos crecen y el hueso lo reemplaza por osificación endocondral. Por eso el cóndilo es un centro de crecimiento."
    cambia_escena:
      mostrar: [hueso_intramembranoso, cartilago_condilar, hueso_endocondral_condilo]
      resaltar: [cartilago_condilar]
      animacion: "La capa cartilago_condilar crece como un cono sobre la rama y, en su base, el color cambia gradualmente al de hueso_endocondral_condilo."
```

##### Actividad m2_3d_origen_mandibula

```yaml
tipo: exploracion-3d
titulo: "Tu mandíbula, zona por zona"
instrucciones: "Gira la mandíbula arrastrando con un dedo y acerca con un pellizco. Toca cada punto para leer cómo se formó esa zona; con teclado, Tab y Enter. Si no hay 3D verás una lista con los mismos textos. Es de refuerzo: no bloquea el avance."
obligatoria: false
puntaje_max: 20
concepto: "osificacion_mandibular"
retroalimentacion:
  acierto: "Ya ubicas dónde actuó cada mecanismo: el cuerpo se formó junto al cartílago de Meckel, el cóndilo y la apófisis coronoides tuvieron cartílago secundario, y el proceso alveolar depende del diente."
  error: "Faltan puntos por visitar. Los cuatro requeridos son el cuerpo, el cóndilo, la apófisis coronoides y el proceso alveolar."
modelo: mandibula
hotspots:
  - id: cuerpo
    etiqueta: "Cuerpo mandibular"
    descripcion: "Se formó por osificación intramembranosa junto al cartílago de Meckel, que actuó como guía. Sus osteoblastos derivan del ectomesénquima de la cresta neural."
    zona_anatomica: "Porción horizontal entre la sínfisis y el ángulo, por debajo del proceso alveolar."
  - id: foramen_mentoniano
    etiqueta: "Foramen mentoniano"
    descripcion: "Hacia esta región apareció el primer centro de osificación, donde el nervio alveolar inferior se divide en sus ramas mentoniana e incisiva [verificar]."
    zona_anatomica: "Cara externa del cuerpo, a la altura de los premolares."
  - id: sinfisis
    etiqueta: "Sínfisis mentoniana"
    descripcion: "Las dos hemimandíbulas se unen aquí por una articulación fibrosa con pequeños cartílagos secundarios. Se osifica y las dos mitades se fusionan durante el primer año de vida [verificar]."
    zona_anatomica: "Línea media del mentón."
  - id: rama
    etiqueta: "Rama mandibular"
    descripcion: "Se formó por osificación intramembranosa. En su extremo superior se desarrollan los cartílagos secundarios del cóndilo y de la apófisis coronoides."
    zona_anatomica: "Porción vertical posterior."
  - id: condilo
    etiqueta: "Cóndilo mandibular"
    descripcion: "Su cabeza crece a partir del cartílago condilar, un cartílago secundario que se osifica por vía endocondral. Es un centro de crecimiento de la mandíbula."
    zona_anatomica: "Extremo superior y posterior de la rama, que se articula con el hueso temporal."
  - id: apofisis_coronoides
    etiqueta: "Apófisis coronoides"
    descripcion: "También tuvo un cartílago secundario, más pequeño y transitorio que el condilar [verificar]. Recibe la inserción del músculo temporal."
    zona_anatomica: "Extremo superior y anterior de la rama, delante de la escotadura mandibular."
  - id: proceso_alveolar
    etiqueta: "Proceso alveolar"
    descripcion: "Se forma junto con los dientes: las células del folículo dental originan el ligamento periodontal y contribuyen al hueso alveolar. Sin dientes, este hueso se reabsorbe."
    zona_anatomica: "Borde superior del cuerpo, que aloja los alvéolos dentarios."
requeridas: [cuerpo, condilo, apofisis_coronoides, proceso_alveolar]
```

##### Actividad m2_quiz_origen

```yaml
tipo: quiz
titulo: "¿De dónde sale la mandíbula?"
instrucciones: "Responde cada pregunta y lee la explicación. Toca tu respuesta; en Ordenar pasos, toca los pasos en su orden y pulsa Comprobar. Con teclado: Tab hasta la opción o el paso y Enter."
obligatoria: true
puntaje_max: 30
concepto: "osificacion_mandibular"
retroalimentacion:
  acierto: "Muy bien. Ya puedes explicar de dónde vienen las células de la mandíbula y cómo se forma su hueso."
  parcial: "Vas bien, pero repasa la secuencia: cresta neural, Meckel como guía, hueso membranoso a su lado y cartílago condilar secundario."
  error: "Repasa la secuencia: cresta neural, cartílago de Meckel como guía, hueso membranoso a su lado y, más tarde, cartílago condilar secundario."
preguntas:
  - id: m2_qo_1
    formato: ordenar_pasos
    enunciado: "Ordena, de la primera a la última, las etapas de la formación de la mandíbula."
    pasos:
      - id: p_endocondral
        texto: "Osificación endocondral del cartílago condilar"
      - id: p_meckel
        texto: "El ectomesénquima se condensa y forma el cartílago de Meckel"
      - id: p_cresta
        texto: "Células de la cresta neural craneal migran al primer arco faríngeo"
      - id: p_condilar
        texto: "Aparece el cartílago condilar secundario"
      - id: p_membranosa
        texto: "Osificación intramembranosa junto al cartílago de Meckel"
    correcta: [p_cresta, p_meckel, p_membranosa, p_condilar, p_endocondral]
    explicacion: "La cresta neural aporta las células; el cartílago de Meckel actúa como guía; el hueso membranoso aparece a su lado y, más tarde, el cartílago condilar secundario se osifica por vía endocondral."
    dificultad: 2
    concepto: "osificacion_mandibular"
  - id: m2_qo_2
    formato: opcion_multiple
    enunciado: "¿De qué población de células embrionarias deriva la mayor parte del hueso de la mandíbula?"
    opciones:
      - id: a
        texto: "De los somitas y el mesodermo paraxial del tronco"
      - id: b
        texto: "De la cresta neural craneal, que forma el ectomesénquima"
      - id: c
        texto: "Del mesodermo de la placa lateral de la región facial"
      - id: d
        texto: "Del endodermo de la faringe y de sus bolsas faríngeas"
    correcta: b
    explicacion: "En la cabeza, la cresta neural forma el ectomesénquima, que origina el hueso mandibular. El mesodermo forma el hueso de los miembros y del tronco."
    dificultad: 1
    concepto: "origen_craneofacial"
  - id: m2_qo_3
    formato: verdadero_falso
    enunciado: "El cartílago de Meckel se osifica y se convierte en el cuerpo de la mandíbula."
    opciones:
      - id: verdadero
        texto: "Verdadero"
      - id: falso
        texto: "Falso"
    correcta: falso
    explicacion: "El cuerpo mandibular se forma por osificación intramembranosa al lado del cartílago de Meckel, que solo actúa como guía. Su porción media desaparece y su extremo posterior forma el martillo y el yunque."
    dificultad: 2
    concepto: "cartilago_meckel"
  - id: m2_qo_4
    formato: opcion_multiple
    enunciado: "¿Cómo se forma el hueso del cóndilo mandibular?"
    opciones:
      - id: a
        texto: "Por osificación intramembranosa directa, sin ningún molde de cartílago"
      - id: b
        texto: "Por osificación endocondral del propio cartílago de Meckel en la rama"
      - id: c
        texto: "Por osificación endocondral que se extiende desde el hueso temporal"
      - id: d
        texto: "Por osificación endocondral, a partir de un cartílago secundario"
    correcta: d
    explicacion: "El cóndilo tiene un cartílago condilar secundario que crece y es reemplazado por hueso mediante osificación endocondral. Por eso es un centro de crecimiento."
    dificultad: 2
    concepto: "condilo_endocondral"
```

### Seccion 2.2: De célula madre a osteoblasto (id "m2_2_linea_osteoblastica")

#### Contenido

El hueso se sigue construyendo y renovando durante toda la vida. Esa construcción parte de una célula madre y sigue un camino con etapas ordenadas, gobernadas por dos factores de transcripción.

**Las etapas del camino**

| Etapa | Qué la caracteriza | Factor que la impulsa |
|---|---|---|
| Célula madre mesenquimal | Multipotente, se autorrenueva | Señales del nicho, por ejemplo BMP y Wnt |
| Osteoprogenitora | Comprometida con el linaje óseo, fusiforme, todavía se divide | RUNX2 |
| Preosteoblasto | Tiene RUNX2 y empieza a activar genes de la matriz | RUNX2 activa a osterix |
| Osteoblasto | Cúbico, sintetiza el osteoide | Osterix, junto con RUNX2 |
| Osteocito, célula de revestimiento o muerte celular | Destinos posibles del osteoblasto | Señales del hueso y del entorno |

**Célula madre mesenquimal y osteoprogenitora**

Las células madre mesenquimales viven en la médula ósea, el periostio y el ligamento periodontal, entre otros nichos. Se autorrenuevan y son multipotentes: según las señales que reciban, originan osteoblastos, condrocitos o adipocitos. En la mandíbula descienden del ectomesénquima de la sección anterior.

La osteoprogenitora ya eligió el linaje óseo. Es fusiforme, con núcleo alargado y poco citoplasma, y conserva la capacidad de dividirse. Se encuentra en la capa interna del periostio y en el endostio.

> Dato: Para llamar «célula estromal mesenquimal multipotente» a una célula cultivada, la Sociedad Internacional de Terapia Celular (ISCT, 2006) propone criterios mínimos: adherirse al plástico; expresar CD105, CD73 y CD90 y no expresar CD45, CD34, CD14 o CD11b, CD79α o CD19 ni HLA-DR; y diferenciarse in vitro a hueso, cartílago y grasa. El término «célula madre» se reserva para las que demuestran autorrenovación y diferenciación in vivo (profundización para posgrado).

**Los interruptores: RUNX2 y osterix**

Son factores de transcripción: proteínas que actúan dentro del núcleo y encienden genes.

- **RUNX2** (también llamado Cbfa1) se activa primero y compromete a la célula con el linaje óseo. Los ratones sin RUNX2 no forman osteoblastos maduros ni hueso: su esqueleto queda cartilaginoso.
- **Osterix** (Sp7) se activa después y depende de RUNX2. Junto con RUNX2 activa los genes de la matriz y lleva al preosteoblasto a completar su diferenciación en osteoblasto. Los ratones sin osterix tienen precursores con RUNX2, pero no forman hueso.

> Recuerda: El orden es RUNX2 y luego osterix. Osterix está «aguas abajo» de RUNX2.

> Atencion: RUNX2 y osterix no son hormonas ni ligandos de un receptor de membrana. Actúan dentro del núcleo, en una etapa determinada de la célula. Las señales que los activan, como las BMP y Wnt, sí actúan sobre receptores de membrana.

> Clinico: La reducción de RUNX2 funcional causa la displasia cleidocraneal: clavículas hipoplásicas o ausentes, cierre tardío de las fontanelas, dientes supernumerarios y erupción dentaria retrasada.

**El osteoblasto: la célula que forma hueso**

El osteoblasto activo es cúbico, forma una capa sobre la superficie que está formando y tiene el núcleo en el polo opuesto al hueso. Su citoplasma es basófilo por la abundancia de retículo endoplasmático rugoso, y tiene un aparato de Golgi bien desarrollado. Cumple tres funciones:

1. **Sintetiza y secreta el osteoide**, la matriz orgánica todavía sin mineralizar. Aproximadamente 90 % es colágeno tipo I [verificar]. El resto son proteoglucanos y proteínas no colágenas, como la osteocalcina, la osteopontina y la sialoproteína ósea.
2. **Regula la mineralización.** La fosfatasa alcalina, anclada a su membrana y a las vesículas de la matriz, elimina el pirofosfato que inhibe la mineralización y aporta fosfato. La osteocalcina se une a la hidroxiapatita.
3. **Coordina a los osteoclastos.** Produce M-CSF, RANKL y OPG.

| Molécula | Qué es | Para qué sirve |
|---|---|---|
| Colágeno tipo I | Proteína estructural | Forma la trama del osteoide |
| Fosfatasa alcalina | Enzima de membrana | Favorece la mineralización; marcador de formación |
| Osteocalcina | Proteína no colágena | Se une a la hidroxiapatita; marcador tardío del osteoblasto |
| RANKL | Ligando de membrana | Activa el receptor RANK del precursor del osteoclasto |
| OPG | Receptor señuelo soluble | Se une a RANKL y lo bloquea |

> Clinico: La fosfatasa alcalina ósea y la osteocalcina en sangre se usan como marcadores de formación ósea.

**Destinos del osteoblasto y célula de revestimiento**

Cuando el osteoblasto termina de formar hueso, tiene tres destinos:

1. **Osteocito:** queda atrapado en la matriz que secretó.
2. **Célula de revestimiento óseo:** se aplana y cubre la superficie del hueso que no se está formando ni reabsorbiendo. Tiene poco citoplasma y núcleo alargado. Está en reposo, pero puede reactivarse y volver a formar hueso.
3. **Apoptosis:** se estima que entre 50 y 70 % de los osteoblastos mueren de esta forma [verificar].

> Recuerda: La célula de revestimiento no es una célula distinta que llegó de fuera: es un osteoblasto en reposo.

#### Actividades

##### Actividad m2_video_linaje_osteoblastico

```yaml
tipo: video-texto
titulo: "El camino de la línea osteoblástica"
instrucciones: "Toca Siguiente para avanzar por las cinco etapas y observa cómo aparece cada célula y cada factor en el árbol. Con Anterior puedes volver. Con teclado: Tab hasta Siguiente o Anterior y Enter, o usa las flechas izquierda y derecha. No hay animación automática ni información que dependa del hover."
obligatoria: true
puntaje_max: 10
concepto: "linaje_osteoblastico"
retroalimentacion:
  acierto: "Recorriste toda la línea osteoblástica. La secuencia es: célula madre mesenquimal, osteoprogenitora (RUNX2), preosteoblasto, osteoblasto (osterix) y sus destinos."
  error: "Todavía faltan etapas por ver. Toca Siguiente hasta llegar a los destinos del osteoblasto."
ilustracion: m2_arbol_linajes_oseos
pasos:
  - id: paso_celula_madre
    titulo: "La célula madre mesenquimal"
    texto: "En la médula ósea, el periostio y el ligamento periodontal hay células madre mesenquimales. Se autorrenuevan y pueden originar osteoblastos, condrocitos o adipocitos. En la mandíbula descienden del ectomesénquima de la cresta neural."
    cambia_escena:
      mostrar: [celula_madre_mesenquimal]
      resaltar: [celula_madre_mesenquimal]
      animacion: "La célula madre pulsa y se dibujan tres ramas tenues (hueso, cartílago y grasa); solo la rama del hueso se ilumina."
  - id: paso_runx2
    titulo: "RUNX2: el compromiso"
    texto: "Cuando se activa RUNX2, la célula se compromete con el linaje óseo y se convierte en osteoprogenitora. Es una célula fusiforme que todavía se divide. Sin RUNX2 no se forman osteoblastos maduros."
    cambia_escena:
      mostrar: [celula_madre_mesenquimal, celula_osteoprogenitora, senal_runx2]
      resaltar: [senal_runx2]
      animacion: "El icono senal_runx2 entra al núcleo de la célula madre, que se alarga hasta convertirse en celula_osteoprogenitora."
  - id: paso_osterix
    titulo: "Osterix: la maduración"
    texto: "Osterix se activa después de RUNX2 y depende de él. Junto con RUNX2 activa los genes de la matriz y lleva al preosteoblasto a completar su diferenciación en osteoblasto. Sin osterix hay precursores con RUNX2, pero no hay hueso."
    cambia_escena:
      mostrar: [celula_madre_mesenquimal, celula_osteoprogenitora, preosteoblasto, senal_runx2, senal_osterix]
      resaltar: [senal_osterix, preosteoblasto]
      animacion: "senal_runx2 enciende senal_osterix con una flecha; el preosteoblasto intensifica la secreción de matriz."
  - id: paso_osteoblasto
    titulo: "El osteoblasto activo"
    texto: "El osteoblasto es cúbico, con mucho retículo rugoso, y secreta el osteoide. Expresa fosfatasa alcalina, osteocalcina y colágeno tipo I. También expresa RANKL y OPG, con los que se comunica con el linaje del osteoclasto."
    cambia_escena:
      mostrar: [celula_madre_mesenquimal, celula_osteoprogenitora, preosteoblasto, osteoblasto]
      resaltar: [osteoblasto]
      animacion: "El preosteoblasto se vuelve cúbico y libera gotas de osteoide hacia la superficie ósea."
  - id: paso_destinos
    titulo: "Tres destinos del osteoblasto"
    texto: "Al terminar de formar hueso, el osteoblasto sigue uno de tres caminos. Puede quedar atrapado en la matriz y hacerse osteocito, aplanarse como célula de revestimiento o morir por apoptosis. Se estima que entre 50 y 70 % mueren [verificar]."
    cambia_escena:
      mostrar: [osteoblasto, osteocito, celula_de_revestimiento, destino_apoptosis]
      resaltar: [osteocito, celula_de_revestimiento, destino_apoptosis]
      animacion: "Del osteoblasto salen tres flechas que se iluminan una por una hacia osteocito, celula_de_revestimiento y destino_apoptosis."
```

##### Actividad m2_multicapa_osteoblasto

```yaml
tipo: multicapa
titulo: "Dentro de un osteoblasto activo"
instrucciones: "Toca cada parte del dibujo para leer qué es y qué hace. Visita las ocho capas marcadas con un punto para completar la actividad. Con teclado: Tab pasa de una capa a otra y Enter la abre. Nada depende de pasar el mouse por encima."
obligatoria: true
puntaje_max: 20
concepto: "osteoblasto_funciones"
retroalimentacion:
  acierto: "Bien. El osteoblasto sintetiza el osteoide (colágeno tipo I), regula la mineralización con la fosfatasa alcalina y la osteocalcina, y controla al osteoclasto con RANKL y OPG. Su vecina de revestimiento es un osteoblasto en reposo."
  error: "Faltan capas requeridas. Revisa las que no aparecen como visitadas; las clave son el osteoide, la fosfatasa alcalina, la osteocalcina, RANKL y OPG, y la célula de revestimiento vecina."
svg: m2_osteoblasto_activo
modo: explorar
capas:
  - id: nucleo_osteoblasto
    etiqueta: "Núcleo"
    descripcion: "Grande y ubicado en el polo de la célula más alejado del hueso. Aquí actúan RUNX2 y osterix, que mantienen encendidos los genes de la matriz."
  - id: reticulo_endoplasmico_rugoso
    etiqueta: "Retículo endoplasmático rugoso"
    descripcion: "Muy abundante: sintetiza las cadenas de procolágeno tipo I y otras proteínas de la matriz. Por eso el citoplasma se tiñe con colorantes básicos (basofilia)."
  - id: aparato_golgi
    etiqueta: "Aparato de Golgi"
    descripcion: "Bien desarrollado, junto al núcleo. Modifica las proteínas de la matriz y las empaqueta en vesículas de secreción."
  - id: vesiculas_secrecion
    etiqueta: "Vesículas de secreción"
    descripcion: "Llevan procolágeno y otras proteínas hacia la membrana en contacto con el hueso, donde se liberan. Fuera de la célula, el procolágeno se procesa y se ensambla en fibras de colágeno tipo I."
  - id: osteoide
    etiqueta: "Osteoide"
    descripcion: "Matriz orgánica recién secretada, aún sin mineralizar, entre el osteoblasto y el hueso mineralizado. Aproximadamente 90 % de su parte orgánica es colágeno tipo I [verificar]."
  - id: fosfatasa_alcalina
    etiqueta: "Fosfatasa alcalina"
    descripcion: "Enzima anclada a la membrana del osteoblasto y a las vesículas de la matriz. Elimina el pirofosfato, que inhibe la mineralización, y aporta fosfato. Su forma ósea en sangre es un marcador de formación."
  - id: osteocalcina
    etiqueta: "Osteocalcina"
    descripcion: "Una de las proteínas no colágenas más abundantes de la matriz. Se une a la hidroxiapatita y aparece en la etapa tardía del osteoblasto; su nivel en sangre indica actividad osteoblástica."
  - id: ligandos_rankl_opg
    etiqueta: "RANKL y OPG"
    descripcion: "El osteoblasto muestra RANKL en su membrana y secreta OPG. RANKL activa el receptor RANK del precursor del osteoclasto; OPG captura RANKL y lo bloquea. La proporción entre ambos regula la resorción."
  - id: uniones_comunicantes
    etiqueta: "Uniones comunicantes"
    descripcion: "Comunican a los osteoblastos entre sí y con las células de revestimiento y los osteocitos vecinos, y coordinan su actividad."
  - id: frente_mineralizacion
    etiqueta: "Frente de mineralización"
    descripcion: "Límite entre el osteoide y el hueso mineralizado. Allí se depositan los cristales de hidroxiapatita (módulo 4)."
  - id: hueso_mineralizado
    etiqueta: "Hueso mineralizado"
    descripcion: "Matriz ya endurecida por hidroxiapatita, que sostiene la capa de osteoide y de osteoblastos."
  - id: celula_revestimiento
    etiqueta: "Célula de revestimiento óseo"
    descripcion: "Célula plana y alargada, con poco citoplasma, que cubre superficies sin formación ni resorción. Es un osteoblasto en reposo que puede reactivarse."
requeridas: [nucleo_osteoblasto, reticulo_endoplasmico_rugoso, vesiculas_secrecion, osteoide, fosfatasa_alcalina, osteocalcina, ligandos_rankl_opg, celula_revestimiento]
```

### Seccion 2.3: El osteocito, sensor del hueso (id "m2_3_osteocito")

#### Contenido

Los osteocitos son osteoblastos que quedaron atrapados en la matriz que ellos mismos formaron. Son las células más abundantes del hueso adulto: aproximadamente 90 a 95 % [verificar]. El resto son osteoblastos, células de revestimiento y osteoclastos.

No están dormidos. Forman una red que vigila el hueso y coordina a las demás células.

**Cómo está construido**

Al quedar atrapado, el osteoblasto emite prolongaciones, toma forma estrellada y reduce su retículo y su Golgi. Vive en una cavidad de la matriz y se comunica con sus vecinos a través de conductos finos.

| Estructura | Qué es | Función |
|---|---|---|
| Laguna | Cavidad de la matriz mineralizada | Aloja el cuerpo del osteocito |
| Canalículo | Conducto fino que atraviesa la matriz | Aloja una dendrita y un líquido; conecta lagunas |
| Dendrita | Prolongación larga y delgada del osteocito | Contacta con otros osteocitos y con células de la superficie |
| Unión comunicante | Canal entre células vecinas, formado sobre todo por conexina 43 | Deja pasar iones y moléculas pequeñas |

El conjunto de lagunas, canalículos y dendritas es la **red lacuno-canalicular**. Llega hasta la superficie del hueso y hasta los vasos sanguíneos.

> Recuerda: Laguna es el espacio del cuerpo, canalículo es el conducto y dendrita es la prolongación de la célula que viaja por el conducto.

**Qué hace el osteocito**

- **Percibe la carga mecánica.** Se propone que el flujo del líquido en los canalículos le informa cuánta fuerza recibe el hueso. En la mandíbula, la masticación y el movimiento dentario cargan al hueso alveolar y al cuerpo: allí los osteocitos traducen esa carga en señales de formación o de resorción. El módulo 3 lo desarrolla.
- **Frena la formación con esclerostina.** La esclerostina se une a LRP5 y LRP6 y bloquea la vía Wnt/β-catenina en los osteoblastos.
- **Regula la resorción.** Produce RANKL, y en ratones adultos es una fuente importante de RANKL en el remodelado [verificar]. Cuando un osteocito muere por apoptosis, se asocia con la llegada de osteoclastos.
- **Regula el fosfato.** Produce FGF23, una hormona que controla la excreción renal de fosfato.

> Dato: La carga mecánica reduce la producción de esclerostina y esto libera la formación de hueso. Por eso el hueso responde al uso (profundización para posgrado).

> Clinico: Si la esclerostina falta o está muy reducida, como en la esclerosteosis (mutaciones de SOST) y en la enfermedad de van Buchem (deleción de un potenciador de SOST), el hueso se forma en exceso: hay sobrecrecimiento del cráneo y de la mandíbula. Al revés, el romosozumab, un anticuerpo que bloquea la esclerostina, se usa para tratar la osteoporosis.

> Atencion: «Osteocito» no significa célula inactiva ni muerta. Es una célula viva, conectada y con funciones endocrinas y de señalización.

#### Actividades

##### Actividad m2_multicapa_osteocito

```yaml
tipo: multicapa
titulo: "El osteocito en su laguna"
instrucciones: "Toca cada parte del dibujo para leer qué es y qué hace. Visita las siete capas marcadas con un punto para completar la actividad. Con teclado: Tab pasa de una capa a otra y Enter la abre. Nada depende de pasar el mouse por encima."
obligatoria: true
puntaje_max: 20
concepto: "osteocito_red"
retroalimentacion:
  acierto: "Bien. El osteocito vive en una laguna y se comunica por dendritas dentro de canalículos, con uniones comunicantes. Desde ahí detecta la carga y secreta esclerostina."
  error: "Faltan capas requeridas. Revisa la laguna, los canalículos, las dendritas, las uniones comunicantes, la esclerostina y las células de la superficie."
svg: m2_osteocito_lagunar
modo: explorar
capas:
  - id: cuerpo_osteocito
    etiqueta: "Cuerpo del osteocito"
    descripcion: "Célula de forma estrellada, con núcleo grande y citoplasma escaso. Viene de un osteoblasto que quedó atrapado en el osteoide que secretó. Tiene menos retículo y Golgi que el osteoblasto."
  - id: nucleo_osteocito
    etiqueta: "Núcleo"
    descripcion: "Ocupa gran parte del cuerpo celular. El osteocito mantiene actividad génica: por ejemplo, produce esclerostina y RANKL."
  - id: laguna_osteocitica
    etiqueta: "Laguna"
    descripcion: "Cavidad de la matriz mineralizada que aloja el cuerpo del osteocito. Su forma refleja la de la célula."
  - id: canaliculos
    etiqueta: "Canalículos"
    descripcion: "Conductos muy finos que salen de la laguna y atraviesan la matriz. Alojan las dendritas y un líquido, y conectan unas lagunas con otras."
  - id: dendritas
    etiqueta: "Dendritas"
    descripcion: "Prolongaciones largas y delgadas del osteocito. Contactan con otros osteocitos, células de revestimiento y osteoblastos, y forman la red lacuno-canalicular."
  - id: uniones_comunicantes
    etiqueta: "Uniones comunicantes"
    descripcion: "Canales formados sobre todo por conexina 43 en los puntos de contacto entre dendritas. Dejan pasar iones y moléculas pequeñas de una célula a otra."
  - id: liquido_lacunocanalicular
    etiqueta: "Líquido lacuno-canalicular"
    descripcion: "Líquido que ocupa el espacio entre la dendrita y la pared del canalículo. Se propone que la carga mecánica lo desplaza y que el osteocito detecta ese flujo (módulo 3)."
  - id: matriz_mineralizada
    etiqueta: "Matriz mineralizada"
    descripcion: "Hidroxiapatita y colágeno tipo I que rodean al osteocito. Los nutrientes llegan a las células profundas por la red de canalículos."
  - id: esclerostina
    etiqueta: "Esclerostina"
    descripcion: "Proteína que secretan los osteocitos maduros. Se une a los correceptores LRP5 y LRP6 y frena la vía Wnt/β-catenina en los osteoblastos, con lo que se reduce la formación de hueso."
  - id: celulas_superficie
    etiqueta: "Osteoblastos y células de revestimiento"
    descripcion: "En la superficie, los extremos de las dendritas contactan con estas células. Así el osteocito puede influir en lo que ocurre en la superficie del hueso."
  - id: vaso_sanguineo
    etiqueta: "Vaso sanguíneo"
    descripcion: "Los vasos aportan oxígeno y nutrientes. El osteocito recibe su suministro por difusión a través de la red de canalículos."
requeridas: [cuerpo_osteocito, laguna_osteocitica, canaliculos, dendritas, uniones_comunicantes, esclerostina, celulas_superficie]
```

##### Actividad m2_quiz_osteocito

```yaml
tipo: quiz
titulo: "Repaso rápido del osteocito"
instrucciones: "Responde tres preguntas y lee la explicación de cada una. Toca tu respuesta; con teclado, Tab hasta la opción y Enter. Esta actividad es de refuerzo: no bloquea el avance."
obligatoria: false
puntaje_max: 20
concepto: "osteocito_red"
retroalimentacion:
  acierto: "Muy bien. Ya distingues las estructuras del osteocito y su papel con la esclerostina."
  parcial: "Vas bien; repasa qué es cada estructura del osteocito y qué hace la esclerostina."
  error: "Repasa la sección: el osteocito es la célula más abundante, vive en una laguna, extiende dendritas por canalículos y secreta esclerostina."
preguntas:
  - id: m2_qs_1
    formato: opcion_multiple
    enunciado: "¿Qué proporción aproximada de las células del hueso adulto son osteocitos?"
    opciones:
      - id: a
        texto: "Menos de 5 %"
      - id: b
        texto: "Cerca de 50 %"
      - id: c
        texto: "Entre 90 y 95 %"
      - id: d
        texto: "Exactamente 100 %"
    correcta: c
    explicacion: "Los osteocitos son la gran mayoría de las células del hueso adulto: aproximadamente 90 a 95 %. Osteoblastos, células de revestimiento y osteoclastos suman el resto."
    dificultad: 1
    concepto: "osteocito_red"
  - id: m2_qs_2
    formato: opcion_multiple
    enunciado: "¿Cuál es el efecto principal de la esclerostina secretada por los osteocitos?"
    opciones:
      - id: a
        texto: "Frena la vía Wnt/β-catenina en los osteoblastos y reduce la formación ósea"
      - id: b
        texto: "Activa el receptor RANK y favorece la fusión de los precursores de osteoclastos"
      - id: c
        texto: "Aumenta la síntesis de colágeno tipo I y la actividad de los osteoblastos"
      - id: d
        texto: "Se une a RANKL, lo neutraliza e impide que active al receptor RANK"
    correcta: a
    explicacion: "La esclerostina se une a LRP5 y LRP6 y bloquea Wnt/β-catenina, un freno de la formación ósea. Neutralizar RANKL es función de la OPG, no de la esclerostina."
    dificultad: 2
    concepto: "esclerostina"
  - id: m2_qs_3
    formato: verdadero_falso
    enunciado: "El cuerpo del osteocito se aloja en un canalículo y sus dendritas se alojan en la laguna."
    opciones:
      - id: verdadero
        texto: "Verdadero"
      - id: falso
        texto: "Falso"
    correcta: falso
    explicacion: "Está al revés: el cuerpo del osteocito ocupa la laguna y las dendritas viajan por los canalículos."
    dificultad: 1
    concepto: "osteocito_red"
```

### Seccion 2.4: El osteoclasto, célula que reabsorbe (id "m2_4_osteoclasto")

#### Contenido

El osteoclasto es la célula que reabsorbe hueso. No viene del mesénquima: pertenece a la línea hematopoyética, la misma que forma las células de la sangre.

**De monocito a osteoclasto**

La secuencia es: célula madre hematopoyética, progenitor mieloide, precursor monocito-macrófago, preosteoclasto y osteoclasto multinucleado. Dos señales de los osteoblastos y de otras células del estroma dirigen su formación, y una tercera la frena:

- **M-CSF** se une al receptor c-Fms del precursor. Mantiene vivos a los precursores, los hace dividirse y les induce el receptor RANK.
- **RANKL** se une al receptor RANK del preosteoclasto. Activa las vías NF-κB y NFATc1, y con ellas la diferenciación, la fusión y la activación.
- **OPG** es un receptor señuelo soluble. Se une a RANKL y le impide llegar a RANK. La proporción RANKL/OPG decide cuánto hueso se reabsorbe.

> Recuerda: M-CSF permite que el precursor sobreviva y exprese RANK. RANKL lo convierte en osteoclasto. OPG frena a RANKL.

> Dato: RANKL lo producen osteoblastos, células del estroma, osteocitos y células del ligamento periodontal. NFATc1 se considera el regulador maestro de la osteoclastogénesis (profundización para posgrado).

**Un gigante multinucleado y polarizado**

El osteoclasto se forma por la fusión de varios preosteoclastos, por eso tiene varios núcleos [verificar]. Cuando se activa, se polariza:

- La **zona clara** es un anillo de citoplasma rico en actina que se adhiere a la matriz y sella el espacio de resorción.
- Dentro del anillo, la membrana forma pliegues profundos: el **borde festoneado**, por donde salen protones y enzimas.
- En el hueso queda una depresión, la **laguna de Howship**.

**Cómo reabsorbe: primero el mineral, después el colágeno**

1. Se adhiere a la matriz y sella con la zona clara.
2. Acidifica el espacio sellado y disuelve la hidroxiapatita.
3. Digiere el colágeno tipo I que queda expuesto.

| Componente | Dónde está | Qué hace |
|---|---|---|
| Anhidrasa carbónica II | Citoplasma | Genera H+ y bicarbonato a partir de CO2 y agua |
| Bomba de protones (V-ATPasa) | Borde festoneado | Bombea H+ al espacio sellado; el pH baja a aproximadamente 4,5 [verificar] |
| Canal de cloruro (ClC-7) | Borde festoneado | Acompaña a los protones con Cl- y mantiene la neutralidad eléctrica |
| Catepsina K | Espacio sellado | Corta el colágeno tipo I expuesto |
| TRAP (fosfatasa ácida resistente al tartrato) | Osteoclasto | Marcador histoquímico de osteoclastos |

> Clinico: Si el osteoclasto falla, el hueso se vuelve denso pero frágil (osteopetrosis). La deficiencia de anhidrasa carbónica II causa osteopetrosis con acidosis tubular renal. La deficiencia de catepsina K causa picnodisostosis, que incluye mandíbula pequeña con ángulo obtuso. Sin osteoclastos tampoco erupcionan los dientes, porque el hueso que los cubre no se reabsorbe.

> Clinico: Los bisfosfonatos y el denosumab, un anticuerpo contra RANKL, reducen la actividad de los osteoclastos. Su uso se asocia a la osteonecrosis de los maxilares, que aparece con más frecuencia en la mandíbula que en el maxilar.

> Atencion: Reabsorber no es «destruir». La resorción es la mitad del remodelado y libera factores del hueso que después estimulan la formación (módulo 5).

#### Actividades

##### Actividad m2_multicapa_osteoclasto

```yaml
tipo: multicapa
titulo: "Identifica las partes del osteoclasto"
instrucciones: "Lee la pista y toca la parte del dibujo que le corresponde. Si aciertas, se revela su nombre y su explicación; cada error resta una parte del puntaje. Con teclado: Tab recorre las capas y Enter elige la enfocada. Nada depende del mouse."
obligatoria: true
puntaje_max: 20
concepto: "resorcion_osteoclastica"
retroalimentacion:
  acierto: "Bien. El osteoclasto se sella con la zona clara, acidifica con la bomba de protones y la anhidrasa carbónica II, y digiere el colágeno con catepsina K."
  parcial: "Vas bien, pero algunas partes no coinciden con su pista. Repasa la tabla: primero el ácido disuelve el mineral y después la catepsina K digiere el colágeno."
  error: "Alguna parte no coincide con su pista. Repasa la tabla de la sección: primero el mineral se disuelve con ácido y después el colágeno se digiere con catepsina K."
svg: m2_osteoclasto_resorcion
modo: identificar
capas:
  - id: nucleos_multiples
    etiqueta: "Núcleos múltiples"
    pista: "Varios centros de información genética dentro de una misma célula gigante."
    descripcion: "Cada núcleo procede de un precursor mononuclear del linaje monocito-macrófago que se fusionó con otros; por eso la célula es gigante y multinucleada."
  - id: zona_clara
    etiqueta: "Zona clara"
    pista: "Anillo de la célula, sin orgánulos, que se pega al hueso y aísla el espacio donde ocurre la resorción."
    descripcion: "Anillo de citoplasma rico en filamentos de actina que se adhiere a la matriz mediante integrinas y sella el espacio de resorción. También se llama zona de sellado."
  - id: borde_festoneado
    etiqueta: "Borde festoneado"
    pista: "Repliegues profundos de la membrana, dirigidos hacia el hueso, dentro del anillo de sellado."
    descripcion: "Aumentan la superficie por la que salen protones y enzimas y entran los productos de degradación. También se llama borde rugoso."
  - id: bomba_protones
    etiqueta: "Bomba de protones (V-ATPasa)"
    pista: "Complejo de membrana que gasta ATP para llevar H+ al espacio sellado."
    descripcion: "Acidifica el espacio hasta un pH aproximado de 4,5 [verificar] y así disuelve la hidroxiapatita. Se ubica en el borde festoneado."
  - id: canal_cloruro
    etiqueta: "Canal de cloruro (ClC-7)"
    pista: "Canal que acompaña a los protones con iones Cl- para mantener la neutralidad eléctrica."
    descripcion: "Permite que se forme ácido clorhídrico en el espacio sellado; se ubica en el borde festoneado."
  - id: anhidrasa_carbonica_ii
    etiqueta: "Anhidrasa carbónica II"
    pista: "Enzima del citoplasma que convierte CO2 y agua en ácido carbónico, fuente de los protones que se bombean."
    descripcion: "El ácido carbónico se disocia en H+ y bicarbonato. Su deficiencia causa osteopetrosis con acidosis tubular renal."
  - id: catepsina_k
    etiqueta: "Catepsina K"
    pista: "Proteasa que se secreta al espacio ácido y corta la proteína principal de la matriz orgánica."
    descripcion: "Corta el colágeno tipo I que queda expuesto cuando el mineral se disuelve. Su deficiencia causa picnodisostosis."
  - id: trap
    etiqueta: "Fosfatasa ácida resistente al tartrato (TRAP)"
    pista: "Enzima característica de estas células, detectable con una tinción histoquímica, que sobrevive a un inhibidor que apaga a las demás de su familia."
    descripcion: "Permite reconocer a los osteoclastos en cortes histológicos; su isoforma 5b en sangre se usa como marcador de resorción."
  - id: laguna_howship
    etiqueta: "Laguna de Howship"
    pista: "Depresión superficial excavada en el hueso, justo debajo de la célula que reabsorbe."
    descripcion: "La célula se apoya dentro de ella. Después de la resorción, esa superficie excavada recibe a los osteoblastos que forman hueso nuevo (módulo 5)."
  - id: matriz_mineralizada
    etiqueta: "Matriz mineralizada"
    pista: "Hueso que va a ser reabsorbido: cristales sobre una trama de colágeno."
    descripcion: "Cristales de hidroxiapatita sobre una trama de colágeno tipo I. El ácido disuelve los cristales y después la catepsina K digiere el colágeno."
  - id: receptores_rank_cfms
    etiqueta: "Receptores RANK y c-Fms"
    pista: "Proteínas de la membrana que reciben las señales de las células formadoras de hueso."
    descripcion: "Reciben RANKL y M-CSF; de ellas depende que el precursor se diferencie, se fusione y se active. La OPG puede bloquear la señal de RANKL antes de que llegue a RANK."
requeridas: [nucleos_multiples, zona_clara, borde_festoneado, bomba_protones, anhidrasa_carbonica_ii, catepsina_k, trap, laguna_howship, receptores_rank_cfms]
```

##### Actividad m2_arrastre_senales_linajes

```yaml
tipo: arrastre-molecular
titulo: "Lleva cada señal a su lugar de acción"
instrucciones: "Lleva cada señal hasta la etapa o el receptor donde actúa y observa el efecto. Arrastra con el dedo, o toca la molécula y luego el lugar; con teclado, Tab y Enter para tomar y soltar. Los fallos restan puntaje y hay moléculas que no encajan en ningún lugar."
obligatoria: true
puntaje_max: 40
concepto: "senales_osteoclastogenicas"
retroalimentacion:
  acierto: "Muy bien. RUNX2 y osterix actúan dentro del núcleo, en ese orden, en la línea osteoblástica; M-CSF y RANKL actúan sobre receptores de membrana del linaje osteoclástico; y OPG intercepta a RANKL."
  parcial: "Casi. Algunas señales están bien ubicadas. Recuerda: RUNX2 y osterix actúan en el núcleo del linaje osteoblástico; M-CSF se une a c-Fms, RANKL a RANK y OPG a RANKL."
  error: "Alguna molécula no está en su lugar. Recuerda: los factores de transcripción (RUNX2, osterix) actúan en una etapa del osteoblasto; M-CSF se une a c-Fms; RANKL se une a RANK; OPG se une a RANKL."
ilustracion: m2_arbol_linajes_oseos
escena: "Árbol de dos linajes. A la izquierda, el osteoblástico: célula madre mesenquimal, preosteoblasto con RUNX2 sin osterix y osteoblasto con un ligando expuesto. A la derecha, el osteoclástico: precursor con c-Fms y preosteoclasto con RANK. Los acoples tienen contorno punteado; abajo, siete moléculas."
moleculas:
  - id: mol_runx2
    nombre: "RUNX2"
    descripcion: "Factor de transcripción (Cbfa1) que compromete a la célula mesenquimal con el linaje osteoblástico."
  - id: mol_osterix
    nombre: "Osterix (Sp7)"
    descripcion: "Factor de transcripción que actúa después de RUNX2 y depende de él; necesario para formar osteoblastos funcionales."
  - id: mol_mcsf
    nombre: "M-CSF"
    descripcion: "Factor estimulante de colonias de macrófagos, producido por osteoblastos y células del estroma."
  - id: mol_rankl
    nombre: "RANKL"
    descripcion: "Ligando de la familia del TNF producido por osteoblastos, células del estroma y osteocitos; activa al receptor RANK."
  - id: mol_opg
    nombre: "OPG (osteoprotegerina)"
    descripcion: "Receptor señuelo soluble producido por osteoblastos y células del estroma."
  - id: mol_catepsina_k
    nombre: "Catepsina K"
    descripcion: "Proteasa de cisteína del osteoclasto maduro."
  - id: mol_osteocalcina
    nombre: "Osteocalcina"
    descripcion: "Proteína de la matriz que secreta el osteoblasto maduro."
receptores:
  - id: rec_etapa_mesenquimal
    nombre: "Etapa 1: célula mesenquimal sin factores osteoblásticos"
    descripcion: "Célula madre mesenquimal que todavía no expresa RUNX2 ni osterix; su núcleo está gris."
    capa: zona_etapa_mesenquimal
  - id: rec_etapa_preosteoblasto
    nombre: "Etapa 2: preosteoblasto con RUNX2 y sin osterix"
    descripcion: "Célula ya comprometida con el linaje óseo que expresa RUNX2 pero aún no expresa osterix."
    capa: zona_etapa_preosteoblasto
  - id: rec_cfms
    nombre: "Receptor c-Fms del precursor monocito-macrófago"
    descripcion: "Receptor de membrana del precursor hematopoyético, todavía sin RANK."
    capa: zona_receptor_cfms
  - id: rec_rank
    nombre: "Receptor RANK del preosteoclasto"
    descripcion: "Receptor de membrana del preosteoclasto mononuclear."
    capa: zona_receptor_rank
  - id: rec_ligando_osteoblasto
    nombre: "Ligando expuesto por el osteoblasto (diana de OPG)"
    descripcion: "Molécula de la superficie del osteoblasto que activa al receptor RANK del preosteoclasto."
    capa: zona_ligando_osteoblasto
pares:
  - molecula: mol_runx2
    receptor: rec_etapa_mesenquimal
    efecto:
      titulo: "Compromiso con el linaje óseo"
      descripcion: "RUNX2 se activa y la célula madre mesenquimal se convierte en osteoprogenitora comprometida. RUNX2 enciende genes osteoblásticos y el gen de osterix. Sin RUNX2 no se forman osteoblastos maduros."
      que_se_anima: "senal_runx2 entra al núcleo de celula_madre_mesenquimal; el núcleo pasa de gris a color, la célula se alarga y cambia (fundido) a celula_osteoprogenitora."
  - molecula: mol_osterix
    receptor: rec_etapa_preosteoblasto
    efecto:
      titulo: "De preosteoblasto a osteoblasto"
      descripcion: "Osterix, que actúa aguas abajo de RUNX2, lleva al preosteoblasto a completar su diferenciación y a expresar genes de la matriz (colágeno tipo I, osteopontina, osteocalcina). Así se convierte en osteoblasto que secreta osteoide. Sin osterix quedan precursores con RUNX2 y no se forma hueso."
      que_se_anima: "senal_osterix entra al núcleo de preosteoblasto; la célula se vuelve cúbica (fundido a osteoblasto), el retículo rugoso se engruesa y se intensifica la secreción de osteoide hacia la superficie ósea."
  - molecula: mol_mcsf
    receptor: rec_cfms
    efecto:
      titulo: "Supervivencia y proliferación del precursor"
      descripcion: "M-CSF se une a c-Fms. El precursor monocito-macrófago sobrevive, se divide y expresa el receptor RANK, con lo que queda listo para responder a RANKL."
      que_se_anima: "senal_mcsf se acopla a zona_receptor_cfms; precursor_monocito_macrofago se divide en dos copias y aparece el símbolo del receptor RANK en su membrana."
  - molecula: mol_rankl
    receptor: rec_rank
    efecto:
      titulo: "Diferenciación, fusión y activación"
      descripcion: "RANKL se une a RANK y activa las vías NF-κB y NFATc1. Los preosteoclastos se diferencian, se fusionan en una célula multinucleada y se activan. Esto ocurre solo si el precursor ya tiene RANK, lo que depende de M-CSF."
      que_se_anima: "senal_rankl se acopla a zona_receptor_rank; dos o tres copias de preosteoclasto se acercan y se fusionan (fundido a osteoclasto) con varios núcleos visibles."
  - molecula: mol_opg
    receptor: rec_ligando_osteoblasto
    efecto:
      titulo: "Freno de la osteoclastogénesis"
      descripcion: "OPG se une a RANKL y lo neutraliza. RANKL ya no llega a RANK: el preosteoclasto no se fusiona ni se activa y la resorción disminuye. La proporción RANKL/OPG regula el equilibrio de la resorción."
      que_se_anima: "senal_opg cubre a senal_rankl en zona_ligando_osteoblasto; la flecha hacia el receptor RANK se corta con una cruz y el preosteoclasto vuelve a gris sin fusionarse."
distractores:
  - molecula: mol_catepsina_k
    motivo: "La catepsina K es una enzima del osteoclasto ya maduro que degrada el colágeno tipo I. Es un producto de la célula diferenciada, no una señal que induzca la diferenciación, y no se une a ninguno de estos lugares."
  - molecula: mol_osteocalcina
    motivo: "La osteocalcina es una proteína de la matriz que secreta el osteoblasto maduro. Es un marcador de la diferenciación, no un factor que la dirija, y no actúa en ninguno de estos lugares."
```

##### Actividad m2_quiz_linajes

```yaml
tipo: quiz
titulo: "Linajes y señales de las células óseas"
instrucciones: "Responde cada pregunta y lee la explicación. En Ordenar pasos, toca los pasos en su orden (vuelve a tocar uno para quitarlo) y pulsa Comprobar. En opción múltiple, toca tu respuesta. Con teclado: Tab hasta el paso o la opción y Enter."
obligatoria: true
puntaje_max: 40
concepto: "linaje_osteoclastico"
retroalimentacion:
  acierto: "Muy bien. Dominas los linajes: la ruta mesenquimal con RUNX2 y osterix, la ruta hematopoyética con M-CSF y RANKL, y el freno de OPG."
  parcial: "Vas bien; repasa el orden de cada linaje y qué hace cada señal: RUNX2, osterix, M-CSF, RANKL y OPG."
  error: "Repasa las secuencias: mesenquimal (célula madre, osteoprogenitora, preosteoblasto, osteoblasto, osteocito) y hematopoyética (célula madre, progenitor mieloide, precursor monocito-macrófago, preosteoclasto, osteoclasto)."
preguntas:
  - id: m2_ql_1
    formato: ordenar_pasos
    enunciado: "Ordena las etapas del linaje osteoblástico, de la primera a la última."
    pasos:
      - id: p_osteoblasto
        texto: "Osteoblasto"
      - id: p_madre
        texto: "Célula madre mesenquimal"
      - id: p_osteocito
        texto: "Osteocito"
      - id: p_preosteoblasto
        texto: "Preosteoblasto"
      - id: p_progenitora
        texto: "Célula osteoprogenitora"
    correcta: [p_madre, p_progenitora, p_preosteoblasto, p_osteoblasto, p_osteocito]
    explicacion: "La célula madre mesenquimal se compromete (osteoprogenitora), se prepara (preosteoblasto), forma matriz (osteoblasto) y algunos osteoblastos quedan atrapados como osteocitos."
    dificultad: 1
    concepto: "linaje_osteoblastico"
  - id: m2_ql_2
    formato: ordenar_pasos
    enunciado: "Ordena las etapas del linaje del osteoclasto, de la primera a la última."
    pasos:
      - id: p_osteoclasto
        texto: "Osteoclasto multinucleado"
      - id: p_preosteoclasto
        texto: "Preosteoclasto mononuclear con RANK"
      - id: p_hematopoyetica
        texto: "Célula madre hematopoyética"
      - id: p_monocito
        texto: "Precursor monocito-macrófago"
      - id: p_mieloide
        texto: "Progenitor mieloide"
    correcta: [p_hematopoyetica, p_mieloide, p_monocito, p_preosteoclasto, p_osteoclasto]
    explicacion: "El osteoclasto viene de la médula ósea: célula madre hematopoyética, progenitor mieloide, precursor monocito-macrófago y preosteoclasto. La fusión de preosteoclastos da el osteoclasto multinucleado."
    dificultad: 2
    concepto: "linaje_osteoclastico"
  - id: m2_ql_3
    formato: ordenar_pasos
    enunciado: "Ordena los eventos moleculares de la formación de hueso, del más temprano al más tardío."
    pasos:
      - id: p_osteocalcina
        texto: "Se expresa osteocalcina durante la mineralización"
      - id: p_osterix
        texto: "Se activa osterix"
      - id: p_osteoide
        texto: "El osteoblasto maduro secreta osteoide"
      - id: p_runx2
        texto: "Se activa RUNX2"
    correcta: [p_runx2, p_osterix, p_osteoide, p_osteocalcina]
    explicacion: "RUNX2 se activa primero y compromete a la célula; osterix actúa después, aguas abajo de RUNX2, y completa la diferenciación del osteoblasto. El osteoblasto maduro secreta osteoide, y la osteocalcina es un marcador tardío asociado a la mineralización."
    dificultad: 2
    concepto: "factores_transcripcion"
  - id: m2_ql_4
    formato: ordenar_pasos
    enunciado: "Ordena la señalización que forma un osteoclasto, de la primera a la última."
    pasos:
      - id: p_fusion
        texto: "Los preosteoclastos se fusionan y forman una célula multinucleada"
      - id: p_rankl
        texto: "RANKL se une a RANK del preosteoclasto"
      - id: p_adhesion
        texto: "El osteoclasto multinucleado se activa, se polariza y forma la zona clara"
      - id: p_mcsf
        texto: "M-CSF se une a c-Fms y el precursor sobrevive y expresa RANK"
    correcta: [p_mcsf, p_rankl, p_fusion, p_adhesion]
    explicacion: "M-CSF va primero: mantiene vivo al precursor y le induce RANK. Luego RANKL activa la diferenciación, los preosteoclastos se fusionan y el osteoclasto se adhiere al hueso y se activa."
    dificultad: 3
    concepto: "senales_osteoclastogenicas"
  - id: m2_ql_5
    formato: opcion_multiple
    enunciado: "¿Qué efecto tiene la osteoprotegerina (OPG)?"
    opciones:
      - id: a
        texto: "Se une a c-Fms y bloquea la acción de M-CSF"
      - id: b
        texto: "Activa RANK y promueve la fusión de los preosteoclastos"
      - id: c
        texto: "Se une a RANKL y le impide activar el receptor RANK"
      - id: d
        texto: "Inhibe la anhidrasa carbónica II del osteoclasto maduro"
    correcta: c
    explicacion: "La OPG es un receptor señuelo soluble: captura RANKL y le impide unirse a RANK. Así frena la formación y la activación de osteoclastos."
    dificultad: 2
    concepto: "senales_osteoclastogenicas"
  - id: m2_ql_6
    formato: opcion_multiple
    enunciado: "Un niño tiene clavículas hipoplásicas, fontanelas que cierran tarde y dientes que erupcionan con retraso. ¿Qué factor de transcripción está alterado?"
    opciones:
      - id: a
        texto: "NFATc1, regulador maestro de la osteoclastogénesis"
      - id: b
        texto: "RUNX2, necesario para el compromiso con el linaje óseo"
      - id: c
        texto: "Osterix, necesario solo para la etapa final del osteoblasto"
      - id: d
        texto: "Esclerostina, que frena la vía Wnt en los osteoblastos"
    correcta: b
    explicacion: "Es el cuadro de la displasia cleidocraneal, por reducción de RUNX2 funcional. Sin RUNX2 suficiente, el linaje óseo no se compromete bien. La falta de esclerostina produce lo contrario: exceso de hueso."
    dificultad: 3
    concepto: "factores_transcripcion"
```

### Seccion 2.5: El ligamento periodontal y el hueso alveolar (id "m2_5_ligamento_periodontal")

#### Contenido

El diente no toca el hueso. Entre la raíz y el hueso alveolar hay un tejido conectivo fibroso, el **ligamento periodontal**, de aproximadamente 0,15 a 0,4 mm de ancho [verificar]. Los fibroblastos, cementoblastos y progenitores del ligamento derivan del folículo dental, es decir, del ectomesénquima de la cresta neural: la misma familia celular de la mandíbula. Los osteoclastos vienen de la médula ósea y los restos de Malassez son epiteliales.

**Quién vive en el ligamento periodontal**

| Célula | Qué hace | Relación con el hueso |
|---|---|---|
| Fibroblastos periodontales | Sintetizan y renuevan el colágeno; son la población más abundante | Expresan RANKL y OPG; algunos son progenitores |
| Células progenitoras perivasculares | Reponen fibroblastos, cementoblastos y osteoblastos | Fuente de osteoblastos para el hueso alveolar |
| Cementoblastos | Depositan el cemento sobre la raíz | Forman el cemento donde se insertan las fibras |
| Osteoblastos | Se alinean en la cara del hueso alveolar que mira al ligamento | Forman hueso alveolar |
| Osteoclastos | Aparecen en la superficie del hueso cuando hay resorción | Reabsorben el hueso alveolar |
| Restos epiteliales de Malassez | Cúmulos de células epiteliales cerca del cemento; remanentes de la vaina epitelial de Hertwig | No son células óseas |

**Fibras de Sharpey y hueso alveolar propio**

Las fibras principales de colágeno del ligamento quedan incluidas, por sus extremos, en el cemento y en el hueso alveolar. Esos extremos son las fibras de Sharpey. Anclan el diente al alvéolo y transmiten al hueso las fuerzas de la masticación.

El **hueso alveolar propio** es la lámina delgada de hueso compacto que reviste el alvéolo. Recibe las fibras de Sharpey y por eso se llama también hueso fasciculado. En las radiografías se ve como la lámina dura.

> Recuerda: El hueso alveolar depende del diente. Se forma con la erupción y, si el diente se pierde, se reabsorbe de forma progresiva, más rápido en los primeros meses.

**Fuerza y remodelado: el caso de la ortodoncia**

Cuando una fuerza empuja un diente, el ligamento se comprime en un lado y se estira en el otro:

- **Lado de presión:** aumenta RANKL, se forman osteoclastos y el hueso alveolar se reabsorbe. Así se abre espacio.
- **Lado de tensión:** se estimula a los osteoblastos y se forma hueso.

El diente se desplaza a través del hueso porque uno de los lados se reabsorbe y el otro se forma.

> Dato: Las células del ligamento y los osteocitos detectan la deformación. Ese mecanismo se estudia en el módulo 3 (profundización para posgrado).

> Clinico: En la periodontitis, la inflamación aumenta la proporción RANKL/OPG y se pierde hueso alveolar. Es el mismo eje RANKL/OPG de la ortodoncia, pero activado por la inflamación y no por una fuerza controlada.

**Resumen del módulo**

| Célula | Origen | Función | Marcador o señal principal |
|---|---|---|---|
| Osteoprogenitora | Mesenquimal | Se divide y forma osteoblastos | RUNX2 |
| Osteoblasto | Mesenquimal | Forma el osteoide y regula la mineralización y a los osteoclastos | Osterix; colágeno tipo I, fosfatasa alcalina, osteocalcina; RANKL y OPG |
| Célula de revestimiento | Mesenquimal | Cubre la superficie en reposo y puede reactivarse | Célula aplanada |
| Osteocito | Mesenquimal | Percibe la carga y regula la formación y la resorción | Esclerostina |
| Osteoclasto | Hematopoyético | Reabsorbe hueso | M-CSF y RANKL inducen; TRAP y catepsina K lo identifican |

> Atencion: Que la mandíbula tenga origen en la cresta neural no cambia a sus osteoclastos: siguen viniendo de la médula ósea. Lo que cambia es el origen de las células formadoras.

#### Actividades

##### Actividad m2_multicapa_ligamento_periodontal

```yaml
tipo: exploracion-3d
titulo: "Recorre el ligamento periodontal"
instrucciones: "Gira el bloque con un dedo y acércalo con dos (en escritorio, arrastra con el ratón y usa la rueda): es la raíz de un diente cortada a lo largo en su alvéolo y empujada por una fuerza lateral. Toca cada parte para leer qué es y qué hace. Con teclado, Tab y Enter, o elige en la lista bajo el modelo (sirve también sin 3D). Visita al menos las nueve partes requeridas."
obligatoria: true
puntaje_max: 20
concepto: "ligamento_periodontal"
retroalimentacion:
  acierto: "Bien. Ubicaste las células del ligamento y del hueso alveolar, y entendiste qué ocurre en el lado de presión y en el lado de tensión."
  error: "Todavía te faltan partes por visitar. Repasa la tabla de células del ligamento y recuerda: presión, resorción por osteoclastos; tensión, formación por osteoblastos."
# 2026-10-18: pasa del dibujo SVG (m2_ligamento_periodontal, modo identificar) a un modelo 3D de la raíz en su
# alvéolo construido por código (la ilustración hecha con IA tenía errores). Mismas partes, etiquetas y requeridas;
# la exploración no tiene pistas: cada pista pasa al inicio de su descripción.
modelo: ligamento_periodontal
hotspots:
  - id: cemento_radicular
    etiqueta: "Cemento radicular"
    descripcion: "Tejido mineralizado que cubre la dentina de la raíz y recibe los extremos de las fibras que anclan el diente."
  - id: ligamento_periodontal
    etiqueta: "Ligamento periodontal"
    descripcion: "Tejido conectivo fibroso, muy celular y vascularizado, situado entre la raíz y el hueso. Mide aproximadamente entre 0,15 y 0,4 mm de ancho [verificar] y amortigua las fuerzas de la masticación. En el modelo está ensanchado para que se vean sus células."
  - id: fibras_sharpey
    etiqueta: "Fibras de Sharpey"
    descripcion: "Extremos de los haces de colágeno (las fibras principales del ligamento) que quedan incluidos en el cemento y en el hueso y anclan el diente. Transmiten al hueso alveolar las fuerzas de la masticación."
  - id: hueso_alveolar_propio
    etiqueta: "Hueso alveolar propio"
    descripcion: "Lámina delgada de hueso compacto que reviste el alvéolo y recibe las fibras de anclaje. También se llama hueso fasciculado. Está perforado por conductos vasculares y en la radiografía se ve como la lámina dura."
  - id: fibroblastos_periodontales
    etiqueta: "Fibroblastos periodontales"
    descripcion: "Células más abundantes del tejido fibroso situado entre la raíz y el hueso; renuevan su colágeno de forma continua. Además expresan RANKL y OPG, con lo que participan en el control de los osteoclastos. Algunos son progenitores."
  - id: celulas_progenitoras_perivasculares
    etiqueta: "Células progenitoras perivasculares"
    descripcion: "Células madre mesenquimales cercanas a los vasos que reponen fibroblastos, cementoblastos y osteoblastos."
  - id: cementoblastos
    etiqueta: "Cementoblastos"
    descripcion: "Células cúbicas sobre la superficie de la raíz que depositan el tejido mineralizado donde se insertan las fibras. Forman el cemento radicular. Derivan del folículo dental, es decir, del ectomesénquima."
  - id: osteoblastos_alveolares
    etiqueta: "Osteoblastos alveolares"
    descripcion: "Células formadoras de hueso alineadas en la cara del hueso que mira al tejido fibroso entre la raíz y el hueso. Forman hueso alveolar, sobre todo en el lado de tensión. Sus progenitores provienen de células perivasculares del ligamento."
  - id: osteoclastos_alveolares
    etiqueta: "Osteoclastos alveolares"
    descripcion: "Células gigantes multinucleadas que, cuando hay resorción, se apoyan en depresiones de la superficie del hueso. Predominan en el lado de presión. Vienen de la médula ósea, no del folículo dental."
  - id: restos_epiteliales_malassez
    etiqueta: "Restos epiteliales de Malassez"
    descripcion: "Pequeños cúmulos de células cerca del cemento, vestigios de la estructura que guió la formación de la raíz. Son remanentes de la vaina epitelial radicular de Hertwig. No son células óseas ni mesenquimales."
  - id: lado_presion
    etiqueta: "Lado de presión"
    descripcion: "Región del tejido fibroso entre la raíz y el hueso que se comprime cuando una fuerza empuja el diente. Allí aumenta RANKL y predomina la resorción ósea, lo que abre espacio para el movimiento del diente."
  - id: lado_tension
    etiqueta: "Lado de tensión"
    descripcion: "Región del tejido fibroso entre la raíz y el hueso que se estira cuando una fuerza empuja el diente. Allí se estimula a los osteoblastos y predomina la formación de hueso."
requeridos: [fibras_sharpey, hueso_alveolar_propio, fibroblastos_periodontales, cementoblastos, osteoblastos_alveolares, osteoclastos_alveolares, restos_epiteliales_malassez, lado_presion, lado_tension]
```

##### Actividad m2_relacion_celulas_funciones

```yaml
tipo: relacion-columnas
titulo: "Une cada célula con su función"
instrucciones: "Une cada célula de la izquierda con su función de la derecha: toca una célula y luego su función (o arrástrala); toca un par unido para deshacerlo. Con teclado: Tab y Enter. Ojo: hay funciones que no corresponden a ninguna célula."
obligatoria: true
puntaje_max: 30
concepto: "funciones_celulas_oseas"
retroalimentacion:
  acierto: "Muy bien. Relacionas cada célula ósea con su función y su marcador principal."
  parcial: "Vas bien, pero repasa qué célula forma hueso, cuál lo reabsorbe y cuál vive dentro de la matriz."
  error: "Hay pares equivocados. Recuerda: el osteoblasto forma osteoide, el osteocito percibe la carga y secreta esclerostina, el osteoclasto reabsorbe, y la célula de revestimiento es un osteoblasto en reposo."
izquierda:
  - id: c_mesenquimal
    texto: "Célula madre mesenquimal"
  - id: c_osteoprogenitora
    texto: "Célula osteoprogenitora"
  - id: c_osteoblasto
    texto: "Osteoblasto"
  - id: c_revestimiento
    texto: "Célula de revestimiento óseo"
  - id: c_osteocito
    texto: "Osteocito"
  - id: c_osteoclasto
    texto: "Osteoclasto"
  - id: c_fibroblasto_pdl
    texto: "Fibroblasto del ligamento periodontal"
derecha:
  - id: f_multipotente
    texto: "Multipotente: puede originar osteoblastos, condrocitos y adipocitos"
  - id: f_comprometida
    texto: "Comprometida con el linaje óseo; fusiforme, se divide y expresa RUNX2"
  - id: f_osteoide
    texto: "Sintetiza el osteoide y expresa fosfatasa alcalina, osteocalcina, RANKL y OPG"
  - id: f_reposo
    texto: "Cubre superficies óseas en reposo y puede reactivarse como osteoblasto"
  - id: f_esclerostina
    texto: "Vigila la carga mecánica desde su laguna y secreta esclerostina"
  - id: f_resorcion
    texto: "Reabsorbe hueso con zona clara, borde festoneado, protones y catepsina K"
  - id: f_colageno
    texto: "Renueva de forma continua el colágeno de las fibras que anclan el diente al hueso alveolar"
  - id: f_cartilago
    texto: "Sintetiza matriz cartilaginosa rica en colágeno tipo II y agrecano"
  - id: f_esmalte
    texto: "Forma el esmalte dental"
pares:
  - izquierda: c_mesenquimal
    derecha: f_multipotente
    explicacion: "La célula madre mesenquimal se autorrenueva y, según las señales, origina osteoblastos, condrocitos o adipocitos."
  - izquierda: c_osteoprogenitora
    derecha: f_comprometida
    explicacion: "RUNX2 compromete a la célula con el linaje óseo; la osteoprogenitora es fusiforme y todavía se divide."
  - izquierda: c_osteoblasto
    derecha: f_osteoide
    explicacion: "El osteoblasto secreta el osteoide y expresa fosfatasa alcalina y osteocalcina; con RANKL y OPG regula a los osteoclastos."
  - izquierda: c_revestimiento
    derecha: f_reposo
    explicacion: "La célula de revestimiento es un osteoblasto aplanado y en reposo que puede reactivarse."
  - izquierda: c_osteocito
    derecha: f_esclerostina
    explicacion: "El osteocito vive en su laguna, percibe la carga mecánica y secreta esclerostina, que frena la formación de hueso."
  - izquierda: c_osteoclasto
    derecha: f_resorcion
    explicacion: "El osteoclasto se sella con la zona clara, acidifica con protones y digiere el colágeno con catepsina K."
  - izquierda: c_fibroblasto_pdl
    derecha: f_colageno
    explicacion: "Los fibroblastos del ligamento renuevan el colágeno de las fibras que anclan el diente al hueso alveolar."
```

##### Actividad m2_evaluacion_final

```yaml
tipo: quiz
titulo: "Evaluación final del módulo 2"
instrucciones: "Responde las diez preguntas; tras cada una verás la explicación. Toca tu respuesta; en Ordenar pasos, toca los pasos en su orden y pulsa Comprobar. Con teclado: Tab y Enter. Cada pregunta vale 10 puntos; para el logro se sugiere alcanzar 70."
obligatoria: true
puntaje_max: 100
concepto: "evaluacion_modulo_2"
retroalimentacion:
  acierto: "Excelente. Completaste el módulo 2 y obtienes el logro «Célula por célula»."
  parcial: "Vas por buen camino. Repasa las secciones donde fallaste; el mentor puede ayudarte con los conceptos que más te costaron."
  error: "Repasa las secciones donde fallaste. El mentor puede ayudarte con los conceptos que más te costaron; después puedes repetir la evaluación."
preguntas:
  - id: m2_qf_1
    formato: opcion_multiple
    enunciado: "¿Cómo se forma el cuerpo de la mandíbula?"
    opciones:
      - id: a
        texto: "Por osificación endocondral del cartílago de Meckel"
      - id: b
        texto: "Por osificación endocondral de un cartílago secundario"
      - id: c
        texto: "Por osificación intramembranosa, junto al cartílago de Meckel"
      - id: d
        texto: "Por calcificación del ligamento periodontal que rodea a los dientes"
    correcta: c
    explicacion: "El cuerpo mandibular se forma por osificación intramembranosa junto al cartílago de Meckel, que solo lo guía. La osificación endocondral de un cartílago secundario corresponde al cóndilo."
    dificultad: 1
    concepto: "osificacion_mandibular"
  - id: m2_qf_2
    formato: opcion_multiple
    enunciado: "¿Qué característica describe a una célula madre mesenquimal?"
    opciones:
      - id: a
        texto: "Se autorrenueva y es multipotente: origina osteoblastos, condrocitos o adipocitos"
      - id: b
        texto: "Es multinucleada y reabsorbe hueso con un borde festoneado y una zona clara"
      - id: c
        texto: "Expresa TRAP y catepsina K y digiere el colágeno de la matriz ósea"
      - id: d
        texto: "Está diferenciada de forma terminal y ya no puede dividirse ni autorrenovarse"
    correcta: a
    explicacion: "La célula madre mesenquimal se autorrenueva y es multipotente. Ser multinucleada y expresar TRAP y catepsina K son rasgos del osteoclasto, que es hematopoyético."
    dificultad: 2
    concepto: "celulas_madre_mesenquimales"
  - id: m2_qf_3
    formato: opcion_multiple
    enunciado: "En ratones sin osterix se observan precursores que expresan RUNX2 pero no hay osteoblastos maduros. ¿Qué indica esto?"
    opciones:
      - id: a
        texto: "Osterix actúa antes de RUNX2 y es el factor que lo activa en el precursor"
      - id: b
        texto: "RUNX2 no interviene en la diferenciación, que depende únicamente de osterix"
      - id: c
        texto: "Osterix y RUNX2 actúan en paralelo y cada uno puede sustituir al otro"
      - id: d
        texto: "Osterix actúa después de RUNX2 y es necesario para completar la diferenciación"
    correcta: d
    explicacion: "RUNX2 está presente, pero sin osterix la célula no completa su diferenciación. Por eso osterix actúa aguas abajo de RUNX2, y ambos son factores de transcripción, no receptores de membrana."
    dificultad: 3
    concepto: "factores_transcripcion"
  - id: m2_qf_4
    formato: verdadero_falso
    enunciado: "Las células de revestimiento óseo son osteoblastos en reposo, aplanados, que pueden reactivarse y volver a formar hueso."
    opciones:
      - id: verdadero
        texto: "Verdadero"
      - id: falso
        texto: "Falso"
    correcta: verdadero
    explicacion: "Las células de revestimiento derivan del osteoblasto, cubren superficies sin actividad y pueden reactivarse ante estímulos apropiados."
    dificultad: 2
    concepto: "celulas_revestimiento"
  - id: m2_qf_5
    formato: opcion_multiple
    enunciado: "¿Qué estructuras permiten que un osteocito atrapado en la matriz se comunique con las células de la superficie ósea?"
    opciones:
      - id: a
        texto: "Fibras de Sharpey que cruzan la matriz mineralizada hasta la superficie"
      - id: b
        texto: "Dendritas que recorren canalículos y se unen por uniones comunicantes"
      - id: c
        texto: "Osteoclastos que perforan la matriz y conectan las lagunas entre sí"
      - id: d
        texto: "Vesículas de la matriz que salen de la laguna hacia la superficie"
    correcta: b
    explicacion: "Las dendritas viajan por los canalículos y contactan con otros osteocitos y con las células de la superficie mediante uniones comunicantes. Las fibras de Sharpey anclan el diente y los osteoclastos reabsorben hueso, pero no forman esa red."
    dificultad: 2
    concepto: "osteocito_red"
  - id: m2_qf_6
    formato: opcion_multiple
    enunciado: "Una paciente recibe denosumab, un anticuerpo que neutraliza RANKL. ¿Qué cambio celular se espera?"
    opciones:
      - id: a
        texto: "Menos osteoclastos y menos resorción ósea"
      - id: b
        texto: "Más osteoclastos, porque desaparece un freno"
      - id: c
        texto: "Menos osteoblastos, porque no pueden diferenciarse"
      - id: d
        texto: "Más esclerostina en los osteocitos"
    correcta: a
    explicacion: "RANKL es la señal que forma y activa a los osteoclastos. Al neutralizarlo, hay menos osteoclastos y menos resorción. Por eso este fármaco se usa en osteoporosis y se asocia a osteonecrosis de los maxilares."
    dificultad: 2
    concepto: "senales_osteoclastogenicas"
  - id: m2_qf_7
    formato: ordenar_pasos
    enunciado: "Ordena la respuesta del hueso alveolar en el lado de presión durante un movimiento ortodóncico."
    pasos:
      - id: o_resorcion
        texto: "El hueso alveolar se reabsorbe y el diente se desplaza"
      - id: o_senal
        texto: "Las células del ligamento y los osteocitos detectan la deformación y aumentan RANKL"
      - id: o_fuerza
        texto: "Una fuerza ortodóncica comprime el ligamento periodontal"
      - id: o_osteoclastos
        texto: "Se diferencian y se activan osteoclastos en la superficie del hueso alveolar"
    correcta: [o_fuerza, o_senal, o_osteoclastos, o_resorcion]
    explicacion: "La fuerza comprime el ligamento; las células detectan la deformación y aumentan RANKL; RANKL forma y activa osteoclastos; y la resorción del hueso permite el desplazamiento del diente."
    dificultad: 3
    concepto: "remodelado_ortodoncico"
  - id: m2_qf_8
    formato: opcion_multiple
    enunciado: "¿Qué paso de la resorción falla en un osteoclasto sin catepsina K funcional?"
    opciones:
      - id: a
        texto: "La acidificación del espacio y la disolución del mineral"
      - id: b
        texto: "La formación de la zona clara que sella el espacio"
      - id: c
        texto: "La digestión del colágeno tipo I de la matriz ósea"
      - id: d
        texto: "La fusión de los preosteoclastos en una célula grande"
    correcta: c
    explicacion: "La catepsina K digiere el colágeno tipo I. Sin ella el mineral se disuelve, pero la matriz orgánica queda sin degradar. Esto ocurre en la picnodisostosis."
    dificultad: 3
    concepto: "resorcion_osteoclastica"
  - id: m2_qf_9
    formato: opcion_multiple
    enunciado: "¿Por qué el hueso alveolar se reabsorbe después de perder un diente?"
    opciones:
      - id: a
        texto: "Porque sus osteoblastos derivan del mesodermo y dejan de renovarse con la edad"
      - id: b
        texto: "Porque depende del diente y del estímulo funcional que llega por el ligamento"
      - id: c
        texto: "Porque el cemento radicular de los dientes vecinos lo digiere poco a poco"
      - id: d
        texto: "Porque pierde toda su irrigación sanguínea y sus células mueren de inmediato"
    correcta: b
    explicacion: "El hueso alveolar se forma con el diente y se mantiene por el estímulo funcional que transmite el ligamento. Si el diente falta, el estímulo desaparece y el hueso se reabsorbe de forma progresiva, más rápido en los primeros meses."
    dificultad: 2
    concepto: "hueso_alveolar"
  - id: m2_qf_10
    formato: opcion_multiple
    enunciado: "¿Qué es el osteoide?"
    opciones:
      - id: a
        texto: "Hueso maduro completamente mineralizado, rico en hidroxiapatita"
      - id: b
        texto: "Matriz cartilaginosa del cartílago condilar, rica en colágeno tipo II"
      - id: c
        texto: "Tejido mineralizado que cubre la dentina de la raíz del diente"
      - id: d
        texto: "La matriz orgánica que secreta el osteoblasto, todavía sin mineralizar"
    correcta: d
    explicacion: "El osteoide es la matriz recién secretada por el osteoblasto: colágeno tipo I y otras proteínas, todavía sin mineral. Después se mineraliza."
    dificultad: 1
    concepto: "osteoblasto_funciones"
```

## Glosario

- **Anhidrasa carbónica II:** enzima del citoplasma del osteoclasto que convierte CO2 y agua en ácido carbónico, fuente de los protones que se bombean para acidificar el espacio de resorción.
- **Apoptosis:** muerte celular programada; es el destino de una gran parte de los osteoblastos al terminar de formar hueso.
- **Borde festoneado:** repliegues profundos de la membrana del osteoclasto activo, orientados hacia el hueso; por ellos salen protones y enzimas y se recogen los productos de degradación. También se llama borde rugoso.
- **Canalículo:** conducto fino que atraviesa la matriz mineralizada y conecta las lagunas; aloja una dendrita y líquido.
- **Cartílago de Meckel:** barra de cartílago primario del arco mandibular; guía la formación de la mandíbula, pero no se convierte en ella. Su extremo posterior forma el martillo y el yunque.
- **Cartílago secundario:** cartílago que aparece después de que existe hueso membranoso, sin derivar del cartílago primario; el cartílago condilar es el principal ejemplo mandibular.
- **Catepsina K:** proteasa de cisteína que el osteoclasto secreta al espacio ácido para digerir el colágeno tipo I.
- **Célula de revestimiento óseo:** osteoblasto en reposo, aplanado, que cubre superficies óseas sin formación ni resorción y puede reactivarse.
- **Célula madre mesenquimal:** célula multipotente que se autorrenueva y puede originar osteoblastos, condrocitos y adipocitos.
- **Célula osteoprogenitora:** célula fusiforme comprometida con el linaje óseo, que todavía se divide; se localiza en el periostio y el endostio.
- **Cemento:** tejido mineralizado que cubre la dentina de la raíz y recibe las fibras del ligamento periodontal.
- **Cresta neural craneal:** población de células embrionarias multipotentes que migra desde el borde del tubo neural hacia la cara y el cuello y forma el ectomesénquima.
- **Dendrita:** prolongación larga y delgada del osteocito que viaja por un canalículo y contacta con otras células.
- **Ectomesénquima:** tejido embrionario de origen neural, propio de la cabeza, que se comporta como mesénquima y origina hueso, cartílago, dentina, pulpa, cemento y ligamento periodontal.
- **Esclerostina:** proteína secretada por los osteocitos que se une a LRP5 y LRP6 y frena la vía Wnt/β-catenina en los osteoblastos, con lo que reduce la formación de hueso.
- **Fibras de Sharpey:** extremos de las fibras principales de colágeno del ligamento periodontal incluidos en el cemento y el hueso alveolar.
- **Fosfatasa alcalina:** enzima del osteoblasto, anclada a su membrana y a las vesículas de la matriz, que favorece la mineralización; su forma ósea en sangre es un marcador de formación.
- **Hueso alveolar propio:** lámina delgada de hueso compacto que reviste el alvéolo y recibe las fibras de Sharpey; se ve como lámina dura en la radiografía.
- **Laguna:** cavidad de la matriz mineralizada donde vive el cuerpo del osteocito.
- **Laguna de Howship:** depresión excavada en la superficie ósea por un osteoclasto activo.
- **Ligamento periodontal:** tejido conectivo fibroso entre el cemento y el hueso alveolar, que ancla el diente y contiene células formadoras y reabsorbentes.
- **M-CSF:** factor estimulante de colonias de macrófagos; se une a c-Fms y mantiene la supervivencia y la proliferación del precursor del osteoclasto, además de inducirle RANK.
- **Osificación endocondral:** formación de hueso que reemplaza a un molde de cartílago; en la mandíbula ocurre en el cóndilo.
- **Osificación intramembranosa:** formación de hueso directamente a partir de mesénquima condensado, sin cartílago; forma el cuerpo, la rama y el proceso alveolar de la mandíbula.
- **Osteoblasto:** célula formadora de hueso; sintetiza el osteoide, regula la mineralización y produce M-CSF, RANKL y OPG.
- **Osteocalcina:** proteína no colágena de la matriz que secreta el osteoblasto maduro; se une a la hidroxiapatita y sirve como marcador de actividad osteoblástica.
- **Osteoclasto:** célula gigante multinucleada del linaje monocito-macrófago que reabsorbe hueso.
- **Osteocito:** osteoblasto atrapado en la matriz; forma una red conectada que percibe la carga y regula la formación y la resorción.
- **Osteoide:** matriz orgánica recién secretada por el osteoblasto, aún sin mineralizar, formada sobre todo por colágeno tipo I.
- **OPG (osteoprotegerina):** receptor señuelo soluble que se une a RANKL y le impide activar RANK.
- **Osterix (Sp7):** factor de transcripción que actúa después de RUNX2 y depende de él; necesario para que el preosteoblasto se convierta en osteoblasto.
- **RANK y RANKL:** RANK es el receptor de membrana del preosteoclasto; RANKL es su ligando, producido por osteoblastos, células del estroma y osteocitos. Su unión promueve la formación y la activación del osteoclasto.
- **Restos epiteliales de Malassez:** cúmulos de células epiteliales del ligamento periodontal, cerca del cemento; remanentes de la vaina epitelial radicular de Hertwig.
- **RUNX2:** factor de transcripción (también llamado Cbfa1) que compromete a la célula mesenquimal con el linaje osteoblástico.
- **TRAP:** fosfatasa ácida resistente al tartrato; marcador histoquímico del osteoclasto.
- **Unión comunicante:** canal entre células vecinas, formado sobre todo por conexina 43 en los osteocitos, que deja pasar iones y moléculas pequeñas.
- **V-ATPasa (bomba de protones):** complejo de membrana del borde festoneado que gasta ATP para bombear protones al espacio de resorción.
- **Zona clara:** anillo de citoplasma del osteoclasto, rico en actina, que se adhiere a la matriz y sella el espacio de resorción. También se llama zona de sellado.

## Referencias

- Ross MH, Pawlina W. *Histología: Texto y Atlas* (*Histology: A Text and Atlas*). Capítulos de tejido óseo, tejido cartilaginoso y de tejido conectivo.
- Mescher AL. *Junqueira. Histología básica: Texto y Atlas* (*Junqueira's Basic Histology: Text and Atlas*). Capítulo de tejido óseo.
- Nanci A. *Ten Cate's Oral Histology: Development, Structure, and Function*, 9.ª edición. Capítulos de desarrollo de la cara, ligamento periodontal, hueso alveolar y cemento.
- Sperber GH, Sperber SM, Guttmann GD. *Craniofacial Embryogenetics and Development*, 2.ª edición.
- Moore KL, Persaud TVN, Torchia MG. *The Developing Human: Clinically Oriented Embryology*. Capítulos del aparato faríngeo y de la cabeza y el cuello.
- Standring S (ed.). *Gray's Anatomy: The Anatomical Basis of Clinical Practice*. Capítulos de la mandíbula y de la articulación temporomandibular.
- Bilezikian JP, Martin TJ, Clemens TL, Rosen CJ (eds.). *Principles of Bone Biology*. Capítulos de osteoblastos, osteocitos y osteoclastos.
- Hall BK. *Bones and Cartilage: Developmental and Evolutionary Skeletal Biology*, 2.ª edición.
- Hall JE, Hall ME. *Guyton y Hall: Tratado de fisiología médica*. Capítulo de fisiología del hueso, el calcio y el fosfato.
- Florencio-Silva R, Sasso GRS, Sasso-Cerri E, Simões MJ, Cerri PS. Biology of Bone Tissue: Structure, Function, and Factors That Influence Bone Cells. *BioMed Research International*, 2015.
- Komori T, et al. Targeted disruption of Cbfa1 results in a complete lack of bone formation owing to maturation arrest of osteoblasts. *Cell*, 1997.
- Nakashima K, et al. The novel zinc finger-containing transcription factor osterix is required for osteoblast differentiation and bone formation. *Cell*, 2002.
- Jilka RL, et al. Osteoblast programmed cell death (apoptosis): modulation by growth factors and cytokines. *Journal of Bone and Mineral Research*, 1998.
- Teitelbaum SL. Bone resorption by osteoclasts. *Science*, 2000.
- Bonewald LF. The amazing osteocyte. *Journal of Bone and Mineral Research*, 2011.
- Dominici M, et al. Minimal criteria for defining multipotent mesenchymal stromal cells. The International Society for Cellular Therapy position statement. *Cytotherapy*, 2006.
- Chai Y, et al. Fate of the mammalian cranial neural crest during tooth and mandibular morphogenesis. *Development*, 2000.

## Banco de preguntas para el mentor

| # | Pregunta | Respuesta | Dificultad | Concepto |
|---|---|---|---|---|
| 1 | ¿Qué es el ectomesénquima y de dónde viene? | Es el mesénquima de origen neural de la cabeza. Viene de la cresta neural craneal y forma hueso, cartílago, dentina, pulpa, cemento y ligamento periodontal. | 1 | origen_craneofacial |
| 2 | ¿Por qué se llama secundario al cartílago condilar? | Porque no deriva del cartílago de Meckel y aparece después de que ya existe hueso intramembranoso. | 2 | condilo_endocondral |
| 3 | ¿Qué destino tiene el cartílago de Meckel? | Su extremo posterior forma el martillo y el yunque; su porción media desaparece o se vuelve tejido fibroso, y una parte contribuye a ligamentos como el esfenomandibular. El hueso mandibular se formó a su lado. | 2 | cartilago_meckel |
| 4 | ¿Qué hace M-CSF que no haga RANKL? | M-CSF, al unirse a c-Fms, mantiene vivo y en división al precursor y le induce el receptor RANK. RANKL, al unirse a RANK, promueve la diferenciación, la fusión y la activación. | 2 | senales_osteoclastogenicas |
| 5 | ¿Qué pasa con la resorción ósea si aumenta la proporción RANKL/OPG? | Aumenta: hay más RANKL libre para activar RANK, se forman y activan más osteoclastos. | 2 | senales_osteoclastogenicas |
| 6 | ¿Por qué se usa la fosfatasa alcalina ósea en sangre como marcador de formación ósea? | Porque la producen los osteoblastos activos; su aumento refleja más actividad formadora. | 2 | osteoblasto_funciones |
| 7 | ¿En qué se diferencian un osteoblasto activo y un osteocito? | El osteoblasto es cúbico, con mucho retículo rugoso y forma osteoide sobre la superficie. El osteocito es estrellado, tiene menos orgánulos, vive en una laguna dentro de la matriz y se comunica por dendritas. | 1 | osteocito_red |
| 8 | ¿Cuál es la diana molecular de la esclerostina y qué provoca? | Se une a los correceptores LRP5 y LRP6 y bloquea la vía Wnt/β-catenina en el osteoblasto, con lo que se reduce la formación de hueso. | 3 | esclerostina |
| 9 | ¿Qué esperas en la dentición de una persona con haploinsuficiencia de RUNX2? | Displasia cleidocraneal: dientes supernumerarios, retención de dientes temporales y erupción retrasada de los permanentes. | 3 | factores_transcripcion |
| 10 | ¿De qué tejido embrionario derivan los fibroblastos del ligamento periodontal? | Los fibroblastos y los progenitores derivan del folículo dental (ectomesénquima de la cresta neural); los restos de Malassez son epiteliales y los osteoclastos vienen de la médula ósea. | 2 | ligamento_periodontal |
| 11 | ¿Por qué se dice que la TRAP es resistente al tartrato? | Porque en la tinción se añade tartrato, que inhibe casi todas las fosfatasas ácidas, y la isoforma del osteoclasto sigue activa; por eso tiñe a los osteoclastos. | 2 | resorcion_osteoclastica |
| 12 | ¿Cuál se considera el regulador maestro de la osteoclastogénesis y qué lo activa? | NFATc1. Lo activa la señal de RANKL al unirse a RANK. | 3 | senales_osteoclastogenicas |
| 13 | ¿Por qué el osteoclasto tiene varios núcleos? | Porque se forma por la fusión de preosteoclastos mononucleares. | 1 | linaje_osteoclastico |
| 14 | ¿En qué se diferencia una célula osteoprogenitora de una célula de revestimiento óseo? | La osteoprogenitora es una célula fusiforme comprometida con el linaje (con RUNX2) que todavía se divide y puede originar osteoblastos. La de revestimiento es un osteoblasto aplanado y en reposo sobre una superficie sin actividad, que puede reactivarse. | 2 | celulas_revestimiento |
| 15 | ¿Qué fármaco antiosteoporótico bloquea la esclerostina? | El romosozumab, un anticuerpo contra la esclerostina. | 3 | esclerostina |
| 16 | ¿Qué ocurre con el hueso alveolar cuando se pierde un diente y por qué? | Se reabsorbe de forma progresiva, más rápido en los primeros meses, porque es un hueso dependiente del diente y del estímulo funcional que transmite el ligamento periodontal. | 2 | hueso_alveolar |
| 17 | En ortodoncia, ¿en qué lado predomina la formación ósea, el de presión o el de tensión? | En el de tensión, donde el ligamento se estira y se estimula a los osteoblastos. | 1 | remodelado_ortodoncico |
| 18 | ¿Qué diferencia hay entre laguna, canalículo y dendrita? | La laguna es la cavidad del cuerpo del osteocito, el canalículo es el conducto que atraviesa la matriz y la dendrita es la prolongación celular que viaja por el canalículo. | 1 | osteocito_red |

## Ganchos para el mentor

**Conceptos clave** (coinciden con las etiquetas `concepto` de las actividades)

| Concepto | Qué debe entender el estudiante |
|---|---|
| `osificacion_mandibular`, `origen_craneofacial`, `cartilago_meckel`, `condilo_endocondral` | La mandíbula deriva de la cresta neural; el cuerpo y la rama se forman por osificación intramembranosa junto al cartílago de Meckel; el cóndilo, por osificación endocondral de un cartílago secundario |
| `celulas_madre_mesenquimales`, `linaje_osteoblastico`, `factores_transcripcion` | Célula madre mesenquimal, osteoprogenitora, preosteoblasto, osteoblasto y osteocito; RUNX2 primero y osterix después |
| `osteoblasto_funciones`, `celulas_revestimiento` | El osteoblasto forma osteoide (colágeno I), regula la mineralización (fosfatasa alcalina, osteocalcina) y controla al osteoclasto (RANKL, OPG); la célula de revestimiento es un osteoblasto en reposo |
| `osteocito_red`, `esclerostina` | El osteocito vive en una laguna, se comunica por dendritas en canalículos, percibe la carga y secreta esclerostina |
| `linaje_osteoclastico`, `senales_osteoclastogenicas`, `resorcion_osteoclastica` | El osteoclasto es hematopoyético; M-CSF mantiene al precursor y RANKL lo diferencia; OPG frena; la resorción disuelve primero el mineral y digiere después el colágeno |
| `ligamento_periodontal`, `hueso_alveolar`, `remodelado_ortodoncico` | El ligamento ancla el diente al hueso alveolar; sus células regulan el hueso; en ortodoncia hay resorción en el lado de presión y formación en el de tensión |
| `funciones_celulas_oseas`, `evaluacion_modulo_2` | Integración de la función de cada célula y de todo el módulo |

**Errores frecuentes y cómo aclararlos**

| Error frecuente | Cómo aclararlo |
|---|---|
| «Los osteoclastos vienen de los osteoblastos» | Pregunta de qué célula madre parte cada linaje. El osteoclasto viene de la célula madre hematopoyética de la médula (monocito-macrófago); el osteoblasto, de la mesenquimal. Lo que une a ambos es la señalización, no el origen |
| «RANKL lo produce el osteoclasto» | RANKL está en la membrana de osteoblastos, células del estroma y osteocitos. El osteoclasto (su precursor) tiene RANK, el receptor. Pídele que diga quién es «ligando» y quién «receptor» |
| «La OPG activa a los osteoclastos» | Ayúdalo con la idea de señuelo: la OPG se une a RANKL y le impide llegar a RANK; por eso frena |
| Confundir M-CSF con RANKL | M-CSF mantiene vivo al precursor y le induce RANK; RANKL lo diferencia. Sin M-CSF no hay RANK; sin RANKL no hay osteoclasto |
| «RUNX2 y osterix son receptores» | Son factores de transcripción que actúan en el núcleo. Los receptores están en la membrana; lo que se activa desde un receptor (BMP, Wnt) llega a estos factores |
| Invertir el orden RUNX2 y osterix | Osterix está aguas abajo de RUNX2. Apóyate en el experimento: sin osterix quedan precursores con RUNX2 pero sin hueso |
| «El cartílago de Meckel se convierte en la mandíbula» | Meckel es una guía. El hueso se forma al lado por osificación intramembranosa y la porción media desaparece |
| «El cóndilo se forma por osificación intramembranosa» | El cóndilo tiene un cartílago secundario que se osifica por vía endocondral |
| «Los osteocitos están muertos o inactivos» | Son células vivas, la mayoría del hueso adulto; secretan esclerostina, RANKL y FGF23 y detectan la carga |
| Confundir laguna, canalículo y dendrita | Laguna: cavidad del cuerpo. Canalículo: conducto. Dendrita: prolongación de la célula |
| Confundir osteoide con hueso mineralizado | El osteoide es la matriz orgánica recién formada, sin mineral; después se mineraliza (módulo 4) |
| «La célula de revestimiento es una célula sin importancia» | Es un osteoblasto en reposo que puede reactivarse; cubre la superficie y participa en el remodelado |
| «El osteoclasto solo destruye» | La resorción es la mitad del remodelado y libera señales que estimulan la formación (módulo 5) |
| Creer que los marcadores dirigen la diferenciación | La catepsina K y la osteocalcina son productos de células ya diferenciadas; los factores que dirigen son RUNX2, osterix, M-CSF y RANKL |
| Pensar que el ligamento periodontal es solo un «pegamento» | Es un tejido celular con fibroblastos, progenitores, osteoblastos y osteoclastos que regulan el hueso alveolar |

**Cómo usar el contexto del estudiante**

- En `m2_arrastre_senales_linajes` soltar RANKL sobre RANK antes que M-CSF sobre c-Fms es un acople válido: la actividad no impone orden y no cuenta como error. Si el estudiante lo hace así, solo recuérdale el orden biológico (M-CSF induce el receptor RANK, por eso RANKL actúa después); ese orden sí se evalúa en `m2_ql_4`.
- Si falla `m2_quiz_origen`, pídele que cuente con sus palabras cómo se forma el cuerpo y cómo el cóndilo, y compara ambos procesos.
- Si pregunta por temas de otros módulos (mecanotransducción, mineralización, remodelado), responde brevemente y remite al módulo correspondiente.

## Notas de verificacion para el docente

Los datos siguientes varían entre fuentes, son aproximados o son de interpretación. En el cuerpo del texto están marcados con la etiqueta [verificar].

1. **Cronología del desarrollo mandibular** (sección 2.1, tabla y texto; hotspots). Las fuentes dan cifras algo distintas: el cartílago de Meckel aparece hacia la sexta semana; la osificación intramembranosa comienza hacia la sexta o séptima semana; el cartílago condilar aparece entre las semanas 10 y 14 (algunas fuentes citan la semana 10 y otras la 12). Se usó «aproximadamente». Conviene confirmar con el texto de embriología que use el curso.
2. **Ubicación del primer centro de osificación** (secciones 2.1 y hotspot `foramen_mentoniano`). Se describe como la bifurcación del nervio alveolar inferior en sus ramas mentoniana e incisiva, cerca del futuro foramen mentoniano. Confirmar con el texto de referencia.
3. **Destino del cartílago de Meckel** (sección 2.1 y banco de preguntas). Se afirma que el extremo posterior forma el martillo y el yunque, que la porción media desaparece o se transforma en tejido fibroso y que una parte contribuye a ligamentos como el esfenomandibular. La contribución de la porción anterior a la región de la sínfisis es objeto de debate y no se afirma.
4. **Cartílagos secundarios adicionales** (sección 2.1 y hotspots `sinfisis` y `apofisis_coronoides`). Se mencionan cartílagos secundarios menores en la apófisis coronoides y en la sínfisis. Algunos textos añaden un cartílago angular, sobre todo en roedores. Confirmar cuáles enseña el curso para el ser humano.
5. **Osificación de la sínfisis en el primer año** (hotspot `sinfisis`). La fusión de las hemimandíbulas durante el primer año de vida es la cifra habitual; algunos textos dan un rango de meses. Confirmar.
6. **Proporción de osteocitos** (sección 2.3 y pregunta `m2_qs_1`). Aproximadamente 90 a 95 % de las células del hueso adulto; algunas fuentes dicen «más de 90 %» o «cerca de 90 %». Conviene confirmar la cifra que usará el curso.
7. **Apoptosis de osteoblastos** (secciones 2.2, video de la línea osteoblástica). Se estima que entre 50 y 70 % de los osteoblastos mueren por apoptosis; es una estimación indirecta (los osteoblastos que no se cuentan como osteocitos ni como células de revestimiento) de un trabajo clásico. Confirmar.
8. **Colágeno tipo I en el osteoide** (sección 2.2 y capa `osteoide`). Aproximadamente 90 % de la matriz orgánica; hay variación entre textos.
9. **RANKL en osteocitos** (sección 2.3). Se dice que el osteocito es una fuente importante de RANKL en el remodelado de ratones adultos. La evidencia proviene sobre todo de modelos murinos; su extrapolación al ser humano se sigue estudiando.
10. **Número de núcleos del osteoclasto** (sección 2.4). No se da una cifra. Las fuentes varían: promedios cercanos a ocho núcleos en algunas descripciones, hasta unas decenas en textos clásicos, y más en algunas enfermedades. Confirmar la afirmación «varios núcleos».
11. **pH de la laguna de resorción** (sección 2.4 y capa `bomba_protones`). Aproximadamente 4,5 en varias fuentes; se usa como valor aproximado.
12. **Ancho del ligamento periodontal** (sección 2.5 y capa `ligamento_periodontal`). Aproximadamente 0,15 a 0,4 mm; algunos textos dan 0,15 a 0,38 mm o un promedio de 0,2 mm, y el ancho varía con el diente, la edad y la función. Confirmar el rango.
13. **Duración estimada** (ficha). Se estimó en 40 a 50 minutos con las actividades obligatorias (unas 2 700 palabras de contenido, 11 actividades obligatorias y 23 preguntas de quiz). Es un cálculo, no una medición: conviene validarlo con un piloto de 3 o 4 estudiantes.

Otras afirmaciones que el docente puede querer ajustar, aunque no llevan la etiqueta:

- **Origen de las CMM en la mandíbula.** Se afirma que descienden del ectomesénquima. Es lo habitual para el hueso mandibular; las poblaciones de la médula ósea mandibular y su equivalencia con las de otros huesos se siguen investigando.
- **Origen del osteoclasto.** Se presenta la vía clásica (célula madre hematopoyética, monocito-macrófago). Estudios recientes indican que, además, precursores eritromieloides embrionarios contribuyen a los osteoclastos; se omite por ser de profundización.
- **Orden de los marcadores.** En la pregunta `m2_ql_3` solo se ordenan RUNX2, osterix, la secreción de osteoide y la osteocalcina. Se evitó poner el colágeno tipo I como paso propio: se expresa desde etapas tempranas (RUNX2 activa su promotor y osterix coopera), y en los ratones sin osterix se sigue expresando, aunque reducido, de modo que no admite un orden inequívoco. Otros textos añaden la fosfatasa alcalina, la osteopontina y la sialoproteína ósea en pasos intermedios.
- **Etapas intermedias de los linajes.** Algunos textos no separan el preosteoblasto de la osteoprogenitora, y otros llaman CFU-GM al progenitor mieloide. Se incluyen ambas etapas para ubicar osterix y para que el orden del linaje del osteoclasto sea completo (preguntas `m2_ql_1` y `m2_ql_2`). Confirmar la nomenclatura que usa el curso.
- **BMP y Wnt como señales que activan RUNX2.** Se mencionan como ejemplos; el módulo 3 tratará Wnt.
- **Osteocalcina.** Se dice que es «una de las proteínas no colágenas más abundantes»; algunos textos la llaman la más abundante.
- **Osteonecrosis de los maxilares.** Se afirma que es más frecuente en la mandíbula que en el maxilar; las series publicadas sitúan alrededor de dos tercios a 70 % en la mandíbula, sin cifras usadas en el texto.
- **TRAP 5b y FGF23.** Se citan como marcador de resorción y hormona osteocitaria respectivamente.
- **Síndrome de Treacher Collins, displasia cleidocraneal, esclerosteosis, picnodisostosis y osteopetrosis.** Los ejemplos clínicos son de libros de texto y pueden ampliarse o sustituirse por casos que el docente prefiera.
- **Reabsorción tras la pérdida de un diente.** Se dice que es progresiva y más rápida en los primeros meses. Los estudios clínicos clásicos (por ejemplo, el de Schropp y colaboradores, 2003) describen una pérdida de hasta la mitad del ancho del reborde en el primer año, la mayor parte en los tres primeros meses; los valores varían entre estudios y no se citan cifras en el texto.
- **Origen de las células del ligamento periodontal.** Se afirma que fibroblastos, cementoblastos y progenitores derivan del folículo dental. Algunos autores discuten el origen de los cementoblastos radiculares (vaina de Hertwig frente a folículo); es la versión habitual de los textos de histología oral.
- **Esclerosteosis y enfermedad de van Buchem.** La primera es una pérdida de función de SOST; la segunda, una deleción no codificante cercana a SOST que reduce su expresión en el hueso. Ambas causan sobrecrecimiento óseo, con afectación de cráneo y mandíbula.
- **Puntajes y umbral del logro.** Los puntajes de cada actividad y el 70 % sugerido para el logro son una propuesta, no un requisito del docente.

## Registro de revision

Revision cientifica independiente del modulo 2. Se contrastaron por cuenta propia los hallazgos factuales con fuentes (Nakashima 2002 y revisiones posteriores sobre osterix; Dominici 2006; Schropp 2003 y revisiones sobre la reabsorcion del reborde alveolar) antes de aceptarlos.

| # | Hallazgo | Decision | Razon breve |
|---|---|---|---|
| 1 | m2_ql_3: orden de colageno I y osterix (bloqueante) | Aceptado | Verificado: en ratones sin osterix el colageno tipo I se sigue expresando, reducido; desaparecen osteopontina, sialoproteina osea, osteonectina y osteocalcina. El orden no era inequivoco. Se quito el paso del colageno; la pregunta queda RUNX2, osterix, secrecion de osteoide y osteocalcina (dificultad 2). |
| 2 | Osterix inicia la sintesis de colageno (texto, video, arrastre) | Aceptado | RUNX2 activa Col1a1 y osterix coopera. Se reformulo: osterix, junto con RUNX2, activa los genes de la matriz y completa la diferenciacion. Se cambio la animacion. |
| 3 | RANKL: molecula y zona con el mismo nombre | Aceptado | Riesgo real de error injusto en el motor. La zona pasa a llamarse "ligando expuesto por el osteoblasto (diana de OPG)"; se cambiaron los ids a `zona_ligando_osteoblasto` y `rec_ligando_osteoblasto`; la molecula RANKL ya no se describe como anclada. |
| 4 | Atribucion al ISCT | Aceptado | Verificado: Dominici 2006 define criterios para celulas estromales mesenquimales multipotentes y reserva "celula madre" para quienes demuestren autorrenovacion y diferenciacion in vivo. Se corrigio y se completo la lista de marcadores negativos. |
| 5 | Reabsorción descrita como lenta tras perder un diente | Aceptado | Schropp 2003 y revisiones: la mayor perdida ocurre en los primeros 3 meses. Se cambio a "de forma progresiva, mas rapido en los primeros meses" en 2.5, qf_9 y banco #16. |
| 6 | Sesgo de longitud en opciones multiples | Aceptado | Se reescribieron las opciones de qo_2, qo_4, qs_2, qf_1, qf_2, qf_3, qf_5, qf_9 y qf_10 con longitud similar y distractores plausibles (por ejemplo, "Osterix y RUNX2 actuan en paralelo"). La posicion de la correcta no cambia. |
| 7 | Van Buchem: perdida frente a reduccion de esclerostina | Aceptado | Verificado: en van Buchem hay una delecion de un potenciador de SOST, no una perdida del gen. Texto corregido. |
| 8 | Folliculo dental como origen de todas las celulas del ligamento | Aceptado | Malassez es epitelial (vaina de Hertwig) y los osteoclastos son hematopoyeticos. Se acoto a fibroblastos, cementoblastos y progenitores; se corrigio el banco #10. |
| 9 | RUNX2: "no forman osteoblastos" | Aceptado | Se cambio a "osteoblastos maduros ni hueso", coherente con Komori 1997 y con el uso del texto para osterix. |
| 10 | "Dos senales" y tres viñetas | Aceptado | Se aclaro que dos dirigen la formacion y la tercera (OPG) la frena. |
| 11 | Orden M-CSF y RANKL en el gancho del mentor | Aceptado | El acople RANKL con RANK es valido y la actividad no impone orden. El gancho ahora indica que no es error y que el orden solo se evalua en m2_ql_4. No se agrego ninguna regla al motor. |
| 12 | Longitud de instrucciones y escena frente a content-schema | Aceptado | Las 11 instrucciones que superaban 300 caracteres y la escena se acortaron; el detalle de las alternativas tactil y de teclado pasa a las convenciones de produccion. |
| 13 | Faltan pista, explicacion por par y banda parcial | Aceptado | Se anadieron `pista` a las capas requeridas de los dos modos identificar (la descripcion queda como ficha con datos nuevos), `explicacion` a los 7 pares de la relacion y `parcial` a quizzes, arrastre, relacion y modos identificar. |
| 14 | Duracion optimista | Aceptado | Se declara 40 a 50 minutos [verificar] y la opcion de dos sesiones. Es un calculo: se recomienda un piloto. |
| 15 | Carga masticatoria ausente en 2.3 | Aceptado | Se agrego la frase sobre la mandibula en "Que hace el osteocito", que respalda la tabla de la conexion mandibular. |
| 16 | "Tejido de anclaje" como termino no definido | Aceptado | Se reemplazo por "tejido fibroso situado entre la raiz y el hueso" en pistas y "ligamento" en las fichas reveladas. |
| 17 | 3D pasiva y quiz de linajes monotono | Parcial | Se agrego un caso clinico (m2_ql_6, displasia cleidocraneal) al quiz de linajes. Se rechaza la micro-decision por hotspot: ampliaria el esquema de exploracion-3d, que no tiene ese campo, la actividad es de refuerzo y la clasificacion intramembranosa o endocondral ya se evalua en m2_quiz_origen (qo_1, qo_3, qo_4) y en qf_1. No se sustituye ql_1 ni ql_2 porque cubren el objetivo 2 (ordenar linajes). |
| 18 | Orden de dibujo y regiones que tapan capas | Aceptado | Se definio el orden de dibujo, se indico que presion y tension son marcadores independientes, que las zonas de acople son contornos sin relleno y un tamano minimo de 12 % del ancho del `viewBox`. |
| 19 | Panel B "fetal" y capas por panel | Aceptado | Se renombro a "hemimandibula en desarrollo (esquema compuesto de las semanas 6 a 14)" y se agrego la distribucion de capas por panel (el ectomesenquima esta en ambos). |
