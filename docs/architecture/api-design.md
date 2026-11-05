# Diseño de API REST

Prefijo `/api/v1`. Ver [database-design](./database-design.md) para reglas de dominio.

---

## Concurrencia optimista

Transacción DB: leer estado → UPDATE `WHERE version = expectedVersion` → si 0 filas **409** → INSERT `FinancialRevision` (snapshot previo, `revisionNumber` secuencial) → COMMIT. Sin `SELECT FOR UPDATE`. Cliente reintenta tras 409.

---

## SPACE_ACCOUNT

Una transacción DB: INSERT tx → INSERT shared → participantes. Constraint triggers **INITIALLY DEFERRED** validan al commit; **no** requiere `SET CONSTRAINTS` global.

---

## Liquidaciones

`POST .../settlements` con `occurredAt` (validación de membresía en ese instante, no en “ahora” salvo que coincidan).

| Campo                            | Uso                                                    |
| -------------------------------- | ------------------------------------------------------ |
| `occurredAt`                     | Pertenencia histórica `from`/`to` en el espacio SHARED |
| `recordedByUserId` / `createdAt` | Auditoría de quién registra y cuándo                   |

Retroactivo: usuarios pueden estar LEFT hoy si en `occurredAt` cumplían **[joinedAt, leftAt)**.

---

## Presupuestos

Consumo en moneda del presupuesto; sin conversión.

---

## Documentación relacionada

- [Seguridad](./security.md)
