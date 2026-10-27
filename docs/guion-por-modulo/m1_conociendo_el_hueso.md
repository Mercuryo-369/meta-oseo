# Modulo 1: Conociendo el hueso

> TEXTOS DEL DOCENTE. Desde el 2026-10-25 las secciones, los títulos, los textos y las preguntas de evaluación de este módulo son los del documento del docente «Módulos del 1 al 3, completados, listos para desarrollar» (PDF), que es la fuente de verdad: se transcriben al pie de la letra (solo se corrigen cortes de línea y espacios de la extracción). Las indicaciones del docente dirigidas al desarrollo («Imagen #N», «al tocar cada letrero…», «conservar esta actividad…») no son contenido: se anotan en «#### Pendientes PDF» de cada sección. Las imágenes del PDF se integran en una fase posterior.

## Ficha

- Modulo: 1 de 6
- Titulo: Conociendo el hueso
- Foco: Generalidades y funciones
- Densidad: media
- Duracion estimada: 50 minutos haciendo las actividades obligatorias (estimación por confirmar con el docente tras la reestructuración del 2026-10-25).
- Nivel: pregrado y posgrado de ciencias de la salud, con enfoque en el hueso mandibular.
- Conocimientos previos: biología celular básica y nociones de anatomía general. No hay módulos previos.
- Logro que se otorga al completarlo: primer_hueso ("Primer hueso").
- Requisito para el logro (propuesta, por acordar con el docente): completar todas las actividades con `obligatoria: true`.
- Numero de secciones: 4
- Actividades: 9 en total, todas obligatorias. Cinco se conservan de la versión anterior a petición del docente (`m1_2_hormonas_oseas`, `m1_1_hueso_largo`, `m1_4_relacion_estructuras`, `m1_3_relacion_matriz`, `m1_5_wolff_casos`; conservan su id para no perder el avance de quien ya las hizo) y cuatro son las evaluaciones del docente, una por sección, más la actividad «Explora las funciones del hueso».
- Puntaje maximo del modulo: 320 puntos.

## Objetivos de aprendizaje

Al finalizar el módulo, el estudiante estará en capacidad de:

1. Reconocer las principales funciones, propiedades y características biológicas del tejido óseo, relacionándolas con su importancia estructural y sistémica.
2. Describir la organización macro y microscópica del hueso y relacionarla con la composición de su matriz, diferenciando sus componentes orgánicos, inorgánicos, el osteoide y la matriz mineralizada.
3. Interpretar el comportamiento mecánico del hueso frente a diferentes tipos de cargas, considerando sus propiedades mecánicas y la respuesta del tejido ante estímulos estáticos y dinámicos.
4. Explicar cómo el hueso se adapta y mantiene su integridad frente a las demandas mecánicas mediante el modelado y remodelado, incluyendo los principios de Wolff y Frost y la respuesta al microdaño y la fatiga.

## Ilustraciones y modelos requeridos

Convenciones de producción: las imágenes se producen como **SVG multicapa** (un grupo `<g>` por capa, con el `id` exacto que aparece en esta tabla). Los modelos 3D construidos por código tienen una pieza por estructura. Las imágenes del documento del docente (Imagen #N de cada sección) están pendientes de integrar: se listan en «#### Pendientes PDF» de cada sección.

| id de archivo | Que muestra | Capas o zonas (id = etiqueta) | Se usa en |
|---|---|---|---|
| `m1_hormonas_oseas_escena` | Esquema de un hueso que libera mensajeros a la sangre y tres órganos diana con sus receptores. Los efectos no llevan capas propias: los anima la aplicación con su vocabulario de animaciones y sus indicadores (ver la actividad) | `hueso_emisor` = Hueso (osteocito y osteoblasto); `vaso_sanguineo` = Torrente sanguíneo; `organo_rinon` = Riñón (túbulo proximal); `organo_pancreas` = Páncreas (célula beta); `organo_hipotalamo` = Hipotálamo (neuronas); `receptor_fgfr_klotho` = Receptor del riñón; `receptor_celula_beta` = Receptor del páncreas; `receptor_mc4r` = Receptor del hipotálamo | Actividad `m1_2_hormonas_oseas` (sección 1.1) |
| `hueso_largo` (modelo 3D construido por código) | Hueso largo serrado a lo largo | `cartilago_articular` = Cartílago articular; `epifisis` = Epífisis; `linea_epifisaria` = Línea epifisaria; `metafisis` = Metáfisis; `diafisis` = Diáfisis; `cavidad_medular` = Cavidad medular; `arteria_nutricia` = Arteria nutricia | Actividad `m1_1_hueso_largo` (sección 1.2) |

## Secciones

> Convenciones de este guion.
> - **Entrada.** «#### Entrada» es el texto lateral que el docente pidió junto a la imagen de apertura de la sección: la aplicación lo muestra en el panel de la portada de la sección (`resumen`). El convertidor no lo lee; se copia al `content.json` al pulir el módulo.
> - **Pendientes PDF.** «#### Pendientes PDF» guarda las indicaciones del docente que todavía no se pueden montar (imágenes, actividades nuevas). El convertidor no lo lee.
> - **Avisos.** Cada aviso empieza con una etiqueta que indica su tipo (Clinico, Dato, Atencion, Recuerda). La aplicación muestra la etiqueta con tilde.
> - **Ids locales.** Los ids de opción (`a` a `d`) son locales a cada pregunta. Como el esquema exige ids únicos en todo el módulo, al transcribir se prefijan con el id de la pregunta.
> - **Nombres de campo.** `correcta: verdadero/falso` pasa a booleano; `retroalimentacion.acierto/error` pasa a `correcta/incorrecta`.
> - **Explicaciones de las preguntas.** Cuando el docente no escribió la justificación de una pregunta, la explicación es la frase del propio texto del docente que la responde (se indica en «#### Pendientes PDF»).

### Seccion 1.1: El hueso: mucho más que un soporte

id "m1_1_mas_que_soporte"

#### Entrada

El tejido óseo es un tejido conjuntivo especializado de origen mesenquimático, caracterizado por una matriz extracelular organizada que combina una fase orgánica y una fase mineralizada. Esta composición le proporciona resistencia mecánica y, al mismo tiempo, le permite mantener un estado dinámico de adaptación, reparación y renovación mediante el continuo proceso de remodelado óseo.

#### Pendientes PDF

- PENDIENTE PDF: Imagen #1 (apertura de la sección; el texto lateral es la «Entrada»). Indicación: «Texto lateral que debe ir allí… Se vería así».
- PENDIENTE PDF: Imagen #2, título «Propiedades del hueso». Indicación: «Ya la imagen trae el texto que quiero que esté ahí». No hay texto aparte en el PDF: se muestra solo con la imagen.
- PENDIENTE PDF: Imagen #3, título «Funciones» (cuatro tarjetas: Mecánica y estructural, Metabólica y homeostática, Hematopoyética e inmunológica, Neurobiológica y sistémica). Indicación: «Cada función debe poderse seleccionar en orden y que salga el cuadrito con esta información». Mientras tanto, la información de cada función va como texto (un bloque por función).
- Actividad 1 (conservada): «Aquí se podría conservar esta actividad, pero como arriba no explique tan específico que hace cada una, entonces retira los distractores, y haz que el lugar donde acoplan tenga la misma forma para que el estudiante solo una los receptores y vea el texto pero no tenga que adivinar realmente». Es `m1_2_hormonas_oseas`: se quitaron los distractores (esclerostina y PTH); cada receptor ya tiene la forma de su molécula (FGF23 círculo, osteocalcina hexágono, lipocalina 2 triángulo).
- Actividad 2 «Explora las funciones del hueso»: el docente pide que el estudiante seleccione primero cada una de las cuatro categorías de la imagen para desplegar sus funciones (depende de la Imagen #3) y que se muestren 6 situaciones de las 16, mezcladas y distintas en cada intento («La idea es que el algoritmo las varie, pero para esta actividad mostrar 6 funciones en total, mezcladas»). HECHO (2026-10-26): el quiz sortea 6 de las 16 en cada intento (`config.mostrar: 6`).
- Las explicaciones de las 16 situaciones son la categoría correcta («Función predominante: …»): el docente no escribió justificación para cada una.
- «Este submódulo es corto, no pondría más actividades ni preguntas».

#### Contenido

**1. Mecánica y estructural**

- **Sostén, estabilidad y organización corporal:** El esqueleto constituye el armazón estructural del organismo; soporta las cargas gravitacionales, mantiene la forma corporal y proporciona puntos de anclaje al sistema musculotendinoso. En conjunto con las articulaciones, contribuye a la estabilidad y alineación corporal.
- **Protección de órganos y estructuras vitales:** El esqueleto protege estructuras vulnerables mediante configuraciones anatómicas que delimitan cavidades y ofrecen resistencia frente a impactos. El cráneo, la columna vertebral y la caja torácica resguardan, respectivamente, el encéfalo, la médula espinal y los órganos torácicos; su eficacia protectora depende de la geometría de estas estructuras y de la magnitud, dirección y velocidad de las fuerzas aplicadas.
- **Biomecánica y transmisión de fuerzas:** El tejido óseo transmite y distribuye fuerzas gracias a la interacción de sus componentes mineral y orgánico, soportando cargas de compresión, tensión, flexión y torsión. En conjunto con las articulaciones y los músculos, permite transferir estas fuerzas, facilitando el movimiento y la estabilidad corporal.
- **Resistencia, adaptación y reparación mecánica:** El tejido óseo combina resistencia y capacidad de deformación para soportar cargas fisiológicas. Su remodelación continua lo adapta a las demandas mecánicas; ante una lesión, puede restituir la continuidad ósea y recuperar su función cuando las condiciones biológicas y mecánicas son favorables.

**2. Metabólica y homeostática**

- **Homeostasis mineral:** El tejido óseo constituye el principal reservorio corporal de calcio y fosfato, además de almacenar cantidades importantes de magnesio, sodio y carbonato. Mediante el intercambio con el líquido extracelular y la movilización mineral durante el remodelado, contribuye a la disponibilidad de estos elementos; su regulación sistémica depende de la interacción con el riñón y el intestino, y de señales como PTH, calcitriol y FGF23, cuyos efectos varían según el mineral y el contexto fisiológico.
- **Regulación endocrina y mineral:** El hueso actúa como órgano endocrino y señalizador mediante factores que participan en la comunicación con otros órganos. El FGF23, producido principalmente por osteocitos y osteoblastos, es un regulador endocrino bien establecido que aumenta la excreción renal de fosfato y reduce la síntesis de calcitriol, contribuyendo a la homeostasis mineral. Otros mediadores, como la osteocalcina y la lipocalina-2, se han relacionado con funciones sistémicas, aunque su relevancia endocrina en humanos continúa en debate. Por su parte, la esclerostina, PTHrP y RANKL/OPG ejercen principalmente funciones reguladoras locales, aunque algunas también se investigan por sus posibles efectos sistémicos.
- **Equilibrio ácido-base:** La matriz mineral del hueso actúa como reserva de sustancias alcalinas, principalmente carbonato y fosfato; ante una carga ácida sostenida, estos componentes ayudan a neutralizar el exceso de protones (H⁺), favoreciendo la liberación de bicarbonato y fosfato. Este mecanismo contribuye al equilibrio ácido-base, pero una acidosis crónica puede aumentar la resorción y pérdida de mineral óseo. La regulación principal del pH depende de los sistemas tampón, la ventilación pulmonar y la función renal.
- **Metabolismo energético y tejido adiposo medular:** El tejido óseo es metabólicamente activo y requiere energía para sostener la formación y el remodelado. El tejido adiposo de la médula ósea (BMAT) funciona como reserva energética y fuente de señales que modulan la actividad de osteoblastos y osteoclastos. Esta relación es bidireccional: factores óseos como osteocalcina, esclerostina y PTHrP pueden influir en el metabolismo energético, mientras que señales metabólicas y adipocinas regulan la actividad ósea y la diferenciación de células mesenquimáticas.

**3. Función hematopoyética e inmunológica**

- **Hematopoyesis y nichos medulares:** La médula ósea alberga células madre hematopoyéticas cuya autorrenovación y diferenciación dependen de nichos especializados, constituidos por células estromales, endoteliales y perivasculares, entre otras. Estos microambientes regulan la quiescencia, proliferación y movilización de los progenitores mediante señales como CXCL12 y SCF, esenciales para mantener la producción sostenida de células sanguíneas.
- **Desarrollo y mantenimiento de células inmunitarias:** La médula ósea sostiene la producción de células mieloides y linfocitos; además, constituye un sitio de maduración de los linfocitos B y alberga células plasmáticas de larga vida y poblaciones inmunitarias de memoria. La disponibilidad de factores tróficos y señales del microambiente medular condiciona su supervivencia, diferenciación y mantenimiento.
- **Comunicación entre hueso e inmunidad:** Las células óseas e inmunitarias interactúan bidireccionalmente mediante citocinas, factores de crecimiento y vías de señalización compartidas. El eje RANK–RANKL–OPG constituye un regulador central de esta interacción, al integrar señales del microambiente inmunitario con la diferenciación y actividad osteoclásticas. De este modo, la respuesta inmunitaria puede modular la resorción ósea y contribuir a la regulación de la masa y la homeostasis esqueléticas.
- **Regulación inflamatoria de la actividad ósea:** Las citocinas proinflamatorias, como TNF, IL-1, IL-6 e IL-17, pueden favorecer la osteoclastogénesis y la resorción ósea, además de modificar la función osteoblástica según el contexto. En enfermedades inflamatorias crónicas, la persistencia de estas señales puede alterar el acoplamiento del remodelado y favorecer la pérdida ósea.

**4. Neurobiológica e integración sistémica**

- **Inervación sensitiva y autonómica:** El tejido óseo presenta fibras sensitivas, incluidas las que expresan CGRP (péptido relacionado con el gen de la calcitonina) y sustancia P, y fibras autonómicas predominantemente simpáticas noradrenérgicas. Estas participan en la nocicepción, la regulación vascular y la modulación de la actividad celular ósea, vinculando la función esquelética con el sistema nervioso.
- **Interocepción esquelética y eje cerebro-hueso:** Comprende la transmisión de señales óseas al sistema nervioso central, donde circuitos hipotalámicos y vías autonómicas modulan el remodelado y la homeostasis ósea. Incluye la señalización PGE₂–EP4 en aferencias sensitivas, la regulación simpática y neuroendocrina, la reparación ósea, el nicho de células madre esqueléticas y los ritmos circadianos. Estos mecanismos se estudian principalmente en modelos experimentales y su relevancia en humanos sigue en investigación.
- **Regulación neural de la actividad ósea:** La inervación simpática modula el metabolismo óseo mediante noradrenalina, que actúa sobre receptores β₂-adrenérgicos en células osteoblásticas. Esta señalización modifica la actividad osteoblástica y la expresión de RANKL, influyendo en la osteoclastogénesis y el remodelado óseo según el contexto fisiológico.

#### Actividades

##### Actividad m1_2_hormonas_oseas

```yaml
tipo: arrastre-molecular
titulo: "Del hueso al órgano diana"
instrucciones: "Arrastra cada mensajero hasta el receptor que lo reconoce y observa el efecto en el órgano (en pantalla táctil, mantén el dedo sobre la molécula; con teclado, Enter para elegirla, Tab para moverte entre receptores y Enter para confirmar)."
obligatoria: true
puntaje_max: 30
concepto: "Función endocrina del hueso"
retroalimentacion:
  acierto: "Muy bien. Cada mensajero solo activa el receptor que reconoce, como una llave en su cerradura. FGF23 es el caso mejor establecido; los efectos de la osteocalcina y de la lipocalina 2 se describieron en ratones y siguen en estudio."
  error: "Ese mensajero no reconoce ese receptor. Fíjate en de qué célula sale cada molécula y en qué órgano actúa; cada intento fallido resta puntos."
# 2026-10-25: actividad conservada a petición del docente (PDF, sección 1.1), sin los distractores (esclerostina y
# PTH). Cada receptor tiene la forma de su molécula, como pidió el docente.
escena:
  svg: m1_hormonas_oseas_escena
  descripcion: "A la izquierda, un hueso con un osteocito y un osteoblasto. Un vaso sanguíneo lo conecta con tres órganos a la derecha: el riñón (túbulo proximal), el páncreas (una célula beta) y el hipotálamo (neuronas). Cada órgano muestra en su superficie un receptor con una forma distinta. Bajo la escena están las moléculas para arrastrar."
moleculas:
  - id: fgf23
    nombre: "FGF23"
    descripcion: "Factor de crecimiento de fibroblastos 23. Lo producen los osteocitos y circula por la sangre hacia el riñón."
    rechazo: "FGF23 no actúa sobre este receptor: su órgano diana es el túbulo proximal del riñón, donde regula el fosfato."
  - id: osteocalcina
    nombre: "Osteocalcina subcarboxilada"
    descripcion: "Proteína de los osteoblastos; su forma subcarboxilada circula en la sangre. Hipótesis en estudio: actuaría sobre las células beta del páncreas y otros tejidos."
    rechazo: "Ese receptor no es el que se propone para la osteocalcina: en la hipótesis en estudio actúa sobre la célula beta del páncreas y otros tejidos."
  - id: lipocalina_2
    nombre: "Lipocalina 2 (LCN2)"
    descripcion: "Proteína secretada por los osteoblastos. Hipótesis en estudio: actuaría sobre neuronas del hipotálamo que controlan el apetito."
    rechazo: "Ese receptor no es el que se propone para la lipocalina 2: en la hipótesis en estudio actúa sobre neuronas del hipotálamo."
receptores:
  - id: receptor_fgfr_klotho
    nombre: "Receptor del túbulo proximal renal"
    descripcion: "Receptor de la superficie de las células del túbulo proximal del riñón (complejo FGFR–α-Klotho)."
    posicion: {x: 82, y: 18}
  - id: receptor_celula_beta
    nombre: "Receptor de la célula beta"
    descripcion: "Receptor de las células que secretan insulina en el páncreas. Se ha propuesto que sería GPRC6A, un receptor acoplado a proteína G."
    posicion: {x: 82, y: 50}
  - id: receptor_mc4r
    nombre: "Receptor de neuronas del hipotálamo"
    descripcion: "Receptor de melanocortina 4 (MC4R), implicado en el control del apetito."
    posicion: {x: 82, y: 82}
pares:
  - molecula: fgf23
    receptor: receptor_fgfr_klotho
    efecto:
      titulo: "El riñón elimina fosfato"
      descripcion: "FGF23 se une al complejo FGFR–α-Klotho del túbulo proximal. Disminuye la reabsorción de fosfato, que se pierde por la orina, y reduce la síntesis de calcitriol (vitamina D activa). Resultado: baja la fosfatemia. Es un mecanismo bien establecido en humanos."
      animacion: cascada
      indicadores:
        - etiqueta: "Fosfato en sangre"
          direccion: disminuye
        - etiqueta: "Calcitriol"
          direccion: disminuye
  - molecula: osteocalcina
    receptor: receptor_celula_beta
    efecto:
      titulo: "Hipótesis en ratones: la célula beta libera más insulina"
      descripcion: "Un grupo de investigación describió que, en ratones, la osteocalcina subcarboxilada favorece la secreción de insulina y mejora la sensibilidad a la insulina. En 2020, dos estudios con nuevos ratones sin osteocalcina no hallaron alteraciones del metabolismo de la glucosa: el debate sigue abierto, y en humanos la evidencia es menos concluyente."
      animacion: liberacion
      indicadores:
        - etiqueta: "Insulina"
          direccion: aumenta
        - etiqueta: "Glucosa en sangre"
          direccion: disminuye
  - molecula: lipocalina_2
    receptor: receptor_mc4r
    efecto:
      titulo: "Hipótesis en ratones: baja el apetito"
      descripcion: "Un estudio en ratones propuso que la lipocalina 2 de origen óseo llega al cerebro y activa el receptor MC4R de neuronas del hipotálamo, con lo que disminuye la ingesta de alimento. Falta confirmación independiente y su papel en humanos se está investigando."
      animacion: activacion
      indicadores:
        - etiqueta: "Apetito"
          direccion: disminuye
```

##### Actividad m1_1_funciones_situaciones

```yaml
tipo: quiz
titulo: "Explora las funciones del hueso"
instrucciones: "Relaciona cada situación con la función predominante: mecánica y estructural, metabólica y homeostática, hematopoyética e inmunológica, o neurobiológica y sistémica."
obligatoria: true
puntaje_max: 30
concepto: "Reconocer y diferenciar las principales funciones del hueso a partir de ejemplos concretos"
retroalimentacion:
  acierto: "Muy bien. Reconoces la función predominante del hueso en cada situación."
  error: "Revisa las cuatro categorías de funciones de la sección y vuelve a intentarlo."
preguntas:
  - id: m1_1_s1
    formato: opcion_multiple
    enunciado: "Durante una caída, una persona recibe un impacto en la región craneal. La arquitectura del cráneo permite distribuir las fuerzas generadas por el impacto y limitar su transmisión hacia las estructuras encefálicas."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: a
    explicacion: "Función predominante: mecánica y estructural."
  - id: m1_1_s2
    formato: opcion_multiple
    enunciado: "Durante la masticación de un alimento de alta dureza, las fuerzas generadas por los músculos elevadores se transmiten a través de la mandíbula y el maxilar hacia sus estructuras de soporte."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: a
    explicacion: "Función predominante: mecánica y estructural."
  - id: m1_1_s3
    formato: opcion_multiple
    enunciado: "Después de varias semanas de inmovilización de una extremidad, los estudios de imagen muestran una disminución progresiva de la masa ósea en el segmento que dejó de recibir las cargas habituales."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: a
    explicacion: "Función predominante: mecánica y estructural."
  - id: m1_1_s4
    formato: opcion_multiple
    enunciado: "Durante la marcha, la disposición de las trabéculas en la cabeza femoral permite transmitir las cargas desde la superficie articular hacia el cuello y la diáfisis femoral."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: a
    explicacion: "Función predominante: mecánica y estructural."
  - id: m1_1_s5
    formato: opcion_multiple
    enunciado: "Un paciente presenta una disminución persistente de la concentración de calcio en sangre. Como parte de la respuesta del organismo, aumenta la movilización de mineral desde el esqueleto hacia la circulación."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: b
    explicacion: "Función predominante: metabólica y homeostática."
  - id: m1_1_s6
    formato: opcion_multiple
    enunciado: "Un paciente presenta una elevación sostenida del fosfato sérico. Los osteocitos modifican la producción de señales que favorecen una mayor eliminación renal de este mineral."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: b
    explicacion: "Función predominante: metabólica y homeostática."
  - id: m1_1_s7
    formato: opcion_multiple
    enunciado: "Durante una alteración prolongada del equilibrio ácido-base, se incrementa la movilización de componentes minerales de la matriz ósea, contribuyendo a amortiguar parte de la carga ácida."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: b
    explicacion: "Función predominante: metabólica y homeostática."
  - id: m1_1_s8
    formato: opcion_multiple
    enunciado: "A pesar de que la dieta constituye una fuente importante de minerales, el organismo mantiene un intercambio continuo entre el tejido óseo y la circulación para conservar concentraciones relativamente estables de calcio y fosfato."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: b
    explicacion: "Función predominante: metabólica y homeostática."
  - id: m1_1_s9
    formato: opcion_multiple
    enunciado: "Después de una pérdida importante de sangre, aumenta la actividad de la médula ósea para producir nuevas células destinadas a restablecer las poblaciones sanguíneas circulantes."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: c
    explicacion: "Función predominante: hematopoyética e inmunológica."
  - id: m1_1_s10
    formato: opcion_multiple
    enunciado: "En una muestra de médula ósea se observa una población de células inmaduras rodeada por células estromales, vasos sanguíneos y señales que favorecen su mantenimiento y diferenciación."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: c
    explicacion: "Función predominante: hematopoyética e inmunológica."
  - id: m1_1_s11
    formato: opcion_multiple
    enunciado: "Durante una infección sistémica, aumenta la producción de células de la línea leucocitaria en la médula ósea, permitiendo incrementar su disponibilidad en la circulación."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: c
    explicacion: "Función predominante: hematopoyética e inmunológica."
  - id: m1_1_s12
    formato: opcion_multiple
    enunciado: "La alteración del microambiente de la médula ósea puede comprometer la supervivencia y diferenciación de las células que darán origen a las diferentes líneas celulares de la sangre."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: c
    explicacion: "Función predominante: hematopoyética e inmunológica."
  - id: m1_1_s13
    formato: opcion_multiple
    enunciado: "Una lesión ósea puede producir dolor incluso antes de que se complete la reparación del tejido, debido a la activación de fibras nerviosas asociadas al hueso."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: d
    explicacion: "Función predominante: neurobiológica y sistémica."
  - id: m1_1_s14
    formato: opcion_multiple
    enunciado: "Durante un periodo de elevada actividad simpática, las señales nerviosas pueden modificar el comportamiento de células óseas y alterar temporalmente el equilibrio entre formación y resorción."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: d
    explicacion: "Función predominante: neurobiológica y sistémica."
  - id: m1_1_s15
    formato: opcion_multiple
    enunciado: "Durante la reparación de una lesión ósea, las fibras nerviosas asociadas al tejido pueden liberar moléculas señalizadoras capaces de modificar la respuesta vascular y celular local."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: d
    explicacion: "Función predominante: neurobiológica y sistémica."
  - id: m1_1_s16
    formato: opcion_multiple
    enunciado: "Una señal producida por células óseas puede actuar fuera del tejido donde se originó y modificar la actividad de órganos como el riñón, estableciendo una comunicación entre el esqueleto y otros sistemas."
    opciones:
      - id: a
        texto: "Mecánica y estructural"
      - id: b
        texto: "Metabólica y homeostática"
      - id: c
        texto: "Hematopoyética e inmunológica"
      - id: d
        texto: "Neurobiológica y sistémica"
    correcta: d
    explicacion: "Función predominante: neurobiológica y sistémica."
```

##### Actividad m1_1_evaluacion

```yaml
tipo: quiz
titulo: "Evaluación"
instrucciones: "Responde cada pregunta. Al elegir tu respuesta verás enseguida si es correcta y por qué."
obligatoria: true
puntaje_max: 20
concepto: "Funciones, propiedades y características biológicas del tejido óseo"
retroalimentacion:
  acierto: "Muy bien. Respondiste correctamente la evaluación de la sección."
  error: "Revisa la explicación de cada pregunta y vuelve a leer la sección."
preguntas:
  - id: m1_1_e1
    formato: opcion_multiple
    enunciado: "Un paciente presenta una lesión ósea y, durante el proceso de recuperación, se produce formación de tejido nuevo y restitución progresiva de la continuidad del hueso. ¿Qué característica del tejido óseo explica mejor este fenómeno?"
    opciones:
      - id: a
        texto: "Su función hematopoyética"
      - id: b
        texto: "Su capacidad regenerativa y de reparación"
      - id: c
        texto: "Su función endocrina"
      - id: d
        texto: "Su participación en el equilibrio ácido-base"
    correcta: b
    explicacion: "La capacidad regenerativa permite que el hueso repare lesiones y recupere su continuidad cuando las condiciones biológicas y mecánicas son favorables."
  - id: m1_1_e2
    formato: opcion_multiple
    enunciado: "¿Cuál afirmación diferencia mejor la función mecánica del hueso de su función metabólica?"
    opciones:
      - id: a
        texto: "La función mecánica se limita al sostén, mientras que la metabólica depende exclusivamente de la médula ósea"
      - id: b
        texto: "La función mecánica comprende el soporte y la transmisión de fuerzas, mientras que la metabólica incluye la participación en la homeostasis mineral"
      - id: c
        texto: "Ambas funciones son equivalentes porque dependen exclusivamente de la mineralización"
      - id: d
        texto: "La función metabólica solo aparece cuando se produce una lesión"
    correcta: b
    explicacion: "El hueso proporciona soporte y transmite cargas, pero también constituye un reservorio mineral que participa en la regulación del calcio y el fosfato."
```

### Seccion 1.2: La arquitectura del hueso

id "m1_2_arquitectura"

#### Entrada

La arquitectura ósea describe cómo se organiza el tejido a distintas escalas, desde la distribución del hueso compacto y trabecular hasta la disposición microscópica de sus laminillas, osteonas y espacios medulares. Esta organización determina propiedades como la resistencia mecánica, la distribución de cargas y la relación entre el tejido óseo, su vascularización y la médula ósea. Realizaremos un recorrido desde la estructura macroscópica a la microscópica.

#### Pendientes PDF

- PENDIENTE PDF: Imagen #1 (apertura; el texto lateral es la «Entrada»). Indicación: «Imagen servirá como fondo de cualquier submódulo donde no se pueda usar la imagen propuesta como pantalla completa».
- PENDIENTE PDF: Imagen #2, «Clasificación de los huesos». Indicación: «Al tocar cada letrero deberá salir el texto que coloque aquí» (los seis tipos de hueso). Mientras tanto van como lista.
- Imagen #3, «Anatomía de un hueso largo». Indicación: «Me gustaría que se viera así como ya está en la página, como una actividad». Se usa la actividad existente `m1_1_hueso_largo` (modelo 3D del hueso largo) con las definiciones del docente en cada región; la arteria nutricia conserva el texto que ya tenía. Crédito de la imagen del docente (pendiente de integrar): «Anatomía de un hueso largo. Fuente: OpenStax College (2018), 603 Anatomy of Long Bone esp.jpg, Wikimedia Commons, licencia CC BY-SA 4.0.».
- PENDIENTE PDF: Imagen #4, «Anatomía de un hueso corto y un hueso plano».
- PENDIENTE PDF: Imagen #5, «Arquitectura del hueso cortical o compacto». Indicación: «La idea es usar el mismo fondo anterior para colocar esta tabla y la definición».
- PENDIENTE PDF: Imagen #6, «Osteona». Indicación: «Al tocar cada letrero deberá salir el texto que coloque aquí». Mientras tanto, las siete definiciones van como lista.
- PENDIENTE PDF: Imagen #7, «Organización laminar no osteonal». Indicación: «Al tocar cada letrero amarillo deberá salir el texto que coloque aquí». Mientras tanto, lista.
- PENDIENTE PDF: Imagen #8, «Arquitectura del hueso esponjoso o trabecular».
- PENDIENTE PDF: Imagen #9, «Osteona trabecular», con las características como texto lateral.
- Tabla conservada: «Conservar esta tabla que ya está en la página ** ponerla en este orden después de explicar las particularidades del hueso cortical y el trabecular» (tabla Rasgo / Hueso cortical / Hueso trabecular).
- PENDIENTE PDF: Imagen #10, «Membranas delimitantes» (periostio); Imagen #11, «Endostio».
- PENDIENTE PDF: Imagen #12, «Vascularización e inervación ósea: organización general». Crédito: «Fuente: Adaptado de Tortora, G. J., y Derrickson, B. H. (2006). Principles of Anatomy and Physiology (11.ª ed., figura 6.4). John Wiley & Sons.».
- PENDIENTE PDF: Imagen #13, «Microcirculación del hueso cortical»; Imagen #14, «Microcirculación del hueso trabecular y del compartimento medular».
- PENDIENTE PDF: Imagen #15, «Microvasculatura especializada y acoplamiento angiogénico-osteogénico». Pie y crédito: «Distribución de los vasos sanguíneos tipo H y tipo L en el hueso en desarrollo. Fuente: Watanabe et al. (2023), figura 3, International Journal of Molecular Sciences, 24(13), 10912. Licencia CC BY 4.0.».
- PENDIENTE PDF: Imagen #16, «Inervación y regulación neurovascular». Crédito: «Fuente: Regulación simpático-sensorial del nicho de células madre esqueléticas. Ilustración adaptada a partir de Chen et al. (2026), figura 3, bajo licencia CC BY 4.0.».
- PENDIENTE PDF: Actividad 1 «Compara el hueso cortical y el trabecular». Modalidad: «El estudiante completa una tabla comparativa seleccionando la característica que corresponde a cada tipo de tejido. Primero la tabla únicamente tendrá los nombres de las características y los títulos de la tabla, todos los demás elementos deberán estar abajo y el estudiante los debe acomodar donde cree que van». Necesita un componente nuevo (completar una tabla arrastrando). Contenido de la tabla (de la imagen del PDF), Característica | Hueso cortical | Hueso trabecular: Organización | Tejido compacto y continuo | Red tridimensional de láminas y pilares; Unidad estructural | Osteona con conducto de Havers | Láminas sin conducto de Havers central; Distribución | Predomina en diáfisis y superficie externa | Predomina en epífisis y regiones internas; Irrigación | Conductos de Havers y Volkmann | Vasos del compartimento medular; Respuesta a cargas | Alta resistencia y rigidez | Distribuye las fuerzas según su orientación; Intercambio metabólico | Menor superficie relativa | Mayor superficie de intercambio.
- Actividad conservada: «Esta actvidad que ya está en la página también se puede conservar tal cual» = `m1_4_relacion_estructuras`.
- Evaluación: «De este banco de preguntas del 1 al 5, colocar solo 3 preguntas y de 6 a 8 completas». PENDIENTE: el quiz aún no elige 3 de las 5 al azar; por ahora van todas. La pregunta 2 no está en el PDF (se pasa de la 1 a la 3); se pidió al docente. Las preguntas 1, 3, 4, 5 y 6 no traen justificación: la explicación es la frase del texto del docente que las responde.

#### Contenido

**Clasificación de los huesos**

El esqueleto humano adulto está constituido por 206 huesos como referencia anatómica; este número puede variar entre individuos por la presencia de huesos accesorios o procesos de fusión. Cada hueso presenta una morfología y arquitectura adaptadas a sus funciones mecánicas y anatómicas, por lo que, según sus características macroscópicas, pueden clasificarse en largos, cortos, planos, irregulares, sesamoideos y neumáticos; estas categorías no son mutuamente excluyentes, ya que un mismo hueso puede presentar más de una característica.

- **Huesos largos:** Huesos cuya organización longitudinal predomina sobre sus dimensiones transversales, con una diáfisis tubular de predominio cortical y extremos ensanchados con mayor proporción de tejido trabecular. Esta arquitectura permite distribuir y transmitir cargas mecánicas a lo largo del eje del hueso.
- **Huesos cortos:** Huesos de configuración aproximadamente cuboidal, caracterizados por una estructura interna predominantemente trabecular rodeada por una delgada envoltura cortical. Su organización favorece la distribución multidireccional de cargas y la estabilidad frente a fuerzas compresivas.
- **Huesos planos:** Huesos relativamente delgados y extensos, constituidos generalmente por dos láminas de hueso cortical que delimitan un núcleo trabecular. Esta disposición proporciona protección mecánica y amplias superficies para inserción muscular; en el cráneo, el componente trabecular recibe el nombre de diploe.
- **Huesos irregulares:** Huesos con una morfología tridimensional compleja que no se ajusta a las categorías anteriores y cuya arquitectura responde a funciones mecánicas y relaciones anatómicas específicas. Presentan proporciones variables de tejido cortical y trabecular.
- **Huesos sesamoideos:** Huesos que se desarrollan intratendinosamente, generalmente en regiones sometidas a carga mecánica, donde modifican el brazo de palanca y la dirección de las fuerzas musculotendinosas, además de proteger el tendón frente a la compresión.
- **Huesos neumáticos:** Huesos que contienen cavidades aéreas revestidas por mucosa y comunicadas con las vías respiratorias. Esta característica, que puede coexistir con otras clasificaciones anatómicas, contribuye a reducir la masa ósea y participa en la configuración de determinadas regiones craneofaciales, como el frontal, el etmoides, el esfenoides y el maxilar.

**Anatomía macroscópica de los huesos**

***Anatomía de un hueso largo.*** Los huesos largos se caracterizan por presentar una diáfisis alargada y dos extremos, denominados epífisis, unidos durante el crecimiento por las metáfisis. La diáfisis contiene una cortical gruesa que delimita la cavidad medular, mientras que las epífisis presentan abundante hueso trabecular recubierto por una fina capa cortical; las superficies articulares están revestidas por cartílago hialino.

***Anatomía de un hueso corto y un hueso plano.*** Los huesos cortos presentan una envoltura de tejido cortical que rodea un núcleo trabecular con espacios intertrabeculares ocupados por médula ósea; los huesos planos poseen dos tablas de hueso cortical separadas por una capa de tejido trabecular denominada diploe. En ambos, la distribución de estos compartimentos contribuye a la resistencia mecánica y a la organización interna del tejido óseo.

**Arquitectura del hueso cortical o compacto**

El hueso cortical o compacto es un tejido óseo denso que constituye la capa externa de los huesos y representa aproximadamente el 80 % de la masa ósea del esqueleto adulto; su baja porosidad relativa le confiere rigidez y resistencia frente a cargas de compresión, flexión y torsión. Su distribución varía según la región anatómica, con un claro predominio en la diáfisis de los huesos largos, donde proporciona soporte y estabilidad frente a las fuerzas generadas durante el movimiento.

**Osteona**

La osteona o sistema de Havers es una unidad estructural característica del hueso cortical laminar, constituida por capas cilíndricas de matriz ósea dispuestas concéntricamente alrededor de un conducto central que contiene vasos sanguíneos y fibras nerviosas.

- **Canal Central de Havers:** Es un canal situado en el centro de la osteona, cuya orientación es predominantemente longitudinal en muchas regiones del hueso cortical. Contiene vasos sanguíneos, generalmente capilares y pequeños vasos, además de fibras nerviosas amielínicas sensitivas y autonómicas, que contribuyen a la irrigación y la inervación del tejido óseo.
- **Endostio:** Es una delgada capa celular que recubre las superficies internas del hueso, incluidas la cavidad medular, las trabéculas y los conductos vasculares.
- **Línea de Cemento:** Es una fina interfaz altamente mineralizada y pobre en colágeno, de aproximadamente 1–2 µm de grosor, que delimita externamente cada osteona y la separa de la matriz ósea circundante. Enriquecida en proteínas no colágenas, como osteopontina y sialoproteína ósea, marca el límite de la resorción durante la formación de osteonas secundarias y puede influir en la propagación de microfracturas a través del tejido cortical.
- **Conductos Transversales de Volkmann:** Son canales vasculares transversales u oblicuos que atraviesan el hueso cortical, conectan los conductos de Havers y establecen la comunicación vascular entre el periostio, el endostio y la cavidad medular.
- **Periostio:** Membrana de tejido conjuntivo vascularizado que recubre la superficie externa del hueso, excepto en las superficies articulares; participa en su nutrición, crecimiento y reparación.
- **Laminillas concéntricas:** Son capas de matriz extracelular mineralizada de 3–7 µm de grosor, dispuestas alrededor del conducto de Havers. Sus fibrillas de colágeno tipo I se orientan paralelamente dentro de cada capa y cambian de dirección entre capas adyacentes; esta orientación alternante de las fibras aumenta la resistencia mecánica y limita la propagación de microfracturas.
- **Osteocito:** Célula ósea madura derivada del osteoblasto, alojada en una laguna de la matriz mineralizada; mantiene la matriz y detecta estímulos mecánicos.

**Organización laminar no osteonal (sistemas periféricos e intersticiales)**

La organización laminar no osteonal comprende las laminillas óseas que no forman parte de una osteona completa y que se distribuyen en relación con las superficies externas e internas del hueso o entre las osteonas.

- **Laminillas circunferenciales externas:** Son capas continuas de matriz ósea dispuestas paralelamente a la superficie externa del hueso, inmediatamente por debajo del periostio; las depositan los osteoblastos de la capa interna del periostio durante el crecimiento en grosor mediante modelado aposicional.
- **Laminillas intersticiales:** Son fragmentos irregulares de matriz ósea localizados entre las osteonas; corresponden a remanentes de osteonas antiguas, parcialmente reabsorbidas durante ciclos previos de remodelado óseo por la unidad multicelular básica (BMU).
- **Laminillas circunferenciales internas:** Son capas continuas de matriz ósea dispuestas paralelamente a la superficie interna del hueso, que revisten el perímetro de la cavidad medular, inmediatamente por debajo del endostio.

**Arquitectura del hueso esponjoso o trabecular**

El hueso esponjoso o trabecular es un tejido óseo organizado en una red tridimensional de trabéculas interconectadas que delimitan espacios ocupados principalmente por médula ósea y vasos sanguíneos; representa aproximadamente el 20 % de la masa ósea del esqueleto adulto. Su elevada superficie favorece el intercambio metabólico y el remodelado, mientras que su arquitectura refleja la historia de carga mecánica, las condiciones locales y los procesos de adaptación del tejido, que modifican progresivamente su organización para contribuir a la distribución y transmisión de fuerzas con bajo peso estructural. Predomina en las epífisis de los huesos largos y en el interior de huesos planos e irregulares, donde se encuentra rodeado por tejido cortical.

**Osteona trabecular**

**Definición:** Unidad estructural lamelar del hueso trabecular, formada por paquetes de laminillas dispuestas paralelamente y adaptadas a la superficie de la trabécula, delimitados por una línea de cemento que refleja una superficie previa de remodelado.

*Características de la osteona trabecular*

1. **Forma de semiluna o paquete plano:** Los paquetes laminares presentan una configuración aplanada o ligeramente curva, adaptada a la superficie de la trabécula. Su grosor y longitud varían según la región anatómica y las características del tejido.
2. **Ausencia de conducto de Havers:** A diferencia de las osteonas del hueso cortical, las trabéculas generalmente carecen de conductos vasculares centrales, por lo que el aporte de nutrientes depende principalmente de la difusión desde los vasos sanguíneos de la médula ósea a través de la superficie trabecular.
3. **Nutrición por difusión:** El oxígeno y los nutrientes llegan desde los vasos de la médula y del endostio, y se distribuyen hacia los osteocitos a través de la red lacunocanalicular (LCN), sin necesidad de vasos intramurales.
4. **Organización lamelar:** Está formada por laminillas planas o ligeramente curvadas, dispuestas en capas paralelas, a diferencia de las laminillas concéntricas que rodean los conductos de Havers en las osteonas corticales.
5. **Línea de cemento:** Los paquetes de hueso pueden estar delimitados por líneas de cemento, estructuras interfaciales que marcan límites entre superficies óseas preexistentes y hueso formado posteriormente. Estas líneas presentan una composición diferente a la matriz ósea circundante y pueden enriquecerse en proteínas como la osteopontina (OPN); su composición y grosor varían según el contexto.

| Rasgo | Hueso cortical | Hueso trabecular |
|---|---|---|
| Aspecto | Masa densa y continua | Red de trabéculas con espacios medulares |
| Proporción de la masa esquelética | Aproximadamente el 80 % | Aproximadamente el 20 % |
| Porosidad | Baja, aproximadamente menos del 10 % | Alta, aproximadamente del 50 % al 90 % |
| Dónde predomina | Diáfisis y capa externa de todos los huesos | Epífisis, metáfisis y el interior de vértebras y huesos cortos y planos |
| Unidad estructural | Osteona (sistema de Havers) | Trabécula de hueso laminar, sin conductos de Havers: se nutre desde la médula |
| Función principal | Resistir flexión y torsión, proteger, servir de palanca | Repartir y absorber cargas de compresión; ofrecer gran superficie de contacto con la médula |
| Ritmo de renovación | Más lento | Más rápido, por su mayor superficie |

**Membranas delimitantes**

El hueso compacto está confinado y delimitado metabólicamente por dos membranas altamente especializadas.

***Periostio.*** El periostio es una membrana de tejido conjuntivo especializado que recubre la superficie externa del hueso, excepto en las regiones cubiertas por cartílago articular y determinadas zonas de inserción; está ricamente vascularizado e inervado, contribuye a la nutrición del tejido óseo, el crecimiento por aposición y la reparación de lesiones, además de proporcionar anclaje para tendones y ligamentos mediante sus inserciones fibrosas.

***Endostio.*** El endostio es un revestimiento celular fino y discontinuo que recubre las superficies internas del hueso, incluidas la cavidad medular, las trabéculas y las superficies de los conductos de Havers y Volkmann. Su composición celular varía según la localización y la actividad del tejido, e incluye principalmente células de revestimiento óseo y células osteoprogenitoras, además de células asociadas al remodelado cuando este se encuentra activo. Asimismo, participa en la organización de los sitios de remodelado óseo, donde pueden formarse compartimentos especializados como el compartimento de remodelado óseo (BRC), delimitado por un dosel celular o Bone Remodeling Canopy.

**Vascularización e inervación ósea**

***Organización general.*** La irrigación ósea constituye una red vascular altamente especializada e interconectada que atraviesa el periostio, el hueso cortical y el compartimento medular, adaptándose a la arquitectura y a las demandas metabólicas de cada región; proporciona oxígeno y nutrientes, facilita la eliminación de productos metabólicos y establece una vía de comunicación entre el tejido óseo, la médula y los tejidos circundantes, siendo fundamental para mantener la actividad de osteoblastos y osteoclastos y sostener procesos como el remodelado, la adaptación y la reparación ósea.

***Microcirculación del hueso cortical.*** La microcirculación cortical se organiza alrededor de una extensa red de conductos de Havers y Volkmann, que distribuyen vasos y permiten el intercambio con el sistema lacunocanalicular; a esta red se incorporan los canales transcorticales, estructuras vasculares que atraviesan directamente la cortical y establecen conexiones entre la circulación medular y la perióstica, favoreciendo una comunicación vascular bidireccional a través del espesor cortical. En conjunto, esta organización asegura el aporte de oxígeno y nutrientes a los osteocitos y sostiene la actividad metabólica, el remodelado y la reparación del tejido óseo.

***Microcirculación del hueso trabecular y del compartimento medular.*** En el hueso trabecular, la red vascular se distribuye principalmente por el compartimento medular y sus espacios intertrabeculares, desde donde los nutrientes difunden hacia las células óseas a través de las superficies trabeculares y la matriz mineralizada. Debido a que las trabéculas son relativamente delgadas, los osteocitos pueden mantener el intercambio con el entorno vascular mediante el líquido intersticial y la red lacunocanalicular.

**Microvasculatura especializada y acoplamiento angiogénico-osteogénico**

***Vasos tipo H.*** Los vasos tipo H constituyen una subpoblación especializada de la microvasculatura ósea, caracterizada por una elevada expresión endotelial de CD31 y endomucina; se asocian con regiones de actividad osteogénica e interactúan mediante señales paracrinas con células osteoprogenitoras y osteoblastos, modulando su proliferación y diferenciación. Este acoplamiento entre angiogénesis y osteogénesis involucra señales como VEGF, PDGF-BB y SLIT3, relacionadas con la formación vascular y ósea, así como con la reparación esquelética. Aunque se caracterizaron inicialmente en huesos largos, también se han descrito en regiones craneofaciales, como la calvaria, el cóndilo mandibular y el hueso alveolar, principalmente en modelos animales; en este último, tras la extracción dental, el aumento de estos vasos se ha asociado con una mayor acumulación perivascular de células osteoprogenitoras RUNX2⁺ y de masa ósea.

***Vasos tipo L.*** Los vasos tipo L se caracterizan por una menor expresión endotelial de CD31 y endomucina en comparación con los vasos tipo H. En los modelos experimentales en los que se han caracterizado, forman redes sinusoidales ramificadas, predominantes en determinadas regiones de la médula ósea, y participan en el intercambio entre la sangre y el microambiente medular. Se relacionan con el mantenimiento del nicho hematopoyético y de las células estromales perivasculares mediante señales como CXCL12, SCF y angiopoyetina-1, que contribuyen a regular la supervivencia y función de las células madre hematopoyéticas.

***Nota:*** La clasificación en vasos tipo H y tipo L deriva principalmente de estudios experimentales, especialmente en modelos animales, y constituye un modelo útil para comprender el acoplamiento entre angiogénesis y osteogénesis, pero no debe interpretarse como una clasificación universal y exhaustiva de toda la microvasculatura ósea.

**Inervación y regulación neurovascular**

El tejido óseo presenta una estrecha asociación entre las redes nerviosa y vascular, especialmente en el periostio, la médula ósea y los conductos de Havers y Volkmann; las fibras simpáticas noradrenérgicas y las fibras sensitivas regulan la perfusión y la actividad celular mediante neurotransmisores y neuropéptidos. La noradrenalina actúa sobre receptores β₂-adrenérgicos de las células del linaje osteoblástico, modulando la formación ósea y la osteoclastogénesis, mientras que las fibras sensitivas, asociadas a la señalización NGF–TrkA y a neuropéptidos como CGRP, participan en la regulación vascular, el remodelado y la reparación tisular.

Además, estudios recientes han identificado una regulación diferencial del nicho de células madre esqueléticas: el eje SLIT2–FSTL1, asociado a la inervación simpática, inhibe su autorrenovación y potencial osteogénico, mientras que el eje p75NTR–SPP1, vinculado a la inervación sensitiva, favorece estos procesos. Esta acción opuesta, descrita como un equilibrio «yin-yang», amplía la comprensión de la regulación neural del hueso, aunque su relevancia fisiológica y traslacional continúa en investigación.

#### Actividades

##### Actividad m1_1_hueso_largo

```yaml
tipo: exploracion-3d
titulo: "Recorre un hueso largo"
instrucciones: "Gira el hueso con un dedo y acércalo con dos (en escritorio, arrastra con el ratón y usa la rueda): está serrado a lo largo para que veas su interior. Toca cada región para leer qué es y qué hace. Con teclado, Tab y Enter, o elige en la lista bajo el modelo (sirve también sin 3D). Visita al menos las cinco regiones requeridas."
obligatoria: true
puntaje_max: 20
concepto: "Anatomía de un hueso largo"
retroalimentacion:
  acierto: "Muy bien. Ya conoces las regiones de un hueso largo y sabes que no es una pieza maciza: tiene una cavidad medular y una arteria que lo nutre."
  error: "Todavía te faltan regiones por visitar. Revisa las regiones que no tienen la marca de visitada: cada una explica una parte distinta de la estructura del hueso."
# 2026-10-25: actividad conservada a petición del docente («como ya está en la página, como una actividad», PDF 1.2,
# Imagen #3), con sus definiciones. La arteria nutricia conserva el texto anterior (el PDF no la define).
modelo: hueso_largo
hotspots:
  - id: cartilago_articular
    etiqueta: "Cartílago articular"
    descripcion: "Recubre las superficies articulares y facilita el movimiento, distribuyendo las cargas de contacto."
  - id: epifisis
    etiqueta: "Epífisis"
    descripcion: "Extremos articulares, constituidos principalmente por hueso trabecular rodeado de cortical."
  - id: linea_epifisaria
    etiqueta: "Línea epifisaria"
    descripcion: "Remanente de la placa de crecimiento que persiste como una banda de hueso compacto en la unión entre la epífisis y la diáfisis después del cierre del crecimiento longitudinal."
  - id: metafisis
    etiqueta: "Metáfisis"
    descripcion: "Región de transición entre diáfisis y epífisis, asociada al crecimiento longitudinal durante el desarrollo."
  - id: diafisis
    etiqueta: "Diáfisis"
    descripcion: "Cuerpo alargado del hueso, con predominio de tejido cortical y una cavidad medular central."
  - id: cavidad_medular
    etiqueta: "Cavidad medular"
    descripcion: "Espacio interno que contiene médula ósea."
  - id: arteria_nutricia
    etiqueta: "Arteria nutricia"
    descripcion: "Vaso principal del hueso. Entra por un foramen de la diáfisis y se ramifica en la médula. Irriga la médula y la parte interna de la cortical; los vasos del periostio irrigan la parte externa."
requeridos: [epifisis, metafisis, diafisis, cavidad_medular, arteria_nutricia]
```

##### Actividad m1_4_relacion_estructuras

```yaml
tipo: relacion-columnas
titulo: "Estructuras y definiciones"
instrucciones: "Une cada estructura con su definición. Toca una de cada columna (o arrastra; con teclado, Enter para elegir y flechas para moverte). Una definición de la derecha no corresponde a ninguna estructura."
obligatoria: true
puntaje_max: 20
concepto: "Organización microscópica del hueso"
retroalimentacion:
  acierto: "Correcto. Distingues las membranas del hueso, los conductos y los tipos de arquitectura."
  error: "Repasa las diferencias: el periostio cubre por fuera y el endostio por dentro; los conductos de Havers son longitudinales y los de Volkmann, transversales."
# 2026-10-25: conservada tal cual a petición del docente (PDF 1.2: «Esta actvidad que ya está en la página también se
# puede conservar tal cual»).
izquierda:
  - id: e_periostio
    texto: "Periostio"
  - id: e_endostio
    texto: "Endostio"
  - id: e_havers
    texto: "Conducto de Havers"
  - id: e_volkmann
    texto: "Conducto de Volkmann"
  - id: e_intersticiales
    texto: "Laminillas intersticiales"
  - id: e_trabecular
    texto: "Hueso trabecular"
derecha:
  - id: s_periostio
    texto: "Membrana externa con una capa fibrosa y otra celular; sus fibras de Sharpey anclan el hueso y a ella se unen tendones y ligamentos."
  - id: s_endostio
    texto: "Capa celular muy delgada que tapiza la cavidad medular y las superficies de las trabéculas."
  - id: s_havers
    texto: "Canal longitudinal central de la osteona que contiene capilares y nervios."
  - id: s_volkmann
    texto: "Canal transversal u oblicuo que comunica conductos de Havers entre sí y con el periostio y la médula."
  - id: s_intersticiales
    texto: "Restos de osteonas antiguas que quedaron entre osteonas más recientes."
  - id: s_trabecular
    texto: "Red esponjosa de alta porosidad, predominante en las epífisis y de renovación más rápida."
  - id: s_distractor_placa
    texto: "Cartílago que hace crecer el hueso en longitud durante la infancia."
pares:
  - izquierda: e_periostio
    derecha: s_periostio
  - izquierda: e_endostio
    derecha: s_endostio
  - izquierda: e_havers
    derecha: s_havers
  - izquierda: e_volkmann
    derecha: s_volkmann
  - izquierda: e_intersticiales
    derecha: s_intersticiales
  - izquierda: e_trabecular
    derecha: s_trabecular
```

##### Actividad m1_2_evaluacion

```yaml
tipo: quiz
titulo: "Evaluación"
instrucciones: "Responde cada pregunta. Al elegir tu respuesta verás enseguida si es correcta y por qué."
obligatoria: true
puntaje_max: 70
concepto: "Arquitectura del hueso"
retroalimentacion:
  acierto: "Muy bien. Respondiste correctamente la evaluación de la sección."
  error: "Revisa la explicación de cada pregunta y vuelve a leer la sección."
preguntas:
  - id: m1_2_e1
    formato: opcion_multiple
    enunciado: "En la descripción de un hueso plano del cráneo, ¿qué estructura corresponde al tejido trabecular situado entre las dos tablas corticales?"
    opciones:
      - id: a
        texto: "El diploe"
      - id: b
        texto: "La cavidad medular"
      - id: c
        texto: "La línea epifisaria"
      - id: d
        texto: "El conducto de Havers"
    correcta: a
    explicacion: "En el cráneo, el componente trabecular recibe el nombre de diploe."
  - id: m1_2_e3
    formato: opcion_multiple
    enunciado: "¿Cuál es la función descrita para los conductos transversales u oblicuos de Volkmann?"
    opciones:
      - id: a
        texto: "Delimitar las osteonas y marcar antiguas superficies de resorción"
      - id: b
        texto: "Formar laminillas concéntricas alrededor de un conducto central"
      - id: c
        texto: "Revestir las superficies internas de las trabéculas"
      - id: d
        texto: "Conectar conductos de Havers y comunicar la circulación periostal, endostal y medular"
    correcta: d
    explicacion: "Conductos Transversales de Volkmann: Son canales vasculares transversales u oblicuos que atraviesan el hueso cortical, conectan los conductos de Havers y establecen la comunicación vascular entre el periostio, el endostio y la cavidad medular."
  - id: m1_2_e4
    formato: opcion_multiple
    enunciado: "¿Qué característica permite distinguir la osteona trabecular de la osteona cortical?"
    opciones:
      - id: a
        texto: "Está delimitada por periostio y contiene una cavidad medular central"
      - id: b
        texto: "Presenta laminillas concéntricas alrededor de un conducto de Havers"
      - id: c
        texto: "Carece de conducto de Havers central y recibe nutrientes desde el entorno vascular medular"
      - id: d
        texto: "Se organiza exclusivamente en laminillas circunferenciales externas"
    correcta: c
    explicacion: "Ausencia de conducto de Havers: A diferencia de las osteonas del hueso cortical, las trabéculas generalmente carecen de conductos vasculares centrales, por lo que el aporte de nutrientes depende principalmente de la difusión desde los vasos sanguíneos de la médula ósea a través de la superficie trabecular."
  - id: m1_2_e5
    formato: verdadero_falso
    enunciado: "Las laminillas intersticiales corresponden a remanentes de osteonas antiguas parcialmente reabsorbidas durante ciclos previos de remodelado óseo."
    correcta: verdadero
    explicacion: "Laminillas intersticiales: Son fragmentos irregulares de matriz ósea localizados entre las osteonas; corresponden a remanentes de osteonas antiguas, parcialmente reabsorbidas durante ciclos previos de remodelado óseo por la unidad multicelular básica (BMU)."
  - id: m1_2_e6
    formato: opcion_multiple
    enunciado: "Una alteración compromete los conductos transversales u oblicuos del hueso cortical, pero no destruye directamente los conductos longitudinales centrales de las osteonas. ¿Qué consecuencia es la más coherente con la organización vascular?"
    opciones:
      - id: a
        texto: "Se interrumpiría exclusivamente la difusión de nutrientes desde la médula hacia las trabéculas."
      - id: b
        texto: "Se perdería principalmente el límite entre las osteonas y la matriz intersticial."
      - id: c
        texto: "Desaparecería la organización de las laminillas concéntricas alrededor de los conductos centrales."
      - id: d
        texto: "Se comprometerían las conexiones vasculares entre los conductos de Havers y las regiones periostal, endostal y medular."
    correcta: d
    explicacion: "Conductos Transversales de Volkmann: Son canales vasculares transversales u oblicuos que atraviesan el hueso cortical, conectan los conductos de Havers y establecen la comunicación vascular entre el periostio, el endostio y la cavidad medular."
  - id: m1_2_e7
    formato: opcion_multiple
    enunciado: "En el tejido óseo, las señales nerviosas simpáticas y sensitivas pueden influir de manera diferente en las células madre esqueléticas. Según el documento, ¿cuál afirmación describe mejor esta relación?"
    opciones:
      - id: a
        texto: "Ambos tipos de inervación inhiben la formación ósea y disminuyen la capacidad de reparación."
      - id: b
        texto: "La inervación simpática favorece la formación ósea, mientras que la sensitiva inhibe la actividad de las células madre esqueléticas."
      - id: c
        texto: "La señalización simpática se relaciona con la disminución del potencial osteogénico, mientras que la sensitiva se asocia con la promoción de esta capacidad."
      - id: d
        texto: "La inervación simpática y sensitiva participan exclusivamente en la regulación del dolor, sin influir en la actividad celular ósea."
    correcta: c
    explicacion: "La señalización simpática se ha relacionado con la inhibición de la autorrenovación y del potencial osteogénico de las células madre esqueléticas, mientras que la señalización sensitiva se asocia con la promoción de estas capacidades."
  - id: m1_2_e8
    formato: opcion_multiple
    enunciado: "Un paciente presenta una fractura mandibular que requiere reducción y fijación. Durante el procedimiento, un segmento óseo sufre una lesión que compromete parte de su irrigación sanguínea. Aunque la estructura mineralizada del segmento permanece inicialmente conservada, el aporte vascular se encuentra disminuido. Teniendo en cuenta la organización de la cortical y del tejido trabecular, ¿cuál de las siguientes afirmaciones explica mejor cómo podría influir esta lesión en el tejido óseo?"
    opciones:
      - id: a
        texto: "El segmento mantendrá su actividad celular normal porque la matriz mineralizada conserva su estructura, incluso si disminuye el aporte de oxígeno y nutrientes."
      - id: b
        texto: "La disminución de la irrigación podría comprometer la actividad y la supervivencia de las células óseas, ya que la matriz mineralizada por sí sola no garantiza el aporte de oxígeno y nutrientes."
      - id: c
        texto: "El tejido trabecular será necesariamente el más afectado, porque sus espacios medulares impiden la difusión de nutrientes hacia los osteocitos."
      - id: d
        texto: "La cortical conservará su viabilidad siempre que permanezcan intactos los conductos de Havers, aunque se pierdan todas las conexiones vasculares con otras regiones del hueso."
    correcta: b
    explicacion: "La matriz mineralizada proporciona soporte estructural, pero el tejido óseo también depende de su vascularización para recibir oxígeno y nutrientes y mantener la actividad celular. Por ello, conservar la estructura del segmento no garantiza que sus células continúen funcionando normalmente cuando se compromete el aporte sanguíneo."
```

### Seccion 1.3: La materia que constituye el hueso

id "m1_3_materia"

#### Pendientes PDF

- PENDIENTE PDF: Imagen #1, título «Matriz extracelular ósea». Indicación: «Aquí se usará esta misma imagen de fondo» (la Imagen #1 de 1.2). Su texto («La matriz extracelular ósea es…») tiene unos 790 caracteres y no cabe en la entrada de la sección (`resumen`, máximo 600 en el esquema): va como primer bloque de texto. Si se quiere en el panel de la portada, hay que subir el límite de `resumen` en `apps/web/src/content/schema.ts`.
- PENDIENTE PDF: Imagen #2, «Fase orgánica». Indicación para «Colágeno tipo I»: «usando la misma imagen anterior, solo que cambien los cuadros de texto».
- PENDIENTE PDF: Imagen #3, «Fase inorgánica».
- «Conceptos clave»: «Esto iría en algún recuadro al final» → aviso al final de la sección.
- Actividad conservada: «Actividad 1. Conservemos esta actividad tal cual» = `m1_3_relacion_matriz`.
- Evaluación: el PDF dice «De este banco de preguntas del 1 al 5, colocar solo 3 preguntas y de 6 a 8 completas», pero en esta sección solo hay 4 preguntas: van las 4 (consultar al docente).

#### Contenido

**Matriz extracelular ósea**

La matriz extracelular ósea es una estructura tridimensional que rodea a las células y constituye la mayor parte del tejido óseo; determina sus propiedades biomecánicas, participa en la homeostasis mineral y regula el microambiente celular. Está compuesta por una fase orgánica, una fase inorgánica mineral y una fracción acuosa con iones disueltos, cuya interacción configura un material compuesto multifásico; el colágeno tipo I aporta flexibilidad y tenacidad, mientras que la apatita biológica confiere rigidez y resistencia a la compresión. Además, la matriz actúa como reservorio de factores bioactivos y presenta propiedades viscoelásticas, por lo que su composición y organización influyen tanto en la respuesta mecánica como en la actividad celular.

**Fase orgánica**

La fracción orgánica representa aproximadamente el 30 % del peso seco de la matriz ósea; está constituida principalmente por colágeno tipo I y, en menor proporción, por proteínas no colágenas y proteoglucanos. Estos componentes conforman una red estructural que organiza la matriz, regula las interacciones celulares y participa en el control de la mineralización.

**1. Colágeno tipo I**

El colágeno tipo I constituye cerca del 90 % de la matriz orgánica ósea y es el principal componente fibrilar responsable de su resistencia a la tensión y tenacidad. Está formado por dos cadenas α1(I) y una α2(I), codificadas por COL1A1 y COL1A2, cuya organización en una triple hélice y posterior ensamblaje fibrilar genera una red estructural altamente organizada; esta red actúa como andamiaje para la incorporación del mineral y proporciona soporte a las proteínas no colágenas y a las interacciones célula–matriz.

**2. Proteínas no colágenas**

Las proteínas no colágenas representan una fracción minoritaria de la matriz orgánica ósea; participan en la organización fibrilar, la adhesión celular y la regulación de la mineralización. Se pueden agrupar según su estructura y función:

*1. Familia SIBLING (Small Integrin-Binding Ligand, N-linked Glycoprotein)*

- **Osteopontina:** Glicofosfoproteína ácida con residuos fosforilados y motivo RGD, que media la adhesión celular mediante integrinas como αvβ3. Su carga negativa y estado de fosforilación le permiten modular el crecimiento y la organización del mineral.
- **Sialoproteína ósea:** Glicoproteína con motivos RGD (arginina-glicina-ácido aspártico) y regiones ricas en glutamato; presenta afinidad por la hidroxiapatita y favorece la nucleación mineral en determinados contextos.
- **DMP1 (Dentine Matrix Protein 1):** Proteína fosforilada implicada en la maduración de los osteocitos, la regulación del fosfato y la mineralización de la matriz.

*2. Proteínas con residuos de ácido γ-carboxiglutámico (Gla)*

- **Osteocalcina:** Proteína sintetizada principalmente por osteoblastos y también por osteocitos; su γ-carboxilación, dependiente de vitamina K, favorece su unión al calcio y a la hidroxiapatita, participando en las interacciones entre la matriz orgánica y la fase mineral.

*3. Proteoglucanos pequeños ricos en leucina (SLRPs)*

- **Decorina y biglicano:** Proteoglucanos asociados a fibrillas de colágeno, con cadenas de glucosaminoglucanos (GAG); regulan la fibrilogénesis, el diámetro fibrilar y las interacciones entre los componentes de la matriz.

**Fase inorgánica**

La fase inorgánica constituye el componente mineral de la matriz extracelular ósea; está formada principalmente por nanocristales de apatita biológica, responsables de gran parte de la dureza, rigidez y resistencia a la compresión del hueso. Además, actúa como reservorio de calcio y fosfato, contribuyendo a la homeostasis mineral.

***Organización cristalina:*** el mineral se organiza en plaquetas nanométricas distribuidas tanto en el interior de las fibrillas de colágeno (mineral intrafibrilar) como en los espacios entre ellas (mineral extrafibrilar); esta asociación con la matriz orgánica contribuye a la resistencia mecánica del tejido. A diferencia de la hidroxiapatita pura, la apatita biológica presenta una estructura menos ordenada y una composición variable, características que favorecen el intercambio de iones con el medio extracelular.

La composición detallada, las sustituciones iónicas y la formación de los cristales se desarrollarán en el módulo de mineralización ósea.

> Recuerda: **Osteoide (matriz orgánica no mineralizada).** Matriz extracelular recién sintetizada y secretada por los osteoblastos, compuesta principalmente por colágeno tipo I y proteínas no colágenas, que constituye el sustrato orgánico sobre el cual se deposita el mineral óseo.
>
> **Matriz ósea mineralizada.** Matriz extracelular en la que la fase orgánica se encuentra asociada a cristales de apatita biológica, cuya integración con el colágeno y los demás componentes matriciales confiere al tejido su rigidez y resistencia mecánica.

#### Actividades

##### Actividad m1_3_relacion_matriz

```yaml
tipo: relacion-columnas
titulo: "Componentes de la matriz y su papel"
instrucciones: "Une cada componente de la matriz con lo que aporta o hace. Toca uno de cada columna (o arrastra; con teclado, Enter para elegir y flechas para moverte). Una descripción de la derecha no corresponde a ningún componente."
obligatoria: true
puntaje_max: 20
concepto: "Composición de la matriz ósea"
retroalimentacion:
  acierto: "Correcto. La hidroxiapatita aporta dureza, el colágeno tipo I flexibilidad y las proteínas no colágenas regulan la mineralización y la comunicación con las células."
  error: "Alguna unión falla. Recuerda: el mineral resiste la compresión, el colágeno resiste la tracción, y el hueso no tiene fibras elásticas como una arteria."
# 2026-10-25: conservada tal cual a petición del docente (PDF 1.3: «Conservemos esta actividad tal cual»).
izquierda:
  - id: c_hidroxiapatita
    texto: "Hidroxiapatita"
  - id: c_colageno
    texto: "Colágeno tipo I"
  - id: c_osteocalcina
    texto: "Osteocalcina"
  - id: c_osteopontina
    texto: "Osteopontina"
  - id: c_factores
    texto: "Factores de crecimiento almacenados (TGF-β, IGF, BMP)"
derecha:
  - id: r_hidroxiapatita
    texto: "Cristales de fosfato de calcio que dan dureza y resistencia a la compresión."
  - id: r_colageno
    texto: "Proteína fibrilar que forma la mayor parte de la matriz orgánica y da flexibilidad y resistencia a la tracción."
  - id: r_osteocalcina
    texto: "Proteína no colágena más abundante, sintetizada por los osteoblastos, que se une al calcio."
  - id: r_osteopontina
    texto: "Proteína de adhesión que ancla al osteoclasto a la matriz y regula la mineralización."
  - id: r_factores
    texto: "Señales guardadas en la matriz que se liberan cuando el hueso se reabsorbe y estimulan la formación de hueso nuevo."
  - id: r_distractor_elastina
    texto: "Fibras elásticas que permiten al hueso estirarse mucho y recuperar su forma."
pares:
  - izquierda: c_hidroxiapatita
    derecha: r_hidroxiapatita
  - izquierda: c_colageno
    derecha: r_colageno
  - izquierda: c_osteocalcina
    derecha: r_osteocalcina
  - izquierda: c_osteopontina
    derecha: r_osteopontina
  - izquierda: c_factores
    derecha: r_factores
```

##### Actividad m1_3_evaluacion

```yaml
tipo: quiz
titulo: "Evaluación"
instrucciones: "Responde cada pregunta. Al elegir tu respuesta verás enseguida si es correcta y por qué."
obligatoria: true
puntaje_max: 40
concepto: "Matriz extracelular ósea"
retroalimentacion:
  acierto: "Muy bien. Respondiste correctamente la evaluación de la sección."
  error: "Revisa la explicación de cada pregunta y vuelve a leer la sección."
preguntas:
  - id: m1_3_e1
    formato: opcion_multiple
    enunciado: "¿Cuál afirmación describe mejor la contribución de las fases orgánica e inorgánica a las propiedades mecánicas del hueso?"
    opciones:
      - id: a
        texto: "La fase orgánica aporta principalmente rigidez a la compresión, mientras que la fase mineral proporciona flexibilidad y tenacidad."
      - id: b
        texto: "La fase orgánica contribuye a la resistencia a la tensión y la tenacidad, mientras que la fase mineral aporta rigidez y resistencia a la compresión."
      - id: c
        texto: "Ambas fases cumplen funciones mecánicas idénticas, por lo que su proporción relativa no influye en el comportamiento del tejido."
      - id: d
        texto: "La fase acuosa es la principal responsable de la rigidez, mientras que el colágeno y el mineral cumplen una función estructural secundaria."
    correcta: b
    explicacion: "El colágeno tipo I aporta resistencia a la tensión y tenacidad; la apatita biológica contribuye a la rigidez y resistencia a la compresión."
  - id: m1_3_e2
    formato: opcion_multiple
    enunciado: "Un estudiante observa una matriz extracelular recién sintetizada por los osteoblastos, compuesta principalmente por colágeno tipo I y proteínas no colágenas, pero que todavía no presenta mineralización. ¿Cómo debe denominarse?"
    opciones:
      - id: a
        texto: "Matriz ósea mineralizada."
      - id: b
        texto: "Matriz trabecular."
      - id: c
        texto: "Osteoide."
      - id: d
        texto: "Línea de cemento."
    correcta: c
    explicacion: "El osteoide es la matriz orgánica recién sintetizada y secretada por los osteoblastos, antes de su mineralización."
  - id: m1_3_e3
    formato: opcion_multiple
    enunciado: "En una matriz ósea experimental se identifica una alteración que dificulta la organización y el ensamblaje de las fibrillas de colágeno tipo I. ¿Cuál de las siguientes funciones podría verse afectada más directamente?"
    opciones:
      - id: a
        texto: "La organización de la red fibrilar que sirve de soporte para la incorporación del mineral."
      - id: b
        texto: "La formación de los conductos vasculares que atraviesan las osteonas."
      - id: c
        texto: "La producción de los cristales minerales exclusivamente por los osteoclastos."
      - id: d
        texto: "La regulación de la perfusión sanguínea por las fibras nerviosas simpáticas."
    correcta: a
    explicacion: "Las fibrillas de colágeno constituyen un andamiaje estructural para la incorporación del mineral y para las interacciones entre los componentes de la matriz. Las demás opciones corresponden a procesos o estructuras diferentes."
  - id: m1_3_e4
    formato: opcion_multiple
    enunciado: "En una actividad de laboratorio, se comparan dos modelos simplificados de matriz ósea. El primero contiene una red orgánica bien representada, pero una cantidad reducida de mineral; el segundo presenta abundante componente mineral, pero una representación limitada de la fase orgánica. Sin asumir que alguno de los modelos reproduce por completo el comportamiento de un hueso real, ¿cuál conclusión se deriva mejor de lo estudiado?"
    opciones:
      - id: a
        texto: "El primer modelo necesariamente tendrá mayor resistencia a todo tipo de fuerza, porque la fase orgánica determina todas las propiedades mecánicas."
      - id: b
        texto: "El segundo modelo necesariamente tendrá mayor resistencia a todo tipo de fuerza, porque una mayor cantidad de mineral garantiza una mejor respuesta mecánica global."
      - id: c
        texto: "Ambos modelos deberían presentar las mismas propiedades mecánicas, porque la fase orgánica y la inorgánica son intercambiables."
      - id: d
        texto: "Los dos modelos podrían presentar comportamientos mecánicos diferentes, porque la resistencia del hueso depende de la contribución complementaria de las fases orgánica e inorgánica."
    correcta: d
    explicacion: "El hueso es un material compuesto. La fase orgánica y la mineral aportan propiedades distintas, de modo que una alteración en su representación puede modificar el comportamiento mecánico global. No es posible determinar cuál modelo será superior en todos los aspectos con la información proporcionada."
```

### Seccion 1.4: Biomecánica del hueso

id "m1_4_biomecanica"

#### Entrada

El hueso está sometido continuamente a cargas derivadas del peso corporal, la gravedad, la contracción muscular y las fuerzas externas; su magnitud, dirección, punto de aplicación y duración determinan cómo se distribuyen las cargas en el tejido y la respuesta mecánica que generan, por lo que durante actividades como caminar, correr o masticar estas fuerzas suelen actuar de manera simultánea y combinada, más que de forma aislada.

#### Pendientes PDF

- PENDIENTE PDF: Imagen #1, «El hueso frente a las cargas mecánicas» (apertura; su texto es la «Entrada»). Indicación: «Aquí se usará esta misma imagen de fondo».
- PENDIENTE PDF: Imágenes #2 y #3, «Cargas solitarias: Compresión y tracción o tensión». Pie de la #3: «Distribución de las fuerzas de tensión y compresión en una fractura mandibular». Indicación: «Poner ambas imágenes una al lado de la otra y el texto puede ser en la parte inferior o donde se vea mejor».
- PENDIENTE PDF: Imagen #4, «Cargas combinadas: Flexión, torsión y cizallamiento».
- PENDIENTE PDF: Imagen #5, «Cargas estáticas vs. cargas dinámicas». Indicación: «Aquí puede ir el texto de cada una en la parte superior o inferior».
- PENDIENTE PDF: Imagen #6, «Propiedades mecánicas del tejido óseo: curva típica de esfuerzo-deformación del hueso cortical».
- PENDIENTE PDF: Imagen #7, «Comportamiento mecánico del hueso cortical y trabecular». Crédito: «Fuente: Lin y Kang (2021), figura 1, adaptada de Çehreli (2012)».
- PENDIENTE PDF: Imagen #8 (el PDF repite el título «Comportamiento mecánico del hueso cortical y trabecular»). Indicación: «Cada punto debe poderse seleccionar en orden y que salga el cuadrito con esta información de abajo» (las 13 propiedades). Mientras tanto, lista.
- PENDIENTE PDF: Imagen #9, «Adaptación ósea a las cargas mecánicas: ley de Wolff». Indicación: «no se si se pueda hacer lo mismo de esta actividad pero pues con esta imagen y estas definiciones y títulos» (la multicapa anterior del fémur, «Las trabéculas siguen la carga», con la imagen del docente). Queda para la fase de imágenes.
- PENDIENTE PDF: Imagen #10, «Teoría mecanostática de Frost» (tabla de rangos de deformación en la imagen).
- PENDIENTE PDF: Imagen #11, «Bases estructurales de la resistencia ósea»; Imagen #12, «Modelado y remodelado»; Imagen #13, «Microdaño y fallo mecánico»; Imagen #14, «Fractura por sobrecarga aguda vs. cargas repetitivas»; Imagen #15, «Detección molecular y señalización del microdaño».
- «En un cuadro poner esto al final» (relevancia en el hueso mandibular) → aviso. «Concepto clave» → aviso con ese título.
- «Y aqui podrían ir estos ejemplos en odontología, que ya están en la página» → se conservan los «Ejemplos en la mandíbula» y el aviso «Recuerda» de la versión anterior.
- Actividad conservada: «Actividad 1. Mantener esta actividad» = `m1_5_wolff_casos`.
- PENDIENTE PDF: Actividad 2 «¿El hueso se recupera o se fractura?». Necesita un componente nuevo (marcador que se arrastra sobre una curva esfuerzo–deformación). Texto completo del docente: «Nivel: Intermedio. Tipo: Interpretación + toma de decisiones. Interacción: Arrastrar un marcador sobre una curva esfuerzo–deformación y resolver escenarios. ¿Qué debe hacer el estudiante? Se presenta una curva esfuerzo–deformación del hueso con tres zonas principales: 1. Región elástica → 2. Región plástica → 3. Fallo/fractura. El estudiante debe mover un marcador hasta el punto indicado en cada escenario y responder: Si retiramos la carga en este punto, ¿qué ocurrirá con el hueso? Escenario 1 — Carga dentro de la región elástica. Situación: Durante una actividad cotidiana, el hueso recibe una carga que produce una deformación pequeña, ubicada antes del límite elástico. Pregunta: Si la carga desaparece, ¿qué esperas que ocurra? Respuesta correcta: ✅ El hueso recuperará aproximadamente su forma original. Retroalimentación: Estás dentro de la región elástica. La deformación producida es reversible; al retirar la carga, el tejido recupera su configuración inicial, siempre que no exista daño estructural. Escenario 2 — Cerca del límite elástico. Situación: Una carga aumenta progresivamente y el hueso se encuentra muy cerca del límite elástico, pero todavía no lo ha superado. Pregunta: ¿Qué ocurrirá al retirar la carga? Respuesta correcta: ✅ Principalmente recuperará su forma original, aunque está próximo al límite a partir del cual podrían aparecer deformaciones permanentes. Retroalimentación: El tejido todavía se encuentra en el comportamiento elástico, pero una carga adicional podría llevarlo hacia la deformación plástica. (Nota del docente: esto es importante porque evita enseñar al estudiante que "límite elástico = fractura", que sería incorrecto.) Escenario 3 — Se supera el límite elástico. Situación: Un traumatismo produce una carga que lleva al hueso más allá de su límite elástico, pero todavía no alcanza el punto de fallo. Pregunta: Al retirar la carga, ¿el hueso volverá completamente a su forma inicial? Respuesta correcta: ❌ No. Quedará una deformación permanente. Retroalimentación: Has entrado en la región plástica. Parte de la deformación ya no es reversible; aunque retires la carga, el tejido no recuperará completamente su configuración original. Escenario 4 — Cerca del fallo. Situación: La carga continúa aumentando y el hueso se encuentra próximo a su resistencia máxima. Pregunta: ¿Cuál es el principal riesgo si la carga continúa aumentando? Respuesta correcta: ⚠️ La progresión del daño hasta el fallo estructural y la fractura. Retroalimentación: El tejido está próximo a su límite de resistencia. La deformación y el daño aumentan hasta que la estructura pierde su capacidad de soportar la carga. Escenario 5 — Se alcanza el fallo. Situación: La carga supera la capacidad resistente del hueso y se alcanza el punto de fallo de la curva. Pregunta: ¿Qué ocurre si retiramos inmediatamente la carga? Respuesta correcta: ❌ El hueso no recuperará su integridad estructural; se ha producido el fallo/fractura. Retroalimentación: El retiro de la carga no revierte el daño estructural establecido. El tejido ha superado su capacidad resistente.»
- La pregunta 5 de la evaluación no trae justificación: la explicación es la frase del «Concepto clave» que la responde.

#### Contenido

**Cargas solitarias: Compresión y tracción o tensión**

- **Compresión:** fuerzas de igual magnitud aplicadas hacia el interior del hueso y sobre un mismo eje, que tienden a acortar y ensanchar la estructura; es predominante en los cuerpos vertebrales y la diáfisis de los huesos largos durante la bipedestación. El tejido óseo presenta su mayor resistencia mecánica frente a la compresión, favorecida por la rigidez de su fase mineral.
- **Tracción o tensión:** fuerzas paralelas aplicadas en sentidos opuestos hacia el exterior, que tienden a elongar y estrechar el tejido; se presenta principalmente en las inserciones tendinosas y ligamentosas, como el tubérculo del cuádriceps. Su resistencia depende en gran medida de la orientación longitudinal de las fibrillas de colágeno tipo I y de sus enlaces cruzados covalentes.

**Cargas combinadas: Flexión, torsión y cizallamiento**

- **Flexión:** Combinación de fuerzas que curva el hueso, generando compresión en el lado cóncavo y tracción en el convexo; como el hueso presenta menor resistencia a la tracción que a la compresión, las fracturas por flexión pura suelen iniciarse en el lado convexo, sometido a tensión.
- **Torsión:** Se produce cuando un momento de giro actúa sobre el eje longitudinal del hueso, generando esfuerzos cortantes distribuidos helicoidalmente y favoreciendo la aparición de la clásica fractura espiroidea.
- **Cizallamiento o esfuerzo cortante:** Ocurre cuando fuerzas paralelas y opuestas tienden a desplazar un plano del tejido respecto a otro; el hueso presenta su menor resistencia mecánica frente al cizallamiento, por lo que este tipo de carga resulta especialmente relevante en determinados mecanismos de fractura.

**Cargas estáticas vs. cargas dinámicas**

- **Cargas estáticas:** Aplicación de una fuerza constante y sostenida en el tiempo; las cargas prolongadas reducen la respuesta celular y, al disminuir el flujo del fluido pericelular, no constituyen un estímulo eficaz para la formación ósea ni el remodelado adaptativo.
- **Cargas dinámicas y cíclicas:** Fuerzas variables caracterizadas por su frecuencia, magnitud y, especialmente, por la tasa de deformación (strain rate); generan desplazamiento del fluido pericelular en el sistema lacunocanalicular, constituyendo un estímulo fundamental para la mecanotransducción y el mantenimiento de la masa ósea.

**Propiedades mecánicas del tejido óseo**

*Curva típica de esfuerzo-deformación del hueso cortical*

- **Región elástica:** El hueso se deforma de manera reversible ante la carga y recupera aproximadamente su forma original cuando ésta se retira.
- **Región plástica:** La deformación aumenta de forma irreversible, con acumulación de microdaño y alteraciones de la matriz hasta alcanzar el fallo.

**Comportamiento mecánico del hueso cortical y trabecular**

La imagen compara el comportamiento mecánico del hueso cortical y trabecular mediante sus curvas esfuerzo-deformación, evidenciando diferencias determinadas por su densidad y arquitectura. El hueso cortical, más denso y menos poroso, soporta esfuerzos elevados, de hasta aproximadamente 150 MPa, con una deformación menor, cercana al 3 %, antes de la falla; en contraste, el hueso trabecular, debido a su estructura porosa y trabeculada, soporta esfuerzos menores, de hasta aproximadamente 50 MPa, pero admite deformaciones mucho mayores, que pueden alcanzar aproximadamente el 50 % antes de la falla.

- **Resistencia mecánica:** Capacidad para soportar esfuerzos antes de alcanzar la fluencia o la falla.
- **Rigidez:** Capacidad para resistir la deformación ante una carga; depende de las propiedades del material y, a escala estructural, de la geometría del hueso.
- **Elasticidad:** Capacidad para recuperar la forma original después de retirar la carga, siempre que no se haya superado el rango elástico.
- **Plasticidad:** Capacidad para experimentar deformación permanente cuando la carga supera el límite elástico, sin que ocurra inmediatamente la fractura.
- **Ductilidad:** Capacidad para experimentar deformación plástica antes de la fractura; un material más dúctil puede deformarse más antes de fallar.
- **Tenacidad:** Capacidad para absorber energía mecánica antes de la fractura, determinada por el área total bajo la curva esfuerzo-deformación hasta la falla.
- **Resiliencia:** Capacidad para absorber y almacenar energía dentro del rango elástico, sin generar deformación permanente.
- **Fragilidad:** Tendencia a fracturarse con poca deformación plástica, por lo que presenta una capacidad limitada para disipar energía antes de la falla.
- **Resistencia a la fractura:** Capacidad para resistir la iniciación y, especialmente, la propagación de grietas; es fundamental para comprender por qué el hueso puede tolerar defectos y microfisuras sin fracturarse inmediatamente.
- **Resistencia a la fatiga:** Capacidad para soportar cargas cíclicas repetidas sin acumular daño suficiente para producir una fractura por fatiga.
- **Viscoelasticidad:** Comportamiento mecánico dependiente del tiempo, en el que la respuesta del hueso combina componentes elásticos y viscosos; por ello, la deformación depende de la magnitud, velocidad y duración de la carga.
- **Anisotropía:** Propiedad por la cual las características mecánicas del hueso varían según la dirección de aplicación de la carga, como consecuencia de su organización jerárquica y de la orientación del colágeno y las estructuras mineralizadas.
- **Dureza:** Resistencia del tejido frente a la deformación localizada o penetración; refleja principalmente la contribución de la fase mineral y puede evaluarse mediante técnicas de indentación.

**Adaptación ósea a las cargas mecánicas**

***Ley de Wolff.*** La ley de Wolff establece que la arquitectura del tejido óseo se adapta a las demandas mecánicas habituales, modificando la distribución y orientación del tejido en respuesta a las cargas que recibe. La formación y resorción ósea ajustan progresivamente la arquitectura cortical y trabecular, favoreciendo una organización capaz de resistir y distribuir las cargas con un uso eficiente de la masa ósea.

***Ejemplo:*** las trabéculas de la cabeza femoral se orientan siguiendo, en parte, las principales trayectorias de carga generadas durante la bipedestación y la marcha, contribuyendo a distribuir las fuerzas hacia el cuello y la diáfisis femoral.

**Teoría mecanostática de Frost**

La ley mecanostática de Frost establece que el hueso adapta su masa y arquitectura a las deformaciones mecánicas (strain) que experimenta, de modo que estímulos por debajo o dentro de determinados umbrales favorecen la resorción o el mantenimiento, mientras que deformaciones superiores pueden estimular la formación y adaptación ósea; una sobrecarga excesiva puede generar microdaño y activar mecanismos reparativos.

**Bases estructurales de la resistencia ósea**

La respuesta biomecánica del hueso es el resultado de la integración entre la composición de la matriz extracelular y la organización estructural del tejido, descritas en los submódulos anteriores. Esta interacción determina su capacidad para soportar cargas, distribuir esfuerzos y resistir la fractura, constituyendo la base para comprender cómo el hueso adapta su estructura a las demandas mecánicas.

**Modelado y remodelado: Cómo cambia el tejido**

- **Modelado óseo:** Proceso mediante el cual la formación y la resorción ocurren de manera independiente y pueden desarrollarse en superficies óseas diferentes; permite modificar progresivamente la forma, geometría y dimensiones del hueso en respuesta a las demandas mecánicas y durante el crecimiento.
- **Remodelado óseo:** Proceso cíclico de renovación del tejido preexistente, en el que la resorción osteoclástica es seguida por formación osteoblástica en un sitio estrechamente acoplado; permite sustituir tejido envejecido o microdañado, mantener la integridad estructural y contribuir a la homeostasis mineral.

Ambos procesos participan en la respuesta del hueso a las demandas mecánicas, pero mediante mecanismos diferentes; el modelado modifica la arquitectura y la geometría del hueso, mientras que el remodelado renueva el tejido existente, por lo que su contribución relativa depende de la edad, el sitio anatómico y las condiciones mecánicas.

**Microdaño y fallo mecánico**

La fatiga ósea es el deterioro progresivo de la integridad mecánica producido por cargas cíclicas repetidas, incluso cuando cada ciclo permanece por debajo de la resistencia última del tejido; la acumulación de ciclos favorece la iniciación y propagación del microdaño, en función de la magnitud y frecuencia de las cargas, las características estructurales del hueso y su capacidad de reparación. El microdaño óseo comprende microfisuras lineales, habitualmente de 10–100 µm de longitud, y alteraciones difusas de la matriz mineralizada. Su acumulación y progresión pueden comprometer la integridad mecánica del tejido y activar mecanismos de reparación mediante el remodelado óseo.

**Fractura por sobrecarga aguda vs. cargas repetitivas**

- **Fractura por sobrecarga aguda:** Ocurre cuando una carga única supera la resistencia estructural del hueso, como durante un traumatismo de alta energía.
- **Fractura por fatiga:** Aparece cuando las cargas repetitivas inducen microdaño cuya acumulación y propagación superan la capacidad de reparación, hasta producir una discontinuidad macroscópica.

**Detección molecular y señalización del microdaño**

Los osteocitos próximos a las microfisuras pueden experimentar alteraciones del sistema lacunocanalicular y apoptosis; las células vecinas supervivientes modifican su señalización, con aumento de RANKL y VEGF y reducción de OPG en modelos experimentales de fatiga ósea. Este cambio favorece el reclutamiento osteoclástico y la activación del remodelado localizado.

La respuesta osteocítica también se relaciona con vías mecanosensoras y reguladoras como integrinas–FAK, PI3K–AKT y Wnt/β-catenina; su participación depende del contexto, por lo que no deben interpretarse como una cascada única y obligatoria del microdaño.

> Clinico: Este principio es relevante para comprender la respuesta del hueso mandibular ante la sobrecarga funcional, el bruxismo y determinadas condiciones de rehabilitación implantosoportada, aunque la asociación clínica debe interpretarse según el contexto biomecánico y biológico de cada caso.

> Recuerda: El hueso no se comporta solo por lo que está hecho, sino también por cómo está organizado. Sus propiedades mecánicas dependen tanto de la composición y microestructura de la matriz como de la arquitectura cortical y trabecular, incluyendo el espesor cortical, la orientación y conectividad de las trabéculas y su distribución regional; por ello, dos sitios con propiedades materiales similares pueden presentar respuestas mecánicas diferentes frente a una misma carga, debido a las características de su organización estructural.

**Ejemplos en la mandíbula**

- **Pérdida de un diente.** Sin diente, el hueso alveolar deja de recibir la carga que le transmitía el ligamento periodontal y se reabsorbe. Tras una extracción, la pérdida ocurre en dos fases. En los primeros meses se reabsorbe con rapidez el hueso alveolar propio, que depende del diente, junto con el remodelado de cicatrización: ahí se pierde la mayor parte del ancho del reborde. A largo plazo, la falta de carga mantiene la pérdida. En algunos estudios el ancho llega a disminuir cerca de la mitad en el primer año.
- **Ortodoncia.** Una fuerza controlada sobre un diente comprime el ligamento periodontal de un lado y lo estira del otro. El estímulo llega al hueso a través del ligamento: se reabsorbe hueso alveolar en el lado comprimido y se forma hueso nuevo en el lado traccionado, y el diente se mueve a través del hueso. Es un remodelado dirigido, no una simple aplicación de "más carga, más hueso".
- **Implantes.** Un implante osteointegrado transmite las cargas masticatorias al hueso, que vuelve a recibir estímulo mecánico y puede ayudar a conservar su masa. Una carga excesiva, en cambio, puede dañar el hueso de alrededor.

> Recuerda: el hueso es un tejido vivo que se adapta a la carga. Lo que se usa se conserva; lo que deja de usarse tiende a perderse.

#### Actividades

##### Actividad m1_5_wolff_casos

```yaml
tipo: relacion-columnas
titulo: "Aplica la ley de Wolff"
instrucciones: "Une cada situación con la respuesta esperada del hueso. Toca una de cada columna (o arrastra; con teclado, Enter para elegir y flechas para moverte). Una respuesta de la derecha es incorrecta para todas las situaciones."
obligatoria: true
puntaje_max: 20
concepto: "Ley de Wolff"
retroalimentacion:
  acierto: "Correcto. El hueso remodela según cómo cambia la carga. Si aumenta de forma fisiológica, se refuerza (tenista, implante). Si falta, se pierde (astronauta, extracción). Si cambia de dirección, se reorganiza: en ortodoncia se reabsorbe en el lado comprimido del ligamento y se forma hueso en el lado traccionado."
  error: "Alguna unión no es correcta. Pregúntate si en cada situación la carga sobre el hueso aumenta, disminuye o cambia de dirección."
# 2026-10-25: conservada a petición del docente (PDF 1.4: «Actividad 1. Mantener esta actividad»).
izquierda:
  - id: w_astronauta
    texto: "Un astronauta pasa meses en microgravedad"
  - id: w_tenista
    texto: "El brazo dominante de un tenista profesional"
  - id: w_extraccion
    texto: "Se pierde un molar inferior y no se reemplaza"
  - id: w_ortodoncia
    texto: "Se aplica una fuerza ortodóncica controlada sobre un diente"
  - id: w_implante
    texto: "Un implante osteointegrado recibe carga masticatoria adecuada"
derecha:
  - id: v_astronauta
    texto: "Pérdida de masa ósea en los huesos que soportan peso, por disminución de la carga."
  - id: v_tenista
    texto: "Mayor grosor cortical y mayor densidad ósea que en el brazo no dominante."
  - id: v_extraccion
    texto: "Reabsorción del hueso alveolar del reborde, porque depende del diente y de la carga que este le transmitía."
  - id: v_ortodoncia
    texto: "Remodelado dirigido a través del ligamento: hueso que se reabsorbe donde comprime y se forma donde tracciona."
  - id: v_implante
    texto: "El hueso de alrededor vuelve a recibir estímulo mecánico, lo que puede ayudar a conservar su masa."
  - id: v_distractor_inerte
    texto: "No hay cambio: el hueso adulto es inerte y no responde a la carga."
pares:
  - izquierda: w_astronauta
    derecha: v_astronauta
  - izquierda: w_tenista
    derecha: v_tenista
  - izquierda: w_extraccion
    derecha: v_extraccion
  - izquierda: w_ortodoncia
    derecha: v_ortodoncia
  - izquierda: w_implante
    derecha: v_implante
```

##### Actividad m1_4_evaluacion

```yaml
tipo: quiz
titulo: "Evaluación"
instrucciones: "Responde cada pregunta. Al elegir tu respuesta verás enseguida si es correcta y por qué."
obligatoria: true
puntaje_max: 50
concepto: "Biomecánica del hueso"
retroalimentacion:
  acierto: "Muy bien. Respondiste correctamente la evaluación de la sección."
  error: "Revisa la explicación de cada pregunta y vuelve a leer la sección."
preguntas:
  - id: m1_4_e1
    formato: opcion_multiple
    enunciado: "En una prueba experimental, se aplica una carga a una muestra ósea y luego se retira. La muestra recupera aproximadamente su forma inicial. ¿Qué propiedad describe mejor este comportamiento?"
    opciones:
      - id: a
        texto: "Plasticidad."
      - id: b
        texto: "Elasticidad."
      - id: c
        texto: "Ductilidad."
      - id: d
        texto: "Fragilidad."
    correcta: b
    explicacion: "La elasticidad es la capacidad de recuperar la forma original después de retirar la carga, siempre que no se haya superado el rango elástico."
  - id: m1_4_e2
    formato: opcion_multiple
    enunciado: "En una reconstrucción de la cabeza femoral se observa que las trabéculas presentan orientaciones relacionadas con las principales trayectorias de carga. ¿Cuál interpretación explica mejor esta organización?"
    opciones:
      - id: a
        texto: "La arquitectura trabecular puede modificarse progresivamente en respuesta a las demandas mecánicas habituales."
      - id: b
        texto: "Las trabéculas se distribuyen al azar y su orientación no tiene relación con las cargas."
      - id: c
        texto: "La orientación trabecular depende exclusivamente de la composición mineral, independientemente de las fuerzas que actúan sobre el hueso."
      - id: d
        texto: "La organización trabecular se establece una vez y no cambia durante la vida del individuo."
    correcta: a
    explicacion: "La ley de Wolff describe la adaptación progresiva de la arquitectura ósea a las demandas mecánicas, mediante cambios en la distribución y orientación del tejido."
  - id: m1_4_e3
    formato: opcion_multiple
    enunciado: "Un corredor aumenta bruscamente su entrenamiento. Durante varias semanas, el hueso recibe cargas repetitivas que individualmente no superan su resistencia última. Finalmente, aparece una fractura. ¿Cuál explicación integra mejor los hallazgos?"
    opciones:
      - id: a
        texto: "Una carga aislada necesariamente superó la resistencia del hueso, por lo que se trata de una fractura por sobrecarga aguda."
      - id: b
        texto: "La repetición de las cargas pudo favorecer la acumulación y propagación del microdaño hasta superar la capacidad de reparación del tejido."
      - id: c
        texto: "La fractura demuestra que el hueso perdió por completo su capacidad de deformación elástica desde el inicio del entrenamiento."
      - id: d
        texto: "Las cargas repetitivas no pueden causar fracturas si cada una permanece por debajo de la resistencia última del hueso."
    correcta: b
    explicacion: "La fatiga ósea puede producirse por acumulación progresiva de microdaño bajo cargas cíclicas repetidas, incluso cuando cada ciclo no supera por sí solo la resistencia última del tejido."
  - id: m1_4_e4
    formato: opcion_multiple
    enunciado: "Dos regiones de un mismo hueso reciben cargas de magnitud semejante. Una tiene una cortical relativamente gruesa y una red trabecular bien organizada para distribuir las fuerzas; la otra presenta menor espesor cortical y una conectividad trabecular diferente. ¿Cuál conclusión puede deducirse mejor?"
    opciones:
      - id: a
        texto: "Ambas regiones deben responder de forma idéntica porque pertenecen al mismo hueso y reciben cargas de magnitud semejante."
      - id: b
        texto: "La región con mayor espesor cortical siempre será más resistente a cualquier tipo de carga, independientemente de su dirección."
      - id: c
        texto: "Las dos regiones pueden responder de manera diferente porque la geometría y la arquitectura tisular modifican la distribución de esfuerzos, incluso cuando las propiedades del material son similares."
      - id: d
        texto: "La respuesta mecánica depende exclusivamente de la orientación de las trabéculas, sin participación de la matriz extracelular."
    correcta: c
    explicacion: "La resistencia ósea depende tanto de las propiedades de la matriz como de la arquitectura cortical y trabecular. La respuesta también depende del tipo y dirección de la carga; por eso, no puede establecerse una superioridad universal a partir de una sola característica estructural."
  - id: m1_4_e5
    formato: opcion_multiple
    enunciado: "Un paciente requiere la colocación de un implante en dos regiones mandibulares. Aunque el tejido óseo de ambos sitios presenta una composición mineral y orgánica similar, una región presenta una cortical más gruesa y una red trabecular más densa y conectada, mientras que la otra presenta menor espesor cortical y una arquitectura trabecular menos desarrollada. ¿Por qué la respuesta mecánica de ambos sitios puede ser diferente?"
    opciones:
      - id: a
        texto: "Porque la composición mineral determina por sí sola el comportamiento mecánico."
      - id: b
        texto: "Porque la arquitectura regional modifica la forma en que el hueso distribuye y transmite las cargas."
      - id: c
        texto: "Porque el hueso trabecular no participa en la transmisión de cargas."
      - id: d
        texto: "Porque las propiedades mecánicas son independientes de la organización estructural."
    correcta: b
    explicacion: "Sus propiedades mecánicas dependen tanto de la composición y microestructura de la matriz como de la arquitectura cortical y trabecular, incluyendo el espesor cortical, la orientación y conectividad de las trabéculas y su distribución regional; por ello, dos sitios con propiedades materiales similares pueden presentar respuestas mecánicas diferentes frente a una misma carga, debido a las características de su organización estructural."
```

## Glosario

- **Hueso:** órgano formado por tejido óseo, médula ósea, periostio, endostio, vasos, nervios y, en las articulaciones, cartílago articular.
- **Tejido óseo:** tejido conjuntivo especializado de origen mesenquimático, con una matriz extracelular organizada que combina una fase orgánica y una fase mineralizada.
- **Matriz extracelular:** material que rodea a las células de un tejido conjuntivo; en el hueso es rígida por su mineral.
- **Osteoide:** matriz extracelular recién sintetizada y secretada por los osteoblastos, compuesta principalmente por colágeno tipo I y proteínas no colágenas, todavía sin mineralizar.
- **Hidroxiapatita:** fosfato de calcio cristalino que forma la fase mineral del hueso; la apatita biológica es menos ordenada y de composición variable.
- **Colágeno tipo I:** proteína fibrilar que forma cerca del 90 % de la matriz orgánica del hueso y le da resistencia a la tensión y tenacidad.
- **Proteínas no colágenas:** fracción minoritaria de la matriz orgánica (osteopontina, sialoproteína ósea, DMP1, osteocalcina, decorina, biglicano) que participa en la organización fibrilar, la adhesión celular y la mineralización.
- **Osteocalcina:** proteína con residuos de ácido γ-carboxiglutámico, sintetizada principalmente por osteoblastos; su γ-carboxilación, dependiente de vitamina K, favorece su unión al calcio y a la hidroxiapatita.
- **FGF23:** factor de crecimiento de fibroblastos 23, producido principalmente por osteocitos y osteoblastos; aumenta la excreción renal de fosfato y reduce la síntesis de calcitriol.
- **Hueso cortical (compacto):** tejido óseo denso que constituye la capa externa de los huesos y representa aproximadamente el 80 % de la masa ósea del esqueleto adulto.
- **Hueso trabecular (esponjoso):** red tridimensional de trabéculas interconectadas con espacios ocupados por médula ósea y vasos; aproximadamente el 20 % de la masa ósea del adulto.
- **Hueso laminar:** hueso cuyas fibras de colágeno se ordenan en laminillas paralelas; es el hueso maduro del adulto.
- **Hueso entretejido:** hueso de fibras de colágeno entrecruzadas al azar, que se forma rápido en el desarrollo y en la reparación.
- **Periostio:** membrana de tejido conjuntivo especializado que recubre la superficie externa del hueso, salvo el cartílago articular y algunas zonas de inserción.
- **Endostio:** revestimiento celular fino y discontinuo que recubre las superficies internas del hueso.
- **Fibras de Sharpey:** fibras de colágeno que penetran en el hueso desde el periostio o el ligamento periodontal y lo anclan.
- **Osteona (sistema de Havers):** unidad estructural del hueso cortical laminar: capas cilíndricas de matriz dispuestas concéntricamente alrededor de un conducto central.
- **Conducto de Havers:** canal central de la osteona, con vasos sanguíneos y fibras nerviosas.
- **Conducto de Volkmann:** canal vascular transversal u oblicuo que conecta los conductos de Havers y comunica el periostio, el endostio y la cavidad medular.
- **Línea cementante:** interfaz fina, muy mineralizada y pobre en colágeno, que delimita cada osteona y marca el límite de la resorción previa.
- **Laguna y canalículo:** cavidad donde vive un osteocito y canales por los que pasan sus prolongaciones.
- **Médula ósea:** tejido blando de la cavidad medular y los espacios trabeculares; puede ser roja (hematopoyética) o amarilla (adiposa).
- **Nicho hematopoyético:** microambiente de la médula ósea, formado por células estromales, endoteliales y perivasculares, que regula a las células madre hematopoyéticas.
- **Epífisis, metáfisis y diáfisis:** extremos articulares, región de transición y cuerpo de un hueso largo.
- **Diploe:** tejido trabecular situado entre las dos tablas corticales de los huesos planos del cráneo.
- **Remodelado óseo:** proceso cíclico de renovación del tejido preexistente, en el que la resorción osteoclástica es seguida por formación osteoblástica en un sitio acoplado.
- **Modelado óseo:** proceso en el que formación y resorción ocurren de manera independiente y modifican la forma, la geometría y las dimensiones del hueso.
- **Vasos tipo H:** subpoblación de la microvasculatura ósea con elevada expresión endotelial de CD31 y endomucina, asociada a regiones de actividad osteogénica.
- **Microdaño óseo:** microfisuras lineales y alteraciones difusas de la matriz mineralizada producidas por cargas, que pueden activar la reparación por remodelado.
- **Ley de Wolff:** principio según el cual la arquitectura del tejido óseo se adapta a las demandas mecánicas habituales.
- **Mecanostato de Frost:** teoría según la cual el hueso adapta su masa y arquitectura a las deformaciones que experimenta, según umbrales.
- **Hueso alveolar propio (lámina cribiforme):** lámina delgada que reviste el alvéolo y recibe las fibras de Sharpey del ligamento periodontal; en la radiografía se ve como lámina dura.

## Referencias

Fuentes citadas por el docente en el documento del módulo y obras estándar de consulta.

1. OpenStax College (2018). *603 Anatomy of Long Bone esp.jpg*. Wikimedia Commons, licencia CC BY-SA 4.0.
2. Tortora GJ, Derrickson BH (2006). *Principles of Anatomy and Physiology*. 11.ª ed., figura 6.4. John Wiley & Sons.
3. Watanabe et al. (2023). *International Journal of Molecular Sciences*, 24(13), 10912, figura 3. Licencia CC BY 4.0.
4. Chen et al. (2026). Regulación simpático-sensorial del nicho de células madre esqueléticas, figura 3. Licencia CC BY 4.0.
5. Lin y Kang (2021), figura 1, adaptada de Çehreli (2012).
6. Ross MH, Pawlina W. *Ross. Histología: Texto y Atlas.* Wolters Kluwer.
7. Mescher AL. *Junqueira. Histología básica: texto y atlas.* McGraw-Hill.
8. Hall JE, Hall ME. *Guyton y Hall. Tratado de fisiología médica.* Elsevier.
9. Bilezikian JP, Martin TJ, Clemens TL, Rosen CJ (eds.). *Principles of Bone Biology.* Academic Press.
10. Nanci A. *Ten Cate. Histología oral: desarrollo, estructura y función.* Elsevier.
11. Wolff J. *Das Gesetz der Transformation der Knochen.* Berlin: A. Hirschwald, 1892.

## Banco de preguntas para el mentor

Preguntas extra, distintas de las del módulo, para reforzar con el estudiante. Cada una lleva su respuesta, su dificultad (1 a 3) y el concepto que refuerza.

1. Pregunta: ¿Qué diferencia hay entre "hueso" y "tejido óseo"?
   - Respuesta: el hueso es un órgano (tejido óseo, médula ósea, periostio, endostio, vasos, nervios y, en las articulaciones, cartílago articular); el tejido óseo es el tejido conjuntivo especializado que forma la mayor parte de ese órgano.
   - Dificultad: 1
   - Concepto: El hueso como tejido conjuntivo especializado
2. Pregunta: ¿Por qué se dice que el hueso es un tejido dinámico?
   - Respuesta: porque mantiene un estado dinámico de adaptación, reparación y renovación mediante el remodelado óseo continuo.
   - Dificultad: 1
   - Concepto: El hueso como tejido conjuntivo especializado
3. Pregunta: ¿Qué hace FGF23 en el riñón?
   - Respuesta: aumenta la excreción renal de fosfato y reduce la síntesis de calcitriol, contribuyendo a la homeostasis mineral.
   - Dificultad: 2
   - Concepto: Regulación endocrina y mineral
4. Pregunta: ¿Cómo contribuye el hueso al equilibrio ácido-base?
   - Respuesta: su matriz mineral es una reserva de carbonato y fosfato que, ante una carga ácida sostenida, ayuda a neutralizar protones; la regulación principal del pH depende de los sistemas tampón, la ventilación y el riñón.
   - Dificultad: 2
   - Concepto: Equilibrio ácido-base
5. Pregunta: ¿Qué componente de la matriz resiste mejor la tensión y cuál la compresión?
   - Respuesta: el colágeno tipo I aporta resistencia a la tensión y tenacidad; la apatita biológica aporta rigidez y resistencia a la compresión.
   - Dificultad: 1
   - Concepto: Composición de la matriz ósea
6. Pregunta: ¿Qué es el osteoide?
   - Respuesta: la matriz extracelular recién sintetizada por los osteoblastos, sobre todo colágeno tipo I y proteínas no colágenas, antes de mineralizarse.
   - Dificultad: 2
   - Concepto: Composición de la matriz ósea
7. Pregunta: Un compañero dice que el hueso trabecular es "inmaduro" porque es esponjoso. ¿Es correcto?
   - Respuesta: no. Trabecular y cortical describen la arquitectura; entretejido y laminar describen la disposición del colágeno. El hueso trabecular de un adulto sano es laminar.
   - Dificultad: 2
   - Concepto: Hueso cortical y trabecular
8. Pregunta: ¿Qué tienen en común y en qué se diferencian los conductos de Havers y los de Volkmann?
   - Respuesta: ambos llevan vasos por la cortical. Los de Havers ocupan el centro de la osteona, con orientación predominantemente longitudinal; los de Volkmann son transversales u oblicuos, conectan los conductos de Havers y comunican el periostio, el endostio y la cavidad medular.
   - Dificultad: 2
   - Concepto: Osteona y conductos de Havers y de Volkmann
9. Pregunta: ¿Por qué la osteona trabecular no necesita un conducto de Havers?
   - Respuesta: porque las trabéculas son delgadas; el oxígeno y los nutrientes llegan por difusión desde los vasos de la médula y del endostio y se distribuyen por la red lacunocanalicular.
   - Dificultad: 3
   - Concepto: Osteona trabecular
10. Pregunta: ¿Qué es la línea de cemento y qué indica?
    - Respuesta: una interfaz fina, muy mineralizada y pobre en colágeno, de 1–2 µm, que delimita cada osteona; marca el límite de la resorción durante la formación de osteonas secundarias.
    - Dificultad: 3
    - Concepto: Osteona y conductos de Havers y de Volkmann
11. Pregunta: ¿Qué diferencia a los vasos tipo H de los tipo L?
    - Respuesta: los tipo H tienen elevada expresión de CD31 y endomucina y se asocian a la actividad osteogénica; los tipo L, con menor expresión, forman redes sinusoidales y sostienen el nicho hematopoyético. Es un modelo experimental, no una clasificación universal.
    - Dificultad: 3
    - Concepto: Microvasculatura ósea
12. Pregunta: ¿Por qué las cargas estáticas no estimulan la formación ósea como las dinámicas?
    - Respuesta: porque una carga sostenida reduce el flujo del fluido pericelular; las cargas dinámicas y cíclicas lo desplazan en el sistema lacunocanalicular y estimulan la mecanotransducción.
    - Dificultad: 2
    - Concepto: Cargas estáticas y dinámicas
13. Pregunta: ¿Por qué una fractura por flexión pura suele empezar en el lado convexo?
    - Respuesta: porque ese lado está sometido a tracción y el hueso resiste menos la tracción que la compresión.
    - Dificultad: 2
    - Concepto: Cargas combinadas
14. Pregunta: ¿Qué diferencia hay entre tenacidad y resiliencia?
    - Respuesta: la tenacidad es la energía que el hueso absorbe hasta la fractura (área total bajo la curva); la resiliencia es la energía que absorbe dentro del rango elástico, sin deformación permanente.
    - Dificultad: 3
    - Concepto: Propiedades mecánicas
15. Pregunta: ¿En qué se diferencian el modelado y el remodelado?
    - Respuesta: en el modelado, formación y resorción son independientes y cambian la forma y la geometría del hueso; en el remodelado, la resorción es seguida por formación acoplada en el mismo sitio y renueva el tejido existente.
    - Dificultad: 2
    - Concepto: Modelado y remodelado
16. Pregunta: ¿Cómo puede producirse una fractura si ninguna carga supera la resistencia del hueso?
    - Respuesta: por fatiga: las cargas cíclicas repetidas acumulan y propagan microdaño hasta superar la capacidad de reparación.
    - Dificultad: 2
    - Concepto: Microdaño y fatiga
17. Pregunta: ¿Por qué se reabsorbe el reborde alveolar tras una extracción dental?
    - Respuesta: en dos fases: primero se reabsorbe con rapidez el hueso alveolar propio, que depende del diente, junto con el remodelado de cicatrización; a largo plazo, la falta de carga mantiene la pérdida.
    - Dificultad: 2
    - Concepto: Ley de Wolff
18. Pregunta: En ortodoncia, el hueso se reabsorbe justo donde aumenta la fuerza sobre el ligamento. ¿Contradice esto la ley de Wolff?
    - Respuesta: no exactamente. La fuerza ortodóncica es un remodelado dirigido: comprime el ligamento periodontal de un lado (allí se reabsorbe hueso) y lo estira del otro (allí se forma hueso), y así el diente se mueve.
    - Dificultad: 3
    - Concepto: Ley de Wolff

## Ganchos para el mentor

### Conceptos clave del módulo

1. El tejido óseo es un tejido conjuntivo especializado de origen mesenquimático, con una fase orgánica y una mineralizada; se adapta, se repara y se renueva por remodelado.
2. Funciones en cuatro categorías: mecánica y estructural, metabólica y homeostática, hematopoyética e inmunológica, y neurobiológica e integración sistémica.
3. Arquitectura: clasificación de los huesos, hueso cortical (osteonas, laminillas no osteonales) y trabecular (osteona trabecular), periostio y endostio, vascularización e inervación.
4. La matriz es un material compuesto: colágeno tipo I (tensión, tenacidad), apatita biológica (rigidez, compresión) y proteínas no colágenas (organización y mineralización).
5. Biomecánica: tipos de carga, propiedades mecánicas, ley de Wolff, mecanostato de Frost, modelado y remodelado, microdaño y fatiga.

### Errores frecuentes y cómo aclararlos

| Error frecuente | Por qué ocurre | Cómo aclararlo |
|---|---|---|
| "El hueso es un tejido inerte, como una piedra" | Se le conoce por el esqueleto seco de los museos | Recordar que mantiene un estado dinámico de adaptación, reparación y renovación por remodelado |
| "Hueso cortical es lo mismo que hueso maduro y trabecular es inmaduro" | Se confunden arquitectura y disposición del colágeno | Separar dos ejes: cortical o trabecular (cómo está construido) frente a laminar o entretejido (cómo se ordenan las fibras) |
| "Havers y Volkmann son lo mismo" | Los nombres se parecen y ambos llevan vasos | Havers: canal central de la osteona. Volkmann: transversal u oblicuo, conecta conductos de Havers y comunica periostio, endostio y médula |
| "El periostio cubre la cavidad medular" | Confusión entre periostio y endostio | Periostio = por fuera; endostio = por dentro |
| "Si se supera el límite elástico, el hueso se fractura" | Se confunden límite elástico y fallo | Entre el límite elástico y el fallo está la región plástica: deformación permanente sin fractura inmediata |
| "Las cargas pequeñas nunca rompen un hueso" | Se piensa solo en la sobrecarga aguda | La fatiga acumula microdaño con cargas repetidas que, una a una, no superan la resistencia |
| "Con más carga siempre hay más hueso" | Se aplica la regla sin distinguir cargas | Frost: por encima de ciertos umbrales la sobrecarga genera microdaño; en ortodoncia hay resorción en el lado comprimido |

### Cómo usar el contexto

- **Si el estudiante falla `m1_1_funciones_situaciones`:** volver a las cuatro categorías de funciones y pedir que identifique qué sistema participa en la situación.
- **Si falla `m1_2_hormonas_oseas`:** retomar de dónde sale cada mensajero y en qué órgano actúa; FGF23 es el mensajero bien establecido, osteocalcina y lipocalina 2 son hipótesis.
- **Si falla la evaluación de 1.2:** recorrer la osteona y el trayecto de un vaso desde el periostio hasta un conducto de Havers por un conducto de Volkmann.
- **Si falla la evaluación de 1.4:** usar la curva esfuerzo-deformación (región elástica, plástica y fallo) y la diferencia entre fractura por sobrecarga aguda y por fatiga.
- **Nivel de posgrado:** ampliar con los vasos tipo H y L, el eje SLIT2–FSTL1 frente a p75NTR–SPP1, y la señalización osteocítica del microdaño (RANKL, VEGF, OPG).

## Notas de verificacion para el docente

Los textos de las secciones 1.1 a 1.4, las preguntas de evaluación y sus justificaciones son los del documento del docente (PDF «Módulos del 1 al 3, completados, listos para desarrollar», recibido el 2026-10-25). Quedan estas consultas:

### A. Contenido del documento por confirmar

1. **Sección 1.2, evaluación.** El banco salta de la pregunta 1 a la 3: falta la pregunta 2. Además, las preguntas 1, 3, 4, 5 y 6 no traen justificación; la explicación que ve el estudiante es la frase del propio texto que las responde.
2. **Sección 1.3, evaluación.** La indicación «del 1 al 5 solo 3 y de 6 a 8 completas» no corresponde: la sección trae 4 preguntas. Van las 4.
3. **Sección 1.4, evaluación.** La pregunta 5 no trae justificación; se usa la frase del «Concepto clave».
4. **Sección 1.1, «Explora las funciones del hueso».** Las 16 situaciones no traen justificación propia; la explicación es la categoría correcta.
5. **Sección 1.3, entrada.** El texto «La matriz extracelular ósea es…» supera los 600 caracteres del panel de la portada; va como primer bloque de la sección.
6. **Ejemplos en la mandíbula (sección 1.4).** Se conservan de la versión anterior a petición del docente; la cifra «cerca de la mitad del ancho en el primer año» (Schropp y colaboradores, 2003) varía entre estudios.

### B. Pendientes de desarrollo

1. Integrar las imágenes del documento (Imagen #N de cada sección, ver «#### Pendientes PDF»), con sus letreros interactivos.
2. HECHO (2026-10-26): selección al azar por intento con `config.mostrar` y `siempre` por pregunta (1.1: 6 de 16; 1.2: 3 de las preguntas 1–5 más la 6, 7 y 8 siempre). Se aplica en el content.json pulido; el convertidor aún no lee estas claves.
3. Actividad «Compara el hueso cortical y el trabecular» (tabla para completar) y actividad «¿El hueso se recupera o se fractura?» (marcador sobre la curva).

## Registro de revision

**2026-10-25.** Reestructuración completa con el documento del docente: cuatro secciones (1.1 El hueso: mucho más que un soporte; 1.2 La arquitectura del hueso; 1.3 La materia que constituye el hueso; 1.4 Biomecánica del hueso) con sus textos, objetivos y evaluaciones al pie de la letra. Se conservan las actividades que el docente pidió mantener (`m1_2_hormonas_oseas` sin distractores, `m1_1_hueso_largo` con sus definiciones, `m1_4_relacion_estructuras`, `m1_3_relacion_matriz`, `m1_5_wolff_casos`), con sus ids originales. Se retiran las secciones anteriores (tejido vivo, funciones, matriz, organización y mandíbula) y sus actividades. La revisión científica del 2026-09-24 se refería a esa versión y queda en el historial de git.
