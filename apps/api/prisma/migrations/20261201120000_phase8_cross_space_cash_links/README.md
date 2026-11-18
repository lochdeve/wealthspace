# B-8.0 — Phase 8 cross-space cash links (DRAFT)

**Do not run `prisma migrate deploy` in dev/prod until coordination approves this SQL.**

After approval: `pnpm --filter @wealthspace/api exec prisma migrate deploy` and sync `prisma/sql/custom-integrity.sql`.

Tests: `pnpm --filter @wealthspace/api test:db` (applies this migration in the disposable test DB via `resetSchema`).