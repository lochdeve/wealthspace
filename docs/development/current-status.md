# Estado actual del desarrollo

Última actualización: registro de usuario (`POST /api/v1/auth/register`).

## Completado recientemente

- **`POST /api/v1/auth/register`**: hash Argon2id, transacción atómica `Space` PERSONAL + `User` + `SpaceMembership` OWNER ACTIVE; **409** si el email ya existe; validación global con `class-validator`.
- Validación de `DATABASE_URL` y puerto al arrancar la API.
- `PrismaModule` / `PrismaService` con adapter `@prisma/adapter-pg` (Prisma 7).
- Ciclo de vida de conexión (`$connect` / `$disconnect` con shutdown hooks).
- `GET /api/v1/health/ready` — comprobación de PostgreSQL (`SELECT 1`).
- Tests unitarios, e2e (sin BD real) e integración Prisma en `test:db`.
- Documentación OpenAPI con `@nestjs/swagger` (UI en `/api/v1/docs`, JSON en `/api/v1/docs-json`).

## Backend

| Área              | Estado                                      |
| ----------------- | ------------------------------------------- |
| NestJS bootstrap  | Hecho                                       |
| Health liveness   | `GET /api/v1/health`                        |
| Health readiness  | `GET /api/v1/health/ready`                  |
| Prisma en NestJS  | Hecho                                       |
| Env validation    | Hecho (`AppConfigModule`)                   |
| Auth / usuarios   | Registro hecho; login/sesión pendientes     |
| OpenAPI           | Swagger UI + health documentados            |

## Siguiente tarea

Fase 2 (continuación): login, sesión segura, logout, perfil autenticado y guards, según [roadmap](./roadmap.md).

## Notas

- La migración inicial sigue sin aplicarse en el flujo estándar de desarrollo; `/health/ready` solo exige que PostgreSQL acepte conexiones.
- CI `quality` no levanta PostgreSQL; la conectividad Prisma se valida en el job `database-integrity` (`pnpm test:db`).
