# Guía del docente

Para quien va a revisar, ajustar y poner en marcha el OVA «Metabolismo óseo: un viaje interactivo desde la célula
hasta el hueso». No hace falta saber programar para casi todo: donde se necesita un editor de texto o una terminal
se dan los pasos exactos y se dice quién puede ayudar.

**Antes de empezar, dos cosas importantes:**

1. **Todo el contenido pedagógico es un borrador nuestro.** Lo redactamos a partir del briefing porque no
   recibimos material del docente. Ningún módulo está validado: cifras, textos, preguntas, ejemplos clínicos y
   puntajes esperan su revisión. Mientras un módulo no esté aprobado, la aplicación lo dice en cada cabecera
   («Contenido en revisión»).
2. **Lo que necesitamos de usted está reunido en un solo documento:** [revision-docente.md](revision-docente.md),
   con las decisiones de diseño y cada cifra o afirmación dudosa, con su ubicación exacta y una casilla para
   responder.

Contenido de esta guía:

- [1. Los seis módulos](#1-los-seis-módulos)
- [2. Cómo navega y avanza un estudiante](#2-cómo-navega-y-avanza-un-estudiante)
- [3. El bloqueo por secuencia](#3-el-bloqueo-por-secuencia)
- [4. Recorrer el curso como docente](#4-recorrer-el-curso-como-docente)
- [5. El panel del docente](#5-el-panel-del-docente)
- [6. Revisar y aprobar el contenido](#6-revisar-y-aprobar-el-contenido)
- [7. Editar un texto o una pregunta](#7-editar-un-texto-o-una-pregunta)
- [8. Sustituir un dibujo](#8-sustituir-un-dibujo)
- [9. Agregar un video real](#9-agregar-un-video-real)
- [10. Regenerar el manifiesto y el corpus del mentor](#10-regenerar-el-manifiesto-y-el-corpus-del-mentor)
- [11. Emitir y verificar certificados](#11-emitir-y-verificar-certificados)
- [12. Qué hacer si algo no funciona](#12-qué-hacer-si-algo-no-funciona)

## 1. Los seis módulos

El OVA tiene <!--c:modulos-->6<!--/c--> módulos, <!--c:actividades-->128<!--/c--> actividades en total
(<!--c:obligatorias-->88<!--/c--> obligatorias) y <!--c:puntos-->3900<!--/c--> puntos posibles, de los cuales
<!--c:puntos_obligatorios-->2900<!--/c--> corresponden a las actividades obligatorias. La duración de cada módulo es
una **estimación por cálculo** (palabras y actividades), no una medición con estudiantes.

| N.º | Módulo | Foco (según el briefing) | Densidad | Minutos estimados | Actividades (obligatorias) | Puntos (obligatorios) |
|---|---|---|---|---|---|---|
| 1 | Conociendo el hueso | Generalidades, funciones biomecánicas y metabólicas | Media | <!--c:m1_duracion-->50<!--/c--> | <!--c:m1_actividades-->21<!--/c--> (<!--c:m1_obligatorias-->14<!--/c-->) | <!--c:m1_puntos-->530<!--/c--> (<!--c:m1_puntos_obligatorios-->370<!--/c-->) |
| 2 | Descubriendo sus células | Origen y diferenciación celular | Media | <!--c:m2_duracion-->45<!--/c--> | <!--c:m2_actividades-->18<!--/c--> (<!--c:m2_obligatorias-->11<!--/c-->) | <!--c:m2_puntos-->530<!--/c--> (<!--c:m2_puntos_obligatorios-->340<!--/c-->) |
| 3 | Construyendo hueso | Mecanotransducción y formación ósea | Alta | <!--c:m3_duracion-->75<!--/c--> | <!--c:m3_actividades-->22<!--/c--> (<!--c:m3_obligatorias-->19<!--/c-->) | <!--c:m3_puntos-->730<!--/c--> (<!--c:m3_puntos_obligatorios-->650<!--/c-->) |
| 4 | Transformando la matriz | Mineralización del tejido óseo | Alta | <!--c:m4_duracion-->88<!--/c--> | <!--c:m4_actividades-->22<!--/c--> (<!--c:m4_obligatorias-->15<!--/c-->) | <!--c:m4_puntos-->720<!--/c--> (<!--c:m4_puntos_obligatorios-->510<!--/c-->) |
| 5 | Renovando el hueso | Remodelado, reparación y equilibrio óseo | Alta | <!--c:m5_duracion-->105<!--/c--> | <!--c:m5_actividades-->29<!--/c--> (<!--c:m5_obligatorias-->20<!--/c-->) | <!--c:m5_puntos-->890<!--/c--> (<!--c:m5_puntos_obligatorios-->700<!--/c-->) |
| 6 | El paso del tiempo | Envejecimiento y cambios degenerativos | Media | <!--c:m6_duracion-->40<!--/c--> | <!--c:m6_actividades-->16<!--/c--> (<!--c:m6_obligatorias-->9<!--/c-->) | <!--c:m6_puntos-->500<!--/c--> (<!--c:m6_puntos_obligatorios-->330<!--/c-->) |

Cada módulo se divide en secciones (entre 5 y 8) con texto, tablas, dibujos interactivos y actividades, y cierra con
una evaluación final. La mandíbula es el ejemplo recurrente en los seis. Las actividades son de seis tipos:

| Tipo | Qué hace el estudiante | Cuántas hay |
|---|---|---|
| `multicapa` | Toca o identifica estructuras en un dibujo con capas | <!--c:tipo_multicapa-->30<!--/c--> |
| `arrastre-molecular` | Arrastra moléculas hasta su receptor y ve el efecto biológico | <!--c:tipo_arrastre-molecular-->8<!--/c--> |
| `relacion-columnas` | Relaciona dos columnas (por ejemplo, célula y función) | <!--c:tipo_relacion-columnas-->16<!--/c--> |
| `quiz` | Responde preguntas (opción múltiple, verdadero o falso, ordenar) con explicación inmediata | <!--c:tipo_quiz-->43<!--/c--> |
| `video-texto` | Sigue una explicación animada paso a paso junto a un texto | <!--c:tipo_video-texto-->9<!--/c--> |
| `exploracion-3d` | Gira la mandíbula en 3D (o una escena del remodelado) y consulta sus partes | <!--c:tipo_exploracion-3d-->22<!--/c--> |

El contenido de cada módulo vive en **un solo archivo** (`apps/web/src/modules/m{n}_{nombre}/content.json`), no en el
código de la aplicación: es lo que se edita para cambiar un texto, una pregunta o un puntaje (parte 7).

## 2. Cómo navega y avanza un estudiante

1. **Acceso.** Escribe tipo y número de documento. Si ya está registrado, entra; si no, la pantalla le pide nombre y
   apellido y lo registra. No hay contraseña (es una decisión del piloto que hay que revisar antes de abrirlo al
   público: decisión D05 de la lista de revisión).
2. **Inicio.** Ve los seis módulos como tarjetas, con su estado (bloqueado, en curso, completado) y cuántos lleva.
3. **Módulo.** Cada módulo tiene una cabecera, un índice de secciones, y en cada sección texto, dibujos y
   actividades. Un glosario se abre desde los términos subrayados. Hay un botón para abrir el **mentor de IA** y un
   **menú circular** para saltar entre módulos.
4. **Actividades.** Las obligatorias hay que completarlas para avanzar; las opcionales suman puntos pero no
   bloquean. Cada actividad da retroalimentación inmediata y puntúa (la [guía del estudiante](guia-estudiante.md)
   explica la fórmula).
5. **Fin del módulo.** Cuando se completan todas las obligatorias aparece un aviso y el logro del módulo. Al
   completar los seis y llegar al 70 % del puntaje de las obligatorias, se puede emitir el certificado.

El progreso, los puntajes y el tiempo se guardan en el servidor, así que el estudiante puede seguir en otro
dispositivo entrando con el mismo documento.

## 3. El bloqueo por secuencia

**Qué es.** El briefing pide que el estudiante *actúe* para avanzar. Por eso, por defecto:

- el módulo *n* solo se abre cuando el módulo *n−1* está completado, y
- dentro de un módulo, una sección se abre cuando se completaron las actividades obligatorias de la anterior.

Lo bloqueado se explica en pantalla (no simplemente rebota). Un módulo o sección ya completado nunca se vuelve a
cerrar. «Superar» una actividad exige terminarla y, si tiene un acierto mínimo (`aprobacion_min`, por ejemplo la
evaluación final), alcanzarlo repitiendo (decisión D02 de la lista de revisión).

**Importante:** el bloqueo lo aplica la **interfaz**, no el servidor. El servidor sí comprueba que un módulo no se
marque como completo si faltan actividades obligatorias.

**Cómo desactivarlo.** Hay tres caminos, del más sencillo al más técnico:

1. **Use una cuenta de docente** (parte 4). No tiene bloqueos, ve los seis módulos abiertos y no guarda nada. Es lo
   recomendado para revisar.
2. **Para una demostración local** con estudiantes de prueba: arrancar la interfaz con la variable
   `VITE_BLOQUEO_SECUENCIAL=false` (en PowerShell: `$env:VITE_BLOQUEO_SECUENCIAL="false"; pnpm dev:web`). Todo queda
   abierto y el progreso **sí** se guarda con normalidad.
3. **Para el sitio publicado**: la variable se fija al compilar la interfaz (los estudiantes no pueden cambiarla). El
   `Dockerfile` actual **no** la recibe: habría que añadirle `ARG VITE_BLOQUEO_SECUENCIAL` y `ENV
   VITE_BLOQUEO_SECUENCIAL=$VITE_BLOQUEO_SECUENCIAL` antes de la línea que compila, y reconstruir la imagen. Es un
   cambio para un desarrollador. Se recomienda mantener el bloqueo en el sitio de los estudiantes.

## 4. Recorrer el curso como docente

Para leer los seis módulos completos sin ser bloqueado y **sin ensuciar las estadísticas** de la cohorte, el docente
usa una cuenta con el rol `docente`:

1. Se registra como cualquier estudiante.
2. Quien administra el sistema le asigna el rol con un comando (parte 5 de la [guía de instalación](guia-instalacion.md#5-primer-usuario-docente)).
3. Al volver a entrar ve la nota «Vista de docente» en el inicio y un enlace **Panel docente** en la cabecera.

En esta vista:

- todos los módulos y secciones están abiertos;
- **no se registra** avance, puntaje ni tiempo, y las actividades se abren en modo de **revisión** (solo lectura):
  muestran las **respuestas correctas** en lugar de pedir que se resuelvan;
- por eso un docente **no puede obtener un certificado** con esa cuenta. Para probar la experiencia completa del
  estudiante hay que registrar una **segunda cuenta** de prueba.

Los estudiantes de prueba aparecen en el panel como cualquier otro estudiante (el panel cuenta solo a quienes tienen
rol estudiante), así que conviene identificarlos con un nombre claro («Prueba 1») para restarlos.

### El contenido «para profundizar» (nivel posgrado)

Hay <!--c:bloques_posgrado-->17<!--/c--> bloques marcados **solo para posgrado** (plegables de profundización en los
módulos 2, 5 y 6, fuera de la evaluación). La aplicación los muestra únicamente a un usuario cuyo **nivel** sea
`posgrado`; todos se registran como `pregrado`. **Hoy la interfaz no tiene ninguna pantalla para cambiar el nivel**,
así que esos bloques no los ve nadie (ni siquiera el docente en su cuenta). Es una carencia conocida. Mientras se
construye esa pantalla, quien administra el sistema puede cambiar el nivel de una cuenta con la API (PowerShell; se
sustituye el documento por el de esa cuenta y `localhost:8000` por la dirección del sitio):

```powershell
$r = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/auth/login -ContentType application/json -Body '{"tipo_identificacion":"CC","numero_identificacion":"1023456789"}'
Invoke-RestMethod -Method Patch -Uri http://localhost:8000/api/me -ContentType application/json -Headers @{Authorization="Bearer $($r.access_token)"} -Body '{"nivel":"posgrado"}'
```

El mentor también ajusta su profundidad al nivel (explica con más mecanismos moleculares a un usuario de posgrado).
Recargar la página después del cambio. Para volver: `'{"nivel":"pregrado"}'`.

## 5. El panel del docente

Se abre desde el enlace «Panel docente» de la cabecera (`/docente`). Solo el rol docente ve datos: un estudiante que
escriba esa dirección ve «Acceso solo para docentes» y el servidor responde 403. Tiene cinco pestañas:

| Pestaña | Qué muestra |
|---|---|
| **Resumen** | Cuántos estudiantes hay, cuántos estuvieron activos en los últimos 7 y 30 días, puntaje promedio y mediana, cuántos llevan 0, 1, ... 6 módulos completados y el tiempo promedio por módulo |
| **Estudiantes** | Lista con búsqueda por nombre o por número de documento exacto y orden; al abrir uno se ve su progreso por módulo, sus resultados por actividad y su uso del mentor |
| **Actividades** | Por actividad y por módulo: cuántos la completaron, intentos y puntaje promedio; resalta las más difíciles, con filtro por módulo |
| **Mentor** | Consultas por día, tokens y **costo estimado** por día y modelo, y quiénes lo usan más |
| **Exportar** | Descarga un archivo CSV (se abre en Excel) con una fila por estudiante y por módulo |

Todos los gráficos tienen una tabla equivalente para lectores de pantalla.

**Exportar el CSV.** Las columnas son: id, nombre, apellido, tipo y número de identificación, nivel, módulo, completado
(sí/no), sección actual, tiempo total en segundos, puntaje del módulo, actividades completadas, última actualización
y puntaje total. Va en UTF-8 con marca de orden de bytes para que Excel muestre bien las tildes. Las celdas que
empiezan por `=`, `+`, `-` o `@` se prefijan con una comilla para que Excel no las ejecute como fórmulas.

**Privacidad de la identificación.** El número de documento es un dato personal:

- en la lista y en el detalle se muestra **enmascarado**: solo los últimos 3 caracteres (`*******789`);
- se ve completo únicamente si se busca **ese número exacto** (no se puede buscar por fragmentos para reconstruirlo);
- el CSV sale enmascarado; la identificación completa solo se descarga si el docente confirma expresamente esa opción;
- el certificado público también la enmascara.

Antes de exportar la identificación completa conviene comprobar con la institución qué exige la normativa de
protección de datos personales aplicable (decisión D19 de la lista de revisión).

**El costo del mentor es una estimación**, calculada con los precios configurados en el servidor
(`PRECIO_ENTRADA_USD_POR_MTOK` y `PRECIO_SALIDA_USD_POR_MTOK`); la factura real la emite Anthropic. Se debe verificar
la tarifa vigente antes de presupuestar.

## 6. Revisar y aprobar el contenido

### El flujo

1. Recibe los documentos: esta guía, los guiones (`docs/guion-por-modulo/`, un archivo por módulo con todo el texto,
   las preguntas y las notas de verificación) y la [lista de revisión](revision-docente.md).
2. Recorre los módulos como docente (parte 4) y responde la lista de revisión: por cada fila, *confirmado*,
   *corregir a...* o *retirar*, más las decisiones de diseño.
3. Quien mantiene el sistema aplica las correcciones (parte 7), vuelve a generar la lista y registra el ciclo en
   [revisiones.md](revisiones.md): fecha, versión, qué se cambió y quién aprobó.
4. Cuando el docente da su visto bueno a un módulo, se cambia su **estado de revisión**.

### Los tres estados

Cada `content.json` trae un bloque `estado_revision`:

| Estado | Significado | Qué ve el estudiante |
|---|---|---|
| `borrador` | Texto nuestro, sin validar (el estado de hoy en los seis módulos) | La nota «Contenido en revisión» en la cabecera del módulo, y una marca «no verificada» en cada referencia bibliográfica sin verificar |
| `revisado_docente` | El docente lo revisó y pidió cambios o lo aprobó en parte | Igual que `borrador` |
| `aprobado` | Aprobación explícita del docente | Desaparece la nota de la cabecera |

El estado no bloquea nada: solo informa.

### Cómo cambiar el estado

Se edita el bloque `estado_revision` del `content.json` del módulo (con un editor de texto; ver parte 7 para las
reglas del formato). Para `revisado_docente` o `aprobado` son **obligatorios** `revisado_por`, `fecha` (AAAA-MM-DD) y
`version`:

```json
"estado_revision": {
  "estado": "aprobado",
  "revisado_por": "Nombre del docente",
  "fecha": "2026-10-05",
  "version": "1.0",
  "notas": "Aprobado con las correcciones del ciclo 1.",
  "pendientes": []
}
```

- `pendientes` es la lista de cifras por confirmar. Al resolver una, se **quita** su línea (`id` y `nota`). Si un
  bloque se borra, hay que quitar también sus pendientes: el validador comprueba que cada `id` exista.
- Para marcar una referencia como comprobada, en la lista `referencias` del mismo archivo se pone
  `"verificada": true`.
- La nota «Contenido en revisión» se oculta por módulo al pasar a `aprobado`. Para ocultarla en todos a la vez existe
  la constante `MOSTRAR_NOTA_REVISION` (`apps/web/src/config.ts`).

> **Aviso para quien mantiene el código:** las pruebas de cada módulo (`contenido.test.ts`) fijan hoy el estado
> `borrador` y que las referencias sigan `verificada: false`. Al aprobar un módulo o marcar una referencia como
> verificada hay que actualizar esa comprobación, o la prueba fallará (no es un defecto del contenido).

## 7. Editar un texto o una pregunta

Hay dos caminos:

- **Recomendado:** anotar el cambio en la lista de revisión («corregir a...») y dejar que quien mantiene el sistema
  lo aplique y lo valide.
- **Directo:** editar el `content.json` con un editor de texto (Visual Studio Code es el más cómodo: marca los errores
  de formato). Los pasos:

### Paso a paso

1. **Abrir** `apps/web/src/modules/m{n}_{nombre}/content.json` del módulo. Se busca el texto con la búsqueda del
   editor (`Ctrl+F`); la [lista de revisión](revision-docente.md) da el `id` de cada bloque para encontrarlo.
2. **Cambiar el texto sin tocar el formato.** Todo texto va entre comillas dobles. Si el texto lleva comillas dobles
   se escriben `\"`; un salto de línea se escribe `\n`. Se permite Markdown sencillo: `**negrita**`, `*cursiva*`,
   listas con `- ` y enlaces al glosario `[término](glosario:id_del_termino)`. No se pueden dejar comas de más ni
   de menos entre elementos.
3. **Respetar los límites de longitud** (tabla en la sección 4 de [content-schema.md](content-schema.md)): por
   ejemplo, una explicación de quiz admite 600 caracteres y las instrucciones de una actividad, 400.
4. **Una pregunta** de tipo quiz tiene: `enunciado`, sus `opciones` (cada una con `id` y `texto`), las `correctas` (ids
   de las opciones correctas) y la `explicacion` que se muestra tras responder. Si se agrega o quita una opción, hay
   que cuidar que los ids de `correctas` sigan existiendo. Con varias correctas debe haber tantas incorrectas como
   correctas.
5. **Un puntaje** (`puntaje_max`) o si una actividad es obligatoria (`obligatoria`) cambia lo que vale el módulo.
   Después de cambiarlo hay que regenerar el manifiesto (parte 10).
6. **Validar el módulo.** Desde la raíz del proyecto:

   ```powershell
   pnpm --filter @ova/web exec node scripts/validar-modulo.mjs 3
   ```

   (con el número del módulo). Debe terminar en «Todo en orden»; si no, cada error sale en una línea con su ruta y el
   `id` del elemento. El código de salida es 0 si todo está bien, 1 si hay errores de contenido y 2 si solo faltan
   dibujos.
7. **Actualizar lo derivado:** el corpus del mentor y la lista de revisión.

   ```powershell
   cd services\api
   python -m uv run python -m app.scripts.build_corpus
   cd ..\..
   python tools/guiones/pendientes.py
   ```

8. **Ejecutar las pruebas** de la interfaz (`pnpm --filter @ova/web test`) y anotar el cambio en
   [revisiones.md](revisiones.md).

### El guion y el convertidor: la regla de no sobrescribir

Cada módulo nació de un **guion** (`docs/guion-por-modulo/m{n}_*.md`) que una herramienta
(`tools/guiones/convertir.py`) convirtió en `content.json`. Después cada módulo se **terminó a mano** en el JSON:
enlaces al glosario, figuras rotuladas, posiciones de los receptores del arrastre, ajustes de texto. Por eso:

- **Hoy el `content.json` es la fuente de verdad** de lo que ve el estudiante, no el guion.
- El convertidor **se niega a sobrescribir** un `content.json` que difiera de lo que generaría el guion: imprime
  `NO SE ESCRIBIÓ` y sale con código 3. Es una protección deliberada.
- `python tools/guiones/convertir.py todos --comprobar` (con PyYAML, ver el README de esa carpeta) no escribe nada y
  dice qué módulos difieren de su guion. **Hoy los seis difieren** y es lo esperado.
- `--forzar` sobrescribe igualmente y **pierde todo el trabajo hecho a mano**. No se debe usar salvo que se decida
  rehacer un módulo desde su guion y repetir el pulido.
- Las pruebas de cada módulo (`contenido.test.ts`) comparan el JSON con su guion y fijan lo que se acordó al
  construirlo: identificadores, orden, tipos, obligatoriedad y **puntajes** de las actividades, el total de puntos,
  cuántas actividades hay de cada tipo, las cantidades de capas, pares, pasos y nodos, las respuestas correctas y las
  **explicaciones** de las preguntas, y (en el módulo 1) el acierto mínimo de la evaluación final. Los textos corridos
  de las secciones no se comparan palabra por palabra: solo se revisa que no queden marcas `[verificar]`, direcciones
  externas ni encabezados del guion. Esas pruebas protegen el contenido de cambios accidentales, así que **un cambio
  intencional en algo de lo anterior exige reflejarlo en el guion o actualizar la prueba** (tarea de quien mantiene el
  código). Agregar o quitar una actividad, por ejemplo, cambia los totales que la prueba espera.

## 8. Sustituir un dibujo

Los dibujos interactivos (capas que se tocan, escenas de arrastre, animaciones paso a paso) son archivos **SVG** en
`apps/web/public/images/m{n}/`. Un dibujo se puede rehacer en Inkscape o Illustrator y sustituir sin tocar el código,
siempre que se respeten sus **capas**.

1. **Encontrar el archivo:** el nombre lo da el `svg` de la actividad en el `content.json` (por ejemplo,
   `/images/m3/m3_sensores_mecanicos.svg`). Se conserva el mismo nombre.
2. **Conservar las capas.** Cada estructura que se toca es un grupo `<g id="...">` y su `id` es exactamente el `id` de
   la capa en el JSON (en Inkscape: clic derecho, «Propiedades del objeto», campo «Id»). Sin la capa el dibujo se
   ve, pero esa estructura no responde.
3. **Reglas del archivo:**
   - empieza por `<svg ... viewBox="0 0 ANCHO ALTO">` con números enteros y el **mismo `viewBox`** que el JSON
     (si cambia el tamaño, se corrige el `viewBox` del JSON);
   - pesa menos de 200 KB y es solo vectorial: sin fotos, `<script>`, `<foreignObject>`, `<style>`, animaciones ni
     enlaces externos;
   - para móvil, las capas pequeñas o de línea fina llevan una zona táctil transparente mayor (44 px en pantalla);
     no se dependa solo del color para distinguir las capas.
   El detalle completo está en la sección 8 de [content-schema.md](content-schema.md).
4. **Validar:** `pnpm --filter @ova/web exec node scripts/validar-modulo.mjs 3` comprueba que el archivo exista,
   que estén todas sus capas y que cumpla las reglas de seguridad. Además, la prueba `ilustraciones.test.ts` de cada
   módulo revisa sus dibujos.
5. **Publicar:** en desarrollo basta con recargar la página. En Docker hay que reconstruir la imagen `web`
   (`docker compose up --build -d`), porque los dibujos viajan dentro de ella.

Una **fotografía** (una microfotografía histológica del docente, por ejemplo) no se puede meter dentro de un SVG: va
en un bloque de tipo `imagen` (webp o jpg) sin zonas tocables. Si se necesita una foto con zonas activas, es una
decisión de diseño nueva.

## 9. Agregar un video real

Hoy **no hay ningún video real** (<!--c:videos_reales-->0<!--/c-->): las explicaciones son animaciones paso a paso con
transcripción. Si el docente entrega videos, se agregan sin tocar el código:

1. **Colocar los archivos** en `apps/web/public/videos/m{n}/` (la carpeta no existe todavía: se crea):
   - el video en `.mp4` o `.webm` (`introduccion_hueso.mp4`);
   - los **subtítulos** en formato `.vtt` (de 1 a 3 pistas, en español o inglés). Sin ellos no se acepta el video: es
     un requisito de accesibilidad;
   - opcionalmente una imagen de portada.
2. **Editar la actividad** de tipo `video-texto` en el `content.json`. Se recomienda **agregar una actividad nueva y
   opcional** en lugar de reemplazar la animación, para conservarla. Un ejemplo completo está en la sección 7.5 de
   [content-schema.md](content-schema.md); lo esencial de `config`:

   ```json
   "config": {
     "medio": "video",
     "src": "/videos/m1/introduccion_hueso.mp4",
     "poster": "/images/m1/m1_hueso_capas.svg",
     "duracion_seg": 120,
     "subtitulos": [{ "idioma": "es", "etiqueta": "Español", "src": "/videos/m1/introduccion_hueso.es.vtt" }],
     "transcripcion": "Texto completo de lo que se dice en el video (de 50 a 6000 caracteres).",
     "hitos": [{ "t_seg": 0, "titulo": "Introducción" }]
   }
   ```

3. **Cómo se completa:** al ver el 90 % del video, medido como tiempo **realmente reproducido** (saltar con la barra no
   suma). Quien no pueda verlo (sin datos móviles, por accesibilidad) lee la transcripción y pulsa «Ya leí la
   transcripción». No hay autoplay y el video se descarga solo al pulsar reproducir.
4. **Validar y regenerar:** el validador del módulo (parte 7) y, si es una actividad nueva, el manifiesto y el corpus
   (parte 10).
5. **Pesos:** los videos largos pesan mucho en móvil. Conviene comprimirlos (H.264, 720p o menos). Los videos viajan
   en la imagen `web` de Docker: si son muchos, conviene servirlos aparte (decisión de despliegue).
6. **Videos incrustados de YouTube o Vimeo:** la política de seguridad de `apps/web/nginx.conf` los bloquea a propósito;
   habría que autorizar el origen (`media-src`/`frame-src`). El diseño actual prevé archivos propios.

## 10. Regenerar el manifiesto y el corpus del mentor

Son dos archivos derivados que hay que **volver a generar cada vez que cambie el contenido**:

| Archivo | Se regenera si... | Comando (desde `services\api`) |
|---|---|---|
| Manifiesto de actividades (`actividades_manifest.json`) | cambia el id, el tipo, el puntaje máximo o el carácter obligatorio de una actividad, o se agrega o quita una | `python -m uv run python -m app.scripts.build_manifest` |
| Corpus del mentor (`corpus.jsonl`) | cambia cualquier texto, objetivo o glosario de un módulo, o el banco de preguntas o los ganchos de un guion | `python -m uv run python -m app.scripts.build_corpus` |

Con `--comprobar` (los dos comandos lo aceptan) solo se verifica si están al día. Sin regenerar el corpus, el
**mentor responde con el texto viejo**; sin regenerar el manifiesto, el servidor puede **rechazar los resultados** de
una actividad nueva. Más detalle en la [guía de instalación](guia-instalacion.md#10-regenerar-el-manifiesto-y-el-corpus-del-mentor).

Nota sobre lo que el mentor **no** ve: los enunciados, opciones y respuestas de las actividades calificadas no entran
al corpus a propósito, para que no pueda filtrar las respuestas.

## 11. Emitir y verificar certificados

### Qué exige el certificado

Se puede emitir cuando el estudiante:

1. completó los **seis módulos** (todas las actividades obligatorias superadas), y
2. alcanzó al menos el <!--c:cert_min-->70<!--/c--> % del puntaje máximo de las actividades **obligatorias**
   (<!--c:puntos_obligatorios-->2900<!--/c--> puntos, es decir, <!--c:puntos_umbral-->2 030<!--/c--> puntos o más). Las opcionales no cuentan para el
   porcentaje: una opcional no compensa una obligatoria mal resuelta.

Con la penalización por intento actual, el 70 % equivale a acertar todo en el 4.º intento de cada actividad: quien
necesite más intentos por actividad no llega. Es una propuesta nuestra pendiente de su decisión (D01).

### Cómo lo obtiene el estudiante

Desde el enlace de la pantalla de inicio o `/certificado`. Si no cumple, la pantalla muestra qué módulos faltan, una
barra de puntaje frente al umbral y los puntos que faltan. Si cumple, pulsa «Obtener mi certificado» y luego puede
**descargar el PDF**, copiar o compartir el enlace de verificación.

- Es **un certificado por persona**. Pedirlo otra vez devuelve el mismo, y un certificado ya emitido **no se revoca**
  aunque después cambie el contenido (no hay pantalla para anularlo).
- El PDF es A4 apaisado con el nombre completo, los seis módulos, el puntaje, la fecha (hora de Colombia), un
  **código de verificación** (`OVA-XXXX-XXXX`), un código QR y la dirección de verificación. Guarda una instantánea de
  nombre y documento: no cambia si después se edita el perfil. La dirección impresa sale de la variable
  `PUBLIC_BASE_URL`: si está mal configurada, los certificados apuntarán a un sitio que no existe.

### Cómo se verifica

Cualquier persona, **sin iniciar sesión**, abre la dirección del certificado (`https://<sitio>/verify/<código>`) o
escanea el QR. La página confirma si es válido y muestra nombre, apellido, tipo de documento, **documento enmascarado**,
fecha y puntaje. Un código que no existe muestra siempre el mismo mensaje neutro, y hay un límite de 20 consultas por
minuto por dirección para evitar que se adivinen códigos.

Para el docente: pegar el código en `/verify` (el formulario de esa página) es la forma de comprobar un certificado
que un estudiante presenta. Si el código no existe, el certificado no fue emitido por este sistema.

> **Limitación conocida:** el flujo del certificado (elegibilidad, emisión, PDF y verificación) se probó de extremo a
> extremo con la API y en pruebas automáticas, pero **nadie lo ha visto en un navegador con un estudiante real** ni
> impreso el PDF.

## 12. Qué hacer si algo no funciona

| Situación | Qué hacer |
|---|---|
| Un estudiante no puede entrar | Comprobar que escribe el mismo tipo y número con los que se registró (los puntos y guiones se ignoran). No hay recuperación de contraseña porque no hay contraseña |
| Un estudiante dice que un módulo está bloqueado | Es el bloqueo por secuencia (parte 3): tiene que completar el módulo anterior |
| El mentor no responde | Falta la clave de Anthropic o se agotó el tope diario de mensajes (60 por estudiante y por día). Ver la [guía de instalación](guia-instalacion.md#4-el-mentor-de-ia) |
| El mentor dijo algo incorrecto | Puede pasar: es un modelo de lenguaje. Anotarlo con la pregunta exacta; el aviso «Respuestas generadas por IA. Verifica con el material del curso.» está siempre visible |
| Un dibujo no responde al toque | Falta una capa (`id`) en el SVG: correr el validador del módulo (parte 7) |
| Se editó un `content.json` y la página quedó en blanco | Error de formato JSON (una coma o comilla): deshacer el cambio y usar el validador (`validar-modulo.mjs`), que dice la línea |
| Otro problema técnico | Ver «Problemas frecuentes» en la [guía de instalación](guia-instalacion.md#11-problemas-frecuentes) |
