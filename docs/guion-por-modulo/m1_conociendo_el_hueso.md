# Modulo 1: Conociendo el hueso

> BORRADOR redactado por IA, pendiente de validación del docente. Fecha de redacción: 2026-09-23. Las marcas [verificar] señalan cifras aproximadas o datos que varían entre textos; se resuelven en la sección "Notas de verificacion para el docente".

## Ficha

- Modulo: 1 de 6
- Titulo: Conociendo el hueso
- Foco: Generalidades, funciones biomecánicas y metabólicas esenciales del hueso.
- Densidad: media
- Duracion estimada: 50 minutos (rango de 45 a 60) haciendo solo las actividades obligatorias. Reparto orientativo: sección 1.1, 6 min; 1.2, 9 min; 1.3, 10 min; 1.4, 10 min; 1.5, 15 min (incluye la evaluación final). Las actividades opcionales añaden unos 8 a 10 minutos. El cálculo suma unas 3 950 palabras de lectura (unos 22 minutos) y unas 85 interacciones de 20 a 30 segundos [verificar]; se recomienda hacerlo en dos sesiones, con pausa después de la sección 1.3.
- Nivel: pregrado y posgrado de ciencias de la salud, con enfoque en el hueso mandibular.
- Conocimientos previos: biología celular básica y nociones de anatomía general. No hay módulos previos.
- Logro que se otorga al completarlo: primer_hueso ("Primer hueso").
- Requisito para el logro (propuesta, por acordar con el docente): completar todas las actividades con `obligatoria: true` y obtener al menos el 60 % del puntaje de la evaluación final `m1_5_evaluacion_final` (umbral propuesto, para que el logro certifique comprensión y no solo participación).
- Numero de secciones: 5
- Actividades: 18 en total, 14 obligatorias y 4 opcionales de refuerzo (`m1_2_quiz_calcio`, `m1_3_quiz_matriz`, `m1_4_quiz_organizacion`, `m1_5_wolff_femur`).
- Puntaje maximo del modulo: 440 puntos (370 en las actividades obligatorias y 70 en las opcionales). La evaluación final vale 100.

## Objetivos de aprendizaje

Al terminar el módulo, el estudiante podrá:

1. **Describir** el hueso como un tejido conjuntivo especializado, dinámico y altamente vascularizado, y **distinguir** entre hueso (órgano) y tejido óseo.
2. **Relacionar** cada función del hueso (sostén, protección mecánica, palanca para la locomoción, reservorio de calcio y fósforo, nicho hematopoyético y función endocrina) con la estructura o el mecanismo que la cumple.
3. **Identificar** los componentes de la matriz ósea (fase mineral, colágeno tipo I y proteínas no colágenas) y **explicar** qué propiedad aporta cada uno.
4. **Diferenciar** hueso cortical de trabecular y hueso laminar de entretejido según su estructura, ubicación y función.
5. **Localizar** en un corte de hueso el periostio, el endostio, la osteona y los conductos de Havers y de Volkmann.
6. **Reconocer** las estructuras de la mandíbula, incluido el hueso alveolar propio, y **aplicar** la ley de Wolff para predecir cómo responde el hueso mandibular a cambios en la carga masticatoria.

## Conexion con el hueso mandibular

La mandíbula es el hilo conductor del módulo. Cada concepto general vuelve a ella:

- **Tejido vivo y vascularizado.** El hueso mandibular recibe sangre por la arteria alveolar inferior, que corre dentro del conducto mandibular, y por los vasos del periostio. Cuando se compromete esa irrigación (cirugía, radioterapia, infección), el hueso lo sufre (sección 1.1).
- **Funciones.** La mandíbula es una palanca de la masticación, aloja los dientes y protege el paquete vasculonervioso alveolar inferior. Su hueso esponjoso alberga médula ósea, que en el adulto es sobre todo grasa (sección 1.2).
- **Matriz.** El hueso alveolar propio tiene fibras de colágeno tipo I ancladas: las fibras de Sharpey del ligamento periodontal (sección 1.3).
- **Organización.** La mandíbula tiene una cortical gruesa alrededor de un núcleo de hueso trabecular; el hueso que se forma tras una extracción o una fractura es primero entretejido y luego laminar (secciones 1.3 y 1.4).
- **Carga masticatoria y ley de Wolff.** Las fuerzas de la masticación moldean la arquitectura del hueso alveolar, y la pérdida de dientes, los implantes y la fuerza ortodóncica muestran cómo responde el hueso alveolar a los cambios de carga (sección 1.5).

## Ilustraciones y modelos requeridos

Convenciones de producción: las imágenes se producen como **SVG multicapa** (un grupo `<g>` por capa, con el `id` exacto que aparece en esta tabla). La **mandíbula** es una sola malla: no hay piezas separadas, por eso sus estructuras se definen como **hotspots** con nombre y descripción (sección 1.5). Desde 2026-10-17/18 hay además modelos 3D construidos por código, con una pieza por estructura: el hueso largo (`hueso_largo`), el extremo del hueso largo por capas (`hueso_capas`), la osteona (`osteona`) y el hueso entretejido frente al laminar (`hueso_entretejido_laminar`). Las células, cuando aparecen, se dibujan en SVG. Todo lo dibujado es esquemático y sin escala salvo que se indique.

| id de archivo | Que muestra | Capas o zonas (id = etiqueta) | Se usa en |
|---|---|---|---|
| `m1_hueso_largo_macro` | Corte longitudinal de un hueso largo (por ejemplo, fémur) con sus regiones y su irrigación principal | `cartilago_articular` = Cartílago articular; `epifisis` = Epífisis; `linea_epifisaria` = Línea epifisaria; `metafisis` = Metáfisis; `diafisis` = Diáfisis; `cavidad_medular` = Cavidad medular; `arteria_nutricia` = Arteria nutricia | Actividad `m1_1_hueso_largo` |
| `m1_hormonas_oseas_escena` | Esquema de un hueso que libera mensajeros a la sangre y tres órganos diana con sus receptores. Los efectos no llevan capas propias: los anima la aplicación con su vocabulario de animaciones y sus indicadores (ver la actividad) | `hueso_emisor` = Hueso (osteocito y osteoblasto); `vaso_sanguineo` = Torrente sanguíneo; `organo_rinon` = Riñón (túbulo proximal); `organo_pancreas` = Páncreas (célula beta); `organo_hipotalamo` = Hipotálamo (neuronas); `receptor_fgfr_klotho` = Receptor del riñón; `receptor_celula_beta` = Receptor del páncreas; `receptor_mc4r` = Receptor del hipotálamo | Actividad `m1_2_hormonas_oseas` |
| `m1_matriz_composicion` | Vista a escala nanométrica de una fibrilla de colágeno tipo I con cristales de hidroxiapatita y proteínas no colágenas | `fragmento_hueso` = Fragmento de hueso (vista general); `fibrilla_colageno` = Fibrilla de colágeno tipo I; `zonas_hueco` = Espacios entre moléculas de colágeno; `cristales_hidroxiapatita` = Cristales de hidroxiapatita; `proteinas_no_colagenas` = Proteínas no colágenas; `fuerza_traccion` = Flechas de tracción; `fuerza_compresion` = Flechas de compresión | Actividad `m1_3_video_matriz` |
| `m1_entretejido_laminar` | Dos paneles a la misma escala: hueso entretejido (izquierda) y hueso laminar (derecha) | `fibras_entretejidas` = Fibras entrecruzadas al azar; `osteocitos_entretejido` = Osteocitos del hueso entretejido; `laminillas_paralelas` = Laminillas paralelas; `osteocitos_laminares` = Osteocitos del hueso laminar | Figura de la sección 1.3 (la actividad `m1_3_entretejido_laminar` usa el modelo 3D `hueso_entretejido_laminar` desde 2026-10-18) |
| `m1_corte_hueso_capas_rotulado` | Corte longitudinal de la extremidad de un hueso largo, de la superficie al interior, con los nombres de las capas | `periostio` = Periostio; `hueso_cortical` = Hueso cortical; `endostio` = Endostio; `hueso_trabecular` = Hueso trabecular; `medula_osea` = Médula ósea | Figura de la sección 1.4 (la actividad `m1_4_corte_capas` usa el modelo 3D `hueso_capas` desde 2026-10-18; el dibujo sin rótulos de la multicapa se retiró) |
| `m1_osteona_detalle` | Bloque de hueso cortical (esquema clásico) con una osteona en primer plano | `conducto_de_havers` = Conducto de Havers; `laminillas_concentricas` = Laminillas concéntricas; `osteocito_en_laguna` = Osteocito en su laguna; `canaliculos` = Canalículos; `linea_cementante` = Línea cementante; `conducto_de_volkmann` = Conducto de Volkmann; `laminillas_intersticiales` = Laminillas intersticiales | Portada del módulo (la actividad `m1_4_osteona` usa el modelo 3D `osteona` desde 2026-10-18) |
| `m1_proceso_alveolar_corte` | Corte transversal (vestibulolingual) del cuerpo mandibular a la altura de una raíz dentaria | `hueso_alveolar_propio` = Hueso alveolar propio (lámina cribiforme); `tablas_corticales` = Tablas corticales vestibular y lingual; `hueso_trabecular_alveolar` = Hueso trabecular de soporte; `ligamento_periodontal` = Ligamento periodontal; `raiz_dentaria` = Raíz del diente; `conducto_mandibular` = Conducto mandibular | Actividad `m1_5_proceso_alveolar` |
| `m1_wolff_femur` | Corte frontal de la extremidad proximal del fémur con la orientación de las trabéculas | `trayectorias_compresion` = Trabéculas de compresión; `trayectorias_traccion` = Trabéculas de tracción; `corteza_femoral` = Cortical del fémur | Actividad `m1_5_wolff_femur` y figura de la sección 1.5 |
| `hueso_capas` (modelo 3D construido por código) | Extremo de un hueso largo serrado a lo largo: final de la diáfisis, metáfisis y epífisis con el cartílago articular, y el corte transversal de la diáfisis | `periostio` = Periostio (capa fibrosa y capa celular, con sus vasos; termina en el borde del cartílago); `hueso_cortical` = Hueso cortical (marfil, gruesa en la diáfisis y fina en la epífisis); `endostio` = Endostio (capa fina que tapiza la cortical, la cavidad y cada trabécula); `hueso_trabecular` = Hueso trabecular (red de trabéculas en arcadas y línea epifisaria); `medula_osea` = Médula ósea (amarilla en la cavidad, roja entre las trabéculas) | Actividad `m1_4_corte_capas` |
| `osteona` (modelo 3D construido por código) | Bloque de hueso cortical: corte transversal delante, longitudinal a la derecha y periostio arriba, con una osteona en primer plano de laminillas escalonadas | `conducto_de_havers`, `laminillas_concentricas`, `osteocito_en_laguna`, `canaliculos`, `linea_cementante`, `conducto_de_volkmann`, `laminillas_intersticiales` (las mismas siete estructuras del dibujo, una pieza cada una) | Actividad `m1_4_osteona` |
| `hueso_entretejido_laminar` (modelo 3D construido por código) | Dos bloques a la misma escala: hueso entretejido (izquierda) y hueso laminar con tres laminillas escalonadas (derecha) | `fibras_entretejidas`, `osteocitos_entretejido`, `laminillas_paralelas`, `osteocitos_laminares` (las mismas cuatro estructuras del dibujo) | Actividad `m1_3_entretejido_laminar` |
| `mandibula` (modelo 3D) | Mandíbula humana adulta, una sola malla de hueso; se espera sin dientes, porque BodyParts3D los modela aparte (confirmar al inspeccionar el modelo). Provisional: `apps/web/public/models/mandibula_bodyparts3d.stl` (BodyParts3D FJ6399) | Hotspots (ids tomados del catálogo `CATALOGO_NODOS.mandibula` del frontend): `cuerpo` = Cuerpo; `rama` = Rama; `angulo` = Ángulo; `condilo` = Cóndilo (proceso condilar); `apofisis_coronoides` = Apófisis coronoides; `escotadura_mandibular` = Escotadura mandibular; `sinfisis` = Sínfisis mentoniana; `foramen_mentoniano` = Foramen mentoniano; `foramen_mandibular` = Foramen mandibular (entrada del conducto mandibular); `proceso_alveolar` = Proceso alveolar (apófisis alveolar) | Actividad `m1_5_mandibula_3d` |

### Notas de precision anatomica (para quien dibuja y modela)

- **`m1_hueso_largo_macro`.** El cartílago articular es hialino, cubre solo la superficie articular de la epífisis y no lleva periostio. La epífisis es sobre todo hueso trabecular con una cortical delgada; la diáfisis tiene cortical gruesa y una cavidad medular central (con médula amarilla en el adulto). La línea epifisaria se dibuja como una línea fina de hueso más denso entre epífisis y metáfisis. La arteria nutricia entra por el foramen nutricio, en la diáfisis, y se ramifica hacia la médula. Añadir, en trazo tenue, los vasos periósticos para indicar que la cortical recibe sangre por dentro y por fuera.
- **`m1_corte_hueso_capas` (hoy el modelo `hueso_capas` y la figura rotulada).** El periostio se dibuja con dos capas (fibrosa externa y celular interna) y no cubre la superficie articular. El endostio es una línea muy fina, no una capa gruesa: tapiza la cara interna de la cortical, la cavidad medular y cada trabécula (por eso se dibuja junto a la cortical y también alrededor de las trabéculas). La médula ocupa los espacios entre trabéculas y la cavidad medular; no es una capa final aparte. La cortical debe ser más gruesa en la diáfisis que en la epífisis. Las trabéculas se orientan según las líneas de carga, no al azar.
- **`m1_osteona_detalle` (y el modelo `osteona`).** Esquema clásico en bloque: laminillas circunferenciales externas bajo el periostio, varias osteonas paralelas al eje del hueso, laminillas intersticiales (fragmentos angulosos) entre ellas y un conducto de Volkmann que cruza de forma transversal u oblicua **sin laminillas concéntricas propias**, uniendo conductos de Havers. La línea cementante es el contorno festoneado que rodea cada osteona. Las lagunas se dibujan entre laminillas, con canalículos que salen hacia el conducto central. Proporciones esquemáticas: el conducto de Havers mide alrededor de 50 µm y la osteona unos 200 a 250 µm de diámetro [verificar]; no dibujar barra de escala.
- **`m1_matriz_composicion`.** Esquema sin escala. La fibrilla de colágeno muestra un bandeo periódico (alternancia de zonas densas y de huecos); los cristales de hidroxiapatita son laminillas muy pequeñas que se sitúan en los huecos y a lo largo de la fibrilla. No dibujar los cristales como esferas ni como cubos.
- **`m1_entretejido_laminar` (y el modelo `hueso_entretejido_laminar`).** Ambos paneles a la misma escala para que se aprecie que en el entretejido los osteocitos son más numerosos y grandes y sin orden, y en el laminar son menos y se alinean entre láminas. En el laminar, la dirección de las fibras cambia de una lámina a la siguiente.
- **`m1_proceso_alveolar_corte`.** El hueso alveolar propio es una lámina delgada que reviste el alvéolo, perforada por pequeños orificios (por eso se llama lámina cribiforme); se dibuja como una línea densa junto al ligamento periodontal. Las tablas corticales rodean por fuera; entre ellas y el alvéolo hay hueso trabecular. El conducto mandibular aparece como un círculo bajo el ápice, con nervio, arteria y vena. La cortical del borde basal es la más gruesa. Añadir una nota: en la radiografía, el hueso alveolar propio se ve como la lámina dura.
- **`m1_wolff_femur`.** Esquema clásico simplificado. El sistema de compresión va desde la cortical medial del cuello (calcar) hacia la parte superior de la cabeza; el de tracción va desde la cortical lateral, arqueándose hacia la parte inferior de la cabeza. Los dos sistemas se cruzan formando ángulos cercanos a 90°. Dejar claro en la nota al pie que es un modelo simplificado.
- **`m1_hormonas_oseas_escena`.** No es anatómica: es un esquema conceptual. Los órganos diana pueden dibujarse como iconos reconocibles; lo importante es que cada receptor tenga una forma distinta y visible (llave y cerradura). No se dibujan capas de efecto: la aplicación anima el efecto con su vocabulario cerrado (liberación, activación, inhibición...) y con indicadores de fosfato, insulina y apetito.
- **Zonas táctiles (todas las ilustraciones con capas).** Cada capa debe tener un área táctil de al menos 44 px en un móvil de 360 px de ancho. En las estructuras finas (línea cementante, canalículos, conducto de Volkmann, endostio, línea epifisaria, ligamento periodontal) se dibuja, sobre la línea, un área transparente más ancha que recibe el toque. Una capa visitada se marca con un símbolo (una marca de verificación) además del cambio de color.
- **`mandibula` (3D).** Una sola malla de hueso (se espera sin dientes; confirmar al inspeccionar el modelo). Los hotspots son marcadores anclados a una posición del modelo; sus nombres son los `id` de la tabla. Posiciones sugeridas: `cuerpo` en la cara lateral, bajo los premolares y molares; `rama` en el centro de la cara lateral de la rama; `angulo` en la esquina posteroinferior; `condilo` en la cabeza del proceso condilar; `apofisis_coronoides` en el vértice de la apófisis anterior; `escotadura_mandibular` en el punto más profundo entre coronoides y cóndilo; `sinfisis` en la línea media anterior; `foramen_mentoniano` en la cara lateral del cuerpo, a la altura de los premolares; `foramen_mandibular` en la cara medial de la rama (el marcador se coloca allí y el texto describe el trayecto interno del conducto mandibular); `proceso_alveolar` en el borde alveolar superior del cuerpo. Cualquier pantalla que muestre este modelo debe llevar la atribución exigida por la licencia CC BY-SA 2.1 JP (ver `docs/atribuciones.md`).

## Secciones

> Convenciones de este guion.
> - **Avisos.** Cada aviso empieza con una etiqueta que indica su tipo (Clinico, Dato, Atencion, Recuerda). La aplicación muestra la etiqueta con tilde.
> - **[verificar].** Marca una cifra aproximada o un dato que varía entre textos. No debe mostrarse al estudiante: quien transcriba este guion a `content.json` elimina toda marca `[verificar]` de los textos y comprueba que no queda ninguna. Cada marca se resuelve con el docente (sección "Notas de verificacion para el docente").
> - **Ids locales.** Los ids de opción (`a` a `d`) y de paso (`p1` a `p4`) son locales a cada pregunta. Como el esquema exige ids únicos en todo el módulo, al transcribir se prefijan con el id de la pregunta (por ejemplo `m1_e_q3_a`, `m1_e_q10_p1`). Los demás ids de este guion ya son únicos en el módulo (lo comprueba el script de consistencia).
> - **Nombres de campo.** Este guion usa la estructura acordada para los guiones. Al transcribir: `ordenar_pasos` pasa a `ordenar`; `correcta: verdadero/falso` pasa a booleano; `retroalimentacion.acierto/error` pasa a `correcta/incorrecta`; `dificultad` y `zona_anatomica` se omiten si el esquema no los admite; cada par de relación de columnas recibe una `explicacion` construida a partir del texto de la derecha; cada receptor recibe su `posicion` y cada efecto su `animacion` y sus `indicadores` (indicados en la actividad); a cada capa del modo `identificar` se le añade una `pista`.
> - **Opciones de quiz.** Todas las preguntas de opción múltiple se barajan al mostrarse (`barajar_opciones: true`, el valor por defecto del esquema); el orden en que aparecen aquí no es el orden que ve el estudiante.
> - **Modos de multicapa.** En modo `explorar`, el estudiante descubre las capas tocándolas. En modo `identificar`, la aplicación pide tocar, una por una y en el orden de `requeridas`, cada estructura por su etiqueta.
> - **Interacción.** Nada depende del hover. En escritorio, pasar el ratón por una capa o estructura la resalta y muestra su nombre como ayuda; en pantalla táctil se toca; con teclado, Tab y Mayús+Tab mueven el foco, Enter o Espacio activan y Escape cierra paneles. Cada actividad tiene una alternativa en lista para quien no pueda usar el gráfico.
> - **Retroalimentación.** Cada actividad define `retroalimentacion` (acierto y error). Las preguntas de quiz añaden su propia `explicacion`, que se muestra tras cada respuesta.

### Seccion 1.1: Un tejido vivo y dinámico

id "m1_1_tejido_vivo"

#### Contenido

Cuando ves un esqueleto en un museo, el hueso parece una pieza seca, rígida e inmóvil. En el cuerpo vivo es lo contrario: es un tejido activo, irrigado por sangre, con nervios, con células que trabajan día y noche y con capacidad de cambiar durante toda la vida. En este módulo aprenderás qué es el hueso, para qué sirve, de qué está hecho y cómo se organiza. La mandíbula será tu ejemplo permanente.

**Hueso y tejido óseo no son lo mismo**

- El **hueso** es un órgano: reúne tejido óseo, médula ósea, periostio y endostio, vasos sanguíneos, nervios y, en las articulaciones, cartílago articular.
- El **tejido óseo** es el tejido que forma la mayor parte de ese órgano. Es el protagonista de este módulo.

**Un tejido conjuntivo especializado**

Como todo tejido conjuntivo, el óseo tiene **células** y una **matriz extracelular**. Lo que lo especializa es su matriz: es rígida porque el colágeno tipo I está impregnado de mineral (hidroxiapatita). Esa rigidez tiene consecuencias.

| Rasgo | Tejido conjuntivo laxo | Tejido óseo |
|---|---|---|
| Matriz | Blanda, con fibras y sustancia fundamental hidratada | Rígida: colágeno tipo I mineralizado |
| Células principales | Fibroblastos | Osteoblastos, osteocitos, osteoclastos y células de revestimiento óseo |
| Nutrición | Los nutrientes difunden por la matriz blanda | Los nutrientes no difunden por la matriz mineralizada: las células viven cerca de un vaso y se comunican por canalículos |
| Crecimiento | Las células pueden dividirse dentro del tejido | Solo por aposición: se añade hueso nuevo sobre una superficie; los osteocitos atrapados en la matriz no se dividen |

**Un tejido dinámico**

El hueso adulto no es una estructura terminada. Se **remodela** toda la vida: los osteoclastos retiran hueso viejo y los osteoblastos forman hueso nuevo en el mismo lugar. En el adulto se renueva del orden del 10 % del esqueleto cada año [verificar]. Este ciclo repara microdaños, adapta el hueso a la carga y permite intercambiar calcio con la sangre. Lo estudiarás a fondo en el módulo 5; la formación y la mineralización del hueso nuevo, en los módulos 3 y 4.

**Un tejido muy vascularizado e inervado**

El hueso no es un puntal inerte: tiene una red densa de vasos. Una arteria nutricia entra por la diáfisis y se ramifica en la médula; otros vasos llegan por las epífisis, las metáfisis y el periostio; y dentro de la cortical, pequeños conductos llevan capilares hasta cada zona (los verás en la sección 1.4). Los nervios acompañan a los vasos y el periostio es especialmente sensible: por eso duele tanto una fractura.

> Clinico: cuando un hueso se fractura, sangra y forma un hematoma que es el primer paso de la reparación. Si la irrigación falla (por un traumatismo grave, radioterapia o corticoides), el hueso puede morir: se llama osteonecrosis. Algunos fármacos antirresortivos también se asocian a necrosis de los maxilares, pero con un mecanismo distinto que se trata más adelante. En la mandíbula, la irrigación es especialmente importante para cicatrizar tras una extracción.

**Organización macroscópica de un hueso largo**

Para estudiar un hueso, conviene empezar por verlo entero. En un hueso largo distinguimos:

- **Epífisis:** los extremos ensanchados. Están hechos sobre todo de hueso trabecular y forman la articulación con el hueso vecino.
- **Metáfisis:** la zona de transición entre epífisis y diáfisis. En un niño, junto a ella está la placa de crecimiento; en el adulto queda la **línea epifisaria**.
- **Diáfisis:** el cuerpo del hueso, un tubo de cortical gruesa que rodea la **cavidad medular**.
- **Cartílago articular:** una capa de cartílago hialino que cubre la epífisis donde hay articulación.
- **Cavidad medular:** el espacio central de la diáfisis, ocupado por la médula ósea.

![Corte longitudinal de un hueso largo con sus regiones y la arteria nutricia](m1_hueso_largo_macro)

> Dato: el hueso no crece hinchándose desde dentro, como un globo. Crece en longitud gracias a la placa de crecimiento y en grosor por aposición bajo el periostio. Un osteocito ya rodeado de matriz no se divide.

Ahora explora tú mismo el hueso largo y comprueba después lo aprendido.

#### Actividades

##### Actividad m1_1_hueso_largo

```yaml
tipo: exploracion-3d
titulo: "Recorre un hueso largo"
instrucciones: "Gira el hueso con un dedo y acércalo con dos (en escritorio, arrastra con el ratón y usa la rueda): está serrado a lo largo para que veas su interior. Toca cada región para leer qué es y qué hace. Con teclado, Tab y Enter, o elige en la lista bajo el modelo (sirve también sin 3D). Visita al menos las cinco regiones requeridas."
obligatoria: true
puntaje_max: 20
concepto: "Organización macroscópica del hueso largo"
retroalimentacion:
  acierto: "Muy bien. Ya conoces las regiones de un hueso largo y sabes que no es una pieza maciza: tiene una cavidad medular y una arteria que lo nutre."
  error: "Todavía te faltan regiones por visitar. Revisa las regiones que no tienen la marca de visitada: cada una explica una parte distinta de la estructura del hueso."
# 2026-10-17: pasa del dibujo SVG (m1_hueso_largo_macro) a un modelo 3D de un hueso largo serrado a lo largo
# (pedido de la usuaria: el dibujo no se veía profesional). Mismas regiones, textos y requeridas.
modelo: hueso_largo
hotspots:
  - id: cartilago_articular
    etiqueta: "Cartílago articular"
    descripcion: "Capa de cartílago hialino que recubre la superficie articular de la epífisis. Amortigua las cargas y reduce la fricción. No lleva periostio ni tiene vasos propios: se nutre del líquido sinovial."
  - id: epifisis
    etiqueta: "Epífisis"
    descripcion: "Extremo ensanchado del hueso. Es sobre todo hueso trabecular con una cortical delgada. Forma la articulación y reparte la carga sobre una superficie amplia."
  - id: linea_epifisaria
    etiqueta: "Línea epifisaria"
    descripcion: "Vestigio de la placa de crecimiento. Durante la infancia y la adolescencia, el cartílago de la placa es el responsable del crecimiento en longitud. En el adulto queda como una línea de hueso más denso."
  - id: metafisis
    etiqueta: "Metáfisis"
    descripcion: "Zona de transición entre la epífisis y la diáfisis. En el hueso en crecimiento está junto a la placa de crecimiento y se remodela con intensidad."
  - id: diafisis
    etiqueta: "Diáfisis"
    descripcion: "Cuerpo del hueso: un tubo de cortical gruesa alrededor de la cavidad medular. Resiste bien la flexión y sirve de palanca."
  - id: cavidad_medular
    etiqueta: "Cavidad medular"
    descripcion: "Espacio central de la diáfisis. Contiene médula ósea (en el adulto es sobre todo médula amarilla, rica en grasa) y está tapizada por el endostio."
  - id: arteria_nutricia
    etiqueta: "Arteria nutricia"
    descripcion: "Vaso principal del hueso. Entra por un foramen de la diáfisis y se ramifica en la médula. Irriga la médula y la parte interna de la cortical; los vasos del periostio irrigan la parte externa."
requeridos: [epifisis, metafisis, diafisis, cavidad_medular, arteria_nutricia]
```

##### Actividad m1_1_quiz_conceptos

```yaml
tipo: quiz
titulo: "Comprueba la idea general"
instrucciones: "Responde cada pregunta. Al elegir tu respuesta verás enseguida si es correcta y por qué. Puedes responder tocando la opción o moviéndote con Tab y pulsando Enter."
obligatoria: true
puntaje_max: 20
concepto: "El hueso como tejido conjuntivo especializado, dinámico y vascularizado"
retroalimentacion:
  acierto: "Correcto. El hueso es un tejido conjuntivo especializado por su matriz mineralizada, y es dinámico y muy vascularizado."
  error: "Revisa la sección: la matriz mineralizada, la remodelación continua y la necesidad de vasos cercanos son las tres ideas centrales."
preguntas:
  - id: m1_1_q1
    formato: opcion_multiple
    enunciado: "¿Qué hace del hueso un tejido conjuntivo especializado?"
    opciones:
      - id: a
        texto: "Su matriz extracelular está mineralizada con hidroxiapatita."
      - id: b
        texto: "No tiene células propias: es solo matriz mineral."
      - id: c
        texto: "Se nutre por difusión desde el líquido que baña toda su matriz."
      - id: d
        texto: "Crece porque sus osteocitos se dividen dentro de la matriz."
    correcta: a
    explicacion: "Como todo tejido conjuntivo, tiene células y matriz; lo especial es que la matriz es rígida por el mineral. El hueso tiene células (osteoblastos, osteocitos, osteoclastos), se nutre por vasos y crece por aposición, no por división de osteocitos."
    dificultad: 1
    concepto: "Hueso como tejido conjuntivo especializado"
  - id: m1_1_q2
    formato: verdadero_falso
    enunciado: "Una vez formado, el tejido óseo del adulto es estático: no cambia hasta la vejez."
    correcta: falso
    explicacion: "Es falso. El hueso se remodela toda la vida: los osteoclastos reabsorben hueso viejo y los osteoblastos forman hueso nuevo, lo que lo hace un tejido dinámico."
    dificultad: 1
    concepto: "Hueso dinámico y remodelación"
  - id: m1_1_q3
    formato: opcion_multiple
    enunciado: "En un hueso largo, ¿qué región es un tubo de cortical gruesa alrededor de la cavidad medular?"
    opciones:
      - id: a
        texto: "La epífisis"
      - id: b
        texto: "La metáfisis"
      - id: c
        texto: "La diáfisis"
      - id: d
        texto: "El cartílago articular"
    correcta: c
    explicacion: "La diáfisis es el cuerpo del hueso: cortical gruesa alrededor de la cavidad medular. Las epífisis son los extremos, de hueso sobre todo trabecular."
    dificultad: 1
    concepto: "Organización macroscópica del hueso largo"
  - id: m1_1_q4
    formato: opcion_multiple
    enunciado: "¿Por qué el hueso necesita una red vascular densa si su matriz es tan dura?"
    opciones:
      - id: a
        texto: "Porque la sangre es un componente principal de la matriz ósea, junto con el colágeno y el mineral."
      - id: b
        texto: "Porque el hueso no tiene células propias y la sangre cumple sus funciones metabólicas."
      - id: c
        texto: "Porque los vasos depositan el colágeno tipo I directamente en la matriz ya mineralizada."
      - id: d
        texto: "Porque la matriz mineralizada no deja difundir los nutrientes; las células viven junto a un vaso."
    correcta: d
    explicacion: "La matriz mineralizada no deja pasar los nutrientes por difusión a distancia. Por eso los osteocitos quedan cerca de capilares y se comunican por canalículos."
    dificultad: 2
    concepto: "Hueso altamente vascularizado"
```

### Seccion 1.2: Para qué sirve el hueso

id "m1_2_funciones"

#### Contenido

El esqueleto hace mucho más que sostenernos. Sus funciones se agrupan en cuatro familias: **mecánicas**, **metabólicas**, **hematopoyéticas** y **endocrinas**. Las tres primeras se conocen desde hace mucho; la última se ha descubierto en las últimas décadas, y en parte sigue en discusión.

| Familia | Función | Qué hace |
|---|---|---|
| Mecánica | Sostén | Forma el armazón que soporta el peso del cuerpo y mantiene su forma |
| Mecánica | Protección | El cráneo, la caja torácica, la columna y la pelvis rodean órganos delicados |
| Mecánica | Palanca | Sobre el hueso se insertan los músculos por tendones; al contraerse, el hueso gira sobre la articulación y hay movimiento |
| Metabólica | Reservorio mineral | Almacena calcio y fósforo y los cede a la sangre cuando hacen falta |
| Hematopoyética | Nicho de la médula ósea | Alberga las células madre que producen las células de la sangre |
| Endocrina | Secreción de hormonas | Osteocitos y osteoblastos liberan señales que actúan sobre otros órganos |

**Funciones mecánicas**

El hueso combina rigidez y algo de flexibilidad. Eso le permite **sostener** el peso, **proteger** los órganos internos y **servir de palanca**. En la mandíbula, las tres se ven juntas: sostiene y aloja los dientes, protege el paquete vasculonervioso alveolar inferior dentro de su conducto y, con la articulación temporomandibular como punto de apoyo, es la palanca que mueve la masticación.

**Reservorio de calcio y fósforo**

Aproximadamente el **99 %** del calcio del organismo está en el hueso, y aproximadamente el **85 %** del fósforo [verificar]. El calcio restante, en la sangre y los tejidos blandos, es el que hace posible la contracción muscular, la transmisión nerviosa y la coagulación. Por eso el cuerpo mantiene la calcemia dentro de un rango estrecho, y para lograrlo usa el hueso como banco: si el calcio en sangre baja, se libera desde el hueso; si sobra, se deposita.

> Atencion: que el 99 % del calcio esté en el hueso no significa que sea un depósito inerte. La regulación es continua y minuciosa: la parathormona (PTH) y la vitamina D activa (calcitriol) ajustan el intercambio, y en menor medida la calcitonina. Si dependiera solo de la dieta del día, la calcemia oscilaría peligrosamente.

**Nicho hematopoyético y médula ósea**

La médula ósea es el tejido blando que llena la cavidad medular y los espacios entre las trabéculas. Hay dos tipos:

- **Médula roja:** produce células sanguíneas (glóbulos rojos, glóbulos blancos y plaquetas) a partir de células madre hematopoyéticas. En el adulto se concentra en el esqueleto axial (cráneo, vértebras, costillas, esternón, pelvis) y en los extremos proximales del fémur y el húmero [verificar].
- **Médula amarilla:** rica en adipocitos. Ocupa sobre todo la cavidad medular de la diáfisis de los huesos largos del adulto. Puede volver a ser roja si aumenta la demanda de células sanguíneas, por ejemplo en una anemia crónica grave.

En la mandíbula del adulto, la médula es sobre todo grasa. Pueden persistir focos de médula hematopoyética, que a veces se ven en las radiografías como áreas de menor densidad [verificar].

Las células madre viven en **nichos**: microambientes donde células del estroma y del endotelio, junto con células del linaje osteoblástico, les dan señales (como la quimiocina CXCL12) que las mantienen. Hoy se considera que gran parte de estos nichos es perivascular, aunque el peso de cada tipo de nicho se sigue discutiendo [verificar].

**El hueso como órgano endocrino**

Durante décadas se pensó que el hueso solo recibía órdenes hormonales (PTH, vitamina D, estrógenos). Hoy sabemos que también **emite** señales que llegan a otros órganos. La evidencia no es igual de firme para todas:

| Mensajero | Quién lo produce | Sobre qué actúa | Efecto |
|---|---|---|---|
| FGF23 | Osteocitos | Túbulo proximal del riñón | Aumenta la pérdida de fosfato por la orina y reduce la síntesis de calcitriol: baja la fosfatemia |
| Osteocalcina (forma subcarboxilada) | Osteoblastos | Célula beta del páncreas y otros tejidos | Hipótesis en estudio. Un grupo de investigación describió en ratones más secreción de insulina y más testosterona; en 2020 dos estudios con nuevos ratones sin osteocalcina no encontraron alteraciones del metabolismo de la glucosa, y el debate sigue abierto [verificar] |
| Lipocalina 2 | Osteoblastos | Neuronas del hipotálamo | Hipótesis en estudio. En ratones, un estudio la vinculó con menos apetito por la vía del receptor MC4R; falta confirmación independiente y en humanos [verificar] |

> Atencion: FGF23 es el mensajero óseo mejor establecido, porque hay enfermedades humanas por exceso o defecto de FGF23 (como el raquitismo hipofosfatémico). La osteocalcina y la lipocalina 2 se presentan aquí como hipótesis en estudio: sirven para ver cómo se investiga una función nueva del hueso, no como hechos cerrados.

> Atencion: la esclerostina también la producen los osteocitos, pero actúa sobre todo de forma local: frena la formación de hueso en los osteoblastos vecinos. No es una hormona clásica dirigida a otros órganos. La verás en el módulo 3.

> Clinico: en el raquitismo hipofosfatémico ligado al cromosoma X, mutaciones en el gen PHEX elevan el FGF23. El riñón pierde fosfato en exceso y el hueso se mineraliza mal. Es un ejemplo de cómo una hormona ósea, si falla, altera el propio hueso.

Practica lo que acabas de leer con dos actividades obligatorias: relaciona cada función con su descripción y arrastra los mensajeros óseos a su receptor. Después hay un repaso opcional, con una pregunta para ordenar la respuesta del cuerpo cuando baja el calcio.

#### Actividades

##### Actividad m1_2_relacion_funciones

```yaml
tipo: relacion-columnas
titulo: "Une cada función con su descripción"
instrucciones: "Toca una función de la columna izquierda y luego la descripción que le corresponde en la derecha (también puedes arrastrar la función sobre su descripción; con teclado, elige con Enter y desplázate con las flechas). Hay una descripción de más que no corresponde a ninguna función."
obligatoria: true
puntaje_max: 20
concepto: "Funciones del hueso"
retroalimentacion:
  acierto: "Correcto. Sostén, protección y palanca son las funciones mecánicas; el reservorio mineral y el nicho hematopoyético son las metabólicas y hematopoyéticas; y la secreción de señales como FGF23 es la función endocrina."
  error: "Alguna unión no es correcta. Recuerda: el hueso almacena calcio y fósforo, pero no sintetiza vitamina D; esa síntesis empieza en la piel, a partir del 7-deshidrocolesterol."
izquierda:
  - id: f_sosten
    texto: "Sostén"
  - id: f_proteccion
    texto: "Protección mecánica"
  - id: f_palanca
    texto: "Palanca para el movimiento"
  - id: f_reservorio
    texto: "Reservorio mineral"
  - id: f_hematopoyesis
    texto: "Nicho hematopoyético"
  - id: f_endocrina
    texto: "Función endocrina"
derecha:
  - id: d_sosten
    texto: "Forma el armazón que soporta el peso corporal y mantiene la forma del cuerpo."
  - id: d_proteccion
    texto: "El cráneo, la caja torácica y la columna rodean y resguardan el encéfalo, el corazón y la médula espinal."
  - id: d_palanca
    texto: "Sobre él se insertan los músculos por tendones; al contraerse, gira sobre la articulación y se produce el movimiento."
  - id: d_reservorio
    texto: "Almacena aproximadamente el 99 % del calcio del organismo y la mayor parte del fósforo, y los libera cuando la sangre los necesita."
  - id: d_hematopoyesis
    texto: "La médula ósea aloja las células madre que producen glóbulos rojos, glóbulos blancos y plaquetas."
  - id: d_endocrina
    texto: "Osteocitos y osteoblastos secretan señales, como FGF23 (y, según estudios en ratones, osteocalcina), que actúan sobre otros órganos."
  - id: d_distractor_vitd
    texto: "Sintetiza vitamina D a partir del 7-deshidrocolesterol de la piel."
pares:
  - izquierda: f_sosten
    derecha: d_sosten
  - izquierda: f_proteccion
    derecha: d_proteccion
  - izquierda: f_palanca
    derecha: d_palanca
  - izquierda: f_reservorio
    derecha: d_reservorio
  - izquierda: f_hematopoyesis
    derecha: d_hematopoyesis
  - izquierda: f_endocrina
    derecha: d_endocrina
```

##### Actividad m1_2_hormonas_oseas

```yaml
tipo: arrastre-molecular
titulo: "Del hueso al órgano diana"
instrucciones: "Arrastra cada mensajero hasta el receptor que lo reconoce y observa el efecto en el órgano (en pantalla táctil, mantén el dedo sobre la molécula; con teclado, Enter para elegirla, Tab para moverte entre receptores y Enter para confirmar). Algunas moléculas no encajan en ningún receptor."
obligatoria: true
puntaje_max: 30
concepto: "Función endocrina del hueso"
retroalimentacion:
  acierto: "Muy bien. Cada mensajero solo activa el receptor que reconoce, como una llave en su cerradura. FGF23 es el caso mejor establecido; los efectos de la osteocalcina y de la lipocalina 2 se describieron en ratones y siguen en estudio."
  error: "Ese mensajero no reconoce ese receptor. Fíjate en de qué célula sale cada molécula y en qué órgano actúa; cada intento fallido resta puntos."
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
  - id: esclerostina
    nombre: "Esclerostina"
    descripcion: "Proteína producida por los osteocitos."
  - id: pth
    nombre: "Parathormona (PTH)"
    descripcion: "Hormona que regula el calcio en la sangre."
receptores:
  - id: receptor_fgfr_klotho
    nombre: "Receptor del túbulo proximal renal"
    descripcion: "Receptor de la superficie de las células del túbulo proximal del riñón (complejo FGFR–α-Klotho)."
    posicion: {x: 82, y: 18}
  - id: receptor_celula_beta
    nombre: "Receptor de la célula beta"
    descripcion: "Receptor de las células que secretan insulina en el páncreas. Se ha propuesto que sería GPRC6A, un receptor acoplado a proteína G [verificar]."
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
      que_se_anima: "Los transportadores de fosfato del túbulo se cierran, salen gotas de fosfato hacia la orina y los indicadores de fosfato y de calcitriol en sangre descienden."
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
      descripcion: "Un grupo de investigación describió que, en ratones, la osteocalcina subcarboxilada favorece la secreción de insulina y mejora la sensibilidad a la insulina. En 2020, dos estudios con nuevos ratones sin osteocalcina no hallaron alteraciones del metabolismo de la glucosa: el debate sigue abierto, y en humanos la evidencia es menos concluyente [verificar]."
      que_se_anima: "Gránulos de insulina se liberan desde la célula beta hacia el vaso; el indicador de insulina sube y el de glucosa baja. La animación muestra la hipótesis, no un hecho cerrado."
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
      descripcion: "Un estudio en ratones propuso que la lipocalina 2 de origen óseo llega al cerebro y activa el receptor MC4R de neuronas del hipotálamo, con lo que disminuye la ingesta de alimento. Falta confirmación independiente y su papel en humanos se está investigando [verificar]."
      que_se_anima: "Las neuronas del hipotálamo se iluminan y el indicador de apetito desciende. La animación muestra la hipótesis, no un hecho cerrado."
      animacion: activacion
      indicadores:
        - etiqueta: "Apetito"
          direccion: disminuye
distractores:
  - molecula: esclerostina
    por_que: "La producen los osteocitos, pero actúa de forma local: se une a los receptores LRP5 y LRP6 de los osteoblastos vecinos e inhibe la vía Wnt, con lo que frena la formación de hueso. No tiene un receptor diana en el riñón, el páncreas ni el hipotálamo de este esquema."
  - molecula: pth
    por_que: "No la produce el hueso, sino las glándulas paratiroides. Es una hormona que actúa sobre el hueso y el riñón: el sentido de la comunicación es el contrario al de esta actividad."
```

##### Actividad m1_2_quiz_calcio

```yaml
tipo: quiz
titulo: "Calcio, médula y hormonas óseas"
instrucciones: "Responde las preguntas. Tras cada respuesta verás la explicación. En la pregunta de ordenar, toca los pasos en el orden correcto (o muévelos con el teclado: Enter para tomar un paso, flechas para subirlo o bajarlo, Enter para soltarlo)."
obligatoria: false
puntaje_max: 20
concepto: "Reservorio de calcio, médula ósea y homeostasis del calcio"
retroalimentacion:
  acierto: "Excelente. Tienes claro que el hueso es el gran almacén de calcio y cómo el cuerpo lo usa para mantener estable la calcemia."
  error: "Repasa la sección: el calcio del hueso es casi todo el calcio corporal, y la PTH lo moviliza cuando la calcemia baja."
preguntas:
  - id: m1_2_q1
    formato: opcion_multiple
    enunciado: "¿Qué porcentaje aproximado del calcio del organismo se almacena en el hueso?"
    opciones:
      - id: a
        texto: "Aproximadamente el 10 %"
      - id: b
        texto: "Aproximadamente el 50 %"
      - id: c
        texto: "Aproximadamente el 75 %"
      - id: d
        texto: "Aproximadamente el 99 %"
    correcta: d
    explicacion: "El hueso contiene aproximadamente el 99 % del calcio corporal. El 1 % restante, en sangre y tejidos blandos, es el que interviene en la contracción muscular, la transmisión nerviosa y la coagulación."
    dificultad: 1
    concepto: "Reservorio de calcio"
  - id: m1_2_q2
    formato: opcion_multiple
    enunciado: "¿Qué tipo de médula ósea predomina en la cavidad medular de la diáfisis de los huesos largos de un adulto?"
    opciones:
      - id: a
        texto: "Médula roja, con intensa producción de células sanguíneas"
      - id: b
        texto: "Médula amarilla, rica en adipocitos"
      - id: c
        texto: "Hueso trabecular sin médula, con espacios vacíos"
      - id: d
        texto: "Cartílago hialino residual de la placa de crecimiento"
    correcta: b
    explicacion: "En el adulto, la diáfisis de los huesos largos tiene sobre todo médula amarilla, rica en grasa. La médula roja se concentra en el esqueleto axial y en los extremos proximales del fémur y el húmero."
    dificultad: 2
    concepto: "Nicho hematopoyético y médula ósea"
  - id: m1_2_q3
    formato: ordenar_pasos
    enunciado: "Ordena la respuesta del cuerpo cuando desciende el calcio de la sangre."
    pasos:
      - id: p1
        texto: "Desciende la concentración de calcio ionizado en la sangre."
      - id: p2
        texto: "Las glándulas paratiroides detectan el descenso y secretan PTH."
      - id: p3
        texto: "La PTH aumenta la resorción ósea y la reabsorción renal de calcio."
      - id: p4
        texto: "Pasa calcio del hueso a la sangre, la calcemia se normaliza y la secreción de PTH disminuye."
    correcta: [p1, p2, p3, p4]
    explicacion: "Es un circuito de retroalimentación negativa: la caída del calcio activa la PTH, la PTH moviliza calcio del hueso y aumenta su reabsorción en el riñón y, al normalizarse la calcemia, la señal se apaga."
    dificultad: 3
    concepto: "Homeostasis del calcio"
  - id: m1_2_q4
    formato: verdadero_falso
    enunciado: "El hueso solo recibe señales hormonales, como la PTH y la vitamina D; no emite señales a otros órganos."
    correcta: falso
    explicacion: "Es falso. El hueso también emite señales: los osteocitos producen FGF23, un mensajero bien establecido que actúa sobre el riñón. Otras moléculas, como la osteocalcina, se investigan como posibles hormonas óseas."
    dificultad: 2
    concepto: "Función endocrina del hueso"
```

### Seccion 1.3: De qué está hecho: la matriz ósea

id "m1_3_matriz"

#### Contenido

A simple vista, un hueso parece un material homogéneo. Al microscopio es un **material compuesto**: una fase orgánica flexible y una fase mineral rígida que trabajan juntas. Es la misma idea del hormigón armado: las varillas de acero resisten al estirarse y el cemento resiste al comprimirse. En el hueso, el colágeno hace de varilla y la hidroxiapatita hace de cemento.

| Componente | Qué es | Proporción aproximada | Qué aporta |
|---|---|---|---|
| Fase mineral | Cristales muy pequeños de hidroxiapatita, Ca10(PO4)6(OH)2, con sustituciones (por ejemplo, carbonato) | Entre aproximadamente el 50 % y el 70 % del peso seco, según la fuente [verificar] | Dureza, rigidez y resistencia a la compresión; reserva de calcio y fósforo |
| Matriz orgánica | Colágeno tipo I y proteínas no colágenas. Antes de mineralizarse se llama **osteoide** | El resto del peso seco | Flexibilidad, resistencia a la tracción y señales para las células |
| Agua | Unida a la matriz y presente en canalículos y conductos | Del orden del 10 % al 20 % del peso total [verificar] | Transporte de sustancias y comportamiento mecánico |

**Colágeno tipo I**

Es la proteína que forma la mayor parte de la matriz orgánica, aproximadamente el 90 % [verificar]. Los osteoblastos secretan moléculas de colágeno que se ensamblan en fibrillas y fibras. Esas fibras dan al hueso **flexibilidad** y **resistencia a la tracción**.

**Proteínas no colágenas**

Son una fracción pequeña de la matriz orgánica, pero regulan la mineralización y la comunicación con las células.

| Molécula | Qué hace |
|---|---|
| Osteocalcina | La sintetizan los osteoblastos. Se une al calcio y a la hidroxiapatita. Es la proteína no colágena más abundante del hueso. Su forma subcarboxilada actúa como hormona (sección 1.2) |
| Osteopontina | Proteína de adhesión: ancla al osteoclasto a la matriz y regula la mineralización |
| Osteonectina (SPARC) | Une colágeno y calcio; participa en la organización de la matriz y en la mineralización |
| Sialoproteína ósea | Favorece la formación de los primeros cristales de hidroxiapatita y la adhesión celular |
| Proteoglucanos (decorina, biglicano) | Regulan el ensamblaje de las fibrillas de colágeno y la mineralización, y retienen factores de crecimiento |
| Factores de crecimiento (TGF-β, IGF, BMP) | Quedan almacenados en la matriz; al reabsorberse el hueso se liberan y estimulan la formación de hueso nuevo |

**Fase mineral**

La hidroxiapatita es un fosfato de calcio. Los cristales se depositan en los espacios ordenados que quedan entre las moléculas de colágeno y a lo largo de las fibrillas. Ese mineral da **dureza** y **resistencia a la compresión**, y funciona como reservorio de calcio y fósforo. El proceso de mineralización se estudia en detalle en el módulo 4.

> Dato: puedes comprobar el papel de cada fase con dos experimentos clásicos. Si sumerges un hueso en ácido diluido (por ejemplo, vinagre) durante varios días, se disuelve el mineral y el hueso se vuelve flexible, casi como goma. Si lo calcinas, se pierde la parte orgánica y el hueso, aunque conserva su forma, se vuelve frágil y se desmorona.

> Clinico: cuando falla una de las dos fases, el hueso enferma de formas distintas. En la osteogénesis imperfecta, mutaciones en los genes del colágeno tipo I (COL1A1 y COL1A2) producen un hueso frágil, con fracturas frecuentes. En el raquitismo y la osteomalacia, el defecto es de mineralización: el hueso tiene osteoide, pero queda blando.

**Cómo se ordenan las fibras: hueso entretejido y hueso laminar**

Además de qué contiene, importa **cómo se ordena** el colágeno. Según esa disposición hay dos tipos de tejido óseo.

| Rasgo | Hueso entretejido (primario) | Hueso laminar (secundario) |
|---|---|---|
| Fibras de colágeno | Gruesas, entrecruzadas al azar | En laminillas paralelas, de unos 3 a 7 µm [verificar]; la dirección de las fibras cambia de una laminilla a la siguiente |
| Mineralización | Irregular y menor | Uniforme y mayor |
| Osteocitos | Más numerosos, más grandes, sin orden | Menos numerosos, alineados entre laminillas |
| Formación | Rápida, no necesita una superficie previa | Lenta, se deposita sobre una superficie ya existente |
| Dónde aparece | Esqueleto embrionario y fetal, callo de fractura, algunos tumores y enfermedades; en el adulto, en lugares puntuales como los alvéolos dentarios, las suturas y las inserciones de tendones [verificar] | Casi todo el hueso del adulto, cortical y trabecular |
| Resistencia | Menor | Mayor, sobre todo en la dirección de la carga |
| Destino | Temporal: se reemplaza por hueso laminar durante el remodelado | Permanente, aunque se renueva por remodelado |

![Comparación entre hueso entretejido y hueso laminar](m1_entretejido_laminar)

> Atencion: no confundas estas dos parejas de términos. **Cortical y trabecular** describen la arquitectura del hueso (compacto o esponjoso; lo verás en la sección 1.4). **Entretejido y laminar** describen cómo se ordenan las fibras de colágeno. El hueso cortical y el trabecular del adulto son laminares.

> Clinico: el hueso entretejido no es un hueso "malo": es un hueso de urgencia. Se forma rápido para estabilizar una fractura o rellenar un alvéolo tras una extracción, y luego se sustituye por hueso laminar más resistente.

Ahora verás la composición de la matriz en una explicación animada, y después la practicarás con dos actividades.

#### Actividades

##### Actividad m1_3_video_matriz

```yaml
tipo: video-texto
titulo: "Dentro de la matriz ósea"
instrucciones: "Avanza paso a paso con el botón Siguiente (o con la flecha derecha del teclado). En cada paso, lee el texto y observa qué cambia en la imagen. Para completar la actividad debes llegar al último paso."
obligatoria: true
puntaje_max: 10
concepto: "Composición de la matriz ósea"
retroalimentacion:
  acierto: "Bien. Ya sabes que la matriz ósea es un compuesto: colágeno tipo I flexible, hidroxiapatita rígida y proteínas no colágenas que regulan el conjunto."
  error: "Te faltan pasos por ver. Llega hasta el último para completar la actividad."
ilustracion: m1_matriz_composicion
nota: "Es una explicación animada sobre la ilustración SVG. Si el docente aporta un video real, se sustituirá manteniendo los mismos pasos."
pasos:
  - id: paso_1
    titulo: "El hueso, un material compuesto"
    texto_narrado: "Si amplías un fragmento de hueso, verás que no es una masa uniforme. Está formado por dos fases que trabajan juntas: una orgánica, flexible, y otra mineral, rígida. Vamos a separarlas para entender qué hace cada una."
    cambia_en_escena: "Se muestra el fragmento de hueso y un zoom lo acerca hasta la escala de una fibrilla."
    capas_visibles: [fragmento_hueso]
  - id: paso_2
    titulo: "La fase orgánica: colágeno tipo I"
    texto_narrado: "Los osteoblastos secretan moléculas de colágeno tipo I. Se alinean y se ensamblan en fibrillas con un bandeo regular. El colágeno da al hueso flexibilidad y resistencia cuando lo estiran."
    cambia_en_escena: "Aparece la fibrilla de colágeno con su bandeo regular, sin mineral."
    capas_visibles: [fibrilla_colageno]
  - id: paso_3
    titulo: "Los huecos: donde empieza el mineral"
    texto_narrado: "Dentro de la fibrilla, las moléculas de colágeno dejan espacios ordenados, los huecos. En ellos y a lo largo de la fibrilla empieza a depositarse el mineral."
    cambia_en_escena: "Se resaltan las zonas de hueco sobre la fibrilla con un color de contraste."
    capas_visibles: [fibrilla_colageno, zonas_hueco]
  - id: paso_4
    titulo: "La fase mineral: hidroxiapatita"
    texto_narrado: "Cristales diminutos de hidroxiapatita, un fosfato de calcio de fórmula Ca10(PO4)6(OH)2, crecen en los huecos y a lo largo de la fibrilla. El mineral da dureza y resistencia cuando el hueso se comprime. Además, almacena calcio y fósforo."
    cambia_en_escena: "Aparecen los cristales de hidroxiapatita en los huecos y sobre la fibrilla, que cambia de color al mineralizarse."
    capas_visibles: [fibrilla_colageno, zonas_hueco, cristales_hidroxiapatita]
  - id: paso_5
    titulo: "Las proteínas no colágenas, reguladoras"
    texto_narrado: "Entre fibrillas y cristales hay proteínas no colágenas, como la osteocalcina, la osteopontina y la osteonectina. Se unen al calcio y al colágeno, regulan la mineralización, ayudan a las células a adherirse a la matriz y guardan factores de crecimiento."
    cambia_en_escena: "Aparecen las proteínas no colágenas como puntos en la interfaz entre fibrilla y cristales, con sus etiquetas."
    capas_visibles: [fibrilla_colageno, zonas_hueco, cristales_hidroxiapatita, proteinas_no_colagenas]
  - id: paso_6
    titulo: "Dos materiales, una propiedad nueva"
    texto_narrado: "Cuando el hueso se estira, trabaja sobre todo el colágeno; cuando se comprime, trabaja sobre todo el mineral. Sin mineral, el hueso se dobla; sin colágeno, se rompe con facilidad. Juntos forman un material a la vez resistente y algo flexible."
    cambia_en_escena: "Aparecen flechas de tracción que estiran la fibrilla y flechas de compresión que la aprietan. Después alternan tres versiones: sin cristales (la fibrilla se dobla), sin fibrilla (los cristales se fragmentan) y completa (resiste)."
    capas_visibles: [fibrilla_colageno, cristales_hidroxiapatita, fuerza_traccion, fuerza_compresion]
```

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

##### Actividad m1_3_entretejido_laminar

```yaml
tipo: exploracion-3d
titulo: "Entretejido frente a laminar"
instrucciones: "Gira los bloques con un dedo y acércalos con dos (en escritorio, arrastra con el ratón y usa la rueda): a la izquierda, hueso entretejido; a la derecha, hueso laminar, a la misma escala. Toca cada estructura para ver qué la distingue. Con teclado, Tab y Enter, o elige en la lista bajo el modelo (sirve también sin 3D). Visita las cuatro."
obligatoria: true
puntaje_max: 20
concepto: "Hueso laminar y entretejido"
retroalimentacion:
  acierto: "Muy bien. Ya distingues el hueso entretejido, de fibras al azar y formación rápida, del laminar, de laminillas paralelas y más resistente."
  error: "Faltan estructuras por visitar. Compara los dos bloques: fíjate en la dirección de las fibras y en la cantidad, el tamaño y la posición de los osteocitos."
# 2026-10-18: pasa de la multicapa sobre el dibujo m1_entretejido_laminar (con una ilustración hecha con IA debajo
# que pintaba el hueso laminar como bandas con cavidades) a un modelo 3D construido por código: dos bloques a la
# misma escala. Mismas estructuras, textos, requeridas y puntaje. El dibujo sigue como figura de la sección 1.3.
modelo: hueso_entretejido_laminar
hotspots:
  - id: fibras_entretejidas
    etiqueta: "Fibras entrecruzadas al azar"
    descripcion: "En el hueso entretejido, los haces de colágeno son gruesos y se entrecruzan sin un orden. Se forma rápido y sin necesitar una superficie previa, por eso aparece en el feto, en el callo de fractura y en la reparación de un alvéolo."
  - id: osteocitos_entretejido
    etiqueta: "Osteocitos del hueso entretejido"
    descripcion: "Son más numerosos y más grandes que en el hueso laminar, y se distribuyen sin orden. La mineralización es irregular y menor."
  - id: laminillas_paralelas
    etiqueta: "Laminillas paralelas"
    descripcion: "En el hueso laminar, el colágeno se ordena en capas paralelas de unos pocos micrómetros; la dirección de las fibras cambia de una capa a la siguiente. Esta disposición lo hace más resistente."
  - id: osteocitos_laminares
    etiqueta: "Osteocitos del hueso laminar"
    descripcion: "Son menos numerosos y se alinean entre las laminillas, con canalículos que los conectan. La mineralización es más uniforme y mayor."
requeridos: [fibras_entretejidas, osteocitos_entretejido, laminillas_paralelas, osteocitos_laminares]
```

##### Actividad m1_3_quiz_matriz

```yaml
tipo: quiz
titulo: "Repaso de la matriz ósea"
instrucciones: "Responde las preguntas de repaso. Tras cada una verás la explicación. Esta actividad es opcional, pero te ayuda a fijar los conceptos antes de seguir."
obligatoria: false
puntaje_max: 20
concepto: "Composición de la matriz ósea"
retroalimentacion:
  acierto: "Muy bien. Tienes claros los componentes de la matriz y sus propiedades."
  error: "Vuelve a la tabla de componentes: colágeno tipo I para la tracción, hidroxiapatita para la compresión, proteínas no colágenas para regular."
preguntas:
  - id: m1_3_q1
    formato: opcion_multiple
    enunciado: "¿Qué proteína forma la mayor parte de la matriz orgánica del hueso?"
    opciones:
      - id: a
        texto: "Elastina"
      - id: b
        texto: "Colágeno tipo II"
      - id: c
        texto: "Colágeno tipo I"
      - id: d
        texto: "Queratina"
    correcta: c
    explicacion: "El colágeno tipo I es aproximadamente el 90 % [verificar] de la matriz orgánica. El colágeno tipo II es el del cartílago hialino; la elastina y la queratina no son componentes mayores del hueso."
    dificultad: 1
    concepto: "Colágeno tipo I"
  - id: m1_3_q2
    formato: opcion_multiple
    enunciado: "Un hueso se sumerge en ácido diluido durante varios días y se vuelve flexible. ¿Qué componente se disolvió?"
    opciones:
      - id: a
        texto: "El colágeno tipo I"
      - id: b
        texto: "El mineral (hidroxiapatita)"
      - id: c
        texto: "El agua unida a la matriz"
      - id: d
        texto: "Las proteínas no colágenas"
    correcta: b
    explicacion: "El ácido disuelve el mineral y queda la matriz orgánica de colágeno, que es flexible. Sin la hidroxiapatita, el hueso pierde rigidez y resistencia a la compresión."
    dificultad: 2
    concepto: "Fase mineral: hidroxiapatita"
  - id: m1_3_q3
    formato: opcion_multiple
    enunciado: "¿Qué rasgo distingue al hueso laminar del entretejido?"
    opciones:
      - id: a
        texto: "Sus fibras de colágeno se entrecruzan al azar y se forma más rápido."
      - id: b
        texto: "Sus osteocitos son más numerosos y de mayor tamaño."
      - id: c
        texto: "Solo aparece en el feto y se reemplaza después del nacimiento."
      - id: d
        texto: "Sus fibras forman laminillas paralelas y se mineraliza de forma más uniforme."
    correcta: d
    explicacion: "En el hueso laminar el colágeno se ordena en laminillas y la mineralización es uniforme; por eso es más resistente. Las fibras al azar y los osteocitos más numerosos son rasgos del entretejido, y el laminar es el hueso del adulto."
    dificultad: 2
    concepto: "Hueso laminar y entretejido"
  - id: m1_3_q4
    formato: verdadero_falso
    enunciado: "Las proteínas no colágenas son una fracción pequeña de la matriz orgánica del hueso, pero regulan la mineralización y las señales celulares."
    correcta: verdadero
    explicacion: "Es verdadero. La mayor parte de la matriz orgánica es colágeno tipo I; las proteínas no colágenas son minoritarias, pero regulan la mineralización, la adhesión celular y el almacén de factores de crecimiento."
    dificultad: 2
    concepto: "Proteínas no colágenas"
```

### Seccion 1.4: Cómo se organiza: del corte a la osteona

id "m1_4_organizacion"

#### Contenido

Ya sabes de qué está hecho el hueso y cómo se ordenan sus fibras. Ahora sube de escala: ¿cómo se organiza el tejido dentro de un hueso? Vamos a recorrer un corte de la superficie hacia el interior.

**Hueso cortical y hueso trabecular**

Un mismo hueso tiene dos arquitecturas. El **cortical** (o compacto) es la masa densa de la superficie. El **trabecular** (o esponjoso) es una red tridimensional de láminas y barras, las trabéculas, con espacios llenos de médula.

| Rasgo | Hueso cortical | Hueso trabecular |
|---|---|---|
| Aspecto | Masa densa y continua | Red de trabéculas con espacios medulares |
| Proporción de la masa esquelética | Aproximadamente el 80 % [verificar] | Aproximadamente el 20 % [verificar] |
| Porosidad | Baja, aproximadamente menos del 10 % [verificar] | Alta, aproximadamente del 50 % al 90 % [verificar] |
| Dónde predomina | Diáfisis y capa externa de todos los huesos | Epífisis, metáfisis y el interior de vértebras y huesos cortos y planos |
| Unidad estructural | Osteona (sistema de Havers) | Trabécula de hueso laminar, sin conductos de Havers: se nutre desde la médula |
| Función principal | Resistir flexión y torsión, proteger, servir de palanca | Repartir y absorber cargas de compresión; ofrecer gran superficie de contacto con la médula |
| Ritmo de renovación | Más lento | Más rápido, por su mayor superficie |

> Clinico: como el hueso trabecular se renueva más rápido, es el primero en mostrar la pérdida ósea en la osteoporosis. Por eso las vértebras, ricas en trabéculas, son un sitio frecuente de fractura por fragilidad.

> Atencion: recuerda que cortical y trabecular no son lo mismo que laminar y entretejido. El hueso trabecular sano de un adulto es laminar.

**Periostio y endostio: las dos membranas del hueso**

- **Periostio.** Membrana de tejido conjuntivo que cubre la superficie externa del hueso, salvo las superficies articulares, que llevan cartílago. Tiene dos capas: una **externa fibrosa**, con vasos, nervios y colágeno, y una **interna celular** (osteogénica o cambium), con células osteoprogenitoras y osteoblastos. Sus fibras de Sharpey penetran en el hueso y lo anclan; a él se unen tendones y ligamentos. Permite que el hueso crezca en grosor y se repare.
- **Endostio.** Capa muy delgada de células (osteoprogenitoras y de revestimiento óseo) que tapiza las superficies internas: la cara interna de la cortical, la cavidad medular, cada trabécula y los conductos de Havers y de Volkmann. Es la superficie donde ocurre buena parte del remodelado interno y del intercambio de minerales.

> Clinico: si en una cirugía se despega el periostio en una zona amplia, la parte externa de la cortical pierde parte de su irrigación. Por eso se procura conservarlo, sobre todo en la mandíbula, cuyo periostio aporta una parte importante de la irrigación del hueso.

![Corte longitudinal de un hueso largo, de la superficie al interior](m1_corte_hueso_capas)

**La osteona: la unidad de la cortical**

La cortical de un adulto está formada por miles de cilindros llamados **osteonas** o sistemas de Havers, orientados a lo largo del hueso. Cada osteona tiene:

- Un **conducto de Havers** central, de unas 50 µm [verificar], que contiene capilares, fibras nerviosas y tejido conjuntivo laxo.
- Entre 5 y 20 aproximadamente [verificar] **laminillas concéntricas** de hueso alrededor del conducto.
- **Osteocitos** en pequeñas cavidades, las **lagunas**, situadas entre las laminillas. Cada osteocito extiende prolongaciones por **canalículos** hasta el conducto central y hasta sus vecinos: es la red que lleva nutrientes y transmite señales.
- Una **línea cementante** que rodea la osteona y marca hasta dónde llegó la resorción antes de formarse.

Entre las osteonas hay dos elementos más:

- **Laminillas intersticiales:** restos de osteonas antiguas que quedaron entre las nuevas.
- **Conductos de Volkmann:** canales transversales u oblicuos que comunican los conductos de Havers entre sí y con el periostio y la cavidad medular. Llevan vasos y, a diferencia de los de Havers, no están rodeados de laminillas concéntricas propias.

Bajo el periostio y alrededor de la cavidad medular hay además laminillas que rodean todo el hueso: las laminillas circunferenciales externas e internas.

> Atencion: no confundas los conductos. **Havers:** longitudinales y rodeados de laminillas concéntricas. **Volkmann:** transversales u oblicuos y sin laminillas concéntricas propias; conectan.

Ahora trabajarás en 3D: primero sobre el extremo de un hueso serrado y después sobre un bloque de hueso cortical con sus osteonas.

#### Actividades

##### Actividad m1_4_corte_capas

```yaml
tipo: exploracion-3d
titulo: "Del periostio a la médula"
instrucciones: "La aplicación te pedirá tocar, una por una, cada estructura del corte, desde la superficie hacia el interior. Gira el hueso con un dedo y acércalo con dos (en escritorio, arrastra con el ratón y usa la rueda). Con teclado, Tab y Enter; también puedes elegir en la lista de estructuras bajo el modelo. Si te equivocas, verás una pista y podrás intentarlo de nuevo."
obligatoria: true
puntaje_max: 20
concepto: "Hueso cortical y trabecular, periostio y endostio"
retroalimentacion:
  acierto: "Correcto. Recorriste el corte de fuera hacia dentro: el periostio, la cortical densa, el endostio que tapiza sus caras internas, el hueso trabecular esponjoso y la médula ósea que ocupa sus espacios."
  error: "Esa no es la estructura pedida. Lee la pista: el endostio es una línea muy fina que tapiza por dentro la cortical y las trabéculas, y la médula ocupa los espacios entre ellas."
# 2026-10-18: pasa de la multicapa sobre el dibujo m1_corte_hueso_capas (con una ilustración hecha con IA debajo
# que pintaba la cortical pardo rojiza, como un músculo) a un modelo 3D construido por código: el extremo de un hueso
# largo serrado a lo largo. Sigue en modo identificar, con las mismas pistas, textos, requeridas y puntaje. La figura
# de la lectura sigue siendo el dibujo rotulado (m1_corte_hueso_capas_rotulado).
modelo: hueso_capas
modo: identificar
hotspots:
  - id: periostio
    etiqueta: "Periostio"
    descripcion: "Membrana de tejido conjuntivo que cubre por fuera el hueso. Tiene una capa externa fibrosa (vasos, nervios, fibras de Sharpey) y una capa interna celular con células osteoprogenitoras. Permite crecer en grosor y reparar el hueso."
    pista: "Busca la membrana más externa, la que cubre el hueso por fuera."
  - id: hueso_cortical
    etiqueta: "Hueso cortical"
    descripcion: "Hueso compacto y denso, formado por osteonas y laminillas circunferenciales. Es más grueso en la diáfisis. Resiste la flexión y la torsión."
    pista: "Busca la capa densa y continua que está justo debajo del periostio."
  - id: endostio
    etiqueta: "Endostio"
    descripcion: "Capa muy delgada de células osteoprogenitoras y de revestimiento. Tapiza la cara interna de la cortical, la cavidad medular, cada trabécula y los conductos de Havers."
    pista: "Busca la línea muy fina que tapiza por dentro la cortical y las trabéculas."
  - id: hueso_trabecular
    etiqueta: "Hueso trabecular"
    descripcion: "Red de trabéculas con espacios llenos de médula. Predomina en las epífisis y metáfisis. Reparte las cargas y ofrece una gran superficie para el intercambio metabólico."
    pista: "Busca la red esponjosa de barras y láminas con espacios, hacia el extremo del hueso."
  - id: medula_osea
    etiqueta: "Médula ósea"
    descripcion: "Tejido blando que llena la cavidad medular y los espacios entre trabéculas. Puede ser roja (hematopoyética) o amarilla (adiposa) según la zona y la edad."
    pista: "Busca el tejido blando que llena la cavidad central y los espacios entre trabéculas."
requeridos: [periostio, hueso_cortical, endostio, hueso_trabecular, medula_osea]
```

##### Actividad m1_4_osteona

```yaml
tipo: exploracion-3d
titulo: "Localiza las partes de la osteona"
instrucciones: "La aplicación te pedirá tocar, una por una, cada estructura de la osteona. Gira el bloque con un dedo y acércalo con dos (en escritorio, arrastra con el ratón y usa la rueda). Si te equivocas, verás una pista y podrás intentarlo de nuevo (con teclado, Tab y Enter; también puedes elegir en la lista de estructuras bajo el modelo)."
obligatoria: true
puntaje_max: 20
concepto: "Osteona y conductos de Havers y de Volkmann"
retroalimentacion:
  acierto: "Excelente. Localizaste las estructuras de la osteona y distingues los conductos de Havers, longitudinales, de los de Volkmann, transversales."
  error: "Esa no es la estructura pedida. Lee la pista: el conducto de Havers está en el centro de las laminillas concéntricas; el de Volkmann las cruza y conecta."
# 2026-10-18: pasa de la multicapa sobre el dibujo m1_osteona_detalle (con una ilustración hecha con IA debajo en la
# que no se veían las lagunas ni los canalículos) a un modelo 3D construido por código: un bloque de hueso cortical
# con varias osteonas y una en primer plano. Sigue en modo identificar, con las mismas pistas, textos, requeridas y
# puntaje.
modelo: osteona
modo: identificar
hotspots:
  - id: conducto_de_havers
    etiqueta: "Conducto de Havers"
    descripcion: "Canal longitudinal en el centro de la osteona. Contiene capilares, fibras nerviosas y tejido conjuntivo laxo, y mide unas 50 µm [verificar]."
    pista: "Busca el canal longitudinal que ocupa el centro de las laminillas concéntricas."
  - id: laminillas_concentricas
    etiqueta: "Laminillas concéntricas"
    descripcion: "Capas cilíndricas de hueso laminar dispuestas alrededor del conducto de Havers. Entre unas 5 y 20 por osteona [verificar]."
    pista: "Busca los anillos de hueso que rodean el conducto central."
  - id: osteocito_en_laguna
    etiqueta: "Osteocito en su laguna"
    descripcion: "Osteocito alojado en una cavidad entre laminillas. Es la célula más abundante del hueso adulto y participa en la percepción de la carga."
    pista: "Busca una célula pequeña alojada en una cavidad entre dos laminillas."
  - id: canaliculos
    etiqueta: "Canalículos"
    descripcion: "Pequeños canales que salen de cada laguna. Por ellos pasan las prolongaciones de los osteocitos, que se conectan entre sí y con el conducto de Havers."
  - id: linea_cementante
    etiqueta: "Línea cementante"
    descripcion: "Contorno que rodea la osteona. Marca el límite hasta donde llegó la resorción antes de que se formara la osteona."
    pista: "Busca el contorno festoneado que rodea toda la osteona."
  - id: conducto_de_volkmann
    etiqueta: "Conducto de Volkmann"
    descripcion: "Canal transversal u oblicuo que comunica conductos de Havers entre sí y con el periostio y la cavidad medular. Lleva vasos y no tiene laminillas concéntricas propias."
    pista: "Busca el canal que cruza en sentido transversal u oblicuo y no tiene anillos propios."
  - id: laminillas_intersticiales
    etiqueta: "Laminillas intersticiales"
    descripcion: "Fragmentos de osteonas antiguas que quedaron entre osteonas más recientes tras el remodelado."
    pista: "Busca los fragmentos angulosos de hueso que quedan entre las osteonas."
requeridos: [conducto_de_havers, laminillas_concentricas, osteocito_en_laguna, linea_cementante, conducto_de_volkmann, laminillas_intersticiales]
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

##### Actividad m1_4_quiz_organizacion

```yaml
tipo: quiz
titulo: "Repaso de la organización del hueso"
instrucciones: "Responde las preguntas de repaso. Tras cada una verás la explicación. Esta actividad es opcional."
obligatoria: false
puntaje_max: 20
concepto: "Organización microscópica del hueso"
retroalimentacion:
  acierto: "Muy bien. Manejas la organización del hueso desde la superficie hasta la osteona."
  error: "Vuelve al corte: periostio, cortical, trabecular, endostio y médula; y a la osteona con sus conductos."
preguntas:
  - id: m1_4_q1
    formato: opcion_multiple
    enunciado: "¿Qué contiene el conducto de Havers?"
    opciones:
      - id: a
        texto: "Médula ósea roja y células madre hematopoyéticas"
      - id: b
        texto: "Solo cristales de hidroxiapatita, sin células ni vasos"
      - id: c
        texto: "Capilares y nervios rodeados de tejido conjuntivo laxo"
      - id: d
        texto: "Osteocitos dentro de sus lagunas, sin vasos"
    correcta: c
    explicacion: "El conducto de Havers lleva la irrigación y la inervación de la osteona: capilares, fibras nerviosas y tejido conjuntivo laxo. Los osteocitos viven en lagunas de las laminillas, no en el conducto."
    dificultad: 1
    concepto: "Osteona y conductos de Havers y de Volkmann"
  - id: m1_4_q2
    formato: opcion_multiple
    enunciado: "¿Qué tipo de hueso predomina en la epífisis de un hueso largo y se renueva más rápido por su gran superficie?"
    opciones:
      - id: a
        texto: "Cortical, con osteonas gruesas"
      - id: b
        texto: "Trabecular, de estructura esponjosa"
      - id: c
        texto: "Cortical, con laminillas circunferenciales"
      - id: d
        texto: "Entretejido, que forma la epífisis del adulto"
    correcta: b
    explicacion: "La epífisis es sobre todo hueso trabecular. Su mayor superficie en contacto con la médula favorece un recambio más rápido que el de la cortical."
    dificultad: 2
    concepto: "Hueso cortical y trabecular"
  - id: m1_4_q3
    formato: verdadero_falso
    enunciado: "El periostio es la capa de células que tapiza la cavidad medular y la superficie de las trabéculas."
    correcta: falso
    explicacion: "Es falso. Esa es la descripción del endostio. El periostio cubre la superficie externa del hueso."
    dificultad: 2
    concepto: "Periostio y endostio"
  - id: m1_4_q4
    formato: opcion_multiple
    enunciado: "En un corte de la diáfisis se ve un canal que atraviesa la cortical de forma oblicua, sin laminillas concéntricas propias, y que lleva un vaso sanguíneo. ¿Qué estructura es?"
    opciones:
      - id: a
        texto: "Un conducto de Volkmann"
      - id: b
        texto: "Un conducto de Havers"
      - id: c
        texto: "Un canalículo"
      - id: d
        texto: "Una laguna osteocitaria"
    correcta: a
    explicacion: "Los conductos de Volkmann cruzan de forma transversal u oblicua, comunican los conductos de Havers y no están rodeados de laminillas concéntricas. Los de Havers son longitudinales; los canalículos son mucho más pequeños."
    dificultad: 3
    concepto: "Osteona y conductos de Havers y de Volkmann"
```

### Seccion 1.5: La mandíbula, un hueso bajo carga

id "m1_5_mandibula"

#### Contenido

Es hora de aplicar todo lo anterior a un hueso concreto: la mandíbula. Es un hueso móvil, porque se articula con el cráneo y se mueve para masticar, hablar y abrir la boca. Aloja los dientes y soporta las cargas de la masticación una y otra vez a lo largo del día.

**Anatomía de la mandíbula**

- **Cuerpo:** la porción horizontal, en forma de arco de herradura. Su borde superior lleva los dientes; su borde inferior es la base.
- **Rama:** la porción vertical a cada lado, que sube desde el cuerpo.
- **Ángulo:** la esquina donde se unen el borde inferior del cuerpo y el borde posterior de la rama. Ahí se insertan el masetero (por fuera) y el pterigoideo medial (por dentro).
- **Cóndilo (proceso condilar):** en el extremo posterior de la rama. Su cabeza se articula con el hueso temporal en la articulación temporomandibular; su cuello es estrecho y recibe al pterigoideo lateral.
- **Apófisis coronoides:** la proyección triangular anterior de la rama; en ella se inserta el músculo temporal.
- **Escotadura mandibular:** la concavidad entre la coronoides y el cóndilo.
- **Sínfisis mentoniana:** la línea media donde se unen las dos mitades. Al nacer es una unión fibrosa, y se osifica durante el primer año de vida [verificar].
- **Foramen mentoniano:** abertura en la cara externa del cuerpo, por lo general bajo el segundo premolar o entre los premolares [verificar]. Por él sale el nervio mentoniano con sus vasos.
- **Foramen y conducto mandibular:** el foramen mandibular está en la cara medial de la rama, protegido por una pequeña lengüeta ósea, la língula. Da entrada al **conducto mandibular**, que recorre por dentro la rama y el cuerpo con el nervio alveolar inferior y sus vasos. A la altura de los premolares emite una rama que sale por el foramen mentoniano; el resto continúa hacia delante como conducto incisivo.
- **Apófisis alveolar:** el borde superior del cuerpo, con los alvéolos donde se alojan las raíces de los dientes.

> Clinico: el nervio alveolar inferior se anestesia cerca del foramen mandibular. Al planificar un implante o extraer un tercer molar hay que ubicar con precisión el conducto mandibular y el foramen mentoniano para no lesionar el nervio. Además, el ángulo y el cuello del cóndilo se cuentan entre los sitios más frecuentes de fractura mandibular [verificar].

**Estructura interna**

Como en cualquier hueso, la mandíbula tiene hueso cortical y trabecular. Su cuerpo es una cortical gruesa, sobre todo hacia el borde inferior, que rodea un núcleo de hueso trabecular con médula. Esa combinación resiste bien la flexión y la torsión que provoca la masticación.

**La apófisis alveolar y el hueso alveolar propio**

La apófisis alveolar es la parte de la mandíbula que existe gracias a los dientes. Tiene dos componentes:

- **Hueso alveolar propio:** una lámina delgada que reviste cada alvéolo. Está perforada por pequeños orificios por donde pasan vasos y nervios hacia el ligamento periodontal, por eso también se llama **lámina cribiforme**. Recibe las fibras de Sharpey del ligamento periodontal, que anclan el diente al hueso. En una radiografía se ve como una línea densa: la **lámina dura**.
- **Hueso alveolar de soporte:** las tablas corticales vestibular y lingual, más el hueso trabecular que hay entre ellas y el hueso alveolar propio.

![Corte transversal del cuerpo mandibular a la altura de una raíz dentaria](m1_proceso_alveolar_corte)

> Atencion: el hueso alveolar propio no es toda la apófisis alveolar. Es solo la delgada lámina que reviste el alvéolo y recibe las fibras del ligamento periodontal.

**La mandíbula como palanca y su carga masticatoria**

Al morder, la mandíbula funciona como una palanca. El punto de apoyo es la articulación temporomandibular. La fuerza la generan los músculos elevadores (masetero, temporal y pterigoideo medial). La resistencia es el alimento entre los dientes. En términos generales se describe como una palanca de tercera clase, con la fuerza aplicada entre el apoyo y la resistencia [verificar].

Esa fuerza somete al hueso a **flexión, torsión, compresión y cizallamiento**. La sínfisis, donde se unen las dos mitades, es una zona donde se concentran esfuerzos de flexión y torsión. La fuerza máxima de mordida en los molares es del orden de varios cientos de newtons, aproximadamente entre 300 y 700 N según la población y el método de medición [verificar]. Al masticar se usa solo una fracción de esa fuerza, pero esas cargas más pequeñas se repiten miles de veces al día.

El diente transmite la carga al hueso a través del ligamento periodontal: la fuerza que empuja al diente hacia el alvéolo se convierte en tensión sobre las fibras del ligamento, que tiran del hueso alveolar propio. Esa tensión es una señal mecánica para las células del hueso.

**La ley de Wolff**

En 1892, el anatomista y cirujano alemán Julius Wolff propuso que el hueso adapta su arquitectura interna y su forma externa a las cargas que soporta. Se refuerza donde la carga aumenta y se debilita donde disminuye. La imagen clásica es el fémur proximal: sus trabéculas se alinean con las líneas de máxima compresión y de tracción.

![Corte frontal del fémur proximal con la orientación de las trabéculas](m1_wolff_femur)

La ciencia actual habla de **adaptación funcional**. El hueso detecta cuánto se deforma; si la deformación supera cierto umbral, forma hueso, y si es muy baja, lo pierde. Responde más a cargas dinámicas y repetidas que a cargas estáticas. La ley de Wolff no es una ecuación exacta, sino un principio general bien respaldado. Describe la adaptación a cargas fisiológicas sostenidas; la fuerza ortodóncica, en cambio, es un caso de remodelado dirigido, como verás en los ejemplos. Cómo detectan la carga las células (la mecanotransducción) lo verás en el módulo 3.

Algunos ejemplos generales: el brazo dominante de un tenista tiene más masa ósea que el otro; un astronauta pierde masa ósea en los huesos que soportan peso tras meses de microgravedad.

**Ejemplos en la mandíbula**

- **Pérdida de un diente.** Sin diente, el hueso alveolar deja de recibir la carga que le transmitía el ligamento periodontal y se reabsorbe. Tras una extracción, la pérdida ocurre en dos fases. En los primeros meses se reabsorbe con rapidez el hueso alveolar propio, que depende del diente, junto con el remodelado de cicatrización: ahí se pierde la mayor parte del ancho del reborde. A largo plazo, la falta de carga mantiene la pérdida. En algunos estudios el ancho llega a disminuir cerca de la mitad en el primer año [verificar].
- **Ortodoncia.** Una fuerza controlada sobre un diente comprime el ligamento periodontal de un lado y lo estira del otro. El estímulo llega al hueso a través del ligamento: se reabsorbe hueso alveolar en el lado comprimido y se forma hueso nuevo en el lado traccionado, y el diente se mueve a través del hueso. Es un remodelado dirigido, no una simple aplicación de "más carga, más hueso".
- **Implantes.** Un implante osteointegrado transmite las cargas masticatorias al hueso, que vuelve a recibir estímulo mecánico y puede ayudar a conservar su masa. Una carga excesiva, en cambio, puede dañar el hueso de alrededor.

> Recuerda: el hueso es un tejido vivo que se adapta a la carga. Lo que se usa se conserva; lo que deja de usarse tiende a perderse.

Cierra el módulo explorando la mandíbula en 3D, viendo el hueso alveolar por dentro, aplicando la ley de Wolff a casos reales y, al final, con la evaluación final.

#### Actividades

##### Actividad m1_5_mandibula_3d

```yaml
tipo: exploracion-3d
titulo: "Explora la mandíbula en 3D"
instrucciones: "Gira la mandíbula con un dedo y acércala con dos (en escritorio, arrastra con el ratón y usa la rueda). Toca cada punto luminoso para leer qué estructura es. Con teclado, Tab y Enter, o elige en la lista bajo el modelo (sirve también sin 3D). Visita los nueve puntos requeridos."
obligatoria: true
puntaje_max: 30
concepto: "Anatomía de la mandíbula"
retroalimentacion:
  acierto: "Excelente. Reconoces las estructuras principales de la mandíbula, desde el cóndilo hasta el hueso alveolar."
  error: "Todavía quedan puntos por visitar. Gira el modelo: algunas estructuras, como el foramen mandibular, están en la cara interna y otras, como el foramen mentoniano, en la externa."
modelo: mandibula
hotspots:
  - id: cuerpo
    etiqueta: "Cuerpo"
    descripcion: "Porción horizontal, en forma de arco de herradura. En su borde superior está la apófisis alveolar y en su cara externa se abre el foramen mentoniano. Tiene una cortical gruesa, sobre todo hacia el borde inferior, que rodea un núcleo de hueso trabecular."
    zona_anatomica: "Porción horizontal, entre la sínfisis y el ángulo"
  - id: rama
    etiqueta: "Rama"
    descripcion: "Porción vertical a cada lado. Da inserción al masetero en su cara lateral y al pterigoideo medial en su cara medial, y sostiene la apófisis coronoides y el cóndilo. En su cara medial está el foramen mandibular."
    zona_anatomica: "Porción vertical posterior"
  - id: angulo
    etiqueta: "Ángulo"
    descripcion: "Unión del borde inferior del cuerpo con el borde posterior de la rama. Ahí se insertan el masetero por fuera y el pterigoideo medial por dentro. Es un sitio frecuente de fractura [verificar]."
    zona_anatomica: "Esquina posteroinferior"
  - id: condilo
    etiqueta: "Cóndilo (proceso condilar)"
    descripcion: "Tiene una cabeza convexa que se articula con la fosa mandibular del hueso temporal, formando la articulación temporomandibular, y un cuello estrecho donde se inserta el pterigoideo lateral. Es el punto de apoyo de la palanca mandibular."
    zona_anatomica: "Extremo posterosuperior de la rama"
  - id: apofisis_coronoides
    etiqueta: "Apófisis coronoides"
    descripcion: "Proyección triangular anterior de la rama. Recibe la inserción del músculo temporal, un potente elevador de la mandíbula."
    zona_anatomica: "Extremo anterosuperior de la rama"
  - id: escotadura_mandibular
    etiqueta: "Escotadura mandibular"
    descripcion: "Concavidad entre la apófisis coronoides y el cóndilo. Por ella pasan los vasos y el nervio del masetero hacia el músculo."
    zona_anatomica: "Borde superior de la rama, entre coronoides y cóndilo"
  - id: sinfisis
    etiqueta: "Sínfisis mentoniana"
    descripcion: "Línea media anterior donde se unen las dos mitades de la mandíbula. Al nacer es una unión fibrosa que se osifica durante el primer año de vida [verificar]. Concentra esfuerzos de flexión y torsión al morder. En su cara externa se forma la protuberancia mentoniana."
    zona_anatomica: "Línea media anterior"
  - id: foramen_mentoniano
    etiqueta: "Foramen mentoniano"
    descripcion: "Abertura en la cara externa del cuerpo, por lo general bajo el segundo premolar o entre los premolares [verificar]. Por aquí sale el nervio mentoniano con sus vasos, que dan sensibilidad al labio inferior y al mentón."
    zona_anatomica: "Cara externa del cuerpo, a la altura de los premolares"
  - id: foramen_mandibular
    etiqueta: "Foramen mandibular"
    descripcion: "El foramen mandibular está en la cara medial de la rama, protegido por la língula. Da entrada al conducto mandibular, que recorre por dentro la rama y el cuerpo y contiene el nervio alveolar inferior con sus vasos. A la altura de los premolares emite una rama que sale por el foramen mentoniano. El marcador está en el foramen; el trayecto del conducto es interno."
    zona_anatomica: "Cara medial de la rama (entrada) y trayecto interno del cuerpo"
  - id: proceso_alveolar
    etiqueta: "Proceso alveolar (apófisis alveolar)"
    descripcion: "Borde superior del cuerpo, con los alvéolos donde se alojan las raíces dentarias. Está formada por hueso alveolar propio (la lámina cribiforme que reviste el alvéolo y recibe las fibras del ligamento periodontal) y por hueso alveolar de soporte (tablas corticales y hueso trabecular). Depende de los dientes: se forma con ellos y se reabsorbe si se pierden."
    zona_anatomica: "Borde superior del cuerpo"
requeridos: [cuerpo, rama, angulo, condilo, apofisis_coronoides, sinfisis, foramen_mentoniano, foramen_mandibular, proceso_alveolar]
```

##### Actividad m1_5_proceso_alveolar

```yaml
tipo: multicapa
titulo: "El hueso alveolar por dentro"
instrucciones: "La aplicación te pedirá tocar, una por una, cuatro estructuras del corte (con teclado, Tab y Enter; también puedes elegir en la lista de estructuras bajo la imagen). Si te equivocas, verás una pista y podrás intentarlo de nuevo."
obligatoria: true
puntaje_max: 20
concepto: "Hueso alveolar propio"
retroalimentacion:
  acierto: "Muy bien. Distingues el hueso alveolar propio, que reviste el alvéolo y recibe las fibras del ligamento, del hueso de soporte formado por las tablas corticales y el hueso trabecular."
  error: "Esa no es la estructura pedida. Lee la pista y recuerda que el hueso alveolar propio es solo la lámina que toca al ligamento periodontal, no toda la apófisis alveolar."
svg: m1_proceso_alveolar_corte
modo: identificar
capas:
  - id: hueso_alveolar_propio
    etiqueta: "Hueso alveolar propio (lámina cribiforme)"
    descripcion: "Lámina delgada que reviste el alvéolo, perforada por orificios por donde pasan vasos y nervios hacia el ligamento periodontal. Recibe las fibras de Sharpey del ligamento. En las radiografías se ve como una línea densa, la lámina dura."
    pista: "Busca la lámina delgada y densa que reviste el alvéolo, pegada al ligamento."
  - id: tablas_corticales
    etiqueta: "Tablas corticales vestibular y lingual"
    descripcion: "Láminas de hueso cortical en las caras vestibular y lingual de la apófisis alveolar. Forman el contorno exterior y dan resistencia."
    pista: "Busca las capas densas del contorno exterior, por el lado de la mejilla y por el de la lengua."
  - id: hueso_trabecular_alveolar
    etiqueta: "Hueso trabecular de soporte"
    descripcion: "Hueso esponjoso entre el hueso alveolar propio y las tablas corticales. Sus trabéculas se orientan según las fuerzas que transmite el diente. Contiene médula ósea."
    pista: "Busca la red esponjosa que hay entre el alvéolo y las tablas corticales."
  - id: ligamento_periodontal
    etiqueta: "Ligamento periodontal"
    descripcion: "Tejido conjuntivo fibroso, muy delgado, situado entre la raíz y el hueso alveolar propio. Sus fibras unen el diente al hueso y transmiten la carga de la masticación."
    pista: "Busca la banda fibrosa muy delgada entre la raíz y la pared del alvéolo."
  - id: raiz_dentaria
    etiqueta: "Raíz del diente"
    descripcion: "Parte del diente alojada en el alvéolo: dentina cubierta por cemento. Transmite la fuerza masticatoria al hueso a través del ligamento periodontal."
  - id: conducto_mandibular
    etiqueta: "Conducto mandibular"
    descripcion: "Conducto situado bajo las raíces, cerca del borde inferior del cuerpo, con el nervio alveolar inferior y sus vasos. Su posición condiciona la cirugía y los implantes."
requeridas: [hueso_alveolar_propio, tablas_corticales, hueso_trabecular_alveolar, ligamento_periodontal]
```

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

##### Actividad m1_5_wolff_femur

```yaml
tipo: multicapa
titulo: "Las trabéculas siguen la carga"
instrucciones: "Toca cada zona del fémur para ver cómo se orienta el hueso según la carga (con teclado, Tab para pasar de una zona a otra y Enter para abrir su descripción). Esta actividad es opcional."
obligatoria: false
puntaje_max: 10
concepto: "Ley de Wolff"
retroalimentacion:
  acierto: "Bien. Las trabéculas no están al azar: siguen las líneas de compresión y de tracción, tal como propuso Wolff."
  error: "Faltan zonas por visitar. Observa cómo se cruzan los dos sistemas de trabéculas."
svg: m1_wolff_femur
modo: explorar
capas:
  - id: trayectorias_compresion
    etiqueta: "Trabéculas de compresión"
    descripcion: "Siguen las líneas de compresión: van desde la cortical medial del cuello del fémur hacia la parte superior de la cabeza."
  - id: trayectorias_traccion
    etiqueta: "Trabéculas de tracción"
    descripcion: "Siguen las líneas de tracción: parten de la cortical lateral y se arquean hacia la parte inferior de la cabeza. Se cruzan con las de compresión casi en ángulo recto."
  - id: corteza_femoral
    etiqueta: "Cortical del fémur"
    descripcion: "La cortical es más gruesa donde la carga es mayor, como en el lado medial del cuello y en la diáfisis. Es un modelo simplificado."
requeridas: [trayectorias_compresion, trayectorias_traccion, corteza_femoral]
```

##### Actividad m1_5_evaluacion_final

```yaml
tipo: quiz
titulo: "Evaluación final del módulo 1"
instrucciones: "Responde las 13 preguntas; tras cada una verás si acertaste y por qué. En la de ordenar, toca los pasos en orden (o muévelos con el teclado). Al terminar se calcula tu puntaje. Para el logro Primer hueso necesitas completar todas las actividades obligatorias y al menos el 60 % de esta evaluación."
obligatoria: true
puntaje_max: 100
concepto: "Evaluación integradora del módulo 1"
retroalimentacion:
  acierto: "Felicitaciones. Dominas las ideas centrales del hueso: su naturaleza, sus funciones, su matriz, su organización y su adaptación a la carga en la mandíbula."
  error: "Repasa los conceptos donde fallaste: el mentor puede ayudarte a reforzarlos con ejemplos y nuevas preguntas."
preguntas:
  - id: m1_e_q1
    formato: opcion_multiple
    enunciado: "¿Qué diferencia hay entre 'hueso' y 'tejido óseo'?"
    opciones:
      - id: a
        texto: "Son sinónimos: ambos términos designan la matriz mineralizada."
      - id: b
        texto: "El hueso es solo la matriz; el tejido óseo incluye células y vasos."
      - id: c
        texto: "El hueso es un órgano; el tejido óseo es su tejido principal."
      - id: d
        texto: "El hueso es el tejido del adulto; el tejido óseo, el del niño."
    correcta: c
    explicacion: "El hueso es un órgano: reúne tejido óseo, médula ósea, periostio, endostio, vasos, nervios y cartílago articular. El tejido óseo es el tejido conjuntivo especializado que forma la mayor parte de él."
    dificultad: 1
    concepto: "Hueso y tejido óseo"
  - id: m1_e_q2
    formato: opcion_multiple
    enunciado: "Baja el calcio en la sangre. ¿Qué respuesta del cuerpo es la correcta?"
    opciones:
      - id: a
        texto: "Las paratiroides secretan más PTH, que libera calcio del hueso y lo retiene en el riñón."
      - id: b
        texto: "Las paratiroides secretan menos PTH y el hueso deposita más calcio en su matriz."
      - id: c
        texto: "El hueso deja de reabsorberse y el riñón elimina más calcio por la orina para compensar."
      - id: d
        texto: "El hueso sintetiza vitamina D activa y así aumenta la absorción intestinal de calcio."
    correcta: a
    explicacion: "Ante una calcemia baja, las paratiroides secretan PTH: aumenta la resorción ósea, aumenta la reabsorción renal de calcio y estimula la síntesis renal de calcitriol. La vitamina D activa se forma en el riñón, no en el hueso."
    dificultad: 2
    concepto: "Homeostasis del calcio"
  - id: m1_e_q3
    formato: opcion_multiple
    enunciado: "¿Qué hace el FGF23 que producen los osteocitos?"
    opciones:
      - id: a
        texto: "Estimula a los osteoblastos vecinos para que formen más hueso."
      - id: b
        texto: "Aumenta la pérdida de fosfato por la orina y reduce el calcitriol."
      - id: c
        texto: "Libera calcio del hueso cuando baja la calcemia."
      - id: d
        texto: "Aumenta la reabsorción de fosfato en el túbulo proximal."
    correcta: b
    explicacion: "FGF23 lo producen los osteocitos y actúa en el túbulo proximal del riñón: aumenta la pérdida de fosfato por la orina y reduce el calcitriol. Frenar la formación de hueso es la función local de la esclerostina, y movilizar calcio es la de la PTH."
    dificultad: 2
    concepto: "Función endocrina del hueso"
  - id: m1_e_q4
    formato: opcion_multiple
    enunciado: "¿Qué propiedad aporta principalmente la hidroxiapatita al hueso?"
    opciones:
      - id: a
        texto: "Flexibilidad y resistencia cuando el hueso se estira."
      - id: b
        texto: "Regulación de la mineralización y de la adhesión celular."
      - id: c
        texto: "Elasticidad, con recuperación de forma tras estirarse."
      - id: d
        texto: "Dureza y resistencia a la compresión, y reserva de calcio."
    correcta: d
    explicacion: "La hidroxiapatita es el mineral de la matriz: da dureza y resistencia a la compresión. La flexibilidad y la resistencia a la tracción las aporta el colágeno tipo I, y las proteínas no colágenas regulan la mineralización."
    dificultad: 2
    concepto: "Fase mineral: hidroxiapatita"
  - id: m1_e_q5
    formato: verdadero_falso
    enunciado: "La osteogénesis imperfecta se debe, en la mayoría de los casos, a mutaciones en los genes del colágeno tipo I."
    correcta: verdadero
    explicacion: "Es verdadero. Se debe a mutaciones en COL1A1 o COL1A2, que alteran la fase orgánica y producen un hueso frágil. Los defectos de mineralización producen, en cambio, raquitismo y osteomalacia."
    dificultad: 2
    concepto: "Colágeno tipo I"
  - id: m1_e_q6
    formato: opcion_multiple
    enunciado: "¿En qué se diferencia el hueso trabecular del cortical?"
    opciones:
      - id: a
        texto: "En el adulto sano es hueso inmaduro (entretejido)."
      - id: b
        texto: "Su unidad estructural es la osteona, con conducto de Havers."
      - id: c
        texto: "Tiene mayor porosidad y superficie, y se renueva más rápido."
      - id: d
        texto: "Predomina en la diáfisis de los huesos largos y forma su pared."
    correcta: c
    explicacion: "El hueso trabecular es una red de trabéculas con alta porosidad y gran superficie en contacto con la médula, lo que favorece un recambio más rápido. Tiene osteocitos, es laminar en el adulto y no depende de conductos de Havers; la pared de la diáfisis es cortical."
    dificultad: 2
    concepto: "Hueso cortical y trabecular"
  - id: m1_e_q7
    formato: opcion_multiple
    enunciado: "Una célula osteoprogenitora se encuentra en la capa interna de una membrana que cubre por fuera la diáfisis de un hueso. ¿Qué estructura es?"
    opciones:
      - id: a
        texto: "El periostio"
      - id: b
        texto: "El endostio"
      - id: c
        texto: "El pericondrio"
      - id: d
        texto: "La membrana sinovial"
    correcta: a
    explicacion: "El periostio cubre por fuera el hueso y tiene una capa interna celular (osteogénica) con células osteoprogenitoras. El endostio tapiza las superficies internas; el pericondrio rodea el cartílago; la membrana sinovial reviste la cápsula articular."
    dificultad: 2
    concepto: "Periostio y endostio"
  - id: m1_e_q8
    formato: opcion_multiple
    enunciado: "¿Cuál de estas afirmaciones distingue correctamente los conductos de Havers y de Volkmann?"
    opciones:
      - id: a
        texto: "Ambos son longitudinales y están rodeados de laminillas concéntricas propias."
      - id: b
        texto: "Havers: transversales y sin laminillas; Volkmann: longitudinales, con ellas."
      - id: c
        texto: "Los de Volkmann corren dentro de cada osteona, alrededor de un capilar."
      - id: d
        texto: "Havers: longitudinales, con laminillas; Volkmann: oblicuos, sin laminillas propias."
    correcta: d
    explicacion: "Los conductos de Havers son longitudinales y están en el centro de una osteona, rodeados de laminillas concéntricas. Los de Volkmann cruzan de forma transversal u oblicua, conectan conductos de Havers entre sí y con el periostio y la médula, y no tienen laminillas concéntricas propias."
    dificultad: 3
    concepto: "Osteona y conductos de Havers y de Volkmann"
  - id: m1_e_q9
    formato: opcion_multiple
    enunciado: "¿En cuál de estas situaciones es más probable encontrar hueso entretejido?"
    opciones:
      - id: a
        texto: "En la cortical de la diáfisis de un adulto sano."
      - id: b
        texto: "En el callo de una fractura en reparación."
      - id: c
        texto: "En una osteona madura de la cortical."
      - id: d
        texto: "En el hueso trabecular de una vértebra sana."
    correcta: b
    explicacion: "El hueso entretejido se forma rápido, sin una superficie previa, por eso aparece en el callo de fractura. La cortical madura, las osteonas y el hueso trabecular sano del adulto son laminares."
    dificultad: 2
    concepto: "Hueso laminar y entretejido"
  - id: m1_e_q10
    formato: ordenar_pasos
    enunciado: "Ordena, desde la superficie hacia el interior, las capas de un corte transversal de la diáfisis."
    pasos:
      - id: p1
        texto: "Periostio"
      - id: p2
        texto: "Hueso cortical"
      - id: p3
        texto: "Endostio"
      - id: p4
        texto: "Médula ósea"
    correcta: [p1, p2, p3, p4]
    explicacion: "De fuera hacia dentro: el periostio cubre la superficie, sigue la cortical, el endostio tapiza la cavidad medular y en el centro está la médula ósea."
    dificultad: 2
    concepto: "Periostio y endostio"
  - id: m1_e_q11
    formato: opcion_multiple
    enunciado: "¿Qué estructura de la mandíbula contiene el nervio alveolar inferior durante su trayecto por la rama y el cuerpo?"
    opciones:
      - id: a
        texto: "El conducto mandibular"
      - id: b
        texto: "El conducto de Volkmann"
      - id: c
        texto: "El foramen mentoniano"
      - id: d
        texto: "La escotadura mandibular"
    correcta: a
    explicacion: "El nervio alveolar inferior entra por el foramen mandibular y viaja dentro del conducto mandibular. El foramen mentoniano es su salida como nervio mentoniano; la escotadura es una concavidad de la rama; los conductos de Volkmann son de la cortical."
    dificultad: 2
    concepto: "Anatomía de la mandíbula"
  - id: m1_e_q12
    formato: opcion_multiple
    enunciado: "¿Qué parte de la apófisis alveolar reviste el alvéolo y recibe las fibras de Sharpey del ligamento periodontal?"
    opciones:
      - id: a
        texto: "La tabla cortical vestibular de la apófisis"
      - id: b
        texto: "El hueso alveolar propio (lámina cribiforme)"
      - id: c
        texto: "El hueso trabecular de soporte del alvéolo"
      - id: d
        texto: "La cortical gruesa del borde basal del cuerpo"
    correcta: b
    explicacion: "El hueso alveolar propio es la lámina delgada que reviste el alvéolo y ancla las fibras del ligamento periodontal. Las tablas corticales y el hueso trabecular forman el hueso de soporte."
    dificultad: 3
    concepto: "Hueso alveolar propio"
  - id: m1_e_q13
    formato: opcion_multiple
    enunciado: "Tras perder un molar inferior sin reemplazarlo, el reborde alveolar se reabsorbe con los años. ¿Qué principio lo explica mejor?"
    opciones:
      - id: a
        texto: "El hueso alveolar propio es entretejido y se reabsorbe por ser inmaduro."
      - id: b
        texto: "Una osteonecrosis por pérdida del periostio del reborde."
      - id: c
        texto: "La ley de Wolff: sin la carga del diente, el hueso se pierde."
      - id: d
        texto: "Un aumento de la actividad de los osteoblastos por falta de estímulo."
    correcta: c
    explicacion: "El hueso alveolar depende del diente y de la carga que le transmite el ligamento periodontal. En los primeros meses se reabsorbe sobre todo el hueso alveolar propio, con el remodelado de cicatrización [verificar]; a largo plazo, la falta de carga mantiene la pérdida, como predice la ley de Wolff."
    dificultad: 3
    concepto: "Ley de Wolff"
```

## Glosario

- **Hueso:** órgano formado por tejido óseo, médula ósea, periostio, endostio, vasos, nervios y, en las articulaciones, cartílago articular.
- **Tejido óseo:** tejido conjuntivo especializado formado por células y una matriz extracelular mineralizada.
- **Matriz extracelular:** material que rodea a las células de un tejido conjuntivo; en el hueso es rígida por su mineral.
- **Osteoide:** matriz orgánica recién secretada por los osteoblastos, todavía sin mineralizar.
- **Hidroxiapatita:** fosfato de calcio cristalino, Ca10(PO4)6(OH)2, que forma la fase mineral del hueso y le da dureza.
- **Colágeno tipo I:** proteína fibrilar que forma la mayor parte de la matriz orgánica del hueso y le da flexibilidad y resistencia a la tracción.
- **Proteínas no colágenas:** proteínas de la matriz, como la osteocalcina, la osteopontina y la osteonectina, que regulan la mineralización y la adhesión celular.
- **Osteocalcina:** proteína no colágena más abundante del hueso, sintetizada por los osteoblastos; su forma subcarboxilada se ha propuesto como hormona, una hipótesis con resultados discordantes en ratones.
- **FGF23:** factor de crecimiento de fibroblastos 23, hormona producida por los osteocitos que aumenta la pérdida de fosfato por la orina y reduce el calcitriol.
- **Hueso cortical (compacto):** hueso denso y de baja porosidad que forma la capa externa de los huesos y la diáfisis.
- **Hueso trabecular (esponjoso):** hueso formado por una red de trabéculas con espacios ocupados por médula.
- **Hueso laminar:** hueso cuyas fibras de colágeno se ordenan en laminillas paralelas; es el hueso maduro del adulto.
- **Hueso entretejido:** hueso de fibras de colágeno entrecruzadas al azar, que se forma rápido en el desarrollo y en la reparación.
- **Periostio:** membrana de tejido conjuntivo que cubre la superficie externa del hueso, con una capa fibrosa y una capa celular osteogénica.
- **Endostio:** capa celular delgada que tapiza las superficies internas del hueso.
- **Fibras de Sharpey:** fibras de colágeno que penetran en el hueso desde el periostio o el ligamento periodontal y lo anclan.
- **Osteona (sistema de Havers):** unidad estructural del hueso cortical: un conducto de Havers rodeado de laminillas concéntricas.
- **Conducto de Havers:** canal longitudinal central de la osteona, con capilares y nervios.
- **Conducto de Volkmann:** canal transversal u oblicuo que comunica conductos de Havers entre sí y con el periostio y la médula.
- **Línea cementante:** contorno de una osteona, que marca el límite de la resorción previa a su formación.
- **Laguna y canalículo:** cavidad donde vive un osteocito y canales por los que pasan sus prolongaciones.
- **Médula ósea:** tejido blando de la cavidad medular y los espacios trabeculares; puede ser roja (hematopoyética) o amarilla (adiposa).
- **Nicho hematopoyético:** microambiente de la médula ósea que mantiene y regula a las células madre hematopoyéticas.
- **Epífisis, metáfisis y diáfisis:** extremos, zona de transición y cuerpo de un hueso largo.
- **Remodelado óseo:** renovación continua del hueso: los osteoclastos reabsorben hueso viejo y los osteoblastos forman hueso nuevo.
- **Apófisis alveolar:** parte de la mandíbula (o del maxilar) que aloja las raíces de los dientes en los alvéolos.
- **Hueso alveolar propio (lámina cribiforme):** lámina delgada que reviste el alvéolo y recibe las fibras de Sharpey del ligamento periodontal; en la radiografía se ve como lámina dura.
- **Conducto mandibular:** conducto que recorre la rama y el cuerpo de la mandíbula con el nervio alveolar inferior y sus vasos.
- **Ley de Wolff:** principio según el cual el hueso adapta su arquitectura y su forma a las cargas que soporta.

## Referencias

Obras estándar consultadas para redactar este módulo. No se citan páginas ni ediciones cuando no se pudieron confirmar. El docente puede sustituirlas por las ediciones que use en su curso.

1. Ross MH, Pawlina W. *Ross. Histología: Texto y Atlas.* Wolters Kluwer.
2. Mescher AL. *Junqueira. Histología básica: texto y atlas.* McGraw-Hill.
3. Gartner LP, Hiatt JL. *Texto atlas de histología.* McGraw-Hill.
4. Kierszenbaum AL, Tres LL. *Histología y biología celular: introducción a la anatomía patológica.* Elsevier.
5. Nanci A. *Ten Cate. Histología oral: desarrollo, estructura y función.* Elsevier.
6. Hall JE, Hall ME. *Guyton y Hall. Tratado de fisiología médica.* Elsevier.
7. Barrett KE, Barman SM, Brooks HL, Yuan JXJ. *Ganong. Fisiología médica.* McGraw-Hill.
8. Standring S (ed.). *Gray's Anatomy: The Anatomical Basis of Clinical Practice.* 41.ª ed. Elsevier.
9. Moore KL, Dalley AF, Agur AMR. *Anatomía con orientación clínica.* Wolters Kluwer.
10. Bilezikian JP, Martin TJ, Clemens TL, Rosen CJ (eds.). *Principles of Bone Biology.* Academic Press.
11. Rosen CJ (ed.). *Primer on the Metabolic Bone Diseases and Disorders of Mineral Metabolism.*
12. Lindhe J, Lang NP (eds.). *Clinical Periodontology and Implant Dentistry.* Wiley-Blackwell.
13. Wolff J. *Das Gesetz der Transformation der Knochen.* Berlin: A. Hirschwald, 1892.

## Banco de preguntas para el mentor

Preguntas extra, distintas de las del módulo, para reforzar con el estudiante. Cada una lleva su respuesta, su dificultad (1 a 3) y el concepto que refuerza.

1. Pregunta: ¿Qué diferencia hay entre "hueso" y "tejido óseo"?
   - Respuesta: el hueso es un órgano (tejido óseo, médula ósea, periostio, endostio, vasos, nervios y, en las articulaciones, cartílago articular); el tejido óseo es el tejido que forma la mayor parte de ese órgano.
   - Dificultad: 1
   - Concepto: El hueso como tejido conjuntivo especializado, dinámico y vascularizado
2. Pregunta: ¿Por qué se dice que el hueso es un tejido dinámico?
   - Respuesta: porque se remodela toda la vida: los osteoclastos reabsorben hueso viejo y los osteoblastos forman hueso nuevo, lo que repara microdaños, adapta el hueso a la carga y permite intercambiar calcio con la sangre.
   - Dificultad: 1
   - Concepto: El hueso como tejido conjuntivo especializado, dinámico y vascularizado
3. Pregunta: Verdadero o falso: el hueso crece porque sus osteocitos se dividen dentro de la matriz.
   - Respuesta: falso. Los osteocitos están atrapados en la matriz mineralizada y no se dividen; el hueso crece por aposición (se añade hueso nuevo sobre una superficie) y, en longitud, por la placa de crecimiento.
   - Dificultad: 1
   - Concepto: El hueso como tejido conjuntivo especializado, dinámico y vascularizado
4. Pregunta: Si el 99 % del calcio está en el hueso, ¿por qué importa tanto el 1 % restante?
   - Respuesta: porque el calcio de la sangre y de los tejidos blandos es el que hace posible la contracción muscular, la transmisión nerviosa y la coagulación. La calcemia debe mantenerse en un rango estrecho, y el hueso actúa como banco para lograrlo.
   - Dificultad: 2
   - Concepto: Reservorio de calcio
5. Pregunta: ¿En qué regiones del esqueleto adulto se concentra la médula roja?
   - Respuesta: en el esqueleto axial (cráneo, vértebras, costillas, esternón y pelvis) y en los extremos proximales del fémur y el húmero. La diáfisis de los huesos largos tiene sobre todo médula amarilla.
   - Dificultad: 2
   - Concepto: Nicho hematopoyético y médula ósea
6. Pregunta: ¿Qué hace FGF23 en el riñón?
   - Respuesta: actúa sobre el túbulo proximal: reduce la reabsorción de fosfato, con lo que se pierde por la orina, y disminuye la síntesis de calcitriol. El resultado es una fosfatemia más baja.
   - Dificultad: 2
   - Concepto: Función endocrina del hueso
7. Pregunta: ¿Qué se sabe con seguridad de la osteocalcina y qué sigue en discusión?
   - Respuesta: es seguro que es la proteína no colágena más abundante de la matriz y que se une al calcio y a la hidroxiapatita. Que su forma subcarboxilada actúe como hormona sobre el páncreas y otros tejidos es una hipótesis que salió sobre todo de un grupo de investigación; en 2020, dos estudios con nuevos ratones sin osteocalcina no encontraron alteraciones del metabolismo de la glucosa, así que el debate sigue abierto.
   - Dificultad: 3
   - Concepto: Proteínas no colágenas
8. Pregunta: ¿Qué componente de la matriz resiste mejor la tracción y cuál resiste mejor la compresión?
   - Respuesta: el colágeno tipo I resiste la tracción y da flexibilidad; la hidroxiapatita resiste la compresión y da dureza.
   - Dificultad: 1
   - Concepto: Composición de la matriz ósea
9. Pregunta: ¿Por qué un hueso sumergido en ácido queda flexible y uno calcinado queda frágil?
   - Respuesta: el ácido disuelve el mineral y deja la matriz de colágeno, flexible; el calor elimina la parte orgánica y deja el mineral, que es rígido pero frágil sin las fibras que lo refuerzan.
   - Dificultad: 2
   - Concepto: Composición de la matriz ósea
10. Pregunta: ¿Qué es el osteoide?
    - Respuesta: es la matriz orgánica (sobre todo colágeno tipo I) recién secretada por los osteoblastos y todavía sin mineralizar. Cuando el osteoide se mineraliza, se convierte en matriz ósea madura.
    - Dificultad: 2
    - Concepto: Composición de la matriz ósea
11. Pregunta: Un compañero dice que el hueso trabecular es "inmaduro" porque es esponjoso. ¿Es correcto?
    - Respuesta: no. Confunde dos clasificaciones. Trabecular y cortical describen la arquitectura; entretejido y laminar describen la disposición del colágeno. El hueso trabecular de un adulto sano es laminar, es decir, maduro.
    - Dificultad: 2
    - Concepto: Hueso cortical y trabecular
12. Pregunta: ¿Qué tienen en común y en qué se diferencian los conductos de Havers y los de Volkmann?
    - Respuesta: ambos llevan vasos y nervios por la cortical. Los de Havers son longitudinales y están rodeados de laminillas concéntricas; los de Volkmann son transversales u oblicuos, comunican los conductos de Havers entre sí y con el periostio y la médula, y no tienen laminillas concéntricas propias.
    - Dificultad: 2
    - Concepto: Osteona y conductos de Havers y de Volkmann
13. Pregunta: ¿Por qué el hueso trabecular no necesita conductos de Havers?
    - Respuesta: porque sus trabéculas son delgadas y los osteocitos quedan cerca de los vasos de la médula, que las rodea; los nutrientes llegan desde la superficie a través de los canalículos.
    - Dificultad: 3
    - Concepto: Hueso cortical y trabecular
14. Pregunta: ¿Qué es la línea cementante y qué indica?
    - Respuesta: es el contorno que rodea una osteona. Marca el límite hasta donde llegó la resorción del hueso antiguo antes de que se formara la osteona nueva.
    - Dificultad: 3
    - Concepto: Osteona y conductos de Havers y de Volkmann
15. Pregunta: ¿Por qué el hueso entretejido es útil aunque sea más débil que el laminar?
    - Respuesta: porque se forma rápido y sin necesidad de una superficie previa, lo que permite estabilizar una fractura o rellenar un alvéolo con urgencia. Después se reemplaza por hueso laminar más resistente.
    - Dificultad: 2
    - Concepto: Hueso laminar y entretejido
16. Pregunta: ¿Qué papel cumple el periostio cuando se fractura un hueso?
    - Respuesta: su capa interna tiene células osteoprogenitoras que proliferan y forman el callo externo de la fractura; además aporta vasos que irrigan la zona.
    - Dificultad: 2
    - Concepto: Periostio y endostio
17. Pregunta: ¿Por qué duele una fractura si la matriz mineralizada no siente?
    - Respuesta: porque el periostio y la médula están inervados; los nervios acompañan a los vasos. El dolor viene de esas estructuras, no de la matriz mineralizada.
    - Dificultad: 2
    - Concepto: El hueso como tejido conjuntivo especializado, dinámico y vascularizado
18. Pregunta: ¿Qué relación hay entre el conducto mandibular y el foramen mentoniano?
    - Respuesta: el nervio alveolar inferior entra por el foramen mandibular y viaja dentro del conducto mandibular. Cerca del final, una rama sale por el foramen mentoniano como nervio mentoniano, que da sensibilidad al labio inferior y al mentón.
    - Dificultad: 2
    - Concepto: Anatomía de la mandíbula
19. Pregunta: ¿Qué es la lámina dura de una radiografía dental y qué estructura representa?
    - Respuesta: es la línea radiopaca que rodea la raíz del diente. Corresponde al hueso alveolar propio, la lámina cribiforme que reviste el alvéolo.
    - Dificultad: 3
    - Concepto: Hueso alveolar propio
20. Pregunta: ¿Por qué se reabsorbe el reborde alveolar tras una extracción dental?
    - Respuesta: en dos fases. En los primeros meses se reabsorbe con rapidez el hueso alveolar propio, que depende del diente y de su ligamento, junto con el remodelado de cicatrización; ahí se pierde la mayor parte del ancho. A largo plazo, la falta de la carga que transmitía el diente mantiene la pérdida, como predice la ley de Wolff.
    - Dificultad: 2
    - Concepto: Ley de Wolff
21. Pregunta: ¿La ley de Wolff es una ley exacta?
    - Respuesta: no. Es un principio general bien respaldado (adaptación funcional del hueso a la carga), no una ecuación precisa. Hoy se explica con el mecanostato de Frost y con la mecanotransducción de los osteocitos, que se estudian en el módulo 3.
    - Dificultad: 3
    - Concepto: Ley de Wolff
22. Pregunta: ¿Por qué se describe la mandíbula como una palanca y de qué clase suele decirse que es?
    - Respuesta: porque gira sobre un punto de apoyo (la articulación temporomandibular), los músculos elevadores aplican la fuerza y el alimento ofrece la resistencia. Se describe como una palanca de tercera clase, con la fuerza entre el apoyo y la resistencia; algunos textos matizan que depende del tipo de mordida.
    - Dificultad: 2
    - Concepto: Función de palanca
23. Pregunta: ¿Qué es un nicho hematopoyético?
    - Respuesta: un microambiente de la médula ósea donde células del estroma, del endotelio y del linaje osteoblástico dan señales (como la quimiocina CXCL12) que mantienen y regulan a las células madre hematopoyéticas. Gran parte de estos nichos es perivascular.
    - Dificultad: 2
    - Concepto: Nicho hematopoyético y médula ósea
24. Pregunta: En ortodoncia, el hueso se reabsorbe justo donde aumenta la fuerza sobre el ligamento. ¿Contradice esto la ley de Wolff?
    - Respuesta: no exactamente. La ley de Wolff describe la adaptación a cargas fisiológicas sostenidas. La fuerza ortodóncica es un remodelado dirigido: comprime el ligamento periodontal de un lado (allí se reabsorbe hueso) y lo estira del otro (allí se forma hueso), y así el diente se mueve.
    - Dificultad: 3
    - Concepto: Ley de Wolff

## Ganchos para el mentor

### Conceptos clave del módulo

1. El hueso es un tejido conjuntivo especializado, dinámico y muy vascularizado; se remodela toda la vida.
2. Funciones: sostén, protección, palanca, reservorio de calcio (aproximadamente 99 %) y fósforo, nicho hematopoyético y función endocrina (FGF23 está bien establecido; osteocalcina y lipocalina 2 son hipótesis en estudio).
3. La matriz es un compuesto: colágeno tipo I (flexibilidad, tracción), hidroxiapatita (dureza, compresión) y proteínas no colágenas (regulación).
4. Dos clasificaciones distintas: cortical o trabecular (arquitectura) y laminar o entretejido (disposición del colágeno).
5. De la superficie al interior: periostio, cortical (osteonas con Havers y Volkmann), trabecular, endostio y médula.
6. La mandíbula: cuerpo, rama, ángulo, cóndilo, coronoides, sínfisis, foramen mentoniano, conducto mandibular y apófisis alveolar con hueso alveolar propio.
7. Ley de Wolff: el hueso se adapta a las cargas fisiológicas sostenidas; sin carga, se pierde (por ejemplo, a largo plazo, el reborde tras una extracción). La ortodoncia es un remodelado dirigido a través del ligamento periodontal.

### Errores frecuentes y cómo aclararlos

| Error frecuente | Por qué ocurre | Cómo aclararlo |
|---|---|---|
| "El hueso es un tejido inerte, como una piedra" | Se le conoce por el esqueleto seco de los museos | Pedir que piense en una fractura que cicatriza: solo un tejido vivo, vascularizado y con células activas puede repararse. Recordar el remodelado continuo |
| "Hueso cortical es lo mismo que hueso maduro y trabecular es inmaduro" | Se confunden arquitectura y disposición del colágeno | Separar dos ejes: cortical o trabecular (cómo está construido) frente a laminar o entretejido (cómo se ordenan las fibras). El trabecular sano del adulto es laminar |
| "Havers y Volkmann son lo mismo" | Los nombres se parecen y ambos llevan vasos | Havers: longitudinal, con laminillas concéntricas. Volkmann: transversal u oblicuo, sin laminillas concéntricas propias, y conecta. Usar la imagen de la actividad de la osteona |
| "El periostio cubre la cavidad medular" | Confusión entre periostio y endostio | Periostio = por fuera; endostio = por dentro. "Peri" significa alrededor y "endo", dentro |
| "El hueso almacena calcio, así que da calcio con cada comida" | Se piensa el 99 % como un depósito inerte | Explicar la regulación fina por PTH, calcitriol y calcitonina y el papel del 1 % circulante. El intercambio depende de las necesidades, no de cada comida |
| "El hueso entretejido es un hueso enfermo" | Se asocia a patología (tumores, enfermedad de Paget) | Mostrar que es el primer hueso normal del feto y del callo de fractura; es un hueso de urgencia que luego se reemplaza por laminar |
| "La osteocalcina es un tipo de colágeno", "solo un marcador" o "una hormona comprobada" | El nombre no orienta, se conoce como marcador de laboratorio y se divulga como hormona | Es una proteína no colágena de la matriz. Que su forma subcarboxilada actúe como hormona es una hipótesis: un grupo la describió en ratones y estudios de 2020 con nuevos ratones no la reprodujeron |
| "Los osteocitos se dividen y así crece el hueso" | Se generaliza desde otros tejidos | Recordar que están atrapados en la matriz. El hueso crece por aposición; las células nuevas vienen de las osteoprogenitoras |
| "El hueso alveolar propio es toda la apófisis alveolar" | Se usa "hueso alveolar" para todo | El propio es solo la lámina que reviste el alvéolo y recibe las fibras de Sharpey; el resto es hueso de soporte (tablas corticales y trabecular) |
| "El foramen mentoniano y el foramen mandibular son lo mismo" | Los nombres se parecen | Mandibular: cara medial de la rama, entrada del conducto. Mentoniano: cara externa del cuerpo, salida del nervio mentoniano |
| "La ley de Wolff es una fórmula exacta" o "el hueso solo responde al peso estático" | Se enseña como ley fija | Es un principio de adaptación funcional; responde más a cargas dinámicas y repetidas. La base celular se ve en el módulo 3 |
| "Con más carga siempre hay más hueso" (y por eso la ortodoncia parece una excepción) | Se aplica la regla sin distinguir cargas fisiológicas de fuerzas dirigidas | La ley describe cargas fisiológicas sostenidas. En ortodoncia el estímulo llega por el ligamento periodontal: hay resorción en el lado comprimido y formación en el lado traccionado |
| "El hueso sintetiza la vitamina D" | Se confunde el almacén de minerales con la regulación del calcio | La vitamina D3 se sintetiza en la piel a partir del 7-deshidrocolesterol; se activa en el hígado y el riñón. El hueso almacena calcio y fósforo, pero no la produce |
| "La médula roja ocupa todo el hueso adulto" | Se generaliza desde el niño | En el niño casi toda es roja; en el adulto se concentra en el esqueleto axial y en extremos proximales de fémur y húmero, y la amarilla ocupa la diáfisis |

### Cómo usar el contexto

- **Si el estudiante falla la actividad `m1_2_hormonas_oseas`:** aclarar que la esclerostina actúa de forma local y que la PTH viene de las paratiroides; retomar "de dónde sale cada mensajero". Recordar que FGF23 es el mensajero bien establecido y que osteocalcina y lipocalina 2 se presentan como hipótesis.
- **Si falla `m1_4_osteona`:** volver a la imagen y pedir que describa el trayecto de un vaso desde el periostio hasta un conducto de Havers.
- **Si falla la evaluación final en ley de Wolff:** usar los casos del reborde alveolar tras una extracción y del astronauta; si confunde la ortodoncia, volver al ligamento periodontal (lado comprimido y lado traccionado).
- **Nivel de posgrado:** ampliar con el mecanostato de Frost (umbrales de deformación que activan formación o resorción), la red lacuno-canalicular como sensor de la carga, el papel de la esclerostina y el debate sobre la osteocalcina y la lipocalina 2 (resultados discordantes en ratones, incluidos los estudios de 2020 con nuevos ratones sin osteocalcina, y evidencia humana limitada). Todo ello se retoma en los módulos 3 a 5.
- **Nivel de pregrado:** mantener las analogías (hormigón armado, llave y cerradura) y evitar los nombres técnicos de receptores (FGFR–α-Klotho, GPRC6A, MC4R) salvo que el estudiante los pida; en pantalla solo aparecen como texto de ayuda.

## Notas de verificacion para el docente

Estas son las afirmaciones marcadas con [verificar] en el cuerpo, y otras cifras que conviene confirmar contra los textos del curso antes de la versión final.

### A. Cifras aproximadas o que varían entre fuentes (marcadas con [verificar])

1. **Calcio y fósforo del cuerpo en el hueso (sección 1.2).** El briefing dice 99 % del calcio; los textos de fisiología coinciden en aproximadamente 99 %. Para el fósforo se cita aproximadamente 85 %; algunas fuentes dan un rango algo distinto. Confirmar con el texto de referencia del curso.
2. **Composición de la matriz (sección 1.3).** La fase mineral se cita entre aproximadamente el 50 % del peso seco (algunos textos de histología) y aproximadamente el 65 % o 70 % (otros). Se puso un rango. El agua se cita entre aproximadamente 10 % y 20 % del peso total según el hueso y el método. Confirmar qué cifra se prefiere y ajustar el texto.
3. **Colágeno tipo I como aproximadamente el 90 % de la matriz orgánica (sección 1.3).** Los textos dan entre aproximadamente 85 % y 95 %.
4. **Grosor de las laminillas (sección 1.3).** Se usa "de unos 3 a 7 µm"; algunas fuentes dan 5 a 7 µm.
5. **Sitios donde persiste hueso entretejido en el adulto (sección 1.3).** Se citan alvéolos dentarios, suturas e inserciones de tendones. No todos los textos enumeran los mismos sitios.
6. **Proporción de cortical y trabecular, y porosidad (sección 1.4).** Aproximadamente 80 % y 20 % de la masa esquelética; porosidad cortical menor de aproximadamente 10 % y trabecular de aproximadamente 50 % a 90 %. Varían con el sitio anatómico y el método.
7. **Dimensiones de la osteona (sección 1.4 y `m1_osteona_detalle`).** Conducto de Havers de unas 50 µm; osteona de unos 200 a 250 µm; entre 5 y 20 laminillas concéntricas. Los textos dan rangos amplios (algunos hablan de 4 a 20 laminillas y de osteonas de hasta unos 500 µm).
8. **Renovación del esqueleto (sección 1.1).** "Del orden del 10 % al año" es una cifra habitual, pero la renovación difiere mucho entre hueso cortical y trabecular y entre individuos.
9. **Distribución de la médula roja en el adulto (sección 1.2).** Esqueleto axial y extremos proximales de fémur y húmero. Confirmar la lista de huesos y si se quiere mencionar la mandíbula.
10. **Nicho hematopoyético (sección 1.2).** La importancia relativa del nicho perivascular y del nicho endosteal se sigue discutiendo. Se optó por decir que hoy predomina la idea del nicho perivascular. Confirmar el nivel de detalle deseado.
11. **Osteocalcina y lipocalina 2 como hormonas (secciones 1.2 y actividad `m1_2_hormonas_oseas`).** FGF23 es un mecanismo establecido (hay enfermedades humanas). La osteocalcina como hormona proviene sobre todo de un grupo de investigación; en 2020 dos grupos independientes (Diegel et al. y Moriishi et al., PLoS Genetics) crearon nuevos ratones sin osteocalcina y no hallaron alteraciones del metabolismo de la glucosa, la testosterona ni la masa muscular. La lipocalina 2 con MC4R se apoya sobre todo en un solo laboratorio. La identidad del receptor de la osteocalcina en la célula beta (GPRC6A) también se discute. El guion las presenta como hipótesis en estudio, pero la actividad las puntúa como pares. **Decisión que se pide al docente:** (a) dejarlas como están, con esa redacción; (b) dejar solo FGF23 como par puntuado y pasar las otras dos a texto informativo sin penalización; o (c) quitarlas del módulo.
12. **Sínfisis mentoniana (sección 1.5).** Se osifica "durante el primer año de vida"; los textos difieren entre aproximadamente los 6 meses y los 2 años.
13. **Posición del foramen mentoniano (sección 1.5).** "Bajo el segundo premolar o entre los premolares". Las frecuencias varían entre poblaciones y en un mismo individuo con la edad.
14. **Palanca de tercera clase (sección 1.5).** Es la descripción habitual; algunos textos de biomecánica matizan que la clase depende del tipo de mordida y de la contribución muscular.
15. **Fuerza máxima de mordida (sección 1.5).** Se dio un rango aproximado de 300 a 700 N. Los estudios dan promedios distintos según edad, sexo, población, diente y método.
16. **Fracturas mandibulares (sección 1.5).** Se dice que el ángulo y el cuello del cóndilo se cuentan entre los sitios más frecuentes; la frecuencia relativa varía según la población y la causa.
17. **Pérdida de reborde tras la extracción (sección 1.5).** Se menciona que llega a cerca de la mitad del ancho en el primer año en algunos estudios (Schropp y colaboradores, 2003), con unos dos tercios de esa pérdida en los primeros 3 meses. Se describen dos fases: reabsorción rápida del hueso alveolar propio (hueso fasciculado, que depende del diente) con remodelado de cicatrización, y pérdida crónica por falta de carga (Araújo y Lindhe). Las cifras varían entre estudios y sitios; confirmar antes de usar un valor concreto.
18. **Médula ósea de la mandíbula adulta (sección 1.2).** Se dice que es sobre todo grasa, con posibles focos de médula hematopoyética visibles en algunas radiografías. Confirmar la redacción y si se quiere ampliar.
19. **Tiempo de estudio (ficha).** Se declara de 45 a 60 minutos (50 de referencia): unas 3 950 palabras de lectura y unas 85 interacciones. Es una estimación, no una medición.

### B. Otros datos que conviene confirmar (sin marca en el cuerpo)

1. **Función de la esclerostina.** Se presenta como señal principalmente local que inhibe la vía Wnt al unirse a LRP5 y LRP6. Es la descripción estándar, pero también se mide en sangre; confirmar el matiz.
2. **Mecanismo de FGF23.** Se describe la acción en el túbulo proximal (menos reabsorción de fosfato y menos calcitriol). Además actúa sobre la paratiroides; se omitió por simplicidad. Confirmar si se quiere añadir.
3. **Raquitismo hipofosfatémico ligado al X.** Se dice que las mutaciones de PHEX elevan FGF23. Es el mecanismo aceptado, aunque el vínculo molecular exacto entre PHEX y FGF23 sigue en estudio.
4. **Hueso alveolar propio.** Se describe como lámina cribiforme, "hueso fasciculado" (que aloja las fibras de Sharpey) y lámina dura en radiografía. Confirmar si el docente prefiere usar "hueso fasciculado" como sinónimo formal.
5. **Distinción cortical y trabecular en el hueso alveolar.** Se sigue la división en hueso alveolar propio y hueso alveolar de soporte (tablas corticales y trabecular). Algunos textos usan otras clasificaciones.
6. **Ejemplos de la ley de Wolff.** El tenista (mayor grosor cortical y densidad en el brazo dominante) y el astronauta (pérdida en huesos que soportan peso) son ejemplos habituales; conviene confirmar que el docente los reconoce.
7. **Puntajes, tiempos y umbral del logro.** Los `puntaje_max`, los números de preguntas, el reparto de minutos y el umbral del 60 % en la evaluación final son una propuesta de este borrador; deben acordarse con el docente y con el diseño de gamificación. El tiempo de 45 a 60 minutos supone solo las 14 actividades obligatorias; con las 4 opcionales, el módulo se acerca a una hora. Si se quiere acortar, se puede pasar `m1_5_wolff_casos` o `m1_5_proceso_alveolar` a opcional, o dar la sección 1.5 en una segunda sesión.
8. **Decisiones de alcance.** Este módulo incluye una actividad de arrastre sobre hormonas óseas y una sobre la ley de Wolff aplicada a la mandíbula. Confirmar que el nivel de detalle es adecuado para densidad media.
9. **Imágenes y modelo 3D.** La mandíbula provisional es un modelo de BodyParts3D (licencia CC BY-SA 2.1 JP) que debe mostrar su atribución. Confirmar con el docente si dispone de un modelo propio.
10. **Ortodoncia y ley de Wolff.** Se presenta la ortodoncia como remodelado dirigido a través del ligamento periodontal (resorción en el lado comprimido, formación en el lado traccionado), no como aplicación directa de "más carga, más hueso". Confirmar que el docente comparte este enfoque.
11. **Modo identificar en dos ilustraciones.** Las actividades `m1_4_corte_capas` y `m1_5_proceso_alveolar` pasan a modo `identificar`; el endostio se ordena junto a la cortical porque tapiza su cara interna y las trabéculas. Confirmar el orden que prefiere el docente.

## Registro de revision

Revisión científica independiente del 2026-09-24. Cada hallazgo se contrastó antes de decidir. Verificaciones propias: los estudios de 2020 con nuevos ratones sin osteocalcina (Diegel et al. y Moriishi et al., PLoS Genetics) existen y no hallaron fenotipo metabólico; Schropp 2003 describe cerca del 50 % de pérdida de ancho en 12 meses, con unos dos tercios en las primeras 12 semanas; Araújo y Lindhe (2005) describen la reabsorción del hueso fasciculado en la fase inicial; la vitamina D3 se sintetiza en la piel a partir del 7-deshidrocolesterol.

| Hallazgo | Decisión | Razón |
|---|---|---|
| 1. Osteocalcina y lipocalina 2 presentadas como hormonas comprobadas (tabla de 1.2, actividad `m1_2_hormonas_oseas`, `m1_2_relacion_funciones`, `m1_2_q4`, banco n.º 7) | Aceptado en parte | Se confirmó la controversia (estudios de 2020). Se reescribió todo como "hipótesis en estudio", se añadió un aviso que separa FGF23 (establecido), y se corrigieron `d_endocrina`, `m1_2_q4`, retroalimentación, glosario y ganchos. No se dejó solo FGF23 como par: el esquema exige que cada receptor tenga par y la actividad quedaría con un solo par. La decisión de mantener, reducir o quitar las dos moléculas se le pide al docente en la nota A.11 |
| 2. Lipocalina 2 ligada a la secreción de insulina y descripción del receptor de la célula beta | Aceptado | Se quitó "favorece la secreción de insulina" de la lipocalina 2. Cada molécula lleva un dato que la distingue (célula beta frente a hipotálamo) y un `rechazo` propio. El receptor se llama por su ubicación y GPRC6A queda como "se ha propuesto" |
| 3. Ortodoncia contradice la retroalimentación de Wolff | Aceptado | Es cierto: en el lado comprimido se reabsorbe hueso. Se reescribió la retroalimentación de acierto, la viñeta de ortodoncia (estímulo por el ligamento periodontal), el texto de la ley de Wolff, el par `v_ortodoncia`, un ítem del banco y un error frecuente nuevo. Nota A.10 |
| 4. Sesgos de las claves de los quiz | Aceptado | Los V/F pasan a 3 falsos y 2 verdaderos. Las respuestas correctas quedan repartidas (a 5, b 6, c 6, d 5; en la final 3, 3, 3, 2 y 2 V/F). La correcta es la opción más larga en 7 de 22 (antes 11), con diferencias de longitud pequeñas. Se cambiaron los distractores triviales por errores frecuentes de la tabla de ganchos. Se declara `barajar_opciones: true` en las convenciones. Se propone un umbral del 60 % para el logro |
| 4b. Contenido ausente de la evaluación final (Volkmann frente a Havers, hueso frente a tejido óseo, homeostasis del calcio, palanca, nicho) | Aceptado en parte | Se sustituyeron `m1_e_q1` (hueso y tejido óseo), `m1_e_q2` (calcemia y PTH) y `m1_e_q8` (Havers y Volkmann, dificultad 3), con lo que la final sigue en 13 preguntas. Palanca y nicho hematopoyético ya se evalúan en la actividad obligatoria `m1_2_relacion_funciones`, y se añadieron al banco del mentor. `m1_2_quiz_calcio` sigue opcional y el cierre de 1.2 lo dice |
| 5. Duración de 30 minutos poco realista | Aceptado | Se declaran 45 a 60 minutos (50 de referencia), con reparto por sección y recomendación de dos sesiones. No se recortaron actividades: la sección 1.5 sigue siendo densa, y la nota A.7 ofrece al docente pasar `m1_5_wolff_casos` o `m1_5_proceso_alveolar` a opcional. No se dividió 1.5 en dos secciones para mantener la estructura de cinco secciones |
| 6. Ids de hotspots ausentes del catálogo y ids repetidos | Aceptado | Se renombraron `apofisis_alveolar` a `proceso_alveolar` y `conducto_mandibular` a `foramen_mandibular` (existen en `CATALOGO_NODOS.mandibula`). `conducto_mandibular` queda solo como capa del SVG. Los ids de opción y de paso son locales por pregunta y se prefijan al transcribir (convención explícita). El script confirma cero ids duplicados en el resto del módulo |
| 7. Orden de capas del corte (endostio después del trabecular) | Aceptado | Se reordenó: periostio, cortical, endostio, trabecular, médula. Se corrigió la descripción del endostio, la nota de dibujo y la instrucción. Ahora coincide con `m1_e_q10` |
| 8. "Esa carga se repite miles de veces" | Aceptado | Se reescribió: al masticar se usa una fracción de la fuerza máxima, y esas cargas menores se repiten |
| 9. Pérdida de reborde atribuida solo al desuso | Aceptado | Se verificó (Schropp 2003; Araújo y Lindhe 2005). Se describen dos fases en 1.5, `m1_e_q13`, el banco n.º 20 y la nota A.17 |
| 10. "Durante siglos" | Aceptado | Cambiado a "durante décadas" |
| 11. Osteonecrosis y "ciertos fármacos" | Aceptado | Se cambió a traumatismo, radioterapia y corticoides, con una remisión a los antirresortivos (el módulo 6 trata la necrosis de los maxilares) |
| 12. Vitamina D3 y PTH en el riñón | Aceptado | "7-deshidrocolesterol" en el distractor y la retroalimentación; "aumenta su reabsorción en el riñón" en `m1_2_q3`. En `m1_e_q2` la vitamina D activa se forma en el riñón |
| 13. Médula mandibular omitida en 1.2 | Aceptado | Se añadió una frase con [verificar] (nota A.18) y se ajustó la conexión con la mandíbula |
| 14. Cobertura de lo obligatorio y actividades de baja exigencia | Aceptado en parte | `m1_4_corte_capas` y `m1_5_proceso_alveolar` pasan a modo `identificar`, con pistas. Se corrigió el cierre de 1.2. `m1_1_hueso_largo`, `m1_3_entretejido_laminar`, el video y el 3D siguen por visita: son introductorios y coherentes con el puntaje por capas visitadas del plan |
| 15. Estado "visitada" solo por color y zonas táctiles | Aceptado | Se cambió el mensaje ("marca de visitada") y se añadió una especificación de zonas táctiles de 44 px y de marca no cromática para quien dibuja |
| 16. Consistencia con `schema.ts` | Aceptado en parte | Aceptado: instrucciones a 300 caracteres o menos (script), `pista` en los modos `identificar`, `posicion` de receptores, `animacion` e `indicadores` en lugar de capas `efecto_*`, `rechazo` por molécula, nombres técnicos de receptor solo como ayuda. Rechazado: cambiar los nombres de campo (`ordenar_pasos`, `acierto/error`, `dificultad`, `correcta: falso`), porque el guion sigue la estructura común acordada para los seis guiones; se documenta el mapeo en las convenciones para quien transcriba. Se mantienen las marcas [verificar] dentro de los textos porque así lo exige la estructura; la convención obliga a eliminarlas al transcribir |
