# Prisma — Wealthspace API

- **Schema:** `schema.prisma`
- **Config:** `../prisma.config.ts` (`DATABASE_URL`)
- **Migración inicial:** `migrations/20260328183000_init/` (DDL Prisma + bloque manual)
- **Integridad manual (fuente única):** `sql/custom-integrity.sql` — sincronizar con `scripts/sync-init-migration.sh`
- **Documentación:** [database-design.md](../../../docs/architecture/database-design.md), [first-migration-design.md](../../../docs/architecture/first-migration-design.md)

## Validación

```bash
DATABASE_URL=postgresql://... pnpm prisma:validate
pnpm prisma:generate
```

## Drift Prisma ↔ PostgreSQL

Prisma **no** modela: FK compuestas, índice parcial ACTIVE, CHECK/triggers manuales, funciones PL/pgSQL. Tras `migrate dev --create-only`, reaplicar el bloque de `sql/custom-integrity.sql` (o equivalente) en el `migration.sql`.

## Pruebas de integridad

Base desechable `wealthspace_migration_test` (no usar la BD habitual del proyecto). `pnpm test:db` la crea en el servidor local si no existe.

```bash
pnpm test:db
```
