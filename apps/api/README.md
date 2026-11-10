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
- `POST /api/v1/auth/login` — credenciales; cookie HttpOnly `wealthspace_session` (JWT).
- `POST /api/v1/auth/logout` — borra la cookie de sesión.
- `GET /api/v1/auth/me` — perfil del usuario autenticado (requiere cookie).
- `GET /api/v1/spaces` — espacios con membresía ACTIVE del usuario (sesión).
- `POST /api/v1/spaces` — crea espacio **SHARED** + membresía OWNER ACTIVE (transacción).
- `GET /api/v1/spaces/:spaceId` — detalle si membresía ACTIVE; **404** `SPACE_NOT_FOUND` si no aplica (anti-IDOR).
- `POST /api/v1/spaces/:spaceId/invitations` — invitar por email (SHARED; OWNER/ADMIN).
- `GET /api/v1/spaces/:spaceId/invitations` — pendientes del espacio (OWNER/ADMIN).
- `POST /api/v1/spaces/:spaceId/invitations/:id/revoke` — revocar pendiente.
- `GET /api/v1/invitations` — pendientes para el email del usuario autenticado.
- `POST /api/v1/invitations/:id/accept` | `reject` — responder invitación.
- Variable obligatoria: `JWT_SECRET` (mín. 32 caracteres).
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
