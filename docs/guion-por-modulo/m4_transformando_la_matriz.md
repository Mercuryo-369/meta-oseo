# Modulo 4: Transformando la matriz

> Estado: BORRADOR redactado por IA (2026-09-23), pendiente de validación del docente. Los datos marcados con [verificar] varían entre fuentes o son aproximados; se listan en la sección 12.

## Ficha

- **Foco:** Mineralización del tejido óseo: del osteoide al hueso mineralizado.
- **Densidad:** Alta
- **Duracion estimada:** aproximadamente 75 a 100 minutos con las actividades obligatorias, mejor repartidos en dos sesiones: secciones 4.1 a 4.4 y secciones 4.5 a 4.8 (el punto de pausa es la actividad de orden de la mineralización); los refuerzos opcionales la alargan [verificar]
- **Nivel:** pregrado y posgrado, con enfoque en el hueso mandibular
- **Logro que se otorga:** Mineralizador (id `mineralizador`), al completar todas las actividades obligatorias del módulo y alcanzar al menos el 70 % en la evaluación final (umbral propuesto, por acordar con el docente)
- **Secciones:** 8
- **Actividades:** 20 (15 obligatorias y 5 de refuerzo opcionales), incluida la evaluación final de 16 preguntas
- **Puntaje total del modulo:** 660 puntos (510 en actividades obligatorias)
- **Prerrequisitos:** Módulos 1 a 3 (el osteoblasto y la formación de matriz)
- **Interaccion:** todas las actividades se resuelven con el dedo (tocar, arrastrar), con mouse (clic, arrastrar, cursor encima) o con teclado (Tab para moverse, Enter o Espacio para elegir, flechas para cambiar de elemento). Nada depende solo del cursor encima: cada información que aparece al pasar el cursor aparece también al tocar o al enfocar con Tab.

## Objetivos de aprendizaje

1. Distinguir el osteoide del hueso mineralizado y enumerar los componentes de la matriz ósea.
2. Secuenciar el ensamblaje del colágeno tipo I e identificar en la fibrilla las zonas de hueco y de solapamiento.
3. Explicar cómo las vesículas de matriz (calcio, fosfato, fosfatasa alcalina, PHOSPHO1, anexinas) y el pirofosfato inorgánico inician y controlan la nucleación de la hidroxiapatita.
4. Ordenar los pasos de la mineralización, ubicar el mineral dentro y entre las fibrillas de colágeno y relacionar cada proteína no colágena (osteocalcina, osteopontina, sialoproteína ósea, DMP1) con su función.
5. Identificar el frente de mineralización, diferenciar la mineralización primaria de la secundaria e interpretar los marcadores bioquímicos de formación.
6. Relacionar la vitamina D, la PTH, la calcitonina y el FGF23 con la homeostasis del calcio y del fosfato, y asociar el raquitismo, la osteomalacia, la hipofosfatasia y la osteogénesis imperfecta con su defecto de base.

## Conexion con el hueso mandibular

La mandíbula reúne en una sola pieza los tres escenarios de mineralización que estudia este módulo.

- **Borde basal y cortical del cuerpo:** hueso de recambio lento, cuya matriz tiene en promedio un grado alto de mineralización [verificar]. Es la zona más densa y la que se mide en radiografías panorámicas.
- **Proceso alveolar:** hueso de recambio elevado, expuesto a la carga oclusal y a la ortodoncia. Su matriz es, en promedio, más joven y menos mineralizada que la del borde basal, y responde antes a los cambios sistémicos de calcio, fosfato y PTH [verificar].
- **Cóndilo:** su cabeza tiene una capa articular fibrosa y, debajo, un cartílago secundario que participa en el crecimiento por osificación endocondral hasta el adulto joven. Su cartílago hipertrófico se calcifica con un mecanismo de vesículas de matriz análogo al del cartílago de crecimiento [verificar].

Los tejidos dentarios (dentina, cemento) se mineralizan con mecanismos y moléculas en buena parte compartidos con el hueso, por eso el diente delata los defectos de mineralización. La hipofosfatasia provoca la pérdida temprana de dientes temporales con la raíz intacta; el raquitismo hipofosfatémico ligado al X produce abscesos dentales sin caries; la osteogénesis imperfecta se acompaña a veces de dentinogénesis imperfecta; el hiperparatiroidismo puede borrar la lámina dura en la radiografía. La sección 4.8 lleva estas ideas a la mandíbula 3D.

## Ilustraciones y modelos requeridos

Todas las imágenes se producen como SVG multicapa con un `<g id="...">` por capa (ids en snake_case, en español, sin tildes ni eñes). El único modelo 3D es la mandíbula, con una sola malla: se resuelve con hotspots con nombre, no con piezas separadas. Las células van en SVG. En el texto, una figura se cita con una línea aparte con el formato `[Figura: id_de_archivo | pie de figura]`.

| id de archivo | Qué muestra | Capas o zonas (id: etiqueta) | Se usa en |
|---|---|---|---|
| `m4_composicion_matriz` | Barra apilada de la matriz ósea madura con cuatro segmentos tocables. | `fraccion_mineral`: Fase mineral (hidroxiapatita); `colageno_i`: Colágeno tipo I; `proteinas_no_colagenas`: Proteínas no colágenas; `agua`: Agua | 4.1 |
| `m4_fibrilla_colageno` | Fibrilla de colágeno I en corte longitudinal: cinco moléculas de tropocolágeno escalonadas, con el patrón de bandas del periodo D. | `molecula_tropocolageno`: Molécula de tropocolágeno; `zona_hueco`: Zona de hueco; `zona_solapamiento`: Zona de solapamiento; `periodo_d`: Periodo D; `entrecruzamientos`: Entrecruzamientos de lisil oxidasa | 4.2 |
| `m4_vesicula_matriz` | Vesícula de matriz que brota de la membrana del osteoblasto hacia el osteoide, con sus proteínas, iones y un cristal de hidroxiapatita en formación. Sirve de escena al video-texto y a la actividad de arrastre. | `osteoblasto`: Osteoblasto; `fibrilla_colageno`: Fibrilla de colágeno; `membrana_vesicula`: Membrana de la vesícula (cara externa); `canal_anexina`: Canal de anexina; `transportador_fosfato`: Transportador de fosfato PiT-1; `lumen_vesicula`: Interior de la vesícula; `tnap_membrana`: TNAP anclada a la membrana; `enpp1_ankh`: ENPP1 y ANKH (fuentes de PPi); `cristal_hidroxiapatita`: Cristal de hidroxiapatita; `iones_calcio`: Iones Ca2+; `iones_fosfato`: Iones de fosfato; `pirofosfato`: Pirofosfato inorgánico | 4.3 |
| `m4_fibrilla_mineralizada` | La misma fibrilla de la sección 4.2 ya mineralizada: cristales dentro de las zonas de hueco y agregados entre fibrillas. | `fibrilla_colageno`: Fibrilla de colágeno; `zona_hueco`: Zona de hueco; `nodulo_mineral`: Nódulo mineral de origen vesicular; `cristales_intrafibrilares`: Cristales intrafibrilares; `cristales_extrafibrilares`: Cristales extrafibrilares; `eje_c_cristales`: Eje c de los cristales | 4.4 |
| `m4_frente_mineralizacion` | Corte de una superficie ósea en formación, de la superficie hacia el interior: osteoblastos, osteoide, frente de mineralización, hueso mineralizado y osteocito con sus canalículos. | `osteoblastos`: Osteoblastos; `osteoide`: Osteoide; `vesiculas_matriz`: Vesículas de matriz; `frente_mineralizacion`: Frente de mineralización; `hueso_mineralizado`: Hueso mineralizado; `osteocito`: Osteocito; `canaliculos`: Canalículos; `marcas_tetraciclina`: Marcas de tetraciclina | 4.6 |
| `m4_homeostasis_calcio_fosfato` | Esquema del cuerpo con los órganos que regulan el calcio y el fosfato, y las flechas de cada hormona. | `piel`: Piel; `higado`: Hígado; `rinon`: Riñón; `intestino_delgado`: Intestino delgado; `glandula_paratiroides`: Glándulas paratiroides; `tiroides_celulas_c`: Tiroides (células C); `hueso_osteocitos`: Hueso y osteocitos | 4.7 |
| `m4_osteoide_normal_vs_osteomalacia` | Dos paneles comparados de una superficie ósea, con marcaje doble de tetraciclina. Figura de apoyo al texto, sin actividad propia. | `panel_hueso_normal`: Hueso normal; `costura_osteoide_normal`: Costura de osteoide normal; `hueso_mineralizado_normal`: Hueso mineralizado normal; `marcas_tetraciclina_normales`: Marcas de tetraciclina nítidas; `panel_osteomalacia`: Osteomalacia; `costura_osteoide_ensanchada`: Costura de osteoide ensanchada; `hueso_mineralizado_reducido`: Hueso mineralizado reducido; `marcas_tetraciclina_difusas`: Marcas de tetraciclina difusas o ausentes | 4.8 |
| `mandibula` (modelo 3D, una sola malla) | Mandíbula humana para la exploración 3D, con hotspots con nombre. | Hotspots: `cortical_basal`: Cortical del borde basal; `proceso_alveolar`: Proceso alveolar; `lamina_dura`: Lámina dura; `hueso_trabecular_cuerpo`: Hueso trabecular del cuerpo; `condilo`: Cóndilo; `foramen_mentoniano`: Foramen mentoniano | 4.8 |

Notas de precisión anatómica y científica:

- **Fibrilla (`m4_fibrilla_colageno`, `m4_fibrilla_mineralizada`):** molécula de unos 300 nm, periodo D de aproximadamente 67 nm, zona de hueco de aproximadamente 40 nm (0,6 D) y zona de solapamiento de aproximadamente 27 nm (0,4 D) [verificar]. Algunas fuentes invierten las etiquetas; el guion sigue la convención hueco = 0,6 D. Los cristales son placas o agujas nanométricas: dibujarlos esquemáticos, con el eje c paralelo al eje mayor de la fibrilla, y rotular "no está a escala". En `m4_fibrilla_colageno`, `periodo_d` se dibuja como un corchete o regla aparte, encima de la fibrilla, y su área táctil no contiene las de `zona_hueco` ni `zona_solapamiento`; así, tocar un hueco nunca cuenta como tocar el periodo D.
- **Vesícula (`m4_vesicula_matriz`):** en la actividad de arrastre, `canal_anexina`, `transportador_fosfato`, `lumen_vesicula`, `membrana_vesicula` y `cristal_hidroxiapatita` son las zonas donde se suelta cada molécula; deben tener áreas táctiles separadas, con los centros a 18 unidades o más. La fosfatidilserina va en la hoja interna de la bicapa; las anexinas se dibujan en la cara interna y como canal; la TNAP va en la cara externa con su ancla de GPI; PHOSPHO1 va dentro del interior de la vesícula; PiT-1 atraviesa la membrana. El cristal nace dentro y crece hacia afuera hasta perforar la membrana.
- **Frente (`m4_frente_mineralizacion`):** el orden de la superficie hacia el interior es osteoblastos, osteoide, frente, hueso mineralizado. Las vesículas se dibujan en el osteoide, cerca del frente. Los osteocitos están dentro del hueso mineralizado, en lagunas, con canalículos que salen hacia el frente y hacia la superficie. Las marcas de tetraciclina son dos líneas paralelas amarillas dentro del hueso mineralizado, separadas una distancia rotulada (por ejemplo 8 µm). Como la actividad de esta figura pide identificar capas, las áreas táctiles no se contienen entre sí: `osteocito`, `canaliculos`, `vesiculas_matriz` y `marcas_tetraciclina` se dibujan encima de la capa que los rodea y reciben el toque primero, y el área de `hueso_mineralizado` excluye la del osteocito.
- **Comparación normal y osteomalacia (`m4_osteoide_normal_vs_osteomalacia`):** en el panel normal la costura de osteoide mide aproximadamente 10 µm; en el panel de osteomalacia es varias veces más ancha, con marcas de tetraciclina borrosas.
- **Homeostasis (`m4_homeostasis_calcio_fosfato`):** las glándulas paratiroides son cuatro, en la cara posterior del tiroides; las células C están en el tiroides, no en las paratiroides. La 25-hidroxilación ocurre en el hígado y la 1α-hidroxilación en el riñón. La actividad de esta figura pide identificar órganos: cada órgano tiene un área táctil propia y sin solaparse con las demás.
- **Mandíbula (`mandibula`):** una sola malla. Las estructuras internas (`lamina_dura`, `hueso_trabecular_cuerpo`) se muestran con un plano de corte, transparencia o un hotspot con línea guía, no con piezas separadas. La posición exacta de cada hotspot la fija quien modele la malla. Bajo el modelo se ofrece una lista de los hotspots como alternativa táctil y de teclado, porque los internos (`lamina_dura`, `hueso_trabecular_cuerpo`) son difíciles de tocar en un teléfono.

## Secciones

Convenciones de datos de las actividades: en `verdadero_falso`, `correcta` es `true` o `false`; en `ordenar_pasos`, `pasos` se lista desordenado y `correcta` es la lista de ids en el orden correcto; en `opcion_multiple`, `correcta` es el id de la opción. Los textos de las actividades usan comillas dobles solo como delimitador.

### Seccion 4.1: Del osteoide al hueso mineralizado

id: "m4_1_osteoide"

#### Contenido

El osteoblasto no fabrica hueso duro de una sola vez. Primero secreta una matriz blanda, el **osteoide**, y solo después esa matriz se endurece cuando se deposita mineral en ella. Este módulo sigue esa transformación paso a paso.

**¿Qué es el osteoide?**

El osteoide es la matriz orgánica recién formada, todavía sin mineralizar. Forma una capa fina, la *costura de osteoide*, entre los osteoblastos y el hueso ya mineralizado. En hueso normal mide aproximadamente 10 µm de grosor [verificar].

- Con la técnica de von Kossa, el mineral se tiñe de negro y el osteoide queda sin teñir.
- Con el tricrómico de Goldner, el hueso mineralizado se ve verde o azul verdoso y el osteoide rojo o anaranjado.

[Figura: m4_composicion_matriz | Composición de la matriz ósea madura. Toca cada segmento para ver su papel.]

**¿De qué está hecha la matriz?**

| Componente | Proporción aproximada | Función |
|---|---|---|
| Fase mineral: hidroxiapatita carbonatada | aproximadamente 50 a 70 % del peso seco [verificar] | Rigidez, resistencia a la compresión y reserva de calcio y fósforo |
| Colágeno tipo I | aproximadamente 90 % de la matriz orgánica | Tenacidad, resistencia a la tracción y plantilla del mineral |
| Proteínas no colágenas | aproximadamente 10 % de la matriz orgánica | Regulan dónde, cuándo y cómo crece el cristal |
| Agua | del orden de 10 a 20 % del peso fresco, según el tejido [verificar] | Transporte de iones; disminuye a medida que aumenta el mineral |

> Dato: el hueso guarda aproximadamente el 99 % del calcio del cuerpo y cerca del 85 % del fósforo.

**El osteoide en la mandíbula**

El proceso alveolar, la parte de la mandíbula que rodea las raíces de los dientes, es una zona de mineralización activa. Es un hueso de recambio alto: la carga de la masticación y el movimiento de los dientes lo remodelan sin descanso, así que en él se forma y se mineraliza matriz nueva con más frecuencia que en la mayor parte del esqueleto.

En animales, el recambio del hueso trabecular alveolar es varias veces mayor que el del fémur [verificar]. Por eso, cuando la mineralización falla, sus efectos aparecen pronto en los dientes y en la radiografía dental (sección 4.8).

**El problema que resuelve la mineralización**

Los líquidos del cuerpo contienen calcio y fosfato en concentraciones que, en teoría, bastarían para que precipitaran como fosfato de calcio. Aun así, no se calcifica cualquier tejido: hay inhibidores (como el pirofosfato, los proteoglucanos y algunas fosfoproteínas) que lo impiden. Para que el mineral aparezca solo en el lugar correcto hacen falta cinco cosas, que son el mapa de este módulo:

1. Una plantilla ordenada: el colágeno tipo I (sección 4.2).
2. Un sitio de arranque protegido: las vesículas de matriz (sección 4.3).
3. Un interruptor local entre el fosfato, que impulsa, y el pirofosfato, que frena: la fosfatasa alcalina (sección 4.3).
4. Crecimiento guiado del cristal, dentro y entre las fibrillas, y proteínas que lo regulan (secciones 4.4 y 4.5).
5. Un suministro sistémico de calcio y fosfato (sección 4.7).

> Recuerda: el osteoide es una fase normal de la formación de hueso. Lo patológico es que la capa de osteoide sea demasiado gruesa, porque eso indica que la mineralización va por detrás de la formación de matriz.

> Atencion: no confundas "matriz sin mineral" con "hueso sin colágeno". El osteoide ya tiene toda su carga de colágeno; lo que le falta es la fase mineral.

#### Actividades

##### Actividad m4_composicion_multicapa

```yaml
tipo: multicapa
titulo: "Componentes de la matriz ósea"
instrucciones: "Explora la barra de la matriz. Toca cada segmento (o pasa el cursor, o muévete con Tab y pulsa Enter) para leer qué es y qué hace. Debes visitar el segmento mineral, el de colágeno y el de proteínas no colágenas."
obligatoria: true
puntaje_max: 20
concepto: "Composición de la matriz ósea"
retroalimentacion:
  acierto: "Bien: la resistencia del hueso nace de combinar mineral, que da rigidez, con colágeno, que da tenacidad, y de las proteínas no colágenas, que regulan cómo se unen."
  error: "Aún falta explorar algún segmento requerido. Toca los que no tienen marca de visitado."
svg: m4_composicion_matriz
modo: explorar
capas:
  - id: fraccion_mineral
    etiqueta: "Fase mineral (hidroxiapatita)"
    descripcion: "Hidroxiapatita carbonatada de cristales muy pequeños. Da rigidez y resistencia a la compresión, y es la reserva de aproximadamente el 99 % del calcio del cuerpo. Su proporción varía entre fuentes, aproximadamente 50 a 70 % del peso seco [verificar]."
  - id: colageno_i
    etiqueta: "Colágeno tipo I"
    descripcion: "Forma aproximadamente el 90 % de la matriz orgánica. Sus fibrillas dan tenacidad y resistencia a la tracción, y sirven de plantilla para el mineral (sección 4.2)."
  - id: proteinas_no_colagenas
    etiqueta: "Proteínas no colágenas"
    descripcion: "Aproximadamente el 10 % de la matriz orgánica. Incluyen osteocalcina, osteopontina, sialoproteína ósea, DMP1, osteonectina y proteoglucanos. Regulan el inicio, el crecimiento y la orientación del cristal (sección 4.5)."
  - id: agua
    etiqueta: "Agua"
    descripcion: "Ocupa los poros de la matriz y los canalículos. Su proporción baja a medida que el mineral ocupa más espacio [verificar]."
requeridas:
  - fraccion_mineral
  - colageno_i
  - proteinas_no_colagenas
```

##### Actividad m4_1_quiz_osteoide

```yaml
tipo: quiz
titulo: "Osteoide y matriz: comprobación rápida"
instrucciones: "Responde las tres preguntas. Elige una opción tocándola, o con teclado usa Tab, las flechas y Enter. Este refuerzo es opcional, pero suma puntos y recibirás la explicación al instante."
obligatoria: false
puntaje_max: 30
concepto: "Osteoide y composición de la matriz"
retroalimentacion:
  acierto: "Muy bien: distingues la matriz sin mineral del hueso mineralizado y sabes qué la compone."
  error: "Repasa la tabla de composición y la definición de osteoide antes de continuar."
preguntas:
  - id: m4_q_osteoide_definicion
    formato: opcion_multiple
    enunciado: "¿Qué es el osteoide?"
    opciones:
      - id: a
        texto: "Hueso maduro con exceso de hidroxiapatita y muy poco colágeno."
      - id: b
        texto: "Capa de cartílago calcificado que precede al hueso en la osificación endocondral."
      - id: c
        texto: "Matriz orgánica recién secretada por el osteoblasto, aún sin mineralizar."
      - id: d
        texto: "Fase mineral del hueso sin colágeno, formada solo por cristales de apatita."
    correcta: c
    explicacion: "El osteoide es la matriz orgánica (sobre todo colágeno tipo I) que el osteoblasto acaba de secretar. Se mineraliza después, con un retraso de días."
    dificultad: 1
    concepto: "Osteoide"
  - id: m4_q_osteoide_colageno_proporcion
    formato: opcion_multiple
    enunciado: "¿Qué molécula forma aproximadamente el 90 % de la matriz orgánica del hueso?"
    opciones:
      - id: a
        texto: "Colágeno tipo I."
      - id: b
        texto: "Colágeno tipo II."
      - id: c
        texto: "Osteocalcina."
      - id: d
        texto: "Hidroxiapatita."
    correcta: a
    explicacion: "El colágeno tipo I es la proteína dominante de la matriz. El colágeno tipo II es propio del cartílago hialino, y la hidroxiapatita no es orgánica sino mineral."
    dificultad: 1
    concepto: "Composición de la matriz"
  - id: m4_q_osteoide_precipitacion
    formato: verdadero_falso
    enunciado: "Como el plasma contiene calcio y fosfato, el mineral precipita por sí solo en cualquier tejido blando."
    correcta: false
    explicacion: "Es falso: la precipitación está frenada por inhibidores como el pirofosfato y necesita una plantilla y un sitio de nucleación controlados. Cuando falla este control aparecen calcificaciones fuera del hueso."
    dificultad: 2
    concepto: "Control de la mineralización"
```

### Seccion 4.2: Colágeno tipo I, la plantilla del mineral

id: "m4_2_colageno_i"

#### Contenido

El colágeno tipo I aporta la *geometría*: una red de fibrillas con huecos ordenados donde cabe el mineral. Por sí solo no basta para mineralizar; otras moléculas deciden dónde y cuándo precipita el cristal. Conocer cómo se ensambla explica dónde queda el espacio para el mineral.

**Una molécula, tres cadenas**

- Es un heterotrímero: dos cadenas α1(I), codificadas por *COL1A1*, y una cadena α2(I), codificada por *COL1A2*, enrolladas en una triple hélice.
- Cada cadena repite el patrón Gly-X-Y. La glicina, el aminoácido más pequeño, ocupa cada tercera posición porque solo ella cabe en el eje de la hélice; X e Y suelen ser prolina e hidroxiprolina.
- La molécula madura (tropocolágeno) mide aproximadamente 300 nm de largo y 1,5 nm de diámetro.

**De la célula a la fibrilla, en seis pasos**

1. El osteoblasto traduce las cadenas pro-α en el retículo endoplásmico rugoso.
2. Hidroxila prolinas y lisinas (con vitamina C como cofactor) y las tres cadenas forman la triple hélice de procolágeno.
3. El procolágeno sale de la célula por exocitosis.
4. Fuera de la célula, proteinasas cortan los propéptidos: la procolágeno N-proteinasa (familia ADAMTS) y la C-proteinasa (BMP-1). Queda el tropocolágeno.
5. Las moléculas se autoensamblan en paralelo, escalonadas unos 67 nm entre vecinas (aproximadamente un cuarto de su longitud).
6. La lisil oxidasa, una enzima con cobre, forma aldehídos en los extremos (telopéptidos) y de ahí surgen entrecruzamientos covalentes que estabilizan la fibrilla.

**Dos zonas en cada periodo**

Como la molécula mide aproximadamente 4,4 veces el escalonamiento, en cada periodo de 67 nm (el *periodo D*) hay dos zonas:

- **Zona de solapamiento** (aproximadamente 27 nm, 0,4 D): donde se superponen moléculas de filas vecinas.
- **Zona de hueco** (aproximadamente 40 nm, 0,6 D): donde hay un espacio entre el final de una molécula y el comienzo de la siguiente en la misma fila. Los huecos de moléculas contiguas se alinean y forman surcos que cruzan la fibrilla [verificar].

En el modelo clásico, los primeros cristales *intrafibrilares* se forman en esas zonas de hueco y en los surcos que ellas forman (sección 4.4). La alternancia de hueco y solapamiento también produce el patrón de bandas que se ve con microscopía electrónica.

[Figura: m4_fibrilla_colageno | Cinco moléculas de tropocolágeno escalonadas. Cada periodo D alterna una zona de hueco y una de solapamiento.]

> Clinico: el escorbuto muestra qué pasa si falla el paso 2. Sin vitamina C no se hidroxilan bien la prolina y la lisina, el colágeno es inestable y el osteoblasto forma poca matriz. En la boca se ve con encías sangrantes y dientes móviles.

> Clinico: en la osteogénesis imperfecta el defecto está en *COL1A1* o *COL1A2*: hay menos colágeno o colágeno anómalo. Se estudia en la sección 4.8.

> Atencion: el colágeno tipo I no es el mineral ni se mineraliza por sí solo. Sin vesículas, enzimas y proteínas no colágenas, la fibrilla permanece como osteoide.

#### Actividades

##### Actividad m4_fibrilla_multicapa

```yaml
tipo: multicapa
titulo: "Anatomía de la fibrilla de colágeno"
instrucciones: "Lee cada pista y toca en la fibrilla la estructura que describe (con teclado, Tab y Enter). Al acertar lees su ficha. Debes ubicar cuatro estructuras."
obligatoria: true
puntaje_max: 25
concepto: "Estructura de la fibrilla de colágeno I"
retroalimentacion:
  acierto: "Correcto: distingues el hueco, donde habrá espacio para el mineral, del solapamiento, y sabes que la repetición se llama periodo D."
  error: "Esa no es la estructura de la pista. Recuerda: el hueco es la zona con espacio entre moléculas de una misma fila; el solapamiento es donde se superponen moléculas de filas vecinas."
svg: m4_fibrilla_colageno
modo: identificar
capas:
  - id: molecula_tropocolageno
    etiqueta: "Molécula de tropocolágeno"
    descripcion: "Triple hélice de aproximadamente 300 nm de largo. Es la unidad que se ensambla en la fibrilla."
    pista: "La triple hélice alargada, de unos 300 nm, que es la unidad que se ensambla para formar la fibrilla."
  - id: zona_hueco
    etiqueta: "Zona de hueco"
    descripcion: "Espacio de aproximadamente 40 nm entre moléculas de una misma fila [verificar]. En el modelo clásico, aquí se forman los primeros cristales intrafibrilares."
    pista: "El espacio de unos 40 nm entre el final de una molécula y el inicio de la siguiente en la misma fila."
  - id: zona_solapamiento
    etiqueta: "Zona de solapamiento"
    descripcion: "Región de aproximadamente 27 nm donde se superponen moléculas de filas vecinas [verificar]. Es más densa en proteína."
    pista: "La región, más densa en proteína, donde se superponen moléculas de filas vecinas."
  - id: periodo_d
    etiqueta: "Periodo D"
    descripcion: "Unidad repetida de aproximadamente 67 nm que suma una zona de hueco y una de solapamiento."
    pista: "La unidad completa que se repite a lo largo de la fibrilla: un hueco más un solapamiento."
  - id: entrecruzamientos
    etiqueta: "Entrecruzamientos"
    descripcion: "Enlaces covalentes formados tras la acción de la lisil oxidasa en los telopéptidos. Estabilizan la fibrilla."
    pista: "Los enlaces covalentes entre moléculas vecinas que estabilizan la fibrilla."
requeridas:
  - molecula_tropocolageno
  - zona_hueco
  - zona_solapamiento
  - periodo_d
```

##### Actividad m4_2_quiz_colageno

```yaml
tipo: quiz
titulo: "Colágeno tipo I: ensamblaje y estructura"
instrucciones: "Resuelve las tres preguntas. En la de ordenar, arrastra los pasos con el dedo o el mouse. Con teclado, enfoca un paso, pulsa Enter y muévelo con las flechas arriba y abajo; vuelve a pulsar Enter para soltarlo."
obligatoria: true
puntaje_max: 30
concepto: "Ensamblaje del colágeno tipo I"
retroalimentacion:
  acierto: "Muy bien: dominas el camino de la molécula, desde el ribosoma hasta la fibrilla entrecruzada."
  error: "Repasa los seis pasos: primero se sintetiza y se hidroxila dentro de la célula, y solo fuera se corta y se ensambla."
preguntas:
  - id: m4_q_colageno_orden
    formato: ordenar_pasos
    enunciado: "Ordena los pasos de la formación de una fibrilla de colágeno tipo I, del primero al último."
    pasos:
      - id: p_entrecruzamiento
        texto: "La lisil oxidasa forma entrecruzamientos covalentes entre las moléculas."
      - id: p_hidroxilacion
        texto: "Se hidroxilan prolinas y lisinas y se forma la triple hélice de procolágeno."
      - id: p_ensamblaje
        texto: "Las moléculas de tropocolágeno se ensamblan en fibrillas, escalonadas unos 67 nm."
      - id: p_traduccion
        texto: "Se traducen las cadenas pro-α en el retículo endoplásmico rugoso."
      - id: p_corte
        texto: "Las proteinasas extracelulares cortan los propéptidos N y C."
      - id: p_secrecion
        texto: "El procolágeno se secreta al espacio extracelular."
    correcta:
      - p_traduccion
      - p_hidroxilacion
      - p_secrecion
      - p_corte
      - p_ensamblaje
      - p_entrecruzamiento
    explicacion: "La síntesis y la hidroxilación ocurren dentro de la célula. Solo tras la secreción se cortan los propéptidos, y solo el tropocolágeno ya cortado se ensambla; el entrecruzamiento estabiliza al final."
    dificultad: 2
    concepto: "Ensamblaje del colágeno tipo I"
  - id: m4_q_colageno_vitamina
    formato: opcion_multiple
    enunciado: "¿Qué vitamina es cofactor de la hidroxilación de prolina y lisina en la síntesis de colágeno?"
    opciones:
      - id: a
        texto: "Vitamina D."
      - id: b
        texto: "Vitamina C."
      - id: c
        texto: "Vitamina K."
      - id: d
        texto: "Vitamina A."
    correcta: b
    explicacion: "La vitamina C (ácido ascórbico) mantiene activas la prolil y la lisil hidroxilasas. Su falta causa escorbuto. La vitamina K interviene en la carboxilación de la osteocalcina, no en el colágeno."
    dificultad: 1
    concepto: "Síntesis de colágeno"
  - id: m4_q_colageno_hueco
    formato: opcion_multiple
    enunciado: "Según el modelo clásico, ¿dónde se forman los primeros cristales intrafibrilares?"
    opciones:
      - id: a
        texto: "En las zonas de solapamiento, donde la fibrilla es más densa."
      - id: b
        texto: "En los propéptidos C, antes de que se corten."
      - id: c
        texto: "Dentro de la triple hélice, entre las tres cadenas."
      - id: d
        texto: "En las zonas de hueco y en los surcos que forman."
    correcta: d
    explicacion: "Las zonas de hueco dejan espacio entre las moléculas y sus residuos cargados atraen iones. Otros modelos discuten los detalles, pero este es el modelo de los textos clásicos."
    dificultad: 2
    concepto: "Zonas de hueco"
```

### Seccion 4.3: Vesículas de matriz y pirofosfato, encender y frenar el mineral

id: "m4_3_vesiculas_ppi"

#### Contenido

**Un microrreactor en el osteoide**

Las **vesículas de matriz** son vesículas rodeadas de membrana que brotan de la membrana del osteoblasto hacia el osteoide. Miden de decenas a algunos cientos de nanómetros (aproximadamente 30 a 300 nm; algunas revisiones dan rangos mayores) [verificar]. También las liberan los condrocitos hipertróficos del cartílago de crecimiento y los odontoblastos.

Son un compartimento protegido de los inhibidores del líquido extracelular, donde se concentran calcio y fosfato hasta que aparece el primer cristal. Su papel está bien documentado en el cartílago de crecimiento, el hueso inmaduro y la dentina del manto. En el hueso laminar maduro, el peso relativo de las vesículas frente a otros mecanismos sigue discutiéndose [verificar].

**El equipo molecular de la vesícula**

| Componente | Dónde está | Qué hace |
|---|---|---|
| Fosfatidilserina | Hoja interna de la membrana | Se une al Ca2+ y forma complejos calcio-fosfato-fosfolípido, que sirven de sitio de nucleación |
| Anexinas A2, A5 y A6 | Membrana | Se unen a calcio y a fosfolípidos y actúan como canales de Ca2+ |
| Transportador PiT-1 (cotransportador de fosfato y sodio, tipo III) | Membrana | Introduce fosfato inorgánico (Pi) |
| PHOSPHO1 | Interior | Libera Pi a partir de fosfocolina y fosfoetanolamina, derivadas de los fosfolípidos de la membrana |
| TNAP (fosfatasa alcalina no específica de tejido, gen *ALPL*) | Cara externa, anclada por GPI | Hidroliza pirofosfato (PPi) y ATP y libera Pi |

La TNAP es una metaloenzima con zinc y magnesio y de pH óptimo alcalino, de ahí su nombre. PHOSPHO1 y TNAP cumplen funciones que no se reemplazan entre sí: en ratones que carecen de ambas, el esqueleto no se mineraliza.

**Del ion al cristal**

1. El Ca2+ entra por los canales de anexina y se une a la fosfatidilserina interna.
2. El Pi llega por PiT-1 y se genera dentro por PHOSPHO1 y, desde afuera, por la TNAP.
3. Cuando el producto de las concentraciones de calcio y fosfato supera un umbral, se forman cúmulos de fosfato de calcio amorfo. Se propone que este es el precursor que luego se ordena como apatita, aunque su papel exacto in vivo se discute [verificar].
4. Se forman cristales de hidroxiapatita en forma de aguja, de aproximadamente 50 nm de largo en las primeras etapas [verificar]. Crecen hacia afuera, perforan la membrana y quedan expuestos al líquido extracelular, donde siguen creciendo.

La actividad de video de esta sección recorre estos pasos sobre la ilustración.

**El pirofosfato inorgánico, el freno**

El **pirofosfato inorgánico** (PPi) son dos fosfatos unidos por un enlace P-O-P. Se adsorbe a la superficie de los cristales de hidroxiapatita y bloquea tanto su formación como su crecimiento. Le bastan concentraciones micromolares (en el plasma, unos pocos µM) frente a las concentraciones milimolares de calcio y fosfato [verificar]. Cumple además una función protectora: evita que se calcifiquen tejidos blandos como los vasos o el cartílago.

El PPi tiene fuentes y un sumidero:

| Molécula | Dónde actúa | Efecto sobre la mineralización |
|---|---|---|
| ENPP1 | Ectoenzima de la superficie celular | Genera PPi a partir de ATP: **frena** |
| ANKH | Proteína de membrana | Exporta ATP (y citrato) al medio extracelular, donde ENPP1 convierte el ATP en PPi [verificar]: **frena** |
| TNAP | Cara externa de la membrana | Hidroliza PPi en dos Pi: retira el freno y aporta fosfato, es decir, **impulsa** |
| PHOSPHO1 | Interior de la vesícula | Genera Pi dentro de la vesícula: **impulsa** |

La mineralización avanza donde la relación local entre Pi y PPi es alta. Por eso la TNAP hace dos cosas a la vez: quita el inhibidor y suministra un ladrillo del cristal.

> Clinico: en la hipofosfatasia falla la TNAP (gen *ALPL*). El PPi se acumula y el osteoide no se mineraliza bien. En sentido contrario, si falta ENPP1 el PPi baja y aparecen calcificaciones arteriales (calcificación arterial generalizada de la infancia, GACI). Esa deficiencia también eleva el FGF23: el riñón pierde fosfato y aparece raquitismo hipofosfatémico (ARHR2), por la hipofosfatemia y no por el PPi bajo. Cómo la falta de ENPP1 eleva el FGF23 no está aclarado [verificar].

> Dato: los bisfosfonatos son análogos estables del pirofosfato: el enlace P-O-P se cambia por P-C-P y la TNAP no los hidroliza. Se unen a la hidroxiapatita. A dosis altas, el etidronato, el más antiguo, puede llegar a alterar la mineralización.

> Atencion: el PPi no es un "residuo" ni una molécula perjudicial. Sin él, el mineral se depositaría también en tejidos blandos. Lo que enferma es el desequilibrio entre PPi y Pi.

[Figura: m4_vesicula_matriz | Vesícula de matriz con sus canales de anexina, el transportador de fosfato, PHOSPHO1, la TNAP y un cristal naciente.]

#### Actividades

##### Actividad m4_video_vesiculas_nucleacion

```yaml
tipo: video-texto
titulo: "Cómo nace el primer cristal en la vesícula de matriz"
instrucciones: "Avanza paso a paso con el botón Siguiente, tocando la escena o con la flecha derecha del teclado; con la flecha izquierda retrocedes. Cada paso cambia la ilustración y muestra su texto al lado. Completas la actividad al llegar al último paso."
obligatoria: true
puntaje_max: 15
concepto: "Vesículas de matriz y nucleación"
retroalimentacion:
  acierto: "Completaste el recorrido: viste cómo la vesícula concentra iones, quita el freno del pirofosfato y forma el primer cristal."
  error: "Aún no llegas al último paso. Sigue avanzando hasta ver cómo el cristal rompe la membrana y toca el colágeno."
svg: m4_vesicula_matriz
pasos:
  - id: v1_brota
    titulo: "La vesícula brota"
    texto: "El osteoblasto forma una protuberancia de su membrana que se estrangula y libera una vesícula hacia el osteoide. La vesícula queda cerca de las fibrillas de colágeno recién secretadas. Es un compartimento cerrado, protegido de los inhibidores del líquido extracelular."
    escena: "El osteoblasto emite una protuberancia que se desprende como una esfera (membrana_vesicula) junto a fibrilla_colageno. El resto de las capas está atenuado."
  - id: v2_calcio
    titulo: "Entra el calcio"
    texto: "Las anexinas forman canales por donde pasa el Ca2+. Dentro de la vesícula, la fosfatidilserina de la hoja interna retiene los iones. La concentración de calcio en el interior aumenta."
    escena: "canal_anexina se ilumina y se abre. Los iones_calcio cruzan hacia lumen_vesicula y se adhieren a la cara interna de la membrana."
  - id: v3_fosfato
    titulo: "Aparece el fosfato"
    texto: "PHOSPHO1, dentro de la vesícula, corta fosfocolina y fosfoetanolamina y libera fosfato inorgánico. Otros fosfatos entran por el transportador PiT-1. El calcio y el fosfato se acumulan juntos sobre la cara interna de la membrana."
    escena: "En lumen_vesicula se resalta PHOSPHO1 y aparecen iones_fosfato. transportador_fosfato se abre y deja entrar más iones_fosfato."
  - id: v4_freno_acelerador
    titulo: "El pirofosfato y la TNAP: freno y acelerador"
    texto: "Fuera de la vesícula, ENPP1 convierte en pirofosfato el ATP que exporta ANKH, y el pirofosfato frena la formación de cristales. La TNAP, anclada a la cara externa de la vesícula, lo hidroliza en dos fosfatos. Así se retira el freno y se aporta más fosfato."
    escena: "enpp1_ankh se resalta y muestra moléculas de pirofosfato en rojo. tnap_membrana las parte en pares de iones_fosfato, que derivan hacia transportador_fosfato."
  - id: v5_nucleacion
    titulo: "Nace el cristal"
    texto: "Cuando el producto de calcio por fosfato supera el umbral, se forman cúmulos de fosfato de calcio amorfo sobre la membrana interna. Luego se ordenan en cristales de hidroxiapatita todavía diminutos. Esta aparición del primer cristal se llama nucleación."
    escena: "En lumen_vesicula aparece cristal_hidroxiapatita como un pequeño agrupamiento. Los iones_calcio y iones_fosfato cercanos desaparecen."
  - id: v6_ruptura
    titulo: "El cristal crece y rompe la membrana"
    texto: "Los cristales en forma de aguja crecen hacia afuera y perforan la membrana. Ya en contacto con el líquido extracelular, siguen creciendo con el calcio y el fosfato del entorno. El conjunto forma un nódulo mineral."
    escena: "cristal_hidroxiapatita se alarga en forma de estrella, atraviesa membrana_vesicula y esta se abre; lumen_vesicula desaparece."
  - id: v7_colageno
    titulo: "Del nódulo a la fibrilla"
    texto: "En el modelo clásico, el nódulo mineral toca las fibrillas de colágeno vecinas. Desde ese contacto, el mineral se propaga por la fibrilla y entre las fibrillas, guiado por el colágeno y las proteínas no colágenas. Ese proceso se estudia en la sección 4.4."
    escena: "cristal_hidroxiapatita se une a fibrilla_colageno y una franja de mineral avanza a lo largo de la fibrilla. Aparece la etiqueta 'sección 4.4'."
```

##### Actividad m4_arrastre_mineralizacion

```yaml
tipo: arrastre-molecular
titulo: "Lleva cada molécula a su sitio en la vesícula"
instrucciones: "Toca o arrastra cada molécula hasta la estructura que la transporta, la cataliza o a la que se une (con teclado, Tab y Enter). Algunas no encajan en ningún sitio: déjalas sin colocar. Los errores restan un poco de puntaje."
obligatoria: true
puntaje_max: 40
concepto: "Calcio, fosfato, fosfatasa alcalina y pirofosfato en la mineralización"
retroalimentacion:
  acierto: "Excelente: cada molécula está en su sitio. Viste cómo el calcio y el fosfato entran, cómo la TNAP retira el pirofosfato y cómo este frena el cristal."
  error: "Esa estructura no transporta, cataliza ni une a esa molécula. Cada molécula tiene un solo sitio aquí: lee su descripción y la de los lugares."
svg: m4_vesicula_matriz
escena: "Una vesícula de matriz recién brotada del osteoblasto, en el osteoide, con un canal de anexina y un transportador de fosfato en su membrana, TNAP anclada por fuera y un cristal de hidroxiapatita naciente. Las moléculas esperan en una bandeja debajo de la escena."
moleculas:
  - id: calcio
    nombre: "Ion calcio (Ca2+)"
    descripcion: "Catión que forma el mineral junto con el fosfato. Es un ion pequeño y con carga: no cruza solo la membrana."
    rechazo: "El calcio sí llega al interior de la vesícula, pero solo cruzando la membrana por un canal. Aquí se pide la estructura que lo transporta."
  - id: fosfato
    nombre: "Fosfato inorgánico (Pi)"
    descripcion: "Anión que se combina con el calcio. Es un ion con carga: necesita una proteína de la membrana para entrar a la vesícula."
    rechazo: "El fosfato se acumula dentro, pero para entrar necesita una proteína transportadora de la membrana. Busca la que lo introduce."
  - id: phospho1
    nombre: "PHOSPHO1"
    descripcion: "Fosfatasa que libera fosfato a partir de fosfocolina y fosfoetanolamina."
    rechazo: "PHOSPHO1 es una enzima que trabaja dentro de la vesícula: no está en la superficie ni forma parte de un canal de la membrana."
  - id: tnap
    nombre: "Fosfatasa alcalina (TNAP)"
    descripcion: "Ectoenzima anclada por GPI: hidroliza pirofosfato y ATP en el medio extracelular."
    rechazo: "La TNAP queda anclada por fuera de la membrana y actúa sobre el pirofosfato extracelular; no está dentro de la vesícula ni en un canal."
  - id: pirofosfato
    nombre: "Pirofosfato inorgánico (PPi)"
    descripcion: "Dos fosfatos unidos. Inhibidor que frena la formación y el crecimiento del cristal."
    rechazo: "El PPi se forma y se hidroliza fuera de la vesícula, pero su efecto de frenar el cristal lo ejerce al unirse a él. Aquí se pide dónde se une."
receptores:
  - id: canal_anexina
    nombre: "Canal de anexina"
    descripcion: "Canal de la membrana de la vesícula por donde cruza el Ca2+ y que lo une a la fosfatidilserina."
  - id: transportador_fosfato
    nombre: "Transportador PiT-1"
    descripcion: "Cotransportador de fosfato y sodio de la membrana de la vesícula."
  - id: lumen_vesicula
    nombre: "Interior de la vesícula"
    descripcion: "Compartimento cerrado de la vesícula: sitio donde actúa una enzima que produce fosfato."
  - id: membrana_vesicula
    nombre: "Cara externa de la membrana"
    descripcion: "Superficie de la vesícula que da al osteoide: sitio de anclaje de una ectoenzima."
  - id: cristal_hidroxiapatita
    nombre: "Cristal de hidroxiapatita"
    descripcion: "Superficie del cristal naciente: sitio donde se adsorbe un inhibidor de su crecimiento."
pares:
  - molecula: calcio
    receptor: canal_anexina
    efecto:
      titulo: "El calcio entra a la vesícula"
      descripcion: "Los canales que forman las anexinas permiten el paso de Ca2+. Dentro, la fosfatidilserina de la hoja interna lo retiene y lo concentra."
      anima: "El canal se abre y cinco iones Ca2+ pasan al interior y se adhieren a la cara interna de la membrana. El indicador de calcio intravesicular sube."
  - molecula: fosfato
    receptor: transportador_fosfato
    efecto:
      titulo: "El fosfato entra a la vesícula"
      descripcion: "PiT-1 introduce fosfato inorgánico. Cuando el calcio y el fosfato acumulados superan el umbral, se forman cúmulos de fosfato de calcio amorfo."
      anima: "Iones Pi cruzan el transportador y el indicador de fosfato sube. Si el calcio ya entró, aparece un cúmulo amorfo pequeño en la cara interna de la membrana."
  - molecula: phospho1
    receptor: lumen_vesicula
    efecto:
      titulo: "PHOSPHO1 genera fosfato dentro de la vesícula"
      descripcion: "La enzima corta fosfocolina y fosfoetanolamina, derivadas de los fosfolípidos de la membrana, y libera Pi dentro de la vesícula sin depender del transporte."
      anima: "Dos moléculas de fosfocolina se parten y aparecen iones Pi dentro de la vesícula. El indicador de fosfato sube."
  - molecula: tnap
    receptor: membrana_vesicula
    efecto:
      titulo: "La TNAP retira el freno"
      descripcion: "Anclada por GPI a la cara externa de la membrana, hidroliza el pirofosfato en dos fosfatos: quita el inhibidor y agrega fosfato disponible."
      anima: "La enzima se fija a la membrana. Las moléculas de PPi cercanas se parten en pares de Pi, el contador de PPi baja y los Pi se dirigen al transportador."
  - molecula: pirofosfato
    receptor: cristal_hidroxiapatita
    efecto:
      titulo: "El pirofosfato frena el crecimiento del cristal"
      descripcion: "El PPi se adsorbe a la superficie del cristal e impide que se le añadan más iones. Bastan concentraciones micromolares."
      anima: "Moléculas de PPi cubren las caras del cristal, las flechas de crecimiento desaparecen y el cristal se atenúa y se pone rojo. Si la TNAP ya está colocada, el PPi se parte y el cristal recupera su color y vuelve a crecer."
distractores:
  - id: trap
    nombre: "Fosfatasa ácida resistente al tartrato (TRAP)"
    descripcion: "Enzima del osteoclasto."
    motivo: "Actúa a pH ácido en la laguna de resorción y no participa en el inicio de la mineralización."
  - id: rankl
    nombre: "RANKL"
    descripcion: "Ligando que activa la diferenciación de los osteoclastos."
    motivo: "Es una señal de resorción; no interviene en la nucleación del cristal."
  - id: catepsina_k
    nombre: "Catepsina K"
    descripcion: "Proteasa del osteoclasto que degrada colágeno tipo I."
    motivo: "Destruiría la plantilla de colágeno; actúa en la resorción, no en la mineralización."
```

##### Actividad m4_3_quiz_vesiculas

```yaml
tipo: quiz
titulo: "Vesículas, fosfatasas y pirofosfato"
instrucciones: "Responde las cuatro preguntas. Elige tocando una opción, o con teclado usa Tab, las flechas y Enter. Este refuerzo es opcional, pero suma puntos y verás la explicación tras cada respuesta."
obligatoria: false
puntaje_max: 40
concepto: "Vesículas de matriz, TNAP, PHOSPHO1 y pirofosfato"
retroalimentacion:
  acierto: "Muy bien: distingues quién impulsa y quién frena la mineralización dentro y fuera de la vesícula."
  error: "Repasa la tabla de la vesícula y la del pirofosfato: PHOSPHO1 actúa dentro; TNAP, fuera."
preguntas:
  - id: m4_q_ves_phospho1
    formato: opcion_multiple
    enunciado: "¿Cuál es la función principal de PHOSPHO1?"
    opciones:
      - id: a
        texto: "Hidrolizar el pirofosfato de la matriz extracelular, fuera de la vesícula."
      - id: b
        texto: "Generar pirofosfato a partir de ATP en la superficie de las células óseas."
      - id: c
        texto: "Liberar fosfato dentro de la vesícula desde fosfocolina y fosfoetanolamina."
      - id: d
        texto: "Exportar ATP desde el citoplasma hacia el espacio extracelular de la matriz."
    correcta: c
    explicacion: "PHOSPHO1 actúa dentro de la vesícula sobre los productos de degradación de los fosfolípidos y produce fosfato. Hidrolizar PPi es función de la TNAP, generarlo a partir de ATP la hace ENPP1 y exportar ese ATP, ANKH [verificar]."
    dificultad: 2
    concepto: "PHOSPHO1"
  - id: m4_q_ves_tnap_efecto
    formato: opcion_multiple
    enunciado: "¿Qué efecto tiene la hidrólisis del pirofosfato por la TNAP sobre la mineralización?"
    opciones:
      - id: a
        texto: "Retira un inhibidor del crecimiento del cristal y aporta fosfato inorgánico."
      - id: b
        texto: "Aumenta la concentración de pirofosfato y así frena el crecimiento del cristal."
      - id: c
        texto: "Sintetiza colágeno tipo I para la matriz del osteoide."
      - id: d
        texto: "Fosforila la osteopontina para activarla como nucleadora."
    correcta: a
    explicacion: "La TNAP rompe el PPi en dos fosfatos: elimina el inhibidor y suma fosfato al medio. No fosforila proteínas (más bien se ha descrito que desfosforila la osteopontina) ni participa en la síntesis de colágeno."
    dificultad: 2
    concepto: "Fosfatasa alcalina y pirofosfato"
  - id: m4_q_ves_ppi_vf
    formato: verdadero_falso
    enunciado: "El pirofosfato inorgánico favorece el crecimiento de los cristales de hidroxiapatita."
    correcta: false
    explicacion: "Es falso: el PPi se adsorbe al cristal y frena su crecimiento. Por eso la TNAP, que lo hidroliza, favorece la mineralización."
    dificultad: 1
    concepto: "Pirofosfato como inhibidor"
  - id: m4_q_ves_anexinas
    formato: opcion_multiple
    enunciado: "¿Qué proteínas de la vesícula de matriz forman canales de Ca2+ y se unen a la fosfatidilserina?"
    opciones:
      - id: a
        texto: "Integrinas."
      - id: b
        texto: "Cadherinas."
      - id: c
        texto: "Conexinas."
      - id: d
        texto: "Anexinas."
    correcta: d
    explicacion: "Las anexinas A2, A5 y A6 se unen a calcio y a fosfolípidos y funcionan como canales de Ca2+. Las integrinas y las cadherinas median adhesión y las conexinas forman las uniones comunicantes entre células."
    dificultad: 1
    concepto: "Anexinas"
```

### Seccion 4.4: Hidroxiapatita, del cristal a la fibrilla

id: "m4_4_hidroxiapatita"

#### Contenido

**El mineral óseo**

El mineral del hueso es una **hidroxiapatita**, Ca10(PO4)6(OH)2, cuya relación calcio/fósforo estequiométrica es 1,67. La del hueso es *carbonatada* (parte de sus iones está sustituida por carbonato), deficiente en calcio y de cristales pequeños y poco perfectos. Son placas o láminas de unos pocos nanómetros de grosor (aproximadamente 2 a 7 nm) y decenas de nanómetros de largo y ancho (aproximadamente 15 a 150 nm) [verificar].

Esta pequeñez importa: la superficie total de cristal es enorme, y eso permite un intercambio rápido de iones con el líquido extracelular. Por eso el hueso funciona como reservorio de calcio y fosfato.

**Nucleación y crecimiento**

- **Nucleación:** aparición de los primeros cristales. Necesita una solución sobresaturada y una superficie que rebaje la barrera de energía: los complejos de fosfatidilserina, calcio y fosfato de la vesícula y, más tarde, el colágeno junto con las proteínas no colágenas.
- **Crecimiento:** los cristales se agrandan al incorporar iones. Los inhibidores (pirofosfato, osteopontina fosforilada) lo frenan y los promotores lo aceleran.

La evidencia sugiere que el mineral aparece primero como fosfato de calcio amorfo que después se transforma en apatita, pero los detalles in vivo siguen en debate [verificar].

**Dos escenarios espaciales, en el modelo clásico**

1. **Dentro de la vesícula** (sección 4.3): nacen los primeros cristales, que rompen la membrana y forman un nódulo.
2. **Sobre y dentro del colágeno:** el nódulo toca las fibrillas y desde ese punto el mineral avanza a lo largo de ellas y entre ellas.

No todo el mineral tiene por qué partir de vesículas. En la dentina circumpulpar el mineral se forma sobre el colágeno con ayuda de proteínas no colágenas, y en el hueso laminar maduro no se sabe con certeza cuánto mineral nace de vesículas [verificar].

En relación con la fibrilla, el mineral se coloca de dos maneras:

- **Intrafibrilar:** cristales dentro de la fibrilla, en las zonas de hueco y en los surcos que forman. Su eje c, el eje largo del cristal, queda paralelo al eje mayor de la fibrilla.
- **Extrafibrilar:** agregados de cristales entre fibrillas vecinas.

Cuánto mineral hay en cada compartimento es un asunto en revisión: las estimaciones van desde "la mayor parte es intrafibrilar" hasta "aproximadamente el 70 % es extrafibrilar" [verificar]. Lo que todos aceptan es que ambos compartimentos existen y que la organización resultante hace al hueso resistente.

[Figura: m4_fibrilla_mineralizada | Cristales dentro de las zonas de hueco y agregados entre fibrillas. Esquema sin escala.]

**Implantes dentales y mineralización**

> Clinico: Un implante dental se fija a la mandíbula por **osteointegración**: una unión directa entre el hueso alveolar y la superficie del titanio. Es la mineralización de este módulo aplicada a la clínica. Los osteoblastos llegan a la superficie del implante, secretan osteoide y este se mineraliza (osteogénesis por contacto) [verificar]. Después el remodelado sigue renovando ese hueso mientras el implante funciona. Si la mineralización o el recambio del hueso alveolar están alterados, la integración puede ser menos favorable.

> Dato: a medida que crece el mineral, el agua de la matriz es desplazada. Por eso el contenido de agua y el de mineral varían en sentido inverso.

> Recuerda: en el modelo clásico, la mineralización tiene dos tiempos. Primero, las vesículas inician el cristal. Después, el colágeno y las proteínas no colágenas guían su crecimiento.

> Atencion: el mineral no "rellena" huecos de forma pasiva. Dónde y cuánto se deposita depende de proteínas que promueven o inhiben el crecimiento del cristal (sección 4.5).

#### Actividades

##### Actividad m4_fibrilla_mineralizada_multicapa

```yaml
tipo: multicapa
titulo: "Mineral dentro y entre las fibrillas"
instrucciones: "Explora la fibrilla mineralizada. Toca cada capa (o pasa el cursor, o usa Tab y Enter) para leer qué muestra. Puedes activar y desactivar capas con los botones bajo la imagen. Debes visitar el nódulo, los cristales intrafibrilares, los extrafibrilares y el eje c."
obligatoria: true
puntaje_max: 25
concepto: "Mineral intrafibrilar y extrafibrilar"
retroalimentacion:
  acierto: "Bien: el mineral se reparte dentro de la fibrilla, en los huecos, y entre fibrillas, y sus cristales se alinean con el eje de la fibrilla."
  error: "Te faltan capas por visitar. Explora las que aún no tienen marca."
svg: m4_fibrilla_mineralizada
modo: explorar
capas:
  - id: fibrilla_colageno
    etiqueta: "Fibrilla de colágeno"
    descripcion: "La plantilla ordenada que se ha estudiado en la sección 4.2."
  - id: zona_hueco
    etiqueta: "Zona de hueco"
    descripcion: "Espacio entre moléculas donde se forman los primeros cristales intrafibrilares, según el modelo clásico."
  - id: nodulo_mineral
    etiqueta: "Nódulo mineral de origen vesicular"
    descripcion: "Agregado de cristales que salió de la vesícula de matriz. Toca la fibrilla y desde ahí se propaga el mineral."
  - id: cristales_intrafibrilares
    etiqueta: "Cristales intrafibrilares"
    descripcion: "Cristales dentro de la fibrilla, en las zonas de hueco y en los surcos que estas forman."
  - id: cristales_extrafibrilares
    etiqueta: "Cristales extrafibrilares"
    descripcion: "Agregados de cristales entre fibrillas vecinas. La proporción respecto del mineral intrafibrilar se discute [verificar]."
  - id: eje_c_cristales
    etiqueta: "Eje c de los cristales"
    descripcion: "El eje largo de los cristales queda paralelo al eje mayor de la fibrilla."
requeridas:
  - nodulo_mineral
  - cristales_intrafibrilares
  - cristales_extrafibrilares
  - eje_c_cristales
```

##### Actividad m4_orden_mineralizacion

```yaml
tipo: quiz
titulo: "Ordena los pasos de la mineralización"
instrucciones: "Ordena los seis pasos, desde la secreción del osteoide hasta el hueso maduro. Arrastra cada paso con el dedo o el mouse; con teclado, Enter para tomarlo, flechas para moverlo y Enter para soltarlo."
obligatoria: true
puntaje_max: 30
concepto: "Secuencia de la mineralización"
retroalimentacion:
  acierto: "Secuencia correcta: primero la matriz con sus vesículas, luego el cristal, después el colágeno y por último la maduración."
  error: "Piensa en el orden causal del modelo clásico: la vesícula cargada de iones precede al cristal, y el cristal precede al mineral que se propaga por la fibrilla."
preguntas:
  - id: m4_q_orden_mineralizacion
    formato: ordenar_pasos
    enunciado: "Ordena los pasos de la mineralización del osteoide, del primero al último."
    pasos:
      - id: p_fibrilla
        texto: "El mineral se deposita en las zonas de hueco de las fibrillas y entre ellas, guiado por proteínas no colágenas."
      - id: p_iones
        texto: "La vesícula concentra Ca2+ y Pi (anexinas, PiT-1 y PHOSPHO1) mientras la TNAP retira el pirofosfato."
      - id: p_maduracion
        texto: "El mineral aumenta y madura durante meses o años (mineralización secundaria)."
      - id: p_osteoide
        texto: "El osteoblasto secreta el osteoide y libera vesículas de matriz hacia él."
      - id: p_ruptura
        texto: "Los cristales perforan la membrana de la vesícula y crecen en el espacio extracelular."
      - id: p_cristal
        texto: "Dentro de la vesícula se forman los primeros cristales de hidroxiapatita a partir de fosfato de calcio amorfo."
    correcta:
      - p_osteoide
      - p_iones
      - p_cristal
      - p_ruptura
      - p_fibrilla
      - p_maduracion
    explicacion: "En el modelo clásico, el osteoide es la plantilla y las vesículas cargadas de iones originan el cristal. El mineral se extiende por el colágeno después de que los cristales salen de la vesícula, y la maduración es la fase final y más lenta. En el hueso laminar maduro no se sabe con certeza si todo el mineral parte de vesículas [verificar]."
    dificultad: 2
    concepto: "Secuencia de la mineralización"
```

##### Actividad m4_4_quiz_hidroxiapatita

```yaml
tipo: quiz
titulo: "Hidroxiapatita: refuerzo"
instrucciones: "Responde las tres preguntas tocando una opción, o con teclado usa Tab, las flechas y Enter. Este refuerzo es opcional, pero suma puntos."
obligatoria: false
puntaje_max: 30
concepto: "Hidroxiapatita y su ubicación en la fibrilla"
retroalimentacion:
  acierto: "Muy bien: relacionas el tamaño del cristal con la función de reservorio y ubicas el mineral en la fibrilla."
  error: "Repasa las dos ubicaciones del mineral, dentro y entre las fibrillas, y por qué los cristales pequeños son ventajosos."
preguntas:
  - id: m4_q_ha_reservorio
    formato: opcion_multiple
    enunciado: "¿Por qué el tamaño nanométrico de los cristales favorece el papel del hueso como reservorio de iones?"
    opciones:
      - id: a
        texto: "Porque los cristales pequeños solo liberan calcio cuando un osteoclasto los disuelve."
      - id: b
        texto: "Porque su gran superficie total facilita el intercambio de iones con el líquido."
      - id: c
        texto: "Porque el colágeno los aísla del líquido y solo cambian cuando se resorbe el hueso."
      - id: d
        texto: "Porque cada cristal pequeño contiene más calcio que uno grande y lo libera antes."
    correcta: b
    explicacion: "Cuanto más pequeño es el cristal, mayor es su superficie por gramo. Eso acelera el intercambio con el líquido extracelular, y por eso el hueso puede liberar o captar calcio y fosfato con rapidez."
    dificultad: 2
    concepto: "Cristales de hidroxiapatita"
  - id: m4_q_ha_todo_intra
    formato: verdadero_falso
    enunciado: "Todo el mineral del hueso se encuentra dentro de las fibrillas de colágeno."
    correcta: false
    explicacion: "Es falso: hay mineral intrafibrilar y también extrafibrilar, entre las fibrillas. Cuánto hay en cada compartimento se discute, pero ambos existen."
    dificultad: 1
    concepto: "Mineral intrafibrilar y extrafibrilar"
  - id: m4_q_ha_eje_c
    formato: opcion_multiple
    enunciado: "En las fibrillas mineralizadas, ¿cómo se orienta el eje c de los cristales de apatita?"
    opciones:
      - id: a
        texto: "Perpendicular al eje mayor de la fibrilla."
      - id: b
        texto: "Al azar, sin relación con la fibrilla."
      - id: c
        texto: "En espiral alrededor de la fibrilla."
      - id: d
        texto: "Paralelo al eje mayor de la fibrilla."
    correcta: d
    explicacion: "Los cristales se alinean con el eje largo de la fibrilla. Esta organización es una de las claves de la resistencia del hueso."
    dificultad: 2
    concepto: "Orientación del cristal"
```

### Seccion 4.5: Proteínas no colágenas, los reguladores del cristal

id: "m4_5_proteinas_no_colagenas"

#### Contenido

Aproximadamente el 10 % de la matriz orgánica no es colágeno. Estas proteínas las sintetizan sobre todo osteoblastos y osteocitos, y regulan **dónde** empieza el mineral, **cuánto** crece y **hacia dónde** se orienta. Algunas actúan como *nucleadoras* (lo promueven) y otras como *inhibidoras* (lo frenan). Muchas hacen ambas cosas según su grado de fosforilación y su procesamiento.

Tres de las cuatro proteínas de la tabla (osteopontina, sialoproteína ósea y DMP1) pertenecen a la familia **SIBLING** (glucoproteínas pequeñas con motivo de unión a integrinas), junto con MEPE y DSPP. Son ácidas, muy fosforiladas y llevan la secuencia RGD que reconocen las integrinas.

| Proteína | La produce | Rasgos | Papel en la mineralización |
|---|---|---|---|
| Osteocalcina (gen *BGLAP*) | Osteoblastos maduros | 49 aminoácidos, con tres residuos de γ-carboxiglutamato (Gla) que requieren vitamina K | Se une al calcio y a la hidroxiapatita. Regula el tamaño y la orientación del cristal, pero no parece esencial para iniciarlo [verificar]. Pasa a la sangre y se usa como marcador de formación |
| Osteopontina (*SPP1*) | Osteoblastos, osteocitos y osteoclastos | SIBLING, muy fosforilada, con RGD | Inhibe la formación y el crecimiento del cristal, sobre todo cuando está fosforilada. Ancla al osteoclasto a la matriz por la integrina αvβ3 |
| Sialoproteína ósea (*IBSP*) | Osteoblastos, odontoblastos, cementoblastos y condrocitos hipertróficos | SIBLING muy glucosilada, con tramos de ácido poliglutámico y RGD | Se une al calcio y nuclea hidroxiapatita in vitro. Abunda donde empieza la mineralización |
| DMP1 | Osteocitos y odontoblastos | SIBLING ácida que se procesa en fragmentos. El fragmento C-terminal fosforilado se ubica en la matriz alrededor de los canalículos y se une al calcio | Promueve la mineralización de la matriz y frena la expresión de FGF23 en el osteocito |

Otras proteínas también participan:

- **Osteonectina (SPARC):** se une a colágeno y a hidroxiapatita.
- **Decorina y biglicano:** proteoglucanos que se unen al colágeno y frenan el crecimiento del cristal. Su cantidad disminuye hacia el frente de mineralización.
- **Proteína Gla de matriz (MGP) y fetuína-A:** inhibidores de la calcificación en cartílago, vasos y sangre. MGP necesita, como la osteocalcina, vitamina K.

La idea central es un **equilibrio entre promotores e inhibidores**: sialoproteína ósea y DMP1 impulsan; osteopontina fosforilada, pirofosfato y proteoglucanos frenan. La TNAP inclina la balanza a favor de la mineralización por partida doble, porque hidroliza el pirofosfato y, según se ha descrito, también desfosforila la osteopontina.

> Clinico: la pérdida de función de *DMP1* causa raquitismo hipofosfatémico autosómico recesivo tipo 1. El osteocito produce demasiado FGF23, el riñón pierde fosfato por la orina y la matriz no se mineraliza bien.

> Dato: la vitamina K es cofactor de la γ-glutamil carboxilasa. Al bloquear su ciclo (por ejemplo con warfarina), la osteocalcina queda poco carboxilada y se une peor a la hidroxiapatita.

> Atencion: "no colágena" no significa "promueve la mineralización". Varias de estas proteínas la inhiben, y otras hacen las dos cosas según su fosforilación.

#### Actividades

##### Actividad m4_relacion_ncp

```yaml
tipo: relacion-columnas
titulo: "Proteínas no colágenas y su función"
instrucciones: "Une cada proteína con su descripción: toca una y luego la otra, o arrástrala hasta ella; con teclado, Tab y Enter. Sobran dos descripciones que no corresponden a ninguna proteína."
obligatoria: true
puntaje_max: 40
concepto: "Funciones de las proteínas no colágenas"
retroalimentacion:
  acierto: "Correcto: cada proteína cumple un papel distinto, de nucleadora, inhibidora o reguladora de la fosfatemia."
  error: "Alguna pareja no coincide. Recuerda: la osteocalcina depende de vitamina K; la osteopontina inhibe; la sialoproteína ósea nuclea; DMP1 es del osteocito y restringe la producción de FGF23."
izquierda:
  - id: l_osteocalcina
    texto: "Osteocalcina"
  - id: l_osteopontina
    texto: "Osteopontina"
  - id: l_bsp
    texto: "Sialoproteína ósea"
  - id: l_dmp1
    texto: "DMP1"
derecha:
  - id: r_gla
    texto: "Tiene residuos Gla dependientes de vitamina K, se une a la hidroxiapatita y se mide en sangre como marcador de formación."
  - id: r_opn
    texto: "Fosfoproteína muy fosforilada con secuencia RGD: inhibe el crecimiento del cristal y ancla al osteoclasto."
  - id: r_bsp
    texto: "Glucoproteína con tramos de ácido poliglutámico que nuclea la hidroxiapatita al comenzar la mineralización."
  - id: r_dmp1
    texto: "Proteína del osteocito que une calcio alrededor de los canalículos y restringe la producción de FGF23; su ausencia causa raquitismo."
  - id: r_dist_catepsina
    texto: "Enzima del osteoclasto que degrada el colágeno tipo I durante la resorción."
  - id: r_dist_calcitriol
    texto: "Hormona que aumenta la absorción intestinal de calcio y de fosfato."
pares:
  - izquierda: l_osteocalcina
    derecha: r_gla
    explicacion: "La osteocalcina tiene tres residuos Gla que requieren vitamina K, une la hidroxiapatita y su nivel en sangre indica formación ósea."
  - izquierda: l_osteopontina
    derecha: r_opn
    explicacion: "La osteopontina fosforilada inhibe el crecimiento del cristal y, por su secuencia RGD, ancla al osteoclasto mediante integrinas."
  - izquierda: l_bsp
    derecha: r_bsp
    explicacion: "La sialoproteína ósea se une al calcio con sus tramos de ácido poliglutámico y nuclea la hidroxiapatita al iniciar la mineralización."
  - izquierda: l_dmp1
    derecha: r_dmp1
    explicacion: "DMP1 promueve la mineralización alrededor de los canalículos y restringe la producción de FGF23; sin ella hay hipofosfatemia."
```

##### Actividad m4_5_quiz_ncp

```yaml
tipo: quiz
titulo: "Proteínas no colágenas: refuerzo"
instrucciones: "Responde las tres preguntas tocando una opción, o con teclado usa Tab, las flechas y Enter. Este refuerzo es opcional, pero suma puntos."
obligatoria: false
puntaje_max: 30
concepto: "Proteínas no colágenas: vitamina K, inhibición y DMP1"
retroalimentacion:
  acierto: "Bien: reconoces que las proteínas no colágenas se reparten entre promotoras e inhibidoras."
  error: "Repasa la tabla de proteínas y el equilibrio entre promotores e inhibidores."
preguntas:
  - id: m4_q_ncp_vitk
    formato: opcion_multiple
    enunciado: "¿Cuál de estas proteínas óseas depende de la vitamina K para su carboxilación?"
    opciones:
      - id: a
        texto: "Osteopontina."
      - id: b
        texto: "Osteocalcina."
      - id: c
        texto: "Sialoproteína ósea."
      - id: d
        texto: "DMP1."
    correcta: b
    explicacion: "La osteocalcina tiene tres residuos de γ-carboxiglutamato que se forman con vitamina K. Las otras tres son SIBLING y se modifican sobre todo por fosforilación y glucosilación."
    dificultad: 2
    concepto: "Osteocalcina"
  - id: m4_q_ncp_todas_promueven
    formato: verdadero_falso
    enunciado: "Todas las proteínas no colágenas del hueso promueven la mineralización."
    correcta: false
    explicacion: "Es falso: la osteopontina fosforilada, los proteoglucanos como la decorina y la MGP frenan el crecimiento del cristal. La mineralización depende del equilibrio entre promotoras e inhibidoras."
    dificultad: 1
    concepto: "Equilibrio entre promotores e inhibidores"
  - id: m4_q_ncp_dmp1
    formato: opcion_multiple
    enunciado: "¿Qué se espera en una persona con pérdida de función de DMP1?"
    opciones:
      - id: a
        texto: "Hiperfosfatemia con FGF23 disminuido y calcificación de tejidos blandos."
      - id: b
        texto: "Colágeno tipo I estructuralmente anómalo."
      - id: c
        texto: "Aumento de la resorción por osteoclastos hiperactivos."
      - id: d
        texto: "Hipofosfatemia con FGF23 elevado y defecto de mineralización."
    correcta: d
    explicacion: "Sin DMP1, el osteocito aumenta la producción de FGF23, el riñón elimina fosfato y la matriz se mineraliza mal, con raquitismo u osteomalacia. La opción a describe lo contrario; la b corresponde a la osteogénesis imperfecta."
    dificultad: 3
    concepto: "DMP1 y FGF23"
```

### Seccion 4.6: Frente de mineralización, fases y marcadores de formación

id: "m4_6_frente_y_fases"

#### Contenido

**El frente de mineralización**

El **frente de mineralización** es el límite entre el osteoide y el hueso ya mineralizado. Avanza hacia la superficie a medida que el osteoblasto añade matriz y la matriz más antigua se mineraliza. De la superficie hacia el interior se ven osteoblastos, osteoide, frente y hueso mineralizado; dentro de este, los osteocitos con sus canalículos.

Entre el depósito del osteoide y su mineralización pasa un tiempo, el *tiempo de retardo de mineralización* (se calcula más abajo). En adultos sanos es del orden de decenas de días (aproximadamente 10 a 50) y en la osteomalacia supera los 100 días; los umbrales exactos varían entre autores [verificar].

[Figura: m4_frente_mineralizacion | Corte de una superficie ósea en formación. Toca cada capa para ver su papel.]

**Marcaje doble con tetraciclina**

La tetraciclina se fija al mineral en formación y emite fluorescencia. Al dar dos ciclos separados por un intervalo conocido, la biopsia muestra dos líneas paralelas. La **tasa de aposición mineral** (MAR) es la distancia entre las líneas dividida por los días entre ciclos. En el hueso trabecular del adulto sano es de aproximadamente 0,5 a 0,8 µm por día [verificar].

Con la MAR se calculan dos tiempos. El **tiempo de maduración del osteoide** es el grosor de la costura dividido entre la MAR. *Ejemplo:* con una costura de 10 µm y una MAR de 0,6 µm/día, son aproximadamente 17 días (10 ÷ 0,6).

El **tiempo de retardo de mineralización** se calcula igual, pero con la MAR corregida por la fracción de la superficie osteoide que está mineralizando (MAR × MS/OS, donde MS/OS es la superficie con marca dividida entre la superficie osteoide total). Como esa fracción es menor que 1, el tiempo de retardo resulta mayor que el de maduración. Los umbrales de este módulo (10 a 50 días en sanos, más de 100 en osteomalacia) se refieren al tiempo de retardo [verificar].

En la osteomalacia las líneas son borrosas, únicas o no aparecen.

> Clinico: por la misma afinidad por el mineral en formación, la tetraciclina se incorpora a la dentina de los dientes en desarrollo y los tiñe de amarillo o marrón. Por eso se evita en el embarazo y en niños pequeños.

**Mineralización primaria y secundaria**

| Fase | Ritmo | Qué ocurre | Resultado |
|---|---|---|---|
| Primaria | Rápida: días a pocas semanas | Vesículas, nódulos y depósito inicial en el colágeno | Aproximadamente 60 a 70 % del contenido mineral máximo [verificar] |
| Secundaria | Lenta: meses a años | Se añaden más cristales y estos crecen y maduran; se propone que participa la red de osteocitos [verificar] | La matriz se acerca a su máximo de mineral |

Como el hueso se renueva por remodelado, el grado promedio de mineralización depende del recambio. Con un recambio alto hay más matriz joven, poco mineralizada, y el promedio baja. Con un recambio bajo, la matriz envejece y el promedio sube.

> Atencion: "primaria" y "secundaria" aquí son fases de la *mineralización*. No las confundas con hueso primario (trenzado) y secundario (laminar), que describen la arquitectura de la matriz.

**Regiones de la mandíbula**

En la mandíbula esta relación se ve bien. El borde basal y la cortical del cuerpo son hueso de recambio lento, con una matriz más envejecida y, en promedio, muy mineralizada. El proceso alveolar se renueva más rápido: su matriz es más joven y, en promedio, menos mineralizada. Por eso el hueso alveolar responde antes a los cambios de calcio, fosfato y PTH [verificar]. Estas diferencias por región se conocen con menos firmeza que el principio general.

**La lámina dura en la radiografía**

> Clinico: La lámina dura, la cortical fina y muy mineralizada que reviste el alvéolo, se ve como una línea radiopaca alrededor de la raíz. Se ve blanca porque el haz de rayos X atraviesa de canto una pared de hueso mineralizado y suma mucho espesor. Es un reflejo indirecto de la mineralización y del recambio del hueso alveolar. Su pérdida o su adelgazamiento orientan hacia una enfermedad metabólica ósea, pero no es un signo sensible: en el hiperparatiroidismo secundario la pérdida completa es poco frecuente [verificar].

**Marcadores bioquímicos de formación**

Cuando el osteoblasto forma matriz y la mineraliza, deja huellas medibles en la sangre.

| Marcador | Qué es | Qué refleja | Notas |
|---|---|---|---|
| P1NP | Propéptido N-terminal del procolágeno tipo I, que se libera al cortarse el procolágeno (paso 4 de la sección 4.2) | Síntesis de colágeno por los osteoblastos | Marcador de referencia de formación según IOF e IFCC |
| Fosfatasa alcalina ósea (BSAP o BALP) | Isoforma ósea de la TNAP en el suero | Actividad del osteoblasto | La fosfatasa alcalina total incluye la del hígado; medir la ósea permite distinguirlas |
| Osteocalcina | Proteína de osteoblastos maduros, circula intacta y fragmentada | Actividad osteoblástica tardía | Es inestable en la muestra y depende de la función renal |

Como contraste, el CTX (fragmento del telopéptido C del colágeno I) es el marcador de referencia de *resorción*, no de formación. Requiere una muestra en ayunas y por la mañana porque varía a lo largo del día.

> Recuerda: los marcadores de formación reflejan el trabajo del osteoblasto; no muestran por sí solos si la matriz se está mineralizando bien. En la osteomalacia carencial la fosfatasa alcalina total suele estar elevada, y en la hipofosfatasia, baja (sección 4.8).

#### Actividades

##### Actividad m4_multicapa_frente

```yaml
tipo: multicapa
titulo: "El frente de mineralización, capa por capa"
instrucciones: "Lee cada pista y toca en el corte la estructura que describe (con teclado, Tab y Enter). Al acertar lees su ficha. Debes ubicar cuatro estructuras."
obligatoria: true
puntaje_max: 30
concepto: "Frente de mineralización"
retroalimentacion:
  acierto: "Bien: ubicas el frente como el límite entre el osteoide blando y el hueso mineralizado, con el osteocito ya incluido en la matriz."
  error: "Esa no es la estructura de la pista. Recuerda el orden de la superficie hacia el interior: osteoblastos, osteoide, frente, hueso mineralizado, osteocito."
svg: m4_frente_mineralizacion
modo: identificar
capas:
  - id: osteoblastos
    etiqueta: "Osteoblastos"
    descripcion: "Capa de células que secretan el osteoide sobre la superficie ósea y liberan vesículas de matriz."
  - id: osteoide
    etiqueta: "Osteoide"
    descripcion: "Matriz recién secretada, sin mineral. En hueso normal la costura mide aproximadamente 10 µm [verificar]. Un grosor mucho mayor sugiere retraso de la mineralización."
    pista: "La capa de matriz blanda recién secretada que aún no tiene mineral, entre las células de superficie y el hueso duro."
  - id: vesiculas_matriz
    etiqueta: "Vesículas de matriz"
    descripcion: "Pequeñas vesículas en el osteoide, donde nacen los primeros cristales (sección 4.3)."
  - id: frente_mineralizacion
    etiqueta: "Frente de mineralización"
    descripcion: "Límite entre el osteoide y el hueso mineralizado. Avanza hacia la superficie a medida que se forma matriz nueva. Es donde se fija la tetraciclina."
    pista: "La línea de transición donde la matriz blanda pasa a matriz con mineral y donde se fija la tetraciclina."
  - id: hueso_mineralizado
    etiqueta: "Hueso mineralizado"
    descripcion: "Matriz con mineral. Tras la fase primaria tiene aproximadamente 60 a 70 % del mineral máximo y sigue madurando durante meses o años [verificar]."
    pista: "La matriz dura y ya mineralizada, situada más al interior que el frente, donde quedan incluidas las células."
  - id: osteocito
    etiqueta: "Osteocito"
    descripcion: "Osteoblasto que quedó incluido en la matriz, en su laguna. Regula la mineralización mediante proteínas como DMP1 y produce FGF23."
    pista: "La célula con prolongaciones que quedó atrapada en una laguna dentro de la matriz mineralizada."
  - id: canaliculos
    etiqueta: "Canalículos"
    descripcion: "Conductos que comunican los osteocitos entre sí y con la superficie. Por ellos circulan líquido, iones y señales."
  - id: marcas_tetraciclina
    etiqueta: "Marcas de tetraciclina"
    descripcion: "Dos líneas paralelas depositadas en el frente en dos momentos. La distancia entre ellas dividida por los días entre ciclos es la tasa de aposición mineral."
requeridas:
  - osteoide
  - frente_mineralizacion
  - hueso_mineralizado
  - osteocito
```

##### Actividad m4_6_quiz_frente

```yaml
tipo: quiz
titulo: "Frente, fases y marcadores"
instrucciones: "Responde las cuatro preguntas. Elige tocando una opción, o con teclado usa Tab, las flechas y Enter. Verás la explicación tras cada respuesta."
obligatoria: true
puntaje_max: 40
concepto: "Frente de mineralización, fases y marcadores de formación"
retroalimentacion:
  acierto: "Muy bien: relacionas el frente, las fases y los marcadores con lo que hace el osteoblasto."
  error: "Repasa las diferencias entre fase primaria y secundaria, y entre marcadores de formación y de resorción."
preguntas:
  - id: m4_q_frente_mar
    formato: opcion_multiple
    enunciado: "¿Qué medida resulta de dividir la distancia entre dos marcas de tetraciclina entre los días que las separan?"
    opciones:
      - id: a
        texto: "El tiempo de retardo de mineralización."
      - id: b
        texto: "La densidad mineral del hueso."
      - id: c
        texto: "La tasa de aposición mineral."
      - id: d
        texto: "El volumen de osteoide."
    correcta: c
    explicacion: "La distancia entre las líneas dividida por el tiempo da cuántos micrómetros de matriz se mineralizan por día: es la tasa de aposición mineral (MAR)."
    dificultad: 2
    concepto: "Marcaje con tetraciclina"
  - id: m4_q_frente_secundaria
    formato: opcion_multiple
    enunciado: "¿Cuál afirmación describe la mineralización secundaria?"
    opciones:
      - id: a
        texto: "Fase rápida, de días, en la que se forman los primeros cristales en las vesículas."
      - id: b
        texto: "Fase en la que el osteoblasto secreta el osteoide sobre la superficie ósea."
      - id: c
        texto: "Fase de resorción de la matriz mineralizada por los osteoclastos maduros."
      - id: d
        texto: "Fase lenta, de meses a años, en que el mineral aumenta y madura."
    correcta: d
    explicacion: "La secundaria sigue a la primaria y es lenta: se añaden y maduran cristales. La a describe la primaria, la b es la formación de matriz y la c es la resorción."
    dificultad: 2
    concepto: "Mineralización primaria y secundaria"
  - id: m4_q_frente_p1np
    formato: opcion_multiple
    enunciado: "¿Cuál es el marcador de referencia de formación ósea recomendado por IOF e IFCC?"
    opciones:
      - id: a
        texto: "CTX sérico."
      - id: b
        texto: "P1NP sérico."
      - id: c
        texto: "Calcio total en suero."
      - id: d
        texto: "TRAP 5b."
    correcta: b
    explicacion: "El P1NP refleja la síntesis de colágeno tipo I. El CTX es el marcador de referencia de resorción, y el TRAP 5b es un marcador de osteoclastos."
    dificultad: 2
    concepto: "Marcadores de formación"
  - id: m4_q_frente_recambio
    formato: verdadero_falso
    enunciado: "Un hueso con recambio (remodelado) muy elevado tiende a tener, en promedio, un menor grado de mineralización de su matriz."
    correcta: true
    explicacion: "Con recambio alto se renueva la matriz con frecuencia, así que predomina la matriz joven, todavía poco mineralizada. Con recambio bajo, la matriz envejece y sigue mineralizándose."
    dificultad: 3
    concepto: "Recambio y grado de mineralización"
```

### Seccion 4.7: Calcio y fosfato, quién los suministra y quién los regula

id: "m4_7_homeostasis_ca_pi"

#### Contenido

La mineralización necesita calcio y fosfato en la sangre y en el líquido extracelular. Ese suministro no depende del osteoblasto: lo regula un sistema hormonal que integra intestino, riñón, glándulas paratiroides y hueso.

**Cifras de referencia**

- **Calcio total en suero:** aproximadamente 2,2 a 2,6 mmol/L (8,5 a 10,5 mg/dL). Cerca de la mitad es calcio ionizado, aproximadamente 1,1 a 1,3 mmol/L, la fracción activa que el organismo mide y regula [verificar].
- **Fosfato inorgánico en adultos:** aproximadamente 0,8 a 1,5 mmol/L (2,5 a 4,5 mg/dL); es mayor en niños [verificar].

Los rangos cambian entre laboratorios y con la edad.

El mineral se forma si el producto de las concentraciones de calcio y de fosfato alcanza un nivel suficiente. Si es bajo, la matriz no se mineraliza. Si es demasiado alto, aparecen calcificaciones fuera del hueso.

[Figura: m4_homeostasis_calcio_fosfato | Órganos que regulan el calcio y el fosfato. Toca cada uno para ver qué hormona lo controla.]

**Vitamina D**

1. En la piel, la luz UVB convierte el 7-dehidrocolesterol en colecalciferol (vitamina D3). También se obtiene de la dieta.
2. En el hígado se hidroxila en el carbono 25 y se forma 25(OH)D, la forma circulante que se mide para evaluar el estado de vitamina D.
3. En el riñón, la 1α-hidroxilasa (CYP27B1) la convierte en 1,25(OH)2D o **calcitriol**, la hormona activa.

El calcitriol aumenta la absorción intestinal de calcio y de fosfato. Sostiene la mineralización sobre todo de forma indirecta, porque asegura el suministro de iones.

**Hormona paratiroidea (PTH)**

La secretan las glándulas paratiroides cuando baja el calcio ionizado, que detectan con el receptor sensor de calcio.

- **En el hueso:** actúa sobre osteoblastos y osteocitos, aumenta RANKL y con él la resorción, que libera calcio y fósforo.
- **En el riñón:** aumenta la reabsorción de calcio en el túbulo distal, reduce la reabsorción de fosfato en el túbulo proximal (fosfaturia) y estimula la 1α-hidroxilasa.
- **Efecto neto:** sube el calcio sérico y baja el fosfato sérico.

Aplicada en dosis intermitentes es anabólica (teriparatida); elevada de forma sostenida predomina la resorción.

**Calcitonina**

La producen las células C (parafoliculares) del tiroides cuando sube el calcio. Inhibe al osteoclasto. En el adulto su papel fisiológico se considera menor [verificar].

**FGF23**

Es una hormona que producen los osteocitos y que aumenta cuando suben el fosfato y el calcitriol. Actúa en el riñón con su correceptor αKlotho:

- reduce los cotransportadores de fosfato del túbulo proximal (NaPi-2a y NaPi-2c), con lo que aumenta la pérdida de fosfato por la orina;
- reduce la 1α-hidroxilasa y aumenta la 24-hidroxilasa, con lo que baja el calcitriol.

PHEX y DMP1 restringen la producción de FGF23 en el osteocito; si fallan, el FGF23 se eleva y aparece hipofosfatemia. El osteocito y el riñón forman así un eje que ajusta el fosfato.

| Hormona | Origen | Estímulo | Blanco principal | Efecto neto |
|---|---|---|---|---|
| Calcitriol | Riñón (activa la vitamina D) | PTH alta, calcio y fosfato bajos | Intestino | Sube calcio y fosfato séricos |
| PTH | Paratiroides | Calcio ionizado bajo | Hueso y riñón | Sube calcio, baja fosfato |
| Calcitonina | Células C del tiroides | Calcio alto | Osteoclasto | Baja el calcio (efecto menor en el adulto) |
| FGF23 | Osteocito | Fosfato y calcitriol altos | Riñón (con αKlotho) | Baja fosfato y baja calcitriol |

> Clinico: así se produce el defecto de mineralización por falta de vitamina D. Se absorbe poco calcio y poco fosfato, la PTH sube (hiperparatiroidismo secundario) y el riñón pierde más fosfato. El producto calcio por fosfato cae y el osteoide no se mineraliza.

**Vitamina D y hueso mandibular**

> Clinico: La deficiencia de vitamina D afecta a todo el esqueleto, también a la mandíbula. Tras una extracción dental, el alvéolo se rellena con hueso nuevo: osteoide que después debe mineralizarse. Con poco calcio y fosfato disponibles, la cicatrización del alvéolo y la formación de hueso alrededor de un implante pueden ser menos favorables [verificar]. Los estudios sobre vitamina D e implantes dan resultados dispares: el efecto es más claro en animales que en personas. Corregir una deficiencia es una decisión clínica.

> Atencion: la vitamina D no "mineraliza" el hueso por sí misma. Lo esencial es que mantenga el suministro de calcio y fosfato.

> Recuerda: PTH sube el calcio y baja el fosfato. FGF23 baja el fosfato y baja el calcitriol. Calcitriol sube ambos iones.

#### Actividades

##### Actividad m4_multicapa_homeostasis

```yaml
tipo: multicapa
titulo: "Los órganos del calcio y el fosfato"
instrucciones: "Lee cada pista y toca en el esquema el órgano que describe (con teclado, Tab y Enter). Al acertar lees su papel. Debes ubicar cuatro órganos."
obligatoria: true
puntaje_max: 25
concepto: "Órganos y hormonas de la homeostasis del calcio y del fosfato"
retroalimentacion:
  acierto: "Bien: el intestino absorbe, el riñón excreta y activa la vitamina D, las paratiroides sensan el calcio y el hueso almacena y regula el fosfato con FGF23."
  error: "Ese no es el órgano de la pista. Piensa qué órgano absorbe, cuál excreta y activa la vitamina D, cuál detecta el calcio y cuál lo almacena."
svg: m4_homeostasis_calcio_fosfato
modo: identificar
capas:
  - id: piel
    etiqueta: "Piel"
    descripcion: "La luz UVB convierte el 7-dehidrocolesterol en colecalciferol (vitamina D3)."
  - id: higado
    etiqueta: "Hígado"
    descripcion: "Hidroxila la vitamina D en el carbono 25 y forma 25(OH)D, la forma que se mide en sangre."
  - id: rinon
    etiqueta: "Riñón"
    descripcion: "Activa la vitamina D con la 1α-hidroxilasa. La PTH aumenta la reabsorción de calcio y reduce la de fosfato; el FGF23 reduce la reabsorción de fosfato y la síntesis de calcitriol."
    pista: "El órgano que activa la vitamina D con la 1α-hidroxilasa y elimina fosfato por la orina."
  - id: intestino_delgado
    etiqueta: "Intestino delgado"
    descripcion: "El calcitriol aumenta la absorción de calcio y de fosfato de la dieta."
    pista: "El órgano donde el calcitriol aumenta la absorción de calcio y de fosfato de la dieta."
  - id: glandula_paratiroides
    etiqueta: "Glándulas paratiroides"
    descripcion: "Detectan el calcio ionizado y secretan PTH cuando baja."
    pista: "Cuatro glándulas pequeñas, en la cara posterior del tiroides, que detectan el calcio ionizado."
  - id: tiroides_celulas_c
    etiqueta: "Tiroides (células C)"
    descripcion: "Secretan calcitonina cuando sube el calcio. Su papel fisiológico en el adulto se considera menor [verificar]."
  - id: hueso_osteocitos
    etiqueta: "Hueso y osteocitos"
    descripcion: "Almacena aproximadamente el 99 % del calcio del cuerpo. Los osteocitos producen FGF23, que informa al riñón sobre el fosfato."
    pista: "El tejido que guarda casi todo el calcio del cuerpo y cuyos osteocitos producen una hormona que regula el fosfato."
requeridas:
  - glandula_paratiroides
  - intestino_delgado
  - rinon
  - hueso_osteocitos
```

##### Actividad m4_relacion_hormonas

```yaml
tipo: relacion-columnas
titulo: "Hormonas del calcio y del fosfato"
instrucciones: "Une cada hormona con su descripción: toca una y luego la otra, o arrástrala hasta ella; con teclado, Tab y Enter. Sobra una descripción que no corresponde a ninguna hormona."
obligatoria: true
puntaje_max: 30
concepto: "Hormonas de la homeostasis del calcio y del fosfato"
retroalimentacion:
  acierto: "Correcto: PTH y calcitriol suben el calcio, FGF23 baja el fosfato y la calcitonina inhibe al osteoclasto."
  error: "Alguna pareja no coincide. Pregúntate: ¿quién la secreta?, ¿qué estimula su secreción? y ¿en qué órgano actúa?"
izquierda:
  - id: l_pth
    texto: "PTH"
  - id: l_calcitriol
    texto: "Calcitriol"
  - id: l_calcitonina
    texto: "Calcitonina"
  - id: l_fgf23
    texto: "FGF23"
derecha:
  - id: r_pth
    texto: "La secretan las paratiroides cuando baja el calcio ionizado; en el riñón reduce la reabsorción de fosfato y en el hueso aumenta RANKL."
  - id: r_calcitriol
    texto: "Forma activa de la vitamina D, producida en el riñón por la 1α-hidroxilasa; aumenta la absorción intestinal de calcio y de fosfato."
  - id: r_calcitonina
    texto: "La secretan las células C del tiroides cuando sube el calcio; inhibe al osteoclasto, con papel menor en el adulto."
  - id: r_fgf23
    texto: "Hormona del osteocito que, con el correceptor αKlotho, aumenta la pérdida renal de fosfato y reduce la síntesis de calcitriol."
  - id: r_dist_osteocalcina
    texto: "Proteína de los osteoblastos con residuos Gla, que se une a la hidroxiapatita y se mide como marcador de formación."
pares:
  - izquierda: l_pth
    derecha: r_pth
    explicacion: "La PTH sube el calcio y baja el fosfato: aumenta la resorción, retiene calcio en el riñón y aumenta la pérdida renal de fosfato."
  - izquierda: l_calcitriol
    derecha: r_calcitriol
    explicacion: "El calcitriol, activado por la 1α-hidroxilasa renal, asegura el suministro de iones al aumentar su absorción intestinal."
  - izquierda: l_calcitonina
    derecha: r_calcitonina
    explicacion: "La calcitonina de las células C inhibe al osteoclasto, pero su papel fisiológico en el adulto se considera menor."
  - izquierda: l_fgf23
    derecha: r_fgf23
    explicacion: "El FGF23, con αKlotho, reduce la reabsorción renal de fosfato y la síntesis de calcitriol: baja el fosfato."
```

##### Actividad m4_7_quiz_vitd

```yaml
tipo: quiz
titulo: "Vitamina D y PTH: refuerzo"
instrucciones: "Responde las dos preguntas tocando una opción, o con teclado usa Tab, las flechas y Enter. Este refuerzo es opcional, pero suma puntos."
obligatoria: false
puntaje_max: 20
concepto: "Deficiencia de vitamina D y respuesta de la PTH"
retroalimentacion:
  acierto: "Bien: sigues la cadena de causa y efecto entre vitamina D, calcio, PTH y mineralización."
  error: "Repasa la sección: sin vitamina D baja la absorción de calcio y fosfato, y eso reduce el producto calcio por fosfato."
preguntas:
  - id: m4_q_vitd_mecanismo
    formato: opcion_multiple
    enunciado: "¿Cómo produce la deficiencia de vitamina D un defecto de mineralización?"
    opciones:
      - id: a
        texto: "Impide que el osteoblasto sintetice colágeno tipo I y por eso no se forma osteoide."
      - id: b
        texto: "Aumenta la actividad de los osteoclastos, que resorben el osteoide antes de mineralizarlo."
      - id: c
        texto: "Bloquea directamente la formación de las vesículas de matriz en la membrana del osteoblasto."
      - id: d
        texto: "Reduce la absorción de calcio y fosfato y baja el producto calcio por fosfato."
    correcta: d
    explicacion: "La vitamina D actúa sobre todo asegurando el suministro de iones. Sin ella cae la absorción, y con la PTH elevada se pierde además fosfato por la orina. El osteoide se forma, pero no se mineraliza."
    dificultad: 2
    concepto: "Vitamina D y mineralización"
  - id: m4_q_vitd_pth
    formato: opcion_multiple
    enunciado: "En una persona con hipocalcemia, ¿qué respuesta se espera de las paratiroides?"
    opciones:
      - id: a
        texto: "Aumentan la secreción de PTH."
      - id: b
        texto: "Disminuyen la secreción de PTH."
      - id: c
        texto: "Secretan calcitonina."
      - id: d
        texto: "Secretan FGF23."
    correcta: a
    explicacion: "La caída del calcio ionizado es el estímulo principal de la PTH. La calcitonina la producen las células C del tiroides y el FGF23, los osteocitos."
    dificultad: 1
    concepto: "PTH y calcio"
```

### Seccion 4.8: Cuando la mineralización falla, patologías y mandíbula

id: "m4_8_patologias_mandibula"

#### Contenido

Las enfermedades de este apartado muestran qué pasa cuando falla cada pieza estudiada. Unas afectan a la mineralización de la matriz y otras a la matriz misma.

**Raquitismo y osteomalacia**

Son el mismo defecto de base, la **falta de mineralización del osteoide**, que se distingue por la edad:

- **Raquitismo (niño):** además del osteoide falla la calcificación de la placa de crecimiento. Aparecen ensanchamiento de las metáfisis y de las placas, deformidades (genu varum, rosario raquítico) y retraso de la erupción dentaria.
- **Osteomalacia (adulto):** sin placas de crecimiento abiertas, se ve como dolor óseo, debilidad muscular proximal y pseudofracturas de Looser.

Causas principales:

1. **Deficiencia de vitamina D** (dieta, poca exposición al sol, malabsorción, enfermedad hepática o renal).
2. **Hipofosfatemia por pérdida renal de fosfato:** raquitismo hipofosfatémico ligado al X (XLH, pérdida de función de *PHEX* con FGF23 elevado), forma dominante (variantes de FGF23 resistentes a la escisión) y formas recesivas (*DMP1*, *ENPP1*). En todas ellas el mecanismo común es el FGF23 elevado, no un exceso de PPi.
3. **Osteomalacia oncogénica:** un tumor, casi siempre mesenquimal, secreta FGF23 y reproduce el cuadro del XLH sin causa genética.
4. **Hipofosfatasia**, por déficit de TNAP.
5. **Fármacos y toxinas** que interfieren con la mineralización (por ejemplo, etidronato a dosis altas o aluminio).
6. **Enfermedad renal crónica:** el trastorno mineral y óseo asociado reduce la 1α-hidroxilasa, eleva el FGF23 y la PTH, y puede producir un defecto de mineralización.

En la biopsia, la costura de osteoide es más gruesa (superior a aproximadamente 12,5 a 15 µm según el autor), el tiempo de retardo supera los 100 días y las marcas de tetraciclina son borrosas o no se ven [verificar].

[Figura: m4_osteoide_normal_vs_osteomalacia | Superficie ósea normal y con osteomalacia: la costura de osteoide se ensancha y el marcaje se vuelve difuso.]

**Hipofosfatasia**

Es una enfermedad hereditaria por pérdida de función de *ALPL* (TNAP). La fosfatasa alcalina sérica está baja y se acumulan pirofosfato, piridoxal fosfato (vitamina B6) y fosfoetanolamina. Su espectro va desde formas perinatales graves hasta la *odontohipofosfatasia*, que afecta solo a los dientes. Existe tratamiento de reemplazo enzimático con asfotasa alfa, aprobado para las formas perinatal, infantil y juvenil.

> Clinico: en la hipofosfatasia los dientes temporales se pierden temprano, con la raíz intacta, porque el cemento es hipoplásico o no se forma y el diente pierde su anclaje periodontal.

**Osteogénesis imperfecta (defecto de la matriz)**

Aquí la mineralización no está bloqueada; lo que falla es el colágeno. Más del 80 % de los casos se deben a variantes en *COL1A1* o *COL1A2* [verificar].

- **Tipo I (Sillence):** cantidad insuficiente de colágeno normal (por ejemplo, una copia inactiva de *COL1A1*). Forma leve, con escleras azuladas.
- **Tipos II a IV:** colágeno estructuralmente anómalo, sobre todo por sustituciones de glicina que desestabilizan la triple hélice. Las formas van de letal en el período perinatal a deformante progresiva y variable.

El resultado son huesos frágiles. Curiosamente, la matriz de estos huesos suele tener una densidad mineral mayor que la normal, y aun así se rompe con facilidad [verificar]. Algunos tipos se acompañan de dentinogénesis imperfecta.

**El diente delata el defecto de mineralización**

La dentina y el cemento (el tejido mineralizado que cubre la raíz y ancla el diente al ligamento periodontal) se mineralizan con mecanismos en buena parte compartidos con el hueso. Por eso, cuando la mineralización falla, el diente y el hueso alveolar lo muestran:

- **Hipofosfatasia:** el cemento es hipoplásico o no se forma. El diente temporal se suelta con la raíz intacta y casi sin inflamación, en los primeros años de vida (con frecuencia, los incisivos primero) [verificar].
- **Raquitismo hipofosfatémico ligado al X:** la dentina se mineraliza mal, con espacios irregulares, y la cámara pulpar es amplia. Las bacterias llegan a la pulpa por microfisuras o por el desgaste del esmalte y aparece un absceso en un diente sin caries ni trauma. En los dientes permanentes puede haber también defectos del esmalte [verificar].
- **Raquitismo por falta de vitamina D:** según la edad y la duración de la carencia, pueden verse retraso de la erupción, defectos del esmalte y de la dentina, y cámaras pulpares amplias [verificar].

| Enfermedad | Defecto de base | Hallazgo clave |
|---|---|---|
| Raquitismo carencial | Falta de vitamina D en el niño, con producto Ca × Pi bajo | Placas de crecimiento y metáfisis ensanchadas |
| Osteomalacia | Igual, en el adulto | Costuras de osteoide ensanchadas, pseudofracturas de Looser |
| XLH | Pérdida de función de PHEX, con FGF23 alto | Hipofosfatemia por pérdida renal de fosfato |
| Osteomalacia oncogénica | Tumor que secreta FGF23 | Hipofosfatemia por pérdida renal de fosfato, sin causa genética |
| Hipofosfatasia | Déficit de TNAP, con pirofosfato acumulado | Fosfatasa alcalina baja, pérdida precoz de dientes temporales |
| Odontohipofosfatasia | Déficit de TNAP con manifestación solo dental | Pérdida precoz de dientes temporales con la raíz intacta, sin lesión esquelética |
| Osteogénesis imperfecta | Variantes de COL1A1 o COL1A2 | Huesos frágiles, escleras azuladas, dentinogénesis imperfecta en algunos tipos |
| XLH en los dientes | Dentina mal mineralizada por la hipofosfatemia | Cámaras pulpares amplias y abscesos dentales sin caries ni trauma |

**Lo que se ve en la mandíbula**

> Clinico: en el raquitismo hipofosfatémico ligado al X, la dentina mal mineralizada deja cámaras pulpares amplias y cuernos pulpares altos, y provoca abscesos dentales sin caries.

> Clinico: en la radiografía, la lámina dura (la cortical del alvéolo) puede desaparecer en el hiperparatiroidismo y adelgazarse en la osteomalacia. En la osteomalacia, además, el hueso de los maxilares puede verse más radiolúcido y con trama difusa [verificar].

> Clinico: el espesor de la cortical mandibular a la altura del foramen mentoniano, medido en la radiografía panorámica, se ha propuesto como cribado de baja densidad ósea [verificar].

> Atencion: raquitismo y osteomalacia no son dos enfermedades distintas por mecanismo. Cambia la edad y, con ella, que la placa de crecimiento esté abierta o no.

#### Actividades

##### Actividad m4_relacion_patologias

```yaml
tipo: relacion-columnas
titulo: "Patologías y su defecto de base"
instrucciones: "Une cada enfermedad con su defecto de base: toca una y luego la otra, o arrástrala hasta ella; con teclado, Tab y Enter. Sobra una descripción que no corresponde a ninguna enfermedad."
obligatoria: true
puntaje_max: 40
concepto: "Patologías del defecto de mineralización y de la matriz"
retroalimentacion:
  acierto: "Correcto: distingues los defectos de mineralización, sea por falta de iones, por exceso de FGF23 o por falta de TNAP, del defecto de la matriz de colágeno."
  error: "Alguna pareja no coincide. Pregúntate: ¿falla el suministro de iones, el equilibrio fosfato-pirofosfato o el colágeno?"
izquierda:
  - id: l_raquitismo
    texto: "Raquitismo carencial"
  - id: l_osteomalacia
    texto: "Osteomalacia carencial"
  - id: l_xlh
    texto: "Raquitismo hipofosfatémico ligado al X (XLH)"
  - id: l_hipofosfatasia
    texto: "Hipofosfatasia"
  - id: l_oi
    texto: "Osteogénesis imperfecta"
derecha:
  - id: r_raquitismo
    texto: "Falta de vitamina D en el niño: el osteoide y la placa de crecimiento no se mineralizan y las metáfisis se ensanchan."
  - id: r_osteomalacia
    texto: "Falta de vitamina D en el adulto: el osteoide no se mineraliza, con costuras ensanchadas y pseudofracturas de Looser."
  - id: r_xlh
    texto: "Pérdida de función de PHEX, con exceso de FGF23 y pérdida renal de fosfato."
  - id: r_hipofosfatasia
    texto: "Déficit de TNAP: se acumula pirofosfato, la fosfatasa alcalina sérica es baja y los dientes temporales se pierden con la raíz intacta."
  - id: r_oi
    texto: "Variantes en COL1A1 o COL1A2: colágeno tipo I insuficiente o defectuoso, con huesos frágiles y escleras azuladas."
  - id: r_dist_resorcion
    texto: "Aumento de la resorción osteoclástica con pérdida de masa ósea y matriz de mineralización normal."
pares:
  - izquierda: l_raquitismo
    derecha: r_raquitismo
    explicacion: "Sin vitamina D baja la absorción de calcio y fosfato, cae el producto calcio por fosfato y fallan el osteoide y la placa de crecimiento."
  - izquierda: l_osteomalacia
    derecha: r_osteomalacia
    explicacion: "Es el mismo defecto que el raquitismo, pero en el adulto: sin placas abiertas se ven costuras ensanchadas y pseudofracturas de Looser."
  - izquierda: l_xlh
    derecha: r_xlh
    explicacion: "Sin PHEX el FGF23 se eleva, el riñón pierde fosfato y la matriz no se mineraliza por la hipofosfatemia."
  - izquierda: l_hipofosfatasia
    derecha: r_hipofosfatasia
    explicacion: "Sin TNAP no se hidroliza el pirofosfato, que frena el cristal, y la fosfatasa alcalina sérica baja."
  - izquierda: l_oi
    derecha: r_oi
    explicacion: "En la osteogénesis imperfecta el defecto está en el colágeno, no en la mineralización, y por eso el hueso es frágil."
```

##### Actividad m4_exploracion_mandibula

```yaml
tipo: exploracion-3d
titulo: "La mineralización en la mandíbula"
instrucciones: "Gira la mandíbula con un dedo o con el mouse y acércala con dos dedos o con la rueda. Toca cada punto marcado, o elígelo en la lista bajo el modelo (también con Tab y Enter). Debes visitar cinco puntos; el sexto es opcional."
obligatoria: true
puntaje_max: 20
concepto: "Mineralización y recambio en las regiones de la mandíbula"
retroalimentacion:
  acierto: "Bien: relacionas la densidad, el recambio y las alteraciones de la mineralización con cada región mandibular."
  error: "Te faltan puntos por visitar. Busca los que aún no tienen marca de visitado."
modelo: mandibula
hotspots:
  - id: cortical_basal
    etiqueta: "Cortical del borde basal"
    descripcion: "Cortical gruesa y densa del borde inferior del cuerpo de la mandíbula. Su recambio es lento y su matriz tiene, en promedio, un grado alto de mineralización [verificar]. Es la zona que se mide en la radiografía panorámica."
    zona: "Borde inferior del cuerpo de la mandíbula"
  - id: proceso_alveolar
    etiqueta: "Proceso alveolar"
    descripcion: "Hueso que aloja las raíces dentarias. Tiene un recambio elevado por la carga oclusal y ortodóncica, así que su matriz es, en promedio, más joven y menos mineralizada. Suele reflejar antes que el borde basal los cambios de calcio, fosfato y PTH [verificar]."
    zona: "Proceso alveolar del cuerpo de la mandíbula"
  - id: lamina_dura
    etiqueta: "Lámina dura"
    descripcion: "Cortical fina que reviste el alvéolo (hueso alveolar propiamente dicho). En la radiografía es una línea radiopaca alrededor de la raíz. Puede desaparecer en el hiperparatiroidismo y adelgazarse en la osteomalacia [verificar]."
    zona: "Pared del alvéolo dentario"
  - id: hueso_trabecular_cuerpo
    etiqueta: "Hueso trabecular del cuerpo"
    descripcion: "Hueso esponjoso entre las corticales. Su gran superficie lo hace muy sensible a los cambios de recambio y de mineralización. En los defectos de mineralización su trama puede verse difusa en la radiografía [verificar]."
    zona: "Interior del cuerpo de la mandíbula"
  - id: condilo
    etiqueta: "Cóndilo"
    descripcion: "La cabeza del cóndilo tiene una capa articular fibrosa y, debajo, un cartílago secundario que participa en el crecimiento por osificación endocondral hasta el adulto joven. Su cartílago hipertrófico se calcifica con un mecanismo de vesículas de matriz análogo al del cartílago de crecimiento [verificar]."
    zona: "Proceso condilar de la rama"
  - id: foramen_mentoniano
    etiqueta: "Foramen mentoniano"
    descripcion: "Referencia para medir el espesor de la cortical en la radiografía panorámica (índice mentoniano), que se ha propuesto como cribado de baja densidad ósea [verificar]."
    zona: "Cuerpo de la mandíbula, región de los premolares"
requeridos:
  - cortical_basal
  - proceso_alveolar
  - lamina_dura
  - hueso_trabecular_cuerpo
  - condilo
```

##### Actividad m4_evaluacion_final

```yaml
tipo: quiz
titulo: "Evaluación final del módulo 4"
instrucciones: "Responde las 16 preguntas, sin límite de tiempo. Toca una opción (con teclado, Tab y Enter); en la de ordenar, arrastra los pasos. Verás la explicación tras cada respuesta. Al completar las obligatorias obtienes el logro Mineralizador."
obligatoria: true
puntaje_max: 100
concepto: "Integración del módulo 4: mineralización del tejido óseo"
retroalimentacion:
  acierto: "Excelente: integras el osteoide, el colágeno, las vesículas, el pirofosfato, las proteínas no colágenas, el frente, la regulación hormonal y las patologías."
  error: "Repasa las secciones de las preguntas que fallaste; el mentor puede reforzarte cualquiera de ellas."
preguntas:
  - id: m4_f_osteomalacia_histologia
    formato: opcion_multiple
    enunciado: "En la biopsia ósea de un adulto con osteomalacia, ¿qué hallazgo es característico?"
    opciones:
      - id: a
        texto: "Costuras de osteoide muy delgadas, con marcas de tetraciclina nítidas y muy separadas."
      - id: b
        texto: "Trabéculas adelgazadas con mineralización normal y poco osteoide, como en la osteoporosis."
      - id: c
        texto: "Costuras de osteoide ensanchadas, mineralización retrasada y marcas de tetraciclina borrosas."
      - id: d
        texto: "Aumento de lagunas de resorción con fibrosis de la médula, típico del hiperparatiroidismo grave."
    correcta: c
    explicacion: "La osteomalacia es un defecto de mineralización: el osteoide se forma pero no se mineraliza a tiempo, por eso se acumula y el marcaje con tetraciclina se ve difuso."
    dificultad: 2
    concepto: "Osteomalacia"
  - id: m4_f_lisil_oxidasa
    formato: opcion_multiple
    enunciado: "¿Qué enzima forma los entrecruzamientos covalentes entre las moléculas de colágeno tipo I?"
    opciones:
      - id: a
        texto: "Prolil hidroxilasa."
      - id: b
        texto: "Lisil oxidasa."
      - id: c
        texto: "Fosfatasa alcalina."
      - id: d
        texto: "Colagenasa."
    correcta: b
    explicacion: "La lisil oxidasa convierte lisinas e hidroxilisinas de los telopéptidos en aldehídos, que se unen entre moléculas. La prolil hidroxilasa actúa antes, dentro de la célula, y la colagenasa degrada colágeno."
    dificultad: 1
    concepto: "Colágeno tipo I"
  - id: m4_f_calcitonina
    formato: opcion_multiple
    enunciado: "¿Qué afirmación describe correctamente a la calcitonina?"
    opciones:
      - id: a
        texto: "La producen las células C del tiroides; inhibe al osteoclasto y pesa poco en el adulto."
      - id: b
        texto: "La secretan las paratiroides cuando baja el calcio y aumenta la resorción ósea."
      - id: c
        texto: "Es la forma activa de la vitamina D: la sintetiza el riñón y sube la absorción de calcio."
      - id: d
        texto: "La producen los osteocitos cuando sube el fosfato y aumenta su pérdida por el riñón."
    correcta: a
    explicacion: "La calcitonina la secretan las células C (parafoliculares) del tiroides cuando sube el calcio, e inhibe al osteoclasto. La b describe la PTH, la c el calcitriol y la d el FGF23."
    dificultad: 2
    concepto: "Calcitonina"
  - id: m4_f_hipofosfatasia
    formato: opcion_multiple
    enunciado: "Un paciente con hipofosfatasia tiene un déficit de TNAP. ¿Qué se acumula en la matriz y qué efecto produce?"
    opciones:
      - id: a
        texto: "Pirofosfato, que inhibe el crecimiento de los cristales."
      - id: b
        texto: "Fosfato inorgánico, que provoca una calcificación excesiva."
      - id: c
        texto: "Colágeno tipo I, que bloquea la nucleación."
      - id: d
        texto: "Calcio libre, que disuelve los cristales."
    correcta: a
    explicacion: "Sin TNAP no se hidroliza el pirofosfato, y este inhibidor frena la mineralización. Por eso aparecen raquitismo u osteomalacia y pérdida precoz de dientes."
    dificultad: 3
    concepto: "Hipofosfatasia y pirofosfato"
  - id: m4_f_enpp1
    formato: opcion_multiple
    enunciado: "¿Qué enzima genera pirofosfato extracelular a partir de ATP?"
    opciones:
      - id: a
        texto: "TNAP."
      - id: b
        texto: "PHOSPHO1."
      - id: c
        texto: "ENPP1."
      - id: d
        texto: "Lisil oxidasa."
    correcta: c
    explicacion: "ENPP1 es una ectoenzima que convierte ATP en AMP y pirofosfato. La TNAP hace lo contrario: hidroliza el pirofosfato. ANKH exporta el ATP a partir del cual ENPP1 lo forma."
    dificultad: 3
    concepto: "Fuentes de pirofosfato"
  - id: m4_f_recambio_mineralizacion
    formato: opcion_multiple
    enunciado: "Un fármaco reduce mucho el recambio óseo. ¿Qué cambio se espera en el grado promedio de mineralización de la matriz?"
    opciones:
      - id: a
        texto: "Disminuye, porque predomina la matriz joven poco mineralizada."
      - id: b
        texto: "Aumenta, porque la matriz envejece y completa su mineralización."
      - id: c
        texto: "No cambia, porque la mineralización de la matriz no depende del tiempo."
      - id: d
        texto: "Desaparece el mineral de la matriz, porque se detiene la formación."
    correcta: b
    explicacion: "Con menos recambio se renueva menos matriz, y la existente tiene más tiempo para completar la mineralización secundaria. El promedio de mineralización sube."
    dificultad: 3
    concepto: "Mineralización secundaria"
  - id: m4_f_bsp_nucleador
    formato: opcion_multiple
    enunciado: "¿Cuál de estas proteínas no colágenas nuclea la hidroxiapatita cuando comienza la mineralización?"
    opciones:
      - id: a
        texto: "Osteopontina fosforilada."
      - id: b
        texto: "Sialoproteína ósea."
      - id: c
        texto: "Decorina."
      - id: d
        texto: "Proteína Gla de matriz (MGP)."
    correcta: b
    explicacion: "La sialoproteína ósea, con sus tramos de ácido poliglutámico, se une al calcio y actúa como nucleadora. La osteopontina fosforilada, la decorina y la MGP frenan el crecimiento del cristal."
    dificultad: 2
    concepto: "Sialoproteína ósea"
  - id: m4_f_mar_calculo
    formato: opcion_multiple
    enunciado: "Una biopsia con dos marcas de tetraciclina separadas por 14 días muestra 8,4 µm de distancia entre las líneas. ¿Cuál es la tasa de aposición mineral?"
    opciones:
      - id: a
        texto: "1,7 µm/día."
      - id: b
        texto: "6,0 µm/día."
      - id: c
        texto: "0,6 µm/día."
      - id: d
        texto: "22,4 µm/día."
    correcta: c
    explicacion: "MAR = distancia entre marcas ÷ días entre ciclos = 8,4 µm ÷ 14 días = 0,6 µm/día, dentro del rango típico del hueso trabecular adulto."
    dificultad: 2
    concepto: "Tasa de aposición mineral"
  - id: m4_f_pth_efecto
    formato: opcion_multiple
    enunciado: "¿Qué efecto neto tiene la PTH sobre el calcio y el fosfato séricos?"
    opciones:
      - id: a
        texto: "Sube ambos."
      - id: b
        texto: "Baja el calcio y sube el fosfato."
      - id: c
        texto: "Baja ambos."
      - id: d
        texto: "Sube el calcio y baja el fosfato."
    correcta: d
    explicacion: "La PTH sube el calcio (resorción, reabsorción renal, calcitriol) y baja el fosfato porque aumenta su excreción renal."
    dificultad: 2
    concepto: "PTH"
  - id: m4_f_fgf23_efecto
    formato: opcion_multiple
    enunciado: "¿Qué efectos tiene el FGF23 sobre el riñón?"
    opciones:
      - id: a
        texto: "Aumenta la reabsorción de fosfato y la síntesis de calcitriol."
      - id: b
        texto: "Aumenta la excreción de fosfato y reduce la síntesis de calcitriol."
      - id: c
        texto: "Aumenta la absorción intestinal de fosfato y la síntesis de calcitriol."
      - id: d
        texto: "No actúa sobre el riñón; solo actúa sobre el osteoclasto."
    correcta: b
    explicacion: "Con su correceptor αKlotho, el FGF23 reduce los cotransportadores de fosfato del túbulo proximal y suprime la 1α-hidroxilasa. El resultado es hipofosfatemia y menos calcitriol."
    dificultad: 3
    concepto: "FGF23"
  - id: m4_f_vitamina_d_orden
    formato: ordenar_pasos
    enunciado: "Ordena los pasos de la activación de la vitamina D, del primero al último."
    pasos:
      - id: p_efecto
        texto: "El calcitriol aumenta la absorción intestinal de calcio y de fosfato."
      - id: p_higado
        texto: "En el hígado se hidroxila en el carbono 25 y se forma 25(OH)D."
      - id: p_piel
        texto: "En la piel, la luz UVB convierte el 7-dehidrocolesterol en colecalciferol."
      - id: p_rinon
        texto: "En el riñón, la 1α-hidroxilasa forma 1,25(OH)2D, el calcitriol."
    correcta:
      - p_piel
      - p_higado
      - p_rinon
      - p_efecto
    explicacion: "La vitamina D se sintetiza en la piel, se hidroxila primero en el hígado y luego en el riñón, y el calcitriol resultante actúa sobre todo en el intestino."
    dificultad: 2
    concepto: "Activación de la vitamina D"
  - id: m4_f_warfarina_osteocalcina
    formato: opcion_multiple
    enunciado: "Si se bloquea el ciclo de la vitamina K, por ejemplo con warfarina, ¿qué le ocurre a la osteocalcina?"
    opciones:
      - id: a
        texto: "Deja de sintetizarse porque el osteoblasto pierde su gen BGLAP."
      - id: b
        texto: "Se une con más fuerza a la hidroxiapatita y aumenta el mineral."
      - id: c
        texto: "Queda poco carboxilada y se une peor a la hidroxiapatita."
      - id: d
        texto: "Se convierte en un inhibidor del pirofosfato dentro de la vesícula."
    correcta: c
    explicacion: "La γ-glutamil carboxilasa necesita vitamina K para formar los residuos Gla de la osteocalcina. Sin ella, la osteocalcina queda poco carboxilada y su afinidad por el calcio y la hidroxiapatita baja."
    dificultad: 3
    concepto: "Osteocalcina y vitamina K"
  - id: m4_f_alp_osteomalacia
    formato: opcion_multiple
    enunciado: "Una persona con osteomalacia por déficit de vitamina D, ¿qué valor de fosfatasa alcalina total tiene típicamente?"
    opciones:
      - id: a
        texto: "Bajo, porque sin vitamina D el osteoblasto produce menos enzima."
      - id: b
        texto: "Normal, porque el defecto es de vitamina D y no del osteoblasto."
      - id: c
        texto: "Bajo, porque el pirofosfato acumulado inhibe la fosfatasa alcalina."
      - id: d
        texto: "Elevado, porque el osteoblasto muy activo libera más fosfatasa."
    correcta: d
    explicacion: "En la osteomalacia carencial los osteoblastos están muy activos y liberan más fosfatasa alcalina ósea a la sangre. En la hipofosfatasia ocurre lo contrario: la fosfatasa alcalina es baja."
    dificultad: 2
    concepto: "Marcadores en la osteomalacia"
  - id: m4_f_oi_tnap
    formato: verdadero_falso
    enunciado: "La osteogénesis imperfecta se debe a un déficit de fosfatasa alcalina (TNAP) que acumula pirofosfato."
    correcta: false
    explicacion: "Es falso: ese es el mecanismo de la hipofosfatasia. La osteogénesis imperfecta es un defecto de la matriz, con variantes en COL1A1 o COL1A2 que producen colágeno tipo I insuficiente o defectuoso."
    dificultad: 2
    concepto: "Osteogénesis imperfecta"
  - id: m4_f_hipofosfatasia_dientes
    formato: opcion_multiple
    enunciado: "Una niña de 2 años pierde varios incisivos temporales sin golpes ni inflamación, con la raíz completa. Su fosfatasa alcalina sérica está baja. ¿Cuál es la explicación más probable?"
    opciones:
      - id: a
        texto: "Un exceso de FGF23: la dentina mal mineralizada deja pasar bacterias a la pulpa y forma un absceso."
      - id: b
        texto: "Osteoclastos hiperactivos que resorben la raíz antes de tiempo, como en el recambio dentario normal."
      - id: c
        texto: "Un déficit de TNAP: el cemento de la raíz es hipoplásico y el diente pierde su anclaje periodontal."
      - id: d
        texto: "Un colágeno tipo I insuficiente en la dentina, con coronas opalescentes y frágiles."
    correcta: c
    explicacion: "En la hipofosfatasia falta TNAP: el pirofosfato se acumula y el cemento de la raíz se forma mal o no se forma, así que el diente se suelta con la raíz intacta y sin inflamación. En el XLH el problema es la dentina, con abscesos, y en la osteogénesis imperfecta, el colágeno."
    dificultad: 2
    concepto: "Hipofosfatasia en los dientes"
  - id: m4_f_osteointegracion
    formato: opcion_multiple
    enunciado: "En la osteointegración de un implante dental en la mandíbula, ¿qué ocurre sobre la superficie del titanio?"
    opciones:
      - id: a
        texto: "Los osteoblastos depositan osteoide que se mineraliza y queda en contacto directo con el implante."
      - id: b
        texto: "Se forma un ligamento periodontal nuevo, con cemento y fibras que anclan el implante al alvéolo."
      - id: c
        texto: "El titanio se transforma en hidroxiapatita al captar el calcio y el fosfato de la sangre."
      - id: d
        texto: "El hueso alveolar no participa: el implante se sostiene solo por la presión mecánica sobre el hueso."
    correcta: a
    explicacion: "La osteointegración es una unión directa entre el hueso y el implante: los osteoblastos secretan osteoide sobre la superficie y este se mineraliza, el mismo proceso de este módulo. El implante no forma ligamento periodontal ni cemento, y el titanio no se convierte en mineral."
    dificultad: 2
    concepto: "Osteointegración de implantes"
```

## Glosario

- **ANKH:** proteína de membrana que exporta ATP y citrato al medio extracelular; de ese ATP se forma después pirofosfato por acción de ENPP1 [verificar].
- **Anexinas (A2, A5, A6):** proteínas de unión a calcio y fosfolípidos presentes en las vesículas de matriz; funcionan como canales de Ca2+.
- **ACP (fosfato de calcio amorfo):** fosfato de calcio sin estructura cristalina; se propone como precursor que luego se ordena como apatita [verificar].
- **αKlotho:** correceptor de FGF23 en el riñón; sin él, el FGF23 no ejerce su efecto sobre el fosfato.
- **BSAP (fosfatasa alcalina ósea):** isoforma ósea de la TNAP en el suero; marcador de formación ósea.
- **Calcitriol (1,25(OH)2D):** forma activa de la vitamina D, producida en el riñón; aumenta la absorción intestinal de calcio y de fosfato.
- **Colágeno tipo I:** proteína de triple hélice que forma aproximadamente el 90 % de la matriz orgánica ósea y sirve de plantilla del mineral.
- **DMP1:** proteína ácida de osteocitos y odontoblastos (SIBLING); promueve la mineralización de la matriz y restringe la producción de FGF23.
- **ENPP1:** ectoenzima que genera pirofosfato extracelular a partir de ATP; su falta causa calcificaciones arteriales (GACI) y, por FGF23 elevado, raquitismo hipofosfatémico (ARHR2).
- **FGF23:** hormona del osteocito que aumenta la excreción renal de fosfato y reduce el calcitriol.
- **Frente de mineralización:** límite entre el osteoide y el hueso mineralizado, donde se deposita el mineral.
- **GPI (glicosilfosfatidilinositol):** lípido que ancla proteínas como la TNAP a la cara externa de la membrana.
- **Gla (γ-carboxiglutamato):** aminoácido modificado, dependiente de vitamina K, que une calcio; la osteocalcina tiene tres.
- **Hidroxiapatita:** fosfato de calcio cristalino, Ca10(PO4)6(OH)2, que forma el mineral del hueso; en el hueso es carbonatada.
- **Hipofosfatasia:** enfermedad hereditaria por pérdida de función de *ALPL* (TNAP), con pirofosfato acumulado y mineralización defectuosa.
- **Lámina dura:** cortical fina del alvéolo dentario que se ve como línea radiopaca en la radiografía.
- **Mineralización primaria:** fase rápida, de días a pocas semanas, en que se deposita la mayor parte inicial del mineral.
- **Mineralización secundaria:** fase lenta, de meses a años, en que el mineral aumenta y madura.
- **Nucleación:** aparición de los primeros cristales estables en una solución sobresaturada.
- **Osteocalcina:** proteína de osteoblastos con residuos Gla; une hidroxiapatita y se mide como marcador de formación.
- **Osteogénesis imperfecta:** grupo de enfermedades del colágeno tipo I, con variantes en *COL1A1* o *COL1A2*, que causa huesos frágiles.
- **Osteoide:** matriz orgánica recién secretada por el osteoblasto, todavía sin mineralizar.
- **Osteomalacia:** defecto de mineralización del osteoide en el adulto.
- **Osteomalacia oncogénica:** hipofosfatemia adquirida por un tumor que secreta FGF23; reproduce el cuadro del XLH.
- **Osteopontina:** fosfoproteína SIBLING con RGD; inhibe el crecimiento del cristal y ancla al osteoclasto.
- **P1NP:** propéptido N-terminal del procolágeno tipo I; marcador de referencia de formación ósea.
- **Periodo D:** unidad repetida de aproximadamente 67 nm de la fibrilla de colágeno, formada por una zona de hueco y una de solapamiento.
- **PHOSPHO1:** fosfatasa intravesicular que libera fosfato a partir de fosfocolina y fosfoetanolamina.
- **Pirofosfato inorgánico (PPi):** dos fosfatos unidos; se adsorbe a los cristales y frena su crecimiento.
- **PTH:** hormona paratiroidea; sube el calcio sérico y baja el fosfato sérico.
- **Raquitismo:** defecto de mineralización del osteoide y de la placa de crecimiento en el niño.
- **RGD (Arg-Gly-Asp):** secuencia de tres aminoácidos que reconocen las integrinas; la llevan las proteínas SIBLING.
- **Sialoproteína ósea:** SIBLING muy glucosilada que nuclea la hidroxiapatita al comenzar la mineralización.
- **SIBLING:** familia de glucoproteínas ácidas con motivo RGD (osteopontina, sialoproteína ósea, DMP1, MEPE y DSPP).
- **Tasa de aposición mineral (MAR):** distancia entre dos marcas de tetraciclina dividida por el número de días entre ellas.
- **Tiempo de maduración del osteoide:** grosor de la costura de osteoide dividido entre la tasa de aposición mineral.
- **Tiempo de retardo de mineralización:** tiempo entre el depósito del osteoide y su mineralización; se calcula con la tasa de aposición corregida por la fracción de superficie osteoide que mineraliza (MAR × MS/OS).
- **TNAP:** fosfatasa alcalina no específica de tejido; ectoenzima anclada por GPI que hidroliza pirofosfato y ATP.
- **Vesícula de matriz:** vesícula con membrana liberada por osteoblastos y otras células que inicia la mineralización.
- **MS/OS:** fracción de la superficie osteoide que tiene marca de tetraciclina, es decir, que está mineralizando.
- **Zona de hueco:** región de la fibrilla, de aproximadamente 40 nm, con espacio entre moléculas de una misma fila; sitio clásico de los primeros cristales intrafibrilares.
- **Zona de solapamiento:** región de la fibrilla, de aproximadamente 27 nm, donde se superponen moléculas de filas vecinas.

## Referencias

Se citan solo obras reales y de uso estándar; no se incluyen páginas, DOI ni enlaces. Se omite el número de edición porque no se pudo confirmar cuál es la vigente: el docente indica la edición que usa en su curso.

Textos de histología, biología ósea y fisiología:

1. Mescher AL. *Junqueira's Basic Histology: Text and Atlas*. McGraw-Hill.
2. Ross MH, Pawlina W. *Histology: A Text and Atlas, with Correlated Cell and Molecular Biology*. Wolters Kluwer.
3. Gartner LP. *Color Atlas and Text of Histology*. Wolters Kluwer.
4. Nanci A. *Ten Cate's Oral Histology: Development, Structure, and Function*. Elsevier.
5. Bilezikian JP, Martin TJ, Clemens TL, Rosen CJ (eds.). *Principles of Bone Biology*. Academic Press.
6. Rosen CJ (ed.). *Primer on the Metabolic Bone Diseases and Disorders of Mineral Metabolism*. American Society for Bone and Mineral Research y Wiley.
7. Hall JE, Hall ME. *Guyton and Hall Textbook of Medical Physiology*. Elsevier.
8. Boron WF, Boulpaep EL. *Medical Physiology*. Elsevier.
9. Kumar V, Abbas AK, Aster JC. *Robbins and Cotran Pathologic Basis of Disease*. Elsevier.

Artículos de revisión y de referencia:

10. Murshed M. Mechanism of bone mineralization. *Cold Spring Harbor Perspectives in Medicine*, 2018.
11. Millán JL. The role of phosphatases in the initiation of skeletal mineralization. *Calcified Tissue International*, 2013.
12. Yadav MC y col. Loss of skeletal mineralization by the simultaneous ablation of PHOSPHO1 and alkaline phosphatase function: a unified model of the mechanisms of initiation of skeletal calcification. *Journal of Bone and Mineral Research*, 2011.
13. Orriss IR, Arnett TR, Russell RGG. Pyrophosphate: a key inhibitor of mineralisation. *Current Opinion in Pharmacology*, 2016.
14. Weiner S, Traub W. Organization of hydroxyapatite crystals within collagen fibrils. *FEBS Letters*, 1986.
15. Boivin G, Meunier PJ. Changes in bone remodeling rate influence the degree of mineralization of bone. *Connective Tissue Research*, 2002.
16. Parfitt AM y col. (ASBMR Histomorphometry Nomenclature Committee). Bone histomorphometry: standardization of nomenclature, symbols, and units. *Journal of Bone and Mineral Research*, 1987.
17. Vasikaran S y col. Markers of bone turnover for the prediction of fracture risk and monitoring of osteoporosis treatment: a need for international reference standards. *Osteoporosis International*, 2011.

## Banco de preguntas para el mentor

Preguntas adicionales, distintas de las del módulo, para reforzar. La dificultad va de 1 (básica) a 3 (integración).

| # | Pregunta | Respuesta | Dificultad | Concepto |
|---|---|---|---|---|
| 1 | ¿Qué diferencia hay entre el osteoide y el hueso mineralizado? | El osteoide es la matriz orgánica recién secretada, sobre todo colágeno tipo I, sin mineral. El hueso mineralizado es la misma matriz con cristales de hidroxiapatita depositados. | 1 | Osteoide |
| 2 | ¿Por qué aparece una glicina cada tres aminoácidos en el colágeno? | Solo la glicina, el aminoácido más pequeño, cabe en el eje de la triple hélice. Una sustitución de glicina desestabiliza la hélice, como ocurre en formas graves de osteogénesis imperfecta. | 2 | Colágeno tipo I |
| 3 | ¿Qué es el periodo D y cuánto mide? | Es la unidad repetida de la fibrilla, de aproximadamente 67 nm, formada por una zona de hueco y una de solapamiento. | 1 | Periodo D |
| 4 | ¿Qué función protectora tiene el pirofosfato fuera del hueso? | Evita que se calcifiquen tejidos blandos como los vasos y el cartílago; por eso su déficit causa calcificaciones ectópicas. | 2 | Pirofosfato |
| 5 | ¿Por qué se dice que la TNAP "hace dos cosas a la vez"? | Porque al hidrolizar el pirofosfato retira un inhibidor del cristal y al mismo tiempo libera fosfato, que es un componente del mineral. | 2 | TNAP |
| 6 | ¿Qué diferencia hay entre nucleación y crecimiento del cristal? | La nucleación es la formación de los primeros cristales estables; el crecimiento es la adición posterior de iones a esos cristales. Se regulan por factores distintos. | 1 | Nucleación |
| 7 | ¿Qué le ocurre al producto calcio por fosfato en el déficit de vitamina D y por qué? | Baja: se absorbe menos calcio y fosfato, y la PTH elevada aumenta la pérdida renal de fosfato. | 2 | Vitamina D |
| 8 | ¿Por qué el P1NP sirve como marcador de formación ósea? | Se libera cuando las proteinasas cortan el propéptido N-terminal del procolágeno tipo I, así que refleja cuánto colágeno están sintetizando los osteoblastos. | 2 | P1NP |
| 9 | ¿Por qué el CTX se mide en ayunas y por la mañana? | Porque tiene variación a lo largo del día y baja con la ingesta; sin esa estandarización, los valores no son comparables. | 2 | Marcadores de resorción |
| 10 | ¿Qué esperarías encontrar en sangre en una hipofosfatasia? | Fosfatasa alcalina baja y acumulación de pirofosfato, piridoxal fosfato y fosfoetanolamina. | 3 | Hipofosfatasia |
| 11 | ¿Por qué la osteogénesis imperfecta no se considera un defecto primario de la mineralización? | Porque el fallo está en el colágeno tipo I (menos cantidad o estructura anómala), no en las vesículas, las fosfatasas o el suministro de iones. | 2 | Osteogénesis imperfecta |
| 12 | ¿Qué efecto tiene el exceso de FGF23 sobre el fosfato y el calcitriol, y qué enfermedad produce? | Aumenta la pérdida renal de fosfato y reduce el calcitriol. Produce raquitismo hipofosfatémico, como el ligado al X, o la osteomalacia oncogénica si lo secreta un tumor. | 3 | FGF23 |
| 13 | ¿Por qué el hueso alveolar suele estar, en promedio, menos mineralizado que el borde basal? | Porque su recambio es más alto, con más matriz joven que aún no completó la mineralización secundaria [verificar]. | 2 | Recambio y mineralización |
| 14 | ¿Qué significa que la calcitonina tenga un papel menor en el adulto? | Que su ausencia o exceso no altera de forma apreciable el calcio sérico; la PTH y el calcitriol son los reguladores dominantes. | 2 | Calcitonina |
| 15 | Un niño con piernas arqueadas, calcio bajo y fosfatasa alcalina elevada, ¿qué mecanismo sospecharías? | Raquitismo carencial: falta de vitamina D, con absorción baja de calcio y fosfato y defecto de mineralización del osteoide y de la placa de crecimiento. | 2 | Raquitismo |
| 16 | ¿Qué cambia entre la mineralización primaria y la secundaria? | La primaria es rápida (días) y deposita aproximadamente 60 a 70 % del mineral máximo; la secundaria es lenta (meses a años) y aumenta y madura el mineral. | 1 | Fases de la mineralización |
| 17 | ¿Por qué el tiempo de retardo de mineralización es mayor que el tiempo de maduración del osteoide? | Porque se calcula con la MAR corregida por la fracción de superficie osteoide que mineraliza (MAR × MS/OS), que es menor que 1; la MAR sin corregir da el tiempo de maduración. | 3 | Histomorfometría |

## Ganchos para el mentor

**Conceptos clave del módulo**

- El osteoide es matriz sin mineral; la mineralización es un proceso regulado, no una precipitación espontánea (4.1).
- El colágeno tipo I es la plantilla; la zona de hueco es el sitio clásico de los primeros cristales intrafibrilares (4.2).
- La vesícula de matriz concentra Ca2+ y Pi; PHOSPHO1 genera Pi dentro y la TNAP retira el PPi desde afuera (4.3).
- El pirofosfato frena y el fosfato impulsa; la relación Pi/PPi local decide (4.3).
- El mineral se deposita dentro y entre las fibrillas, con el eje c alineado con la fibrilla (4.4).
- Las proteínas no colágenas se reparten entre promotoras e inhibidoras (4.5).
- El frente de mineralización separa el osteoide del hueso mineralizado; la mineralización tiene fase primaria y secundaria (4.6).
- PTH, calcitriol, calcitonina y FGF23 regulan el suministro de calcio y fosfato (4.7).
- Las patologías se clasifican por su defecto de base: iones (vitamina D, FGF23), pirofosfato (hipofosfatasia) o colágeno (osteogénesis imperfecta) (4.8).

**Errores frecuentes y cómo aclararlos**

| Error | Por qué ocurre | Cómo aclararlo |
|---|---|---|
| "El osteoide es hueso enfermo." | Se asocia la palabra con osteomalacia. | El osteoide es una fase normal; solo un grosor excesivo indica enfermedad. Pedir que compare la costura normal con la de la figura de la sección 4.8. |
| "El calcio y el fosfato del plasma bastan para mineralizar." | Se ignora a los inhibidores y a la plantilla. | Recordar el pirofosfato y la necesidad de vesículas y colágeno; preguntar por qué no se calcifica el tejido blando. |
| "El pirofosfato es un residuo o algo dañino." | Se piensa solo en su efecto sobre el hueso. | Explicar que protege a los tejidos blandos y que el problema es el desequilibrio con el fosfato. |
| "La TNAP es la fosfatasa alcalina del hígado." | Se confunde la enzima con la medición de laboratorio. | La TNAP tiene isoformas ósea, hepática y renal; la fosfatasa alcalina ósea es la que interesa aquí. |
| "Todo el mineral está dentro de las fibrillas" (o "todo está entre ellas"). | Los textos simplifican una sola versión. | Aclarar que hay mineral intrafibrilar y extrafibrilar y que su proporción se discute. |
| "Todas las proteínas no colágenas promueven la mineralización." | Se supone que "matriz ósea" equivale a "mineral". | Contrastar sialoproteína ósea y DMP1 (promotoras) con osteopontina fosforilada (inhibidora). |
| "La vitamina D mineraliza directamente el hueso." | Se confunde el efecto sistémico con el local. | Explicar que asegura calcio y fosfato en la sangre; si se corrigen los iones, se corrige el defecto. |
| "La calcitonina es la hormona que baja el calcio." | Es la respuesta escolar habitual. | Decir que su papel fisiológico en el adulto es menor; la PTH y el calcitriol dominan la regulación. |
| "Raquitismo y osteomalacia son enfermedades distintas." | Se estudian por separado. | Mismo defecto de mineralización; cambia la edad y la placa de crecimiento. |
| "La osteogénesis imperfecta es una falta de mineral." | Se asocia fragilidad con poca mineralización. | Es un defecto del colágeno; la matriz puede incluso estar hipermineralizada, pero es frágil. |
| Confundir mineralización primaria y secundaria con hueso primario y secundario. | Comparten palabras. | Las primeras son fases de un proceso; los segundos, tipos de matriz (trenzado y laminar). |
| "Si falta ENPP1 hay raquitismo porque baja el pirofosfato." | Se aplica la lógica del PPi a todo el cuadro. | La falta de PPi explica las calcificaciones arteriales (GACI); el raquitismo viene del FGF23 elevado y la hipofosfatemia. |
| Confundir el tiempo de maduración del osteoide con el de retardo de mineralización. | Ambos usan la MAR. | El de retardo corrige la MAR por la fracción de superficie que mineraliza (MS/OS); los umbrales de 100 días son de este. |
| "Toda la mineralización parte de vesículas." | El modelo clásico se presenta como ley general. | Es el modelo clásico; en la dentina circumpulpar y quizá en parte del hueso laminar hay mineralización sobre el colágeno sin depender tanto de vesículas. |
| Confundir P1NP y CTX. | Ambos vienen del colágeno tipo I. | P1NP se libera al sintetizar (formación); CTX, al degradar (resorción). |

**Cómo usar el contexto del estudiante**

- Si falla `m4_arrastre_mineralizacion`, refuerza primero el equipo molecular de la vesícula (sección 4.3): qué molécula cruza la membrana, cuál cataliza y a qué se une el inhibidor; luego el equilibrio Pi/PPi.
- Si falla `m4_relacion_ncp`, pide que resuma con una palabra cada proteína: nucleadora, inhibidora, dependiente de vitamina K y del osteocito.
- Si falla `m4_relacion_hormonas` o `m4_7_quiz_vitd`, recorre el circuito: piel, hígado, riñón, intestino, y luego la señal de la PTH y del FGF23.
- Si falla `m4_relacion_patologias`, pregunta primero: ¿falla el suministro de iones, el equilibrio fosfato-pirofosfato o el colágeno?
- Si el estudiante es de posgrado, ofrece profundizar en el fosfato de calcio amorfo (ACP) como precursor, en el papel del osteocito en la mineralización secundaria y en la interacción entre FGF23, PHEX y DMP1.
- Si explora la mandíbula 3D, conecta cada punto con su recambio y su grado de mineralización.

Preguntas de sondeo útiles: "¿Qué hace la fosfatasa alcalina, además de aportar fosfato?", "¿Por qué el hueso alveolar reacciona antes a los cambios sistémicos?", "¿Qué diferencia hay entre un defecto de la mineralización y un defecto de la matriz?".

## Notas de verificacion para el docente

Este borrador fue redactado por IA con apoyo de revisiones y textos estándar. Los datos siguientes aparecen en el cuerpo con la etiqueta [verificar] porque las fuentes difieren, porque la cifra es aproximada o porque el tema sigue en debate. Conviene que el docente confirme cada uno con el texto que use en su curso.

1. **Proporción de la fase mineral (sección 4.1, tabla y actividad `m4_composicion_multicapa`).** Se da aproximadamente 50 a 70 % del peso seco. Algunos textos de histología citan aproximadamente 50 % y textos de biología ósea, 60 a 70 %. Confirmar qué cifra prefiere.
2. **Proporción de agua (sección 4.1, tabla y capa `agua`).** Se da aproximadamente 10 a 20 % del peso fresco; depende del tejido (cortical o trabecular) y de la hidratación.
3. **Grosor normal de la costura de osteoide (secciones 4.1 y 4.6).** Se da aproximadamente 10 µm; los estudios de histomorfometría informan rangos de aproximadamente 8 a 12 µm.
4. **Tiempo de retardo de mineralización, tasa de aposición mineral y umbrales de osteomalacia (secciones 4.6 y 4.8).** El tiempo de retardo en adultos sanos se da como aproximadamente 10 a 50 días, y la MAR, como aproximadamente 0,5 a 0,8 µm/día. Los criterios de osteomalacia varían: unos autores usan grosor del osteoide superior a 12,5 µm y volumen de osteoide sobre volumen óseo superior a 10 %; otros, 15 µm y 5 %. Todos coinciden en un tiempo de retardo superior a 100 días.
5. **Tamaño de las vesículas de matriz (sección 4.3).** Se da aproximadamente 30 a 300 nm; algunas revisiones dan rangos que llegan a 1000 nm.
6. **Papel de las vesículas en el hueso laminar y en el cartílago condilar (secciones 4.3 y 4.8, capa `condilo` y conexión con la mandíbula).** El mecanismo está bien documentado en cartílago de crecimiento, hueso inmaduro y dentina del manto. Su peso relativo en el hueso laminar maduro, y su aplicación al cartílago condilar secundario, se extrapolan y conviene confirmarlos.
7. **Fosfato de calcio amorfo como precursor (secciones 4.3 y 4.4).** Hay evidencia de que precede a la apatita, pero su papel exacto in vivo se debate.
8. **Tamaño de los cristales (secciones 4.3 y 4.4).** Agujas iniciales de aproximadamente 50 nm de largo dentro de las vesículas, y cristales del hueso maduro de aproximadamente 2 a 7 nm de grosor y 15 a 150 nm de largo. Las medidas varían según la técnica y el tejido.
9. **Concentración de pirofosfato (sección 4.3).** Se da "unos pocos µM" en plasma. La potencia del PPi plasmático como inhibidor in vivo se discute; el control local en la matriz parece el más relevante.
10. **Longitud de las zonas de hueco y solapamiento (secciones 4.2 y 4.5, actividad `m4_fibrilla_multicapa`).** Se usa hueco de aproximadamente 40 nm (0,6 D) y solapamiento de aproximadamente 27 nm (0,4 D). Algunas fuentes invierten las etiquetas; confirmar la convención del texto de referencia. También conviene confirmar la descripción de "surcos" formados por huecos contiguos.
11. **Proporción de mineral intrafibrilar y extrafibrilar (sección 4.4 y capa `cristales_extrafibrilares`).** Las estimaciones van desde que la mayor parte es intrafibrilar hasta aproximadamente 70 % extrafibrilar. El guion no fija un valor.
12. **Papel de la osteocalcina en la mineralización (sección 4.5).** Se presenta como reguladora del tamaño y la orientación del cristal, no esencial para iniciarlo. Sus efectos endocrinos en humanos no se tratan en el módulo porque siguen en discusión.
13. **Mineralización primaria y secundaria (sección 4.6, capa `hueso_mineralizado`).** Se da que la primaria alcanza aproximadamente 60 a 70 % del mineral máximo en días o semanas. Algunas fuentes indican aproximadamente 50 %. Se propone la participación de la red de osteocitos en la fase secundaria.
14. **Rangos de referencia de calcio y fosfato (sección 4.7).** Calcio total aproximadamente 2,2 a 2,6 mmol/L; ionizado aproximadamente 1,1 a 1,3 mmol/L; fosfato del adulto aproximadamente 0,8 a 1,5 mmol/L. Varían según el laboratorio, el método y la edad; en niños el fosfato es mayor.
15. **Papel fisiológico de la calcitonina en el adulto (sección 4.7).** Se describe como menor, según revisiones recientes; algunos textos clásicos le dan mayor peso.
16. **Osteogénesis imperfecta (sección 4.8).** Más del 80 % de los casos por variantes de *COL1A1* o *COL1A2*; algunas fuentes dan 85 a 90 %. La hipermineralización de la matriz se describe en varios tipos, pero no es universal.
17. **Hallazgos radiográficos mandibulares (sección 4.8 y capas `lamina_dura`, `hueso_trabecular_cuerpo` y `foramen_mentoniano`).** La pérdida de lámina dura se asocia clásicamente al hiperparatiroidismo y su adelgazamiento, a la osteomalacia. La trama difusa y el uso del espesor cortical como cribado son descripciones de la literatura odontológica y radiológica que conviene confirmar.
18. **Duración estimada (Ficha).** Se estima en 75 a 100 minutos para la lectura (aproximadamente 4600 palabras) y las 15 actividades obligatorias, y más de 100 con los 5 refuerzos opcionales; se recomienda repartirla en dos sesiones. Conviene medirla con estudiantes reales en la prueba piloto.

Cifras sin etiqueta que también conviene confirmar: aproximadamente 99 % del calcio y 85 % del fósforo del cuerpo en el hueso; relación calcio/fósforo de 1,67; longitud de la molécula de tropocolágeno de aproximadamente 300 nm y periodo D de aproximadamente 67 nm; 49 aminoácidos y tres residuos Gla de la osteocalcina humana; estado regulatorio de la asfotasa alfa (varía por país); efecto de las dosis altas de etidronato sobre la mineralización; edades de contraindicación de la tetraciclina.

Decisiones que necesitan su acuerdo: (a) nivel de detalle de ENPP1, ANKH y PiT-1 para pregrado; (b) uso de "TNAP" o "fosfatasa alcalina" como nombre principal; (c) si se mantiene el modelo de hueco como explicación clásica de la mineralización intrafibrilar, dado que hay hipótesis alternativas; (d) si el módulo debe incluir el papel endocrino de la osteocalcina; (e) si ENPP1, ANKH, PiT-1 y la tabla de proteínas no colágenas pasan a un bloque de profundización para pregrado (hoy están en el camino obligatorio porque el arrastre y la evaluación final las usan).

19. **Mineralización y recambio por regiones mandibulares (Conexión con la mandíbula y capas `cortical_basal`, `proceso_alveolar` y `condilo`).** Que el borde basal tenga en promedio mayor mineralización que el hueso alveolar, y que este refleje antes los cambios sistémicos, se deduce de su recambio, pero el dato de mineralización por región es menos firme. La descripción del cóndilo (capa articular fibrosa sobre un cartílago secundario, con crecimiento hasta el adulto joven) también conviene confirmarla con el texto de referencia.
20. **ANKH y el pirofosfato (sección 4.3, video, glosario y quiz de PHOSPHO1).** Los textos clásicos dicen que ANKH exporta pirofosfato. Trabajos recientes (Szeri y colaboradores, 2020 y 2022) indican que exporta ATP y citrato, y que el pirofosfato extracelular se forma después por acción de ENPP1. El guion sigue la versión reciente; el resultado en los quiz no cambia. Confirmar con el texto de referencia.
21. **Deficiencia de ENPP1 (sección 4.3).** Las calcificaciones arteriales (GACI) se atribuyen al PPi bajo; el raquitismo hipofosfatémico (ARHR2) se asocia a FGF23 elevado, y cómo la falta de ENPP1 eleva el FGF23 no está aclarado.
22. **Mineralización independiente de vesículas (sección 4.4 y actividad `m4_orden_mineralizacion`).** El orden vesícula, cristal, colágeno se presenta como orden del modelo clásico. En la dentina circumpulpar y posiblemente en parte del hueso laminar maduro, el mineral depende menos de vesículas.
23. **Tiempo de maduración y tiempo de retardo (sección 4.6).** El de maduración es grosor de osteoide dividido entre MAR; el de retardo usa la MAR corregida por MS/OS. Los umbrales de 10 a 50 y más de 100 días corresponden al de retardo; confirmar los valores con el texto que use el docente.
24. **Refuerzo del contexto mandibular (secciones 4.1, 4.4, 4.6, 4.7 y 4.8, y las preguntas `m4_f_hipofosfatasia_dientes` y `m4_f_osteointegracion`).** Cifras y matices que conviene confirmar: recambio del hueso alveolar frente al fémur (se expresa sin cifra; los datos son de modelos animales); mineralización por región mandibular (véase el punto 19); frecuencia de pérdida de la lámina dura en el hiperparatiroidismo secundario (poco frecuente; una serie clínica cita alrededor de 10 %); efecto de la deficiencia de vitamina D sobre el alvéolo y los implantes (más claro en animales que en personas); edad de la pérdida dental en la hipofosfatasia y hallazgos del esmalte y la erupción en el XLH y en el raquitismo carencial, que varían con la forma y la edad.

Convenciones de este archivo: los títulos estructurales y las etiquetas de los avisos (Clinico, Dato, Atencion, Recuerda) van sin tildes para que agentes posteriores los reconozcan de forma exacta; el texto para el estudiante sí lleva tildes.

## Registro de revision

Segunda ronda: ajuste del guion tras la revisión científica independiente. Los datos dudosos verificados por el autor se contrastaron con literatura indexada (PubMed, JBMR, PLoS Genetics, Human Mutation y la nomenclatura de histomorfometría de la ASBMR).

| Hallazgo | Decisión | Razón breve |
|---|---|---|
| Arrastre `m4_arrastre_mineralizacion`: receptores ambiguos (bloqueante) | Aceptado | Se reescribieron la instrucción y las descripciones de los receptores para que cada uno sea el sitio de una sola molécula (transporte, catálisis o unión), y se añadió un `rechazo` por molécula que explica por qué el calcio o el fosfato en el interior no es lo que se pide. |
| ENPP1: raquitismo atribuido al PPi bajo (importante) | Aceptado | Verificado: la deficiencia de ENPP1 (GACI, ARHR2) eleva el FGF23 y causa hipofosfatemia; el PPi bajo explica las calcificaciones arteriales. Se corrigió el aviso, el glosario, los ganchos y la sección 4.8; el mecanismo que eleva el FGF23 se marca [verificar]. |
| Afirmaciones absolutas sobre vesículas en el orden de la mineralización (importante) | Aceptado | Se antepuso "en el modelo clásico" en 4.4, en el video, en la explicación y en la retroalimentación, y se añadió que la dentina circumpulpar y parte del hueso laminar pueden mineralizar con menos dependencia de vesículas [verificar]. |
| Fórmula del tiempo de retardo con MAR (importante) | Aceptado | Verificado en la nomenclatura ASBMR: el cociente grosor ÷ MAR es el tiempo de maduración del osteoide; el de retardo usa Aj.AR = MAR × MS/OS. Se separaron ambos, con el ejemplo de 17 días como maduración. |
| ANKH exporta ATP y no PPi (menor) | Aceptado | Verificado (Szeri y colaboradores, JBMR 2022 y PLoS Genetics 2020): ANKH exporta ATP y citrato y ENPP1 forma el PPi. Se ajustaron la tabla, el video, un quiz, el glosario y las notas, con [verificar] porque los textos clásicos aún dicen lo contrario. |
| Duración estimada de 45 a 60 minutos (importante) | Aceptado en parte | Se corrigió a 75 a 100 minutos en dos sesiones, con punto de pausa tras 4.4. No se movió ENPP1, ANKH ni PiT-1 a un bloque de profundización porque el arrastre obligatorio y la evaluación final los usan; queda como decisión (e) para el docente. |
| Fibrilla en modo identificar sin pistas y `periodo_d` ambiguo (menor) | Aceptado | Se añadieron pistas a las cinco capas, se reformularon las instrucciones y se fijó en las notas de ilustración que `periodo_d` es un corchete aparte, sin contener las áreas de hueco y solapamiento. |
| Instrucciones y textos por encima de los límites; sin explicación por par (menor) | Aceptado | Se acortaron las instrucciones del arrastre, la evaluación final y las tres relaciones a 300 caracteres o menos, se acortó `r_dmp1` a menos de 140 y se añadió una explicación por cada par de las tres relaciones. |
| DMP1 "frena el FGF23" (menor) | Aceptado | Se cambió a "restringe la producción de FGF23" en la relación, la retroalimentación y el glosario. |
| Hotspots mandibulares sin [verificar]; cóndilo "cubierto por cartílago" (menor) | Aceptado | Se añadió [verificar] a la mineralización por región y a la reacción del alvéolo, se corrigió la descripción del cóndilo (capa articular fibrosa sobre cartílago secundario) y se amplió la nota de verificación. |
| Actividades de exploración sin acto de evaluación; hotspots internos difíciles en móvil (menor) | Aceptado en parte | `m4_multicapa_frente` y `m4_multicapa_homeostasis` pasaron a modo identificar con pista por capa requerida, y el 3D ofrece lista de hotspots. Se mantienen como exploración la barra de composición, la fibrilla mineralizada, el video y el 3D, que introducen contenido nuevo; no se añadieron micropreguntas por hotspot. |
| Distractores absurdos, respuesta más larga y preguntas repetidas (menor) | Aceptado | Se reescribieron los distractores de `m4_f_alp_osteomalacia`, `m4_q_ha_reservorio`, `m4_f_osteomalacia_histologia` y `m4_q_vitd_mecanismo`, se acortaron las opciones correctas más largas y se sustituyeron `m4_f_anexinas` y `m4_f_ubicacion_mineral` por preguntas nuevas de calcitonina y de osteocalcina con vitamina K. La mineralización primaria y secundaria se evalúa en el quiz obligatorio de 4.6, y PHOSPHO1 en el arrastre obligatorio y en un refuerzo. |
| Omisión de osteomalacia oncogénica, enfermedad renal crónica y siglas (menor) | Aceptado | Se añadieron ambas causas a 4.8 y a la tabla, y al glosario RGD, GPI, ACP, BSAP, MS/OS, ANKH y los dos tiempos. |
| Orden estricto de osteoide y vesículas (menor) | Aceptado | Ambos pasos se fusionaron; el orden queda en seis pasos sin ambigüedad. |
| Ediciones de las referencias desactualizadas (menor) | Aceptado | No se pudo confirmar cuál es la edición vigente de cada obra, así que se omitió el número de edición y se pide al docente indicar la que usa. |
| Contexto mandibular insuficiente: solo una mención en el texto (importante) | Aceptado | Refuerzo del 2026-09-24 (pendiente del docente): 6 bloques nuevos (4.1 el osteoide en la mandíbula; 4.4 implantes dentales; 4.6 regiones de la mandíbula y lámina dura; 4.7 vitamina D y hueso mandibular; 4.8 el diente delata el defecto), 2 filas en la tabla de 4.8 y 2 preguntas en la evaluación final (`m4_f_hipofosfatasia_dientes`, `m4_f_osteointegracion`). Fuentes consultadas por dato: recambio alto del hueso alveolar, revisiones sobre remodelado alveolar (datos en modelos animales, sin cifra en el texto); osteointegración y osteogénesis por contacto, Cooper, revisión narrativa en Frontiers of Oral and Maxillofacial Medicine; vitamina D e implantes, revisión sistemática «Vitamin D Supplementation for Prevention of Dental Implant Failure» (PMC8769861: efecto más claro en animales, evidencia humana escasa y contradictoria); lámina dura, texto abierto «DE 115: Dental Radiography» (eCampus Ontario; aspecto radiopaco por el haz tangencial) y caso «Oral manifestations of secondary hyperparathyroidism» (PMC4678558: pérdida completa poco frecuente); hipofosfatasia dental, «Hypophosphatasia: diagnosis and clinical signs – a dental surgeon perspective» (Int J Paediatr Dent), serie de Kiselnikova y col. 2020 (Clin Case Rep) y la página de la ADA (pérdida precoz de dientes temporales con raíz intacta, cemento ausente o hipoplásico); XLH dental, Evaluation of dental manifestations in XLH using orthopantomography (PLOS ONE 2024, PMC11280221) y la página de la ADA (cámaras pulpares amplias, dentina hipomineralizada, abscesos sin caries ni trauma); raquitismo por falta de vitamina D, «Oral manifestations of vitamin D deficiency in children» (Br Dent J). Los datos numéricos se dejaron cualitativos y se anotaron en «pendientes» y en el punto 24 de las notas. |
