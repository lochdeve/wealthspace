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

splitMode, ISO 4217, atribución, informes, 409 — sin cambio de alcance.

## Cobertura (capa unitaria)

- **API:** `pnpm --filter @wealthspace/api test:cov` — Jest ESM sobre `env` y `health.controller` (umbrales en `jest.config.mjs`). Lógica HTTP de espacios/invitaciones: **`pnpm test:db`**, sin informe de líneas.
- **Web:** `pnpm --filter @wealthspace/web test:cov` — Vitest + v8 sobre helpers Fase 4 (`lib/spaces/*` testeable, `lib/api/errors.ts`); excluye Server Actions (`*.server.ts`) y UI.

Los directorios `coverage/` están en `.gitignore`.

## Herramientas

Jest/Supertest, Vitest/RTL, Playwright, PostgreSQL CI post-migración.

## Documentación relacionada

- [database-design](../architecture/database-design.md)
