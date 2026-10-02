# Contrato de la API (Fase 1)

Fuente de verdad entre `apps/web` y `services/api` (FastAPI). Cualquier cambio exige actualizar
backend, frontend y este documento a la vez. Ver también PLAN.md §3 (`ContextoPedagogico`).

## Convenciones

- Prefijo `/api`. En desarrollo Vite proxifica `/api` a `http://localhost:8000`; en Docker, nginx
  proxifica al servicio `api`. Siempre mismo origen desde el navegador.
- JSON en `snake_case`. Única excepción: el objeto `contexto` de `/api/chat`, que va en `camelCase`
  porque es el tipo TypeScript de PLAN §3.
- Fechas ISO 8601 en UTC con sufijo `Z`.
- Auth: `Authorization: Bearer <jwt>` (HS256, expira según `ACCESS_TOKEN_EXPIRE_MINUTES`).
- Errores propios: `{"detail": {"code": "<slug>", "message": "<texto en español>"}}`.
  Los 422 de validación de FastAPI conservan su formato por defecto (`detail` es una lista).
- Textos visibles al estudiante, en español.

### Códigos de error

| HTTP | code | Cuándo |
|---|---|---|
| 401 | `token_invalido` | Falta el token, expiró o no verifica |
| 404 | `usuario_no_encontrado` | `login` con una identificación que no existe |
| 409 | `usuario_existente` | `register` con una identificación ya registrada |
| 404 | `certificado_no_emitido` | `GET /api/certificate/pdf` sin haber emitido el certificado |
| 404 | `certificado_no_encontrado` | `GET /api/verify/{codigo}` con un código inexistente o mal formado (público, sin más datos) |
| 409 | `modulo_incompleto` | `PUT /api/progress/{modulo}` con `completado: true` y actividades obligatorias sin completar (solo con manifiesto). Trae `faltantes`: lista de ids |
| 409 | `certificado_no_elegible` | `POST /api/certificate` sin cumplir los requisitos. Trae `motivos`: lista de textos |
| 422 | `actividad_desconocida` | `POST /api/activities/{id}/result` con un id que no existe o cuyo `modulo` o `tipo` no coinciden con el contenido (solo con manifiesto) |
| 422 | `puntaje_invalido` | Resultado con `puntaje` mayor que el `puntaje_max` de la actividad (solo con manifiesto). Trae `puntaje_max` |
| 429 | `demasiados_intentos` | Límite de intentos por IP o por usuario |
| 429 | `limite_diario` | `POST /api/chat`: el estudiante agotó `MENTOR_MAX_MENSAJES_DIA` mensajes hoy. Trae `Retry-After` |
| 404 | `sesion_no_encontrada` | `POST /api/chat` con `session_id`, `GET /api/chat/history` o `DELETE /api/chat/session` de una conversación inexistente o ajena |
| 404 | `mensaje_no_encontrado` | `POST /api/chat/feedback` con un mensaje inexistente, ajeno o que no es del mentor |
| 503 | `ia_no_configurada` | `/api/chat` sin `ANTHROPIC_API_KEY` |

## Identificación

Supuesto a confirmar con el docente: contexto colombiano. La lista vive en **un solo lugar por lado**
(`app/models/enums.py` y `apps/web/src/lib/identificacion.ts`) para cambiarla fácil.

| Código | Etiqueta |
|---|---|
| `CC` | Cédula de ciudadanía |
| `TI` | Tarjeta de identidad |
| `CE` | Cédula de extranjería |
| `PA` | Pasaporte |
| `RC` | Registro civil |
| `PEP` | Permiso especial de permanencia |
| `PPT` | Permiso por protección temporal |

- `numero_identificacion` se normaliza en el servidor: quitar espacios, puntos y guiones, pasar a
  mayúsculas. Debe cumplir `^[A-Z0-9]{4,20}$` tras normalizar. El frontend aplica la misma regla.
- La unicidad es sobre el par `(tipo_identificacion, numero_identificacion)`.
- `nombre` y `apellido`: recortar, colapsar espacios internos, de 1 a 80 caracteres, sin caracteres de
  control. Se permiten acentos, ñ, apóstrofes y guiones. Se guardan tal cual se escribieron.

## Usuario

```json
{
  "id": 1,
  "nombre": "Ana",
  "apellido": "Pérez",
  "tipo_identificacion": "CC",
  "numero_identificacion": "1023456789",
  "nivel": "pregrado",
  "rol": "estudiante",
  "created_at": "2026-09-23T20:00:00Z"
}
```

`nivel`: `pregrado` (por defecto) o `posgrado`. `rol`: `estudiante` (por defecto) o `docente`.
El rol `docente` no se puede autoasignar; se promueve por script de línea de comandos.

## Endpoints

### Salud
`GET /api/health` → `200 {"status": "ok", "env": "dev", "version": "0.1.0"}`. Sin auth.

### Auth (sin contraseña en esta etapa; riesgo aceptado en PLAN §1)

`POST /api/auth/register`
```json
{ "nombre": "Ana", "apellido": "Pérez", "tipo_identificacion": "CC", "numero_identificacion": "1.023.456-789" }
```
→ `201 TokenResponse`. `409 usuario_existente` si el par ya existe.

`POST /api/auth/login`
```json
{ "tipo_identificacion": "CC", "numero_identificacion": "1023456789" }
```
→ `200 TokenResponse`. `404 usuario_no_encontrado` si no existe. La SPA responde a ese 404 pidiendo
nombre y apellido y llamando a `register` (pantalla única, F1-14).

`TokenResponse`:
```json
{ "access_token": "<jwt>", "token_type": "bearer", "expires_in": 604800, "user": { } }
```

Límite: 10 intentos por minuto y por IP entre `register` y `login` (en memoria). Excedido → `429`.

`GET /api/me` → `200 User`.
`PATCH /api/me` con `{"nivel": "posgrado"}` → `200 User`.

### Progreso (F1-06)

`ModuloProgress`:
```json
{ "modulo": 3, "seccion_actual": "mecanotransduccion", "completado": false, "tiempo_total_seg": 320, "updated_at": "2026-09-23T20:00:00Z" }
```
`seccion_actual` y `updated_at` son `null` mientras el módulo no tenga fila (valores por defecto).

`GET /api/progress` →
```json
{ "modulos": [ /* siempre 6 ModuloProgress, modulos 1..6, con valores por defecto si no hay fila */ ],
  "puntaje_total": 120,
  "logros": ["primer_hueso"] }
```

`PUT /api/progress/{modulo}` (`modulo` entre 1 y 6, si no `422`)
```json
{ "seccion_actual": "osteoblastos", "tiempo_delta_seg": 45, "completado": true }
```
Todos los campos son opcionales. `seccion_actual` hasta 64 caracteres. `tiempo_delta_seg` entre 0 y
3600 y se **suma** a `tiempo_total_seg`. `completado` solo pasa de `false` a `true`; enviar `false`
sobre un módulo completado no lo revierte. → `200 {"modulo": ModuloProgress, "logros_nuevos": ["primer_hueso"]}`.
El backend no exige orden entre módulos en Fase 1; el bloqueo por secuencia es del frontend (F2-08).

**Validación contra el contenido** (solo si la API tiene el manifiesto de actividades, ver "Validación
contra el contenido" más abajo): `completado: true` sobre un módulo que aún no estaba completado exige
un resultado con `completada = true` en TODAS las actividades **obligatorias** del módulo. Si falta
alguna → `409 modulo_incompleto` con `{"detail": {"code": "modulo_incompleto", "message": "...",
"faltantes": ["m1_quiz_repaso"]}}` y **no se aplica ningún cambio** de la petición (tampoco el tiempo). Un
módulo ya completado no se vuelve a comprobar. Un módulo que el manifiesto no contiene también da
`modulo_incompleto` (con `faltantes: []`). Sin manifiesto, el comportamiento es el de arriba.

### Actividades y puntaje (F1-06)

`POST /api/activities/{activity_id}/result`

`activity_id`: `^[a-z0-9_-]{1,64}$`, por ejemplo `m1_capas_hueso`.
```json
{ "modulo": 1,
  "tipo": "multicapa",
  "puntaje": 80,
  "intentos": 2,
  "completada": true,
  "detalle": { } }
```
`tipo` ∈ `multicapa`, `arrastre-molecular`, `relacion-columnas`, `quiz`, `video-texto`, `exploracion-3d`.
`puntaje` 0..1000, `intentos` 1..100, `detalle` opcional (objeto, hasta 4 KB serializado).
→ `200`:
```json
{ "resultado": { "activity_id": "m1_capas_hueso", "modulo": 1, "tipo": "multicapa", "puntaje": 80, "intentos": 2, "completada": true, "created_at": "..." },
  "puntaje_total": 200,
  "logros_nuevos": [] }
```
Cada llamada guarda una fila (historial). **Regla de puntaje:** `puntaje_total` es la suma, por
`activity_id`, del **mejor** `puntaje` entre las filas con `completada = true`. Repetir una actividad
no permite acumular puntos. El puntaje lo reporta el cliente: sin manifiesto de actividades nada lo
verifica (Fase 1); con manifiesto se valida como se explica abajo.

**Con manifiesto** (validación contra el contenido, antes de guardar nada):
- `422 actividad_desconocida` si `{activity_id}` no existe en el contenido o si `modulo` o `tipo`
  del cuerpo no coinciden con los de esa actividad.
- `422 puntaje_invalido` (con `puntaje_max` en el `detail`) si `puntaje` supera el `puntaje_max` de la
  actividad. Un `puntaje` fuera de 0..1000 sigue dando el 422 estándar de validación (`detail` es lista).
- Un intento rechazado no deja fila ni puntúa.

`GET /api/activities/results` (auth) — origen de `EstadoPrevioActividad.servidor` en la SPA.
`?modulo=1..6` opcional filtra por módulo (fuera de rango → `422` estándar). → `200`:
```json
{ "resultados": [
    { "activity_id": "m1_capas_hueso", "modulo": 1, "tipo": "multicapa",
      "mejor_puntaje": 27, "intentos": 2, "completada": true,
      "ultimo_intento_en": "2026-09-23T20:10:00Z" } ] }
```
Una fila por `activity_id` con resultados **del usuario autenticado** (nunca de otros), ordenadas por
`modulo` y `activity_id`. `mejor_puntaje` es el mayor `puntaje` entre los intentos con
`completada = true` (0 si ninguno); `intentos`, el mayor reportado; `completada`, si algún intento
lo está; `ultimo_intento_en`, el instante del último intento; `modulo` y `tipo`, los del último
intento. Sin `detalle`. Sin resultados → `{"resultados": []}`. La suma de `mejor_puntaje` es el
`puntaje_total` de `GET /api/progress`.

### Validación contra el contenido (manifiesto de actividades)

El servidor conoce las actividades del OVA por un **manifiesto** generado a partir de los
`apps/web/src/modules/m{n}_{slug}/content.json`:

```bash
cd services/api
uv run python -m app.scripts.build_manifest              # escribe app/data/actividades_manifest.json
uv run python -m app.scripts.build_manifest --comprobar  # CI: falla si el archivo no está al día
```

El manifiesto (`{"version": 1, "actividades": {id: {modulo, tipo, puntaje_max, obligatoria, seccion}},
"modulos": {...totales por módulo}, "totales": {...}}`) se **versiona** y viaja en la imagen de la API;
hay que regenerarlo cuando cambie una actividad (id, tipo, `puntaje_max`, `obligatoria`) o su módulo.
La API lo carga al arrancar desde `ACTIVITIES_MANIFEST_PATH` (por defecto
`services/api/app/data/actividades_manifest.json`):

| Situación | Comportamiento |
|---|---|
| Existe el archivo por defecto | Se valida contra el contenido (resultados, progreso y certificado) |
| No existe el archivo por defecto | Sin validación: comportamiento de Fase 1 (desarrollo, antes de que haya contenido) |
| `ACTIVITIES_MANIFEST_PATH=` (vacía) | Sin validación |
| Ruta explícita que no existe, o archivo inválido | La API **no arranca** (un error de configuración no debe dejar la validación apagada en silencio) |

Un manifiesto parcial (faltan módulos) es válido pero rechaza las actividades de los módulos ausentes y
no deja completarlos; el script avisa de ello.

### Logros (F1-06)

`GET /api/achievements` →
```json
{ "logros": [ { "codigo": "primer_hueso", "nombre": "Primer hueso", "descripcion": "Completaste el módulo 1", "obtenido": true, "obtenido_en": "2026-09-23T20:00:00Z" } ] }
```
Catálogo de Fase 1 (se siembra de forma idempotente): `primer_hueso` (módulo 1), `celula_por_celula` (2),
`constructor` (3), `mineralizador` (4), `remodelador` (5), `cronista` (6). Completar el módulo N otorga
el logro N. Los logros transversales llegan en F5-04.

### Certificado (F5-05)

Requisito del briefing: reconocimiento final al completar el recorrido. Un certificado por usuario, con
código de verificación público y PDF descargable.

**Elegibilidad.** Los 6 módulos están completados (`ProgressModulo.completado`) y, **solo si hay
manifiesto**, el puntaje del usuario en las actividades **obligatorias** alcanza `CERT_MIN_PORCENTAJE`
(70 por defecto) % del máximo de esas actividades. Solo cuentan las obligatorias, cada una con su mejor
intento completado y como mucho su `puntaje_max`: el porcentaje no pasa de 100 y una actividad opcional
no compensa una obligatoria mal resuelta. El porcentaje se muestra truncado a un decimal (69,7 no
se redondea a 70). Sin manifiesto solo se exige completar los 6 módulos.

`GET /api/certificate/status` (auth) → `200`:
```json
{ "elegible": false, "emitido": false,
  "modulos_completados": [1, 2, 3], "modulos_pendientes": [4, 5, 6],
  "puntaje_total": 210, "puntaje_obligatorias": 190, "puntaje_maximo": 480,
  "porcentaje": 39.5, "umbral": 70, "puntos_faltantes": 146,
  "motivos": ["Faltan por completar los módulos 4, 5 y 6.",
              "Tu puntaje en las actividades obligatorias es 39,5 % y se necesita al menos 70 %: te faltan 146 puntos."],
  "certificado": null }
```
`puntaje_obligatorias`, `puntaje_maximo`, `porcentaje`, `umbral` y `puntos_faltantes` son `null` sin
manifiesto. `puntaje_total` es el del HUD (todas las actividades). Con certificado emitido, `certificado`
trae el resumen (`codigo`, `emitido_en`, `puntaje_total`, `puntaje_obligatorias`, `puntaje_maximo`,
`porcentaje`).

`POST /api/certificate` (auth, sin cuerpo). **Idempotente:** `201 {"certificado": {...}, "nuevo": true}`
al emitirlo; `200 {..., "nuevo": false}` con el mismo certificado si ya existía (un certificado emitido
no se revoca aunque luego cambie el contenido). Sin cumplir los requisitos → `409 certificado_no_elegible`
con `motivos`. Dos peticiones simultáneas generan un solo certificado (restricción única sobre
`certificates.user_id`). Guarda una instantánea de nombre, apellido, tipo y número de identificación, el
puntaje y la fecha: no cambia si el perfil se edita después.

`GET /api/certificate/pdf` (auth) → `200 application/pdf` con
`Content-Disposition: attachment; filename="certificado_OVA-XXXX-XXXX.pdf"`. Solo el propio; sin
certificado → `404 certificado_no_emitido`. Límite: 10 descargas por minuto y por usuario (`429`). A4
apaisada, con borde, título "Certificado de finalización", nombre completo, nombre del OVA, los seis
módulos, puntaje, fecha (hora de Colombia, UTC-5), código, un QR y la URL de verificación
`{PUBLIC_BASE_URL}/verify/{codigo}`. Se genera con reportlab (Python puro, sin dependencias de sistema) y
fuentes DejaVu incluidas: acentos, ñ y otros alfabetos latinos, griego y cirílico salen bien. El PDF es
idéntico en cada descarga.

`GET /api/verify/{codigo}` (**público**, sin token) → `200`:
```json
{ "valido": true, "codigo": "OVA-7K3M-9QXA", "nombre": "Ana", "apellido": "Pérez",
  "tipo_identificacion": "CC", "identificacion_enmascarada": "*******789",
  "emitido_en": "2026-09-24T15:00:00Z", "puntaje_total": 231, "porcentaje": 79.1 }
```
La identificación va enmascarada: solo se ven los **últimos 3 caracteres**. `porcentaje` es `null` si el
certificado se emitió sin manifiesto. Un código inexistente o mal formado da siempre el mismo
`404 certificado_no_encontrado`, sin más datos. Se toleran minúsculas y espacios alrededor. Límite:
20 consultas por minuto y por IP (aciertos y fallos), pasado el cual `429 demasiados_intentos` con
`Retry-After`.

**Código de verificación:** `OVA-XXXX-XXXX`, 8 caracteres aleatorios (`secrets`) de un alfabeto de 31
sin ambiguos (`2-9` y `A-Z` salvo `I`, `L` y `O`; sin `0` ni `1`).

**La SPA** debe ofrecer una vista pública en `/verify/:codigo` que llame a `GET /api/verify/{codigo}`
(la URL impresa en el PDF y en el QR apunta a ella).

### Mentor de IA (F1-07, F3-01 a F3-11, F4-03)

`POST /api/chat` (requiere auth)
```json
{ "messages": [ { "role": "user", "content": "¿Qué hacen los osteoclastos?" } ],
  "contexto": { },
  "session_id": 12 }
```
- `messages`: de 1 a 40 elementos, `role` ∈ `user`, `assistant`; el último debe ser `user`; `content` de
  1 a 8000 caracteres. El cliente sigue enviando el historial completo; el servidor solo guarda el
  último mensaje del estudiante y la respuesta.
- `contexto` (opcional): objeto `ContextoPedagogico` en camelCase (abajo). Se valida, **se usa para
  recuperar el material del curso y va al prompt** como datos (F3-04).
- `session_id` (opcional, entero ≥ 1): conversación guardada a la que pertenece el mensaje, tal como la
  devolvió el evento `sesion`. Sin él se abre una conversación nueva. Si no existe o es de otro usuario:
  `404 sesion_no_encontrada` (antes de abrir el stream).
- Límites, en este orden: sin `ANTHROPIC_API_KEY` → `503 ia_no_configurada`; más de
  `MENTOR_MAX_MENSAJES_DIA` (60 por defecto) respuestas del mentor hoy → `429 limite_diario` con
  `Retry-After` (segundos hasta la medianoche de Colombia, UTC-5) y un mensaje amable; más de 20
  peticiones por minuto → `429 demasiados_intentos`. El día se cuenta con `usage_events` (respuestas que
  el modelo empezó a generar): borrar conversaciones no devuelve el cupo y los fallos previos al modelo
  no lo gastan.

Respuesta: `200 text/event-stream` con `Cache-Control: no-cache` y `X-Accel-Buffering: no`. Cada evento
tiene la forma `event: <nombre>\ndata: <json>\n\n`; `data` siempre es un objeto JSON. Se emite un
comentario `: ping` cada 15 s. **El cliente ignora los eventos que no conoce** (así se agregaron los
nuevos sin romper a nadie).

| Evento | Payload | Nota |
|---|---|---|
| `sesion` | `{"session_id": 12}` | **Primero.** La conversación en la que se guardó el mensaje (nueva o la indicada). Aparece aunque después falle la respuesta |
| `text` | `{"delta": "..."}` | Fragmento de texto de la respuesta |
| `citas` | `{"citas": [{"id", "modulo", "seccion_id", "titulo", "url"}]}` | Solo si la respuesta terminó bien y se recuperó material del curso. Antes de `mensaje`/`usage`/`done` |
| `mensaje` | `{"message_id": 31}` | Id de la respuesta guardada (para `POST /api/chat/feedback`). Solo si se guardó |
| `usage` | `{"input_tokens": 0, "output_tokens": 0, "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0}` | Una vez, al final |
| `done` | `{"stop_reason": "end_turn"}` | Evento terminal de éxito |
| `error` | `{"code": "refusal", "message": "..."}` | Evento terminal de fallo durante el stream |
| `tool_use` | `{"id": "...", "name": "...", "input": { }}` | Reservado para F3-08, no se emite |

Orden en una respuesta completa: `sesion`, `text`\*, `citas`, `mensaje`, `usage`, `done`. En un fallo:
`sesion`, `text`\*, [`usage`], `error` (sin `citas` ni `mensaje`, y la respuesta no se guarda).

El stream termina con exactamente un `done` o un `error`. Códigos de `error` en stream: `refusal`,
`max_tokens`, `upstream_error`, `rate_limited`. Cada `usage` se registra también en la tabla
`usage_events` (control de costo desde el primer día).

**Citas (F3-05).** `citas` lista solo los fragmentos del curso que **de verdad se recuperaron** y viajaron
en el prompt, en el orden de las etiquetas `[1]`, `[2]`… que el mentor escribe en el texto (la cita `n`
es la etiqueta `[n]`). `url` es una ruta interna del OVA (`/modulo/3?s=m3_4_osteocito_sensor`; `s` es el
id de la sección); el frontend solo acepta `/modulo/1..6` con `?s=` opcional y las muestra como
«Fuentes». El material del docente para el mentor (banco de preguntas, ganchos) informa la respuesta pero
**no se cita**, porque el estudiante no lo ve.

`GET /api/chat/history?session_id=12&limit=50` (requiere auth)
```json
{ "session_id": 12,
  "messages": [ { "id": 30, "role": "user", "content": "...", "citas": [], "valoracion": null,
                  "created_at": "2026-09-24T20:00:00Z" },
                { "id": 31, "role": "assistant", "content": "...", "citas": [ { } ], "valoracion": 1,
                  "created_at": "2026-09-24T20:00:05Z" } ] }
```
- Los últimos `limit` mensajes (1 a 100, por defecto 50) de una conversación **propia**, en orden
  cronológico. Sin `session_id`, la conversación más reciente del usuario (o `{"session_id": null,
  "messages": []}` si no tiene ninguna). Ajena o inexistente: `404 sesion_no_encontrada`.
- Solo trae lo que se dijo: nunca el prompt de sistema ni el bloque de datos del curso.

`DELETE /api/chat/session?session_id=12` (o `DELETE /api/chat/session/12`) → `204`. Borra la conversación
propia y sus mensajes (el consumo de tokens en `usage_events` se conserva). Ajena o inexistente: `404
sesion_no_encontrada`.

`POST /api/chat/feedback` (F3-11)
```json
{ "message_id": 31, "valor": 1 }
```
- `valor`: `1` (útil), `-1` (no útil) o `0` (retirar la valoración). Respuesta `200`
  `{"message_id": 31, "valor": 1}` (`valor: null` si se retiró). Solo respuestas del mentor de una
  conversación propia; si no, `404 mensaje_no_encontrado`. Se guarda en `chat_messages.valoracion` y
  vuelve en el historial.
- **Interfaz:** cada respuesta completa que el servidor guardó lleva 👍/👎 (`aria-pressed`, 44 px). El
  voto se ve al instante y se deshace si el servidor falla; tocar el voto activo lo retira (`valor: 0`)
  y tocar el otro lo cambia. Las respuestas restauradas del historial traen su `valoracion`.

**Interfaz del chat (F3-09, F3-11).**
- *Restaurar:* al abrir el panel por primera vez en la sesión, el frontend pide `GET /api/chat/history`
  (sin `session_id`: la conversación más reciente), fija `session_id` para continuarla y muestra los
  mensajes con sus fuentes y su valoración. Un historial vacío no es un error; un fallo muestra un aviso
  con «Reintentar». Si el estudiante ya escribió mientras llegaba, el historial se descarta (nunca se
  duplican mensajes).
- *Nueva conversación:* pide una confirmación sencilla y llama a `DELETE /api/chat/session`. Solo si el
  servidor lo confirma (o responde `404`) se vacía la pantalla; si falla, la conversación se conserva y
  se explica por qué (si no, volvería a aparecer al recargar).

**Aislamiento:** todas estas rutas filtran por el usuario del token. La conversación o el mensaje de otro
usuario responde igual que uno inexistente (404), sin revelar que existe.

**Prompt y recuperación (resumen).** `system` lleva solo el bloque estable `prompts/mentor_v1.md`
(con `cache_control`); el contexto pedagógico y los fragmentos recuperados van al final, en el último
turno del estudiante, dentro de `<datos_del_curso>` con la orden de no obedecerlos y con `<`, `>` y `&`
escapados. La recuperación es BM25 propio en Python puro sobre `app/data/corpus.jsonl` (se genera con
`python -m app.scripts.build_corpus`; `--comprobar` para CI); su calidad se mide en
[mentor-eval.md](mentor-eval.md). El motor tiene una interfaz `Retriever`; la búsqueda vectorial con
pgvector (F6-10) será otra clase con la misma interfaz.

El cliente usa `fetch` con `ReadableStream` (no `EventSource`, porque no permite POST ni cabeceras) y
cancela con `AbortController`; el backend debe cancelar la petición a Anthropic cuando el cliente
se desconecta.

#### Sugerencias de refuerzo: `GET /api/mentor/refuerzo` (F3-07)

Requiere auth. **No llama al modelo**: son reglas fijas sobre `activity_results`, `progress_modulos` y el
manifiesto de actividades (`app/data/actividades_manifest.json`, que desde F3-07 trae el `concepto` y el
`seccion_titulo` de cada actividad; regenerarlo con `python -m app.scripts.build_manifest`).
Parámetros opcionales: `modulo` (1 a 6) y `limite` (1 a 10, por defecto 5).

```json
{ "sugerencias": [ {
    "actividad_id": "m3_2_quiz_rankl", "concepto": "Señalización RANK-RANKL-OPG",
    "modulo": 3, "seccion": "m3_2_rankl", "seccion_titulo": "La balanza RANKL/OPG",
    "url": "/modulo/3?s=m3_2_rankl",
    "motivo_tipo": "atascada", "motivo": "Llevas 4 intentos y aún no la completas",
    "prioridad": "alta", "puntaje": 91 } ] }
```

- Una sugerencia por concepto (si dos actividades comparten concepto en un módulo queda la más urgente),
  de la más a la menos urgente. **Lista vacía cuando no hay señal** (o el servidor no tiene el
  manifiesto): la interfaz no muestra nada, ni siquiera un aviso.
- `motivo_tipo` y su peso (`app/services/refuerzo.py`): `atascada` (sin completar, ≥ 3 intentos: 90 + hasta
  9 extra), `precision_baja` (completada con menos del 70 % del máximo: 60 a 88), `en_curso`
  (obligatoria empezada con 1 o 2 intentos, sin completar: 50), `varios_intentos` (completada con buen
  puntaje pero ≥ 3 intentos: 40 + extra) y `pendiente` (obligatoria sin ningún intento **de un módulo ya
  iniciado y no completado**: 30). `prioridad`: `alta` desde 80, `media` desde 50, `baja` el resto.
  `motivo` es la frase en lenguaje claro para el estudiante.
- Solo lee las filas del propio usuario (nada de datos ajenos). Errores: `401 token_invalido`, `422` si
  `modulo` o `limite` están fuera de rango.
- *Interfaz:* la tarjeta «Para reforzar» aparece en el estado vacío del panel del mentor (con «Ponme a
  prueba» por sugerencia) y en la portada; cada concepto enlaza a su sección. Las `url` que no sean
  `/modulo/1..6` con `?s=` opcional se descartan.

#### «Explícame esto» (F3-06)

No agrega endpoint: el contexto pedagógico (`estructuraSeleccionada`, `moleculaSeleccionada` y `nivel`)
ya viaja en `POST /api/chat`, orienta la recuperación y llega al prompt como datos. El estado vacío del
panel ofrece un botón «Explícame {nombre}» por cada selección, con el nombre legible sacado del contenido
del módulo (etiqueta de la capa, del punto 3D o de la molécula; si falta, se deriva del id). Envía siempre
la misma pregunta: «Explícame «{nombre}»: ¿qué es, qué función cumple y cómo se relaciona con lo que
estoy estudiando?». Con el panel cerrado, junto a su botón aparece «Preguntar al mentor» que abre el
panel y la envía. El prompt estable (`mentor_v1.md`) pide adaptar la analogía al nivel (pregrado: imagen
cotidiana; posgrado: analogía breve y luego el mecanismo preciso) y decir dónde falla.

**Evento de documento** (para que cualquier componente pregunte sin importar el panel):
`document.dispatchEvent(new CustomEvent('ova:preguntar-al-mentor', { detail: { texto } }))`, o
`preguntarAlMentor(texto)` de `apps/web/src/ai/explicame.ts`. `texto` es texto plano de 1 a 500
caracteres; el panel se abre y lo envía como si lo hubiera escrito el estudiante (recuperando antes la
conversación guardada). Se ignora si el texto no es válido o si el mentor está respondiendo.

#### Quiz de práctica: `POST /api/mentor/quiz` (F4-03)

Requiere auth. Pide a Claude 3 preguntas de opción múltiple sobre la sección o el concepto actual,
apoyadas en el material del curso (RAG), con **salida estructurada** (`output_config.format` con un JSON
schema; sin streaming). Es **práctica libre: no otorga puntos ni logros, no se guarda en
`chat_messages` y no toca `activity_results`.**

```json
{ "tema": "Señalización RANK-RANKL-OPG", "modulo": 3, "seccion": "m3_2_rankl", "contexto": { } }
```
- Al menos uno entre `tema` (≤ 120 caracteres), `modulo` (1 a 6, con `seccion` opcional) y `contexto`
  (`ContextoPedagogico`). `modulo` y `seccion` mandan sobre los del contexto; el `nivel` del contexto
  decide si entra el material de posgrado.
- **Material:** solo lo citable del corpus (contenido, glosario y objetivos: lo que el estudiante puede
  leer). No entran el banco de preguntas ni los ganchos del docente, y el corpus no trae preguntas ni
  respuestas de las actividades calificadas. La sección indicada va completa; con un tema se suma lo que
  encuentra la búsqueda; sin nada de eso, el comienzo del módulo.

```json
{ "modulo": 3, "seccion": "m3_2_rankl", "tema": "La balanza RANKL/OPG", "otorga_puntos": false,
  "preguntas": [ { "id": 1, "enunciado": "...", "opciones": [ { "texto": "..." } ], "correcta": 2,
                   "explicacion": "...", "dificultad": "basica", "fuentes": ["1"] } ],
  "fuentes": [ { "id": "...", "modulo": 3, "seccion_id": "m3_2_rankl", "titulo": "...", "url": "/modulo/3?s=m3_2_rankl" } ] }
```
- Exactamente 3 preguntas, cada una con 4 `opciones` y `correcta` (posición desde 0) en una sola; el
  servidor **mezcla el orden de las opciones**. `dificultad`: `basica`, `intermedia` o `avanzada`.
  `fuentes` de cada pregunta son etiquetas (`"1"`, `"2"`…) de la lista `fuentes` de la respuesta (la de
  etiqueta `n` es la posición `n`, igual que las citas del chat).
- **Validación estricta** de lo que devuelve el modelo (`app/ai/quiz.py`): JSON válido, 3 preguntas
  distintas, 4 opciones distintas (sin acentos ni mayúsculas) con una sola correcta, sin «todas las
  anteriores» ni «A y B», longitudes (enunciado 15–300, opción 1–200, explicación 20–700), dificultad
  válida y de 1 a 3 fuentes que existan en el material. Si no pasa (o el modelo se corta por `max_tokens`)
  se reintenta **una vez**; si vuelve a fallar, `502 quiz_invalido`.
- **Cuotas y límites**, en este orden: sin `ANTHROPIC_API_KEY` → `503 ia_no_configurada`; más de
  `MENTOR_MAX_QUIZ_DIA` (20 por defecto, 0 = sin límite; mismo día de Colombia) quizzes hoy →
  `429 limite_diario_quiz` con `Retry-After`; y el límite de 20 peticiones por minuto **compartido con el
  chat** → `429 demasiados_intentos`. La cuota del quiz es independiente de `MENTOR_MAX_MENSAJES_DIA`.
  El consumo se registra en `usage_events` con `kind = "quiz"`: **una fila por quiz** (suma de sus
  llamadas, aunque haya habido reintento), que es lo que cuenta la cuota; un fallo antes de llegar al
  modelo no la gasta.
- Errores: `401 token_invalido`; `422` de validación (formato de FastAPI) o `422 material_insuficiente`
  (no hay material del curso para ese tema); `502 ia_error` (el modelo rechazó la consulta o el servicio
  falló; el detalle técnico solo va al log) y `502 quiz_invalido`; `503 ia_no_configurada`.
- *Interfaz:* botón «Ponme a prueba» en el estado vacío y en la cabecera del panel. Una pregunta a la
  vez, con retroalimentación inmediata (explicación y fuentes al elegir), resumen con lo que conviene
  repasar y una nota fija: «Es práctica libre: no suma puntos ni logros». Componente propio
  (`components/mentor/MentorQuiz.vue`); no reutiliza `ActividadQuiz`.

## `ContextoPedagogico` (congelado en F1-09)

Tipo TypeScript, en `apps/web/src/stores/contextoPedagogico.ts`:

```ts
export type ContextoPedagogico = {
  modulo: 1 | 2 | 3 | 4 | 5 | 6;
  seccion: string;
  actividadActual?: {
    id: string;
    tipo: "multicapa" | "arrastre-molecular" | "relacion-columnas" | "quiz" | "video-texto" | "exploracion-3d";
    intentos: number;
    completada: boolean;
  };
  estructuraSeleccionada?: string;
  moleculaSeleccionada?: string;
  nivel: "pregrado" | "posgrado";
  tiempoEnSeccionSeg: number;
  interaccionesRecientes: string[]; // máximo 10
  progreso: {
    modulosCompletados: number[];
    puntajeTotal: number;
    logros: string[];
  };
};
```

En el backend es un modelo Pydantic con `alias_generator=to_camel` y `populate_by_name=True`, en
`app/schemas/contexto.py`. Las restricciones (`interaccionesRecientes` ≤ 10, `modulo` 1..6, longitudes
de cadena ≤ 64) se validan en ambos lados.

## Modelo de datos (Alembic, F1-04)

Tablas de Fase 1: `users`, `progress_modulos` (único `(user_id, modulo)`), `activity_results`,
`achievements` (catálogo), `user_achievements` (único `(user_id, codigo)`), `usage_events`.
Mentor (F3-09, migración `b7d2f4a91c36`): `chat_sessions` (`user_id`, `modulo` del contexto al abrirla,
`created_at`, `updated_at`) y `chat_messages` (`session_id` con borrado en cascada, `role`, `content`,
`input_tokens`, `output_tokens`, `model`, `citas` en JSON, `valoracion` 1 o -1 y `created_at`; las columnas
`model`, `citas` y `valoracion` son nulas y las llena solo el mentor).
Índice único en `users(tipo_identificacion, numero_identificacion)`.

`certificates` (F5-05, migración `a3c81e5d7b02`): una fila por usuario (índice único en `user_id`) con
`codigo` único, la instantánea `nombre`, `apellido`, `tipo_identificacion`, `numero_identificacion`,
`puntaje_total`, `puntaje_obligatorias` y `puntaje_maximo` (estos dos, nulos sin manifiesto) y `created_at`.

## Configuración relacionada

| Variable | Por defecto | Uso |
|---|---|---|
| `ACTIVITIES_MANIFEST_PATH` | `services/api/app/data/actividades_manifest.json` | Manifiesto de actividades (vacía: sin validación; ruta explícita inexistente: error de arranque) |
| `MENTOR_MAX_MENSAJES_DIA` | `60` | Respuestas del mentor por estudiante y día (calendario de Colombia, UTC-5); `0` = sin límite |
| `MENTOR_RAG_TOP_K` | `5` | Fragmentos del curso que se recuperan por pregunta (1 a 10) |
| `RAG_BACKEND` | `bm25` | Motor de recuperación. `pgvector` está reservado para F6-10 y aún no está implementado (la API se niega a arrancar con él) |
| `RAG_CORPUS_PATH` | `services/api/app/data/corpus.jsonl` | Corpus del mentor (vacía: el mentor responde sin material del curso; ruta explícita inexistente: error de arranque) |
| `CERT_MIN_PORCENTAJE` | `70` | % mínimo del máximo de las actividades obligatorias (solo con manifiesto), 0 a 100 |
| `PUBLIC_BASE_URL` | `http://localhost:5173` | Origen público del sitio, para la URL de verificación impresa en el PDF |

## Docente (F6-03, solo backend)

Panel de seguimiento de la cohorte. Todas las rutas cuelgan de `/api/teacher` y exigen un usuario con
`rol = "docente"` (se promueve con `uv run python -m app.scripts.promote_docente <tipo> <numero>`).

| HTTP | code | Cuándo |
|---|---|---|
| 401 | `token_invalido` | Sin token, expirado o inválido |
| 403 | `no_autorizado` | El usuario autenticado es estudiante |
| 404 | `estudiante_no_encontrado` | `GET /students/{id}` con un id inexistente o que no es de un estudiante |

**Alcance.** Las cifras cuentan solo a los **estudiantes** (`rol = "estudiante"`); el equipo docente no
entra. **Actividad** de un estudiante = cualquier escritura de progreso, resultado de actividad o
consulta al mentor. Todo se agrega en SQL (sin cargar tablas en memoria) y funciona igual en SQLite y
PostgreSQL. Las ventanas de tiempo y los días se calculan en UTC.

**Privacidad de la identificación.** El número es un dato personal: por defecto se **enmascara** y
solo se ven los **últimos 3 caracteres** (`1023456789` → `*******789`; el tipo no se enmascara).
Se muestra completo únicamente si el docente busca ese número **exacto** en la lista
(`identificacion_completa: true`). El número no se busca por fragmentos, para que no pueda
reconstruirse probando coincidencias parciales. El detalle de un estudiante siempre lo enmascara. El
CSV lo enmascara salvo `?identificacion=completa` (descarga masiva, decisión explícita del docente).

`GET /api/teacher/overview` →
```json
{ "generado_en": "2026-09-24T15:00:00Z", "estudiantes": 5, "activos_7d": 2, "activos_30d": 4,
  "modulos_completados": [ { "modulos_completados": 0, "estudiantes": 2 } ],
  "tiempo_por_modulo": [ { "modulo": 1, "tiempo_promedio_seg": 366.67, "estudiantes": 3 } ],
  "puntaje": { "promedio": 124.0, "mediana": 60.0 } }
```
`modulos_completados` siempre trae 7 elementos (0 a 6 módulos completados). `tiempo_por_modulo`
siempre trae los 6 módulos; el promedio es sobre los estudiantes con fila de progreso en ese módulo
(`null` y `estudiantes: 0` si ninguno). `puntaje` cuenta a todos los estudiantes (0 si no puntuaron) con
la misma regla del total (ver "Actividades y puntaje"); `null` si no hay estudiantes.

`GET /api/teacher/students?page=1&page_size=25&q=&orden=nombre`
- `page` ≥ 1; `page_size` de 1 a 100 (por defecto 25); fuera de rango → `422`.
- `q` (hasta 100 caracteres): cada palabra debe estar en el nombre o el apellido (sin distinguir
  mayúsculas; `%` y `_` se tratan como texto); o bien un número de identificación **exacto** (se
  normaliza igual que en el registro).
- `orden`: `nombre` (ascendente, por defecto), `puntaje` (mayor a menor) o `ultima_actividad` (más
  reciente primero; sin actividad al final).
```json
{ "estudiantes": [ { "id": 2, "nombre": "Ana", "apellido": "Pérez", "tipo_identificacion": "CC",
    "numero_identificacion": "*******789", "identificacion_completa": false, "nivel": "pregrado",
    "modulos_completados": 2, "puntaje_total": 260, "ultima_actividad": "2026-09-24T14:00:00Z",
    "tiempo_total_seg": 1000 } ],
  "page": 1, "page_size": 25, "total": 5, "total_pages": 1 }
```
Una página más allá de la última devuelve `estudiantes: []` con el `total` real.

`GET /api/teacher/students/{id}` → `id`, `nombre`, `apellido`, `tipo_identificacion`,
`numero_identificacion` (enmascarado), `nivel`, `created_at`, `modulos_completados`, `puntaje_total`,
`tiempo_total_seg`, `ultima_actividad` y:
- `progreso`: los 6 módulos (`modulo`, `seccion_actual`, `completado`, `tiempo_total_seg`, `updated_at`).
- `actividades`: una por `activity_id` con `modulo`, `tipo`, `mejor_puntaje` (máximo de todos los
  registros), `puntaje_contabilizado` (mejor entre los completados: el que suma al total), `intentos`
  (máximo reportado), `registros` (filas del historial), `completada` y `ultimo_intento`.
- `mentor`: `consultas`, `tokens_entrada`, `tokens_salida`, `tokens_cache_lectura`,
  `tokens_cache_escritura`, `costo_estimado_usd`, `ultima_consulta`.

`GET /api/teacher/activities/stats?limite=5` → `{ "actividades": [...], "por_modulo": [...],
"mas_dificiles": [...] }`. La unidad de conteo es el par (estudiante, actividad).
- Por actividad: `activity_id`, `modulo`, `tipo`, `estudiantes_intentaron` (con algún registro),
  `estudiantes_completaron`, `tasa_finalizacion` (completaron / intentaron), `intentos_promedio`
  (promedio del máximo `intentos` de cada estudiante) y `puntaje_promedio` (promedio del mejor puntaje
  completado de quienes la completaron; `null` si nadie).
- `por_modulo`: siempre los 6 módulos, con `actividades`, `estudiantes_intentaron`,
  `tasa_finalizacion`, `intentos_promedio` y `puntaje_promedio` (contando pares estudiante-actividad).
- `mas_dificiles`: las `limite` (1 a 50) actividades con menor `tasa_finalizacion` y, a igualdad, más
  `intentos_promedio`.

`GET /api/teacher/mentor/usage?dias=30&limite=10` (`dias` 1 a 365, hoy incluido; `limite` 1 a 50) →
```json
{ "desde": "2026-08-26T00:00:00Z", "hasta": "2026-09-24T15:00:00Z", "dias": 30,
  "precios": { "moneda": "USD", "entrada_usd_por_mtok": 5.0, "salida_usd_por_mtok": 25.0,
               "cache_lectura_factor": 0.1, "cache_escritura_factor": 1.25, "nota": "..." },
  "totales": { "consultas": 4, "usuarios": 3, "tokens_entrada": 7500, "tokens_salida": 3600,
               "tokens_cache_lectura": 10000, "tokens_cache_escritura": 1000,
               "costo_estimado_usd": 0.13875 },
  "por_dia": [ { "fecha": "2026-09-24", "consultas": 1, "tokens_entrada": 1000,
                 "tokens_salida": 500, "costo_estimado_usd": 0.0175 } ],
  "por_dia_modelo": [ { "fecha": "2026-09-24", "modelo": "claude-opus-5", "consultas": 1,
                        "tokens_entrada": 1000, "tokens_salida": 500, "costo_estimado_usd": 0.0175 } ],
  "por_modelo": [ { "modelo": "claude-opus-5", "consultas": 3, "tokens_entrada": 3500,
                    "tokens_salida": 1600, "tokens_cache_lectura": 0, "tokens_cache_escritura": 0,
                    "costo_estimado_usd": 0.0575 } ],
  "top_usuarios": [ { "user_id": 6, "nombre": "Elena", "apellido": "Vega", "consultas": 1,
                      "tokens_entrada": 4000, "tokens_salida": 2000, "costo_estimado_usd": 0.08125 } ] }
```
`por_dia` trae todos los días de la ventana (con ceros); `por_dia_modelo` solo las combinaciones con
consultas. `top_usuarios` va de mayor a menor costo estimado. Aquí cuenta todo `usage_events`
(incluido el uso del propio equipo docente).

**Costo estimado.** `(entrada × PRECIO_ENTRADA + salida × PRECIO_SALIDA + caché leído × PRECIO_ENTRADA × 0,1
+ caché escrito × PRECIO_ENTRADA × 1,25) / 1 000 000`, en USD. Los precios se configuran con las
variables de entorno `PRECIO_ENTRADA_USD_POR_MTOK` y `PRECIO_SALIDA_USD_POR_MTOK`; por defecto 5 y 25,
las tarifas de `claude-opus-5` según la documentación de Anthropic consultada el 2026-09 (**verificarlas**
antes de usarlas para presupuestar). Es una estimación y aplica el mismo precio a todos los modelos
registrados: la factura real la emite Anthropic.

`GET /api/teacher/export/progress.csv[?identificacion=completa]` → `200 text/csv; charset=utf-8` con
`Content-Disposition: attachment; filename="progreso_ova_AAAA-MM-DD.csv"`. UTF-8 **con BOM** (Excel),
fin de línea CRLF, respuesta en streaming. Una fila por estudiante y por módulo (siempre los 6).
Columnas: `id_estudiante, nombre, apellido, tipo_identificacion, numero_identificacion, nivel, modulo,
completado` (`si`/`no`), `seccion_actual, tiempo_total_seg, puntaje_modulo, actividades_completadas,
ultima_actualizacion, puntaje_total` (el total del estudiante, repetido en sus 6 filas).
**Inyección de fórmulas:** toda celda de texto que empiece por `=`, `+`, `-`, `@`, tabulación o retorno
de carro se prefija con `'`, para que Excel y LibreOffice no la ejecuten.
