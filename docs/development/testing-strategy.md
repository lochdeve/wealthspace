# Estrategia de pruebas

## Integridad PostgreSQL (MVP aprobado)

### FK compuestas

- INSERT tx con par `(space_id, account_id)` incoherente → rechazo FK.
- shared `(space_id, financial_transaction_id)` con tx de otro espacio → rechazo.

### Constraint triggers deferidos (sin SET CONSTRAINTS global)

- SPACE_ACCOUNT batch válido → COMMIT ok.
- EXPENSE sin atribución sin shared → COMMIT falla.
- Participantes: 0/1 fila, suma ≠ total, cambio `total_amount` sin ajuste participantes → COMMIT falla.
- DELETE/UPDATE shared dispara revalidación participantes.

### Settlement retroactivo

- `occurred_at` dentro de [joined_at, left_at) → ok aunque status actual LEFT.
- `occurred_at` antes de joined_at o ≥ left_at → rechazo.
- Usuario sin fila de membresía en espacio → rechazo.
- `from_user_id = to_user_id` → CHECK rechaza.

### Concurrencia

- Doble PATCH misma `expectedVersion` → 409.

Referencia: [first-migration-design](../architecture/first-migration-design.md) §12.

Implementación automatizada: `apps/api/test/database/*.integration.spec.ts` (`pnpm test:db` en `@wealthspace/api`). Usar `INTEGRATION_DATABASE_URL` apuntando a una base **desechable** (p. ej. `wealthspace_migration_test`). Jest crea esa base contra el servidor local si no existe (ver `test/database/jest-db-global-setup.ts`). CI: job `database-integrity` (PostgreSQL 17, credenciales propias del runner; el job crea `wealthspace_migration_test` explícitamente).

### TypeScript (API)

- Producción: `tsc -p tsconfig.build.json --noEmit` (`src/`).
- Tests (Jest ESM): `tsc -p tsconfig.spec.json --noEmit` (`test/`). Rutas a migración vía `process.cwd()` para no mezclar `import.meta` con el emit CommonJS de Nest.

## Dominio app

- Atribución, 409 y anti-IDOR: tests de integración (`test/database/*.integration.spec.ts`) por endpoint.
- **Reparto (fase 6):** tests unitarios de la función pura con los ejemplos de [shared-expenses.md §4](../product/shared-expenses.md#4-reglas-de-reparto) y la propiedad «Σ participaciones = total» para EQUAL, PERCENTAGE y FIXED_AMOUNT, con monedas de 0 y 2 decimales.
- **Deudas (fase 7):** tests unitarios del cálculo neto por par y moneda (ejemplo de referencia Ana/Carlos/María, compensación, anulados excluidos, multimoneda).
- **Privacidad (fase 8):** tests de no filtración de datos de cuentas personales en las respuestas de espacios SHARED.
- Los criterios de aceptación de cada fase en [roadmap.md](./roadmap.md) deben tener al menos un test automatizado.

## Cobertura (capa unitaria)

- **API:** `pnpm --filter @wealthspace/api test:cov` — Jest ESM sobre `env` y `health.controller` (umbrales en `jest.config.mjs`). Lógica HTTP de espacios/invitaciones: **`pnpm test:db`**, sin informe de líneas.
- **Web:** `pnpm --filter @wealthspace/web test:cov` — Vitest + v8 sobre helpers (`lib/spaces/*`, `lib/api/*`, `lib/finance/*`); excluye Server Actions (`*.server.ts`) y UI.
- **E2E:** Playwright (`apps/web/e2e/`). CI (fase 10 slice 1): job `e2e` ejecuta `shared-expenses-balances-settlements.spec.ts`; resto de specs en local.

Los directorios `coverage/` están en `.gitignore`.

## Herramientas

Jest/Supertest, Vitest/RTL, Playwright, PostgreSQL CI post-migración.

## Documentación relacionada

- [database-design](../architecture/database-design.md)
