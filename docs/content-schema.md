# Guía de contenido: cómo se escribe un módulo

Esta guía es para quien escribe el contenido de un módulo del OVA (agentes o el docente) y para
quien construye los componentes que lo muestran. El contenido **no vive en el código**: cada módulo
es un archivo `content.json`, y la aplicación lo valida y lo dibuja con componentes genéricos.

- Esquema (fuente de verdad de las reglas): `apps/web/src/content/schema.ts`
- Contrato de los componentes de actividad: `apps/web/src/activities/types.ts`
- Módulo de muestra que usa todos los tipos: `apps/web/src/content/__fixtures__/modulo_muestra.json`
- Contrato con la API: [api-contract.md](api-contract.md) · Requisitos del docente: [briefing-pedagogico.md](briefing-pedagogico.md)

> **Todo el contenido que redactamos nosotros es un borrador pendiente de validación del docente.**
> Cada módulo lleva `estado_revision.estado = "borrador"` hasta que el docente lo revise (sección 13).
> No inventes datos, cifras ni referencias: si no estás seguro de algo, escríbelo con cautela o déjalo
> fuera y anótalo en `estado_revision.notas`.

## 1. Flujo de trabajo

1. Crea la carpeta `apps/web/src/modules/m{n}_{slug}/` con el `slug` de `apps/web/src/data/modulos.ts`
   (por ejemplo `m1_conociendo_el_hueso`) y dentro `content.json`.
2. Pon los dibujos en `apps/web/public/images/m{n}/` (SVG, ver sección 8) y, si el docente aporta video,
   en `apps/web/public/videos/m{n}/`.
3. Valida desde la raíz del repositorio:

   ```bash
   pnpm --filter @ova/web exec vitest run src/content/modulos_reales.test.ts
   ```

   La prueba recorre **todos** los módulos que existan y comprueba el esquema, el nombre de la carpeta,
   que cada archivo de `public/` exista y cumpla las reglas, y que los ids de actividad no se repitan
   entre módulos. Cada error sale en una línea con la ruta y el `id` del elemento:

   ```text
   secciones[3]{repaso}.bloques[2]{m1_quiz_repaso}.actividad.config.preguntas[0]{qr_p1}.correctas[0]:
   La opción correcta "qr_p1_z" no existe en "opciones".
   ```

4. Corrige de arriba abajo: los errores de referencias cruzadas (ids repetidos, enlaces al glosario,
   suma de puntos) aparecen cuando la estructura ya es válida.

## 2. Estructura de archivos

```text
apps/web/
├── src/modules/m1_conociendo_el_hueso/content.json   # el contenido del módulo
└── public/
    ├── images/m1/hueso_capas.svg                     # dibujos del módulo 1
    └── videos/m1/introduccion_hueso.mp4              # solo si el docente aporta video
```

- La carpeta es `m{numero}_{slug}`; el `slug` es el de `src/data/modulos.ts` (los seis: `conociendo_el_hueso`,
  `descubriendo_sus_celulas`, `construyendo_hueso`, `transformando_la_matriz`, `renovando_el_hueso`,
  `el_paso_del_tiempo`).
- Los recursos del módulo `n` van **siempre** en una carpeta `m{n}`: `/images/m1/...`, `/videos/m1/...`.
- Nombres de archivo en `snake_case` en español, sin tildes ni espacios: `hueso_capas.svg`.
- Rutas en el JSON: absolutas desde la raíz pública, empezando por `/` (`/images/m1/hueso_capas.svg`).
  Nunca URLs externas: todo se sirve desde el propio origen.

## 3. Identificadores (ids)

Todo elemento con `id` sigue la misma regla: **snake_case en minúsculas, empieza por letra, solo
`a-z`, `0-9` y `_`, máximo 64 caracteres** (`^[a-z][a-z0-9_]{0,63}$`). Sin tildes, mayúsculas, guiones ni
espacios. Es un subconjunto del patrón `^[a-z0-9_-]{1,64}$` que acepta la API para `activity_id`.

**La unicidad tiene dos alcances**, según qué ve el mentor de cada id:

| Alcance | Ids | Regla |
|---|---|---|
| **Módulo** | sección, bloque, actividad, **capa**, **molécula** y **pregunta** | No se repiten en todo el módulo, sea cual sea su tipo. Llegan tal cual al mentor (`estructuraSeleccionada`, `moleculaSeleccionada`, `interaccionesRecientes`) y deben decir a qué se refieren |
| **Actividad** | **nodo 3D**, **opción**, **par**, **receptor**, **elemento de columna** y **paso** | Solo deben ser únicos dentro de su actividad. Dos actividades pueden usar `par_1`, `qr_p1_a` o el nodo `cuerpo` sin problema |

Dentro de una actividad no puede haber dos ids iguales aunque sean de tipos distintos (una opción no
puede llamarse como una pregunta de su quiz). Quedan fuera de todo esto (tienen su propio espacio) los
ids del `glosario` y de las `referencias`, para que el término `osteoblasto` pueda convivir con el nodo 3D
`osteoblasto`. Como los nodos 3D pueden repetirse entre actividades, el índice del mentor
(`indiceEstructuras`) los clasifica por `actividad:id` (`claveEstructura`), y el mentor ya recibe
`actividadActual.id` junto a la estructura.

Convenciones para que el error "id duplicado" no aparezca:

| Elemento | Convención | Ejemplo |
|---|---|---|
| Sección | Tema en pocas palabras (no puede ser `inicio`) | `tejido_dinamico` |
| Bloque de texto, imagen, callout, tabla | Prefijo `t_`, `i_`, `c_`, `tb_` | `t_tejido_vivo`, `c_calcio` |
| Actividad | **Debe empezar por `m{n}_`** (el id del módulo) | `m1_capas_hueso` |
| Capa de un SVG | Prefijo de la figura | `capa_periostio`, `histo_osteocito` |
| Nodo 3D | Nombre del nodo del GLB (catálogo en la sección 9) o, con `ancla`, un id libre | `condilo`, `zona_compresion_canino` |
| Pregunta y opciones | Abreviatura del quiz + pregunta + letra | `qr_p1`, `qr_p1_a` |
| Molécula, receptor, par | Prefijos `mol_`, `rec_`, `par_` | `mol_rankl`, `rec_rank`, `par_rankl_rank` |
| Elementos de columnas | `ea_` (columna A) y `eb_` (columna B) | `ea_osteoblasto`, `eb_forma` |
| Paso | Prefijo `paso_` | `paso_reabsorcion` |

**Por qué el prefijo `m{n}_` en las actividades:** la API calcula el puntaje sumando el mejor resultado
de cada `activity_id` sin mirar el módulo. Si dos módulos usaran `m_quiz_final`, uno pisaría al otro.
El id del módulo es `m{numero}` (`m1` a `m6`).

Un nodo 3D **puede** llamarse igual que una capa de otra actividad (el osteoclasto de la imagen
multicapa y el de la escena 3D): no hace falta prefijarlos, aunque conviene para leer el JSON
(`histo_osteoclasto`).

En cambio las **capas** sí son únicas en el módulo. Para *explorar* y después *identificar* el mismo
dibujo son dos actividades, así que usa dos copias del SVG (`hueso_capas.svg` y
`hueso_capas_identificar.svg`) y prefija las capas de la segunda (`ident_periostio`).

## 4. Texto

Ningún campo admite HTML. Hay tres niveles de texto y el esquema rechaza lo que no corresponde:

| Nivel | Dónde se usa | Qué admite |
|---|---|---|
| **Plano** | Títulos, etiquetas, `alt`, `concepto`, `credito`, nombres | Una línea. Sin Markdown (`**` y enlaces se rechazan) |
| **Línea** | Descripciones, explicaciones, instrucciones, retroalimentación, opciones, pies | Una línea con `**negrita**`, `*cursiva*`, `[término](glosario:id)` y `[texto](https://...)` |
| **Bloque** | `markdown` de los bloques `texto` y `callout` | Lo de línea más párrafos (línea en blanco), listas planas (`- ` o `1. `) y, solo en `texto`, títulos `###` y `####` |

Siempre prohibido: HTML (`<b>`, `<script>`, comentarios), imágenes `![..](..)`, código con comillas
invertidas, tablas dentro del texto (usa el bloque `tabla`), citas `>`, líneas horizontales, listas
anidadas, títulos `#` y `##` (la sección ya es el nivel superior), enlaces `http://` o relativos, y
caracteres de control. Tampoco se acepta texto con la codificación dañada (`Ã³` en lugar de `ó`): guarda
los archivos en UTF-8.

- **La marca `[verificar]` no va en el texto.** Los guiones marcan así las cifras dudosas; al pasar al
  JSON se **quita** de la frase (que queda con la cifra prudente o sin ella) y se anota en
  `estado_revision.pendientes` (sección 13) con el id del bloque o de la actividad. El esquema rechaza
  cualquier `[verificar]` en un texto: el estudiante no debe leerlo.
- **En una línea, un valor con signo es texto normal:** `> 99 % del calcio`, `- 5 %` o `+ 2 mm` se admiten
  (no son citas ni listas). Lo que se rechaza es el marcador de bloque de verdad: `- elemento` como lista,
  `> cita`, y una línea que empieza por `1.` o `2)` (en los pasos de `ordenar` el orden lo da la posición:
  no escribas el número).
- **Profundización para posgrado:** un bloque `texto`, `imagen`, `callout` o `tabla` con
  `"nivel": "posgrado"` solo lo ve quien tiene `nivel: posgrado` en su perfil (`visibleParaNivel`,
  `consultas.ts`). Sin `nivel`, es para todos. No escribas "(profundización para posgrado)" en el texto:
  usa el campo.

### Tabla de límites

Una sola tabla con los límites que más se superan al pasar un guion a JSON (`min` y `max` incluidos).
Si un texto no cabe, no se recorta a ojo: se divide en un bloque `texto` previo o se acorta con el
docente.

| Campo | Límite |
|---|---|
| `instrucciones` de una actividad | 10 a **400** |
| `retroalimentacion.*` | 10 a 400 |
| `capas` de una multicapa · `requeridas` | 2 a **15** · 1 a **15** |
| `pista` y cada `pistas_extra` de una capa | 10 a 200 · hasta **2** extra |
| `moleculas` · `receptores` · `pares` · `distractores` | 2 a 8 · 1 a 6 · 1 a 6 · 0 a 4 (los distractores cuentan dentro de `moleculas`) |
| `efecto.descripcion` | 10 a **450** |
| `explicacion` de una pregunta · `enunciado` | 10 a **600** · 10 a 400 |
| Preguntas por quiz · opciones · pasos de `ordenar` | 1 a 20 · 3 a 6 · 3 a 7 |
| `columnas` de una tabla · filas | 2 a **6** · 1 a 12 |
| Nodos 3D · `requeridos` | 2 a 12 · 1 a 12 |
| Pasos de una animación | 2 a 10 |
| Puntos de un módulo (suma de `puntaje_max`) | 100 a **1000** |
| `estado_revision.pendientes` | hasta 250 (`nota` de 5 a 300) |

- **Enlaces al glosario:** `[matriz](glosario:matriz_osea)`. El `id` debe existir en el `glosario` del
  módulo, o la validación falla. La interfaz los muestra como un término que abre su definición.
- **Química y símbolos:** usa Unicode, no marcado: `Ca²⁺`, `HPO₄²⁻`, `H₂O`, `%`, `→`. Un `<` suelto como
  en `PTH < 20 pg/mL` es válido.
- **Estilo:** español claro, frases cortas, sin jerga innecesaria (el briefing pide "simple y directo").
  Se lee en un teléfono: un párrafo de más de cinco líneas es demasiado largo. Cada término técnico se
  define la primera vez que aparece (glosario).
- **Longitudes:** los límites están en cada tabla de esta guía; el esquema los aplica. Se recortan los
  espacios al inicio y al final antes de contar.
- **Cómo se muestra:** la página y los componentes convierten el Markdown con `renderizarLinea` (una
  línea) y `renderizarBloque` (bloques `texto` y `callout`) de `apps/web/src/content/markdown.ts`, que
  solo produce `p`, `strong`, `em`, `a`, `ul`, `ol`, `li`, `h3`, `h4` y `br`; cualquier otra cosa se
  escapa como texto. Nunca se inyecta el texto crudo. Los enlaces `glosario:` salen como
  `<a href="#glosario-id" data-glosario="id" class="enlace-glosario">` y la interfaz los intercepta
  para abrir la definición.

## 5. Módulo

```jsonc
{
  "id": "m1",                       // "m" + numero
  "numero": 1,                      // 1 a 6
  "slug": "conociendo_el_hueso",    // el de src/data/modulos.ts
  "titulo": "Conociendo el hueso",  // EXACTAMENTE el de src/data/modulos.ts
  "subtitulo": "Generalidades, funciones biomecánicas y metabólicas esenciales",
  "resumen": "…",                   // línea, 30 a 600 caracteres
  "objetivos": ["…", "…"],          // 2 a 8 objetivos de aprendizaje (línea, 10 a 220)
  "duracion_estimada_min": 40,      // entero de 5 a 240
  "glosario": [ … ],                // 3 a 60 términos
  "referencias": [ … ],             // 1 a 30
  "estado_revision": { … },         // sección 13
  "secciones": [ … ]                // 2 a 12
}
```

Reglas del módulo (las aplica `ModuloContenidoSchema`):

- `id` es `m{numero}`; `slug` y `titulo` coinciden con `src/data/modulos.ts` (así el menú y la página
  nunca dicen cosas distintas). Si el docente cambia un título, se cambia allí y en el JSON.
- Al menos **una actividad obligatoria por sección** (si no, la sección se daría por completada sin
  haberse leído y abriría la siguiente), y la suma de `puntaje_max` de **todas** las actividades está
  **entre 100 y 1000 puntos** (sección 11).
- Los recursos de `public/` son de la carpeta `m{numero}` del propio módulo.
- Cada `[..](glosario:id)` apunta a un término que existe.
- Ids únicos según su alcance (sección 3).
- Cada `pendiente` de `estado_revision` apunta a un id que existe (sección 13).

**Glosario** (`glosario[]`): `id`, `termino` (plano, 2 a 60) y `definicion` (línea, 10 a 400).

```json ejemplo:glosario_termino
{
  "id": "osteoblasto",
  "termino": "Osteoblasto",
  "definicion": "Célula que **forma** la matriz ósea nueva y participa en su mineralización."
}
```

**Referencias** (`referencias[]`): `id`, `cita` (plano, 20 a 400), `url` opcional (`https://`) y
`verificada` (por defecto `false`). **No inventes bibliografía:** cita solo obras que existan (libros
de texto de histología, fisiología o anatomía) y déjalas con `verificada: false`; el docente las
confirma. Una referencia dudosa es peor que ninguna.

```json ejemplo:referencia
{
  "id": "ref_junqueira",
  "cita": "Junqueira LC, Carneiro J. Histología básica: texto y atlas. Editorial Médica Panamericana.",
  "verificada": false
}
```

### Sección

Una sección es una unidad de estudio de 5 a 10 minutos: bloques de lectura seguidos de una o dos
actividades. Tiene `id` (no puede ser `inicio`), `titulo` (plano, 3 a 100), `resumen` opcional (línea,
10 a 300) y de 1 a 16 `bloques`. **Pon la actividad obligatoria al final de la sección:** una sección
está completada cuando todas sus actividades obligatorias lo están (sección 11).

```json ejemplo:seccion
{
  "id": "que_es_la_matriz",
  "titulo": "La matriz ósea",
  "resumen": "De qué está hecho el hueso por dentro.",
  "bloques": [
    {
      "id": "t_matriz",
      "tipo": "texto",
      "markdown": "La matriz ósea combina colágeno, que da flexibilidad, con cristales minerales, que dan dureza."
    },
    {
      "tipo": "actividad",
      "actividad": {
        "id": "m1_quiz_matriz",
        "tipo": "quiz",
        "titulo": "Comprueba lo aprendido",
        "instrucciones": "Responde la pregunta y lee la explicación.",
        "puntaje_max": 10,
        "retroalimentacion": {
          "correcta": "¡Bien! Ya distingues los componentes de la matriz.",
          "incorrecta": "Repasa la sección: el mineral aporta la dureza."
        },
        "concepto": "Composición de la matriz ósea",
        "config": {
          "preguntas": [
            {
              "id": "qm_p1",
              "formato": "verdadero_falso",
              "enunciado": "El mineral de la matriz es el que aporta la dureza al hueso.",
              "correcta": true,
              "explicacion": "Los cristales de calcio y fósforo dan dureza; el colágeno da flexibilidad."
            }
          ]
        }
      }
    }
  ]
}
```

## 6. Bloques

Un bloque tiene `tipo`: `texto`, `imagen`, `callout`, `tabla` o `actividad`. Salvo el de actividad, todos
llevan `id` propio.

### `texto`

`id`, `tipo: "texto"`, `titulo` opcional (plano, 3 a 80; se muestra como subtítulo), `markdown` (bloque, 20 a
2500 caracteres; menos de 900 si puedes: se lee en un teléfono) y `nivel` opcional (`"posgrado"`: solo lo ve
quien es de posgrado; también existe en `imagen`, `callout` y `tabla`).

```json ejemplo:bloque_texto
{
  "id": "t_que_es_la_matriz",
  "tipo": "texto",
  "titulo": "La matriz ósea",
  "markdown": "La [matriz ósea](glosario:matriz_osea) tiene dos componentes:\n\n- Una parte **orgánica**, sobre todo colágeno tipo I.\n- Una parte **mineral**, cristales de hidroxiapatita de calcio y fósforo.\n\nJuntas dan al hueso dureza y cierta elasticidad."
}
```

### `imagen`

`id`, `tipo: "imagen"`, `src` (ruta pública, sección 2; svg, webp, png, jpg o avif), **`alt` obligatorio**
(plano, 10 a 250), **`pie`** (línea, 5 a 250), `credito` opcional (autoría y licencia si no es propia),
`ancho` y `alto` opcionales (juntos; evitan saltos al cargar) y `nivel` opcional.

El `alt` describe **lo que la imagen enseña**, no que "es una imagen": "Corte de un hueso largo con el
periostio, el hueso compacto y la médula" y no "Imagen de un hueso". Una imagen que solo decora no
tiene lugar en el OVA. Si el docente entrega una foto o un esquema propio, se sustituye el archivo
manteniendo la ruta.

```json ejemplo:bloque_imagen
{
  "id": "i_osteona",
  "tipo": "imagen",
  "src": "/images/m1/osteona.webp",
  "alt": "Corte transversal de una osteona: un conducto central rodeado de láminas concéntricas de hueso.",
  "pie": "Una osteona: la unidad estructural del hueso compacto.",
  "credito": "Esquema propio del equipo del OVA.",
  "ancho": 1200,
  "alto": 800
}
```

### `callout`

Un recuadro que destaca una idea. `variante`: **`clinico`** (caso o relevancia clínica, sobre todo de la
mandíbula), **`dato`** (dato clave o cifra), **`atencion`** (error frecuente o precaución) o
**`recuerda`** (idea para retener). `titulo` opcional (plano, 3 a 60; si falta, la interfaz usa "Caso
clínico", "Dato clave", "Atención" o "Recuerda"), `markdown` (bloque **sin títulos**, 10 a 900) y `nivel`
opcional. Un dato con detalle molecular para posgrado es un `callout` `dato` con `"nivel": "posgrado"`.

```json ejemplo:bloque_callout
{
  "id": "c_perdida_dental",
  "tipo": "callout",
  "variante": "clinico",
  "titulo": "Un caso en la mandíbula",
  "markdown": "Cuando se pierde un diente, el hueso alveolar deja de recibir la carga de la masticación y con el tiempo se **reabsorbe**."
}
```

```json ejemplo:bloque_callout_posgrado
{
  "id": "c_rankl_opg_detalle",
  "tipo": "callout",
  "variante": "dato",
  "nivel": "posgrado",
  "titulo": "Para profundizar",
  "markdown": "La relación entre [RANKL](glosario:rankl) y su señuelo la OPG decide el balance entre formación y reabsorción."
}
```

### `tabla`

Una tabla **comparativa**: cada columna es un elemento que se compara y cada fila un criterio. `id`,
`titulo` (plano, 3 a 100; es el nombre accesible), `encabezado_criterio` opcional (plano, 1 a 40: el rótulo
de la primera columna, por ejemplo "Fase"), `columnas` (**2 a 6**, plano, 1 a 40) y `filas` (1 a 12) con
`criterio` (plano, 2 a 60) y `celdas` (línea, 1 a 200), **una celda por columna**. En un teléfono el
componente la muestra como tarjetas apiladas (una por columna), así que 6 columnas no obligan a desplazarse.
Una **secuencia temporal** (las fases del remodelado, la reparación de una fractura) se escribe como
tabla con las fases como filas, o como una pregunta `ordenar` (sección 7.4); no hay un bloque de línea de tiempo.

```json ejemplo:bloque_tabla
{
  "id": "tb_osteoblasto_osteoclasto",
  "tipo": "tabla",
  "titulo": "Osteoblasto frente a osteoclasto",
  "encabezado_criterio": "Aspecto",
  "columnas": ["Osteoblasto", "Osteoclasto"],
  "filas": [
    { "criterio": "Función", "celdas": ["Forma matriz ósea", "Reabsorbe hueso"] },
    { "criterio": "Origen", "celdas": ["Célula madre mesenquimal", "Precursor de la médula ósea"] },
    { "criterio": "Aspecto", "celdas": ["Célula cúbica con un núcleo", "Célula grande con varios núcleos"] }
  ]
}
```

### `actividad`

Envuelve una actividad. **No lleva `id` propio: su id es el de la actividad** (`actividad.id`).

```json ejemplo:bloque_actividad
{
  "tipo": "actividad",
  "actividad": {
    "id": "m1_quiz_rapido",
    "tipo": "quiz",
    "titulo": "Pregunta rápida",
    "instrucciones": "Elige la respuesta correcta.",
    "puntaje_max": 10,
    "retroalimentacion": {
      "correcta": "¡Correcto! El osteoblasto es la célula que forma hueso.",
      "incorrecta": "Repasa las células del hueso antes de reintentar."
    },
    "concepto": "Función del osteoblasto",
    "config": {
      "preguntas": [
        {
          "id": "qr2_p1",
          "formato": "opcion_multiple",
          "enunciado": "¿Qué célula forma la matriz ósea nueva?",
          "opciones": [
            { "id": "qr2_p1_a", "texto": "Osteoclasto" },
            { "id": "qr2_p1_b", "texto": "Osteoblasto" },
            { "id": "qr2_p1_c", "texto": "Osteocito" }
          ],
          "correctas": ["qr2_p1_b"],
          "explicacion": "El osteoblasto sintetiza la matriz; el osteoclasto la reabsorbe."
        }
      ]
    }
  }
}
```

## 7. Actividades

El motor tiene **seis tipos**, exactamente los del contrato con la API y con el contexto pedagógico
(`ContextoPedagogico.actividadActual.tipo`): `multicapa`, `arrastre-molecular`, `relacion-columnas`,
`quiz`, `video-texto` y `exploracion-3d`. No se inventan tipos nuevos.

### Campos comunes

| Campo | Regla |
|---|---|
| `id` | Empieza por `m{n}_` (sección 3) |
| `tipo` | Uno de los seis |
| `titulo` | Plano, 3 a 100 |
| `instrucciones` | Línea, 10 a 400 (menos de 200 si puedes: se lee en el teléfono). Dice qué hacer y cuándo se termina. Si necesita más, el contexto va en un bloque `texto` anterior |
| `obligatoria` | `true` por defecto. Si es `true`, hay que completarla para avanzar |
| `aprobacion_min` | Opcional, de 0,5 a 1: **precisión mínima** (no puntaje) de la mejor ejecución para dar por superada una actividad obligatoria; `0.7` = 70 % de acierto. Solo en actividades que pueden fallar (quiz, arrastre, relación y multicapa en `identificar`). Terminar una ejecución la completa aunque no llegue; cuenta para la sección y el módulo cuando llega (sección 11) |
| `puntaje_max` | Entero de 1 a 1000 (tope de la API). Guía de valores en la sección 11 |
| `penalizacion` | `{ "por_intento": 0.1, "piso": 0.4 }` por defecto. `por_intento` de 0 a 0,5; `piso` de 0 a 1 |
| `retroalimentacion` | `correcta` (siempre), `parcial` e `incorrecta` (línea, 10 a 400). `incorrecta` es obligatoria si la actividad puede resolverse con errores: quiz, arrastre, relación y multicapa en modo `identificar` |
| `concepto` | Plano, 3 a 120. Qué concepto refuerza; el mentor lo usa para saber qué repasar si el estudiante falla |
| `config` | La configuración propia del tipo |

Cada actividad debe poder completarse **sin ayuda del mentor** y **sin saber más de lo que ya enseñó
el módulo**. Las instrucciones nunca dan la respuesta.

### 7.1 `multicapa`: imagen SVG con capas

El estudiante toca (o pasa el cursor sobre) las estructuras de un dibujo y lee qué son. Dos modos:

- **`explorar`**: al tocar una capa aparece su ficha. Se completa al ver todas las `requeridas`.
- **`identificar`**: la app pide "encuentra la estructura que…" con la `pista` de cada capa requerida y el
  estudiante la toca. Los toques equivocados bajan la precisión.

| Campo de `config` | Regla |
|---|---|
| `svg` | Ruta `/images/m{n}/nombre.svg` (sección 8) |
| `viewBox` | `"0 0 ancho alto"`, enteros positivos; **igual al del archivo** |
| `alt` | Plano, 10 a 300: descripción de la imagen completa |
| `modo` | `explorar` o `identificar` |
| `capas[]` | 2 a **15**. `id` (= el `<g id>` del SVG), `etiqueta` (plano, 2 a 60), `descripcion` (línea, 10 a 500), `pista` (línea, 10 a 200) y `pistas_extra` (hasta 2 consignas más sobre la misma capa) |
| `requeridas` | 1 a 15 ids de capas, sin repetir, todos existentes en `capas` |

En modo `identificar`, **cada capa requerida necesita `pista`** (describe la estructura sin nombrarla:
"La célula gigante con varios núcleos que disuelve el hueso"). Si el guion hace varias preguntas sobre la
misma capa, las adicionales van en `pistas_extra` (hasta 2): cada consigna es un toque más y cuenta para la
precisión. Con más de tres consignas por capa, mejor otra actividad.

```json ejemplo:actividad_multicapa_explorar
{
  "id": "m1_capas_hueso",
  "tipo": "multicapa",
  "titulo": "Explora las capas del hueso",
  "instrucciones": "Toca cada capa del dibujo para leer qué es y qué hace. Debes ver al menos tres.",
  "puntaje_max": 30,
  "penalizacion": { "por_intento": 0.1, "piso": 0.5 },
  "retroalimentacion": {
    "correcta": "¡Muy bien! Ya conoces cómo se ordenan las capas del hueso, de afuera hacia adentro."
  },
  "concepto": "Estructura en capas del hueso largo",
  "config": {
    "svg": "/images/m1/hueso_capas.svg",
    "viewBox": "0 0 800 600",
    "alt": "Corte de un hueso largo con cuatro capas concéntricas: periostio, hueso compacto, hueso esponjoso y médula ósea.",
    "modo": "explorar",
    "capas": [
      {
        "id": "capa_periostio",
        "etiqueta": "Periostio",
        "descripcion": "Membrana externa muy vascularizada e inervada; aporta células que forman hueso nuevo."
      },
      {
        "id": "capa_hueso_compacto",
        "etiqueta": "Hueso compacto",
        "descripcion": "Capa densa organizada en osteonas; da resistencia frente a la flexión y la compresión."
      },
      {
        "id": "capa_medula_osea",
        "etiqueta": "Médula ósea",
        "descripcion": "Tejido blando del interior; en ella se producen las células de la sangre."
      }
    ],
    "requeridas": ["capa_periostio", "capa_hueso_compacto", "capa_medula_osea"]
  }
}
```

```json ejemplo:actividad_multicapa_identificar
{
  "id": "m1_identifica_celulas",
  "tipo": "multicapa",
  "titulo": "Identifica las células en el corte",
  "instrucciones": "Lee la pista y toca la célula que corresponde en el dibujo.",
  "puntaje_max": 30,
  "retroalimentacion": {
    "correcta": "¡Ojo clínico! Reconoces cada célula en el corte.",
    "parcial": "Bien, pero confundiste alguna célula; fíjate en su tamaño y su ubicación.",
    "incorrecta": "Repasa cómo se ve cada célula ósea y vuelve a intentarlo."
  },
  "concepto": "Reconocimiento de células óseas en histología",
  "config": {
    "svg": "/images/m1/celulas_histologia.svg",
    "viewBox": "0 0 800 500",
    "alt": "Corte esquemático de hueso con tres células: una cúbica sobre la superficie, una estrellada dentro de la matriz y una muy grande con varios núcleos.",
    "modo": "identificar",
    "capas": [
      {
        "id": "histo_osteoblasto",
        "etiqueta": "Osteoblasto",
        "descripcion": "Célula cúbica sobre la superficie ósea que fabrica matriz nueva.",
        "pista": "La célula cúbica alineada sobre la superficie del hueso que forma matriz."
      },
      {
        "id": "histo_osteocito",
        "etiqueta": "Osteocito",
        "descripcion": "Célula atrapada en la matriz, con prolongaciones que la conectan con otras.",
        "pista": "La célula estrellada que quedó atrapada dentro de la matriz mineralizada."
      },
      {
        "id": "histo_osteoclasto",
        "etiqueta": "Osteoclasto",
        "descripcion": "Célula gigante con varios núcleos que reabsorbe hueso.",
        "pista": "La célula gigante con varios núcleos que disuelve el hueso."
      }
    ],
    "requeridas": ["histo_osteoblasto", "histo_osteocito", "histo_osteoclasto"]
  }
}
```

**Precisión:** `explorar` siempre 1. `identificar`: aciertos ÷ (aciertos + toques equivocados). Un toque
equivocado es un toque sobre una capa de `capas` que no es la pedida ni ya se acertó; tocar fuera de toda
capa o repetir una acertada no cuenta (ver "Casos límite" en `activities/types.ts`).

### 7.2 `arrastre-molecular`: llevar moléculas a sus receptores

El estudiante arrastra cada molécula hasta el receptor al que se une y **ve el efecto biológico** al
acoplarla. En un teléfono se arrastra con el dedo; con teclado o lector de pantalla se elige la molécula
y el receptor de una lista.

| Campo de `config` | Regla |
|---|---|
| `escena` | `viewBox` (como en multicapa), `alt` (plano, 10 a 300: describe la escena) y `fondo_svg` opcional (un SVG de fondo, como la membrana de una célula) |
| `moleculas[]` | 2 a 8 (**los distractores cuentan dentro de esta lista**). `id`, `etiqueta` (plano, 1 a 40), `descripcion` (línea, 10 a 300), `forma` (`circulo`, `hexagono`, `triangulo`, `rombo` o `cuadrado`; por defecto `circulo`), `rechazo` (línea, 10 a 300: por qué no encaja donde la soltó; **obligatorio en los distractores**) |
| `receptores[]` | 1 a 6. `id`, `etiqueta`, `descripcion` y `posicion: { x, y }` (porcentaje del ancho y del alto de la escena, de 5 a 95, y además dentro de los márgenes en píxeles de abajo) |
| `pares[]` | 1 a 6. `id`, `molecula`, `receptor` y `efecto` |
| `efecto` | `titulo` (plano, 3 a 80), `descripcion` (línea, 10 a **450**), `animacion` y `indicadores` opcionales (hasta 3 medidores `{ etiqueta, direccion }`, con `direccion` `aumenta`, `disminuye` o `sin_cambio`) |
| `distractores` | Hasta 4 ids de moléculas que **no encajan en ningún receptor** |

Reglas:

- Cada molécula está en **un solo par** o es distractor (no puede quedar suelta).
- Cada receptor tiene **al menos un par**, y **puede aceptar varias moléculas**: así se escribe una
  competencia (Wnt, que activa `LRP5/6`, y la esclerostina, que lo bloquea, son dos pares del mismo
  receptor con `animacion` `activacion` e `inhibicion`). El receptor muestra el efecto de la **última**
  molécula acoplada, cada par cuenta como acierto una sola vez y el **orden de las sueltas no cambia el
  resultado**. La actividad se completa cuando cada par se acopló al menos una vez.
- **La geometría se comprueba en píxeles de un teléfono de 320 px de ancho.** La escena se muestra a ancho
  completo y su alto sale del `viewBox` (`320 × alto ÷ ancho`), así que 18 puntos en vertical no son lo
  mismo que 18 en horizontal. Dos receptores deben quedar a **52 px o más** entre sí (44 px de zona táctil
  más 8 px de aire) y a **22 px o más** de cada borde. Con `viewBox` `0 0 800 600` (escena de 320 × 240 px)
  eso deja `x` de 7 a 93 e `y` de 10 a 90 y una separación de 17 puntos en horizontal (o 22 en vertical). El
  mensaje de error dice a cuántos píxeles quedan y qué rango vale para ese `viewBox`.
- Si un caso biológico necesita que una molécula se una a dos receptores, divídelo en dos actividades.

**Animaciones del efecto** (`efecto.animacion`, vocabulario cerrado; la biología va en el texto):

| Valor | Qué se ve |
|---|---|
| `activacion` | Pulso y anillos de señal en el receptor |
| `inhibicion` | El receptor se atenúa y aparece un bloqueo |
| `cascada` | La señal avanza del receptor hacia el interior de la célula |
| `union` | Encaje neutro con un leve rebote |
| `crecimiento` | La estructura crece o se multiplica |
| `transformacion` | Cambio de color y de forma (diferenciación) |
| `liberacion` | Partículas que salen de la célula (secreción) |
| `mineralizacion` | Aparecen cristales pequeños (depósito mineral) |
| `reabsorcion` | La estructura se encoge o se disuelve |

Con `prefers-reduced-motion` la animación se reemplaza por un cambio inmediato, y el `titulo` y la
`descripcion` del efecto siempre se muestran: nada depende de la animación.

```json ejemplo:actividad_arrastre_molecular
{
  "id": "m1_senales_remodelado",
  "tipo": "arrastre-molecular",
  "titulo": "Lleva cada molécula a su receptor",
  "instrucciones": "Arrastra cada molécula hasta el receptor al que se une y observa qué efecto produce. Una no encaja.",
  "puntaje_max": 50,
  "penalizacion": { "por_intento": 0.15 },
  "retroalimentacion": {
    "correcta": "¡Muy bien! Entiendes cómo se activan las células que remodelan el hueso.",
    "parcial": "Casi. Repasa qué molécula activa a cada célula.",
    "incorrecta": "Repasa la sección de señales: RANKL activa a RANK y la PTH actúa sobre el osteoblasto."
  },
  "concepto": "Señalización RANK-RANKL-OPG y PTH",
  "config": {
    "escena": {
      "viewBox": "0 0 800 600",
      "fondo_svg": "/images/m1/membrana_celular.svg",
      "alt": "Membrana de una célula con dos receptores: RANK a la izquierda y PTH1R a la derecha."
    },
    "moleculas": [
      {
        "id": "mol_rankl",
        "etiqueta": "RANKL",
        "descripcion": "Señal que produce el osteoblasto para activar a los precursores del osteoclasto.",
        "forma": "hexagono"
      },
      {
        "id": "mol_pth",
        "etiqueta": "PTH",
        "descripcion": "Hormona paratiroidea: sube el calcio de la sangre actuando sobre el hueso.",
        "forma": "rombo"
      },
      {
        "id": "mol_opg",
        "etiqueta": "OPG",
        "descripcion": "Osteoprotegerina: un señuelo que captura al RANKL.",
        "forma": "triangulo",
        "rechazo": "La OPG no se une a esa membrana: captura al RANKL antes de que llegue a su receptor."
      }
    ],
    "receptores": [
      {
        "id": "rec_rank",
        "etiqueta": "RANK",
        "descripcion": "Receptor del preosteoclasto que reconoce al RANKL.",
        "posicion": { "x": 25, "y": 55 }
      },
      {
        "id": "rec_pth1r",
        "etiqueta": "PTH1R",
        "descripcion": "Receptor del osteoblasto para la hormona paratiroidea.",
        "posicion": { "x": 70, "y": 55 }
      }
    ],
    "pares": [
      {
        "id": "par_rankl_rank",
        "molecula": "mol_rankl",
        "receptor": "rec_rank",
        "efecto": {
          "titulo": "El preosteoclasto madura",
          "descripcion": "Al unirse RANKL a RANK, el precursor se diferencia en un osteoclasto activo.",
          "animacion": "transformacion",
          "indicadores": [{ "etiqueta": "Formación de osteoclastos", "direccion": "aumenta" }]
        }
      },
      {
        "id": "par_pth_pth1r",
        "molecula": "mol_pth",
        "receptor": "rec_pth1r",
        "efecto": {
          "titulo": "El osteoblasto libera RANKL",
          "descripcion": "La PTH estimula al osteoblasto a producir más RANKL, lo que favorece la reabsorción.",
          "animacion": "liberacion",
          "indicadores": [{ "etiqueta": "Señal de RANKL", "direccion": "aumenta" }]
        }
      }
    ],
    "distractores": ["mol_opg"]
  }
}
```

**Precisión:** acoples correctos ÷ (acoples correctos + acoples equivocados). El receptor se elige por
**cercanía dentro de un radio de captura de 56 px**, no por intersección exacta. **Soltar fuera de todo
receptor no es un error** (la molécula vuelve a la bandeja, para no castigar la imprecisión del dedo), como
tampoco lo es soltarla sobre un receptor donde ya está acoplada. Solo es error acoplar una molécula a un
receptor que no es el suyo, o un distractor a cualquiera (y entonces se muestra su `rechazo`).

### 7.3 `relacion-columnas`: asociar dos listas

El estudiante une cada elemento de la columna A con su pareja de la B (toca uno y luego el otro; también
se puede arrastrar). Al acertar ve la `explicacion` del par.

| Campo de `config` | Regla |
|---|---|
| `columna_a` | `titulo` (plano, 2 a 40) y `elementos` (3 a 8): `id` y `texto` (línea, 2 a 140) |
| `columna_b` | Igual, con 3 a 11 elementos: puede traer **hasta 3 más que la A**, que son distractores sin pareja |
| `pares[]` | 3 a 8. `id`, `a`, `b` y `explicacion` (línea, 10 a 300, obligatoria) |
| `barajar` | `true` por defecto: el orden se mezcla en cada intento |

Todo elemento de A tiene **exactamente un** par; un elemento de B no se usa en dos pares.

```json ejemplo:actividad_relacion_columnas
{
  "id": "m1_celulas_funciones",
  "tipo": "relacion-columnas",
  "titulo": "Une cada célula con su función",
  "instrucciones": "Toca una célula y luego la función que le corresponde. Sobra una función.",
  "puntaje_max": 30,
  "retroalimentacion": {
    "correcta": "¡Excelente! Distingues bien el trabajo de cada célula ósea.",
    "parcial": "Vas bien, pero repasa qué célula forma hueso y cuál lo reabsorbe.",
    "incorrecta": "Vuelve a la sección anterior y repasa las células del hueso antes de reintentar."
  },
  "concepto": "Células óseas y su función",
  "config": {
    "columna_a": {
      "titulo": "Célula",
      "elementos": [
        { "id": "ea_osteoblasto", "texto": "Osteoblasto" },
        { "id": "ea_osteoclasto", "texto": "Osteoclasto" },
        { "id": "ea_osteocito", "texto": "Osteocito" }
      ]
    },
    "columna_b": {
      "titulo": "Función",
      "elementos": [
        { "id": "eb_forma", "texto": "Forma matriz ósea nueva" },
        { "id": "eb_reabsorbe", "texto": "Reabsorbe el hueso" },
        { "id": "eb_detecta", "texto": "Detecta las cargas mecánicas y coordina la respuesta" },
        { "id": "eb_globulos", "texto": "Produce glóbulos rojos" }
      ]
    },
    "pares": [
      { "id": "par_osteoblasto", "a": "ea_osteoblasto", "b": "eb_forma", "explicacion": "Los [osteoblastos](glosario:osteoblasto) fabrican el osteoide y lo mineralizan." },
      { "id": "par_osteoclasto", "a": "ea_osteoclasto", "b": "eb_reabsorbe", "explicacion": "El osteoclasto disuelve el mineral y digiere la matriz." },
      { "id": "par_osteocito", "a": "ea_osteocito", "b": "eb_detecta", "explicacion": "Los osteocitos, atrapados en la matriz, son los sensores de la carga mecánica." }
    ],
    "barajar": true
  }
}
```

**Precisión:** parejas acertadas ÷ (parejas acertadas + intentos equivocados).

### 7.4 `quiz`: preguntas con retroalimentación inmediata

De 1 a 20 preguntas. Tras cada respuesta el estudiante ve la `explicacion` (briefing: "explicación
breve tras cada respuesta"). Formatos (`formato`):

| Formato | Campos | Cómo se evalúa |
|---|---|---|
| `opcion_multiple` | `opciones` (3 a 6; `id`, `texto` línea 1 a 200, `explicacion` opcional), `correctas` (1 a 5 ids). **Al menos una opción debe ser incorrecta y, con varias correctas, tantas incorrectas como correctas** (2 correctas exigen 2 incorrectas): así marcar todo no da puntos | Con una sola correcta, botones de radio; con varias, casillas ("marca todas las correctas"). Precisión `max(0, (correctas marcadas − incorrectas marcadas) ÷ total de correctas)` |
| `verdadero_falso` | `correcta` (`true` o `false`) | 1 si acierta, 0 si no |
| `ordenar` | `pasos` (3 a 7; `id` y `texto`), **en el orden correcto** | La app los baraja; precisión = pasos en su posición ÷ total |

Todas llevan `id`, `enunciado` (línea, 10 a 400), `explicacion` (línea, 10 a **600**, obligatoria),
`concepto` opcional (plano, si evalúan algo distinto del de la actividad) y `dificultad` opcional (1 básica,
2 intermedia, 3 avanzada; el mentor la usa para graduar la ayuda y el docente para leer las estadísticas).
Opciones: evita "todas las anteriores" y las negaciones dobles; que los distractores sean errores plausibles.
Un verdadero o falso acierta el 50 % al azar: en una evaluación final, mézclalo con opción múltiple y ordenar.

**Ramas y linajes.** El formato `ordenar` es lineal. Un linaje con ramas (el osteoblasto llega a osteocito o a
célula de revestimiento) se escribe como dos preguntas `ordenar` (una por rama) o como una relación de columnas.

Otras opciones de `config`: `barajar_preguntas` (`false` por defecto), `barajar_opciones` (`true`) y
**`preguntas_ia`**: `{ "cantidad": 1 a 5 }` pide al mentor generar preguntas de refuerzo al terminar (F4-03).
Esas preguntas **no puntúan**: son práctica, porque el servidor no puede validar lo que no escribió el
docente. El `concepto` de la actividad es el tema de la generación.

```json ejemplo:actividad_quiz
{
  "id": "m1_quiz_repaso",
  "tipo": "quiz",
  "titulo": "Quiz de repaso",
  "instrucciones": "Responde las cuatro preguntas. Verás la explicación después de cada una.",
  "puntaje_max": 40,
  "retroalimentacion": {
    "correcta": "¡Excelente repaso! Dominas las ideas centrales del módulo.",
    "parcial": "Vas bien; revisa las explicaciones de las preguntas que fallaste.",
    "incorrecta": "Te recomiendo repasar las secciones del módulo y volver a intentarlo."
  },
  "concepto": "Repaso general del módulo 1",
  "config": {
    "preguntas": [
      {
        "id": "qr_p1",
        "formato": "opcion_multiple",
        "enunciado": "¿Qué célula forma la matriz ósea nueva?",
        "opciones": [
          { "id": "qr_p1_a", "texto": "Osteoclasto" },
          { "id": "qr_p1_b", "texto": "Osteoblasto" },
          { "id": "qr_p1_c", "texto": "Osteocito", "explicacion": "El osteocito mantiene la matriz, pero ya no la forma." }
        ],
        "correctas": ["qr_p1_b"],
        "explicacion": "El osteoblasto sintetiza el osteoide; el osteoclasto, en cambio, reabsorbe hueso."
      },
      {
        "id": "qr_p2",
        "formato": "opcion_multiple",
        "enunciado": "¿Cuáles de estas son funciones del hueso? Marca todas las correctas.",
        "opciones": [
          { "id": "qr_p2_a", "texto": "Sostén y protección mecánica" },
          { "id": "qr_p2_b", "texto": "Reservorio de calcio y fósforo" },
          { "id": "qr_p2_c", "texto": "Producir bilis" },
          { "id": "qr_p2_d", "texto": "Fabricar insulina" }
        ],
        "correctas": ["qr_p2_a", "qr_p2_b"],
        "dificultad": 2,
        "explicacion": "El hueso sostiene, protege y guarda minerales; la bilis la produce el hígado y la insulina, el páncreas."
      },
      {
        "id": "qr_p3",
        "formato": "verdadero_falso",
        "enunciado": "Después del crecimiento, el hueso deja de renovarse.",
        "correcta": false,
        "explicacion": "Falso: el hueso se remodela toda la vida, reabsorbiendo y formando matriz de manera continua."
      },
      {
        "id": "qr_p4",
        "formato": "ordenar",
        "enunciado": "Ordena las fases del remodelado óseo, de la primera a la última.",
        "pasos": [
          { "id": "qr_p4_1", "texto": "Activación" },
          { "id": "qr_p4_2", "texto": "Reabsorción" },
          { "id": "qr_p4_3", "texto": "Inversión" },
          { "id": "qr_p4_4", "texto": "Formación" }
        ],
        "explicacion": "Primero se activa la superficie, el osteoclasto reabsorbe, hay una fase de inversión y por último los osteoblastos forman hueso nuevo."
      }
    ],
    "barajar_preguntas": false,
    "barajar_opciones": true,
    "preguntas_ia": { "cantidad": 3 }
  }
}
```

**Precisión:** promedio de la precisión de las preguntas (una sin responder cuenta 0).

### 7.5 `video-texto`: explicación animada o video real

Contenido mixto: una explicación **paso a paso** junto a un texto, o un video real si el docente lo
aporta. `config.medio` decide:

**`animacion`** (por defecto mientras no haya video): un SVG cuyos grupos se muestran, se ocultan o se
resaltan según el paso. El estudiante avanza con "Siguiente" (sin autoplay) y la actividad se completa
al llegar al último paso.

| Campo | Regla |
|---|---|
| `svg`, `viewBox`, `alt` | Como en multicapa |
| `pasos[]` | 2 a 10. `id`, `titulo` (plano, 3 a 80), `texto` (línea, 10 a 500), `visibles` (1 a 30 ids de `<g>` del SVG **que se muestran; los demás se ocultan**) y `resaltadas` (hasta 10, subconjunto de `visibles`) |

Los ids de `visibles` y `resaltadas` no se declaran en el JSON: **deben existir en el SVG como `<g id>` HIJOS
DIRECTOS de la raíz `<svg>`** (la auditoría de recursos lo comprueba). Un grupo anidado dentro de otro no se
puede controlar por separado, y una forma suelta en la raíz (un `<rect>` fuera de todo `<g>`) no se puede
ocultar: en un SVG de animación **todo el dibujo va dentro de grupos de primer nivel** (`<defs>`, `<title>` y
`<desc>` sí pueden estar en la raíz). Cada paso muestra únicamente los grupos de su `visibles`; los
`resaltadas` se marcan con un contorno más grueso, no solo con color. Incluye en `visibles` el grupo de fondo
en todos los pasos que lo necesiten. Inkscape envuelve todo en una capa (`layer1`): saca los grupos que
quieras controlar de esa capa, o exporta cada uno como grupo de primer nivel.

```json ejemplo:actividad_video_texto_animacion
{
  "id": "m1_animacion_remodelado",
  "tipo": "video-texto",
  "titulo": "El remodelado en cuatro pasos",
  "instrucciones": "Avanza paso a paso para ver cómo el hueso se renueva sin perder su forma.",
  "puntaje_max": 20,
  "retroalimentacion": {
    "correcta": "Completaste el recorrido: ya sabes cómo se renueva el hueso."
  },
  "concepto": "Ciclo de remodelado óseo",
  "config": {
    "medio": "animacion",
    "svg": "/images/m1/remodelado_pasos.svg",
    "viewBox": "0 0 800 400",
    "alt": "Esquema de una superficie ósea donde un osteoclasto excava una cavidad y luego los osteoblastos la rellenan con matriz nueva.",
    "pasos": [
      {
        "id": "paso_superficie",
        "titulo": "Superficie en reposo",
        "texto": "El hueso está cubierto por células de revestimiento y no se está renovando en este punto.",
        "visibles": ["fondo_hueso"]
      },
      {
        "id": "paso_reabsorcion",
        "titulo": "Reabsorción",
        "texto": "Un osteoclasto se adhiere al hueso y excava una pequeña cavidad.",
        "visibles": ["fondo_hueso", "osteoclasto_activo", "cavidad_reabsorcion"],
        "resaltadas": ["osteoclasto_activo"]
      },
      {
        "id": "paso_formacion",
        "titulo": "Formación",
        "texto": "Los osteoblastos rellenan la cavidad con matriz nueva que después se mineraliza.",
        "visibles": ["fondo_hueso", "osteoblasto_activo", "matriz_nueva"],
        "resaltadas": ["matriz_nueva"]
      }
    ]
  }
}
```

**`video`** (solo si el docente lo entrega): `src` (`/videos/m{n}/x.mp4` o `.webm`), `poster` opcional,
`duracion_seg` (5 a 1800), **`subtitulos`** (1 a 3 pistas `.vtt`; `idioma` `es` o `en`, `etiqueta`, `src`),
**`transcripcion`** (bloque, 50 a 6000) y `hitos` opcionales (capítulos `{ t_seg, titulo }` en orden
cronológico y dentro de la duración). Sin subtítulos y transcripción no se acepta: es un requisito de
accesibilidad. La actividad se completa al ver el 90 % del video, medido como **tiempo realmente
reproducido** (la suma de los tramos de `video.played` entre la duración real del elemento): saltar con la
barra no suma. Quien lee la transcripción en lugar de ver el video (sin datos móviles, por accesibilidad) la
completa con el botón "Ya leí la transcripción", y el `detalle` lo registra (`via: "transcripcion"`).
El video se carga con `preload="none"`, sin autoplay y con subtítulos en español por defecto.

```json ejemplo:actividad_video_texto_video
{
  "id": "m1_video_docente",
  "tipo": "video-texto",
  "titulo": "Video del docente: introducción al hueso",
  "instrucciones": "Mira el video con subtítulos o lee la transcripción.",
  "obligatoria": false,
  "puntaje_max": 10,
  "retroalimentacion": {
    "correcta": "Gracias por ver el video. Aquí se resumen las ideas del módulo."
  },
  "concepto": "Introducción general al tejido óseo",
  "config": {
    "medio": "video",
    "src": "/videos/m1/introduccion_hueso.mp4",
    "poster": "/images/m1/hueso_capas.svg",
    "duracion_seg": 120,
    "subtitulos": [
      { "idioma": "es", "etiqueta": "Español", "src": "/videos/m1/introduccion_hueso.es.vtt" }
    ],
    "transcripcion": "El hueso es un tejido vivo. En este video el docente presenta sus capas, sus células y la manera en que se renueva durante toda la vida.",
    "hitos": [
      { "t_seg": 0, "titulo": "Introducción" },
      { "t_seg": 45, "titulo": "Capas del hueso" }
    ]
  }
}
```

**Precisión:** siempre 1 (no hay respuestas erróneas).

### 7.6 `exploracion-3d`: modelo 3D (solo mandíbula y células)

El 3D se reserva para la mandíbula y las células (CLAUDE.md). Hay tres valores de `modelo`: `mandibula` y
`celulas` (modelos con nodos: el estudiante gira el modelo, toca un nodo y lee su ficha; la cámara se acerca a
él) y `procedural` (una escena hecha por código con **línea de tiempo**, ver "Variante procedural" más
abajo). Se completa al visitar los `requeridos`.

| Campo de `config` | Regla |
|---|---|
| `modelo` | `mandibula` o `celulas` (con GLB y `nodos`) o `procedural` (escena por código con `linea_de_tiempo`) |
| `alt` | Plano, 10 a 300: descripción del modelo |
| `nodos[]` | Solo en `mandibula` y `celulas` (en `procedural` no va). 2 a 12. `id` (**nodo del catálogo del modelo**, sección 9, o un id libre si lleva `ancla`), `etiqueta` (plano, 2 a 60), `descripcion` (línea, 10 a 500), `ancla` y `camara` opcionales |
| `ancla` | Solo en `mandibula`. `{ x, y, z }`, cada uno de 0 a 1 en la caja envolvente del modelo (sección 9). Para zonas que **no son una pieza** del modelo |
| `camara` | `vista` (por defecto `frontal`) y `zoom` (0,5 a 3; por defecto 1) |
| `requeridos` | 1 a 12 ids de nodos (o de pasos, en `procedural`), sin repetir, todos existentes |
| `escena` | Solo `procedural`: nombre de la escena registrada (una de las de la sección 9) |
| `linea_de_tiempo` | Solo `procedural`: `{ "pasos": [...] }`, de 2 a 12 pasos (ver abajo) |

La cámara no lleva coordenadas: quien escribe el contenido no puede previsualizar el 3D. Se elige una
**vista con nombre** (sección 9) y la escena calcula la posición a partir del tamaño del nodo. Sin
`camara`, se usa `frontal` con zoom 1.

**Nodo por pieza o nodo por ancla.** Lo que se enseña en la mandíbula no siempre es una pieza que Blender
pueda separar: el foramen es un hueco, la línea milohioidea una cresta, la zona de compresión del canino una
región funcional. Hay dos maneras de apuntar al modelo:

- **Por pieza:** el `id` es un nodo del catálogo de la sección 9 (`condilo`, `rama`, `angulo`, `cuerpo`...), es
  decir, lo que F0-08 separa. El GLB debe traer un nodo con ese nombre.
- **Por ancla:** el nodo lleva `ancla: { x, y, z }` y su `id` es libre (snake_case, sin diminutivos). Funciona con
  el modelo provisional de una sola malla y con el GLB definitivo, y no depende de que el modelador separe nada.
  Si más adelante el GLB trae esa pieza, el mismo `id` puede pasar a resolverse como nodo.
  Las coordenadas de la mandíbula no se escriben a mano: las calcula `tools/anclas/calcular_anclas.mjs` sobre la
  malla real (método, límites y comandos en `docs/anclas-mandibula.md`) y quedan en `nodos3d.ts` y en el contenido.

Sea cual sea, la lista de nodos (botones) **funciona siempre y permite completar la actividad aunque el
lienzo 3D falle** (sección 16).

```json ejemplo:nodo_3d_ancla
{
  "id": "zona_compresion_canino",
  "etiqueta": "Zona de compresión del canino",
  "descripcion": "Lado hacia el que se mueve el diente: el ligamento se comprime y el hueso se reabsorbe.",
  "ancla": { "x": 0.5, "y": 0.6, "z": 0.95 },
  "camara": { "vista": "frontal", "zoom": 2 }
}
```

```json ejemplo:actividad_exploracion_3d
{
  "id": "m1_explora_mandibula",
  "tipo": "exploracion-3d",
  "titulo": "Recorre la mandíbula",
  "instrucciones": "Gira la mandíbula y toca sus partes para leer cómo trabaja el hueso en cada una.",
  "puntaje_max": 30,
  "retroalimentacion": {
    "correcta": "Muy bien: ya ubicas las partes de la mandíbula donde el hueso soporta más carga."
  },
  "concepto": "Anatomía funcional de la mandíbula",
  "config": {
    "modelo": "mandibula",
    "alt": "Modelo tridimensional de la mandíbula que se puede girar y acercar.",
    "nodos": [
      {
        "id": "condilo",
        "etiqueta": "Cóndilo",
        "descripcion": "Extremo superior de la rama; se articula con el hueso temporal y recibe carga al masticar.",
        "camara": { "vista": "lateral_derecha", "zoom": 1.5 }
      },
      {
        "id": "angulo",
        "etiqueta": "Ángulo",
        "descripcion": "Unión de la rama con el cuerpo; concentra fuerzas de los músculos masetero y pterigoideo medial."
      },
      {
        "id": "cuerpo",
        "etiqueta": "Cuerpo",
        "descripcion": "Porción horizontal que aloja los dientes en el hueso alveolar.",
        "camara": { "vista": "oblicua" }
      }
    ],
    "requeridos": ["condilo", "angulo", "cuerpo"]
  }
}
```

**Precisión:** siempre 1.

#### Variante procedural: escena 3D con línea de tiempo

Con `modelo: "procedural"` la actividad **sigue siendo `exploracion-3d`** (el contexto pedagógico y la API no
cambian). No hay GLB ni nodos: las formas son esquemáticas y las genera el código, y **lo que se explora es
el tiempo**. El estudiante reproduce, pausa, adelanta y atrasa (deslizador continuo, botones de fase
anterior y siguiente, velocidad, reiniciar), gira la escena con un dedo y la acerca con dos. La escena dibuja
su **estado en cada instante `t`** (0 a 1) y solo eso: adelantar y atrasar es exacto. Cada paso es un hito de
la línea de tiempo:

| Campo de un `paso` | Regla |
|---|---|
| `id` | Snake_case, único en la actividad (es lo que viaja en `requeridos` y en `visitados`) |
| `t` | Número de 0 a 1. **Estrictamente creciente** de un paso al siguiente. Usa los hitos de la escena (sección 9): el texto de cada fase sale del paso más cercano a `t` |
| `titulo` | Plano, 2 a 60 |
| `texto` | Línea con Markdown restringido, 10 a 500: lo que se lee junto a la escena mientras esa fase está en curso |
| `vista` | Vista de cámara con nombre **de esa escena** (sección 9); por defecto `general` |

Visitar un paso es **detener la línea de tiempo en él o pasar por él** (reproduciendo o arrastrando el
deslizador), o pulsarlo en la lista de fases, que lleva la línea hasta su hito. La actividad se completa al
visitar los `requeridos`. Como en las demás, **la lista de fases (botones) y el texto de la fase funcionan sin
WebGL** y bastan para completarla (sección 16). Nunca hay reproducción automática, tampoco con
`prefers-reduced-motion`. La escala de tiempo es didáctica, no proporcional a la biología real (dilo en el
texto si importa).

```json ejemplo:actividad_exploracion_3d_procedural
{
  "id": "m5_bmu_3d_tiempo",
  "tipo": "exploracion-3d",
  "titulo": "Una BMU en 3D, a lo largo del tiempo",
  "instrucciones": "Reproduce la línea de tiempo o muévela con el deslizador. Gira la escena con un dedo y acércala con dos. Visita las fases.",
  "obligatoria": false,
  "puntaje_max": 40,
  "retroalimentacion": {
    "correcta": "Recorriste las fases de la BMU: resorción, inversión, formación y mineralización."
  },
  "concepto": "Ciclo de remodelado de una BMU cortical a lo largo del tiempo",
  "config": {
    "modelo": "procedural",
    "escena": "bmu_remodelado",
    "alt": "Escena 3D de un fragmento de hueso cortical en el que una BMU excava un túnel y lo rellena con capas de osteoide.",
    "linea_de_tiempo": {
      "pasos": [
        {
          "id": "paso_quiescencia",
          "t": 0,
          "titulo": "Quiescencia: el hueso en reposo",
          "texto": "Una osteona cortical en reposo, con su capilar y células de revestimiento en el conducto.",
          "vista": "general"
        },
        {
          "id": "paso_resorcion",
          "t": 0.32,
          "titulo": "Resorción: el cono de corte",
          "texto": "Los osteoclastos excavan un túnel de unos 200 µm de diámetro: es el cono de corte.",
          "vista": "perfil"
        }
      ]
    },
    "requeridos": ["paso_quiescencia", "paso_resorcion"]
  }
}
```

Cómo añadir otra escena procedural (código, no contenido): `docs/escena-3d-bmu.md`.

## 8. SVG multicapa

Los dibujos de `multicapa`, de `arrastre-molecular` (fondo) y de `video-texto` (animación) son archivos
SVG en `apps/web/public/images/m{n}/`. La aplicación los descarga y los **inyecta en la página** para
manipular sus capas por `id`. Por eso se validan con reglas estrictas (`auditarRecursos`, `svg.ts`).

Reglas del archivo:

1. Empieza por `<svg ... viewBox="0 0 ANCHO ALTO">`. El `viewBox` **coincide exactamente** con el del JSON y
   sus números son **enteros** (en Inkscape: Propiedades del documento, unidades en px y escala 1). Un
   `width` o `height` fijo no rompe nada (la aplicación los sobrescribe con CSS para escalar el dibujo al
   ancho de la pantalla), pero es mejor no ponerlos.
2. **Cada capa es un `<g id="...">`** cuyo id es el `id` de la capa en el JSON. No basta con poner el id
   en un `<path>`. Una capa puede contener varias formas.
3. Los ids no se repiten dentro del archivo. Entre los SVG que se inyectan en un mismo módulo **solo importan
   los ids que algo referencia** (`url(#id)` o `href="#id"`: degradados, máscaras, marcadores, `<use>`): esos
   llevan un prefijo propio (`aux_hueso_degradado`). Los ids que generan Inkscape o Illustrator y nadie
   referencia (`svg5`, `defs2`, `layer1`) no dan error. Además, al inyectarse, la aplicación antepone
   `{actividad.id}__` a los ids referenciados, así que un mismo dibujo puede aparecer dos veces en una página.
4. **Prohibido:** `<script>`, atributos `on*=` (se buscan dentro de las etiquetas: un `<title>` con la
   palabra "onda=3" no es un atributo), `<foreignObject>`, `<style>` (sus reglas afectarían a toda
   la página; usa atributos de presentación o `style=""`), `<image>` (el SVG es vectorial puro),
   animaciones SMIL (`<animate>`, `<set>`; las animaciones las controla la actividad respetando
   `prefers-reduced-motion`), `DOCTYPE`/`ENTITY` y referencias externas (`href="https://…"`,
   `url(https://…)`; solo `#id`). Los comentarios `<!-- -->` sí se pueden usar.
5. Pesa menos de **200 KB** (se descarga en móvil).
6. Guarda en UTF-8, sin prólogo `<?xml ...?>` si puedes evitarlo (se admite).
7. En un SVG de **animación** (`video-texto`), todo el dibujo va dentro de `<g id>` de **primer nivel**
   (sección 7.5): sin formas sueltas en la raíz ni grupos de pasos anidados.
8. Solo dibujo vectorial: **no se admiten fotos dentro del SVG** (`<image>`). Una microfotografía del docente
   va en un bloque `imagen` (webp o jpg), sin zonas tocables; si hace falta una foto con zonas activas, se
   abre una decisión nueva (docs/revisiones.md), no se improvisa.

**Zonas táctiles.** Un contorno fino no se toca con el dedo: `stroke-width="16"` en un `viewBox` de 800 mide
7 px en un teléfono. Por eso la aplicación no usa el rectángulo de la capa (taparía las capas interiores de
un dibujo concéntrico). Al inyectar el SVG, para cada capa y en la misma posición del orden de dibujo:

- Si la capa contiene un hijo **`<g data-zona-toque>`** (o un `<path id="{capa}_toque">`), con relleno
  transparente, ese es el objetivo táctil y sustituye a lo siguiente. Úsalo en las capas delgadas o
  pequeñas: dibuja tú la zona que quieres que responda.
- Si no, la aplicación clona cada forma visible como transparente: con relleno, `pointer-events="all"`; solo
  con contorno, `stroke="transparent"`, `pointer-events="stroke"` y un `stroke-width` de al menos 44 px.

Lo que no se puede arreglar desde la aplicación es una capa **totalmente cubierta** por otra que se dibuja
después: no se podría tocar. Dibuja las capas de fuera hacia dentro.

**Diseño para móvil:**

- El dibujo se ve de unos 320 a 420 px de ancho. Una capa que ocupe menos del 12 % del ancho del `viewBox`
  cuesta tocarla con el dedo: agrándala, agrúpala o añade su `data-zona-toque`.
- **No dependas solo del color** para distinguir capas: usa contornos, formas y las etiquetas que la
  actividad muestra. Da a cada forma un contorno oscuro para que se lea sobre fondo claro y oscuro.
- Las capas se superponen: la que se dibuja al final queda encima y es la que recibe el toque.
- Sin texto pequeño dentro del dibujo (los nombres viven en el JSON y la actividad los muestra).

Ejemplo mínimo (`hueso_capas.svg` con dos capas):

```svg ejemplo:svg_minimo
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" fill="none">
  <!-- Capas concéntricas, de fuera hacia dentro. -->
  <g id="capa_hueso_compacto">
    <ellipse cx="400" cy="300" rx="320" ry="238" fill="#e8d9b5" stroke="#b39b6c" stroke-width="4"/>
  </g>
  <g id="capa_medula_osea">
    <ellipse cx="400" cy="300" rx="120" ry="90" fill="#c0503a" stroke="#8e3626" stroke-width="3"/>
  </g>
</svg>
```

Lo siguiente **se rechaza** (`<script>`, manejador de eventos y referencia externa):

```svg invalido:svg_prohibido
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <script>alert(1)</script>
  <g id="capa_a" onclick="hacer()"><use href="https://ejemplo.org/x.svg#a"/></g>
</svg>
```

## 9. Escenas 3D: nodos y vistas

Cada nodo del GLB debe llamarse **exactamente** como su id en el contenido (`snake_case` en español). El
catálogo es el contrato con quien modela en Blender (F0-08 y F0-10) y contiene **solo lo que esas tareas
planean separar**. Los GLB definitivos aún no existen: hasta entonces el catálogo es la propuesta que esos GLB
deben respetar y `mandibula` (la mandíbula completa) es el único nodo del modelo provisional. Lo que no es una
pieza separable (foramen mandibular, escotadura, línea oblicua o milohioidea, crestas, zonas funcionales) se
pide con `ancla` (sección 7.6). Si el modelador cambia un nombre, se cambia en
`apps/web/src/content/nodos3d.ts` y en el contenido.

**Modelo `mandibula`** (F0-08): `mandibula` (el hueso completo), `condilo`, `apofisis_coronoides`, `rama`,
`angulo`, `cuerpo`, `sinfisis`, `foramen_mentoniano`.

**Modelo `celulas`** (F0-10): `celula_osteoprogenitora`, `osteoblasto`, `osteocito`, `osteoclasto`. Es un modelo
de piezas separadas y **no admite `ancla`**. Las demás células del linaje (célula madre mesenquimal,
preosteoblasto, célula de revestimiento, precursores del osteoclasto) se explican con SVG o texto, no en 3D,
mientras no haya un modelo suyo.

**Ejes del ancla** (del sujeto, no de la pantalla; el GLB definitivo usa `+Y` arriba y `+Z` hacia delante):
`x` 0 es el lado derecho del sujeto y 1 el izquierdo; `y` 0 es el borde inferior del hueso y 1 la punta del
cóndilo; `z` 0 es atrás y 1 adelante (el mentón). Por ejemplo, el mentón está cerca de `{ x: 0.5, y: 0.2, z: 1 }`.

**Vistas de cámara** (relativas al modelo, no a la pantalla): `frontal` (la vista por defecto),
`posterior`, `lateral_derecha`, `lateral_izquierda`, `superior`, `inferior`, `oblicua` (tres cuartos,
elevada; muestra mejor el volumen), `medial_derecha` y `medial_izquierda`. `lateral_derecha` es la cámara colocada del lado **derecho del sujeto**,
mirando hacia el modelo (se ve la cara externa de ese lado); `lateral_izquierda`, la del lado izquierdo.
Para estructuras que quedan detrás o al costado (el cóndilo, la rama) elige una vista lateral.
Las estructuras de la cara **medial** (interna) de la rama, como el `foramen_mandibular` y la língula, no se ven
desde fuera: usa `medial_derecha` o `medial_izquierda`. La cámara entra en el arco de la mandíbula (queda a 0,9 del
nodo como máximo, por lo que ese `zoom` solo puede acercar) y mira hacia fuera la cara interna de la rama de ese
lado. Si el nodo lleva el `ancla` calculada de una estructura, la actividad ya lo enfoca desde su vista recomendada
y no hace falta fijar `camara`.

**Escenas procedurales** (`modelo: "procedural"`, sección 7.6): no hay GLB ni catálogo de nodos, sino
una escena registrada por nombre en `apps/web/src/scenes/procedural/registro.ts` y en `nodos3d.ts`
(`ESCENAS_PROCEDURALES`, `VISTAS_ESCENA_PROCEDURAL`). Hoy hay catorce; cada una tiene su nota de diseño en
`docs/escena-3d-<nombre>.md` con sus vistas, hitos y límites. Las cuatro primeras:

- **`bmu_remodelado`**: ciclo de remodelado de una unidad multicelular básica (BMU) en hueso cortical, con
  el hueso cortado en cuña para ver el túnel. Avanza de derecha a izquierda, como en el dibujo
  `m5_bmu_cortical_longitudinal.svg`. Vistas: `general` (tres cuartos, la vista por defecto), `perfil` (el
  túnel en corte longitudinal), `extremo` (la tapa abierta con las capas concéntricas en corte transversal) y
  `detalle` (cerca de la pared del túnel). **Hitos** de sus siete fases, que el contenido debe usar como `t`
  de sus pasos (la fase en curso es la del hito más cercano): `quiescencia` 0, `activacion` 0,14,
  `resorcion` 0,32, `inversion` 0,5, `formacion` 0,66, `mineralizacion` 0,84 y `reposo` 1. Colores: los de
  los SVG del proyecto (hueso `#d98aa2`, osteoide `#f4d3dd`, osteoblasto `#8b7bdc`, osteocito `#6f93e2`,
  núcleos `#3b2f86`).
- **`hueso_largo_a_osteona`**: un viaje por escalas, del órgano a la célula. Aquí `t` **no es tiempo sino
  profundidad**: el deslizador baja del hueso largo entero (diáfisis, epífisis con cartílago articular y
  periostio), al hueso abierto (cortical, médula y trabéculas), a un corte transversal de la diáfisis (periostio,
  cortical con osteonas, endostio y médula; las capas se separan y se vuelven a juntar), a una osteona ampliada
  y cortada en escalera (laminillas concéntricas con fibras de colágeno que alternan de dirección, conducto de
  Havers con capilar y vénula, línea cementante, conducto de Volkmann) y a sus osteocitos con lagunas y
  canalículos. Vistas: `general` (por defecto), `interior`, `corte`, `capas`, `osteona` y `detalle`. **Hitos** de
  sus siete fases: `entero` 0, `abierto` 0,2, `corte` 0,42, `capas` 0,58, `osteonas` 0,74, `osteona` 0,88 y
  `osteocitos` 1. Los tamaños son esquemáticos y no están a escala entre una pantalla y otra. Nota de diseño:
  `docs/escena-3d-hueso.md`. Está en el módulo 1 como actividad opcional `m1_4_viaje_3d` (30 puntos).
- **`matriz_osea`**: la composición de la matriz por escalas (`t` es profundidad): un fragmento de hueso laminar,
  sus fibras de colágeno, una fibrilla con moléculas escalonadas y huecos, los cristales de hidroxiapatita que
  crecen en ellos, las proteínas no colágenas y, al final, la respuesta a la tracción y a la compresión. Vistas:
  `general`, `fibra`, `fibrilla`, `detalle` y `carga`. **Hitos**: `fragmento` 0, `fibras` 0,17, `fibrilla` 0,34,
  `huecos` 0,5, `mineral` 0,64, `proteinas` 0,78 y `carga` 1. Nota: `docs/escena-3d-matriz.md`. Actividad opcional
  `m1_3_matriz_3d` (30 puntos).
- **`hueso_alveolar`**: un segmento del cuerpo mandibular con un diente, cortado en sentido vestibulolingual por la
  raíz: tablas corticales, hueso trabecular, hueso alveolar propio (lámina cribiforme), ligamento periodontal y
  conducto mandibular. Vistas: `general`, `corte`, `raiz` y `conducto`. **Hitos**: `cuerpo` 0, `corte` 0,18,
  `tablas` 0,34, `trabecular` 0,5, `alveolar_propio` 0,66, `ligamento` 0,82 y `conducto` 1. Nota:
  `docs/escena-3d-alveolar.md`. Actividad opcional `m1_5_alveolar_3d` (30 puntos).

Las diez restantes (2026-09-26), todas con siete hitos (ocho el alvéolo) y una actividad opcional de 30 puntos:

| Escena | Vistas | Dónde se usa | Nota |
|---|---|---|---|
| `osteoblasto_celula` | general, celula, organulos, matriz, detalle | `m2_2_osteoblasto_3d` | `escena-3d-osteoblasto.md` |
| `osteocito_red` | general, laguna, canaliculos, red, superficie | `m2_3_osteocito_3d` | `escena-3d-osteocito.md` |
| `osteoclasto_resorcion` | general, celula, borde, laguna | `m2_4_osteoclasto_3d` | `escena-3d-osteoclasto.md` |
| `mandibula_fetal` | general, lateral, corte, detalle | `m2_1_mandibula_fetal_3d` | `escena-3d-mandibula-fetal.md` |
| `dos_rutas_osificacion` | general, intramembranosa, endocondral, detalle | `m3_1_dos_rutas_3d` | `escena-3d-dos-rutas.md` |
| `vesicula_matriz` | general, vesicula, interior, cristal | `m4_3_vesicula_3d` | `escena-3d-vesicula.md` |
| `movimiento_ortodontico` | general, corte, compresion, tension | `m5_5_ortodoncia_3d` | `escena-3d-ortodoncia.md` |
| `reparacion_fractura` | general, corte, callo, detalle | `m5_6_fractura_3d` | `escena-3d-fractura.md` |
| `hueso_trabecular_tiempo` | general, detalle, corte, comparacion | `m6_3_trabecular_3d` | `escena-3d-trabecular.md` |
| `alveolo_postextraccion` | general, corte, alveolo, reborde | `m6_4_alveolo_3d` | `escena-3d-alveolo.md` |

Una escena puede reutilizarse en otro módulo con otra actividad y otros textos (`hueso_alveolar` en `m2_5_alveolar_3d`,
`matriz_osea` en `m4_4_matriz_3d`): los `t` de los pasos siguen siendo los hitos de la escena.

## 10. Accesibilidad del contenido

El contenido es la mitad de la accesibilidad del OVA (la otra mitad son los componentes:
`activities/types.ts`, reglas R1 a R10). Al escribir:

- **Texto alternativo en todo:** `alt` en imágenes, en el SVG multicapa, en la escena de arrastre y en la
  escena 3D. Describe lo que se aprende, no la apariencia.
- **Nada depende del color, del arrastre ni de una animación.** Cada efecto animado tiene su texto; cada
  actividad de arrastre o toque tiene una alternativa de teclado y de lector de pantalla que
  construyen los componentes con los mismos datos del JSON.
- **Video:** subtítulos y transcripción siempre.
- **Lenguaje:** frases cortas, términos definidos, sin metáforas que no traduzcan bien. Los nombres de
  estructuras (`etiqueta`) se leen bien en voz alta.
- **Sin límites de tiempo** ni cuentas atrás.
- **Etiquetas únicas y descriptivas:** dos capas no se llaman igual; un lector de pantalla las anuncia una a una.

## 11. Puntaje, completitud y bloqueo

Lo implementa `apps/web/src/content/scoring.ts` (funciones puras, con pruebas). Los componentes
**no calculan el puntaje por su cuenta**: usan `calcularPuntaje`.

### Fórmula

```text
puntaje = redondear( puntaje_max × precisión × factor(intentos) )
factor(n) = max( piso, 1 − por_intento × (n − 1) )
```

- **Intento:** una ejecución completa de la actividad, de principio a fin. Repetirla es el intento
  siguiente. `n` es el número de esta ejecución (1 el primero).
- **Precisión:** de 0 a 1, de la ejecución que completa la actividad. Depende del tipo (secciones 7.1 a 7.6).
- **Por defecto** `por_intento = 0,1` y `piso = 0,4`: el primer intento vale 100 %, el segundo 90 %, el
  tercero 80 %… y desde el séptimo, 40 %. Cada actividad puede cambiarlos en `penalizacion`.
- El resultado es un **entero**, nunca negativo, nunca mayor que `puntaje_max` (ni que 1000, el tope de
  la API); el medio punto sube (22,5 → 23). Una precisión fuera de 0 a 1, `intentos` menor que 1 o un
  valor que no es número se corrigen en vez de fallar.

| `puntaje_max` | Precisión | Intento | Puntaje |
|---:|---:|---:|---:|
| 100 | 1 | 1 | 100 |
| 100 | 1 | 2 | 90 |
| 100 | 0,8 | 3 | 64 |
| 100 | 1 | 7 | 40 |
| 100 | 1 | 500 | 40 (el piso) |
| 50 | 0,5 | 2 | 23 |
| 30 | 0 | 1 | 0 |

**Retroalimentación al terminar:** según la precisión, se muestra `correcta` (desde 0,8),
`parcial` (desde 0,5) o `incorrecta` (por debajo). Si falta el mensaje de la banda se usa el más cercano.

### Puntaje del módulo y del OVA

- `puntajeMaximoModulo` suma los `puntaje_max` de las actividades. **Cada módulo suma entre 100 y 1000
  puntos** (el esquema lo exige). El tope es 1000 y no menos porque los módulos densos (M3 a M5) pasan de
  600 (sus guiones suman 700, 660 y 810). Lo que hace comparables a los seis módulos en el certificado y en
  el HUD no es el tope sino el **porcentaje**: puntaje obtenido ÷ `puntaje_max` de las actividades
  obligatorias de ese módulo (`puntajeObtenidoModulo` y `puntajeMaximoModulo`).
- **Repetir una actividad no acumula puntos:** el servidor cuenta, por `activity_id`, el **mejor** puntaje
  entre los intentos completados (docs/api-contract.md). Un intento sin completar no puntúa.
- **Guía de `puntaje_max`** (orientativa; los módulos de alta densidad, 3, 4 y 5, pesan más):

| Tipo | `puntaje_max` habitual |
|---|---|
| `multicapa` | 20 a 40 |
| `arrastre-molecular` | 40 a 60 |
| `relacion-columnas` | 20 a 40 |
| `quiz` | 10 por pregunta |
| `video-texto` | 10 a 20 |
| `exploracion-3d` | 20 a 40 |

Un módulo sencillo tiene de 5 a 9 actividades (200 a 400 puntos); los módulos densos (M3 a M5) llegan a
13 o 26 actividades y hasta 810 puntos. Cada módulo lleva al menos un quiz y, en cada sección, **una
actividad obligatoria** (el esquema lo exige) que preferiblemente no sea un quiz.

### Completitud y bloqueo

- Una actividad está **completada** cuando el estudiante termina una ejecución (no exige acertar todo:
  el puntaje refleja cuánto acertó). Es lo que registra la API (`completada`).
- Una actividad está **superada** (`actividadSuperada`) cuando está completada y, si lleva `aprobacion_min`
  (0,5 a 1), su **mejor precisión** llega al umbral. Los guiones piden un mínimo de 60 o 70 % en la evaluación
  final para el logro del módulo: se escribe `"aprobacion_min": 0.7` en ese quiz. Se mide sobre la **precisión**
  y no sobre el puntaje, porque con la penalización por defecto el 70 % del puntaje es inalcanzable desde el
  5.º intento (un quiz de 140 puntos con precisión 1 da 126, 112, 98, 84, 70, 56...) y quien falló cuatro veces
  quedaría bloqueado para siempre. La precisión no depende del intento: se puede llegar repitiendo.
  `idsSuperadas(modulo, resultados)` devuelve el conjunto que se pasa a `seccionCompletada`,
  `moduloCompletado` y `estadoDeSecciones`. Si el servidor aún no devuelve la precisión, se acepta lo
  completado (no se bloquea a nadie por un dato que falta).
- Una **sección** está completada cuando todas sus actividades **obligatorias** están superadas. El esquema
  exige al menos una obligatoria por sección.
- Un **módulo** está completado cuando todas sus secciones lo están. Entonces la SPA envía
  `PUT /api/progress/{modulo}` con `completado: true` **después** de que termine el último `POST` de
  resultado (nunca antes, ni si el `POST` falló). Si la SPA calcula "completo" pero el servidor no (se cerró
  el navegador entre ambos), al cargar reenvía el `PUT`. Con manifiesto el servidor responde `409
  modulo_incompleto` (con `faltantes`) si le falta algún resultado obligatorio: la SPA lo trata como "aún no
  está completo" y reintenta al cargar. La bandera del servidor manda para el menú y el bloqueo entre
  módulos; los resultados mandan para las secciones.
- **"Sin errores en un módulo"** (F5-04) se decide con `ejecucionSinErrores`: precisión 1 en el primer
  intento; no con `puntaje === puntaje_max`, porque el redondeo puede dar el máximo con media pregunta mal.
- **Bloqueo secuencial** (`BLOQUEO_SECUENCIAL` en `src/config.ts`, vale `true` por defecto; `VITE_BLOQUEO_SECUENCIAL=false` lo desactiva): un solo interruptor.
  Con `true`, el módulo `n` se abre cuando el `n−1` está completado, y dentro de un módulo la sección
  siguiente se abre cuando la actual está completada. Un módulo o sección ya completado nunca se
  vuelve a cerrar. Con `false`, todo está abierto (útil para que el docente revise). El menú deja abrir el
  módulo en el que el estudiante ya está (se entra por URL); `moduloDesbloqueado` no lo sabe, así que quien
  proteja una ruta debe permitir el módulo activo.
- **Siguiente pieza pendiente:** la primera actividad obligatoria sin completar, en el orden del módulo
  (`siguientePendiente`).

### Cómo llega el resultado a la API

Cada actividad completada envía `POST /api/activities/{id}/result` con el cuerpo que arma
`aPeticionResultadoApi` (en `activities/types.ts`):

| Campo del cuerpo | Sale de |
|---|---|
| `{id}` de la ruta | `actividad.id` |
| `modulo` | número del módulo (1 a 6) |
| `tipo` | `actividad.tipo` |
| `puntaje` | `resultado.puntaje`, acotado entre 0 y `puntaje_max` (máximo 1000) |
| `intentos` | `resultado.intentos`, entero de 1 a 100 |
| `completada` | `true` |
| `detalle` | `resultado.detalle` más `precision` (4 decimales); si pasa de 4 KB se reduce a `{ precision, truncado: true }` para que la API no lo rechace |

## 12. Errores frecuentes

| Mensaje | Causa y solución |
|---|---|
| `Id duplicado "x" (opcion); ya se usó como …` | Un id se repite en el módulo. Cambia el segundo (sección 3) |
| `El id de actividad "x" debe empezar por "m1_"` | Falta el prefijo del módulo en el id de la actividad |
| `La capa requerida "x" no existe en "capas"` | `requeridas` cita una capa que no declaraste |
| `Falta la capa <g id="x"> en el SVG` | La capa está en el JSON pero el SVG no tiene ese `<g id>` |
| `El viewBox del archivo … no coincide` | El `viewBox` del JSON no es el del SVG |
| `El enlace glosario:x no apunta a ningún término` | Añade el término al `glosario` o corrige el id |
| `Las actividades suman N puntos; … entre 100 y 1000` | Ajusta los `puntaje_max` |
| `La sección "x" no tiene ninguna actividad obligatoria` | Cada sección necesita al menos una actividad obligatoria |
| `Quita la marca "[verificar]"` | Borra la marca del texto y anota la duda en `estado_revision.pendientes` |
| `El pendiente apunta a "x", que no es ninguna sección, bloque…` | El `id` de un pendiente debe existir en el módulo |
| `Id duplicado "x" (capa); … no se repiten en un módulo` | Capa, molécula, pregunta, sección, bloque y actividad son únicos en el módulo |
| `Id duplicado "x" (opcion) dentro de la actividad "y"` | Dentro de una actividad no se repiten ids (entre actividades sí se puede) |
| `Con 3 correctas hacen falta al menos 3 incorrectas` | Añade opciones incorrectas: marcar todo no debe puntuar |
| `La molécula "x" es distractor: escribe "rechazo"` | Todo distractor necesita el texto de por qué no encaja |
| `"aprobacion_min" solo se usa en actividades obligatorias` / `precisión es siempre 1` | El umbral solo se aplica a actividades obligatorias que pueden fallar |
| `¿quisiste decir "descripcion" en lugar de "descripción"?` | Un campo con tilde o una errata: usa el nombre sin tilde de la guía |
| `No se permite HTML` / `Aquí no se admite Markdown` | Quita las etiquetas; en campos planos, la `**negrita**` |
| `Campo(s) desconocido(s): "x"` | Errata en el nombre de un campo; mira la tabla del tipo |
| `"x" no es un nodo del modelo "mandibula"` | El id no está en el catálogo (sección 9): si es una zona y no una pieza, añade `ancla` |
| `Los receptores … deben separarse al menos 52 px` | Aleja los receptores en `posicion` (se mide en píxeles a 320 px de ancho, sección 7.2) |
| `El receptor "x" queda a menos de 22 px de un borde` | Acerca el receptor al centro de la escena; el mensaje da el rango |
| `En modo "identificar", la capa requerida … necesita "pista"` | Escribe la `pista` de cada capa requerida |
| `Con estado "aprobado" es obligatorio indicar …` | Ver sección 13 |

Si el archivo no llega ni a validarse (Vite muestra un error de sintaxis JSON, por ejemplo una coma de más),
localiza la línea con `node -e "JSON.parse(require('fs').readFileSync('content.json','utf8'))"`; los errores
de esta tabla solo aparecen cuando el JSON ya es sintácticamente válido.

## 13. Estado de revisión

```json ejemplo:estado_revision
{
  "estado": "revisado_docente",
  "revisado_por": "Nombre del docente",
  "fecha": "2026-10-05",
  "version": "1.1",
  "notas": "Ajustado el orden de las fases del remodelado y corregida una cifra.",
  "pendientes": [
    { "id": "c_calcio", "nota": "Confirmar la cifra del 99 % del calcio corporal almacenada en el hueso." },
    { "id": "m1_quiz_repaso", "nota": "Revisar la dificultad asignada a las preguntas 2 y 4." }
  ]
}
```

- `estado`: **`borrador`** (nuestro texto, pendiente de validación; es el que se escribe hoy),
  **`revisado_docente`** (el docente lo revisó y pidió cambios o los aprobó parcialmente) o
  **`aprobado`** (aprobación explícita del docente).
- Con `revisado_docente` o `aprobado` son obligatorios `revisado_por`, `fecha` (`AAAA-MM-DD`) y `version`.
- **`pendientes`** (hasta 250) es la lista para el docente de lo que los guiones marcan con `[verificar]`:
  cada elemento es `{ id, nota }`, con el `id` de un bloque, sección, actividad, capa, molécula, pregunta,
  término del glosario o referencia **que exista en el módulo** (el esquema lo comprueba) y una `nota`
  (plano, 5 a 300) que dice qué confirmar. Un mismo `id` puede tener varias notas. Se copia a
  `docs/revisiones.md` al entregar. La marca `[verificar]` nunca queda en el texto que lee el estudiante.
- `notas` (plano, 5 a 600) recoge dudas generales y supuestos. **Cada entrega al docente se
  registra en `docs/revisiones.md`** con fecha, versión, cambios pedidos y aprobación (CLAUDE.md).
- El estado no bloquea nada en la aplicación: solo informa.

## 14. Cambios de API requeridos

Esta guía **no modifica** `docs/api-contract.md` ni el backend (el contrato exige tocar ambos lados a la
vez; los cambios los hace quien coordina). Con lo que el contrato ya recoge (lectura de resultados,
manifiesto de actividades, certificado) el OVA funciona de extremo a extremo; lo que sigue son los
**cambios que quedan** para que el ajuste de esta guía (`aprobacion_min`) y algunas garantías queden completos:

1. **`precision` en el resultado (necesario para `aprobacion_min`).** La precisión viaja hoy solo dentro de
   `detalle`, que `GET /api/activities/results` omite y que un cliente hostil puede alterar. Propuesta:
   - campo opcional `precision` (0 a 1, columna nullable) en `POST /api/activities/{id}/result`;
   - `mejor_precision` (mayor precisión entre los intentos completados) en cada fila de
     `GET /api/activities/results`, junto a `mejor_puntaje`;
   - `EstadoPrevioActividad.servidor.precision` de la SPA (`activities/types.ts`) sale de ahí.
   Mientras no exista, la SPA manda la precisión en `detalle.precision` (ya lo hace `aPeticionResultadoApi`)
   y `actividadSuperada` acepta lo completado si desconoce la precisión.
2. **`aprobacion_min` en el manifiesto.** El manifiesto (`apps/web/src/modules` → `actividades_manifest.json`)
   debe incluir `aprobacion_min` por actividad. Hoy `PUT /api/progress/{modulo}` exige `completada = true` en
   las obligatorias (409 `modulo_incompleto`); con `aprobacion_min` debería exigir además `mejor_precision >=
   aprobacion_min`. Hasta entonces el servidor es más laxo que la SPA (la SPA solo envía el `PUT` cuando
   todas están **superadas**), lo que es seguro: nunca bloquea a quien cumple. El comando
   `build_manifest --comprobar` ya cubre el resto de cambios del esquema (no afectan al manifiesto).
3. **Límite de frecuencia y de filas en `POST /api/activities/{id}/result`.** El contrato limita el chat, el
   PDF y la verificación, pero no los resultados: 200 `POST` seguidos se aceptan y cada uno guarda hasta 4 KB
   de `detalle`. Propuesta: 60 por minuto y por usuario (`429 demasiados_intentos`) y un tope de filas por
   actividad (por ejemplo 200) que conserve el mejor intento y los últimos.
4. **Lectura de resultados: aclaraciones sobre lo ya documentado.** `intentos` es el **mayor número de intento
   reportado** (no la cuenta de filas); `types.ts` usa ese significado. La SPA **no monta una actividad hasta que
   esta respuesta llega** (o falla, o pasan 3 s, `ESPERA_ESTADO_PREVIO_MAX_MS`). Un `mejor_puntaje` 0 con
   `completada: true` es un intento completado sin aciertos. Las instantáneas de un intento a medias se guardan
   solo en el navegador (`localStorage`).
5. **Criterio del certificado.** Ya está definido en el contrato: los 6 módulos completados y `CERT_MIN_PORCENTAJE`
   (70 %) de la suma de `puntaje_max` de las obligatorias. Con la penalización por defecto, **70 % es
   exactamente el resultado de acertar todo al 4.º intento** (factor 0,7): quien necesita más de cuatro
   intentos por actividad no llega. El docente debe confirmar ese umbral. Y recuerda que **las respuestas
   correctas y las explicaciones viajan en el bundle**: el puntaje mide participación y estudio, no es una
   evaluación segura.
6. **Sin cambios en `ContextoPedagogico`** (congelado). `seccion` usa el `id` de la sección, `actividadActual.id`
   el de la actividad y `estructuraSeleccionada` / `moleculaSeleccionada` el de la capa, el nodo o la molécula;
   todos cumplen el límite de 64 caracteres del contrato. Pero el contexto solo lleva **ids**: el ingest y el
   prompt del mentor (F3-01 y F3-04) deben resolver `(módulo, actividad, id)` contra los `content.json`
   (etiqueta, descripción, `concepto` de la actividad y de la pregunta). Los ids de nodo se repiten entre
   actividades, así que la clave es `actividadActual.id` más el id. En un error de `identificar`, el objeto
   de `identifica_capa` es la capa **pedida** y el componente emite además `selecciona_capa` con la
   **tocada** (`activities/types.ts`).

## 15. Decisiones y límites conocidos

- **Dos alcances de ids** (sección 3): módulo para lo que ve el mentor (sección, bloque, actividad, capa,
  molécula, pregunta) y actividad para el resto (nodo, opción, par, receptor, elemento, paso).
- **Recursos en `public/`** (como en PLAN §2) y no empaquetados con el módulo: el docente puede sustituir
  un dibujo sin recompilar.
- **La cámara 3D usa vistas con nombre**, no coordenadas (no se puede previsualizar sin navegador).
- **Los GLB no existen aún:** el catálogo de nodos (sección 9) es lo que F0-08 y F0-10 planean; lo demás se
  pide con `ancla`. Ninguna prueba comprueba todavía que el GLB traiga los nodos del catálogo (queda para
  cuando exista el GLB).
- **Las preguntas generadas por IA no puntúan.**
- **Las referencias bibliográficas** requieren verificación del docente (`verificada`).
- El esquema valida estructura y referencias, no la **veracidad biológica**: eso es revisión del docente.

## 16. Para quien construye los componentes de actividad

- **Contrato:** `apps/web/src/activities/types.ts` (props, eventos, `ResultadoActividad`, mapeo al cuerpo
  de la API, vocabulario de interacciones y reglas de accesibilidad R1 a R10). En `defineProps` y
  `defineEmits` se usan los interfaces concretos de cada tipo (`PropsActividadQuiz`,
  `EmitsActividadQuiz`...): el compilador de Vue no admite el genérico `PropsActividad<'quiz'>`.
- **Conformidad:** cada componente ejecuta `pruebasDeContratoActividad` de
  `apps/web/src/content/__fixtures__/contrato.ts` en su archivo de pruebas. El componente de referencia
  `__fixtures__/ActividadContrato.vue` y `content/contrato-actividades.test.ts` muestran cómo.
- **Datos de prueba:** `muestra()` y `validar()` de `__fixtures__/utiles.ts` dan el módulo de muestra ya
  validado; `listarActividades(modulo)` (`content/consultas.ts`) entrega la actividad de cada tipo. Los
  SVG de prueba están en `__fixtures__/svg/`.
- **Puntaje:** solo con `@/content/scoring` (`calcularPuntaje`, `precisionPorConteo`, `precisionQuiz`,
  `textoRetroalimentacion`). No hay fórmulas propias.
- **Texto:** solo con `@/content/markdown` (`renderizarLinea`, `renderizarBloque`,
  `textoPlanoDeMarkdown`). Nunca `v-html` sobre el texto crudo.
- **SVG:** se descarga con `fetch(actividad.config.svg)` y se inyecta el `<svg>` en la página (no con
  `<img>`: sus capas no serían tocables). Las capas se buscan **dentro del propio SVG**
  (`raiz.querySelector('[id="capa_x"]')`), no en `document`. El archivo ya cumple las reglas de la
  sección 8, pero por defensa en profundidad, al inyectarlo se eliminan los atributos `on*`, se prefijan con
  `{actividad.id}__` los ids que aparecen en `url(#..)` y `href="#.."` (y esas referencias) y se construyen las
  zonas táctiles de cada capa (sección 8 y cabecera de `activities/types.ts`).
- **Orden de los eventos y estado previo:** el emisor `crearEmisorProgreso` (`@/content/progreso`) evita
  que un `progreso` llegue después de `completada`; la página no monta la actividad hasta tener
  `estadoPrevio.servidor` y el componente recalcula `intentos` si cambia antes de la primera interacción.
  La batería de conformidad lo comprueba.
- **Casos límite** (arrastre: radio de captura y soltar en vacío; identificar: qué cuenta como fallo; video:
  `played`; 3D: degradación): cabecera de `activities/types.ts`.
- **Progreso de la actividad:** `esProgresoTardio` para descartar en la página un `progreso` de un intento
  ya completado; `idsSuperadas` para el estado de secciones y módulos.
- **Interacciones:** `describirInteraccion` y `seleccionDeInteraccion` (`activities/types.ts`).

## 17. Decisiones de diseño

Tres revisiones independientes (autor de contenido, ingeniero del motor de actividades y puntuación/API)
criticaron el esquema. Cada hallazgo se verificó ejecutando código antes de decidir. Resumen: **aceptado**
(A), **aceptado en parte** (P) o **rechazado** (R). Las pruebas de cada cambio están en
`apps/web/src/content/ajuste.test.ts` y en las pruebas de cada módulo.

| # | Hallazgo (gravedad) | Decisión | Razón |
|---|---|---|---|
| 1 | Tope de 600 puntos rechaza M3, M4 y M5 (bloqueante, dos revisores) | **A** | Reproducido: 810 puntos fallaba. El tope pasa a 1000; el peso comparable lo da el porcentaje por módulo (sección 11). No se reescalan los guiones: sería rehacer trabajo entregado |
| 2 | `exploracion-3d` exige nodos de GLB y los guiones usan hotspots sobre una malla (bloqueante) | **A** | Reproducido con `cuerpo_molares`. Se añade `ancla` `{x,y,z}` (solo mandíbula) y el catálogo se recorta a lo que F0-08 y F0-10 separan. No se amplía el catálogo con crestas ni zonas: no son piezas |
| 3 | Un receptor solo acepta una molécula (Wnt y esclerostina en LRP5/6) | **A** | Reproducido. Se quita la regla del receptor único, se mantiene la de molécula única; el receptor muestra el efecto de la última acoplada y el orden no cambia el resultado |
| 4 | Límites de longitud superados por los guiones | **P** | Suben `instrucciones` a 400, `capas` a 15, `efecto.descripcion` a 450 y `explicacion` a 600. **Rechazado** subir `moleculas`: el conteo de 9 sumaba dos veces los distractores (los distractores ya están dentro de `moleculas`; el máximo real de los guiones es 7). **Rechazado** 450 en `instrucciones`: 595 caracteres en un teléfono es un defecto de UX; esas dos se dividen en un bloque `texto` previo. Se añade la tabla de límites (sección 4) |
| 5 | Las marcas `[verificar]` no tienen destino y pasan la validación | **P** | Aceptado: el esquema rechaza `[verificar]` en cualquier texto y `estado_revision.pendientes` `{id, nota}` (con el id comprobado) recoge las dudas. Rechazado el campo `verificar: true` por bloque: duplicaría los pendientes |
| 6 | No hay nivel (posgrado) ni dificultad | **A** | `nivel: "posgrado"` (solo ese valor: sin `nivel` es para todos) en texto, imagen, callout y tabla, con `visibleParaNivel`; `dificultad` 1 a 3 en las preguntas |
| 7 | Ids de opción, paso, par... únicos en todo el módulo | **P** | Aceptado para nodo, opción, par, receptor, elemento y paso (por actividad). **Rechazado** para capa, molécula y pregunta: llegan al mentor en `estructuraSeleccionada`, `moleculaSeleccionada` e `interaccionesRecientes` y deben seguir sin ambigüedad. El índice del mentor pasa a `actividad:id` |
| 8 | Multicapa `identificar`: una sola pista por capa | **P** | Se añade `pistas_extra` (hasta 2) en vez de sustituir `pista` (no rompe contenido ya escrito). Sin `consignas[]` |
| 9 | Tablas de 4 columnas máximo, sin encabezado de criterio y sin línea de tiempo | **P** | `columnas` sube a 6 y se añade `encabezado_criterio`. **Rechazado** el bloque `secuencia`: una superficie más; la tabla y `ordenar` cubren los casos, y los linajes con ramas son dos preguntas `ordenar` |
| 10 | En una línea se rechazan `> 99 %`, `- 5 %` y `1. Activación` | **P** | Reproducido. Los valores con signo se admiten; `1.` se sigue rechazando (en `ordenar` el orden lo da la posición) pero el mensaje dice qué hacer |
| 11 | Validación de SVG (ids autogenerados, `on*=`, width/height, viewBox, fotos) | **P** | Aceptado: solo chocan los ids **referenciados**; `on*=` se busca dentro de las etiquetas (y ya detecta `<g id="a"onclick=…>`). Rechazado: `width` y `height` no se validan (la app los sobrescribe con CSS; se corrige la guía), viewBox decimal (se ajusta en Inkscape) y fotos dentro del SVG (decisión nueva si el docente las pide) |
| 12 | Glosario y referencias sin comprobaciones cruzadas | **P** | Advertencias (`advertenciasDeModulo`, `advertenciasEntreModulos`) de términos sin enlazar y de definiciones distintas entre módulos. Rechazado el enlace `[texto](referencia:id)`: exige más render y la cita autor-año a mano basta |
| 13 | Mensajes de error sin el valor equivocado ni sugerencia | **A** | Se cita el valor (si mide hasta 40 caracteres), se propone el campo parecido (`descripción` → `descripcion`) y la guía explica cómo localizar un error de sintaxis JSON |
| 14 | Carrera: `progreso` puede llegar después de `completada` (importante) | **A** | Es un fallo real de cualquier limitador "trailing". `crearEmisorProgreso` (con prueba de control negativo), regla en el contrato, `esProgresoTardio` en la página y prueba de la batería con temporizadores simulados |
| 15 | `estadoPrevio.servidor` llega tarde y el progreso local viejo gana | **A** | Reproducido (`intentoInicial` daba 1 con servidor en 3). `intentoInicial = max(progreso, servidor + 1)`; la página no monta hasta tener el estado; el componente recalcula si cambia antes de interactuar (prueba de la batería con `setProps`) |
| 16 | Arrastre: la distancia mínima de 18 unidades es anisotrópica | **A** | Reproducido: 43 px y 23 px con "válido". Ahora se mide en píxeles a 320 px de ancho (52 px de separación, 22 px de margen), con el alto derivado del `viewBox`. Rechazado el anclaje al `<g>` del SVG de fondo (complejidad sin datos que lo pidan) |
| 17 | Arrastre: soltar en el vacío cuenta como error | **A** | Radio de captura de 56 px; soltar fuera o sobre un receptor ya acoplado no es fallo |
| 18 | Multicapa: sin convención de zonas táctiles de 44 px | **A** | Convención `data-zona-toque` y clonado transparente de los trazos, documentada en la sección 8 y en el contrato. No se puede verificar sin navegador: la comprueba F6-01 en teléfono |
| 19 | Animación: la semántica de `visibles` no está definida | **A** | Solo `<g id>` hijos directos de la raíz, sin formas sueltas; la auditoría lo comprueba (`hijosRaiz`) |
| 20 | Video: el 90 % se obtiene saltando con la barra; no se puede completar leyendo | **A** | `visto` = tiempo reproducido (`played`); botón "Ya leí la transcripción" con `detalle.via` |
| 21 | 3D: el catálogo excede F0-08 y F0-10; sin comportamiento degradado | **P** | Catálogo recortado a lo planeado y `ancla` para el resto; la lista de nodos completa siempre la actividad. Rechazado el campo `estado` por nodo y la comprobación de nodos del GLB (no hay GLB aún; queda como tarea de F0-09) |
| 22 | El validador de SVG deja pasar `on*` pegado a una comilla | **A** | Reproducido con `<g id="capa_a"onclick=…>`. Se detecta dentro de las etiquetas. Rechazado sanear con `DOMParser` en la auditoría (happy-dom no es fiable); la app elimina `on*` al inyectar |
| 23 | El mismo SVG en dos actividades duplica ids en el DOM | **P** | Aceptado el prefijo por actividad al inyectar (`{actividad.id}__`); rechazado prohibir el mismo SVG en dos actividades |
| 24 | Casos sin definir (fallos, barajado, `revisar`, IA, `completada:false`) | **A** | "Casos límite" en `activities/types.ts`; el esquema exige `rechazo` en los distractores |
| 25 | La instantánea puede superar 8 KB en el peor caso | **P** | Recomendación de guardar semilla e índices y recortar sin descartar el evento; sin cambio de código (con ids de unos 10 caracteres el revisor midió cerca de 1,5 KB frente a los 8 KB del tope) |
| 26 | El umbral de aprobación (60/70 %) no se puede expresar | **A** | `aprobacion_min` sobre la precisión y `idsSuperadas`; la precisión viaja en `detalle.precision` hasta que la API tenga el campo (sección 14, puntos 1 y 2) |
| 27 | El servidor no impide farmear puntos; certificado sin definir | **A** (API) | Ya recogido por el contrato (manifiesto con `actividad_desconocida`, `puntaje_invalido`, `modulo_incompleto` y certificado al 70 %). Queda el límite de frecuencia de los resultados (sección 14, punto 3). No es cambio de esta carpeta |
| 28 | El endpoint de lectura está incompleto y no figura en el contrato | **A** (API) | Ya está en el contrato con usuario del token y sin `detalle`. Queda `mejor_precision` y aclarar "mayor intento reportado" (sección 14, puntos 1 y 4) |
| 29 | El contexto solo lleva ids | **P** | Aceptado como nota para F3-01 y F3-04 y como convención de `identifica_capa` más `selecciona_capa`. Sin cambio en `ContextoPedagogico` (congelado) |
| 30 | Secciones sin obligatorias cuentan como completadas; `moduloDesbloqueado` difiere del menú | **A** | El esquema exige una obligatoria por sección; el comentario de `moduloDesbloqueado` aclara la diferencia |
| 31 | Orden y conciliación entre `POST` de resultados y `PUT` de módulo | **A** | Regla en la sección 11: `POST` primero y `PUT` después, reenvío al cargar y precedencia de la bandera del servidor |
| 32 | Quiz de opción múltiple y verdadero/falso dan puntos sin conocimiento | **P** | Con varias correctas, el esquema exige tantas incorrectas como correctas (marcar todo da 0). Con una correcta, una incorrecta basta; el 50 % del verdadero/falso se resuelve mezclando formatos en las evaluaciones (guía) |
