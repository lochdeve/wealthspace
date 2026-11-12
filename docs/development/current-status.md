# Estado actual del desarrollo

Última actualización: Fase 5 **web MVP** en rama `feat/web-phase-5-accounts`. Contrato: [frontend-api-dependencies.md](./frontend-api-dependencies.md).

## Completado recientemente

- **Fase 5 web:** cuentas, categorías, movimientos (listado/edición), transferencias, gasto SHARED con atribución; PERSONAL y SHARED con cuentas API.
- **Fase 5 API (main):** cuentas, categorías, transacciones, revisiones optimistas.
- **Fase 4:** espacios, invitaciones, membresías, UI espacio activo.

## Frontend

| Área     | Estado                                                         |
| -------- | -------------------------------------------------------------- |
| Auth     | Login, registro, rutas protegidas                              |
| Espacios | Listado, detalle, miembros, leave/remove, invitaciones         |
| Finanzas | MVP Fase 5 (rama `feat/web-phase-5-accounts`, pendiente merge) |
| Tests    | Unit finanzas/espacios; E2E auth mínimo                        |

## Siguiente tarea

Merge PR Fase 5 web; opcional dashboards agregados y **SharedExpense** (fase posterior). **4.1** ownership si producto lo prioriza.

## Notas

- `pnpm test:db` en API; `pnpm --filter @wealthspace/web test` / `test:cov` en web.
- Migración: `prisma migrate deploy` con PostgreSQL en marcha.
