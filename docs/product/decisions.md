# Registro de decisiones de producto

Índice único del estado de las decisiones funcionales. Cada entrada enlaza a la especificación que la desarrolla. Lo mantiene el chat de **coordinación** (producto y arquitectura).

**Estados:**

- **APROBADA** — vinculante para backend y frontend. Cambiarla requiere justificación y revisión en coordinación.
- **PENDIENTE DE DECISIÓN** — no implementar comportamiento propio. Se indica una **recomendación** razonada; hasta que se apruebe, solo vale el comportamiento seguro indicado.
- **HISTÓRICA** — decisión anterior sustituida; se conserva para trazabilidad.

Las decisiones arquitectónicas confirmadas viven en [`docs/decisions/`](../decisions/README.md) (ADR).

---

## 1. Decisiones aprobadas — gastos compartidos, deudas y liquidaciones (2026-11-15)

Especificación: [shared-expenses.md](./shared-expenses.md).

| ID   | Decisión                                                                                                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-01 | Un gasto compartido admite tres métodos de reparto: **a partes iguales**, **por porcentajes** e **importes personalizados**. Por defecto: a partes iguales.                                             |
| A-02 | Porcentajes: deben sumar exactamente **100 %**; editables antes de guardar; la aplicación calcula los importes con redondeo consistente y la suma de participaciones coincide exactamente con el total. |
| A-03 | Importes personalizados: el usuario indica la parte de cada participante; la suma debe coincidir exactamente con el total.                                                                              |
| A-04 | **No existe confirmación de participantes.** Registrar el gasto genera participaciones y deudas inmediatamente.                                                                                         |
| A-05 | Los gastos se pueden **editar y anular**, con control de permisos e historial de revisiones.                                                                                                            |
| A-06 | **Gasto**, **deuda** y **liquidación** son conceptos separados en dominio y en UX.                                                                                                                      |
| A-07 | La deuda se calcula automáticamente a partir del gasto y su reparto; no depende de ninguna aceptación.                                                                                                  |
| A-08 | La liquidación se registra manualmente, representa un pago hecho fuera de Wealthspace, puede ser parcial o completa y reduce la deuda por su importe. No equivale a aceptar un gasto.                   |
| A-09 | Wealthspace **no verifica** transferencias bancarias **ni ejecuta** pagos.                                                                                                                              |
| A-10 | Registrar o consultar un gasto compartido **no mueve dinero** en las cuentas de quienes no lo pagaron. El dinero solo se refleja cuando se registra el movimiento real correspondiente.                 |

## 2. Decisiones aprobadas vigentes de etapas anteriores

| ID   | Decisión                                                                                                                                                                                                           | Fuente                                                            | Implementado                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------- |
| B-01 | Espacios aislados: PERSONAL (uno por usuario, creado en el registro) y SHARED (grupo con miembros).                                                                                                                | [product-overview.md](./product-overview.md)                      | Sí                                              |
| B-02 | Membresía, invitaciones, roles OWNER/ADMIN/MEMBER, leave/remove, un único OWNER.                                                                                                                                   | [spaces-membership-mvp.md](./spaces-membership-mvp.md)            | Sí (salvo 4.1/4.2)                              |
| B-03 | Importes con `Decimal` (`NUMERIC(19,4)`), moneda ISO 4217, sin conversión de divisas.                                                                                                                              | [database-design.md](../architecture/database-design.md)          | Sí                                              |
| B-04 | Reparto: método del **mayor resto** en unidades menores de la moneda; desempate determinista por `userId` ascendente.                                                                                              | [shared-expenses.md §4](./shared-expenses.md#4-reglas-de-reparto) | No                                              |
| B-05 | Saldos de cuenta calculados al leer (on-read), nunca editables directamente.                                                                                                                                       | [database-design.md](../architecture/database-design.md)          | Sí                                              |
| B-06 | Concurrencia optimista: `expectedVersion` → **409** + revisión inmutable (`FinancialRevision`).                                                                                                                    | [api-design.md](../architecture/api-design.md)                    | Sí (transacciones)                              |
| B-07 | Liquidaciones: `occurredAt` es la fecha declarada del pago (puede ser retroactiva). Validación de `from`/`to` en liquidaciones: **P-19** (sustituye el criterio estricto en `occurredAt` de la migración inicial). | [database-design.md](../architecture/database-design.md)          | Migración inicial (pendiente B-7.0)             |
| B-08 | Gasto individual en SHARED (`EXPENSE` con `attributedToUserId`); matriz de atribución Owner/Admin → cualquiera, Member → sí mismo.                                                                                 | [functional-scope.md](./functional-scope.md)                      | Sí (ver P-14)                                   |
| B-09 | Fuera del alcance: reclamaciones, cobros, conciliación bancaria, conversión de moneda, `EconomicParty`, anonimización.                                                                                             | [functional-scope.md](./functional-scope.md)                      | —                                               |
| B-10 | Zona horaria IANA por usuario; operaciones en UTC; informes por mes local del usuario.                                                                                                                             | [functional-scope.md](./functional-scope.md)                      | Parcial (campo existe, sin edición ni informes) |

## 2b. Decisiones aprobadas — fase 6 (2026-11-15)

Aprobadas por el responsable de producto a partir de las recomendaciones de coordinación. Se conservan sus IDs originales para no romper referencias. Especificación: [shared-expenses.md](./shared-expenses.md).

| ID   | Decisión                                                                                                                                                                                                                                                                                                                      |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-03 | Orígenes de pago: **«pagado por un miembro»** (`MEMBER`, sustituye a `CASH` y `EXTERNAL_PERSONAL`) y **cuenta compartida** (`SPACE_ACCOUNT`). El pago desde una cuenta personal registrada será un vínculo opcional (P-02), no otro origen.                                                                                   |
| P-04 | Un gasto pagado desde una cuenta compartida **no genera deudas** entre miembros; las participaciones indican consumo (informativo).                                                                                                                                                                                           |
| P-08 | La deuda se calcula **al leer** (sin tabla `Debt`), **neta por par** (deudor, acreedor) y por moneda. Sin simplificación multilateral en MVP.                                                                                                                                                                                 |
| P-09 | Registrar: cualquier miembro ACTIVE. Pagador: matriz de atribución (MEMBER → solo él mismo; OWNER/ADMIN → cualquier miembro). Participantes: miembros del espacio en `occurredAt`. Editar o anular: quien lo registró, el pagador, OWNER o ADMIN.                                                                             |
| P-13 | **Anulación lógica** (`voidedAt`, `voidedByUserId`, motivo en la revisión), nunca borrado físico. Lo anulado no cuenta en deudas ni saldos y sigue visible en el historial. Anular un gasto `SPACE_ACCOUNT` anula también su movimiento vinculado, y el saldo on-read lo excluye (aclaración del 2026-11-15, escalada B-6.0). |
| P-14 | El gasto individual atribuido en SHARED (B-08) queda **congelado** (sin sustituirlo por gasto compartido): renombrado «Gasto individual», sin reparto ni deudas; el flujo **principal** del espacio es el gasto compartido. **Visibilidad en menú:** ver C-04. Su eliminación como concepto se decidirá más adelante.         |
| P-15 | Mínimo: **1 participante distinto del pagador** (permite «Ana paga 30 € solo por Carlos»); con `SPACE_ACCOUNT`, al menos 1 participante. Requiere migración del trigger de participantes.                                                                                                                                     |
| P-16 | Previsualización mediante endpoint **dry-run** (`POST …/shared-expenses/preview`) con el mismo cálculo y las mismas validaciones del alta. La web no reimplementa el redondeo.                                                                                                                                                |

## 2c. Decisiones aprobadas — alineación de la fase 5 (2026-11-15)

Surgen de la auditoría del frontend.

| ID   | Decisión                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-01 | En las cuentas de un espacio SHARED, el formulario genérico «Registrar gasto» desaparece y se sustituye por un enlace al «Gasto individual» con la cuenta preseleccionada (coherente con P-14). No se añade el campo «Atribuido a» al formulario genérico.                                                                                                                                                              |
| C-02 | La **categoría** de un movimiento es editable después de crearlo (`PATCH`), con las mismas reglas que en el alta (categoría del mismo espacio y del tipo compatible), `expectedVersion` y revisión. Los movimientos vinculados a un gasto compartido siguen sin poder editarse directamente.                                                                                                                            |
| C-03 | Los 400 de validación de entrada devuelven `code: "VALIDATION_ERROR"` y, cuando sea posible, el campo afectado, manteniendo el formato `{statusCode, code, message}`. La web nunca muestra el `message` de la API.                                                                                                                                                                                                      |
| C-04 | En espacios **SHARED**, el **Gasto individual** debe ser **fácil de encontrar**: enlace en el menú «Finanzas del espacio» junto a «Añadir gasto» (compartido), más el acceso desde movimientos y cuentas. Copy breve que distinga «solo una persona / sin reparto» frente a «reparto entre miembros». Sin cambio de API ni esquema (mismo `POST …/transactions/expense` con `attributedToUserId`). Aprobado 2026-11-15. |

## 2d. Decisiones aprobadas — fase 7 liquidaciones (2026-11-15)

Especificación: [shared-expenses.md §7](./shared-expenses.md#7-liquidaciones-a-08). Aprobación de coordinación tras escalada backend (R1).

| ID   | Decisión                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-10 | **Registrar** liquidación: `from_user_id`, `to_user_id`, OWNER o ADMIN (todos ACTIVE en el momento del alta). **Anular:** quien la registró (`recorded_by_user_id`), `from`, `to`, OWNER o ADMIN. Sin `PATCH` en MVP; corrección = anular + volver a registrar.                                                                                                                                                                                                                                                                                                         |
| P-11 | La API **acepta** cualquier importe **> 0** aunque supere la deuda neta pendiente del par y la moneda (**sin 400** por sobrepago). Opcional en **201**: `warnings: ["SETTLEMENT_EXCEEDS_PENDING_DEBT"]` si al registrar el importe supera el pendiente calculado. La web muestra aviso claro (F-7.2). El saldo neto puede invertir de signo si los gastos cambian después.                                                                                                                                                                                              |
| P-12 | Se elimina `SettlementStatus` / columna `status`. **Vigente** = no anulado (`voided_at` IS NULL). Anulación lógica como P-13: `voided_at`, `voided_by_user_id`, motivo en `FinancialRevision`; lo anulado no cuenta en deudas/saldos.                                                                                                                                                                                                                                                                                                                                   |
| P-19 | `from` y `to` deben tener **histórico** en el espacio (fila en `space_memberships`, cualquier estado). **No** exigir pertenencia en `occurred_at` dentro de `[joinedAt, leftAt)`; se permite liquidar con **ex-miembros** (p. ej. `occurred_at` posterior a `leftAt`). Reglas: `occurred_at` ≥ `joined_at` de la primera membresía de cada parte en ese espacio; quien registra debe estar **ACTIVE**; `from ≠ to`. Al leave/remove, si el saldo neto del usuario ≠ 0, **aviso informativo** en UI (no bloquea). Migración B-7.0 actualiza el trigger de liquidaciones. |

## 2e. Decisiones aprobadas — fase 8 cuentas vinculadas (2026-11-18)

Aprobadas por el responsable de producto (cuestionario coordinación). Implementación **en espera** del plan técnico revisado (sin código hasta aprobación del plan).

| ID   | Decisión                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 | Cuentas personales = cuentas del espacio **PERSONAL** del usuario (varias por usuario); cuentas comunes = cuentas del espacio **SHARED**. **No** migrar a `ownerUserId`; se mantiene `Account.spaceId`.                                                                                                                                                                                                    |
| P-02 | Al registrar un gasto compartido, el pagador puede elegir **opcionalmente** una cuenta personal suya; la API crea gasto + movimiento de salida enlazados en una transacción. El SHARED solo ve «pagado por …». Editar/anular el gasto propaga el movimiento. Confirmado por producto: **un solo paso, automático** (no doble apunte manual del gasto de compra).                                           |
| P-05 | Aportaciones a la cuenta común: `INCOME` con **aportante** identificado; opcionalmente salida vinculada en la cuenta personal del aportante. Sin deudas entre miembros.                                                                                                                                                                                                                                    |
| P-06 | Movimiento personal ↔ cuenta común: **dos movimientos vinculados** en espacios distintos, una operación; solo el titular inicia desde su personal.                                                                                                                                                                                                                                                        |
| P-07 | **Liquidaciones:** en MVP la liquidación sigue reduciendo solo la deuda del espacio. **Opcional en fase 8:** quien **registra** la liquidación puede vincular un movimiento en **su propia** cuenta personal (salida si es `from`, entrada si es `to`). No se crean movimientos automáticos en el espacio personal del **otro** miembro sin que él registre o vincule (evita escribir en finanzas ajenas). |
| P-17 | Presupuestos e informes: por defecto **consumo** (participación / gasto individual); adelantos, aportaciones y liquidaciones = flujo de caja, excluidos del presupuesto por defecto.                                                                                                                                                                                                                       |
| C-05 | **4.2:** se **permite** leave siendo el último ACTIVE, con **confirmación fuerte** y aviso claro (el espacio queda sin miembros activos). No se implementa `LAST_ACTIVE_MEMBER` como bloqueo 409.                                                                                                                                                                                                          |

**Alcance de implementación:** coordinación entrega plan técnico B-8/F-8 (migración, endpoints, privacidad) para revisión **antes** de que backend/front codifiquen.

## 3. Decisiones pendientes

Prioridad: **Alta** = bloquea la siguiente fase de implementación; **Media** = bloquea una fase posterior; **Baja** = mejora.

### 3.1 Liquidaciones (fase 7)

**Cerrado (2026-11-15):** P-10, P-11, P-12 y P-19 aprobadas en [§2d](#2d-decisiones-aprobadas--fase-7-liquidaciones-2026-11-15).

### 3.2 Modelo de cuentas y presupuestos

**Cerrado (2026-11-18):** P-01…P-07 y P-17 en [§2e](#2e-decisiones-aprobadas--fase-8-cuentas-vinculadas-2026-11-18). Referencia: [accounts-model.md](./accounts-model.md).

### 3.3 Pendientes anteriores que siguen abiertos

| Tema                                         | Estado                                                             | Fuente                                                 |
| -------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| Transferencia de ownership (entrega 4.1)     | ✅ Implementada API + web                                          | [spaces-membership-mvp.md](./spaces-membership-mvp.md) |
| Último miembro ACTIVE hace leave (4.2)       | ✅ Aprobado **C-05**: permitir con confirmación fuerte (no 409)    | [spaces-membership-mvp.md](./spaces-membership-mvp.md) |
| Edición de perfil y zona horaria del usuario | Sin endpoint; necesaria antes de los informes mensuales (fase 9)   | [functional-scope.md](./functional-scope.md)           |
| Tipos compartidos web/api                    | Herramienta pendiente (openapi-typescript o tipos escritos a mano) | [contracts README](../../packages/contracts/README.md) |
| Rebase frente a merge; aprobaciones de PR    | Pendiente de equipo                                                | [git-workflow.md](../development/git-workflow.md)      |

## 4. Decisiones históricas

| Antes                                                                                                                     | Ahora                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| La especificación inicial preveía que las liquidaciones «pueden confirmarse o anularse» (estado `CONFIRMED`/`CANCELLED`). | Las liquidaciones están vigentes desde que se registran; solo pueden anularse (A-08, P-12). |
| Métricas del dashboard global `totalExpense` / `attributedExpense` / `advancedAmount` (diseñadas, no implementadas).      | Se redefinen con P-17 tras decidir el modelo de cuentas.                                    |

## Procedimiento de cambio

1. Backend o frontend detecta un hueco o un conflicto → **no** implementa una regla propia; lo comunica a coordinación indicando el ID afectado.
2. Coordinación actualiza este registro y la especificación correspondiente en el mismo cambio.
3. Si una decisión cambia el esquema de BD, la migración requiere aprobación explícita (ver [database-design.md](../architecture/database-design.md)).
