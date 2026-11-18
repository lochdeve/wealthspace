# Estado actual del desarrollo

**Última actualización:** 2026-11-18 — plan técnico fase 8 en [phase-8-technical-plan.md](./phase-8-technical-plan.md) (**revisión pendiente**).

Roadmap: [roadmap.md](./roadmap.md) · Decisiones: [decisions.md](../product/decisions.md) · Contratos: [frontend-api-dependencies.md](./frontend-api-dependencies.md).

## Repositorio

| Elemento  | Estado                                                                 |
| --------- | ---------------------------------------------------------------------- |
| `main`    | MVP fases 0–7 + transferencia ownership (4.1). Migraciones fase 6 y 7. |
| CI        | `quality` + `database-integrity`. Sin E2E en CI.                       |
| E2E local | `shared-expenses-balances-settlements.spec.ts`                         |

## Por área

| Área                              | API                               | Web                             |
| --------------------------------- | --------------------------------- | ------------------------------- |
| Auth                              | ✅                                | ✅ (sin editar perfil/timezone) |
| Espacios                          | ✅ 4.1; **4.2 C-05** pendiente UI | ✅ F-4.1                        |
| Finanzas base                     | ✅                                | ✅ F-R2                         |
| Gastos / saldos / liquidaciones   | ✅ B-6, B-7                       | ✅ F-6, F-7                     |
| Cuentas vinculadas (fase 8)       | ⬜                                | ⬜                              |
| Presupuestos / dashboard (fase 9) | ⬜                                | ⬜                              |

## Decisiones

**Aprobadas hoy:** P-01…P-07, P-17, C-05 (4.2). Detalle: [decisions.md §2e](../product/decisions.md#2e-decisiones-aprobadas--fase-8-cuentas-vinculadas-2026-11-18).

**Gate fase 8:** tu **OK** al [plan técnico](./phase-8-technical-plan.md) (§10) antes de B-8.0 / código.

## Siguiente tarea por chat

| Chat             | Tarea                                                             | Bloqueos |
| ---------------- | ----------------------------------------------------------------- | -------- |
| **Coordinación** | Cerrar revisión del plan (§10) y marcar APROBADO                    | Tu OK    |
| **Backend**      | **B-8.0** borrador migración tras OK; deuda menor API             | Plan OK  |
| **Frontend**     | **C-05** confirmación leave último ACTIVE (paralelo); F-8 tras B-8.10 | Plan OK  |
| **Release**      | `migrate deploy` 6+7 en cada entorno                              | —        |

## Notas operativas

- API: `pnpm --filter @wealthspace/api test:db`
- Web: `pnpm --filter @wealthspace/web test` · E2E: `pnpm --filter @wealthspace/web test:e2e`
- Nuevas migraciones: solo con aprobación de coordinación.
