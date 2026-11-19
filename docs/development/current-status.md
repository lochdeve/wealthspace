# Estado actual del desarrollo

**Última actualización:** 2026-11-19 — **F-10.1** E2E Playwright en CI (spec fases 6–7). Siguiente: ampliar slice fase 10 / hardening.

Roadmap: [roadmap.md](./roadmap.md) · Decisiones: [decisions.md](../product/decisions.md) · Contratos: [frontend-api-dependencies.md](./frontend-api-dependencies.md).

## Repositorio

| Elemento  | Estado                                                                              |
| --------- | ----------------------------------------------------------------------------------- |
| `main`    | Fases 0–9 MVP (incl. migración fase 8, B-8/B-9, F-8/F-9).                           |
| CI        | `quality` + `database-integrity` + `e2e` (Playwright spec fases 6–7).               |
| E2E local | `shared-expenses-balances-settlements.spec.ts`, `phase8-personal-cash-flow.spec.ts` |

## Por área

| Área                             | API                       | Web                     |
| -------------------------------- | ------------------------- | ----------------------- |
| Auth                             | ✅ B-9.1 `PATCH /auth/me` | ✅ F-9.1 `/settings`    |
| Espacios                         | ✅ 4.1                    | ✅ 4.1 + **C-05** (F-8) |
| Finanzas base                    | ✅                        | ✅ F-R2                 |
| Gastos / saldos / liquidaciones  | ✅ B-6, B-7               | ✅ F-6, F-7             |
| Cuentas vinculadas (fase 8)      | ✅ B-8.0–B-8.10           | ✅ F-8.1–8.7            |
| Presupuestos / informes (fase 9) | ✅ B-9.1–9.3              | ✅ F-9.1–9.4            |

## Fase 9 — cierre MVP

**Cerrada (2026-11-19)** para el alcance B-9.1–9.3 + F-9.1–9.4 según [roadmap-backend.md](./roadmap-backend.md) y [roadmap-frontend.md](./roadmap-frontend.md).

| Criterio planificado                           | Estado |
| ---------------------------------------------- | ------ |
| Perfil + `timezone` IANA (informes)            | ✅     |
| CRUD presupuestos por espacio                  | ✅     |
| Informe mensual consumo (P-17)                 | ✅     |
| Panel `/dashboard` (agrega en cliente)         | ✅     |
| Catálogo OpenAPI / `frontend-api-dependencies` | ✅     |

**Opcional / fuera del cierre MVP (no bloquea fase 10):**

- Endpoint API **dashboard agregado** multi-espacio (hoy la web compone con espacios + informes).
- UI **presupuesto vs consumo** comparativo.
- Uso extendido de `PATCH /budgets/:id` en web (API ya lo expone).
- E2E dedicado fase 9.

## Siguiente tarea por chat

| Chat             | Tarea                                                                    | Bloqueos |
| ---------------- | ------------------------------------------------------------------------ | -------- |
| **Coordinación** | Mantener coherencia docs; revisar PR fase 10                             | —        |
| **Backend**      | Deuda menor (`code` en errores Prisma); opcional **B-9.4** dashboard     | —        |
| **Frontend**     | Pulido F-9 opcional; siguientes slices fase 10 (E2E ampliado, hardening) | —        |
| **Release**      | Checklist `migrate deploy` **6+7+8** en cada entorno compartido          | —        |

## Notas operativas

- API: `pnpm --filter @wealthspace/api test:db`
- Migración fase 8: `pnpm --filter @wealthspace/api exec prisma migrate deploy` (`.env` raíz; ver `prisma.config.ts`)
- Web: `pnpm --filter @wealthspace/web test` · E2E: `pnpm --filter @wealthspace/web test:e2e`
- Nuevas migraciones: solo con aprobación de coordinación.
