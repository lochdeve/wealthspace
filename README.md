# Wealthspace

Aplicación web para **gestionar finanzas personales y compartidas** mediante espacios financieros independientes (`Spaces`). Cada usuario tiene un espacio personal privado y puede crear o unirse a espacios compartidos (hogar, pareja, viajes, etc.) con datos y miembros aislados por espacio.

## Tecnologías

| Área     | Stack                                                        |
| -------- | ------------------------------------------------------------ |
| Frontend | Next.js 16 (App Router), React 19, TypeScript                |
| Backend  | NestJS 12, REST, OpenAPI (Swagger en `/api/v1/docs`)         |
| Datos    | PostgreSQL 17, Prisma ORM 7 (migración inicial aplicada)     |
| Tests    | Jest + Supertest (API), Vitest + RTL (web), Playwright (E2E) |
| Monorepo | pnpm Workspaces 12.x                                         |
| Local DB | Docker Compose (PostgreSQL 17)                               |

Versiones detalladas: [docs/development/toolchain-versions.md](./docs/development/toolchain-versions.md).

## Arquitectura

Monorepo con **dos aplicaciones independientes** (despliegue separado):

- **`apps/web`** — interfaz de usuario; consume la API REST.
- **`apps/api`** — reglas de negocio, autorización y acceso a PostgreSQL.

El backend es un **monolito modular** NestJS. No hay acceso directo a la base de datos desde el frontend.

Documentación: [docs/product/product-overview.md](./docs/product/product-overview.md) · [docs/architecture/system-architecture.md](./docs/architecture/system-architecture.md)

## Estructura del repositorio

```text
apps/web          Next.js frontend
apps/api          NestJS API
packages/contracts Tipos/contratos compartidos (placeholder)
docs/             Producto, arquitectura, desarrollo, ADRs
infrastructure/   Notas Docker
.cursor/rules/    Reglas para agentes Cursor
pnpm-workspace.yaml
pnpm-lock.yaml
```

## Requisitos previos

- Node.js **24 LTS**
- pnpm **12.x** (Corepack: `corepack enable && corepack prepare pnpm@12.16.1 --activate`)
- Docker y Docker Compose (PostgreSQL local)

## Instalación

```bash
git clone <repository-url> wealthspace
cd wealthspace
pnpm install
```

No uses `npm install` ni commitees `package-lock.json`.

## Variables de entorno

```bash
cp .env.example .env
# Editar contraseñas locales si es necesario
```

La API usa `API_PORT` (por defecto `3001`). El frontend usa `NEXT_PUBLIC_API_URL` apuntando a la API.

## Base de datos local

```bash
docker compose up -d
```

Ver [infrastructure/docker/README.md](./infrastructure/docker/README.md).

## Desarrollo

Iniciar **frontend y backend** a la vez:

```bash
pnpm dev
```

Por separado:

```bash
pnpm --filter @wealthspace/web dev   # http://localhost:3000
pnpm --filter @wealthspace/api dev   # http://localhost:3001
```

Health check API: `GET http://localhost:3001/api/v1/health`

## Calidad

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
pnpm test:e2e
```

## Documentación principal

| Tema         | Enlace                                                                     |
| ------------ | -------------------------------------------------------------------------- |
| Decisiones   | [docs/product/decisions.md](./docs/product/decisions.md)                   |
| Producto     | [docs/product/](./docs/product/)                                           |
| Dominio      | [docs/product/domain-model.md](./docs/product/domain-model.md)             |
| Roadmap      | [docs/development/roadmap.md](./docs/development/roadmap.md)               |
| Estado       | [docs/development/current-status.md](./docs/development/current-status.md) |
| Chats        | [docs/development/chat-handoff.md](./docs/development/chat-handoff.md)     |
| Arquitectura | [docs/architecture/](./docs/architecture/)                                 |
| Desarrollo   | [docs/development/](./docs/development/)                                   |
| ADRs         | [docs/decisions/](./docs/decisions/)                                       |

## Licencia

Wealthspace es **software propietario**. El código en este repositorio es visible de forma pública únicamente para consulta y referencia; **no se concede licencia** de uso, copia, modificación, distribución, sublicencia ni explotación comercial sin autorización escrita del titular de los derechos.

Los detalles completos están en [LICENSE](./LICENSE). Las dependencias de terceros conservan sus propias licencias.
