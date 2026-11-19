# B-8.0 — Phase 8 cross-space cash links

**Estado:** ✅ aprobada por coordinación (2026-11-19).

Aplicar en cada entorno de desarrollo:

```bash
pnpm --filter @wealthspace/api exec prisma migrate deploy
```

`prisma/sql/custom-integrity.sql` ya debe estar alineado (fuente de verdad post-migración).

Tests: `pnpm --filter @wealthspace/api test:db` (incl. `phase8-cross-space-integrity.integration.spec.ts`).