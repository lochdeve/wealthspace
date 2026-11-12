# Estado actual del desarrollo

Última actualización: Fase 4 **cerrada (MVP)**; decisiones de producto en [spaces-membership-mvp.md](../product/spaces-membership-mvp.md). Handoff chats: [chat-handoff.md](./chat-handoff.md).

## Completado recientemente

- **Espacios e invitaciones (Fase 4):** listar/crear/detalle, invitaciones (crear, inbox, aceptar/rechazar, revocar), **GET members**, **leave** / **remove**, UI con selector de espacio activo; TTL invitación **7 días** (decisión producto cerrada).
- **Transferencia ownership:** entrega **4.1** — documentada, no implementada; leave/remove del único OWNER sigue en **409**.
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

**Fase 5** — en curso (`feat/api-phase-5-accounts`): slices 1–3 (cuentas, cashflow PERSONAL, SHARED+transfer+categorías). Siguiente: edición transacciones / `SharedExpense`. Opcional: **4.1** / **4.2**.

## Notas

- Migración: `prisma migrate deploy` con PostgreSQL en marcha para desarrollo local completo.
- `pnpm test:db` valida integración API+BD; E2E espacios contra API vivo sigue opcional.
