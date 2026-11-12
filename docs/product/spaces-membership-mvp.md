# Espacios SHARED — membresía, invitaciones y ownership (MVP)

Decisiones de producto acordadas (coordinación). Fuente para API y web; no inventar reglas fuera de este documento — marcar gaps como **PENDIENTE DE DECISIÓN**.

Criterio de cierre **Fase 4 (MVP):** espacios, invitaciones, leave/remove y espacio activo operativos, con único OWNER y salida del único OWNER bloqueada (409) hasta **entrega 4.1** (transferencia). Pendientes documentados aquí **no impiden Fase 5**.

---

## Roles

- **OWNER:** como máximo **un** miembro ACTIVE con rol OWNER por espacio SHARED.
- **ADMIN:** invitar (MEMBER/ADMIN), revocar invitaciones, expulsar solo **MEMBER**; no expulsar ADMIN ni OWNER.
- **MEMBER:** abandonar el espacio (leave); no expulsar a otros.

## Invitaciones

- Solo espacios **SHARED**; quien invita: **OWNER** o **ADMIN** ACTIVE.
- Rol invitable: **MEMBER** (defecto) o **ADMIN**; **nunca OWNER**.
- TTL por defecto: **7 días** (global MVP, no configurable por espacio).
- Una sola invitación **PENDING** válida por `(spaceId, email)`; re-invitar tras expirada, rechazada, revocada o aceptada.
- MVP sin correo transaccional: cuenta con el **mismo email** + inbox de pendientes.
- Aceptar siendo ya miembro **ACTIVE** → **409** (ya miembro).

## Leave y remove

- **Leave:** cualquier ACTIVE salvo el **único OWNER ACTIVE** → **409** `CANNOT_LEAVE_AS_SOLE_OWNER` hasta transferencia (4.1).
- **Remove:** OWNER expulsa MEMBER y ADMIN; ADMIN solo MEMBER; no auto-expulsión → **409** `USE_LEAVE_INSTEAD`; no expulsar al único OWNER → **409** `CANNOT_REMOVE_SOLE_OWNER`.
- **LEFT** / **REMOVED** fijan `leftAt`; historial para atribución y liquidaciones en **[joinedAt, leftAt)**.

## Transferencia de ownership (entrega 4.1 — no bloquea Fase 5)

- Solo **OWNER ACTIVE** inicia hacia miembro **ACTIVE** con rol **ADMIN** o **MEMBER**.
- MVP **unilateral**, efecto inmediato: receptor → **OWNER**; antiguo OWNER → **ADMIN**.
- Sin transferencia, el único OWNER no puede leave ni ser removed.
- Auditoría mínima en servidor (actor, receptor, espacio, timestamp).
- Sin notificación por email a miembros en MVP.

## Pendientes posteriores (comportamiento seguro hasta entonces)

| Tema | Hasta implementar |
| ---- | ----------------- |
| Transferencia 4.1 | 409 sole OWNER en leave/remove |
| Último miembro ACTIVE hace leave (4.2) | Propuesta: 409 `LAST_ACTIVE_MEMBER` |
| Disolver / archivar espacio | Fuera MVP |
| Varios OWNERs | Fuera MVP |
| TTL configurable / email invitación | Fuera MVP |
| Confirmación del receptor en transferencia | Post-MVP |

## Invariante técnica

El schema Prisma **no** garantiza un solo OWNER ACTIVE por espacio; la aplicación debe hacerlo cumplir (recomendable constraint DB en 4.1).

## Documentación relacionada

- [Alcance funcional](./functional-scope.md)
- [Modelo de dominio](./domain-model.md)
- [Handoff para chats de implementación](../development/chat-handoff.md)
