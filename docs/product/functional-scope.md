# Alcance funcional — MVP

Requisitos funcionales por área. Las reglas detalladas viven en el documento enlazado en cada sección; el estado de las decisiones, en [decisions.md](./decisions.md).

Leyenda de estado: ✅ implementado (API + web) · 🟡 parcial · ⬜ no implementado.

---

## 1. Usuarios y sesión

| Requisito                                                       | Estado                               |
| --------------------------------------------------------------- | ------------------------------------ |
| Alta atómica: usuario + espacio PERSONAL + membresía OWNER      | ✅                                   |
| Login/logout con cookie HttpOnly; perfil `GET /auth/me`         | ✅                                   |
| Editar perfil y zona horaria                                    | ⬜ (necesario antes de los informes) |
| Sin borrado físico de usuarios con historial; sin anonimización | Regla (RESTRICT en BD)               |

## 2. Espacios y membresía

Fuente: [spaces-membership-mvp.md](./spaces-membership-mvp.md).

| Requisito                                                    | Estado                     |
| ------------------------------------------------------------ | -------------------------- |
| Listar espacios, crear SHARED, espacio activo en UI          | ✅                         |
| Invitaciones (crear, revocar, aceptar, rechazar; TTL 7 días) | ✅                         |
| Leave/remove con único OWNER protegido (409)                 | ✅                         |
| Transferencia de ownership (4.1)                             | ⬜                         |
| Último miembro ACTIVE (4.2)                                  | ⬜ (pendiente de decisión) |

## 3. Cuentas y movimientos

Fuente: [domain-model.md §3.2](./domain-model.md#32-cuentas-y-movimientos-implementado).

| Requisito                                                                  | Estado                           |
| -------------------------------------------------------------------------- | -------------------------------- |
| Cuentas por espacio (crear, listar, detalle con saldo on-read, archivar)   | 🟡 API ✅; web en rama sin merge |
| Categorías INCOME/EXPENSE                                                  | 🟡 ídem                          |
| Saldo inicial, ingreso, gasto, transferencia en el mismo espacio           | 🟡 ídem                          |
| Listado y detalle de movimientos; edición con `expectedVersion` y revisión | 🟡 ídem                          |
| Gasto individual atribuido en SHARED (B-08)                                | 🟡 ídem; congelado (P-14)        |
| Anulación de movimientos                                                   | ⬜ (P-13)                        |
| Renombrar cuenta o categoría; paginación real                              | ⬜ (no priorizado)               |

### Gastos en un espacio compartido

| Mecanismo                                           | Cuándo                                                                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Gasto compartido** (`SharedExpense`)              | Flujo principal en SHARED: pagador, participantes y método de reparto. Genera deudas si lo pagó un miembro. |
| Gasto individual (`EXPENSE` + `attributedToUserId`) | Imputación de un gasto a un solo miembro, sin reparto ni deuda. Congelado (P-14).                           |

## 4. Gastos compartidos, deudas y liquidaciones

Fuente única: [shared-expenses.md](./shared-expenses.md). Todo ⬜.

- Registrar un gasto con pagador, participantes y reparto EQUAL (defecto), PERCENTAGE o FIXED_AMOUNT.
- Previsualizar las participaciones calculadas por el servidor antes de guardar.
- Sin confirmación de participantes; las deudas se generan al guardar.
- Ver el listado de gastos, el detalle con «tu parte» y el historial de revisiones.
- Editar y anular gastos con permisos e historial.
- Ver los saldos del espacio: quién debe a quién (neto por par y moneda) y el saldo neto por miembro.
- Registrar liquidaciones parciales o completas; anularlas.

## 5. Cuentas personales en gastos compartidos y cuentas comunes

Fuente: [accounts-model.md](./accounts-model.md) — **en análisis**. Sin requisitos aprobados todavía.

## 6. Presupuestos, informes y dashboard

⬜. Requisitos previos aprobados:

- Periodo mensual en `User.timezone` del consultante; datos filtrados por `occurredAt` (UTC); solo espacios con membresía ACTIVE.
- Presupuestos en una sola moneda, sin conversión.
- Qué se considera consumo y qué flujo de caja: **P-17** (bloquea esta área).

Las métricas `totalExpense` / `attributedExpense` / `advancedAmount` del diseño inicial quedan como histórico hasta resolver P-17.

## 7. Historial y concurrencia

- Revisiones con instantánea JSONB versionada (`schemaVersion`) antes de cada edición.
- `expectedVersion` en ediciones → **409 Conflict**.
- Implementado para movimientos; pendiente para gastos compartidos y liquidaciones.

## 8. Fuera del MVP

Reclamaciones y recordatorios de deuda, cobros, conciliación o verificación bancaria, conversión de moneda, simplificación multilateral de deudas, varios OWNERs, disolución de espacios, email transaccional, migración de instantáneas antiguas y anonimización.

## Documentación relacionada

- [Visión](./product-overview.md)
- [Modelo de dominio](./domain-model.md)
- [Diseño de API](../architecture/api-design.md)
