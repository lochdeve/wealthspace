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

- `GET /api/v1/health` — comprobación de disponibilidad.

## Variables de entorno

- `API_PORT` — puerto HTTP (default `3001`).
- `DATABASE_URL` — se usará cuando Prisma esté configurado (ver `.env.example` en la raíz).

## Prisma

- Versión **7.10.1**; esquema inicial en [`prisma/schema.prisma`](./prisma/schema.prisma).
- Validación: `DATABASE_URL=... pnpm prisma:validate` (ver [`prisma/README.md`](./prisma/README.md)).
- **Migraciones no aplicadas** hasta revisión explícita.

## Documentación

- [Diseño de API](../../docs/architecture/api-design.md)
- [Backend rules](../../.cursor/rules/backend.mdc)
