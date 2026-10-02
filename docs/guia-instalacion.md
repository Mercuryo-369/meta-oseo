# Guía de instalación

Cómo poner en marcha el OVA «Metabolismo óseo» desde cero: primero en un equipo Windows (para desarrollar,
revisar o hacer una demostración) y después en un servidor con Docker Compose (para los estudiantes).

**Qué está probado y qué no.** Cada comando de la parte 1 se ejecutó el 2026-09-25 sobre una copia limpia del
repositorio, con carpetas y puertos propios (API en 8030, web en 5195). La parte 2 (Docker) **no se ha
probado nunca**: el archivo `docker-compose.yml` y los Dockerfile se escribieron y se validaron solo en estático
(`docker compose config`), y en el equipo de desarrollo el motor de Docker ni siquiera estaba encendido. Al final
hay una lista de lo que no se pudo verificar.

- [1. Instalación local en Windows](#1-instalación-local-en-windows)
- [2. Configuración: el archivo `.env`](#2-configuración-el-archivo-env)
- [3. Base de datos: SQLite o PostgreSQL](#3-base-de-datos-sqlite-o-postgresql)
- [4. El mentor de IA](#4-el-mentor-de-ia)
- [5. Primer usuario docente](#5-primer-usuario-docente)
- [6. Despliegue con Docker Compose](#6-despliegue-con-docker-compose)
- [7. HTTPS detrás de un proxy](#7-https-detrás-de-un-proxy)
- [8. Copias de seguridad](#8-copias-de-seguridad)
- [9. Actualizar a una versión nueva](#9-actualizar-a-una-versión-nueva)
- [10. Regenerar el manifiesto y el corpus del mentor](#10-regenerar-el-manifiesto-y-el-corpus-del-mentor)
- [11. Problemas frecuentes](#11-problemas-frecuentes)
- [12. Lo que no se pudo probar](#12-lo-que-no-se-pudo-probar)

## 1. Instalación local en Windows

### Requisitos

| Programa | Versión | Para qué | Cómo comprobarlo |
|---|---|---|---|
| Node.js | 22 o superior (probado con 24.14) | Compilar y servir la interfaz | `node --version` |
| pnpm | 12.6.0 (la que fija `package.json`) | Instalar las dependencias de la interfaz | `pnpm --version` |
| Python | 3.14 (probado con 3.14.3) | La API | `python --version` |
| uv | 0.12.18 (probado) | Instalar las dependencias de Python | `python -m uv --version` |
| Git | cualquiera | Solo si se descarga con `git clone` | `git --version` |
| Docker Desktop | reciente | Solo para la parte 2 | `docker --version` |

Se abre una terminal (PowerShell o Git Bash). Los comandos de esta guía valen en ambas salvo donde se indica.

### Paso 1. Instalar los programas

1. **Node.js**: instalador LTS desde <https://nodejs.org>. Se cierra y se vuelve a abrir la terminal.
2. **pnpm**: `npm install --global pnpm@12.6.0`.
3. **Python 3.14**: instalador de <https://www.python.org/downloads/> con la casilla «Add python.exe to PATH».
4. **uv**: `python -m pip install --user uv`.

   El programa queda en `C:\Users\<usuario>\AppData\Roaming\Python\Python314\Scripts`, carpeta que **no** está en el
   PATH. Hay dos salidas: agregar esa carpeta al PATH, o escribir siempre `python -m uv` en lugar de `uv`. Esta guía
   usa `python -m uv`, que funciona en cualquier terminal.

### Paso 2. Obtener el código y preparar la configuración

```powershell
git clone <dirección-del-repositorio> ova
cd ova
Copy-Item .env.example .env        # en Git Bash: cp .env.example .env
```

Si el código llegó en un .zip, basta con descomprimirlo y entrar a la carpeta. El archivo `.env` (en la raíz del
proyecto) guarda la configuración y **nunca se sube a Git**. Con los valores de ejemplo ya funciona para
desarrollo; la parte 2 explica qué cambiar.

### Paso 3. Instalar y arrancar la API (backend)

```powershell
cd services\api
python -m uv sync                          # instala las dependencias de Python (unos segundos)
python -m uv run alembic upgrade head      # crea la base de datos con todas sus tablas
python -m uv run uvicorn app.main:app --reload
```

La API queda en <http://localhost:8000>. Se comprueba abriendo <http://localhost:8000/api/health>, que debe
responder `{"status":"ok","env":"dev","version":"0.1.0"}`. La documentación interactiva de la API está en
<http://localhost:8000/api/docs> (solo con `ENV=dev`: en producción se desactiva).

Sin ninguna configuración, la base es un archivo SQLite en `services/api/data/ova.db` (se crea solo en el paso
`alembic upgrade head`). Esta terminal queda ocupada por la API: se abre otra para lo siguiente.

Para arrancar en otro puerto (por ejemplo, si el 8000 está ocupado) se añade `--port 8030` y, al arrancar la
interfaz, se indica dónde está la API con la variable `API_PROXY_TARGET` (ver «Problemas frecuentes»).

### Paso 4. Instalar y arrancar la interfaz (frontend)

En otra terminal, desde la raíz del proyecto:

```powershell
pnpm install          # unos segundos (la primera vez descarga las dependencias)
pnpm dev:web          # en Git Bash y PowerShell
```

La interfaz queda en <http://localhost:5173>. Vite reenvía todo lo que empieza por `/api` a la API del paso
anterior, por eso el navegador siempre habla con un solo origen.

Se abre <http://localhost:5173>, aparece la pantalla de acceso y se puede registrar un usuario de prueba.

### Paso 5. Comprobar que todo funciona

| Comprobación | Resultado esperado |
|---|---|
| <http://localhost:8000/api/health> | `{"status":"ok",...}` |
| <http://localhost:5173/api/health> | El mismo JSON (la interfaz reenvía a la API) |
| Registrarse en <http://localhost:5173> con nombre, apellido, tipo y número de documento | Se llega al inicio (saluda con el nombre, por ejemplo «Hola, Ana») con los seis módulos |
| `/certificado` de un usuario nuevo | Muestra los módulos y los puntos que faltan (2 900 puntos obligatorios en total) |
| Preguntar algo al mentor **sin** `ANTHROPIC_API_KEY` | Mensaje «El mentor de IA no está disponible en este momento» (es lo esperado, ver parte 4) |

### Pruebas automáticas (opcional)

```powershell
cd services\api
python -m uv run pytest                    # pruebas de la API (SQLite temporal)
cd ..\..
pnpm --filter @ova/web test                # pruebas de la interfaz
pnpm --filter @ova/web typecheck           # revisión de tipos
pnpm --filter @ova/web build               # compila a apps\web\dist (unos 20 s)
```

Las pruebas de la API con PostgreSQL se describen en la parte 3.

## 2. Configuración: el archivo `.env`

La API lee el archivo `.env` de la **raíz del proyecto** al arrancar. Una variable de entorno del sistema tiene
prioridad sobre el archivo. **Después de cambiar el `.env` hay que reiniciar la API** (la configuración se lee una
sola vez).

| Variable | Valor de ejemplo | Qué hace |
|---|---|---|
| `ENV` | `dev` | `dev` o `prod`. Con `prod` la API se niega a arrancar si `SECRET_KEY` es la de ejemplo o mide menos de 32 caracteres, o si `PUBLIC_BASE_URL` apunta a `localhost` o `127.0.0.1` |
| `SECRET_KEY` | (cadena larga y aleatoria) | Firma las sesiones de los estudiantes. Si se cambia, todas las sesiones abiertas dejan de valer |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` | Duración de una sesión: 7 días |
| `DATABASE_URL` | `sqlite:///./data/ova.db` | Base de datos (parte 3) |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Orígenes permitidos por CORS, separados por coma. Con nginx (Docker) el navegador usa un solo origen y casi no interviene |
| `TRUST_PROXY` | `false` | `true` solo detrás de un proxy que **sobrescribe** `X-Forwarded-For` (Docker Compose ya lo hace) |
| `ANTHROPIC_API_KEY` | (vacía) | Clave del mentor de IA. Vacía, el mentor responde 503 y el resto del sistema funciona |
| `ANTHROPIC_MODEL` | `claude-opus-5` | Modelo del mentor |
| `MENTOR_EFFORT` | `medium` | Cuánto «piensa» el mentor: `low`, `medium`, `high`, `xhigh` o `max` (más esfuerzo cuesta más y tarda más) |
| `MENTOR_MAX_TOKENS` | `16000` | Tope de tokens por respuesta |
| `MENTOR_SERVER_FALLBACK` | `true` | Ver parte 4 |
| `MENTOR_MAX_MENSAJES_DIA` | `60` | Mensajes al mentor por estudiante y día (calendario de Colombia). `0` = sin límite |
| `MENTOR_RAG_TOP_K` | `5` | Fragmentos del curso que se le pasan al mentor por pregunta (1 a 10) |
| `RAG_BACKEND` | `bm25` | Motor de búsqueda del mentor. Hoy solo funciona `bm25`; `pgvector` está reservado y la API se niega a arrancar con él |
| `CERT_MIN_PORCENTAJE` | `70` | Porcentaje mínimo del puntaje de las actividades obligatorias para el certificado |
| `PUBLIC_BASE_URL` | `http://localhost:5173` | Dirección pública del sitio; va impresa en el PDF del certificado como enlace de verificación. **Con `ENV=prod` no puede ser `localhost` ni `127.0.0.1`** (la API no arranca) y Docker Compose la exige |
| `PRECIO_ENTRADA_USD_POR_MTOK`, `PRECIO_SALIDA_USD_POR_MTOK` | `5` y `25` | Precios para **estimar** el costo del mentor en el panel del docente |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `ova` | Solo Docker Compose (parte 2) |

Para generar una `SECRET_KEY` segura:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

**Antes de publicar.** El `.env.example` trae valores de desarrollo. Abre su sección «CAMBIAR OBLIGATORIAMENTE ANTES
DE PUBLICAR»: `SECRET_KEY`, `POSTGRES_PASSWORD`, `PUBLIC_BASE_URL` y `ALLOWED_ORIGINS` (el archivo explica cómo generar
cada valor). Para `POSTGRES_PASSWORD` sirve el mismo comando, o una contraseña alfanumérica larga.

**Bloqueo por secuencia.** No es una variable de la API: es una constante de la interfaz que Vite incrusta **al
compilar**, y por eso cambiarla exige compilar o reconstruir. `VITE_BLOQUEO_SECUENCIAL=true` (por defecto) exige
completar cada módulo para abrir el siguiente; `false` deja los seis abiertos, y cualquier otro valor equivale a `true`.

- **Desarrollo:** `$env:VITE_BLOQUEO_SECUENCIAL="false"; pnpm dev:web` (en Git Bash:
  `VITE_BLOQUEO_SECUENCIAL=false pnpm dev:web`).
- **Docker Compose:** se escribe en el `.env` de la raíz (`VITE_BLOQUEO_SECUENCIAL=false`) y se reconstruye la imagen
  de la interfaz: `docker compose build web` y luego `docker compose up -d`. Compose la pasa como argumento de
  construcción (`ARG` del `apps/web/Dockerfile`); reiniciar sin reconstruir no cambia nada.

La [guía del docente](guia-docente.md) explica cuándo conviene y la alternativa más sencilla: usar una cuenta de
docente, que ve todo abierto.

## 3. Base de datos: SQLite o PostgreSQL

**SQLite (por defecto).** No hay nada que instalar: un archivo, `services/api/data/ova.db`. Sirve para desarrollo, para
revisar el contenido y para un grupo pequeño. Está ignorado por Git.

**PostgreSQL.** Es lo que usa el despliegue con Docker. Para probarlo en un PostgreSQL propio (versión 16 o superior),
sin Docker:

1. Se crea una base vacía, por ejemplo `ova`:

   ```powershell
   psql -h localhost -U postgres -c "CREATE DATABASE ova"
   ```

2. Se cambia `DATABASE_URL` en el `.env` (o se define solo para ese comando):

   ```dotenv
   DATABASE_URL=postgresql://postgres@localhost:5432/ova
   ```

   Se acepta `postgresql://...`; la API lo convierte al controlador `psycopg`. Si la contraseña tiene caracteres
   especiales (`@ : / ? # %`), se escribe codificada en la URL.
3. Se crean las tablas con el mismo comando de siempre: `python -m uv run alembic upgrade head`.

Comprobado el 2026-09-25 contra PostgreSQL 18 (Laragon): las tres migraciones se aplican y crean las diez tablas
(`users`, `progress_modulos`, `activity_results`, `achievements`, `user_achievements`, `certificates`,
`chat_sessions`, `chat_messages`, `usage_events` y `alembic_version`). Para las pruebas de la API contra PostgreSQL:

```powershell
$env:TEST_DATABASE_URL = "postgresql://postgres@localhost:5432/ova_test"
python -m uv run pytest
```

La base de pruebas **debe llamarse con el prefijo `ova_`** (la suite se niega a usar otra, para no tocar bases de
otros proyectos) y ya debe existir. La suite recrea el esquema al empezar y **vacía las tablas antes de cada
prueba**: nunca se apunta a una base con datos reales.

**pgvector.** La extensión `vector` solo la trae la imagen `pgvector/pgvector` de Docker. Hoy **no se usa**: el mentor
busca con BM25 (Python puro, sin extensiones) y funciona con cualquier PostgreSQL. La extensión se crea igualmente al
inicializar el contenedor para cuando se migre la búsqueda a vectores.

## 4. El mentor de IA

El mentor es el único componente que necesita una cuenta externa (Anthropic) y el único que cuesta dinero por uso.

1. Se crea una clave de API en <https://console.anthropic.com> y se pone en el `.env`:

   ```dotenv
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. Se reinicia la API.
3. En la aplicación, el botón del mentor abre el chat; una pregunta debe responder en streaming (el texto va
   apareciendo) y mostrar «Fuentes» con enlaces a las secciones del curso.

**`MENTOR_SERVER_FALLBACK`.** Es una función beta de Anthropic: si un clasificador de seguridad rechaza una consulta,
la reintenta con otro modelo en el propio servidor de Anthropic. Viene activada (`true`). Si la cuenta de la organización
no la tiene habilitada, **cada consulta fallará**: en ese caso se pone `MENTOR_SERVER_FALLBACK=false` y se reinicia.

**Costo y límites.** Cada estudiante tiene un tope diario de mensajes (`MENTOR_MAX_MENSAJES_DIA`) y un límite de
20 por minuto. El panel del docente muestra los tokens y una **estimación** del costo con los precios del `.env`;
la factura real la emite Anthropic.

> **Aviso honesto:** el mentor **nunca se ha probado con una clave real**. Todo su funcionamiento (transmisión,
> citas, límites, guardado de conversaciones) se comprobó con un servidor de Anthropic simulado. Antes de
> mostrárselo a estudiantes hay que hacer una prueba real con unas cuantas preguntas y comprobar que responde con
> el material del curso, que no resuelve las actividades y que el modelo acepta los parámetros configurados.

## 5. Primer usuario docente

El rol de docente **no se puede pedir desde la aplicación**: se asigna desde la línea de comandos a un usuario que
ya se registró.

1. La persona se registra en la aplicación (pantalla de acceso: nombre, apellido, tipo y número de documento).
2. Se ejecuta, desde `services\api`:

   ```powershell
   python -m uv run python -m app.scripts.promote_docente CC 1023456789
   ```

   (con el tipo y el número reales; los puntos y guiones del número se ignoran). Debe responder
   `Listo: <nombre> <apellido> (CC 1023456789) ahora es docente.` Es idempotente: repetirlo no hace daño.
3. La persona vuelve a entrar (o recarga la página): aparece el enlace **Panel docente** en la cabecera.

Códigos de salida del comando: `0` listo, `1` el usuario no existe, `2` argumentos inválidos (por ejemplo, un tipo
que no está en la lista), `3` la base no está lista (falta `alembic upgrade head`).

En Docker el comando se ejecuta dentro del contenedor de la API (parte 6):
`docker compose exec api python -m app.scripts.promote_docente CC 1023456789`.

### Ver el certificado y el panel con datos de prueba

Completar los seis módulos a mano lleva unas 6 horas. Para ver el certificado, el PDF y el panel del docente
con datos, este guion de Python (solo biblioteca estándar) registra un estudiante de **prueba**, completa las
<!--c:actividades-->128<!--/c--> actividades con puntaje máximo, marca los seis módulos como completados y emite el certificado. Se ejecuta
desde la raíz del proyecto, con la API encendida. **Solo en una base de pruebas**: deja datos falsos que cuentan en las
estadísticas del panel. Se probó el 2026-09-25 contra una API en el puerto 8030 con una base SQLite propia.

```python
import json, sys, urllib.request

API = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"


def llamar(metodo, ruta, cuerpo=None, token=None):
    cabeceras = {"Content-Type": "application/json"}
    if token:
        cabeceras["Authorization"] = f"Bearer {token}"
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    peticion = urllib.request.Request(API + ruta, data=datos, method=metodo, headers=cabeceras)
    with urllib.request.urlopen(peticion) as respuesta:
        return json.load(respuesta)


token = llamar("POST", "/api/auth/register", {"nombre": "Estudiante", "apellido": "De Prueba",
               "tipo_identificacion": "CC", "numero_identificacion": "12345678"})["access_token"]
manifiesto = json.load(open("services/api/app/data/actividades_manifest.json", encoding="utf-8"))
for id_, a in manifiesto["actividades"].items():
    llamar("POST", f"/api/activities/{id_}/result", {"modulo": a["modulo"], "tipo": a["tipo"],
           "puntaje": a["puntaje_max"], "intentos": 1, "completada": True}, token)
for modulo in range(1, 7):
    llamar("PUT", f"/api/progress/{modulo}", {"completado": True}, token)
print("Código del certificado:", llamar("POST", "/api/certificate", None, token)["certificado"]["codigo"])
```

Se guarda como `simular.py` (fuera de `apps/` y `services/`) y se ejecuta con `python simular.py`; para otra API,
`python simular.py http://127.0.0.1:8030`. Después se entra a la aplicación con **CC 12345678**: `/certificado` muestra el
certificado emitido, se descarga el PDF y `/verify/<código>` lo valida. Para repetirlo hay que usar otro número de
documento o una base nueva (el registro rechaza un documento repetido). Se usa `127.0.0.1` y no `localhost` porque en
Windows el nombre puede tardar cerca de un segundo por petición (se probó: más de 2 minutos con `localhost` frente a
1 segundo con `127.0.0.1`).

## 6. Despliegue con Docker Compose

> **No probado.** Todo esta parte se basa en `docker-compose.yml`, `services/api/Dockerfile`,
> `apps/web/Dockerfile`, `apps/web/nginx.conf` y `docker/initdb/01-extensiones.sql`, revisados pero **nunca
> construidos ni ejecutados**. Es la primera cosa que puede fallar al desplegar; la tarea F6-10 del `TODO.md` es
> justamente probarlo. Lo único verificado es que `docker compose config` interpola las variables y que rechaza el
> arranque sin `SECRET_KEY`, `POSTGRES_PASSWORD` ni `PUBLIC_BASE_URL`.

### Qué levanta

| Servicio | Imagen | Función | Puerto |
|---|---|---|---|
| `db` | `pgvector/pgvector:pg16` | PostgreSQL 16 con la extensión pgvector | Ninguno hacia afuera |
| `api` | Se construye de `services/api` (Python 3.14) | La API; al arrancar aplica las migraciones (`alembic upgrade head`) | Ninguno hacia afuera |
| `web` | Se construye de `apps/web` (Node 22, luego nginx) | Sirve la interfaz y reenvía `/api` a la API | **8080** |

Solo se publica el puerto **8080**. La base y la API quedan dentro de la red de Compose, así que no chocan con un
PostgreSQL local en el 5432.

### Pasos

Requisitos: Docker Desktop (Windows) o Docker Engine con el plugin Compose (Linux).

1. `Copy-Item .env.example .env` y se **editan estas variables** en el `.env`:

   | Variable | Qué poner | Por qué |
   |---|---|---|
   | `SECRET_KEY` | Una cadena aleatoria de 32 caracteres o más (comando de la parte 2) | **Obligatoria.** Sin ella (o con la de ejemplo), Compose o la API se niegan a arrancar |
   | `POSTGRES_PASSWORD` | Una contraseña alfanumérica, distinta de `ova` | **Obligatoria.** Va dentro de una URL: evitar `@ : / ? # %` |
   | `PUBLIC_BASE_URL` | La dirección con la que los estudiantes abren el sitio, sin barra final (`https://ova.ejemplo.edu.co`) | **Obligatoria.** Es el enlace de verificación que se imprime en cada certificado. Compose no arranca sin ella y la API tampoco si apunta a `localhost` o `127.0.0.1` |
   | `ALLOWED_ORIGINS` | La misma dirección | El valor de ejemplo apunta al 5173 |
   | `VITE_BLOQUEO_SECUENCIAL` | `true` (por defecto) o `false` | Opcional. Se aplica al **construir** la interfaz (parte 2): tras cambiarla, `docker compose build web` |
   | `ANTHROPIC_API_KEY` | La clave del mentor (opcional) | Sin ella, el mentor responde 503 |

   Compose lee el `.env` solo para rellenar las variables del `docker-compose.yml`; `ENV=dev` y el `DATABASE_URL` de
   SQLite del ejemplo **no** llegan a la API (ella recibe `ENV=prod` y la URL de PostgreSQL).

   > Cuidado: el `.env.example` trae `PUBLIC_BASE_URL` y `ALLOWED_ORIGINS` de desarrollo (`http://localhost:5173`).
   > Con el valor de ejemplo la API **se niega a arrancar** (`PUBLIC_BASE_URL apunta a localhost o 127.0.0.1`) para que
   > ningún certificado salga con un enlace de verificación que no existe. Para una prueba en el mismo equipo, usa la
   > IP de la red local (`http://192.168.1.20:8080`) o un nombre como `http://ova.local:8080` y ábrelo con esa
   > dirección; `ALLOWED_ORIGINS` es la misma. `SECRET_KEY` y `POSTGRES_PASSWORD` también deben cambiarse (`ova` es
   > una contraseña conocida).

2. Se valida la configuración (no necesita que Docker esté encendido):

   ```powershell
   docker compose config
   ```

   Debe imprimir la configuración completa sin errores. Si falta `SECRET_KEY`, `POSTGRES_PASSWORD` o
   `PUBLIC_BASE_URL`, se detiene con un mensaje que dice cuál.
3. Se construye y se arranca:

   ```powershell
   docker compose up --build -d
   docker compose ps                 # db, api y web deben estar «running» y api/db «healthy»
   docker compose logs -f api        # se ve alembic aplicando las migraciones y luego uvicorn
   ```

4. Se abre <http://localhost:8080> (o la dirección pública). Se comprueba `http://localhost:8080/api/health`.
5. Se registra el primer usuario en la aplicación y se le da el rol docente:

   ```powershell
   docker compose exec api python -m app.scripts.promote_docente CC 1023456789
   ```

### Cosas que conviene saber

- **Los datos viven en el volumen `pgdata`.** `docker compose down` los conserva; **`docker compose down -v` los
  borra**. Antes de cualquier operación destructiva, una copia de seguridad (parte 8).
- **Un solo proceso de la API.** El límite de intentos por IP vive en la memoria del proceso; con varios procesos
  cada uno llevaría su propia cuenta. El contenedor ya arranca con uno solo.
- **El puerto 8080** puede cambiarse en `docker-compose.yml` (`"8080:8080"` → `"80:8080"`, por ejemplo).
- **Modelo del mentor, esfuerzo, límites y precios** se pasan por el mismo `.env` (`ANTHROPIC_MODEL`,
  `MENTOR_EFFORT`, `MENTOR_MAX_MENSAJES_DIA`...; todas figuran en `docker-compose.yml`). Una variable que **no** figura
  allí (por ejemplo `PRECIO_ENTRADA_USD_POR_MTOK`) no llega al contenedor: habría que añadirla a la sección
  `environment` de `api`.
- **El manifiesto y el corpus del mentor viajan dentro de la imagen** (carpeta `services/api/app/data`). Si cambia el
  contenido, hay que regenerarlos y reconstruir la imagen (parte 10).
- **pgvector:** la extensión se crea sola la primera vez (`docker/initdb/01-extensiones.sql`). Si el volumen ya existía
  de antes, se crea a mano: `docker compose exec db psql -U ova -d ova -c "CREATE EXTENSION IF NOT EXISTS vector"`.

## 7. HTTPS detrás de un proxy

El contenedor `web` habla HTTP en el puerto 8080. Para servir el OVA a estudiantes hace falta HTTPS (además, los
navegadores solo permiten algunas funciones en páginas seguras). La forma recomendada es un proxy inverso delante
que termine el TLS: Caddy, nginx, Traefik o el balanceador del proveedor de nube.

Ejemplo con Caddy (obtiene el certificado por sí solo; **no probado**), en el servidor donde corre Compose:

```caddyfile
ova.ejemplo.edu.co {
    reverse_proxy localhost:8080
}
```

Lo que hay que ajustar:

1. `PUBLIC_BASE_URL=https://ova.ejemplo.edu.co` y `ALLOWED_ORIGINS=https://ova.ejemplo.edu.co` en el `.env`.
2. **La IP del estudiante.** El nginx de dentro de Compose sobrescribe `X-Forwarded-For` con la IP de quien le
   habla; con un proxy delante, esa IP es la del proxy y el límite de intentos por IP (acceso, verificación de
   certificados) contaría a **todos los estudiantes como uno solo**. La solución está comentada en
   `apps/web/nginx.conf`: declarar la red del proxy con `set_real_ip_from <red del proxy>;`,
   `real_ip_header X-Forwarded-For;` y `real_ip_recursive on;`. Es un cambio del archivo (y reconstruir la imagen
   `web`).
3. **Sin buffer para el chat del mentor.** El chat usa Server-Sent Events; si el proxy acumula la respuesta, el texto
   aparecería de golpe al final. Caddy lo transmite tal cual; con nginx delante se añade `proxy_buffering off;` en la
   ruta `/api/chat`.
4. **HSTS y redirección de HTTP a HTTPS** se configuran en el proxy, no en el nginx de la imagen (no ponen HSTS a
   propósito).
5. **Incrustar el OVA en otra plataforma** (Moodle, por ejemplo) exige permitirlo: `X-Frame-Options` y
   `frame-ancestors` de `apps/web/nginx.conf` solo aceptan el propio sitio.

## 8. Copias de seguridad

Lo que hay que respaldar es la **base de datos** (usuarios, progreso, puntajes, certificados y conversaciones del
mentor). El contenido de los módulos está en el repositorio, no en la base. Los certificados ya emitidos se pueden
regenerar mientras exista su fila.

**Docker (PostgreSQL).** Los comandos se dan sin redirecciones (`>`), porque en PowerShell estas dañan los archivos
binarios:

```powershell
# Hacer la copia (formato comprimido de PostgreSQL)
docker compose exec db pg_dump -U ova -d ova -Fc -f /tmp/ova.dump
docker compose cp db:/tmp/ova.dump ./copia_ova_2026-09-25.dump
docker compose exec db rm /tmp/ova.dump

# Restaurar sobre una base vacía (o pisando la actual)
docker compose cp ./copia_ova_2026-09-25.dump db:/tmp/restaurar.dump
docker compose exec db pg_restore -U ova -d ova --clean --if-exists /tmp/restaurar.dump
```

Si se cambió `POSTGRES_USER` o `POSTGRES_DB`, se usan esos nombres en lugar de `ova`. Se recomienda una copia diaria
programada (Programador de tareas o `cron`) guardada **fuera** del servidor, y probar la restauración al menos una
vez. Las banderas de `pg_dump` y `pg_restore` se probaron el 2026-09-25 contra el PostgreSQL local (copia y
restauración sobre una base nueva); los comandos con `docker compose` **no** se probaron.

**SQLite (desarrollo o grupos pequeños).** Se detiene la API y se copia el archivo `services/api/data/ova.db`. Con
la API encendida, la copia puede quedar a medias.

## 9. Actualizar a una versión nueva

1. Copia de seguridad (parte 8).
2. Se obtiene el código nuevo (`git pull` o el .zip nuevo). Se conserva el `.env`.
3. Si cambió algún `content.json`, se regeneran el manifiesto y el corpus (parte 10) y se versionan.
4. `docker compose up --build -d`. Al arrancar, la API aplica las migraciones pendientes (`alembic upgrade head`),
   así que no hay paso manual.
5. Se comprueba `http://<sitio>/api/health` y se abre un módulo.

Las sesiones abiertas de los estudiantes siguen valiendo mientras no cambie `SECRET_KEY`. No hay procedimiento
probado para volver atrás: si una actualización sale mal, se restaura la copia de seguridad y se reconstruye la
versión anterior.

En desarrollo local basta con `git pull`, `python -m uv sync`, `python -m uv run alembic upgrade head` y
`pnpm install`.

## 10. Regenerar el manifiesto y el corpus del mentor

Son dos archivos derivados del contenido de los módulos. Se **versionan** (viajan en la imagen) y hay que
regenerarlos cada vez que cambie un `content.json`:

| Archivo | Para qué sirve | Cuándo regenerarlo |
|---|---|---|
| `services/api/app/data/actividades_manifest.json` (manifiesto) | La API valida con él los resultados, el progreso y el certificado: conoce cada actividad, su tipo y su puntaje máximo | Si cambia el `id`, el tipo, el `puntaje_max` o `obligatoria` de una actividad |
| `services/api/app/data/corpus.jsonl` (corpus) | Los fragmentos del curso entre los que busca el mentor | Si cambia cualquier texto, glosario u objetivo de un módulo, o el banco de preguntas y los ganchos de un guion |

Desde `services\api`:

```powershell
python -m uv run python -m app.scripts.build_manifest              # escribe el manifiesto
python -m uv run python -m app.scripts.build_corpus                # escribe el corpus
python -m uv run python -m app.scripts.build_manifest --comprobar  # solo verifica: 0 = al día, 1 = desactualizado
python -m uv run python -m app.scripts.build_corpus --comprobar
```

Los dos leen `apps/web/src/modules/m*/content.json` (y el corpus también los guiones). Si el contenido es inválido,
salen con código 2. Si el manifiesto está desactualizado, la API sigue funcionando, pero puede **rechazar resultados
de una actividad nueva** (`actividad_desconocida`) o no reconocer un módulo como completo. La integración continua
(`.github/workflows/ci.yml`) ejecuta `build_manifest --comprobar` y `build_corpus --comprobar` para que no se olvide.

Después de regenerar, se reinicia la API (en local) o se reconstruye la imagen (Docker).

## 11. Problemas frecuentes

| Síntoma | Causa probable y solución |
|---|---|
| `uv` «no se reconoce como un comando» | La carpeta de scripts de Python no está en el PATH. Usar `python -m uv ...` |
| `alembic` dice que la base no existe o no hay tablas | No se ejecutó `python -m uv run alembic upgrade head` desde `services\api` |
| La interfaz carga pero todo da error de red | La API no está encendida, o corre en otro puerto: reiniciar la interfaz con `$env:API_PROXY_TARGET="http://localhost:8030"; pnpm dev:web` (en Git Bash: `API_PROXY_TARGET=http://localhost:8030 pnpm dev:web`) |
| El puerto 5173 o 8000 está ocupado | Cerrar el programa que lo usa o arrancar en otro puerto: `pnpm --filter @ova/web exec vite --port 5195` y `uvicorn ... --port 8030` |
| La API termina al arrancar con «SECRET_KEY tiene el valor por defecto» | Con `ENV=prod` hace falta una clave propia (parte 2) |
| La API termina al arrancar con «PUBLIC_BASE_URL apunta a localhost o 127.0.0.1» | Con `ENV=prod` hace falta la dirección pública del sitio (parte 2 y parte 6). Es la que va impresa en el certificado |
| El mentor responde «no está disponible» | Falta `ANTHROPIC_API_KEY` (o no se reinició la API tras ponerla) |
| El mentor da error en cada consulta con clave válida | Probar `MENTOR_SERVER_FALLBACK=false` (parte 4) |
| Un estudiante ve «Contenido en revisión» en cada módulo | Es intencional mientras el módulo no esté `aprobado` (guía del docente) |
| El módulo 2 aparece bloqueado | Es el bloqueo por secuencia: hay que completar el módulo 1. Una cuenta de docente lo ve todo abierto |
| Docker: «required variable SECRET_KEY is missing» (o `POSTGRES_PASSWORD`, `PUBLIC_BASE_URL`) | Falta la variable en el `.env` de la raíz |
| Cambié `VITE_BLOQUEO_SECUENCIAL` en el `.env` y el sitio sigue igual | Se aplica al compilar: `docker compose build web` y `docker compose up -d` |
| Docker: la API queda «unhealthy» | `docker compose logs api`: casi siempre es la `SECRET_KEY` o la conexión a la base |
| `pnpm install` pide aprobar scripts de compilación | Ya está resuelto en `pnpm-workspace.yaml`; usar `pnpm install --frozen-lockfile` |

## 12. Lo que no se pudo probar

Para no dar por hecho lo que nadie ejecutó:

- **Docker: construir las imágenes y levantar el conjunto.** Nunca se ha hecho. Se validó `docker compose config`
  (interpolación de variables y rechazo sin `SECRET_KEY`), pero el motor de Docker no estaba en marcha en el equipo
  de desarrollo. Tampoco se ejecutó nginx con la configuración de `apps/web/nginx.conf` ni la política CSP dentro de
  un navegador.
- **Las copias de seguridad y restauración con `docker compose exec/cp`.** Solo se probaron las banderas de
  `pg_dump`/`pg_restore` contra el PostgreSQL local.
- **HTTPS con proxy (Caddy) y el ajuste de la IP real.** Solo está descrito.
- **El mentor con una clave real de Anthropic** (ver parte 4) y el `MENTOR_SERVER_FALLBACK` con la beta habilitada.
- **Instalación en Linux o macOS.** Todo se probó en Windows 11; los comandos de Python y Node son los mismos, pero no se
  ejecutaron allí.
- **La parte de pgvector.** No se usa hoy y no se ha ejercitado.
- **Un teléfono real.** Ver `docs/entrega.md`.
