# Estado actual del desarrollo

Última actualización: Fase 4 backend (listado/detalle de espacios, guard por membresía ACTIVE).

## Completado recientemente

- **Espacios (Fase 4):** `GET`/`POST /api/v1/spaces`, `GET /api/v1/spaces/:spaceId`, `SpaceMembershipGuard`; `POST` crea SHARED + OWNER.
- **Frontend auth (Fase 3):** `lib/api`, login/registro, layout `(app)` con `/dashboard`, CORS `WEB_ORIGIN`, doc [frontend-api-dependencies.md](./frontend-api-dependencies.md).
- **`POST /api/v1/auth/login`**, **`POST /api/v1/auth/logout`**, **`GET /api/v1/auth/me`**: sesión con JWT en cookie HttpOnly (`wealthspace_session`), `JwtAuthGuard`; **401** `INVALID_CREDENTIALS` / sin filtrar existencia de email.
- **`POST /api/v1/auth/register`**: hash Argon2id, transacción atómica `Space` PERSONAL + `User` + `SpaceMembership` OWNER ACTIVE; **409** si el email ya existe; validación global con `class-validator`.
- `JWT_SECRET` (mín. 32 caracteres) obligatorio en `parseEnv`.
- Validación de `DATABASE_URL` y puerto al arrancar la API.
- `PrismaModule` / `PrismaService` con adapter `@prisma/adapter-pg` (Prisma 7).
- Ciclo de vida de conexión (`$connect` / `$disconnect` con shutdown hooks).
- `GET /api/v1/health/ready` — comprobación de PostgreSQL (`SELECT 1`).
- Tests unitarios, e2e (sin BD real) e integración Prisma en `test:db`.
- Documentación OpenAPI con `@nestjs/swagger` (UI en `/api/v1/docs`, JSON en `/api/v1/docs-json`).

## Backend

| Área             | Estado                                     |
| ---------------- | ------------------------------------------ |
| NestJS bootstrap | Hecho                                      |
| Health liveness  | `GET /api/v1/health`                       |
| Health readiness | `GET /api/v1/health/ready`                 |
| Prisma en NestJS | Hecho                                      |
| Env validation   | Hecho (`AppConfigModule`)                  |
| Auth / usuarios  | Registro + login/sesión/me; guards básicos |
| Espacios         | Listar, crear SHARED, detalle; guard por espacio |
| OpenAPI          | Swagger UI + auth/spaces documentados      |

## Siguiente tarea

Fase 4 (continuación): invitaciones y ciclo de membresía; UI de selector / crear espacio en web. Opcional: módulo Users, E2E auth en CI.

## Notas

- La migración inicial sigue sin aplicarse en el flujo estándar de desarrollo; `/health/ready` solo exige que PostgreSQL acepte conexiones.
- CI `quality` no levanta PostgreSQL; la conectividad Prisma se valida en el job `database-integrity` (`pnpm test:db`).
