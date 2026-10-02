# syntax=docker/dockerfile:1
#
# Imagen de la SPA del OVA: compila con Vite y sirve dist/ con nginx (sin privilegios), que
# además proxifica /api hacia el servicio `api`.
#
# CONTEXTO DE CONSTRUCCIÓN = RAÍZ DEL REPOSITORIO (no apps/web): el pnpm-lock.yaml y el
# pnpm-workspace.yaml viven allí. docker-compose.yml ya lo declara así. A mano:
#   docker build -f apps/web/Dockerfile .
# Qué se envía al daemon lo decide el .dockerignore de la raíz (Docker no lee apps/web/.dockerignore
# cuando el contexto es la raíz).

# ---- Etapa 1: compilación ---------------------------------------------------------------
# Misma mayor que "engines" del package.json raíz (>=22). Debian (glibc) y no Alpine: los
# binarios nativos de Vite 8 y Tailwind se publican para ambas, pero glibc es la vía más probada.
FROM node:22-slim AS build

# En CI no hay TTY: pnpm no debe preguntar nada.
ENV CI=true
WORKDIR /repo

# pnpm con la versión EXACTA del campo "packageManager" del package.json (una sola fuente de
# verdad, sin repetir el número aquí). Se instala con npm, igual que en la máquina de desarrollo.
COPY package.json ./
RUN npm install --global "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1].split('+')[0]")" \
 && pnpm --version

# Dependencias solo del workspace @ova/web. Se copian únicamente los manifiestos para que esta
# capa se reutilice mientras no cambien las dependencias.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --filter "@ova/web..."

# Bloqueo por secuencia de módulos (apps/web/src/config.ts). Vite lo incrusta al COMPILAR, así que
# se elige aquí y no al arrancar el contenedor: `true` (por defecto) exige completar cada módulo
# para abrir el siguiente; `false` deja todos abiertos. Cualquier otro valor equivale a `true`.
# docker-compose.yml lo toma del .env; a mano: --build-arg VITE_BLOQUEO_SECUENCIAL=false
ARG VITE_BLOQUEO_SECUENCIAL=true

# Código fuente y compilación de producción (vue-tsc + vite build). De las variables VITE_* solo
# se pasa VITE_BLOQUEO_SECUENCIAL: el modo de desarrollo sin backend (VITE_DEV_BYPASS_AUTH) no debe
# entrar al build.
COPY apps/web ./apps/web
RUN VITE_BLOQUEO_SECUENCIAL="$VITE_BLOQUEO_SECUENCIAL" pnpm --filter @ova/web build


# ---- Etapa 2: nginx ------------------------------------------------------------------------
# nginx-unprivileged: corre como usuario no root y escucha en 8080 (no en 80).
FROM nginxinc/nginx-unprivileged:1.30-alpine AS runtime

# Reemplaza el default.conf de la imagen (fallback de SPA, caché, cabeceras, proxy de /api).
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
