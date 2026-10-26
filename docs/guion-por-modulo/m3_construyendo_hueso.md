# Modulo 3: Construyendo hueso

> Estado: BORRADOR. Desde el 2026-10-25 las secciones, títulos, textos y preguntas de evaluación son los del documento del docente «Modulos del 1 al 3, completados, listos para desarrollar.pdf» (fuente de verdad), transcritos al pie de la letra. El contenido anterior de este guion (dos rutas de osificación, mandíbula fetal, osteocito sensor, sensores y mensajeros, Wnt/esclerostina/PTH, mecanostato y evaluación final) queda en el historial de git.

> Convenciones de este guion. Los encabezados estructurales, las claves YAML y las etiquetas de aviso (Clinico, Dato, Atencion, Recuerda) van sin tilde para que se transcriban sin ambiguedad. Las indicaciones del docente al equipo de desarrollo («Imagen #N», «Texto lateral que debe ir allí», «Allí pondré el mini video…», «Voy a señalar en esta imagen…») no son contenido para el estudiante: están en «Pendientes del documento del docente», al final de este guion, con la sección y el lugar donde va cada imagen o video.

## Ficha

| Campo | Valor |
|---|---|
| Modulo | 3 de 6 |
| Foco | Mecanotransducción y formación ósea |
| Densidad | Alta |
| Duración estimada | 60 a 90 minutos [verificar] |
| Número de secciones | 3 |
| Nivel | Pregrado y posgrado de ciencias de la salud, con enfoque en el hueso mandibular |
| Logro que se otorga al completarlo | Constructor (id `constructor`) |
| Criterio de logro propuesto | Completar las actividades obligatorias (propuesta, a validar con el docente) |
| Prerrequisitos | Módulos 1 y 2 (generalidades del hueso y células óseas). Prepara el módulo 4 (mineralización) y el módulo 5 (remodelado) |

## Objetivos de aprendizaje

1. Explicar cómo BMP, RUNX2 y osterix dirigen la diferenciación del osteoblasto.
2. Describir cómo el osteocito percibe la carga: movimiento del líquido intersticial en el sistema lacunocanalicular, sensores (integrinas, PIEZO1, conexina 43) y mediadores (Ca²⁺, PGE₂, ATP).

## Ilustraciones y modelos requeridos

Ninguna ilustración del guion anterior se usa en este módulo. Las imágenes y los videos del documento del docente están en «Pendientes del documento del docente».

## Secciones

### Seccion 3.1: Mecanotransducción (id "m3_1_mecanotransduccion")

#### Contenido

**El hueso percibe las cargas - Osteocito**

Cuando el hueso recibe una carga mecánica, como ocurre durante la masticación o la actividad física, la matriz mineralizada experimenta pequeñas deformaciones que generan gradientes de presión y favorecen el movimiento del líquido intersticial a través del sistema lacunocanalicular, la red de lagunas y canalículos que conecta a los osteocitos. El desplazamiento de este fluido produce fuerzas sobre la superficie celular y su entorno pericelular, estimulando estructuras sensibles a los cambios mecánicos, como los canales iónicos, las integrinas y el citoesqueleto.

Mediante la mecanotransducción, el osteocito convierte estos estímulos físicos en señales intracelulares capaces de modificar la actividad de las células óseas. Así, se distingue el estímulo mecánico —la deformación de la matriz y el movimiento del fluido— de la respuesta celular, que permite adaptar la actividad del tejido a las demandas funcionales y contribuye a regular la formación y el remodelado óseo.

**¿Cómo detecta el osteocito la fuerza?**

La detección de las cargas depende de la interacción entre la matriz pericelular, las integrinas, las adhesiones focales y el citoesqueleto, que transmiten las fuerzas hacia la membrana y el interior celular. Entre los principales sensores destaca PIEZO1, un canal mecanosensible cuya apertura permite la entrada de Ca²⁺ y constituye una de las primeras señales de mecanotransducción; también se ha descrito la participación de PIEZO2 y TRPV4, aunque su contribución específica está menos caracterizada.

La entrada de cationes puede modificar el potencial de membrana y favorecer la apertura de canales de calcio dependientes de voltaje (VSC), amplificando la señal. A su vez, la activación de receptores de IP₃ en el retículo endoplásmico permite liberar calcio almacenado, mientras que canales como Panx1 facilitan la liberación de ATP, que puede activar receptores purinérgicos como P2X7 y contribuir a nuevas señales de Ca²⁺. Otros canales, como TRPM6 y TRPM7, también se han relacionado con la regulación de cationes, aunque su papel específico en la mecanotransducción osteocítica está menos definido. En conjunto, estos mecanismos generan señales intracelulares que permiten al osteocito responder a las cargas mecánicas.

**De la señal mecánica a la respuesta celular**

Después de la entrada de Ca²⁺ y la amplificación de la señal intracelular, el osteocito activa mecanismos de señalización que convergen en la regulación de la expresión génica y la comunicación con otras células óseas. Parte del Ca²⁺ intracelular se une a la calmodulina, una proteína sensora que activa efectores como la calcineurina y contribuye a traducir la señal iónica en respuestas celulares. En paralelo, distintas señales mecánicas, transmitidas por las integrinas y el citoesqueleto, modulan vías como WNT/β-catenina y la expresión de sus inhibidores, entre ellos la esclerostina, codificada por el gen SOST. La carga mecánica puede reducir la expresión de SOST y, en determinados modelos experimentales, favorecer la expresión de ligandos como WNT1; sin embargo, los pasos que conectan la señal de Ca²⁺ con estos cambios en la expresión génica no están completamente definidos y no deben interpretarse como una única secuencia obligatoria.

En paralelo, el osteocito libera mediadores que transmiten señales al microambiente óseo. La apertura de hemicanales de conexina 43 (Cx43) se ha relacionado con la liberación de PGE₂ y ATP en respuesta a estímulos mecánicos, mientras que PANX1 también participa en la liberación de ATP, aunque la contribución específica de estos canales continúa en estudio. De forma complementaria, el osteocito puede producir y secretar ligandos WNT. En conjunto, estas señales permiten comunicar la respuesta mecánica a otras células del tejido óseo, incluidos los osteoblastos, y contribuir a modular su actividad.

**Acoplamiento bioquímico: Otras vías en acción**

1. **SOST:** Gen que codifica la esclerostina, un inhibidor de la señalización WNT/β-catenina.
2. **Wnt/β-catenina:** La unión de WNT a Frizzled y LRP5/6 favorece la estabilización de β-catenina y su entrada al núcleo.
3. **β-catenina + TCF/LEF:** En el núcleo regula genes relacionados con la actividad y la formación ósea.
4. **Integrinas:** Conectan la matriz extracelular con el citoesqueleto y transmiten fuerzas mecánicas mediante complejos proteicos que incluyen talina, vinculina, paxilina y FAK/Src.
5. **Vías FAK/Src y RhoA/ROCK:** Activan rutas como ERK y PI3K/Akt y regulan la organización y tensión del citoesqueleto, contribuyendo a la respuesta mecanosensible y a la regulación de YAP/TAZ.
6. **YAP/TAZ:** Actúan como efectores mecanosensibles que se asocian con TEAD en el núcleo y regulan genes como MMP13 y MMP14, implicados en la remodelación de la matriz pericelular y lacunocanalicular, no en la resorción osteoclástica.

**Nota:** Las vías representadas no constituyen una secuencia lineal, sino una red de mecanismos de señalización que interactúan durante la mecanotransducción. Las rutas WNT/β-catenina, FAK/Src y RhoA/ROCK, junto con los efectores YAP/TAZ, contribuyen a integrar las señales mecánicas y regular la expresión génica. Su activación y sus efectos dependen del contexto celular y de las condiciones del estímulo mecánico.

#### Actividades

##### Actividad m3_ordenar_mecanotransduccion

```yaml
# Documento del docente, 3.1, «Actividad 1» (organización secuencial y asociación de conceptos; dificultad básica e
# intermedia). Objetivo: reconocer los principales componentes de la mecanotransducción osteocítica y relacionarlos
# con sus funciones. El documento solo trae el «Ejercicio 1. Organiza la secuencia».
tipo: quiz
titulo: "Organiza la secuencia"
instrucciones: "Ordena los siguientes eventos para representar la secuencia general mediante la cual el osteocito detecta un estímulo mecánico y genera una respuesta celular."
obligatoria: true
puntaje_max: 20
concepto: "Componentes de la mecanotransducción osteocítica"
retroalimentacion:
  acierto: "Esta secuencia representa una organización general del proceso, no una cascada molecular única y obligatoria."
  error: "Repasa la secuencia: deformación de la matriz y movimiento del líquido intersticial, estímulo de las estructuras mecanosensibles, entrada de Ca²⁺, señalización intracelular y liberación de mediadores."
preguntas:
  - id: m3_q_mecano_orden
    formato: ordenar_pasos
    enunciado: "Ordena los siguientes eventos para representar la secuencia general mediante la cual el osteocito detecta un estímulo mecánico y genera una respuesta celular."
    pasos:
      - id: a
        texto: "Activación de mecanismos de señalización intracelular y regulación génica."
      - id: b
        texto: "Deformación de la matriz ósea y movimiento del líquido intersticial."
      - id: c
        texto: "Liberación de mediadores que comunican la respuesta a otras células óseas."
      - id: d
        texto: "Estimulación de estructuras mecanosensibles del osteocito."
      - id: e
        texto: "Entrada de Ca²⁺ y amplificación de la señal intracelular."
    correcta: [b, d, e, a, c]
    explicacion: "La deformación de la matriz favorece el desplazamiento del líquido intersticial a través del sistema lacunocanalicular, generando fuerzas sobre el osteocito y su entorno. Estas fuerzas estimulan estructuras mecanosensibles, como PIEZO1, e inician señales intracelulares en las que participa el Ca²⁺. Posteriormente, distintas vías regulan la expresión génica y la liberación de mediadores que permiten la comunicación con otras células óseas. Esta secuencia representa una organización general del proceso, no una cascada molecular única y obligatoria."
    dificultad: 1
    concepto: "Secuencia general de la mecanotransducción osteocítica"
```

##### Actividad m3_eval_mecanotransduccion

```yaml
# Documento del docente, 3.1, «Evaluación».
tipo: quiz
titulo: "Evaluación: Mecanotransducción"
instrucciones: "Responde las preguntas. Después de cada respuesta verás su justificación."
obligatoria: true
puntaje_max: 20
concepto: "Mecanotransducción"
retroalimentacion:
  acierto: "Revisa la justificación de cada pregunta antes de continuar."
  error: "Revisa la justificación de cada pregunta y vuelve a leer la sección antes de intentarlo de nuevo."
preguntas:
  - id: m3_q_eval1_1
    formato: opcion_multiple
    enunciado: "Cuando una carga mecánica deforma la matriz ósea, ¿qué mecanismo favorece el desplazamiento del líquido intersticial alrededor de los osteocitos?"
    opciones:
      - id: a
        texto: "La contracción de los osteoclastos sobre la superficie ósea."
      - id: b
        texto: "Los gradientes de presión generados por la deformación de la matriz."
      - id: c
        texto: "La mineralización inmediata del osteoide."
      - id: d
        texto: "La liberación de esclerostina hacia el líquido intersticial."
    correcta: b
    explicacion: "La deformación de la matriz mineralizada genera gradientes de presión que favorecen el movimiento del líquido intersticial a través del sistema lacunocanalicular. El desplazamiento del fluido produce fuerzas sobre los osteocitos y su entorno pericelular, iniciando la detección del estímulo mecánico."
    concepto: "Movimiento del líquido intersticial"
  - id: m3_q_eval1_2
    formato: opcion_multiple
    enunciado: "**Análisis de la comunicación intercelular.** Una intervención experimental bloquea la comunicación entre los osteocitos y las células formadoras de hueso, pero no impide la detección inicial de la carga mecánica. ¿Qué componente del proceso podría verse afectado de manera más directa?"
    opciones:
      - id: a
        texto: "La deformación física inicial de la matriz ósea."
      - id: b
        texto: "La capacidad del osteocito para detectar cualquier estímulo mecánico."
      - id: c
        texto: "La transmisión de señales al microambiente y la modulación de la actividad osteoblástica."
      - id: d
        texto: "La existencia del sistema lacunocanalicular."
    correcta: c
    explicacion: "La detección mecánica y la comunicación intercelular son componentes relacionados, pero diferenciables. El bloqueo de la comunicación puede alterar la coordinación de la respuesta ósea y la modulación de la actividad osteoblástica, aunque la detección inicial del estímulo permanezca intacta."
    concepto: "Comunicación intercelular"
```

### Seccion 3.2: Activación osteogénica y organización de la formación ósea (id "m3_2_activacion_osteogenica")

#### Contenido

**Activación de los progenitores osteogénicos**

Los progenitores esqueléticos responden a señales del osteocito, otras células del microambiente y la matriz extracelular, cuya integración favorece su reclutamiento, activación y compromiso hacia el linaje osteoblástico, especialmente durante la adaptación mecánica, la reparación y la renovación ósea. Entre las principales vías implicadas, WNT/β-catenina promueve la expresión de genes osteogénicos mediante la unión de sus ligandos a Frizzled y LRP5/6, mientras que la disminución de esclerostina, codificada por SOST, puede facilitar esta señalización en respuesta a la carga mecánica. Por su parte, BMP/SMAD favorece la diferenciación osteoblástica en interacción con factores de transcripción como RUNX2 y SP7/OSX. Otros mediadores, como la PGE₂, modulan la respuesta osteogénica mediante los receptores EP2/EP4 y la señalización AMPc/PKA, además de interactuar con WNT; el ATP, a través de receptores purinérgicos, participa en la comunicación celular, aunque sus efectos sobre la diferenciación dependen del contexto y no son necesariamente anabólicos. En conjunto, estas señales regulan la transición hacia células formadoras de hueso, mientras que RUNX2 y SP7/OSX contribuyen a establecer el programa osteoblástico y preparan a estas células para sintetizar la matriz osteoide, proceso que se abordará en el siguiente apartado.

**Activación del fenotipo formador**

Una vez que el progenitor adquiere el compromiso osteoblástico, las señales del microambiente favorecen la activación de su programa funcional de formación ósea, caracterizado por un aumento de la actividad biosintética orientada a producir los componentes orgánicos de la matriz extracelular. En este proceso destaca la síntesis de colágeno tipo I, principal componente orgánico de la matriz ósea, junto con proteínas no colágenas como osteopontina, osteocalcina y osteonectina, que participan en su organización y en la regulación de la mineralización. Este cambio funcional prepara al osteoblasto para sintetizar, procesar y secretar los componentes de la matriz hacia el espacio extracelular; allí se organizan para constituir el osteoide, una matriz orgánica no mineralizada que posteriormente experimentará la deposición de minerales. Así, la activación del fenotipo formador conecta las señales osteogénicas con la producción efectiva de nueva matriz ósea, dando paso al proceso de formación del osteoide.

**¿Dónde se inicia la formación ósea?**

La formación ósea no ocurre de manera aleatoria, sino que se concentra en superficies y microambientes donde convergen señales mecánicas, celulares y moleculares capaces de favorecer la actividad osteogénica; estos sitios incluyen las superficies periosteales, endosteales y trabeculares, así como regiones sometidas a adaptación mecánica o reparación tisular. En ellos, la disponibilidad de progenitores esqueléticos, la actividad de las células residentes y las señales procedentes de la matriz extracelular contribuyen a determinar dónde puede iniciarse la formación de nueva matriz ósea. La localización de este proceso depende de la interacción entre las necesidades funcionales del tejido y la organización de su microambiente celular; durante el remodelado, esta organización puede dar lugar a compartimentos especializados que reúnen células y señales reguladoras en torno a las superficies óseas activas. Uno de ellos es el compartimento de remodelado óseo, asociado a una estructura conocida como canopy.

**El canopy de remodelado óseo: un microambiente organizado**

Durante el remodelado óseo, algunas superficies activas presentan una cubierta celular denominada canopy, que forma parte del compartimento de remodelado óseo (bone remodeling compartment, BRC). Esta estructura, constituida por células relacionadas con el linaje osteoblástico, se ha caracterizado especialmente en las superficies trabeculares humanas, que forman parte de las superficies internas revestidas por endostio, donde delimita el sitio de remodelado y lo separa parcialmente de la médula ósea. También se han descrito compartimentos de remodelado asociados a los conductos de Havers del hueso cortical, aunque su organización varía según la localización y el modelo estudiado.

El canopy contribuye a organizar el microambiente del remodelado óseo al delimitar y proteger parcialmente la zona donde se desarrolla este proceso. Aunque la resorción y la formación ósea están acopladas dentro de una misma unidad de remodelado, no ocurren simultáneamente en el mismo punto: la formación de matriz osteoide sucede después de la resorción local, aunque distintas regiones de la unidad pueden encontrarse en fases diferentes al mismo tiempo. La proximidad del canopy a los capilares facilita el acceso de precursores celulares y sus propias células podrían contribuir al aporte local de células osteoprogenitoras. Aunque esta cubierta no es indispensable para toda formación ósea y puede desaparecer durante etapas avanzadas del remodelado, su pérdida prematura se ha asociado con un reclutamiento osteoblástico deficiente y una menor formación de matriz, especialmente en condiciones patológicas como la osteoporosis.

**¿Cómo llega una señal del microambiente hasta la matriz?**

Una vez que los progenitores osteogénicos se han diferenciado hacia el linaje osteoblástico y se ha establecido el frente de formación dentro del microambiente óseo, el siguiente paso es comprender cómo las señales del entorno determinan cuándo, dónde y con qué intensidad se activa la formación de nueva matriz. En los sitios de remodelado que presentan canopy, esta estructura contribuye a organizar el microambiente donde interactúan señales celulares, vasculares y moleculares; dependiendo de las condiciones locales, diferentes vías de señalización pueden actuar de manera independiente o cooperativa, modulando factores transcripcionales como RUNX2 y SP7/Osterix y, posteriormente, la expresión de genes asociados con la matriz, entre ellos COL1A1 y COL1A2. Así, las células osteoblásticas integran múltiples señales del microambiente y ajustan su actividad formadora según las necesidades del tejido; a continuación, exploraremos estas rutas mediante diferentes escenarios que muestran cómo el contexto determina la respuesta osteogénica.

**Rutas de señalización**

- **Carga mecánica dinámica In situ** (Masticación)
- **Señales moleculares posteriores a la resorción ósea**
- **Señalización angiogénica y vascular** (Señales procedentes de células endoteliales que favorecen el acoplamiento entre angiogénesis y formación ósea)
- **Ausencia de estímulo mecánico** (Reducción de la carga oclusal, inmovilización prolongada)

**1. Carga mecánica dinámica In situ**

**Contexto mecanobiológico:** La mecanotransducción no activa una única vía de señalización, sino que desencadena respuestas paralelas y complementarias dentro del osteocito; ante la deformación mecánica y el flujo de líquido en el sistema lacunocanalicular, se activan simultáneamente señales como Wnt/β-catenina, PGE₂ y las vías asociadas a integrinas/FAK, que convergen sobre el programa osteogénico y permiten ajustar la actividad de las células formadoras de hueso.

**Ruta 1.1:** Eje Canónico Wnt β-catenina

- **Receptor / Co-receptor:** Complejo Frizzled (FZD) y LRP5/6.
- **Mecanismo Citoplásmico:** Reclutamiento de Dishevelled (Dvl) e inactivación del complejo de destrucción de β-catenina (GSK-3β, Axin, APC).
- **Acumulación:** Estabilización de β-catenina no fosforilada en el citosol y translocación a través del poro nuclear.
- **Efecto Transcripcional:** El complejo β-catenina–TCF/LEF puede favorecer la expresión de RUNX2 y de otros genes relacionados con el programa osteogénico.

**Ruta 1.2:** Eje Paracrino PGE₂ / EP4 / PKA (Amplificador Transcripcional)

- **Receptor:** Receptor acoplado a proteína G (GPCR) subfamilia EP4.
- **Mecanismo Citoplásmico:** La activación de EP4 estimula la subunidad Gαs, que activa la adenilato ciclasa y aumenta la concentración intracelular de AMPc, lo que conduce a la activación de la proteína quinasa A (PKA).
- **Efecto Transcripcional:** PKA fosforila al factor de transcripción CREB, que suele encontrarse en el núcleo. Su fosforilación modula su actividad y favorece la interacción con elementos de respuesta al AMPc (CRE) en regiones reguladoras de genes osteogénicos, incluido RUNX2, favoreciendo la actividad transcripcional asociada con el programa osteogénico.

**Ruta 1.3:** Eje de Mecanotransducción Directa Integrinas / FAK / p38 MAPK (Activador Proteico)

- **Mecanosensor:** Unión de integrinas, como αvβ3 y heterodímeros que contienen la subunidad β1, a ligandos de la matriz extracelular, transmitiendo las fuerzas mecánicas hacia el interior celular.
- **Mecanismo citoplasmático:** Activación de la quinasa de adhesión focal (FAK) y señalización a través de cascadas de quinasas que incluyen MKK3/6–p38 MAPK y MEK1/2–ERK1/2. Estas rutas se representan de forma simplificada, ya que omiten intermediarios y no implican necesariamente activaciones directas entre todos sus componentes.
- **Efecto transcripcional:** La activación de p38 MAPK y ERK1/2 puede modular la actividad de RUNX2 mediante fosforilación y otros mecanismos reguladores, favoreciendo la expresión de genes asociados con la diferenciación osteoblástica y la formación de matriz ósea.

**2. Señales moleculares posteriores a la resorción ósea**

**Contexto mecanobiológico:** Durante la resorción osteoclástica, la degradación de la matriz ósea puede liberar factores de crecimiento que contribuyen al reclutamiento de progenitores osteogénicos y a la formación posterior de hueso nuevo. Entre ellos, el TGF-β participa en la quimiotaxis y el reclutamiento de células progenitoras, mientras que las proteínas morfogenéticas óseas (BMP), como BMP-2 y BMP-4, favorecen la diferenciación osteoblástica. Estas señales representan algunos de los mecanismos que contribuyen al acoplamiento entre resorción y formación, pero no explican por sí solas todo el proceso, cuya regulación depende de la interacción entre múltiples factores celulares y moleculares.

**Ruta 2.1:** Eje Canónico BMP / Smad (Diferenciación y Co-activación)

- **Receptores:** Unión de BMP-2/4 a receptores de tipo II (BMPRII) y de tipo I, como ALK3/BMPR1A o ALK6/BMPR1B.
- **Mecanismo citoplasmático:** La unión del ligando activa el complejo receptor, cuyo receptor de tipo I fosforila las proteínas reguladoras SMAD1/5/8 en su motivo C-terminal SSXS. Estas se asocian con SMAD4, formando un complejo que se transloca al núcleo.
- **Efecto transcripcional:** La señalización BMP/SMAD favorece la expresión de genes relacionados con la diferenciación osteoblástica, incluidos RUNX2 y SP7 (Osterix). En el núcleo, el complejo SMAD1/5/8–SMAD4 puede cooperar con RUNX2 en la regulación transcripcional de genes osteogénicos, contribuyendo al establecimiento del programa de formación de matriz ósea.

**Ruta 2.2:** Eje No Canónico BMP / TAK1 / p38 MAPK

- **Mecanismo Citoplásmico:** Reclutamiento del complejo TRAF6-TAB1-TAK1 en la membrana plasmática → activación de p38 MAPK.
- **Efecto Transcripcional:** Refuerza la fosforilación directa de RUNX2 en ausencia de estimulación mecánica directa.

**3. Señalización angiogénica y vascular**

**Contexto mecanobiológico:** El acoplamiento angiogénesis–osteogénesis favorece la comunicación entre vasos tipo H y células del linaje osteoblástico. Estos vasos, estudiados principalmente en modelos murinos, se asocian con regiones de elevada actividad osteogénica y producen factores angiocrinos que modulan las células osteoprogenitoras. Entre estas señales, los factores de crecimiento de fibroblastos (FGF) pueden activar la vía FGF–FGFR–Ras–Raf–MEK–ERK1/2, contribuyendo a regular la proliferación y diferenciación osteoblástica. Sus efectos dependen de la etapa celular y de las características de la señal, por lo que esta vía representa un ejemplo de comunicación vascular y no un mecanismo universal de osteogénesis.

- **Receptor:** Receptor de Tirosina Quinasa FGFR1/2.
- **Mecanismo Citoplásmico:** Activación del eje Ras → Raf → MEK → ERK1/2.
- **Efecto Transcripcional / Celular:** Modula la proliferación y diferenciación de los preosteoblastos según su estado celular y las características del estímulo.
- **Resultado Biológico:** Contribuye a regular la dinámica de las poblaciones osteoblásticas y la formación de matriz ósea, sin implicar necesariamente una detención de la maduración terminal.

**4. Ausencia de estímulo mecánico**

**Contexto mecanobiológico:** La reducción de la carga mecánica aumenta la expresión de SOST y DKK1, cuyos productos inhiben la vía Wnt/β-catenina y favorecen la degradación de β-catenina. Esto reduce la señalización osteogénica, la diferenciación osteoblástica y la formación de matriz ósea. La pérdida neta de masa ósea se produce cuando la formación disminuida no compensa la resorción, favoreciendo la osteopenia por desuso.

- **Interacción en Membrana:** La Esclerostina se une con alta afinidad al dominio extracelular de LRP5/6, compitiendo e interfiriendo con la activación de su complejo receptor.
- **Fallo en Citoplasma:** El complejo de destrucción (GSK-3β/Axin/APC) se mantiene constitutivamente activo → la β-catenina es fosforilada y derivada al proteasoma para su degradación.
- **Fenotipo Resultante:** Disminución de la señalización osteogénica y de la expresión de RUNX2 → reducción de la diferenciación osteoblástica y de la formación de matriz ósea → desequilibrio entre formación y resorción, con pérdida neta de masa ósea (osteopenia por desuso).

#### Actividades

##### Actividad m3_eval_activacion_osteogenica

```yaml
# Documento del docente, 3.2, «Evaluación». La «Actividad: Interactiva» de esta sección (elegir uno de los cuatro
# escenarios y ver sus rutas) exige un componente nuevo: queda en «Pendientes del documento del docente»; sus textos
# están en el contenido de la sección.
tipo: quiz
titulo: "Evaluación: Activación osteogénica"
instrucciones: "Responde las preguntas. Después de cada respuesta verás su justificación."
obligatoria: true
puntaje_max: 30
concepto: "Activación osteogénica y organización de la formación ósea"
retroalimentacion:
  acierto: "Revisa la justificación de cada pregunta antes de continuar."
  error: "Revisa la justificación de cada pregunta y vuelve a leer la sección antes de intentarlo de nuevo."
preguntas:
  - id: m3_q_eval2_1
    formato: opcion_multiple
    enunciado: "Un progenitor esquelético recibe señales procedentes del osteocito, de otras células y de la matriz extracelular. ¿Cuál es el resultado más compatible con la integración de estas señales?"
    opciones:
      - id: a
        texto: "La conversión inmediata del progenitor en un osteoclasto maduro."
      - id: b
        texto: "El reclutamiento, la activación y el compromiso hacia el linaje osteoblástico, dependiendo del estado celular y del microambiente."
      - id: c
        texto: "La mineralización inmediata de la matriz antes de la síntesis de componentes orgánicos."
      - id: d
        texto: "La inhibición obligatoria de todas las vías osteogénicas."
    correcta: b
    explicacion: "La integración de señales del microambiente puede favorecer el reclutamiento y el compromiso osteoblástico de los progenitores esqueléticos. El resultado depende del contexto celular y no implica una diferenciación inmediata ni uniforme de todos los progenitores."
    concepto: "Activación de los progenitores osteogénicos"
  - id: m3_q_eval2_2
    formato: opcion_multiple
    enunciado: "**Función del canopy.** En un sitio de remodelado trabecular, una cubierta celular delimita parcialmente la región activa y la separa de la médula ósea. ¿Cuál es la interpretación más adecuada de esta estructura?"
    opciones:
      - id: a
        texto: "Es una barrera que impide cualquier intercambio entre la médula y el tejido óseo."
      - id: b
        texto: "Es una cubierta celular asociada al compartimento de remodelado que contribuye a organizar el microambiente y favorecer el reclutamiento de células osteoprogenitoras."
      - id: c
        texto: "Es una estructura mineralizada que sustituye al osteoide durante la formación ósea."
      - id: d
        texto: "Es un componente exclusivo del hueso cortical, sin presencia en superficies trabeculares."
    correcta: b
    explicacion: "El canopy contribuye a delimitar el compartimento de remodelado y a organizar las interacciones entre células y señales locales. Su proximidad a los capilares favorece el acceso de precursores y su interacción con células osteoprogenitoras. Se ha caracterizado especialmente en superficies trabeculares humanas, aunque la organización de los compartimentos puede variar según la localización."
    concepto: "Canopy de remodelado óseo"
  - id: m3_q_eval2_3
    formato: opcion_multiple
    enunciado: "**Ausencia de estímulo mecánico.** Un paciente permanece inmovilizado durante un periodo prolongado. En un modelo experimental se observa un aumento de la expresión de SOST y DKK1, acompañado de menor actividad osteogénica. ¿Qué mecanismo explica mejor estos hallazgos?"
    opciones:
      - id: a
        texto: "La activación sostenida de WNT/β-catenina y el aumento de la expresión de RUNX2."
      - id: b
        texto: "La inhibición de WNT/β-catenina, que reduce la estabilización de β-catenina y puede disminuir la activación de RUNX2."
      - id: c
        texto: "La activación directa de la síntesis de colágeno tipo I por parte de los osteoclastos."
      - id: d
        texto: "La activación obligatoria de BMP/SMAD como única respuesta a la falta de carga."
    correcta: b
    explicacion: "La ausencia de carga mecánica puede aumentar la expresión de esclerostina y DKK1, inhibidores de WNT/β-catenina. Esto favorece la degradación de β-catenina, reduce la activación del programa osteogénico y puede disminuir la diferenciación osteoblástica y la formación de matriz, contribuyendo a la osteopenia por desuso."
    concepto: "Ausencia de estímulo mecánico"
```

### Seccion 3.3: Síntesis, secreción y organización de la matriz orgánica (id "m3_3_matriz_organica")

#### Contenido

**¿Cómo construye el osteoblasto la matriz que dará origen al nuevo tejido óseo?**

Una vez activado su fenotipo formador, el osteoblasto desarrolla una intensa actividad biosintética orientada a producir y secretar los componentes orgánicos de la matriz extracelular, cuyo soporte estructural permitirá la posterior incorporación de la fase mineral; por ello, tanto su composición como su organización son fundamentales para las propiedades del tejido óseo. El principal componente es el colágeno tipo I, que forma fibrillas, proporciona resistencia a la tracción y sirve de andamiaje para las demás moléculas, entre las que se encuentran proteínas no colágenas como la osteopontina, la osteonectina y la osteocalcina, implicadas en la adhesión celular, la organización de la matriz y su interacción con la fase mineral; a su vez, los proteoglucanos y las glicoproteínas contribuyen a la hidratación y a las interacciones entre sus componentes. Tras su síntesis y procesamiento intracelular, estas moléculas son secretadas por el osteoblasto al espacio extracelular, donde se ensamblan y organizan progresivamente hasta constituir el osteoide, una matriz orgánica aún no mineralizada que proporciona el soporte molecular sobre el cual se incorporará posteriormente la fase mineral, dando lugar al tejido óseo mineralizado.

**Nota:** En esta secuencia se seguirá el recorrido del colágeno tipo I, desde la regulación de su expresión genética hasta su ensamblaje y organización extracelular; los demás componentes orgánicos se abordarán de forma complementaria, teniendo en cuenta que su síntesis y liberación ocurren mediante procesos propios que convergen en la construcción de la matriz extracelular.

**Arquitectura y regulación génica**

Antes de seguir el recorrido de COL1A1 y COL1A2, es necesario reconocer las principales regiones reguladoras de un gen y comprender cómo interactúan para iniciar su expresión. Identificar el enhancer, los elementos reguladores proximales, el promotor y el sitio de inicio de la transcripción (TSS) permitirá entender cómo las señales osteogénicas y los factores de transcripción regulan la ARN polimerasa II y desencadenan la producción del ARNm que dará origen a las cadenas de colágeno tipo I.

**Fase I. Activación genética y síntesis de las cadenas de colágeno**

**Activación de los genes COL1A1 y COL1A2.** Una vez que las señales llegan al núcleo, el objetivo es activar los genes que permitirán al osteoblasto producir la matriz orgánica, especialmente COL1A1 y COL1A2, que codifican el colágeno tipo I. Para ello participan diferentes vías, entre ellas Wnt/β-catenina, PGE₂/PKA/CREB, BMP/SMAD e integrinas/FAK/MAPK, que pueden actuar de manera paralela o cooperativa. Como ejemplo, en la vía Wnt/β-catenina, la β-catenina se acumula en el núcleo y se une a TCF/LEF, que reconocen regiones reguladoras del ADN y pueden contribuir a la regulación de RUNX2. En su región promotora, la interacción de factores reguladores con el ADN favorece el reclutamiento de la ARN polimerasa II, que utiliza el ADN como molde para sintetizar el ARNm de RUNX2. Este transcrito se procesa y se traduce para producir la proteína RUNX2, un regulador del programa osteogénico cuya expresión y actividad forman parte de una red de regulación celular, sin que deba sintetizarse desde cero cada vez que el osteoblasto produce colágeno. RUNX2 contribuye, entre otros procesos, a la regulación de SP7/Osterix. De manera paralela, PGE₂ puede activar CREB y, tras su fosforilación (p-CREB), este se une a elementos CRE y puede reclutar coactivadores como CBP/p300, favoreciendo la transcripción.

Posteriormente, RUNX2, SP7/Osterix y otros factores reguladores pueden cooperar en el control de la expresión de COL1A1 y COL1A2, según el contexto celular y las regiones reguladoras implicadas. Junto con coactivadores como CBP/p300, favorecen el ensamblaje de la maquinaria transcripcional y el reclutamiento de la ARN polimerasa II al promotor. Así se generan los pre-ARNm de COL1A1 y COL1A2, cuyos transcritos atraviesan las etapas generales de maduración del pre-ARNm, que incluyen procesamiento, corte y empalme (splicing) y poliadenilación, antes de convertirse en ARNm maduros. Estos salen del núcleo a través de los poros nucleares con ayuda del complejo exportador NXF1–NXT1, que facilita el transporte, pero no forma parte estructural del poro. En el citoplasma, los ARNm se traducen para sintetizar las cadenas de colágeno tipo I; la traducción comienza en el citosol y continúa acoplada al retículo endoplasmático rugoso (RER), donde ingresan las cadenas nacientes para su procesamiento, dando inicio a la construcción de la matriz orgánica.

**Transcripción y maduración del ARNm**

A partir de este punto, independientemente de la vía de señalización que haya activado COL1A1 y COL1A2, ambos genes siguen el mismo proceso de maduración del ARN. La ARN polimerasa II produce inicialmente un pre-ARNm, que debe modificarse antes de salir del núcleo:

1. **Adición de la caperuza 5′:** Mientras la ARN polimerasa II continúa transcribiendo, un complejo enzimático asociado a ella añade una caperuza 5′ (5′ cap) al extremo inicial del ARN. Esta estructura protege el transcrito y posteriormente facilita su reconocimiento durante la traducción.
2. **Splicing: eliminación de intrones:** El espliceosoma, formado por pequeños ARN nucleares (snRNA) y proteínas, reconoce las regiones que separan intrones y exones, elimina los intrones y une los exones. Así se obtiene una secuencia continua que contiene la información necesaria para producir la proteína.
3. **Procesamiento del extremo 3′ y cola poli(A):** Una vez transcrito el extremo 3′, el ARN es cortado y la poli(A) polimerasa (PAP) añade una cadena de adeninas denominada cola poli(A). Esta cola se asocia con proteínas como PABPN1, que contribuyen a la estabilidad y procesamiento del ARNm.
4. **Exportación al citoplasma:** El ARNm ya procesado se asocia con proteínas de unión al ARN y con el complejo de exportación NXF1–NXT1, que lo dirige hacia el poro nuclear. A través de este complejo, el ARNm sale al citoplasma, donde podrá ser reconocido por los ribosomas para iniciar la síntesis de las cadenas de colágeno tipo I.

**Traducción y acoplamiento al RER**

Una vez que los ARNm de COL1A1 y COL1A2 salen del núcleo, llegan al citoplasma y se asocian con ribosomas, donde comienza la traducción. Como las cadenas de colágeno tipo I están destinadas a la secreción, su síntesis debe realizarse en el retículo endoplásmico rugoso (RER). Para dirigir el ribosoma hacia el RER ocurre una secuencia especializada:

1. **Inicio de la traducción:** El ARNm de COL1A1 o COL1A2 se asocia inicialmente con la subunidad pequeña (40S) del ribosoma, que reconoce el extremo 5′ del ARNm y comienza a desplazarse hasta identificar el codón de inicio AUG. Luego se incorpora la subunidad grande (60S), formando el ribosoma completo 80S, donde comienza la síntesis de la cadena polipeptídica.
2. **Aparición del péptido señal:** En las primeras etapas de la traducción emerge del ribosoma una secuencia señal N-terminal, que funciona como una etiqueta que indica que la proteína debe ingresar a la vía secretora.
3. **Reconocimiento por la SRP:** La partícula de reconocimiento de señal (SRP) reconoce el péptido señal y se une tanto a este como al ribosoma, provocando una pausa transitoria de la traducción.
4. **Acoplamiento al RER:** El complejo ARNm–ribosoma–SRP se dirige hacia la membrana del RER, donde la SRP se une a su receptor, el receptor de SRP (SR). El ribosoma se transfiere al translocón Sec61, un canal proteico que atraviesa la membrana del RER donde la cadena naciente ingresa mientras continúa la traducción.

**Fase II. Procesamiento y ensamblaje intracelular del procolágeno**

**Procesamiento y modificaciones de las cadenas en el RER.** Una vez que las cadenas pro-α se encuentran en la luz del RER, comienzan una serie de modificaciones que las preparan para su posterior ensamblaje:

1. **Eliminación del péptido señal:** La peptidasa señal escinde la secuencia señal que dirige la cadena naciente hacia el RER, a diferencia de los propéptidos N- y C-terminales del procolágeno, que se conservan durante el procesamiento intracelular y se eliminan posteriormente en el espacio extracelular.
2. **Hidroxilación de prolina y lisina:** En la región de colágeno, determinadas prolinas y lisinas son modificadas por enzimas específicas. Las prolil-hidroxilasas generan hidroxiprolina, mientras que las lisil-hidroxilasas generan hidroxilisina. Estas reacciones requieren Fe²⁺, O₂ y 2-oxoglutarato, y la vitamina C es necesaria para mantener la actividad de las hidroxilasas. La hidroxilación, especialmente de las prolinas, será fundamental para la estabilidad de la futura triple hélice.
3. **Glicosilación de determinadas hidroxilisinas:** Algunas de las hidroxilisinas reciben carbohidratos mediante glicosiltransferasas del RER; primero puede añadirse galactosa y posteriormente glucosa. Esta modificación ocurre solo en residuos específicos y contribuye a regular las propiedades y organización posterior del colágeno.
4. **Preparación para el ensamblaje:** Mientras las cadenas son modificadas, sus regiones C-terminales permiten su reconocimiento y alineación, preparando las dos cadenas pro-α1(I) y una pro-α2(I) para el siguiente proceso: la formación de la triple hélice del procolágeno tipo I.

**Formación de la triple hélice**

El proceso comienza en los extremos C-terminales, donde los propéptidos permiten el reconocimiento y alineamiento de las cadenas, estableciendo la proporción característica de dos cadenas pro-α1(I) y una pro-α2(I), dicha asociación se estabiliza mediante puentes disulfuro en las regiones C-terminales, lo que permite iniciar el plegamiento de la región central, caracterizada por la repetición Gly–X–Y.

El plegamiento de la triple hélice progresa desde el extremo C-terminal hacia el N-terminal, mientras las tres cadenas se enrollan entre sí para formar la estructura helicoidal característica del colágeno. Durante este proceso participan diferentes proteínas del retículo endoplásmico que contribuyen al plegamiento y al control de calidad del procolágeno:

- **BiP (GRP78/HSPA5):** Participa en el control de calidad de proteínas dentro del RER, reconociendo cadenas parcialmente plegadas.
- **PDI (P4HB):** Cataliza la formación y reorganización de puentes disulfuro, favoreciendo el ensamblaje proteico.
- **GRP94 (HSP90B1):** Contribuye al plegamiento y control de calidad de proteínas destinadas a la secreción.
- **HSP47 (SERPINH1):** Chaperona especializada del colágeno que se une al procolágeno, estabiliza la triple hélice y evita su agregación durante el procesamiento en el RER.

Como resultado se obtiene una molécula de procolágeno tipo I correctamente ensamblada, formada por 2 cadenas pro-α1(I) + 1 cadena pro-α2(I), con una triple hélice central y propéptidos N- y C-terminales que permanecen unidos; el procolágeno correctamente plegado puede continuar hacia el aparato de Golgi, mientras que las moléculas que presentan alteraciones en su plegamiento son retenidas para su corrección o eliminación.

**Fase III. Transporte intracelular y secreción de los componentes orgánicos**

**Tránsito por el aparato de Golgi.** Una vez formada la triple hélice, el procolágeno tipo I abandona el retículo endoplásmico y se dirige al aparato de Golgi. Debido a su gran tamaño, su exportación requiere mecanismos especializados asociados a COPII y proteínas como TANGO1 (MIA3) y cTAGE5 (MIA2), que facilitan su transporte desde los sitios de salida del RER. Posteriormente, el cargamento atraviesa el compartimento intermedio ER-Golgi (ERGIC) hasta alcanzar la región cis del Golgi.

Durante su tránsito por el Golgi, el procolágeno puede experimentar modificaciones adicionales de sus componentes glucídicos y comenzar el procesamiento de algunos propéptidos N-terminales. Además, este compartimento participa en la clasificación y distribución del procolágeno y otros componentes de la matriz hacia la vía secretora correspondiente.

**Empaquetamiento vesicular y exocitosis**

Una vez procesado y clasificado en el aparato de Golgi, el procolágeno es incorporado a transportadores post-Golgi que se desplazan hacia la membrana plasmática. En el osteoblasto, este sistema permite dirigir grandes cantidades de componentes de la matriz extracelular hacia la superficie celular; además del procolágeno, las vesículas pueden transportar proteínas no colágenas, proteoglucanos y otras moléculas de la matriz sintetizadas y procesadas por la célula.

Cuando estos transportadores alcanzan la membrana plasmática, se produce la fusión de la membrana vesicular con la membrana celular, liberando su contenido hacia el espacio extracelular mediante exocitosis. De esta manera, el osteoblasto deposita en el entorno inmediato los componentes necesarios para construir la matriz orgánica; el procolágeno tipo I es liberado todavía con sus propéptidos N- y C-terminales, que evitan su ensamblaje prematuro dentro de la célula y serán procesados posteriormente en el espacio extracelular, donde comienza la etapa de organización y maduración de la matriz recién depositada.

**Fase IV. Procesamiento extracelular y ensamblaje fibrilar**

**Escisión de los propéptidos.** Una vez secretado al espacio extracelular, el procolágeno tipo I experimenta la eliminación de sus propéptidos N- y C-terminales mediante proteinasas específicas: el extremo N-terminal es escindido principalmente por ADAMTS2, con participación de ADAMTS3 y ADAMTS14 en determinados contextos, mientras que el procesamiento del extremo C-terminal depende principalmente de BMP1 (proteasa de la familia tolloid, distinta de las proteínas señalizadoras BMP-2 y BMP-4) y otras proteinasas de la familia tolloid-like. Esta proteólisis da lugar a la molécula de colágeno tipo I, denominada clásicamente tropocolágeno, que queda preparada para su posterior ensamblaje.

Tras la escisión, se conserva la región central de triple hélice y permanecen pequeños segmentos no helicoidales en los extremos, denominados telopéptidos, que participan en las interacciones intermoleculares y en la estabilización posterior de las fibrillas. La eliminación de los propéptidos regula el ensamblaje extracelular, ya que estas regiones limitan la asociación prematura del colágeno durante su síntesis y transporte intracelular.

**Nota:** El extremo N-terminal denominado PINP (Procollagen Type I N-terminal Propeptide), pasa a la circulación y puede cuantificarse como marcador bioquímico de formación ósea, ya que sus concentraciones reflejan la actividad de síntesis de colágeno tipo I. Su interpretación debe considerar la función renal, la variabilidad biológica y el método analítico empleado; por tanto, sus valores deben integrarse con el contexto clínico y otros hallazgos.

**Alineación y fibrilogénesis**

Una vez eliminados los propéptidos terminales, las moléculas de colágeno tipo I se asocian en el espacio extracelular mediante la fibrilogénesis, proceso en el que se alinean de forma paralela y escalonada, con un solapamiento parcial entre moléculas adyacentes. Esta disposición, conocida como patrón de cuarto de escalón (quarter-stagger), genera una organización supramolecular en la que se alternan regiones de solapamiento y separación, dando lugar a la periodicidad característica de las fibrillas. Cada molécula de colágeno tipo I mide aproximadamente 300 nm de longitud y 1,5 nm de diámetro, mientras que la periodicidad D de las fibrillas es de unos 67 nm, correspondiente a la repetición de una región de solapamiento de aproximadamente 30 nm y una región de separación (gap) de unos 37 nm; esta alternancia origina las bandas características observables mediante microscopía electrónica. A medida que se establecen interacciones longitudinales y laterales, las moléculas forman fibrillas cuyo diámetro varía según el tejido y las condiciones de ensamblaje, mientras proteoglucanos como la decorina y el biglicano, pertenecientes a la familia de las proteínas pequeñas ricas en leucina, contribuyen a regular su diámetro, espaciamiento y organización, modulando así la arquitectura de la matriz colágena. La estabilización de estas fibrillas mediante enlaces cruzados covalentes se abordará en el siguiente apartado.

**Formación de enlaces cruzados**

La estabilidad de las fibrillas aumenta mediante la formación de enlaces cruzados covalentes entre moléculas de colágeno, a partir de residuos específicos de lisina e hidroxilisina, localizados principalmente en los telopéptidos y en regiones de la triple hélice.

Este proceso comienza gracias a la acción de la lisil oxidasa (LOX), una enzima que modifica determinados residuos de lisina e hidroxilisina, convirtiéndolos en derivados aldehídicos reactivos capaces de establecer enlaces entre moléculas de colágeno cercanas; para realizar esta función, la enzima necesita cobre como cofactor. Con el tiempo, estos enlaces se fortalecen mediante un proceso de maduración que consolida la estructura fibrilar y aumenta su estabilidad y resistencia mecánica, favoreciendo la capacidad de la matriz ósea para soportar las cargas a las que está sometida.

**Fase V. Organización de la matriz y deposición del osteoide**

**Integración de los componentes de la matriz.** Las fibrillas de colágeno tipo I constituyen el principal andamiaje estructural del osteoide, formando una red tridimensional sobre y entre la cual se distribuyen otros componentes secretados por el osteoblasto, como osteocalcina, osteopontina, osteonectina/SPARC, fibronectina y proteoglucanos. La secreción de estos componentes, su incorporación a la matriz, el ensamblaje de las fibrillas y la formación de enlaces cruzados son procesos que pueden superponerse temporalmente, en lugar de ocurrir como etapas estrictamente secuenciales. La interacción entre estas moléculas y el colágeno permite organizar la matriz extracelular, estabilizar sus componentes y establecer un entorno adecuado para las interacciones entre las células y la matriz.

Aunque estas moléculas actúan de manera integrada, sus funciones son diferentes y complementarias: la fibronectina y la osteopontina participan en la adhesión celular y en las interacciones célula–matriz; la osteonectina/SPARC contribuye a la organización de la matriz mediante su interacción con el colágeno y los componentes minerales, mientras que los proteoglucanos modulan la hidratación y las interacciones entre macromoléculas. Por su parte, la osteocalcina y la osteopontina también intervienen en las interacciones con la fase mineral y en la regulación de la mineralización. De este modo, la matriz no constituye una mezcla homogénea de proteínas, sino una estructura organizada cuyas propiedades dependen de la composición, distribución e interacción de sus componentes.

**Organización espacial del osteoide**

Una vez depositado, el osteoide adquiere una organización espacial que depende de cómo y dónde se produce la formación ósea. La disposición de la matriz puede variar según la velocidad de formación, el sitio anatómico y las condiciones mecánicas del tejido, generando diferentes patrones de organización.

Cuando la formación ósea es rápida, como durante determinadas etapas del desarrollo y de la reparación, el colágeno se deposita con una organización relativamente irregular, característica del hueso entretejido. En el hueso lamelar, los osteoblastos depositan la matriz con una organización más ordenada en lamelas. El hueso entretejido puede ser sustituido por hueso lamelar mediante remodelado, que implica la resorción del tejido previo y la formación de nueva matriz; no se trata simplemente de reordenar las fibras ya depositadas. De esta manera, la organización de la matriz refleja tanto las condiciones en las que se forma como los procesos posteriores de renovación del tejido óseo.

#### Actividades

##### Actividad m3_compartimentos_colageno

```yaml
# Documento del docente, 3.3, «Actividad 1» («Idealmente con dibujos basados en las imágenes que subí»). El documento
# la plantea como relación de columnas, pero dos procesos van al mismo compartimento (1-C y 2-C) y la columna de
# compartimentos repite «Espacio extracelular» (B y F), cosa que la relación de columnas no admite (cada elemento tiene
# una sola pareja). Se arma como quiz: una pregunta por proceso con los compartimentos como opciones (B y F se unen en
# una sola opción; la D no corresponde a ningún proceso). La justificación del documento se reparte por pregunta.
# PENDIENTE: la versión con dibujos (arrastrar cada proceso a su compartimento) exige un componente nuevo.
tipo: quiz
titulo: "¿En qué compartimento ocurre cada evento?"
instrucciones: "Relaciona cada proceso con el compartimento celular o extracelular donde ocurre principalmente."
obligatoria: true
puntaje_max: 30
concepto: "Compartimentos de la síntesis y el procesamiento del colágeno tipo I"
retroalimentacion:
  acierto: "La transcripción y el splicing ocurren en el núcleo; la hidroxilación de las cadenas de colágeno ocurre en el RER. El Golgi participa en el procesamiento y clasificación de las moléculas destinadas a la secreción. Tras la exocitosis, el procesamiento de los propéptidos y la fibrilogénesis ocurren en el espacio extracelular."
  error: "Repasa en qué compartimento ocurre cada paso del recorrido del colágeno tipo I, del gen a la fibrilla."
preguntas:
  - id: m3_q_comp_1
    formato: opcion_multiple
    enunciado: "Transcripción de COL1A1 y COL1A2"
    opciones:
      - id: a
        texto: "Aparato de Golgi"
      - id: b
        texto: "Espacio extracelular"
      - id: c
        texto: "Núcleo"
      - id: d
        texto: "Citoplasma y ribosomas asociados al RER"
      - id: e
        texto: "Luz del RER"
    correcta: c
    explicacion: "La transcripción y el splicing ocurren en el núcleo."
    concepto: "Transcripción"
  - id: m3_q_comp_2
    formato: opcion_multiple
    enunciado: "Splicing del pre-ARNm"
    opciones:
      - id: a
        texto: "Aparato de Golgi"
      - id: b
        texto: "Espacio extracelular"
      - id: c
        texto: "Núcleo"
      - id: d
        texto: "Citoplasma y ribosomas asociados al RER"
      - id: e
        texto: "Luz del RER"
    correcta: c
    explicacion: "La transcripción y el splicing ocurren en el núcleo."
    concepto: "Splicing"
  - id: m3_q_comp_3
    formato: opcion_multiple
    enunciado: "Hidroxilación de prolina y lisina"
    opciones:
      - id: a
        texto: "Aparato de Golgi"
      - id: b
        texto: "Espacio extracelular"
      - id: c
        texto: "Núcleo"
      - id: d
        texto: "Citoplasma y ribosomas asociados al RER"
      - id: e
        texto: "Luz del RER"
    correcta: e
    explicacion: "La hidroxilación de las cadenas de colágeno ocurre en el RER."
    concepto: "Hidroxilación"
  - id: m3_q_comp_4
    formato: opcion_multiple
    enunciado: "Clasificación y preparación para la secreción"
    opciones:
      - id: a
        texto: "Aparato de Golgi"
      - id: b
        texto: "Espacio extracelular"
      - id: c
        texto: "Núcleo"
      - id: d
        texto: "Citoplasma y ribosomas asociados al RER"
      - id: e
        texto: "Luz del RER"
    correcta: a
    explicacion: "El Golgi participa en el procesamiento y clasificación de las moléculas destinadas a la secreción."
    concepto: "Clasificación en el Golgi"
  - id: m3_q_comp_5
    formato: opcion_multiple
    enunciado: "Escisión de los propéptidos del procolágeno"
    opciones:
      - id: a
        texto: "Aparato de Golgi"
      - id: b
        texto: "Espacio extracelular"
      - id: c
        texto: "Núcleo"
      - id: d
        texto: "Citoplasma y ribosomas asociados al RER"
      - id: e
        texto: "Luz del RER"
    correcta: b
    explicacion: "Tras la exocitosis, el procesamiento de los propéptidos y la fibrilogénesis ocurren en el espacio extracelular."
    concepto: "Escisión de los propéptidos"
  - id: m3_q_comp_6
    formato: opcion_multiple
    enunciado: "Alineación escalonada y fibrilogénesis"
    opciones:
      - id: a
        texto: "Aparato de Golgi"
      - id: b
        texto: "Espacio extracelular"
      - id: c
        texto: "Núcleo"
      - id: d
        texto: "Citoplasma y ribosomas asociados al RER"
      - id: e
        texto: "Luz del RER"
    correcta: b
    explicacion: "Tras la exocitosis, el procesamiento de los propéptidos y la fibrilogénesis ocurren en el espacio extracelular."
    concepto: "Fibrilogénesis"
```

##### Actividad m3_eval_matriz_organica

```yaml
# Documento del docente, 3.3, «Evaluación». La pregunta 2 no trae la pregunta propiamente dicha (solo el caso y las
# opciones): se transcribe tal cual y queda pendiente con el docente.
tipo: quiz
titulo: "Evaluación: Matriz orgánica"
instrucciones: "Responde las preguntas. Después de cada respuesta verás su justificación."
obligatoria: true
puntaje_max: 30
concepto: "Síntesis, secreción y organización de la matriz orgánica"
retroalimentacion:
  acierto: "Revisa la justificación de cada pregunta antes de continuar."
  error: "Revisa la justificación de cada pregunta y vuelve a leer la sección antes de intentarlo de nuevo."
preguntas:
  - id: m3_q_eval3_1
    formato: opcion_multiple
    enunciado: "En dos regiones óseas se observa que una presenta una matriz de organización irregular, mientras que la otra muestra una disposición más regular en lamelas. La primera corresponde a una región de formación rápida durante la reparación, mientras que la segunda corresponde a tejido maduro remodelado. ¿Cuál interpretación es correcta?"
    opciones:
      - id: a
        texto: "La matriz irregular corresponde al hueso lamelar y la organización en lamelas al hueso entretejido."
      - id: b
        texto: "Ambos patrones son idénticos y no guardan relación con la velocidad de formación."
      - id: c
        texto: "La formación rápida puede producir hueso entretejido, mientras que la maduración y el remodelado pueden favorecer la organización lamelar."
      - id: d
        texto: "El hueso entretejido solo aparece después de la mineralización completa del hueso lamelar."
    correcta: c
    explicacion: "El hueso entretejido se caracteriza por una organización relativamente irregular y puede aparecer durante el desarrollo o las primeras etapas de reparación. Durante la maduración y el remodelado, la matriz puede reorganizarse en lamelas con una disposición más regular, característica del hueso lamelar."
    concepto: "Hueso entretejido y hueso lamelar"
  - id: m3_q_eval3_2
    formato: opcion_multiple
    enunciado: "**La matriz pierde hidratación y organización.** Se detecta una alteración en los proteoglucanos que acompañan a las fibrillas de colágeno, con cambios en la hidratación y las interacciones entre macromoléculas."
    opciones:
      - id: a
        texto: "Alteración de la función de los proteoglucanos."
      - id: b
        texto: "Aumento de la transcripción de COL1A1 como única explicación."
      - id: c
        texto: "Inhibición de la eliminación de intrones."
      - id: d
        texto: "Alteración exclusiva de la composición de la triple hélice."
    correcta: a
    explicacion: "Los proteoglucanos contribuyen a modular la hidratación de la matriz y las interacciones entre sus macromoléculas. Su alteración puede modificar la organización extracelular, incluso si la síntesis de colágeno se mantiene."
    concepto: "Proteoglucanos de la matriz"
  - id: m3_q_eval3_3
    formato: verdadero_falso
    enunciado: "El procolágeno tipo I pierde sus propéptidos N- y C-terminales dentro del RER antes de llegar al aparato de Golgi."
    correcta: false
    explicacion: "Los propéptidos permanecen unidos durante el transporte intracelular y la secreción. Su escisión ocurre principalmente en el espacio extracelular, preparando el colágeno para el ensamblaje fibrilar."
    concepto: "Escisión de los propéptidos"
```

## Glosario

| Término | Definición |
|---|---|
| Osteoide | Matriz orgánica del hueso recién secretada y aún no mineralizada; contiene sobre todo colágeno tipo I. |
| Osteoblasto | Célula formadora de hueso; secreta el osteoide y regula su mineralización. |
| Osteocito | Osteoblasto incluido en la matriz mineralizada; forma una red, detecta la carga y coordina la respuesta ósea. |
| BMP | Proteína morfogenética ósea; factor de crecimiento de la superfamilia TGF-β que induce la diferenciación osteoblástica. |
| Smad | Proteínas intracelulares que transmiten la señal de BMP (Smad1/5/8 con Smad4) hasta el núcleo. |
| RUNX2 | Factor de transcripción maestro del linaje osteoblástico; su pérdida parcial causa displasia cleidocraneal. |
| Osterix (SP7) | Factor de transcripción que actúa después de RUNX2 y lleva al preosteoblasto a osteoblasto maduro. |
| Sistema lacunocanalicular | Red de lagunas y canalículos que aloja a los osteocitos y sus procesos y por la que circula el líquido intersticial. |
| Mecanotransducción | Conversión de una señal mecánica en una respuesta bioquímica y celular. |
| Integrina | Receptor de adhesión que une la matriz extracelular con el citoesqueleto y transmite señales mecánicas. |
| PIEZO1 | Canal catiónico mecanosensible que se abre con el estiramiento de la membrana y deja entrar cationes, entre ellos Ca²⁺. |
| Conexina 43 | Proteína que forma uniones comunicantes y hemicanales; los hemicanales liberan PGE₂ y ATP con la deformación. |
| Hemicanal | Mitad de una unión comunicante, abierta al medio extracelular. |
| Wnt | Familia de ligandos que activan la vía canónica de β-catenina, principal vía anabólica del hueso. |
| β-catenina | Proteína que, al acumularse en el citoplasma y entrar al núcleo, activa junto con TCF/LEF los genes diana de Wnt. |
| Frizzled | Receptor de siete dominios transmembrana que une a Wnt. |
| LRP5 y LRP6 | Correceptores de Wnt; también son el sitio donde se une la esclerostina. |
| Esclerostina (SOST) | Proteína producida por osteocitos maduros que se une a LRP5/6 y frena la vía Wnt y la formación de hueso. |

## Referencias

Las fuentes que cita el documento del docente figuran con los datos que él da. Las demás son textos y artículos estándar que respaldan el glosario.

1. Qin L, et al. (2020). Fuente de las figuras «El hueso percibe las cargas - Osteocito» y «Acoplamiento bioquímico: Otras vías en acción» (adaptadas; licencia CC BY 4.0). https://pmc.ncbi.nlm.nih.gov/articles/PMC7280204/
2. Ross MH, Pawlina W. *Histology: A Text and Atlas, with Correlated Cell and Molecular Biology*. 8.ª edición.
3. Mescher AL. *Junqueira's Basic Histology: Text and Atlas*.
4. Bilezikian JP, Martin TJ, Clemens TL, Rosen CJ (eds.). *Principles of Bone Biology*. 4.ª edición.
5. Weinbaum S, Cowin SC, Zeng Y. «A model for the excitation of osteocytes by mechanical loading-induced bone fluid shear stresses». *Journal of Biomechanics*, 1994.
6. Cherian PP, Siller-Jackson AJ, Gu S, Wang X, Bonewald LF, Sprague E, Jiang JX. «Mechanical strain opens connexin 43 hemichannels in osteocytes: a novel mechanism for the release of prostaglandin». *Molecular Biology of the Cell*, 2005.
7. Dallas SL, Prideaux M, Bonewald LF. «The osteocyte: an endocrine cell ... and more». *Endocrine Reviews*, 2013.
8. Robling AG, Niziolek PJ, Baldridge LA, et al. «Mechanical stimulation of bone in vivo reduces osteocyte expression of Sost/sclerostin». *Journal of Biological Chemistry*, 2008.
9. Li X, Han L, Nookaew I, et al. «Stimulation of Piezo1 by mechanical signals promotes bone anabolism». *eLife*, 2019.

## Banco de preguntas para el mentor

Preguntas extra, distintas de las del módulo, para que el mentor refuerce un concepto. Las respuestas son la versión resumida que el mentor debe dar o esperar.

**B1.** ¿Qué es el osteoide y en qué se diferencia de la matriz mineralizada?
- Respuesta: es la matriz orgánica recién secretada por los osteoblastos (colágeno tipo I y proteínas no colágenas) que todavía no tiene mineral. La matriz mineralizada es ese mismo material con la fase mineral ya incorporada.
- Dificultad: 1
- Concepto: osteoide

**B2.** ¿Qué hace osterix y en qué orden actúa respecto a RUNX2?
- Respuesta: SP7/Osterix actúa después de RUNX2, que contribuye a su regulación, y ambos cooperan en el programa osteoblástico y en el control de la expresión de COL1A1 y COL1A2.
- Dificultad: 2
- Concepto: RUNX2 y osterix

**B3.** ¿Por qué se distingue el estímulo mecánico de la respuesta celular?
- Respuesta: el estímulo es la deformación de la matriz y el movimiento del fluido en el sistema lacunocanalicular; la respuesta es lo que hace el osteocito al convertir ese estímulo en señales intracelulares y en mediadores que modulan a otras células óseas.
- Dificultad: 2
- Concepto: mecanotransducción

**B4.** Nombra tres estructuras del osteocito que participan en la detección de la carga.
- Respuesta: la matriz pericelular, las integrinas y las adhesiones focales con el citoesqueleto, y canales como PIEZO1. Basta con tres.
- Dificultad: 1
- Concepto: sensores del osteocito

**B5.** ¿Qué ocurre con la esclerostina cuando el hueso deja de recibir carga y qué consecuencia tiene?
- Respuesta: aumenta la expresión de SOST (y de DKK1), la vía Wnt/β-catenina queda inhibida, se degrada la β-catenina y disminuyen la diferenciación osteoblástica y la formación de matriz: osteopenia por desuso.
- Dificultad: 2
- Concepto: SOST y desuso

**B6.** ¿En qué compartimento se eliminan los propéptidos del procolágeno tipo I y por qué importa?
- Respuesta: principalmente en el espacio extracelular, tras la secreción. Mientras están unidos evitan el ensamblaje prematuro dentro de la célula; al eliminarse, el colágeno queda listo para la fibrilogénesis.
- Dificultad: 2
- Concepto: escisión de los propéptidos

**B7.** ¿Qué célula produce la esclerostina y qué vía frena?
- Respuesta: el osteocito; frena la vía WNT/β-catenina al unirse a LRP5/6.
- Dificultad: 1
- Concepto: esclerostina

## Ganchos para el mentor

**Conceptos clave del módulo**

- El estímulo mecánico (deformación de la matriz y movimiento del fluido) se distingue de la respuesta celular.
- Los sensores y las vías de señalización forman una red, no una secuencia lineal obligatoria.
- La carga reduce SOST; la ausencia de carga lo aumenta y favorece la osteopenia por desuso.
- Distintos escenarios del microambiente (carga, señales tras la resorción, señales vasculares, desuso) convergen sobre RUNX2 y SP7/Osterix.
- El colágeno tipo I recorre núcleo, citoplasma y RER, Golgi y espacio extracelular antes de formar fibrillas.
- Los propéptidos se eliminan fuera de la célula; el PINP circulante es un marcador de formación ósea.

**Errores frecuentes y cómo aclararlos**

| Error frecuente | Por qué ocurre | Cómo aclararlo |
|---|---|---|
| «El osteocito siente la deformación directa de la matriz» | Se imagina una célula que se aplasta | Recordar el movimiento del líquido intersticial por el sistema lacunocanalicular y las fuerzas sobre la superficie celular |
| «Las vías de mecanotransducción son una cascada única» | Se memorizan como lista | Insistir en que son una red cuya activación depende del contexto |
| «La esclerostina promueve la formación de hueso» | Se confunde con una proteína de la matriz | Recordar que inhibe WNT/β-catenina al unirse a LRP5/6 |
| «Los propéptidos se cortan dentro del RER» | Se mezcla con la eliminación del péptido señal | Distinguir el péptido señal (se elimina en el RER) de los propéptidos (se eliminan en el espacio extracelular) |
| «El hueso entretejido se reordena hasta volverse lamelar» | Se piensa en una reorganización de fibras | Recordar que la sustitución ocurre por remodelado: resorción y formación de nueva matriz |

**Pistas por sección**

- 3.1: pedir que ordene con sus palabras la secuencia desde la deformación de la matriz hasta la liberación de mediadores.
- 3.2: dar uno de los cuatro escenarios y pedir qué vía predomina y cómo llega a RUNX2.
- 3.3: pedir que siga una molécula de colágeno tipo I por cada compartimento, del gen a la fibrilla.

## Notas de verificacion para el docente

**General**

1. Duración estimada del módulo (60 a 90 minutos): estimación previa a la reestructuración; confirmarla con una prueba piloto.
2. Objetivos de aprendizaje: el documento del docente no trae objetivos para el módulo 3. Se conservaron dos del guion anterior (el segundo, ajustado al contenido nuevo); hace falta que el docente los redacte, incluido uno para la sección 3.3.

## Pendientes del documento del docente

Indicaciones del documento «Modulos del 1 al 3, completados, listos para desarrollar.pdf» que aún no se integran (imágenes y videos del docente, interacciones que exigen componentes nuevos). Los textos ya están en el contenido de cada sección.

**Sección 3.1**

- Imagen #1 «El hueso percibe las cargas - Osteocito»: va junto al texto de ese título. El docente indica reutilizar la imagen 2.3 Imagen #5. Fuente: adaptada de Qin et al. (2020), CC BY 4.0, https://pmc.ncbi.nlm.nih.gov/articles/PMC7280204/.
- Vídeo #1 «¿Cómo detecta el osteocito la fuerza?»: mini video del docente, desde el movimiento de la membrana hasta la salida de calcio del retículo; el texto va al lado.
- Vídeo #2 «De la señal mecánica a la respuesta celular»: mini video del docente, desde que aparece la calmodulina hasta que las tres moléculas salen por el sistema lacunocanalicular; el texto va al lado.
- Imagen #2 «Acoplamiento bioquímico: Otras vías en acción»: fuente «tomado de Lei Qin et al., 2020 - Modificado con IA». El docente señalará en la imagen los seis botones (SOST, Wnt/β-catenina, β-catenina + TCF/LEF, Integrinas, Vías FAK/Src y RhoA/ROCK, YAP/TAZ) que deben abrir su recuadro en orden. Hoy los seis textos van como lista numerada.
- Actividad 1: el documento la describe como «organización secuencial y asociación de conceptos», pero solo trae el Ejercicio 1 (ordenar la secuencia), que está como `m3_ordenar_mecanotransduccion`.

**Sección 3.2**

- Imagen #1 «Activación de los progenitores osteogénicos», Imagen #2 «Activación del fenotipo formador», Imagen #3 «¿Dónde se inicia la formación ósea?» e Imagen #4 «El canopy de remodelado óseo: un microambiente organizado»: cada una con su texto al lado.
- Imagen sin número «¿Cómo llega una señal del microambiente hasta la matriz?»: el docente indica usarla de fondo solo para ese concepto.
- «Actividad: Interactiva» (componente nuevo): «Analizar cómo diferentes condiciones del microambiente óseo activan o inhiben rutas de señalización que convergen sobre el programa osteogénico y modulan la expresión de genes asociados con la formación de matriz, incluyendo COL1A1 y COL1A2.» El estudiante selecciona uno de los cuatro escenarios (Variable #1 a #4) y ve sus rutas, cada uno con su imagen: Imagen #5 (carga mecánica dinámica), Imagen #6 (señales posteriores a la resorción), Imagen #7 (señalización angiogénica y vascular) e Imagen #8 (ausencia de estímulo mecánico). Hoy los cuatro escenarios y sus rutas van como texto en la sección.

**Sección 3.3**

- Imagen #1 «¿Cómo construye el osteoblasto la matriz que dará origen al nuevo tejido óseo?».
- Imagen #2 «Arquitectura y regulación génica», con su pie: «Nota: Esquema general de la organización de un gen eucariota; no representa la arquitectura génica específica de COL1A1 ni de COL1A2.»
- Vídeo #1 «Activación de los genes COL1A1 y COL1A2» (Fase I): mini video del docente, desde el núcleo del osteoblasto hasta que la ARN polimerasa empieza a transcribir COL1A1 y COL1A2.
- «Antes de continuar: ¿Qué son los intrones y los exones?» con Imagen #3: el docente indica que va «en otra ventana»; el documento no trae el texto. Falta el texto.
- Vídeo #2 «Transcripción y maduración del ARNm»: desde que sale el ARNm de COL1A1 y COL1A2 hasta que sale del núcleo.
- Video #3 «Traducción y acoplamiento al RER»: desde que sale del núcleo hasta que se acopla con el RER.
- Vídeo #4 «Procesamiento y modificaciones de las cadenas en el RER» (Fase II): desde que entra al RER hasta que está listo para enrollarse.
- Vídeo #5 «Formación de la triple hélice»: desde que inicia a enrollarse hasta que está listo para salir.
- Imagen #4 «Tránsito por el aparato de Golgi» (Fase III), con su pie: «Nota: Los tamaños y las formas de los transportadores son esquemáticos».
- Imagen #5 «Empaquetamiento vesicular y exocitosis».
- Video #6 «Escisión de los propéptidos» (Fase IV): desde que sale de la célula hasta que queda únicamente tropocolágeno.
- Imagen #6 «Alineación y fibrilogénesis», Imagen #7 «Formación de enlaces cruzados», Imagen #8 «Integración de los componentes de la matriz» (Fase V) e Imagen #9 «Organización espacial del osteoide».
- Actividad 1 «¿En qué compartimento ocurre cada evento?»: el docente la quiere «idealmente con dibujos basados en las imágenes que subí». Va como quiz (`m3_compartimentos_colageno`) porque dos procesos comparten compartimento; la columna de compartimentos del documento repite «Espacio extracelular» (B y F) y la opción D («Citoplasma y ribosomas asociados al RER») no corresponde a ningún proceso. Confirmar con el docente.
- Evaluación, pregunta 2 («La matriz pierde hidratación y organización»): el documento no trae la pregunta, solo el caso y las opciones. Confirmar la redacción con el docente.

## Registro de revision

2026-10-25: reestructuración completa del módulo según el documento del docente (secciones 3.1 a 3.3, textos y preguntas al pie de la letra). El guion anterior, con su revisión científica independiente, está en el historial de git.
