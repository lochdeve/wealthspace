# Dependencias frontend ↔ API

El frontend (`apps/web`) consume únicamente la API REST (`apps/api`) bajo el prefijo `/api/v1`.

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

Requiere rama API `feat/api-phase-4-spaces` (o `main` tras merge).

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
| Salir del espacio           | POST   | `/spaces/:spaceId/membership/leave`       | Detalle SHARED (cualquier ACTIVE)   |
| Expulsar miembro            | POST   | `/spaces/:spaceId/members/:userId/remove` | Detalle SHARED (OWNER/ADMIN)        |

**Leave:** sin body; **204**; solo SHARED; el caller sale (`LEFT` + `leftAt`). OWNER único → **409** `CANNOT_LEAVE_AS_SOLE_OWNER`.

**Remove:** sin body; **204**; OWNER puede expulsar ADMIN/MEMBER; ADMIN solo MEMBER; no auto-expulsión → **409** `USE_LEAVE_INSTEAD`; único OWNER → **409** `CANNOT_REMOVE_SOLE_OWNER`; miembro inexistente/no ACTIVE → **404** `MEMBER_NOT_FOUND`.

### Códigos de error usados en UX (espacios / invitaciones)

- `SPACE_NOT_FOUND` (404) — detalle de espacio
- `INSUFFICIENT_ROLE` (403) — gestionar invitaciones
- `INVITATION_ALREADY_PENDING`, `INVITEE_ALREADY_MEMBER` (409) — crear invitación
- `INVITATION_EXPIRED`, `ALREADY_MEMBER` (409) — aceptar
- `CANNOT_LEAVE_AS_SOLE_OWNER`, `USE_LEAVE_INSTEAD`, `CANNOT_REMOVE_SOLE_OWNER` (409) — leave/remove
- `MEMBER_NOT_FOUND` (404) — remove
- Mensaje genérico de API en el resto de casos

## Fuera de alcance (fases posteriores)

Cuentas, transacciones y dashboards financieros. Transferencia de ownership antes de que el OWNER salga: **PENDIENTE DE DECISIÓN** (API bloquea único OWNER).
