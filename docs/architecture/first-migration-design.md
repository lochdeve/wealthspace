# Diseño de la primera migración

**Documento de referencia histórico:** describe la migración inicial, que ya está aplicada y en uso. Las reglas vigentes y los cambios previstos se mantienen en [database-design.md](./database-design.md); si ambos documentos difieren, prevalece `database-design.md` junto con `custom-integrity.sql`.

Migración ejecutable: `apps/api/prisma/migrations/20260328183000_init/`. SQL reutilizable: `apps/api/prisma/sql/custom-integrity.sql`. Esquema Prisma: [`schema.prisma`](../../apps/api/prisma/schema.prisma).

**FK compuestas y constraint triggers:** aprobados para MVP. **No** representados en Prisma; **obligatorios** en SQL manual de la primera migración y **reaplicados/revisados** en cada migración posterior (bloque `-- custom integrity`).

**SET CONSTRAINTS:** no usar `SET CONSTRAINTS ALL DEFERRED` como requisito global. Los constraint triggers se declaran `DEFERRABLE INITIALLY DEFERRED` y se validan al **COMMIT** por defecto. `SET CONSTRAINTS` solo en operaciones excepcionales documentadas.

---

## 1. Orden de creación de tablas

| Fase | Tablas                                   |
| ---- | ---------------------------------------- |
| 1    | Enums (PostgreSQL vía Prisma)            |
| 2    | `spaces`                                 |
| 3    | `users`                                  |
| 4    | `space_memberships`, `space_invitations` |
| 5    | `accounts`, `categories`                 |
| 6    | `budgets`                                |
| 7    | `financial_transactions`                 |
| 8    | `shared_expenses`                        |
| 9    | `expense_participants`                   |
| 10   | `settlements`                            |
| 11   | `financial_revisions`                    |

Alta usuario: transacción app `spaces` → `users` → `space_memberships`.

---

## 2. Claves únicas para FK compuestas (SQL manual)

Toda tabla referenciada por `(space_id, id)` del hijo:

| Tabla                    | Constraint              |
| ------------------------ | ----------------------- |
| `accounts`               | `UNIQUE (space_id, id)` |
| `categories`             | `UNIQUE (space_id, id)` |
| `financial_transactions` | `UNIQUE (space_id, id)` |
| `shared_expenses`        | `UNIQUE (space_id, id)` |

(`id` ya es PK global; el UNIQUE compuesto permite FK desde filas hijas que duplican `space_id`.)

---

## 3. FK compuestas (SQL manual, MVP aprobado)

PostgreSQL omite la comprobación FK si alguna columna de la FK es NULL (salvo match parcial no aplica en composite — todas las columnas del composite deben ser non-null para validar).

| Tabla hija               | Columnas FK                            | Tabla padre                             | Protege                     |
| ------------------------ | -------------------------------------- | --------------------------------------- | --------------------------- |
| `financial_transactions` | `(space_id, account_id)`               | `accounts (space_id, id)`               | Cuenta del mismo espacio    |
| `financial_transactions` | `(space_id, category_id)`              | `categories (space_id, id)`             | Categoría del mismo espacio |
| `financial_transactions` | `(space_id, source_account_id)`        | `accounts (space_id, id)`               | Origen transfer             |
| `financial_transactions` | `(space_id, destination_account_id)`   | `accounts (space_id, id)`               | Destino transfer            |
| `shared_expenses`        | `(space_id, category_id)`              | `categories (space_id, id)`             | Categoría shared            |
| `shared_expenses`        | `(space_id, financial_transaction_id)` | `financial_transactions (space_id, id)` | Tx pago mismo espacio       |
| `budgets`                | `(space_id, category_id)`              | `categories (space_id, id)`             | Presupuesto / categoría     |

Las FK simples de Prisma (`account_id → accounts.id`) **permanecen** para generación ORM; las compuestas añaden la garantía de espacio. No duplicar triggers BEFORE cuya única función sea alinear espacio de cuenta/categoría ya cubierto por FK compuesta.

**Siguen en triggers/app (no sustituibles solo por FK):** moneda coherente, cuenta archivada en altas, EXPENSE PERSONAL exige cuenta, tipo categoría vs operación.

---

## 4. Índices

| Índice                 | SQL                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Prisma `@@index`       | Generado                                                                                   |
| Membresía ACTIVE única | `CREATE UNIQUE INDEX ... ON space_memberships (space_id, user_id) WHERE status = 'ACTIVE'` |

---

## 5. CHECK constraints

### `financial_transactions`

```sql
CHECK (
  (type IN ('INCOME','EXPENSE','TRANSFER') AND amount > 0)
  OR (type = 'OPENING_BALANCE')
)

CHECK (
  (type = 'INCOME' AND account_id IS NOT NULL
    AND source_account_id IS NULL AND destination_account_id IS NULL
    AND attributed_to_user_id IS NULL)
  OR (type = 'EXPENSE'
    AND source_account_id IS NULL AND destination_account_id IS NULL)
  OR (type = 'TRANSFER' AND account_id IS NULL
    AND source_account_id IS NOT NULL AND destination_account_id IS NOT NULL
    AND source_account_id <> destination_account_id
    AND attributed_to_user_id IS NULL AND category_id IS NULL)
  OR (type = 'OPENING_BALANCE' AND account_id IS NOT NULL
    AND source_account_id IS NULL AND destination_account_id IS NULL
    AND attributed_to_user_id IS NULL AND category_id IS NULL)
)
```

### `shared_expenses`

```sql
CHECK (total_amount > 0)

CHECK (
  (payment_source = 'CASH'
    AND paid_by_user_id IS NOT NULL AND financial_transaction_id IS NULL)
  OR (payment_source = 'EXTERNAL_PERSONAL'
    AND paid_by_user_id IS NOT NULL AND financial_transaction_id IS NULL)
  OR (payment_source = 'SPACE_ACCOUNT'
    AND paid_by_user_id IS NULL AND financial_transaction_id IS NOT NULL)
)
```

### `expense_participants`

```sql
CHECK (allocated_amount > 0)
```

### `settlements`

```sql
CHECK (amount > 0 AND from_user_id <> to_user_id)
```

### `budgets`

```sql
CHECK (amount > 0 AND period_start <= period_end)
```

### `financial_revisions`

```sql
CHECK (
  (CASE WHEN financial_transaction_id IS NOT NULL THEN 1 ELSE 0 END
   + CASE WHEN shared_expense_id IS NOT NULL THEN 1 ELSE 0 END
   + CASE WHEN settlement_id IS NOT NULL THEN 1 ELSE 0 END) = 1
)
```

---

## 6. Triggers inmediatos (BEFORE INSERT/UPDATE)

| Nombre                                  | Tabla                    | Función                                                                                   |
| --------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| `trg_shared_expense_shared_space`       | `shared_expenses`        | `spaces.type = SHARED`                                                                    |
| `trg_settlement_shared_space`           | `settlements`            | Idem                                                                                      |
| `trg_settlement_membership_at_occurred` | `settlements`            | Pertenencia histórica de `from`/`to` en `occurred_at` (§ Settlement)                      |
| `trg_financial_tx_business_rules`       | `financial_transactions` | Moneda; cuenta no archivada en altas; PERSONAL EXPENSE exige `account_id`; tipo categoría |
| `trg_account_immutable_refs`            | `accounts`               | BU: prohibir `space_id`, `currency` con referencias                                       |
| `trg_category_immutable_refs`           | `categories`             | BU: prohibir `space_id`, `type` con referencias                                           |
| `trg_space_type_immutable`              | `spaces`                 | BU: prohibir cambio `type` con shared/settlements                                         |
| `trg_financial_revisions_immutable`     | `financial_revisions`    | BU/BD: RAISE EXCEPTION                                                                    |

---

## 7. Constraint triggers diferidos (INITIALLY DEFERRED)

Definición: `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED`. Validación al **COMMIT** sin `SET CONSTRAINTS` global.

### 7.1 `ctrg_validate_space_account_pairing`

| Tabla                    | Eventos                      |
| ------------------------ | ---------------------------- |
| `financial_transactions` | AFTER INSERT, UPDATE, DELETE |
| `shared_expenses`        | AFTER INSERT, UPDATE, DELETE |

Al commit: reglas P1–P5 en [database-design.md](./database-design.md) (pareja SPACE_ACCOUNT, sin tx huérfanas, sin EXPENSE sin atribución sin shared).

### 7.2 `ctrg_validate_shared_expense_participants` (MVP aprobado)

| Tabla                  | Eventos                                |
| ---------------------- | -------------------------------------- |
| `expense_participants` | AFTER INSERT, UPDATE, DELETE           |
| `shared_expenses`      | AFTER UPDATE OF `total_amount`, DELETE |

Por cada `shared_expenses.id` afectado en la transacción:

1. **≥ 2** filas en `expense_participants`.
2. Cada `allocated_amount > 0` (refuerzo CHECK).
3. `SUM(allocated_amount) = shared_expenses.total_amount`.

Si se **elimina** un shared, la transacción debe eliminar participantes antes (FK RESTRICT) o el DELETE del padre falla; si CASCADE no existe, orden app: hijos → padre.

La validación de **splitMode**, porcentajes y redondeo ISO 4217 permanece **solo en app** (obligatoria).

---

## 8. Settlement — membresía en `occurred_at`

**Fecha de validación:** `settlements.occurred_at` (instante UTC). **No** usar `created_at` para pertenencia.

**Intervalo de pertenencia** para fila `space_memberships` `m`:

```
m.joined_at <= occurred_at
AND (m.left_at IS NULL OR occurred_at < m.left_at)
```

Semántica: intervalo **[joined_at, left_at)**; si `left_at` es null, membresía abierta.

**Reglas:**

- `from_user_id` y `to_user_id` distintos (CHECK).
- Espacio SHARED (trigger).
- Para **cada** usuario (`from`, `to`): existe **al menos una** fila de membresía en `space_id` que cubra `occurred_at` (reincorporaciones generan varias filas; basta una válida).
- **No** exige status ACTIVE **actual** si la liquidación es retroactiva.
- Usuario que **nunca** perteneció en ese instante → rechazo.
- LEFT/REMOVED posterior **no** invalida liquidaciones ya registradas.
- Auditoría: `recorded_by_user_id`, `created_at` / `updated_at` sin sustituir a `occurred_at`.

---

## 9. Orden de instalación

1. DDL Prisma (tablas, FK simples, índices).
2. UNIQUE `(space_id, id)` en tablas padre listadas.
3. FK compuestas.
4. Índice parcial membresía ACTIVE.
5. CHECK constraints.
6. Funciones PL/pgSQL.
7. Triggers BEFORE.
8. Constraint triggers DEFERRABLE INITIALLY DEFERRED.
9. (Opcional) REVOKE UPDATE/DELETE en `financial_revisions` para rol app.

---

## 10. Flujo app SPACE_ACCOUNT (referencia)

```
BEGIN;
INSERT financial_transactions (...);
INSERT shared_expenses (... financial_transaction_id ...);
INSERT expense_participants (...);
COMMIT;  -- ctrg_* diferidos validan al commit
```

---

## 11. Mantenimiento en migraciones futuras

- Tras `prisma migrate dev --create-only`, reaplicar o verificar bloque SQL de integridad.
- Documentar en PR cualquier nueva FK compuesta o trigger.
- Prisma `db pull` **no** recupera FK compuestas ni triggers; la fuente de verdad es este diseño + `database-design.md`.

---

## 12. Pruebas de integración PostgreSQL (CI)

| Caso                                                                                | Esperado                      |
| ----------------------------------------------------------------------------------- | ----------------------------- |
| tx con `account_id` de otro espacio (mismo UUID imposible; otro space en composite) | FK compuesta rechaza          |
| SPACE_ACCOUNT: commit sin shared                                                    | Deferido falla                |
| Participantes: 1 fila o suma ≠ total                                                | Deferido falla                |
| UPDATE `shared_expenses.total_amount` sin participantes                             | Deferido falla                |
| Settlement `occurred_at` antes de `joined_at`                                       | BEFORE rechaza                |
| Settlement retroactiva: usuario LEFT hoy, `occurred_at` cuando era miembro          | OK                            |
| Settlement: usuario nunca en espacio                                                | Rechazo                       |
| Sin `SET CONSTRAINTS`; solo INITIALLY DEFERRED                                      | Commit batch SPACE_ACCOUNT ok |

---

## Documentación relacionada

- [Diseño de base de datos](./database-design.md)
- [Estrategia de pruebas](../development/testing-strategy.md)
