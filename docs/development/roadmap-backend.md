# Roadmap backend (`apps/api`)

Entregas del chat de backend. Las fases, sus dependencias y los criterios globales están en [roadmap.md](./roadmap.md); aquí solo el detalle del API. Estado verificado el 2026-11-18.

Leyenda: ✅ hecho · 🟡 parcial · ⬜ pendiente · 🔧 refactorización · ✨ nueva · ⛔ bloqueada por una decisión.

---

## Hecho (fases 0–5)

| Área          | Implementado                                                                                                               | Tests                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Fundación     | Config validada, `PrismaService`, health/readiness, Swagger                                                                | Unit (env, health)                 |
| Auth          | Registro atómico, login/logout con cookie JWT, `GET /auth/me`, `JwtAuthGuard`                                              | Integración                        |
| Espacios      | Listar, crear SHARED, detalle, miembros, `SpaceMembershipGuard`                                                            | Integración + IDOR                 |
| Invitaciones  | Crear, listar, revocar, aceptar, rechazar; TTL de 7 días                                                                   | Integración                        |
| Membresía     | Leave/remove con reglas de rol y del único OWNER                                                                           | Integración                        |
| Cuentas       | Crear, listar, detalle con saldo on-read, archivar                                                                         | Integración                        |
| Categorías    | Crear, listar por tipo                                                                                                     | Integración                        |
| Movimientos   | Saldo inicial, ingreso, gasto (PERSONAL y SHARED atribuido), transferencia, listado, detalle, PATCH optimista con revisión | Integración                        |
| Integridad BD | FK compuestas, CHECK, triggers inmediatos y diferidos                                                                      | `test/database/integrity*.spec.ts` |

Deuda técnica residual (2026-11-18):

- ✅ P2002 en `revisionNumber` → `VERSION_CONFLICT` (transacciones, gastos compartidos, liquidaciones; B-4.1).
- ✅ Cabecera `schema.prisma` alineada con migraciones aplicadas.
- ✅ Test de integración para `TRANSACTION_LINKED_TO_SHARED_EXPENSE`.
- Pendiente: errores de Prisma/triggers no capturados → 500 sin `code`; priorizar validación en app antes del COMMIT; filtro global solo si persiste.
- Pendiente menor: unificar `ValidationPipe` global en tests de integración que aún montan pipe manual.

Huecos conocidos que **no** se priorizan salvo petición: renombrar cuenta o categoría, paginación con cursor, cobertura unitaria de servicios (la lógica se cubre con tests de integración).

---

## B-6 — ✨ Gastos compartidos (desbloqueada: decisiones de la fase 6 aprobadas el 2026-11-15)

Orden recomendado: **B-6.1** → **B-R1** → **B-6.0** (aplicar, aprobada) → **B-6.2** a B-6.5.

| Entrega  | Contenido                                                                                                                                  | Aceptación                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| B-6.0 🔧 | Migración `20261115183000_phase6_shared_expenses` (**aplicada** en entorno de desarrollo 2026-11-15)                                       | ✅ `migrate deploy` + `test:db`                                                                                                      |
| B-6.1    | Función pura de reparto `allocate(total, currency, mode, shares)`: mayor resto, unidades menores ISO 4217, desempate por `userId`          | Tests unitarios con los ejemplos de [shared-expenses.md §4](../product/shared-expenses.md#4-reglas-de-reparto) + propiedad Σ = total |
| B-6.2    | `POST /shared-expenses/preview` y `POST /shared-expenses` (pagador miembro y `SPACE_ACCOUNT` en una transacción; void atómico en servicio) | ✅ implementado en local; 7 tests integración                                                                                        |
| B-6.3    | `GET` listado (filtros, paginación) y detalle con `generatedDebts`                                                                         | ✅                                                                                                                                   |
| B-6.4    | `PATCH` (recalcula el reparto; revisión con participantes) y `POST /void`; historial `GET /revisions`                                      | ✅ P-09 → `SHARED_EXPENSE_EDIT_FORBIDDEN`                                                                                            |
| B-6.5    | OpenAPI + catálogo en [frontend-api-dependencies.md](./frontend-api-dependencies.md) con códigos de error definitivos                      | ✅                                                                                                                                   |

## B-R1 — 🔧 Peticiones de la auditoría web (después de B-6.1, antes de B-6.2)

| Entrega | Contenido                                                                                        | Aceptación                                                                        |
| ------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| B-R1.1  | `categoryId` en `PATCH /spaces/:spaceId/transactions/:txId` (C-02)                               | ✅ tests integración (set/clear, 404 foreign cat, tipo incompatible, 409 versión) |
| B-R1.2  | `code: "VALIDATION_ERROR"` (+ campo afectado si es viable) en los 400 de `ValidationPipe` (C-03) | ✅ auth + PATCH tx; OpenAPI auth/invitations/transactions                         |
| B-R1.3  | `INVITATION_NOT_FOUND` (404 aceptar/rechazar) en catálogo                                        | ✅ catálogo + tests integración + OpenAPI                                         |

## B-7 — ✨ Saldos y liquidaciones (P-10…P-19 aprobados 2026-11-15)

| Entrega  | Contenido                                          | Aceptación                                                                  |
| -------- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| B-7.0 🔧 | Migración `20261117160000_phase7_settlements_void` | ✅ `test:db`; **`migrate deploy` en dev local**; coordinación en release/CI |
| B-7.1    | `computeSpaceBalances`                             | ✅                                                                          |
| B-7.2    | `GET /balances`                                    | ✅                                                                          |
| B-7.3    | `POST/GET /settlements`, `POST …/void`             | ✅ P-19 + P-11 warnings                                                     |
| B-7.4    | OpenAPI + catálogo                                 | ✅                                                                          |

## B-8 — ✨ Cuentas personales vinculadas y aportaciones ⛔ (accounts-model)

Diseño de referencia: [accounts-model.md](../product/accounts-model.md). Se detallará en entregas al aprobarse. Requisitos no negociables: transacción única para ambos lados del vínculo, verificación de titularidad y tests de no filtración de datos personales en las respuestas del espacio SHARED.

## B-9 — ✨ Presupuestos, informes y perfil ⛔ (P-17)

- `PATCH /auth/me` (o equivalente) para `displayName` y `timezone` — puede adelantarse si coordinación lo asigna.
- Presupuestos e informes mensuales en `User.timezone`.

## B-4.1 — ✅ Transferencia de ownership (paralela, no bloqueante)

`POST /spaces/:spaceId/ownership/transfer`; auditoría mínima (log estructurado); tests de leave del antiguo OWNER después de la transferencia.

---

## Reglas para el chat de backend

- El backend es la fuente de verdad de los contratos: al terminar cada entrega, actualiza OpenAPI y [frontend-api-dependencies.md](./frontend-api-dependencies.md).
- Si una decisión necesaria no está APROBADA en [decisions.md](../product/decisions.md), no la implementes; avisa a coordinación.
- Toda migración: borrador → revisión → aprobación → aplicar; SQL de integridad sincronizado.
- Dinero con `Prisma.Decimal`; nunca `number`.
