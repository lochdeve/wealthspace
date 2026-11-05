# Diseño de base de datos

PostgreSQL + Prisma 7. Esquema: [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma). Plan migración: [`first-migration-design.md`](./first-migration-design.md).

**No** ejecutar migraciones hasta aprobación explícita.

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

Almacenamiento 4 decimales; reparto mayor resto; desempate `userId`.

---

## `FinancialTransaction` — combinaciones válidas

(Véase tabla previa: INCOME, EXPENSE, TRANSFER, OPENING_BALANCE; EXPENSE SHARED sin cuenta; SPACE_ACCOUNT sin atribución en tx.)

---

## SPACE_ACCOUNT — integridad diferida

Orden insert: tx → shared → participantes. Validación al **commit** vía `ctrg_validate_space_account_pairing` (INITIALLY DEFERRED). Reglas P1–P5 sin cambio semántico.

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

App: splitMode, %, redondeo, ≥2 participantes (obligatorio).

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

**Auditoría:** `recordedByUserId`, `createdAt`/`updatedAt` registran quién y cuándo se introduce la fila; no sustituyen la validación temporal.

---

## Concurrencia optimista y `FinancialRevision`

Algoritmo sin `SELECT FOR UPDATE`: UPDATE condicional por `version`, snapshot previo, INSERT revisión, 409 en conflicto. Detalle en [api-design.md](./api-design.md).

---

## Presupuestos y monedas

Consumo solo movimientos con `currency = budget.currency`; sin FX.

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
DATABASE_URL=postgresql://... npx prisma validate
```

Sin `migrate` / `db push` hasta aprobación.

---

## Documentación relacionada

- [Primera migración (diseño)](./first-migration-design.md)
- [Modelo de dominio](../product/domain-model.md)
- [Seguridad](./security.md)
- [Estrategia de pruebas](../development/testing-strategy.md)
