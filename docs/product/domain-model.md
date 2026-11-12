# Modelo de dominio (MVP)

Integridad: [database-design](../architecture/database-design.md), [first-migration-design](../architecture/first-migration-design.md).

---

## Espacios y movimientos

PERSONAL vs SHARED; EXPENSE con/sin cuenta; FK compuestas en BD aseguran mismo espacio en cuentas/categorías/transacciones vinculadas.

Membresía e invitaciones en SHARED: [spaces-membership-mvp.md](./spaces-membership-mvp.md). Liquidaciones y atribución usan intervalo **[joinedAt, leftAt)** en membresía.

---

## SharedExpense

Reparto: app (splitMode, ISO 4217) + trigger deferido al commit (≥2 participantes, suma exacta). SPACE_ACCOUNT: tx antes que shared; validación diferida al commit.

---

## Settlement

Liquidaciones **retroactivas** permitidas. Pertenencia de `from`/`to` validada en **`occurredAt`**: intervalo membresía **[joinedAt, leftAt)**. LEFT/REMOVED posterior no borra liquidaciones. Registro auditado con `recordedByUserId` y timestamps de fila.

---

## Concurrencia

`expectedVersion`, revisión inmutable, 409. Ver api-design.

---

## Documentación relacionada

- [Alcance funcional](./functional-scope.md)
