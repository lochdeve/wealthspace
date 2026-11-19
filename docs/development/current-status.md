# Estado actual del desarrollo

**Última actualización:** 2026-11-19 — **F-8.5/F-8.6** (aportaciones + badge PERSONAL); opcional **F-8.7** / **C-05**.

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
| Cuentas vinculadas (fase 8)       | ✅ B-8.1–B-8.10; **B-8.0** SQL (deploy local por máquina) | 🟡 F-8.1–6 ✅; F-8.7 opcional |
| Presupuestos / dashboard (fase 9) | ⬜                                | ⬜                              |

## Decisiones

**Aprobadas hoy:** P-01…P-07, P-17, C-05 (4.2). Detalle: [decisions.md §2e](../product/decisions.md#2e-decisiones-aprobadas--fase-8-cuentas-vinculadas-2026-11-18).

**Gate fase 8:** ✅ plan + **B-8.0 SQL** aprobados. Cada dev: `prisma migrate deploy` (ver README migración fase 8).

## Siguiente tarea por chat

| Chat             | Tarea                                                             | Bloqueos |
| ---------------- | ----------------------------------------------------------------- | -------- |
| **Coordinación** | — (fase 8 código cerrado salvo bugs)                              | —        |
| **Backend**      | Deuda menor API; soporte F-8; **no** fase 9 hasta acuerdo           | —        |
| **Frontend**     | **F-8.7** (RTL/E2E opcional) o **C-05** (leave último ACTIVE)       | —        |
| **Release**      | Incluir **migrate deploy** fase 8 en entornos compartidos / CI      | —        |

## Notas operativas

- API: `pnpm --filter @wealthspace/api test:db`
- Web: `pnpm --filter @wealthspace/web test` · E2E: `pnpm --filter @wealthspace/web test:e2e`
- Nuevas migraciones: solo con aprobación de coordinación.
