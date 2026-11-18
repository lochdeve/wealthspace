# Estado actual del desarrollo

**Última actualización:** 2026-11-18 — auditoría de coordinación; roadmaps alineados con `main`.

Roadmap: [roadmap.md](./roadmap.md) · Decisiones: [decisions.md](../product/decisions.md) · Contratos: [frontend-api-dependencies.md](./frontend-api-dependencies.md).

## Repositorio

| Elemento  | Estado                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| `main`    | MVP **fases 0–7** + transferencia ownership (4.1). Migraciones: `20261115183000` (fase 6), `20261117160000` (fase 7). |
| CI        | `quality` + `database-integrity`. **Sin** E2E en CI.                                                                  |
| E2E local | `apps/web/e2e/shared-expenses-balances-settlements.spec.ts` (API `:3001`, web `:3000`).                               |

## Por área

| Área                              | API            | Web                             |
| --------------------------------- | -------------- | ------------------------------- |
| Auth                              | ✅             | ✅ (sin editar perfil/timezone) |
| Espacios                          | ✅ 4.1; 4.2 ⬜ | ✅ F-4.1; P-19 leave/remove     |
| Finanzas base                     | ✅             | ✅ F-R2 ✅                      |
| Gastos compartidos                | ✅ B-6         | ✅ F-6                          |
| Saldos y liquidaciones            | ✅ B-7         | ✅ F-7                          |
| Cuentas vinculadas (fase 8)       | ⬜             | ⬜                              |
| Presupuestos / dashboard (fase 9) | ⬜             | ⬜                              |

## Decisiones — qué falta aprobar

| ID                                       | Tema                                                                                                                | Bloquea            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **P-01…P-06**                            | Modelo de cuentas (personal vs compartida, pago desde cuenta personal, aportaciones, transferencias entre espacios) | **B-8 / F-8**      |
| **P-07**                                 | Liquidación vinculada a cuenta personal (baja prioridad)                                                            | Opcional en fase 8 |
| **P-17**                                 | Consumo vs flujo de caja en presupuestos/informes                                                                   | **B-9 / F-9**      |
| **4.2**                                  | Último miembro ACTIVE no puede hacer leave (`LAST_ACTIVE_MEMBER`)                                                   | Membresía          |
| Tipos OpenAPI compartidos, políticas git | Mejora                                                                                                              | No bloquea MVP     |

**Cerradas:** fases 6–7 (P-03…P-16, P-10…P-19, C-01…C-04).

## Siguiente tarea por chat

| Chat                        | Tarea                                                                                                                                                              | Bloqueos    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| **Coordinación / producto** | Aprobar **P-01, P-02, P-05, P-06** (recomendaciones en [accounts-model.md](../product/accounts-model.md)) para abrir fase 8. Opcional: decidir **4.2** y **P-17**. | Tu decisión |
| **Backend**                 | **B-8** tras aprobación cuenta. Mientras tanto: deuda menor (errores Prisma → `code`), `PATCH /auth/me` si coordinación lo asigna antes de fase 9.                 | P-01…P-06   |
| **Frontend**                | **F-8** tras B-8 en catálogo. Mientras tanto: pulir UX, ampliar E2E, fase 10.                                                                                      | P-01…P-06   |
| **Release**                 | `migrate deploy` con ambas migraciones fase 6+7 en cada entorno                                                                                                    | —           |

## Notas operativas

- API: `pnpm --filter @wealthspace/api test:db`
- Web: `pnpm --filter @wealthspace/web test` · E2E: `pnpm --filter @wealthspace/web test:e2e`
- Nuevas migraciones: solo con aprobación de coordinación.
