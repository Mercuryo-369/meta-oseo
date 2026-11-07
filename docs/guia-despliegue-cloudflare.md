# Guía de despliegue en Cloudflare Workers

Desde el 2026-11-07 el OVA completo (interfaz, API y base de datos) se despliega en Cloudflare, sin
servidor propio y dentro del plan gratuito:

| Pieza | Dónde corre | Código |
|---|---|---|
| Interfaz (SPA de Vue) | Assets estáticos del Worker | `apps/web` (compilada en `apps/web/dist`) |
| API (`/api/*`) | Cloudflare Worker (TypeScript, Hono) | `services/worker` |
| Base de datos | Cloudflare D1 (SQLite) | `services/worker/migrations` |
| Límites por IP y por usuario | Binding Rate Limiting de Cloudflare | `services/worker/wrangler.json` |
| Mentor de IA | El Worker llama a la API de Anthropic con streaming | `services/worker/src/ai` |

La API de Python (`services/api`) queda en el repositorio como referencia y como origen de los datos
derivados (manifiesto de actividades, corpus del mentor y preguntas abiertas, que el Worker importa de
`services/api/app/data`). El contrato `docs/api-contract.md` no cambia: es el mismo para las dos.

## 1. Requisitos

- Una cuenta de Cloudflare (gratuita) con el dominio del OVA agregado (zona en Cloudflare).
- Node 22 y pnpm (los mismos del desarrollo). Wrangler viene con `services/worker`.
- La clave de Anthropic para el mentor (opcional: sin ella el mentor avisa que no está configurado y
  todo lo demás funciona).

## 2. Primera vez (desde tu equipo)

Todos los comandos se ejecutan en `services/worker`.

```bash
cd services/worker
npx wrangler login                         # abre el navegador; inicia sesión en tu cuenta
npx wrangler d1 create ova                 # crea la base; copia el `database_id` que imprime
```

Pega ese `database_id` en `wrangler.json` (campo `d1_databases[0].database_id`). Luego:

```bash
npx wrangler d1 migrations apply ova --remote        # crea las tablas en la base real
npx wrangler secret put SECRET_KEY                   # pega una cadena aleatoria de 32+ caracteres
npx wrangler secret put ANTHROPIC_API_KEY            # opcional: la clave del mentor
```

Para generar la clave secreta: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

Variables públicas (en `wrangler.json`, sección `vars`): `PUBLIC_BASE_URL` debe ser la dirección con
la que los estudiantes abren el sitio, sin barra final (`https://ova.tudominio.edu.co`): es el enlace
de verificación que se imprime en cada certificado. `ANTHROPIC_MODEL`, `MENTOR_MAX_MENSAJES_DIA`,
`MENTOR_MAX_QUIZ_DIA`, `CERT_MIN_PORCENTAJE` y los precios para estimar el costo del mentor son
opcionales (valores por defecto en `src/core/entorno.ts`).

## 3. Desplegar (cada versión)

Desde la raíz del repositorio:

```bash
pnpm deploy          # compila la interfaz (apps/web/dist) y despliega el Worker con sus assets
```

Equivale a `pnpm --filter @ova/web build && pnpm --filter @ova/worker deploy`. Si cambió un
`content.json` o un guion, antes regenerar los datos derivados (ver «Contenido» en `CLAUDE.md`):
el Worker los empaqueta en cada despliegue.

Si hay migraciones nuevas en `services/worker/migrations`, aplicarlas antes con
`npx wrangler d1 migrations apply ova --remote` (las ya aplicadas se omiten).

## 4. Dominio

En el panel de Cloudflare: Workers & Pages → `ova-metabolismo-oseo` → Settings → Domains & Routes →
Add → Custom domain → `ova.tudominio.edu.co`. Cloudflare crea el DNS y el certificado HTTPS solos.
Después actualiza `PUBLIC_BASE_URL` en `wrangler.json` y vuelve a desplegar.

## 5. Rol docente

El rol docente no se autoasigna. Con el docente ya registrado en el sitio (tipo y número de
identificación), desde `services/worker`:

```bash
npx wrangler d1 execute ova --remote --command "UPDATE users SET rol = 'docente' WHERE tipo_identificacion = 'CC' AND numero_identificacion = '1023456789'"
```

El número va normalizado (sin puntos ni guiones, en mayúsculas). Para volverlo estudiante, el
mismo comando con `rol = 'estudiante'`.

## 6. Copias de seguridad

```bash
npx wrangler d1 export ova --remote --output copia_ova_AAAA-MM-DD.sql     # volcado SQL completo
npx wrangler d1 execute ova --remote --file copia_ova_AAAA-MM-DD.sql       # restaurar sobre una base vacía
```

## 7. Desarrollo local del Worker

```bash
cd services/worker
cp .dev.vars.example .dev.vars                       # ENV=dev y una SECRET_KEY local
npx wrangler d1 migrations apply ova --local         # base local en .wrangler/state
pnpm --filter @ova/web build                         # el Worker sirve apps/web/dist
npx wrangler dev --port 8787                         # http://127.0.0.1:8787 (interfaz + API)
```

Con `ENV=dev` se admite una clave secreta corta. La interfaz en modo desarrollo (`pnpm dev:web`,
puerto 5173) sigue apuntando por defecto a la API de Python en el 8000; para usarla con el Worker:
`API_PROXY_TARGET=http://127.0.0.1:8787 pnpm dev:web`.

## 8. Límites del plan gratuito (2026)

Workers: 100 000 peticiones al día y 10 ms de CPU por petición (el streaming del mentor no cuenta el
tiempo de espera de Anthropic). D1: 5 GB, 5 millones de lecturas y 100 000 escrituras al día. Para una
cohorte de un curso universitario sobra; si se supera, el plan de pago cuesta 5 USD al mes.
