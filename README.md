# OVA: Metabolismo óseo, un viaje interactivo desde la célula hasta el hueso

Objeto Virtual de Aprendizaje para estudiantes de ciencias de la salud. Lleva de las células al hueso completo (cómo
se forma, se mineraliza, se renueva y envejece) con la mandíbula como ejemplo. Está pensado primero para el móvil.

> **Estado, sin adornos.** Es una **primera entrega en borrador** (versión 0.1.0). El contenido pedagógico lo
> redactamos nosotros y **nadie lo ha validado**; el mentor de IA nunca se ha probado con una clave real; nada se ha
> probado en un teléfono real; Docker nunca se ha construido; no hay videos reales. Todo el detalle está en
> [docs/entrega.md](docs/entrega.md).

## Qué incluye

- **<!--c:modulos-->6<!--/c--> módulos** temáticos (de «Conociendo el hueso» a «El paso del tiempo») con
  <!--c:actividades-->128<!--/c--> actividades interactivas de seis tipos: dibujos con capas, arrastre de moléculas, relación de
  columnas, preguntas con explicación, explicaciones animadas y exploración 3D de la mandíbula.
- **Gamificación:** puntaje con penalización por intento, seis logros (uno por módulo) y **certificado en PDF**
  con código y verificación pública.
- **Mentor de IA** que responde con el material del curso y cita sus fuentes (Anthropic, modelo `claude-opus-5`).
- **Panel del docente:** progreso de la cohorte, actividades más difíciles, uso y costo estimado del mentor, y
  exportación a CSV. La identificación de los estudiantes se muestra enmascarada.
- **Registro sencillo:** nombre, apellido, tipo y número de documento; **sin contraseña** (decisión del piloto).

**Cómo se ve.** No hay capturas de pantalla en el repositorio todavía. En palabras: una pantalla de acceso con una
ilustración de osteona; un inicio con seis tarjetas de módulo (bloqueado, en curso o completado) y un botón flotante de
mentor; cada módulo es una página larga con texto, tablas, dibujos que se tocan y actividades, con un menú circular para
saltar entre módulos y un indicador de puntaje siempre visible; tema claro u oscuro según el dispositivo.

## Inicio rápido

Requisitos: Node 22 o superior, pnpm, Python 3.14 y uv (en Windows, `python -m pip install --user uv`). Desde la raíz
del repositorio:

```bash
cp .env.example .env
cd services/api && python -m uv sync && python -m uv run alembic upgrade head
python -m uv run uvicorn app.main:app --reload      # terminal 1: API en http://localhost:8000
pnpm install && pnpm dev:web                        # terminal 2 (en la raíz): interfaz en http://localhost:5173
```

Se abre <http://localhost:5173>, se registra un usuario y ya se puede recorrer el curso. El mentor necesita una
`ANTHROPIC_API_KEY` en el `.env`; sin ella el resto funciona. Instalación completa (Windows, PostgreSQL, Docker
Compose, HTTPS, copias de seguridad): [docs/guia-instalacion.md](docs/guia-instalacion.md).

## Mapa de documentos

| Si eres... | Empieza por |
|---|---|
| El docente que recibe la entrega | [docs/entrega.md](docs/entrega.md), luego [docs/guia-docente.md](docs/guia-docente.md) y [docs/revision-docente.md](docs/revision-docente.md) |
| Estudiante | [docs/guia-estudiante.md](docs/guia-estudiante.md) |
| Quien instala o despliega | [docs/guia-instalacion.md](docs/guia-instalacion.md) |
| Quien mantiene el código | [docs/arquitectura.md](docs/arquitectura.md), [docs/api-contract.md](docs/api-contract.md), [PLAN.md](PLAN.md) y [TODO.md](TODO.md) |
| Quien escribe o edita contenido | [docs/content-schema.md](docs/content-schema.md) y [docs/guion-por-modulo/README.md](docs/guion-por-modulo/README.md) |

Otros documentos:

- [docs/briefing-pedagogico.md](docs/briefing-pedagogico.md): requisitos del docente (no se edita sin su acuerdo).
- [docs/revisiones.md](docs/revisiones.md): registro de ciclos de revisión y aprobación con el docente.
- [docs/mentor-eval.md](docs/mentor-eval.md): cómo se midió la búsqueda del mentor y sus límites.
- [docs/escena-3d-bmu.md](docs/escena-3d-bmu.md): la escena 3D del remodelado (cómo añadir otra).
- [docs/escena-3d-hueso.md](docs/escena-3d-hueso.md): la escena 3D del hueso largo a la osteona (módulo 1).
- [docs/escena-3d-matriz.md](docs/escena-3d-matriz.md) y [docs/escena-3d-alveolar.md](docs/escena-3d-alveolar.md): las escenas 3D de la matriz ósea y del hueso alveolar (módulo 1).
- `docs/escena-3d-*.md`: una nota por cada una de las catorce escenas 3D (células, osificación, vesícula, ortodoncia, fractura, trabecular, alvéolo); el catálogo está en `docs/content-schema.md`, sección 9.
- [docs/referencias.md](docs/referencias.md): repositorios de referencia.
- [docs/atribuciones.md](docs/atribuciones.md): licencias de los recursos de terceros.
- `docs/guion-por-modulo/`: los guiones, con todo el texto, las preguntas y las notas de verificación de cada módulo.

## Estructura

```text
apps/web/         Interfaz: Vue 3, Vite, TypeScript, TresJS. El contenido de cada módulo está en
                  src/modules/m{n}_*/content.json y los dibujos en public/images/m{n}/
services/api/     API: FastAPI, SQLModel, Alembic, SDK de Anthropic (único backend)
tools/guiones/    Convertidor de guiones a content.json, lista de revisión y comprobación de documentos
docs/             Documentación
```

## Comandos útiles

```bash
# Pruebas y calidad (desde la raíz; la API con `cd services/api`)
pnpm --filter @ova/web test          # pruebas de la interfaz
pnpm --filter @ova/web typecheck && pnpm --filter @ova/web lint
python -m uv run pytest              # pruebas de la API (SQLite temporal)

# Contenido y datos derivados (desde services/api)
python -m uv run python -m app.scripts.build_manifest    # manifiesto de actividades (--comprobar para verificar)
python -m uv run python -m app.scripts.build_corpus      # corpus del mentor (--comprobar para verificar)
python -m uv run python -m app.scripts.promote_docente CC 1023456789   # dar el rol docente

# Documentación (desde la raíz)
python tools/guiones/pendientes.py                       # regenera docs/revision-docente.md
python tools/guiones/comprobar_docs.py                   # enlaces, cifras y ortografía de los documentos
```

## Estado del proyecto

El avance y las tareas pendientes viven en [TODO.md](TODO.md). En resumen: el sistema funciona de extremo a extremo
con la API real y pruebas automáticas (la API y la interfaz tienen miles de pruebas), pero **falta lo que solo
personas y equipos reales pueden hacer**: validar el contenido con el docente, probar en teléfonos, probar el mentor
con una clave real, construir y desplegar con Docker y hacer una prueba piloto con estudiantes.

## Licencias y atribuciones

- **Modelo 3D de la mandíbula:** BodyParts3D (© The Database Center for Life Science), componente FJ6399,
  licencia **Creative Commons Atribución-CompartirIgual 2.1 Japón** (CC BY-SA 2.1 JP): exige atribución y que las obras
  derivadas se compartan bajo la misma licencia. La atribución aparece en las pantallas que muestran el modelo.
- **Fuentes del certificado:** DejaVu Fonts 2.37 (licencia Bitstream Vera, permisiva), incluidas con su texto de
  licencia en `services/api/app/assets/fonts/`.
- **Bibliotecas:** three.js, TresJS y las demás dependencias conservan sus propias licencias (las de la escena 3D son
  MIT). Detalle y versiones en [docs/atribuciones.md](docs/atribuciones.md).
- **Este proyecto** todavía **no declara una licencia propia** para su código ni su contenido: falta acordarla con el
  docente y la institución. Hasta entonces, no se ha concedido ningún permiso de redistribución.
