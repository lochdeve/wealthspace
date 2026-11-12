# Alcance funcional — MVP

---

## Espacios y finanzas

- **PERSONAL:** cuentas, ingresos, gastos (`FinancialTransaction`), transferencias, presupuestos, dashboard. **Sin** `SharedExpense`, participantes ni liquidaciones entre miembros.
- **SHARED:** miembros, invitaciones, roles; cuentas opcionales; gastos individuales y compartidos; liquidaciones.
- Reglas detalladas membresía, invitaciones y ownership (MVP): [spaces-membership-mvp.md](./spaces-membership-mvp.md).

---

## Gastos en espacio compartido

| Mecanismo                      | Cuándo                                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `FinancialTransaction` EXPENSE | Individual; `attributedToUserId` obligatorio; en SHARED `accountId` opcional (sin cuenta no mueve saldo); en PERSONAL cuenta obligatoria. |
| `SharedExpense`                | Solo en SHARED; ≥2 participantes; equal / % / importes fijos.                                                                             |

---

## Atribución (EXPENSE en SHARED)

- Cualquier miembro → sí mismo.
- Owner/Admin → cualquier miembro ACTIVE.
- Member → solo sí mismo.
- PERSONAL: siempre propietario (servidor).

---

## Dashboard global (on-read)

Periodo mensual en **`User.timezone`** del consultante; datos filtrados por `occurredAt` (UTC). Solo espacios ACTIVE.

| Métrica API         | Significado                                        |
| ------------------- | -------------------------------------------------- |
| `totalExpense`      | Gasto total operativo (sin doble conteo shared+tx) |
| `attributedExpense` | Imputación al usuario                              |
| `advancedAmount`    | Adelantos CASH/EXTERNAL en shared                  |

Ejemplo: 1.350 € total vs 1.265 € atribuible.

---

## Presupuestos

Mismo criterio de periodo (timezone usuario). Personal vs shared según [database-design](../architecture/database-design.md).

---

## Liquidaciones

Solo espacios SHARED. `CONFIRMED` / `CANCELLED`; sugerencias on-read.

---

## Historial y concurrencia

Snapshots JSONB versionados (`schemaVersion`); `expectedVersion` en ediciones → **409 Conflict**.

---

## Cuenta y datos personales

Alta atómica: usuario + espacio PERSONAL. Sin borrado físico de usuario con historial. Sin anonimización en MVP.

---

## Fuera del MVP

Reclamaciones, cobros, conciliación, conversión de moneda, migración de snapshots antiguos, anonimización.

---

## Documentación relacionada

- [Modelo de dominio](./domain-model.md)
- [Diseño de API](../architecture/api-design.md)
