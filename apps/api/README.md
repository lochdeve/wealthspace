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

Dependencias **Prisma 7** instaladas; esquema y migraciones de dominio aún no implementados.

## Documentación

- [Diseño de API](../../docs/architecture/api-design.md)
- [Backend rules](../../.cursor/rules/backend.mdc)
