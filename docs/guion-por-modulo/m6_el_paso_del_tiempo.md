# Modulo 6: El paso del tiempo

> BORRADOR redactado por IA, pendiente de validación del docente. Fecha de redacción: 2026-09-23. Las marcas [verificar] señalan cifras aproximadas o datos que varían entre textos; se resuelven en la sección "Notas de verificacion para el docente".

## Ficha

- Modulo: 6 de 6
- Titulo: El paso del tiempo
- Foco: Envejecimiento y cambios degenerativos del tejido óseo.
- Densidad: media
- Duracion estimada: 40 minutos (rango de 35 a 45), contando la lectura y solo las actividades obligatorias [verificar]. Reparto orientativo: sección 6.1, 8 min; 6.2, 7 min; 6.3, 10 min; 6.4, 7 min; 6.5, 8 min (incluye la evaluación final). Las actividades opcionales añaden unos 10 minutos.
- Nivel: pregrado y posgrado de ciencias de la salud, con enfoque en el hueso mandibular.
- Conocimientos previos: módulos 1 a 5. En especial la mecanotransducción y el osteocito (módulo 3), la mineralización (módulo 4) y el remodelado con el eje RANKL/OPG (módulo 5).
- Logro que se otorga al completarlo: cronista ("Cronista").
- Requisito para el logro (propuesta, por acordar con el docente): completar todas las actividades con `obligatoria: true`, incluida la evaluación final `m6_5_evaluacion_final`, y alcanzar al menos el 70 % en ella.
- Numero de secciones: 5
- Puntaje maximo del modulo: 440 puntos en total (suma de los `puntaje_max`): 330 en actividades obligatorias y 110 en opcionales.

## Objetivos de aprendizaje

Al terminar el módulo, el estudiante podrá:

1. **Describir** las tres fases de la curva de la masa ósea (construcción, meseta y pérdida) y **explicar** cómo el pico y sus determinantes modifican el riesgo futuro de osteoporosis.
2. **Explicar** cómo el déficit de estrógenos de la menopausia altera el eje RANKL/OPG y acelera la pérdida de hueso.
3. **Relacionar** la senescencia de osteoblastos y osteocitos, la adipogénesis medular, el microdaño y la glicación con la pérdida de calidad de la matriz ósea.
4. **Diferenciar** cantidad de calidad ósea, **clasificar** un T-score en casos sencillos y **distinguir** el T-score del Z-score y de la estimación de riesgo de FRAX.
5. **Ordenar** la cascada de reabsorción del reborde alveolar tras la pérdida dentaria y **describir** los cambios de la mandíbula atrófica y de la articulación temporomandibular.
6. **Justificar** medidas de prevención y tratamiento a partir de los mecanismos de los módulos anteriores y **reconocer**, con prudencia clínica, la osteonecrosis de los maxilares asociada a medicamentos.

## Conexion con el hueso mandibular

La mandíbula es el lugar del esqueleto donde el paso del tiempo se ve y se palpa en la consulta odontológica. Las secciones 6.1 a 6.3 sientan las reglas biológicas con un recuadro clínico mandibular cada una, y las secciones 6.4 y 6.5 las aplican de lleno a la mandíbula:

- **El hueso alveolar existe gracias al diente.** Cuando el diente se pierde, el hueso que lo rodeaba deja de recibir carga y se reabsorbe. Es la adaptación a la carga (mecanotransducción, módulo 3) aplicada a la mandíbula, y da lugar a la atrofia del reborde (sección 6.4).
- **La mandíbula ofrece una ventana a la salud del esqueleto.** El grosor de la cortical inferior en una radiografía panorámica puede hacer sospechar baja densidad ósea y motivar una remisión. No diagnostica osteoporosis (secciones 6.3 y 6.4).
- **La relación entre osteoporosis y pérdida de dientes es una asociación, no una causa demostrada.** Hay factores compartidos, como la edad y el tabaco, y factores locales, como la periodontitis (sección 6.4).
- **La articulación temporomandibular se remodela con los años.** Muchos cambios son adaptativos y hay que distinguirlos de la enfermedad (sección 6.4).
- **Los fármacos que protegen el esqueleto pueden causar una complicación en los maxilares.** La osteonecrosis de los maxilares asociada a medicamentos obliga a coordinar al odontólogo con el médico tratante (sección 6.5).
- **Las reglas biológicas del envejecimiento óseo se aplican también al hueso mandibular.** La curva de la masa ósea, el déficit de estrógenos y la senescencia celular (secciones 6.1 y 6.2) valen para la mandíbula, que además responde a los dientes y a la carga masticatoria.

## Ilustraciones y modelos requeridos

Convenciones de producción: las imágenes se producen como **SVG multicapa** (un grupo `<g>` por capa, con el `id` exacto que aparece en esta tabla, con `tabindex="0"`, `role="button"` y `aria-label` igual a la etiqueta, y con una zona táctil de al menos 44 px). El único modelo 3D es la **mandíbula**, una sola malla: no hay piezas separadas, por eso sus estructuras se definen como **hotspots** con nombre y descripción (sección 6.4). Las células se dibujan en SVG. Todo lo dibujado es esquemático y sin escala salvo que se indique. En el texto, cada figura se inserta con la sintaxis de imagen de Markdown y el id de archivo, sin extensión.

| id de archivo | Que muestra | Capas o zonas (id = etiqueta) | Se usa en |
|---|---|---|---|
| `m6_curva_masa_osea` | Gráfico esquemático de la masa ósea frente a la edad, con la curva de mujeres y la de hombres, sus tres tramos y la menopausia | `eje_edad_masa` = Ejes: edad y masa ósea; `curva_mujer` = Curva en mujeres; `curva_hombre` = Curva en hombres; `fase_crecimiento` = Fase de construcción; `zona_pico_masa_osea` = Pico de masa ósea; `fase_meseta` = Meseta; `marca_menopausia` = Menopausia; `fase_perdida_acelerada` = Pérdida acelerada de la menopausia; `fase_perdida_lenta` = Pérdida lenta de la vejez; `umbral_fragilidad` = Umbral de fragilidad (esquemático); `curva_pico_mayor` = Curva con un pico mayor (línea punteada) | Actividad `m6_1_video_curva` y figura de la sección 6.1 |
| `m6_escena_estrogeno_rankl` | Escena celular esquemática: una célula osteoblástica, un precursor de osteoclasto, un linfocito T y la superficie ósea, con los receptores y las capas de animación de cada efecto | `superficie_osea` = Superficie ósea; `celula_osteoblastica` = Célula osteoblástica o estromal; `receptor_er_alfa` = Receptor de estrógeno ERα (intracelular); `rankl_membrana` = RANKL anclado en la membrana; `opg_soluble` = Osteoprotegerina (OPG); `linfocito_t` = Linfocito T; `precursor_osteoclasto` = Precursor de osteoclasto; `receptor_rank` = Receptor RANK; `receptor_cfms` = Receptor c-Fms (para M-CSF); `receptor_tnf` = Receptor de TNF (TNFR1); `osteoclasto_multinucleado` = Osteoclasto multinucleado; `laguna_resorcion` = Laguna de reabsorción; `efecto_estrogeno_rankl` = Animación: el estrógeno baja RANKL y, al retirarlo, se invierte; `efecto_opg_bloquea` = Animación: la OPG cubre a RANKL; `efecto_diferenciacion` = Animación: fusión y maduración del osteoclasto; `efecto_proliferacion` = Animación: aumento de precursores; `efecto_amplificacion_tnf` = Animación: amplificación por TNF-α | Actividad `m6_1_arrastre_estrogenos` |
| `m6_tejido_oseo_envejecido` | Corte transversal esquemático de hueso cortical envejecido con una osteona, un poro ampliado, la superficie endostal y la médula | `osteocito_senescente` = Osteocito senescente; `red_canalicular_reducida` = Red canalicular empobrecida; `laguna_mineralizada` = Laguna mineralizada (micropetrosis); `microfisura` = Microfisura; `poro_cortical` = Poro cortical ampliado; `medula_adiposa` = Médula con más grasa; `matriz_colageno_age` = Colágeno con productos de glicación (AGE); `superficie_osteoblastos_escasos` = Superficie con pocos osteoblastos | Actividad `m6_2_multicapa_tejido_envejecido` y figura de la sección 6.2 |
| `m6_hueso_normal_osteoporotico` | Dos paneles a la misma escala: un cuerpo vertebral en corte sagital y una cortical en corte transversal, en hueso normal (izquierda) y osteoporótico (derecha) | `trabeculas_normales` = Trabéculas conectadas (hueso normal); `trabeculas_osteoporoticas` = Trabéculas adelgazadas (hueso osteoporótico); `perforacion_trabecular` = Trabécula perforada o desconectada; `cortical_normal` = Cortical gruesa (hueso normal); `cortical_adelgazada` = Cortical adelgazada; `porosidad_cortical` = Porosidad cortical aumentada; `cavidad_medular_ampliada` = Cavidad medular ampliada; `colapso_vertebral` = Aplastamiento vertebral (fractura por fragilidad) | Actividad `m6_3_multicapa_normal_osteoporotico` y figura de la sección 6.3 |
| `m6_reborde_alveolar_cascada` | Seis cortes transversales (vestibulolinguales) de la región posterior del cuerpo mandibular, desde el diente presente hasta el reborde deprimido | `etapa_1_diente_presente` = Etapa 1 (Cawood y Howell, clase I): diente en su alvéolo; `etapa_2_alveolo_postextraccion` = Etapa 2 (clase II): alvéolo tras la extracción; `etapa_3_reborde_redondeado` = Etapa 3 (clase III): reborde redondeado; `etapa_4_reborde_filo_cuchillo` = Etapa 4 (clase IV): reborde en filo de cuchillo; `etapa_5_reborde_plano` = Etapa 5 (clase V): reborde plano; `etapa_6_reborde_deprimido` = Etapa 6 (clase VI): reborde deprimido; `ligamento_periodontal` = Ligamento periodontal; `hueso_alveolar_propio` = Hueso alveolar propio (hueso fasciculado); `carga_funcional` = Flechas de carga funcional; `conducto_mandibular` = Conducto mandibular | Actividad `m6_4_ordenar_reborde` (se muestra tras responder) y figura de la sección 6.4 |
| `m6_atm_cambios_degenerativos` | Corte sagital de la articulación temporomandibular en dos paneles: normal y con cambios degenerativos | `condilo_mandibular` = Cóndilo mandibular; `fosa_mandibular` = Fosa mandibular; `eminencia_articular` = Eminencia articular; `disco_articular` = Disco articular; `fibrocartilago_articular` = Fibrocartílago de superficie; `hueso_subcondral` = Hueso subcondral; `osteofito_condilar` = Osteofito; `aplanamiento_condilar` = Aplanamiento del cóndilo; `esclerosis_subcondral` = Esclerosis subcondral; `disco_desplazado` = Disco adelgazado o desplazado | Figura de la sección 6.4 |
| `m6_prevencion_mapa` | Esquema conceptual: el hueso como blanco, con las medidas de prevención y los fármacos conectados al mecanismo sobre el que actúan | `hueso_diana` = Hueso (blanco); `pilar_carga_mecanica` = Carga mecánica; `pilar_calcio` = Calcio; `pilar_vitamina_d` = Vitamina D; `pilar_habitos` = Hábitos (tabaco y alcohol); `pilar_caidas` = Prevención de caídas; `palanca_antirreabsortivos` = Fármacos antirreabsortivos; `palanca_anabolicos` = Fármacos anabólicos | Figura de la sección 6.5 |
| `mandibula` (modelo 3D) | Mandíbula humana adulta sin dientes, una sola malla. Provisional: `apps/web/public/models/mandibula_bodyparts3d.stl` (BodyParts3D FJ6399) | Hotspots: `cuerpo` = Cuerpo y borde inferior (hueso basal); `angulo` = Ángulo; `condilo` = Cóndilo (proceso condilar); `foramen_mentoniano` = Foramen mentoniano; `apofisis_alveolar` = Apófisis alveolar (reborde); `linea_milohioidea` = Línea milohioidea | Actividad `m6_4_mandibula_3d` |

### Notas de precision anatomica (para quien dibuja y modela)

- **`m6_curva_masa_osea`.** Es un modelo, no datos reales: el eje horizontal es la edad (0 a 90 años, con marcas cada 10) y el vertical, la masa ósea relativa, sin cifras. La curva de mujeres sube hasta un pico entre los 20 y los 30 años, se mantiene en una meseta suave hasta cerca de los 50, cae con más pendiente durante unos tres años, que empiezan cerca de un año antes de la marca de menopausia (aproximadamente 51 años) y terminan cerca de dos años después de ella, y luego sigue con una pendiente menor. La curva de hombres tiene un pico algo más alto y una pendiente gradual, sin quiebre. El umbral de fragilidad es una línea horizontal punteada, rotulada como esquemática y sin valor numérico. La curva con pico mayor tiene la misma forma, desplazada hacia arriba: debe verse que cruza el umbral más tarde. No escribir porcentajes en la imagen: van en el texto.
- **`m6_escena_estrogeno_rankl`.** Es conceptual y sin escala. El receptor de estrógeno ERα es **intracelular** (citoplasma y núcleo): dibujarlo dentro de la célula; el estrógeno lo alcanza atravesando la membrana en la animación. RANKL es una proteína anclada en la membrana de la célula osteoblástica (no dibujar su forma soluble). En la bandeja, la molécula arrastrable RANKL representa el RANKL que la célula presenta al precursor; el RANKL dibujado en la membrana es el sitio de unión de la OPG. Son el mismo ligando en dos papeles y la instrucción de la actividad lo dice. La OPG es soluble y se une a RANKL, no a RANK. RANK, c-Fms y TNFR1 son receptores de la superficie del precursor de osteoclasto (linaje monocito-macrófago). El osteoclasto maduro es multinucleado, con borde festoneado sobre la superficie ósea y una laguna de reabsorción bajo él. El linfocito T aparece inactivo y se activa en el estado sin estrógeno. Cada molécula arrastrable (estrógeno, RANKL, OPG, M-CSF, TNF-α, esclerostina, osteocalcina) tiene una forma y un color distintos en la bandeja.
- **`m6_tejido_oseo_envejecido`.** Corte transversal de hueso cortical: una osteona con conducto de Havers ampliado, laminillas concéntricas con lagunas y canalículos, y una línea cementante festoneada alrededor. Los osteocitos senescentes se distinguen por un color distinto; la laguna mineralizada se dibuja rellena y oscura, sin célula. La microfisura se dibuja en las laminillas intersticiales y se detiene en la línea cementante (las líneas cementantes frenan las grietas). En un extremo se ve la superficie endostal con pocos osteoblastos aplanados y, debajo, médula con adipocitos grandes de una sola gota de grasa. El colágeno con AGE se muestra en un recuadro ampliado: una fibrilla con puentes anormales entre moléculas, sin escala. Los tamaños celulares no son proporcionales.
- **`m6_hueso_normal_osteoporotico`.** Ambos paneles a la misma escala. Cuerpo vertebral en corte sagital con trabéculas verticales y horizontales. En la osteoporosis se adelgazan y se pierden primero las trabéculas horizontales, y quedan trabéculas verticales largas y desconectadas; la cortical se adelgaza. En la cortical en corte transversal, el hueso osteoporótico tiene una pared más delgada, poros más grandes y una cavidad medular más ancha; el contorno externo puede ser algo mayor (aposición perióstica parcial). El aplastamiento vertebral se dibuja en cuña, con más pérdida de altura por delante. No representar la osteoporosis solo como un tono más claro: lo esencial es la arquitectura.
- **`m6_reborde_alveolar_cascada`.** Cortes vestibulolinguales del cuerpo mandibular a la altura de un premolar o molar, en seis paneles a la misma escala. Etapa 1: diente con ligamento periodontal, hueso alveolar propio (línea densa junto al ligamento), tablas corticales y conducto mandibular bajo la raíz; flechas de carga desde el diente hacia el hueso. Etapa 2: alvéolo vacío, con el hueso alveolar propio todavía visible; las flechas de carga desaparecen desde aquí. Etapa 3: alvéolo relleno de hueso nuevo, sin lámina cribiforme; reborde redondeado. Etapa 4: reborde estrecho en filo de cuchillo. Etapa 5: reborde plano. Etapa 6: solo hueso basal delgado. En esta región posterior, dibujar ambas tablas corticales (vestibular y lingual) con grosor variable y no fijar la vestibular como la más delgada: ese patrón describe sitios anteriores y premolares, no los molares mandibulares, donde la cortical vestibular suele ser gruesa por la línea oblicua externa [verificar]. Hasta la etapa 5, el borde inferior de la mandíbula y el conducto mandibular **no cambian de posición**: lo que baja es la cresta, y por eso el conducto queda cada vez más cerca de ella. En la etapa 6 el propio hueso basal se adelgaza. Las seis etapas corresponden a las clases I a VI de Cawood y Howell.
- **`m6_atm_cambios_degenerativos`.** Corte sagital con la boca cerrada. Panel normal: cóndilo, fosa mandibular, eminencia articular y disco articular bicóncavo interpuesto (banda anterior, zona intermedia y banda posterior), con espacios articulares superior e inferior. Las superficies articulares se recubren de **fibrocartílago**, no de cartílago hialino: dibujarlas con una línea fina y no con una capa gruesa. Panel degenerativo: cóndilo aplanado, osteofito en el borde anterior, esclerosis subcondral (hueso subcondral más denso) y disco adelgazado y desplazado hacia delante.
- **`m6_prevencion_mapa`.** Esquema conceptual, no anatómico. El hueso va al centro; cada medida se conecta con una flecha al mecanismo que aprovecha (osteocito y esclerostina, mineral, absorción de calcio, osteoclasto, RANKL, vía Wnt). Los fármacos van aparte de la prevención, con etiquetas neutras y sin dosis.
- **`mandibula` (3D).** Una sola malla de hueso, sin dientes y sin atrofia: no modelar la pérdida ósea, el texto de cada hotspot la describe. Los hotspots son marcadores anclados a una posición del modelo; sus nombres son los `id` de la tabla y coinciden con los del módulo 1 donde se repiten. Posiciones sugeridas: `apofisis_alveolar` en el borde alveolar superior del cuerpo, en la zona posterior; `foramen_mentoniano` en la cara lateral del cuerpo, a la altura de los premolares; `cuerpo` en el borde inferior, a la altura del foramen mentoniano y por detrás de él; `angulo` en la esquina posteroinferior; `condilo` en la cabeza del proceso condilar; `linea_milohioidea` en la cara medial del cuerpo, como una cresta oblicua desde la zona del tercer molar hacia la sínfisis. Cualquier pantalla que muestre este modelo debe llevar la atribución exigida por la licencia CC BY-SA 2.1 JP (ver `docs/atribuciones.md`).

## Secciones

> Convenciones de este guion.
> - **Avisos.** Cada aviso empieza con una etiqueta que indica su tipo (Clinico, Dato, Atencion, Recuerda). La aplicación muestra la etiqueta con tilde.
> - **[verificar].** Marca una cifra aproximada o un dato que varía entre textos. No debe mostrarse al estudiante; se resuelve con el docente (sección "Notas de verificacion para el docente").
> - **Modos de multicapa.** En modo `explorar`, el estudiante descubre las capas tocándolas. En modo `identificar`, la aplicación pide tocar, una por una y en el orden de `requeridas`, cada estructura por su etiqueta.
> - **Interacción.** Nada depende del hover. En pantalla táctil se toca; con teclado, Tab y Mayús+Tab mueven el foco, Enter o Espacio activan y Escape cierra paneles. Cada actividad tiene una alternativa en lista para quien no pueda usar el gráfico.
> - **Retroalimentación.** Cada actividad define `retroalimentacion` (acierto y error). Las preguntas de quiz añaden su propia `explicacion`, que se muestra tras cada respuesta; en `relacion-columnas`, cada par lleva su `explicacion`.
> - **Ordenar pasos.** En `ordenar_pasos`, `pasos` se escribe en el orden correcto y `correcta` repite ese orden; la aplicación mezcla los pasos al mostrarlos.

### Seccion 6.1: La curva de la masa ósea y la menopausia

id "m6_1_curva_y_menopausia"

#### Contenido

Los huesos de los módulos anteriores no son iguales a los 20, a los 50 y a los 80 años. La cantidad de hueso sigue una curva con tres tramos: se construye, se mantiene y se pierde. Esa curva explica por qué la osteoporosis aparece tarde, pero se prepara temprano.

![Curva esquemática de la masa ósea a lo largo de la vida en mujeres y hombres, con el pico, la meseta y la pérdida acelerada de la menopausia](m6_curva_masa_osea)

*Figura 6.1. Curva esquemática de la masa ósea. Es un modelo, no los datos de una persona.*

**Los tres tramos**

| Tramo | Edad aproximada | Qué ocurre en el remodelado |
|---|---|---|
| Construcción | Infancia y adolescencia | La formación supera a la reabsorción. El ritmo máximo de acumulación ocurre en la pubertad. |
| Meseta | De los 20 a los 50 años, aproximadamente [verificar] | Formación y reabsorción casi en equilibrio, con cambios pequeños. |
| Pérdida | Desde la mediana edad | Cada ciclo de remodelado reabsorbe algo más de lo que forma. En las mujeres se acelera con la menopausia. |

> Dato: el pico de masa ósea es la mayor cantidad de hueso que alcanza una persona al terminar la maduración del esqueleto, entre la segunda y la tercera década según el sitio [verificar]. Alrededor del 90 % de ese pico se ha acumulado a los 18 años en las niñas y a los 20 en los niños [verificar].

**Qué determina el pico**

- **Genética:** aproximadamente entre el 60 y el 80 % de la variación entre personas [verificar].
- **Nutrición:** calcio, proteínas y vitamina D suficientes durante el crecimiento.
- **Actividad física:** la carga y el impacto en la infancia y la adolescencia.
- **Hormonas:** esteroides sexuales, hormona de crecimiento y momento de la pubertad.
- **Salud y hábitos:** las enfermedades crónicas, el bajo peso, algunos fármacos y el tabaco lo reducen.

> Recuerda: lo que se pierde después se resta del pico. Un pico alto retrasa el momento en que la masa ósea llega al umbral de fragilidad.

**Hombres y mujeres**

Los hombres alcanzan un pico algo mayor y pierden hueso de forma gradual. En las mujeres, la menopausia (en promedio hacia los 51 años [verificar]) añade una fase de pérdida acelerada: en un estudio longitudinal, la densidad de la columna lumbar bajó aproximadamente 2,5 % al año, y la del cuello femoral 1,8 % al año, durante los tres años de la transición (desde cerca de un año antes hasta cerca de dos años después de la última menstruación). Eso suma cerca del 7 % en la columna en ese lapso, y cerca del 10 % acumulado en unos diez años alrededor de la menopausia [verificar]. En toda la vida, una mujer puede perder hasta cerca del 50 % de su hueso trabecular y del 30 % del cortical; los hombres pierden menos [verificar].

**Por qué la menopausia acelera la pérdida**

Los estrógenos actúan como un freno del remodelado.

| | Con estrógenos | Sin estrógenos (menopausia) |
|---|---|---|
| RANKL y relación RANKL/OPG (linaje osteoblástico y linfocitos T) | Bajos | Aumentan |
| TNF-α, IL-1, IL-6 y M-CSF | Bajos | Aumentan; los linfocitos T producen más TNF-α |
| Osteoclastos | Menos y de vida más corta | Más numerosos y con mayor supervivencia |
| Osteoblastos y osteocitos | Protegidos de la apoptosis | Mayor apoptosis |
| Remodelado | Equilibrado | Más rápido, con saldo negativo |

El hueso trabecular, con más superficie de remodelado, es el que más pierde al principio.

> Recuerda: RANKL se une a RANK en el precursor y ordena la formación del osteoclasto; la OPG es el señuelo que atrapa a RANKL (módulo 5).

> Clinico: los estrógenos también protegen el hueso de los hombres. Parte proviene de la aromatización de la testosterona, y su descenso contribuye a la pérdida ósea con la edad.

> Clinico: la mandíbula sigue las mismas reglas que el resto del esqueleto. El hueso alveolar y la cortical inferior reflejan a la vez la pérdida sistémica de los años y factores locales (dientes, periodontitis, prótesis). Por eso el hueso de un paciente mayor no se interpreta solo por su edad (sección 6.4).

Recorre la curva paso a paso, arrastra las moléculas del eje estrógeno-RANKL-OPG y comprueba lo aprendido.

#### Actividades

##### Actividad m6_1_video_curva

```yaml
tipo: video-texto
titulo: "La vida de tu masa ósea"
instrucciones: "Avanza paso a paso con el botón Siguiente (o con la flecha derecha del teclado; en pantalla táctil también puedes deslizar el dedo hacia la izquierda). En cada paso, lee el texto y observa qué parte de la curva se resalta. Para completar la actividad debes llegar al último paso."
obligatoria: true
puntaje_max: 10
concepto: "Curva de la masa ósea: pico y declive"
retroalimentacion:
  acierto: "Bien. Ya sabes que la masa ósea se construye hasta un pico, se mantiene y luego se pierde, y que la menopausia acelera esa pérdida en las mujeres."
  error: "Te faltan pasos por ver. Llega hasta el último para completar la actividad."
ilustracion: m6_curva_masa_osea
nota: "Es una explicación animada sobre la ilustración SVG. Si el docente aporta un video real, se sustituirá manteniendo los mismos pasos."
pasos:
  - id: paso_1
    titulo: "Construir el esqueleto"
    texto_narrado: "Desde la infancia hasta el final de la adolescencia, el hueso se forma más rápido de lo que se reabsorbe. El ritmo máximo de acumulación de mineral ocurre en la pubertad. Alrededor del 90 % del pico se ha acumulado a los 18 años en las niñas y a los 20 en los niños [verificar]."
    cambia_en_escena: "Se dibujan los ejes y las dos curvas suben desde el origen; se resalta la fase de construcción."
    capas_visibles: [eje_edad_masa, curva_mujer, curva_hombre, fase_crecimiento]
  - id: paso_2
    titulo: "El pico de masa ósea"
    texto_narrado: "El pico es la mayor cantidad de hueso que tendrás en la vida. Se alcanza entre la segunda y la tercera década, según el sitio del esqueleto [verificar]. La genética explica aproximadamente entre el 60 y el 80 % de su variación; el resto depende de la nutrición, la actividad física, las hormonas y la salud [verificar]."
    cambia_en_escena: "Se marca la cima de las curvas con un círculo pulsante y la etiqueta «Pico de masa ósea»."
    capas_visibles: [eje_edad_masa, curva_mujer, curva_hombre, zona_pico_masa_osea]
  - id: paso_3
    titulo: "Una meseta que engaña"
    texto_narrado: "Entre los 20 y los 50 años, aproximadamente, la masa ósea cambia poco porque el remodelado está casi en equilibrio [verificar]. Aun así, cada ciclo puede dejar un pequeño saldo negativo, sobre todo en el hueso trabecular."
    cambia_en_escena: "Se resalta el tramo plano de las curvas con una banda de color."
    capas_visibles: [eje_edad_masa, curva_mujer, curva_hombre, fase_meseta]
  - id: paso_4
    titulo: "La curva se quiebra en las mujeres"
    texto_narrado: "Alrededor de la menopausia, que ocurre en promedio hacia los 51 años [verificar], la pérdida se acelera durante unos tres años. En un estudio longitudinal se midió aproximadamente 2,5 % al año en la columna lumbar y 1,8 % al año en el cuello femoral, desde cerca de un año antes hasta cerca de dos años después de la última menstruación [verificar]. En la columna eso suma cerca del 7 % en ese lapso [verificar]."
    cambia_en_escena: "Aparece la marca de la menopausia y la curva de mujeres empieza a caer con más pendiente poco antes de la marca y sigue así un par de años después; la banda de pérdida acelerada, que rodea la marca, se colorea en naranja."
    capas_visibles: [eje_edad_masa, curva_mujer, marca_menopausia, fase_perdida_acelerada]
  - id: paso_5
    titulo: "Pérdida lenta y sostenida"
    texto_narrado: "Después del tramo acelerado, la pérdida continúa a un ritmo menor en las mujeres. Los hombres no tienen un salto equivalente a la menopausia, pero también pierden hueso con la edad. A lo largo de la vida, una mujer puede perder hasta cerca de la mitad de su hueso trabecular y del 30 % del cortical [verificar]."
    cambia_en_escena: "Las dos curvas descienden con pendiente suave; se resalta el tramo final de ambas y se superpone la curva de hombres con línea continua."
    capas_visibles: [eje_edad_masa, curva_mujer, curva_hombre, fase_perdida_lenta]
  - id: paso_6
    titulo: "Subir el techo y frenar el ritmo"
    texto_narrado: "Un pico más alto desplaza toda la curva hacia arriba y retrasa el momento en que se cruza el umbral de fragilidad. Por eso la prevención empieza en la infancia. En la adultez, el objetivo cambia: frenar el ritmo de pérdida."
    cambia_en_escena: "Aparece la línea punteada del umbral de fragilidad y una copia de la curva desplazada hacia arriba; se ve que esa copia cruza el umbral más tarde."
    capas_visibles: [eje_edad_masa, curva_mujer, umbral_fragilidad, curva_pico_mayor]
```

##### Actividad m6_1_arrastre_estrogenos

```yaml
tipo: arrastre-molecular
titulo: "Estrógeno, RANKL y OPG: el control de los osteoclastos"
instrucciones: "Arrastra cada molécula hasta el receptor o el sitio de unión que la reconoce y observa qué ocurre en el hueso (en pantalla táctil, mantén el dedo sobre la molécula y arrástrala; con teclado, selecciona la molécula con Enter, muévete entre los receptores con Tab y confirma con Enter). Ojo: no todas las moléculas encajan en algún receptor de esta escena. El RANKL de la bandeja es el que la célula osteoblástica presenta al precursor; el RANKL fijo en su membrana es el sitio donde se une la OPG. Cuando acoples el estrógeno con su receptor, verás además qué pasa cuando el estrógeno desaparece."
obligatoria: true
puntaje_max: 40
concepto: "Estrógenos, RANKL y OPG"
retroalimentacion:
  acierto: "Muy bien. El estrógeno mantiene baja la relación RANKL/OPG y así limita cuántos osteoclastos se forman. Cuando falta, RANKL y las citocinas ganan terreno y el remodelado se inclina hacia la reabsorción."
  error: "Esa molécula no se une a ese receptor. Recuerda quién señala a quién: RANKL se une a RANK, y la OPG se une a RANKL, no a RANK. Piensa qué célula produce cada molécula y en qué célula está su receptor; cada intento fallido resta puntos."
escena:
  svg: m6_escena_estrogeno_rankl
  descripcion: "Arriba a la izquierda, una célula osteoblástica con un receptor de estrógeno dentro y moléculas de RANKL ancladas en su membrana (sitio de unión de la OPG; el RANKL que se arrastra hacia RANK es el mismo ligando, presentado al precursor). Al centro, un precursor de osteoclasto con tres receptores en su superficie: RANK, c-Fms y receptor de TNF. A la derecha, un linfocito T en reposo. Abajo, la superficie ósea intacta. Bajo la escena están las moléculas para arrastrar."
moleculas:
  - id: estrogeno
    nombre: "Estrógeno (17β-estradiol)"
    descripcion: "Hormona sexual que cae de forma marcada en la menopausia."
  - id: rankl
    nombre: "RANKL"
    descripcion: "Ligando de la familia del TNF que producen las células del linaje osteoblástico y los linfocitos T. Aquí representa el RANKL que se presenta al precursor de osteoclasto."
  - id: opg
    nombre: "Osteoprotegerina (OPG)"
    descripcion: "Proteína soluble que producen las células del linaje osteoblástico."
  - id: mcsf
    nombre: "M-CSF"
    descripcion: "Factor estimulante de colonias de macrófagos, producido por células del linaje osteoblástico y del estroma."
  - id: tnf_alfa
    nombre: "TNF-α"
    descripcion: "Citocina inflamatoria que producen los linfocitos T activados y otras células inmunitarias."
  - id: esclerostina
    nombre: "Esclerostina"
    descripcion: "Proteína producida por los osteocitos."
  - id: osteocalcina
    nombre: "Osteocalcina"
    descripcion: "Proteína no colágena de la matriz que secretan los osteoblastos."
receptores:
  - id: receptor_er_alfa
    nombre: "Receptor de estrógeno ERα de la célula osteoblástica"
    descripcion: "Receptor intracelular de la célula del linaje osteoblástico."
  - id: rankl_membrana
    nombre: "RANKL anclado en la membrana de la célula osteoblástica"
    descripcion: "Sitio de unión al que llega el señuelo soluble."
  - id: receptor_rank
    nombre: "RANK del precursor de osteoclasto"
    descripcion: "Receptor de superficie del precursor, de la línea monocito-macrófago."
  - id: receptor_cfms
    nombre: "c-Fms del precursor de osteoclasto"
    descripcion: "Receptor de superficie del precursor para el factor de colonias de macrófagos."
  - id: receptor_tnf
    nombre: "Receptor de TNF (TNFR1) del precursor"
    descripcion: "Receptor de superficie del precursor para la citocina TNF-α."
pares:
  - molecula: estrogeno
    receptor: receptor_er_alfa
    efecto:
      titulo: "El estrógeno frena la formación de osteoclastos"
      descripcion: "Al unirse a su receptor, el estrógeno reduce la expresión de RANKL y de citocinas como IL-1, IL-6, TNF-α y M-CSF; en modelos celulares favorece además a la OPG. La relación RANKL/OPG baja. También favorece la apoptosis de los osteoclastos y protege de la apoptosis a osteoblastos y osteocitos. Resultado: menos osteoclastos y remodelado en equilibrio. Sin estrógeno ocurre lo contrario."
      que_se_anima: "Con el estrógeno acoplado, las moléculas de RANKL de la membrana se atenúan (efecto principal) y aparecen algunas moléculas de OPG (efecto secundario); el precursor de osteoclasto permanece quieto. Después el estrógeno se desvanece durante unos segundos y el cuadro se invierte: RANKL vuelve en mayor número, la OPG disminuye y el linfocito T se activa y libera TNF-α."
      capa_animada: efecto_estrogeno_rankl
  - molecula: opg
    receptor: rankl_membrana
    efecto:
      titulo: "La OPG atrapa a RANKL"
      descripcion: "La osteoprotegerina es un receptor señuelo soluble: se une a RANKL y lo bloquea antes de que llegue a RANK. Sin la unión RANKL-RANK, el precursor no se diferencia en osteoclasto. Lo que importa es la relación RANKL/OPG: en el déficit de estrógenos esa relación sube."
      que_se_anima: "Moléculas de OPG cubren el RANKL de la membrana y un indicador de la relación RANKL/OPG baja hasta la zona verde. Si se retiran, el indicador sube a la zona roja."
      capa_animada: efecto_opg_bloquea
  - molecula: rankl
    receptor: receptor_rank
    efecto:
      titulo: "RANKL-RANK: la orden de formar un osteoclasto"
      descripcion: "RANKL se une a RANK en el precursor y, junto con M-CSF, activa su diferenciación y su fusión hacia un osteoclasto multinucleado capaz de reabsorber. Cuando hay más RANKL que OPG, este paso se favorece."
      que_se_anima: "El precursor se fusiona con dos precursores vecinos, se vuelve multinucleado, se adhiere a la superficie ósea y aparece una laguna de reabsorción bajo él."
      capa_animada: efecto_diferenciacion
  - molecula: mcsf
    receptor: receptor_cfms
    efecto:
      titulo: "M-CSF: supervivencia y proliferación de los precursores"
      descripcion: "El factor de colonias de macrófagos se une a c-Fms y mantiene vivos y en división a los precursores de la línea monocito-macrófago. Sin M-CSF no hay suficientes precursores para formar osteoclastos, aunque haya RANKL."
      que_se_anima: "Aumenta el número de precursores junto a la célula osteoblástica y un contador de precursores sube."
      capa_animada: efecto_proliferacion
  - molecula: tnf_alfa
    receptor: receptor_tnf
    efecto:
      titulo: "TNF-α: un amplificador de la reabsorción"
      descripcion: "En el déficit de estrógenos, los linfocitos T producen más TNF-α. Actúa sobre los precursores y sobre las células del linaje osteoblástico: potencia la respuesta a RANKL y a M-CSF, estimula la producción de más RANKL, IL-1 e IL-6, e inhibe la formación de osteoblastos."
      que_se_anima: "El linfocito T emite TNF-α; aparecen flechas de amplificación hacia RANKL y M-CSF y la laguna de reabsorción se ensancha."
      capa_animada: efecto_amplificacion_tnf
distractores:
  - molecula: esclerostina
    por_que: "La producen los osteocitos y actúa sobre la vía Wnt: se une a LRP5 y LRP6 en osteoblastos y osteocitos y frena la formación de hueso y, de forma indirecta, puede favorecer la reabsorción [verificar]. Pero ningún receptor de esta escena es LRP5 o LRP6, y no es ligando de ERα, RANK, c-Fms ni del receptor de TNF."
  - molecula: osteocalcina
    por_que: "Es una proteína de la matriz que secretan los osteoblastos y se une a la hidroxiapatita; se usa como marcador de formación ósea. No es un ligando de ERα, RANK, c-Fms ni del receptor de TNF."
```

##### Actividad m6_1_quiz_curva

```yaml
tipo: quiz
titulo: "Comprueba la curva de la masa ósea"
instrucciones: "Responde las tres preguntas. Al elegir tu respuesta verás enseguida si es correcta y por qué. Puedes responder tocando la opción o moviéndote con Tab y pulsando Enter. Esta actividad es opcional."
obligatoria: false
puntaje_max: 20
concepto: "Pico de masa ósea y menopausia"
retroalimentacion:
  acierto: "Correcto. La masa ósea se construye hasta un pico en la juventud, y la menopausia acelera la pérdida por el déficit de estrógenos."
  error: "Revisa la sección: el pico se alcanza entre la segunda y la tercera década, un pico alto retrasa la osteoporosis y la menopausia acelera la pérdida por la caída de los estrógenos."
preguntas:
  - id: m6_1_q1
    formato: opcion_multiple
    enunciado: "¿Cuándo se alcanza, aproximadamente, el pico de masa ósea?"
    opciones:
      - id: a
        texto: "Al nacer; a partir de ahí solo se pierde hueso durante toda la vida."
      - id: b
        texto: "Alrededor de los 50 años, justo antes de que empiece la menopausia."
      - id: c
        texto: "Entre la segunda y la tercera década, según el sitio del esqueleto."
      - id: d
        texto: "Hacia los 65 años, cuando el remodelado se estabiliza por completo."
    correcta: c
    explicacion: "El pico se alcanza al terminar la maduración del esqueleto, entre la segunda y la tercera década. Antes de eso la formación supera a la reabsorción; después, el balance se inclina poco a poco hacia la pérdida."
    dificultad: 1
    concepto: "Pico de masa ósea"
  - id: m6_1_q2
    formato: verdadero_falso
    enunciado: "Un pico de masa ósea mayor en la juventud retrasa el momento en que la pérdida asociada a la edad cruza el umbral de fragilidad."
    correcta: verdadero
    explicacion: "Es verdadero. Toda la curva se desplaza hacia arriba: hay más hueso de partida, así que la misma pérdida tarda más en llegar al umbral en el que aumenta el riesgo de fractura."
    dificultad: 1
    concepto: "Determinantes del pico de masa ósea"
  - id: m6_1_q3
    formato: opcion_multiple
    enunciado: "¿Qué ocurre con la velocidad de pérdida de hueso alrededor de la menopausia?"
    opciones:
      - id: a
        texto: "Se acelera durante unos años, sobre todo en el hueso trabecular."
      - id: b
        texto: "Se detiene porque la formación aumenta para compensar."
      - id: c
        texto: "No cambia respecto de los 30 años, porque solo depende de la edad."
      - id: d
        texto: "Disminuye porque los estrógenos suben durante el climaterio."
    correcta: a
    explicacion: "La caída de los estrógenos aumenta el remodelado con saldo negativo. El ritmo de pérdida sube durante unos años, más en el hueso trabecular, y luego se hace más lento."
    dificultad: 2
    concepto: "Menopausia y pérdida ósea"
```

### Seccion 6.2: Células y matriz que envejecen

id "m6_2_celulas_y_matriz"

#### Contenido

La menopausia no lo explica todo. En mujeres y en hombres, con los años cambian las células que forman y mantienen el hueso y cambia la matriz que ellas producen. El resultado es un hueso con menos cantidad y, además, con peor calidad.

![Corte esquemático de hueso cortical envejecido con osteocitos senescentes, una microfisura, un poro ampliado y una médula con más grasa](m6_tejido_oseo_envejecido)

*Figura 6.2. Hueso cortical envejecido (esquema, sin escala). En la actividad puedes explorar cada estructura.*

**Qué cambia**

| Cambio | Qué ocurre | Consecuencia |
|---|---|---|
| Osteoblastos: menos y menos activos | Las células madre mesenquimales de la médula se desvían más hacia adipocitos que hacia osteoblastos. | Menos formación y más grasa en la médula (adipogénesis medular). |
| Osteocitos: senescencia y muerte | Aumentan los osteocitos senescentes y la apoptosis; la densidad de lagunas baja, muchas se rellenan de mineral (micropetrosis) y la red de canalículos se empobrece. | El hueso percibe peor la carga y el daño. La esclerostina circulante aumenta con la edad [verificar] y frena la formación. |
| Células senescentes | Acumulan un secretoma inflamatorio (SASP) que favorece la reabsorción y frena la formación. | En ratones, eliminarlas reduce la pérdida de hueso; en humanos la evidencia es más limitada [verificar]. |
| Microfisuras | El microdaño es normal, pero se acumula si el osteocito lo detecta peor y el remodelado que lo repara se retrasa. | Una matriz más frágil, que se rompe con menos energía. |
| Glicación (AGE) | Azúcares se unen al colágeno sin enzimas y forman enlaces y aductos anormales. Aumentan con la edad, la diabetes y la enfermedad renal. | El colágeno pierde flexibilidad y el hueso, tenacidad. Falta aclarar si los AGE causan fracturas o solo marcan el envejecimiento [verificar]. |
| Calidad de la matriz | Cambian la mineralización, los cristales y los enlaces del colágeno. Con recambio alto la matriz es más joven y menos mineralizada; con recambio bajo, más vieja y más mineralizada. | Hueso más frágil aunque su densidad parezca aceptable [verificar]. |

En la estructura, la cortical se vuelve más porosa y las trabéculas se adelgazan y se desconectan; lo verás en la sección siguiente.

> Dato: los enlaces enzimáticos, hechos por la lisil oxidasa, maduran el colágeno de forma ordenada y son normales. Los AGE se forman sin enzimas (reacción de Maillard) y de forma menos ordenada; un ejemplo es la pentosidina. No son lo mismo.

> Dato: para quien quiera profundizar. El destino de la célula madre mesenquimal depende de dos factores de transcripción que se antagonizan: RUNX2 impulsa la vía del osteoblasto y PPARγ la del adipocito. El secretoma de las células senescentes se llama SASP.

> Recuerda: el osteocito es el sensor de carga y el coordinador del remodelado (módulos 3 y 5). Cuando envejece, se deterioran tanto la detección del daño como su reparación.

> Clinico: en la mandíbula, el osteocito del hueso alveolar percibe la carga de la masticación que le llega por el ligamento periodontal. Cuando el diente se pierde, esa señal desaparece (sección 6.4).

Explora ahora el corte de hueso envejecido y comprueba lo aprendido.

#### Actividades

##### Actividad m6_2_multicapa_tejido_envejecido

```yaml
tipo: multicapa
titulo: "Explora un hueso que envejece"
instrucciones: "Toca cada estructura del corte para leer qué le ocurre al envejecer (con teclado, usa Tab para pasar de una a otra y Enter para abrir su descripción; también puedes usar la lista de estructuras bajo la imagen). Visita al menos las cinco estructuras marcadas como requeridas."
obligatoria: true
puntaje_max: 30
concepto: "Envejecimiento celular y de la matriz"
retroalimentacion:
  acierto: "Muy bien. Ya reconoces los cambios celulares y de la matriz que reducen la calidad del hueso, incluso cuando la densidad todavía parece aceptable."
  error: "Todavía quedan estructuras por visitar. Revisa las que no han cambiado de color: cada una explica un cambio distinto del hueso envejecido."
svg: m6_tejido_oseo_envejecido
modo: explorar
capas:
  - id: osteocito_senescente
    etiqueta: "Osteocito senescente"
    descripcion: "Osteocito que dejó de funcionar bien y secreta un cóctel inflamatorio (SASP) que favorece la reabsorción y frena la formación. Con la edad aumentan los osteocitos senescentes y también su muerte por apoptosis."
  - id: red_canalicular_reducida
    etiqueta: "Red canalicular empobrecida"
    descripcion: "Los canalículos que conectan a los osteocitos se pierden o se obstruyen. Se reduce el flujo de líquido que el osteocito usa para percibir la carga y el daño."
  - id: laguna_mineralizada
    etiqueta: "Laguna mineralizada (micropetrosis)"
    descripcion: "Laguna de un osteocito muerto rellena de mineral. Es más frecuente con la edad. Marca una zona sin célula que vigile la matriz, y la vuelve más quebradiza."
  - id: microfisura
    etiqueta: "Microfisura"
    descripcion: "Grieta microscópica producida por la carga cotidiana. En el hueso joven se detecta y se repara con un remodelado dirigido; en el hueso envejecido se acumula porque la detección y la reparación fallan."
  - id: poro_cortical
    etiqueta: "Poro cortical ampliado"
    descripcion: "Conducto vascular (de Havers) ensanchado por reabsorción dentro de la cortical y desde su cara interna. La cortical se vuelve más porosa y más delgada."
  - id: medula_adiposa
    etiqueta: "Médula con más grasa"
    descripcion: "Aumentan los adipocitos de la médula a costa de los osteoblastos: las células madre mesenquimales se desvían hacia la vía de PPARγ en vez de la de RUNX2. Los adipocitos secretan señales que pueden frenar aún más la formación."
  - id: matriz_colageno_age
    etiqueta: "Colágeno con productos de glicación (AGE)"
    descripcion: "Fibras de colágeno con enlaces y aductos de glicación, como la pentosidina. Rigidizan el colágeno y disminuyen la energía que el hueso puede absorber antes de romperse."
  - id: superficie_osteoblastos_escasos
    etiqueta: "Superficie con pocos osteoblastos"
    descripcion: "En el hueso envejecido hay menos osteoblastos activos sobre la superficie ósea. Cada ciclo de remodelado repone menos hueso del que se reabsorbió."
requeridas: [osteocito_senescente, laguna_mineralizada, microfisura, medula_adiposa, matriz_colageno_age]
```

##### Actividad m6_2_quiz_envejecimiento

```yaml
tipo: quiz
titulo: "Comprueba el envejecimiento del hueso"
instrucciones: "Responde las cuatro preguntas. Tras cada respuesta verás la explicación. Puedes responder tocando la opción o moviéndote con Tab y pulsando Enter. Esta actividad es opcional."
obligatoria: false
puntaje_max: 20
concepto: "Envejecimiento celular y de la matriz"
retroalimentacion:
  acierto: "Correcto. Menos osteoblastos, osteocitos que envejecen, microdaño acumulado y matriz glicada explican la pérdida de calidad del hueso."
  error: "Revisa la tabla de cambios: cada fila combina una alteración celular o de la matriz con su consecuencia para la resistencia del hueso."
preguntas:
  - id: m6_2_q1
    formato: opcion_multiple
    enunciado: "¿Qué cambio celular de la médula envejecida contribuye a formar menos hueso?"
    opciones:
      - id: a
        texto: "Las células madre mesenquimales se desvían más hacia adipocitos que hacia osteoblastos."
      - id: b
        texto: "Los osteoblastos maduros se transforman en osteoclastos y reabsorben la matriz."
      - id: c
        texto: "Los adipocitos medulares producen más colágeno tipo I para reparar la matriz dañada."
      - id: d
        texto: "Los osteocitos se convierten en células madre para compensar la pérdida de osteoblastos."
    correcta: a
    explicacion: "RUNX2 impulsa la vía del osteoblasto y PPARγ la del adipocito, y se antagonizan. Con la edad la balanza se inclina hacia el adipocito: hay más grasa en la médula y menos osteoblastos disponibles."
    dificultad: 2
    concepto: "Adipogénesis medular"
  - id: m6_2_q2
    formato: opcion_multiple
    enunciado: "¿Qué son los productos de glicación avanzada (AGE) en el hueso?"
    opciones:
      - id: a
        texto: "Enlaces enzimáticos de la lisil oxidasa que maduran el colágeno de forma ordenada y controlada."
      - id: b
        texto: "Cristales de hidroxiapatita que se depositan de manera desordenada en la matriz mineralizada."
      - id: c
        texto: "Enlaces y aductos formados sin enzimas entre azúcares y colágeno, que se acumulan con la edad."
      - id: d
        texto: "Proteínas que el osteocito libera para inhibir la vía Wnt y frenar la formación de hueso."
    correcta: c
    explicacion: "Los AGE, como la pentosidina, se forman por reacciones no enzimáticas (reacción de Maillard). Aumentan con la edad, la diabetes y la enfermedad renal, y se asocian con menor tenacidad de la matriz. Los enlaces enzimáticos son un proceso normal y distinto."
    dificultad: 2
    concepto: "Glicación de la matriz"
  - id: m6_2_q3
    formato: verdadero_falso
    enunciado: "En el hueso envejecido se acumulan más microfisuras, en parte porque el osteocito detecta peor el daño y el remodelado que lo repara se retrasa."
    correcta: verdadero
    explicacion: "Es verdadero. El microdaño es normal, pero el hueso joven lo repara con un remodelado dirigido que el osteocito coordina. Con la edad, el osteocito envejece y se pierde la red canalicular, así que el daño se detecta y repara peor."
    dificultad: 2
    concepto: "Microdaño acumulado"
  - id: m6_2_q4
    formato: opcion_multiple
    enunciado: "¿Qué es la micropetrosis?"
    opciones:
      - id: a
        texto: "La formación de una osteona nueva alrededor de una microfisura."
      - id: b
        texto: "El relleno con mineral de la laguna de un osteocito que murió."
      - id: c
        texto: "La ruptura de una trabécula por una carga excesiva."
      - id: d
        texto: "El aumento de la cavidad medular por reabsorción desde su cara interna."
    correcta: b
    explicacion: "En la micropetrosis, la laguna de un osteocito muerto se llena de mineral. Aumenta con la edad y deja zonas de matriz sin una célula que las vigile, más frágiles."
    dificultad: 2
    concepto: "Micropetrosis"
```

### Seccion 6.3: Osteoporosis: calidad, cantidad y riesgo

id "m6_3_osteoporosis"

#### Contenido

Con menos hueso y peor calidad, la resistencia cae hasta que una caída leve, o un esfuerzo cotidiano, produce una fractura. Eso es la osteoporosis.

> Dato: el consenso del NIH (conferencia de 2000, publicada en JAMA en 2001) la define como un trastorno de la resistencia ósea que predispone a un mayor riesgo de fractura. La resistencia integra la densidad y la calidad del hueso.

![Comparación esquemática de un cuerpo vertebral y de una cortical, normales y osteoporóticos](m6_hueso_normal_osteoporotico)

*Figura 6.3. Hueso normal (izquierda) y osteoporótico (derecha), en esquema. En la actividad puedes explorar cada capa.*

**Cantidad frente a calidad**

| | Cantidad | Calidad |
|---|---|---|
| Qué es | Cuánto mineral hay por unidad de área | Cómo está construido y cómo se mantiene el hueso |
| Ejemplos | Densidad mineral ósea (DMO) | Microarquitectura y geometría, recambio, microdaño, mineralización, colágeno y sus enlaces |
| Cómo se evalúa | Con DXA | Se infiere con factores clínicos y técnicas complementarias; la DXA la mide mal |

La DMO explica aproximadamente el 70 % de la resistencia ósea; el resto depende de la calidad [verificar]. Por eso hay personas con densidad casi normal que se fracturan, por ejemplo en la diabetes tipo 2 de larga evolución [verificar]. En la osteoporosis las trabéculas se adelgazan y se desconectan (primero las horizontales), la cortical se adelgaza y se vuelve porosa, y la cavidad medular crece. Puede ser primaria (posmenopáusica y del envejecimiento) o secundaria a enfermedades y fármacos; el déficit de estrógenos contribuye a ambas formas primarias (modelo unitario de Riggs).

**Diagnóstico por DXA**

La absorciometría de rayos X de doble energía (DXA) mide la densidad mineral ósea por área (g/cm²) en la columna lumbar y la cadera, y en el antebrazo si esos sitios no se pueden medir. Se compara con dos referencias:

- **T-score:** desviaciones estándar respecto de la media de adultos jóvenes sanos, de 20 a 29 años [verificar].
- **Z-score:** desviaciones estándar respecto de personas de la misma edad y sexo.

| Categoría de la OMS (mujeres posmenopáusicas y hombres de 50 años o más) | T-score |
|---|---|
| Normal | −1,0 o más |
| Baja masa ósea (osteopenia) | Entre −1,0 y −2,5 |
| Osteoporosis | −2,5 o menos |
| Osteoporosis grave (establecida) | −2,5 o menos y una o más fracturas por fragilidad |

En mujeres premenopáusicas, hombres menores de 50 años y niños se prefiere el Z-score. Un valor de −2,0 o menor se describe como «por debajo del rango esperado para la edad»; no se diagnostica osteoporosis solo por la densidad.

> Atencion: la DXA es una proyección en dos dimensiones. Los osteofitos, las calcificaciones de la aorta y los cambios degenerativos pueden elevar de forma falsa la densidad de la columna en personas mayores, y no mide la calidad del hueso. Una parte considerable de las fracturas por fragilidad ocurre con un T-score por encima de −2,5 [verificar].

> Clinico: una fractura por fragilidad de cadera o de vértebra (por una caída desde la altura de pie o menos) permite diagnosticar osteoporosis, sea cual sea el T-score [verificar].

**FRAX y factores de riesgo**

FRAX estima la probabilidad a 10 años de una fractura osteoporótica mayor (columna clínica, cadera, antebrazo o húmero) y de una fractura de cadera, en personas de 40 a 90 años. Combina edad, sexo, índice de masa corporal y estos factores: fractura previa por fragilidad, fractura de cadera en los padres, tabaquismo actual, glucocorticoides sistémicos, artritis reumatoide, otras causas de osteoporosis secundaria y alcohol (tres o más unidades al día). El T-score del cuello femoral es opcional. Cada país fija sus umbrales de intervención [verificar].

| Grupo | Ejemplos |
|---|---|
| No modificables | Edad, sexo femenino, menopausia, fractura de cadera en los padres, fractura previa por fragilidad |
| Modificables | Tabaquismo, alcohol elevado, sedentarismo o inmovilización, bajo peso, poco calcio, déficit de vitamina D, caídas |
| Enfermedades | Hipertiroidismo, hiperparatiroidismo, hipogonadismo, artritis reumatoide, diabetes, enfermedad celíaca, enfermedad renal crónica |
| Fármacos | Glucocorticoides sistémicos prolongados, inhibidores de la aromatasa, deprivación de andrógenos |

> Dato: según la International Osteoporosis Foundation, aproximadamente 1 de cada 3 mujeres y 1 de cada 5 hombres mayores de 50 años sufrirá una fractura osteoporótica a lo largo de la vida [verificar].

> Clinico: el odontólogo no pide una DXA, pero puede ver una pista. En la radiografía panorámica, una cortical inferior de la mandíbula delgada o erosionada puede sugerir baja densidad ósea y ser motivo para remitir al paciente a su médico. No diagnostica osteoporosis (sección 6.4).

Explora ahora la comparación entre hueso normal y osteoporótico, relaciona los factores de riesgo con su mecanismo y, si quieres, practica el diagnóstico.

#### Actividades

##### Actividad m6_3_multicapa_normal_osteoporotico

```yaml
tipo: multicapa
titulo: "Hueso normal frente a hueso osteoporótico"
instrucciones: "Toca cada capa para leer qué muestra y compara el panel normal con el osteoporótico (con teclado, usa Tab para pasar de una capa a otra y Enter para abrir su descripción; también puedes usar la lista de capas bajo la imagen). Visita al menos las cinco capas marcadas como requeridas."
obligatoria: true
puntaje_max: 30
concepto: "Osteoporosis: calidad frente a cantidad"
retroalimentacion:
  acierto: "Muy bien. Ya ves que la osteoporosis no es solo menos mineral: cambian la arquitectura de las trabéculas, el grosor y la porosidad de la cortical, y el riesgo de fractura."
  error: "Todavía quedan capas por visitar. Compara siempre el panel normal con el osteoporótico: fíjate en la conectividad de las trabéculas y en el grosor de la cortical."
svg: m6_hueso_normal_osteoporotico
modo: explorar
capas:
  - id: trabeculas_normales
    etiqueta: "Trabéculas conectadas (hueso normal)"
    descripcion: "En el hueso normal, las trabéculas verticales y horizontales forman una red interconectada que reparte la carga y se apoya entre sí."
  - id: trabeculas_osteoporoticas
    etiqueta: "Trabéculas adelgazadas (hueso osteoporótico)"
    descripcion: "Las trabéculas se adelgazan y se pierden primero las horizontales. Las verticales quedan largas y sin apoyo, y resisten peor el pandeo."
  - id: perforacion_trabecular
    etiqueta: "Trabécula perforada o desconectada"
    descripcion: "Cuando una trabécula se perfora o se rompe, se pierde conectividad. Es un daño de la arquitectura que la DXA no mide directamente y que reduce la resistencia más de lo que sugiere la pérdida de masa."
  - id: cortical_normal
    etiqueta: "Cortical gruesa (hueso normal)"
    descripcion: "Cortical continua y gruesa, con pocos poros. Resiste bien la flexión y la torsión."
  - id: cortical_adelgazada
    etiqueta: "Cortical adelgazada"
    descripcion: "La reabsorción desde la cara interna adelgaza la cortical. Baja la resistencia, sobre todo a la flexión."
  - id: porosidad_cortical
    etiqueta: "Porosidad cortical aumentada"
    descripcion: "El remodelado aumentado dentro de la cortical ensancha los conductos y deja poros. La cortical pierde masa y resistencia."
  - id: cavidad_medular_ampliada
    etiqueta: "Cavidad medular ampliada"
    descripcion: "Con la edad la cavidad crece por reabsorción desde su cara interna. El hueso que se forma en la superficie externa (periostio) compensa en parte, pero no basta."
  - id: colapso_vertebral
    etiqueta: "Aplastamiento vertebral (fractura por fragilidad)"
    descripcion: "Fractura típica de la osteoporosis: el cuerpo vertebral se comprime con cargas cotidianas. Puede pasar inadvertida y sumarse hasta causar una joroba (cifosis) y pérdida de estatura."
requeridas: [trabeculas_normales, trabeculas_osteoporoticas, perforacion_trabecular, cortical_adelgazada, colapso_vertebral]
```

##### Actividad m6_3_relacion_factores

```yaml
tipo: relacion-columnas
titulo: "Une cada factor de riesgo con su mecanismo"
instrucciones: "Toca un factor de riesgo de la columna izquierda y luego el mecanismo que le corresponde en la derecha (también puedes arrastrar el factor sobre su mecanismo; con teclado, elige con Enter y desplázate con las flechas). Cada factor tiene un mecanismo dominante: elige el que mejor lo describe. Hay dos mecanismos de más que no corresponden a ningún factor."
obligatoria: true
puntaje_max: 40
concepto: "Factores de riesgo y mecanismo"
retroalimentacion:
  acierto: "Correcto. Cada factor de riesgo actúa sobre un mecanismo que ya conoces: el eje RANKL/OPG, los osteoblastos y osteocitos, la carga mecánica, el calcio, el recambio o la calidad de la matriz."
  error: "Alguna unión no es correcta. Pregúntate cuál es el mecanismo dominante de cada factor: los estrógenos sobre RANKL/OPG, los glucocorticoides sobre la formación, la carga sobre el osteocito y la esclerostina, la tiroides sobre el ritmo del ciclo y el azúcar sobre el colágeno."
izquierda:
  - id: f_estrogenos
    texto: "Déficit de estrógenos tras la menopausia"
  - id: f_glucocorticoides
    texto: "Glucocorticoides sistémicos prolongados"
  - id: f_inmovilizacion
    texto: "Inmovilización prolongada (reposo en cama)"
  - id: f_vitamina_d
    texto: "Deficiencia de vitamina D"
  - id: f_hipertiroidismo
    texto: "Hipertiroidismo no tratado"
  - id: f_diabetes
    texto: "Diabetes tipo 2 de larga evolución"
derecha:
  - id: m_rankl_opg
    texto: "Se retira un freno hormonal sobre RANKL y las citocinas: sube la relación RANKL/OPG y se forman más osteoclastos."
  - id: m_osteoblastos
    texto: "Predomina la supresión de la formación: menos osteoblastos y más apoptosis de osteoblastos y osteocitos, con recambio bajo."
  - id: m_esclerostina
    texto: "Sin carga, el osteocito aumenta la esclerostina y baja la formación."
  - id: m_calcio_pth
    texto: "Menos absorción de calcio, hiperparatiroidismo secundario y más reabsorción."
  - id: m_recambio
    texto: "Acorta y acelera cada ciclo de remodelado por un efecto directo de la hormona, sin que el eje RANKL/OPG sea la causa principal."
  - id: m_age
    texto: "Más AGE en el colágeno: hueso más frágil aunque la densidad sea normal o alta."
  - id: d_distractor_opg
    texto: "Aumenta la OPG, que frena a los osteoclastos y protege el hueso."
  - id: d_distractor_carga
    texto: "Mayor carga mecánica: baja la esclerostina y aumenta la formación."
pares:
  - izquierda: f_estrogenos
    derecha: m_rankl_opg
    explicacion: "Los estrógenos son un freno hormonal sobre RANKL y las citocinas. Sin ellos, RANKL y el TNF-α aumentan y la relación RANKL/OPG sube: más osteoclastos y remodelado acelerado. También hay más apoptosis de osteoblastos y osteocitos, pero lo que define este factor es el desbalance RANKL/OPG."
  - izquierda: f_glucocorticoides
    derecha: m_osteoblastos
    explicacion: "Los glucocorticoides en exceso reducen la formación de osteoblastos y favorecen la apoptosis de osteoblastos y osteocitos, con recambio bajo. Al inicio también aumentan RANKL y bajan la OPG, pero su rasgo dominante es la supresión de la formación."
  - izquierda: f_inmovilizacion
    derecha: m_esclerostina
    explicacion: "Sin carga, el osteocito aumenta la esclerostina, que frena la vía Wnt y la formación. Es el camino inverso al del ejercicio."
  - izquierda: f_vitamina_d
    derecha: m_calcio_pth
    explicacion: "Sin vitamina D se absorbe menos calcio en el intestino; la PTH sube para compensar (hiperparatiroidismo secundario) y moviliza calcio del hueso."
  - izquierda: f_hipertiroidismo
    derecha: m_recambio
    explicacion: "El exceso de hormona tiroidea actúa de forma directa sobre las células óseas: acorta y acelera el ciclo de remodelado, la reabsorción supera a la formación y se pierde hueso. Su mecanismo no pasa por un cambio primario del eje RANKL/OPG."
  - izquierda: f_diabetes
    derecha: m_age
    explicacion: "En la diabetes se acumulan AGE en el colágeno. Se propone que reducen la tenacidad de la matriz, lo que explicaría el mayor riesgo de fractura con una densidad normal o alta [verificar]."
```

##### Actividad m6_3_quiz_diagnostico

```yaml
tipo: quiz
titulo: "Practica el diagnóstico y el riesgo"
instrucciones: "Responde las cuatro preguntas. Tras cada respuesta verás la explicación. Puedes responder tocando la opción o moviéndote con Tab y pulsando Enter. Esta actividad es opcional."
obligatoria: false
puntaje_max: 30
concepto: "Criterios densitométricos y riesgo de fractura"
retroalimentacion:
  acierto: "Correcto. Distingues el T-score del Z-score, sabes que la DXA mide cantidad y no calidad, y entiendes qué aporta FRAX."
  error: "Revisa la tabla de categorías de la OMS y la diferencia entre T-score y Z-score. Recuerda que la densidad no agota la calidad del hueso."
preguntas:
  - id: m6_3_q1
    formato: opcion_multiple
    enunciado: "Una mujer de 62 años tiene un T-score de −2,7 en el cuello femoral y ninguna fractura previa. ¿Qué categoría de la OMS corresponde?"
    opciones:
      - id: a
        texto: "Normal"
      - id: b
        texto: "Baja masa ósea (osteopenia)"
      - id: c
        texto: "Osteoporosis"
      - id: d
        texto: "Osteoporosis grave"
    correcta: c
    explicacion: "Un T-score de −2,5 o menos indica osteoporosis. La osteoporosis grave (establecida) exige además una o más fracturas por fragilidad, que aquí no hay."
    dificultad: 1
    concepto: "Criterios densitométricos (T-score)"
  - id: m6_3_q2
    formato: opcion_multiple
    enunciado: "¿En qué grupo se prefiere el Z-score en lugar del T-score?"
    opciones:
      - id: a
        texto: "Mujeres posmenopáusicas mayores de 70 años, con o sin fracturas"
      - id: b
        texto: "Hombres de 50 años o más con factores de riesgo de fractura"
      - id: c
        texto: "Mujeres posmenopáusicas con una fractura previa de cadera por fragilidad"
      - id: d
        texto: "Mujeres premenopáusicas, hombres menores de 50 años y niños"
    correcta: d
    explicacion: "Los criterios de la OMS con T-score se aplican a mujeres posmenopáusicas y hombres de 50 años o más. En los demás grupos se compara con personas de la misma edad y sexo (Z-score)."
    dificultad: 2
    concepto: "Z-score"
  - id: m6_3_q3
    formato: verdadero_falso
    enunciado: "Una DXA normal descarta que el hueso tenga alteraciones de calidad que aumenten el riesgo de fractura."
    correcta: falso
    explicacion: "Es falso. La DXA mide la densidad (cantidad), no la microarquitectura, el microdaño ni la calidad de la matriz. Hay fracturas por fragilidad con un T-score normal o en el rango de baja masa ósea."
    dificultad: 2
    concepto: "Calidad ósea y DXA"
  - id: m6_3_q4
    formato: opcion_multiple
    enunciado: "¿Qué estima la herramienta FRAX?"
    opciones:
      - id: a
        texto: "La probabilidad a 10 años de una fractura osteoporótica mayor y de una de cadera."
      - id: b
        texto: "El valor del T-score que tendrá la persona dentro de diez años, según su edad y sexo."
      - id: c
        texto: "La velocidad anual de pérdida de masa ósea medida en dos DXA sucesivas."
      - id: d
        texto: "El grosor de la cortical mandibular medido en una radiografía panorámica."
    correcta: a
    explicacion: "FRAX combina la edad, el sexo, el índice de masa corporal y factores clínicos de riesgo, con o sin el T-score del cuello femoral, para estimar la probabilidad de fractura a 10 años."
    dificultad: 2
    concepto: "FRAX"
```

### Seccion 6.4: La mandíbula con los años

id "m6_4_mandibula_y_tiempo"

#### Contenido

En la mandíbula, el paso del tiempo depende mucho de lo que ocurra con los dientes. El hueso alveolar existe para sostenerlos y, cuando se pierden, cambia.

**El hueso alveolar depende del diente**

Diente, ligamento periodontal y hueso alveolar forman una unidad funcional. Las fibras del ligamento se insertan en la pared del alvéolo, el hueso alveolar propio (también llamado hueso fasciculado o *bundle bone*), y le transmiten las cargas de la masticación. Sin diente, esa carga desaparece y el hueso se adapta a la baja: se reabsorbe. Es el principio de adaptación a la carga (mecanostato, módulo 3) aplicado a la mandíbula.

> Recuerda: el hueso alveolar propio depende del diente; el hueso basal de la mandíbula, no.

**La cascada tras la pérdida de un diente**

![Cortes transversales de la región posterior de la mandíbula en seis etapas, desde el diente presente hasta el reborde deprimido](m6_reborde_alveolar_cascada)

*Figura 6.4. Etapas del reborde alveolar (esquema). Equivalen a las clases I a VI de Cawood y Howell.*

Tras la extracción, el alvéolo se llena de coágulo y el ligamento desaparece. El hueso alveolar propio se reabsorbe en las primeras semanas y se reemplaza por hueso nuevo inmaduro. En sitios anteriores y premolares, la pared más delgada, a menudo la vestibular, pierde más, y la reabsorción sigue desde las superficies externas. El reborde se estrecha y desciende, sobre todo en los primeros 3 a 6 meses: en una revisión sistemática (con sitios mixtos, en su mayoría no molares), a los 6 meses la pérdida fue de 29 a 63 % del ancho y de 11 a 22 % de la altura, con medias de aproximadamente 3,8 mm y 1,2 mm [verificar]. Después sigue despacio durante años, más si una prótesis mucosoportada carga el reborde de forma no fisiológica [verificar]. En la región anterior, la mandíbula se reabsorbe unas cuatro veces más que el maxilar [verificar].

| Clase (Cawood y Howell) | Reborde |
|---|---|
| I | Con dientes |
| II | Inmediatamente después de la extracción |
| III | Redondeado, con altura y ancho adecuados |
| IV | En filo de cuchillo |
| V | Plano |
| VI | Deprimido, con pérdida de hueso basal |

En la atrofia severa hay prótesis inestables, foramen mentoniano cerca de la cresta (dolor o parestesia del labio bajo la prótesis), línea milohioidea prominente bajo una mucosa delgada y un hueso basal delgado que se fractura con poca fuerza.

> Clinico: preservar el alvéolo tras la extracción reduce la pérdida del reborde, sin eliminarla. Los implantes, al transmitir carga al hueso, tienden a conservarlo mejor que una prótesis mucosoportada [verificar].

**Osteoporosis y pérdida de dientes**

Las personas con menor densidad ósea suelen tener más pérdida de soporte periodontal y de dientes, y las revisiones en mujeres posmenopáusicas encuentran asociación entre baja densidad ósea y periodontitis. Pero no está demostrado que la osteoporosis cause la pérdida dentaria: la edad, el tabaco, la nutrición y la vitamina D son factores compartidos, y los factores locales (placa, periodontitis, caries, prótesis) pesan mucho [verificar]. En la radiografía panorámica, la cortical inferior a la altura del foramen mentoniano y por detrás de él (su ancho y el índice de Klemetti: C1 normal, C2 erosión leve o moderada, C3 erosión severa) puede llevar al odontólogo a sospechar baja densidad ósea y remitir al paciente. No diagnostica osteoporosis y su rendimiento es moderado [verificar].

**La articulación temporomandibular**

Las superficies de la articulación temporomandibular (ATM) están cubiertas por fibrocartílago, no por cartílago hialino, y entre ellas hay un disco articular.

![Corte sagital de la articulación temporomandibular, normal y con cambios degenerativos](m6_atm_cambios_degenerativos)

*Figura 6.5. ATM normal y con cambios degenerativos (esquema).*

Con los años se remodela: el cóndilo puede mostrar aplanamiento, esclerosis subcondral, osteofitos o erosiones, y el disco puede adelgazarse, perforarse o desplazarse. La osteoartrosis es más frecuente con la edad, y en muchas personas mayores los hallazgos de imagen no producen síntomas [verificar]. Si duele, el manejo inicial es conservador. El papel de la pérdida de dientes posteriores y de las hormonas está en discusión [verificar].

> Atencion: un cambio visto en una imagen no siempre es una enfermedad, porque el remodelado adaptativo es frecuente. Se trata al paciente y sus síntomas, no la imagen.

Ordena ahora la cascada del reborde, explora la mandíbula en 3D y, si quieres, comprueba lo aprendido.

#### Actividades

##### Actividad m6_4_ordenar_reborde

```yaml
tipo: quiz
titulo: "Ordena la cascada del reborde alveolar"
instrucciones: "Ordena los seis pasos que siguen a la pérdida de un diente, desde el primer hecho hasta la atrofia severa. Cada paso indica en qué momento ocurre: úsalo para ordenarlos. Toca los pasos en el orden correcto (o muévelos con el teclado: Enter para tomar un paso, flechas para subirlo o bajarlo, Enter para soltarlo). Al terminar verás el orden correcto y la ilustración de las etapas."
obligatoria: true
puntaje_max: 30
concepto: "Cascada de reabsorción del reborde alveolar"
retroalimentacion:
  acierto: "Muy bien. Primero se pierde la carga que transmitía el diente, después se reabsorbe el hueso que dependía de ella y, con los meses y los años, cambia la forma del reborde."
  error: "El orden no es correcto. Fíjate en el momento que indica cada paso: el día de la extracción, las primeras semanas, los primeros 3 a 6 meses, los años siguientes y, al final, la atrofia severa."
preguntas:
  - id: m6_4_q_orden
    formato: ordenar_pasos
    enunciado: "Ordena la cascada que sigue a la pérdida de un diente, desde el primer hecho hasta la atrofia severa del reborde."
    pasos:
      - id: p1
        texto: "El día de la extracción, el alvéolo se llena de coágulo y el ligamento periodontal desaparece."
      - id: p2
        texto: "Desde ese momento, el hueso del alvéolo ya no recibe la carga que le transmitía el diente."
      - id: p3
        texto: "En las primeras semanas, el hueso alveolar propio, que depende del diente, se reabsorbe y se reemplaza por hueso nuevo inmaduro."
      - id: p4
        texto: "En los primeros 3 a 6 meses, la reabsorción continúa desde las superficies externas, y el reborde se estrecha y desciende."
      - id: p5
        texto: "Durante años, sin carga fisiológica, la reabsorción continúa despacio y el reborde se aplana."
      - id: p6
        texto: "En la atrofia severa queda solo hueso basal delgado, con el foramen mentoniano cerca de la cresta y más riesgo de fractura."
    correcta: [p1, p2, p3, p4, p5, p6]
    explicacion: "La secuencia sigue el tiempo: (1) el día de la extracción se pierde el diente y el ligamento; (2) desde entonces falta la carga que llegaba por el ligamento; (3) en las primeras semanas se reabsorbe el hueso alveolar propio, que depende del diente; (4) en los primeros 3 a 6 meses el reborde se estrecha y desciende; (5) durante años la reabsorción sigue despacio y el reborde se aplana; (6) en la atrofia severa solo queda el hueso basal. Los procesos se solapan en el tiempo y varían entre personas. Las etapas equivalen a las clases I a VI de Cawood y Howell."
    dificultad: 2
    concepto: "Cascada de reabsorción del reborde alveolar"
```

##### Actividad m6_4_mandibula_3d

```yaml
tipo: exploracion-3d
titulo: "La mandíbula con los años en 3D"
instrucciones: "Gira la mandíbula arrastrando con un dedo y acércala o aléjala con dos dedos (en escritorio, arrastra con el ratón y usa la rueda). Toca cada punto luminoso para leer qué le ocurre a esa zona con el paso del tiempo. Con teclado, usa Tab para pasar de un punto al siguiente y Enter para abrirlo, o elige en la lista de estructuras bajo el modelo (también funciona si tu dispositivo no puede mostrar 3D). El modelo es una mandíbula adulta sin dientes; no muestra la atrofia, que se describe en el texto de cada punto. Visita los cuatro puntos requeridos."
obligatoria: true
puntaje_max: 20
concepto: "Anatomía mandibular y envejecimiento"
retroalimentacion:
  acierto: "Muy bien. Ya sabes en qué zonas de la mandíbula se notan la atrofia del reborde, la vecindad del nervio, la fragilidad del hueso basal y los cambios de la articulación."
  error: "Todavía quedan puntos por visitar. Gira el modelo: algunas estructuras, como la línea milohioidea, están en la cara interna y otras, como el foramen mentoniano, en la externa."
modelo: mandibula
hotspots:
  - id: apofisis_alveolar
    etiqueta: "Apófisis alveolar (reborde)"
    descripcion: "Borde superior del cuerpo, donde se alojaban las raíces. Depende de los dientes: al perderse, el reborde se estrecha y desciende en la cascada que ordenaste. La mayor parte del cambio ocurre en los primeros 3 a 6 meses [verificar]."
    zona_anatomica: "Borde superior del cuerpo"
  - id: foramen_mentoniano
    etiqueta: "Foramen mentoniano"
    descripcion: "Abertura por la que sale el nervio mentoniano, a la altura de los premolares. Con la atrofia queda cerca de la cresta del reborde: la presión de una prótesis puede causar dolor o parestesia del labio y del mentón. También es el punto de referencia para medir la cortical inferior en la radiografía panorámica."
    zona_anatomica: "Cara externa del cuerpo, a la altura de los premolares"
  - id: cuerpo
    etiqueta: "Cuerpo y borde inferior (hueso basal)"
    descripcion: "El hueso basal se conserva mucho mejor que el alveolar, pero en la atrofia severa es casi lo único que queda. Su cortical inferior se estudia en la radiografía panorámica (ancho cortical, índice de Klemetti) para sospechar baja densidad ósea. Una mandíbula muy atrófica se puede fracturar con poca fuerza."
    zona_anatomica: "Borde inferior del cuerpo, a la altura del foramen mentoniano y por detrás de él"
  - id: angulo
    etiqueta: "Ángulo"
    descripcion: "Ahí se insertan el masetero por fuera y el pterigoideo medial por dentro. La masticación con dientes o implantes genera cargas que mantienen el hueso; en el edentulismo, la fuerza de mordida suele disminuir [verificar]."
    zona_anatomica: "Esquina posteroinferior"
  - id: condilo
    etiqueta: "Cóndilo (proceso condilar)"
    descripcion: "Cabeza articular de la ATM, recubierta de fibrocartílago. Con la edad puede remodelarse y mostrar aplanamiento, esclerosis subcondral, osteofitos o erosiones, sobre todo en la osteoartrosis. Muchos de estos hallazgos no producen síntomas [verificar]."
    zona_anatomica: "Extremo posterosuperior de la rama"
  - id: linea_milohioidea
    etiqueta: "Línea milohioidea"
    descripcion: "Cresta de la cara interna del cuerpo donde se inserta el músculo milohioideo. Cuando el reborde se reabsorbe queda prominente bajo una mucosa delgada: puede doler bajo una prótesis y es un sitio frecuente de exposición ósea en la osteonecrosis asociada a medicamentos [verificar]."
    zona_anatomica: "Cara interna del cuerpo, oblicua hacia la sínfisis"
requeridos: [apofisis_alveolar, foramen_mentoniano, cuerpo, condilo]
```

##### Actividad m6_4_quiz_mandibula

```yaml
tipo: quiz
titulo: "Comprueba lo que aprendiste de la mandíbula"
instrucciones: "Responde las cuatro preguntas. Tras cada respuesta verás la explicación. Puedes responder tocando la opción o moviéndote con Tab y pulsando Enter. Esta actividad es opcional."
obligatoria: false
puntaje_max: 20
concepto: "Cambios de la mandíbula con la edad"
retroalimentacion:
  acierto: "Correcto. El hueso alveolar depende del diente, la relación entre osteoporosis y pérdida dentaria es una asociación, y la ATM se remodela con los años."
  error: "Revisa la sección: el hueso alveolar propio depende del diente, la osteoporosis no es una causa demostrada de pérdida dentaria y no todo cambio de la ATM en una imagen es una enfermedad."
preguntas:
  - id: m6_4_q1
    formato: opcion_multiple
    enunciado: "¿Por qué se reabsorbe el hueso alveolar propio tras una extracción?"
    opciones:
      - id: a
        texto: "Porque el coágulo del alvéolo disuelve la pared ósea por acción química."
      - id: b
        texto: "Porque depende del diente y del ligamento periodontal, y deja de recibir carga funcional."
      - id: c
        texto: "Porque los osteocitos del hueso basal migran hacia el alvéolo vacío."
      - id: d
        texto: "Porque la extracción bloquea la formación de osteoclastos en toda la mandíbula."
    correcta: b
    explicacion: "El hueso alveolar propio existe por y para el diente: recibe sus cargas por las fibras del ligamento. Sin diente, esa carga desaparece y el hueso se adapta a la baja, como predice el mecanostato."
    dificultad: 2
    concepto: "Hueso alveolar propio"
  - id: m6_4_q2
    formato: verdadero_falso
    enunciado: "Está demostrado que la osteoporosis causa la pérdida de los dientes."
    correcta: falso
    explicacion: "Es falso. Hay una asociación entre baja densidad ósea y pérdida de soporte periodontal o de dientes, pero comparten factores como la edad, el tabaco y la nutrición, y los factores locales pesan mucho. No se ha demostrado una relación causal."
    dificultad: 2
    concepto: "Osteoporosis y pérdida dentaria"
  - id: m6_4_q3
    formato: opcion_multiple
    enunciado: "En una radiografía panorámica, ¿qué hallazgo puede hacer sospechar baja densidad ósea sistémica?"
    opciones:
      - id: a
        texto: "Un torus mandibular grande en la cara lingual del cuerpo mandibular."
      - id: b
        texto: "Una corona con caries extensa en el segundo molar inferior del paciente."
      - id: c
        texto: "Una cortical inferior delgada o erosionada a la altura del foramen mentoniano y por detrás de él."
      - id: d
        texto: "Un foramen mentoniano ubicado más alto de lo habitual en el cuerpo."
    correcta: c
    explicacion: "El ancho de la cortical inferior y el índice de Klemetti (C2 y C3 indican erosión) pueden sugerir baja densidad ósea y motivar una remisión. No diagnostican osteoporosis."
    dificultad: 2
    concepto: "Índices panorámicos"
  - id: m6_4_q4
    formato: opcion_multiple
    enunciado: "¿Cuál de estos hallazgos es típico de la osteoartrosis de la ATM?"
    opciones:
      - id: a
        texto: "Engrosamiento del cartílago hialino que recubre el cóndilo."
      - id: b
        texto: "Aumento de la altura del reborde alveolar de la mandíbula."
      - id: c
        texto: "Ensanchamiento de la cortical del borde inferior de la mandíbula."
      - id: d
        texto: "Aplanamiento del cóndilo con osteofitos y esclerosis subcondral."
    correcta: d
    explicacion: "En la osteoartrosis de la ATM se ven aplanamiento del cóndilo, osteofitos, erosiones y esclerosis subcondral. Además, las superficies de la ATM tienen fibrocartílago, no cartílago hialino."
    dificultad: 2
    concepto: "ATM degenerativa"
```

### Seccion 6.5: Prevenir e intervenir

id "m6_5_prevenir_e_intervenir"

#### Contenido

Cada medida que protege el hueso actúa sobre un mecanismo que ya conoces. Entender el mecanismo permite entender también los riesgos del tratamiento.

![Mapa de medidas de prevención y de fármacos conectadas con el mecanismo óseo sobre el que actúan](m6_prevencion_mapa)

*Figura 6.6. Cada medida apunta a un mecanismo de los módulos anteriores.*

**Prevención**

| Medida | Cómo actúa | Referencia general |
|---|---|---|
| Carga mecánica: ejercicio de impacto moderado y de resistencia | El osteocito percibe la deformación, baja la esclerostina y aumenta la formación (módulo 3). También mejora la fuerza y el equilibrio, y reduce las caídas. | Ejercicio regular, adaptado a cada persona |
| Calcio | Aporta el mineral de la matriz (módulo 4) y evita que la PTH suba para compensar. | Según el IOM: 1000 mg al día de los 19 a los 50 años, y 1200 mg en mujeres desde los 51 y en hombres desde los 71 [verificar] |
| Vitamina D | Favorece la absorción de calcio; su déficit causa hiperparatiroidismo secundario. | Según el IOM: 600 UI al día hasta los 70 años y 800 UI desde los 71; las guías varían [verificar] |
| Hábitos | No fumar, moderar el alcohol, mantener un peso adecuado, comer suficiente proteína y prevenir caídas | El tabaco y el alcohol elevado son factores de riesgo de FRAX |

> Clinico: más calcio o más vitamina D no siempre es mejor. Los suplementos se individualizan y la dieta es la primera fuente.

**Tratamiento: actuar sobre el mecanismo**

| Fármaco (ejemplo) | Blanco | Efecto |
|---|---|---|
| Bisfosfonatos (alendronato, zoledronato) | Hidroxiapatita; los osteoclastos los captan | Osteoclastos con menos actividad: menos reabsorción |
| Denosumab | Anticuerpo contra RANKL | Actúa como una OPG artificial: menos osteoclastos |
| Teriparatida | Receptor de PTH, con dosis diarias intermitentes | Anabólico: más formación |
| Romosozumab | Anticuerpo contra la esclerostina | Libera la vía Wnt: más formación y menos reabsorción |

> Atencion: este módulo explica mecanismos; no recomienda tratamientos. La indicación, la dosis y la duración las decide el equipo médico.

**Osteonecrosis de los maxilares asociada a medicamentos (ONM)**

Frenar el remodelado protege contra las fracturas, pero explica una complicación rara e importante en la consulta odontológica. La definición de la AAOMS (2022) exige los tres criterios:

1. Tratamiento actual o previo con un antirreabsortivo, solo o con inmunomoduladores o antiangiogénicos.
2. Hueso expuesto, o que se sondea a través de una fístula, en la región maxilofacial durante más de 8 semanas.
3. Sin antecedente de radioterapia de los maxilares ni de metástasis en ellos.

- **Fármacos:** bisfosfonatos y denosumab; en oncología, también antiangiogénicos. Se han descrito casos con romosozumab [verificar].
- **Frecuencia:** baja en osteoporosis (aproximadamente 0,02 a 0,05 % según la AAOMS; otras fuentes dan entre 0,001 y 0,1 %) y mayor en oncología, con dosis más altas (de 1 a varios por ciento en las series) [verificar].
- **Factores de riesgo:** extracción u otra cirugía dentoalveolar, infección periodontal o periapical, mala higiene, prótesis que lesionan la mucosa, mayor tiempo de tratamiento, glucocorticoides, diabetes, tabaquismo y edad.
- **Mecanismo:** no se conoce por completo. Se proponen la supresión del remodelado, la infección, la inhibición de la angiogénesis, la alteración inmunitaria y la toxicidad sobre los tejidos blandos. Por qué afecta a los maxilares no está resuelto: se han propuesto la exposición a bacterias desde los dientes, una mucosa delgada y el alto recambio del hueso alveolar [verificar].

> Clinico: antes de iniciar un antirreabsortivo conviene revisar la boca y tratar los focos infecciosos, sin retrasar el tratamiento necesario. Con el tratamiento en curso: buena higiene, técnica quirúrgica conservadora con cierre primario cuando sea posible y coordinación entre odontólogo y médico. No hay evidencia suficiente para recomendar una pausa rutinaria del fármaco [verificar].

> Atencion: el paciente no debe suspender su tratamiento por su cuenta. En osteoporosis, el beneficio de evitar fracturas suele superar el riesgo de ONM. Cualquier cambio lo decide el médico prescriptor junto con el equipo dental. En el caso del denosumab, suspenderlo sin un plan de transición puede causar un rebote del recambio óseo, con pérdida rápida de densidad y fracturas vertebrales múltiples [verificar].

Relaciona ahora cada intervención con su mecanismo y cierra el módulo con la evaluación final. Si quieres, repasa antes la ONM en la actividad opcional.

#### Actividades

##### Actividad m6_5_relacion_intervenciones

```yaml
tipo: relacion-columnas
titulo: "Une cada intervención con su mecanismo"
instrucciones: "Toca una intervención de la columna izquierda y luego el mecanismo que le corresponde en la derecha (también puedes arrastrar la intervención sobre su mecanismo; con teclado, elige con Enter y desplázate con las flechas). Hay dos mecanismos de más que no corresponden a ninguna intervención."
obligatoria: true
puntaje_max: 30
concepto: "Intervenciones y mecanismo"
retroalimentacion:
  acierto: "Correcto. Cada intervención actúa sobre un mecanismo que estudiaste: el osteocito y la carga, el osteoclasto, RANKL, la esclerostina, la PTH y el mineral."
  error: "Alguna unión no es correcta. Pregúntate sobre qué célula o qué molécula actúa cada intervención: el osteoclasto, RANKL, la esclerostina, la PTH o el aporte de mineral."
izquierda:
  - id: i_ejercicio
    texto: "Ejercicio con carga y de resistencia"
  - id: i_bisfosfonatos
    texto: "Bisfosfonatos (por ejemplo, alendronato)"
  - id: i_denosumab
    texto: "Denosumab"
  - id: i_romosozumab
    texto: "Romosozumab"
  - id: i_teriparatida
    texto: "Teriparatida (fragmento de PTH, dosis diarias)"
  - id: i_calcio_vitd
    texto: "Calcio y vitamina D suficientes"
derecha:
  - id: m_osteocito_carga
    texto: "El osteocito percibe la deformación del hueso: baja la esclerostina y aumenta la formación."
  - id: m_osteoclasto
    texto: "Se adhieren a la hidroxiapatita y los osteoclastos los captan: pierden actividad."
  - id: m_anti_rankl
    texto: "Anticuerpo que neutraliza a RANKL: funciona como una OPG artificial."
  - id: m_anti_esclerostina
    texto: "Anticuerpo que neutraliza la esclerostina y libera la vía Wnt."
  - id: m_pth
    texto: "Activa de forma intermitente el receptor de PTH y estimula la formación de hueso."
  - id: m_mineral
    texto: "Aportan mineral y evitan el hiperparatiroidismo secundario que aumenta la reabsorción."
  - id: d_distractor_er
    texto: "Bloquea el receptor de estrógeno de los osteoblastos."
  - id: d_distractor_rankl
    texto: "Aumenta RANKL para acelerar la renovación del hueso."
pares:
  - izquierda: i_ejercicio
    derecha: m_osteocito_carga
    explicacion: "La carga mecánica se detecta por el osteocito (mecanotransducción, módulo 3). Baja la esclerostina, se activa la vía Wnt y aumenta la formación."
  - izquierda: i_bisfosfonatos
    derecha: m_osteoclasto
    explicacion: "Los bisfosfonatos se fijan a la hidroxiapatita y los osteoclastos los captan al reabsorber. Así pierden actividad y baja la reabsorción."
  - izquierda: i_denosumab
    derecha: m_anti_rankl
    explicacion: "Denosumab es un anticuerpo contra RANKL. Hace lo mismo que la OPG: impide la unión RANKL-RANK y frena la formación de osteoclastos."
  - izquierda: i_romosozumab
    derecha: m_anti_esclerostina
    explicacion: "Romosozumab es un anticuerpo contra la esclerostina. Libera la vía Wnt y aumenta la formación ósea; además reduce algo la reabsorción."
  - izquierda: i_teriparatida
    derecha: m_pth
    explicacion: "La PTH en dosis diarias intermitentes tiene un efecto anabólico, al contrario de la exposición continua, que favorece la reabsorción."
  - izquierda: i_calcio_vitd
    derecha: m_mineral
    explicacion: "El calcio aporta la materia prima de la mineralización y la vitamina D favorece su absorción. Sin ellos sube la PTH y aumenta la reabsorción."
```

##### Actividad m6_5_quiz_onm

```yaml
tipo: quiz
titulo: "Osteonecrosis de los maxilares: definición y prudencia"
instrucciones: "Responde las cuatro preguntas. Tras cada respuesta verás la explicación. Puedes responder tocando la opción o moviéndote con Tab y pulsando Enter. Esta actividad es opcional."
obligatoria: false
puntaje_max: 20
concepto: "Osteonecrosis de los maxilares asociada a medicamentos"
retroalimentacion:
  acierto: "Correcto. La ONM es rara en osteoporosis, tiene una definición precisa y se maneja con prevención dental y coordinación entre odontólogo y médico, sin suspender el fármaco por cuenta propia."
  error: "Revisa la sección: la definición exige tres criterios, el riesgo en osteoporosis es bajo y ninguna decisión sobre el fármaco debe tomarla el paciente por su cuenta."
preguntas:
  - id: m6_5_q1
    formato: opcion_multiple
    enunciado: "¿Cuál de estos casos cumple la definición de ONM asociada a medicamentos de la AAOMS (2022)?"
    opciones:
      - id: a
        texto: "Hueso expuesto durante más de 8 semanas en un paciente tratado con un antirreabsortivo, sin radioterapia de los maxilares ni metástasis."
      - id: b
        texto: "Dolor dental agudo de 3 días tras una extracción, con la mucosa cicatrizada, en un paciente tratado con un antirreabsortivo."
      - id: c
        texto: "Hueso expuesto durante 3 semanas en un paciente con radioterapia previa de los maxilares y sin antirreabsortivos ni antiangiogénicos."
      - id: d
        texto: "Pérdida del reborde alveolar sin hueso expuesto en un paciente que toma un bisfosfonato para la osteoporosis desde hace años."
    correcta: a
    explicacion: "La definición exige los tres criterios: tratamiento antirreabsortivo actual o previo, hueso expuesto (o sondeable por una fístula) durante más de 8 semanas y ausencia de radioterapia de los maxilares o de metástasis en ellos."
    dificultad: 2
    concepto: "Definición de ONM"
  - id: m6_5_q2
    formato: opcion_multiple
    enunciado: "Una paciente con osteoporosis toma alendronato desde hace 3 años y necesita una extracción. ¿Qué conducta es la más prudente?"
    opciones:
      - id: a
        texto: "Suspender el bisfosfonato por su cuenta un mes antes de la extracción para reducir el riesgo."
      - id: b
        texto: "Negar la extracción, porque está contraindicada de forma absoluta en quien toma bisfosfonatos."
      - id: c
        texto: "Extraer sin ninguna consideración especial, porque el riesgo de osteonecrosis en osteoporosis es nulo."
      - id: d
        texto: "Coordinar con su médico, usar técnica quirúrgica conservadora con cierre primario si es posible y dar pautas de higiene."
    correcta: d
    explicacion: "En osteoporosis el riesgo de ONM es bajo, pero no nulo. Lo prudente es coordinar al odontólogo con el médico, usar una técnica conservadora con cierre primario cuando se pueda y cuidar la higiene. No hay evidencia suficiente para recomendar una pausa rutinaria del fármaco, y el paciente no debe suspenderlo por su cuenta."
    dificultad: 3
    concepto: "Prudencia clínica en ONM"
  - id: m6_5_q3
    formato: verdadero_falso
    enunciado: "En pacientes con osteoporosis, el riesgo de ONM es mucho menor que en pacientes oncológicos que reciben dosis altas de antirreabsortivos."
    correcta: verdadero
    explicacion: "Es verdadero. En osteoporosis se estima en centésimas de porcentaje, y en oncología, con dosis más altas y más frecuentes, llega a varios por ciento en las series."
    dificultad: 1
    concepto: "Frecuencia de ONM"
  - id: m6_5_q4
    formato: opcion_multiple
    enunciado: "¿Cuál de estos fármacos actúa neutralizando a RANKL?"
    opciones:
      - id: a
        texto: "Alendronato"
      - id: b
        texto: "Denosumab"
      - id: c
        texto: "Teriparatida"
      - id: d
        texto: "Romosozumab"
    correcta: b
    explicacion: "Denosumab es un anticuerpo contra RANKL y actúa como una OPG artificial. El alendronato es un bisfosfonato, la teriparatida es un fragmento de PTH y el romosozumab neutraliza la esclerostina."
    dificultad: 1
    concepto: "Fármacos y blanco molecular"
```

##### Actividad m6_5_evaluacion_final

```yaml
tipo: quiz
titulo: "Evaluación final: El paso del tiempo"
instrucciones: "Responde las ocho preguntas del módulo. Tras cada respuesta verás la explicación. Puedes responder tocando la opción o moviéndote con Tab y pulsando Enter. Al terminar esta evaluación y las demás actividades obligatorias, recibirás el logro Cronista."
obligatoria: true
puntaje_max: 100
concepto: "Envejecimiento y cambios degenerativos del tejido óseo"
retroalimentacion:
  acierto: "Excelente. Comprendes cómo cambian la cantidad y la calidad del hueso con los años, cómo se manifiesta en la mandíbula y cómo se puede prevenir e intervenir con prudencia clínica. Has cerrado el recorrido: eres Cronista."
  error: "Revisa las secciones donde fallaste. La pista de cada pregunta es su concepto: estrógenos y RANKL/OPG, calidad de la matriz, criterios de la DXA, FRAX, reborde alveolar, ATM, prevención y ONM."
preguntas:
  - id: m6_f_q1
    formato: opcion_multiple
    enunciado: "Tras la menopausia, ¿qué cambio explica mejor el aumento de osteoclastos?"
    opciones:
      - id: a
        texto: "Sube la relación RANKL/OPG y hay más TNF-α e IL-6."
      - id: b
        texto: "Sube la OPG, que estimula la fusión de los precursores."
      - id: c
        texto: "Los osteoblastos desaparecen y ya no pueden secretar señales."
      - id: d
        texto: "El calcio sérico aumenta y activa a los osteoclastos por retroalimentación."
    correcta: a
    explicacion: "Sin estrógenos aumentan RANKL y las citocinas como el TNF-α y la IL-6, y la relación RANKL/OPG sube. Así se forman más osteoclastos y viven más tiempo."
    dificultad: 2
    concepto: "Déficit de estrógenos y RANKL/OPG"
  - id: m6_f_q2
    formato: opcion_multiple
    enunciado: "Una persona con diabetes tipo 2 de larga evolución puede tener una densidad ósea normal y aun así un mayor riesgo de fractura. ¿Qué mecanismo se propone?"
    opciones:
      - id: a
        texto: "Un exceso de osteoclastos que la DXA no puede detectar."
      - id: b
        texto: "Una hipermineralización que vuelve blanda la matriz."
      - id: c
        texto: "Una producción excesiva de PTH que aumenta la densidad y la fragilidad a la vez."
      - id: d
        texto: "La acumulación de AGE en el colágeno, que reduce la tenacidad de la matriz."
    correcta: d
    explicacion: "En la diabetes se acumulan AGE en el colágeno, lo que se propone como causa de menor tenacidad y mayor fragilidad con densidad normal. Ilustra que calidad y cantidad no son lo mismo."
    dificultad: 3
    concepto: "Glicación y calidad ósea"
  - id: m6_f_q3
    formato: opcion_multiple
    enunciado: "Un hombre de 55 años tiene un T-score de −1,8 en la cadera total. ¿Qué categoría de la OMS corresponde?"
    opciones:
      - id: a
        texto: "Normal"
      - id: b
        texto: "Baja masa ósea (osteopenia)"
      - id: c
        texto: "Osteoporosis"
      - id: d
        texto: "Osteoporosis establecida (grave)"
    correcta: b
    explicacion: "Entre −1,0 y −2,5 corresponde a baja masa ósea (osteopenia). Los criterios de la OMS con T-score se aplican a hombres de 50 años o más."
    dificultad: 2
    concepto: "Criterios densitométricos (T-score)"
  - id: m6_f_q4
    formato: opcion_multiple
    enunciado: "¿Qué aporta FRAX frente a un T-score aislado?"
    opciones:
      - id: a
        texto: "Mide directamente la microarquitectura trabecular de la columna y de la cadera."
      - id: b
        texto: "Diagnostica osteoporosis en menores de 40 años sin necesidad de una DXA."
      - id: c
        texto: "Combina la edad y factores clínicos para estimar el riesgo de fractura a 10 años."
      - id: d
        texto: "Sustituye la necesidad de evaluar las caídas y los fármacos del paciente."
    correcta: c
    explicacion: "FRAX combina la edad, el sexo, el índice de masa corporal y factores clínicos de riesgo, con o sin T-score, para estimar la probabilidad de fractura a 10 años. No mide la microarquitectura."
    dificultad: 2
    concepto: "FRAX"
  - id: m6_f_q5
    formato: opcion_multiple
    enunciado: "¿Qué estructura del alvéolo depende directamente del diente y se reabsorbe primero tras una extracción?"
    opciones:
      - id: a
        texto: "El hueso alveolar propio (hueso fasciculado)"
      - id: b
        texto: "El hueso basal de la mandíbula"
      - id: c
        texto: "La cortical del borde inferior del cuerpo mandibular"
      - id: d
        texto: "La cabeza del cóndilo mandibular"
    correcta: a
    explicacion: "El hueso alveolar propio recibe las fibras del ligamento periodontal. Al perder el diente, pierde su carga y se reabsorbe primero; el hueso basal no depende del diente."
    dificultad: 2
    concepto: "Hueso alveolar propio"
  - id: m6_f_q6
    formato: verdadero_falso
    enunciado: "Los osteofitos y el aplanamiento del cóndilo en la ATM de una persona mayor siempre indican una enfermedad que requiere tratamiento."
    correcta: falso
    explicacion: "Es falso. Muchos de estos cambios son remodelado adaptativo y no producen síntomas. Se trata al paciente sintomático, no la imagen."
    dificultad: 2
    concepto: "ATM degenerativa"
  - id: m6_f_q7
    formato: opcion_multiple
    enunciado: "¿Qué mecanismo explica mejor por qué caminar y levantar pesas ayuda al hueso?"
    opciones:
      - id: a
        texto: "El ejercicio eleva el RANKL para renovar el hueso viejo y aumentar el recambio."
      - id: b
        texto: "El ejercicio sustituye la necesidad de calcio y de vitamina D en la dieta."
      - id: c
        texto: "El ejercicio convierte la grasa medular en hueso nuevo por acción mecánica directa."
      - id: d
        texto: "La deformación activa a los osteocitos: baja la esclerostina y sube la formación."
    correcta: d
    explicacion: "La carga mecánica se detecta por el osteocito. Al bajar la esclerostina se activa la vía Wnt y aumenta la formación de hueso. No sustituye al calcio ni a la vitamina D."
    dificultad: 2
    concepto: "Carga mecánica y prevención"
  - id: m6_f_q8
    formato: opcion_multiple
    enunciado: "Una paciente con osteoporosis en tratamiento con antirreabsortivos dice que dejará de tomarlos porque teme la osteonecrosis de los maxilares. ¿Qué respuesta es más adecuada?"
    opciones:
      - id: a
        texto: "Apoyar su decisión, porque la osteonecrosis es una complicación frecuente en las personas con osteoporosis."
      - id: b
        texto: "Explicarle que en osteoporosis el riesgo es bajo, que el beneficio suele superarlo y que su médico decide cualquier cambio."
      - id: c
        texto: "Indicarle que suspender el fármaco por su cuenta, sin consultar, elimina siempre el riesgo de osteonecrosis."
      - id: d
        texto: "Decirle que la higiene oral y el estado de sus dientes no tienen ninguna influencia en ese riesgo."
    correcta: b
    explicacion: "En osteoporosis la ONM es rara y el beneficio de evitar fracturas suele ser mayor. Ninguna decisión sobre el fármaco debe tomarla el paciente por su cuenta, y la salud dental y la higiene sí influyen en el riesgo. En el caso del denosumab, suspenderlo sin un plan de transición puede causar un rebote con fracturas vertebrales múltiples."
    dificultad: 3
    concepto: "Prudencia clínica en ONM"
```

## Glosario

- **Masa ósea máxima (pico de masa ósea):** mayor cantidad de tejido óseo que alcanza una persona, al final de la maduración esquelética.
- **Densidad mineral ósea (DMO):** cantidad de mineral por unidad de área (DXA) o de volumen; es una medida de cantidad, no de calidad.
- **DXA:** absorciometría de rayos X de doble energía; técnica estándar para medir la DMO en columna lumbar y cadera.
- **T-score:** número de desviaciones estándar que separa la DMO de una persona de la media de adultos jóvenes sanos; se usa en mujeres posmenopáusicas y hombres de 50 años o más.
- **Z-score:** número de desviaciones estándar respecto de personas de la misma edad y sexo; se prefiere en premenopáusicas, hombres menores de 50 años y niños.
- **FRAX:** herramienta que estima la probabilidad a 10 años de fractura osteoporótica mayor y de fractura de cadera a partir de factores clínicos, con o sin DMO.
- **Osteoporosis:** trastorno de la resistencia ósea que predispone a un mayor riesgo de fractura; la resistencia integra la densidad y la calidad del hueso.
- **Baja masa ósea (osteopenia):** categoría de la OMS con T-score entre −1,0 y −2,5.
- **Fractura por fragilidad:** fractura producida por una caída desde la altura de pie o menos, o por un esfuerzo cotidiano.
- **Senescencia celular:** estado de estrés celular con arresto del ciclo o pérdida de función y secreción de señales inflamatorias (SASP). En los osteocitos, que no se dividen, se reconoce por marcadores de daño y por el SASP.
- **SASP (fenotipo secretor asociado a la senescencia):** conjunto de citocinas y otras señales inflamatorias que secretan las células senescentes.
- **Adipogénesis medular:** aumento de adipocitos en la médula ósea, a costa de osteoblastos, con la edad y en la osteoporosis.
- **Microdaño (microfisura):** grieta microscópica del hueso producida por la carga cotidiana; se repara con remodelado dirigido.
- **Productos de glicación avanzada (AGE):** enlaces y aductos que se forman sin enzimas entre azúcares y proteínas; en el colágeno óseo reducen la tenacidad. Ejemplo: pentosidina.
- **Micropetrosis:** relleno mineral de la laguna de un osteocito muerto.
- **Esclerostina:** proteína de los osteocitos que inhibe la vía Wnt y frena la formación ósea; aumenta con la edad y sin carga.
- **RANKL:** ligando que activa a RANK en los precursores y promueve la formación de osteoclastos.
- **OPG (osteoprotegerina):** receptor señuelo soluble que se une a RANKL e impide su acción.
- **Hueso alveolar propio (hueso fasciculado, bundle bone):** lámina de hueso que reviste el alvéolo y recibe las fibras del ligamento periodontal; depende del diente.
- **Reborde alveolar:** relieve de la apófisis alveolar que queda tras la pérdida de los dientes.
- **Atrofia mandibular:** reducción de altura y ancho de la mandíbula edéntula por reabsorción del reborde y, en casos severos, del hueso basal.
- **Clasificación de Cawood y Howell:** seis clases (I a VI) que describen la forma del reborde desde el dentado hasta el deprimido.
- **Índice de Klemetti (índice cortical mandibular):** clasificación en C1, C2 y C3 de la cortical inferior de la mandíbula en la radiografía panorámica.
- **Articulación temporomandibular (ATM):** articulación entre el cóndilo mandibular y la fosa mandibular del temporal, con un disco articular y superficies de fibrocartílago.
- **Osteoartrosis de la ATM:** enfermedad degenerativa de la articulación, con aplanamiento, osteofitos, erosiones o esclerosis subcondral del cóndilo.
- **Antirreabsortivo:** fármaco que reduce la reabsorción ósea, como los bisfosfonatos y el denosumab.
- **ONM (osteonecrosis de los maxilares asociada a medicamentos, MRONJ):** hueso expuesto en la región maxilofacial durante más de 8 semanas en un paciente con tratamiento antirreabsortivo o afín, sin radioterapia de los maxilares ni metástasis en ellos.

## Referencias

Obras estándar y documentos consultados para redactar este módulo. No se citan páginas ni DOI cuando no se pudieron confirmar. El docente puede sustituirlos por las ediciones que use en su curso.

Textos de referencia:

1. Ross MH, Pawlina W. *Histology: A Text and Atlas, with Correlated Cell and Molecular Biology.* Wolters Kluwer.
2. Mescher AL. *Junqueira's Basic Histology: Text and Atlas.* McGraw-Hill.
3. Kierszenbaum AL, Tres LL. *Histology and Cell Biology: An Introduction to Pathology.* Elsevier.
4. Nanci A (ed.). *Ten Cate's Oral Histology: Development, Structure, and Function.* Elsevier.
5. Bilezikian JP, Martin TJ, Clemens TL, Rosen CJ (eds.). *Principles of Bone Biology.* Academic Press.
6. Burr DB, Allen MR (eds.). *Basic and Applied Bone Biology.* Academic Press.
7. Rosen CJ (ed.). *Primer on the Metabolic Bone Diseases and Disorders of Mineral Metabolism.* American Society for Bone and Mineral Research.
8. Hall JE, Hall ME. *Guyton and Hall Textbook of Medical Physiology.* Elsevier.
9. Boron WF, Boulpaep EL. *Medical Physiology.* Elsevier.
10. Lang NP, Lindhe J (eds.). *Clinical Periodontology and Implant Dentistry.* Wiley-Blackwell.

Consensos, guías y artículos citados o consultados:

11. NIH Consensus Development Panel on Osteoporosis Prevention, Diagnosis, and Therapy. *Osteoporosis prevention, diagnosis, and therapy.* JAMA, 2001.
12. Seeman E, Delmas PD. *Bone quality: the material and structural basis of bone strength and fragility.* N Engl J Med, 2006.
13. Riggs BL, Melton LJ III. *Involutional osteoporosis.* N Engl J Med, 1986.
14. Riggs BL, Khosla S, Melton LJ III. *A unitary model for involutional osteoporosis: estrogen deficiency causes both type I and type II osteoporosis in postmenopausal women and contributes to bone loss in aging men.* J Bone Miner Res, 1998.
15. Greendale GA, et al. *Bone mineral density loss in relation to the final menstrual period in a multiethnic cohort: results from the Study of Women's Health Across the Nation (SWAN).* J Bone Miner Res, 2012.
16. Baxter-Jones ADG, et al. *Bone mineral accrual from 8 to 30 years of age: an estimation of peak bone mass.* J Bone Miner Res, 2011.
17. Weaver CM, et al. *The National Osteoporosis Foundation's position statement on peak bone mass development and lifestyle factors: a systematic review and implementation recommendations.* Osteoporos Int, 2016.
18. Farr JN, Khosla S, et al. *Targeting cellular senescence prevents age-related bone loss in mice.* Nat Med, 2017.
19. Busse B, et al. *Decrease in the osteocyte lacunar density accompanied by hypermineralized lacunar occlusion reveals failure and delay of remodeling in aged human bone.* Aging Cell, 2010.
20. Modder UI, et al. *Relation of age, gender, and bone mass to circulating sclerostin levels in women and men.* J Bone Miner Res, 2011.
21. Lin C, et al. *Sclerostin mediates bone response to mechanical unloading through antagonizing Wnt/β-catenin signaling.* J Bone Miner Res, 2009.
22. International Society for Clinical Densitometry. *Official Positions (Adult).*
23. FRAX: *Fracture Risk Assessment Tool.* Universidad de Sheffield (Centro Colaborador de la OMS para Enfermedades Óseas Metabólicas).
24. Ross AC, Taylor CL, Yaktine AL, Del Valle HB (eds.). *Dietary Reference Intakes for Calcium and Vitamin D.* Institute of Medicine, The National Academies Press, 2011.
25. Ruggiero SL, et al. *American Association of Oral and Maxillofacial Surgeons' Position Paper on Medication-Related Osteonecrosis of the Jaws: 2022 Update.* J Oral Maxillofac Surg, 2022.
26. Araújo MG, Lindhe J. *Dimensional ridge alterations following tooth extraction. An experimental study in the dog.* J Clin Periodontol, 2005.
27. Tan WL, Wong TLT, Wong MCM, Lang NP. *A systematic review of post-extractional alveolar hard and soft tissue dimensional changes in humans.* Clin Oral Implants Res, 2012.
28. Hansson S, Halldin A. *Alveolar ridge resorption after tooth extraction: a consequence of a fundamental principle of bone physiology.* J Dent Biomech, 2012.
29. Cawood JI, Howell RA. *A classification of the edentulous jaws.* Int J Oral Maxillofac Surg, 1988.
30. Krall EA, Dawson-Hughes B, et al. *Tooth loss and skeletal bone density in healthy postmenopausal women.* Osteoporos Int, 1994.

## Banco de preguntas para el mentor

Preguntas extra, distintas de las del módulo, para reforzar con el estudiante. Cada una lleva su respuesta, su dificultad (1 a 3) y el concepto que refuerza.

1. Pregunta: ¿Qué diferencia hay entre el T-score y el Z-score?
   - Respuesta: el T-score compara la DMO con la media de adultos jóvenes sanos y se usa en mujeres posmenopáusicas y hombres de 50 años o más para aplicar los criterios de la OMS. El Z-score compara con personas de la misma edad y sexo y se prefiere en premenopáusicas, hombres menores de 50 años y niños.
   - Dificultad: 1
   - Concepto: Criterios densitométricos (T-score y Z-score)
2. Pregunta: Un paciente tiene un T-score de −0,8 y una fractura de cadera por una caída desde su propia altura. ¿Tiene osteoporosis?
   - Respuesta: desde el punto de vista clínico, sí: una fractura de cadera por fragilidad permite diagnosticar osteoporosis aunque el T-score sea normal o esté en el rango de baja masa ósea [verificar]. Muestra que la densidad no agota la calidad del hueso.
   - Dificultad: 3
   - Concepto: Fractura por fragilidad
3. Pregunta: ¿Por qué el hueso trabecular pierde más rápido al comienzo tras la menopausia?
   - Respuesta: porque tiene mucha más superficie de remodelado por unidad de volumen. El aumento del remodelado por el déficit de estrógenos se nota más ahí, y por eso las vértebras y el antebrazo distal se fracturan primero.
   - Dificultad: 2
   - Concepto: Menopausia y pérdida ósea
4. Pregunta: ¿Qué papel cumple la OPG y cómo se relaciona con el denosumab?
   - Respuesta: la OPG es un receptor señuelo soluble que se une a RANKL e impide que active a RANK. El denosumab es un anticuerpo contra RANKL, así que actúa como una OPG artificial.
   - Dificultad: 2
   - Concepto: Estrógenos, RANKL y OPG
5. Pregunta: ¿Por qué el estrógeno importa también en los hombres?
   - Respuesta: porque parte del estrógeno de los hombres proviene de la aromatización de la testosterona, y su descenso con la edad contribuye a la pérdida ósea (modelo unitario de Riggs). El estrógeno frena la reabsorción en ambos sexos.
   - Dificultad: 2
   - Concepto: Menopausia y pérdida ósea
6. Pregunta: ¿En qué se diferencian los enlaces enzimáticos del colágeno de los AGE?
   - Respuesta: los enlaces enzimáticos los forma la lisil oxidasa de manera ordenada durante la maduración del colágeno. Los AGE se forman sin enzimas, al reaccionar azúcares con el colágeno, y se acumulan con la edad, la diabetes y la enfermedad renal; reducen la tenacidad de la matriz.
   - Dificultad: 2
   - Concepto: Glicación de la matriz
7. Pregunta: ¿Qué es la micropetrosis y por qué importa?
   - Respuesta: es el relleno mineral de la laguna de un osteocito muerto. Importa porque deja matriz sin una célula que vigile el daño y la vuelve más quebradiza; aumenta con la edad.
   - Dificultad: 2
   - Concepto: Micropetrosis
8. Pregunta: Verdadero o falso: en la vejez el hueso deja de remodelarse.
   - Respuesta: falso. El hueso se remodela toda la vida. Lo que cambia es el balance (la reabsorción supera a la formación), el ritmo y la calidad del hueso que se forma y se repara.
   - Dificultad: 1
   - Concepto: Remodelado y envejecimiento
9. Pregunta: Menciona tres factores que pueden acelerar la reabsorción del reborde tras una extracción.
   - Respuesta: por ejemplo, la carga no fisiológica de una prótesis mucosoportada, una pared ósea delgada o una extracción traumática, la periodontitis previa, el tiempo de edentulismo y la variabilidad individual. La evidencia sobre cada factor varía [verificar].
   - Dificultad: 2
   - Concepto: Cascada de reabsorción del reborde alveolar
10. Pregunta: ¿Por qué se dice que la relación entre osteoporosis y pérdida dentaria es una asociación y no una causa demostrada?
    - Respuesta: porque la baja densidad ósea y la pérdida de dientes comparten factores (edad, tabaco, nutrición, vitamina D) y porque los factores locales (placa, periodontitis, caries, prótesis) pesan mucho. La mayoría de los estudios no permite separar causa de asociación.
    - Dificultad: 2
    - Concepto: Osteoporosis y pérdida dentaria
11. Pregunta: ¿Qué mide el índice de Klemetti y para qué sirve?
    - Respuesta: clasifica la cortical inferior de la mandíbula, a la altura del foramen mentoniano y por detrás de él, en la radiografía panorámica: C1 normal, C2 erosión leve o moderada y C3 erosión severa. Puede llevar al odontólogo a sospechar baja densidad ósea y remitir al paciente, pero no diagnostica osteoporosis.
    - Dificultad: 2
    - Concepto: Índices panorámicos
12. Pregunta: ¿Qué tipo de tejido cubre las superficies articulares de la ATM?
    - Respuesta: fibrocartílago (tejido conjuntivo denso con zonas de tipo cartilaginoso), no cartílago hialino. Entre las superficies hay un disco articular.
    - Dificultad: 1
    - Concepto: ATM degenerativa
13. Pregunta: ¿Cuáles son los tres criterios de la definición de ONM de la AAOMS (2022)?
    - Respuesta: tratamiento actual o previo con un antirreabsortivo (solo o con inmunomoduladores o antiangiogénicos); hueso expuesto, o sondeable por una fístula, en la región maxilofacial durante más de 8 semanas; y ausencia de radioterapia de los maxilares o de metástasis en ellos.
    - Dificultad: 2
    - Concepto: Definición de ONM
14. Pregunta: ¿Por qué se recomienda revisar la boca antes de iniciar un antirreabsortivo?
    - Respuesta: porque los focos infecciosos y las cirugías dentoalveolares son los principales desencadenantes de la ONM. Tratarlos antes, sin retrasar el tratamiento necesario, reduce la necesidad de cirugía con el fármaco en curso.
    - Dificultad: 2
    - Concepto: Prudencia clínica en ONM
15. Pregunta: ¿Cuánto calcio recomienda el IOM a una mujer de 55 años, y de dónde conviene obtenerlo?
    - Respuesta: 1200 mg al día en total, mejor desde la dieta que desde suplementos [verificar]. Los suplementos se individualizan.
    - Dificultad: 1
    - Concepto: Prevención: calcio y vitamina D
16. Pregunta: ¿Por qué un pico de masa ósea más alto retrasa la osteoporosis?
    - Respuesta: porque toda la curva parte de más hueso; la misma pérdida con la edad tarda más en cruzar el umbral en el que aumenta el riesgo de fractura.
    - Dificultad: 1
    - Concepto: Pico de masa ósea

## Ganchos para el mentor

### Conceptos clave del módulo

1. La masa ósea sigue una curva: se construye hasta un pico (segunda o tercera década), se mantiene y se pierde. Un pico alto retrasa la osteoporosis.
2. La menopausia acelera la pérdida por el déficit de estrógenos: sube la relación RANKL/OPG, hay más TNF-α, IL-6 y M-CSF, y el remodelado se acelera con saldo negativo.
3. Con la edad, los osteoblastos disminuyen (más adipogénesis medular), los osteocitos envejecen y mueren (micropetrosis), se acumulan microfisuras y AGE, y la calidad de la matriz cae.
4. La osteoporosis es un problema de resistencia: cantidad (DMO) y calidad. La DXA mide cantidad; FRAX estima el riesgo de fractura a 10 años.
5. T-score (posmenopáusicas y hombres de 50 años o más): normal ≥ −1,0; baja masa ósea entre −1,0 y −2,5; osteoporosis ≤ −2,5. Z-score en los demás grupos.
6. Tras una extracción, el hueso alveolar propio se reabsorbe y el reborde se estrecha y desciende, sobre todo en los primeros meses. En casos severos queda solo hueso basal, con riesgos clínicos.
7. La relación osteoporosis y pérdida dentaria es una asociación, no una causa demostrada. La ATM se remodela con la edad y no todo cambio de imagen es una enfermedad.
8. Prevención y tratamiento actúan sobre mecanismos conocidos: carga mecánica (osteocito, esclerostina), calcio y vitamina D, bisfosfonatos (osteoclasto), denosumab (RANKL), teriparatida (PTH), romosozumab (esclerostina).
9. ONM: definición de tres criterios, riesgo bajo en osteoporosis, prevención dental y coordinación con el médico; el paciente no debe suspender el fármaco por su cuenta (con el denosumab, la suspensión sin plan de transición puede causar un rebote con fracturas vertebrales múltiples).

### Errores frecuentes y cómo aclararlos

| Error frecuente | Por qué ocurre | Cómo aclararlo |
|---|---|---|
| "La osteoporosis es solo falta de calcio" | Se le da a la dieta un peso exclusivo | Explicar que la osteoporosis es un problema de resistencia: cantidad y calidad. El calcio y la vitamina D ayudan, pero también importan la carga mecánica, los estrógenos, los osteoblastos y osteocitos y la calidad de la matriz |
| "Un T-score normal significa hueso sano" | Se cree que la DXA lo mide todo | La DXA mide densidad (cantidad), no microarquitectura, microdaño ni AGE. Recordar la diabetes tipo 2 y las fracturas con T-score normal |
| Confundir T-score y Z-score | Los nombres se parecen | T: frente a adultos jóvenes, en posmenopáusicas y hombres de 50 años o más. Z: frente a personas de la misma edad y sexo, en los demás grupos |
| "Osteopenia es osteoporosis leve" | Se ve como un continuo | Es una categoría de baja masa ósea (T-score entre −1,0 y −2,5), no una enfermedad en sí; el riesgo de fractura se estima con FRAX y factores clínicos |
| Invertir los papeles de RANKL y OPG | Ambos "regulan" osteoclastos | RANKL activa (se une a RANK); la OPG es el señuelo que atrapa a RANKL. En el déficit de estrógenos sube la relación RANKL/OPG |
| "El estrógeno estimula a los osteoblastos y ese es todo su papel" | Se simplifica el efecto | El estrógeno frena la formación de osteoclastos (RANKL, citocinas), favorece su apoptosis y protege a osteoblastos y osteocitos de la apoptosis |
| Mezclar enlaces enzimáticos y AGE | Ambos son "enlaces del colágeno" | Los enzimáticos maduran el colágeno de forma ordenada; los AGE se forman sin enzimas, con azúcares, y se acumulan con la edad y la diabetes |
| "La pérdida ósea con la edad es solo de las mujeres" | La menopausia es el ejemplo más visible | Los hombres también pierden hueso, de forma gradual, y el estrógeno también les importa. Aproximadamente 1 de cada 5 hombres mayores de 50 años sufrirá una fractura osteoporótica a lo largo de la vida [verificar] |
| "La osteoporosis causa la pérdida de dientes" | Se observa asociación | Es una asociación con factores compartidos y locales; no está demostrada la causalidad. Pedir que diga qué factor local pesa más (periodontitis, prótesis) |
| "El reborde solo se reabsorbe en personas mayores" | Se asocia la atrofia con la vejez | Se reabsorbe después de cualquier extracción, a cualquier edad, porque el hueso alveolar propio depende del diente. La edad y otros factores modifican el ritmo |
| "Todo cambio de la ATM en una imagen es una enfermedad" | Se trata la imagen y no el síntoma | Explicar el remodelado adaptativo y que muchos hallazgos son asintomáticos; se trata al paciente sintomático |
| "Los bisfosfonatos y el denosumab causan osteonecrosis con frecuencia" y "hay que suspenderlos ante una extracción" | Se generaliza desde los casos oncológicos | En osteoporosis el riesgo es bajo y el beneficio en fracturas suele superarlo. No suspender por cuenta propia; coordinar odontólogo y médico, y usar técnica conservadora |
| Confundir el hueso alveolar propio con todo el hueso alveolar | Se usa "hueso alveolar" para todo | El hueso alveolar propio es la lámina que reviste el alvéolo y depende del diente; el resto de la apófisis alveolar y el hueso basal se comportan distinto |

### Cómo usar el contexto

- **Si el estudiante falla `m6_1_arrastre_estrogenos`:** aclarar que RANKL se une a RANK y que la OPG se une a RANKL, y que el estrógeno actúa sobre la célula osteoblástica (receptor intracelular). Retomar qué célula produce cada molécula y dónde está su receptor.
- **Si falla `m6_2_multicapa_tejido_envejecido` o `m6_2_quiz_envejecimiento`:** volver a la tabla de cambios y pedir que una cada cambio con su consecuencia (por ejemplo, micropetrosis con menor detección del daño).
- **Si falla `m6_3_relacion_factores`:** preguntar por el mecanismo dominante de cada factor: estrógenos sobre RANKL/OPG, glucocorticoides sobre la formación, carga sobre el osteocito y la esclerostina, tiroides sobre el ritmo del ciclo, azúcar sobre el colágeno. Varios factores comparten efectos secundarios (por ejemplo, los glucocorticoides también suben RANKL); pedir el rasgo principal.
- **Si falla `m6_3_quiz_diagnostico` o una pregunta de T-score en la evaluación final:** repasar la tabla de la OMS con casos numéricos y recordar que el Z-score se usa en otros grupos.
- **Si falla `m6_4_ordenar_reborde`:** pedir que use los momentos que marca cada paso (el día de la extracción, primeras semanas, 3 a 6 meses, años) y que empiece por la causa (se pierde el diente y con él la carga). Aclarar que los procesos se solapan y que el orden sigue el momento en que predomina cada uno. Volver a la ilustración de las seis etapas.
- **Si falla ONM (`m6_5_quiz_onm`):** repasar los tres criterios de la definición y la conducta prudente: coordinar, técnica conservadora, no suspender por cuenta propia.
- **Límite del mentor:** no dar indicaciones médicas o de tratamiento a un paciente concreto ni interpretar estudios de un paciente; remitir siempre al equipo tratante. En las preguntas sobre fármacos, explicar el mecanismo y el riesgo global, sin recomendar dosis ni cambios.
- **Nivel de posgrado:** ampliar con el modelo unitario de Riggs, el secretoma de las células senescentes y los ensayos con senolíticos (sobre todo en ratones), el debate sobre si los AGE son causa o marcador, el uso de FRAX ajustado y los índices panorámicos en cribado, y las hipótesis de la ONM y el debate sobre las pausas del fármaco.
- **Nivel de pregrado:** mantener las analogías (freno del remodelado, señuelo, techo de la curva) y evitar los nombres de vías moleculares salvo que el estudiante los pida.

## Notas de verificacion para el docente

Estas son las afirmaciones marcadas con [verificar] en el cuerpo, y otras cifras que conviene confirmar contra los textos del curso antes de la versión final.

### A. Cifras aproximadas o que varían entre fuentes (marcadas con [verificar])

1. **Meseta entre los 20 y los 50 años (sección 6.1 y video).** Los textos difieren en cuándo empieza la pérdida: en el hueso trabecular puede empezar antes y en el cortical más tarde. Se puso un rango amplio y "aproximadamente".
2. **Pico de masa ósea y 90 % a los 18 años (sección 6.1 y video).** El pico se sitúa entre la segunda y la tercera década según el sitio del esqueleto y el estudio. Se cita que alrededor del 90 % del pico se alcanza a los 18 años en niñas y a los 20 en niños (formulación de las revisiones de Baxter-Jones y de Weaver/NOF; una versión anterior decía "más del 90 %", más fuerte que la fuente). Otras fuentes hablan de aproximadamente 95 % a los 20 años. Confirmar el texto que se prefiere.
3. **Genética en el 60 a 80 % de la variación del pico (sección 6.1 y video).** Los estudios de gemelos y familias dan rangos entre aproximadamente 50 y 85 % según el sitio del esqueleto y la edad. Confirmar la cifra o dejar solo "gran parte".
4. **Edad media de la menopausia (aproximadamente 51 años) (sección 6.1 y video).** Depende de la población y del estudio.
5. **Ritmos de pérdida alrededor de la menopausia (sección 6.1 y video).** Se citan aproximadamente 2,5 % al año en la columna lumbar y 1,8 % al año en el cuello femoral durante la transmenopausia (desde cerca de un año antes hasta cerca de dos años después de la última menstruación), a partir de un estudio longitudinal de cohortes (SWAN, Greendale 2012); son las cifras de las mujeres blancas del estudio, y las de otros grupos étnicos difieren (por ejemplo, 2,2 % y 1,4 % en mujeres negras). En esos tres años el cálculo da cerca del 7 % de la columna. Una versión anterior del guion decía "cerca del 10 % en seis años", que era incorrecto: la cifra cercana al 10 % corresponde a la pérdida acumulada de columna en el seguimiento de unos diez años y se mantiene marcada para confirmar con el artículo original. Otros estudios dan cifras distintas según el sitio, la población y la ventana de tiempo.
6. **Pérdida a lo largo de la vida (aproximadamente 50 % del trabecular y 30 % del cortical en mujeres; menos en hombres) (sección 6.1 y video).** Es una cifra habitual del modelo de Riggs. Las cifras exactas varían entre fuentes y sitios. Para los hombres se dijo solo "pierden menos".
7. **Esclerostina circulante aumenta con la edad (sección 6.2).** Es un hallazgo de estudios de población; el aumento en veces varía entre sexos y trabajos. Se dejó sin cifra.
8. **Senescencia celular en el hueso humano (sección 6.2).** La evidencia más sólida viene de ratones (eliminación de células senescentes). En humanos hay identificación de células senescentes en el hueso y ensayos en curso; el peso clínico aún es limitado.
9. **AGE: causa o marcador (sección 6.2).** Se debate si la acumulación de AGE causa fragilidad o es un marcador de envejecimiento; además, se estima que los aductos que no forman enlaces son mucho más abundantes que la pentosidina. Se presentó como asociación y mecanismo propuesto.
10. **Dirección de los cambios de mineralización (sección 6.2).** Que el alto recambio da matriz más joven y menos mineralizada, y el bajo recambio matriz más vieja y más mineralizada, es una generalización útil; el detalle depende del sitio y de la enfermedad. Confirmar el nivel de detalle deseado.
11. **La DMO explica aproximadamente el 70 % de la resistencia ósea (sección 6.3).** Es la cifra citada por el consenso del NIH de 2000 y repetida en la literatura; es aproximada.
12. **Diabetes tipo 2: densidad normal o alta y mayor riesgo de fractura, con AGE como mecanismo propuesto (sección 6.3, actividad de relación y evaluación final).** El mayor riesgo de fractura con densidad normal o alta está bien descrito; el mecanismo por AGE es una hipótesis (ver la nota 9).
13. **Referencia del T-score (sección 6.3).** Se dijo "adultos jóvenes sanos de 20 a 29 años" sin fijar la base de datos. La ISCD y la OMS/IOF difieren en la referencia para los hombres (base masculina frente a la referencia femenina en el cuello femoral). Confirmar la política del servicio.
14. **Fracturas por fragilidad con T-score por encima de −2,5 (sección 6.3).** Varios estudios (por ejemplo, el NORA) muestran que una gran parte de las fracturas ocurre en mujeres sin osteoporosis densitométrica; el porcentaje exacto varía. Se dijo "una parte considerable".
15. **Fractura por fragilidad de cadera o vértebra como diagnóstico clínico (sección 6.3 y banco de preguntas).** Es un criterio de varias guías clínicas (por ejemplo, las de BHOF). No todas las sociedades lo formulan igual; confirmar la guía local.
16. **Umbrales de intervención de FRAX (sección 6.3).** Los umbrales para tratar dependen del país y de la guía. Se dijo que cada país los fija, sin dar cifras.
17. **Riesgo de fractura a lo largo de la vida: 1 de cada 3 mujeres y 1 de cada 5 hombres mayores de 50 años (sección 6.3 y ganchos).** Es la cifra de la International Osteoporosis Foundation. Los estudios de cada país dan porcentajes distintos.
18. **Pérdida del reborde tras la extracción (sección 6.4 y actividad 3D).** Se citan las cifras de una revisión sistemática de estudios en humanos: 29 a 63 % del ancho y 11 a 22 % de la altura a los 6 meses, con medias de aproximadamente 3,8 mm y 1,2 mm. Otros trabajos dan valores distintos según el sitio, el tipo de diente y el método. Los sitios de la revisión son mixtos, con predominio de dientes no molares; no son específicos de la mandíbula posterior. La mayor parte del cambio ocurre en los primeros 3 a 6 meses.
19. **Efecto de la prótesis mucosoportada sobre la reabsorción (sección 6.4 y banco de preguntas).** Se dijo que la reabsorción es mayor con una carga no fisiológica; la evidencia es de estudios observacionales y la magnitud varía entre personas.
20. **Reabsorción de la mandíbula frente al maxilar (aproximadamente 4 veces en la región anterior) (sección 6.4).** Es una razón de 1:4 citada de estudios clásicos (Tallgren, Atwood y otros). Cifra antigua y aproximada; confirmar con un texto actual.
21. **Preservación del alvéolo e implantes frente a prótesis mucosoportada (sección 6.4).** Se afirmó que la preservación reduce, sin eliminar, los cambios dimensionales, y que los implantes tienden a conservar mejor el hueso que una prótesis mucosoportada. Es la tendencia de las revisiones, pero depende del caso y de la técnica.
22. **Osteoporosis y pérdida dentaria (sección 6.4).** Las revisiones sistemáticas encuentran asociación con periodontitis en mujeres posmenopáusicas en la mayoría de los estudios, pero algunos estudios ajustados no la encuentran, y no se ha establecido un mecanismo causal. Por eso el texto habla de asociación y de factores compartidos y locales.
23. **Rendimiento de los índices panorámicos (sección 6.4).** La sensibilidad y la especificidad de la cortical mandibular para detectar baja DMO son moderadas y varían entre estudios. Se dijo "moderadas" sin cifras. La localización que se usa (cortical inferior a la altura del foramen mentoniano y por detrás de él, borde endóstico) sigue la descripción de Klemetti; confirmar con el docente de radiología oral.
24. **ATM: frecuencia de hallazgos en personas mayores y papel de la pérdida de dientes y de las hormonas (sección 6.4 y actividad 3D).** Algunos estudios muestran una prevalencia alta de signos radiográficos con pocos síntomas; los rangos de prevalencia difieren mucho según el método. La relación con la pérdida de dientes posteriores y con los estrógenos es discutida.
25. **Fuerza de mordida menor en el edentulismo (actividad 3D, hotspot del ángulo).** Es un hallazgo habitual, pero varía entre estudios y tipos de prótesis.
26. **Línea milohioidea como sitio frecuente de ONM (actividad 3D).** Es una localización descrita con frecuencia por su mucosa delgada; confirmar la frecuencia relativa con un texto actual.
27. **Calcio y vitamina D según el IOM (sección 6.5 y banco de preguntas).** 1000 mg de 19 a 50 años; 1200 mg en mujeres desde los 51 y hombres desde los 71; vitamina D 600 UI hasta los 70 y 800 UI desde los 71. Otras guías (por ejemplo, de sociedades de osteoporosis y de endocrinología) recomiendan cifras algo distintas, sobre todo de vitamina D. Confirmar qué referencia usa el curso.
28. **Romosozumab y ONM (sección 6.5).** Se han descrito casos; los datos son escasos y de fuentes distintas (algunas guías odontológicas lo incluyen entre los fármacos de riesgo). Confirmar el nivel de detalle.
29. **Frecuencia de ONM (sección 6.5).** La AAOMS (2022) da aproximadamente 0,02 a 0,05 % en osteoporosis. Otras fuentes, incluidas guías de asociaciones odontológicas, dan rangos entre aproximadamente 0,001 y 0,01 %, y estimaciones de hasta cerca de 0,1 %. En oncología las series dan de aproximadamente 1 a varios por ciento (la AAOMS habla de menos de 5 %). Las cifras dependen del fármaco, la dosis, la duración y el método.
30. **Hipótesis sobre por qué la ONM afecta a los maxilares (sección 6.5).** Exposición a bacterias, mucosa delgada y alto recambio del hueso alveolar son hipótesis; no hay consenso. Se dijo "no está resuelto".
31. **Pausa del fármaco antirreabsortivo (sección 6.5).** Se dijo que no hay evidencia suficiente para recomendar una pausa rutinaria (posición de la ADA y de la AAOMS). Es un tema en evolución; confirmar con la guía local vigente.
32. **Esclerostina y reabsorción (actividad de arrastre y sección 6.5).** La esclerostina es un antagonista de la vía Wnt que frena la formación; hay evidencia de que también favorece de forma indirecta la reabsorción (aumento de RANKL y descenso de OPG en osteocitos, en modelos celulares). El romosozumab, por eso, aumenta la formación y reduce algo la reabsorción. Se dejó la frase con [verificar].
33. **Rebote tras suspender el denosumab (sección 6.5, evaluación final y ganchos).** Al suspenderlo, el recambio óseo sube por encima del valor basal en pocos meses y la densidad vuelve al valor previo o por debajo en 1 a 2 años, con riesgo de fracturas vertebrales múltiples. Está descrito en el ensayo FREEDOM y su extensión y en revisiones; la conducta de transición (por ejemplo, un antirreabsortivo posterior) la decide el médico. Confirmar el nivel de detalle.

### B. Otros datos que conviene confirmar (sin marca en el cuerpo)

1. **Definición de osteoporosis.** Se usó la del consenso del NIH (conferencia de 2000, publicada en JAMA en 2001). La definición anterior del consenso de 1993 (masa ósea baja y deterioro de la microarquitectura) es equivalente en lo esencial; confirmar cuál prefiere el docente.
2. **Términos "osteopenia" y "baja masa ósea".** Algunas sociedades desaconsejan "osteopenia" y prefieren "baja masa ósea". Se usó "baja masa ósea (osteopenia)" en el texto. Confirmar el término que se quiere mostrar.
3. **OPG circulante en el déficit de estrógenos.** Se expresó el efecto mediante la relación RANKL/OPG, que es lo que muestran los estudios celulares (en la actividad se escribe "en modelos celulares, favorece a la OPG" y la animación destaca la bajada de RANKL como efecto principal); los niveles circulantes de OPG varían entre estudios y no siempre bajan. Confirmar el nivel de detalle.
4. **Estrógeno y apoptosis de osteoclastos.** Se dijo que el estrógeno favorece la apoptosis de los osteoclastos; el mecanismo exacto (por ejemplo, por FasL) se sigue discutiendo. Se omitió el mecanismo.
5. **Eficacia del ejercicio.** Se dijo que el ejercicio actúa sobre el osteocito y la esclerostina y que reduce las caídas. El efecto sobre la DMO del adulto es modesto y depende del tipo de ejercicio. Se omitió cualquier cifra.
6. **Nombres comerciales y dosis.** No se incluyó ninguno. Confirmar si el docente quiere mencionar fármacos con más detalle o dejar solo los mecanismos.
7. **Cronología de las etapas del reborde.** Se ligaron las seis etapas ilustradas a las clases I a VI de Cawood y Howell de forma esquemática: el paso de una clase a otra no es una cronología uniforme, varía entre personas. Confirmar que el docente acepta esa equivalencia.
8. **Mayor pérdida de la pared vestibular.** Se dijo "la pared más delgada, a menudo la vestibular", limitado a sitios anteriores y premolares; en la figura de la región posterior se pide grosor variable de ambas tablas (en molares mandibulares la cortical vestibular suele ser gruesa por la línea oblicua externa). La reabsorción del reborde difiere entre la región anterior y la posterior, y entre maxilar y mandíbula (en la mandíbula el reborde suele resorberse hacia abajo y hacia afuera). Confirmar el nivel de detalle.
9. **Duración y reparto de tiempos.** Los 40 minutos (rango de 35 a 45) y el reparto por sección son estimados de este borrador: lectura de unas 3000 palabras (unos 14 a 15 min) más unos 25 a 30 min de actividades obligatorias. Conviene probarlos con estudiantes. El módulo tiene bastante contenido para la densidad media; si excede, pasar la ATM y los AGE detallados a recuadros opcionales o reducir a cuatro las capas requeridas de la multicapa de 6.3.
10. **Puntajes y número de preguntas.** Los `puntaje_max`, la cantidad de preguntas y qué actividades son opcionales son una propuesta y deben acordarse con el docente y con el diseño de gamificación. Los quizzes no siguen exactamente la guía de 10 puntos por pregunta del esquema de contenido, que es orientativa: los quizzes opcionales de 3 o 4 preguntas valen 20 o 30 y la evaluación final (8 preguntas) vale 100 para que el cierre del módulo pese más que las prácticas opcionales. El total (440) queda dentro del rango de 100 a 600.
11. **Referencias a los módulos 1 a 5.** Se aludió a mecanotransducción (módulo 3), mineralización (módulo 4) y remodelado con RANKL/OPG (módulo 5) según el briefing. Confirmar que esos módulos cubren esos temas con esos nombres.
12. **Decisiones de alcance.** Se incluyeron farmacología básica (mecanismos, no dosis) y ONM con prudencia clínica porque el briefing lo pide como aplicación de los mecanismos. Confirmar con el docente el nivel de detalle clínico deseado para pregrado.
13. **Imágenes y modelo 3D.** La mandíbula provisional es un modelo de BodyParts3D (licencia CC BY-SA 2.1 JP) que debe mostrar su atribución, sin atrofia. Confirmar si el docente dispone de un modelo propio o de cortes reales.
14. **Datos bibliográficos de las referencias 11 a 30.** Se citan autor, título, revista y año, sin páginas, volúmenes ni DOI, porque no se pudieron confirmar (la referencia 11 es de JAMA 2001 y corresponde a la conferencia de consenso de 2000). Las cifras del cuerpo proceden de estas fuentes y de consultas a documentos de sociedades científicas (ISCD, IOF, AAOMS, ADA). Verificar cada referencia antes de la versión final.
15. **Siglas y términos.** Se usa "ONM" (osteonecrosis de los maxilares asociada a medicamentos) con su sigla inglesa MRONJ en el glosario; confirmar cuál prefiere el docente. Lo mismo para "hueso alveolar propio" frente a "hueso fasciculado" y "bundle bone", que se presentan como sinónimos, como en el módulo 1.
16. **Mecanostato y ley de Wolff.** El módulo 1 introduce la ley de Wolff y el módulo 3 la mecanotransducción; aquí se habla de "adaptación a la carga (mecanostato)". Confirmar que el docente quiere usar ese término en este módulo.

## Registro de revision

Revision cientifica independiente del guion (19 hallazgos). Las cifras de SWAN y el rebote del denosumab se contrastaron con fuentes (resumen de la revision de salud osea en la menopausia, PMC 6226267, que cita a Greendale 2012, y revisiones y ensayos sobre la suspension del denosumab). El resto se resolvio por razonamiento explicito.

| Hallazgo | Decision | Razon breve |
|---|---|---|
| 1. Cifra de SWAN mal atribuida (10 % en seis anos) | Aceptado | Verificado: 2,5 %/ano en columna y 1,8 %/ano en cuello femoral durante tres anos de transicion (cerca de un ano antes a dos despues de la ultima menstruacion), unos 7 % en columna. Se corrigieron texto, video paso_4, nota A.5, descripcion de la figura y la escena. El 10 % acumulado se dejo solo como cifra de unos diez anos con [verificar] |
| 2. Pares ambiguos en m6_3_relacion_factores | Aceptado | Es cierto que estrogenos, glucocorticoides e inmovilizacion comparten efectos. Se reformularon las tres opciones derechas para que cada una nombre el mecanismo dominante y exclusivo, se anadio la aclaracion en la instruccion y en las explicaciones, y se ajusto el gancho del mentor |
| 3. Ambiguedad del orden en m6_4_ordenar_reborde | Aceptado | Los pasos p4 y p5 eran intercambiables. Se fundieron y se anclo cada paso a un momento (dia de la extraccion, semanas, 3 a 6 meses, anos, atrofia severa): quedan seis pasos. Se actualizaron instrucciones, retroalimentacion, explicacion y gancho |
| 4. Cifra de la IOF conflacionada en los ganchos | Aceptado | Es riesgo de fractura a lo largo de la vida, no prevalencia de osteoporosis. Corregido en los ganchos y precisado en 6.3 |
| 5. Mandibula ausente en 6.1 a 6.3 | Aceptado | Se anadio un recuadro Clinico mandibular en cada una de las tres secciones y se ajusto la frase de la conexion |
| 6. Duracion corta | Aceptado | El calculo del revisor es razonable. Se declaran 40 minutos (35 a 45) con [verificar] y nuevo reparto. No se recorto contenido; se dejo la opcion de recorte en las notas |
| 7. Pared vestibular mas delgada en la region posterior | Aceptado | El hallazgo de Araujo y Lindhe y de sitios anteriores no se generaliza a molares mandibulares. Se limito el texto a sitios anteriores y premolares, se pidio grosor variable en la figura y se aclaro en A.18 y B.8 que las cifras de Tan son de sitios mixtos |
| 8. Distractor esclerostina contradice a romosozumab | Aceptado | La esclerostina tambien favorece de forma indirecta la reabsorcion (aumenta RANKL, baja OPG en modelos celulares). Se reescribio el distractor con [verificar] y se anadio la nota A.32 |
| 9. OPG como hecho en el efecto de estrogeno; 406 caracteres | Aceptado | Se matizo con "en modelos celulares", se recorto por debajo de 400 caracteres y la animacion prioriza la bajada de RANKL |
| 10. "Mas del 90 %" a los 18 anos | Aceptado | Las revisiones dicen alrededor del 90 % a los 18 anos en ninas y 20 en ninos. Corregido en el dato, el video y A.2 |
| 11. Rebote tras suspender denosumab | Aceptado | Verificado: aumento del recambio por encima del basal, perdida de densidad en 1 a 2 anos y fracturas vertebrales multiples. Anadido en Atencion de 6.5, en la explicacion de m6_f_q8, en los ganchos y en la nota A.33 |
| 12. Objetivo 4 sin cobertura obligatoria de Z-score y FRAX | Parcial | Se rebajo el objetivo a clasificar un T-score en casos y distinguir Z-score y FRAX, que es lo que evaluan las actividades. No se anadio una pregunta nueva para no cambiar el peso de la evaluacion final sin acuerdo del docente |
| 13. Carga cognitiva de la tabla de 6.2 | Parcial | Se quitaron de la tabla RUNX2/PPARgamma y el detalle de Maillard y pentosidina y se pasaron a recuadros Dato "para quien quiera profundizar". Se mantienen en las actividades, pensadas tambien para posgrado. El formato de avisos solo admite los cuatro tipos definidos, por eso no es un recuadro plegable |
| 14. RANKL en dos papeles | Aceptado | Se aclaro en la instruccion, la descripcion de la escena, la molecula y las notas de la figura que la molecula arrastrable es el RANKL presentado al precursor y el fijo es el sitio de la OPG |
| 15. Distractor c de m6_3_q2 no limpio | Aceptado | Se precisa "Mujeres posmenopausicas con una fractura previa de cadera por fragilidad" |
| 16. Puntajes de quiz distintos de 10 por pregunta | Parcial | La guia es orientativa. Se mantuvieron y se documento el motivo en B.10 para acordarlo con el docente y con gamificacion; el total (440) esta dentro del rango |
| 17. Localizacion del indice de Klemetti | Aceptado | Se cambio a "a la altura del foramen mentoniano y por detras de el" en texto, hotspot, quiz, banco y notas de dibujo, y se anoto en A.23 |
| 18. Ano del consenso del NIH | Aceptado | Se escribe "conferencia de 2000, publicada en JAMA en 2001" y se aclara en B.1 y B.14 |
| 19. Definicion de senescencia en osteocitos | Aceptado | El osteocito es posmitotico. Se redefine como estado de estres celular con arresto del ciclo o perdida de funcion y SASP, con la precision para osteocitos |
