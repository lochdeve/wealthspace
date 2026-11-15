# Estado actual del desarrollo

**Última actualización:** 2026-11-15 — auditoría de documentación y redefinición de gastos compartidos, deudas y liquidaciones (coordinación).

Roadmap: [roadmap.md](./roadmap.md) · Decisiones: [decisions.md](../product/decisions.md) · Contratos implementados: [frontend-api-dependencies.md](./frontend-api-dependencies.md).

## Repositorio

| Elemento         | Estado                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main`           | Fases 0–5 completas (API y web, con el selector de categorías) + documentación del nuevo modelo. Por delante de `origin/main`; **push pendiente de aprobación**. |
| Ramas de trabajo | Ninguna abierta (`feat/api-phase-5-accounts` y `feat/web-phase-5-accounts` integradas y borradas).                                                               |
| CI               | `quality` (formato, lint, typecheck, tests unitarios, cobertura, build) y `database-integrity`. Sin E2E.                                                         |

## Por área

| Área                    | API               | Web                                                                |
| ----------------------- | ----------------- | ------------------------------------------------------------------ |
| Auth                    | ✅                | ✅                                                                 |
| Espacios y membresía    | ✅ (sin 4.1/4.2)  | ✅                                                                 |
| Cuentas y movimientos   | ✅                | ✅                                                                 |
| Gastos compartidos      | ⬜ (solo esquema) | ⬜ (el «gasto compartido» actual es un gasto individual atribuido) |
| Deudas y liquidaciones  | ⬜ (solo esquema) | ⬜                                                                 |
| Presupuestos e informes | ⬜                | ⬜                                                                 |

## Decisiones recientes

- **Aprobadas (A-01…A-10):** reparto igual (por defecto), por porcentajes o por importes; sin confirmaciones; gasto, deuda y liquidación separados; liquidaciones manuales parciales o completas; el gasto no mueve dinero de quien no pagó. Ver [shared-expenses.md](../product/shared-expenses.md).
- **Aprobadas para la fase 6 (P-03, P-04, P-08, P-09, P-13, P-14, P-15, P-16):** orígenes de pago `MEMBER`/`SPACE_ACCOUNT`; sin deudas en pagos desde cuenta compartida; deuda calculada neta por par; permisos de gastos; anulación lógica; gasto individual congelado; mínimo de 1 participante distinto del pagador; previsualización desde la API.
- **En análisis:** modelo de cuentas ([accounts-model.md](../product/accounts-model.md)).

## Siguiente tarea por chat

| Chat         | Tarea                                                                                                                                       | Bloqueos                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Coordinación | **R1 (fase 7)**: aprobar P-10, P-11, P-12 y P-19. Revisar el borrador de la migración de la fase 6 cuando llegue                            | Respuesta del responsable de producto                       |
| Frontend     | **F-R2.2** renombrar a «Gasto individual» (F-R2.1 hecho: fase 5 web en `main`)                                                              | Ninguno                                                     |
| Backend      | **B-6.1** función pura de reparto + **B-6.0** borrador de la migración de la fase 6 (sin aplicar); después B-6.2–B-6.5. Opcional: **B-4.1** | Aplicar la migración requiere la aprobación de coordinación |

## Notas operativas

- API: `pnpm --filter @wealthspace/api test:db` (requiere PostgreSQL; base desechable `wealthspace_migration_test`).
- Web: `pnpm --filter @wealthspace/web test` / `test:cov`; E2E con `test:e2e` (local).
- Migración inicial: `prisma migrate deploy` con PostgreSQL en marcha. Nuevas migraciones: solo con aprobación.
