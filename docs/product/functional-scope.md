# Alcance funcional — MVP

Requisitos funcionales por área. Las reglas detalladas viven en el documento enlazado en cada sección; el estado de las decisiones, en [decisions.md](./decisions.md).

Leyenda de estado: ✅ implementado (API + web) · 🟡 parcial · ⬜ no implementado.

---

## 1. Usuarios y sesión

| Requisito                                                       | Estado                 |
| --------------------------------------------------------------- | ---------------------- |
| Alta atómica: usuario + espacio PERSONAL + membresía OWNER      | ✅                     |
| Login/logout con cookie HttpOnly; perfil `GET /auth/me`         | ✅                     |
| Editar perfil y zona horaria (`PATCH /auth/me`, `/settings`)    | ✅                     |
| Sin borrado físico de usuarios con historial; sin anonimización | Regla (RESTRICT en BD) |

## 2. Espacios y membresía

Fuente: [spaces-membership-mvp.md](./spaces-membership-mvp.md).

| Requisito                                                    | Estado |
| ------------------------------------------------------------ | ------ |
| Listar espacios, crear SHARED, espacio activo en UI          | ✅     |
| Invitaciones (crear, revocar, aceptar, rechazar; TTL 7 días) | ✅     |
| Leave/remove con único OWNER protegido (409)                 | ✅     |
| Transferencia de ownership (4.1)                             | ✅     |
| Último miembro ACTIVE (4.2, C-05)                            | ✅     |
| Aviso saldo ≠ 0 al leave/remove (P-19)                       | ✅     |

## 3. Cuentas y movimientos

Fuente: [domain-model.md §3.2](./domain-model.md#32-cuentas-y-movimientos-implementado).

| Requisito                                                                  | Estado                        |
| -------------------------------------------------------------------------- | ----------------------------- |
| Cuentas por espacio (crear, listar, detalle con saldo on-read, archivar)   | ✅                            |
| Categorías INCOME/EXPENSE                                                  | 🟡 ídem                       |
| Saldo inicial, ingreso, gasto, transferencia en el mismo espacio           | 🟡 ídem                       |
| Listado y detalle de movimientos; edición con `expectedVersion` y revisión | 🟡 ídem                       |
| Gasto individual atribuido en SHARED (B-08)                                | 🟡 ídem; congelado (P-14)     |
| Anulación de movimientos                                                   | 🟡 API+BD P-13; UI según área |
| Renombrar cuenta o categoría; paginación real                              | ⬜ (no priorizado)            |

### Gastos en un espacio compartido

| Mecanismo                                           | Cuándo                                                                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Gasto compartido** (`SharedExpense`)              | Flujo principal en SHARED: pagador, participantes y método de reparto. Genera deudas si lo pagó un miembro. |
| Gasto individual (`EXPENSE` + `attributedToUserId`) | Imputación de un gasto a un solo miembro, sin reparto ni deuda. Congelado (P-14).                           |

## 4. Gastos compartidos, deudas y liquidaciones

Fuente única: [shared-expenses.md](./shared-expenses.md). **✅ Implementado** (API + web, 2026-11-18).

- Registrar un gasto con pagador, participantes y reparto EQUAL (defecto), PERCENTAGE o FIXED_AMOUNT.
- Previsualizar las participaciones calculadas por el servidor antes de guardar.
- Sin confirmación de participantes; las deudas se generan al guardar.
- Ver el listado de gastos, el detalle con «tu parte» y el historial de revisiones.
- Editar y anular gastos con permisos e historial.
- Ver los saldos del espacio: quién debe a quién (neto por par y moneda) y el saldo neto por miembro.
- Registrar liquidaciones parciales o completas; anularlas.

## 5. Cuentas personales en gastos compartidos y cuentas comunes

Fuente: [accounts-model.md](./accounts-model.md). **✅ Implementado** (fase 8, P-02 y P-05–P-07).

## 6. Presupuestos, informes y dashboard

**✅ MVP** (fase 9, 2026-11-19): perfil/timezone, presupuestos por espacio, informe mensual de consumo (**P-17**), panel `/dashboard`.

- Periodo mensual en `User.timezone` del consultante; datos filtrados por `occurredAt` (UTC); solo espacios con membresía ACTIVE.
- Presupuestos en una sola moneda, sin conversión.
- Consumo vs flujo de caja: **P-17** en informe de consumo (excluye vínculos de caja personal según reglas del servicio).
- Opcional: comparativa presupuesto vs real en UI; endpoint API dashboard agregado.

## 7. Historial y concurrencia

- Revisiones con instantánea JSONB versionada (`schemaVersion`) antes de cada edición.
- `expectedVersion` en ediciones → **409 Conflict**.
- Implementado para movimientos, gastos compartidos y liquidaciones.

## 8. Fuera del MVP

Reclamaciones y recordatorios de deuda, cobros, conciliación o verificación bancaria, conversión de moneda, simplificación multilateral de deudas, varios OWNERs, disolución de espacios, email transaccional, migración de instantáneas antiguas y anonimización.

## Documentación relacionada

- [Visión](./product-overview.md)
- [Modelo de dominio](./domain-model.md)
- [Diseño de API](../architecture/api-design.md)
