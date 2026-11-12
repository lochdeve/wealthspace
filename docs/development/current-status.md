# Estado actual del desarrollo

Última actualización: Fase 4 (espacios, invitaciones, membresías) — API + web MVP cerrados en rama.

## Completado recientemente

- **Espacios e invitaciones (Fase 4):** listar/crear/detalle, invitaciones (crear, inbox, aceptar/rechazar, revocar), **GET members**, **leave** / **remove**, UI con selector de espacio activo; TTL invitación **7 días** (PENDIENTE DE DECISIÓN).
- **Frontend auth (Fase 3):** `lib/api`, login/registro, layout `(app)`, CORS `WEB_ORIGIN`, doc [frontend-api-dependencies.md](./frontend-api-dependencies.md).
- **Sesión:** `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, cookie HttpOnly, `JwtAuthGuard`.
- **Registro:** Argon2id, transacción PERSONAL + User + OWNER membership.
- Infra: Prisma, health, OpenAPI, jobs CI quality + database-integrity.

## Backend

| Área             | Estado                                             |
| ---------------- | -------------------------------------------------- |
| NestJS bootstrap | Hecho                                              |
| Auth / usuarios  | Registro + login/sesión/me                         |
| Espacios         | CRUD listado/crear/detalle, miembros, leave/remove |
| Invitaciones     | Ciclo completo + tests de integración              |
| OpenAPI          | Swagger UI                                         |

## Frontend

| Área         | Estado                                                 |
| ------------ | ------------------------------------------------------ |
| Auth         | Login, registro, rutas protegidas                      |
| Espacios     | Listado, crear, detalle, miembros, leave/remove        |
| Invitaciones | Gestión en espacio + `/invitations`                    |
| Tests        | Unit (labels, mensajes, active space); E2E auth mínimo |

## Siguiente tarea

Merge Fase 4 (API + web) a `main`; verificar CI; **Fase 5** — cuentas y transacciones en rama nueva.

## Notas

- Migración: `prisma migrate deploy` con PostgreSQL en marcha para desarrollo local completo.
- `pnpm test:db` valida integración API+BD; E2E espacios contra API vivo sigue opcional.
