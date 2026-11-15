# Diseño de base de datos

PostgreSQL + Prisma 7. Esquema: [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma). Migración inicial aplicada: `apps/api/prisma/migrations/20260328183000_init/` (diseño en [`first-migration-design.md`](./first-migration-design.md)). SQL de integridad: `apps/api/prisma/sql/custom-integrity.sql`.

**Política de migraciones:** la migración inicial está en uso (`prisma migrate deploy`). **Cualquier migración nueva** (cambio de esquema, de triggers o de CHECK) requiere aprobación explícita de coordinación, con la decisión de producto que la motiva referenciada por ID ([decisions.md](../product/decisions.md)).

---

## Decisiones confirmadas (integridad MVP)

| Tema                          | Decisión                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------ |
| FK compuestas `(space_id, …)` | **Aprobadas MVP**; SQL manual; mantener en todas las migraciones               |
| Reparto participantes         | App obligatoria + **constraint trigger deferido** (≥2, suma exacta)            |
| Constraint triggers           | `DEFERRABLE INITIALLY DEFERRED`; **sin** `SET CONSTRAINTS ALL DEFERRED` global |
| Settlement retroactivo        | Validar membresía en **`occurredAt`**, no en `createdAt`                       |
| Prisma                        | No modela FK compuestas ni triggers; sin drift documentado                     |

---

## Fechas y zona horaria

`User.timezone` (IANA); `occurredAt` UTC en operaciones y liquidaciones.

---

## Precisión monetaria (ISO 4217)

Almacenamiento `NUMERIC(19,4)`. Los importes de gastos compartidos y sus participaciones se expresan en las unidades menores de la moneda; reparto por mayor resto con desempate por `userId` ascendente ([shared-expenses.md §4](../product/shared-expenses.md#4-reglas-de-reparto)).

---

## `FinancialTransaction` — combinaciones válidas

Garantizadas por CHECK `financial_transactions_fields_by_type_check` y el trigger `trg_financial_tx_business_rules`.

| `type`            | `account_id`                            | `source/destination_account_id` | `attributed_to_user_id`                                              | `category_id`  | `amount`  |
| ----------------- | --------------------------------------- | ------------------------------- | -------------------------------------------------------------------- | -------------- | --------- |
| `INCOME`          | Obligatoria                             | NULL                            | NULL                                                                 | INCOME o NULL  | > 0       |
| `EXPENSE`         | PERSONAL: obligatoria; SHARED: opcional | NULL                            | Obligatoria salvo pago `SPACE_ACCOUNT` de un gasto compartido (NULL) | EXPENSE o NULL | > 0       |
| `TRANSFER`        | NULL                                    | Ambas, distintas, mismo espacio | NULL                                                                 | NULL           | > 0       |
| `OPENING_BALANCE` | Obligatoria                             | NULL                            | NULL                                                                 | NULL           | Con signo |

`EXPENSE` sin atribución solo es válido emparejado con un `SharedExpense` `SPACE_ACCOUNT` (trigger diferido, reglas P1–P5 de la sección siguiente).

---

## SPACE_ACCOUNT — integridad diferida

Orden insert: tx → shared → participantes. Validación al **commit** vía `ctrg_validate_space_account_pairing` (INITIALLY DEFERRED):

- **P1** — Todo `EXPENSE` sin `attributed_to_user_id` está vinculado a un `SharedExpense` `SPACE_ACCOUNT`.
- **P2** — Todo `SharedExpense` `SPACE_ACCOUNT` tiene `financial_transaction_id` y no tiene `paid_by_user_id`.
- **P3** — El movimiento vinculado es `EXPENSE`, con cuenta, sin atribución, del mismo espacio, misma moneda e igual importe que el gasto.
- **P4** — Ningún movimiento vinculado a un gasto compartido tiene atribución.
- **P5** — `CASH` / `EXTERNAL_PERSONAL` tienen `paid_by_user_id` y no tienen movimiento vinculado (CHECK `shared_expenses_payment_source_check`).

---

## FK compuestas — diseño exacto

**UNIQUE en padres:** `(space_id, id)` en `accounts`, `categories`, `financial_transactions`, `shared_expenses`.

**FK compuestas:**

| Hijo                     | FK                                                                |
| ------------------------ | ----------------------------------------------------------------- |
| `financial_transactions` | `(space_id, account_id)` → `accounts`                             |
| `financial_transactions` | `(space_id, category_id)` → `categories`                          |
| `financial_transactions` | `(space_id, source_account_id)` → `accounts`                      |
| `financial_transactions` | `(space_id, destination_account_id)` → `accounts`                 |
| `shared_expenses`        | `(space_id, category_id)` → `categories`                          |
| `shared_expenses`        | `(space_id, financial_transaction_id)` → `financial_transactions` |
| `budgets`                | `(space_id, category_id)` → `categories`                          |

**No duplicar** triggers cuyo único efecto sea cross-space ya cubierto por estas FK. Mantener triggers para moneda, archivado, PERSONAL/SHARED, inmutabilidad de padres.

**Prisma:** FK simples del schema permanecen; compuestas son capa SQL adicional obligatoria.

---

## Integridad cross-space y mutaciones posteriores

Triggers `BEFORE UPDATE` en `accounts`, `categories`, `spaces` impiden cambios de `spaceId`/`currency`/`type` con referencias. Corrección financiera versionada; desarchivado explícito.

---

## `SharedExpense` — reparto

App: splitMode, %, redondeo, ≥2 participantes (obligatorio). Reglas funcionales: [shared-expenses.md](../product/shared-expenses.md). El mínimo de participantes puede cambiar (P-15).

**BD (MVP):** `ctrg_validate_shared_expense_participants` DEFERRABLE INITIALLY DEFERRED:

- Tablas/eventos: `expense_participants` (I/U/D); `shared_expenses` (UPDATE `total_amount`, DELETE).
- Al commit: ≥2 participantes; suma = `totalAmount`; `allocated_amount > 0`.

---

## `Settlement` — retroactivo y membresía temporal

- Solo SHARED; CHECK importe y usuarios distintos.
- **Pertenencia:** evaluar en **`occurredAt`** (UTC).

Usuario `u` pertenece al espacio en instante `T` si existe `space_memberships` `m` con:

- `m.space_id = settlement.space_id`
- `m.user_id = u`
- `m.joined_at <= T`
- `m.left_at IS NULL OR T < m.left_at` → intervalo **[joined_at, left_at)**

Aplicar a **`from_user_id`** y **`to_user_id`**. Válido aunque hoy estén LEFT/REMOVED si en `occurredAt` estaban en el espacio. Rechazar si ninguna fila de membresía cubre ese instante (nunca perteneció o fecha anterior a ingreso / posterior a salida).

**No** exigir membresía ACTIVE en el momento del registro si `occurredAt` es pasado y el intervalo histórico lo permite.

**Limitación conocida:** con esta regla, una deuda de un miembro que ya salió no puede saldarse con fecha posterior a su salida. Cambio propuesto en P-19 ([decisions.md](../product/decisions.md)).

**Auditoría:** `recordedByUserId`, `createdAt`/`updatedAt` registran quién y cuándo se introduce la fila; no sustituyen la validación temporal.

---

## Concurrencia optimista y `FinancialRevision`

Algoritmo sin `SELECT FOR UPDATE`: UPDATE condicional por `version`, snapshot previo, INSERT revisión, 409 en conflicto. Detalle en [api-design.md](./api-design.md).

---

## Presupuestos y monedas

Consumo solo movimientos con `currency = budget.currency`; sin FX. Qué cuenta como consumo en presupuestos personales y compartidos: **PENDIENTE DE DECISIÓN** (P-17).

---

## Cambios de esquema previstos (no aprobados)

Necesarios para las decisiones aprobadas A-05 (anulación) y para las recomendaciones pendientes. **No ejecutar** hasta que coordinación apruebe la decisión y la migración.

| Cambio                                                                                                                                  | Motivo                 | Fase  |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----- |
| Anulación lógica (`voided_at`, `voided_by_user_id`) en `shared_expenses` y `settlements`; excluir anulados del trigger de participantes | A-05, P-13             | 6 / 7 |
| Sustituir `settlements.status` por la anulación lógica                                                                                  | P-12                   | 7     |
| Unificar `CASH` / `EXTERNAL_PERSONAL` en un único origen «miembro»                                                                      | P-03                   | 6     |
| Relajar el mínimo de participantes a «≥1 distinto del pagador» (trigger diferido)                                                       | P-15                   | 6     |
| Relajar la validación temporal de liquidaciones para ex-miembros                                                                        | P-19                   | 7     |
| Anulación lógica de `financial_transactions`                                                                                            | P-13                   | 6+    |
| Vínculo entre espacios (movimiento personal ↔ gasto, aportación o liquidación); aportante en entradas de cuentas compartidas           | P-02, P-05, P-06, P-07 | 8     |

Cada cambio se acompaña de: SQL de integridad actualizado en `custom-integrity.sql`, tests en `test/database/` y actualización de este documento.

---

## Matriz de integridad

| #   | Regla                              | Mecanismo             | Momento  | Riesgo                | Prueba         |
| --- | ---------------------------------- | --------------------- | -------- | --------------------- | -------------- |
| 1   | FK + RESTRICT                      | FK Prisma             | I/U/D    | Borrado historial     | Integración    |
| 2   | FK compuestas espacio              | FK SQL manual         | I/U      | Cross-space           | PG FK test     |
| 3   | Una membresía ACTIVE / par         | Índice parcial UNIQUE | I/U      | Doble ACTIVE          | DB             |
| 4   | Shared/Settlement solo SHARED      | Trigger BI/BU         | I/U      | Shared en PERSONAL    | PG             |
| 5   | Tx campos según type               | CHECK                 | BI/BU    | Combo inválida        | SQL            |
| 6   | Importes por type                  | CHECK                 | BI/BU    | Cero inválido         | Unit           |
| 7   | EXPENSE PERSONAL cuenta            | Trigger + app         | BI/BU    | Sin cuenta            | App            |
| 8   | Moneda / archivado / cat. tipo     | Trigger + app         | BI/BU    | Reglas negocio        | Integration    |
| 9   | TRANSFER                           | CHECK + FK compuesta  | BI/BU    | Transfer inválida     | Unit           |
| 10  | payment_source                     | CHECK                 | BI/BU    | Pagador/tx            | Unit           |
| 11  | SPACE_ACCOUNT pareja               | ctrg deferido         | Commit   | Tx/shared huérfanos   | PG             |
| 12  | Participantes ≥2 y suma            | ctrg deferido + app   | Commit   | Reparto inválido      | PG             |
| 13  | splitMode / ISO 4217               | App                   | Commit   | Redondeo              | Unit           |
| 14  | Settlement membresía en occurredAt | Trigger + app         | BI/BU    | Liquidación ilegítima | PG retroactivo |
| 15  | Revisión una FK                    | CHECK                 | I        | Snapshot              | DB             |
| 16  | Revisión inmutable                 | Trigger BU/BD         | U/D      | Historial             | DB             |
| 17  | Optimistic + revisión              | App transacción       | Commit   | 409                   | Integration    |
| 18  | Padre account/category/space       | Trigger BU            | U        | Invalidar histórico   | PG             |
| 19  | Budget / presupuesto moneda        | CHECK + app           | I/U/Read | FX                    | Unit           |
| 20  | Atribución EXPENSE roles           | App                   | Request  | Auth                  | Auth           |
| 21  | Alta user+space                    | App                   | Registro | Usuario incompleto    | Integration    |
| 22  | Borrado user                       | RESTRICT              | D        | Auditoría             | DB             |
| 23  | Migraciones: SQL integridad        | Proceso               | Migrate  | Drift Prisma          | Review PR      |

---

## Prisma 7

```bash
DATABASE_URL=postgresql://... pnpm --filter @wealthspace/api prisma:validate
```

Nunca `db push`. Nuevas migraciones con `migrate dev --create-only`, revisión del SQL de integridad y aprobación previa (ver política al inicio).

---

## Documentación relacionada

- [Primera migración (diseño)](./first-migration-design.md)
- [Modelo de dominio](../product/domain-model.md)
- [Seguridad](./security.md)
- [Estrategia de pruebas](../development/testing-strategy.md)
