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
| Expulsar miembro            | POST   | `/spaces/:spaceId/members/:userId/remove` | Detalle SHARED (OWNER/ADMIN)        |

**Leave:** sin body; **204**; solo SHARED; el caller sale (`LEFT` + `leftAt`). OWNER único → **409** `CANNOT_LEAVE_AS_SOLE_OWNER`.

**Remove:** sin body; **204**; OWNER puede expulsar ADMIN/MEMBER; ADMIN solo MEMBER; no auto-expulsión → **409** `USE_LEAVE_INSTEAD`; único OWNER → **409** `CANNOT_REMOVE_SOLE_OWNER`; miembro inexistente/no ACTIVE → **404** `MEMBER_NOT_FOUND`.

### Códigos de error usados en UX (espacios / invitaciones)

- `SPACE_NOT_FOUND` (404) — detalle de espacio
- `INSUFFICIENT_ROLE` (403) — gestionar invitaciones
- `INVITATION_ALREADY_PENDING`, `INVITEE_ALREADY_MEMBER` (409) — crear invitación
- `INVITATION_NOT_FOUND` (404) — aceptar o rechazar invitación inexistente o no dirigida al usuario
- `INVITATION_EXPIRED`, `ALREADY_MEMBER` (409) — aceptar
- `CANNOT_LEAVE_AS_SOLE_OWNER`, `USE_LEAVE_INSTEAD`, `CANNOT_REMOVE_SOLE_OWNER` (409) — leave/remove
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
| Listar txs    | GET    | `/spaces/:spaceId/transactions`                        | `accountId`, `type`, `limit` (≤100)                                                                |
| Detalle tx    | GET    | `/spaces/:spaceId/transactions/:transactionId`         | Incluye `version`                                                                                  |
| Editar tx     | PATCH  | `/spaces/:spaceId/transactions/:transactionId`         | `expectedVersion` + `description`, `occurredAt`, `amount`, `categoryId` (nullable); revisión en BD |

**UI (slice 2 PERSONAL):** transferencia en detalle de cuenta; categorías ver arriba.

**UI (slice 3–4):** archivar cuenta + `?archived=1`; `/spaces/:id/transactions` (historial + filtros); `/spaces/:id/transactions/:txId` (PATCH); `/spaces/:id/expenses/individual/new` (gasto individual en SHARED, F-R2.2); categorías en cualquier espacio; nav finanzas en detalle de espacio.

**Gasto individual en SHARED** (`POST .../transactions/expense` con `attributedToUserId`): imputa el gasto a **un** miembro, sin reparto ni deuda. **No es un gasto compartido** (P-14 en [decisions.md](../product/decisions.md)). UI: `/spaces/:id/expenses/individual/new`. `accountId` opcional; sin cuenta → `displayCurrency` del espacio o `currency` en el body. Atribución: Owner/Admin → cualquier ACTIVE; Member → solo él mismo.

### Errores transversales (validación y concurrencia)

- `VALIDATION_ERROR` (400) — body inválido (`ValidationPipe`); incluye `field` cuando es posible; la web traduce por `code`, no por `message`.
- `VERSION_CONFLICT` (409) — `expectedVersion` desactualizado en PATCH de transacciones.

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
| Revisiones    | GET    | `/spaces/:spaceId/shared-expenses/:id/revisions` | Instantáneas inmutables con `participants`                                  |

Body orientativo: `totalAmount`, `currency?`, `occurredAt?`, `categoryId?`, `payment` (`MEMBER` + `paidByUserId` o `SPACE_ACCOUNT` + `accountId`), `split` (`EQUAL` \| `PERCENTAGE` \| `FIXED_AMOUNT`). Importes de entrada hasta decimales de la moneda; respuesta con 4 decimales.

Códigos: los de reparto/alta más `SHARED_EXPENSE_NOT_FOUND` (404), `SHARED_EXPENSE_EDIT_FORBIDDEN` (403, P-09), `VERSION_CONFLICT` (409), `ALREADY_VOIDED` (409), `PAYMENT_SOURCE_IMMUTABLE` (400). Los movimientos vinculados a un gasto compartido no se editan por PATCH de transacciones (**409** `TRANSACTION_LINKED_TO_SHARED_EXPENSE`).

### Saldos y liquidaciones (fase 7 — B-7)

Requiere migración `20261117160000_phase7_settlements_void` aplicada en el entorno. Membresía **ACTIVE**; espacio **SHARED**.

| Recurso    | Método | Ruta                                    | Notas                                                                 |
| ---------- | ------ | --------------------------------------- | --------------------------------------------------------------------- |
| Saldos     | GET    | `/spaces/:spaceId/balances`             | Deudas netas por par y `net` por miembro, por moneda (P-08)           |
| Listar     | GET    | `/spaces/:spaceId/settlements`            | Query: `userId`, `includeVoided`, `limit`≤100                         |
| Registrar  | POST   | `/spaces/:spaceId/settlements`          | Body: `fromUserId`, `toUserId`, `amount`, `currency`, `occurredAt?` |
| Anular     | POST   | `/spaces/:spaceId/settlements/:id/void` | `expectedVersion`, `reason?`                                          |

`POST` liquidación: permisos P-10 (`SETTLEMENT_FORBIDDEN` 403). `from`/`to` con historial en el espacio (P-19); `occurredAt` puede ser posterior a `leftAt`. **201** puede incluir `warnings: ["SETTLEMENT_EXCEEDS_PENDING_DEBT"]` (P-11; sin 400 por sobrepago).

Códigos: `SHARED_SPACE_REQUIRED`, `SETTLEMENT_SAME_USER`, `SETTLEMENT_USER_NOT_MEMBER`, `SETTLEMENT_NOT_FOUND` (404), `SETTLEMENT_FORBIDDEN`, `VERSION_CONFLICT`, `ALREADY_VOIDED`.

## No implementado todavía

| Área                                                 | Fase | Contrato previsto                                               |
| ---------------------------------------------------- | ---- | --------------------------------------------------------------- |
| Cuentas personales vinculadas, aportaciones          | 8    | En análisis ([accounts-model.md](../product/accounts-model.md)) |
| Presupuestos, informes, dashboard, edición de perfil | 9    | Pendiente (P-17)                                                |
| Transferencia de ownership                           | 4.1  | [spaces-membership-mvp.md](../product/spaces-membership-mvp.md) |
