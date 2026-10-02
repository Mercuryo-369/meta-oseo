# Evaluación de la recuperación del mentor (RAG)

Mide qué tan bien el mentor encuentra el material del curso para una pregunta de estudiante. Es la
prueba de calidad de `services/api/app/rag/` (F3-01 y F3-02). Se ejecuta con:

```bash
cd services/api
uv run python -m app.rag.evaluar            # resumen por conjunto
uv run python -m app.rag.evaluar --detalle  # y qué se recuperó en cada pregunta fallada
```

La prueba `tests/test_rag_retriever.py` corre esta misma evaluación y falla si la calidad cae por
debajo de los umbrales de la sección «Resultados».

## Cómo se mide

- **Corpus:** `services/api/app/data/corpus.jsonl` (597 fragmentos de los seis módulos: 216 de
  contenido, 224 de glosario, 6 de objetivos, 110 preguntas del banco del mentor y 41 ganchos del
  guion). Se genera con `python -m app.scripts.build_corpus`.
- **Motor:** BM25 propio en Python puro, con normalización sin tildes ni mayúsculas, palabras vacías y
  un stemming ligero del español. Parámetros: `k1 = 0,9`, `b = 0,4`; el título de la sección pesa el
  doble; el módulo y la sección que el estudiante tiene abiertos refuerzan el puntaje (+25 % y +20 %).
- **Cada pregunta** lleva el contexto del estudiante (`-` si no hay; `m5` o `m5:seccion` si lo hay) y
  uno o varios fragmentos esperados (`Esperado`). Se identifican por `refs`: el id del bloque del
  `content.json` (`m3:t_dinamica_no_estatica`), del glosario (`m4:glosario:osteoide`) o del banco
  (`m1:banco:6`). Como se usan bloques y no fragmentos, **cambiar cómo se corta el corpus no rompe la
  evaluación**.
- **Acierto @k:** algún fragmento de los `k` primeros cubre alguno de los esperados. Cuando varios
  bloques responden bien (p. ej. la PTH se explica en los módulos 3, 4 y 5), se aceptan todos.
- **Fuera de tema:** aciertan si el motor no devuelve nada (el mentor dirá que el material no lo cubre).

## Conjuntos

| Conjunto | Preguntas | Para qué |
|---|---|---|
| Ajuste | 44 | Se usó para elegir los parámetros y arreglar los fallos generales (ver «Historia del ajuste») |
| Reservado | 20 | Escrito antes de ajustar, pero se **vio** el resultado del primer diagnóstico; no es del todo ciego |
| Ciego | 19 | Escrito **después** de fijar los parámetros y medido una sola vez antes de tocar el corte del corpus |
| Fuera de tema | 6 | Preguntas que el curso no cubre (geografía, cocina, programación, salud personal) |

Las preguntas están redactadas como escribiría un estudiante: sin tildes, con abreviaturas
(«para q sirve»), coloquiales o incompletas («explícame esto»).

## Resultados

Medidos con el corpus versionado (`hit@k` = proporción de preguntas con acierto en los `k` primeros;
`MRR` = media del inverso de la posición del primer acierto):

| Conjunto | Preguntas | hit@1 | hit@3 | hit@5 | MRR |
|---|---:|---:|---:|---:|---:|
| Ajuste | 44 | 54,5 % | **95,5 %** | 97,7 % | 0,733 |
| Reservado | 20 | 75,0 % | **95,0 %** | 95,0 % | 0,850 |
| Ciego | 19 | 63,2 % | **89,5 %** | 100 % | 0,775 |
| **Las tres juntas** | **83** | **61,4 %** | **94,0 %** | **97,6 %** | — |
| Fuera de tema | 6 | 5 de 6 sin resultados | | | |

Velocidad: **0,2 a 0,3 ms por consulta** (597 fragmentos, un solo hilo); el corpus se indexa en
unos 0,1 s al arrancar la API.

Umbrales de la prueba automática (por debajo de lo medido, para que sea estable): hit@1 ≥ 45 % (ajuste),
60 % (reservado), 50 % (ciego); hit@3 ≥ 88 %, 88 % y 80 %; hit@5 ≥ 90 % en los tres; y a lo sumo un
fuera de tema con resultados.

## Lo que no se logró (honestidad)

- **hit@1 es modesto (54 a 75 %).** Con frecuencia el fragmento correcto entra en el segundo o tercer
  lugar, porque varios bloques de módulos distintos hablan de lo mismo. Para el mentor no es grave (recibe
  los cinco primeros), pero la cita número 1 no siempre es la mejor.
- **Falla el vocabulario que el material no usa.** «Sacar un diente» (el texto dice «extracción»),
  «brackets» (dice «ortodoncia»), «cuánto calcio hay guardado» (dice «reservorio»). BM25 no entiende
  sinónimos; se corrige en parte con el stemming y con la búsqueda vectorial de F6-10, no con listas de
  sinónimos hechas a mano (solo hay una: `óseo` ~ `hueso`).
- **Un fuera de tema se cuela** («me duele el estómago, ¿qué me tomo?»: coincide «duele» con el banco). No
  es dañino (el prompt prohíbe dar indicaciones clínicas), pero el estudiante vería una fuente sin relación.
  Endurecer el umbral de cobertura (`COBERTURA_MINIMA` en `retriever.py`) lo evita a costa de perder una
  pregunta válida con vocabulario raro; se dejó el compromiso actual.
- **Las medidas tienen poca resolución:** con 19 a 44 preguntas por conjunto, una pregunta mueve entre 2 y
  5 puntos. Las diferencias de pocos puntos no son significativas. Son preguntas escritas por nosotros, no
  por estudiantes reales; conviene ampliar el conjunto con preguntas del piloto.

## Historia del ajuste

1. **Primera versión** (BM25 `k1 = 1,4`, `b = 0,6`, sin filtros de diversidad): ajuste 70,5 % hit@3,
   reservado 80,0 %. Los fallos: el glosario de cada módulo repite los mismos términos y llenaba los cinco
   lugares con definiciones, y las definiciones cortas puntuaban más que el texto del curso.
2. **Arreglos generales:** una sola definición por término del glosario y a lo sumo dos; a lo sumo dos
   fragmentos de apoyo del docente; el glosario y el apoyo pesan un poco menos; «sirve», «sirven» y «q» son
   palabras vacías; las letras sueltas con significado (`vitamina D`, `T-score`) ya no se descartan; con una
   pregunta sin contenido («explícame esto») se busca por la sección abierta; umbrales de puntaje y de
   cobertura para poder decir que el curso no cubre algo. Después: ajuste 84,1 %, reservado 90,0 %.
   (Ojo: «q» se añadió al ver un fallo del conjunto reservado; por eso ya no es del todo ciego.)
3. **Parámetros:** una rejilla sobre el conjunto de ajuste (`k1` 0,9 a 2,0; `b` 0,4 a 0,9; peso del título
   1 a 3; factores del glosario y el apoyo) dio 90,9 % hit@3 con `k1 = 0,9` y `b = 0,4`. Las diferencias
   entre los primeros puestos de la rejilla son de una pregunta.
4. **Conjunto ciego** (escrito después de fijar los parámetros): 84,2 % hit@3, hit@5 94,7 %.
5. **Corte del corpus:** los fragmentos mezclaban temas (una nota clínica sobre el hueso trabecular
   pegada al bloque del periostio). Se cambió para que un bloque con título abra fragmento nuevo cuando el
   actual ya tiene 50 palabras. Resultado: ajuste 95,5 %, reservado 95,0 %, ciego 89,5 %. El ciego dejó de
   ser ciego con este paso.

## Preguntas

El `Esperado` usa los `refs` de `app/data/corpus.jsonl`; las filas con `-` son fuera de tema.

## Conjunto de ajuste

| # | Pregunta | Contexto | Esperado |
|---|---|---|---|
| 1 | ¿Qué diferencia hay entre hueso y tejido óseo? | - | `m1:t_hueso_y_tejido_oseo_no_son_lo_mismo`, `m1:banco:1` |
| 2 | ¿Por qué se dice que el hueso es un tejido vivo si parece una piedra? | - | `m1:t_tejido_vivo`, `m1:t_un_tejido_dinamico`, `m1:banco:2` |
| 3 | ¿Para qué sirve el hueso aparte de sostener el cuerpo? | - | `m1:t_funciones`, `m1:tb_tabla_familia_funcion_que_hace` |
| 4 | ¿Qué es el FGF23 y qué hace? | - | `m1:c_atencion_fgf23_es_el_mensajero_oseo`, `m1:t_el_hueso_como_organo_endocrino`, `m4:t_fgf23`, `m1:banco:6` |
| 5 | ¿De qué está hecha la matriz ósea? | - | `m1:t_matriz`, `m1:tb_tabla_componente_que_es_proporcion`, `m4:tb_de_que_esta_hecha_la_matriz` |
| 6 | ¿Cuál es la diferencia entre hueso cortical y trabecular? | - | `m1:c_atencion_no_confundas_estas_dos`, `m1:t_hueso_cortical_y_hueso_trabecular`, `m1:tb_tabla_rasgo_hueso_cortical_hueso` |
| 7 | ¿Qué es una osteona y cómo le llega la sangre? | - | `m1:t_la_osteona_la_unidad_de_la_cortical`, `m1:c_atencion_no_confundas_los_conductos` |
| 8 | ¿Por qué la mandíbula funciona como una palanca? | - | `m1:t_la_mandibula_como_palanca_y_su_carga`, `m1:banco:22` |
| 9 | ¿Qué dice la ley de Wolff? | - | `m1:t_la_mandibula_como_palanca_y_su_carga`, `m1:c_recuerda_el_hueso_es_un_tejido_vivo`, `m1:banco:21` |
| 10 | ¿De dónde vienen las células que forman la mandíbula? ¿Qué es la cresta neural? | - | `m2:t_origen_craneofacial`, `m2:m2_video_origen_mandibula`, `m2:t_un_origen_distinto_al_de_los_huesos_de`, `m2:c_dato_las_celulas_de_la_cresta`, `m2:banco:1` |
| 11 | ¿El cartílago de Meckel se convierte en la mandíbula? | - | `m3:t_destino_del_cartilago_de_meckel`, `m2:t_el_cartilago_de_meckel_es_una_guia_no_el`, `m2:c_recuerda_el_cartilago_de_meckel_es`, `m2:banco:3` |
| 12 | ¿Qué hacen RUNX2 y osterix? | - | `m2:t_los_interruptores_runx2_y_osterix`, `m2:c_recuerda_el_orden_es_runx2_y_luego` |
| 13 | ¿Qué es un osteoblasto y qué secreta? | - | `m2:t_el_osteoblasto_la_celula_que_forma_hueso` |
| 14 | ¿Las células de revestimiento óseo son otro tipo de célula? | - | `m2:c_recuerda_la_celula_de_revestimiento`, `m2:t_destinos_del_osteoblasto_y_celula_de` |
| 15 | ¿Qué es la esclerostina y para qué sirve? | - | `m3:t_la_esclerostina_y_la_carga`, `m5:t_esclerostina_el_freno_de_los`, `m2:c_dato_la_carga_mecanica_reduce`, `m2:t_que_hace_el_osteocito` |
| 16 | ¿Cómo se forma un osteoclasto? | - | `m2:t_de_monocito_a_osteoclasto`, `m2:t_osteoclasto`, `m5:t_de_donde_viene_el_osteoclasto`, `m5:m5_osteoclastogenesis_video` |
| 17 | ¿Qué hace la OPG? | - | `m5:t_la_balanza_rankl_opg`, `m5:t_eje_rankl_opg`, `m5:t_eje_rankl_opg_2` |
| 18 | ¿Cómo detecta el osteocito la carga mecánica? | - | `m3:t_como_detecta_la_carga_el_flujo_de`, `m3:t_sensores_mensajeros`, `m3:t_el_sistema_lacuno_canalicular` |
| 19 | ¿Por qué una carga que se mantiene quieta no estimula el hueso? | - | `m3:t_dinamica_no_estatica`, `m3:c_recuerda_carga_que_cambia_liquido` |
| 20 | ¿Para qué se usa el romosozumab? | - | `m3:c_clinico_el_romosozumab_es_un`, `m5:c_clinico_el_romosozumab_es_un` |
| 21 | ¿La PTH destruye o forma hueso? | - | `m3:t_pth_el_efecto_depende_del_patron`, `m5:t_pth_la_misma_hormona_dos_efectos`, `m5:c_recuerda_la_pth_sostenida_destruye` |
| 22 | ¿Qué es el mecanostato de Frost? | - | `m3:t_mecanostato_mandibula`, `m3:tb_tabla_ventana_deformacion_aproximada_que`, `m3:c_recuerda_el_mecanostato_compara_la` |
| 23 | ¿Qué es el osteoide? | - | `m4:t_que_es_el_osteoide`, `m4:t_osteoide`, `m4:glosario:osteoide`, `m1:banco:10` |
| 24 | ¿Por qué el pirofosfato impide que se calcifique el tejido? | - | `m4:t_el_pirofosfato_inorganico_el_freno`, `m4:c_atencion_el_ppi_no_es_un_residuo_ni` |
| 25 | ¿Qué son las vesículas de matriz? | - | `m4:t_un_microrreactor_en_el_osteoide`, `m4:m4_video_vesiculas_nucleacion`, `m4:t_el_equipo_molecular_de_la_vesicula` |
| 26 | ¿De dónde sale la vitamina D y cómo se activa? | - | `m4:t_vitamina_d`, `m5:t_vitamina_d_el_aporte_de_mineral` |
| 27 | ¿Para qué sirve el marcaje con tetraciclina? | - | `m4:t_marcaje_doble_con_tetraciclina` |
| 28 | ¿Qué diferencia hay entre raquitismo y osteomalacia? | - | `m4:t_raquitismo_y_osteomalacia`, `m4:c_atencion_raquitismo_y_osteomalacia` |
| 29 | ¿Qué es la osteogénesis imperfecta? | - | `m4:t_osteogenesis_imperfecta_defecto_de_la`, `m4:c_clinico_en_la_osteogenesis` |
| 30 | ¿Cuáles son las fases del remodelado óseo? | - | `m5:t_las_seis_fases_del_ciclo`, `m5:c_recuerda_la_secuencia_es`, `m5:t_bmu_ciclo_2` |
| 31 | ¿Qué es una BMU? | - | `m5:t_para_que_se_renueva_un_hueso_ya_formado`, `m5:t_bmu_ciclo`, `m5:tb_tabla_bmu_cortical_bmu_trabecular_y` |
| 32 | ¿Cómo se acopla la resorción con la formación de hueso? | - | `m5:t_acoplamiento_formar_lo_que_se_resorbio`, `m5:tb_tabla_senal_de_donde_viene_que_hace_en`, `m5:t_acoplamiento_esclerostina` |
| 33 | ¿Qué le pasa al hueso en el lado de compresión cuando se mueve un diente? | - | `m5:t_alveolar_ortodoncia_2`, `m5:c_recuerda_resorcion_en_compresion_y`, `m5:t_el_movimiento_ortodontico_remodelado` |
| 34 | ¿Cuáles son las fases de la consolidación de una fractura? | - | `m5:t_las_cuatro_fases_de_la_reparacion`, `m5:m5_reparacion_fractura_video`, `m5:tb_dos_maneras_de_cicatrizar_una_fractura` |
| 35 | ¿Qué pasa con el alvéolo después de sacar un diente? | - | `m5:t_cicatrizacion_del_alveolo_postextraccion`, `m6:t_la_cascada_tras_la_perdida_de_un_diente` |
| 36 | ¿Qué es la osteopetrosis? | - | `m5:t_osteopetrosis_demasiado_hueso_poco`, `m5:t_para_profundizar_3` |
| 37 | ¿Qué es el T-score? | - | `m6:t_osteoporosis_3`, `m6:tb_cantidad_frente_a_calidad`, `m6:banco:1` |
| 38 | ¿Qué es el FRAX? | - | `m6:t_frax_y_factores_de_riesgo`, `m6:c_dato_segun_la_international` |
| 39 | ¿Qué relación hay entre la menopausia y la pérdida de hueso? | - | `m6:t_curva_y_menopausia`, `m6:t_hombres_y_mujeres`, `m6:m6_1_video_curva`, `m6:t_curva_y_menopausia_4`, `m6:c_clinico_los_estrogenos_tambien` |
| 40 | ¿Qué es la osteonecrosis de los maxilares por medicamentos? | - | `m6:t_osteonecrosis_de_los_maxilares_asociada`, `m6:t_prevenir_e_intervenir_3`, `m6:c_clinico_antes_de_iniciar_un` |
| 41 | ¿Qué hace la PTH? | `m5:m5_4_hormonas_remodelado` | `m5:t_pth_la_misma_hormona_dos_efectos`, `m5:tb_tabla_hormona_origen_y_estimulo_efecto`, `m5:t_hormonas_remodelado` |
| 42 | ¿Qué hace la PTH? | `m4:m4_7_homeostasis_ca_pi` | `m4:t_hormona_paratiroidea_pth`, `m4:tb_tabla_hormona_origen_estimulo_blanco`, `m4:c_recuerda_pth_sube_el_calcio_y_baja` |
| 43 | ¿Y por qué eso importa en la mandíbula? | `m4:m4_1_osteoide` | `m4:t_el_osteoide_en_la_mandibula` |
| 44 | explícame esto | `m3:m3_4_osteocito_sensor` | `m3:t_osteocito_sensor`, `m3:t_como_se_forma_y_que_lo_distingue`, `m3:t_el_sistema_lacuno_canalicular` |

## Conjunto reservado

| # | Pregunta | Contexto | Esperado |
|---|---|---|---|
| 45 | para q sirve la calcitonina | - | `m5:t_calcitonina_el_freno_rapido`, `m5:c_atencion_no_confundas_calcitonina`, `m4:t_calcitonina` |
| 46 | por que el hueso trabecular se renueva mas rapido que el cortical | - | `m1:c_clinico_como_el_hueso_trabecular`, `m5:tb_dos_tipos_de_hueso_dos_ritmos_de` |
| 47 | que son los canaliculos y las dendritas del osteocito | - | `m2:c_recuerda_laguna_es_el_espacio_del`, `m2:t_osteocito`, `m2:t_como_esta_construido`, `m2:tb_tabla_estructura_que_es_funcion` |
| 48 | diferencia entre osificacion intramembranosa y endocondral | - | `m3:tb_comparacion_de_las_dos_rutas`, `m3:t_dos_rutas`, `m2:tb_dos_maneras_de_formar_hueso_en_una_misma` |
| 49 | como se arma una fibrilla de colageno tipo 1 | - | `m4:t_de_la_celula_a_la_fibrilla_en_seis_pasos`, `m4:t_una_molecula_tres_cadenas` |
| 50 | que es la zona de hueco en el colageno | - | `m4:t_dos_zonas_en_cada_periodo` |
| 51 | la osteocalcina es una hormona? | - | `m1:t_el_hueso_como_organo_endocrino`, `m1:banco:7` |
| 52 | por que la fuerza excesiva en ortodoncia es mala para el hueso | - | `m5:t_fuerza_ligera_frente_a_fuerza_excesiva`, `m5:c_atencion_mas_fuerza_no_significa` |
| 53 | que es la enfermedad de Paget | - | `m5:t_enfermedad_de_paget_remodelado_focal_y`, `m5:t_para_profundizar_4` |
| 54 | que factores determinan el pico de masa osea | - | `m6:t_que_determina_el_pico`, `m6:c_dato_el_pico_de_masa_osea_es_la` |
| 55 | clasificacion de Cawood y Howell del reborde | - | `m6:t_mandibula_y_tiempo_2` |
| 56 | que le pasa al colageno con la edad glicacion | - | `m6:tb_que_cambia`, `m6:t_celulas_y_matriz` |
| 57 | por que duele una fractura si el hueso no siente | - | `m1:banco:17`, `m1:t_un_tejido_muy_vascularizado_e_inervado` |
| 58 | hueso inmaduro vs laminar | - | `m3:tb_tabla_caracteristica_hueso_inmaduro`, `m3:t_hueso_inmaduro_y_hueso_laminar`, `m1:t_como_se_ordenan_las_fibras_hueso`, `m1:tb_tabla_rasgo_hueso_entretejido_primario` |
| 59 | como se mueve un diente cuando se ponen brackets | - | `m5:t_alveolar_ortodoncia_2`, `m5:t_el_movimiento_ortodontico_remodelado`, `m5:t_alveolar_ortodoncia` |
| 60 | cuanto dura un ciclo de remodelado | - | `m5:t_bmu_ciclo`, `m5:t_bmu_ciclo_2`, `m5:t_las_seis_fases_del_ciclo` |
| 61 | que hormonas regulan el calcio en la sangre | - | `m4:t_homeostasis_ca_pi`, `m4:tb_tabla_hormona_origen_estimulo_blanco`, `m5:tb_tabla_hormona_origen_y_estimulo_efecto`, `m5:t_un_tejido_con_dos_exigencias` |
| 62 | papel de los estrogenos en el hueso | - | `m5:t_estrogenos_el_escudo_del_hueso`, `m6:t_hombres_y_mujeres`, `m6:c_clinico_los_estrogenos_tambien`, `m6:m6_1_video_curva` |
| 63 | que es la lamina dura en una radiografia | - | `m4:c_clinico_la_lamina_dura_en`, `m1:banco:19` |
| 64 | como llegan los nutrientes a los osteocitos que estan encerrados en la matriz | - | `m2:t_como_esta_construido`, `m2:t_osteocito`, `m3:t_el_sistema_lacuno_canalicular` |

## Conjunto ciego

| # | Pregunta | Contexto | Esperado |
|---|---|---|---|
| 65 | cuanto calcio hay guardado en el hueso | - | `m1:t_reservorio_de_calcio_y_fosforo`, `m1:c_atencion_que_el_99_del_calcio_este`, `m1:banco:4` |
| 66 | que es el periostio | - | `m1:t_periostio_y_endostio_las_dos_membranas` |
| 67 | como se une un implante dental al hueso de la mandibula | - | `m4:c_clinico_los_implantes_dentales_se` |
| 68 | para que sirve el borde festoneado del osteoclasto | - | `m2:t_un_gigante_multinucleado_y_polarizado`, `m2:t_como_reabsorbe_primero_el_mineral`, `m2:tb_tabla_componente_donde_esta_que_hace` |
| 69 | que hace la catepsina K | - | `m2:t_como_reabsorbe_primero_el_mineral`, `m2:tb_tabla_componente_donde_esta_que_hace`, `m5:banco:1` |
| 70 | que son las fibras de sharpey | - | `m2:t_fibras_de_sharpey_y_hueso_alveolar` |
| 71 | por que se pierde hueso en la periodontitis | - | `m2:c_clinico_en_la_periodontitis_la`, `m5:c_clinico_en_la_periodontitis_las` |
| 72 | el hueso alveolar propio es lo mismo que el proceso alveolar | - | `m1:c_atencion_el_hueso_alveolar_propio`, `m2:c_recuerda_el_hueso_alveolar_depende`, `m5:t_el_hueso_alveolar_un_hueso_que_depende` |
| 73 | que es la displasia cleidocraneal | - | `m3:c_clinico_la_displasia_cleidocraneal`, `m2:c_clinico_la_reduccion_de_runx2`, `m2:banco:9` |
| 74 | que sensores tiene el osteocito para detectar la deformacion, como piezo1 | - | `m3:tb_sensores_del_osteocito`, `m3:t_sensores_mensajeros` |
| 75 | diferencia entre modelado y remodelado | - | `m5:tb_tabla_modelado_remodelado`, `m5:t_un_hueso_terminado_no_es_un_hueso_quieto`, `m5:c_atencion_en_la_literatura_de` |
| 76 | el callo blando ya es hueso | - | `m5:c_atencion_el_callo_blando_no_es`, `m5:t_las_cuatro_fases_de_la_reparacion` |
| 77 | para que sirven los bisfosfonatos | - | `m2:c_clinico_los_bisfosfonatos_y_el`, `m4:c_dato_los_bisfosfonatos_son`, `m5:tb_tabla_diana_farmaco_efecto`, `m5:t_la_farmacologia_calca_la_biologia`, `m6:tb_tratamiento_actuar_sobre_el_mecanismo` |
| 78 | por que se pierde hueso en la mandibula de los adultos mayores sin dientes | - | `m6:t_la_cascada_tras_la_perdida_de_un_diente`, `m6:t_mandibula_y_tiempo`, `m6:t_mandibula_y_tiempo_2` |
| 79 | que es la hipofosfatasia | - | `m4:t_hipofosfatasia`, `m4:c_clinico_en_la_hipofosfatasia_falla`, `m4:c_clinico_en_la_hipofosfatasia_los` |
| 80 | cuanto mide el periodo D del colageno | - | `m4:t_dos_zonas_en_cada_periodo`, `m4:banco:3` |
| 81 | que marcadores de sangre indican formacion de hueso como el P1NP | - | `m4:tb_tabla_marcador_que_es_que_refleja_notas`, `m4:t_marcadores_bioquimicos_de_formacion`, `m4:c_recuerda_los_marcadores_de` |
| 82 | que pasa con los osteoclastos cuando faltan estrogenos | - | `m6:t_hombres_y_mujeres`, `m6:c_recuerda_rankl_se_une_a_rank_en_el`, `m5:t_estrogenos_el_escudo_del_hueso` |
| 83 | el odontologo puede detectar osteoporosis con una radiografia panoramica | - | `m6:c_clinico_el_odontologo_no_pide_una`, `m5:c_clinico_en_la_radiografia` |

## Fuera de tema

| # | Pregunta | Contexto | Esperado |
|---|---|---|---|
| 84 | ¿Cuál es la capital de Francia? | - | - |
| 85 | dame una receta de arepas con queso | - | - |
| 86 | ¿quién ganó el mundial de fútbol de 2014? | - | - |
| 87 | cómo hago un bucle for en Python | - | - |
| 88 | ¿cómo funciona el motor de un carro? | - | - |
| 89 | me duele mucho el estómago, ¿qué me tomo? | - | - |

