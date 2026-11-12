# Estado actual del desarrollo

Última actualización: Fase 5 **API cerrada (MVP)** en `main` tras merge; contrato en [frontend-api-dependencies.md](./frontend-api-dependencies.md). Handoff: [chat-handoff.md](./chat-handoff.md).

## Completado recientemente

- **Fase 5 API:** cuentas (list/create/detail/archive, saldo on-read), categorías (list/create), transacciones (opening balance, income, expense PERSONAL/SHARED, transfer), historial (GET list/detail, PATCH + `FinancialRevision`). Tests `pnpm test:db` (75).
- **Fase 4 (MVP):** espacios, invitaciones, membresías, UI espacio activo — [spaces-membership-mvp.md](../product/spaces-membership-mvp.md). Pendiente opcional **4.1** / **4.2** (no bloquean front Fase 5).
- **Auth (Fase 3):** sesión cookie, rutas protegidas, layout `(app)`.

## Backend

| Área              | Estado                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| Auth / usuarios   | Registro + login/sesión/me                                             |
| Espacios          | List/create/detail, miembros, leave/remove, invitaciones               |
| Cuentas           | CRUD MVP + archivado                                                   |
| Categorías        | List/create                                                            |
| Transacciones     | Opening balance, income, expense, transfer, list/detail, PATCH + revisión |
| OpenAPI           | Swagger UI                                                             |
| SharedExpense     | Fase 6 (no iniciado)                                                   |

## Frontend

| Área         | Estado                                                 |
| ------------ | ------------------------------------------------------ |
| Auth         | Login, registro, rutas protegidas                      |
| Espacios     | Listado, crear, detalle, miembros, leave/remove        |
| Invitaciones | Gestión en espacio + `/invitations`                    |
| Finanzas     | **Pendiente** — consumir API Fase 5                    |
| Tests        | Unit espacios/auth; E2E auth mínimo                    |

## Siguiente tarea

**Fase 5 web** — UI cuentas y movimientos (PERSONAL primero; espacio activo + contrato API). Rama sugerida: `feat/web-phase-5-accounts` desde `main`.

## Notas

- `pnpm test:db` en `@wealthspace/api` tras cambios de dominio financiero.
- Migración: `prisma migrate deploy` con PostgreSQL en marcha.
