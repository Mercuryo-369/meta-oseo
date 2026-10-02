# OVA — "Metabolismo óseo: un viaje interactivo desde la célula hasta el hueso"

Objeto Virtual de Aprendizaje para ciencias de la salud. Seis módulos temáticos con
actividades interactivas obligatorias, mentor de IA, gamificación y certificado.
100 % móvil. Vue 3 + TresJS en el frontend; un único backend FastAPI + Claude.

## Entorno de desarrollo

- Windows, Git Bash. `pnpm` instalado global con npm.
- `uv` está en `C:\Users\Samuel\AppData\Roaming\Python\Python314\Scripts` y **no** está en el PATH. Anteponerlo en cada comando: `export PATH="/c/Users/Samuel/AppData/Roaming/Python/Python314/Scripts:$PATH"`, o usar `python -m uv`.
- Base de datos local (Laragon): PostgreSQL 18 en `localhost:5432`, usuario `postgres`, sin contraseña. `psql` en `/c/laragon/bin/postgresql/pgsql-18/bin/psql.exe`. Sirve para verificar migraciones contra PostgreSQL real. **Esa instancia tiene bases de otros proyectos del usuario: usar solo bases con prefijo `ova_` (`ova_dev`, `ova_test`) y nunca tocar las demás.** No trae la extensión `pgvector`: el RAG en desarrollo usa ChromaDB y en producción la imagen `pgvector/pgvector`. MySQL 8.4 también corre en Laragon pero el proyecto no lo usa.
- Contrato entre frontend y backend: [docs/api-contract.md](docs/api-contract.md). Es la fuente de verdad; cambiarlo exige tocar ambos lados.

## Documentos de contexto (leer en este orden)

1. [TODO.md](TODO.md) — sección "Estado actual" y "Siguiente tarea". Es la fuente de verdad del avance.
2. [PLAN.md](PLAN.md) — stack, estructura, contrato `ContextoPedagogico`, motor de actividades, fases.
3. [docs/briefing-pedagogico.md](docs/briefing-pedagogico.md) — requisitos del docente. No se edita sin su acuerdo.
4. [docs/referencias.md](docs/referencias.md) — repos de GitHub a reutilizar antes de escribir desde cero.

## Reglas de trabajo

- Trabajar por ID de tarea (`F1-03`). Antes de empezar, verificar que sus dependencias estén `[x]`.
- Al terminar una tarea: marcarla `[x]` en TODO.md, actualizar "Estado actual" y "Siguiente tarea".
- Cambios de stack o de contrato se anotan en "Decisiones tomadas" de TODO.md y se reflejan en PLAN.md.
- El tipo `ContextoPedagogico` (PLAN §3) está congelado desde F1-09. Cambiarlo exige actualizar PLAN.md, la store Pinia y el schema de FastAPI a la vez.
- Antes de crear un componente 3D o de RAG, revisar referencias.md por si ya existe algo portable.
- El contenido de cada módulo vive en `content.json`, no en código. Los componentes de actividad (`activities/`) son genéricos y se reutilizan en los seis módulos.
- 3D solo en mandíbula y células. Imágenes multicapa, arrastre molecular y relación de columnas van en SVG/2D y deben funcionar con touch.
- Toda entrega al docente se registra en `docs/revisiones.md` con fecha, versión, cambios pedidos y aprobación.
- Nombres de nodos GLB, ids de capas SVG, rutas y tablas en snake_case en español. Código en inglés, comentarios y docs en español.

## Stack fijo

- `apps/web`: Vue 3, Vite, TypeScript, Pinia, Vue Router, Tailwind, shadcn-vue, `@tresjs/core`, `@tresjs/cientos`, GSAP, `@vueuse/motion`, `@formkit/drag-and-drop`. Chat por SSE propio con `fetch` (sin AI SDK).
- `services/api`: Python 3.14 (el instalado en la máquina del equipo), FastAPI, SQLModel + Alembic, JWT con `PyJWT`, reportlab (certificado en PDF, Python puro y fuentes DejaVu), SDK `anthropic`, ChromaDB en dev / pgvector en prod. SQLite en dev / PostgreSQL 16 en prod. Gestión de dependencias con `uv`. Modelo `claude-opus-5`, thinking adaptativo, streaming.
- Registro de usuario: nombre, apellido, tipo de identificación, número de identificación. Sin contraseña hasta F6-08. No añadir campos sin acordarlo.
- No introducir Laravel, PHP ni un segundo backend. Todo lo de servidor va en `services/api`.

## Comandos

Backend, desde `services/api` (con `uv` en el PATH, ver "Entorno de desarrollo"):

```bash
uv run alembic upgrade head                 # crea el esquema; la API exige que exista
uv run uvicorn app.main:app --reload        # http://localhost:8000, docs en /api/docs (solo ENV=dev)
uv run pytest                               # 860+ pruebas sobre SQLite temporal (unos 3 min)
uv run ruff check . && uv run ruff format --check .
# Contra PostgreSQL real (crear antes ova_test y borrarla después; solo bases ova_*):
TEST_DATABASE_URL=postgresql://postgres@localhost:5432/ova_test uv run pytest
```

Frontend, desde la raíz del repo:

```bash
pnpm install
pnpm dev:web                                # http://localhost:5173, proxifica /api a :8000
pnpm --filter @ova/web typecheck
pnpm --filter @ova/web lint
pnpm --filter @ova/web test
# Sin backend, con sesión ficticia (solo en desarrollo; no entra al build):
VITE_DEV_BYPASS_AUTH=true pnpm --filter @ova/web exec vite --port 5180 --strictPort
```

Contenido, datos derivados y documentación (verificados el 2026-09-25):

```bash
# Desde services/api (con uv en el PATH). Regenerar y versionar cada vez que cambie un content.json o un guion:
uv run python -m app.scripts.build_manifest [--comprobar]   # actividades_manifest.json (validación del servidor)
uv run python -m app.scripts.build_corpus [--comprobar]     # corpus.jsonl del mentor (sustituye a "ingest": BM25, sin embeddings)
uv run python -m app.scripts.promote_docente CC 1023456789  # asigna el rol docente a un usuario ya registrado

# Desde la raíz del repo:
pnpm --filter @ova/web exec node scripts/validar-modulo.mjs 3          # valida un módulo (esquema, SVG); --advertencias
pnpm --filter @ova/web format:check && pnpm --filter @ova/web build     # formato y compilación de producción
uv run --no-project --with pyyaml python tools/guiones/convertir.py todos --comprobar   # guion frente a content.json (NO sobrescribe sin --forzar)
python tools/guiones/pendientes.py [--comprobar]            # regenera docs/revision-docente.md (lista de revisión del docente)
python tools/guiones/comprobar_docs.py                      # enlaces internos, cifras y ortografía básica de los documentos
uv run --no-project --with pyyaml --with pytest python -m pytest tools/guiones/tests -q   # pruebas de tools/guiones
uvx ruff check tools/guiones --config tools/guiones/ruff.toml && uvx ruff format --check tools/guiones --config tools/guiones/ruff.toml

# Docker (nunca construido; ver docs/guia-instalacion.md). Validar la configuración no exige el motor, pero sí
# SECRET_KEY y POSTGRES_PASSWORD definidas en el .env:
docker compose config
```
