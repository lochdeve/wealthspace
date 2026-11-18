# Estado actual del desarrollo

**Última actualización:** 2026-11-18 — decisiones fase 8 aprobadas (cuestionario); gate plan técnico.

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

**Gate fase 8:** revisión del plan técnico B-8/F-8 en coordinación antes de codificar.

## Siguiente tarea por chat

| Chat             | Tarea                                                             | Bloqueos |
| ---------------- | ----------------------------------------------------------------- | -------- |
| **Coordinación** | Redactar plan técnico fase 8 (entregas, migración, privacidad)    | Tu OK    |
| **Backend**      | B-8 tras plan; deuda menor API                                    | Plan     |
| **Frontend**     | F-8 tras catálogo; **C-05** confirmación leave último ACTIVE; E2E | Plan     |
| **Release**      | `migrate deploy` 6+7 en cada entorno                              | —        |

## Notas operativas

- API: `pnpm --filter @wealthspace/api test:db`
- Web: `pnpm --filter @wealthspace/web test` · E2E: `pnpm --filter @wealthspace/web test:e2e`
- Nuevas migraciones: solo con aprobación de coordinación.
