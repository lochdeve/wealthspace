# Estado actual del desarrollo

**Última actualización:** 2026-11-19 — **B-8.10** catálogo cerrado; **B-8.0** migración pendiente de revisión/deploy.

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
| Cuentas vinculadas (fase 8)       | ✅ B-8.1–B-8.10 código; 🟡 B-8.0 deploy | ⬜ F-8 puede arrancar (con `test:db` / migración local) |
| Presupuestos / dashboard (fase 9) | ⬜                                | ⬜                              |

## Decisiones

**Aprobadas hoy:** P-01…P-07, P-17, C-05 (4.2). Detalle: [decisions.md §2e](../product/decisions.md#2e-decisiones-aprobadas--fase-8-cuentas-vinculadas-2026-11-18).

**Gate fase 8:** ✅ plan aprobado; migración aún requiere **revisión explícita** del SQL de B-8.0 antes de aplicar.

## Siguiente tarea por chat

| Chat             | Tarea                                                             | Bloqueos |
| ---------------- | ----------------------------------------------------------------- | -------- |
| **Coordinación** | **Revisar SQL** `20261201120000_phase8_cross_space_cash_links`     | —        |
| **Backend**      | **B-8.10** ✅; soporte a **revisión SQL** B-8.0; sin fase 9 hasta migración aprobada | —        |
| **Frontend**     | **F-8.1** (gasto + cuenta personal pagador); **C-05** en paralelo si aplica | Catálogo B-8.10 |
| **Release**      | `migrate deploy` 6+7 en cada entorno                              | —        |

## Notas operativas

- API: `pnpm --filter @wealthspace/api test:db`
- Web: `pnpm --filter @wealthspace/web test` · E2E: `pnpm --filter @wealthspace/web test:e2e`
- Nuevas migraciones: solo con aprobación de coordinación.
