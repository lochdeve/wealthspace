# Seguridad, permisos y privacidad

El backend es la única autoridad de permisos. La web puede ocultar acciones por UX, pero la API debe rechazarlas siempre.

---

## Autenticación

- Cookie HttpOnly `wealthspace_session` (JWT firmado con `JWT_SECRET`, ≥32 caracteres, en variable de entorno).
- CORS con credenciales restringido a `WEB_ORIGIN`.
- Contraseñas con hash; nunca se devuelven.

## Autorización por espacio

- Toda operación sobre `/spaces/:spaceId/...` exige membresía **ACTIVE** del usuario en ese espacio (`SpaceMembershipGuard` o `requireActiveMembership`).
- Sin membresía o recurso de otro espacio → **404** (anti-IDOR); nunca se revela que el recurso existe.
- Queries Prisma siempre filtradas por `spaceId` autorizado. Las FK compuestas en BD son una defensa adicional, no la principal.
- La cookie de espacio activo de la web es solo UX; no sustituye a la autorización.

## Matriz de permisos

### Espacios y membresía (implementado)

Fuente: [spaces-membership-mvp.md](../product/spaces-membership-mvp.md).

| Acción                          | OWNER                        | ADMIN       | MEMBER |
| ------------------------------- | ---------------------------- | ----------- | ------ |
| Invitar (MEMBER/ADMIN), revocar | Sí                           | Sí          | No     |
| Expulsar                        | ADMIN, MEMBER                | Solo MEMBER | No     |
| Abandonar                       | Solo si no es el único OWNER | Sí          | Sí     |

### Movimientos (implementado)

| Acción                                               | Regla                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Crear o editar movimientos y cuentas                 | Cualquier miembro ACTIVE del espacio                                          |
| Gasto individual en SHARED: atribuir a               | OWNER/ADMIN → cualquier miembro ACTIVE; MEMBER → solo él mismo                |
| Gasto en PERSONAL                                    | Atribución fijada por el servidor al titular                                  |
| Editar un movimiento vinculado a un gasto compartido | Prohibido (**409** `TRANSACTION_LINKED_TO_SHARED_EXPENSE`); se edita el gasto |

### Gastos compartidos (aprobado, P-09) y liquidaciones (pendiente, P-10)

| Acción                               | Quién                                                   |
| ------------------------------------ | ------------------------------------------------------- |
| Registrar gasto                      | Cualquier miembro ACTIVE                                |
| Indicar pagador                      | MEMBER → solo él mismo; OWNER/ADMIN → cualquier miembro |
| Incluir participantes                | Miembros del espacio en `occurredAt`                    |
| Editar o anular gasto                | Quien lo registró, el pagador, OWNER o ADMIN            |
| Registrar liquidación                | `from`, `to`, OWNER o ADMIN                             |
| Anular liquidación                   | Quien la registró, `from`, `to`, OWNER o ADMIN          |
| Consultar gastos, saldos e historial | Cualquier miembro ACTIVE                                |

Las filas de gastos (P-09) están aprobadas y se implementan en la fase 6. Las de liquidaciones (P-10) siguen siendo una recomendación: el backend no las implementa hasta su aprobación.

## Privacidad

- **Espacio personal:** solo su titular. Ningún endpoint de un espacio SHARED devuelve datos de un espacio PERSONAL (cuentas, saldos, movimientos, nombres de cuenta).
- **Vínculos de cuentas personales** (fase 8, en análisis): solo el titular puede vincular una cuenta suya; el espacio compartido ve únicamente «pagado por X». Requiere tests de no filtración ([accounts-model.md](../product/accounts-model.md)).
- **Miembros:** los miembros de un espacio ven nombre y email de los demás miembros de ese espacio.

## Auditoría e integridad

- Ediciones con revisión inmutable (`FinancialRevision`, trigger que impide UPDATE/DELETE) y `expectedVersion`.
- Sin borrado físico de datos financieros; corrección mediante edición o anulación lógica (P-13).
- `recordedByUserId` en movimientos, gastos y liquidaciones.
- Usuarios con historial no se borran (FK RESTRICT).
- Cuentas archivadas: no admiten nuevos movimientos.

## Liquidaciones

- Validar en el servidor que `from` y `to` pertenecían al espacio en `occurredAt` (misma regla que la BD; excepción de ex-miembros pendiente, P-19).
- No exigir que sigan ACTIVE si la liquidación es retroactiva.
- Wealthspace no verifica pagos: una liquidación es una anotación; la auditoría registra quién la introdujo.

## Pendiente (fase de producción)

Rate limiting, revisión de seguridad, logging y monitorización, copias de seguridad y política de privacidad (ver [roadmap.md](../development/roadmap.md)).

## Documentación relacionada

- [database-design](./database-design.md)
- [api-design](./api-design.md)
