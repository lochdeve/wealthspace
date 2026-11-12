# Handoff — contexto para chats Backend y Frontend

Usar este archivo al abrir o reiniciar chats de implementación. El chat de **coordinación/producto** mantiene prioridades y decisiones; backend y frontend **no reabren** reglas ya fijadas en `docs/product/` salvo bug o **PENDIENTE DE DECISIÓN** explícito.

**Producto espacios (obligatorio leer):** [spaces-membership-mvp.md](../product/spaces-membership-mvp.md)

**Contratos API web:** [frontend-api-dependencies.md](./frontend-api-dependencies.md)

**Estado y prioridad:** [current-status.md](./current-status.md)

---

## Regla de cierre de fases

- Una fase puede darse por **cerrada en MVP** con ítems **PENDIENTE DE DECISIÓN** en el mismo dominio si API/UI tienen comportamiento **seguro** (p. ej. 409) y está **documentado**.
- La fase siguiente puede empezar si los pendientes no rompen integridad de la nueva fase.

**Hoy:** Fase 4 **cerrada (MVP)**. **Fase 5** (cuentas/transacciones) es prioridad. **Entrega 4.1** (transferencia ownership) en paralelo o justo después del primer slice de Fase 5 — **no bloqueante** para cuentas en SHARED.

---

## Prompt — chat Backend

Copiar al inicio del chat o al planificar una tarea:

```text
Wealthspace — chat BACKEND (apps/api).

Antes de implementar: lee docs/product/spaces-membership-mvp.md, docs/development/current-status.md, docs/architecture/security.md y .cursor/rules/backend.mdc.

Reglas:
- Backend es autoridad de negocio y permisos; aislamiento por spaceId; sin reglas inventadas — usar docs/product/ o marcar PENDIENTE DE DECISIÓN.
- Fase 4 MVP cerrada: no rehacer invitaciones/leave/remove salvo bug o alinear con spaces-membership-mvp.md.
- Transferencia ownership = entrega 4.1 (POST transfer, unilateral, un OWNER, ex-OWNER → ADMIN, auditoría). Hasta entonces mantener 409 CANNOT_LEAVE_AS_SOLE_OWNER / CANNOT_REMOVE_SOLE_OWNER.
- Invitaciones: TTL 7d global; roles MEMBER/ADMIN solo; sin email transaccional.
- Prioridad: Fase 5 cuentas/transacciones; 4.1/4.2 si se asignan explícitamente.
- Dinero: Decimal; concurrencia expectedVersion → 409; tests e IDOR cross-space.

No tocar apps/web salvo que la tarea lo pida. Coordinación resuelve producto; no reabrir auth/sesión sin decisión.
```

---

## Prompt — chat Frontend

Copiar al inicio del chat o al planificar una tarea:

```text
Wealthspace — chat FRONTEND (apps/web).

Antes de implementar: lee docs/product/spaces-membership-mvp.md, docs/development/frontend-api-dependencies.md, docs/development/current-status.md y .cursor/rules/frontend.mdc.

Reglas:
- UI consume REST únicamente; no reglas de negocio críticas ni permisos solo en cliente.
- Fase 4 MVP cerrada: copy y flujos deben reflejar leave/remove, invitaciones (inbox mismo email), único OWNER bloqueado hasta exista UI 4.1 transferencia.
- Errores API: usar códigos estables (409 CANNOT_LEAVE_AS_SOLE_OWNER, etc.) para mensajes de usuario.
- Prioridad: seguir Fase 5 cuando backend exponga contratos; no adelantar cuentas/transacciones sin endpoints documentados.
- NEXT_PUBLIC_API_URL; sesión cookie HttpOnly — no duplicar lógica de saldos/repartos.

No tocar apps/api. Dudas de producto → chat coordinación; no inventar TTL, roles ni ownership.
```

---

## Prompt — recordatorio corto (cualquier chat)

```text
Decisiones Fase 4: docs/product/spaces-membership-mvp.md. Fase 4 MVP cerrada; Fase 5 prioridad; transferencia ownership = 4.1 (no bloquea Fase 5). No inventar reglas de producto.
```
