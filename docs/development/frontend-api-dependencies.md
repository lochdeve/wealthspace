# Dependencias frontend ↔ API

El frontend (`apps/web`) consume únicamente la API REST (`apps/api`) bajo el prefijo `/api/v1`.

**Catálogo de endpoints implementados.** Lo mantiene el chat de **backend** (fuente de verdad de los contratos) al cerrar cada endpoint. Los endpoints previstos y las convenciones están en [api-design.md](../architecture/api-design.md). Solo lo que figura aquí puede integrarse en la web.

## Configuración

| Variable              | App | Uso                                                                        |
| --------------------- | --- | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | web | Base URL de la API (p. ej. `http://localhost:3001`)                        |
| `WEB_ORIGIN`          | api | Origen permitido en CORS con credenciales (p. ej. `http://localhost:3000`) |

Sesión: cookie HttpOnly `wealthspace_session` (JWT), establecida por `POST /auth/login`. Las peticiones del navegador usan `credentials: 'include'`. En Server Components se reenvía la cookie hacia la API.

Espacio activo (solo UI): cookie `wealthspace_active_space`, establecida con Server Action; **no** sustituye la autorización por `spaceId` en la API.

## Auth (Fase 3)

| Recurso  | Método | Ruta             | UI / uso                     | Estado backend |
| -------- | ------ | ---------------- | ---------------------------- | -------------- |
| Registro | POST   | `/auth/register` | `/register`                  | Implementado   |
| Login    | POST   | `/auth/login`    | `/login`                     | Implementado   |
| Logout   | POST   | `/auth/logout`   | Botón en layout `(app)`      | Implementado   |
| Perfil   | GET    | `/auth/me`       | Layout `(app)`, `/dashboard` | Implementado   |

### Códigos de error usados en UX (auth)

- `EMAIL_ALREADY_REGISTERED` (409) — registro
- `INVALID_CREDENTIALS` (401) — login
- `401` sin sesión — redirección a `/login` en rutas `(app)`

## Espacios e invitaciones (Fase 4)

| Recurso                     | Método | Ruta                                      | UI / uso                            |
| --------------------------- | ------ | ----------------------------------------- | ----------------------------------- |
| Listar espacios             | GET    | `/spaces`                                 | `/spaces`, selector en header       |
| Crear espacio compartido    | POST   | `/spaces`                                 | `/spaces/new`                       |
| Detalle espacio             | GET    | `/spaces/:spaceId`                        | `/spaces/[spaceId]`                 |
| Invitar                     | POST   | `/spaces/:spaceId/invitations`            | Formulario en detalle (OWNER/ADMIN) |
| Invitaciones del espacio    | GET    | `/spaces/:spaceId/invitations`            | Panel en detalle                    |
| Revocar invitación          | POST   | `/spaces/:spaceId/invitations/:id/revoke` | Botón revocar                       |
| Mis invitaciones pendientes | GET    | `/invitations`                            | `/invitations`                      |
| Aceptar                     | POST   | `/invitations/:id/accept`                 | Lista de invitaciones               |
| Rechazar                    | POST   | `/invitations/:id/reject`                 | Lista de invitaciones               |
| Miembros activos            | GET    | `/spaces/:spaceId/members`                | Panel en detalle SHARED             |
| Salir del espacio           | POST   | `/spaces/:spaceId/membership/leave`       | Detalle SHARED (cualquier ACTIVE)   |
| Transferir ownership (4.1)  | POST   | `/spaces/:spaceId/ownership/transfer`     | Body: `newOwnerUserId`; solo OWNER  |
| Expulsar miembro            | POST   | `/spaces/:spaceId/members/:userId/remove` | Detalle SHARED (OWNER/ADMIN)        |

**Leave:** sin body; **204**; solo SHARED; el caller sale (`LEFT` + `leftAt`). OWNER único → **409** `CANNOT_LEAVE_AS_SOLE_OWNER`.

**Transfer ownership (4.1):** body `{ newOwnerUserId }`; **204**; solo OWNER ACTIVE; receptor ACTIVE ADMIN/MEMBER → OWNER; antiguo OWNER → ADMIN. **403** `INSUFFICIENT_ROLE`; **404** `MEMBER_NOT_FOUND`; **409** `TRANSFER_TO_SELF`, `TRANSFER_TARGET_NOT_ELIGIBLE`.

**Remove:** sin body; **204**; OWNER puede expulsar ADMIN/MEMBER; ADMIN solo MEMBER; no auto-expulsión → **409** `USE_LEAVE_INSTEAD`; único OWNER → **409** `CANNOT_REMOVE_SOLE_OWNER`; miembro inexistente/no ACTIVE → **404** `MEMBER_NOT_FOUND`.

### Códigos de error usados en UX (espacios / invitaciones)

- `SPACE_NOT_FOUND` (404) — detalle de espacio
- `INSUFFICIENT_ROLE` (403) — gestionar invitaciones
- `INVITATION_ALREADY_PENDING`, `INVITEE_ALREADY_MEMBER` (409) — crear invitación
- `INVITATION_NOT_FOUND` (404) — aceptar o rechazar invitación inexistente o no dirigida al usuario
- `INVITATION_EXPIRED`, `ALREADY_MEMBER` (409) — aceptar
- `CANNOT_LEAVE_AS_SOLE_OWNER`, `USE_LEAVE_INSTEAD`, `CANNOT_REMOVE_SOLE_OWNER`, `TRANSFER_TO_SELF`, `TRANSFER_TARGET_NOT_ELIGIBLE` (409) — leave/remove/transfer
- `MEMBER_NOT_FOUND` (404) — remove
- Mensaje genérico de API en el resto de casos

## Cuentas (Fase 5 — slice 1)

Disponible en `main` (Fase 5 API). Membresía **ACTIVE** en el espacio (mismo guard que detalle de espacio).

| Recurso         | Método | Ruta                                           | Notas                                              |
| --------------- | ------ | ---------------------------------------------- | -------------------------------------------------- |
| Listar cuentas  | GET    | `/spaces/:spaceId/accounts`                    | Query `includeArchived=true` opcional (defecto no) |
| Crear cuenta    | POST   | `/spaces/:spaceId/accounts`                    | Body: `name`, `currency` (ISO 4217)                |
| Detalle cuenta  | GET    | `/spaces/:spaceId/accounts/:accountId`         | `balance` on-read (4 decimales)                    |
| Archivar cuenta | POST   | `/spaces/:spaceId/accounts/:accountId/archive` | **204**; ya archivada → **409**                    |

**UI:** `/accounts` → espacio personal del usuario; `/spaces/:id/accounts`, `.../new`, `.../[accountId]` (PERSONAL y SHARED).

### Códigos de error (cuentas)

- `SPACE_NOT_FOUND` (404) — espacio sin membresía ACTIVE del usuario
- `ACCOUNT_NOT_FOUND` (404) — cuenta ajena al `spaceId` (anti-IDOR)
- `ACCOUNT_ALREADY_ARCHIVED` (409) — repetir archivado

## Categorías (Fase 5 — slice 3)

| Recurso | Método | Ruta                          | Notas                            |
| ------- | ------ | ----------------------------- | -------------------------------- |
| Listar  | GET    | `/spaces/:spaceId/categories` | Query `type=INCOME` \| `EXPENSE` |
| Crear   | POST   | `/spaces/:spaceId/categories` | `name`, `type`, `parentId?`      |

**UI:** `/spaces/:id/categories` (list + crear); selector opcional en ingreso/gasto.

### Transacciones

| Recurso       | Método | Ruta                                                   | Notas                                                                                              |
| ------------- | ------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Saldo inicial | POST   | `/spaces/:spaceId/accounts/:accountId/opening-balance` | Una por cuenta                                                                                     |
| Ingreso       | POST   | `/spaces/:spaceId/transactions/income`                 | `accountId` obligatorio (PERSONAL y SHARED)                                                        |
| Gasto         | POST   | `/spaces/:spaceId/transactions/expense`                | PERSONAL: `accountId`; SHARED: `attributedToUserId`                                                |
| Transferencia | POST   | `/spaces/:spaceId/transactions/transfer`               | Misma moneda; cuentas distintas                                                                    |
| Listar txs    | GET    | `/spaces/:spaceId/transactions`                        | `accountId`, `type`, `limit` (≤100); en espacio **PERSONAL** del usuario, `crossSpaceSummary?` en txs vinculadas (B-8.8) |
| Detalle tx    | GET    | `/spaces/:spaceId/transactions/:transactionId`         | Incluye `version`; mismo `crossSpaceSummary?` solo en PERSONAL                                     |
| Editar tx     | PATCH  | `/spaces/:spaceId/transactions/:transactionId`         | `expectedVersion` + `description`, `occurredAt`, `amount`, `categoryId` (nullable); revisión en BD |

**UI (slice 2 PERSONAL):** transferencia en detalle de cuenta; categorías ver arriba.

**UI (slice 3–4):** archivar cuenta + `?archived=1`; `/spaces/:id/transactions` (historial + filtros); `/spaces/:id/transactions/:txId` (PATCH); `/spaces/:id/expenses/individual/new` (gasto individual en SHARED, F-R2.2); categorías en cualquier espacio; nav finanzas en detalle de espacio.

**Gasto individual en SHARED** (`POST .../transactions/expense` con `attributedToUserId`): imputa el gasto a **un** miembro, sin reparto ni deuda. **No es un gasto compartido** (P-14 en [decisions.md](../product/decisions.md)). UI: `/spaces/:id/expenses/individual/new`. `accountId` opcional; sin cuenta → `displayCurrency` del espacio o `currency` en el body. Atribución: Owner/Admin → cualquier ACTIVE; Member → solo él mismo.

### Errores transversales (validación y concurrencia) — B-R1 / C-02–C-03

- `VALIDATION_ERROR` (400) — cualquier endpoint con body DTO (`ValidationPipe` global); incluye `field` cuando es posible; la web traduce por `code`, no por `message`.
- `VERSION_CONFLICT` (409) — `expectedVersion` desactualizado en PATCH de transacciones (y otros recursos con versión).
- `CATEGORY_NOT_FOUND` (404), `INVALID_CATEGORY_TYPE` (400) — `categoryId` en PATCH de transacciones (C-02).

Códigos: `ATTRIBUTION_REQUIRED`, `ATTRIBUTION_NOT_ALLOWED`, `ATTRIBUTEE_NOT_ACTIVE_MEMBER`, `ACCOUNT_REQUIRED`, `CURRENCY_REQUIRED`, `CURRENCY_MISMATCH`, `SAME_ACCOUNT_TRANSFER`, `CATEGORY_NOT_FOUND`, `INVALID_CATEGORY_TYPE`, `NO_CHANGES`, más los de slice 1–2.

### Gastos compartidos (fase 6 — B-6.2…B-6.5)

Membresía **ACTIVE** en espacio **SHARED** (`SHARED_SPACE_REQUIRED` en PERSONAL).

| Recurso       | Método | Ruta                                             | Notas                                                                       |
| ------------- | ------ | ------------------------------------------------ | --------------------------------------------------------------------------- |
| Listar        | GET    | `/spaces/:spaceId/shared-expenses`               | Query: `from`, `to`, `participantUserId`, `includeVoided`, `limit`≤100      |
| Previsualizar | POST   | `/spaces/:spaceId/shared-expenses/preview`       | **200**; mismo body que el alta; no persiste (`version: 0`, id placeholder) |
| Crear         | POST   | `/spaces/:spaceId/shared-expenses`               | **201**; participantes, `generatedDebts`, `version`                         |
| Detalle       | GET    | `/spaces/:spaceId/shared-expenses/:id`           | Incluye `generatedDebts`, `voidedAt`, `version`                             |
| Editar        | PATCH  | `/spaces/:spaceId/shared-expenses/:id`           | Mismo body que el alta + `expectedVersion`; `payment.source` inmutable      |
| Anular        | POST   | `/spaces/:spaceId/shared-expenses/:id/void`      | Body: `expectedVersion`, `reason?`; restaura saldo si `SPACE_ACCOUNT`       |
| Vincular pago | POST   | `/spaces/:spaceId/shared-expenses/:id/link-personal-payment` | Body: `personalAccountId`, `expectedVersion`; solo pagador `MEMBER` (P-02, B-8.2) |
| Revisiones    | GET    | `/spaces/:spaceId/shared-expenses/:id/revisions` | Instantáneas inmutables con `participants`                                  |

Body orientativo: `totalAmount`, `currency?`, `occurredAt?`, `categoryId?`, `payment` (`MEMBER` + `paidByUserId` + `personalAccountId?` solo si el actor es el pagador, o `SPACE_ACCOUNT` + `accountId`), `split` (`EQUAL` \| `PERCENTAGE` \| `FIXED_AMOUNT`). Importes de entrada hasta decimales de la moneda; respuesta con 4 decimales. En detalle/listado SHARED, si el usuario de sesión es el pagador `MEMBER`, puede incluir `myPersonalCashLink: { linked, canLink }` (sin exponer id de cuenta personal a otros).

Anular un gasto `MEMBER` con enlace personal (B-8.3) anula también el movimiento PERSONAL vinculado; PATCH de importe/fecha/descripción propaga al movimiento personal activo. `myPersonalCashLink.linked` refleja solo enlaces con movimiento personal no anulado.

Códigos: los de reparto/alta más `SHARED_EXPENSE_NOT_FOUND` (404), `SHARED_EXPENSE_EDIT_FORBIDDEN` (403, P-09), `VERSION_CONFLICT` (409), `ALREADY_VOIDED` (409), `PAYMENT_SOURCE_IMMUTABLE` (400), `NOT_PAYER` (403), `PERSONAL_LINK_NOT_ALLOWED` (403/400), `PERSONAL_LINK_ALREADY_EXISTS` (409). Los movimientos vinculados a un gasto compartido no se editan por PATCH de transacciones (**409** `TRANSACTION_LINKED_TO_SHARED_EXPENSE`).

### Saldos y liquidaciones (fase 7 — B-7)

Requiere migración `20261117160000_phase7_settlements_void` aplicada en el entorno. Membresía **ACTIVE**; espacio **SHARED**.

| Recurso   | Método | Ruta                                    | Notas                                                               |
| --------- | ------ | --------------------------------------- | ------------------------------------------------------------------- |
| Saldos    | GET    | `/spaces/:spaceId/balances`             | Deudas netas por par y `net` por miembro, por moneda (P-08)         |
| Listar    | GET    | `/spaces/:spaceId/settlements`          | Query: `userId`, `includeVoided`, `limit`≤100                       |
| Registrar | POST   | `/spaces/:spaceId/settlements`          | Body: `fromUserId`, `toUserId`, `amount`, `currency`, `occurredAt?`, `personalCashFlow?` (`accountId`) solo si el actor es `from` o `to` (B-8.4) |
| Vincular  | POST   | `/spaces/:spaceId/settlements/:id/link-personal-cash-flow` | `accountId`, `expectedVersion`; parte `from` o `to` (B-8.5) |
| Anular    | POST   | `/spaces/:spaceId/settlements/:id/void` | `expectedVersion`, `reason?`; anula movimientos PERSONAL vinculados (B-8.6) |

`POST` liquidación: permisos P-10 (`SETTLEMENT_FORBIDDEN` 403). `from`/`to` con historial en el espacio (P-19); `occurredAt` puede ser posterior a `leftAt`. **201** puede incluir `warnings: ["SETTLEMENT_EXCEEDS_PENDING_DEBT"]` (P-11; sin 400 por sobrepago). Si el usuario de sesión es `from` o `to`, respuesta puede incluir `myPersonalCashLink: { linked, canLink, side }` sin id de cuenta personal.

Códigos: `SHARED_SPACE_REQUIRED`, `SETTLEMENT_SAME_USER`, `SETTLEMENT_USER_NOT_MEMBER`, `SETTLEMENT_NOT_FOUND` (404), `SETTLEMENT_FORBIDDEN`, `VERSION_CONFLICT`, `ALREADY_VOIDED`, `PERSONAL_LINK_NOT_ALLOWED`, `PERSONAL_LINK_ALREADY_EXISTS`.

### Aportaciones (fase 8 — B-8.7, P-05/P-06)

Espacio **SHARED**; el actor aporta en su propio nombre.

| Recurso | Método | Ruta | Notas |
| ------- | ------ | ---- | ----- |
| Aportar | POST | `/spaces/:spaceId/contributions` | Body: `sharedAccountId`, `amount`, `currency`, `occurredAt?`, `personalAccountId?`, `note?` |

Con `personalAccountId`: `INCOME` en cuenta SHARED con `attributedToUserId` = actor + `EXPENSE` en PERSONAL + `CONTRIBUTION_PAIR` (`contributionGroupId` en respuesta). Sin `personalAccountId`: solo `INCOME` en cuenta compartida (sin aportante en atributos). Respuesta sin id de cuenta personal ajena.

Códigos: `SHARED_SPACE_REQUIRED`, `CROSS_SPACE_CURRENCY_MISMATCH`, `PERSONAL_ACCOUNT_NOT_OWNED` (403), `PARTICIPANT_NOT_MEMBER`.

`crossSpaceSummary` (B-8.8): `{ kind, sharedSpaceId, sharedSpaceName, sharedExpenseId?, settlementId?, contributionGroupId? }` — solo en GET de transacciones en el **PERSONAL** del titular del vínculo; nunca en rutas SHARED.

## Fase 8 — catálogo consolidado (B-8.10)

**Plan:** [phase-8-technical-plan.md](./phase-8-technical-plan.md). **OpenAPI:** `GET /api/v1/docs` (Swagger UI). Requiere migración **`20261201120000_phase8_cross_space_cash_links`** aplicada en el entorno (`pnpm --filter @wealthspace/api exec prisma migrate deploy`).

### Endpoints nuevos (implementados)

| Decisión | Método | Ruta |
| -------- | ------ | ---- |
| P-02 | POST | `/spaces/:spaceId/shared-expenses/:id/link-personal-payment` |
| P-07 | POST | `/spaces/:spaceId/settlements` (ext. `personalCashFlow`) |
| P-07 | POST | `/spaces/:spaceId/settlements/:id/link-personal-cash-flow` |
| P-05/06 | POST | `/spaces/:spaceId/contributions` |
| P-02 | — | `POST/PATCH shared-expenses` (`payment.personalAccountId?` en alta) |
| B-8.8 | GET | `/spaces/:spaceId/transactions` (+ detalle) en **PERSONAL** con `crossSpaceSummary?` |

**No implementado (MVP):** `GET …/settlements/link-hints` (B-8.9) — la web puede recordar la última cuenta usada en local.

### Privacidad (respuestas SHARED)

- No incluir `personalAccountId`, ids de transacciones PERSONAL ajenas ni saldos personales de otros.
- Metadatos solo para la sesión: `myPersonalCashLink` (gastos y liquidaciones), `crossSpaceSummary` (solo rutas del espacio PERSONAL del usuario).

### Campos de respuesta (sesión)

| Recurso | Campo | Forma |
| ------- | ----- | ----- |
| Shared expense | `myPersonalCashLink?` | `{ linked, canLink }` — solo si `payment` es `MEMBER` y el viewer es el pagador |
| Settlement | `myPersonalCashLink?` | `{ linked, canLink, side: "from" \| "to" }` — solo si el viewer es parte del par |
| Contribution (201) | — | `personalLegLinked`, `contributionGroupId?`, `sharedIncomeTransactionId`; sin wallet ajeno |
| Transaction (GET, PERSONAL) | `crossSpaceSummary?` | Ver sección Aportaciones arriba |

### Códigos de error fase 8

| code | HTTP | Uso |
| ---- | ---- | --- |
| `NOT_PAYER` | 403 | Vincular pago personal sin ser pagador |
| `PERSONAL_LINK_NOT_ALLOWED` | 403 / 400 | Regla de negocio (rol, PATCH con `personalAccountId`, liquidación) |
| `PERSONAL_LINK_ALREADY_EXISTS` | 409 | Segundo vínculo en el mismo lado |
| `PERSONAL_ACCOUNT_NOT_OWNED` | 403 | Cuenta no pertenece al PERSONAL del actor (`ACCOUNT_NOT_FOUND` si id inválido) |
| `CROSS_SPACE_CURRENCY_MISMATCH` | 400 | Moneda distinta de la cuenta destino |
| `PERSONAL_LINK_NOT_FOUND` | 404 | Dominio interno (no expuesto en rutas nuevas) |
| `PERSONAL_ACCOUNT_REQUIRED` | — | **Reservado** (plan); no emitido — `personalAccountId` es opcional en aportaciones |
| `CONTRIBUTION_NOT_ALLOWED` | — | **Reservado** (plan); no emitido en B-8.7 |

Los códigos de concurrencia y espacio (`VERSION_CONFLICT`, `SHARED_SPACE_REQUIRED`, etc.) se reutilizan de fases anteriores.

## No implementado todavía

| Área                                                 | Fase | Contrato previsto          |
| ---------------------------------------------------- | ---- | -------------------------- |
| Presupuestos, informes, dashboard, edición de perfil | 9    | Pendiente (P-17)           |
