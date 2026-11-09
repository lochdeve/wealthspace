# @wealthspace/api

API REST de Wealthspace (NestJS).

## Scripts

| Comando          | Descripción                                        |
| ---------------- | -------------------------------------------------- |
| `pnpm dev`       | Servidor en modo watch (puerto `3001` por defecto) |
| `pnpm build`     | Compila a `dist/`                                  |
| `pnpm test`      | Tests unitarios (Jest)                             |
| `pnpm test:e2e`  | Tests e2e (Supertest)                              |
| `pnpm lint`      | ESLint                                             |
| `pnpm typecheck` | TypeScript sin emit                                |

Desde la raíz del monorepo: `pnpm --filter @wealthspace/api dev`.

## Endpoints

- `POST /api/v1/auth/register` — alta de usuario (transacción: usuario + espacio PERSONAL + membresía OWNER).
- `GET /api/v1/health` — liveness (el proceso responde; no consulta la BD).
- `GET /api/v1/health/ready` — readiness (PostgreSQL accesible vía `SELECT 1`).
- `GET /api/v1/docs` — OpenAPI (Swagger UI).
- `GET /api/v1/docs-json` — especificación OpenAPI en JSON.

## Variables de entorno

- `API_PORT` — puerto HTTP (default `3001`).
- `DATABASE_URL` — **obligatoria** para arrancar (PostgreSQL; ver `.env.example` en la raíz).

## Prisma

- Versión **7.10.1**; esquema inicial en [`prisma/schema.prisma`](./prisma/schema.prisma).
- Validación: `DATABASE_URL=... pnpm prisma:validate` (ver [`prisma/README.md`](./prisma/README.md)).
- **Migraciones no aplicadas** hasta revisión explícita.

## Documentación

- [Diseño de API](../../docs/architecture/api-design.md)
- [Backend rules](../../.cursor/rules/backend.mdc)
