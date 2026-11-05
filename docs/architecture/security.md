# Seguridad

---

## Autorización

Membresía ACTIVE para operaciones corrientes en el espacio. Dashboard global: espacios ACTIVE del usuario.

---

## Atribución EXPENSE

Matriz Owner/Admin/Member; SPACE_ACCOUNT sin atribución en tx.

---

## Liquidaciones

- Crear settlement: validar en servidor que `from` y `to` pertenecían al espacio en **`occurredAt`** (misma regla que BD).
- Rechazar usuarios sin membresía que cubra ese instante.
- No exigir que sigan ACTIVE al registrar liquidación retroactiva.
- Histórico conservado; LEFT/REMOVED no elimina filas.

---

## Integridad

Anti-IDOR; cuentas archivadas; FK compuestas en BD contra cross-space.

---

## Documentación relacionada

- [database-design](./database-design.md)
