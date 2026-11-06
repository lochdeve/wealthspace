# Estado actual del desarrollo

Última actualización: OpenAPI/Swagger para health (`/api/v1/docs`).

## Completado recientemente

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
| Auth / usuarios   | Pendiente (Fase 2)                          |
| OpenAPI           | Swagger UI + health documentados            |

## Siguiente tarea

Fase 2: módulo de usuarios y autenticación (registro, login, sesión), según [roadmap](./roadmap.md). OpenAPI se irá ampliando con cada nuevo endpoint.

## Notas

- La migración inicial sigue sin aplicarse en el flujo estándar de desarrollo; `/health/ready` solo exige que PostgreSQL acepte conexiones.
- CI `quality` no levanta PostgreSQL; la conectividad Prisma se valida en el job `database-integrity` (`pnpm test:db`).
