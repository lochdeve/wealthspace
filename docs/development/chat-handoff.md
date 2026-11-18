# Coordinación entre chats — Backend, Frontend y Coordinación

Usar este archivo al abrir o reiniciar un chat. Hay tres roles:

| Chat             | Responsabilidad                                                                             | Escribe en                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Coordinación** | Producto, arquitectura, decisiones, roadmap, coherencia de la documentación.                | `docs/product/`, `docs/architecture/`, `docs/decisions/`, roadmaps, `.cursor/rules/`  |
| **Backend**      | `apps/api`: dominio, permisos, Prisma, migraciones (con aprobación), contratos REST reales. | `apps/api`, `frontend-api-dependencies.md`, `roadmap-backend.md`, `current-status.md` |
| **Frontend**     | `apps/web`: UI, UX, consumo de la API.                                                      | `apps/web`, `roadmap-frontend.md`, `current-status.md`                                |

## Orden de lectura obligatorio

1. [decisions.md](../product/decisions.md) — qué está aprobado y qué no.
2. [current-status.md](./current-status.md) — siguiente tarea de cada chat.
3. El roadmap de tu área: [roadmap-backend.md](./roadmap-backend.md) o [roadmap-frontend.md](./roadmap-frontend.md).
4. La especificación del dominio que vas a tocar: [spaces-membership-mvp.md](../product/spaces-membership-mvp.md), [shared-expenses.md](../product/shared-expenses.md), [accounts-model.md](../product/accounts-model.md) (fase 8; decisiones aprobadas, plan técnico pendiente), [domain-model.md](../product/domain-model.md).
5. Contratos: [api-design.md](../architecture/api-design.md) (convenciones y previstos) y [frontend-api-dependencies.md](./frontend-api-dependencies.md) (implementados; **§ Fase 8 — catálogo consolidado** tras B-8.10).
6. [security.md](../architecture/security.md) y tu regla `.cursor/rules/backend.mdc` o `frontend.mdc`.

## Protocolo

1. **No inventar reglas de negocio.** Si una regla no está APROBADA en `decisions.md`, no la implementes: márcala **PENDIENTE DE DECISIÓN** y escala a coordinación con el ID (P-xx) o con una pregunta concreta.
2. **No cambiar decisiones aprobadas** sin justificarlo y sin revisión de coordinación.
3. **El backend es la fuente de verdad de los contratos.** Al terminar un endpoint, el backend actualiza OpenAPI y `frontend-api-dependencies.md` (rutas, body, respuesta, códigos de error). El frontend no inventa estructuras: si necesita algo, lo pide.
4. **Decisiones técnicas con impacto en otra área** (forma de un contrato, código de error nuevo, paginación, cambio de esquema) → documentarlas en el mismo PR y avisar a coordinación.
5. **Migraciones:** borrador → revisión de coordinación → aprobación explícita → aplicar.
6. **Al cerrar una entrega:** actualizar `current-status.md` y el roadmap del área; no editar especificaciones de producto (eso es de coordinación).
7. **Git:** commits pequeños en inglés (Conventional Commits); nunca push sin aprobación explícita.

## Formato para escalar a coordinación

```text
[BACKEND|FRONTEND] → Coordinación
Contexto: <entrega, p. ej. B-6.4>
Pregunta / conflicto: <qué no está definido o qué contradice a qué>
Opciones que veo: <A / B>
Impacto si no se decide: <qué bloquea>
```

---

## Prompt — chat Backend

```text
Wealthspace — chat BACKEND (apps/api, NestJS + Prisma + PostgreSQL).

Antes de nada lee, en este orden: docs/product/decisions.md, docs/development/current-status.md,
docs/development/roadmap-backend.md, docs/product/shared-expenses.md, docs/architecture/api-design.md,
docs/architecture/database-design.md, docs/architecture/security.md y .cursor/rules/backend.mdc.

Reglas:
- El backend es la autoridad de negocio, permisos y cálculos financieros. Aislamiento por spaceId; anti-IDOR (404).
- Solo implementas decisiones APROBADAS en decisions.md. Las PENDIENTES (P-xx) se escalan a coordinación; no elijas por tu cuenta.
- No existen confirmaciones de gastos. Gasto, deuda (calculada, no almacenada) y liquidación son conceptos separados.
- Reparto en el servidor: mayor resto en unidades menores ISO 4217, desempate por userId; Σ participaciones = total.
- Ninguna migración nueva sin aprobación explícita de coordinación; SQL de integridad sincronizado (custom-integrity.sql).
- Eres la fuente de verdad de los contratos: al cerrar cada endpoint actualiza OpenAPI y docs/development/frontend-api-dependencies.md.
- Dinero con Prisma.Decimal; expectedVersion → 409; tests de integración e IDOR en cada endpoint.
- No toques apps/web. No hagas push.

Tarea actual: la indicada para Backend en docs/development/current-status.md.
```

## Prompt — chat Frontend

```text
Wealthspace — chat FRONTEND (apps/web, Next.js App Router + React + TypeScript).

Antes de nada lee, en este orden: docs/product/decisions.md, docs/development/current-status.md,
docs/development/roadmap-frontend.md, docs/product/shared-expenses.md, docs/product/domain-model.md (glosario §4),
docs/development/frontend-api-dependencies.md y .cursor/rules/frontend.mdc.
Este Next.js tiene cambios incompatibles: consulta apps/web/AGENTS.md y node_modules/next/dist/docs/ antes de usar APIs de Next.

Reglas:
- La UI consume solo la API REST. Integras únicamente endpoints implementados en frontend-api-dependencies.md;
  api-design.md (previsto) sirve para maquetar, no para inventar campos.
- No calcules repartos, deudas ni saldos como fuente de verdad; la previsualización viene de la API.
- No existen confirmaciones de gastos: ningún estado «pendiente de confirmar». Liquidar = «Registrar pago», nunca «Confirmar».
- El formulario actual de gasto en SHARED es un «Gasto individual» (no reparte); no lo llames «compartido».
- Errores por code estable; estados de carga, vacío y error; accesibilidad.
- Si falta un endpoint o hay dudas de producto → escalar a coordinación. No toques apps/api. No hagas push.

Tarea actual: la indicada para Frontend en docs/development/current-status.md.
```

## Prompt — recordatorio corto (cualquier chat)

```text
Fuente de verdad: docs/product/decisions.md. Sin confirmaciones de gastos; gasto ≠ deuda ≠ liquidación.
Solo decisiones APROBADAS; las P-xx se escalan. El backend define los contratos; el frontend los consume.
Siguiente tarea: docs/development/current-status.md.
```
