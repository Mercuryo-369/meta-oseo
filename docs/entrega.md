# Entrega del OVA: resumen ejecutivo y estado real

**Fecha:** 2026-09-25 · **Versión:** 0.1.0 (Entrega 1) · **Contenido:** borrador, sin validar por el docente

## En una frase

El OVA completo (seis módulos, mentor, puntaje, logros, certificado y panel del docente) **funciona de extremo a
extremo con la API real y con miles de pruebas automáticas**, pero es un **borrador**: falta la validación del
docente y varias comprobaciones que nadie ha hecho todavía (lista abajo). No está listo para abrirse a estudiantes.

## Lo que está listo

| Pieza | Qué hay | Cómo se comprobó |
|---|---|---|
| Módulos | <!--c:modulos-->6<!--/c--> módulos con <!--c:secciones-->39<!--/c--> secciones, <!--c:actividades-->128<!--/c--> actividades (<!--c:obligatorias-->88<!--/c--> obligatorias) y <!--c:puntos-->3900<!--/c--> puntos posibles | El esquema del contenido y las pruebas de cada módulo los validan (estructura, ids, puntajes, dibujos, glosario, cobertura frente al guion); una prueba por módulo recorre el módulo real con las seis actividades reales |
| Motor de actividades | Seis tipos: dibujos con capas, arrastre de moléculas, relación de columnas, preguntas, explicación animada y exploración 3D | Cada componente cumple una batería común de pruebas de contrato |
| Puntaje y logros | Puntaje con penalización por intento y piso, seis logros (uno por módulo) | Pruebas de la fórmula y de la API |
| Certificado | Elegibilidad, emisión (una por persona), PDF, código y verificación pública | Pruebas automáticas, y de extremo a extremo con la API real el 2026-09-25: estudiante de prueba, 113 resultados, seis módulos, emisión, PDF y `GET /api/verify/{código}` |
| Panel del docente | Resumen, estudiantes, actividades, mentor y exportación CSV; identificación enmascarada | Pruebas de la API y de la interfaz; consulta real de `/api/teacher/overview` |
| Mentor de IA | Respuestas en streaming con citas, historial, límites por minuto y por día, costo estimado | Con un servidor de Anthropic **simulado**. Búsqueda medida en [mentor-eval.md](mentor-eval.md): el fragmento correcto entra entre los 3 primeros el 94 % de las veces |
| Instalación local | Guía con pasos probados | Instalación desde cero en una copia limpia (2026-09-25): dependencias, migraciones en SQLite y PostgreSQL 18, API, interfaz, compilación, promoción a docente |
| Documentación | Guías de instalación, docente y estudiante; arquitectura; lista de revisión con las cifras dudosas | Enlaces, cifras y ortografía comprobados con `tools/guiones/comprobar_docs.py` |

**Resultados de pruebas, medidos el 2026-09-25:**

| Comprobación | Resultado |
|---|---|
| Pruebas de la API con SQLite | 860 correctas |
| Pruebas de la API con PostgreSQL 18 | 860 correctas |
| Pruebas de la interfaz | 3 224 correctas y 6 omitidas, **1 fallo** en la ejecución completa final: `components/menu/animacion.test.ts`, una prueba de tiempos de la animación del menú circular que falló en 2 de 3 ejecuciones completas del día y sí pasa al ejecutarla sola (no se investigó la causa). En la primera ejecución falló además `scenes/anclas.test.ts`, trabajo ajeno en curso sobre los puntos de interés 3D, que luego pasó |
| Compilación de producción de la interfaz | Correcta (5,7 MB), en la copia limpia |
| Pruebas de `tools/guiones` (convertidor, lista de revisión, documentos) | 139 correctas, `ruff` sin avisos |
| Manifiesto y corpus al día con el contenido | Correcto (`--comprobar`), <!--c:fragmentos_corpus-->598<!--/c--> fragmentos en el corpus |

## Lo que NO está listo ni verificado

Sin adornos: estas son las cosas que **nadie ha hecho o comprobado**.

| # | Qué falta | Por qué importa |
|---|---|---|
| 1 | **El contenido no está validado.** Todo lo redactamos nosotros a partir del briefing; los seis módulos están en `borrador`. Hay <!--c:pendientes-->287<!--/c--> cifras y afirmaciones marcadas como dudosas y <!--c:referencias-->125<!--/c--> referencias sin verificar | Es el riesgo principal: un error científico llegaría a los estudiantes. La [lista de revisión](revision-docente.md) lo ordena |
| 2 | **El mentor nunca se ha probado con una clave real de Anthropic.** No se sabe cómo responde el modelo a las reglas del prompt ni si el caché de prompts y el modo de respaldo funcionan en la cuenta | Puede fallar, gastar más de lo previsto o dar respuestas que no siguen las reglas |
| 3 | **Nada se ha probado en un teléfono real.** Solo Chrome de escritorio con emulación táctil, y por unidades. Sin probar: pellizco de dos dedos, rendimiento del 3D en gama media, teclado virtual, zonas de toque de 44 px | El requisito del briefing es «100 % compatible con smartphones y tablets» |
| 4 | **Docker nunca se ha construido ni ejecutado**, y la integración continua nunca corrió en GitHub. Solo se validó `docker compose config` | El despliegue para estudiantes depende de esto (tarea F6-10) |
| 5 | **No hay videos reales.** Las explicaciones son animaciones SVG con transcripción; el espacio para videos del docente existe y no se ha usado | El briefing prevé videos |
| 6 | **El modelo 3D es provisional** (STL de BodyParts3D sin editar, con puntos de interés colocados por aproximación). No hay modelos 3D de células | La mandíbula 3D funciona, pero no es el modelo final |
| 7 | **Nadie ha visto el certificado en un navegador** ni impreso el PDF | Probado por API y por pruebas, no por una persona |
| 8 | **Faltan verificaciones visuales** de casi todas las pantallas (menú circular, HUD, módulo, actividades, panel del docente, certificado) en claro y oscuro, y de accesibilidad con lector de pantalla real | Las pruebas automáticas no ven el diseño |
| 9 | **El acceso es solo con el documento, sin contraseña.** Quien sepa el documento de otra persona entra como ella | Aceptado para el piloto; hay que decidir antes de abrirlo (F6-08) |
| 10 | **El puntaje lo reporta el navegador y las respuestas viajan en el paquete de la interfaz.** El servidor solo verifica el máximo y que existan las actividades | El puntaje mide participación, no es una evaluación segura |
| 11 | **Los <!--c:bloques_posgrado-->17<!--/c--> bloques de nivel posgrado no los ve nadie**: no hay pantalla para cambiar el nivel del usuario | Contenido escrito que hoy es inalcanzable (solución temporal en la guía del docente) |
| 12 | **No se ha hecho la prueba con estudiantes** (5 a 10, tarea F6-04) ni medido el rendimiento en equipos de gama media | Las duraciones de cada módulo son cálculos, no mediciones |
| 13 | **Sin hacer** (`TODO.md`): logros transversales, herramientas del mentor sobre la escena, «Explícame esto», sugerencias de refuerzo, preguntas generadas por IA, pulgares en el chat, escenas 3D de células | Estaban en el plan; el sistema funciona sin ellos |
| 14 | **Sin licencia propia** para el código y el contenido; el modelo 3D exige compartir igual (CC BY-SA) | Falta acordarlo con el docente y la institución |

## Poner el sistema en marcha

Detalle completo en la [guía de instalación](guia-instalacion.md). Resumen:

**Para revisar o hacer una demostración (un equipo, sin Docker; probado):**

1. Instalar Node 22 o superior, pnpm, Python 3.14 y uv.
2. Copiar `.env.example` a `.env`.
3. En `services/api`: `python -m uv sync`, `python -m uv run alembic upgrade head` y
   `python -m uv run uvicorn app.main:app --reload`.
4. En la raíz: `pnpm install` y `pnpm dev:web`; abrir <http://localhost:5173>.
5. Registrarse y dar el rol de docente con `python -m uv run python -m app.scripts.promote_docente CC <número>`.
6. Opcional: poner `ANTHROPIC_API_KEY` en el `.env` para el mentor.

**Para estudiantes (servidor con Docker Compose; sin probar):** definir `SECRET_KEY`, `POSTGRES_PASSWORD`,
`PUBLIC_BASE_URL` y `ALLOWED_ORIGINS` en el `.env` y ejecutar `docker compose up --build -d`; poner delante un proxy con
HTTPS. Antes de abrirlo a estudiantes: probar el mentor con una clave real, probar en teléfonos y decidir el acceso.

## El primer día del docente

1. **Entrar como docente** (paso 5 de arriba): ve los seis módulos abiertos, con las respuestas correctas visibles y sin
   que se guarde nada. Es la forma de recorrer todo el curso.
2. **Empezar por el módulo 1** (unos 50 minutos): es el más corto y muestra todos los tipos de actividad.
3. **Abrir la [lista de revisión](revision-docente.md)** y responder primero las decisiones de diseño (D01 a D06:
   umbral del certificado, acierto mínimo de las evaluaciones, penalización por intento, tipos de documento, acceso sin
   contraseña y hormonas óseas controvertidas), porque cambian cómo se puntúa y se certifica.
4. **Recorrer un módulo denso** (3, 4 o 5) y anotar cifras que no reconozca; cada una tiene su fila en la lista.
5. **Crear una cuenta de estudiante de prueba** para ver lo que ve un estudiante (bloqueo, puntaje, logros).
6. **Probar el mentor** (cuando haya clave) con cinco preguntas: una del módulo, una fuera de tema, una pidiendo la
   respuesta de una actividad y una clínica. Anotar qué responde.
7. **Abrirlo en su teléfono** y anotar lo que se vea mal.
8. **Registrar** sus respuestas y observaciones; se anotan como un ciclo en [revisiones.md](revisiones.md).
9. **Proponer una fecha para una prueba piloto** con 5 a 10 estudiantes.

## Documentos de la entrega

| Documento | Para qué |
|---|---|
| [README.md](../README.md) | Puerta de entrada al proyecto |
| [guia-docente.md](guia-docente.md) | Cómo usar, revisar, editar y aprobar el contenido; panel; certificados |
| [revision-docente.md](revision-docente.md) | Todo lo que necesitamos que confirme, con casillas |
| [guia-estudiante.md](guia-estudiante.md) | Una página para los estudiantes |
| [guia-instalacion.md](guia-instalacion.md) | Instalación local y despliegue con Docker |
| [arquitectura.md](arquitectura.md) | Componentes, flujos, decisiones y límites conocidos |
| [revisiones.md](revisiones.md) | Registro de ciclos de revisión con el docente |
| [atribuciones.md](atribuciones.md) | Licencias de terceros |
