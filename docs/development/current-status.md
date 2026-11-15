# Estado actual del desarrollo

**Última actualización:** 2026-11-15 — auditoría de documentación y redefinición de gastos compartidos, deudas y liquidaciones (coordinación).

Roadmap: [roadmap.md](./roadmap.md) · Decisiones: [decisions.md](../product/decisions.md) · Contratos implementados: [frontend-api-dependencies.md](./frontend-api-dependencies.md).

## Repositorio

| Elemento                    | Estado                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `main`                      | Fases 0–4 completas + API de la fase 5. Sincronizada con `origin/main`.                                                   |
| `feat/web-phase-5-accounts` | Web de la fase 5 (3 commits por delante de `main`) + cambios sin commitear del chat de frontend (selector de categorías). |
| `feat/api-phase-5-accounts` | Rama local ya integrada en `main`.                                                                                        |
| CI                          | `quality` (formato, lint, typecheck, tests unitarios, cobertura, build) y `database-integrity`. Sin E2E.                  |

## Por área

| Área                    | API               | Web                                                                |
| ----------------------- | ----------------- | ------------------------------------------------------------------ |
| Auth                    | ✅                | ✅                                                                 |
| Espacios y membresía    | ✅ (sin 4.1/4.2)  | ✅                                                                 |
| Cuentas y movimientos   | ✅                | 🟡 en rama, pendiente de merge                                     |
| Gastos compartidos      | ⬜ (solo esquema) | ⬜ (el «gasto compartido» actual es un gasto individual atribuido) |
| Deudas y liquidaciones  | ⬜ (solo esquema) | ⬜                                                                 |
| Presupuestos e informes | ⬜                | ⬜                                                                 |

## Decisiones recientes

- **Aprobadas (A-01…A-10):** reparto igual (por defecto), por porcentajes o por importes; sin confirmaciones; gasto, deuda y liquidación separados; liquidaciones manuales parciales o completas; el gasto no mueve dinero de quien no pagó. Ver [shared-expenses.md](../product/shared-expenses.md).
- **En análisis:** modelo de cuentas ([accounts-model.md](../product/accounts-model.md)).

## Siguiente tarea por chat

| Chat         | Tarea                                                                                                                           | Bloqueos                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Coordinación | **R1**: obtener la aprobación de P-03, P-04, P-08, P-09, P-13, P-14, P-15 y P-16 (fase 6) y de P-10, P-11, P-12 y P-19 (fase 7) | Respuesta del responsable de producto |
| Frontend     | **F-R2.1** merge de la web de la fase 5 → **F-R2.2** renombrar a «Gasto individual»                                             | Ninguno                               |
| Backend      | **B-R1**: borrador de la migración de la fase 6 (sin aplicar) y análisis de coste de P-03/P-13/P-15/P-19. Opcional: **B-4.1**   | La migración solo se aplica tras R1   |

## Notas operativas

- API: `pnpm --filter @wealthspace/api test:db` (requiere PostgreSQL; base desechable `wealthspace_migration_test`).
- Web: `pnpm --filter @wealthspace/web test` / `test:cov`; E2E con `test:e2e` (local).
- Migración inicial: `prisma migrate deploy` con PostgreSQL en marcha. Nuevas migraciones: solo con aprobación.
