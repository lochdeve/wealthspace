# Estado actual del desarrollo

**Última actualización:** 2026-11-18 — E2E SHARED (gastos/saldos/liquidaciones) + P-19 aviso leave/remove.

Roadmap: [roadmap.md](./roadmap.md) · Decisiones: [decisions.md](../product/decisions.md) · Contratos implementados: [frontend-api-dependencies.md](./frontend-api-dependencies.md).

## Repositorio

| Elemento         | Estado                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `main`           | Fases 0–6 web (F-6 gastos compartidos) + API B-6. Por delante de `origin/main`; **push pendiente de aprobación**. |
| Ramas de trabajo | `feat/web-phase-6-shared-expenses` integrada en `main` local. Ramas locales `fix/web-*` pueden borrarse.          |
| CI               | `quality` (formato, lint, typecheck, tests unitarios, cobertura, build) y `database-integrity`. Sin E2E.          |

## Por área

| Área                    | API                   | Web       |
| ----------------------- | --------------------- | --------- |
| Auth                    | ✅                    | ✅        |
| Espacios y membresía    | ✅ 4.1 API; 4.2 ⬜    | ✅ F-4.1 transfer ownership |
| Cuentas y movimientos   | ✅                    | ✅        |
| Gastos compartidos      | ✅ API fase 6 (B-6.5) | ✅ UI F-6 |
| Deudas y liquidaciones  | ✅ B-7 (migración aplicada en dev local) | ✅ UI F-7 |
| Presupuestos e informes | ⬜                    | ⬜        |

## Decisiones recientes

- **Aprobadas (A-01…A-10):** reparto igual (por defecto), por porcentajes o por importes; sin confirmaciones; gasto, deuda y liquidación separados; liquidaciones manuales parciales o completas; el gasto no mueve dinero de quien no pagó. Ver [shared-expenses.md](../product/shared-expenses.md).
- **Aprobadas para la fase 6 (P-03, P-04, P-08, P-09, P-13, P-14, P-15, P-16):** orígenes de pago `MEMBER`/`SPACE_ACCOUNT`; sin deudas en pagos desde cuenta compartida; deuda calculada neta por par; permisos de gastos; anulación lógica; gasto individual congelado; mínimo de 1 participante distinto del pagador; previsualización desde la API.
- **En análisis:** modelo de cuentas ([accounts-model.md](../product/accounts-model.md)).

## Siguiente tarea por chat

| Chat         | Tarea                                                                                       | Bloqueos                                   |
| ------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Coordinación | CI/prod: aplicar `20261117160000` cuando toque el release                                     | —                                          |
| Frontend     | E2E SHARED + P-19 ✅; **no iniciar F-8** hasta P-01…P-07 / accounts-model                     | accounts-model                             |
| Backend      | **B-4.1** transfer ownership + mapeo P2002→`VERSION_CONFLICT` en revisiones                   | B-8 ⛔ modelo cuentas                      |

## Notas operativas

- API: `pnpm --filter @wealthspace/api test:db` (requiere PostgreSQL; base desechable `wealthspace_migration_test`).
- Web: `pnpm --filter @wealthspace/web test` / `test:cov`; E2E con `test:e2e` (local).
- Migración inicial: `prisma migrate deploy` con PostgreSQL en marcha. Nuevas migraciones: solo con aprobación.
